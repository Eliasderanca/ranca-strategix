# Take Profit Trader 25K EOD Plan: Check Against Official Sources (as of 23 Nov 2026)

**Method:** Retrieved 23/24 Nov 2026. The help-center HTML pages (takeprofittraderhelp.zendesk.com/hc/...) and takeprofittrader.com sub-pages (/pricing, /faq, /blog, /accounts/api/...) return **Cloudflare 403**. The following worked:
- (a) The **official Zendesk Help Center JSON API** (`https://takeprofittraderhelp.zendesk.com/api/v2/help_center/en-us/articles/{id}.json`). It returns the full article text, which is identical to the help-center page. The sources below cite the public article URL (`html_url`). Almost every relevant article shows `updated_at` 2026-11-23.
- (b) The **homepage HTML** from takeprofittrader.com, an Angular SSR page. Its embedded `ng-state` block carries the translation strings and tooltips.

The homepage pricing cards render **without numbers** ("--"). The values are loaded client-side from `/accounts/api/subscriptions` and `/api/subscriptions/products`, and Cloudflare blocks both (403). The numbers therefore come from the help articles, mainly **"EOD Plan Overview & Specifications"**, the official spec table for the EOD plan.

Main source: [EOD Plan Overview & Specifications](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40866438043037-EOD-Plan-Overview-Specifications), updated 2026-11-23T09:15Z. The table there reads "Account Parameters | $25K | $50K | $150K", and the $25K column is quoted below.

## 1. Price, reset, activation fee (25K EOD)

### Takeaway
**Confirmed.** The $160/month and $89 reset figures belong to the 25K EOD. The PRO activation fee is $130 ($0 with NOFEE40), and the PRO reset costs $579.

