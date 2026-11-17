# The Etsy listing

## Hard limits (checked by `scripts/check_listing.py`)

- Title: 140 characters.
- Tags: 13, each 20 characters or fewer. Use all 13. Multi-word phrases beat single words.
- Digital files: 5 per listing, 20 MB each. Deliver the PDF plus one zip of the .xlsx files - with
  six colour themes there are always more than four.
- Photos: Etsy has offered 10 to 20 slots; make ten and check the current number. First photo is the
  thumbnail - it must read at thumbnail size.

These limits are from general knowledge of Etsy's listing form; confirm in the form itself if a
number matters.

## Title

Front-load what a buyer types: product, then platform, then method and extras.
`Paycheck Budget Planner Google Sheets Excel, Budget by Paycheck Spreadsheet, Biweekly Monthly Budget, ...`
No claims the file cannot keep ("#1", "best").

## Tags

Mix: the product ("paycheck budget"), the platform ("google sheets budget"), the method ("zero based
budget"), the parts ("bill calendar", "debt tracker"), the audience when there is one ("nurse budget").
Do not repeat the same phrase with words reordered.

## Description

First two lines carry the pitch - they show before "more". Then: what is included (tab by tab), what
they receive (files), good to know (limits, capacity, currency), what they need, how it works in three
steps, and the plain notes: digital item, no returns, personal use, made with AI tools.

State capacity honestly ("up to 16 bills"). Say what it does not do if buyers might assume it
(no bank sync, no phone app of its own).

## Price

Category leaders show at $2-$4 on a permanent sale from a list price near $9-$13. A new shop without
reviews should match that band, then raise it once reviews arrive. Bundles of several templates sit at
$9-$20.

## Delivery

Etsy cannot deliver a link, so the buyer downloads a PDF that carries it:

1. Upload each .xlsx to Google Drive, open it, File → Save as Google Sheets.
2. Share → General access → Anyone with the link → Viewer.
3. Copy the link and change the ending from `/edit...` to `/copy`.
4. Put the links in `_build/delivery.json` and re-run `make_delivery_pdf.py`. It prints any link still
   missing and paints it red in the PDF.

Keep the master Google Sheets in a folder that is never edited; buyers copy from them forever.

## AI disclosure and originality

Etsy's Creativity Standards (etsy.com/legal/creativity) govern AI-made items. Third-party reports in
2026 say disclosure is required and that tools which generate and publish in bulk are the target of
the latest tightening; those reports disagree on details, so read the policy page itself before
listing. Whatever it says today: answer Etsy's "how was it made" question truthfully, say in the
description that AI tools were used, and have the seller test the file by hand before it goes live.

Model the feature set on best sellers; never reuse their wording, palette, layout or images.
