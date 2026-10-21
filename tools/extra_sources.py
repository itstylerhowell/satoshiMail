"""Add material found after the original build to the archive data (idempotent: re-running replaces it).

    python3 -I tools/extra_sources.py DATA.json BOHM_PDF_TEXT_DIR FIRST_TOPICS.txt [--bohm-commit SHA]

1. Satoshi's private emails with Nicholas Bohm, January–July 2009 (source "nicholas-bohm"): Bohm's own
   Thunderbird export, disclosed as exhibit NB1 to his witness statement in COPA v Wright (claim
   IL-2021-000019) and republished at https://github.com/NicholasBohm/emails. Text comes from the PDFs
   (pdftotext -layout). Times are converted from UK local time (GMT, BST from 29 March 2009) to UTC.
   Mailing-list posts in the export are skipped (the list threads are already in the archive), and so is
   any email already in the archive (the same text within two days). Bohm's own address and key details are left out.
2. Deleted test topics from the forum's staff board, November 2009 – January 2010 (source "forum-staff"),
   saved as PDFs by the forum's administrator in July 2012: https://bitcointalk.org/first_topics/.
   Times are as printed by the forum (UTC).
3. Satoshi's last email to Gavin Andresen (26 April 2011): split into Satoshi's email, timed from the
   header Gavin's reply quotes (4:29 AM US Eastern = 08:29 UTC), and Gavin's reply, as published on
   Gavin's blog (https://riski.wiki/wiki/User:Gavinandresen/Blog/2022-04-26_Eleven_years_ago_today…).
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

BOHM_REPO = "https://github.com/NicholasBohm/emails"
FORUM_PDF = "https://bitcointalk.org/first_topics/{}.pdf"
GAVIN_BLOG = "https://riski.wiki/wiki/User:Gavinandresen/Blog/2022-04-26_Eleven_years_ago_today%E2%80%A6"
VOCAB: set[str] = set()
BOHM_ADDR = re.compile(r"\s*<?[\w.+-]+@(?!gmx\.com|vistomail\.com|anonymousspeech\.com)[\w-]+\.[\w.]+>?", re.I)
NEW_SOURCES = {"nicholas-bohm", "forum-staff"}


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def uk_to_utc(day: str, hm: str) -> int:
    d = dt.datetime.strptime(day + " " + hm, "%d/%m/%Y %H:%M")
    # British Summer Time in 2009: 29 March 01:00 UTC to 25 October 01:00 UTC
    bst = dt.datetime(2009, 3, 29, 1) <= d - dt.timedelta(hours=1) < dt.datetime(2009, 10, 25, 1)
    return int((d - dt.timedelta(hours=1 if bst else 0)).replace(tzinfo=dt.timezone.utc).timestamp())


def segments(lines: list[str]) -> list[list[str]]:
    """Plain lines → [kind, text] segments. Thunderbird's printout shows quoted text indented (or with '>'),
    so indented and '>' lines become 'q', the rest 't'."""
    out: list[list[str]] = []
    in_q, last_own = False, ""
    for ln in lines:
        indented = ln[:1] == " " and ln.strip() != ""
        if ln.lstrip().startswith(">"):
            in_q = True
        elif indented and not in_q:
            # a quote starts only after an attribution line ("... wrote:" / "From: ...")
            in_q = bool(not last_own or re.search(r"wrote:\s*$", last_own) or re.match(r"From:", last_own.strip()))
        elif ln.strip() and not indented:
            in_q = False
        kind = "q" if in_q and (ln.strip() or (out and out[-1][0] == "q")) else "t"
        if ln.strip() and kind == "t":
            last_own = ln
        text = re.sub(r"^\s*>\s?", "", ln).strip() if kind == "q" else ln
        if out and out[-1][0] == kind:
            out[-1][1] += "\n" + text
        else:
            out.append([kind, text])
    clean = []
    for k, t in out:
        t = t.strip("\n")
        if t.strip():
            clean.append([k, t])
    return clean


LIGATURES = ("ti", "tt", "ft", "tti", "fi", "fl", "ff", "ffi", "tf")


def fix_ligatures(text: str, vocab: set[str]) -> str:
    """The PDFs map some ligatures to U+FFFD ('repor\ufffdng'); pick the reading that makes a known word."""
    def one(m):
        w = m.group(0)
        for lig in LIGATURES:
            cand = w.replace("\ufffd", lig)
            if cand.lower() in vocab:
                return cand
        return w.replace("\ufffd", "ti")
    return re.sub(r"[A-Za-z]*\ufffd[A-Za-z\ufffd]*", one, text)


def strip_attachment_notes(lines: list[str]) -> tuple[list[str], list[str]]:
    """Thunderbird's notes for detached attachments → a short list of names."""
    out, names, skip = [], [], False
    for l in lines:
        s = l.strip()
        m = re.match(r"Deleted:\s*(.+?)(?:\s{2,}\d+ bytes)?$", s)
        if m:
            if m.group(1) not in names:
                names.append(m.group(1))
            skip = False; continue
        if s == "Attachments:" or s.startswith("The original MIME headers for this attachment are"):
            skip = True; continue
        if skip and (not s or re.match(r"(Content-|X-Mozilla|name=|filename=|charset=|format=)", s, re.I)):
            continue
        skip = False
        out.append(l)
    while out and not out[-1].strip():
        out.pop()
    return out, names


