import {
  escapeAttr,
  escapeHtml,
  formToObject,
  formatDate,
  renderNotifications,
  renderStat,
  setPageChrome,
  statusClass,
  statusLabel
} from "../ui.js";

export const nonprofitNav = [
  ["dashboard", "Dashboard"],
  ["applicants", "Applicants"],
  ["volunteers", "Volunteers"],
  ["post", "Post task"],
  ["confirm", "Confirm"],
  ["reports", "Reports"],
  ["organization", "Organization"]
];

export const defaultNonprofitPage = "dashboard";

export function renderNonprofitShell(payload, els) {
  const org = payload.organizations[0];
  els.profilePanel.innerHTML = `
    <div class="profile-name">
      <span class="avatar">${getInitials(org?.name || payload.user.name)}</span>
      <div>
        <h3>${escapeHtml(org?.name || "Organization")}</h3>
        <p>${org?.verified ? "Verified nonprofit" : "Verification pending"}</p>
      </div>
    </div>
    <div class="divider"></div>
    <div class="org-grid">
      ${renderStat(payload.stats.tasks, "tasks")}
      ${renderStat(payload.stats.pending, "pending")}
    </div>
  `;

  els.sidebarPanel.innerHTML = `
    <h3>Organization</h3>
    <p class="muted">${escapeHtml(org?.mission || "Complete your organization profile.")}</p>
  `;

  els.notificationList.innerHTML = renderNotifications(payload.notifications);
  els.upcomingPanel.innerHTML = `
    <div class="panel-heading"><svg><use href="#icon-check"></use></svg><h3>Needs review</h3></div>
    <div class="list-row">
      <strong>${payload.stats.confirmations}</strong>
      <p>${payload.stats.confirmations === 1 ? "work submission" : "work submissions"} awaiting confirmation.</p>
    </div>
    <div class="list-row">
      <strong>${payload.stats.applications}</strong>
      <p>${payload.stats.applications === 1 ? "application" : "applications"} awaiting review.</p>
    </div>
  `;
}

export function renderNonprofitPage(page, payload, els) {
  if (page === "dashboard") renderDashboard(payload, els);
  if (page === "applicants") renderApplicants(payload, els);
  if (page === "volunteers") renderVolunteers(payload, els);
  if (page === "post") renderPostTask(payload, els);
  if (page === "confirm") renderConfirmations(payload, els);
  if (page === "reports") renderReports(payload, els);
  if (page === "organization") renderOrganization(payload, els);
}

export async function handleNonprofitClick(event, context) {
  const action = event.target.closest("[data-action]");
  if (!action) return false;

  if (action.dataset.action === "confirm") {
    context.setPayload(await context.api.confirmSignup(action.dataset.signupId));
    context.showToast("Work confirmed.");
    return true;
  }

  if (action.dataset.action === "approve") {
    context.setPayload(await context.api.approveSignup(action.dataset.signupId));
    context.showToast("Application approved.");
    return true;
  }

  if (action.dataset.action === "decline") {
    context.setPayload(await context.api.declineSignup(action.dataset.signupId));
    context.showToast("Application declined.");
    return true;
  }

  if (action.dataset.action === "task-status") {
    context.setPayload(await context.api.updateTaskStatus(action.dataset.taskId, action.dataset.status));
    context.showToast("Task status updated.");
    return true;
  }

  if (action.dataset.action === "message") {
    const message = window.prompt("Message to volunteer");
    if (!message) return false;
    context.setPayload(await context.api.sendMessage({ volunteerId: action.dataset.volunteerId, message }));
    context.showToast("Message sent.");
    return true;
  }

  return false;
}

export async function handleNonprofitSubmit(event, context) {
  const form = event.target.closest("form[data-form]");
  if (!form) return false;
  event.preventDefault();

  if (form.dataset.form === "task-post") {
    context.setPayload(await context.api.createTask(formToObject(form)));
    context.setPage("dashboard");
    context.showToast("Task published.");
    return true;
  }

  if (form.dataset.form === "organization-profile") {
    context.setPayload(await context.api.updateOrganization(form.dataset.orgId, formToObject(form)));
    context.showToast("Organization saved.");
    return true;
  }

  return false;
}

function renderDashboard(payload, els) {
  setPageChrome(els, {
    title: "Dashboard",
    subtitle: "Manage micro-tasks and volunteer progress.",
    metrics: [
      [payload.stats.tasks, "tasks"],
      [payload.stats.openSlots, "open slots"],
      [payload.stats.hours, "hours"]
    ]
  });

  els.mainContent.innerHTML = `
    <div class="board-grid">
      ${["Recruiting", "In Progress", "Completed"].map((status) => renderBoardColumn(status, payload)).join("")}
    </div>
  `;
}

