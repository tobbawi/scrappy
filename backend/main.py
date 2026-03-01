from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from routers import companies, cases, scraping, digest
from routers import settings as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Seed default settings row if absent
    from database import engine
    from sqlmodel import Session
    from routers.settings import get_or_create_settings
    with Session(engine) as s:
        get_or_create_settings(s)

    from scheduler import scheduler, scrape_all
    scheduler.start()
    # Weekly scrape every Friday at 18:00
    if not scheduler.get_job("weekly_scrape"):
        scheduler.add_job(
            scrape_all,
            "cron",
            day_of_week="fri",
            hour=18,
            id="weekly_scrape",
            replace_existing=True,
        )
    yield
    scheduler.shutdown()


app = FastAPI(title="Scrappy", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router)
app.include_router(cases.router)
app.include_router(scraping.router)
app.include_router(digest.router)
app.include_router(settings_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
