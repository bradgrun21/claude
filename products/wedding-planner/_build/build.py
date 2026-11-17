#!/usr/bin/env python3
"""Wedding Planner & Budget - built with the etsy-sheet-builder skill.

    python products/wedding-planner/_build/build.py [--themes neutral,blush]

One blank workbook per colour theme, sample-data copies in Neutral and Blush, and expect.json.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import random
import sys
from pathlib import Path

HERE = Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[3] / ".claude/skills/etsy-sheet-builder/scripts"))
from openpyxl.worksheet.datavalidation import DataValidation  # noqa: E402

from sheetkit import THEME_ORDER, Kit, L  # noqa: E402

PRODUCT = "Wedding Planner"
SAMPLE_THEMES = ("neutral", "blush")
NCAT, NMEAL, NGROUP, NVEND, NTAB, NSEAT = 16, 5, 6, 30, 20, 10
EX0, EXN = 6, 155          # expense rows
GL0, GLN = 10, 259         # guest rows
CK0, CKN = 10, 89          # checklist rows
VN0, VNN = 10, 39          # vendor rows
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
          "October", "November", "December"]
DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

# ---- named cells: never type a Calc address by hand ---------------------------------------
P1, P2, WDATE_IN, TOTAL_IN, VENUE = ("Setup!$C$6", "Setup!$C$7", "Setup!$C$8", "Setup!$C$9", "Setup!$C$10")
SCALARS = ["wdate", "days", "total", "planned", "cost", "paid", "balance", "invited", "attending", "declined",
           "awaiting", "seated", "tasks", "done", "overdue", "soon", "tables", "seats", "gifts", "thanks", "first"]
SC = {k: f"Calc!$Y${2 + i}" for i, k in enumerate(SCALARS)}


def loc(key):
    return SC[key].split("!")[1]


def col_range(sheet, col, r0, rn):
    return f"'{sheet}'!${col}${r0}:${col}${rn}"


EXP = {k: col_range("Expenses", c, EX0, EXN) for k, c in
       dict(item="B", cat="C", vendor="D", paid="G", bal="H", due="I", status="J", cost="M", key="N").items()}
GL = {k: col_range("Guest List", c, GL0, GLN) for k, c in
      dict(name="B", group="C", rsvp="F", meal="G", table="I", gift="J", thank="K", key="M").items()}
CK = {k: col_range("Checklist", c, CK0, CKN) for k, c in
      dict(task="B", due="D", done="F", status="G", key="J").items()}
CAT_LIST, MEAL_LIST, GROUP_LIST = "Calc!$G$2:$G$17", "Calc!$L$2:$L$6", "Calc!$P$2:$P$7"
VEND_LIST, TABLE_LIST = "Calc!$T$2:$T$31", "Calc!$V$2:$V$21"

# ---- content --------------------------------------------------------------------------------
CATEGORIES = [("Venue", 0.20), ("Catering & bar", 0.24), ("Photography & video", 0.11), ("Flowers & decor", 0.09),
              ("Music & entertainment", 0.08), ("Attire & beauty", 0.08), ("Stationery", 0.03), ("Rings", 0.04),
              ("Cake & desserts", 0.02), ("Transport", 0.02), ("Officiant & license", 0.01),
              ("Favors & gifts", 0.02), ("Honeymoon", 0.0), ("Miscellaneous", 0.06)]
MEALS = ["Chicken", "Beef", "Fish", "Vegetarian", "Kids meal"]
GROUPS = ["Partner 1 family", "Partner 1 friends", "Partner 2 family", "Partner 2 friends", "Work", "Other"]
TASKS = [  # months before the wedding, task
    (12, "Set your total budget"), (12, "Draft the guest list"), (12, "Choose a date and a backup date"),
    (12, "Book the venue"), (11, "Choose your wedding party"), (11, "Book the photographer"),
    (10, "Book the caterer"), (10, "Book music or a DJ"), (10, "Start shopping for the dress or outfit"),
    (9, "Send save-the-dates"), (9, "Book the officiant"), (9, "Reserve hotel rooms for guests"),
    (8, "Book the florist"), (8, "Order the cake"), (8, "Book hair and makeup"),
    (7, "Plan the honeymoon"), (7, "Set up a gift registry"), (7, "Choose outfits for the wedding party"),
    (6, "Order invitations"), (6, "Book transport"), (6, "Buy wedding rings"),
    (5, "Plan the ceremony with your officiant"), (5, "Book the rehearsal dinner"),
    (4, "Order suits or second outfits"), (4, "Choose the menu and do a tasting"),
    (3, "Send invitations"), (3, "Buy favors and wedding party gifts"), (3, "Write your vows"),
    (2, "Apply for the marriage license"), (2, "Schedule final fittings"), (2, "Plan the day-of timeline"),
    (1.5, "Chase missing RSVPs"), (1, "Give final numbers to the caterer"), (1, "Finish the seating plan"),
    (1, "Confirm every vendor's arrival time"), (1, "Print menus and place cards"),
    (0.5, "Pay final balances"), (0.5, "Pack for the honeymoon"), (0.5, "Share the day-of timeline with helpers"),
    (0.25, "Prepare tip envelopes"), (0.25, "Rehearsal and rehearsal dinner"), (0, "Get married"),
    (-1, "Send thank-you notes"), (-1, "Review your vendors"),
]
DAY_OF = [(10, 0, "Hair and makeup begins", "Getting-ready room", "Wedding party"),
          (12, 30, "Flowers delivered", "Venue", "Florist"),
          (13, 0, "Photographer arrives", "Getting-ready room", "Photographer"),
          (14, 30, "Guests begin to arrive", "Ceremony space", "Ushers"),
          (15, 0, "Ceremony", "Ceremony space", "Everyone"),
          (15, 30, "Drinks and group photos", "Garden", "Everyone"),
          (17, 0, "Guests seated for dinner", "Main hall", "Everyone"),
          (17, 15, "Welcome and toasts", "Main hall", "Hosts"),
          (17, 30, "Dinner served", "Main hall", "Caterer"),
          (19, 0, "Cake cutting", "Main hall", "Everyone"),
          (19, 15, "First dance", "Dance floor", "Everyone"),
          (19, 30, "Dance floor opens", "Dance floor", "DJ"),
          (22, 30, "Last song and send-off", "Front steps", "Everyone"),
          (23, 0, "Venue cleared", "Venue", "Family helpers")]

D = dt.date
DEMO = dict(p1="Avery", p2="Jordan", wdate=D(2027, 2, 6), total=36000, venue="Willow Barn, Cedar Falls", tables=10, seats=8)
def BEFORE(days):
    return DEMO['wdate'] - dt.timedelta(days=days)


DEMO_EXP = [  # item, category, vendor, estimate, actual, paid, due
    ("Venue hire", "Venue", "Willow Barn", 6800, 6500, 3250, BEFORE(31)),
    ("Ceremony chairs and arch", "Venue", "Willow Barn", 600, 550, 0, BEFORE(31)),
    ("Dinner (per plate)", "Catering & bar", "Hearth Catering", 6200, 6400, 1600, BEFORE(14)),
    ("Bar package", "Catering & bar", "Hearth Catering", 2000, 1850, 0, BEFORE(14)),
    ("Photographer (8 hours)", "Photography & video", "North Light Photo", 3200, 3400, 1000, BEFORE(11)),
    ("Engagement photos", "Photography & video", "North Light Photo", 350, 350, 0, D(2026, 11, 5)),
    ("Videographer", "Photography & video", None, 1800, None, 0, None),
    ("Bouquets and buttonholes", "Flowers & decor", "Petal & Stem", 900, 950, 300, BEFORE(23)),
    ("Table centrepieces", "Flowers & decor", "Petal & Stem", 1100, 1250, 0, BEFORE(23)),
    ("Candles and signage", "Flowers & decor", None, 350, 280, 280, None),
    ("DJ and sound", "Music & entertainment", "Good Night DJs", 1500, 1400, 400, BEFORE(7)),
    ("Ceremony musician", "Music & entertainment", None, 500, None, 0, None),
    ("Wedding dress", "Attire & beauty", "Ivory Room", 1900, 2150, 2150, None),
    ("Alterations", "Attire & beauty", "Ivory Room", 300, None, 0, BEFORE(58)),
    ("Suit", "Attire & beauty", None, 700, 640, 640, None),
    ("Hair and makeup", "Attire & beauty", "Glow Studio", 450, 480, 100, BEFORE(0)),
    ("Save-the-dates", "Stationery", "Paper Lane", 180, 165, 165, None),
    ("Invitations", "Stationery", "Paper Lane", 420, 460, 230, D(2026, 12, 5)),
    ("Menus and place cards", "Stationery", None, 200, None, 0, BEFORE(42)),
    ("Wedding rings", "Rings", None, 1400, 1320, 660, BEFORE(60)),
    ("Wedding cake", "Cake & desserts", "Sweet Layers", 550, 600, 150, BEFORE(15)),
    ("Guest shuttle", "Transport", None, 600, None, 0, BEFORE(28)),
    ("Officiant fee", "Officiant & license", None, 400, 400, 0, BEFORE(2)),
    ("Marriage license", "Officiant & license", None, 90, None, 0, BEFORE(42)),
    ("Guest favors", "Favors & gifts", None, 300, 260, 260, None),
    ("Wedding party gifts", "Favors & gifts", None, 400, None, 0, BEFORE(23)),
    ("Wedding insurance", "Miscellaneous", None, 250, 235, 235, None),
    ("Tips and gratuities", "Miscellaneous", None, 800, None, 0, BEFORE(0)),
]
DEMO_VENDORS = [  # name, category, contact, phone, email, status, notes
    ("Willow Barn", "Venue", "Dana Reyes", "555-0142", "dana@willowbarn.example", "Booked", "Access from 9am"),
    ("Hearth Catering", "Catering & bar", "Sam Okafor", "555-0117", "sam@hearth.example", "Booked", "Tasting booked"),
    ("North Light Photo", "Photography & video", "Mia Chen", "555-0163", "mia@northlight.example", "Booked", ""),
    ("Petal & Stem", "Flowers & decor", "Lena Park", "555-0128", "hello@petalstem.example", "Booked", "Seasonal flowers"),
    ("Good Night DJs", "Music & entertainment", "Theo Grant", "555-0155", "theo@goodnight.example", "Booked", "Needs two power outlets"),
    ("Ivory Room", "Attire & beauty", "Priya Nair", "555-0109", "priya@ivoryroom.example", "Booked", "Final fitting booked"),
    ("Glow Studio", "Attire & beauty", "Jess Moreau", "555-0171", "jess@glow.example", "Booked", ""),
    ("Paper Lane", "Stationery", "Omar Haddad", "555-0136", "omar@paperlane.example", "Booked", ""),
    ("Sweet Layers", "Cake & desserts", "Nora Blake", "555-0184", "nora@sweetlayers.example", "Booked", "Lemon and vanilla"),
    ("Second Take Films", "Photography & video", "Eli Ward", "555-0190", "eli@secondtake.example", "Considering", "Quote: 1,750"),
    ("Strings & Co", "Music & entertainment", "Ana Costa", "555-0122", "ana@strings.example", "Considering", "Ceremony only"),
    ("City Shuttle Co", "Transport", "Ben Adler", "555-0147", "ben@cityshuttle.example", "Considering", "24-seat bus"),
]
FIRST = ["Olivia", "Noah", "Emma", "Liam", "Ava", "Elijah", "Sophia", "Lucas", "Isabella", "Mason", "Mia", "Ethan",
         "Amelia", "Logan", "Harper", "James", "Evelyn", "Aiden", "Abigail", "Caleb", "Ella", "Henry", "Grace",
         "Owen", "Chloe", "Wyatt", "Zoe", "Julian", "Nora", "Leo", "Hannah", "Isaac", "Lily", "Miles", "Ruby",
         "Felix", "Maya", "Jonah", "Clara", "Simon"]
LAST = ["Bennett", "Carter", "Diaz", "Ellis", "Foster", "Grant", "Hayes", "Iverson", "Jensen", "Kim", "Lopez",
        "Morgan", "Nguyen", "Ortiz", "Patel", "Quinn", "Rivera", "Shaw", "Turner", "Vance", "Walsh", "Young"]
STREETS = ["Maple St", "Oak Ave", "Cedar Ln", "Birch Rd", "Elm St", "Willow Way", "Pine Ct", "Aspen Dr"]
TOWNS = ["Cedar Falls", "Brookfield", "Lakeview", "Fairmont", "Riverton"]


def demo_guests():
    rnd = random.Random(21)
    names = set()
    while len(names) < 96:
        names.add(f"{rnd.choice(FIRST)} {rnd.choice(LAST)}")
    names = sorted(names, key=lambda n: (n.split()[1], n.split()[0]))
    rows = []
    for i, name in enumerate(names):
        group = GROUPS[[0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 5][i % 12]]
        address = f"{rnd.randint(11, 480)} {rnd.choice(STREETS)}, {rnd.choice(TOWNS)}"
        roll = rnd.random()
        rsvp = "Attending" if roll < 0.64 else ("Declined" if roll < 0.71 else None)
        meal = rnd.choice(["Chicken", "Chicken", "Beef", "Beef", "Fish", "Vegetarian", "Kids meal"]) if rsvp == "Attending" and rnd.random() < 0.93 else None
        diet = rnd.choice([None] * 9 + ["Gluten-free", "Nut allergy", "No dairy"]) if rsvp == "Attending" else None
        rows.append([name, group, address, "Yes", rsvp, meal, diet, None, None, None])
    seat, table = 0, 1
    attending = [r for r in rows if r[4] == "Attending"]
    for r in sorted(attending, key=lambda r: GROUPS.index(r[1]))[:-6]:       # six guests still to seat
        r[7] = table
        seat += 1
        if seat == DEMO["seats"]:
            seat, table = 0, table + 1
    gifts = ["Stand mixer", "Gift card", "Wine glasses", "Cookware set", "Picture frame", "Bed linen", "Cash gift",
             "Board games", "Coffee maker", "Throw blanket", "Cheese board", "Luggage set", "Candle set", "Plant"]
    for k, r in enumerate(rnd.sample(rows, len(gifts))):
        r[8] = gifts[k]
        r[9] = "Sent" if k < 9 else None
    return rows


# ==========================================================================================
def build(out_dir: Path, theme: str, demo: bool):
    kit = Kit(theme=theme)
    wb = kit.workbook()
    hair = kit.hairline()
    MT = kit.money_txt
    d = DEMO if demo else {}
    guests = demo_guests() if demo else []
    exps = DEMO_EXP if demo else []
    vendors = DEMO_VENDORS if demo else []
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

    def loose_dropdown(ws, cells, source):
        """A dropdown that still lets the buyer type something that is not on the list."""
        dv = DataValidation(type="list", formula1="=" + source, allow_blank=True)
        dv.showErrorMessage = False
        ws.add_data_validation(dv)
        dv.add(cells)

    def surface(ws, r1, r2, c1, c2):
        for r in range(r1, r2 + 1):
            for c in range(c1, c2 + 1):
                ws.cell(r, c).fill = kit.fill("surface")

    # -------------------------------------------------------------------- Start Here ----
    ws = kit.sheet(wb, "Start Here", [2, 6, 62, 3, 20, 46, 2], rows=26, tab="neutral")
    kit.banner(ws, 2, 2, 6, PRODUCT, "Your budget, guests, seating, vendors and to-do list in one place.")
    kit.strip(ws, 5, 2, ["QUICK START", ""], color="neutral")
    kit.strip(ws, 5, 5, ["WHAT'S INSIDE", ""], color="neutral")
    steps = [
        "Open the Setup tab. Enter your names, wedding date and total budget. The budget split fills itself in – change it to suit you.",
        "List what you are paying for on the Expenses tab: an estimate first, the real price once you have it, and what you have paid.",
        "Add your guests on the Guest List tab. Record replies, meal choices and table numbers as they come in.",
        "Work through the Checklist. Every task has a due date worked out from your wedding date.",
        "Keep an eye on the Dashboard: budget left, payments coming up, replies and what is next.",
    ]
    for i, text in enumerate(steps):
        r = 6 + i * 2
        kit.merge(ws, r, 2, 2, i + 1, row2=r + 1, size=14, bold=True, color="expenses", align="center", fill="surface", border=hair)
        kit.merge(ws, r, 3, 3, text, row2=r + 1, wrap=True, size=10, fill="surface", border=hair)
    tabs = [("Setup", "Names, date, budget split, meals, tables"), ("Dashboard", "Everything at a glance"),
            ("Budget", "Planned against cost, by category"), ("Expenses", "Every cost, payment and due date"),
            ("Guest List", "Replies, meals, tables, gifts"), ("Seating Plan", "Who sits where, filled in for you"),
            ("Checklist", "Tasks with due dates"), ("Vendors", "Contacts and what each one costs"),
            ("Day Of", "The timeline for the day itself")]
    for i, (name, what) in enumerate(tabs):
        r = 6 + i
        kit.link(ws, r, 5, name, name, color="expenses", size=10, bold=True, fill="surface", border=hair,
                 underline="single", indent=1)
        cellp(ws, r, 6, what, color="muted", size=9.5)
    cellp(ws, 15, 5)
    cellp(ws, 15, 6)
    kit.strip(ws, 17, 2, ["GOOD TO KNOW", ""], color="neutral")
    kit.strip(ws, 17, 5, ["THE COLOURS", ""], color="neutral")
    kit.input(ws, 18, 5, "Yellow", align="center")
    cellp(ws, 18, 6, "Yours to type in.", color="muted", size=9.5)
    kit.input(ws, 19, 5, "Pale yellow", soft=True, align="center")
    cellp(ws, 19, 6, "Filled in for you. Type over it if you need to.", color="muted", size=9.5)
    cellp(ws, 20, 5, "White", align="center")
    cellp(ws, 20, 6, "Calculates itself. Leave these alone.", color="muted", size=9.5)
    notes = [
        "Cost means the real price once you have typed one. Until then it uses your estimate, so the budget is never blank.",
        "One row per guest, including plus-ones and children. That keeps meals and seats exact.",
        "Give a guest a table number and they appear on the Seating Plan. Guests who decline are left off.",
        "The budget split is a common starting point, not a rule. Change any share or type your own amount.",
        "Sheets are protected so formulas can't be deleted by accident. In Excel: Review → Unprotect Sheet. There is no password.",
    ]
    for i, text in enumerate(notes):
        r = 18 + i
        ws.row_dimensions[r].height = 34
        cellp(ws, r, 2, "•", color="muted", align="center")
        cellp(ws, r, 3, text, wrap=True, size=9.5)
    kit.preview(ws, "A1:G23")

    # ------------------------------------------------------------------------- Setup ----
    ws = kit.sheet(wb, "Setup", [2, 26, 12, 14, 3, 24, 14, 3, 24, 12, 2], rows=33, tab="neutral")
    kit.banner(ws, 2, 2, 10, "Setup", "Fill in the yellow cells once. Every other tab reads from here.", title_cols=8)
    menu(ws, 2, 10)
    kit.strip(ws, 5, 2, ["THE BASICS", "", ""], color="neutral")
    basics = [("Partner 1", d.get("p1"), None), ("Partner 2", d.get("p2"), None),
              ("Wedding date", d.get("wdate"), "ddd, mmm d, yyyy"), ("Total budget", d.get("total"), kit.money0),
              ("Venue or city", d.get("venue"), None)]
    for i, (label, value, fmt) in enumerate(basics):
        cellp(ws, 6 + i, 2, label, indent=1)
        kit.input(ws, 6 + i, 3, value, fmt=fmt, align="center", c2=4)
    kit.strip(ws, 5, 6, ["MEAL CHOICES", ""], color="savings")
    for i in range(NMEAL):
        kit.input(ws, 6 + i, 6, MEALS[i], c2=7)
    kit.strip(ws, 5, 9, ["SEATING", ""], color="debt")
    cellp(ws, 6, 9, "Number of tables", indent=1)
    kit.input(ws, 6, 10, d.get("tables", 12), fmt="0", align="center")
    cellp(ws, 7, 9, "Seats per table", indent=1)
    kit.input(ws, 7, 10, d.get("seats", 10), fmt="0", align="center")
    kit.merge(ws, 8, 9, 10, "Up to 20 tables of up to 10.", fill="surface", border=hair, color="muted", size=9, indent=1)
    for r in (9, 10):
        kit.merge(ws, r, 9, 10, None, fill="surface", border=hair)
    dv = DataValidation(type="whole", operator="between", formula1="1", formula2="20", allow_blank=True)
    dv.showErrorMessage, dv.errorTitle, dv.error = True, "Tables", "Type a number from 1 to 20."
    ws.add_data_validation(dv)
    dv.add("J6")
    dv = DataValidation(type="whole", operator="between", formula1="1", formula2="10", allow_blank=True)
    dv.showErrorMessage, dv.errorTitle, dv.error = True, "Seats", "Type a number from 1 to 10."
    ws.add_data_validation(dv)
    dv.add("J7")

    kit.strip(ws, 12, 2, ["BUDGET CATEGORIES", "Share", "Planned"], color="bills")
    C0S = 13
    for i in range(NCAT):
        r = C0S + i
        name, share = CATEGORIES[i] if i < len(CATEGORIES) else (None, None)
        kit.input(ws, r, 2, name)
        kit.input(ws, r, 3, share, fmt="0%", align="right", soft=True)
        kit.input(ws, r, 4, f'=IF(OR($B{r}="",N($C$9)=0),"",ROUND($C$9*N(C{r}),0))', fmt=kit.money, align="right", soft=True)
    tr = C0S + NCAT
    cellp(ws, tr, 2, "Total", bold=True, indent=1)
    cellp(ws, tr, 3, f"=SUM(C{C0S}:C{tr - 1})", fmt="0%", align="right", bold=True)
    money(ws, tr, 4, f"=SUM(D{C0S}:D{tr - 1})", bold=True)
    cellp(ws, tr + 1, 2, "Left to plan", indent=1, color="muted")
    cellp(ws, tr + 1, 3)
    money(ws, tr + 1, 4, f"=N($C$9)-D{tr}", color="muted")
    kit.cf_negative(ws, f"D{tr + 1}")
    kit.cf_formula(ws, f"B{C0S}:B{tr - 1}", f'=AND(B{C0S}<>"",COUNTIF($B${C0S}:$B${tr - 1},B{C0S})>1)', color="neg", bold=True)

    kit.strip(ws, 12, 6, ["GUEST GROUPS", ""], color="debt")
    for i in range(NGROUP):
        kit.input(ws, 13 + i, 6, GROUPS[i], c2=7)
    kit.strip(ws, 20, 6, ["HOW IT WORKS", "", "", "", ""], color="neutral")
    tips = ["Share is each category's slice of your total budget. The planned amount follows it.",
            "Type over any planned amount to set your own figure.",
            "Rename any category, meal or group. Empty rows are ignored.",
            "A category name shown in red is used twice.",
            "Meals and groups become the dropdowns on the Guest List."]
    for i, text in enumerate(tips):
        kit.merge(ws, 21 + i, 6, 10, text, fill="surface", border=hair, color="muted", size=9.5, indent=1)

    # -------------------------------------------------------------------------- Calc ----
    cs = kit.sheet(wb, "Calc", [8] * 4, rows=2, hidden=True)
    for col, h in dict(A="idx", B="category", C="planned", D="cost", E="paid", F="seq", G="list", H="rank", J="meal",
                       K="seq", L="list", N="group", O="seq", P="list", R="vendor", S="seq", T="list", V="table",
                       X="scalar", Y="value", AA="pay key", AB="pay row", AD="task key", AE="task row",
                       AG="mon", AH="month", AI="day", AK="slice", AL="amount").items():
        cs[f"{col}1"] = h

    def compact(src_col, seq_col, list_col, r0, rn):
        for r in range(r0, rn + 1):
            cs[f"{seq_col}{r}"] = f'=IF({src_col}{r}="","",MAX({seq_col}$1:{seq_col}{r - 1})+1)'
            cs[f"{list_col}{r}"] = (f'=IFERROR(INDEX(${src_col}${r0}:${src_col}${rn},'
                                    f'MATCH({r - r0 + 1},${seq_col}${r0}:${seq_col}${rn},0)),"")')

    for i in range(NCAT):
        r, s = 2 + i, C0S + i
        cs[f"A{r}"] = i + 1
        cs[f"B{r}"] = f'=IF(Setup!$B${s}="","",TRIM(Setup!$B${s}))'
        cs[f"C{r}"] = f'=IF(B{r}="",0,N(Setup!$D${s}))'
        cs[f"D{r}"] = f'=IF(B{r}="",0,SUMIF({EXP["cat"]},B{r},{EXP["cost"]}))'
        cs[f"E{r}"] = f'=IF(B{r}="",0,SUMIF({EXP["cat"]},B{r},{EXP["paid"]}))'
        cs[f"H{r}"] = f"=SUMPRODUCT(--($D$2:$D${1 + NCAT}>D{r}))+SUMPRODUCT(--($D$2:D{r}=D{r}))"
    compact("B", "F", "G", 2, 1 + NCAT)
    for i in range(NMEAL):
        cs[f"J{2 + i}"] = f'=IF(Setup!$F${6 + i}="","",TRIM(Setup!$F${6 + i}))'
    compact("J", "K", "L", 2, 1 + NMEAL)
    for i in range(NGROUP):
        cs[f"N{2 + i}"] = f'=IF(Setup!$F${13 + i}="","",TRIM(Setup!$F${13 + i}))'
    compact("N", "O", "P", 2, 1 + NGROUP)
    for i in range(NVEND):
        cs[f"R{2 + i}"] = f'=IF(Vendors!$B${VN0 + i}="","",TRIM(Vendors!$B${VN0 + i}))'
    compact("R", "S", "T", 2, 1 + NVEND)
    for i in range(NTAB):
        cs[f"V{2 + i}"] = i + 1
    scal = dict(
        wdate=f'=IF(ISNUMBER({WDATE_IN}),{WDATE_IN},"")',
        days=f'=IF({loc("wdate")}="","",{loc("wdate")}-TODAY())',
        total=f"=N({TOTAL_IN})",
        planned=f"=SUM(C2:C{1 + NCAT})",
        cost=f"=SUM({EXP['cost']})", paid=f"=SUM({EXP['paid']})", balance=f"=SUM({EXP['bal']})",
        invited=f'=SUMPRODUCT(--({GL["name"]}<>""))',
        attending=f'=COUNTIF({GL["rsvp"]},"Attending")', declined=f'=COUNTIF({GL["rsvp"]},"Declined")',
        awaiting=f'=MAX(0,{loc("invited")}-{loc("attending")}-{loc("declined")})',
        seated=f'=COUNTIFS({GL["rsvp"]},"Attending",{GL["table"]},">0")',
        tasks=f'=SUMPRODUCT(--({CK["task"]}<>""))', done=f'=COUNTIF({CK["done"]},"Done")',
        overdue=f'=COUNTIF({CK["status"]},"Overdue")', soon=f'=COUNTIF({CK["status"]},"This month")',
        tables=f"=MIN({NTAB},MAX(0,N(Setup!$J$6)))", seats=f"=MIN({NSEAT},MAX(0,N(Setup!$J$7)))",
        gifts=f'=SUMPRODUCT(--({GL["gift"]}<>""))', thanks=f'=COUNTIF({GL["thank"]},"Sent")',
        first="=DATE(YEAR(TODAY()),MONTH(TODAY()),1)",
    )
    for i, k in enumerate(SCALARS):
        cs[f"X{2 + i}"], cs[f"Y{2 + i}"] = k, scal[k]
    for k in range(1, 11):      # the next ten payments, earliest first
        cs[f"AA{1 + k}"] = f'=IFERROR(SMALL({EXP["key"]},{k}),"")'
        cs[f"AB{1 + k}"] = f'=IF(AA{1 + k}="","",MATCH(AA{1 + k},{EXP["key"]},0))'
    for k in range(1, 9):       # the next eight open tasks
        cs[f"AD{1 + k}"] = f'=IFERROR(SMALL({CK["key"]},{k}),"")'
        cs[f"AE{1 + k}"] = f'=IF(AD{1 + k}="","",MATCH(AD{1 + k},{CK["key"]},0))'
    for i in range(12):
        cs[f"AG{2 + i}"], cs[f"AH{2 + i}"] = MON[i], MONTHS[i]
    for i in range(7):
        cs[f"AI{2 + i}"] = DAYS[i]
    for k in range(1, 6):       # donut: the five biggest categories and everything else
        ix = f"MATCH({k},$H$2:$H${1 + NCAT},0)"
        cs[f"AK{1 + k}"] = f'=IF(INDEX($D$2:$D${1 + NCAT},{ix})>0,INDEX($B$2:$B${1 + NCAT},{ix}),"")'
        cs[f"AL{1 + k}"] = f"=INDEX($D$2:$D${1 + NCAT},{ix})"
    cs["AK7"], cs["AL7"] = "Everything else", f"=MAX(0,{loc('cost')}-SUM(AL2:AL6))"
    pick_pay = lambda col, k: f'INDEX({col_range("Expenses", col, EX0, EXN)},Calc!$AB${1 + k})'  # noqa: E731
    pick_task = lambda col, k: f'INDEX({col_range("Checklist", col, CK0, CKN)},Calc!$AE${1 + k})'  # noqa: E731

    # --------------------------------------------------------------------- Dashboard ----
    ws = kit.sheet(wb, "Dashboard", [2, 13, 26, 14, 14, 19, 3, 22, 12, 12, 12, 19, 2], rows=47, tab="expenses")
    W = SC["wdate"]
    kit.banner(ws, 2, 2, 12,
               f'=IF(AND({P1}<>"",{P2}<>""),{P1}&" & "&{P2},"Our Wedding")',
               f'=IF({W}="","Add your names and wedding date on the Setup tab.",INDEX(Calc!$AI$2:$AI$8,WEEKDAY({W}))&", "'
               f'&INDEX(Calc!$AH$2:$AH$13,MONTH({W}))&" "&DAY({W})&", "&YEAR({W})&IF({VENUE}<>"","  ·  "&{VENUE},""))',
               title_cols=10)
    menu(ws, 2, 12)
    kit.card(ws, 5, 2, 3, "DAYS TO GO", f'=IF({W}="","–",IF({SC["days"]}>=0,{SC["days"]},"Married!"))',
             f'=IF(N({SC["days"]})>0,"about "&ROUND({SC["days"]}/7,0)&" weeks","")', color="expenses", fmt="0")
    kit.card(ws, 5, 4, 5, "LEFT IN BUDGET", f"={SC['total']}-{SC['cost']}", f'="of "&TEXT({SC["total"]},"{MT}")', color="bills")
    kit.card(ws, 5, 6, 6, "STILL TO PAY", f"={SC['balance']}", "cost minus paid", color="savings")
    kit.card(ws, 5, 8, 8, "ATTENDING", f"={SC['attending']}", f'="of "&{SC["invited"]}&" invited"', color="debt", fmt="0")
    kit.card(ws, 5, 9, 10, "AWAITING REPLY", f"={SC['awaiting']}", "no answer yet", color="neutral", fmt="0")
    kit.card(ws, 5, 11, 12, "TASKS DONE", f'={SC["done"]}&" of "&{SC["tasks"]}',
             f'=IF({SC["overdue"]}>0,{SC["overdue"]}&" overdue",{SC["soon"]}&" due this month")', color="income")
    kit.cf_negative(ws, "D6")
    ws.cell(5, 7).fill = ws.cell(6, 7).fill = ws.cell(7, 7).fill = kit.fill("bg")

    def summary(top, c1, title, rows, color, fmt, base_label="Share"):
        kit.strip(ws, top, c1, [title, "", "", "Amount" if fmt == kit.money else "Guests", base_label], color=color,
                  aligns=["left", "left", "left", "right", "left"])
        for i, (label, value, bar) in enumerate(rows):
            r = top + 1 + i
            kit.merge(ws, r, c1, c1 + 2, label, fill="surface", border=hair, indent=1)
            cellp(ws, r, c1 + 3, value, fmt=fmt, align="right", bold=True)
            if bar:
                kit.bar(ws, r, c1 + 4, kit.bar_formula(f"{L(c1 + 3)}{r}", bar), color=color)
            else:
                cellp(ws, r, c1 + 4)

    summary(9, 2, "BUDGET", [("Total budget", f"={SC['total']}", None), ("Cost so far", f"={SC['cost']}", "$E$10"),
                             ("Paid", f"={SC['paid']}", "$E$11"), ("Still to pay", f"={SC['balance']}", "$E$11"),
                             ("Left in budget", "=E10-E11", "$E$10")], "bills", kit.money, "Of budget")
    kit.cf_negative(ws, "E14")
    summary(9, 8, "GUESTS", [("Invited", f"={SC['invited']}", None), ("Attending", f"={SC['attending']}", "$K$10"),
                             ("Declined", f"={SC['declined']}", "$K$10"), ("Awaiting reply", f"={SC['awaiting']}", "$K$10"),
                             ("Seated", f"={SC['seated']}", "$K$11")], "debt", "0", "Share")

    kit.strip(ws, 16, 2, ["NEXT PAYMENTS", "", "", "Amount", "Status"], color="savings",
              aligns=["left", "left", "left", "right", "left"])
    for k in range(1, 7):
        r = 16 + k
        on = f'Calc!$AB${1 + k}=""'
        cellp(ws, r, 2, f'=IF({on},"",{pick_pay("I", k)})', fmt=kit.date, color="muted", indent=1, align="left")
        kit.merge(ws, r, 3, 4, f'=IF({on},"",{pick_pay("B", k)})', fill="surface", border=hair)
        money(ws, r, 5, f'=IF({on},"",{pick_pay("H", k)})')
        cellp(ws, r, 6, f'=IF({on},"",{pick_pay("J", k)})', size=9, color="muted")
    kit.cf_formula(ws, "F17:F22", '=F17="Overdue"', color="neg", bold=True)
    kit.strip(ws, 16, 8, ["MEAL COUNT", "", "", "Guests", "Share"], color="savings",
              aligns=["left", "left", "left", "right", "left"])
    for i in range(NMEAL):
        r = 17 + i
        nm = f"$H{r}"
        kit.merge(ws, r, 8, 10, f"=Calc!$J${2 + i}", fill="surface", border=hair, indent=1)
        cellp(ws, r, 11, f'=IF({nm}="","",COUNTIFS({GL["meal"]},{nm},{GL["rsvp"]},"Attending"))', fmt="0", align="right", bold=True)
        kit.bar(ws, r, 12, kit.bar_formula(f"K{r}", SC["attending"], guard=f'{nm}=""'), color="savings")
    kit.merge(ws, 22, 8, 10, "No choice yet", fill="surface", border=hair, indent=1, color="muted")
    cellp(ws, 22, 11, f"=MAX(0,{SC['attending']}-SUM(K17:K21))", fmt="0", align="right", color="muted")
    cellp(ws, 22, 12)

    kit.strip(ws, 24, 2, ["COMING UP", "", "", "", "Status"], color="income", aligns=["left"] * 5)
    for k in range(1, 9):
        r = 24 + k
        on = f'Calc!$AE${1 + k}=""'
        cellp(ws, r, 2, f'=IF({on},"",{pick_task("D", k)})', fmt=kit.date, color="muted", indent=1, align="left")
        kit.merge(ws, r, 3, 5, f'=IF({on},"",{pick_task("B", k)})', fill="surface", border=hair)
        cellp(ws, r, 6, f'=IF({on},"",{pick_task("G", k)})', size=9, color="muted")
    kit.cf_formula(ws, "F25:F32", '=F25="Overdue"', color="neg", bold=True)
    kit.strip(ws, 24, 8, ["GUESTS BY GROUP", "", "Invited", "Attending", "Share attending"], color="debt",
              aligns=["left", "left", "right", "right", "left"])
    for i in range(NGROUP):
        r = 25 + i
        nm = f"$H{r}"
        kit.merge(ws, r, 8, 9, f"=Calc!$N${2 + i}", fill="surface", border=hair, indent=1)
        cellp(ws, r, 10, f'=IF({nm}="","",COUNTIF({GL["group"]},{nm}))', fmt="0", align="right", color="muted")
        cellp(ws, r, 11, f'=IF({nm}="","",COUNTIFS({GL["group"]},{nm},{GL["rsvp"]},"Attending"))', fmt="0", align="right", bold=True)
        kit.bar(ws, r, 12, kit.bar_formula(f"K{r}", f"J{r}", guard=f'{nm}=""'), color="debt")
    for r in (31, 32):
        kit.merge(ws, r, 8, 9, None, fill="surface", border=hair)
        for c in (10, 11, 12):
            cellp(ws, r, c)

    kit.strip(ws, 34, 2, ["WHERE THE MONEY GOES", "", "", "", ""], color="neutral")
    kit.strip(ws, 34, 8, ["PAYMENTS BY MONTH", "", "", "", ""], color="neutral")
    surface(ws, 35, 45, 2, 6)
    surface(ws, 35, 45, 8, 12)
    kit.donut(ws, "B35", "Calc!$AK$2:$AK$7", "Calc!$AL$2:$AL$7", ["bills", "expenses", "savings", "debt", "income", "quiet"],
              width=16.2, height=7.9)
    kit.columns(ws, "H35", "Budget!$J$22:$J$33", [("Due", "Budget!$M$22:$M$33", "savings")], width=14.5, height=7.9, gap=60)
    kit.preview(ws, "A1:M46")

    # ------------------------------------------------------------------------ Budget ----
    ws = kit.sheet(wb, "Budget", [2, 24, 13, 13, 13, 13, 13, 19, 3, 11, 26, 20, 13, 2], rows=46, tab="bills")
    kit.banner(ws, 2, 2, 13, "Budget", "Planned against cost for every category. Cost is the real price when you have it, your estimate until then.",
               title_cols=11)
    menu(ws, 2, 13)
    kit.card(ws, 5, 2, 2, "TOTAL BUDGET", f"={SC['total']}", "set on the Setup tab", color="neutral")
    kit.card(ws, 5, 3, 4, "PLANNED", f"={SC['planned']}", "across your categories", color="bills")
    kit.card(ws, 5, 5, 6, "COST SO FAR", f"={SC['cost']}", "prices and estimates", color="expenses")
    kit.card(ws, 5, 7, 8, "PAID", f"={SC['paid']}", "deposits and payments", color="income")
    kit.card(ws, 5, 10, 11, "STILL TO PAY", f"={SC['balance']}", "cost minus paid", color="savings")
    kit.card(ws, 5, 12, 13, "LEFT IN BUDGET", f"={SC['total']}-{SC['cost']}", "budget minus cost", color="debt")
    kit.cf_negative(ws, "L6")
    ws.cell(5, 9).fill = ws.cell(6, 9).fill = ws.cell(7, 9).fill = kit.fill("bg")
    kit.strip(ws, 9, 2, ["CATEGORY", "Planned", "Cost", "Paid", "Still to pay", "Left", "Used"], color="bills",
              aligns=["left", "right", "right", "right", "right", "right", "left"])
    for i in range(NCAT):
        r = 10 + i
        nm = f"$B{r}"
        cellp(ws, r, 2, f"=Calc!$B${2 + i}", indent=1)
        money(ws, r, 3, f'=IF({nm}="","",Calc!$C${2 + i})', color="muted")
        money(ws, r, 4, f'=IF({nm}="","",Calc!$D${2 + i})')
        money(ws, r, 5, f'=IF({nm}="","",Calc!$E${2 + i})', color="muted")
        money(ws, r, 6, f'=IF({nm}="","",D{r}-E{r})')
        money(ws, r, 7, f'=IF({nm}="","",C{r}-D{r})')
        kit.bar(ws, r, 8, kit.bar_formula(f"D{r}", f"C{r}", guard=f'{nm}=""'), color="bills")
    tr = 10 + NCAT
    cellp(ws, tr, 2, "Total", bold=True, indent=1)
    for c in range(3, 8):
        money(ws, tr, c, f"=SUM({L(c)}10:{L(c)}{tr - 1})", bold=True)
    kit.bar(ws, tr, 8, kit.bar_formula(f"D{tr}", f"C{tr}"), color="bills")
    kit.cf_negative(ws, f"G10:G{tr}")
    kit.strip(ws, 28, 2, ["PLANNED AGAINST COST", "", "", "", "", "", ""], color="neutral")
    surface(ws, 29, 45, 2, 8)
    kit.columns(ws, "B29", "Budget!$B$10:$B$25", [("Planned", "Budget!$C$10:$C$25", "quiet"), ("Cost", "Budget!$D$10:$D$25", "bills")],
                width=20.6, height=12.3, horizontal=True, gap=50)

    kit.strip(ws, 9, 10, ["DUE", "NEXT PAYMENTS", "Vendor", "Amount"], color="savings", aligns=["left", "left", "left", "right"])
    for k in range(1, 11):
        r = 9 + k
        on = f'Calc!$AB${1 + k}=""'
        cellp(ws, r, 10, f'=IF({on},"",{pick_pay("I", k)})', fmt=kit.date, color="muted", indent=1, align="left")
        cellp(ws, r, 11, f'=IF({on},"",{pick_pay("B", k)})')
        cellp(ws, r, 12, f'=IF({on},"",{pick_pay("D", k)}&"")', color="muted", size=9.5)
        money(ws, r, 13, f'=IF({on},"",{pick_pay("H", k)})')
    kit.cf_formula(ws, "J10:J19", "=AND(ISNUMBER(J10),J10<TODAY())", color="neg", bold=True)
    kit.strip(ws, 21, 10, ["MONTH", "PAYMENTS BY MONTH", "", "Due"], color="savings", aligns=["left", "left", "left", "right"])
    F = SC["first"]
    for k in range(12):
        r = 22 + k
        if k == 0:
            label, amount = "Late", f'=SUMIFS({EXP["bal"]},{EXP["due"]},"<"&{F})'
        else:
            s, e = f"EDATE({F},{k - 1})", f"EDATE({F},{k})"
            label = f'=INDEX(Calc!$AG$2:$AG$13,MONTH({s}))&" "&RIGHT(YEAR({s}),2)'
            amount = f'=SUMIFS({EXP["bal"]},{EXP["due"]},">="&{s},{EXP["due"]},"<"&{e})'
        cellp(ws, r, 10, label, indent=1, color="neg" if k == 0 else "ink")
        kit.bar(ws, r, 11, f'=IF(N(M{r})<=0,"",REPT("█",MAX(1,ROUND(M{r}/MAX($M$22:$M$33)*14,0))))', color="savings")
        cellp(ws, r, 12)
        money(ws, r, 13, amount)
    kit.merge(ws, 35, 10, 13, "Only items with a due date and money still owing appear here.", fill="surface", border=hair,
              color="muted", size=8.5, indent=1)
    kit.preview(ws, "A1:N46")

    # ---------------------------------------------------------------------- Expenses ----
    ws = kit.sheet(wb, "Expenses", [2, 28, 20, 20, 13, 13, 13, 13, 13, 12, 26, 2, 6, 8], rows=EXN + 1, tab="expenses", freeze="C6")
    kit.banner(ws, 2, 2, 11, "Expenses", "One row per cost. Start with an estimate, add the real price when you have it, and update what you have paid.",
               title_cols=10)
    menu(ws, 2, 11)
    kit.strip(ws, 5, 2, ["ITEM", "CATEGORY", "VENDOR", "ESTIMATE", "REAL PRICE", "PAID SO FAR", "STILL TO PAY", "DUE DATE", "STATUS", "NOTES"],
              color="neutral", aligns=["left", "left", "left", "right", "right", "right", "right", "center", "left", "left"])
    for n in range(EXN - EX0 + 1):
        r = EX0 + n
        e = exps[n] if n < len(exps) else (None,) * 7
        kit.input(ws, r, 2, e[0])
        kit.input(ws, r, 3, e[1], size=9.5)
        kit.input(ws, r, 4, e[2], size=9.5)
        kit.input(ws, r, 5, e[3], fmt=kit.money, align="right")
        kit.input(ws, r, 6, e[4], fmt=kit.money, align="right")
        kit.input(ws, r, 7, e[5] or None, fmt=kit.money, align="right")
        money(ws, r, 8, f'=IF(B{r}="","",M{r}-N(G{r}))', bold=True)
        kit.input(ws, r, 9, e[6], fmt="mmm d, yyyy", align="center")
        cellp(ws, r, 10, f'=IF(B{r}="","",IF(M{r}=0,"No price yet",IF(M{r}-N(G{r})<=0.005,"✓ Paid",IF(NOT(ISNUMBER(I{r})),"Unpaid",'
                         f'IF(I{r}<TODAY(),"Overdue",IF(I{r}<=TODAY()+30,"Due soon","Scheduled"))))))', size=9, color="muted")
        kit.input(ws, r, 11, None)
        ws.cell(r, 13, f'=IF(B{r}="",0,IF(ISNUMBER(F{r}),F{r},N(E{r})))')
        ws.cell(r, 14, f'=IF(AND(B{r}<>"",ISNUMBER(I{r}),M{r}-N(G{r})>0.005),I{r}+ROW()/100000,"")')
    ws.column_dimensions["M"].hidden = ws.column_dimensions["N"].hidden = True
    kit.dropdown(ws, f"C{EX0}:C{EXN}", CAT_LIST, prompt="Pick a budget category from your Setup tab.")
    loose_dropdown(ws, f"D{EX0}:D{EXN}", VEND_LIST)
    kit.number_only(ws, f"E{EX0}:G{EXN}", minimum=0)
    kit.cf_formula(ws, f"J{EX0}:J{EXN}", f'=J{EX0}="Overdue"', color="neg", bold=True)
    kit.cf_formula(ws, f"J{EX0}:J{EXN}", f'=J{EX0}="✓ Paid"', color="pos", bold=True)
    kit.cf_negative(ws, f"H{EX0}:H{EXN}")
    kit.preview(ws, "A1:L36")

    # -------------------------------------------------------------------- Guest List ----
    ws = kit.sheet(wb, "Guest List", [2, 24, 18, 30, 12, 12, 14, 22, 8, 22, 11, 2, 8], rows=GLN + 1, tab="debt", freeze="C10")
    kit.banner(ws, 2, 2, 11, "Guest List", "One row per guest, including plus-ones. Replies, meals and tables feed the Dashboard and the Seating Plan.",
               title_cols=10)
    menu(ws, 2, 11)
    kit.card(ws, 5, 2, 2, "INVITED", f"={SC['invited']}", "guests on your list", color="debt", fmt="0")
    kit.card(ws, 5, 3, 4, "ATTENDING", f"={SC['attending']}", f'=IF({SC["invited"]}>0,TEXT({SC["attending"]}/{SC["invited"]},"0%")&" of invited","")', color="income", fmt="0")
    kit.card(ws, 5, 5, 7, "DECLINED", f"={SC['declined']}", "cannot make it", color="neutral", fmt="0")
    kit.card(ws, 5, 8, 9, "AWAITING REPLY", f"={SC['awaiting']}", "no answer yet", color="expenses", fmt="0")
    kit.card(ws, 5, 10, 11, "THANK-YOUS SENT", f'={SC["thanks"]}&" of "&{SC["gifts"]}', "for gifts received", color="savings")
    kit.strip(ws, 9, 2, ["GUEST", "Group", "Address", "Invite sent", "Reply", "Meal", "Dietary notes", "Table", "Gift", "Thank-you"],
              color="debt", aligns=["left", "left", "left", "center", "center", "left", "left", "center", "left", "center"])
    for n in range(GLN - GL0 + 1):
        r = GL0 + n
        g = guests[n] if n < len(guests) else (None,) * 10
        kit.input(ws, r, 2, g[0])
        kit.input(ws, r, 3, g[1], size=9.5)
        kit.input(ws, r, 4, g[2], size=9.5)
        kit.input(ws, r, 5, g[3], align="center", size=9.5)
        kit.input(ws, r, 6, g[4], align="center", size=9.5)
        kit.input(ws, r, 7, g[5], size=9.5)
        kit.input(ws, r, 8, g[6], size=9.5)
        kit.input(ws, r, 9, g[7], align="center", fmt="0")
        kit.input(ws, r, 10, g[8], size=9.5)
        kit.input(ws, r, 11, g[9], align="center", size=9.5)
        ws.cell(r, 13, f'=IF(AND(B{r}<>"",ISNUMBER(I{r}),F{r}<>"Declined"),I{r}*1000+COUNTIFS(I${GL0}:I{r},I{r},F${GL0}:F{r},"<>Declined"),"")')
    ws.column_dimensions["M"].hidden = True
    kit.dropdown(ws, f"C{GL0}:C{GLN}", GROUP_LIST)
    kit.dropdown(ws, f"E{GL0}:E{GLN}", ["Yes"])
    kit.dropdown(ws, f"F{GL0}:F{GLN}", ["Attending", "Declined"], prompt="Leave empty until they reply.")
    kit.dropdown(ws, f"G{GL0}:G{GLN}", MEAL_LIST)
    kit.dropdown(ws, f"I{GL0}:I{GLN}", TABLE_LIST, prompt="Table number, 1 to 20.")
    kit.dropdown(ws, f"K{GL0}:K{GLN}", ["Sent"])
    kit.cf_formula(ws, f"F{GL0}:F{GLN}", f'=F{GL0}="Attending"', color="pos", bold=True)
    kit.cf_formula(ws, f"B{GL0}:K{GLN}", f'=$F{GL0}="Declined"', color="muted")
    kit.preview(ws, "A1:L36")

    # ------------------------------------------------------------------ Seating Plan ----
    ws = kit.sheet(wb, "Seating Plan", [2] + [20, 12, 2] * 5, rows=62, tab="debt")
    kit.banner(ws, 2, 2, 15, "Seating Plan", "Fills itself in from the table numbers on your Guest List. Name each table if you like.", title_cols=12)
    menu(ws, 2, 15)
    kit.card(ws, 5, 2, 3, "ATTENDING", f"={SC['attending']}", "guests who said yes", color="income", fmt="0")
    kit.card(ws, 5, 5, 6, "SEATED", f"={SC['seated']}", "have a table number", color="debt", fmt="0")
    kit.card(ws, 5, 8, 9, "STILL TO SEAT", f"={SC['attending']}-{SC['seated']}", "attending, no table yet", color="expenses", fmt="0")
    kit.card(ws, 5, 11, 12, "TABLES", f"={SC['tables']}", "set on the Setup tab", color="neutral", fmt="0")
    kit.card(ws, 5, 14, 15, "SEATS PER TABLE", f"={SC['seats']}", "set on the Setup tab", color="neutral", fmt="0")
    for t in range(1, NTAB + 1):
        g, b = divmod(t - 1, 5)
        r0, c = 9 + 13 * g, 2 + 3 * b
        kit.merge(ws, r0, c, c + 1, f"TABLE {t}", size=9.5, bold=True, color="on_cat", fill="debt", indent=1)
        ws.row_dimensions[r0].height = 22
        kit.input(ws, r0 + 1, c, None, soft=True, size=9.5)
        cellp(ws, r0 + 1, c + 1, f'=COUNTIFS({GL["table"]},{t},{GL["rsvp"]},"<>Declined",{GL["name"]},"?*")',
              fmt='0" seated";-0;"empty"', align="right", size=9, color="muted")
        for s in range(1, NSEAT + 1):
            r = r0 + 1 + s
            look = lambda col: f'=IFERROR(INDEX({GL[col]},MATCH({t * 1000 + s},{GL["key"]},0))&"","")'  # noqa: E731
            cellp(ws, r, c, look("name"), size=9.5, indent=1)
            cellp(ws, r, c + 1, look("meal"), size=8.5, color="muted")
        block = f"{L(c)}{r0 + 2}:{L(c + 1)}{r0 + 1 + NSEAT}"
        kit.cf_formula(ws, block, f"=(ROW()-{r0 + 1})>$N$6", fill="bg")                 # beyond the seats at each table
        kit.cf_formula(ws, f"{L(c + 1)}{r0 + 1}", f"={L(c + 1)}{r0 + 1}>$N$6", color="neg", bold=True)   # too many at this table
        kit.cf_formula(ws, f"{L(c)}{r0}:{L(c + 1)}{r0}", f"={t}>$K$6", fill="neutral")   # table not in use
    kit.preview(ws, "A1:P61")

    # --------------------------------------------------------------------- Checklist ----
    ws = kit.sheet(wb, "Checklist", [2, 46, 15, 14, 16, 10, 13, 30, 2, 8], rows=CKN + 1, tab="income", freeze="C10")
    kit.banner(ws, 2, 2, 8, "Checklist", "Due dates come from your wedding date. Change the months, add your own tasks, and mark each one done.", title_cols=7)
    menu(ws, 2, 8)
    kit.card(ws, 5, 2, 2, "TASKS DONE", f'={SC["done"]}&" of "&{SC["tasks"]}',
             f'=IF({SC["tasks"]}>0,TEXT({SC["done"]}/{SC["tasks"]},"0%")&" complete","")', color="income")
    kit.card(ws, 5, 3, 4, "OVERDUE", f"={SC['overdue']}", "past their due date", color="expenses", fmt="0")
    kit.card(ws, 5, 5, 6, "DUE THIS MONTH", f"={SC['soon']}", "in the next 30 days", color="savings", fmt="0")
    kit.card(ws, 5, 7, 8, "DAYS TO GO", f'=IF({W}="","–",IF({SC["days"]}>=0,{SC["days"]},"Married!"))', "until the wedding", color="debt", fmt="0")
    kit.strip(ws, 9, 2, ["TASK", "Months before", "Due by", "Who", "Done", "Status", "Notes"], color="income",
              aligns=["left", "center", "center", "left", "center", "left", "left"])
    rnd = random.Random(5)
    done_n = 0
    for n in range(CKN - CK0 + 1):
        r = CK0 + n
        months, task = TASKS[n] if n < len(TASKS) else (None, None)
        done = owner = None
        if demo and task:
            due = DEMO["wdate"] - dt.timedelta(days=round(months * 30.44))
            if due < D(2026, 11, 20) and task not in ("Write your vows", "Buy favors and wedding party gifts"):
                done = "Done"
                done_n += 1
            owner = rnd.choice([DEMO["p1"], DEMO["p2"], "Both"])
        kit.input(ws, r, 2, task)
        kit.input(ws, r, 3, months, fmt="0.##", align="center", soft=True)
        cellp(ws, r, 4, f'=IF(OR(B{r}="",NOT(ISNUMBER(C{r})),{W}=""),"",EDATE({W},-INT(C{r}))-ROUND((C{r}-INT(C{r}))*30,0))',
              fmt="mmm d, yyyy", align="center")
        kit.input(ws, r, 5, owner, size=9.5)
        kit.input(ws, r, 6, done, align="center", size=9.5)
        cellp(ws, r, 7, f'=IF(B{r}="","",IF(F{r}="Done","✓ Done",IF(D{r}="","",IF(D{r}<TODAY(),"Overdue",IF(D{r}<=TODAY()+30,"This month","Later")))))',
              size=9, color="muted")
        kit.input(ws, r, 8, None)
        ws.cell(r, 10, f'=IF(AND(B{r}<>"",F{r}<>"Done",ISNUMBER(D{r})),D{r}+ROW()/100000,"")')
    ws.column_dimensions["J"].hidden = True
    kit.dropdown(ws, f"F{CK0}:F{CKN}", ["Done"])
    kit.cf_formula(ws, f"G{CK0}:G{CKN}", f'=G{CK0}="Overdue"', color="neg", bold=True)
    kit.cf_formula(ws, f"G{CK0}:G{CKN}", f'=G{CK0}="✓ Done"', color="pos", bold=True)
    kit.cf_formula(ws, f"B{CK0}:B{CKN}", f'=$F{CK0}="Done"', color="muted")
    kit.preview(ws, "A1:I40")

    # ----------------------------------------------------------------------- Vendors ----
    ws = kit.sheet(wb, "Vendors", [2, 26, 20, 20, 16, 28, 14, 13, 13, 13, 28, 2], rows=VNN + 2, tab="savings")
    kit.banner(ws, 2, 2, 11, "Vendors", "Everyone you are hiring or considering. Costs come from the Expenses tab when the vendor name matches.", title_cols=10)
    menu(ws, 2, 11)
    kit.card(ws, 5, 2, 3, "BOOKED", f'=COUNTIF(G{VN0}:G{VNN},"Booked")', "vendors confirmed", color="income", fmt="0")
    kit.card(ws, 5, 4, 5, "CONSIDERING", f'=COUNTIF(G{VN0}:G{VNN},"Considering")', "still deciding", color="savings", fmt="0")
    kit.card(ws, 5, 6, 8, "TOTAL WITH VENDORS", f"=SUM(H{VN0}:H{VNN})", "from your expenses", color="bills")
    kit.card(ws, 5, 9, 11, "STILL TO PAY THEM", f"=SUM(J{VN0}:J{VNN})", "cost minus paid", color="expenses")
    kit.strip(ws, 9, 2, ["VENDOR", "Category", "Contact", "Phone", "Email", "Status", "Cost", "Paid", "Still to pay", "Notes"],
              color="savings", aligns=["left", "left", "left", "left", "left", "center", "right", "right", "right", "left"])
    for n in range(NVEND):
        r = VN0 + n
        v = vendors[n] if n < len(vendors) else (None,) * 7
        kit.input(ws, r, 2, v[0])
        kit.input(ws, r, 3, v[1], size=9.5)
        kit.input(ws, r, 4, v[2], size=9.5)
        kit.input(ws, r, 5, v[3], size=9.5)
        kit.input(ws, r, 6, v[4], size=9.5)
        kit.input(ws, r, 7, v[5], align="center", size=9.5)
        money(ws, r, 8, f'=IF(B{r}="","",SUMIF({EXP["vendor"]},B{r},{EXP["cost"]}))')
        money(ws, r, 9, f'=IF(B{r}="","",SUMIF({EXP["vendor"]},B{r},{EXP["paid"]}))', color="muted")
        money(ws, r, 10, f'=IF(B{r}="","",H{r}-I{r})', bold=True)
        kit.input(ws, r, 11, v[6] or None, size=9.5)
    kit.dropdown(ws, f"C{VN0}:C{VNN}", CAT_LIST)
    kit.dropdown(ws, f"G{VN0}:G{VNN}", ["Booked", "Considering", "Declined"])
    kit.cf_formula(ws, f"G{VN0}:G{VNN}", f'=G{VN0}="Booked"', color="pos", bold=True)
    kit.cf_formula(ws, f"B{VN0}:B{VNN}", f'=AND(B{VN0}<>"",COUNTIF($B${VN0}:$B${VNN},B{VN0})>1)', color="neg", bold=True)
    kit.preview(ws, "A1:L28")

    # ------------------------------------------------------------------------ Day Of ----
    ws = kit.sheet(wb, "Day Of", [2, 13, 36, 24, 24, 36, 2], rows=47, tab="expenses")
    kit.banner(ws, 2, 2, 6, "Day-Of Timeline",
               f'=IF({W}="","The running order for the day. Print it for your helpers.","The running order for "'
               f'&INDEX(Calc!$AI$2:$AI$8,WEEKDAY({W}))&", "&INDEX(Calc!$AH$2:$AH$13,MONTH({W}))&" "&DAY({W})&". Print it for your helpers.")',
               title_cols=5)
    menu(ws, 2, 6)
    kit.strip(ws, 5, 2, ["TIME", "WHAT", "WHERE", "WHO", "NOTES"], color="expenses", aligns=["left"] * 5)
    for n in range(40):
        r = 6 + n
        row = DAY_OF[n] if n < len(DAY_OF) else None
        kit.input(ws, r, 2, dt.time(row[0], row[1]) if row else None, fmt="h:mm AM/PM", align="left", bold=True)
        kit.input(ws, r, 3, row[2] if row else None)
        kit.input(ws, r, 4, row[3] if row else None, size=9.5)
        kit.input(ws, r, 5, row[4] if row else None, size=9.5)
        kit.input(ws, r, 6, None)
    kit.preview(ws, "A1:G26")

    # ---------------------------------------------------------------- expected values ----
    if demo:
        cost = lambda e: e[4] if e[4] is not None else e[3]  # noqa: E731
        tot_cost, tot_paid = sum(cost(e) for e in exps), sum(e[5] for e in exps)
        unpaid = sorted([e for e in exps if e[6] and cost(e) - e[5] > 0.005], key=lambda e: (e[6], exps.index(e)))
        att = [g for g in guests if g[4] == "Attending"]
        venue = sum(cost(e) for e in exps if e[1] == "Venue")
        t3 = [g for g in guests if g[7] == 3]
        q = lambda k: SC[k].replace("$", "")  # noqa: E731
        expect += [
            {"cell": q("cost"), "value": tot_cost, "tol": 0.01, "why": "total cost (real price, else estimate)"},
            {"cell": q("paid"), "value": tot_paid, "tol": 0.01, "why": "total paid"},
            {"cell": q("balance"), "value": tot_cost - tot_paid, "tol": 0.01, "why": "still to pay"},
            {"cell": q("planned"), "value": DEMO["total"], "tol": 0.01, "why": "shares add up to the whole budget"},
            {"cell": "Budget!D10", "value": venue, "tol": 0.01, "why": "Venue cost"},
            {"cell": "Budget!G11", "value": round(DEMO["total"] * 0.24) - sum(cost(e) for e in exps if e[1] == "Catering & bar"), "tol": 0.01, "why": "Catering left"},
            {"cell": "Budget!K10", "text": unpaid[0][0], "why": "earliest unpaid item"},
            {"cell": "Budget!M10", "value": cost(unpaid[0]) - unpaid[0][5], "tol": 0.01, "why": "its balance"},
            {"cell": "Budget!K12", "text": unpaid[2][0], "why": "third payment in date order"},
            {"cell": q("invited"), "value": len(guests), "tol": 0, "why": "guests invited"},
            {"cell": q("attending"), "value": len(att), "tol": 0, "why": "attending"},
            {"cell": q("declined"), "value": sum(1 for g in guests if g[4] == "Declined"), "tol": 0, "why": "declined"},
            {"cell": q("seated"), "value": sum(1 for g in att if g[7]), "tol": 0, "why": "seated"},
            {"cell": "Dashboard!K17", "value": sum(1 for g in att if g[5] == "Chicken"), "tol": 0, "why": "chicken meals"},
            {"cell": "Dashboard!K22", "value": sum(1 for g in att if not g[5]), "tol": 0, "why": "attending with no meal yet"},
            {"cell": "Dashboard!K25", "value": sum(1 for g in att if g[1] == GROUPS[0]), "tol": 0, "why": "first group attending"},
            {"cell": "Seating Plan!I10", "value": len(t3), "tol": 0, "why": "guests at table 3"},
            *([{"cell": "Seating Plan!H11", "text": t3[0][0], "why": "first guest at table 3"},
               {"cell": "Seating Plan!H18", "text": t3[7][0], "why": "eighth guest at table 3"}] if len(t3) >= 8 else []),
            {"cell": q("tasks"), "value": len(TASKS), "tol": 0, "why": "tasks on the checklist"},
            {"cell": q("done"), "value": done_n, "tol": 0, "why": "tasks done"},
            {"cell": "Vendors!H10", "value": venue, "tol": 0.01, "why": "Willow Barn total"},
            {"cell": q("thanks"), "value": 9, "tol": 0, "why": "thank-yous sent"},
        ]

    order = ["Start Here", "Setup", "Dashboard", "Budget", "Expenses", "Guest List", "Seating Plan", "Checklist", "Vendors", "Day Of", "Calc"]
    wb._sheets = [wb[n] for n in order]
    name = f"{PRODUCT} ({theme.title()})" + (" - Sample Data" if demo else "")
    path = kit.save(wb, out_dir / f"{name}.xlsx", active=2 if demo else 0)
    return path, expect


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE.parents[1]))
    ap.add_argument("--themes", default=",".join(THEME_ORDER))
    a = ap.parse_args()
    out = Path(a.out)
    for theme in a.themes.split(","):
        build(out, theme, False)
        target = out if theme in SAMPLE_THEMES else out / "_build" / "theme-samples"
        path, expect = build(target, theme, True)
        (path.parent / "_build" / f"{path.stem}.expect.json").write_text(json.dumps(expect, indent=1, ensure_ascii=False))
        print("built", theme)


if __name__ == "__main__":
    main()
