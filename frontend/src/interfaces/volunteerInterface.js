import {
  escapeAttr,
  escapeHtml,
  formToObject,
  formatDate,
  formatHours,
  getCalendarUrl,
  getInitials,
  renderNotifications,
  renderStat,
  setPageChrome,
  statusClass,
  statusLabel,
  uniqueValues
} from "../ui.js";

export const volunteerNav = [
  ["discover", "Discover"],
  ["saved", "Saved"],
  ["myTasks", "My tasks"],
  ["impact", "Impact"],
  ["profile", "Profile"]
];

export const defaultVolunteerPage = "discover";

const filters = {
  search: "",
  skill: "all",
  cause: "all",
  time: "all",
  format: "all",
  sort: "match"
};

export function renderVolunteerShell(payload, els) {
  const profile = payload.profile;
  const stats = payload.stats;

  els.profilePanel.innerHTML = `
    <div class="profile-name">
      <span class="avatar">${getInitials(payload.user.name)}</span>
      <div>
        <h3>${escapeHtml(payload.user.name)}</h3>
        <p>${profile.skills.slice(0, 3).map(escapeHtml).join(", ") || "Volunteer"}</p>
      </div>
    </div>
    <div class="divider"></div>
    <div class="org-grid">
      ${renderStat(stats.completedCount, "complete")}
      ${renderStat(formatHours(stats.minutes), "hours")}
    </div>
  `;

  els.sidebarPanel.innerHTML = `
    <h3>Preferences</h3>
    <div class="chip-row">
      ${profile.causes.map((cause) => `<span class="chip cause">${escapeHtml(cause)}</span>`).join("")}
      ${profile.skills.map((skill) => `<span class="chip skill">${escapeHtml(skill)}</span>`).join("")}
    </div>
  `;

  els.notificationList.innerHTML = renderNotifications(payload.notifications);
  renderUpcoming(payload, els.upcomingPanel);
}

export function renderVolunteerPage(page, payload, els) {
  if (page === "discover") renderDiscover(payload, els);
  if (page === "saved") renderSaved(payload, els);
  if (page === "myTasks") renderMyTasks(payload, els);
  if (page === "impact") renderImpact(payload, els);
  if (page === "profile") renderProfile(payload, els);
}

export async function handleVolunteerClick(event, context) {
  const action = event.target.closest("[data-action]");
  if (!action) return false;

  if (action.dataset.action === "signup") {
    context.setPayload(await context.api.volunteerSignUp(action.dataset.taskId));
    context.showToast("Task request submitted.");
    return true;
  }

  if (action.dataset.action === "save") {
    context.setPayload(await context.api.saveTask(action.dataset.taskId));
    context.showToast("Task saved.");
    return true;
  }

  if (action.dataset.action === "unsave") {
    context.setPayload(await context.api.unsaveTask(action.dataset.taskId));
    context.showToast("Task removed from saved.");
    return true;
  }

  if (action.dataset.action === "cancel") {
    context.setPayload(await context.api.volunteerCancel(action.dataset.signupId));
    context.showToast("Task cancelled.");
    return true;
  }

  if (action.dataset.action === "complete") {
    const noteInput = document.querySelector(`[data-completion-note="${action.dataset.signupId}"]`);
    const minutesInput = document.querySelector(`[data-completion-minutes="${action.dataset.signupId}"]`);
    context.setPayload(
      await context.api.volunteerComplete(action.dataset.signupId, {
        completionNote: noteInput?.value || "",
        actualMinutes: minutesInput?.value || ""
      })
    );
    context.showToast("Completion submitted.");
    return true;
  }

  return false;
}

function renderSaved(payload, els) {
  const tasks = payload.savedTasks || [];
  setPageChrome(els, {
    title: "Saved",
    subtitle: "Micro-tasks you want to revisit.",
    metrics: [[tasks.length, "saved"]]
  });

  els.mainContent.innerHTML = `
    <div class="task-list">
      ${tasks.length ? tasks.map((task) => renderTaskRow(task, payload)).join("") : `<div class="empty-state">Saved tasks will appear here.</div>`}
    </div>
  `;
}

export async function handleVolunteerSubmit(event, context) {
  const form = event.target.closest("[data-form='volunteer-profile']");
  if (!form) return false;
  event.preventDefault();
  context.setPayload(await context.api.updateVolunteerProfile(formToObject(form)));
  context.showToast("Profile saved.");
  return true;
}

export function handleVolunteerInput(event, context) {
  const target = event.target.closest("[data-filter]");
  if (!target) return false;
  filters[target.dataset.filter] = target.value;
  renderDiscover(context.payload, context.els);
  return true;
}

