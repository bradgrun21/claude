# Find Me the Money (beta)

A payday plan, a debt snowball countdown and goals with real dates, built on a 7-step plan
(starter cushion → debt snowball → full safety net → invest → kids' college → home → build & give).

**Privacy by design:** everything is stored in the person's own browser. Bank app screenshots are read on
the phone and never uploaded. There is no server, no account and no database.

## What's in the beta
- Setup in 5 short steps: paycheck and schedule, monthly bills, debts, savings and giving, fun money
- Weekly purchases from bank app screenshots (see Screenshot reader below), or added by hand
- Find my money in 30 seconds: pay per paycheck and how often, expenses, debt and payments, then "We found $X a month" (debt payments you keep once debt-free, plus money with no job), "Want it back?" and Reclaim my money. The answers fill in the detailed setup
- The path: a 7-step roadmap before setup, the journey filling to your step (with confetti) on the reveal, and a level-up card each time you reach a new step
- Setup walks the path: savings (with what an emergency fund is), debts, paycheck and expenses, safety-net size (3 to 6 months slider), retirement (one card per account: whose, 401(k)/403(b)/IRA/Roth/pension, % or $ per month, balance, and whether it comes out before payday; take-home accounts become their own budget lines), kids and college, home and mortgage, giving. The reveal shows every step at a glance
- Community tab: what's inside the Skool community and a Join button (set `communityUrl` in `app.js`) and a Watch on YouTube link (`youtubeUrl`); every share card gets "Post it in the community". Challenges and Milestones share one Wins tab
- Share cards in four shapes: Post (4:5), Story (9:16), Square and a wide one for Skool and Facebook; a Step card draws your place on the 7-step path (Wins tab, and on every level-up)
- Giving on a slider: a percent of pay or a set dollar amount each month (type it or slide it, switching keeps about the same amount), shown as a month and per paycheck. Tap it in the budget to change it
- Budget in sections (Giving, Needs, Wants, Saving & goals); fun money can be broken into parts; money found from wants is shown going to work on the snowball line
- What if you found more? slider: extra dollars a month move your next big date
- Edit the budget in place: tap any amount to change it, tap a group to see and edit its bills, and add a need or a want right under its section
- Home: payday sits inside the countdown card, plus an activity calendar (paydays, check-ins, milestones, challenges, finished plans); goals live on the Plans & Goals tab
- Plans: every day is open right away; a day's action shows a Back to your plan bar with a Done check. Daily challenges can be checked off on any day
- Track spending by hand: + Add spending (amount, where, which budget line, date). Every budget line shows spent and left this month; over-budget lines turn orange. Quick add on Home, a monthly summary and list on the Budget tab
- Tab bar: Home, Budget, a raised + in the middle (add spending, update balances, add this week's purchases, add a goal), Plans & Goals, Community. Your wins (Challenges and Milestones) sit under the community section
- Goals can have an exact date: the app shows what each paycheck needs to set aside and budgets it
- iPhone: the welcome screen says to Add to Home Screen first (the Home Screen app has its own storage). Already set up in Safari? Settings > Copy my plan, then in the Home Screen app: Started in Safari? > paste
- Bill due dates: each bill on the Budget tab can have a due date that repeats (monthly, every 2 weeks, weekly, yearly or one time). Due days show on the Home calendar, with a Coming up list for the next two weeks
- Add to Home Screen: an animated four-step guide (iPhone Safari or Android Chrome) on the Add to Home Screen page, linked from the Home checklist and the iPhone tip on the welcome screen
- Households: the paycheck step asks Whose paychecks are in this plan? (Just mine / Mine and my spouse's). Paycheck 1, 2, 3... each with a name, amount, how often and next payday; the plan uses the combined income and every payday shows on the calendar. The 30-second screen can add a second paycheck too
- Optional accounts (Supabase): sign in with an emailed 6-digit code or link, no password. The plan saves to the person's own row after each change and loads on any phone, Safari or the Home Screen app. If both the account and the phone have a plan, it asks which to keep and saves the other for 30 days. Sign out, or delete the account copy, from Settings. Setup: the `plans` table with row level security, and `{{ .Token }}` in the Magic Link and Confirm signup email templates
- Finish setting up checklist on Home: emergency savings, fun money, bank import, bills, Add to Home Screen, Save your plan with your email, and Join the FREE community. Each item checks itself off
- Simple by default: the 30-second expenses number covers everything (so no extra fun-money guess is added on top), a short plan says plainly how much it's short with three ways to find it, Home shows the next 2 setup items, Challenges show 3 per group with See all, and setup has one progress bar
- First screens are short: the welcome screen is one line and one button (plus Sign in), and the 30-second screen asks only pay, how often, expenses and debt. Spouse sharing is offered right after saving with email
- Home is the countdown, one next thing (a due money date, today's 7-Day Reset step, or the next setup item) and the calendar. The 7 steps live on Plans & Goals, the debt snowball and needs-vs-wants on Budget, and the payday streak on Community & Wins
- Nothing is assigned automatically, for anyone. The 30-second numbers only power the We found estimate; the expenses and debt steps start empty with a reminder of what was said. Leftover money waits as Left to assign until the person puts it toward their step (one tap: Put $X toward Starter Cushion, or type an amount on the Your step line)
- Budget starts with Income: every paycheck and other money, with + Add income
- Challenges and milestones use bubble tabs: Suggested (3, with Show all), Food, Spending, Bills & debt, Saving, Earn more, Completed; milestones: Up next, Getting started, Saving, Debt, Streaks, Days back, Challenges & earning, Earned
- Pay that changes: add recent paychecks and plan on your lowest (safest) or your average; each payday check-in asks what landed, adds it to the list and says how much is above or below the plan
- Community lives on Home (goal: move people to Skool): a card with Free community / Coaching bubbles, each showing its benefits and join link. The last tab is now Wins (streak, challenges, milestones). YouTube is an icon in the Home header
- (earlier) Community tab had two sections: the free community and coaching (benefits: 2 live coaching calls a month, an accountability group, budget feedback; a short "Who's Brad?" card; Learn about coaching opens the Skool plans page; a small Founding Members note)
- After saving with email, the Home Screen how-to shows next (it no longer shows on the first screen)
- Setup ends with Save your progress: sign in with an emailed code before Home (or Not now). Anyone who skips sees a small Save your plan card on Home after their first check-in
- Shared budgets for couples: Settings → Invite my spouse makes a one-time code (good for 7 days). The spouse signs in with their own email, taps Joining your spouse's budget? and enters it. Both see and edit one budget; changes made at the same time are combined field by field and item by item, so two purchases logged at once both stay. Either person can stop sharing or leave (keeping a copy). Database setup lives in `supabase.sql`
- Other money coming in: side income, child support, rental, benefits or anything else, added on the paycheck step and counted in the monthly total
- Monthly money date: pick a day, it repeats monthly on the calendar and in Coming up, can be added to a phone calendar (.ics), and opens a 7-step checklist (celebrate a win, look back at last month, check in, give next month's money a job, and more). Home shows it when it's due
- Budget tab in the bottom bar: the Payday Plan per paycheck or per month, with quick links to change any part
- Found money spells out the math (wants minus your fun limit) and where the money goes
- Monthly bills in 10 groups (Home, Utilities, Food & household, Getting around, Health & insurance, Personal, Kids & family, Pets, Subscriptions, Other) with common items to add in one tap; yearly bills are set aside monthly
- Payday Plan shows per paycheck or per month
- Swipe deck: the person sorts each store into Need or Want (nothing is pre-tagged). "See the purchases" shows each one with the bank's own text, and stores with several purchases can be sorted one by one
- Needs vs wants: tap any store to see each purchase and flip one on its own (a Target run can be half groceries, half decor)
- "Found money": pick a new fun-money limit and see what it frees up
- Payday Plan: every dollar of each paycheck gets a job
- Home: countdown to the current step's finish line, snowball list, goals with a tradeoff slider
- Payday check-in: type real balances and get a wins screen: debt paid, money saved, days stolen back
- Payday streak: check in from the day before payday to 2 days after; every 4 in a row earns a grace pass
  that covers one missed payday; a missed payday pauses the streak (your best is kept), never shames
- "Days stolen back": a running score of how far you've pulled your freedom date forward beyond the plan
- Calendar reminders (.ics), backup/restore file, delete everything, privacy page
- Challenges tab: 13 short sprints (Cook at Home 7, No-Delivery Week, 30 Days No Late Fees, Cushion Sprint,
  Find $100, Sell 3 Things and more). Up to 3 at a time; tap off days, count, add dollars, or report a slip
- Earn challenges: Sell $1,000 in Vintage, Drive and Earn $500, Deliver for $300, Pet-Sit or Babysit $300,
  2 Extra Shifts, Sell 5 Things. Log each payout, then "Put it to work": savings, the snowball debt or a goal.
  Partner links live in `CONFIG.partners` (empty until approved; an FTC-style disclosure shows next to any link)
- Plans tab: the 7-Day Money Reset. One short read and one action a day; a new day opens each morning; catch-up allowed
- Milestones tab: 26 small achievements (first $250 saved, first debt down, $1,000 paid down, 7 days stolen
  back, streaks, challenges finished, debt-free...) with progress toward the next ones
- Shareable cards: made on the phone as an image for any payoff, funded goal, streak, finished challenge or
  milestone. A Show/Hide switch for dollar amounts, a ready caption, Share (iPhone share sheet) or Save image

Not in the beta: AI statement reading, bank linking, accounts or sync, payments, App Store app.

## Try it on your computer
```
cd find-me-the-money
python3 -m http.server 8000
```
Open http://localhost:8000

## Where it lives
Live at **https://findmethemoney.netlify.app**. Netlify deploys automatically from the
`claude/find-me-the-money-mvp` branch of the GitHub repository (settings in `netlify.toml` at the repo root),
so every push goes live in about a minute. No uploading.

Before each update, change `VERSION` at the top of `sw.js` (any new text) so phones pick up the new files.
If a phone still shows the old version, close the app completely and open it again.

The repository is public because Netlify's free plan only builds private repositories from one recognized
contributor. Nothing secret is in it: it's the same code anyone can see by visiting the site.

## Before you send it to friends and family
- [ ] Optional: set `shareUrl` at the top of `app.js` (your domain) so it prints on share cards
- [ ] Only after approval for an official affiliate/partner program (not a personal referral code), add links in `CONFIG.partners`
- [x] Feedback: a Feedback tab on every screen opens the beta Google Form (`feedbackUrl` in `app.js`)
- [ ] Optional: turn on privacy-friendly visit counting. Create a free https://www.goatcounter.com site
      and uncomment the script tag in `index.html` with your code. It counts opens and steps like
      "finished setup" and "checked in", never money amounts
- [ ] Open it on your own iPhone, tap Share → **Add to Home Screen**, and run through setup with your real numbers
- [ ] Tell testers to add it to their Home Screen too. Safari can clear saved website data after about
      7 days without a visit; Home Screen apps are exempt

## The number that matters
Of the people who finish setup, how many come back and **check in on their next payday**?
30% or more means it's working.

## Tests
```
node tests/core.test.js
node tests/scan.test.js
```
Covers store-name cleanup, the screenshot reader's parsing, the Payday Plan, the snowball,
Step 1 → Step 2, goals and the slider tradeoff, and payday rollover.

## Files
- `index.html`: page shell
- `styles.css`: the calm "dawn glass" look with sunrise accents for wins
- `core.js`: all the math (no screen code, tested)
- `scan.js`: reads purchases from bank app screenshots (tested)
- `app.js`: screens and interactions
- `share.js`: draws the shareable win cards (canvas, on the phone)
- `privacy.html`, `manifest.webmanifest`, `sw.js` (offline), `icons/`

*An educational budgeting tool, not financial, tax or investment advice.*

## Payday check-in: 3 stars (Journey slice 1)
On payday the check-in walks through: 1) Payday: paycheck, bills and spending, left to give a job (a short plan is said gently and still counts). 2) Give every dollar a job: Step 1 fills the cushion to $1,000 and rolls the rest to the smallest debt; Step 2 goes smallest debt first; people can leave some without a job (costs star 2). 3) Update balances, prefilled with what's expected, never below $0. 4) Fun money question, only when a week of the period has no purchases logged. Stars: checked in; every dollar has a job; stayed under fun money (needs a limit). Rules live in `STAR_RULES` in app.js. Each check-in's stars, plan money and amount assigned are saved in history.

## Journey (slice 2)
The Journey tab replaces Plans & Goals and Wins (old links land on the matching Journey tab). Three bubbles:
- **Map**: past paydays with their stars, then the current chapter. Step 1 shows the weekly purchases nodes and 4 cushion lessons (C1-C4: why $1,000 first, where to keep it, what counts as an emergency, the payday habit; all open, the next one highlighted, and the next one is also Home's nudge), milestones earned since the last payday as gold nodes, the payday node (opens the check-in on payday), the next 2 paydays as locked previews, "About N paydays to your Starter Cushion", dated goals as flags, the monthly money date and the 7 steps. When plan money is $0 or less, or the cushion is more than 13 paydays away, a **Make room** chapter comes first: Needs vs wants lesson, set a fun-money limit, Cancel One Subscription (the existing challenge), and an optional earning side quest. It runs once. People past Step 1 see it as done; their step's map comes in a later slice.
- **Step bubbles** (from Step 2 on): ✓ Step 1, Step 2 · now, Step 3 · next. A finished step shows when it was done, its paydays and stars, and its lessons to read again; the next step is a peek with a rough date. Past paydays are grouped by the step they belonged to, with "+N earlier" to see them all. Every lesson can be read again.
- **Step 2 map (Debt Snowball)**: each debt is a chapter, smallest balance first (`outlook().payoffs` gives each one's payoff paycheck, minimums and rollover included). Paid-off debts show as checks, the current chapter shows what's left and about how many paydays to go, a long chapter (more than 8 paydays) gets checkpoints ("Credit card under $1,800"), 4 snowball lessons (D1-D4 in `lessons.json`: smallest debt first, stop adding new debt, roll it forward, speed it up), a gold "paid off" node with its date, and an "Up next in the snowball" list with dates.
- **Checkpoint quizzes**: 3 questions at the end of Step 1 and Step 2 (also open from the look-back view, so someone placed straight into Step 2 can prove Step 1 and collect its stars). Passing earns 3 stars once. Questions live in `lessons.json` with `chapter: "quiz"` (id, step, order, kind, title = the question, choice1-3, answer = 1-3, why, compute). Numbers questions (`compute`: cushionLeft, cushionPaydays, firstDebt, smallestPaydays) use the person's own savings, debts and plan money, with sample numbers when theirs don't fit; the app works out the answer and nearby wrong choices. A wrong pick shows the one-line why and allows a retry; missed questions come back as a "Quick review" node after the next payday.
- **Challenges**: the existing bubble tabs (Suggested, Food, Spending, Bills & debt, Saving, Earn more, Completed).
- **Milestones**: payday streak, all milestones in bubble tabs, and Goals at the bottom.

Lesson text lives in `lessons.json` (id, step, order, chapter, title, card1-card3, skoolUrl, action, actionLabel). Edit it there; a lesson's last card links to its `skoolUrl` when one is set. The last tab spot is now Settings.

## Weekly purchases and the screenshot reader (slice 3)
`scan.js` reads purchases from bank-app screenshots on the device: the image is cleaned up on a canvas (grayscale, dark mode inverted, small images scaled 2x, contrast stretched), read by Tesseract.js in its own Web Worker, then turned into rows (amount, date from the line or the section header above, merchant name cleaned up, split lines paired, long names that wrap joined, deposits and refunds tagged "Not a purchase?", transfers tagged "Transfer?", low-confidence rows flagged, duplicates dropped). Tesseract.js 6.0.1, its core and the English data are hosted with the app in `vendor/tesseract/` and load only on the first scan. Nothing is uploaded or stored.

Test page (not linked in the app): `/dev/scan.html`. Pick screenshots, mark each row Right, enter missed purchases, and it shows accuracy per bank app. Parser tests: `node tests/scan.test.js`. First real test: 18 of 18 purchases right across 3 screenshots from one bank app (dark mode, running balances under each row).

**In the app:** each payday period has one "Add this week's purchases" node per week on the Journey map (two for every-two-weeks pay). It opens a screen to scan one or more screenshots, add one by hand, or tap "No purchases this week". Found rows start unchecked, with a category picker filled in from the person's own budget lines: a remembered store first, then store-name rules (groceries, gas, eating out, subscriptions, household), else blank. Confirm all checks every purchase; Save keeps only checked rows as spending (`P.spends`, `src: 'scan'`), remembers each store's category (`P.merchantMem`) and marks the week done (`P.weeks`). Rows already saved are skipped. An empty photo (iPhone with Optimize Storage) gets a plain fix: save it to Files first. CSV import is gone; older imported data still shows.

## Payday reminders
Optional, from Settings (or offered after a payday check-in). The phone subscribes with OneSignal and links to the person's account; an hourly Supabase job (`supabase/functions/reminders`) sends at most one reminder a day at the person's chosen local time: payday check-in, money date, or a bill due tomorrow. Messages never include amounts or names. Modes: off, dry (log only), test (TEST_USER_IDS only), live.

## Measuring return visits
Each phone sends one cookie-free GoatCounter event per payday check-in number: `checkin-1`, `checkin-2`, `checkin-3`... (sent once each, no amounts, names or budget data). In the GoatCounter dashboard, the beta's key number is visitors on `event-checkin-2` divided by visitors on `event-checkin-1`.

## People, email list and activity
Saving is required at the end of setup: first name, email and a pre-checked "Send me money tips and updates from Brad" box, then the email code. After two codes (or a wrong code), "Having trouble? Continue for now" appears so nobody is locked out; people who set up without saving are asked again each time they open the app. People signed in before names were asked get a "What should we call you?" card on Home. Home says hello by first name; Settings has the name and the email-list box.

The name and email-list choice live in `fmtm.me` on the phone (not in the plan, which a spouse may share) and in the `people` table. Every `track()` event also goes to the `activity` table for signed-in people (events made during setup wait on the phone and go up after sign-in). Events are names like `checkin-2`, `lesson-C1`, `scan-save`; never amounts, store names or budget details. Deleting the account copy removes the people row and activity too.

Run `supabase/people.sql` once. Then, in Supabase, Table Editor -> schema `admin`:
- `people_overview`: one row per person (name, email, on the list, step, joined, last seen, check-ins, lessons, quizzes, weeks scanned, reminders on).
- `email_list`: first name and email of everyone who said yes. Export as CSV for your email tool. Every marketing email needs an unsubscribe link and a mailing address (CAN-SPAM).

## Still to set up
- [x] Run the latest `supabase.sql` in Supabase (SQL Editor). Turns on shared budgets for couples
- [x] Supabase SMTP: sender name "Find Me the Money"
- [ ] Later: own domain + Resend for sign-in emails (keeps them out of junk)
- [x] OneSignal App ID (in app.js)
- [ ] Reminders: deploy `supabase/functions/reminders`, add its secrets, run `supabase/reminders.sql`, then move REMINDERS_MODE from dry to test to live
