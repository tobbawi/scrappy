# Data Model — Company

Table: `company`

## Fields

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string (PK) | no | — | Slug derived from name (e.g. "acme-corp") |
| `name` | string | no | — | Display name |
| `listing_url` | string | no | — | URL of the page listing all case study links |
| `fetcher_type` | string | no | `"static"` | `"static"` \| `"dynamic"` \| `"stealthy"` |
| `case_path_prefix` | string | yes | `null` | Optional URL path prefix to filter case links |
| `active` | bool | no | `true` | Whether the company is included in scrape runs |
| `created_at` | datetime | no | `utcnow()` | When the company was added |
| `last_scraped_at` | datetime | yes | `null` | When the last scrape job finished for this company |
| `scrape_status` | string | no | `"idle"` | `"idle"` \| `"running"` \| `"success"` \| `"error"` |
| `error_message` | string | yes | `null` | Error detail from the last failed scrape |

## Constraints

- `id` must be unique across all companies.
- Duplicate detection uses the same slugification algorithm.
  "Acme Corp" and "acme corp" will produce the same ID (`acme-corp`) and conflict.

## Relationships

- One company has many `ReferenceCase` (FK: `reference_case.company_id`).
- One company has many `ScrapeJob` (FK: `scrape_job.company_id`, nullable — `null` means "all companies").
- Deleting a company cascades to delete all related cases.

## Slugification

```python
id = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
# "Acme Corp" → "acme-corp"
# "AWS (Amazon)" → "aws-amazon"
```
