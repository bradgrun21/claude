/**
 * Count On It — church numbers tracker and dashboard.
 *
 * Paste into a blank Google Sheet (Extensions > Apps Script), run
 * "Count On It > Set up this sheet", then open the dashboard from the same menu.
 * Nothing in here is church-specific: campuses, congregations and owners all
 * live in the Setup and Data Map tabs.
 */

const SHEETS = {
  SETUP: 'Setup',
  MAP: 'Data Map',
  WEEKLY: 'Weekly Numbers',
  AUDIT: 'Health Audit',
  HOURS: 'Hours Log',
};

const STATUSES = ['Tracked', 'Partial', 'Gap', 'Not defined'];
const UNITS = ['count', 'percent', 'dollars'];
const ALL_SEGMENTS = 'All';

const MAP_HEADERS = ['Metric ID', 'What we count', 'Category', 'Definition', 'Owner (role)',
  'Recorded in', 'Deadline', 'Flows to', 'Status', 'Split by segment?', 'Unit'];
const WEEKLY_HEADERS = ['Week of', 'Metric ID', 'What we count', 'Segment', 'This week\'s number', 'Entered by', 'Note'];
const AUDIT_HEADERS = ['Area', 'Check', 'Segment', 'Baseline', 'Baseline date', 'Current',
  'Updated', 'Target', 'Progress'];
const HOURS_HEADERS = ['Date', 'Area', 'Segment', 'Hours', 'Notes'];

const HOURS_AREAS = ['Audit', 'Definitions', 'People & duplicates', 'Lists & workflows',
  'Check-Ins', 'Groups', 'Services & teams', 'Registrations', 'Dashboard & reporting',
  'Training & docs'];

