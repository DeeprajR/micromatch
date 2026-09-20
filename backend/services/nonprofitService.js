const { httpError } = require("../lib/http");
const { addNotification, cleanString, createId, splitTags } = require("./authService");
const {
  getApplicationCount,
  getFilledSlotCount,
  getNotifications,
  getOrganization,
  getSignupCount,
  getTask,
  publicOrganization
} = require("./volunteerService");
const { sanitizeUser } = require("../utils/security");

function buildNonprofitPayload(store, user) {
  const organizations = getOwnedOrganizations(store, user.id).map(publicOrganization);
  const ownedOrgIds = new Set(organizations.map((org) => org.id));
  const tasks = store.data.tasks
    .filter((task) => ownedOrgIds.has(task.organizationId))
    .map((task) => withOrgTaskMeta(store, task));
  const signups = store.data.signups
    .filter((signup) => ownedOrgIds.has(getTask(store, signup.taskId)?.organizationId))
    .map((signup) => withSignupMeta(store, signup))
    .filter(Boolean)
    .sort((a, b) => new Date(b.signedUpAt) - new Date(a.signedUpAt));

  return {
    user: sanitizeUser(user),
    organizations,
    tasks,
    signups,
    stats: getOwnerStats(store, user.id),
    reports: buildReports(store, user.id),
    notifications: getNotifications(store, user.id)
  };
}

function createTask(store, user, input) {
  const org = getOwnedOrganizations(store, user.id)[0];
  if (!org) throw httpError(400, "Create an organization first.");

  const task = {
    id: createId("task"),
    organizationId: org.id,
    title: cleanString(input.title),
    description: cleanString(input.description),
    cause: cleanString(input.cause),
    skills: splitTags(input.skills, ["Writing"]),
    minutes: Number(input.minutes),
    deadline: String(input.deadline || ""),
    locationType: cleanString(input.locationType) || "Remote",
    location: cleanString(input.location) || "Online",
    volunteersNeeded: Number(input.volunteersNeeded || 1),
    applicationLimit: Math.max(Number(input.applicationLimit || 0), Number(input.volunteersNeeded || 1)),
    impact: cleanString(input.impact),
    instructions: cleanString(input.instructions),
    status: "open",
    approvalRequired: input.approvalRequired === true || input.approvalRequired === "true",
    urgency: 3,
    createdAt: new Date().toISOString()
  };

  validateTask(task);
  store.data.tasks.unshift(task);
  addNotification(store, user.id, "Task published", `"${task.title}" is live in the catalog.`);
  store.save();
}

function approveSignup(store, user, signupId) {
  reviewSignup(store, user, signupId, "scheduled", "Application approved", "Your application was approved.");
}

function declineSignup(store, user, signupId) {
  reviewSignup(store, user, signupId, "declined", "Application declined", "Your application was declined.");
}

function reviewSignup(store, user, signupId, nextStatus, title, message) {
  const ownedOrgIds = new Set(getOwnedOrganizations(store, user.id).map((org) => org.id));
  const signup = store.data.signups.find((item) => item.id === signupId);
  const task = signup ? getTask(store, signup.taskId) : null;

  if (!signup || !task || !ownedOrgIds.has(task.organizationId)) throw httpError(404, "Application not found.");
  if (signup.status !== "applied") throw httpError(400, "Only applications can be reviewed.");
  if (nextStatus === "scheduled" && getFilledSlotCount(store, task.id) >= task.volunteersNeeded) {
    throw httpError(409, "Volunteer slots are already full.");
  }

  signup.status = nextStatus;
  signup.reviewedAt = new Date().toISOString();
  addNotification(store, signup.volunteerId, title, `${message} "${task.title}".`);
  addNotification(store, user.id, "Application reviewed", `${task.title} application was marked ${nextStatus}.`);
  store.save();
}

