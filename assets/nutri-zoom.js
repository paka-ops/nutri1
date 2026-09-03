/* =============================================================
   nutri-zoom.js — lightbox « zoom » universelle pour toutes les cartes
   -------------------------------------------------------------
   Reprend exactement le comportement de la section
   « Six assets build the moat » (intelligence.html / fr/intelligence.html)
   et l'applique automatiquement à toutes les cartes du site :

       .moat-item  .modern-card  .expert-card  .card  .box
       .loopbox    .person       .v5-person    .p2f-card
       .p2f-panel  .p2f-chain-card  .p2x-card  .p2x-chain-card
       .v5-float   .ctaBox

   • un bouton loupe est injecté sur le visuel de chaque carte,
   • la carte entière devient cliquable (sauf si c'est un lien),
   • la lightbox affiche la meilleure résolution disponible
     (dernier candidat du srcset, ex. les variantes « -4k »),
   • zoom / dézoom (boutons, molette, double-clic) + déplacement au drag,
   • fermeture : × / fond / ÉCHAP.

   Ne fait rien si le mode « Fond des cartes » (nutri4k, Maj+B) est actif.
   ============================================================= */
(function () {
    'use strict';

    /* ---------------------------------------------------------
       1. Langue (FR / EN)
       --------------------------------------------------------- */
    var FR = (function () {
        var a = document.querySelector('.langswitch a.active');
        if (a && /fr/i.test(a.textContent || '')) return true;
        return /(^|\/)fr(\/|$)/.test(location.pathname);
    })();

    var T = FR ? {
        zoom: 'Agrandir l’image',
        openNew: 'Ouvrir l’image dans un nouvel onglet',
        close: 'Fermer l’aperçu',
        hint: 'ÉCHAP ou cliquer le fond pour fermer',
        in: 'Zoomer',
        out: 'Dézoomer',
        reset: 'Réinitialiser le zoom',
        cat: 'Catégorie'
    } : {
        zoom: 'Enlarge image',
        openNew: 'Open image in a new tab',
        close: 'Close inspection',
        hint: 'ESC or click backdrop to close',
        in: 'Zoom in',
        out: 'Zoom out',
        reset: 'Reset zoom',
        cat: 'Category'
    };

    var ICON_ZOOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
        '<line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>';

    /* ---------------------------------------------------------
       2. Sélecteurs
       --------------------------------------------------------- */
    var CARD_SEL = [
        '.moat-item', '.modern-card', '.expert-card', '.card', '.box',
        '.loopbox', '.person', '.v5-person', '.p2f-card', '.p2f-panel',
        '.p2f-chain-card', '.p2x-card', '.p2x-chain-card', '.v5-float', '.ctaBox'
    ].join(',');

    /* conteneurs de visuel connus (le bouton y est injecté) */
    var MEDIA_SEL = [
        '.moat-item-media', '.card-media', '.expert-media', '.stMedia', '.govMedia',
        '.coldMedia', '.lpMedia', '.photo', '.v5-photo', '.cardMedia', '.media'
    ].join(',');

    var SKIP_SEL = '.nav, footer, #n4k-cb-pop, #n4k-cb-panel, #n4k-cb-toggle, #n4k-cb-fab, #n4k-cb-exp';

    /* ---------------------------------------------------------
       3. Utilitaires
       --------------------------------------------------------- */
    function txt(el) {
        return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
    }

    function urlOf(v) {
        if (!v || v === 'none') return null;
        var m, re = /url\((['"]?)(.*?)\1\)/g, last = null;
        while ((m = re.exec(v))) { if (!/^data:/i.test(m[2])) last = m[2]; }
        return last;
    }

    /* meilleure source disponible : dernier candidat du srcset (= 4K) */
    function bestSrc(img) {
        if (!img) return null;
        var ss = img.getAttribute('srcset');
        if (ss) {
            var parts = ss.split(','), best = null, bestW = -1;
            for (var i = 0; i < parts.length; i++) {
                var bits = parts[i].trim().split(/\s+/);
                if (!bits[0]) continue;
                var w = 0;
                if (bits[1]) {
                    if (/w$/i.test(bits[1])) w = parseFloat(bits[1]);
                    else if (/x$/i.test(bits[1])) w = parseFloat(bits[1]) * 1000;
                }
                if (w > bestW) { bestW = w; best = bits[0]; }
            }
            if (best) return best;
        }
        return img.currentSrc || img.getAttribute('src') || null;
    }

    /* image « de contenu » de la carte (ignore les calques de fond nutri4k) */
    function pickImage(card) {
        var imgs = card.querySelectorAll('img');
        for (var i = 0; i < imgs.length; i++) {
            var im = imgs[i];
            if (im.closest('.n4k-cb') || im.closest('.n4k-thumb')) continue;
            var src = im.getAttribute('src');
            if (!src || /^data:/i.test(src)) continue;
            if (im.complete && im.naturalWidth && im.naturalWidth < 24) continue; // logos / icônes
            return im;
        }
        return null;
    }

    /* fond de carte posé par l'éditeur nutri4k ou par data-card-bg */
    function cardBg(card) {
        var l = card.querySelector('.n4k-cb .n4k-cb-img') || card.querySelector(':scope > .n4k-cb');
        var u = l ? urlOf(getComputedStyle(l).backgroundImage) : null;
        if (u) return u;
        return urlOf(getComputedStyle(card).backgroundImage);
    }

    function source(card) {
        var img = pickImage(card);
        if (img) return { type: 'img', src: bestSrc(img), fallback: img.currentSrc || img.getAttribute('src'), alt: img.getAttribute('alt') || '' };
        var bg = cardBg(card);
        if (bg) return { type: 'bg', src: bg, fallback: null, alt: '' };
        return null;
    }

    /* métadonnées affichées dans la lightbox */
    function meta(card) {
        var m = {};
        m.title = card.getAttribute('data-title') || txt(card.querySelector('h3')) || txt(card.querySelector('h2')) ||
            txt(card.querySelector('.card-title')) || txt(card.querySelector('.moat-item-title')) || '';
        m.badge = card.getAttribute('data-badge') || txt(card.querySelector('.moat-item-badge')) ||
            txt(card.querySelector('.moat-item-badge2')) || txt(card.querySelector('.card-tag')) ||
            txt(card.querySelector('.chip')) || txt(card.querySelector('.kicker')) || '';
        m.desc = card.getAttribute('data-desc') || txt(card.querySelector('.moat-item-desc')) ||
            txt(card.querySelector('.card-content p')) || txt(card.querySelector('p')) || '';
        m.cat = card.getAttribute('data-cat') || txt(card.querySelector('.moat-item-cat')) || '';
        if (!m.title) {
            var img = pickImage(card);
            m.title = img ? (img.getAttribute('alt') || '') : '';
        }
        if (m.badge && m.badge.length > 28) m.badge = m.badge.slice(0, 28);
        return m;
    }

    /* position déjà utilisable comme repère pour un enfant absolute ? */
    function isPositioned(el) {
        var p = (getComputedStyle(el).position || 'static').toLowerCase();
        return p === 'absolute' || p === 'relative' || p === 'fixed' || p === 'sticky';
    }

    /* peut-on rendre cet élément position:relative sans casser la mise en page ? */
    function safeRelative(el) {
        if (isPositioned(el)) return true;
        var kids = el.querySelectorAll('*');
        for (var i = 0; i < kids.length; i++) {
            if (kids[i].hasAttribute('data-nzoom-host')) continue;
            var p = getComputedStyle(kids[i]).position;
            if (p === 'absolute' || p === 'fixed') return false;
        }
        return true;
    }

    function hostFor(card, img) {
        var host = card;
        if (img && img.parentElement) {
            var m = img.parentElement.closest(MEDIA_SEL);
            host = (m && card.contains(m) && m !== card) ? m : img.parentElement;
        }
        return host;
    }

    /* ---------------------------------------------------------
       4. Lightbox (une seule, créée à la volée)
       --------------------------------------------------------- */
    var modal, imgEl, titleEl, badgeEl, descEl, catEl, wrapEl, openEl, levelEl, closeEl;
    var cur = null, level = 1, fitW = 0, fitH = 0, lastFocus = null;
    var drag = null;

    function buildModal() {
        modal = document.createElement('div');
        modal.className = 'nzoom-modal';
        modal.id = 'nzoom-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML =
            '<div class="nzoom-card">' +
            '  <div class="nzoom-bar">' +
            '    <div class="nzoom-bar-left">' +
            '      <span class="nzoom-badge"></span>' +
            '      <span class="nzoom-title"></span>' +
            '    </div>' +
            '    <div class="nzoom-bar-right">' +
            '      <a class="nzoom-open" target="_blank" rel="noopener" title="' + T.openNew + '" aria-label="' + T.openNew + '">&#8599;</a>' +
            '      <button type="button" class="nzoom-close" aria-label="' + T.close + '" title="' + T.close + '">&times;</button>' +
            '    </div>' +
            '  </div>' +
            '  <div class="nzoom-imgwrap"><img class="nzoom-img" alt=""></div>' +
            '  <div class="nzoom-footer">' +
            '    <p class="nzoom-desc"></p>' +
            '    <div class="nzoom-tools">' +
            '      <button type="button" class="nzoom-tool" data-act="out" title="' + T.out + '" aria-label="' + T.out + '">&minus;</button>' +
            '      <span class="nzoom-level">100%</span>' +
            '      <button type="button" class="nzoom-tool" data-act="in" title="' + T.in + '" aria-label="' + T.in + '">+</button>' +
            '      <button type="button" class="nzoom-tool" data-act="reset" title="' + T.reset + '" aria-label="' + T.reset + '">&#8634;</button>' +
            '      <span class="nzoom-hint">' + T.hint + '</span>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        document.body.appendChild(modal);

        imgEl = modal.querySelector('.nzoom-img');
        titleEl = modal.querySelector('.nzoom-title');
        badgeEl = modal.querySelector('.nzoom-badge');
        descEl = modal.querySelector('.nzoom-desc');
        wrapEl = modal.querySelector('.nzoom-imgwrap');
        openEl = modal.querySelector('.nzoom-open');
        levelEl = modal.querySelector('.nzoom-level');
        closeEl = modal.querySelector('.nzoom-close');

        catEl = document.createElement('span');
        catEl.className = 'nzoom-cat';
        modal.querySelector('.nzoom-bar-left').appendChild(catEl);

        closeEl.addEventListener('click', function (e) { e.stopPropagation(); close(); });
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        openEl.addEventListener('click', function (e) { e.stopPropagation(); });

        modal.querySelector('.nzoom-tools').addEventListener('click', function (e) {
            var b = e.target.closest('.nzoom-tool');
            if (!b) return;
            e.stopPropagation();
            var act = b.getAttribute('data-act');
            if (act === 'in') setLevel(level + 0.5);
            else if (act === 'out') setLevel(level - 0.5);
            else setLevel(1);
        });

        /* zoom au double-clic */
        imgEl.addEventListener('dblclick', function (e) {
            e.stopPropagation();
            setLevel(level > 1.01 ? 1 : 2);
        });
        imgEl.addEventListener('click', function (e) { e.stopPropagation(); });

        /* zoom à la molette */
        wrapEl.addEventListener('wheel', function (e) {
            if (!modal.classList.contains('active')) return;
            e.preventDefault();
            setLevel(level + (e.deltaY < 0 ? 0.25 : -0.25));
        }, { passive: false });

        /* déplacement au drag quand on est zoomé */
        wrapEl.addEventListener('mousedown', function (e) {
            if (level <= 1.01) return;
            drag = { x: e.clientX, y: e.clientY, sl: wrapEl.scrollLeft, st: wrapEl.scrollTop };
            wrapEl.classList.add('dragging');
            e.preventDefault();
        });
        window.addEventListener('mousemove', function (e) {
            if (!drag) return;
            wrapEl.scrollLeft = drag.sl - (e.clientX - drag.x);
            wrapEl.scrollTop = drag.st - (e.clientY - drag.y);
        });
        window.addEventListener('mouseup', function () {
            if (!drag) return;
            drag = null;
            wrapEl.classList.remove('dragging');
        });

        imgEl.addEventListener('load', function () { measure(true); });
    }

    function measure(keep) {
        if (!imgEl) return;
        var r = imgEl.getBoundingClientRect();
        if (level <= 1.01) { fitW = r.width; fitH = r.height; }
        if (keep) applyZoom();
    }

    function applyZoom() {
        if (!imgEl) return;
        if (level <= 1.01) {
            imgEl.style.width = '';
            imgEl.style.height = '';
            imgEl.style.maxWidth = '';
            imgEl.style.maxHeight = '';
            wrapEl.classList.remove('zoomed');
        } else {
            if (!fitW) measure(false);
            imgEl.style.maxWidth = 'none';
            imgEl.style.maxHeight = 'none';
            imgEl.style.width = Math.round(fitW * level) + 'px';
            imgEl.style.height = 'auto';
            wrapEl.classList.add('zoomed');
        }
        levelEl.textContent = Math.round(level * 100) + '%';
        wrapEl.scrollLeft = (wrapEl.scrollWidth - wrapEl.clientWidth) / 2;
        wrapEl.scrollTop = (wrapEl.scrollHeight - wrapEl.clientHeight) / 2;
    }

    function setLevel(v) {
        level = Math.min(5, Math.max(1, Math.round(v * 100) / 100));
        applyZoom();
    }

    function open(card) {
        var src = source(card);
        if (!src || !src.src) return;
        if (!modal) buildModal();
        if (!modal) return;

        var m = meta(card);
        cur = card;
        level = 1; fitW = 0; fitH = 0;
        lastFocus = document.activeElement;

        imgEl.style.width = '';
        imgEl.style.height = '';
        imgEl.style.maxWidth = '';
        imgEl.style.maxHeight = '';
        imgEl.onerror = function () {
            if (src.fallback && imgEl.src !== src.fallback) { imgEl.onerror = null; imgEl.src = src.fallback; }
        };
        imgEl.src = src.src;
        imgEl.alt = m.title || src.alt || '';

        titleEl.textContent = m.title || '';
        badgeEl.textContent = m.badge || '';
        catEl.textContent = m.cat || '';
        descEl.textContent = m.desc || '';
        descEl.style.display = m.desc ? '' : 'none';
        openEl.href = src.src;

        applyZoom();
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        if (closeEl) closeEl.focus();
    }

    function close() {
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        wrapEl.classList.remove('zoomed', 'dragging');
        level = 1;
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { } }
        lastFocus = null;
        cur = null;
    }

    document.addEventListener('keydown', function (e) {
        if (!modal || !modal.classList.contains('active')) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key === '+' || e.key === '=') { e.preventDefault(); setLevel(level + 0.5); }
        else if (e.key === '-') { e.preventDefault(); setLevel(level - 0.5); }
        else if (e.key === '0') { e.preventDefault(); setLevel(1); }
    });

    window.addEventListener('resize', function () {
        if (modal && modal.classList.contains('active')) { fitW = 0; applyZoom(); }
    });

    /* ---------------------------------------------------------
       5. Branchement sur les cartes
       --------------------------------------------------------- */
    var done = [];

    function editMode() {
        return document.documentElement.classList.contains('n4k-cbmode');
    }

    function attach(card) {
        if (card.hasAttribute('data-nzoom')) return;
        var src = source(card);
        if (!src || !src.src) return;                        // rien à agrandir
        if (card.closest(SKIP_SEL)) return;

        /* évite les cartes imbriquées (la plus externe gagne) */
        for (var i = 0; i < done.length; i++) {
            if (done[i] !== card && done[i].contains(card)) return;
        }

        card.setAttribute('data-nzoom', '');
        done.push(card);

        var img = pickImage(card);
        var host = hostFor(card, img);
        if (host && host !== card && !safeRelative(host)) host = card;
        if (!safeRelative(host)) return;                     // on ne touche pas à la mise en page
        /* le bouton est en position:absolute -> il faut un repère */
        if (!isPositioned(host)) host.setAttribute('data-nzoom-host', '');

        /* la carte possède déjà un bouton loupe (ex. fr/intelligence.html) :
           on le branche, sinon il resterait inerte (un clic sur un <button>
           est ignoré par le gestionnaire de la carte). */
        var preset = card.querySelectorAll('.nzoom-btn, .moat-item-zoom');
        for (var k = 0; k < preset.length; k++) bindBtn(preset[k]);
        if (!preset.length) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nzoom-btn';
            btn.title = T.zoom;
            btn.setAttribute('aria-label', (T.zoom + (meta(card).title ? ' — ' + meta(card).title : '')));
            btn.innerHTML = ICON_ZOOM;
            bindBtn(btn);
            host.appendChild(btn);
        }

        function bindBtn(b) {
            if (b.hasAttribute('data-nzoom-on')) return;
            b.setAttribute('data-nzoom-on', '');
            b.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (editMode()) return;
                open(card);
            });
        }

        var isLink = card.tagName === 'A' && card.getAttribute('href');
        if (!isLink) {
            if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
            if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');

            card.addEventListener('click', function (e) {
                if (editMode()) return;
                var t = e.target;
                if (t && t.closest && t.closest('a[href], button, input, select, textarea, label, [data-nzoom-skip]')) return;
                if (window.getSelection && String(window.getSelection()).length > 2) return;
                open(card);
            });

            card.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                if (e.target !== card) return;
                if (editMode()) return;
                e.preventDefault();
                open(card);
            });
        }
    }

    function scan() {
        var cards = document.querySelectorAll(CARD_SEL);
        for (var i = 0; i < cards.length; i++) {
            try { attach(cards[i]); } catch (e) { }
        }
    }

    /* un ajout de noeud nous intéresse seulement s'il peut apporter
       une nouvelle image de carte (fonds posés par nutri4k, etc.) */
    function relevant(muts) {
        for (var i = 0; i < muts.length; i++) {
            var add = muts[i].addedNodes;
            for (var j = 0; j < add.length; j++) {
                var n = add[j];
                if (!n || n.nodeType !== 1) continue;
                if (n.matches && n.matches('.n4k-cb, .n4k-cb-img, img')) return true;
                if (n.querySelector && n.querySelector('.n4k-cb, .n4k-cb-img, img')) return true;
            }
        }
        return false;
    }

    function init() {
        scan();
        /* les fonds de carte posés par nutri4k arrivent après coup */
        var t = null;
        new MutationObserver(function (muts) {
            if (!relevant(muts)) return;
            if (t) clearTimeout(t);
            t = setTimeout(scan, 350);
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.NutriZoom = { open: open, close: close, refresh: scan };
})();
