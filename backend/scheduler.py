from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from pathlib import Path

DB_DIR = Path(__file__).parent.parent / "data"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "scrappy.db"

scheduler = BackgroundScheduler(
    jobstores={
        "default": SQLAlchemyJobStore(url=f"sqlite:///{DB_PATH}"),
    },
    executors={
        "default": ThreadPoolExecutor(max_workers=4),
    },
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
    },
)


def scrape_all():
    """Triggered by scheduler to scrape all active companies."""
    import uuid
    from datetime import datetime
    from sqlmodel import Session, select
    from database import engine
    from models import ScrapeJob, Company
    from routers.scraping import run_scrape_job

    with Session(engine) as session:
        job = ScrapeJob(
            id=str(uuid.uuid4()),
            company_id=None,
            status="queued",
        )
        session.add(job)
        session.commit()
        job_id = job.id

    run_scrape_job(job_id, None)