def parse_bohm(path: Path) -> dict | None:
    raw = path.read_text(encoding="utf-8", errors="replace").replace("\f", "\n")
    head = {}
    for key in ("Subject", "From", "Date", "To", "CC"):
        m = re.search(rf"^\s+{key}:\s*(.*)$", raw, re.M)
        if m:
            head[key.lower()] = m.group(1).strip()
    if "date" not in head or "from" not in head:
        return None
    raw = raw.translate(str.maketrans({"\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi", "\ufb04": "ffl", "\ufb05": "st", "\ufb06": "st"}))
    raw = fix_ligatures(raw, VOCAB)
    lines = raw.split("\n")
    start = max(i for i, l in enumerate(lines) if re.match(r"^\s+(To|CC|Date):", l)) + 1
    body = []
    for l in lines[start:]:
        if re.match(r"^\S.*mailbox:///", l) or re.match(r"^\d+ of \d+\s", l):
            continue                                   # print headers and footers on each page
        body.append(l.rstrip())
    ind = min((len(l) - len(l.lstrip()) for l in body if l.strip()), default=0)
    body = [l[ind:] for l in body]                      # the page margin, not quoting
    text = "\n".join(body)
    text = re.sub(r"\n\s*PGP public key ID:.*?(\n\s*[0-9A-F]{4}( [0-9A-F]{4}){9}\s*)", "\n", text, flags=re.S)
    text = re.sub(r"\n\s*PGP public key ID:.*", "", text)
    text = BOHM_ADDR.sub("", text)
    day, hm = [x.strip() for x in head["date"].split(",")]
    sat = "satoshi" in head["from"].lower()
    frm_name = re.sub(r'\s*<.*?>|"', "", head["from"]).strip() or head["from"]
    if not sat and "bohm" in head["from"].lower():
        frm_name = "Nicholas Bohm"
    sat_addr = re.search(r"satoshi[n]?@[\w.]+", head["from"] if sat else head.get("to", ""))
    return {
        "file": path.stem, "subject": head.get("subject", ""), "from": frm_name, "sat": sat,
        "to_raw": head.get("to", ""), "d": uk_to_utc(day, hm), "od": f"{day}, {hm} (UK time)",
        "lines": strip_attachment_notes(text.strip("\n").split("\n"))[0], "atts": strip_attachment_notes(text.strip("\n").split("\n"))[1],
        "sat_addr": sat_addr.group(0) if sat_addr else "",
    }


