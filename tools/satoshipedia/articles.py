# Satoshipedia — article source.
#
# Markup (converted by build_wiki.py):
#   == Heading ==  /  === Sub ===        sections
#   * item                               bullet list
#   > text   (last line "> — who")      block quote with attribution
#   | a | b |                            table (first row is the header)
#   {{live:NAME}}  (own line)            live widget computed from the archive
#   [[slug]] [[slug|text]]               link to another article
#   {{mail:SRC|TITLE|text|from=RE|date=YYYY-MM-DD}}   link into a Satoshi Mail conversation/message
#   {{commit:SHA-PREFIX|text}}           link to one of Satoshi's commits
#   {{search:QUERY|text}} {{label:SLUG|text}} {{go:ROUTE|text}}   other Satoshi Mail links
#   [https://url text]                   external link
#   [^key]                               citation (article refs, then COMMON_REFS)
#   ''italic''  '''bold'''

COMMON_REFS = {
    "wp": "[https://en.wikipedia.org/wiki/Satoshi_Nakamoto ''Satoshi Nakamoto''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-history": "[https://en.wikipedia.org/wiki/History_of_bitcoin ''History of bitcoin''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-bitcoin": "[https://en.wikipedia.org/wiki/Bitcoin ''Bitcoin''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-core": "[https://en.wikipedia.org/wiki/Bitcoin_Core ''Bitcoin Core''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-finney": "[https://en.wikipedia.org/wiki/Hal_Finney_(computer_scientist) ''Hal Finney (computer scientist)''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-back": "[https://en.wikipedia.org/wiki/Adam_Back ''Adam Back''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-dai": "[https://en.wikipedia.org/wiki/Wei_Dai ''Wei Dai''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-szabo": "[https://en.wikipedia.org/wiki/Nick_Szabo ''Nick Szabo''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-andresen": "[https://en.wikipedia.org/wiki/Gavin_Andresen ''Gavin Andresen''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-wright": "[https://en.wikipedia.org/wiki/Craig_Steven_Wright ''Craig Steven Wright''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-sassaman": "[https://en.wikipedia.org/wiki/Len_Sassaman ''Len Sassaman''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-todd": "[https://en.wikipedia.org/wiki/Peter_Todd_(programmer) ''Peter Todd (programmer)''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-dorian": "[https://en.wikipedia.org/wiki/Dorian_Nakamoto ''Dorian Nakamoto''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-ecash": "[https://en.wikipedia.org/wiki/Ecash ''Ecash''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "wp-btctalk": "[https://en.wikipedia.org/wiki/Bitcointalk ''Bitcointalk''], Wikipedia (CC BY-SA 4.0). Retrieved 20 October 2026.",
    "paper": "Satoshi Nakamoto, [https://bitcoin.org/bitcoin.pdf ''Bitcoin: A Peer-to-Peer Electronic Cash System''], bitcoin.org.",
    "sni": "[https://satoshi.nakamotoinstitute.org/ The Complete Satoshi], Satoshi Nakamoto Institute.",
    "sni-about": "[https://nakamotoinstitute.org/about/ About], Satoshi Nakamoto Institute.",
    "na": "[https://github.com/lugaxker/nakamoto-archive nakamoto-archive], “Complete archive of Satoshi Nakamoto's writings and productions”, GitHub. The README lists each source file with its origin, date and SHA-256 hash.",
    "core": "[https://github.com/bitcoin/bitcoin bitcoin/bitcoin], Bitcoin Core source repository, GitHub.",
}

ARTICLES = [
# ─────────────────────────── Satoshi ───────────────────────────
dict(
 slug="satoshi-nakamoto", title="Satoshi Nakamoto", kind="person", img="btc",
 caption="The name signed to the Bitcoin white paper",
 cats=["Satoshi Nakamoto", "People"],
 short="The pseudonymous creator of Bitcoin.",
 featured=True, aliases=["satoshi", "Satoshi Nakamoto"], label=None,
 info=[
  ("Known for", "Designing Bitcoin; writing its white paper and first software"),
  ("Active", "August 2008 – April 2011"),
  ("White paper", "31 October 2008"),
  ("First release", "Bitcoin v0.1, January 2009"),
  ("Last forum post", "12 December 2010"),
  ("Last email in archive", "26 April 2011"),
  ("Email", "satoshi@anonymousspeech.com, satoshi@vistomail.com, satoshin@gmx.com"),
 ],
 body="""
'''Satoshi Nakamoto''' is the name used by the person or people who designed Bitcoin, wrote the [[bitcoin-white-paper|white paper]] that describes it, and released its [[bitcoin-v0-1|first software]].[^wp] Between August 2008 and April 2011 Satoshi corresponded through mailing lists, forums and private email, made every change to [[bitcoin-core|the original client]] himself until mid-2010, and then stopped. Who was behind the name has never been established.[^wp]

This archive collects his known emails, forum posts and commits. Satoshi Mail opens his inbox; this article summarises what the messages show.

== Creating Bitcoin ==
Satoshi registered the domain [[bitcoin-org|bitcoin.org]] on 18 August 2008.[^wp] Two days later he wrote to [[adam-back|Adam Back]] to check how to cite Hashcash in “a paper that references your Hashcash paper” ({{mail:adam-back|Citation of your Hashcash paper|the emails}}), and Back pointed him to [[wei-dai|Wei Dai]]'s b-money. Satoshi wrote to Dai the same week ({{mail:wei-dai|Citation of your b-money page|the emails}}).

On 31 October 2008 he announced the paper on the [[cryptography-mailing-list|Cryptography mailing list]]: “I've been working on a new electronic cash system that's fully peer-to-peer, with no trusted third party.” ({{mail:cryptography|Bitcoin P2P e-cash paper|the announcement}}). In November he sent [[pre-release-source-code|early source files]] to [[hal-finney|Hal Finney]], [[ray-dillinger|Ray Dillinger]] and [[james-a-donald|James A. Donald]]. The [[genesis-block|genesis block]] is dated 3 January 2009, and [[bitcoin-v0-1|Bitcoin v0.1]] followed that month.

== Running the project ==
Until mid-2010 Satoshi made all changes to the code himself,[^wp] committing to the [[sourceforge|SourceForge]] repository and announcing releases on [[bitcoin-list|bitcoin-list]]. He recruited [[martti-malmi|Martti Malmi]] to write the website and FAQ, opened [[bitcointalk|the Bitcoin forum]] in November 2009, and from mid-2010 worked increasingly with [[gavin-andresen|Gavin Andresen]].

He fixed the [[value-overflow-incident|value overflow bug]] in August 2010 within hours,[^wp-history] added an alert system for emergencies, and in December 2010 asked WikiLeaks not to accept bitcoin ([[wikileaks-and-bitcoin|WikiLeaks and Bitcoin]]).

== Departure ==
Satoshi's last forum post is dated 12 December 2010 and his last commit, SVN revision 202, 15 December 2010. In April 2011 he told [[mike-hearn|Mike Hearn]] “I've moved on to other things”, and three days later sent Andresen the alert key ([[departure-of-satoshi-nakamoto|departure]]). In March 2014 the post “I am not Dorian Nakamoto” appeared on his P2P Foundation account; its authenticity is uncertain ([[media-investigations|Newsweek, 2014]]).

== Identity ==
On his P2P Foundation profile Satoshi claimed to be a 37-year-old man living in Japan; it is widely doubted that he was Japanese.[^wp] His British spellings and posting hours have been read as clues ([[writing-style|writing style]]). Many people have been publicly named as Satoshi and those named have denied it; a UK court ruled in 2024 that [[craig-wright|Craig Wright]], who claimed the title, is not him. See [[identity-of-satoshi-nakamoto|Identity of Satoshi Nakamoto]].

== Wealth and legacy ==
Estimates of the bitcoins in Satoshi's possession range from 750,000 to 1.1 million, untouched since 2010 ([[satoshis-coins|Satoshi's coins]]).[^wp] Bitcoin's smallest unit is called the [[satoshi-unit|satoshi]],[^wp-bitcoin] and there are statues of him in Budapest and Lugano ([[monuments-to-satoshi|monuments]]).

== In the archive ==
{{live:by-year}}
""",
 refs={}, see=["identity-of-satoshi-nakamoto", "writing-style", "departure-of-satoshi-nakamoto", "satoshis-accounts"],
),

# ─────────────────────────── People ───────────────────────────
dict(
 slug="hal-finney", title="Hal Finney", kind="person", img="avatar",
 caption="Cypherpunk and the first Bitcoin user after Satoshi",
 cats=["People", "Cypherpunks", "Correspondents", "Identity candidates"],
 short="Cypherpunk who ran Bitcoin from its first release and received its first transaction.",
 featured=True, aliases=["Hal", "Hal Finney", "hal.finney@gmail.com", "hal@finney.org"], label="hal-finney",
 info=[("Born", "4 May 1956"), ("Died", "28 August 2014"), ("Known for", "PGP Corporation, RPOW, the first bitcoin transaction"), ("First contact", "November 2008")],
 body="""
'''Hal Finney''' (1956–2014) was an American software developer and cypherpunk who worked for the PGP Corporation and in 2004 created the first reusable proof-of-work system, RPOW.[^wp-finney] He was the first person other than Satoshi to use the Bitcoin software,[^wp] and on 12 January 2009 he received 10 bitcoins from Satoshi in block 170, the first bitcoin transaction.[^wp-history]

== With Satoshi ==
Finney was one of the reviewers who received Satoshi's [[pre-release-source-code|source files]] in November 2008. His reply asks how large the network might grow: “Tens of nodes? Thousands? Millions?” ({{mail:hal-finney|Re: Bitcoin source files attached|the email}}). Satoshi answered that 100,000 block-generating nodes was “a good ballpark large-scale size to think about”.

When [[bitcoin-v0-1|v0.1]] came out in January 2009, Finney ran it at once and spent the following days reporting crashes and testing debug builds with Satoshi ({{mail:hal-finney|Crash in bitcoin 0.1.0|“Crash in bitcoin 0.1.0”}}, {{mail:hal-finney|select failed 10038 fix|“select failed 10038 fix”}}). He later posted on the forum as ''Hal'' ({{search:from:hal|his posts}}).

== Illness and death ==
Finney announced in 2009 that he had been diagnosed with ALS. In March 2013 he wrote “Bitcoin and Me” on BitcoinTalk, describing his early involvement. He died on 28 August 2014 and was cryopreserved by the Alcor Life Extension Foundation.[^wp-finney]

== Speculation ==
Finney was suggested as Satoshi, partly because he had lived for ten years in the same town as Dorian Nakamoto; he denied it.[^wp-finney] The 2026 documentary ''Finding Satoshi'' proposed that Satoshi was a partnership between Finney and [[len-sassaman|Len Sassaman]].[^wp] Both have died, so neither can answer. See [[identity-of-satoshi-nakamoto]].
""",
 refs={}, see=["first-bitcoin-transaction", "len-sassaman", "precursors-of-bitcoin"],
),
dict(
 slug="martti-malmi", title="Martti Malmi", kind="person", img="avatar",
 caption="Bitcoin's second developer, known as sirius",
 cats=["People", "Developers", "Correspondents"],
 short="Finnish developer who joined Satoshi in 2009 and built the website and forum.",
 aliases=["sirius", "mmalmi@cc.hut.fi", "Martti Malmi"], label="martti-malmi",
 info=[("Handle", "sirius, sirius-m"), ("Known for", "bitcoin.org, the forum"), ("Based in", "Finland"), ("Corresponded", "May 2009 – February 2011")],
 body="""
'''Martti Malmi''', known online as ''sirius'', is a developer from Finland who volunteered to help Satoshi in May 2009. He exchanged more emails with Satoshi than anyone else in this archive.

== Working with Satoshi ==
Malmi wrote to Satoshi in May 2009 after promoting Bitcoin on a forum. Satoshi replied that “your understanding of bitcoin is spot on” and asked for help: “What we need most right now is website writing. My writing is not that great, I'm a much better coder.” ({{mail:martti-malmi|Re: Bitcoin|the conversation}}).

Over the next two years Malmi worked on the bitcoin.org website and FAQ, set up the forum that became [[bitcointalk|BitcoinTalk]] ({{mail:martti-malmi|Forum|“Forum”}}) and organised translations ({{mail:martti-malmi|Translation|“Translation”}}). In December 2009 he told Satoshi he planned a small exchange service that would take PayPal at first ({{mail:martti-malmi|Bitcoin stuff|the email|from=mmalmi}}). They corresponded until February 2011.

== Publication ==
Malmi published the emails on his own GitHub page, and [[nakamoto-archive|nakamoto-archive]] keeps a copy.[^na] Satoshi Mail shows them under his label ({{label:martti-malmi|open the label}}).
""",
 refs={}, see=["new-liberty-standard", "bitcoin-org", "bitcointalk"],
),
dict(
 slug="mike-hearn", title="Mike Hearn", kind="person", img="avatar",
 caption="Developer who received Satoshi's “moved on” email",
 cats=["People", "Developers", "Correspondents"],
 short="Developer who corresponded with Satoshi from 2009 to 2011 and wrote bitcoinj.",
 aliases=["Mike Hearn"], label="mike-hearn",
 info=[("Known for", "BitCoinJ, a Java implementation of Bitcoin"), ("Corresponded", "April 2009 – April 2011")],
 body="""
'''Mike Hearn''' is a software developer who wrote to Satoshi in April 2009, while working at Google (“We use them here at Google for everything”), and kept corresponding with him until April 2011 ({{label:mike-hearn|their emails}}).

== Correspondence ==
His first email opened: “I read your paper on BitCoin with great interest. I found it a bit confusing though”. He asked how one chain could scale, and where the figure of 24 million coins came from ({{mail:mike-hearn|Questions about BitCoin|“Questions about BitCoin”}}). Satoshi's answer compared Bitcoin to the Visa network, which then processed about 15 million Internet purchases a day.

Their last exchange, in April 2011, contains Satoshi's line about leaving: “I've moved on to other things. It's in good hands with Gavin and everyone.” In the same email Satoshi hoped Hearn's Java client, bitcoinj, would keep developing ({{mail:mike-hearn|Holding coins in an unspendable state for a rolling time window|the email|from=Satoshi}}).

== BitCoinJ ==
In March 2011 Hearn told Satoshi he had got “all the lawyers happy enough to release BitCoinJ under the Google name using the Apache 2 license” ({{mail:mike-hearn|Open sourced my Java SPV impl|the email}}).

Hearn published his emails with Satoshi on his website, and [[nakamoto-archive|nakamoto-archive]] keeps copies.[^na]
""",
 refs={}, see=["departure-of-satoshi-nakamoto", "gavin-andresen"],
),
dict(
 slug="gavin-andresen", title="Gavin Andresen", kind="person", img="avatar",
 caption="Satoshi's successor as lead developer",
 cats=["People", "Developers", "Correspondents"],
 short="Developer Satoshi handed the project and the alert key to.",
 aliases=["Gavin Andresen"], label=None,
 info=[("Known for", "Lead developer after Satoshi; the Bitcoin Faucet"), ("Stepped back", "2014")],
 body="""
'''Gavin Andresen''' is a software developer who discovered Bitcoin in 2010, created the Bitcoin Faucet website that gave bitcoin away, and became lead developer after Satoshi left.[^wp-andresen] His first forum posts in this archive date from June 2010 ({{search:from:"gavin andresen"|his messages}}).

== Handover ==
Satoshi gave Andresen control of the source code repository and the network alert key.[^wp] On 26 April 2011 he sent him the alert key and broadcast code “in case you need it”, with a request: “I wish you wouldn't keep talking about me as a mysterious shadowy figure, the press just turns that into a pirate currency angle.” Andresen published the exchange on his website eleven years later ({{mail:single-emails|Email to Gavin Andresen|the email}}).[^na] His reply quotes Satoshi's email as sent at 4:29 AM US Eastern time (08:29 UTC), and answers about the key: “now I’ve gotta figure out a couple of people who I can trust to keep them safe”.[^gavin-blog] It is the latest email from Satoshi in this archive.

== Later ==
In 2014 Andresen stepped back as lead maintainer. His commit access was later revoked after he stated that [[craig-wright|Craig Wright]] was Satoshi; he later said it had been a mistake to trust Wright.[^wp-andresen]
""",
 refs={"gavin-blog": "[https://riski.wiki/wiki/User:Gavinandresen/Blog/2022-04-26_Eleven_years_ago_today%E2%80%A6 Eleven years ago today…], Gavin Andresen's blog, 26 April 2022.", }, see=["departure-of-satoshi-nakamoto", "satoshis-accounts", "bitcoin-core"],
),
dict(
 slug="adam-back", title="Adam Back", kind="person", img="avatar",
 caption="Inventor of Hashcash",
 cats=["People", "Cypherpunks", "Correspondents", "Identity candidates"],
 short="British cryptographer whose Hashcash the white paper cites.",
 aliases=["Adam Back"], label="adam-back",
 info=[("Known for", "Hashcash (1997); Blockstream"), ("Contacted", "20 August 2008")],
 body="""
'''Adam Back''' is a British cryptographer and cypherpunk who invented Hashcash in 1997,[^wp-back] a proof-of-work scheme for spam control.[^wp-bitcoin] Bitcoin's white paper cites it,[^paper] and Back was one of the first two people Satoshi is known to have emailed.[^wp-back]

== The August 2008 emails ==
On 20 August 2008 Satoshi, writing from satoshi@anonymousspeech.com, asked Back to confirm a citation: “I'm getting ready to release a paper that references your Hashcash paper and I wanted to make sure I have the citation right.” He described the paper under its working title, ''Electronic Cash Without a Trusted Third Party''. Back replied that the citation looked fine and suggested Wei Dai's b-money proposal. Satoshi answered: “I wasn't aware of the b-money page, but my ideas start from exactly that point.” ({{mail:adam-back|Citation of your Hashcash paper|the emails}}). [[nakamoto-archive|nakamoto-archive]] keeps a copy of the exchange.[^na]

== Identity claims ==
Back co-founded Blockstream in 2014. He has been named as a possible Satoshi several times: by the ''Financial Times'' in 2016, and in April 2026 by a ''New York Times'' investigation by John Carreyrou, which pointed to less common phrases, shared niche interests and the timing of Satoshi's last communication and Back's first public comment on Bitcoin. Back denied it again.[^wp-back] See [[identity-of-satoshi-nakamoto]].
""",
 refs={}, see=["wei-dai", "precursors-of-bitcoin", "bitcoin-white-paper"],
),
dict(
 slug="wei-dai", title="Wei Dai", kind="person", img="avatar",
 caption="Author of b-money and Crypto++",
 cats=["People", "Cypherpunks", "Correspondents"],
 short="Computer engineer whose b-money is the white paper's first reference.",
 aliases=["Wei Dai"], label="wei-dai",
 info=[("Known for", "b-money (1998); the Crypto++ library"), ("Contacted", "August 2008")],
 body="""
'''Wei Dai''' is a computer engineer who in 1998 published “b-money, an anonymous, distributed electronic cash system”.[^wp-dai] B-money is reference [1] in the [[bitcoin-white-paper|white paper]].[^paper]

== With Satoshi ==
After [[adam-back|Adam Back]] pointed him to b-money, Satoshi wrote to Dai in August 2008: “I was very interested to read your b-money page. I'm getting ready to release a paper that expands on your ideas into a complete working system.” He asked for the year of publication so he could cite it. In January 2009 he wrote again to say he had released v0.1, which he thought “achieves nearly all the goals you set out to solve in your b-money paper” ({{mail:wei-dai|Citation of your b-money page|the emails}}).

== Crypto++ ==
Dai also wrote Crypto++, a C++ cryptography library first released in 1995.[^wp-dai] In 2010 Satoshi added part of it to Bitcoin for a faster SHA-256 ({{commit:813505cc13|SVN r114}}).
""",
 refs={}, see=["precursors-of-bitcoin", "adam-back"],
),
dict(
 slug="nick-szabo", title="Nick Szabo", kind="person", img="avatar",
 caption="Proposer of bit gold and smart contracts",
 cats=["People", "Cypherpunks", "Identity candidates"],
 short="Computer scientist who proposed bit gold and smart contracts.",
 aliases=[], label=None,
 info=[("Known for", "Smart contracts; bit gold (1998)")],
 body="""
'''Nick Szabo''' is a computer scientist and legal scholar who wrote about smart contracts in the 1990s and in 1998 designed bit gold, a mechanism for a decentralised digital currency.[^wp-szabo] Bit gold is one of Bitcoin's [[precursors-of-bitcoin|precursors]], although the white paper does not cite it.[^paper]

Szabo does not appear in Satoshi's correspondence. In December 2013 a stylometric analysis by Skye Grey linked him to the white paper,[^wp] and in 2015 Nathaniel Popper of the ''New York Times'' pointed to him. He has repeatedly denied being Satoshi.[^wp-szabo] The Satoshi Nakamoto Institute keeps a large collection of his essays in [https://nakamotoinstitute.org/authors/nick-szabo/ its library].
""",
 refs={}, see=["precursors-of-bitcoin", "identity-of-satoshi-nakamoto"],
),
dict(
 slug="dustin-trammell", title="Dustin Trammell", kind="person", img="avatar",
 caption="Early Bitcoin user",
 cats=["People", "Correspondents"],
 short="Early user who emailed Satoshi in the first weeks of Bitcoin.",
 aliases=["Dustin D. Trammell"], label="dustin-trammell",
 info=[("Known for", "Early tester of v0.1"), ("Corresponded", "January 2009")],
 body="""
'''Dustin Trammell''' is an early Bitcoin user who ran the software within days of [[bitcoin-v0-1|v0.1]] and exchanged 22 emails with Satoshi in January 2009.

His first email reported that his node had generated coins but showed a zero credit, and pointed Satoshi to a public timestamping service ({{mail:dustin-trammell|Re: Bitcoin v0.1 released|“Re: Bitcoin v0.1 released”}}). Later threads cover his ideas for the software and a test transfer ({{mail:dustin-trammell|A few thoughts...|“A few thoughts...”}}, {{mail:dustin-trammell|BitCoin Transfer|“BitCoin Transfer”}}). Satoshi wrote from satoshi@vistomail.com throughout.

Trammell published the exchange on his website, and [[nakamoto-archive|nakamoto-archive]] keeps a copy.[^na]
""",
 refs={}, see=["bitcoin-v0-1", "hal-finney"],
),
dict(
 slug="laszlo-hanyecz", title="Laszlo Hanyecz", kind="person", img="avatar",
 caption="Bought two pizzas for 10,000 BTC",
 cats=["People", "Developers", "Correspondents"],
 short="Programmer who made the first known commercial bitcoin transaction.",
 aliases=["laszlo"], label=None,
 info=[("Known for", "Bitcoin Pizza Day; the Mac OS X port; GPU mining"), ("Pizza purchase", "22 May 2010")],
 body="""
'''Laszlo Hanyecz''' is a programmer who on 22 May 2010 paid 10,000 bitcoins for two Papa John's pizzas, the first known commercial transaction with bitcoin ([[bitcoin-pizza-day|Bitcoin Pizza Day]]).[^wp-bitcoin]

== Development ==
Hanyecz ported the client to Mac OS X; Satoshi's [[bitcoin-list|release notes]] for version 0.3 list “Mac OS X version (thanks to Laszlo)” ({{mail:bitcoin-list|[bitcoin-list] Bitcoin 0.3 released!|the 0.3 announcement}}). He posted on the forum as ''laszlo''.

== GPU mining ==
He was also mining with a graphics card. In May 2010 Satoshi asked him to hold back, arguing that GPUs would concentrate new coins among a few people too early: “I don't mean to sound like a socialist, I don't care if wealth is concentrated, but for now, we get more growth by giving that money to 100% of the people than giving it to 20%.” ({{mail:single-emails|Email to Laszlo Hanyecz|the email}}). The email later surfaced in a Reddit thread, the source of [[nakamoto-archive|nakamoto-archive]]'s copy.[^na]
""",
 refs={}, see=["bitcoin-pizza-day", "supply-cap"],
),
dict(
 slug="jon-matonis", title="Jon Matonis", kind="person", img="avatar",
 caption="Received an email from Satoshi in 2010",
 cats=["People", "Correspondents"],
 short="Early advocate who corresponded with Satoshi in 2010.",
 aliases=[], label=None,
 info=[("Last email from Satoshi", "4 March 2010")],
 body="""
'''Jon Matonis''' corresponded with Satoshi in early 2010. The archive holds the last email Satoshi sent him, dated 4 March 2010, which was later posted on the Bitcoin Foundation forum ({{mail:single-emails|Email to Jon Matonis|the email}}).[^na]

Matonis was one of those who backed [[craig-wright|Craig Wright]]'s claim to be Satoshi.[^wp]
""",
 refs={}, see=["craig-wright"],
),
dict(
 slug="jeff-garzik", title="Jeff Garzik", kind="person", img="avatar",
 caption="Prolific poster in Satoshi's forum threads",
 cats=["People", "Developers"],
 short="Developer active in Satoshi's forum threads in 2010.",
 aliases=["jgarzik"], label=None,
 info=[("Forum handle", "jgarzik"), ("Active with Satoshi", "2010")],
 body="""
'''Jeff Garzik''' is a software developer who, as ''jgarzik'', is one of the most frequent posters in the forum threads Satoshi took part in ({{search:from:jgarzik|his messages}}). Through 2010 he proposed patches and features there, such as “[PATCH] increase block size limit” ({{mail:bitcointalk|[PATCH] increase block size limit|the thread}}).

Garzik was among those who disputed [[craig-wright|Craig Wright]]'s claim to be Satoshi.[^wp]
""",
 refs={}, see=["gavin-andresen", "bitcoin-core"],
),
dict(
 slug="james-a-donald", title="James A. Donald", kind="person", img="avatar",
 caption="First public reply to the white paper",
 cats=["People", "Cypherpunks"],
 short="Wrote the first public reply to the white paper.",
 aliases=["James A. Donald"], label=None,
 info=[("Known for", "First public reply to the white paper (2 November 2008)")],
 body="""
'''James A. Donald''' took part in the [[cryptography-mailing-list|Cryptography mailing list]]. Two days after Satoshi posted the white paper he wrote the first public reply: “We very, very much need such a system, but the way I understand your proposal, it does not seem to scale to the required size.” ({{mail:cryptography|Bitcoin P2P e-cash paper|the thread|from=Donald}}). Satoshi's answers in that thread are some of his earliest explanations of how Bitcoin would scale.

Donald was also copied on Satoshi's November 2008 [[pre-release-source-code|pre-release source code]], along with Hal Finney and Ray Dillinger.
""",
 refs={}, see=["bitcoin-white-paper", "pre-release-source-code"],
),
dict(
 slug="ray-dillinger", title="Ray Dillinger", kind="person", img="avatar",
 caption="Reviewer of the November 2008 code",
 cats=["People", "Cypherpunks"],
 short="Reviewed Satoshi's code in 2008 and later published it.",
 aliases=["Ray Dillinger"], label=None,
 info=[("Known for", "Reviewing the pre-release code"), ("Handles", "Bear, Cryddit")],
 body="""
'''Ray Dillinger''' took part in the [[cryptography-mailing-list|Cryptography mailing list]] discussion of the white paper and was one of three people Satoshi sent his source files to in November 2008, along with [[hal-finney|Hal Finney]] and [[james-a-donald|James A. Donald]]. He was copied as bear@sonic.net ({{mail:hal-finney|Re: Bitcoin source files attached|Finney's reply}}).

Dillinger, posting as ''Cryddit'', later published the main files from that November 2008 code on BitcoinTalk; [[nakamoto-archive|nakamoto-archive]] keeps a copy[^na] ([[pre-release-source-code]]).
""",
 refs={}, see=["pre-release-source-code"],
),
dict(
 slug="new-liberty-standard", title="New Liberty Standard", kind="person", img="avatar",
 caption="Early exchanger and price-setter",
 cats=["People"],
 short="Pseudonymous early user who published a bitcoin exchange rate.",
 aliases=["NewLibertyStandard"], label=None,
 info=[("Known for", "An early bitcoin exchange rate")],
 body="""
'''New Liberty Standard''' is the pseudonym of an early Bitcoin user who published an exchange rate for bitcoin. In February 2010 he explained on the forum: “I use a formula to calculate my exchange rate which is described on my exchange rate page” ({{mail:bitcointalk|The current Bitcoin economic model doesn't work|the thread|from=NewLibertyStandard}}).

He is one of the most active participants in Satoshi's threads ({{search:from:newlibertystandard|his messages}}).
""",
 refs={}, see=["martti-malmi", "bitcoin-pizza-day"],
),
dict(
 slug="len-sassaman", title="Len Sassaman", kind="person", img="avatar",
 caption="Maintainer of the Mixmaster remailer",
 cats=["People", "Cypherpunks", "Identity candidates"],
 short="Remailer developer proposed as Satoshi, or part of him.",
 aliases=[], label=None,
 info=[("Died", "July 2011"), ("Known for", "Anonymous remailers (Mixmaster)")],
 body="""
'''Len Sassaman''' was the maintainer of the Mixmaster anonymous remailer code.[^wp-sassaman] He died in July 2011, a few months after the last email from Satoshi in this archive. A tribute to him was embedded in the Bitcoin blockchain.[^wp]

Sassaman does not appear in Satoshi's correspondence. A BitcoinTalk user suggested him as Satoshi in 2013, and developer Evan Hatch proposed him in 2021.[^wp-sassaman] The 2026 documentary ''Finding Satoshi'' proposed that Satoshi was a partnership between Sassaman and [[hal-finney|Hal Finney]].[^wp] Neither man can respond. See [[identity-of-satoshi-nakamoto]].
""",
 refs={}, see=["hal-finney", "media-investigations"],
),
dict(
 slug="peter-todd", title="Peter Todd", kind="person", img="avatar",
 caption="Bitcoin developer named by HBO",
 cats=["People", "Developers", "Identity candidates"],
 short="Bitcoin developer named as Satoshi by a 2024 HBO documentary; he denies it.",
 aliases=[], label=None,
 info=[("Known for", "Early Bitcoin development"), ("Named by", "''Money Electric'' (HBO, 2024)")],
 body="""
'''Peter Todd''' is a Canadian software developer and an early contributor to Bitcoin. Cullen Hoback's 2024 HBO documentary ''Money Electric: The Bitcoin Mystery'' named him as Satoshi. Todd denied it, calling the claim “ludicrous”.[^wp-todd] He does not appear in Satoshi's correspondence. See [[media-investigations]].
""",
 refs={}, see=["media-investigations", "identity-of-satoshi-nakamoto"],
),
dict(
 slug="craig-wright", title="Craig Wright", kind="person", img="avatar",
 caption="Claimed to be Satoshi; a UK court found he is not",
 cats=["People", "Identity candidates"],
 short="Australian who claimed to be Satoshi until a UK court ruled against him in 2024.",
 aliases=[], label=None,
 info=[("Claim made", "2 May 2016"), ("Ruling", "March 2024, High Court, London"), ("Written judgment", "20 May 2024")],
 body="""
'''Craig Wright''' is an Australian computer scientist who claimed from 2016 to be Satoshi Nakamoto. The High Court in London ruled in 2024 that he is not.[^wp-wright]

== The claim ==
In December 2015 ''Wired'' and ''Gizmodo'' suggested that Wright might be Satoshi.[^wp] On 2 May 2016 a post on his website associated him with Satoshi.[^wp-wright] [[gavin-andresen|Gavin Andresen]] and [[jon-matonis|Jon Matonis]] backed the claim; [[jeff-garzik|Jeff Garzik]] and [[peter-todd|Peter Todd]] disputed it.[^wp] In April 2019 he registered US copyrights in the white paper and the v0.1 code, and he sued people who accused him of lying about inventing Bitcoin.[^wp-wright]

== COPA v Wright ==
The Crypto Open Patent Alliance (COPA) sued Wright in London's High Court. After a five-week trial, Mr Justice Mellor ruled in March 2024 that Wright is not Satoshi Nakamoto. The written judgment, released on 20 May 2024, found that the documents he relied on were forgeries and that he had “lied to the court extensively and repeatedly”.[^wp-wright] See [[copa-v-wright|COPA v Wright]] for the case and the judgment, and [[kleiman-v-wright|Kleiman v. Wright]] for the earlier US case. In December 2024 he received a suspended prison sentence for contempt of court, for violating a court order related to his claims.[^wp]
""",
 refs={}, see=["identity-of-satoshi-nakamoto", "media-investigations"],
),

# ─────────────────────────── Topics ───────────────────────────
dict(
 slug="identity-of-satoshi-nakamoto", title="Identity of Satoshi Nakamoto", kind="topic", img="icon:person_search",
 caption="An open question since 2008",
 cats=["Identity", "Satoshi Nakamoto"],
 short="Who has been named as Satoshi, by whom, and how they responded.",
 featured=True, aliases=[], label=None, info=[("Status", "Unknown"), ("Court ruling", "Craig Wright is not Satoshi (2024)")],
 body="""
The '''identity of Satoshi Nakamoto''' has never been established. Satoshi gave few personal details, used anonymous email services ([[satoshis-accounts]]), and stopped writing in 2011. The name might belong to a team of people.[^wp]

== What Satoshi said ==
On his P2P Foundation profile he claimed to be a 37-year-old man living in Japan. His writing uses British spellings, and his forum posts drop to almost none between 5 and 11 a.m. GMT ([[writing-style|writing style]]).[^wp] The one later message attributed to his account reads, in full: “I am not Dorian Nakamoto.” ({{mail:p2pfoundation|Bitcoin open source implementation of P2P currency|the post|date=2014-03-07}}).

== People named ==
Each person below was publicly suggested as Satoshi, by others or, in one case, by himself. None has proven it.[^wp]

| Person | Suggested by | Response |
| [[hal-finney|Hal Finney]] | Speculation after the 2014 ''Newsweek'' story; ''Finding Satoshi'' (2026) | Denied before his death in 2014 |
| [[nick-szabo|Nick Szabo]] | Stylometric analysis (2013); ''New York Times'' (2015) | Denied |
| [[adam-back|Adam Back]] | ''Financial Times'' (2016); ''New York Times'' (2026) | Denied |
| [[len-sassaman|Len Sassaman]] | BitcoinTalk user (2013); Evan Hatch (2021); ''Finding Satoshi'' (2026) | Died 2011 |
| [[peter-todd|Peter Todd]] | ''Money Electric'', HBO (2024) | Denied |
| Dorian Nakamoto | ''Newsweek'' (2014) | Denied |
| [[craig-wright|Craig Wright]] | Himself, from 2016 | Court ruled he is not Satoshi (2024) |

Others suggested include David Chaum, Paul Le Roux and [[wei-dai|Wei Dai]].[^wp]

== Proof ==
Proposed proofs include signing a message with the key associated with the first bitcoins, or moving the earliest bitcoins mined ([[satoshis-coins|Satoshi's coins]]).[^wp]
""",
 refs={}, see=["media-investigations", "writing-style", "satoshis-coins"],
),
dict(
 slug="media-investigations", title="Media investigations", kind="topic", img="icon:newspaper",
 caption="From Newsweek (2014) to Finding Satoshi (2026)",
 cats=["Identity"],
 short="Major journalistic attempts to unmask Satoshi, from Newsweek to Finding Satoshi.",
 aliases=[], label=None, info=[("First", "''Newsweek'', March 2014"), ("Latest", "''Finding Satoshi'', 2026")],
 body="""
Journalists and filmmakers have repeatedly tried to identify Satoshi. None of their candidates has been confirmed.

== Newsweek (2014) ==
On 6 March 2014 ''Newsweek'' published Leah McGrath Goodman's report identifying Dorian Nakamoto, a man living in Temple City, California, as Bitcoin's creator.[^wp-dorian] He denied it, and the story was widely criticised.[^wp] The next day Satoshi's dormant P2P Foundation account posted “I am not Dorian Nakamoto.” ({{mail:p2pfoundation|Bitcoin open source implementation of P2P currency|the post|date=2014-03-07}}). The Satoshi Nakamoto Institute notes that its authenticity “demands scrutiny”: the account was compromised through an email hack in September 2014, though there is no clear sign it was compromised when this post was made.[^sni]

== Wired and Gizmodo (2015) ==
In December 2015 both publications suggested that [[craig-wright|Craig Wright]] might be Satoshi.[^wp] A UK court found in 2024 that he is not.

== Money Electric (2024) ==
Cullen Hoback's 2024 HBO documentary ''Money Electric: The Bitcoin Mystery'' named [[peter-todd|Peter Todd]], who called the claim “ludicrous”.[^wp-todd]

== The New York Times (2026) ==
In April 2026 the ''New York Times'' published an investigation by John Carreyrou asserting that [[adam-back|Adam Back]] is Satoshi. It cited his use of less common phrases, shared niche interests, and the timing of Satoshi's last communication and Back's first public comment on Bitcoin. Back denied it.[^wp-back]

== Finding Satoshi (2026) ==
The 2026 documentary ''Finding Satoshi'' proposed that Satoshi was a partnership between [[len-sassaman|Len Sassaman]] and [[hal-finney|Hal Finney]].[^wp] Both died years before the film.
""",
 refs={}, see=["identity-of-satoshi-nakamoto", "writing-style"],
),
dict(
 slug="bitcoin-white-paper", title="Bitcoin white paper", kind="topic", img="icon:description",
 caption="“Bitcoin: A Peer-to-Peer Electronic Cash System”",
 cats=["Documents", "Events"],
 short="The paper that described Bitcoin, announced 31 October 2008.",
 featured=True, aliases=[], label=None,
 info=[("Title", "Bitcoin: A Peer-to-Peer Electronic Cash System"), ("Announced", "31 October 2008"), ("Working title", "Electronic Cash Without a Trusted Third Party"), ("Venue", "Cryptography mailing list")],
 body="""
The '''Bitcoin white paper''', ''Bitcoin: A Peer-to-Peer Electronic Cash System'', proposes “a purely peer-to-peer version of electronic cash” in which a peer-to-peer network prevents double-spending by timestamping transactions into a chain of proof-of-work.[^paper] Satoshi announced it on 31 October 2008.[^wp-history]

== Drafts ==
In August 2008 Satoshi described the paper to [[adam-back|Adam Back]] under the working title ''Electronic Cash Without a Trusted Third Party'' and offered a pre-release draft ({{mail:adam-back|Citation of your Hashcash paper|the email}}). He asked [[wei-dai|Wei Dai]] for the date of b-money so he could cite it. [[nakamoto-archive|nakamoto-archive]] keeps a version of the paper dated 3 October 2008.[^na]

== Announcement ==
Satoshi posted to the [[cryptography-mailing-list|Cryptography mailing list]]: “I've been working on a new electronic cash system that's fully peer-to-peer, with no trusted third party.” He listed the main properties, starting with “Double-spending is prevented with a peer-to-peer network.” ({{mail:cryptography|Bitcoin P2P e-cash paper|the announcement}}). The first reply, from [[james-a-donald|James A. Donald]], questioned whether it could scale. The paper is hosted at bitcoin.org.[^paper]

== References ==
The paper cites eight works, among them Wei Dai's b-money and Adam Back's Hashcash. It does not cite [[nick-szabo|Nick Szabo]]'s bit gold.[^paper] See [[precursors-of-bitcoin]].
""",
 refs={}, see=["precursors-of-bitcoin", "cryptography-mailing-list", "genesis-block"],
),
dict(
 slug="precursors-of-bitcoin", title="Precursors of Bitcoin", kind="topic", img="icon:history_edu",
 caption="Ecash, Hashcash, b-money, bit gold and RPOW",
 cats=["Cypherpunks", "Documents"],
 short="The digital-cash ideas Bitcoin built on.",
 aliases=[], label=None, info=[("Period", "1983 – 2004")],
 body="""
Bitcoin combined ideas that cryptographers had been developing for two decades. Satoshi said as much to [[adam-back|Adam Back]] when he learned of b-money: “my ideas start from exactly that point.” ({{mail:adam-back|Citation of your Hashcash paper|the email}}).

* '''Ecash''' (1983): David Chaum's anonymous cryptographic electronic money, using blind signatures; the money was cryptographically signed by a bank.[^wp-ecash]
* '''Hashcash''' (1997): [[adam-back|Adam Back]]'s proof-of-work scheme for spam control.[^wp-bitcoin] The white paper cites it.[^paper]
* '''b-money''' (1998): [[wei-dai|Wei Dai]]'s “anonymous, distributed electronic cash system”.[^wp-dai] It is reference [1] in the white paper.[^paper]
* '''Bit gold''' (1998): [[nick-szabo|Nick Szabo]]'s mechanism for a decentralised digital currency.[^wp-szabo]
* '''RPOW''' (2004): [[hal-finney|Hal Finney]]'s reusable proof-of-work system, the first of its kind.[^wp-finney]

The [[bitcoin-white-paper|white paper]] presents its own answer as a solution to “the double-spending problem using a peer-to-peer network”.[^paper]
""",
 refs={}, see=["bitcoin-white-paper", "adam-back", "wei-dai", "nick-szabo"],
),
dict(
 slug="pre-release-source-code", title="Pre-release source code", kind="topic", img="icon:code",
 caption="Satoshi's November 2008 code",
 cats=["Software", "Documents"],
 short="The earliest known Bitcoin code, sent to three reviewers in November 2008.",
 aliases=[], label=None, info=[("Date", "November 2008"), ("Recipients", "Hal Finney, Ray Dillinger, James A. Donald")],
 body="""
In November 2008, two months before the first release, Satoshi sent the core of his source code to three people from the [[cryptography-mailing-list|Cryptography mailing list]]: [[hal-finney|Hal Finney]], [[ray-dillinger|Ray Dillinger]] and [[james-a-donald|James A. Donald]]. Finney's reply, copied to the other two, is in this archive ({{mail:hal-finney|Re: Bitcoin source files attached|the email}}).

Dillinger later published the main files on BitcoinTalk, and [[nakamoto-archive|nakamoto-archive]] keeps a copy.[^na]
""",
 refs={}, see=["bitcoin-v0-1", "ray-dillinger"],
),
dict(
 slug="genesis-block", title="Genesis block", kind="topic", img="icon:deployed_code",
 caption="Block 0, dated 3 January 2009",
 cats=["Events", "Software"],
 short="The first block of the Bitcoin blockchain, carrying a Times headline.",
 featured=True, aliases=[], label=None,
 info=[("Height", "0"), ("Date", "3 January 2009"), ("Embedded text", "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks")],
 body="""
The '''genesis block''' is block 0 of the Bitcoin blockchain, hard-coded into the software and dated 3 January 2009. Embedded in it is the text “The Times 03/Jan/2009 Chancellor on brink of second bailout for banks”.[^wp-bitcoin]

The headline serves as a timestamp, and has been read as a derisive comment on the instability caused by fractional-reserve banking.[^wp] Satoshi described it as “a hardcoded block that you start out with” ({{mail:bitcointalk|blocks minus 1|the post|from=satoshi}}).

The first open-source client, [[bitcoin-v0-1|v0.1]], was released on 9 January 2009.[^wp-history] Satoshi saw newspapers as natural timestamps: in January 2009 he told [[dustin-trammell|Dustin Trammell]] that publishing hashes in “a magazine or newspaper” would “work a lot easier in court” ({{mail:dustin-trammell|Re: Bitcoin v0.1 released|the email|from=Satoshi}}).
""",
 refs={}, see=["bitcoin-v0-1", "first-bitcoin-transaction"],
),
dict(
 slug="bitcoin-v0-1", title="Bitcoin v0.1", kind="topic", img="icon:terminal",
 caption="The first release, January 2009",
 cats=["Software", "Events"],
 short="The first release of the Bitcoin software, for Windows, in January 2009.",
 aliases=[], label=None,
 info=[("Announced", "8 January 2009 (UTC)"), ("Platform", "Windows"), ("Hosted at", "SourceForge"), ("Language", "C++")],
 body="""
'''Bitcoin v0.1''' was the first release of Satoshi's software. He announced it on the [[cryptography-mailing-list|Cryptography mailing list]] on 8 January 2009: “Announcing the first release of Bitcoin, a new electronic cash system that uses a peer-to-peer network to prevent double-spending.” It ran on Windows only for the time being and included the C++ source code ({{mail:cryptography|Bitcoin v0.1 released|the announcement}}).

The release notes on [[bitcoin-list|bitcoin-list]] set out the rules that still apply, including the 21 million coin limit ({{mail:bitcoin-list|[bitcoin-list] Bitcoin v0.1 Alpha release notes|release notes}}; see [[supply-cap]]).

== First users ==
[[hal-finney|Hal Finney]] ran it immediately, and Satoshi sent him the [[first-bitcoin-transaction|first transaction]] on 12 January. Within days Finney, [[dustin-trammell|Dustin Trammell]] and others were reporting bugs, and Satoshi shipped versions 0.1.2, 0.1.3 and 0.1.5 over the following weeks ({{mail:bitcoin-list|[bitcoin-list] Bitcoin v0.1.2 now available|v0.1.2}}). He also wrote to [[wei-dai|Wei Dai]] that the release “achieves nearly all the goals you set out to solve in your b-money paper”.
""",
 refs={}, see=["genesis-block", "pre-release-source-code", "sourceforge"],
),
dict(
 slug="first-bitcoin-transaction", title="First bitcoin transaction", kind="topic", img="icon:send_money",
 caption="10 BTC from Satoshi to Hal Finney",
 cats=["Events"],
 short="Satoshi's 10-bitcoin payment to Hal Finney in block 170.",
 aliases=[], label=None,
 info=[("Date", "12 January 2009"), ("Block", "170"), ("Amount", "10 BTC"), ("From", "Satoshi Nakamoto"), ("To", "Hal Finney")],
 body="""
The '''first bitcoin transaction''' was a payment of 10 bitcoins from Satoshi to [[hal-finney|Hal Finney]], included in block 170 on 12 January 2009.[^wp-history] Finney had been running [[bitcoin-v0-1|v0.1]] since its release, and the two were exchanging bug reports at the time ({{label:hal-finney|their emails}}).
""",
 refs={}, see=["hal-finney", "bitcoin-v0-1"],
),
dict(
 slug="cryptography-mailing-list", title="Cryptography mailing list", kind="topic", img="icon:forward_to_inbox",
 caption="metzdowd.com",
 cats=["Forums and lists"],
 short="The mailing list where Satoshi announced the white paper and v0.1.",
 aliases=[], label="cryptography",
 info=[("Host", "metzdowd.com"), ("Satoshi active", "October 2008 – January 2009")],
 body="""
The '''Cryptography mailing list''', hosted at metzdowd.com, is the list Satoshi used to announce the [[bitcoin-white-paper|white paper]] on 31 October 2008 and [[bitcoin-v0-1|v0.1]] on 8 January 2009.

The white-paper thread is the first public discussion of Bitcoin. Members including [[james-a-donald|James A. Donald]], [[ray-dillinger|Ray Dillinger]] and [[hal-finney|Hal Finney]] debated its scalability, its incentives and its defence against attack, and Satoshi answered at length ({{mail:cryptography|Bitcoin P2P e-cash paper|the thread}}). It is under the ''Cryptography'' label in Satoshi Mail ({{label:cryptography|open the label}}).
""",
 refs={}, see=["bitcoin-white-paper", "bitcoin-list", "p2p-foundation"],
),
dict(
 slug="bitcoin-list", title="bitcoin-list", kind="topic", img="icon:list_alt",
 caption="The project's SourceForge mailing list",
 cats=["Forums and lists"],
 short="Bitcoin's own announcement list on SourceForge, opened December 2008.",
 aliases=[], label="bitcoin-list",
 info=[("Host", "SourceForge"), ("Opened", "December 2008")],
 body="""
'''bitcoin-list''' was the project's mailing list on [[sourceforge|SourceForge]]. Satoshi opened it with a welcome message on 10 December 2008 and used it for release announcements and alerts until 2010 ({{label:bitcoin-list|open the label}}).

It carried the v0.1 release notes, the 0.3 announcement (“Escape the arbitrary inflation risk of centrally managed currencies! Bitcoin's total circulation is limited to 21 million coins.”) and, on 15 August 2010, the warning about the [[value-overflow-incident|value overflow incident]] ({{mail:bitcoin-list|[bitcoin-list] Bitcoin 0.3 released!|0.3 announcement}}, {{mail:bitcoin-list|[bitcoin-list] ALERT - we are investigating a problem|the alert}}).
""",
 refs={}, see=["sourceforge", "bitcointalk"],
),
dict(
 slug="p2p-foundation", title="P2P Foundation", kind="topic", img="icon:hub",
 caption="Where Satoshi introduced Bitcoin to a wider audience",
 cats=["Forums and lists"],
 short="The forum where Satoshi described Bitcoin for a general audience in February 2009.",
 aliases=[], label="p2pfoundation",
 info=[("Post", "11 February 2009"), ("Profile", "Claimed: 37, living in Japan")],
 body="""
On 11 February 2009 Satoshi posted “Bitcoin open source implementation of P2P currency” on its forum, his most accessible early description of the problem Bitcoin solves: trust in central banks and financial institutions ({{mail:p2pfoundation|Bitcoin open source implementation of P2P currency|the post}}). He sent the same text to the P2P Research mailing list ({{mail:p2p-research|[p2p-research] Bitcoin open source implementation of P2P currency|the email}}).

On his P2P Foundation profile Satoshi claimed to be a 37-year-old man living in Japan.[^wp] The same thread received the post “I am not Dorian Nakamoto” in March 2014 ([[media-investigations]]).
""",
 refs={}, see=["cryptography-mailing-list", "media-investigations"],
),
dict(
 slug="bitcointalk", title="BitcoinTalk", kind="topic", img="icon:forum",
 caption="The Bitcoin forum Satoshi founded",
 cats=["Forums and lists"],
 short="The forum Satoshi opened in November 2009, where he wrote most of his public posts.",
 aliases=[], label="bitcointalk",
 info=[("Opened", "22 November 2009"), ("Founder", "Satoshi Nakamoto"), ("Satoshi's posts", "539")],
 body="""
'''BitcoinTalk''' is the Bitcoin forum Satoshi created on 22 November 2009[^wp-btctalk] with the post “Welcome to the new Bitcoin forum!” ({{mail:bitcointalk|Welcome to the new Bitcoin forum!|the post}}). [[martti-malmi|Martti Malmi]] set up the software ({{mail:martti-malmi|Forum|the emails}}).

Most of what Satoshi wrote in public is here: design explanations, release notes, bug reports and arguments with early users, from late 2009 until 12 December 2010 ({{mail:bitcointalk|Added some DoS limits, removed safe mode (0.3.19)|his last post}}). In Satoshi Mail the forum threads are under the Forums tab ({{go:#inbox-forums|open Forums}}).
""",
 refs={}, see=["martti-malmi", "departure-of-satoshi-nakamoto"],
),
dict(
 slug="bitcoin-org", title="bitcoin.org", kind="topic", img="icon:language",
 caption="Registered 18 August 2008",
 cats=["Forums and lists", "Software"],
 short="The website Satoshi registered in 2008 to host the white paper and software.",
 aliases=[], label=None,
 info=[("Registered", "18 August 2008"), ("Hosted", "The white paper and software downloads")],
 body="""
'''bitcoin.org''' is the domain Satoshi registered on 18 August 2008, ten weeks before the white paper.[^wp-history] It hosts the paper,[^paper] and in 2009 [[martti-malmi|Martti Malmi]] worked on its pages with Satoshi ({{label:martti-malmi|their emails}}).

A copy of the site from 3 March 2009 is kept in [[nakamoto-archive|nakamoto-archive]].[^na] The bitcoin.org repository on GitHub, which holds release announcements and network alerts from 2011 onward, is also part of this dataset.
""",
 refs={}, see=["bitcoin-white-paper", "martti-malmi"],
),
dict(
 slug="sourceforge", title="SourceForge", kind="topic", img="icon:inventory_2",
 caption="Bitcoin's first code host",
 cats=["Software", "Forums and lists"],
 short="Where Bitcoin's code, releases and mailing list lived until 2011.",
 aliases=[], label=None,
 info=[("Repository", "Subversion (SVN)"), ("Satoshi's last revision", "r202, 15 December 2010")],
 body="""
Bitcoin's first home was '''SourceForge''', which hosted the downloads, the [[bitcoin-list|bitcoin-list]] mailing list and a Subversion repository. Satoshi committed as ''s_nakamoto''; the first revision credited to him is r15 on 21 October 2009 ({{commit:99cef996c7|r15}}) and his last is r202, “get external ip from irc”, on 15 December 2010 ({{commit:629e37dde1|r202}}). The archive lists 203 commits under his name ({{go:#commits|open Commits}}).

The SVN history was later imported into the Git repository on GitHub that became [[bitcoin-core|Bitcoin Core]].[^core]
""",
 refs={}, see=["bitcoin-core", "bitcoin-v0-1"],
),
dict(
 slug="bitcoin-core", title="Bitcoin Core", kind="topic", img="icon:code_blocks",
 caption="The continuation of Satoshi's client",
 cats=["Software"],
 short="The software descended from Satoshi's original client.",
 aliases=[], label=None, info=[("Renamed", "2014 (version 0.9.0)"), ("Repository", "github.com/bitcoin/bitcoin")],
 body="""
'''Bitcoin Core''' is the software Satoshi first published under the name “Bitcoin”; it took the name Bitcoin Core with version 0.9.0 in 2014.[^wp-core] Its GitHub repository holds the full history back to the [[sourceforge|SourceForge]] era, including all of Satoshi's commits.[^core]

After Satoshi stepped back, [[gavin-andresen|Gavin Andresen]] led development until Wladimir J. van der Laan took over as lead maintainer on 8 April 2014.[^wp-core] Satoshi's last commit is SVN revision 202 ({{commit:629e37dde1|“get external ip from irc”}}); the 203 commits listed under his name are in the Commits folder of Satoshi Mail ({{go:#commits|open Commits}}).
""",
 refs={}, see=["sourceforge", "gavin-andresen"],
),
dict(
 slug="supply-cap", title="21 million supply cap", kind="topic", img="icon:savings",
 caption="Bitcoin's fixed maximum supply",
 cats=["Economics"],
 short="The rule that no more than 21 million bitcoins will ever exist.",
 featured=True, aliases=[], label=None, info=[("Limit", "21,000,000 BTC"), ("Halving", "Every 210,000 blocks"), ("First stated", "January 2009")],
 body="""
Bitcoin's supply is capped at 21 million coins, and the block reward halves every 210,000 blocks.[^wp-bitcoin] Satoshi set out the schedule in the [[bitcoin-v0-1|v0.1]] release notes, “with the amount cut in half every 4 years” ({{mail:bitcoin-list|[bitcoin-list] Bitcoin v0.1 Alpha release notes|release notes}}), and repeated it in the 0.3 announcement: “Bitcoin's total circulation is limited to 21 million coins.” ({{mail:bitcoin-list|[bitcoin-list] Bitcoin 0.3 released!|the announcement}}).

When users worried that so few coins could not serve the world, he pointed to divisibility: “Eventually at most only 21 million coins for 6.8 billion people in the world if it really gets huge. But don't worry, there are another 6 decimal places that aren't shown” ({{mail:bitcointalk|How divisible are bitcoins and other market/economic questions|the post|from=satoshi}}). See [[satoshi-unit]].

On lost coins he wrote: “Lost coins only make everyone else's coins worth slightly more. Think of it as a donation to everyone.” ({{mail:bitcointalk|Dying bitcoins|the post|from=satoshi}}).

When [[mike-hearn|Mike Hearn]] asked in 2009 where “24 million coins” came from, Satoshi replied that “there's only going to be 21 million coins for the whole world” ({{mail:mike-hearn|Questions about BitCoin|the emails}}).
""",
 refs={}, see=["satoshi-unit", "satoshis-coins"],
),
dict(
 slug="satoshi-unit", title="Satoshi (unit)", kind="topic", img="icon:toll",
 caption="0.00000001 BTC",
 cats=["Economics"],
 short="Bitcoin's smallest unit, one hundred-millionth of a bitcoin.",
 aliases=[], label=None, info=[("Value", "0.00000001 BTC"), ("Per bitcoin", "100,000,000")],
 body="""
A '''satoshi''' is the smallest unit of bitcoin: one hundred-millionth (0.00000001) of a coin.[^wp-bitcoin]

Satoshi explained the eight decimal places in 2010: “It shows 1.00 but internally it's 1.00000000.” ({{mail:bitcointalk|How divisible are bitcoins and other market/economic questions|the post|from=satoshi}}).
""",
 refs={}, see=["supply-cap"],
),
dict(
 slug="value-overflow-incident", title="Value overflow incident", kind="topic", img="icon:warning",
 caption="Block 74638, 15 August 2010",
 cats=["Events", "Software"],
 short="The August 2010 bug that created over 184 billion bitcoins, fixed within hours.",
 featured=True, aliases=[], label=None,
 info=[("Date", "15 August 2010"), ("Block", "74638"), ("Created", "Two outputs of over 92 billion BTC each"), ("Fixed in", "Version 0.3.10")],
 body="""
The '''value overflow incident''' was a bug found on 15 August 2010, when a transaction in block 74638 used an integer overflow to create bitcoins out of nothing: two outputs of 92,233,720,368.54 BTC each ({{mail:bitcointalk|overflow bug SERIOUS|the forum report}}). The bug was fixed within hours.[^wp-history]

== Response ==
Satoshi posted an alert within hours: “*** WARNING *** We are investigating a problem. DO NOT TRUST ANY TRANSACTIONS THAT HAPPENED AFTER 15.08.2010 17:05 UTC (block 74638) until the issue is resolved.” ({{mail:bitcoin-list|[bitcoin-list] ALERT - we are investigating a problem|the alert}}). He committed the fix the same day ({{commit:d4c6b90ca3|“fix for block 74638 overflow output transaction”}}) and released version 0.3.10, which rejected the bad block ({{mail:bitcointalk|Version 0.3.10 - block 74638 overflow PATCH!|the release post}}).

Satoshi asked users to stop generating so a corrected branch could overtake the bad one. The next day he wrote: “It looks like we overtook the bad chain somewhere around 74689”, and added code to reorganise the chain automatically ({{mail:bitcointalk|overflow bug SERIOUS|the thread|from=satoshi}}).

== Aftermath ==
A week later Satoshi began building an alert system so that developers could warn every node of an emergency ({{mail:bitcointalk|Development of alert system|the post}}). He later handed the alert key to [[gavin-andresen|Gavin Andresen]].
""",
 refs={}, see=["satoshis-accounts", "bitcoin-list"],
),
dict(
 slug="wikileaks-and-bitcoin", title="WikiLeaks and Bitcoin", kind="topic", img="icon:campaign",
 caption="“Kicked the hornet's nest”, December 2010",
 cats=["Events"],
 short="Satoshi's December 2010 appeal to WikiLeaks not to use Bitcoin.",
 aliases=[], label=None, info=[("Date", "December 2010"), ("Thread", "“Wikileaks contact info?”")],
 body="""
In December 2010 forum users urged WikiLeaks to accept bitcoin. Satoshi disagreed: “No, don't ‘bring it on’. The project needs to grow gradually so the software can be strengthened along the way. I make this appeal to WikiLeaks not to try to use Bitcoin. Bitcoin is a small beta community in its infancy. You would not stand to get more than pocket change, and the heat you would bring would likely destroy us at this stage.” ({{mail:bitcointalk|Wikileaks contact info?|the post|from=satoshi}}).

When ''PC World'' linked Bitcoin to WikiLeaks a few days later, he wrote: “It would have been nice to get this attention in any other context. WikiLeaks has kicked the hornet's nest, and the swarm is headed towards us.” ({{mail:bitcointalk|PC World Article on Bitcoin|the post|from=satoshi}}). It was one of his last posts. WikiLeaks began accepting bitcoin in June 2011.[^wp-history]
""",
 refs={}, see=["departure-of-satoshi-nakamoto"],
),
dict(
 slug="bitcoin-pizza-day", title="Bitcoin Pizza Day", kind="topic", img="icon:local_pizza",
 caption="22 May 2010",
 cats=["Events", "Economics"],
 short="The 22 May 2010 purchase of two pizzas for 10,000 bitcoins.",
 aliases=[], label=None, info=[("Date", "22 May 2010"), ("Buyer", "Laszlo Hanyecz"), ("Price", "10,000 BTC")],
 body="""
'''Bitcoin Pizza Day''' marks 22 May 2010, when [[laszlo-hanyecz|Laszlo Hanyecz]] paid 10,000 bitcoins for two pizzas, worth about $41 at the time.[^wp-history] It was the first known commercial transaction using bitcoin, later celebrated as Bitcoin Pizza Day.[^wp-bitcoin]

A few days earlier Satoshi had written to Hanyecz asking him to slow down his GPU mining, which was earning him far more coins than CPU miners could ({{mail:single-emails|Email to Laszlo Hanyecz|the email}}).
""",
 refs={}, see=["laszlo-hanyecz", "new-liberty-standard"],
),
dict(
 slug="departure-of-satoshi-nakamoto", title="Departure of Satoshi Nakamoto", kind="topic", img="icon:logout",
 caption="December 2010 – April 2011",
 cats=["Events", "Satoshi Nakamoto"],
 short="How Satoshi withdrew from Bitcoin between December 2010 and April 2011.",
 featured=True, aliases=[], label=None,
 info=[("Last forum post", "12 December 2010"), ("Last commit", "15 December 2010 (r202)"), ("Last email in archive", "26 April 2011")],
 body="""
Satoshi withdrew from Bitcoin gradually between December 2010 and April 2011, handing the project to [[gavin-andresen|Gavin Andresen]] and other developers.

== Last public activity ==
His last forum post, on 12 December 2010, announced version 0.3.19 and its denial-of-service limits ({{mail:bitcointalk|Added some DoS limits, removed safe mode (0.3.19)|the post}}). It came a day after his warning that “WikiLeaks has kicked the hornet's nest” ([[wikileaks-and-bitcoin]]). His last commit followed on 15 December ({{commit:629e37dde1|r202}}).

== Last emails ==
He kept writing privately into 2011. To [[mike-hearn|Mike Hearn]], on 23 April 2011: “I've moved on to other things. It's in good hands with Gavin and everyone.” ({{mail:mike-hearn|Holding coins in an unspendable state for a rolling time window|the email|from=Satoshi}}). To Andresen, on 26 April 2011, with the alert key: “I've moved on to other things and will probably be unavailable.” ({{mail:single-emails|Email to Gavin Andresen|the email}}). This archive holds no later email from him.

== Timeline ==
{{live:timeline}}
""",
 refs={}, see=["gavin-andresen", "mike-hearn", "satoshis-accounts"],
),
dict(
 slug="satoshis-accounts", title="Satoshi's accounts and keys", kind="topic", img="icon:key",
 caption="Email addresses, handles and keys",
 cats=["Satoshi Nakamoto"],
 short="The email addresses, forum accounts and cryptographic keys Satoshi used.",
 aliases=[], label=None,
 info=[("Email", "satoshi@anonymousspeech.com, satoshi@vistomail.com, satoshin@gmx.com"), ("SourceForge", "s_nakamoto"), ("Forum", "satoshi")],
 body="""
Satoshi used several accounts, mostly through services that did not require a real identity.

== Email ==
* '''satoshi@anonymousspeech.com''': his earliest address, used to write to [[adam-back|Adam Back]] and [[wei-dai|Wei Dai]] in August 2008.
* '''satoshi@vistomail.com''': used to announce the white paper on the [[cryptography-mailing-list|Cryptography list]], [[bitcoin-list|bitcoin-list]], and his emails with [[hal-finney|Hal Finney]] and [[dustin-trammell|Dustin Trammell]].
* '''satoshin@gmx.com''': used from 2009 with [[martti-malmi|Martti Malmi]], [[mike-hearn|Mike Hearn]] and Gavin Andresen. It is the address printed on the white paper at bitcoin.org.[^paper]

The archive's private emails show the split:
{{live:addresses}}

== Accounts and keys ==
He posted as ''satoshi'' on [[bitcointalk|BitcoinTalk]], committed as ''s_nakamoto'' on [[sourceforge|SourceForge]], and kept a profile on the [[p2p-foundation|P2P Foundation]] site. He published a PGP public key in 2008.[^na] He also held the network alert key, which he passed to [[gavin-andresen|Gavin Andresen]] in April 2011 ({{mail:single-emails|Email to Gavin Andresen|the email}}).

In September 2014 his P2P Foundation account was compromised through an email hack.[^sni]
""",
 refs={}, see=["departure-of-satoshi-nakamoto", "identity-of-satoshi-nakamoto"],
),
dict(
 slug="writing-style", title="Satoshi's writing style", kind="topic", img="icon:edit_note",
 caption="Spelling, spacing and hours",
 cats=["Satoshi Nakamoto", "Identity"],
 short="What Satoshi's spelling, punctuation and posting times reveal, measured from the archive.",
 featured=True, aliases=[], label=None, info=[("Measured from", "Satoshi's messages in this archive")],
 body="""
Satoshi's writing has been studied closely for clues to his identity. Analyses point to British spellings, double-spaced sentences and a long daily gap in posting.[^wp] The figures below are computed live from the messages in this archive.

== Posting hours ==
An analysis of his forum posts found a steep decline to almost none between 5 and 11 a.m. GMT.[^wp] His dated messages in this archive show a similar gap:
{{live:posting-hours}}

== Spelling ==
His writing includes British forms such as “colour”, “grey” and “maths”, and the phrase “bloody hard”,[^wp] though he also uses American spellings.
{{live:spellings}}

== Spacing ==
Satoshi usually put two spaces after a full stop, a typewriter-era habit:
{{live:double-space}}

None of this identifies anyone. Many people share each habit, and a careful writer could adopt them. See [[identity-of-satoshi-nakamoto]].
""",
 refs={}, see=["identity-of-satoshi-nakamoto", "media-investigations"],
),
dict(
 slug="satoshis-coins", title="Satoshi's coins", kind="topic", img="icon:account_balance_wallet",
 caption="Estimated holdings, untouched since 2010",
 cats=["Satoshi Nakamoto", "Economics"],
 short="The 750,000 to 1.1 million bitcoins attributed to Satoshi, untouched since 2010.",
 aliases=[], label=None, info=[("Estimate", "750,000 – 1.1 million BTC"), ("Moved", "Untouched since 2010")],
 body="""
Estimates of the bitcoins in Satoshi's possession range from 750,000 to 1.1 million; the wallet has been untouched since 2010.[^wp] Another estimate puts what he mined at about one million.[^wp-bitcoin]

Moving the earliest bitcoins mined, or signing a message with the key associated with them, has been proposed as proof of being Satoshi ([[identity-of-satoshi-nakamoto]]).[^wp] His 10-bitcoin payment to Hal Finney was the [[first-bitcoin-transaction|first bitcoin transaction]].[^wp-history]
""",
 refs={}, see=["identity-of-satoshi-nakamoto", "supply-cap"],
),
dict(
 slug="monuments-to-satoshi", title="Monuments to Satoshi", kind="topic", img="icon:account_balance",
 caption="Budapest and Lugano",
 cats=["Satoshi Nakamoto"],
 short="Statues of Satoshi in Budapest and Lugano.",
 aliases=[], label=None, info=[("Budapest", "Bust, 2021"), ("Lugano", "Statue by Valentina Picozzi")],
 body="""
Satoshi has been commemorated with statues.[^wp]

* '''Budapest''': a bust of Satoshi was installed in Budapest, Hungary, in 2021.[^wp]
* '''Lugano''': a statue by Valentina Picozzi in Lugano, Switzerland. It was stolen and thrown into the lake, and later recovered.[^wp]
""",
 refs={}, see=["satoshi-nakamoto"],
),
dict(
 slug="satoshi-nakamoto-institute", title="Satoshi Nakamoto Institute", kind="topic", img="icon:school",
 caption="The source of this archive",
 cats=["Archives"],
 short="The organisation whose collection of Satoshi's writings is the core of this archive.",
 aliases=[], label=None, info=[("Founded", "November 2013"), ("Website", "nakamotoinstitute.org")],
 body="""
The '''Satoshi Nakamoto Institute''' (SNI) was founded in November 2013 “to advance and preserve knowledge of Bitcoin's history, economics, and technology”.[^sni-about] Its ''Complete Satoshi'' collection of emails and forum posts, with the surrounding threads, is the core of Satoshi Mail.[^sni]

SNI also publishes The Quotable Satoshi, a library of papers and the Mempool essays.[^sni-about] It notes that the 2014 “I am not Dorian Nakamoto” post's authenticity “demands scrutiny”.[^sni] See [[quotable-satoshi]] and [[nakamoto-archive]].
""",
 refs={}, see=["quotable-satoshi", "nakamoto-archive"],
),
dict(
 slug="nakamoto-archive", title="nakamoto-archive", kind="topic", img="icon:folder_zip",
 caption="github.com/lugaxker/nakamoto-archive",
 cats=["Archives"],
 short="A GitHub archive of Satoshi's writings and primary sources, including private email.",
 aliases=[], label=None, info=[("Host", "GitHub"), ("Sources", "44 source files, each with a SHA-256 hash")],
 body="""
'''nakamoto-archive''' is a GitHub repository that collects Satoshi's writings together with the primary sources they come from: mailing-list archives, the email collections of [[martti-malmi|Martti Malmi]], [[mike-hearn|Mike Hearn]], [[dustin-trammell|Dustin Trammell]] and [[hal-finney|Hal Finney]], the emails with [[adam-back|Adam Back]] and [[wei-dai|Wei Dai]], early code, and an early version of [[bitcoin-org|bitcoin.org]].[^na] Each source file is listed with its date, origin and SHA-256 hash.

Satoshi Mail's Private tab is built from it ({{go:#inbox-private|open Private}}).
""",
 refs={}, see=["satoshi-nakamoto-institute"],
),
dict(
 slug="quotable-satoshi", title="The Quotable Satoshi", kind="topic", img="icon:format_quote",
 caption="Quotes sorted into 25 topics",
 cats=["Archives", "Satoshi Nakamoto"],
 short="SNI's collection of Satoshi quotes, which supplies the Topics in Satoshi Mail.",
 aliases=[], label=None, info=[("Quotes", "162"), ("Topics", "25")],
 body="""
'''The Quotable Satoshi''' is the Satoshi Nakamoto Institute's collection of short quotations from Satoshi's emails, posts and the white paper, each filed under topics such as mining, privacy and scalability.[^sni] In Satoshi Mail these categories are the Topics in the sidebar, and messages that contain a quote are marked.

A random quote from the collection:
{{live:quote}}
""",
 refs={}, see=["satoshi-nakamoto-institute"],
),
dict(
 slug="blocktrainer-archive", title="Blocktrainer archive", kind="topic", img="icon:translate",
 caption="“Satoshi Nakamoto’s Emails & Posts: The Full Archive”",
 cats=["Archives"],
 short="Blocktrainer's searchable archive of Satoshi's emails and posts, with German translations.",
 featured=False, aliases=[], label=None,
 info=[("Publisher", "Blocktrainer (blocktrainer.de)"), ("Entries", "4,236"), ("Languages", "English, German"), ("Checked", "20 October 2026")],
 body="""
'''Blocktrainer archive''' is the name used here for “Satoshi Nakamoto’s Emails & Posts: The Full Archive”, a searchable collection published by Blocktrainer. It brings together Satoshi's emails, forum posts and mailing-list contributions in date order, links each one to its original source, includes posts by early correspondents and forum users where they give context, and offers a German translation of every entry.[^bt]

== Compared with this archive ==
On 20 October 2026 its 4,236 entries were checked against Satoshi Mail's data, and every one of them is also here. Its forum and mailing-list entries match the [[satoshi-nakamoto-institute|Satoshi Nakamoto Institute]]'s collection post for post: 3,831 BitcoinTalk posts in 259 threads, 14 P2P Foundation posts and 72 mailing-list emails. Its private emails match [[nakamoto-archive|nakamoto-archive]]'s, except that it has no emails with [[adam-back|Adam Back]] and includes only Satoshi's side of his exchanges with [[mike-hearn|Mike Hearn]] and [[dustin-trammell|Dustin Trammell]].

It dates Satoshi's email to [[laszlo-hanyecz|Laszlo Hanyecz]] 11 December 2009, where nakamoto-archive's source gives May 2010 ({{mail:single-emails|Email to Laszlo Hanyecz|the email}}). Conversations in Satoshi Mail that it includes link to it.
""",
 refs={"bt": "[https://www.blocktrainer.de/en/satoshi-nakamoto-full-archive Satoshi Nakamoto’s Emails & Posts: The Full Archive], Blocktrainer. Retrieved 20 October 2026."},
 see=["satoshi-nakamoto-institute", "nakamoto-archive", "satoshin-archive"],
),
dict(
 slug="satoshin-archive", title="Satoshi Nakamoto Archive (satoshin.name)", kind="topic", img="icon:inventory_2",
 caption="satoshin.name, a backup copy of Satoshi's public messages",
 cats=["Archives"],
 short="satoshin.name, a backup of Satoshi's BitcoinTalk posts and mailing-list emails, one page per message.",
 featured=False, aliases=["satoshin.name", "Satoshi Nakamoto Archive"], label=None,
 info=[("Address", "satoshin.name"), ("Created", "January 2020"), ("Entries", "567"), ("Covers", "November 2008 – December 2010"), ("Checked", "20 October 2026")],
 body="""
'''Satoshi Nakamoto Archive''' is a website at satoshin.name that keeps a copy of Satoshi Nakamoto's public messages. Its about page says it was created in January 2020 as a backup of Satoshi's messages, in case they were removed from other sources or altered.[^sn-about]

== Contents ==
The archive has 567 entries, each on its own page, from Satoshi's announcement of the [[bitcoin-white-paper|white paper]] on the Cryptography Mailing List in November 2008 to his last forum posts in December 2010.[^sn] They come from three places:
* 533 posts on the [[bitcointalk|Bitcoin Forum]];
* 18 emails to the Cryptography Mailing List, linked to their copies on mail-archive.com;
* 16 emails to the bitcoin-list mailing list on SourceForge.

Each entry gives the date and time of publication, the category, the sender and a link to the original message, and many list the people mentioned in it. Only Satoshi's own messages are included, not the posts and emails he was replying to.[^sn]

== Compared with this archive ==
On 20 October 2026 all 567 entries were checked against Satoshi Mail's data, and every one of them is also here. Each of those messages in Satoshi Mail links to its page on satoshin.name from its details, and conversations that include one link to it under the title.

Satoshi Mail has messages that satoshin.name does not: six of Satoshi's BitcoinTalk posts, his posts on the P2P Foundation forum and the p2p-research list, and all of his private emails, which come from [[nakamoto-archive|nakamoto-archive]]. The six forum posts are in the threads ''A few suggestions'', ''Bitcoin crash when sending coins'', ''new binary release?'', ''JSON-RPC password'', ''Internal version number'' and ''BitDNS and Generalizing Bitcoin''.

For the Cryptography Mailing List, the archive's dates are when mail-archive.com received each email, which can be a day or more after it was sent; Satoshi Mail shows the time each email was sent, from the list's own archive.[^sn]
""",
 refs={"sn": "[https://satoshin.name/ Satoshi Nakamoto Archive], satoshin.name. Retrieved 20 October 2026.",
       "sn-about": "[https://satoshin.name/about/ About the Archive], satoshin.name. Retrieved 20 October 2026."},
 see=["satoshi-nakamoto-institute", "blocktrainer-archive", "nakamoto-archive"],
),
dict(
 slug="nicholas-bohm", title="Nicholas Bohm", kind="person", img="icon:gavel",
 caption="Early Bitcoin user and correspondent of Satoshi, 2009",
 cats=["People", "Correspondents"],
 short="Retired English solicitor who debugged Bitcoin v0.1 with Satoshi by email in 2009.",
 featured=False, aliases=["Nicholas Bohm", "Bohm"], label="nicholas-bohm",
 info=[("Profession", "Solicitor (retired 1994)"), ("Emails with Satoshi", "January–July 2009"), ("Evidence", "COPA v Wright, 2023")],
 body="""
'''Nicholas Bohm''' is a retired English solicitor who was one of Bitcoin's first users and corresponded with Satoshi Nakamoto in 2009. He qualified in 1968, became a partner at the law firm Norton Rose in 1975 and retired from it in 1994. His interest in cryptography dates from the late 1970s.[^bohm-ws]

== With Satoshi ==
Bohm read the [[cryptography-mailing-list|Cryptography Mailing List]], where the white paper was announced, and downloaded the paper on 18 January 2009.[^bohm-ws] On 25 January he asked [[bitcoin-list|bitcoin-list]] whether it was the place to report problems ({{mail:bitcoin-list|[bitcoin-list] Problems|his post}}). Satoshi replied the same day, to him and the list, asking him to send his debug log directly rather than to the list ({{mail:bitcoin-list|[bitcoin-list] Problems|the reply|from=Satoshi}}), and they continued in private ({{mail:nicholas-bohm|[bitcoin-list] Problems|the emails}}).

Over the following week they chased crashes in [[bitcoin-v0-1|Bitcoin v0.1]]. When email attachments failed to arrive, Satoshi sent test builds from both his addresses and through a file-hosting site, and on 31 January he wrote: “Good news! I pinpointed the bug. The bug could occur if a DNS lookup failed.” ({{mail:nicholas-bohm|Bugfix|the email}}).

On 1 February Satoshi told him, “I sent a transfer to your Bitcoin address in case you're curious what that looks like” ({{mail:nicholas-bohm|Another crash|the email|from=Satoshi|date=2009-02-01}}); Bohm's witness statement describes it as an unprompted transfer of 100 bitcoins.[^bohm-ws] Two days later Bohm sent bitcoins to an address Satoshi gave him, Satoshi promised to send “+0.01” back as a confirmation, and Bohm wrote that “the bc19.01 came back pretty swiftly!” ({{mail:nicholas-bohm|Bitcoin|the email|date=2009-02-03}}).

Their emails run until July 2009. Satoshi explained what the “blocks” count in the status bar meant ({{mail:nicholas-bohm|Bitcoin UI question|the email|from=Satoshi}}), that an occasional generated block marked “not accepted” was normal ({{mail:nicholas-bohm|Generated (not accepted)|the email|from=Satoshi}}), and, when Bohm found a generated block worth 50.10, that the extra 0.10 was a transaction fee someone had included ({{mail:nicholas-bohm|Bitcoin|the email|date=2009-05-24}}).

== Evidence in COPA v Wright ==
In July 2023 Bohm made a witness statement for the Crypto Open Patent Alliance in [[copa-v-wright|COPA v Wright]], exhibiting his complete correspondence with Satoshi as exported from his email program.[^bohm-ws] That export was later republished on GitHub, which is the copy in Satoshi Mail; Bohm's postal address, telephone numbers and IP address are left out here.[^nb1]
""",
 refs={"bohm-ws": "[https://bitcoindefense.org/assets/documents/Witness-Statement-of-Nicholas-Bohm.pdf Witness statement of Nicholas Bohm], COPA v Wright, claim IL-2021-000019, July 2023.",
       "nb1": "[https://github.com/NicholasBohm/emails Emails with Satoshi Nakamoto] (exhibit NB1, republished on GitHub). Retrieved 21 October 2026."},
 see=["copa-v-wright", "bitcoin-v0-1", "hal-finney"],
),
dict(
 slug="copa-v-wright", title="COPA v Wright", kind="topic", img="icon:gavel",
 caption="High Court of England and Wales, 2024",
 cats=["Identity", "Events"],
 short="The 2024 High Court case that declared Craig Wright is not Satoshi Nakamoto.",
 featured=False, aliases=["COPA v Wright", "Crypto Open Patent Alliance v Wright"], label=None,
 info=[("Court", "High Court of England and Wales"), ("Judge", "Mr Justice Mellor"), ("Trial", "5 February – 14 March 2024"), ("Judgment", "20 May 2024"), ("Citation", "[2024] EWHC 1198 (Ch)")],
 body="""
'''COPA v Wright''' was a case in the High Court of England and Wales in which the Crypto Open Patent Alliance (COPA) asked the court to decide whether [[craig-wright|Craig Wright]] is Satoshi Nakamoto. The judge, Mr Justice Mellor, declared that Wright is not the author of the [[bitcoin-white-paper|Bitcoin white paper]], is not the person who adopted or operated under the pseudonym Satoshi Nakamoto from 2008 to 2011, did not create the Bitcoin system, and is not the author of the initial versions of the Bitcoin software.[^copa]

== The case ==
COPA's claim (IL-2021-000019) was heard together with a second claim, IL-2022-000069, which the judgment calls the BTC Core Claim, in the Intellectual Property List of the Business and Property Courts. The hearing ran on 22 days between 5 February and 14 March 2024, and the judge announced his four declarations at the close of the closing arguments.[^copa]

The written judgment, [2024] EWHC 1198 (Ch), was handed down on 20 May 2024. In it the judge said he was “entirely satisfied that Dr Wright lied to the Court extensively and repeatedly”, and that on whether Wright was Satoshi “the evidence was overwhelming”.[^copa]

== Satoshi's correspondence as evidence ==
Witnesses who had corresponded with Satoshi gave evidence. [[nicholas-bohm|Nicholas Bohm]]'s statement exhibited his complete email exchange with Satoshi from 2009, which is now in Satoshi Mail.[^bohm-ws]
""",
 refs={"copa": "[https://caselaw.nationalarchives.gov.uk/ewhc/ch/2024/1198 Crypto Open Patent Alliance v Craig Steven Wright [2024] EWHC 1198 (Ch)], judgment of Mellor J, 20 May 2024.",
       "bohm-ws": "[https://bitcoindefense.org/assets/documents/Witness-Statement-of-Nicholas-Bohm.pdf Witness statement of Nicholas Bohm], COPA v Wright, claim IL-2021-000019, July 2023."},
 see=["craig-wright", "kleiman-v-wright", "identity-of-satoshi-nakamoto"],
),
dict(
 slug="kleiman-v-wright", title="Kleiman v. Wright", kind="topic", img="icon:gavel",
 caption="US District Court, Southern District of Florida",
 cats=["Identity", "Events"],
 short="US civil case against Craig Wright; a 2021 jury awarded W&K Info Defense Research $100 million.",
 featured=False, aliases=["Kleiman v Wright", "Kleiman v. Wright"], label=None,
 info=[("Court", "US District Court, S.D. Florida"), ("Case", "9:18-cv-80176"), ("Verdict", "6 December 2021")],
 body="""
'''Kleiman v. Wright''' was a civil case in the United States District Court for the Southern District of Florida, case 9:18-cv-80176, brought against [[craig-wright|Craig Wright]] by Ira Kleiman, as personal representative of the estate of David Kleiman, and by W&K Info Defense Research, LLC.[^govinfo][^ecf915]

On 6 December 2021 the jury awarded W&K $100 million on one count, conversion of intellectual property. It found for Wright on the other claims and rejected all of the estate's claims.[^ecf915]

The case is separate from [[copa-v-wright|COPA v Wright]], the 2024 English case that decided Wright is not Satoshi.
""",
 refs={"govinfo": "[https://www.govinfo.gov/app/details/USCOURTS-flsd-9_18-cv-80176 Kleiman v. Wright, 18-80176], US District Court for the Southern District of Florida (GovInfo).",
       "ecf915": "[https://storage.courtlistener.com/recap/gov.uscourts.flsd.521536/gov.uscourts.flsd.521536.915.0.pdf Dr. Craig Wright's opposition to plaintiffs' motion to compel], ECF No. 915, 20 January 2023 (summarising the verdict)."},
 see=["craig-wright", "copa-v-wright"],
),
dict(
 slug="forum-staff-board", title="Forum staff board (2009)", kind="topic", img="icon:forum",
 caption="Test topics from before the forum opened",
 cats=["Forums and lists"],
 short="Deleted test topics from the Bitcoin forum's staff area, written before it opened in November 2009.",
 featured=False, aliases=["Staff board", "SMF Config Notes"], label="forum-staff",
 info=[("Written", "November 2009 – January 2010"), ("Saved", "July 2012, as PDF files"), ("Topics", "3")],
 body="""
The '''forum staff board''' is the name used here for three test topics from the staff area of the Bitcoin forum, written while Satoshi was setting it up in November 2009, before he opened it to the public on 22 November ({{mail:bitcointalk|Welcome to the new Bitcoin forum!|his announcement}}). The topics were later deleted from the forum, and are preserved as PDF files created in July 2012 and published at bitcointalk.org/first_topics.[^ft] Times are as the forum printed them.

In “SMF Config Notes” Satoshi listed his changes to the forum software: a 12×12 coin image in place of SMF's “pip stars”, the registration page's “hide your e-mail address” box ticked by default, and the Announcements board kept to moderators ({{mail:forum-staff|SMF Config Notes|the topic}}). After Martti Malmi (sirius) switched on e-mail confirmation for new accounts in December 2009, Satoshi asked in January 2010 why: he had already customised the registration page so that spambots designed for SMF “won't be able to figure it out”, with a hidden extra parameter in the CAPTCHA address and three CAPTCHA images of which only one shows.

In “Testing the new site platform” he posted a run of replies reading only “blank”, explaining: “I have to get the number of posts up over 20 so the topic will have multiple pages” ({{mail:forum-staff|Testing the new site platform|the topic}}).
""",
 refs={"ft": "[https://bitcointalk.org/first_topics/ first_topics], bitcointalk.org: three PDF files dated 12 July 2012. Retrieved 21 October 2026."},
 see=["bitcointalk", "martti-malmi"],
),
]

DID_YOU_KNOW = [
 "... that one of Bitcoin v0.1's first crashes, which Satoshi chased by email with [[nicholas-bohm|Nicholas Bohm]], happened when a DNS lookup failed? ({{mail:nicholas-bohm|Bugfix|email}})",
 "... that Satoshi posted a string of messages reading “blank” to test page breaks on the forum before it opened? ([[forum-staff-board]])",
 "... that Satoshi's first known email, in August 2008, described the white paper under the title ''Electronic Cash Without a Trusted Third Party''? ({{mail:adam-back|Citation of your Hashcash paper|email}})",
 "... that the first public reply to the [[bitcoin-white-paper|white paper]] said it did not seem “to scale to the required size”? ({{mail:cryptography|Bitcoin P2P e-cash paper|thread|from=Donald}})",
 "... that Satoshi told [[martti-malmi|Martti Malmi]] “My writing is not that great, I'm a much better coder”?",
 "... that Satoshi asked [[laszlo-hanyecz|Laszlo Hanyecz]] to hold back on GPU mining five days before Bitcoin Pizza Day?",
 "... that the [[value-overflow-incident|value overflow bug]] created more than 184 billion bitcoins, and Satoshi fixed it the same day?",
 "... that Satoshi asked WikiLeaks ''not'' to accept bitcoin? ([[wikileaks-and-bitcoin]])",
 "... that Satoshi used three email addresses, including one at anonymousspeech.com? ([[satoshis-accounts]])",
 "... that Satoshi almost never wrote between 7 a.m. and 1 p.m. UTC? ([[writing-style]])",
 "... that the [[genesis-block|genesis block]] quotes a headline from ''The Times'' of 3 January 2009?",
 "... that the earliest known Bitcoin code was sent to just three people in November 2008? ([[pre-release-source-code]])",
 "... that Satoshi's last known email asked Gavin Andresen to stop calling him “a mysterious shadowy figure”? ([[gavin-andresen]])",
 "... that a statue of Satoshi in Lugano was stolen, thrown into the lake, and recovered? ([[monuments-to-satoshi]])",
 "... that Satoshi put two spaces after almost every full stop? ([[writing-style]])",
 "... that the day after the value overflow bug, Satoshi wrote “It looks like we overtook the bad chain”? ([[value-overflow-incident]])",
]
