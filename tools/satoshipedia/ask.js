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
