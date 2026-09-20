export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

export function renderStat(value, label) {
  return `<div class="stat"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`;
}

export function getInitials(name) {
  return String(name || "MM")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatHours(minutes) {
  const hours = Number(minutes || 0) / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export function statusLabel(status) {
  return {
    applied: "Applied",
    scheduled: "Scheduled",
    pending_confirmation: "Awaiting confirmation",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    declined: "Declined"
  }[status] || status;
}

export function statusClass(status) {
  if (status === "confirmed") return "confirmed";
  if (status === "pending_confirmation") return "pending";
  if (status === "applied") return "pending";
  if (status === "cancelled" || status === "declined") return "closed";
  return "";
}

export function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function getCalendarUrl(task) {
  const start = new Date(`${task.deadline}T09:00:00`);
  const end = new Date(start.getTime() + task.minutes * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `MicroMatch: ${task.title}`,
    details: `${task.instructions}\n\nImpact: ${task.impact}`,
    location: task.location,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatCalendarDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function renderNotifications(notifications) {
  return notifications.length
    ? notifications
        .map(
          (note) => `
          <div class="notification">
            <strong>${escapeHtml(note.title)}</strong>
            <p>${escapeHtml(note.message)}</p>
            <span>${formatDateTime(note.createdAt)}</span>
          </div>
        `
        )
        .join("")
    : `<div class="empty-state">No notifications yet.</div>`;
}

export function setPageChrome(els, { title, subtitle, metrics = [] }) {
  els.pageKicker.textContent = "Workspace";
  els.pageTitle.textContent = title;
  els.pageSubtitle.textContent = subtitle;
  els.metricStrip.innerHTML = metrics.map(([value, label]) => renderStat(value, label)).join("");
}
