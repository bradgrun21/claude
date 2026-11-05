import { AREAS, AREA_INFO, MATERIAL_KEYS } from '../data/areas.js';
import { PERIOD_DAYS } from './time.js';
import { activeAreas } from './rating.js';

/*
 * Payday train. Arrives every payday.
 * Stars since last payday = orders delivered + floor(days logged / 3).
 * Car 1 always. Car 2 at ceil(3 × periodDays / 14) stars. Car 3 at ceil(6 × periodDays / 14).
 * Each car = 3 materials of the family's lowest-stocked types + 1 cosmetic decoration. Never dollars.
 * Harvest: each logged day plants 1 crop; the train harvests at 5 build points per crop.
 */
export const HARVEST_POINTS_PER_CROP = 5;
export const MATS_PER_CAR = 3;
export const DECORATIONS = [
  { id: 'planter', name: 'Flower planter' },
  { id: 'bunting', name: 'Bunting arch' },
  { id: 'fountain', name: 'Little fountain' },
  { id: 'statue', name: 'Founder statue' },
  { id: 'gazebo', name: 'Gazebo' },
  { id: 'birdbath', name: 'Birdbath' },
  { id: 'kiosk', name: 'Lemonade kiosk' }
];

export function carThresholds(freq) {
  const p = PERIOD_DAYS[freq];
  return [1, Math.ceil(3 * p / 14), Math.ceil(6 * p / 14)];
}

export function carsFor(stars, freq) {
  const [, c2, c3] = carThresholds(freq);
  return 1 + (stars >= c2 ? 1 : 0) + (stars >= c3 ? 1 : 0);
}

export function starsFrom(ordersDelivered, daysLogged) {
  return ordersDelivered + Math.floor(daysLogged / 3);
}

export function harvestPoints(crops) { return crops * HARVEST_POINTS_PER_CROP; }

export function daysLoggedSince(state, lastPayday, today) {
  return state.loggedDays.filter((d) => (!lastPayday || d > lastPayday) && d <= today).length;
}

/* Greedy: each unit goes to the material the family has least of (ties by ranking). */
export function fillCars(n, have, activeMats, decoStart = 0) {
  const counts = { ...have };
  const mats = activeMats.length ? activeMats : MATERIAL_KEYS;
  const cars = [];
  for (let c = 0; c < n; c++) {
    const gift = {};
    for (let i = 0; i < MATS_PER_CAR; i++) {
      let best = mats[0];
      for (const k of mats) if ((counts[k] || 0) < (counts[best] || 0)) best = k;
      counts[best] = (counts[best] || 0) + 1;
      gift[best] = (gift[best] || 0) + 1;
    }
    cars.push({ id: `car${decoStart + c}`, mats: gift, deco: DECORATIONS[(decoStart + c) % DECORATIONS.length].id, opened: false });
  }
  return cars;
}

export function activeMaterials(state) {
  const ranking = state.setup.ranking || AREAS;
  const act = activeAreas(state.goals);
  return ranking.filter((a) => act.includes(a)).map((a) => AREA_INFO[a].material);
}

/* Everything that happens when the train pulls in. Pure state change; the view animates it. */
export function trainArrives(state, today) {
  const t = state.train;
  const days = daysLoggedSince(state, t.lastPayday, today);
  const stars = starsFrom(t.ordersSincePayday || 0, days);
  const n = carsFor(stars, state.setup.pay.freq);
  const crops = state.garden.length;
  const pts = harvestPoints(crops);
  state.points += pts;
  state.garden = [];
  /* Leftover unopened crates are kept, never lost. */
  const unopened = t.cars.filter((c) => !c.opened);
  t.cars = [...unopened, ...fillCars(n, state.materials, activeMaterials(state), t.decoSeq || 0)];
  t.decoSeq = (t.decoSeq || 0) + n;
  t.ordersSincePayday = 0;
  t.lastPayday = today;
  t.arrivals = (t.arrivals || 0) + 1;
  return { stars, cars: n, crops, points: pts, days };
}

export function openCrate(state, carId) {
  const car = state.train.cars.find((c) => c.id === carId);
  if (!car || car.opened) return null;
  car.opened = true;
  for (const [k, n] of Object.entries(car.mats)) state.materials[k] = (state.materials[k] || 0) + n;
  state.decorations.push({ id: `d${state.decorations.length}-${car.deco}`, kind: car.deco, placed: false });
  return car;
}

export function starsNow(state, today) {
  return starsFrom(state.train.ordersSincePayday || 0, daysLoggedSince(state, state.train.lastPayday, today));
}
