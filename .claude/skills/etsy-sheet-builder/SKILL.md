---
name: etsy-sheet-builder
description: Build a sellable spreadsheet template for Etsy end to end - a Google Sheets + Excel workbook with dashboards, dropdowns and tested formulas, plus the listing images, delivery PDF and listing copy. Use this whenever the user wants to make, design or sell a spreadsheet template, tracker, planner or budget sheet as a digital product (Etsy, Gumroad, their own shop), asks for "a Google Sheet to sell", wants a new product for their template shop, or wants an existing template idea turned into a finished listing - even if they only name the niche ("make me a clinical hours tracker to sell").
---

# Etsy Sheet Builder

Turn a niche ("paycheck budget", "clinical hours tracker", "volunteer hours log") into a product that is
ready to list: tested workbooks, listing images, the PDF the buyer downloads, and the listing copy.
You stop at "ready to list". The seller reviews, uploads and publishes it themself - Etsy's rules are
aimed at tools that generate and publish in bulk, and a person has to stand behind what they sell.

What gets made, in the product folder:

```
products/<product-slug>/
├── <Product> (Light).xlsx                 blank, light theme
├── <Product> (Dark).xlsx                  blank, dark theme
├── <Product> (Light) - Sample Data.xlsx   filled in, for buyers to explore and for the pictures
├── <Product> (Dark) - Sample Data.xlsx
├── <Product> - START HERE.pdf             what Etsy delivers: copy links + quick start
├── listing-images/01..10.jpg              2400 x 1800
├── LISTING.md                             title, 13 tags, description, price, notes
├── README.md                              the seller's publishing steps and Google Sheets checklist
└── _build/                                previews, specs, expected values (not for buyers)
```

## The workflow

### 1. Pin down the product

Settle these before writing code. Ask only for what the request leaves open; otherwise decide and say so.

- **Who buys it and what job it does**, in one sentence.
- **What the best sellers in that niche include.** Read `references/top-sellers.md`, then search for the
  niche's current best sellers and note their tabs, features and price. Match the feature set buyers
  expect. Do not copy another seller's layout, wording, palette or screenshots - the design here is your
  own, and a look-alike gets listings taken down.
- **Tabs.** One job per tab. Most products need: Start Here, Setup, a log (the only place the buyer
  types day to day), one or more dashboards, and the niche's own trackers.
- **Inputs.** List every cell the buyer types in. Everything else is a formula.

### 2. Write the build script

Write `products/<slug>/_build/build.py` (or keep it beside the skill's example) using `scripts/sheetkit.py`.
Read `examples/budget_planner/build.py` first - it is a complete product and the pattern to follow -
and `references/build-patterns.md` for why it is shaped that way. `references/compatibility.md` is the
list of what survives Excel, Google Sheets and LibreOffice at once; a formula or feature that is not on
it does not go in.

The build must produce all four workbooks from one function (`theme` x `sample data`), so the dark
version and the sample version can never drift from the real one.

Sample data has to look like a real person's file: realistic names and amounts, a part-finished current
month, a few things over budget. Generate it with a fixed random seed. Use generic names, not brands.

While generating the sample data, compute the totals a buyer would check by hand (this month's income,
one category's spend, a balance) in Python and write them to `_build/<file>.expect.json`.

### 3. Verify, then look

```bash
python scripts/verify_workbook.py "<workbook>.xlsx" --expect "_build/<workbook>.expect.json" \
       --previews _build/previews/light --dpi 230
```

Run it on all four workbooks. It recalculates with LibreOffice and fails on any formula error, any
expected value that is off, and lists functions outside the portable set. The blank workbook matters as
much as the sample one: an empty template must show no errors and no nonsense.

Then **open every preview PNG and look at it.** The verifier cannot see a truncated header, a chart
that overlaps a table, or a tab that reads as a wall of zeros. Fix and rebuild until each tab would
look right in a listing photo. Expect three or four rounds.

### 4. Listing images

Write `_build/listing-images.json` (see the docstring in `scripts/make_listing_images.py` and the
example spec) and run:

```bash
python scripts/make_listing_images.py _build/listing-images.json
```

Ten images: a hero with the main dashboard, one per headline feature, light/dark side by side, what is
included, how it works. The pictures are the real tabs, so they cannot promise anything the file does
not do. Look at each image; shorten any headline that crowds its picture.

### 5. Delivery PDF and listing copy

```bash
python scripts/make_delivery_pdf.py _build/delivery.json     # copy links are placeholders until the seller uploads
python scripts/check_listing.py _build/listing.json          # enforces 140-char title, 13 tags of <= 20 chars
```

`references/listing.md` covers how to write the title, tags and description, pricing, and the AI
disclosure. Say plainly in the description that the template was designed with AI tools.

### 6. Hand over

Write `README.md` in the product folder with the seller's steps (upload, convert, share, copy link,
regenerate the PDF) and the Google Sheets checklist - copy the one in the example product and adjust it.
Then tell the user:

- what was built and where,
- what was verified (formula count, zero errors, how many expected values matched),
- what you could **not** verify: the workbook has not been opened in Google Sheets itself, so the
  seller must run the checklist once after converting,
- anything about the niche's best sellers you could not confirm.

## Requirements

Python with `openpyxl`, `Pillow` and `reportlab`; LibreOffice (`soffice`) and `pdftoppm` for verifying
and previews. If LibreOffice is missing, say so and stop before shipping - an untested template is the
one thing a buyer will not forgive.

## Files

- `scripts/sheetkit.py` - themes, cards, tables, inputs, dropdowns, progress bars, charts, save
- `scripts/verify_workbook.py` - recalculate, find errors, check expected values, render previews
- `scripts/make_listing_images.py` - listing images from previews
- `scripts/make_delivery_pdf.py` - the buyer's PDF
- `scripts/check_listing.py` - listing limits, writes LISTING.md
- `examples/budget_planner/` - the Paycheck Budget Planner: build script and listing image spec
- `references/top-sellers.md` - what sells and what each product type is expected to include
- `references/build-patterns.md` - how to structure a workbook that does not break
- `references/compatibility.md` - what works in Excel, Google Sheets and LibreOffice together
- `references/listing.md` - Etsy listing rules, delivery, pricing, AI disclosure
