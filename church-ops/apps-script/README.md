# Count On It — Google Sheet + dashboard

One Apps Script project that turns any blank Google Sheet into a church numbers
tracker with a dashboard. Built for Palm Valley first, reusable for any church:
campuses, congregations and owners all live in the sheet, not the code.

## Install (about 5 minutes)

1. Create a blank Google Sheet. Name it something like "Count On It – [Church]".
2. **Extensions > Apps Script.** Delete what's in `Code.gs`.
3. Create these files and paste in the contents from this folder:
   - `Code.gs`
   - `Pco.gs` (optional Planning Center pull)
   - `Dashboard.html` (File > + > HTML, name it exactly `Dashboard`)
   - `appsscript.json`: Project Settings > check "Show appsscript.json", then paste it in.
     Change `timeZone` if the church isn't in Arizona.
4. Save, go back to the sheet and reload. A **Count On It** menu appears.
5. **Count On It > Set up this sheet.** Approve the permissions prompt.

## Tabs it creates

| Tab | What it's for |
|---|---|
| **Setup** | Church name, week start day, and segments (one per row: Campus 1, Campus 2, Spanish…). |
| **Data Map** | Every number: what counts, owner (role), where it's recorded, deadline, what it flows to, status, whether it splits by segment, unit. Starts with 34 numbers from the checklist. |
| **Weekly Numbers** | One row per week × number × segment. Use **Add this week's rows** so staff only type values. |
| **Health Audit** | Planning Center issues (duplicates, missing campus/language, groups with no leader…). Baseline vs. current vs. target, with progress. |
| **Hours Log** | Hours by area and segment, so you know what a Reset really costs. |
| **PCO Pulls** | Created the first time you pull from Planning Center. |

## Weekly routine

1. Monday: **Count On It > Add this week's rows.** It adds a blank row for every number marked
   Tracked or Partial, for each segment when the number splits.
2. Owners fill in the Value column by their deadline.
3. **Count On It > Open dashboard.**

A number only shows on the dashboard once its Data Map status is Tracked or Partial. Everything else
shows as a blank "No data" tile with who owns it and what nobody gets because it isn't tracked.

## Dashboard as a link (optional)

Deploy > New deployment > Web app. The manifest sets it to run as you and be visible only to you.
To share with staff, change "Who has access" to your Google Workspace domain. Giving numbers are on
the dashboard, so think about who should see it before widening access.

## Planning Center pull (optional)

1. Create a personal access token at api.planningcenteronline.com, ideally on a login with the
   least access that can read what you need.
2. **Count On It > Planning Center: set credentials.** Stored in your own Google account's
   properties, not in the sheet.
3. **Count On It > Planning Center: pull counts.** Fills the PCO Pulls tab with `meta.total_count`
   for each API path listed there. Add your own rows (any list endpoint, with filters) and check
   each one against the Planning Center API docs.

## Demo mode

**Load sample data** fills a *copy* of the sheet with 10 weeks of made-up numbers for a
three-segment church. Use it for videos and sales calls, never on a real church's sheet.

## For a new church

Make a copy of a freshly set-up sheet (or repeat the install), then change the Setup tab and the
Data Map owners. No code changes needed.
