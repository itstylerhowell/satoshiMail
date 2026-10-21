
/* ═════════════ Satoshipedia (the Satoshi Mail encyclopedia) ═════════════ */
const MADE_BY = `Founded and made by <a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">Tyler Howell</a>`;
const INSPIRED = `Inspired by <a href="https://x.com/lukeigel" target="_blank" rel="noopener">Luke Igel (@lukeigel)</a> and <a href="https://x.com/rtwlz" target="_blank" rel="noopener">Riley Walz (@rtwlz)</a>’s creation of <a href="https://jmail.world/" target="_blank" rel="noopener">Jmail</a>`;
const WIKI = JSON.parse(document.getElementById("wiki-data").textContent);
const WA = WIKI.articles;
const WBY = new Map(WA.map(a => [a.slug, a]));
const catSlug = c => c.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const WCATS = new Map();
WA.forEach(a => a.cats.forEach(c => { if (!WCATS.has(c)) WCATS.set(c, []); WCATS.get(c).push(a); }));
const htmlText = h => { const d = document.createElement("div"); d.innerHTML = h; d.querySelectorAll("sup.ref").forEach(x => x.remove()); return d.textContent.replace(/\s+/g, " ").trim(); };
WA.forEach(a => {
  a._lead = htmlText(a.lead);
  a._text = (a.title + " " + a.aliases.join(" ") + " " + a.short + " " + a._lead + " " + a.sections.map(s => htmlText(s.h + " " + s.html)).join(" ")).toLowerCase();
});
// sender name (lower case) → article slug, for linking people in the archive to their articles
const ALIAS = new Map();
WA.forEach(a => { if (a.slug !== "satoshi-nakamoto") a.aliases.forEach(x => ALIAS.set(x.toLowerCase(), a.slug)); });
// a {{mail:…}} link's conversation; when several share a title, its date= picks the one with that day
function findLinkedThread(src, title, date) {
  const ts = THREADS.filter(t => t.s === src && t.t === title);
  return (date && ts.find(t => t.m.some(m => new Date(m.d * 1000).toISOString().slice(0, 10) === date))) || ts[0];
}
// thread → articles that cite it
const CITED = new Map();
WA.forEach(a => {
  const re = /data-src="([^"]*)" data-title="([^"]*)"(?: data-from="[^"]*")?(?: data-date="([^"]*)")?/g; let m;
  const all = a.lead + a.sections.map(s => s.html).join("");
  while ((m = re.exec(all))) {
    const t = findLinkedThread(htmlText(m[1]), htmlText(m[2]), m[3]);
    if (t) { if (!CITED.has(t.id)) CITED.set(t.id, new Set()); CITED.get(t.id).add(a.slug); }
  }
});
const dayNum = () => Math.floor(Date.now() / 864e5);
const BTC_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#f7931a"/><g transform="translate(0 3) rotate(14 20 17)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17.2 12.2v9.6M17.2 12.2h3.1a2.35 2.35 0 0 1 0 4.7h-3.1M17.2 16.9h3.6a2.45 2.45 0 0 1 0 4.9h-3.6"/><path d="M18.5 10.7v1.5M20.4 10.7v1.5M18.5 21.8v1.5M20.4 21.8v1.5"/></g></svg>`;
const WK_MARK = () => $(".wk-brand svg").outerHTML;
function initials(t) { const w = t.replace(/[^A-Za-z ]/g, " ").trim().split(/\s+/); return ((w[0] || "?")[0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase(); }
function wkImg(a, size = "") {
  const cls = `wk-img ${size}`;
  if (a.img === "btc") return `<span class="${cls} btc">${BTC_SVG}</span>`;
  if (a.img.startsWith("icon:")) return `<span class="${cls} icon">${ic(a.img.slice(5))}</span>`;
  return `<span class="${cls}" style="background:${avColor(a.aliases[0] || a.title)}" aria-hidden="true">${esc(initials(a.title))}</span>`;
}
const wl = (slug, text) => { const a = WBY.get(slug); return a ? `<a class="wl" href="#wiki-${slug}" data-slug="${slug}">${esc(text || a.title)}</a>` : esc(text || slug); };
const isApprox = m => m.dp === "source-file" || m.dp === "inferred";
const ymdUTC = sec => dt(sec).toISOString().slice(0, 10);
const longDay = sec => { const d = dt(sec); return `${d.getUTCDate()} ${["January","February","March","April","May","June","July","August","September","October","November","December"][d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const srcName = t => (LISTS[t.s] && LISTS[t.s].name) || t.s;
const msgLink = (t, i, text) => `<a class="ml" href="#t-${t.id}"${i >= 0 ? ` data-mi="${i}"` : ""}>${esc(text)}</a>`;

/* ── archive statistics for a person ── */
function personStats(a) {
  if (!a.aliases.length || a.slug === "satoshi-nakamoto") return null;
  const al = new Set(a.aliases.map(x => x.toLowerCase()));
  const per = new Map(); let n = 0, first = Infinity, last = -Infinity;
  for (const t of THREADS) {
    let k = 0;
    t.m.forEach(m => { if (al.has(m.f.toLowerCase())) { k++; n++; first = Math.min(first, m.d); last = Math.max(last, m.d); } });
    if (k) per.set(t, k);
  }
  if (!n) return null;
  const withSat = [...per.keys()].filter(t => t.m.some(m => m.s));
  const satMsgs = withSat.reduce((s, t) => s + t.m.filter(m => m.s).length, 0);
  const top = [...per.entries()].sort((x, y) => y[1] - x[1] || x[0].first - y[0].first).slice(0, 6);
  const searchQ = a.aliases.find(x => !x.includes("@")) || a.aliases[0];
  return { n, threads: per.size, withSat: withSat.length, satMsgs, first, last, top, searchQ };
}

/* ── live widgets ── */
function satText(m) { return m.b.filter(s => s[0] === "t").map(s => s[1]).join("\n"); }
const LIVE = {
  "by-year"(el) {
    const years = new Map();
    const bump = (y, k) => { if (!years.has(y)) years.set(y, { e: 0, p: 0, x: 0, c: 0 }); years.get(y)[k]++; };
    SENT.forEach(({ t, m }) => bump(dt(m.d).getUTCFullYear(), t.k));
    COMMITS.forEach(c => bump(dt(c.d).getUTCFullYear(), "c"));
    const ys = [...years.keys()].sort();
    const max = Math.max(...ys.map(y => { const v = years.get(y); return v.e + v.p + v.x + v.c; }));
    const seg = (v, k) => v[k] ? `<i class="c-${k}" style="width:${(100 * v[k] / max).toFixed(2)}%" title="${v[k]}"></i>` : "";
    el.innerHTML = `<div class="w-bars">${ys.map(y => { const v = years.get(y), tot = v.e + v.p + v.x + v.c;
      return `<span>${y}</span><span class="bar" role="img" aria-label="${y}: ${v.e} list emails, ${v.p} forum posts, ${v.x} private emails, ${v.c} commits">${seg(v, "e")}${seg(v, "p")}${seg(v, "x")}${seg(v, "c")}</span><span class="num">${fmtNum(tot)}</span>`; }).join("")}</div>
      <div class="w-legend"><span><i class="c-e"></i>Mailing lists</span><span><i class="c-p"></i>Forum posts</span><span><i class="c-x"></i>Private email</span><span><i class="c-c"></i>Commits</span></div>
      <p class="note">${fmtNum(SENT.length)} messages and ${fmtNum(COMMITS.length)} commits in this archive, counted live. <a class="xl" href="#activity">Daily Activity</a> shows them day by day.</p>`;
  },
  "posting-hours"(el) {
    const h = new Array(24).fill(0); let n = 0;
    SENT.forEach(({ m }) => { if (!m.dp || m.dp === "exact") { h[dt(m.d).getUTCHours()]++; n++; } });
    const max = Math.max(...h), W = 520, H = 180, L = 34, B = 26, T = 10, bw = (W - L - 6) / 24;
    const y = v => T + (H - T - B) * (1 - v / max);
    const ticks = [0, Math.round(max / 2), max];
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Satoshi's messages by hour of day, UTC">`;
    s += `<rect x="${L + 7 * bw}" y="${T}" width="${6 * bw}" height="${H - T - B}" fill="var(--hover)"/>`;
    s += `<text x="${L + 10 * bw}" y="${T + 14}" text-anchor="middle" font-size="11" fill="var(--ink-3)">07–13 UTC</text>`;
    ticks.forEach(v => { s += `<line x1="${L}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${v}</text>`; });
    h.forEach((v, i) => { s += `<rect x="${(L + i * bw + 2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${(H - B - y(v)).toFixed(1)}" rx="2" fill="${i >= 7 && i < 13 ? "var(--satoshi)" : "var(--accent)"}"><title>${String(i).padStart(2, "0")}:00 UTC: ${v} messages</title></rect>`; });
    for (let i = 0; i < 24; i += 3) s += `<text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--ink-3)">${String(i).padStart(2, "0")}</text>`;
    s += `</svg>`;
    const gap = h.slice(7, 13).reduce((a, b) => a + b, 0);
    el.innerHTML = `<div class="w-chart">${s}</div><p class="note">${fmtNum(n)} messages with an exact time, by hour (UTC). Only ${gap} were sent between 07:00 and 13:00.</p>`;
  },
  spellings(el) {
    const text = SENT.map(({ m }) => satText(m)).join("\n").toLowerCase();
    const count = w => (text.match(new RegExp("\\b" + w, "g")) || []).length;
    const rows = [["colour", "color"], ["favour", "favor"], ["grey\\b", "gray\\b"], ["optimis", "optimiz"], ["realis", "realiz"], ["maths\\b", "math\\b"]];
    const lbl = w => w.replace(/\\b/g, "").replace(/(is|iz)$/, "$1e");
    el.innerHTML = `<div class="w-table"><table class="wk-tbl"><thead><tr><th>British form</th><th>Uses</th><th>American form</th><th>Uses</th></tr></thead><tbody>${rows.map(([b, a]) => `<tr><td>${esc(lbl(b))}…</td><td class="num">${count(b)}</td><td>${esc(lbl(a))}…</td><td class="num">${count(a)}</td></tr>`).join("")}</tbody></table></div>
      <p class="note">Counted in Satoshi's own words (quoted text excluded) across ${fmtNum(SENT.length)} messages. “bloody” appears ${count("bloody\\b")} time${count("bloody\\b") === 1 ? "" : "s"}.</p>`;
  },
  "double-space"(el) {
    const raw = SENT.map(({ m }) => satText(m)).join("\n");
    const two = (raw.match(/[.?!]  [A-Z]/g) || []).length, one = (raw.match(/[.?!] [A-Z]/g) || []).length;
    const pct = Math.round(100 * two / (two + one));
    el.innerHTML = `<div class="w-bars"><span>Two</span><span class="bar"><i class="c-p" style="width:${pct}%"></i></span><span class="num">${fmtNum(two)}</span><span>One</span><span class="bar"><i class="c-e" style="width:${100 - pct}%"></i></span><span class="num">${fmtNum(one)}</span></div>
      <p class="note">Spaces after a sentence-ending full stop, question or exclamation mark in Satoshi's messages: ${pct}% are followed by two.</p>`;
  },
  addresses(el) {
    const by = new Map();
    SENT.forEach(({ t, m }) => { if (t.k !== "x" || !m.fe) return; const k = m.fe; if (!by.has(k)) by.set(k, { n: 0, with: new Set(), first: m.d, last: m.d }); const v = by.get(k); v.n++; v.with.add(srcName(t)); v.first = Math.min(v.first, m.d); v.last = Math.max(v.last, m.d); });
    const rows = [...by.entries()].sort((a, b) => a[1].first - b[1].first);
    el.innerHTML = `<div class="w-table"><table class="wk-tbl"><thead><tr><th>Address</th><th>Emails</th><th>Used with</th><th>Dates</th></tr></thead><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v.n}</td><td>${esc([...v.with].join(", "))}</td><td>${esc(shortDate(v.first))}${v.last - v.first > 86400 ? " – " + esc(shortDate(v.last)) : ""}</td></tr>`).join("")}</tbody></table></div>`;
  },
  timeline(el) {
    const ev = [];
    const lastOf = (pred, label) => {
      const pick = ok => SENT.reduce((b, x) => (pred(x) && !x.m.w && ok(x.m) && (!b || x.m.d > b.m.d) ? x : b), null);
      const best = pick(m => !isApprox(m)) || pick(() => true);
      if (best) ev.push({ d: best.m.d, html: `${label}: ${msgLink(best.t, best.i, best.t.t)}${isApprox(best.m) ? " (date approximate)" : ""}` });
    };
    lastOf(x => x.t.k === "e", "Last mailing-list email");
    lastOf(x => x.t.s === "bitcointalk", "Last forum post");
    const lc = COMMITS.reduce((a, c) => (!a || c.d > a.d ? c : a), null);
    if (lc) ev.push({ d: lc.d, html: `Last commit: <a class="cl" href="#t-${lc.id}">${esc(lc.s)}</a>${lc.r ? ` (r${lc.r})` : ""}` });
    for (const [slug, L] of Object.entries(LISTS)) {
      if (!L.priv || slug === "single-emails") continue;
      lastOf(x => x.t.s === slug, `Last email to ${esc(L.name)}`);
    }
    SENT.forEach(x => { if (x.t.s === "single-emails") ev.push({ d: x.m.d, html: `${msgLink(x.t, x.i, x.t.t)}${isApprox(x.m) ? " (date approximate)" : ""}` }); });
    SENT.forEach(x => { if (x.m.w) ev.push({ d: x.m.d, html: `Unverified post on his P2P Foundation account: ${msgLink(x.t, x.i, "“I am not Dorian Nakamoto”")}` }); });
    ev.sort((a, b) => a.d - b.d);
    el.innerHTML = `<ol class="w-tl">${ev.map(e => `<li><time>${esc(longDay(e.d))}</time>${e.html}</li>`).join("")}</ol>`;
  },
  quote(el) {
    const c = RAW.clips[Math.floor(Math.random() * RAW.clips.length)];
    if (!c) return;
    const m = (c.u || "").match(/\/(emails|posts)\/([^/]+)\/(\d+)\/?$/);
    let link = "";
    if (m) {
      const k = m[1] === "emails" ? "e" : "p", n = +m[3];
      for (const t of THREADS) { if (t.k !== k) continue; const i = t.m.findIndex(x => x.n === n && x.s); if (i >= 0) { link = msgLink(t, i, c.st || t.t); break; } }
    }
    el.innerHTML = `<blockquote class="w-quote">“${esc(c.t)}”<cite>Satoshi Nakamoto${c.d ? ", " + esc(longDay(Date.parse(c.d) / 1000)) : ""}${link ? " · " + link : ""}</cite></blockquote><p class="note"><button class="linkbtn" type="button" data-wk="another-quote">Show another</button></p>`;
  },
};

/* ── link resolution inside rendered articles ── */
function resolveLinks(root) {
  root.querySelectorAll("a.ml[data-src]").forEach(el => {
    const t = findLinkedThread(el.dataset.src, el.dataset.title, el.dataset.date);
    if (!t) { el.href = "#search-" + encodeURIComponent(el.dataset.title); return; }
    let i = -1;
    if (el.dataset.from || el.dataset.date) {
      const re = el.dataset.from ? new RegExp(el.dataset.from, "i") : null;
      i = t.m.findIndex(m => (!re || re.test(m.f)) && (!el.dataset.date || ymdUTC(m.d) === el.dataset.date));
    }
    el.href = "#t-" + t.id;
    if (i >= 0) el.dataset.mi = i;
    el.title = `Open in Satoshi Mail: ${srcName(t)} · ${t.t}`;
  });
  root.querySelectorAll("a.cl[data-sha]").forEach(el => {
    const c = COMMITS.find(c => c.sha.startsWith(el.dataset.sha));
    if (c) { el.href = "#t-" + c.id; el.title = `Open commit ${c.sha.slice(0, 7)}${c.r ? " (r" + c.r + ")" : ""} in Satoshi Mail`; }
  });
  root.querySelectorAll(".w-live[data-live]").forEach(el => { const f = LIVE[el.dataset.live]; if (f) f(el); });
}

/* ── pages ── */
function wkNav(route) {
  const on = h => route === h ? " on" : "";
  const li = (href, icon, label, extra = "") => `<li><a class="${on(href)}" href="${href}">${ic(icon)}<span>${esc(label)}</span>${extra}</a></li>`;
  const cats = [...WCATS.keys()].sort().map(c => `<li><a class="${on("#wiki~cat~" + catSlug(c))}" href="#wiki~cat~${catSlug(c)}"><span>${esc(c)}</span><span class="n">${WCATS.get(c).length}</span></a></li>`).join("");
  $("#wknav").innerHTML = `
    <h4>Navigation</h4><ul>${li("#wiki", "home", "Main page")}${li("#wiki~all", "list", "All articles")}${li("#wiki~cats", "category", "Browse by category")}${li("#wiki~random", "shuffle", "Random article")}</ul>
    <h4>Satoshi Mail</h4><ul>${li("#inbox", "inbox", "Inbox")}${li("#sent", "send", "Sent")}${li("#commits", "commit", "Commits")}${li("#inbox-private", "lock", "Private email")}${li("#activity", "calendar_month", "Daily Activity")}${li("#people", "group", "People")}</ul>
    <h4>Categories</h4><ul>${cats}</ul>
    <h4>Tools</h4><ul>${li("#wiki~about", "info", "About Satoshipedia")}</ul>`;
}
function wkFoot() {
  $("#wkfoot").innerHTML = `<div>
    <nav><a href="#wiki">Satoshipedia</a><a href="#wiki~about">About</a><a href="#wiki~all">All articles</a><a href="#inbox">Satoshi Mail inbox</a><a href="https://en.wikipedia.org/wiki/Satoshi_Nakamoto" target="_blank" rel="noopener">Wikipedia: Satoshi Nakamoto</a><button class="linkbtn" data-act="feedback">Send feedback</button></nav>
    <div class="made-by-foot">${MADE_BY} · <a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">@TylerHowell88</a> · <a href="https://github.com/itstylerhowell/satoshiMail" target="_blank" rel="noopener">Open source (MIT) on GitHub</a></div>
    <div class="made-by-foot">${INSPIRED}.</div>
    <div><b>Beta:</b> Satoshi Mail and Satoshipedia are still in development. Satoshipedia is the encyclopedia of Satoshi Mail. Its ${WA.length} articles were written with AI assistance using only the Satoshi Nakamoto Institute, GitHub (nakamoto-archive and the Bitcoin Core repository), bitcoin.org, Blocktrainer's archive, satoshin.name and Wikipedia (CC BY-SA 4.0), and link to their sources; check them before relying on a claim. Quotations are from the archive. Updated ${esc(WIKI.updated)}.</div>
  </div>`;
}
function featuredToday() { const f = WA.filter(a => a.featured); return f[dayNum() % f.length]; }
function seededPick(arr, n, seed) {
  const a = arr.slice(); let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
function onThisDay() {
  const now = new Date();
  for (let k = 0; k < 366; k++) {
    const d = new Date(Date.UTC(2000, now.getUTCMonth(), now.getUTCDate() + k));
    const md = d.toISOString().slice(5, 10);
    const hits = SENT.filter(x => !isApprox(x.m) && x.m.dp !== "day" && ymdUTC(x.m.d).slice(5) === md);
    const cm = COMMITS.filter(c => ymdUTC(c.d).slice(5) === md);
    if (hits.length || cm.length) return { k, d, hits, cm };
  }
  return null;
}
function renderWikiMain() {
  const f = featuredToday();
  const nMsgs = SENT.length;
  // correspondents ranked by messages, merging aliases of people with articles
  const tally = new Map();
  THREADS.forEach(t => t.m.forEach(m => {
    if (m.s || /^(anonymous|\(unknown\))$/i.test(m.f)) return;
    const key = ALIAS.get(m.f.toLowerCase()) || "@" + m.f;
    if (!tally.has(key)) tally.set(key, { n: 0, th: new Set() });
    const v = tally.get(key); v.n++; v.th.add(t.id);
  }));
  const top = [...tally.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10);
  const rank = top.map(([k, v], i) => {
    const name = k.startsWith("@") ? `<a class="xl" href="#search-${encodeURIComponent(`from:"${k.slice(1).toLowerCase()}"`)}">${esc(k.slice(1))}</a> <small>forum</small>` : wl(k);
    return `<tr><td class="n">${i + 1}</td><td>${name}</td><td class="num">${fmtNum(v.n)} <small>messages</small></td></tr>`;
  }).join("");
  const otd = onThisDay();
  let otdHtml = `<p class="wk-empty">No dated messages.</p>`;
  if (otd) {
    const head = otd.k === 0 ? "Today" : `Next, on ${otd.d.getUTCDate()} ${MON[otd.d.getUTCMonth()]}`;
    const items = otd.hits.slice().sort((a, b) => a.m.d - b.m.d).slice(0, 6).map(x => `<li><small>${dt(x.m.d).getUTCFullYear()}</small>${msgLink(x.t, x.i, x.m.sj || x.t.t)} <small>${esc(srcName(x.t))}</small></li>`);
    otd.cm.slice(0, 3).forEach(c => items.push(`<li><small>${dt(c.d).getUTCFullYear()}</small><a class="cl" href="#t-${c.id}">${esc(c.s)}</a> <small>commit</small></li>`));
    const did = [];
    if (otd.hits.length) did.push(`wrote ${otd.hits.length} message${otd.hits.length === 1 ? "" : "s"}`);
    if (otd.cm.length) did.push(`made ${otd.cm.length} commit${otd.cm.length === 1 ? "" : "s"}`);
    otdHtml = `<p style="margin:0 0 8px"><b>${esc(head)}</b>, in past years, Satoshi ${did.join(" and ")}:</p><ul class="wk-otd">${items.join("")}</ul>`;
  }
  const dyk = seededPick(WIKI.dyk, 4, dayNum());
  const people = WA.filter(a => a.kind === "person");
  const topicsByCat = new Map();
  WA.filter(a => a.kind === "topic").forEach(a => { const c = a.cats[0]; if (!topicsByCat.has(c)) topicsByCat.set(c, []); topicsByCat.get(c).push(a); });
  const letters = new Map();
  WA.forEach(a => { const L = a.title.replace(/^the /i, "")[0].toUpperCase(); const k = /[A-Z]/.test(L) ? L : "#"; if (!letters.has(k)) letters.set(k, []); letters.get(k).push(a); });
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  $("#wkmain").innerHTML = `
    <div class="wk-welcome">
      <div><h1>Welcome to Satoshipedia</h1>
        <p>The encyclopedia of Satoshi Mail: the people Satoshi Nakamoto wrote to, the events he took part in, and what his messages show. Every article links to the emails, posts and commits it draws on.</p>
        <div class="count"><b>${WA.length}</b> articles · drawn from <b>${fmtNum(nMsgs)}</b> messages and <b>${fmtNum(COMMITS.length)}</b> commits by Satoshi · a supplement to <a class="ext" href="https://en.wikipedia.org/wiki/Satoshi_Nakamoto" target="_blank" rel="noopener">Wikipedia</a></div></div>
      ${WK_MARK().replace("<svg", `<svg class="wk-img" style="width:96px;height:96px"`)}
    </div>
    <div class="wk-grid">
      <div>
        <section class="wk-box feat"><h2>From today's featured article</h2><div class="in"><div class="feat-in">${wkImg(f, "mid")}<div><p><b>${wl(f.slug)}</b>: ${esc(f._lead.length > 520 ? f._lead.slice(0, f._lead.lastIndexOf(" ", 500)) + "…" : f._lead)}</p><p class="more">(<a class="wl" href="#wiki-${f.slug}" data-slug="${f.slug}">Full article…</a>)</p></div></div></div></section>
        <section class="wk-box dyk"><h2>Did you know…</h2><div class="in"><ul>${dyk.map(x => `<li>${x}</li>`).join("")}</ul></div></section>
      </div>
      <div>
        <section class="wk-box"><h2>On this day</h2><div class="in">${otdHtml}</div></section>
        <section class="wk-box"><h2>Top correspondents by message volume</h2><div class="in"><table class="wk-rank"><tbody>${rank}</tbody></table><p class="more" style="margin:8px 0 0"><a class="xl" href="#people">All ${fmtNum(PEOPLE.length)} people in Satoshi Mail →</a></p></div></section>
      </div>
    </div>
    <section class="wk-sec"><h2>Topic articles</h2><div class="wk-topics">${[...topicsByCat.entries()].sort((a, b) => b[1].length - a[1].length).map(([c, list]) => `<div><h3>${esc(c)}</h3><ul>${list.map(a => `<li>${wl(a.slug)}</li>`).join("")}</ul></div>`).join("")}</div></section>
    <section class="wk-sec"><h2>People</h2><div class="wk-topics"><div><ul>${people.slice(0, Math.ceil(people.length / 3)).map(a => `<li>${wl(a.slug)}</li>`).join("")}</ul></div><div><ul>${people.slice(Math.ceil(people.length / 3), Math.ceil(2 * people.length / 3)).map(a => `<li>${wl(a.slug)}</li>`).join("")}</ul></div><div><ul>${people.slice(Math.ceil(2 * people.length / 3)).map(a => `<li>${wl(a.slug)}</li>`).join("")}</ul></div></div></section>
    <section class="wk-sec"><h2>Browse by name</h2>
      <div class="wk-letters">${ABC.map(L => letters.has(L) ? `<a href="#wiki~all" data-scroll="L-${L}" data-to="#wiki~all">${L}</a>` : `<span aria-hidden="true">${L}</span>`).join("")}</div>
      ${azHtml(letters)}
    </section>`;
}
function azHtml(letters) {
  return `<div class="wk-az">${[...letters.keys()].sort().map(L => `<section id="L-${L}"><h3>${L}</h3><ul>${letters.get(L).map(a => `<li>${wl(a.slug)}</li>`).join("")}</ul></section>`).join("")}</div>`;
}
function renderWikiAll() {
  const letters = new Map();
  WA.forEach(a => { const L = a.title.replace(/^the /i, "")[0].toUpperCase(); const k = /[A-Z]/.test(L) ? L : "#"; if (!letters.has(k)) letters.set(k, []); letters.get(k).push(a); });
  $("#wkmain").innerHTML = `<h1 class="wk-h1">All articles</h1><p class="wk-from">${WA.length} articles, A to Z.</p>
    <div class="wk-letters">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(L => letters.has(L) ? `<a href="#wiki~all" data-scroll="L-${L}">${L}</a>` : `<span aria-hidden="true">${L}</span>`).join("")}</div>${azHtml(letters)}`;
}
const listRow = (a, extra = "") => `<li><a class="row2" href="#wiki-${a.slug}" data-slug="${a.slug}">${wkImg(a, "mini2")}<span class="t"><b>${esc(a.title)}</b><span>${extra || esc(a.short)}</span></span></a></li>`;
function renderWikiCats() {
  $("#wkmain").innerHTML = `<h1 class="wk-h1">Categories</h1><p class="wk-from">${WCATS.size} categories.</p>
    <div class="wk-topics">${[...WCATS.keys()].sort().map(c => `<div><h3><a href="#wiki~cat~${catSlug(c)}">${esc(c)}</a> (${WCATS.get(c).length})</h3><ul>${WCATS.get(c).slice(0, 6).map(a => `<li>${wl(a.slug)}</li>`).join("")}${WCATS.get(c).length > 6 ? `<li><a href="#wiki~cat~${catSlug(c)}">more…</a></li>` : ""}</ul></div>`).join("")}</div>`;
}
function renderWikiCat(cs) {
  const c = [...WCATS.keys()].find(c => catSlug(c) === cs);
  if (!c) return renderWikiMissing(cs);
  const list = WCATS.get(c).slice().sort((a, b) => a.title.localeCompare(b.title));
  $("#wkmain").innerHTML = `<h1 class="wk-h1">Category: ${esc(c)}</h1><p class="wk-from">${list.length} article${list.length === 1 ? "" : "s"} in this category.</p><ul class="wk-list">${list.map(a => listRow(a)).join("")}</ul>`;
}
function wikiSearch(q) {
  const ql = q.trim().toLowerCase();
  if (!ql) return [];
  const words = ql.split(/\s+/);
  return WA.map(a => {
    const t = a.title.toLowerCase();
    let score = 0;
    if (t === ql) score += 100; else if (t.startsWith(ql)) score += 60; else if (t.includes(ql)) score += 40;
    if (a.aliases.some(x => x.toLowerCase() === ql)) score += 50;
    if (!words.every(w => a._text.includes(w))) return null;
    score += words.reduce((s, w) => s + Math.min(10, a._text.split(w).length - 1), 0);
    return { a, score };
  }).filter(Boolean).sort((x, y) => y.score - x.score || x.a.title.localeCompare(y.a.title)).map(x => x.a);
}
function snippetFor(a, q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const text = a._lead + " " + a.sections.map(s => htmlText(s.html)).join(" ");
  const low = text.toLowerCase();
  const pos = Math.max(0, Math.min(...words.map(w => { const p = low.indexOf(w); return p < 0 ? Infinity : p; })));
  const start = isFinite(pos) ? Math.max(0, pos - 60) : 0;
  const piece = (start ? "…" : "") + text.slice(start, start + 200) + "…";
  return esc(piece).replace(new RegExp(words.map(w => escRe(esc(w))).join("|"), "gi"), m => `<mark>${m}</mark>`);
}
function renderWikiSearch(q) {
  const res = wikiSearch(q);
  $("#wkq").value = q;
  $("#wkmain").innerHTML = `<h1 class="wk-h1">Search results</h1><p class="wk-from">${res.length} article${res.length === 1 ? "" : "s"} match “${esc(q)}”. <a class="xl" href="#search-${encodeURIComponent(q)}">Search Satoshi Mail's messages for “${esc(q)}” instead →</a></p>
    ${res.length ? `<ul class="wk-list">${res.map(a => listRow(a, snippetFor(a, q))).join("")}</ul>` : `<p class="wk-empty">No article matches. Try a person's name or an event, or <a href="#wiki~all">browse all articles</a>.</p>`}`;
}
function renderWikiAbout() {
  $("#wkmain").innerHTML = `<article class="wk-art"><h1 class="wk-h1">About Satoshipedia</h1><p class="wk-from">How this encyclopedia is made.</p>
    <p><span class="beta-pill static">Beta</span> Satoshipedia and Satoshi Mail are in beta and still in development. Articles, features and the layout may change, and some things may not work yet.</p>
    <p>Satoshipedia and Satoshi Mail were founded and made by <a class="ext" href="https://x.com/TylerHowell88" target="_blank" rel="noopener">Tyler Howell (@TylerHowell88)</a>.</p>
    <p>Satoshipedia is the encyclopedia of Satoshi Mail, modelled on the Jwiki that accompanies Jmail. It has ${WA.length} articles about Satoshi Nakamoto, the people he corresponded with, and the events and documents of Bitcoin's first years.</p>
    <h2>Sources</h2>
    <ul><li>Satoshi's emails, forum posts and their threads, from the <a class="ext" href="https://satoshi.nakamotoinstitute.org/" target="_blank" rel="noopener">Satoshi Nakamoto Institute</a>.</li>
      <li>His private correspondence and primary source files, from <a class="ext" href="https://github.com/lugaxker/nakamoto-archive" target="_blank" rel="noopener">nakamoto-archive</a>.</li>
      <li>His commits, from the <a class="ext" href="https://github.com/bitcoin/bitcoin" target="_blank" rel="noopener">Bitcoin Core repository</a>.</li>
      <li>The white paper and site at <a class="ext" href="https://bitcoin.org/" target="_blank" rel="noopener">bitcoin.org</a>.</li>
      <li>Background facts, summarised from Wikipedia's <a class="ext" href="https://en.wikipedia.org/wiki/Satoshi_Nakamoto" target="_blank" rel="noopener">Satoshi Nakamoto</a> article and related Wikipedia articles (CC BY-SA 4.0).</li></ul>
    <p>The archive is also cross-checked against <a class="ext" href="https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive" target="_blank" rel="noopener">Blocktrainer's archive</a> and <a class="ext" href="https://satoshin.name/" target="_blank" rel="noopener">satoshin.name</a>; see <a class="wl" href="#wiki-blocktrainer-archive" data-slug="blocktrainer-archive">Blocktrainer archive</a> and <a class="wl" href="#wiki-satoshin-archive" data-slug="satoshin-archive">Satoshi Nakamoto Archive (satoshin.name)</a>.</p>
    <p>Nothing else is cited: no news sites, blogs or other web pages. Where these sources don't support a detail, the article leaves it out.</p>
    <h2>How articles work</h2>
    <p>Links marked with an envelope open the message in Satoshi Mail; links marked with a commit icon open the commit. Figures marked with an orange dot, and the charts in some articles, are computed live from the archive, so they always match what Satoshi Mail shows.</p>
    <h2>Accuracy and neutrality</h2>
    <p>The articles were written with AI assistance and checked against their sources. Where Satoshi's identity is concerned, they report who has been named, by whom, and how each person responded, without taking a side. Quotations are reproduced from the archive. If something looks wrong, follow the reference.</p></article>`;
}
function renderWikiMissing(slug) {
  const res = wikiSearch(slug.replace(/[-~]/g, " "));
  $("#wkmain").innerHTML = `<h1 class="wk-h1">Article not found</h1><p class="wk-from">Satoshipedia has no article called “${esc(slug)}”.</p>${res.length ? `<p>Did you mean:</p><ul class="wk-list">${res.slice(0, 5).map(a => listRow(a)).join("")}</ul>` : `<p><a href="#wiki~all">Browse all articles</a>.</p>`}`;
}
function renderWikiArticle(a) {
  const st = personStats(a);
  const toc = a.sections.filter(s => s.lvl === 2);
  const infoRows = a.info.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("") +
    (st ? `<div class="live" style="display:contents"><dt>In the archive</dt><dd>${fmtNum(st.n)} message${st.n === 1 ? "" : "s"} in ${st.threads} conversation${st.threads === 1 ? "" : "s"}</dd><dt>Dates</dt><dd>${esc(shortDate(st.first))}${st.last - st.first > 86400 ? " – " + esc(shortDate(st.last)) : ""}</dd></div>` : "");
  const openHref = a.label ? `#label-${a.label}` : st ? `#search-${encodeURIComponent(`from:"${st.searchQ.toLowerCase()}"`)}` : null;
  const archive = st ? `<section><h2 id="in-the-archive">In the archive</h2><div class="wk-arch">
      <div class="stats"><div><b>${fmtNum(st.n)}</b><small>messages by ${esc(a.title.split(" ")[0])}</small></div><div><b>${st.threads}</b><small>conversations</small></div><div><b>${st.withSat}</b><small>with Satoshi taking part</small></div><div><b>${fmtNum(st.satMsgs)}</b><small>messages from Satoshi in them</small></div></div>
      <ol>${st.top.map(([t, k]) => `<li><a class="ml" href="#t-${t.id}">${esc(t.t)}</a><small>${esc(srcName(t))} · ${k} message${k === 1 ? "" : "s"} · ${esc(shortDate(t.first))}</small></li>`).join("")}</ol>
      <div class="acts">${MAP.BY.has(a.slug) ? `<a class="pillbtn" href="#map~p~${a.slug}">${ic("hub")}On Satoshi Map</a>` : ""}${a.label ? `<a class="pillbtn" href="#label-${a.label}">${ic("lock")}Private email with ${esc(a.title.split(" ")[0])}</a>` : ""}<a class="pillbtn" href="#search-${encodeURIComponent(`from:"${st.searchQ.toLowerCase()}"`)}">${ic("search")}All messages from ${esc(st.searchQ)}</a></div>
    </div></section>` : "";
  const tocHtml = toc.length >= 3 ? `<nav class="wk-toc" aria-label="Contents"><b>Contents</b><ol>${toc.map(s => `<li><a href="#wiki-${a.slug}" data-scroll="${s.id}">${s.h}</a></li>`).join("")}${st ? `<li><a href="#wiki-${a.slug}" data-scroll="in-the-archive">In the archive</a></li>` : ""}${a.see.length ? `<li><a href="#wiki-${a.slug}" data-scroll="see-also">See also</a></li>` : ""}${a.refs.length ? `<li><a href="#wiki-${a.slug}" data-scroll="references">References</a></li>` : ""}</ol></nav>` : "";
  const msgsTab = st && openHref ? `<a href="${openHref}">Messages (${fmtNum(st.n)})</a>` : "";
  $("#wkmain").innerHTML = `<article class="wk-art" data-slug="${a.slug}">
    <div class="wk-tabs"><div><a class="on" href="#wiki-${a.slug}">Article</a>${msgsTab}</div><div><a class="on" href="#wiki-${a.slug}">Read</a>${a.refs.length ? `<a href="#wiki-${a.slug}" data-scroll="references">Sources</a>` : ""}</div></div>
    <h1 class="wk-h1">${esc(a.title)}</h1>
    <p class="wk-from">From Satoshipedia, the Satoshi Mail encyclopedia</p>
    <aside class="wk-ibox" aria-label="Summary"><div class="cap-t">${esc(a.title)}</div><div class="pic">${wkImg(a)}</div>${a.caption ? `<div class="cap">${esc(a.caption)}</div>` : ""}<dl>${infoRows}</dl>${openHref ? `<div class="open"><a class="pillbtn" href="${openHref}">${ic("mail")}Open in Satoshi Mail</a></div>` : ""}</aside>
    ${a.lead}
    ${tocHtml}
    ${a.sections.map(s => `<h${s.lvl} id="${s.id}">${s.h}</h${s.lvl}>${s.html}`).join("")}
    ${archive}
    ${a.see.length ? `<h2 id="see-also">See also</h2><ul class="wk-see">${a.see.map(s => `<li>${wl(s)}</li>`).join("")}</ul>` : ""}
    ${a.refs.length ? `<h2 id="references">References</h2><ol class="wk-refs">${a.refs.map((r, i) => `<li id="cite-${i + 1}">${r}</li>`).join("")}</ol>` : ""}
    <div class="wk-cats"><b>Categories:</b>${a.cats.map(c => `<a href="#wiki~cat~${catSlug(c)}">${esc(c)}</a>`).join("<span aria-hidden=\"true\">·</span>")}</div>
  </article>`;
  resolveLinks($("#wkmain"));
}

/* ── routing ── */
let WK_LAST = null, WK_SCROLL_AFTER = null;
const inWiki = () => location.hash === "#wiki" || location.hash.startsWith("#wiki-") || location.hash.startsWith("#wiki~");
/* window state: "closed", "open" (over the mail) or "min" (a bar above the dock) */
let WK_STATE = "closed", WK_BEHIND = "#inbox", MAIL_READY = false, WK_SAVED = 0, WK_TITLE = "Main page", WK_HIDE_T = null;
let WK_MAX = false;
try { WK_MAX = localStorage.getItem("satoshipedia-max") === "1"; } catch (e) {}
function setWin(state) {
  const win = $("#wkwin"), was = WK_STATE, open = state === "open";
  WK_STATE = state;
  document.body.classList.toggle("in-wiki", open);
  $("#app").inert = open || MAP_OPEN;
  win.classList.toggle("max", WK_MAX);
  $("#wkscrim").hidden = !open || WK_MAX;
  const mb = win.querySelector(".wk-maxbtn");
  mb.innerHTML = ic(WK_MAX ? "close_fullscreen" : "open_in_full");
  mb.setAttribute("aria-label", WK_MAX ? "Exit full screen" : "Full screen"); mb.title = mb.getAttribute("aria-label");
  clearTimeout(WK_HIDE_T);
  if (open) {
    if (win.hidden || win.classList.contains("closing")) {
      win.classList.remove("closing"); win.hidden = false;
      if (!REDUCED) { win.classList.remove("opening"); void win.offsetWidth; win.classList.add("opening"); }
      $("#wiki").focus({ preventScroll: true });
    }
  } else if (was === "open") {
    WK_SAVED = $("#wiki").scrollTop;
    hidePreview(); closeWkSug(); $("#wknav").classList.remove("open");
    if (REDUCED) win.hidden = true;
    else { win.classList.remove("opening"); win.classList.add("closing"); WK_HIDE_T = setTimeout(() => { win.hidden = true; win.classList.remove("closing"); }, 170); }
  } else if (state === "closed") win.hidden = true;
  $("#wkminbar").hidden = state !== "min";
  $("#wkmint").textContent = WK_TITLE;
  if (open) { try { localStorage.setItem("satoshipedia-seen", "1"); } catch (e) {} $("#wknew").hidden = true; }
  updateDock();
}
function wkMinimize() { setWin("min"); if (inWiki()) location.hash = WK_BEHIND; }
function wkClose() { setWin("closed"); WK_LAST = null; WK_TITLE = "Main page"; if (inWiki()) location.hash = WK_BEHIND; }
function wkRestore() { location.hash = "#" + (WK_LAST || "wiki"); }
function wkToggleMax() { WK_MAX = !WK_MAX; try { localStorage.setItem("satoshipedia-max", WK_MAX ? "1" : "0"); } catch (e) {} setWin(WK_STATE); }
function updateDock() {
  const v = MAP_OPEN ? "map" : WK_STATE === "open" ? "wiki" : ROUTE.view === "activity" ? "activity"
    : ROUTE.view === "commits" || (ROUTE.view === "thread" && isCommitId(ROUTE.id)) ? "commits" : "mail";
  document.querySelectorAll("#dock .dk").forEach(d => {
    const on = d.dataset.dock === v;
    d.classList.toggle("on", on);
    d.classList.toggle("run", d.dataset.dock === "wiki" && WK_STATE === "min");
    if (on && d.tagName === "A") d.setAttribute("aria-current", "page"); else d.removeAttribute("aria-current");
  });
  const wb = $('#dock [data-dock="wiki"]');
  wb.setAttribute("aria-expanded", String(WK_STATE === "open"));
  wb.title = WK_STATE === "open" ? "Minimize Satoshipedia" : "Open Satoshipedia";
}
function renderWiki() {
  const h = decodeURIComponent(location.hash.slice(1));
  let route = h;
  if (h === "wiki~random") {
    const cur = WK_LAST && WK_LAST.startsWith("wiki-") ? WK_LAST.slice(5) : null;
    const pool = WA.filter(a => a.slug !== cur);
    location.replace("#wiki-" + pool[Math.floor(Math.random() * pool.length)].slug);
    return;
  }
  WK_TITLE = h.startsWith("wiki-") ? (WBY.get(h.slice(5)) || { title: "Article not found" }).title
    : h === "wiki~all" ? "All articles" : h === "wiki~cats" ? "Categories" : h === "wiki~about" ? "About Satoshipedia"
    : h.startsWith("wiki~cat~") ? "Category" : h.startsWith("wiki~search~") ? `Search: ${h.slice(12)}` : "Main page";
  if (h === "wiki") renderWikiMain();
  else if (h === "wiki~all") renderWikiAll();
  else if (h === "wiki~cats") renderWikiCats();
  else if (h === "wiki~about") renderWikiAbout();
  else if (h.startsWith("wiki~cat~")) renderWikiCat(h.slice(9));
  else if (h.startsWith("wiki~search~")) renderWikiSearch(h.slice(12));
  else if (h.startsWith("wiki-")) { const a = WBY.get(h.slice(5)); if (a) renderWikiArticle(a); else renderWikiMissing(h.slice(5)); }
  else renderWikiMain();
  if (!h.startsWith("wiki~search~")) $("#wkq").value = "";
  wkNav("#" + route);
  $("#wknav").classList.remove("open");
  resolveLinks($("#wkmain"));
  if (!REDUCED) $("#wkmain").classList.remove("enter"), void $("#wkmain").offsetWidth, $("#wkmain").classList.add("enter");
  if (WK_SCROLL_AFTER) { const id = WK_SCROLL_AFTER; WK_SCROLL_AFTER = null; requestAnimationFrame(() => wkScrollTo(id)); }
  else if (WK_LAST !== h) $("#wiki").scrollTop = 0;
  WK_LAST = h;
}
function routeAll(fromHash) {
  if (inMap()) {
    if (!MAIL_READY) { render(true); MAIL_READY = true; }   // the mail behind the window
    if (WK_STATE === "open") setWin("min");
    mapShow(true); mapRoute(); updateDock(); updateTitle();
    return;
  }
  if (MAP_OPEN) mapShow(false);
  if (inWiki()) {
    if (!MAIL_READY) { render(true); MAIL_READY = true; }      // the mail behind the window (inbox on a cold start)
    const h = decodeURIComponent(location.hash.slice(1));
    const reopen = WK_STATE !== "open" && h === WK_LAST && $("#wkmain").childElementCount;
    setWin("open");
    if (reopen) { $("#wiki").scrollTop = WK_SAVED; updateTitle(); return; }  // restored: same page, same place
    renderWiki(); updateTitle();
    return;
  }
  WK_BEHIND = location.hash || "#inbox";
  if (WK_STATE === "open") setWin("min");
  render(fromHash); MAIL_READY = true;
  updateDock(); updateTitle();
}
function wkScrollTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top - $("#wiki").getBoundingClientRect().top + $("#wiki").scrollTop - 84;
  $("#wiki").scrollTo({ top, behavior: SMOOTH });
}

/* ── interactions ── */
$("#wiki").addEventListener("click", e => {
  const t = e.target;
  const menu = t.closest("[data-wk]");
  if (menu) {
    const k = menu.dataset.wk;
    if (k === "menu") { $("#wknav").classList.toggle("open"); return; }
    if (k === "another-quote") { const live = menu.closest(".w-live"); if (live) { LIVE.quote(live); resolveLinks(live); } return; }
  }
  const cite = t.closest("a[data-cite]");
  if (cite) {
    e.preventDefault();
    const li = document.getElementById("cite-" + cite.dataset.cite);
    if (li) { wkScrollTo(li.id); li.classList.add("hl"); setTimeout(() => li.classList.remove("hl"), 1600); }
    return;
  }
  const sc = t.closest("[data-scroll]");
  if (sc) {
    e.preventDefault();
    if (sc.dataset.to && location.hash !== sc.dataset.to) { WK_SCROLL_AFTER = sc.dataset.scroll; location.hash = sc.dataset.to; }
    else wkScrollTo(sc.dataset.scroll);
    return;
  }
  const a = t.closest("a[href]");
  if (a && /^#t-/.test(a.getAttribute("href") || "")) {
    LAST_LIST = location.hash;
    const id = a.getAttribute("href").slice(3);
    HIT = a.dataset.mi != null ? { id, hits: [+a.dataset.mi], terms: [] } : null;
  }
});

/* window controls (header, minimized bar, scrim) */
document.addEventListener("click", e => {
  const c = e.target.closest && e.target.closest("[data-wkwin]");
  if (!c) return;
  e.preventDefault();
  ({ min: wkMinimize, close: wkClose, max: wkToggleMax, restore: wkRestore,
     "max-restore"() { if (!WK_MAX) wkToggleMax(); wkRestore(); } })[c.dataset.wkwin]();
});
/* dock */
(() => {
  const now = new Date();
  $("#dkday").textContent = now.getDate();
  $("#dkmon").textContent = MON[now.getMonth()].toUpperCase();
  try { if (localStorage.getItem("satoshipedia-seen") === "1") $("#wknew").hidden = true; } catch (e) {}
})();
$("#dock").addEventListener("click", e => {
  const b = e.target.closest(".dk");
  if (!b) return;
  if (b.dataset.dock === "wiki") { e.preventDefault(); if (WK_STATE === "open") wkMinimize(); else wkRestore(); return; }
  // mail apps: if the window is open, the hash change minimizes it
});

/* search box with suggestions */
const WKS = { items: [], active: -1 };
function closeWkSug() { $("#wksug").hidden = true; WKS.active = -1; $("#wkq").setAttribute("aria-expanded", "false"); }
function drawWkSug() {
  const q = $("#wkq").value.trim();
  if (!q || document.activeElement !== $("#wkq")) { closeWkSug(); return; }
  const res = wikiSearch(q).slice(0, 7);
  WKS.items = res.map(a => ({ href: "#wiki-" + a.slug, html: `${wkImg(a, "mini")}<span class="t"><b>${esc(a.title)}</b><small>${esc(a.short)}</small></span>` }));
  WKS.items.push({ href: "#wiki~search~" + encodeURIComponent(q), html: `<span class="wk-img mini icon">${ic("search")}</span><span class="t"><b>Search articles for “${esc(q)}”</b><small>Full-text search</small></span>` });
  WKS.items.push({ href: "#search-" + encodeURIComponent(q), html: `<span class="wk-img mini icon">${ic("mail")}</span><span class="t"><b>Search Satoshi Mail for “${esc(q)}”</b><small>Emails, posts and commits</small></span>` });
  WKS.active = Math.min(WKS.active, WKS.items.length - 1);
  $("#wksug").innerHTML = WKS.items.map((it, i) => `<a href="${it.href}" role="option" id="wks${i}" class="${i === WKS.active ? "on" : ""}" aria-selected="${i === WKS.active}">${it.html}</a>`).join("");
  $("#wksug").hidden = false;
  $("#wkq").setAttribute("aria-expanded", "true");
}
$("#wkq").addEventListener("input", () => { WKS.active = -1; drawWkSug(); });
$("#wkq").addEventListener("focus", drawWkSug);
$("#wkq").addEventListener("blur", () => setTimeout(closeWkSug, 150));
$("#wkq").addEventListener("keydown", e => {
  if ($("#wksug").hidden) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const n = WKS.items.length;
    WKS.active = e.key === "ArrowDown" ? (WKS.active + 1) % n : (WKS.active - 1 + n) % n;
    drawWkSug();
  } else if (e.key === "Escape") { closeWkSug(); }
});
$("#wksearch").addEventListener("submit", e => {
  e.preventDefault();
  const q = $("#wkq").value.trim();
  const pick = WKS.active >= 0 && !$("#wksug").hidden ? WKS.items[WKS.active] : null;
  closeWkSug(); $("#wkq").blur();
  if (pick) { location.hash = pick.href; return; }
  if (!q) return;
  const exact = WA.find(a => a.title.toLowerCase() === q.toLowerCase() || a.aliases.some(x => x.toLowerCase() === q.toLowerCase()));
  location.hash = exact ? "#wiki-" + exact.slug : "#wiki~search~" + encodeURIComponent(q);
});
$("#wksug").addEventListener("pointerdown", e => { const a = e.target.closest("a"); if (a) { e.preventDefault(); closeWkSug(); location.hash = a.getAttribute("href"); } });