function confirmSignup(store, user, signupId) {
  const ownedOrgIds = new Set(getOwnedOrganizations(store, user.id).map((org) => org.id));
  const signup = store.data.signups.find((item) => item.id === signupId);
  const task = signup ? getTask(store, signup.taskId) : null;

  if (!signup || !task || !ownedOrgIds.has(task.organizationId)) throw httpError(404, "Signup not found.");
  if (signup.status !== "pending_confirmation") throw httpError(400, "Only pending work can be confirmed.");

  signup.status = "confirmed";
  signup.confirmedAt = new Date().toISOString();
  addNotification(store, signup.volunteerId, "Work confirmed", `"${task.title}" was confirmed. Your impact dashboard was updated.`);
  addNotification(store, user.id, "Volunteer confirmed", `"${task.title}" is now counted in your organization impact.`);
  store.save();
}

function updateTaskStatus(store, user, taskId, input) {
  const ownedOrgIds = new Set(getOwnedOrganizations(store, user.id).map((org) => org.id));
  const task = store.data.tasks.find((item) => item.id === taskId && ownedOrgIds.has(item.organizationId));
  if (!task) throw httpError(404, "Task not found.");

  const nextStatus = cleanString(input.status);
  if (!["open", "closed"].includes(nextStatus)) throw httpError(400, "Task status must be open or closed.");

  task.status = nextStatus;
  addNotification(store, user.id, "Task status updated", `"${task.title}" is now ${nextStatus}.`);
  store.save();
}

function sendMessage(store, user, input) {
  const ownedOrgIds = new Set(getOwnedOrganizations(store, user.id).map((org) => org.id));
  const volunteerId = cleanString(input.volunteerId);
  const message = cleanString(input.message);
  if (!message) throw httpError(400, "Message is required.");

  const hasRelationship = store.data.signups.some((signup) => {
    const task = getTask(store, signup.taskId);
    return signup.volunteerId === volunteerId && ownedOrgIds.has(task?.organizationId);
  });
  if (!hasRelationship) throw httpError(404, "Volunteer not found for this organization.");

  const org = getOwnedOrganizations(store, user.id)[0];
  store.data.messages.push({
    id: createId("message"),
    fromUserId: user.id,
    toUserId: volunteerId,
    organizationId: org?.id || null,
    message,
    createdAt: new Date().toISOString()
  });
  addNotification(store, volunteerId, `Message from ${org?.name || "nonprofit"}`, message);
  addNotification(store, user.id, "Message sent", "The volunteer was notified.");
  store.save();
}

function updateOrganization(store, user, orgId, input) {
  const org = getOwnedOrganizations(store, user.id).find((item) => item.id === orgId);
  if (!org) throw httpError(404, "Organization not found.");

  org.name = cleanString(input.name) || org.name;
  org.mission = cleanString(input.mission);
  org.website = cleanString(input.website);
  org.location = cleanString(input.location);
  addNotification(store, user.id, "Organization updated", `${org.name} details were saved.`);
  store.save();
}

function withOrgTaskMeta(store, task) {
  return {
    ...task,
    organization: publicOrganization(getOrganization(store, task.organizationId)),
    signupCount: getFilledSlotCount(store, task.id),
    totalSignupCount: getSignupCount(store, task.id),
    applicationCount: getApplicationCount(store, task.id),
    boardStatus: getBoardStatus(store, task)
  };
}

function withSignupMeta(store, signup) {
  const task = getTask(store, signup.taskId);
  const volunteer = store.data.users.find((user) => user.id === signup.volunteerId);
  const profile = store.data.volunteerProfiles.find((item) => item.userId === signup.volunteerId);
  if (!task || !volunteer) return null;
  return {
    ...signup,
    task: withOrgTaskMeta(store, task),
    volunteer: sanitizeUser(volunteer),
    profile: profile
      ? {
          skills: profile.skills || [],
          causes: profile.causes || [],
          availability: profile.availability || [],
          qualifications: profile.qualifications || [],
          phone: profile.phone || ""
        }
      : null
  };
}

