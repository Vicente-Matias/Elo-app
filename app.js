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

async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    setStatus("auth-status", t("status_signup_error") + error.message, true);
    return;
  }
  setStatus("auth-status", t("status_signup_success"));
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
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
    `;
    container.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Arranque ----------

document.addEventListener("DOMContentLoaded", async () => {
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
