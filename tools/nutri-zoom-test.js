/* Test léger (jsdom) de la lightbox partagée assets/nutri-zoom.js
   Les scripts/styles externes sont inlinérisés pour que le test tourne
   hors-ligne et sans charger les images.

   Pré-requis : npm i jsdom   (ici /tmp/node_modules)
   Usage      : node tools/nutri-zoom-test.js
*/
const fs = require('fs');
const path = require('path');
const JSDOM_MOD = require('/tmp/node_modules/jsdom');
const { JSDOM, VirtualConsole } = JSDOM_MOD;

const ROOT = path.resolve(__dirname, '..');
const PAGES = [
  'index.html', 'agribusiness.html', 'ecosystem.html', 'platform.html', 'team.html', 'intelligence.html',
  'fr/index.html', 'fr/agribusiness.html', 'fr/ecosystem.html', 'fr/platform.html', 'fr/team.html', 'fr/intelligence.html'
];
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function inline(file) {
  const dir = path.dirname(file);
  let html = fs.readFileSync(file, 'utf8');
  // styles externes -> <style>
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
    const p = path.join(dir, href);
    if (!fs.existsSync(p)) return '';
    return '<style>' + fs.readFileSync(p, 'utf8') + '</style>';
  });
  // scripts externes -> <script>  (defer conservé via exécution en fin)
  html = html.replace(/<script src="([^"]+)" defer><\/script>/g, (m, href) => {
    const p = path.join(dir, href);
    if (!fs.existsSync(p)) return '';
    return '<script>' + fs.readFileSync(p, 'utf8') + '</script>';
  });
  return html;
}

(async () => {
  let fail = 0;
  for (const p of PAGES) {
    const file = path.join(ROOT, p);
    const vc = new VirtualConsole();
    const errs = [];
    vc.on('jsdomError', e => errs.push('jsdomError: ' + (e.message || e)));
    vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));

    let dom;
    try {
      dom = new JSDOM(inline(file), {
        runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
        url: 'https://example.test/' + p,
        // jsdom ne fournit pas IntersectionObserver : on le simule pour les scripts de page
        beforeParse(win) {
          win.IntersectionObserver = class {
            constructor(cb) { this.cb = cb; }
            observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
            unobserve() { } disconnect() { }
          };
        }
      });
    } catch (e) {
      console.log('FAIL', p, 'construction:', e.message); fail++; continue;
    }
    const w = dom.window, d = w.document;
    await wait(700);

    const cards = d.querySelectorAll('[data-nzoom]');
    const btns = d.querySelectorAll('.nzoom-btn');
    const oldModal = d.getElementById('moat-modal');

    let opened = null;
    if (cards.length) {
      const first = cards[0];
      const expectedHost = first.querySelector('.nzoom-btn') ? first.querySelector('.nzoom-btn').parentElement : null;
      first.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
      await wait(150);
      var modal = d.getElementById('nzoom-modal');
      const img = modal ? modal.querySelector('.nzoom-img') : null;
      opened = {
        active: !!modal && modal.classList.contains('active'),
        src: (img.getAttribute('src') || '').split('/').pop(),
        title: modal.querySelector('.nzoom-title').textContent.slice(0, 34),
        badge: modal.querySelector('.nzoom-badge').textContent.slice(0, 18),
        host: expectedHost ? (expectedHost.className || expectedHost.tagName).toString().slice(0, 22) : '-'
      };
      if (modal) modal.querySelector('.nzoom-close').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      await wait(80);
      opened.closed = !!modal && !modal.classList.contains('active');
      opened.bodyOverflow = d.body.style.overflow === '';
    }

    const badHost = [...btns].filter(b => !b.parentElement || b.parentElement.tagName === 'IMG').length;

    if (process.argv.indexOf('--detail') !== -1) {
      [...cards].forEach((c, i) => {
        const b = c.querySelector('.nzoom-btn');
        const h = b ? b.parentElement : null;
        const t = (c.getAttribute('data-title') || (c.querySelector('h3') || {}).textContent || '').replace(/\s+/g, ' ').trim();
        const im = c.querySelector('img[src]');
        console.log('     ' + String(i + 1).padStart(2) + '. ' + t.slice(0, 46).padEnd(48) +
          '| carte ' + ((c.className || '').split(' ')[0] || '?').padEnd(14) +
          '| loupe dans ' + (h ? ((h.className || h.tagName) + '').split(' ')[0] : '-').padEnd(16) +
          '| image ' + (im ? (im.getAttribute('srcset') || im.getAttribute('src')).split(' ')[0].split('/').pop() : '(fond nutri4k)'));
      });
    }

    var modal = d.getElementById('nzoom-modal');
    const ok = cards.length > 0 && btns.length > 0 && !!modal && !oldModal &&
      opened && opened.active && opened.closed && badHost === 0 && errs.length === 0;
    if (!ok) fail++;

    console.log(
      (ok ? 'PASS' : 'FAIL'), p.padEnd(24),
      'cards=' + String(cards.length).padEnd(3),
      'btns=' + String(btns.length).padEnd(3),
      'modal=' + (modal ? 'y' : 'n'),
      'old=' + (oldModal ? 'y' : 'n'),
      opened ? `[${opened.badge}] ${opened.title} <- ${opened.src} (host: ${opened.host}) open/close=${opened.active}/${opened.closed}` : 'open=n/a'
    );
    if (errs.length) console.log('     errors:', errs.slice(0, 3).join(' || '));
    w.close();
  }
  console.log(fail ? `\n${fail} page(s) en échec` : '\nToutes les pages OK');
  process.exit(fail ? 1 : 0);
})();
