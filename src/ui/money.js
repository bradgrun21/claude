import { CATEGORIES, catById, MONEY_LEVELS, MONEY_STEPS, nextMoneyLevel, monthlyIncome, monthlyExpenses, monthSpending, snowballOrder, snowballMonths, nextPayday, paydayDue, STARTER_EF, REWARD } from '../systems/budget.js';
import { FREQ_LABEL, shortDate, weekday } from '../systems/time.js';
import { svgI, esc } from './icons.js';
import { ART } from './art.js';

/* Money screens: budget walkthrough, the Bank hub, payday breakdown. Private to the family (dollar amounts allowed here, never on anything shareable). */
const usd = (n) => `$${(Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const guide = (title, text) => `<div class="mguide"><span class="mg-av">${ART.guide}</span><div><b>${title}</b><p>${text}</p></div></div>`;
const truckSvg = (color, half) => `<svg viewBox="0 0 40 24" class="tk${half ? ' half' : ''}" aria-hidden="true"><rect x="2" y="${half ? 11 : 4}" width="22" height="${half ? 8 : 15}" rx="2" fill="#5CC14A"/><rect x="24" y="8" width="11" height="11" rx="2" fill="${color}"/><rect x="29" y="10" width="5" height="4" fill="#BFE3F5"/><rect x="1" y="18" width="36" height="3" fill="#1E2B3C"/><circle cx="9" cy="21" r="3" fill="#1E2B3C"/><circle cx="30" cy="21" r="3" fill="#1E2B3C"/><circle cx="13" cy="${half ? 15 : 11}" r="3" fill="#FFC531"/></svg>`;

/* ---------- Budget walkthrough (opens when the Bank is placed) ---------- */
export function renderBudgetSetup(d) {
  const steps = 4;
  const dots = `<div class="mdots">${Array.from({ length: steps }, (_, i) => `<i class="${i <= d.step ? 'on' : ''}"></i>`).join('')}</div>`;
  const nav = (next, back = true) => `<div class="actions">${back ? '<button type="button" class="btn soft" data-bs="back">Back</button>' : ''}<button type="button" class="btn go-btn" data-bs="next">${next}</button></div>`;
  if (d.step === 0) return dots + guide('Let’s build your budget', 'A budget is just a plan for your money before the month starts. You tell every dollar where to go: bills, groceries, giving, saving. Then you watch it happen. Two quick steps: what comes in, and what goes out.') + nav('Start with income', false);
  if (d.step === 1) {
    return dots + guide('Step 1 · Money coming in', 'Add each paycheck as it actually lands in your account (take-home, after taxes). The payday train will roll in on these dates.') +
      d.incomes.map((i, n) => `<div class="mrow"><input class="field" data-inc="${n}:name" value="${esc(i.name)}" placeholder="Whose paycheck?" maxlength="24"><span class="dollar"><input class="field" data-inc="${n}:amount" inputmode="decimal" value="${i.amount}" placeholder="Amount"></span>
        <select class="field" data-inc="${n}:freq">${Object.entries(FREQ_LABEL).map(([k, v]) => `<option value="${k}"${i.freq === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
        <label class="mini">Next payday<input class="field" type="date" data-inc="${n}:next" value="${i.next}"></label>${d.incomes.length > 1 ? `<button type="button" class="btn link" data-incdel="${n}">Remove</button>` : ''}</div>`).join('') +
      `<button type="button" class="btn link" data-incadd="1">+ Another paycheck</button>` + nav('Next: expenses');
  }
  if (d.step === 2) {
    return dots + guide('Step 2 · Money going out', 'Rough monthly amounts are perfect. Leave any category blank if it doesn’t apply. You can change these any time.') +
      `<div class="cats">${CATEGORIES.map((c) => `<label class="catrow"><i style="background:${c.color}"></i><span>${c.label}</span><span class="dollar"><input class="field small" data-exp="${c.id}" inputmode="decimal" value="${d.expenses[c.id] ?? ''}" placeholder="0"></span></label>`).join('')}</div>` + nav('Next: review');
  }
  const inc = monthlyIncome({ incomes: d.incomes.map((i) => ({ ...i, amount: i.amount })) });
  const out = monthlyExpenses({ expenses: d.expenses });
  const left = inc - out;
  return dots + guide('Step 3 · Give every dollar a job', left > 0 ? `You have about ${usd(left)} a month without a job yet. Pick where it goes: your starter emergency fund, extra on debt, giving, or saving for something coming up. Money with no job tends to disappear.` : left < 0 ? `The plan is about ${usd(-left)} a month more than what comes in. That’s okay. It’s why we budget. Trim a category or two, and the bank will help you track it.` : 'Every dollar has a job. That’s a zero-based budget. Nicely done.') +
    `<div class="mreview"><div><small>Comes in each month</small><b>${usd(inc)}</b></div><div><small>Planned to go out</small><b>${usd(out)}</b></div><div><small>${left >= 0 ? 'Still needs a job' : 'Over the plan'}</small><b>${usd(Math.abs(left))}</b></div></div>` +
    nav(`Finish budget +${REWARD.setup.coins} coins`);
}

