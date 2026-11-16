#!/usr/bin/env python3
"""Check Etsy listing copy against the hard limits and write a paste-ready LISTING.md.

    python check_listing.py listing.json

listing.json: {"title": "...", "tags": ["...", x13], "price": "...", "category": "...",
               "description": "...", "notes": ["..."]}
Limits checked: title <= 140 characters, exactly 13 tags, each tag <= 20 characters, no duplicate tags.
"""
import json
import sys
from pathlib import Path

spec_path = Path(sys.argv[1]).resolve()
s = json.loads(spec_path.read_text())
problems = []
if len(s["title"]) > 140:
    problems.append(f"title is {len(s['title'])} characters (max 140)")
tags = s["tags"]
if len(tags) != 13:
    problems.append(f"{len(tags)} tags (Etsy gives you 13 - use them all)")
for t in tags:
    if len(t) > 20:
        problems.append(f"tag too long ({len(t)}): {t}")
if len({t.lower() for t in tags}) != len(tags):
    problems.append("duplicate tags")
md = [f"# Etsy listing - {s.get('product', '')}".rstrip(" -"), "", "## Title", "", s["title"], "",
      f"({len(s['title'])} of 140 characters)", "", "## Tags", "", ", ".join(tags), ""]
for key, head in (("price", "Price"), ("category", "Category and attributes")):
    if s.get(key):
        md += [f"## {head}", "", s[key], ""]
md += ["## Description", "", s["description"], ""]
if s.get("notes"):
    md += ["## Before you publish", ""] + [f"- {n}" for n in s["notes"]] + [""]
(spec_path.parent / s.get("out", "LISTING.md")).write_text("\n".join(md))
print(json.dumps({"problems": problems, "title_length": len(s["title"]), "tags": len(tags)}, indent=1))
sys.exit(1 if problems else 0)
