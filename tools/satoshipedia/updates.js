/* ═════════════ Update log (#updates) ═════════════
   Every update to Satoshi Mail, newest first, from tools/satoshipedia/updates.json. */
const UPDATES = (() => { try { return JSON.parse($("#updates-data").textContent).updates || []; } catch (e) { return []; } })();
const UPD_REPO = "https://github.com/itstylerhowell/satoshiMail/commit/";
function updDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}
function renderUpdates() {
  CURRENT_LIST = [];
  const feed = window.SM_SITE ? ` · <a href="updates/feed.xml">${ic("rss_feed")} RSS feed</a>` : "";
  $("#main").innerHTML = `<div class="scroll"><div class="page upd-page"><h2>Update log</h2>
    <p class="lead">Every update to Satoshi Mail, newest first.${feed} · <button class="linkbtn" data-act="feedback">Send feedback</button></p>
    <ol class="upd-list">${UPDATES.map(u => `<li class="upd">
      <div class="upd-h"><time datetime="${esc(u.date)}">${esc(updDate(u.date))}</time><h3>${esc(u.title)}</h3></div>
      <ul>${u.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      ${u.commits && u.commits.length ? `<p class="upd-c">Changes: ${u.commits.map(c => `<a href="${UPD_REPO}${esc(c)}" target="_blank" rel="noopener">${esc(c)}</a>`).join(", ")}</p>` : ""}
    </li>`).join("")}</ol>
    <p class="lead muted">See also <a href="#about">About this archive</a> and <a href="#sources">Sources</a>.</p>
  </div></div>`;
}
