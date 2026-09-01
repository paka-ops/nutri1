/* Hero instantané — outil de développement (jamais chargé par le site).
   Écrit la couche photo du hero directement dans le HTML de chaque page :
     - un LQIP (miniature floutée en base64) peint dès le premier rendu ;
     - l'image plein format en <img fetchpriority="high"> (plus de loading=lazy) ;
     - un <link rel="preload" ... fetchpriority="high"> vers la BONNE image.
   À relancer uniquement si une image de hero change :  node tools/hero-instant.js
   Dépendance : ImageMagick (commande `convert`). Idempotent. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SHADE =
  'linear-gradient(96deg,#061b13f2 0%,#061b13e6 24%,#061b1399 46%,#061b1333 68%,#03140c14 100%),' +
  'linear-gradient(180deg,#061b13bf 0%,#061b131a 42%,#03140c40 100%),' +
  'radial-gradient(circle at 74% 26%,#29cf701f,transparent 44%)';

/* page -> [image, object-position] — identique à CFG dans assets/nutri4k.js */
const HERO = {
  index: ['hero-index', '62% 55%'],
  platform: ['hero-platform', '58% 50%'],
  intelligence: ['hero-intelligence', '60% 50%'],
  ecosystem: ['hero-ecosystem', '58% 50%'],
  agribusiness: ['hero-agribusiness', '58% 55%'],
  team: ['hero-team', '62% 55%']
};

const HERO_OPEN = /<section class="(?:[^"]*\b)?(?:hero|p2f-hero|p2x-hero|v5-hero)\b[^"]*"[^>]*>/;
const PRELOAD = /<link rel="preload" as="image"[^>]*>/g;
const LAYER = /<div class="n4k-photo n4k-photo--hero"[\s\S]*?<\/div>/;

/* miniature 32 px -> data URI base64 (~470 octets, aucune requête réseau) */
function lqip(file) {
  const buf = execFileSync('convert',
    [file, '-resize', '32x', '-strip', '-quality', '45', '-interlace', 'none', 'jpg:-'],
    { maxBuffer: 1 << 22 });
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

function patch(rel) {
  const page = path.basename(rel, '.html');
  if (!HERO[page]) return 'pas de config hero';
  const [img, pos] = HERO[page];
  const src = (rel.startsWith('fr/') ? '../' : '') + 'assets/img/' + img + '.jpg';
  const full = path.join(ROOT, rel);

  let html = fs.readFileSync(full, 'utf8');
  if (!HERO_OPEN.test(html)) return 'aucune section hero';
  html = html.replace(LAYER, '');            /* idempotence : on repart propre */

  const layer =
    '<div class="n4k-photo n4k-photo--hero" aria-hidden="true" ' +
    `style="--n4k-pos:${pos};--n4k-po:.96;--n4k-kbd:36s;--n4k-kbb:1;--n4k-sh:${SHADE};` +
    `background-image:url(${lqip(path.join(ROOT, 'assets/img/' + img + '.jpg'))})">` +
    `<img src="${src}" alt="" fetchpriority="high" decoding="async"></div>`;

  const m = html.match(HERO_OPEN);
  const at = m.index + m[0].length;
  html = html.slice(0, at) + layer + html.slice(at);

  /* preload : on efface les anciens, puis on pose le bon en priorité haute */
  html = html.replace(PRELOAD, '');
  html = html.replace('</head>',
    `<link rel="preload" as="image" href="${src}" fetchpriority="high"></head>`);

  fs.writeFileSync(full, html);
  return 'ok -> ' + img;
}

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort()
  .concat(fs.readdirSync(path.join(ROOT, 'fr')).filter(f => f.endsWith('.html')).sort().map(f => 'fr/' + f));

for (const p of pages) console.log(p.padEnd(26), patch(p));
