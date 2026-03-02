# API: Export

Router prefix: `/api/export`

---

## GET /api/export/pptx

Download all cases matching the given filters as a PowerPoint (`.pptx`) file.

### Query Parameters

| Parameter  | Type    | Required | Default      | Description |
|------------|---------|----------|--------------|-------------|
| `company`  | string  | No       | —            | Filter by exact company ID |
| `industry` | string  | No       | —            | Case-insensitive substring match on `customer_industry` |
| `country`  | string  | No       | —            | Case-insensitive substring match on `customer_country` |
| `q`        | string  | No       | —            | Full-text search on title, customer name, raw text, tags (max 200 chars) |
| `since`    | string  | No       | —            | ISO 8601 date; only cases with `first_seen` ≥ this value |
| `new_only` | boolean | No       | `false`      | Only cases seen in the last 7 days |
| `sort`     | string  | No       | `first_seen` | `first_seen` or `publish_date` (descending) |

### Response

- **200 OK** — binary `.pptx` file
  - `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`
  - `Content-Disposition: attachment; filename="scrappy-cases.pptx"`
- No pagination — all matching cases are included.
- Zero matching cases → valid empty presentation (zero slides), no error.

### Notes

- Uses the same `_case_filters()` helper as `GET /api/cases` to ensure filter parity.
- Slide layout: 16:9 widescreen (12 192 000 × 6 858 000 EMU).
- Text is truncated per section (challenge/solution: 300 chars, results: 400 chars, quote: 200 chars).
