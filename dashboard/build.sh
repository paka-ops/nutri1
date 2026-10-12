#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
# Construction du livrable autonome : dashboard/index.html
# Les fragments de src/ sont concaténés dans l'ordre (head+CSS → body → JS).
# Usage : ./build.sh
# ══════════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

OUT=index.html
: > "$OUT"
for f in src/01-head-css.html src/02-body.html \
         src/03-moteur.html src/04-donnees.html src/05-kpi-charts-1-2-3.html \
         src/06-charts-4-5-10-6-7.html src/07-charts-8-9-11-12-13-14.html \
         src/08-chart-qualite-scorecard-init.html; do
  [ -f "$f" ] || { echo "✗ Fragment manquant : $f" >&2; exit 1; }
  cat "$f" >> "$OUT"
done

# Contrôle de syntaxe du JavaScript extrait (Node.js requis)
if command -v node >/dev/null 2>&1; then
  python3 - "$OUT" <<'PY'
import re, sys
h = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'<script>(.*)</script>', h, re.S)
open('/tmp/nutriapp-app.js', 'w', encoding='utf-8').write(m.group(1) if m else '')
PY
  node --check /tmp/nutriapp-app.js
  echo "✓ Syntaxe JavaScript validée"
fi

printf '✓ %s généré (%s octets)\n' "$OUT" "$(wc -c < "$OUT" | tr -d ' ')"
