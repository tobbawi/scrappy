from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, PlainTextResponse
from sqlmodel import Session, select

from database import get_session
from models import ReferenceCase, Company
from schemas import StatsRead

router = APIRouter(prefix="/api", tags=["digest"])


def _get_cases_since(session: Session, since: datetime):
    return session.exec(
        select(ReferenceCase)
        .where(ReferenceCase.first_seen >= since)
        .order_by(ReferenceCase.first_seen.desc())
    ).all()


def _build_digest_data(session: Session, since: datetime):
    cases = _get_cases_since(session, since)
    companies = {c.id: c for c in session.exec(select(Company)).all()}

    by_company: dict[str, list] = {}
    for case in cases:
        by_company.setdefault(case.company_id, []).append(case)

    return {"cases": cases, "by_company": by_company, "companies": companies, "since": since}


def _render_markdown(data: dict) -> str:
    since = data["since"].strftime("%Y-%m-%d")
    lines = [f"# Scrappy Weekly Digest", f"", f"New reference cases since {since}:", ""]

    for company_id, cases in data["by_company"].items():
        company = data["companies"].get(company_id)
        company_name = company.name if company else company_id
        lines.append(f"## {company_name} ({len(cases)} new)")
        lines.append("")
        for case in cases:
            title = case.title or case.url
            lines.append(f"- **{title}**")
            if case.customer_name:
                lines.append(f"  - Customer: {case.customer_name}")
            if case.customer_industry:
                lines.append(f"  - Industry: {case.customer_industry}")
            if case.quote:
                lines.append(f'  - Quote: "{case.quote[:120]}..."' if len(case.quote) > 120 else f'  - Quote: "{case.quote}"')
            lines.append(f"  - URL: {case.url}")
            lines.append("")

    if not data["cases"]:
        lines.append("No new cases found this period.")

    return "\n".join(lines)


def _render_html(data: dict) -> str:
    md = _render_markdown(data)
    # Simple markdown-to-html conversion
    import re
    html = md
    html = re.sub(r"^## (.+)$", r"<h2>\1</h2>", html, flags=re.MULTILINE)
    html = re.sub(r"^# (.+)$", r"<h1>\1</h1>", html, flags=re.MULTILINE)
    html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
    html = re.sub(r"^- (.+)$", r"<li>\1</li>", html, flags=re.MULTILINE)
    html = f"<html><body style='font-family:sans-serif;max-width:800px;margin:auto'>{html}</body></html>"
    return html


@router.get("/digest")
def get_digest(
    since: Optional[str] = None,
    format: str = Query("json", pattern="^(json|html|markdown)$"),
    session: Session = Depends(get_session),
):
    if since:
        since_dt = datetime.fromisoformat(since)
    else:
        since_dt = datetime.utcnow() - timedelta(days=7)

    data = _build_digest_data(session, since_dt)

    if format == "markdown":
        return PlainTextResponse(_render_markdown(data), media_type="text/markdown")
    elif format == "html":
        return HTMLResponse(_render_html(data))
    else:
        return {
            "since": since_dt.isoformat(),
            "total_new": len(data["cases"]),
            "by_company": {
                cid: [
                    {
                        "id": c.id,
                        "title": c.title,
                        "customer_name": c.customer_name,
                        "url": c.url,
                        "first_seen": c.first_seen.isoformat(),
                    }
                    for c in cases
                ]
                for cid, cases in data["by_company"].items()
            },
        }


@router.get("/stats", response_model=StatsRead)
def get_stats(session: Session = Depends(get_session)):
    from sqlmodel import func

    total_companies = session.exec(select(func.count(Company.id))).one()
    active_companies = session.exec(
        select(func.count(Company.id)).where(Company.active == True)
    ).one()
    total_cases = session.exec(select(func.count(ReferenceCase.id))).one()

    week_ago = datetime.utcnow() - timedelta(days=7)
    new_cases_this_week = session.exec(
        select(func.count(ReferenceCase.id)).where(ReferenceCase.first_seen >= week_ago)
    ).one()

    # Last scrape
    from models import ScrapeJob
    last_job = session.exec(
        select(ScrapeJob)
        .where(ScrapeJob.status == "done")
        .order_by(ScrapeJob.finished_at.desc())
    ).first()

    companies = session.exec(select(Company)).all()
    by_status: dict[str, int] = {}
    for c in companies:
        by_status[c.scrape_status] = by_status.get(c.scrape_status, 0) + 1

    return StatsRead(
        total_companies=total_companies,
        active_companies=active_companies,
        total_cases=total_cases,
        new_cases_this_week=new_cases_this_week,
        last_scrape=last_job.finished_at if last_job else None,
        companies_by_status=by_status,
    )
