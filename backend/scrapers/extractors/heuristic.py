import re
import json
from bs4 import BeautifulSoup, Tag
from .base import BaseExtractor

INDUSTRY_KEYWORDS = [
    "finance", "banking", "insurance", "retail", "e-commerce", "healthcare",
    "manufacturing", "technology", "telecom", "media", "education", "government",
    "energy", "logistics", "automotive", "pharma", "hospitality", "real estate",
    "tourism", "travel", "nonprofit", "legal", "consulting", "construction",
    "utilities", "aerospace", "agriculture", "entertainment", "sports",
]

CUSTOMER_SIGNAL_CLASSES = [
    "customer", "client", "company-name", "org-name", "logo-title",
    "hero-title", "case-study-title",
]

QUOTE_SIGNAL_CLASSES = [
    "quote", "testimonial", "blockquote", "pull-quote", "callout-quote",
]

RESULT_SIGNAL_CLASSES = [
    "results", "outcomes", "stats", "metrics", "impact", "achievements",
]

# Section label texts → field name mapping
SECTION_LABELS: dict[str, list[str]] = {
    "challenge": [
        "the challenge", "challenge", "the problem", "problem statement",
        "business challenge", "situation", "the situation", "pain point",
        "context", "background",
        # Dutch
        "de uitdaging", "uitdaging", "het probleem", "het vraagstuk",
        "aanleiding", "de situatie", "achtergrond",
        # French
        "le défi", "défi", "le problème", "la situation",
    ],
    "solution": [
        "the solution", "solution", "our solution", "approach", "our approach",
        "how we solved it", "what we built", "our work", "the project",
        "how it works", "under the hood", "what we did",
        # Dutch
        "de oplossing", "oplossing", "onze oplossing", "onze aanpak",
        "aanpak", "de aanpak", "wat we bouwden", "het project", "hoe het werkt",
        # French
        "la solution", "notre solution", "notre approche",
    ],
    "results": [
        "result", "the result", "results", "the results", "outcomes", "the outcomes", "impact",
        "the impact", "benefits", "key results", "key outcomes", "achievements",
        "numbers", "the numbers", "what we achieved",
        # Dutch
        "resultaten", "de resultaten", "het resultaat", "de impact",
        "impact", "voordelen", "de voordelen", "wat we bereikten", "de cijfers", "cijfers",
        # French
        "résultats", "les résultats",
    ],
}

_TAG_NOISE = frozenset({
    "contact", "contact us", "contacteer ons", "neem contact op",
    "newsletter", "subscribe", "read more", "learn more",
    "meer lezen", "lees meer", "bekijk meer", "view more", "see more",
    "download", "get started", "sign up", "log in", "login", "register",
    "back to top", "home", "menu", "search", "close", "share",
    "let's talk!", "laten we praten", "laten we aan tafel gaan zitten!",
    "get in touch", "reach out", "talk to us", "click here",
    "all", "all categories", "latest", "new", "featured",
    # Video player controls
    "play", "pause", "mute", "unmute", "enter fullscreen", "exit fullscreen",
    "enable captions", "disable captions", "bekijk video",
    # Navigation items
    "over ons", "wat we doen", "jobs", "routebeschrijving",
    "terug naar overzicht", "contact opnemen",
    # CTA / promo
    "gratis demo", "meer weten", "privacy policy", "algemene voorwaarden",
    "start vandaag!", "start mijn transformatie!", "aan de slag met mijn data!",
    # Filter UI
    "filter on offer", "filter on sector", "filter op aanbod", "filter op sector",
    # Misc noise
    "made by", "implementatie copy", "community", "kickstarters", "essential",
    "managed services",
})

_DUTCH_MONTHS = {
    "januari": "January", "februari": "February", "maart": "March",
    "april": "April", "mei": "May", "juni": "June",
    "juli": "July", "augustus": "August", "september": "September",
    "oktober": "October", "november": "November", "december": "December",
    "janvier": "January", "février": "February", "mars": "March",
    "avril": "April", "mai": "May", "juin": "June",
    "juillet": "July", "août": "August", "septembre": "September",
    "octobre": "October", "novembre": "November", "décembre": "December",
}

_BOILERPLATE_SIGNALS = [
    "technology agnostic company",
    "we always explore multiple",
    "map your processes",
    "wat we al gedaan hebben",
    "slim informatiebeheer. zonder complexiteit",
]

_TESTIMONIAL_LABELS = frozenset({
    "testimonial", "testimonials", "what our clients say", "what they say",
    "client story", "customer story", "wat klanten zeggen", "getuigenis",
    "getuigenissen", "klantervaring", "témoignage",
})


