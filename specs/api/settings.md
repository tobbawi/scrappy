# API Spec — Settings

Base path: `/api/settings`

AppSettings is a singleton (always row id=1). Created on app startup if absent.

When the settings row is first created, if the `OLLAMA_HOST` environment variable is set,
its value is used as the initial `ollama_base_url` (e.g. `http://host.docker.internal:11434`
in Docker). After initial creation, the field is fully user-controlled via `PATCH /api/settings`.

---

## GET /api/settings

Returns the current application settings.

**Response `200`**
```json
{
  "llm_provider": "none",
  "ollama_base_url": "http://localhost:11434",
  "ollama_model": "llama3.2",
  "ollama_timeout": 60,
  "openai_base_url": "http://localhost:8080",
  "openai_model": "",
  "openai_timeout": 60,
  "scraper_enabled_fields": [],
  "scraper_heuristic_labels": {}
}
```

---

## PATCH /api/settings

Update settings fields. All fields optional.

**Request body**
```json
{
  "llm_provider": "ollama",
  "ollama_base_url": "http://localhost:11434",
  "ollama_model": "llama3.2",
  "ollama_timeout": 90,
  "openai_base_url": "http://localhost:8080",
  "openai_model": "my-model",
  "openai_timeout": 60
}
```

| Field | Type | Notes |
|-------|------|-------|
| `llm_provider` | string | `"none"` \| `"ollama"` \| `"openai"` — selects LLM backend |
| `ollama_base_url` | string (URL) | Ollama server base URL |
| `ollama_model` | string | Model name (must be pulled in Ollama) |
| `ollama_timeout` | int (10–300) | Seconds to wait per LLM call |
| `openai_base_url` | string (URL) | OpenAI-compatible server base URL |
| `openai_model` | string | Model name served by the inference server |
| `openai_timeout` | int (10–300) | Seconds to wait per LLM call |

**Response `200`** — Updated AppSettings object.

---

## GET /api/settings/llm/models?provider=

Fetch available models from the configured LLM provider.

**Query params**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `provider` | string | `"ollama"` | `"ollama"` or `"openai"` |

**Response `200`**
```json
{
  "reachable": true,
  "models": ["llama3.2", "mistral", "phi3"],
  "error": null
}
```

If server is unreachable:
```json
{
  "reachable": false,
  "models": [],
  "error": "Connection refused"
}
```

---

## POST /api/settings/llm/test?provider=

Test connectivity to the LLM provider and verify the configured model is available.

**Query params**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `provider` | string | `"ollama"` | `"ollama"` or `"openai"` |

**Response `200`**
```json
{
  "reachable": true,
  "model_available": true,
  "available_models": ["llama3.2", "mistral"],
  "error": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `reachable` | bool | Can reach the configured base URL |
| `model_available` | bool | Configured model is in available models list |
| `available_models` | string[] | All models found on the server |
| `error` | string \| null | Error message if unreachable |

---

## Legacy Endpoints

These endpoints are kept for backward compatibility and delegate internally.

### GET /api/settings/ollama/models

Equivalent to `GET /api/settings/llm/models?provider=ollama`.

### POST /api/settings/ollama/test

Equivalent to `POST /api/settings/llm/test?provider=ollama`.
