const { readJson, requireMethod, sendJson } = require("../lib/http");
const { getBearerToken, getUserForRequest, signIn, signOut, signUp } = require("../services/authService");
const { sanitizeUser } = require("../utils/security");

async function handleAuthRoutes(req, res, context) {
  const action = context.segments[2];

  if (action === "sign-up") {
    requireMethod(req, "POST");
    const body = await readJson(req);
    sendJson(res, 201, signUp(context.store, body));
    return;
  }

  if (action === "sign-in") {
    requireMethod(req, "POST");
    const body = await readJson(req);
    sendJson(res, 200, signIn(context.store, body));
    return;
  }

  if (action === "sign-out") {
    requireMethod(req, "POST");
    signOut(context.store, getBearerToken(req));
    sendJson(res, 200, { ok: true });
    return;
  }

  if (action === "me") {
    requireMethod(req, "GET");
    const user = getUserForRequest(context.store, req);
    sendJson(res, user ? 200 : 401, user ? { user: sanitizeUser(user) } : { error: "Authentication required." });
    return;
  }

  sendJson(res, 404, { error: "Auth route not found." });
}

module.exports = { handleAuthRoutes };
