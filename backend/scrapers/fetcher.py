"""
Fetcher abstraction: static (httpx), dynamic (playwright headless), stealthy (playwright + extra headers).

Performance note: Use fetch_batch() when scraping multiple URLs for the same company —
it reuses a single browser instance instead of launching one per page.
"""
import httpx
from typing import Optional

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def fetch_static(url: str) -> str:
    """Fetch page HTML using httpx (no JS)."""
    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.text


def fetch_dynamic(url: str, stealth: bool = False) -> str:
    """Fetch a single URL using a fresh Playwright browser instance."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        html = _fetch_with_browser(browser, url, stealth)
        browser.close()
        return html


def _fetch_with_browser(browser, url: str, stealth: bool = False) -> str:
    """Fetch a URL using an existing Playwright browser instance."""
    context = browser.new_context(
        user_agent=HEADERS["User-Agent"],
        locale="en-US",
        extra_http_headers={"Accept-Language": "en-US,en;q=0.9"} if stealth else {},
    )
    page = context.new_page()
    page.goto(url, wait_until="domcontentloaded", timeout=30_000)
    try:
        page.wait_for_load_state("networkidle", timeout=6_000)
    except Exception:
        pass
    html = page.content()
    context.close()
    return html


def fetch_batch(urls: list[str], fetcher_type: str = "static") -> dict[str, str]:
    """
    Fetch multiple URLs, returning a dict of url → html.
    For dynamic/stealthy: reuses a single browser instance (much faster than one per page).
    For static: uses httpx with connection pooling.
    Falls back to static for individual pages that fail dynamic fetch.
    """
    if fetcher_type == "static":
        results = {}
        with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=30) as client:
            for url in urls:
                try:
                    r = client.get(url)
                    r.raise_for_status()
                    results[url] = r.text
                except Exception as e:
                    print(f"[fetch_batch] static failed {url}: {e}")
        return results

    # dynamic or stealthy — single browser instance
    from playwright.sync_api import sync_playwright

    stealth = fetcher_type == "stealthy"
    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for url in urls:
            try:
                results[url] = _fetch_with_browser(browser, url, stealth)
            except Exception as e:
                print(f"[fetch_batch] dynamic failed {url}, trying static: {e}")
                try:
                    results[url] = fetch_static(url)
                except Exception as e2:
                    print(f"[fetch_batch] static fallback also failed {url}: {e2}")
        browser.close()

    return results


def fetch(url: str, fetcher_type: str = "static") -> str:
    """Dispatch to appropriate fetcher based on fetcher_type."""
    if fetcher_type == "static":
        return fetch_static(url)
    elif fetcher_type in ("dynamic", "stealthy"):
        return fetch_dynamic(url, stealth=(fetcher_type == "stealthy"))
    else:
        raise ValueError(f"Unknown fetcher_type: {fetcher_type}")
