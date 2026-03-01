from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from math import ceil

from database import get_session
from models import ReferenceCase
from schemas import CaseRead, PaginatedCases

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("", response_model=PaginatedCases)
def list_cases(
    company: Optional[str] = None,
    industry: Optional[str] = None,
    country: Optional[str] = None,
    q: Optional[str] = None,
    since: Optional[str] = None,
    new_only: bool = False,
    sort: str = Query("first_seen", pattern="^(first_seen|publish_date)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    query = select(ReferenceCase)

    if company:
        query = query.where(ReferenceCase.company_id == company)
    if industry:
        query = query.where(ReferenceCase.customer_industry.ilike(f"%{industry}%"))
    if country:
        query = query.where(ReferenceCase.customer_country.ilike(f"%{country}%"))
    if q:
        search = f"%{q}%"
        query = query.where(
            or_(
                ReferenceCase.title.ilike(search),
                ReferenceCase.customer_name.ilike(search),
                ReferenceCase.raw_text.ilike(search),
                ReferenceCase.tags.ilike(search),
            )
        )
    if since:
        since_dt = datetime.fromisoformat(since)
        query = query.where(ReferenceCase.first_seen >= since_dt)
    if new_only:
        week_ago = datetime.utcnow() - timedelta(days=7)
        query = query.where(ReferenceCase.first_seen >= week_ago)

    sort_col = ReferenceCase.first_seen if sort == "first_seen" else ReferenceCase.publish_date
    query = query.order_by(sort_col.desc())

    count_query = select(func.count()).select_from(ReferenceCase)
    # Apply same filters to count (rebuild)
    count_q = select(func.count(ReferenceCase.id))
    if company:
        count_q = count_q.where(ReferenceCase.company_id == company)
    if industry:
        count_q = count_q.where(ReferenceCase.customer_industry.ilike(f"%{industry}%"))
    if country:
        count_q = count_q.where(ReferenceCase.customer_country.ilike(f"%{country}%"))
    if q:
        search = f"%{q}%"
        count_q = count_q.where(
            or_(
                ReferenceCase.title.ilike(search),
                ReferenceCase.customer_name.ilike(search),
                ReferenceCase.raw_text.ilike(search),
                ReferenceCase.tags.ilike(search),
            )
        )
    if since:
        count_q = count_q.where(ReferenceCase.first_seen >= datetime.fromisoformat(since))
    if new_only:
        week_ago = datetime.utcnow() - timedelta(days=7)
        count_q = count_q.where(ReferenceCase.first_seen >= week_ago)

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
