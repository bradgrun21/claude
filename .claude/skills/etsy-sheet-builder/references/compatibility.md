# What works in Excel, Google Sheets and LibreOffice together

The workbook is written as .xlsx. Excel opens it directly; the seller uploads it to Google Drive and
saves it as Google Sheets; LibreOffice is what the verifier uses. A feature must work in all three.

## Functions

Use only these (the verifier warns about anything else):

`ABS AND AVERAGE AVERAGEIF(S) CHOOSE COUNT COUNTA COUNTBLANK COUNTIF(S) DATE DAY EDATE EOMONTH IF IFERROR
INDEX INT ISNUMBER ISTEXT LARGE LEFT LEN MATCH MAX MID MIN MOD MONTH N NOT NPER OR PMT RANK REPT RIGHT
ROUND ROUNDUP ROUNDDOWN SEARCH SMALL SUBSTITUTE SUM SUMIF(S) SUMPRODUCT TEXT TODAY TRIM UPPER VLOOKUP
WEEKDAY YEAR`

Never: `FILTER SORT UNIQUE XLOOKUP XMATCH LET LAMBDA SEQUENCE` (no spill support in a file written by
openpyxl, and the verifier's LibreOffice cannot evaluate them), `SPARKLINE QUERY ARRAYFORMULA
IMPORTRANGE GOOGLEFINANCE` (Google only), `TEXTJOIN IFS SWITCH MAXIFS` (need a hidden prefix and array
handling that differs between apps).

## Features

| Feature | Use | Avoid |
|---|---|---|
| Progress bars | `kit.bar_formula` (REPT of block characters, Arial) | data bars, SPARKLINE |
| Dropdowns | list from a range, or a short inline list | dependent dropdowns via INDIRECT |
| Conditional formats | rules that reference their own sheet | rules pointing at another sheet (Google drops them) |
| Charts | doughnut, column, bar, line with explicit colours | combo charts, secondary axes, sparklines |
| Checkboxes | a text status from a formula ("✓ Paid") | Google checkboxes (not expressible in .xlsx) |
| Links between tabs | `kit.link` cell hyperlinks | `HYPERLINK("#gid=...")` |
| Protection | sheet protection with no password, inputs unlocked | password protection |
| Fonts | Inter (in Google Fonts; Excel falls back cleanly) | fonts that exist in only one app |
| Colour scales | fine | icon sets |

## Known quirks

- **openpyxl charts get an automatic title in Excel** unless suppressed; `sheetkit` patches this.
- **openpyxl 3.1 hides chart axes** unless `axis.delete = False`; `sheetkit` sets it.
- **LibreOffice paints hyperlinks blue** whatever the cell font says. Excel and Sheets respect the font,
  so `Kit.save` strips links from the preview twin only.
- **Google Sheets owners can always edit protected cells.** Protection is a guard rail in Excel only;
  the instructions tab should say how to switch it off.
- **Currency symbols are part of the number format**, so a formula cannot switch them. Ship one currency
  and tell the buyer how to change the format.
- **Validation lists from a formula-filled range** show blank entries at the end in Excel. Harmless.

## Not verified by this skill

Nothing here opens the file in Google Sheets or Excel itself. The seller's README must include a
checklist to run once after converting: every tab opens, dropdowns work, changing a selector updates
the tab, charts show, typing a transaction changes the dashboard, links between tabs work.
