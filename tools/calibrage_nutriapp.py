#!/usr/bin/env python3
"""Étalonnage du jeu de données NutriApp : ajuste les valeurs pays pour que les
agrégats régionaux tombent EXACTEMENT sur les valeurs de référence imposées
(admissions 48 234 · obésité 14,2 % · HTA 27,8 % · 47 ruptures · 1 842 points ·
synchro 72 %), tout en conservant Niger = 12 450 admissions / 12 ruptures."""
import re, sys

P = 'dashboard/_js2.html'
src = open(P, encoding='utf-8').read()

# ── Extraction des fiches pays ────────────────────────────────────────────
blocks = re.findall(r"\{ iso:'(\w\w)'.*?cpn:(\d+) \}", src, re.S)
pays = []
for iso, _ in blocks:
    b = re.search(r"\{ iso:'" + iso + r"'.*?cpn:\d+ \}", src, re.S).group(0)
    g = lambda k, cast=float: cast(re.search(k + r":\s*(-?[\d.]+)", b).group(1))
    pays.append(dict(iso=iso, adm=g('adm', int), pts=g('pts', int), stk=g('stk', int),
                     obes=g('obes'), hta=g('hta'), popM=g('popM'), agents=g('agents', int),
                     sync=g('sync', int)))
assert len(pays) == 16, len(pays)

def wavg(key, wkey):
    num = sum(p[key] * p[wkey] for p in pays); den = sum(p[wkey] for p in pays)
    return num / den

# ── 1. Admissions : somme exacte = 48 234 (Niger verrouillé à 12 450) ─────
CIBLE_ADM, NE_ADM = 48234, 12450
autres = [p for p in pays if p['iso'] != 'NE']
somme_autres = sum(p['adm'] for p in autres)
cible_autres = CIBLE_ADM - NE_ADM
for p in autres:
    p['adm'] = max(120, round(p['adm'] * cible_autres / somme_autres))
# Correction du résidu sur le plus gros contributeur (hors Niger)
residu = cible_autres - sum(p['adm'] for p in autres)
autres.sort(key=lambda p: -p['adm'])
autres[0]['adm'] += residu
pays[[p['iso'] for p in pays].index('NE')]['adm'] = NE_ADM

# ── 2. Points ATPE : somme exacte = 1 842 ────────────────────────────────
CIBLE_PTS = 1842
somme = sum(p['pts'] for p in pays)
for p in pays:
    p['pts'] = max(20, round(p['pts'] * CIBLE_PTS / somme))
residu = CIBLE_PTS - sum(p['pts'] for p in pays)
pays[0]['pts'] += residu

# ── 3. Ruptures ATPE : somme exacte = 47 (Niger verrouillé à 12) ─────────
CIBLE_STK, NE_STK = 47, 12
pays[[p['iso'] for p in pays].index('NE')]['stk'] = NE_STK
autres = [p for p in pays if p['iso'] != 'NE']
somme = sum(p['stk'] for p in autres)
cible = CIBLE_STK - NE_STK
for p in autres:
    p['stk'] = max(0, round(p['stk'] * cible / somme)) if p['stk'] else 0
residu = cible - sum(p['stk'] for p in autres)
autres.sort(key=lambda p: -p['pts'])
i = 0
while residu != 0:
    autres[i % len(autres)]['stk'] += 1 if residu > 0 else -1
    autres[i % len(autres)]['stk'] = max(0, autres[i % len(autres)]['stk'])
    residu += -1 if residu > 0 else 1
    i += 1

# ── 4. Obésité : moyenne pondérée par la population = 14,2 % ─────────────
CIBLE_OBES = 14.2
facteur = CIBLE_OBES / wavg('obes', 'popM')
for p in pays:
    p['obes'] = round(p['obes'] * facteur, 1)
# Ajustement fin par pas de 0,1 sur les pays les plus peuplés
garde = 0
while round(wavg('obes', 'popM'), 1) != CIBLE_OBES and garde < 400:
    d = CIBLE_OBES - wavg('obes', 'popM')
    cible = max(pays, key=lambda p: p['popM']) if d > 0 else min(
        [p for p in pays if p['obes'] > 4], key=lambda p: -p['popM'])
    cible['obes'] = round(cible['obes'] + (0.1 if d > 0 else -0.1), 1)
    garde += 1

# ── 5. Hypertension liée au sel : pondérée population = 27,8 % ───────────
CIBLE_HTA = 27.8
facteur = CIBLE_HTA / wavg('hta', 'popM')
for p in pays:
    p['hta'] = round(p['hta'] * facteur, 1)
garde = 0
while round(wavg('hta', 'popM'), 1) != CIBLE_HTA and garde < 400:
    d = CIBLE_HTA - wavg('hta', 'popM')
    cible = max(pays, key=lambda p: p['popM'])
    cible['hta'] = round(cible['hta'] + (0.1 if d > 0 else -0.1), 1)
    garde += 1

# ── 6. Synchronisation : pondérée agents = 72 % ─────────────────────────
CIBLE_SYNC = 72.0
garde = 0
while abs(wavg('sync', 'agents') - CIBLE_SYNC) > 0.30 and garde < 400:
    d = CIBLE_SYNC - wavg('sync', 'agents')
    cible = max(pays, key=lambda p: p['agents'])
    cible['sync'] = int(round(cible['sync'] + (1 if d > 0 else -1)))
    garde += 1

# ── Réécriture du fichier ────────────────────────────────────────────────
out = src
for p in pays:
    b = re.search(r"\{ iso:'" + p['iso'] + r"'.*?cpn:\d+ \}", out, re.S).group(0)
    nb = b
    nb = re.sub(r"adm:\d+",  "adm:" + str(p['adm']), nb)
    nb = re.sub(r"pts:\d+",  "pts:" + str(p['pts']), nb)
    nb = re.sub(r"stk:\d+",  "stk:" + str(p['stk']), nb)
    nb = re.sub(r"obes:[\d.]+", "obes:" + ('%.1f' % p['obes']), nb)
    nb = re.sub(r"hta:[\d.]+",  "hta:"  + ('%.1f' % p['hta']), nb)
    nb = re.sub(r"sync:\d+", "sync:" + str(p['sync']), nb)
    out = out.replace(b, nb, 1)
open(P, 'w', encoding='utf-8').write(out)

# ── Contrôle final ───────────────────────────────────────────────────────
print('admissions  :', sum(p['adm'] for p in pays), '(cible 48 234)')
print('points ATPE :', sum(p['pts'] for p in pays), '(cible 1 842)')
print('ruptures    :', sum(p['stk'] for p in pays), '(cible 47)')
print('obésité     : %.2f %%' % wavg('obes', 'popM'), '(cible 14,2)')
print('HTA         : %.2f %%' % wavg('hta', 'popM'), '(cible 27,8)')
print('synchro     : %.2f %%' % wavg('sync', 'agents'), '(cible ≈ 72)')
print('ratio rupt. : %.2f %%' % (sum(p['stk'] for p in pays) / sum(p['pts'] for p in pays) * 100))
ne = [p for p in pays if p['iso'] == 'NE'][0]
print('Niger       :', ne['adm'], 'admissions ·', ne['stk'], 'ruptures ·', ne['pts'], 'points')
