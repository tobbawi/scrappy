# Feature Spec — Weekly Digest

## Overview

The digest surfaces all new case studies found since a given date,
grouped by company. It can be viewed in the UI or downloaded as HTML or Markdown.

---

## User Stories

### US-1: View weekly digest in UI

**As a user**, I want to see a summary of new cases added in the last 7 days,
**so that** I can quickly review what's new.

**Acceptance criteria:**
- Given I navigate to `/digest`
- Then cases with `first_seen >= now - 7 days` are shown, grouped by company
- And each group shows company name, case count, and a list of case titles with links
- And a total count "N new cases since DATE" is shown at the top

---

### US-2: Change the digest time range

**As a user**, I want to adjust the look-back period to 7, 14, or 30 days,
**so that** I can see cases from a longer period without a date picker.

**Acceptance criteria:**
- Given I click a segment in the "7 days / 14 days / 30 days" control
- Then the digest is immediately reloaded with cases since `now - N days`
- And the active segment is visually highlighted

---

### US-3: Download digest as Markdown

**As a user**, I want to download the digest as a Markdown file,
**so that** I can paste it into a Slack message, wiki, or email.

**Acceptance criteria:**
- Given I click "Download Markdown"
- Then the browser downloads a `.md` file with the digest content

---

### US-4: Download digest as HTML

**As a user**, I want to download the digest as an HTML file,
**so that** I can send it as a newsletter or import it into a CMS.

**Acceptance criteria:**
- Given I click "Download HTML"
- Then the browser downloads a `.html` file with the digest content

---

## UI

### Digest Page (`/digest`)

- **Segmented time control**: pill buttons — "7 days" (default) | "14 days" | "30 days"; active segment has white background + shadow
- Total count: "N new cases since DATE"
- Download buttons: "Markdown" (Download icon) and "HTML" (Download icon)
- Grouped cards:
  - Card header: company name (left) + case count (right)
  - Case rows: company initial avatar (28 px), title, customer name, first seen date, "View →" link

---

## API Endpoints

- `GET /api/digest?since=<date>&format=json|html|markdown`

See [api/digest.md](../api/digest.md).
