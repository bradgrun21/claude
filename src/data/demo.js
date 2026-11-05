import { createFromSetup } from './state.js';
import { addDays } from '../systems/time.js';

/* Maya's family: the demo numbers from the prototype, so anyone can try the city without typing. */
export const DEMO_INPUT = {
  household: 'two-on-one',
  cityName: "Maya's Life City",
  pay: { amount: 1964, freq: 'biweekly', next: null },
  bills: 2900,
  debt: 23400,
  debtPayments: 450,
  savings: 421,
  ranking: ['Money', 'Marriage', 'Faith', 'Health', 'Friends', 'Home'],
  goals: [
    { area: 'Money', label: "Log today's purchases", perWeek: 7 },
    { area: 'Marriage', label: 'Family night', perWeek: 3 },
    { area: 'Faith', label: 'Time with God', perWeek: 7 },
    { area: 'Health', label: 'Walk the dogs', perWeek: 5 },
    { area: 'Friends', label: 'Hang out with friends', perWeek: 2 },
    { area: 'Home', label: 'Dinner at home', perWeek: 7 }
  ],
  family: [
    { name: 'Maya', color: '#D9774A', kind: 'adult' },
    { name: 'Sam', color: '#4E7FA0', kind: 'adult' },
    { name: 'Ava', color: '#F28CA0', kind: 'kid' },
    { name: 'Leo', color: '#F2B54A', kind: 'kid' },
    { name: 'Biscuit', color: '#C98F5E', kind: 'pet' },
    { name: 'Pepper', color: '#2F2A28', kind: 'pet' }
  ]
};

/* A 12-day history ending yesterday, plus two logs today (like the prototype). */
const PATTERN = {
  Money: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  Marriage: [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
  Faith: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
  Health: [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0],
  Friends: [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  Home: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0]
};

export function demoState(today) {
  const start = addDays(today, -12);
  const s = createFromSetup({ ...DEMO_INPUT, pay: { ...DEMO_INPUT.pay, next: addDays(today, 2) } }, start);
  for (const g of s.goals) {
    PATTERN[g.area].forEach((on, i) => { if (on) g.done.push(addDays(start, i)); });
  }
  s.goals.find((g) => g.area === 'Money').done.push(today);
  s.goals.find((g) => g.area === 'Home').done.push(today);
  const days = new Set();
  for (const g of s.goals) for (const d of g.done) days.add(d);
  s.loggedDays = [...days].sort();
  s.train.lastPayday = addDays(today, -9);
  s.garden = s.loggedDays.filter((d) => d > s.train.lastPayday);
  s.bars.values = { Money: 86, Marriage: 67, Faith: 71, Health: 60, Friends: 50, Home: 90 };
  s.bars.updated = today;
  s.points = 240;
  s.materials = { bricks: 3, lanterns: 2, candles: 4, lumber: 2, picnic: 1, harvest: 3 };
  s.materialLog = { date: today, counts: { bricks: 1, harvest: 1 } };
  s.train.ordersSincePayday = 1;
  s.demo = true;
  return s;
}
