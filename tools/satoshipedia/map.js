
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
let VZ_MAX = false, VZ_FOCUS_NEXT = 0;
try { VZ_MAX = localStorage.getItem("satoshimap-max") === "1"; } catch (e) {}
const vzRaf = window.requestAnimationFrame ? f => window.requestAnimationFrame(f) : f => setTimeout(f, 16);
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
function mapToggleMax() { VZ_MAX = !VZ_MAX; try { localStorage.setItem("satoshimap-max", VZ_MAX ? "1" : "0"); } catch (e) {} mapShow(true); vzApply(); }
const mileMonth = o => Math.max(0, Math.min(MAP.N - 1, MAP.ym(o.d) - MAP.M0));
const MILES = MILESTONES.filter(m => !m.off);
MILES.forEach((m, i) => { m.n = i + 1; m.month = mileMonth(m); });

/* ── connections: a radial clock you can zoom into ──
   Angle = order of first contact (clockwise from the top), distance from Satoshi = how much they exchanged,
   size = messages exchanged so far. Names, rings and strokes keep their on-screen size at every zoom, and more
   names appear as there's room for them. */
const VZ_C = 500, VZ_RIN = 120, VZ_ROUT = 430, VZ_SWEEP = 320;
const VZ_ORDER = MAP.P.slice().sort((a, b) => a.first - b.first || b.score - a.score);
VZ_ORDER.forEach((p, i) => { p.order = i; });
const vzAngleFrac = f => (-90 + 18 + VZ_SWEEP * f) * Math.PI / 180;
const vzAngleOf = p => vzAngleFrac((p.order + .5) / VZ_ORDER.length);
const vzAngle = sec => vzAngleFrac(VZ_ORDER.filter(p => p.first < sec).length / VZ_ORDER.length);
const vzNodeR = n => 5 + 19 * Math.sqrt(n / MAP.P[0].ex);
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
const nodeShape = p => p.main === "x"
  ? `<rect class="node" data-p="${p.slug}" rx="2" transform="rotate(45 ${p.x.toFixed(1)} ${p.y.toFixed(1)})" fill="${chColor(p.main)}" vector-effect="non-scaling-stroke"/>`
  : `<circle class="node" data-p="${p.slug}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" fill="${chColor(p.main)}" vector-effect="non-scaling-stroke"/>`;
function vzSize(n, p, r) {
  p.rd = r;
  if (n.tagName === "circle") n.setAttribute("r", r.toFixed(2));
  else { const h = r * .82; n.setAttribute("x", (p.x - h).toFixed(2)); n.setAttribute("y", (p.y - h).toFixed(2)); n.setAttribute("width", (2 * h).toFixed(2)); n.setAttribute("height", (2 * h).toFixed(2)); }
}

