// Scam Reports: create, read, update, and delete recruiter reports.

// =============================================================================
// Constants & seed data
// =============================================================================

var STORAGE_KEY = "joblens_reports";

var SCAM_TYPES = [
  "Fake check",
  "Equipment purchase",
  "Upfront fee",
  "Chat-only interview",
  "Identity theft",
  "Fake staffing agency"
];

var STATUSES = ["Pending", "Approved", "Rejected"];

var COMPANIES = [
  "Amazon",
  "Microsoft",
  "Google",
  "Deloitte",
  "JPMorgan Chase",
  "Raymond James",
  "Moffitt Cancer Center",
  "Publix",
  "Other"
];

// SAMPLE DATA. Ten reports spread across Aug–Oct 2026.
function buildSeed() {
  return [
    {
      id: "RPT-1001",
      recruiterEmail: "hr@amaz0n-careers.net",
      domain: "amaz0n-careers.net",
      company: "Amazon",
      scamType: "Equipment purchase",
      description: "The recruiter told me to buy a laptop from their vendor before my start date and promised reimbursement on my first paycheck.",
      reportedBy: "Student",
      dateReported: "2026-08-04",
      status: "Approved"
    },
    {
      id: "RPT-1002",
      recruiterEmail: "careers@amaz0n-careers.net",
      domain: "amaz0n-careers.net",
      company: "Amazon",
      scamType: "Fake check",
      description: "They mailed a check for supplies and told me to deposit it, then wire the extra to their shipping partner.",
      reportedBy: "Student",
      dateReported: "2026-09-18",
      status: "Pending"
    },
    {
      id: "RPT-1003",
      recruiterEmail: "talent@rnicrosoft-hiring.com",
      domain: "rnicrosoft-hiring.com",
      company: "Microsoft",
      scamType: "Chat-only interview",
      description: "The whole interview happened in a chat app. They never used a Microsoft domain and pressed me to share my ID.",
      reportedBy: "Career Center",
      dateReported: "2026-08-21",
      status: "Approved"
    },
    {
      id: "RPT-1004",
      recruiterEmail: "hr@deloitte-recruitment-hr.com",
      domain: "deloitte-recruitment-hr.com",
      company: "Deloitte",
      scamType: "Upfront fee",
      description: "They said I was hired but had to pay a training fee by gift card before I could receive the offer letter.",
      reportedBy: "Student",
      dateReported: "2026-10-02",
      status: "Pending"
    },
    {
      id: "RPT-1005",
      recruiterEmail: "jobs@google-careers-team.net",
      domain: "google-careers-team.net",
      company: "Google",
      scamType: "Identity theft",
      description: "The form asked for my Social Security number and a photo of my passport before any real interview was scheduled.",
      reportedBy: "Student",
      dateReported: "2026-09-03",
      status: "Approved"
    },
    {
      id: "RPT-1006",
      recruiterEmail: "recruiter.mike@gmail.com",
      domain: "gmail.com",
      company: "JPMorgan Chase",
      scamType: "Fake staffing agency",
      description: "A Gmail account claimed to be a staffing firm hiring for JPMorgan and asked for my bank login to set up payroll.",
      reportedBy: "Student",
      dateReported: "2026-08-28",
      status: "Rejected"
    },
    {
      id: "RPT-1007",
      recruiterEmail: "hiring.team@outlook.com",
      domain: "outlook.com",
      company: "Publix",
      scamType: "Equipment purchase",
      description: "A career center staff member logged a report that a supposed Publix recruiter required new hires to purchase a cash-register kit.",
      reportedBy: "Career Center",
      dateReported: "2026-10-12",
      status: "Approved"
    },
    {
      id: "RPT-1008",
      recruiterEmail: "campus.jobs@gmail.com",
      domain: "gmail.com",
      company: "Raymond James",
      scamType: "Fake check",
      description: "The email offered a paid internship and sent a check I was told to use to buy office equipment from a named seller.",
      reportedBy: "Student",
      dateReported: "2026-10-20",
      status: "Pending"
    },
    {
      id: "RPT-1009",
      recruiterEmail: "offers@moffitt-careers.net",
      domain: "moffitt-careers.net",
      company: "Moffitt Cancer Center",
      scamType: "Upfront fee",
      description: "The sender asked for a refundable onboarding deposit to hold a research internship that used the Moffitt name.",
      reportedBy: "Career Center",
      dateReported: "2026-09-27",
      status: "Approved"
    },
    {
      id: "RPT-1010",
      recruiterEmail: "internship.help@outlook.com",
      domain: "outlook.com",
      company: "Other",
      scamType: "Identity theft",
      description: "An Outlook address asked for my driver's license and bank details for a background check, and the company name did not match.",
      reportedBy: "Student",
      dateReported: "2026-08-11",
      status: "Rejected"
    }
  ];
}

