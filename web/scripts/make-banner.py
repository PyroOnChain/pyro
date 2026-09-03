#!/usr/bin/env python3
"""
Builds the X / Twitter header banner.

Run from the stockwars/ directory:

    python3 scripts/make-banner.py

Output is 1500x500, the size X renders a header at. It lands in brand/
rather than public/: it is a social asset, not something the site serves.

Two constraints drive the layout. The profile picture overlaps the lower-left
corner, so nothing important goes below y=330 on the left. And X crops the sides
on narrow viewports, so the lockup sits inboard rather than hard against the
edge. The generated plate is cropped so its bright collision seam lands right of
centre, which keeps the left half dark enough for type to sit on cleanly.
"""
from PIL import Image, ImageDraw, ImageFont
import os

PLATE = '../../private-plate.png'          # overridden below; see main()
LOGO  = '../brand/brawlz-logo.jpg'

W, H  = 1500, 500
A     = (18, 254, 126)
B     = (255, 255, 255)
PRIZE = (198, 255, 77)
BODY  = (196, 200, 208)
DIM   = (132, 136, 146)
LINE  = (54, 56, 64)

HEAVY = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
PLAIN = '/System/Library/Fonts/Supplemental/Arial.ttf'
MONO  = '/System/Library/Fonts/Menlo.ttc'


def keyed_mark(path):
    """Green mark on near-black: the green channel separates them on its own."""
    src = Image.open(path).convert('RGB')
    green = src.split()[1]
    LO, HI = 45, 200
    alpha = green.point(lambda v: 0 if v <= LO else (255 if v >= HI else int((v - LO) * 255 / (HI - LO))))
    m = src.copy().convert('RGBA')
    m.putalpha(alpha)
    return m.crop(m.getbbox())


def plate(path, seam_at=0.68, zoom=0.70):
    """Crop the generated art to 3:1 with the bright seam at `seam_at` across the
       banner rather than dead centre, so the headline never runs through it.

       The source is 21:9, which is taller than 3:1, so the window is bounded by
       height, not width: taking the full width would leave the seam stuck in the
       middle. Cropping to a narrower window is what buys the freedom to slide
       it."""
    im = Image.open(path).convert('RGB')
    cw = int(im.width * zoom)
    ch = int(cw * H / W)
    if ch > im.height:                      # never ask for more height than exists
        ch = im.height
        cw = int(ch * W / H)

    seam_src = im.width * 0.5               # the collision sits centre-frame
    left = int(seam_src - cw * seam_at)
    left = max(0, min(im.width - cw, left))
    top = max(0, (im.height - ch) // 2)
    return im.crop((left, top, left + cw, top + ch)).resize((W, H), Image.LANCZOS)


# X crops roughly 10% off each side on narrow viewports, so nothing readable
# starts before this. Measured against the crop, not guessed.
LEFT = 186


def main():
    src = os.environ.get('PLATE', 'scripts/banner-plate.png')
    card = plate(src)
    d = ImageDraw.Draw(card, 'RGBA')

    # Darken the left third so type always has a ground, whatever the art does.
    for x in range(0, 1000):
        a = int(155 * max(0.0, 1 - x / 1000) ** 1.4)
        d.line([(x, 0), (x, H)], fill=(0, 0, 0, a))

    mark = keyed_mark(LOGO)
    mark.thumbnail((92, 92), Image.LANCZOS)
    card.paste(mark, (LEFT, 150), mark)

    f_word = ImageFont.truetype(HEAVY, 62)
    x = LEFT + 116
    for ch, col in (('BR', B), ('A', A), ('WLZ', B)):
        d.text((x, 163), ch, font=f_word, fill=col)
        x += int(d.textlength(ch, font=f_word))

    f_line = ImageFont.truetype(HEAVY, 37)
    x = LEFT + 2
    for ch, col in (('TWO COINS ENTER. ', B), ('ONE GETS PAID.', PRIZE)):
        d.text((x, 272), ch, font=f_line, fill=col)
        x += int(d.textlength(ch, font=f_line))

    f_chip = ImageFont.truetype(MONO, 19)
    cx = LEFT + 4
    for label in ('ONE HOUR', 'PEAK WINS', 'ROBINHOOD CHAIN'):
        tw = int(d.textlength(label, font=f_chip))
        d.rounded_rectangle([cx, 336, cx + tw + 40, 380], radius=22, outline=LINE, width=2)
        d.text((cx + 20, 350), label, font=f_chip, fill=DIM)
        cx += tw + 56

    card.save('../brand/brawlz-banner.png')
    out = '../brand/brawlz-banner.png'
    print(f'  wrote {out}  {card.size}  {os.path.getsize(out)//1024}KB')


if __name__ == '__main__':
    main()
