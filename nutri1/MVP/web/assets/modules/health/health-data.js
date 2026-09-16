/* ============================================================================
   NUTRI.N°1 — SECTION SANTÉ (v59) · MOTEUR DE DONNÉES
   ---------------------------------------------------------------------------
   window.NUTRI_HEALTH_DATA — cellule nationale d'intelligence sanitaire pour le
   Ministère de la Santé : état nutritionnel (mère & enfant), maladies non
   transmissibles liées à l'alimentation, facteurs de risque, dépistage, charge
   de morbidité et capacité de services.

   HONNÊTETÉ DES DONNÉES
     Estimations MODÉLISÉES, déterministes et reproductibles (graine
     « pays | indicateur | millésime »). Elles illustrent ce que la plateforme
     produit avec les enquêtes nationales (EDS/DHS, STEPS, SARA, DHIS2), les
     laboratoires et les partenaires. Aucune valeur n'est une statistique
     officielle.

   LIEN INTER-SECTIONS
     Si `window.NUTRI_AGRI_DATA` est chargé, la géographie (régions) et les
     disponibilités alimentaires (sucre, sel, fibres, fruits & légumes, graisses)
     sont reprises de la section Agriculture : la chaîne
     « ferme → assiette → santé » devient réelle et non plus illustrative.
   ========================================================================== */
