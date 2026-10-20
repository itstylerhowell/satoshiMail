# Satoshipedia

The encyclopedia built into Satoshi Mail (`#wiki`).

* `articles.py`: the 46 articles, Did-you-know items and references, in a small wiki markup.
* Sources are limited to the Satoshi Nakamoto Institute, GitHub, bitcoin.org and Wikipedia; `build_wiki.py` fails if any citation or link points anywhere else.
* `build_wiki.py DIR`: turns `DIR/articles.py` into `DIR/wiki.json` and checks every
  `{{mail:…}}`, `{{commit:…}}` and `[[article]]` link against `DIR/data.json`
  (the mail app's data blob). It fails if any link does not resolve.
* `wiki.css`, `wiki.html`, `wiki.js`: the encyclopedia window, the app dock along the bottom, and their script.
  They are already merged into `../mail_template.html`, together with `wiki.json`
  in `<script id="wiki-data">`, so `tools/build_mail.py` works unchanged.
* `map.css`, `map.html`, `map.js`: Satoshi Map, the dock app that visualises everyone Satoshi corresponded with (a radial "clock" ordered by first contact, with a month-by-month scrubber) and his timeline from August 2008 to April 2011. Everything is computed in the browser from the archive.
* `seo.css`, `seo.js`: page titles, headings, icon rendering and touch-target fixes from the SEO pass.
* `assemble.py`: the script that originally merged these pieces into `../mail_template.html`, kept for reference.
  To change the encyclopedia now, edit `articles.py`, run `build_wiki.py`, then `../render_page.py`, which
  swaps the new `wiki.json` into the page. Changes to the CSS/JS here need to be copied into
  `../mail_template.html` by hand (search for the matching block).
