# Satoshi Mail

**Every email, forum post and commit by Satoshi Nakamoto, in a Gmail-style archive.**
With **Satoshipedia**, an encyclopedia of his correspondents and Bitcoin's first years, and
**Satoshi Map**, a visualisation of everyone he talked to and his timeline from 2008 to 2011.

Founded and made by **Tyler Howell** ([@TylerHowell88](https://x.com/TylerHowell88)).
Open source under the [MIT license](LICENSE). **Beta:** still in development.

Live site: <https://satoshimail.pages.dev/>

## What's in it

| | |
|---|---|
| **Satoshi Mail** | 384 conversations (Cryptography mailing list, bitcoin-list, p2p-research, BitcoinTalk, P2P Foundation, private email) and Satoshi's 203 commits, in an inbox you can search, star and browse by person, topic or day. Compose is just for fun: it never sends or saves anything. |
| **Satoshipedia** | 47 sourced articles on the people and events, each linked to the exact messages it draws on. |
| **Satoshi Map** | A radial "clock" of the 313 people Satoshi exchanged messages with, a month-by-month replay, and a timeline of milestones. |

## Repository layout

```
site/                     the deployable website (Cloudflare Pages output directory)
  index.html, assets/       the app; its archive loads from data/archive.json
  satoshipedia/ conversations/ commits/   one static, search-friendly page per item
  sitemap.xml robots.txt _headers 404.html og.png favicon.svg
tools/
  mail_template.html        the app (HTML, CSS and JS in one file, with a /*__DATA__*/ placeholder)
  render_page.py            template + archive JSON → satoshi-mail.html
  build_site.py             satoshi-mail.html → site/
  blocktrainer.py           add Blocktrainer's archive to an sni-data dataset (local use)
  satoshin.py               add satoshin.name (Satoshi Nakamoto Archive) to an sni-data dataset (local use)
  satoshin_xref.py          match satoshin.name's pages to the archive → satoshipedia/satoshin_xref.json
  satoshin_index.json       snapshot of satoshin.name's index (20 October 2026), the default input to satoshin_xref.py
  extra_sources.py          adds Nicholas Bohm's emails, the forum's saved staff topics and Gavin Andresen's reply
  sources/first_topics.txt  text of bitcointalk.org/first_topics (1.pdf, 2.pdf, 4.pdf), checked against the PDFs
  site-assets/              styles, favicon and share image for the static pages
  satoshipedia/             encyclopedia sources (articles.py), its builder, and the
                            Satoshipedia / Satoshi Map / SEO code merged into the template
```

## Build

Requires Python 3.10+ (no third-party packages for these tools).

```bash
python tools/render_page.py                    # site/data/archive.json → satoshi-mail.html
python tools/build_site.py satoshi-mail.html site --base-url https://satoshimail.pages.dev/
```

## Deploy on Cloudflare Pages

* **Dashboard:** Workers & Pages → Create application → Get started → drag and drop the
  `site` folder, project name `satoshimail`.
* **Git:** connect this repository, leave the build command empty, set the output directory to `site`.
* **CLI:** `npx wrangler pages deploy site --project-name satoshimail`

If the site lives anywhere other than `https://satoshimail.pages.dev/`, rebuild with that
`--base-url` so canonical links, the sitemap and share cards point to the right place.

## Sources

Messages from the [Satoshi Nakamoto Institute](https://satoshi.nakamotoinstitute.org/) and
[nakamoto-archive](https://github.com/lugaxker/nakamoto-archive); commits from
[bitcoin/bitcoin](https://github.com/bitcoin/bitcoin); the white paper from
[bitcoin.org](https://bitcoin.org/bitcoin.pdf); cross-checked against
[Blocktrainer's archive](https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive) and
[satoshin.name](https://satoshin.name/), the Satoshi Nakamoto Archive. Also from public records:
Nicholas Bohm's emails with Satoshi (COPA v Wright exhibit NB1, [republished on GitHub](https://github.com/NicholasBohm/emails)),
the forum's [saved staff topics](https://bitcointalk.org/first_topics/), and Gavin Andresen's own copy of Satoshi's last email.
The full list is in the app under Settings → Archive → Sources.
Satoshipedia also cites Wikipedia. See [NOTICE.md](NOTICE.md) for what the MIT license
covers and the terms of the archived material.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