/* ---------- Bank hub ---------- */
export function moneyHeader(state) {
  const b = state.budget;
  const cur = MONEY_LEVELS.find((l) => l.level === b.level) || MONEY_LEVELS[0];
  const st = MONEY_STEPS[b.level - 1];
  const have = st ? st.progress(b) : 1, need = st ? st.need : 1;
  return `<div class="mhead"><span class="mlv">${ART.coin}<b>${b.level}</b></span><div class="mhd"><b>Money level ${b.level} · ${cur.name}</b>
    <div class="pbar"><i style="width:${((have / need) * 100).toFixed(0)}%"></i><em>${st ? `${have} of ${need}` : 'All steps done'}</em></div>
    <small>${st ? `Step ${b.level}: ${st.desc}` : 'Every money tool is open. Keep the habit going.'}</small></div></div>`;
}

export function renderBank(state, today, tab, ui = {}) {
  const b = state.budget;
  const tabs = [['budget', 'Budget'], ['tx', 'Transactions'], ['debts', b.level >= 3 ? 'Debts' : '🔒 Debts'], ['savings', b.level >= 4 ? 'Savings' : '🔒 Savings'], ['list', 'List']];
  const seg = `<div class="seg wide">${tabs.map(([k, l]) => `<button type="button" data-btab="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (!b.setup) return moneyHeader(state) + guide('Your bank is open!', 'Set up your budget first. It takes about two minutes.') + '<div class="actions"><button type="button" class="btn go-btn" data-bank="setup">Set up my budget</button></div>';
  if (tab === 'budget') {
    const ym = today.slice(0, 7);
    const spent = monthSpending(b, ym);
    const np = nextPayday(b, today);
    const due = paydayDue(b, today);
    body = `<div class="mbtns">${due ? `<button type="button" class="btn go-btn" data-bank="payday">${svgI('coin', '#fff', 16)} Payday is here! Bring in the train</button>` : ''}
      <button type="button" class="btn ${due ? 'soft' : 'go-btn'}" data-bank="logtx">${svgI('plus', due ? 'currentColor' : '#fff', 16, 3)} Log a transaction</button>
      <button type="button" class="btn soft" data-bank="setup">${svgI('edit', 'currentColor', 14)} Edit budget</button>${!due ? '<button type="button" class="btn soft" data-bank="payday">I got paid today</button>' : ''}</div>
      <p class="hint">${np ? `Next payday: <b>${weekday(np)}, ${shortDate(np)}</b>. The train rolls in that day.` : ''}</p>
      <div class="bud">${Object.entries(b.expenses).map(([cat, plan]) => { const c = catById(cat); const s = spent[cat] || 0; const pct = Math.min(100, (s / plan) * 100); return `<div class="budrow"><span class="bl1"><i style="background:${c.color}"></i>${esc(c.short)}</span><div class="pbar"><i style="width:${pct.toFixed(0)}%;background:${c.color}"></i></div><span class="bl2">${usd(s)} of ${usd(plan)}${s > plan ? ` · ${usd(s - plan)} over` : ''}</span></div>`; }).join('')}</div>
      <p class="foot">Spending over a category is just information, not a failure. Adjust the plan or the spending and keep going.</p>`;
  } else if (tab === 'tx') {
    const t = ui.tx || { type: 'expense', cat: 'groceries', amount: '', note: '', date: today };
    body = `<div class="card2 txform"><div class="seg"><button type="button" data-txtype="expense" aria-pressed="${t.type === 'expense'}">Spent</button><button type="button" data-txtype="income" aria-pressed="${t.type === 'income'}">Came in</button></div>
      <div class="two"><div><label class="q" for="txAmt">Amount</label><span class="dollar"><input class="field" id="txAmt" inputmode="decimal" value="${esc(t.amount)}" placeholder="0.00"></span></div><div><label class="q" for="txDate">Date</label><input class="field" type="date" id="txDate" value="${t.date}"></div></div>
      ${t.type === 'expense' ? `<label class="q">Category</label><div class="chips-row">${CATEGORIES.map((c) => `<button type="button" class="pickchip${t.cat === c.id ? ' on' : ''}" style="--c:${c.color}" data-txcat="${c.id}">${c.short}</button>`).join('')}</div>` : ''}
      <label class="q" for="txNote">Note <small>(optional)</small></label><input class="field" id="txNote" maxlength="60" value="${esc(t.note)}" placeholder="Where or what" autocomplete="off">
      <div class="actions"><button type="button" class="btn go-btn" data-bank="savetx">Log it +${REWARD.transaction.coins}</button></div></div>
      <div class="h3">Recent</div>${b.transactions.slice(0, 25).map((x) => `<div class="txrow"><i style="background:${x.type === 'income' ? '#3E8E57' : catById(x.cat).color}"></i><span><b>${esc(x.note || (x.type === 'income' ? 'Income' : catById(x.cat).short))}</b><small>${shortDate(x.date)} · ${x.type === 'income' ? 'Came in' : catById(x.cat).short}</small></span><b class="${x.type === 'income' ? 'inc' : ''}">${x.type === 'income' ? '+' : ''}${usd(x.amount)}</b></div>`).join('') || '<p class="hint">Nothing logged yet. Every transaction you log levels up your money skills.</p>'}`;
  } else if (tab === 'savings') {
    if (b.level < 4) body = lockCard(4, 'Savings', 'Savings opens after your debts are listed (step 3). Then you’ll set up your $1,000 starter emergency fund and sinking funds.');
    else body = guide('Savings, explained', '<b>Starter emergency fund ($1,000):</b> a cushion for true surprises like a car repair or a doctor visit, so a bad day doesn’t become new debt. Keep it separate. Use it only for real emergencies.<br><b>Sinking funds:</b> money you set aside a little each month for things you <i>know</i> are coming, like Christmas, car registration or a vacation. When the bill comes, the money is already there.') +
      b.funds.map((f) => fundCard(f)).join('') +
      `<div class="card2"><b>Add a sinking fund</b><div class="mrow"><input class="field" id="fName" maxlength="30" placeholder="What is it for? (Christmas, car, vacation)"><span class="dollar"><input class="field" id="fTarget" inputmode="decimal" placeholder="Goal"></span><span class="dollar"><input class="field" id="fMonthly" inputmode="decimal" placeholder="Per month"></span><button type="button" class="btn go-btn small" data-bank="addfund">Add</button></div></div>`;
  } else if (tab === 'debts') {
    if (b.level < 3) body = lockCard(3, 'Debt snowball', b.setup ? 'Log purchases on 3 different days to finish building your budget. Then you’ll list every debt and pay them off with the snowball method.' : 'Set up your income and bills first.');
    else {
      const order = snowballOrder(b.debts);
      const extra = ui.extra ?? 100;
      const months = snowballMonths(b.debts, Number(extra) || 0);
      body = guide('The debt snowball', 'List every debt from <b>smallest balance to largest</b> (ignore interest rates for now). Pay the minimum on all of them, and put every extra dollar on the <b>smallest</b> one. When it’s paid off, roll its whole payment onto the next one. The payment grows like a snowball rolling downhill, and the quick wins keep you going.') +
        order.map((d, n) => debtCard(d, n === 0 && d.balance > 0)).join('') +
        `<div class="card2"><b>Add a debt</b><div class="mrow"><input class="field" id="dName" maxlength="30" placeholder="Name (Visa, car, student loan)"><span class="dollar"><input class="field" id="dBal" inputmode="decimal" placeholder="Balance"></span><span class="dollar"><input class="field" id="dMin" inputmode="decimal" placeholder="Minimum/mo"></span><button type="button" class="btn go-btn small" data-bank="adddebt">Add</button></div>${!b.debts.length && !b.noDebts ? '<p class="foot">No debts at all? <button type="button" class="btn link small" data-bank="nodebts">We don’t have any debts 🎉</button></p>' : ''}</div>` +
        (b.debts.some((d) => d.balance > 0) ? `<div class="card2"><b>Snowball plan</b><div class="money-row"><label for="dExtra">Extra each month</label><span class="dollar"><input class="field small" id="dExtra" inputmode="decimal" value="${extra}"></span><button type="button" class="btn soft small" data-bank="calc">Update</button></div><p class="hint">${months == null ? 'Add the minimum payments to see a debt-free date.' : `Debt-free in about <b>${months} months</b> with the snowball${Number(extra) ? ` and ${usd(Number(extra))} extra a month` : ''}.`}</p></div>` : '');
    }
  }
  return moneyHeader(state) + seg + body;
}
const lockCard = (lv, name, text) => `<div class="card2 lockc"><span class="lk">${svgI('lock', '#fff', 22, 2.6)}</span><div><b>${name} opens at money level ${lv}</b><p class="hint">${text}</p></div></div>`;
function fundCard(f) {
  const pct = f.target ? Math.min(100, (f.balance / f.target) * 100) : 0;
  return `<div class="card2 fund${f.kind === 'emergency' ? ' ef' : ''}"><div class="row"><b>${esc(f.name)}</b><span class="muted">${usd(f.balance)} of ${usd(f.target)}</span></div><div class="pbar"><i style="width:${pct.toFixed(0)}%"></i></div>
    ${f.monthly ? `<small>${usd(f.monthly)} a month</small>` : ''}<div class="money-row"><label>Update balance</label><span class="dollar"><input class="field small" data-balin="fund:${f.id}" inputmode="decimal" value="${f.balance}"></span><button type="button" class="btn soft small" data-bal="fund:${f.id}">Save +${REWARD.balance.coins}</button></div></div>`;
}
function debtCard(d, focus) {
  const pct = d.start ? Math.min(100, ((d.start - d.balance) / d.start) * 100) : 0;
  return `<div class="card2 debt${focus ? ' focus' : ''}${d.balance <= 0 ? ' paid' : ''}"><div class="row"><b>${esc(d.name)}</b>${focus ? '<span class="schip" style="--c:#2F86D8">Snowball target</span>' : d.balance <= 0 ? '<span class="schip" style="--c:#3E8E57">Paid off!</span>' : ''}</div>
    <small>${usd(d.balance)} left${d.min ? ` · ${usd(d.min)} minimum` : ''}</small><div class="pbar"><i style="width:${pct.toFixed(0)}%"></i></div>
    ${d.balance > 0 ? `<div class="money-row"><span class="dollar"><input class="field small" data-payin="${d.id}" inputmode="decimal" placeholder="Payment"></span><button type="button" class="btn go-btn small" data-pay="${d.id}">Record payment</button>
    <span class="dollar"><input class="field small" data-balin="debt:${d.id}" inputmode="decimal" value="${d.balance}"></span><button type="button" class="btn soft small" data-bal="debt:${d.id}">Update balance</button></div>` : ''}</div>`;
}