// =============================================================================
// Storage (load / save / reset)
// =============================================================================

var reports = [];
var storageOk = true;
var openMenu = null;
var openMenuButton = null;

function loadReports() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      reports = buildSeed();
      saveReports();
      return;
    }
    var parsed = JSON.parse(raw);
    if (!isReportList(parsed)) {
      reports = buildSeed();
      saveReports();
      return;
    }
    reports = parsed;
  } catch (error) {
    storageOk = false;
    reports = buildSeed();
  }
}

function saveReports() {
  if (!storageOk) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    storageOk = false;
    showMessage("Browser storage is unavailable. Changes will last until you refresh.", "error");
  }
}

function resetReports() {
  reports = buildSeed();
  saveReports();
  highlightId = null;
  setFormMode("create");
  showMessage("Sample data restored.", "success");
  renderReports();
}

function isReportList(value) {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(function (item) {
    return item && typeof item.id === "string" && typeof item.recruiterEmail === "string";
  });
}

// =============================================================================
// Helpers
// =============================================================================

var editingId = null;
var sortKey = "date";
var sortDir = "desc";
var searchQuery = "";
var statusFilter = "All";
var typeFilter = "All";
var highlightId = null;
var messageTimer = null;
var activeModal = null;
var modalTrigger = null;
var pendingDeleteId = null;

function extractDomain(email) {
  var parts = String(email || "").trim().toLowerCase().split("@");
  if (parts.length < 2) {
    return "";
  }
  return parts[parts.length - 1].trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// Use textContent when rendering. This helper is for any string placed in HTML.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso) {
  var parts = String(iso || "").split("-");
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (parts.length !== 3) {
    return String(iso || "");
  }
  var month = months[parseInt(parts[1], 10) - 1];
  if (!month) {
    return String(iso);
  }
  return month + " " + parseInt(parts[2], 10) + ", " + parts[0];
}

function nextId() {
  var max = 1000;
  reports.forEach(function (report) {
    var num = idNumber(report.id);
    if (num > max) {
      max = num;
    }
  });
  return "RPT-" + (max + 1);
}

function idNumber(id) {
  var match = String(id || "").match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function todayISO() {
  var now = new Date();
  var month = String(now.getMonth() + 1);
  var day = String(now.getDate());
  if (month.length < 2) {
    month = "0" + month;
  }
  if (day.length < 2) {
    day = "0" + day;
  }
  return now.getFullYear() + "-" + month + "-" + day;
}

function findReport(id) {
  for (var i = 0; i < reports.length; i += 1) {
    if (reports[i].id === id) {
      return reports[i];
    }
  }
  return null;
}

function findDuplicate(email, scamType, ignoreId) {
  var wantedEmail = String(email || "").trim().toLowerCase();
  var wantedType = String(scamType || "").trim().toLowerCase();
  for (var i = 0; i < reports.length; i += 1) {
    var report = reports[i];
    if (ignoreId && report.id === ignoreId) {
      continue;
    }
    if (report.recruiterEmail.toLowerCase() === wantedEmail && report.scamType.toLowerCase() === wantedType) {
      return report;
    }
  }
  return null;
}

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined && text !== null) {
    node.textContent = String(text);
  }
  return node;
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToForm() {
  var form = document.getElementById("report-form");
  if (!form) {
    return;
  }
  form.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start"
  });
}

// =============================================================================
// Create
// =============================================================================

function createReport(input) {
  var report = {
    id: nextId(),
    recruiterEmail: input.recruiterEmail.trim(),
    domain: extractDomain(input.recruiterEmail),
    company: input.company.trim(),
    scamType: input.scamType.trim(),
    description: input.description.trim(),
    reportedBy: input.reportedBy,
    dateReported: todayISO(),
    status: "Pending"
  };
  reports.push(report);
  saveReports();
  return report;
}

// =============================================================================
// Read (render table, filter, search, sort, KPIs)
// =============================================================================

