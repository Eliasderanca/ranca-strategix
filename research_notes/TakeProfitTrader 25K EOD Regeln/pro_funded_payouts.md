# Take Profit Trader 25K EOD Plan: PRO / PRO+ Funded Rules and Payout Mechanics (as of 23 Nov 2026)

> **Method and reliability note (read first):** None of the source pages could be opened from this network. Fetches of takeprofittrader.com, takeprofittraderhelp.zendesk.com, prnewswire.com, quantvps.com and crosstrade.io all failed with DNS errors (hosts not in the session's allowed network domains). Every finding below comes from **web-search result summaries**, not from reading the full pages. Treat all numbers as "reported", and confirm them in the official Help Center or Control Center before they go into production config.
> Source dates: "Help Center, 23 Nov 2026" means the search tool reported the article as 0 days old on 23 Nov 2026. Third-party pages range from about 8 to 557 days old.
> Labels used: **[NEW-EOD]** = rule stated for the new EOD plan launched 23 Nov 2026. **[ALL-NEW]** = stated for all three new plans. **[LEGACY/CLASSIC]** = older rule or Classic plan. **[UNCONFIRMED]** = only one source, conflicting sources, or inferred.

## 1. Plan launch context and the EOD plan's PRO account setup (activation fee, monthly fee, starting balance, drawdown)

### Takeaway
On 23 Nov 2026 TPT launched three plans: INTRADAY, CLASSIC and EOD. The EOD plan's distinguishing feature is **end-of-day trailing drawdown in the funded PRO stage**. Under the older and Classic structure, PRO used intraday trailing drawdown. The PRO activation fee is reported as a one-time $130 and there is no monthly fee in PRO. The specific EOD 25K PRO drawdown figure is not firmly confirmed: the homepage reportedly shows $1,000 for EOD, against $1,500 on Classic and legacy.

### Cited Findings
- Press release, dated 23 Nov 2026, titled "Take Profit Trader Launches End-of-Day Drawdown in Funded Accounts, With True Daily Payouts: Now Offers Three Plan Options". It describes three plans with one shared rulebook. — [PR Newswire, 23 Nov 2026](https://www.prnewswire.com/news-releases/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options-302945604.html); syndicated at [ADVFN](https://uk.advfn.com/stock-market/share-news/Take-Profit-Trader-Launches-End-of-Day-Drawdown-in/99766433)
- **INTRADAY** is the lowest-priced plan and uses intraday drawdown at every stage. **CLASSIC** is "built on the plan TPT traders already know" and uses EOD drawdown in Test and PRO+ but **intraday drawdown in PRO**. By the headline and plan naming, the **EOD** plan brings EOD drawdown into PRO. — [PR Newswire, 23 Nov 2026](https://www.prnewswire.com/news-releases/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options-302945604.html)
- The official Help Center article "Classic vs. EOD vs. Intraday: Which Plan Is Right for You?" says the three plans began on 23 Nov 2026. — [TPT Help Center, 23 Nov 2026](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)
- [NEW-EOD][UNCONFIRMED] A snapshot of the TPT homepage, as summarised by the search tool, shows the EOD column for 25K with **"Drawdown Amount $1,000"** and **"Daily Loss Limit $500"**, and describes the EOD tier as offering a fixed daily loss limit. It also refers to a separate "PRO EOD" tier with EOD drawdown and a $1,000 drawdown amount. — [takeprofittrader.com (search snapshot, Nov 2026)](https://takeprofittrader.com/)
- [LEGACY/CLASSIC] The 25K drawdown is $1,500. It is EOD trailing in the Test and becomes **intraday trailing in PRO**, where open profit raises the floor. Example: the minimum balance starts at $23,500, and $1,000 of open profit lifts it to $24,500. — [proptradingstat.com](https://proptradingstat.com/take-profit-trader-rules-payouts); [tradervana.com](https://www.tradervana.com/guides/take-profit-trader-rules)
- [LEGACY][UNCONFIRMED] A page dated 3 Nov 2026 lists a PRO max-loss change for 25K from "$2,000 → $1,500". — reported in search summary via [copilink.com (Nov 2026)](https://copilink.com/prop-firms/take-profit-trader)
- **Activation fee:** a one-time **$130** paid when a passed Test is moved to PRO. Promo codes sometimes waive it. — [tradervana.com](https://www.tradervana.com/guides/take-profit-trader-rules); [damnpropfirms.com](https://damnpropfirms.com/futures-prop-firms/take-profit-trader/)
- **Monthly fee in PRO:** none. The subscription ends once the trader is funded. — reported in search summary of [traderfuel.net](https://traderfuel.net/prop-firms/take-profit-trader-review/) / [blog.traderspost.io](https://blog.traderspost.io/article/take-profit-trader-pricing-evaluation-guide)
- [LEGACY] The 25K **Test** costs $150/month, with a $1,500 profit target and a 3 mini / 30 micro limit. — [prop25k.com](https://www.prop25k.com/review/take-profit-trader/); [proptradingstat.com](https://proptradingstat.com/take-profit-trader-rules-payouts)

### Inferences
- PRO starts at the account's nominal balance, $25,000. All sources compute the buffer and floor from $25,000, so the start balance is not reset after the Test.
- If the EOD 25K drawdown really is $1,000, the initial PRO floor is $24,000 (EOD, trailing on closing balance). Under Classic or legacy rules it is $23,500 intraday. Config should parameterise `drawdown_amount` per plan and not hard-code $1,500.
- The $130 activation fee is a legacy figure. No source says it changed with the new plans, but none confirms it for EOD specifically either.

### Gaps
- Whether the PRO drawdown on the EOD plan **locks** (stops trailing) and at what level, for example at the starting balance or start + $100. Sources only confirm that the Test EOD drawdown stops at the starting balance. No PRO-EOD lock rule was found.
- The EOD 25K Test price and whether the EOD plan's activation fee differs. No source found.
- The official full EOD plan table could not be read (Help Center unreachable).

## 2. PRO drawdown (amount, EOD vs intraday, lock, buffer)

### Takeaway
EOD plan: EOD trailing drawdown in PRO (headline of the launch). The amount for 25K is reported as $1,000 but is unconfirmed. Classic, Intraday and legacy: intraday trailing in PRO, $1,500 for 25K. A buffer must be built before withdrawals. The legacy 25K buffer is $26,500 (start + drawdown). The current Help Center reportedly lists $26,000 for 25K and $26,500 only as legacy. $26,000 would be consistent with a $1,000 drawdown.

### Cited Findings
- [NEW-EOD] "End-of-Day Drawdown in Funded Accounts" is the launch headline. — [PR Newswire, 23 Nov 2026](https://www.prnewswire.com/news-releases/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options-302945604.html)
- Buffer concept: PRO withdrawals are only allowed on profit above a buffer equal to the account's drawdown (start + drawdown). Profit above the buffer can be withdrawn at an 80% split. — [TPT FAQ landing page](https://try.takeprofittrader.com/nf100-1125-TPT-FAQs); [proptradingstat.com](https://proptradingstat.com/take-profit-trader-rules-payouts)
- The official Help Center article "PRO Account Profit Split & Withdrawal Rules" (about 45 days old, so about early Oct 2026) reportedly lists **$26,000** as the 25K buffer and $26,500 as the **legacy**-account figure. — [TPT Help Center](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172219527581-PRO-Account-Profit-Split-Withdrawal-Rules); contradicted by third-party guides listing $26,500 ([crosstrade.io](https://crosstrade.io/prop-firms/take-profit-trader); [quantvps.com](https://www.quantvps.com/blog/takeprofit-trader-payout-rules))
- Profit inside the buffer zone can only be withdrawn **after the PRO account is closed/terminated**, at **50%**. One source says this flat 50% replaced an earlier rule: 50% if 60 or fewer trading days, 80% after that. — [TPT Help Center](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172219527581-PRO-Account-Profit-Split-Withdrawal-Rules); [rbtrading.site](https://rbtrading.site/prop-firms/take-profit-trader-rules); older 50/80 rule via [blog.traderspost.io](https://blog.traderspost.io/article/take-profit-trader-review)
- [LEGACY/CLASSIC] PRO drawdown is intraday trailing and open profit counts. — [proptradingstat.com](https://proptradingstat.com/take-profit-trader-rules-payouts); [bestprops.com](https://bestprops.com/rules/take-profit-trader-rules/)

### Inferences
- Suggested config for the EOD 25K, pending confirmation: `start_balance=25000`, `dd_type=EOD_trailing`, `dd_amount=1000`, `buffer_balance=26000`, `withdrawable = max(0, balance - buffer_balance)`. Legacy/Classic: `dd_type=intraday_trailing`, `dd_amount=1500`, `buffer=26500`.
- Whether a withdrawal lowers the balance below the buffer or affects the drawdown is not documented. The buffer model implies that you can only withdraw down to the buffer, so the drawdown floor is not hit by a withdrawal.

### Gaps
- Whether the EOD-plan buffer equals the EOD drawdown ($1,000) or keeps a fixed figure. Not confirmed directly for EOD.
- The lock level of the PRO trailing drawdown on any plan.

## 3. Daily loss limit in PRO

### Takeaway
This is the clearest difference for the EOD plan. The official Help Center says the **EOD plan includes a daily loss limit**, while Intraday and Classic have none. The homepage snapshot shows **$500 for 25K EOD**. Hard vs soft behaviour for the standard EOD PRO is not confirmed.

### Cited Findings
- [NEW-EOD] The EOD plan "includes a daily loss limit, which the other two lack". — [TPT Help Center, 23 Nov 2026](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)
- [NEW-EOD][UNCONFIRMED] Homepage EOD column: 25K Daily Loss Limit **$500**. — [takeprofittrader.com (search snapshot)](https://takeprofittrader.com/)
- [UNCONFIRMED, possibly an older EOD variant] EOD plan DLL of $500 / $1,000 / $2,500 by size. **Soft breach** if the balance stays at or above the starting balance, **hard breach** if below. — older page (about 557 days old per search) via [propfirmmatch.com](https://propfirmmatch.com/futures/prop-firms/take-profit-trader)
- PRO+ Development accounts, on any plan, have a soft/hard-breach DLL. Legacy PRO+ Development accounts keep a soft-breach DLL only. — [TPT Help Center, 23 Nov 2026](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)
- [LEGACY/CLASSIC] No DLL on Test, PRO or PRO+. The DLL was removed for new Test and PRO accounts in Jan 2025. — [propvator.com](https://propvator.com/blog/take-profit-trader-daily-loss-limit/); [quantvps.com](https://www.quantvps.com/blog/takeprofit-trader-daily-loss-limit); [dealpropfirm.com](https://dealpropfirm.com/prop-firms/take-profit-trader)

### Inferences
- The likely EOD 25K PRO DLL is $500. The soft/hard model (soft = trading paused for the day while balance ≥ start; hard = account fails while balance < start) is the best available description but is unconfirmed for the new plan. The risk engine should support both modes.

### Gaps
- An official statement of hard vs soft DLL for the standard EOD PRO and the exact reset time for the DLL.

## 4. Daily profit limit, max contracts, scaling

### Takeaway
[NEW-EOD] The PRO daily profit limit is **$5,000** on the EOD plan, against $10,000 on Intraday and Classic. Max contracts for 25K are reported as **3 minis / 30 micros**, a figure taken from the Test and legacy rules. No PRO scaling plan was found.

### Cited Findings
- "PRO daily profit limit: $10,000 (Intraday, Classic), $5,000 (EOD)". — [TPT Help Center, 23 Nov 2026](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021) (the same figures also appear on [propfirmmatch.com](https://propfirmmatch.com/futures/prop-firms/take-profit-trader))
- 25K: 3 minis or 30 micros. The cap scales with account size up to 15 minis at 150K. — [proptradingstat.com](https://proptradingstat.com/take-profit-trader-rules-payouts); [prop25k.com](https://www.prop25k.com/review/take-profit-trader/)
- PRO+ Development 25K: 1 mini / 10 micros, $500 soft DLL, $750 EOD drawdown. — search summary of [proptradingvibes.com](https://proptradingvibes.com/blog/takeprofittrader-rules-overview); [tradeharbor.co](https://tradeharbor.co/prop-firm-rules/take-profit-trader)

### Inferences
- A "daily profit limit" probably means the account is stopped for the day once the limit is reached. The mechanics (pause vs flatten) are not confirmed.

### Gaps
- Contract limit for the EOD 25K PRO specifically. Third-party sources report no PRO scaling plan or PRO-specific contract figure.

## 5. Consistency rule in PRO

### Takeaway
No consistency rule applies in PRO. The 50% consistency rule applies in the Test only [ALL-NEW].

### Cited Findings
- "50% consistency requirement applies in the Test only". — [PR Newswire, 23 Nov 2026](https://www.prnewswire.com/news-releases/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options-302945604.html)

### Gaps
- None material. The exact Test-consistency formula is outside this note's scope.

## 6. Payouts: timing, winning days, min/max, frequency, split, fees, processing

### Takeaway
[ALL-NEW] Withdrawals are allowed from **day 1 in PRO, then daily**, with **no winning-day requirement, no payout window and no daily withdrawal cap**. Only profit above the buffer can be withdrawn. The split is **80/20 in PRO** and **90/10 in PRO+**. There is a $50 fee on wallet withdrawals of $250 or less. Processing is reported at roughly 1 to 12 business hours.

### Cited Findings
- "Withdraw profits on your first day in PRO, then every day after. No winning-day requirements or payout windows", with no cap on daily withdrawals. — [PR Newswire, 23 Nov 2026](https://www.prnewswire.com/news-releases/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options-302945604.html)
- All three plans offer daily payouts and day-one payouts in PRO. — [TPT Help Center, 23 Nov 2026](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021); [TPT FAQ](https://try.takeprofittrader.com/nf100-1125-TPT-FAQs)
- Split: PRO 80/20, PRO+ 90/10, across the plans. — [TPT Help Center, 23 Nov 2026](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)
- Only profit above the buffer can be withdrawn. Reaching the buffer alone does not create a withdrawable amount. — [TPT FAQ](https://try.takeprofittrader.com/nf100-1125-TPT-FAQs); search summary of [homedadpro.com](https://homedadpro.com/en/take-profit-trader-review/)
- No maximum withdrawal is stated for PRO. — [proptraderz.com](https://www.proptraderz.com/prop-firms/takeprofittrader/)
- Fee: **$50 on wallet-to-bank withdrawals of $250 or less**, free above $250. — [proptraderz.com](https://www.proptraderz.com/prop-firms/takeprofittrader/); [helloweekends.com](https://www.helloweekends.com/firms/take-profit-trader/payouts)
- Minimum withdrawal: conflicting. Sources say "None", "$250", or "no universal minimum published". The $250 is most likely the fee threshold. — [quantvps.com](https://www.quantvps.com/blog/takeprofit-trader-payout-rules); [h2tfunding.com](https://h2tfunding.com/take-profit-trader-payout-rules/); [lunefi.com](https://lunefi.com/blog/takeprofittrader-payouts)
- Processing: account-to-wallet step is automated in seconds. Admin approval takes "up to 12 business hours, usually quicker". Another source says "about an hour". A tax form is required on the first withdrawal. — [h2tfunding.com](https://h2tfunding.com/take-profit-trader-payout-rules/); [pipback.com](https://pipback.com/firms/takeprofittrader/); [lunefi.com](https://lunefi.com/blog/takeprofittrader-payouts)
- [LEGACY/CONFLICT] One older review (about 214 days old) says there is no buffer at all. This is contradicted by newer sources. — [mrtrader.io](https://mrtrader.io/prop-firms/takeprofittrader)

### Inferences
- Payout-date calculator: `first_payout_date = PRO activation day`, provided `balance > buffer_balance`. `frequency = daily`. `min_winning_days = 0`. `net_to_trader = 0.80 × (amount)` in PRO and 0.90 in PRO+, minus a $50 fee if the amount is ≤ $250. The user's statement that the EOD plan has no winning-day stacking is **confirmed**, and this applies to all three new plans.
- Whether the 80% applies to the gross withdrawal (the trader receives 80% of the amount requested) or is deducted differently is not specified beyond "80% of an eligible withdrawal".

### Gaps
- Whether a withdrawal changes the trailing-drawdown reference (high-water mark) on the EOD plan. No source found.
- Payout rails (Deel, crypto, ACH) for the new plans. Not found.

## 7. PRO vs PRO+ (how to get there, live vs sim, split)

### Takeaway
PRO is a funded sim account: 80/20 split, buffer required, and under the EOD plan EOD drawdown. PRO+ is a **live** account: 90/10 split, **no buffer**, EOD drawdown, **invitation only** with no published threshold. PRO+ Development is a restricted live variant for risky traders.

### Cited Findings
- PRO+: live account routed to the exchange via the same regulated broker, no buffer requirement, 90% split. — [takeprofittrader.com/blog/prop-firm-rules](https://takeprofittrader.com/blog/prop-firm-rules) (search summary)
- Entry is invitation-only, at TPT's discretion, after a holistic review of consistency, risk management and discipline. There is no published threshold. — [phidiaspropfirm.com](https://phidiaspropfirm.com/education/take-profit-trader-pro-account); [tradetanto.com](https://tradetanto.com/learn/take-profit-trader-rules-what-you-need-to-know)
- [UNCONFIRMED] QuantVPS claims a $10K single-day profit triggers the upgrade. This has no official backing. — [quantvps.com](https://www.quantvps.com/prop-firms/take-profit-trader)
- [UNCONFIRMED] On upgrade, the PRO account is put on hold with $5,000 of profit frozen, and anything above that remains withdrawable at the PRO split. — search summary of [onlypropfirms.com](https://onlypropfirms.com/articles/breaking-down-the-new-tpt-rules)
- PRO+ Development is assigned to traders with aggressive sizing or blown loss limits. 25K: 1 mini/10 micros, $750 EOD DD, $500 soft DLL (soft/hard on the new plans). — [TPT Help Center, 23 Nov 2026](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021); [proptradingvibes.com](https://proptradingvibes.com/blog/takeprofittrader-rules-overview)

### Gaps
- PRO+ drawdown amount and DLL for a standard 25K PRO+ on the EOD plan.

## 8. News restrictions and flat-by time in PRO

### Takeaway
In PRO and PRO+, traders must be flat, with no open positions or working orders, from 1 minute before to 1 minute after listed Tier-1 news. Positions are flattened at about 4:55 PM ET, and some sources say 5:00 PM ET. All of this comes from third-party sources only.

### Cited Findings
- Tier-1 news: flat 1 minute before, during, and 1 minute after the event. Applies to positions and pending orders in funded PRO/PRO+. The Test is unrestricted. — [proptradingvibes.com](https://proptradingvibes.com/blog/takeprofittrader-news-trading-policy); [damnpropfirms.com (Apr 2026)](https://damnpropfirms.com/prop-firms/can-you-trade-news-at-take-profit-trader/)
- Event list is disputed. One source lists NFP, CPI, crude inventories (crude products only) and 10Y/30Y auctions. Another lists FOMC, NFP and CPI. The firm's internal calendar governs. — [proptradingvibes.com](https://proptradingvibes.com/blog/takeprofittrader-news-trading-policy); [saveonpropfirms.com](https://saveonpropfirms.com/blog/take-profit-trader-news-trading-rules)
- Auto-close at 4:55 PM ET, or "closed by 5 PM ET". Sources conflict. — [takeprofittrader.crunch.help PRO+ rules](https://takeprofittrader.crunch.help/en/proplus-account/pro-account-rules); [damnpropfirms.com](https://damnpropfirms.com/prop-firms/news-trading-rules-futures-prop-firms/)

### Gaps
- No source states whether the news rules changed for the new EOD plan.

## 9. EOD plan vs classic intraday-drawdown plan: payout-relevant differences

### Takeaway
The payout mechanics (day-one daily payouts, no winning days, 80/90 split, buffer) are shared by all new plans, which share one rulebook. The EOD plan differs in the **risk rules**: EOD drawdown in PRO (reportedly $1,000 for 25K), a **daily loss limit** (reportedly $500 for 25K), and a **lower PRO daily profit limit ($5,000 vs $10,000)**. That profit limit indirectly caps how fast withdrawable profit accrues.

### Cited Findings
- Three plans with one shared rulebook. Daily and day-one payouts apply to all. — [ADVFN/PR Newswire, 23 Nov 2026](https://uk.advfn.com/stock-market/share-news/Take-Profit-Trader-Launches-End-of-Day-Drawdown-in/99766433); [TPT Help Center, 23 Nov 2026](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)
- EOD: DLL plus a $5,000 PRO daily profit limit. Intraday/Classic: no DLL and a $10,000 daily profit limit. — [TPT Help Center, 23 Nov 2026](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You?brand_id=14843154645021)
- Classic PRO drawdown is intraday. Intraday plan drawdown is intraday at every stage. — [PR Newswire, 23 Nov 2026](https://www.prnewswire.com/news-releases/take-profit-trader-launches-end-of-day-drawdown-in-funded-accounts-with-true-daily-payouts-now-offers-three-plan-options-302945604.html)

### Inferences
- If the EOD buffer is $26,000 (start + $1,000 DD), the first withdrawable dollar on EOD comes $500 earlier than on Classic ($26,500). This is unconfirmed.

### Gaps
- Official plan-by-plan buffer and drawdown table for 25K, and plan prices. Access requires takeprofittrader.com and takeprofittraderhelp.zendesk.com to be allowed in the session's network settings.