function renderBoardColumn(status, payload) {
  const matching = payload.tasks.filter((task) => task.boardStatus === status);
  return `
    <section class="board-column">
      <h3>${status} (${matching.length})</h3>
      <div class="stack small">
        ${
          matching.length
            ? matching
                .map(
                  (task) => `
                  <div class="board-item">
                    <strong>${escapeHtml(task.title)}</strong>
                    <span class="muted">${task.signupCount}/${task.volunteersNeeded} volunteer slots - ${task.minutes} min</span>
                    <span class="muted">${task.applicationCount}/${task.applicationLimit} applications</span>
                    <span class="muted">${task.approvalRequired ? "Approval required" : "Auto sign-up"} - ${task.status}</span>
                    <span class="muted">Next: ${escapeHtml(getTaskNextStep(task, payload.signups))}</span>
                    ${renderBoardActions(task, payload.signups)}
                  </div>
                `
                )
                .join("")
            : `<div class="empty-state">None</div>`
        }
      </div>
    </section>
  `;
}

function renderBoardActions(task, signups) {
  const taskSignups = signups.filter((signup) => signup.task.id === task.id);
  const pendingConfirmations = taskSignups.filter((signup) => signup.status === "pending_confirmation");
  const applications = taskSignups.filter((signup) => signup.status === "applied");

  return `
    ${
      pendingConfirmations.length
        ? `
        <div class="board-action-list">
          ${pendingConfirmations
            .map(
              (signup) => `
              <div class="board-action-row">
                <span>${escapeHtml(signup.volunteer.name)} submitted ${signup.actualMinutes || signup.task.minutes} min</span>
                <button class="primary-action" data-action="confirm" data-signup-id="${signup.id}" type="button">
                  <svg><use href="#icon-check"></use></svg>Confirm
                </button>
              </div>
            `
            )
            .join("")}
        </div>
      `
        : ""
    }
    ${
      applications.length
        ? `
        <div class="board-action-list">
          ${applications
            .map(
              (signup) => `
              <div class="board-action-row">
                <span>${escapeHtml(signup.volunteer.name)} applied</span>
                <button class="ghost-action" data-action="decline" data-signup-id="${signup.id}" type="button">Decline</button>
                <button class="primary-action" data-action="approve" data-signup-id="${signup.id}" ${task.signupCount >= task.volunteersNeeded ? "disabled" : ""} type="button">
                  ${task.signupCount >= task.volunteersNeeded ? "Slots full" : "Approve"}
                </button>
              </div>
            `
            )
            .join("")}
        </div>
      `
        : ""
    }
    <div class="row-actions">
      <button class="ghost-action" data-action="task-status" data-task-id="${task.id}" data-status="${task.status === "open" ? "closed" : "open"}" type="button">
        ${task.status === "open" ? "Close" : "Reopen"}
      </button>
    </div>
  `;
}

function getTaskNextStep(task, signups) {
  const taskSignups = signups.filter((signup) => signup.task.id === task.id);
  if (task.status === "closed") return "Reopen when ready to recruit.";
  if (taskSignups.some((signup) => signup.status === "applied")) return "Review applicants.";
  if (taskSignups.some((signup) => signup.status === "pending_confirmation")) return "Confirm submitted work.";
  if (taskSignups.some((signup) => signup.status === "scheduled")) return "Wait for volunteer completion.";
  if (task.boardStatus === "Completed") return "Review reports and impact.";
  return task.approvalRequired ? "Applications will appear in Applicants." : "Volunteers can sign up directly.";
}

function renderApplicants(payload, els) {
  const applications = payload.signups.filter((signup) => signup.status === "applied");
  setPageChrome(els, {
    title: "Applicants",
    subtitle: "Review volunteers for tasks that require approval.",
    metrics: [[applications.length, "applications"]]
  });

  els.mainContent.innerHTML = `
    <div class="data-list">
      ${applications.length ? applications.map(renderApplicantRow).join("") : `<div class="empty-state">No applications need review.</div>`}
    </div>
  `;
}

function renderApplicantRow(signup) {
  const slotsFull = signup.task.signupCount >= signup.task.volunteersNeeded;
  return `
    <article class="list-row">
      <header>
        <div>
          <h3>${escapeHtml(signup.volunteer.name)}</h3>
          <p>${escapeHtml(signup.task.title)} - ${escapeHtml(signup.volunteer.email)}</p>
        </div>
        <span class="status pending">Applied</span>
      </header>
      <div class="chip-row">
        ${(signup.profile?.skills || []).map((skill) => `<span class="chip skill">${escapeHtml(skill)}</span>`).join("")}
        ${(signup.profile?.availability || []).map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}
        <span class="chip">${signup.task.signupCount}/${signup.task.volunteersNeeded} volunteer slots</span>
        <span class="chip">${signup.task.applicationCount}/${signup.task.applicationLimit} applications</span>
      </div>
      <p>${escapeHtml((signup.profile?.qualifications || []).join(", ") || "No qualifications listed.")}</p>
      <div class="row-actions">
        <button class="ghost-action" data-action="message" data-volunteer-id="${signup.volunteer.id}" type="button">Message</button>
        <button class="ghost-action" data-action="decline" data-signup-id="${signup.id}" type="button">Decline</button>
        <button class="primary-action" data-action="approve" data-signup-id="${signup.id}" ${slotsFull ? "disabled" : ""} type="button">
          ${slotsFull ? "Slots full" : "Approve"}
        </button>
      </div>
    </article>
  `;
}