function visibleReports() {
  var query = searchQuery.toLowerCase();
  var list = reports.filter(function (report) {
    if (statusFilter !== "All" && report.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== "All" && report.scamType !== typeFilter) {
      return false;
    }
    if (!query) {
      return true;
    }
    var haystack = [
      report.recruiterEmail,
      report.domain,
      report.company,
      report.description
    ].join(" ").toLowerCase();
    return haystack.indexOf(query) !== -1;
  });

  list.sort(function (a, b) {
    var result = 0;
    if (sortKey === "id") {
      result = idNumber(a.id) - idNumber(b.id);
    } else if (sortKey === "company") {
      result = a.company.localeCompare(b.company);
    } else {
      result = a.dateReported < b.dateReported ? -1 : a.dateReported > b.dateReported ? 1 : 0;
    }
    if (result === 0) {
      return idNumber(a.id) - idNumber(b.id);
    }
    return sortDir === "asc" ? result : -result;
  });

  return list;
}

function renderKpis() {
  var counts = { Pending: 0, Approved: 0, Rejected: 0 };
  reports.forEach(function (report) {
    if (counts[report.status] !== undefined) {
      counts[report.status] += 1;
    }
  });
  document.getElementById("kpi-total").textContent = String(reports.length);
  document.getElementById("kpi-pending").textContent = String(counts.Pending);
  document.getElementById("kpi-approved").textContent = String(counts.Approved);
  document.getElementById("kpi-rejected").textContent = String(counts.Rejected);
}

function renderReports() {
  closeRowMenu();
  var tbody = document.getElementById("report-rows");
  var visible = visibleReports();
  tbody.textContent = "";

  document.getElementById("report-count").textContent = "Showing " + visible.length + " of " + reports.length + " reports";
  updateSortMarks();
  renderKpis();

  if (!visible.length) {
    var emptyRow = document.createElement("tr");
    var cell = document.createElement("td");
    cell.colSpan = 7;
    var empty = el("div", "empty-state");
    empty.appendChild(el("p", "", "No reports match your search."));
    var clearBtn = el("button", "btn btn-secondary btn-sm", "Clear filters");
    clearBtn.type = "button";
    clearBtn.setAttribute("data-action", "clear-filters");
    empty.appendChild(clearBtn);
    cell.appendChild(empty);
    emptyRow.appendChild(cell);
    tbody.appendChild(emptyRow);
    return;
  }

  visible.forEach(function (report) {
    var row = document.createElement("tr");
    row.id = "row-" + report.id;
    if (report.id === highlightId) {
      row.className = "row-highlight";
    }

    row.appendChild(el("td", "col-nowrap", report.id));

    var emailCell = el("td", "email-cell");
    var stack = el("div", "email-stack");
    var emailLine = el("span", "email-line", report.recruiterEmail);
    emailLine.title = report.recruiterEmail;
    var domainLine = el("span", "email-domain", report.domain);
    domainLine.title = report.domain;
    stack.appendChild(emailLine);
    stack.appendChild(domainLine);
    emailCell.appendChild(stack);
    row.appendChild(emailCell);

    row.appendChild(el("td", "", report.company));
    row.appendChild(el("td", "scam-type", report.scamType));
    row.appendChild(el("td", "col-nowrap", formatDate(report.dateReported)));

    var statusCell = el("td", "col-nowrap status-cell");
    var badge = el("span", statusBadgeClass(report.status), report.status);
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    var actions = el("td", "actions col-nowrap");
    actions.appendChild(actionButton("View", "view", report.id, "btn btn-secondary btn-sm"));
    actions.appendChild(actionButton("Edit", "edit", report.id, "btn btn-secondary btn-sm"));
    actions.appendChild(moreButton(report));
    row.appendChild(actions);

    tbody.appendChild(row);
  });
}

function statusBadgeClass(status) {
  if (status === "Approved") {
    return "badge badge-approved";
  }
  if (status === "Rejected") {
    return "badge badge-rejected";
  }
  return "badge badge-pending";
}

function actionButton(label, action, id, className) {
  var button = el("button", className, label);
  button.type = "button";
  button.setAttribute("data-action", action);
  button.setAttribute("data-id", id);
  return button;
}

function moreButton(report) {
  var button = el("button", "btn btn-secondary row-more", "⋯");
  button.type = "button";
  button.setAttribute("data-action", "more");
  button.setAttribute("data-id", report.id);
  button.setAttribute("aria-label", "More actions for " + report.id);
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  return button;
}

