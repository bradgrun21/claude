/* Colorful UI art for the HUD and big buttons (original drawings). */
export const ART = {
  coin: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="21" r="16" fill="#C98E25"/><circle cx="20" cy="19" r="16" fill="#FFCF4A"/><circle cx="20" cy="19" r="11.5" fill="#FFB928"/><path d="M15 13h10v3H19v2h5a3 3 0 0 1 0 6h-1v2h-3v-2h-5v-3h8v-1h-5a3 3 0 0 1 0-6h1z" fill="#FFF3C4" opacity=".95"/></svg>',
  xp: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l5 10.6 11.6 1.5-8.5 8 2.2 11.5L20 29l-10.3 5.6 2.2-11.5-8.5-8L15 13.6z" fill="#2A7FD4"/><path d="M20 5l4.5 9.6 10.4 1.4-7.6 7.2 2 10.3L20 28.4l-9.3 5.1 2-10.3-7.6-7.2 10.4-1.4z" fill="#4FB2FF"/><path d="M20 9l3 6.4 7 .9-5.1 4.8 1.3 6.9L20 24.6" fill="#8ED2FF" opacity=".7"/></svg>',
  people: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="14" cy="13" r="6" fill="#F28CA0"/><path d="M4 33a10 10 0 0 1 20 0z" fill="#E0607E"/><circle cx="26" cy="14" r="6.5" fill="#FFB27A"/><path d="M15 34a11 11 0 0 1 22 0z" fill="#F08A3C"/></svg>',
  hardhat: '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="46" rx="26" ry="7" fill="#D49A1E"/><path d="M10 44a22 22 0 0 1 44 0z" fill="#FFC531"/><path d="M27 18h10v24H27z" fill="#FFD966"/><path d="M14 40a18 18 0 0 1 12-17v17zM50 40a18 18 0 0 0-12-17v17z" fill="#FFB800" opacity=".55"/><ellipse cx="32" cy="45" rx="25" ry="4" fill="#FFD24D"/></svg>',
  clipboard: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="10" width="40" height="48" rx="6" fill="#3F8FE0"/><rect x="16" y="15" width="32" height="39" rx="3" fill="#F5F8FF"/><rect x="23" y="6" width="18" height="9" rx="3" fill="#8A9BB4"/><path d="M21 26l3 3 5-6M21 37l3 3 5-6" stroke="#4CAF6A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M33 27h10M33 38h10M21 48h22" stroke="#9AA9C0" stroke-width="3" stroke-linecap="round"/></svg>',
  trophy: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 10h28v14a14 14 0 0 1-28 0z" fill="#FFC531"/><path d="M18 14H9a9 9 0 0 0 11 12M46 14h9a9 9 0 0 1-11 12" stroke="#E0A21F" stroke-width="4" fill="none"/><rect x="28" y="36" width="8" height="10" fill="#E0A21F"/><rect x="19" y="46" width="26" height="8" rx="3" fill="#4CAF6A"/><path d="M32 15l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z" fill="#FFF3C4"/></svg>',
  wins: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 44.8 16.8 52.8l2.9-16.9-12.3-12 17-2.5z" fill="#FF8FB1"/><path d="M32 12l5.8 11.8 13 1.9-9.4 9.2 2.2 12.9L32 41.7l-11.6 6.1 2.2-12.9-9.4-9.2 13-1.9z" fill="#FFC1D4"/><path d="M24 30l6 6 11-12" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  guide: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#BFE3F2"/><path d="M12 64a20 20 0 0 1 40 0z" fill="#3F8FE0"/><circle cx="32" cy="30" r="13" fill="#F3C29B"/><path d="M19 27a13 13 0 0 1 26 0c-3-4-8-5-13-5s-10 1-13 5z" fill="#6B4226"/><ellipse cx="32" cy="17" rx="15" ry="5" fill="#FFC531"/><path d="M20 18a12 12 0 0 1 24 0z" fill="#FFD24D"/><circle cx="27" cy="31" r="1.8" fill="#2B2B2B"/><circle cx="37" cy="31" r="1.8" fill="#2B2B2B"/><path d="M27 36q5 4 10 0" stroke="#B5543C" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
};

