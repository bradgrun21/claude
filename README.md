# Life City

A miniature 3D island city that grows with a family's real money steps and everyday habits.
It is a **separate app** from Find Me the Money. It has its own repo and Netlify site, and it shares no Supabase tables or data.

Phase 1 runs on the numbers a family types in during setup (or Maya's sample city). Everything is saved
**in the browser only** (`localStorage`). Nothing is uploaded.

---

## What Brad needs to do by hand

1. **Create the empty GitHub repo** `bradgrun21/life-city` (no README, no license, so it stays empty). Claude pushes the code.
2. **Download an art pack (optional, looks better)**, both CC0:
   - Kenney **City Kit (Suburban)**: https://kenney-assets.itch.io/city-kit-suburban
   - KayKit **City Builder Bits**: https://kaylousberg.itch.io/city-builder-bits
   Unzip, copy the model files into `public/models/` (see "Adding models" below), commit and push.
   With no models, the city uses its built-in code-made models, so nothing breaks.
3. **New Netlify site**: Netlify → *Add new site* → *Import an existing project* → GitHub → `life-city`.
   The build settings come from `netlify.toml` (`npm run build`, publish `dist`). This is a **new** site.
   Do not touch the findmethemoney.app site.
4. **Custom domain** `city.findmethemoney.app`:
   - In the new Netlify site: *Domain management* → *Add a domain* → `city.findmethemoney.app`.
   - In Cloudflare (findmethemoney.app zone) add **one** record: `CNAME` · name `city` · target `<your-new-site>.netlify.app` · **Proxy status: DNS only (grey cloud)**.
   - Netlify issues the HTTPS certificate on its own after the record resolves, usually within a few minutes.
   No other DNS record changes. The live app's records stay as they are.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (also on your Wi-Fi for phone testing)
npm test           # unit tests (storm, rating, costs, materials, orders, train, construction, population, tower)
npm run build      # production build in dist/ (also writes the offline service worker)
npm run preview    # serve dist/ at http://localhost:4173
```

Add `?debug` to the URL for an on-screen counter (fps, quality, draw calls) and boot timings in the console.

Node 20+ is required.

## Deploy

Push to `main` and Netlify builds and deploys on its own. `netlify.toml` sets:
- `sw.js` → `no-cache`, so updates reach people on the next visit
- `/assets/*` → cached for a year (file names are hashed)
- Node 20

## Adding models

1. Copy the `.glb` / `.gltf` files into `public/models/` (subfolders are fine).
   - Kenney: everything inside `Models/GLB format/`
   - KayKit: everything inside `Assets/gltf/`. Keep each `.gltf` with its `.bin` and texture files.
2. Run `npm run dev` (or `npm run models`). The scanner writes `public/models/manifest.json` and prints what it found:
   `[models] 64 model file(s) found. Using house: 21, tree: 4, lamp: 1, car: 5, bench: 1`
3. Houses, trees, street lamps and cars are picked up by file name. To choose files yourself, create
   `public/models/roles.json`:
   ```json
   { "house": ["building-type-a.glb", "building-type-f.glb"], "tree": ["tree-large.glb", "tree-small.glb"] }
   ```
4. Commit the model files (CC0, fine to publish), so Netlify gets them. They are cached for offline use too.

How it works: models are resized to fit a tile, drawn with GPU instancing (one draw call per model part,
however many copies), and any file that fails to load quietly falls back to the code-made model.
Taller houses are used for upgraded homes. The unique town buildings (chapel, bank, town hall, clock tower,
train, etc.) stay code-made.

---

## Game rules (product decisions, kept exactly) and where they live

| Rule | File |
|---|---|
| Storm = 0.55 × cushion gap + 0.45 × min(1, debt ÷ 30,000) + stall drift (max 0.25); levee × 0.78; seawall × 0.5; labels; water never above grass; gentle 55%; over budget never raises water | `src/systems/storm.js` |
| Districts unlock only by real money steps (Riverside, Bridgeview, Hillside), sticky once open | `src/systems/money.js` |
| Build points only from habits and logging; costs road 20 · park 30 · upgrade 50 · home 60 | `src/systems/build.js`, `src/systems/tasks.js` |
| Mayor rating = weighted bars (30/20/20/15/10/5 by the family's ranking); bars ease down, never below 20, refill when logged | `src/systems/rating.js` |
| Task bubbles = only the family's own goals | `src/systems/tasks.js`, `src/main.js` |
| Surprises cosmetic only + sticker book | `src/systems/surprises.js` |
| No red, no X's, no "missed", no dollar amounts on the (shareable) town paper | `src/styles.css`, `src/systems/paper.js` |
| Materials (one per bar), cap 3 per material per day | `src/systems/materials.js` |
| Recipes (points-only small builds; community buildings + landmarks need materials + points) | `src/systems/recipes.js` |
| Order board (max 3, size = min(3, ceil(goal ÷ 3)), stars + stamps, "Not this week", morning refill, payday swap) | `src/systems/orders.js` |
| Payday train (stars, car thresholds, 3 lowest-stocked materials + decoration per car, harvest 5 points per crop) | `src/systems/train.js` |

**Never added:** paid currency, timer skips, storage limits, energy/lives, countdown sales, FOMO pop-ups,
random paid rewards, materials from dollar amounts, penalties or red for skipped orders.
Tiers (Free vs $29/mo) are not built yet. Nothing in the game is for sale.

## What's built

**Part 1: new app**
- Vite + plain JS modules, `three@0.160.0` from npm (no CDN), self-hosted fonts
- Setup in five quick steps: household, the 4 numbers (+ optional savings), rank what matters, weekly goals, family and pets
- The city appears at the family's real storm level, then one move (set a payoff date) drops the water
- Building stories: tap any building to see what built it and when
- Garden: each logged day plants a crop; the payday train harvests it into build points
- Debt-free clock tower: shows the date; extra payments steal days back
- Town paper written from the family's real week (no dollar amounts)
- Tilt-shift miniature look, soft shadows, sky gradient, GPU water waves, storm rain, day/night
- Sound + haptics, all synthesized (no audio files), silent until the first tap, mute toggle
- Two quality levels, High and Battery saver, picked by device. Auto mode steps down if High can't hold the frame rate; the setting is in Settings.
- PWA: manifest, icons, install to home screen, offline cache
- "Start over" in Settings

**Part 2: economy, Phases A and B**
- Materials + HUD chips · recipes in build mode · order board building next to Town Hall with a bubble when an order can be delivered
- Payday train on an elevated rail loop with a station. It arrives on payday from setup, and the Storm tab's payday button triggers it in the demo. Tap a car or its bubble to open the crate.

**Waiting for Brad's OK (Phase C):** construction timing, builder slots, population caps and cushion tower brick production
have their **logic and unit tests** in `src/systems/construction.js`, `population.js` and `cushionTower.js`, but they are **not wired into the game yet**.
**Phase D** (eras, events, resident cards) is stubbed as data in `src/systems/eras.js`, `events.js` and `residents.js`.

## Project layout

```
src/
  main.js            app start-up, game actions, input
  data/              areas, layout, state (one object, saved to localStorage), demo city
  systems/           pure game rules (no three.js; unit-tested)
  scene/             renderer stage, camera, lights, sky, water, post effects, quality
  world/             city builder, models, instancing/baking, art-pack loader, actors, train, surprises, rain, effects, labels
  ui/                setup, panel tabs, icons
  audio/             synthesized sound + haptics
tests/               vitest unit tests
scripts/             scan-models.mjs (art pack), make-icons.cjs (PWA icons)
public/              manifest, icons, models/
```

## Later (not built)
- Sign in with the same Supabase project so the city reads the family's real plan (read-only first)
- Friends' cities, pods, coach view, real opted-in community totals
