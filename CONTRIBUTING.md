# Contributing

Thanks for helping. Satoshi Mail is in beta, so issues and pull requests are welcome.

## Ground rules

* **Sources.** Satoshipedia cites only the Satoshi Nakamoto Institute, GitHub
  (nakamoto-archive, bitcoin/bitcoin), bitcoin.org, Wikipedia, Blocktrainer's archive and satoshin.name.
  `tools/satoshipedia/build_wiki.py` refuses to build if an article links anywhere else.
  Every claim needs a citation or a link to the message it comes from.
* **Neutral on identity.** Articles report who has been named as Satoshi, by whom, and
  how they responded, without taking a side.
* **Read-only archive.** The app never creates, sends or stores email.

## Working on it

```bash
# edit the encyclopedia
$EDITOR tools/satoshipedia/articles.py
cp site/data/archive.json tools/satoshipedia/data.json      # build_wiki checks every link against it
python tools/satoshipedia/build_wiki.py tools/satoshipedia   # → tools/satoshipedia/wiki.json

# rebuild the single-file app (picks up wiki.json) and the static site
python tools/render_page.py                      # → satoshi-mail.html
python tools/build_site.py satoshi-mail.html site --base-url https://satoshimail.pages.dev/
```

Open `site/index.html` through a local server (`python -m http.server -d site`) to test.

By submitting a pull request you agree that your contribution is licensed under the
project's MIT license (and, for Satoshipedia text, CC BY-SA 4.0).
