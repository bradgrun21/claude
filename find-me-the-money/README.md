# Find Me the Money (beta)

A payday plan, a debt snowball countdown and goals with real dates, built on a 7-step plan
(starter cushion → debt snowball → full safety net → invest → kids' college → home → build & give).

**Privacy by design:** everything is stored in the person's own browser. Bank CSV files are read on
the phone and never uploaded. There is no server, no account and no database.

## What's in the beta
- Setup in 5 short steps: paycheck and schedule, monthly bills, debts, savings and giving, fun money
- Optional bank CSV import (Chase-, Capital One-, Apple Card- and credit-union-style exports)
- Find my money in 30 seconds: pay per paycheck and how often, expenses, debt and payments, then "We found $X a month" (debt payments you keep once debt-free, plus money with no job), "Want it back?" and Reclaim my money. The answers fill in the detailed setup
- The path: a 7-step roadmap before setup, the journey filling to your step (with confetti) on the reveal, and a level-up card each time you reach a new step
- Setup walks the path: savings (with what an emergency fund is), debts, paycheck and expenses, safety-net size (3 to 6 months slider), retirement (one card per account: whose, 401(k)/403(b)/IRA/Roth/pension, % or $ per month, balance, and whether it comes out before payday; take-home accounts become their own budget lines), kids and college, home and mortgage, giving. The reveal shows every step at a glance
- Community tab: what's inside the Skool community and a Join button (set `communityUrl` in `app.js`) and a Watch on YouTube link (`youtubeUrl`); every share card gets "Post it in the community". Challenges and Milestones share one Wins tab
- Share cards in four shapes: Post (4:5), Story (9:16), Square and a wide one for Skool and Facebook; a Step card draws your place on the 7-step path (Wins tab, and on every level-up)
- Budget in sections (Giving, Needs, Wants, Saving & goals); fun money can be broken into parts; money found from wants is shown going to work on the snowball line
- What if you found more? slider: extra dollars a month move your next big date
- Edit the budget in place: tap any amount to change it, tap a group to see and edit its bills, and add a need or a want right under its section
- Home: payday sits inside the countdown card, plus an activity calendar (paydays, check-ins, milestones, challenges, finished plans); goals live on the Plans & Goals tab
- Plans: every day is open right away; a day's action shows a Back to your plan bar with a Done check. Daily challenges can be checked off on any day
- Import screen: an animated, five-step how-to for downloading a CSV, plus tips for common banks
- Track spending by hand: + Add spending (amount, where, which budget line, date). Every budget line shows spent and left this month; over-budget lines turn orange. Quick add on Home, a monthly summary and list on the Budget tab, and a no-file option on the import screen
- After a bank file: Put it in your budget. Drag each store onto a budget line (or tap it); it's remembered for next time, and imported purchases count against the lines. Month arrows on the spending summary
- Tab bar: Home, Budget, a raised + in the middle (add spending, update balances, import a bank file, add a goal), Plans & Goals, Community. Your wins (Challenges and Milestones) sit under the community section
- Goals can have an exact date: the app shows what each paycheck needs to set aside and budgets it
- iPhone: the welcome screen says to Add to Home Screen first (the Home Screen app has its own storage). Already set up in Safari? Settings > Copy my plan, then in the Home Screen app: Started in Safari? > paste
- Bill due dates: each bill on the Budget tab can have a due date that repeats (monthly, every 2 weeks, weekly, yearly or one time). Due days show on the Home calendar, with a Coming up list for the next two weeks
- Add to Home Screen: an animated four-step guide (iPhone Safari or Android Chrome) on the Add to Home Screen page, linked from the Home checklist and the iPhone tip on the welcome screen
- Households: the paycheck step asks Whose paychecks are in this plan? (Just mine / Mine and my spouse's). Paycheck 1, 2, 3... each with a name, amount, how often and next payday; the plan uses the combined income and every payday shows on the calendar. The 30-second screen can add a second paycheck too
- Optional accounts (Supabase): sign in with an emailed 6-digit code or link, no password. The plan saves to the person's own row after each change and loads on any phone, Safari or the Home Screen app. If both the account and the phone have a plan, it asks which to keep and saves the other for 30 days. Sign out, or delete the account copy, from Settings. Setup: the `plans` table with row level security, and `{{ .Token }}` in the Magic Link and Confirm signup email templates
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
```
Covers CSV reading for several bank formats, store-name cleanup, the Payday Plan, the snowball,
Step 1 → Step 2, goals and the slider tradeoff, and payday rollover.

## Files
- `index.html`: page shell
- `styles.css`: the calm "dawn glass" look with sunrise accents for wins
- `core.js`: all the math and CSV reading (no screen code, tested)
- `app.js`: screens and interactions
- `share.js`: draws the shareable win cards (canvas, on the phone)
- `privacy.html`, `manifest.webmanifest`, `sw.js` (offline), `icons/`

*An educational budgeting tool, not financial, tax or investment advice.*
