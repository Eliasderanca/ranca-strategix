# Take Profit Trader (TPT) – 25K EOD Plan: Test (Evaluation) Rules & Pricing

Research date: 2026-11-23. **Important access caveat:** WebFetch was blocked by this session's network allowlist for every host tried (takeprofittrader.com, takeprofittraderhelp.zendesk.com, prnewswire.com, phidiaspropfirm.com). All findings below come from web-search result snippets/summaries, NOT full page reads. Official TPT pages (homepage, help center on Zendesk) were seen only as search snippets. Every number must be re-verified on takeprofittrader.com / the help center before being used as rule-engine config. To fetch directly, the hosts `takeprofittrader.com` and `takeprofittraderhelp.zendesk.com` need to be allowed in the session network settings.

Abbreviations: DD = drawdown, DLL = daily loss limit, ET = US Eastern Time.

## 1. Plan name, launch date, available sizes

### Takeaway
TPT now sells three plans, "Intraday", "Classic" and "EOD". The press release dated 23 Nov 2026 announced EOD drawdown for funded PRO accounts and the three-plan structure. The EOD plan uses end-of-day trailing drawdown in Test, PRO and PRO+ and is the only plan with a daily loss limit. A secondary source lists EOD DLL tiers for 25K / 50K / 150K. Full EOD size availability is not confirmed.

