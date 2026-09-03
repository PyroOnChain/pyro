#!/usr/bin/env python3
"""
Builds the favicon, apple icon, Open Graph card and header mark from the brand
logo at brand/ladder-logo.jpg.

Run from the web/ directory:

    python3 scripts/make-icons.py

The supplied logo is a white ladder on an orange ground. The tiles keep that
ground, because it reads far better than white-on-black at 32px in a browser
tab. The site itself is black, so the header and the OG card use a version with
the ground keyed out.
"""
from PIL import Image, ImageDraw, ImageFont
import os

SRC    = '../brand/ladder-logo.jpg'
INK    = (8, 9, 11)
ACCENT = (255, 106, 19)
PAPER  = (239, 235, 226)


def load():
    if not os.path.exists(SRC):
        raise SystemExit(f'missing {SRC}')
    return Image.open(SRC).convert('RGB')


def white_mark(src):
    """Key the orange ground out. The ground sits at blue ~5-12 and the mark at
       blue ~250, so the blue channel separates them on its own."""
    blue = src.split()[2]
    LO, HI = 40, 190
    alpha = blue.point(lambda v: 0 if v <= LO else (255 if v >= HI else int((v - LO) * 255 / (HI - LO))))
    mark = Image.new('RGBA', src.size, (255, 255, 255, 0))
    mark.putalpha(alpha)
    return mark.crop(mark.getbbox())


def tile(src, size, pad=0.14):
    """Square tile on the original orange ground, cropped so the mark fills more
       of the frame than it does in the source (which carries a lot of air)."""
    mark_box = white_mark(src).getbbox()
    full = white_mark(src)
    x0, y0, x1, y1 = src.getbbox()
    m = Image.new('RGBA', src.size, (255, 255, 255, 0))
    m.putalpha(src.split()[2].point(lambda v: 0 if v <= 40 else 255))
    bb = m.getbbox()

    side = max(bb[2] - bb[0], bb[3] - bb[1])
    grow = int(side * pad)
    cx, cy = (bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2
    half = side // 2 + grow
    box = (max(0, cx - half), max(0, cy - half),
           min(src.width, cx + half), min(src.height, cy + half))
    return src.crop(box).resize((size, size), Image.LANCZOS)


def main():
    src = load()
    mark = white_mark(src)

    # The orange ground is a smooth gradient, which PNG stores badly: the plain
    # 512 tile lands around 170KB. An adaptive palette cuts that by roughly 10x
    # with no visible banding at tile sizes.
    def save_tile(size, path):
        t = tile(src, size).convert('RGB')
        t.quantize(colors=128, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(path, optimize=True)

    save_tile(512, 'app/icon.png')
    save_tile(180, 'app/apple-icon.png')

    # Transparent white mark for the header, where the page is black.
    hm = mark.copy()
    hm.thumbnail((256, 256), Image.LANCZOS)
    hm.save('public/ladder-mark.png')

    # ---- open graph card ----
    W, H = 1200, 630
    og = Image.new('RGB', (W, H), INK)
    d = ImageDraw.Draw(og)
    for y in range(H):
        v = int(7 * (1 - y / H))
        d.rectangle([0, y, W, y + 1], fill=(INK[0] + v, INK[1] + v, INK[2] + v))

    m = mark.copy()
    m.thumbnail((330, 330), Image.LANCZOS)
    og.paste(m, (135, (H - m.height) // 2), m)

    heavy = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
    plain = '/System/Library/Fonts/Supplemental/Arial.ttf'
    d.text((540, 228), 'LADDER', font=ImageFont.truetype(heavy, 108), fill=PAPER)
    d.text((544, 356), 'One whole share at a time.',
           font=ImageFont.truetype(plain, 34), fill=(185, 189, 198))
    d.text((544, 410), 'Creator fees in ETH. Treasury in NVDA.',
           font=ImageFont.truetype(plain, 27), fill=(126, 132, 143))
    d.rectangle([544, 468, 608, 472], fill=ACCENT)
    og.save('app/opengraph-image.png')

    for f in ('app/icon.png', 'app/apple-icon.png', 'app/opengraph-image.png', 'public/ladder-mark.png'):
        print(f'  wrote {f}  {Image.open(f).size}')


if __name__ == '__main__':
    main()
