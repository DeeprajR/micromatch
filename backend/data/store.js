const fs = require("fs");
const path = require("path");
const { createSeedData } = require("./seed");

class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      this.data = createSeedData();
      this.save();
      return;
    }

    const raw = fs.readFileSync(this.filePath, "utf8");
    this.data = normalize(JSON.parse(raw));
    this.save();
  }

  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}

function normalize(data) {
  const seed = createSeedData();
  const normalized = {
    users: Array.isArray(data.users) ? data.users : seed.users,
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    volunteerProfiles: Array.isArray(data.volunteerProfiles) ? data.volunteerProfiles : seed.volunteerProfiles,
    organizations: Array.isArray(data.organizations) ? data.organizations : seed.organizations,
    tasks: Array.isArray(data.tasks) ? data.tasks : seed.tasks,
    savedTasks: Array.isArray(data.savedTasks) ? data.savedTasks : seed.savedTasks,
    messages: Array.isArray(data.messages) ? data.messages : seed.messages,
    signups: Array.isArray(data.signups) ? data.signups : seed.signups,
    notifications: Array.isArray(data.notifications) ? data.notifications : seed.notifications
  };

  normalized.organizations.forEach((org) => {
    if ((org.id === "org_brightsteps" || org.id === "org_open_path") && !org.ownerId) {
      org.ownerId = "user_np_maya";
    }
  });

  normalized.users.forEach((user) => {
    delete user.password;
  });

  normalized.volunteerProfiles.forEach((profile) => {
    profile.availability = Array.isArray(profile.availability) ? profile.availability : [];
    profile.phone = profile.phone || "";
    profile.qualifications = Array.isArray(profile.qualifications) ? profile.qualifications : [];
  });

  normalized.tasks.forEach((task) => {
    if (task.id === "task_resume_review") {
      task.approvalRequired = task.id === "task_resume_review" ? true : Boolean(task.approvalRequired);
    } else if (typeof task.approvalRequired !== "boolean") {
      task.approvalRequired = Boolean(task.approvalRequired);
    }
    task.status = task.status || "open";
    task.applicationLimit = Number(task.applicationLimit || Math.max(task.volunteersNeeded * 3, task.volunteersNeeded));
  });

  normalized.signups.forEach((signup) => {
    signup.actualMinutes = Number(signup.actualMinutes || 0);
    signup.completionNote = signup.completionNote || "";
  });

  return normalized;
}

module.exports = { Store };
