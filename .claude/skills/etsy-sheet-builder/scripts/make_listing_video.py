#!/usr/bin/env python3
"""Make a short silent listing video (MP4) from real pictures of the workbook. Pillow + ffmpeg.

    python make_listing_video.py video.json

The video shows the workbook *changing*: the same tab photographed with a different month picked, a
different paycheck, a different colour theme. Photograph each state first:

    python verify_workbook.py "<sample workbook>.xlsx" --render-only --previews _build/video/april \\
           --set "Dashboard!K2=April"

video.json (paths are relative to the spec file):
{
  "out": "../listing-video.mp4",
  "size": [1440, 1080], "fps": 30,
  "product": "Paycheck Budget Planner",
  "brand": {"bg": "F6F3EE", "ink": "1F2A2C", "muted": "6F7B7D", "band": "1F3A3D", "accent": "2F8A75", "card": "FFFFFF"},
  "scenes": [
    {"type": "title",  "kicker": "Google Sheets + Excel", "title": "Paycheck Budget Planner", "sub": "...", "seconds": 1.4},
    {"type": "states", "kicker": "Monthly dashboard", "caption": "Pick a month. Everything updates.",
     "images": ["video/a/05-dashboard.png", "video/b/05-dashboard.png"], "seconds_each": 1.3,
     "crop": [0, 0, 1, 0.46],                    // part of each picture to show (fractions)
     "spotlight": [0.795, 0.004, 0.885, 0.040]}, // outline the cell that changed (fractions of the full picture)
    {"type": "pan",    "kicker": "...", "caption": "...", "image": "x.png", "from": [0, 0, 1, 0.5], "to": [0, 0.4, 1, 0.9], "seconds": 3},
    {"type": "end",    "title": "Instant download", "sub": "Google Sheets + Excel"}
  ]
}
Etsy listing videos are short and play without sound; this script warns outside 5-15 seconds. Check the
limits in the listing form. Pull a few frames (ffmpeg -ss 3 -i out.mp4 -frames:v 1 f.png) and look at them.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_listing_images import font, rgb, shadowed, wrap  # noqa: E402


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


class Maker:
    def __init__(self, spec_path: Path):
        self.spec = json.loads(spec_path.read_text())
        self.base = spec_path.parent
        self.W, self.H = self.spec.get("size", [1440, 1080])
        self.fps = self.spec.get("fps", 30)
        self.brand = self.spec["brand"]
        self.k = self.W / 1440            # scale every measurement from a 1440-wide design

    def px(self, n: float) -> int:
        return round(n * self.k)

    # ---------------------------------------------------------------- pieces
    def canvas(self) -> Image.Image:
        im = Image.new("RGBA", (self.W, self.H), rgb(self.brand["bg"]) + (255,))
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, self.W, self.px(14)), fill=rgb(self.brand["band"]))
        f = font("semibold", self.px(22))
        d.text((self.px(70), self.H - self.px(52)), self.spec.get("product", ""), font=f, fill=rgb(self.brand["muted"]))
        t = self.spec.get("footer", "Google Sheets  +  Excel")
        d.text((self.W - self.px(70) - d.textlength(t, font=f), self.H - self.px(52)), t, font=f, fill=rgb(self.brand["muted"]))
        return im

    def header(self, im, scene) -> int:
        """Kicker and caption at the top. Returns the y where the picture may start."""
        d = ImageDraw.Draw(im)
        y = self.px(54)
        if scene.get("kicker"):
            d.text((self.px(70), y), scene["kicker"].upper(), font=font("semibold", self.px(26)), fill=rgb(self.brand["accent"]))
            y += self.px(44)
        f = font("bold", self.px(scene.get("caption_size", 58)))
        for line in wrap(d, scene["caption"], f, self.W - self.px(140)):
            d.text((self.px(70), y), line, font=f, fill=rgb(self.brand["ink"]))
            y += int(f.size * 1.12)
        return y + self.px(26)

    def load(self, src: str, crop=None) -> Image.Image:
        im = Image.open(self.base / src).convert("RGB")
        if crop:
            w, h = im.size
            im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
        return im

    def window(self, im, top: int, aspect: float):
        """Draw the app window and return the box (x, y, w, h) the picture goes in."""
        pad, bar = self.px(10), self.px(36)
        max_w, max_h = self.W - self.px(140), self.H - top - self.px(86)
        iw = max_w - 2 * pad
        ih = round(iw / aspect)
        if ih > max_h - bar - pad:
            ih = max_h - bar - pad
            iw = round(ih * aspect)
        w, h = iw + 2 * pad, ih + bar + pad
        x0 = (self.W - w) // 2
        y0 = top + (max_h - h) // 2
        shadowed(im, (x0, y0, x0 + w, y0 + h), self.px(20), rgb(self.brand["card"]), blur=self.px(30), offset=self.px(16), alpha=70)
        d = ImageDraw.Draw(im)
        for i, c in enumerate(("E57A6A", "E8B84A", "5FB894")):
            d.ellipse((x0 + self.px(20) + i * self.px(26), y0 + self.px(11), x0 + self.px(34) + i * self.px(26), y0 + self.px(25)), fill=rgb(c))
        return x0 + pad, y0 + bar, iw, ih

    # ---------------------------------------------------------------- scenes
    def title(self, scene, end=False):
        n = round(scene.get("seconds", 1.5) * self.fps)
        base = Image.new("RGB", (self.W, self.H), rgb(self.brand["band"]))
        full = base.copy()
        d = ImageDraw.Draw(full)
        y = self.H // 2 - self.px(150)
        if scene.get("kicker"):
            f = font("semibold", self.px(30))
            d.text(((self.W - d.textlength(scene["kicker"].upper(), font=f)) / 2, y), scene["kicker"].upper(), font=f, fill=rgb(self.brand.get("band_sub", "B9CFC9")))
            y += self.px(62)
        f = font("bold", self.px(scene.get("title_size", 96)))
        for line in wrap(d, scene["title"], f, self.W - self.px(200)):
            d.text(((self.W - d.textlength(line, font=f)) / 2, y), line, font=f, fill=(255, 255, 255))
            y += int(f.size * 1.1)
        if scene.get("sub"):
            f = font("regular", self.px(38))
            y += self.px(18)
            for line in wrap(d, scene["sub"], f, self.W - self.px(260)):
                d.text(((self.W - d.textlength(line, font=f)) / 2, y), line, font=f, fill=rgb(self.brand.get("band_sub", "B9CFC9")))
                y += int(f.size * 1.3)
        for i in range(n):
            yield Image.blend(base, full, ease(i / max(1, self.fps * 0.35))) if not end else full

    def states(self, scene):
        imgs = [self.load(src, scene.get("crop")) for src in scene["images"]]
        bg = self.canvas()
        top = self.header(bg, scene)
        x, y, w, h = self.window(bg, top, imgs[0].width / imgs[0].height)
        fitted = [im.resize((w, h), Image.LANCZOS) for im in imgs]
        spot = None
        if scene.get("spotlight"):
            sx0, sy0, sx1, sy1 = scene["spotlight"]
            cx0, cy0, cx1, cy1 = scene.get("crop") or (0, 0, 1, 1)
            spot = [x + (sx0 - cx0) / (cx1 - cx0) * w, y + (sy0 - cy0) / (cy1 - cy0) * h,
                    x + (sx1 - cx0) / (cx1 - cx0) * w, y + (sy1 - cy0) / (cy1 - cy0) * h]
        hold = round(scene.get("seconds_each", 1.3) * self.fps)
        fade = round(scene.get("fade", 0.3) * self.fps)
        bg = bg.convert("RGB")
        for s, cur in enumerate(fitted):
            for i in range(hold):
                inner = cur if (s == 0 or i >= fade) else Image.blend(fitted[s - 1], cur, ease((i + 1) / fade))
                frame = bg.copy()
                frame.paste(inner, (x, y))
                if spot:                              # a ring around the cell that just changed
                    strength = 1 - ease(max(0, i - self.fps * 0.25) / (self.fps * 0.7))
                    if strength > 0.02:
                        over = Image.new("RGBA", frame.size, (0, 0, 0, 0))
                        grow = self.px(6) + self.px(10) * (1 - strength)
                        ImageDraw.Draw(over).rounded_rectangle((spot[0] - grow, spot[1] - grow, spot[2] + grow, spot[3] + grow),
                                                               self.px(12), outline=rgb(self.brand["accent"]) + (int(255 * strength),),
                                                               width=self.px(6))
                        frame = Image.alpha_composite(frame.convert("RGBA"), over).convert("RGB")
                yield frame

    def pan(self, scene):
        src = self.load(scene["image"])
        a, b = scene["from"], scene["to"]
        bg = self.canvas()
        top = self.header(bg, scene)
        aspect = ((a[2] - a[0]) * src.width) / ((a[3] - a[1]) * src.height)
        x, y, w, h = self.window(bg, top, aspect)
        bg = bg.convert("RGB")
        n = round(scene.get("seconds", 3) * self.fps)
        for i in range(n):
            t = ease(i / max(1, n - 1))
            box = [a[j] + (b[j] - a[j]) * t for j in range(4)]
            crop = src.crop((int(box[0] * src.width), int(box[1] * src.height), int(box[2] * src.width), int(box[3] * src.height)))
            frame = bg.copy()
            frame.paste(crop.resize((w, h), Image.BILINEAR), (x, y))
            yield frame

    def frames(self):
        makers = {"title": self.title, "states": self.states, "pan": self.pan, "end": lambda s: self.title(s, end=True)}
        cross = round(0.25 * self.fps)
        last = None
        for scene in self.spec["scenes"]:
            for i, frame in enumerate(makers[scene["type"]](scene)):
                if last is not None and i < cross:        # soften the cut between scenes
                    frame = Image.blend(last, frame, ease((i + 1) / (cross + 1)))
                elif i == cross:
                    last = None
                yield frame
                held = frame
            last = held

    def run(self):
        if not shutil.which("ffmpeg"):
            raise SystemExit(json.dumps({"error": "ffmpeg is not installed; cannot encode the video."}))
        out = (self.base / self.spec["out"]).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{self.W}x{self.H}",
               "-r", str(self.fps), "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
               "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        count = 0
        for frame in self.frames():
            proc.stdin.write(frame.convert("RGB").tobytes())
            count += 1
        proc.stdin.close()
        if proc.wait() != 0:
            raise SystemExit(json.dumps({"error": "ffmpeg failed to encode the video"}))
        seconds = count / self.fps
        report = {"video": str(out), "seconds": round(seconds, 1), "frames": count, "size": [self.W, self.H],
                  "megabytes": round(out.stat().st_size / 1e6, 2), "audio": "none"}
        if not 5 <= seconds <= 15:
            report["warning"] = "Etsy listing videos are expected to run 5 to 15 seconds - adjust the scene lengths"
        print(json.dumps(report, indent=1))


if __name__ == "__main__":
    Maker(Path(sys.argv[1]).resolve()).run()
