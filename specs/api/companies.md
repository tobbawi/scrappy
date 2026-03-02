# API Spec — Companies

Base path: `/api/companies`

---

## GET /api/companies

Returns a paginated list of companies ordered by name.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | `1` | Page number (1-indexed) |
| `per_page` | int | `100` | Items per page (max `200`) |

**Response `200`**
```json
{
  "items": [
    {
      "id": "acme-corp",
      "name": "Acme Corp",
      "listing_url": "https://acme.com/customers",
      "fetcher_type": "static",
      "case_path_prefix": "/customers/",
      "active": true,
      "created_at": "2026-01-01T00:00:00",
      "last_scraped_at": "2026-01-10T18:00:00",
      "scrape_status": "success",
      "error_message": null
    }
  ],
  "total": 63,
  "page": 1,
  "per_page": 100,
  "pages": 1
}
```

---

## GET /api/companies/{id}

Returns detailed information about a single company, including aggregate statistics computed from its reference cases.

**Path param:** `id` — company slug

**Response `200`**
```json
{
  "id": "acme-corp",
  "name": "Acme Corp",
  "listing_url": "https://acme.com/customers",
  "fetcher_type": "static",
  "case_path_prefix": "/customers/",
  "active": true,
  "created_at": "2026-01-01T00:00:00",
  "last_scraped_at": "2026-01-10T18:00:00",
  "scrape_status": "success",
  "error_message": null,
  "case_count": 47,
  "avg_quality_score": 62.3,
  "top_industries": [
    { "name": "Finance", "count": 12 },
    { "name": "Healthcare", "count": 7 }
  ],
  "top_countries": [
    { "name": "Netherlands", "count": 8 },
    { "name": "Belgium", "count": 5 }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `case_count` | int | Total number of reference cases for this company |
| `avg_quality_score` | float | Average quality score (0–100) across all cases |
| `top_industries` | array | Top 5 customer industries by frequency |
| `top_countries` | array | Top 5 customer countries by frequency |

**Error `404`** — Company not found.

---

## POST /api/companies

Create a new company. Company ID is derived by slugifying the name.

**Request body**
```json
{
  "name": "Acme Corp",
  "listing_url": "https://acme.com/customers",
  "fetcher_type": "static",
  "case_path_prefix": "/customers/"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Display name; ID = slugify(name) |
| `listing_url` | string (URL) | yes | Page containing links to case studies |
| `fetcher_type` | enum | yes | `"static"` \| `"dynamic"` \| `"stealthy"` |
| `case_path_prefix` | string | no | URL path prefix to filter case links |

**Response `201`** — Created Company object (same shape as GET item).

**Error `409`** — Company with same slugified name already exists.
```json
{ "detail": "Company with this name already exists" }
```

---

## PATCH /api/companies/{id}

Update one or more fields on an existing company.

**Path param:** `id` — company slug

**Request body** (all fields optional)
```json
{
  "name": "Acme Corp Updated",
  "listing_url": "https://acme.com/new-customers",
  "fetcher_type": "dynamic",
  "case_path_prefix": "/case-studies/",
  "active": false
}
```

**Response `200`** — Updated Company object.

**Error `404`** — Company not found.

---

## DELETE /api/companies/{id}

Delete a company and **all associated reference cases**.

**Path param:** `id` — company slug

**Response `204`** — No content.

**Error `404`** — Company not found.

---

## Fetcher Types

| Value | Description |
|-------|-------------|
| `static` | Plain httpx GET request with standard headers |
| `dynamic` | Playwright headless Chromium; waits for networkidle (~6s) |
| `stealthy` | Playwright + extra browser-like HTTP headers |

Use `dynamic` or `stealthy` for sites that require JavaScript rendering.
Use `stealthy` for sites with bot-detection.
