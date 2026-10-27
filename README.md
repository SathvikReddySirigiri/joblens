# 🛡️ JobLens — Job & Internship Scam Shield

> **We verify the recruiter, not just the job.**

**Live site:** https://sathvikreddysirigiri.github.io/jobLens/index.html

JobLens is a static website prototype for **ISM 6225 · App Dev for Analytics (Assignment 3)**. It helps college students check whether a recruiter, job post, or offer is real before they reply. It is designed as a trust-and-safety tool for university career centers.

---

## The problem

- **Fake recruiters.** Scammers copy real company names and use look-alike emails such as `hr@amaz0n-careers.net` to contact students, especially international students.
- **Risky offers.** Fake offers ask students to deposit checks, buy equipment, pay fees, or share SSN and bank details.
- **No central record.** Scam warnings are scattered across group chats and emails, and nobody connects the reports.

## Who it's for

| User | What they do |
|---|---|
| 🎓 **Students** | Check recruiters, report scams, and ask Sentinel for advice |
| 🏫 **Career centers** | Review and approve reports, and watch campus scam trends |
| 🏢 **Employers** | Protect their brand from impersonation |

---

## Pages and features

| Page | File | What it does |
|---|---|---|
| **Home** | `index.html` | Explains JobLens and includes a working **"Check a Recruiter"** demo that scores an email from 0 to 100 (Low / Medium / High). It checks for look-alike domains, character tricks (0 for o, rn for m), free email providers, and reported domains. |
| **Dashboard** | `dashboard.html` | Interactive **Chart.js** dashboard with KPI cards, a time-range filter, and charts for reports per month, scam types, most-impersonated companies, checks by verdict, and report status. It combines sample history with live data from the Scam Reports page. |
| **Scam Reports (CRUD)** | `crud.html` | Full **Create, Read, Update, Delete** for scam reports, with search, filters, sorting, approve/reject, and validation. Data is saved in the browser with `localStorage`. |
| **Ask Sentinel** | `bot.html` | Describes the **Sentinel** Botpress chatbot, its dataset, and sample questions. The chat bubble is available on every page. |
| **About Us** | `aboutus.html` | Team members, roles, and contributions. |

### CRUD business rules (Scam Reports)

- The email must be valid; the domain is extracted from it automatically.
- Company and scam type are required.
- The description must be 20–500 characters.
- Duplicate reports (same recruiter email and scam type) are blocked.
- New reports always start as **Pending**. Only Pending reports can be approved or rejected.
- Deleting a report requires confirmation in an on-page dialog.

---

## 🤖 Sentinel chatbot (Botpress)

Sentinel helps students recognize job and internship scams. For each question it gives:

1. the matching **scam pattern**
2. the **risk level** (High or Medium)
3. the **red flags** found
4. clear **next steps**

**Knowledge source:** the `ScamPatterns` table (`botpress/scam_patterns.csv`), with **12 scam patterns** and **8 columns**:

`PatternID` · `ScamName` · `Category` · `HowItWorks` · `RedFlags` · `ExampleMessage` · `RiskLevel` · `WhatToDo`

| ID | Scam pattern | Risk |
|---|---|---|
| SP01 | Fake check / overpayment | High |
| SP02 | Equipment purchase reimbursement | High |
| SP03 | Upfront training or onboarding fee | High |
| SP04 | Chat-only interview | High |
| SP05 | Look-alike company domain | High |
| SP06 | Recruiter using a personal email | Medium |
| SP07 | Package reshipping job | High |
| SP08 | High-pay remote data entry | Medium |
| SP09 | SSN or bank details before an offer | High |
| SP10 | Fake staffing agency | Medium |
| SP11 | Money-mule payment processor job | High |
| SP12 | Paid visa or sponsorship fee | High |

**Try asking Sentinel:**
- "A recruiter wants me to deposit a check and buy a laptop. Is this a scam?"
- "What are the red flags of a remote data entry job paying $45/hour?"
- "Someone asked for my SSN before the interview. What should I do?"
- "The interview is only on Telegram. Is that normal?"
- "Do I have to pay for visa sponsorship?"

---

## Tech stack

- **HTML, CSS, JavaScript**, with no frameworks
- **Chart.js** (via CDN) for the dashboard charts
- **Botpress** for the Sentinel AI chatbot and its knowledge base
- **localStorage** for saving Scam Reports data in the browser
- **GitHub Pages** for hosting
- Built with GenAI assistance (Cursor), then customized by hand

## Project structure

```
jobLens/
├── index.html            Home + demo recruiter check
├── dashboard.html        Chart.js dashboard
├── crud.html             Scam Reports (CRUD)
├── bot.html              Ask Sentinel (Botpress bot)
├── aboutus.html          Team
├── css/
│   └── site.css          All site styles (light theme)
├── js/
│   ├── main.js           Navbar, mobile menu, demo check, shared scripts
│   ├── crud.js           Scam Reports CRUD logic
│   └── dashboard.js      Charts and KPIs
├── botpress/
│   ├── scam_patterns.csv Sentinel knowledge table (12 rows)
│   └── README.md
├── images/               Team photos
└── README.md
```

## Run it locally

1. Clone the repo: `git clone https://github.com/SathvikReddySirigiri/jobLens.git`
2. Open `index.html` in a browser. No build step is needed.

The Sentinel chat bubble works best on the live site, served over HTTPS.

---

## 👥 Team

| Member | Role | Contributions |
|---|---|---|
| **Naga Pavan Sathvik Reddy Sirigiri** | Project Lead & Developer | GitHub repo and Pages deployment, design system, navbar and footer, home page, and the demo recruiter check |
| **Isabella Cuello Penaloza** | CRUD & Data Developer | Scam Reports CRUD page, validation rules, and the sample scam report data |
| **Lakshmi Reethika Guduri** | Dashboard & Chatbot Developer | Chart.js dashboard and KPIs, the Sentinel Botpress bot, its table and knowledge base, and the bot page |

---

## What's next (final project)

The final version turns this prototype into a dynamic **ASP.NET Core MVC** web application on **Azure**:

- **Azure SQL Database** for companies, job postings, scam reports, and reviews
- **Live domain checks** using public APIs (RDAP domain registration data, SEC EDGAR company registry)
- **AI offer analyzer**, which highlights red flags in offer letters
- Student and career-center logins
- An **MCP server**, so AI assistants can use JobLens checks directly

---

*Prototype for educational purposes. Scam data shown is sample data and not a legal finding about any company.*
