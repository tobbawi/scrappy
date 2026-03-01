# API Spec — Digest & Stats

---

## GET /api/digest

Returns new cases found since a given date, grouped by company.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `since` | ISO date string | 7 days ago | Start date for "new" cases |
| `format` | enum | `"json"` | `"json"` \| `"html"` \| `"markdown"` |

**Response `200` (format=json)**
```json
{
  "since": "2026-02-22",
  "total_new": 14,
  "by_company": {
    "acme-corp": {
      "company_name": "Acme Corp",
      "cases": [
        {
          "id": "a1b2c3d4e5f6",
          "title": "How Acme Helped Globex Cut Costs",
          "customer_name": "Globex",
          "url": "https://acme.com/customers/globex",
          "first_seen": "2026-02-25T12:00:00"
        }
      ]
    }
  }
}
```

**Response `200` (format=html or format=markdown)**
- Returns file download with `Content-Disposition: attachment`
- HTML: rendered digest page
- Markdown: plain markdown document

---

## GET /api/stats

Dashboard statistics.

**Response `200`**
```json
{
  "total_companies": 62,
  "active_companies": 58,
  "total_cases": 3412,
  "new_cases_this_week": 24,
  "last_scrape": "2026-02-28T18:00:00",
  "companies_by_status": {
    "success": 55,
    "error": 3,
    "running": 0,
    "idle": 4
  }
}
```

| Field | Description |
|-------|-------------|
| `total_companies` | All companies (active + inactive) |
| `active_companies` | Companies with `active=true` |
| `total_cases` | All reference cases in the database |
| `new_cases_this_week` | Cases with `first_seen` in the last 7 days |
| `last_scrape` | `started_at` of the most recently completed scrape job |
| `companies_by_status` | Count of companies per `scrape_status` value |
