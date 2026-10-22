/* ═════════════ Verify (#verify, #verify~t/<thread>/<i>, #verify~c/<commit>) ═════════════
   Every message and commit has a SHA-256 fingerprint of its exact contents; each version of the archive's
   list of fingerprints (its manifest) is timestamped in Bitcoin with OpenTimestamps (tools/timestamp.py and
   the GitHub Action). This page recomputes fingerprints in the browser and checks them against the proofs. */
const VF_SITE = SITE_URL + "verify/";
const VF_BASE = window.SM_SITE ? "verify/" : VF_SITE;
let VF_INDEX = null;
const VF_TEXT = new Map();
const vfHex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
const vfSha = async s => vfHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
function vfLoadIndex() {
  if (typeof fetch !== "function") return Promise.resolve(null);
  if (!VF_INDEX) VF_INDEX = fetch(VF_BASE + "index.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : null).catch(() => null);
  return VF_INDEX;
}
function vfText(name) {
  if (typeof fetch !== "function") return Promise.resolve(null);
  if (!VF_TEXT.has(name)) VF_TEXT.set(name, fetch(VF_BASE + name).then(r => r.ok ? r.text() : null).catch(() => null));
  return VF_TEXT.get(name);
}
// what gets hashed, exactly as tools/timestamp.py hashes it
function vfItem(key) {
  let m;
  if ((m = /^t\/([^/]+)\/(\d+)$/.exec(key || ""))) {
    const t = BY_ID.get(m[1]), i = +m[2], msg = t && t.m[i];
    if (!msg) return null;
    return { key, kind: "message", t, i, title: t.t, who: msg.f, d: msg.d, href: `#t-${t.id}`, mi: i, canon: JSON.stringify([t.id, i, msg.f, msg.d, msg.b]) };
  }
  if ((m = /^c\/(.+)$/.exec(key || ""))) {
    const c = BY_COMMIT.get(m[1]);
    if (!c) return null;
    return { key, kind: "commit", title: c.s, who: "Satoshi Nakamoto", d: c.d, href: `#t-${c.id}`, canon: JSON.stringify([c.id, c.sha, c.d, c.s]) };
  }
  return null;
}
const vfBlock = h => `<a href="https://blockstream.info/block-height/${h}" target="_blank" rel="noopener">block ${fmtNum(h)}</a>`;
const vfWhen = v => { const d = new Date(v.date.replace("Z", ":00Z")); return isNaN(d) ? v.date : d.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }); };
function vfStatus(v) {
  if (!v) return `<span class="vf-pill none">Not timestamped yet</span>`;
  if (v.status === "confirmed") return `<span class="vf-pill ok">${ic("verified", "fill")}In Bitcoin ${vfBlock(v.block)}</span>`;
  if (v.status === "pending") return `<span class="vf-pill wait">${ic("schedule")}Waiting for a Bitcoin block</span>`;
  return `<span class="vf-pill none">Not timestamped yet</span>`;
}
function renderVerify() {
  CURRENT_LIST = [];
  const item = ROUTE.key ? vfItem(ROUTE.key) : null;
  $("#main").innerHTML = `<div class="scroll"><div class="page vf-page">
    <h2>Verify the archive</h2>
    <p class="lead">Every email, forum post and commit here has a fingerprint: a SHA-256 hash of its exact words, sender and date. Change a single character and the fingerprint changes. The list of all fingerprints is timestamped in the Bitcoin blockchain, so anyone can prove that each message existed, word for word, by that date, and hasn't been edited since.</p>
    ${ROUTE.key ? `<section class="vf-card" id="vfitem">${item ? `<p class="muted">Checking…</p>` : `<p>That message isn't in the archive.</p>`}</section>` : ""}
    <section class="vf-card" id="vfarchive"><p class="muted">Loading the proofs…</p></section>
    <h3>Check it yourself</h3>
    <ol class="vf-steps">
      <li>Download a version's <b>manifest</b> (the list of fingerprints) and its <b>.ots proof</b> below.</li>
      <li>Drop both files on <a href="https://opentimestamps.org/" target="_blank" rel="noopener">opentimestamps.org</a>, or run <code>ots verify</code> with the <a href="https://github.com/opentimestamps/opentimestamps-client" target="_blank" rel="noopener">OpenTimestamps client</a>. It shows the Bitcoin block that proves the manifest existed by then.</li>
      <li>To check one message, open its details (${ic("arrow_drop_down")} beside the recipient) and choose <b>Verify</b>: this page recomputes its fingerprint and finds it in the manifest. You can also hash it yourself: the exact text that's hashed is shown, with a command to run.</li>
    </ol>
    <p class="muted">Satoshi Mail's own fingerprints prove the archive hasn't changed since it was timestamped. They don't prove who wrote a message originally: for that, each message links to its source.</p>
  </div></div>`;
  vfFill(item);
}
async function vfFill(item) {
  const at = location.hash, still = () => location.hash === at;
  const ix = await vfLoadIndex();
  if (!still()) return;
  const box = $("#vfarchive");
  if (!ix) {
    box.innerHTML = `<p>The Bitcoin proofs are published with the website. <a href="${VF_SITE}" target="_blank" rel="noopener">Open the proofs on ${SITE_URL.replace(/^https:\/\/|\/$/g, "")}</a>.</p>`;
  } else {
    const vs = ix.versions || [], cur = ix.current, curV = cur && vs.find(v => v.root === cur.root);
    box.innerHTML = `<div class="vf-head"><h3>This version of the archive</h3>${vfStatus(curV)}</div>
      <dl class="vf-dl"><dt>Fingerprint</dt><dd><code class="vf-hash">${esc(cur ? cur.root : "—")}</code></dd>
        <dt>Contents</dt><dd>${cur ? fmtNum(cur.items) : "—"} messages and commits</dd>
        ${curV ? `<dt>Timestamped</dt><dd>${esc(vfWhen(curV))}</dd>` : `<dt>Timestamp</dt><dd>The newest version is timestamped automatically within a few hours of going live.</dd>`}</dl>
      <div class="vf-acts"><button class="pillbtn" type="button" data-act="vf-check">${ic("fact_check")}Check this copy</button>
        ${curV ? `<a class="pillbtn" href="${VF_BASE}${esc(curV.manifest)}" download>${ic("description")}Manifest</a>` : `<a class="pillbtn" href="${VF_BASE}current.txt" download>${ic("description")}Manifest</a>`}
        ${curV && curV.ots ? `<a class="pillbtn" href="${VF_BASE}${esc(curV.ots)}" download>${ic("download")}.ots proof</a>` : ""}</div>
      <p class="vf-out" id="vfcheck" aria-live="polite"></p>
      ${vs.length ? `<h3>Every version</h3><table class="vf-table"><thead><tr><th>Date</th><th>Fingerprint</th><th>Proof</th><th>Files</th></tr></thead><tbody>${vs.map(v => `<tr${cur && v.root === cur.root ? ` class="cur"` : ""}><td>${esc(vfWhen(v))}</td><td><code>${esc(v.root.slice(0, 16))}…</code></td><td>${vfStatus(v)}</td><td><a href="${VF_BASE}${esc(v.manifest)}" download>manifest</a>${v.ots ? ` · <a href="${VF_BASE}${esc(v.ots)}" download>.ots</a>` : ""}</td></tr>`).join("")}</tbody></table>` : ""}`;
  }
  if (!item) return;
  if (!(window.crypto && crypto.subtle)) { $("#vfitem").innerHTML = `<p>This browser can't compute fingerprints. Try a current version of Chrome, Firefox, Safari or Edge.</p>`; return; }
  const hash = await vfSha(item.canon);
  if (!still()) return;
  const line = `${hash} ${item.key}\n`;
  let found = null;
  if (ix) {
    // the oldest timestamped version that contains this exact fingerprint: "unchanged since then"
    for (const v of (ix.versions || []).slice().reverse()) {
      const txt = await vfText(v.manifest);
      if (txt && txt.includes(line)) { found = v; if (v.status === "confirmed") break; }
    }
    if (!found || found.status !== "confirmed") {
      const confirmedLater = (ix.versions || []).find(v => v.status === "confirmed" && v !== found);
      if (confirmedLater) { const txt = await vfText(confirmedLater.manifest); if (txt && txt.includes(line)) found = confirmedLater; }
    }
  }
  if (!still()) return;
  const inCurrent = ix && ix.current ? (await vfText("current.txt") || "").includes(line) : false;
  const verdict = found && found.status === "confirmed"
    ? `<p class="vf-ok">${ic("verified", "fill")}<span><b>Unchanged since ${esc(vfWhen(found))}.</b> This ${item.kind}'s fingerprint is in the archive version timestamped in Bitcoin ${vfBlock(found.block)}.</span></p>`
    : found ? `<p class="vf-wait">${ic("schedule")}<span><b>In the latest manifest.</b> Its Bitcoin timestamp is waiting for a block, which usually takes a few hours.</span></p>`
    : inCurrent ? `<p class="vf-wait">${ic("schedule")}<span><b>In the current archive</b>, which hasn't been timestamped yet. It will be within a few hours.</span></p>`
    : ix ? `<p class="vf-bad">${ic("error", "fill")}<span><b>Not found in any timestamped version.</b> This copy of the ${item.kind} differs from the published archive.</span></p>`
    : `<p class="vf-wait">${ic("info")}<span>Its fingerprint is below. Compare it with the manifests on <a href="${VF_SITE}" target="_blank" rel="noopener">${SITE_URL.replace(/^https:\/\//, "")}verify</a>.</span></p>`;
  const cmd = `printf '%s' '${item.canon.replace(/'/g, `'\\''`)}' | shasum -a 256`;
  $("#vfitem").innerHTML = `<div class="vf-head"><h3>${esc(item.kind === "commit" ? "Commit" : "Message")}: <a href="${item.href}" data-vfmi="${item.mi ?? ""}">${esc(item.title)}</a></h3></div>
    <p class="muted">${esc(item.who)} · ${esc(fullDate(item.d))}</p>
    ${verdict}
    <dl class="vf-dl"><dt>Fingerprint</dt><dd><code class="vf-hash">${hash}</code></dd><dt>Manifest line</dt><dd><code>${esc(item.key)}</code></dd></dl>
    <details class="vf-raw"><summary>What's hashed, and how to check it</summary>
      <p>The SHA-256 of this exact text (UTF-8, no trailing newline):</p><pre>${esc(item.canon)}</pre>
      <p>On macOS or Linux:</p><pre>${esc(cmd)}</pre>
      <button class="pillbtn" type="button" data-act="vf-copy">${ic("content_copy")}Copy the command</button></details>`;
  $("#vfitem").dataset.cmd = cmd;
}
async function vfCheckAll() {
  const out = $("#vfcheck"); if (!out) return;
  if (!(window.crypto && crypto.subtle)) { out.textContent = "This browser can't compute fingerprints."; return; }
  out.textContent = "Fingerprinting every message in this copy…";
  let text = "# Satoshi Mail archive manifest v1: SHA-256 of each message and commit. See /verify/ on the site.\n";
  for (const t of THREADS) for (let i = 0; i < t.m.length; i++) { const m = t.m[i]; text += `${await vfSha(JSON.stringify([t.id, i, m.f, m.d, m.b]))} t/${t.id}/${i}\n`; }
  for (const c of COMMITS) text += `${await vfSha(JSON.stringify([c.id, c.sha, c.d, c.s]))} c/${c.id}\n`;
  const root = await vfSha(text), ix = await vfLoadIndex(), v = ix && (ix.versions || []).find(x => x.root === root);
  out.innerHTML = v ? `${ic("verified", "fill")}This copy matches the archive version from ${esc(vfWhen(v))} exactly: all ${fmtNum(text.split("\n").length - 2)} fingerprints. ${vfStatus(v)}`
    : ix && ix.current && ix.current.root === root ? `${ic("check_circle", "fill")}This copy matches the current archive exactly (fingerprint ${root.slice(0, 16)}…).`
    : `${ic("info")}This copy's fingerprint is ${root.slice(0, 16)}…, which isn't one of the published versions.`;
}
ACTIONS["vf-check"] = () => vfCheckAll();
ACTIONS["vf-copy"] = () => { const c = $("#vfitem") && $("#vfitem").dataset.cmd; if (c && navigator.clipboard) navigator.clipboard.writeText(c).then(() => snack("Command copied"), () => {}); };
