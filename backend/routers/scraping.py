import json
import queue
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from database import get_session
from models import ScrapeJob, Company
from schemas import ScrapeRequest, ScrapeJobRead

router = APIRouter(prefix="/api/scrape", tags=["scraping"])


# ── Job Event Bus ─────────────────────────────────────────────────────────────

class JobEventBus:
    """Thread-safe event bus for a single scrape job.

    Background thread writes events; SSE endpoint reads them.
    Late-joining clients replay from the start via the in-memory buffer.
    """

    def __init__(self):
        self._events: list[str] = []   # serialised JSON strings
        self._done = False
        self._cond = threading.Condition()

    def emit(self, event: dict):
        event.setdefault("ts", datetime.now(timezone.utc).isoformat())
        with self._cond:
            self._events.append(json.dumps(event))
            self._cond.notify_all()

    def close(self):
        with self._cond:
            self._done = True
            self._cond.notify_all()

    @property
    def done(self) -> bool:
        return self._done

    def snapshot(self) -> tuple[list[str], bool]:
        with self._cond:
            return list(self._events), self._done

    def wait_for_more(self, current_len: int, timeout: float = 15.0) -> bool:
        with self._cond:
            if len(self._events) > current_len or self._done:
                return True
            self._cond.wait(timeout=timeout)
            return len(self._events) > current_len or self._done


# Module-level registry: job_id → JobEventBus
_buses: dict[str, JobEventBus] = {}
_buses_lock = threading.Lock()


def _get_or_create_bus(job_id: str) -> JobEventBus:
    with _buses_lock:
        if job_id not in _buses:
            _buses[job_id] = JobEventBus()
        return _buses[job_id]


def _cleanup_bus(job_id: str, delay: float = 600.0):
    """Remove the in-memory bus after `delay` seconds (default 10 min)."""
    def _remove():
        time.sleep(delay)
        with _buses_lock:
            _buses.pop(job_id, None)
    threading.Thread(target=_remove, daemon=True).start()


# ── Scrape Job Runner ─────────────────────────────────────────────────────────

