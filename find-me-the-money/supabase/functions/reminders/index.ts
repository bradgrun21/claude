// Find Me the Money: payday reminders.
// Runs every hour (see supabase/reminders.sql). For each saved plan whose person turned reminders on,
// it checks the local time in their time zone, works out what is due today, and sends at most one
// reminder a day through OneSignal. Messages never include amounts, names or anything from the budget.
//
// Settings (Supabase -> Edge Functions -> Secrets):
//   ONESIGNAL_APP_ID     the public App ID
//   ONESIGNAL_REST_KEY   the secret REST API key (only here, never in the app)
//   CRON_SECRET          any long random text; the scheduler sends it so nobody else can trigger this
//   REMINDERS_MODE       off | dry | test | live   (start with dry)
//   TEST_USER_IDS        comma-separated account ids that get real messages in test mode
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

// --- due logic start (kept in step with core.js and app.js; tested by tests/reminders.test.js)
const FREQ_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, semimonthly: 365 / 24, monthly: 365 / 12 };
const DAY = 86400000;
function fromIso(s: string) { const p = String(s).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
function isoDay(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { return new Date(d.getTime() + Math.round(n) * DAY); }
function daysBetween(a: Date, b: Date) { return Math.round((fromIso(isoDay(b)).getTime() - fromIso(isoDay(a)).getTime()) / DAY); }
// the next payday on or after today (same rule as rollPayday in core.js)
function rollPayday(iso: string, freq: string, today: Date) {
  let d = fromIso(iso); const step = FREQ_DAYS[freq] || 14;
  while (daysBetween(today, d) < 0) d = addDays(d, step);
  return isoDay(d);
}
// is a bill due on this exact day (same rules as billDates in app.js)
function dueOn(due: string, rep: string, day: Date) {
  if (!due) return false;
  const iso = isoDay(day); if (iso < due) return false;
  const start = fromIso(due); rep = rep || 'monthly';
  if (rep === 'once') return iso === due;
  if (rep === 'weekly' || rep === 'biweekly') { const st = rep === 'weekly' ? 7 : 14; return daysBetween(start, day) % st === 0; }
  if (rep === 'yearly' && day.getUTCMonth() !== start.getUTCMonth()) return false;
  const dim = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate();
  return day.getUTCDate() === Math.min(start.getUTCDate(), dim);
}
// what to say today, most important first; at most one
// deno-lint-ignore no-explicit-any
function pick(data: any, today: Date): { kind: string; title: string; body: string } | null {
  const r = data && data.remind; if (!r || !r.on || !data.setupDone) return null;
  if (r.payday !== false && data.nextPay && rollPayday(data.nextPay, data.freq || 'biweekly', today) === isoDay(today)) {
    const n = data.streak && data.streak.count ? data.streak.count : 0;
    return { kind: 'payday', title: 'It’s payday!', body: n ? 'Two minutes to check in and make it ' + (n + 1) + ' paydays in a row.' : 'Two minutes to check in and start your streak.' };
  }
  const tomorrow = addDays(today, 1);
  if (r.bills !== false && (data.bills || []).some((b: { due?: string; rep?: string }) => b.due && dueOn(b.due, b.rep || 'monthly', tomorrow)))
    return { kind: 'bills', title: 'A bill is due tomorrow', body: 'Open your plan to see what’s coming up.' };
  return null;
}
// local date and hour for a time zone
function localNow(tz: string, now: Date) {
  try {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/Phoenix', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false });
    const p: Record<string, string> = {}; f.formatToParts(now).forEach((x) => { p[x.type] = x.value; });
    return { day: fromIso(p.year + '-' + p.month + '-' + p.day), hour: +p.hour % 24 };
  } catch { return { day: fromIso(isoDay(now)), hour: now.getUTCHours() }; }
}
// --- due logic end

const env = (k: string) => Deno.env.get(k) || '';

async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(env('SUPABASE_URL') + '/rest/v1/' + path, {
    ...init,
    headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY'), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error('db ' + path + ' ' + res.status + ' ' + (await res.text()));
  const t = await res.text(); return t ? JSON.parse(t) : null;
}

Deno.serve(async (req) => {
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return new Response('no', { status: 401 });
  const url = new URL(req.url);
  const mode = url.searchParams.get('dry') ? 'dry' : (env('REMINDERS_MODE') || 'dry');
  if (mode === 'off') return Response.json({ mode, sent: 0 });
  const testIds = env('TEST_USER_IDS').split(',').map((x) => x.trim()).filter(Boolean);
  // ?ping=1 sends one test notification to the test users only, to check the key and the phone link
  if (url.searchParams.get('ping')) {
    if (!testIds.length) return Response.json({ ping: 'no TEST_USER_IDS set' }, { status: 400 });
    const res = await fetch('https://api.onesignal.com/notifications?c=push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + env('ONESIGNAL_REST_KEY') },
      body: JSON.stringify({ app_id: env('ONESIGNAL_APP_ID'), target_channel: 'push', include_aliases: { external_id: testIds }, headings: { en: 'Test from Find Me the Money' }, contents: { en: 'Reminders are working. See you on payday.' }, url: 'https://findmethemoney.netlify.app/' }),
    });
    const out = await res.text(); console.log('ping', res.status, out);
    return Response.json({ ping: res.ok ? 'sent' : 'failed', status: res.status, onesignal: out });
  }
  const now = new Date(), anyHour = !!url.searchParams.get('anyhour');

  const plans = (await db('plans?select=user_id,data')) || [];
  const members = (await db('plan_members?select=owner_id,member_id')) || [];
  const report: { user: string; kind: string; to: number; status: string }[] = [];

  for (const row of plans) {
    const data = row.data || {}, r = data.remind;
    if (!r || !r.on) continue;
    const t = localNow(data.tz, now);
    if (!anyHour && t.hour !== (r.hour || 9)) continue;
    const msg = pick(data, t.day); if (!msg) continue;
    const to = [row.user_id].concat(members.filter((m: { owner_id: string }) => m.owner_id === row.user_id).map((m: { member_id: string }) => m.member_id));
    const short = String(row.user_id).slice(0, 8);
    if (mode === 'test' && !to.some((id: string) => testIds.includes(id))) { report.push({ user: short, kind: msg.kind, to: to.length, status: 'skipped (not a test user)' }); continue; }
    if (mode === 'dry') { report.push({ user: short, kind: msg.kind, to: to.length, status: 'would send' }); continue; }
    // one a day: the first insert for this plan and day wins
    const ok = await db('notify_log?on_conflict=user_id,day', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ user_id: row.user_id, day: isoDay(t.day), kind: msg.kind }) });
    if (!ok || !ok.length) { report.push({ user: short, kind: msg.kind, to: to.length, status: 'already sent today' }); continue; }
    const ids = mode === 'test' ? to.filter((id: string) => testIds.includes(id)) : to;
    const res = await fetch('https://api.onesignal.com/notifications?c=push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + env('ONESIGNAL_REST_KEY') },
      body: JSON.stringify({ app_id: env('ONESIGNAL_APP_ID'), target_channel: 'push', include_aliases: { external_id: ids }, headings: { en: msg.title }, contents: { en: msg.body }, url: 'https://findmethemoney.netlify.app/' }),
    });
    report.push({ user: short, kind: msg.kind, to: ids.length, status: res.ok ? 'sent' : 'failed ' + res.status });
  }
  console.log(JSON.stringify({ mode, at: now.toISOString(), report }));
  return Response.json({ mode, at: now.toISOString(), count: report.length, report });
});
