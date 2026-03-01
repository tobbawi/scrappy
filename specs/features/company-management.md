# Feature Spec — Company Management

## Overview

Users can add, configure, update, and delete companies that Scrappy monitors.
Each company represents one website with a listing page of case studies.

---

## User Stories

### US-1: Add a company

**As a user**, I want to add a new company with its listing URL and fetcher type,
**so that** Scrappy knows where to find case studies for that company.

**Acceptance criteria:**
- Given I fill in name, listing URL, and fetcher type
- When I submit the Add Company form
- Then the company appears in the companies table with status "idle"
- And the company ID is derived from the slugified name

**Edge cases:**
- Duplicate company name → error "Company with this name already exists"
- Invalid URL → form validation prevents submission

---

### US-2: Scrape a company on demand

**As a user**, I want to trigger a scrape for a single company,
**so that** I can update its cases without waiting for the weekly schedule.

**Acceptance criteria:**
- Given a company is listed in the Companies page
- When I click "Scrape Now"
- Then a spinner appears on the button and the status changes to "running"
- When the job completes
- Then the status shows "success" and `last_scraped_at` is updated
- And the Dashboard reflects the new case count

---

### US-3: Scrape all companies

**As a user**, I want to trigger a full scrape of all active companies at once.

**Acceptance criteria:**
- Given I click "Scrape All"
- Then a single job is created with `company_id = null`
- And each active company is scraped sequentially
- When done, all company statuses update

---

### US-4: Deactivate a company

**As a user**, I want to pause scraping for a company without deleting it,
**so that** I can re-enable it later without losing historical cases.

**Acceptance criteria:**
- Given a company is active
- When I toggle the active switch off
- Then `company.active = false`
- And the company is excluded from "Scrape All" runs and the weekly scheduler

---

### US-5: Delete a company

**As a user**, I want to permanently remove a company and all its cases.

**Acceptance criteria:**
- Given I click "Delete" on a company
- When I confirm the deletion prompt
- Then the company row is deleted from the DB
- And all related `ReferenceCase` rows are deleted
- And the table no longer shows the company

---

## UI Components

- **Companies page** (`/companies`): Table with columns: Name, Listing URL, Fetcher type, Status, Last scraped, Actions.
- **AddCompanyDialog**: Modal form (name, URL, fetcher type, path prefix).
- Status badge: idle (gray) | running (yellow) | success (green) | error (red).
- Error message displayed below company row when status = error.

---

## API Endpoints

- `GET /api/companies`
- `POST /api/companies`
- `PATCH /api/companies/{id}`
- `DELETE /api/companies/{id}`
- `POST /api/scrape` (with company_id or "all")

See [api/companies.md](../api/companies.md) and [api/scraping.md](../api/scraping.md).
