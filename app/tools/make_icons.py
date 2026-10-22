"""Draw the app icons (web app, Windows and Android) with Pillow.

Usage: python tools/make_icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INK, PAPER, GOLD = (27, 29, 34), (246, 244, 238), (214, 173, 90)
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
COND = '/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf'

def draw(size, safe=1.0, bg=True, radius=0.18):
    """safe < 1 keeps the artwork inside the centre (Android adaptive / maskable icons)."""
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if bg:
        if radius: d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius), fill=INK)
        else: d.rectangle([0, 0, size, size], fill=INK)
    s = size * safe; o = (size - s) / 2
    # a d20-style hexagon outline in gold
    import math
    cx, cy, r = size / 2, o + s * 0.42, s * 0.36
    pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(-90, 270, 60)]
    d.polygon(pts, outline=GOLD, width=max(2, int(s * 0.035)))
    tri = [pts[0], pts[2], pts[4]]
    d.polygon(tri, outline=GOLD, width=max(1, int(s * 0.02)))
    f = ImageFont.truetype(BOLD, int(s * 0.27))
    t = '3.5'; bb = d.textbbox((0, 0), t, font=f)
    d.text((cx - (bb[2] - bb[0]) / 2 - bb[0], cy - (bb[3] - bb[1]) / 2 - bb[1] + s * 0.03), t, font=f, fill=PAPER, stroke_width=max(1, int(s * 0.02)), stroke_fill=INK)
    f2 = ImageFont.truetype(COND, int(s * 0.105))
    t2 = 'CODEX'; bb = d.textbbox((0, 0), t2, font=f2)
    d.text((cx - (bb[2] - bb[0]) / 2 - bb[0], o + s * 0.885 - (bb[3] - bb[1]) / 2 - bb[1]), t2, font=f2, fill=GOLD)
    return im

def save(im, *parts):
    p = os.path.join(ROOT, *parts); os.makedirs(os.path.dirname(p), exist_ok=True); im.save(p); print('wrote', os.path.relpath(p, ROOT))

# web app (PWA)
save(draw(192), 'icons', 'icon-192.png')
save(draw(512), 'icons', 'icon-512.png')
save(draw(512, safe=0.72, radius=0), 'icons', 'icon-maskable-512.png')
save(draw(180, radius=0), 'icons', 'apple-touch-icon.png')
save(draw(64), 'icons', 'favicon-64.png')
# Windows (Tauri)
T = ('native', 'tauri', 'src-tauri', 'icons')
for n, sz in [('32x32.png', 32), ('128x128.png', 128), ('128x128@2x.png', 256), ('icon.png', 512)]: save(draw(sz), *T, n)
ico = draw(256); p = os.path.join(ROOT, *T, 'icon.ico'); ico.save(p, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]); print('wrote', os.path.relpath(p, ROOT))
# Android (Capacitor assets: generated into launcher icons and splash screens at build time)
A = ('native', 'android', 'assets')
save(draw(1024, radius=0), *A, 'icon-only.png')
save(draw(1024, safe=0.62, bg=False), *A, 'icon-foreground.png')
save(Image.new('RGBA', (1024, 1024), INK + (255,)), *A, 'icon-background.png')
sp = Image.new('RGBA', (2732, 2732), INK + (255,)); sp.alpha_composite(draw(900, bg=False), (916, 916))
save(sp, *A, 'splash.png'); save(sp, *A, 'splash-dark.png')
