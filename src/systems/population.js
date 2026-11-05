/*
 * Phase C (logic only, not wired yet).
 * Each home = 4 residents. Room = 8 + 8 per community building
 * (school, park, chapel, clinic, community center).
 * Homes over capacity show "Moving in when there's room." No penalty.
 */
export const PER_HOME = 4;
export const BASE_ROOM = 8;
export const ROOM_PER_COMMUNITY = 8;
export const COMMUNITY_KINDS = ['school', 'park', 'chapel', 'clinic', 'community-center'];

export function population(homes, communityBuildings) {
  const wanting = homes * PER_HOME;
  const room = BASE_ROOM + ROOM_PER_COMMUNITY * communityBuildings;
  const residents = Math.min(wanting, room);
  return { residents, room, waiting: wanting - residents };
}
