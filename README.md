# Life City

A bright town-building game that grows with a family's real goals and habits. It is a **separate app** from
Find Me the Money: its own repo and its own Netlify site, sharing no Supabase tables and no data.

Phase 1 saves everything **in the browser only** (`localStorage`). Nothing is uploaded.

## How it plays (v2, Nov 2026)

- **One open map.** No fog, nothing hidden. Build anywhere on the grid. Every building except decorations must
  touch a **road that leads back to the Town Hall**. Roads join up on their own.
- **Five areas**, each with its own buildings:

  | Area | Main building (free) | Then, by level |
  |---|---|---|
  | Spiritual | **Church** *or* **Reflection Garden** (the family picks) | Study Hall · Worship Pavilion · Retreat Lodge |
  | Physical | Gym | Sports Field · Swimming Pool · Wellness Clinic |
  | Financial | Bank | Savings Tower · Market · Office Tower |
  | Relational | Park | Coffee House · Family Diner · Event Hall |
  | To-Do | Community Job Board | Workshop · Post Office · Library |

  An area's main building unlocks the moment the family **sets that area's first big goal**. Every building is one
  **list**: a big goal plus up to 6 small tasks (every day, N times a week, or one time). More buildings mean more lists,
  and higher-tier buildings pay more per task (1×, 1.5×, 2×, 3×), so earning grows as you progress.
- **Three currencies**
  - **XP** comes from checking off tasks, 3 daily challenges, milestones and quick wins. It fills the level bar.
  - **Coins** come from checking off tasks and reaching big goals. They pay for buildings, homes, upgrades and roads.
  - **Population** comes from homes (Cottage, Family House, Townhouse, Apartments) and home upgrades.
  - **Leveling up needs XP and population.** Levels 5, 9 and 13 also need a bigger **Town Hall**, and its upgrade needs population and coins.
    Each Town Hall level adds +10% coins to every task.
- **Guided tour + quick wins.** A friendly town planner walks a new family through their first goal, placing the
  building by a road, checking off a task, and building a home (level 2 arrives during the tour). A "Quick wins"
  checklist pays out for the next first steps.
- **Never sold:** progress, levels, coins, unlocks. No paid currency, timers, energy, or countdown sales.
  No red, no X's, no "missed". The weekly town paper never shows dollar amounts.
- Also: building stories (tap any building), move/rotate buildings, day/night, sound and haptics (silent until first tap,
  mute in the menu), sticker book for cosmetic surprises, offline play, install to home screen.

The earlier storm, materials, order board and payday train design is preserved in the git history (commit `22b7cd0`)
in case any of it should come back.

## What Brad needs to do by hand

1. **Give Claude's GitHub app access to `bradgrun21/life-city`**: github.com/settings/installations → Claude →
   Repository access → add `life-city` (or choose All repositories). Then Claude can push.
2. **New Netlify site:** Add new site → Import from GitHub → `life-city`. Build settings come from `netlify.toml`.
   Don't touch the findmethemoney.app site.
3. **Domain** `city.findmethemoney.app`: add it in the new site's Domain management, then in Cloudflare add one
   `CNAME` record named `city` → `<new-site>.netlify.app`, **DNS only (grey cloud)**. No other DNS changes.
4. **Art pack (later):** v2 uses its own code-made models. The Kenney/KayKit loader from v1 (`src/world/gltf.js`) still works but is not yet hooked up to the v2 buildings. That's a good next step once a pack is downloaded.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests: levels, currencies, placement + road rules, lists, challenges, quick wins
npm run build      # production build in dist/ (+ offline service worker)
npm run preview    # serve dist/ at http://localhost:4173
```
Add `?debug` to the URL for an fps / draw-call counter. Node 20+.

## Where the rules live

| Rule | File |
|---|---|
| Buildings, areas, costs, unlock levels, home population | `src/data/catalog.js` |
| XP/population level table, Town Hall gates, task + goal rewards | `src/systems/economy.js` |
| Grid, overlap, water, road connection to the Town Hall | `src/systems/placement.js`, `src/data/map.js` |
| Lists and tasks (daily / weekly / one-time), goals reached, streak | `src/systems/lists.js` |
| Daily challenges, milestones, quick wins | `src/systems/challenges.js` |
| Saved state (one object, localStorage) | `src/data/state.js` |

## Project layout

```
src/
  main.js        game start-up, actions, placement + road modes, panels, guided tour
  data/          catalog, map, state, sample town
  systems/       pure game rules (no three.js; unit-tested)
  scene/         renderer, camera (pan + zoom, fixed angle), lights, sky, sea, quality levels
  world/         painted terrain + nature, roads, building models, buildings/ghost/walkers, thumbnails, effects
  ui/            setup, panels, tour, icons, HUD art
  audio/         synthesized sound + haptics
tests/           vitest
```