/* hover previews for article links (pointer devices only) */
let prevTimer = null, prevFor = null;
function hidePreview() { clearTimeout(prevTimer); prevFor = null; const p = $("#wkprev"); if (p) p.hidden = true; }
const CAN_HOVER = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
document.addEventListener("pointerover", e => {
  if (!CAN_HOVER || !document.body.classList.contains("in-wiki")) return;
  const a = e.target.closest && e.target.closest("a.wl[data-slug]");
  if (!a || a === prevFor) return;
  if (a.closest(".wk-nav, .wk-sug, .wk-topics, .wk-az, .wk-list")) return;
  hidePreview(); prevFor = a;
  prevTimer = setTimeout(() => {
    const art = WBY.get(a.dataset.slug); if (!art || !a.isConnected) return;
    const p = $("#wkprev");
    p.innerHTML = `<div class="hd">${wkImg(art, "mid")}<div><b>${esc(art.title)}</b><small>${esc(art.short)}</small></div></div><p>${esc(art._lead)}</p>`;
    p.hidden = false;
    const r = a.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight;
    const left = Math.max(12, Math.min(r.left, innerWidth - pw - 12));
    const top = r.bottom + 8 + ph < innerHeight ? r.bottom + 8 : Math.max(12, r.top - ph - 8);
    p.style.left = left + "px"; p.style.top = top + "px";
  }, 420);
});
document.addEventListener("pointerout", e => { if (prevFor && e.target.closest && e.target.closest("a.wl") === prevFor && !prevFor.contains(e.relatedTarget)) hidePreview(); });
$("#wiki").addEventListener("scroll", hidePreview, { passive: true });

