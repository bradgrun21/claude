/**
 * Next Steps Dashboard
 *
 * Reads a Planning Center People export pasted into this spreadsheet and
 * charts each next step (baptism, Growth Track steps, etc.) as a running
 * total for the year, compared with previous years.
 *
 * Only counts leave the spreadsheet for the dashboard page. No names or
 * other personal fields are read or sent.
 */

// ---------------------------------------------------------------------------
// CONFIG: edit these to match the header row of your export.
// Header matching ignores capitalization and extra spaces.
// ---------------------------------------------------------------------------
const CONFIG = {
  // Tab that holds the Planning Center export (header row in row 1).
  sheetName: 'PCO Export',

  // One entry per next step. `header` is the exact column name in the export.
  metrics: [
    { label: 'Growth Track Complete', header: 'Growth Track Complete' },
    { label: 'Growth Track Step 1',   header: 'Growth Track Step 1' },
    { label: 'Growth Track Step 2',   header: 'Growth Track Step 2' },
    { label: 'Growth Track Step 3',   header: 'Growth Track Step 3' },
    { label: 'Baptism',               header: 'Baptism Date' },
    // { label: 'Salvation',          header: 'Salvation Date' },
    // { label: 'Dream Team',         header: 'Dream Team Start Date' },
  ],

  // Optional: a column to filter by (e.g. 'Campus'). Leave '' to turn off.
  campusHeader: '',

  // How many years back to load (current year included).
  yearsBack: 4,

  // Dashboard title shown at the top of the page.
  title: 'Next Steps',
};

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/** Adds a "Next Steps" menu to the spreadsheet. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Next Steps')
    .addItem('Open dashboard', 'showDashboard')
    .addItem('Check headers', 'checkHeaders')
    .addToUi();
}

/** Opens the dashboard in a large dialog over the spreadsheet. */
function showDashboard() {
  const html = HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setWidth(1200)
    .setHeight(820);
  SpreadsheetApp.getUi().showModelessDialog(html, CONFIG.title);
}

/** Serves the dashboard as a web app (Deploy > New deployment > Web app). */
function doGet() {
  return HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setTitle(CONFIG.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Shows which configured headers were found in the export. */
function checkHeaders() {
  const sheet = getExportSheet_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headerIndex_(headers);
  const lines = CONFIG.metrics.map(function (m) {
    return (index[normalize_(m.header)] === undefined ? 'MISSING  ' : 'found    ') + m.header;
  });
  if (CONFIG.campusHeader) {
    lines.push((index[normalize_(CONFIG.campusHeader)] === undefined ? 'MISSING  ' : 'found    ') +
      CONFIG.campusHeader + ' (campus filter)');
  }
  SpreadsheetApp.getUi().alert('Header check', lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * Called from the page. Returns daily counts only:
 * {
 *   title, asOf: {year, dayIndex}, years: [...], campuses: [...],
 *   missing: [header, ...],
 *   metrics: [{ label, counts: { [campus|'All']: { [year]: number[366] } } }]
 * }
 * dayIndex is the day of the year on a leap-year calendar (Jan 1 = 0,
 * Feb 29 = 59, Dec 31 = 365), so the same date lines up across years.
 */
function getDashboardData() {
  const tz = Session.getScriptTimeZone();
  const sheet = getExportSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];
  const index = headerIndex_(headers);

  const now = new Date();
  const thisYear = Number(Utilities.formatDate(now, tz, 'yyyy'));
  const years = [];
  for (let y = thisYear - CONFIG.yearsBack + 1; y <= thisYear; y++) years.push(y);

  const campusCol = CONFIG.campusHeader ? index[normalize_(CONFIG.campusHeader)] : undefined;
  const campuses = {};
  const missing = [];

  const metrics = CONFIG.metrics.map(function (m) {
    const col = index[normalize_(m.header)];
    if (col === undefined) missing.push(m.header);
    const counts = { All: emptyYears_(years) };

    if (col !== undefined) {
      values.forEach(function (row) {
        const d = parseDate_(row[col], tz);
        if (!d || years.indexOf(d.year) === -1) return;
        counts.All[d.year][d.dayIndex]++;

        if (campusCol !== undefined) {
          const campus = String(row[campusCol] || '').trim() || '(none)';
          campuses[campus] = true;
          if (!counts[campus]) counts[campus] = emptyYears_(years);
          counts[campus][d.year][d.dayIndex]++;
        }
      });
    }
    return { label: m.label, counts: counts };
  });

  if (CONFIG.campusHeader && campusCol === undefined) missing.push(CONFIG.campusHeader);

  return {
    title: CONFIG.title,
    asOf: {
      year: thisYear,
      dayIndex: dayIndex_(
        Number(Utilities.formatDate(now, tz, 'M')),
        Number(Utilities.formatDate(now, tz, 'd'))),
      label: Utilities.formatDate(now, tz, 'MMM d, yyyy'),
    },
    years: years,
    campuses: Object.keys(campuses).sort(),
    missing: missing,
    metrics: metrics,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExportSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error('No tab named "' + CONFIG.sheetName + '". Paste the export into a tab with that name, or change CONFIG.sheetName.');
  return sheet;
}

function normalize_(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

function headerIndex_(headers) {
  const index = {};
  headers.forEach(function (h, i) {
    const key = normalize_(h);
    if (key && index[key] === undefined) index[key] = i;
  });
  return index;
}

function emptyYears_(years) {
  const out = {};
  years.forEach(function (y) {
    out[y] = new Array(366).fill(0);
  });
  return out;
}

const DAYS_BEFORE_MONTH_ = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

function dayIndex_(month, day) {
  return DAYS_BEFORE_MONTH_[month - 1] + day - 1;
}

/**
 * Accepts a Sheets date, "YYYY-MM-DD" (with or without a time), or "M/D/YYYY".
 * Returns {year, dayIndex} or null.
 */
function parseDate_(value, tz) {
  if (value === '' || value === null || value === undefined) return null;
  let y, m, d;

  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return null;
    y = Number(Utilities.formatDate(value, tz, 'yyyy'));
    m = Number(Utilities.formatDate(value, tz, 'M'));
    d = Number(Utilities.formatDate(value, tz, 'd'));
  } else {
    const s = String(value).trim();
    let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      y = +match[1]; m = +match[2]; d = +match[3];
    } else if ((match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) {
      m = +match[1]; d = +match[2]; y = +match[3];
      if (y < 100) y += 2000;
    } else {
      return null;
    }
  }

  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  return { year: y, dayIndex: dayIndex_(m, d) };
}
