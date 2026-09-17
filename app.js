// ============================================================
// APLICAÃ‡ÃƒO â€” Plataforma de CorrespondÃªncia
// ============================================================

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ---------- UtilitÃ¡rios ----------

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

// ---------- AutenticaÃ§Ã£o ----------

async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    setStatus("auth-status", "Erro ao registar: " + error.message, true);
    return;
  }
  setStatus("auth-status", "Conta criada. Verifica o teu email para confirmar (se a confirmaÃ§Ã£o estiver ativa) e depois entra.");
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus("auth-status", "Erro ao entrar: " + error.message, true);
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
    setStatus("profile-status", "O nome Ã© obrigatÃ³rio.", true);
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
    setStatus("profile-status", "Erro ao guardar: " + error.message, true);
    return;
  }
  setStatus("profile-status", "Perfil guardado com sucesso.");
}

// ---------- Motor de correspondÃªncia ----------
// LÃ³gica: para cada outro subscritor, calcula-se um score de
// compatibilidade com base na sobreposiÃ§Ã£o entre:
//   - o que EU procuro   vs o que ELE oferece
//   - o que ELE procura  vs o que EU ofereÃ§o
// Uma correspondÃªncia "mÃºtua" (ambas as direÃ§Ãµes tÃªm sobreposiÃ§Ã£o)
// tem prioridade sobre uma correspondÃªncia unidirecional.

function overlapCount(listA, listB) {
  const setB = new Set(listB);
  return listA.filter((item) => setB.has(item)).length;
}

async function findMatches() {
  // O cÃ¡lculo de compatibilidade agora corre dentro da base de dados
  // (funÃ§Ã£o find_matches, em matching_function.sql), nÃ£o no browser.
  // Isto escala para muitos milhares de perfis sem ficar lento aqui.
  const { data, error } = await supabaseClient.rpc("find_matches", {
    requesting_user: currentUser.id,
  });

  if (error) {
    setStatus("matches-status", "Erro ao procurar: " + error.message, true);
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
    container.innerHTML = '<p class="empty-state">Ainda nÃ£o hÃ¡ correspondÃªncias. Isto acontece quando poucos perfis estÃ£o preenchidos â€” convida mais pessoas ou revÃª as tuas etiquetas.</p>';
    return;
  }

  ranked.forEach((r) => {
    const card = document.createElement("div");
    card.className = "match-card";
    card.innerHTML = `
      <div class="match-header">
        <span class="match-name">${escapeHtml(r.profile.name)}</span>
        ${r.mutual ? '<span class="badge-mutual">correspondÃªncia mÃºtua</span>' : ""}
      </div>
      <p class="match-bio">${escapeHtml(r.profile.bio || "")}</p>
      <div class="match-tags">
        <span class="tag-label">oferece:</span> ${(r.profile.offers || []).map(escapeHtml).join(", ") || "â€”"}
      </div>
      <div class="match-tags">
        <span class="tag-label">procura:</span> ${(r.profile.seeks || []).map(escapeHtml).join(", ") || "â€”"}
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

  // Verifica se jÃ¡ existe sessÃ£o ativa (ex: apÃ³s refresh da pÃ¡gina)
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