// [id, number, category, what counts, owner, recorded in, deadline, flows to, split?, unit]
const DEFAULT_METRICS = [
  ['SUN_ATT', 'Sunday attendance', 'Sunday', 'Everyone in the room, per service. Volunteers counted separately.', 'Usher lead', 'Check-Ins Headcounts', 'Sun 1 pm', 'Staff dashboard', 'Y', 'count'],
  ['KIDS_CHECKIN', 'Kids check-ins', 'Sunday', 'Kids checked in, by room and age group', 'Kids director', 'Check-Ins', 'Live', 'Parent welcome email', 'Y', 'count'],
  ['STUDENTS', 'Student attendance', 'Sunday', 'Students in the room on the weekend', 'Student pastor', 'Check-Ins', 'Sun 1 pm', 'Staff dashboard', 'Y', 'count'],
  ['VOL_SERVING', 'Volunteers serving', 'Sunday', 'Volunteers who served this weekend', 'Team leaders', 'Services', 'Mon 10 am', 'Staff dashboard', 'Y', 'count'],
  ['ONLINE', 'Online attendance', 'Sunday', 'Peak live viewers. One definition, all year.', 'Comms director', 'Check-Ins Headcounts', 'Mon 10 am', 'Staff dashboard', 'Y', 'count'],
  ['FIRST_TIME', 'First-time guests', 'Sunday', 'New people who turned in a connection card', 'Guest services lead', 'Church Center form', 'Mon noon', 'Welcome text + email', 'Y', 'count'],
  ['CONN_CARDS', 'Connection cards', 'Sunday', 'All connection cards turned in', 'Guest services lead', 'Church Center form', 'Mon noon', 'Guest workflow', 'Y', 'count'],
  ['DECISIONS', 'Salvations / decisions', 'Sunday', 'Decisions recorded on cards or forms', 'Campus pastor', 'Forms', 'Mon noon', 'Pastor follow-up', 'Y', 'count'],
  ['BAPTISMS', 'Baptisms', 'Sunday', 'People baptized', 'Discipleship pastor', 'Forms', 'Mon noon', 'Staff dashboard', 'Y', 'count'],
  ['GROUP_ATT', 'Group attendance', 'Weekday', 'People at group meetings this week', 'Group leaders', 'Groups attendance', '48 hrs after meeting', '"We missed you" text', 'Y', 'count'],
  ['MIDWEEK', 'Midweek services and classes', 'Weekday', 'Midweek services, classes and recovery ministries', 'Ministry leads', 'Check-Ins Headcounts', 'Next morning', 'Staff dashboard', 'Y', 'count'],
  ['YOUTH_MID', 'Kids and student midweek', 'Weekday', 'Kids and students at midweek nights', 'Kids and student directors', 'Check-Ins', 'Live', 'Staff dashboard', 'Y', 'count'],
  ['PRAYER_MTG', 'Prayer meetings', 'Weekday', 'People at prayer gatherings', 'Prayer lead', 'Check-Ins Headcounts', 'Next morning', 'Staff dashboard', 'Y', 'count'],
  ['EVENT_REG', 'Event signups', 'Weekday', 'Registrations for events this week', 'Events coordinator', 'Registrations', '2 days after event', 'Reminder emails', 'Y', 'count'],
  ['EVENT_ATT', 'Event attendance', 'Weekday', 'People checked in at events', 'Events coordinator', 'Check-Ins', '2 days after event', 'Staff dashboard', 'Y', 'count'],
  ['GROWTH_SIGNUP', 'Growth track signups', 'Next steps', 'Signed up for the membership or growth track', 'Discipleship pastor', 'Forms', 'Mon noon', 'Workflow', 'Y', 'count'],
  ['GROWTH_DONE', 'Growth track completed', 'Next steps', 'Finished the membership or growth track', 'Discipleship pastor', 'Workflows', 'Mon noon', 'Staff dashboard', 'Y', 'count'],
  ['BAPT_SIGNUP', 'Baptism signups', 'Next steps', 'Signed up to be baptized', 'Discipleship pastor', 'Forms', 'Mon noon', 'Pastor follow-up call', 'Y', 'count'],
  ['GROUP_JOINS', 'Group joins', 'Next steps', 'People who joined a group', 'Groups director', 'Groups', 'Mon noon', 'Leader intro email', 'Y', 'count'],
  ['SERVE_SIGNUP', 'Serve team signups', 'Next steps', 'Signed up to serve', 'Volunteer director', 'Forms', 'Mon noon', 'Team leader workflow', 'Y', 'count'],
  ['SERVE_PLACED', 'Serve team placements', 'Next steps', 'Signups actually placed on a team', 'Volunteer director', 'Services', 'Fri', 'Staff dashboard', 'Y', 'count'],
  ['GUEST_FOLLOWUP', 'Guest follow-up done', 'Next steps', 'Guests contacted within 72 hours', 'Guest services lead', 'Workflows', 'Fri', 'Staff dashboard', 'Y', 'percent'],
  ['VOL_ACTIVE', 'Active volunteers', 'Volunteers', 'Served at least once in the last 90 days', 'Volunteer director', 'Services', 'Monthly', 'Staff dashboard', 'Y', 'count'],
  ['VOL_DECLINE', 'Decline and no-response rate', 'Volunteers', 'Share of requests declined or ignored', 'Team leaders', 'Services', 'Mon 10 am', 'Team leader check-in', 'Y', 'percent'],
  ['VOL_NEW', 'New volunteers', 'Volunteers', 'Volunteers who served for the first time', 'Volunteer director', 'Services', 'Monthly', 'Welcome email', 'Y', 'count'],
  ['BG_CHECKS', 'Background checks current', 'Volunteers', 'Kids volunteers with a current background check', 'Kids director', 'People', 'Monthly', 'Safety report', 'Y', 'percent'],
  ['HOW_HEARD', '"How did you hear?" answers', 'Promo', 'Form responses that name a promo source', 'Comms director', 'Form question', 'Live', 'Promo report', 'Y', 'count'],
  ['EMAIL_OPEN', 'Email open rate', 'Promo', 'Opens on the weekly church email', 'Comms director', 'Email software', 'Mon', 'Promo report', 'Y', 'percent'],
  ['CC_VIEWS', 'Church Center page views', 'Promo', 'Views on promoted Church Center pages', 'Comms director', 'Church Center analytics', 'Mon', 'Promo report', 'N', 'count'],
  ['GIVE_TOTAL', 'Weekly giving', 'Giving', 'Total given this week. Totals only, restricted.', 'Finance director', 'Giving', 'Tue', 'Leadership report', 'N', 'dollars'],
  ['GIVERS', 'Number of givers', 'Giving', 'Unique givers this week. Totals only.', 'Finance director', 'Giving', 'Tue', 'Leadership report', 'N', 'count'],
  ['FIRST_GIVERS', 'First-time givers', 'Giving', 'People giving for the first time', 'Finance director', 'Giving', 'Tue', 'Thank-you email', 'N', 'count'],
  ['PRAYER_REQ', 'Prayer requests followed up', 'Care', 'Requests received and answered', 'Care pastor', 'Forms + Workflows', 'Weekly', 'Care report', 'Y', 'count'],
  ['CARE_VISITS', 'Pastoral care contacts', 'Care', 'Hospital visits, calls and care meetings', 'Care pastor', 'People notes', 'Weekly', 'Care report', 'Y', 'count'],
];

