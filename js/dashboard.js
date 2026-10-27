// Scam Insights Dashboard: live report counts plus sample monthly trends.

// =============================================================================
// Config & palette
// =============================================================================

var STORAGE_KEY = "joblens_reports";

var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

var SCAM_TYPES = [
  "Fake check",
  "Equipment purchase",
  "Upfront fee",
  "Chat-only interview",
  "Identity theft",
  "Fake staffing agency"
];

var STATUS_LABELS = ["Pending", "Approved", "Rejected"];

var PALETTE_FALLBACK = ["#93C5FD", "#86EFAC", "#FCD34D", "#FCA5A5", "#C4B5FD", "#A5F3FC"];

var palette = PALETTE_FALLBACK.slice();
var paletteBorders = [];

var liveReports = [];
var charts = {
  reports: null,
  types: null,
  companies: null,
  checks: null,
  status: null
};

function readPalette() {
  var styles = getComputedStyle(document.documentElement);
  palette = PALETTE_FALLBACK.map(function (fallback, index) {
    var value = styles.getPropertyValue("--chart-" + (index + 1)).trim();
    return value || fallback;
  });
  paletteBorders = palette.map(darken);
}

function darken(hex) {
  var n = parseInt(String(hex).replace("#", ""), 16);
  if (isNaN(n)) {
    return hex;
  }
  function channel(shift) {
    var value = Math.max(0, ((n >> shift) & 255) - 32);
    var text = value.toString(16);
    return text.length === 1 ? "0" + text : text;
  }
  return "#" + channel(16) + channel(8) + channel(0);
}

function withAlpha(hex, alpha) {
  var n = parseInt(String(hex).replace("#", ""), 16);
  if (isNaN(n)) {
    return hex;
  }
  var r = (n >> 16) & 255;
  var g = (n >> 8) & 255;
  var b = n & 255;
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

function percentLabel(value, total) {
  if (!total) {
    return "0%";
  }
  return Math.round((value / total) * 100) + "%";
}

function sum(values) {
  return values.reduce(function (total, value) {
    return total + value;
  }, 0);
}

function setChartDefaults() {
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.color = "#64748B";
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.plugins.legend.position = "bottom";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = "circle";
  Chart.defaults.plugins.tooltip.backgroundColor = "#FFFFFF";
  Chart.defaults.plugins.tooltip.titleColor = "#1E293B";
  Chart.defaults.plugins.tooltip.bodyColor = "#1E293B";
  Chart.defaults.plugins.tooltip.borderColor = "#E2E8F0";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.scale.grid.color = "#F1F5F9";
  Chart.defaults.scale.border.display = false;
}

function scaleOptions(stacked) {
  return {
    x: {
      stacked: !!stacked,
      grid: { color: "#F1F5F9" },
      border: { display: false },
      beginAtZero: true,
      ticks: { precision: 0 }
    },
    y: {
      stacked: !!stacked,
      grid: { color: "#F1F5F9" },
      border: { display: false },
      beginAtZero: true,
      ticks: { precision: 0 }
    }
  };
}

function pointValue(context) {
  if (context.chart.options.indexAxis === "y") {
    return context.parsed.x;
  }
  return context.parsed.y;
}

function valueTooltip(totalOf) {
  return function (context) {
    var value = pointValue(context);
    var total = totalOf(context);
    var name = context.dataset.label && context.chart.data.datasets.length > 1
      ? context.dataset.label + ": "
      : "";
    return name + value + " (" + percentLabel(value, total) + ")";
  };
}

// Draws the live report total in the doughnut hole.
var centerTotalPlugin = {
  id: "centerTotal",
  afterDraw: function (chart) {
    if (chart.canvas.id !== "chart-types") {
      return;
    }
    var values = chart.data.datasets[0].data;
    var total = sum(values);
    var area = chart.chartArea;
    var ctx = chart.ctx;
    var x = (area.left + area.right) / 2;
    var y = (area.top + area.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1E293B";
    ctx.font = "700 1.75rem Inter, sans-serif";
    ctx.fillText(String(total), x, y - 8);
    ctx.fillStyle = "#64748B";
    ctx.font = "500 0.75rem Inter, sans-serif";
    ctx.fillText("reports", x, y + 14);
    ctx.restore();
  }
};

// =============================================================================
// Sample data
// =============================================================================

// SAMPLE DATA. Historical months are not stored in the browser.
// Jan–Oct 2026. October's report total is increased by live October reports.
var SAMPLE_MONTHLY_REPORTS = [6, 8, 7, 11, 9, 14, 12, 18, 21, 22];

// SAMPLE DATA. Recruiter-check verdicts by month, Jan–Oct 2026.
var SAMPLE_MONTHLY_CHECKS = {
  low: [40, 45, 52, 60, 58, 70, 74, 80, 88, 95],
  medium: [12, 14, 13, 18, 16, 20, 22, 25, 27, 30],
  high: [8, 9, 10, 14, 12, 17, 15, 22, 26, 28]
};

// SAMPLE DATA. Impersonation counts used only by the company chart.
var SAMPLE_COMPANIES = [
  { name: "Amazon", count: 31 },
  { name: "Microsoft", count: 24 },
  { name: "Deloitte", count: 17 },
  { name: "Google", count: 15 },
  { name: "JPMorgan Chase", count: 11 },
  { name: "Publix", count: 7 },
  { name: "Raymond James", count: 5 }
];

// Same 10 seed reports as the Scam Reports page, used when storage is empty.
var SAMPLE_REPORTS = [
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

// =============================================================================
// Load live reports
// =============================================================================

function loadLiveReports() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      liveReports = SAMPLE_REPORTS.slice();
      return;
    }
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      liveReports = SAMPLE_REPORTS.slice();
      return;
    }
    liveReports = parsed;
  } catch (error) {
    liveReports = SAMPLE_REPORTS.slice();
  }
}

