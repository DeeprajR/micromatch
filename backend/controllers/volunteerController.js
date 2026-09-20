const { httpError, readJson, requireMethod, sendJson } = require("../lib/http");
const {
  buildVolunteerPayload,
  cancelSignup,
  completeSignup,
  saveTask,
  signUpForTask,
  unsaveTask,
  updateVolunteerProfile
} = require("../services/volunteerService");

async function handleVolunteerRoutes(req, res, context) {
  if (context.user.role !== "volunteer") throw httpError(403, "Volunteer access required.");

  const action = context.segments[2];

  if (!action) {
    requireMethod(req, "GET");
    sendJson(res, 200, buildVolunteerPayload(context.store, context.user));
    return;
  }

  if (action === "signups" && req.method === "POST") {
    const body = await readJson(req);
    signUpForTask(context.store, context.user, body.taskId);
    sendJson(res, 201, buildVolunteerPayload(context.store, context.user));
    return;
  }

  if (action === "signups" && context.segments[4] === "complete") {
    requireMethod(req, "PATCH");
    const body = await readJson(req);
    completeSignup(context.store, context.user, context.segments[3], body);
    sendJson(res, 200, buildVolunteerPayload(context.store, context.user));
    return;
  }

  if (action === "signups" && context.segments[4] === "cancel") {
    requireMethod(req, "PATCH");
    cancelSignup(context.store, context.user, context.segments[3]);
    sendJson(res, 200, buildVolunteerPayload(context.store, context.user));
    return;
  }

  if (action === "saved" && req.method === "POST") {
    const body = await readJson(req);
    saveTask(context.store, context.user, body.taskId);
    sendJson(res, 201, buildVolunteerPayload(context.store, context.user));
    return;
  }

  if (action === "saved" && req.method === "GET") {
    sendJson(res, 200, buildVolunteerPayload(context.store, context.user));
    return;
  }

  if (action === "saved" && req.method === "DELETE") {
    unsaveTask(context.store, context.user, context.segments[3]);
    sendJson(res, 200, buildVolunteerPayload(context.store, context.user));
    return;
  }

  if (action === "profile") {
    requireMethod(req, "PATCH");
    const body = await readJson(req);
    updateVolunteerProfile(context.store, context.user, body);
    sendJson(res, 200, buildVolunteerPayload(context.store, context.user));
    return;
  }

  sendJson(res, 404, { error: "Volunteer route not found." });
}

module.exports = { handleVolunteerRoutes };
