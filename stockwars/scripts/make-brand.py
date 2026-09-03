#!/usr/bin/env python3
"""
Builds every brand asset from brand/brawlz-logo.jpg.

Run from the stockwars/ directory:

    python3 scripts/make-brand.py

Produces the header mark, the favicon and apple icon, and the Open Graph card.
The supplied logo is a green mark on near-black. The header sits on the site's
own black, so it needs the ground keyed out; the tiles keep a solid ground so
they have something to sit on in a browser tab.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

SRC   = '../brand/brawlz-logo.jpg'
BG    = (0, 0, 0)
A     = (18, 254, 126)     # side A, taken from the logo itself
B     = (255, 255, 255)    # side B
PRIZE = (198, 255, 77)     # the purse
BODY  = (201, 201, 211)
DIM   = (139, 139, 151)
LINE  = (42, 42, 51)

HEAVY = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
PLAIN = '/System/Library/Fonts/Supplemental/Arial.ttf'
MONO  = '/System/Library/Fonts/Menlo.ttc'


def load():
    if not os.path.exists(SRC):
        raise SystemExit(f'missing {SRC}')
    return Image.open(SRC).convert('RGB')


def keyed_mark(src):
    """Key the near-black ground out. The ground sits at green ~13 and the mark
       at ~254, so the green channel separates them on its own. The hole in the
       middle of the mark is ground too, and correctly comes out transparent."""
    green = src.split()[1]
    LO, HI = 45, 200
    alpha = green.point(lambda v: 0 if v <= LO else (255 if v >= HI else int((v - LO) * 255 / (HI - LO))))
    mark = src.copy().convert('RGBA')
    mark.putalpha(alpha)
    return mark.crop(mark.getbbox())


def tile(src, size, pad=0.13):
    """Square tile on solid black, cropped tighter than the source so the mark
       fills the frame at the sizes a tab actually renders."""
    m = keyed_mark(src)
    side = max(m.width, m.height)
    canvas = int(side * (1 + pad * 2))
    out = Image.new('RGB', (canvas, canvas), BG)
    out.paste(m, ((canvas - m.width) // 2, (canvas - m.height) // 2), m)
    return out.resize((size, size), Image.LANCZOS)


def corner_glow(size, colour, alpha):
    g = Image.new('L', (size, size), 0)
    inset = size * 0.22
    ImageDraw.Draw(g).ellipse([inset, inset, size - inset, size - inset], fill=alpha)
    g = g.filter(ImageFilter.GaussianBlur(size // 6))
    return Image.new('RGB', (size, size), colour), g


def main():
    src = load()
    mark = keyed_mark(src)

    hm = mark.copy()
    hm.thumbnail((256, 256), Image.LANCZOS)
    hm.save('public/brawlz-mark.png')

    # A flat two-colour mark quantizes to almost nothing.
    for size, path in ((512, 'app/icon.png'), (180, 'app/apple-icon.png')):
        tile(src, size).quantize(colors=64, method=Image.MEDIANCUT).save(path, optimize=True)

    W, H = 1200, 630
    card = Image.new('RGB', (W, H), BG)
    for colour, cx in ((A, 0), (B, W)):
        s = 1250
        tint, msk = corner_glow(s, colour, 58)
        card.paste(tint, (cx - s // 2, (H - s) // 2), msk)

    d = ImageDraw.Draw(card)
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=(14, 14, 18))
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(14, 14, 18))

    m = mark.copy()
    m.thumbnail((84, 84), Image.LANCZOS)
    card.paste(m, (72, 108), m)

    f_word = ImageFont.truetype(HEAVY, 46)
    x = 176
    for ch, col in (('BR', B), ('A', A), ('WLZ', B)):
        d.text((x, 118), ch, font=f_word, fill=col)
        x += int(d.textlength(ch, font=f_word))

    f_head = ImageFont.truetype(HEAVY, 92)
    d.text((72, 205), 'TWO COINS ENTER.', font=f_head, fill=B)
    x = 72
    for ch, col in (('ONE GETS ', B), ('PAID.', PRIZE)):
        d.text((x, 292), ch, font=f_head, fill=col)
        x += int(d.textlength(ch, font=f_head))

    f_sub = ImageFont.truetype(PLAIN, 30)
    d.text((74, 418), 'Two memecoins, one hour, same stock. The higher peak takes the', font=f_sub, fill=BODY)
    d.text((74, 458), 'creator fees from both.', font=f_sub, fill=BODY)

    f_chip = ImageFont.truetype(MONO, 20)
    cx = 74
    for label in ('NO SNIPE WINS', 'TIME-WEIGHTED', 'ROBINHOOD CHAIN'):
        tw = int(d.textlength(label, font=f_chip))
        d.rounded_rectangle([cx, 522, cx + tw + 44, 570], radius=24, outline=LINE, width=2)
        d.text((cx + 22, 536), label, font=f_chip, fill=DIM)
        cx += tw + 60

    card.save('app/opengraph-image.png')

    for f in ('public/brawlz-mark.png', 'app/icon.png', 'app/apple-icon.png', 'app/opengraph-image.png'):
        print(f'  wrote {f}  {Image.open(f).size}  {os.path.getsize(f)//1024}KB')


if __name__ == '__main__':
    main()
