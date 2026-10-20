
(() => {
"use strict";

/* ═════════════ data ═════════════ */
const RAW = JSON.parse(document.getElementById("data").textContent);
const META = RAW.meta;
const LISTS = {
  "cryptography":  { name: "Cryptography",   color: "#1a73e8", addr: "cryptography@metzdowd.com",          long: "Cryptography mailing list" },
  "bitcoin-list":  { name: "bitcoin-list",   color: "#188038", addr: "bitcoin-list@lists.sourceforge.net", long: "bitcoin-list (SourceForge)" },
  "p2p-research":  { name: "p2p-research",   color: "#9334e6", addr: "p2presearch@listcultures.org",       long: "P2P Research list" },
  "bitcointalk":   { name: "BitcoinTalk",    color: "#e37400", addr: "bitcointalk.org",                    long: "BitcoinTalk forum" },
  "p2pfoundation": { name: "P2P Foundation", color: "#007b83", addr: "p2pfoundation.ning.com",             long: "P2P Foundation forum" },
  // private correspondence (nakamoto-archive)
  "hal-finney":      { name: "Hal Finney",      color: "#c5221f", addr: "hal@finney.org",                     long: "Private email with Hal Finney", priv: 1 },
  "martti-malmi":    { name: "Martti Malmi",    color: "#0b8043", addr: "sirius-m@users.sourceforge.net",     long: "Private email with Martti Malmi (sirius-m)", priv: 1 },
  "mike-hearn":      { name: "Mike Hearn",      color: "#3367d6", addr: "mike@plan99.net",                    long: "Private email with Mike Hearn", priv: 1 },
  "dustin-trammell": { name: "Dustin Trammell", color: "#8e24aa", addr: "dtrammell@dustintrammell.com",       long: "Private email with Dustin Trammell", priv: 1 },
  "adam-back":       { name: "Adam Back",       color: "#795548", addr: "adam@cypherspace.org",               long: "Private email with Adam Back", priv: 1 },
  "wei-dai":         { name: "Wei Dai",         color: "#00838f", addr: "weidai@ibiblio.org",                 long: "Private email with Wei Dai", priv: 1 },
  "single-emails":   { name: "Other email",     color: "#616161", addr: "",                                   long: "Single emails to Gavin Andresen, Jon Matonis and Laszlo Hanyecz", priv: 1 },
};
const CATS = RAW.cats;
const CAT_NAME = Object.fromEntries(CATS.map(c => [c.slug, c.name]));
const SAT_RE = /^satoshi( nakamoto)?$/i;
const isSatName = n => SAT_RE.test(String(n).trim());

const THREADS = RAW.threads.map((t, idx) => {
  const ds = t.m.map(m => m.d);
  const people = [];
  for (const m of t.m) if (!people.includes(m.f)) people.push(m.f);
  const topics = new Set();
  t.m.forEach(m => (m.qc || []).forEach(c => topics.add(c)));
  return Object.assign(t, {
    idx, first: Math.min(...ds), last: Math.max(...ds), people, topics: [...topics],
    lastIsSat: !!t.m[t.m.length - 1].s,
    hasPdf: t.m.some(m => m.b.some(s => /bitcoin\.pdf/i.test(s[1]))),
  });
});
const BY_ID = new Map(THREADS.map(t => [t.id, t]));
const COMMITS = (RAW.commits || []).map((c, idx) => Object.assign(c, { idx, kind: "commit" }));
const BY_COMMIT = new Map(COMMITS.map(c => [c.id, c]));
const isCommitId = id => /^c[0-9a-f]/.test(id);
const SENT = THREADS.flatMap(t => t.m.map((m, i) => ({ t, i, m })).filter(x => x.m.s));
const LAST_ACTIVE = Math.max(...SENT.filter(x => !x.m.w).map(x => x.m.d));
const FIRST_ACTIVE = Math.min(...THREADS.map(t => t.first));
const PEOPLE = (() => {
  const map = new Map();
  for (const t of THREADS) for (const m of t.m) {
    if (isSatName(m.f)) continue;
    const p = map.get(m.f) || { name: m.f, msgs: 0, threads: new Set(), first: m.d, last: m.d };
    p.msgs++; p.threads.add(t.id); p.first = Math.min(p.first, m.d); p.last = Math.max(p.last, m.d);
    map.set(m.f, p);
  }
  return [...map.values()].map(p => ({ ...p, nthreads: p.threads.size }))
    .sort((a, b) => b.nthreads - a.nthreads || b.msgs - a.msgs || a.name.localeCompare(b.name));
})();

/* ═════════════ per-viewer state (this browser only) ═════════════ */
const KEY = "satoshi-mail-v2";
const ST = (() => {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; }
  s = s && typeof s === "object" ? s : {};
  for (const k of ["star", "read", "arch", "trash"]) s[k] = s[k] && typeof s[k] === "object" ? s[k] : {};
  s.trash = {};   // Trash was removed: nothing stays hidden in it
  s.drafts = Array.isArray(s.drafts) ? s.drafts : [];
  s.sort = s.sort === "old" ? "old" : "new";
  s.theme = ["light", "dark"].includes(s.theme) ? s.theme : "system";
  s.density = "default";
  return s;
})();
function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { /* no storage: state lasts this visit */ } }
function applyPrefs() {
  const r = document.documentElement;
  if (ST.theme === "system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", ST.theme);
  if (ST.density === "default") r.removeAttribute("data-density"); else r.setAttribute("data-density", ST.density);
}
applyPrefs();
// Unread by default = someone else had the last word.
const isRead = t => (t.id in ST.read) ? !!ST.read[t.id] : t.lastIsSat;
const isStar = t => !!ST.star[t.id];
const inFolder = (t, f) => {
  if (f === "trash") return !!ST.trash[t.id];
  if (ST.trash[t.id]) return false;
  if (f === "inbox") return !ST.arch[t.id];
  if (f === "starred") return isStar(t);
  return true;
};

/* ═════════════ helpers ═════════════ */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ic = (n, cls = "") => `<span class="ms ${cls}" aria-hidden="true" data-i="${n}"></span>`;
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const NOW = new Date();
const dt = s => new Date(s * 1000);
const fmtNum = n => Number(n).toLocaleString("en-US");
function listDate(sec) {
  const d = dt(sec);
  if (d.getUTCFullYear() === NOW.getUTCFullYear()) return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${String(d.getUTCFullYear()).slice(2)}`;
}
function clock(d) { let h = d.getUTCHours(); const ap = h < 12 ? "AM" : "PM"; h = h % 12 || 12; return `${h}:${String(d.getUTCMinutes()).padStart(2, "0")} ${ap}`; }
function ago(sec) { const y = Math.floor((NOW - dt(sec)) / 3.15576e10); return y < 1 ? "this year" : y === 1 ? "1 year ago" : `${y} years ago`; }
const approx = m => m && m.dp && m.dp !== "exact" && m.dp !== "local";
const DP_NOTE = {
  "day": "the source gives the day only",
  "day-inferred": "the source gives the day only; placed after the message it follows",
  "inferred": "undated in the source; shown at the date of the message it follows",
  "source-file": "undated in the source; this is the date of the source document",
};
const msgDateOf = m => approx(m) ? (m.dp === "inferred" ? "≈ " : "") + shortDate(m.d) : msgDate(m.d);
const fullDateOf = m => approx(m) ? `${shortDate(m.d)} (${DP_NOTE[m.dp] || "approximate"})` : fullDate(m.d) + (m && m.dp === "local" ? " (time zone not stated)" : "");
const msgDate = sec => { const d = dt(sec); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${clock(d)}`; };
const fullDate = sec => { const d = dt(sec); return `${DAY[d.getUTCDay()]}, ${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} at ${clock(d)} UTC`; };
const shortDate = sec => { const d = dt(sec); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const localClock = ms => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const AV = ["#5c6bc0", "#00897b", "#8e24aa", "#3949ab", "#d81b60", "#6d4c41", "#0288d1", "#43a047", "#7cb342", "#c0ca33", "#f4511e", "#546e7a", "#5e35b1", "#039be5"];
function avColor(name) { if (isSatName(name)) return "var(--satoshi)"; let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; }
function initial(name) { const m = String(name).match(/[A-Za-z0-9]/); return m ? m[0].toUpperCase() : "?"; }
const avatar = (name, cls = "avatar") => `<span class="${cls}" style="background:${avColor(name)}" aria-hidden="true">${esc(initial(name))}</span>`;
function shortName(name) {
  if (isSatName(name)) return "me";
  const p = name.trim().split(/\s+/);
  return p.length > 1 && /^[A-Z][a-z]+$/.test(p[0]) ? p[0] : name;
}
function senders(t) {
  const names = t.people.map(shortName);
  const s = names.length <= 3 ? names : [names[0], "..", ...names.slice(-2)];
  return s.map(x => x === ".." ? ".." : esc(x)).join(", ").replace(", .., ", " .. ") + (t.m.length > 1 ? `<span class="n">${t.m.length}</span>` : "");
}
function lchip(slug) {
  const L = LISTS[slug];
  return L ? `<a class="lchip" href="#label-${slug}" style="color:${L.color};background:color-mix(in srgb, ${L.color} 15%, transparent)">${esc(L.name)}</a>` : "";
}
function firstText(m) { const s = m.b.find(x => x[0] === "t") || m.b[0]; return s ? s[1].replace(/\s+/g, " ").trim() : ""; }
const msgText = m => m.b.map(s => s[1]).join("\n");

/* ═════════════ snackbar ═════════════ */
function snack(text, undo) {
  const old = $("#snack"); if (old) old.remove();
  const el = document.createElement("div");
  el.className = "snack"; el.id = "snack"; el.setAttribute("role", "status");
  el.innerHTML = `<span>${esc(text)}</span>${undo ? `<button type="button" id="snack-undo">Undo</button>` : ""}<button class="ib sm" type="button" aria-label="Dismiss">${ic("close")}</button>`;
  document.body.append(el);
  el.querySelector(".ib").onclick = () => el.remove();
  if (undo) $("#snack-undo").onclick = () => { undo(); el.remove(); render(); };
  clearTimeout(snack.t); snack.t = setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 200); }, 7000);
}

/* ═════════════ search ═════════════ */
let INDEX = null;
function buildIndex() {
  INDEX = THREADS.map(t => ({ subj: t.t.toLowerCase(), msgs: t.m.map(m => ({ from: m.f.toLowerCase(), text: (m.f + "\n" + (m.sj || "") + "\n" + msgText(m)).toLowerCase() })) }));
}
function parseQuery(q) {
  const o = { terms: [], neg: [], from: [], to: [], subj: [], label: [], topic: [], in: null, is: [], has: [], before: null, after: null };
  const re = /(-?)(?:(\w+):)?(?:"([^"]*)"|(\S+))/g;
  const date = v => { const p = v.split(/[\/\-.]/).map(Number); return p[0] ? Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1) / 1000 : null; };
  let m;
  while ((m = re.exec(q))) {
    const neg = m[1] === "-", op = (m[2] || "").toLowerCase(), val = (m[3] ?? m[4] ?? "").toLowerCase();
    if (!val) continue;
    if (op === "from") o.from.push(val);
    else if (op === "to") o.to.push(val);
    else if (op === "subject") o.subj.push(val);
    else if (op === "label" || op === "list") o.label.push(val);
    else if (op === "topic") o.topic.push(val);
    else if (op === "in") o.in = val === "anywhere" ? "all" : val;
    else if (op === "is") o.is.push(val);
    else if (op === "has") o.has.push(val);
    else if (op === "before") o.before = date(val);
    else if (op === "after") o.after = date(val);
    else (neg ? o.neg : o.terms).push(m[2] ? `${m[2]}:${val}` : val);
  }
  if (o.in === "sent") { o.is.push("satoshi"); o.in = "all"; }
  return o;
}
function runSearch(q) {
  if (!INDEX) buildIndex();
  const Q = parseQuery(q), res = [];
  const fromMe = Q.from.some(f => f === "me" || SAT_RE.test(f));
  const fromOthers = Q.from.filter(f => !(f === "me" || SAT_RE.test(f)));
  for (const t of THREADS) {
    const ix = INDEX[t.idx];
    if (Q.in ? !inFolder(t, Q.in) : ST.trash[t.id]) continue;
    if (Q.label.length && !Q.label.every(l => t.s === l || LISTS[t.s].name.toLowerCase() === l || (l === "private" && t.k === "x"))) continue;
    if (Q.to.length && !Q.to.every(v => t.s.includes(v) || LISTS[t.s].addr.includes(v) || LISTS[t.s].name.toLowerCase().includes(v))) continue;
    if (Q.topic.length && !Q.topic.every(c => t.topics.includes(c))) continue;
    if (Q.subj.length && !Q.subj.every(s => ix.subj.includes(s))) continue;
    if (Q.is.includes("starred") && !isStar(t)) continue;
    if (Q.is.includes("unread") && isRead(t)) continue;
    if (Q.is.includes("read") && !isRead(t)) continue;
    if (Q.neg.length && ix.msgs.some(m => Q.neg.some(n => m.text.includes(n)))) continue;
    const hits = [];
    t.m.forEach((m, i) => {
      const mi = ix.msgs[i];
      if (fromMe && !m.s) return;
      if (fromOthers.length && !fromOthers.every(f => mi.from.includes(f))) return;
      if (Q.is.includes("satoshi") && !m.s) return;
      if (Q.after != null && m.d < Q.after) return;
      if (Q.before != null && m.d >= Q.before) return;
      if (Q.has.includes("code") && !m.b.some(s => s[0] === "c")) return;
      if (Q.has.includes("quote") && !m.b.some(s => s[0] === "q")) return;
      if (Q.has.includes("attachment") && !m.b.some(s => /bitcoin\.pdf/i.test(s[1]))) return;
      if (Q.terms.length && !Q.terms.every(w => mi.text.includes(w))) return;
      hits.push(i);
    });
    if (hits.length) res.push({ t, hits });
  }
  // Satoshi's commits join the results unless the query rules them out
  const commitsOnly = Q.label.includes("commits") || Q.in === "commits";
  if (commitsOnly) res.length = 0;
  const allow = COMMITS.length && !fromOthers.length && !Q.topic.length && !Q.is.some(x => x === "unread" || x === "read")
    && !Q.label.some(l => l !== "commits") && !Q.has.some(h => h !== "code") && !Q.to.some(v => !"bitcoin".includes(v))
    && (Q.in == null || ["all", "commits", "anywhere", "starred"].includes(Q.in));
  if (allow) {
    if (!CINDEX) CINDEX = COMMITS.map(c => (c.s + "\n" + c.f.map(f => f[0] + "\n" + f[3]).join("\n")).toLowerCase());
    for (const c of COMMITS) {
      if ((Q.is.includes("starred") || Q.in === "starred") && !ST.star[c.id]) continue;
      if (Q.after != null && c.d < Q.after) continue;
      if (Q.before != null && c.d >= Q.before) continue;
      if (Q.subj.length && !Q.subj.every(x => c.s.toLowerCase().includes(x))) continue;
      const tx = CINDEX[c.idx];
      if (Q.terms.length && !Q.terms.every(w => tx.includes(w))) continue;
      if (Q.neg.length && Q.neg.some(w => tx.includes(w))) continue;
      res.push({ c, hits: [] });
    }
  }
  return { Q, res };
}
let CINDEX = null;
function hitSnippet(t, i, terms) {
  const text = msgText(t.m[i]).replace(/\s+/g, " ");
  if (!terms.length) return esc(text.slice(0, 160));
  const low = text.toLowerCase();
  let pos = Math.min(...terms.map(w => { const p = low.indexOf(w); return p < 0 ? Infinity : p; }));
  if (!isFinite(pos)) pos = 0;
  const start = Math.max(0, pos - 40);
  const piece = (start ? "…" : "") + text.slice(start, start + 180);
  return esc(piece).replace(new RegExp(terms.map(w => escRe(esc(w))).join("|"), "gi"), x => `<mark>${x}</mark>`);
}

/* ═════════════ safe text rendering: linkify + highlight ═════════════ */
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'\]]+/;
function appendText(el, text, terms) {
  const parts = [URL_RE.source];
  if (terms && terms.length) parts.push(terms.map(escRe).join("|"));
  const re = new RegExp(parts.map(p => `(${p})`).join("|"), "gi");
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) el.append(text.slice(last, m.index));
    if (m[1]) {
      let url = m[1], trail = "";
      const tr = url.match(/[.,;:!?)>]+$/);
      if (tr) { trail = tr[0]; url = url.slice(0, -trail.length); }
      const a = document.createElement("a");
      a.href = url.startsWith("www.") ? "http://" + url : url;
      a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = url;
      el.append(a);
      if (trail) el.append(trail);
    } else { const mk = document.createElement("mark"); mk.textContent = m[0]; el.append(mk); }
    last = re.lastIndex;
    if (!m[0].length) re.lastIndex++;
  }
  if (last < text.length) el.append(text.slice(last));
}

/* ═════════════ routing ═════════════ */
let ROUTE = {}, LAST_LIST = "#inbox", CURSOR = 0, MCURSOR = -1;
let CURRENT_LIST = [], SEARCH_TERMS = [], HIT = null;
const SELECTED = new Set();
function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
function parseHash() {
  const h = safeDecode(location.hash.slice(1) || "inbox");
  let m;
  if ((m = h.match(/^t-([epx]\d+|c[0-9a-f]{7,40})$/))) return { view: "thread", id: m[1] };
  if ((m = h.match(/^commits(?:-p(\d+))?$/))) return { view: "commits", page: +(m[1] || 1) };
  if ((m = h.match(/^search-(.*?)(?:~p(\d+))?$/s))) return { view: "list", search: m[1], page: +(m[2] || 1) };
  if ((m = h.match(/^inbox(?:-(forums|private))?(?:-p(\d+))?$/))) return { view: "list", folder: "inbox", tab: m[1] || "primary", page: +(m[2] || 1) };
  if ((m = h.match(/^(starred|all)(?:-p(\d+))?$/))) return { view: "list", folder: m[1], page: +(m[2] || 1) };
  if ((m = h.match(/^sent(?:-p(\d+))?$/))) return { view: "sent", page: +(m[1] || 1) };
  if ((m = h.match(/^label-([a-z0-9-]+?)(?:-p(\d+))?$/))) return { view: "list", label: m[1], page: +(m[2] || 1) };
  if ((m = h.match(/^topic-([a-z0-9-]+?)(?:-p(\d+))?$/))) return { view: "list", topic: m[1], page: +(m[2] || 1) };
  if (h === "drafts") return { view: "drafts" };
  if (h === "people") return { view: "people" };
  if (h === "activity") return { view: "activity" };
  if (h === "about") return { view: "about" };
  if (h === "sources") return { view: "sources" };
  return { view: "list", folder: "inbox", tab: "primary", page: 1 };
}
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
window.addEventListener("hashchange", () => { SELECTED.clear(); closeLayer(); if (typeof closeSuggest === "function") closeSuggest(); $("#rail").classList.remove("open"); routeAll(true); });