/* keyboard inside the encyclopedia */
function wikiKey(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || tag === "select";
  if ((e.metaKey || e.ctrlKey) && (e.key || "").toLowerCase() === "k") { e.preventDefault(); $("#wkq").focus(); $("#wkq").select(); return; }
  if (e.key === "Escape") {
    if ($("#wknav").classList.contains("open")) $("#wknav").classList.remove("open");
    else if (typing) e.target.blur();
    else if ($("#layer").childElementCount) closeLayer();
    else wkMinimize();
    hidePreview(); return;
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "/") { e.preventDefault(); $("#wkq").focus(); }
}

/* ── entry points from the mail side ── */
/* Blocktrainer's "Full Archive" (blocktrainer.de), cross-checked against this archive on 20 October 2026:
   4,236 entries; every one is also here. It has no Adam Back emails, and only Satoshi's side of the
   Mike Hearn and Dustin Trammell exchanges. It adds German translations and some different dates. */
const BLOCKTRAINER = {
  url: "https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive",
  covers: t => t.s !== "adam-back",
  partial: t => t.s === "mike-hearn" || t.s === "dustin-trammell",
  dateNote: {
    "single-emails|Email to Laszlo Hanyecz": "Blocktrainer's archive dates this email 11 December 2009; nakamoto-archive's source lists it as May 2010.",
    "single-emails|Email to Jon Matonis": "Blocktrainer's archive gives a time for this email: 4 March 2010, 08:55 UTC.",
  },
};
/* satoshin.name, the "Satoshi Nakamoto Archive" (checked 20 October 2026): 567 of Satoshi's own
   BitcoinTalk posts and mailing-list emails, each on its own page. Every one is also here; the map
   below says which message is which page. It has no private emails, P2P Foundation or p2p-research posts.
   Keys are stable message IDs (built by tools/satoshin_xref.py, same rule as key() here):
   "bitcointalk:<msg number>" for forum posts, otherwise the source URL without scheme or trailing slash. */
