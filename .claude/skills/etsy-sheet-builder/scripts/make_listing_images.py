#!/usr/bin/env python3
"""Compose Etsy listing images from the workbook previews. Pure Pillow - no browser needed.

    python make_listing_images.py spec.json

spec.json (paths are relative to the spec file):
{
  "out": "listing-images",
  "size": [2400, 1800],                      // 4:3, Etsy's preferred shape
  "brand": {"bg": "F6F3EE", "ink": "1F2A2C", "muted": "6F7B7D", "band": "1F3A3D",
            "accent": "3E9A84", "card": "FFFFFF", "chips": ["3E9A84", "4A78B0", "E07B53", "D99A2B", "9466AE"]},
  "product": "Paycheck Budget Planner",
  "slides": [
    {"layout": "hero",    "kicker": "...", "title": "...", "sub": "...", "chips": ["..."], "image": "previews/05-dashboard.png"},
    {"layout": "feature", "kicker": "...", "title": "...", "body": "...", "points": ["..."], "image": "...", "side": "right"},
    {"layout": "duo",     "kicker": "...", "title": "...", "images": ["a.png", "b.png"], "labels": ["Light", "Dark"]},
    {"layout": "list",    "kicker": "...", "title": "...", "items": [["Dashboard", "One month at a glance"], ...], "footer": "..."},
    {"layout": "steps",   "kicker": "...", "title": "...", "steps": [["Buy", "..."], ...], "footer": "..."}
  ]
}
Every slide may set "crop": [left, top, right, bottom] as fractions of the source picture.
Look at every image this writes. Text that runs into a picture or off the edge needs a shorter line.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIRS = ["/usr/share/fonts/opentype/inter", "/usr/share/fonts/truetype/inter", "/usr/share/fonts",
             "/usr/local/share/fonts", str(Path.home() / ".fonts"), "/Library/Fonts", "C:/Windows/Fonts"]
WEIGHTS = {"regular": ["Inter-Regular", "DejaVuSans", "LiberationSans-Regular", "Arial"],
           "medium": ["Inter-Medium", "Inter-Regular", "DejaVuSans", "LiberationSans-Regular", "Arial"],
           "semibold": ["Inter-SemiBold", "Inter-Bold", "DejaVuSans-Bold", "LiberationSans-Bold", "Arialbd"],
           "bold": ["Inter-ExtraBold", "Inter-Bold", "DejaVuSans-Bold", "LiberationSans-Bold", "Arialbd"]}
_found: dict = {}


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    if weight not in _found:
        hit = None
        for name in WEIGHTS[weight]:
            for d in FONT_DIRS:
                for ext in (".otf", ".ttf"):
                    for p in Path(d).rglob(name + ext) if Path(d).exists() else []:
                        hit = str(p)
                        break
                    if hit:
                        break
                if hit:
                    break
            if hit:
                break
        _found[weight] = hit
    path = _found[weight]
    return ImageFont.truetype(path, size) if path else ImageFont.load_default(size)


def rgb(hexv: str):
    return tuple(int(hexv[i:i + 2], 16) for i in (0, 2, 4))


def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        trial = (line + " " + word).strip()
        if draw.textlength(trial, font=fnt) <= width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def text_block(draw, xy, text, fnt, fill, width, leading=1.22):
    x, y = xy
    step = int(fnt.size * leading)
    for line in wrap(draw, text, fnt, width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += step
    return y


def shadowed(canvas, box, radius, fill, blur=38, offset=22, alpha=70):
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((x0, y0 + offset, x1, y1 + offset), radius, fill=(20, 30, 32, alpha))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))
    ImageDraw.Draw(canvas).rounded_rectangle(box, radius, fill=fill)


def fit(img, w, h, anchor="top"):
    """Scale to cover w x h, then crop (anchor: top or center)."""
    scale = max(w / img.width, h / img.height)
    im = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    left = (im.width - w) // 2
    top = 0 if anchor == "top" else (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def load(base: Path, slide: dict, key="image", idx=None):
    src = slide[key] if idx is None else slide[key][idx]
    im = Image.open(base / src).convert("RGB")
    crop = slide.get("crop")
    if crop and idx is None:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    return im


def window(canvas, box, shot, brand, bar=46):
    """A plain app window: rounded card, three dots, the screenshot underneath.
    The screenshot always keeps its full width; a tall one is cut at the bottom, a short one shrinks the window."""
    x0, y0, x1, y1 = box
    iw = x1 - x0 - 24
    ih = min(y1 - y0 - bar - 12, round(shot.height * iw / shot.width))
    spare = (y1 - y0 - bar - 12) - ih
    y0, y1 = y0 + spare // 2, y1 - (spare - spare // 2)
    box = (x0, y0, x1, y1)
    shadowed(canvas, box, 26, rgb(brand["card"]))
    d = ImageDraw.Draw(canvas)
    for i, c in enumerate(("E57A6A", "E8B84A", "5FB894")):
        d.ellipse((x0 + 28 + i * 34, y0 + 15, x0 + 46 + i * 34, y0 + 33), fill=rgb(c))
    inner = fit(shot, iw, ih)
    mask = Image.new("L", inner.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, inner.width, inner.height), 14, fill=255)
    canvas.paste(inner, (x0 + 12, y0 + bar), mask)


def laptop(canvas, box, shot, brand):
    """A generic laptop outline drawn with rectangles - no device branding."""
    x0, y0, x1, y1 = box
    base_h = int((y1 - y0) * 0.055)
    lid = (x0 + int((x1 - x0) * 0.06), y0, x1 - int((x1 - x0) * 0.06), y1 - base_h)
    shadowed(canvas, (lid[0], lid[1], lid[2], y1), 34, (28, 34, 36), blur=46, offset=30, alpha=90)
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle(lid, 34, fill=(28, 34, 36))
    pad = int((lid[2] - lid[0]) * 0.022)
    screen = (lid[0] + pad, lid[1] + pad, lid[2] - pad, lid[3] - pad)
    inner = fit(shot, screen[2] - screen[0], screen[3] - screen[1])
    mask = Image.new("L", inner.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, inner.width, inner.height), 12, fill=255)
    canvas.paste(inner, (screen[0], screen[1]), mask)
    d.rounded_rectangle((x0, y1 - base_h, x1, y1), base_h // 2, fill=(196, 200, 201))
    notch = int((x1 - x0) * 0.09)
    d.rounded_rectangle(((x0 + x1) // 2 - notch, y1 - base_h, (x0 + x1) // 2 + notch, y1 - base_h + base_h // 3), 8,
                        fill=(160, 166, 168))


def chip(d, xy, text, fnt, fill, ink=(255, 255, 255), pad=(30, 16)):
    w = int(d.textlength(text, font=fnt))
    x, y = xy
    h = fnt.size + pad[1] * 2
    d.rounded_rectangle((x, y, x + w + pad[0] * 2, y + h), h // 2, fill=fill)
    d.text((x + pad[0], y + pad[1] - 3), text, font=fnt, fill=ink)
    return x + w + pad[0] * 2, h


def chips_flow(d, x, y, items, fnt, colors, max_w, gap=18):
    cx, cy = x, y
    for i, t in enumerate(items):
        w = int(d.textlength(t, font=fnt)) + 60
        if cx + w > x + max_w and cx > x:
            cx, cy = x, cy + fnt.size + 32 + gap
        cx, h = chip(d, (cx, cy), t, fnt, rgb(colors[i % len(colors)]))
        cx += gap
    return cy + fnt.size + 32


def header(d, W, brand, slide, x, y, width, title_size=104):
    if slide.get("kicker"):
        d.text((x, y), slide["kicker"].upper(), font=font("semibold", 34), fill=rgb(brand["accent"]))
        y += 62
    y = text_block(d, (x, y), slide["title"], font("bold", title_size), rgb(brand["ink"]), width, leading=1.08)
    return y + 18


def footer_mark(d, W, H, brand, product):
    d.text((110, H - 96), product, font=font("semibold", 30), fill=rgb(brand["muted"]))
    t = "Google Sheets  +  Excel"
    f = font("semibold", 30)
    d.text((W - 110 - d.textlength(t, font=f), H - 96), t, font=f, fill=rgb(brand["muted"]))


def render(spec_path: Path):
    spec = json.loads(spec_path.read_text())
    base = spec_path.parent
    out = base / spec.get("out", "listing-images")
    out.mkdir(parents=True, exist_ok=True)
    W, H = spec.get("size", [2400, 1800])
    brand = spec["brand"]
    made = []
    for n, s in enumerate(spec["slides"], start=1):
        im = Image.new("RGBA", (W, H), rgb(brand["bg"]) + (255,))
        d = ImageDraw.Draw(im)
        lay = s["layout"]
        if lay == "hero":
            d.rectangle((0, 0, W, 26), fill=rgb(brand["band"]))
            tw = int(W * 0.40)
            y = header(d, W, brand, s, 110, 190, tw, title_size=s.get("title_size", 128))
            if s.get("sub"):
                y = text_block(d, (110, y + 10), s["sub"], font("regular", 48), rgb(brand["muted"]), tw, 1.3) + 46
            if s.get("chips"):
                chips_flow(d, 110, y, s["chips"], font("semibold", 36), brand["chips"], tw)
            laptop(im, (int(W * 0.445), 300, W - 60, H - 400), load(base, s), brand)
            d = ImageDraw.Draw(im)
            if s.get("badge"):
                f = font("bold", 40)
                bw = int(d.textlength(s["badge"], font=f)) + 90
                d.rounded_rectangle((W - 110 - bw, 110, W - 110, 200), 45, fill=rgb(brand["band"]))
                d.text((W - 110 - bw + 45, 130), s["badge"], font=f, fill=(255, 255, 255))
            footer_mark(d, W, H, brand, spec["product"])
        elif lay == "feature":
            right = s.get("side", "right") == "right"
            tw = int(W * 0.33)
            tx = 110 if right else W - 110 - tw
            y = header(d, W, brand, s, tx, 210, tw, title_size=s.get("title_size", 92))
            if s.get("body"):
                y = text_block(d, (tx, y + 14), s["body"], font("regular", 44), rgb(brand["muted"]), tw, 1.34) + 40
            for i, p in enumerate(s.get("points", [])):
                c = rgb(brand["chips"][i % len(brand["chips"])])
                d.ellipse((tx, y + 14, tx + 26, y + 40), fill=c)
                y = text_block(d, (tx + 52, y), p, font("medium", 42), rgb(brand["ink"]), tw - 52, 1.3) + 22
            box = (int(W * 0.42), 150, W - 100, H - 190) if right else (100, 150, int(W * 0.58), H - 190)
            window(im, box, load(base, s), brand)
            d = ImageDraw.Draw(im)
            footer_mark(d, W, H, brand, spec["product"])
        elif lay == "duo":
            y = header(d, W, brand, s, 110, 130, W - 220, title_size=s.get("title_size", 92))
            gap, top = 70, y + 40
            bw = (W - 220 - gap) // 2
            for i in range(2):
                x0 = 110 + i * (bw + gap)
                window(im, (x0, top, x0 + bw, H - 240), load(base, s, "images", i), brand)
                d = ImageDraw.Draw(im)
                if s.get("labels"):
                    f = font("semibold", 40)
                    lab = s["labels"][i]
                    d.text((x0 + (bw - d.textlength(lab, font=f)) / 2, H - 215), lab, font=f, fill=rgb(brand["ink"]))
            footer_mark(d, W, H, brand, spec["product"])
        elif lay == "list":
            y = header(d, W, brand, s, 110, 130, W - 220, title_size=s.get("title_size", 92)) + 30
            items = s["items"]
            cols = 2
            rows = (len(items) + 1) // cols
            cw = (W - 220 - 60) // cols
            rh = min(215, (H - y - 250) // rows)
            for i, (name, desc) in enumerate(items):
                cx = 110 + (i // rows) * (cw + 60)
                cy = y + (i % rows) * rh
                shadowed(im, (cx, cy, cx + cw, cy + rh - 22), 22, rgb(brand["card"]), blur=18, offset=8, alpha=34)
                d = ImageDraw.Draw(im)
                c = rgb(brand["chips"][i % len(brand["chips"])])
                d.rounded_rectangle((cx, cy, cx + 16, cy + rh - 22), 8, fill=c)
                d.text((cx + 56, cy + (rh - 22) / 2 - 62), name, font=font("bold", 52), fill=rgb(brand["ink"]))
                d.text((cx + 56, cy + (rh - 22) / 2 + 10), desc, font=font("regular", 38), fill=rgb(brand["muted"]))
            if s.get("footer"):
                f = font("semibold", 38)
                d.text(((W - d.textlength(s["footer"], font=f)) / 2, H - 190), s["footer"], font=f, fill=rgb(brand["accent"]))
            footer_mark(d, W, H, brand, spec["product"])
        elif lay == "steps":
            y = header(d, W, brand, s, 110, 150, W - 220, title_size=s.get("title_size", 92)) + 60
            steps = s["steps"]
            gap = 56
            cw = (W - 220 - gap * (len(steps) - 1)) // len(steps)
            ch = H - y - 300
            for i, (head, text) in enumerate(steps):
                cx = 110 + i * (cw + gap)
                shadowed(im, (cx, y, cx + cw, y + ch), 30, rgb(brand["card"]), blur=26, offset=14, alpha=44)
                d = ImageDraw.Draw(im)
                c = rgb(brand["chips"][i % len(brand["chips"])])
                d.ellipse((cx + 56, y + 60, cx + 196, y + 200), fill=c)
                num = str(i + 1)
                f = font("bold", 84)
                d.text((cx + 126 - d.textlength(num, font=f) / 2, y + 78), num, font=f, fill=(255, 255, 255))
                yy = text_block(d, (cx + 56, y + 260), head, font("bold", 56), rgb(brand["ink"]), cw - 112, 1.15)
                text_block(d, (cx + 56, yy + 24), text, font("regular", 40), rgb(brand["muted"]), cw - 112, 1.36)
            if s.get("footer"):
                f = font("semibold", 38)
                d.text(((W - d.textlength(s["footer"], font=f)) / 2, H - 200), s["footer"], font=f, fill=rgb(brand["accent"]))
            footer_mark(d, W, H, brand, spec["product"])
        else:
            raise SystemExit(f"unknown layout: {lay}")
        target = out / f"{n:02d}-{lay}.jpg"
        im.convert("RGB").save(target, quality=92)
        made.append(str(target))
    print(json.dumps({"images": made}, indent=1))


if __name__ == "__main__":
    render(Path(sys.argv[1]).resolve())
