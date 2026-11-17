#!/usr/bin/env python3
"""Paycheck Budget Planner - the worked example for the etsy-sheet-builder skill.

    python build.py --out products/paycheck-budget-planner

Builds four workbooks (light/dark x blank/sample data) plus expect.json, a list of values
computed here in Python that verify_workbook.py compares with what the formulas produce.

Read this file as a pattern, not a template to copy: one hidden Calc sheet holds every lookup
list and scalar, each visible sheet is a function, inputs are tinted and unlocked, and every
formula sticks to the portable function list.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from openpyxl.worksheet.datavalidation import DataValidation  # noqa: E402

from sheetkit import THEME_ORDER, Kit, L, ref, rng  # noqa: E402

SAMPLE_THEMES = ("classic", "dark")

PRODUCT = "Paycheck Budget Planner"
TYPES = [("Income", 6, "income"), ("Bills", 16, "bills"), ("Expenses", 16, "expenses"),
         ("Savings", 8, "savings"), ("Debt", 8, "debt")]
COUNT = {t: n for t, n, _ in TYPES}
COLOR = {t: c for t, _, c in TYPES}
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
          "October", "November", "December"]
MON = [m[:3] for m in MONTHS]
FREQS = ["Weekly", "Every 2 weeks", "Twice a month", "Monthly"]
CYCLES = ["Weekly", "Monthly", "Quarterly", "Yearly"]

# ---- where things live -------------------------------------------------------------------
SLOTS = []                      # one entry per category slot, in Calc order
for t, n, _ in TYPES:
    for j in range(n):
        SLOTS.append((t, j))
N_SLOTS = len(SLOTS)            # 54
CALC0 = 2                       # first slot row on Calc
CALC_END = CALC0 + N_SLOTS - 1  # 55
SETUP_POS = {"Income": (11, 2), "Savings": (19, 2), "Debt": (29, 2), "Bills": (11, 6), "Expenses": (11, 10)}
PLAN_START = {"Income": 7, "Bills": 16, "Expenses": 35, "Savings": 54, "Debt": 65}
PLAN_TOTAL = {t: PLAN_START[t] + COUNT[t] for t in COUNT}
TX0, TXN = 6, 1005
PAY0, PAYN = 10, 62             # 53 payday rows on the Paychecks sheet

YEAR = "Setup!$C$6"
FREQ = "Setup!$G$6"
FIRST = "Setup!$G$7"
TAKEHOME = "Setup!$G$8"
TX = {k: f"Transactions!${c}${TX0}:${c}${TXN}" for k, c in
      dict(date="B", cat="C", amt="D", type="F", m="H").items()}
PAYDAYS = f"Paychecks!$O${PAY0}:$O${PAYN}"
NAMES = f"Calc!$C${CALC0}:$C${CALC_END}"
M_FULL, M_SHORT = "Calc!$I$2:$I$13", "Calc!$J$2:$J$13"
DASH_M, CAL_M, CAL_FIRST, CAL_START = "Calc!$Q$2", "Calc!$Q$3", "Calc!$Q$4", "Calc!$Q$5"
P_START, P_END, P_COUNT, CAL_DAYS = "Calc!$Q$6", "Calc!$Q$7", "Calc!$Q$8", "Calc!$Q$9"


def calc_row(t, j):
    return CALC0 + SLOTS.index((t, j))


def plan_row(t, j):
    return PLAN_START[t] + j


def plan_months(t, j):
    r = plan_row(t, j)
    return rng(3, r, 14, r, "Budget Plan")


# ---- content -----------------------------------------------------------------------------
STARTER = {
    "Income": ["Paycheck", "Second income", "Other income"],
    "Bills": ["Rent / Mortgage", "Electricity", "Water", "Internet", "Phone", "Car insurance",
              "Health insurance", "Streaming", "Childcare"],
    "Expenses": ["Groceries", "Dining out", "Gas / Transport", "Household", "Clothing",
                 "Personal care", "Fun money", "Gifts", "Medical", "Pets"],
    "Savings": ["Emergency fund", "Vacation", "Car repairs", "Holidays"],
    "Debt": ["Credit card", "Car loan", "Student loan"],
}
DEMO = {
    "year": 2027, "freq": "Every 2 weeks", "first": dt.date(2027, 1, 8), "takehome": 2450,
    "Income": [("Paycheck", 4900, None), ("Side income", 300, None)],
    "Bills": [("Rent", 1450, 1), ("Electricity", 125, 12), ("Water", 45, 15), ("Internet", 70, 8),
              ("Phone", 85, 27), ("Car insurance", 140, 5), ("Renters insurance", 18, 5),
              ("Streaming", 32, 18), ("Gym", 35, 3), ("Trash", 28, 15), ("Health insurance", 180, 20)],
    "Expenses": [("Groceries", 560, None), ("Dining out", 160, None), ("Gas", 150, None),
                 ("Household", 70, None), ("Clothing", 60, None), ("Fun money", 100, None),
                 ("Personal care", 50, None), ("Pets", 50, None), ("Gifts", 40, None), ("Medical", 45, None),
                 ("Kids", 90, None), ("Home repairs", 50, None), ("Haircuts", 35, None)],
    "Savings": [("Emergency fund", 400, None), ("Vacation", 200, None), ("Car repairs", 60, None),
                ("Christmas", 50, None), ("New laptop", 40, None)],
    "Debt": [("Credit card", 180, 22), ("Car loan", 310, 10), ("Student loan", 160, 28), ("Medical bill", 75, 16)],
    "goals": [(10000, 3200, dt.date(2027, 12, 31)), (2400, 300, dt.date(2027, 8, 15)),
              (1000, 150, dt.date(2027, 12, 31)), (800, 0, dt.date(2027, 11, 20)), (1200, 500, dt.date(2028, 3, 1))],
    "debts": [(2800, 0.229), (9400, 0.064), (12600, 0.045), (900, 0.0)],
    "subs": [("Video streaming", 15.99, "Monthly", dt.date(2027, 7, 3), "Active"),
             ("Music", 10.99, "Monthly", dt.date(2027, 7, 9), "Active"),
             ("Cloud storage", 2.99, "Monthly", dt.date(2027, 7, 14), "Active"),
             ("Gym membership", 35, "Monthly", dt.date(2027, 7, 3), "Active"),
             ("News app", 59, "Yearly", dt.date(2027, 9, 1), "Active"),
             ("Meal kit", 64, "Weekly", dt.date(2027, 6, 28), "Paused"),
             ("Photo editing", 119, "Yearly", dt.date(2028, 1, 12), "Active"),
             ("Language app", 13.99, "Monthly", dt.date(2027, 7, 21), "Cancelled")],
    "dash_month": "June", "cal_month": "June", "paycheck": 12, "through": dt.date(2027, 6, 26),
}


def demo_transactions(d):
    """Six months of believable activity, deterministic so expected values can be asserted."""
    rnd = random.Random(11)
    rows, end = [], d["through"]
    paydays, pay = [], d["first"]
    while pay <= end:
        paydays.append(pay)
        rows.append((pay, "Paycheck", d["takehome"], "Direct deposit"))
        pay += dt.timedelta(days=14)
    for m in range(1, 7):
        last = (dt.date(2027, m + 1, 1) - dt.timedelta(days=1)).day
        rows.append((dt.date(2027, m, 20), "Side income", rnd.choice([240, 275, 300, 320, 360]), "Weekend work"))
        for name, amt, due in d["Bills"] + d["Debt"]:
            wobble = {"Electricity": rnd.uniform(0.88, 1.12), "Water": rnd.uniform(0.92, 1.1)}.get(name, 1)
            rows.append((dt.date(2027, m, min(due, last)), name, round(amt * wobble, 2), ""))
        for p in [p for p in paydays if p.month == m][:2]:      # savings move on the first two paydays
            for name, amt, _ in d["Savings"]:
                rows.append((p, name, amt / 2, "Transfer"))
        for name, amt, _ in d["Expenses"]:
            n = {"Groceries": 8, "Dining out": 6, "Gas": 4, "Kids": 3}.get(name, 2)
            total = amt * rnd.uniform(0.84, 1.04)
            share = [rnd.uniform(0.8, 1.2) for _ in range(n)]
            for i, w in enumerate(share):                        # spread evenly through the month
                day = min(last, max(1, round((i + rnd.uniform(0.15, 0.85)) * last / n)))
                rows.append((dt.date(2027, m, day), name, round(total * w / sum(share), 2), ""))
    rows = [r for r in rows if r[0] <= end]
    rows.sort(key=lambda r: (r[0], r[1]))
    return rows


# ==========================================================================================
def build(out_dir: Path, theme: str, demo: bool) -> tuple[Path, list]:
    kit = Kit(theme=theme)
    wb = kit.workbook()
    hair = kit.hairline()
    expect = []
    d = DEMO if demo else None
    cats = {t: ([(n, a, due) for n, a, due in d[t]] if demo else [(n, None, None) for n in STARTER[t]])
            for t in COUNT}
    txs = demo_transactions(d) if demo else []
    MT = kit.money_txt
    PLAN_BAR = "quiet"   # the muted series in charts, from the palette

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

    # -------------------------------------------------------------------- Start Here ----
    ws = kit.sheet(wb, "Start Here", [2, 6, 62, 3, 20, 46, 2], rows=30, tab="neutral")
    kit.banner(ws, 2, 2, 6, PRODUCT, "Budget every paycheck, see every bill coming, and know what is left.")
    kit.strip(ws, 5, 2, ["QUICK START", ""], color="neutral")
    kit.strip(ws, 5, 5, ["WHAT'S INSIDE", ""], color="neutral")
    steps = [
        "Open the Setup tab. Enter your budget year, how often you are paid, your first payday and your take-home pay.",
        "Rename the starter categories and type a monthly amount for each. Give bills a due day (1–31).",
        "Look over the Budget Plan tab. Every month starts with your Setup amounts – type over any month that is different.",
        "Log income and spending on the Transactions tab: date, category, amount. That is all you ever type.",
        "Open the Dashboard, Paychecks and Bill Calendar tabs and pick a month or paycheck from the yellow dropdown.",
    ]
    for i, text in enumerate(steps):
        r = 6 + i * 2
        kit.merge(ws, r, 2, 2, i + 1, row2=r + 1, size=14, bold=True, color="income", align="center",
                  fill="surface", border=hair)
        kit.merge(ws, r, 3, 3, text, row2=r + 1, wrap=True, size=10, fill="surface", border=hair)
    tabs = [("Setup", "Year, pay schedule and your categories"),
            ("Budget Plan", "Twelve months of planned amounts"),
            ("Transactions", "Your income and spending log"),
            ("Dashboard", "One month at a glance, planned vs actual"),
            ("Paychecks", "What each paycheck has to cover"),
            ("Bill Calendar", "Due dates and paydays on a calendar"),
            ("Savings Goals", "Sinking funds and progress to each goal"),
            ("Debt Payoff", "Balances, payoff dates and snowball order"),
            ("Year Overview", "The whole year by month and category"),
            ("Subscriptions", "Every recurring charge in one list")]
    for i, (name, what) in enumerate(tabs):
        r = 6 + i
        kit.link(ws, r, 5, name, name, color="income", size=10, bold=True, fill="surface", border=hair,
                 underline="single", indent=1)
        cellp(ws, r, 6, what, color="muted", size=9.5)
    kit.strip(ws, 17, 2, ["GOOD TO KNOW", ""], color="neutral")
    kit.strip(ws, 17, 5, ["THE COLOURS", ""], color="neutral")
    kit.input(ws, 18, 5, "Yellow", align="center")
    cellp(ws, 18, 6, "Yours to type in.", color="muted", size=9.5)
    kit.input(ws, 19, 5, "Pale yellow", soft=True, align="center")
    cellp(ws, 19, 6, "Filled in for you. Type over it if you need to.", color="muted", size=9.5)
    cellp(ws, 20, 5, "White", align="center")
    cellp(ws, 20, 6, "Calculates itself. Leave these alone.", color="muted", size=9.5)
    notes = [
        "Give every category its own name. Two categories with the same name are counted together.",
        "A due day sends a bill to the paycheck that covers that date. No due day? The amount is split evenly across the month's paychecks.",
        "Refund or return? Log it as a negative amount in the same category.",
        "Different currency: select the money cells, then Format → Number → Custom currency (Google Sheets) or Format Cells → Currency (Excel).",
        "Sheets are protected so formulas can't be deleted by accident. In Excel: Review → Unprotect Sheet. There is no password.",
        "New year: make a fresh copy, change the year on Setup and clear the Transactions tab.",
    ]
    for i, text in enumerate(notes):
        r = 18 + i
        ws.row_dimensions[r].height = 34
        cellp(ws, r, 2, "•", color="muted", align="center")
        cellp(ws, r, 3, text, wrap=True, size=9.5)
    kit.preview(ws, "A1:G24")

    # ------------------------------------------------------------------------- Setup ----
    ws = kit.sheet(wb, "Setup", [2, 24, 13, 9, 3, 25, 13, 9, 3, 24, 13, 9, 2], rows=38, tab="neutral")
    kit.banner(ws, 2, 2, 12, "Setup", "Fill in the yellow cells once. Every other tab reads from here.", title_cols=10)
    menu(ws, 2, 12)
    kit.strip(ws, 5, 2, ["THE BASICS", "", ""], color="neutral")
    cellp(ws, 6, 2, "Budget year", indent=1)
    kit.input(ws, 6, 3, d["year"] if demo else 2027, align="center", bold=True, fmt="0")
    cellp(ws, 6, 4)
    kit.merge(ws, 7, 2, 4, "Yellow cells are yours to fill in.", color="muted", size=9, fill="surface", indent=1, border=hair)
    kit.merge(ws, 8, 2, 4, "Everything else calculates itself.", color="muted", size=9, fill="surface", indent=1, border=hair)

    kit.strip(ws, 5, 6, ["PAY SCHEDULE", "", ""], color="income")
    for r, label in ((6, "How often are you paid?"), (7, "First payday of the year"), (8, "Take-home per paycheck")):
        cellp(ws, r, 6, label, indent=1)
    kit.input(ws, 6, 7, d["freq"] if demo else None, align="center", c2=8)
    kit.dropdown(ws, "G6", FREQS, prompt="Pick how often you are paid.")
    kit.input(ws, 7, 7, d["first"] if demo else None, fmt="ddd, mmm d, yyyy", align="center", c2=8)
    kit.input(ws, 8, 7, d["takehome"] if demo else None, fmt=kit.money, align="center", c2=8)

    def setup_sum(t):
        r0, c0 = SETUP_POS[t]
        return f"SUM({rng(c0 + 1, r0, c0 + 1, r0 + COUNT[t] - 1)})"
    out_sum = "+".join(setup_sum(t) for t in ("Bills", "Expenses", "Savings", "Debt"))
    kit.strip(ws, 5, 10, ["YOUR MONTHLY PLAN", "", ""], color="neutral")
    for r, label, f in ((6, "Income", "=" + setup_sum("Income")), (7, "Everything going out", "=" + out_sum),
                        (8, "Left to budget", f"={setup_sum('Income')}-({out_sum})")):
        kit.merge(ws, r, 10, 10, label, fill="surface", border=hair, indent=1, bold=(r == 8))
        kit.merge(ws, r, 11, 12, f, fill="surface", border=hair, fmt=kit.money, align="right", bold=(r == 8))
    kit.cf_negative(ws, "K8")

    heads = {"Income": ["INCOME", "Monthly", ""], "Bills": ["BILLS", "Monthly", "Due day"],
             "Expenses": ["EXPENSES", "Monthly", "Due day"], "Savings": ["SAVINGS", "Monthly", "Due day"],
             "Debt": ["DEBT", "Monthly", "Due day"]}
    for t, n, colr in TYPES:
        r0, c0 = SETUP_POS[t]
        kit.strip(ws, r0 - 1, c0, heads[t], color=colr, aligns=["left", "right", "center"])
        for j in range(n):
            r = r0 + j
            name, amt, due = cats[t][j] if j < len(cats[t]) else (None, None, None)
            kit.input(ws, r, c0, name)
            kit.input(ws, r, c0 + 1, amt, fmt=kit.money, align="right")
            if t == "Income":
                cellp(ws, r, c0 + 2)
            else:
                kit.input(ws, r, c0 + 2, due, fmt="0", align="center")
        block = f"{L(c0)}{r0}:{L(c0)}{r0 + n - 1}"
        # duplicate names would be double counted - flag them in red
        kit.cf_formula(ws, block, f'=AND({L(c0)}{r0}<>"",COUNTIF($B$11:$B$36,{L(c0)}{r0})+COUNTIF($F$11:$F$26,{L(c0)}{r0})'
                                   f'+COUNTIF($J$11:$J$26,{L(c0)}{r0})>1)', color="neg", bold=True)
        if t != "Income":
            dv_cells = f"{L(c0 + 2)}{r0}:{L(c0 + 2)}{r0 + n - 1}"
            dv = DataValidation(type="whole", operator="between", formula1="1", formula2="31", allow_blank=True)
            dv.showErrorMessage, dv.errorTitle, dv.error = True, "Day of the month", "Type a day from 1 to 31, or leave it empty."
            ws.add_data_validation(dv)
            dv.add(dv_cells)
    kit.strip(ws, 28, 6, ["HOW IT WORKS", "", "", "", "", "", ""], color="neutral")
    tips = ["Rename any category. Empty rows are ignored everywhere.",
            "Monthly = what you plan for a normal month. Change single months on the Budget Plan tab.",
            "Due day = the day of the month it is paid (1–31). It puts the bill on the calendar and in the right paycheck.",
            "No due day? The amount is split evenly across that month's paychecks.",
            "A name shown in red is used twice. Give each category its own name.",
            "Savings goals and debt balances are set on their own tabs."]
    for i, text in enumerate(tips):
        kit.merge(ws, 29 + i, 6, 12, text, fill="surface", border=hair, color="muted", size=9.5, indent=1)

    # -------------------------------------------------------------------------- Calc ----
    cs = kit.sheet(wb, "Calc", [6, 10, 24, 12, 8, 6, 24, 12, 12, 8, 30, 4, 8, 10, 4, 22, 14, 4, 12, 12, 4, 12, 16],
                   rows=4, hidden=True)
    for c, h in enumerate(["#", "Type", "Name", "Monthly", "Due", "Seq", "List", "PayDue", "Month", "Mon",
                           "CalLabel", "", "CalDay", "CalKey", "", "Scalar", "Value", "", "Slice", "Amount",
                           "", "Cycle", "Frequency"], start=1):
        cs.cell(1, c, h)
    for i, (t, j) in enumerate(SLOTS):
        r = CALC0 + i
        r0, c0 = SETUP_POS[t]
        sn, sa, sd = ref(c0, r0 + j, sheet="Setup"), ref(c0 + 1, r0 + j, sheet="Setup"), ref(c0 + 2, r0 + j, sheet="Setup")
        cs.cell(r, 1, i + 1)
        cs.cell(r, 2, t)
        cs.cell(r, 3, f'=IF({sn}="","",TRIM({sn}))')
        cs.cell(r, 4, f"=N({sa})")
        cs.cell(r, 5, "" if t == "Income" else f'=IF(ISNUMBER({sd}),MIN(31,MAX(1,INT({sd}))),"")')
        cs.cell(r, 6, f'=IF(C{r}="","",MAX(F$1:F{r - 1})+1)')
        cs.cell(r, 7, f'=IFERROR(INDEX($C${CALC0}:$C${CALC_END},MATCH(A{r},$F${CALC0}:$F${CALC_END},0)),"")')
        # due date of this category inside the selected paycheck period (or the next one after it starts)
        this_m = f"DATE(YEAR($Q$6),MONTH($Q$6),MIN(E{r},DAY(EOMONTH($Q$6,0))))"
        next_m = f"DATE(YEAR($Q$6),MONTH($Q$6)+1,MIN(E{r},DAY(EOMONTH($Q$6,1))))"
        cs.cell(r, 8, f'=IF(OR(C{r}="",E{r}="",$Q$6=""),"",IF({this_m}>=$Q$6,{this_m},{next_m}))')
        cs.cell(r, 13, "" if t == "Income" else f'=IF(OR(C{r}="",E{r}=""),"",MIN(E{r},$Q$9))')
        cs.cell(r, 14, f'=IF(M{r}="","",M{r}*100+COUNTIF(M${CALC0}:M{r},M{r}))')
        cs.cell(r, 11, f'=IF(OR(C{r}="",M{r}=""),"",C{r}&"  "&TEXT(N(INDEX({plan_months(t, j)},$Q$3)),"{MT}"))')
    for i, m in enumerate(MONTHS):
        cs.cell(2 + i, 9, m)
        cs.cell(2 + i, 10, MON[i])
    scalars = [
        ("Dashboard month", f"=IFERROR(MATCH(Dashboard!$K$2,$I$2:$I$13,0),1)"),
        ("Calendar month", f"=IFERROR(MATCH('Bill Calendar'!$H$2,$I$2:$I$13,0),1)"),
        ("Calendar first day", f"=DATE(N({YEAR}),$Q$3,1)"),
        ("Calendar grid start", "=$Q$4-(WEEKDAY($Q$4)-1)"),
        ("Paycheck start", f'=IFERROR(IF(N(INDEX(Paychecks!$O${PAY0}:$O${PAYN},Paychecks!$K$2))>0,'
                           f'INDEX(Paychecks!$O${PAY0}:$O${PAYN},Paychecks!$K$2),""),"")'),
        ("Paycheck end", f'=IF($Q$6="","",IF(N(INDEX(Paychecks!$O${PAY0}:$O${PAYN + 1},Paychecks!$K$2+1))>0,'
                         f'INDEX(Paychecks!$O${PAY0}:$O${PAYN + 1},Paychecks!$K$2+1)-1,DATE(N({YEAR}),12,31)))'),
        ("Paydays in that month", f'=IF($Q$6="",1,MAX(1,COUNTIFS({PAYDAYS},">="&DATE(YEAR($Q$6),MONTH($Q$6),1),'
                                  f'{PAYDAYS},"<="&EOMONTH($Q$6,0))))'),
        ("Days in calendar month", "=DAY(EOMONTH($Q$4,0))"),
    ]
    for i, (label, f) in enumerate(scalars):
        cs.cell(2 + i, 16, label)
        cs.cell(2 + i, 17, f)
    for i, lab in enumerate(["Bills", "Expenses", "Savings", "Debt", "Left"]):
        cs.cell(2 + i, 19, lab)
        cs.cell(2 + i, 20, f"=MAX(0,N(Dashboard!$D${12 + i}))" if i < 4 else "=MAX(0,N(Dashboard!$D$17))")
    for i, c in enumerate(CYCLES):
        cs.cell(2 + i, 22, c)
    for i, c in enumerate(FREQS):
        cs.cell(2 + i, 23, c)

    # ------------------------------------------------------------------- Budget Plan ----
    ws = kit.sheet(wb, "Budget Plan", [2, 24] + [11] * 12 + [13, 2], rows=77, tab="neutral", freeze="C6")
    kit.banner(ws, 2, 2, 15, "Budget Plan", "Each month starts with your Setup amount. Type over any month that is different.", title_cols=13)
    menu(ws, 2, 15)
    kit.strip(ws, 5, 2, ["CATEGORY"] + [m.upper() for m in MON] + ["YEAR"], color="neutral")
    for t, n, colr in TYPES:
        s = PLAN_START[t]
        kit.strip(ws, s - 1, 2, [t.upper()] + [""] * 13, color=colr, height=20)
        for j in range(n):
            r = s + j
            cr = calc_row(t, j)
            cellp(ws, r, 2, f"=Calc!$C${cr}", indent=1)
            for c in range(3, 15):
                kit.input(ws, r, c, f'=IF($B{r}="","",Calc!$D${cr})', fmt=kit.money, align="right", soft=True, size=9.5)
            money(ws, r, 15, f'=IF($B{r}="","",SUM(C{r}:N{r}))', bold=True, size=9.5)
        tr = PLAN_TOTAL[t]
        cellp(ws, tr, 2, f"Total {t.lower()}", bold=True, indent=1)
        for c in range(3, 16):
            money(ws, tr, c, f"=SUM({L(c)}{s}:{L(c)}{tr - 1})", bold=True, size=9.5, color=colr)
    cellp(ws, 75, 2, "Total going out", bold=True, indent=1)
    cellp(ws, 76, 2, "LEFT TO BUDGET", bold=True, indent=1)
    for c in range(3, 16):
        col = L(c)
        outs = "+".join(f"{col}{PLAN_TOTAL[t]}" for t in ("Bills", "Expenses", "Savings", "Debt"))
        money(ws, 75, c, f"={outs}", bold=True, size=9.5)
        money(ws, 76, c, f"={col}{PLAN_TOTAL['Income']}-{col}75", bold=True, size=9.5, color="pos")
    kit.cf_negative(ws, "C76:O76")
    kit.preview(ws, "A1:P36")

    # ------------------------------------------------------------------ Transactions ----
    ws = kit.sheet(wb, "Transactions", [2, 14, 26, 14, 36, 12, 9, 2], rows=TXN + 1, tab="neutral", freeze="B6")
    kit.banner(ws, 2, 2, 7, "Transactions", "Log every paycheck, bill and purchase. Pick a category – the rest fills itself in.", title_cols=6)
    menu(ws, 2, 7)
    kit.strip(ws, 5, 2, ["DATE", "CATEGORY", "AMOUNT", "NOTE", "TYPE", "MONTH"], color="neutral",
              aligns=["left", "left", "right", "left", "left", "left"])
    for i in range(TXN - TX0 + 1):
        r = TX0 + i
        row = txs[i] if i < len(txs) else (None, None, None, None)
        kit.input(ws, r, 2, row[0], fmt="mmm d, yyyy", align="left")
        kit.input(ws, r, 3, row[1])
        kit.input(ws, r, 4, row[2], fmt=kit.money, align="right")
        kit.input(ws, r, 5, row[3] or None)
        cellp(ws, r, 6, f'=IF(C{r}="","",IFERROR(INDEX(Calc!$B${CALC0}:$B${CALC_END},MATCH(C{r},{NAMES},0)),"Not in Setup"))',
              color="muted", size=9.5)
        cellp(ws, r, 7, f'=IF(ISNUMBER(B{r}),INDEX({M_SHORT},MONTH(B{r})),"")', color="muted", size=9.5)
        ws.cell(r, 8, f'=IF(ISNUMBER(B{r}),IF(YEAR(B{r})={YEAR},MONTH(B{r}),""),"")').font = kit.font(color="bg", size=8)
    kit.dropdown(ws, f"C{TX0}:C{TXN}", f"Calc!$G${CALC0}:$G${CALC_END}", prompt="Pick a category from your Setup tab.")
    kit.number_only(ws, f"D{TX0}:D{TXN}")
    kit.cf_formula(ws, f"F{TX0}:F{TXN}", f'=F{TX0}="Not in Setup"', color="neg", bold=True)
    kit.cf_formula(ws, f"B{TX0}:B{TXN}", f'=AND(ISNUMBER(B{TX0}),H{TX0}="")', color="neg")
    kit.preview(ws, "A1:H34")

    # --------------------------------------------------------------------- Dashboard ----
    ws = kit.sheet(wb, "Dashboard", [2, 24, 13, 13, 13, 19, 3, 24, 13, 13, 13, 19, 2], rows=59, tab="income")
    kit.banner(ws, 2, 2, 12, "Monthly Budget", f'="Planned vs actual for "&K2&" "&{YEAR}', title_cols=8)
    kit.put(ws, 2, 10, "MONTH", size=8.5, bold=True, color="band_sub", fill="band", align="right")
    kit.input(ws, 2, 11, d["dash_month"] if demo else "January", bold=True, align="center", size=11)
    kit.dropdown(ws, "K2", M_FULL, prompt="Pick a month.", allow_blank=False)
    menu(ws, 2, 12)
    kit.put(ws, 3, 11, "▲ pick a month", size=8, color="band_sub", fill="band", align="center", valign="top")

    for r in range(10, 19):
        ws.row_dimensions[r].height = 24
    kit.strip(ws, 9, 2, ["CASH FLOW", "Planned", "Actual", "Difference", "Progress"], color="neutral",
              aligns=["left", "right", "right", "right", "left"])
    kit.strip(ws, 9, 8, ["WHERE IT WENT", "", "PLANNED VS ACTUAL", "", ""], color="neutral",
              aligns=["left", "left", "left", "left", "left"])
    for r in range(10, 19):
        for c in range(8, 13):
            ws.cell(r, c).fill = kit.fill("surface")

    def slot_table(ws, top, c1, t, labels, kind, period=False):
        """A category table: strip, one row per slot, total row. Returns the total row number."""
        colr = COLOR[t]
        kit.strip(ws, top, c1, labels, color=colr, aligns=["left", "right", "right", "right", "left"])
        n = COUNT[t]
        nc, pc, ac, dc, bc = c1, c1 + 1, c1 + 2, c1 + 3, c1 + 4
        for j in range(n):
            r = top + 1 + j
            cr = calc_row(t, j)
            nm = f"${L(nc)}{r}"
            P, A = f"{L(pc)}{r}", f"{L(ac)}{r}"
            cellp(ws, r, nc, f"=Calc!$C${cr}", indent=1)
            money(ws, r, pc, f'=IF({nm}="","",N(INDEX({plan_months(t, j)},{DASH_M})))', color="muted")
            money(ws, r, ac, f'=IF({nm}="","",SUMIFS({TX["amt"]},{TX["cat"]},{nm},{TX["m"]},{DASH_M}))')
            money(ws, r, dc, f'=IF({nm}="","",{A}-{P})' if kind == "income" else f'=IF({nm}="","",{P}-{A})')
            if kind == "bills":
                due = (f'IF(Calc!$E${cr}="","Not paid yet","Due "&INDEX({M_SHORT},{DASH_M})&" "'
                       f'&MIN(Calc!$E${cr},DAY(EOMONTH(DATE(N({YEAR}),{DASH_M},1),0))))')
                kit.put(ws, r, bc, f'=IF(OR({nm}="",N({P})<=0),"",IF({A}>0,"✓ Paid",{due}))',
                        size=9, color="muted", fill="surface", border=hair)
            else:
                kit.bar(ws, r, bc, kit.bar_formula(A, P, guard=f'{nm}=""'), color=colr)
        tr = top + 1 + n
        cellp(ws, tr, nc, "Total", bold=True, indent=1)
        for c in (pc, ac, dc):
            money(ws, tr, c, f"=SUM({L(c)}{top + 1}:{L(c)}{tr - 1})", bold=True)
        kit.bar(ws, tr, bc, kit.bar_formula(f"{L(ac)}{tr}", f"{L(pc)}{tr}"), color=colr)
        kit.cf_negative(ws, f"{L(dc)}{top + 1}:{L(dc)}{tr}")
        if kind == "bills":
            kit.cf_formula(ws, f"{L(bc)}{top + 1}:{L(bc)}{tr - 1}", f'={L(bc)}{top + 1}="✓ Paid"', color="pos", bold=True)
        return tr

    T = {}
    T["Income"] = slot_table(ws, 20, 2, "Income", ["INCOME", "Planned", "Actual", "Extra", "Progress"], "income")
    T["Bills"] = slot_table(ws, 29, 2, "Bills", ["BILLS", "Planned", "Paid", "Left", "Status"], "bills")
    T["Debt"] = slot_table(ws, 48, 2, "Debt", ["DEBT", "Planned", "Paid", "To go", "Progress"], "spend")
    T["Expenses"] = slot_table(ws, 20, 8, "Expenses", ["EXPENSES", "Budget", "Spent", "Left", "Progress"], "spend")
    T["Savings"] = slot_table(ws, 39, 8, "Savings", ["SAVINGS", "Planned", "Saved", "To go", "Progress"], "spend")
    COLS = {"Income": 2, "Bills": 2, "Debt": 2, "Expenses": 8, "Savings": 8}

    order = ["Income", "Bills", "Expenses", "Savings", "Debt"]
    for i, t in enumerate(order):
        r = 11 + i
        c1 = COLS[t]
        cellp(ws, r, 2, t, indent=1, bold=True, color=COLOR[t])
        money(ws, r, 3, f"={L(c1 + 1)}{T[t]}", color="muted")
        money(ws, r, 4, f"={L(c1 + 2)}{T[t]}")
        money(ws, r, 5, f"=D{r}-C{r}" if t == "Income" else f"=C{r}-D{r}")
        kit.bar(ws, r, 6, kit.bar_formula(f"D{r}", f"C{r}"), color=COLOR[t])
    cellp(ws, 10, 2, "", size=4)
    for c in range(3, 7):
        cellp(ws, 10, c, "", size=4)
    ws.row_dimensions[10].height = 6
    cellp(ws, 16, 2, "Total going out", indent=1, bold=True)
    money(ws, 16, 3, "=SUM(C12:C15)", bold=True, color="muted")
    money(ws, 16, 4, "=SUM(D12:D15)", bold=True)
    money(ws, 16, 5, "=C16-D16", bold=True)
    kit.bar(ws, 16, 6, kit.bar_formula("D16", "C16"), color="neutral")
    cellp(ws, 17, 2, "Left over", indent=1, bold=True)
    money(ws, 17, 3, "=C11-C16", bold=True, color="muted")
    money(ws, 17, 4, "=D11-D16", bold=True)
    cellp(ws, 17, 5)
    kit.put(ws, 17, 6, '=IF(AND(C11=0,C16=0),"",IF(C17=0,"Every dollar has a job ✓",IF(C17>0,TEXT(C17,"' + MT + '")&" left to budget",'
                       'TEXT(-C17,"' + MT + '")&" over budget")))', size=8.5, color="muted", fill="surface", border=hair)
    cellp(ws, 18, 2, "", size=4)
    for c in range(3, 7):
        cellp(ws, 18, c, "", size=4)
    kit.cf_negative(ws, "E11:E17")
    kit.cf_negative(ws, "C17:D17")

    def of_planned(cell):
        return f'="of "&TEXT({cell},"{MT}")&" planned"'
    kit.card(ws, 5, 2, 2, "INCOME", "=D11", of_planned("C11"), color="income")
    kit.card(ws, 5, 3, 4, "BILLS", "=D12", of_planned("C12"), color="bills")
    kit.card(ws, 5, 5, 6, "EXPENSES", "=D13", of_planned("C13"), color="expenses")
    kit.card(ws, 5, 8, 8, "SAVINGS", "=D14", of_planned("C14"), color="savings")
    kit.card(ws, 5, 9, 10, "DEBT", "=D15", of_planned("C15"), color="debt")
    kit.card(ws, 5, 11, 12, "LEFT TO SPEND", "=D17", "income minus everything paid and saved", color="neutral")
    kit.cf_negative(ws, "K6")
    for c in (7,):
        for r in (5, 6, 7):
            ws.cell(r, c).fill = kit.fill("bg")

    kit.donut(ws, "H10", "Calc!$S$2:$S$6", "Calc!$T$2:$T$6",
              ["bills", "expenses", "savings", "debt", "line"], width=6.6, height=5.3)
    kit.columns(ws, "J10", "Dashboard!$B$11:$B$15",
                [("Planned", "Dashboard!$C$11:$C$15", PLAN_BAR),
                 ("Actual", "Dashboard!$D$11:$D$15", "income")], width=8.9, height=5.3)

    kit.strip(ws, 50, 8, ["50 / 30 / 20 CHECK", "Target", "Yours", "Gap", "Share of income"], color="neutral",
              aligns=["left", "right", "right", "right", "left"])
    for i, (label, target, expr, colr) in enumerate([("Needs (bills)", 0.5, "D12", "bills"),
                                                     ("Wants (expenses)", 0.3, "D13", "expenses"),
                                                     ("Saving & debt", 0.2, "D14+D15", "savings")]):
        r = 51 + i
        cellp(ws, r, 8, label, indent=1)
        cellp(ws, r, 9, target, fmt="0%", align="right", color="muted")
        cellp(ws, r, 10, f'=IF(N($D$11)>0,({expr})/$D$11,"")', fmt="0%", align="right")
        cellp(ws, r, 11, f'=IF(J{r}="","",J{r}-I{r})', fmt='+0%;-0%;0%', align="right", color="muted")
        kit.bar(ws, r, 12, f'=IF(J{r}="","",REPT("█",ROUND(MIN(1,J{r})*10,0))&REPT("░",10-ROUND(MIN(1,J{r})*10,0)))', color=colr)
    kit.merge(ws, 54, 8, 12, "A common rule of thumb: about 50% needs, 30% wants, 20% saving and debt.",
              fill="surface", border=hair, color="muted", size=8.5, indent=1)
    kit.preview(ws, "A1:M58")
    if demo:
        m = MONTHS.index(d["dash_month"]) + 1
        by_type = {t: {n for n, *_ in d[t]} for t in COUNT}
        for i, t in enumerate(order):
            actual = sum(a for (day, cat, a, _) in txs if day.month == m and cat in by_type[t])
            planned = sum(a for _, a, _ in d[t])
            expect.append({"cell": f"Dashboard!D{11 + i}", "value": round(actual, 2), "tol": 0.02, "why": f"{t} actual in {d['dash_month']}"})
            expect.append({"cell": f"Dashboard!C{11 + i}", "value": planned, "tol": 0.02, "why": f"{t} planned"})
        gro = sum(a for (day, cat, a, _) in txs if day.month == m and cat == "Groceries")
        expect.append({"cell": "Dashboard!J21", "value": round(gro, 2), "tol": 0.02, "why": "Groceries spent in June"})
        expect.append({"cell": "Dashboard!F30", "text": "✓ Paid", "why": "Rent is paid in June"})
        expect.append({"cell": "Dashboard!F34", "text": "Due Jun 27", "why": "Phone is not paid yet on Jun 26"})

    # --------------------------------------------------------------------- Paychecks ----
    ws = kit.sheet(wb, "Paychecks", [2, 24, 11, 13, 13, 13, 3, 24, 11, 13, 13, 13, 3, 6, 16, 14, 2], rows=64, tab="bills")
    kit.banner(ws, 2, 2, 16, "Paycheck Budget",
               f'=IF({P_START}="","Pick a paycheck from the list, or add your pay schedule on the Setup tab.",'
               f'"This paycheck covers "&TEXT({P_START},"ddd, mmm d")&"  to  "&TEXT({P_END},"ddd, mmm d"))', title_cols=8)
    kit.put(ws, 2, 10, "PAYCHECK #", size=8.5, bold=True, color="band_sub", fill="band", align="right")
    kit.input(ws, 2, 11, d["paycheck"] if demo else 1, bold=True, align="center", size=11)
    kit.dropdown(ws, "K2", f"Paychecks!$N${PAY0}:$N${PAYN}", prompt="Pick a paycheck number from the list on the right.", allow_blank=False)
    kit.put(ws, 3, 11, "▲ pick a paycheck", size=8, color="band_sub", fill="band", align="center", valign="top")
    menu(ws, 2, 16)

    def pay_table(top, c1, t, labels):
        colr = COLOR[t]
        kit.strip(ws, top, c1, labels, color=colr, aligns=["left", "center", "right", "right", "right"])
        n = COUNT[t]
        nc, uc, pc, ac, lc = c1, c1 + 1, c1 + 2, c1 + 3, c1 + 4
        for j in range(n):
            r = top + 1 + j
            cr = calc_row(t, j)
            nm, due = f"${L(nc)}{r}", f"${L(uc)}{r}"
            cellp(ws, r, nc, f"=Calc!$C${cr}", indent=1)
            cellp(ws, r, uc, f'=IF(OR({nm}="",{P_START}=""),"",IF(Calc!$E${cr}="","split",'
                             f'IF(Calc!$H${cr}<={P_END},Calc!$H${cr},"")))', fmt=kit.date, align="center", color="muted", size=9)
            money(ws, r, pc, f'=IF({due}="","",IF({due}="split",N(INDEX({plan_months(t, j)},MONTH({P_START})))/{P_COUNT},'
                             f'N(INDEX({plan_months(t, j)},MONTH({due})))))')
            sums = f'SUMIFS({TX["amt"]},{TX["cat"]},{nm},{TX["date"]},">="&{P_START},{TX["date"]},"<="&{P_END})'
            money(ws, r, ac, f'=IF(OR({nm}="",{P_START}=""),"",IF(AND({due}="",{sums}=0),"",{sums}))')
            money(ws, r, lc, f'=IF(OR({nm}="",AND({due}="",N({L(ac)}{r})=0)),"",N({L(pc)}{r})-N({L(ac)}{r}))')
        tr = top + 1 + n
        cellp(ws, tr, nc, "Total", bold=True, indent=1)
        cellp(ws, tr, uc)
        for c in (pc, ac, lc):
            money(ws, tr, c, f"=SUM({L(c)}{top + 1}:{L(c)}{tr - 1})", bold=True)
        kit.cf_negative(ws, f"{L(lc)}{top + 1}:{L(lc)}{tr}")
        # rows that are not due in this paycheck fade back
        kit.cf_formula(ws, f"{L(nc)}{top + 1}:{L(nc)}{tr - 1}", f'=AND({L(nc)}{top + 1}<>"",{L(uc)}{top + 1}="")', color="muted")
        return tr

    PT = {}
    PT["Bills"] = pay_table(9, 2, "Bills", ["BILLS", "Due", "Planned", "Paid", "Left"])
    PT["Debt"] = pay_table(28, 2, "Debt", ["DEBT", "Due", "Planned", "Paid", "Left"])
    PT["Expenses"] = pay_table(9, 8, "Expenses", ["EXPENSES", "Due", "Budget", "Spent", "Left"])
    PT["Savings"] = pay_table(28, 8, "Savings", ["SAVINGS", "Due", "Planned", "Saved", "Left"])
    assigned = f"D{PT['Bills']}+D{PT['Debt']}+J{PT['Expenses']}+J{PT['Savings']}"
    spent = f"E{PT['Bills']}+E{PT['Debt']}+K{PT['Expenses']}+K{PT['Savings']}"
    expected = f"IFERROR(N(INDEX($P${PAY0}:$P${PAYN},$K$2)),0)"
    received = (f'IF({P_START}="",0,SUMIFS({TX["amt"]},{TX["type"]},"Income",{TX["date"]},">="&{P_START},'
                f'{TX["date"]},"<="&{P_END}))')
    kit.card(ws, 5, 2, 2, "THIS PAYCHECK", f"={expected}",
             f'=IF({P_START}="","no payday yet","payday "&TEXT({P_START},"ddd, mmm d"))', color="income")
    kit.card(ws, 5, 3, 4, "ASSIGNED", f"={assigned}", "bills due + this check's share", color="bills")
    kit.card(ws, 5, 5, 6, "LEFT TO ASSIGN", "=B6-C6", "paycheck minus assigned", color="neutral")
    kit.card(ws, 5, 8, 8, "INCOME RECEIVED", f"={received}", "logged in this pay period", color="income")
    kit.card(ws, 5, 9, 10, "SPENT SO FAR", f"={spent}", "paid, spent and saved", color="expenses")
    kit.card(ws, 5, 11, 12, "LEFT IN THIS CHECK", "=IF(H6>0,H6,B6)-I6", "what is still available", color="neutral")
    kit.cf_negative(ws, "E6")
    kit.cf_negative(ws, "K6")
    kit.merge(ws, 39, 2, 12, "“split” = no due day, so the monthly amount is shared evenly between that month's paychecks. "
              "Greyed-out rows are not due in this pay period.", fill="surface", border=hair, color="muted", size=8.5, indent=1)

    kit.strip(ws, 9, 14, ["#", "PAYDAY", "TAKE-HOME"], color="income", aligns=["center", "center", "right"])
    y_end = f"DATE(N({YEAR}),12,31)"
    for n in range(1, PAYN - PAY0 + 2):
        r = PAY0 + n - 1
        cellp(ws, r, 14, n, align="center", color="muted", size=9)
        if n == 1:
            f = f'=IF(ISNUMBER({FIRST}),{FIRST},"")'
        else:
            k = (n - 1) // 2
            base = f"EDATE($O${PAY0},{k})"
            twice = base if n % 2 == 1 else f"MIN({base}+15,EOMONTH({base},0))"
            nxt = (f'CHOOSE(MATCH({FREQ},Calc!$W$2:$W$5,0),O{r - 1}+7,O{r - 1}+14,{twice},EDATE($O${PAY0},{n - 1}))')
            f = f'=IF(O{r - 1}="","",IFERROR(IF({nxt}>{y_end},"",{nxt}),""))'
        kit.input(ws, r, 15, f, fmt="ddd, mmm d", align="center", soft=True, size=9.5)
        kit.input(ws, r, 16, f'=IF(O{r}="","",N({TAKEHOME}))', fmt=kit.money, align="right", soft=True, size=9.5)
    kit.cf_formula(ws, f"N{PAY0}:P{PAYN}", f"=$N{PAY0}=$K$2", bold=True, color="income")
    cellp(ws, PAYN + 1, 14, "", size=4)
    kit.merge(ws, PAYN + 1, 14, 16, "Type over any payday or amount that is different.", fill="surface",
              color="muted", size=8.5, border=hair)
    kit.preview(ws, "A1:Q40")
    if demo:
        n = d["paycheck"]
        start = d["first"] + dt.timedelta(days=14 * (n - 1))
        end = start + dt.timedelta(days=13)
        non_income = {nm for t in ("Bills", "Expenses", "Savings", "Debt") for nm, *_ in d[t]}
        spent_v = sum(a for (day, cat, a, _) in txs if start <= day <= end and cat in non_income)
        got_v = sum(a for (day, cat, a, _) in txs if start <= day <= end and cat in by_type["Income"])
        pays_in_month = sum(1 for i in range(27) if (d["first"] + dt.timedelta(days=14 * i)).month == start.month
                            and (d["first"] + dt.timedelta(days=14 * i)).year == 2027)
        assigned_v = 0.0
        for t in ("Bills", "Expenses", "Savings", "Debt"):
            for nm, amt, due in d[t]:
                if due is None:
                    assigned_v += amt / pays_in_month
                else:
                    for off in range((end - start).days + 1):
                        if (start + dt.timedelta(days=off)).day == due:
                            assigned_v += amt
        expect += [{"cell": "Paychecks!B6", "value": d["takehome"], "why": "expected paycheck"},
                   {"cell": "Paychecks!C6", "value": round(assigned_v, 2), "tol": 0.02, "why": "assigned to paycheck 12"},
                   {"cell": "Paychecks!I6", "value": round(spent_v, 2), "tol": 0.02, "why": "spent in pay period"},
                   {"cell": "Paychecks!H6", "value": round(got_v, 2), "tol": 0.02, "why": "income in pay period"}]

    # ----------------------------------------------------------------- Bill Calendar ----
    ws = kit.sheet(wb, "Bill Calendar", [2] + [18] * 7 + [3, 24, 14, 2], rows=31, tab="expenses")
    kit.banner(ws, 2, 2, 11, "Bill Calendar", f'="Bills, debt payments and paydays in "&H2&" "&{YEAR}', title_cols=5)
    kit.put(ws, 2, 7, "MONTH", size=8.5, bold=True, color="band_sub", fill="band", align="right")
    kit.input(ws, 2, 8, d["cal_month"] if demo else "January", bold=True, align="center", size=11)
    kit.dropdown(ws, "H2", M_FULL, prompt="Pick a month.", allow_blank=False)
    kit.put(ws, 3, 8, "▲ pick a month", size=8, color="band_sub", fill="band", align="center", valign="top")
    menu(ws, 2, 11)
    kit.strip(ws, 5, 2, ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], color="neutral", aligns=["left"] * 7)
    top_line = kit.hairline(top=True, bottom=False)
    for w in range(6):
        r0 = 6 + w * 4
        for dcol in range(7):
            k = w * 7 + dcol
            c = 2 + dcol
            dtx = f"({CAL_START}+{k})"
            inm = f"MONTH({dtx})={CAL_M}"
            kit.put(ws, r0, c, f'=IF({inm},DAY({dtx})&IF(COUNTIF({PAYDAYS},{dtx})>0,"   ● PAYDAY",""),"")',
                    bold=True, size=10, fill="surface", border=top_line, indent=1)
            ws.row_dimensions[r0].height = 23
            cnt = f"COUNTIF(Calc!$M${CALC0}:$M${CALC_END},DAY({dtx}))"
            for line in (1, 2, 3):
                look = (f'IFERROR(INDEX(Calc!$K${CALC0}:$K${CALC_END},MATCH(DAY({dtx})*100+{line},'
                        f'Calc!$N${CALC0}:$N${CALC_END},0)),"")')
                if line == 3:
                    look = f'IF({cnt}>3,"+"&({cnt}-2)&" more",{look})'
                kit.put(ws, r0 + line, c, f'=IF({inm},{look},"")', size=8.5, color="ink", fill="surface", indent=1)
                ws.row_dimensions[r0 + line].height = 17
        block = f"B{r0}:H{r0 + 3}"
        kit.cf_formula(ws, block, f'=B${r0}=""', fill="bg")
        kit.cf_formula(ws, f"B{r0}:H{r0}", f'=ISNUMBER(SEARCH("PAYDAY",B{r0}))', color="income")
    bills_due = (f"N(INDEX({rng(3, PLAN_TOTAL['Bills'], 14, PLAN_TOTAL['Bills'], 'Budget Plan')},{CAL_M}))"
                 f"+N(INDEX({rng(3, PLAN_TOTAL['Debt'], 14, PLAN_TOTAL['Debt'], 'Budget Plan')},{CAL_M}))")
    bills_paid = (f'SUMIFS({TX["amt"]},{TX["type"]},"Bills",{TX["m"]},{CAL_M})'
                  f'+SUMIFS({TX["amt"]},{TX["type"]},"Debt",{TX["m"]},{CAL_M})')
    side = dict(value_rows=2, set_heights=False)
    kit.card(ws, 6, 10, 11, "DUE THIS MONTH", f"={bills_due}", "bills and debt payments", color="bills", **side)
    kit.card(ws, 10, 10, 11, "PAID SO FAR", f"={bills_paid}", "from your transactions", color="income", **side)
    kit.card(ws, 14, 10, 11, "STILL TO PAY", "=MAX(0,J7-J11)", "due minus paid", color="expenses", **side)
    kit.card(ws, 18, 10, 11, "PAYDAYS", f'=COUNTIFS({PAYDAYS},">="&{CAL_FIRST},{PAYDAYS},"<="&EOMONTH({CAL_FIRST},0))',
             "this month", color="savings", fmt="0", **side)
    kit.merge(ws, 22, 10, 11, "●  PAYDAY marks the days you are paid.", color="income", size=8.5, bold=True)
    kit.merge(ws, 23, 10, 11, "Bills appear on their due day.", color="muted", size=8.5)
    kit.merge(ws, 24, 10, 11, "Set due days on the Setup tab.", color="muted", size=8.5)
    kit.preview(ws, "A1:L30")

    # ----------------------------------------------------------------- Savings Goals ----
    ws = kit.sheet(wb, "Savings Goals", [2, 24, 14, 14, 15, 14, 14, 14, 22, 15, 2], rows=36, tab="savings")
    kit.banner(ws, 2, 2, 10, "Savings Goals", "Set a goal for each savings category. Progress fills in from your transactions.", title_cols=9)
    menu(ws, 2, 10)
    S0, SN = 10, 17
    kit.card(ws, 5, 2, 3, "SAVED SO FAR", f"=SUM(G{S0}:G{SN})", "across all goals", color="savings")
    kit.card(ws, 5, 4, 5, "TOTAL GOALS", f"=SUM(C{S0}:C{SN})", "what you are aiming for", color="neutral")
    kit.card(ws, 5, 6, 7, "STILL TO GO", f"=SUM(H{S0}:H{SN})", "goal minus saved", color="expenses")
    kit.card(ws, 5, 8, 10, "OVERALL PROGRESS", f"=IF(D6>0,MIN(1,B6/D6),0)", "of all goals reached", color="income", fmt="0%")
    kit.strip(ws, 9, 2, ["GOAL", "Goal amount", "Starting balance", "Target date", "Saved this year", "Balance now",
                         "Still to go", "Progress", "Save per month"], color="savings",
              aligns=["left", "right", "right", "center", "right", "right", "right", "left", "right"])
    for j in range(COUNT["Savings"]):
        r = S0 + j
        cr = calc_row("Savings", j)
        g = d["goals"][j] if demo and j < len(d["goals"]) else (None, None, None)
        nm = f"$B{r}"
        cellp(ws, r, 2, f"=Calc!$C${cr}", indent=1)
        kit.input(ws, r, 3, g[0], fmt=kit.money, align="right")
        kit.input(ws, r, 4, g[1], fmt=kit.money, align="right")
        kit.input(ws, r, 5, g[2], fmt="mmm d, yyyy", align="center")
        money(ws, r, 6, f'=IF({nm}="","",SUMIFS({TX["amt"]},{TX["cat"]},{nm},{TX["m"]},">0"))')
        money(ws, r, 7, f'=IF({nm}="","",N(D{r})+N(F{r}))', bold=True)
        money(ws, r, 8, f'=IF(OR({nm}="",N(C{r})<=0),"",MAX(0,C{r}-G{r}))')
        kit.bar(ws, r, 9, kit.bar_formula(f"G{r}", f"C{r}", guard=f'{nm}=""'), color="savings")
        money(ws, r, 10, f'=IF(OR({nm}="",N(C{r})<=0,NOT(ISNUMBER(E{r}))),"",IF(H{r}=0,"Done ✓",'
                         f'H{r}/MAX(1,(YEAR(E{r})-YEAR(TODAY()))*12+MONTH(E{r})-MONTH(TODAY()))))')
    cellp(ws, SN + 1, 2, "Total", bold=True, indent=1)
    for c in (3, 4, 6, 7, 8):
        money(ws, SN + 1, c, f"=SUM({L(c)}{S0}:{L(c)}{SN})", bold=True)
    for c in (5, 10):
        cellp(ws, SN + 1, c)
    kit.bar(ws, SN + 1, 9, kit.bar_formula(f"G{SN + 1}", f"C{SN + 1}"), color="savings")
    kit.strip(ws, 20, 2, ["BALANCE VS GOAL"] + [""] * 8, color="neutral")
    for r in range(21, 35):
        for c in range(2, 11):
            ws.cell(r, c).fill = kit.fill("surface")
    kit.columns(ws, "B21", f"'Savings Goals'!$B${S0}:$B${SN}",
                [("Goal", f"'Savings Goals'!$C${S0}:$C${SN}", PLAN_BAR),
                 ("Balance now", f"'Savings Goals'!$G${S0}:$G${SN}", "savings")], width=27.5, height=7.2)
    kit.preview(ws, "A1:K35")
    if demo:
        ef = sum(a for (_, cat, a, _) in txs if cat == "Emergency fund")
        expect.append({"cell": f"Savings Goals!G{S0}", "value": 3200 + ef, "tol": 0.02, "why": "Emergency fund balance"})

    # ------------------------------------------------------------------- Debt Payoff ----
    ws = kit.sheet(wb, "Debt Payoff", [2, 24, 15, 10, 15, 14, 14, 22, 12, 13, 10, 2], rows=37, tab="debt")
    kit.banner(ws, 2, 2, 11, "Debt Payoff", "Enter each balance and interest rate. Payments come from your transactions.", title_cols=10)
    menu(ws, 2, 11)
    D0, DN = 10, 17
    kit.card(ws, 5, 2, 3, "OWED NOW", f"=SUM(G{D0}:G{DN})", "estimated balance", color="debt")
    kit.card(ws, 5, 4, 6, "PAID THIS YEAR", f"=SUM(F{D0}:F{DN})", "from your transactions", color="income")
    kit.card(ws, 5, 7, 8, "MONTHLY PAYMENTS", f"=SUM(E{D0}:E{DN})", "planned on Setup", color="neutral")
    kit.card(ws, 5, 9, 11, "DEBT-FREE BY", f'=IF(COUNT(J{D0}:J{DN})=0,"–",MAX(J{D0}:J{DN}))', "at your current payments",
             color="savings", fmt="mmm yyyy")
    kit.strip(ws, 9, 2, ["DEBT", "Starting balance", "APR", "Payment / mo", "Paid this year", "Balance now",
                         "Paid off", "Months left", "Debt-free", "Pay first"], color="debt",
              aligns=["left", "right", "right", "right", "right", "right", "left", "center", "center", "center"])
    for j in range(COUNT["Debt"]):
        r = D0 + j
        cr = calc_row("Debt", j)
        b = d["debts"][j] if demo and j < len(d["debts"]) else (None, None)
        nm = f"$B{r}"
        cellp(ws, r, 2, f"=Calc!$C${cr}", indent=1)
        kit.input(ws, r, 3, b[0], fmt=kit.money, align="right")
        kit.input(ws, r, 4, b[1], fmt="0.0%", align="right")
        money(ws, r, 5, f'=IF({nm}="","",Calc!$D${cr})', color="muted")
        money(ws, r, 6, f'=IF({nm}="","",SUMIFS({TX["amt"]},{TX["cat"]},{nm},{TX["m"]},">0"))')
        money(ws, r, 7, f'=IF(OR({nm}="",N(C{r})<=0),"",MAX(0,C{r}-F{r}))', bold=True)
        kit.bar(ws, r, 8, kit.bar_formula(f"F{r}", f"C{r}", guard=f'{nm}=""'), color="debt")
        cellp(ws, r, 9, f'=IF(OR({nm}="",N(G{r})<=0,N(E{r})<=0),"",IFERROR(ROUNDUP(NPER(N(D{r})/12,-E{r},G{r}),0),"Raise payment"))',
              align="center", fmt="0")
        cellp(ws, r, 10, f'=IF(ISNUMBER(I{r}),EDATE(TODAY(),I{r}),"")', fmt="mmm yyyy", align="center")
        cellp(ws, r, 11, f'=IF(OR({nm}="",N(G{r})<=0),"",COUNTIFS($G${D0}:$G${DN},"<"&G{r},$G${D0}:$G${DN},">0")+1)',
              align="center", bold=True, color="debt", fmt="0")
    cellp(ws, DN + 1, 2, "Total", bold=True, indent=1)
    for c in (3, 5, 6, 7):
        money(ws, DN + 1, c, f"=SUM({L(c)}{D0}:{L(c)}{DN})", bold=True)
    cellp(ws, DN + 1, 4)
    kit.bar(ws, DN + 1, 8, kit.bar_formula(f"F{DN + 1}", f"C{DN + 1}"), color="debt")
    for c in (9, 10, 11):
        cellp(ws, DN + 1, c)
    kit.merge(ws, DN + 2, 2, 11, "Balance now = starting balance minus the payments you log. Interest is not added, so refresh the "
              "starting balance from your statement now and then.", fill="surface", border=hair, color="muted", size=8.5, indent=1)
    kit.merge(ws, DN + 3, 2, 11, "“Pay first” ranks the smallest balance as 1 – the snowball method.",
              fill="surface", border=hair, color="muted", size=8.5, indent=1)
    kit.strip(ws, 22, 2, ["WHAT YOU OWE"] + [""] * 9, color="neutral")
    for r in range(23, 36):
        for c in range(2, 12):
            ws.cell(r, c).fill = kit.fill("surface")
    kit.columns(ws, "B23", f"'Debt Payoff'!$B${D0}:$B${DN}",
                [("Starting balance", f"'Debt Payoff'!$C${D0}:$C${DN}", PLAN_BAR),
                 ("Balance now", f"'Debt Payoff'!$G${D0}:$G${DN}", "debt")], width=27.5, height=6.8)
    kit.preview(ws, "A1:L36")
    if demo:
        cc = sum(a for (_, cat, a, _) in txs if cat == "Credit card")
        expect.append({"cell": f"Debt Payoff!G{D0}", "value": 2800 - cc, "tol": 0.02, "why": "Credit card balance"})

    # ----------------------------------------------------------------- Year Overview ----
    ws = kit.sheet(wb, "Year Overview", [2, 13, 13, 13, 13, 13, 13, 13, 13, 11, 3, 24, 13, 13, 13, 2], rows=72, tab="income")
    kit.banner(ws, 2, 2, 15, "Year Overview", f'="Every month of "&{YEAR}&" side by side."', title_cols=13)
    menu(ws, 2, 15)
    kit.card(ws, 5, 2, 3, "INCOME", "=C22", "this year so far", color="income")
    kit.card(ws, 5, 4, 5, "SPENT", "=D22+E22+G22", "bills, expenses and debt", color="expenses")
    kit.card(ws, 5, 6, 7, "SAVED", "=F22", "moved to savings", color="savings")
    kit.card(ws, 5, 8, 10, "LEFT OVER", "=I22", "income minus everything", color="neutral")
    kit.cf_negative(ws, "H6")
    kit.card(ws, 5, 12, 15, "SAVINGS RATE", '=IF(N(C22)>0,F22/C22,0)', "of income saved this year", color="savings", fmt="0%")
    heads = ["Income", "Bills", "Expenses", "Savings", "Debt", "Total out", "Left over", "Saved %"]

    def month_table(top, title, actual):
        kit.strip(ws, top, 2, [title] + heads, color="neutral")
        for i in range(12):
            r = top + 1 + i
            cellp(ws, r, 2, MONTHS[i], indent=1)
            for k, t in enumerate(order):
                if actual:
                    f = f'=SUMIFS({TX["amt"]},{TX["type"]},"{t}",{TX["m"]},{i + 1})'
                else:
                    f = f"={ref(3 + i, PLAN_TOTAL[t], sheet='Budget Plan')}"
                money(ws, r, 3 + k, f, color=None if k else COLOR["Income"])
            money(ws, r, 8, f"=SUM(D{r}:G{r})")
            money(ws, r, 9, f"=C{r}-H{r}", bold=True)
            cellp(ws, r, 10, f'=IF(C{r}>0,F{r}/C{r},"")', fmt="0%", align="right", color="muted")
        tr = top + 13
        cellp(ws, tr, 2, "Year", bold=True, indent=1)
        for c in range(3, 10):
            money(ws, tr, c, f"=SUM({L(c)}{top + 1}:{L(c)}{tr - 1})", bold=True)
        cellp(ws, tr, 10, f'=IF(C{tr}>0,F{tr}/C{tr},"")', fmt="0%", align="right", bold=True)
        kit.cf_negative(ws, f"I{top + 1}:I{tr}")
        return tr

    month_table(9, "ACTUAL", True)
    month_table(24, "PLANNED", False)
    kit.strip(ws, 39, 2, ["INCOME VS SPENDING"] + [""] * 8, color="neutral")
    for r in range(40, 56):
        for c in range(2, 11):
            ws.cell(r, c).fill = kit.fill("surface")
    kit.columns(ws, "B40", "'Year Overview'!$B$10:$B$21",
                [("Income", "'Year Overview'!$C$10:$C$21", "income"),
                 ("Total out", "'Year Overview'!$H$10:$H$21", "expenses")], width=21.6, height=8.2)
    kit.strip(ws, 9, 12, ["YEAR BY CATEGORY", "Year plan", "So far", "Used"], color="neutral")
    r = 10
    for t, n, colr in TYPES:
        cellp(ws, r, 12, t.upper(), size=8.5, bold=True, color=colr, indent=1)
        for c in (13, 14, 15):
            cellp(ws, r, c)
        r += 1
        for j in range(n):
            cr = calc_row(t, j)
            nm = f"$L{r}"
            cellp(ws, r, 12, f"=Calc!$C${cr}", indent=1, size=9.5)
            money(ws, r, 13, f'=IF({nm}="","",N({ref(15, plan_row(t, j), sheet="Budget Plan")}))', color="muted", size=9.5)
            money(ws, r, 14, f'=IF({nm}="","",SUMIFS({TX["amt"]},{TX["cat"]},{nm},{TX["m"]},">0"))', size=9.5)
            cellp(ws, r, 15, f'=IF(OR({nm}="",N(M{r})<=0),"",N{r}/M{r})', fmt="0%", align="right", color="muted", size=9.5)
            r += 1
    kit.preview(ws, "A1:P56")
    if demo:
        inc = sum(a for (_, cat, a, _) in txs if cat in by_type["Income"])
        expect.append({"cell": "Year Overview!C22", "value": round(inc, 2), "tol": 0.02, "why": "income year to date"})
        expect.append({"cell": "Year Overview!C37", "value": 12 * sum(a for _, a, _ in d["Income"]), "why": "planned income for the year"})

    # ----------------------------------------------------------------- Subscriptions ----
    ws = kit.sheet(wb, "Subscriptions", [2, 26, 13, 14, 16, 13, 14, 14, 30, 2], rows=37, tab="debt")
    kit.banner(ws, 2, 2, 9, "Subscriptions", "List every recurring charge. See what it really costs per month and per year.", title_cols=8)
    menu(ws, 2, 9)
    U0, UN = 10, 34
    kit.card(ws, 5, 2, 3, "ACTIVE", f'=COUNTIFS(B{U0}:B{UN},"<>",G{U0}:G{UN},">0")', "subscriptions", color="debt", fmt="0")
    kit.card(ws, 5, 4, 6, "PER MONTH", f"=SUM(G{U0}:G{UN})", "active subscriptions", color="expenses", fmt=kit.money)
    kit.card(ws, 5, 7, 9, "PER YEAR", f"=SUM(H{U0}:H{UN})", "active subscriptions", color="bills", fmt=kit.money)
    kit.strip(ws, 9, 2, ["SUBSCRIPTION", "Cost", "Billed", "Next renewal", "Status", "Per month", "Per year", "Note"],
              color="debt", aligns=["left", "right", "center", "center", "center", "right", "right", "left"])
    for i in range(UN - U0 + 1):
        r = U0 + i
        s = d["subs"][i] if demo and i < len(d["subs"]) else (None,) * 5
        kit.input(ws, r, 2, s[0])
        kit.input(ws, r, 3, s[1], fmt=kit.money, align="right")
        kit.input(ws, r, 4, s[2], align="center")
        kit.input(ws, r, 5, s[3], fmt="mmm d, yyyy", align="center")
        kit.input(ws, r, 6, s[4], align="center")
        money(ws, r, 7, f'=IF(OR(B{r}="",N(C{r})=0,F{r}="Paused",F{r}="Cancelled"),"",'
                        f'C{r}*IFERROR(CHOOSE(MATCH(D{r},Calc!$V$2:$V$5,0),52/12,1,1/3,1/12),1))')
        money(ws, r, 8, f'=IF(G{r}="","",G{r}*12)')
        kit.input(ws, r, 9, None)
    kit.dropdown(ws, f"D{U0}:D{UN}", CYCLES)
    kit.dropdown(ws, f"F{U0}:F{UN}", ["Active", "Paused", "Cancelled"])
    kit.cf_formula(ws, f"F{U0}:F{UN}", f'=OR(F{U0}="Paused",F{U0}="Cancelled")', color="muted")
    kit.cf_formula(ws, f"E{U0}:E{UN}", f"=AND(ISNUMBER(E{U0}),E{U0}>=TODAY(),E{U0}<=TODAY()+7)", color="neg", bold=True)
    kit.preview(ws, "A1:J24")
    if demo:
        per_month = 15.99 + 10.99 + 2.99 + 35 + 59 / 12 + 119 / 12
        expect.append({"cell": "Subscriptions!D6", "value": round(per_month, 4), "tol": 0.01, "why": "active subscriptions per month"})

    # ---------------------------------------------------------------------------------------
    order_tabs = ["Start Here", "Setup", "Budget Plan", "Transactions", "Dashboard", "Paychecks", "Bill Calendar",
                  "Savings Goals", "Debt Payoff", "Year Overview", "Subscriptions", "Calc"]
    wb._sheets = [wb[n] for n in order_tabs]
    name = f"{PRODUCT} ({theme.title()})" + (" - Sample Data" if demo else "")
    path = kit.save(wb, out_dir / f"{name}.xlsx", active=4 if demo else 0)
    return path, expect


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="products/paycheck-budget-planner")
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
