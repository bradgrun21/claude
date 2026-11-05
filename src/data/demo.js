import { newCity } from './state.js';
import { createList } from '../systems/lists.js';
import { addDays } from '../systems/time.js';
import { key } from './map.js';

/* Maya's sample town: a few levels in, every area open, so anyone can look around without typing. */
export function demoState(today) {
  const start = addDays(today, -20);
  const s = newCity({ cityName: "Maya's Life City", family: [
    { name: 'Maya', color: '#D9774A', kind: 'adult' }, { name: 'Sam', color: '#4E7FA0', kind: 'adult' },
    { name: 'Ava', color: '#F28CA0', kind: 'kid' }, { name: 'Leo', color: '#F2B54A', kind: 'kid' },
    { name: 'Biscuit', color: '#C98F5E', kind: 'pet' }
  ] }, start);
  s.spiritualStyle = 'church';
  s.level = 6; s.xp = 210; s.coins = 640; s.tcLevel = 2;
  const extraRoads = [];
  for (let j = 19; j <= 25; j++) extraRoads.push([14, j]);
  for (let i = 15; i <= 22; i++) extraRoads.push([i, 25]);
  for (let j = 11; j <= 17; j++) extraRoads.push([12, j]);
  for (let i = 20; i <= 25; i++) extraRoads.push([i, 13]);
  for (const [i, j] of extraRoads) { const k = key(i, j); if (!s.roads.includes(k)) s.roads.push(k); }
  const add = (type, i, j, extra = {}) => { const b = { id: `b${s.buildSeq++}`, type, i, j, rot: 0, level: 1, builtOn: addDays(start, 2 + s.buildSeq), story: '', ...extra }; s.buildings.push(b); return b; };
  const bank = add('bank', 20, 16);
  const job = add('jobboard', 15, 19);
  const gym = add('gym', 22, 19);
  const church = add('church', 10, 16);
  const park = add('park', 17, 19);
  const savings = add('savings', 21, 11);
  const field = add('field', 15, 23);
  const cafe = add('cafe', 18, 23);
  for (const [i, j, t, lv] of [[13, 17, 'cottage', 2], [13, 16, 'cottage', 1], [11, 19, 'cottage', 1], [12, 19, 'house', 1], [13, 19, 'house', 2], [13, 14, 'cottage', 1], [24, 17, 'house', 1], [23, 17, 'cottage', 1], [17, 24, 'cottage', 1], [20, 24, 'townhouse', 1], [21, 24, 'cottage', 1]]) add(t, i, j, { level: lv });
  for (const [i, j, t] of [[17, 21, 'fountain'], [9, 19, 'tree'], [10, 19, 'flowers'], [24, 14, 'tree'], [22, 21, 'flowers'], [16, 21, 'bench']]) add(t, i, j);
  const L = (b, goal, tasks) => createList(s, b, goal, tasks, start);
  L(bank, 'Pay off the store card', [{ title: 'Log today’s purchases', kind: 'daily' }, { title: 'Check the budget', kind: 'weekly', per: 2 }, { title: 'Pay $50 extra on the card', kind: 'once' }]);
  L(job, 'Get the garage cleaned out', [{ title: 'Clear one shelf', kind: 'weekly', per: 3 }, { title: 'Donate run', kind: 'once' }]);
  L(gym, 'Run a 5K in March', [{ title: 'Walk the dogs', kind: 'weekly', per: 5 }, { title: 'Run 20 minutes', kind: 'weekly', per: 3 }, { title: 'In bed by 10:30', kind: 'daily' }]);
  L(church, 'Read through the Gospels', [{ title: 'Time with God', kind: 'daily' }, { title: 'Read one chapter', kind: 'weekly', per: 5 }]);
  L(park, 'Weekly family night', [{ title: 'Family night', kind: 'weekly', per: 1 }, { title: 'Date night', kind: 'weekly', per: 1 }, { title: 'Call Grandma', kind: 'weekly', per: 1 }]);
  L(savings, 'Fill the starter cushion', [{ title: 'Move $25 to savings', kind: 'weekly', per: 2 }]);
  L(field, 'Eat more vegetables', [{ title: 'Veggies at dinner', kind: 'daily' }]);
  L(cafe, 'Stay close with friends', [{ title: 'Text a friend', kind: 'weekly', per: 3 }, { title: 'Coffee with Jen', kind: 'once' }]);
  for (let d = 1; d <= 20; d++) {
    const day = addDays(start, d);
    for (const l of s.lists) for (const t of l.tasks) if (t.kind !== 'once' && (d * 7 + t.title.length) % 3 !== 0) t.done.push(day);
    s.loggedDays.push(day);
  }
  s.stats = { tasksDone: 96, goalsDone: 1, lastDay: today };
  for (const k of ['goal', 'place', 'task', 'home', 'road', 'area2', 'level3']) s.quickWins[k] = 'claimed';
  s.tour = { step: 99, done: true };
  s.demo = true;
  return s;
}
