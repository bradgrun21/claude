#!/usr/bin/env python3
"""Recalculate a built workbook, fail on any formula error, check expected values, render pictures.

    python verify_workbook.py "out/My Template.xlsx" [--expect expect.json] [--previews out/previews] [--dpi 170]

    # photograph another state of the workbook (for the listing video): type into input cells first
    python verify_workbook.py "out/My Template.xlsx" --render-only --previews out/states/april \
           --set "Dashboard!K2=April" --set "Paychecks!K2=11"

What it checks
  1. Every formula evaluates (LibreOffice hard-recalculates a copy; any #DIV/0!, #N/A, #NAME? ... fails).
  2. Only portable functions are used (anything else is listed as a warning - see references/compatibility.md).
  3. Optional expected values: a JSON list like
        [{"cell": "Dashboard!D11", "value": 4300, "tol": 0.01}, {"cell": "Dashboard!F30", "text": "✓ Paid"}]
     Compute these independently in Python from your sample data - a clean recalc proves the
     formulas run, not that they are right.
  4. Optional pictures: one PNG per visible sheet, rendered from the print-ready twin that
     Kit.save() wrote to _build/. Look at every one of them before calling the workbook done.

Prints a JSON report. Exit code 1 if anything failed.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from openpyxl import load_workbook

ERRORS = ("#DIV/0!", "#N/A", "#NAME?", "#REF!", "#VALUE!", "#NUM!", "#NULL!", "Err:")
PORTABLE = set("""
ABS AND AVERAGE AVERAGEIF AVERAGEIFS CEILING CHOOSE COLUMN CONCATENATE COUNT COUNTA COUNTBLANK
COUNTIF COUNTIFS DATE DATEDIF DATEVALUE DAY DAYS EDATE EOMONTH EXACT FIND FLOOR HLOOKUP HOUR IF
IFERROR INDEX INT ISBLANK ISERROR ISNUMBER ISTEXT LARGE LEFT LEN LOWER MATCH MAX MID MIN MINUTE MOD
MONTH N NETWORKDAYS NOT NOW NPER OR PMT PROPER RANK REPT RIGHT ROUND ROUNDDOWN ROUNDUP ROW SEARCH
SMALL SUBSTITUTE SUM SUMIF SUMIFS SUMPRODUCT TEXT TIME TODAY TRIM UPPER VALUE VLOOKUP WEEKDAY
WEEKNUM YEAR
""".split())
FUNC = re.compile(r"(?<![A-Za-z0-9_.])([A-Z][A-Z0-9.]*)\(")


MACRO = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "module.dtd">
<script:module xmlns:script="http://openoffice.org/2000/script" script:name="Module1" script:language="StarBasic">
    Sub RecalculateAndSave()
{changes}
      ThisComponent.calculateAll()
      ThisComponent.calculateAll()
      ThisComponent.store()
      ThisComponent.close(True)
    End Sub
</script:module>"""


def macro_text(changes: dict | None) -> str:
    """The recalculation macro, optionally typing values into cells first ({"Dashboard!K2": "April"})."""
    from xml.sax.saxutils import escape
    lines = []
    for target, value in (changes or {}).items():
        sheet, addr = target.rsplit("!", 1)
        cell = f'ThisComponent.Sheets.getByName("{sheet.strip(chr(39))}").getCellRangeByName("{addr}")'
        if isinstance(value, (int, float)):
            lines.append(f"      {cell}.Value = {value}")
        else:
            text = str(value).replace('"', '""')
            lines.append(f'      {cell}.String = "{text}"')
    return MACRO.format(changes=escape("\n".join(lines)))


def soffice(args, timeout=300, profile=None):
    exe = shutil.which("soffice") or shutil.which("libreoffice")
    if not exe:
        raise SystemExit(json.dumps({"error": "LibreOffice (soffice) is not installed; cannot verify."}))
    own = profile is None
    profile = profile or tempfile.mkdtemp(prefix="lo_profile_")
    env = dict(os.environ, SAL_USE_VCLPLUGIN="svp", HOME=os.environ.get("HOME", "/tmp"))
    try:
        return subprocess.run([exe, f"-env:UserInstallation=file://{profile}", "--headless", "--norestore", *args],
                              capture_output=True, text=True, timeout=timeout, env=env)
    finally:
        if own:
            shutil.rmtree(profile, ignore_errors=True)


def recalculated_copy(path: Path, tmp: Path, changes: dict | None = None) -> Path:
    """A copy of the workbook with every formula recalculated from scratch.

    Opening the file is not enough: on load LibreOffice can evaluate a cell before the range it sums
    (seen with a 240-row simulation grid), leaving a wrong value that looks perfectly healthy. A macro
    that runs calculateAll() - a hard recalculation - gives the same numbers Excel and Sheets will.

    `changes` types values into input cells first, to photograph the workbook in another state
    (a different month picked, an extra payment typed in).
    """
    out = tmp / "recalc"
    out.mkdir()
    copy = out / path.name
    shutil.copyfile(path, copy)
    profile = tempfile.mkdtemp(prefix="lo_profile_")
    try:
        soffice(["--terminate_after_init"], timeout=120, profile=profile)
        macro_dir = Path(profile) / "user" / "basic" / "Standard"
        if not macro_dir.exists():
            raise SystemExit(json.dumps({"error": "LibreOffice did not create a usable profile; nothing was verified."}))
        (macro_dir / "Module1.xba").write_text(macro_text(changes))
        before = copy.stat().st_mtime_ns
        res = soffice(["vnd.sun.star.script:Standard.Module1.RecalculateAndSave?language=Basic&location=application",
                       str(copy)], profile=profile)
        if copy.stat().st_mtime_ns == before:
            raise SystemExit(json.dumps({"error": "LibreOffice did not recalculate the workbook",
                                         "detail": (res.stderr or "")[-500:]}))
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    return copy