function renderVolunteers(payload, els) {
  const volunteers = getVolunteerRecords(payload);
  setPageChrome(els, {
    title: "Volunteers",
    subtitle: "People who have engaged with your tasks.",
    metrics: [[volunteers.length, "people"], [payload.signups.length, "records"]]
  });

  els.mainContent.innerHTML = `
    <div class="data-list">
      ${volunteers.length ? volunteers.map(renderVolunteerRecord).join("") : `<div class="empty-state">Volunteer records will appear after sign-ups.</div>`}
    </div>
  `;
}

function renderVolunteerRecord(record) {
  return `
    <article class="list-row">
      <header>
        <div>
          <h3>${escapeHtml(record.volunteer.name)}</h3>
          <p>${escapeHtml(record.volunteer.email)} ${record.profile?.phone ? `- ${escapeHtml(record.profile.phone)}` : ""}</p>
        </div>
        <span class="chip">${record.signups.length} tasks</span>
      </header>
      <div class="chip-row">
        ${(record.profile?.skills || []).map((skill) => `<span class="chip skill">${escapeHtml(skill)}</span>`).join("")}
        ${(record.profile?.causes || []).map((cause) => `<span class="chip cause">${escapeHtml(cause)}</span>`).join("")}
      </div>
      <p>${escapeHtml(record.signups.map((signup) => `${signup.task.title}: ${statusLabel(signup.status)}`).join(", "))}</p>
      <div class="row-actions">
        <button class="ghost-action" data-action="message" data-volunteer-id="${record.volunteer.id}" type="button">Message</button>
      </div>
    </article>
  `;
}

