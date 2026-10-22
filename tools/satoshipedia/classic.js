/* ═════════════ Classic: Satoshi Mail as Gmail looked in 2008, with Satoshi's own touches ═════════════
   A text link bar instead of the app dock; "satoshin@gmx.com | Settings | Help | Sign out"; Search Mail /
   Search Satoshipedia buttons; Quick Contacts with status lines; a Web Clip of real Satoshi quotes above the
   inbox; and Gmail's classic footer ("Last account activity…", "standard | basic HTML"). */
const GB_APPS = [["Mail", "#inbox"], ["Satoshipedia", "#wiki"], ["Map", "#map"], ["Activity", "#activity"], ["Commits", "#commits"], ["Verify", "#verify"]];
function gbCurrent() {
  const h = location.hash;
  if (h.startsWith("#wiki")) return "Satoshipedia";
  if (h.startsWith("#map")) return "Map";
  if (h.startsWith("#activity")) return "Activity";
  if (h.startsWith("#commits")) return "Commits";
  if (h.startsWith("#verify")) return "Verify";
  return "Mail";
}
function gbarUpdate() {
  const cur = gbCurrent();
  document.querySelectorAll("#gbar [data-gb]").forEach(a => {
    const on = a.dataset.gb === cur;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}
// Satoshi's real email addresses, from the archive: which one is "signed in" is just for fun
const ACCTS = (() => {
  const by = new Map();
  for (const x of SENT) {
    const a = (x.m.fe || "").toLowerCase();
    if (!a || x.m.w || !/@/.test(a)) continue;
    const v = by.get(a) || { addr: a, n: 0, first: x.m.d, last: x.m.d, t: x.t, i: x.i };
    v.n++; v.first = Math.min(v.first, x.m.d);
    if (x.m.d >= v.last) { v.last = x.m.d; v.t = x.t; v.i = x.i; }
    by.set(a, v);
  }
  return [...by.values()].sort((a, b) => a.first - b.first);
})();
let ACCT = (ST.acct && ACCTS.some(a => a.addr === ST.acct)) ? ST.acct : (ACCTS.find(a => a.addr === "satoshin@gmx.com") || ACCTS[ACCTS.length - 1] || { addr: "satoshin@gmx.com" }).addr;
const acctRange = a => { const f = dt(a.first), l = dt(a.last), s = `${MON[f.getUTCMonth()]} ${f.getUTCFullYear()}`, e = `${MON[l.getUTCMonth()]} ${l.getUTCFullYear()}`; return s === e ? s : `${s} – ${e}`; };

// statuses for Quick Contacts: true to each correspondent, otherwise the month of their last email
const QC_STATUS = { "hal-finney": "Running bitcoin", "martti-malmi": "sirius on the forum", "gavin-andresen": "holds the alert key", "adam-back": "Hashcash", "wei-dai": "b-money" };
function qcStatus(slug) {
  if (QC_STATUS[slug]) return QC_STATUS[slug];
  let last = 0;
  for (const t of THREADS) if (t.s === slug) for (const m of t.m) if (m.d > last) last = m.d;
  return last ? `last email ${MON[dt(last).getUTCMonth()]} ${dt(last).getUTCFullYear()}` : "";
}
const QC_ME = `<li class="qc-me"><span class="nav"><span class="pres away" aria-hidden="true"></span><span class="t">Satoshi Nakamoto<small>“I've moved on to other things.”</small></span></span></li>`;

// Web Clip: one real Satoshi quote at a time, from The Quotable Satoshi
let CLIP_I = null;
const clipCut = (s, n) => s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s;
function clipHtml() {
  const C = RAW.clips || [];
  if (!C.length) return "";
  if (CLIP_I == null) CLIP_I = (new Date().getUTCDate() * 7) % C.length;   // a different clip each day
  const c = C[CLIP_I];
  const at = SENT.find(x => x.m.su === c.u || x.m.u === c.u);
  const src = at ? `<a href="#t-${at.t.id}" data-clipmi="${at.i}">${esc(c.st || at.t.t)}</a>` : `<a href="${esc(c.u)}" target="_blank" rel="noopener">${esc(c.st || "source")}</a>`;
  return `<div class="webclip" role="note" aria-label="Web Clip: a Satoshi quote">
    <span class="wc-l">Web Clip</span>
    <span class="wc-q">“${esc(clipCut(c.t.replace(/\s+/g, " ").trim(), 170))}”</span>
    <span class="wc-src">Satoshi, ${src}, ${esc(longDay(Date.UTC(+c.d.slice(0, 4), +c.d.slice(5, 7) - 1, +c.d.slice(8, 10)) / 1000))}</span>
    <span class="wc-nav"><button type="button" class="gblink" data-act="clip" data-d="-1" aria-label="Previous clip">‹</button><button type="button" class="gblink" data-act="clip" data-d="1" aria-label="Next clip">›</button></span>
  </div>`;
}

// the footer, as Gmail had it in 2008
let GF_LAST = null;
function gfootHtml() {
  if (!GF_LAST) GF_LAST = SENT.filter(x => !x.m.w).reduce((a, x) => (!a || x.m.d > a.m.d ? x : a), null);
  const A = ACCTS.find(a => a.addr === ACCT);
  const L = A ? { t: A.t, i: A.i, m: A.t.m[A.i] } : GF_LAST, yrs = L ? Math.floor((Date.now() / 1000 - L.m.d) / (365.25 * 86400)) : 0;
  const basic = (window.SM_SITE ? "" : SITE_URL) + "conversations/";
  return `<footer class="gfoot">
    ${L ? `<p>Last account activity: ${esc(longDay(L.m.d))} (${yrs} years ago) at ${esc(ACCT)}. <a href="#t-${L.t.id}" data-clipmi="${L.i}">Details</a></p>` : ""}
    <p>Satoshi Mail view: <b>standard</b> | <a href="${basic}">basic HTML</a> &nbsp; <a href="#about">Learn more</a></p>
    <p>There will only ever be 21,000,000 bitcoins. Satoshi wrote ${fmtNum(SENT.filter(x => !x.m.w).length)} of these messages and ${fmtNum(COMMITS.length)} commits.</p>
    <p>Contact and corrections: <a href="mailto:${CONTACT_EMAIL}?subject=Satoshi%20Mail">${CONTACT_EMAIL}</a> · <a href="#about">How Satoshi Mail is made</a></p>
    <p class="gf-links">©2008–2011 Satoshi Nakamoto · Satoshi Mail by <a href="https://x.com/TylerHowell88" target="_blank" rel="noopener">Tyler Howell</a> · <a href="#sources">Sources</a> · <a href="#updates">Update log</a> · <a href="#verify">Verify</a></p>
  </footer>`;
}

(function classicInit() {
  const top = $("#app header.top");
  if (!top) return;
  top.insertAdjacentHTML("beforebegin", `<div class="gbar" id="gbar">
    <nav class="gb-apps" aria-label="Satoshi Mail apps">${GB_APPS.map(([n, h]) => `<a href="${h}" data-gb="${n}">${n}</a>`).join("")}</nav>
    <nav class="gb-acct" aria-label="Account"><button type="button" class="gb-me" data-act="acct" aria-haspopup="menu" title="Switch between Satoshi's email addresses"><b id="gbme">${esc(ACCT)}</b><span aria-hidden="true">▾</span></button><span class="sep" aria-hidden="true">|</span><button type="button" class="gblink" data-act="settings">Settings</button><span class="sep" aria-hidden="true">|</span><button type="button" class="gblink" data-act="help">Help</button><span class="sep" aria-hidden="true">|</span><button type="button" class="gblink" data-act="signout">Sign out</button></nav>
  </div>`);
  const brand = top.querySelector(".brand > span");
  if (brand) brand.insertAdjacentHTML("beforeend", `<small class="by">Satoshi Nakamoto’s mail, archived</small>`);
  const form = $("#searchform");
  if (form) form.insertAdjacentHTML("afterend", `<div class="gs-btns"><button class="gbtn" type="submit" form="searchform">Search Mail</button><button class="gbtn" type="button" data-act="gs-wiki">Search Satoshipedia</button><span class="gs-links"><button type="button" class="gblink" data-act="adv">Show search options</button><button type="button" class="gblink" data-act="random">I'm feeling lucky</button></span></div>`);
  gbarUpdate();
  addEventListener("hashchange", gbarUpdate);
})();
ACTIONS.acct = el => popover(el, `<h4>Satoshi's email addresses</h4>${ACCTS.map(a => `<button class="mi acct-mi${a.addr === ACCT ? " on" : ""}" data-act="acct-set" data-v="${esc(a.addr)}" role="menuitemradio" aria-checked="${a.addr === ACCT}"><span class="acct-tick" aria-hidden="true">${a.addr === ACCT ? "✓" : ""}</span><span><b>${esc(a.addr)}</b><small>${esc(acctRange(a))} · ${fmtNum(a.n)} email${a.n === 1 ? "" : "s"} in the archive</small></span></button>`).join("")}<p class="acct-note">Just for fun: switching changes the address shown, not the archive.</p>`, "right");
ACTIONS["acct-set"] = el => {
  ACCT = el.dataset.v; ST.acct = ACCT; save(); closeLayer();
  const me = $("#gbme"); if (me) me.textContent = ACCT;
  const a = ACCTS.find(x => x.addr === ACCT);
  const f = $(".gfoot"); if (f) f.outerHTML = gfootHtml();
  snack(`Switched to ${ACCT}${a ? `. Satoshi used it ${acctRange(a)}.` : "."}`);
};
ACTIONS.signout = () => snack("Satoshi signed out on 26 April 2011. He never signed back in.");
ACTIONS["gs-wiki"] = () => { const q = ($("#q").value || "").trim(); location.hash = q ? "#wiki~search~" + q : "#wiki"; };
ACTIONS.clip = el => { const n = (RAW.clips || []).length; if (!n) return; CLIP_I = (CLIP_I + +el.dataset.d + n) % n; const w = $(".webclip"); if (w) w.outerHTML = clipHtml(); };
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a[data-clipmi]");
  if (a) { LAST_LIST = location.hash; HIT = { id: a.getAttribute("href").slice(3), hits: [+a.dataset.clipmi], terms: [] }; }
}, true);
