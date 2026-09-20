const TOKEN_KEY = "micromatch.sessionToken";

export function getSessionToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getSessionToken();
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(path, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) clearSessionToken();
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export const api = {
  me: () => request("/api/auth/me"),
  signIn: (body) => request("/api/auth/sign-in", { method: "POST", body }),
  signUp: (body) => request("/api/auth/sign-up", { method: "POST", body }),
  signOut: () => request("/api/auth/sign-out", { method: "POST" }),
  volunteer: () => request("/api/volunteer"),
  volunteerSignUp: (taskId) => request("/api/volunteer/signups", { method: "POST", body: { taskId } }),
  volunteerComplete: (signupId, body) => request(`/api/volunteer/signups/${encodeURIComponent(signupId)}/complete`, { method: "PATCH", body }),
  volunteerCancel: (signupId) => request(`/api/volunteer/signups/${encodeURIComponent(signupId)}/cancel`, { method: "PATCH" }),
  saveTask: (taskId) => request("/api/volunteer/saved", { method: "POST", body: { taskId } }),
  unsaveTask: (taskId) => request(`/api/volunteer/saved/${encodeURIComponent(taskId)}`, { method: "DELETE" }),
  updateVolunteerProfile: (body) => request("/api/volunteer/profile", { method: "PATCH", body }),
  nonprofit: () => request("/api/nonprofit"),
  createTask: (body) => request("/api/nonprofit/tasks", { method: "POST", body }),
  updateTaskStatus: (taskId, status) => request(`/api/nonprofit/tasks/${encodeURIComponent(taskId)}/status`, { method: "PATCH", body: { status } }),
  approveSignup: (signupId) => request(`/api/nonprofit/signups/${encodeURIComponent(signupId)}/approve`, { method: "PATCH" }),
  declineSignup: (signupId) => request(`/api/nonprofit/signups/${encodeURIComponent(signupId)}/decline`, { method: "PATCH" }),
  confirmSignup: (signupId) => request(`/api/nonprofit/signups/${encodeURIComponent(signupId)}/confirm`, { method: "PATCH" }),
  sendMessage: (body) => request("/api/nonprofit/messages", { method: "POST", body }),
  updateOrganization: (orgId, body) => request(`/api/nonprofit/organizations/${encodeURIComponent(orgId)}`, { method: "PATCH", body })
};