// [area, check, target]
const DEFAULT_AUDIT = [
  ['People', 'Possible duplicate profiles', 0],
  ['People', 'Profiles with no campus', 0],
  ['People', 'Profiles with no preferred language', 0],
  ['People', 'Active profiles with no email or phone', 0],
  ['People', 'New profiles not in a household', 0],
  ['Lists & Workflows', 'Overdue workflow cards', 0],
  ['Lists & Workflows', 'Workflow cards with no assignee', 0],
  ['Lists & Workflows', 'Workflows with no activity in 90 days', 0],
  ['Lists & Workflows', 'Lists with no owner', 0],
  ['Check-Ins', 'Events with no locations', 0],
  ['Check-Ins', 'Kids missing allergy or medical info', 0],
  ['Groups', 'Groups with no leader', 0],
  ['Groups', 'Groups with no attendance in 60 days', 0],
  ['Groups', 'Join requests unanswered 7+ days', 0],
  ['Services', 'Teams with no leader', 0],
  ['Services', 'Team members not scheduled in 6 months', 0],
  ['Registrations', 'Past events still open', 0],
  ['Registrations', 'Events with no capacity set', 0],
];

// ---------- Menu ----------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Count On It')
    .addItem('Open dashboard', 'openDashboard')
    .addItem("Add this week's rows", 'addThisWeek')
    .addSeparator()
    .addItem('Set up this sheet', 'setupWorkbook')
    .addItem('Load sample data (demo only)', 'loadSampleData')
    .addSeparator()
    .addItem('Planning Center: set credentials', 'pcoSetCredentials')
    .addItem('Planning Center: pull counts', 'pcoPullCounts')
    .addToUi();
}

function openDashboard() {
  const html = HtmlService.createHtmlOutputFromFile('Dashboard')
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Count On It dashboard');
}

/** Web app entry point (Deploy > New deployment > Web app). */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('Count On It dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- Setup ----------

function setupWorkbook() {
  const ss = SpreadsheetApp.getActive();

  const setup = getOrCreateSheet_(ss, SHEETS.SETUP);
  if (setup.getLastRow() === 0) {
    setup.getRange(1, 1, 4, 2).setValues([
      ['Church name', 'Our Church'],
      ['Week starts on', 'Sunday'],
      ['', ''],
      ['Segments (campuses, congregations)', 'One per row. Every number marked "Split by segment" is entered for each.'],
    ]);
    setup.getRange(5, 1, 3, 1).setValues([['Campus 1'], ['Campus 2'], ['Spanish']]);
    setup.getRange('A1:A4').setFontWeight('bold');
    setup.setColumnWidth(1, 260);
    setup.setColumnWidth(2, 520);
  }

  // Safe to run again: existing tabs keep their data and only get the current
  // headers, dropdowns, formats and any default numbers they are missing.
  const notes = [];

  const map = getOrCreateSheet_(ss, SHEETS.MAP);
  const mapRow = (m) => [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], 'Not defined', m[8], m[9]];
  if (map.getLastRow() === 0) {
    writeTable_(map, MAP_HEADERS, DEFAULT_METRICS.map(mapRow));
    map.setColumnWidth(4, 320);
  } else {
    writeHeaders_(map, MAP_HEADERS);
    const have = new Set(readRows_(map).map((r) => String(r[0])));
    const missing = DEFAULT_METRICS.filter((m) => !have.has(m[0])).map(mapRow);
    if (missing.length) {
      map.getRange(map.getLastRow() + 1, 1, missing.length, MAP_HEADERS.length).setValues(missing);
      notes.push(`added ${missing.length} new numbers to Data Map`);
    }
  }
  map.getRange('I2:I').setDataValidation(listRule_(STATUSES));
  map.getRange('J2:J').setDataValidation(listRule_(['Y', 'N']));
  map.getRange('K2:K').setDataValidation(listRule_(UNITS));

  const weekly = getOrCreateSheet_(ss, SHEETS.WEEKLY);
  writeHeaders_(weekly, WEEKLY_HEADERS);
  weekly.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  weekly.getRange('B2:B').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(map.getRange('A2:A'), true).build());
  weekly.getRange('D2:D').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(setup.getRange('A5:A'), true).build());

  const audit = getOrCreateSheet_(ss, SHEETS.AUDIT);
  if (audit.getLastRow() === 0) {
    writeTable_(audit, AUDIT_HEADERS, DEFAULT_AUDIT.map((a, i) => {
      const r = i + 2;
      return [a[0], a[1], ALL_SEGMENTS, '', '', '', '', a[2],
        `=IF(OR(D${r}="",F${r}=""),"",IF(D${r}=H${r},1,MAX(0,(D${r}-F${r})/(D${r}-H${r}))))`];
    }));
  } else {
    writeHeaders_(audit, AUDIT_HEADERS);
  }
  audit.getRange('E2:E').setNumberFormat('yyyy-mm-dd');
  audit.getRange('G2:G').setNumberFormat('yyyy-mm-dd');
  audit.getRange('I2:I').setNumberFormat('0%');

  const hours = getOrCreateSheet_(ss, SHEETS.HOURS);
  writeHeaders_(hours, HOURS_HEADERS);
  hours.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  hours.getRange('B2:B').setDataValidation(listRule_(HOURS_AREAS));

  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);

  SpreadsheetApp.getUi().alert('Count On It is set up' + (notes.length ? ' (' + notes.join(', ') + ')' : '') +
    '. Your existing data was not changed. Start with the Setup tab, then mark each number\'s status in Data Map.');
}

