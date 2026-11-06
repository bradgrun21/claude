/*
 * Everything that can be built. Product rules (Brad, Nov 2026):
 *  - Five sections: Spiritual, Physical, Financial, Relational, To-Do.
 *  - Each section's MAIN building unlocks when the family sets that section's first big goal (free).
 *  - More buildings per section unlock by level; each one adds another task list that pays more.
 *  - Homes add population. Population is needed to level up and to upgrade the Town Hall.
 *  - Coins come from completing tasks, never from dollar amounts. Nothing is for sale.
 */
export const SECTIONS = {
  spiritual: { name: 'Spiritual', color: '#9A72D6', icon: 'dove', blurb: 'Faith, prayer, quiet time, gratitude' },
  physical: { name: 'Physical', color: '#4CAF6A', icon: 'dumbbell', blurb: 'Exercise, sleep, food, health' },
  financial: { name: 'Financial', color: '#E0A23A', icon: 'coin', blurb: 'Budget, saving, paying off debt' },
  relational: { name: 'Relational', color: '#E07A92', icon: 'heart', blurb: 'Marriage, kids, friends, family' },
  todo: { name: 'To-Do', color: '#4E9BCB', icon: 'board', blurb: 'Chores, errands, projects' }
};
export const SECTION_KEYS = Object.keys(SECTIONS);

