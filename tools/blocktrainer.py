"""Add Blocktrainer's Satoshi Nakamoto archive to an sni-data dataset.

    python tools/blocktrainer.py data                 # download entries.json, write the table
    python tools/blocktrainer.py data --file entries.json   # use a copy you already have

Source: https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive
(the page loads https://api.blocktrainer.de/satoshi-archive/entries.json).

Writes ``blocktrainer_entries`` to ``<data>/ndjson/`` and, when pyarrow is installed,
``<data>/parquet/``: one row per entry with its English text and Blocktrainer's
German translation, plus ``in_dataset``: whether the entry's source URL is already
in one of the dataset's other tables (any table with a ``url`` column).

Blocktrainer publishes no reuse licence. The German translations are its own work:
keep them for local research, and ask Blocktrainer before republishing them.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import urllib.request
from pathlib import Path

URL = "https://api.blocktrainer.de/satoshi-archive/entries.json"
PAGE = "https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive"
TABLE = "blocktrainer_entries"


def norm_url(u: str | None) -> str:
    """Comparable form of a source URL (scheme, www, trailing slash and BitcoinTalk anchors ignored)."""
    if not u:
        return ""
    u = u.strip().lower()
    u = re.sub(r"^https?://(www\.)?", "", u)
    u = re.sub(r"#msg\d+$", "", u)
    return u.rstrip("/")


def load(file: str | None) -> list[dict]:
    if file:
        return json.loads(Path(file).read_text(encoding="utf-8"))
    req = urllib.request.Request(URL, headers={"User-Agent": "sni-data (+https://github.com/itstylerhowell)", "Referer": PAGE})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def known_urls(data: Path) -> set[str]:
    """Every source URL already in the dataset's other NDJSON tables."""
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


def rows(entries: list[dict], known: set[str]) -> list[dict]:
    out = []
    for e in entries:
        date = e.get("date")
        try:
            ts = dt.datetime.fromisoformat(date.replace("Z", "+00:00")).astimezone(dt.timezone.utc) if date else None
        except ValueError:
            ts = None
        out.append({
            "bt_id": e.get("id"),
            "bt_source": e.get("source"),
            "type": e.get("type"),
            "date": ts.isoformat() if ts else None,
            "subject": e.get("subject"),
            "sender": e.get("sender"),
            "recipient": e.get("recipient"),
            "cc": e.get("cc") or None,
            "is_satoshi": bool(re.match(r"^satoshi( nakamoto)?$", (e.get("sender") or "").strip(), re.I)),
            "body": e.get("body"),
            "body_de": e.get("body_de"),
            "url": e.get("url"),
            "in_dataset": norm_url(e.get("url")) in known if known else None,
        })
    return out


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
        ("bt_id", pa.string()), ("bt_source", pa.string()), ("type", pa.string()),
        ("date", pa.timestamp("s", tz="UTC")), ("subject", pa.string()), ("sender", pa.string()),
        ("recipient", pa.string()), ("cc", pa.string()), ("is_satoshi", pa.bool_()),
        ("body", pa.string()), ("body_de", pa.string()), ("url", pa.string()), ("in_dataset", pa.bool_()),
    ])
    cols = {f.name: [r[f.name] for r in table] for f in schema}
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
    ap.add_argument("--file", help="read entries from a local copy of entries.json instead of downloading")
    a = ap.parse_args(argv)
    data = Path(a.data)
    entries = load(a.file)
    known = known_urls(data) if (data / "ndjson").exists() else set()
    table = rows(entries, known)
    paths = write(data, table)
    by_src: dict[str, int] = {}
    for r in table:
        by_src[r["bt_source"]] = by_src.get(r["bt_source"], 0) + 1
    print(f"{len(table):,} Blocktrainer entries ({sum(r['is_satoshi'] for r in table):,} by Satoshi) → " + ", ".join(str(p) for p in paths))
    if known:
        miss = [r for r in table if not r["in_dataset"]]
        print(f"{len(table) - len(miss):,} have a source URL already in the dataset; {len(miss):,} do not (often the same message under a different URL).")
    for s, n in sorted(by_src.items()):
        print(f"  {s:28} {n:5,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
