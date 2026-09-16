/* ============================================================================
   NUTRI.N°1 — SECTION SANTÉ (v59) · ONGLETS 5 À 8
     · nutrition   — alimentation, double fardeau, qualité du régime
     · forecast    — prévision, scénarios, Monte-Carlo, sensibilité
     · investment  — portefeuille de prévention, rentabilité, financement
     · method      — méthode, qualité des données, limites, réutilisation

   Le module (health-module.js) monte la coquille et les onglets 1 à 4 ; ce
   fichier n'utilise que la boîte à outils partagée (NX.shell → kit, NX.ui).
   ========================================================================== */
(function (w, d) {
  'use strict';
  const K = w.NUTRI_HEALTH_KIT;
  if (!K) { console.warn('[NUTRI_HEALTH] coquille absente : health-views.js ignoré'); return; }
  const NX = w.NX, M = w.NUTRI_HEALTH_MODELS, DATA = w.NUTRI_HEALTH_DATA, AGRI = w.NUTRI_AGRI_DATA;
  const { h, fmt, stats: S, overlay } = NX;
  const U = NX.ui;

  function T(fr, en) { return NX.lang() === 'en' ? en : fr; }
  const label = (o) => (NX.lang() === 'en' ? o.en : o.fr);
  const getDs = () => K.ds;
  const st = () => K.state;
  /* le lien agriculture n'existe que si la section est chargée sur la page */
  function agriDossier() {
    const ds = getDs();
    try { return AGRI && AGRI.build ? AGRI.build(ds.country, ds.year) : null; } catch (e) { return null; }
  }

  /* ======================================================================= */
  /*  ONGLET 5 — NUTRITION & ALIMENTATION                                    */
  /* ======================================================================= */
  K.registerTab({
    id: 'nutrition', icon: '🥗', label: T('Nutrition & alimentation', 'Nutrition & diet'), labelT: ['Nutrition & alimentation', 'Nutrition & diet'],
    mount(host) {
      const ds0 = getDs();
      const kpis = K.kpiBand();

      const dietCard = K.card({
        title: T('Qualité du régime alimentaire', 'Dietary quality'),
        sub: T('Série historique (base 2010 = 100) et repère de politique publique', 'Historical series (2010 = 100) with the public-policy reference'),
        span: 3,
        actions: [K.segmented([
          { value: 'sugar', label: T('Sucres libres', 'Free sugars') },
          { value: 'sodium', label: T('Sodium', 'Sodium') },
          { value: 'fiber', label: T('Fibres', 'Fibre') },
          { value: 'fruitveg', label: T('Fruits & légumes', 'Fruit & veg') },
          { value: 'ultra', label: T('Ultra-transformés', 'Ultra-processed') }
        ], st().dietView || 'sugar', v => { st().dietView = v; drawDiet(); })]
      });
      const dietHost = K.chartHost('lg');
      const dietNote = h('div.nx-mini.nx-muted');
      dietCard.body.appendChild(dietHost); dietCard.body.appendChild(dietNote);

      const burdenCard = K.card({
        title: T('Double fardeau par région', 'Double burden by region'),
        sub: T('Retard de croissance (sous-nutrition) et obésité (surpoids) cohabitent', 'Stunting (undernutrition) and obesity (overweight) coexist'), span: 3
      });
      const burdenHost = K.chartHost('lg');
      const burdenNote = h('div.nx-note');
      burdenCard.body.appendChild(burdenHost); burdenCard.body.appendChild(burdenNote);

      const qualityCard = K.card({ title: T('Indice de qualité du régime national', 'National diet quality index'), sub: T('Composite : diversité, allaitement, iode, vitamine A, fibres, fruits & légumes', 'Composite: diversity, breastfeeding, iodine, vitamin A, fibre, fruit & veg'), span: 3 });
      const qualityGauge = K.chartHost('sm');
      const qualityMeters = h('div.nx-stack');
      qualityCard.body.appendChild(qualityGauge); qualityCard.body.appendChild(qualityMeters);

      const groupCard = K.card({ title: T('Disponibilité par groupe d’aliments', 'Availability by food group'), sub: T('kg/habitant/an — données croisées avec le Ministère de l’Agriculture', 'kg/capita/yr — data shared with the Ministry of Agriculture'), span: 3 });
      const groupHost = K.chartHost('lg');
      const groupNote = h('div.nx-mini.nx-muted');
      groupCard.body.appendChild(groupHost); groupCard.body.appendChild(groupNote);

      const linkCard = K.card({ title: T('Du champ à la maladie', 'From field to disease'), sub: T('La même chaîne, vue par les deux ministères', 'The same chain, seen by both ministries'), span: 3 });
      const linkHost = h('div.nx-stack');
      linkCard.body.appendChild(linkHost);

      const policyCard = K.card({ title: T('Leviers alimentaires classés par impact', 'Dietary levers ranked by impact'), sub: T('Fraction attribuable évitable par priorité', 'Attributable fraction avoidable per priority'), span: 3 });
      const policyHost = K.chartHost('lg');
      const policyNote = h('div.nx-note');
      policyCard.body.appendChild(policyHost); policyCard.body.appendChild(policyNote);

      host.appendChild(h('div.nx-grid.g-6', null, [
        kpis, dietCard.el, burdenCard.el, qualityCard.el, groupCard.el, linkCard.el, policyCard.el
      ]));

      /* ------------------------------------------------------------- dessins */
      function renderKpis() {
        const ds = getDs(), n = ds.nutrition;
        kpis.innerHTML = '';
        [
          K.kpi({ label: T('Énergie disponible', 'Energy available'), value: fmt.num(ds.diet.intakePerCapKcal, 0), unit: 'kcal/hab/j', foot: T('repère 2 200 kcal', '2,200 kcal reference'), spark: ds.history.healthSpendPerCap, source: 'reported' }),
          K.kpi({ label: T('Sucres libres', 'Free sugars'), value: fmt.num(ds.diet.sugarG, 0), unit: 'g/j', tone: ds.diet.sugarG > 50 ? 'hot' : '', foot: T('repère OMS renforcé 25 g', 'WHO advanced reference 25 g'), spark: ds.history.dietSugar, sparkColor: '#f472b6' }),
          K.kpi({ label: T('Sodium', 'Sodium'), value: fmt.num(ds.diet.sodiumMg, 0), unit: 'mg/j', tone: ds.diet.sodiumMg > 2000 ? 'hot' : '', foot: T('repère renforcé 1 500 mg', 'advanced reference 1,500 mg'), spark: ds.history.dietSodium, sparkColor: '#ff6b5e' }),
          K.kpi({ label: T('Fibres', 'Fibre'), value: fmt.num(ds.diet.fiberG, 0), unit: 'g/j', tone: ds.diet.fiberG < 25 ? 'hot' : 'good', foot: T('repère 30 g', '30 g reference') }),
          K.kpi({ label: T('Fruits & légumes', 'Fruit & vegetables'), value: fmt.num(ds.diet.fruitVegG, 0), unit: 'g/j', tone: ds.diet.fruitVegG < 400 ? 'hot' : 'good', foot: T('repère OMS 400 g', 'WHO reference 400 g') }),
          K.kpi({ label: T('Ultra-transformés', 'Ultra-processed'), value: fmt.pct(ds.diet.ultraProcPct, 0), tone: ds.diet.ultraProcPct > 25 ? 'hot' : '', foot: T('part des calories', 'share of calories') + ' · ' + T('diversité ', 'diversity ') + fmt.pct(n.dietaryDiversity, 0) })
        ].forEach(x => kpis.appendChild(x));
        U.animateKpis(kpis);
      }

      function drawDiet() {
        const ds = getDs(), v = st().dietView || 'sugar';
        const defs = {
          sugar: { fr: T('Sucres libres (g/j)', 'Free sugars (g/day)'), hist: ds.history.dietSugar, now: ds.diet.sugarG, ref: 25, dir: 'down', color: '#f472b6' },
          sodium: { fr: T('Sodium (mg/j)', 'Sodium (mg/day)'), hist: ds.history.dietSodium, now: ds.diet.sodiumMg, ref: 2000, dir: 'down', color: '#ff6b5e' },
          fiber: { fr: T('Fibres (g/j)', 'Fibre (g/day)'), hist: null, now: ds.diet.fiberG, ref: 30, dir: 'up', color: '#18d67f' },
          fruitveg: { fr: T('Fruits & légumes (g/j)', 'Fruit & vegetables (g/day)'), hist: null, now: ds.diet.fruitVegG, ref: 400, dir: 'up', color: '#3fc8f0' },
          ultra: { fr: T('Ultra-transformés (% kcal)', 'Ultra-processed (% kcal)'), hist: null, now: ds.diet.ultraProcPct, ref: 15, dir: 'down', color: '#a78bfa' }
        };
        const D = defs[v];
        if (D.hist) {
          const base = D.hist[0] || 1;
          K.chart('line', dietHost, {
            labels: ds.history.years.map(String),
            series: [
              { name: D.fr, data: D.hist, color: D.color, area: true },
              { name: T('Repère', 'Reference'), data: D.hist.map(() => D.ref), color: 'rgba(255,255,255,.35)', dash: true, points: false }
            ],
            target: D.ref, targetLabel: T('repère renforcé', 'advanced reference'), xTicks: 8,
            format: x => fmt.num(x, 0)
          });
          const trend = (D.hist[D.hist.length - 1] - D.hist[0]) / Math.max(1, D.hist[0]) * 100;
          const pct = D.now / D.ref * 100;
          dietNote.innerHTML = T('<b>' + D.fr + '</b> — ' + fmt.num(D.now, 0) + ' contre un repère de ' + fmt.num(D.ref, 0) + ' (' + fmt.num(pct, 0) + ' % du repère) · évolution depuis 2010 : ' +
            fmt.signed(trend, 0) + ' % · la cible est ' + (D.dir === 'down' ? 'de rester sous le repère' : 'd’atteindre le repère') + '.',
            '<b>' + D.fr + '</b> — ' + fmt.num(D.now, 0) + ' against a reference of ' + fmt.num(D.ref, 0) + ' (' + fmt.num(pct, 0) + '% of reference) · change since 2010: ' +
            fmt.signed(trend, 0) + '% · the target is ' + (D.dir === 'down' ? 'to stay below the reference' : 'to reach the reference') + '.');
        } else {
          const others = [
            { label: T('Sucres libres', 'Free sugars'), v: ds.diet.sugarG, ref: 25 },
            { label: T('Sodium (mg/10)', 'Sodium (mg/10)'), v: ds.diet.sodiumMg / 10, ref: 200 },
            { label: T('Fibres', 'Fibre'), v: ds.diet.fiberG, ref: 30 },
            { label: T('Fruits & légumes (/10)', 'Fruit & veg (/10)'), v: ds.diet.fruitVegG / 10, ref: 40 },
            { label: T('Ultra-transformés (%)', 'Ultra-processed (%)'), v: ds.diet.ultraProcPct, ref: 15 }
          ];
          K.chart('bars', dietHost, {
            labels: others.map(o => o.label),
            series: [
              { name: T('Situation actuelle', 'Current'), data: others.map(o => o.v), color: null },
              { name: T('Repère renforcé', 'Advanced reference'), data: others.map(o => o.ref), color: 'rgba(201,238,89,.32)' }
            ],
            format: x => fmt.num(x, 0),
            colorScale: (x, i) => [D.color, '#c9ee59'][i]
          });
          dietNote.innerHTML = T('<b>' + D.fr + '</b> — aucune série historique complète pour cet indicateur : comparaison directe avec le repère renforcé de l’OMS (' + fmt.num(D.ref, 0) + ').',
            '<b>' + D.fr + '</b> — no complete historical series for this indicator: direct comparison with the WHO advanced reference (' + fmt.num(D.ref, 0) + ').');
        }
      }

      function drawBurden() {
        const ds = getDs();
        const rows = ds.regions.slice().sort((a, b) => (b.stunting / 20 + b.diabetes) - (a.stunting / 20 + a.diabetes));
        K.chart('bars', burdenHost, {
          labels: rows.map(r => r.name),
          series: [
            { name: T('Retard de croissance (%)', 'Stunting (%)'), data: rows.map(r => r.stunting), color: '#f5b642' },
            { name: T('Obésité adulte (%)', 'Adult obesity (%)'), data: rows.map(r => r.diabetes * 1.15), color: '#f472b6' },
            { name: T('Anémie des femmes (%)', 'Women anaemia (%)'), data: rows.map(r => r.anaemia), color: '#ff6b5e' }
          ],
          format: x => fmt.num(x, 1) + ' %',
          onSelect: i => {
            const r = rows[i]; if (!r) return;
            st().region = r.name;
            burdenNote.innerHTML = T('<b>' + r.name + '</b> — retard ' + fmt.pct(r.stunting, 1) + ' · obésité estimée ' + fmt.pct(r.diabetes * 1.15, 1) +
              ' · anémie ' + fmt.pct(r.anaemia, 1) + ' · risque composite ' + r.risk + '/100 · ' +
              (r.stunting > 25 && r.diabetes * 1.15 > 8 ? T('région en double fardeau : agir sur les deux fronts', 'double-burden region: act on both fronts') : T('priorité ', 'priority ') + r.hotspot),
              '<b>' + r.name + '</b> — stunting ' + fmt.pct(r.stunting, 1) + ' · estimated obesity ' + fmt.pct(r.diabetes * 1.15, 1) +
              ' · anaemia ' + fmt.pct(r.anaemia, 1) + ' · composite risk ' + r.risk + '/100 · ' +
              (r.stunting > 25 && r.diabetes * 1.15 > 8 ? T('double-burden region: act on both fronts', 'double-burden region: act on both fronts') : T('priority ', 'priority ') + r.hotspot));
            K.toast('📍 ' + r.name);
          }
        });
        burdenNote.innerHTML = T('Touchez une région pour la cibler. Une même région peut cumuler un retard de croissance élevé (filles-mères, 1 000 premiers jours) et une obésité croissante (urbanisation, ultra-transformés).',
          'Tap a region to target it. A single region can combine high stunting (mothers, first 1,000 days) with rising obesity (urbanisation, ultra-processed foods).');
      }

      function drawQuality() {
        const ds = getDs(), n = ds.nutrition, ns = M.nutritionStatus(ds);
        const score = Math.round(S.mean([
          Math.min(100, n.dietaryDiversity / 60 * 100),
          Math.min(100, n.exclusiveBF / 70 * 100),
          Math.min(100, n.iodisedSalt / 90 * 100),
          Math.min(100, n.vitASupp / 80 * 100),
          Math.min(100, ds.diet.fiberG / 30 * 100),
          Math.min(100, ds.diet.fruitVegG / 400 * 100)
        ]));
        K.chart('gauge', qualityGauge, {
          value: score, max: 100, format: v => fmt.num(v, 0) + '/100',
          label: T('qualité du régime', 'diet quality'),
          tone: score > 70 ? '#18d67f' : score > 50 ? '#f5b642' : '#ff6b5e'
        });
        qualityMeters.innerHTML = '';
        [
          { fr: 'Diversité alimentaire minimale', en: 'Minimum dietary diversity', v: n.dietaryDiversity, t: 60 },
          { fr: 'Fréquence minimale des repas', en: 'Minimum meal frequency', v: n.minimumMealFreq, t: 80 },
          { fr: 'Alimentation de complément', en: 'Complementary feeding', v: n.complementary, t: 80 },
          { fr: 'Allaitement exclusif', en: 'Exclusive breastfeeding', v: n.exclusiveBF, t: 70 },
          { fr: 'Sel iodé', en: 'Iodised salt', v: n.iodisedSalt, t: 90 },
          { fr: 'Supplémentation vitamine A', en: 'Vitamin A supplementation', v: n.vitASupp, t: 80 }
        ].forEach(x => qualityMeters.appendChild(K.meter(label(x), x.v, 100, {
          format: v => fmt.num(v, 0) + ' %', tone: x.v >= x.t ? 'ok' : x.v >= x.t * .8 ? 'warn' : 'risk'
        })));
        qualityMeters.appendChild(K.note(T('Indice composite <b>' + score + '/100</b> · ' + fmt.num(ns.critical.length, 0) + ' cibles mère-enfant non atteintes · priorité : ' +
          (ns.critical[0] ? label(ns.critical[0]) : '—'),
          'Composite index <b>' + score + '/100</b> · ' + fmt.num(ns.critical.length, 0) + ' maternal & child targets missed · priority: ' +
          (ns.critical[0] ? label(ns.critical[0]) : '—')), 'info'));
      }

      function drawGroups() {
        const ds = getDs(), sup = ds.diet.supply;
        const groups = [
          { fr: T('Céréales & tubercules', 'Cereals & tubers'), v: sup.cerealsTubers, c: '#c9ee59' },
          { fr: T('Légumineuses', 'Legumes'), v: sup.legumes, c: '#18d67f' },
          { fr: T('Fruits & légumes', 'Fruit & vegetables'), v: sup.fruitsVeg, c: '#3fc8f0' },
          { fr: T('Oléagineux & noix', 'Oilseeds & nuts'), v: sup.oilsNuts, c: '#f5b642' },
          { fr: T('Produits animaux', 'Animal products'), v: sup.animal, c: '#ff6b5e' },
          { fr: T('Cultures de rente (sucre, boissons)', 'Cash crops (sugar, drinks)'), v: sup.sugarCash, c: '#f472b6' }
        ];
        const total = groups.reduce((a, g) => a + Math.max(0, g.v), 0) || 1;
        K.chart('bars', groupHost, {
          horizontal: true,
          labels: groups.map(g => g.fr),
          series: [
            { name: T('kg/hab/an', 'kg/cap/yr'), data: groups.map(g => g.v), color: null },
            { name: T('Part du total (%)', 'Share of total (%)'), data: groups.map(g => g.v / total * 100), color: 'rgba(255,255,255,.18)' }
          ],
          format: x => fmt.num(x, 1),
          colorScale: (x, i) => groups[i].c
        });
        const cashShare = sup.sugarCash / total * 100;
        groupNote.innerHTML = T('Les cultures de rente et produits transformés ne pèsent que <b>' + fmt.pct(cashShare, 1) + '</b> de la masse disponible, mais leur densité en sucres libres est bien plus élevée : ' +
          'c’est le principal vecteur des ' + fmt.num(ds.diet.sugarG, 0) + ' g/j de sucres libres et, indirectement, du risque métabolique. Céréales & tubercules (' + fmt.num(sup.cerealsTubers, 0) + ' kg) assurent l’essentiel de l’énergie.',
          'Cash crops and processed products account for only <b>' + fmt.pct(cashShare, 1) + '</b> of available mass, yet their free-sugar density is far higher: ' +
          'the main vector of the ' + fmt.num(ds.diet.sugarG, 0) + ' g/day of free sugars and, indirectly, of metabolic risk. Cereals & tubers (' + fmt.num(sup.cerealsTubers, 0) + ' kg) provide most of the energy.');
      }

      function drawLink() {
        const ds = getDs(), ag = agriDossier();
        linkHost.innerHTML = '';
        const sup = ds.diet.supply;
        linkHost.appendChild(K.flow([
          { label: T('Production agricole', 'Farm production'), value: ag && ag.crops ? fmt.num(ag.crops.reduce((a, c) => a + (c.valueTons || c.value || 0), 0) / 1e6, 2) + ' Mt' : fmt.num(sup.cerealsTubers, 0) + ' kg', sub: ag ? T('toutes cultures', 'all crops') : T('céréales/hab', 'cereals/cap') },
          { label: T('Disponibilité', 'Availability'), value: fmt.num(Object.keys(sup).filter(k => typeof sup[k] === 'number').reduce((a, k) => k === 'priceLevel' ? a : a + sup[k], 0), 0) + ' kg', sub: T('par habitant/an', 'per capita/yr') },
          { label: T('Apports', 'Intake'), value: fmt.num(ds.diet.intakePerCapKcal, 0) + ' kcal', sub: fmt.num(ds.diet.sugarG, 0) + ' g ' + T('sucres libres', 'free sugars') },
          { label: T('Risque', 'Risk'), value: fmt.num(ds.ncd.riskScore, 0) + '/100', sub: T('indice composite', 'composite index') },
          { label: T('Charge', 'Burden'), value: fmt.num(ds.burden.dietAttributableDeaths, 0), sub: T('décès attribuables/an', 'diet-attributable deaths/yr') }
        ]));
        linkHost.appendChild(K.note(ag
          ? T('<b>Liaison active :</b> le dossier agricole du pays est chargé — les disponibilités, les prix et les pertes proviennent de la cellule Agriculture. Rebondissez vers la section pour agir à la source (reformulation, prix, pertes).',
            '<b>Active link:</b> the country’s agriculture dossier is loaded — availability, prices and losses come from the Agriculture cell. Jump to that section to act upstream (reformulation, prices, losses).')
          : T('<b>Liaison inactive :</b> ouvrez la section Agriculture sur la même page pour coupler production, pertes et prix aux apports alimentaires.',
            '<b>Link inactive:</b> open the Agriculture section on the same page to couple production, losses and prices with dietary intake.'), ag ? 'ok' : 'warn'));
        const row = h('div.nx-row', { style: { marginTop: '8px' } }, [
          K.btn(T('Voir la nutrition en agriculture', 'See nutrition in Agriculture'), { icon: '🌾', onClick: () => jumpTo('agri', 'nutrition') }),
          K.btn(T('Voir les prix & marchés', 'See prices & markets'), { icon: '💱', onClick: () => jumpTo('agri', 'markets') }),
          K.btn(T('Exporter la chaîne', 'Export the chain'), { icon: '⇩', onClick: () => K.exportRows(DS_CHAIN.get(), 'chaine-alimentaire', ds.country + '-' + ds.year) })
        ]);
        linkHost.appendChild(row);
        DS_CHAIN.refresh();
      }
      const DS_CHAIN = {
        refresh() { }, get() {
          const ds = getDs(), sup = ds.diet.supply;
          return [
            { etape: 'Production disponible', cereales_tub_kg: +sup.cerealsTubers.toFixed(1), legumineuses_kg: +sup.legumes.toFixed(1), fruits_legumes_kg: +sup.fruitsVeg.toFixed(1), oleagineux_kg: +sup.oilsNuts.toFixed(1), animaux_kg: +sup.animal.toFixed(1), cultures_rente_kg: +sup.sugarCash.toFixed(1) },
            { etape: 'Apports estimés', kcal_j: Math.round(ds.diet.intakePerCapKcal), sucres_libres_g_j: +ds.diet.sugarG.toFixed(1), sodium_mg_j: Math.round(ds.diet.sodiumMg), fibres_g_j: +ds.diet.fiberG.toFixed(1), fruits_legumes_g_j: Math.round(ds.diet.fruitVegG) },
            { etape: 'Risque & charge', diabete_pct: +ds.ncd.diabetes.toFixed(1), hypertension_pct: +ds.ncd.hypertension.toFixed(1), deces_attribuables_an: Math.round(ds.burden.dietAttributableDeaths), daly_attribuables: Math.round(ds.burden.dalys * ds.burden.dietAttributableDalyPct / 100) }
          ];
        }
      };

      function drawPolicy() {
        const ds = getDs(), ra = M.riskAttribution(ds);
        const rows = ra.rows.slice().sort((a, b) => b.dalyPer100k - a.dalyPer100k);
        K.chart('bars', policyHost, {
          horizontal: true,
          labels: rows.map(r => label(r)),
          series: [{ name: T('Charge attribuable (DALY/100k)', 'Attributable burden (DALY/100k)'), data: rows.map(r => r.dalyPer100k), color: null }],
          format: x => fmt.num(x, 0),
          colorScale: (x, i) => rows[i].color,
          onSelect: i => {
            const r = rows[i]; if (!r) return;
            policyNote.innerHTML = T('<b>' + label(r) + '</b> — PAF ' + fmt.pct(r.paf * 100, 1) + ' · ' + fmt.int(r.deaths) + ' décès/an · action : <b>' + label(r.action) + '</b>' +
              ' · levier chiffré : ' + label(M.LEVERS.find(l => l.k === ({ sodium: 'salt', sugar: 'sugar', ultra: 'labels', fiber: 'complementary', fruitveg: 'activity', satfat: 'salt' })[r.id]) || { fr: '—', en: '—' }) + '.',
              '<b>' + label(r) + '</b> — PAF ' + fmt.pct(r.paf * 100, 1) + ' · ' + fmt.int(r.deaths) + ' deaths/yr · action: <b>' + label(r.action) + '</b>' +
              ' · costed lever: ' + label(M.LEVERS.find(l => l.k === ({ sodium: 'salt', sugar: 'sugar', ultra: 'labels', fiber: 'complementary', fruitveg: 'activity', satfat: 'salt' })[r.id]) || { fr: '—', en: '—' }) + '.');
            K.toast('🎯 ' + label(r.action));
          }
        });
        const top = rows[0];
        policyNote.innerHTML = T('Priorité d’action : <b>' + label(top) + '</b> (' + fmt.num(top.dalyPer100k, 0) + ' DALY/100k évitables). Chaque mesure est chiffrée dans l’onglet Investissement, avec son coût par DALY.',
          'Action priority: <b>' + label(top) + '</b> (' + fmt.num(top.dalyPer100k, 0) + ' avoidable DALY/100k). Every measure is costed in the Investment tab with its cost per DALY.');
      }

      function draw() { renderKpis(); drawDiet(); drawBurden(); drawQuality(); drawGroups(); drawLink(); drawPolicy(); }
      draw();
      return { render: () => draw() };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 6 — PRÉVISION, SCÉNARIOS & RISQUE                               */
  /* ======================================================================= */
  K.registerTab({
    id: 'forecast', icon: '📈', label: T('Prévision & scénarios', 'Forecast & scenarios'), labelT: ['Prévision & scénarios', 'Forecast & scenarios'],
    mount(host) {
      const kpis = K.kpiBand();
      const stt = st();

      const fanCard = K.card({
        title: T('Trajectoire projetée à 10 ans', '10-year projected trajectory'),
        sub: T('Réalisé, projection, intervalle 80 % et cible nationale', 'Actual, projection, 80% interval and national target'), span: 3,
        actions: [
          K.select(M.METRICS ? Object.keys(M.METRICS).map(k => ({ value: k, label: label(M.METRICS[k]) })) : [], stt.metric || 'stunting', v => { stt.metric = v; drawFan(); }),
          K.segmented([
            { value: 'baseline', label: T('Tendance', 'Trend') },
            { value: 'prevention', label: T('Prévention', 'Prevention') },
            { value: 'accelerated', label: T('Accéléré', 'Accelerated') },
            { value: 'inaction', label: T('Inaction', 'Inaction') }
          ], M.SCENARIOS[stt.scenario] ? stt.scenario : 'prevention',
            v => { stt.scenario = M.SCENARIOS[v] ? v : 'prevention'; drawFan(); drawScenarios(); drawMC(); })
        ]
      });
      const fanHost = K.chartHost('lg');
      const fanNote = h('div.nx-note');
      fanCard.body.appendChild(fanHost); fanCard.body.appendChild(fanNote);

      const scenCard = K.card({
        title: T('Quatre futurs comparés', 'Four futures compared'),
        sub: T('Même point de départ, quatre trajectoires de politique publique', 'Same starting point, four public-policy trajectories'), span: 3,
        actions: [K.slider({
          label: T('Horizon (années)', 'Horizon (years)'), min: 3, max: 20, value: stt.horizon || 10, format: v => fmt.num(v, 0) + ' ' + T('ans', 'yrs'),
          oninput: v => { stt.horizon = v; drawScenarios(); drawFan(); }
        })]
      });
      const scenHost = K.chartHost('lg');
      const scenNote = h('div.nx-mini.nx-muted');
      scenCard.body.appendChild(scenHost); scenCard.body.appendChild(scenNote);

      const mcCard = K.card({ title: T('Monte-Carlo du risque futur', 'Monte-Carlo of future risk'), sub: T('4 000 simulations : charge P10 / P50 / P90 à l’horizon', '4,000 simulations: P10 / P50 / P90 burden at horizon'), span: 3 });
      const mcHost = K.chartHost('lg');
      const mcNote = h('div.nx-note');
      mcCard.body.appendChild(mcHost); mcCard.body.appendChild(mcNote);

      const sensCard = K.card({ title: T('Sensibilité de la charge', 'Burden sensitivity'), sub: T('Effet d’une variation de ±10 % de chaque moteur', 'Effect of a ±10% change in each driver'), span: 3 });
      const sensHost = K.chartHost('lg');
      const sensNote = h('div.nx-mini.nx-muted');
      sensCard.body.appendChild(sensHost); sensCard.body.appendChild(sensNote);

      const tableCard = K.card({ title: T('Tableau de bord des projections', 'Projection dashboard'), sub: T('Tous les indicateurs, valeur actuelle / horizon / cible', 'All indicators, current / horizon / target'), span: 4 });
      const tableHost = h('div');
      tableCard.body.appendChild(tableHost);

      const targetCard = K.card({ title: T('Atteinte des cibles', 'Target attainment'), sub: T('Feuille de route : où en est le pays, et à quelle échéance', 'Roadmap: where the country stands and by when'), span: 2 });
      const targetHost = h('div.nx-stack');
      targetCard.body.appendChild(targetHost);

      host.appendChild(h('div.nx-grid.g-6', null, [
        kpis, fanCard.el, scenCard.el, mcCard.el, sensCard.el, tableCard.el, targetCard.el
      ]));

      function currentCfg() {
        return { metric: stt.metric || 'stunting', horizon: stt.horizon || 10, scenario: stt.scenario || 'prevention', plan: stt.plan ? { intensity: planIntensity() } : null };
      }
      function planIntensity() {
        if (!stt.plan) return 0;
        const vals = Object.keys(stt.plan).map(k => stt.plan[k] || 0);
        return S.mean(vals);
      }
      let mcCache = null, mcKey = '';
      function getMC() {
        const ds = getDs(), key = ds.country + ds.year + (stt.horizon || 10);
        if (mcCache && mcKey === key) return mcCache;
        mcCache = M.burdenMC(ds, { runs: 4000, horizon: stt.horizon || 10 });
        mcKey = key;
        return mcCache;
      }

      function renderKpis() {
        const ds = getDs(), f = M.forecast(ds, currentCfg());
        const last = f.history[f.history.length - 1], end = f.point[f.point.length - 1];
        const mc = getMC();
        kpis.innerHTML = '';
        [
          K.kpi({ label: T('Valeur actuelle', 'Current value'), value: fmt.num(last, 1), unit: f.def.unit || '', source: 'reported', foot: fmt.num(ds.history.years[0], 0) + ' → ' + fmt.num(ds.year, 0) }),
          K.kpi({ label: T('Projection ', 'Projection ') + (ds.year + (stt.horizon || 10)), value: fmt.num(end, 1), unit: f.def.unit || '', tone: (f.def.dir === 'down' ? end > last : end < last) ? 'hot' : 'good', delta: last ? (end - last) / last * 100 : 0, foot: T('scénario ', 'scenario ') + label(M.SCENARIOS[stt.scenario || 'prevention']) }),
          K.kpi({ label: T('Erreur de backtest', 'Backtest error'), value: isFinite(f.diagnostics.mape) ? fmt.num(f.diagnostics.mape, 2) : '—', unit: '%', foot: 'R² ' + fmt.num(f.diagnostics.r2, 2) + ' · MAE ' + fmt.num(f.diagnostics.mae, 2), source: null }),
          K.kpi({ label: T('Cible nationale', 'National target'), value: f.target != null ? fmt.num(f.target, 0) : '—', unit: f.def.unit || '', tone: f.gapToTarget && f.gapToTarget.reached ? 'good' : 'hot', foot: f.gapToTarget ? (f.gapToTarget.reached ? T('atteinte dans l’horizon', 'met within horizon') : T('non atteinte', 'not met')) : T('pas de cible OMS', 'no WHO target') }),
          K.kpi({ label: T('Charge médiane projetée', 'Median projected burden'), value: fmt.num(mc.dalys.p50, 0), unit: 'DALY/100k', tone: mc.dalys.p50 > ds.burden.dalysPer100k ? 'hot' : 'good', foot: 'P10 ' + fmt.num(mc.dalys.p10, 0) + ' · P90 ' + fmt.num(mc.dalys.p90, 0) }),
          K.kpi({ label: T('Probabilité de dégradation', 'Probability of deterioration'), value: fmt.num(mc.probBurdenUp, 1), unit: '%', tone: mc.probBurdenUp > 60 ? 'hot' : '', foot: fmt.int(mc.runs) + ' ' + T('tirages · diabète ↑ ', 'runs · diabetes ↑ ') + fmt.pct(mc.probDiabetesUp, 0) })
        ].forEach(x => kpis.appendChild(x));
        U.animateKpis(kpis);
      }

      function drawFan() {
        const ds = getDs(), f = M.forecast(ds, currentCfg());
        K.chart('line', fanHost, {
          labels: f.labels,
          series: [
            { name: T('Réalisé', 'Actual'), data: f.history.concat(new Array(f.point.length).fill(null)), color: '#c9ee59', area: true, points: f.history.length <= 12 },
            { name: T('Projection', 'Projection'), data: new Array(f.history.length - 1).fill(null).concat([f.history[f.history.length - 1]]).concat(f.point), color: '#3fc8f0', dash: true, points: true },
            { name: T('Incertitude 80 %', '80% uncertainty'), data: [], bandLo: f.history.concat(f.lo), bandHi: f.history.concat(f.hi), color: '#3fc8f0' }
          ],
          target: f.target, targetLabel: T('cible nationale', 'national target'), xTicks: 8,
          format: v => f.def.unit === '%' ? fmt.num(v, 1) + ' %' : fmt.num(v, 0)
        });
        const d = f.diagnostics, last = f.history[f.history.length - 1], end = f.point[f.point.length - 1];
        fanNote.innerHTML = T('<b>' + label(f.def) + '</b> : ' + fmt.num(last, 1) + ' → <b>' + fmt.num(end, 1) + '</b> en ' + (ds.year + (stt.horizon || 10)) +
          ' · tendance ' + fmt.signed(d.trendPct, 1) + ' % · biais ' + fmt.signed(d.bias, 2) + ' · erreur moyenne ' + (isFinite(d.mape) ? fmt.num(d.mape, 2) + ' %' : 'n/a') + '. ' +
          (f.gapToTarget ? (f.gapToTarget.reached ? T('La cible nationale est atteinte dans l’horizon retenu.', 'The national target is met within the chosen horizon.') : T('La cible nationale (' + f.gapToTarget.target + ') n’est pas atteinte : intensifier les leviers ou allonger l’horizon.', 'The national target (' + f.gapToTarget.target + ') is not met: strengthen levers or extend the horizon.')) : ''),
          '<b>' + label(f.def) + '</b>: ' + fmt.num(last, 1) + ' → <b>' + fmt.num(end, 1) + '</b> by ' + (ds.year + (stt.horizon || 10)) +
          ' · trend ' + fmt.signed(d.trendPct, 1) + '% · bias ' + fmt.signed(d.bias, 2) + ' · average error ' + (isFinite(d.mape) ? fmt.num(d.mape, 2) + '%' : 'n/a') + '. ' +
          (f.gapToTarget ? (f.gapToTarget.reached ? T('The national target is met within the chosen horizon.', 'The national target is met within the chosen horizon.') : T('The national target (' + f.gapToTarget.target + ') is not met: strengthen levers or extend the horizon.', 'The national target (' + f.gapToTarget.target + ') is not met: strengthen levers or extend the horizon.')) : ''));
      }

      function drawScenarios() {
        const ds = getDs(), keys = Object.keys(M.SCENARIOS);
        const cfgBase = currentCfg();
        const ref = M.forecast(ds, Object.assign({}, cfgBase, { scenario: 'baseline' }));
        const labels = ref.labels;
        const series = keys.map((k, i) => {
          const f = M.forecast(ds, Object.assign({}, cfgBase, { scenario: k }));
          return {
            name: label(M.SCENARIOS[k]),
            data: new Array(f.history.length - 1).fill(null).concat([f.history[f.history.length - 1]]).concat(f.point),
            color: ['#9fbfac', '#18d67f', '#3fc8f0', '#ff6b5e'][i],
            dash: k === 'inaction'
          };
        });
        K.chart('line', scenHost, {
          labels, series, target: ref.target, targetLabel: T('cible', 'target'), xTicks: 8,
          format: v => ref.def.unit === '%' ? fmt.num(v, 1) + ' %' : fmt.num(v, 0)
        });
        const ends = series.map(s => s.data[s.data.length - 1]);
        const gap = Math.abs(ends[1] - ends[3]);
        scenNote.innerHTML = T('Écart ' + label(M.SCENARIOS.prevention) + ' ↔ ' + label(M.SCENARIOS.inaction) + ' à l’horizon : <b>' + fmt.num(gap, 1) + ' points</b> sur ' +
          label(M.METRICS[stt.metric || 'stunting']) + ' — c’est la valeur de la décision politique.',
          'Gap ' + label(M.SCENARIOS.prevention) + ' ↔ ' + label(M.SCENARIOS.inaction) + ' at horizon: <b>' + fmt.num(gap, 1) + ' points</b> on ' +
          label(M.METRICS[stt.metric || 'stunting']) + ' — that is the value of the policy decision.');
      }

      function drawMC() {
        const ds = getDs(), mc = getMC();
        const h1 = M.burdenMC(ds, { runs: 1500, horizon: 5 });
        K.chart('bars', mcHost, {
          labels: ['5 ' + T('ans', 'yrs'), (stt.horizon || 10) + ' ' + T('ans', 'yrs')],
          series: [
            { name: 'P10', data: [h1.dalys.p10, mc.dalys.p10], color: '#3fc8f0' },
            { name: 'P50', data: [h1.dalys.p50, mc.dalys.p50], color: '#c9ee59' },
            { name: 'P90', data: [h1.dalys.p90, mc.dalys.p90], color: '#ff6b5e' }
          ],
          format: v => fmt.num(v, 0),
          target: ds.burden.dalysPer100k, targetLabel: T('charge actuelle', 'current burden')
        });
        mcNote.innerHTML = T('La charge projetée à ' + (stt.horizon || 10) + ' ans est comprise entre <b>' + fmt.num(mc.dalys.p10, 0) + '</b> et <b>' + fmt.num(mc.dalys.p90, 0) +
          '</b> DALY/100k (médiane ' + fmt.num(mc.dalys.p50, 0) + '). Probabilité que la charge augmente : <b>' + fmt.pct(mc.probBurdenUp, 1) + '</b> · probabilité que le retard de croissance recule de plus de 10 % : <b>' + fmt.pct(mc.probStuntingDown, 1) + '</b>.',
          'The projected burden at ' + (stt.horizon || 10) + ' years lies between <b>' + fmt.num(mc.dalys.p10, 0) + '</b> and <b>' + fmt.num(mc.dalys.p90, 0) +
          '</b> DALY/100k (median ' + fmt.num(mc.dalys.p50, 0) + '). Probability the burden rises: <b>' + fmt.pct(mc.probBurdenUp, 1) + '</b> · probability stunting falls by more than 10%: <b>' + fmt.pct(mc.probStuntingDown, 1) + '</b>.');
      }

      function drawSens() {
        const ds = getDs(), s = M.sensitivity(ds);
        const rows = s.drivers.slice(0, 9);
        K.chart('bars', sensHost, {
          horizontal: true, stacked: false,
          labels: rows.map(r => label(r)),
          series: [
            { name: T('Si −10 %', 'If −10%'), data: rows.map(r => r.low), color: '#3fc8f0' },
            { name: T('Si +10 %', 'If +10%'), data: rows.map(r => r.high), color: '#ff6b5e' }
          ],
          format: v => fmt.signed(v, 2) + ' %',
          target: 0, targetLabel: T('charge actuelle', 'current burden')
        });
        const top = rows[0];
        sensNote.innerHTML = T('Moteur le plus influent : <b>' + label(top) + '</b> (élasticité ' + fmt.num(top.elasticity, 3) + '). Agir sur ces moteurs, c’est agir sur toute la charge future.',
          'Most influential driver: <b>' + label(top) + '</b> (elasticity ' + fmt.num(top.elasticity, 3) + '). Acting on these drivers means acting on the entire future burden.');
      }

      function drawTable() {
        const ds = getDs(), hz = stt.horizon || 10;
        const rows = Object.keys(M.METRICS).map(k => {
          const m = M.METRICS[k];
          const f = M.forecast(ds, { metric: k, horizon: hz, scenario: stt.scenario || 'prevention', plan: { intensity: planIntensity() } });
          const hist = f.history[f.history.length - 1], end = f.point[f.point.length - 1];
          const tgt = ds.targets[k];
          return {
            metric: label(m), current: hist, projected: end, target: tgt && tgt.target != null ? tgt.target : null,
            change: hist ? (end - hist) / hist * 100 : 0,
            reach: tgt && tgt.target != null ? (m.dir === 'up' ? end >= tgt.target : end <= tgt.target) : null,
            mape: f.diagnostics.mape, dir: m.dir
          };
        });
        if (tableHost._t) { tableHost._t.setRows(rows); return; }
        tableHost._t = K.dataTable(tableHost, {
          columns: [
            { id: 'metric', label: T('Indicateur', 'Indicator'), width: '1.6fr' },
            { id: 'current', label: fmt.num(ds.year, 0), align: 'right', format: (r, v) => fmt.num(v, 1) },
            { id: 'projected', label: fmt.num(ds.year + hz, 0), align: 'right', format: (r, v) => fmt.num(v, 1), bar: r => Math.min(100, Math.abs(r.change) * 3) },
            { id: 'change', label: T('Variation', 'Change'), align: 'right', format: (r, v) => fmt.signed(v, 1) + ' %' },
            { id: 'target', label: T('Cible', 'Target'), align: 'right', format: (r, v) => v == null ? '—' : fmt.num(v, 0) },
            { id: 'reach', label: T('Atteinte', 'Reached'), align: 'right', format: (r, v) => v == null ? '—' : v ? '✓' : '✗' },
            { id: 'mape', label: 'MAPE', align: 'right', format: (r, v) => isFinite(v) ? fmt.num(v, 2) + ' %' : '—' }
          ],
          rows, pageSize: 12,
          onRow: r => { stt.metric = Object.keys(M.METRICS).find(k => label(M.METRICS[k]) === r.metric) || stt.metric; drawFan(); renderKpis(); K.toast('📈 ' + r.metric); }
        });
      }

      function drawTargets() {
        const ds = getDs(), hz = stt.horizon || 10;
        targetHost.innerHTML = '';
        Object.keys(ds.targets).forEach(k => {
          const t = ds.targets[k];
          if (t.target == null) return;
          const src = k === 'anaemiaWomen' ? ds.nutrition.anaemiaWomen
            : k === 'anaemiaChildren' ? ds.nutrition.anaemiaChildren
              : k === 'overweightChild' ? ds.nutrition.overweightChild
                : k === 'hypertensionControl' ? ds.ncd.hypertensionControlled
                  : k === 'diabetesControl' ? ds.ncd.diabetesControlled
                    : k === 'insurance' ? ds.services.insurance
                      : (ds.nutrition[k] != null ? ds.nutrition[k] : ds.ncd[k] != null ? ds.ncd[k] : ds.services[k]);
          if (src == null) return;
          const ratio = t.dir === 'up' ? src / t.target : t.target / Math.max(.001, src);
          targetHost.appendChild(K.meter(label(t.label), Math.min(120, ratio * 100), 120, {
            format: v => fmt.pct(src, 0) + ' / ' + fmt.num(t.target, 0) + ' %',
            tone: ratio >= 1 ? 'ok' : ratio >= .8 ? 'warn' : 'risk'
          }));
        });
        const ns = M.nutritionStatus(ds);
        targetHost.appendChild(K.note(T('<b>' + fmt.num(ns.score, 0) + '/100</b> des cibles atteintes (moyenne pondérée) · horizon de projection : ' + hz + ' ans · ' + (ns.critical[0] ? 'priorité n°1 : ' + label(ns.critical[0]) : 'toutes les cibles sont atteintes'),
          '<b>' + fmt.num(ns.score, 0) + '/100</b> of targets met (weighted average) · projection horizon: ' + hz + ' yrs · ' + (ns.critical[0] ? 'top priority: ' + label(ns.critical[0]) : 'all targets met')), ns.critical.length ? 'warn' : 'ok'));
      }

      function draw() { renderKpis(); drawFan(); drawScenarios(); drawMC(); drawSens(); drawTable(); drawTargets(); }
      draw();
      return { render: () => { mcCache = null; draw(); } };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 7 — INVESTISSEMENT & PRÉVENTION                                 */
  /* ======================================================================= */
  K.registerTab({
    id: 'investment', icon: '💰', label: T('Investissement & prévention', 'Investment & prevention'), labelT: ['Investissement & prévention', 'Investment & prevention'],
    mount(host) {
      const kpis = K.kpiBand();
      const stt = st();
      stt.budget = stt.budget || 45e6;
      stt.priority = stt.priority || 'lives';

      const buildCard = K.card({
        title: T('Construire le portefeuille de prévention', 'Build the prevention portfolio'), accent: true,
        sub: T('Budget annuel, priorité politique, puis optimisation automatique des 60 mesures', 'Annual budget, policy priority, then automatic optimisation of the 60 measures'), span: 3,
        actions: [
          K.btn(T('Optimiser', 'Optimise'), { variant: 'primary', icon: '🎯', onClick: () => { drawAll(); K.toast('🎯 ' + T('Portefeuille optimisé', 'Portfolio optimised')); } }),
          K.btn(T('Tout financer', 'Fund everything'), { icon: '∞', onClick: () => { stt.budget = 3e9; syncBudget(); drawAll(); K.toast('💰 ' + T('Budget élargi', 'Budget widened')); } }),
          K.btn(T('Scénario : prévention', 'Use in forecast'), { icon: '↗', onClick: () => { stt.scenario = 'prevention'; K.showTab('forecast'); } })
        ]
      });
      const buildHost = h('div.nx-stack');
      const budgetRow = h('div.nx-row.between');
      buildCard.body.appendChild(buildHost); buildCard.body.appendChild(budgetRow);

      const frontierCard = K.card({ title: T('Frontière coût-efficacité', 'Cost-effectiveness frontier'), sub: T('Coût par DALY évité — la ligne rouge est le seuil OMS (3 × PIB/hab)', 'Cost per DALY averted — red line is the WHO threshold (3 × GDP/capita)'), span: 3 });
      const frontierHost = K.chartHost('lg');
      const frontierNote = h('div.nx-mini.nx-muted');
      frontierCard.body.appendChild(frontierHost); frontierCard.body.appendChild(frontierNote);

      const mixCard = K.card({ title: T('Répartition du portefeuille', 'Portfolio allocation'), sub: T('Par groupe d’intervention', 'By intervention group'), span: 2 });
      const mixHost = K.chartHost('sm');
      const mixNote = h('div.nx-mini.nx-muted');
      mixCard.body.appendChild(mixHost); mixCard.body.appendChild(mixNote);

      const regionCard = K.card({ title: T('Allocation régionale', 'Regional allocation'), sub: T('DALY évités et budget par région', 'DALYs averted and budget by region'), span: 4 });
      const regionHost = K.chartHost('lg');
      const regionNote = h('div.nx-note');
      regionCard.body.appendChild(regionHost); regionCard.body.appendChild(regionNote);

      const tableCard = K.card({ title: T('Portefeuille détaillé', 'Detailed portfolio'), sub: T('Mesures retenues, coût, DALY évités, rapport bénéfice/coût — cliquez pour cibler', 'Selected measures, cost, DALYs averted, benefit/cost — click to target'), span: 4 });
      const tableHost = h('div');
      tableCard.body.appendChild(tableHost);

      const financeCard = K.card({ title: T('Financement', 'Financing'), sub: T('Structure de financement recommandée', 'Recommended financing structure'), span: 2 });
      const financeHost = K.chartHost('sm');
      const financeNote = h('div.nx-mini.nx-muted');
      financeCard.body.appendChild(financeHost); financeCard.body.appendChild(financeNote);

      const roiCard = K.card({ title: T('Retour économique', 'Economic return'), sub: T('Coût → bénéfice sanitaire → bénéfice net', 'Cost → health benefit → net benefit'), span: 3 });
      const roiHost = K.chartHost('lg');
      roiCard.body.appendChild(roiHost);

      const prioCard = K.card({ title: T('Trois façons de dépenser le même budget', 'Three ways to spend the same budget'), sub: T('Vies sauvées, équité ou rendement économique', 'Lives saved, equity or economic return'), span: 3 });
      const prioHost = K.chartHost('lg');
      const prioNote = h('div.nx-note');
      prioCard.body.appendChild(prioHost); prioCard.body.appendChild(prioNote);

      const leverCard = K.card({ title: T('Les 12 leviers et leur coût', 'The 12 levers and their cost'), sub: T('USD par habitant et par an', 'USD per capita per year'), span: 6 });
      const leverHost = K.chartHost('lg');
      leverCard.body.appendChild(leverHost);

      host.appendChild(h('div.nx-grid.g-6', null, [
        kpis, buildCard.el, frontierCard.el, mixCard.el, regionCard.el, tableCard.el, financeCard.el, roiCard.el, prioCard.el, leverCard.el
      ]));

      /* --------------------------------------------------------- commande */
      const budgetLabel = h('b.nx-num', { text: fmt.money(stt.budget, getDs().country) });
      const budgetSlider = K.slider({
        label: T('Budget annuel mobilisable', 'Annual available budget'), min: 5, max: 400, step: 5,
        value: Math.round(stt.budget / 1e6), format: v => fmt.money(v * 1e6, getDs().country),
        oninput: v => { stt.budget = v * 1e6; budgetLabel.textContent = fmt.money(stt.budget, getDs().country); drawAll(); }
      });
      const prioSeg = K.segmented([
        { value: 'lives', label: T('Maximiser les vies', 'Maximise lives') },
        { value: 'equity', label: T('Maximiser l’équité', 'Maximise equity') },
        { value: 'economy', label: T('Maximiser le rendement', 'Maximise return') }
      ], stt.priority, v => { stt.priority = v; drawAll(); K.toast('⚖ ' + T('Priorité : ', 'Priority: ') + v); });
      buildHost.appendChild(h('div.nx-row.between', null, [h('span.nx-mini.nx-dim', { text: T('Enveloppe annuelle', 'Annual envelope') }), budgetLabel]));
      buildHost.appendChild(budgetSlider);
      buildHost.appendChild(h('div.nx-mini.nx-dim', { text: T('Priorité politique', 'Policy priority') }));
      buildHost.appendChild(prioSeg);
      const advRow = h('div.nx-row', { style: { marginTop: '8px' } });
      buildCard.body.appendChild(advRow);
      advRow.appendChild(K.btn(T('Comparer les 3 priorités', 'Compare the 3 priorities'), { icon: '⚖', onClick: drawPriorities }));
      advRow.appendChild(K.btn(T('Exporter le portefeuille', 'Export portfolio'), { icon: '⇩', onClick: () => K.exportRows(currentPlan().plan.map(x => ({
        mesure: x.fr, group: x.group, region: x.region, cout_usd: Math.round(x.costUsd), daly_evites: +x.dalys.toFixed(1),
        deces_evites: +x.deaths.toFixed(2), cout_par_daly_usd: +x.costPerDaly.toFixed(0), rapport_benefice_cout: +x.bcr.toFixed(2)
      })), 'portefeuille-sante', getDs().country + '-' + getDs().year) }));

      function syncBudget() { budgetSlider._set(Math.round(stt.budget / 1e6)); budgetLabel.textContent = fmt.money(stt.budget, getDs().country); }
      let catalogue = null, planCache = null, planKey = '';
      function getCatalogue() { const ds = getDs(); if (!catalogue) catalogue = M.interventions(ds); return catalogue; }
      function currentPlan() {
        const ds = getDs(), key = ds.country + ds.year + stt.budget + stt.priority;
        if (planCache && planKey === key) return planCache;
        planCache = M.optimizeBudget(ds, getCatalogue(), stt.budget, { priority: stt.priority });
        planKey = key;
        return planCache;
      }

      /* ------------------------------------------------------------ dessins */
      function renderKpis() {
        const ds = getDs(), opt = currentPlan();
        kpis.innerHTML = '';
        [
          K.kpi({ label: T('Budget engagé', 'Budget committed'), value: fmt.money(opt.spentUsd, ds.country), foot: fmt.pct(opt.spentUsd / Math.max(1, opt.budgetUsd) * 100, 0) + ' ' + T('de l’enveloppe', 'of the envelope') }),
          K.kpi({ label: T('DALY évités / an', 'DALYs averted / yr'), value: fmt.num(opt.dalys, 0), tone: 'good', foot: fmt.num(opt.dalysPerMillion, 0) + ' DALY / M$' }),
          K.kpi({ label: T('Vies sauvées / an', 'Lives saved / yr'), value: fmt.int(opt.deaths), tone: 'good', foot: T('dont enfants & mères', 'including children & mothers') }),
          K.kpi({ label: T('Rapport bénéfice/coût', 'Benefit/cost ratio'), value: fmt.num(opt.bcr, 1), unit: '×', tone: 'good', foot: T('valeur du DALY = 1,6 × PIB/hab', 'DALY value = 1.6 × GDP/cap') }),
          K.kpi({ label: T('Coût par DALY', 'Cost per DALY'), value: fmt.money(opt.spentUsd / Math.max(1, opt.dalys), ds.country), tone: opt.spentUsd / Math.max(1, opt.dalys) < ds.profile.gdp * 3 ? 'good' : 'hot', foot: T('seuil OMS ', 'WHO threshold ') + fmt.money(ds.profile.gdp * 3, ds.country) }),
          K.kpi({ label: T('Couverture & emplois', 'Coverage & jobs'), value: fmt.int(opt.coverageRegions), unit: T('régions', 'regions'), foot: fmt.int(opt.jobs) + ' ' + T('emplois directs', 'direct jobs') + ' · ' + opt.plan.length + ' ' + T('mesures', 'measures') })
        ].forEach(x => kpis.appendChild(x));
        U.animateKpis(kpis);
      }

      function drawFrontier() {
        const ds = getDs(), cat = getCatalogue();
        const rows = cat.slice().sort((a, b) => a.costPerDaly - b.costPerDaly).slice(0, 22);
        const threshold = ds.profile.gdp * 3;
        K.chart('bars', frontierHost, {
          labels: rows.map(r => r.fr.length > 26 ? r.fr.slice(0, 25) + '…' : r.fr),
          series: [{ name: T('Coût par DALY évité', 'Cost per DALY averted'), data: rows.map(r => r.costPerDaly), color: null }],
          format: v => fmt.money(v, ds.country),
          target: threshold, targetLabel: T('seuil OMS (3 × PIB/hab)', 'WHO threshold (3 × GDP/cap)'),
          colorScale: v => v < ds.profile.gdp ? '#18d67f' : v < threshold ? '#c9ee59' : '#ff6b5e',
          onSelect: i => {
            const r = rows[i]; if (!r) return;
            K.toast('💡 ' + r.fr + ' — ' + fmt.money(r.costPerDaly, ds.country) + ' / DALY');
          }
        });
        const cheap = rows.filter(r => r.costPerDaly < threshold).length;
        frontierNote.innerHTML = T('<b>' + cheap + '/' + rows.length + '</b> mesures du catalogue sont sous le seuil d’efficience de l’OMS · la moins chère : <b>' + rows[0].fr + '</b> à ' + fmt.money(rows[0].costPerDaly, ds.country) + ' par DALY · la plus chère : ' + fmt.money(rows[rows.length - 1].costPerDaly, ds.country) + '.',
          '<b>' + cheap + '/' + rows.length + '</b> measures in the catalogue are below the WHO efficiency threshold · cheapest: <b>' + rows[0].fr + '</b> at ' + fmt.money(rows[0].costPerDaly, ds.country) + ' per DALY · most expensive: ' + fmt.money(rows[rows.length - 1].costPerDaly, ds.country) + '.');
      }

      function drawMix() {
        const ds = getDs(), opt = currentPlan();
        const groups = {};
        opt.plan.forEach(x => { groups[x.group] = (groups[x.group] || 0) + x.costUsd; });
        const names = { depistage: T('Dépistage', 'Screening'), soins: T('Soins & contrôle', 'Care & control'), alimentation: T('Alimentation', 'Diet'), 'mère-enfant': T('Mère & enfant', 'Mother & child'), prevention: T('Prévention', 'Prevention'), systeme: T('Système', 'Health system') };
        const items = Object.keys(groups).map((g, i) => ({ label: names[g] || g, value: groups[g], color: ['#3fc8f0', '#18d67f', '#f5b642', '#f472b6', '#a78bfa', '#c9ee59'][i % 6] }));
        K.chart('donut', mixHost, {
          items, thickness: .58, centerLabel: T('budget engagé', 'budget committed'),
          format: v => fmt.money(v, ds.country)
        });
        mixNote.innerHTML = T('Le portefeuille équilibre dépistage (repérer les cas) et prise en charge (contrôler la maladie) : c’est la cascade qui sauve des vies.',
          'The portfolio balances screening (finding cases) and care (controlling disease): it is the cascade that saves lives.');
      }

      function drawRegions() {
        const ds = getDs(), opt = currentPlan();
        const rows = ds.regions.slice().sort((a, b) => b.risk - a.risk);
        const byRegion = rows.map(r => opt.plan.filter(x => x.region === r.name));
        K.chart('bars', regionHost, {
          labels: rows.map(r => r.name),
          series: [
            { name: T('DALY évités', 'DALYs averted'), data: byRegion.map(list => list.reduce((a, x) => a + x.dalys, 0)), color: '#18d67f' },
            { name: T('Budget engagé (M$ ×10)', 'Budget committed (M$ ×10)'), data: byRegion.map(list => list.reduce((a, x) => a + x.costUsd, 0) / 1e5), color: '#3fc8f0' }
          ],
          format: v => fmt.num(v, 0),
          onSelect: i => {
            const r = rows[i];
            stt.region = r.name;
            regionNote.innerHTML = T('<b>' + r.name + '</b> — ' + byRegion[i].length + ' mesures retenues · ' + fmt.num(byRegion[i].reduce((a, x) => a + x.dalys, 0), 0) + ' DALY évités · ' +
              fmt.money(byRegion[i].reduce((a, x) => a + x.costUsd, 0), ds.country) + ' · risque composite ' + r.risk + '/100 · cible prioritaire : ' + byRegion[i][0] ? label(byRegion[i][0] || { fr: '—', en: '—' }) : '—',
              '<b>' + r.name + '</b> — ' + byRegion[i].length + ' measures selected · ' + fmt.num(byRegion[i].reduce((a, x) => a + x.dalys, 0), 0) + ' DALYs averted · ' +
              fmt.money(byRegion[i].reduce((a, x) => a + x.costUsd, 0), ds.country) + ' · composite risk ' + r.risk + '/100');
            K.toast('📍 ' + r.name);
          }
        });
        regionNote.innerHTML = T('Priorité donnée aux régions au risque composite le plus élevé : l’optimiseur couvre <b>' + opt.coverageRegions + '/' + ds.regions.length + '</b> régions avec ' + fmt.money(opt.spentUsd, ds.country) + '.',
          'Priority given to the highest composite-risk regions: the optimiser covers <b>' + opt.coverageRegions + '/' + ds.regions.length + '</b> regions with ' + fmt.money(opt.spentUsd, ds.country) + '.');
      }

      function drawTable() {
        const ds = getDs(), opt = currentPlan();
        const rows = opt.plan.slice().sort((a, b) => b.dalys - a.dalys).map(x => ({
          mesure: x.fr, region: x.region, group: x.group, cost: x.costUsd, dalys: x.dalys, deaths: x.deaths,
          cpd: x.costPerDaly, bcr: x.bcr, equity: x.equity, evidence: x.evidence
        }));
        if (tableHost._t) { tableHost._t.setRows(rows); return; }
        tableHost._t = K.dataTable(tableHost, {
          columns: [
            { id: 'mesure', label: T('Mesure', 'Measure'), width: '2fr' },
            { id: 'region', label: T('Région', 'Region'), width: '1fr' },
            { id: 'cost', label: T('Coût', 'Cost'), align: 'right', format: (r, v) => fmt.money(v, ds.country) },
            { id: 'dalys', label: T('DALY évités', 'DALYs averted'), align: 'right', format: (r, v) => fmt.num(v, 0), bar: r => Math.min(100, r.dalys / 400) },
            { id: 'deaths', label: T('Vies', 'Lives'), align: 'right', format: (r, v) => fmt.num(v, 1) },
            { id: 'cpd', label: T('Coût/DALY', 'Cost/DALY'), align: 'right', format: (r, v) => fmt.money(v, ds.country) },
            { id: 'bcr', label: 'RAC', align: 'right', format: (r, v) => fmt.num(v, 1) + '×' },
            { id: 'evidence', label: T('Preuve', 'Evidence'), sortable: false }
          ],
          rows, pageSize: 10,
          onRow: r => { stt.region = r.region; K.toast('🎯 ' + r.mesure + ' · ' + r.region); }
        });
      }

      function drawFinance() {
        const ds = getDs(), opt = currentPlan();
        const gov = Math.min(70, 34 + ds.services.insurance * .28);
        const donors = Math.max(8, 30 - ds.services.insurance * .12);
        const privateSector = Math.max(4, 100 - gov - donors - 12);
        K.chart('donut', financeHost, {
          items: [
            { label: T('Budget national (santé)', 'National budget (health)'), value: gov, color: '#18d67f' },
            { label: T('Bailleurs (OMS, UNICEF, PAM…)', 'Donors (WHO, UNICEF, WFP…)'), value: donors, color: '#3fc8f0' },
            { label: T('Secteur privé & assurance', 'Private sector & insurance'), value: privateSector, color: '#a78bfa' },
            { label: T('Ménages (frais directs)', 'Households (out-of-pocket)'), value: 12, color: '#f5b642' }
          ],
          thickness: .58, centerLabel: T('structure cible', 'target structure'),
          format: v => fmt.pct(v, 0)
        });
        financeNote.innerHTML = T('Frais directs des ménages : <b>' + fmt.pct(ds.totals.outOfPocketPct, 0) + '</b> aujourd’hui — la protection financière est un levier de santé publique aussi puissant que le traitement. Déficit à financer : ' +
          fmt.money(Math.max(0, opt.budgetUsd - opt.spentUsd), ds.country) + '.',
          'Household out-of-pocket: <b>' + fmt.pct(ds.totals.outOfPocketPct, 0) + '</b> today — financial protection is as powerful a public-health lever as treatment. Financing gap: ' +
          fmt.money(Math.max(0, opt.budgetUsd - opt.spentUsd), ds.country) + '.');
      }

      function drawROI() {
        const ds = getDs(), opt = currentPlan();
        const benefit = opt.dalys * ds.profile.gdp * 1.6;
        K.chart('waterfall', roiHost, {
          items: [
            { label: T('Coût du programme', 'Programme cost'), value: opt.spentUsd, type: 'total', color: '#ff6b5e' },
            { label: T('Bénéfice santé (DALY valorisés)', 'Health benefit (valued DALYs)'), value: benefit, type: 'total', color: '#18d67f' },
            { label: T('Bénéfice net', 'Net benefit'), value: benefit - opt.spentUsd, type: 'total', color: '#c9ee59' },
            { label: T('Évité : coût de l’inaction / an', 'Avoided: cost of inaction / yr'), value: ds.burden.costOfInactionUsd, type: 'total', color: '#3fc8f0' }
          ],
          format: v => fmt.money(Math.abs(v), ds.country)
        });
      }

      function drawPriorities() {
        const ds = getDs();
        const prios = ['lives', 'equity', 'economy'];
        const names = { lives: T('Maximiser les vies', 'Maximise lives'), equity: T('Maximiser l’équité', 'Maximise equity'), economy: T('Maximiser le rendement', 'Maximise return') };
        const res = prios.map(p => M.optimizeBudget(ds, getCatalogue(), stt.budget, { priority: p }));
        K.chart('bars', prioHost, {
          labels: prios.map(p => names[p]),
          series: [
            { name: T('DALY évités', 'DALYs averted'), data: res.map(r => r.dalys), color: '#18d67f' },
            { name: T('Vies sauvées ×10', 'Lives saved ×10'), data: res.map(r => r.deaths * 10), color: '#f472b6' },
            { name: T('Régions couvertes ×1 000', 'Regions covered ×1,000'), data: res.map(r => r.coverageRegions * 1000), color: '#3fc8f0' }
          ],
          format: v => fmt.num(v, 0)
        });
        const best = prios[res.map(r => r.dalys).indexOf(Math.max.apply(null, res.map(r => r.dalys)))];
        prioNote.innerHTML = T('Avec la même enveloppe de ' + fmt.money(stt.budget, ds.country) + ' : <b>' + names[best] + '</b> produit le plus de DALY évités · l’équité coûte ' +
          fmt.num((res[0].dalys - res[1].dalys) / Math.max(1, res[0].dalys) * 100, 1) + ' % d’impact en moins mais cible davantage les zones rurales.',
          'With the same envelope of ' + fmt.money(stt.budget, ds.country) + ': <b>' + names[best] + '</b> yields the most DALYs averted · equity trades ' +
          fmt.num((res[0].dalys - res[1].dalys) / Math.max(1, res[0].dalys) * 100, 1) + '% of impact for stronger rural targeting.');
      }

      function drawLevers() {
        const ds = getDs(), cat = getCatalogue();
        const byLever = {};
        cat.forEach(x => { if (!byLever[x.lever] || byLever[x.lever].dalys < x.dalys) byLever[x.lever] = x; });
        const rows = M.LEVERS.slice().sort((a, b) => b.cost - a.cost);
        K.chart('bars', leverHost, {
          horizontal: true,
          labels: rows.map(l => label(l)),
          series: [
            { name: T('Coût USD/hab/an', 'Cost USD/cap/yr'), data: rows.map(l => l.cost), color: '#3fc8f0' },
            { name: T('DALY/hab/an pour 55 % d’intensité', 'DALY/cap/yr at 55% intensity'), data: rows.map(l => byLever[l.k] ? byLever[l.k].dalys / ds.totals.population : 0), color: '#c9ee59' }
          ],
          format: v => fmt.num(v, 3),
          colorScale: (v, i) => ['#3fc8f0', '#c9ee59'][i]
        });
      }

      function drawAll() { renderKpis(); drawFrontier(); drawMix(); drawRegions(); drawTable(); drawFinance(); drawROI(); drawLevers(); }
      drawAll();
      drawPriorities();
      return { render: () => { catalogue = null; planCache = null; drawAll(); } };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 8 — MÉTHODE, QUALITÉ DES DONNÉES & RÉUTILISATION                */
  /* ======================================================================= */
  K.registerTab({
    id: 'method', icon: '🧪', label: T('Méthode & données', 'Method & data'), labelT: ['Méthode & données', 'Method & data'],
    mount(host) {
      const kpis = K.kpiBand();

      const qualityCard = K.card({ title: T('Indice de qualité des données', 'Data quality index'), sub: T('Ce que la cellule peut prouver aujourd’hui — et ce qu’il reste à connecter', 'What the cell can prove today — and what remains to be connected'), span: 3 });
      const qualityGauge = K.chartHost('sm');
      const qualityMeters = h('div.nx-stack');
      qualityCard.body.appendChild(qualityGauge); qualityCard.body.appendChild(qualityMeters);

      const provCard = K.card({ title: T('Provenance & statut des sources', 'Source provenance & status'), sub: T('Chaque domaine est étiqueté publié / partiel / à calibrer', 'Each domain is labelled reported / partial / to be calibrated'), span: 3 });
      const provHost = h('div');
      provCard.body.appendChild(provHost);

      const eqCard = K.card({ title: T('Équations & hypothèses du modèle', 'Model equations & assumptions'), sub: T('Tout est auditable : chaque sortie est reproductible', 'Everything is auditable: every output is reproducible'), span: 3 });
      const eqHost = h('div.nx-stack');
      eqCard.body.appendChild(eqHost);

      const gapCard = K.card({ title: T('Lacunes de données & feuille de route', 'Data gaps & roadmap'), sub: T('Les cinq connexions qui feraient passer du modèle au rapport officiel', 'The five connections that would turn modelling into official reporting'), span: 3 });
      const gapHost = h('div.nx-timeline');
      gapCard.body.appendChild(gapHost);

      const calCard = K.card({ title: T('Calibration : modèle vs références', 'Calibration: model vs references'), sub: T('Ordres de grandeur vérifiés', 'Verified orders of magnitude'), span: 4 });
      const calHost = h('div');
      calCard.body.appendChild(calHost);

      const limitCard = K.card({ title: T('Limites & précautions d’usage', 'Limitations & caveats'), sub: T('À lire avant toute publication', 'Read before any publication'), span: 2 });
      const limitHost = h('div.nx-stack');
      limitCard.body.appendChild(limitHost);

      const partnerCard = K.card({ title: T('Gouvernance & partenaires', 'Governance & partners'), sub: T('Qui produit, qui valide, qui publie', 'Who produces, validates and publishes'), span: 3 });
      const partnerHost = h('div.nx-stack');
      partnerCard.body.appendChild(partnerHost);

      const reuseCard = K.card({ title: T('Réutilisation : socle commun', 'Reuse: shared foundation'), sub: T('La même brique sert toutes les sections institutionnelles', 'The same building block serves every institutional section'), span: 3 });
      const reuseHost = h('div.nx-stack');
      reuseCard.body.appendChild(reuseHost);

      host.appendChild(h('div.nx-grid.g-6', null, [
        kpis, qualityCard.el, provCard.el, eqCard.el, gapCard.el, calCard.el, limitCard.el, partnerCard.el, reuseCard.el
      ]));

      const PROV_STATUS = {
        disponible: { fr: 'Publié / disponible', en: 'Reported / available', tone: 'ok' },
        partiel: { fr: 'Partiel', en: 'Partial', tone: 'warn' },
        modélisé: { fr: 'Modélisé', en: 'Modelled', tone: 'warn' },
        a_calibrer: { fr: 'À calibrer', en: 'To calibrate', tone: 'risk' }
      };

      function compositeQuality() {
        const q = getDs().dataQuality;
        return Math.round(S.mean([q.completeness, q.timeliness, q.granularity, q.laboratory, q.linkage, q.surveillance]));
      }

      function renderKpis() {
        const ds = getDs(), q = ds.dataQuality;
        kpis.innerHTML = '';
        [
          K.kpi({ label: T('Qualité globale', 'Overall quality'), value: fmt.num(compositeQuality(), 0), unit: '/100', tone: compositeQuality() > 65 ? 'good' : 'hot', foot: T('complétude ', 'completeness ') + fmt.pct(q.completeness, 0), source: null }),
          K.kpi({ label: T('Complétude', 'Completeness'), value: fmt.pct(q.completeness, 0), foot: T('indicateurs renseignés', 'indicators filled') }),
          K.kpi({ label: T('Actualité', 'Timeliness'), value: fmt.pct(q.timeliness, 0), foot: T('fraîcheur des remontées DHIS2', 'DHIS2 reporting freshness') }),
          K.kpi({ label: T('Granularité', 'Granularity'), value: fmt.pct(q.granularity, 0), foot: ds.regions.length + ' ' + T('régions suivies', 'monitored regions') }),
          K.kpi({ label: T('Laboratoire', 'Laboratory'), value: fmt.pct(q.laboratory, 0), tone: q.laboratory < 45 ? 'hot' : '', foot: T('couverture des analyses', 'test coverage') }),
          K.kpi({ label: T('Appariement des identifiants', 'Identifier linkage'), value: fmt.pct(q.linkage, 0), tone: q.linkage < 40 ? 'hot' : '', foot: T('dossier patient unique', 'single patient record') })
        ].forEach(x => kpis.appendChild(x));
        U.animateKpis(kpis);
      }

      function drawQuality() {
        const ds = getDs(), q = ds.dataQuality;
        const score = compositeQuality();
        K.chart('gauge', qualityGauge, {
          value: score, max: 100, format: v => fmt.num(v, 0) + '/100', label: T('qualité des données', 'data quality'),
          tone: score > 65 ? '#18d67f' : score > 45 ? '#f5b642' : '#ff6b5e'
        });
        qualityMeters.innerHTML = '';
        [
          { fr: 'Complétude des indicateurs', en: 'Indicator completeness', v: q.completeness },
          { fr: 'Actualité des remontées', en: 'Reporting timeliness', v: q.timeliness },
          { fr: 'Granularité géographique', en: 'Geographic granularity', v: q.granularity },
          { fr: 'Capacité de laboratoire', en: 'Laboratory capacity', v: q.laboratory },
          { fr: 'Appariement des identifiants', en: 'Identifier linkage', v: q.linkage },
          { fr: 'Surveillance épidémiologique', en: 'Epidemiological surveillance', v: q.surveillance }
        ].forEach(x => qualityMeters.appendChild(K.meter(label(x), x.v, 100, {
          format: v => fmt.num(v, 0) + '/100', tone: x.v > 65 ? 'ok' : x.v > 45 ? 'warn' : 'risk'
        })));
        qualityMeters.appendChild(K.note(T('Le score de qualité mesure ce que l’on peut affirmer : un pays avec un score faible doit lire les chiffres comme des ordres de grandeur, pas comme des statistiques officielles.',
          'The quality score measures what can be asserted: a low-score country should read the figures as orders of magnitude, not official statistics.'), 'info'));
      }

      function drawProv() {
        const ds = getDs();
        const rows = ds.provenance.map(p => ({
          domaine: label(p), source: p.src, frequence: p.freq,
          statut: label(PROV_STATUS[p.status] || PROV_STATUS.modélisé),
          partenaire: p.link
        }));
        if (provHost._t) { provHost._t.setRows(rows); return; }
        provHost._t = K.dataTable(provHost, {
          columns: [
            { id: 'domaine', label: T('Domaine', 'Domain'), width: '1.5fr' },
            { id: 'source', label: T('Source', 'Source'), width: '1.4fr' },
            { id: 'frequence', label: T('Fréquence', 'Frequency') },
            { id: 'statut', label: T('Statut', 'Status') },
            { id: 'partenaire', label: T('Appui', 'Support'), width: '1.2fr' }
          ],
          rows, pageSize: 8
        });
      }

      function drawEquations() {
        const ds = getDs();
        eqHost.innerHTML = '';
        const ra = M.riskAttribution(ds);
        const top = ra.rows.slice().sort((a, b) => b.paf - a.paf)[0];
        const units = [
          { t: T('Prévision des indicateurs', 'Indicator forecasting'), d: T('Lissage exponentiel amorti sur l’historique 2010 → millésime, backtest glissant (MAPE, R², biais), puis traction vers la cible nationale pilotée par le scénario et l’intensité du plan.', 'Damped exponential smoothing on the 2010 → current history, rolling backtest (MAPE, R², bias), then a pull towards the national target driven by the scenario and plan intensity.') },
          { t: T('Fractions attribuables (FAF)', 'Attributable fractions (PAF)'), d: T('PAF = 1 − exp(−k × dépassement du repère OMS renforcé), k calibré par facteur ; la charge attribuée est répartie au prorata des PAF. Exemple : ' + label(top) + ' → ' + fmt.pct(top.paf * 100, 1) + '.', 'PAF = 1 − exp(−k × excess over the WHO advanced reference), k calibrated per factor; burden is shared pro rata. Example: ' + label(top) + ' → ' + fmt.pct(top.paf * 100, 1) + '.') },
          { t: T('Cascade de prise en charge', 'Care cascade'), d: T('Population cible (35 ans +) → dépistée → cas détectés (prévalence) → traitée → contrôlée, chaque transition étant bornée par la capacité de services observée.', 'Target population (35+) → screened → cases detected (prevalence) → treated → controlled, each transition capped by the observed service capacity.') },
          { t: T('Charge & DALY évités', 'Burden & DALYs averted'), d: T('Complications évitées = patients non contrôlés × taux de complication annuel (2,4 %) × facteur de mise en œuvre (38 %), valorisées 21 DALY par décès évité et 6,4 par complication évitée.', 'Complications averted = uncontrolled patients × annual complication rate (2.4%) × delivery factor (38%), valued at 21 DALYs per death averted and 6.4 per complication averted.') },
          { t: T('Rentabilité', 'Cost-effectiveness'), d: T('Valeur d’un DALY évité = 1,6 × PIB/hab (seuil OMS), actualisation à 9 % sur 10 ans, RAC, TRI (bissection) et délai de retour.', 'Value of a DALY averted = 1.6 × GDP/capita (WHO threshold), 9% discounting over 10 years, BCR, IRR (bisection) and payback.') },
          { t: T('Risque', 'Risk'), d: T('Monte-Carlo : ' + fmt.int((K.state && K.state.mc ? K.state.mc.runs : 4000)) + ' tirages, chocs épidémiologiques et crises ponctuelles (6 % de probabilité par an), distribution de la charge à l’horizon.', 'Monte-Carlo: ' + fmt.int((K.state && K.state.mc ? K.state.mc.runs : 4000)) + ' runs, epidemiological shocks and occasional crises (6% annual probability), burden distribution at horizon.') },
          { t: T('Optimisation budgétaire', 'Budget optimisation'), d: T('Sélection gloutonne des mesures au meilleur rapport DALY/USD, pondérée par la priorité politique (vies, équité, rendement), plafond de 6 mesures par levier.', 'Greedy selection of measures by best DALY/USD ratio, weighted by policy priority (lives, equity, return), capped at 6 measures per lever.') }
        ];
        units.forEach(u => {
          eqHost.appendChild(h('div.nx-eq', null, [
            h('b', { text: u.t }),
            h('div.nx-mini.nx-muted', { text: u.d })
          ]));
        });
        eqHost.appendChild(K.note(T('Aucune valeur n’est saisie à la main : tout est recalculé à partir des sources synthétiques nationales et des paramètres affichés.',
          'No value is hard-coded: everything is recomputed from the synthetic national sources and the parameters shown.'), 'ok'));
      }

      function drawGaps() {
        const ds = getDs();
        gapHost.innerHTML = '';
        ds.dataQuality.gaps.forEach((g, i) => {
          gapHost.appendChild(h('div.nx-tl', null, [
            h('i', { class: 'nx-tl-dot ' + (g.need === 'high' ? 'risk' : 'warn') }),
            h('div', { style: { flex: '1' } }, [
              h('b', { text: label(g) }),
              h('div.nx-mini.nx-muted', { text: (g.need === 'high' ? T('Priorité élevée', 'High priority') : T('Priorité moyenne', 'Medium priority')) + ' · ' + T('étape ', 'step ') + (i + 1) + ' ' + T('de la feuille de route', 'of the roadmap') }),
              h('button.nx-btn.sm', { type: 'button', text: T('Voir l’impact', 'See impact'), style: { marginTop: '4px' }, onclick: () => K.toast('🔌 ' + label(g) + ' — ' + T('connexion à planifier avec les partenaires', 'connection to plan with partners')) })
            ])
          ]));
        });
      }

      function drawCalibration() {
        const ds = getDs();
        const rows = [
          { indicateur: T('Retard de croissance (0–59 m)', 'Stunting (0–59 m)'), modele: ds.nutrition.stunting, reference: 'EDS/DHS · SMART', plage: '10–30 %', unite: '%' },
          { indicateur: T('Émaciation aiguë', 'Acute wasting'), modele: ds.nutrition.wasting, reference: 'SMART · OMS', plage: '2–12 %', unite: '%' },
          { indicateur: T('Anémie des femmes 15–49', 'Women anaemia 15–49'), modele: ds.nutrition.anaemiaWomen, reference: 'EDS · OMS', plage: '20–45 %', unite: '%' },
          { indicateur: T('Diabète (adultes)', 'Diabetes (adults)'), modele: ds.ncd.diabetes, reference: 'STEPS · FID', plage: '3–15 %', unite: '%' },
          { indicateur: T('Hypertension (adultes)', 'Hypertension (adults)'), modele: ds.ncd.hypertension, reference: 'STEPS · OMS', plage: '18–40 %', unite: '%' },
          { indicateur: T('Obésité (adultes)', 'Obesity (adults)'), modele: ds.ncd.obesity, reference: 'STEPS', plage: '4–20 %', unite: '%' },
          { indicateur: T('Dépistage NCD', 'NCD screening'), modele: ds.services.screening, reference: 'SARA · DHIS2', plage: '15–75 %', unite: '%' },
          { indicateur: T('Dépenses de santé / hab', 'Health spending / capita'), modele: ds.totals.healthSpendPerCapUsd, reference: 'GHED OMS', plage: '30–400 USD', unite: 'USD' },
          { indicateur: T('Espérance de vie', 'Life expectancy'), modele: ds.totals.lifeExpectancy, reference: 'UN WPP', plage: '52–72 ans', unite: 'ans' }
        ];
        if (calHost._t) { calHost._t.setRows(rows); return; }
        calHost._t = K.dataTable(calHost, {
          columns: [
            { id: 'indicateur', label: T('Indicateur', 'Indicator'), width: '1.6fr' },
            { id: 'modele', label: T('Valeur modélisée', 'Modelled value'), align: 'right', format: (r, v) => fmt.num(v, r.unite === 'USD' ? 0 : 1) + ' ' + (r.unite === '%' ? '%' : '') },
            { id: 'reference', label: T('Source de référence', 'Reference source'), width: '1.3fr' },
            { id: 'plage', label: T('Plage attendue', 'Expected range') }
          ],
          rows, pageSize: 10
        });
      }

      function drawLimits() {
        const ds = getDs();
        limitHost.innerHTML = '';
        [
          T('Les valeurs sont <b>modélisées</b> à partir de sources synthétiques : elles montrent la méthode, pas la vérité du terrain.', 'Values are <b>modelled</b> from synthetic sources: they demonstrate the method, not the field truth.'),
          T('Les fractions attribuables utilisent une famille de risque exponentielle (GBD) : elles doivent être recalibrées sur une enquête nationale de consommation.', 'Attributable fractions use an exponential risk family (GBD): they must be recalibrated on a national consumption survey.'),
          T('La cascade suppose une population cible unique (35 ans +) et une prévalence combinée diabète / hypertension : à affiner par âge et par sexe.', 'The cascade assumes a single target population (35+) and a combined diabetes/hypertension prevalence: to be refined by age and sex.'),
          T('Les coûts sont des coûts de programme hors investissements lourds (bâtiments, équipements d’imagerie) et hors inflation.', 'Costs are programme costs excluding heavy investments (buildings, imaging equipment) and inflation.'),
          T('Aucun usage nominatif : la cellule travaille sur des agrégats statistiques, jamais sur des données personnelles identifiantes.', 'No nominal use: the cell works on statistical aggregates, never on personally identifiable data.')
        ].forEach((x, i) => limitHost.appendChild(h('div.nx-warn', null, [h('b', { text: '⚠ ' + (i + 1) + '. ' }), h('span', { html: x })])));
      }

      function drawPartners() {
        const ds = getDs();
        partnerHost.innerHTML = '';
        ds.partners.forEach(p => partnerHost.appendChild(h('span.nx-chip', { text: '🤝 ' + label(p) })));
        partnerHost.appendChild(K.flow([
          { label: T('Le Ministère produit', 'Ministry produces'), value: 'DHIS2', sub: T('données de routine', 'routine data') },
          { label: T('La cellule modélise', 'Cell models'), value: 'NUTRI.N°1', sub: T('épidémiologie & coûts', 'epidemiology & costs') },
          { label: T('Les partenaires valident', 'Partners validate'), value: 'OMS · UNICEF', sub: T('méthode & cibles', 'method & targets') },
          { label: T('Le public reçoit', 'Public receives'), value: T('Rapports', 'Reports'), sub: T('annuels & tableaux de bord', 'annual & dashboards') }
        ]));
        partnerHost.appendChild(K.note(T('Prochaine étape institutionnelle : protocole de partage DHIS2 ↔ laboratoires ↔ hôpitaux de référence, puis publication trimestrielle.',
          'Next institutional step: DHIS2 ↔ laboratories ↔ referral hospitals data-sharing protocol, then quarterly publication.'), 'info'));
      }

      function drawReuse() {
        const ds = getDs();
        reuseHost.innerHTML = '';
        const items = [
          { k: 'NX.ui', d: T('boîte à outils partagée : cartes, tuiles, contrôles, tableaux, graphiques SVG', 'shared toolkit: cards, tiles, controls, tables, SVG charts') },
          { k: 'NX.shell', d: T('coquille de section : bandeau, onglets collants, tiroirs, présentation, export', 'section shell: header, sticky tabs, drawers, presentation, export') },
          { k: 'NUTRI_HEALTH_DATA', d: T('17 pays, 2010 → 2030, 10 domaines d’indicateurs', '17 countries, 2010 → 2030, 10 indicator domains') },
          { k: 'NUTRI_HEALTH_MODELS', d: T('prévision, cascade, FAF, Monte-Carlo, optimisation budgétaire', 'forecast, cascade, PAF, Monte-Carlo, budget optimisation') }
        ];
        items.forEach(x => reuseHost.appendChild(h('div.nx-code', null, [h('b', { text: x.k }), h('div.nx-mini.nx-muted', { text: x.d })])));
        reuseHost.appendChild(h('div.nx-row', { style: { marginTop: '8px' } }, [
          K.btn(T('Exporter le dossier complet (JSON)', 'Export full dossier (JSON)'), { variant: 'primary', icon: '⧉', onClick: () => K.exportJSON({
            pays: ds.countryName, annee: ds.year, version: 'NUTRI.N°1 v59',
            totaux: ds.totals, nutrition: ds.nutrition, ncd: ds.ncd, alimentation: ds.diet, charge: ds.burden,
            services: ds.services, regions: ds.regions, qualite: ds.dataQuality, provenance: ds.provenance
          }, 'dossier-sante', ds.country + '-' + ds.year) }),
          K.btn(T('Copier la méthode', 'Copy the method'), { icon: '📋', onClick: () => K.copyText(methodText(ds)) }),
          K.btn(T('Imprimer la page', 'Print the page'), { icon: '🖨', onClick: () => w.print() })
        ]));
        reuseHost.appendChild(h('div.nx-mini.nx-dim', { text: T('Version du modèle : v59 · millésime des données : ', 'Model version: v59 · data vintage: ') + ds.year + ' · ' + T('section reliée : ', 'linked section: ') + (ds.agriLinked ? T('Agriculture', 'Agriculture') : T('aucune', 'none')) }));
      }

      function methodText(ds) {
        const q = ds.dataQuality;
        return [
          'NUTRI.N°1 — MÉTHODE & QUALITÉ DES DONNÉES (v59)',
          'Pays : ' + ds.countryName + ' · Millésime : ' + ds.year,
          '',
          '1. QUALITÉ DES DONNÉES — score global ' + compositeQuality() + '/100',
          '• Complétude ' + q.completeness + '/100 · actualité ' + q.timeliness + '/100 · granularité ' + q.granularity + '/100',
          '• Laboratoire ' + q.laboratory + '/100 · appariement ' + q.linkage + '/100 · surveillance ' + q.surveillance + '/100',
          '',
          '2. PROVENANCE',
          ds.provenance.map(p => '• ' + label(p) + ' — ' + p.src + ' (' + p.freq + ')').join('\n'),
          '',
          '3. LACUNES À COMBLER',
          ds.dataQuality.gaps.map(g => '• ' + label(g)).join('\n'),
          '',
          '4. LIMITES',
          '• Valeurs modélisées de démonstration, à recalibrer sur les enquêtes nationales.',
          '• FAF de type GBD, cascade agrégée 35 ans +, coûts hors investissements lourds.',
          '• Aucune donnée personnelle identifiante traitée par la cellule.',
          '',
          'NUTRI.N°1 v59 — socle partagé NX.ui / NX.shell.'
        ].join('\n');
      }

      function draw() { renderKpis(); drawQuality(); drawProv(); drawEquations(); drawGaps(); drawCalibration(); drawLimits(); drawPartners(); drawReuse(); }
      draw();
      return { render: () => draw() };
    }
  });

  /* --------------------------------------------------- navigation croisée */
  /** Bascule vers une autre section institutionnelle de la page si présente. */
  function jumpTo(viewId, tabId) {
    const view = d.getElementById(viewId);
    if (!view) { K.toast(T('Section ', 'Section ') + viewId + T(' non chargée sur cette page', ' not loaded on this page')); return; }
    try {
      const btn = d.querySelector('.nav button[data-t="' + viewId + '"]');
      if (typeof w.go === 'function') w.go(viewId, btn || undefined);           // navigation de l'application
      else if (typeof w.switchView === 'function') w.switchView(viewId);
      else {
        d.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === viewId));
        d.querySelectorAll('.nav button').forEach(x => x.classList.toggle('on', x === btn));
      }
      /* les sections montées restent vivantes : on redemande un rendu à l'affichage */
      d.dispatchEvent(new CustomEvent('nutri:viewChanged', { detail: { view: viewId, tab: tabId || null } }));
      if (tabId) K.toast('↗ ' + (btn ? (btn.textContent || '').trim().slice(0, 40) : viewId) + ' — ' + tabId);
    } catch (e) { console.warn('[NUTRI_HEALTH] navigation croisée', e); }
  }
  w.NUTRI_HEALTH_VIEWS = { __v59: true, jumpTo };
})(window, document);
