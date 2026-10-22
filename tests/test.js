const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => errors.push("jsdomError: " + (e.detail && e.detail.stack || e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));
const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
  runScripts: "dangerously", pretendToBeVisual: true, url: "https://example.org/x", virtualConsole: vc,
  beforeParse(w) {
    w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {} });
    w.HTMLElement.prototype.scrollTo = function () {}; w.HTMLElement.prototype.scrollIntoView = function () {};
    w.scrollTo = () => {};
  },
});
const w = dom.window, d = w.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
const go = async h => { w.location.hash = h; await wait(30); };
const $ = s => d.querySelector(s);
(async () => {
  await wait(100);
  const rep = [];
  const check = (name, ok, extra = "") => rep.push(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
  check("mail boots", !$("#app").hidden && $("#wkwin").hidden);
  await wait(800);
  check("beta pill", !!$(".top .beta-pill") && !!$("#wkwin .beta-pill"));
  check("beta note shown", !$("#betanote").hidden);
  $(".top .beta-pill").click(); await wait(20);
  check("beta dialog", !!$("#layer .beta-dlg") && $("#betanote").hidden, $("#layer h2")?.textContent);
  $('#layer [data-act="beta-ok"]').click(); await wait(20);
  check("beta ack", !$("#layer .beta-dlg") && w.localStorage.getItem("satoshimail-beta-ack") === "1");
  check("credit rail", $(".rail .made-by a")?.href === "https://x.com/TylerHowell88" && $(".rail .made-by").textContent.includes("Founded and made by Tyler Howell"));
  check("dock", d.querySelectorAll("#dock .dk").length === 5 && !d.querySelector('#dock [data-dock="people"], #dock [data-dock="more"]') && $('#dock [data-dock="mail"]').classList.contains("on"));
  await go("#wiki");
  check("wiki window shown over mail", !$("#app").hidden && !$("#wkwin").hidden && !$("#wkscrim").hidden && d.body.classList.contains("in-wiki") && $('#dock [data-dock="wiki"]').classList.contains("on"));
  const main = $("#wkmain");
  check("featured", !!main.querySelector(".wk-box.feat a.wl"), main.querySelector(".wk-box.feat b")?.textContent);
  check("dyk 4", main.querySelectorAll(".wk-box.dyk li").length === 4);
  check("otd", main.querySelectorAll(".wk-otd li").length > 0, main.querySelector(".wk-otd")?.previousElementSibling?.textContent);
  check("rank 10", main.querySelectorAll(".wk-rank tr").length === 10, [...main.querySelectorAll(".wk-rank tr")].map(r => r.children[1].textContent + ":" + r.children[2].textContent).join(" | "));
  check("nav", $("#wknav").querySelectorAll("a").length > 20);
  // every article
  const slugs = JSON.parse(d.getElementById("wiki-data").textContent).articles.map(a => a.slug);
  let bad = [];
  let unresolved = [];
  for (const s of slugs) {
    await go("#wiki-" + s);
    const art = main.querySelector("article.wk-art");
    if (!art || art.dataset.slug !== s) { bad.push(s); continue; }
    art.querySelectorAll("a.ml").forEach(a => { const h = a.getAttribute("href") || ""; if (!h.startsWith("#t-")) unresolved.push(s + ": " + (a.dataset.title || a.textContent)); });
    art.querySelectorAll("a.cl").forEach(a => { const h = a.getAttribute("href") || ""; if (!h.startsWith("#t-")) unresolved.push(s + ": commit " + a.dataset.sha); });
    art.querySelectorAll("a.ml[data-from], a.ml[data-date]").forEach(a => { if (a.dataset.mi == null) unresolved.push(s + ": no msg idx for " + a.dataset.title + " from=" + a.dataset.from + " date=" + a.dataset.date); });
    art.querySelectorAll(".w-live").forEach(l => { if (!l.innerHTML.trim()) unresolved.push(s + ": empty live " + l.dataset.live); });
    art.querySelectorAll("a[data-cite]").forEach(a => { if (!d.getElementById("cite-" + a.dataset.cite)) unresolved.push(s + ": missing cite " + a.dataset.cite); });
    art.querySelectorAll("a.wl").forEach(a => { if (!slugs.includes(a.dataset.slug)) unresolved.push(s + ": bad wl " + a.dataset.slug); });
  }
  check("all articles render", !bad.length, bad.join(","));
  check("links resolved", !unresolved.length, "\n  " + unresolved.join("\n  "));
  // widgets sample
  await go("#wiki-writing-style");
  check("hours chart", !!main.querySelector(".w-chart svg"), main.querySelector(".w-live[data-live=posting-hours] .note")?.textContent);
  check("spellings", main.querySelectorAll(".w-live[data-live=spellings] tr").length === 7, main.querySelector(".w-live[data-live=spellings] .note")?.textContent);
  check("double", true, main.querySelector(".w-live[data-live=double-space] .note")?.textContent);
  await go("#wiki-satoshis-accounts");
  check("addresses", main.querySelectorAll(".w-live[data-live=addresses] tbody tr").length >= 3, [...main.querySelectorAll(".w-live[data-live=addresses] tbody tr")].map(r => r.textContent).join(" | "));
  await go("#wiki-departure-of-satoshi-nakamoto");
  check("timeline", main.querySelectorAll(".w-tl li").length >= 4, "\n  " + [...main.querySelectorAll(".w-tl li")].map(r => r.textContent).join("\n  "));
  await go("#wiki-satoshi-nakamoto");
  check("by-year", main.querySelectorAll(".w-bars .bar").length >= 4, main.querySelector(".w-live[data-live=by-year] .note")?.textContent);
  await go("#wiki-quotable-satoshi");
  check("quote", !!main.querySelector(".w-quote"), main.querySelector(".w-quote")?.textContent.slice(0, 160));
  await go("#wiki-hal-finney");
  check("person archive", !!main.querySelector(".wk-arch"), main.querySelector(".wk-arch .stats")?.textContent.replace(/\s+/g, " "));
  check("infobox open", !!main.querySelector(".wk-ibox .open a"), main.querySelector(".wk-ibox .open a")?.getAttribute("href"));
  // click a mail link → goes to thread with HIT, back returns
  const ml = main.querySelector("a.ml[data-mi]") || main.querySelector("a.ml");
  const href = ml.getAttribute("href");
  ml.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
  await go(href); await wait(220);
  check("thread open from wiki", $("#wkwin").hidden && !!$("#msgs"), href + " " + ($(".conv-h h1")?.textContent || ""));
  check("minimized bar", !$("#wkminbar").hidden && $("#wkmint").textContent === "Hal Finney" && $('#dock [data-dock="wiki"]').classList.contains("run"), $("#wkmint").textContent);
  $(".wk-restore").click(); await wait(40);
  check("restore", !$("#wkwin").hidden && w.location.hash === "#wiki-hal-finney" && $("#wkminbar").hidden, w.location.hash);
  $('#wiki [data-wkwin="close"]').click(); await wait(240);
  check("close", $("#wkwin").hidden && $("#wkminbar").hidden && w.location.hash === "#t-x3" && !$('#dock [data-dock="wiki"]').classList.contains("run"), w.location.hash);
  $('#dock [data-dock="wiki"]').click(); await wait(40);
  check("dock opens main", !$("#wkwin").hidden && w.location.hash === "#wiki", w.location.hash);
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(240);
  check("esc minimizes", $("#wkwin").hidden && !$("#wkminbar").hidden && w.location.hash === "#t-x3", w.location.hash);
  check("no apps grid by the profile", !d.querySelector('[data-act="apps"]') && !!d.querySelector(".top [data-act=settings]") && !!d.querySelector(".top [data-act=account]"));
  check("dock apps", [...d.querySelectorAll("#dock .dk .lb")].map(x => x.textContent).join(",") === "Mail,Satoshipedia,Map,Activity,Commits");
  $('#dock [data-dock="commits"]').click(); await wait(40);
  check("dock commits", w.location.hash === "#commits" && $('#dock [data-dock="commits"]').classList.contains("on"), w.location.hash);
  await go("#t-x3");
  check("conv chips", !!$(".conv-wiki"), $(".conv-wiki")?.textContent);
  // routes
  for (const r of ["#wiki~all", "#wiki~cats", "#wiki~cat~people", "#wiki~search~genesis", "#wiki~about", "#wiki-nope"]) {
    await go(r);
    check("route " + r, !$("#wkwin").hidden && main.innerHTML.length > 100, main.querySelector("h1")?.textContent + " / " + main.querySelector(".wk-from")?.textContent);
  }
  await go("#wiki~random"); await wait(30);
  check("random", w.location.hash.startsWith("#wiki-") && !!main.querySelector("article"), w.location.hash);
  // suggestions
  $("#wkq").focus(); $("#wkq").value = "hal"; $("#wkq").dispatchEvent(new w.Event("input"));
  check("suggest", !$("#wksug").hidden && $("#wksug").querySelectorAll("a").length >= 3, [...$("#wksug").querySelectorAll("b")].map(b => b.textContent).join(" | "));
  $("#wksearch").dispatchEvent(new w.Event("submit", { cancelable: true }));
  await wait(30);
  check("submit", w.location.hash === "#wiki-hal-finney", w.location.hash);
  // keyboard g w from mail
  await go("#inbox");
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "g", bubbles: true }));
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "w", bubbles: true }));
  await wait(30);
  check("g w", w.location.hash === "#wiki", w.location.hash);
  $('#wiki [data-wkwin="max"]').click(); await wait(20);
  check("max", $("#wkwin").classList.contains("max") && $("#wkscrim").hidden);
  $('#wiki [data-wkwin="max"]').click();
  check("banner", (d.querySelector("#app") && d.body.innerHTML.includes('Satoshipedia</a>, linked at the top')));
  await go("#inbox");
  await go("#wiki"); check("credit wiki footer", !!$("#wkfoot .made-by-foot a[href='https://x.com/TylerHowell88']"));
  await go("#wiki~about"); check("credit wiki about", main.innerHTML.includes("TylerHowell88"));
  await go("#about"); check("credit mail about", !!$(".made-by-lead a"));
  await go("#inbox");
  const seen = new Set();
  for (let n = 0; n < 12; n++) { d.querySelector('[data-act="compose"]').click(); await wait(5); seen.add($("#cj-t")?.textContent); }
  check("compose joke", !!$(".cj") && !d.getElementById("compose") && !d.querySelector('a[href="#drafts"]'), [...seen].join(" | "));
  $('#layer [data-act="compose"]').click(); await wait(5);
  check("try again", !!$(".cj"));
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); $('#layer [data-act="closelayer"]')?.click(); await wait(5);
  await go("#t-x3");
  $('[data-act="reply"]').click(); await wait(5);
  check("reply joke", !!$(".cj") && !d.getElementById("compose"), $("#cj-t")?.textContent + " / " + $("#cj-b")?.textContent);
  $('#layer [data-act="closelayer"]').click(); await wait(5);
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "c", bubbles: true })); await wait(5);
  check("c key joke", !!$(".cj"));
  let drafts = []; try { drafts = JSON.parse(w.localStorage.getItem(Object.keys(w.localStorage).find(k => /state|satoshi/i.test(k) && w.localStorage.getItem(k).includes("drafts")) || "x") || "{}").drafts || []; } catch (e) {}
  check("no drafts saved", drafts.length === 0);
  await go("#inbox");
  const trashBtns = () => [...d.querySelectorAll('[data-act="trash"], a[href="#trash"]')].length + [...d.querySelectorAll(".ms")].filter(x => x.textContent === "delete").length;
  const n1 = trashBtns();
  await go("#t-x3"); const n2 = trashBtns();
  d.querySelector(".row") ; await go("#trash");
  check("no trash", n1 === 0 && n2 === 0 && !w.location.hash.includes("trash") || (n1 === 0 && n2 === 0 && $(".tab") !== null), `inbox=${n1} thread=${n2} #trash shows ${$("#main .title")?.textContent || $(".tab.on")?.textContent || ""}`);
  await go("#map"); await wait(30);
  check("map opens", !$("#vzwin").hidden && d.body.classList.contains("in-map") && $('#dock [data-dock="map"]').classList.contains("on"), `${d.querySelectorAll("#vznodes .node").length} nodes; ${$("#vzts")?.textContent}`);
  check("map top10", d.querySelectorAll(".vz-top10 li").length === 10, [...d.querySelectorAll(".vz-top10 li")].map(li => li.textContent.replace(/\s+/g, " ").trim()).join(" | "));
  d.querySelector('.vz-top10 button[data-vzp]').click(); await wait(30);
  check("map select", w.location.hash.startsWith("#map~p~") && !!$("#vzside h2") && d.querySelectorAll(".vz-threads a").length > 0, w.location.hash + " " + $("#vzside h2")?.textContent);
  $("#vzt").value = 5; $("#vzt").dispatchEvent(new w.Event("input")); await wait(10);
  check("scrubber", $("#vzto").textContent.length > 0 && d.querySelectorAll("#vznodes .node.off").length > 0, $("#vzto").textContent + " / " + $("#vzts").textContent);
  $('[data-vzf="x"]').click(); await wait(10);
  $('[data-vzm="list"]').click(); await wait(10);
  check("list view", !$("#vzlist").hidden && d.querySelectorAll("#vzlist tbody tr").length > 0, d.querySelectorAll("#vzlist tbody tr").length + " rows");
  $('[data-vzf="all"]').click(); $('[data-vzm="diagram"]').click(); $("#vzt").value = $("#vzt").max; $("#vzt").dispatchEvent(new w.Event("input"));
  await go("#map~timeline"); await wait(30);
  check("timeline", !!$(".vz-tl svg") && d.querySelectorAll(".vz-mlist li").length > 10, d.querySelectorAll(".vz-mlist li").length + " milestones: " + [...d.querySelectorAll(".vz-mlist li b")].map(b => b.textContent).join(" | "));
  const vml = d.querySelector('.vz-mlist a[href^="#t-"]'); const mh = vml.getAttribute("href"); vml.click(); await go(mh); await wait(220);
  check("map -> thread", $("#vzwin").hidden && !!$("#msgs") && !d.body.classList.contains("in-map"), mh);
  await go("#wiki-hal-finney"); check("wiki map link", !!$('#wkmain a[href="#map~p~hal-finney"]'));
  await go("#map"); for (let n = 0; n < 3 && !$("#vzwin").hidden && w.location.hash.startsWith("#map"); n++) { d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(400); }   // Esc: deselect, then zoom out, then close
  check("map esc closes", $("#vzwin").hidden && !w.location.hash.startsWith("#map"), w.location.hash);
  await go("#t-x68"); await wait(20);
  check("no source chips on conversations", !$(".conv-src") && !d.querySelector("#main a[href^='https://www.blocktrainer'], #main a[href^='https://satoshin.name/']"), [!!$(".conv-src"), w.location.hash, [...d.querySelectorAll("#main a[href^='https://www.blocktrainer'], #main a[href^='https://satoshin.name/']")].map(a => a.href + " in " + a.parentElement.className).join(" ")].join(" / "));
  await go("#t-x1"); await wait(20); check("satoshipedia chips stay", !!d.querySelector("#main .conv-wiki a[href^='#wiki-']"));
  await go("#wiki-blocktrainer-archive"); check("bt article", main.textContent.includes("4,236"));
  await go("#about"); check("about bt", $("#main").textContent.includes("Blocktrainer"));
  await go("#t-e1"); await wait(20);
  d.querySelectorAll("#msgs .msg").forEach(m => m.classList.add("showdet"));
  check("no satoshin rows in details", !d.querySelector("#msgs a[href^='https://satoshin.name/']") && !!d.querySelector("#main .conv-wiki a[href^='#wiki-']"));
  $(".top [data-act=settings]").click(); await wait(20);
  check("settings → sources", !!d.querySelector("#layer a.mi[href='#sources']"));
  check("no density setting", !/Density|Comfortable|Compact/.test($("#layer").textContent) && !d.querySelector("#layer input[name=density]") && /Theme/.test($("#layer").textContent) && !d.documentElement.hasAttribute("data-density"));
  check("settings → feedback", !!d.querySelector("#layer [data-act=feedback]") && /Help/.test($("#layer").textContent));
  d.querySelector("#layer [data-act=feedback]").click(); await wait(20);
  const fb = $("#fbdlg"), xa = () => fb.querySelector("a.fb-send");
  check("feedback dialog", !!fb && fb.querySelectorAll("a.fb-send").length === 1 && !/github/i.test(fb.innerHTML) && xa().getAttribute("aria-disabled") === "true" && d.activeElement === fb.querySelector("#fbtext"));
  fb.querySelector("input[value=data]").click();
  fb.querySelector("#fbtext").value = "The date on the Laszlo email looks wrong.";
  fb.querySelector("#fbtext").dispatchEvent(new w.Event("input", { bubbles: true }));
  const xu = new w.URL(xa().href);
  check("feedback x link", xu.origin + xu.pathname === "https://x.com/intent/post" && xu.searchParams.get("text") === "@TylerHowell88 Satoshi Mail feedback (wrong or missing message): The date on the Laszlo email looks wrong." && xa().target === "_blank" && xa().getAttribute("aria-disabled") === "false", xu.searchParams.get("text"));
  fb.querySelector("#fbtext").value = "x".repeat(600); fb.querySelector("#fbtext").dispatchEvent(new w.Event("input", { bubbles: true }));
  check("feedback fits one post", new w.URL(xa().href).searchParams.get("text").length === 280 && /^0 characters left/.test(fb.querySelector("#fbcount").textContent), fb.querySelector("#fbcount").textContent);
  fb.querySelector("#fbtext").dispatchEvent(new w.KeyboardEvent("keydown", { key: "c", bubbles: true })); await wait(5);
  check("typing c doesn't open compose", !!$("#fbdlg") && !$(".cj"));
  $('#layer [data-act="closelayer"]').click(); await wait(5);
  await go("#about"); check("about feedback link", !!d.querySelector("#main [data-act=feedback]"));
  await go("#wiki"); check("wiki footer feedback", !!d.querySelector("#wkfoot [data-act=feedback]"));
  await go("#t-e1"); await wait(20);
  $(".top [data-act=settings]").click(); await wait(20);
  d.querySelector("#layer a.mi[href='#sources']").click(); w.location.hash = "#sources"; await wait(40);
  const sp = $("#main .src-page");
  check("sources page", !!sp && /Satoshi Nakamoto Institute/.test(sp.textContent) && /nakamoto-archive/.test(sp.textContent) && /Bitcoin Core/.test(sp.textContent) && /bitcoin\.org/.test(sp.textContent) && /Blocktrainer/.test(sp.textContent) && /satoshin\.name/.test(sp.textContent) && /Wikipedia/.test(sp.textContent), sp && sp.textContent.length);
  check("sources counts", /567 messages match/.test(sp.textContent) && /203 commits/.test(sp.textContent) && sp.querySelectorAll(".src-t tbody tr").length >= 5);
  check("sources date notes link", !!sp.querySelector("a[href^='#t-x']") && /11 December 2009/.test(sp.textContent));
  check("sources title", d.title.startsWith("Sources"), d.title);
  { const D = JSON.parse(d.getElementById("data").textContent); let n = 0;
    const X = JSON.parse(d.getElementById("satoshin-data").textContent).msgs;   // same key rule as wiki.js SATOSHIN.key
    const key = m => { const u = m.u || "", f = u.match(/bitcointalk\.org\/.*?msg(\d+)/); return f ? "bitcointalk:" + f[1] : u.replace(/^https?:\/\//, "").replace(/\/+$/, ""); };
    for (const t of D.threads) for (const m of t.m) if (m.s && X[key(m)]) n++;
    check("satoshin all links resolve", n === 567, n); }
  { // public-records additions
    const D = JSON.parse(d.getElementById("data").textContent);
    const bohm = D.threads.filter(t => t.s === "nicholas-bohm"), staff = D.threads.filter(t => t.s === "forum-staff");
    const sat = ts => ts.reduce((n, t) => n + t.m.filter(m => m.s).length, 0);
    check("bohm emails", bohm.length === 16 && sat(bohm) === 25, bohm.length + "/" + sat(bohm));
    check("staff posts", staff.length === 3 && sat(staff) === 20, staff.length + "/" + sat(staff));
    const blob = d.getElementById("data").textContent;
    check("no private details", D.threads.filter(t => t.s === "nicholas-bohm").every(t => t.m.every(m => m.b.every(([, x]) =>
      !/\b0\d{3,4} ?\d{6}\b|\b[A-Z]{1,2}\d{1,2}[A-Z]? \d[A-Z]{2}\b|\b(?:[0-9A-F]{4} ){4,}[0-9A-F]{4}\b|\bHP\d{11}\b/.test(x) &&
      !(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(x.replace(/\b0\.0\.0\.0\b/g, "")))))));
    const g = D.threads.find(t => t.t === "Email to Gavin Andresen");
    check("gavin split", g.m.length === 2 && g.m[0].d === 1303806540 && g.m[1].f === "Gavin Andresen" && !/Eleven years ago/.test(g.m[0].b[0][1]));
    const ab = D.threads.find(t => t.s === "adam-back");
    check("adam back times", ab.m.map(m => m.d).join() === "1219253439,1219323359,1219341589,1219342637,1231613205" && ab.m.every(m => !m.dp && /AB1/.test(m.od)));
    const wd = D.threads.find(t => t.s === "wei-dai");
    check("wei dai dates", wd.m[0].d === 1219423080 && wd.m[2].d === 1231586220 && wd.m[2].dp === "local");
    await go("#updates"); check("update log", d.querySelectorAll("#main .upd").length >= 10 && /Update log/.test(d.querySelector("#main").textContent));
    check("update log in settings", /href="#updates"/.test(html));
    await go("#verify"); check("verify page", !!d.querySelector("#main .vf-page") && /Bitcoin/.test(d.querySelector("#main").textContent));
    check("verify links", /href="#verify~t\/\$\{t\.id\}\/\$\{i\}"/.test(html) && /href="#verify~c\/\$\{c\.id\}"/.test(html));
    await go("#label-nicholas-bohm"); check("bohm label", d.querySelectorAll("#main .row").length === 16);
    await go("#wiki-nicholas-bohm");
    const fee = [...main.querySelectorAll("a.ml")].find(a => a.dataset.date === "2009-05-24");
    const feeT = fee && D.threads.find(t => "#t-" + t.id === fee.getAttribute("href"));
    check("date picks thread", !!feeT && feeT.m.some(m => new Date(m.d * 1000).toISOString().startsWith("2009-05-24")), fee && fee.getAttribute("href"));
    check("bohm article", /retired English solicitor/.test(main.textContent) && main.querySelectorAll("a.ml").length >= 7);
    await go("#wiki-copa-v-wright"); check("copa article", /\[2024\] EWHC 1198 \(Ch\)/.test(main.textContent) && !!main.querySelector('a[href^="https://caselaw.nationalarchives.gov.uk/"]'));
    await go("#wiki-forum-staff-board"); check("staff article", /blank/.test(main.textContent));
    await go("#sources"); const sp2 = $("#main .src-page");
    check("sources new", /Nicholas Bohm's emails/.test(sp2.textContent) && /saved staff topics/.test(sp2.textContent) && /Court records/.test(sp2.textContent) && /16 conversations, 64 emails, 25 by Satoshi/.test(sp2.textContent), (sp2.textContent.match(/\d+ conversations, \d+ emails, \d+ by Satoshi/g) || []).join(" | "));
  }
  await go("#wiki-satoshin-archive"); check("satoshin article", main.textContent.includes("567") && main.textContent.includes("January 2020"));
  await go("#about"); check("about satoshin", $("#main").textContent.includes("satoshin.name"));
  console.log(rep.join("\n"));
  console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no errors");
  process.exit(0);
})().catch(e => { console.log("CRASH", e.stack); console.log(errors.join("\n")); process.exit(1); });