// =============================================================================
// Calculations (KPIs, counts by type/status, growth %)
// =============================================================================

function countStatus(status) {
  return liveReports.filter(function (report) {
    return report.status === status;
  }).length;
}

function countsByType() {
  var counts = {};
  SCAM_TYPES.forEach(function (type) {
    counts[type] = 0;
  });
  liveReports.forEach(function (report) {
    if (counts[report.scamType] === undefined) {
      counts[report.scamType] = 0;
    }
    counts[report.scamType] += 1;
  });
  return counts;
}

function topScamType() {
  var counts = countsByType();
  var bestType = "";
  var bestCount = 0;
  Object.keys(counts).forEach(function (type) {
    if (counts[type] > bestCount) {
      bestCount = counts[type];
      bestType = type;
    }
  });
  return { type: bestType, count: bestCount };
}

function countInMonth(yearMonth) {
  return liveReports.filter(function (report) {
    return String(report.dateReported || "").indexOf(yearMonth) === 0;
  }).length;
}

function currentMonthKey() {
  var now = new Date();
  var month = String(now.getMonth() + 1);
  if (month.length === 1) {
    month = "0" + month;
  }
  return now.getFullYear() + "-" + month;
}

function reportsSeries() {
  var series = SAMPLE_MONTHLY_REPORTS.slice();
  series[9] = SAMPLE_MONTHLY_REPORTS[9] + countInMonth("2026-10");
  return series;
}

function approvalRate() {
  var approved = countStatus("Approved");
  var rejected = countStatus("Rejected");
  var reviewed = approved + rejected;
  if (!reviewed) {
    return null;
  }
  return Math.round((approved / reviewed) * 100);
}

function growthJulyToOctober() {
  var july = SAMPLE_MONTHLY_REPORTS[6];
  var october = reportsSeries()[9];
  if (!july) {
    return october ? 100 : 0;
  }
  return Math.round(((october - july) / july) * 100);
}

function rangeStart() {
  var value = document.getElementById("range").value;
  if (value === "3") {
    return 7;
  }
  if (value === "6") {
    return 4;
  }
  return 0;
}

function sliceMonths(values) {
  return values.slice(rangeStart());
}

function renderKpis() {
  var total = liveReports.length;
  var pending = countStatus("Pending");
  var added = countInMonth(currentMonthKey());
  var rate = approvalRate();
  var top = topScamType();
  var trend = document.getElementById("kpi-total-trend");

  document.getElementById("kpi-total").textContent = String(total);
  trend.textContent = "+" + added + " this month";
  trend.classList.toggle("is-positive", added > 0);
  document.getElementById("kpi-pending").textContent = String(pending);
  document.getElementById("kpi-rate").textContent = rate === null ? "—" : rate + "%";
  document.getElementById("kpi-type").textContent = top.count ? top.type : "—";
  document.getElementById("kpi-type-trend").textContent = top.count + (top.count === 1 ? " report" : " reports");
}

