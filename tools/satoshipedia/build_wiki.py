"""Convert articles.py markup to wiki.json and validate every link against the archive data.

    python -I build_wiki.py <dir with articles.py and data.json>
"""
import html, json, re, sys
from pathlib import Path
from urllib.parse import quote

HERE = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
sys.path.insert(0, str(HERE))
from articles import ARTICLES, COMMON_REFS, DID_YOU_KNOW  # noqa: E402

_data = HERE / "data.json"
if not _data.exists():  # in the repository the archive is site/data/archive.json
    _data = HERE.parents[1] / "site" / "data" / "archive.json"
DATA = json.loads(_data.read_text())
THREADS = DATA["threads"]
COMMITS = DATA["commits"]
SLUGS = {a["slug"]: a for a in ARTICLES}
ERRORS = []

# Only these sources may be cited or linked: the Satoshi Nakamoto Institute, GitHub
# (nakamoto-archive, bitcoin/bitcoin), bitcoin.org, Wikipedia, Blocktrainer's archive, satoshin.name and primary sources
# (court records, the forum itself, correspondents' own published copies).
ALLOWED_HOSTS = {"nakamotoinstitute.org", "satoshi.nakamotoinstitute.org", "github.com", "bitcoin.org", "en.wikipedia.org",
                 "www.blocktrainer.de", "satoshin.name",
                 # primary sources, allowed from 21 October 2026: court records, the forum, correspondents' own copies
                 "caselaw.nationalarchives.gov.uk", "www.judiciary.uk", "www.govinfo.gov", "storage.courtlistener.com",
                 "bitcoindefense.org", "bitcointalk.org", "riski.wiki", "www.dropbox.com", "gwern.net", "blockstream.info"}  # Blocktrainer and satoshin.name added as sources on 20 October 2026 at the owner's request


def check_hosts(where, text):
    for url in re.findall(r"https?://[^\s\]\"'<>]+", text):
        host = re.match(r"https?://([^/:]+)", url).group(1).lower()
        if host not in ALLOWED_HOSTS:
            ERRORS.append(f"{where}: source not allowed: {url}")

import datetime as dt


def day(sec):
    return dt.datetime.fromtimestamp(sec, dt.timezone.utc).strftime("%Y-%m-%d")


def find_thread(src, title):
    return [t for t in THREADS if t["s"] == src and t["t"] == title]


def attr(s):
    return html.escape(s, quote=True)


def esc(s):
    return html.escape(s, quote=False)


def emph(text):
    text = re.sub(r"'''(.+?)'''", r"<b>\1</b>", text)
    return re.sub(r"''(.+?)''", r"<i>\1</i>", text)


