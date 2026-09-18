// ============================================================
// APLICA\u00c7\u00c3O \u2014 Plataforma de Correspond\u00eancia
// ============================================================

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ---------- Utilit\u00e1rios ----------

function parseTags(text) {
  return text
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
}

function setStatus(elementId, message, isError = false) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.className = isError ? "status status-error" : "status status-ok";
}

// ---------- Autentica\u00e7\u00e3o ----------

// Exige pelo menos 8 caracteres, uma maiuscula, uma minuscula e um numero.
// Isto corre no browser antes de contactar o Supabase, para dar feedback
// imediato -- mas a validacao real (que nao pode ser contornada) e sempre
// a que o Supabase aplica do lado do servidor.
function isPasswordStrong(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

// ---------- CAPTCHA (Cloudflare Turnstile) ----------

let turnstileToken = null;
let turnstileWidgetId = null;

function renderTurnstileWidget() {
  if (!window.turnstile || turnstileWidgetId !== null) return;
  turnstileWidgetId = turnstile.render("#turnstile-widget", {
    sitekey: TURNSTILE_SITE_KEY,
    callback: function (token) {
      turnstileToken = token;
    },
    "expired-callback": function () {
      turnstileToken = null;
    },
  });
}

function resetTurnstile() {
  turnstileToken = null;
  if (turnstileWidgetId !== null && window.turnstile) {
    turnstile.reset(turnstileWidgetId);
  }
}

async function signUp(email, password) {
  if (!isPasswordStrong(password)) {
    setStatus("auth-status", t("status_password_weak"), true);
    return;
  }
  if (!turnstileToken) {
    setStatus("auth-status", t("status_captcha_required"), true);
    return;
  }
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { captchaToken: turnstileToken },
  });
  resetTurnstile();
  if (error) {
    setStatus("auth-status", t("status_signup_error") + error.message, true);
    return;
  }
  setStatus("auth-status", t("status_signup_success"));
}

async function signIn(email, password) {
  if (!turnstileToken) {
    setStatus("auth-status", t("status_captcha_required"), true);
    return;
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: turnstileToken },
  });
  resetTurnstile();
  if (error) {
    setStatus("auth-status", t("status_signin_error") + error.message, true);
    return;
  }
  currentUser = data.user;
  await afterLogin();
}

async function signOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  showView("view-auth");
}

async function afterLogin() {
  document.getElementById("nav-logged").classList.remove("hidden");
  document.getElementById("nav-logged-out").classList.add("hidden");
  await loadOwnProfile();
  showView("view-profile");
}

// ---------- Perfil ----------

async function loadOwnProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (data) {
    document.getElementById("profile-name").value = data.name || "";
    document.getElementById("profile-bio").value = data.bio || "";
    document.getElementById("profile-offers").value = (data.offers || []).join(", ");
    document.getElementById("profile-seeks").value = (data.seeks || []).join(", ");
  }
}

async function saveProfile() {
  const name = document.getElementById("profile-name").value.trim();
  const bio = document.getElementById("profile-bio").value.trim();
  const offers = parseTags(document.getElementById("profile-offers").value);
  const seeks = parseTags(document.getElementById("profile-seeks").value);

  if (!name) {
    setStatus("profile-status", t("status_name_required"), true);
    return;
  }

  const { error } = await supabaseClient.from("profiles").upsert({
    id: currentUser.id,
    name,
    bio,
    offers,
    seeks,
  });

  if (error) {
    setStatus("profile-status", t("status_save_error") + error.message, true);
    return;
  }
  setStatus("profile-status", t("status_save_success"));
}

// ---------- Motor de correspond\u00eancia ----------
// L\u00f3gica: para cada outro subscritor, calcula-se um score de
// compatibilidade com base na sobreposi\u00e7\u00e3o entre:
//   - o que EU procuro   vs o que ELE oferece
//   - o que ELE procura  vs o que EU ofere\u00e7o
// Uma correspond\u00eancia "m\u00fatua" (ambas as dire\u00e7\u00f5es t\u00eam sobreposi\u00e7\u00e3o)
// tem prioridade sobre uma correspond\u00eancia unidirecional.

