# Feature Spec — LLM Extraction

## Overview

Optional LLM-based extraction fills in case fields that structured extractors
(OG tags, JSON-LD, heuristics) couldn't find. Supports locally running Ollama
instances and any OpenAI-compatible inference server (llama.cpp, vLLM, LocalAI, LM Studio).

---

## User Stories

### US-1: Select LLM provider

**As a user**, I want to choose between Ollama, an OpenAI-compatible server, or no LLM,
**so that** I can use whichever inference backend I have running.

**Acceptance criteria:**
- Given I navigate to Settings
- When I select a provider from the "Provider" dropdown (None / Ollama / OpenAI-compatible)
- Then the selection is persisted as `llm_provider`
- And provider-specific configuration fields are shown
- And future scrape jobs use the selected provider

---

### US-2: Configure LLM connection

**As a user**, I want to set the base URL, model, and timeout for my chosen provider.

**Acceptance criteria:**
- Given I have selected a provider
- When I fill in the base URL, model name, and timeout and save
- Then those values are persisted and used by the next scrape job
- And Ollama and OpenAI-compatible settings are stored independently

---

### US-3: Pick from available models

**As a user**, I want to see a list of models available on my inference server,
**so that** I don't have to type the model name manually.

**Acceptance criteria:**
- Given the server is reachable at the configured URL
- When I open the model picker (or click the refresh button)
- Then a dropdown shows all available models
- And I can select one
- If the server is unreachable, a text input fallback is shown

---

### US-4: Test LLM connection

**As a user**, I want to verify that the server is reachable and the chosen model is available
before running a scrape.

**Acceptance criteria:**
- Given I click "Test connection"
- Then the UI shows: reachable (yes/no), model available (yes/no), list of available models
- If unreachable, an error message is shown

---

## Extraction Behavior

- LLMExtractor is the 4th (last) step in the pipeline.
- It only fills fields that are still `None` after prior extractors.
- Input: first 8,000 characters of `raw_text`.
- Output fields: `customer_name`, `customer_industry`, `customer_country`, `challenge`, `solution`, `results`, `products_used`, `quote`, `quote_author`.
- Handles both clean JSON and markdown-fenced JSON responses via `_parse_json()`.
- Timeout controlled by the provider-specific timeout setting.

### Provider dispatch

`LLMExtractor.__init__` accepts a `provider` parameter (`"ollama"` or `"openai"`).
`_call_llm()` dispatches to:
- **Ollama**: `POST {base_url}/api/chat` with `format: "json"`, reads `body.message.content`
- **OpenAI-compatible**: `POST {base_url}/v1/chat/completions` with `response_format: {"type": "json_object"}`, reads `body.choices[0].message.content`

## Auto-detection (fallback)

When `llm_provider="none"`, `detect_ollama()` in `pipeline.py` probes `http://localhost:11434/api/tags`
at the start of each scrape job. If Ollama is reachable with at least one model, it is used automatically.

Preferred model selection order: `llama3.2`, `llama3`, `mistral`, `phi3`, `phi`, `gemma`.

---

## Settings UI

- Provider selector dropdown (None / Ollama / OpenAI-compatible)
- Provider-specific fields shown conditionally:
  - Base URL input + connectivity status indicator + refresh button
  - Model dropdown (populated from live model list, with text input fallback)
  - Timeout input (10–300 seconds)
- Save button
- Test Connection button + result panel
- Info text for OpenAI-compatible: "Works with llama.cpp, vLLM, LocalAI, LM Studio, etc."

---

## API Endpoints

- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/settings/llm/models?provider=ollama|openai`
- `POST /api/settings/llm/test?provider=ollama|openai`
- `GET /api/settings/ollama/models` (legacy alias)
- `POST /api/settings/ollama/test` (legacy alias)

See [api/settings.md](../api/settings.md).
