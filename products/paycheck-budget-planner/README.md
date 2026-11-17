# Paycheck Budget Planner - how to publish it

Everything here is ready except the Google Sheets copy links, which only you can make.

## What is in this folder

| File | What it is for |
|---|---|
| `Paycheck Budget Planner (Classic).xlsx`, `(Neutral)`, `(Blush)`, `(Sage)`, `(Pastel)`, `(Dark)` | The blank templates buyers use, one per colour theme |
| `... - Sample Data.xlsx` (Classic and Dark) | Filled-in copies buyers can explore |
| `Paycheck Budget Planner - START HERE.pdf` | The file Etsy delivers. Its eight links are placeholders until step 4 |
| `listing-images/` | Ten listing photos, 2400 x 1800 |
| `listing-video.mp4` | A 15-second silent demo for the listing's video slot |
| `LISTING.md` | Title, 13 tags, description, price - paste into Etsy |
| `_build/` | Previews and build files. Not for buyers |

## Steps

1. **Upload** the eight .xlsx files to a Google Drive folder you will never edit.
2. **Convert** each one: open it, then File → Save as Google Sheets.
3. **Check** each converted sheet with the list below.
4. **Share and link:** Share → Anyone with the link → Viewer. Copy the link and change the ending from
   `/edit...` to `/copy`. Put the eight links in `_build/delivery.json` and run
   `python .claude/skills/etsy-sheet-builder/scripts/make_delivery_pdf.py products/paycheck-budget-planner/_build/delivery.json`
   (or ask Claude to). A link that is still missing shows in red.
5. **List it:** upload the PDF and one zip of the .xlsx files as the digital files (Etsy takes five), add the ten images in order and the video,
   paste the copy from `LISTING.md`.

## Check once in Google Sheets

The formulas were tested with LibreOffice, not inside Google Sheets, so run this once on the
sample-data copy:

- [ ] All ten tabs open and look like the pictures in `_build/previews/classic/`
- [ ] Dashboard: change the month dropdown - numbers and charts change
- [ ] Paychecks: change the paycheck number - due bills change
- [ ] Bill Calendar: change the month - days and bills move
- [ ] Transactions: add a row (date, category, amount) - the Dashboard total changes
- [ ] Setup: rename a category - it changes on every tab and in the Transactions dropdown
- [ ] Progress bars show as coloured blocks, not question marks
- [ ] "Menu" links jump to the Start Here tab
- [ ] The font looks right (Inter). If not, select all and pick a font you like

If something fails, tell Claude which item and it can adjust the build.

## Rebuilding

`python .claude/skills/etsy-sheet-builder/examples/budget_planner/build.py --out products/paycheck-budget-planner`
rebuilds every workbook in all six colour themes (add `--themes classic,dark` to build fewer). Change the starter categories, sample household, colours or year in that file.
