// Find Me the Money: bill reminders and the 30-Day Challenge's evening nudge.
// Runs every hour (see supabase/reminders.sql). For each saved plan whose person turned reminders on, it checks the
// local time in their time zone (P.tz) and sends through OneSignal at most one bill reminder (at their reminder hour,
// when a bill is due tomorrow) and one challenge nudge (at their nudge hour, 6-10 pm, only on an unfinished challenge
// day) a day. Messages never include amounts, names or anything from the budget, and never shame.
//
// Settings (Supabase -> Edge Functions -> Secrets):
//   ONESIGNAL_APP_ID     the public App ID
//   ONESIGNAL_REST_KEY   the secret REST API key (only here, never in the app)
//   CRON_SECRET          any long random text; the scheduler sends it so nobody else can trigger this
//   REMINDERS_MODE       off | dry | test | live   (start with dry)
//   TEST_USER_IDS        comma-separated account ids that get real messages in test mode
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

// --- due logic start (kept in step with core.js and app.js)
const DAY = 86400000;
function fromIso(s: string) { const p = String(s).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
function isoDay(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { return new Date(d.getTime() + Math.round(n) * DAY); }
function daysBetween(a: Date, b: Date) { return Math.round((fromIso(isoDay(b)).getTime() - fromIso(isoDay(a)).getTime()) / DAY); }
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
// what to say today; at most one
// deno-lint-ignore no-explicit-any
function pick(data: any, today: Date): { kind: string; title: string; body: string } | null {
  const r = data && data.remind; if (!r || !r.on || !data.setupDone) return null;
  const tomorrow = addDays(today, 1);
  if (r.bills !== false && (data.bills || []).some((b: { due?: string; rep?: string; freq?: string }) => b.due && dueOn(b.due, b.freq || b.rep || 'monthly', tomorrow)))
    return { kind: 'bills', title: 'A bill is due tomorrow', body: 'Open your plan to see what’s coming up.' };
  return null;
}
// the 30-Day Challenge's evening nudge: only while a run is on and today's 5 tasks aren't all done.
// --- kept in step with daily.js (tasks) and app.js (chLive): the day's record is P.daily[YYYY-MM-DD]
// deno-lint-ignore no-explicit-any
function pickChallenge(data: any, today: Date): { kind: string; title: string; body: string } | null {
  const c = data && data.challenge; if (!c || c.status !== 'active' || !c.startDate || !data.setupDone) return null;
  const iso = isoDay(today); if (c.startDate > iso) return null;
  const r = (data.daily || {})[iso] || {}; if (r.done) return null;
  const done = [(r.logged || r.noSpend) && (r.balUpdated || r.balancesConfirmed), r.noNewDebt, r.noEatingOut, r.lessonDone, String(r.gratitude || '').trim()].filter(Boolean).length;
  if (done >= 5) return null;
  const n = daysBetween(fromIso(c.startDate), today) + 1, left = 5 - done;
  return { kind: 'challenge', title: 'Day ' + n + ' isn’t done yet.', body: left + (left === 1 ? ' task' : ' tasks') + ' left.' };
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

  // only the fields the reminders read (plans can be large: meal photos and the rest of the budget)
  const plans = ((await db('plans?select=user_id,remind:data->remind,tz:data->>tz,setupDone:data->setupDone,bills:data->bills,challenge:data->challenge,daily:data->daily')) || [])
    .map((p: { user_id: string; remind?: unknown; tz?: string; setupDone?: boolean; bills?: unknown; challenge?: unknown; daily?: unknown }) => ({ user_id: p.user_id, data: { remind: p.remind, tz: p.tz, setupDone: p.setupDone, bills: p.bills, challenge: p.challenge, daily: p.daily } }));
  const members = (await db('plan_members?select=owner_id,member_id')) || [];
  const report: { user: string; kind: string; to: number; status: string }[] = [];

  for (const row of plans) {
    const data = row.data || {}, r = data.remind;
    if (!r || !r.on) continue;
    const t = localNow(data.tz, now);
    const msgs: { kind: string; title: string; body: string }[] = [];
    if (anyHour || t.hour === (r.hour || 9)) { const m = pick(data, t.day); if (m) msgs.push(m); }
    // the challenge nudge: 8 pm by default, or the 6-10 pm hour picked in Settings
    if (r.challenge !== false && (anyHour || t.hour === (r.chHour || 20))) { const m = pickChallenge(data, t.day); if (m) msgs.push(m); }
    for (const msg of msgs) {
      const to = [row.user_id].concat(members.filter((m: { owner_id: string }) => m.owner_id === row.user_id).map((m: { member_id: string }) => m.member_id));
      const short = String(row.user_id).slice(0, 8);
      if (mode === 'test' && !to.some((id: string) => testIds.includes(id))) { report.push({ user: short, kind: msg.kind, to: to.length, status: 'skipped (not a test user)' }); continue; }
      if (mode === 'dry') { report.push({ user: short, kind: msg.kind, to: to.length, status: 'would send' }); continue; }
      // one of each kind a day: the first insert for this plan, day and kind wins
      const ok = await db('notify_log?on_conflict=user_id,day,kind', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ user_id: row.user_id, day: isoDay(t.day), kind: msg.kind }) });
      if (!ok || !ok.length) { report.push({ user: short, kind: msg.kind, to: to.length, status: 'already sent today' }); continue; }
      const ids = mode === 'test' ? to.filter((id: string) => testIds.includes(id)) : to;
      const res = await fetch('https://api.onesignal.com/notifications?c=push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + env('ONESIGNAL_REST_KEY') },
        body: JSON.stringify({ app_id: env('ONESIGNAL_APP_ID'), target_channel: 'push', include_aliases: { external_id: ids }, headings: { en: msg.title }, contents: { en: msg.body }, url: 'https://findmethemoney.netlify.app/' }),
      });
      report.push({ user: short, kind: msg.kind, to: ids.length, status: res.ok ? 'sent' : 'failed ' + res.status });
    }
  }
  console.log(JSON.stringify({ mode, at: now.toISOString(), report }));
  return Response.json({ mode, at: now.toISOString(), count: report.length, report });
});
