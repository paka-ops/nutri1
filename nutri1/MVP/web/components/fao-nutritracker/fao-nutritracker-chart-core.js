/* ============================================================================
 * FAO AgriNutriApp · Moteur Canvas partagé.
 * HiDPI, ResizeObserver, IntersectionObserver, animations rAF, zones de survol
 * et info-bulles accessibles sans bibliothèque de visualisation externe.
 * ========================================================================== */
(function (global) {
  'use strict';
  const FAO = (global.FAONutriTracker = global.FAONutriTracker || {});
  const queued = new Set();
  let frameId = 0;

  function flushFrame(timestamp) {
    frameId = 0;
    const batch = Array.from(queued);
    queued.clear();
    batch.forEach((chart) => {
      if (chart.drawFrame(timestamp)) queued.add(chart);
    });
    if (queued.size && !frameId) frameId = global.requestAnimationFrame(flushFrame);
  }

  function schedule(chart) {
    queued.add(chart);
    if (!frameId) frameId = global.requestAnimationFrame(flushFrame);
  }

  const utils = {
    colors: {
      primary: '#059669', green: '#10B981', amber: '#D97706', cyan: '#0891B2',
      violet: '#7C3AED', red: '#DC2626', dark: '#1E293B', body: '#64748B',
      muted: '#94A3B8', grid: '#F1F5F9', axis: '#E2E8F0', gold: '#D4A017',
      gray: '#94A3B8', pale: '#ECFDF5'
    },
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    roundRect(ctx, x, y, width, height, radius) {
      const r = Math.max(0, Math.min(radius || 0, Math.abs(width) / 2, Math.abs(height) / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    },
    text(ctx, value, x, y, options) {
      const o = options || {};
      ctx.save();
      ctx.font = (o.weight || 500) + ' ' + (o.size || 10) + 'px Inter, system-ui, sans-serif';
      ctx.fillStyle = o.color || '#64748B';
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'middle';
      if (o.maxWidth) ctx.fillText(String(value), x, y, o.maxWidth);
      else ctx.fillText(String(value), x, y);
      ctx.restore();
    },
    line(ctx, x1, y1, x2, y2, color, width, dash) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color || '#E2E8F0';
      ctx.lineWidth = width || 1;
      ctx.setLineDash(dash || []);
      ctx.stroke();
      ctx.restore();
    },
    circle(ctx, x, y, radius, fill, stroke, strokeWidth) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth || 1; ctx.stroke(); }
    },
    roundedBar(ctx, x, y, width, height, color, radius) {
      if (width <= 0 || height <= 0) return;
      const r = Math.min(radius == null ? 5 : radius, width / 2, height / 2);
      this.roundRect(ctx, x, y, width, height, r);
      ctx.fillStyle = color;
      ctx.fill();
    },
    topBar(ctx, x, y, width, height, color, radius) {
      if (width <= 0 || height <= 0) return;
      const r = Math.min(radius == null ? 5 : radius, width / 2, height);
      ctx.beginPath();
      ctx.moveTo(x, y + height);
      ctx.lineTo(x, y + r);
      if (r) ctx.arcTo(x, y, x + r, y, r); else ctx.lineTo(x, y);
      ctx.lineTo(x + width - r, y);
      if (r) ctx.arcTo(x + width, y, x + width, y + r, r); else ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + height);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    },
    smoothLine(ctx, points, color, width, dash) {
      if (!points || points.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const midpoint = (previous.x + current.x) / 2;
        ctx.bezierCurveTo(midpoint, previous.y, midpoint, current.y, current.x, current.y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(dash || []);
      ctx.stroke();
      ctx.restore();
    },
    area(ctx, points, baseline, color, alpha) {
      if (!points || points.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, baseline);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const midpoint = (previous.x + current.x) / 2;
        ctx.bezierCurveTo(midpoint, previous.y, midpoint, current.y, current.x, current.y);
      }
      ctx.lineTo(points[points.length - 1].x, baseline);
      ctx.closePath();
      ctx.globalAlpha = alpha == null ? .16 : alpha;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    },
    rgba(hex, alpha) {
      const value = String(hex).replace('#', '');
      const normalized = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
      const number = parseInt(normalized, 16);
      return 'rgba(' + ((number >> 16) & 255) + ',' + ((number >> 8) & 255) + ',' + (number & 255) + ',' + alpha + ')';
    },
    interpolate(a, b, t) {
      const start = parseInt(a.replace('#', ''), 16);
      const end = parseInt(b.replace('#', ''), 16);
      const r = Math.round(((start >> 16) & 255) + (((end >> 16) & 255) - ((start >> 16) & 255)) * t);
      const g = Math.round(((start >> 8) & 255) + (((end >> 8) & 255) - ((start >> 8) & 255)) * t);
      const bl = Math.round((start & 255) + ((end & 255) - (start & 255)) * t);
      return 'rgb(' + r + ',' + g + ',' + bl + ')';
    },
    format(value, digits) {
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits == null ? 0 : digits, minimumFractionDigits: digits == null ? 0 : digits }).format(value);
    },
    niceCeil(value) {
      if (!Number.isFinite(value) || value <= 0) return 1;
      const power = Math.pow(10, Math.floor(Math.log10(value)));
      const fraction = value / power;
      const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
      return nice * power;
    },
    hitRect(chart, x, y, width, height, title, lines, color, id, onClick) {
      chart.addHit({ type: 'rect', x, y, w: width, h: height, title, lines, color, id, onClick });
    },
    hitCircle(chart, x, y, radius, title, lines, color, id, onClick) {
      chart.addHit({ type: 'circle', x, y, r: Math.max(radius, 5), title, lines, color, id, onClick });
    }
  };
  FAO.util = utils;

  class CanvasChart {
    constructor(host, id, renderer, dashboard, options) {
      this.host = host;
      this.id = id;
      this.renderer = renderer;
      this.dashboard = dashboard;
      this.options = options || {};
      this.data = null;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.visible = typeof global.IntersectionObserver !== 'function';
      this.hidden = new Set();
      this.hits = [];
      this.hoverId = null;
      this.hoverHit = null;
      this.animating = false;
      this.continuous = !!this.options.continuous;
      this.destroyed = false;

      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden', 'true');
      this.host.appendChild(this.canvas);
      const _rawCtx = this.canvas.getContext('2d', { alpha: true });
      this.ctx = global.NutriSectionsI18N ? global.NutriSectionsI18N.wrapCtx(_rawCtx) : _rawCtx;
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'ft-tooltip';
      this.tooltip.hidden = true;
      this.tooltip.setAttribute('role', 'tooltip');
      this.host.appendChild(this.tooltip);

      this.canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
      this.canvas.addEventListener('pointerleave', () => this.pointerLeave());
      this.canvas.addEventListener('click', (event) => this.pointerClick(event));

      if (typeof global.ResizeObserver === 'function') {
        this.resizeObserver = new ResizeObserver(() => { this.resize(); this.refresh(); });
        this.resizeObserver.observe(this.host);
      } else {
        this.resizeFallback = () => { this.resize(); this.refresh(); };
        global.addEventListener('resize', this.resizeFallback);
      }
      if (typeof global.IntersectionObserver === 'function') {
        this.intersectionObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.target !== this.host) return;
            this.visible = entry.isIntersecting;
            if (this.visible) { this.resize(); this.refresh(); }
          });
        }, { rootMargin: '140px 0px', threshold: 0 });
        this.intersectionObserver.observe(this.host);
      }
      this.resize();
    }

    setData(data) {
      this.data = data;
      this.progress = 0;
      this.startedAt = 0;
      this.animating = true;
      this.refresh();
    }

    addHit(hit) { this.hits.push(hit); }

    resize() {
      if (this.destroyed || !this.ctx) return;
      const rect = this.host.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width < 2 || height < 2) return;
      this.width = width;
      this.height = height;
      this.dpr = Math.min(global.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(width * this.dpr));
      const pixelHeight = Math.max(1, Math.round(height * this.dpr));
      if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
      }
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    refresh() {
      if (!this.destroyed && this.visible && this.data) schedule(this);
    }

    drawFrame(timestamp) {
      if (this.destroyed || !this.visible || !this.data || !this.ctx) return false;
      this.resize();
      if (this.width < 2 || this.height < 2) return false;
      let progress = 1;
      if (this.animating) {
        if (!this.startedAt) this.startedAt = timestamp;
        const linear = Math.min(1, Math.max(0, (timestamp - this.startedAt) / 800));
        progress = 1 - Math.pow(1 - linear, 3);
        this.progress = progress;
        if (linear >= 1) this.animating = false;
      }
      this.hits = [];
      this.ctx.clearRect(0, 0, this.width, this.height);
      try {
        this.renderer(this.ctx, this.width, this.height, this.data, this, progress, timestamp);
      } catch (error) {
        this.ctx.save();
        this.ctx.fillStyle = '#FEF2F2';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#B91C1C';
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.fillText('Graphique indisponible — vérifier les données de cette vue.', 12, 24);
        this.ctx.restore();
        if (!this.reportedError) { console.error('[FAO AgriNutriApp] Erreur Canvas ' + this.id, error); this.reportedError = true; }
      }
      if (this.hoverId) {
        this.hoverHit = this.hits.find((hit) => hit.id === this.hoverId) || null;
        if (this.hoverHit) this.showTooltip(this.hoverHit, this.lastPointerX, this.lastPointerY);
        else this.hideTooltip();
      }
      return this.animating || this.continuous;
    }

    findHit(x, y) {
      for (let index = this.hits.length - 1; index >= 0; index -= 1) {
        const hit = this.hits[index];
        if (hit.type === 'circle') {
          const dx = x - hit.x;
          const dy = y - hit.y;
          if (dx * dx + dy * dy <= Math.pow((hit.r || 5) + 4, 2)) return hit;
        } else if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
          return hit;
        }
      }
      return null;
    }

    pointerMove(event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = this.findHit(x, y);
      this.lastPointerX = x;
      this.lastPointerY = y;
      this.canvas.style.cursor = hit ? (hit.onClick ? 'pointer' : 'crosshair') : 'default';
      const nextId = hit ? hit.id : null;
      if (nextId !== this.hoverId) {
        this.hoverId = nextId;
        this.hoverHit = hit;
        if (hit) this.showTooltip(hit, x, y);
        else this.hideTooltip();
        this.refresh();
      } else if (hit) {
        this.hoverHit = hit;
        this.showTooltip(hit, x, y);
      }
    }

    pointerLeave() {
      this.hoverId = null;
      this.hoverHit = null;
      this.canvas.style.cursor = 'default';
      this.hideTooltip();
      this.refresh();
    }

    pointerClick(event) {
      const rect = this.canvas.getBoundingClientRect();
      const hit = this.findHit(event.clientX - rect.left, event.clientY - rect.top);
      if (hit && typeof hit.onClick === 'function') hit.onClick(hit, this);
    }

    showTooltip(hit, x, y) {
      if (!hit || !this.tooltip) return;
      this.tooltip.replaceChildren();
      const title = document.createElement('b');
      title.textContent = hit.title || 'Détail';
      this.tooltip.appendChild(title);
      (hit.lines || []).forEach((line) => {
        const row = document.createElement('span');
        row.textContent = String(line);
        this.tooltip.appendChild(row);
      });
      this.tooltip.style.setProperty('--tooltip-color', hit.color || '#059669');
      if (global.NutriSectionsI18N) global.NutriSectionsI18N.translateTree(this.tooltip);
      this.tooltip.hidden = false;
      const left = Math.max(4, Math.min((x || 0) + 12, this.width - Math.min(this.tooltip.offsetWidth, 220) - 5));
      const top = Math.max(4, Math.min((y || 0) + 12, this.height - Math.min(this.tooltip.offsetHeight, 115) - 5));
      this.tooltip.style.left = left + 'px';
      this.tooltip.style.top = top + 'px';
    }

    hideTooltip() { if (this.tooltip) this.tooltip.hidden = true; }

    destroy() {
      this.destroyed = true;
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.intersectionObserver) this.intersectionObserver.disconnect();
      if (this.resizeFallback) global.removeEventListener('resize', this.resizeFallback);
      queued.delete(this);
      this.host.replaceChildren();
    }
  }

  FAO.CanvasChart = CanvasChart;
  FAO.createChart = (host, id, renderer, dashboard, options) => new CanvasChart(host, id, renderer, dashboard, options);
})(window);
