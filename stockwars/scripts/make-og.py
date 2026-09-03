#!/usr/bin/env python3
"""
Rebuilds the Open Graph card for Brawlz.

Run from the stockwars/ directory:

    python3 scripts/make-og.py

Colours track the site palette: side A green, side B white, the purse in acid
green, everything on black. The two corner glows sit left and right so the card
reads as a matchup before anyone gets to the words.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BG    = (0, 0, 0)
A     = (43, 232, 107)     # side A
B     = (255, 255, 255)    # side B
PRIZE = (198, 255, 77)     # the purse
BODY  = (201, 201, 211)
DIM   = (139, 139, 151)
LINE  = (42, 42, 51)

W, H = 1200, 630
HEAVY = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
PLAIN = '/System/Library/Fonts/Supplemental/Arial.ttf'
MONO  = '/System/Library/Fonts/Menlo.ttc'


def corner_glow(size, colour, alpha):
    """A soft radial wash. The ellipse is inset well inside its tile so the blur
       has room to fall to zero; drawn edge to edge it leaves a visible seam
       where the tile ends."""
    g = Image.new('L', (size, size), 0)
    inset = size * 0.22
    ImageDraw.Draw(g).ellipse([inset, inset, size - inset, size - inset], fill=alpha)
    g = g.filter(ImageFilter.GaussianBlur(size // 6))
    tint = Image.new('RGB', (size, size), colour)
    return tint, g


def main():
    card = Image.new('RGB', (W, H), BG)

    for colour, cx in ((A, 0), (B, W)):
        size = 1250
        tint, mask = corner_glow(size, colour, 58)
        card.paste(tint, (cx - size // 2, (H - size) // 2), mask)

    d = ImageDraw.Draw(card)

    # faint grid, so the black is not a flat slab
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=(14, 14, 18))
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(14, 14, 18))

    mark = Image.open('public/brawlz-mark.png').convert('RGBA')
    mark.thumbnail((78, 78), Image.LANCZOS)
    card.paste(mark, (72, 112), mark)

    # wordmark, with the same single green letter the site uses
    f_word = ImageFont.truetype(HEAVY, 46)
    x = 170
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
    d.text((74, 418), 'Two memecoins, one hour, same stock. The higher peak takes the',
           font=f_sub, fill=BODY)
    d.text((74, 458), 'creator fees from both.', font=f_sub, fill=BODY)

    f_chip = ImageFont.truetype(MONO, 20)
    cx = 74
    for label in ('NO SNIPE WINS', 'TIME-WEIGHTED', 'ROBINHOOD CHAIN'):
        tw = int(d.textlength(label, font=f_chip))
        d.rounded_rectangle([cx, 522, cx + tw + 44, 570], radius=24, outline=LINE, width=2)
        d.text((cx + 22, 536), label, font=f_chip, fill=DIM)
        cx += tw + 60

    card.save('app/opengraph-image.png')
    print(f'  wrote app/opengraph-image.png  {card.size}')


if __name__ == '__main__':
    main()