function menuItem(label, action, id, className) {
  var button = el("button", "row-menu-item " + className, label);
  button.type = "button";
  button.setAttribute("role", "menuitem");
  button.setAttribute("data-action", action);
  button.setAttribute("data-id", id);
  return button;
}

function closeRowMenu() {
  if (openMenuButton) {
    openMenuButton.setAttribute("aria-expanded", "false");
  }
  if (openMenu && openMenu.parentNode) {
    openMenu.parentNode.removeChild(openMenu);
  }
  openMenu = null;
  openMenuButton = null;
}

function placeRowMenu(button, menu) {
  var rect = button.getBoundingClientRect();
  var height = menu.offsetHeight;
  var width = menu.offsetWidth;
  var gap = 6;
  var top = rect.bottom + gap;
  if (top + height > window.innerHeight - 8 && rect.top - gap - height >= 8) {
    top = rect.top - gap - height;
  }
  var left = rect.right - width;
  if (left < 8) {
    left = 8;
  }
  if (left + width > window.innerWidth - 8) {
    left = window.innerWidth - 8 - width;
  }
  menu.style.top = Math.round(top) + "px";
  menu.style.left = Math.round(left) + "px";
}

function openRowMenu(button, report) {
  closeRowMenu();
  var menu = document.createElement("div");
  menu.id = "row-action-menu";
  menu.className = "row-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Actions for " + report.id);
  if (report.status === "Pending") {
    menu.appendChild(menuItem("Approve", "approve", report.id, "is-approve"));
    menu.appendChild(menuItem("Reject", "reject", report.id, "is-reject"));
    menu.appendChild(el("div", "row-menu-divider"));
  }
  menu.appendChild(menuItem("Delete", "delete", report.id, "is-delete"));
  menu.style.visibility = "hidden";
  document.body.appendChild(menu);
  placeRowMenu(button, menu);
  menu.style.visibility = "visible";
  button.setAttribute("aria-expanded", "true");
  button.setAttribute("aria-controls", menu.id);
  openMenu = menu;
  openMenuButton = button;
  var first = menu.querySelector("[role='menuitem']");
  if (first) {
    first.focus({ preventScroll: true });
  }
  menu.addEventListener("click", function (event) {
    var item = event.target.closest("[data-action]");
    if (!item) {
      return;
    }
    var action = item.getAttribute("data-action");
    var id = item.getAttribute("data-id");
    var trigger = openMenuButton;
    closeRowMenu();
    if (action === "approve") {
      approveReport(id);
    } else if (action === "reject") {
      rejectReport(id);
    } else if (action === "delete") {
      openDelete(id, trigger);
    }
  });
  menu.addEventListener("keydown", function (event) {
    var items = Array.prototype.slice.call(menu.querySelectorAll("[role='menuitem']"));
    var index = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length].focus({ preventScroll: true });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length].focus({ preventScroll: true });
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      var trigger = openMenuButton;
      closeRowMenu();
      if (trigger) {
        trigger.focus();
      }
    }
  });
}

function toggleRowMenu(button) {
  if (openMenuButton === button) {
    closeRowMenu();
    return;
  }
  var report = findReport(button.getAttribute("data-id"));
  if (!report) {
    return;
  }
  openRowMenu(button, report);
}

function updateSortMarks() {
  var marks = document.querySelectorAll("[data-mark]");
  marks.forEach(function (mark) {
    var key = mark.getAttribute("data-mark");
    mark.textContent = key === sortKey ? (sortDir === "asc" ? " ▲" : " ▼") : "";
  });
  document.querySelectorAll("[data-sort]").forEach(function (button) {
    var key = button.getAttribute("data-sort");
    var header = button.closest("th");
    if (!header) {
      return;
    }
    if (key === sortKey) {
      header.setAttribute("aria-sort", sortDir === "asc" ? "ascending" : "descending");
    } else {
      header.setAttribute("aria-sort", "none");
    }
  });
}

function toggleSort(key) {
  if (sortKey === key) {
    sortDir = sortDir === "asc" ? "desc" : "asc";
  } else {
    sortKey = key;
    sortDir = key === "date" ? "desc" : "asc";
  }
  renderReports();
}

function clearFilters() {
  searchQuery = "";
  statusFilter = "All";
  typeFilter = "All";
  document.getElementById("report-search").value = "";
  document.getElementById("filter-status").value = "All";
  document.getElementById("filter-type").value = "All";
  renderReports();
}