const SATOSHIN = (() => {
  let x = { msgs: {} };
  try { x = JSON.parse(document.getElementById("satoshin-data").textContent); } catch (e) {}
  const base = x.site || "https://satoshin.name/";
  return {
    home: base, msgs: x.msgs || {},
    key(m) {
      const u = (m && m.u) || "", f = u.match(/bitcointalk\.org\/.*?msg(\d+)/);
      return f ? "bitcointalk:" + f[1] : u.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    },
    url(t, i) { const k = this.key(t.m[i]), s = k && this.msgs[k]; return s ? base + s : ""; },
    first(t) { for (let i = 0; i < (t.m || []).length; i++) { const u = this.url(t, i); if (u) return u; } return ""; },
    count(t) { let n = 0; for (let i = 0; i < (t.m || []).length; i++) if (this.url(t, i)) n++; return n; },
  };
})();
function wikiChipsFor(t) {
  return wikiChipsOnly(t);   // sources are listed once, on the Sources page (Settings → Archive)
}
function wikiChipsOnly(t) {
  const slugs = new Set();
  t.people.forEach(p => { const s = ALIAS.get(p.toLowerCase()); if (s) slugs.add(s); });
  WA.forEach(a => { if (a.label && a.label === t.s && a.kind === "person") slugs.add(a.slug); });
  (CITED.get(t.id) || new Set()).forEach(s => slugs.add(s));
  if (!slugs.size) return "";
  const list = [...slugs].map(s => WBY.get(s)).filter(Boolean).sort((a, b) => (a.kind === "person" ? 0 : 1) - (b.kind === "person" ? 0 : 1)).slice(0, 8);
  return `<div class="conv-wiki">In Satoshipedia:${list.map(a => `<a href="#wiki-${a.slug}">${ic("menu_book")}${esc(a.title)}</a>`).join("")}</div>`;
}