function renderDiscover(payload, els) {
  const tasks = getFilteredTasks(payload);
  setPageChrome(els, {
    title: "Discover",
    subtitle: "Tasks matched to your time, skills, and causes.",
    metrics: [
      [tasks.length, "matches"],
      [payload.stats.scheduledCount, "active"],
      [payload.stats.minutes, "minutes"]
    ]
  });

  els.mainContent.innerHTML = `
    ${renderFilterBar(payload)}
    <div class="task-list">
      ${tasks.length ? tasks.map((task) => renderTaskRow(task, payload)).join("") : `<div class="empty-state">No tasks match these filters.</div>`}
    </div>
  `;
}

function renderFilterBar(payload) {
  const skills = uniqueValues(payload.tasks.flatMap((task) => task.skills));
  const causes = uniqueValues(payload.tasks.map((task) => task.cause));

  return `
    <div class="filter-grid">
      <label class="filter-control">
        <span class="filter-label">Search</span>
        <input class="filter-input" data-filter="search" value="${escapeAttr(filters.search)}" placeholder="Search tasks" />
      </label>
      <label class="filter-control">
        <span class="filter-label">Skill</span>
        <select class="filter-input" data-filter="skill">
          <option value="all">All skills</option>
          ${skills.map((skill) => `<option value="${escapeAttr(skill)}" ${filters.skill === skill ? "selected" : ""}>${escapeHtml(skill)}</option>`).join("")}
        </select>
      </label>
      <label class="filter-control">
        <span class="filter-label">Cause</span>
        <select class="filter-input" data-filter="cause">
          <option value="all">All causes</option>
          ${causes.map((cause) => `<option value="${escapeAttr(cause)}" ${filters.cause === cause ? "selected" : ""}>${escapeHtml(cause)}</option>`).join("")}
        </select>
      </label>
      <label class="filter-control">
        <span class="filter-label">Time</span>
        <select class="filter-input" data-filter="time">
          <option value="all">Any length</option>
          ${[15, 30, 60, 90].map((time) => `<option value="${time}" ${filters.time === String(time) ? "selected" : ""}>Up to ${time}</option>`).join("")}
        </select>
      </label>
      <label class="filter-control">
        <span class="filter-label">Format</span>
        <select class="filter-input" data-filter="format">
          <option value="all">Any format</option>
          ${["Remote", "In-person"].map((format) => `<option value="${format}" ${filters.format === format ? "selected" : ""}>${format}</option>`).join("")}
        </select>
      </label>
      <label class="filter-control">
        <span class="filter-label">Sort</span>
        <select class="filter-input" data-filter="sort">
          <option value="match" ${filters.sort === "match" ? "selected" : ""}>Match</option>
          <option value="deadline" ${filters.sort === "deadline" ? "selected" : ""}>Deadline</option>
          <option value="minutes" ${filters.sort === "minutes" ? "selected" : ""}>Shortest</option>
        </select>
      </label>
    </div>
  `;
}

function renderTaskRow(task, payload) {
  const signup = payload.signups.find((item) => item.taskId === task.id);
  const remaining = task.volunteersNeeded - task.signupCount;
  const isClosed = task.status !== "open";
  const applicationFull = task.approvalRequired && task.applicationCount >= task.applicationLimit;
  const isFull = (remaining <= 0 || applicationFull || isClosed) && !signup;
  const requestLabel = task.approvalRequired ? "Apply" : "Sign up";
  const blockedLabel = isClosed ? "Closed" : applicationFull ? "Applications full" : "Full";
  let action = `<button class="primary-action" data-action="signup" data-task-id="${task.id}" ${isFull ? "disabled" : ""} type="button"><svg><use href="#icon-plus"></use></svg>${isFull ? blockedLabel : requestLabel}</button>`;
  const saveAction = task.isSaved
    ? `<button class="ghost-action" data-action="unsave" data-task-id="${task.id}" type="button">Unsave</button>`
    : `<button class="ghost-action" data-action="save" data-task-id="${task.id}" type="button">Save</button>`;

  if (signup) {
    action = `
      <span class="status ${statusClass(signup.status)}">${statusLabel(signup.status)}</span>
      <a class="ghost-action" href="${getCalendarUrl(task)}" target="_blank" rel="noreferrer"><svg><use href="#icon-calendar"></use></svg>Calendar</a>
    `;
  }

  return `
    <article class="task-row">
      <div>
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.organization?.name || "Nonprofit")} - ${escapeHtml(task.description)}</p>
        <div class="meta-row">
          <span class="chip"><svg><use href="#icon-clock"></use></svg>${task.minutes} min</span>
          <span class="chip"><svg><use href="#icon-calendar"></use></svg>${formatDate(task.deadline)}</span>
          <span class="chip">${escapeHtml(task.locationType)}</span>
          <span class="chip cause">${escapeHtml(task.cause)}</span>
          <span class="chip"><span class="score">${task.score}</span> match</span>
          ${isClosed ? `<span class="status closed">Closed</span>` : ""}
          ${task.approvalRequired ? `<span class="chip">Approval required</span>` : ""}
          ${task.approvalRequired ? `<span class="chip">${task.applicationCount}/${task.applicationLimit} applications</span>` : ""}
        </div>
        <div class="chip-row">
          ${task.skills.map((skill) => `<span class="chip skill">${escapeHtml(skill)}</span>`).join("")}
        </div>
        <p class="muted"><strong>Impact:</strong> ${escapeHtml(task.impact)}</p>
      </div>
      <div class="row-actions">${saveAction}${action}</div>
    </article>
  `;
}

