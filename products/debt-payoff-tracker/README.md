# Debt Payoff Tracker - how to publish it

Everything here is ready except the Google Sheets copy links, which only you can make.

## What is in this folder

| File | What it is for |
|---|---|
| `Debt Payoff Tracker (Light).xlsx` / `(Dark).xlsx` | The blank templates buyers use |
| `... - Sample Data.xlsx` (light and dark) | Filled-in copies buyers can explore |
| `Debt Payoff Tracker - START HERE.pdf` | The file Etsy delivers. Its four links are placeholders until step 4 |
| `listing-images/` | Ten listing photos, 2400 x 1800 |
| `LISTING.md` | Title, 13 tags, description, price - paste into Etsy |
| `_build/` | Previews and build files. Not for buyers |

## Steps

1. **Upload** the four .xlsx files to a Google Drive folder you will never edit.
2. **Convert** each one: open it, then File → Save as Google Sheets.
3. **Check** each converted sheet with the list below.
4. **Share and link:** Share → Anyone with the link → Viewer. Copy the link and change the ending from
   `/edit...` to `/copy`. Put the four links in `_build/delivery.json` and run
   `python .claude/skills/etsy-sheet-builder/scripts/make_delivery_pdf.py products/debt-payoff-tracker/_build/delivery.json`
   (or ask Claude to). A link that is still missing shows in red.
5. **List it:** upload the PDF and the .xlsx files as the digital files, add the ten images in order,
   paste the copy from `LISTING.md`.

## Check once in Google Sheets

The formulas were tested with LibreOffice, not inside Google Sheets, so run this once on the
sample-data copy. This workbook is heavier than most (about 32,000 formulas), so also note how it feels.

- [ ] All six tabs open and look like the pictures in `_build/previews/light/`
- [ ] Payoff Plan shows a debt-free date, not an error. On the day it was built the sample showed
      37 months to go and $5,788.63 interest for Snowball; the months should match, the dates move with today
- [ ] Payoff Plan: change the method dropdown - the date, the highlighted row and the payoff order change
- [ ] Payoff Plan: type 500 in "Extra payment every month" - the debt-free date moves earlier
- [ ] My Debts: change a balance - the plan updates within a second or two
- [ ] Payment Log: add a row for an open debt - its "Balance now" on My Debts drops by that amount
- [ ] Payment Log: type a "Balance after" on that row - "Balance now" becomes that figure
- [ ] Payoff Schedule fills down to the debt-free month and highlights each payoff
- [ ] Progress bars show as coloured blocks, not question marks
- [ ] "Menu" links jump to the Start Here tab

If something fails, tell Claude which item and it can adjust the build.

## Things a buyer may ask

- **The plan starts from today.** Month 1 is the current month, so dates in the sample copy move as time passes.
- **Interest between statements is not guessed.** "Balance now" is the last balance typed in the log
  minus payments since. Typing a statement balance now and then keeps it exact.
- **Paid-off debts keep rolling.** Their minimum payment stays in the monthly total and goes to the next debt.
- **20-year limit.** A debt that takes longer shows "20+ years".

## Rebuilding

`python .claude/skills/etsy-sheet-builder/examples/debt_payoff_tracker/build.py --out products/debt-payoff-tracker`
rebuilds all four workbooks. Change the sample debts, capacity or colours in that file.
