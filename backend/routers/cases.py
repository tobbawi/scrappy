from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from math import ceil

from database import get_session
from models import ReferenceCase
from schemas import CaseRead, PaginatedCases

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _case_filters(
    company: Optional[str],
    industry: Optional[str],
    country: Optional[str],
    q: Optional[str],
    since_dt: Optional[datetime],
    new_only: bool,
):
    """Return a list of SQLAlchemy WHERE clauses for the shared filter params."""
    clauses = []
    if company:
        clauses.append(ReferenceCase.company_id == company)
    if industry:
        clauses.append(ReferenceCase.customer_industry.ilike(f"%{industry}%"))
    if country:
        clauses.append(ReferenceCase.customer_country.ilike(f"%{country}%"))
    if q:
        search = f"%{q}%"
        clauses.append(or_(
            ReferenceCase.title.ilike(search),
            ReferenceCase.customer_name.ilike(search),
            ReferenceCase.raw_text.ilike(search),
            ReferenceCase.tags.ilike(search),
        ))
    if since_dt:
        clauses.append(ReferenceCase.first_seen >= since_dt)
    if new_only:
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        clauses.append(ReferenceCase.first_seen >= week_ago)
    return clauses


@router.get("", response_model=PaginatedCases)
def list_cases(
    company: Optional[str] = None,
    industry: Optional[str] = None,
    country: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=200),
    since: Optional[str] = None,
    new_only: bool = False,
    sort: str = Query("first_seen", pattern="^(first_seen|publish_date)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    since_dt: Optional[datetime] = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid 'since' format; use ISO 8601 (e.g. 2025-01-15)")

    clauses = _case_filters(company, industry, country, q, since_dt, new_only)

    sort_col = ReferenceCase.first_seen if sort == "first_seen" else ReferenceCase.publish_date
    query = select(ReferenceCase).where(*clauses).order_by(sort_col.desc())
    count_q = select(func.count(ReferenceCase.id)).where(*clauses)

    total = session.exec(count_q).one()
    offset = (page - 1) * per_page
    items = session.exec(query.offset(offset).limit(per_page)).all()

    return PaginatedCases(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=ceil(total / per_page) if total else 0,
    )


@router.get("/{case_id}", response_model=CaseRead)
def get_case(case_id: str, session: Session = Depends(get_session)):
    case = session.get(ReferenceCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case
