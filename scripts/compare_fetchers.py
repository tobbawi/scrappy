#!/usr/bin/env python3
"""
Compare current fetcher (Playwright) vs Scrapling on real cases from the DB.
Measures extraction quality: how many fields each approach fills per case.

Usage:
    cd backend
    python ../scripts/compare_fetchers.py [--n 5]
"""
import sys
import time
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlmodel import Session, select, func
from database import engine
from models import ReferenceCase, Company
from scrapers.extractors.pipeline import ExtractionPipeline

FIELDS = [
    "title", "customer_name", "customer_industry", "customer_country",
    "challenge", "solution", "results", "products_used",
    "quote", "publish_date", "tags",
]
MAX_FIELDS = len(FIELDS)


# ── Fetchers ──────────────────────────────────────────────────────────────────

def fetch_current(url: str, fetcher_type: str) -> tuple[str | None, float]:
    from scrapers.fetcher import fetch
    t0 = time.time()
    try:
        html = fetch(url, fetcher_type)
        return html, time.time() - t0
    except Exception as e:
        print(f"    [current] FAILED: {e}")
        return None, time.time() - t0


def fetch_scrapling(url: str, fetcher_type: str) -> tuple[str | None, float]:
    t0 = time.time()
    try:
        if fetcher_type == "static":
            from scrapling.fetchers import Fetcher
            page = Fetcher().get(url)
        else:
            # dynamic / stealthy → DynamicFetcher (Playwright-based, better fingerprinting)
            from scrapling.fetchers import DynamicFetcher
            page = DynamicFetcher().fetch(url)
        return str(page.html_content), time.time() - t0
    except Exception as e:
        print(f"    [scrapling] FAILED: {e}")
        return None, time.time() - t0


# ── Extraction ────────────────────────────────────────────────────────────────

def extract(html: str, url: str) -> dict:
    return ExtractionPipeline().run(html, url)


def score(data: dict) -> tuple[int, list[str]]:
    """Return (filled_count, list_of_filled_field_names)."""
    filled = [f for f in FIELDS if data.get(f)]
    return len(filled), filled


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n", type=int, default=5, help="Number of cases to test (default: 5)")
    args = parser.parse_args()

    # Sample cases, one per company to maximise variety
    with Session(engine) as session:
        companies = session.exec(select(Company)).all()
        if not companies:
            print("No companies in DB. Add companies and run a scrape first.")
            sys.exit(1)

        cases_to_test: list[tuple[ReferenceCase, Company]] = []
        for company in companies:
            rows = session.exec(
                select(ReferenceCase)
                .where(ReferenceCase.company_id == company.id)
                .limit(args.n)
            ).all()
            for case in rows:
                cases_to_test.append((case, company))
                if len(cases_to_test) >= args.n:
                    break
            if len(cases_to_test) >= args.n:
                break

    if not cases_to_test:
        print("No cases found. Run a scrape first.")
        sys.exit(1)

    print(f"\nScrappy Fetcher Comparison — {len(cases_to_test)} cases, {MAX_FIELDS} fields each")
    print("=" * 80)

    totals = {"current": 0, "scrapling": 0}
    rows_for_table = []

    for i, (case, company) in enumerate(cases_to_test, 1):
        url = case.url
        short_url = (url[:64] + "…") if len(url) > 65 else url
        print(f"\n[{i}/{len(cases_to_test)}] {short_url}")
        print(f"    Company: {company.name}  |  Fetcher type: {company.fetcher_type}")

        # Current
        print("    Fetching with current (Playwright)…", end=" ", flush=True)
        html_cur, t_cur = fetch_current(url, company.fetcher_type)
        n_cur, fields_cur = score(extract(html_cur, url)) if html_cur else (0, [])
        print(f"{n_cur}/{MAX_FIELDS} fields  ({t_cur:.1f}s)")

        # Scrapling
        print("    Fetching with Scrapling…", end=" ", flush=True)
        html_scr, t_scr = fetch_scrapling(url, company.fetcher_type)
        n_scr, fields_scr = score(extract(html_scr, url)) if html_scr else (0, [])
        print(f"{n_scr}/{MAX_FIELDS} fields  ({t_scr:.1f}s)")

        delta = n_scr - n_cur
        gained = sorted(set(fields_scr) - set(fields_cur))
        lost   = sorted(set(fields_cur) - set(fields_scr))
        if gained:
            print(f"    ✓ Scrapling gained: {', '.join(gained)}")
        if lost:
            print(f"    ✗ Scrapling lost:   {', '.join(lost)}")

        totals["current"]  += n_cur
        totals["scrapling"] += n_scr
        rows_for_table.append((short_url, company.fetcher_type, n_cur, t_cur, n_scr, t_scr, delta))

    # Summary table
    n = len(cases_to_test)
    print("\n" + "=" * 80)
    print(f"{'URL':<66} {'Type':<9} {'Cur':>4} {'Scr':>4} {'Δ':>4}")
    print("-" * 80)
    for url, ftype, n_cur, t_cur, n_scr, t_scr, delta in rows_for_table:
        delta_str = f"{delta:+d}" if delta != 0 else " 0"
        print(f"{url:<66} {ftype:<9} {n_cur:>4} {n_scr:>4} {delta_str:>4}")
    print("-" * 80)
    avg_cur = totals["current"] / n
    avg_scr = totals["scrapling"] / n
    total_delta = totals["scrapling"] - totals["current"]
    print(f"{'AVERAGE':<66} {'':9} {avg_cur:>4.1f} {avg_scr:>4.1f} {total_delta:>+4d}")
    print()
    if total_delta > 0:
        print(f"Scrapling fills {total_delta} more field(s) total — worth investigating further.")
    elif total_delta < 0:
        print(f"Current stack fills {abs(total_delta)} more field(s) total — Scrapling not better here.")
    else:
        print("Both approaches produce identical extraction quality on this sample.")


if __name__ == "__main__":
    main()