/* tier: 1 = main building. level = player level needed. */
export const BUILDINGS = [
  { id: 'townhall', name: 'Town Hall', kind: 'civic', size: [3, 3], cost: 0, level: 1, unique: true, desc: 'The heart of town. Upgrade it to keep leveling up.' },

  { id: 'church', name: 'Church', section: 'spiritual', tier: 1, kind: 'section', size: [2, 2], cost: 0, level: 1, desc: 'Your first Spiritual list.' },
  { id: 'garden', name: 'Reflection Garden', section: 'spiritual', tier: 1, kind: 'section', size: [2, 2], cost: 0, level: 1, alt: true, desc: 'Your first Spiritual list. Open to any faith, or none.' },
  { id: 'studyhall', name: 'Study Hall', section: 'spiritual', tier: 2, kind: 'section', size: [2, 2], cost: 150, level: 5, desc: 'A second Spiritual list.' },
  { id: 'pavilion', name: 'Worship Pavilion', section: 'spiritual', tier: 3, kind: 'section', size: [2, 2], cost: 400, level: 9, desc: 'A third Spiritual list.' },
  { id: 'retreat', name: 'Retreat Lodge', section: 'spiritual', tier: 4, kind: 'section', size: [2, 2], cost: 900, level: 12, desc: 'A fourth Spiritual list.' },

  { id: 'gym', name: 'Gym', section: 'physical', tier: 1, kind: 'section', size: [2, 2], cost: 0, level: 1, desc: 'Your first Physical list.' },
  { id: 'field', name: 'Sports Field', section: 'physical', tier: 2, kind: 'section', size: [2, 2], cost: 150, level: 3, desc: 'A second Physical list.' },
  { id: 'pool', name: 'Swimming Pool', section: 'physical', tier: 3, kind: 'section', size: [2, 2], cost: 400, level: 7, desc: 'A third Physical list.' },
  { id: 'clinic', name: 'Wellness Clinic', section: 'physical', tier: 4, kind: 'section', size: [2, 2], cost: 900, level: 11, desc: 'A fourth Physical list.' },

  { id: 'bank', name: 'Bank', section: 'financial', tier: 1, kind: 'section', size: [2, 2], cost: 0, level: 1, desc: 'Your first Financial list.' },
  { id: 'savings', name: 'Savings Tower', section: 'financial', tier: 2, kind: 'section', size: [2, 2], cost: 150, level: 1, money: 2, desc: 'Emergency fund and sinking funds live here.' },
  { id: 'payoff', name: 'Debt Payoff Center', section: 'financial', tier: 3, kind: 'section', size: [2, 2], cost: 400, level: 1, money: 3, desc: 'Home of your debt snowball.' },
  { id: 'office', name: 'Office Tower', section: 'financial', tier: 4, kind: 'section', size: [2, 2], cost: 900, level: 10, desc: 'A fourth Financial list.' },

  { id: 'park', name: 'Park', section: 'relational', tier: 1, kind: 'section', size: [2, 2], cost: 0, level: 1, desc: 'Your first Relational list.' },
  { id: 'cafe', name: 'Coffee House', section: 'relational', tier: 2, kind: 'section', size: [2, 2], cost: 150, level: 4, desc: 'A second Relational list.' },
  { id: 'diner', name: 'Family Diner', section: 'relational', tier: 3, kind: 'section', size: [2, 2], cost: 400, level: 8, desc: 'A third Relational list.' },
  { id: 'hall', name: 'Event Hall', section: 'relational', tier: 4, kind: 'section', size: [2, 2], cost: 900, level: 11, desc: 'A fourth Relational list.' },

  { id: 'jobboard', name: 'Community Job Board', section: 'todo', tier: 1, kind: 'section', size: [2, 2], cost: 0, level: 1, desc: 'Your first To-Do list.' },
  { id: 'workshop', name: 'Workshop', section: 'todo', tier: 2, kind: 'section', size: [2, 2], cost: 150, level: 6, desc: 'A second To-Do list.' },
  { id: 'postoffice', name: 'Post Office', section: 'todo', tier: 3, kind: 'section', size: [2, 2], cost: 400, level: 9, desc: 'A third To-Do list.' },
  { id: 'library', name: 'Library', section: 'todo', tier: 4, kind: 'section', size: [2, 2], cost: 900, level: 12, desc: 'A fourth To-Do list.' },

  { id: 'grocery', name: 'Grocery Store', kind: 'shop', size: [2, 2], cost: 60, level: 1, needsBank: true, desc: 'Grocery money gets delivered here on payday.' },
  { id: 'gasstation', name: 'Gas Station', kind: 'shop', size: [2, 2], cost: 60, level: 1, needsBank: true, desc: 'Gas and car money goes here on payday.' },
  { id: 'newsstation', name: 'News Station', kind: 'shop', size: [1, 1], cost: 40, level: 1, needsBank: true, desc: 'Subscriptions and phone bills go here on payday.' },
  { id: 'station', name: 'Train Station', kind: 'civic', size: [2, 2], cost: 0, level: 0, unique: true, desc: 'The payday train stops here.' },

  { id: 'cottage', name: 'Cottage', kind: 'home', size: [1, 1], cost: 50, level: 1, pop: 5, desc: '+5 population' },
  { id: 'house', name: 'Family House', kind: 'home', size: [1, 1], cost: 120, level: 3, pop: 8, desc: '+8 population' },
  { id: 'townhouse', name: 'Townhouse', kind: 'home', size: [1, 1], cost: 250, level: 5, pop: 12, desc: '+12 population' },
  { id: 'apartments', name: 'Apartments', kind: 'home', size: [2, 2], cost: 600, level: 8, pop: 25, desc: '+25 population' },

  { id: 'tree', name: 'Oak Tree', kind: 'decor', size: [1, 1], cost: 10, level: 1, desc: 'Just for looks' },
  { id: 'flowers', name: 'Flower Bed', kind: 'decor', size: [1, 1], cost: 15, level: 1, desc: 'Just for looks' },
  { id: 'bench', name: 'Bench & Lamp', kind: 'decor', size: [1, 1], cost: 20, level: 2, desc: 'Just for looks' },
  { id: 'fountain', name: 'Fountain', kind: 'decor', size: [1, 1], cost: 60, level: 4, desc: 'Just for looks' },
  { id: 'gazebo', name: 'Gazebo', kind: 'decor', size: [1, 1], cost: 80, level: 6, desc: 'Just for looks' },
  { id: 'statue', name: 'Founder Statue', kind: 'decor', size: [1, 1], cost: 120, level: 8, desc: 'Just for looks' }
];
export const byId = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
export const ROAD_COST = 5;
export const MAX_HOME_LEVEL = 3;

export const mainBuildingFor = (section, spiritualStyle = 'church') =>
  section === 'spiritual' ? byId[spiritualStyle === 'garden' ? 'garden' : 'church'] : BUILDINGS.find((b) => b.section === section && b.tier === 1);
export const sectionBuildings = (section) => BUILDINGS.filter((b) => b.section === section);

/* Homes: each upgrade level adds half the base population again. */
export function homePop(type, level = 1) {
  const b = byId[type];
  if (!b || b.kind !== 'home') return 0;
  return b.pop + Math.ceil(b.pop / 2) * (level - 1);
}
export function homeUpgradeCost(type, level) {
  return Math.round(byId[type].cost * 0.8 * level);
}