/* ═════════════ rail ═════════════ */
let showAllTopics = false;
function renderRail() {
  const r = ROUTE;
  const unread = THREADS.filter(t => inFolder(t, "inbox") && !isRead(t)).length;
  const item = (href, icon, label, n, on, cls = "") =>
    `<li><a class="nav${on ? " on" : ""}${cls}" href="${href}"${on ? ' aria-current="page"' : ""}>${ic(icon, on ? "fill" : "")}<span class="t">${esc(label)}</span>${n ? `<span class="n">${n}</span>` : ""}</a></li>`;
  const mail = [
    item("#inbox", "inbox", "Inbox", unread ? fmtNum(unread) : "", r.folder === "inbox" && r.search == null, unread ? " unread" : ""),
    item("#starred", "star", "Starred", "", r.folder === "starred"),
    item("#sent", "send", "Sent", "", r.view === "sent"),
    COMMITS.length ? item("#commits", "commit", "Commits", fmtNum(COMMITS.length), r.view === "commits") : "",
    item("#all", "mail", "All Mail", "", r.folder === "all"),
    item("#activity", "calendar_month", "Daily Activity", "", r.view === "activity"),
  ].join("");
  const topics = (showAllTopics ? CATS : CATS.slice(0, 6)).map(c => item(`#topic-${c.slug}`, "sell", c.name, "", r.topic === c.slug)).join("");
  const labelItem = ([slug, L]) => {
    const on = r.label === slug;
    return `<li><a class="nav${on ? " on" : ""}" href="#label-${slug}"><span class="ms fill" style="color:${L.color}" aria-hidden="true" data-i="${L.priv ? "lock" : "label"}"></span><span class="t">${esc(L.name)}</span></a></li>`;
  };
  const present = new Set(THREADS.map(t => t.s));
  const labels = Object.entries(LISTS).filter(([k, L]) => !L.priv && present.has(k)).map(labelItem).join("");
  const privLabels = Object.entries(LISTS).filter(([k, L]) => L.priv && present.has(k)).map(labelItem).join("");
  const people = PEOPLE.slice(0, 7).map(p => `<li><a class="nav" href="#search-${encodeURIComponent(`from:"${p.name.toLowerCase()}"`)}"><span class="dot" style="background:${avColor(p.name)}" aria-hidden="true">${esc(initial(p.name))}</span><span class="t">${esc(p.name)}</span><span class="n" title="Conversations with Satoshi">${p.nthreads}</span></a></li>`).join("");
  $("#rail").innerHTML = `
    <button class="compose-btn" data-act="compose">${ic("edit")} Compose</button>
    <ul>${mail}</ul>
    <h3>Topics</h3><ul>${topics}<li><button class="nav" data-act="more-topics">${ic(showAllTopics ? "expand_less" : "expand_more")}<span class="t">${showAllTopics ? "Less" : `More (${CATS.length - 6})`}</span></button></li></ul>
    <h3>Labels</h3><ul>${labels}</ul>
    ${privLabels ? `<h3>Private email</h3><ul>${privLabels}</ul>` : ""}
    <h3>People</h3><ul>${people}<li><a class="nav${r.view === "people" ? " on" : ""}" href="#people">${ic("group")}<span class="t">Browse all people →</span></a></li></ul><p class="made-by">Founded and made by <a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">Tyler Howell</a></p>`;
}

