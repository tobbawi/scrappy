# Feature Spec — Case Browsing

## Overview

Users can browse, search, and filter the collected reference cases,
and view the full detail of any individual case.

---

## User Stories

### US-1: Browse all cases

**As a user**, I want to see a paginated list of all collected cases,
**so that** I can review what's in the database.

**Acceptance criteria:**
- Given cases exist in the DB
- When I navigate to `/cases`
- Then cases are shown paginated (20 per page by default)
- Sorted by `first_seen` descending (newest first)

---

### US-2: Filter cases by company

**As a user**, I want to see only cases from a specific company.

**Acceptance criteria:**
- Given I select a company from the filter dropdown
- Then only cases with `company_id` matching that company are shown
- And the filter is reflected in the URL (`?company=acme-corp`)

---

### US-3: Search cases by keyword

**As a user**, I want to find cases matching a keyword in title, customer name, or full text.

**Acceptance criteria:**
- Given I type in the search box (with 300ms debounce)
- Then the API is called with `q=<keyword>`
- And cases matching in `title`, `customer_name`, `raw_text`, or `tags` are returned

---

### US-4: Filter new cases only

**As a user**, I want to quickly see only cases added in the last 7 days.

**Acceptance criteria:**
- Given I check the "New this week" checkbox
- Then only cases with `first_seen >= now - 7 days` are shown

---

### US-5: Sort by publish date

**As a user**, I want to sort cases by their original publication date.

**Acceptance criteria:**
- Given I change the sort to "Publish date"
- Then cases are ordered by `publish_date` descending (cases without a date appear last)

---

### US-6: View case detail

**As a user**, I want to see all extracted fields for a specific case.

**Acceptance criteria:**
- Given I click on a case card
- Then I'm navigated to `/cases/{id}`
- And I can see: title, customer name/industry/country, logo, challenge, solution, results,
  products used, quote, tags, publish date, first seen date, and a link to the original case

---

### US-7: URL-persisted filters

**As a user**, I want my active filters to be preserved in the URL,
**so that** I can share or bookmark a filtered view.

**Acceptance criteria:**
- All active filters (company, sort, new_only, q, page) are reflected in URL search params
- Navigating to a URL with filters pre-populates the filter controls

---

## UI

### Cases Page (`/cases`)

- Left filter sidebar: company dropdown, sort selector, "New this week" checkbox, Clear button
- Search bar at top (debounced)
- Case cards grid: title, customer, industry, country, quote snippet, tags, date, source link
- Pagination controls: Previous / Next / page indicator
- Result count: "N cases"

### CaseDetail Page (`/cases/:id`)

- Back button to `/cases`
- Header: title + company badge
- Meta: customer name, industry, country, publish date, first seen date
- Customer logo image (if available)
- Testimonial blockquote with author
- Challenge / Solution / Results sections
- Products used chips
- Tags chips
- Collapsible "Raw extracted text" section
- External link button to original case URL

---

## API Endpoints

- `GET /api/cases` (with filters)
- `GET /api/cases/{id}`

See [api/cases.md](../api/cases.md).