/* Half-body characters for the "Available tasks" screen (original). */
ART.rosie = `<svg viewBox="0 0 200 240" aria-hidden="true">
  <path d="M30 240c0-62 30-96 70-96s70 34 70 96z" fill="#2FA7A0"/>
  <path d="M62 240v-70h76v70z" fill="#3F8FE0"/><path d="M62 170h76v14H62z" fill="#2E6FB8"/>
  <rect x="74" y="150" width="10" height="40" rx="4" fill="#2E6FB8"/><rect x="116" y="150" width="10" height="40" rx="4" fill="#2E6FB8"/>
  <path d="M86 128h28v24c0 8-28 8-28 0z" fill="#E9A97E"/>
  <path d="M58 70c0-30 18-50 42-50s42 20 42 50c0 34-18 64-42 64S58 104 58 70z" fill="#F3C29B"/>
  <path d="M140 66c14 6 22 30 14 58-6-14-12-22-18-26z" fill="#7A4A2A"/>
  <path d="M56 72c0-22 14-36 30-38-6 10-8 22-30 38z" fill="#7A4A2A"/>
  <ellipse cx="100" cy="40" rx="50" ry="13" fill="#E3A91C"/><path d="M58 40a42 34 0 0 1 84 0z" fill="#FFC531"/><path d="M93 8h14v30H93z" fill="#FFD966"/>
  <circle cx="84" cy="76" r="5" fill="#2B2B2B"/><circle cx="116" cy="76" r="5" fill="#2B2B2B"/><circle cx="86" cy="74" r="1.6" fill="#fff"/><circle cx="118" cy="74" r="1.6" fill="#fff"/>
  <path d="M77 64q7-5 14 0M109 64q7-5 14 0" stroke="#5A3A22" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="74" cy="92" r="7" fill="#F4A3A0" opacity=".6"/><circle cx="126" cy="92" r="7" fill="#F4A3A0" opacity=".6"/>
  <path d="M88 98q12 12 24 0" stroke="#B5543C" stroke-width="4" fill="#fff" stroke-linecap="round"/>
  <g transform="rotate(-12 150 190)"><rect x="128" y="160" width="46" height="60" rx="5" fill="#B07A45"/><rect x="133" y="167" width="36" height="48" rx="3" fill="#FFFDF5"/><rect x="142" y="156" width="18" height="9" rx="3" fill="#8A9BB4"/><path d="M139 180h24M139 190h24M139 200h16" stroke="#9AA9C0" stroke-width="3" stroke-linecap="round"/></g>
  <circle cx="140" cy="196" r="11" fill="#F3C29B"/>
</svg>`;
ART.joe = `<svg viewBox="0 0 200 240" aria-hidden="true">
  <path d="M28 240c0-60 32-94 72-94s72 34 72 94z" fill="#C0623F"/>
  <path d="M86 146l14 40 14-40" fill="#F6EEDF"/><path d="M100 186v54" stroke="#9C4A2E" stroke-width="3"/>
  <circle cx="100" cy="200" r="3.5" fill="#F2B54A"/><circle cx="100" cy="222" r="3.5" fill="#F2B54A"/>
  <path d="M86 126h28v24c0 8-28 8-28 0z" fill="#E2A47A"/>
  <path d="M60 72c0-30 18-50 40-50s40 20 40 50c0 32-18 60-40 60S60 104 60 72z" fill="#F0BC94"/>
  <path d="M60 70c-4-26 8-44 22-48-2 10 0 18-8 26zM140 70c4-26-8-44-22-48 2 10 0 18 8 26z" fill="#E6E6E6"/>
  <path d="M74 32c8-10 44-10 52 0-10-4-42-4-52 0z" fill="#D8D8D8"/>
  <circle cx="84" cy="76" r="12" fill="none" stroke="#4F5E6E" stroke-width="3.5"/><circle cx="116" cy="76" r="12" fill="none" stroke="#4F5E6E" stroke-width="3.5"/><path d="M96 76h8" stroke="#4F5E6E" stroke-width="3.5"/>
  <circle cx="84" cy="77" r="4" fill="#2B2B2B"/><circle cx="116" cy="77" r="4" fill="#2B2B2B"/>
  <path d="M78 58q6-4 12 0M110 58q6-4 12 0" stroke="#BDBDBD" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M84 100q16-8 32 0q-6 10-16 10t-16-10z" fill="#E8E8E8"/>
  <path d="M90 104q10 8 20 0" stroke="#B5543C" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="72" cy="92" r="6" fill="#F4A3A0" opacity=".55"/><circle cx="128" cy="92" r="6" fill="#F4A3A0" opacity=".55"/>
  <rect x="34" y="176" width="34" height="38" rx="6" fill="#4E9BCB"/><path d="M68 184a10 10 0 0 1 0 20" stroke="#4E9BCB" stroke-width="6" fill="none"/>
  <path d="M42 170q4-8 0-14M54 170q4-8 0-14" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
  <circle cx="58" cy="210" r="11" fill="#F0BC94"/>
</svg>`;
ART.gift = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="16" width="30" height="20" rx="3" fill="#8E6CCB"/><rect x="3" y="11" width="34" height="8" rx="3" fill="#A88BE0"/><rect x="17" y="11" width="6" height="25" fill="#FFC531"/><path d="M20 11c-4-8-12-6-10-1 1 3 6 2 10 1zM20 11c4-8 12-6 10-1-1 3-6 2-10 1z" fill="#FFC531"/></svg>';
ART.gear = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#4E9BCB"/><path d="M20 9l2.5 3.5 4.2-.9.9 4.2 3.5 2.5-2.2 3.7 2.2 3.7-3.5 2.5-.9 4.2-4.2-.9L20 31l-2.5-3.5-4.2.9-.9-4.2L8.9 21.7l2.2-3.7-2.2-3.7 3.5-2.5.9-4.2 4.2.9z" fill="#fff"/><circle cx="20" cy="20" r="5" fill="#4E9BCB"/></svg>';