def run_scrape_job(job_id: str, company_id: Optional[str]):
    """Background task: runs the actual scraping and emits SSE events."""
    from database import engine
    from sqlmodel import Session
    from scrapers.listing import get_case_urls
    from models import ReferenceCase
    from scrapers.fetcher import fetch_batch
    from scrapers.extractors.pipeline import ExtractionPipeline, detect_ollama
    from scrapers.case import build_case_from_data
    from routers.settings import get_or_create_settings

    bus = _get_or_create_bus(job_id)

    with Session(engine) as session:
        job = session.get(ScrapeJob, job_id)
        if not job:
            return

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        session.add(job)
        session.commit()

        try:
            if company_id and company_id != "all":
                companies = [session.get(Company, company_id)]
                if not companies[0]:
                    raise ValueError(f"Company {company_id} not found")
            else:
                companies = session.exec(
                    select(Company).where(Company.active == True)
                ).all()

            bus.emit({"type": "job_started", "company_count": len(companies)})

            # Resolve LLM config once for the whole job
            app_settings = get_or_create_settings(session)
            if app_settings.ollama_enabled:
                llm_config = {
                    "enabled": True,
                    "base_url": app_settings.ollama_base_url,
                    "model": app_settings.ollama_model,
                    "timeout": app_settings.ollama_timeout,
                }
            else:
                llm_config = detect_ollama()

            if llm_config:
                bus.emit({"type": "llm_config", "model": llm_config["model"],
                          "base_url": llm_config["base_url"]})

            # Build scraper config from settings
            scraper_config = {
                "disabled_fields": json.loads(app_settings.scraper_enabled_fields or "[]"),
                "heuristic_labels": json.loads(app_settings.scraper_heuristic_labels or "{}"),
            }

            total_found = 0
            total_new = 0

            for company in companies:
                company.scrape_status = "running"
                session.add(company)
                session.commit()

                try:
                    urls = get_case_urls(
                        company.listing_url,
                        company.fetcher_type,
                        company.case_path_prefix,
                    )
                    bus.emit({
                        "type": "company_started",
                        "company_id": company.id,
                        "company_name": company.name,
                        "url_count": len(urls),
                    })

                    bus.emit({
                        "type": "fetch_start",
                        "company_id": company.id,
                        "url_count": len(urls),
                        "fetcher_type": company.fetcher_type,
                    })
                    t_fetch = time.time()
                    html_map = fetch_batch(urls, company.fetcher_type)
                    bus.emit({
                        "type": "fetch_done",
                        "company_id": company.id,
                        "fetched": len(html_map),
                        "duration_ms": int((time.time() - t_fetch) * 1000),
                    })

                    total_found += len(urls)
                    pipeline = ExtractionPipeline(llm_config=llm_config, scraper_config=scraper_config)
                    cases_new_company = 0

                    for idx, (url, html) in enumerate(html_map.items()):
                        bus.emit({
                            "type": "case_start",
                            "url": url,
                            "index": idx + 1,
                            "total": len(html_map),
                        })

                        existing = session.exec(
                            select(ReferenceCase).where(ReferenceCase.url == url)
                        ).first()

                        def on_event(event: dict, _url=url):
                            event["url"] = _url
                            bus.emit(event)

                        data = pipeline.run(html, url, on_event=on_event)
                        case_data = build_case_from_data(data, company.id, html)

                        if case_data is None:
                            bus.emit({"type": "case_error", "url": url,
                                      "error": "build_case_from_data returned None"})
                            continue

                        if existing:
                            if existing.content_hash != case_data.content_hash:
                                for field in case_data.model_fields:
                                    if field not in ("id", "first_seen"):
                                        setattr(existing, field, getattr(case_data, field))
                                session.add(existing)
                                bus.emit({"type": "case_saved", "url": url,
                                          "case_id": existing.id, "is_new": False})
                            else:
                                bus.emit({"type": "case_skip", "url": url,
                                          "reason": "unchanged"})
                        else:
                            session.add(case_data)
                            cases_new_company += 1
                            total_new += 1
                            bus.emit({"type": "case_saved", "url": url,
                                      "case_id": case_data.id, "is_new": True})

                    session.commit()
                    company.scrape_status = "success"
                    company.last_scraped_at = datetime.now(timezone.utc)
                    company.error_message = None
                    bus.emit({
                        "type": "company_done",
                        "company_id": company.id,
                        "company_name": company.name,
                        "cases_found": len(html_map),
                        "cases_new": cases_new_company,
                    })

                except Exception as e:
                    company.scrape_status = "error"
                    company.error_message = str(e)
                    bus.emit({"type": "company_error", "company_id": company.id,
                              "error": str(e)})

                session.add(company)
                session.commit()

            job.status = "done"
            job.cases_found = total_found
            job.cases_new = total_new
            bus.emit({"type": "job_done", "cases_found": total_found,
                      "cases_new": total_new})

        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            bus.emit({"type": "job_failed", "error": str(e)})

        finally:
            job.finished_at = datetime.now(timezone.utc)
            # Persist the log
            events, _ = bus.snapshot()
            job.log = json.dumps([json.loads(e) for e in events])
            session.add(job)
            session.commit()
            bus.close()
            _cleanup_bus(job_id)


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=ScrapeJobRead, status_code=202)
def trigger_scrape(
    data: ScrapeRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    company_id = data.company_id if data.company_id != "all" else None

    if company_id:
        company = session.get(Company, company_id)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

    job = ScrapeJob(
        id=str(uuid.uuid4()),
        company_id=company_id,
        status="queued",
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    background_tasks.add_task(run_scrape_job, job.id, company_id)
    return job


@router.get("/jobs", response_model=list[ScrapeJobRead])
def list_jobs(session: Session = Depends(get_session)):
    return session.exec(
        select(ScrapeJob).order_by(ScrapeJob.started_at.desc()).limit(50)
    ).all()


@router.get("/jobs/{job_id}", response_model=ScrapeJobRead)
def get_job(job_id: str, session: Session = Depends(get_session)):
    job = session.get(ScrapeJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs/{job_id}/stream")
def stream_job(job_id: str, session: Session = Depends(get_session)):
    """SSE endpoint: streams live job events while running, replays log for finished jobs."""
    job = session.get(ScrapeJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # For finished jobs not in memory, reconstruct bus from stored log
    with _buses_lock:
        if job_id not in _buses and job.log:
            replay_bus = JobEventBus()
            for event in json.loads(job.log):
                replay_bus.emit(event)
            replay_bus.close()
            _buses[job_id] = replay_bus
            _cleanup_bus(job_id, delay=60.0)

    bus = _get_or_create_bus(job_id)

    def generate():
        sent = 0
        while True:
            events, is_done = bus.snapshot()
            while sent < len(events):
                yield f"data: {events[sent]}\n\n"
                sent += 1
            if is_done:
                yield "event: done\ndata: {}\n\n"
                break
            bus.wait_for_more(sent, timeout=15.0)
            if sent == len(bus.snapshot()[0]) and not bus.done:
                yield ": keepalive\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
