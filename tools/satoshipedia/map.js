
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
