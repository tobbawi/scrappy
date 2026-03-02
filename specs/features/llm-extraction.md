# Feature Spec — LLM Extraction (Ollama)

## Overview

Optional LLM-based extraction fills in case fields that structured extractors
(OG tags, JSON-LD, heuristics) couldn't find. Uses a locally running Ollama instance.

---

## User Stories

### US-1: Enable Ollama extraction

**As a user**, I want to turn on LLM-based extraction with my local Ollama,
**so that** more case fields are automatically populated.

**Acceptance criteria:**
- Given I navigate to Settings
- When I toggle "Enable Ollama LLM Extraction" on and save
- Then future scrape jobs include the LLM extractor as the last pipeline step
- And only empty fields are passed to the LLM (earlier extractors are not overridden)

---

### US-2: Configure Ollama connection

**As a user**, I want to set the Ollama base URL, model, and timeout.

**Acceptance criteria:**
- Given I fill in the base URL (default: http://localhost:11434), model name, and timeout
- When I save settings
- Then those values are persisted and used by the next scrape job

---

### US-3: Pick from available models

**As a user**, I want to see a list of models available in my Ollama instance,
**so that** I don't have to type the model name manually.

**Acceptance criteria:**
- Given Ollama is reachable at the configured URL
- When I open the model picker
- Then a dropdown shows all available models
- And I can select one to set `ollama_model`

---

### US-4: Test Ollama connection

**As a user**, I want to verify that Ollama is reachable and the chosen model is available
before running a scrape.

**Acceptance criteria:**
- Given I click "Test Connection"
- Then the UI shows: reachable (yes/no), model available (yes/no), list of available models
- If unreachable, an error message is shown

---

## Extraction Behavior

- LLMExtractor is the 4th (last) step in the pipeline.
- It only fills fields that are still `None` after prior extractors.
- Input: first 8,000 characters of `raw_text`.
- Output fields: `customer_name`, `customer_industry`, `customer_country`, `challenge`, `solution`, `results`, `products_used`, `quote`, `quote_author`.
- Request format: JSON (`format: "json"`) via Ollama `/api/chat`.
- Handles both clean JSON and markdown-fenced JSON responses.
- Timeout controlled by `AppSettings.ollama_timeout`.

## Auto-detection (Embedded Ollama)

`detect_ollama()` in `pipeline.py` probes `http://localhost:11434/api/tags` at the start of each scrape job.
If Ollama is reachable with at least one model, it is used automatically — even if `ollama_enabled=False` in settings.
Explicit settings always override auto-detection when `ollama_enabled=True`.

Preferred model selection order: `llama3.2`, `llama3`, `mistral`, `phi3`, `phi`, `gemma`.

---

## Settings UI

- Toggle switch (enabled / disabled)
- Base URL input + connectivity status indicator
- Model dropdown (populated from live Ollama models list, with text input fallback)
- Timeout slider / input (10–300 seconds)
- Save button
- Test Connection button + result panel

---

## API Endpoints

- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/settings/ollama/models`
- `POST /api/settings/ollama/test`

See [api/settings.md](../api/settings.md).
