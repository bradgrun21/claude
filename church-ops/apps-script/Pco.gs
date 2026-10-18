/**
 * Optional: pull counts straight from the Planning Center API into a
 * "PCO Pulls" tab, instead of counting by hand for the Health Audit.
 *
 * Each row is a label and an API path. The script asks Planning Center for one
 * record and reads meta.total_count, so any list endpoint (with its filters)
 * becomes a number. Check each path and filter against the API docs at
 * https://developer.planningcenteronline.com before relying on it.
 *
 * Credentials are a personal access token (application ID + secret), stored in
 * the signed-in user's own properties, never in the sheet. Use a Planning
 * Center login with the least access that can still read these counts.
 */

const PCO_SHEET = 'PCO Pulls';
const PCO_BASE = 'https://api.planningcenteronline.com/';

const PCO_EXAMPLES = [
  ['Total people profiles', 'people/v2/people'],
  ['Groups', 'groups/v2/groups'],
  ['Services teams', 'services/v2/teams'],
];

function pcoSetCredentials() {
  const ui = SpreadsheetApp.getUi();
  const id = ui.prompt('Planning Center application ID', 'From api.planningcenteronline.com > Personal Access Tokens', ui.ButtonSet.OK_CANCEL);
  if (id.getSelectedButton() !== ui.Button.OK) return;
  const secret = ui.prompt('Planning Center secret', 'Stored only for your Google account, not in the sheet.', ui.ButtonSet.OK_CANCEL);
  if (secret.getSelectedButton() !== ui.Button.OK) return;
  PropertiesService.getUserProperties().setProperties({
    PCO_APP_ID: id.getResponseText().trim(),
    PCO_SECRET: secret.getResponseText().trim(),
  });
  ui.alert('Saved. Run "Planning Center: pull counts" next.');
}

function pcoPullCounts() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(PCO_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PCO_SHEET);
    writeTable_(sheet, ['Label', 'API path', 'Count', 'Pulled at', 'Error'],
      PCO_EXAMPLES.map((e) => [e[0], e[1], '', '', '']));
  }

  const props = PropertiesService.getUserProperties();
  const id = props.getProperty('PCO_APP_ID');
  const secret = props.getProperty('PCO_SECRET');
  if (!id || !secret) {
    SpreadsheetApp.getUi().alert('Set your Planning Center credentials first (Count On It menu).');
    return;
  }
  const auth = 'Basic ' + Utilities.base64Encode(id + ':' + secret);

  const rows = readRows_(sheet);
  const out = rows.map((r) => {
    const path = String(r[1] || '').trim().replace(/^\/+/, '');
    if (!path) return [r[2], r[3], ''];
    const url = PCO_BASE + path + (path.indexOf('?') === -1 ? '?' : '&') + 'per_page=1';
    try {
      const res = UrlFetchApp.fetch(url, { headers: { Authorization: auth }, muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) return [r[2], r[3], 'HTTP ' + res.getResponseCode()];
      const body = JSON.parse(res.getContentText());
      const count = body.meta && body.meta.total_count;
      return count === undefined ? [r[2], r[3], 'No total_count in response'] : [count, new Date(), ''];
    } catch (e) {
      return [r[2], r[3], String(e.message || e)];
    }
  });
  if (out.length) sheet.getRange(2, 3, out.length, 3).setValues(out);
}
