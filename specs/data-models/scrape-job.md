# Data Model — ScrapeJob

Table: `scrape_job`

## Fields

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string (PK) | no | UUID4 | Unique job identifier |
| `company_id` | string | yes | `null` | Target company slug; `null` means "all active companies" |
| `status` | string | no | `"queued"` | `"queued"` \| `"running"` \| `"done"` \| `"failed"` |
| `started_at` | datetime | yes | `null` | When the job transitioned to `"running"` (null while queued) |
| `finished_at` | datetime | yes | `null` | When the job reached a terminal status |
| `cases_found` | int | no | `0` | Total cases discovered on listing pages |
| `cases_new` | int | no | `0` | Cases inserted for the first time |
| `error` | text | yes | `null` | Error message if status is `"failed"` |

## Status Lifecycle

```
queued → running → done
                 ↘ failed
```

- `queued`: Row created, background task not yet running.
- `running`: Background task is actively fetching/extracting.
- `done`: Completed with no fatal error. Individual company errors are in `Company.error_message`.
- `failed`: A fatal error prevented the job from completing (e.g., DB write failure).

## Notes

- The API returns the last 50 jobs ordered by `started_at DESC`.
- `cases_found` includes both new cases and previously known cases re-checked.
- `cases_new` counts only first-time inserts (not updates to existing cases).