function overlapCount(listA, listB) {
  const setB = new Set(listB);
  return listA.filter((item) => setB.has(item)).length;
}

async function findMatches() {
  // O c\u00e1lculo de compatibilidade agora corre dentro da base de dados
  // (fun\u00e7\u00e3o find_matches, em matching_function.sql), n\u00e3o no browser.
  // Isto escala para muitos milhares de perfis sem ficar lento aqui.
  const { data, error } = await supabaseClient.rpc("find_matches", {
    requesting_user: currentUser.id,
  });

  if (error) {
    setStatus("matches-status", t("status_matches_error") + error.message, true);
    return;
  }

  const ranked = data.map((row) => ({
    profile: row,
    score: row.score,
    mutual: row.mutual,
  }));

  renderMatches(ranked);
}

function renderMatches(ranked) {
  const container = document.getElementById("matches-list");
  container.innerHTML = "";

  if (ranked.length === 0) {
    container.innerHTML = '<p class="empty-state">' + t("matches_empty") + '</p>';
    return;
  }

  ranked.forEach((r) => {
    const card = document.createElement("div");
    card.className = "match-card";
    card.innerHTML = `
      <div class="match-header">
        <span class="match-name">${escapeHtml(r.profile.name)}</span>
        ${r.mutual ? '<span class="badge-mutual">' + t('matches_mutual_badge') + '</span>' : ""}
      </div>
      <p class="match-bio">${escapeHtml(r.profile.bio || "")}</p>
      <div class="match-tags">
        <span class="tag-label">${t("match_offers_label")}</span> ${(r.profile.offers || []).map(escapeHtml).join(", ") || "\u2014"}
      </div>
      <div class="match-tags">
        <span class="tag-label">${t("match_seeks_label")}</span> ${(r.profile.seeks || []).map(escapeHtml).join(", ") || "\u2014"}
      </div>
      <button class="secondary btn-message" data-partner-id="${r.profile.id}" data-partner-name="${escapeHtml(r.profile.name)}">${t("match_message_button")}</button>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll(".btn-message").forEach((btn) => {
    btn.addEventListener("click", () => {
      openChat(btn.getAttribute("data-partner-id"), btn.getAttribute("data-partner-name"));
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Mensagens ----------

let currentChatPartnerId = null;
let currentChatPartnerName = null;
let realtimeChannel = null;

// Guarda um cache simples de nomes de perfis, para nao ter de
// repetir consultas a base de dados sempre que mostramos a
// caixa de entrada.
const profileNameCache = new Map();

async function getProfileName(userId) {
  if (profileNameCache.has(userId)) return profileNameCache.get(userId);
  const { data } = await supabaseClient
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  const name = (data && data.name) || userId;
  profileNameCache.set(userId, name);
  return name;
}

async function openInbox() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    setStatus("inbox-status", t("status_matches_error") + error.message, true);
    return;
  }

  // Agrupa as mensagens por interlocutor, guardando so a mais recente de cada.
  const conversations = new Map();
  for (const msg of data) {
    const partnerId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
    if (!conversations.has(partnerId)) {
      conversations.set(partnerId, msg);
    }
  }

  const container = document.getElementById("inbox-list");
  container.innerHTML = "";

  if (conversations.size === 0) {
    container.innerHTML = '<p class="empty-state">' + t("inbox_empty") + "</p>";
    return;
  }

  for (const [partnerId, lastMsg] of conversations) {
    const partnerName = await getProfileName(partnerId);
    const item = document.createElement("div");
    item.className = "inbox-item";
    item.innerHTML = `
      <div>
        <div class="inbox-name">${escapeHtml(partnerName)}</div>
        <div class="inbox-preview">${escapeHtml(lastMsg.content)}</div>
      </div>
    `;
    item.addEventListener("click", () => openChat(partnerId, partnerName));
    container.appendChild(item);
  }
}

async function openChat(partnerId, partnerName) {
  currentChatPartnerId = partnerId;
  currentChatPartnerName = partnerName;
  document.getElementById("chat-partner-name").textContent = partnerName;
  showView("view-chat");
  await loadChatMessages();
  subscribeToChatRealtime();
}

async function loadChatMessages() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentChatPartnerId}),and(sender_id.eq.${currentChatPartnerId},receiver_id.eq.${currentUser.id})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    showErrorBanner(t("status_matches_error") + error.message);
    return;
  }

  renderChatMessages(data);
}

function renderChatMessages(messages) {
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";

  if (messages.length === 0) {
    container.innerHTML = '<p class="empty-state">' + t("chat_empty") + "</p>";
    return;
  }

  messages.forEach((msg) => appendChatBubble(msg));
  container.scrollTop = container.scrollHeight;
}

function appendChatBubble(msg) {
  const container = document.getElementById("chat-messages");
  // Remove o estado vazio, se ainda estiver visivel.
  const empty = container.querySelector(".empty-state");
  if (empty) empty.remove();

  const bubble = document.createElement("div");
  const mine = msg.sender_id === currentUser.id;
  bubble.className = "chat-bubble " + (mine ? "chat-bubble-mine" : "chat-bubble-theirs");
  bubble.textContent = msg.content;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const content = input.value.trim();
  if (!content || !currentChatPartnerId) return;

  input.value = "";

  const { error } = await supabaseClient.from("messages").insert({
    sender_id: currentUser.id,
    receiver_id: currentChatPartnerId,
    content,
  });

  if (error) {
    showErrorBanner(t("status_save_error") + error.message);
  }
  // Nao acrescentamos a bolha manualmente aqui: a subscricao em
  // tempo real (subscribeToChatRealtime) trata disso, incluindo
  // para o proprio remetente, o que evita mensagens duplicadas.
}

function subscribeToChatRealtime() {
  // Fecha qualquer subscricao anterior antes de abrir uma nova,
  // para nao acumular ligacoes em segundo plano.
  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabaseClient
    .channel("messages-" + currentChatPartnerId)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const msg = payload.new;
        const belongsToThisChat =
          (msg.sender_id === currentUser.id && msg.receiver_id === currentChatPartnerId) ||
          (msg.sender_id === currentChatPartnerId && msg.receiver_id === currentUser.id);
        if (belongsToThisChat) {
          appendChatBubble(msg);
        }
      }
    )
    .subscribe();
}

// ---------- Arranque ----------

document.addEventListener("DOMContentLoaded", async () => {
  if (window.turnstileReady) renderTurnstileWidget();

  document.getElementById("btn-signup").addEventListener("click", () => {
    signUp(document.getElementById("auth-email").value, document.getElementById("auth-password").value);
  });
  document.getElementById("btn-signin").addEventListener("click", () => {
    signIn(document.getElementById("auth-email").value, document.getElementById("auth-password").value);
  });
  document.getElementById("btn-signout").addEventListener("click", signOut);
  document.getElementById("btn-save-profile").addEventListener("click", saveProfile);

  document.getElementById("tab-profile").addEventListener("click", () => showView("view-profile"));
  document.getElementById("tab-matches").addEventListener("click", () => {
    showView("view-matches");
    findMatches();
  });
  document.getElementById("tab-messages").addEventListener("click", () => {
    showView("view-messages");
    openInbox();
  });
  document.getElementById("btn-back-inbox").addEventListener("click", () => {
    if (realtimeChannel) {
      supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    showView("view-messages");
    openInbox();
  });
  document.getElementById("btn-send-message").addEventListener("click", sendMessage);

  // Verifica se j\u00e1 existe sess\u00e3o ativa (ex: ap\u00f3s refresh da p\u00e1gina)
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session) {
      currentUser = data.session.user;
      await afterLogin();
    } else {
      showView("view-auth");
    }
  } catch (e) {
    showErrorBanner("ERRO AO INICIAR: " + e.message);
    showView("view-auth");
  }
});
