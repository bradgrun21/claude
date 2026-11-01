# Find Me the Money (beta)

A payday plan, a debt snowball countdown and goals with real dates, built on a 7-step plan
(emergency fund → debt snowball → full safety net → invest → kids' college → home → build & give).

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
- Home: progress card, running challenges right under it, community, and an activity calendar (paydays, bills, weekly recaps, milestones, challenges, finished plans)
- Plans: every day is open right away; a day's action shows a Back to your plan bar with a Done check. Daily challenges can be checked off on any day
- Track spending by hand: + Add spending (amount, where, which budget line, date). Every budget line shows spent and left this month; over-budget lines turn orange. Quick add on Home, a monthly summary and list on the Budget tab
- Tab bar: Home, Budget, a raised + in the middle (add spending, update balances, add this week's purchases, add a goal), Plans & Goals, Community. Your wins (Challenges and Milestones) sit under the community section
- Goals can have an exact date: the app shows what each paycheck needs to set aside and budgets it
- iPhone: the welcome screen says to Add to Home Screen first (the Home Screen app has its own storage). Already set up in Safari? Settings > Copy my plan, then in the Home Screen app: Sign in > Have a backup file instead? > paste
- Bill due dates: each bill on the Budget tab can have a due date that repeats (monthly, every 2 weeks, weekly, yearly or one time). Due days show on the Home calendar, with a Coming up list for the next two weeks
- Add to Home Screen: an animated four-step guide (iPhone Safari or Android Chrome) on the Add to Home Screen page, linked from the Home checklist and the iPhone tip on the welcome screen
- Households: the paycheck step asks Whose paychecks are in this plan? (Just mine / Mine and my spouse's). Paycheck 1, 2, 3... each with a name, amount, how often and next payday; the plan uses the combined income and every payday shows on the calendar. The 30-second screen can add a second paycheck too
- Optional accounts (Supabase): sign in with an emailed 6-digit code or link, no password. The plan saves to the person's own row after each change and loads on any phone, Safari or the Home Screen app. If both the account and the phone have a plan, it asks which to keep and saves the other for 30 days. Sign out, or delete the account copy, from Settings. Setup: the `plans` table with row level security, and `{{ .Token }}` in the Magic Link and Confirm signup email templates
- Finish setting up checklist on Home: emergency savings, fun money, bank import, bills, Add to Home Screen, Save your plan with your email, and Join the FREE community. Each item checks itself off
- Simple by default: the 30-second expenses number covers everything (so no extra fun-money guess is added on top), a short plan says plainly how much it's short with three ways to find it, Home shows the next 2 setup items, Challenges show 3 per group with See all, and setup has one progress bar
- First screens are short: the welcome screen is one line and one button (plus Sign in), and the 30-second screen asks only pay, how often, expenses and debt. Spouse sharing is offered right after saving with email
- Home is the countdown, one next thing (today's 7-Day Reset step, or the next setup item) and the calendar. The 7 steps live on Plans & Goals, the debt snowball and needs-vs-wants on Budget, and the payday streak on Community & Wins
- Nothing is assigned automatically, for anyone. The 30-second numbers only power the We found estimate; the expenses and debt steps start empty with a reminder of what was said. Leftover money waits as Left to assign until the person puts it toward their step (one tap: Put $X toward $1,000 Emergency Fund, or type an amount on the Your step line)
- Budget starts with Income: every paycheck and other money, with + Add income
- Challenges and milestones use bubble tabs: Suggested (3, with Show all), Food, Spending, Bills & debt, Saving, Earn more, Completed; milestones: Up next, Getting started, Saving, Debt, Streaks, Days back, Challenges & earning, Earned
- Pay that changes: add recent paychecks and plan on your lowest (safest) or your average
- Two tiers. **Free**: the app, the free course, the free community and onboarding calls. **$29 a month** (group coaching): 2 live coaching calls a month, an accountability group, budget feedback, unlimited AI snaps and the paid perks. There are no other tiers.
- Community lives on Home (goal: move people to Skool): a card under the calendar titled "You don’t have to do this alone" with Free Community / Partner with a Coach bubbles; tapping one opens its benefits and join link, tapping it again closes them. The last tab is now Wins (streak, challenges, milestones). YouTube is an icon in the Home header
- (earlier) Community tab had two sections: the free community and coaching (benefits: 2 live coaching calls a month, an accountability group, budget feedback; a short "Who's Brad?" card; Learn about coaching opens the Skool plans page; a small Founding Members note)
- After saving with email, the Home Screen how-to shows next (it no longer shows on the first screen)
- Setup ends with Save your progress: sign in with an emailed code before Home (or Not now)
- Shared budgets for couples: Settings → Invite my spouse makes a one-time code (good for 7 days). The spouse signs in with their own email, taps Joining your spouse's budget? and enters it. Both see and edit one budget; changes made at the same time are combined field by field and item by item, so two purchases logged at once both stay. Either person can stop sharing or leave (keeping a copy). Database setup lives in `supabase.sql`
- Other money coming in: side income, child support, rental, benefits or anything else, added on the paycheck step and counted in the monthly total
- Budget tab in the bottom bar: the Payday Plan per paycheck or per month, with quick links to change any part
- Found money spells out the math (wants minus your fun limit) and where the money goes
- Monthly bills in 10 groups (Home, Utilities, Food & household, Getting around, Health & insurance, Personal, Kids & family, Pets, Subscriptions, Other) with common items to add in one tap; yearly bills are set aside monthly
- Payday Plan shows per paycheck or per month
- Needs vs wants: tap any store to see each purchase and flip one on its own (a Target run can be half groceries, half decor)
- "Found money": pick a new fun-money limit and see what it frees up
- Payday Plan: every dollar of each paycheck gets a job
- Home: countdown to the current step's finish line, snowball list, goals with a tradeoff slider
- Update balances (Budget → Saving, the + menu, or the weekly card): type real balances; debt paid and money saved are counted, and a payoff or a fully funded goal gets its own celebration screen
- Weekly streak: a week counts when its 3 steps are done (categorize, update balances, read the recap)
- "Days stolen back": a running score of how far you've pulled your freedom date forward beyond the plan
- Backup/restore file, delete everything, privacy page
- Challenges tab: 13 short sprints (Cook at Home 7, No-Delivery Week, 30 Days No Late Fees, Emergency Fund Sprint,
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
Of the people who finish setup, how many finish **their first full week** (categorize, update balances, read the recap)?
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
- `entry.js`: purchases typed in one line, and the repeat checks (tested)
- `ai.js`: the phone's side of AI snaps and chat (shrinking photos, masking card numbers, the care check, Brad's replies)
- `daily.js`: the daily checklist rules (tested)
- `supabase/functions/ai/`: the AI Edge Function and its output checks (`guard.mjs`, tested)
- `app.js`: screens and interactions
- `share.js`: draws the shareable win cards (canvas, on the phone)
- `privacy.html`, `manifest.webmanifest`, `sw.js` (offline), `icons/`

*An educational budgeting tool, not financial, tax or investment advice.*

## Journey (removed)
The Journey tab, its map, the weekly "Add this week's purchases" nodes, the checkpoint quizzes and the small challenges list are gone from the app (Part 5c). Their saved data stays in the plan untouched (`P.journey`, `P.challenges`, `P.plans`, `P.weeks`). Lesson text stays in `lessons.json`; the daily checklist's lesson uses it. Where things went: the 30-Day Challenge and Milestones (with Goals) live on the **Challenge** tab; Add purchases is in the + menu and on the Today card; goals are on Budget → Saving; finished old challenges still show under Milestones. Old links to Plans, Wins, Challenges or Milestones land on the Challenge tab.

## Weekly purchases (slice 3)
The on-phone screenshot reader (Tesseract) is gone; purchases come in by AI snaps (below), typing, or Add one by hand. Typed entry and repeat checks live in `entry.js` (`parseTyped`, `rowKey`, `dedupe`, `findDate`, `cleanName`; tests: `node tests/entry.test.js`).

**In the app:** Add purchases (the + menu) opens a screen to snap a receipt or a bank screenshot, type purchases in one line, or add one by hand. Found rows land in one confirm list; nothing saves until they're checked and Save is tapped.

## Reminders
Optional, from Settings → Reminders: switches for bills due tomorrow and the 30-Day Challenge nudge, plus the nudge time (6–10 pm, default 8 pm, `P.remind.chHour`). The phone subscribes with OneSignal and links to the person's account; an hourly Supabase job (`supabase/functions/reminders`) works in each plan's time zone (`P.tz`) and sends at most one bill reminder (at 9 a.m. local, when a bill is due tomorrow) and one challenge nudge a day ("Day 12 isn't done yet. 2 tasks left." — only for someone in an active challenge whose 5 aren't all done; never on a finished day; no amounts, no names, no shame). `notify_log` is unique on (user, day, kind), so both can go out the same day. The nudge reads `P.daily` and the challenge start date the same way `daily.js` does (copied with a "kept in step" comment), and the job reads only the plan fields it needs. Starting the challenge offers "Want a nudge at 8 pm if today isn't done?" (Yes / Not now; event `reminder-optin-challenge`). Turning reminders on keeps the time zone picked in Settings.

## Delete my account and data
Settings → Your data → **Delete my account and data**: "Download a backup first" (the existing backup), then type DELETE. Signed in, the `delete-account` Edge Function (`supabase/functions/delete-account`, it needs the service role) checks the sign-in and deletes their rows in plans, plan_members, plan_invites, people, activity, notify_log, ai_usage, ai_minute, ai_flags and ai_access (by email and alt email), then the sign-in itself. A member just leaves, and the owner's plan stays. An owner with a partner is warned "Your partner will lose access to this plan." and can tick "Give the plan to <partner> instead" (the plan moves to them when they have none of their own). Then the app clears the phone (every `fmtm.*` key and the recipe photos' IndexedDB) and returns to the front page. Signed out, it clears just this phone. Supabase's own backups roll off on its schedule (said on the privacy page).

## Privacy page
`privacy.html`, in plain short sections: what we keep (the plan, synced, private to you and anyone you invite; partners see each other's gratitude lines), AI snaps and chat (Anthropic reads photos and messages only to find purchases; we don't store them; card numbers masked; typing never uses AI; retention follows Anthropic's policy, linked), reminders (OneSignal), email (Resend), community (Skool email match via Zapier), analytics (GoatCounter, no ads, no selling, no tracking cookies), your choices (backup, delete), adults 18+, not financial advice, and contact. Linked from Settings and the front page. The app's description (index.html, manifest) now says "Your plan is private to you."

## People, email list and activity
Saving is required at the end of setup: first name, email and a pre-checked "Send me money tips and updates from Brad" box, then the email code. After two codes (or a wrong code), "Having trouble? Continue for now" appears so nobody is locked out; people who set up without saving are asked again each time they open the app. People signed in before names were asked get a "What should we call you?" card on Home. Settings has the name and the email-list box.

The name and email-list choice live in `fmtm.me` on the phone (not in the plan, which a spouse may share) and in the `people` table. Every `track()` event also goes to the `activity` table for signed-in people (events made during setup wait on the phone and go up after sign-in). Events are names like `checkin-2`, `lesson-C1`, `scan-save`; never amounts, store names or budget details. Deleting the account copy removes the people row and activity too.

Run `supabase/people.sql` once. Then, in Supabase, Table Editor -> schema `admin`:
- `people_overview`: one row per person (name, email, on the list, step, joined, last seen, current week streak, weeks done, best week streak, lessons, quizzes, weeks scanned, reminders on), sorted by streak. A week counts from the app's `week-done` event, Sunday to Saturday, Arizona time. Run `supabase/people.sql` again to update it.
- `email_list`: first name and email of everyone who said yes. Export as CSV for your email tool. Every marketing email needs an unsubscribe link and a mailing address (CAN-SPAM).

## First open and the dark look
New people see a one-question-per-screen intro (`ob` in app.js, list `OB`), about 90 seconds to the reveal:
- two "tap to continue" story screens, then first name
- three one-tap questions: how money feels (slider), what they'd do first with found money, what's in the way (saved in `P.intro`)
- "Here's what we heard": where they want to go, where they are now, what's in the way plus one line on how the app helps (no statistic until Brad has a real, cited one)
- "Let's find your money · 4 numbers": take-home pay per paycheck, then how often they're paid and the next payday (echoed as a sentence), then monthly bills, total debt, debt payments ("Every other Friday, so your next payday plan starts Friday, Nov 6.")
- a 2-second "finding your money" checklist, then the reveal: found money = pay − bills − debt payments, with confetti and the math line ($4,200 − $2,610 bills − $748 debt payments = $842/mo) and the free community link. Zero or below shows the Make room message instead, no confetti.
- "Your first goal": $1,000 for emergencies, in plain words, with their extra per payday going there first (no dates, no payday counts); if money is short, the three Make room steps instead. Then "Start my plan"
- save with email and code, the 7-step path, then Home. Their first-open answer picks which lesson is up next.
Each screen sends a GoatCounter event `fo-<number>-<screen>`, plus `journey-saved` and `week-done`. No answers or amounts are sent.

Home's hero card uses the same arc as the Budget gauge (gold segments = progress to the current goal), the dollars left in the middle ("$600 left to your $1,000 Emergency Fund", "$600 left on Store card"), and a pill with the progress and percent. There are no countdowns, predicted dates or "days stolen back" anywhere (Home, Journey, Budget, shares, milestones); goals have a target date (a goal is an amount, with what goes aside each paycheck): paydays can bring more or less than planned, so progress is shown in dollars. The "extra has no job yet" and "short each paycheck" states use the same card. Home is just the countdown and bar to the next win (the emergency fund in Step 1, the next debt payoff in Step 2), any running challenges, the community card, and the calendar with two tabs: Due & wins, and Spending (what was spent each day).

The whole app is dark: tokens at the top of styles.css (`--bg`, `--card`, `--ink`, `--hi` for the warm highlight, `--green` for good news) plus a dark-theme block at the end. Buttons are white pills.

## Budget: Spending, Saving, Debt
The Budget tab has three bubbles.
- **Spending**: "Left to spend" this month (spending categories minus what was spent) with "$X/day safe to spend · N days left". Each category is a card with an icon, a colored bar and "$167 left / $220". Add categories from suggestions (groceries, gas, eating out, kids, pets...) or your own name; tap one to change its amount, name or icon. "Everything else" is the part of the rough monthly number (from the intro) that no category or recurring expense covers yet. Below that, **Recurring expenses**: set up once with a name, icon, amount, how often (monthly, every 2 weeks, weekly, yearly) and the day of the month or next due date. They show on the calendar and count every month.
- **Saving**: the emergency fund (or safety net), the monthly amount to your step with "Give it a job", goals, and a "where your money goes each month" breakdown ending in your extra.
- **Debt**: debt left, paid so far, debt-free date, and each debt smallest first with a bar and its payoff date.
Purchases can also be typed in one line on the Add purchases screen ("coffee 5, gas $50 yesterday, Kroger 84.20 monday"): `FMTMEntry.parseTyped` in entry.js reads the amount, the words and a date word (today, yesterday, a weekday, 10/24, Oct 24), and the rows join the same checked list as scanned ones with a category guess. No AI, nothing sent anywhere.
The top of Spending is a segmented gauge (lit segments = what's left) with a status: On track (spending at or under the month's pace), Spending fast (more than 10% ahead of pace) or Over budget. On Home's calendar, the Spending tab shows the month total with "% vs last month", and tapping a day opens a pop-up with that day's purchases (or "No purchases on this date") and "+ Add a purchase" for that date.
The top of Budget shows **Income for the Month** (each paycheck times the paydays that land in that month, plus other income) and **Left to budget** (income minus everything with a job: recurring expenses, spending categories, debt minimums, giving, savings, goals and the step amount per paycheck), with totals by type. A spending category can be budgeted monthly or weekly (`c.per`): a weekly one like "Groceries $150 a week" counts as $650 a month in the totals, and its card shows what's left this week (Sunday to Saturday). Each spending category and recurring expense has a type (Need or Want) and a color, both picked in its edit sheet. The Budget has no hint lines, just the numbers.
Everything about money lives on the Budget tab: income (Edit on the income card: pay per paycheck, how often, next payday; "More income options" for a second paycheck or pay that changes), spending categories including **Giving** and **Education fund**, recurring expenses, savings (Update balances, the emergency fund or safety net, the step amount, goals, retirement), and debts plus your home. Settings keeps only the account, reminders, Add to Home Screen and your data. "Update balances" anywhere (Journey, the + menu) opens Budget → Saving with the balances sheet. Spending categories and recurring expenses are typed Need or Want. Left to budget never counts more for the step than the month has left.
Every spending card can be edited or removed, including the built-in ones (Fun money, Giving, Education fund, Everything else): name, amount, Need or Want, color and icon (`P.lineMeta[key]` holds what was picked for a built-in). Removing one sets its amount to zero; it then waits at the top of "+ Add a category" to bring it back. With Everything else removed, the rough total is just the categories and recurring expenses.
**Saving funds** (sinking funds) live on Budget → Saving: a name, icon, color, an amount saved weekly or monthly, and what's in the fund now (`P.funds`). Their monthly total counts as Savings in Left to budget and comes out of Everything else like a new category. A purchase can be categorized "Pay from <fund>" (key `u:id`, lowers the balance) or "Add to <fund>" (key `u+:id`, raises it); neither counts as spending. A fund's balance is `f.start` plus what was added minus what was paid; editing the balance (in the fund or in Update balances) resets `f.start`. A recurring expense can be **Paid from** a fund (`b.fund`): it stays on the calendar but leaves the budget totals, since the fund already covers it, and a purchase put on that bill comes out of the fund. Lines without a picked color get the next color nobody else is using, so no two match. Each month's budget counts real dates, not averages: a weekly or every-2-weeks recurring expense counts every date it lands on in that month (4 or 5 Fridays), a yearly one only in the month it's due, and a weekly category or fund once for each week (Sunday to Saturday) that starts in the month. The long-range plan still uses the yearly average. Step 1 is called the **$1,000 Emergency Fund** everywhere (internal ids still say `cushion`).
Goals are a name, an amount and a date; each paycheck sets aside what's left over the paydays until then. Retirement taken out before payday can take pay before taxes per paycheck (`a.gross`), so a 5% match is 5% of gross. Reminders are on/off switches (no time of day). Running challenges also show on Home right under the hero. Journey's header uses the same gauge as Home.
**Weekly recap** (the payday check-in, its stars and payday streak are gone): each week (Sunday to Saturday) has 3 steps, Categorize transactions, Update balances and Read your weekly recap (`P.wk[sunday] = { cat, bal, done, snap }`), and a week counts toward "N weeks in a row" when all 3 are done. The recap shows a donut of the week's spending with the top 5 categories, spending vs. the week's share of the spending budget, and balances (emergency savings, funds, goals, debt) with the change since the last recap. Money moved in or out of funds isn't in the spending part.
Editing in the Budget happens in a pop-up sheet (`U.sheet`, `sheetHtml()`): tap a category, a recurring expense or the monthly step amount, change it, and nothing is saved until Save. Cancel or tapping outside throws the change away; Remove takes two taps.
Money math: `P.basics` is the rough monthly total. Adding a category or recurring expense splits it (the extra doesn't change); changing or removing one changes the total. Plans from before this (no `P.budgetV2`) keep their old math until they first change the Budget. Recurring expenses are `P.bills` with `freq` (amount each time) and `due`; categories are `P.cats`.

## Setup carries the rough numbers over
During setup, the expenses step starts with the monthly expenses from "Find my money" and the debts step is just two boxes, total debt and monthly payments, both carried over (one debt called "My debts"). Each can be changed there; a $0 total means no debt. Listing bills or debts one by one is only in Settings after setup.

## Free community link and coach offer
- The "We found" reveal has a small "Join the free community →" link under Reclaim my money (opens `communityUrl`).
- Right after someone's first weekly recap, the recap shows "Want a coach in your corner?" once. The line uses their found money from "Find my money" (whole dollars): $100 a month or more says "You found $X a month. Founding Members pay $29."; less, $0 or a gap says "Not much found yet? That's exactly what coaching is for." Either button saves `fmtm.coach` on the phone so it never comes back.
- To see it without a payday: open the app with `?coachtest` (uses their found money) or `?coachtest=500` / `?coachtest=60` / `?coachtest=0` / `?coachtest=-40` to try an amount. `?coachreset` clears the saved flag.

## Still to set up
- [x] Run the latest `supabase.sql` in Supabase (SQL Editor). Turns on shared budgets for couples
- [x] Supabase SMTP: sender name "Find Me the Money"
- [x] Run `supabase/people.sql` (names, email list, activity, admin views)
- [x] Own domain for email: findmethemoney.app, verified in Resend (send-only key "Supabase sign-in emails")
- [x] Supabase SMTP: smtp.resend.com, port 465, user resend, password = the Resend key, sender noreply@findmethemoney.app (the app itself stays on findmethemoney.netlify.app for now)
- [x] OneSignal App ID (in app.js)

**What Brad sets up for AI, the $29 tier and live reminders:**
1. Anthropic Console: create an API key, load about $25 of prepaid credit, turn auto-reload OFF and set a monthly spend limit.
2. Supabase: run `supabase/ai.sql`, deploy the `ai` and `community-hook` functions, and add the secrets ANTHROPIC_API_KEY, AI_MODE=test, TEST_USER_IDS, AI_MONTHLY_CAP_USD, HOOK_SECRET, RESEND_API_KEY, ALERT_EMAIL (and ALERT_FROM if not noreply@findmethemoney.app).
3. Skool: set the paid price to $29. Turn on membership questions with "What email do you use in the Find Me the Money app?"
4. Zapier (free plan to start), two Zaps:
   - Skool "Answered Membership Questions" → Webhooks POST to `community-hook` `{ email: <answer>, kind: 'free' }` with header `x-hook-secret`.
   - Skool "New Paid Member" → Webhooks POST to `community-hook` `{ email, kind: 'paid' }`.
5. Once a month: export the paid members from Skool and POST them to `community-hook/import` (`{ emails: [...] }`, same header).
6. Test with your own account in AI_MODE=test (and run `node tests/ai-redteam.js`), then switch to AI_MODE=live.
7. Reminders: run the updated `supabase/reminders.sql`, redeploy the `reminders` function, test with your account in REMINDERS_MODE=test (one bill reminder and one 8 pm challenge nudge), then set REMINDERS_MODE=live.
8. Deploy the `delete-account` function. Try it on a throwaway test account first.
9. Add your support email to the privacy page and as `CONFIG.supportEmail` in app.js, and reread Anthropic's privacy wording before AI goes live.

## Front page (first open only)
When the phone has no saved plan, the app opens on a front page before the "ever wonder where your paycheck goes?" intro: the icon and name, the headline "find the money you didn't know you had", a CSS iPhone (bezel, Dynamic Island, 9:41 status bar, home bar) on a soft sunrise glow, a caption that changes per screen with ‹ • • • › controls, then **Find my money →** (starts the intro), "Free · No bank login · Made by a certified financial coach" and "Already have an account? Sign in". Returning users never see it. The three screens inside the phone are small HTML screens drawn at 375 × 812 and scaled to fit (not screenshots): the $842 reveal, the November Budget tab, and the Journey tab with the weekly streak. Demo math: $2,100 twice a month = $4,200; 4,200 − 2,610 − 748 = $842 a month, $10,104 a year; $1,370 left ÷ 15 days = $91.33/day; $421 saved = 42% (gauges light 12 and 9 of 22 ticks). It swipes (scroll-snap, one screen at a time), drags with a mouse, and answers the arrows, dots and Left/Right keys; it advances every 5 seconds until the first touch (never with reduced motion). On phones the iPhone takes the height left after the copy and button (about half the screen when there's room), so the button shows without scrolling in Safari on an iPhone SE through 15; wider than 880px, the copy and button sit left and the phone right. GoatCounter events: `welcome-view`, `welcome-swipe`, `welcome-start`. Code: `frontPage()` and `frontInit()` in app.js, `.wf-*` styles in styles.css.

## Guided tour (once per page)
The first time someone opens Home, Budget, Challenge, Meals or Settings after setup, a short tour plays: the screen dims, a spotlight sits on one feature, and a card gives a 2-3 word title and one sentence, with Skip, Back and Next (Done on the last). Steps whose feature isn't on that person's page (no challenge running, reminders not set up, no goals yet) are left out, and the count reflects only what they'll see. Budget walks all three tabs: income, the tabs, left to spend, spending categories, recurring expenses; Update balances, saving funds, goals; debt left and smallest first. Keys: Right/Enter next, Left back, Esc skip. Seen pages are kept on the phone (`fmtm.tour`), not in the shared plan, so a spouse gets their own tour. Settings has "Show me around again". GoatCounter events: `tour-<page>-start`, `tour-<page>-done`, `tour-<page>-skip`, `tour-replay`. The steps live in `TOUR` in app.js: each is [what to highlight, title, one line, the Budget tab to switch to first].

## Meals tab (Meal Math)
The fourth tab is **Meals** (hamburger icon). Settings moved to a gear in the top-right corner of Home, Budget, Challenge and Meals. Meal Math has two tabs. **Week** is a Sunday–Saturday planner with breakfast, lunch and dinner per day; each meal can be a meal, leftovers or eating out with a dollar budget. **Meals** lists your meals with sort chips and a 🏆 on the cheapest per plate; the 🧺 Prices pill opens pantry prices. The + menu adds 📅 Plan a meal and 🍲 New meal. The weekly recap gets a 🍽️ Meals at home section, and Home has a 📊 Weekly recap button.

Math: each line costs price ÷ package amount × amount used, rounded to the cent. The total is the sum of those rounded lines, per plate = total ÷ plates, and saves = the eating-out price − total. A blank price or "Already have it" counts $0 and shows "🧺 N item(s) you already have, not counted". Nothing ever shows NaN or Infinity; an empty answer shows "—". Units are servings, lb, oz, count and cups, with no conversion. Changing a price in Pantry prices updates every meal that uses it. Plan entries dated today or earlier count as eaten; later ones are planned and not counted. Photos are cut to 700px JPEG and kept in the plan, so they're in backups and sync.

Recipe: each meal has a 📖 Recipe section with up to 3 photos of the recipe (📷 Take a picture of the recipe, from the camera or photo library) and a link to a recipe page or video (YouTube, TikTok, Instagram, Vimeo and Facebook links show ▶️ Watch the video, others 🔗 Open the recipe; only http/https links are kept). Tap a page, or 📖 Open the recipe in Plan a meal when that meal is planned, for a full-screen view to read while cooking: pages one under another, tap to zoom, and the screen stays on where the phone allows. Week entries with a recipe show 📖. Recipe pages are about 1200px JPEGs kept in this phone's IndexedDB (`fmtm-recipes`), not in the plan, so they don't fill the phone's 5 MB plan storage or get uploaded on every change; the meal stores only their ids, and pages no meal uses are deleted. So recipe photos don't sync to a spouse's phone or go into the backup code (there they show "On the phone that took it"); the link does sync.

Share: 📤 Share this meal (in the meal, and the 📤 in the cooking view) draws a card on the phone with nothing uploaded: the meal photo or emoji, the name, chips for cost a plate / feeds / saves, each ingredient with its amount and cost (— when you already have it or it has no price), the meal total, where the recipe lives (▶️ Video on youtube.com or 🔗 Recipe at …), and the Find Me the Money logo and link. The pop-up previews it, with "📖 Add the recipe photos" (on by default when there are any), ⬇️ Save image and 📤 Share. Share sends the card plus the recipe photos and a line with the name, cost a plate and link through the phone's share sheet; where a browser can't share several files it sends the card alone, and where it can't share files at all it saves them. The card is drawn by `FMTMShare.recipe` in share.js. GoatCounter events (no names or amounts): `meal-share-open`, `meal-share`, `meal-share-save`, `meal-recipe-photo`, `meal-recipe-open`.

Grocery list: the 🛒 List tab (next to Week and Meals) lists what the meals planned from today to the end of the shown week need, with already-have items left out and the same item added up across meals (amount, which meals, and the cost of the whole packages to buy, e.g. 5 servings of a $5 bag is $5.00). The strip shows how many to get, how many are in the cart, and about what's left to spend. "Add an item" adds anything else (kept until removed, every week). Tap a row to check it off; checked rows move to ✓ In the cart. 🧹 Clear checked removes checked extra items and hides checked meal items for that week. 📋 Copy list copies what's left as "☐ Rice (5 servings)" lines; 📤 Share (where the phone has it) sends the same text. Stored as `P.grocery = { checked: { 'sunday|pantryItemId': 1 or 2 }, extras: [{ id, name, done }] }`, so it syncs with the plan. Events: `grocery-add`, `grocery-copy`, `grocery-share`.

Sides: in a meal, 🍽️ Main / 🥗 Side marks what it is. A side is priced the same way (ingredients, plates, cost a plate) but has no eating-out price. Meals lists mains (with the 🏆 cheapest) and then 🥗 Sides, with + New meal and + New side. In Plan a meal, once a main is planned the 🥗 Sides section lets you add or remove sides (✓), shows the meal with sides a plate, and has + New side (a side made there goes straight onto that meal and the planner opens again); picking a main stays open for sides when you have any. A planned meal's cost is main + sides, per plate is over the main's plates, and what it saves is the main's eating-out price minus main + sides, so the week strip, recap and grocery list all count the sides. Deleting a side takes it off planned meals. Stored as `meal.kind = 'side'` and `planEntry.sideIds`.

Data in the plan: `pantryItems`, `meals`, `planEntries` (shapes are at the top of the Meal Math code in app.js). No suggestion buttons. Sample data lives only in the test, never in a real account.

## 30-Day Challenge (the Challenge tab)
The Journey tab is now **Challenge**, and it holds one thing: the 30-Day Challenge (Level 1). Milestones and goals sit behind it (🏅 Milestones on the Challenge screen). The name lives in `CH_NAME` in app.js.

Every day for 30 days, 5 tasks: 🧾 log purchases & update balances (done when a purchase is dated today or "No spend today" is tapped, and balances were updated today or "Balances still right ✓" is tapped), 💳 no new debt and 🍽️ no eating out (honor checkboxes; a purchase in an eating-out kind of category or a Meal Math "Eat out" today shows a soft note, never a block), 🎧 the day's lesson (an .mp4 checks itself off when it ends; text and other video links have "I read it" / "I watched it"), 🙏 one thing you're grateful for (1–280 characters, saved in the plan; "📣 Post it in the community" copies it and opens Skool). Only today can be checked off; once all 5 are done the day is locked in ("✅ Day 12 done · 18 to go").

Days are local calendar days: Day 1 is the start date, Day 30 is start + 29. Start today or on the 1st of next month (moving a start that hasn't come yet isn't a new attempt). A day left undone when it ends stops the run: the next open shows a calm "You showed up 12 days in a row. That counts. Day 1 starts today." with Start again (Day 1 = that day). Lifetime stats stay: attempts, longest run, days done, lessons, gratitude entries. Quit is two taps. Day 30 done shows the finish screen (30 days, 30 lessons, 30 things you were grateful for), a share card, Post it in the community, and earns the "Level 1 complete" milestone (`ch30-l1`).

In the challenge, Home's Today card becomes "Day 12 of 30" (one card, never two); after a missed day it's the restart card.

Lessons are in `challenge-lessons.js` (30 placeholders, "Lesson N — coming soon"; each takes title, type video|text, videoUrl or body, minutes). The challenge's days are the daily checklist's days (`P.daily`, below); `P.challenge = { status: notStarted|active|restart|completed, level, startDate, attempts, longestStreak, totalDaysCompleted, completedAt }`, part of the plan, so it syncs and is in backups. The day check runs before every draw and once a minute (for midnight). Events: `challenge-start`, `challenge-day-complete-N`, `challenge-restart-day-N` (the day reached), `challenge-complete`, `challenge-gratitude-shared`, `challenge-complete-shared`, `challenge-quit`.

Evening nudge: the reminders function has `pickChallenge` (8 pm local, only when today's tasks aren't all done: "Day 12 isn't done yet · 2 tasks left."). It's off until the `CHALLENGE_REMINDERS=on` secret is set and the function is redeployed, and it shares the one-a-day slot with bill reminders.

Parked (not built): Level 2 and 3, the 90 Club, level skins, accountability partners.

## Safe to spend in your first month
The month someone starts in only counts from their start date: setting up on Oct 25 with $3,200 a month of spending gives Oct 25–31, so 7/31 of it ($722.58), not the whole $3,200 for the last week. Each spending category is counted the same way (Groceries $620 → $140), and "On track / Spending fast" paces from that date. If purchases from earlier in that month are logged (say a scan of the whole month), it counts from the earliest one instead. The Spending card says "Counting from Oct 25, when you started" (or "…, your first purchase"). The next month is a full month. The start date is `P.startedOn` (set at setup; older plans use the date their plan was built). Code: `budFrom()` in app.js.

## Time zone and week start
Settings → **Your days**. 🕰️ Time zone is filled in from the phone the first time the app opens (`P.tz`, every plan has one) and can be changed from a list (US zones first). "Today" everywhere (the daily checklist and challenge, the calendar, safe to spend, recaps, Meal Math) is the date in that zone (`F.dayIn`), so the day turns over at the person's own midnight. 📅 My week starts on: Sunday to Saturday (`P.weekStart`, 0–6, default Sunday). It's the one week for the whole app: weekly budget categories ("left this week"), weekly recaps and streaks, Meal Math weeks and the grocery list, and both calendars (first column and day letters follow it). Changing it never moves saved purchases; it only changes how weeks are grouped from then on. The old pay-period weeks are gone. Helpers: `F.dayIn(tz)`, `F.weekStartOf(iso, ws)`; tests in `tests/core.test.js`.

## Daily checklist and the Activity calendar
Everyone gets the same 5 things a day, in a challenge or not: 🧾 log purchases & update balances, 💳 no new debt, 🍽️ no eating out, 🎧 a 5-minute lesson, 🙏 one thing you're grateful for. One store for everything: `P.daily = { 'YYYY-MM-DD': { logged, noSpend, balUpdated, balancesConfirmed, noNewDebt, noEatingOut, lessonDone, lessonRef, gratitude, done } }`, saved in the plan (so it syncs, is in backups, and both partners in a shared plan see it). The rules are in `daily.js` (pure functions, tested in `tests/daily.test.js`), and the 30-Day Challenge reads the same days (older plans' `P.challenge.days` move into `P.daily` on load).
- Task 1: purchases saved today and dated today set `logged` (typed, scanned or added on Budget), or "No spend today"; plus balances updated today (`balUpdated`) or "Balances still right ✓". Adding last week's purchases later never fills in a past day.
- Only today can be checked off, until midnight in the plan's time zone; a full day locks in. No back-filling, for anyone.
- The lesson: in the challenge, that day's challenge lesson; otherwise the next unread lesson in `lessons.json` (quizzes left out), then the challenge lessons in order. Finishing it checks the task.
- Home's **Today** card: a ring with "3 of 5", the 5 tasks as chips (💳 and 🍽️ check off right there; the others open the checklist), and "Make it a challenge: 30 days, all 5 every day." with Start. All 5 done shows "All 5 done. That's a full day." once that day.
- The Challenge tab shows today's checklist for everyone, with the challenge offer under it (or the challenge itself while one runs).
- **Activity** calendar (was "Due & wins"; Spending is unchanged): no circle = nothing done, light green = 1 to 4, dark green = all 5, today an open ring until it's full, days to come blank, paydays keep their orange ring. Never red, an X or "missed". Legend: All 5 · Some · Payday. Tapping a day opens a read-only panel with its 5 tasks and gratitude line (today's links to the checklist). Under the month: "N full days this month" (or "Your days show up here"). The bill, milestone, challenge and plan dots and the "Coming up" list are gone; one line remains: "Next bill: Rent · Tue, Nov 10 · $1,200" (from the next 14 days, linking to the budget), hidden when no bills have due dates. Milestones and finished challenges (the 30-day one and older small ones) are on Challenge → Milestones.
- Events: `daily-item` (each task checked), `daily-full`.

## AI snaps
**Levels** (`LIMITS` in `supabase/functions/ai/index.ts`): the app alone gets 10 snaps a month; joining the FREE community, 20; the $29 group coaching, unlimited (fair use 300 a month: above that Brad gets an email, nothing is blocked). 1 snap = 1 photo or screenshot, however many purchases are on it. A couple sharing a plan shares one count (the plan owner's). Counts reset on the 1st at midnight in the plan's time zone. When snaps run out, typing still works with no AI, so nobody is ever stuck.

**On the phone** (`ai.js` + Add purchases): 🧾 Snap a receipt and 🏦 Snap a bank screenshot (camera or photo library), with "7 of 10 snaps left this month" (paid: "Unlimited snaps"). Each photo is shrunk to 1568px on its long side, JPEG 0.8; a very tall bank screenshot (more than 2.5 times as tall as wide) goes as 2 tiles in one request, still 1 snap. Rows land in the existing confirm screen with categories pre-picked: a store they've categorized before (`P.merchantMem`) wins, then the AI's pick, then `suggestKey()`. Low-confidence rows start unchecked and say "Check this"; deposits and refunds say "Not a purchase?", transfers "Transfer?". The Save button shows the count and total ("Save 6 purchases · $214.37"); snapped rows save with `src: 'ai'`. At the limit: "You've used your 10 snaps this month. Join the free community and get 10 more." (with "Joined with a different email?", saved as `people.alt_email`), or at 20 "Unlimited snaps come with group coaching ($29/mo)."; always "Or type it in. That's always free." Paused: "Snaps are resting until the 1st. You can still type purchases in." Signed out: "Sign in to use snaps." Events: `snap-start`, `snap-ok`, `snap-limit-10`, `snap-limit-20`, `snap-paused`, `alt-email`.

**On the server** (`supabase/functions/ai/index.ts`, Deno): checks the sign-in (verified email only), finds the household and its time zone, the level (paid if `ai_access.paid_until` is today or later for any partner's email or alt email; community if any is in the community), the kill switch (`AI_MONTHLY_CAP_USD`, default $25: at the cap AI rests until the 1st; Brad gets one email at 80% and one at 100%), test mode, speed limits (5 snaps and 10 chat messages a minute; images over 2 MB refused) and a 24-hour pause for an account with 10+ rejected outputs in a day. `use_ai()` counts atomically (two quick taps can't both slip past the limit) and a failed AI call gives the snap back. The model is pinned to the dated `claude-haiku-4-5-20251001` (`AI_MODEL`; never a floating alias), max 1500 tokens, temperature 0, answering only through a forced `record_purchases` tool call. API version `2023-06-01` is pinned on purpose: the newer `2026-10-21` version rejects `temperature`. Every output goes through `guard.mjs` (strict schema, allowlisted categories, real dates within 60 days back / 1 ahead, $0.01–$25,000, cleaned strings: 40 characters, no links, emails, phones or long digit runs), and rows come back in the old reader's shape. The image and the text are never stored or logged, only counts and cost (Haiku 4.5: $1 per million input tokens, $5 per million output; `PRICE_IN_PER_TOKEN`, `PRICE_OUT_PER_TOKEN`). Cost per snap is roughly half a cent to a cent and a half.

**Community unlock** (`supabase/functions/community-hook/index.ts`): Zapier posts `{ email, kind: 'free' | 'paid' }` with the header `x-hook-secret`; free sets `community`, paid sets `paid_until` 35 days out. `POST .../community-hook/import { emails: [...] }` sets `paid_until` for every paid member from Skool's monthly export; anyone not on the list runs out after 35 days (Skool has no "cancelled" trigger).

**Tables** (`supabase/ai.sql`, RLS on with no policies, server only): `ai_access` (email, community, paid_until, source), `ai_usage` (owner, month, snaps, chats, cost), `ai_spend` (month, cost, alert flags), `ai_minute` (speed limits), `ai_flags` (rejections, pause), and `people.alt_email`.

**Tests:** `node tests/ai-guard.test.js` (the output checks, offline). Red team against the live function: `tests/ai-redteam.json` holds about 25 nasty inputs, each with its only allowed outcome; `AI_URL=... AI_TOKEN=... AI_ANON=... node tests/ai-redteam.js` runs them (AI_MODE=test, the account in TEST_USER_IDS) and fails on anything else. Run it before going live and after any prompt or model change.

## AI for meals: snap a recipe, update prices from a receipt
Both count as 1 snap from the same monthly limit as purchase snaps (and show "Uses 1 snap · 7 of 10 left"); the same sign-in, levels, test mode, spend cap, speed limits and probing pause apply.
- **📸 Snap a recipe** (in the meal editor, under the name; so also from Plan a meal → New meal): up to 3 photos go to `POST /functions/v1/ai/recipe` with `{ images, pantry: [{ id, name, unit }] }` (no prices). The model answers through one forced `read_recipe` call: name, plates, and ingredients `{ name, amount, unit (servings, lb, oz, count, cups, tbsp, tsp, other), pantry_id }`. `checkRecipe()` in `guard.mjs` keeps only clean names, known units, amounts 0–1000 and real pantry ids; an extra field fails the whole read. On the phone, a matched pantry item brings its price; tbsp/tsp become cups and lb/oz convert; anything that can't convert (2 cups vs a 5 lb bag) or has no amount says "Check amount · recipe says 2 cups". The name and plates fill in only when empty/new. The photo is also kept as the recipe's page. It's a draft until Save. Events: `meal-recipe-snap`.
- **📸 Update prices from a receipt** (top of Pantry prices, once there's a pantry): up to 2 images go to `POST /functions/v1/ai/prices` with `{ images, pantry, today }`. The model answers through a forced `read_prices` call: store, date, total, and lines `{ text, line_total, qty, pantry_id }`; `checkPrices()` keeps only lines matched to a real pantry item (one per item), price = line total ÷ qty. The New prices sheet lists "Milk $3.89 → $4.29" with checks (unchanged ones start unchecked) and "Also add $21.41 to Groceries" (off by default, so a receipt already added isn't counted twice). Update saves the checked prices (every meal using them updates) and, if picked, the purchase. Events: `meal-prices-snap`, `meal-prices-save`.
- Tests: `node tests/ai-guard.test.js` covers both checks.

## Chat to add purchases
A chat bar at the bottom of Add purchases, and 💬 "Tell me what you spent" in the + menu. It understands plain sentences like "HEB 84.20 groceries and 12 at Sonic yesterday."
- **Cheap first:** on the phone, `parseTyped()` reads plain purchases; if it finds clean rows (and the message isn't about balances, gratitude, the checklist or a question), they show as cards with no AI, no cost and no count. Only the rest goes to `POST /functions/v1/ai/chat` with just `{ text, categories, budgetLeft, today }` (no names, emails, account balances or numbers; runs of 6+ digits are masked on the phone first, max 300 characters).
- **Proposed actions only:** the model answers through one forced `propose_actions` call (same pinned model, max 400 tokens, temperature 0, each message sent alone with no history): `add_purchase`, `no_spend_today`, `check_daily_item` (debt, eat, lesson), `gratitude`, `update_balance` (the app matches the account; if it's unclear it asks which one), `how_much_left` (the app answers from its own numbers), and `reply` with a topic. The model never writes a sentence anyone sees: each topic maps to Brad's text in `ai.js` (`REPLIES`): advice ("That's a great question for a real person…" with Free community and Coaching buttons), unclear, off_topic, care.
- **Nothing changes until Confirm:** every action is a card with Confirm / Edit (purchases) / Skip. Purchases over $1,000 or more than 14 days back say "Just checking: $1,840 on Oct 2?"; more than 60 days back is refused. Confirmed purchases save with `src: 'chat'` and check off today's purchases half of task 1. Checklist items only apply to today and not once the day is full.
- **Won't do (v1):** delete or change past purchases, bills, debts or the budget; move money between categories; investing, tax, legal, insurance or crypto advice, or recommend products ("Should I…" gets the advice reply).
- **Guardrails:** the server checks every action (allowlisted types, topics, items and categories; dates real, within 60 days back and 1 ahead; $0.01–$25,000; echo checks: every amount and store must come from the person's message and gratitude must be copied word for word; anything else is dropped or becomes "unclear"). Hard money stress ("I don't want to be here anymore") is caught on the phone before any AI, and again on the server: nothing is logged, and a calm card shows 988 (call or text) and Message Brad (`CONFIG.supportEmail`, or the community link until it's set). Limits: 50 AI chat messages a month on free and community, unlimited on paid (fair use 1,000), its own count separate from snaps; the parseTyped path never counts; same kill switch, spend cap, speed limits and probing pause as snaps. Chat text is never stored; "Something look wrong?" on the cards sends that one exchange to Brad only if they tap Send. Footer: "Educational tool, not financial advice."
- Events: `chat-local`, `chat-ai`, `chat-confirm`, `chat-limit`, `chat-care`, `chat-report`. Red-team cases for chat are in `tests/ai-redteam.json`.

## A category's purchases
Tapping a spending category on Budget opens its purchases (was: the edit sheet, now behind "Edit category"): how much is left and spent of what, + Add spending (already set to that category, and back to the list after saving), and the purchases by day, added and imported, with × to delete added ones. A weekly category shows this week (with the week's dates) and a toggle for the whole month; a monthly one shows the month on the Budget screen. A weekly card says "left this week (since Oct 26)" when the week began last month, so last month's purchases in this week aren't mistaken for this month's. Retirement taken out before payday isn't part of the month's budget (only take-home retirement is); its card says "before payday · not in this budget".

## Saving funds: the day it saves; goals: what they set aside
A weekly saving fund saves on one day of the week (Save on: S M T W T F S in its sheet, `fund.day`, defaulting to payday's weekday), and a month counts how many of that day it has: $560 a week on Fridays is $2,240 in a 4-Friday November, $2,800 in a 5-Friday month. The card says "+$500.00 every Fri" and the section header shows this month's total ("$2,240 in Nov"). A goal with a date sets its share aside each paycheck (left ÷ paydays until the date); its card now says so ("Setting aside $67 a paycheck until Jun 1") with a switch to stop (`goal.paused`), and then nothing comes out of the budget for it (that money goes to the current step like any other leftover).
