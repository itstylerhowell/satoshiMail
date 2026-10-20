/* ═════════════ Send feedback (Settings → Help → Send feedback) ═════════════
   A short form that hands the message to GitHub (a pre-filled new issue on the satoshiMail repository)
   or X (a post mentioning @TylerHowell88). Nothing is stored or sent by the page itself: the viewer
   reviews and sends it there, signed in to their own account. Works the same on the static site. */
const FB_REPO = "https://github.com/itstylerhowell/satoshiMail";
const FB_X = "TylerHowell88";
const FB_KINDS = [["bug", "Something's broken"], ["idea", "Idea or request"], ["data", "Wrong or missing message"], ["other", "Other"]];
function fbPageLabel() {
  const h = location.hash || "#inbox";
  const t = (document.title || "").replace(/ – Satoshi Mail$/, "");
  return t ? `${t} (${h})` : h;
}
function fbLinks() {
  const box = $("#fbdlg");
  if (!box) return;
  const kind = (box.querySelector("input[name=fbkind]:checked") || {}).value || "other";
  const label = (FB_KINDS.find(k => k[0] === kind) || FB_KINDS[3])[1];
  const text = box.querySelector("#fbtext").value.trim();
  const withPage = box.querySelector("#fbpage").checked;
  const page = withPage ? fbPageLabel() : "";
  const first = text.split("\n")[0].slice(0, 70);
  const title = `[${label}] ${first || "Feedback"}`;
  const body = `${text || "(write your feedback here)"}\n\n---\nType: ${label}${page ? `\nPage: ${page}` : ""}\nSent from Satoshi Mail (beta)`;
  const gh = `${FB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  const head = `@${FB_X} Satoshi Mail feedback (${label.toLowerCase()}): `;
  const room = 280 - head.length;
  const post = head + (text.length > room ? text.slice(0, room - 1) + "…" : text);
  const x = `https://x.com/intent/post?text=${encodeURIComponent(post)}`;
  const ok = text.length > 0;
  box.querySelectorAll("a.fb-send").forEach(a => {
    a.href = a.dataset.to === "gh" ? gh : x;
    a.setAttribute("aria-disabled", String(!ok));
    a.tabIndex = ok ? 0 : -1;
  });
  box.querySelector(".fb-cut").hidden = !(text.length > room);
  box.querySelector("#fbcount").textContent = text.length ? `${text.length} characters` : "";
}
ACTIONS.feedback = () => {
  dialog(`<div class="fb-dlg" id="fbdlg"><h2><span>Send feedback</span><button class="ib" data-act="closelayer" aria-label="Close">${ic("close")}</button></h2>
    <p class="fb-intro">Found a bug, a wrong date, or have an idea? Tell Tyler, who makes Satoshi Mail.</p>
    <fieldset class="fb-kinds"><legend>What's it about?</legend>${FB_KINDS.map(([v, l], i) => `<label><input type="radio" name="fbkind" value="${v}"${i === 0 ? " checked" : ""}> ${l}</label>`).join("")}</fieldset>
    <label class="fb-l" for="fbtext">Your feedback</label>
    <textarea id="fbtext" rows="5" maxlength="4000" placeholder="What happened, or what would you like to see?"></textarea>
    <div class="fb-meta"><label><input type="checkbox" id="fbpage" checked> Include the page I'm on</label><span id="fbcount"></span></div>
    <p class="fb-note">Choose where to send it. You'll review it there before it's posted, signed in to your own account.</p>
    <div class="fb-to">
      <a class="pillbtn primary fb-send" data-to="gh" target="_blank" rel="noopener" aria-disabled="true" tabindex="-1">${ic("bug_report")}Open a GitHub issue</a>
      <a class="pillbtn fb-send" data-to="x" target="_blank" rel="noopener" aria-disabled="true" tabindex="-1">${ic("alternate_email")}Post to @${FB_X} on X</a>
    </div>
    <p class="fb-cut" hidden>X posts are limited to 280 characters, so a long message is shortened there; GitHub keeps all of it.</p>
  </div>`);
  const box = $("#fbdlg");
  box.addEventListener("input", fbLinks);
  box.addEventListener("change", fbLinks);
  box.addEventListener("click", e => { const a = e.target.closest("a.fb-send"); if (a && a.getAttribute("aria-disabled") === "true") { e.preventDefault(); box.querySelector("#fbtext").focus(); } });
  fbLinks();
  box.querySelector("#fbtext").focus();
};
