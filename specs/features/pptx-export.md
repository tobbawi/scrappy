# Feature: PowerPoint Export

## User Story

As a user, I want to download the currently filtered cases as a PowerPoint deck, so that I can present reference cases to stakeholders without manual copy-paste.

## Acceptance Criteria

### Given I am on the Cases page
**When** I click "PowerPoint" with no active filters
**Then** a `.pptx` file named `scrappy-cases.pptx` is downloaded containing one slide per case.

**When** I click "PowerPoint" with a company filter active (e.g. `company=stripe`)
**Then** a file named `scrappy-stripe-cases.pptx` is downloaded containing only Stripe cases.

**When** I click "PowerPoint" and there are zero matching cases
**Then** an empty `.pptx` (zero slides) downloads without error.

**When** a case has all body fields null
**Then** the slide renders with just the header and footer — no crash, no empty section boxes.

## Slide Layout (16:9 Widescreen)

Fixed format, sections with no content are omitted and remaining sections shift up:

```
┌─────────────────────────────────────────────────────────────┐
│  [Company]                    [Customer name – bold/large]  │  ← indigo header (#4F46E5)
│  [Industry]  [Country]  [Published date]                    │
├───────────────────────────────┬─────────────────────────────┤
│  CHALLENGE                    │  SOLUTION                   │
│  (text, ≤300 chars)           │  (text, ≤300 chars)         │
├───────────────────────────────┴─────────────────────────────┤
│  RESULTS  (text, ≤400 chars)                                │
├─────────────────────────────────────────────────────────────┤
│  ❝ Quote — Author, Company ❞   (indigo-50 callout box)      │
├─────────────────────────────────────────────────────────────┤
│  Tags: …  │  Products: …  │  URL                            │  
└─────────────────────────────────────────────────────────────┘
```

### Section rules
- **Challenge + Solution row**: shown if either `challenge` or `solution` is non-null; each side may be blank.
- **Results**: shown only if `results` is non-null.
- **Quote**: shown only if `quote` is non-null; attribution appended if `quote_author` present.
- **Header** and **Footer** are always shown.

## Colour Palette

| Token | Hex | Used for |
|-------|-----|---------|
| `header_bg` | `#4F46E5` | Header background |
| `label_fg` | `#6B7280` | Section labels (CHALLENGE, SOLUTION, RESULTS) |
| `body_fg` | `#111827` | Body text |
| `quote_bg` | `#EEF2FF` | Quote section background |
| `quote_fg` | `#312E81` | Quote text |
| `footer_bg` | `#F9FAFB` | Footer background |
| `footer_fg` | `#6B7280` | Footer text |

## UI

- Button labelled **PowerPoint** in the Cases filter bar (right side, next to results count).
- Shows a spinning loader icon while download is in progress; otherwise shows a download icon.
- Respects all active filters: `company`, `industry`, `country`, `q`, `sort`, `new_only`.