// the view: a viewBox that zooms and pans over a 1000 × 1000 chart
const VZ_FIT = { x: -14, y: -14, w: 1028, h: 1028 };
let VZ_VB = { ...VZ_FIT }, VZ_PENDING = false, VZ_ANIM = 0;
const vzZoom = () => VZ_FIT.w / VZ_VB.w;
function vzScale() { const st = $("#vzstage"); return st && st.clientWidth ? Math.min(st.clientWidth / VZ_VB.w, st.clientHeight / VZ_VB.h) || .5 : .5; }
function vzClamp(v) {
  if (v.w >= VZ_FIT.w - .01) return { ...VZ_FIT };
  const cx = Math.max(VZ_FIT.x, Math.min(VZ_FIT.x + VZ_FIT.w, v.x + v.w / 2)), cy = Math.max(VZ_FIT.y, Math.min(VZ_FIT.y + VZ_FIT.h, v.y + v.h / 2));
  return { x: cx - v.w / 2, y: cy - v.h / 2, w: v.w, h: v.h };
}
function vzApply() { if (VZ_PENDING) return; VZ_PENDING = true; vzRaf(() => { VZ_PENDING = false; vzApplyNow(); }); }
function vzApplyNow() {
  const svg = $("#vzsvg"); if (!svg) return;
  svg.setAttribute("viewBox", `${VZ_VB.x.toFixed(2)} ${VZ_VB.y.toFixed(2)} ${VZ_VB.w.toFixed(2)} ${VZ_VB.h.toFixed(2)}`);
  const s = vzScale(), k = 1 / s, z = vzZoom();
  svg.style.setProperty("--k", k.toFixed(4));
  const sat = svg.querySelector(".sat"), sz = z ** -.6;
  if (sat) sat.setAttribute("transform", `translate(${VZ_C} ${VZ_C}) scale(${sz.toFixed(4)}) translate(${-VZ_C} ${-VZ_C})`);
  const sn = svg.querySelector(".satname"); if (sn) sn.setAttribute("y", (VZ_C + 46 * sz + 4 * k).toFixed(2));
  document.querySelectorAll("#vznodes .node").forEach(n => {
    const p = MAP.BY.get(n.dataset.p);
    vzSize(n, p, Math.max(vzNodeR(Math.max(1, p.cum[VZ_T])) * z ** -.5, 3.2 * k));
  });
  vzLabels(s);
  const st = $("#vzstage"); st.classList.toggle("zoomed", z > 1.01);
  const zz = $("#vzzoom");
  if (zz) { zz.querySelector('[data-vzz="fit"]').disabled = z <= 1.01; zz.querySelector('[data-vzz="out"]').disabled = z <= 1.01; zz.querySelector('[data-vzz="in"]').disabled = z >= 13.9; }
}
function vzLabels(s) {
  const g = $("#vzlabels"); if (!g) return;
  const k = 1 / s, fs = 13 * k, z = vzZoom();
  const x0 = VZ_VB.x, y0 = VZ_VB.y, x1 = x0 + VZ_VB.w, y1 = y0 + VZ_VB.h;
  const boxes = [{ x0: VZ_C - 50, x1: VZ_C + 50, y0: VZ_C - 50, y1: VZ_C + 50 + 26 * k }];
  const sel = VZ_SEL && MAP.BY.get(VZ_SEL);
  const cands = (sel ? [sel] : []).concat(MAP.P.filter(p => p !== sel && vzVisible(p)));
  const limit = Math.round(16 + 10 * (z - 1));
  const out = [];
  for (const p of cands) {
    if (out.length >= limit && p !== sel) break;
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    const dx = p.x - VZ_C, dy = p.y - VZ_C, d = Math.hypot(dx, dy) || 1, off = (p.rd || p.r) + 5 * k, right = dx >= 0;
    const lx = p.x + dx / d * off, ly = p.y + dy / d * off + fs * .35, w = p.name.length * fs * .58 + 2 * k;
    const box = { x0: right ? lx : lx - w, x1: right ? lx + w : lx, y0: ly - fs, y1: ly + fs * .3 };
    if (p !== sel && boxes.some(b => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) continue;
    boxes.push(box);
    out.push(`<text class="lbl${p === sel ? " sel" : sel ? " dim" : ""}" data-p="${p.slug}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${right ? "start" : "end"}">${esc(p.name)}</text>`);
  }
  g.innerHTML = out.join("");
}
function vzPt(e) {
  const svg = $("#vzsvg"), m = svg && svg.getScreenCTM && svg.getScreenCTM();
  if (!m) return { x: VZ_VB.x + VZ_VB.w / 2, y: VZ_VB.y + VZ_VB.h / 2 };
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const q = pt.matrixTransform(m.inverse()); return { x: q.x, y: q.y };
}
function vzZoomAt(f, p) {
  cancelAnimationFrame && cancelAnimationFrame(VZ_ANIM);
  const z = vzZoom(), nz = Math.max(1, Math.min(14, z * f)); f = nz / z;
  if (Math.abs(f - 1) < 1e-3) return;
  VZ_VB = vzClamp({ x: p.x - (p.x - VZ_VB.x) / f, y: p.y - (p.y - VZ_VB.y) / f, w: VZ_VB.w / f, h: VZ_VB.h / f });
  vzApply();
}
function vzAnimTo(t) {
  t = vzClamp(t);
  if (REDUCED || !window.requestAnimationFrame) { VZ_VB = t; vzApply(); return; }
  const a = { ...VZ_VB }, t0 = performance.now(), D = 360;
  const step = now => {
    const u = Math.min(1, (now - t0) / D), e = 1 - (1 - u) ** 3;
    // interpolate the zoom level geometrically so it feels even
    const w = a.w * (t.w / a.w) ** e, cx = a.x + a.w / 2 + (t.x + t.w / 2 - a.x - a.w / 2) * e, cy = a.y + a.h / 2 + (t.y + t.h / 2 - a.y - a.h / 2) * e;
    VZ_VB = { x: cx - w / 2, y: cy - w / 2, w, h: w };
    vzApplyNow();
    if (u < 1) VZ_ANIM = requestAnimationFrame(step);
  };
  cancelAnimationFrame(VZ_ANIM); VZ_ANIM = requestAnimationFrame(step);
}
function vzFocusOn(p, zoom) {
  const z = Math.max(vzZoom(), zoom), w = VZ_FIT.w / z;
  vzAnimTo({ x: p.x - w / 2, y: p.y - w / 2, w, h: w });
}
function vzFit() { vzAnimTo({ ...VZ_FIT }); }

function renderNet() {
  const body = $("#vzbody");
  if (body.dataset.view !== "net") {
    body.dataset.view = "net";
    if (!VZ_BUILT.net) { vzLayout(); VZ_BUILT.net = true; }
    const pct = i => (i / (MAP.N - 1) * 100).toFixed(3);
    const years = [];
    for (let i = 0; i < MAP.N; i++) { const v = MAP.M0 + i; if (v % 12 === 0) years.push(`<span class="y" style="--f:${pct(i)}">${Math.floor(v / 12)}</span>`); }
    const ticks = MILES.map(o => `<button class="m" type="button" data-vzti="${o.month}" style="--f:${pct(o.month)}" title="${esc(MAP.monthLabel(o.month))}: ${esc(o.t)}" aria-label="${esc(MAP.monthLabel(o.month))}: ${esc(o.t)}"></button>`).join("");
    body.innerHTML = `<div class="vz-net">
      <div class="vz-bar">
        <div class="vz-find" role="search">
          ${ic("search")}<input id="vzfind" type="search" placeholder="Find a person" autocomplete="off" spellcheck="false" aria-label="Find a person" aria-controls="vzfindres" aria-expanded="false">
          <div class="vz-findres" id="vzfindres" role="listbox" hidden></div>
        </div>
        <div class="vz-chips" role="group" aria-label="Show">
          <button class="vz-chip" data-vzf="all" aria-pressed="true">Everyone</button>
          ${["e", "p", "x"].map(k => `<button class="vz-chip" data-vzf="${k}" aria-pressed="false"><i class="${k}" style="background:${chColor(k)}"></i>${CH_NAME[k]}</button>`).join("")}
        </div>
        <div class="vz-seg" role="group" aria-label="Display">
          <button data-vzm="diagram" aria-pressed="true">${ic("hub")}<span class="t">Chart</span></button>
          <button data-vzm="list" aria-pressed="false">${ic("table_rows")}<span class="t">List</span></button>
        </div>
      </div>
      <div class="vz-stage" id="vzstage"></div>
      <div class="vz-list" id="vzlist" hidden></div>
      <aside class="vz-side" id="vzside" aria-live="polite"></aside>
      <div class="vz-scrub">
        <button class="play" type="button" id="vzplay" aria-label="Play from the start" title="Play month by month (space)">${ic("play_arrow")}</button>
        <div class="vz-now"><output id="vzto" for="vzt"></output><small id="vzts"></small></div>
        <div class="vz-track">
          <input type="range" id="vzt" min="0" max="${MAP.N - 1}" value="${VZ_T}" aria-label="Month" aria-describedby="vzts">
          <div class="vz-marks" aria-hidden="false">${years.join("")}${ticks}</div>
        </div>
      </div>
    </div>`;
    drawNet();
    $("#vzt").addEventListener("input", e => { vzStop(); vzSetT(+e.target.value); });
    vzFindWire();
    vzFilter(VZ_FILTER); vzMode(VZ_MODE);
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => vzApply()); ro.observe($("#vzstage")); }
  }
  vzSetT(VZ_T);
}
function drawNet() {
  const P = MAP.P;
  let s = `<svg id="vzsvg" viewBox="${VZ_VB.x} ${VZ_VB.y} ${VZ_VB.w} ${VZ_VB.h}" role="img" aria-label="Everyone Satoshi corresponded with, placed clockwise by when they first exchanged messages and closer to the centre the more they exchanged. The list view has the same data as a table."<defs><marker id="vzarrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink-3)"/></marker></defs>`;
  [VZ_RIN, (VZ_RIN + VZ_ROUT) / 2, VZ_ROUT].forEach(r => { s += `<circle class="ring" cx="${VZ_C}" cy="${VZ_C}" r="${r}" vector-effect="non-scaling-stroke"/>`; });
  for (let y = 2009; y <= 2011; y++) {
    const a = vzAngle(Date.UTC(y, 0, 1) / 1000);
    s += `<line class="spoke" x1="${VZ_C + 60 * Math.cos(a)}" y1="${VZ_C + 60 * Math.sin(a)}" x2="${VZ_C + 484 * Math.cos(a)}" y2="${VZ_C + 484 * Math.sin(a)}" vector-effect="non-scaling-stroke"/>`;
    s += `<text class="yr" x="${VZ_C + 496 * Math.cos(a)}" y="${VZ_C + 496 * Math.sin(a)}" dominant-baseline="middle" text-anchor="${Math.cos(a) > .2 ? "start" : Math.cos(a) < -.2 ? "end" : "middle"}">${y}</text>`;
  }
  // where the clock starts: a small arrow at the top, so it reads clockwise from August 2008
  s += `<path class="start" d="M${VZ_C + 6} ${VZ_C - 488}a488 488 0 0 1 ${(488 * Math.sin(.14)).toFixed(1)} ${(488 - 488 * Math.cos(.14)).toFixed(1)}" vector-effect="non-scaling-stroke" marker-end="url(#vzarrow)"/>`;
  s += `<g id="vzedges">${P.map(p => `<line class="edge" data-p="${p.slug}" x1="${VZ_C}" y1="${VZ_C}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${chColor(p.main)}" stroke-opacity="${(.1 + .45 * (p.score / P[0].score) ** .5).toFixed(2)}" vector-effect="non-scaling-stroke"/>`).join("")}</g>`;
  s += `<g id="vznodes">${P.slice().reverse().map(nodeShape).join("")}</g>`;
  s += `<g id="vzlabels"></g>`;
  s += `<g class="sat"><circle cx="${VZ_C}" cy="${VZ_C}" r="46" fill="#f7931a"/>
    <g transform="translate(${VZ_C - 20 * 2.2} ${VZ_C - 18 * 2.2}) scale(2.2)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0 1.5) rotate(14 20 17)"><path d="M17.2 12.2v9.6M17.2 12.2h3.1a2.35 2.35 0 0 1 0 4.7h-3.1M17.2 16.9h3.6a2.45 2.45 0 0 1 0 4.9h-3.6"/><path d="M18.5 10.7v1.5M20.4 10.7v1.5M18.5 21.8v1.5M20.4 21.8v1.5"/></g></g>
</g><text class="satname" x="${VZ_C}" y="${VZ_C + 50}" dominant-baseline="hanging" text-anchor="middle">Satoshi</text>`;
  s += `</svg>
    <div class="vz-legendbox">
      <div class="vz-key">${["e", "p", "x"].map(k => `<span><i class="${k}" style="background:${chColor(k)}"></i>${CH_NAME[k]}</span>`).join("")}</div>
      <p>${ic("rotate_right")}Clockwise from the top, Aug 2008 on: when they first wrote</p>
      <p>${ic("adjust")}Closer to Satoshi: more messages with him</p>
    </div>
    <div class="vz-zoom" id="vzzoom" role="group" aria-label="Zoom">
      <button type="button" data-vzz="in" aria-label="Zoom in" title="Zoom in (+)">${ic("add")}</button>
      <button type="button" data-vzz="out" aria-label="Zoom out" title="Zoom out (−)">${ic("remove")}</button>
      <button type="button" data-vzz="fit" aria-label="Show everyone" title="Show everyone (0)">${ic("fit_screen")}</button>
    </div>
    <div class="vz-tip" id="vztip" hidden></div>`;
  $("#vzstage").innerHTML = s;
  vzWireStage();
}
function vzWireStage() {
  const stage = $("#vzstage");
  const ptrs = new Map(); let moved = false, pinch = null, last = null;
  const tip = (e, n) => {
    if (!n) { vzTipHide(); vzHover(null); return; }
    const p = MAP.BY.get(n.dataset.p), t = $("#vztip"), r = stage.getBoundingClientRect();
    t.innerHTML = `<b>${esc(p.name)}</b>${fmtNum(vzEx(p))} message${vzEx(p) === 1 ? "" : "s"} exchanged · ${p.nthreads} conversation${p.nthreads === 1 ? "" : "s"}<br>${CH_NAME[p.main]} · first ${esc(shortDate(p.first))}`;
    t.hidden = false;
    t.style.left = Math.max(8, Math.min(e.clientX - r.left + 14, r.width - t.offsetWidth - 8)) + "px";
    t.style.top = Math.max(8, Math.min(e.clientY - r.top + 14, r.height - t.offsetHeight - 8)) + "px";
    vzHover(p.slug);
  };
  stage.addEventListener("pointerdown", e => {
    if (e.target.closest("button, .vz-legendbox")) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; last = { x: e.clientX, y: e.clientY };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: vzZoom() }; }
  });
  stage.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === "mouse") tip(e, e.target.closest && e.target.closest(".node")); return; }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      vzZoomAt(pinch.z * d / pinch.d / vzZoom(), vzPt({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }));
      moved = true; return;
    }
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (!moved && Math.hypot(e.clientX - [...ptrs.values()][0].x, e.clientY - [...ptrs.values()][0].y) < 4 && Math.hypot(dx, dy) < 4) return;
    moved = true; last = { x: e.clientX, y: e.clientY };
    if (vzZoom() > 1.01) { const s = vzScale(); VZ_VB = vzClamp({ ...VZ_VB, x: VZ_VB.x - dx / s, y: VZ_VB.y - dy / s }); vzApply(); stage.classList.add("dragging"); vzTipHide(); }
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) stage.classList.remove("dragging"); };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
  stage.addEventListener("pointerleave", e => { up(e); vzTipHide(); vzHover(null); });
  stage.addEventListener("wheel", e => { e.preventDefault(); vzZoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0016)), vzPt(e)); }, { passive: false });
  stage.addEventListener("dblclick", e => { if (e.target.closest("button, .vz-legendbox")) return; e.preventDefault(); vzZoomAt(2, vzPt(e)); });
  stage.addEventListener("click", e => {
    if (moved) { moved = false; return; }
    if (e.target.closest("button, .vz-legendbox")) return;
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
  inp.style.setProperty("--fill", (t / (MAP.N - 1) * 100).toFixed(2) + "%");
  $("#vzto").textContent = MAP.monthLabel(t);
  const shown = MAP.P.filter(p => p.firstI <= t);
  $("#vzts").textContent = `${fmtNum(shown.length)} people · ${fmtNum(MAP.satCum[t])} messages · ${fmtNum(MAP.comCum[t])} commits by Satoshi so far`;
  document.querySelectorAll("#vzwin .vz-marks .m").forEach(b => b.classList.toggle("past", +b.dataset.vzti <= t));
  document.querySelectorAll("#vznodes .node").forEach(n => n.classList.toggle("off", !vzVisible(MAP.BY.get(n.dataset.p))));
  document.querySelectorAll("#vzedges .edge").forEach(el => { el.style.display = vzVisible(MAP.BY.get(el.dataset.p)) ? "" : "none"; });
  vzApplyNow();
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
  if (m === "list") drawList(); else vzApply();
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
  const p = slug && MAP.BY.get(slug);
  if (p && p.firstI > VZ_T) vzSetT(MAP.N - 1);
  if (p && (VZ_FOCUS_NEXT || (vzZoom() > 1.01 && (p.x < VZ_VB.x || p.x > VZ_VB.x + VZ_VB.w || p.y < VZ_VB.y || p.y > VZ_VB.y + VZ_VB.h)))) vzFocusOn(p, VZ_FOCUS_NEXT || 1);
  VZ_FOCUS_NEXT = 0;
  vzHover(null);
  vzApply();
  drawSide();
  if (MAP_OPEN) updateTitle();
}
function vzGo(slug, zoom = 2.6) { VZ_FOCUS_NEXT = zoom; if (VZ_MODE !== "diagram") vzMode("diagram"); if (location.hash === "#map~p~" + slug) vzSelect(slug, false); else vzSelect(slug); }

// find a person
function vzFindWire() {
  const inp = $("#vzfind"), res = $("#vzfindres");
  let hits = [], cur = 0;
  const close = () => { res.hidden = true; inp.setAttribute("aria-expanded", "false"); };
  const draw = () => {
    res.innerHTML = hits.length ? hits.map((p, i) => `<button type="button" role="option" aria-selected="${i === cur}" data-vzgo="${p.slug}"><i class="${p.main}" style="background:${chColor(p.main)}"></i><span>${esc(p.name)}</span><small>${fmtNum(p.ex)}</small></button>`).join("")
      : `<p>No one by that name</p>`;
    res.hidden = false; inp.setAttribute("aria-expanded", "true");
  };
  inp.addEventListener("input", () => {
    const q = inp.value.trim().toLowerCase();
    if (!q) { close(); return; }
    hits = MAP.P.filter(p => p.name.toLowerCase().includes(q) || [...p.aliases].some(a => a.toLowerCase().includes(q)))
      .sort((a, b) => (b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q)) || b.score - a.score).slice(0, 8);
    cur = 0; draw();
  });
  inp.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (!hits.length) return; e.preventDefault(); cur = (cur + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length; draw(); }
    else if (e.key === "Enter") { e.preventDefault(); if (hits[cur]) { vzGo(hits[cur].slug); inp.value = hits[cur].name; close(); inp.blur(); } }
    else if (e.key === "Escape") { e.stopPropagation(); inp.value = ""; close(); }
  });
  inp.addEventListener("blur", () => setTimeout(close, 150));
  inp.addEventListener("focus", () => { if (inp.value.trim()) inp.dispatchEvent(new Event("input")); });
}

