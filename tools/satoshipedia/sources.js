/* ═════════════ Sources page (#sources, from Settings → Archive) ═════════════
   One place listing where everything comes from, instead of source chips on each conversation.
   Counts are computed from the archive, so they always match what Satoshi Mail shows. */
function renderSources() {
  CURRENT_LIST = [];
  const sat = t => t.m.filter(m => m.s).length;
  const group = pred => { const ts = THREADS.filter(pred); return { t: ts.length, m: ts.reduce((n, t) => n + t.m.length, 0), s: ts.reduce((n, t) => n + sat(t), 0) }; };
  const lists = [...new Set(THREADS.filter(t => t.k !== "x" && t.s !== "forum-staff").map(t => t.s))].map(s => ({ s, name: LISTS[s] ? LISTS[s].long : s, ...group(t => t.s === s) }));
  const priv = group(t => t.k === "x" && t.s !== "nicholas-bohm");
  const bohm = group(t => t.s === "nicholas-bohm"), staff = group(t => t.s === "forum-staff");
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
      <section class="src"><h4>${ext("https://github.com/NicholasBohm/emails", "Nicholas Bohm's emails")} <span class="muted">COPA v Wright, exhibit NB1</span></h4>
        <p>Satoshi's private emails with Nicholas Bohm, January to July 2009: ${n(bohm.t)} conversations, ${n(bohm.m)} emails, ${n(bohm.s)} by Satoshi. Bohm exported them from his email program as an exhibit to his witness statement in <a href="#wiki-copa-v-wright">COPA v Wright</a>; they were later republished on GitHub. Times are converted from UK time to UTC, and Bohm's address, telephone numbers and IP address are left out. Shown under <a href="#label-nicholas-bohm">Nicholas Bohm</a>.</p></section>
      <section class="src"><h4>${ext("https://bitcointalk.org/first_topics/", "The forum's saved staff topics")} <span class="muted">bitcointalk.org</span></h4>
        <p>Three test topics from the forum's staff area, written before it opened in November 2009 and preserved as PDF files in 2012: ${n(staff.m)} posts, ${n(staff.s)} by Satoshi. Shown under <a href="#label-forum-staff">Forum staff board</a>; see <a href="#wiki-forum-staff-board">Satoshipedia</a>.</p></section>
      <section class="src"><h4>${ext("https://riski.wiki/wiki/User:Gavinandresen/Blog/2022-04-26_Eleven_years_ago_today%E2%80%A6", "Gavin Andresen's blog")}</h4>
        <p>Andresen's own copy of Satoshi's last email to him (26 April 2011) and his reply, which gives the email's time.</p></section>
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

    <h3>Court records</h3>
    <div class="src-list">
      <section class="src"><h4><a href="#wiki-copa-v-wright">COPA v Wright</a> <span class="muted">High Court of England and Wales</span></h4>
        <p>The ${ext("https://caselaw.nationalarchives.gov.uk/ewhc/ch/2024/1198", "judgment of 20 May 2024")}, [2024] EWHC 1198 (Ch), and the witness statement of Nicholas Bohm.</p></section>
      <section class="src"><h4><a href="#wiki-kleiman-v-wright">Kleiman v. Wright</a> <span class="muted">US District Court, Southern District of Florida</span></h4>
        <p>Case 9:18-cv-80176: the ${ext("https://www.govinfo.gov/app/details/USCOURTS-flsd-9_18-cv-80176", "case record on GovInfo")} and filings on CourtListener.</p></section>
    </div>

    <h3>Satoshipedia</h3>
    <div class="src-list">
      <section class="src"><h4><a href="#wiki">Satoshipedia</a></h4>
        <p>Its ${n(WA.length)} articles cite the sources above, other primary sources such as court records, and ${ext("https://en.wikipedia.org/wiki/Satoshi_Nakamoto", "Wikipedia")} (CC BY-SA 4.0); each article lists its references. The AI Overview on search answers only from this archive and Satoshipedia.</p></section>
    </div>
    <p class="lead muted">See also <a href="#about">About this archive</a>.</p>
  </div></div>`;
}
