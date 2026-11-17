#!/usr/bin/env python3
"""Debt Payoff Tracker - built with the etsy-sheet-builder skill.

    python build.py --out products/debt-payoff-tracker

Four workbooks (light/dark x blank/sample) plus expect.json. The payoff forecast is a month-by-month
simulation written in plain formulas on three hidden sheets (snowball, avalanche, custom order):
240 months x 15 debts, two cells per debt-month. Minimum-payments-only is a closed form (NPER).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from openpyxl.worksheet.datavalidation import DataValidation  # noqa: E402

from sheetkit import THEME_ORDER, Kit, L, ref, rng  # noqa: E402

SAMPLE_THEMES = ("classic", "dark")

PRODUCT = "Debt Payoff Tracker"
ND, NM = 15, 240                      # debts, months simulated
D0 = 10                               # first debt row on My Debts
C0, CN = 2, 2 + ND - 1                # debt rows on Calc
S0, SN = 7, 7 + NM - 1                # month rows on the sim sheets and the schedule (same rows on purpose)
LG0, LGN = 6, 505                     # payment log rows
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
          "October", "November", "December"]
METHODS = ["Snowball", "Avalanche", "My order"]
TYPES = ["Credit card", "Car loan", "Student loan", "Personal loan", "Medical", "Mortgage", "Other"]
SIMS = ["SimS", "SimA", "SimC"]
NCOL, ECOL = 6, 22                    # first column of the "need" block and the "end balance" block on a sim sheet

# Calc columns for the per-debt table
CC = dict(idx="A", name="B", start="C", apr="D", minp="E", due="F", order="G", lastidx="H", lastbal="I",
          since="J", now="K", paid="L", active="M", keyS="N", rankS="O", keyA="P", rankA="Q", keyC="R",
          rankC="S", rank="T", pmS="U", pmA="V", pmC="W", pm="X", intS="Y", intA="Z", intC="AA", int="AB",
          minN="AC", minInt="AD", seq="AE", list="AF")


def cc(key, i=None, sheet=True):
    """Calc reference: cc('now', 3) -> Calc!$K$5 ; cc('now') -> Calc!$K$2:$K$16."""
    col = CC[key]
    pre = "Calc!" if sheet else ""
    return f"{pre}${col}${C0 + i}" if i is not None else f"{pre}${col}${C0}:${col}${CN}"


SC = {k: f"Calc!$AI${2 + i}" for i, k in enumerate(
    ["method", "extra", "lump", "budget", "first", "total", "start", "mS", "mA", "mC", "m", "iS", "iA", "iC", "i",
     "never", "minM", "minI", "active", "year", "named", "paidoff"])}


def loc(key):
    """The same scalar as SC[key], for formulas written on the Calc sheet itself."""
    return SC[key].split("!")[1]


LOG = {k: f"'Payment Log'!${c}${LG0}:${c}${LGN}" for k, c in
       dict(date="B", debt="C", amt="D", bal="E", idx="I", has="J", last="K", ym="L").items()}
M_SHORT = "Calc!$AM$2:$AM$13"

DEMO_DEBTS = [  # name, type, starting balance, APR, minimum, due day, my order
    ("Store card", "Credit card", 900, 0.2699, 35, 12, None),
    ("Medical bill", "Medical", 1450, 0.0, 75, 16, None),
    ("Family loan", "Other", 2000, 0.0, 100, 1, 3),
    ("Furniture plan", "Other", 2600, 0.099, 85, 8, 4),
    ("Travel card", "Credit card", 3300, 0.1999, 90, 14, 1),
    ("Credit card", "Credit card", 4800, 0.229, 120, 22, 2),
    ("Personal loan", "Personal loan", 6200, 0.115, 190, 5, 5),
    ("Car loan", "Car loan", 13400, 0.064, 310, 10, 6),
    ("Student loan", "Student loan", 21800, 0.055, 235, 28, 7),
]
DEMO = dict(method="Snowball", extra=150, lump=0, year=2026, today=dt.date(2026, 11, 17))


def demo_log():
    """Eleven months of real-looking history: minimums on each due day, the spare money on the smallest debt."""
    bal = {d[0]: float(d[2]) for d in DEMO_DEBTS}
    order = [d[0] for d in sorted(DEMO_DEBTS, key=lambda d: d[2])]
    cards = {d[0] for d in DEMO_DEBTS if d[1] == "Credit card"}
    rows, done = [], set()
    for m in range(1, 12):
        pool = 150 + sum(d[4] for d in DEMO_DEBTS if d[0] in done)
        target = next((n for n in order if n not in done), None)
        for name, _, _, apr, minp, due, _ in sorted(DEMO_DEBTS, key=lambda d: d[5]):
            day = dt.date(2026, m, due)
            if name in done or day > DEMO["today"]:
                continue
            bal[name] *= 1 + apr / 12
            pay = min(bal[name], minp + (pool if name == target else 0))
            bal[name] -= pay
            paid_off = bal[name] <= 0.005
            if paid_off:
                done.add(name)
                bal[name] = 0.0
            record = paid_off or name in cards or m % 3 == 0
            note = "Paid off!" if paid_off else ("Statement balance" if record else "")
            rows.append((day, name, round(pay, 2), round(bal[name], 2) if record else None, note))
    rows.sort(key=lambda r: (r[0], r[1]))
    return rows


def balances_from_log(rows):
    """The workbook's rule, written independently: latest balance typed in, minus payments logged after it."""
    out = {}
    for name, _, start, *_ in DEMO_DEBTS:
        mine = [(i, r) for i, r in enumerate(rows) if r[1] == name]
        last = max((i for i, r in mine if r[3] is not None), default=None)
        base = start if last is None else rows[last][3]
        out[name] = max(0.0, base - sum(r[2] for i, r in mine if last is None or i > last))
    return out


def simulate(debts, order, budget, lump=0.0, horizon=NM):
    """Reference payoff simulation. debts: list of [balance, apr, minimum]. Returns (months, interest, payoff months)."""
    bal = [d[0] for d in debts]
    interest, payoff = 0.0, [0 if b <= 0.005 else None for b in bal]
    for t in range(1, horizon + 1):
        if sum(bal) <= 0.005:
            return t - 1, interest, payoff
        pool = budget + (lump if t == 1 else 0)
        for i, (_, apr, minp) in enumerate(debts):
            add = bal[i] * apr / 12
            interest += add
            bal[i] += add
            pay = min(bal[i], minp)
            bal[i] -= pay
            pool -= pay
        for i in order:
            extra = max(0.0, min(pool, bal[i]))
            bal[i] -= extra
            pool -= extra
        for i in range(len(bal)):
            if payoff[i] is None and bal[i] <= 0.005:
                payoff[i] = t
    return (horizon if sum(bal) <= 0.005 else horizon + 1), interest, payoff


