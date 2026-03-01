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
- And each group shows company name and a list of case titles with links
- And a total count "N new cases since DATE" is shown at the top

---

### US-2: Change the digest date range

**As a user**, I want to adjust the "since" date to see cases from a longer or shorter period.

**Acceptance criteria:**
- Given I use the date picker to change the "since" date
- When I click Refresh
- Then the digest is reloaded with cases since that date

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

- Date picker (defaults to 7 days ago)
- Refresh button
- Total count: "N new cases since DATE"
- Download buttons: "Markdown" and "HTML"
- Grouped list:
  - Company name header + case count badge
  - Case items: title link, customer name, first seen date

---

## API Endpoints

- `GET /api/digest?since=<date>&format=json|html|markdown`

See [api/digest.md](../api/digest.md).
