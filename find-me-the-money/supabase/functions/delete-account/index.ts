// Find Me the Money: delete my account and data (Settings -> Delete my account and data).
// It needs the service role, so it can't run in the app. POST with the person's sign-in (Bearer token).
//   body { handOver?: true }  an owner with exactly one partner can give the plan to them instead of deleting it
// Deletes their rows in plans, plan_members, plan_invites, people, activity, notify_log, ai_usage, ai_minute,
// ai_flags and ai_access (by email and alt email), then the sign-in itself. A member just leaves: the owner's plan
// stays. The app then clears the phone (localStorage and IndexedDB) and goes back to the front page.
// Backups held by Supabase roll off on Supabase's own schedule.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
const env = (k: string) => Deno.env.get(k) || '';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const admin = () => ({ apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY'), 'Content-Type': 'application/json' });

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(env('SUPABASE_URL') + '/rest/v1/' + path, { ...init, headers: { ...admin(), ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ' ' + path.split('?')[0]);
  return t ? JSON.parse(t) : null;
}
const del = (path: string) => db(path, { method: 'DELETE' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return json({ error: 'sign in' }, 401);
  const ur = await fetch(env('SUPABASE_URL') + '/auth/v1/user', { headers: { Authorization: auth, apikey: env('SUPABASE_SERVICE_ROLE_KEY') } });
  if (!ur.ok) return json({ error: 'sign in' }, 401);
  const user = await ur.json();
  if (!user || !user.id) return json({ error: 'sign in' }, 401);
  const body = await req.json().catch(() => ({}));
  const id = user.id;
  try {
    // an owner with exactly one partner can hand the plan over (when the partner has no plan of their own)
    let handedOver = false;
    const partners = (await db('plan_members?select=member_id&owner_id=eq.' + id)) || [];
    if (body && body.handOver && partners.length === 1) {
      const to = partners[0].member_id, theirs = (await db('plans?select=user_id&user_id=eq.' + to)) || [];
      if (!theirs.length) {
        await db('plans?user_id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ user_id: to }) });
        handedOver = true;
      }
    }
    // the emails that unlock snaps (sign-in email and alt email)
    const me = (await db('people?select=email,alt_email&user_id=eq.' + id)) || [];
    const emails = [String(user.email || '')].concat(me.flatMap((p: { email?: string; alt_email?: string }) => [p.email || '', p.alt_email || '']))
      .map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s"@,()]+@[^\s"@,()]+$/.test(e));
    await del('plan_members?or=(owner_id.eq.' + id + ',member_id.eq.' + id + ')');
    await del('plan_invites?owner_id=eq.' + id);
    await del('plans?user_id=eq.' + id);
    await del('people?user_id=eq.' + id);
    await del('activity?user_id=eq.' + id);
    await del('notify_log?user_id=eq.' + id);
    for (const t of ['ai_usage', 'ai_minute', 'ai_flags']) await del(t + '?owner_id=eq.' + id).catch(() => null);
    if (emails.length) await del('ai_access?email=in.(' + [...new Set(emails)].map((e) => '"' + encodeURIComponent(e) + '"').join(',') + ')').catch(() => null);
    // last, the sign-in itself
    const ar = await fetch(env('SUPABASE_URL') + '/auth/v1/admin/users/' + id, { method: 'DELETE', headers: admin() });
    if (!ar.ok) throw new Error('auth ' + ar.status);
    console.log(JSON.stringify({ ev: 'account-deleted', handedOver }));
    return json({ ok: true, handedOver });
  } catch (e) {
    console.log(JSON.stringify({ ev: 'delete-fail', msg: String((e as Error).message).slice(0, 60) }));
    return json({ error: 'server' }, 500);
  }
});
