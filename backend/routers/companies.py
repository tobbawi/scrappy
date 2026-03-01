from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from slugify import slugify
from datetime import datetime

from database import get_session
from models import Company
from schemas import CompanyCreate, CompanyUpdate, CompanyRead

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("", response_model=list[CompanyRead])
def list_companies(session: Session = Depends(get_session)):
    return session.exec(select(Company).order_by(Company.name)).all()


@router.post("", response_model=CompanyRead, status_code=201)
def create_company(data: CompanyCreate, session: Session = Depends(get_session)):
    company_id = slugify(data.name)
    existing = session.get(Company, company_id)
    if existing:
        raise HTTPException(status_code=409, detail="Company with this name already exists")

    company = Company(
        id=company_id,
        name=data.name,
        listing_url=str(data.listing_url),
        fetcher_type=data.fetcher_type,
        case_path_prefix=data.case_path_prefix,
        active=data.active,
        created_at=datetime.utcnow(),
    )
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: str,
    data: CompanyUpdate,
    session: Session = Depends(get_session),
):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)

    session.add(company)
    session.commit()
    session.refresh(company)
    return company


@router.delete("/{company_id}", status_code=204)
def delete_company(company_id: str, session: Session = Depends(get_session)):
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    from models import ReferenceCase
    cases = session.exec(select(ReferenceCase).where(ReferenceCase.company_id == company_id)).all()
    for case in cases:
        session.delete(case)
    session.delete(company)
    session.commit()