function flashRow(id) {
  highlightId = id;
  window.setTimeout(function () {
    var row = document.getElementById("row-" + id);
    if (row) {
      row.classList.remove("row-highlight");
    }
    if (highlightId === id) {
      highlightId = null;
    }
  }, 2000);
}

// =============================================================================
// Update (edit, approve, reject)
// =============================================================================

function updateReport(id, changes) {
  var report = findReport(id);
  if (!report) {
    return null;
  }
  Object.keys(changes).forEach(function (key) {
    report[key] = changes[key];
  });
  if (Object.prototype.hasOwnProperty.call(changes, "recruiterEmail")) {
    report.domain = extractDomain(changes.recruiterEmail);
    report.recruiterEmail = String(changes.recruiterEmail).trim();
  }
  if (typeof report.description === "string") {
    report.description = report.description.trim();
  }
  saveReports();
  return report;
}

function startEdit(id) {
  var report = findReport(id);
  if (!report) {
    return;
  }
  setFormMode("edit", report);
  scrollToForm();
  document.getElementById("report-email").focus();
}

function approveReport(id) {
  var report = findReport(id);
  if (!report || report.status !== "Pending") {
    return;
  }
  updateReport(id, { status: "Approved" });
  showMessage("Report " + id + " approved.", "success");
  flashRow(id);
  renderReports();
}

function rejectReport(id) {
  var report = findReport(id);
  if (!report || report.status !== "Pending") {
    return;
  }
  updateReport(id, { status: "Rejected" });
  showMessage("Report " + id + " rejected.", "success");
  flashRow(id);
  renderReports();
}

// =============================================================================
// Delete
// =============================================================================

function deleteReport(id) {
  var existed = findReport(id);
  if (!existed) {
    return;
  }
  reports = reports.filter(function (report) {
    return report.id !== id;
  });
  saveReports();
  if (editingId === id) {
    setFormMode("create");
  }
  showMessage("Report " + id + " deleted.", "success");
  renderReports();
}

// =============================================================================
// Modals
// =============================================================================

function openModal(modalId, trigger) {
  closeModal(true);
  modalTrigger = trigger || document.activeElement;
  activeModal = modalId;
  document.getElementById("modal-backdrop").classList.add("is-open");
  var modal = document.getElementById(modalId);
  modal.classList.add("is-open");
  window.setTimeout(function () {
    var focusEl = modal.querySelector("[data-autofocus]") || modal.querySelector("button");
    if (focusEl) {
      focusEl.focus();
    }
  }, 0);
}

function closeModal(skipFocus) {
  var trigger = modalTrigger;
  document.getElementById("modal-backdrop").classList.remove("is-open");
  document.querySelectorAll(".modal.is-open").forEach(function (modal) {
    modal.classList.remove("is-open");
  });
  activeModal = null;
  modalTrigger = null;
  pendingDeleteId = null;
  if (skipFocus) {
    return;
  }
  if (trigger && document.contains(trigger)) {
    trigger.focus();
  }
}

function openView(id, trigger) {
  var report = findReport(id);
  if (!report) {
    return;
  }
  document.getElementById("view-title").textContent = "Report " + report.id;
  var list = document.getElementById("view-details");
  list.textContent = "";
  [
    ["ID", report.id],
    ["Recruiter email", report.recruiterEmail],
    ["Domain", report.domain],
    ["Company", report.company],
    ["Scam type", report.scamType],
    ["Description", report.description],
    ["Reported by", report.reportedBy],
    ["Date reported", formatDate(report.dateReported)]
  ].forEach(function (pair) {
    list.appendChild(el("dt", "", pair[0]));
    list.appendChild(el("dd", "", pair[1]));
  });
  list.appendChild(el("dt", "", "Status"));
  var statusValue = document.createElement("dd");
  statusValue.appendChild(el("span", statusBadgeClass(report.status), report.status));
  list.appendChild(statusValue);
  openModal("view-modal", trigger);
}

function openDelete(id, trigger) {
  var report = findReport(id);
  if (!report) {
    return;
  }
  document.getElementById("delete-text").textContent = "Delete report " + id + "? This cannot be undone.";
  openModal("delete-modal", trigger);
  pendingDeleteId = id;
}