function drawSide() {
  const side = $("#vzside"); if (!side) return;
  const p = VZ_SEL && MAP.BY.get(VZ_SEL);
  if (!p) {
    const top = MAP.P.filter(vzVisible).sort((a, b) => b.cum[VZ_T] - a.cum[VZ_T]).slice(0, 10);
    side.innerHTML = `<h2>Satoshi's circle</h2><p class="sub">${esc(shortDate(MAP.START))} – ${esc(MAP.monthLabel(VZ_T))}</p>
      <div class="vz-stats"><div><b>${fmtNum(MAP.P.filter(q => q.firstI <= VZ_T).length)}</b><small>people</small></div><div><b>${fmtNum(MAP.satCum[VZ_T])}</b><small>messages by Satoshi</small></div>
        <div><b>${fmtNum(MAP.comCum[VZ_T])}</b><small>commits</small></div><div><b>${fmtNum(MAP.P.filter(q => q.firstI <= VZ_T && q.main === "x").length)}</b><small>private correspondents</small></div></div>
      <h3>Most connected${VZ_T < MAP.N - 1 ? " so far" : ""}</h3>
      <ol class="vz-top10">${top.map((q, i) => `<li><button data-vzgo="${q.slug}" data-vzp="${q.slug}"><span class="c">${i + 1}</span><i class="${q.main}" style="background:${chColor(q.main)}"></i><span>${esc(q.name)}</span><span class="n">${fmtNum(q.cum[VZ_T])}</span></button></li>`).join("")}</ol>
      <p class="vz-hint">${ic("touch_app")}Select anyone on the chart, or scroll and pinch to zoom.</p>`;
    return;
  }
  const max = Math.max(...p.month, 1), w = 100 / MAP.N;
  const spark = `<svg class="vz-spark" viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-label="Messages with Satoshi by month">${p.month.map((v, i) => v ? `<rect x="${(i * w + w * .12).toFixed(2)}" y="${(44 - 40 * v / max).toFixed(2)}" width="${(w * .76).toFixed(2)}" height="${(40 * v / max).toFixed(2)}" rx=".6" style="fill:${chColor(p.main)}"><title>${MAP.monthLabel(i)}: ${v}</title></rect>` : "").join("")}</svg>`;
  const threads = [...p.threads.entries()].sort((a, b) => b[1] - a[1] || a[0].first - b[0].first).slice(0, 6);
  const art = p.art && WBY.get(p.art);
  const q = [...p.aliases].find(a => !a.includes("@")) || p.name;
  side.innerHTML = `<button class="vz-back" data-vzp="">${ic("arrow_back")}Everyone</button>
    <h2>${esc(p.name)}</h2><p class="sub">${CH_NAME[p.main]}${p.aliases.size > 1 ? ` · also ${esc([...p.aliases].filter(a => a !== p.name).slice(0, 2).join(", "))}` : ""}</p>
    <div class="vz-stats"><div><b>${fmtNum(p.ex)}</b><small>messages exchanged</small></div><div><b>${p.nthreads}</b><small>conversations</small></div>
      <div><b>${esc(shortDate(p.first))}</b><small>first</small></div><div><b>${esc(shortDate(p.last))}</b><small>last</small></div></div>
    <h3>Month by month, ${esc(MAP.monthLabel(0))} – ${esc(MAP.monthLabel(MAP.N - 1))}</h3>${spark}
    <h3>Conversations with Satoshi</h3>
    <div class="vz-threads">${threads.map(([t, n]) => `<a href="#t-${t.id}"><span>${esc(t.t)}</span><small>${n}</small></a>`).join("")}</div>
    <div class="vz-acts">${art ? `<a class="pillbtn" href="#wiki-${art.slug}">${ic("menu_book")}Satoshipedia</a>` : ""}<a class="pillbtn" href="#search-${encodeURIComponent(`from:"${q.toLowerCase()}"`)}">${ic("mail")}Messages</a><button class="pillbtn" type="button" data-vzgo="${p.slug}">${ic("center_focus_strong")}Zoom to</button></div>`;
}
function vzStop() { if (VZ_PLAY) { clearInterval(VZ_PLAY); VZ_PLAY = null; const b = $("#vzplay"); if (b) { b.innerHTML = ic("play_arrow"); b.setAttribute("aria-label", "Play from the start"); } } }
function vzPlay() {
  if (VZ_PLAY) { vzStop(); return; }
  if (VZ_T >= MAP.N - 1) vzSetT(0);
  const b = $("#vzplay"); b.innerHTML = ic("pause"); b.setAttribute("aria-label", "Pause");
  VZ_PLAY = setInterval(() => { if (VZ_T >= MAP.N - 1) { vzStop(); return; } vzSetT(VZ_T + 1); }, REDUCED ? 600 : 360);
}

