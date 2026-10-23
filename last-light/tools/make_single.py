"""Builds the one-file version of Last Light: every script, image and font the game
loads is inlined into a single HTML file that runs offline, from disk or anywhere.

Usage: python3 -I tools/make_single.py [game_dir] [output.html]
  game_dir    the last-light folder (default: this script's parent folder)
  output.html default: <game_dir>/last-light-single.html

What it does:
- platform.js, art/manifest.js and sprites.js become inline scripts. The game logic
  stays the FIRST inline script, so the testing harness can still extract it.
- Every image path in the art manifest becomes a data: URI. Manifest entries whose
  file isn't in the folder are dropped, so the game falls back to text for them
  exactly as it does when an image fails to load.
- The bundled fonts (fonts/*.woff2) and the page icons become data: URIs.
- The web-app manifest link is dropped (a single file can't carry one).
The folder build stays the one to ship and to package with Capacitor; this is for
sharing one file.
"""
import base64, json, os, re, sys

here = os.path.dirname(os.path.abspath(__file__))
game = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(here)
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(game, 'last-light-single.html')

MIME = {'.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.webp': 'image/webp'}
def data_uri(rel):
    path = os.path.join(game, rel)
    if not os.path.isfile(path):
        return None
    with open(path, 'rb') as f:
        b = base64.b64encode(f.read()).decode('ascii')
    return 'data:%s;base64,%s' % (MIME[os.path.splitext(rel)[1].lower()], b)

def read(rel):
    with open(os.path.join(game, rel), encoding='utf-8') as f:
        return f.read()

html = read('index.html')

# --- art manifest: inline every image, drop entries without a file
mtxt = read('art/manifest.js')
m = re.search(r'window\.LL_ART\s*=\s*(\{.*\})\s*;\s*$', mtxt, re.S)
assert m, 'art/manifest.js: expected "window.LL_ART = {...};"'
art = json.loads(m.group(1))
dropped, inlined = [], 0
cache = {}
def inline_srcs(node):
    global inlined
    if isinstance(node, dict):
        for k in list(node.keys()):
            v = node[k]
            if isinstance(v, dict) and isinstance(v.get('src'), str) and not v['src'].startswith('data:'):
                src = v['src']
                if src not in cache:
                    cache[src] = data_uri(src)
                if cache[src] is None:
                    # only sprite entries are dropped; positional records elsewhere
                    # (hub layout) keep their numbers and just lose the path
                    dropped.append(src)
                    if node is art.get('sprites'): del node[k]; continue
                    v['src'] = ''
                else:
                    v['src'] = cache[src]; inlined += 1
            inline_srcs(node.get(k))
    elif isinstance(node, list):
        for x in node:
            inline_srcs(x)
inline_srcs(art)
manifest_js = '/* Inlined by make_single.py */\nwindow.LL_ART = ' + json.dumps(art, separators=(',', ':')) + ';\n'

# --- fonts and page icons
def font_sub(mo):
    uri = data_uri(mo.group(1))
    return 'url(%s)' % uri if uri else mo.group(0)
html = re.sub(r'url\((fonts/[^)]+\.woff2)\)', font_sub, html)
def link_sub(mo):
    uri = data_uri(mo.group(2))
    return mo.group(1) + (uri or mo.group(2)) + mo.group(3)
html = re.sub(r'(<link rel="(?:icon|apple-touch-icon)"[^>]*href=")(art/[^"]+)(")', link_sub, html)
html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)

# --- external scripts become inline scripts
def script_sub(mo):
    rel = mo.group(1)
    body = manifest_js if rel == 'art/manifest.js' else read(rel)
    body = body.replace('</script', '<\\/script')
    return '<script>\n/* %s */\n%s\n</script>' % (rel, body)
html = re.sub(r'<script src="([^"]+)"></script>', script_sub, html)

# --- sanity: no relative asset paths left, and the game logic is still the first script
leftover = sorted(set(re.findall(r'["(]((?:art|fonts)/[^")]+)', html)))
first = re.findall(r'<script>(.*?)</script>', html, re.S)[0]
assert 'function render()' in first, 'the first inline script is no longer the game logic'

with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print('wrote %s (%.0f KB): %d images inlined, %d manifest entries dropped (no file)%s'
      % (out, os.path.getsize(out) / 1024, inlined, len(dropped),
         ('; paths left: ' + ', '.join(leftover)) if leftover else ''))