/* ═════════════ lists ═════════════ */
const PER = 50;
function sortThreads(arr) { const k = ST.sort === "old" ? 1 : -1; return arr.slice().sort((a, b) => k * (a.last - b.last) || a.idx - b.idx); }
function listModel() {
  const r = ROUTE;
  if (r.search != null) {
    const { Q, res } = runSearch(r.search);
    SEARCH_TERMS = Q.terms.filter(w => !w.includes(":"));
    const k = ST.sort === "old" ? 1 : -1;
    const items = res.map(x => x.c ? { c: x.c } : { t: x.t, hit: x.hits[0], hits: x.hits })
      .sort((a, b) => k * ((a.t ? a.t.last : a.c.d) - (b.t ? b.t.last : b.c.d)));
    return { kind: "search", items, base: "#search-" + encodeURIComponent(r.search), sep: "~p" };
  }
  SEARCH_TERMS = [];
  if (r.label) return { kind: "label", items: sortThreads(THREADS.filter(t => t.s === r.label && !ST.trash[t.id])).map(t => ({ t })), base: "#label-" + r.label, sep: "-p" };
  if (r.topic) return { kind: "topic", items: sortThreads(THREADS.filter(t => t.topics.includes(r.topic) && !ST.trash[t.id])).map(t => ({ t })), base: "#topic-" + r.topic, sep: "-p" };
  if (r.folder === "inbox") {
    const want = r.tab === "forums" ? "p" : r.tab === "private" ? "x" : "e";
    return { kind: "inbox", items: sortThreads(THREADS.filter(t => t.k === want && inFolder(t, "inbox"))).map(t => ({ t })), base: r.tab === "primary" ? "#inbox" : "#inbox-" + r.tab, sep: "-p" };
  }
  const items = sortThreads(THREADS.filter(t => inFolder(t, r.folder))).map(t => ({ t }));
  if (r.folder === "starred") {
    COMMITS.filter(c => ST.star[c.id]).forEach(c => items.push({ c }));
    const k = ST.sort === "old" ? 1 : -1;
    items.sort((a, b) => k * ((a.t ? a.t.last : a.c.d) - (b.t ? b.t.last : b.c.d)));
  }
  return { kind: r.folder, items, base: "#" + r.folder, sep: "-p" };
}
const itemId = x => x.t ? x.t.id : x.c.id;
function commitRow(c) {
  const star = !!ST.star[c.id];
  const where = c.r ? `SVN r${c.r}` : "git";
  const snip = `${c.f.length} file${c.f.length === 1 ? "" : "s"}, <span class="plus">+${fmtNum(c.ins || 0)}</span> <span class="minus">−${fmtNum(c.del || 0)}</span>${c.rel ? ` · in ${esc(c.rel)}` : ""}`;
  const q = ROUTE.search ? parseQuery(ROUTE.search).terms.filter(w => !w.includes(":")) : [];
  const subj = q.length ? esc(c.s).replace(new RegExp(q.map(w => escRe(esc(w))).join("|"), "gi"), x => `<mark>${x}</mark>`) : esc(c.s);
  return `<div class="row" data-act="open" data-id="${c.id}" role="link" tabindex="-1">
    <span class="cb"></span>
    <button class="ib sm star${star ? " on" : ""}" data-act="star" data-id="${c.id}" aria-label="${star ? "Starred" : "Not starred"}" aria-pressed="${star}">${ic("star", star ? "fill" : "")}</button>
    ${avatar("Satoshi", "avatar av")}
    <span class="who">me <span class="n">→ ${where}</span></span>
    <span class="line"><span class="lchip cchip">commit</span><span class="subj">${subj}</span><span class="snip"><span class="sep"> - </span>${snip}</span></span>
    <span class="date" title="${esc(fullDate(c.d))}">${listDate(c.d)}</span>
  </div>`;
}
function pageInfo(base, sep, total) {
  const pages = Math.max(1, Math.ceil(total / PER));
  const p = Math.min(Math.max(1, ROUTE.page || 1), pages);
  const from = total ? (p - 1) * PER + 1 : 0, to = Math.min(total, p * PER);
  const href = n => `${base}${n > 1 ? sep + n : ""}`;
  return { p, html: `<span class="count">${fmtNum(from)}–${fmtNum(to)} of ${fmtNum(total)}</span>
    <a class="ib sm${p > 1 ? "" : " off"}" ${p > 1 ? `href="${href(p - 1)}"` : 'aria-disabled="true"'} aria-label="Newer" title="Newer">${ic("chevron_left")}</a>
    <a class="ib sm${p < pages ? "" : " off"}" ${p < pages ? `href="${href(p + 1)}"` : 'aria-disabled="true"'} aria-label="Older" title="Older">${ic("chevron_right")}</a>` };
}
function toolbar(pg, opts = {}) {
  const any = SELECTED.size > 0;
  const allOn = CURRENT_LIST.length > 0 && CURRENT_LIST.every(id => SELECTED.has(id));
  const inTrash = ROUTE.folder === "trash";
  const b = (act, icon, label) => `<button class="ib" data-act="${act}" title="${label}" aria-label="${label}">${ic(icon)}</button>`;
  return `<div class="tb">
    ${opts.commits ? `<span class="title">Commits</span>` : `<span class="selwrap"><input type="checkbox" class="cbx" data-act="selall" aria-label="Select all" ${allOn ? "checked" : ""}><button class="ib sm" data-act="selmenu" aria-label="Select options">${ic("arrow_drop_down")}</button></span>`}
    ${opts.commits ? "" : any ? (inTrash ? b("untrash", "move_to_inbox", "Move to Inbox") : b("archive", "archive", "Archive")) +
        b("markread", "drafts", "Mark as read") + b("markunread", "mark_email_unread", "Mark as unread") + b("starsel", "star", "Add star") +
        (ROUTE.folder !== "inbox" && !inTrash ? b("toinbox", "move_to_inbox", "Move to Inbox") : "")
      : b("refresh", "refresh", "Refresh") + b("markallread", "done_all", "Mark all as read")}
    <span class="grow"></span>
    <button class="sort hide-sm" data-act="sort" title="Change sort order">${ST.sort === "old" ? "Oldest first" : "Newest first"}${ic("swap_vert")}</button>
    ${pg.html}
  </div>`;
}
function rowHtml(t, opts) {
  const { hit, hits, i, sent } = opts;
  const read = sent || isRead(t), star = isStar(t), checked = SELECTED.has(t.id);
  const m = sent ? t.m[i] : null;
  const who = sent ? `To: ${esc(LISTS[t.s].name)}` : senders(t);
  const snip = sent ? esc(firstText(m).slice(0, 180)) : hit != null ? hitSnippet(t, hit, SEARCH_TERMS) : esc(firstText(t.m[t.m.length - 1]).slice(0, 180));
  const date = sent ? m.d : t.last;
  const more = hits && hits.length > 1 ? `<span class="snip"> · ${hits.length} matches</span>` : "";
  const attach = t.hasPdf && !sent ? `<span class="attach">${ic("picture_as_pdf")}bitcoin.pdf</span>` : "";
  const avName = sent ? "Satoshi" : t.people[t.people.length - 1];
  return `<div class="row${read ? "" : " unread"}${checked ? " checked" : ""}" data-act="open" data-id="${t.id}"${sent ? ` data-i="${i}"` : ""} role="link" tabindex="-1">
    <span class="cb"><input type="checkbox" class="cbx" data-act="check" data-id="${t.id}" ${checked ? "checked" : ""} aria-label="Select conversation"></span>
    <button class="ib sm star${star ? " on" : ""}" data-act="star" data-id="${t.id}" aria-label="${star ? "Starred" : "Not starred"}" aria-pressed="${star}">${ic("star", star ? "fill" : "")}</button>
    ${avatar(avName, "avatar av")}
    <span class="who">${who}</span>
    <span class="line">${ROUTE.label ? "" : lchip(t.s)}<span class="subj">${esc(t.t)}</span><span class="snip"><span class="sep"> - </span>${snip}</span>${more}${attach}</span>
    <span class="date" title="${esc(fullDate(date))}">${listDate(date)}</span>
    <span class="hov">
      <button class="ib sm" data-act="archive" data-id="${t.id}" title="Archive" aria-label="Archive">${ic("archive")}</button>
      <button class="ib sm" data-act="${read ? "markunread" : "markread"}" data-id="${t.id}" title="${read ? "Mark as unread" : "Mark as read"}" aria-label="${read ? "Mark as unread" : "Mark as read"}">${ic(read ? "mark_email_unread" : "drafts")}</button>
    </span>
  </div>`;
}
const emptyState = (icon, title, sub) => `<div class="empty">${ic(icon)}<b>${esc(title)}</b>${sub ? `<span>${sub}</span>` : ""}</div>`;
function renderList() {
  const model = listModel();
  const pg = pageInfo(model.base, model.sep, model.items.length);
  const items = model.items.slice((pg.p - 1) * PER, pg.p * PER);
  CURRENT_LIST = items.map(itemId);
  CURSOR = Math.min(CURSOR, Math.max(0, items.length - 1));
  LAST_LIST = location.hash || "#inbox";
  const r = ROUTE;
  let head = "";
  if (model.kind === "inbox") {
    const nE = THREADS.filter(t => t.k === "e" && inFolder(t, "inbox") && !isRead(t)).length;
    const nP = THREADS.filter(t => t.k === "p" && inFolder(t, "inbox") && !isRead(t)).length;
    const nX = THREADS.filter(t => t.k === "x" && inFolder(t, "inbox") && !isRead(t)).length;
    const hasX = THREADS.some(t => t.k === "x");
    head = (ST.bannerClosed || r.page > 1 ? "" : `<div class="banner" role="note">${ic("info")}<p>You are logged in as <b>Satoshi Nakamoto</b>. These are real emails and forum posts, archived by the <a href="https://nakamotoinstitute.org/" target="_blank" rel="noopener">Satoshi Nakamoto Institute</a>.<br><span class="sub">${fmtNum(SENT.length)} messages by Satoshi in ${THREADS.length} conversations, ${shortDate(FIRST_ACTIVE)} – ${shortDate(LAST_ACTIVE)}${COMMITS.length ? `, plus <a href="#commits">${COMMITS.length} code commits</a>` : ""}.${THREADS.some(t => t.k === "x") ? ` Private email from <a href="https://github.com/lugaxker/nakamoto-archive" target="_blank" rel="noopener">nakamoto-archive</a> is under <a href="#inbox-private">Private</a>.` : ""} Who's who and what happened is in <a href="#wiki">Satoshipedia</a>, in the dock below.</span></p><button class="ib sm" data-act="closebanner" aria-label="Dismiss">${ic("close")}</button></div>`) +
      `<div class="tabs" role="tablist">
        <a class="tab${r.tab === "primary" ? " on" : ""}" href="#inbox" role="tab" aria-selected="${r.tab === "primary"}">${ic("inbox", r.tab === "primary" ? "fill" : "")}<span class="tl">Primary<small>Mailing lists</small></span>${nE ? `<span class="pill">${nE} new</span>` : ""}</a>
        <a class="tab${r.tab === "forums" ? " on" : ""}" href="#inbox-forums" role="tab" aria-selected="${r.tab === "forums"}">${ic("forum", r.tab === "forums" ? "fill" : "")}<span class="tl">Forums<small>BitcoinTalk, P2P Foundation</small></span>${nP ? `<span class="pill">${nP} new</span>` : ""}</a>
        ${hasX ? `<a class="tab${r.tab === "private" ? " on" : ""}" href="#inbox-private" role="tab" aria-selected="${r.tab === "private"}">${ic("lock", r.tab === "private" ? "fill" : "")}<span class="tl">Private<small>Hal Finney, Martti Malmi, Mike Hearn…</small></span>${nX ? `<span class="pill">${nX} new</span>` : ""}</a>` : ""}
      </div>`;
  } else if (model.kind === "search") {
    const has = s => new RegExp(`(^|\\s)${escRe(s)}(\\s|$)`, "i").test(r.search);
    const chip = (s, label, icon) => `<button class="fchip${has(s) ? " on" : ""}" data-act="chip" data-v="${esc(s)}" aria-pressed="${has(s)}">${ic(icon)}${esc(label)}</button>`;
    head = askCardHtml(r.search, r.page) + `<div class="chips">${chip("from:me", "From me", "person")}${COMMITS.length ? chip("in:commits", "Commits", "commit") : ""}${chip("label:cryptography", "Cryptography", "label")}${chip("label:bitcointalk", "BitcoinTalk", "label")}${THREADS.some(t => t.k === "x") ? chip("label:private", "Private email", "lock") : ""}${chip("has:code", "Has code", "code")}${chip("has:attachment", "Has attachment", "attachment")}${chip("is:unread", "Is unread", "mark_email_unread")}<button class="fchip" data-act="adv">${ic("tune")}Advanced search</button></div>`;
  } else if (model.kind === "topic") {
    head = `<div class="banner">${ic("sell", "fill")}<p><b>${esc(CAT_NAME[r.topic] || r.topic)}</b><br><span class="sub">Conversations with a message from The Quotable Satoshi on this topic.</span></p></div>`;
  } else if (model.kind === "label" && LISTS[r.label]) {
    head = `<div class="banner">${ic("label", "fill")}<p><b>${esc(LISTS[r.label].long)}</b><br><span class="sub">${esc(LISTS[r.label].addr)}</span></p></div>`;
  }
  let empty = "";
  if (!items.length) {
    empty = model.kind === "search" ? emptyState("search_off", "No messages matched your search", `Try fewer words or check the <button class="linkbtn" data-act="help">search operators</button>.`)
      : r.folder === "trash" ? emptyState("delete", "No conversations in Trash", "")
      : r.folder === "starred" ? emptyState("star", "No starred messages", "Stars give messages a special status to make them easier to find.")
      : emptyState("inbox", "Your inbox is empty", `Archived conversations are in <a href="#all">All Mail</a>.`);
  }
  $("#main").innerHTML = toolbar(pg) + `<div class="scroll" id="scroller">${head}<div class="list">${items.map(x => x.c ? commitRow(x.c) : rowHtml(x.t, x)).join("")}</div>${empty}</div>`;
  markCursor();
  if (model.kind === "search") askMount(r.search);
}
function renderSent() {
  const k = ST.sort === "old" ? 1 : -1;
  const all = SENT.filter(x => !ST.trash[x.t.id]).sort((a, b) => k * (a.m.d - b.m.d));
  const pg = pageInfo("#sent", "-p", all.length);
  const items = all.slice((pg.p - 1) * PER, pg.p * PER);
  CURRENT_LIST = items.map(x => x.t.id);
  LAST_LIST = location.hash || "#sent";
  SEARCH_TERMS = [];
  $("#main").innerHTML = toolbar(pg) + `<div class="scroll" id="scroller"><div class="list">${items.map(x => rowHtml(x.t, { i: x.i, sent: true })).join("")}</div></div>`;
  markCursor();
}
function renderCommitList() {
  const k = ST.sort === "old" ? 1 : -1;
  const all = COMMITS.slice().sort((a, b) => k * (a.d - b.d));
  const pg = pageInfo("#commits", "-p", all.length);
  const items = all.slice((pg.p - 1) * PER, pg.p * PER);
  CURRENT_LIST = items.map(c => c.id);
  CURSOR = Math.min(CURSOR, Math.max(0, items.length - 1));
  LAST_LIST = location.hash || "#commits";
  SEARCH_TERMS = [];
  const ins = COMMITS.reduce((a, c) => a + (c.ins || 0), 0), del = COMMITS.reduce((a, c) => a + (c.del || 0), 0);
  const svn = COMMITS.filter(c => c.r).length;
  const head = `<div class="banner">${ic("commit")}<p><b>Satoshi's commits to Bitcoin</b><br><span class="sub">${COMMITS.length} commits, ${shortDate(COMMITS[0].d)} – ${shortDate(COMMITS[COMMITS.length - 1].d)}: ${svn} on SourceForge SVN, ${COMMITS.length - svn} in git. <span class="plus">+${fmtNum(ins)}</span> <span class="minus">−${fmtNum(del)}</span> lines, counting whole files added in early imports. From <a href="https://github.com/bitcoin/bitcoin" target="_blank" rel="noopener">github.com/bitcoin/bitcoin</a>${META.coreCommit ? ` (${esc(META.coreDate)})` : ""}.</span></p></div>`;
  $("#main").innerHTML = toolbar(pg, { commits: true }) + `<div class="scroll" id="scroller">${head}<div class="list">${items.map(commitRow).join("")}</div></div>`;
  markCursor();
}
function diffHtml(text, terms) {
  const re = terms && terms.length ? new RegExp(terms.map(w => escRe(esc(w))).join("|"), "gi") : null;
  return text.split("\n").map(line => {
    const cls = line.startsWith("@@") ? "h" : line.startsWith("+") ? "a" : line.startsWith("-") ? "d" : "";
    let h = esc(line) || " ";
    if (re && cls !== "h") h = h.replace(re, x => `<mark>${x}</mark>`);
    return `<span${cls ? ` class="${cls}"` : ""}>${h}</span>`;
  }).join("");
}
function bar5(a, d) {
  const tot = (a || 0) + (d || 0);
  if (!tot) return "";
  const na = Math.round(5 * (a || 0) / tot), nd = Math.min(5 - na, Math.round(5 * (d || 0) / tot));
  return `<span class="bar5" aria-hidden="true">${"<i class=\"a\"></i>".repeat(na)}${"<i class=\"d\"></i>".repeat(nd)}${"<i></i>".repeat(5 - na - nd)}</span>`;
}
function renderCommit() {
  const c = BY_COMMIT.get(ROUTE.id);
  if (!c) { $("#main").innerHTML = emptyState("error", "This commit isn't in the archive", `<a href="#commits">Back to Commits</a>`); return; }
  const terms = HIT && HIT.id === c.id ? HIT.terms || [] : [];
  const pos = CURRENT_LIST.indexOf(c.id);
  const star = !!ST.star[c.id];
  const gh = `https://github.com/bitcoin/bitcoin`;
  const nav = pos >= 0 ? `<span class="count">${pos + 1} of ${CURRENT_LIST.length}</span>
      <a class="ib sm${pos > 0 ? "" : " off"}" ${pos > 0 ? `href="#t-${CURRENT_LIST[pos - 1]}"` : ""} aria-label="Newer" title="Newer">${ic("chevron_left")}</a>
      <a class="ib sm${pos < CURRENT_LIST.length - 1 ? "" : " off"}" ${pos < CURRENT_LIST.length - 1 ? `href="#t-${CURRENT_LIST[pos + 1]}"` : ""} aria-label="Older" title="Older">${ic("chevron_right")}</a>` : "";
  const embedded = c.f.reduce((a, f) => a + (f[3] ? f[3].split("\n").length : 0), 0);
  const viaGavin = c.cn && !/nakamoto/i.test(c.cn) && c.cn !== "s_nakamoto";
  const where = c.r ? `SourceForge SVN trunk, revision ${c.r}` : "bitcoin/bitcoin on GitHub";
  $("#main").innerHTML = `<div class="tb">
      <a class="ib" href="${esc(LAST_LIST)}" aria-label="Back to list" title="Back">${ic("arrow_back")}</a>
      <a class="ib" href="${esc(c.u)}" target="_blank" rel="noopener" title="Open on GitHub" aria-label="Open on GitHub">${ic("open_in_new")}</a>
      <span class="grow"></span>${nav}</div>
    <div class="scroll" id="scroller"><div class="conv">
      <div class="conv-h"><h1>${esc(c.s)}<span class="lchip cchip">commit</span>${c.r ? `<span class="lchip cchip">SVN r${c.r}</span>` : ""}${c.rel ? `<a class="lchip" href="${gh}/releases/tag/${esc(c.rel)}" target="_blank" rel="noopener" style="color:var(--accent);background:color-mix(in srgb, var(--accent) 14%, transparent)">${esc(c.rel)}</a>` : ""}</h1>
        <button class="ib star${star ? " on" : ""}" data-act="star" data-id="${c.id}" aria-label="${star ? "Starred" : "Not starred"}" aria-pressed="${star}">${ic("star", star ? "fill" : "")}</button></div>
      <div id="msgs"><div class="msg open" id="m0">
        <div class="mh" data-act="toggle-msg" role="button" tabindex="0" aria-expanded="true">
          ${avatar("Satoshi")}
          <div class="nm"><div><b>Satoshi Nakamoto</b><span class="tag">Satoshi</span><span class="addr">committed ${esc(c.sha.slice(0, 7))}</span></div>
            <div class="to"><span>to ${esc(where)}${viaGavin ? `, committed by ${esc(c.cn)}` : ""}</span><button type="button" data-act="details" aria-label="Show details" title="Show details">${ic("arrow_drop_down")}</button></div>
            <div class="sn">${esc(c.f.length + " files changed")}</div></div>
          <div class="right"><span title="${esc(fullDate(c.d))}">${esc(msgDate(c.d))}<span class="ago"> (${ago(c.d)})</span></span>
            <a class="ib sm" href="${esc(c.u)}" target="_blank" rel="noopener" aria-label="Open on GitHub" title="Open on GitHub">${ic("open_in_new")}</a></div>
        </div>
        <div class="details"><dl>
          <dt>commit:</dt><dd>${esc(c.sha)}</dd>
          ${c.r ? `<dt>svn:</dt><dd>trunk r${c.r}</dd>` : ""}
          <dt>author:</dt><dd>${esc(c.who)}</dd>
          ${c.cn ? `<dt>committer:</dt><dd>${esc(c.cn)}</dd>` : ""}
          <dt>date:</dt><dd>${esc(fullDate(c.d))}</dd>
          ${c.rel ? `<dt>first release:</dt><dd>${esc(c.rel)}</dd>` : ""}
          <dt>github:</dt><dd><a href="${esc(c.u)}" target="_blank" rel="noopener">${esc(c.u.replace(/^https:\/\//, ""))}</a></dd>
        </dl></div>
        <div class="mbw"><div class="mb" id="cbody"></div></div>
      </div></div>
      <div class="replybar"><a class="pillbtn" href="${esc(c.u)}" target="_blank" rel="noopener">${ic("open_in_new")}View on GitHub</a><a class="pillbtn" href="${gh}/tree/${esc(c.sha)}" target="_blank" rel="noopener">${ic("folder_open")}Browse files at this commit</a><a class="pillbtn" href="#search-${encodeURIComponent(`from:me after:${ymd(c.d - 3 * 86400)} before:${ymd(c.d + 4 * 86400)}`)}">${ic("forum")}What he wrote that week</a></div>
    </div></div>`;
  const body = $("#cbody");
  const parts = [];
  if (c.who && c.who.startsWith("--author=")) parts.push(`<div class="note qtd">${ic("info", "fill")}<div>This commit's author field reads “${esc(c.who)}”: ${esc(c.cn || "the committer")} ran <code>git commit --author</code> with a typo while committing Satoshi's patch.</div></div>`);
  parts.push(`<div class="seg-t"><b>${esc(c.s)}</b></div>`);
  parts.push(`<table class="fsum"><tbody>${c.f.map((f, i) => `<tr><td><a href="#df${i}" data-act="jumpfile" data-i="${i}">${esc(f[0])}</a></td><td>${f[5] ? "binary" : `<span class="plus">+${fmtNum(f[1] || 0)}</span> <span class="minus">−${fmtNum(f[2] || 0)}</span>`}${bar5(f[1], f[2])}</td></tr>`).join("")}
    <tr><td><b>${c.f.length} file${c.f.length === 1 ? "" : "s"} changed</b></td><td><span class="plus">+${fmtNum(c.ins || 0)}</span> <span class="minus">−${fmtNum(c.del || 0)}</span></td></tr></tbody></table>`);
  c.f.forEach((f, i) => {
    const lines = f[3] ? f[3].split("\n").length : 0;
    const hasTerm = terms.length && terms.some(w => (f[0] + "\n" + f[3]).toLowerCase().includes(w));
    const open = hasTerm || (embedded <= 600 ? true : (i < 4 && lines <= 150));
    const more = f[4] > 0 ? `<div class="more">${fmtNum(f[4])} more diff line${f[4] === 1 ? "" : "s"} not shown. <a href="${esc(c.u)}" target="_blank" rel="noopener">See the full diff on GitHub</a></div>` : "";
    parts.push(`<div class="df${open ? "" : " closed"}" id="df${i}">
      <button class="dfh" type="button" data-act="dftoggle" aria-expanded="${open}">${ic("expand_more")}<span class="p">${esc(f[0])}</span><span class="st">${f[5] ? "binary" : `<span class="plus">+${fmtNum(f[1] || 0)}</span> <span class="minus">−${fmtNum(f[2] || 0)}</span>`}</span></button>
      ${f[5] ? "" : `<pre class="diff">${diffHtml(f[3], terms)}</pre>`}${more}</div>`);
  });
  body.innerHTML = parts.join("");
  if (terms.length) requestAnimationFrame(() => { const m = $("#cbody mark"); if (m && m.scrollIntoView) m.scrollIntoView({ block: "center" }); });
}
const ymd = sec => { const d = dt(sec); return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}`; };
function markCursor() { document.querySelectorAll("#main .row").forEach((r, i) => r.classList.toggle("cursor", i === CURSOR)); }

function renderDrafts() {
  CURRENT_LIST = [];
  const rows = ST.drafts.slice().sort((a, b) => b.saved - a.saved).map(d => `<div class="row unread" data-act="open-draft" data-id="${esc(d.id)}" role="button" tabindex="0">
      <span class="cb"></span><span></span>${avatar("Satoshi", "avatar av")}
      <span class="who"><span class="dr">Draft</span>${d.to ? " · " + esc(d.to) : ""}</span>
      <span class="line"><span class="subj">${esc(d.subject || "(no subject)")}</span><span class="snip"><span class="sep"> - </span>${esc((d.body || "").replace(/\s+/g, " ").slice(0, 140))}</span></span>
      <span class="date">${esc(localClock(d.saved))}</span></div>`).join("");
  $("#main").innerHTML = `<div class="tb"><span class="title">Drafts</span><span class="grow"></span></div><div class="scroll">${rows ? `<div class="list">${rows}</div>` : emptyState("draft", "You don't have any saved drafts", "Saving a draft keeps a message you aren't ready to finish. Drafts stay in this browser; this archive doesn't send mail.")}</div>`;
}

/* ═════════════ conversation ═════════════ */
function renderThread() {
  const t = BY_ID.get(ROUTE.id);
  if (!t) { $("#main").innerHTML = emptyState("error", "This conversation doesn't exist", `<a href="#inbox">Back to Inbox</a>`); return; }
  if (!isRead(t)) { ST.read[t.id] = 1; save(); renderRail(); }
  const terms = HIT && HIT.id === t.id ? HIT.terms || [] : [];
  const hitSet = new Set(HIT && HIT.id === t.id ? HIT.hits : []);
  const pos = CURRENT_LIST.indexOf(t.id);
  const star = isStar(t);
  const b = (act, icon, label) => `<button class="ib" data-act="${act}" data-id="${t.id}" title="${label}" aria-label="${label}">${ic(icon)}</button>`;
  const nav = pos >= 0 ? `<span class="count">${pos + 1} of ${CURRENT_LIST.length}</span>
      <a class="ib sm${pos > 0 ? "" : " off"}" ${pos > 0 ? `href="#t-${CURRENT_LIST[pos - 1]}"` : ""} aria-label="Newer" title="Newer">${ic("chevron_left")}</a>
      <a class="ib sm${pos < CURRENT_LIST.length - 1 ? "" : " off"}" ${pos < CURRENT_LIST.length - 1 ? `href="#t-${CURRENT_LIST[pos + 1]}"` : ""} aria-label="Older" title="Older">${ic("chevron_right")}</a>` : "";
  $("#main").innerHTML = `<div class="tb">
      <a class="ib" href="${esc(LAST_LIST)}" aria-label="Back to list" title="Back">${ic("arrow_back")}</a>
      ${ST.trash[t.id] ? b("untrash", "move_to_inbox", "Move to Inbox") : (ST.arch[t.id] ? b("toinbox", "move_to_inbox", "Move to Inbox") : b("archive", "archive", "Archive"))}
      ${b("markunread", "mark_email_unread", "Mark as unread")}
      <a class="ib" href="${esc(t.su)}" target="_blank" rel="noopener" title="${t.k === "x" ? "Open in nakamoto-archive" : "Open on the Satoshi Nakamoto Institute"}" aria-label="${t.k === "x" ? "Open in nakamoto-archive" : "Open on the Satoshi Nakamoto Institute"}">${ic("open_in_new")}</a>
      <span class="grow"></span>${nav}</div>
    <div class="scroll" id="scroller"><div class="conv">
      <div class="conv-h"><h1>${esc(t.t)}${lchip(t.s)}${t.topics.slice(0, 3).map(c => `<a class="lchip" href="#topic-${c}" style="color:var(--ink-2);background:var(--hover)">${esc(CAT_NAME[c] || c)}</a>`).join("")}</h1>
        <button class="ib star${star ? " on" : ""}" data-act="star" data-id="${t.id}" aria-label="${star ? "Starred" : "Not starred"}" aria-pressed="${star}">${ic("star", star ? "fill" : "")}</button>
        <button class="ib hide-sm" data-act="expand-all" title="Expand all" aria-label="Expand all">${ic("unfold_more")}</button></div>
      ${wikiChipsFor(t)}<div id="msgs"></div>
      <div class="replybar"><button class="pillbtn" data-act="reply" data-id="${t.id}">${ic("reply")}Reply</button><button class="pillbtn" data-act="forward" data-id="${t.id}">${ic("forward")}Forward</button></div>
    </div></div>`;
  // Satoshi's messages, the last message and search hits start open; short threads open fully.
  const auto = t.m.length <= 3;
  const open = t.m.map((m, i) => auto || i === t.m.length - 1 || !!m.s || hitSet.has(i));
  const box = $("#msgs");
  let firstHit = -1;
  for (let i = 0; i < t.m.length;) {
    if (!open[i]) {
      let j = i; while (j < t.m.length && !open[j]) j++;
      if (j - i >= 3 && i > 0) {
        const st = document.createElement("div");
        st.className = "stack"; st.dataset.act = "unstack"; st.dataset.from = i; st.dataset.to = j;
        st.setAttribute("role", "button"); st.tabIndex = 0; st.setAttribute("aria-label", `Show ${j - i} more messages`);
        st.innerHTML = `<span class="num">${j - i}</span>`;
        box.append(st);
      } else for (let k = i; k < j; k++) box.append(renderMsg(t, k, false, []));
      i = j; continue;
    }
    if (hitSet.has(i) && firstHit < 0) firstHit = i;
    box.append(renderMsg(t, i, true, hitSet.has(i) ? terms : []));
    i++;
  }
  MCURSOR = firstHit;
  if (firstHit >= 0) requestAnimationFrame(() => { const el = $("#m" + firstHit); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); });
}
function renderMsg(t, i, open, terms) {
  const m = t.m[i], L = LISTS[t.s];
  const el = document.createElement("div");
  el.className = "msg" + (open ? " open" : "");
  el.id = "m" + i; el.dataset.i = i;
  el.innerHTML = `
    <div class="mh" data-act="toggle-msg" role="button" tabindex="0" aria-expanded="${open}">
      ${avatar(m.f)}
      <div class="nm"><div><b>${esc(m.f)}</b>${m.s ? `<span class="tag">Satoshi</span>` : ""}<span class="addr">${esc(t.k === "x" ? (m.fe ? "<" + m.fe + ">" : "private email") : t.k === "e" ? "via " + L.name : "on " + L.name)}</span></div>
        <div class="to"><span>to ${esc(t.k === "x" ? (m.to || (m.s ? L.name : "Satoshi")) : t.k === "e" ? L.addr : L.name)}</span><button type="button" data-act="details" aria-label="Show details" title="Show details">${ic("arrow_drop_down")}</button></div>
        <div class="sn">${esc(firstText(m).slice(0, 160))}</div></div>
      <div class="right"><span title="${esc(fullDateOf(m))}">${esc(msgDateOf(m))}${approx(m) ? "*" : ""}<span class="ago"> (${ago(m.d)})</span></span>
        <button class="ib sm" data-act="reply" data-id="${t.id}" data-i="${i}" aria-label="Reply" title="Reply">${ic("reply")}</button>
        ${m.su ? `<a class="ib sm" href="${esc(m.su)}" target="_blank" rel="noopener" aria-label="${t.k === "x" ? "Open this email in nakamoto-archive" : "Open this message on SNI"}" title="${t.k === "x" ? "Open in nakamoto-archive" : "Open on SNI"}">${ic("open_in_new")}</a>` : ""}</div>
    </div>
    <div class="details"><dl>
      <dt>from:</dt><dd>${esc(m.f)}</dd>
      <dt>to:</dt><dd>${esc(t.k === "x" ? (m.to || "—") : L.addr)}</dd>
      <dt>date:</dt><dd>${esc(fullDateOf(m))}${m.od ? `<br>sent as “${esc(m.od)}”` : ""}</dd>
      <dt>subject:</dt><dd>${esc(m.sj || t.t)}</dd>
      <dt>${t.k === "x" ? "source:" : t.k === "e" ? "mailing list:" : "forum:"}</dt><dd>${esc(t.k === "x" ? L.long + " · nakamoto-archive" : L.long)}</dd>
      ${m.sm ? `<dt>topics:</dt><dd>${esc(m.sm)}</dd>` : ""}
      ${m.su ? `<dt>${t.k === "x" ? "in archive:" : "on SNI:"}</dt><dd><a href="${esc(m.su)}" target="_blank" rel="noopener">${esc(m.su.replace(/^https:\/\//, ""))}</a></dd>` : ""}
      ${m.u ? `<dt>original:</dt><dd><a href="${esc(m.u)}" target="_blank" rel="noopener">${esc(m.u.replace(/^https?:\/\//, ""))}</a></dd>` : ""}
    </dl></div>
    <div class="mbw"><div class="mb"></div></div>`;
  const body = el.querySelector(".mb");
  const note = (cls, icon, text, href, linkText) => {
    const n = document.createElement("div"); n.className = "note " + cls; n.innerHTML = ic(icon, "fill");
    const p = document.createElement("div"); p.textContent = text;
    if (href) { const a = document.createElement("a"); a.href = href; a.target = "_blank"; a.rel = "noopener"; a.textContent = linkText; p.append(" ", a); }
    n.append(p); body.append(n);
  };
  if (m.w) note("warn", "warning", m.w, m.wu, "Read more");
  if (m.qt) note("qtd", "format_quote", `Quoted in The Quotable Satoshi: “${m.qt[0]}”${m.qt.length > 1 ? ` (+${m.qt.length - 1} more)` : ""}`);
  for (const [k, text, head] of m.b) {
    if (k === "t") { const d = document.createElement("div"); d.className = "seg-t"; appendText(d, text, terms); body.append(d); }
    else if (k === "c") { const pre = document.createElement("pre"); pre.className = "seg-c"; pre.textContent = text; body.append(pre); }
    else {
      const wrap = document.createElement("div"); wrap.className = k === "f" ? "seg-f" : "seg-q";
      const lines = text.split("\n").length;
      const hide = k === "f" || (t.k === "e" ? lines > 3 : lines > 8);
      if (head && k === "q") { const h = document.createElement("div"); h.className = "qh"; h.textContent = head; wrap.append(h); }
      const qb = document.createElement("div"); qb.className = "qb"; appendText(qb, text, terms);
      if (hide) {
        qb.hidden = true;
        const btn = document.createElement("button");
        btn.className = "trim"; btn.type = "button"; btn.dataset.act = "trim";
        btn.setAttribute("aria-label", "Show trimmed content"); btn.title = "Show trimmed content";
        btn.innerHTML = ic("more_horiz");
        wrap.append(btn);
      }
      wrap.append(qb); body.append(wrap);
    }
  }
  return el;
}

/* ═════════════ people, activity, about ═════════════ */
function renderPeople() {
  CURRENT_LIST = [];
  $("#main").innerHTML = `<div class="scroll"><div class="page"><h2>People</h2>
    <p class="lead">${fmtNum(PEOPLE.length)} people wrote in conversations with Satoshi, ranked by how many conversations they shared with him. Select someone to see their messages.</p>
    <label class="filter">${ic("search")}<input id="pfilter" placeholder="Filter people" aria-label="Filter people"></label>
    <div class="people" id="plist"></div></div></div>`;
  const draw = q => {
    const ql = q.trim().toLowerCase();
    const list = PEOPLE.filter(p => !ql || p.name.toLowerCase().includes(ql)).slice(0, 500);
    $("#plist").innerHTML = list.map(p => {
      const y1 = dt(p.first).getUTCFullYear(), y2 = dt(p.last).getUTCFullYear();
      return `<button class="person" data-act="person" data-name="${esc(p.name)}">${avatar(p.name)}<span style="min-width:0"><b>${esc(p.name)}</b><small>${p.nthreads} conversation${p.nthreads > 1 ? "s" : ""} · ${p.msgs} message${p.msgs > 1 ? "s" : ""} · ${y1}${y2 !== y1 ? "–" + y2 : ""}</small></span></button>`;
    }).join("") || emptyState("person_off", "No one by that name", "");
  };
  draw("");
  $("#pfilter").addEventListener("input", e => draw(e.target.value));
}
function renderActivity() {
  CURRENT_LIST = [];
  const counts = new Map();
  const ccounts = new Map();
  for (const x of SENT) { const k = dt(x.m.d).toISOString().slice(0, 10); counts.set(k, (counts.get(k) || 0) + 1); }
  for (const c of COMMITS) { const k = dt(c.d).toISOString().slice(0, 10); counts.set(k, (counts.get(k) || 0) + 1); ccounts.set(k, (ccounts.get(k) || 0) + 1); }
  const years = [...new Set([...counts.keys()].map(k => +k.slice(0, 4)))].sort();
  const lvl = n => n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4;
  const keys = [...counts.keys()].sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) { const ts = Date.parse(k); run = prev != null && ts - prev === 864e5 ? run + 1 : 1; best = Math.max(best, run); prev = ts; }
  const busiest = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const C = 11, G = 2, top = 16, left = 28;
  const svgYear = y => {
    const start = Date.UTC(y, 0, 1), dow0 = new Date(start).getUTCDay();
    const ndays = (Date.UTC(y + 1, 0, 1) - start) / 864e5;
    const weeks = Math.ceil((ndays + dow0) / 7);
    const W = left + weeks * (C + G), H = top + 7 * (C + G);
    let cells = "", months = "", total = 0;
    for (let d = 0; d < ndays; d++) {
      const date = new Date(start + d * 864e5), key = date.toISOString().slice(0, 10);
      const n = counts.get(key) || 0, nc = ccounts.get(key) || 0; total += n;
      const col = Math.floor((d + dow0) / 7), row = (d + dow0) % 7;
      cells += `<rect x="${left + col * (C + G)}" y="${top + row * (C + G)}" width="${C}" height="${C}" rx="2" fill="var(--heat-${lvl(n)})" data-act="day" data-day="${key}"><title>${n - nc} message${n - nc === 1 ? "" : "s"}${nc ? ` and ${nc} commit${nc === 1 ? "" : "s"}` : ""} on ${MON[date.getUTCMonth()]} ${date.getUTCDate()}, ${y}</title></rect>`;
      if (date.getUTCDate() === 1 && col * (C + G) + 30 < W) months += `<text x="${left + col * (C + G)}" y="10" font-size="10" fill="var(--ink-3)">${MON[date.getUTCMonth()]}</text>`;
    }
    const daysLbl = ["Mon", "Wed", "Fri"].map((t, i) => `<text x="0" y="${top + (2 * i + 1) * (C + G) + 9}" font-size="10" fill="var(--ink-3)">${t}</text>`).join("");
    const yc = COMMITS.filter(c => dt(c.d).getUTCFullYear() === y).length;
    return `<div class="heat"><h4>${y} · ${fmtNum(total - yc)} message${total - yc === 1 ? "" : "s"}${yc ? `, ${fmtNum(yc)} commit${yc === 1 ? "" : "s"}` : ""}</h4><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Satoshi's messages per day in ${y}">${months}${daysLbl}${cells}</svg></div>`;
  };
  const bd = busiest ? new Date(busiest[0] + "T00:00:00Z") : null;
  $("#main").innerHTML = `<div class="scroll"><div class="page"><h2>Daily Activity</h2>
    <p class="lead">Every email, forum post${COMMITS.length ? " and code commit" : ""} Satoshi wrote, by day (UTC). Select a day to read what he wrote that day.</p>
    <div class="stats">
      <div class="stat"><b>${fmtNum(SENT.length)}</b><small>messages sent</small></div>
      ${COMMITS.length ? `<div class="stat"><b>${fmtNum(COMMITS.length)}</b><small>code commits</small></div>` : ""}
      <div class="stat"><b>${fmtNum(counts.size)}</b><small>active days</small></div>
      <div class="stat"><b>${busiest ? busiest[1] : 0}</b><small>busiest day${bd ? `, ${MON[bd.getUTCMonth()]} ${bd.getUTCDate()}, ${bd.getUTCFullYear()}` : ""}</small></div>
      <div class="stat"><b>${best}</b><small>longest daily streak</small></div>
    </div>
    ${years.map(svgYear).join("")}
    <div class="legend">Less ${[0, 1, 2, 3, 4].map(l => `<i style="background:var(--heat-${l})"></i>`).join("")} More</div>
  </div></div>`;
}
function renderAbout() {
  CURRENT_LIST = [];
  $("#main").innerHTML = `<div class="scroll"><div class="page"><h2>About Satoshi Mail<span class="beta-pill static">Beta</span></h2>
    <p class="lead made-by-lead">Founded and made by <a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">Tyler Howell</a> (<a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">@TylerHowell88</a>). Satoshi Mail is open source under the MIT license: <a href="https://github.com/itstylerhowell/satoshiMail" target="_blank" rel="noopener">source code on GitHub</a>.</p>
    <p class="lead"><b>Satoshi Mail is in beta.</b> It is still in development, so features may change, move or not work yet. <button class="linkbtn" data-act="beta">What this means</button></p>
    <p class="lead">A mail-style reader for every mailing-list and forum thread Satoshi Nakamoto took part in, as collected by the <a href="https://nakamotoinstitute.org/" target="_blank" rel="noopener">Satoshi Nakamoto Institute</a>. Other participants' messages are kept so each conversation reads in full.</p>
    <p class="lead">Inbox → Primary holds the mailing lists (Cryptography, bitcoin-list, p2p-research); Forums holds BitcoinTalk and P2P Foundation. The Private tab holds his private correspondence with Hal Finney, Martti Malmi, Mike Hearn, Dustin Trammell, Adam Back, Wei Dai and others, from <a href="https://github.com/lugaxker/nakamoto-archive" target="_blank" rel="noopener">nakamoto-archive</a>, grouped into conversations by correspondent and subject; dates marked * are approximate: the source gives only the day, or none, in which case the message is shown at the date of the message it follows (≈). Sent lists every message Satoshi wrote, and Commits holds his 203 commits to Bitcoin's source code from github.com/bitcoin/bitcoin, each with its diff. Topics come from The Quotable Satoshi. Conversations where someone else had the last word start out unread.</p>
    <p class="lead">Every message here was cross-checked on 20 October 2026 against <a href="https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive" target="_blank" rel="noopener">Blocktrainer's Satoshi Nakamoto archive</a> (4,236 entries, with German translations): all of its entries are also here. Where it gives a different date, that is noted on the <a href="#sources">Sources</a> page.</p>
    <p class="lead">It was also checked against <a href="https://satoshin.name/" target="_blank" rel="noopener">satoshin.name</a>, the Satoshi Nakamoto Archive (567 of Satoshi's BitcoinTalk posts and mailing-list emails): every one is here too. All sources are listed under Settings → Archive → <a href="#sources">Sources</a>.</p>
    <p class="lead">One 2014 P2P Foundation post carries the Institute's note about its uncertain authenticity and is shown with that note. Times are in UTC.</p>
    <p class="lead">Stars, read state, archive and settings are stored only in this browser. Compose is just for fun: no emails or drafts are ever written, sent or saved. Data: Satoshi Nakamoto Institute${META.commit ? `, source ${esc(META.commit)} (${esc(META.commitDate)})` : ""}; nakamoto-archive; Bitcoin Core; bitcoin.org; cross-checked with Blocktrainer and satoshin.name. An independent reader, not affiliated with any email provider.</p>
  </div></div>`;
}

