#!/usr/bin/env python3
"""
Regenerates the placeholder favicon, apple icon and Open Graph card.

Placeholders until the real mark lands. Run from the ladder/ directory:

    python3 scripts/make-icons.py

The favicon tile deliberately carries fewer rungs than the OG mark: five rungs
blur into a solid block at 32px, which is the size that actually matters for a
browser tab.
"""
from PIL import Image, ImageDraw, ImageFont

INK    = (8, 9, 11)
ACCENT = (255, 106, 19)
PAPER  = (239, 235, 226)
SS     = 4  # supersample; PIL does not antialias, so draw big and downsample


def _bar(canvas, box, radius, top, bot):
    """A rounded bar filled with a vertical ramp, as an RGBA layer."""
    layer = Image.new('RGBA', canvas, (0, 0, 0, 0))
    grad = Image.new('RGB', canvas, INK)
    g = ImageDraw.Draw(grad)
    x0, y0, x1, y1 = box
    span = max(1, int(y1 - y0))
    for i in range(span):
        t = i / span
        g.rectangle([x0, y0 + i, x1, y0 + i + 1],
                    fill=tuple(int(top[k] + (bot[k] - top[k]) * t) for k in range(3)))
    mask = Image.new('L', canvas, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=255)
    layer.paste(grad, (0, 0), mask)
    return layer


def glyph(w, h, n=4, cleared=1, pad=0.12, rail=0.16, rung=0.62):
    """Ladder on transparency. Rungs stop short of the rail ends so the rails
       read as continuing past them, the way a real ladder does."""
    W, H = int(w * SS), int(h * SS)
    canvas = (W, H)
    img = Image.new('RGBA', canvas, (0, 0, 0, 0))

    px, py = W * pad, H * pad
    rail_w = (W - px * 2) * rail
    left, right = px, W - px - rail_w
    top, bottom = py, H - py

    rung_h = rail_w * rung
    end_gap = rung_h * 1.2
    y0, y1 = top + end_gap, bottom - end_gap - rung_h
    step = (y1 - y0) / (n - 1)
    inset = rail_w * 0.46

    for i in range(n):
        y = y0 + step * i
        box = [left + inset, y, right + rail_w - inset, y + rung_h]
        r = rung_h * 0.42
        if i >= n - cleared:                      # rungs already climbed
            l = Image.new('RGBA', canvas, (0, 0, 0, 0))
            ImageDraw.Draw(l).rounded_rectangle(box, radius=r, fill=ACCENT + (255,))
            img.alpha_composite(l)
        else:
            img.alpha_composite(_bar(canvas, box, r, (255, 255, 255), (158, 164, 174)))

    for x in (left, right):
        img.alpha_composite(_bar(canvas, [x, top, x + rail_w, bottom], rail_w * 0.45,
                                 (255, 255, 255), (112, 118, 128)))
    return img.resize((int(w), int(h)), Image.LANCZOS)


def on_ink(g):
    bg = Image.new('RGB', g.size, INK)
    bg.paste(g, (0, 0), g)
    return bg


def main():
    on_ink(glyph(512, 512)).save('app/icon.png')
    on_ink(glyph(180, 180, pad=0.10)).save('app/apple-icon.png')

    W, H = 1200, 630
    og = Image.new('RGB', (W, H), INK)
    d = ImageDraw.Draw(og)
    for y in range(H):                            # slight top-down lift
        v = int(7 * (1 - y / H))
        d.rectangle([0, y, W, y + 1], fill=(INK[0] + v, INK[1] + v, INK[2] + v))

    mark = glyph(250, 400, n=5, cleared=2, pad=0.02)
    og.paste(mark, (120, H // 2 - 200), mark)

    heavy = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
    plain = '/System/Library/Fonts/Supplemental/Arial.ttf'
    d.text((470, 228), 'LADDER', font=ImageFont.truetype(heavy, 108), fill=PAPER)
    d.text((474, 356), 'One whole share at a time.',
           font=ImageFont.truetype(plain, 34), fill=(185, 189, 198))
    d.text((474, 410), 'Creator fees in ETH. Treasury in NVDA.',
           font=ImageFont.truetype(plain, 27), fill=(126, 132, 143))
    d.rectangle([474, 468, 538, 472], fill=ACCENT)
    og.save('app/opengraph-image.png')

    for f in ('app/icon.png', 'app/apple-icon.png', 'app/opengraph-image.png'):
        print(f'  wrote {f}  {Image.open(f).size}')


if __name__ == '__main__':
    main()