### Cited Findings
- "Monthly Test Price | $160" (25K) — [EOD Plan Overview & Specifications](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40866438043037-EOD-Plan-Overview-Specifications)
- "Discounted Test Price (NOFEE40) | $96" (25K) — same source
- "PRO Activation Fee ($0 under NOFEE40) | $130" — same source
- "Test Reset Price | $89" and "PRO Reset Price | $579" (25K) — same source
- Reset table by plan: "$25K | $59 | $79 | $89" (Intraday / Classic / EOD) — [Resetting Your Test Account](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15140989806493-Resetting-Your-Test-Account)
- PRO reset 25K: $449 (Intraday), $449 (Classic), $579 (EOD) — [Resetting A PRO Account](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171895352733-Resetting-A-PRO-Account)
- NOFEE40: "40% lifetime discount off any test account size on all 3 plans (EOD, Classic, Intraday) and have your $130 PRO account activation fees waived on that account for life!" — [NOFEE40 PROMO FAQS](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/29660646764445-NOFEE40-PROMO-FAQS)
- Homepage: "Pay a one time $130 PRO Account setup fee, and ZERO monthly fees after that." — [takeprofittrader.com](https://takeprofittrader.com/) (ng-state string `differences-list-tooltipName-6`)

### Inferences
- With NOFEE40, the 25K EOD costs $96/month and the activation fee is $0. The PRO reset at $579 is noticeably more expensive than Classic ($449).

### Gaps
- The end date of the NOFEE40 promo is not stated ("limited-time promo").

## 2. Profit target 25K EOD Test

### Takeaway
**Confirmed: $1,500.**

### Cited Findings
- "Profit Target (Test) | $1,500" — [EOD Plan Overview & Specifications](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40866438043037-EOD-Plan-Overview-Specifications)
- "Profit targets are the same across all 3 existing plans. … $25K | $1,500" — [Rule 1: Hit Your Profit Target](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15169070804125-Rule-1-Hit-Your-Profit-Target)

## 3. Max drawdown 25K EOD: amount, type, lock, open positions

### Takeaway
**Confirmed: $1,000** (not $1,500, which is the legacy figure). The drawdown is EOD trailing in Test, PRO and PRO+. It is calculated on the closing balance and stops trailing at the starting balance ($25,000). It **locks at $25,000** once the EOD balance reaches $26,000. Unrealized profits do not move the floor. **However, unrealized losses do count toward liquidation at the minimum balance:** "at any time, through realized or unrealized losses".

### Cited Findings
- "Max Trailing Drawdown | $1,000" (25K) — [EOD Plan Overview & Specifications](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40866438043037-EOD-Plan-Overview-Specifications)
- "$25K | 3 contracts | $1,500 | $1,000" (position / target / max trailing DD). Legacy: "Accounts purchased before November 23, 2026 keep their original drawdown amount … $25K | … | $1,500" — [Rule 3: Stay Within Your Drawdown and Daily Loss Limit](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170265979165-Rule-3-Stay-Within-Your-Drawdown-and-Daily-Loss-Limit)
- "$25K Drawdown | Legacy $1,500 | Classic $1,000" — [What Happens to My Existing Account?](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40824556669469-What-Happens-to-My-Existing-Account)
- "End-of-day (EOD) trailing drawdown is calculated only at the end of the trading day, based on your closing balance. Unrealized profits during the session do not move it." — Rule 3 (above)
- Lock: "This continues until the minimum account balance reaches the starting balance of $50,000. Once it reaches that point, it stops trailing and remains fixed." (example $50K) — Rule 3. Homepage tooltip for the EOD path: "On the EOD path, the drawdown is End Of Day on test, PRO, and PRO+ accounts, meaning it updates at the end of the trading day (5PM EST). The drawdown across all three account types will STOP trailing once it has reached the initial account balance." — [takeprofittrader.com](https://takeprofittrader.com/) (ng-state `home-page.funded-journey-product-path.tooltips.eod.drawdown`)
- Liquidation: "If your account drops to the Minimum Account Balance at any time, the account is immediately liquidated." — Rule 3. PRO: "If your account balance drops to the Minimum Account Balance at any time, through realized or unrealized losses, the account is immediately liquidated." — [PRO Account Rules](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171769361053-PRO-Account-Rules)
- PRO: "Your maximum drawdown in PRO is the same as the maximum drawdown from your passed Test. The drawdown trails up as your account grows and stops once it reaches your starting balance." PRO drawdown type: "EOD | End of Day, plus a daily loss limit" — PRO Account Rules
- PRO+: "Your account balance, including open positions, must not reach or exceed your maximum drawdown limit." EOD → "End of Day, plus a daily loss limit" — [PRO+ Account Rules](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172006753821-PRO-Account-Rules)
- Note: the help-center article on the classic Test, Rule 3 ("checked only at the close of the trading day, not during open trades"), has been **rewritten** and now says "at any time … immediately liquidated". The earlier wording is outdated.

### Inferences
- Rule engine for the 25K EOD:
  - `floor = min(25000, max_EOD_close − 1000)`, initial value $24,000. The floor updates only at the close (17:00 ET).
  - The breach check runs **in real time** against the equity (balance + unrealized P&L).
  - Lock at $25,000 once an EOD close of ≥ $26,000 is reached.

### Gaps
- Whether the close balance is measured including commissions is not stated explicitly. It most likely is, because the balance is net.

## 4. Daily loss limit 25K EOD

### Takeaway
**Confirmed: $500.** It is measured in real time, including unrealized P&L and commissions, as net loss from the balance at the start of the session. Intraday profits from the same session add extra room. When the DLL is hit, all positions are closed. **Soft breach** if the balance is ≥ $25,000 (pause until 18:00 ET). **Hard breach** if the balance is < $25,000 (account failed, reset needed). This applies equally to Test, PRO and PRO+.

### Cited Findings
- "Daily Loss Limit | $500" (25K) — [EOD Plan Overview & Specifications](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40866438043037-EOD-Plan-Overview-Specifications)
- "It is tracked in real time and includes realized and unrealized profit and loss, plus commissions." "The DLL measures your net loss from the balance at the start of the trading session. Both closed trades and open positions count, along with commissions. Profits earned during the same session provide additional room before you reach your DLL. Giving back those profits does not, by itself, trigger a breach." — [Daily Loss Limit (DLL): Soft Breach vs. Hard Breach](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40419036993437-Daily-Loss-Limit-DLL-Soft-Breach-vs-Hard-Breach)
- "Soft Breach: Balance is at or above the starting balance. Trading is paused until the next trading session (5:00 p.m CT / 6:00 p.m ET). Hard Breach: Balance is below the starting balance. The account is breached and a reset is required to trade it again." — same source
- Official 25K example: "A trader with a $25K account starts the trading day with a balance of $25,200. During the session, they reach their $500 DLL, bringing their balance to $24,700. Because their balance is below the account's $25,000 starting balance, this is a hard breach." — same source
- The applicability table lists "EOD | Soft/Hard DLL" for Test, PRO, PRO+ and PRO+ Development. The DLL for "EOD Test, PRO, and PRO+" at "$25K | $500" — same source
- Homepage tooltip: "If you hit the limit with your balance at or above the starting balance, trading stops for the day. Below the starting balance, your account is closed. This applies to both realized and unrealized profits." — [takeprofittrader.com](https://takeprofittrader.com/) (ng-state `…tooltips.eod.daily-loss-rule`)

### Inferences
- `dll_trigger = equity ≤ session_start_balance − 500`. Example from the official $50K case: $1,000 in session profit lets the trader then lose $2,000. That means the DLL is measured against the session-start balance, **not** against the intraday peak.
- **Important:** in the first phase (balance < $25,000), every DLL hit is a hard breach. The effective first-day risk on a fresh account is therefore $500, not $1,000.

## 5. Max contracts 25K EOD

### Takeaway
**Confirmed: 3 minis / 30 micros.** The same limit applies on all plans and in Test and PRO. There is no scaling plan.

### Cited Findings
- "Max Contracts (Minis / Micros) | 3 / 30" — [EOD Plan Overview & Specifications](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40866438043037-EOD-Plan-Overview-Specifications)
- "It is the same on the Intraday, Classic, and EOD plans. … $25K | 3 Contracts / 30 Micros" — [Rule 2: Do Not Exceed Maximum Position Size](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15169066911133-Rule-2-Do-Not-Exceed-Maximum-Position-Size)
- "All three plans include … no scaling plans" — [Classic vs. EOD vs. Intraday](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You)

### Gaps
- PRO+ contract limits for a standard 25K PRO+ are not listed. A third-party source names 1/10 for PRO+ Development; this is not officially checked here.

## 6. Consistency rule

### Takeaway
**Confirmed.** The Test requires the best day to be < 50% of net profit. If it is not, the target rises automatically to more than 2× the best day; this is not a fail. PRO and PRO+ have no consistency rule.

### Cited Findings
- "Consistency Rule (Test Only) | 50%" — [EOD Plan Overview & Specifications](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40866438043037-EOD-Plan-Overview-Specifications)
- "your best trading day must be below 50% of your total net profits." "If your consistency percentage is above 50%, you do not meet the consistency rule. However, you have not failed the test account; you simply need to increase your total profit goal" "Updated Profit Goal > High Profit Day's Net P/L × 2" — [Rule 5: Be Consistent](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170316538013-Rule-5-Be-Consistent) (updated 2026-11-09)
- "Funded Consistency Rule | None | None" (PRO / PRO+) — EOD Plan Overview; "Take Profit Trader has no consistency rule in PRO" — [takeprofittrader.com](https://takeprofittrader.com/)

## 7. Minimum trading days

### Takeaway
**Confirmed: 3** (not 5).

### Cited Findings
- "Minimum Trading Days | 3" — [EOD Plan Overview & Specifications](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40866438043037-EOD-Plan-Overview-Specifications)
- "you must trade for a minimum of 3 trading days. A trading day is defined as any day in which you place at least one trade." — [Rule 5: Be Consistent](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170316538013-Rule-5-Be-Consistent)
- Homepage FAQ: "3 trading days, as long as you've met the profit target and all other test rules." — [takeprofittrader.com](https://takeprofittrader.com/)
- Note: older sources citing 5 days are outdated. A homepage FAQ says "The 3-day eval only applies to new test accounts purchased from August 17th onward."

## 8. Flat time and news rule

### Takeaway
**Confirmed:** auto-close at **4:55 PM ET**, and the trading day ends at 5 PM ET. The 4:59 PM figure is not official. The news rule (PRO and PRO+ only, not the Test) requires being flat with no open orders from 1 minute before until 1 minute after FOMC (Wed 2:00 PM ET), NFP (Fri 8:30 AM ET) and CPI. The full list is the red-folder USD events on forexfactory plus the TPT calendar.

### Cited Findings
- "Trading window: 6 PM Eastern – 5 PM Eastern. The trading day ends at 5 PM Eastern. TPT will automatically close any open position at 4:55 PM Eastern." — [Rule 4: Trade Approved Products, During Approved Hours](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15170347090461-Rule-4-Trade-Approved-Products-During-Approved-Hours) (updated 2026-10-09)
- Dashboard rule text: "Don't hold open positions past 17:00 EST" — [takeprofittrader.com](https://takeprofittrader.com/) (ng-state `rules-open-positions`)
- "All PRO Accounts must be out of all open positions and have no open orders one minute before, during and one minute after any prohibited news event." Events: "FOMC statements/announcements Wednesdays at 2:00 PM ET (FED speakers, FOMC meeting minutes are allowed)", "Non-Farm Payroll (NFP) Monthly, Fridays at 8:30 AM ET", "Consumer Price Index (CPI)". "Review news marked with the red folder, USD currency, on: forexfactory.com" — [PRO Account Rules](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171769361053-PRO-Account-Rules); the same rule applies to PRO+ — [PRO+ Account Rules](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172006753821-PRO-Account-Rules)
- "This does not apply for test accounts and you are free to trade through all news events." — [takeprofittrader.com](https://takeprofittrader.com/) (news-rule tooltip)

### Gaps
- It is not clear whether "red folder USD" means every high-impact USD event or only the three named ones. The wording lists those three as "Prohibited News Events (All Products)" and then refers to forexfactory red folder plus the calendar. A conservative approach is to block all red-folder USD events.

## 9. PRO payouts (EOD 25K)

### Takeaway
**Confirmed:**
- Payouts are daily from PRO day 1, with no payout windows, no minimum winning days and no withdrawal cap.
- **Buffer $1,000, so the withdrawal threshold is a $26,000 balance** ($26,500 is the legacy figure).
- Split is 80/20 in PRO and 90/10 in PRO+. PRO+ has no buffer.
- A $50 fee applies to wallet withdrawals of ≤ $250.
- The PRO daily profit limit is $5,000: positions are closed and trading pauses until the next session. It is not a payout cap.

**Unconfirmed:** whether a withdrawal moves the drawdown floor, and an official minimum withdrawal amount.

### Cited Findings
- "Payout Frequency | Daily from day 1 | Daily from day 1"; "Buffer | $1,000 / $2,000 / $4,500 | None"; "Payout Caps | None"; "Profit Split | 80/20 | 90/10"; "Daily Profit Limit | $5,000 | None"; "EOD accounts follow the same daily payout policy as every TPT plan: no payout windows, no minimum profit required between payouts and no withdrawal limit." "In PRO, you can withdraw profits above your buffer. The buffer amount matches your account's max drawdown." — [EOD Plan Overview & Specifications](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40866438043037-EOD-Plan-Overview-Specifications)
- "Buffer Zones Per Account Size (Intraday, Classic, and EOD Plans) … 25k | $26,000"; legacy "25k | $26,500"; "You can withdraw 50% of your Buffer Zone after your account is closed." — [PRO Account Profit Split & Withdrawal Rules](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172219527581-PRO-Account-Profit-Split-Withdrawal-Rules) (updated 2026-11-23)
- "If you request a withdrawal of $250 or less from your wallet, you will be charged a $50 withdrawal fee." PayPal may add fees on top — [Withdrawal Fees](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172354954525-Withdrawal-Fees). The homepage states PayPal fees as "2.99% of the payment amount, but may fluctuate" — [takeprofittrader.com](https://takeprofittrader.com/)
- "The daily profit limit is the maximum profit a PRO account can make in a single trading day: … $5,000 (EOD plan). When you reach it, open positions are closed and trading is paused until the next trading session. It applies in PRO only and it isn't a payout cap … There's no profit cap in a PRO+ account." — [Classic vs. EOD vs. Intraday](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You)
- Withdrawing requires no open positions or working orders. The Control Center balance "is not updated real time. This is updated daily between 8PM - 9PM EST." — [How to Withdraw from PRO Account to the Wallet](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172253980061-How-to-Withdraw-from-PRO-Account-to-the-Wallet)
- Frontend code (homepage bundle `main-REFG3FTW.js`, not a rule text): the available withdrawal amount is computed as current balance − start balance − `eodTrailingDrawdown`. For "ON_HOLD" accounts, an extra $5,000 is deducted. This matches "withdrawable = balance − $26,000" for the 25K — [takeprofittrader.com](https://takeprofittrader.com/) (JS bundle)
- PRO+ upgrade: "$5,000 in profit from the PRO account will be frozen … The PRO+ account will begin with a $0 balance and an initial drawdown equivalent to the starting drawdown of the original PRO account." There is no single threshold; the review is "holistic". — [PRO+ Account Upgrade Process](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171978600349-PRO-Account-Upgrade-Process-Overview-and-Guidelines)

### Inferences
- Because withdrawals are only possible above the buffer ($26,000), and the DD floor locks at $25,000 once the EOD close reaches $26,000, a withdrawal can never take the balance below the $26,000 buffer. The locked floor stays at $25,000 (there is no official statement that a withdrawal moves the floor).

### Gaps
- No official statement on **whether a withdrawal moves the drawdown floor**.
- No official **minimum withdrawal amount** was found. Only the $50 fee for amounts ≤ $250 is stated.

## 10. Other 25K-EOD-specific points

### Cited Findings
- EOD is available only in $25K, $50K and $150K: "All plans come in $25K, $50K, and $150K account sizes" — [Classic vs. EOD vs. Intraday](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You)
- Accounts purchased before 23 Nov 2026 keep legacy rules ($1,500 DD, no DLL, $79 reset, $26,500 buffer) — [What Happens to My Existing Account?](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40824556669469-What-Happens-to-My-Existing-Account)
- PRO: no bots or algos, a minimum of 1 trading day per calendar month, no counter positions, exit before limit up/down — [PRO Account Rules](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171769361053-PRO-Account-Rules)
- Up to 3 PRO resets (EOD 25K: $579 each) and a maximum of 5 funded accounts — [Resetting A PRO Account](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171895352733-Resetting-A-PRO-Account); [Classic vs. EOD vs. Intraday](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/40739474201501-Classic-vs-EOD-vs-Intraday-Which-Plan-Is-Right-for-You)
- Commissions in Test and PRO: "$4.50/$1.50 RT" (mini/micro) — [takeprofittrader.com](https://takeprofittrader.com/) (funded-journey table)
- The homepage card for EOD also lists "Counter Positions Rule: Yes", "5PM Rule: Yes", "Copy Trading: Allowed" and "Days to Pass Test: 3" — [takeprofittrader.com](https://takeprofittrader.com/)
- The dashboard rule text also contains "Don't break 50 executions rule". Its link was not checked, and it is unclear whether it applies to the EOD Test — [takeprofittrader.com](https://takeprofittrader.com/) (ng-state `rules-executions-rule`)

### Gaps
- The content of the "50 executions rule" is not verified.
- The PRO+ Development parameters for 25K are not checked here: only the DLL of $500 is official (DLL article). The $750 DD and 1/10 contracts come from third-party sources only.
- **Conflict found:** the homepage tooltip for the general (Classic) row still says "If you breach the daily loss limit, it will liquidate your account immediately". This is an older generic text. The EOD-specific articles and tooltip describe soft/hard behaviour, and the EOD wording is the one that applies.

## Summary: config values for the 25K EOD (officially confirmed)
| Parameter | Value | Status |
|---|---|---|
| Price / month | $160 ($96 with NOFEE40) | confirmed |
| Test reset / PRO reset | $89 / $579 | confirmed |
| PRO activation | $130 ($0 with NOFEE40) | confirmed |
| Profit target | $1,500 | confirmed |
| Max trailing DD | $1,000, EOD trailing (close 17:00 ET), lock at $25,000 | confirmed |
| Breach check against floor | real time incl. unrealized losses | confirmed |
| DLL | $500, real time incl. unrealized + commissions, from session-start balance; soft if ≥ $25,000, hard if < $25,000 | confirmed |
| Contracts | 3 minis / 30 micros | confirmed |
| Consistency | Test 50% (target → > 2× best day); PRO/PRO+ none | confirmed |
| Min trading days | 3 | confirmed |
| Auto-flat | 16:55 ET (day ends 17:00 ET) | confirmed |
| News (PRO/PRO+) | flat and no orders ±1 min around FOMC/NFP/CPI (red-folder USD) | confirmed (scope of list partly unclear) |
| Payouts | daily from PRO day 1, no cap, no winning days | confirmed |
| Buffer | balance > $26,000 | confirmed |
| Split | 80/20 PRO, 90/10 PRO+ | confirmed |
| Withdrawal fee | $50 for ≤ $250 (wallet) | confirmed |
| PRO daily profit limit | $5,000 (close + pause, not a payout cap) | confirmed |
| Withdrawal moves DD? | — | **unconfirmed** |
| Minimum withdrawal | — | **unconfirmed** |
