"""Match satoshin.name's pages to Satoshi Mail's messages and write the link table.

    python tools/satoshin_xref.py                                  # snapshot index → link table
    python tools/satoshin_xref.py --entries data/ndjson/satoshin_entries.ndjson   # from a fresh crawl

Inputs: the archive (site/data/archive.json) and satoshin.name's entries, either the snapshot in
tools/satoshin_index.json or the satoshin_entries table written by tools/satoshin.py.
Output: tools/satoshipedia/satoshin_xref.json, embedded in the app by the template build.

Links are keyed by a stable message identifier, never by thread or message position, so a
rebuilt archive keeps pointing at the right pages:
  * BitcoinTalk posts: "bitcointalk:<msg number>";
  * everything else: the message's source URL without its scheme or trailing slash.
The app (wiki.js, SATOSHIN.key) and the site builder (build_site.py, msg_key) compute the same key.

Matching: forum posts by msg number; bitcoin-list emails by their SourceForge URL; Cryptography
list emails (satoshin.name links mail-archive.com copies, whose times are delivery times) by their
opening text, then by order. Fails unless every entry matches exactly one message by Satoshi.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def msg_key(t: dict, m: dict) -> str | None:
    """Stable key of one archive message (same rule as wiki.js SATOSHIN.key and build_site.msg_key)."""
    u = m.get("u") or ""
    mm = re.search(r"bitcointalk\.org/.*?msg(\d+)", u)
    if mm:
        return "bitcointalk:" + mm.group(1)
    u = re.sub(r"^https?://", "", u).rstrip("/")
    return u or None


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def norm_url(u: str | None) -> str:
    return re.sub(r"^https?://(www\.)?", "", (u or "").strip().lower()).rstrip("/")


def body_text(m: dict) -> str:
    b = m.get("b") or []
    if isinstance(b, str):
        return b
    return " ".join(seg[1] for seg in b if len(seg) > 1)


def load_entries(path: Path) -> tuple[str, list[dict]]:
    if path.suffix == ".ndjson":
        rows = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
        for r in rows:
            mm = re.search(r"msg(\d+)", r.get("source_url") or "")
            if mm and "bitcointalk" in (r.get("source_url") or ""):
                r["bitcointalk_msg"] = int(mm.group(1))
            if r.get("body") and not r.get("body_start"):
                r["body_start"] = r["body"][:200]
        return "https://satoshin.name/", rows
    doc = json.loads(path.read_text(encoding="utf-8"))
    return doc.get("site", "https://satoshin.name/"), doc["entries"]


def ts(s: str | None) -> float | None:
    if not s:
        return None
    try:
        return dt.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def match(D: dict, entries: list[dict]) -> tuple[dict, list[str], list[int]]:
    sat = []   # (thread, message, key) for every message by Satoshi
    for t in D["threads"]:
        for m in t["m"]:
            if str(m.get("s")) == "1":
                sat.append((t, m, msg_key(t, m)))
    by_key = {k: (t, m) for t, m, k in sat if k}
    by_url = {norm_url(m.get("u")): k for t, m, k in sat if m.get("u") and k}
    out: dict[str, str] = {}
    pending = []
    for e in entries:
        if e.get("bitcointalk_msg"):
            k = f"bitcointalk:{e['bitcointalk_msg']}"
            if k in by_key:
                out[k] = e["slug"]
                continue
        k = by_url.get(norm_url(e.get("source_url")))
        if k:
            out[k] = e["slug"]
            continue
        pending.append(e)
    # the rest: mail-archive.com copies of list emails; match by opening text, then by order
    pool = [(t, m, k) for t, m, k in sat if k and k not in out and t["k"] == "e"]
    def hits(e):
        b = e.get("body_start") or ""
        head = norm(b)[:25]
        frag = norm(re.sub(r"^.*?wrote:|^[A-Z][\w. ]+:\s*(?=>)", "", b))[:22]
        res = []
        for t, m, k in pool:
            if "cryptography" in (e.get("source_url") or "") and t["s"] != "cryptography":
                continue
            txt = norm(body_text(m))
            if (head and txt.startswith(head)) or (frag and frag in txt[:400]):
                res.append((t, m, k))
        return res
    taken = set(out)
    progress = True
    while pending and progress:
        progress = False
        for e in list(pending):
            h = [x for x in hits(e) if x[2] not in taken]
            if len(h) == 1:
                out[h[0][2]] = e["slug"]; taken.add(h[0][2]); pending.remove(e); progress = True
        if not progress and pending:
            # ties (a post and a reply that quotes it): earliest entry takes the earliest message
            pending.sort(key=lambda e: ts(e.get("date")) or 0)
            e = pending[0]
            h = sorted((x for x in hits(e) if x[2] not in taken), key=lambda x: int(x[1]["d"]))
            if h:
                out[h[0][2]] = e["slug"]; taken.add(h[0][2]); pending.remove(e); progress = True
    unmatched = [e["slug"] for e in pending]
    ours_forum = sorted(int(k.split(":")[1]) for t, m, k in sat if k and k.startswith("bitcointalk:"))
    missing_forum = [n for n in ours_forum if f"bitcointalk:{n}" not in out]
    return out, unmatched, missing_forum


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--archive", default=str(ROOT / "site" / "data" / "archive.json"))
    ap.add_argument("--entries", default=str(ROOT / "tools" / "satoshin_index.json"), help="snapshot index, or satoshin_entries.ndjson from tools/satoshin.py")
    ap.add_argument("--out", default=str(ROOT / "tools" / "satoshipedia" / "satoshin_xref.json"))
    ap.add_argument("--checked", default=dt.date.today().isoformat(), help="date the site was checked (default today)")
    a = ap.parse_args(argv)
    D = json.loads(Path(a.archive).read_text(encoding="utf-8"))
    site, entries = load_entries(Path(a.entries))
    out, unmatched, missing = match(D, entries)
    if unmatched:
        print(f"{len(unmatched)} satoshin.name entries match no message by Satoshi: {', '.join(unmatched[:10])}", file=sys.stderr)
        return 1
    if len(set(out.values())) != len(out):
        print("two messages matched the same satoshin.name page", file=sys.stderr)
        return 1
    X = {"site": site, "checked": a.checked, "entries": len(entries), "key": "bitcointalk:<msg> or source URL without scheme",
         "missing_forum_msgs": missing, "msgs": dict(sorted(out.items()))}
    Path(a.out).write_text(json.dumps(X, indent=0, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(out)} of {len(entries)} satoshin.name entries matched → {a.out}; Satoshi's BitcoinTalk posts not there: {missing}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
