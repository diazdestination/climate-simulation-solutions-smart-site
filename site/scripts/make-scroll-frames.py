#!/usr/bin/env python3
"""Turn a short clip into the frame sequence the homepage plays as the visitor scrolls.

    python scripts/make-scroll-frames.py media/system-assembly.mp4

Needs ffmpeg on PATH plus Pillow and numpy. Writes public/assets/assembly/full/NNN.webp,
public/assets/assembly/phone/NNN.webp and public/assets/assembly/poster.webp, then prints the
numbers that belong in src/content/system-assembly.js. Re-run it whenever the clip is replaced.

Why frames and not a video: a browser can only jump to a video's keyframes cheaply, so scrubbing
an ordinary clip with the scrollbar stutters, worst of all on iPhones and when scrolling back up.
Small still frames drawn to a canvas do not have that problem, and no single file comes anywhere
near Cloudflare's 25 MiB limit per asset.

What it does to the clip:
  1. Picks FRAMES frames, spaced by how much the picture changes instead of by time, so the
     scroll does not coast through a stretch where nothing moves.
  2. Levels the studio backdrop to pure white. The clip's backdrop is an uneven light grey; the
     page lays the frames over the paper-coloured section with `mix-blend-mode: multiply`, where
     pure white disappears and the equipment and its floor shadow are all that is left.
  3. Fades the left and right edges to white, because the cabinet doors swing in from outside
     the picture and would otherwise be cut off in a hard line.
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

FRAMES = 96
SIZES = {"full": (720, 68), "phone": (480, 62)}  # name: (width in px, WebP quality)
MOTION_FLOOR, MOTION_CAP = 1.0, 5.0  # mean absolute difference between neighbouring frames
EDGE_FADE = 0.045  # share of the width faded to white on each side
WHITE_GAIN = 1.035  # pushes the levelled backdrop just past white so no grey film is left


def poly_terms(x, y, degree=4):
    return np.stack([x**i * y**j for i in range(degree + 1) for j in range(degree + 1 - i)], axis=-1)


def backdrop(rgb):
    """A smooth surface fitted to the backdrop's brightness, ignoring the equipment and shadow."""
    small = np.asarray(Image.fromarray(rgb).resize((90, 160), Image.BILINEAR), dtype=np.float64)
    h, w, _ = small.shape
    yy, xx = np.mgrid[0:h, 0:w]
    terms = poly_terms(xx / (w - 1) * 2 - 1, yy / (h - 1) * 2 - 1)
    a = terms.reshape(-1, terms.shape[-1])
    lum = small.mean(axis=2).reshape(-1)
    chroma = (small.max(axis=2) - small.min(axis=2)).reshape(-1)
    bright = (lum > 188) & (chroma < 14)
    keep = bright
    coef = None
    for _ in range(5):
        coef, *_ = np.linalg.lstsq(a[keep], lum[keep], rcond=None)
        resid = lum - a @ coef
        keep = bright & (resid > -5) & (resid < 9)
    big_h, big_w, _ = rgb.shape
    yy, xx = np.mgrid[0:big_h, 0:big_w]
    return np.clip(poly_terms(xx / (big_w - 1) * 2 - 1, yy / (big_h - 1) * 2 - 1) @ coef, 150, 255)


def level(rgb):
    out = rgb.astype(np.float64) / backdrop(rgb)[..., None] * 255.0 * WHITE_GAIN
    width = rgb.shape[1]
    ramp = np.clip(np.minimum(np.arange(width), width - 1 - np.arange(width)) / (width * EDGE_FADE), 0, 1)
    ramp = (ramp * ramp * (3 - 2 * ramp))[None, :, None]
    return np.clip(out * ramp + 255.0 * (1 - ramp), 0, 255).astype(np.uint8)


def pick(frames):
    """Indexes of FRAMES frames at equal steps of accumulated motion; first and last always kept."""
    thumbs = [np.asarray(Image.open(f).convert("RGB").resize((180, 320)), dtype=np.float32) for f in frames]
    motion = [float(np.abs(b - a).mean()) for a, b in zip(thumbs, thumbs[1:])]
    travelled = np.concatenate([[0.0], np.cumsum(np.clip(motion, MOTION_FLOOR, MOTION_CAP))])
    count = min(FRAMES, len(frames))
    targets = np.linspace(0, travelled[-1], count)
    chosen = sorted({int(np.abs(travelled - t).argmin()) for t in targets} | {0, len(frames) - 1})
    return chosen


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("clip", type=Path)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "public" / "assets" / "assembly")
    args = parser.parse_args()
    if not args.clip.is_file():
        sys.exit(f"No such clip: {args.clip}")

    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(args.clip), "-vsync", "0", f"{tmp}/%04d.png"], check=True)
        frames = sorted(Path(tmp).glob("*.png"))
        chosen = pick(frames)
        if args.out.exists():
            shutil.rmtree(args.out)
        totals = {}
        height = {}
        for name in SIZES:
            (args.out / name).mkdir(parents=True)
            totals[name] = 0
        for position, index in enumerate(chosen):
            levelled = Image.fromarray(level(np.asarray(Image.open(frames[index]).convert("RGB"))))
            for name, (width, quality) in SIZES.items():
                height[name] = round(levelled.height * width / levelled.width)
                target = args.out / name / f"{position:03d}.webp"
                levelled.resize((width, height[name]), Image.LANCZOS).save(target, "WEBP", quality=quality, method=6)
                totals[name] += target.stat().st_size
            if position == len(chosen) - 1:
                levelled.save(args.out / "poster.webp", "WEBP", quality=80, method=6)

    print(f"source frames: {len(frames)}  kept: {len(chosen)}")
    for name, (width, _) in SIZES.items():
        files = sorted((args.out / name).glob("*.webp"))
        largest = max(f.stat().st_size for f in files)
        print(f"{name}: {len(files)} frames, {width}x{height[name]}, {totals[name] / 1e6:.2f} MB in all, largest {largest / 1e3:.0f} kB")
    print(f"poster: {(args.out / 'poster.webp').stat().st_size / 1e3:.0f} kB")
    print("kept source frames:", " ".join(str(i) for i in chosen))


if __name__ == "__main__":
    main()
