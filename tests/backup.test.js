import { describe, it, expect } from 'vitest';
import { newCity, VERSION } from '../src/data/state.js';
import { parseBackup, backupDue, backupFileName, BACKUP_APP } from '../src/data/backup.js';

const D = '2026-11-06';
const city = () => newCity({ cityName: 'Grun Town', family: [{ name: 'Brad', color: '#4E7FA0', kind: 'adult' }] }, '2026-11-01');

describe('backups', () => {
  it('round-trips a town and its photos', () => {
    const s = city();
    const text = JSON.stringify({ app: BACKUP_APP, v: 1, exportedAt: '2026-11-06T12:00:00Z', cityName: s.cityName, state: s, photos: { p1: 'data:image/jpeg;base64,AAAA' } });
    const r = parseBackup(text);
    expect(r.cityName).toBe('Grun Town');
    expect(r.state.buildings.length).toBe(s.buildings.length);
    expect(Object.keys(r.photos)).toEqual(['p1']);
  });
  it('rejects files that aren’t usable backups, with friendly messages', () => {
    expect(() => parseBackup('not json')).toThrow('isn’t a Life City backup');
    expect(() => parseBackup(JSON.stringify({ app: 'other', state: {} }))).toThrow('isn’t a Life City backup');
    expect(() => parseBackup(JSON.stringify({ app: BACKUP_APP, state: { v: VERSION + 1 } }))).toThrow('different version');
    expect(() => parseBackup(JSON.stringify({ app: BACKUP_APP, state: { v: VERSION, buildings: 'x' } }))).toThrow('damaged');
  });
  it('suggests the first backup after 3 days, then about monthly', () => {
    const s = city();
    expect(backupDue(s, '2026-11-02')).toBe(false);
    expect(backupDue(s, '2026-11-04')).toBe(true);
    s.settings.lastBackup = '2026-11-04';
    expect(backupDue(s, '2026-11-20')).toBe(false);
    expect(backupDue(s, '2026-12-05')).toBe(true);
  });
  it('names the file after the town and the date', () => {
    expect(backupFileName(city(), D)).toBe('grun-town-backup-2026-11-06.json');
  });
});