def bohm_threads(txt_dir: Path, existing: list[tuple[int, str]], commit: str) -> tuple[list[dict], list[str]]:
    msgs, skipped = [], []
    for f in sorted(txt_dir.glob("*.txt"), key=lambda p: [float(x) if x.replace(".", "").isdigit() else 0 for x in p.stem.split(" ")[:1]]):
        if f.stem.startswith("0.0"):
            continue                                   # the witness statement itself
        m = parse_bohm(f)
        if not m:
            skipped.append(f.stem + " (unreadable)"); continue
        if "bitcoin-list@" in m["to_raw"]:
            skipped.append(f.stem + " (mailing-list post)"); continue
        own = norm("\n".join(l for l in m["lines"] if not l.lstrip().startswith(">")))[:400]
        # the same email already in the archive (same text within two days); Satoshi reused some
        # answers months later (e.g. in a May 2009 email to Martti Malmi), which are separate emails
        if len(own) > 60 and any(abs(d - m["d"]) < 2 * 86400 and own in txt for d, txt in existing):
            skipped.append(f.stem + " (already in the archive)"); continue
        msgs.append(m)
    msgs.sort(key=lambda m: m["d"])
    # conversations: same subject (without Re:), split by gaps of more than three weeks
    threads: list[dict] = []
    for m in msgs:
        key = re.sub(r"^(re:\s*)+", "", m["subject"].strip(), flags=re.I).lower()
        t = next((t for t in reversed(threads) if t["_key"] == key and m["d"] - t["_last"] < 21 * 86400), None)
        if not t:
            t = {"_key": key, "_last": m["d"], "k": "x", "s": "nicholas-bohm", "t": re.sub(r"^(re:\s*)+", "", m["subject"].strip(), flags=re.I) or "(no subject)",
                 "u": BOHM_REPO, "su": BOHM_REPO, "m": []}
            threads.append(t)
        t["_last"] = m["d"]
        pdf = f"{BOHM_REPO}/blob/{commit}/{quote(m['file'] + '.pdf')}"
        t["m"].append({
            "f": "Satoshi Nakamoto" if m["sat"] else m["from"], "d": m["d"],
            "b": segments(m["lines"]) + ([["f", "Attachments (not included in the exhibit): " + ", ".join(m["atts"])]] if m["atts"] else []),
            "u": pdf, "su": pdf, "sj": m["subject"], **({"s": 1} if m["sat"] else {}),
            "to": "Nicholas Bohm" if m["sat"] else (m["sat_addr"] or "Satoshi Nakamoto"),
            "fe": m["sat_addr"] if m["sat"] else "", "od": m["od"],
        })
    for t in threads:
        del t["_key"], t["_last"]
    return threads, skipped


POST = re.compile(r"^Title: (.*)\nPost by: (.+?) on (\w+ \d+, \d{4}, \d\d:\d\d:\d\d [AP]M)\n", re.M)


