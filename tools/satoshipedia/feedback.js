/* ═════════════ Send feedback (Settings → Help → Send feedback) ═════════════
   A short form that turns the message into an X post to @TylerHowell88. Nothing is stored or sent
   by the page itself: the viewer reviews and posts it on X, signed in to their own account.
   Works the same on the static site. */
const FB_X = "TylerHowell88";
const FB_KINDS = [["bug", "Something's broken", "bug"], ["idea", "Idea or request", "idea"], ["data", "Wrong or missing message", "wrong or missing message"], ["other", "Other", "other"]];
const FB_MAX = 280;   // an X post
function fbHead(kind) { const k = FB_KINDS.find(x => x[0] === kind) || FB_KINDS[3]; return `@${FB_X} Satoshi Mail feedback (${k[2]}): `; }
function fbLinks() {
  const box = $("#fbdlg");
  if (!box) return;
  const kind = (box.querySelector("input[name=fbkind]:checked") || {}).value || "other";
  const head = fbHead(kind), room = FB_MAX - head.length;
  const ta = box.querySelector("#fbtext");
  ta.maxLength = room;
  if (ta.value.length > room) ta.value = ta.value.slice(0, room);   // switching type can shorten the room
  const text = ta.value.trim(), ok = text.length > 0;
  const a = box.querySelector("a.fb-send");
  a.href = `https://x.com/intent/post?text=${encodeURIComponent(head + text)}`;
  a.setAttribute("aria-disabled", String(!ok));
  a.tabIndex = ok ? 0 : -1;
  const left = room - ta.value.length;
  const c = box.querySelector("#fbcount");
  c.textContent = `${left} character${left === 1 ? "" : "s"} left`;
  c.classList.toggle("low", left <= 20);
}
ACTIONS.feedback = () => {
  dialog(`<div class="fb-dlg" id="fbdlg"><h2><span>Send feedback</span><button class="ib" data-act="closelayer" aria-label="Close">${ic("close")}</button></h2>
    <p class="fb-intro">Found a bug, a wrong date, or have an idea? Tell Tyler, who makes Satoshi Mail, on X.</p>
    <fieldset class="fb-kinds"><legend>What's it about?</legend>${FB_KINDS.map(([v, l], i) => `<label><input type="radio" name="fbkind" value="${v}"${i === 0 ? " checked" : ""}> ${l}</label>`).join("")}</fieldset>
    <label class="fb-l" for="fbtext">Your feedback</label>
    <textarea id="fbtext" rows="4" placeholder="What happened, or what would you like to see?"></textarea>
    <div class="fb-meta"><span>Posted publicly, mentioning @${FB_X}</span><span id="fbcount" aria-live="polite"></span></div>
    <p class="fb-note">You'll see the post on X before it goes out, signed in to your own account.</p>
    <div class="fb-to"><a class="pillbtn primary fb-send" target="_blank" rel="noopener" aria-disabled="true" tabindex="-1">${ic("alternate_email")}Post to @${FB_X} on X</a></div>
  </div>`);
  const box = $("#fbdlg");
  box.addEventListener("input", fbLinks);
  box.addEventListener("change", fbLinks);
  box.addEventListener("click", e => { const a = e.target.closest("a.fb-send"); if (a && a.getAttribute("aria-disabled") === "true") { e.preventDefault(); box.querySelector("#fbtext").focus(); } });
  fbLinks();
  box.querySelector("#fbtext").focus();
};