def inline(text, ctx):
    """Inline markup -> HTML. ctx: dict(refs=order list, article=slug)."""
    tokens = []

    def stash(h):
        tokens.append(h)
        return f"\x00{len(tokens) - 1}\x00"

    def tmpl(m):
        kind, body = m.group(1), m.group(2)
        parts = body.split("|")
        if kind == "mail":
            src, title, label = parts[0], parts[1], parts[2]
            opts = dict(p.split("=", 1) for p in parts[3:])
            ts = find_thread(src, title)
            if not ts:
                ERRORS.append(f"{ctx['article']}: no thread {src!r} / {title!r}")
            else:
                # several conversations can share a title; date= picks the one with a message that day
                t = next((x for x in ts if opts.get("date") and any(day(msg["d"]) == opts["date"] for msg in x["m"])), ts[0])
                if opts:
                    ok = [i for i, msg in enumerate(t["m"])
                          if (not opts.get("from") or re.search(opts["from"], msg["f"], re.I))
                          and (not opts.get("date") or day(msg["d"]) == opts["date"])]
                    if not ok:
                        ERRORS.append(f"{ctx['article']}: no message {opts} in {title!r}")
                # every message an article relies on becomes one of its primary sources
                if ctx.get("primary") is not None:
                    mi = ok[0] if opts and ok else None
                    if not any(x.get("t") == t["id"] for x in ctx["primary"]):
                        ctx["primary"].append({"t": t["id"], "i": mi})
            a = f'<a class="ml" data-src="{attr(src)}" data-title="{attr(title)}"'
            if opts.get("from"):
                a += f' data-from="{attr(opts["from"])}"'
            if opts.get("date"):
                a += f' data-date="{attr(opts["date"])}"'
            return stash(a + f">{esc(label)}</a>")
        if kind == "commit":
            pre, label = parts[0], parts[1]
            cm = next((c for c in COMMITS if c["sha"].startswith(pre)), None)
            if not cm:
                ERRORS.append(f"{ctx['article']}: no commit {pre}")
            elif ctx.get("primary") is not None and not any(x.get("c") == cm["id"] for x in ctx["primary"]):
                ctx["primary"].append({"c": cm["id"]})
            return stash(f'<a class="cl" data-sha="{attr(pre)}">{esc(label)}</a>')
        if kind == "search":
            return stash(f'<a class="xl" href="#search-{attr(quote(parts[0], safe=""))}">{esc(parts[1])}</a>')
        if kind == "label":
            return stash(f'<a class="xl" href="#label-{attr(parts[0])}">{esc(parts[1])}</a>')
        if kind == "go":
            return stash(f'<a class="xl" href="{attr(parts[0])}">{esc(parts[1])}</a>')
        ERRORS.append(f"{ctx['article']}: unknown template {kind}")
        return ""

    text = re.sub(r"\{\{(mail|commit|search|label|go):(.*?)\}\}", tmpl, text)

    def wl(m):
        slug, label = m.group(1).strip(), m.group(2)
        if slug not in SLUGS:
            ERRORS.append(f"{ctx['article']}: missing article [[{slug}]]")
            return stash(esc(label or slug))
        return stash(f'<a class="wl" href="#wiki-{slug}" data-slug="{slug}">{esc(label or SLUGS[slug]["title"])}</a>')

    text = re.sub(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", wl, text)
    text = re.sub(r"\[(https?://[^\s\]]+) ([^\]]+)\]",
                  lambda m: stash(f'<a class="ext" href="{attr(m.group(1))}" target="_blank" rel="noopener">{emph(esc(m.group(2)))}</a>'), text)

    def ref(m):
        key = m.group(1)
        if ctx.get("refs") is None:
            ERRORS.append(f"{ctx['article']}: citation [^{key}] not allowed here")
            return ""
        if key not in ctx["refdefs"] and key not in COMMON_REFS:
            ERRORS.append(f"{ctx['article']}: unknown ref {key}")
            return ""
        if key not in ctx["refs"]:
            ctx["refs"].append(key)
        n = ctx["refs"].index(key) + 1
        return stash(f'<sup class="ref"><a data-cite="{n}" href="#wiki-{ctx["article"]}" aria-label="Reference {n}">[{n}]</a></sup>')

    text = re.sub(r"\[\^([\w-]+)\]", ref, text)
    text = emph(esc(text))
    return re.sub(r"\x00(\d+)\x00", lambda m: tokens[int(m.group(1))], text)


def blocks(body, ctx):
    """Body markup -> (lead_html, sections)."""
    lines = body.strip("\n").split("\n")
    out, cur = [], {"h": None, "lvl": 0, "id": None, "parts": []}
    out.append(cur)
    i = 0
    para = []

    def flush_para():
        if para:
            cur["parts"].append("<p>" + inline(" ".join(para), ctx) + "</p>")
            para.clear()

    while i < len(lines):
        ln = lines[i]
        m = re.match(r"^(={2,3}) (.+?) \1$", ln)
        if m:
            flush_para()
            sid = re.sub(r"[^a-z0-9]+", "-", m.group(2).lower()).strip("-")
            cur = {"h": esc(m.group(2)), "lvl": len(m.group(1)), "id": sid, "parts": []}
            out.append(cur)
        elif not ln.strip():
            flush_para()
        elif ln.startswith("* "):
            flush_para()
            items = []
            while i < len(lines) and lines[i].startswith("* "):
                items.append("<li>" + inline(lines[i][2:], ctx) + "</li>")
                i += 1
            cur["parts"].append("<ul>" + "".join(items) + "</ul>")
            continue
        elif ln.startswith("> "):
            flush_para()
            q = []
            while i < len(lines) and lines[i].startswith("> "):
                q.append(lines[i][2:])
                i += 1
            cite = q.pop()[2:] if q and q[-1].startswith("— ") else None
            cur["parts"].append("<blockquote><p>" + inline(" ".join(q), ctx) + "</p>"
                                + (f"<cite>{inline(cite, ctx)}</cite>" if cite else "") + "</blockquote>")
            continue
        elif ln.startswith("| "):
            flush_para()
            rows = []
            while i < len(lines) and lines[i].startswith("| "):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split(" | ")])
                i += 1
            head = "".join(f"<th>{inline(c, ctx)}</th>" for c in rows[0])
            body_rows = "".join("<tr>" + "".join(f"<td>{inline(c, ctx)}</td>" for c in r) + "</tr>" for r in rows[1:])
            cur["parts"].append(f'<div class="w-table"><table><thead><tr>{head}</tr></thead><tbody>{body_rows}</tbody></table></div>')
            continue
        elif re.match(r"^\{\{live:([\w-]+)\}\}$", ln.strip()):
            flush_para()
            name = re.match(r"^\{\{live:([\w-]+)\}\}$", ln.strip()).group(1)
            cur["parts"].append(f'<div class="w-live" data-live="{name}"></div>')
        else:
            para.append(ln.strip())
        i += 1
    flush_para()
    lead = "".join(out[0]["parts"])
    sections = [{"id": s["id"], "h": s["h"], "lvl": s["lvl"], "html": "".join(s["parts"])} for s in out[1:]]
    return lead, sections