class HeuristicExtractor(BaseExtractor):
    """Fallback extractor using HTML structure heuristics."""

    def __init__(self, custom_labels: dict[str, list[str]] | None = None, company_name: str | None = None):
        self._company_name = company_name
        # Copy module-level SECTION_LABELS so we can extend without mutation
        self._section_labels: dict[str, list[str]] = {
            k: list(v) for k, v in SECTION_LABELS.items()
        }
        # Add "{company_name} {label}" variants (e.g. "formica solution")
        if company_name:
            cn = company_name.strip().lower()
            for field in list(self._section_labels):
                for lbl in list(self._section_labels[field]):
                    if " " not in lbl:  # single-word core labels
                        self._section_labels[field].append(f"{cn} {lbl}")
        if custom_labels:
            for field, extra in custom_labels.items():
                if field in self._section_labels:
                    self._section_labels[field] = self._section_labels[field] + [
                        lbl.lower() for lbl in extra
                    ]
                elif extra:
                    # Field not in built-in labels (e.g. tags) — store separately
                    self._section_labels[field] = [lbl.lower() for lbl in extra]

    def extract(self, soup: BeautifulSoup, data: dict) -> dict:
        self._extract_title(soup, data)
        self._extract_customer_name(soup, data)
        self._extract_challenge(soup, data)
        self._extract_solution(soup, data)
        self._extract_results(soup, data)
        self._extract_quote(soup, data)
        self._extract_industry(soup, data)
        self._extract_publish_date(soup, data)
        self._extract_tags(soup, data)
        return data

    # ── Title ──────────────────────────────────────────────────────────────

    def _extract_title(self, soup: BeautifulSoup, data: dict):
        if data.get("title"):
            return
        h1 = soup.find("h1")
        if h1:
            self._set_if_missing(data, "title", h1.get_text(strip=True))

    # ── Customer name ──────────────────────────────────────────────────────

    def _extract_customer_name(self, soup: BeautifulSoup, data: dict):
        if data.get("customer_name"):
            return

        # 1. Extract from og:description / title: "for [Company]", "[Company]:", etc.
        for source in [data.get("_og_description", ""), data.get("title", "")]:
            name = self._customer_from_text(source or "")
            if name:
                self._set_if_missing(data, "customer_name", name)
                return

        # 2. Semantic class names
        for cls in CUSTOMER_SIGNAL_CLASSES:
            el = soup.find(class_=re.compile(cls, re.I))
            if el:
                text = el.get_text(strip=True)
                if text and len(text) < 80:
                    self._set_if_missing(data, "customer_name", text)
                    return

        # 3. Title pattern: "CustomerName - VendorName"
        if self._company_name and not data.get("customer_name"):
            title = data.get("title") or ""
            for sep in [" - ", " | ", " — ", " – "]:
                if sep in title:
                    parts = title.split(sep)
                    for part in parts:
                        part = part.strip()
                        if part and part.lower() != self._company_name.strip().lower():
                            self._set_if_missing(data, "customer_name", part)
                            break
                    if data.get("customer_name"):
                        break

        # 4. <img alt> near "logo" class
        logo_img = soup.find("img", class_=re.compile("logo", re.I))
        if logo_img:
            alt = logo_img.get("alt", "").strip()
            if alt and len(alt) < 60:
                self._set_if_missing(data, "customer_name", alt)

        # Guard: if extracted name matches the vendor (site owner), clear it
        if self._company_name and data.get("customer_name"):
            if data["customer_name"].strip().lower() == self._company_name.strip().lower():
                data["customer_name"] = None

    def _customer_from_text(self, text: str) -> str | None:
        """Try to extract a customer name from a title or description string."""
        if not text:
            return None
        # "[Company]'s ..." — possessive pattern (e.g. "Spire's Mascot")
        m = re.match(
            r"^(?:\w+\s+)?([A-Z][A-Za-z0-9&\.\-]+(?:\s+[A-Z][A-Za-z0-9&\.\-]+)?)(?:'s|'s)\s+",
            text,
        )
        if m:
            return m.group(1).strip()
        # "Helping [Company] [verb]"
        m = re.search(
            r"\b[Hh]elping\s+([A-Z][A-Za-z0-9\s&\.]{2,40}?)"
            r"(?:\s+(?:to|[A-Z][a-z]*(?:e|ing|ify|ise|ize|ld|im|ain|ch))\b|\s+[a-z]|\s*[,\.]|$)",
            text,
        )
        if m:
            return m.group(1).strip()
        # "[Company]: description" at start
        m = re.match(r"^([A-Z0-9][A-Za-z0-9\s&\.]{2,40}):\s+\w", text)
        if m:
            return m.group(1).strip()
        # "How/Why/Inside [Company] verb..."
        m = re.match(
            r"(?:How|Why|What|Inside)\s+([A-Z][A-Za-z0-9\s&,\.]+?)\s+"
            r"(?:uses?|achieve|built|saved|scaled|grew|reduced|improved|leveraged|deployed)",
            text,
        )
        if m:
            return m.group(1).strip()
        # "... for [Company]" — consecutive capitalized words after "for"
        m = re.search(
            r"\bfor\s+((?:[A-Z][A-Za-z0-9&\.\'-]*\s*)+?)(?:\s+[a-z]|\s*[,\.\!\?\|]|$)", text
        )
        if m:
            return m.group(1).strip()
        return None

    # ── Challenge / Solution / Results ─────────────────────────────────────

    def _extract_challenge(self, soup: BeautifulSoup, data: dict):
        self._extract_section(soup, data, "challenge", self._section_labels["challenge"])

    def _extract_solution(self, soup: BeautifulSoup, data: dict):
        self._extract_section(soup, data, "solution", self._section_labels["solution"])

    def _extract_results(self, soup: BeautifulSoup, data: dict):
        if data.get("results"):
            return

        # 1. Semantic class names for result containers
        for cls in RESULT_SIGNAL_CLASSES:
            el = soup.find(class_=re.compile(cls, re.I))
            if el:
                text = el.get_text(" ", strip=True)
                if len(text) > 10:
                    self._set_if_missing(data, "results", text[:1000])
                    return

        # 2. Section label / heading approach
        self._extract_section(soup, data, "results", self._section_labels["results"])

    def _extract_section(self, soup: BeautifulSoup, data: dict, key: str, labels: list[str]):
        """Find a section label element, then collect the content that follows it."""
        if data.get(key):
            return

        labels_lower = {lbl.lower() for lbl in labels}

        # Pass 1: heading elements whose text exactly matches a label
        for tag in ["h2", "h3", "h4"]:
            for heading in soup.find_all(tag):
                if heading.get_text(strip=True).lower() in labels_lower:
                    content = self._section_content_after(heading, labels_lower)
                    if content and self._valid_section_content(content):
                        self._set_if_missing(data, key, content)
                        return

        # Pass 2: any short element whose entire text is a label (e.g. <p class="paragraph">The challenge</p>)
        for el in soup.find_all(["p", "span", "div", "strong", "b", "label"]):
            el_text = el.get_text(strip=True).lower()
            if el_text in labels_lower:
                content = self._section_content_after(el, labels_lower)
                if content and self._valid_section_content(content):
                    self._set_if_missing(data, key, content)
                    return

    @staticmethod
    def _valid_section_content(content: str) -> bool:
        """Return False for too-short content or known boilerplate."""
        if len(content) < 20:
            return False
        content_lower = content.lower()
        return not any(signal in content_lower for signal in _BOILERPLATE_SIGNALS)

    def _section_content_after(self, anchor_el, stop_labels: set[str]) -> str:
        """Collect sibling text after anchor_el, stopping at the next section label or heading."""
        parts: list[str] = []
        for sib in anchor_el.find_next_siblings():
            sib_text = sib.get_text(" ", strip=True)
            if not sib_text or len(sib_text) < 5:
                continue
            if sib_text.lower() in stop_labels:
                break
            if sib.name in ("h1", "h2", "h3", "h4"):
                break
            parts.append(sib_text)
            if sum(len(p) for p in parts) > 1500:
                break
        combined = " ".join(parts).strip()
        return combined[:1500] if combined else ""

    # ── Quote ──────────────────────────────────────────────────────────────

    def _looks_like_author(self, text: str) -> str | None:
        """Return cleaned author string if text looks like an author attribution, else None."""
        text = text.strip()
        # Strip leading dash/bullet prefixes
        text = re.sub(r"^[-–—•]\s*", "", text).strip()
        if not text or len(text) > 120 or len(text) < 3:
            return None
        if "http" in text.lower() or text.count(",") > 4 or text.count(".") > 3:
            return None
        if not text[0].isupper() or "?" in text:
            return None
        if len(text.split()) >= 2 or "," in text:
            return text
        return None

    def _extract_quote(self, soup: BeautifulSoup, data: dict):
        if data.get("quote"):
            return

        # 0. Testimonial section label detection
        for heading in soup.find_all(["h2", "h3", "h4", "p", "div", "span"]):
            if heading.get_text(strip=True).lower() in _TESTIMONIAL_LABELS:
                for sib in heading.find_next_siblings():
                    sib_text = sib.get_text(strip=True)
                    if len(sib_text) > 20:
                        self._set_if_missing(data, "quote", sib_text[:500])
                        if not data.get("quote_author"):
                            next_sib = sib.find_next_sibling()
                            if next_sib:
                                author = self._looks_like_author(next_sib.get_text(" ", strip=True))
                                if author:
                                    self._set_if_missing(data, "quote_author", author)
                        return

        # 1. blockquote tags
        for bq in soup.find_all("blockquote"):
            text = bq.get_text(strip=True)
            if 20 < len(text) < 500:
                self._set_if_missing(data, "quote", text)
                cite = bq.find("cite") or bq.find_next_sibling(
                    class_=re.compile("author|attribution|name", re.I)
                )
                if cite:
                    self._set_if_missing(data, "quote_author", cite.get_text(" ", strip=True))
                if not data.get("quote_author"):
                    next_sib = bq.find_next_sibling()
                    if next_sib:
                        author = self._looks_like_author(next_sib.get_text(" ", strip=True))
                        if author:
                            self._set_if_missing(data, "quote_author", author)
                return

        # 2. Semantic class names
        for cls in QUOTE_SIGNAL_CLASSES:
            el = soup.find(class_=re.compile(cls, re.I))
            if el:
                text = el.get_text(strip=True)
                if 20 < len(text) < 500:
                    self._set_if_missing(data, "quote", text)
                    if not data.get("quote_author"):
                        next_sib = el.find_next_sibling()
                        if next_sib:
                            sib_text = next_sib.get_text(" ", strip=True)
                            if self._looks_like_author(sib_text):
                                self._set_if_missing(data, "quote_author", sib_text)
                    return

        # 3. <em> or <strong> whose entire text is wrapped in quotation marks
        for el in soup.find_all(["em", "strong", "p", "span"]):
            text = el.get_text(strip=True)
            if len(text) < 20 or len(text) > 500:
                continue
            if text[0] in ('"', '\u201c', '\u2018') and text[-1] in ('"', '\u201d', '\u2019'):
                cleaned = text.strip('"\u201c\u201d\u2018\u2019')
                self._set_if_missing(data, "quote", cleaned)
                if not data.get("quote_author"):
                    next_sib = el.find_next_sibling()
                    if next_sib:
                        author = self._looks_like_author(next_sib.get_text(" ", strip=True))
                        if author:
                            self._set_if_missing(data, "quote_author", author)
                return

    # ── Industry ───────────────────────────────────────────────────────────

    def _extract_industry(self, soup: BeautifulSoup, data: dict):
        if data.get("customer_industry"):
            return

        full_text = (data.get("raw_text") or "").lower()
        for kw in INDUSTRY_KEYWORDS:
            if re.search(r"\b" + re.escape(kw) + r"\b", full_text):
                self._set_if_missing(data, "customer_industry", kw.title())
                return

    # ── Publish date ───────────────────────────────────────────────────────

    def _extract_publish_date(self, soup: BeautifulSoup, data: dict):
        if data.get("publish_date"):
            return

        for el in soup.find_all(["time", "span", "p"], attrs={"datetime": True}):
            raw = el.get("datetime", "").strip()
            if raw:
                self._parse_date(data, raw)
                if data.get("publish_date"):
                    return

        date_re = re.compile(
            r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
            r"|januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december"
            r"|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre"
            r")[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b"
            r"|\b\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december"
            r"|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\b"
            r"|\b\d{4}-\d{2}-\d{2}\b",
            re.I,
        )
        for el in soup.find_all(["span", "p", "div"], class_=re.compile("date|time|publish", re.I)):
            m = date_re.search(el.get_text())
            if m:
                self._parse_date(data, m.group(0))
                if data.get("publish_date"):
                    return

    # ── Tags ───────────────────────────────────────────────────────────────

    def _extract_tags(self, soup: BeautifulSoup, data: dict):
        if data.get("tags"):
            return

        tags: set[str] = set()
        for el in soup.find_all(
            ["a", "span", "li"],
            class_=re.compile(r"tag|label|badge|category|pill|topic|keyword", re.I),
        ):
            text = el.get_text(strip=True)
            if 2 < len(text) < 40 and not text.startswith("http"):
                tags.add(text)

        tags = {t for t in tags if t.lower() not in _TAG_NOISE and len(t.split()) <= 6}
        if tags:
            self._set_if_missing(data, "tags", json.dumps(sorted(tags)))

    # ── Helpers ────────────────────────────────────────────────────────────

    def _parse_date(self, data: dict, raw: str):
        if data.get("publish_date"):
            return
        try:
            from dateutil import parser as dp
            normalised = raw.lower()
            for nl, en in _DUTCH_MONTHS.items():
                normalised = re.sub(r'\b' + re.escape(nl) + r'\b', en, normalised)
            data["publish_date"] = dp.parse(normalised, fuzzy=True).date()
        except Exception:
            pass
