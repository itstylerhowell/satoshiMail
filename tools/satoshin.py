"""Add satoshin.name (the "Satoshi Nakamoto Archive") to an sni-data dataset.

    python tools/satoshin.py data                    # crawl satoshin.name politely, write the table
    python tools/satoshin.py data --cache .satoshin  # keep the downloaded pages, so a rerun resumes
    python tools/satoshin.py data --html-dir pages   # parse pages saved earlier instead of downloading

Source: https://satoshin.name/ (about: https://satoshin.name/about/). The site lists Satoshi's
messages newest first, 25 to a page (https://satoshin.name/?pg=N), and gives every message a page
of its own (https://satoshin.name/<slug>) with its text and a Details list: date and time of
publication, category, sender, source URL and, on many pages, the people mentioned.

Writes ``satoshin_entries`` to ``<data>/ndjson/`` and, when pyarrow is installed, ``<data>/parquet/``:
one row per message, plus ``in_dataset``: whether its source URL is already in one of the dataset's
other tables. The site publishes no reuse licence; the messages themselves are Satoshi's.

Checked on 20 October 2026: 567 messages (533 Bitcoin Forum posts, 18 Cryptography Mailing List
emails, 16 bitcoin-list emails), 1 November 2008 to 13 December 2010, all already in Satoshi Mail.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

SITE = "https://satoshin.name/"
TABLE = "satoshin_entries"
UA = "sni-data (+https://github.com/itstylerhowell/satoshiMail)"
MAX_PAGES = 200   # safety stop; the site had 23 list pages in October 2026
SKIP = {"about", "category", "feed", "wp-admin", "wp-content", "wp-json", "pretenders", "tag", "page"}


def norm_url(u: str | None) -> str:
    """Comparable form of a source URL (scheme, www, trailing slash and BitcoinTalk anchors ignored)."""
    if not u:
        return ""
    u = u.strip().lower()
    u = re.sub(r"^https?://(www\.)?", "", u)
    u = re.sub(r"#msg\d+$", "", u)
    return u.rstrip("/")


class _Text(HTMLParser):
    """Collects the text of one element (and its children), keeping line breaks."""

    def __init__(self, tag: str, attrs_match=None):
        super().__init__(convert_charrefs=True)
        self.tag, self.match = tag, attrs_match or (lambda a: True)
        self.depth, self.parts, self.found = 0, [], False

    def handle_starttag(self, tag, attrs):
        if self.depth:
            if tag == self.tag:
                self.depth += 1
            if tag in ("br", "p", "li", "div", "blockquote", "pre"):
                self.parts.append("\n")
            if tag == "q":
                self.parts.append("“")
        elif tag == self.tag and not self.found and self.match(dict(attrs)):
            self.depth, self.found = 1, True

    def handle_endtag(self, tag):
        if not self.depth:
            return
        if tag == "q":
            self.parts.append("”")
        if tag in ("p", "li", "blockquote"):
            self.parts.append("\n")
        if tag == self.tag:
            self.depth -= 1

    def handle_data(self, data):
        if self.depth:
            self.parts.append(data)

    def text(self) -> str:
        t = "".join(self.parts).replace("\r", "")
        t = re.sub(r"[ \t]+\n", "\n", t)
        t = re.sub(r"\n[ \t]+", "\n", t)
        return re.sub(r"\n{3,}", "\n\n", t).strip()


def element_text(page: str, tag: str, match=None) -> str:
    p = _Text(tag, match)
    p.feed(page)
    return p.text()


def list_slugs(page: str) -> list[str]:
    """Message slugs on one list page (links like ./slug#content or https://satoshin.name/slug)."""
    out = []
    for href in re.findall(r'<a\s[^>]*href="([^"]+)"[^>]*rel="bookmark', page):
        s = re.sub(r"^(?:\./|https?://satoshin\.name/)", "", html.unescape(href)).split("#")[0].strip("/")
        if s and "/" not in s and "?" not in s and s not in SKIP and s not in out:
            out.append(s)
    return out


def last_page(page: str) -> int:
    nums = [int(n) for n in re.findall(r"[?&]pg=(\d+)", page)]
    return max(nums) if nums else 1


DETAIL = re.compile(r"<li>\s*<strong>([^<:]+):?</strong>(.*?)</li>", re.S)


def parse_entry(slug: str, page: str) -> dict:
    """One message page → a row."""
    art = re.search(r"<article\b.*?</article>", page, re.S)
    if not art:
        raise ValueError(f"{slug}: no <article> on the page")
    a = art.group(0)
    title = html.unescape(re.sub(r"<[^>]+>", "", (re.search(r"<h[12][^>]*>(.*?)</h[12]>", a, re.S) or [None, ""])[1])).strip()
    body = element_text(a, "blockquote")
    details = {}
    for k, v in DETAIL.findall(a):
        details[k.strip().lower()] = html.unescape(re.sub(r"<[^>]+>", "", v)).strip()
    when = details.get("date and time of publication", "")
    ts = None
    for fmt in ("%B %d, %Y, %I:%M:%S %p", "%B %d, %Y, %I:%M %p", "%Y-%m-%d %H:%M:%S", "%a, %d %b %Y %H:%M:%S %z"):
        try:
            ts = dt.datetime.strptime(when, fmt)
            break
        except ValueError:
            continue
    if ts is not None:
        ts = ts.replace(tzinfo=dt.timezone.utc) if ts.tzinfo is None else ts.astimezone(dt.timezone.utc)
    mentioned = [p.strip() for p in details.get("person(s) mentioned", "").split(",") if p.strip()]
    views = re.sub(r"\D", "", details.get("view counter", ""))
    return {
        "slug": slug,
        "url": SITE + slug,
        "title": title or None,
        "date": ts.isoformat() if ts else None,
        "date_text": when or None,
        "category": details.get("category") or None,
        "sender": details.get("source author/from/name") or None,
        "source_url": details.get("source url") or None,
        "people_mentioned": ", ".join(mentioned) or None,
        "views": int(views) if views else None,
        "body": body or None,
    }


class Fetcher:
    """Polite downloader: one request at a time, a pause between them, retries when the site is busy."""

    def __init__(self, delay: float = 1.5, cache: Path | None = None, retries: int = 6):
        self.delay, self.cache, self.retries, self.last = delay, cache, retries, 0.0
        if cache:
            cache.mkdir(parents=True, exist_ok=True)

    def get(self, url: str, key: str) -> str:
        if self.cache and (self.cache / key).exists():
            return (self.cache / key).read_text(encoding="utf-8")
        for attempt in range(self.retries):
            wait = self.delay - (time.monotonic() - self.last)
            if wait > 0:
                time.sleep(wait)
            self.last = time.monotonic()
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=60) as r:
                    text = r.read().decode("utf-8", "replace")
                if self.cache:
                    (self.cache / key).write_text(text, encoding="utf-8")
                return text
            except urllib.error.HTTPError as e:
                if e.code not in (429, 500, 502, 503, 504):
                    raise
            except (urllib.error.URLError, TimeoutError):
                pass
            time.sleep(min(60, 5 * 2 ** attempt))   # the site rate-limits with 503s; back off
        raise SystemExit(f"gave up on {url} after {self.retries} tries")


