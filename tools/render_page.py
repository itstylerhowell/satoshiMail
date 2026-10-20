"""Make the single-file app from the template, the archive JSON and the Satoshipedia articles.

    python tools/render_page.py                      # site/data/archive.json + tools/mail_template.html → satoshi-mail.html
    python tools/render_page.py archive.json out.html

This is the last step of tools/build_mail.py (which builds archive.json from the
sni-data dataset); use it to rebuild the page after changing the template.
If tools/satoshipedia/wiki.json exists (made by build_wiki.py), its articles replace the
ones embedded in the template.
"""
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
data = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "site" / "data" / "archive.json"
out = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "satoshi-mail.html"
tpl = (root / "tools" / "mail_template.html").read_text(encoding="utf-8")
assert tpl.count("/*__DATA__*/") == 1, "template must contain one /*__DATA__*/ placeholder"
wiki = root / "tools" / "satoshipedia" / "wiki.json"
if wiki.exists():
    wjson = json.dumps(json.loads(wiki.read_text(encoding="utf-8")), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    tpl, n = re.subn(r'(<script id="wiki-data" type="application/json">).*?(</script>)', lambda m: m.group(1) + wjson + m.group(2), tpl, count=1, flags=re.S)
    assert n == 1, "wiki-data script not found in the template"
blob = data.read_text(encoding="utf-8").strip().replace("</", "<\\/")
out.write_text(tpl.replace("/*__DATA__*/", blob), encoding="utf-8")

# the satoshin.name link table is keyed by stable message IDs; warn if any no longer match a message by Satoshi
m = re.search(r'<script id="satoshin-data" type="application/json">(.*?)</script>', tpl, re.S)
if m:
    links = json.loads(m.group(1)).get("msgs", {})
    archive = json.loads(data.read_text(encoding="utf-8"))
    def key(msg):
        u = msg.get("u") or ""
        f = re.search(r"bitcointalk\.org/.*?msg(\d+)", u)
        return "bitcointalk:" + f.group(1) if f else re.sub(r"^https?://", "", u).rstrip("/")
    sat = {key(x) for t in archive["threads"] for x in t["m"] if str(x.get("s")) == "1"}
    stale = [k for k in links if k not in sat]
    if stale:
        print(f"warning: {len(stale)} of {len(links)} satoshin.name links match no message by Satoshi; rerun tools/satoshin_xref.py", file=sys.stderr)
print(f"{out} ({out.stat().st_size / 1e6:.1f} MB)")
