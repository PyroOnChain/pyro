#!/usr/bin/env python3
"""
Builds Totem's brand assets from brand/totem-logo.jpg.

Run from the clubs/ directory:

    python3 scripts/make-brand.py

The logo is a pixel-art scene: a 3D "T" over a sunset sky and water. The full
scene is beautiful at size and mush at 26px, so the header mark and the icons
crop tight to the glyph and keep only enough sky to sit on. The Open Graph card
uses the whole scene, where there is room for it.

Everything is resampled with NEAREST, never LANCZOS. This is pixel art: smooth
interpolation turns crisp blocks into grey soup, which is the one thing that
would make it look cheap.
"""
from PIL import Image, ImageDraw, ImageFont
import os

SRC = '../brand/totem-logo.jpg'

# Sampled from the logo itself so the site and the mark cannot drift apart.
INK    = (52, 31, 30)       # the T's outline
CREAM  = (254, 234, 199)    # the T's lit face
SKY_HI = (162, 147, 212)    # sky, top
SKY_MID= (216, 158, 196)    # sky, middle
SUN    = (251, 254, 201)    # the sun
WATER  = (112, 103, 146)

# The glyph sits here in the source, measured rather than guessed.
GLYPH = (0.26, 0.18, 0.74, 0.71)

HEAVY = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
PLAIN = '/System/Library/Fonts/Supplemental/Arial.ttf'


def load():
    if not os.path.exists(SRC):
        raise SystemExit(f'missing {SRC}')
    return Image.open(SRC).convert('RGB')


def glyph_tile(src, size, pad=0.10):
    """Square crop centred on the T, with a little sky around it."""
    w, h = src.size
    x0, y0, x1, y1 = (GLYPH[0]*w, GLYPH[1]*h, GLYPH[2]*w, GLYPH[3]*h)
    cx, cy = (x0+x1)/2, (y0+y1)/2
    side = max(x1-x0, y1-y0) * (1 + pad*2)
    half = side/2
    box = (max(0, cx-half), max(0, cy-half), min(w, cx+half), min(h, cy+half))
    # NEAREST on the way down keeps the pixel grid hard.
    return src.crop(box).resize((size, size), Image.NEAREST)


def main():
    src = load()

    glyph_tile(src, 256).save('public/totem-mark.png')
    src.resize((512, 512), Image.NEAREST).save('public/totem-logo.png')
    glyph_tile(src, 512).save('app/icon.png')
    glyph_tile(src, 180).save('app/apple-icon.png')

    # ---- open graph card: the whole scene, with room for type ----
    W, H = 1200, 630
    card = Image.new('RGB', (W, H), SKY_MID)

    # Scene panel on the right. Narrower than the card is tall, so the headline
    # has room to finish before it; a centre crop keeps the T in frame.
    SCENE_W = 520
    scene = src.resize((H, H), Image.NEAREST)
    left = (H - SCENE_W) // 2
    card.paste(scene.crop((left, 0, left + SCENE_W, H)), (W - SCENE_W, 0))

    # Flat sky wash on the left so type has a clean ground.
    d = ImageDraw.Draw(card)
    for y in range(H):
        t = y / H
        col = tuple(int(SKY_HI[i] + (SKY_MID[i]-SKY_HI[i]) * t) for i in range(3))
        d.rectangle([0, y, W - SCENE_W, y+1], fill=col)

    mark = glyph_tile(src, 132)
    card.paste(mark, (74, 108))

    d.text((228, 142), 'TOTEM', font=ImageFont.truetype(HEAVY, 70), fill=INK)
    d.text((78, 296), 'Your meme buys',
           font=ImageFont.truetype(HEAVY, 48), fill=INK)
    d.text((78, 348), 'your stock.',
           font=ImageFont.truetype(HEAVY, 48), fill=INK)
    d.text((80, 424), 'One mascot coin per club, priced in the',
           font=ImageFont.truetype(PLAIN, 24), fill=INK)
    d.text((80, 456), 'stock itself. Every trade sends the fee',
           font=ImageFont.truetype(PLAIN, 24), fill=INK)
    d.text((80, 488), 'back to the vault as more stock.',
           font=ImageFont.truetype(PLAIN, 24), fill=INK)
    d.rectangle([80, 540, 152, 548], fill=INK)

    card.save('app/opengraph-image.png')

    for f in ('public/totem-mark.png', 'public/totem-logo.png',
              'app/icon.png', 'app/apple-icon.png', 'app/opengraph-image.png'):
        print(f'  wrote {f}  {Image.open(f).size}  {os.path.getsize(f)//1024}KB')


if __name__ == '__main__':
    main()
