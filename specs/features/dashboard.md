# Feature Spec — Dashboard

## Overview

The dashboard is the landing page of Scrappy. It provides an at-a-glance view
of the most important information for Sales/BD and Marketing users: how many new
cases were found this week, recent activity, and quick access to trigger a scrape.

---

## User Stories

### US-1: See new cases at a glance

**As a user**, I want to immediately see how many new cases were found this week,
**so that** I know whether there is anything worth reviewing.

**Acceptance criteria:**
- Given I navigate to `/`
- When `stats.new_cases_this_week > 0`
- Then a hero banner shows "N new cases this week" with a green pulse indicator
- And a "View new →" link navigates to `/cases?new_only=true`
- When `new_cases_this_week === 0`, the banner is hidden

---

### US-2: View key stats

**As a user**, I want to see total cases, new cases, company count, and last scrape time on one screen.

**Acceptance criteria:**
- Given I navigate to `/`
- Then four stat cards are shown: Total Cases, New This Week, Companies, Last Scrape
- Each card has a coloured left-border accent (indigo, emerald, zinc, zinc)
- "Last Scrape" shows relative time ("3h ago") with the full date as a sub-label
- Company status breakdown (idle / running / success / error counts) is shown below the cards

---

### US-3: Browse recent cases

**As a user**, I want to see the 10 most recently discovered cases,
**so that** I can quickly open anything interesting.

**Acceptance criteria:**
- Given cases exist in the DB
- Then the "Recent Cases" panel shows up to 10 cases sorted by `first_seen` descending
- Each row shows: company initial avatar, title, customer name, relative time
- Cases discovered in the last 7 days show a "NEW" emerald badge
- Clicking a row navigates to `/cases/{id}`

---

### US-4: Monitor scrape job history

**As a user**, I want to see the most recent scrape jobs and their outcomes,
**so that** I can detect failures quickly.

**Acceptance criteria:**
- Given scrape jobs exist
- Then the "Recent Scrape Jobs" panel shows up to 8 jobs
- Each row shows: status badge, company name (or "All companies"), new cases count (+N in green), relative time
- Each row has a coloured left border: emerald (done), amber (running), red (failed), zinc (queued)

---

### US-5: Trigger a full scrape from the dashboard

**As a user**, I want to kick off a scrape of all companies without navigating to the Companies page.

**Acceptance criteria:**
- Given I click "Run scrape now" in the Dashboard header
- Then `POST /api/scrape` is called with `company_id = "all"`
- And the button shows "Scraping…" with a pulsing icon while the job is pending

---

## UI

### Dashboard Page (`/`)

- Header row: "Dashboard" title + **Run scrape now** button (Zap icon)
- Hero banner (emerald pulse dot + new case count + "View new →" link) — only shown when `new_cases_this_week > 0`
- Stat cards row (4 cards, coloured left-border accents)
- Company status dot row (idle / running / success / error)
- Two-column panel row:
  - Left: "Recent Cases" — avatar + title + customer + relative time + NEW badge
  - Right: "Recent Scrape Jobs" — status badge + company + +N cases + relative time + coloured left border

---

## API Endpoints

- `GET /api/stats` — provides all stat card values and `companies_by_status`
- `GET /api/cases?per_page=10&sort=first_seen` — recent cases list
- `GET /api/scrape/jobs` — recent jobs list
- `POST /api/scrape` — trigger scrape

See [api/cases.md](../api/cases.md), [api/scraping.md](../api/scraping.md).
