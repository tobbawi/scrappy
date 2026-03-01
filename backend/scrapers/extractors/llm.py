"""
LLM extractor — uses a local Ollama model to fill fields that earlier extractors missed.
Only runs when ollama_enabled=True in AppSettings.
"""
import json
import httpx
from bs4 import BeautifulSoup
from .base import BaseExtractor

# Fields the LLM is asked to fill (things heuristics frequently miss)
LLM_FIELDS = [
    "customer_name",
    "customer_industry",
    "customer_country",
    "challenge",
    "solution",
    "results",
    "products_used",
]

SYSTEM_PROMPT = (
    "You are a precise data extraction assistant. "
    "Extract structured fields from customer case study text. "
    "Return ONLY valid JSON with the exact keys requested. "
    "Use null for any field you cannot find. "
    "Do not add explanation, markdown, or extra keys."
)

PROMPT_TEMPLATE = """\
Extract the following fields from this customer case study. Return ONLY a JSON object.

Fields to extract:
{fields_block}

Field rules:
- customer_name: name of the customer/client company featured (not the vendor writing the case study)
- customer_industry: industry vertical of the customer, e.g. "Tourism", "Healthcare", "Finance", "Retail", "Education", "Government", "Technology", "Manufacturing", "Logistics"
- customer_country: two-letter ISO country code if identifiable (e.g. "BE", "US", "NL"), else full country name, else null
- challenge: 1-3 sentences describing the customer's problem or challenge before the solution
- solution: 1-3 sentences describing how the vendor/product solved the challenge
- results: key outcomes, metrics, or benefits achieved (short paragraph or bullet points)
- products_used: JSON array of specific product or technology names mentioned, e.g. ["GPT-4o", "Azure", "Custom API"]

Case study text (first 8000 chars):
---
{raw_text}
---
"""


class LLMExtractor(BaseExtractor):
    def __init__(self, base_url: str, model: str, timeout: int = 60):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def extract(self, soup: BeautifulSoup, data: dict) -> dict:
        missing = [f for f in LLM_FIELDS if not data.get(f)]
        if not missing:
            return data  # nothing to do

        raw_text = (data.get("raw_text") or "")[:8000]
        if not raw_text.strip():
            return data

        fields_block = "\n".join(f"- {f}" for f in missing)
        prompt = PROMPT_TEMPLATE.format(fields_block=fields_block, raw_text=raw_text)

        try:
            extracted = self._call_ollama(prompt)
        except Exception as e:
            print(f"[LLMExtractor] call failed: {e}")
            return data

        null_values = {"null", "none", "n/a", "unknown", "not mentioned", "not specified",
                       "not found", "not available", "not applicable", ""}
        for key in missing:
            value = extracted.get(key)
            if isinstance(value, list):
                value = json.dumps(value) if value else None
            if value and str(value).strip().lower() not in null_values:
                self._set_if_missing(data, key, str(value).strip())

        return data

    def _call_ollama(self, prompt: str) -> dict:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "format": "json",
        }
        with httpx.Client(timeout=self.timeout) as client:
            r = client.post(f"{self.base_url}/api/chat", json=payload)
            r.raise_for_status()
            body = r.json()

        content = body["message"]["content"]
        # Strip markdown code fences if model ignores format directive
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
