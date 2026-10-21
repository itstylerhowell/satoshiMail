"""Build Satoshi Mail + Satoshipedia from the v6 template.

usage: python3 -I tools/satoshipedia/assemble.py [ROOT]      (ROOT defaults to the repository)
In the repository: reads tools/satoshipedia/ and site/data/archive.json, and writes
tools/mail_template.html (keeps /*__DATA__*/) and satoshi-mail.html.
In a working folder with tools/, wiki/ and out/: writes out/mail_template.html and out/satoshi-mail.html.
"""
import json, sys, pathlib

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parents[2]).resolve()
if (root / "tools" / "satoshipedia" / "assemble.py").exists():  # the repository layout
    tools = wk = root / "tools" / "satoshipedia"
    DATA, TEMPLATE_OUT, PAGE_OUT = root / "site" / "data" / "archive.json", root / "tools" / "mail_template.html", root / "satoshi-mail.html"
else:
    tools, wk, out = root / "tools", root / "wiki", root / "out"
    out.mkdir(exist_ok=True)
    DATA, TEMPLATE_OUT, PAGE_OUT = wk / "data.json", out / "mail_template.html", out / "satoshi-mail.html"
src = (wk / "template_v6.html").read_text()

# 1. strip the publish skeleton
src = src[src.index("<title>"):]
tail = src.rindex("</body></html>")
src = src[:tail].rstrip() + "\n"


def patch(s, old, new, count=1):
    n = s.count(old)
    if n != count:
        raise SystemExit(f"patch anchor found {n}x (want {count}): {old[:90]!r}")
    return s.replace(old, new)


# 2. serif face for the encyclopedia
roboto = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono&display=swap">'
src = patch(src, roboto, roboto + '\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap">')

# 3. css before the first </style> after the main stylesheet
i = src.index("</style>", src.index("--bg: #f6f8fc"))
src = src[:i] + "\n" + (tools / "wiki.css").read_text() + "\n" + (tools / "map.css").read_text() + "\n" + (tools / "seo.css").read_text() + "\n" + (tools / "jlook.css").read_text() + "\n" + (tools / "ask.css").read_text() + "\n" + (tools / "sources.css").read_text() + "\n" + (tools / "feedback.css").read_text() + "\n" + (tools / "retro.css").read_text() + "\n" + (tools / "updates.css").read_text() + "\n" + src[i:]

