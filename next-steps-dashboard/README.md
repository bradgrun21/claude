# Next Steps Dashboard (Google Apps Script)

Charts each next step (Growth Track steps 1–3, Growth Track Complete, Baptism, and any other dated profile field) as a running total for the year, next to the same point last year.

The data stays in your Google Sheet. The script reads the date columns, counts them by day, and sends only those counts to the dashboard page. No names or other personal fields are read.

## What it shows

- **Number tiles**: total for the selected year so far, the total for the comparison year through the same date, and the change.
- **Running total chart** per step: this year (solid blue) against the comparison year (dashed).
- **By month** toggle on each chart: monthly counts side by side.
- **Year / Compare to** pickers, plus a **Campus** picker when `CONFIG.campusHeader` is set.

## Setup

1. Export People from Planning Center with the date fields you want (baptism date, Growth Track Step 1/2/3, Growth Track Complete, etc.).
2. In a Google Sheet, create a tab named `PCO Export` and paste the export with the header row in row 1.
3. **Extensions → Apps Script.** Create three files and paste in the contents of:
   - `Code.gs`
   - `Dashboard.html` (create it as an HTML file named `Dashboard`)
   - `appsscript.json` (Project Settings → check "Show appsscript.json")
4. Edit the `CONFIG` block at the top of `Code.gs` so each `header` matches your export's column name exactly. Set `campusHeader` if you want a campus filter. Set `timeZone` in `appsscript.json` if Central isn't right.
5. Reload the sheet. Use **Next Steps → Check headers** to confirm every column is found, then **Next Steps → Open dashboard**.

### Optional: a link for staff

**Deploy → New deployment → Web app.** It runs as you and is limited to your Google Workspace domain (`appsscript.json` → `webapp.access`). Anyone with the link sees the same counts.

## Updating

Paste a fresh export over the `PCO Export` tab and reopen the dashboard.

## Accepted date formats

Real Sheets dates, `YYYY-MM-DD` (with or without a time after it), and `M/D/YYYY`. Blank cells are skipped. Each filled cell counts once in the year of its date.