/* ---------- Payday ---------- */
export function renderPaydayIn(amount) {
  return guide('The payday train is here!', 'Check the amount that landed in your account today, then see where the money went since last payday.') +
    `<div class="payin"><label class="q" for="payAmt2">Take-home pay today</label><span class="dollar big"><input class="field" id="payAmt2" inputmode="decimal" value="${amount}"></span></div>
    <div class="actions"><button type="button" class="btn go-btn" data-pay2="show">Show the breakdown</button></div>`;
}
export function renderPaydayBreakdown(bd) {
  const C = 2 * Math.PI * 40;
  let off = 0;
  const arcs = bd.slices.map((s) => { const len = (s.pct / 100) * C; const a = `<circle cx="60" cy="60" r="40" fill="none" stroke="${s.color}" stroke-width="22" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"/>`; off += len; return a; }).join('');
  return `<div class="payb"><div class="pie"><svg viewBox="0 0 120 120" aria-label="Spending breakdown">${arcs}<text x="60" y="56" text-anchor="middle" class="pt1">${usd(bd.amountIn)}</text><text x="60" y="72" text-anchor="middle" class="pt2">came in</text></svg></div>
    <div class="legend"><p class="hint">${bd.tracked ? `Where money went since ${shortDate(bd.from)}:` : 'Nothing logged since last payday, so here’s your plan for this paycheck:'}</p>
    ${bd.slices.map((s) => `<div class="lg"><i style="background:${s.color}"></i><b>${esc(s.label)}</b><span>${s.pct}%</span><span class="trucks">${Array.from({ length: s.full }, () => truckSvg(s.color, false)).join('')}${s.half ? truckSvg(s.color, true) : ''}</span></div>`).join('')}
    <p class="foot">Every 10% is a truckload of money. About 5% is a half load.</p></div></div>
    <div class="actions"><button type="button" class="btn go-btn" data-pay2="send">${svgI('check', '#fff', 16, 3)} Got it, send the trucks</button></div>`;
}

