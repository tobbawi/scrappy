# Feature Spec — Manual Case Editing

## User Story

As a user reviewing a scraped reference case,
I want to manually edit any case field,
so that I can correct scraper errors or enrich entries with information the scraper missed.

## Acceptance Criteria

**Given** I am on a Case Detail page
**When** the page loads
**Then** an "Edit" button is visible in the header area

**Given** I click the "Edit" button
**When** the dialog opens
**Then** all editable fields are pre-populated with the current case values

**Given** I change one or more fields and click "Save changes"
**When** the PATCH request succeeds
**Then** the dialog closes and the case detail page reflects the updated values immediately

**Given** I click "Cancel" or close the dialog
**When** no save was made
**Then** the case data is unchanged

**Given** the case ID does not exist
**When** `PATCH /api/cases/{id}` is called
**Then** a `404` response is returned

## Editable Fields

| Field | Input type |
|-------|-----------|
| `title` | Text input |
| `customer_name` | Text input |
| `customer_industry` | Text input |
| `customer_country` | Text input |
| `challenge` | Textarea |
| `solution` | Textarea |
| `results` | Textarea |
| `quote` | Textarea |
| `quote_author` | Text input |
| `quote_author_company` | Text input |
| `products_used` | Text input (comma-separated) |
| `tags` | Text input (comma-separated; serialised back to JSON array on save) |
| `publish_date` | Date input |

Non-editable fields: `id`, `company_id`, `url`, `first_seen`, `content_hash`, `raw_text`, `customer_logo_url`.

## Files Changed

### Backend
- `backend/schemas.py` — `CaseUpdate` Pydantic schema (all editable fields optional)
- `backend/routers/cases.py` — `PATCH /api/cases/{id}` endpoint

### Frontend
- `frontend/src/lib/api.ts` — `CaseUpdate` interface + `api.cases.update()`
- `frontend/src/hooks/useCases.ts` — `useUpdateCase()` mutation
- `frontend/src/pages/CaseDetail.tsx` — `EditDialog` component + Edit button

## API Reference

See [../api/cases.md](../api/cases.md) for the `PATCH /api/cases/{id}` endpoint spec.