def minimum_only(debts):
    """Each debt paid at its own minimum, nothing rolled over. Returns (None, None) if one never clears."""
    months, interest = 0, 0.0
    for bal, apr, minp in debts:
        if bal <= 0.005:
            continue
        if minp <= bal * apr / 12 + 1e-6:
            return None, None
        n = 0
        while bal > 1e-9:
            add = bal * apr / 12
            interest += add
            bal = bal + add - min(bal + add, minp)
            n += 1
        months = max(months, n)
    return months, interest


# ==========================================================================================
def build(out_dir: Path, theme: str, demo: bool):
    kit = Kit(theme=theme)
    wb = kit.workbook()
    hair = kit.hairline()
    MT = kit.money_txt
    QUIET = "quiet"   # the muted series in charts, from the palette
    debts = DEMO_DEBTS if demo else []
    log = demo_log() if demo else []
    expect = []

    def cellp(ws, r, c, v=None, **kw):
        kw.setdefault("fill", "surface")
        kw.setdefault("border", hair)
        return kit.put(ws, r, c, v, **kw)

    def money(ws, r, c, v=None, **kw):
        kw.setdefault("fmt", kit.money)
        kw.setdefault("align", "right")
        return cellp(ws, r, c, v, **kw)

    def menu(ws, row, col):
        kit.link(ws, row, col, "☰  Menu", "Start Here", align="right", fill="band", size=9)

    def span(months):
        """Formula fragment: 41 -> '3 yr 5 mo'."""
        return f'IF({months}<12,{months}&" mo",INT({months}/12)&" yr "&MOD({months},12)&" mo")'

    # -------------------------------------------------------------------- Start Here ----
    ws = kit.sheet(wb, "Start Here", [2, 6, 62, 3, 20, 46, 2], rows=26, tab="neutral")
    kit.banner(ws, 2, 2, 6, PRODUCT, "List what you owe, pick a method, and see the day you will be debt-free.")
    kit.strip(ws, 5, 2, ["QUICK START", ""], color="neutral")
    kit.strip(ws, 5, 5, ["WHAT'S INSIDE", ""], color="neutral")
    steps = [
        "Open the My Debts tab. List each debt with its balance, interest rate (APR) and minimum payment.",
        "Open the Payoff Plan tab. Choose Snowball, Avalanche or My order, and type what extra you can pay each month.",
        "Read your debt-free date, the interest you will pay and how much the plan saves you.",
        "Each time you pay, add a row on the Payment Log tab: date, debt, amount.",
        "When a statement arrives, type its balance in “Balance after” so interest is counted.",
    ]
    for i, text in enumerate(steps):
        r = 6 + i
        ws.row_dimensions[r].height = 40
        cellp(ws, r, 2, i + 1, size=14, bold=True, color="debt", align="center")
        cellp(ws, r, 3, text, wrap=True)
    tabs = [("My Debts", "Your list of debts and where each one stands"),
            ("Payoff Plan", "Method, extra payment, debt-free date, comparison"),
            ("Payoff Schedule", "Every month until you are debt-free"),
            ("Payment Log", "The payments you have made"),
            ("Year Summary", "What you paid, month by month and debt by debt")]
    for i, (name, what) in enumerate(tabs):
        r = 6 + i
        kit.link(ws, r, 5, name, name, color="debt", size=10, bold=True, fill="surface", border=hair,
                 underline="single", indent=1)
        cellp(ws, r, 6, what, color="muted", size=9.5)
    kit.strip(ws, 12, 2, ["GOOD TO KNOW", ""], color="neutral")
    kit.strip(ws, 12, 5, ["THE COLOURS", ""], color="neutral")
    kit.input(ws, 13, 5, "Yellow", align="center")
    cellp(ws, 13, 6, "Yours to type in.", color="muted", size=9.5)
    kit.input(ws, 14, 5, "Pale yellow", soft=True, align="center")
    cellp(ws, 14, 6, "Filled in for you. Type over it if you need to.", color="muted", size=9.5)
    cellp(ws, 15, 5, "White", align="center")
    cellp(ws, 15, 6, "Calculates itself. Leave these alone.", color="muted", size=9.5)
    notes = [
        "Snowball pays the smallest balance first, for quick wins. Avalanche pays the highest interest rate first, to pay the least interest.",
        "Every method pays the minimum on every debt. The extra goes to one debt at a time, and each paid-off debt's payment rolls on to the next.",
        "The plan always starts from today's balances, so it updates itself as you log payments.",
        "The forecast assumes fixed rates and minimum payments. Your lender's figures may differ a little – it is a plan, not financial advice.",
        "Give every debt its own name. The plan covers the next 20 years; a longer debt shows as “20+ years”.",
        "Sheets are protected so formulas can't be deleted by accident. In Excel: Review → Unprotect Sheet. There is no password.",
    ]
    for i, text in enumerate(notes):
        r = 13 + i
        ws.row_dimensions[r].height = 34
        cellp(ws, r, 2, "•", color="muted", align="center")
        cellp(ws, r, 3, text, wrap=True, size=9.5)
    kit.preview(ws, "A1:G19")

    # ---------------------------------------------------------------------- My Debts ----
    ws = kit.sheet(wb, "My Debts", [2, 24, 15, 15, 9, 13, 9, 9, 14, 21, 9, 12, 13, 12, 2], rows=34, tab="debt")
    kit.banner(ws, 2, 2, 14, "My Debts", "List every debt once. Balances update from your Payment Log.", title_cols=12)
    menu(ws, 2, 14)
    DN = D0 + ND - 1
    kit.card(ws, 5, 2, 3, "OWED NOW", f"={SC['total']}", f'="started at "&TEXT({SC["start"]},"{MT}")', color="debt")
    kit.card(ws, 5, 4, 6, "PAID OFF SO FAR", f"={SC['start']}-{SC['total']}",
             f'=IF({SC["start"]}>0,TEXT(({SC["start"]}-{SC["total"]})/{SC["start"]},"0%")&" of what you started with","")',
             color="income")
    kit.card(ws, 5, 7, 9, "MINIMUM PAYMENTS", f"=SUMPRODUCT(({cc('active')}=1)*{cc('minp')})", "each month, debts still open", color="bills")
    kit.card(ws, 5, 10, 11, "DEBTS", f'={SC["active"]}&" open"', f'={SC["paidoff"]}&" paid off"', color="neutral")
    kit.card(ws, 5, 12, 14, "HIGHEST RATE", f'=IF({SC["active"]}=0,0,-MIN({cc("keyA")}))', "pay this first to save the most", color="expenses", fmt="0.0%")
    kit.strip(ws, 9, 2, ["DEBT", "Type", "Starting balance", "APR", "Minimum", "Due day", "My order", "Balance now",
                         "Paid off", "Pay order", "Debt-free", "Interest to go", "Next due"], color="debt",
              aligns=["left", "left", "right", "right", "right", "center", "center", "right", "left", "center",
                      "center", "right", "center"])
    for i in range(ND):
        r = D0 + i
        d = debts[i] if i < len(debts) else (None,) * 7
        nm = f"$B{r}"
        kit.input(ws, r, 2, d[0])
        kit.input(ws, r, 3, d[1], size=9.5)
        kit.input(ws, r, 4, d[2], fmt=kit.money, align="right")
        kit.input(ws, r, 5, d[3], fmt="0.0#%", align="right")
        kit.input(ws, r, 6, d[4], fmt=kit.money, align="right")
        kit.input(ws, r, 7, d[5], fmt="0", align="center")
        kit.input(ws, r, 8, d[6], fmt="0", align="center")
        act, pm = cc("active", i), cc("pm", i)
        money(ws, r, 9, f'=IF({nm}="","",{cc("now", i)})', bold=True)
        kit.bar(ws, r, 10, kit.bar_formula(f"({cc('start', i)}-{cc('now', i)})", cc("start", i), guard=f'{nm}=""'), color="debt")
        cellp(ws, r, 11, f'=IF({nm}="","",IF({act}=1,{cc("rank", i)},"✓"))', align="center", bold=True, color="debt")
        cellp(ws, r, 12, f'=IF({nm}="","",IF({act}=0,"Paid off",IF({pm}>{NM},"20+ yrs",EDATE({SC["first"]},{pm}-1))))',
              fmt="mmm yyyy", align="center")
        money(ws, r, 13, f'=IF(OR({nm}="",{act}=0),"",{cc("int", i)})', color="muted")
        due = cc("due", i)
        this_m = f"DATE(YEAR(TODAY()),MONTH(TODAY()),MIN({due},DAY(EOMONTH(TODAY(),0))))"
        next_m = f"DATE(YEAR(TODAY()),MONTH(TODAY())+1,MIN({due},DAY(EOMONTH(TODAY(),1))))"
        cellp(ws, r, 14, f'=IF(OR({nm}="",{act}=0,{due}=""),"",IF({this_m}>=TODAY(),{this_m},{next_m}))',
              fmt=kit.date, align="center", color="muted")
    cellp(ws, DN + 1, 2, "Total", bold=True, indent=1)
    for c in (3, 5, 7, 8, 11, 12, 14):
        cellp(ws, DN + 1, c)
    money(ws, DN + 1, 4, f"=SUM(D{D0}:D{DN})", bold=True)
    money(ws, DN + 1, 6, f"=SUM(F{D0}:F{DN})", bold=True)
    money(ws, DN + 1, 9, f"=SUM(I{D0}:I{DN})", bold=True)
    kit.bar(ws, DN + 1, 10, kit.bar_formula(f"(D{DN + 1}-I{DN + 1})", f"D{DN + 1}"), color="debt")
    money(ws, DN + 1, 13, f"=SUM(M{D0}:M{DN})", bold=True, color="muted")
    kit.dropdown(ws, f"C{D0}:C{DN}", TYPES)
    kit.number_only(ws, f"D{D0}:F{DN}", minimum=0)
    dv = DataValidation(type="whole", operator="between", formula1="1", formula2="31", allow_blank=True)
    dv.showErrorMessage, dv.errorTitle, dv.error = True, "Day of the month", "Type a day from 1 to 31, or leave it empty."
    ws.add_data_validation(dv)
    dv.add(f"G{D0}:G{DN}")
    kit.cf_formula(ws, f"B{D0}:B{DN}", f'=AND(B{D0}<>"",COUNTIF($B${D0}:$B${DN},B{D0})>1)', color="neg", bold=True)
    kit.cf_formula(ws, f"L{D0}:L{DN}", f'=L{D0}="Paid off"', color="pos", bold=True)
    kit.cf_formula(ws, f"N{D0}:N{DN}", f"=AND(ISNUMBER(N{D0}),N{D0}<=TODAY()+7)", color="neg", bold=True)
    kit.strip(ws, DN + 3, 2, ["HOW IT WORKS"] + [""] * 12, color="neutral")
    tips = ["APR is the yearly interest rate on your statement. Type 22.9% as 22.9%. Use 0% for interest-free debts.",
            "Starting balance is what you owed when you began. Balance now is worked out from your Payment Log.",
            "My order is only used by the “My order” method: number your debts 1, 2, 3 in the order you want to pay them.",
            "A name shown in red is used twice. Give each debt its own name.",
            "Next due turns red when a payment is due within a week."]
    for i, text in enumerate(tips):
        kit.merge(ws, DN + 4 + i, 2, 14, text, fill="surface", border=hair, color="muted", size=9.5, indent=1)
    kit.preview(ws, f"A1:O{DN + 9}")

    # -------------------------------------------------------------------------- Calc ----
    cs = kit.sheet(wb, "Calc", [8] * 4, rows=2, hidden=True)
    for key, col in CC.items():
        cs[f"{col}1"] = key
    rank = lambda k, r: f"=SUMPRODUCT(--(${k}${C0}:${k}${CN}<{k}{r}))+SUMPRODUCT(--(${k}${C0}:{k}{r}={k}{r}))"  # noqa: E731
    for i in range(ND):
        r, s = C0 + i, D0 + i
        src = lambda col: f"'My Debts'!${col}${s}"  # noqa: E731
        e = L(ECOL + i)
        row = dict(
            idx=i + 1,
            name=f'=IF({src("B")}="","",TRIM({src("B")}))',
            start=f"=N({src('D')})", apr=f"=N({src('E')})", minp=f"=N({src('F')})",
            due=f'=IF(ISNUMBER({src("G")}),MIN(31,MAX(1,INT({src("G")}))),"")',
            order=f'=IF(ISNUMBER({src("H")}),{src("H")},999)',
            lastidx=f'=IF(B{r}="",0,SUMIFS({LOG["idx"]},{LOG["debt"]},B{r},{LOG["last"]},1))',
            lastbal=f'=IF(B{r}="",0,SUMIFS({LOG["bal"]},{LOG["debt"]},B{r},{LOG["last"]},1))',
            since=f'=IF(B{r}="",0,SUMIFS({LOG["amt"]},{LOG["debt"]},B{r},{LOG["idx"]},">"&H{r}))',
            now=f'=IF(B{r}="",0,MAX(0,IF(H{r}>0,I{r},C{r})-J{r}))',
            paid=f'=IF(B{r}="",0,SUMIF({LOG["debt"]},B{r},{LOG["amt"]}))',
            active=f'=IF(AND(B{r}<>"",K{r}>0.005),1,0)',
            keyS=f"=IF(M{r}=1,K{r},99999999)", rankS=rank("N", r),
            keyA=f"=IF(M{r}=1,-D{r},99999999)", rankA=rank("P", r),
            keyC=f"=IF(M{r}=1,G{r},99999999)", rankC=rank("R", r),
            rank=f"=CHOOSE({loc('method')},O{r},Q{r},S{r})",
            pm=f"=CHOOSE({loc('method')},U{r},V{r},W{r})", int=f"=CHOOSE({loc('method')},Y{r},Z{r},AA{r})",
            minN=f'=IF(M{r}=0,0,IF(E{r}<=K{r}*D{r}/12+0.000001,"never",ROUNDUP(NPER(D{r}/12,-E{r},K{r})-0.000000001,0)))',
            seq=f'=IF(B{r}="","",MAX(AE$1:AE{r - 1})+1)',
            list=f'=IFERROR(INDEX($B${C0}:$B${CN},MATCH(A{r},$AE${C0}:$AE${CN},0)),"")',
        )
        g, k = f"(1+D{r}/12)", f"(AC{r}-1)"
        left = f"IF(D{r}=0,K{r}-{k}*E{r},K{r}*{g}^{k}-E{r}*({g}^{k}-1)/(D{r}/12))"
        row["minInt"] = f'=IF(OR(M{r}=0,AC{r}="never"),0,{k}*E{r}+{left}*{g}-K{r})'
        for sim, pmk, ik in zip(SIMS, ("pmS", "pmA", "pmC"), ("intS", "intA", "intC")):
            row[pmk] = f'=IF(M{r}=0,0,COUNTIF({sim}!${e}${S0}:${e}${SN},">0.005")+1)'
            row[ik] = f"=D{r}/12*(K{r}+SUM({sim}!${e}${S0}:${e}${SN - 1}))"
        for key, v in row.items():
            cs[f"{CC[key]}{r}"] = v
    cs["AE1"] = "seq"
    scal = [
        ("method", "=IFERROR(MATCH('Payoff Plan'!$F$10,$AK$2:$AK$4,0),1)"),
        ("extra", "=MAX(0,N('Payoff Plan'!$F$11))"),
        ("lump", "=MAX(0,N('Payoff Plan'!$F$12))"),
        ("budget", f'=SUMPRODUCT((B{C0}:B{CN}<>"")*E{C0}:E{CN})+{loc("extra")}'),
        ("first", "=DATE(YEAR(TODAY()),MONTH(TODAY()),1)"),
        ("total", f"=SUM(K{C0}:K{CN})"),
        ("start", f'=SUMPRODUCT((B{C0}:B{CN}<>"")*C{C0}:C{CN})'),
        *[(k, f'=IF({loc("total")}<=0.005,0,COUNTIF({s}!$D${S0}:$D${SN},">0.005")+1)') for k, s in zip(("mS", "mA", "mC"), SIMS)],
        ("m", f"=CHOOSE({loc('method')},{loc('mS')},{loc('mA')},{loc('mC')})"),
        *[(k, f"=SUM({s}!$C${S0}:$C${SN})") for k, s in zip(("iS", "iA", "iC"), SIMS)],
        ("i", f"=CHOOSE({loc('method')},{loc('iS')},{loc('iA')},{loc('iC')})"),
        ("never", f'=IF(COUNTIF(AC{C0}:AC{CN},"never")>0,1,0)'),
        ("minM", f"=IF({loc('never')}=1,0,MAX(AC{C0}:AC{CN}))"),
        ("minI", f"=SUM(AD{C0}:AD{CN})"),
        ("active", f"=SUM(M{C0}:M{CN})"),
        ("year", "=IF(ISNUMBER('Year Summary'!$I$2),'Year Summary'!$I$2,YEAR(TODAY()))"),
        ("named", f'=SUMPRODUCT(--(B{C0}:B{CN}<>""))'),
        ("paidoff", f'=SUMPRODUCT((B{C0}:B{CN}<>"")*(M{C0}:M{CN}=0)*(C{C0}:C{CN}>0))'),
    ]
    for n, (label, f) in enumerate(scal):
        cs[f"AH{2 + n}"], cs[f"AI{2 + n}"] = label, f
    for n, v in enumerate(METHODS):
        cs[f"AK{2 + n}"] = v
    for n, v in enumerate(MON):
        cs[f"AM{2 + n}"] = v
    # chart: 13 points spread evenly from today to the debt-free month
    cs["AO1"], cs["AP1"], cs["AQ1"] = "label", "month", "balance"
    for n in range(13):
        r = 2 + n
        cs[f"AP{r}"] = f"=ROUND({n}*MIN({NM},{loc('m')})/12,0)"
        cs[f"AO{r}"] = (f'=IF(AP{r}=0,"",INDEX($AM$2:$AM$13,MONTH(EDATE({loc("first")},MAX(0,AP{r}-1))))&" "'
                        f'&RIGHT(YEAR(EDATE({loc("first")},MAX(0,AP{r}-1))),2))') if n else '="Now"'
        cs[f"AQ{r}"] = f"=IF(AP{r}=0,{loc('total')},N(INDEX('Payoff Schedule'!$G${S0}:$G${SN},AP{r})))"
    for n, (lab, f) in enumerate([("Snowball", "=" + loc("iS")), ("Avalanche", "=" + loc("iA")), ("My order", "=" + loc("iC")),
                                  ("Minimums only", "=" + loc("minI"))]):
        cs[f"AS{2 + n}"], cs[f"AT{2 + n}"] = lab, f
    for k in range(1, ND + 1):          # which debt sits at each place in the pay order
        cs[f"AV{1 + k}"] = f"=IFERROR(MATCH({k},$T${C0}:$T${CN},0),{k})"

    # ------------------------------------------------------ the three simulation sheets ----
    n1, n2, e1, e2 = L(NCOL), L(NCOL + ND - 1), L(ECOL), L(ECOL + ND - 1)
    for sim, rk in zip(SIMS, ("rankS", "rankA", "rankC")):
        ss = kit.sheet(wb, sim, [8] * 4, rows=2, hidden=True)
        ss["A1"], ss["B1"], ss["C1"], ss["D1"] = "month", "pool", "interest", "balance"
        ss["A2"], ss["A3"], ss["A4"], ss["A5"], ss["A6"] = "rank", "growth", "rate", "minimum", "now"
        for i in range(ND):
            n, e = L(NCOL + i), L(ECOL + i)
            ss[f"{n}2"] = f"={cc(rk, i)}"
            ss[f"{n}3"] = f"=1+{cc('apr', i)}/12"
            ss[f"{n}4"] = f"={cc('apr', i)}/12"
            ss[f"{n}5"] = f"={cc('minp', i)}"
            ss[f"{e}1"] = f'="<"&{n}2'
            ss[f"{e}6"] = f"={cc('now', i)}"
        ss["D6"] = f"=SUM({e1}6:{e2}6)"
        for r in range(S0, SN + 1):
            p = r - 1
            ss[f"A{r}"] = r - S0 + 1
            # the same formula on every row (the one-time payment is switched on by the month number):
            # one odd formula at the top of the column made LibreOffice evaluate it out of order on load
            lump = f"+IF($A{r}=1,{SC['lump']},0)"
            ss[f"B{r}"] = (f"={SC['budget']}{lump}-(SUMPRODUCT(${e1}{p}:${e2}{p},${n1}$3:${n2}$3)+SUM(${n1}$5:${n2}$5)"
                           f"-SUMPRODUCT(ABS(${e1}{p}:${e2}{p}*${n1}$3:${n2}$3-${n1}$5:${n2}$5)))/2")
            ss[f"C{r}"] = f"=SUMPRODUCT(${e1}{p}:${e2}{p},${n1}$4:${n2}$4)"
            ss[f"D{r}"] = f"=SUM({e1}{r}:{e2}{r})"
            for i in range(ND):
                n, e = L(NCOL + i), L(ECOL + i)
                ss[f"{n}{r}"] = f"=MAX(0,{e}{p}*{n}$3-{n}$5)"                      # owed after interest and the minimum
                ss[f"{e}{r}"] = (f"={n}{r}-MAX(0,MIN({n}{r},$B{r}"                 # minus this debt's share of the extra
                                 f"-SUMIF(${n1}$2:${n2}$2,{e}$1,${n1}{r}:${n2}{r})))")

    # ------------------------------------------------------------------- Payoff Plan ----
    ws = kit.sheet(wb, "Payoff Plan", [2, 22, 13, 13, 13, 13, 19, 3, 22, 13, 12, 13, 14, 2], rows=46, tab="income")
    kit.banner(ws, 2, 2, 13, "Payoff Plan", '="Your plan: "&F10&IF(N(F11)>0," + "&TEXT(F11,"' + MT + '")&" extra a month","")',
               title_cols=11)
    menu(ws, 2, 13)
    M, I, never = SC["m"], SC["i"], SC["never"]
    over = f"{M}>{NM}"
    kit.card(ws, 5, 2, 2, "TOTAL DEBT", f"={SC['total']}", f'=IF({SC["named"]}=0,"add your debts on My Debts",{SC["paidoff"]}&" of "&{SC["named"]}&" debts paid off")', color="debt")
    kit.card(ws, 5, 3, 4, "DEBT-FREE BY", f'=IF({M}=0,"–",IF({over},"20+ years",EDATE({SC["first"]},{M}-1)))',
             '=F10&" method"', color="income", fmt="mmm yyyy")
    kit.card(ws, 5, 5, 6, "TIME TO GO", f'=IF({M}=0,"–",IF({over},"20+ years",{span(M)}))',
             f'=IF(OR({M}=0,{over}),"",{M}&" monthly payments")', color="bills")
    kit.card(ws, 5, 7, 7, "INTEREST TO PAY", f"={I}", f'=IF({over},"in the next 20 years","from today to debt-free")', color="expenses")
    kit.card(ws, 5, 9, 9, "INTEREST SAVED", f'=IF(OR({never}=1,{M}=0,{over}),"–",ROUND({SC["minI"]}-{I},2))',
             f'=IF({never}=1,"minimums alone never clear it","vs minimums only")', color="savings")
    kit.card(ws, 5, 10, 11, "SOONER BY", f'=IF(OR({never}=1,{M}=0,{over},{SC["minM"]}<={M}),"–",{span("(" + SC["minM"] + "-" + M + ")")})',
             "vs minimums only", color="savings")
    kit.card(ws, 5, 12, 13, "YOU PAY EACH MONTH", f"={SC['budget']}", f'=TEXT({SC["budget"]}-SUMPRODUCT(({cc("active")}=1)*{cc("minp")}),"{MT}")&" more than the minimums"', color="neutral")

    kit.strip(ws, 9, 2, ["PLAN SETTINGS", "", "", "", "", ""], color="neutral")
    for r, label in ((10, "Payoff method"), (11, "Extra payment every month"), (12, "One-time extra payment this month")):
        kit.merge(ws, r, 2, 5, label, fill="surface", border=hair, indent=1)
    kit.input(ws, 10, 6, DEMO["method"] if demo else "Snowball", align="center", bold=True, c2=7)
    kit.dropdown(ws, "F10", METHODS, prompt="Snowball, Avalanche or My order.", allow_blank=False)
    kit.input(ws, 11, 6, DEMO["extra"] if demo else None, fmt=kit.money, align="center", c2=7)
    kit.input(ws, 12, 6, DEMO["lump"] if demo else None, fmt=kit.money, align="center", c2=7)
    kit.number_only(ws, "F11:F12", minimum=0)
    kit.merge(ws, 13, 2, 7, '=CHOOSE(' + SC["method"] + ',"Snowball: smallest balance first, for quick wins.",'
              '"Avalanche: highest interest rate first, to pay the least interest.",'
              '"My order: you decide. Number your debts on the My Debts tab.")'
              '&" Payments from paid-off debts roll on to the next one."',
              fill="surface", border=hair, color="muted", size=9, indent=1)

    kit.strip(ws, 9, 9, ["COMPARE METHODS", "Debt-free", "Months", "Interest", "You save"], color="neutral",
              aligns=["left", "center", "center", "right", "right"])
    for n, (lab, mk, ik) in enumerate([("Snowball", "mS", "iS"), ("Avalanche", "mA", "iA"), ("My order", "mC", "iC"),
                                       ("Minimums only", "minM", "minI")]):
        r = 10 + n
        mm, ii = SC[mk], SC[ik]
        dead = f"{never}=1" if n == 3 else f"{mm}>{NM}"
        cellp(ws, r, 9, lab, indent=1)
        cellp(ws, r, 10, f'=IF({SC["total"]}<=0.005,"",IF({dead},"{"Never" if n == 3 else "20+ yrs"}",EDATE({SC["first"]},{mm}-1)))',
              fmt="mmm yyyy", align="center")
        cellp(ws, r, 11, f'=IF(OR({SC["total"]}<=0.005,{dead}),"",{mm})', fmt="0", align="center", color="muted")
        money(ws, r, 12, f'=IF({dead},"",{ii})')
        money(ws, r, 13, "" if n == 3 else f'=IF(OR({never}=1,{dead}),"",ROUND({SC["minI"]}-{ii},2))', color="pos", bold=True)
    kit.cf_formula(ws, "I10:M12", "=$I10=$F$10", bold=True, fill="input_soft")

    kit.strip(ws, 15, 2, ["YOUR BALANCE, FROM TODAY TO DEBT-FREE", "", "", "", "", ""], color="neutral")
    kit.strip(ws, 15, 9, ["INTEREST BY METHOD", "", "", "", ""], color="neutral")
    for r in range(16, 27):
        for c in list(range(2, 8)) + list(range(9, 14)):
            ws.cell(r, c).fill = kit.fill("surface")
    kit.lines(ws, "B16", "Calc!$AO$2:$AO$14", [("Balance", "Calc!$AQ$2:$AQ$14", "debt")], width=17.6, height=7.9)
    kit.columns(ws, "I16", "Calc!$AS$2:$AS$5", [("Interest", "Calc!$AT$2:$AT$5", "expenses")], width=14.4, height=7.9, gap=70)

    kit.strip(ws, 28, 2, ["PAYOFF ORDER", "Balance now", "APR", "Minimum", "Debt-free", "Interest to go"], color="debt",
              aligns=["left", "right", "right", "right", "center", "right"])
    kit.strip(ws, 28, 9, ["PROGRESS SO FAR", "Started at", "Paid off", "", ""], color="debt",
              aligns=["left", "right", "right", "left", "left"])
    names = cc("name")
    for k in range(1, ND + 1):
        r = 28 + k
        ix = f"Calc!$AV${1 + k}"
        pick = lambda key: f"INDEX({cc(key)},{ix})"  # noqa: E731
        nm, act, pm = f"$I{r}", pick("active"), pick("pm")
        cellp(ws, r, 9, f"=INDEX({names},{ix})", indent=1)
        cellp(ws, r, 2, f'=IF({nm}="","",IF({act}=1,"{k}    ","✓    ")&{nm})', indent=1, bold=True)
        money(ws, r, 3, f'=IF({nm}="","",{pick("now")})')
        cellp(ws, r, 4, f'=IF(OR({nm}="",{act}=0),"",{pick("apr")})', fmt="0.0#%", align="right", color="muted")
        money(ws, r, 5, f'=IF(OR({nm}="",{act}=0),"",{pick("minp")})', color="muted")
        cellp(ws, r, 6, f'=IF({nm}="","",IF({act}=0,"Paid off",IF({pm}>{NM},"20+ yrs",EDATE({SC["first"]},{pm}-1))))',
              fmt="mmm yyyy", align="center")
        money(ws, r, 7, f'=IF(OR({nm}="",{act}=0),"",{pick("int")})', color="muted")
        money(ws, r, 10, f'=IF({nm}="","",{pick("start")})', color="muted")
        money(ws, r, 11, f'=IF({nm}="","",{pick("start")}-{pick("now")})')
        kit.bar(ws, r, 12, kit.bar_formula(f"K{r}", f"J{r}", guard=f'{nm}=""'), color="debt")
        ws.merge_cells(start_row=r, start_column=12, end_row=r, end_column=13)
        ws.cell(r, 13).fill = kit.fill("surface")
        ws.cell(r, 13).border = hair
    tr = 28 + ND + 1
    cellp(ws, tr, 2, "Total", bold=True, indent=1)
    cellp(ws, tr, 9, "Total", bold=True, indent=1)
    for c in (4, 6):
        cellp(ws, tr, c)
    for c in (3, 5, 7, 10, 11):
        money(ws, tr, c, f"=SUM({L(c)}29:{L(c)}{tr - 1})", bold=True)
    kit.bar(ws, tr, 12, kit.bar_formula(f"K{tr}", f"J{tr}"), color="debt")
    ws.merge_cells(start_row=tr, start_column=12, end_row=tr, end_column=13)
    ws.cell(tr, 13).fill = kit.fill("surface")
    kit.cf_formula(ws, f"B29:G{tr - 1}", '=$F29="Paid off"', color="pos")
    kit.cf_negative(ws, f"K29:K{tr}")
    kit.preview(ws, f"A1:N{tr + 1}")

    # --------------------------------------------------------------- Payoff Schedule ----
    ws = kit.sheet(wb, "Payoff Schedule", [2, 6, 12, 14, 13, 13, 15, 8, 28, 3] + [13] * ND + [2], rows=SN + 1,
                   tab="bills", freeze="C7")
    last = 10 + ND
    kit.banner(ws, 2, 2, last, "Payoff Schedule", '="Month by month with the "&\'Payoff Plan\'!F10&" method. Change the plan on the Payoff Plan tab."',
               title_cols=8)
    menu(ws, 2, 9)
    kit.strip(ws, 5, 2, ["#", "MONTH", "PAYMENT", "INTEREST", "PRINCIPAL", "BALANCE", "DEBTS", "PAID OFF THIS MONTH"],
              color="neutral", aligns=["center", "left", "right", "right", "right", "right", "center", "left"])
    for i in range(ND):
        kit.put(ws, 5, 11 + i, f"={cc('name', i)}", size=8.5, bold=True, color="on_cat", fill="debt", align="right")
    cellp(ws, 6, 2, 0, align="center", color="muted", size=9)
    cellp(ws, 6, 3, "Now", bold=True)
    for c in (4, 5, 6, 9):
        cellp(ws, 6, c)
    money(ws, 6, 7, f"={SC['total']}", bold=True)
    cellp(ws, 6, 8, f"={SC['active']}", align="center", fmt="0")
    for i in range(ND):
        money(ws, 6, 11 + i, f'=IF({cc("name", i)}="","",{cc("now", i)})', size=9, color="muted")
    pick3 = lambda col, r: f"CHOOSE({SC['method']}," + ",".join(f"{s}!${col}${r}" for s in SIMS) + ")"  # noqa: E731
    for r in range(S0, SN + 1):
        t = r - S0 + 1
        on = f"N($G{r - 1})>0.005"
        cellp(ws, r, 2, f'=IF({on},{t},"")', align="center", color="muted", size=9)
        cellp(ws, r, 3, f'=IF({on},EDATE({SC["first"]},{t - 1}),"")', fmt="mmm yyyy")
        money(ws, r, 4, f'=IF({on},N(G{r - 1})+E{r}-G{r},"")')
        money(ws, r, 5, f'=IF({on},{pick3("C", r)},"")', color="muted")
        money(ws, r, 6, f'=IF({on},D{r}-E{r},"")')
        money(ws, r, 7, f'=IF({on},{pick3("D", r)},"")', bold=True, fmt=kit.money.replace('"–"', f'"{kit.currency}"0.00'))
        cellp(ws, r, 8, f'=IF({on},COUNTIF(K{r}:{L(last)}{r},">0.005"),"")', align="center", fmt="0")
        cellp(ws, r, 9, f'=IF({on},IF(N(H{r - 1})>H{r},IFERROR(INDEX({names},MATCH({t},{cc("pm")},0)),"")'
                        f'&IF(N(H{r - 1})-H{r}>1," +"&(N(H{r - 1})-H{r}-1)&" more",""),""),"")', color="pos", bold=True, size=9.5)
        for i in range(ND):
            money(ws, r, 11 + i, f'=IF(AND({on},{cc("name", i)}<>""),{pick3(L(ECOL + i), r)},"")', size=9, color="muted")
    kit.cf_formula(ws, f"B{S0}:I{SN}", f'=$I{S0}<>""', fill="input_soft")
    kit.preview(ws, f"A1:{L(11 + min(ND, 8))}36")

    # ------------------------------------------------------------------- Payment Log ----
    ws = kit.sheet(wb, "Payment Log", [2, 14, 26, 14, 16, 34, 12, 2, 6, 6, 6, 8], rows=LGN + 1, tab="expenses", freeze="B6")
    kit.banner(ws, 2, 2, 7, "Payment Log", "Add a row each time you pay, newest at the bottom. Balance after is optional: copy it from your statement.", title_cols=6)
    menu(ws, 2, 7)
    kit.strip(ws, 5, 2, ["DATE", "DEBT", "AMOUNT PAID", "BALANCE AFTER", "NOTE", "MONTH"], color="neutral",
              aligns=["left", "left", "right", "right", "left", "left"])
    for n in range(LGN - LG0 + 1):
        r = LG0 + n
        row = log[n] if n < len(log) else (None,) * 5
        kit.input(ws, r, 2, row[0], fmt="mmm d, yyyy", align="left")
        kit.input(ws, r, 3, row[1])
        kit.input(ws, r, 4, row[2], fmt=kit.money, align="right")
        kit.input(ws, r, 5, row[3], fmt='"$"#,##0.00', align="right", soft=True)
        kit.input(ws, r, 6, row[4] or None)
        cellp(ws, r, 7, f'=IF(ISNUMBER(B{r}),INDEX({M_SHORT},MONTH(B{r}))&" "&YEAR(B{r}),"")', color="muted", size=9.5)
        ws.cell(r, 9, n + 1)
        ws.cell(r, 10, f'=IF(AND(C{r}<>"",ISNUMBER(E{r})),1,0)')
        ws.cell(r, 11, f"=IF(J{r}=1,IF(COUNTIFS(C{r + 1}:C${LGN + 1},C{r},J{r + 1}:J${LGN + 1},1)=0,1,0),0)")
        ws.cell(r, 12, f"=IF(ISNUMBER(B{r}),YEAR(B{r})*100+MONTH(B{r}),0)")
    for col in "IJKL":
        ws.column_dimensions[col].hidden = True
    kit.dropdown(ws, f"C{LG0}:C{LGN}", f"Calc!$AF${C0}:$AF${CN}", prompt="Pick one of your debts.")
    kit.number_only(ws, f"D{LG0}:E{LGN}", minimum=0)
    kit.preview(ws, "A1:H34")

    # ------------------------------------------------------------------ Year Summary ----
    ws = kit.sheet(wb, "Year Summary", [2, 15, 11, 15, 22, 3, 24, 15, 11, 22, 2], rows=42, tab="savings")
    kit.banner(ws, 2, 2, 10, "Year Summary", '="What you paid in "&I2&", month by month and debt by debt."', title_cols=7)
    kit.put(ws, 2, 8, "YEAR", size=8.5, bold=True, color="band_sub", fill="band", align="right")
    kit.input(ws, 2, 9, DEMO["year"] if demo else "=YEAR(TODAY())", bold=True, align="center", size=11, fmt="0", soft=not demo)
    kit.put(ws, 3, 9, "▲ type a year", size=8, color="band_sub", fill="band", align="center", valign="top")
    menu(ws, 2, 10)
    Y = SC["year"]
    kit.card(ws, 5, 2, 3, "PAID THIS YEAR", "=D22", "all payments logged", color="income")
    kit.card(ws, 5, 4, 5, "PAYMENTS MADE", "=C22", "rows in your log", color="bills", fmt="0")
    kit.card(ws, 5, 7, 8, "AVERAGE MONTH", '=IF(COUNTIF(D10:D21,">0")>0,D22/COUNTIF(D10:D21,">0"),0)', "in months you paid", color="savings")
    kit.card(ws, 5, 9, 10, "BIGGEST MONTH", "=MAX(D10:D21)", '=IF(MAX(D10:D21)>0,INDEX(B10:B21,MATCH(MAX(D10:D21),D10:D21,0)),"")', color="expenses")
    kit.strip(ws, 9, 2, ["MONTH", "Payments", "Paid", "Share of the year"], color="neutral", aligns=["left", "center", "right", "left"])
    for m in range(12):
        r = 10 + m
        cellp(ws, r, 2, MONTHS[m], indent=1)
        cellp(ws, r, 3, f'=COUNTIFS({LOG["ym"]},{Y}*100+{m + 1},{LOG["amt"]},">0")', fmt='0;-0;"–"', align="center", color="muted")
        money(ws, r, 4, f"=SUMIFS({LOG['amt']},{LOG['ym']},{Y}*100+{m + 1})")
        kit.bar(ws, r, 5, kit.bar_formula(f"D{r}", "$D$22"), color="income")
    cellp(ws, 22, 2, "Year", bold=True, indent=1)
    cellp(ws, 22, 3, "=SUM(C10:C21)", fmt="0", align="center", bold=True)
    money(ws, 22, 4, "=SUM(D10:D21)", bold=True)
    cellp(ws, 22, 5)
    kit.strip(ws, 9, 7, ["DEBT", "Paid this year", "Payments", "Share of the year"], color="debt", aligns=["left", "right", "center", "left"])
    for i in range(ND):
        r = 10 + i
        nm = f"$G{r}"
        yr = f'{LOG["debt"]},{nm},{LOG["ym"]},">="&({Y}*100+1),{LOG["ym"]},"<="&({Y}*100+12)'
        cellp(ws, r, 7, f"={cc('name', i)}", indent=1)
        money(ws, r, 8, f'=IF({nm}="","",SUMIFS({LOG["amt"]},{yr}))')
        cellp(ws, r, 9, f'=IF({nm}="","",COUNTIFS({yr},{LOG["amt"]},">0"))', fmt='0;-0;"–"', align="center", color="muted")
        kit.bar(ws, r, 10, kit.bar_formula(f"H{r}", "$H$25", guard=f'{nm}=""'), color="debt")
    cellp(ws, 25, 7, "Total", bold=True, indent=1)
    money(ws, 25, 8, "=SUM(H10:H24)", bold=True)
    cellp(ws, 25, 9, "=SUM(I10:I24)", fmt="0", align="center", bold=True)
    cellp(ws, 25, 10)
    kit.strip(ws, 27, 2, ["PAID EACH MONTH"] + [""] * 8, color="neutral")
    for r in range(28, 41):
        for c in range(2, 11):
            ws.cell(r, c).fill = kit.fill("surface")
    kit.columns(ws, "B28", "'Year Summary'!$B$10:$B$21", [("Paid", "'Year Summary'!$D$10:$D$21", "income")], width=25.4, height=9.4)
    kit.preview(ws, "A1:K41")

    # ---------------------------------------------------------------- expected values ----
    if demo:
        now = balances_from_log(log)
        sim_debts = [[now[d[0]], d[3], d[4]] for d in DEMO_DEBTS]
        open_ix = [i for i, d in enumerate(sim_debts) if d[0] > 0.005]
        budget = sum(d[4] for d in DEMO_DEBTS) + DEMO["extra"]
        orders = {"S": sorted(open_ix, key=lambda i: sim_debts[i][0]),
                  "A": sorted(open_ix, key=lambda i: -sim_debts[i][1]),
                  "C": sorted(open_ix, key=lambda i: DEMO_DEBTS[i][6] or 999)}
        for n, (k, order) in enumerate(orders.items()):
            months, interest, payoff = simulate(sim_debts, order, budget, DEMO["lump"])
            expect.append({"cell": SC["m" + k].replace("$", ""), "value": months, "tol": 0, "why": f"months to debt-free, method {k}"})
            expect.append({"cell": SC["i" + k].replace("$", ""), "value": round(interest, 2), "tol": 0.05, "why": f"interest, method {k}"})
            if k == "S" and DEMO["method"] == "Snowball" and "Car loan" in [d[0] for d in DEMO_DEBTS]:
                car = [d[0] for d in DEMO_DEBTS].index("Car loan")
                expect.append({"cell": f"Calc!U{C0 + car}", "value": payoff[car], "tol": 0, "why": "month the car loan is paid off"})
                expect.append({"cell": f"Payoff Plan!C{28 + len(order)}", "value": round(sim_debts[order[-1]][0], 2), "tol": 0.01,
                               "why": "last debt in the snowball order is the biggest"})
        mm, mi = minimum_only(sim_debts)
        if mm is None:
            expect.append({"cell": SC["never"].replace("$", ""), "value": 1, "tol": 0, "why": "minimums alone never clear it"})
        else:
            expect += [{"cell": SC["minM"].replace("$", ""), "value": mm, "tol": 0, "why": "months with minimum payments only"},
                       {"cell": SC["minI"].replace("$", ""), "value": round(mi, 2), "tol": 0.05, "why": "interest with minimum payments only"}]
        expect += [
                   {"cell": SC["total"].replace("$", ""), "value": round(sum(now.values()), 2), "tol": 0.01, "why": "total owed now"},
                   {"cell": SC["paidoff"].replace("$", ""), "value": sum(1 for v in now.values() if v <= 0.005), "tol": 0, "why": "debts paid off"},
                   {"cell": "Year Summary!D22", "value": round(sum(r[2] for r in log), 2), "tol": 0.01, "why": "paid in 2026"},
                   {"cell": "Year Summary!C22", "value": len(log), "tol": 0, "why": "payments logged in 2026"}]
        for name in [n for n in ("Travel card", "Car loan", "Store card") if n in now]:
            i = [d[0] for d in DEMO_DEBTS].index(name)
            expect.append({"cell": f"My Debts!I{D0 + i}", "value": round(now[name], 2), "tol": 0.01, "why": f"{name} balance now"})

    order_tabs = ["Start Here", "My Debts", "Payoff Plan", "Payoff Schedule", "Payment Log", "Year Summary", "Calc"] + SIMS
    wb._sheets = [wb[n] for n in order_tabs]
    name = f"{PRODUCT} ({theme.title()})" + (" - Sample Data" if demo else "")
    path = kit.save(wb, out_dir / f"{name}.xlsx", active=2 if demo else 0)
    return path, expect


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="products/debt-payoff-tracker")
    ap.add_argument("--themes", default=",".join(THEME_ORDER), help="comma-separated palette names")
    a = ap.parse_args()
    out = Path(a.out)
    for theme in a.themes.split(","):
        build(out, theme, False)
        # sample-data copies ship for two themes; the rest are built only to photograph the colours
        target = out if theme in SAMPLE_THEMES else out / "_build" / "theme-samples"
        path, expect = build(target, theme, True)
        (path.parent / "_build" / f"{path.stem}.expect.json").write_text(json.dumps(expect, indent=1, ensure_ascii=False))
        print("built", theme)


if __name__ == "__main__":
    main()
