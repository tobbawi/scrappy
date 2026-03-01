#!/usr/bin/env python3
"""
Re-run the improved extraction pipeline on all existing cases in the DB.
Re-fetches live HTML and overwrites extracted fields.
Preserves: id, url, company_id, first_seen, content_hash.

Usage:
    cd backend
    python ../scripts/reextract_cases.py
"""
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlmodel import Session, select
from database import engine
from models import ReferenceCase, Company
from scrapers.fetcher import fetch_batch
from scrapers.case import build_case_from_data
from scrapers.extractors.pipeline import ExtractionPipeline, detect_ollama

EXTRACTED_FIELDS = [
    "title", "customer_name", "customer_industry", "customer_country",
    "customer_logo_url", "challenge", "solution", "results", "products_used",
    "quote", "quote_author", "quote_author_company", "publish_date", "tags",
    "raw_text", "last_checked",
]


def field_count(case: ReferenceCase) -> int:
    trackable = [
        "title", "customer_name", "customer_industry", "customer_country",
        "challenge", "solution", "results", "products_used",
        "quote", "publish_date", "tags",
    ]
    return sum(1 for f in trackable if getattr(case, f, None))


def main():
    # Auto-detect Ollama
    llm_config = detect_ollama()
    if llm_config:
        print(f"Ollama detected: {llm_config['model']} at {llm_config['base_url']}")
    else:
        print("Ollama not detected — running heuristics only")

    pipeline = ExtractionPipeline(llm_config=llm_config)

    with Session(engine) as session:
        companies = session.exec(select(Company)).all()

        total_before = 0
        total_after = 0
        total_cases = 0

        for company in companies:
            cases = session.exec(
                select(ReferenceCase).where(ReferenceCase.company_id == company.id)
            ).all()

            if not cases:
                continue

            print(f"\n{'='*60}")
            print(f"Company: {company.name} ({len(cases)} cases, fetcher: {company.fetcher_type})")
            print(f"{'='*60}")

            urls = [c.url for c in cases]
            case_by_url = {c.url: c for c in cases}

            print(f"Fetching {len(urls)} pages...", flush=True)
            html_map = fetch_batch(urls, company.fetcher_type)
            print(f"Fetched {len(html_map)} pages. Running extraction pipeline...")

            for url, html in html_map.items():
                existing = case_by_url.get(url)
                if not existing:
                    continue

                before = field_count(existing)

                data = pipeline.run(html, url)
                new_case = build_case_from_data(data, company.id, html)
                if new_case is None:
                    print(f"  SKIP (build failed): {url}")
                    continue

                # Update extracted fields, preserve id / url / company_id / first_seen / content_hash
                for field in EXTRACTED_FIELDS:
                    setattr(existing, field, getattr(new_case, field, None))
                existing.last_checked = datetime.utcnow()
                session.add(existing)

                after = field_count(existing)
                delta = after - before
                delta_str = f"{delta:+d}" if delta != 0 else " ="
                slug = url.split("/")[-1][:50]
                print(f"  {delta_str:>3}  ({before}→{after}/11)  {slug}")

                total_before += before
                total_after += after
                total_cases += 1

            session.commit()

        print(f"\n{'='*60}")
        print(f"DONE  —  {total_cases} cases updated")
        if total_cases:
            print(f"Avg fields before : {total_before / total_cases:.1f} / 11")
            print(f"Avg fields after  : {total_after  / total_cases:.1f} / 11")
            print(f"Total improvement : {total_after - total_before:+d} fields")


if __name__ == "__main__":
    main()
