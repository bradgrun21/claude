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

  **Areas open one at a time** so nobody gets five lists on day one: To-Do → Financial → Relational (once the
  budget is set up) → Physical → Spiritual. An area opens when the one before it is built and has something on it.
  Each building holds one **list** with two kinds of things, added with **+ Task** and **+ Goal**:
  - **Tasks**: simple things like "Do the dishes". How often (Daily, 1–6×/week, Once) sits on the right of each row.
  - **Goals**: something bigger ("Run a 5K") with optional steps under it. **Completed the goal?** asks for a recap
    (and a photo if you like), saves it to Memories, and throws a parade down Main Street.
  - Every task and step can be **assigned to a family member** (their color dot shows on the row) or left for everyone.
  - Goals can have an optional **target date**, shown gently ("10 days to go", later "Still going strong") and on the calendar.
  - **Pause** a task, a goal, or a whole list ("Rest this list for a while"). Nothing resting is ever due, and no progress is lost.
  - **💡 Ideas** on every list and in the builder: easy tasks, goals and ready-made plans, added only with a tap.
  Higher-tier buildings pay more per task (1×, 1.5×, 2×, 3×).
- **Habits pace each area.** An area starts with one task slot. Checking a task off on 3 different days forms a
  habit (a finished goal counts too), which unlocks that area's next building and opens one more slot. A goal is one
  slot and its steps ride along; paused or finished items free their slot; habits stay counted even if a task is
  removed. Area buildings past the first open by habits, not by town level. Progress dots on each task show 1-2-3 days.
- **Lists board.** The Lists screen is a board with one column per open area: compact cards, goals with their steps,
  slots in use, "+ Add a task" when a slot is open, and what the next habit unlocks.
- **Consistency, not volume.** The first 6 check-offs a day pay in full, then a small token. The first check-off of
  the day earns a daily-visit bonus, streaks pay at 3/7/14/30/60/100 days (one rest day a week never breaks one),
  and a weekly **Week in review** pays for looking back. Buildings **grow** (pennants, then a gold star) after 10 and
  30 days of use, with scaffolding and a crane while they build.
- **Building tools.** Some buildings open a practical tool, with a ribbon cutting, a shopkeeper, one easy first step
  that pays a bonus, and small capped rewards for using it (fixed amounts, never based on dollars):
  | Building | Tool |
  |---|---|
  | Grocery Store | Meal Planner: recipe box (with starter favorites), dinners for the week, grocery list built from the plan |
  | Gas Station | Car & Home Care: oil, tires, filters, smoke detectors… log it once and it comes around again |
  | News Station | Subscriptions: monthly total, a check-in every 6 months, celebrate what you cancel |
  | Post Office | Birthdays & Cards: heads-up a week ahead, ages, “card sent”, thank-you notes; birthdays on the calendar |
  | Coffee House | Date Night Jar: draw an idea, put it on the calendar |
  | School (new) | Kids’ Corner: stars for chores and kindness (kid-assigned tasks give stars), rewards to spend them on, reading log |
  | Town Hall (level 3) | Family Meeting: celebrate, high/low check-ins, the week ahead, money minute, one focus. Counts as the weekly review |
- **Logbook buildings** keep track of things, one engine for all of them: **Repair Shop** (every service per car, with
  mileage, cost, shop and receipt photo; logging an oil change resets the Car Care reminder), **Vet Clinic** (pet
  checkups, vaccines and grooming, with a next-checkup heads-up) and **Gift Shop** (gift ideas, gifts given, everyone's
  sizes). Entries and photos stay on the device.
  **On purpose, there's no medicine/dosing tracker and no important-documents store.** A game shouldn't be anyone's
  only record of those; phones, pharmacies and a fire safe do that job reliably.
- **Earned by steady use.** 13 decorations can't be bought, only earned: use a tool in N different weeks (Farmers'
  Market Stall, Classic Car, Big Red Mailbox, Playground, Bandstand, Dog Park…), keep a 7- or 30-day best streak
  (Lantern Row, Golden Fountain), or check things off on 30 or 100 different days (Rose Arch, Town Clock Tower).
  Progress shows in Profile → Earned and in Build → Decor & roads.
- **Main Street businesses** (Bakery, Flower Shop, Ice Cream Parlor, Barber, Bookstore, Pizza Place, Toy Store, Movie
  Theater) earn coins on their own every day; the register holds 3 days and a tap collects it. Every 15 residents
  support one more shop, so homes and shops grow together. A second copy of a shop costs 50% more. Shops pay coins
  only, never XP.
- **Budget District.** Every budget category has a building (Housing Office, Power & Water Works, Grocery Store, Gas
  Station, Insurance Office, News Station, Giving Pantry, Fun Fair, General Store). It unlocks free the first time the
  family budgets in that category or logs spending there, with a "New in town!" celebration. That category's payday
  truck delivers to it, and tapping it shows planned vs spent this month, a quick "log a purchase", recent spending
  and the monthly plan. It grows (pennants, then a gold star) after 1 and 3 months on plan (3+ purchases logged,
  spending within the plan). Grocery, Gas and News stations become free once their category is in the budget.
- **Nest Egg Tower** (Financial, level 4) teaches compound growth with coins: invest coins, they grow 2% a week, growth
  earns growth, and coins invested in the last 4 weeks cost a 10% fee to take out early. The tower grows with the
  balance, with a projection table and a rotating lesson (Rule of 72, time beats timing…).
