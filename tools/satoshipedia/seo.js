
/* ── page titles and the hidden page heading follow the current view ── */
function updateTitle() {
  const h1 = $("#apph1");
  let t;
  if (MAP_OPEN) {
    const p = VZ_SEL && MAP.BY.get(VZ_SEL);
    t = (VZ_VIEW === "tl" ? "Timeline" : p ? `${p.name}: connections` : "Connections") + " – Satoshi Map";
    if (h1) h1.hidden = true;
  } else if (WK_STATE === "open") {
    t = WK_TITLE === "Main page" ? "Satoshipedia, the Satoshi Mail encyclopedia" : `${WK_TITLE} – Satoshipedia`;
    if (h1) h1.hidden = true;
  } else {
    const r = ROUTE || {};
    let name;
    if (r.view === "thread") { const th = (typeof BY_ID !== "undefined" && BY_ID.get(r.id)) || COMMITS.find(c => c.id === r.id); name = th ? (th.t || th.s) : "Conversation"; }
    else if (r.search != null) name = `Search: ${r.search}`;
    else if (r.label) name = (LISTS[r.label] && LISTS[r.label].name) || r.label;
    else if (r.topic) name = CAT_NAME[r.topic] || r.topic;
    else name = { sent: "Sent", commits: "Commits", people: "People", activity: "Daily Activity", about: "About", sources: "Sources", drafts: "Drafts" }[r.view]
      || { starred: "Starred", all: "All Mail" }[r.folder]
      || (r.tab === "forums" ? "Inbox: Forums" : r.tab === "private" ? "Inbox: Private email" : "Inbox");
    t = `${name} – Satoshi Mail`;
    if (h1) { h1.hidden = r.view === "thread"; h1.textContent = `Satoshi Mail: ${name}`; }
  }
  document.title = t;
}
