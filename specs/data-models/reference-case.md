# Data Model — ReferenceCase

Table: `reference_case`

## Fields

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string (PK) | no | — | SHA256(url)[:12] hex string |
| `company_id` | string (FK) | no | — | References `company.id` |
| `url` | string (unique) | no | — | Canonical case study URL |
| `title` | string | yes | `null` | Page / case title |
| `customer_name` | string | yes | `null` | Name of the featured customer |
| `customer_industry` | string | yes | `null` | Customer's industry vertical |
| `customer_country` | string | yes | `null` | Customer's country |
| `customer_logo_url` | string | yes | `null` | URL of the customer logo image |
| `challenge` | text | yes | `null` | Problem the customer faced |
| `solution` | text | yes | `null` | How the vendor solved it |
| `results` | text | yes | `null` | Outcomes / metrics |
| `products_used` | string (JSON) | yes | `null` | JSON array: `["Product A", "Product B"]` |
| `quote` | text | yes | `null` | Testimonial quote text |
| `quote_author` | string | yes | `null` | Name of the person quoted |
| `quote_author_company` | string | yes | `null` | Company of the person quoted |
| `publish_date` | date | yes | `null` | Date the case study was published |
| `tags` | string (JSON) | yes | `null` | JSON array: `["cloud", "security"]` |
| `first_seen` | datetime | no | `utcnow()` | When scrappy first discovered this case |
| `last_checked` | datetime | no | `utcnow()` | When scrappy last fetched this case |
| `content_hash` | string | yes | `null` | MD5(html); used to detect page changes |
| `raw_text` | text | yes | `null` | Full page text (capped at 50 KB) |

## Constraints

- `url` is unique across the entire table.
- `content_hash` is recalculated on every scrape; the row is only updated if it changes.

## JSON fields

`products_used` and `tags` are stored as JSON strings in SQLite.
The API serializes/deserializes them as arrays. The frontend utility `parseTags(raw)` handles
both JSON array strings and comma-separated plain strings.

## ID derivation

```python
id = hashlib.sha256(url.encode()).hexdigest()[:12]
```

## Extraction sources

Fields are populated by the extraction pipeline in priority order:

| Priority | Extractor | Fields typically filled |
|----------|-----------|------------------------|
| 1 | MetaTagExtractor | `title`, `customer_logo_url`, `publish_date` |
| 2 | SchemaOrgExtractor | `title`, `customer_name`, `publish_date` |
| 3 | HeuristicExtractor | `title`, `customer_name`, `quote`, `results`, `customer_industry`, `tags` |
| 4 | LLMExtractor | `customer_name`, `customer_country`, `challenge`, `solution`, `results`, `products_used` |
