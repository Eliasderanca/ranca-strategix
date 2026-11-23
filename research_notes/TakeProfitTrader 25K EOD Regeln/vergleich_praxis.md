# Take Profit Trader 25K: Classic vs new EOD plan, plus practical pitfalls (as of 23 Nov 2026)

**Method note (read first):** In this session, direct page fetches were blocked for every external host I tried: takeprofittrader.com, prnewswire.com and crosstrade.io all returned "ENOTFOUND", meaning the hosts are not on the session's allowed network list. **So the official TPT site was unreachable.** All findings below come from web-search result snippets and summaries, not from full-page reads. That includes the TPT help center (takeprofittraderhelp.zendesk.com) and the PR Newswire release. Every number needs to be checked against the live TPT site and checkout before buying. "Accessed" date for all sources: 23 Nov 2026.

## Classic 25K: price, target, drawdown, DLL, contracts, consistency, min days, PRO payout rules

### Takeaway
The classic 25K Test uses a $1,500 profit target and a $1,500 end-of-day (EOD) trailing drawdown. Max size is 3 minis or 30 micros, and a 50% best-day consistency rule applies in the Test. Most sources say 3 minimum days, but this is disputed. List price is about $150 a month, often discounted to about $90, plus a $130 PRO activation fee. In PRO, the drawdown switches to **intraday** trailing and there is no consistency rule. Payouts require clearing a buffer equal to the max drawdown, which gives a $26,500 balance on the 25K. The split is 80%, or 90% in PRO+.

