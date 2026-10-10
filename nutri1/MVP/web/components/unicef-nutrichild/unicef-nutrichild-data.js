/* ============================================================================
 * UNICEF NutriChildApp · Données de démonstration (16 pays d'Afrique de l'Ouest)
 * ----------------------------------------------------------------------------
 * - Valeurs de référence des 16 pays (MAS, allaitement exclusif, guérison
 *   CRENAS, vitamine A, score ANJE) : reprises telles quelles du brief.
 * - Les autres valeurs (population < 5 ans, retard de croissance, accès à l'eau,
 *   stock ATPE, districts, séries historiques, indicateurs ANJE détaillés) sont
 *   DÉRIVÉES de façon déterministe (graine fixe) pour l'interface. Ce sont des
 *   simulations : elles ne doivent pas être présentées comme des statistiques
 *   officielles avant rapprochement avec les enquêtes nationales.
 * - Courbes de croissance : approximation à partir de médianes et d'écarts
 *   relatifs OMS, et non les tables LMS officielles (à remplacer avant tout
 *   usage clinique).
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = (global.UNICEFNutriChild = global.UNICEFNutriChild || {});

  // ---------------------------------------------------------------------------
  // Utilitaires déterministes (aucune donnée aléatoire à chaque chargement)
  // ---------------------------------------------------------------------------

  /** Générateur pseudo-aléatoire mulberry32 : même graine = mêmes valeurs. */
  function rng(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Empreinte FNV-1a d'une chaîne, utilisée comme graine. */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const round1 = (v) => Math.round(v * 10) / 10;

  // ---------------------------------------------------------------------------
  // Charte UNICEF (couleurs exclusives du brief)
  // ---------------------------------------------------------------------------
  const BRAND = {
    primary: '#1CABE2',     // cyan UNICEF officiel
    secondary: '#80BD41',   // vert tendre
    tertiary: '#F26A21',    // orange chaleureux
    quaternary: '#DDA63A',  // doré enfance
    danger: '#E5243B',      // rouge urgence
    navy: '#002952',        // bleu nuit (sidebar)
    bg: '#F0F9FF',          // fond global
    border: '#BAE6FD',      // bordure cards
    sky: '#38BDF8',
    text: '#1E293B',
    body: '#64748B',
    muted: '#94A3B8',
    grid: '#F1F5F9',
    axis: '#E2E8F0'
  };

  /** Zones de travail : sert aux chips de filtrage et aux regroupements. */
  const ZONES = [
    { id: 'sahel', label: 'Sahel', color: BRAND.primary },
    { id: 'atlantique', label: 'Atlantique & côte ouest', color: BRAND.secondary },
    { id: 'golfe', label: 'Golfe de Guinée', color: BRAND.tertiary }
  ];

  /** Couleur stable par pays, pour les courbes et bulles. */
  const PALETTE = {
    NE: '#E5243B', ML: '#F26A21', BF: '#DDA63A', SN: '#80BD41', GN: '#1CABE2',
    CI: '#7C3AED', GH: '#0891B2', NG: '#B45309', MR: '#DC2626', SL: '#16A34A',
    LR: '#2563EB', GW: '#DB2777', GM: '#0D9488', BJ: '#65A30D', TG: '#9333EA', CV: '#0284C7'
  };

  /**
   * Données brutes des 16 pays (valeurs du brief) :
   * [code, nom, zone, lon, lat, population < 5 ans (M), MAS %, allaitement exclusif %,
   *  guérison CRENAS %, vitamine A %, score ANJE, retard de croissance % (simulé),
   *  accès eau de base % (simulé), stock ATPE en mois (simulé), districts (simulés)]
   */
  const RAW = [
    ['NE', 'Niger', 'sahel', 2.1, 13.5, 6.0, 14.8, 24, 86, 68, 34, 42.0, 49, 0.8, ['Maradi', 'Tahoua', 'Zinder']],
    ['ML', 'Mali', 'sahel', -8.0, 12.6, 5.2, 12.3, 28, 82, 71, 39, 25.0, 74, 1.2, ['Kayes', 'Ségou', 'Sikasso']],
    ['BF', 'Burkina Faso', 'sahel', -1.5, 12.4, 5.1, 8.1, 41, 88, 79, 52, 24.0, 76, 2.1, ['Boucle du Mouhoun', 'Est', 'Nord']],
    ['SN', 'Sénégal', 'atlantique', -17.4, 14.7, 3.6, 7.2, 38, 91, 83, 58, 17.0, 85, 3.0, ['Kaolack', 'Matam', 'Tambacounda']],
    ['GN', 'Guinée', 'atlantique', -13.7, 9.5, 2.8, 9.3, 44, 85, 74, 54, 21.0, 81, 2.2, ['Kankan', 'Labé', 'Nzérékoré']],
    ['CI', "Côte d'Ivoire", 'golfe', -5.3, 6.8, 4.9, 6.8, 36, 89, 81, 55, 22.0, 83, 2.6, ['Bouaké', 'Korhogo', 'San-Pédro']],
    ['GH', 'Ghana', 'golfe', -0.2, 5.6, 5.4, 5.7, 48, 92, 79, 63, 17.0, 88, 3.4, ['Northern', 'Upper East', 'Volta']],
    ['NG', 'Nigeria', 'golfe', 7.5, 9.1, 38.0, 7.2, 22, 79, 58, 38, 32.0, 67, 1.6, ['Kano', 'Sokoto', 'Lagos']],
    ['MR', 'Mauritanie', 'sahel', -15.9, 18.1, 1.0, 15.1, 26, 83, 66, 37, 19.0, 62, 0.9, ['Hodh El Gharbi', 'Gorgol', 'Trarza']],
    ['SL', 'Sierra Leone', 'atlantique', -13.2, 8.5, 1.4, 6.4, 34, 87, 72, 48, 29.0, 60, 2.5, ['Kenema', 'Bo', 'Port Loko']],
    ['LR', 'Liberia', 'atlantique', -10.8, 6.3, 0.9, 5.3, 39, 84, 69, 45, 32.0, 74, 2.8, ['Nimba', 'Grand Gedeh', 'Bong']],
    ['GW', 'Guinée-Bissau', 'atlantique', -15.6, 11.9, 0.35, 7.1, 31, 81, 64, 42, 27.0, 66, 1.9, ['Bafatá', 'Gabú', 'Oio']],
    ['GM', 'Gambie', 'atlantique', -16.6, 13.45, 0.43, 11.2, 42, 89, 77, 56, 20.0, 90, 2.4, ['Upper River', 'Central River', 'West Coast']],
    ['BJ', 'Bénin', 'golfe', 2.6, 6.5, 2.3, 5.1, 45, 90, 76, 59, 32.0, 67, 2.9, ['Alibori', 'Atacora', 'Zou']],
    ['TG', 'Togo', 'golfe', 1.2, 6.1, 1.5, 6.3, 43, 88, 78, 57, 26.0, 75, 2.7, ['Savanes', 'Kara', 'Plateaux']],
    ['CV', 'Cap-Vert', 'atlantique', -23.5, 14.9, 0.06, 2.1, 62, 95, 89, 78, 10.0, 95, 3.6, ['Santiago', 'Santo Antão', 'Sal']]
  ];

  /** Cibles de référence utilisées par les jauges, bullets et lignes de repère. */
  const TARGET = { vitA: 80, allait: 70, guer: 75, abandon: 15, deces: 10 };

  /** Référence régionale officielle du brief (utilisée en vue globale complète). */
  const REF = { allait: 32, guer: 84.7, vitA: 71, admMonth: 48234 };

  /** Données synchro app (texte du badge). */
  const SYNC = { minutesAgo: 5, childrenMonth: 528100 };

  // ---------------------------------------------------------------------------
  // Indicateurs ANJE (8 axes du radar, colonnes de la heatmap)
  // ---------------------------------------------------------------------------
  const ANJE_LABELS = [
    'Mise au sein précoce', 'Allaitement exclusif', 'Intro. aliments complémentaires',
    'Diversité alimentaire min.', 'Fréquence repas min.', 'Alimentation acceptable',
    'Hors biberon (inversé)', 'Allaitement à 2 ans'
  ];
  const ANJE_SHORT = ['Mise au sein', 'Allait. excl.', 'Intro. compl.', 'Diversité', 'Fréquence', 'Alim. accept.', 'Sans biberon', 'Allait. 2 ans'];
  /** Benchmarks OMS / cibles par indicateur ANJE. */
  const ANJE_OMS = [80, 70, 90, 80, 80, 80, 90, 50];

  /** Dérive les 8 indicateurs ANJE à partir du score ANJE et de l'allaitement exclusif. */
  function deriveAnje8(anje, allait) {
    return [
      Math.round(clamp(35 + 0.7 * anje, 0, 98)),
      Math.round(allait),
      Math.round(clamp(40 + 0.8 * anje, 0, 98)),
      Math.round(clamp(0.85 * anje + 5, 0, 98)),
      Math.round(clamp(0.9 * anje + 8, 0, 98)),
      Math.round(clamp(0.95 * anje + 5, 0, 98)),
      Math.round(clamp(60 + 0.4 * anje, 0, 98)),
      Math.round(clamp(0.45 * allait + 0.55 * anje, 0, 98))
    ];
  }

  // ---------------------------------------------------------------------------
  // Calendrier, saisonnalité et admissions
  // ---------------------------------------------------------------------------
  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const QUARTERS = ['T1', 'T2', 'T3', 'T4'];
  /** Part des admissions annuelles par mois : pic de soudure juin → septembre. Somme = 1. */
  const PROFILE = [0.065, 0.062, 0.070, 0.078, 0.086, 0.102, 0.106, 0.119, 0.106, 0.084, 0.062, 0.060];
  /** Admissions annuelles régionales (cohérentes avec 48 234 admissions en août). */
  const ADM_ANNUAL = 405328;
  /** Années de l'historique MAS et des campagnes. */
  const YEARS_HIST = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const CAMPAIGN_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

  // ---------------------------------------------------------------------------
  // Dérivés : historique, tendance 12 mois, districts
  // ---------------------------------------------------------------------------
  /** Historique MAS 2016-2024 : descente progressive vers la valeur actuelle. */
  function makeMasHistory(mas, r) {
    const start = mas * (1.08 + 0.12 * r());
    return YEARS_HIST.map((_, i) => {
      const t = i / (YEARS_HIST.length - 1);
      const noise = (r() - 0.5) * 0.08 * mas;
      return round1(clamp(start + (mas - start) * t + (i === YEARS_HIST.length - 1 ? 0 : noise), 0.5, 40));
    });
  }

  /** Tendance mensuelle de guérison sur 12 mois, terminant à la valeur actuelle. */
  function makeGuerTrend(guer, r) {
    const start = guer - (2 + 4 * r());
    return MONTHS.map((_, m) => {
      const base = start + (guer - start) * (m / 11);
      return m === 11 ? guer : round1(clamp(base + (r() - 0.5) * 1.0, 50, 99));
    });
  }

  /** Une unité (pays ou district) avec toutes les grandeurs calculées. */
  function makeUnit(base) {
    const u = Object.assign({}, base);
    const r = rng(hash(u.key + '|derive'));
    u.abandon = round1((100 - u.guer) * 0.6);
    u.deces = round1((100 - u.guer) * 0.25);
    u.anje8 = deriveAnje8(u.anje, u.allait);
    u.guerTrend = makeGuerTrend(u.guer, r);
    u.masHist = makeMasHistory(u.mas, r);
    u.vitA2022 = round1(clamp(u.vitA - (2 + 7 * r()), 20, 99));
    return u;
  }

  /** Découpe un pays en 3 districts (régions administratives) dont les valeurs gravitent autour du national. */
  function makeDistricts(c) {
    const r = rng(hash(c.code + '|districts'));
    const DISTRICT_COLORS = [BRAND.primary, BRAND.secondary, BRAND.tertiary];
    const raw = c.districtNames.map((name) => {
      const rr = rng(hash(c.code + '|' + name));
      const mas = round1(clamp(c.mas * (0.7 + 0.6 * rr()), 0.5, 40));
      return {
        name,
        mas,
        allait: round1(clamp(c.allait + (rr() - 0.5) * 16, 10, 80)),
        guer: round1(clamp(c.guer + (rr() - 0.5) * 10, 60, 99)),
        vitA: round1(clamp(c.vitA + (rr() - 0.5) * 16, 30, 98)),
        anje: round1(clamp(c.anje + (rr() - 0.5) * 12, 10, 85)),
        stunt: round1(clamp(c.stunt * (0.85 + 0.3 * rr()), 5, 60)),
        wash: round1(clamp(c.wash + (rr() - 0.5) * 18, 25, 99)),
        atpe: c.atpe,
        weight: (0.6 + 0.8 * r()) * (mas / c.mas)
      };
    });
    const totalWeight = raw.reduce((s, d) => s + d.weight, 0);
    return raw.map((d, i) => {
      const share = d.weight / totalWeight;
      return makeUnit({
        key: c.code + '-' + (i + 1),
        code: c.code,
        name: d.name,
        level: 'district',
        zone: c.zone,
        color: DISTRICT_COLORS[i],
        lon: c.lon,
        lat: c.lat,
        u5: round1(c.u5 * share * 100) / 100,
        mas: d.mas,
        allait: d.allait,
        guer: d.guer,
        vitA: d.vitA,
        anje: d.anje,
        stunt: d.stunt,
        wash: d.wash,
        atpe: d.atpe,
        mdk: round1(c.mdk * share),
        adm: c.adm * share
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Construction des pays
  // ---------------------------------------------------------------------------
  const totalRawMdk = RAW.reduce((sum, r) => sum + r[5] * r[6] * 5.2, 0); // (M × % × 10 × 0,52) en milliers
  const countries = RAW.map((r) => {
    const [code, name, zone, lon, lat, u5, mas, allait, guer, vitA, anje, stunt, wash, atpe, districtNames] = r;
    // Enfants MAS dépistés (milliers) : 52 % des cas estimés (u5 × MAS × 10 000) ; Niger aligné sur la valeur de référence 890 K.
    const mdk = code === 'NE' ? 890 : u5 * mas * 5.2;
    return {
      key: code,
      code,
      name,
      level: 'country',
      zone,
      color: PALETTE[code],
      lon,
      lat,
      u5,
      mas,
      allait,
      guer,
      vitA,
      anje,
      stunt,
      wash,
      atpe,
      districtNames,
      mdk,
      adm: ADM_ANNUAL * (u5 * mas * 5.2) / totalRawMdk // placeholder recalculé plus bas
    };
  });

  // Recalcule les admissions annuelles pour que le total régional corresponde à ADM_ANNUAL.
  const totalMdk = countries.reduce((s, c) => s + c.mdk, 0);
  countries.forEach((c) => { c.adm = ADM_ANNUAL * c.mdk / totalMdk; });

  // Dérive les grandeurs complètes et les districts.
  const COUNTRY_UNITS = countries.map((c) => {
    const unit = makeUnit(c);
    unit.districts = makeDistricts(c).map((d) => makeUnit(d));
    return unit;
  });
  const DISTRICT_UNITS = COUNTRY_UNITS.flatMap((c) => c.districts);

  /** Fiche d'un pays par code. */
  function countryByCode(code) {
    return COUNTRY_UNITS.find((c) => c.code === code) || COUNTRY_UNITS[0];
  }

  // ---------------------------------------------------------------------------
  // Courbes de croissance OMS (approximation médiane × (1 + S·z))
  // ---------------------------------------------------------------------------
  const GROWTH_AGES = [0, 3, 6, 9, 12, 18, 24, 36, 48, 60];
  const GROWTH = {
    metrics: {
      poids: {
        key: 'poids', label: 'Poids pour âge', unit: 'kg', yMin: 1.5, yMax: 24, yStep: 2, S0: 0.13, S60: 0.12,
        median: {
          M: [3.35, 6.4, 7.9, 8.9, 9.6, 10.9, 12.2, 14.3, 16.3, 18.3],
          F: [3.2, 5.8, 7.3, 8.2, 8.9, 10.2, 11.5, 13.9, 15.9, 18.2]
        }
      },
      taille: {
        key: 'taille', label: 'Taille pour âge', unit: 'cm', yMin: 40, yMax: 125, yStep: 10, S0: 0.038, S60: 0.035,
        median: {
          M: [49.9, 61.4, 67.6, 72.0, 75.7, 82.3, 87.1, 96.1, 103.3, 110.0],
          F: [49.1, 59.8, 65.7, 70.1, 74.0, 80.7, 86.4, 95.1, 102.7, 109.4]
        }
      },
      pb: {
        key: 'pb', label: 'Périmètre brachial', unit: 'mm', yMin: 80, yMax: 185, yStep: 15, S0: 0.085, S60: 0.075,
        median: {
          M: [105, 126, 136, 140, 142, 144, 146, 148, 150, 152],
          F: [103, 124, 134, 138, 140, 142, 144, 146, 148, 150]
        }
      }
    },
    /** Percentiles OMS représentés (z-scores normaux). */
    percentiles: [
      { key: 'P3', z: -1.881 }, { key: 'P15', z: -1.036 }, { key: 'P50', z: 0 },
      { key: 'P85', z: 1.036 }, { key: 'P97', z: 1.881 }
    ]
  };

  /** Interpolation linéaire d'une série indexée par GROWTH_AGES. */
  function interpAge(values, age) {
    const a = clamp(age, GROWTH_AGES[0], GROWTH_AGES[GROWTH_AGES.length - 1]);
    for (let i = 0; i < GROWTH_AGES.length - 1; i++) {
      const a0 = GROWTH_AGES[i];
      const a1 = GROWTH_AGES[i + 1];
      if (a >= a0 && a <= a1) {
        const t = (a - a0) / (a1 - a0);
        return values[i] + (values[i + 1] - values[i]) * t;
      }
    }
    return values[values.length - 1];
  }

  /** Valeur attendue (médiane) d'une mesure à un âge donné, en mois. */
  function growthMedian(metricKey, sex, age) {
    return interpAge(GROWTH.metrics[metricKey].median[sex], age);
  }

  /** Valeur mesurée pour un z-score donné. */
  function growthValue(metricKey, sex, age, z) {
    const m = GROWTH.metrics[metricKey];
    const spread = m.S0 + (m.S60 - m.S0) * clamp(age / 60, 0, 1);
    return growthMedian(metricKey, sex, age) * (1 + spread * z);
  }

  /** Courbe percentile (échantillonnée tous les 2 mois jusqu'à 60 mois). */
  function growthCurve(metricKey, sex, z) {
    const pts = [];
    for (let age = 0; age <= 60; age += 2) pts.push({ x: age, y: growthValue(metricKey, sex, age, z) });
    return pts;
  }

  /** Mesures terrain simulées (z-scores), déterministes par unité. */
  const pointCache = {};
  function samplePoints(unit) {
    if (pointCache[unit.key]) return pointCache[unit.key];
    const n = unit.level === 'country' ? 8 : 12;
    const r = rng(hash('child|' + unit.key));
    const shift = -(unit.mas - 8.2) / 10; // une MAS élevée décale les mesures vers le bas
    const list = [];
    for (let i = 0; i < n; i++) {
      const u1 = Math.max(r(), 1e-6);
      const u2 = r();
      const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      list.push({
        age: Math.floor(r() * 60),
        z: clamp(shift + gauss * 0.95, -3.2, 3.2),
        sex: r() < 0.5 ? 'F' : 'M',
        name: unit.name,
        key: unit.key
      });
    }
    pointCache[unit.key] = list;
    return list;
  }

  // ---------------------------------------------------------------------------
  // Bullet charts, timeline, campagnes, données fixes
  // ---------------------------------------------------------------------------
  /** Métriques des bullet charts (guérison, abandon, décès). */
  const BULLET = {
    guerison: {
      key: 'guer', label: 'Taux de guérison (%)', target: 75, max: 100, higherIsBetter: true,
      bands: [{ to: 60, tone: 'poor' }, { to: 75, tone: 'ok' }, { to: 100, tone: 'good' }],
      note: 'Seuil Sphère ≥ 75 %'
    },
    abandon: {
      key: 'abandon', label: "Taux d'abandon (%)", target: 15, max: 30, higherIsBetter: false,
      bands: [{ to: 15, tone: 'good' }, { to: 20, tone: 'ok' }, { to: 30, tone: 'poor' }],
      note: "Seuil Sphère ≤ 15 %"
    },
    deces: {
      key: 'deces', label: 'Taux de décès (%)', target: 10, max: 15, higherIsBetter: false,
      bands: [{ to: 10, tone: 'good' }, { to: 12, tone: 'ok' }, { to: 15, tone: 'poor' }],
      note: 'Seuil Sphère ≤ 10 %'
    }
  };

  /** Couvertures de campagnes 2017-2024 (base 2024 = niveau régional de référence). */
  const CAMPAIGN_BASE = {
    vitA: [52, 55, 58, 61, 63, 66, 68, 71],
    deparasitage: [41, 44, 47, 50, 53, 57, 62, 68],
    zinc: [0, 0, 8, 14, 21, 27, 32, 36]
  };

  /** Frise des 1000 premiers jours : jalons et interventions (jours depuis la naissance). */
  const TIMELINE = {
    min: -270,
    max: 730,
    milestones: [
      { day: -270, label: 'Conception' },
      { day: 0, label: 'Naissance' },
      { day: 180, label: '6 mois' },
      { day: 365, label: '12 mois' },
      { day: 730, label: '24 mois' }
    ],
    rows: [
      { key: 'fer', label: 'Fer (grossesse)', from: -270, to: 0, base: 58, color: BRAND.quaternary },
      { key: 'allait', label: 'Allaitement exclusif', from: 0, to: 180, source: 'allait', color: BRAND.primary },
      { key: 'compl', label: 'Alimentation complémentaire', from: 180, to: 730, base: 48, color: BRAND.secondary },
      { key: 'vitA', label: 'Vitamine A', from: 180, to: 730, source: 'vitA', color: BRAND.tertiary },
      { key: 'deparasit', label: 'Déparasitage', from: 365, to: 730, base: 64, color: '#7C3AED' }
    ],
    /** Réduction potentielle du retard de croissance (%) à 1000 jours, valeur régionale. */
    impactRegional: 20
  };

  /** Répartition des déterminants (causes directes et sous-jacentes), valeurs de référence. */
  const DRIVERS = {
    direct: ['Alimentation inadéquate', 'Maladies infectieuses'],
    underlying: ['Insécurité alimentaire', 'WASH', 'Soins', 'Pauvreté']
  };

  /** Carte schématique : projection simple lon/lat (bornes Afrique de l'Ouest). */
  const MAP_BOUNDS = { lonMin: -26, lonMax: 16, latMin: 4, latMax: 25 };

  // ---------------------------------------------------------------------------
  // Export du jeu de données
  // ---------------------------------------------------------------------------
  NS.DATA = {
    brand: BRAND,
    zones: ZONES,
    palette: PALETTE,
    countries: COUNTRY_UNITS,
    districts: DISTRICT_UNITS,
    countryByCode,
    target: TARGET,
    ref: REF,
    sync: SYNC,
    months: MONTHS,
    quarters: QUARTERS,
    profile: PROFILE,
    admAnnual: ADM_ANNUAL,
    yearsHist: YEARS_HIST,
    campaignYears: CAMPAIGN_YEARS,
    campaignBase: CAMPAIGN_BASE,
    anjeLabels: ANJE_LABELS,
    anjeShort: ANJE_SHORT,
    anjeOms: ANJE_OMS,
    growth: GROWTH,
    growthAges: GROWTH_AGES,
    growthMedian,
    growthValue,
    growthCurve,
    samplePoints,
    bullet: BULLET,
    timeline: TIMELINE,
    drivers: DRIVERS,
    mapBounds: MAP_BOUNDS,
    rng,
    hash,
    clamp
  };
})(window);
