// Find Me the Money: the locked-output checks for AI snaps and chat. Plain JavaScript so the Edge Function
// (index.ts) and the tests (node tests/ai-guard.test.js) run the very same rules.
// The rule: nothing the model writes is ever shown as a sentence. Only Brad's prewritten text, the person's own
// words, and numbers they confirm. Anything that fails a check is dropped or becomes reply { topic: 'unclear' }.

export const ACTIONS = ['add_purchase', 'no_spend_today', 'check_daily_item', 'gratitude', 'update_balance', 'how_much_left', 'reply'];
export const TOPICS = ['advice', 'unclear', 'off_topic', 'care'];
export const ITEMS = ['debt', 'eat', 'lesson'];
export const KINDS = ['purchase', 'deposit', 'refund', 'transfer'];
export const MAX_AMOUNT = 25000, DAYS_BACK = 60, DAYS_AHEAD = 1, CHAT_MAX = 300;

// hard money stress: checked on the phone first (ai.js keeps the same list), before any AI, and again here
export const CARE = /\b(kill(ing)? myself|end (it|my life)( all)?|want(ed)? to die|wanna die|don'?t want to (be here|live|exist|wake up)|suicid\w*|self[- ]?harm\w*|hurt(ing)? myself|not (feel(ing)? )?safe|no reason to (live|go on)|better off (dead|without me)|can'?t go on)\b/i;
export function needsCare(text) { return CARE.test(String(text || '')); }

