const { httpError } = require("../lib/http");
const { createSessionToken, hashPassword, hashToken, sanitizeUser, verifyPassword } = require("../utils/security");

const SESSION_DAYS = 7;

function signUp(store, input) {
  const name = cleanString(input.name);
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  const role = input.role === "nonprofit" ? "nonprofit" : "volunteer";

  if (!name) throw httpError(400, "Name is required.");
  if (!email || !email.includes("@")) throw httpError(400, "A valid email is required.");
  if (password.length < 4) throw httpError(400, "Password must be at least 4 characters.");
  if (store.data.users.some((user) => normalizeEmail(user.email) === email)) {
    throw httpError(409, "An account with that email already exists.");
  }

  const passwordRecord = hashPassword(password);
  const user = {
    id: createId("user"),
    name,
    email,
    role,
    passwordSalt: passwordRecord.salt,
    passwordHash: passwordRecord.hash,
    createdAt: new Date().toISOString()
  };

  store.data.users.push(user);

  if (role === "volunteer") {
    store.data.volunteerProfiles.push({
      userId: user.id,
      skills: splitTags(input.skills, ["Writing"]),
      causes: splitTags(input.causes, ["Education"]),
      preferredMinutes: getMinuteSet(Number(input.preferredMinutes || 60)),
      format: cleanString(input.format) || "Remote",
      availability: splitTags(input.availability, []),
      phone: cleanString(input.phone),
      qualifications: splitTags(input.qualifications, [])
    });
    addNotification(store, user.id, "Profile created", "You can now sign up for micro-tasks that match your skills.");
  } else {
    const org = {
      id: createId("org"),
      ownerId: user.id,
      name: cleanString(input.organizationName) || `${name}'s Organization`,
      mission: cleanString(input.mission) || "New nonprofit workspace.",
      website: cleanString(input.website),
      location: cleanString(input.location) || "Remote",
      verified: false,
      createdAt: new Date().toISOString()
    };
    store.data.organizations.push(org);
    addNotification(store, user.id, "Organization created", `${org.name} can now publish micro-volunteer tasks.`);
  }

  const session = createSession(store, user.id);
  store.save();
  return { token: session.token, user: sanitizeUser(user) };
}

function signIn(store, input) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  const user = store.data.users.find((item) => normalizeEmail(item.email) === email);

  if (!user || !verifyPassword(password, user)) {
    throw httpError(401, "Email or password does not match.");
  }

  const session = createSession(store, user.id);
  store.save();
  return { token: session.token, user: sanitizeUser(user) };
}

function signOut(store, token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  store.data.sessions = store.data.sessions.filter((session) => session.tokenHash !== tokenHash);
  store.save();
}

function getUserForRequest(store, req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const now = Date.now();
  const tokenHash = hashToken(token);
  const session = store.data.sessions.find((item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > now);
  if (!session) return null;

  return store.data.users.find((user) => user.id === session.userId) || null;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

function createSession(store, userId) {
  const token = createSessionToken();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  store.data.sessions.push({
    id: createId("session"),
    userId,
    tokenHash: hashToken(token),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  });

  return { token };
}

function addNotification(store, recipientId, title, message) {
  store.data.notifications.push({
    id: createId("note"),
    recipientId,
    title,
    message,
    createdAt: new Date().toISOString()
  });
}

function createId(prefix) {
  return `${prefix}_${cryptoRandom()}`;
}

function cryptoRandom() {
  return require("crypto").randomBytes(12).toString("hex");
}

function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}

function cleanString(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function splitTags(value, fallback = []) {
  const tags = String(value || "")
    .split(",")
    .map((tag) => cleanString(tag))
    .filter(Boolean);
  return tags.length ? uniqueValues(tags) : fallback;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function getMinuteSet(maxMinutes) {
  return [15, 30, 60, 90].filter((minutes) => minutes <= maxMinutes);
}

module.exports = {
  addNotification,
  cleanString,
  createId,
  getBearerToken,
  getMinuteSet,
  getUserForRequest,
  normalizeEmail,
  signIn,
  signOut,
  signUp,
  splitTags,
  uniqueValues
};
