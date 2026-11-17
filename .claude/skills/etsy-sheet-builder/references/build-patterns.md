# How to structure a workbook that does not break

These come from building the example. Each one fixed a real problem.

## Shape

- **One hidden `Calc` sheet** holds every list, lookup table and scalar (selected month number, period
  start and end, chart helper values). Visible sheets stay readable and a dropdown has one stable source.
- **Fixed slots, not growing tables.** Give each list a fixed number of rows (6 income sources, 16 bills).
  Every formula tests the name cell first (`=IF($B10="","",...)`) so unused slots are simply blank.
  Dynamic ranges need functions that do not survive all three apps.
- **One log is the only daily input.** Dashboards read it with `SUMIFS`. Add helper columns to the log
  (type, month number) so dashboards never need array formulas.
- **Selectors, not copies.** One dashboard with a month dropdown beats twelve monthly tabs: one set of
  formulas to get right, and the buyer never duplicates sheets.
- **Defaults the buyer can override.** A plan grid whose cells are `=Setup amount` lets someone type over
  one month without touching the rest. Style those cells `soft=True`.
- **Dependent dropdowns do not port.** Use one combined category list and derive the type with a lookup.
- **Compact a list with gaps** using a running count column and `INDEX/MATCH` (see Calc columns F and G
  in the example) rather than `FILTER`.
- **"k-th item on this day"** (calendar cells) uses a key column - `day*100 + COUNTIF(day$1:day_i, day_i)` -
  and `INDEX/MATCH` on `day*100+k`.

## Forecasts and simulations

When a product has to project forward (debt payoff, savings growth, loan schedules), put the
simulation on hidden sheets as a grid: one row per period, a block of columns per item. The debt
tracker example runs 240 months x 15 debts for three methods this way.

- Give every row of a column **the same formula**, and make each cell depend only on the row above
  and on fixed header rows. A cell that sums its own row while other cells in that row wait on it
  was evaluated out of order by LibreOffice when the file was opened, giving a wrong number that
  looked healthy. Rewriting the cell to read only the previous row fixed it.
- Sharing a pool in priority order needs no sorting: keep each item's rank in a header row and use
  `SUMIF(rank_row, "<"&my_rank, need_row)` to find what the items ahead of this one will take.
- Rank with `SUMPRODUCT(--(range<x))+SUMPRODUCT(--(range_to_here=x))`. It breaks ties by position and
  compares numbers as numbers; `COUNTIF(range,"<"&x)` turns x into text and can misjudge decimals.
- "Latest entry for this name" in a log: a helper column flags a row when `COUNTIFS` finds no later
  row for the same name, then `SUMIFS(..., flag, 1)` reads it. No array formulas.
- To show a sorted table, put `MATCH(k, rank_column, 0)` on Calc and `INDEX` every column with it.
- Write the same logic a second way in Python (a plain loop, not a mirror of the formulas) and assert
  months, totals and one or two per-item results. Then run it against odd inputs: one item, the
  maximum, an item that can never be paid, every method. That stress run found two real problems in
  the debt tracker that the sample data alone did not.
- Keep the visible schedule on the same row numbers as the hidden grid so references stay trivial.

## Formulas

- **Name every scalar.** Keep a dict of scalar names to cells and build every reference from it. Typing
  `$AI$14` by hand put four formulas on the wrong row in the debt tracker; the expected-value check
  caught it, but only because the totals were asserted.

- Guard every division and lookup. A blank template must show nothing wrong: `IF(N(total)<=0,"",...)`,
  `IFERROR(INDEX(...),"")`.
- `N()` turns `""` into 0 when a formula result might be blank.
- Money formats show a dash for zero (`kit.money`) so an empty template is calm, not a wall of $0.00.
- Avoid `TEXT(date,"mmm")` for month names; index into a month list on Calc. Format codes are
  locale-dependent in some setups.
- `TODAY()` is fine for "months left" style cells. Remember previews are rendered on the build date.

## Layout

- Column A and the last column are 2-wide margins. Two blocks of five columns with a 3-wide gutter
  gives a balanced dashboard.
- A component that sets row heights (`kit.card`) must not share rows with another layout unless called
  with `set_heights=False`. This is what made the calendar weeks uneven in the first build.
- Chart width in cm ≈ (sum of column widths × 7 + 5 per column) px ÷ 37.8. A chart wider than its
  columns overlaps the next table.
- Chart height in cm ≈ rows × row height in points ÷ 28.35 (the default 21 pt row is 0.74 cm). Row
  heights are points, not pixels - sizing by pixels leaves a third of the chart area empty.
- Give a line chart 13 points or fewer on the x axis. Sample the series (every n-th month) on Calc so
  the labels stay readable whatever the time span.
- A banner's title and subtitle rows are merged across `title_cols`; anything else on those rows has
  to sit to the right of that span or openpyxl raises a MergedCell error.
- Headers that sit side by side need room: check every strip in the preview for run-together labels.
- Long notes get their own merged row each; a single cell truncates at the column edge.
- Sample data should fill most slots. Half-empty tables look unfinished in listing photos.

## Proving it is right

- A clean recalculation only proves formulas run. Assert real numbers: compute a handful of totals in
  Python from the same sample data and put them in `expect.json`.
- Check the blank workbook too. Most embarrassing errors live there.
- Look at every preview. Then look again after each fix - fixes move things.
