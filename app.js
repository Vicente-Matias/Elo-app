
// ============================================================
// APLICAÇÃO — Plataforma de Correspondência
// ============================================================

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ---------- Utilitários ----------

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

// ---------- Autenticação ----------

async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    setStatus("auth-status", "Erro ao registar: " + error.message, true);
    return;
  }
  setStatus("auth-status", "Conta criada. Verifica o teu email para confirmar (se a confirmação estiver ativa) e depois entra.");
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
    setStatus("profile-status", "O nome é obrigatório.", true);
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

// ---------- Motor de correspondência ----------
// Lógica: para cada outro subscritor, calcula-se um score de
// compatibilidade com base na sobreposição entre:
//   - o que EU procuro   vs o que ELE oferece
//   - o que ELE procura  vs o que EU ofereço
// Uma correspondência "mútua" (ambas as direções têm sobreposição)
// tem prioridade sobre uma correspondência unidirecional.

function overlapCount(listA, listB) {
  const setB = new Set(listB);
  return listA.filter((item) => setB.has(item)).length;
}

async function findMatches() {
  // O cálculo de compatibilidade agora corre dentro da base de dados
  // (função find_matches, em matching_function.sql), não no browser.
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
    container.innerHTML = '<p class="empty-state">Ainda não há correspondências. Isto acontece quando poucos perfis estão preenchidos — convida mais pessoas ou revê as tuas etiquetas.</p>';
    return;
  }

  ranked.forEach((r) => {
    const card = document.createElement("div");
    card.className = "match-card";
    card.innerHTML = `
      <div class="match-header">
        <span class="match-name">${escapeHtml(r.profile.name)}</span>
        ${r.mutual ? '<span class="badge-mutual">correspondência mútua</span>' : ""}
      </div>
      <p class="match-bio">${escapeHtml(r.profile.bio || "")}</p>
      <div class="match-tags">
        <span class="tag-label">oferece:</span> ${(r.profile.offers || []).map(escapeHtml).join(", ") || "—"}
      </div>
      <div class="match-tags">
        <span class="tag-label">procura:</span> ${(r.profile.seeks || []).map(escapeHtml).join(", ") || "—"}
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
  document.getElementById("btn-find-matches").addEventListener("click", findMatches);

  document.getElementById("tab-profile").addEventListener("click", () => showView("view-profile"));
  document.getElementById("tab-matches").addEventListener("click", () => {
    showView("view-matches");
    findMatches();
  });

  // Verifica se já existe sessão ativa (ex: após refresh da página)
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
