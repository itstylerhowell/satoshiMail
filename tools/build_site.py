"""Build the deployable, search-friendly Satoshi Mail website.

    python tools/build_mail.py data satoshi-mail.html          # the single-file app, as before
    python tools/build_site.py satoshi-mail.html site \\
        --base-url https://satoshimail.vercel.app/

Output (upload the folder as-is to Cloudflare Pages, GitHub Pages, Netlify or any static host):

    index.html                 the app, with real <head> tags, lang="en", JSON-LD and a <noscript> fallback;
                               its 7 MB archive loads from data/archive.json after the page has appeared
    assets/app.css, app.js     the app's styles and code (cacheable)
    assets/site.css            styles for the static pages
    satoshipedia/<slug>/       one static page per Satoshipedia article (+ satoshipedia/ index)
    conversations/<id-slug>/   one static page per conversation (+ paginated indexes per source)
    commits/<sha7>/            one static page per commit (+ paginated index)
    about/, 404.html, robots.txt, sitemap.xml, favicon.svg, og.png

Every static page has its own title, meta description, canonical URL, Open Graph/Twitter tags,
breadcrumbs and JSON-LD, links back into the live app, and uses system fonts (no render-blocking requests).
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import hashlib
import re
import urllib.parse
import shutil
import sys
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
BUILD_DATE = dt.date.today().isoformat()
SITE_NAME = "Satoshi Mail"
REPO_URL = "https://github.com/itstylerhowell/satoshiMail"
GOOGLE_VERIFY = ""   # Google Search Console → HTML tag → the content="…" value
VERIFY_REFRESH_JS = r"""
<script>
// the timestamps are added after the page is built (by the GitHub Action), so refresh the status from index.json
fetch("index.json", { cache: "no-cache" }).then(r => r.json()).then(ix => {
  const cur = ix.current && ix.versions.find(v => v.root === ix.current.root), esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const st = v => v && v.status === "confirmed" ? `In Bitcoin <a href="https://blockstream.info/block-height/${v.block}" rel="noopener">block ${v.block.toLocaleString("en-US")}</a>` : v && v.status === "pending" ? "Waiting for a Bitcoin block" : "Not timestamped yet";
  document.getElementById("vfstatus").innerHTML = st(cur);
  if (ix.versions.length) document.getElementById("vfversions").innerHTML = `<h2>Every version</h2><div class="tablewrap"><table class="terms"><thead><tr><th>Date</th><th>Fingerprint</th><th>Proof</th><th>Files</th></tr></thead><tbody>${ix.versions.map(v => `<tr><td>${esc(v.date.slice(0, 10))}</td><td><code>${esc(v.root.slice(0, 16))}…</code></td><td>${st(v)}</td><td><a href="${esc(v.manifest)}">manifest</a>${v.ots ? ` · <a href="${esc(v.ots)}">.ots</a>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}).catch(() => {});
</script>
"""
HOME_DESC = "Satoshi Mail (SatoshiMail): every email, forum post and commit by Satoshi Nakamoto, 2008–2011, in a Gmail-style archive with Satoshipedia."
SITE_ALT = ["SatoshiMail", "Satoshi Mail archive"]   # other names people search for (Google site names)
TAGLINE = "Every email, forum post and commit by Satoshi Nakamoto in a Gmail-style archive, with Satoshipedia and a map of his connections and timeline, 2008–2011."
FOUNDER = {"@type": "Person", "name": "Tyler Howell", "url": "https://x.com/TylerHowell88",
           "sameAs": ["https://x.com/TylerHowell88", "https://github.com/itstylerhowell"]}
MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
PAGE = 100   # links per index page

esc = lambda s: html.escape(str(s if s is not None else ""), quote=True)


def slugify(s: str, n: int = 60) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return (s[:n].rstrip("-") or "x")


def clip(text: str, n: int = 155) -> str:
    t = re.sub(r"\s+", " ", text or "").strip()
    if len(t) <= n:
        return t
    cut = t[:n - 1]
    return cut[:cut.rfind(" ")].rstrip(",;:") + "…" if " " in cut else cut + "…"


def utc(sec: int) -> dt.datetime:
    return dt.datetime.fromtimestamp(sec, dt.timezone.utc)


def long_day(sec: int) -> str:
    d = utc(sec)
    return f"{d.day} {MON[d.month - 1]} {d.year}"


def iso(sec: int) -> str:
    return utc(sec).strftime("%Y-%m-%dT%H:%M:%SZ")


def is_sat(name: str) -> bool:
    return bool(re.match(r"^satoshi( nakamoto)?$", (name or "").strip(), re.I))


def approx(m: dict) -> bool:
    return m.get("dp") in ("source-file", "inferred")


def autolink(text_escaped: str) -> str:
    return re.sub(r"(https?://[^\s<>&\"')\]]+)", r'<a href="\1" rel="nofollow noopener">\1</a>', text_escaped)


# ───────────────────────────── input ─────────────────────────────

def msg_key(m: dict) -> str | None:
    """Stable key of a message in the satoshin.name link table (same rule as tools/satoshin_xref.py and wiki.js)."""
    u = m.get("u") or ""
    mm = re.search(r"bitcointalk\.org/.*?msg(\d+)", u)
    if mm:
        return "bitcointalk:" + mm.group(1)
    return re.sub(r"^https?://", "", u).rstrip("/") or None


def check_satoshin(data: dict, links: dict) -> list[str]:
    """Keys in the satoshin.name link table that no longer match a message by Satoshi."""
    sat = {msg_key(m) for t in data["threads"] for m in t["m"] if str(m.get("s")) == "1"}
    return sorted(k for k in links if k not in sat)


def split_page(page: str) -> dict:
    """The single-file app → its parts."""
    if "<title>" not in page:
        raise SystemExit("input does not look like a built satoshi-mail.html")
    page = page[page.index("<title>"):]
    head_end = page.index("<style>")
    css_end = page.index("</style>", head_end)
    css = page[head_end + len("<style>"):css_end]
    body_start = css_end + len("</style>")
    wiki_i = page.index('<script id="wiki-data"')
    markup = page[body_start:wiki_i]
    wiki_end = page.index("</script>", wiki_i) + len("</script>")
    wiki_script = page[wiki_i:wiki_end]
    data_i = page.index('<script id="data"', wiki_end)
    side = page[wiki_end:data_i].strip()   # other data blocks, e.g. the satoshin.name map
    sn = {}
    if '<script id="satoshin-data"' in side:
        j = side.index('<script id="satoshin-data"')
        sn = json.loads(side[side.index(">", j) + 1:side.index("</script>", j)])
    data_open_end = page.index(">", data_i) + 1
    data_end = page.index("</script>", data_open_end)
    data_txt = page[data_open_end:data_end]
    app_i = page.index("<script>", data_end) + len("<script>")
    app_end = page.rindex("</script>")
    head = page[:head_end]
    return {"head": head, "css": css, "markup": markup, "wiki_script": wiki_script, "side_scripts": side, "satoshin": sn,
            "data": json.loads(data_txt.replace("<\\/", "</")), "data_txt": data_txt,
            "wiki": json.loads(wiki_script[wiki_script.index(">") + 1:-len("</script>")].replace("<\\/", "</")),
            "app_js": page[app_i:app_end], "page": page}


class Site:
    def __init__(self, parts: dict, out: Path, base: str):
        self.p, self.out, self.base = parts, out, base.rstrip("/") + "/"
        self.D, self.W = parts["data"], parts["wiki"]
        self.threads = self.D["threads"]
        self.commits = self.D["commits"]
        self.by_id = {t["id"]: t for t in self.threads}
        self.satoshin = parts["satoshin"].get("msgs", {})
        self.satoshin_site = parts["satoshin"].get("site", "https://satoshin.name/")
        stale = check_satoshin(self.D, self.satoshin)
        if stale:
            print(f"warning: {len(stale)} satoshin.name links match no message by Satoshi (rebuild with tools/satoshin_xref.py): {', '.join(stale[:5])}", file=sys.stderr)
        self.lists = {k: {"name": n, "long": l} for k, n, l in re.findall(r'"([a-z0-9-]+)":\s*\{ name: "([^"]+)",[^}]*long: "([^"]+)"', parts["app_js"])}
        self.arts = {a["slug"]: a for a in self.W["articles"]}
        self.alias = {}
        for a in self.W["articles"]:
            if a["slug"] != "satoshi-nakamoto":
                for x in a["aliases"]:
                    self.alias[x.lower()] = a["slug"]
        self.urls: list[tuple[str, str, float]] = []   # (path, lastmod, priority)
        for t in self.threads:
            t["_slug"] = f"{t['id']}-{slugify(t['t'])}"
        self.conv_titles()
        self.cited: dict[str, set] = {}
        for a in self.W["articles"]:
            for m in re.finditer(r'data-src="([^"]*)" data-title="([^"]*)"', a["lead"] + "".join(s["html"] for s in a["sections"])):
                t = self.find_thread(html.unescape(m.group(1)), html.unescape(m.group(2)))
                if t:
                    self.cited.setdefault(t["id"], set()).add(a["slug"])

    def conv_titles(self):
        def base(t):
            clean = re.sub(r"^\[[^\]]+\]\s*", "", t["t"]).strip() or t["t"]
            full = f"{clean} – Satoshi Nakamoto, {self.src_name(t)}"
            return full if len(full) <= 66 else clip(clean, 66 - len(" – Satoshi Nakamoto")) + " – Satoshi Nakamoto"
        seen: dict[str, list] = {}
        for t in self.threads:
            t["_title"] = base(t)
            seen.setdefault(t["_title"], []).append(t)
        for title, ts in seen.items():
            if len(ts) > 1:
                for t in ts:
                    d = utc(min(m["d"] for m in t["m"]))
                    t["_title"] = title.replace(" – Satoshi Nakamoto", f" ({MON[d.month - 1][:3]} {d.year}) – Satoshi Nakamoto", 1)
        seen2: dict[str, int] = {}
        for t in self.threads:
            seen2[t["_title"]] = seen2.get(t["_title"], 0) + 1
        for t in self.threads:
            if seen2[t["_title"]] > 1:
                t["_title"] += f" #{t['id']}"

    # paths ------------------------------------------------------------------
    def conv_path(self, t): return f"conversations/{t['_slug']}/"
    def commit_path(self, c): return f"commits/{c['sha'][:7]}/"
    def art_path(self, slug): return f"satoshipedia/{slug}/"
    def src_name(self, t): return self.lists.get(t["s"], {}).get("name", t["s"])
    def src_long(self, t): return self.lists.get(t["s"], {}).get("long", t["s"])

    def find_thread(self, src, title):
        return next((t for t in self.threads if t["s"] == src and t["t"] == title), None)

    def write(self, path: str, text: str, priority: float | None = 0.5, lastmod: str = BUILD_DATE):
        f = self.out / (path + "index.html" if path.endswith("/") or path == "" else path)
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding="utf-8")
        if priority is not None:
            self.urls.append((path, lastmod, priority))

    # page shell ---------------------------------------------------------------
    def page(self, path: str, title: str, desc: str, body: str, crumbs: list[tuple[str, str]], ld: list[dict],
             app_href: str = "", og_type: str = "article", canonical: str | None = None) -> str:
        up = "../" * path.count("/")
        url = self.base + (canonical if canonical is not None else path)
        crumbs_all = [("Satoshi Mail", "")] + crumbs
        bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": self.base + p} for i, (n, p) in enumerate(crumbs_all)]}
        ld_txt = "\n".join('<script type="application/ld+json">%s</script>' % json.dumps(x, ensure_ascii=False).replace("</", "<\\/") for x in ld + [bc])
        crumb_html = " <span aria-hidden=\"true\">›</span> ".join(
            (f'<a href="{up}{p}">{esc(n)}</a>' if i < len(crumbs_all) - 1 else f'<span aria-current="page">{esc(n)}</span>') for i, (n, p) in enumerate(crumbs_all))
        return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="max-image-preview:large">
<link rel="canonical" href="{esc(url)}">
<meta name="theme-color" content="#f7931a">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{esc(url)}">
<meta property="og:image" content="{self.base}og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@TylerHowell88">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{self.base}og.png">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#f7931a">
<link rel="stylesheet" href="{up}assets/site.css">
{ld_txt}
</head>
<body>
<header class="sh"><div class="in">
  <a class="brand" href="{up}"><img src="{up}favicon.svg" width="30" height="30" alt=""><span><b>Satoshi</b> Mail</span><span class="beta">Beta</span></a>
  <nav aria-label="Sections"><a href="{up}satoshipedia/">Satoshipedia</a><a href="{up}conversations/">Conversations</a><a href="{up}commits/">Commits</a><a href="{up}#map">Satoshi Map</a></nav>
  <a class="open" href="{up}{app_href}">Open in Satoshi Mail</a>
</div></header>
<nav class="crumbs" aria-label="Breadcrumb"><div class="in">{crumb_html}</div></nav>
<main class="in">
{body}
</main>
<footer class="sf"><div class="in">
  <p><b>Beta:</b> Satoshi Mail (SatoshiMail) is still in development. Founded and made by <a href="https://x.com/TylerHowell88" rel="noopener">Tyler Howell (@TylerHowell88)</a>. Open source under the MIT license: <a href="https://github.com/itstylerhowell/satoshiMail" rel="noopener">source on GitHub</a>.</p>
  <p>Inspired by <a href="https://x.com/lukeigel" rel="noopener">Luke Igel (@lukeigel)</a> and <a href="https://x.com/rtwlz" rel="noopener">Riley Walz (@rtwlz)</a>’s creation of <a href="https://jmail.world/" rel="noopener">Jmail</a>.</p>
  <p>Sources: <a href="https://satoshi.nakamotoinstitute.org/" rel="noopener">Satoshi Nakamoto Institute</a>, <a href="https://github.com/lugaxker/nakamoto-archive" rel="noopener">nakamoto-archive</a>, <a href="https://github.com/bitcoin/bitcoin" rel="noopener">Bitcoin Core</a>, <a href="https://bitcoin.org/" rel="noopener">bitcoin.org</a>; cross-checked with <a href="https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive" rel="noopener">Blocktrainer</a> and <a href="https://satoshin.name/" rel="noopener">satoshin.name</a>. Satoshipedia text draws on Wikipedia (CC BY-SA 4.0). <a href="{up}about/">About</a> · <a href="{up}updates/">Update log</a> · <a href="{up}verify/">Verify</a></p>
</div></footer>
</body>
</html>
"""

    # message rendering ----------------------------------------------------------
    def render_body(self, m: dict) -> str:
        out = []
        for seg in m["b"]:
            k, text = seg[0], seg[1] if len(seg) > 1 else ""
            if k == "t":
                out.append(f'<div class="t">{autolink(esc(text))}</div>')
            elif k == "q":
                head = seg[2] if len(seg) > 2 and seg[2] else ""
                out.append(f'<blockquote>{f"<div class=qh>{esc(head)}</div>" if head else ""}<div class="t">{autolink(esc(text))}</div></blockquote>')
            elif k == "c":
                out.append(f"<pre><code>{esc(text)}</code></pre>")
            else:
                out.append(f'<div class="t small">{autolink(esc(text))}</div>')
        return "".join(out)

    def plain(self, m: dict) -> str:
        return "\n".join(s[1] for s in m["b"] if s[0] in ("t", "c") and len(s) > 1)

    # ── conversations ──
    def build_conversations(self):
        by_src: dict[str, list] = {}
        for t in self.threads:
            by_src.setdefault(t["s"], []).append(t)
        for lst in by_src.values():
            lst.sort(key=lambda t: min(m["d"] for m in t["m"]))
        for src, lst in by_src.items():
            for i, t in enumerate(lst):
                self.build_conversation(t, lst[i - 1] if i else None, lst[i + 1] if i + 1 < len(lst) else None)
        # indexes: /conversations/ and /conversations/<source>/ (paginated)
        order = ["cryptography", "bitcoin-list", "p2p-research", "bitcointalk", "p2pfoundation", "hal-finney", "martti-malmi", "mike-hearn", "dustin-trammell", "adam-back", "wei-dai", "single-emails"]
        srcs = [s for s in order if s in by_src] + [s for s in by_src if s not in order]
        rows = "".join(f'<li><a href="{s}/"><b>{esc(self.lists.get(s, {}).get("long", s))}</b></a> <span class="muted">{len(by_src[s])} conversation{"s" if len(by_src[s]) != 1 else ""}, {sum(len(t["m"]) for t in by_src[s]):,} messages</span></li>' for s in srcs)
        n_msgs = sum(len(t["m"]) for t in self.threads)
        body = f"""<h1>Satoshi Nakamoto's conversations</h1>
<p class="lead">All {len(self.threads)} conversations Satoshi took part in, {n_msgs:,} messages in all: mailing lists, forums and private email, each with the replies that surround his messages.</p>
<ul class="cards">{rows}</ul>"""
        self.write("conversations/", self.page("conversations/", "Satoshi Nakamoto's emails and forum posts – Satoshi Mail",
                   clip(f"Browse all {len(self.threads)} conversations Satoshi Nakamoto took part in: the Cryptography mailing list, bitcoin-list, BitcoinTalk, the P2P Foundation and his private email."),
                   body, [("Conversations", "conversations/")], [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Satoshi Nakamoto's conversations", "url": self.base + "conversations/"}],
                   app_href="#inbox", og_type="website"), priority=0.8)
        for s in srcs:
            lst = by_src[s]
            name = self.lists.get(s, {}).get("long", s)
            pages = [lst[i:i + PAGE] for i in range(0, len(lst), PAGE)]
            for pi, chunk in enumerate(pages):
                path = f"conversations/{s}/" + (f"page-{pi + 1}/" if pi else "")
                items = "".join(f'<li><a href="{"../" * (path.count("/"))}{self.conv_path(t)}">{esc(t["t"])}</a> <span class="muted">{long_day(min(m["d"] for m in t["m"]))} · {len(t["m"])} message{"s" if len(t["m"]) != 1 else ""}</span></li>' for t in chunk)
                pager = ""
                if len(pages) > 1:
                    up = "../" * path.count("/")
                    pager = '<nav class="pager" aria-label="Pages">' + "".join(
                        (f'<a href="{up}conversations/{s}/{f"page-{k + 1}/" if k else ""}"{" aria-current=page" if k == pi else ""}>{k + 1}</a>') for k in range(len(pages))) + "</nav>"
                body = f"""<h1>{esc(name)}</h1>
<p class="lead">{len(lst)} conversation{"s" if len(lst) != 1 else ""} with Satoshi Nakamoto, oldest first{f", page {pi + 1} of {len(pages)}" if len(pages) > 1 else ""}.</p>
<ol class="list">{items}</ol>{pager}"""
                title = f"{self.lists.get(s, {}).get('name', s)} – Satoshi Nakamoto's conversations" + (f", page {pi + 1}" if pi else "")
                self.write(path, self.page(path, title, clip((f"Page {pi + 1} of {len(pages)}. " if pi else "") + f"{len(lst)} conversations with Satoshi Nakamoto from the {name}, with every message and reply, in date order."),
                           body, [("Conversations", "conversations/"), (name, f"conversations/{s}/")] + ([(f"Page {pi + 1}", path)] if pi else []),
                           [{"@context": "https://schema.org", "@type": "CollectionPage", "name": title, "url": self.base + path}], app_href=f"#label-{s}", og_type="website"), priority=0.6)

    def build_conversation(self, t, prev, nxt):
        path = self.conv_path(t)
        up = "../" * path.count("/")
        sat_first = next((m for m in t["m"] if m.get("s")), t["m"][0])
        msgs = []
        for i, m in enumerate(t["m"]):
            who = "Satoshi Nakamoto" if m.get("s") else m["f"]
            date = long_day(m["d"]) + (" (approximate)" if approx(m) else utc(m["d"]).strftime(", %H:%M UTC"))
            note = f'<p class="note">{esc(m["w"])}</p>' if m.get("w") else ""
            to = f' <span class="muted">to {esc(m["to"])}</span>' if m.get("to") else ""
            src = f' · <a href="{esc(m["u"])}" rel="nofollow noopener">original</a>' if m.get("u") else ""
            msgs.append(f"""<article class="msg{' sat' if m.get('s') else ''}" id="m{i}">
<header><b>{esc(who)}</b>{to}<span class="muted"> · <time datetime="{iso(m['d'])}">{esc(date)}</time>{src}</span></header>
{note}{self.render_body(m)}</article>""")
        # related Satoshipedia articles: people in the thread + articles citing it
        rel = set(self.cited.get(t["id"], set()))
        for m in t["m"]:
            s = self.alias.get(m["f"].lower())
            if s:
                rel.add(s)
        rel_html = ""
        if rel:
            rel_html = '<aside class="related"><h2>In Satoshipedia</h2><ul>' + "".join(
                f'<li><a href="{up}{self.art_path(s)}">{esc(self.arts[s]["title"])}</a> <span class="muted">{esc(self.arts[s]["short"])}</span></li>' for s in sorted(rel, key=lambda s: self.arts[s]["title"]) if s in self.arts) + "</ul></aside>"
        pn = '<nav class="prevnext" aria-label="More conversations">' + (f'<a rel="prev" href="{up}{self.conv_path(prev)}">← {esc(prev["t"])}</a>' if prev else "<span></span>") + (f'<a rel="next" href="{up}{self.conv_path(nxt)}">{esc(nxt["t"])} →</a>' if nxt else "") + "</nav>"
        people = sorted({("Satoshi Nakamoto" if m.get("s") else m["f"]) for m in t["m"]})
        first = min(m["d"] for m in t["m"])
        body = f"""<h1>{esc(t['t'])}</h1>
<p class="lead">{esc(self.src_long(t))} · {len(t['m'])} message{'s' if len(t['m']) != 1 else ''} · from {long_day(first)} · with {esc(', '.join(people[:6]))}{'…' if len(people) > 6 else ''}</p>
<p class="actions"><a class="btn" href="{up}#t-{t['id']}">Read in Satoshi Mail</a>{f' <a class="btn ghost" href="{esc(t["su"])}" rel="noopener">Archive source</a>' if t.get('su') else ''}</p>
{''.join(msgs)}
{rel_html}
{pn}"""
        title = t["_title"]
        desc = clip(f"Satoshi Nakamoto on {self.src_long(t)}, {long_day(sat_first['d'])}: " + self.plain(sat_first))
        if len(desc) < 90:   # a one-line message: say where and with whom too
            desc = clip(f"{desc.rstrip('.')}. {self.src_long(t)}, {len(t['m'])} message{'s' if len(t['m']) != 1 else ''}"
                        + (f" with {', '.join(o[:3])}" if (o := [x for x in people if x != "Satoshi Nakamoto"]) else "") + ".")
        if t["k"] == "x":
            ld = {"@context": "https://schema.org", "@type": "CreativeWork", "name": t["t"], "url": self.base + path,
                  "about": {"@type": "Person", "name": "Satoshi Nakamoto"}, "dateCreated": iso(first),
                  "hasPart": [{"@type": "EmailMessage", "sender": {"@type": "Person", "name": "Satoshi Nakamoto" if m.get("s") else m["f"]},
                               "dateSent": iso(m["d"]), "text": clip(self.plain(m), 500)} for m in t["m"][:30]]}
        else:
            m0 = t["m"][0]
            ld = {"@context": "https://schema.org", "@type": "DiscussionForumPosting", "headline": t["t"], "url": self.base + path,
                  "author": {"@type": "Person", "name": "Satoshi Nakamoto" if m0.get("s") else m0["f"]}, "datePublished": iso(m0["d"]),
                  "text": clip(self.plain(m0), 2000), "isPartOf": {"@type": "WebSite", "name": SITE_NAME, "url": self.base},
                  "comment": [{"@type": "Comment", "author": {"@type": "Person", "name": "Satoshi Nakamoto" if m.get("s") else m["f"]},
                               "datePublished": iso(m["d"]), "text": clip(self.plain(m), 500)} for m in t["m"][1:31]]}
        crumbs = [("Conversations", "conversations/"), (self.src_long(t), f"conversations/{t['s']}/"), (clip(t["t"], 50), path)]
        self.write(path, self.page(path, title, desc, body, crumbs, [ld], app_href=f"#t-{t['id']}"), priority=0.6)

    # ── commits ──
    def build_commits(self):
        cs = sorted(self.commits, key=lambda c: c["d"])
        first_of: dict[tuple, dict] = {}
        for c in cs:
            first_of.setdefault((c["s"], c.get("r")), c)
        for i, c in enumerate(cs):
            canon = first_of[(c["s"], c.get("r"))]
            dup = canon is not c
            path = self.commit_path(c)
            up = "../" * path.count("/")
            files = c.get("f") or []
            fl = "".join(f'<details><summary><code>{esc(f[0])}</code></summary><pre><code>{esc(f[3] if len(f) > 3 else "")}</code></pre></details>' for f in files if isinstance(f, list))
            rel = f" · release {esc(c['rel'])}" if c.get("rel") else ""
            body = f"""<h1>{esc(c['s'])}</h1>
<p class="lead">Commit by Satoshi Nakamoto ({esc(c.get('who') or 's_nakamoto')}) on {long_day(c['d'])}{f" · SVN r{c['r']}" if c.get('r') else ""}{rel} · {c.get('fc', len(files))} files, +{c.get('ins', 0):,} −{c.get('del', 0):,}</p>
<p class="actions"><a class="btn" href="{up}#t-{c['id']}">Open in Satoshi Mail</a> <a class="btn ghost" href="{esc(c['u'])}" rel="noopener">View on GitHub</a></p>
<h2>Files changed</h2>{fl or '<p class="muted">No diff stored for this commit.</p>'}
<nav class="prevnext" aria-label="More commits">{f'<a rel="prev" href="{up}{self.commit_path(cs[i - 1])}">← {esc(clip(cs[i - 1]["s"], 60))}</a>' if i else '<span></span>'}{f'<a rel="next" href="{up}{self.commit_path(cs[i + 1])}">{esc(clip(cs[i + 1]["s"], 60))} →</a>' if i + 1 < len(cs) else ''}</nav>"""
            same = dup or sum(1 for x in cs if x["s"][:30] == c["s"][:30]) > 1   # tell same-message commits apart
            suffix = (f" (r{c['r']}{', ' + c['sha'][:7] if same else ''})" if c.get("r") else (f" ({c['sha'][:7]})" if same else "")) + " – Satoshi Nakamoto commit"
            title = clip(c["s"], 68 - len(suffix)) + suffix
            desc = clip(f"Satoshi Nakamoto's commit {c['sha'][:7]} to Bitcoin, {long_day(c['d'])}: {c['s']}. {c.get('fc', len(files))} files changed.")
            ld = {"@context": "https://schema.org", "@type": "SoftwareSourceCode", "name": c["s"], "url": self.base + path,
                  "codeRepository": "https://github.com/bitcoin/bitcoin", "programmingLanguage": "C++", "dateCreated": iso(c["d"]),
                  "author": {"@type": "Person", "name": "Satoshi Nakamoto"}, "sameAs": c["u"]}
            self.write(path, self.page(path, title, desc, body, [("Commits", "commits/"), (clip(c["s"], 40), path)], [ld], app_href=f"#t-{c['id']}",
                                       canonical=self.commit_path(canon) if dup else None), priority=None if dup else 0.4)
        pages = [cs[i:i + PAGE] for i in range(0, len(cs), PAGE)]
        for pi, chunk in enumerate(pages):
            path = "commits/" + (f"page-{pi + 1}/" if pi else "")
            up = "../" * path.count("/")
            items = "".join('<li><a href="%s%s">%s</a> <span class="muted">%s%s</span></li>' % (up, self.commit_path(c), esc(c["s"]), long_day(c["d"]), (" · r%s" % c["r"]) if c.get("r") else "") for c in chunk)
            pager = '<nav class="pager" aria-label="Pages">' + "".join(f'<a href="{up}commits/{f"page-{k + 1}/" if k else ""}"{" aria-current=page" if k == pi else ""}>{k + 1}</a>' for k in range(len(pages))) + "</nav>" if len(pages) > 1 else ""
            body = f'<h1>Satoshi Nakamoto\'s commits</h1><p class="lead">His {len(cs)} commits to Bitcoin\'s source code, {long_day(cs[0]["d"])} to {long_day(cs[-1]["d"])}, oldest first.</p><ol class="list">{items}</ol>{pager}'
            self.write(path, self.page(path, "Satoshi Nakamoto's commits to Bitcoin" + (f", page {pi + 1}" if pi else "") + " – Satoshi Mail",
                       clip((f"Page {pi + 1} of {len(pages)}. " if pi else "") + f"All {len(cs)} commits Satoshi Nakamoto made to Bitcoin's source code, from {long_day(cs[0]['d'])} to {long_day(cs[-1]['d'])}, each with its message and diff."),
                       body, [("Commits", "commits/")] + ([(f"Page {pi + 1}", path)] if pi else []),
                       [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Satoshi Nakamoto's commits", "url": self.base + path}], app_href="#commits", og_type="website"), priority=0.6 if not pi else 0.4)

    # ── Satoshipedia ──
    def live(self, name: str, up: str) -> str:
        sent = [(t, m) for t in self.threads for m in t["m"] if m.get("s")]
        real = [(t, m) for t, m in sent if not m.get("w")]
        text = lambda m: "\n".join(s[1] for s in m["b"] if s[0] == "t" and len(s) > 1)
        if name == "by-year":
            years: dict[int, dict] = {}
            for t, m in sent:
                years.setdefault(utc(m["d"]).year, {"e": 0, "p": 0, "x": 0, "c": 0})[t["k"]] += 1
            for c in self.commits:
                years.setdefault(utc(c["d"]).year, {"e": 0, "p": 0, "x": 0, "c": 0})["c"] += 1
            rows = "".join(f"<tr><td>{y}</td><td>{v['e']}</td><td>{v['p']}</td><td>{v['x']}</td><td>{v['c']}</td></tr>" for y, v in sorted(years.items()))
            return f'<table><thead><tr><th>Year</th><th>Mailing lists</th><th>Forum posts</th><th>Private email</th><th>Commits</th></tr></thead><tbody>{rows}</tbody></table>'
        if name == "posting-hours":
            h = [0] * 24
            for t, m in sent:
                if not m.get("dp") or m.get("dp") == "exact":
                    h[utc(m["d"]).hour] += 1
            rows = "".join(f"<tr><td>{i:02d}:00</td><td>{v}</td></tr>" for i, v in enumerate(h))
            return f'<table><thead><tr><th>Hour (UTC)</th><th>Messages</th></tr></thead><tbody>{rows}</tbody></table>'
        if name == "spellings":
            all_t = "\n".join(text(m) for _, m in sent).lower()
            cnt = lambda w: len(re.findall(r"\b" + w, all_t))
            pairs = [("colour", "color"), ("favour", "favor"), ("grey\\b", "gray\\b"), ("optimis", "optimiz"), ("realis", "realiz"), ("maths\\b", "math\\b")]
            lbl = lambda w: w.replace("\\b", "")
            rows = "".join(f"<tr><td>{lbl(b)}…</td><td>{cnt(b)}</td><td>{lbl(a)}…</td><td>{cnt(a)}</td></tr>" for b, a in pairs)
            return f'<table><thead><tr><th>British</th><th>Uses</th><th>American</th><th>Uses</th></tr></thead><tbody>{rows}</tbody></table>'
        if name == "double-space":
            raw = "\n".join(text(m) for _, m in sent)
            two, one = len(re.findall(r"[.?!]  [A-Z]", raw)), len(re.findall(r"[.?!] [A-Z]", raw))
            return f"<p>Two spaces after a sentence: {two:,}; one space: {one:,} ({round(100 * two / max(1, two + one))}% two).</p>"
        if name == "addresses":
            by: dict[str, dict] = {}
            for t, m in sent:
                if t["k"] == "x" and m.get("fe"):
                    v = by.setdefault(m["fe"], {"n": 0, "with": set(), "first": m["d"], "last": m["d"]})
                    v["n"] += 1; v["with"].add(self.src_name(t)); v["first"] = min(v["first"], m["d"]); v["last"] = max(v["last"], m["d"])
            rows = "".join(f"<tr><td>{esc(k)}</td><td>{v['n']}</td><td>{esc(', '.join(sorted(v['with'])))}</td><td>{long_day(v['first'])} – {long_day(v['last'])}</td></tr>" for k, v in sorted(by.items(), key=lambda kv: kv[1]["first"]))
            return f'<table><thead><tr><th>Address</th><th>Emails</th><th>Used with</th><th>Dates</th></tr></thead><tbody>{rows}</tbody></table>'
        if name == "timeline":
            ev = []
            def last_of(pred, label):
                cand = [(t, m) for t, m in real if pred(t)]
                if cand:
                    t, m = max(cand, key=lambda x: x[1]["d"])
                    ev.append((m["d"], f'{label}: <a href="{up}{self.conv_path(t)}">{esc(t["t"])}</a>'))
            last_of(lambda t: t["k"] == "e", "Last mailing-list email")
            last_of(lambda t: t["s"] == "bitcointalk", "Last forum post")
            for s, L in self.lists.items():
                if L["long"].startswith("Private email with"):
                    last_of(lambda t, s=s: t["s"] == s, f"Last email to {L['name']}")
            for t, m in real:
                if t["s"] == "single-emails":
                    ev.append((m["d"], f'<a href="{up}{self.conv_path(t)}">{esc(t["t"])}</a>'))
            lc = max(self.commits, key=lambda c: c["d"])
            ev.append((lc["d"], f'Last commit: <a href="{up}{self.commit_path(lc)}">{esc(lc["s"])}</a>'))
            return "<ul>" + "".join(f"<li><b>{long_day(d)}</b> – {h}</li>" for d, h in sorted(ev)) + "</ul>"
        if name == "quote":
            return "<ul>" + "".join(f"<li>“{esc(c['t'])}”</li>" for c in self.D.get("clips", [])[:3]) + "</ul>"
        return ""

    def wiki_html(self, h: str, up: str, slug: str) -> str:
        def ml(m):
            attrs = dict(re.findall(r'data-(src|title|from|date)="([^"]*)"', m.group(1)))
            t = self.find_thread(html.unescape(attrs.get("src", "")), html.unescape(attrs.get("title", "")))
            if not t:
                return f'<a class="ml" href="{up}#search-{quote(html.unescape(attrs.get("title", "")))}">'
            i = -1
            if "from" in attrs or "date" in attrs:
                rx = re.compile(html.unescape(attrs["from"]), re.I) if "from" in attrs else None
                for k, mm in enumerate(t["m"]):
                    if (not rx or rx.search(mm["f"])) and ("date" not in attrs or utc(mm["d"]).date().isoformat() == attrs["date"]):
                        i = k; break
            return f'<a class="ml" href="{up}{self.conv_path(t)}{f"#m{i}" if i >= 0 else ""}">'
        h = re.sub(r'<a class="ml"((?: data-[a-z]+="[^"]*")+)>', ml, h)
        def cl(m):
            c = next((c for c in self.commits if c["sha"].startswith(m.group(1))), None)
            return f'<a class="cl" href="{up}{self.commit_path(c)}">' if c else "<a>"
        h = re.sub(r'<a class="cl" data-sha="([0-9a-f]+)">', cl, h)
        h = re.sub(r'<a class="wl" href="#wiki-([a-z0-9-]+)" data-slug="[a-z0-9-]+">', lambda m: f'<a class="wl" href="{up}{self.art_path(m.group(1))}">', h)
        h = re.sub(r'<a class="xl" href="#([^"]*)">', lambda m: f'<a class="xl" href="{up}#{m.group(1)}">', h)
        h = re.sub(r'<a data-cite="(\d+)" href="#wiki-[a-z0-9-]+"', r'<a href="#cite-\1"', h)
        h = re.sub(r'<div class="w-live" data-live="([a-z-]+)"></div>', lambda m: f'<div class="live">{self.live(m.group(1), up)}<p class="muted">Live, interactive version: <a href="{up}#wiki-{slug}">open in Satoshi Mail</a>.</p></div>', h)
        return h

    def person_stats(self, a):
        al = {x.lower() for x in a["aliases"]}
        per = {}
        for t in self.threads:
            k = sum(1 for m in t["m"] if m["f"].lower() in al)
            if k:
                per[t["id"]] = k
        return per

    def build_wiki(self):
        arts = sorted(self.W["articles"], key=lambda a: a["title"].replace("The ", ""))
        for a in arts:
            path = self.art_path(a["slug"])
            up = "../" * path.count("/")
            info = "".join(f"<dt>{k}</dt><dd>{self.wiki_html(v, up, a['slug'])}</dd>" for k, v in a["info"])
            secs = "".join(f'<h{s["lvl"]} id="{s["id"]}">{s["h"]}</h{s["lvl"]}>{self.wiki_html(s["html"], up, a["slug"])}' for s in a["sections"])
            toc = [s for s in a["sections"] if s["lvl"] == 2]
            toc_items = "".join('<li><a href="#%s">%s</a></li>' % (s["id"], s["h"]) for s in toc)
            toc_html = f'<nav class="toc" aria-label="Contents"><b>Contents</b><ol>{toc_items}</ol></nav>' if len(toc) >= 3 else ""
            arch = ""
            if a["kind"] == "person" and a["slug"] != "satoshi-nakamoto" and a["aliases"]:
                per = self.person_stats(a)
                if per:
                    top = sorted(per.items(), key=lambda kv: -kv[1])[:8]
                    arch = f'<h2 id="in-the-archive">In the archive</h2><p>{sum(per.values())} messages in {len(per)} conversations with Satoshi.</p><ul>' + "".join(
                        f'<li><a href="{up}{self.conv_path(self.by_id[i])}">{esc(self.by_id[i]["t"])}</a> <span class="muted">{n} message{"s" if n != 1 else ""}</span></li>' for i, n in top) + "</ul>"
            see_items = "".join('<li><a href="%s%s">%s</a></li>' % (up, self.art_path(s), esc(self.arts[s]["title"])) for s in a["see"] if s in self.arts)
            see = f'<h2 id="see-also">See also</h2><ul>{see_items}</ul>' if a["see"] else ""
            ref_items = "".join('<li id="cite-%d">%s</li>' % (i + 1, r) for i, r in enumerate(a["refs"]))
            refs = f'<h2 id="references">References</h2><ol class="refs">{ref_items}</ol>' if a["refs"] else ""
            body = f"""<article class="wiki">
<h1>{esc(a['title'])}</h1>
<p class="from">From Satoshipedia, the Satoshi Mail encyclopedia</p>
<aside class="infobox"><b>{esc(a['title'])}</b>{f"<p class=cap>{esc(a['caption'])}</p>" if a['caption'] else ""}<dl>{info}</dl></aside>
{self.wiki_html(a['lead'], up, a['slug'])}
{toc_html}
{secs}
{arch}
{see}
{refs}
<p class="cats">Categories: {" · ".join(esc(c) for c in a["cats"])}</p>
</article>"""
            title = f"{a['title']} – Satoshipedia"
            if len(f"{a['title']} – Satoshipedia, the Satoshi Nakamoto encyclopedia") <= 65:
                title = f"{a['title']} – Satoshipedia, the Satoshi Nakamoto encyclopedia"
            lead_txt = re.sub(r"<[^>]+>", "", re.sub(r'<sup class="ref">.*?</sup>', "", a["lead"]))
            desc = clip(html.unescape(lead_txt))
            ld = {"@context": "https://schema.org", "@type": "Article", "headline": a["title"], "description": a["short"],
                  "url": self.base + path, "inLanguage": "en", "dateModified": BUILD_DATE,
                  "author": {"@type": "Organization", "name": "Satoshipedia"}, "publisher": FOUNDER,
                  "isPartOf": {"@type": "WebSite", "name": SITE_NAME, "url": self.base}, "image": self.base + "og.png"}
            if a["kind"] == "person":
                ld["about"] = {"@type": "Person", "name": a["title"]}
            self.write(path, self.page(path, title, desc, body, [("Satoshipedia", "satoshipedia/"), (a["title"], path)], [ld], app_href=f"#wiki-{a['slug']}"),
                       priority=0.9 if a.get("featured") else 0.8)
        cats: dict[str, list] = {}
        for a in arts:
            for c in a["cats"]:
                cats.setdefault(c, []).append(a)
        def cat_block(c, lst):
            items = "".join('<li><a href="%s/">%s</a> <span class="muted">%s</span></li>' % (a["slug"], esc(a["title"]), esc(a["short"])) for a in lst)
            return f'<section><h2>{esc(c)}</h2><ul>{items}</ul></section>'
        blocks = "".join(cat_block(c, lst) for c, lst in sorted(cats.items()))
        body = f'<h1>Satoshipedia</h1><p class="lead">The Satoshi Mail encyclopedia: {len(arts)} articles about Satoshi Nakamoto, the people he wrote to, and the events of Bitcoin\'s first years. Every article links to the emails, posts and commits it draws on.</p>{blocks}'
        self.write("satoshipedia/", self.page("satoshipedia/", "Satoshipedia: the Satoshi Nakamoto encyclopedia – Satoshi Mail",
                   clip(f"Satoshipedia has {len(arts)} sourced articles about Satoshi Nakamoto, his correspondents such as Hal Finney and Martti Malmi, and Bitcoin's first years, linked to his emails."),
                   body, [("Satoshipedia", "satoshipedia/")], [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Satoshipedia", "url": self.base + "satoshipedia/"}],
                   app_href="#wiki", og_type="website"), priority=0.9)

    # ── about, 404, app ──
    def build_verify(self):
        """/verify/: the archive's fingerprint and its Bitcoin timestamps (tools/timestamp.py), plus the proof files."""
        import importlib.util
        spec = importlib.util.spec_from_file_location("timestamp", HERE / "timestamp.py"); ts = importlib.util.module_from_spec(spec); spec.loader.exec_module(ts)
        clean = {**self.D, "threads": [{k: v for k, v in t.items() if not k.startswith("_")} for t in self.threads]}
        text = ts.manifest(clean); root = ts.root_of(text)
        ts.sync(text, self.out / "verify")
        vs = ts.load_index(); cur = next((v for v in vs if v["root"] == root), None)
        def status(v):
            if v and v["status"] == "confirmed": return f'In Bitcoin <a href="https://blockstream.info/block-height/{v["block"]}" rel="noopener">block {v["block"]:,}</a>'
            if v and v["status"] == "pending": return "Waiting for a Bitcoin block"
            return "Not timestamped yet"
        rows = "".join(f'<tr><td>{esc(v["date"][:10])}</td><td><code>{esc(v["root"][:16])}…</code></td><td>{status(v)}</td><td><a href="{esc(v["manifest"])}">manifest</a>{f""" · <a href="{esc(v["ots"])}">.ots</a>""" if v.get("ots") else ""}</td></tr>' for v in vs)
        body = f"""<h1>Verify the archive</h1>
<p class="lead">Every email, forum post and commit in Satoshi Mail has a fingerprint: a SHA-256 hash of its exact words, sender and date. The list of all {text.count(chr(10)) - 1:,} fingerprints is timestamped in the Bitcoin blockchain with OpenTimestamps, so anyone can prove each message existed, word for word, by that date, and hasn't been edited since.</p>
<p class="actions"><a class="btn" href="../#verify">Verify a message in Satoshi Mail</a></p>
<h2>This version</h2>
<p>Fingerprint: <code style="word-break:break-all">{root}</code><br>Status: <span id="vfstatus">{status(cur)}</span></p>
<p><a href="{esc(cur["manifest"]) if cur else "current.txt"}">Download the manifest</a>{f' · <a href="{esc(cur["ots"])}">download the .ots proof</a>' if cur and cur.get("ots") else ""}</p>
<div id="vfversions">{f'<h2>Every version</h2><div class="tablewrap"><table class="terms"><thead><tr><th>Date</th><th>Fingerprint</th><th>Proof</th><th>Files</th></tr></thead><tbody>{rows}</tbody></table></div>' if rows else ""}</div>
<h2>Check it yourself</h2>
<ol><li>Download a version's manifest and its .ots proof.</li>
<li>Drop both on <a href="https://opentimestamps.org/" rel="noopener">opentimestamps.org</a>, or run <code>ots verify</code> with the <a href="https://github.com/opentimestamps/opentimestamps-client" rel="noopener">OpenTimestamps client</a>, to see the Bitcoin block that proves when the manifest existed.</li>
<li>Each line of the manifest is one message's fingerprint. In Satoshi Mail, open a message's details and choose <b>Verify this message</b> to recompute it in your browser, or see <a href="{REPO_URL}/blob/main/tools/timestamp.py" rel="noopener">tools/timestamp.py</a> for exactly what is hashed.</li></ol>
<p class="muted">The fingerprints prove the archive hasn't changed since it was timestamped. They don't prove who first wrote a message: for that, each message links to its original source.</p>
"""
        body += VERIFY_REFRESH_JS
        ld = {"@context": "https://schema.org", "@type": "WebPage", "name": "Verify the Satoshi Mail archive", "url": self.base + "verify/",
              "isPartOf": {"@type": "WebSite", "name": SITE_NAME, "url": self.base}}
        self.write("verify/", self.page("verify/", "Verify the archive: Bitcoin timestamps – Satoshi Mail",
                   "Every message in Satoshi Mail has a SHA-256 fingerprint, and the list of fingerprints is timestamped in Bitcoin with OpenTimestamps. Check it yourself.",
                   body, [("Verify", "verify/")], [ld], app_href="#verify", og_type="website"), priority=0.5)

    def build_updates(self):
        """The update log (tools/satoshipedia/updates.json) as a page and an RSS feed."""
        ups = json.loads((HERE / "satoshipedia" / "updates.json").read_text(encoding="utf-8"))["updates"]
        repo = "https://github.com/itstylerhowell/satoshiMail/commit/"
        def day(d): return long_day(int(dt.datetime.strptime(d, "%Y-%m-%d").replace(tzinfo=dt.timezone.utc).timestamp()))
        items = "".join(f"""<li class="upd"><p class="muted"><time datetime="{esc(u['date'])}">{day(u['date'])}</time></p><h2>{esc(u['title'])}</h2>
<ul>{"".join(f"<li>{esc(x)}</li>" for x in u["items"])}</ul>{f'<p class="muted">Changes: {", ".join(f"""<a href="{repo}{esc(c)}" rel="noopener">{esc(c)}</a>""" for c in u["commits"])}</p>' if u.get("commits") else ""}</li>""" for u in ups)
        body = f"""<h1>Update log</h1>
<p class="lead">Every update to Satoshi Mail, newest first. Follow along with the <a href="feed.xml">RSS feed</a>.</p>
<p class="actions"><a class="btn" href="../#updates">Open in Satoshi Mail</a></p>
<ol class="list upd-list">{items}</ol>"""
        latest = ups[0]["date"] if ups else BUILD_DATE
        ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Satoshi Mail update log", "url": self.base + "updates/",
              "dateModified": latest, "isPartOf": {"@type": "WebSite", "name": SITE_NAME, "url": self.base}}
        page = self.page("updates/", "Update log – Satoshi Mail", clip(f"Every update to Satoshi Mail, newest first. Latest, {day(latest)}: {ups[0]['title']}." if ups else "Every update to Satoshi Mail."),
                         body, [("Update log", "updates/")], [ld], app_href="#updates", og_type="website")
        page = page.replace("</head>", f'<link rel="alternate" type="application/rss+xml" title="Satoshi Mail updates" href="{self.base}updates/feed.xml">\n</head>', 1)
        self.write("updates/", page, priority=0.5, lastmod=latest)
        def rfc822(d): return dt.datetime.strptime(d, "%Y-%m-%d").replace(hour=12, tzinfo=dt.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
        rss_items = "".join(f"""  <item><title>{esc(u['title'])}</title><link>{self.base}updates/</link><guid isPermaLink="false">satoshimail-update-{esc(u['date'])}-{k}</guid><pubDate>{rfc822(u['date'])}</pubDate><description>{esc("<ul>" + "".join(f"<li>{esc(x)}</li>" for x in u["items"]) + "</ul>")}</description></item>
""" for k, u in enumerate(reversed(ups)))
        rss_items = "".join(reversed(rss_items.splitlines(True)))
        (self.out / "updates" / "feed.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
  <title>Satoshi Mail updates</title><link>{self.base}updates/</link><description>Every update to Satoshi Mail, the archive of Satoshi Nakamoto's emails, posts and commits.</description><language>en</language>
  <atom:link href="{self.base}updates/feed.xml" rel="self" type="application/rss+xml"/>
{rss_items}</channel></rss>
""", encoding="utf-8")

    def licenses_html(self) -> str:
        """The "Licenses and terms" section of the About page, from NOTICE.md, so the two never disagree.
        The homepage's Dataset data points its license field here (the archive has no single licence)."""
        notice = (HERE.parent / "NOTICE.md").read_text(encoding="utf-8")
        def md(t):
            t = esc(t)
            t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: f'<a href="{m.group(2) if m.group(2).startswith("http") else REPO_URL + "/blob/main/" + m.group(2)}" rel="noopener">{m.group(1)}</a>', t)
            t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
            return re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
        rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in notice.splitlines() if l.startswith("| ") and not l.startswith("| Material")]
        trs = "".join(f"<tr><td>{md(a)}</td><td>{md(b)}</td><td>{md(c)}</td></tr>" for a, b, c in rows)
        return f"""
<h2 id="licenses">Licenses and terms</h2>
<p>The code and design of Satoshi Mail, Satoshipedia and Satoshi Map are open source under the <a href="{REPO_URL}/blob/main/LICENSE" rel="noopener">MIT license</a>. Satoshipedia's article text is shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener">CC BY-SA 4.0</a>. The archive itself keeps each source's own terms:</p>
<div class="tablewrap"><table class="terms"><thead><tr><th>Material</th><th>Where it comes from</th><th>Terms</th></tr></thead><tbody>{trs}</tbody></table></div>
<p class="muted">The same list is in <a href="{REPO_URL}/blob/main/NOTICE.md" rel="noopener">NOTICE.md</a>.</p>"""

    def build_about(self):
        body = f"""<h1>About Satoshi Mail</h1>
<p class="lead">{esc(TAGLINE)}</p>
<p><b>Satoshi Mail is in beta</b> and still in development. It was founded and made by <a href="https://x.com/TylerHowell88" rel="noopener">Tyler Howell (@TylerHowell88)</a>, and it is open source under the MIT license: <a href="https://github.com/itstylerhowell/satoshiMail" rel="noopener">source code on GitHub</a>.</p>
<h2>What's here</h2>
<ul><li><a href="../conversations/">{len(self.threads)} conversations</a>: mailing lists, BitcoinTalk, the P2P Foundation and Satoshi's private email, with the replies around his messages.</li>
<li><a href="../commits/">{len(self.commits)} commits</a> Satoshi made to Bitcoin's source code, each with its diff.</li>
<li><a href="../satoshipedia/">Satoshipedia</a>: {len(self.W['articles'])} articles on the people and events, linked to the messages they draw on.</li>
<li><a href="../#map">Satoshi Map</a>: everyone he corresponded with, and his timeline from 2008 to 2011.</li></ul>
<h2>Sources</h2>
<p>Emails and forum posts from the <a href="https://satoshi.nakamotoinstitute.org/" rel="noopener">Satoshi Nakamoto Institute</a>; private correspondence from <a href="https://github.com/lugaxker/nakamoto-archive" rel="noopener">nakamoto-archive</a>; commits from <a href="https://github.com/bitcoin/bitcoin" rel="noopener">Bitcoin Core</a>; the white paper from <a href="https://bitcoin.org/bitcoin.pdf" rel="noopener">bitcoin.org</a>. The archive was cross-checked against <a href="https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive" rel="noopener">Blocktrainer's archive</a> and <a href="https://satoshin.name/" rel="noopener">satoshin.name</a>, the Satoshi Nakamoto Archive: every message in either is also here. Satoshipedia's articles were written with AI assistance and cite their sources, including Wikipedia (CC BY-SA 4.0).</p>"""
        body += self.licenses_html()
        self.write("about/", self.page("about/", "About Satoshi Mail – Satoshi Nakamoto's emails, posts and commits",
                   clip(TAGLINE), body, [("About", "about/")], [{"@context": "https://schema.org", "@type": "AboutPage", "name": "About Satoshi Mail", "url": self.base + "about/"}],
                   app_href="#about", og_type="website"), priority=0.5)
        nf = self.page("404.html", "Page not found – Satoshi Mail", "This page doesn't exist. Browse Satoshi Nakamoto's emails, forum posts and commits, or Satoshipedia, instead.",
                       '<h1>Page not found</h1><p class="lead">That page isn\'t here. Try <a href="./satoshipedia/">Satoshipedia</a>, the <a href="./conversations/">conversations</a> or <a href="./">Satoshi Mail</a>.</p>', [], [])
        # Cloudflare serves 404.html at whatever address was asked for, so its links must be absolute
        root = urllib.parse.urlsplit(self.base).path or "/"
        nf = re.sub(r'(href|src)="(?:\.\./|\./)*(?![a-z]+:|#|/)([^"]*)"', lambda m: f'{m.group(1)}="{root}{m.group(2)}"', nf)
        (self.out / "404.html").write_text(nf, encoding="utf-8")

    def build_app(self):
        p = self.p
        assets = self.out / "assets"
        assets.mkdir(parents=True, exist_ok=True)
        (self.out / "data").mkdir(exist_ok=True)
        clean = {**self.D, "threads": [{k: v for k, v in t.items() if not k.startswith("_")} for t in self.threads]}
        dump = lambda x: json.dumps(x, ensure_ascii=False, separators=(",", ":"))
        # the complete archive, for anyone who wants the data (the app doesn't load this one)
        (self.out / "data" / "archive.json").write_text(dump(clean), encoding="utf-8")
        # What the app loads: fingerprinted files in static/, which never change once published, so browsers
        # and the CDN can keep them for a year (vercel.json); a new build gets new names. The commit diffs are
        # split off and fetched only when someone opens a commit or searches.
        lite = {**clean, "commits": [{**c, "f": [[*f[:3], None, *f[4:]] for f in c["f"]]} for c in clean.get("commits", [])]}
        diffs = [[f[3] for f in c["f"]] for c in clean.get("commits", [])]
        static = self.out / "static"
        static.mkdir(exist_ok=True)
        def put(stem, ext, text):
            name = f"{stem}.{hashlib.sha256(text.encode()).hexdigest()[:10]}.{ext}"
            (static / name).write_text(text, encoding="utf-8")
            return "static/" + name
        self.app_css, self.app_js = put("app", "css", p["css"]), put("app", "js", p["app_js"])
        self.archive_url, self.diffs_url = put("archive", "json", dump(lite)), put("diffs", "json", dump(diffs))
        head = p["head"]
        head = re.sub(r"<title>.*?</title>", "<title>Satoshi Mail: Satoshi Nakamoto's emails, posts and commits</title>", head, count=1)
        head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
        head = re.sub(r'<meta name="description" content="[^"]*">', lambda m: f'<meta name="description" content="{esc(HOME_DESC)}">', head, count=1)
        if self.google_verify:
            head += f'\n<meta name="google-site-verification" content="{esc(self.google_verify)}">'
        ld = [
            {"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME, "alternateName": SITE_ALT, "url": self.base, "description": TAGLINE, "inLanguage": "en",
             "publisher": FOUNDER, "potentialAction": {"@type": "SearchAction", "target": self.base + "?q={search_term_string}", "query-input": "required name=search_term_string"}},
            {"@context": "https://schema.org", "@type": "Dataset", "name": "Satoshi Nakamoto's emails, forum posts and commits", "url": self.base, "description": TAGLINE,
             "creator": FOUNDER, "temporalCoverage": "2008-08/2011-04",
             "isBasedOn": ["https://satoshi.nakamotoinstitute.org/", "https://github.com/lugaxker/nakamoto-archive", "https://github.com/bitcoin/bitcoin", "https://bitcoin.org/bitcoin.pdf"],
             "license": self.base + "about/#licenses",
             "distribution": [{"@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": self.base + "data/archive.json"}]},
            {"@context": "https://schema.org", **FOUNDER},
            {"@context": "https://schema.org", "@type": "Organization", "name": SITE_NAME, "alternateName": SITE_ALT, "url": self.base,
             "logo": {"@type": "ImageObject", "url": self.base + "logo-512.png", "width": 512, "height": 512}, "founder": FOUNDER, "sameAs": [REPO_URL]},
        ]
        ld_html = "\n".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
        extra = f"""<meta name="robots" content="max-image-preview:large">
<link rel="canonical" href="{self.base}">
<meta property="og:url" content="{self.base}">
<meta property="og:image" content="{self.base}og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:image" content="{self.base}og.png">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#f7931a">
<link rel="preload" href="{self.archive_url}" as="fetch" crossorigin>
{ld_html}"""
        reset = (":root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
                 "html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}"
                 "img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}")
        noscript = f"""<noscript><div style="max-width:720px;margin:40px auto;padding:0 16px;font:16px/1.6 system-ui,sans-serif">
<h1>Satoshi Mail: Satoshi Nakamoto's emails, posts and commits</h1><p>SatoshiMail: {esc(TAGLINE)}</p>
<p>The interactive reader needs JavaScript. You can still read everything here:</p>
<ul><li><a href="conversations/">All {len(self.threads)} conversations</a></li><li><a href="commits/">All {len(self.commits)} commits</a></li><li><a href="satoshipedia/">Satoshipedia, the encyclopedia</a></li><li><a href="about/">About Satoshi Mail</a></li></ul></div></noscript>"""
        loader = """<script>
window.SM_SITE = true;
window.SM_DIFFS = "%s";
(function () {
  var q = new URLSearchParams(location.search).get("q");
  if (q && !location.hash) history.replaceState(null, "", location.pathname + "#search-" + encodeURIComponent(q));
  fetch("%s").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (t) {
    document.getElementById("data").textContent = t;
    var s = document.createElement("script"); s.src = "%s"; document.body.appendChild(s);
  }).catch(function () {
    var l = document.getElementById("loading"); if (l) l.innerHTML = '<p style="font:15px system-ui;max-width:420px;text-align:center">The archive could not be loaded. <a href="conversations/">Read the conversations</a> instead.</p>';
  });
})();
</script>""" % (self.diffs_url, self.archive_url, self.app_js)
        doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>{reset}</style>
{head.strip()}
{extra}
<link rel="stylesheet" href="{self.app_css}">
</head>
<body>
{noscript}
{p['markup'].strip()}
{p['wiki_script']}
{p['side_scripts']}
<script id="data" type="application/json"></script>
{loader}
</body>
</html>
"""
        (self.out / "index.html").write_text(doc, encoding="utf-8")
        self.urls.insert(0, ("", BUILD_DATE, 1.0))

    def build_static_assets(self):
        assets = HERE / "site-assets"
        shutil.copy(assets / "site.css", self.out / "assets" / "site.css")
        # Icons: Google's search results use the site's favicon (a square at least 48 px, /favicon.ico or a
        # <link rel="icon">); phones use the apple-touch and manifest icons; logo-512 is the Organization logo.
        for f in ("favicon.svg", "og.png", "favicon.ico", "icon-48.png", "icon-96.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "logo-512.png"):
            shutil.copy(assets / f, self.out / f)
        for f in assets.glob("google*.html"):   # Google Search Console verification files, served as-is
            shutil.copy(f, self.out / f.name)
        (self.out / "site.webmanifest").write_text(json.dumps({
            "name": SITE_NAME, "short_name": SITE_NAME, "description": TAGLINE, "start_url": "/", "display": "standalone",
            "background_color": "#ffffff", "theme_color": "#f7931a",
            "icons": [{"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
                      {"src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}, indent=2), encoding="utf-8")
        (self.out / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {self.base}sitemap.xml\n", encoding="utf-8")
        urls = "".join(f"  <url><loc>{esc(self.base + p)}</loc><lastmod>{lm}</lastmod><priority>{pr:.1f}</priority></url>\n" for p, lm, pr in self.urls)
        (self.out / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n', encoding="utf-8")
        (self.out / ".nojekyll").write_text("", encoding="utf-8")   # GitHub Pages: serve folders as-is
        # Cloudflare Pages / Netlify: caching and basic security headers (other hosts ignore this file)
        (self.out / "_headers").write_text("""/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN

/static/*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/data/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/og.png
  Cache-Control: public, max-age=604800

/favicon.svg
  Cache-Control: public, max-age=604800

/favicon.ico
  Cache-Control: public, max-age=604800

/icon-*
  Cache-Control: public, max-age=604800

/apple-touch-icon.png
  Cache-Control: public, max-age=604800
""", encoding="utf-8")


# Vercel Web Analytics, the plain-HTML version (vercel.com/docs/analytics/quickstart, framework "html").
# Static pages count themselves. The app switches views by #hash, which the script doesn't follow, so it
# turns automatic tracking off and reports each view itself, e.g. path "/#wiki-adam-back", route "/#wiki".
# Searches are counted as "/#search", without what was typed.
VA_QUEUE = '<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>'
VA_PAGE = VA_QUEUE + '\n<script defer src="/_vercel/insights/script.js"></script>\n'
VA_APP = (VA_QUEUE + '\n<script defer src="/_vercel/insights/script.js" data-disable-auto-track="1"></script>\n'
          '<script>(function () { var last; function view() { var h = location.hash || "#inbox", p = location.pathname + h;'
          ' if (/^#search/.test(h)) p = location.pathname + "#search";' ' if (p === last) return; last = p; window.va("pageview", { route: location.pathname + (h.match(/^#[a-z]+/) || ["#"])[0], path: p }); }'
          ' view(); addEventListener("hashchange", view); })();</script>\n')


def add_analytics(out: Path) -> int:
    n = 0
    for f in out.rglob("*.html"):
        html_ = f.read_text(encoding="utf-8")
        if "/_vercel/insights/" in html_ or "</head>" not in html_:
            continue
        snippet = VA_APP if f == out / "index.html" else VA_PAGE
        f.write_text(html_.replace("</head>", snippet + "</head>", 1), encoding="utf-8")
        n += 1
    return n


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("page", help="the built single-file app (satoshi-mail.html)")
    ap.add_argument("out", nargs="?", default="site", help="output folder (default: site)")
    ap.add_argument("--base-url", default="https://satoshimail.vercel.app/", help="public URL the site will live at (default: the Vercel address)")
    ap.add_argument("--no-analytics", action="store_true", help="leave out Vercel Web Analytics")
    ap.add_argument("--google-verify", default=GOOGLE_VERIFY, help="Google Search Console verification code (meta tag content)")
    a = ap.parse_args(argv)
    out = Path(a.out)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    parts = split_page(Path(a.page).read_text(encoding="utf-8"))
    s = Site(parts, out, a.base_url)
    s.google_verify = a.google_verify
    s.build_app()
    s.build_wiki()
    s.build_conversations()
    s.build_commits()
    s.build_about()
    s.build_updates()
    s.build_verify()
    s.build_static_assets()
    if not a.no_analytics:
        add_analytics(out)
    n = sum(1 for _ in out.rglob("*.html"))
    size = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
    print(f"{n} pages, {len(s.urls)} URLs in sitemap.xml, {size / 1e6:.1f} MB → {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
