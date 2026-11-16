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

## Formulas

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
- Headers that sit side by side need room: check every strip in the preview for run-together labels.
- Long notes get their own merged row each; a single cell truncates at the column edge.
- Sample data should fill most slots. Half-empty tables look unfinished in listing photos.

## Proving it is right

- A clean recalculation only proves formulas run. Assert real numbers: compute a handful of totals in
  Python from the same sample data and put them in `expect.json`.
- Check the blank workbook too. Most embarrassing errors live there.
- Look at every preview. Then look again after each fix - fixes move things.