def scan(path: Path, tmp: Path) -> dict:
    formulas = load_workbook(path)
    values = load_workbook(recalculated_copy(path, tmp), data_only=True)
    report = {"file": str(path), "formulas": 0, "errors": [], "non_portable": {}, "sheets": {}}
    for ws in formulas.worksheets:
        vs = values[ws.title]
        count = 0
        for row in ws.iter_rows():
            for cell in row:
                v = cell.value
                if isinstance(v, str) and v.startswith("="):
                    count += 1
                    for fn in FUNC.findall(v):
                        if fn not in PORTABLE:
                            report["non_portable"].setdefault(fn, f"{ws.title}!{cell.coordinate}")
                    got = vs[cell.coordinate].value
                    if isinstance(got, str) and got.startswith(ERRORS):
                        if len(report["errors"]) < 60:
                            report["errors"].append({"cell": f"{ws.title}!{cell.coordinate}", "error": got,
                                                     "formula": v[:160]})
                        report["error_count"] = report.get("error_count", 0) + 1
        report["sheets"][ws.title] = count
        report["formulas"] += count
    report["_values"] = values
    return report


def check_expected(values, expect_path: Path) -> list:
    failures = []
    for item in json.loads(expect_path.read_text()):
        sheet, addr = item["cell"].rsplit("!", 1)
        got = values[sheet.strip("'")][addr].value
        if "text" in item:
            ok = (got or "") == item["text"]
            want = item["text"]
        else:
            want, tol = item["value"], item.get("tol", 0.005)
            ok = isinstance(got, (int, float)) and abs(got - want) <= tol
        if not ok:
            failures.append({"cell": item["cell"], "expected": want, "got": got, "why": item.get("why", "")})
    return failures


def render(path: Path, outdir: Path, dpi: int, tmp: Path, changes: dict | None = None) -> list:
    from PIL import Image, ImageChops
    twin = path.parent / "_build" / (path.stem + ".preview.xlsx")
    meta = path.parent / "_build" / (path.stem + ".preview.json")
    if not twin.exists():
        return [{"warning": f"no preview twin at {twin}; save the workbook with Kit.save()"}]
    names = json.loads(meta.read_text())["sheets"]
    pdfdir = tmp / "pdf"
    pdfdir.mkdir()
    twin_tmp = tmp / "twin"
    twin_tmp.mkdir()
    twin = recalculated_copy(twin, twin_tmp, changes)   # pictures must show hard-recalculated numbers too
    soffice(["--convert-to", "pdf", "--outdir", str(pdfdir), str(twin)])
    pdf = pdfdir / (twin.stem + ".pdf")
    if not pdf.exists():
        return [{"warning": "LibreOffice could not render the preview PDF"}]
    subprocess.run(["pdftoppm", "-r", str(dpi), "-png", str(pdf), str(pdfdir / "p")], check=True)
    pages = sorted(pdfdir.glob("p-*.png"))
    outdir.mkdir(parents=True, exist_ok=True)
    made = []
    if len(pages) != len(names):
        made.append({"warning": f"{len(pages)} pages for {len(names)} sheets - a preview area spilled onto a second page"})
    for i, (page, name) in enumerate(zip(pages, names), start=1):
        im = Image.open(page).convert("RGB")
        box = ImageChops.difference(im, Image.new("RGB", im.size, (255, 255, 255))).getbbox()
        if box:
            im = im.crop(box)
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        target = outdir / f"{i:02d}-{slug}.png"
        im.save(target)
        made.append({"sheet": name, "png": str(target), "size": im.size})
    return made


def parse_changes(pairs) -> dict:
    changes = {}
    for pair in pairs or []:
        target, value = pair.split("=", 1)
        try:
            changes[target] = float(value) if "." in value else int(value)
        except ValueError:
            changes[target] = value
    return changes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("workbook")
    ap.add_argument("--expect")
    ap.add_argument("--previews")
    ap.add_argument("--dpi", type=int, default=170)
    ap.add_argument("--set", action="append", metavar="SHEET!CELL=VALUE",
                    help="type a value into an input cell before drawing the previews (repeatable)")
    ap.add_argument("--render-only", action="store_true", help="skip the checks; just draw the previews")
    a = ap.parse_args()
    path = Path(a.workbook).resolve()
    changes = parse_changes(a.set)
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        if a.render_only:
            report = {"file": str(path), "errors": [], "expect_failures": []}
        else:
            report = scan(path, tmp)
            values = report.pop("_values")
            report["expect_failures"] = check_expected(values, Path(a.expect)) if a.expect else []
        if a.previews:
            report["previews"] = render(path, Path(a.previews), a.dpi, tmp, changes)
    ok = not report["errors"] and not report["expect_failures"]
    report["status"] = "ok" if ok else "FAILED"
    print(json.dumps(report, indent=1, default=str, ensure_ascii=False))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
