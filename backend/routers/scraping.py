import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select

from database import get_session
from models import ScrapeJob, Company
from schemas import ScrapeRequest, ScrapeJobRead

router = APIRouter(prefix="/api/scrape", tags=["scraping"])


def run_scrape_job(job_id: str, company_id: Optional[str]):
    """Background task: runs the actual scraping."""
    from database import engine
    from sqlmodel import Session
    from scrapers.listing import get_case_urls
    from scrapers.case import scrape_case
    from models import ReferenceCase

    with Session(engine) as session:
        job = session.get(ScrapeJob, job_id)
        if not job:
            return

        job.status = "running"
        job.started_at = datetime.utcnow()
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
                    total_found += len(urls)

                    # Fetch all case pages in batch (reuses one browser for dynamic)
                    from scrapers.fetcher import fetch_batch
                    from scrapers.extractors.pipeline import ExtractionPipeline
                    from scrapers.case import build_case_from_data
                    from routers.settings import get_or_create_settings

                    app_settings = get_or_create_settings(session)
                    llm_config = {
                        "enabled": app_settings.ollama_enabled,
                        "base_url": app_settings.ollama_base_url,
                        "model": app_settings.ollama_model,
                        "timeout": app_settings.ollama_timeout,
                    }
                    pipeline = ExtractionPipeline(llm_config=llm_config)
                    html_map = fetch_batch(urls, company.fetcher_type)

                    for url, html in html_map.items():
                        existing = session.exec(
                            select(ReferenceCase).where(ReferenceCase.url == url)
                        ).first()

                        data = pipeline.run(html, url)
                        case_data = build_case_from_data(data, company.id, html)
                        if case_data is None:
                            continue

                        if existing:
                            if existing.content_hash != case_data.content_hash:
                                for field in case_data.model_fields:
                                    if field not in ("id", "first_seen"):
                                        setattr(existing, field, getattr(case_data, field))
                                session.add(existing)
                        else:
                            session.add(case_data)
                            total_new += 1

                    session.commit()
                    company.scrape_status = "success"
                    company.last_scraped_at = datetime.utcnow()
                    company.error_message = None
                except Exception as e:
                    company.scrape_status = "error"
                    company.error_message = str(e)

                session.add(company)
                session.commit()

            job.status = "done"
            job.cases_found = total_found
            job.cases_new = total_new

        except Exception as e:
            job.status = "failed"
            job.error = str(e)
        finally:
            job.finished_at = datetime.utcnow()
            session.add(job)
            session.commit()


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
    jobs = session.exec(
        select(ScrapeJob).order_by(ScrapeJob.started_at.desc()).limit(50)
    ).all()
    return jobs


@router.get("/jobs/{job_id}", response_model=ScrapeJobRead)
def get_job(job_id: str, session: Session = Depends(get_session)):
    job = session.get(ScrapeJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