- **Debt Freedom Monument** (Financial, once a debt is listed): a new tier for every debt paid off, a crown and
  fireworks when the last one is gone, and a plaque of debts paid (names and dates, never amounts).
- **More filler:** Bungalow and Farmhouse homes (all 1-tile homes are drawn a bit larger), plus Flower Planter, Hedge
  Row, Street Lamp, Bunting, Picnic Table, Birdbath and Windmill decorations.
- **A living town.** Ducks on the ponds, boats on the river, flowers along the roads that spread with the streak,
  windows that glow brighter with it, real-clock day and night (or pick Day/Night in the menu), and neighbors you can
  tap who notice the family's real week.
- **Three currencies**
  - **XP** comes from checking off tasks, 3 daily challenges, milestones and quick wins. It fills the level bar.
  - **Coins** come from checking off tasks and reaching big goals. They pay for buildings, homes, upgrades and roads.
  - **Population** comes from homes (Cottage, Family House, Townhouse, Apartments) and home upgrades.
  - **Leveling up needs XP and population.** Levels 5, 9 and 13 also need a bigger **Town Hall**, and its upgrade needs population and coins.
    Each Town Hall level adds +10% coins to every task.
- **Guided tour + quick wins.** A friendly town planner walks a new family through their first tasks, placing the
  building by a road, checking off a task, and building a home (level 2 arrives during the tour). A "Quick wins"
  checklist pays out for the next first steps.
- **Never sold:** progress, levels, coins, unlocks. No paid currency, timers, energy, or countdown sales.
  No red, no X's, no "missed". The weekly town paper never shows dollar amounts.
- **Store, Available tasks, Profile** (v2.1): Build opens a Store of category tiles with "New"/ready badges; two original
  characters (Rosie the town planner, Grandpa Joe) hand out quick wins and daily challenges as cards with progress bars and
  **Go** buttons that jump straight to the right screen; a Profile (top-left) shows town level, stats, achievements and the sticker book.
- **Money path (opens with the Bank):** placing the Bank starts a budget walkthrough (paychecks in, monthly expenses out,
  "give every dollar a job"). The Financial area has its own **money level**, earned only by money habits (logging
  transactions, updating balances, showing up on payday), never by amounts:
  1. **Budget**: log transactions; planned vs. spent per category (overspending is shown neutrally).
  2. **Savings** (10 money points): the $1,000 starter emergency fund + sinking funds, explained in plain words; update balances. Unlocks the Savings Tower.
  3. **Debt snowball** (25 points): list every debt, pay smallest balance first and roll payments forward; record payments,
     update balances, debt-free estimate. Unlocks the Debt Payoff Center.
- **Payday train:** on each payday (or when you tap "I got paid today") a train rolls into the station by the railway.
  You confirm what came in, see a pie chart of where money went since the last payday (or the plan, if nothing was logged),
  then the trucks roll out: one full truck per 10%, a half truck for about 5%. Each truck drives the roads to its building:
  left over/saved → Savings Tower or Bank, housing and utilities → a home, groceries → Grocery Store, gas → Gas Station,
  subscriptions → News Station, giving → Church/Garden, debt → Debt Payoff Center, fun → Café/Diner/Park, everything else → Town Hall.
  The Grocery Store, Gas Station and News Station are in the new **Shops** tab.
- **Building controls:** in road mode or while placing, the ✥ **Move** button lets you look around (drag pans) and the 🔨 **Build** button switches back.
  The tour card is small, sits in the top-left, and can be minimized to a little Rosie bubble.
- **Memories:** after checking off a task, tap **Recap** to add a photo and/or a few words (or add one any time from
  **Memories**). It's a scrapbook by month and area. Photos are shrunk to about 1024px and stored **on this device only** (IndexedDB).
  +5 XP each, up to 3 a day.
- **Calendar + outing budgets:** plan outings (date, time, area, place, who's going, budget). Set a monthly outing budget
  to see planned vs. budget vs. actually spent. After an outing, tap **We went!** to log what it cost and add a recap
  (fixed +15 coins / +10 XP for going, never based on the amount). **Add to my calendar** downloads an `.ics` for
  Apple/Google/Outlook. **Later, with accounts:** shared community events and two-way sync with the family's calendar.
- **Landscape only on phones.** The installed app asks for landscape; on Android a "Play full screen" button locks it;
  a phone held upright sees a "Turn your phone sideways" screen (browsers can't force rotation on their own, and iPhone Safari never allows a lock).
  Every screen has a compact layout for short, wide phone screens. Tablets and computers can use either orientation.
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
| Which areas are open (progressive unlock) | `src/systems/progression.js` |
| 💡 Idea lists | `src/data/ideas.js` |
| Building tools (meals, care, subscriptions, cards, dates, kids, meeting) | `src/systems/tools.js`, `src/ui/tools.js` |
| Logbooks (repair, vet, gifts) | `src/systems/logbook.js`, `src/ui/logbook.js` |
| Earned decorations (steady use) | `src/systems/earned.js` |
| Businesses, Nest Egg, Debt Freedom Monument | `src/systems/business.js`, `src/ui/business.js` |
| Budget District (a building per budget category) | `src/systems/district.js`, `src/ui/district.js` |
| Living town: construction, parade, ducks, boats, flowers, neighbors | `src/world/living.js` |
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