function renderMyTasks(payload, els) {
  setPageChrome(els, {
    title: "My tasks",
    subtitle: "Track upcoming work and submit completion.",
    metrics: [
      [payload.signups.length, "signed up"],
      [payload.signups.filter((item) => item.status === "pending_confirmation").length, "pending"],
      [payload.signups.filter((item) => item.status === "confirmed").length, "confirmed"]
    ]
  });

  els.mainContent.innerHTML = `
    <div class="data-list">
      ${
        payload.signups.length
          ? payload.signups.map((signup) => renderMyTaskRow(signup)).join("")
          : `<div class="empty-state">Your signed-up tasks will appear here.</div>`
      }
    </div>
  `;
}

function renderMyTaskRow(signup) {
  const task = signup.task;
  const canComplete = signup.status === "scheduled";
  const canCancel = ["applied", "scheduled", "pending_confirmation"].includes(signup.status);
  return `
    <article class="list-row">
      <header>
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p>${escapeHtml(task.organization?.name || "Nonprofit")}</p>
        </div>
        <span class="status ${statusClass(signup.status)}">${statusLabel(signup.status)}</span>
      </header>
      <p>${escapeHtml(task.instructions)}</p>
      <p><strong>Next:</strong> ${escapeHtml(getVolunteerNextStep(signup.status))}</p>
      <div class="meta-row">
        <span class="chip">${task.minutes} min</span>
        <span class="chip">${formatDate(task.deadline)}</span>
      </div>
      ${
        canComplete
          ? `
          <div class="form-row">
            <label class="field">
              <span>Minutes completed</span>
              <input data-completion-minutes="${signup.id}" type="number" min="1" max="240" value="${signup.actualMinutes || task.minutes}" />
            </label>
            <label class="field">
              <span>Completion note</span>
              <input data-completion-note="${signup.id}" placeholder="What did you finish?" />
            </label>
          </div>
        `
          : signup.completionNote
            ? `<p><strong>Completion note:</strong> ${escapeHtml(signup.completionNote)}</p>`
            : ""
      }
      <div class="row-actions">
        <a class="ghost-action" href="${getCalendarUrl(task)}" target="_blank" rel="noreferrer"><svg><use href="#icon-calendar"></use></svg>Calendar</a>
        <button class="ghost-action" data-action="cancel" data-signup-id="${signup.id}" ${canCancel ? "" : "disabled"} type="button">Cancel</button>
        <button class="primary-action" data-action="complete" data-signup-id="${signup.id}" ${canComplete ? "" : "disabled"} type="button">
          <svg><use href="#icon-check"></use></svg>${canComplete ? "Mark complete" : statusLabel(signup.status)}
        </button>
      </div>
    </article>
  `;
}

function getVolunteerNextStep(status) {
  return {
    applied: "Wait for nonprofit approval.",
    scheduled: "Complete the task, then submit minutes and a note.",
    pending_confirmation: "Wait for nonprofit confirmation.",
    confirmed: "Impact has been counted.",
    cancelled: "No action needed.",
    declined: "No action needed."
  }[status] || "Review the task details.";
}

