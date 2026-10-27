// Shared scripts: navbar active link, mobile menu, footer year, and the home recruiter check.

document.addEventListener("DOMContentLoaded", function () {
  setActiveNavLink();
  setupMobileMenu();
  setFooterYear();
  setupRecruiterCheck();
});

// Mark the link for this page. "" or a trailing slash means the home page.
function setActiveNavLink() {
  var path = window.location.pathname || "";
  var file = path.slice(path.lastIndexOf("/") + 1).toLowerCase();

  if (!file) {
    file = "index.html";
  }

  var links = document.querySelectorAll("#site-header .nav-link");

  links.forEach(function (link) {
    var href = (link.getAttribute("href") || "").split("?")[0].split("#")[0];
    var hrefFile = href.slice(href.lastIndexOf("/") + 1).toLowerCase();

    if (hrefFile === file) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
}

function setupMobileMenu() {
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-links");
  var header = document.getElementById("site-header");

  if (!toggle || !menu || !header) {
    return;
  }

  function closeMenu() {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    toggle.textContent = "☰";
  }

  function openMenu() {
    menu.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    toggle.textContent = "✕";
  }

  toggle.addEventListener("click", function () {
    if (menu.classList.contains("is-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  document.addEventListener("click", function (event) {
    if (!header.contains(event.target)) {
      closeMenu();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) {
      closeMenu();
    }
  });
}

function setFooterYear() {
  var year = document.getElementById("year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

// ----- Home page: Check a Recruiter -----
// SAMPLE DATA. These lists stand in for live domain and community data.

var COMPANIES = {
  "Amazon": "amazon.com",
  "Microsoft": "microsoft.com",
  "Google": "google.com",
  "Deloitte": "deloitte.com",
  "JPMorgan Chase": "jpmorgan.com",
  "Raymond James": "raymondjames.com",
  "Moffitt Cancer Center": "moffitt.org",
  "Publix": "publix.com"
};

var FREE_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "icloud.com"
];

var REPORTED_DOMAINS = {
  "amaz0n-careers.net": { reports: 4, daysOld: 9 },
  "rnicrosoft-hiring.com": { reports: 2, daysOld: 12 },
  "deloitte-recruitment-hr.com": { reports: 3, daysOld: 21 },
  "google-careers-team.net": { reports: 1, daysOld: 45 }
};

var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Swap look-alike characters, then drop hyphens and dots for the brand check.
function normalizeDomain(domain) {
  var swapped = domain
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/rn/g, "m")
    .replace(/vv/g, "w");

  return {
    swapped: swapped,
    compact: swapped.replace(/[-.]/g, "")
  };
}

// Edit distance: each insert, delete, or substitution costs 1.
function levenshtein(a, b) {
  var i;
  var j;
  var prev = [];
  var curr = [];

  for (j = 0; j <= b.length; j += 1) {
    prev[j] = j;
  }

  for (i = 1; i <= a.length; i += 1) {
    curr = [i];

    for (j = 1; j <= b.length; j += 1) {
      var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }

    prev = curr;
  }

  return prev[b.length];
}

function checkRecruiter(email, companyName) {
  var domain = email.split("@")[1].toLowerCase().trim();
  var official = COMPANIES[companyName] || "";
  var brand = official ? official.split(".")[0] : "";
  var normalized = normalizeDomain(domain);
  var signals = [];
  var isOfficial = false;
  var isLookalike = false;

  if (official && (domain === official || domain.endsWith("." + official))) {
    isOfficial = true;
    signals.push({
      label: "Matches the official domain (" + official + ")",
      points: -40,
      type: "good"
    });
  }

  var provider = "";
  FREE_PROVIDERS.forEach(function (name) {
    if (!provider && (domain === name || domain.endsWith("." + name))) {
      provider = name;
    }
  });

  if (provider) {
    signals.push({
      label: "Uses a free personal email provider (" + provider + ") — real recruiters use company email",
      points: 30,
      type: "bad"
    });
  }

  var firstLabel = normalized.swapped.split(".")[0];

  if (!isOfficial && brand && (normalized.compact.indexOf(brand) !== -1 || levenshtein(firstLabel, brand) <= 2)) {
    isLookalike = true;
    signals.push({
      label: "Look-alike of " + official,
      points: 40,
      type: "bad"
    });
  }

  if (isLookalike && normalized.swapped !== domain) {
    signals.push({
      label: "Uses character tricks (0 for o, rn for m)",
      points: 10,
      type: "bad"
    });
  }

  var reported = REPORTED_DOMAINS[domain];

  if (reported) {
    if (reported.reports > 0) {
      signals.push({
        label: reported.reports + " student scam report" + (reported.reports === 1 ? "" : "s"),
        points: Math.min(reported.reports * 10, 30),
        type: "bad"
      });
    }

    if (reported.daysOld < 180) {
      var dayWord = reported.daysOld === 1 ? "day" : "days";
      signals.push({
        label: "Domain registered " + reported.daysOld + " " + dayWord + " ago (sample data)",
        points: reported.daysOld < 30 ? 30 : 15,
        type: "bad"
      });
    }
  }

  if (companyName === "Other / Not listed") {
    signals.push({
      label: "Company not in our verified list — be cautious",
      points: 0,
      type: "info"
    });
  }

  var hasBad = signals.some(function (signal) {
    return signal.type === "bad";
  });

  if (!hasBad && !isOfficial) {
    signals.push({
      label: "Unknown domain — verify on the company's official careers page",
      points: 10,
      type: "info"
    });
  }

  var score = 10;

  signals.forEach(function (signal) {
    score += signal.points;
  });

  score = Math.max(0, Math.min(100, score));

  var verdict;

  if (score <= 34) {
    verdict = {
      level: "low",
      badge: "badge-low",
      title: "LOW RISK",
      label: "Looks legitimate",
      next: "Looks consistent with the official domain. Still never pay to get a job."
    };
  } else if (score <= 64) {
    verdict = {
      level: "medium",
      badge: "badge-medium",
      title: "MEDIUM RISK",
      label: "Be cautious",
      next: "Verify on the company's official careers page and ask the career center."
    };
  } else {
    verdict = {
      level: "high",
      badge: "badge-high",
      title: "HIGH RISK",
      label: "Likely scam",
      next: "Do not reply, send money, or share personal info. Report it so classmates are warned."
    };
  }

  return {
    score: score,
    signals: signals,
    verdict: verdict
  };
}

function setFieldError(errorId, input, message) {
  var error = document.getElementById(errorId);

  if (!error || !input) {
    return;
  }

  if (message) {
    error.hidden = false;
    error.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", errorId);
  } else {
    error.hidden = true;
    error.textContent = "";
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
}

function renderCheckResult(email, company, result) {
  var host = document.getElementById("check-result");
  var card = document.createElement("article");
  var top = document.createElement("div");
  var who = document.createElement("div");
  var emailEl = document.createElement("p");
  var companyEl = document.createElement("p");
  var verdict = document.createElement("div");
  var badge = document.createElement("span");
  var scoreEl = document.createElement("p");
  var phrase = document.createElement("p");
  var bar = document.createElement("div");
  var fill = document.createElement("div");
  var list = document.createElement("ul");
  var next = document.createElement("div");
  var nextTitle = document.createElement("h3");
  var nextText = document.createElement("p");
  var note = document.createElement("p");

  card.className = "card result-card";
  card.tabIndex = -1;

  top.className = "result-top";
  emailEl.className = "result-email";
  emailEl.textContent = email;
  companyEl.className = "text-muted";
  companyEl.textContent = company;
  who.appendChild(emailEl);
  who.appendChild(companyEl);

  verdict.className = "result-verdict";
  badge.className = "badge badge-lg " + result.verdict.badge;
  badge.textContent = result.verdict.title;
  scoreEl.className = "result-score";
  scoreEl.textContent = result.score + " / 100";
  phrase.className = "result-phrase small";
  phrase.textContent = result.verdict.label;
  verdict.appendChild(badge);
  verdict.appendChild(scoreEl);
  verdict.appendChild(phrase);
  top.appendChild(who);
  top.appendChild(verdict);

  bar.className = "score-bar";
  bar.setAttribute("role", "meter");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.setAttribute("aria-valuenow", String(result.score));
  bar.setAttribute("aria-label", "Risk score");
  fill.className = "score-fill is-" + result.verdict.level;
  fill.style.setProperty("--score", result.score + "%");
  bar.appendChild(fill);

  list.className = "reason-list";
  result.signals.forEach(function (signal) {
    var item = document.createElement("li");
    var icon = document.createElement("span");
    var text = document.createElement("span");

    icon.className = "reason-icon " + signal.type;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = signal.type === "good" ? "✓" : signal.type === "bad" ? "✕" : "ℹ";
    text.textContent = signal.label;
    item.appendChild(icon);
    item.appendChild(text);
    list.appendChild(item);
  });

  next.className = "next-steps is-" + result.verdict.level;
  nextTitle.textContent = "What to do next";
  nextText.textContent = result.verdict.next;
  next.appendChild(nextTitle);
  next.appendChild(nextText);

  if (result.verdict.level === "high") {
    var report = document.createElement("a");
    report.className = "btn btn-primary";
    report.href = "crud.html?email=" + encodeURIComponent(email) + "&company=" + encodeURIComponent(company);
    report.textContent = "Report this scam";
    next.appendChild(report);
  }

  note.className = "result-note small text-muted";
  note.textContent = "Prototype using sample data. The full JobLens app checks live domain registration data and community reports.";

  card.appendChild(top);
  card.appendChild(bar);
  card.appendChild(list);
  card.appendChild(next);
  card.appendChild(note);

  if (host.replaceChildren) {
    host.replaceChildren(card);
  } else {
    host.innerHTML = "";
    host.appendChild(card);
  }

  host.hidden = false;

  window.requestAnimationFrame(function () {
    host.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupRecruiterCheck() {
  var form = document.getElementById("recruiter-form");

  if (!form) {
    return;
  }

  var emailInput = document.getElementById("recruiter-email");
  var companySelect = document.getElementById("company");

  function runCheck() {
    var email = emailInput.value.trim();
    var company = companySelect.value;
    var emailMessage = "";
    var companyMessage = "";

    if (!email) {
      emailMessage = "Enter a recruiter email.";
    } else if (!EMAIL_PATTERN.test(email)) {
      emailMessage = "Enter a valid recruiter email.";
    }

    if (!company) {
      companyMessage = "Select the company they claim to represent.";
    }

    setFieldError("recruiter-error", emailInput, emailMessage);
    setFieldError("company-error", companySelect, companyMessage);

    if (emailMessage || companyMessage) {
      (emailMessage ? emailInput : companySelect).focus();
      return;
    }

    renderCheckResult(email, company, checkRecruiter(email, company));
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    runCheck();
  });

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      emailInput.value = chip.getAttribute("data-email") || "";
      companySelect.value = chip.getAttribute("data-company") || "";
      runCheck();
    });
  });
}
