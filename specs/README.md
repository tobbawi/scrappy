# Scrappy — Spec-Driven Development

This folder is the **single source of truth** for what Scrappy does and how it works.
All specs must be kept up-to-date whenever features are added, changed, or removed.

## Structure

```
specs/
├── README.md                 # This file
├── architecture/
│   ├── overview.md           # System design, tech stack, component diagram
│   └── decisions.md          # Architecture Decision Records (ADRs)
├── api/
│   ├── companies.md          # /api/companies endpoints
│   ├── cases.md              # /api/cases endpoints
│   ├── scraping.md           # /api/scrape endpoints
│   ├── digest.md             # /api/digest + /api/stats endpoints
│   └── settings.md           # /api/settings endpoints
├── data-models/
│   ├── company.md            # Company table
│   ├── reference-case.md     # ReferenceCase table
│   ├── scrape-job.md         # ScrapeJob table
│   └── app-settings.md       # AppSettings table
└── features/
    ├── company-management.md # Add, edit, delete companies
    ├── case-scraping.md      # Scraping pipeline
    ├── case-browsing.md      # Browse, filter, search cases
    ├── digest.md             # Weekly digest generation
    ├── llm-extraction.md     # Ollama LLM extraction
    └── scheduler.md          # Automated weekly scraping
```

## Spec Maintenance Rules

1. **New feature** → add a `features/<feature-name>.md` spec _before_ writing code
2. **New API endpoint** → update the corresponding `api/<router>.md`
3. **Model change** (add/remove/rename field) → update `data-models/<model>.md`
4. **Architecture decision** → append an ADR to `architecture/decisions.md`
5. **Feature removed** → delete or mark the spec deprecated; remove references from other specs

## Spec Format Conventions

- **Feature specs**: User story + acceptance criteria (Given/When/Then)
- **API specs**: Method + path, request schema, response schema, error codes
- **Data model specs**: Field table with type, nullable, default, and description
- **ADRs**: Context → Decision → Consequences (one ADR per decision)
