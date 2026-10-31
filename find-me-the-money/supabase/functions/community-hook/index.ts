// Find Me the Money: unlock extra snaps from the Skool community (called by Zapier).
// Needs the header x-hook-secret = HOOK_SECRET, or it answers 401.
//   POST /community-hook          { email, kind: 'free' | 'paid' }
//        free -> community = true (20 snaps a month); paid -> paid_until = today + 35 days (unlimited)
//   POST /community-hook/import   { emails: [...] }  Brad runs this once a month from Skool's paid member export:
//        each email gets paid_until = today + 35. Skool has no "cancelled" trigger, so anyone not on the list
//        simply runs out after 35 days.
// Secrets: HOOK_SECRET. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
const env = (k: string) => Deno.env.get(k) || '';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const PAID_DAYS = 35;

function cleanEmail(e: unknown) {
  const s = String(e || '').trim().toLowerCase();
  return /^[^\s@,()"]+@[^\s@,()"]+\.[^\s@,()"]+$/.test(s) && s.length <= 254 ? s : '';
}
function inDays(n: number) { return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10); }
async function upsert(rows: Record<string, unknown>[]) {
  const r = await fetch(env('SUPABASE_URL') + '/rest/v1/ai_access?on_conflict=email', {
    method: 'POST',
    headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY'), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error('db ' + r.status);
}

Deno.serve(async (req) => {
  if (!env('HOOK_SECRET') || req.headers.get('x-hook-secret') !== env('HOOK_SECRET')) return json({ error: 'no' }, 401);
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'bad request' }, 400);
  const now = new Date().toISOString();
  try {
    if (new URL(req.url).pathname.replace(/\/+$/, '').endsWith('/import')) {
      const emails = [...new Set((Array.isArray(body.emails) ? body.emails : []).map(cleanEmail).filter(Boolean))];
      if (!emails.length) return json({ error: 'no emails' }, 400);
      // one upsert per 500, keeping each person's community flag as it is
      for (let i = 0; i < emails.length; i += 500) await upsert(emails.slice(i, i + 500).map((email) => ({ email, paid_until: inDays(PAID_DAYS), source: 'import', updated_at: now })));
      console.log(JSON.stringify({ ev: 'import', n: emails.length }));
      return json({ ok: true, paid: emails.length, until: inDays(PAID_DAYS) });
    }
    const email = cleanEmail(body.email);
    if (!email || !['free', 'paid'].includes(body.kind)) return json({ error: 'bad request' }, 400);
    // joining the paid group also means they're in the community
    await upsert([body.kind === 'paid'
      ? { email, community: true, paid_until: inDays(PAID_DAYS), source: 'zapier-paid', updated_at: now }
      : { email, community: true, source: 'zapier-free', updated_at: now }]);
    console.log(JSON.stringify({ ev: 'hook', kind: body.kind }));
    return json({ ok: true });
  } catch (e) {
    console.log(JSON.stringify({ ev: 'hook-fail', msg: String((e as Error).message).slice(0, 40) }));
    return json({ error: 'server' }, 500);
  }
});