function renderUpdated() {
  var stamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  document.getElementById("last-updated").textContent = "Last updated: " + stamp;
}

// =============================================================================
// Chart builders (one function per chart)
// =============================================================================

function showChartError() {
  var grid = document.getElementById("chart-grid");
  grid.textContent = "";
  var message = document.createElement("div");
  message.className = "alert alert-error";
  message.textContent = "Charts could not load. Check your internet connection.";
  grid.appendChild(message);
}

function buildReportsChart() {
  var series = sliceMonths(reportsSeries());
  var labels = sliceMonths(MONTHS);
  charts.reports = new Chart(document.getElementById("chart-reports"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Reports",
        data: series,
        borderColor: palette[0],
        backgroundColor: withAlpha(palette[0], 0.35),
        pointBackgroundColor: palette[0],
        pointBorderColor: paletteBorders[0],
        pointRadius: 4,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      scales: scaleOptions(false),
      plugins: {
        tooltip: {
          callbacks: {
            label: valueTooltip(function (context) {
              return sum(context.dataset.data);
            })
          }
        }
      }
    }
  });
}

function buildTypesChart() {
  var counts = countsByType();
  var data = SCAM_TYPES.map(function (type) {
    return counts[type] || 0;
  });
  charts.types = new Chart(document.getElementById("chart-types"), {
    type: "doughnut",
    plugins: [centerTotalPlugin],
    data: {
      labels: SCAM_TYPES.slice(),
      datasets: [{
        data: data,
        backgroundColor: palette.slice(0, SCAM_TYPES.length),
        borderColor: paletteBorders.slice(0, SCAM_TYPES.length),
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      cutout: "65%",
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              var total = sum(context.dataset.data);
              return context.label + ": " + context.parsed + " (" + percentLabel(context.parsed, total) + ")";
            }
          }
        }
      }
    }
  });
}

function buildCompaniesChart() {
  var companies = SAMPLE_COMPANIES.slice().sort(function (a, b) {
    return b.count - a.count;
  });
  charts.companies = new Chart(document.getElementById("chart-companies"), {
    type: "bar",
    data: {
      labels: companies.map(function (company) {
        return company.name;
      }),
      datasets: [{
        label: "Reports",
        data: companies.map(function (company) {
          return company.count;
        }),
        backgroundColor: companies.map(function (company, index) {
          return palette[index % palette.length];
        }),
        borderColor: companies.map(function (company, index) {
          return paletteBorders[index % paletteBorders.length];
        }),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: "y",
      scales: scaleOptions(false),
      plugins: {
        tooltip: {
          callbacks: {
            label: valueTooltip(function () {
              return sum(SAMPLE_COMPANIES.map(function (company) {
                return company.count;
              }));
            })
          }
        }
      }
    }
  });
}

function buildChecksChart() {
  var labels = sliceMonths(MONTHS);
  var series = [
    { label: "Low", key: "low", color: palette[1], border: paletteBorders[1] },
    { label: "Medium", key: "medium", color: palette[2], border: paletteBorders[2] },
    { label: "High", key: "high", color: palette[3], border: paletteBorders[3] }
  ];
  charts.checks = new Chart(document.getElementById("chart-checks"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: series.map(function (item) {
        return {
          label: item.label,
          data: sliceMonths(SAMPLE_MONTHLY_CHECKS[item.key]),
          backgroundColor: item.color,
          borderColor: item.border,
          borderWidth: 1,
          stack: "verdicts"
        };
      })
    },
    options: {
      scales: scaleOptions(true),
      plugins: {
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: valueTooltip(function (context) {
              return context.chart.data.datasets.reduce(function (total, dataset) {
                return total + dataset.data[context.dataIndex];
              }, 0);
            })
          }
        }
      }
    }
  });
}

function buildStatusChart() {
  var data = STATUS_LABELS.map(countStatus);
  var colors = [palette[2], palette[1], palette[3]];
  var borders = [paletteBorders[2], paletteBorders[1], paletteBorders[3]];
  charts.status = new Chart(document.getElementById("chart-status"), {
    type: "bar",
    data: {
      labels: STATUS_LABELS.slice(),
      datasets: [{
        label: "Reports",
        data: data,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1
      }]
    },
    options: {
      scales: scaleOptions(false),
      plugins: {
        tooltip: {
          callbacks: {
            label: valueTooltip(function () {
              return liveReports.length;
            })
          }
        }
      }
    }
  });
}