function onModalKeydown(event) {
  if (event.key === "Escape" && openMenu && !activeModal) {
    event.preventDefault();
    var trigger = openMenuButton;
    closeRowMenu();
    if (trigger) {
      trigger.focus();
    }
    return;
  }
  if (!activeModal) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key !== "Tab") {
    return;
  }
  var modal = document.getElementById(activeModal);
  var items = modal.querySelectorAll("button, [href], input, select, textarea");
  if (!items.length) {
    return;
  }
  var first = items[0];
  var last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// =============================================================================
// Form validation
// =============================================================================

function showMessage(text, type) {
  var host = document.getElementById("crud-message");
  if (!host) {
    return;
  }
  host.textContent = "";
  var kind = type === "error" ? "error" : type === "info" ? "info" : "success";
  host.appendChild(el("div", "alert alert-" + kind, text));
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(function () {
    host.textContent = "";
  }, 4000);
}

function setError(id, field, message) {
  var node = document.getElementById(id);
  if (!node) {
    return;
  }
  if (message) {
    node.hidden = false;
    node.textContent = message;
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", id);
    }
  } else {
    node.hidden = true;
    node.textContent = "";
    if (field) {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    }
  }
}

function clearErrors() {
  setError("email-error", document.getElementById("report-email"), "");
  setError("company-error", document.getElementById("report-company"), "");
  setError("type-error", document.getElementById("report-type"), "");
  setError("description-error", document.getElementById("report-description"), "");
}

function updateDomainPreview() {
  var preview = document.getElementById("domain-preview");
  var domain = extractDomain(document.getElementById("report-email").value);
  preview.textContent = "Domain: " + (domain || "—");
}

function updateCounter() {
  var field = document.getElementById("report-description");
  var counter = document.getElementById("char-counter");
  var length = field.value.length;
  counter.textContent = length + " / 500";
  counter.classList.toggle("is-over", length > 500);
}

function validateForm() {
  var emailField = document.getElementById("report-email");
  var companyField = document.getElementById("report-company");
  var typeField = document.getElementById("report-type");
  var descriptionField = document.getElementById("report-description");
  var email = emailField.value.trim();
  var company = companyField.value;
  var scamType = typeField.value;
  var descriptionText = descriptionField.value.trim();
  var ok = true;

  clearErrors();

  if (!isValidEmail(email)) {
    setError("email-error", emailField, "Enter a valid email address.");
    ok = false;
  } else if (scamType) {
    var duplicate = findDuplicate(email, scamType, editingId);
    if (duplicate) {
      setError("email-error", emailField, "This recruiter has already been reported for this scam type (" + duplicate.id + ").");
      ok = false;
    }
  }

  if (!company) {
    setError("company-error", companyField, "Select the company that was impersonated.");
    ok = false;
  }

  if (!scamType) {
    setError("type-error", typeField, "Select a scam type.");
    ok = false;
  }

  if (descriptionText.length < 20) {
    setError("description-error", descriptionField, "Please describe what happened (at least 20 characters).");
    ok = false;
  } else if (descriptionField.value.length > 500) {
    setError("description-error", descriptionField, "Please keep the description to 500 characters.");
    ok = false;
  }

  if (!ok) {
    return null;
  }

  var reported = document.querySelector('input[name="reportedBy"]:checked');

  return {
    recruiterEmail: email,
    company: company,
    scamType: scamType,
    description: descriptionText,
    reportedBy: reported ? reported.value : "Student",
    status: editingId ? document.getElementById("report-status").value : "Pending"
  };
}

function setFormMode(mode, report) {
  var title = document.getElementById("form-title");
  var submit = document.getElementById("form-submit");
  var clearButton = document.getElementById("form-clear");
  var cancelButton = document.getElementById("form-cancel");
  var statusGroup = document.getElementById("status-group");
  var form = document.getElementById("report-form");

  if (mode === "edit" && report) {
    editingId = report.id;
    title.textContent = "Edit Report " + report.id;
    submit.textContent = "Save Changes";
    clearButton.hidden = true;
    cancelButton.hidden = false;
    statusGroup.hidden = false;
    document.getElementById("report-email").value = report.recruiterEmail;
    document.getElementById("report-company").value = report.company;
    document.getElementById("report-type").value = report.scamType;
    document.getElementById("report-description").value = report.description;
    document.getElementById("report-status").value = report.status;
    var radio = document.querySelector('input[name="reportedBy"][value="' + report.reportedBy + '"]');
    if (radio) {
      radio.checked = true;
    }
    clearErrors();
    updateDomainPreview();
    updateCounter();
    return;
  }

  editingId = null;
  title.textContent = "Submit a Scam Report";
  submit.textContent = "Submit Report";
  clearButton.hidden = false;
  cancelButton.hidden = true;
  statusGroup.hidden = true;
  form.reset();
  clearErrors();
  updateDomainPreview();
  updateCounter();
}