def crawl(fetch: Fetcher, limit: int | None = None) -> list[dict]:
    # Walk the list pages until one adds nothing new. The page links on each page are only a hint:
    # if they show just nearby pages, stopping at the highest one would end the crawl early.
    page = fetch.get(SITE, "list-1.html")
    slugs, hint, pg = list_slugs(page), last_page(page), 1
    while pg < MAX_PAGES and not (limit and len(slugs) >= limit):
        pg += 1
        page = fetch.get(f"{SITE}?pg={pg}", f"list-{pg}.html")
        new = [s for s in list_slugs(page) if s not in slugs]
        if not new:
            break
        slugs += new
        hint = max(hint, last_page(page))
    if pg < hint and not limit:
        print(f"note: stopped at list page {pg}, though page links go up to {hint}", file=sys.stderr)
    slugs = slugs[:limit] if limit else slugs
    rows = []
    for i, s in enumerate(slugs, 1):
        rows.append(parse_entry(s, fetch.get(SITE + s, f"{s}.html")))
        if i % 50 == 0:
            print(f"  {i}/{len(slugs)}", file=sys.stderr)
    return rows


def from_dir(d: Path) -> list[dict]:
    lists = sorted(d.glob("list-*.html"), key=lambda p: int(re.sub(r"\D", "", p.stem) or 0))
    order = [s for p in lists for s in list_slugs(p.read_text(encoding="utf-8"))]
    pages = {p.stem: p for p in d.glob("*.html") if not p.stem.startswith("list-")}
    order += sorted(set(pages) - set(order))
    return [parse_entry(s, pages[s].read_text(encoding="utf-8")) for s in dict.fromkeys(order) if s in pages]


