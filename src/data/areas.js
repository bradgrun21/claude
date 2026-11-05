/* The six life areas. Order here is the default ranking. */
export const AREAS = ['Money', 'Marriage', 'Faith', 'Health', 'Friends', 'Home'];

/* Weight by rank position: the family's #1 area counts 30%, #2 20% ... #6 5%. */
export const RANK_WEIGHTS = [30, 20, 20, 15, 10, 5];

export const AREA_INFO = {
  Money: { color: '#E0A23A', material: 'bricks', place: 'bank', placeName: 'Bank', icon: 'coin' },
  Marriage: { color: '#E07A92', material: 'lanterns', place: 'home', placeName: 'Home', icon: 'heart' },
  Faith: { color: '#9A72D6', material: 'candles', place: 'chapel', placeName: 'Chapel', icon: 'cross' },
  Health: { color: '#4CAF6A', material: 'lumber', place: 'park', placeName: 'Main park', icon: 'leaf' },
  Friends: { color: '#4E9BCB', material: 'picnic', place: 'diner', placeName: 'Diner', icon: 'friends' },
  Home: { color: '#C98F5E', material: 'harvest', place: 'grocery', placeName: 'Grocery', icon: 'plate' }
};

/* One material per life bar. */
export const MATERIALS = {
  bricks: { label: 'Bricks', one: 'brick', area: 'Money', color: '#C0623F' },
  lanterns: { label: 'Lanterns', one: 'lantern', area: 'Marriage', color: '#E07A92' },
  candles: { label: 'Candles', one: 'candle', area: 'Faith', color: '#9A72D6' },
  lumber: { label: 'Lumber', one: 'lumber', area: 'Health', color: '#8A6A44' },
  picnic: { label: 'Picnic baskets', one: 'picnic basket', area: 'Friends', color: '#4E9BCB' },
  harvest: { label: 'Harvest baskets', one: 'harvest basket', area: 'Home', color: '#C98F5E' }
};
export const MATERIAL_KEYS = Object.keys(MATERIALS);
export const materialOf = (area) => AREA_INFO[area].material;
