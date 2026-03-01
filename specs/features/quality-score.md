# Feature Spec — Quality Score

## User Story

As a user browsing reference cases,
I want to see a quality score on each case,
so that I can quickly identify thin or incomplete entries that need manual enrichment.

## Acceptance Criteria

**Given** I open the Cases list page
**When** cases are displayed
**Then** each card shows a coloured score pill in the header row (e.g. `72%`)
**And** the colour reflects completeness: red (<40), yellow (40–69), green (≥70)

**Given** I open a Case Detail page
**When** the case is loaded
**Then** a quality badge appears next to the case title with the same colour scheme

**Given** a case with all extractable fields populated
**When** the score is computed
**Then** the score is 100

**Given** a case with all extractable fields null
**When** the score is computed
**Then** the score is 0

## Implementation

**Frontend-only** — no DB column or API change required. Score is computed on the fly
from the existing `ReferenceCase` object using `computeQualityScore()` in `lib/utils.ts`.

### Scoring weights (total = 100)

| Field | Weight |
|-------|--------|
| `customer_name` | 20 |
| `challenge` | 15 |
| `solution` | 15 |
| `results` | 15 |
| `quote` | 10 |
| `customer_industry` | 10 |
| `title` | 5 |
| `customer_country` | 5 |
| `products_used` (non-empty) | 5 |

### Colour thresholds

| Score | Colour |
|-------|--------|
| ≥ 70 | Green |
| 40–69 | Yellow |
| < 40 | Red |

### Files changed

- `frontend/src/lib/utils.ts` — `computeQualityScore(c: ReferenceCase): number`
- `frontend/src/pages/CaseDetail.tsx` — `<QualityBadge>` next to title
- `frontend/src/pages/Cases.tsx` — score pill in each card header row
