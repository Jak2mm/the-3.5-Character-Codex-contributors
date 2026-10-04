"""Bundle src/ + data/srd.json into one self-contained HTML file.

Usage:
    python tools/build.py              # writes index.html (standalone page, for GitHub Pages or opening locally)
    python tools/build.py --fragment   # writes dist/fragment.html (page body only, for hosts that add their own <html>/<head>)
"""
import os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
JS_ORDER = ['core.js', 'bonuses.js', 'ref.js', 'store.js', 'ui-sheet.js', 'ui-other.js', 'ui-rules.js', 'ui-bonus.js', 'ui-custom.js', 'events.js']

def read(*p):
    with open(os.path.join(ROOT, *p), encoding='utf-8') as f:
        return f.read()

def build(fragment=False):
    data = read('data', 'srd.json').replace('</', '<\\/')  # keep the JSON from closing its <script> tag
    js = '\n'.join(read('src', 'js', f) for f in JS_ORDER)
    inner = (read('src', 'head.html') + read('src', 'body.html') +
             '<script type="application/json" id="srd-data">' + data + '</script>\n'
             '<script>\n"use strict";\n' + js + '\n</script>\n')
    if fragment:
        os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
        out = os.path.join(ROOT, 'dist', 'fragment.html'); html = inner
    else:
        head, body = read('src', 'head.html'), read('src', 'body.html')
        html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
                '<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n'
                + head + '\n</head>\n<body>\n' + body +
                '<script type="application/json" id="srd-data">' + data + '</script>\n'
                '<script>\n"use strict";\n' + js + '\n</script>\n</body>\n</html>\n')
        out = os.path.join(ROOT, 'index.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'wrote {os.path.relpath(out, ROOT)} ({len(html) / 1e6:.2f} MB)')

if __name__ == '__main__':
    build(fragment='--fragment' in sys.argv)