function applyPrefill() {
  var params = new URLSearchParams(window.location.search);
  var email = params.get("email");
  var company = params.get("company");
  if (!email && !company) {
    return;
  }
  if (email) {
    document.getElementById("report-email").value = email.trim();
    updateDomainPreview();
  }
  if (company === "Other / Not listed") {
    company = "Other";
  }
  if (company && COMPANIES.indexOf(company) !== -1) {
    document.getElementById("report-company").value = company;
  }
  showMessage("Prefilled from your recruiter check.", "info");
  scrollToForm();
}

// =============================================================================
// Init
// =============================================================================

function initCrud() {
  var form = document.getElementById("report-form");
  if (!form) {
    return;
  }

  loadReports();
  renderReports();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = validateForm();
    if (!data) {
      return;
    }
    if (editingId) {
      var updated = updateReport(editingId, data);
      showMessage("Report " + updated.id + " updated.", "success");
      flashRow(updated.id);
      setFormMode("create");
    } else {
      var created = createReport(data);
      showMessage("Report " + created.id + " submitted. Status: Pending review.", "success");
      flashRow(created.id);
      setFormMode("create");
    }
    renderReports();
  });

  document.getElementById("form-clear").addEventListener("click", function () {
    setFormMode("create");
  });

  document.getElementById("form-cancel").addEventListener("click", function () {
    setFormMode("create");
  });

  document.getElementById("report-email").addEventListener("input", function () {
    updateDomainPreview();
    setError("email-error", document.getElementById("report-email"), "");
  });

  document.getElementById("report-description").addEventListener("input", function () {
    updateCounter();
    setError("description-error", document.getElementById("report-description"), "");
  });

  document.getElementById("report-search").addEventListener("input", function (event) {
    searchQuery = event.target.value.trim();
    renderReports();
  });

  document.getElementById("filter-status").addEventListener("change", function (event) {
    statusFilter = event.target.value;
    renderReports();
  });

  document.getElementById("filter-type").addEventListener("change", function (event) {
    typeFilter = event.target.value;
    renderReports();
  });

  document.getElementById("report-table").addEventListener("click", function (event) {
    var sortButton = event.target.closest("[data-sort]");
    if (sortButton) {
      toggleSort(sortButton.getAttribute("data-sort"));
      return;
    }
    var button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    var action = button.getAttribute("data-action");
    var id = button.getAttribute("data-id");
    if (action === "more") {
      event.stopPropagation();
      toggleRowMenu(button);
      return;
    }
    closeRowMenu();
    if (action === "clear-filters") {
      clearFilters();
    } else if (action === "view") {
      openView(id, button);
    } else if (action === "edit") {
      startEdit(id);
    } else if (action === "approve") {
      approveReport(id);
    } else if (action === "reject") {
      rejectReport(id);
    } else if (action === "delete") {
      openDelete(id, button);
    }
  });

  document.getElementById("confirm-delete").addEventListener("click", function () {
    var id = pendingDeleteId;
    closeModal();
    if (id) {
      deleteReport(id);
    }
  });

  document.getElementById("reset-data").addEventListener("click", function (event) {
    openModal("reset-modal", event.currentTarget);
  });

  document.getElementById("confirm-reset").addEventListener("click", function () {
    closeModal();
    resetReports();
  });

  document.getElementById("modal-backdrop").addEventListener("click", function () {
    closeModal();
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-close]")) {
      closeModal();
    }
    if (openMenu && !event.target.closest(".row-menu") && !event.target.closest("[data-action='more']")) {
      closeRowMenu();
    }
  });

  window.addEventListener("resize", closeRowMenu);
  window.addEventListener("scroll", closeRowMenu, true);
  var tableWrap = document.querySelector(".crud-layout .table-wrap");
  if (tableWrap) {
    tableWrap.addEventListener("scroll", closeRowMenu);
  }

  document.addEventListener("keydown", onModalKeydown);

  applyPrefill();
  updateDomainPreview();
  updateCounter();
}

document.addEventListener("DOMContentLoaded", initCrud);