### Cited Findings
- Press release headline: "Take Profit Trader Launches End-of-Day Drawdown in Funded Accounts, With True Daily Payouts: Now Offers Three Plan Options". Search summary dates it 23 Nov 2026. CEO James Sixsmith says the three plans share the same rulebook and differ in drawdown style — [PR Newswire](https://www.prnewswire.com/news-releases/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options-302945604.html); syndicated copy [middletownlifemagazine](https://lifestyle.middletownlifemagazine.com/story/855918/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options/) (both snippet only)
- Release: every plan has daily withdrawals from day 1 in PRO, no withdrawal cap, no scaling plan, and no funded consistency rule. The **50% consistency rule applies in the Test only** — [same release, via search summary](https://lifestyle.middletownlifemagazine.com/story/855918/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options/)
- Official homepage snippet lists the plans **Intraday, Classic, EOD**. Intraday PRO+ uses intraday DD. Classic and EOD PRO+ use EOD DD — [takeprofittrader.com](https://takeprofittrader.com/) (snippet)
- Official help article "Classic vs. EOD vs. Intraday: Which Plan Is Right for You?": the EOD plan has **end-of-day trailing DD across Test, PRO and PRO+**, so unrealized intraday profit never moves the DD at any stage. EOD **includes a daily loss limit**. Classic and Intraday have none. The EOD PRO daily profit limit is $5,000, versus $10,000 for Intraday and Classic — [TPT Help Center](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You) (snippet)
- The propfirmmatch directory lists an "EOD" plan DLL of $500 / $1,000 / $2,500 for 25K / 50K / 150K, with plans dated from Nov 23, 2026 — [propfirmmatch](https://propfirmmatch.com/futures/prop-firms/take-profit-trader) (snippet, secondary). One search summary also called this page "~557 days old", so it may mix in old data.

### Inferences
- The likely official plan name is simply "EOD" (marketing: "End-of-Day Drawdown"). Older accounts (pre-23 Nov) correspond to "Classic" or "Intraday". Classic = EOD DD in Test, historically intraday in PRO.
- The 25K size probably exists for EOD (propfirmmatch's 25K DLL tier, and the homepage example with a $500 DLL). Availability of 75K and 100K EOD is unknown.

### Gaps
- No full-text official launch post read. The exact list of EOD sizes is unconfirmed.

## 2. Price (monthly fee, promo, reset, activation)

### Takeaway
The official homepage snippet shows **EOD at $160.00/mo** (Classic $150/mo), most likely for the default or smallest (25K) size, with an **EOD Test reset of $89**. The activation fee for classic plans has been $130 one-time, with frequent promo codes waiving it. EOD-specific activation and promos are unconfirmed.

### Cited Findings
- Homepage: "EOD … $160.00 /mo", described as for traders who want end-of-day flexibility with a fixed daily loss limit. The sample EOD card shows Drawdown $1,000, DLL $500, max 3 minis / 30 micros, **Test reset $89** — [takeprofittrader.com](https://takeprofittrader.com/) (snippet). The size this card represents is not stated in the snippet.
- Homepage: Classic $150/mo. The Intraday reset is $59 (Intraday monthly price not captured) — [takeprofittrader.com](https://takeprofittrader.com/) (snippet)
- Older or classic third-party pricing for Test $25K / 50K / 75K / 100K / 150K: $150 / $170 / $245 / $330 / $360 per month. Resets: $79 / $99 / $139 / $169 / $199. Activation fee: $130 one-time when moving to PRO — [mrtrader.io](https://mrtrader.io/prop-firms/takeprofittrader), [damnpropfirms](https://damnpropfirms.com/futures-prop-firms/take-profit-trader/) (secondary, pre-EOD-plan)
- Promos reported by third parties: code NOFEE40, 40% off and no activation fee for life. Another reports 50% off until 25 Aug 2026, then a permanent 40% — [search summary of eltraderfinanciado / velotrade etc.](https://www.eltraderfinanciado.com/en/review/takeprofittrader) (secondary, unverified)
- One site quotes the 25K at $150/mo, "verified 14 November 2026" (classic plan) — [propfirm.compare](https://propfirm.compare/propfirm/take-profit-trader) (secondary)

### Inferences
- If the $160 card is the 25K size, the EOD 25K costs $10/mo more than Classic 25K ($150) and its reset is $10 more ($89 vs $79).

### Gaps
- EOD prices for the other sizes, the EOD activation fee, and whether the $160/$89 card is 25K: all unconfirmed.

## 3. Profit target

### Takeaway
25K Test target = **$1,500**. This figure is consistent across secondary sources for the classic Test. It is not explicitly confirmed for the EOD plan.

### Cited Findings
- 25K Test profit target $1,500 (6%) — [crosstrade](https://crosstrade.io/blog/take-profit-trader), [copilink (Nov 2026)](https://copilink.com/prop-firms/take-profit-trader), [prop25k](https://www.prop25k.com/review/take-profit-trader/)
- A change tracker logs a 3 Nov 2026 change for the 25K: target $3,000 → $1,500 and max loss $2,000 → $1,500. Older $3,000 figures are outdated — [crosstrade](https://crosstrade.io/prop-firms/take-profit-trader) (secondary; labeled "PRO 25K", likely means the Test)

### Gaps
- No official EOD-plan 25K target seen.

## 4. Max drawdown – amount and mechanics

### Takeaway
Official Rule 3 says the Test DD is **end-of-day trailing**. It is checked only at the close of the trading day, not during open trades, and trails the highest EOD balance. Secondary sources say it **stops trailing at the starting balance**. For the classic 25K Test, the DD is $1,500 (floor $23,500). The **new EOD-plan card shows a $1,000 DD** (paired with the $500 DLL). This conflict is unresolved.

### Cited Findings
- Official "Rule 3: Do Not Hit End-Of-Day (EOD) Maximum Trailing Drawdown": for Test accounts, DD is checked **only at the close of the trading day**, not during open trades. The minimum balance trails the highest end-of-day balance. The example uses a $25,000 account with a $1,500 trailing DD — [TPT Help Center Rule 3](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170265979165-Rule-3-Do-Not-Hit-End-Of-Day-EOD-Maximum-Trailing-Drawdown) (snippet)
- Classic 25K Test: $1,500 EOD trailing. The floor starts at $23,500, trails the highest EOD balance, and **stops once it reaches the starting balance ($25,000)** — [propfirmgrade](https://propfirmgrade.com/firms/take-profit-trader/), [crosstrade](https://crosstrade.io/blog/take-profit-trader) (secondary)
- EOD-plan homepage card: Drawdown **$1,000** — [takeprofittrader.com](https://takeprofittrader.com/) (snippet; size not confirmed)
- PRO+ rule text (official): the account balance **including open positions** must not reach or exceed the max EOD DD limit — [PRO+ Account Rules](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172006753821-PRO-Account-Rules) (snippet). Contrast this with the Test Rule 3 wording ("not during open trades").
- The EOD update time is the end of the trading day, 5 PM ET — [bestprops](https://bestprops.com/rules/take-profit-trader-rules/) (secondary)

### Inferences
- Rule engine suggestion (Test): `dd_type = trailing_eod`, `dd_basis = closing balance at 17:00 ET`. Check the breach on the EOD close only, per Rule 3. Floor = max(EOD high-water mark) − DD amount, capped at the start balance (lock at $25,000 once the EOD high reaches $26,500 with a $1,500 DD, or $26,000 with a $1,000 DD).
- DD amount: use $1,500 if the EOD 25K matches classic. If the homepage card is 25K EOD, the DD may be $1,000. **Flag for manual verification.**

### Gaps
- Official EOD 25K DD amount, and whether the new EOD plan's Test checks the floor intraday (PRO+ wording suggests yes for open positions, Test Rule 3 says no).

## 5. Daily loss limit

### Takeaway
The EOD plan is the only TPT plan with a DLL. The 25K DLL is reportedly **$500**. One secondary source says it is a **soft breach (day stops) if the balance stays at or above the starting balance, and a hard breach (account fails) if below**. Classic and Intraday Tests have no DLL.

### Cited Findings
- EOD plan includes a DLL. Classic and Intraday have none — [TPT Help Center plan comparison](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You) (snippet)
- Homepage EOD card: DLL **$500** — [takeprofittrader.com](https://takeprofittrader.com/) (snippet)
- EOD DLL $500 / $1,000 / $2,500 (25K / 50K / 150K). Soft breach if the balance stays at or above the starting balance, hard breach if below — [propfirmmatch](https://propfirmmatch.com/futures/prop-firms/take-profit-trader) (secondary, only source for soft/hard semantics)
- Help center snippet: PRO+ Development accounts have a soft/hard breach DLL. Legacy PRO+ Development keeps soft-only. An article titled "Daily Loss Limit (DLL): Soft Breach vs. Hard Breach" exists but was not readable — [TPT Help Center](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You) (snippet)
- Contradiction: many reviews say TPT has "no daily loss limit". These describe Classic and older plans — [propvator](https://propvator.com/blog/take-profit-trader-daily-loss-limit/), [proptraderz](https://www.proptraderz.com/prop-firms/takeprofittrader/), [dealpropfirm](https://dealpropfirm.com/prop-firms/take-profit-trader)

### Inferences
- Rule engine suggestion: `dll = 500`. Mode is hybrid: soft (stop trading for the day) while the balance ≥ $25,000, hard (fail) if the DLL hit leaves the balance < $25,000. Unconfirmed: whether the DLL is measured on realized P&L or realized plus unrealized, and whether it is relative to the prior EOD balance.

### Gaps
- Official DLL soft/hard mechanics and the measurement basis for the EOD Test.

## 6. Max position size

### Takeaway
3 minis / 30 micros (25K). This holds for both the EOD card and the classic 25K. No scaling plan.

### Cited Findings
- EOD card: max 3 mini / 30 micro contracts — [takeprofittrader.com](https://takeprofittrader.com/) (snippet)
- Classic 25K: 3 contracts / 30 micros — [crosstrade](https://crosstrade.io/blog/take-profit-trader) (secondary)
- No scaling plan on any plan — [press release via syndication](https://lifestyle.middletownlifemagazine.com/story/855918/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options/)

### Gaps
- None material beyond the 25K-size confirmation of the card.

## 7. Consistency rule (Test)

### Takeaway
50%: the best single day may be at most 50% of total net profit. It applies in the Test only and is stated in the official 23 Nov release for all plans. A breach does not fail the account; the effective target rises.

### Cited Findings
- "50% consistency requirement applies in the Test only", with no funded consistency rule — [press release (syndicated)](https://lifestyle.middletownlifemagazine.com/story/855918/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options/)
- Calculation: highest profit day ÷ total net P&L ≤ 50%. If exceeded, the target rises until the best day fits, i.e. required profit = best day × 2 — [crosstrade](https://crosstrade.io/blog/take-profit-trader), [quantvps](https://www.quantvps.com/blog/takeprofit-trader-consistency-rule) (secondary; Phidias says "net P/L × 2")

### Inferences
- Rule engine: `pass_condition = net_pnl >= max(1500, 2 * best_day_pnl)`.

### Gaps
- Official wording on whether "best day" means best day net P&L (most likely).

## 8. Minimum trading days

### Takeaway
Conflicting: 3 days (crosstrade, proptraderz, copilink-era Nov 2026 sources) vs 5 days (tradetanto, phidias, h2t, lunefi, propvator). No official confirmation for EOD.

### Cited Findings
- 3 days — [crosstrade](https://crosstrade.io/blog/take-profit-trader), [proptraderz](https://www.proptraderz.com/prop-firms/takeprofittrader/)
- 5 days — [tradetanto](https://tradetanto.com/learn/take-profit-trader-rules-what-you-need-to-know), [lunefi](https://lunefi.com/blog/takeprofittrader-rules), [propvator](https://propvator.com/blog/take-profit-trader-consistency-rule/)

### Inferences
- The 50% consistency rule already implies a minimum of 2 profitable days. Configure the min-days value as editable and verify it.

### Gaps
- Official minimum days for the EOD Test.

## 9. News, products, hours, flat time, overnight

### Takeaway
No news restriction in the Test. Funded accounts must be flat 1 min before and after listed events. Intraday only, with no overnight or weekend holding. Flat-by time is cited as 4:55 PM ET (auto-flatten) or 4:59 PM ET, with the session ending at 5 PM ET. **Europe/Berlin on 23 Nov 2026:** ET = UTC−5 and CET = UTC+1, so +6 h. 4:55 PM ET = **22:55 Berlin**, 4:59 PM ET = **22:59**, 5 PM ET = **23:00**, and the 6 PM ET session open = **00:00**. In the US/EU DST mismatch weeks (mid-March to late March, late Oct to early Nov) the offset is +5 h.

### Cited Findings
- Official TPT blog: once funded (PRO and PRO+), the trader must be flat with no open orders 1 minute before, during and 1 minute after prohibited news. The list is in the dashboard calendar. The Test has no news restriction — [TPT blog "How to trade news"](https://takeprofittrader.com/blog/how-to-trade-news) (snippet)
- Trading day 6 PM–5 PM ET, Mon–Fri. Auto-flatten at 4:55 PM ET — [bestprops](https://bestprops.com/rules/take-profit-trader-rules/) and others; 4:59 PM ET deadline — [tradecovex](https://tradecovex.com/guides/take-profit-trader-rules-2026), [pickmytrade](https://pickmytrade.trade/prop-firm-faq/take-profit-trader-faq/) (secondary, conflicting)

### Gaps
- Official flat time for the EOD plan. The allowed product list (CME-group futures assumed; not confirmed in this research).

## 10. Inactivity, platforms, data fees

### Takeaway
Platforms run via CQG (TradingView, NinjaTrader, Tradovate, free during the Test) and Rithmic (Bookmap, MultiCharts, etc.). Data fees during the Test are reportedly included or free for the main platforms. No Test inactivity rule was found. PRO+ requires at least 1 trading day per calendar week.

### Cited Findings
- TPT table: TradingView*, NinjaTrader and Tradovate on CQG, free during the Test. Bookmap and MultiCharts on Rithmic. About 14 platforms in total — [TPT crunch.help "available platforms"](https://takeprofittrader.crunch.help/connection-instructions-important/available-platforms) (snippet)
- PRO+: trade at least one day per calendar week to stay active — [PRO+ Account Rules](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172006753821-PRO-Account-Rules) (snippet)
- Rithmic CME data $55–75/mo (single undated secondary) — [ptv-dev](https://ptv-dev.pages.dev/blog/takeprofittrader-data-feed-cost)

### Gaps
- Test inactivity rule, and the data fee in PRO for the EOD plan.

## 11. Differences: new EOD plan vs classic 25K Test

### Takeaway
In the Test, both use EOD trailing DD and 50% consistency. The EOD plan adds a DLL ($500 on 25K, soft/hard), costs more ($160 vs $150/mo; reset $89 vs $79), may have a smaller DD ($1,000 per the homepage card vs $1,500), and keeps EOD DD in PRO with a $5k PRO daily profit cap (vs $10k). Classic moves to intraday DD in PRO.

### Cited Findings
- See sections 2, 4 and 5. Plan comparison — [TPT Help Center](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You); homepage — [takeprofittrader.com](https://takeprofittrader.com/); classic PRO intraday — [phidias](https://phidiaspropfirm.com/education/take-profit-trader-trailing-drawdown)

### Gaps
- An official side-by-side table for the 25K EOD Test was not readable. No YouTube or Reddit corroboration was checked.