def forum_threads(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8")
    out = []
    for n, body in re.findall(r"### TOPIC (\d+)\n(.*?)(?=\n### TOPIC |\Z)", raw, re.S):
        posts = list(POST.finditer(body))
        t = {"k": "p", "s": "forum-staff", "u": FORUM_PDF.format(n), "su": FORUM_PDF.format(n), "m": []}
        for i, p in enumerate(posts):
            end = posts[i + 1].start() if i + 1 < len(posts) else len(body)
            text = body[p.end():end].strip("\n")
            when = dt.datetime.strptime(p.group(3), "%B %d, %Y, %I:%M:%S %p").replace(tzinfo=dt.timezone.utc)
            who = p.group(2).strip()
            if i == 0:
                t["t"] = p.group(1).strip()
            t["m"].append({"f": who, "d": int(when.timestamp()), "b": [["t", text]] if text.strip() else [["f", "(empty)"]],
                           "u": FORUM_PDF.format(n), "sj": p.group(1).strip(), **({"s": 1} if who.lower() == "satoshi" else {})})
        out.append(t)
    return out


# generic patterns only: phone numbers, UK postcodes, PGP key IDs and fingerprints, non-Satoshi addresses
PRIVATE_LINE = re.compile(
    r"(?:\+44\s?|\b0)\d{4}\s?\d{6}\b"                    # UK phone numbers
    r"|\b[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}\b"           # UK postcodes
    r"|PGP public key ID|Fingerprint:|\b(?:[0-9A-F]{4}\s+){9}[0-9A-F]{4}\b"
    r"|<?[\w.+-]+@(?!gmx\.com|vistomail\.com|anonymousspeech\.com)[\w-]+\.[\w.]+>?")


def scrub_private(D: dict) -> int:
    """Remove Nicholas Bohm's home address, phone numbers and key details wherever they appear
    (his mailing-list signature is in the list archives too); he is a private person."""
    n = 0
    for t in D["threads"]:
        for m in t["m"]:
            if m.get("f") == "Nicholas Bohm":
                for seg in m["b"]:
                    if seg[0] == "t" and "\n--\n" in seg[1]:
                        seg[1] = seg[1].split("\n--\n")[0]; n += 1
            for seg in m["b"]:
                if t["s"] != "nicholas-bohm" and m.get("f") != "Nicholas Bohm":
                    continue                               # only Bohm's correspondence and his own posts
                lines = seg[1].split("\n")
                keep = [l for l in lines if not PRIVATE_LINE.search(l)]
                if len(keep) != len(lines):
                    n += 1
                    while keep and keep[-1].strip() in ("", "--"):
                        keep.pop()                         # the "--" separator left behind
                    seg[1] = "\n".join(keep)
            if t["s"] == "nicholas-bohm":                  # 2009 IP addresses and machine name in the exhibit
                for seg in m["b"]:
                    new = re.sub(r"(?<!version )\b(?!0\.0\.0\.0\b)(?:\d{1,3}\.){3}\d{1,3}\b(?!\.\d)", "[IP address removed]", seg[1])
                    new = re.sub(r"\bHP\d{11}\b", "[computer name removed]", new)
                    if new != seg[1] and not re.fullmatch(r"\d+\.\d+\.\d+\.\d+", seg[1].strip()):
                        n += 1; seg[1] = new
            if t["s"] == "nicholas-bohm" or m.get("f") == "Nicholas Bohm":
                m["b"] = [sg for sg in m["b"] if sg[1].strip()]
    return n


def fix_gavin(D: dict) -> bool:
    t = next((t for t in D["threads"] if t["s"] == "single-emails" and t["t"] == "Email to Gavin Andresen"), None)
    if not t or len(t["m"]) != 1:
        return False
    full = t["m"][0]["b"][0][1]
    m = re.search(r"26 Apr 2011, 10:29\n\n(.*?)\n\nMy reply:\n(On Tue, Apr 26, 2011 at 4:29 AM, .*? wrote:)\n\n(.*)$", full, re.S)
    if not m:
        return False
    sat_text, attrib, reply = m.group(1).strip(), m.group(2), m.group(3)
    # Gavin quotes Satoshi's first paragraph, then answers
    qend = reply.find("You must")
    quoted, rest = reply[:qend].strip(), reply[qend:].strip()
    base = dict(t["m"][0])
    sat = {**base, "d": int(dt.datetime(2011, 4, 26, 8, 29, tzinfo=dt.timezone.utc).timestamp()), "b": [["t", sat_text]],
           "sj": "alert key", "fe": "satoshin@gmx.com", "to": "Gavin Andresen", "od": "26 Apr 2011, 10:29; Gavin's reply quotes it as Tue, Apr 26, 2011 at 4:29 AM (US Eastern)"}
    sat.pop("dp", None)
    gav = {"f": "Gavin Andresen", "d": sat["d"] + 60, "dp": "day", "sj": "Re: alert key", "to": "satoshin@gmx.com", "fe": "",
           "b": [["t", attrib], ["q", quoted], ["t", rest]], "u": GAVIN_BLOG, "su": GAVIN_BLOG}
    t["m"] = [sat, gav]
    t["u"] = GAVIN_BLOG
    return True


# Exact send times of the five Satoshi–Adam Back emails, from Adam Back's exhibit AB1 in COPA v Wright
# (his own Outlook copies, printed with their UTC offsets), converted to UTC.
ADAM_BACK_TIMES = [
    (1219253439, "Wed 8/20/2008 6:30:39 PM (UTC+01:00)"),
    (1219323359, "Thu 8/21/2008 1:55:59 PM (UTC+01:00)"),
    (1219341589, "Thu 8/21/2008 6:59:49 PM (UTC+01:00)"),
    (1219342637, "Thu 8/21/2008 7:17:17 PM (UTC+01:00)"),
    (1231613205, "Sat 1/10/2009 6:46:45 PM (UTC)"),
]


def fix_adam_back(D: dict) -> bool:
    t = next((t for t in D["threads"] if t["s"] == "adam-back" and t["t"] == "Citation of your Hashcash paper"), None)
    if not t or len(t["m"]) != len(ADAM_BACK_TIMES):
        return False
    for m, (d, od) in zip(t["m"], ADAM_BACK_TIMES):
        m["d"] = d
        m["od"] = od + "; Adam Back's copy, COPA v Wright exhibit AB1"
        m.pop("dp", None)
    return True


def fix_wei_dai(D: dict) -> bool:
    """Wei Dai's own copies (gwern.net/doc/bitcoin/2008-nakamoto) give the dates and local times; the
    archive had all three on 22 Aug 2008, but Satoshi's release note was sent on 10 Jan 2009."""
    t = next((t for t in D["threads"] if t["s"] == "wei-dai" and t["t"] == "Citation of your b-money page"), None)
    if not t or len(t["m"]) != 3:
        return False
    a, r, b = t["m"]
    a.update(d=int(dt.datetime(2008, 8, 22, 16, 38, tzinfo=dt.timezone.utc).timestamp()), dp="local",
             od="Friday, August 22, 2008 4:38 PM; Wei Dai's copy")
    r.update(d=a["d"] + 60, dp="inferred")
    b.update(d=int(dt.datetime(2009, 1, 10, 11, 17, tzinfo=dt.timezone.utc).timestamp()), dp="local",
             od="Saturday, January 10, 2009 11:17 AM; Wei Dai's copy")
    return True


def main(argv: list[str]) -> int:
    data_p, txt_dir, ft = Path(argv[1]), Path(argv[2]), Path(argv[3])
    commit = argv[argv.index("--bohm-commit") + 1] if "--bohm-commit" in argv else "main"
    D = json.loads(data_p.read_text(encoding="utf-8"))
    D["threads"] = [t for t in D["threads"] if t["s"] not in NEW_SOURCES]
    VOCAB.update(w.lower() for t in D["threads"] for m in t["m"] for seg in m["b"] for w in re.findall(r"[A-Za-z]+", seg[1]))
    VOCAB.update({"http", "settings", "multi", "microsoft", "quarantined", "predisposition"})
    existing = [(int(m["d"]), norm(" ".join(seg[1] for seg in m["b"]))) for t in D["threads"] for m in t["m"]]
    bt, skipped = bohm_threads(txt_dir, existing, commit)
    ft_threads = forum_threads(ft)
    gav = fix_gavin(D)
    ab, wd = fix_adam_back(D), fix_wei_dai(D)
    print(f"adam-back times fixed: {ab}; wei-dai dates fixed: {wd}")
    n = max(int(t["id"][1:]) for t in D["threads"] if t["k"] == "x")
    for t in bt:
        n += 1; t["id"] = f"x{n}"
    pn = max(int(t["id"][1:]) for t in D["threads"] if t["k"] == "p")
    for t in ft_threads:
        pn += 1; t["id"] = f"p{pn}"
    D["threads"] += bt + ft_threads
    scrubbed = scrub_private(D)
    data_p.write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    sat = lambda ts: sum(1 for t in ts for m in t["m"] if m.get("s"))
    print(f"Bohm: {len(bt)} conversations, {sum(len(t['m']) for t in bt)} emails ({sat(bt)} by Satoshi); skipped {len(skipped)}:")
    for s in skipped:
        print("   ", s)
    print(f"Forum staff board: {len(ft_threads)} topics, {sum(len(t['m']) for t in ft_threads)} posts ({sat(ft_threads)} by Satoshi)")
    print("Gavin email split:", gav, "| private details removed from", scrubbed, "segments")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
