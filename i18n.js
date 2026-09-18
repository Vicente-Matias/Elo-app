// ============================================================
// INTERNACIONALIZACAO (i18n) - Portugues / Ingles
// ============================================================
// Para adicionar um novo idioma no futuro, basta copiar um dos
// blocos abaixo (ex: "en") e traduzir os valores.

const TRANSLATIONS = {
  pt: {
    nav_profile: "O meu perfil",
    nav_matches: "Descobrir",
    nav_messages: "Mensagens",
    nav_signout: "Sair",

    auth_title: "Entrar ou criar conta",
    auth_subtitle: "Regista-te para criares o teu perfil e encontrares correspond\u00eancias.",
    auth_email_label: "Email",
    auth_email_placeholder: "tu@exemplo.com",
    auth_password_label: "Palavra-passe",
    auth_password_placeholder: "m\u00ednimo 8 caracteres, com mai\u00fascula, min\u00fascula e n\u00famero",
    auth_signin: "Entrar",
    auth_signup: "Criar conta nova",

    profile_title: "O teu perfil",
    profile_subtitle: "Isto \u00e9 o que os outros subscritores v\u00eaem \u2014 e o que o motor de correspond\u00eancia usa para te ligar a eles.",
    profile_name_label: "Nome",
    profile_name_placeholder: "Como te queres apresentar",
    profile_bio_label: "Sobre ti",
    profile_bio_placeholder: "Uma breve descri\u00e7\u00e3o",
    profile_offers_label: "O que ofereces",
    profile_offers_placeholder: "ex: aulas de matem\u00e1tica, contabilidade, design",
    profile_offers_hint: "Separa por v\u00edrgulas. S\u00e3o as tuas compet\u00eancias, servi\u00e7os ou recursos.",
    profile_seeks_label: "O que procuras",
    profile_seeks_placeholder: "ex: mentoria, investimento, parceiros de projeto",
    profile_seeks_hint: "Separa por v\u00edrgulas. O motor de correspond\u00eancia cruza isto com o que os outros oferecem.",
    profile_save: "Guardar perfil",

    matches_title: "Correspond\u00eancias",
    matches_subtitle: "Ordenadas pelo grau de compatibilidade entre o que procuras e o que os outros oferecem.",
    matches_empty: "Ainda n\u00e3o h\u00e1 correspond\u00eancias. Isto acontece quando poucos perfis est\u00e3o preenchidos \u2014 convida mais pessoas ou rev\u00ea as tuas etiquetas.",
    matches_mutual_badge: "correspond\u00eancia m\u00fatua",
    match_offers_label: "oferece:",
    match_seeks_label: "procura:",
    match_message_button: "Enviar mensagem",

    inbox_title: "Mensagens",
    inbox_subtitle: "As tuas conversas com outros subscritores.",
    inbox_empty: "Ainda n\u00e3o tens conversas. Envia uma mensagem a partir de uma correspond\u00eancia para come\u00e7ar.",

    chat_back: "\u2190 Voltar \u00e0s mensagens",
    chat_placeholder: "Escreve uma mensagem...",
    chat_send: "Enviar",
    chat_empty: "Ainda n\u00e3o h\u00e1 mensagens nesta conversa. Diz ol\u00e1!",

    status_signup_error: "Erro ao registar: ",
    status_password_weak: "A password tem de ter pelo menos 8 caracteres, incluindo uma mai\u00fascula, uma min\u00fascula e um n\u00famero.",
    status_captcha_required: "Confirma que n\u00e3o \u00e9s um rob\u00f4 no quadrado acima antes de continuar.",
    status_signup_success: "Conta criada. Verifica o teu email para confirmar (se a confirma\u00e7\u00e3o estiver ativa) e depois entra.",
    status_signin_error: "Erro ao entrar: ",
    status_name_required: "O nome \u00e9 obrigat\u00f3rio.",
    status_save_error: "Erro ao guardar: ",
    status_save_success: "Perfil guardado com sucesso.",
    status_matches_error: "Erro ao procurar: ",
    status_matches_need_profile: "Preenche primeiro o teu perfil.",
  },

  en: {
    nav_profile: "My profile",
    nav_matches: "Discover",
    nav_messages: "Messages",
    nav_signout: "Sign out",

    auth_title: "Sign in or create an account",
    auth_subtitle: "Sign up to build your profile and find matches.",
    auth_email_label: "Email",
    auth_email_placeholder: "you@example.com",
    auth_password_label: "Password",
    auth_password_placeholder: "minimum 8 characters, with uppercase, lowercase and a number",
    auth_signin: "Sign in",
    auth_signup: "Create new account",

    profile_title: "Your profile",
    profile_subtitle: "This is what other members see \u2014 and what the matching engine uses to connect you to them.",
    profile_name_label: "Name",
    profile_name_placeholder: "How you want to introduce yourself",
    profile_bio_label: "About you",
    profile_bio_placeholder: "A short description",
    profile_offers_label: "What you offer",
    profile_offers_placeholder: "e.g. math tutoring, accounting, design",
    profile_offers_hint: "Separate with commas. Your skills, services or resources.",
    profile_seeks_label: "What you're looking for",
    profile_seeks_placeholder: "e.g. mentorship, investment, project partners",
    profile_seeks_hint: "Separate with commas. The matching engine compares this with what others offer.",
    profile_save: "Save profile",

    matches_title: "Matches",
    matches_subtitle: "Ranked by how well what you're looking for overlaps with what others offer.",
    matches_empty: "No matches yet. This happens when few profiles are filled in \u2014 invite more people or review your tags.",
    matches_mutual_badge: "mutual match",
    match_offers_label: "offers:",
    match_seeks_label: "looking for:",
    match_message_button: "Send message",

    inbox_title: "Messages",
    inbox_subtitle: "Your conversations with other members.",
    inbox_empty: "No conversations yet. Send a message from a match to get started.",

    chat_back: "\u2190 Back to messages",
    chat_placeholder: "Type a message...",
    chat_send: "Send",
    chat_empty: "No messages in this conversation yet. Say hi!",

    status_signup_error: "Sign-up error: ",
    status_password_weak: "Password must be at least 8 characters, including one uppercase letter, one lowercase letter and one number.",
    status_captcha_required: "Please confirm you're not a robot in the box above before continuing.",
    status_signup_success: "Account created. Check your email to confirm it (if confirmation is enabled), then sign in.",
    status_signin_error: "Sign-in error: ",
    status_name_required: "Name is required.",
    status_save_error: "Error saving: ",
    status_save_success: "Profile saved successfully.",
    status_matches_error: "Error searching: ",
    status_matches_need_profile: "Fill in your profile first.",
  },
};

let currentLang = localStorage.getItem("elo_lang") || "pt";

function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || key;
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.documentElement.lang = currentLang === "pt" ? "pt-PT" : "en";
  var switcher = document.getElementById("lang-switch");
  if (switcher) switcher.value = currentLang;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("elo_lang", lang);
  applyStaticTranslations();
}

document.addEventListener("DOMContentLoaded", function () {
  applyStaticTranslations();
  var switcher = document.getElementById("lang-switch");
  if (switcher) {
    switcher.addEventListener("change", function (e) {
      setLanguage(e.target.value);
    });
  }
});
