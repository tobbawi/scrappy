# API Spec — Cases

Base path: `/api/cases`

---

## GET /api/cases

Paginated list of reference cases with optional filters.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `company` | string | — | Filter by company ID (exact slug) |
| `industry` | string | — | Case-insensitive search on `customer_industry` |
| `country` | string | — | Case-insensitive search on `customer_country` |
| `q` | string (max 200 chars) | — | Full-text search across `title`, `customer_name`, `raw_text`, `tags` |
| `since` | ISO datetime | — | Filter cases where `first_seen >= since`. Returns `400` if not valid ISO 8601. |
| `new_only` | bool | `false` | Shorthand for `since = now - 7 days` |
| `sort` | enum | `"first_seen"` | `"first_seen"` \| `"publish_date"` |
| `page` | int | `1` | Page number (1-indexed) |
| `per_page` | int | `20` | Items per page (max `100`) |

**Response `200`**
```json
{
  "items": [ /* ReferenceCase objects */ ],
  "total": 142,
  "page": 1,
  "per_page": 20,
  "pages": 8
}
```

---

## GET /api/cases/{id}

Get a single case by its 12-char SHA256 ID.

**Path param:** `id` — 12-char hex string

**Response `200`** — Full ReferenceCase object (see data-models/reference-case.md).

**Error `404`** — Case not found.
```json
{ "detail": "Case not found" }
```

---

## ReferenceCase Fields

See [data-models/reference-case.md](../data-models/reference-case.md) for the full field reference.

Key fields returned in list responses:
- `id`, `company_id`, `url`, `title`
- `customer_name`, `customer_industry`, `customer_country`, `customer_logo_url`
- `quote`, `quote_author`, `quote_author_company`
- `tags` (array), `products_used` (array)
- `publish_date`, `first_seen`, `last_checked`
