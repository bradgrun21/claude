# Wedding Planner & Budget - how to publish it

Everything here is ready except the Google Sheets copy links, which only you can make.

## What is in this folder

| File | What it is for |
|---|---|
| `Wedding Planner (Neutral).xlsx`, `(Blush)`, `(Sage)`, `(Pastel)`, `(Classic)`, `(Dark)` | The blank templates buyers use, one per colour theme |
| `... - Sample Data.xlsx` (Neutral and Blush) | Filled-in copies buyers can explore |
| `Wedding Planner - START HERE.pdf` | The file Etsy delivers. Its eight links are placeholders until step 4 |
| `listing-images/` | Ten listing photos, 2400 x 1800 |
| `LISTING.md` | Title, 13 tags, description, price - paste into Etsy |
| `_build/` | The build script, previews and specs. Not for buyers |

## Steps

1. **Upload** the eight .xlsx files to a Google Drive folder you will never edit.
2. **Convert** each one: open it, then File → Save as Google Sheets.
3. **Check** each converted sheet with the list below.
4. **Share and link:** Share → Anyone with the link → Viewer. Copy the link and change the ending from
   `/edit...` to `/copy`. Put the eight links in `_build/delivery.json` and run
   `python .claude/skills/etsy-sheet-builder/scripts/make_delivery_pdf.py products/wedding-planner/_build/delivery.json`
   (or ask Claude to). A link that is still missing shows in red.
5. **List it:** upload the PDF and one zip of the .xlsx files as the digital files (Etsy takes five),
   add the ten images in order, paste the copy from `LISTING.md`.

## Check once in Google Sheets

The formulas were tested with LibreOffice, not inside Google Sheets, so run this once on the
Neutral sample-data copy, then open each other colour theme and glance at the first three tabs.

- [ ] All ten tabs open and look like the pictures in `_build/previews/neutral/`
- [ ] Setup: change the total budget - the planned amounts and the Budget tab change
- [ ] Expenses: add a row with a category and a real price - the Budget and Dashboard totals change
- [ ] Expenses: the Category and Vendor dropdowns list your categories and vendors
- [ ] Guest List: set a reply to Attending and give a table number - the guest appears on the Seating Plan
- [ ] Guest List: change a reply to Declined - the guest leaves the Seating Plan
- [ ] Checklist: change the wedding date on Setup - every due date moves
- [ ] Checklist: mark a task Done - it greys out and the Dashboard count changes
- [ ] Dashboard: both charts show, and "Next payments" lists the earliest unpaid items
- [ ] Progress bars show as coloured blocks, not question marks
- [ ] "Menu" links jump to the Start Here tab

If something fails, tell Claude which item and it can adjust the build.

## Things a buyer may ask

- **Cost** is the real price once one is typed, and the estimate until then.
- **One row per guest**, including plus-ones and children. That is what keeps meals and seats exact.
- **A table shows at most 10 names.** The count beside the table name turns red when it is over the
  seats-per-table setting.
- **The budget split** is a starting point drawn from common guideline ranges, not advice.

## Keeping the sample fresh

The sample wedding is 6 February 2027. Statuses such as "Overdue" and the countdown follow today's date,
so after that the sample copy reads "Married!". To refresh it, change `wdate` in `_build/build.py`
(the sample due dates move with it) and rebuild:

`python products/wedding-planner/_build/build.py`

rebuilds every workbook in all six colour themes (add `--themes neutral,blush` to build fewer).
