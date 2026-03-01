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

## Constraints

- `ollama_timeout` valid range: 10–300 seconds (enforced in the UI; API does not re-validate).

## Usage

Settings are read at the start of every scrape job to decide whether to include
`LLMExtractor` in the pipeline. They are passed as a dict to `ExtractionPipeline(llm_config=...)`.

## Startup Seed

On app startup (`main.py` lifespan), `get_or_create_settings()` ensures row id=1 exists
with the defaults above.
