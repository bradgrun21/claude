# Colour palettes

## What the research shows (November 2026)

Nothing ties a colour palette to sales. Etsy publishes no sales figures, and the trend blogs that quote
click-through lifts for palettes cite no method. What can be read is which colour themes keep turning up
in the most-reviewed budget and finance spreadsheet listings, from their titles and descriptions as they
appeared in search results:

| Theme | Where it showed up |
|---|---|
| Neutral: white, beige, warm brown | A top finance spreadsheet ships "white, beige, black"; white-and-beige recurs in the same results |
| Dark | "Dark Mode" is in the title of the most-reviewed budget planner seen (~12.8k reviews) |
| Pastel, multi-colour | "Pastel palette" and "pastel" colourways; one colour-coded listing uses pastels throughout |
| Blush pink | Blush and pink-and-white templates appear repeatedly; one shop sells Pastel / Pink / Blue versions |
| Sage green | "Soft sage green" and "Serene Sage" versions |

Other signals: sellers bundle colourways (three themes, four colours, "9 color modes"), so several themes
in one listing is normal. Etsy's 2026 trend coverage describes a move toward warm, soothing tones over
cold minimalism; one source names a blue as Etsy's colour of the year, which was not confirmed elsewhere.
Rainbow and high-contrast palettes did not stand out.

Treat this as "what buyers are used to choosing between", not "what sells most". If the user has eRank,
EverBee or Marmalead, ask them for colour-keyword volumes - that is the evidence these notes lack.

## The six built-in palettes

`Kit(theme=...)` takes `classic`, `neutral`, `blush`, `sage`, `pastel` or `dark` (`THEME_ORDER`).

| Name | Look | Notes |
|---|---|---|
| classic | Warm paper, deep teal banner, five clear category colours | The house default, not from the research |
| neutral | Beige page, espresso banner, olive / dusty blue / clay / wheat / mauve | Closest to the "white and beige" best sellers |
| blush | Blush page, deep rose banner, dusty accents | |
| sage | Pale sage page, deep sage banner, earth tones | |
| pastel | Lavender banner, pastel header fills with dark text | Each category has a darker `_ink` twin for text, bars and thin chart lines |
| dark | Near-black page, bright accents | |

These are original palettes in those colour families. Do not sample colours from another seller's listing.

Input cells stay cream-yellow in every theme (dark yellow in dark) so the instructions can say "yellow
cells" everywhere.

## Shipping themes

- Build every theme from the same function; the examples loop over `THEME_ORDER`.
- Ship a blank workbook per theme, and sample-data copies for two (`SAMPLE_THEMES`). The other themes'
  sample copies are built into `_build/theme-samples/` only to photograph.
- More themes means more for the seller to upload and convert (one Google Sheet each). Six is plenty;
  `--themes classic,neutral,dark` builds fewer.
- Use the `grid` layout in `make_listing_images.py` for a "six colour themes" image, and keep the hero
  in the palette that matches the shop's other listings.
- The delivery PDF lays links out in two columns when there are more than four.

## Adding or changing a palette

Add a dict to `THEMES` in `scripts/sheetkit.py`, or pass `Kit(theme="classic", palette={...})` to override
keys. Then run `python scripts/sheetkit.py`: it checks contrast for body text, the banner, header text
on every category fill, category colours used as text, and good/bad numbers. A custom palette that fails
raises an error when the Kit is created. Pale category fills need `on_cat` set to a dark colour and an
`_ink` twin per category (see `pastel`).

Never write a hex colour or `if theme == "dark"` in a build script. Use palette keys (`"quiet"` for the
muted chart series, `"line"`, `"surface"`) so every theme stays correct.
