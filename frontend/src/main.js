import { api, clearSessionToken, getSessionToken, setSessionToken } from "./api.js";
import { bindAuth, renderAuth } from "./interfaces/authInterface.js";
import {
  defaultVolunteerPage,
  handleVolunteerClick,
  handleVolunteerInput,
  handleVolunteerSubmit,
  renderVolunteerPage,
  renderVolunteerShell,
  volunteerNav
} from "./interfaces/volunteerInterface.js";
import {
  defaultNonprofitPage,
  handleNonprofitClick,
  handleNonprofitSubmit,
  nonprofitNav,
  renderNonprofitPage,
  renderNonprofitShell
} from "./interfaces/nonprofitInterface.js";

const els = {};
let payload = null;
let activePage = defaultVolunteerPage;

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  bindAuth(els.authView, { api, onAuthenticated, showToast });
  boot();
});

function bindElements() {
  [
    "authView",
    "appView",
    "appNav",
    "workspaceName",
    "signedInAs",
    "signOutButton",
    "profilePanel",
    "sidebarPanel",
    "pageKicker",
    "pageTitle",
    "pageSubtitle",
    "metricStrip",
    "mainContent",
    "notificationList",
    "upcomingPanel",
    "toast"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
  els.appLayout = document.querySelector(".app-layout");
  els.sidebar = document.querySelector(".sidebar");
}

function bindEvents() {
  els.appNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button) return;
    activePage = button.dataset.page;
    renderApp();
  });

  els.signOutButton.addEventListener("click", async () => {
    try {
      await api.signOut();
    } catch {
      // The local token is still cleared if the server no longer recognizes it.
    }
    clearSessionToken();
    payload = null;
    showAuth();
    showToast("Signed out.");
  });

  els.mainContent.addEventListener("click", async (event) => {
    try {
      const handled = isVolunteer()
        ? await handleVolunteerClick(event, getContext())
        : await handleNonprofitClick(event, getContext());
      if (handled) renderApp();
    } catch (error) {
      showToast(error.message);
    }
  });

  els.mainContent.addEventListener("submit", async (event) => {
    try {
      const handled = isVolunteer()
        ? await handleVolunteerSubmit(event, getContext())
        : await handleNonprofitSubmit(event, getContext());
      if (handled) renderApp();
    } catch (error) {
      showToast(error.message);
    }
  });

  els.mainContent.addEventListener("input", (event) => {
    if (!isVolunteer()) return;
    handleVolunteerInput(event, getContext());
  });

  els.mainContent.addEventListener("change", (event) => {
    if (!isVolunteer()) return;
    handleVolunteerInput(event, getContext());
  });
}

async function boot() {
  renderAuth(els.authView);
  if (!getSessionToken()) {
    showAuth();
    return;
  }

  try {
    const result = await api.me();
    await loadApp(result.user.role);
  } catch {
    clearSessionToken();
    showAuth();
  }
}

async function onAuthenticated(result) {
  setSessionToken(result.token);
  await loadApp(result.user.role);
  showToast(`Welcome, ${result.user.name}.`);
}

async function loadApp(role) {
  payload = role === "volunteer" ? await api.volunteer() : await api.nonprofit();
  activePage = role === "volunteer" ? defaultVolunteerPage : defaultNonprofitPage;
  renderApp();
}

function renderApp() {
  if (!payload) return showAuth();

  const role = payload.user.role;
  const nav = role === "volunteer" ? volunteerNav : nonprofitNav;
  const validPages = nav.map(([page]) => page);
  if (!validPages.includes(activePage)) activePage = nav[0][0];

  els.authView.hidden = true;
  els.appView.hidden = false;
  els.workspaceName.textContent = role === "volunteer" ? "Volunteer" : "Nonprofit";
  els.signedInAs.textContent = payload.user.email;
  els.appNav.innerHTML = nav
    .map(([page, label]) => `<button class="${activePage === page ? "active" : ""}" data-page="${page}" type="button">${label}</button>`)
    .join("");

  const showSidebar = (role === "volunteer" && activePage === "profile") || (role === "nonprofit" && activePage === "organization");
  els.sidebar.hidden = !showSidebar;
  els.appLayout.classList.toggle("no-sidebar", !showSidebar);

  if (role === "volunteer") {
    renderVolunteerShell(payload, els);
    renderVolunteerPage(activePage, payload, els);
  } else {
    renderNonprofitShell(payload, els);
    renderNonprofitPage(activePage, payload, els);
  }
}

function showAuth() {
  els.authView.hidden = false;
  els.appView.hidden = true;
  renderAuth(els.authView);
}

function getContext() {
  return {
    api,
    els,
    payload,
    setPayload: (nextPayload) => {
      payload = nextPayload;
    },
    setPage: (page) => {
      activePage = page;
    },
    showToast
  };
}

function isVolunteer() {
  return payload?.user?.role === "volunteer";
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}