/* ═════════════ popovers & dialogs ═════════════ */
function closeLayer() { $("#layer").innerHTML = ""; }
function popover(anchor, html, align = "right") {
  closeLayer();
  const r = anchor.getBoundingClientRect();
  const scrim = document.createElement("div");
  scrim.style.cssText = "position:fixed;inset:0;z-index:69";
  scrim.dataset.act = "closelayer";
  const el = document.createElement("div");
  el.className = "pop"; el.innerHTML = html;
  $("#layer").append(scrim, el);
  const w = el.offsetWidth;
  const x = Math.max(8, Math.min(align === "right" ? r.right - w : r.left, window.innerWidth - w - 8));
  el.style.left = x + "px";
  el.style.top = Math.max(8, Math.min(r.bottom + 6, window.innerHeight - el.offsetHeight - 8)) + "px";
  const f = el.querySelector("input, select, button, a"); if (f) f.focus();
  return el;
}
function dialog(html) {
  closeLayer();
  $("#layer").innerHTML = `<div class="scrim" data-act="closelayer"></div><div class="dialog" role="dialog" aria-modal="true">${html}</div>`;
  const b = $("#layer .dialog button"); if (b) b.focus();
}
const HELP = `<h2><span>Keyboard shortcuts</span><button class="ib" data-act="closelayer" aria-label="Close">${ic("close")}</button></h2>
  <table>
    <tr><td><kbd>⌘K</kbd> <kbd>/</kbd></td><td>Search mail</td></tr>
    <tr><td><kbd>j</kbd> <kbd>k</kbd></td><td>Older / newer conversation</td></tr>
    <tr><td><kbd>o</kbd> <kbd>Enter</kbd></td><td>Open conversation</td></tr>
    <tr><td><kbd>n</kbd> <kbd>p</kbd></td><td>Next / previous message in a conversation</td></tr>
    <tr><td><kbd>u</kbd></td><td>Back to the list</td></tr>
    <tr><td><kbd>x</kbd> <kbd>s</kbd></td><td>Select / star</td></tr>
    <tr><td><kbd>e</kbd></td><td>Archive</td></tr>
    <tr><td><kbd>Shift</kbd>+<kbd>i</kbd> <kbd>Shift</kbd>+<kbd>u</kbd></td><td>Mark as read / unread</td></tr>
    <tr><td><kbd>c</kbd></td><td>Compose (try it)</td></tr>
    <tr><td><kbd>g</kbd> then <kbd>i</kbd> <kbd>s</kbd> <kbd>t</kbd> <kbd>c</kbd> <kbd>a</kbd> <kbd>w</kbd></td><td>Inbox, Starred, Sent, Commits, All Mail, Satoshipedia</td></tr>
    <tr><td><kbd>?</kbd></td><td>This list</td></tr>
  </table>
  <h2 style="margin-top:20px"><span>Search operators</span></h2>
  <table>
    <tr><td><kbd>from:me</kbd> <kbd>from:hal</kbd></td><td>Sender (me is Satoshi)</td></tr>
    <tr><td><kbd>to:cryptography</kbd> <kbd>label:bitcointalk</kbd> <kbd>label:private</kbd> <kbd>label:hal-finney</kbd></td><td>Mailing list, forum or correspondent</td></tr>
    <tr><td><kbd>topic:mining</kbd></td><td>Quotable Satoshi topic</td></tr>
    <tr><td><kbd>subject:mac</kbd></td><td>Words in the subject</td></tr>
    <tr><td><kbd>in:sent</kbd> <kbd>in:commits</kbd> <kbd>is:starred</kbd> <kbd>is:unread</kbd></td><td>Folder and state</td></tr>
    <tr><td><kbd>after:2010/07/01</kbd> <kbd>before:2010/09/01</kbd></td><td>Date, UTC</td></tr>
    <tr><td><kbd>has:code</kbd> <kbd>has:quote</kbd> <kbd>has:attachment</kbd></td><td>Content</td></tr>
    <tr><td><kbd>"proof-of-work"</kbd> <kbd>-mac</kbd></td><td>Exact phrase, exclude a word</td></tr>
  </table>`;
function openAdv() {
  const el = popover($("#searchform"), `<form class="adv" id="advform">
    <label>From <input id="a-from" placeholder="me, hal, gavin"></label>
    <label>To <select id="a-to"><option value="">Any list or forum</option>${Object.entries(LISTS).map(([k, L]) => `<option value="${k}">${esc(L.name)}</option>`).join("")}</select></label>
    <label>Subject <input id="a-subj"></label>
    <label>Has the words <input id="a-has"></label>
    <label>Doesn't have <input id="a-not"></label>
    <label>Topic <select id="a-topic"><option value="">Any topic</option>${CATS.map(c => `<option value="${c.slug}">${esc(c.name)}</option>`).join("")}</select></label>
    <label>After <input id="a-after" type="date" min="2008-10-01" max="2014-12-31"></label>
    <label>Before <input id="a-before" type="date" min="2008-10-01" max="2014-12-31"></label>
    <div class="acts"><button type="button" class="pillbtn flat" data-act="closelayer">Cancel</button><button type="submit" class="pillbtn primary">Search</button></div>
  </form>`, "left");
  el.querySelector("#advform").addEventListener("submit", e => {
    e.preventDefault();
    const v = id => el.querySelector(id).value.trim();
    const qv = s => /\s/.test(s) ? `"${s}"` : s;
    const parts = [v("#a-from") && `from:${qv(v("#a-from"))}`, v("#a-to") && `label:${v("#a-to")}`, v("#a-subj") && `subject:${qv(v("#a-subj"))}`,
      v("#a-has"), ...v("#a-not").split(/\s+/).filter(Boolean).map(w => "-" + w), v("#a-topic") && `topic:${v("#a-topic")}`,
      v("#a-after") && `after:${v("#a-after").replace(/-/g, "/")}`, v("#a-before") && `before:${v("#a-before").replace(/-/g, "/")}`].filter(Boolean);
    closeLayer();
    if (parts.length) { $("#q").value = parts.join(" "); doSearch(); }
  });
}

/* ═════════════ compose window ═════════════ */
let COMPOSE = null, autosave = null;
function openCompose(draft) {
  return composeJoke(draft);   // read-only archive: show a joke instead of a compose window
  const d = draft || { id: "", to: "", subject: "", body: "" };
  let el = $("#compose");
  if (!el) { el = document.createElement("form"); el.id = "compose"; el.className = "compose"; el.setAttribute("aria-label", "New message"); document.body.append(el); }
  el.classList.remove("min");
  el.dataset.id = d.id || "";
  el.innerHTML = `<div class="ch" data-act="minimize"><span id="c-title">${esc(d.subject || "New Message")}</span>
      <button class="ib sm" type="button" data-act="minimize" aria-label="Minimize">${ic("minimize")}</button>
      <button class="ib sm" type="button" data-act="closecompose" aria-label="Save and close">${ic("close")}</button></div>
    <div class="fld"><label for="c-to">To</label><input id="c-to" value="${esc(d.to)}"></div>
    <div class="fld"><input id="c-subj" placeholder="Subject" aria-label="Subject" value="${esc(d.subject)}"></div>
    <textarea id="c-body" aria-label="Message body">${esc(d.body)}</textarea>
    <div class="cf"><button class="pillbtn primary" type="submit">Save draft</button><small id="c-saved">${d.saved ? "Draft saved at " + esc(localClock(d.saved)) : "This archive can't send mail. Drafts stay in this browser."}</small>
      <button class="ib" type="button" data-act="discard" aria-label="Discard draft" title="Discard draft">${ic("delete")}</button></div>`;
  COMPOSE = el;
  const doSave = manual => {
    const vals = { to: $("#c-to").value, subject: $("#c-subj").value, body: $("#c-body").value };
    if (!vals.to && !vals.subject && !vals.body.trim() && !el.dataset.id) return false;
    let dr = ST.drafts.find(x => x.id === el.dataset.id);
    if (!dr) { dr = { id: "d" + Date.now(), thread: d.thread }; ST.drafts.push(dr); el.dataset.id = dr.id; }
    Object.assign(dr, vals, { saved: Date.now() });
    save(); renderRail(); if (ROUTE.view === "drafts") renderDrafts();
    $("#c-saved").textContent = (manual ? "Draft saved at " : "Draft autosaved at ") + localClock(dr.saved);
    $("#c-title").textContent = vals.subject || "New Message";
    return true;
  };
  el.onsubmit = e => { e.preventDefault(); doSave(true); };
  el.oninput = () => { clearTimeout(autosave); autosave = setTimeout(() => doSave(false), 1000); };
  el._save = doSave;
  requestAnimationFrame(() => { const f = d.to ? $("#c-body") : $("#c-to"); if (f) { f.focus(); if (d.to) f.setSelectionRange(0, 0); } });
}
function closeCompose(discard) {
  if (!COMPOSE) return;
  clearTimeout(autosave);
  const id = COMPOSE.dataset.id;
  if (discard) {
    const i = ST.drafts.findIndex(x => x.id === id);
    const removed = i >= 0 ? ST.drafts.splice(i, 1)[0] : null;
    save(); snack("Draft discarded.", removed ? () => { ST.drafts.push(removed); save(); } : null);
  } else if (COMPOSE._save(true)) snack("Draft saved.");
  COMPOSE.remove(); COMPOSE = null; renderRail(); if (ROUTE.view === "drafts") renderDrafts();
}
function startDraft(t, i, forward) {
  const m = t.m[i ?? t.m.length - 1];
  const text = m.b.filter(s => s[0] !== "f").map(s => s[1]).join("\n\n");
  openCompose({
    id: "", thread: t.id, to: forward ? "" : (t.k === "e" ? LISTS[t.s].addr : t.k === "x" ? (m.s ? (m.to || LISTS[t.s].addr) : (m.fe || m.f)) : m.f),
    subject: (forward ? "Fwd: " : (/^re:/i.test(t.t) ? "" : "Re: ")) + t.t,
    body: forward ? `\n\n---------- Forwarded message ---------\nFrom: ${m.f}\nDate: ${fullDateOf(m)}\nSubject: ${t.t}\n\n${text}\n`
                  : `\n\nOn ${fullDateOf(m)}, ${m.f} wrote:\n${text.split("\n").map(l => "> " + l).join("\n")}\n`,
  });
}

/* ═════════════ render ═════════════ */
let lastRendered = null;
function render(fromHash) {
  const sc = $("#scroller"), keepTop = !fromHash && lastRendered === location.hash && sc ? sc.scrollTop : null;
  ROUTE = parseHash();
  $("#q").value = ROUTE.search != null ? ROUTE.search : "";
  if (fromHash && ROUTE.view !== "thread") CURSOR = 0;
  renderRail();
  if (ROUTE.view === "thread") {
    if ((!HIT || HIT.id !== ROUTE.id) && LAST_LIST.startsWith("#search-")) {
      const { Q, res } = runSearch(safeDecode(LAST_LIST.slice(8)).replace(/~p\d+$/, ""));
      const r = res.find(x => (x.t ? x.t.id : x.c.id) === ROUTE.id);
      HIT = r ? { id: ROUTE.id, hits: r.hits, terms: Q.terms.filter(w => !w.includes(":")) } : null;
    }
    if (isCommitId(ROUTE.id)) renderCommit(); else renderThread();
  } else {
    HIT = null;
    ({ sent: renderSent, commits: renderCommitList, drafts: renderDrafts, people: renderPeople, activity: renderActivity, about: renderAbout, sources: renderSources }[ROUTE.view] || renderList)();
  }
  if (keepTop != null) { const s2 = $("#scroller"); if (s2) s2.scrollTop = keepTop; }
  const sc2 = $("#main .scroll"), card = $("#main");
  if (sc2) {
    if (fromHash) sc2.classList.add("enter");
    const upd = () => card.classList.toggle("scrolled", sc2.scrollTop > 2);
    sc2.addEventListener("scroll", upd, { passive: true }); upd();
  } else card.classList.remove("scrolled");
  lastRendered = location.hash;
}

