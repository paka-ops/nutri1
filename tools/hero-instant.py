#!/usr/bin/env python3
"""
Injecte le visuel du hero directement dans le HTML (au lieu de le laisser
créer par JavaScript après le chargement) :

  - une couche <div class="n4k-photo n4k-photo--hero"> statique, avec un
    LQIP (miniature floutée encodée en base64) peint dès le premier rendu ;
  - l'image plein format en <img fetchpriority="high"> (plus de loading=lazy) ;
  - un <link rel="preload" ... fetchpriority="high"> pointant sur la BONNE
    image de hero de la page.

Idempotent : relancer le script ne duplique rien.
"""
import base64
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SHADE = ("linear-gradient(96deg,#061b13f2 0%,#061b13e6 24%,#061b1399 46%,#061b1333 68%,#03140c14 100%),"
         "linear-gradient(180deg,#061b13bf 0%,#061b131a 42%,#03140c40 100%),"
         "radial-gradient(circle at 74% 26%,#29cf701f,transparent 44%)")

# page -> (image, object-position)  — identique à CFG dans assets/nutri4k.js
HERO = {
    'index':        ('hero-index', '62% 55%'),
    'platform':     ('hero-platform', '58% 50%'),
    'intelligence': ('hero-intelligence', '60% 50%'),
    'ecosystem':    ('hero-ecosystem', '58% 50%'),
    'agribusiness': ('hero-agribusiness', '58% 55%'),
    'team':         ('hero-team', '62% 55%'),
}

HERO_OPEN = re.compile(r'<section class="(?:[^"]*\b)?(?:hero|p2f-hero|p2x-hero|v5-hero)\b[^"]*"[^>]*>')
PRELOAD = re.compile(r'<link rel="preload" as="image"[^>]*>')


def lqip(path):
    """Miniature 32px floutée -> data URI base64 (~600 caractères)."""
    out = subprocess.run(
        ['convert', path, '-resize', '32x', '-strip', '-quality', '45',
         '-interlace', 'none', 'jpg:-'],
        capture_output=True, check=True).stdout
    return 'data:image/jpeg;base64,' + base64.b64encode(out).decode()


def patch(rel):
    page = os.path.basename(rel).replace('.html', '')
    if page not in HERO:
        return 'pas de config hero'
    img, pos = HERO[page]
    prefix = '../' if rel.startswith('fr/') else ''
    src = prefix + 'assets/img/' + img + '.jpg'

    full = os.path.join(ROOT, rel)
    html = open(full, encoding='utf-8').read()

    m = HERO_OPEN.search(html)
    if not m:
        return 'aucune section hero'
    if 'n4k-photo--hero' in html:
        html = re.sub(r'<div class="n4k-photo n4k-photo--hero".*?</div>', '', html, count=1, flags=re.S)
        m = HERO_OPEN.search(html)

    data = lqip(os.path.join(ROOT, 'assets/img/' + img + '.jpg'))
    layer = (
        '<div class="n4k-photo n4k-photo--hero" aria-hidden="true" '
        'style="--n4k-pos:{pos};--n4k-po:.96;--n4k-kbd:36s;--n4k-kbb:1;--n4k-sh:{shade};'
        'background-image:url({data})">'
        '<img src="{src}" alt="" fetchpriority="high" decoding="async"></div>'
    ).format(pos=pos, shade=SHADE, data=data, src=src)

    html = html[:m.end()] + layer + html[m.end():]

    # preload : la bonne image, en priorité haute (et une seule fois)
    link = '<link rel="preload" as="image" href="{}" fetchpriority="high">'.format(src)
    html = PRELOAD.sub('', html)                       # supprime les preloads obsolètes
    html = html.replace('</head>', link + '</head>', 1)  # puis pose le bon

    open(full, 'w', encoding='utf-8').write(html)
    return 'ok -> ' + img


def main():
    pages = [f for f in sorted(os.listdir(ROOT)) if f.endswith('.html')]
    pages += ['fr/' + f for f in sorted(os.listdir(os.path.join(ROOT, 'fr'))) if f.endswith('.html')]
    for p in pages:
        print('{:26s} {}'.format(p, patch(p)))


if __name__ == '__main__':
    sys.exit(main())
