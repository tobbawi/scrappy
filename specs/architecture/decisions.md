# Architecture Decision Records

Each ADR follows the format: **Context → Decision → Consequences**

---

## ADR-001 — SQLite over PostgreSQL

**Date:** 2024 (initial design)

**Context:** Scrappy is a local utility app for a single user. Ease of setup matters
more than concurrent writes or horizontal scaling.

**Decision:** Use SQLite via SQLModel/SQLAlchemy. DB file lives at `data/scrappy.db`.

**Consequences:**
- No external database process needed; zero-config setup.
- Not suitable for multi-user or high-write scenarios.
- Must use sync SQLModel (no async engine with SQLite in this setup).

---

## ADR-002 — Extraction Pipeline "Earlier Wins"

**Date:** 2024 (initial design)

**Context:** Multiple extractor strategies exist (OG tags, JSON-LD, heuristics, LLM).
They disagree on the same fields. Need a deterministic merge strategy.

**Decision:** Run extractors in fixed order: MetaTags → SchemaOrg → Heuristic → LLM.
Each extractor only fills fields that are still `None`; it never overwrites an already-filled field.

**Consequences:**
- Structured signals (OG, JSON-LD) always take precedence over fuzzy heuristics.
- LLM is a last-resort fill-in, not a first-class source.
- Easy to add a new extractor at any position in the chain.
- If an upstream extractor sets a wrong value, downstream cannot correct it.

---

## ADR-003 — Raw Text Storage

**Date:** 2024 (initial design)

**Context:** Re-fetching pages is slow and bandwidth-intensive. LLM extraction may be
added later or improved over time.

**Decision:** Store the full page text (up to 50 KB) in `ReferenceCase.raw_text`.

**Consequences:**
- Future LLM re-runs or model upgrades can operate on stored text without re-scraping.
- Database size grows; capped at 50 KB per case to bound growth.

---

## ADR-004 — Batch Browser Reuse for Dynamic Fetching

**Date:** 2024 (initial design)

**Context:** Playwright launches a browser process per run. Per-page launches were
extremely slow for companies with 50+ case pages.

**Decision:** `fetch_batch()` launches one Playwright browser per scrape job and
reuses it for all pages. Falls back to httpx (static) on failure.

**Consequences:**
- 10–20× faster for dynamic companies compared to per-page launches.
- Memory footprint of one Chromium process during a job.

---

## ADR-005 — Company ID = Slugified Name

**Date:** 2024 (initial design)

**Context:** Need a stable, URL-safe primary key for companies.

**Decision:** `id = slugify(name)` (e.g., "Acme Corp" → "acme-corp").

**Consequences:**
- Human-readable IDs in URLs and logs.
- Renaming a company requires migrating all related case foreign keys.
- Duplicate company detection: same slug = same company.

---

## ADR-006 — Case ID = SHA256(url)[:12]

**Date:** 2024 (initial design)

**Context:** Need a stable, collision-resistant primary key derived from the canonical URL.

**Decision:** `id = sha256(url).hexdigest()[:12]`

**Consequences:**
- Idempotent: re-scraping the same URL always resolves to the same case ID.
- 12 hex chars = 48 bits; collision probability negligible for < 1 M cases.

---

## ADR-007 — Non-Blocking Scrape via BackgroundTasks

**Date:** 2024 (initial design)

**Context:** Scraping can take minutes for large sites. Blocking the HTTP response
would cause timeouts and poor UX.

**Decision:** Use FastAPI `BackgroundTasks` to run scrape jobs. The `/api/scrape`
endpoint returns immediately with a `ScrapeJob` (status=queued); clients poll for status.

**Consequences:**
- Good responsiveness; no HTTP timeouts.
- Job status must be polled (2s interval while running).
- In-process background tasks: if the server crashes mid-job, the job is lost.

---

## ADR-008 — Optional Ollama LLM Integration

**Date:** 2024 (added post-initial)

**Context:** LLM extraction can fill fields that structured/heuristic extractors miss,
but Ollama may not be installed on every machine.

**Decision:** Ollama integration is opt-in, controlled by `AppSettings.ollama_enabled`.
Settings (URL, model, timeout) are stored in a singleton DB row and configurable via UI.

**Consequences:**
- Zero impact on users who don't have Ollama.
- LLM extraction quality depends on the chosen model.
- Adds latency per case when enabled.

---

## ADR-009 — Custom Badge Component (no @radix-ui/react-badge)

**Date:** 2024

**Context:** The `@radix-ui/react-badge` npm package does not exist. Needed a Badge UI primitive.

**Decision:** Implement `Badge` as a custom CVA-based component in `components/ui/badge.tsx`.
Variants: default, success, warning, error, secondary, outline, new.

**Consequences:**
- Full control over variants.
- Must maintain the component manually (no upstream updates).

---

## ADR-010 — SaaS-Style Design System (Indigo + Dark Sidebar)

**Date:** 2026-03

**Context:** Primary users are Sales/BD reps, Marketing, and Management who browse new cases
daily. The original UI was functional but generic (flat, low hierarchy, muted palette).
A more polished design reduces friction and surfaces the "what's new" signal faster.

**Decision:** Adopt a Linear/Vercel-inspired design system:
- **Primary colour**: Indigo-violet (`243 75% 59%`) replaces plain blue (`221 83% 53%`)
- **Sidebar**: Near-black (`240 10% 8%`) with `zinc-400` inactive / `white` active nav states
- **Background**: Subtly warm off-white (`0 0% 98.5%`) instead of pure white
- **Cards**: Pure white with `shadow-card` (`0 1px 3px / .06`) instead of flat borders
- **Borders**: Lightened to `0 0% 92%` (barely visible, like Linear)
- **Design tokens**: Added `--sidebar` and `--sidebar-fg` CSS variables; `shadow-card` Tailwind token
- **Typography**: Added `cv11`, `ss01` font features; `tracking-tight` on all headings
- **Utilities**: `timeAgo()` for relative timestamps; `isNewThisWeek()` for NEW badge logic

**Consequences:**
- Consistent, premium aesthetic without adding new dependencies.
- Dark sidebar requires careful colour contrast checks for nav items.
- `--sidebar` CSS variable must be used (not Tailwind `bg-muted`) for correct dark background.
- `timeAgo()` result updates only on page refresh (no live clock); acceptable for this use case.