/** Adds an empty row for every tracked number and segment for the current week. */
function addThisWeek() {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const setup = readSetup_(ss);
  const week = weekStart_(new Date(), setup.weekStartsOn);
  const weekKey = Utilities.formatDate(week, tz, 'yyyy-MM-dd');

  const weekly = ss.getSheetByName(SHEETS.WEEKLY);
  const existing = new Set(readRows_(weekly).map((r) =>
    [formatDate_(r[0], tz), r[1], r[3]].join('|')));

  const rows = [];
  readMetrics_(ss).forEach((m) => {
    if (m.status !== 'Tracked' && m.status !== 'Partial') return;
    const segs = m.split ? setup.segments : [ALL_SEGMENTS];
    segs.forEach((seg) => {
      if (!existing.has([weekKey, m.id, seg].join('|'))) {
        rows.push([week, m.id, m.name, seg, '', '', '']);
      }
    });
  });

  if (rows.length) {
    weekly.getRange(weekly.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  SpreadsheetApp.getUi().alert(rows.length
    ? `Added ${rows.length} rows for the week of ${weekKey}. Fill in the "This week's number" column.`
    : `The week of ${weekKey} already has every row. Mark more numbers Tracked in Data Map to add them.`);
}

// ---------- Dashboard data ----------

/** Called from Dashboard.html. Returns only plain values (no Dates). */
function getDashboardData() {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const setup = readSetup_(ss);

  const weekly = readRows_(ss.getSheetByName(SHEETS.WEEKLY)).map((r) => ({
    week: formatDate_(r[0], tz), id: String(r[1]), segment: String(r[3] || ALL_SEGMENTS), value: r[4],
  }));
  const audit = readRows_(ss.getSheetByName(SHEETS.AUDIT)).map((r) => ({
    area: String(r[0]), check: String(r[1]), segment: String(r[2] || ALL_SEGMENTS),
    baseline: r[3], current: r[5], target: r[7],
  }));
  const hours = readRows_(ss.getSheetByName(SHEETS.HOURS)).map((r) => ({
    area: String(r[1]), segment: String(r[2] || ''), hours: r[3],
  }));

  return buildDashboard_(setup, readMetrics_(ss), weekly, audit, hours);
}

/**
 * Pure: shapes sheet rows into what the dashboard draws. Kept free of
 * SpreadsheetApp so it can be tested outside Apps Script.
 */
function buildDashboard_(setup, metrics, weekly, audit, hours, maxWeeks) {
  maxWeeks = maxWeeks || 10;
  const isNum = (v) => v !== '' && v !== null && v !== undefined && !isNaN(Number(v));

  const allWeeks = Array.from(new Set(weekly.filter((w) => w.week && isNum(w.value)).map((w) => w.week))).sort();
  const weeks = allWeeks.slice(-maxWeeks);
  const weekIndex = {};
  weeks.forEach((w, i) => { weekIndex[w] = i; });

  const tiles = metrics.map((m) => {
    const bySegment = {};
    weekly.forEach((w) => {
      if (w.id !== m.id || !(w.week in weekIndex) || !isNum(w.value)) return;
      if (!bySegment[w.segment]) bySegment[w.segment] = weeks.map(() => null);
      bySegment[w.segment][weekIndex[w.week]] = Number(w.value);
    });
    return {
      id: m.id, name: m.name, category: m.category, owner: m.owner, recordedIn: m.recordedIn,
      deadline: m.deadline, flowsTo: m.flowsTo, status: m.status, unit: m.unit,
      tracked: m.status === 'Tracked' || m.status === 'Partial',
      bySegment: bySegment,
    };
  });

  const trackedCount = tiles.filter((t) => t.tracked).length;

  const areas = {};
  audit.forEach((a) => {
    if (!isNum(a.baseline)) return;
    const k = a.area;
    if (!areas[k]) areas[k] = { area: k, baseline: 0, current: 0, target: 0, checks: 0 };
    areas[k].baseline += Number(a.baseline);
    areas[k].current += isNum(a.current) ? Number(a.current) : Number(a.baseline);
    areas[k].target += isNum(a.target) ? Number(a.target) : 0;
    areas[k].checks += 1;
  });
  const auditAreas = Object.keys(areas).map((k) => {
    const a = areas[k];
    const span = a.baseline - a.target;
    a.progress = span <= 0 ? 1 : Math.max(0, Math.min(1, (a.baseline - a.current) / span));
    return a;
  });

  const hoursByArea = {};
  let hoursTotal = 0;
  hours.forEach((h) => {
    if (!isNum(h.hours)) return;
    hoursByArea[h.area] = (hoursByArea[h.area] || 0) + Number(h.hours);
    hoursTotal += Number(h.hours);
  });

  return {
    churchName: setup.churchName,
    segments: setup.segments,
    weeks: weeks,
    tiles: tiles,
    readiness: { tracked: trackedCount, total: tiles.length },
    audit: auditAreas,
    hours: { total: hoursTotal, byArea: hoursByArea },
  };
}

// ---------- Sample data (for demos and videos) ----------

function loadSampleData() {
  const ui = SpreadsheetApp.getUi();
  const ok = ui.alert('Load sample data?',
    'This marks a "typical church" set of numbers as Tracked and adds 10 weeks of made-up numbers. Use it on a copy, not a real church sheet.',
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActive();
  const setup = readSetup_(ss);
  const sample = sampleData_(setup.segments, weekStart_(new Date(), setup.weekStartsOn));

  const map = ss.getSheetByName(SHEETS.MAP);
  const ids = map.getRange(2, 1, map.getLastRow() - 1, 1).getValues().map((r) => r[0]);
  map.getRange(2, 9, ids.length, 1).setValues(ids.map((id) => [sample.statuses[id] || 'Not defined']));

  const weekly = ss.getSheetByName(SHEETS.WEEKLY);
  if (sample.weekly.length) {
    weekly.getRange(weekly.getLastRow() + 1, 1, sample.weekly.length, 7).setValues(sample.weekly);
  }

  const audit = ss.getSheetByName(SHEETS.AUDIT);
  const n = audit.getLastRow() - 1;
  if (n > 0) {
    const today = new Date();
    audit.getRange(2, 4, n, 4).setValues(audit.getRange(2, 4, n, 1).getValues().map((_, i) => {
      const base = sample.audit[i % sample.audit.length];
      return [base[0], today, base[1], today];
    }));
  }

  const hours = ss.getSheetByName(SHEETS.HOURS);
  hours.getRange(hours.getLastRow() + 1, 1, sample.hours.length, 5).setValues(sample.hours);
}

/** Pure: deterministic made-up numbers so demos look the same every time. */
function sampleData_(segments, lastWeek) {
  let seed = 7;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const statuses = {
    SUN_ATT: 'Tracked', KIDS_CHECKIN: 'Tracked', STUDENTS: 'Tracked', VOL_SERVING: 'Tracked',
    ONLINE: 'Partial', FIRST_TIME: 'Partial', GIVE_TOTAL: 'Tracked', GIVERS: 'Tracked',
    GROUP_ATT: 'Gap', GUEST_FOLLOWUP: 'Gap', EVENT_REG: 'Partial', HOW_HEARD: 'Not defined',
  };
  const base = {
    SUN_ATT: 2400, KIDS_CHECKIN: 520, STUDENTS: 260, VOL_SERVING: 310, ONLINE: 900,
    FIRST_TIME: 35, EVENT_REG: 60, GIVE_TOTAL: 160000, GIVERS: 1400,
  };
  const segShare = segments.map((_, i) => (i === segments.length - 1 && segments.length > 2 ? 0.35 : 1));
  const split = { GIVE_TOTAL: false, GIVERS: false };
  const names = {};
  DEFAULT_METRICS.forEach((m) => { names[m[0]] = m[1]; });

  const weekly = [];
  for (let w = 9; w >= 0; w--) {
    const week = new Date(lastWeek.getTime() - w * 7 * 86400000);
    const growth = 1 + (9 - w) * 0.006;
    Object.keys(base).forEach((id) => {
      const segs = split[id] === false ? [ALL_SEGMENTS] : segments;
      segs.forEach((seg, si) => {
        const share = split[id] === false ? 1 : segShare[si];
        const v = Math.round(base[id] * share * growth * (0.94 + rand() * 0.12));
        weekly.push([week, id, names[id] || id, seg, v, 'Sample', '']);
      });
    });
  }

  return {
    statuses: statuses,
    weekly: weekly,
    audit: [[1840, 410], [960, 120], [3100, 2200], [720, 300], [410, 150], [64, 12], [38, 6],
      [22, 9], [140, 40], [6, 0], [210, 60], [18, 4], [44, 20], [12, 3], [9, 2], [120, 75], [14, 0], [21, 5]],
    hours: [
      [lastWeek, 'Audit', '', 6, 'Checklist and baseline counts'],
      [lastWeek, 'Definitions', '', 3, 'Leadership meeting'],
      [lastWeek, 'People & duplicates', 'Spanish', 9, 'Two-surname merges'],
      [lastWeek, 'People & duplicates', 'Campus 1', 7, ''],
      [lastWeek, 'Check-Ins', 'Campus 2', 5, 'Locations rebuilt'],
    ],
  };
}

// ---------- Helpers ----------

function readSetup_(ss) {
  const sheet = ss.getSheetByName(SHEETS.SETUP);
  const top = sheet.getRange(1, 1, 2, 2).getValues();
  const last = sheet.getLastRow();
  const segments = last >= 5
    ? sheet.getRange(5, 1, last - 4, 1).getValues().map((r) => String(r[0]).trim()).filter(Boolean)
    : [];
  return {
    churchName: String(top[0][1] || 'Our Church'),
    weekStartsOn: String(top[1][1] || 'Sunday'),
    segments: segments.length ? segments : [ALL_SEGMENTS],
  };
}

function readMetrics_(ss) {
  return readRows_(ss.getSheetByName(SHEETS.MAP))
    .filter((r) => r[0])
    .map((r) => ({
      id: String(r[0]), name: String(r[1]), category: String(r[2]), definition: String(r[3]),
      owner: String(r[4]), recordedIn: String(r[5]), deadline: String(r[6]), flowsTo: String(r[7]),
      status: String(r[8] || 'Not defined'), split: String(r[9]).toUpperCase() === 'Y',
      unit: String(r[10] || 'count'),
    }));
}

function readRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function writeTable_(sheet, headers, rows) {
  writeHeaders_(sheet, headers);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/** Rewrites row 1 only, so renamed columns update without touching data. */
function writeHeaders_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#E3ECF7');
  sheet.setFrozenRows(1);
}

function listRule_(values) {
  return SpreadsheetApp.newDataValidation().requireValueInList(values, true).build();
}

function formatDate_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  return String(v || '');
}

function weekStart_(date, startsOn) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const target = Math.max(0, days.indexOf(String(startsOn).toLowerCase()));
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() - target + 7) % 7));
  return d;
}