export function renderMoneyLevelUp(level) {
  const L = MONEY_LEVELS.find((l) => l.level === level);
  const text = { 2: 'Your income and bills are in. Next, <b>build the budget</b>: log purchases on 3 different days so the plan meets real life.', 3: 'Your budget is working. Now <b>list your debts</b>, smallest balance first, and start the <b>snowball</b>. The <b>Debt Payoff Center</b> is unlocked to build.', 4: 'Debts are on the table. Now <b>save on purpose</b>: put something in the <b>$1,000 starter emergency fund</b> and start a <b>sinking fund</b>. The <b>Savings Tower</b> is unlocked to build.', 5: 'Every money step is done. You’re a <b>Money master</b>: the <b>Nest Egg Tower</b> is ready to build, free, as your trophy.' }[level] || '';
  const go = { 2: ['logtx', 'Log a purchase'], 3: ['opendebts', 'List my debts'], 4: ['opensavings', 'Set up savings'] }[level];
  return `<div class="lvlup"><span class="burst">${ART.coin}<b>${level}</b></span><b class="ttl">Money level ${level}: ${L.name}!</b><p>${text}</p>
    ${go ? `<button type="button" class="btn go-btn" data-bank="${go[0]}">${go[1]}</button>` : '<button type="button" class="btn go-btn" data-close="1">Keep going</button>'}</div>`;
}