/* ── beta notice ── */
let BETA_ACK = false;
try { BETA_ACK = localStorage.getItem("satoshimail-beta-ack") === "1"; } catch (e) {}
const BETA_INFO = () => `<div class="beta-dlg"><h2><span>Satoshi Mail is in beta</span><button class="ib" data-act="closelayer" aria-label="Close">${ic("close")}</button></h2>
  <p>Satoshi Mail and its encyclopedia, Satoshipedia, are still in development. While they're in beta you may find:</p>
  <ul><li>features that change, move or aren't finished yet;</li><li>bugs, or screens that don't work well on every device;</li><li>articles and data that are still being checked and expanded.</li></ul>
  <p>The messages come from the Satoshi Nakamoto Institute, nakamoto-archive and the Bitcoin Core repository on GitHub, and bitcoin.org, and are cross-checked against Blocktrainer's archive and satoshin.name. Satoshipedia's articles were written with AI assistance and cite Wikipedia and those sources, so check the original before relying on a detail.</p>
  <p class="muted">${MADE_BY} (@TylerHowell88) · Beta · last updated ${esc(WIKI.updated)}</p>
  <p class="muted beta-inspired">${INSPIRED}.</p>
  <div class="end"><button class="pillbtn" data-act="beta-ok">Got it</button></div></div>`;