# 4. markup, 5. article data
wjson = json.dumps(json.load(open(wk / "wiki.json")), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
src = patch(src, '<div id="layer"></div>', '<div id="layer"></div>\n' + (tools / "wiki.html").read_text() + (tools / "map.html").read_text())
ujson = json.dumps(json.load(open(tools / "updates.json")), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
src = patch(src, '<script id="data" type="application/json">', f'<script id="wiki-data" type="application/json">{wjson}</script>\n<script id="updates-data" type="application/json">{ujson}</script>\n<script id="data" type="application/json">')

# 6. encyclopedia script before boot, 7. boot through the combined router
src = patch(src, "/* ═════════════ boot ═════════════ */\nrender(true);", (tools / "wiki.js").read_text() + (tools / "map.js").read_text() + (tools / "seo.js").read_text() + (tools / "ask.js").read_text() + (tools / "sources.js").read_text() + (tools / "feedback.js").read_text() + (tools / "updates.js").read_text() + "\n/* ═════════════ boot ═════════════ */\nrouteAll(true);")
src = patch(src, '$("#rail").classList.remove("open"); render(true); });', '$("#rail").classList.remove("open"); routeAll(true); });')

# inbox banner
src = patch(src, 'is under <a href="#inbox-private">Private</a>.` : ""}</span></p>',
            'is under <a href="#inbox-private">Private</a>.` : ""} Who\'s who and what happened is in <a href="#wiki">Satoshipedia</a>, in the dock below.</span></p>')
# sources added from public records (tools/extra_sources.py)
src = patch(src, '''  "single-emails":   { name: "Other email",     color: "#616161", addr: "",                                   long: "Single emails to Gavin Andresen, Jon Matonis and Laszlo Hanyecz", priv: 1 },
''', '''  "single-emails":   { name: "Other email",     color: "#616161", addr: "",                                   long: "Single emails to Gavin Andresen, Jon Matonis and Laszlo Hanyecz", priv: 1 },
  "nicholas-bohm":   { name: "Nicholas Bohm",   color: "#6d4c41", addr: "",                                   long: "Private email with Nicholas Bohm (COPA v Wright exhibit NB1)", priv: 1 },
  "forum-staff":     { name: "Forum staff board", color: "#b06000", addr: "bitcoin.org/smf staff board",       long: "Deleted staff-board topics, saved by the forum in 2012" },
''')

# no apps grid (the nine dots by the profile picture): the button, its menu and its styles go
src = patch(src, '    <button class="ib hide-sm" data-act="apps" aria-label="Satoshi Nakamoto Institute apps" title="SNI apps"><span class="ms">apps</span></button>\n', '')
src = patch(src, '  apps(el) {\n    const a = (href, icon, label) => `<a href="${href}" target="_blank" rel="noopener">${ic(icon)}${label}</a>`;\n    popover(el, `<div class="apps">${a("https://nakamotoinstitute.org/library/", "menu_book", "Library")}${a("https://nakamotoinstitute.org/mempool/", "article", "Mempool")}${a("https://satoshi.nakamotoinstitute.org/quotes/", "format_quote", "Quotes")}${a("https://nakamotoinstitute.org/the-skeptics/", "trending_down", "Skeptics")}${a("https://nakamotoinstitute.org/podcasts/", "podcasts", "Podcasts")}${a("https://satoshi.nakamotoinstitute.org/code/", "code", "Code")}</div>`);\n  },\n', '')
for _rule in (".apps { display: grid;", ".apps a { display: flex;", ".apps a:hover {", ".apps .ms {"):
    _k = src.index(_rule); src = src[:_k] + src[src.index("\n", _k) + 1:]
# keyboard: hand keys to the encyclopedia while it is open, and add g w
kd = '  if ((e.metaKey || e.ctrlKey) && (e.key || "").toLowerCase() === "k") { e.preventDefault(); $("#q").focus(); $("#q").select(); return; }'
src = patch(src, kd, '  if (document.body.classList.contains("in-map")) { mapKey(e); return; }\n  if (document.body.classList.contains("in-wiki")) { wikiKey(e); return; }\n' + kd)
src = patch(src, 'const dest = { i: "#inbox",', 'const dest = { w: "#wiki", i: "#inbox",')

# conversation header: Satoshipedia chips under the title
src = patch(src, '<div id="msgs"></div>', '${wikiChipsFor(t)}<div id="msgs"></div>')

# beta labelling: pill beside the logo, loading screen, About page
src = patch(src, '<span><b>Satoshi</b> Mail</span>\n    </a>', '<span><b>Satoshi</b> Mail</span>\n    </a>\n    <button class="beta-pill" type="button" data-act="beta" title="Satoshi Mail is in beta and still in development">Beta</button>')
src = patch(src, '  <div class="bar"></div>\n</div>', '  <div class="bar"></div>\n  <div class="ld-beta"><span class="beta-pill static">Beta</span>In development</div>\n</div>')
src = patch(src, '<h2>About Satoshi Mail</h2>', '<h2>About Satoshi Mail<span class="beta-pill static">Beta</span></h2>\n    <p class="lead"><b>Satoshi Mail is in beta.</b> It is still in development, so features may change, move or not work yet. <button class="linkbtn" data-act="beta">What this means</button></p>')

# credit: founder line at the foot of the rail and on the About page
MADE_BY = 'Founded and made by <a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">Tyler Howell</a>'
INSPIRED = 'Inspired by <a href="https://x.com/lukeigel" target="_blank" rel="noopener">Luke Igel (@lukeigel)</a> and <a href="https://x.com/rtwlz" target="_blank" rel="noopener">Riley Walz (@rtwlz)</a>’s creation of <a href="https://jmail.world/" target="_blank" rel="noopener">Jmail</a>'
src = patch(src, '<span class="t">Browse all people →</span></a></li></ul>`;', '<span class="t">Browse all people →</span></a></li></ul><p class="made-by">' + MADE_BY + '</p><p class="made-by inspired">' + INSPIRED + '.</p>`;')
src = patch(src, '<h2>About Satoshi Mail<span class="beta-pill static">Beta</span></h2>', '<h2>About Satoshi Mail<span class="beta-pill static">Beta</span></h2>\n    <p class="lead made-by-lead">' + MADE_BY + ' (<a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">@TylerHowell88</a>). Satoshi Mail is open source under the MIT license: <a href="https://github.com/itstylerhowell/satoshiMail" target="_blank" rel="noopener">source code on GitHub</a>.</p>\n    <p class="lead made-by-lead">' + INSPIRED + '.</p>')

# compose is just for fun: no emails or drafts are ever created
src = patch(src, 'function openCompose(draft) {\n', 'function openCompose(draft) {\n  return composeJoke(draft);   // read-only archive: show a joke instead of a compose window\n')
src = patch(src, '  "open-draft"(el) { const d = ST.drafts.find(x => x.id === el.dataset.id); if (d) openCompose(d); },', '  "open-draft"() { composeJoke(); },')
src = patch(src, '    item("#drafts", "draft", "Drafts", ST.drafts.length || "", r.view === "drafts", ST.drafts.length ? " unread" : ""),\n', '')
src = patch(src, 'a: "#all", d: "#drafts" }[k];', 'a: "#all" }[k];')
src = patch(src, '<td><kbd>c</kbd></td><td>Compose</td>', '<td><kbd>c</kbd></td><td>Compose (try it)</td>')
src = patch(src, '<kbd>a</kbd> <kbd>d</kbd></td><td>Inbox, Starred, Sent, Commits, All Mail, Drafts</td>', '<kbd>a</kbd> <kbd>w</kbd></td><td>Inbox, Starred, Sent, Commits, All Mail, Satoshipedia</td>')
src = patch(src, 'Stars, read state, archive, trash, drafts and settings are stored only in this browser. Nothing is sent anywhere.', 'Stars, read state, archive, trash and settings are stored only in this browser. Compose is just for fun: no emails or drafts are ever written, sent or saved. On satoshimail.vercel.app, visits are counted with Vercel Web Analytics, which uses no cookies and doesn\'t record what you search for.')

# no trash: remove every delete button, the Trash folder and the # shortcut; restore anything trashed before
src = patch(src, '  for (const k of ["star", "read", "arch", "trash"]) s[k] = s[k] && typeof s[k] === "object" ? s[k] : {};\n',
            '  for (const k of ["star", "read", "arch", "trash"]) s[k] = s[k] && typeof s[k] === "object" ? s[k] : {};\n  s.trash = {};   // Trash was removed: nothing stays hidden in it\n')
src = patch(src, '    item("#trash", "delete", "Trash", "", r.folder === "trash"),\n', '')
src = patch(src, 'b("archive", "archive", "Archive") + b("trash", "delete", "Delete")) +', 'b("archive", "archive", "Archive")) +')
src = patch(src, '      <button class="ib sm" data-act="trash" data-id="${t.id}" title="Delete" aria-label="Delete">${ic("delete")}</button>\n', '')
src = patch(src, ': b("archive", "archive", "Archive")) + b("trash", "delete", "Delete")}', ': b("archive", "archive", "Archive"))}')
src = patch(src, '    case "#": if (curId && !isCommitId(curId)) { H(); bulk([curId], id => { ST.trash[id] = 1; }, "{n} moved to Trash."); } break;\n', '')
src = patch(src, '<tr><td><kbd>e</kbd> <kbd>#</kbd></td><td>Archive / delete</td></tr>', '<tr><td><kbd>e</kbd></td><td>Archive</td></tr>')
src = patch(src, '<kbd>in:commits</kbd> <kbd>in:trash</kbd> <kbd>is:starred</kbd>', '<kbd>in:commits</kbd> <kbd>is:starred</kbd>')
src = patch(src, 'h.match(/^(starred|all|trash)(?:-p(\\d+))?$/)', 'h.match(/^(starred|all)(?:-p(\\d+))?$/)')
src = patch(src, 'Stars, read state, archive, trash and settings are stored only in this browser.', 'Stars, read state, archive and settings are stored only in this browser.')
src = patch(src, 'Reset stars, read state and trash</button>', 'Reset stars and read state</button>')

# Blocktrainer's archive: cross-checked source, mentioned on the About page
src = patch(src, '<p class="lead">One 2014 P2P Foundation post carries', '<p class="lead">Every message here was cross-checked on 20 October 2026 against <a href="https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive" target="_blank" rel="noopener">Blocktrainer\'s Satoshi Nakamoto archive</a> (4,236 entries, with German translations): all of its entries are also here. Where it gives a different date, that is noted on the <a href="#sources">Sources</a> page.</p>\n    <p class="lead">One 2014 P2P Foundation post carries')
src = patch(src, '. An independent reader, not affiliated with any email provider.', '; nakamoto-archive; Nicholas Bohm\'s emails (COPA v Wright exhibit NB1); the forum\'s saved staff topics; Bitcoin Core; bitcoin.org; cross-checked with Blocktrainer and satoshin.name. An independent reader, not affiliated with any email provider.')

# satoshin.name ("Satoshi Nakamoto Archive"): which message is which page there, a details row per message, About text
xref = json.load(open(tools / "satoshin_xref.json"))
xjson = json.dumps({"site": xref["site"], "checked": xref["checked"], "msgs": xref["msgs"]}, separators=(",", ":"))
src = patch(src, '<script id="data" type="application/json">', f'<script id="satoshin-data" type="application/json">{xjson}</script>\n<script id="data" type="application/json">')
src = patch(src, '<p class="lead">One 2014 P2P Foundation post carries', '<p class="lead">It was also checked against <a href="https://satoshin.name/" target="_blank" rel="noopener">satoshin.name</a>, the Satoshi Nakamoto Archive (567 of Satoshi\'s BitcoinTalk posts and mailing-list emails): every one is here too. All sources are listed under Settings → Archive → <a href="#sources">Sources</a>.</p>\n    <p class="lead">One 2014 P2P Foundation post carries')

# AI Overview card above search results (tools/ask.js)
src = patch(src, '    head = `<div class="chips">${chip("from:me"', '    head = askCardHtml(r.search, r.page) + `<div class="chips">${chip("from:me"')
src = patch(src, '${empty}</div>`;\n  markCursor();\n}', '${empty}</div>`;\n  markCursor();\n  if (model.kind === "search") askMount(r.search);\n}')

# Sources page: Settings → Archive → Sources (#sources)
src = patch(src, '<h4>Archive</h4><a class="mi" href="#about">${ic("info")} About this archive</a>', '<h4>Archive</h4><a class="mi" href="#about">${ic("info")} About this archive</a><a class="mi" href="#sources">${ic("source")} Sources</a>')
src = patch(src, '  if (h === "about") return { view: "about" };', '  if (h === "about") return { view: "about" };\n  if (h === "sources") return { view: "sources" };')
src = patch(src, 'about: renderAbout }[ROUTE.view]', 'about: renderAbout, sources: renderSources }[ROUTE.view]')

# Send feedback: Settings → Help, the About page (tools/feedback.js)
src = patch(src, '<button class="mi" data-act="resetstate">${ic("restart_alt")} Reset stars and read state</button>`);', '<button class="mi" data-act="resetstate">${ic("restart_alt")} Reset stars and read state</button>\n      <h4>Help</h4><button class="mi" data-act="feedback">${ic("feedback")} Send feedback</button><button class="mi" data-act="help">${ic("keyboard")} Keyboard shortcuts</button>`);')
src = patch(src, '<p class="lead"><b>Satoshi Mail is in beta.</b> It is still in development, so features may change, move or not work yet. <button class="linkbtn" data-act="beta">What this means</button></p>', '<p class="lead"><b>Satoshi Mail is in beta.</b> It is still in development, so features may change, move or not work yet. <button class="linkbtn" data-act="beta">What this means</button> · <button class="linkbtn" data-act="feedback">Send feedback</button></p>')

# no density setting: everyone gets the standard 48px rows (a saved choice from before is ignored)
src = patch(src, '    popover(el, `<h4>Density</h4>${r("density", "default", "Default")}${r("density", "comfortable", "Comfortable")}${r("density", "compact", "Compact")}\n      <h4>Theme</h4>', '    popover(el, `<h4>Theme</h4>')
src = patch(src, '  s.density = ["comfortable", "compact"].includes(s.density) ? s.density : "default";', '  s.density = "default";')

# ── SEO / performance pass ──
import re as _re
DESC = "Every email, forum post and commit by Satoshi Nakamoto in a Gmail-style archive, with Satoshipedia and a map of his connections and timeline, 2008–2011."
META = f"""<meta name="description" content="{DESC}">
<meta name="theme-color" content="#f7931a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Satoshi Mail">
<meta property="og:title" content="Satoshi Mail: Satoshi Nakamoto's emails, posts and commits">
<meta property="og:description" content="{DESC}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Satoshi Mail: Satoshi Nakamoto's emails, posts and commits">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:creator" content="@TylerHowell88">"""
src = patch(src, '<meta name="claude:viewport-fit-sides" content="cover">', '<meta name="claude:viewport-fit-sides" content="cover">\n' + META)
# Google Sans Flex for UI labels (Jmail look)
src = patch(src, roboto, roboto + '\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;700&display=swap">')
# fonts no longer block the first paint (the icon font keeps display=block, so icons never flash as words)
def _nonblocking(m):
    href = m.group(1)
    return f'<link rel="preload" as="style" href="{href}" onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link rel="stylesheet" href="{href}"></noscript>'
src, nfonts = _re.subn(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">', _nonblocking, src)
assert nfonts == 4, nfonts
# icons: the glyph name moves to data-i and is drawn by CSS, so it isn't page text
src = patch(src, 'const ic = (n, cls = "") => `<span class="ms ${cls}" aria-hidden="true">${n}</span>`;', 'const ic = (n, cls = "") => `<span class="ms ${cls}" aria-hidden="true" data-i="${n}"></span>`;')
def _icon(m):
    attrs, name = m.group(1) or "", m.group(2)
    if "aria-hidden" not in attrs: attrs += ' aria-hidden="true"'
    return f'<span class="ms"{attrs} data-i="{name}"></span>'
src, nicons = _re.subn(r'<span class="ms"((?: [a-z-]+="[^"]*")*)>([a-z0-9_]+)</span>', _icon, src)
assert nicons >= 15, nicons
src = patch(src, '<span class="ms fill" style="color:${L.color}" aria-hidden="true">${L.priv ? "lock" : "label"}</span>', '<span class="ms fill" style="color:${L.color}" aria-hidden="true" data-i="${L.priv ? "lock" : "label"}"></span>')
# a page heading for list views (conversations, Satoshipedia and Satoshi Map have their own h1)
src = patch(src, '<div class="app" id="app">', '<div class="app" id="app">\n  <h1 class="sr-only" id="apph1">Satoshi Mail</h1>')

# Satoshi appears by name in the message list ("Satoshi, Hal 3") rather than as "me"; from:me still works in search
src = patch(src, 'if (isSatName(name)) return "me";', 'if (isSatName(name)) return "Satoshi";')
src = patch(src, 'chip("from:me", "From me", "person")', 'chip("from:me", "From Satoshi", "person")')
src = patch(src, 'placeholder="me, hal, gavin"', 'placeholder="satoshi, hal, gavin"')
src = patch(src, '<span class="who">me <span class="n">→ ${where}</span></span>', '<span class="who">Satoshi <span class="n">→ ${where}</span></span>')

# Commit diffs on demand. The website (build_site.py) ships the archive without the diff text (each file's
# f[3] is null) and names a separate file in window.SM_DIFFS; it's fetched the first time a commit is opened
# or a search runs. The single-file app has the diffs inline, so none of this applies to it.
src = patch(src, 'const COMMITS = (RAW.commits || []).map((c, idx) => Object.assign(c, { idx, kind: "commit" }));',
  """const COMMITS = (RAW.commits || []).map((c, idx) => Object.assign(c, { idx, kind: "commit" }));
let DIFFS_P = null;
const diffsMissing = () => !!window.SM_DIFFS && COMMITS.some(c => c.f.some(f => f[3] === null));
function loadDiffs() {
  if (!DIFFS_P) DIFFS_P = fetch(window.SM_DIFFS).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(all => {
    all.forEach((files, i) => files.forEach((t, j) => { if (COMMITS[i] && COMMITS[i].f[j]) COMMITS[i].f[j][3] = t; }));
    CINDEX = null;
  }).catch(e => { DIFFS_P = null; throw e; });
  return DIFFS_P;
}
function whenDiffs(then) {
  const at = location.hash;
  loadDiffs().then(() => { if (location.hash === at) then(); }, () => {});
}""")
src = patch(src, """function renderCommit() {
  const c = BY_COMMIT.get(ROUTE.id);
  if (!c) { $("#main").innerHTML = emptyState("error", "This commit isn't in the archive", `<a href="#commits">Back to Commits</a>`); return; }""",
  """function renderCommit() {
  const c = BY_COMMIT.get(ROUTE.id);
  if (!c) { $("#main").innerHTML = emptyState("error", "This commit isn't in the archive", `<a href="#commits">Back to Commits</a>`); return; }
  if (c.f.some(f => f[3] === null) && window.SM_DIFFS) {
    $("#main").innerHTML = `<div class="scroll"><div class="page"><p class="lead muted">Loading the changes…</p></div></div>`;
    whenDiffs(renderCommit);
    return;
  }""")
src = patch(src, """    if (!CINDEX) CINDEX = COMMITS.map(c => (c.s + "\\n" + c.f.map(f => f[0] + "\\n" + f[3]).join("\\n")).toLowerCase());""",
  """    if (diffsMissing()) whenDiffs(() => render(true));   // search the code too once the diffs arrive
    let tmpIx = null;
    if (!CINDEX) { const ix = COMMITS.map(c => (c.s + "\\n" + c.f.map(f => f[0] + "\\n" + (f[3] || "")).join("\\n")).toLowerCase()); if (diffsMissing()) tmpIx = ix; else CINDEX = ix; }""")
src = patch(src, "      const tx = CINDEX[c.idx];", "      const tx = (CINDEX || tmpIx)[c.idx];")

# Accessibility and crawlability fixes from a Lighthouse audit:
# - the list pager's disabled arrows were <a> with no href and aria-disabled; now plain, inert <span>s
for _side, _icon in (("Newer", "chevron_left"), ("Older", "chevron_right")):
    _cond = "p > 1" if _side == "Newer" else "p < pages"
    _hrefv = "href(p - 1)" if _side == "Newer" else "href(p + 1)"
    src = patch(src, '<a class="ib sm${' + _cond + ' ? "" : " off"}" ${' + _cond + ' ? `href="${' + _hrefv + '}"` : \'aria-disabled="true"\'} aria-label="' + _side + '" title="' + _side + '">${ic("' + _icon + '")}</a>',
                '${' + _cond + ' ? `<a class="ib sm" href="${' + _hrefv + '}" aria-label="' + _side + '" title="' + _side + '">${ic("' + _icon + '")}</a>` : `<span class="ib sm off" title="' + _side + '">${ic("' + _icon + '")}</span>`}')
# - the sidebar's section titles were <h3> with no <h2> above them
for _h in ("Topics", "Labels", "People"):
    src = patch(src, "<h3>" + _h + "</h3>", "<h2>" + _h + "</h2>")
src = patch(src, "`<h3>Private email</h3>", "`<h2>Private email</h2>")
src = src.replace(".rail h3", ".rail :is(h2, h3)")

# - label chips: text mixed 25% toward the page's ink colour (darker in light mode, lighter in dark) for 4.5:1
src = patch(src, '<a class="lchip" href="#label-${slug}" style="color:${L.color};background:color-mix(in srgb, ${L.color} 15%, transparent)">',
            '<a class="lchip" href="#label-${slug}" style="color:color-mix(in srgb, ${L.color} 75%, var(--ink));background:color-mix(in srgb, ${L.color} 15%, transparent)">')

# Update log (#updates): Settings → Archive, the sidebar under the credits, and About
src = patch(src, '<a class="mi" href="#sources">${ic("source")} Sources</a>', '<a class="mi" href="#sources">${ic("source")} Sources</a><a class="mi" href="#updates">${ic("history")} Update log</a>')
src = patch(src, '  if (h === "sources") return { view: "sources" };', '  if (h === "sources") return { view: "sources" };\n  if (h === "updates") return { view: "updates" };')
src = patch(src, 'sources: renderSources }[ROUTE.view]', 'sources: renderSources, updates: renderUpdates }[ROUTE.view]')
src = patch(src, '<p class="made-by inspired">' + INSPIRED + '.</p>`;', '<p class="made-by inspired">' + INSPIRED + '.</p><p class="made-by upd-link"><a href="#updates">Update log</a> · last updated ${esc(UPDATES.length ? updDate(UPDATES[0].date) : "")}</p>`;')
src = patch(src, '<p class="lead made-by-lead">' + INSPIRED + '.</p>', '<p class="lead made-by-lead">' + INSPIRED + '.</p>\n    <p class="lead">What’s new: see the <a href="#updates">Update log</a>.</p>')

# Ask Google Fonts for only the Material Symbols the app can show, instead of the whole font: every string in
# the page or its data that is an icon name (material_symbols_names.txt, from google/material-design-icons).
import re as _re
_names = set((tools / "material_symbols_names.txt").read_text().split())
_text = src + json.dumps(json.load(open(DATA)), ensure_ascii=False)
_icons = sorted(w for w in set(_re.findall(r'["\'`>:]([a-z][a-z0-9_]{1,})(?=["\'`<])', _text)) if w in _names)
_ms = "family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400,0..1,0&display=block"
assert src.count(_ms) == 2, src.count(_ms)
src = src.replace(_ms, _ms.replace("&display=block", "&icon_names=" + ",".join(_icons) + "&display=block"))
print(len(_icons), "icons requested from Google Fonts")

TEMPLATE_OUT.write_text(src)
data = json.load(open(DATA))
djson = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
assert src.count("/*__DATA__*/") == 1
PAGE_OUT.write_text(src.replace("/*__DATA__*/", djson))
print("ok", len(src), "template bytes;", PAGE_OUT.stat().st_size, "page bytes")