/* ═════════════ actions ═════════════ */
function targets(el) {
  if (el && el.dataset && el.dataset.id) return [el.dataset.id];
  const ids = [...SELECTED];
  if (!ids.length) snack("No conversations selected.");
  return ids;
}
function bulk(ids, fn, msg) {
  if (!ids.length) return;
  const before = JSON.stringify({ arch: ST.arch, trash: ST.trash, read: ST.read, star: ST.star });
  ids.forEach(fn); save(); SELECTED.clear();
  if (msg) snack(msg.replace("{n}", ids.length === 1 ? "Conversation" : `${ids.length} conversations`), () => { Object.assign(ST, JSON.parse(before)); save(); });
  if (ROUTE.view === "thread" && msg) go(LAST_LIST); else render();
}
function doSearch() {
  const q = $("#q").value.trim();
  HIT = null;
  go(q ? "#search-" + encodeURIComponent(q) : "#inbox");
  $("#q").blur();
}
const stop = e => { if (e && e.stopPropagation) e.stopPropagation(); };
const ACTIONS = {
  open(el) {
    const id = el.dataset.id;
    HIT = el.dataset.i != null ? { id, hits: [+el.dataset.i], terms: [] } : null;
    CURSOR = Math.max(0, CURRENT_LIST.indexOf(id));
    go("#t-" + id);
  },
  "open-draft"() { composeJoke(); },
  check(el, e) { stop(e); el.checked ? SELECTED.add(el.dataset.id) : SELECTED.delete(el.dataset.id); render(); },
  selall(el) { if (el.checked) CURRENT_LIST.forEach(id => SELECTED.add(id)); else SELECTED.clear(); render(); },
  selmenu(el) { popover(el, ["All", "None", "Read", "Unread", "Starred", "Unstarred"].map(v => `<button class="mi" data-act="sel" data-v="${v.toLowerCase()}">${v}</button>`).join(""), "left"); },
  sel(el) {
    const v = el.dataset.v; SELECTED.clear();
    for (const id of CURRENT_LIST) { const t = BY_ID.get(id); if (v === "all" || (v === "read" && isRead(t)) || (v === "unread" && !isRead(t)) || (v === "starred" && isStar(t)) || (v === "unstarred" && !isStar(t))) SELECTED.add(id); }
    closeLayer(); render();
  },
  star(el, e) {
    stop(e);
    const id = el.dataset.id;
    if (ST.star[id]) delete ST.star[id]; else ST.star[id] = 1;
    save();
    const on = !!ST.star[id];
    document.querySelectorAll(`.star[data-id="${id}"]`).forEach(s => {
      s.classList.toggle("on", on); s.innerHTML = ic("star", on ? "fill" : ""); s.setAttribute("aria-pressed", on); s.setAttribute("aria-label", on ? "Starred" : "Not starred");
      if (on) { s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); }
    });
  },
  starsel(el) { bulk(targets(el), id => { ST.star[id] = 1; }); },
  archive(el, e) { stop(e); bulk(targets(el), id => { ST.arch[id] = 1; }, "{n} archived."); },
  trash(el, e) { stop(e); bulk(targets(el), id => { ST.trash[id] = 1; }, "{n} moved to Trash."); },
  untrash(el) { bulk(targets(el), id => { delete ST.trash[id]; delete ST.arch[id]; }, "{n} moved to Inbox."); },
  toinbox(el) { bulk(targets(el), id => { delete ST.arch[id]; delete ST.trash[id]; }, "{n} moved to Inbox."); },
  markread(el, e) { stop(e); bulk(targets(el), id => { ST.read[id] = 1; }); },
  markunread(el, e) {
    stop(e);
    const ids = targets(el); if (!ids.length) return;
    ids.forEach(id => { ST.read[id] = 0; }); save(); SELECTED.clear();
    if (ROUTE.view === "thread") go(LAST_LIST); else render();
  },
  markallread() { CURRENT_LIST.forEach(id => { ST.read[id] = 1; }); save(); render(); snack("Conversations on this page marked as read."); },
  refresh() { render(); snack("Up to date. This archive doesn't receive new mail."); },
  sort() { ST.sort = ST.sort === "old" ? "new" : "old"; save(); render(); },
  closebanner() { ST.bannerClosed = 1; save(); render(); },
  chip(el) {
    const v = el.dataset.v; let q = ROUTE.search || "";
    const re = new RegExp(`(^|\\s)${escRe(v)}(?=\\s|$)`, "i");
    q = re.test(q) ? q.replace(re, " ").replace(/\s+/g, " ").trim() : (q + " " + v).trim();
    $("#q").value = q; doSearch();
  },
  adv() { openAdv(); },
  menu() { $("#rail").classList.toggle("open"); },
  "more-topics"() { showAllTopics = !showAllTopics; renderRail(); },
  compose() { $("#rail").classList.remove("open"); openCompose(); },
  minimize(el, e) { stop(e); if (COMPOSE) COMPOSE.classList.toggle("min"); },
  closecompose(el, e) { stop(e); closeCompose(false); },
  discard() { closeCompose(true); },
  random() { const t = THREADS[Math.floor(Math.random() * THREADS.length)]; HIT = null; go("#t-" + t.id); },
  help() { dialog(HELP); },
  closelayer() { closeLayer(); },
  settings(el) {
    const r = (name, val, label) => `<label class="mi"><input type="radio" name="${name}" value="${val}" ${ST[name] === val ? "checked" : ""} data-act="pref"> ${label}</label>`;
    popover(el, `<h4>Theme</h4>${r("theme", "system", "Device default")}${r("theme", "light", "Light")}${r("theme", "dark", "Dark")}
      <h4>Archive</h4><a class="mi" href="#about">${ic("info")} About this archive</a><a class="mi" href="#sources">${ic("source")} Sources</a><button class="mi" data-act="resetstate">${ic("restart_alt")} Reset stars and read state</button>`);
  },
  pref(el) { ST[el.name] = el.value; save(); applyPrefs(); },
  resetstate() { const before = JSON.stringify(ST); ST.star = {}; ST.read = {}; ST.arch = {}; ST.trash = {}; save(); closeLayer(); render(); snack("Mailbox reset.", () => { Object.assign(ST, JSON.parse(before)); save(); }); },
  apps(el) {
    const a = (href, icon, label) => `<a href="${href}" target="_blank" rel="noopener">${ic(icon)}${label}</a>`;
    popover(el, `<div class="apps"><a href="#wiki">${ic("menu_book")}Satoshipedia</a>${a("https://nakamotoinstitute.org/library/", "menu_book", "Library")}${a("https://nakamotoinstitute.org/mempool/", "article", "Mempool")}${a("https://satoshi.nakamotoinstitute.org/quotes/", "format_quote", "Quotes")}${a("https://nakamotoinstitute.org/the-skeptics/", "trending_down", "Skeptics")}${a("https://nakamotoinstitute.org/podcasts/", "podcasts", "Podcasts")}${a("https://satoshi.nakamotoinstitute.org/code/", "code", "Code")}</div>`);
  },
  account(el) {
    popover(el, `<div class="acct"><div style="font-size:13px;color:var(--ink-2)">satoshi@vistomail.com</div>${avatar("Satoshi", "avatar big")}<div style="font-size:20px">Hi, Satoshi!</div>
      <p style="color:var(--ink-3);font-size:13px;margin:4px 0 8px">Read-only archive from the Satoshi Nakamoto Institute.<br>Last account activity: ${esc(shortDate(LAST_ACTIVE))} (${ago(LAST_ACTIVE)}).</p>
      <a class="pillbtn" href="#about">About this archive</a></div>`);
  },
  "toggle-msg"(el, e) {
    if (e && e.target && e.target.closest && e.target.closest("a, button")) return;
    const msg = el.closest(".msg"); msg.classList.toggle("open"); msg.classList.remove("showdet");
    el.setAttribute("aria-expanded", msg.classList.contains("open"));
  },
  details(el, e) { stop(e); el.closest(".msg").classList.toggle("showdet"); },
  dftoggle(el) { const df = el.closest(".df"); df.classList.toggle("closed"); el.setAttribute("aria-expanded", !df.classList.contains("closed")); },
  jumpfile(el, e) { e.preventDefault(); const df = $("#df" + el.dataset.i); if (df) { df.classList.remove("closed"); if (df.scrollIntoView) df.scrollIntoView({ block: "start", behavior: SMOOTH }); } },
  trim(el) { const qb = el.nextElementSibling; qb.hidden = !qb.hidden; el.title = qb.hidden ? "Show trimmed content" : "Hide trimmed content"; el.setAttribute("aria-label", el.title); },
  unstack(el) {
    const t = BY_ID.get(ROUTE.id);
    const frag = document.createDocumentFragment();
    for (let k = +el.dataset.from; k < +el.dataset.to; k++) { const m = renderMsg(t, k, false, []); m.classList.add("stack-in"); frag.append(m); }
    el.replaceWith(frag);
  },
  "expand-all"() {
    document.querySelectorAll("#msgs .stack").forEach(x => ACTIONS.unstack(x));
    document.querySelectorAll("#msgs .msg").forEach(m => m.classList.add("open"));
  },
  reply(el, e) { stop(e); startDraft(BY_ID.get(el.dataset.id), el.dataset.i != null ? +el.dataset.i : null, false); },
  forward(el) { startDraft(BY_ID.get(el.dataset.id), null, true); },
  person(el) { $("#q").value = `from:"${el.dataset.name.toLowerCase()}"`; doSearch(); },
  day(el) {
    const d = new Date(el.dataset.day + "T00:00:00Z"), n = new Date(d.getTime() + 864e5);
    const f = x => `${x.getUTCFullYear()}/${String(x.getUTCMonth() + 1).padStart(2, "0")}/${String(x.getUTCDate()).padStart(2, "0")}`;
    $("#q").value = `from:me after:${f(d)} before:${f(n)}`; doSearch();  // includes that day's commits
  },
};
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (act === "pref" || act === "selall" && el !== e.target) return;
  if ((act === "open" || act === "open-draft") && e.target !== el && e.target.closest("a, button, input")) return;
  const fn = ACTIONS[act];
  if (fn) fn(el, e);
});
document.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.act === "pref") ACTIONS.pref(e.target); });
$("#searchform").addEventListener("submit", e => { e.preventDefault(); doSearch(); });
document.addEventListener("keydown", e => {
  const t = e.target;
  if ((e.key === "Enter" || e.key === " ") && t.closest && t.closest(".mh, .stack, .row[role=button]") && !t.closest("a, button, input")) {
    e.preventDefault(); const el = t.closest(".mh, .stack, .row[role=button]"); ACTIONS[el.dataset.act](el, e);
  }
});

/* ═════════════ keyboard shortcuts ═════════════ */
let gPending = 0;
document.addEventListener("keydown", e => {
  if (document.body.classList.contains("in-map")) { mapKey(e); return; }
  if (document.body.classList.contains("in-wiki")) { wikiKey(e); return; }
  if ((e.metaKey || e.ctrlKey) && (e.key || "").toLowerCase() === "k") { e.preventDefault(); $("#q").focus(); $("#q").select(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
  if (e.key === "Escape") {
    if ($("#layer").innerHTML) { closeLayer(); return; }
    if ($("#rail").classList.contains("open")) { $("#rail").classList.remove("open"); return; }
    if (typing) e.target.blur();
    return;
  }
  if (typing) return;
  const k = e.key;
  if ((k === "Enter" || k === " ") && e.target.closest && e.target.closest("a, button, [role=button]")) return;
  if (gPending && Date.now() - gPending < 1200) {
    gPending = 0;
    const dest = { w: "#wiki", i: "#inbox", s: "#starred", t: "#sent", c: "#commits", a: "#all" }[k];
    if (dest) { e.preventDefault(); go(dest); }
    return;
  }
  const inList = ROUTE.view === "list" || ROUTE.view === "sent" || ROUTE.view === "commits";
  const inThread = ROUTE.view === "thread";
  const curId = inList ? CURRENT_LIST[CURSOR] : inThread ? ROUTE.id : null;
  const move = d => {
    if (!CURRENT_LIST.length) return;
    CURSOR = Math.max(0, Math.min(CURRENT_LIST.length - 1, CURSOR + d)); markCursor();
    const r = document.querySelectorAll("#main .row")[CURSOR]; if (r && r.scrollIntoView) r.scrollIntoView({ block: "nearest" });
  };
  const moveMsg = d => {
    const msgs = [...document.querySelectorAll("#msgs .msg")]; if (!msgs.length) return;
    MCURSOR = Math.max(0, Math.min(msgs.length - 1, MCURSOR + d));
    msgs.forEach((m, i) => { m.style.boxShadow = i === MCURSOR ? "inset 3px 0 0 var(--accent)" : ""; });
    if (msgs[MCURSOR].scrollIntoView) msgs[MCURSOR].scrollIntoView({ block: "nearest", behavior: SMOOTH });
  };
  const H = () => e.preventDefault();
  switch (k) {
    case "?": H(); ACTIONS.help(); break;
    case "/": H(); $("#q").focus(); break;
    case "c": H(); openCompose(); break;
    case "g": gPending = Date.now(); break;
    case "j": case "k":
      H();
      if (inList) move(k === "j" ? 1 : -1);
      else if (inThread) { const p = CURRENT_LIST.indexOf(ROUTE.id), n = p + (k === "j" ? 1 : -1); if (p >= 0 && CURRENT_LIST[n]) { CURSOR = n; HIT = null; go("#t-" + CURRENT_LIST[n]); } }
      break;
    case "n": case "p": if (inThread) { H(); moveMsg(k === "n" ? 1 : -1); } break;
    case "o": case "Enter":
      if (inList && curId) { H(); const row = document.querySelectorAll("#main .row")[CURSOR]; if (row) ACTIONS.open(row); }
      else if (inThread && MCURSOR >= 0) { H(); const m = document.querySelectorAll("#msgs .msg")[MCURSOR]; if (m) ACTIONS["toggle-msg"](m.querySelector(".mh")); }
      break;
    case "u": if (inThread) { H(); go(LAST_LIST); } break;
    case "x": if (inList && curId) { H(); SELECTED.has(curId) ? SELECTED.delete(curId) : SELECTED.add(curId); render(); } break;
    case "s": if (curId) { H(); ACTIONS.star({ dataset: { id: curId } }); } break;
    case "e": case "y": if (curId && !isCommitId(curId)) { H(); bulk([curId], id => { ST.arch[id] = 1; }, "{n} archived."); } break;
    case "I": if (curId) { H(); bulk(inList && SELECTED.size ? [...SELECTED] : [curId], id => { ST.read[id] = 1; }); } break;
    case "U": if (curId) { H(); ACTIONS.markunread({ dataset: inList && SELECTED.size ? {} : { id: curId } }); } break;
  }
});

/* ═════════════ ripples ═════════════ */
const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const SMOOTH = REDUCED ? "auto" : "smooth";
document.addEventListener("pointerdown", e => {
  if (REDUCED || e.button !== 0) return;
  const el = e.target.closest(".ib, .tab, .pillbtn, .compose-btn, .fchip, .mi, .person, .dfh, .avatar-btn, .nav");
  if (!el) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const rip = document.createElement("span");
  rip.className = "ripple";
  rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.append(rip);
  setTimeout(() => rip.remove(), 560);
}, { passive: true });

/* ═════════════ live search suggestions ═════════════ */
const SG = { items: [], active: -1, timer: null };
function suggestions(q) {
  const ql = q.toLowerCase(), out = [];
  if (/(^|\s)\w+:\S*$/.test(q) || ql.length < 2) {
    const ops = ["from:me", "in:commits", "label:private", "label:bitcointalk", "has:code", "is:starred", "topic:privacy", "after:2010/07/01"];
    const last = (q.match(/(\S*)$/) || ["", ""])[1].toLowerCase();
    ops.filter(o => o.startsWith(last) && o !== last).slice(0, 6).forEach(o =>
      out.push({ kind: "op", icon: "tune", title: o, q: q.slice(0, q.length - last.length) + o + " " }));
    return out;
  }
  const hl = s => esc(s).replace(new RegExp(escRe(esc(q)), "ig"), x => `<mark>${x}</mark>`);
  const conv = [];
  for (const t of THREADS) {
    if (ST.trash[t.id]) continue;
    const i = t.t.toLowerCase().indexOf(ql);
    if (i >= 0) conv.push({ t, score: (i === 0 ? 0 : 1) - t.m.length / 1000 });
  }
  conv.sort((a, b) => a.score - b.score);
  conv.slice(0, 5).forEach(({ t }) => out.push({ kind: "thread", icon: t.k === "x" ? "lock" : t.k === "p" ? "forum" : "mail", html: hl(t.t) + `<small>${esc(LISTS[t.s] ? LISTS[t.s].name : t.s)}</small>`, right: listDate(t.last), href: "#t-" + t.id }));
  COMMITS.filter(c => c.s.toLowerCase().includes(ql)).slice(0, 2).forEach(c =>
    out.push({ kind: "commit", icon: "commit", html: hl(c.s) + `<small>${c.r ? "SVN r" + c.r : "git"}</small>`, right: listDate(c.d), href: "#t-" + c.id }));
  PEOPLE.filter(p => p.name.toLowerCase().includes(ql)).slice(0, 3).forEach(p =>
    out.push({ kind: "person", icon: "person", html: hl(p.name), right: `${p.nthreads} conversation${p.nthreads > 1 ? "s" : ""}`, q: `from:"${p.name.toLowerCase()}"` }));
  out.push({ kind: "all", icon: "search", html: `Search all mail for “<b>${esc(q)}</b>”`, q });
  return out;
}
function drawSuggest() {
  const box = $("#suggest"), wrap = $(".search"), q = $("#q").value;
  if (document.activeElement !== $("#q") || !q.trim() && !SG.forceOpen) { closeSuggest(); return; }
  SG.items = suggestions(q.trim());
  if (!SG.items.length) { closeSuggest(); return; }
  SG.active = Math.min(SG.active, SG.items.length - 1);
  let lastKind = null, html = "";
  SG.items.forEach((it, i) => {
    const head = { thread: "Conversations", commit: "Commits", person: "People", op: "Search operators" }[it.kind];
    if (head && it.kind !== lastKind) html += `<h5>${head}</h5>`;
    lastKind = it.kind;
    html += `<div class="sg${i === SG.active ? " on" : ""}" role="option" id="sg${i}" data-i="${i}" aria-selected="${i === SG.active}">${ic(it.icon)}<span class="t">${it.html || esc(it.title)}</span><span class="r">${esc(it.right || "")}</span></div>`;
  });
  box.innerHTML = html; box.hidden = false; wrap.classList.add("open");
  $("#q").setAttribute("aria-expanded", "true");
  $("#q").setAttribute("aria-activedescendant", SG.active >= 0 ? "sg" + SG.active : "");
}
function closeSuggest() {
  const box = $("#suggest"); if (!box) return;
  box.hidden = true; $(".search").classList.remove("open"); SG.active = -1;
  $("#q").setAttribute("aria-expanded", "false"); $("#q").removeAttribute("aria-activedescendant");
}
function pickSuggest(i) {
  const it = SG.items[i]; if (!it) return;
  closeSuggest();
  if (it.href) { $("#q").blur(); HIT = null; go(it.href); }
  else if (it.kind === "op") { $("#q").value = it.q; $("#q").focus(); drawSuggest(); }
  else { $("#q").value = it.q; doSearch(); }
}
$("#q").addEventListener("input", () => { clearTimeout(SG.timer); SG.active = -1; SG.timer = setTimeout(drawSuggest, 90); });
$("#q").addEventListener("focus", () => { if ($("#q").value.trim()) drawSuggest(); });
$("#q").addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== $("#q")) closeSuggest(); }, 120));
$("#q").addEventListener("keydown", e => {
  if ($("#suggest").hidden) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const n = SG.items.length;
    SG.active = e.key === "ArrowDown" ? (SG.active + 1) % n : (SG.active - 1 + n) % n;
    drawSuggest();
    const on = $("#sg" + SG.active); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter" && SG.active >= 0) { e.preventDefault(); pickSuggest(SG.active); }
  else if (e.key === "Escape") { e.preventDefault(); closeSuggest(); }
});
$("#suggest").addEventListener("pointerdown", e => { const sg = e.target.closest(".sg"); if (sg) { e.preventDefault(); pickSuggest(+sg.dataset.i); } });