ART.calendar = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="12" width="48" height="44" rx="7" fill="#F5F8FF"/><path d="M8 19a7 7 0 0 1 7-7h34a7 7 0 0 1 7 7v7H8z" fill="#5CC14A"/><rect x="18" y="6" width="6" height="12" rx="3" fill="#8A9BB4"/><rect x="40" y="6" width="6" height="12" rx="3" fill="#8A9BB4"/><g fill="#C9D6E6"><rect x="15" y="31" width="8" height="7" rx="2"/><rect x="28" y="31" width="8" height="7" rx="2"/><rect x="15" y="43" width="8" height="7" rx="2"/><rect x="41" y="43" width="8" height="7" rx="2"/></g><rect x="41" y="31" width="8" height="7" rx="2" fill="#F2B54A"/><rect x="28" y="43" width="8" height="7" rx="2" fill="#F28CA0"/></svg>';
ART.album = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="10" width="38" height="44" rx="5" fill="#F28CA0" transform="rotate(8 33 32)"/><rect x="10" y="10" width="38" height="44" rx="5" fill="#FFF8EC" stroke="#E0A23A" stroke-width="3"/><rect x="15" y="15" width="28" height="22" rx="3" fill="#7FC6EE"/><path d="M15 33l8-8 7 7 5-5 8 8v2H15z" fill="#5CC14A"/><circle cx="36" cy="21" r="3" fill="#FFD45E"/><path d="M17 43h24M17 48h16" stroke="#C9B48F" stroke-width="3" stroke-linecap="round"/></svg>';