function renderPostTask(payload, els) {
  setPageChrome(els, {
    title: "Post task",
    subtitle: "Publish short, specific volunteer work.",
    metrics: [[payload.tasks.length, "published"]]
  });

  els.mainContent.innerHTML = `
    <form class="post-form" data-form="task-post">
      <label class="field">
        <span>Title</span>
        <input name="title" required maxlength="90" placeholder="Review a resume workshop handout" />
      </label>
      <label class="field">
        <span>Description</span>
        <textarea name="description" required rows="3" placeholder="What should the volunteer do?"></textarea>
      </label>
      <div class="form-row">
        <label class="field">
          <span>Cause</span>
          <select name="cause" required>
            ${["Education", "Food Access", "Climate", "Health", "Housing", "Digital Access"].map((value) => `<option>${value}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Minutes</span>
          <select name="minutes" required>
            ${[15, 30, 60, 90].map((value) => `<option value="${value}">${value}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="form-row">
        <label class="field">
          <span>Skills</span>
          <input name="skills" required placeholder="Writing, Design" />
        </label>
        <label class="field">
          <span>Deadline</span>
          <input name="deadline" required type="date" value="${getFutureDate(7)}" min="${getFutureDate(0)}" />
        </label>
      </div>
      <div class="form-row">
        <label class="field">
          <span>Format</span>
          <select name="locationType" required>
            <option>Remote</option>
            <option>In-person</option>
          </select>
        </label>
        <label class="field">
          <span>Volunteers</span>
          <input name="volunteersNeeded" required type="number" min="1" max="20" value="1" />
        </label>
      </div>
      <div class="form-row">
        <label class="field">
          <span>Approval</span>
          <select name="approvalRequired">
            <option value="">Auto sign-up</option>
            <option value="true">Require nonprofit approval</option>
          </select>
        </label>
        <label class="field">
          <span>Application cap</span>
          <input name="applicationLimit" required type="number" min="1" max="100" value="3" />
        </label>
      </div>
      <label class="field">
        <span>Location</span>
        <input name="location" placeholder="Online, phone, or local address" />
      </label>
      <label class="field">
        <span>Impact statement</span>
        <input name="impact" required maxlength="150" placeholder="Help 80 families understand food support options." />
      </label>
      <label class="field">
        <span>Instructions</span>
        <textarea name="instructions" required rows="4" placeholder="Links, review steps, delivery instructions, and completion criteria."></textarea>
      </label>
      <button class="primary-action" type="submit"><svg><use href="#icon-plus"></use></svg>Publish task</button>
    </form>
  `;
}

function renderReports(payload, els) {
  const statusEntries = Object.entries(payload.reports.byStatus || {});
  const causeEntries = Object.entries(payload.reports.byCause || {});
  setPageChrome(els, {
    title: "Reports",
    subtitle: "Operational view of volunteer activity and impact.",
    metrics: [
      [payload.reports.uniqueVolunteers, "volunteers"],
      [payload.reports.confirmedMinutes, "minutes"],
      [payload.stats.openSlots, "open slots"]
    ]
  });

  els.mainContent.innerHTML = `
    <div class="org-grid">
      <section class="panel">
        <h3>Signup status</h3>
        <div class="stack small">
          ${statusEntries.length ? statusEntries.map(([status, count]) => `<div class="list-row"><strong>${statusLabel(status)}</strong><p>${count} records</p></div>`).join("") : `<div class="empty-state">No signups yet.</div>`}
        </div>
      </section>
      <section class="panel">
        <h3>Tasks by cause</h3>
        <div class="stack small">
          ${causeEntries.length ? causeEntries.map(([cause, count]) => `<div class="list-row"><strong>${escapeHtml(cause)}</strong><p>${count} tasks</p></div>`).join("") : `<div class="empty-state">No task data yet.</div>`}
        </div>
      </section>
    </div>
    <div class="divider"></div>
    <section class="panel">
      <h3>Export preview</h3>
      <div class="data-list">
        ${payload.signups.map((signup) => `<div class="list-row"><strong>${escapeHtml(signup.volunteer.name)}</strong><p>${escapeHtml(signup.task.title)} - ${statusLabel(signup.status)} - ${signup.actualMinutes || signup.task.minutes} min</p></div>`).join("") || `<div class="empty-state">No records to export.</div>`}
      </div>
    </section>
  `;
}

function renderConfirmations(payload, els) {
  const pending = payload.signups.filter((signup) => signup.status === "pending_confirmation");
  setPageChrome(els, {
    title: "Confirm work",
    subtitle: "Approve volunteer submissions and release impact credit.",
    metrics: [[pending.length, "waiting"]]
  });

  els.mainContent.innerHTML = `
    <div class="data-list">
      ${pending.length ? pending.map(renderConfirmationRow).join("") : `<div class="empty-state">No work is awaiting confirmation.</div>`}
    </div>
  `;
}

function renderConfirmationRow(signup) {
  return `
    <article class="list-row">
      <header>
        <div>
          <h3>${escapeHtml(signup.task.title)}</h3>
          <p>${escapeHtml(signup.volunteer.name)} submitted this for confirmation.</p>
        </div>
        <span class="status ${statusClass(signup.status)}">${statusLabel(signup.status)}</span>
      </header>
      <p>${escapeHtml(signup.task.impact)}</p>
      <div class="meta-row">
        <span class="chip">${formatDate(signup.task.deadline)}</span>
        <span class="chip">${signup.task.minutes} min</span>
      </div>
      <div class="row-actions">
        <button class="primary-action" data-action="confirm" data-signup-id="${signup.id}" type="button"><svg><use href="#icon-check"></use></svg>Confirm</button>
      </div>
    </article>
  `;
}

function renderOrganization(payload, els) {
  const org = payload.organizations[0];
  setPageChrome(els, {
    title: "Organization",
    subtitle: "Keep nonprofit details current.",
    metrics: [
      [payload.organizations.length, "workspaces"],
      [org?.verified ? "Yes" : "No", "verified"]
    ]
  });

  if (!org) {
    els.mainContent.innerHTML = `<div class="empty-state">No organization is linked to this account.</div>`;
    return;
  }

  els.mainContent.innerHTML = `
    <form class="post-form" data-form="organization-profile" data-org-id="${escapeAttr(org.id)}">
      <label class="field">
        <span>Organization</span>
        <input name="name" required value="${escapeAttr(org.name)}" />
      </label>
      <label class="field">
        <span>Mission</span>
        <textarea name="mission" rows="4">${escapeHtml(org.mission || "")}</textarea>
      </label>
      <div class="form-row">
        <label class="field">
          <span>Website</span>
          <input name="website" value="${escapeAttr(org.website || "")}" />
        </label>
        <label class="field">
          <span>Location</span>
          <input name="location" value="${escapeAttr(org.location || "")}" />
        </label>
      </div>
      <button class="primary-action" type="submit">Save organization</button>
    </form>
  `;
}

function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getVolunteerRecords(payload) {
  const map = new Map();
  payload.signups.forEach((signup) => {
    if (!map.has(signup.volunteer.id)) {
      map.set(signup.volunteer.id, {
        volunteer: signup.volunteer,
        profile: signup.profile,
        signups: []
      });
    }
    map.get(signup.volunteer.id).signups.push(signup);
  });
  return [...map.values()];
}

function getInitials(name) {
  return String(name || "MM")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
