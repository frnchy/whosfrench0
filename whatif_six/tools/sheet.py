#!/usr/bin/env python3
"""Tile rendered stills into a contact sheet:  sheet.py out.png t00.00.png t02.00.png ..."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
out, files = sys.argv[1], sys.argv[2:]
w, h = 324, 576
cols = min(6, len(files))
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (30, 30, 30))
f = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf', 22)
for i, fn in enumerate(files):
    im = Image.open(fn).convert('RGB').resize((w, h))
    d = ImageDraw.Draw(im)
    lab = os.path.basename(fn)[1:-4] + 's'
    d.rectangle([0, h - 30, 110, h], fill=(0, 0, 0))
    d.text((6, h - 28), lab, font=f, fill=(255, 230, 80))
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out)