### Cited Findings
- 25K Test: profit target $1,500, max loss $1,500 EOD trailing; the floor starts at $23,500 and locks at $25,000. — [CrossTrade (search summary)](https://crosstrade.io/prop-firms/take-profit-trader); [Phidias, Trailing Drawdown 2026](https://phidiaspropfirm.com/education/take-profit-trader-trailing-drawdown)
- The profit target is 6% of account size at every size. — [prop25k.com](https://www.prop25k.com/review/take-profit-trader/)
- List prices: $150/mo (25K), $170 (50K), $245 (75K), $330 (100K), $360 (150K). A promo price of $90 for the 25K (code "DGT", 40% off) is widely advertised. Test reset is about $79. — [damnpropfirms 25K plan](https://damnpropfirms.com/account-plans/take-profit-trader-test-25000/); [propscorer](https://www.propscorer.com/firms/take-profit-trader)
- Tradervana gives $150/mo for the 25K Test, "confirmed in a November 12, 2026 sale post", and a one-time $130 PRO activation fee that some promos waive. — [Tradervana](https://www.tradervana.com/guides/take-profit-trader-rules)
- Max contracts on the 25K: 3 minis / 30 micros. Larger sizes: 50K 6/60, 75K 9/90, 100K 12/120, 150K 15/150. — [prop25k.com](https://www.prop25k.com/review/take-profit-trader/); [bestprops](https://bestprops.com/rules/take-profit-trader-rules/)
- Daily loss limit: several sources say TPT has **no daily loss limit** in the Test, PRO or standard PRO+, so the trailing drawdown is the only loss limit. The exception is PRO+ "Development" live accounts, which have a soft daily stop of $500 to $2,000. — [lunefi](https://lunefi.com/blog/takeprofittrader-rules); [Phidias rules](https://phidiaspropfirm.com/education/take-profit-trader-rules). **Conflict:** the new help-center comparison is said to list a daily loss limit for the EOD plan (see next section).
- Consistency (Test only): the best day must be **below** 50% of total net profit. Breaching it does not fail the account. Instead the target rises to more than 2x the best day. Worked example: a $1,800 best day on $3,100 total is 58%, so the new goal is more than $3,600. — [TPT Help: Rule 5 Be Consistent](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170316538013-Rule-5-Be-Consistent); [QuantVPS](https://www.quantvps.com/blog/takeprofit-trader-consistency-rule)
- A "trading day" means any day with at least one trade. — [TPT Help: Rule 5](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170316538013-Rule-5-Be-Consistent)
- Minimum trading days are **disputed**: most reviews say 3, others say 5. — [QuantVPS](https://www.quantvps.com/blog/takeprofit-trader-consistency-rule); [tradetanto](https://tradetanto.com/learn/take-profit-trader-rules-what-you-need-to-know)
- PRO drawdown (Classic) is **intraday trailing**, with open profit included. Example: an open trade at +$1,000 raises the floor to $24,500 in real time. — [Phidias, Trailing Drawdown](https://phidiaspropfirm.com/education/take-profit-trader-trailing-drawdown)
- PRO has no consistency rule; the split is 80%, rising to 90% in PRO+. — [Tradervana](https://www.tradervana.com/guides/take-profit-trader-rules); [prop25k.com](https://www.prop25k.com/review/take-profit-trader/)
- PRO buffer = max drawdown, which means $26,500 on the 25K. Withdrawable profit is the amount above the buffer. — [CrossTrade (search summary)](https://crosstrade.io/prop-firms/take-profit-trader); [homedadpro](https://homedadpro.com/en/take-profit-trader-review/)
- Changelog entries dated **3 Nov 2026** (CrossTrade): "PRO max loss at $25K $2,000 → $1,500", "PRO max minis at $25K 6 → 3", and "profit target at $25K $3,000 → $1,500". — [CrossTrade](https://crosstrade.io/prop-firms/take-profit-trader). **UNCONFIRMED and internally odd:** a PRO account has no profit target, so the entries may mix up Test and PRO. No other source dates these changes.

### Inferences
- With a $1,500 target, a $1,500 EOD drawdown and the 50% rule, the realistic minimum is about 3 days with the best day under about $750. Any day above about $750 raises the required total.
- On Classic PRO, the intraday trailing plus a $26,500 buffer means you must make roughly another $1,500 before your first withdrawable dollar, while open-profit giveback can still kill the account.

### Gaps
- Exact current minimum days (3 vs 5), the Classic 25K price after the 23 Nov restructure, and whether the $130 activation fee still applies to Classic: none confirmed on the official site, which was unreachable.

## What changed with the new EOD plan (announced 23 Nov 2026)

### Takeaway
On 23 Nov 2026, TPT moved from one plan to three: **INTRADAY, CLASSIC and EOD**, each in 25K, 50K and 150K. The defining change is that EOD uses end-of-day trailing drawdown in **Test, PRO and PRO+**, so unrealized intraday profit never raises the floor. In exchange, the EOD plan has a lower PRO daily profit limit: $5,000 versus $10,000 on Intraday and Classic. The help-center summary also says EOD includes a daily loss limit. All three plans keep day-one and daily payouts in PRO, no withdrawal caps and no funded consistency rule. I found **no source** for the 25K EOD price, target or drawdown amount.

### Cited Findings
- Press release, dated 23 Nov 2026: "Take Profit Trader Launches End-of-Day Drawdown in Funded Accounts, With True Daily Payouts: Now Offers Three Plan Options". The three plans are EOD, INTRADAY and CLASSIC, each in $25K/$50K/$150K. CEO James Sixsmith is quoted: "So we built three plans, not three different rulebooks. You choose how you trade, not how you get paid." — [PR Newswire](https://www.prnewswire.com/news-releases/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options-302945604.html); syndicated copy at [ADVFN](https://uk.advfn.com/stock-market/share-news/Take-Profit-Trader-Launches-End-of-Day-Drawdown-in/99766433)
- INTRADAY is the lowest-priced plan and uses intraday drawdown at every stage. CLASSIC ("the plan TPT traders already know") uses EOD drawdown in Test and PRO+ and intraday in PRO. EOD uses EOD trailing in Test, PRO and PRO+. — [TPT Help: Classic vs EOD vs Intraday](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021); [PR Newswire](https://www.prnewswire.com/news-releases/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options-302945604.html)
- The PRO daily **profit** limit is $5,000 on EOD and $10,000 on Intraday and Classic. It applies only in PRO and is not a payout cap. — [TPT Help: Classic vs EOD vs Intraday](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)
- The EOD plan reportedly "includes a daily loss limit". The amount for the 25K was **not found**. An older third-party page gives tiers of $500/$1,000/$2,500, but it is about 557 days old and probably refers to old rules. — [TPT Help (via search summary)](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021). **UNCONFIRMED.**
- All three plans: day-one and daily payouts in PRO, no withdrawal limits, no funded consistency rule, no scaling plans, and a path to live trading in PRO+. — [TPT Help: Classic vs EOD vs Intraday](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)

### Comparison table: 25K Classic vs 25K EOD

| Item | 25K Classic: Test | 25K Classic: PRO | 25K EOD: Test | 25K EOD: PRO |
|---|---|---|---|---|
| Price | ~$150/mo list, ~$90 promo ([damnpropfirms](https://damnpropfirms.com/account-plans/take-profit-trader-test-25000/), [Tradervana](https://www.tradervana.com/guides/take-profit-trader-rules)). Post-restructure price unconfirmed | $130 one-time activation ([Tradervana](https://www.tradervana.com/guides/take-profit-trader-rules)) | **Not found**. The press release says only that INTRADAY is the cheapest, so EOD is presumably ≥ Classic (inference) | **Not found** |
| Profit target | $1,500 ([prop25k](https://www.prop25k.com/review/take-profit-trader/)) | n/a | **Not found** (likely $1,500 if the 6% rule holds; unconfirmed) | n/a |
| Drawdown amount | $1,500 ([CrossTrade](https://crosstrade.io/prop-firms/take-profit-trader)) | $1,500 (3 Nov change per [CrossTrade](https://crosstrade.io/prop-firms/take-profit-trader), unconfirmed) | **Not found** | **Not found** |
| Drawdown type | EOD trailing, locks at starting balance ([Phidias](https://phidiaspropfirm.com/education/take-profit-trader-trailing-drawdown)) | **Intraday** trailing, open P/L counts ([Phidias](https://phidiaspropfirm.com/education/take-profit-trader-trailing-drawdown); [TPT Help](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)) | EOD trailing ([TPT Help](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)) | **EOD trailing** (the key change) ([TPT Help](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)) |
| Daily loss limit | None per 3rd-party ([lunefi](https://lunefi.com/blog/takeprofittrader-rules)) | None per 3rd-party | Reportedly yes, amount unknown (unconfirmed) | Reportedly yes, amount unknown (unconfirmed) |
| Daily profit limit | n/a | $10,000 ([TPT Help](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)) | n/a | **$5,000** ([TPT Help](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)) |
| Max contracts | 3 minis / 30 micros ([prop25k](https://www.prop25k.com/review/take-profit-trader/)) | 3 minis (3 Nov change per CrossTrade, unconfirmed) | **Not found** | **Not found** |
| Consistency | 50% best-day; breach raises the target ([TPT Rule 5](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170316538013-Rule-5-Be-Consistent)) | None | Presumably same as Classic Test (unconfirmed) | None ([TPT Help](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)) |
| Min days | 3 (disputed: 5) | n/a | **Not found** | n/a |
| Buffer | n/a | = max DD, so a $26,500 balance ([CrossTrade](https://crosstrade.io/prop-firms/take-profit-trader)) | n/a | **Not found** (whether the buffer still exists on EOD PRO is unconfirmed) |
| Payout timing / split | n/a | Daily from day one, 80% (90% PRO+) | n/a | Daily from day one, no withdrawal cap ([TPT Help](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)); split not confirmed |
| Winning-day requirement for payout | None ([search summary](https://crosstrade.io/prop-firms/take-profit-trader)) | | | None found |

### Inferences
- The EOD plan removes the main Classic PRO trap, where open-profit giveback ratchets the floor up. It costs a lower daily profit ceiling of $5,000 and possibly a daily loss limit. For a 25K trader with 3 minis, a $5,000 daily cap rarely binds, so EOD PRO is likely the better fit for swing-y intraday management.
- With an EOD floor, a day that ends below the floor can still breach intraday. EOD only changes *when the floor moves up*, not whether the live balance may touch the floor. This is a common misunderstanding (inference; check the TPT wording).

### Gaps
- 25K EOD price, target, drawdown amount, max contracts, min days, buffer, daily loss limit amount and split were all not found, because the official pages were unreachable and no third-party site had updated within hours of launch.

## Platforms, data fees, EU/German eligibility, KYC

### Takeaway
Supported platforms include Tradovate, TradingView (via Tradovate), NinjaTrader, Quantower and R|Trader. Platforms are reportedly free during the Test, but CME data fees apply. Germany does not appear on any restricted-country list found, but I could not confirm this on the official list. TPT strictly bans access from restricted countries and via VPN. KYC timing is disputed: before trading or at PRO activation.

### Cited Findings
- Platforms: TradingView, NinjaTrader, Tradovate, R|Trader and Quantower, reportedly free during the Test. — [QuantVPS review](https://www.quantvps.com/prop-firms/take-profit-trader); [proptradingvibes](https://www.proptradingvibes.com/blog/takeprofittrader-trading-faqs)
- Data: the TradingView Basic plan has delayed data, so real-time needs a paid plan (one guide cites about $15/mo). CME data is quoted at "$50–80/month" by one guide; another mentions Rithmic L2 pricing. Figures are inconsistent. — [proptradingvibes](https://www.proptradingvibes.com/blog/takeprofittrader-trading-faqs); [pickmytrade](https://pickmytrade.trade/prop-firm-faq/take-profit-trader-faq/)
- Restricted country counts vary: 116, about 127 (help center, 25 Aug 2026), or 119 (17 Oct 2026). Several EU states are listed: Romania, Bulgaria, Croatia, Slovenia and Malta. One low-authority site states Germany, France and Spain have full access. — [surgefunded](https://www.surgefunded.com/take-profit-trader-supported-and-restricted-countries/); [damnpropfirms](https://damnpropfirms.com/futures-prop-firms/take-profit-trader/)
- Any activity from a restricted country, even viewing data, is a violation. VPNs, remote connections and shared networks routed through restricted countries are prohibited. — [surgefunded](https://www.surgefunded.com/take-profit-trader-supported-and-restricted-countries/)
- KYC: required either before trading or at PRO activation (sources conflict). It needs a government ID, proof of address from the last 3 months, and an international-format phone number. — [proptraderz](https://www.proptraderz.com/prop-firms/takeprofittrader/); [quantvps](https://www.quantvps.com/prop-firms/take-profit-trader)
- One BBB complaint describes a payout blocked for 10+ days over **tax-form verification**. Relevant for non-US traders, who usually need a W-8BEN (anecdotal). — [BBB](https://www.bbb.org/us/fl/windermere/profile/financial-services/takeprofittrader-0733-235965089/complaints?page=6)

### Inferences
- For a German resident, the main risks are not eligibility but (a) traveling to a restricted country or using a VPN or remote server routed there, and (b) document mismatches at KYC or tax-form stage.

### Gaps
- Official restricted-country list (unreachable); exact current Tradovate/CME non-professional data fee via TPT; whether TradingView needs a paid plan when connected through Tradovate.

## December 2026 holiday hours (CME) and TPT flat/holiday/news rules, in Europe/Berlin time

### Takeaway
In December 2026 the offset is ET + 6h and CT + 7h. US DST ends 1 Nov 2026 and EU DST ends 25 Oct 2026. TPT auto-flattens at about 4:55 PM ET (**22:55 Berlin**); one FAQ says 4:59 PM ET. The real December risk is **Christmas Eve, Thursday 24 Dec**, when equity futures close early. Sources disagree on the time: 12:00 CT (**19:00 Berlin**) or 12:15 CT (**19:15 Berlin**). TPT says traders must monitor holiday hours themselves and that missing an early close means liquidation. Fri 25 Dec and Fri 1 Jan are closed.

### Cited Findings
- CME holiday windows: Christmas 24–26 Dec 2026; New Year 31 Dec 2026 – 1/2 Jan 2027. — [CME Group Holiday and Trading Hours](https://www.cmegroup.com/trading-hours.html)
- Christmas Eve (Thu 24 Dec 2026) equity index early close: 12:15 CT / 13:15 ET per one source, 12:00 CT / 13:00 ET per another (**conflict**). Christmas Day is closed; Globex reopens Sun 27 Dec at 17:00 CT. — [CrossTrade CME hours 2026](https://crosstrade.io/blog/cme-trading-hours-2026); [marketframework](https://www.marketframework.com/tools/futures-holiday-hours); [tradesearcher](https://tradesearcher.ai/tools/futures-trading-hours)
- New Year's Eve (Thu 31 Dec) is reportedly a regular close at 16:00 CT; New Year's Day is closed; trading reopens Sun 3 Jan 2027 at 17:00 CT. — [marketframework](https://www.marketframework.com/tools/futures-holiday-hours); [CME](https://www.cmegroup.com/trading-hours.html)
- TPT auto-flat: 4:55 PM ET per most sources (FundedSim: 3:55 PM CT), 4:59 PM ET per one FAQ. Previously, failing to be flat by 5 PM ET failed the account. — [fundedsim](https://fundedsim.com/en/guides/overnight-and-swing-trading); [pickmytrade](https://pickmytrade.trade/prop-firm-faq/take-profit-trader-faq/); [propfirmmike](https://propfirmmike.com/take-profit-trader-quietly-changed-this-rule/)
- If your product closes earlier than the cutoff, you must be out before that close. Monitoring holiday-adjusted hours is the trader's responsibility, and missing a holiday close still results in liquidation. — [mytradingbuddy](https://mytradingbuddy.ai/blog/take-profit-trader-rules); [Phidias explained](https://phidiaspropfirm.com/education/take-profit-trader-explained)
- News rule (PRO): flat with no working orders from 1 minute before to 1 minute after FOMC statements (2:00 PM ET), NFP (8:30 AM ET) and CPI. Some product-specific events are also listed. Sources conflict on whether it applies in the Test; one FAQ says news trading is allowed at all stages. — [bestprops](https://bestprops.com/rules/take-profit-trader-rules/); [pickmytrade](https://pickmytrade.trade/prop-firm-faq/take-profit-trader-faq/)

### Berlin time conversion (Dec 2026, CET = UTC+1; ET = UTC−5; CT = UTC−6)
| Event | US time | Berlin |
|---|---|---|
| TPT daily auto-flat | 4:55 PM ET (3:55 PM CT) | 22:55 (22:59 if 4:59 ET) |
| CME daily maintenance halt | 4:00–5:00 PM CT | 23:00–00:00 |
| Christmas Eve early close (equities), Thu 24 Dec | 12:00 or 12:15 CT | 19:00 or 19:15 (be flat well before) |
| Globex reopen after Christmas | Sun 27 Dec 5:00 PM CT | Mon 28 Dec 00:00 |
| New Year's Eve close, Thu 31 Dec | 4:00 PM CT (regular), but TPT flat 4:55 ET | 22:55 |
| Reopen after New Year | Sun 3 Jan 5:00 PM CT | Mon 4 Jan 00:00 |
| News window (NFP) | 8:29–8:31 AM ET | 14:29–14:31 |
| News window (FOMC statement) | 1:59–2:01 PM ET | 19:59–20:01 |

### Inferences
- On 24 Dec, an equity-index trader in Berlin must be flat before about 19:00 local, not 22:55. This is the single most likely December rule breach.
- On an EOD-drawdown plan, short holiday sessions still count as "trading days" if you trade. Thin liquidity around 24–31 Dec raises slippage risk against a fixed $1,500 cushion.

### Gaps
- Official CME session times for 24 Dec 2026 (the cmegroup.com page could not be fetched). Exact December 2026 FOMC, NFP and CPI dates were not researched or sourced: verify on the Fed/BLS calendars. Whether TPT publishes its own December holiday notice, and whether a half-day counts toward minimum days, is unknown.

## Common pitfalls and violations reported by traders (anecdotal)

### Takeaway
The recurring problems are these:
- Misreading the Test consistency rule: a breach does not fail the account, but it silently raises the target.
- The Classic PRO intraday trailing floor wiping out accounts on open-profit giveback.
- Payout friction: buffer, tax-form or KYC holds.
- Rule-flag terminations: counter-positions or hedging across accounts, and "coordinated activity".
- Holiday early closes.
- Slow support.
Review platforms broadly report fast payouts, but with notable complaint clusters.

### Cited Findings
- Consistency: traders keep trading after a big day without realizing the goal moved. The help center says "below 50%" while the homepage says "cannot be more than 50%", so treat exactly 50% as a miss. One guide recommends a daily profit cap per account. — [QuantVPS consistency guide](https://www.quantvps.com/blog/takeprofit-trader-consistency-rule); [tradetanto](https://tradetanto.com/learn/take-profit-trader-rules-what-you-need-to-know)
- Payout disputes cluster around profit sitting inside the buffer, withdrawals declined during the move to PRO+, and profits forfeited after counter-position or risk findings. There are also "coordinated activity" bans. (Anecdotal.) — [Phidias, complaints analysis (competitor, biased)](https://phidiaspropfirm.com/education/take-profit-trader-review); [propfirmgrades](https://propfirmgrades.com/reviews/take-profit-trader)
- One aggregator estimates about 2.5% of reviews report denied, cancelled or late payouts. A competitor's analysis puts payout issues at 25% of one-star reviews and trailing drawdown at 5%. — [propfirmgrades](https://propfirmgrades.com/reviews/take-profit-trader); [Phidias](https://phidiaspropfirm.com/education/take-profit-trader-review)
- Ratings: 3.3★ from 22 verified reviews on PropFirmMatch, against a much higher Trustpilot rating from about 4,584 reviews. Positive Trustpilot reviews describe payouts within about a day. Complaints mention slow support. — [PropFirmMatch reviews](https://propfirmmatch.com/futures/prop-firms/take-profit-trader/reviews); [Trustpilot](https://ie.trustpilot.com/review/takeprofittrader.com?page=8)
- BBB complaints: a payout blocked for 10+ days over tax-form verification, and an available-for-withdrawal amount that did not match the balance. — [BBB](https://www.bbb.org/us/fl/windermere/profile/financial-services/takeprofittrader-0733-235965089/complaints?page=6)
- Holiday close: missing a holiday-adjusted close still means liquidation. — [Phidias explained](https://phidiaspropfirm.com/education/take-profit-trader-explained)

### Inferences (practical checklist for a German EOD-25K trader in Dec 2026)
1. Keep the best day under about 45% of the running total in the Test, to avoid a moving target.
2. Even on an EOD plan, the *live* balance can still hit the floor intraday. Size for 3 minis or 30 micros at most against a $1,500 cushion, assuming EOD 25K keeps these numbers (unconfirmed).
3. Find out whether the EOD plan's daily loss limit exists and how big it is before trading.
4. Set platform alarms for 22:50 Berlin daily and about 18:45 Berlin on 24 Dec. Do not hold positions into 24/25 Dec or 31 Dec/1 Jan.
5. Flatten and cancel all working orders, including brackets, around NFP, FOMC and CPI in PRO. Dates must be confirmed separately.
6. Never trade via VPN or remote servers, or while traveling to a restricted country. Make sure KYC documents and tax form (W-8BEN) names and addresses match exactly.
7. Do not run opposite positions across multiple TPT accounts, since counter-position flags have led to forfeited profit.

### Gaps
- No Reddit threads surfaced in search, so Reddit-specific anecdotes are not covered. No YouTube or user reports yet exist on the EOD plan launched today.
