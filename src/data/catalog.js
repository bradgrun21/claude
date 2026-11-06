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
  { id: 'payoff', name: 'Debt Payoff Center', section: 'financial', tier: 2, kind: 'section', size: [2, 2], cost: 150, level: 5, desc: 'Home of your debt snowball.' },
  { id: 'savings', name: 'Savings Tower', section: 'financial', tier: 3, kind: 'section', size: [2, 2], cost: 400, level: 8, desc: 'Emergency fund and sinking funds live here.' },
  { id: 'office', name: 'Office Tower', section: 'financial', tier: 4, kind: 'section', size: [2, 2], cost: 900, level: 10, desc: 'A fourth Financial list.' },

  { id: 'park', name: 'Park', section: 'relational', tier: 1, kind: 'section', size: [2, 2], cost: 0, level: 1, desc: 'Your first Relational list.' },
  { id: 'cafe', name: 'Coffee House', section: 'relational', tier: 2, kind: 'section', size: [2, 2], cost: 150, level: 4, desc: 'A second Relational list.' },
  { id: 'diner', name: 'Family Diner', section: 'relational', tier: 3, kind: 'section', size: [2, 2], cost: 400, level: 8, desc: 'A third Relational list.' },
  { id: 'hall', name: 'Event Hall', section: 'relational', tier: 4, kind: 'section', size: [2, 2], cost: 900, level: 11, desc: 'A fourth Relational list.' },

  { id: 'jobboard', name: 'Community Job Board', section: 'todo', tier: 1, kind: 'section', size: [2, 2], cost: 0, level: 1, desc: 'Your first To-Do list.' },
  { id: 'postoffice', name: 'Post Office', section: 'todo', tier: 2, kind: 'section', size: [2, 2], cost: 150, level: 6, desc: 'A second To-Do list.' },
  { id: 'workshop', name: 'Workshop', section: 'todo', tier: 3, kind: 'section', size: [2, 2], cost: 400, level: 9, desc: 'A third To-Do list.' },
  { id: 'library', name: 'Library', section: 'todo', tier: 4, kind: 'section', size: [2, 2], cost: 900, level: 12, desc: 'A fourth To-Do list.' },

  { id: 'grocery', name: 'Grocery Store', kind: 'shop', size: [2, 2], cost: 0, level: 1, desc: 'Grocery money gets delivered here on payday.' },
  { id: 'gasstation', name: 'Gas Station', kind: 'shop', size: [2, 2], cost: 0, level: 1, desc: 'Gas and car money goes here on payday.' },
  { id: 'newsstation', name: 'News Station', kind: 'shop', size: [1, 1], cost: 0, level: 1, desc: 'Subscriptions and phone bills go here on payday.' },
  { id: 'school', name: 'School', kind: 'shop', size: [2, 2], cost: 120, level: 3, desc: 'Kids’ Corner: chore stars, rewards and a reading log.' },
  { id: 'repairshop', name: 'Repair Shop', kind: 'shop', size: [2, 2], cost: 80, level: 2, desc: 'Repair Log: every service and repair on your cars.' },
  { id: 'vet', name: 'Vet Clinic', kind: 'shop', size: [2, 2], cost: 80, level: 2, desc: 'Pet Records: checkups, vaccines and medicines.' },
  { id: 'giftshop', name: 'Gift Shop', kind: 'shop', size: [1, 1], cost: 60, level: 3, desc: 'Gifts & Sizes: ideas, gifts given and everyone’s sizes.' },
  /* Main Street businesses: earn coins on their own (see systems/business.js). */
  { id: 'bakery', name: 'Bakery', kind: 'biz', size: [1, 1], cost: 80, level: 2, income: 8, desc: 'Fresh bread, steady coins.' },
  { id: 'florist', name: 'Flower Shop', kind: 'biz', size: [1, 1], cost: 100, level: 2, income: 10, desc: 'Bouquets for every occasion.' },
  { id: 'icecream', name: 'Ice Cream Parlor', kind: 'biz', size: [1, 1], cost: 140, level: 3, income: 13, desc: 'A summer favorite, all year.' },
  { id: 'barber', name: 'Barber Shop', kind: 'biz', size: [1, 1], cost: 160, level: 4, income: 15, desc: 'A trim and the town gossip.' },
  { id: 'bookstore', name: 'Bookstore', kind: 'biz', size: [1, 1], cost: 180, level: 4, income: 16, desc: 'Cozy corners and new stories.' },
  { id: 'pizzeria', name: 'Pizza Place', kind: 'biz', size: [1, 1], cost: 220, level: 5, income: 20, desc: 'Friday night favorite.' },
  { id: 'toystore', name: 'Toy Store', kind: 'biz', size: [1, 1], cost: 280, level: 6, income: 25, desc: 'Every kid’s first stop.' },
  { id: 'cinema', name: 'Movie Theater', kind: 'biz', size: [2, 2], cost: 500, level: 8, income: 42, desc: 'Popcorn and a big screen.' },
  /* Budget District: unlocked free by budgeting or spending in the category (see systems/district.js). */
  { id: 'housingoffice', name: 'Housing Office', kind: 'district', size: [1, 1], cost: 0, level: 1, unique: true, desc: 'Rent or mortgage money lives here.' },
  { id: 'utility', name: 'Power & Water Works', kind: 'district', size: [2, 2], cost: 0, level: 1, unique: true, desc: 'Lights, water and heat.' },
  { id: 'insurance', name: 'Insurance Office', kind: 'district', size: [1, 1], cost: 0, level: 1, unique: true, desc: 'Covered for a rainy day.' },
  { id: 'pantry', name: 'Giving Pantry', kind: 'district', size: [1, 1], cost: 0, level: 1, unique: true, desc: 'Where your generosity goes.' },
  { id: 'fair', name: 'Fun Fair', kind: 'district', size: [2, 2], cost: 0, level: 1, unique: true, desc: 'Eating out and fun money.' },
  { id: 'general', name: 'General Store', kind: 'district', size: [1, 1], cost: 0, level: 1, unique: true, desc: 'Everything else.' },
  /* Money lessons */
  { id: 'nestegg', name: 'Nest Egg Tower', kind: 'finance', size: [1, 1], cost: 0, level: 1, unique: true, desc: 'A trophy for reaching Money master, and a few lessons about saving for later.' },
  { id: 'monument', name: 'Debt Freedom Monument', kind: 'finance', size: [2, 2], cost: 0, level: 1, unique: true, desc: 'A new tier for every debt you pay off.' },
  { id: 'station', name: 'Train Station', kind: 'civic', size: [2, 2], cost: 0, level: 0, unique: true, desc: 'The payday train stops here.' },

  { id: 'cottage', name: 'Cottage', kind: 'home', size: [1, 1], cost: 50, level: 1, pop: 5, desc: '+5 population' },
  { id: 'house', name: 'Family House', kind: 'home', size: [1, 1], cost: 120, level: 3, pop: 8, desc: '+8 population' },
  { id: 'townhouse', name: 'Townhouse', kind: 'home', size: [1, 1], cost: 250, level: 5, pop: 12, desc: '+12 population' },
  { id: 'bungalow', name: 'Bungalow', kind: 'home', size: [1, 1], cost: 80, level: 2, pop: 6, desc: '+6 population' },
  { id: 'farmhouse', name: 'Farmhouse', kind: 'home', size: [1, 1], cost: 180, level: 4, pop: 10, desc: '+10 population' },
  { id: 'apartments', name: 'Apartments', kind: 'home', size: [2, 2], cost: 600, level: 8, pop: 25, desc: '+25 population' },

  { id: 'tree', name: 'Oak Tree', kind: 'decor', size: [1, 1], cost: 0, level: 1, desc: 'Just for looks' },
  { id: 'flowers', name: 'Flower Bed', kind: 'decor', size: [1, 1], cost: 15, level: 1, desc: 'Just for looks' },
  { id: 'bench', name: 'Bench & Lamp', kind: 'decor', size: [1, 1], cost: 20, level: 2, desc: 'Just for looks' },
  { id: 'planter', name: 'Flower Planter', kind: 'decor', size: [1, 1], cost: 15, level: 1, desc: 'Just for looks' },
  { id: 'hedge', name: 'Hedge Row', kind: 'decor', size: [1, 1], cost: 10, level: 1, desc: 'Just for looks' },
  { id: 'lamppost', name: 'Street Lamp', kind: 'decor', size: [1, 1], cost: 15, level: 1, desc: 'Glows at night' },
  { id: 'bunting', name: 'Bunting', kind: 'decor', size: [1, 1], cost: 20, level: 2, desc: 'Just for looks' },
  { id: 'picnic', name: 'Picnic Table', kind: 'decor', size: [1, 1], cost: 25, level: 2, desc: 'Just for looks' },
  { id: 'birdbath', name: 'Birdbath', kind: 'decor', size: [1, 1], cost: 30, level: 3, desc: 'Just for looks' },
  { id: 'windmill', name: 'Windmill', kind: 'decor', size: [1, 1], cost: 90, level: 5, desc: 'Turns in the breeze' },
  { id: 'fountain', name: 'Fountain', kind: 'decor', size: [1, 1], cost: 60, level: 4, desc: 'Just for looks' },
  { id: 'gazebo', name: 'Gazebo', kind: 'decor', size: [1, 1], cost: 80, level: 6, desc: 'Just for looks' },
  { id: 'statue', name: 'Founder Statue', kind: 'decor', size: [1, 1], cost: 120, level: 8, desc: 'Just for looks' },
  /* Earned only, by steady use (see systems/earned.js). Free to place once earned. */
  ...[['lanterns', 'Lantern Row'], ['arch', 'Rose Arch'], ['goldfountain', 'Golden Fountain'], ['clocktower', 'Town Clock Tower'], ['market', 'Farmers’ Market Stall'], ['classiccar', 'Classic Car'], ['kiosk', 'Newsstand Kiosk'], ['mailbox', 'Big Red Mailbox'], ['patio', 'Café Patio'], ['playground', 'Playground'], ['bandstand', 'Bandstand'], ['dogpark', 'Dog Park'], ['giftbox', 'Giant Gift Box']]
    .map(([id, name]) => ({ id, name, kind: 'decor', earned: true, unique: true, size: [1, 1], cost: 0, level: 1, desc: 'Earned by steady use' }))
];
export const byId = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
export const ROAD_COST = 0;
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