/* ═════════════ Satoshipedia (the Satoshi Mail encyclopedia) ═════════════ */
const MADE_BY = `Founded and made by <a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">Tyler Howell</a>`;
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
// thread → articles that cite it
const CITED = new Map();
WA.forEach(a => {
  const re = /data-src="([^"]*)" data-title="([^"]*)"/g; let m;
  const all = a.lead + a.sections.map(s => s.html).join("");
  while ((m = re.exec(all))) {
    const t = THREADS.find(t => t.s === htmlText(m[1]) && t.t === htmlText(m[2]));
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
    const t = THREADS.find(t => t.s === el.dataset.src && t.t === el.dataset.title);
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
    <nav><a href="#wiki">Satoshipedia</a><a href="#wiki~about">About</a><a href="#wiki~all">All articles</a><a href="#inbox">Satoshi Mail inbox</a><a href="https://en.wikipedia.org/wiki/Satoshi_Nakamoto" target="_blank" rel="noopener">Wikipedia: Satoshi Nakamoto</a></nav>
    <div class="made-by-foot">${MADE_BY} · <a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">@TylerHowell88</a> · <a href="https://github.com/itstylerhowell/satoshiMail" target="_blank" rel="noopener">Open source (MIT) on GitHub</a></div>
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

/* ═════════════ Satoshi Map: connections and timeline ═════════════ */
const MAP = (() => {
  const real = SENT.filter(x => !x.m.w);                       // the disputed 2014 post stays off the chart
  const START = Math.min(...real.map(x => x.m.d));
  const END = Math.max(...real.map(x => x.m.d));
  const ym = sec => { const d = dt(sec); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  const M0 = ym(START), M1 = ym(END), N = M1 - M0 + 1;
  const monthLabel = i => { const v = M0 + i; return `${MON[v % 12]} ${Math.floor(v / 12)}`; };
  const LIMIT = END + 45 * 86400;                              // ignore replies long after Satoshi left
  const isAnon = n => /^(anonymous|\(unknown\)|unknown)$/i.test(String(n).trim());
  const titleSlug = new Map(WA.map(a => [a.title.toLowerCase(), a.slug]));
  const people = new Map();
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "person";
  const used = new Set();
  function person(name) {
    const art = ALIAS.get(name.toLowerCase()) || titleSlug.get(name.toLowerCase()) || null;
    const key = art || "n:" + name.toLowerCase();
    let p = people.get(key);
    if (!p) {
      let slug = art || slugify(name);
      if (!art) { let s = slug, i = 2; while (used.has(s) || WBY.has(s)) s = `${slug}-${i++}`; slug = s; }
      used.add(slug);
      p = { key, slug, art, name: art ? WBY.get(art).title : name, aliases: new Set(), msgs: 0, recv: 0, threads: new Map(), first: Infinity, last: -Infinity,
            ch: { e: 0, p: 0, x: 0 }, month: new Array(N).fill(0) };
      people.set(key, p);
    }
    p.aliases.add(name);
    return p;
  }
  const touch = (p, t, m, kind) => {
    if (m.d > LIMIT) return;
    if (kind === "sent") p.msgs++; else p.recv++;
    p.threads.set(t, (p.threads.get(t) || 0) + 1);
    p.first = Math.min(p.first, m.d); p.last = Math.max(p.last, m.d);
    p.ch[t.k]++;
    const i = Math.max(0, Math.min(N - 1, ym(m.d) - M0)); p.month[i]++;
  };
  for (const t of THREADS) {
    if (!t.m.some(m => m.s && !m.w)) continue;
    for (const m of t.m) {
      if (m.s) {
        // Satoshi's private emails count for the person he wrote to
        if (t.k === "x" && !m.w) {
          const to = t.s === "single-emails" ? t.t.replace(/^Email to /i, "") : (LISTS[t.s] && LISTS[t.s].name);
          if (to) touch(person(to), t, m, "recv");
        }
        continue;
      }
      if (isSatName(m.f) || isAnon(m.f)) continue;
      touch(person(m.f), t, m, "sent");
    }
  }
  const P = [...people.values()].filter(p => p.msgs + p.recv > 0).map(p => {
    p.ex = p.msgs + p.recv;
    p.nthreads = p.threads.size;
    p.score = p.ex + 2 * p.nthreads;
    p.main = p.ch.x >= Math.max(p.ch.e, p.ch.p) && p.ch.x ? "x" : p.ch.e >= p.ch.p ? "e" : "p";
    p.firstI = Math.max(0, Math.min(N - 1, ym(p.first) - M0));
    p.cum = []; let c = 0; for (let i = 0; i < N; i++) { c += p.month[i]; p.cum.push(c); }
    return p;
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const BY = new Map(P.map(p => [p.slug, p]));
  // Satoshi's own month-by-month activity
  const sat = { e: new Array(N).fill(0), p: new Array(N).fill(0), x: new Array(N).fill(0), c: new Array(N).fill(0) };
  real.forEach(x => { const i = ym(x.m.d) - M0; if (i >= 0 && i < N) sat[x.t.k][i]++; });
  COMMITS.forEach(c => { const i = ym(c.d) - M0; if (i >= 0 && i < N) sat.c[i]++; });
  const satCum = []; { let c = 0; for (let i = 0; i < N; i++) { c += sat.e[i] + sat.p[i] + sat.x[i]; satCum.push(c); } }
  const comCum = []; { let c = 0; for (let i = 0; i < N; i++) { c += sat.c[i]; comCum.push(c); } }
  return { START, END, M0, N, ym, monthLabel, P, BY, sat, satCum, comCum };
})();
const CH_NAME = { e: "Mailing lists", p: "Forums", x: "Private email" };
const chColor = k => `var(--ch-${k})`;

/* ── milestones, all anchored in the archive (or a Satoshipedia article) ── */
const MILESTONES = (() => {
  const T = (src, title) => THREADS.find(t => t.s === src && t.t === title);
  const real = SENT.filter(x => !x.m.w);
  const out = [];
  const add = (o) => { if (o.d) out.push(o); };
  const firstSat = t => t && t.m.find(m => m.s);
  const msgOf = (t, pred) => { if (!t) return null; const i = t.m.findIndex(pred); return i < 0 ? null : { t, i, m: t.m[i] }; };
  const withSat = (src, title) => msgOf(T(src, title), m => m.s && !m.w);
  const at = (x, o) => x && add({ d: x.m.d, approx: isApprox(x.m), href: "#t-" + x.t.id, mi: x.i, ...o });
  at(withSat("adam-back", "Citation of your Hashcash paper"), { t: "First known email", s: "Satoshi asks Adam Back how to cite Hashcash.", wiki: "adam-back" });
  at(withSat("cryptography", "Bitcoin P2P e-cash paper"), { t: "White paper announced", s: "“I've been working on a new electronic cash system…”", wiki: "bitcoin-white-paper" });
  at(msgOf(T("hal-finney", "Re: Bitcoin source files attached"), () => true), { t: "Code sent to reviewers", s: "Hal Finney replies to the pre-release source files.", wiki: "pre-release-source-code" });
  at(withSat("bitcoin-list", "[bitcoin-list] Welcome"), { t: "bitcoin-list opens", s: "The project's own mailing list.", wiki: "bitcoin-list" });
  add({ d: Date.UTC(2009, 0, 3) / 1000, t: "Genesis block", s: "Block 0 carries a Times headline.", wiki: "genesis-block" });
  at(withSat("cryptography", "Bitcoin v0.1 released"), { t: "Bitcoin v0.1 released", s: "The first release, for Windows.", wiki: "bitcoin-v0-1" });
  add({ d: Date.UTC(2009, 0, 12) / 1000, t: "First transaction", s: "10 bitcoins to Hal Finney in block 170.", wiki: "first-bitcoin-transaction" });
  at(withSat("p2pfoundation", "Bitcoin open source implementation of P2P currency"), { t: "P2P Foundation post", s: "Bitcoin explained for a general audience.", wiki: "p2p-foundation" });
  at(msgOf(T("martti-malmi", "Re: Bitcoin"), () => true), { t: "Martti Malmi writes", s: "Bitcoin's first volunteer gets in touch.", wiki: "martti-malmi" });
  const firstCommit = COMMITS.reduce((a, c) => (!a || c.d < a.d ? c : a), null);
  if (firstCommit) add({ d: firstCommit.d, t: "First commit in the archive", s: `${firstCommit.s}${firstCommit.r ? ` (SVN r${firstCommit.r})` : ""}`, href: "#t-" + firstCommit.id, wiki: "sourceforge" });
  at(withSat("bitcointalk", "Welcome to the new Bitcoin forum!"), { t: "Forum opens", s: "The forum that became BitcoinTalk.", wiki: "bitcointalk" });
  at(withSat("bitcoin-list", "[bitcoin-list] Bitcoin 0.3 released!"), { t: "Bitcoin 0.3", s: "“Escape the arbitrary inflation risk…”", wiki: "supply-cap" });
  at(withSat("bitcoin-list", "[bitcoin-list] ALERT - we are investigating a problem"), { t: "Value overflow bug", s: "Fixed within hours.", wiki: "value-overflow-incident" });
  at(withSat("bitcointalk", "Wikileaks contact info?"), { t: "WikiLeaks appeal", s: "“I make this appeal to WikiLeaks not to try to use Bitcoin.”", wiki: "wikileaks-and-bitcoin" });
  const lastPost = real.filter(x => x.t.s === "bitcointalk").reduce((a, x) => (!a || x.m.d > a.m.d ? x : a), null);
  at(lastPost, { t: "Last forum post", s: "Version 0.3.19.", wiki: "departure-of-satoshi-nakamoto" });
  const lastCommit = COMMITS.reduce((a, c) => (!a || c.d > a.d ? c : a), null);
  if (lastCommit) add({ d: lastCommit.d, t: "Last commit", s: `${lastCommit.s}${lastCommit.r ? ` (SVN r${lastCommit.r})` : ""}`, href: "#t-" + lastCommit.id, wiki: "sourceforge" });
  at(withSat("mike-hearn", "Holding coins in an unspendable state for a rolling time window"), { t: "“Moved on to other things”", s: "Satoshi to Mike Hearn.", wiki: "mike-hearn" });
  at(withSat("single-emails", "Email to Gavin Andresen"), { t: "Last email", s: "The alert key goes to Gavin Andresen.", wiki: "gavin-andresen" });
  const disputed = SENT.find(x => x.m.w);
  if (disputed) add({ d: disputed.m.d, href: "#t-" + disputed.t.id, mi: disputed.i, t: "Disputed post", s: "“I am not Dorian Nakamoto”, on his old P2P Foundation account; authenticity uncertain.", wiki: "media-investigations", off: true });
  return out.sort((a, b) => a.d - b.d);
})();

/* ── window ── */
let MAP_OPEN = false, VZ_HIDE_T = null, VZ_VIEW = "net", VZ_SEL = null, VZ_T = MAP.N - 1, VZ_FILTER = "all", VZ_MODE = "diagram", VZ_PLAY = null, VZ_BUILT = { net: false, tl: false };
let VZ_MAX = false;
try { VZ_MAX = localStorage.getItem("satoshimap-max") === "1"; } catch (e) {}
const inMap = () => location.hash === "#map" || location.hash.startsWith("#map~");
function mapShow(on) {
  const win = $("#vzwin");
  MAP_OPEN = on;
  document.body.classList.toggle("in-map", on);
  $("#app").inert = on || WK_STATE === "open";
  win.classList.toggle("max", VZ_MAX);
  $("#vzscrim").hidden = !on || VZ_MAX;
  const mb = win.querySelector(".vz-maxbtn");
  mb.innerHTML = ic(VZ_MAX ? "close_fullscreen" : "open_in_full");
  mb.setAttribute("aria-label", VZ_MAX ? "Exit full screen" : "Full screen"); mb.title = mb.getAttribute("aria-label");
  clearTimeout(VZ_HIDE_T);
  if (on) {
    if (win.hidden || win.classList.contains("closing")) {
      win.classList.remove("closing"); win.hidden = false;
      if (!REDUCED) { win.classList.remove("opening"); void win.offsetWidth; win.classList.add("opening"); }
      $("#vz").focus({ preventScroll: true });
    }
  } else if (!win.hidden) {
    vzStop(); vzTipHide();
    if (REDUCED) win.hidden = true;
    else { win.classList.remove("opening"); win.classList.add("closing"); VZ_HIDE_T = setTimeout(() => { win.hidden = true; win.classList.remove("closing"); }, 170); }
  }
}
function mapRoute() {
  const h = decodeURIComponent(location.hash.slice(1));
  let view = "net", sel = null;
  if (h === "map~timeline") view = "tl";
  else if (h.startsWith("map~p~")) sel = MAP.BY.has(h.slice(6)) ? h.slice(6) : null;
  VZ_VIEW = view;
  document.querySelectorAll("#vzwin [data-vztab]").forEach(a => { const on = a.dataset.vztab === view; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (view === "tl") { vzStop(); renderTimeline(); return; }
  renderNet();
  vzSelect(sel, false);
}
function mapClose() { mapShow(false); if (inMap()) location.hash = WK_BEHIND; updateDock(); }
function mapToggleMax() { VZ_MAX = !VZ_MAX; try { localStorage.setItem("satoshimap-max", VZ_MAX ? "1" : "0"); } catch (e) {} mapShow(true); }

/* ── connections: a radial clock ── */
const VZ_C = 500, VZ_RIN = 120, VZ_ROUT = 430, VZ_SWEEP = 320;
// Angle follows the ORDER of first contact (evenly spread so busy months don't pile up); year spokes mark where each year begins.
const VZ_ORDER = MAP.P.slice().sort((a, b) => a.first - b.first || b.score - a.score);
VZ_ORDER.forEach((p, i) => { p.order = i; });
const vzAngleFrac = f => (-90 + 18 + VZ_SWEEP * f) * Math.PI / 180;
const vzAngleOf = p => vzAngleFrac((p.order + .5) / VZ_ORDER.length);
const vzAngle = sec => vzAngleFrac(VZ_ORDER.filter(p => p.first < sec).length / VZ_ORDER.length);
const vzNodeR = n => 4 + 17 * Math.sqrt(n / MAP.P[0].ex);
function vzLayout() {
  const P = MAP.P, maxS = Math.log(P[0].score + 1), minS = Math.log(Math.min(...P.map(p => p.score)) + 1);
  P.forEach(p => {
    const a = vzAngleOf(p);
    const k = (Math.log(p.score + 1) - minS) / (maxS - minS || 1);
    p.tr = VZ_RIN + (VZ_ROUT - VZ_RIN) * (1 - k);
    p.ta = a;
    p.x = VZ_C + p.tr * Math.cos(a); p.y = VZ_C + p.tr * Math.sin(a);
    p.r = vzNodeR(p.ex);
  });
  // relax overlaps, then pull each node back toward its place on the clock
  for (let it = 0; it < 160; it++) {
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const a = P[i], b = P[j], dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r + 2.5, d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || .01, push = (min - d) / 2, ux = dx / d, uy = dy / d;
        const wa = b.r / (a.r + b.r), wb = a.r / (a.r + b.r);
        a.x -= ux * push * wa * 2; a.y -= uy * push * wa * 2; b.x += ux * push * wb * 2; b.y += uy * push * wb * 2;
      }
    }
    for (const p of P) {
      const tx = VZ_C + p.tr * Math.cos(p.ta), ty = VZ_C + p.tr * Math.sin(p.ta);
      p.x += (tx - p.x) * .06; p.y += (ty - p.y) * .06;
      const dx = p.x - VZ_C, dy = p.y - VZ_C, d = Math.hypot(dx, dy);
      if (d < VZ_RIN - 30) { p.x = VZ_C + dx / d * (VZ_RIN - 30); p.y = VZ_C + dy / d * (VZ_RIN - 30); }
      if (d > 470) { p.x = VZ_C + dx / d * 470; p.y = VZ_C + dy / d * 470; }
    }
  }
}
const nodeShape = (p, r) => p.main === "x"
  ? `<rect class="node" data-p="${p.slug}" x="${(p.x - r * .8).toFixed(1)}" y="${(p.y - r * .8).toFixed(1)}" width="${(r * 1.6).toFixed(1)}" height="${(r * 1.6).toFixed(1)}" rx="2" transform="rotate(45 ${p.x.toFixed(1)} ${p.y.toFixed(1)})" fill="${chColor(p.main)}"/>`
  : `<circle class="node" data-p="${p.slug}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${chColor(p.main)}"/>`;
function renderNet() {
  const body = $("#vzbody");
  if (body.dataset.view !== "net") {
    body.dataset.view = "net";
    if (!VZ_BUILT.net) { vzLayout(); VZ_BUILT.net = true; }
    body.innerHTML = `<div class="vz-net">
      <div class="vz-bar">
        <div class="vz-chips" role="group" aria-label="Filter by channel">
          <button class="vz-chip" data-vzf="all" aria-pressed="true">Everyone</button>
          ${["e", "p", "x"].map(k => `<button class="vz-chip" data-vzf="${k}" aria-pressed="false"><i class="${k}" style="background:${chColor(k)}"></i>${CH_NAME[k]}</button>`).join("")}
        </div>
        <div class="vz-seg" role="group" aria-label="Display">
          <button data-vzm="diagram" aria-pressed="true">${ic("hub")}<span class="t">Diagram</span></button>
          <button data-vzm="list" aria-pressed="false">${ic("table_rows")}<span class="t">List</span></button>
        </div>
      </div>
      <div class="vz-stage" id="vzstage"></div>
      <div class="vz-list" id="vzlist" hidden></div>
      <aside class="vz-side" id="vzside" aria-live="polite"></aside>
      <div class="vz-scrub">
        <button class="play" type="button" id="vzplay" aria-label="Play from the start">${ic("play_arrow")}</button>
        <input type="range" id="vzt" min="0" max="${MAP.N - 1}" value="${VZ_T}" aria-label="Month">
        <output id="vzto" for="vzt"></output>
        <small id="vzts"></small>
      </div>
    </div>`;
    drawNet();
    $("#vzt").addEventListener("input", e => { vzStop(); vzSetT(+e.target.value); });
    vzFilter(VZ_FILTER); vzMode(VZ_MODE);
  }
  vzSetT(VZ_T);
}
function drawNet() {
  const P = MAP.P;
  let s = `<svg viewBox="0 0 1000 1000" role="img" aria-label="Everyone Satoshi corresponded with, placed by when they first exchanged messages (clockwise from August 2008) and how much (closer to the centre is more). The list view has the same data as a table.">`;
  [VZ_RIN, (VZ_RIN + VZ_ROUT) / 2, VZ_ROUT].forEach(r => { s += `<circle class="ring" cx="${VZ_C}" cy="${VZ_C}" r="${r}"/>`; });
  for (let y = 2009; y <= 2011; y++) {
    const a = vzAngle(Date.UTC(y, 0, 1) / 1000), x2 = VZ_C + 480 * Math.cos(a), y2 = VZ_C + 480 * Math.sin(a);
    s += `<line class="spoke" x1="${VZ_C + 60 * Math.cos(a)}" y1="${VZ_C + 60 * Math.sin(a)}" x2="${x2}" y2="${y2}"/>`;
    s += `<text class="yr" x="${VZ_C + 492 * Math.cos(a)}" y="${VZ_C + 492 * Math.sin(a) + 5}" text-anchor="${Math.cos(a) > .2 ? "start" : Math.cos(a) < -.2 ? "end" : "middle"}">${y}</text>`;
  }
  const a0 = vzAngle(MAP.START);
  s += `<text class="yr" x="${VZ_C + 492 * Math.cos(a0)}" y="${VZ_C + 492 * Math.sin(a0) - 2}" text-anchor="start">Aug 2008</text>`;
  s += `<text class="hint" x="${VZ_C - 14}" y="${VZ_C - 476}" text-anchor="end">first contact, clockwise →</text>`;
  s += `<g id="vzedges">${P.map(p => `<line class="edge" data-p="${p.slug}" x1="${VZ_C}" y1="${VZ_C}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${chColor(p.main)}" stroke-opacity="${(.12 + .5 * (p.score / P[0].score) ** .5).toFixed(2)}"/>`).join("")}</g>`;
  s += `<g id="vznodes">${P.slice().reverse().map(p => nodeShape(p, p.r)).join("")}</g>`;
  // label the most connected people, skipping any label that would collide with one already placed
  const boxes = [], labels = [];
  for (const p of P.slice(0, 40)) {
    if (labels.length >= 16) break;
    const dx = p.x - VZ_C, dy = p.y - VZ_C, d = Math.hypot(dx, dy) || 1, off = p.r + 7;
    const lx = p.x + dx / d * off, ly = p.y + dy / d * off + 6, w = p.name.length * 9.6 + 4, right = dx > 0;
    const box = { x0: right ? lx : lx - w, x1: right ? lx + w : lx, y0: ly - 16, y1: ly + 4 };
    if (boxes.some(b => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) continue;
    if (Math.hypot((box.x0 + box.x1) / 2 - VZ_C, (box.y0 + box.y1) / 2 - VZ_C) < 64) continue;
    boxes.push(box);
    labels.push(`<text class="lbl" data-p="${p.slug}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${right ? "start" : "end"}">${esc(p.name)}</text>`);
  }
  s += `<g id="vzlabels">${labels.join("")}</g>`;
  s += `<g class="sat"><circle cx="${VZ_C}" cy="${VZ_C}" r="46" fill="#f7931a"/>
    <g transform="translate(${VZ_C - 20 * 2.2} ${VZ_C - 18 * 2.2}) scale(2.2)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0 1.5) rotate(14 20 17)"><path d="M17.2 12.2v9.6M17.2 12.2h3.1a2.35 2.35 0 0 1 0 4.7h-3.1M17.2 16.9h3.6a2.45 2.45 0 0 1 0 4.9h-3.6"/><path d="M18.5 10.7v1.5M20.4 10.7v1.5M18.5 21.8v1.5M20.4 21.8v1.5"/></g></g>
    <text x="${VZ_C}" y="${VZ_C + 70}" text-anchor="middle">Satoshi</text></g>`;
  s += `</svg><div class="vz-tip" id="vztip" hidden></div>`;
  $("#vzstage").innerHTML = s;
  const stage = $("#vzstage");
  stage.addEventListener("pointermove", e => {
    const n = e.target.closest && e.target.closest(".node");
    if (!n) { vzTipHide(); vzHover(null); return; }
    const p = MAP.BY.get(n.dataset.p), tip = $("#vztip"), r = stage.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(p.name)}</b>${fmtNum(vzEx(p))} messages exchanged · ${p.nthreads} conversation${p.nthreads === 1 ? "" : "s"}<br>${CH_NAME[p.main]} · first ${esc(shortDate(p.first))}`;
    tip.hidden = false;
    const x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    tip.style.left = Math.min(x, r.width - tip.offsetWidth - 8) + "px";
    tip.style.top = Math.min(y, r.height - tip.offsetHeight - 8) + "px";
    vzHover(p.slug);
  });
  stage.addEventListener("pointerleave", () => { vzTipHide(); vzHover(null); });
  stage.addEventListener("click", e => {
    const n = e.target.closest(".node");
    location.hash = n ? "#map~p~" + n.dataset.p : "#map";
  });
}
const vzEx = p => p.cum[VZ_T];
function vzTipHide() { const t = $("#vztip"); if (t) t.hidden = true; }
function vzHover(slug) {
  const focus = slug || VZ_SEL;
  document.querySelectorAll("#vzstage .edge").forEach(l => {
    const on = l.dataset.p === focus;
    l.style.strokeOpacity = on ? 1 : ""; l.style.strokeWidth = on ? 2.5 : "";
  });
}
function vzVisible(p) { return p.firstI <= VZ_T && (VZ_FILTER === "all" || p.main === VZ_FILTER); }
function vzSetT(t) {
  VZ_T = t;
  const inp = $("#vzt"); if (!inp) return;
  inp.value = t;
  $("#vzto").textContent = MAP.monthLabel(t);
  const shown = MAP.P.filter(p => p.firstI <= t);
  $("#vzts").textContent = `${fmtNum(shown.length)} people · ${fmtNum(MAP.satCum[t])} messages and ${fmtNum(MAP.comCum[t])} commits by Satoshi so far`;
  document.querySelectorAll("#vznodes .node").forEach(n => {
    const p = MAP.BY.get(n.dataset.p), vis = vzVisible(p);
    n.classList.toggle("off", !vis);
    if (vis) {
      const r = vzNodeR(Math.max(1, p.cum[t]));
      if (n.tagName === "circle") n.setAttribute("r", r.toFixed(1));
      else { n.setAttribute("x", (p.x - r * .8).toFixed(1)); n.setAttribute("y", (p.y - r * .8).toFixed(1)); n.setAttribute("width", (r * 1.6).toFixed(1)); n.setAttribute("height", (r * 1.6).toFixed(1)); }
    }
  });
  document.querySelectorAll("#vzedges .edge, #vzlabels .lbl").forEach(el => { const vis = vzVisible(MAP.BY.get(el.dataset.p)); el.style.display = vis ? "" : "none"; });
  if (VZ_MODE === "list") drawList();
  drawSide();
}
function vzFilter(k) {
  VZ_FILTER = k;
  document.querySelectorAll("#vzbody [data-vzf]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.vzf === k)));
  vzSetT(VZ_T);
}
function vzMode(m) {
  VZ_MODE = m;
  document.querySelectorAll("#vzbody [data-vzm]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.vzm === m)));
  $("#vzstage").hidden = m !== "diagram"; $("#vzlist").hidden = m !== "list";
  if (m === "list") drawList();
}
function drawList() {
  const rows = MAP.P.filter(vzVisible).sort((a, b) => b.cum[VZ_T] - a.cum[VZ_T] || a.name.localeCompare(b.name));
  $("#vzlist").innerHTML = `<table><thead><tr><th>Person</th><th>Channel</th><th class="num">Messages exchanged</th><th class="num">Conversations</th><th>First</th><th>Last</th></tr></thead><tbody>${rows.map(p =>
    `<tr><td><button data-vzp="${p.slug}">${esc(p.name)}</button></td><td><i class="${p.main}" style="background:${chColor(p.main)}"></i>${CH_NAME[p.main]}</td><td class="num">${fmtNum(p.cum[VZ_T])}</td><td class="num">${p.nthreads}</td><td>${esc(shortDate(p.first))}</td><td>${esc(shortDate(p.last))}</td></tr>`).join("")}</tbody></table>`;
}
function vzSelect(slug, push = true) {
  if (push) { location.hash = slug ? "#map~p~" + slug : "#map"; return; }
  VZ_SEL = slug;
  document.querySelectorAll("#vznodes .node").forEach(n => { n.classList.toggle("sel", n.dataset.p === slug); n.classList.toggle("dim", !!slug && n.dataset.p !== slug); });
  document.querySelectorAll("#vzedges .edge").forEach(n => n.classList.toggle("dim", !!slug && n.dataset.p !== slug));
  document.querySelectorAll("#vzlabels .lbl").forEach(n => { n.classList.toggle("sel", n.dataset.p === slug); n.classList.toggle("dim", !!slug && n.dataset.p !== slug); });
  if (slug && !document.querySelector(`#vzlabels .lbl[data-p="${slug}"]`)) {
    const p = MAP.BY.get(slug), dx = p.x - VZ_C, dy = p.y - VZ_C, d = Math.hypot(dx, dy) || 1, off = p.r + 6;
    $("#vzlabels").insertAdjacentHTML("beforeend", `<text class="lbl sel tmp" data-p="${slug}" x="${(p.x + dx / d * off).toFixed(1)}" y="${(p.y + dy / d * off + 5).toFixed(1)}" text-anchor="${dx > 0 ? "start" : "end"}">${esc(p.name)}</text>`);
  }
  document.querySelectorAll("#vzlabels .tmp").forEach(n => { if (n.dataset.p !== slug) n.remove(); });
  if (slug) { const p = MAP.BY.get(slug); if (p.firstI > VZ_T) vzSetT(MAP.N - 1); }
  vzHover(null);
  drawSide();
  if (MAP_OPEN) updateTitle();
}
function drawSide() {
  const side = $("#vzside"); if (!side) return;
  const p = VZ_SEL && MAP.BY.get(VZ_SEL);
  if (!p) {
    const top = MAP.P.filter(vzVisible).sort((a, b) => b.cum[VZ_T] - a.cum[VZ_T]).slice(0, 10);
    side.innerHTML = `<h2>Satoshi's circle</h2><p class="sub">${esc(shortDate(MAP.START))} – ${esc(MAP.monthLabel(VZ_T))}</p>
      <div class="vz-stats"><div><b>${fmtNum(MAP.P.filter(q => q.firstI <= VZ_T).length)}</b><small>people</small></div><div><b>${fmtNum(MAP.satCum[VZ_T])}</b><small>messages by Satoshi</small></div>
        <div><b>${fmtNum(MAP.comCum[VZ_T])}</b><small>commits</small></div><div><b>${fmtNum(MAP.P.filter(q => q.firstI <= VZ_T && q.main === "x").length)}</b><small>private correspondents</small></div></div>
      <h3>How to read it</h3>
      <div class="vz-key">${["e", "p", "x"].map(k => `<span><i class="${k}" style="background:${chColor(k)}"></i>${CH_NAME[k]}${k === "x" ? " (diamonds)" : ""}</span>`).join("")}
        <span class="note">Each mark is a person. Clockwise from the top: when they first exchanged messages with Satoshi. Closer to the centre: more messages and conversations with him. Size: messages exchanged so far.</span></div>
      <h3>Most connected${VZ_T < MAP.N - 1 ? " so far" : ""}</h3>
      <ol class="vz-top10">${top.map((q, i) => `<li><button data-vzp="${q.slug}"><span class="c">${i + 1}</span><i class="${q.main}" style="background:${chColor(q.main)}"></i><span>${esc(q.name)}</span><span class="n">${fmtNum(q.cum[VZ_T])}</span></button></li>`).join("")}</ol>`;
    return;
  }
  const max = Math.max(...p.month, 1), w = 100 / MAP.N;
  const spark = `<svg class="vz-spark" viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-label="Messages with Satoshi by month">${p.month.map((v, i) => v ? `<rect x="${(i * w + w * .12).toFixed(2)}" y="${(44 - 40 * v / max).toFixed(2)}" width="${(w * .76).toFixed(2)}" height="${(40 * v / max).toFixed(2)}" rx=".6" style="fill:${chColor(p.main)}"><title>${MAP.monthLabel(i)}: ${v}</title></rect>` : "").join("")}</svg>`;
  const threads = [...p.threads.entries()].sort((a, b) => b[1] - a[1] || a[0].first - b[0].first).slice(0, 6);
  const art = p.art && WBY.get(p.art);
  const q = [...p.aliases].find(a => !a.includes("@")) || p.name;
  side.innerHTML = `<button class="vz-back" data-vzp="">${ic("arrow_back")}All connections</button>
    <h2>${esc(p.name)}</h2><p class="sub">${CH_NAME[p.main]}${p.aliases.size > 1 ? ` · also ${esc([...p.aliases].filter(a => a !== p.name).slice(0, 2).join(", "))}` : ""}</p>
    <div class="vz-stats"><div><b>${fmtNum(p.ex)}</b><small>messages exchanged</small></div><div><b>${p.nthreads}</b><small>conversations</small></div>
      <div><b>${esc(shortDate(p.first))}</b><small>first</small></div><div><b>${esc(shortDate(p.last))}</b><small>last</small></div></div>
    <h3>Month by month, ${esc(MAP.monthLabel(0))} – ${esc(MAP.monthLabel(MAP.N - 1))}</h3>${spark}
    <h3>Conversations with Satoshi</h3>
    <div class="vz-threads">${threads.map(([t, n]) => `<a href="#t-${t.id}"><span>${esc(t.t)}</span><small>${n}</small></a>`).join("")}</div>
    <div class="vz-acts">${art ? `<a class="pillbtn" href="#wiki-${art.slug}">${ic("menu_book")}Satoshipedia</a>` : ""}<a class="pillbtn" href="#search-${encodeURIComponent(`from:"${q.toLowerCase()}"`)}">${ic("mail")}Messages</a></div>`;
}
function vzStop() { if (VZ_PLAY) { clearInterval(VZ_PLAY); VZ_PLAY = null; const b = $("#vzplay"); if (b) { b.innerHTML = ic("play_arrow"); b.setAttribute("aria-label", "Play from the start"); } } }
function vzPlay() {
  if (VZ_PLAY) { vzStop(); return; }
  if (VZ_T >= MAP.N - 1) vzSetT(0);
  const b = $("#vzplay"); b.innerHTML = ic("pause"); b.setAttribute("aria-label", "Pause");
  VZ_PLAY = setInterval(() => { if (VZ_T >= MAP.N - 1) { vzStop(); return; } vzSetT(VZ_T + 1); }, REDUCED ? 600 : 320);
}

/* ── timeline ── */
function renderTimeline() {
  const body = $("#vzbody");
  if (body.dataset.view === "tl") return;
  body.dataset.view = "tl";
  const N = MAP.N, L = 56, R = 16, CW = 30, W = L + R + N * CW, H = 230, top = 16, base = top + 170;
  const tot = i => MAP.sat.e[i] + MAP.sat.p[i] + MAP.sat.x[i] + MAP.sat.c[i];
  const max = Math.max(...Array.from({ length: N }, (_, i) => tot(i)));
  const step = max > 120 ? 50 : max > 60 ? 25 : 10, yMax = Math.ceil(max / step) * step;
  const y = v => base - (base - top) * v / yMax;
  const X = i => L + i * CW;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Satoshi's messages and commits per month, ${MAP.monthLabel(0)} to ${MAP.monthLabel(N - 1)}">`;
  for (let v = 0; v <= yMax; v += step) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  for (let i = 0; i < N; i++) {
    let acc = 0;
    for (const k of ["e", "p", "x", "c"]) {
      const v = MAP.sat[k][i]; if (!v) continue;
      const y0 = y(acc), y1 = y(acc + v); acc += v;
      s += `<rect x="${X(i) + 5}" y="${(y1 + 1).toFixed(1)}" width="${CW - 10}" height="${Math.max(1, y0 - y1 - 2).toFixed(1)}" rx="3" fill="${chColor(k)}"/>`;
    }
    const v = MAP.M0 + i;
    s += `<text class="ax${v % 12 === 0 || i === 0 ? " yr" : ""}" x="${X(i) + CW / 2}" y="${base + 16}" text-anchor="middle">${v % 12 === 0 || i === 0 ? Math.floor(v / 12) : MON[v % 12][0]}</text>`;
    s += `<rect class="hit" data-i="${i}" x="${X(i)}" y="${top}" width="${CW}" height="${base - top}"/>`;
  }
  s += `<line class="base" x1="${L}" x2="${W - R}" y1="${base}" y2="${base}"/></svg>`;

  // milestones on the same month axis
  const ms = MILESTONES.filter(m => !m.off);
  const placed = [], lanes = [];
  ms.forEach(o => {
    const i = Math.max(0, Math.min(N - 1, MAP.ym(o.d) - MAP.M0)), frac = (dt(o.d).getUTCDate() - .5) / 31, x = X(i) + frac * CW;
    const wpx = o.t.length * 6.4 + 12, left = x + wpx > W - R;            // near the right edge, put the label left of its dot
    const iv = left ? [x - wpx, x + 6] : [x - 6, x + wpx];
    let lane = lanes.findIndex(L => L.every(([a, b]) => iv[1] + 6 < a || iv[0] - 6 > b));
    if (lane < 0) { lanes.push([]); lane = lanes.length - 1; }
    lanes[lane].push(iv);
    placed.push({ o, x, lane, left });
  });
  const MH = 30 + lanes.length * 22;
  let m = `<svg viewBox="0 0 ${W} ${MH}" role="img" aria-label="Milestones">`;
  placed.forEach(({ o, x, lane, left }) => {
    const ly = 22 + lane * 22;
    m += `<line class="ms-line" x1="${x}" x2="${x}" y1="0" y2="${ly - 4}"/><circle class="ms-dot" cx="${x}" cy="${ly - 4}" r="4.5"/>`;
    m += `<a href="${o.wiki ? "#wiki-" + o.wiki : o.href}"><text class="ms-lbl" x="${left ? x - 8 : x + 8}" y="${ly}" text-anchor="${left ? "end" : "start"}">${esc(o.t)}</text><title>${esc(longDay(o.d))}: ${esc(o.s)}</title></a>`;
  });
  m += `</svg>`;

  // who he was talking to, month by month
  const lanesP = MAP.P.slice(0, 14), RH = 26, SH = lanesP.length * RH + 8, LW = 150;
  const SW = LW + N * CW + R;
  const maxM = Math.max(...lanesP.flatMap(p => p.month));
  let sw = `<svg viewBox="0 0 ${SW} ${SH}" role="img" aria-label="Messages exchanged with Satoshi per month, top 14 correspondents">`;
  lanesP.forEach((p, r) => {
    const cy = 4 + r * RH + RH / 2;
    if (r % 2 === 0) sw += `<rect class="lane-bg" x="0" y="${cy - RH / 2}" width="${SW}" height="${RH}" rx="4"/>`;
    sw += `<text class="lane-name" data-vzgo="${p.slug}" x="8" y="${cy + 4}">${esc(p.name)}</text>`;
    p.month.forEach((v, i) => { if (v) sw += `<circle cx="${LW + i * CW + CW / 2}" cy="${cy}" r="${(2.5 + 8 * Math.sqrt(v / maxM)).toFixed(1)}" fill="${chColor(p.main)}" stroke="var(--surface)" stroke-width="1.5"><title>${esc(p.name)}, ${MAP.monthLabel(i)}: ${v}</title></circle>`; });
  });
  sw += `</svg>`;

  const list = MILESTONES.map(o => `<li class="${o.off ? "off" : ""}"><time>${esc(longDay(o.d))}${o.approx ? " (approx.)" : ""}</time><b>${esc(o.t)}</b><p>${esc(o.s)}</p>
    ${o.href ? `<a href="${o.href}" data-vzmi="${o.mi ?? ""}">${o.href.startsWith("#t-c") ? "Open commit" : "Open message"}</a>` : ""}${o.wiki ? `<a href="#wiki-${o.wiki}">Satoshipedia</a>` : ""}</li>`).join("");

  body.innerHTML = `<div class="vz-tl">
    <h2>Satoshi, start to finish</h2>
    <p class="lead">From his first known email on ${esc(longDay(MAP.START))} to his last on ${esc(longDay(MAP.END))}: every message and commit in the archive, month by month, with the moments that mattered.</p>
    <div class="vz-legend">${["e", "p", "x", "c"].map(k => `<span><i style="background:${chColor(k)}"></i>${k === "c" ? "Commits" : CH_NAME[k]}</span>`).join("")}</div>
    <div class="vz-scroll" id="vzbars">${s}<div class="vz-tip" id="vztip2" hidden></div></div>
    <div class="vz-scroll">${m}</div>
    <p class="note">Busiest month: ${(() => { let bi = 0; for (let i = 0; i < N; i++) if (tot(i) > tot(bi)) bi = i; return `${MAP.monthLabel(bi)}, with ${fmtNum(tot(bi))} messages and commits`; })()}. Hover a month for the breakdown; select a milestone for its Satoshipedia article.</p>
    <h3>Who he was talking to</h3>
    <p class="note">The 14 people who exchanged the most with Satoshi. Each dot is a month; bigger means more messages. Select a name to see them on the map.</p>
    <div class="vz-scroll">${sw}</div>
    <h3>Milestones</h3>
    <ol class="vz-mlist">${list}</ol>
  </div>`;
  const bars = $("#vzbars");
  bars.addEventListener("pointermove", e => {
    const h = e.target.closest && e.target.closest(".hit"), tip = $("#vztip2");
    if (!h) { tip.hidden = true; return; }
    const i = +h.dataset.i, r = bars.getBoundingClientRect();
    tip.innerHTML = `<b>${MAP.monthLabel(i)}</b>${["e", "p", "x", "c"].map(k => `${k === "c" ? "Commits" : CH_NAME[k]}: ${fmtNum(MAP.sat[k][i])}`).join("<br>")}`;
    tip.hidden = false;
    tip.style.left = Math.min(e.clientX - r.left + 12 + bars.scrollLeft, bars.scrollWidth - tip.offsetWidth - 8) + "px";
    tip.style.top = Math.max(0, e.clientY - r.top - tip.offsetHeight - 8) + "px";
  });
  bars.addEventListener("pointerleave", () => { $("#vztip2").hidden = true; });
}

/* ── interactions ── */
document.addEventListener("click", e => {
  const c = e.target.closest && e.target.closest("[data-vz]");
  if (c) { e.preventDefault(); ({ close: mapClose, max: mapToggleMax })[c.dataset.vz](); }
});
$("#vzwin").addEventListener("click", e => {
  const t = e.target;
  const f = t.closest("[data-vzf]"); if (f) { vzFilter(f.dataset.vzf); return; }
  const md = t.closest("[data-vzm]"); if (md) { vzMode(md.dataset.vzm); return; }
  const pp = t.closest("[data-vzp]"); if (pp) { vzSelect(pp.dataset.vzp || null); return; }
  const go = t.closest("[data-vzgo]"); if (go) { location.hash = "#map~p~" + go.dataset.vzgo; return; }
  if (t.closest("#vzplay")) { vzPlay(); return; }
  const a = t.closest("a[href]");
  if (a && /^#t-/.test(a.getAttribute("href") || "")) {
    LAST_LIST = location.hash;
    const id = a.getAttribute("href").slice(3), mi = a.dataset.vzmi;
    HIT = mi ? { id, hits: [+mi], terms: [] } : null;
  }
});
function mapKey(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  if (e.key === "Escape") {
    if ($("#layer").childElementCount) closeLayer();
    else if (VZ_SEL) vzSelect(null);
    else mapClose();
    return;
  }
  if (tag === "input" || e.metaKey || e.ctrlKey || e.altKey) return;
  if (VZ_VIEW === "net" && (e.key === " " || e.key === "k") && tag !== "button") { e.preventDefault(); vzPlay(); }
}

/* ── page titles and the hidden page heading follow the current view ── */
function updateTitle() {
  const h1 = $("#apph1");
  let t;
  if (MAP_OPEN) {
    const p = VZ_SEL && MAP.BY.get(VZ_SEL);
    t = (VZ_VIEW === "tl" ? "Timeline" : p ? `${p.name}: connections` : "Connections") + " – Satoshi Map";
    if (h1) h1.hidden = true;
  } else if (WK_STATE === "open") {
    t = WK_TITLE === "Main page" ? "Satoshipedia, the Satoshi Mail encyclopedia" : `${WK_TITLE} – Satoshipedia`;
    if (h1) h1.hidden = true;
  } else {
    const r = ROUTE || {};
    let name;
    if (r.view === "thread") { const th = (typeof BY_ID !== "undefined" && BY_ID.get(r.id)) || COMMITS.find(c => c.id === r.id); name = th ? (th.t || th.s) : "Conversation"; }
    else if (r.search != null) name = `Search: ${r.search}`;
    else if (r.label) name = (LISTS[r.label] && LISTS[r.label].name) || r.label;
    else if (r.topic) name = CAT_NAME[r.topic] || r.topic;
    else name = { sent: "Sent", commits: "Commits", people: "People", activity: "Daily Activity", about: "About", sources: "Sources", drafts: "Drafts" }[r.view]
      || { starred: "Starred", all: "All Mail" }[r.folder]
      || (r.tab === "forums" ? "Inbox: Forums" : r.tab === "private" ? "Inbox: Private email" : "Inbox");
    t = `${name} – Satoshi Mail`;
    if (h1) { h1.hidden = r.view === "thread"; h1.textContent = `Satoshi Mail: ${name}`; }
  }
  document.title = t;
}
/* ═════════════ AI Overview on search ═════════════
   Searching shows an overview card above the results. Where the viewer's Claude is available
   (the published artifact, via the `sample` capability) it answers the search or question in a few
   sentences, using ONLY this archive and Satoshipedia, and cites the messages and articles it used.
   It can look further with two read-only page tools (search the archive, read an article).
   Elsewhere (the Cloudflare site, or a viewer who declines) the card falls back to the matching
   Satoshipedia summary, so it never depends on AI. Nothing is sent until the viewer asks once;
   after that, later searches get an overview automatically until they turn it off. */
const ASK_KEY = "satoshimail-ai-overview";
let ASK_AUTO = false;
try { ASK_AUTO = localStorage.getItem(ASK_KEY) === "1"; } catch (e) {}
let ASK_SAMPLE;          // undefined: not looked up yet; null: unavailable in this view
let ASK_DEAD = false;    // the viewer declined, or Claude is off for them: don't offer again this view
let ASK_CTL = null, ASK_SEQ = 0;
function askSample() {
  if (ASK_SAMPLE !== undefined) return Promise.resolve(ASK_SAMPLE);
  const c = window.claude;
  if (!c || typeof c.use !== "function") { ASK_SAMPLE = null; return Promise.resolve(null); }
  return c.use("sample").then(s => (ASK_SAMPLE = s || null), () => (ASK_SAMPLE = null));
}
askSample();

const ASK_STOP = new Set("a an and are as at be by can did do does for from had has have he her his how i in is it its me my of on or so tell that the their there this to was were what when where which who why will with would you about any ever".split(" "));
function askWords(q) {
  const w = askWordsAll(q), rest = w.filter(x => x !== "satoshi" && x !== "nakamoto" && x !== "satoshi's");
  return rest.length ? rest : w;
}
function askWordsAll(q) {
  return parseQuery(q).terms.filter(w => !w.includes(":")).map(w => w.replace(/[^\p{L}\p{N}.'-]/gu, ""))
    .filter(w => w.length > 1 && !ASK_STOP.has(w));
}
const askStem = w => w.length > 4 ? w.replace(/(ies|es|s)$/, "") : w;

const askPlain = html => html.replace(/<sup[^>]*>.*?<\/sup>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
function askArticleText(a, max = 3000) {
  const parts = [a.title + ": " + a.short, askPlain(a.lead || "")];
  for (const s of a.sections || []) parts.push(s.h + ". " + askPlain(s.html || ""));
  const t = parts.join("\n");
  return t.length > max ? t.slice(0, max) + " …" : t;
}
function askArticles(words, n = 3) {
  const st = words.map(askStem);
  const scored = WA.map(a => {
    const head = (a.title + " " + (a.aliases || []).join(" ")).toLowerCase(), body = askArticleText(a, 20000).toLowerCase();
    let s = 0;
    for (const w of st) { if (head.includes(w)) s += 10; if (a.short.toLowerCase().includes(w)) s += 4; s += Math.min(5, body.split(w).length - 1); }
    return { a, s };
  }).filter(x => x.s > 0).sort((x, y) => y.s - x.s);
  return scored.slice(0, n).map(x => x.a);
}
function askMessages(words, n = 8) {
  if (!INDEX) buildIndex();
  const st = words.map(askStem), out = [];
  THREADS.forEach(t => t.m.forEach((m, i) => {
    const tx = INDEX[t.idx].msgs[i].text;
    let s = 0, first = -1;
    for (const w of st) { const k = tx.indexOf(w); if (k >= 0) { s += 3 + Math.min(4, tx.split(w).length - 2); if (first < 0 || k < first) first = k; } }
    if (!s) return;
    if (m.s) s += 2;
    out.push({ t, m, i, s, first });
  }));
  out.sort((a, b) => b.s - a.s || a.m.d - b.m.d);
  return out.slice(0, n).map(x => {
    const text = msgText(x.m).replace(/\s+/g, " "), at = Math.max(0, x.first - 120);
    return { ref: "t-" + x.t.id, from: x.m.s ? "Satoshi Nakamoto" : x.m.f, date: shortDate(x.m.d), title: x.t.t,
      where: LISTS[x.t.s] ? LISTS[x.t.s].name : x.t.s, text: (at ? "…" : "") + text.slice(at, at + 520) + (text.length > at + 520 ? "…" : "") };
  });
}
const askFmtMsg = r => `[${r.ref}] ${r.from}, ${r.date}, “${r.title}” (${r.where}): ${r.text}`;
const askFmtArt = a => `[wiki-${a.slug}] ${askArticleText(a)}`;

function askPrompt(q, words) {
  const arts = askArticles(words), msgs = askMessages(words);
  const main = WBY.get("satoshi-nakamoto");
  if (main && !arts.includes(main) && /satoshi|nakamoto|he\b|his\b/i.test(q)) arts.push(main);
  const catalog = WA.map(a => `wiki-${a.slug}: ${a.title} — ${a.short}`).join("\n");
  return `You write the short "AI Overview" shown above search results in Satoshi Mail, an archive of Satoshi Nakamoto's emails, forum posts and code commits (2008–2011), with an encyclopedia called Satoshipedia.

Rules:
- Use ONLY the sources below and what the tools return. Do not use outside knowledge. If they don't answer the question, say plainly that the archive and Satoshipedia don't say, and mention the closest thing they do contain.
- Be neutral about who Satoshi was; report claims as claims.
- 2 to 4 sentences, under 90 words, plain text: no headings, no lists, no markdown.
- After each fact, cite its source by its bracketed id, exactly as given, e.g. [t-e1] or [wiki-hal-finney]. Only cite ids that appear below or in tool results.
- If the search is just a name or a topic, describe who or what it is and how it relates to Satoshi.
- Write only the overview itself. Never describe your searching.${ASK_TOOLS_OK ? "\n- If the sources below are not enough, call search_archive (try other words, e.g. synonyms) or read_article before answering." : ""}

Search: ${q}

Satoshipedia articles (id: title — summary):
${catalog}

Most relevant articles:
${arts.length ? arts.map(askFmtArt).join("\n\n") : "(none matched)"}

Most relevant messages:
${msgs.length ? msgs.map(askFmtMsg).join("\n\n") : "(none matched the search words)"}`;
}
let ASK_TOOLS_OK = false;
const ASK_TOOLS = [
  { name: "search_archive", description: "Search Satoshi Mail's emails and forum posts for words. Returns up to 8 matching messages with their [t-…] ids, sender, date, thread title and an excerpt.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "One or more words, e.g. 'photo picture image'" } }, required: ["query"] },
    execute(input) { const w = askWords(String(input.query || "")); if (!w.length) throw new Error("no search words"); const r = askMessages(w); return r.length ? r.map(askFmtMsg).join("\n\n") : "No messages matched."; } },
  { name: "read_article", description: "Read a Satoshipedia article by its id (e.g. 'wiki-hal-finney'). Returns its text.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    execute(input) { const a = WBY.get(String(input.id || "").replace(/^\[?wiki-/, "").replace(/\]$/, "")); if (!a) throw new Error("no such article"); return askFmtArt(a); } },
];

/* rendering */
function askCite(text) {
  let n = 0;
  const seen = new Map();
  return esc(text).replace(/\[((?:t-[a-z0-9]+)|(?:wiki-[a-z0-9-]+))\]/g, (m, id) => {
    const ok = id.startsWith("wiki-") ? WBY.has(id.slice(5)) : THREADS.some(t => "t-" + t.id === id);
    if (!ok) return "";
    if (!seen.has(id)) seen.set(id, ++n);
    const label = id.startsWith("wiki-") ? WBY.get(id.slice(5)).title : (THREADS.find(t => "t-" + t.id === id) || {}).t;
    return `<a class="ask-ref" href="#${id}" title="${esc(label || "")}">${seen.get(id)}</a>`;
  }).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").split(/\n{2,}/).map(p => `<p>${p}</p>`).join("");
}
function askFallback(words) {
  const a = askArticles(words, 1)[0];
  if (!a) return "";
  return `<p><b>${esc(a.title)}</b> · ${esc(a.short)} <a href="#wiki-${a.slug}">Read in Satoshipedia</a></p>`;
}
function askCardHtml(q, page) {
  if (page > 1 || !askWords(q).length) return "";
  return `<section class="ask" id="ask" aria-live="polite" aria-busy="false"><div class="ask-h">${ic("auto_awesome")}<b>AI Overview</b><span class="grow"></span><span class="ask-ctl"></span></div><div class="ask-b"></div><div class="ask-f"></div></section>`;
}
/* The overview's state lives here, not in the DOM: the list re-renders (star, sort, read state)
   just repaint the card, and never start a second request for the same search. */
const ASK = { q: null, state: "idle", body: "", foot: "", title: "AI Overview", busy: false };
function askPaint() {
  const card = $("#ask");
  if (!card || ROUTE.search !== ASK.q) return;
  if (ASK.state === "none") { card.remove(); return; }
  card.querySelector(".ask-h b").textContent = ASK.title;
  card.querySelector(".ask-b").innerHTML = ASK.body;
  card.querySelector(".ask-f").innerHTML = ASK.foot;
  card.querySelector(".ask-ctl").innerHTML = ASK.busy ? `<button class="linkbtn" data-act="ask-stop">Stop</button>` : "";
  card.setAttribute("aria-busy", String(ASK.busy));
}
function askSet(o) { Object.assign(ASK, o); askPaint(); }
function askStop() { if (ASK_CTL) { ASK_CTL.abort(); ASK_CTL = null; } }
function askPlainCard(words) {
  const fb = askFallback(words);
  return fb ? { state: "plain", title: "Overview", body: fb, foot: "From Satoshipedia.", busy: false } : { state: "none", busy: false };
}
async function askMount(q) {
  if (!$("#ask")) return;
  if (ASK.q === q && ASK.state !== "idle") { askPaint(); return; }   // same search: repaint only
  askStop();
  const seq = ++ASK_SEQ, words = askWords(q);
  Object.assign(ASK, { q, state: "idle", title: "AI Overview", body: "", foot: "", busy: false });
  const sample = await askSample();
  if (seq !== ASK_SEQ) return;
  if (!sample || ASK_DEAD) { askSet(askPlainCard(words)); return; }
  if (!ASK_AUTO) {
    const fb = askFallback(words);
    askSet({ state: "offer", body: (fb || "") + `<p class="ask-offer"><button class="pillbtn primary" data-act="ask-go">${ic("auto_awesome")}Ask AI about “${esc(q.length > 60 ? q.slice(0, 60) + "…" : q)}”</button></p>`,
      foot: "Answers only from this archive and Satoshipedia, with links to its sources. Uses your Claude account." });
    return;
  }
  askRun(q, seq);
}
async function askRun(q, seq = ++ASK_SEQ) {
  const sample = ASK_SAMPLE, words = askWords(q);
  if (!sample) return;
  askStop();
  const ac = new AbortController(); ASK_CTL = ac;
  ASK.q = q;
  askSet({ state: "running", title: "AI Overview", body: `<p class="ask-wait"><span class="ask-dots"></span>Reading the archive…</p>`, foot: "", busy: true });
  const lim = await sample.limits().catch(() => null);
  if (seq !== ASK_SEQ) return;
  ASK_TOOLS_OK = !!(lim && lim.tools);
  const opts = { signal: ac.signal, modelTier: "quick", onText: ({ text }) => { if (seq === ASK_SEQ) askSet({ body: askCite(text) }); } };
  if (ASK_TOOLS_OK) opts.tools = ASK_TOOLS; else opts.cache = { gcTime: 86400000 };
  try {
    const { text, truncated } = await sample(askPrompt(q, words), opts);
    if (seq !== ASK_SEQ) return;
    askSet({ state: "done", body: askCite(text), busy: false,
      foot: `AI-generated from the archive and Satoshipedia; it can make mistakes, so check the numbered sources.${truncated ? " (Cut short.)" : ""} <button class="linkbtn" data-act="ask-off">Turn off AI overviews</button>` });
  } catch (e) {
    if (seq !== ASK_SEQ) return;
    const code = e && e.code;
    if (code === "cancelled") {
      askSet({ state: "done", busy: false, body: e.text ? askCite(e.text) : (askFallback(words) || "<p>Stopped.</p>"), foot: "Stopped." });
    } else if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(code)) {
      ASK_DEAD = true;
      askSet(askPlainCard(words));
    } else {
      const msg = code === "rate_limited" ? "Too many AI requests just now. Try again in a little while."
        : code === "session_expired" ? "Sign in to Claude again to use AI overviews."
        : code === "refused" ? "The AI couldn't answer this search."
        : "The AI overview didn't finish.";
      askSet({ state: "error", busy: false, foot: "",
        body: (e && e.text && code !== "refused" ? askCite(e.text) : "") + `<p class="ask-err">${esc(msg)}</p>` + (code === "rate_limited" || code === "session_expired" ? "" : `<p><button class="linkbtn" data-act="ask-retry">Try again</button></p>`) });
    }
  } finally {
    if (ASK_CTL === ac) ASK_CTL = null;
    if (ASK.busy && seq === ASK_SEQ) askSet({ busy: false });
  }
}
ACTIONS["ask-go"] = () => { ASK_AUTO = true; try { localStorage.setItem(ASK_KEY, "1"); } catch (e) {} if (ROUTE.search != null) askRun(ROUTE.search); };
ACTIONS["ask-retry"] = () => { if (ROUTE.search != null) askRun(ROUTE.search); };
ACTIONS["ask-stop"] = () => askStop();
ACTIONS["ask-off"] = () => {
  ASK_AUTO = false; try { localStorage.removeItem(ASK_KEY); } catch (e) {}
  askSet({ foot: "AI overviews are off. The next search will offer one again." });
};
/* ═════════════ Sources page (#sources, from Settings → Archive) ═════════════
   One place listing where everything comes from, instead of source chips on each conversation.
   Counts are computed from the archive, so they always match what Satoshi Mail shows. */
function renderSources() {
  CURRENT_LIST = [];
  const sat = t => t.m.filter(m => m.s).length;
  const group = pred => { const ts = THREADS.filter(pred); return { t: ts.length, m: ts.reduce((n, t) => n + t.m.length, 0), s: ts.reduce((n, t) => n + sat(t), 0) }; };
  const lists = [...new Set(THREADS.filter(t => t.k !== "x").map(t => t.s))].map(s => ({ s, name: LISTS[s] ? LISTS[s].long : s, ...group(t => t.s === s) }));
  const priv = group(t => t.k === "x");
  let snLinked = 0;
  THREADS.forEach(t => t.m.forEach((m, i) => { if (SATOSHIN.url(t, i)) snLinked++; }));
  const ext = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
  const conv = (s, title) => { const t = THREADS.find(x => x.s === s && x.t === title); return t ? `<a href="#t-${t.id}">${esc(title)}</a>` : esc(title); };
  const notes = Object.entries(BLOCKTRAINER.dateNote).map(([k, v]) => { const [s, title] = k.split("|"); return `<li>${conv(s, title)}: ${esc(v)}</li>`; }).join("");
  const n = fmtNum;
  $("#main").innerHTML = `<div class="scroll"><div class="page src-page"><h2>Sources</h2>
    <p class="lead">Everything in Satoshi Mail comes from the sources below. Each message also links to its own original from its details (the ${ic("arrow_drop_down")} beside the recipient).</p>

    <h3>Messages and code</h3>
    <div class="src-list">
      <section class="src"><h4>${ext("https://satoshi.nakamotoinstitute.org/", "Satoshi Nakamoto Institute")}</h4>
        <p>Satoshi's mailing-list emails and forum posts, with the other people's messages around them, and The Quotable Satoshi, which supplies the Topics.</p>
        <table class="src-t"><thead><tr><th>Source</th><th class="num">Conversations</th><th class="num">Messages</th><th class="num">By Satoshi</th></tr></thead><tbody>
        ${lists.map(l => `<tr><td><a href="#label-${l.s}">${esc(l.name)}</a></td><td class="num">${n(l.t)}</td><td class="num">${n(l.m)}</td><td class="num">${n(l.s)}</td></tr>`).join("")}
        </tbody></table></section>
      <section class="src"><h4>${ext("https://github.com/lugaxker/nakamoto-archive", "nakamoto-archive")} <span class="muted">on GitHub</span></h4>
        <p>Satoshi's private emails, with Hal Finney, Martti Malmi, Mike Hearn, Dustin Trammell, Adam Back, Wei Dai and others: ${n(priv.t)} conversations, ${n(priv.m)} emails, ${n(priv.s)} by Satoshi. Shown under <a href="#inbox-private">Inbox → Private</a>.</p></section>
      <section class="src"><h4>${ext("https://github.com/bitcoin/bitcoin", "Bitcoin Core")} <span class="muted">on GitHub</span></h4>
        <p>Satoshi's ${n(COMMITS.length)} commits to Bitcoin's source code, each with its diff. Shown under <a href="#commits">Commits</a>.</p></section>
      <section class="src"><h4>${ext("https://bitcoin.org/bitcoin.pdf", "bitcoin.org")}</h4>
        <p>The Bitcoin white paper, attached to the message that announced it.</p></section>
    </div>

    <h3>Cross-checked against</h3>
    <div class="src-list">
      <section class="src"><h4>${ext(BLOCKTRAINER.url, "Blocktrainer's Satoshi Nakamoto archive")}</h4>
        <p>4,236 entries with German translations, checked on 20 October 2026. Every one of its entries is also here. It has no emails with Adam Back, and only Satoshi's side of his exchanges with Mike Hearn and Dustin Trammell.</p>
        ${notes ? `<p>Where it gives a different date:</p><ul>${notes}</ul>` : ""}</section>
      <section class="src"><h4>${ext(SATOSHIN.home, "Satoshi Nakamoto Archive (satoshin.name)")}</h4>
        <p>567 of Satoshi's BitcoinTalk posts and mailing-list emails, each on its own page, checked on 20 October 2026. Every one is also here (${n(snLinked)} messages match). Satoshi Mail also has six of his BitcoinTalk posts that it lacks, and his private emails, P2P Foundation and p2p-research posts. Read more in <a href="#wiki-satoshin-archive">Satoshipedia</a>.</p></section>
    </div>

    <h3>Satoshipedia</h3>
    <div class="src-list">
      <section class="src"><h4><a href="#wiki">Satoshipedia</a></h4>
        <p>Its ${n(WA.length)} articles cite the sources above and ${ext("https://en.wikipedia.org/wiki/Satoshi_Nakamoto", "Wikipedia")} (CC BY-SA 4.0); each article lists its references. The AI Overview on search answers only from this archive and Satoshipedia.</p></section>
    </div>
    <p class="lead muted">See also <a href="#about">About this archive</a>.</p>
  </div></div>`;
}

/* ═════════════ boot ═════════════ */
routeAll(true);
requestAnimationFrame(() => { const l = $("#loading"); l.classList.add("done"); setTimeout(() => l.remove(), 300); });
})();
