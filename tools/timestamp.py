"""Fingerprint the archive and timestamp it in Bitcoin with OpenTimestamps.

Every email, forum post and commit gets a SHA-256 fingerprint of its exact contents. The fingerprints are
listed, one per line, in a manifest; the manifest of each version of the archive is timestamped in the
Bitcoin blockchain, so anyone can prove that every message existed, word for word, by that date.

    python tools/timestamp.py manifest   # print the current archive's fingerprint (the manifest's SHA-256)
    python tools/timestamp.py stamp      # save the current manifest in proofs/ and timestamp it (needs `ots`)
    python tools/timestamp.py upgrade    # fetch finished Bitcoin attestations for pending timestamps
    python tools/timestamp.py sync       # copy proofs/ to site/verify/ (build_site.py does this too)

`ots` is the OpenTimestamps client (pip install opentimestamps-client). The GitHub Action in
.github/workflows/timestamp.yml runs stamp, upgrade and sync automatically.

How a message's fingerprint is made (the Verify page recomputes it in the browser the same way):
    message: SHA-256 of the UTF-8 JSON [thread id, message index, from, date (Unix seconds), body]
    commit:  SHA-256 of the UTF-8 JSON [commit id, Git SHA, date, subject]
JSON is written without spaces or ASCII escaping, exactly as JavaScript's JSON.stringify writes it.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "site" / "data" / "archive.json"
PROOFS = ROOT / "proofs"
VERIFY = ROOT / "site" / "verify"
HEADER = "# Satoshi Mail archive manifest v1: SHA-256 of each message and commit. See /verify/ on the site.\n"


def canon(x) -> bytes:
    return json.dumps(x, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def items(D: dict):
    for t in D["threads"]:
        for i, m in enumerate(t["m"]):
            yield f"t/{t['id']}/{i}", canon([t["id"], i, m["f"], m["d"], m["b"]])
    for c in D.get("commits", []):
        yield f"c/{c['id']}", canon([c["id"], c["sha"], c["d"], c["s"]])


def manifest(D: dict) -> str:
    return HEADER + "".join(f"{hashlib.sha256(b).hexdigest()} {k}\n" for k, b in items(D))


def root_of(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_index() -> list[dict]:
    f = PROOFS / "index.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else []


def save_index(ix: list[dict]) -> None:
    PROOFS.mkdir(exist_ok=True)
    (PROOFS / "index.json").write_text(json.dumps(ix, indent=2) + "\n", encoding="utf-8")


def ots(*args: str) -> subprocess.CompletedProcess | None:
    if not shutil.which("ots"):
        return None
    return subprocess.run(["ots", *args], capture_output=True, text=True)


def stamp() -> None:
    D = json.loads(ARCHIVE.read_text(encoding="utf-8"))
    text = manifest(D); root = root_of(text)
    ix = load_index()
    e = next((x for x in ix if x["root"] == root), None)
    if not e:
        name = f"{dt.date.today().isoformat()}-{root[:12]}.txt"
        PROOFS.mkdir(exist_ok=True)
        (PROOFS / name).write_text(text, encoding="utf-8")
        e = {"root": root, "date": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "manifest": name,
             "items": text.count("\n") - 1, "ots": None, "status": "unstamped", "block": None}
        ix.insert(0, e)
        print("new archive version", root)
    if not e["ots"]:
        r = ots("stamp", str(PROOFS / e["manifest"]))
        if r is None:
            print("ots isn't installed: pip install opentimestamps-client, then run this again")
        elif r.returncode == 0 and (PROOFS / (e["manifest"] + ".ots")).exists():
            e["ots"], e["status"] = e["manifest"] + ".ots", "pending"
            print("timestamp submitted to the OpenTimestamps calendars; Bitcoin confirmation follows in a few hours")
        else:
            print("ots stamp failed:", r.stderr.strip()[:300])
    save_index(ix); sync()


def upgrade() -> None:
    ix = load_index()
    for e in ix:
        if e["status"] != "pending" or not e["ots"]:
            continue
        f = str(PROOFS / e["ots"])
        if ots("upgrade", f) is None:
            print("ots isn't installed"); return
        info = ots("info", f)
        heights = [int(h) for h in re.findall(r"BitcoinBlockHeaderAttestation\((\d+)\)", info.stdout if info else "")]
        if heights:
            e["status"], e["block"] = "confirmed", min(heights)
            print(e["manifest"], "is in Bitcoin block", e["block"])
        else:
            print(e["manifest"], "still waiting for a Bitcoin block")
        bak = Path(f + ".bak")
        if bak.exists():
            bak.unlink()
    save_index(ix); sync()


def sync(current_text: str | None = None, out: Path | None = None) -> None:
    """Publish the proofs and the current manifest in site/verify/ (or out/) for the Verify page."""
    VERIFY_ = out or VERIFY
    VERIFY_.mkdir(parents=True, exist_ok=True)
    for f in PROOFS.glob("*.txt*") if PROOFS.exists() else []:
        shutil.copy(f, VERIFY_ / f.name)
    if current_text is None and ARCHIVE.exists():
        current_text = manifest(json.loads(ARCHIVE.read_text(encoding="utf-8")))
    ix = load_index()
    cur = {"root": root_of(current_text), "items": current_text.count("\n") - 1} if current_text else None
    if current_text:
        (VERIFY_ / "current.txt").write_text(current_text, encoding="utf-8")
    (VERIFY_ / "index.json").write_text(json.dumps({"current": cur, "versions": ix}, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else "manifest"
    if cmd == "manifest":
        print(root_of(manifest(json.loads(ARCHIVE.read_text(encoding="utf-8")))))
    elif cmd == "stamp":
        stamp()
    elif cmd == "upgrade":
        upgrade()
    elif cmd == "sync":
        sync()
    else:
        print(__doc__); return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
