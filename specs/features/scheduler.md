# Feature Spec — Automated Weekly Scraping

## Overview

Scrappy automatically scrapes all active companies every Friday at 18:00 UTC,
without any manual intervention.

---

## User Stories

### US-1: Automatic weekly scrape

**As a user**, I want case data to stay up-to-date without me triggering scrapes manually,
**so that** I can rely on having fresh data each week.

**Acceptance criteria:**
- Given the backend is running
- When Friday 18:00 UTC arrives
- Then a scrape job is automatically created for all active companies
- And it runs identically to a manually triggered "Scrape All"
- And the Dashboard `last_scrape` stat reflects the scheduled run

---

### US-2: Scheduled job survives restarts

**As a user**, I expect the weekly schedule to persist across app restarts.

**Acceptance criteria:**
- Given the scheduler job is registered
- When the backend is restarted
- Then the next scheduled run still fires at the correct time
- (The job store uses SQLite so the schedule is persisted)

---

## Implementation

- **Scheduler**: APScheduler `BackgroundScheduler`
- **Job store**: `SQLAlchemyJobStore` backed by the same SQLite DB
- **Trigger**: `CronTrigger(day_of_week="fri", hour=18, minute=0, timezone="UTC")`
- **Settings**: `coalesce=True` (skip missed runs), `max_instances=1` (no concurrent runs), 4 worker threads
- **Job ID**: `"weekly_scrape"` (prevents duplicate registration)

## Schedule Info (Settings Page)

The Settings page displays a static notice:
> "Weekly scrape runs every Friday at 18:00 UTC automatically."

No UI controls exist to change the schedule. To modify the schedule, edit `scheduler.py`.

---

## Notes

- The scheduler starts in the FastAPI lifespan `startup` event.
- It shuts down cleanly in the `shutdown` event.
- `scrape_all()` creates a `ScrapeJob` with `company_id=null` and calls `run_scrape_job()`.