ACTIONS.beta = () => { $("#betanote").hidden = true; dialog(BETA_INFO()); };
ACTIONS["beta-ok"] = () => {
  BETA_ACK = true;
  try { localStorage.setItem("satoshimail-beta-ack", "1"); } catch (e) {}
  $("#betanote").hidden = true; closeLayer();
};
// first visit: show the notice once the loading screen has gone
if (!BETA_ACK) setTimeout(() => { if (!BETA_ACK && !$("#layer").childElementCount) $("#betanote").hidden = false; }, 700);

/* footer (rendered once) */
wkFoot();

/* ── compose is just for fun: no emails or drafts are created ── */
const LAST = (() => {
  const real = SENT.filter(x => !x.m.w);
  const lastOf = pred => real.filter(pred).reduce((a, x) => (!a || x.m.d > a.m.d ? x : a), null);
  const email = lastOf(x => x.t.k !== "p"), post = lastOf(x => x.t.k === "p");
  const commit = COMMITS.reduce((a, c) => (!a || c.d > a.d ? c : a), null);
  return { email: email && email.m.d, post: post && post.m.d, commit: commit && commit.d };
})();
const sinceDays = sec => Math.floor((Date.now() / 1000 - sec) / 86400);
const sinceYears = sec => Math.floor((Date.now() / 1000 - sec) / (365.25 * 86400));
const JOKES = [
  () => ({ t: "Sorry, this account is no longer active.", b: `satoshin@gmx.com hasn't sent an email since ${longDay(LAST.email)}.` }),
  () => ({ t: "Welcome back, Satoshi. A lot of things have changed.", b: `It's been ${fmtNum(sinceDays(LAST.email))} days since your last email. You may want to sit down for this.` }),
  () => ({ t: `Sorry, last active was ${longDay(LAST.email)}.`, b: "Please try again in another decade." }),
  () => ({ t: "Satoshi has moved on to other things.", b: "His words, not ours: “I've moved on to other things and will probably be unavailable.”" }),
  () => ({ t: "Welcome back, Satoshi! You have 1 new message.", b: "Subject: “Who are you?” (It's from everyone.)" }),
  () => ({ t: "This draft couldn't be saved.", b: "Unlike bitcoin, drafts here are capped at zero." }),
  () => ({ t: "Compose is offline.", b: `Last forum post: ${longDay(LAST.post)}. Last commit: ${longDay(LAST.commit)}. The keyboard has been resting ever since.` }),
  () => ({ t: "Are you sure you want to send this?", b: "Sending a new email would reveal a lot. Probably best not to." }),
  () => ({ t: "Out of office", b: `Auto-reply: I'm away from my keyboard and have been for about ${sinceYears(LAST.email)} years. Back… eventually.` }),
  () => ({ t: "Too many people are claiming to be you right now.", b: "Please try again later." }),
  () => ({ t: "Welcome back, Satoshi.", b: "Password hint: “The Times, 3 January 2009”." }),
  () => ({ t: `Sorry, Satoshi was last seen ${sinceYears(LAST.email)} years ago.`, b: "If you see him, tell him the forum misses him." }),
  () => ({ t: "Message not sent.", b: "The sender's private key could not be found. Neither could the sender." }),
];
let JOKE_LAST = -1, JOKE_TRIES = 0;
function composeJoke(draft) {
  $("#rail").classList.remove("open");
  JOKE_TRIES++;
  let j;
  if (JOKE_TRIES > 1 && JOKE_TRIES % 7 === 0) j = { t: "Still no.", b: "We admire the persistence, though." };
  else if (draft && draft.to && Math.random() < 0.35) j = { t: "Reply not sent.", b: `${esc(draft.to)} has been waiting for an answer for well over a decade. They can wait a little longer.` };
  else {
    let i; do { i = Math.floor(Math.random() * JOKES.length); } while (i === JOKE_LAST && JOKES.length > 1);
    JOKE_LAST = i; j = JOKES[i]();
  }
  dialog(`<div class="cj" role="alertdialog" aria-labelledby="cj-t" aria-describedby="cj-b">
    <div class="cj-hd"><span class="cj-ic">${ic("unsubscribe")}</span><span><b>Mail Delivery Subsystem</b><small>to me · just now</small></span>
      <button class="ib" data-act="closelayer" aria-label="Close">${ic("close")}</button></div>
    <h2 id="cj-t">${j.t}</h2>
    <p id="cj-b">${j.b}</p>
    <p class="cj-note">Satoshi Mail is a read-only archive, so nothing was written, sent or saved.</p>
    <div class="cj-acts"><button class="linkbtn" data-act="compose">Try again</button><button class="pillbtn primary" data-act="closelayer">OK</button></div>
  </div>`);
  const ok = $("#layer .cj .pillbtn"); if (ok) ok.focus();
}