function updateCanvasLabels() {
  var series = sliceMonths(reportsSeries());
  var labels = sliceMonths(MONTHS);
  var reports = document.getElementById("chart-reports");
  if (reports) {
    reports.setAttribute("aria-label", "Line chart of scam reports per month for " + labels[0] + " to " + labels[labels.length - 1] + ". Latest month: " + series[series.length - 1] + " reports.");
  }
  var top = topScamType();
  var types = document.getElementById("chart-types");
  if (types) {
    types.setAttribute("aria-label", "Doughnut chart of " + liveReports.length + " live reports by scam type. Most reported: " + (top.type || "none") + ".");
  }
  var status = document.getElementById("chart-status");
  if (status) {
    status.setAttribute("aria-label", "Bar chart of live report status. Pending " + countStatus("Pending") + ", approved " + countStatus("Approved") + ", rejected " + countStatus("Rejected") + ".");
  }
}

// =============================================================================
// Range filter
// =============================================================================

function applyRange() {
  if (!charts.reports || !charts.checks) {
    return;
  }
  var labels = sliceMonths(MONTHS);
  charts.reports.data.labels = labels;
  charts.reports.data.datasets[0].data = sliceMonths(reportsSeries());
  charts.reports.update();

  charts.checks.data.labels = labels;
  charts.checks.data.datasets[0].data = sliceMonths(SAMPLE_MONTHLY_CHECKS.low);
  charts.checks.data.datasets[1].data = sliceMonths(SAMPLE_MONTHLY_CHECKS.medium);
  charts.checks.data.datasets[2].data = sliceMonths(SAMPLE_MONTHLY_CHECKS.high);
  charts.checks.update();
  updateCanvasLabels();
}

function updateLiveCharts() {
  if (charts.types) {
    var counts = countsByType();
    charts.types.data.datasets[0].data = SCAM_TYPES.map(function (type) {
      return counts[type] || 0;
    });
    charts.types.update();
  }
  if (charts.status) {
    charts.status.data.datasets[0].data = STATUS_LABELS.map(countStatus);
    charts.status.update();
  }
  applyRange();
}

// =============================================================================
// Insights
// =============================================================================

function addInsight(list, lead, rest) {
  var item = document.createElement("li");
  var strong = document.createElement("strong");
  strong.textContent = lead;
  item.appendChild(strong);
  item.appendChild(document.createTextNode(rest));
  list.appendChild(item);
}

function renderInsights() {
  var list = document.getElementById("insights-list");
  var growth = growthJulyToOctober();
  var top = topScamType();
  var companies = SAMPLE_COMPANIES.slice().sort(function (a, b) {
    return b.count - a.count;
  });
  var company = companies[0];
  list.textContent = "";

  if (growth > 0) {
    addInsight(list, "Reports grew " + growth + "%", " from July to October.");
  } else if (growth < 0) {
    addInsight(list, "Reports fell " + Math.abs(growth) + "%", " from July to October.");
  } else {
    addInsight(list, "Reports held steady", " from July to October.");
  }

  if (top.count) {
    addInsight(list, top.type, " is the most reported scam type.");
  } else {
    addInsight(list, "No scam type", " has been reported yet.");
  }

  addInsight(
    list,
    company.name,
    " is the most impersonated company — students should verify any \"" + company.name + "\" recruiter."
  );
}

function refreshDashboard() {
  loadLiveReports();
  renderKpis();
  renderInsights();
  renderUpdated();
  updateLiveCharts();
}

// =============================================================================
// Init
// =============================================================================

function initDashboard() {
  readPalette();
  loadLiveReports();
  renderKpis();
  renderInsights();
  renderUpdated();

  document.getElementById("range").addEventListener("change", applyRange);
  document.getElementById("refresh-data").addEventListener("click", refreshDashboard);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      refreshDashboard();
    }
  });
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY) {
      refreshDashboard();
    }
  });

  if (typeof Chart === "undefined") {
    showChartError();
    return;
  }

  setChartDefaults();
  buildReportsChart();
  buildTypesChart();
  buildCompaniesChart();
  buildChecksChart();
  buildStatusChart();
  updateCanvasLabels();
}

document.addEventListener("DOMContentLoaded", initDashboard);
