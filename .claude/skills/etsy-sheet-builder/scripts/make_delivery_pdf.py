#!/usr/bin/env python3
"""Build the PDF a buyer downloads from Etsy: thank-you, the "make a copy" links, quick start, terms.

Etsy delivers files, not links, so a Google Sheets product is delivered as this PDF.

    python make_delivery_pdf.py delivery.json

delivery.json:
{
  "out": "Paycheck Budget Planner - START HERE.pdf",
  "product": "Paycheck Budget Planner",
  "tagline": "Thank you for your purchase.",
  "accent": "1F3A3D",
  "links": [{"label": "Light version", "url": "https://docs.google.com/spreadsheets/d/FILE_ID/copy"}, ...],
  "excel_note": "Prefer Excel? The .xlsx files are included in your download.",
  "steps": ["Click a button above while signed in to Google.", "..."],
  "tips": ["Yellow cells are yours to type in.", "..."],
  "terms": "For personal use by one household. Please do not share, resell or redistribute.",
  "support": "Questions? Message the shop on Etsy and we will help."
}
A link whose url does not start with http is printed as a red placeholder so it cannot ship by accident.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas


def build(spec_path: Path):
    spec = json.loads(spec_path.read_text())
    out = spec_path.parent / spec["out"]
    W, H = letter
    accent = HexColor("#" + spec.get("accent", "1F3A3D"))
    ink, muted, paper = HexColor("#1F2A2C"), HexColor("#6F7B7D"), HexColor("#F6F3EE")
    c = canvas.Canvas(str(out), pagesize=letter)
    c.setTitle(spec["product"] + " - Start Here")
    c.setFillColor(paper)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(accent)
    c.rect(0, H - 150, W, 150, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(54, H - 82, spec["product"])
    c.setFont("Helvetica", 13)
    c.drawString(54, H - 108, spec.get("tagline", "Thank you for your purchase."))

    y = H - 196
    missing = []

    def heading(text):
        nonlocal y
        c.setFillColor(accent)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(54, y, text.upper())
        y -= 20

    def para(text, size=11, color=ink, indent=0, gap=6):
        nonlocal y
        c.setFillColor(color)
        c.setFont("Helvetica", size)
        for line in simpleSplit(text, "Helvetica", size, W - 108 - indent):
            c.drawString(54 + indent, y, line)
            y -= size + 4
        y -= gap

    heading("1. Get your copy")
    links = spec["links"]
    cols = 2 if len(links) > 4 else 1                 # many colour themes: two columns of smaller buttons
    gap = 12
    bw = (W - 108 - gap * (cols - 1)) / cols
    bh, step = (30, 40) if cols == 2 else (38, 50)
    for n, link in enumerate(links):
        ok = str(link["url"]).startswith("http")
        if not ok:
            missing.append(link["label"])
        x = 54 + (n % cols) * (bw + gap)
        c.setFillColor(accent if ok else HexColor("#D0503F"))
        c.roundRect(x, y - bh + 8, bw, bh, 7, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 11 if cols == 2 else 13)
        label = (f"Copy:  {link['label']}" if cols == 2 else f"Make a copy:  {link['label']}") if ok else f"LINK MISSING - {link['label']}"
        c.drawString(x + 14, y - bh / 2 + 4, label)
        if ok:
            c.linkURL(link["url"], (x, y - bh + 8, x + bw, y + 8), relative=0)
        if n % cols == cols - 1 or n == len(links) - 1:
            y -= step
    if spec.get("excel_note"):
        para(spec["excel_note"], size=10, color=muted)
    y -= 6
    heading("2. Quick start")
    for i, step in enumerate(spec.get("steps", []), start=1):
        c.setFillColor(accent)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(54, y, f"{i}.")
        para(step, indent=20)
    if spec.get("tips"):
        y -= 4
        heading("Good to know")
        for tip in spec["tips"]:
            c.setFillColor(muted)
            c.drawString(54, y, "•")
            para(tip, size=10, indent=14, gap=3)
    y = max(y - 10, 120)
    c.setStrokeColor(HexColor("#E7E1D8"))
    c.line(54, 104, W - 54, 104)
    y = 86
    para(spec.get("terms", ""), size=9, color=muted, gap=2)
    para(spec.get("support", ""), size=9, color=muted, gap=2)
    c.save()
    print(json.dumps({"pdf": str(out), "links_missing": missing}))


if __name__ == "__main__":
    build(Path(sys.argv[1]).resolve())