(function (w) {
  'use strict';
  if (w.NUTRI_HEALTH_DATA) return;
  const NX = w.NX;
  const R = NX.rng;
  const AGRI = w.NUTRI_AGRI_DATA || null;   // optionnel : lien alimentaire

  const YEARS = [];
  for (let y = 2010; y <= 2030; y++) YEARS.push(y);

  /* ------------------------------------------------------------------ pays ---
     pop (millions) · urban · gdp (USD/hab) · sanit (accès assainissement) ·
     water (accès eau potable) · spend (santé % PIB) · doctors/100k ·
     nurses/100k · nutri (nutritionnistes/100k) · insur (couverture assurance) ·
     lab (couverture laboratoire) · cold (chaîne du froid) · screen (dépistage
     de base) · fert (fécondité) · le (espérance de vie) · u5 (mortalité <5 ans
     pour 1000) · stunting (points de départ de référence, %).
     Les régions proviennent de la section Agriculture quand elle est chargée. */
  const C = {
    BJ: { name: 'Bénin', pop: 14.5, urban: .49, gdp: 1450, sanit: .34, water: .72, spend: 3.5, doctors: 1.2, nurses: 5.6, nutri: .35, insur: .12, lab: .28, cold: .18, screen: .22, fert: 4.6, le: 62.5, u5: 84, stunting: 32, regions: ['Alibori', 'Atacora', 'Borgou', 'Zou-Collines', 'Atlantique-Littoral', 'Mono-Couffo'] },
    BF: { name: 'Burkina Faso', pop: 23.5, urban: .34, gdp: 900, sanit: .26, water: .62, spend: 4.4, doctors: .9, nurses: 4.4, nutri: .28, insur: .06, lab: .21, cold: .12, screen: .18, fert: 5.1, le: 60.8, u5: 88, stunting: 29, regions: ['Sahel', 'Nord', 'Centre', 'Boucle du Mouhoun', 'Hauts-Bassins', 'Est'] },
    CV: { name: 'Cabo Verde', pop: .62, urban: .67, gdp: 3600, sanit: .74, water: .86, spend: 3.7, doctors: 2.4, nurses: 8.2, nutri: .9, insur: .35, lab: .55, cold: .48, screen: .48, fert: 2.1, le: 73.2, u5: 15, stunting: 12, regions: ['Santo Antão', 'São Vicente', 'Santiago', 'Fogo', 'Boa Vista'] },
    CI: { name: "Côte d'Ivoire", pop: 32, urban: .53, gdp: 2300, sanit: .38, water: .72, spend: 3.3, doctors: 1.1, nurses: 5.2, nutri: .42, insur: .12, lab: .32, cold: .22, screen: .28, fert: 4.4, le: 63.9, u5: 78, stunting: 24, regions: ['Nord', 'Nord-Est', 'Centre', 'Centre-Ouest', 'Sud-Ouest', 'Sud'] },
    GM: { name: 'Gambie', pop: 2.8, urban: .63, gdp: 800, sanit: .42, water: .78, spend: 2.6, doctors: .9, nurses: 4.6, nutri: .2, insur: .04, lab: .18, cold: .1, screen: .16, fert: 4.7, le: 62.1, u5: 60, stunting: 25, regions: ['Banjul', 'Kanifing', 'West Coast', 'Lower River', 'Central River', 'Upper River'] },
    GH: { name: 'Ghana', pop: 34.5, urban: .58, gdp: 2400, sanit: .42, water: .83, spend: 3.5, doctors: 1.6, nurses: 8.9, nutri: .55, insur: .42, lab: .38, cold: .26, screen: .34, fert: 3.6, le: 65.2, u5: 47, stunting: 18, regions: ['Northern', 'Upper East', 'Upper West', 'Bono', 'Ashanti', 'Greater Accra', 'Volta', 'Central'] },
    GN: { name: 'Guinée', pop: 15, urban: .37, gdp: 1200, sanit: .25, water: .63, spend: 3.9, doctors: .7, nurses: 3.4, nutri: .18, insur: .05, lab: .16, cold: .09, screen: .14, fert: 4.4, le: 60.4, u5: 99, stunting: 30, regions: ['Haute-Guinée', 'Moyenne-Guinée', 'Guinée forestière', 'Basse-Guinée'] },
    GW: { name: 'Guinée-Bissau', pop: 2.2, urban: .45, gdp: 900, sanit: .28, water: .65, spend: 3.1, doctors: .8, nurses: 3.9, nutri: .16, insur: .03, lab: .14, cold: .08, screen: .12, fert: 4.2, le: 60.2, u5: 78, stunting: 28, regions: ['Bafatá', 'Biombo', 'Bolama', 'Cacheu', 'Gabú', 'Oio', 'Quinara', 'Tombali'] },
    LR: { name: 'Liberia', pop: 5.6, urban: .53, gdp: 700, sanit: .24, water: .62, spend: 3.6, doctors: .5, nurses: 2.9, nutri: .14, insur: .04, lab: .13, cold: .07, screen: .12, fert: 4.3, le: 62.9, u5: 78, stunting: 30, regions: ['Montserrado', 'Nimba', 'Bong', 'Lofa', 'Grand Bassa', 'Maryland'] },
    ML: { name: 'Mali', pop: 24.5, urban: .43, gdp: 850, sanit: .22, water: .62, spend: 3.4, doctors: .7, nurses: 4.1, nutri: .22, insur: .05, lab: .17, cold: .1, screen: .16, fert: 5.7, le: 59.6, u5: 97, stunting: 27, regions: ['Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'Tombouctou', 'Gao', 'Kidal'] },
    MR: { name: 'Mauritanie', pop: 5, urban: .57, gdp: 1900, sanit: .34, water: .72, spend: 3.8, doctors: 1.1, nurses: 4.4, nutri: .24, insur: .1, lab: .24, cold: .14, screen: .2, fert: 4.3, le: 65.1, u5: 43, stunting: 22, regions: ['Nouakchott', 'Trarza', 'Brakna', 'Gorgol', 'Assaba', 'Hodh El Gharbi', 'Hodh Ech Chargui', 'Adrar'] },
    NE: { name: 'Niger', pop: 27, urban: .19, gdp: 600, sanit: .17, water: .55, spend: 4.6, doctors: .4, nurses: 3.1, nutri: .17, insur: .03, lab: .14, cold: .08, screen: .14, fert: 6.6, le: 58.3, u5: 115, stunting: 35, regions: ['Niamey', 'Dosso', 'Tahoua', 'Tillabéri', 'Zinder', 'Maradi', 'Agadez', 'Diffa'] },
    NG: { name: 'Nigeria', pop: 232, urban: .54, gdp: 2100, sanit: .38, water: .66, spend: 3.2, doctors: .8, nurses: 4.4, nutri: .3, insur: .06, lab: .25, cold: .17, screen: .2, fert: 5.1, le: 62.6, u5: 107, stunting: 32, regions: ['North-West', 'North-East', 'North-Central', 'South-West', 'South-East', 'South-South'] },
    SN: { name: 'Sénégal', pop: 18.5, urban: .49, gdp: 1800, sanit: .52, water: .84, spend: 4.1, doctors: 1.1, nurses: 4.8, nutri: .4, insur: .2, lab: .34, cold: .2, screen: .3, fert: 4.3, le: 68.6, u5: 37, stunting: 17, regions: ['Dakar', 'Thiès', 'Diourbel', 'Saint-Louis', 'Louga', 'Fatick', 'Kaolack', 'Tambacounda'] },
    SL: { name: 'Sierra Leone', pop: 8.8, urban: .44, gdp: 650, sanit: .26, water: .6, spend: 4.3, doctors: .4, nurses: 3.1, nutri: .13, insur: .04, lab: .12, cold: .07, screen: .11, fert: 3.9, le: 61.5, u5: 105, stunting: 26, regions: ['Western Area', 'Bo', 'Bombali', 'Kenema', 'Kono', 'Port Loko'] },
    TG: { name: 'Togo', pop: 9.7, urban: .44, gdp: 1000, sanit: .32, water: .71, spend: 5.4, doctors: .9, nurses: 4.5, nutri: .3, insur: .1, lab: .26, cold: .16, screen: .24, fert: 4.2, le: 62.9, u5: 66, stunting: 23, regions: ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes'] },
    TD: { name: 'Tchad', pop: 20.5, urban: .24, gdp: 700, sanit: .13, water: .52, spend: 4.7, doctors: .4, nurses: 2.6, nutri: .1, insur: .02, lab: .1, cold: .05, screen: .09, fert: 6.1, le: 55.8, u5: 118, stunting: 33, regions: ['N’Djaména', 'Chari-Baguirmi', 'Mayo-Kebbi', 'Logone', 'Ouaddaï', 'Ennedi', 'Borkou', 'Tibesti'] }
  };
  const CODES = Object.keys(C);

  /* Disponibilités alimentaires par groupe (kg/hab/an) : reprises de la section
     Agriculture quand elle est chargée, sinon modèle autonome. Sert à relier la
     consommation (sucre, sel, fibres, graisses) aux maladies. */
  function foodSupply(cc, year) {
    if (AGRI && AGRI.build) {
      try {
        const a = AGRI.build(cc, year);
        const pop = a.totals.population * 1e6;
        const pick = (ids) => a.crops.filter(x => ids.indexOf(x.group) >= 0).reduce((s, x) => s + x.consumedT, 0) * 1000 / pop; // kg/hab/an
        const cash = a.crops.filter(x => x.group === 'cash').reduce((s, x) => s + x.productionT, 0) * 1000 / pop;
        return {
          cerealsTubers: pick(['cereals', 'tubers']),
          legumes: pick(['legumes']),
          fruitsVeg: pick(['fruits_veg']),
          oilsNuts: pick(['oilseeds']),
          animal: pick(['animal']),
          sugarCash: cash,
          priceLevel: a.prices.basketIndex[a.prices.basketIndex.length - 1] / 100
        };
      } catch (e) { /* repli sur le modèle autonome */ }
    }
    const dense = 40 + (C[cc] ? C[cc].gdp / 100 : 10);
    return {
      cerealsTubers: R.between('fs|' + cc + '|' + year + '|c', 120, 190),
      legumes: R.between('fs|' + cc + '|' + year + '|l', 12, 30),
      fruitsVeg: R.between('fs|' + cc + '|' + year + '|f', 45, 130) + dense,
      oilsNuts: R.between('fs|' + cc + '|' + year + '|o', 6, 18),
      animal: R.between('fs|' + cc + '|' + year + '|a', 8, 40),
      sugarCash: R.between('fs|' + cc + '|' + year + '|s', 8, 45),
      priceLevel: 1 + R.between('fs|' + cc + '|' + year + '|p', -.1, .2)
    };
  }

  /* ------------------------------------------------------------------ régions */
  function regionsFor(cc) {
    if (AGRI && AGRI.COUNTRIES && AGRI.COUNTRIES[cc] && AGRI.COUNTRIES[cc].regions) return AGRI.COUNTRIES[cc].regions;
    return C[cc].regions || ['Nord', 'Centre', 'Sud', 'Littoral', 'Est'];
  }

  /* ------------------------------------------------------------- indicateurs */
  /* Repères de référence (OMS/FAO) : cibles de couverture et seuils d'alerte. */
  const TARGETS = {
    stunting: { target: 15, dir: 'down', label: { fr: 'Retard de croissance (0–59 m)', en: 'Stunting (0–59 m)' }, unit: '%', who: 'SDG 2.2' },
    wasting: { target: 5, dir: 'down', label: { fr: 'Émaciation aiguë', en: 'Wasting' }, unit: '%', who: 'SDG 2.2' },
    underweight: { target: 10, dir: 'down', label: { fr: 'Insuffisance pondérale', en: 'Underweight' }, unit: '%' },
    overweightChild: { target: 5, dir: 'down', label: { fr: 'Surpoids (enfant)', en: 'Child overweight' }, unit: '%' },
    exclusiveBF: { target: 70, dir: 'up', label: { fr: 'Allaitement exclusif 0–5 m', en: 'Exclusive breastfeeding 0–5 m' }, unit: '%', who: 'WHA 70 %' },
    complementary: { target: 80, dir: 'up', label: { fr: 'Alimentation de complément 6–23 m', en: 'Complementary feeding 6–23 m' }, unit: '%' },
    dietaryDiversity: { target: 60, dir: 'up', label: { fr: 'Diversité alimentaire minimale', en: 'Minimum dietary diversity' }, unit: '%' },
    anaemiaWomen: { target: 15, dir: 'down', label: { fr: 'Anémie (femmes 15–49)', en: 'Anaemia (women 15–49)' }, unit: '%', who: 'WHA 50 %' },
    anaemiaChildren: { target: 20, dir: 'down', label: { fr: 'Anémie (enfants <5)', en: 'Anaemia (children <5)' }, unit: '%' },
    lowBirthWeight: { target: 10, dir: 'down', label: { fr: 'Faible poids de naissance', en: 'Low birth weight' }, unit: '%' },
    diabetes: { target: null, dir: 'down', label: { fr: 'Diabète (adultes)', en: 'Diabetes (adults)' }, unit: '%' },
    hypertension: { target: null, dir: 'down', label: { fr: 'Hypertension (adultes)', en: 'Hypertension (adults)' }, unit: '%' },
    obesity: { target: 10, dir: 'down', label: { fr: 'Obésité (adultes)', en: 'Obesity (adults)' }, unit: '%', who: 'STEPS' },
    screening: { target: 70, dir: 'up', label: { fr: 'Dépistage NCD (35 ans +)', en: 'NCD screening (35+)' }, unit: '%' },
    hypertensionControl: { target: 50, dir: 'up', label: { fr: 'Hypertension contrôlée', en: 'Hypertension controlled' }, unit: '%', who: '70/30 target' },
    diabetesControl: { target: 50, dir: 'up', label: { fr: 'Diabète contrôlé', en: 'Diabetes controlled' }, unit: '%' },
    insurance: { target: 80, dir: 'up', label: { fr: 'Couverture assurantielle', en: 'Health insurance cover' }, unit: '%', who: 'UHC' },
    iodisedSalt: { target: 90, dir: 'up', label: { fr: 'Sel iodé (ménages)', en: 'Household iodised salt' }, unit: '%' },
    vitASupp: { target: 80, dir: 'up', label: { fr: 'Supplémentation vit. A', en: 'Vitamin A supplementation' }, unit: '%' },
    growthMonitoring: { target: 80, dir: 'up', label: { fr: 'Suivi croissance (0–59 m)', en: 'Growth monitoring (0–59 m)' }, unit: '%' }
  };

  /* Facteurs de risque alimentaires : apports quotidiens et repères OMS. */
  const DIET = [
    { k: 'sugarG', fr: 'Sucres libres', en: 'Free sugars', unit: 'g/j', bench: 50, safer: 25, dir: 'down', who: 'OMS < 10 % AET' },
    { k: 'sodiumMg', fr: 'Sodium', en: 'Sodium', unit: 'mg/j', bench: 2000, safer: 1500, dir: 'down', who: 'OMS < 2 000 mg' },
    { k: 'fiberG', fr: 'Fibres', en: 'Fibre', unit: 'g/j', bench: 25, safer: 30, dir: 'up', who: 'OMS ≥ 25 g' },
    { k: 'fruitVegG', fr: 'Fruits & légumes', en: 'Fruit & vegetables', unit: 'g/j', bench: 400, safer: 500, dir: 'up', who: 'OMS ≥ 400 g' },
    { k: 'satFatPct', fr: 'Graisses saturées', en: 'Saturated fat', unit: '% AET', bench: 10, safer: 7, dir: 'down', who: 'OMS < 10 % AET' },
    { k: 'ultraProcPct', fr: 'Ultra-transformés', en: 'Ultra-processed', unit: '% kcal', bench: 30, safer: 15, dir: 'down', who: 'Repère de démonstration' }
  ];

  /* --------------------------------------------------------------- build() --- */
  function build(cc, year, opts) {
    const o = opts || {};
    const p = C[cc] || C.TG;
    const y = year || 2026;
    const wealth = Math.min(1.35, Math.max(.15, p.gdp / 2200));            // indice de richesse
    const care = Math.min(1.2, (p.spend / 4.2) * .5 + (p.doctors / 1.2) * .3 + (p.nurses / 5) * .2);
    const access = p.water * .5 + p.sanit * .5;
    const years = YEARS.filter(v => v <= y);
    const t = (k) => (y - 2010) / 16;                                      // avancement 0 → 1

    /* Population : structure et effectifs ciblés par les programmes. */
    const pop = p.pop * 1e6 * (1 + .027 * (y - 2026));                     // croissance moyenne
    const structure = { under5: .155 - wealth * .028, women1549: .225, preg: .0155 * (p.fert / 4.4), lac: .017 * (p.fert / 4.4), over60: .045 + wealth * .03 };
    const totals = {
      population: pop,
      under5: pop * structure.under5,
      women1549: pop * structure.women1549,
      pregnant: pop * structure.preg,
      lactating: pop * structure.lac,
      over60: pop * structure.over60,
      lifeExpectancy: p.le + t() * (wealth * 2.4) + R.between('le|' + cc + '|' + y, -.35, .35),
      under5Mort: Math.max(8, p.u5 * (1 - t() * .42)),
      maternalMort: Math.max(6, R.between('mm|' + cc, 60, 480) * (1 - t() * .34)),
      healthSpendPerCapUsd: p.gdp * p.spend / 100,
      healthSpendUsd: p.gdp * pop * p.spend / 100,
      outOfPocketPct: Math.max(12, 62 - care * 34 + R.between('oop|' + cc, -5, 5))
    };

    /* --- nutrition mère & enfant ---------------------------------------- */
    const progress = t();
    const stunting = Math.max(6, (p.stunting * (1 - progress * .30) - wealth * 3.2 + R.between('s|' + cc + '|' + y, -1.6, 1.6)) * (1 - (access - .5) * .18));
    const wasting = Math.max(1.2, stunting * .31 + R.between('wa|' + cc + '|' + y, -1.2, 1.4));
    const underweight = stunting * .62 + R.between('uw|' + cc + '|' + y, -1.4, 1.4);
    const obesityChild = Math.min(18, 2.2 + wealth * 3.5 + p.urban * 5 + progress * 2 + R.between('oc|' + cc + '|' + y, -.8, .8));
    const nutrition = {
      stunting, wasting, underweight,
      overweightChild: obesityChild * 1.7,
      obesityChild,
      lowBirthWeight: Math.max(4, 17 - wealth * 6 - progress * 2.2 + R.between('lbw|' + cc + '|' + y, -1, 1.4)),
      exclusiveBF: Math.min(88, 34 + wealth * 16 + progress * 8 + (p.urban < .45 ? 6 : 0) + R.between('bf|' + cc + '|' + y, -3, 3)),
      complementary: Math.min(92, 38 + wealth * 14 + progress * 10 + R.between('cf|' + cc + '|' + y, -4, 4)),
      dietaryDiversity: Math.min(88, 22 + wealth * 18 + progress * 9 + R.between('dd|' + cc + '|' + y, -4, 4)),
      minimumMealFreq: Math.min(92, 42 + wealth * 16 + progress * 8 + R.between('mmf|' + cc + '|' + y, -4, 4)),
      anaemiaWomen: Math.max(7, 44 - wealth * 12 - progress * 8 + R.between('aw|' + cc + '|' + y, -3, 3)),
      anaemiaChildren: Math.max(9, 62 - wealth * 16 - progress * 11 + R.between('ac|' + cc + '|' + y, -3.5, 3.5)),
      vitASupp: Math.min(96, 34 + care * 34 + progress * 8 + R.between('va|' + cc + '|' + y, -4, 4)),
      iodisedSalt: Math.min(97, 42 + wealth * 26 + progress * 8 + R.between('io|' + cc + '|' + y, -4, 4)),
      growthMonitoring: Math.min(94, 30 + care * 30 + progress * 10 + R.between('gm|' + cc + '|' + y, -4, 4)),
      zincCoverage: Math.min(92, 20 + care * 26 + progress * 8 + R.between('zn|' + cc + '|' + y, -4, 4))
    };

    /* --- apports alimentaires (reliés à la production) ------------------- */
    const fs = foodSupply(cc, y);
    const diet = {
      sugarG: Math.min(140, 14 + (fs.sugarCash * .42) + (p.urban * 42) + wealth * 9 + R.between('sg|' + cc + '|' + y, -4, 4)),
      sodiumMg: Math.min(5200, 1300 + (fs.sugarCash * 6) + 900 * (1 - Math.min(1, fs.animal / 40)) + wealth * 260 + R.between('na|' + cc + '|' + y, -120, 120)),
      fiberG: Math.max(7, 30 - (fs.sugarCash * .08) - wealth * 1.4 + (fs.legumes * .18) + (fs.fruitsVeg * .07) + R.between('fb|' + cc + '|' + y, -1.4, 1.4)),
      fruitVegG: Math.max(40, fs.fruitsVeg * 2.1 + R.between('fv|' + cc + '|' + y, -25, 25)),
      satFatPct: Math.min(18, 5.2 + (fs.oilsNuts * .16) + (fs.animal * .09) + R.between('sf|' + cc + '|' + y, -.5, .5)),
      ultraProcPct: Math.min(72, 9 + p.urban * 38 + wealth * 12 + R.between('up|' + cc + '|' + y, -3, 3)),
      intakePerCapKcal: 1900 + wealth * 380 + R.between('kc|' + cc + '|' + y, -60, 60),
      priceLevel: fs.priceLevel,
      supply: fs
    };

    /* --- maladies non transmissibles ------------------------------------- */
    const ageRisk = 1 + (structure.over60 * .9);
    const sugarLoad = diet.sugarG / 50, saltLoad = diet.sodiumMg / 2000, bmiLoad = (p.urban - .4) * 2 + diet.ultraProcPct / 100;
    const diabetes = Math.min(24, (2.4 + wealth * 2.1 + bmiLoad * 3.4 + sugarLoad * 1.5 + progress * 2.1 + R.between('db|' + cc + '|' + y, -.8, .8)) * ageRisk);
    const hypertension = Math.min(46, (17 + saltLoad * 5.5 + bmiLoad * 4.2 + progress * 4.4 + R.between('ht|' + cc + '|' + y, -2, 2)) * ageRisk);
    const obesity = Math.min(30, 3 + wealth * 3.2 + p.urban * 5.5 + diet.ultraProcPct * .1 + progress * 1.6 + R.between('ob|' + cc + '|' + y, -1.2, 1.2));
    const ncd = {
      diabetes, diabetesUndiagnosed: Math.max(18, 62 - care * 30 - progress * 6 + R.between('du|' + cc + '|' + y, -4, 4)),
      diabetesControlled: Math.min(78, 9 + care * 34 + progress * 7 + R.between('dc|' + cc + '|' + y, -4, 4)),
      hypertension, hypertensionControlled: Math.min(70, 7 + care * 30 + progress * 8 + R.between('hc|' + cc + '|' + y, -4, 4)),
      obesity, overweight: obesity * 2.5,
      cvd: Math.min(900, 180 + hypertension * 12 + diabetes * 9 + R.between('cv|' + cc + '|' + y, -40, 40)),
      stroke: Math.min(400, 70 + hypertension * 7.4 + R.between('st|' + cc + '|' + y, -25, 25)),
      cancer: Math.min(260, 68 + wealth * 42 + p.urban * 40 + R.between('ca|' + cc + '|' + y, -18, 18)),
      kidney: Math.min(180, 34 + diabetes * 5.4 + hypertension * 1.8 + R.between('kd|' + cc + '|' + y, -14, 14)),
      tobacco: Math.min(34, 7 + wealth * 4 + R.between('tb|' + cc + '|' + y, -3, 5)),
      alcohol: Math.min(18, 2 + wealth * 4 + R.between('al|' + cc + '|' + y, -1.5, 3)),
      inactivity: Math.min(52, 15 + p.urban * 26 + wealth * 6 + R.between('pi|' + cc + '|' + y, -4, 4)),
      riskScore: 0
    };
    /* Indice composite 0→100 : pondérations calibrées pour occuper toute
       l'échelle utile (sans saturation) sur les pays de la région. */
    ncd.riskScore = Math.min(100, Math.round(diabetes * 2.2 + hypertension * 1.1 + obesity * 1.3 + ncd.inactivity * .45 + ncd.tobacco * .55));

    /* --- charge de morbidité & coûts ------------------------------------- */
    const dalysPer100k = 8200 + stunting * 190 + ncd.riskScore * 62 + (1 - care) * 2600 - progress * 900;
    const totalDeaths = pop * (.0082 + (1 - wealth) * .0035);
    const dietShare = Math.min(.42, .17 + ncd.riskScore / 380 + (diet.ultraProcPct / 100) * .1);
    const burden = {
      dalysPer100k,
      dalys: dalysPer100k * pop / 1e5,
      ncdDeathsShare: Math.min(.62, .24 + progress * .16 + ncd.riskScore / 420),
      totalDeaths,
      childDeaths: pop * structure.under5 * totals.under5Mort / 1000,
      dietAttributableDeaths: totalDeaths * dietShare,
      dietAttributableDalyPct: dietShare * 100,
      productivityLossUsd: dalysPer100k * pop / 1e5 * p.gdp * .11,
      costOfInactionUsd: dalysPer100k * pop / 1e5 * p.gdp * .11 * 5
    };

    /* --- services & cascade de prise en charge --------------------------- */
    const services = {
      facilitiesPer100k: 6 + care * 14 + R.between('fa|' + cc, -1.2, 1.2),
      nursesPer100k: p.nurses,
      doctorsPer100k: p.doctors,
      nutritionistsPer100k: p.nutri,
      insurance: p.insur * 100,
      screening: Math.min(92, p.screen * 100 * (1 + progress * .5) + care * 12 + R.between('sc|' + cc + '|' + y, -4, 4)),
      labCoverage: Math.min(96, p.lab * 100 * (1 + progress * .7) + R.between('lc|' + cc + '|' + y, -3, 3)),
      coldChain: Math.min(96, p.cold * 100 * (1 + progress * .8) + R.between('cc|' + cc + '|' + y, -3, 3)),
      stockouts: Math.max(3, 34 - care * 22 + R.between('so|' + cc + '|' + y, -4, 4)),
      referral: Math.min(92, 26 + care * 32 + R.between('rf|' + cc + '|' + y, -4, 4)),
      followUp: Math.min(88, 18 + care * 34 + R.between('fu|' + cc + '|' + y, -4, 4)),
      communityWorkers: Math.round(pop / 1000 * (.6 + care * .9))
    };

    /* --- régions --------------------------------------------------------- */
    const regions = regionsFor(cc).map((name, i) => {
      const seed = 'hr|' + cc + '|' + name;
      const share = R.between(seed + '|s', .08, .24);
      const urbanR = Math.max(.05, Math.min(.95, p.urban * R.between(seed + '|u', .45, 1.75)));
      const careR = Math.max(.15, Math.min(1.3, care * R.between(seed + '|c', .55, 1.4)));
      const foodAcc = Math.max(.25, Math.min(1, .45 + wealth * .3 * R.between(seed + '|f', .4, 1.5)));
      const st = Math.max(4, Math.min(52, stunting * R.between(seed + '|st', .62, 1.45)));
      const db = Math.max(1, Math.min(26, diabetes * (1 + (urbanR - p.urban) * .9) * R.between(seed + '|db', .75, 1.3)));
      const an = Math.max(5, Math.min(72, nutrition.anaemiaWomen * (1 + (1 - foodAcc) * .3) * R.between(seed + '|an', .8, 1.25)));
      const scr = Math.max(2, Math.min(95, services.screening * careR * R.between(seed + '|sc', .6, 1.4)));
      const facGap = Math.max(0, (1 - careR) * 100 * R.between(seed + '|fg', .4, 1.2));
      const popR = pop * share;
      const risk = Math.min(100, Math.round(st * 1.15 + db * 1.8 + (100 - scr) * .32 + facGap * .22 + (100 - an) * .12));
      return {
        name, share, population: popR, urban: urbanR, care: careR, foodAccess: foodAcc,
        stunting: st, wasting: Math.max(1, st * .3), anaemia: an, diabetes: db,
        hypertension: Math.max(6, Math.min(50, hypertension * R.between(seed + '|ht', .8, 1.2))),
        screening: scr, facilityGap: facGap, coverage: careR * 100,
        dalys: dalysPer100k * R.between(seed + '|d', .72, 1.35) * popR / 1e5,
        risk,
        hotspot: risk > 66 ? 'risk' : st > 28 ? 'nutrition' : scr < 35 ? 'access' : 'stable'
      };
    });

    /* --- historique 2010 → millésime courant ----------------------------- */
    const history = { years, stunting: [], wasting: [], anaemia: [], exclusiveBF: [], diabetes: [], hypertension: [], obesity: [], ncdShare: [], screening: [], dalysPer100k: [], healthSpendPerCap: [], dietSugar: [], dietSodium: [] };
    /* Rétro-projection : indicateurs en amélioration (dir 'down' : plus élevés
       dans le passé) ou en dégradation (dir 'up' : plus faibles dans le passé). */
    years.forEach((yy, i) => {
      const back = (y - yy) / 16;                       // 0 = millésime courant, 1 = 2010
      const f = (key, amp) => 1 + back * amp;   // back = 1 en 2010, 0 au millésime courant
      const at = (v, k, dir, amp) => v * (dir === 'down' ? f(k, amp) : 1 / f(k, amp)) * (1 + R.between('hs|' + cc + '|' + k + '|' + yy, -.015, .015));
      history.stunting[i] = at(stunting, 'st', 'down', .34);
      history.wasting[i] = at(wasting, 'wa', 'down', .18);
      history.anaemia[i] = at(nutrition.anaemiaWomen, 'an', 'down', .17);
      history.exclusiveBF[i] = at(nutrition.exclusiveBF, 'bf', 'up', .24);
      history.diabetes[i] = at(diabetes, 'db', 'up', .40);
      history.hypertension[i] = at(hypertension, 'ht', 'up', .26);
      history.obesity[i] = at(obesity, 'ob', 'up', .52);
      history.ncdShare[i] = at(burden.ncdDeathsShare, 'ns', 'up', .32);
      history.screening[i] = at(services.screening, 'sc', 'up', .52);
      history.dalysPer100k[i] = at(dalysPer100k, 'da', 'down', .13);
      history.healthSpendPerCap[i] = at(totals.healthSpendPerCapUsd, 'sp', 'up', .38);
      history.dietSugar[i] = at(diet.sugarG, 'ds', 'up', .33);
      history.dietSodium[i] = at(diet.sodiumMg, 'dn', 'up', .17);
    });

    /* --- bandes d'âge (0–59 mois en détail) ------------------------------ */
    const bands = [
      { id: 'b06', fr: '0–5 mois', en: '0–5 months', w: .14 },
      { id: 'b624', fr: '6–23 mois', en: '6–23 months', w: .28 },
      { id: 'b2459', fr: '24–59 mois', en: '24–59 months', w: .38 },
      { id: 'b512', fr: '5–12 ans', en: '5–12 years', w: .12 },
      { id: 'b12p', fr: '12 ans +', en: '12+ years', w: .08 }
    ];
    const ageBands = bands.map(b => ({
      id: b.id, fr: b.fr, en: b.en, weight: b.w,
      population: totals.under5 * b.w,
      stunting: stunting * (b.id === 'b06' ? .22 : b.id === 'b624' ? 1.28 : b.id === 'b2459' ? 1.12 : .35),
      wasting: wasting * (b.id === 'b06' ? .5 : b.id === 'b624' ? 1.45 : b.id === 'b2459' ? .95 : .3),
      overweight: obesityChild * (b.id === 'b06' ? .5 : b.id === 'b624' ? .95 : b.id === 'b2459' ? 1.2 : 1.7),
      anaemia: nutrition.anaemiaChildren * (b.id === 'b06' ? .55 : b.id === 'b624' ? 1.25 : b.id === 'b2459' ? 1.12 : .72)
    }));

    /* --- qualité & provenance des données -------------------------------- */
    const dataQuality = {
      completeness: Math.round(44 + p.lab * 60 + care * 12),
      timeliness: Math.round(34 + care * 34 + p.urban * 18),
      granularity: Math.round(40 + regionsFor(cc).length * 3.4),
      laboratory: Math.round(10 + p.lab * 78),
      linkage: Math.round(12 + p.insur * 120),
      surveillance: Math.round(28 + care * 42),
      gaps: [
        { fr: 'Enquête nationale de consommation alimentaire récente', en: 'Recent national food consumption survey', need: 'high' },
        { fr: 'Connexion DHIS2 ↔ laboratoires ↔ hôpitaux de référence', en: 'DHIS2 ↔ laboratories ↔ referral hospitals link', need: 'high' },
        { fr: 'Couverture du dépistage NCD en milieu rural', en: 'Rural NCD screening coverage', need: 'medium' },
        { fr: 'Biomarqueurs des carences en micronutriments', en: 'Micronutrient deficiency biomarkers', need: 'medium' },
        { fr: 'Suivi longitudinal des patients chroniques', en: 'Chronic patient longitudinal follow-up', need: 'medium' }
      ]
    };
    const provenance = [
      { id: 'nutrition', fr: 'État nutritionnel mère & enfant', en: 'Maternal & child nutrition', src: 'EDS/DHS + enquêtes SMART', freq: '3–5 ans', status: 'a_calibrer', link: 'Ministère de la Santé · UNICEF' },
      { id: 'ncd', fr: 'Prévalence NCD (diabète, HTA)', en: 'NCD prevalence (diabetes, hypertension)', src: 'STEPS OMS', freq: '3–5 ans', status: 'partiel', link: 'OMS · hôpitaux de référence' },
      { id: 'diet', fr: 'Apports alimentaires (sucre, sel, fibres)', en: 'Dietary intake (sugar, salt, fibre)', src: 'Bilans alimentaires + consommation', freq: 'annuel', status: 'modélisé', link: 'Section Agriculture + FAO' },
      { id: 'services', fr: 'Capacité de services & couverture', en: 'Service capacity & coverage', src: 'SARA + DHIS2', freq: 'annuel', status: 'disponible', link: 'DHIS2 national' },
      { id: 'burden', fr: 'Charge de morbidité & mortalité', en: 'Burden of disease & mortality', src: 'IHME GBD + registres nationaux', freq: 'annuel', status: 'partiel', link: 'IHME · OMS' }
    ];
    const partners = [
      { fr: 'Ministère de la Santé', en: 'Ministry of Health' },
      { fr: 'OMS', en: 'WHO' },
      { fr: 'UNICEF', en: 'UNICEF' },
      { fr: 'PAM', en: 'WFP' },
      { fr: 'Laboratoires nationaux', en: 'National laboratories' },
      { fr: 'Universités & recherche', en: 'Universities & research' }
    ];

    return {
      country: cc, countryName: p.name, year: y, years,
      profile: Object.assign({ country: cc, name: p.name }, p),
      totals, nutrition, ncd, diet, burden, services, regions, history, ageBands,
      dataQuality, provenance, partners, targets: TARGETS, dietBenchmarks: DIET,
      agriLinked: !!AGRI
    };
  }

  w.NUTRI_HEALTH_DATA = {
    __v59: true,
    COUNTRIES: C, availableCountries() { return CODES.slice(); }, YEARS, TARGETS, DIET_BENCHMARKS: DIET,
    build, foodSupply, regionsFor
  };
})(window, document && window.document);
