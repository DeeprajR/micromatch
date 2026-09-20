const { httpError, readJson, requireMethod, sendJson } = require("../lib/http");
const {
  approveSignup,
  buildNonprofitPayload,
  confirmSignup,
  createTask,
  declineSignup,
  sendMessage,
  updateOrganization,
  updateTaskStatus
} = require("../services/nonprofitService");

async function handleNonprofitRoutes(req, res, context) {
  if (context.user.role !== "nonprofit") throw httpError(403, "Nonprofit access required.");

  const action = context.segments[2];

  if (!action) {
    requireMethod(req, "GET");
    sendJson(res, 200, buildNonprofitPayload(context.store, context.user));
    return;
  }

  if (action === "tasks" && req.method === "POST") {
    const body = await readJson(req);
    createTask(context.store, context.user, body);
    sendJson(res, 201, buildNonprofitPayload(context.store, context.user));
    return;
  }

  if (action === "tasks" && context.segments[4] === "status") {
    requireMethod(req, "PATCH");
    const body = await readJson(req);
    updateTaskStatus(context.store, context.user, context.segments[3], body);
    sendJson(res, 200, buildNonprofitPayload(context.store, context.user));
    return;
  }

  if (action === "messages") {
    requireMethod(req, "POST");
    const body = await readJson(req);
    sendMessage(context.store, context.user, body);
    sendJson(res, 201, buildNonprofitPayload(context.store, context.user));
    return;
  }

  if (action === "signups" && context.segments[4] === "approve") {
    requireMethod(req, "PATCH");
    approveSignup(context.store, context.user, context.segments[3]);
    sendJson(res, 200, buildNonprofitPayload(context.store, context.user));
    return;
  }

  if (action === "signups" && context.segments[4] === "decline") {
    requireMethod(req, "PATCH");
    declineSignup(context.store, context.user, context.segments[3]);
    sendJson(res, 200, buildNonprofitPayload(context.store, context.user));
    return;
  }

  if (action === "signups" && context.segments[4] === "confirm") {
    requireMethod(req, "PATCH");
    confirmSignup(context.store, context.user, context.segments[3]);
    sendJson(res, 200, buildNonprofitPayload(context.store, context.user));
    return;
  }

  if (action === "organizations") {
    requireMethod(req, "PATCH");
    const body = await readJson(req);
    updateOrganization(context.store, context.user, context.segments[3], body);
    sendJson(res, 200, buildNonprofitPayload(context.store, context.user));
    return;
  }

  sendJson(res, 404, { error: "Nonprofit route not found." });
}

module.exports = { handleNonprofitRoutes };
