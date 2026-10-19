# Find Me the Money (beta)

A payday plan, a debt snowball countdown and goals with real dates, built on a 7-step plan
(starter cushion → debt snowball → full safety net → invest → kids' college → home → build & give).

**Privacy by design:** everything is stored in the person's own browser. Bank CSV files are read on
the phone and never uploaded. There is no server, no account and no database.

## What's in the beta
- Setup in 5 short steps: paycheck and schedule, monthly bills, debts, savings and giving, fun money
- Optional bank CSV import (Chase-, Capital One-, Apple Card- and credit-union-style exports)
- Swipe deck: the person sorts each store into Need or Want (nothing is pre-tagged)
- "Found money": pick a new fun-money limit and see what it frees up
- Payday Plan: every dollar of each paycheck gets a job
- Home: countdown to the current step's finish line, snowball list, goals with a tradeoff slider
- Payday check-in: type real balances, see how far the date moved, celebrate payoffs
- Calendar reminders (.ics), backup/restore file, delete everything, privacy page

Not in the beta: AI statement reading, bank linking, accounts or sync, payments, App Store app.

## Try it on your computer
```
cd find-me-the-money
python3 -m http.server 8000
```
Open http://localhost:8000

## Put it online (about 5 minutes, free)
**Netlify Drop (easiest):**
1. Go to https://app.netlify.com/drop and sign up (free).
2. Drag the whole `find-me-the-money` folder onto the page. You get a link like `https://something.netlify.app`.
3. Optional: Site settings → Domain management → add your own domain.

**Updating later:** drag the folder onto your site's Deploys page again. Before each update, change
`VERSION` at the top of `sw.js` (any new text) so phones pick up the new files.

## Before you send it to friends and family
- [ ] Set `feedbackUrl` at the top of `app.js` to a Google Form (or similar) so testers can reach you
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
- `privacy.html`, `manifest.webmanifest`, `sw.js` (offline), `icons/`

*An educational budgeting tool, not financial, tax or investment advice.*