def known_urls(data: Path) -> set[str]:
    urls: set[str] = set()
    for f in (data / "ndjson").glob("*.ndjson"):
        if f.stem == TABLE:
            continue
        with f.open(encoding="utf-8") as fh:
            for line in fh:
                try:
                    row = json.loads(line)
                except ValueError:
                    continue
                for k in ("url", "external_link", "source_url"):
                    if row.get(k):
                        urls.add(norm_url(row[k]))
    return urls


def write(data: Path, table: list[dict]) -> list[Path]:
    written = []
    nd = data / "ndjson"
    nd.mkdir(parents=True, exist_ok=True)
    p = nd / f"{TABLE}.ndjson"
    with p.open("w", encoding="utf-8") as fh:
        for r in table:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    written.append(p)
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError:
        return written
    schema = pa.schema([
        ("slug", pa.string()), ("url", pa.string()), ("title", pa.string()), ("date", pa.timestamp("s", tz="UTC")),
        ("date_text", pa.string()), ("category", pa.string()), ("sender", pa.string()), ("source_url", pa.string()),
        ("people_mentioned", pa.string()), ("views", pa.int64()), ("body", pa.string()), ("in_dataset", pa.bool_()),
    ])
    cols = {f.name: [r.get(f.name) for r in table] for f in schema}
    cols["date"] = [dt.datetime.fromisoformat(d) if d else None for d in cols["date"]]
    pqdir = data / "parquet"
    pqdir.mkdir(parents=True, exist_ok=True)
    p = pqdir / f"{TABLE}.parquet"
    pq.write_table(pa.table(cols, schema=schema), p, compression="zstd")
    written.append(p)
    return written


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("data", nargs="?", default="data", help="dataset directory (default: data)")
    ap.add_argument("--html-dir", help="parse saved pages (list-N.html and <slug>.html) instead of downloading")
    ap.add_argument("--cache", help="save downloaded pages here and reuse them on the next run")
    ap.add_argument("--delay", type=float, default=1.5, help="seconds between requests (default 1.5)")
    ap.add_argument("--limit", type=int, help="only the newest N messages (for a quick test)")
    a = ap.parse_args(argv)
    data = Path(a.data)
    if a.html_dir:
        table = from_dir(Path(a.html_dir))
    else:
        table = crawl(Fetcher(a.delay, Path(a.cache) if a.cache else None), a.limit)
    known = known_urls(data) if (data / "ndjson").exists() else set()
    for r in table:
        r["in_dataset"] = norm_url(r["source_url"]) in known if known else None
    paths = write(data, table)
    by_cat: dict[str, int] = {}
    for r in table:
        by_cat[r["category"] or "?"] = by_cat.get(r["category"] or "?", 0) + 1
    print(f"{len(table):,} satoshin.name entries → " + ", ".join(str(p) for p in paths))
    if known:
        miss = [r for r in table if not r["in_dataset"]]
        print(f"{len(table) - len(miss):,} have a source URL already in the dataset; {len(miss):,} do not (often the same message under a different URL).")
    for c, n in sorted(by_cat.items()):
        print(f"  {c:30} {n:5,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
