import { addDays } from '../src/systems/time.js';

export function setupInput() {
  return {
    household: 'one', cityName: 'Test City',
    pay: { amount: 2000, freq: 'biweekly', next: addDays('2026-11-05', 3) },
    bills: 2500, debt: 12000, debtPayments: 450, savings: 400,
    ranking: ['Money', 'Marriage', 'Faith', 'Health', 'Friends', 'Home'],
    goals: [
      { area: 'Money', label: 'Log purchases', perWeek: 7 },
      { area: 'Faith', label: 'Prayer', perWeek: 7 },
      { area: 'Health', label: 'Walk', perWeek: 3 }
    ],
    family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }]
  };
}
