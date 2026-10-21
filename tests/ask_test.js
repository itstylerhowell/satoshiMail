// AI Overview tests: node ask_test.js ../out/satoshi-mail.html
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const wait = ms => new Promise(r => setTimeout(r, ms));
const rep = [];
const check = (name, ok, extra = "") => rep.push(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);

function boot(withClaude, behaviour) {
  const errors = [], calls = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => errors.push("jsdomError: " + (e.detail && e.detail.stack || e.message)));
  vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://example.org/x", virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {} });
      w.HTMLElement.prototype.scrollTo = function () {}; w.HTMLElement.prototype.scrollIntoView = function () {};
      w.scrollTo = () => {};
      w.localStorage.setItem("satoshimail-beta-ack", "1");
      if (!withClaude) return;
      const sample = async (input, opts = {}) => {
        calls.push({ input, opts });
        if (behaviour === "decline") throw { code: "not_granted", message: "no" };
        let toolOut = "";
        if (opts.tools) toolOut = await opts.tools.find(t => t.name === "search_archive").execute({ query: "photo picture" }, { signal: new w.AbortController().signal });
        calls[calls.length - 1].toolOut = toolOut;
        const text = "Hal Finney was a cryptographer who ran Bitcoin from its first release [wiki-hal-finney]. He replied to the white paper [t-e1] and to v0.1 [t-zzz].";
        await wait(5);
        if (opts.signal && opts.signal.aborted) throw { code: "cancelled", message: "" };
        opts.onText && opts.onText({ text: text.slice(0, 40), delta: text.slice(0, 40) });
        await wait(5);
        opts.onText && opts.onText({ text, delta: text.slice(40) });
        return { text, truncated: false, modelTierApplied: "quick" };
      };
      sample.limits = async () => ({ maxPromptBytes: 262144, tools: { maxCount: 8 } });
      w.claude = { use: async name => (name === "sample" ? sample : null) };
    },
  });
  return { w: dom.window, d: dom.window.document, errors, calls };
}

(async () => {
  // A. no Claude in this view (the Cloudflare site): Satoshipedia fallback, no AI offer
  {
    const { w, d, errors } = boot(false);
    await wait(500);
    w.location.hash = "#search-hal%20finney"; await wait(150);
    const card = d.querySelector("#ask");
    check("A fallback card", !!card && card.querySelector(".ask-h b").textContent === "Overview" && /Hal Finney/.test(card.textContent) && !card.querySelector("[data-act=ask-go]"), card && card.textContent.slice(0, 120));
    check("A link to article", !!(card && card.querySelector('a[href="#wiki-hal-finney"]')));
    w.location.hash = "#search-did%20satoshi%20have%20any%20photos%3F"; await wait(150);
    check("A no card when nothing to say", !d.querySelector("#ask"));
    w.location.hash = "#search-from%3Ame"; await wait(150);
    check("A no card for operator-only search", !d.querySelector("#ask"));
    w.location.hash = "#search-hal%20finney~p2"; await wait(150);
    check("A no card on page 2", !d.querySelector("#ask"));
    check("A no errors", !errors.length, errors.join("\n"));
  }
  // B. Claude available: offer first, then answer with citations; re-render doesn't re-ask
  {
    const { w, d, errors, calls } = boot(true);
    await wait(500);
    w.location.hash = "#search-hal%20finney"; await wait(150);
    let card = d.querySelector("#ask");
    check("B offer shown", !!card && !!card.querySelector("[data-act=ask-go]") && calls.length === 0, card && card.textContent.slice(0, 140));
    card.querySelector("[data-act=ask-go]").click(); await wait(120);
    card = d.querySelector("#ask");
    const refs = [...card.querySelectorAll("a.ask-ref")].map(a => a.getAttribute("href") + "=" + a.textContent);
    check("B answer + refs", /cryptographer/.test(card.textContent) && refs.join(",") === "#wiki-hal-finney=1,#t-e1=2", refs.join(","));
    check("B invalid ref dropped", !/zzz/.test(card.innerHTML));
    check("B footer + off button", /can make mistakes/.test(card.textContent) && !!card.querySelector("[data-act=ask-off]"));
    check("B remembered", w.localStorage.getItem("satoshimail-ai-overview") === "1");
    const p = calls[0].input;
    check("B prompt grounded", typeof p === "string" && p.includes("Search: hal finney") && p.includes("[wiki-hal-finney]") && p.includes("Use ONLY the sources") && /\[t-[a-z0-9]+\]/.test(p) && p.length < 120000, "len " + p.length);
    check("B tools used", calls[0].opts.tools && calls[0].opts.tools.length === 2 && !("cache" in calls[0].opts) && /\[t-/.test(calls[0].toolOut || "No messages"), (calls[0].toolOut || "").slice(0, 80));
    check("B quick tier", calls[0].opts.modelTier === "quick");
    // a list re-render (sort toggle) repaints without a second request
    w.location.hash = "#search-hal%20finney"; await wait(10);
    const before = calls.length;
    d.querySelector("#main .row [data-act=star]").click(); await wait(80);
    const starred = !!d.querySelector("#main .row .star.on");
    check("B no re-ask on re-render", starred && calls.length === before && /cryptographer/.test(d.querySelector("#ask").textContent));
    // the next search runs automatically
    w.location.hash = "#search-did%20satoshi%20have%20any%20photos%3F"; await wait(150);
    check("B auto on next search", calls.length === before + 1 && /Search: did satoshi have any photos\?/.test(calls[calls.length - 1].input) && !!d.querySelector("#ask a.ask-ref"));
    check("B question w/ no hits still shows card", !!d.querySelector("#ask") && !!d.querySelector(".empty, .es, [class*=empty]") || !!d.querySelector("#ask"));
    d.querySelector("#ask [data-act=ask-off]").click(); await wait(20);
    check("B turned off", w.localStorage.getItem("satoshimail-ai-overview") === null && /off/.test(d.querySelector("#ask .ask-f").textContent));
    w.location.hash = "#search-martti"; await wait(150);
    check("B offer again after off", !!d.querySelector("#ask [data-act=ask-go]") && calls.length === before + 1);
    check("B no errors", !errors.length, errors.join("\n"));
  }
  // C. viewer declines: falls back quietly to Satoshipedia
  {
    const { w, d, errors, calls } = boot(true, "decline");
    await wait(500);
    w.location.hash = "#search-hal%20finney"; await wait(150);
    d.querySelector("#ask [data-act=ask-go]").click(); await wait(120);
    const card = d.querySelector("#ask");
    check("C declined -> plain overview", !!card && card.querySelector(".ask-h b").textContent === "Overview" && /Hal Finney/.test(card.textContent) && calls.length === 1);
    w.location.hash = "#search-martti%20malmi"; await wait(150);
    check("C not offered again", !d.querySelector("#ask [data-act=ask-go]") && calls.length === 1);
    check("C no errors", !errors.length, errors.join("\n"));
  }
  console.log(rep.join("\n"));
  process.exit(rep.some(r => r.startsWith("FAIL")) ? 1 : 0);
})().catch(e => { console.log("CRASH", e && e.stack || e); process.exit(1); });
