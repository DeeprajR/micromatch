const { httpError } = require("../lib/http");
const { addNotification, cleanString, getMinuteSet, splitTags, uniqueValues } = require("./authService");
const { sanitizeUser } = require("../utils/security");

const badgeRules = [
  {
    label: "First Task",
    description: "Complete one micro-task",
    earned: (stats) => stats.completedCount >= 1
  },
  {
    label: "One Hour Given",
    description: "Confirm 60 volunteer minutes",
    earned: (stats) => stats.minutes >= 60
  },
  {
    label: "Cause Builder",
    description: "Support three causes",
    earned: (stats) => stats.causes.length >= 3
  },
  {
    label: "Task Sprint",
    description: "Complete five tasks",
    earned: (stats) => stats.completedCount >= 5
  }
];

function buildVolunteerPayload(store, user) {
  const profile = getVolunteerProfile(store, user.id);
  const stats = getVolunteerStats(store, user.id);
  const savedTaskIds = getSavedTaskIds(store, user.id);
  const tasks = store.data.tasks
    .filter((task) => task.status === "open")
    .map((task) => withTaskMeta(store, task, user.id))
    .sort((a, b) => b.score - a.score || new Date(a.deadline) - new Date(b.deadline));
  const savedTasks = savedTaskIds
    .map((taskId) => withTaskMeta(store, getTask(store, taskId), user.id))
    .filter(Boolean)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const signups = store.data.signups
    .filter((signup) => signup.volunteerId === user.id)
    .map((signup) => ({
      ...signup,
      task: withTaskMeta(store, getTask(store, signup.taskId), user.id)
    }))
    .filter((signup) => signup.task)
    .sort((a, b) => new Date(a.task.deadline) - new Date(b.task.deadline));

  return {
    user: sanitizeUser(user),
    profile,
    tasks,
    signups,
    savedTaskIds,
    savedTasks,
    stats,
    badges: badgeRules.map((badge) => ({ ...badge, earned: badge.earned(stats) })),
    notifications: getNotifications(store, user.id)
  };
}

function signUpForTask(store, user, taskId) {
  const task = getTask(store, taskId);
  if (!task) throw httpError(404, "Task not found.");
  if (task.status !== "open") throw httpError(400, "This task is not open.");
  if (getSignup(store, taskId, user.id)) throw httpError(409, "You are already signed up for this task.");
  if (getFilledSlotCount(store, taskId) >= task.volunteersNeeded) throw httpError(409, "This task is full.");
  if (task.approvalRequired && getApplicationCount(store, taskId) >= task.applicationLimit) {
    throw httpError(409, "This task is no longer accepting applications.");
  }

  const signup = {
    id: require("./authService").createId("signup"),
    taskId,
    volunteerId: user.id,
    status: task.approvalRequired ? "applied" : "scheduled",
    signedUpAt: new Date().toISOString(),
    reviewedAt: null,
    completedAt: null,
    confirmedAt: null,
    cancelledAt: null,
    actualMinutes: 0,
    completionNote: ""
  };

  store.data.signups.push(signup);
  const org = getOrganization(store, task.organizationId);
  if (task.approvalRequired) {
    addNotification(store, user.id, "Application submitted", `"${task.title}" is waiting for nonprofit approval.`);
    if (org?.ownerId) addNotification(store, org.ownerId, "New application", `${user.name} applied for "${task.title}".`);
  } else {
    addNotification(store, user.id, "Task scheduled", `"${task.title}" was added to your task list.`);
    if (org?.ownerId) addNotification(store, org.ownerId, "New sign-up", `${user.name} signed up for "${task.title}".`);
  }
  store.save();
}

function completeSignup(store, user, signupId, input = {}) {
  const signup = store.data.signups.find((item) => item.id === signupId && item.volunteerId === user.id);
  if (!signup) throw httpError(404, "Signup not found.");
  if (signup.status !== "scheduled") throw httpError(400, "Only scheduled tasks can be marked complete.");

  const task = getTask(store, signup.taskId);
  const org = getOrganization(store, task.organizationId);
  signup.status = "pending_confirmation";
  signup.completedAt = new Date().toISOString();
  signup.actualMinutes = Math.max(1, Math.min(240, Number(input.actualMinutes || task.minutes)));
  signup.completionNote = cleanString(input.completionNote);

  addNotification(store, user.id, "Completion submitted", `"${task.title}" is waiting for nonprofit confirmation.`);
  if (org?.ownerId) addNotification(store, org.ownerId, "Work submitted", `${user.name} marked "${task.title}" complete.`);
  store.save();
}

function cancelSignup(store, user, signupId) {
  const signup = store.data.signups.find((item) => item.id === signupId && item.volunteerId === user.id);
  if (!signup) throw httpError(404, "Signup not found.");
  if (["confirmed", "cancelled", "declined"].includes(signup.status)) throw httpError(400, "This signup can no longer be cancelled.");

  const task = getTask(store, signup.taskId);
  const org = getOrganization(store, task.organizationId);
  signup.status = "cancelled";
  signup.cancelledAt = new Date().toISOString();

  addNotification(store, user.id, "Signup cancelled", `"${task.title}" was removed from your active tasks.`);
  if (org?.ownerId) addNotification(store, org.ownerId, "Signup cancelled", `${user.name} cancelled "${task.title}".`);
  store.save();
}

function saveTask(store, user, taskId) {
  const task = getTask(store, taskId);
  if (!task) throw httpError(404, "Task not found.");
  if (!store.data.savedTasks.some((item) => item.userId === user.id && item.taskId === taskId)) {
    store.data.savedTasks.push({
      id: require("./authService").createId("saved"),
      userId: user.id,
      taskId,
      createdAt: new Date().toISOString()
    });
    store.save();
  }
}