// any run of 6+ digits (card and account numbers, even with spaces or dashes) is masked before it goes anywhere
export function maskDigits(s) {
  return String(s ?? '').replace(/\d(?:[ -]?\d){5,}/g, '••••');
}
// a string that will be shown on screen: max length, letters, numbers, spaces and & ' - . only, no links,
// emails, phone numbers or long digit runs. The app also renders it with esc(), never as HTML.
export function cleanText(s, max = 40) {
  let t = String(s ?? '');
  t = t.replace(/\b(?:https?:\/\/|www\.)\S*/gi, ' ').replace(/\S+@\S+/g, ' ')
    .replace(/\b[a-z0-9-]+\.(?:com|net|org|io|co|app|xyz|info|biz|me|ly|gg|us|ai|link|site|shop)\b\S*/gi, ' ')
    .replace(/\+?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, ' ')
    .replace(/\d(?:[ -]?\d){5,}/g, ' ')
    .replace(/[^A-Za-z0-9 &'\-.]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.slice(0, max).trim();
}
// the person's own words for a gratitude line: a little more punctuation, up to 280 characters
export function cleanWords(s, max = 280) {
  let t = String(s ?? '').replace(/\b(?:https?:\/\/|www\.)\S*/gi, ' ').replace(/\S+@\S+/g, ' ').replace(/\d(?:[ -]?\d){5,}/g, ' ');
  return t.replace(/[^A-Za-z0-9 &'\-.,!?:;()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const onlyKeys = (o, keys) => isObj(o) && Object.keys(o).every((k) => keys.includes(k));
export function money(x) { const n = typeof x === 'number' ? x : NaN; if (!isFinite(n)) return null; const r = Math.round(n * 100) / 100; return r >= 0.01 && r <= MAX_AMOUNT ? r : null; }

// a real date, no more than 60 days back and no more than 1 day ahead of today: 'ok' | 'old' | 'bad'
function parseIso(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return null; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null; }
export function checkDate(iso, todayIso) {
  const d = parseIso(iso), t = parseIso(todayIso); if (!d || !t) return 'bad';
  const days = Math.round((d - t) / 86400000);
  return days < -DAYS_BACK ? 'old' : days > DAYS_AHEAD ? 'bad' : 'ok';
}

// echo checks (chat only): the model may only repeat what the person wrote
export function numbersIn(text) { return (String(text || '').match(/\d[\d,]*(?:\.\d+)?/g) || []).map((x) => Number(x.replace(/,/g, ''))).filter((n) => isFinite(n)); }
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').split(/\s+/).filter(Boolean);
export function echoesNumber(n, text) { return numbersIn(text).some((x) => Math.abs(x - n) < 0.005); }
export function echoesWords(s, text) { const have = new Set(words(String(text || '').replace(/-/g, ''))); const w = words(String(s || '').replace(/-/g, '')); return w.length > 0 && w.every((x) => have.has(x)); }

// ---- snaps: record_purchases ----
const SNAP_TOP = ['store', 'rows', 'receipt_total'], SNAP_ROW = ['date', 'merchant', 'amount', 'kind', 'category_key', 'confidence'];
// returns rows in the shape the app's confirm screen already uses: { date, amount, merchant, tag, low, flag, skip, key }
export function checkSnap(input, opts) {
  const keys = new Set((opts.keys || []).map(String)), out = [];
  if (!onlyKeys(input, SNAP_TOP) || !Array.isArray(input.rows)) return { ok: false, rows: [] };
  for (const r of input.rows.slice(0, 60)) {
    if (!onlyKeys(r, SNAP_ROW)) return { ok: false, rows: [] };
    const amount = money(r.amount); if (amount == null) continue;
    const kind = KINDS.includes(r.kind) ? r.kind : 'purchase';
    const merchant = cleanText(r.merchant) || 'Purchase';
    const date = r.date && checkDate(r.date, opts.today) === 'ok' ? r.date : null;
    const key = typeof r.category_key === 'string' && keys.has(r.category_key) ? r.category_key : '';
    const low = r.confidence === 'low';
    out.push({ date, amount, merchant, key, low, flag: low ? 'Check this' : '', tag: kind === 'transfer' ? 'Transfer?' : kind === 'purchase' ? '' : 'Not a purchase?', skip: kind !== 'purchase' });
  }
  return { ok: true, rows: out };
}

// ---- chat: propose_actions ----
const ACTION_KEYS = {
  add_purchase: ['type', 'date', 'merchant', 'amount', 'category_key'], no_spend_today: ['type'], check_daily_item: ['type', 'item'], gratitude: ['type', 'text'],
  update_balance: ['type', 'account_hint', 'amount'], how_much_left: ['type', 'category_key'], reply: ['type', 'topic'],
};
// returns { actions, rejected } where rejected counts outputs that failed a check (for the probing counter)
export function checkChat(input, opts) {
  const text = String(opts.text || ''), keys = new Set((opts.keys || []).map(String)), out = []; let rejected = 0;
  const unclear = () => ({ actions: [{ type: 'reply', topic: 'unclear' }], rejected: rejected + 1 });
  if (!onlyKeys(input, ['actions']) || !Array.isArray(input.actions) || !input.actions.length) return unclear();
  for (const a of input.actions.slice(0, 8)) {
    if (!isObj(a) || !ACTIONS.includes(a.type) || !onlyKeys(a, ACTION_KEYS[a.type])) { rejected++; continue; }
    if (a.type === 'reply') { if (TOPICS.includes(a.topic)) out.push({ type: 'reply', topic: a.topic }); else rejected++; continue; }
    if (a.type === 'no_spend_today') { out.push({ type: a.type }); continue; }
    if (a.type === 'check_daily_item') { if (ITEMS.includes(a.item)) out.push({ type: a.type, item: a.item }); else rejected++; continue; }
    if (a.type === 'how_much_left') { if (keys.has(String(a.category_key))) out.push({ type: a.type, category_key: String(a.category_key) }); else rejected++; continue; }
    if (a.type === 'gratitude') {
      const g = String(a.text || '').trim();
      if (g && g.length <= 280 && text.includes(g)) out.push({ type: a.type, text: cleanWords(g) }); else rejected++;
      continue;
    }
    if (a.type === 'update_balance') {
      const amount = typeof a.amount === 'number' && isFinite(a.amount) ? Math.round(a.amount * 100) / 100 : null;
      if (amount == null || amount < 0 || amount > 10000000 || !echoesNumber(amount, text) || !echoesWords(a.account_hint, text)) { rejected++; continue; }
      out.push({ type: a.type, account_hint: cleanText(a.account_hint), amount }); continue;
    }
    // add_purchase
    const amount = money(a.amount);
    if (amount == null || !echoesNumber(amount, text)) { rejected++; continue; }
    if (a.merchant != null && a.merchant !== '' && !echoesWords(a.merchant, text)) { rejected++; continue; }
    let date = opts.today;
    if (a.date != null) {
      const c = checkDate(a.date, opts.today);
      if (c === 'old') { out.push({ type: 'refused', reason: 'old_date' }); continue; }
      if (c === 'bad') { rejected++; continue; }
      date = a.date;
    }
    out.push({ type: a.type, date, merchant: cleanText(a.merchant) || 'Purchase', amount, category_key: keys.has(String(a.category_key)) ? String(a.category_key) : null });
  }
  if (!out.length) return unclear();
  return { actions: out, rejected };
}

// ---- meals: read_recipe (a recipe photo -> a meal draft) ----
// The app's units are servings, lb, oz, count and cups; tbsp and tsp become cups on the phone, and 'other'
// ("a pinch", "to taste") comes back with no amount so the person fills it in. No prices: the AI can't know them.
export const RECIPE_UNITS = ['servings', 'lb', 'oz', 'count', 'cups', 'tbsp', 'tsp', 'other'];
const RECIPE_TOP = ['name', 'plates', 'ingredients'], RECIPE_ING = ['name', 'amount', 'unit', 'pantry_id'];
export function checkRecipe(input, opts) {
  const ids = new Set((opts.pantryIds || []).map(String));
  if (!onlyKeys(input, RECIPE_TOP) || !Array.isArray(input.ingredients)) return { ok: false, name: '', plates: null, ingredients: [] };
  const out = [];
  for (const g of input.ingredients.slice(0, 40)) {
    if (!onlyKeys(g, RECIPE_ING)) return { ok: false, name: '', plates: null, ingredients: [] };
    const name = cleanText(g.name); if (!name) continue;
    const unit = RECIPE_UNITS.includes(g.unit) ? g.unit : 'other';
    const n = typeof g.amount === 'number' && isFinite(g.amount) ? Math.round(g.amount * 1000) / 1000 : null;
    const amount = unit !== 'other' && n != null && n > 0 && n <= 1000 ? n : null;
    const pantryId = typeof g.pantry_id === 'string' && ids.has(g.pantry_id) ? g.pantry_id : null;
    out.push({ name, amount, unit, pantryId });
  }
  const p = typeof input.plates === 'number' && isFinite(input.plates) ? Math.round(input.plates) : null;
  return { ok: true, name: cleanText(input.name), plates: p != null && p >= 1 && p <= 50 ? p : null, ingredients: out };
}

// ---- meals: read_prices (a grocery receipt -> new pantry prices) ----
// Each line is matched to a pantry item the person already has (by id from the list given), or dropped.
// price is what one package cost: the line total divided by how many were bought.
const PRICES_TOP = ['store', 'date', 'total', 'lines'], PRICES_LINE = ['text', 'line_total', 'qty', 'pantry_id'];
export function checkPrices(input, opts) {
  const ids = new Set((opts.pantryIds || []).map(String));
  if (!onlyKeys(input, PRICES_TOP) || !Array.isArray(input.lines)) return { ok: false, lines: [], total: null, date: null, store: '' };
  const out = [], seen = new Set();
  for (const l of input.lines.slice(0, 80)) {
    if (!onlyKeys(l, PRICES_LINE)) return { ok: false, lines: [], total: null, date: null, store: '' };
    const pantryId = typeof l.pantry_id === 'string' && ids.has(l.pantry_id) ? l.pantry_id : null;
    const lineTotal = money(l.line_total); if (!pantryId || lineTotal == null || seen.has(pantryId)) continue;
    const qty = typeof l.qty === 'number' && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= 50 ? l.qty : 1;
    const price = Math.round(lineTotal / qty * 100) / 100; if (price < 0.01) continue;
    seen.add(pantryId);
    out.push({ pantryId, text: cleanText(l.text) || 'Item', price, qty });
  }
  const total = money(input.total), date = input.date && checkDate(input.date, opts.today) === 'ok' ? input.date : null;
  return { ok: true, lines: out, total, date, store: cleanText(input.store) };
}
