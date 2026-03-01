# API Spec — Settings

Base path: `/api/settings`

AppSettings is a singleton (always row id=1). Created on app startup if absent.

---

## GET /api/settings

Returns the current application settings.

**Response `200`**
```json
{
  "id": 1,
  "ollama_enabled": false,
  "ollama_base_url": "http://localhost:11434",
  "ollama_model": "llama3.2",
  "ollama_timeout": 60
}
```

---

## PATCH /api/settings

Update settings fields. All fields optional.

**Request body**
```json
{
  "ollama_enabled": true,
  "ollama_base_url": "http://localhost:11434",
  "ollama_model": "llama3.2",
  "ollama_timeout": 90
}
```

| Field | Type | Notes |
|-------|------|-------|
| `ollama_enabled` | bool | Enable/disable LLM extraction |
| `ollama_base_url` | string (URL) | Ollama server base URL |
| `ollama_model` | string | Model name (must be pulled in Ollama) |
| `ollama_timeout` | int (10–300) | Seconds to wait per LLM call |

**Response `200`** — Updated AppSettings object.

---

## GET /api/settings/ollama/models

List models available in the configured Ollama instance.

**Response `200`**
```json
{
  "reachable": true,
  "models": ["llama3.2", "mistral", "phi3"],
  "error": null
}
```

If Ollama is unreachable:
```json
{
  "reachable": false,
  "models": [],
  "error": "Connection refused"
}
```

---

## POST /api/settings/ollama/test

Test connectivity to Ollama and verify the configured model is available.

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
| `reachable` | bool | Can reach `ollama_base_url` |
| `model_available` | bool | Configured model is in available models list |
| `available_models` | string[] | All models found in Ollama |
| `error` | string \| null | Error message if unreachable |
