#!/usr/bin/env python3
"""Finish a lifted portrait (RGBA from cutout-portrait.swift) for a white page.

Chest-up crop: the figure ends above the point where the source frame cuts the
arms, then dissolves into transparency along a single horizontal fade, so no
side edge is ever visible. Global corrections only — no retouching of the face
or body: slightly cooler white balance (the source has a strong sunset cast),
a touch of brightness/contrast, 2x Lanczos resample with mild sharpening.
Requires Pillow (dev only).

Usage: python3 scripts/finish-portrait.py <cutout.png> <output.webp> [crop_bottom fade_from]
  crop_bottom, fade_from: source-pixel rows (defaults 480 and 290 for the 500x750 photo).
"""
import sys
from PIL import Image, ImageChops, ImageEnhance, ImageFilter

source, target = sys.argv[1], sys.argv[2]
crop_bottom = int(sys.argv[3]) if len(sys.argv) > 3 else 480
fade_from = int(sys.argv[4]) if len(sys.argv) > 4 else 290

image = Image.open(source).convert('RGBA').crop((0, 0, 500, crop_bottom))
rgb, alpha = image.convert('RGB'), image.getchannel('A')

r, g, b = rgb.split()
rgb = Image.merge('RGB', (r.point(lambda v: v * .975), g, b.point(lambda v: min(255, v * 1.02))))
rgb = ImageEnhance.Brightness(rgb).enhance(1.03)
rgb = ImageEnhance.Contrast(rgb).enhance(1.04)
rgb = ImageEnhance.Color(rgb).enhance(.95)

scale = 2
size = (image.width * scale, image.height * scale)
rgb = rgb.resize(size, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=45, threshold=2))
alpha = alpha.resize(size, Image.LANCZOS)

# One horizontal smoothstep fade: opaque above fade_from, fully transparent at the crop line.
w, h = size
start = fade_from * scale
column = []
for y in range(h):
    v = 1.0 if y < start else max(0.0, 1 - (y - start) / (h - start))
    column.append(int(255 * v * v * (3 - 2 * v)))
fade = Image.new('L', (1, h))
fade.putdata(column)
alpha = ImageChops.multiply(alpha, fade.resize(size))

out = rgb.convert('RGBA')
out.putalpha(alpha)
out = out.crop(out.getbbox())
out.save(target, 'WEBP', quality=88, alpha_quality=90, method=6)
print(target, out.size)
