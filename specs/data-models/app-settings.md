# Data Model — AppSettings

Table: `app_settings`

Singleton table (always exactly one row with `id=1`). Created on app startup if absent.

## Fields

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | int (PK) | no | `1` | Always 1 (singleton) |
| `ollama_enabled` | bool | no | `false` | Enable Ollama LLM extraction in the pipeline |
| `ollama_base_url` | string | no | `"http://localhost:11434"` | Base URL of the Ollama HTTP server |
| `ollama_model` | string | no | `"llama3.2"` | Model name to use for extraction |
| `ollama_timeout` | int | no | `60` | Seconds before an LLM request times out |
| `scraper_enabled_fields` | TEXT (JSON) | no | `"[]"` | JSON array of field names to **disable** post-extraction; empty = all enabled |
| `scraper_heuristic_labels` | TEXT (JSON) | no | `"{}"` | JSON object mapping field name → list of extra section-header keywords for heuristic extractor |

## Constraints

- `ollama_timeout` valid range: 10–300 seconds (enforced in the UI; API does not re-validate).

## Usage

Settings are read at the start of every scrape job:
- `ollama_*` fields decide whether to include `LLMExtractor` in the pipeline (`ExtractionPipeline(llm_config=...)`)
- `scraper_enabled_fields` and `scraper_heuristic_labels` are passed as `scraper_config` to `ExtractionPipeline(scraper_config=...)`

## Startup Seed

On app startup (`main.py` lifespan), `get_or_create_settings()` ensures row id=1 exists
with the defaults above.
