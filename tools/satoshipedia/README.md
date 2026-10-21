# Satoshipedia

The encyclopedia built into Satoshi Mail (`#wiki`).

* `articles.py`: the 52 articles, Did-you-know items and references, in a small wiki markup.
* Sources are limited to the Satoshi Nakamoto Institute, GitHub, bitcoin.org, Wikipedia, Blocktrainer's archive, satoshin.name and listed primary sources (court records, the forum, correspondents' own copies); `build_wiki.py` fails if any citation or link points anywhere else.
* `build_wiki.py DIR`: turns `DIR/articles.py` into `DIR/wiki.json` and checks every
  `{{mail:…}}`, `{{commit:…}}` and `[[article]]` link against `DIR/data.json`
  (the mail app's data blob). It fails if any link does not resolve.
* `wiki.css`, `wiki.html`, `wiki.js`: the encyclopedia window, the app dock along the bottom, and their script.
  They are already merged into `../mail_template.html`, together with `wiki.json`
  in `<script id="wiki-data">`, so `tools/build_mail.py` works unchanged.
* `map.css`, `map.html`, `map.js`: Satoshi Map, the dock app that visualises everyone Satoshi corresponded with (a radial "clock" ordered by first contact, with a month-by-month scrubber) and his timeline from August 2008 to April 2011. Everything is computed in the browser from the archive.
* `seo.css`, `seo.js`: page titles, headings, icon rendering and touch-target fixes from the SEO pass.
* `jlook.css`: the Jmail look: design tokens matched to jmail.world (page ground, 48px rows (no density setting), overview-style banner,
  green "new" pills, red dock badges, frosted-glass dock, Google Sans Flex for UI labels), with dark values.
* `assemble.py`: the script that originally merged these pieces into `../mail_template.html`, kept for reference.
  To change the encyclopedia now, edit `articles.py`, run `build_wiki.py`, then `../render_page.py`, which
  swaps the new `wiki.json` into the page. Changes to the CSS/JS here need to be copied into
  `../mail_template.html` by hand (search for the matching block).

* `satoshin_xref.json`: which of Satoshi's messages are on satoshin.name (the Satoshi Nakamoto Archive) and at which page,
  keyed by a stable message ID (`bitcointalk:<msg number>`, otherwise the source URL without its scheme), so it
  survives a rebuilt archive. Made by `../satoshin_xref.py`; `render_page.py` and `build_site.py` warn if a key stops
  matching. Checked 20 October 2026: all 567 of its entries are in Satoshi Mail.
  It is embedded in the template as `<script id="satoshin-data">`; the Sources page uses it for its counts.
* `ask.js`, `ask.css`: the AI Overview card above search results. In the claude.ai artifact it asks the viewer's
  Claude (the `sample` capability) to answer the search from the archive and Satoshipedia only, citing the messages
  and articles it used, with two read-only tools (search the archive, read an article). It asks nothing until the
  viewer clicks once. Where AI isn't available (the static site, or a viewer who declines) it shows the matching
  Satoshipedia summary instead.
* `sources.js`, `sources.css`: the Sources page (`#sources`, from Settings → Archive), listing every source and
  cross-check with live counts. Conversations no longer carry per-source chips; they keep their Satoshipedia chips.
* `feedback.js`, `feedback.css`: Send feedback (Settings → Help, the About page, the Satoshipedia footer). The form
  pre-fills an X post to @TylerHowell88 (one post, 280 characters); the page itself stores and sends nothing.