function unsaveTask(store, user, taskId) {
  store.data.savedTasks = store.data.savedTasks.filter((item) => !(item.userId === user.id && item.taskId === taskId));
  store.save();
}

function updateVolunteerProfile(store, user, input) {
  const profile = getVolunteerProfile(store, user.id);
  user.name = cleanString(input.name) || user.name;
  profile.skills = splitTags(input.skills, ["Writing"]);
  profile.causes = splitTags(input.causes, ["Education"]);
  profile.preferredMinutes = getMinuteSet(Number(input.preferredMinutes || 60));
  profile.format = cleanString(input.format) || "Remote";
  profile.availability = splitTags(input.availability, []);
  profile.phone = cleanString(input.phone);
  profile.qualifications = splitTags(input.qualifications, []);
  addNotification(store, user.id, "Profile updated", "Your matching preferences were saved.");
  store.save();
}

function withTaskMeta(store, task, volunteerId) {
  if (!task) return null;
  const organization = getOrganization(store, task.organizationId);
  return {
    ...task,
    organization: organization ? publicOrganization(organization) : null,
    signupCount: getFilledSlotCount(store, task.id),
    applicationCount: getApplicationCount(store, task.id),
    applicationLimit: Number(task.applicationLimit || Math.max(task.volunteersNeeded * 3, task.volunteersNeeded)),
    isSaved: getSavedTaskIds(store, volunteerId).includes(task.id),
    score: getMatchScore(store, task, volunteerId)
  };
}

function getMatchScore(store, task, volunteerId) {
  const profile = getVolunteerProfile(store, volunteerId);
  const skillOverlap = task.skills.filter((skill) => profile.skills.includes(skill)).length;
  const skillScore = task.skills.length ? (skillOverlap / task.skills.length) * 42 : 0;
  const causeScore = profile.causes.includes(task.cause) ? 24 : 0;
  const timeScore = profile.preferredMinutes.some((minutes) => task.minutes <= minutes) ? 20 : 8;
  const formatScore = profile.format === "Either" || task.locationType === profile.format ? 9 : 3;
  const urgencyScore = Math.min(task.urgency || 0, 5);
  return Math.min(100, Math.round(skillScore + causeScore + timeScore + formatScore + urgencyScore));
}

function getVolunteerStats(store, userId) {
  const signups = store.data.signups.filter((signup) => signup.volunteerId === userId);
  const completed = signups
    .filter((signup) => signup.status === "confirmed")
    .map((signup) => getTask(store, signup.taskId))
    .filter(Boolean);
  const minutes = signups
    .filter((signup) => signup.status === "confirmed")
    .reduce((sum, signup) => {
      const task = getTask(store, signup.taskId);
      return sum + Number(signup.actualMinutes || task?.minutes || 0);
    }, 0);

  return {
    scheduledCount: signups.filter((signup) => !["confirmed", "cancelled", "declined"].includes(signup.status)).length,
    completedCount: completed.length,
    minutes,
    causes: uniqueValues(completed.map((task) => task.cause)),
    skills: uniqueValues(completed.flatMap((task) => task.skills)),
    impacts: completed.map((task) => task.impact)
  };
}

function getVolunteerProfile(store, userId) {
  let profile = store.data.volunteerProfiles.find((item) => item.userId === userId);
  if (!profile) {
    profile = {
      userId,
      skills: ["Writing"],
      causes: ["Education"],
      preferredMinutes: [15, 30, 60],
      format: "Remote",
      availability: [],
      phone: "",
      qualifications: []
    };
    store.data.volunteerProfiles.push(profile);
    store.save();
  }
  return profile;
}

function getSavedTaskIds(store, userId) {
  return store.data.savedTasks.filter((item) => item.userId === userId).map((item) => item.taskId);
}

function getNotifications(store, userId) {
  return store.data.notifications
    .filter((note) => note.recipientId === userId || note.recipientId === "all")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);
}

function getTask(store, taskId) {
  return store.data.tasks.find((task) => task.id === taskId);
}

function getOrganization(store, orgId) {
  return store.data.organizations.find((org) => org.id === orgId);
}

function publicOrganization(org) {
  return {
    id: org.id,
    name: org.name,
    mission: org.mission,
    website: org.website,
    location: org.location,
    verified: org.verified
  };
}

function getSignup(store, taskId, volunteerId) {
  return store.data.signups.find((signup) => signup.taskId === taskId && signup.volunteerId === volunteerId);
}

function getSignupCount(store, taskId) {
  return store.data.signups.filter((signup) => signup.taskId === taskId && !["cancelled", "declined"].includes(signup.status)).length;
}

function getFilledSlotCount(store, taskId) {
  return store.data.signups.filter((signup) => signup.taskId === taskId && ["scheduled", "pending_confirmation", "confirmed"].includes(signup.status)).length;
}

function getApplicationCount(store, taskId) {
  return store.data.signups.filter((signup) => signup.taskId === taskId && signup.status === "applied").length;
}

module.exports = {
  buildVolunteerPayload,
  cancelSignup,
  completeSignup,
  getNotifications,
  getApplicationCount,
  getFilledSlotCount,
  getOrganization,
  getSignupCount,
  getTask,
  getVolunteerProfile,
  getVolunteerStats,
  publicOrganization,
  saveTask,
  signUpForTask,
  unsaveTask,
  updateVolunteerProfile,
  withTaskMeta
};