function renderImpact(payload, els) {
  setPageChrome(els, {
    title: "Impact",
    subtitle: "Your completed work and recognition.",
    metrics: [
      [payload.stats.completedCount, "complete"],
      [payload.stats.minutes, "minutes"],
      [payload.badges.filter((badge) => badge.earned).length, "badges"]
    ]
  });

  els.mainContent.innerHTML = `
    <div class="impact-grid">
      ${renderStat(payload.stats.completedCount, "completed tasks")}
      ${renderStat(payload.stats.minutes, "volunteer minutes")}
      ${renderStat(payload.stats.causes.length, "causes helped")}
      ${renderStat(formatHours(payload.stats.minutes), "hours")}
    </div>
    <div class="divider"></div>
    <div class="org-grid">
      <section class="panel">
        <h3>Impact notes</h3>
        <div class="chip-row">
          ${
            payload.stats.impacts.length
              ? payload.stats.impacts.map((impact) => `<span class="chip cause">${escapeHtml(impact)}</span>`).join("")
              : `<span class="chip">Complete a task to unlock impact notes</span>`
          }
        </div>
      </section>
      <section class="panel">
        <h3>Recognition</h3>
        <div class="stack small">
          ${payload.badges
            .map(
              (badge) => `
              <div class="list-row">
                <strong>${escapeHtml(badge.label)}</strong>
                <p>${escapeHtml(badge.description)} ${badge.earned ? "- earned" : "- locked"}</p>
              </div>
            `
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function renderProfile(payload, els) {
  const profile = payload.profile;
  const maxMinutes = Math.max(...profile.preferredMinutes);
  setPageChrome(els, {
    title: "Profile",
    subtitle: "Tune matching preferences.",
    metrics: [
      [profile.skills.length, "skills"],
      [profile.causes.length, "causes"]
    ]
  });

  els.mainContent.innerHTML = `
    <form class="post-form" data-form="volunteer-profile">
      <label class="field">
        <span>Name</span>
        <input name="name" required value="${escapeAttr(payload.user.name)}" />
      </label>
      <label class="field">
        <span>Skills</span>
        <input name="skills" value="${escapeAttr(profile.skills.join(", "))}" />
      </label>
      <label class="field">
        <span>Causes</span>
        <input name="causes" value="${escapeAttr(profile.causes.join(", "))}" />
      </label>
      <label class="field">
        <span>Availability</span>
        <input name="availability" value="${escapeAttr((profile.availability || []).join(", "))}" placeholder="Weeknights, Weekends" />
      </label>
      <label class="field">
        <span>Qualifications</span>
        <input name="qualifications" value="${escapeAttr((profile.qualifications || []).join(", "))}" placeholder="Spanish, background check, CPR" />
      </label>
      <div class="form-row">
        <label class="field">
          <span>Phone</span>
          <input name="phone" value="${escapeAttr(profile.phone || "")}" placeholder="Optional" />
        </label>
        <label class="field">
          <span>Task length</span>
          <select name="preferredMinutes">
            ${[30, 60, 90].map((value) => `<option value="${value}" ${maxMinutes === value ? "selected" : ""}>Up to ${value} minutes</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="form-row">
        <label class="field">
          <span>Format</span>
          <select name="format">
            ${["Remote", "In-person", "Either"].map((value) => `<option ${profile.format === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </label>
        <span></span>
      </div>
      <button class="primary-action" type="submit">Save profile</button>
    </form>
  `;
}

function renderUpcoming(payload, container) {
  const upcoming = payload.signups.filter((signup) => !["confirmed", "cancelled", "declined"].includes(signup.status)).slice(0, 4);
  container.innerHTML = `
    <div class="panel-heading"><svg><use href="#icon-calendar"></use></svg><h3>Upcoming</h3></div>
    <div class="stack small">
      ${
        upcoming.length
          ? upcoming.map((signup) => `<div class="list-row"><strong>${escapeHtml(signup.task.title)}</strong><p>${formatDate(signup.task.deadline)} - ${signup.task.minutes} min</p></div>`).join("")
          : `<div class="empty-state">No scheduled tasks.</div>`
      }
    </div>
  `;
}

function getFilteredTasks(payload) {
  const search = filters.search.trim().toLowerCase();
  const tasks = payload.tasks.filter((task) => {
    const haystack = [task.title, task.description, task.cause, task.organization?.name, ...task.skills].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesSkill = filters.skill === "all" || task.skills.includes(filters.skill);
    const matchesCause = filters.cause === "all" || task.cause === filters.cause;
    const matchesTime = filters.time === "all" || task.minutes <= Number(filters.time);
    const matchesFormat = filters.format === "all" || task.locationType === filters.format;
    return matchesSearch && matchesSkill && matchesCause && matchesTime && matchesFormat;
  });

  if (filters.sort === "deadline") {
    tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  } else if (filters.sort === "minutes") {
    tasks.sort((a, b) => a.minutes - b.minutes);
  } else {
    tasks.sort((a, b) => b.score - a.score || new Date(a.deadline) - new Date(b.deadline));
  }

  return tasks;
}
