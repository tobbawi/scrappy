# Feature Spec — Company Detail Page

## User Story

**As a** user managing reference case scraping,
**I want** a detail page for each company showing its metadata, case statistics, health status, and scrape history,
**so that** I can quickly diagnose scraping issues and understand how well a company's cases are being extracted.

## Acceptance Criteria

### Navigating to the detail page

**Given** I am on the Companies list page,
**When** I click a company name,
**Then** I am navigated to `/companies/:id` showing the company detail page.

### Viewing company statistics

**Given** a company has reference cases in the database,
**When** I view the company detail page,
**Then** I see stat cards showing: case count, average quality score (colour-coded), fetcher type, and last scraped time.

### Viewing company info

**Given** I am on a company detail page,
**Then** I see the listing URL (as an external link), path prefix, company ID, creation date, and current scrape status.

### Viewing top industries and countries

**Given** a company has cases with `customer_industry` and `customer_country` set,
**When** I view the detail page,
**Then** I see the top 5 industries and top 5 countries with their counts.

### Error banner

**Given** a company has `scrape_status = "error"`,
**When** I view the detail page,
**Then** a red error banner is visible showing the `error_message`.

### Scrape history

**Given** a company has been scraped before,
**When** I view the detail page,
**Then** I see the last 10 scrape jobs for this company, each showing status, date, cases found, and cases new.

### Actions

**Given** I am on a company detail page,
**When** I click "Scrape Now",
**Then** a scrape job is triggered for that company.

**When** I click "Delete" and confirm,
**Then** the company and its cases are deleted and I am redirected to `/companies`.

**When** I click the Edit button,
**Then** the EditCompanyDialog opens allowing me to update the company fields.

### Link to cases

**Given** a company has cases,
**When** I click "View all N cases",
**Then** I am navigated to the Cases page filtered by this company.

## API Dependencies

- `GET /api/companies/{id}` — returns `CompanyDetailRead` with `case_count`, `avg_quality_score`, `top_industries`, `top_countries`
- `GET /api/scrape/jobs?company_id=...` — filtered scrape history
- `POST /api/scrape` — trigger scrape
- `DELETE /api/companies/{id}` — delete company
- `PATCH /api/companies/{id}` — update company

## Components

| Component | Location |
|-----------|----------|
| `CompanyDetail` page | `frontend/src/pages/CompanyDetail.tsx` |
| `useCompany(id)` hook | `frontend/src/hooks/useCompanies.ts` |
| `EditCompanyDialog` (reused) | `frontend/src/components/companies/EditCompanyDialog.tsx` |

## Route

`/companies/:id` — registered in `App.tsx`
