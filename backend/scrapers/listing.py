from typing import Optional
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from .fetcher import fetch

CASE_URL_SIGNALS = ["case", "customer", "success", "story", "reference", "client"]


def is_same_domain(href: str, base_url: str) -> bool:
    try:
        href_host = urlparse(href).netloc
        base_host = urlparse(base_url).netloc
        # strip www prefix for comparison
        return href_host.lstrip("www.") == base_host.lstrip("www.")
    except Exception:
        return False


def is_case_url(href: str, base_url: str, path_prefix: Optional[str]) -> bool:
    """
    Returns True if the href looks like a case study URL.
    Uses path_prefix if provided, otherwise falls back to signal words.
    """
    if not href or href.startswith(("mailto:", "tel:", "#", "javascript:")):
        return False

    parsed = urlparse(href)

    # Skip non-HTTP(S)
    if parsed.scheme and parsed.scheme not in ("http", "https", ""):
        return False

    # Must be same domain (or relative)
    if parsed.netloc and not is_same_domain(href, base_url):
        return False

    path = parsed.path.lower()

    if path_prefix:
        return path.startswith(path_prefix.lower())

    return any(s in path for s in CASE_URL_SIGNALS)


def normalize_url(href: str, base_url: str) -> str:
    """Resolve relative URLs and strip fragments."""
    url = urljoin(base_url, href)
    parsed = urlparse(url)
    # Remove fragment
    return parsed._replace(fragment="").geturl()


def get_case_urls(
    listing_url: str,
    fetcher_type: str = "static",
    path_prefix: Optional[str] = None,
) -> list[str]:
    """Fetch listing page and return deduplicated case URLs."""
    html = fetch(listing_url, fetcher_type)
    soup = BeautifulSoup(html, "lxml")

    seen = set()
    urls = []

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href:
            continue

        full_url = normalize_url(href, listing_url)

        if full_url in seen:
            continue
        if not is_case_url(full_url, listing_url, path_prefix):
            continue

        # Skip listing page itself
        if full_url.rstrip("/") == listing_url.rstrip("/"):
            continue

        seen.add(full_url)
        urls.append(full_url)

    return urls
