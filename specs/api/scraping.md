# API Spec — Scraping

Base path: `/api/scrape`

---

## POST /api/scrape

Trigger a scrape job. The job runs as a background task; the response returns
immediately with the created job so the client can poll for status.

**Request body**
```json
{ "company_id": "acme-corp" }
```

| Field | Type | Notes |
|-------|------|-------|
| `company_id` | string | Company slug, or `"all"` to scrape every active company |

**Response `202`** — ScrapeJob object (status `"queued"`).
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "acme-corp",
  "status": "queued",
  "started_at": "2026-03-01T10:00:00",
  "finished_at": null,
  "cases_found": 0,
  "cases_new": 0,
  "error": null
}
```

---

## GET /api/scrape/jobs

List the most recent scrape jobs, descending by start time.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `company_id` | string | — | Filter jobs by company slug. Omit to list all jobs. |
| `limit` | int | `50` | Max number of jobs to return (max `200`) |

**Response `200`** — Array of ScrapeJob objects.

---

## GET /api/scrape/jobs/{id}

Get a single scrape job by UUID.

**Path param:** `id` — UUID string

**Response `200`** — ScrapeJob object.

**Error `404`** — Job not found.

---

## Job Lifecycle

```
queued → running → done
                 ↘ failed
```

| Status | Description |
|--------|-------------|
| `queued` | Job created, background task not yet running |
| `running` | Actively fetching and extracting |
| `done` | Completed successfully |
| `failed` | Encountered an unrecoverable error |

---

## Scrape Job Fields

See [data-models/scrape-job.md](../data-models/scrape-job.md) for the full field reference.

---

## Scraping Pipeline (internal)

1. Fetch listing page → extract all case URLs matching `case_path_prefix`
2. `fetch_batch(urls, fetcher_type)` — reuses one Playwright browser for dynamic/stealthy
3. For each fetched HTML:
   - Run `ExtractionPipeline` → data dict
   - Compute `content_hash = MD5(html)`
   - If case exists and `content_hash` unchanged → skip
   - Else insert (new) or update (changed) `ReferenceCase`
4. Update `Company.last_scraped_at`, `Company.scrape_status`
5. Mark `ScrapeJob.status = "done"` with counts