function getOwnerStats(store, userId) {
  const organizations = getOwnedOrganizations(store, userId);
  const orgIds = new Set(organizations.map((org) => org.id));
  const tasks = store.data.tasks.filter((task) => orgIds.has(task.organizationId));
  const signups = store.data.signups.filter((signup) => orgIds.has(getTask(store, signup.taskId)?.organizationId));
  const confirmed = signups.filter((signup) => signup.status === "confirmed");
  const minutes = confirmed.reduce((sum, signup) => {
    const task = getTask(store, signup.taskId);
    return sum + Number(signup.actualMinutes || task?.minutes || 0);
  }, 0);
  const totalSlots = tasks.reduce((sum, task) => sum + task.volunteersNeeded, 0);
  const filledSlots = signups.filter((signup) => ["scheduled", "pending_confirmation", "confirmed"].includes(signup.status)).length;

  return {
    tasks: tasks.length,
    pending: signups.filter((signup) => ["applied", "pending_confirmation"].includes(signup.status)).length,
    applications: signups.filter((signup) => signup.status === "applied").length,
    confirmations: signups.filter((signup) => signup.status === "pending_confirmation").length,
    openSlots: Math.max(0, totalSlots - filledSlots),
    minutes,
    hours: formatHours(minutes)
  };
}

function buildReports(store, userId) {
  const organizations = getOwnedOrganizations(store, userId);
  const orgIds = new Set(organizations.map((org) => org.id));
  const tasks = store.data.tasks.filter((task) => orgIds.has(task.organizationId));
  const signups = store.data.signups.filter((signup) => orgIds.has(getTask(store, signup.taskId)?.organizationId));
  const byStatus = countBy(signups, "status");
  const byCause = tasks.reduce((acc, task) => {
    acc[task.cause] = (acc[task.cause] || 0) + 1;
    return acc;
  }, {});
  const confirmedMinutes = signups
    .filter((signup) => signup.status === "confirmed")
    .reduce((sum, signup) => {
      const task = getTask(store, signup.taskId);
      return sum + Number(signup.actualMinutes || task?.minutes || 0);
    }, 0);

  return {
    byStatus,
    byCause,
    confirmedMinutes,
    uniqueVolunteers: new Set(signups.map((signup) => signup.volunteerId)).size
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function getOwnedOrganizations(store, userId) {
  return store.data.organizations.filter((org) => org.ownerId === userId);
}

function getBoardStatus(store, task) {
  const signups = store.data.signups.filter((signup) => signup.taskId === task.id && !["cancelled", "declined"].includes(signup.status));
  const filledSignups = signups.filter((signup) => ["scheduled", "pending_confirmation", "confirmed"].includes(signup.status));
  const hasActiveWork = signups.some((signup) => signup.status !== "confirmed");
  const isFullyConfirmed = filledSignups.length >= task.volunteersNeeded && filledSignups.every((signup) => signup.status === "confirmed");
  if (hasActiveWork) return "In Progress";
  if (isFullyConfirmed) return "Completed";
  return "Recruiting";
}

function validateTask(task) {
  if (!task.title) throw httpError(400, "Task title is required.");
  if (!task.description) throw httpError(400, "Task description is required.");
  if (!task.deadline) throw httpError(400, "Deadline is required.");
  if (!task.impact) throw httpError(400, "Impact statement is required.");
  if (!task.instructions) throw httpError(400, "Instructions are required.");
  if (![15, 30, 60, 90].includes(task.minutes)) throw httpError(400, "Task length must be 15, 30, 60, or 90 minutes.");
  if (task.volunteersNeeded < 1 || task.volunteersNeeded > 20) throw httpError(400, "Volunteers needed must be between 1 and 20.");
  if (task.applicationLimit < task.volunteersNeeded || task.applicationLimit > 100) {
    throw httpError(400, "Application cap must be between volunteers needed and 100.");
  }
}

function formatHours(minutes) {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

module.exports = {
  approveSignup,
  buildNonprofitPayload,
  confirmSignup,
  createTask,
  declineSignup,
  getOwnedOrganizations,
  sendMessage,
  updateTaskStatus,
  updateOrganization
};