/* ── timeline: one big chart; select a month to see what he wrote ── */
let TL_SEL = null, TL_W = 0;
const tlTot = i => MAP.sat.e[i] + MAP.sat.p[i] + MAP.sat.x[i] + MAP.sat.c[i];
function tlRange(i) {
  const v = MAP.M0 + i, y = Math.floor(v / 12), m = v % 12, n = v + 1;
  return [`${y}/${String(m + 1).padStart(2, "0")}/01`, `${Math.floor(n / 12)}/${String(n % 12 + 1).padStart(2, "0")}/01`];
}
const tlMonthName = i => { const v = MAP.M0 + i; return `${["January","February","March","April","May","June","July","August","September","October","November","December"][v % 12]} ${Math.floor(v / 12)}`; };
function renderTimeline() {
  const body = $("#vzbody");
  if (body.dataset.view === "tl") return;
  body.dataset.view = "tl";
  const N = MAP.N;
  let busiest = 0; for (let i = 0; i < N; i++) if (tlTot(i) > tlTot(busiest)) busiest = i;
  if (TL_SEL == null) TL_SEL = busiest;
  const list = MILESTONES.map(o => `<li class="${o.off ? "off" : ""}" data-tli="${mileMonth(o)}">${o.n ? `<span class="num">${o.n}</span>` : ""}<time>${esc(longDay(o.d))}${o.approx ? " (approx.)" : ""}</time><b>${esc(o.t)}</b><p>${esc(o.s)}</p>
    <div class="acts">${o.href ? `<a href="${o.href}" data-vzmi="${o.mi ?? ""}">${o.href.startsWith("#t-c") ? "Open commit" : "Open message"}</a>` : ""}${o.wiki ? `<a href="#wiki-${o.wiki}">Satoshipedia</a>` : ""}${o.n ? `<button type="button" class="linkbtn" data-tlpick="${mileMonth(o)}">Show month</button>` : ""}</div></li>`).join("");
  body.innerHTML = `<div class="vz-tl">
    <div class="vz-tlhead">
      <div><h2>Satoshi, start to finish</h2>
      <p class="lead">Every message and commit in the archive, month by month, from ${esc(longDay(MAP.START))} to ${esc(longDay(MAP.END))}. Select a month to see what he wrote.</p></div>
      <div class="vz-legend">${["e", "p", "x", "c"].map(k => `<span><i style="background:${chColor(k)}"></i>${k === "c" ? "Commits" : CH_NAME[k]}</span>`).join("")}<span><b class="pinkey">1</b>Milestone</span></div>
    </div>
    <div class="vz-tlgrid">
      <div class="vz-chartbox">
        <div class="vz-scroll" id="vzbars" tabindex="0" role="group" aria-label="Messages and commits per month. Use the left and right arrow keys to move between months."></div>
        <div class="vz-tip" id="vztip2" hidden></div>
      </div>
      <aside class="vz-month" id="vzmonth" aria-live="polite"></aside>
    </div>
    <h3>Milestones</h3>
    <ol class="vz-mlist">${list}</ol>
    <h3>Who he was talking to</h3>
    <p class="note">The 14 people who exchanged the most with Satoshi, month by month: bigger dots mean more messages. Select a name to find them on the map.</p>
    <div class="vz-scroll" id="vzlanes"></div>
  </div>`;
  TL_W = 0;
  tlDraw();
  tlPick(TL_SEL, false);
  const bars = $("#vzbars");
  bars.addEventListener("pointermove", e => {
    const h = e.target.closest && e.target.closest("[data-i]"), tip = $("#vztip2");
    if (!h || e.pointerType !== "mouse") { tip.hidden = true; return; }
    const i = +h.dataset.i, box = bars.parentElement.getBoundingClientRect();
    tip.innerHTML = `<b>${MAP.monthLabel(i)}</b>${["e", "p", "x", "c"].map(k => `${k === "c" ? "Commits" : CH_NAME[k]}: ${fmtNum(MAP.sat[k][i])}`).join("<br>")}`;
    tip.hidden = false;
    tip.style.left = Math.max(4, Math.min(e.clientX - box.left + 12, box.width - tip.offsetWidth - 4)) + "px";
    tip.style.top = Math.max(4, e.clientY - box.top - tip.offsetHeight - 10) + "px";
  });
  bars.addEventListener("pointerleave", () => { $("#vztip2").hidden = true; });
  bars.addEventListener("click", e => { const h = e.target.closest("[data-i]"); if (h) tlPick(+h.dataset.i, false); });
  bars.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); tlPick(Math.max(0, Math.min(MAP.N - 1, TL_SEL + (e.key === "ArrowRight" ? 1 : -1))), false); }
    else if (e.key === "Home" || e.key === "End") { e.preventDefault(); tlPick(e.key === "Home" ? 0 : MAP.N - 1, false); }
  });
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (bars.isConnected && Math.abs((bars.clientWidth || 0) - TL_W) > 2) { tlDraw(); tlPick(TL_SEL, false); } }); ro.observe(bars); }
}
function tlGeom() {
  const box = $("#vzbars"), avail = (box && box.clientWidth) || 900, N = MAP.N;
  const L = 38, R = 10, CW = Math.max(22, (avail - L - R) / N);
  return { L, R, CW, W: L + R + CW * N, N, avail };
}
function tlDraw() {
  const g = tlGeom(), { L, R, CW, W, N } = g, H = 320, top = 40, base = H - 30;
  TL_W = g.avail;
  const max = Math.max(...Array.from({ length: N }, (_, i) => tlTot(i)));
  const step = max > 120 ? 50 : max > 60 ? 25 : 10, yMax = Math.ceil(max / step) * step;
  const y = v => base - (base - top) * v / yMax, X = i => L + i * CW, bw = Math.min(CW * .7, 30);
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Satoshi's messages and commits per month, ${MAP.monthLabel(0)} to ${MAP.monthLabel(N - 1)}">`;
  s += `<rect class="selcol" id="tlsel" x="0" y="${top - 30}" width="${CW}" height="${base - top + 30}" rx="6"/>`;
  for (let v = 0; v <= yMax; v += step) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  for (let i = 0; i < N; i++) {
    let acc = 0;
    s += `<g class="bar" data-bar="${i}">`;
    for (const k of ["e", "p", "x", "c"]) {
      const v = MAP.sat[k][i]; if (!v) continue;
      const y0 = y(acc), y1 = y(acc + v); acc += v;
      s += `<rect x="${(X(i) + (CW - bw) / 2).toFixed(1)}" y="${(y1 + .75).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1.5, y0 - y1 - 1.5).toFixed(1)}" rx="2" fill="${chColor(k)}"/>`;
    }
    s += `</g>`;
    const v = MAP.M0 + i, yr = v % 12 === 0 || i === 0;
    s += `<text class="ax${yr ? " yr" : ""}" x="${X(i) + CW / 2}" y="${base + 17}" text-anchor="middle">${yr ? Math.floor(v / 12) : CW >= 34 ? MON[v % 12] : MON[v % 12][0]}</text>`;
  }
  s += `<line class="base" x1="${L}" x2="${W - R}" y1="${base}" y2="${base}"/>`;
  // numbered milestone pins, stacked above their month's bar
  const stack = {};
  MILES.forEach(o => {
    const i = o.month, j = stack[i] = (stack[i] || 0) + 1, cx = X(i) + CW / 2, cy = Math.max(12, y(tlTot(i)) - 14 - (j - 1) * 21);
    s += `<g class="pin" data-i="${i}" data-pin="${o.n}"><line x1="${cx}" x2="${cx}" y1="${cy + 9}" y2="${y(tlTot(i)) - 2}"/><circle cx="${cx}" cy="${cy}" r="9.5"/><text x="${cx}" y="${cy + 3.8}" text-anchor="middle">${o.n}</text><title>${esc(longDay(o.d))}: ${esc(o.t)}</title></g>`;
  });
  for (let i = 0; i < N; i++) s += `<rect class="hit" data-i="${i}" x="${X(i)}" y="0" width="${CW}" height="${H}"><title>${MAP.monthLabel(i)}</title></rect>`;
  s += `</svg>`;
  $("#vzbars").innerHTML = s;

  // who he was talking to: the same month columns, so the two charts line up
  const P = MAP.P.slice(0, 14), RH = 30, LW = Math.max(L, 132), SW = LW + CW * N + R, SH = P.length * RH + 6;
  const maxM = Math.max(...P.flatMap(p => p.month));
  let sw = `<svg width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" role="img" aria-label="Messages exchanged with Satoshi per month, top 14 correspondents">`;
  P.forEach((p, r) => {
    const cy = 3 + r * RH + RH / 2;
    if (r % 2 === 0) sw += `<rect class="lane-bg" x="0" y="${cy - RH / 2}" width="${SW}" height="${RH}" rx="5"/>`;
    sw += `<text class="lane-name" data-vzgo="${p.slug}" x="8" y="${cy + 4.5}">${esc(p.name)}</text>`;
    p.month.forEach((v, i) => { if (v) sw += `<circle cx="${LW + i * CW + CW / 2}" cy="${cy}" r="${(3 + 9 * Math.sqrt(v / maxM)).toFixed(1)}" fill="${chColor(p.main)}" stroke="var(--surface)" stroke-width="1.5"><title>${esc(p.name)}, ${MAP.monthLabel(i)}: ${v}</title></circle>`; });
  });
  sw += `</svg>`;
  $("#vzlanes").innerHTML = sw;
}
function tlPick(i, scroll = true) {
  TL_SEL = i;
  const g = tlGeom(), sel = $("#tlsel");
  if (sel) sel.setAttribute("x", g.L + i * g.CW);
  document.querySelectorAll("#vzbars .bar").forEach(b => b.classList.toggle("fade", +b.dataset.bar !== i));
  document.querySelectorAll("#vzbars .pin").forEach(b => b.classList.toggle("on", +b.dataset.i === i));
  document.querySelectorAll(".vz-mlist li").forEach(li => li.classList.toggle("on", +li.dataset.tli === i && !li.classList.contains("off")));
  // keep the chosen month in view when the chart scrolls sideways (phones)
  const bars = $("#vzbars");
  if (bars && bars.scrollWidth > bars.clientWidth) {
    const x = g.L + i * g.CW;
    if (x < bars.scrollLeft + 40 || x > bars.scrollLeft + bars.clientWidth - 60) bars.scrollLeft = x - bars.clientWidth / 2;
  }
  const [after, before] = tlRange(i);
  const sent = SENT.filter(x => !x.m.w && x.m.d >= Date.UTC(+after.slice(0, 4), +after.slice(5, 7) - 1, 1) / 1000 && x.m.d < Date.UTC(+before.slice(0, 4), +before.slice(5, 7) - 1, 1) / 1000);
  const byT = new Map(); sent.forEach(x => byT.set(x.t, (byT.get(x.t) || 0) + 1));
  const threads = [...byT.entries()].sort((a, b) => b[1] - a[1] || a[0].t.localeCompare(b[0].t)).slice(0, 8);
  const miles = MILES.filter(o => o.month === i);
  const counts = ["e", "p", "x", "c"].map(k => `<span><i style="background:${chColor(k)}"></i><b>${fmtNum(MAP.sat[k][i])}</b>${k === "c" ? "commits" : CH_NAME[k].toLowerCase()}</span>`).join("");
  const q = s => "#search-" + encodeURIComponent(s);
  $("#vzmonth").innerHTML = `<div class="vz-mhead">
      <button class="ib" type="button" data-tlstep="-1" aria-label="Previous month" ${i ? "" : "disabled"}>${ic("chevron_left")}</button>
      <h3>${esc(tlMonthName(i))}</h3>
      <button class="ib" type="button" data-tlstep="1" aria-label="Next month" ${i < MAP.N - 1 ? "" : "disabled"}>${ic("chevron_right")}</button>
    </div>
    <div class="vz-mcounts">${counts}</div>
    ${miles.length ? `<ul class="vz-mmiles">${miles.map(o => `<li><span class="num">${o.n}</span><div><b>${esc(o.t)}</b><small>${esc(longDay(o.d))}</small></div></li>`).join("")}</ul>` : ""}
    ${threads.length ? `<h4>What he wrote</h4><div class="vz-threads">${threads.map(([t, n]) => `<a href="#t-${t.id}"><span>${esc(t.t)}</span><small>${n}</small></a>`).join("")}</div>` : `<p class="muted">No messages from Satoshi this month${MAP.sat.c[i] ? ", only commits" : ""}.</p>`}
    <div class="vz-acts">
      ${sent.length ? `<a class="pillbtn" href="${q(`from:me after:${after} before:${before}`)}">${ic("mail")}All ${fmtNum(sent.length)} messages</a>` : ""}
      ${MAP.sat.c[i] ? `<a class="pillbtn" href="${q(`in:commits after:${after} before:${before}`)}">${ic("commit")}${fmtNum(MAP.sat.c[i])} commits</a>` : ""}
      <button class="pillbtn" type="button" data-tlmap="${i}">${ic("hub")}On the map</button>
    </div>`;
  if (scroll) { const box = $("#vzbars"); box && box.scrollIntoView && box.scrollIntoView({ block: "nearest", behavior: REDUCED ? "auto" : "smooth" }); }
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
  const zz = t.closest("[data-vzz]"); if (zz) { const c = { x: VZ_VB.x + VZ_VB.w / 2, y: VZ_VB.y + VZ_VB.h / 2 }; if (zz.dataset.vzz === "fit") vzFit(); else vzZoomAt(zz.dataset.vzz === "in" ? 1.8 : 1 / 1.8, c); return; }
  const go = t.closest("[data-vzgo]");
  if (go) { if (VZ_VIEW === "tl") { VZ_FOCUS_NEXT = 2.6; location.hash = "#map~p~" + go.dataset.vzgo; } else vzGo(go.dataset.vzgo); return; }
  const pp = t.closest("[data-vzp]"); if (pp) { vzSelect(pp.dataset.vzp || null); if (!pp.dataset.vzp) vzFit(); return; }
  const tk = t.closest("[data-vzti]"); if (tk) { vzStop(); vzSetT(+tk.dataset.vzti); return; }
  if (t.closest("#vzplay")) { vzPlay(); return; }
  const st = t.closest("[data-tlstep]"); if (st) { tlPick(Math.max(0, Math.min(MAP.N - 1, TL_SEL + +st.dataset.tlstep)), false); return; }
  const pk = t.closest("[data-tlpick]"); if (pk) { tlPick(+pk.dataset.tlpick); return; }
  const tm = t.closest("[data-tlmap]"); if (tm) { vzStop(); VZ_T = +tm.dataset.tlmap; location.hash = "#map"; return; }
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
    else if (VZ_SEL) { vzSelect(null); vzFit(); }
    else if (vzZoom() > 1.01 && VZ_VIEW === "net") vzFit();
    else mapClose();
    return;
  }
  if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;
  if (VZ_VIEW === "net") {
    if ((e.key === " " || e.key === "k") && tag !== "button") { e.preventDefault(); vzPlay(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); vzStop(); vzSetT(Math.max(0, Math.min(MAP.N - 1, VZ_T + (e.key === "ArrowRight" ? 1 : -1)))); }
    else if (e.key === "+" || e.key === "=") vzZoomAt(1.5, { x: VZ_VB.x + VZ_VB.w / 2, y: VZ_VB.y + VZ_VB.h / 2 });
    else if (e.key === "-" || e.key === "_") vzZoomAt(1 / 1.5, { x: VZ_VB.x + VZ_VB.w / 2, y: VZ_VB.y + VZ_VB.h / 2 });
    else if (e.key === "0") vzFit();
    else if (e.key === "/" || e.key === "f") { const f = $("#vzfind"); if (f) { e.preventDefault(); f.focus(); } }
  } else if (VZ_VIEW === "tl" && (e.key === "ArrowLeft" || e.key === "ArrowRight") && TL_SEL != null) {
    e.preventDefault(); tlPick(Math.max(0, Math.min(MAP.N - 1, TL_SEL + (e.key === "ArrowRight" ? 1 : -1))), false);
  }
}