articles = []
for a in ARTICLES:
    ctx = {"article": a["slug"], "refs": [], "refdefs": a.get("refs", {}), "primary": []}
    lead, sections = blocks(a["body"], ctx)
    info = [[esc(k), inline(v, {"article": a["slug"], "refs": None, "refdefs": {}})] for k, v in a.get("info", [])]
    refs_html = []
    for key in ctx["refs"]:
        src = ctx["refdefs"].get(key) or COMMON_REFS[key]
        refs_html.append(inline(src, {"article": a["slug"], "refs": None, "refdefs": {}}))
    for s in a.get("see", []):
        if s not in SLUGS:
            ERRORS.append(f"{a['slug']}: see-also {s} missing")
    articles.append({
        "slug": a["slug"], "title": a["title"], "kind": a["kind"], "img": a["img"],
        "caption": a.get("caption"), "cats": a["cats"], "short": a["short"],
        "featured": bool(a.get("featured")), "aliases": a.get("aliases", []), "label": a.get("label"),
        "info": info, "lead": lead, "sections": sections, "refs": refs_html, "see": a.get("see", []),
        "primary": ctx["primary"],
    })

dyk = [inline(x, {"article": "main-page", "refs": None, "refdefs": {}}) for x in DID_YOU_KNOW]
out = {"articles": sorted(articles, key=lambda a: a["title"].lower()), "dyk": dyk, "updated": f"{dt.date.today().day} {dt.date.today():%B %Y}"}
(HERE / "wiki.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
words = sum(len(re.sub(r"<[^>]+>", " ", a["lead"] + "".join(s["html"] for s in a["sections"])).split()) for a in articles)
print(f"{len(articles)} articles, {words:,} words, {len(dyk)} DYK, {len(json.dumps(out)) / 1e3:.0f} KB")
cats = {}
for a in articles:
    for c in a["cats"]:
        cats[c] = cats.get(c, 0) + 1
print("categories:", cats)
for _k, _v in COMMON_REFS.items():
    check_hosts(f"ref {_k}", _v)
for _a in ARTICLES:
    check_hosts(_a["slug"], _a["body"] + " ".join(v for _, v in _a["info"]) + " ".join(_a.get("refs", {}).values()))
for _d in DID_YOU_KNOW:
    check_hosts("did-you-know", _d)

if ERRORS:
    print("ERRORS:")
    for e in ERRORS:
        print("  ", e)
    sys.exit(1)
print("all links resolve")
