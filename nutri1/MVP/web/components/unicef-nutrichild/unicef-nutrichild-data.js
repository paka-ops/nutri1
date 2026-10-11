/* ============================================================================
 * UNICEF NutriChild · Surveillance Nutritionnelle Infantile
 * Fichier : unicef-nutrichild-data.js
 * Rôle    : Jeu de données de référence du tableau de bord.
 *
 *  Source  : Application Mobile Terrain UNICEF & Relais Communautaires
 *            (Dépistages MUAC/PB, suivi des dossiers CRENAS/CRENAM,
 *             questionnaires ménages ANJE & WASH, campagnes de supplémentation).
 *  Périmètre : 16 pays d'Afrique de l'Ouest · 2024 (démonstration).
 *
 *  Contenu :
 *    · meta        — textes institutionnels + horodatage de synchronisation
 *    · countries   — 16 enregistrements pays (indicateurs app terrain)
 *    · districts   — découpage administratif de 1er niveau par pays
 *    · ANJE        — 8 indicateurs de pratiques + objectifs OMS
 *    · OMS_REF     — références de croissance (percentiles interpolés)
 *    · P3Z / P15Z / P85Z / P97Z — z-scores des percentiles (loi normale)
 *    · séries temporelles (mensuelles 2024, historiques 2016-2024)
 *    · campagnes de supplémentation 2017-2024
 *    · jalons des 1000 premiers jours
 *
 *  NB : les valeurs sont des données de démonstration réalistes, cohérentes
 *  avec les ordres de grandeur publiés (UNICEF/OMS/SMART) pour la région.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = (global.NutriChild = global.NutriChild || {});

  /* -------------------------------------------------------------------------
   * 0. Générateur pseudo-aléatoire déterministe (seedé)
   *    Sert UNIQUEMENT à dériver finement les valeurs de district à partir de
   *    l'indicateur pays : le même pays produit toujours exactement les mêmes
   *    districts (aucun aléatoire à l'exécution).
   * ----------------------------------------------------------------------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  /* Facteur multiplicatif borné ∈ [1-amp, 1+amp], déterministe pour (seed, i) */
  function factor(seed, i, amp) {
    const h = hash(seed + '#' + i);
    return 1 + ((h % 2000) / 1000 - 1) * amp;
  }
  NC.hash = hash;
  NC.factor = factor;

  /* -------------------------------------------------------------------------
   * 1. Métadonnées institutionnelles
   * ----------------------------------------------------------------------- */
  NC.DATA = {};
  NC.DATA.meta = {
    institution: 'UNICEF',
    produit: 'UNICEF NutriChild',
    titre: 'Surveillance Nutritionnelle Infantile',
    sousTitre: "Données App Mobile Terrain · Agents Communautaires & Centres Nutri 2024",
    source: 'Application Mobile Terrain UNICEF & Relais Communautaires (Dépistages MUAC & Suivi CRENAS)',
    version: 'App v4.2 · Sync différentielle',
    derniereSynchro: 'il y a 5 min',
    enfantsDepistesMois: 528100,
    enfantsDepistesLibelle: '528 100 enfants dépistés ce mois',
    pays: 16,
    annee: 2024
  };

  /* Mois de l'année (libellés courts FR et complets) */
  NC.DATA.MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  NC.DATA.MOIS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  /* Indices de la période de soudure (juin → septembre) */
  NC.DATA.SOUDURE = [5, 6, 7, 8];

  /* -------------------------------------------------------------------------
   * 2. Références de croissance OMS (0 → 60 mois)
   *    Médianes (M) et coefficients de variation (CV) tabulés aux âges clés,
   *    interpolés de façon monotone entre les points.
   *    Percentiles déduits par z-score (P3 = −1,881 ; P15 = −1,036 ;
   *    P85 = +1,036 ; P97 = +1,881) sur une distribution normale :
   *        valeur(âge) = M(âge) × (1 + z × CV(âge))
   * ----------------------------------------------------------------------- */
  const AGE_KNOTS = [0, 1, 3, 6, 9, 12, 18, 24, 36, 48, 60];

  NC.DATA.OMS_REF = {
    /* Poids pour âge (kg) */
    poids: {
      garcon: {
        M:  [3.35, 4.47, 6.38, 7.93, 8.90, 9.60, 10.75, 11.90, 13.85, 15.65, 17.30],
        CV: [0.140, 0.135, 0.120, 0.115, 0.110, 0.108, 0.108, 0.110, 0.115, 0.120, 0.125]
      },
      fille: {
        M:  [3.23, 4.19, 5.85, 7.30, 8.20, 8.85, 10.00, 11.20, 13.10, 15.00, 16.90],
        CV: [0.140, 0.135, 0.122, 0.118, 0.113, 0.112, 0.112, 0.115, 0.120, 0.128, 0.135]
      },
      unite: 'kg', label: 'Poids pour âge', dec: 1
    },
    /* Taille pour âge (cm) */
    taille: {
      garcon: {
        M:  [49.9, 54.7, 61.4, 67.6, 72.0, 75.7, 82.3, 87.1, 96.1, 103.3, 110.0],
        CV: [0.037, 0.035, 0.033, 0.032, 0.031, 0.030, 0.030, 0.031, 0.033, 0.035, 0.038]
      },
      fille: {
        M:  [49.1, 53.7, 59.8, 65.7, 70.1, 74.0, 80.7, 85.7, 95.1, 102.7, 109.4],
        CV: [0.038, 0.036, 0.034, 0.033, 0.032, 0.031, 0.031, 0.032, 0.034, 0.036, 0.039]
      },
      unite: 'cm', label: 'Taille pour âge', dec: 1
    },
    /* Périmètre brachial pour âge (cm) — référence MUAC OMS */
    muac: {
      garcon: {
        M:  [9.9, 10.6, 11.9, 13.4, 13.8, 14.1, 14.5, 14.9, 15.4, 15.9, 16.4],
        CV: [0.085, 0.082, 0.078, 0.074, 0.072, 0.071, 0.071, 0.072, 0.074, 0.077, 0.080]
      },
      fille: {
        M:  [9.7, 10.4, 11.7, 13.1, 13.5, 13.9, 14.3, 14.7, 15.2, 15.7, 16.3],
        CV: [0.087, 0.084, 0.079, 0.076, 0.074, 0.073, 0.073, 0.074, 0.076, 0.079, 0.082]
      },
      unite: 'cm', label: 'Périmètre brachial', dec: 1
    }
  };
  NC.DATA.AGE_KNOTS = AGE_KNOTS;

  /* z-scores des percentiles retenus (loi normale centrée réduite) */
  NC.DATA.Z = { P3: -1.881, P15: -1.036, P50: 0, P85: 1.036, P97: 1.881 };
  /* Couleurs officielles des zones de percentiles (code couleur médical) */
  NC.DATA.PCT_STYLE = [
    { key: 'P3',  label: 'P3',  color: '#E5243B', zone: 'Malnutrition sévère' },
    { key: 'P15', label: 'P15', color: '#F26A21', zone: 'Malnutrition modérée' },
    { key: 'P50', label: 'P50', color: '#80BD41', zone: 'Médiane OMS' },
    { key: 'P85', label: 'P85', color: '#1CABE2', zone: 'Croissance normale haute' },
    { key: 'P97', label: 'P97', color: '#DDA63A', zone: 'Croissance très élevée' }
  ];
  /* Seuils de dépistage MUAC (mm) */
  NC.DATA.MUAC_SEUILS = { mas: 115, mam: 125, normal: 135 };

  /* -------------------------------------------------------------------------
   * 3. Les 16 pays d'Afrique de l'Ouest
   *    Colonnes :
      code  iso   pays          drapeau région
      u5    — enfants de moins de 5 ans (milliers)
      scr   — enfants dépistés MUAC via l'App cette année (milliers)
      mas   — prévalence Malnutrition Aigüe Sévère (%)
      mam   — prévalence Malnutrition Aigüe Modérée (%)
      stun  — retard de croissance / stunting (%)
      ebf   — allaitement exclusif 0-6 mois (%)
      rec   — taux de guérison CRENAS (%)
      abn   — taux d'abandon CRENAS (%)
      dec   — taux de décès CRENAS (%)
      vitA  — couverture supplémentation Vitamine A (%)
      dpar  — couverture déparasitage (%)
      zinc  — couverture supplémentation en Zinc (%)
      anje  — score composite ANJE /100
      anem  — anémie chez l'enfant 6-59 mois (%)
      eau   — accès à l'eau potable dans le ménage (%)
      latr  — accès à des latrines améliorées (%)
      main  — lavage des mains au savon observé (%)
      inse  — insécurité alimentaire modérée ou grave (%)
      pauv  — pauvreté monétaire (%)
      adm   — admissions CRENAS sur le mois en cours
      dispo — disponibilité ATPE en stock (%) */
  /* ----------------------------------------------------------------------- */
  const NAMES = ['NE', 'ML', 'BF', 'SN', 'NG', 'GH', 'GN', 'MR', 'SL', 'LR', 'GW', 'GM', 'BJ', 'TG', 'CV', 'CI'];
  const RAW = [
    /* c   u5    scr   mas   mam  stun  ebf  rec  abn  dec  vitA dpar zinc anje anem eau  latr main inse pauv   adm dispo */
    ['NE', 4412, 1980, 14.8, 11.4, 47.2, 24,  86.0, 6.1, 1.9, 68,  74,  41,  34,  72,  48,  33,  29,  58,  60.8, 18420, 62],
    ['ML', 3680, 1620, 12.3,  9.8, 38.5, 28,  82.0, 8.4, 2.6, 71,  77,  44,  39,  68,  54,  40,  35,  52,  54.7, 14180, 58],
    ['BF', 3120, 1540,  8.1,  7.2, 25.4, 41,  88.0, 5.2, 1.6, 80,  84,  57,  52,  61,  62,  48,  42,  44,  41.4, 11460, 71],
    ['SN', 2412, 1310,  7.2,  6.1, 17.1, 38,  91.0, 4.4, 1.3, 83,  88,  63,  58,  55,  74,  58,  54,  33,  32.4,  9120, 78],
    ['NG', 33420, 8940, 7.2, 10.9, 34.6, 22,  79.0, 9.8, 3.1, 58,  66,  37,  38,  64,  52,  47,  44,  55,  40.1, 42860, 49],
    ['GH', 3720, 1880,  5.7,  4.4, 17.5, 48,  92.0, 3.6, 1.1, 79,  86,  71,  63,  50,  71,  61,  58,  28,  23.4, 11640, 84],
    ['GN', 2140,  980,  9.3,  8.1, 30.1, 44,  85.0, 6.6, 2.1, 74,  79,  52,  54,  67,  57,  42,  38,  47,  43.7,  7420, 66],
    ['MR', 1120,  560, 15.1, 12.6, 29.8, 26,  83.0, 7.9, 2.4, 66,  71,  39,  37,  59,  61,  44,  39,  49,  32.2,  5180, 60],
    ['SL', 1280,  640,  6.4,  5.2, 29.6, 34,  87.0, 5.8, 1.8, 72,  76,  49,  48,  70,  55,  40,  36,  51,  56.8,  4620, 69],
    ['LR', 1120,  510,  5.3,  4.6, 29.4, 39,  84.0, 6.9, 2.2, 69,  70,  45,  45,  66,  51,  38,  33,  48,  50.9,  3780, 64],
    ['GW',  620,  240,  7.1,  5.9, 27.3, 31,  81.0, 8.1, 2.7, 64,  68,  42,  42,  69,  58,  41,  37,  46,  47.7,  1980, 57],
    ['GM',  480,  230, 11.2,  9.1, 22.4, 42,  89.0, 4.9, 1.5, 77,  82,  55,  56,  58,  68,  51,  46,  38,  48.6,  2240, 73],
    ['BJ', 1620,  870,  5.1,  4.2, 19.8, 45,  90.0, 4.1, 1.4, 76,  83,  66,  59,  57,  70,  55,  50,  34,  38.5,  6480, 80],
    ['TG', 1240,  690,  6.3,  5.1, 21.6, 43,  88.0, 5.4, 1.7, 78,  84,  61,  57,  60,  67,  53,  47,  36,  45.5,  4980, 76],
    ['CV',  116,   68,  2.1,  1.8,  9.8, 62,  95.0, 2.2, 0.6, 89,  92,  84,  78,  44,  88,  74,  71,  19,  15.6,   620, 94],
    ['CI', 6840, 3120,  6.8,  6.4, 21.9, 36,  89.0, 5.1, 1.6, 81,  85,  60,  55,  62,  68,  49,  44,  41,  39.2, 21840, 75]
  ];

  const PAYS_INFO = {
    NE: ['Niger', '🇳🇪', 'Sahel', 'Niamey'],
    ML: ['Mali', '🇲🇱', 'Sahel', 'Bamako'],
    BF: ['Burkina Faso', '🇧🇫', 'Sahel', 'Ouagadougou'],
    SN: ['Sénégal', '🇸🇳', 'Sahel côtier', 'Dakar'],
    NG: ['Nigeria', '🇳🇬', 'Golfe de Guinée', 'Abuja'],
    GH: ['Ghana', '🇬🇭', 'Golfe de Guinée', 'Accra'],
    GN: ['Guinée', '🇬🇳', 'Côtier', 'Conakry'],
    MR: ['Mauritanie', '🇲🇷', 'Sahel', 'Nouakchott'],
    SL: ['Sierra Leone', '🇸🇱', 'Côtier', 'Freetown'],
    LR: ['Liberia', '🇱🇷', 'Côtier', 'Monrovia'],
    GW: ['Guinée-Bissau', '🇬🇼', 'Côtier', 'Bissau'],
    GM: ['Gambie', '🇬🇲', 'Sahel côtier', 'Banjul'],
    BJ: ['Bénin', '🇧🇯', 'Golfe de Guinée', 'Porto-Novo'],
    TG: ['Togo', '🇹🇬', 'Golfe de Guinée', 'Lomé'],
    CV: ['Cap-Vert', '🇨🇻', 'Insulaire', 'Praia'],
    CI: ['Côte d’Ivoire', '🇨🇮', 'Golfe de Guinée', 'Yamoussoukro']
  };

  /* Découpage administratif de 1er niveau (régions / districts) par pays */
  const DISTRICTS = {
    NE: ['Agadez', 'Diffa', 'Dosso', 'Maradi', 'Tahoua', 'Tillabéri', 'Zinder', 'Niamey'],
    ML: ['Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'Tombouctou', 'Gao', 'Kidal', 'Bamako'],
    BF: ['Boucle du Mouhoun', 'Cascades', 'Centre', 'Centre-Nord', 'Centre-Ouest', 'Est', 'Hauts-Bassins', 'Nord', 'Sahel', 'Sud-Ouest'],
    SN: ['Dakar', 'Diourbel', 'Fatick', 'Kaffrine', 'Kaolack', 'Kolda', 'Louga', 'Matam', 'Saint-Louis', 'Tambacounda', 'Thiès', 'Ziguinchor'],
    NG: ['Abuja FCT', 'Kano', 'Katsina', 'Lagos', 'Oyo', 'Rivers', 'Sokoto', 'Borno', 'Kaduna', 'Bauchi'],
    GH: ['Greater Accra', 'Ashanti', 'Northern', 'Eastern', 'Western', 'Volta', 'Upper East', 'Upper West', 'Central', 'Bono'],
    GN: ['Boké', 'Conakry', 'Faranah', 'Kankan', 'Kindia', 'Labé', 'Mamou', 'Nzérékoré'],
    MR: ['Nouakchott', 'Assaba', 'Brakna', 'Gorgol', 'Guidimakha', 'Hodh Ech Chargui', 'Hodh El Gharbi', 'Trarza'],
    SL: ['Western Area', 'Bo', 'Bombali', 'Kailahun', 'Kenema', 'Kono', 'Moyamba', 'Port Loko', 'Tonkolili'],
    LR: ['Montserrado', 'Bong', 'Lofa', 'Nimba', 'Margibi', 'Grand Bassa', 'Bomi', 'Grand Cape Mount'],
    GW: ['Bissau', 'Bafatá', 'Biombo', 'Cacheu', 'Gabú', 'Oio', 'Quinara', 'Tombali'],
    GM: ['Banjul', 'Kanifing', 'Brikama', 'Mansakonko', 'Kerewan', 'Kuntaur', 'Janjanbureh', 'Basse'],
    BJ: ['Alibori', 'Atacora', 'Atlantique', 'Borgou', 'Collines', 'Couffo', 'Donga', 'Littoral', 'Mono', 'Ouémé', 'Plateau', 'Zou'],
    TG: ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes', 'Grand Lomé'],
    CV: ['Santiago', 'Santo Antão', 'São Vicente', 'Fogo', 'Sal', 'Boa Vista', 'Maio', 'Brava'],
    CI: ['Abidjan', 'Yamoussoukro', 'Lagunes', 'Savanes', 'Vallée du Bandama', 'Zanzan', 'Montagnes', 'Bas-Sassandra', 'Comoé', 'Lacs', 'Denguélé']
  };

  function num(i, v) { return +v; }
  NC.DATA.countries = RAW.map(function (r) {
    const info = PAYS_INFO[r[0]];
    const o = {
      code: r[0], iso: r[0], name: info[0], flag: info[1], region: info[2], capitale: info[3],
      u5: num(0, r[1]), screened: num(0, r[2]),
      mas: num(0, r[3]), mam: num(0, r[4]), stunting: num(0, r[5]),
      ebf: num(0, r[6]), recovery: num(0, r[7]), abandon: num(0, r[8]), death: num(0, r[9]),
      vitA: num(0, r[10]), deparasitage: num(0, r[11]), zinc: num(0, r[12]),
      anjeScore: num(0, r[13]), anemia: num(0, r[14]),
      water: num(0, r[15]), sanitation: num(0, r[16]), handwash: num(0, r[17]),
      foodInsecurity: num(0, r[18]), poverty: num(0, r[19]),
      admissions: num(0, r[20]), atpeStock: num(0, r[21])
    };
    /* Nombre absolu d'enfants MAS = population < 5 ans × prévalence */
    o.masCases = Math.round(o.u5 * o.mas / 100);            // milliers
    /* Enfants référés puis admis (cascade du tunnel d'accompagnement) */
    o.referred = Math.round(o.screened * (0.68 + 0.12 * (o.anjeScore / 100)));
    o.admitted = Math.round(o.referred * (o.recovery / 100 + 0.13));
    o.completed = Math.round(o.admitted * 0.86);
    o.cured = Math.round(o.completed * (o.recovery / 100));
    o.mamCases = Math.round(o.u5 * o.mam / 100);
    o.stuntingCases = Math.round(o.u5 * o.stunting / 100);
    /* Score WASH composite (moyenne pondérée eau / latrines / lavage des mains) */
    o.washScore = Math.round(o.water * 0.4 + o.sanitation * 0.35 + o.handwash * 0.25);
    return o;
  });

  /* -------------------------------------------------------------------------
   * 4. Districts par pays — valeurs dérivées de l'indicateur national
   *    (facteurs déterministes : un district donne toujours la même valeur).
   * ----------------------------------------------------------------------- */
  NC.DATA.districts = {};
  NC.DATA.countries.forEach(function (c) {
    const list = DISTRICTS[c.code] || [c.capitale];
    NC.DATA.districts[c.code] = list.map(function (name, i) {
      /* Les zones périphériques/sahéliennes portent une charge plus élevée */
      const charge = i === 0 ? 0.72 : 0.92 + (i % 3) * 0.09;
      const fMas = factor(c.code + 'mas', i, 0.34) * charge;
      const fEbf = factor(c.code + 'ebf', i, 0.22) / charge;
      const fRec = factor(c.code + 'rec', i, 0.10);
      const fAnj = factor(c.code + 'anje', i, 0.20) / charge;
      const fWat = factor(c.code + 'eau', i, 0.18) / charge;
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const d = {
        name: name,
        /* Part de la population < 5 ans du pays portée par le district */
        share: +(0.5 + factor(c.code + 'pop', i, 0.55)).toFixed(3),
        mas: +clamp(c.mas * fMas, 0.8, 26).toFixed(1),
        mam: +clamp(c.mam * fMas * 0.94, 0.6, 22).toFixed(1),
        stunting: +clamp(c.stunting * (1 + (fMas - 1) * 0.6), 3, 58).toFixed(1),
        ebf: +clamp(c.ebf * fEbf, 8, 78).toFixed(1),
        recovery: +clamp(c.recovery * fRec, 62, 98).toFixed(1),
        abandon: +clamp(c.abandon / fRec, 1.2, 16).toFixed(1),
        death: +clamp(c.death / fRec, 0.2, 6).toFixed(1),
        vitA: +clamp(c.vitA * factor(c.code + 'vita', i, 0.14), 32, 97).toFixed(0),
        deparasitage: +clamp(c.deparasitage * factor(c.code + 'dpar', i, 0.13), 34, 98).toFixed(0),
        zinc: +clamp(c.zinc * factor(c.code + 'zinc', i, 0.17), 18, 94).toFixed(0),
        anjeScore: +clamp(c.anjeScore * fAnj, 18, 86).toFixed(0),
        water: +clamp(c.water * fWat, 18, 97).toFixed(0),
        sanitation: +clamp(c.sanitation * fWat, 12, 95).toFixed(0),
        handwash: +clamp(c.handwash * fWat, 10, 94).toFixed(0),
        anemia: +clamp(c.anemia * (1 + (fMas - 1) * 0.35), 22, 88).toFixed(0),
        foodInsecurity: +clamp(c.foodInsecurity * fMas, 8, 82).toFixed(0),
        admissions: Math.round(c.admissions * (0.5 + factor(c.code + 'adm', i, 0.55))),
        atpeStock: +clamp(c.atpeStock * factor(c.code + 'atpe', i, 0.28), 8, 99).toFixed(0)
      };
      d.washScore = Math.round(d.water * 0.4 + d.sanitation * 0.35 + d.handwash * 0.25);
      /* Anomalies détectées par l'App (stock, abandon, données manquantes) */
      d.alert = d.atpeStock < 40 ? 'ATPE' : d.abandon > 11 ? 'Abandon' : d.recovery < 72 ? 'Guérison' : null;
      return d;
    });
  });

  /* -------------------------------------------------------------------------
   * 5. Indicateurs ANJE (8 axes) — questionnaire ménages de l'App
   *    `invert` : l'axe est inversé dans le radar (valeur haute = bonne pratique)
   *    `oms`    : cible OMS/UNICEF de référence
   * ----------------------------------------------------------------------- */
  NC.DATA.ANJE = [
    { key: 'early',  label: 'Mise au sein précoce',      short: 'Sein précoce',   oms: 70 },
    { key: 'ebf',    label: 'Allaitement exclusif',      short: 'Allait. exclusif', oms: 70 },
    { key: 'intro',  label: 'Aliments complémentaires',  short: 'Compl. 6-8 mois', oms: 80 },
    { key: 'mdd',    label: 'Diversité minimale',        short: 'Diversité',      oms: 60 },
    { key: 'mmf',    label: 'Fréquence repas min.',      short: 'Fréquence',      oms: 70 },
    { key: 'mad',    label: 'Alimentation acceptable',   short: 'Alim. acceptable', oms: 50 },
    { key: 'nobtl',  label: 'Non-recours au biberon',    short: 'Sans biberon',   oms: 90 },
    { key: 'cont',   label: 'Allaitement jusqu’à 2 ans', short: 'Allait. 2 ans',  oms: 70 }
  ];

  /* Valeurs ANJE nationales : construites autour du score composite du pays */
  NC.DATA.countries.forEach(function (c) {
    const base = c.anjeScore;
    const v = (k, amp, i) => Math.max(4, Math.min(96, Math.round(base * k * factor(c.code + 'anje' + i, 0, amp))));
    c.anje = {
      early: v(0.86, 0.15, 1),
      ebf: c.ebf,                                   // déjà fourni (cohérence stricte)
      intro: v(1.16, 0.12, 3),
      mdd: v(0.82, 0.18, 4),
      mmf: v(1.04, 0.14, 5),
      mad: v(0.72, 0.20, 6),
      nobtl: v(1.34, 0.10, 7),
      cont: v(1.18, 0.14, 8)
    };
    c.anje.ebf = c.ebf;
    /* Score ANJE moyen contrôlé (moyenne des 8 indicateurs) */
    const keys = NC.DATA.ANJE.map((a) => a.key);
    let s = 0; keys.forEach((k) => { s += c.anje[k]; });
    c.anjeAvg = Math.round(s / keys.length);
  });

  /* ANJE par district (mode Pays : lignes de la heatmap = districts) */
  NC.DATA.countries.forEach(function (c) {
    NC.DATA.districts[c.code].forEach(function (d, i) {
      const base = d.anjeScore;
      const r = (k, amp, j) => Math.max(4, Math.min(96, Math.round(base * k * factor(c.code + 'd' + j, i, amp))));
      d.anje = {
        early: r(0.88, 0.18, 1), ebf: d.ebf, intro: r(1.14, 0.15, 3), mdd: r(0.80, 0.20, 4),
        mmf: r(1.03, 0.16, 5), mad: r(0.70, 0.22, 6), nobtl: r(1.33, 0.12, 7), cont: r(1.17, 0.16, 8)
      };
    });
  });

  /* -------------------------------------------------------------------------
   * 6. Séries temporelles mensuelles (année 2024, mois en cours = Septembre)
   *    `adm` : admissions CRENAS · `mas` : enfants MAS dépistés (milliers)
   *    `rec` : taux de guérison · `sync`: lots synchronisés depuis l'App
   *    Les profils saisonniers reproduisent la soudure (juin → septembre).
   * ----------------------------------------------------------------------- */
  const SAISON = [0.86, 0.83, 0.90, 0.97, 1.06, 1.18, 1.24, 1.21, 1.12, 0.99, 0.90, 0.84];
  NC.DATA.monthly = {};
  NC.DATA.countries.forEach(function (c) {
    const baseAdm = c.admissions / 12;
    const baseMas = c.masCases / 12;
    NC.DATA.monthly[c.code] = {
      adm: SAISON.map((s, i) => Math.round(baseAdm * s * factor(c.code + 'adm', i, 0.10))),
      mas: SAISON.map((s, i) => +(baseMas * s * factor(c.code + 'masm', i, 0.10)).toFixed(1)),
      rec: SAISON.map((s, i) => +Math.min(98.5, c.recovery + (1.14 - s) * 5.4 + (factor(c.code + 'recm', i, 0.04) - 1) * 20).toFixed(1)),
      dep: SAISON.map((s, i) => Math.round(c.screened / 12 * (1.06 - s * 0.10) * factor(c.code + 'depm', i, 0.12))),
      sync: SAISON.map((s, i) => Math.round(420 * s * factor(c.code + 'sync', i, 0.35))),
      alert: SAISON.map((s, i) => Math.round(26 * s * factor(c.code + 'alrt', i, 0.45)))
    };
  });
  /* Agrégat régional mensuel (somme / moyenne pondérée) */
  NC.DATA.monthly.REGION = (function () {
    const out = { adm: [], mas: [], rec: [], dep: [], sync: [], alert: [] };
    for (let i = 0; i < 12; i++) {
      let adm = 0, mas = 0, dep = 0, sync = 0, alert = 0, recW = 0, w = 0;
      NC.DATA.countries.forEach(function (c) {
        const m = NC.DATA.monthly[c.code];
        adm += m.adm[i]; mas += m.mas[i]; dep += m.dep[i]; sync += m.sync[i]; alert += m.alert[i];
        recW += m.rec[i] * c.u5; w += c.u5;
      });
      out.adm.push(adm); out.mas.push(+mas.toFixed(1)); out.dep.push(dep);
      out.sync.push(sync); out.alert.push(alert); out.rec.push(+(recW / w).toFixed(1));
    }
    return out;
  })();

  /* Historique de la prévalence MAS 2016 → 2024 (tendance + rupture 2020) */
  const HIST_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  NC.DATA.HIST_YEARS = HIST_YEARS;
  NC.DATA.history = {};
  NC.DATA.countries.forEach(function (c) {
    /* Léger recul tendanciel, aggravé par la crise 2020-2021 puis reprise */
    const trend = [1.16, 1.13, 1.11, 1.09, 1.14, 1.17, 1.11, 1.05, 1.00];
    NC.DATA.history[c.code] = HIST_YEARS.map(function (y, i) {
      return +(c.mas * trend[i] * factor(c.code + 'hist', i, 0.05)).toFixed(2);
    });
  });
  NC.DATA.history.REGION = HIST_YEARS.map(function (y, i) {
    let s = 0, w = 0;
    NC.DATA.countries.forEach(function (c) { s += NC.DATA.history[c.code][i] * c.u5; w += c.u5; });
    return +(s / w).toFixed(2);
  });

  /* -------------------------------------------------------------------------
   * 7. Campagnes de supplémentation 2017 → 2024 (enfants atteints, millions)
   *    Trois interventions suivies par les relais communautaires dans l'App.
   * ----------------------------------------------------------------------- */
  NC.DATA.campagnes = {
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    series: [
      { key: 'vitA', label: 'Vitamine A', color: '#1CABE2', values: [8.4, 9.6, 10.9, 9.2, 11.4, 13.1, 14.8, 16.2] },
      { key: 'dpar', label: 'Déparasitage', color: '#80BD41', values: [6.1, 7.2, 8.4, 6.8, 9.1, 10.6, 12.2, 13.6] },
      { key: 'zinc', label: 'Zinc (diarrhées)', color: '#F26A21', values: [2.4, 3.1, 3.9, 3.2, 4.6, 5.8, 7.1, 8.4] }
    ]
  };

  /* -------------------------------------------------------------------------
   * 8. Modèle des déterminants de la malnutrition (donut à double anneau)
   * ----------------------------------------------------------------------- */
  NC.DATA.determinants = {
    /* Anneau externe : causes immédiates */
    externe: [
      { label: 'Alimentation inadéquate', color: '#1CABE2', value: 43 },
      { label: 'Infections & diarrhées', color: '#F26A21', value: 31 },
      { label: 'Retard de croissance intra-utérin', color: '#DDA63A', value: 15 },
      { label: 'Autres causes directes', color: '#94A3B8', value: 11 }
    ],
    /* Anneau interne : causes sous-jacentes identifiées dans les enquêtes */
    interne: [
      { label: 'Insécurité alimentaire', color: '#0E87B8', value: 29 },
      { label: 'Eau, hygiène & assainissement', color: '#C2551A', value: 24 },
      { label: 'Pratiques de soins & ANJE', color: '#B08222', value: 21 },
      { label: 'Pauvreté & protection sociale', color: '#64748B', value: 16 },
      { label: 'Accès aux services de santé', color: '#4A9E2F', value: 10 }
    ]
  };

  /* -------------------------------------------------------------------------
   * 9. Les 1000 premiers jours — jalons & interventions enregistrées
   * ----------------------------------------------------------------------- */
  NC.DATA.jalons = [
    { day: 0,    label: 'Conception',            court: 'J0',   icone: '🌱', note: 'Supplémentation maternelle en fer & acide folique' },
    { day: 90,   label: 'Mois 3 in utero',       court: 'M3',   icone: '🤰', note: 'Suivi prénatal T1 · déparasitage · fer' },
    { day: 180,  label: 'Mois 6 in utero',       court: 'M6',   icone: '🩺', note: 'Consultation prénatale T2 · nutrition maternelle' },
    { day: 270,  label: 'Mois 9 in utero',       court: 'M9',   icone: '📲', note: 'Enregistrement de la grossesse dans l’App' },
    { day: 280,  label: 'Naissance',             court: 'J280', icone: '👶', note: 'Pesée & mesure à la naissance · mise au sein précoce' },
    { day: 365,  label: '6 mois',                court: 'M6',   icone: '🤱', note: 'Allaitement exclusif · Vitamine A · introduction alimentaire' },
    { day: 540,  label: '12 mois',               court: 'M12',  icone: '💉', note: 'Vaccination · déparasitage · diversité alimentaire' },
    { day: 730,  label: '24 mois',               court: 'M24',  icone: '🍲', note: 'Poursuite de l’allaitement · repas familiaux enrichis' },
    { day: 1000, label: '36 mois',               court: 'M36',  icone: '🎓', note: 'Dernier jalon de la fenêtre d’opportunité' }
  ];
  /* Interventions tracées dans l'App sur la fenêtre 0-1000 jours */
  NC.DATA.interventions = [
    { label: 'Fer & acide folique',   start: 0,   end: 280,  color: '#E5243B', coverage: 61 },
    { label: 'Allaitement exclusif',  start: 280, end: 460,  color: '#80BD41', coverage: 32 },
    { label: 'Alimentation compl.',   start: 460, end: 1000, color: '#1CABE2', coverage: 54 },
    { label: 'Vitamine A',            start: 365, end: 1000, color: '#DDA63A', coverage: 71 },
    { label: 'Déparasitage',          start: 540, end: 1000, color: '#F26A21', coverage: 74 }
  ];
  /* Impact cumulé : réduction potentielle du stunting selon la couverture */
  NC.DATA.impact1000 = [0, -1.2, -2.8, -4.6, -6.9, -9.4, -12.1, -14.8, -17.3, -19.0, -20.0];

  /* -------------------------------------------------------------------------
   * 10. Journal de synchronisation (flux temps réel de l'App terrain)
   * ----------------------------------------------------------------------- */
  NC.DATA.syncLog = [
    { agent: 'Relais communautaire · Maradi (NE)', lots: 184, enfants: 942, type: 'Dépistage MUAC', statut: 'Reçu' },
    { agent: 'Centre Nutri · Mopti (ML)', lots: 122, enfants: 618, type: 'Admissions CRENAS', statut: 'Reçu' },
    { agent: 'Agent communautaire · Kano (NG)', lots: 96, enfants: 486, type: 'Questionnaire ANJE', statut: 'Reçu' },
    { agent: 'CSPS · Centre-Nord (BF)', lots: 74, enfants: 372, type: 'Suivi guérison', statut: 'Partiel' },
    { agent: 'Relais · Hodh Ech Chargui (MR)', lots: 68, enfants: 341, type: 'Campagne Vitamine A', statut: 'Reçu' },
    { agent: 'Poste de santé · Ziguinchor (SN)', lots: 52, enfants: 264, type: 'Dépistage MUAC', statut: 'Reçu' },
    { agent: 'ONG partenaire · Nimba (LR)', lots: 44, enfants: 218, type: 'Enquête WASH ménage', statut: 'En attente' },
    { agent: 'Centre Nutri · Bafatá (GW)', lots: 38, enfants: 191, type: 'Stock ATPE', statut: 'Reçu' },
    { agent: 'Agent communautaire · Kara (TG)', lots: 33, enfants: 167, type: 'Déparasitage', statut: 'Reçu' },
    { agent: 'Relais · Brikama (GM)', lots: 29, enfants: 148, type: 'Admissions CRENAS', statut: 'Reçu' }
  ];

  /* -------------------------------------------------------------------------
   * 11. Correspondances pays → sous-région (mini barres des KPI)
   * ----------------------------------------------------------------------- */
  NC.DATA.REGIONS = ['Sahel', 'Sahel côtier', 'Golfe de Guinée', 'Côtier', 'Insulaire'];

  /* Alertes institutionnelles (panneau bas de page) */
  NC.DATA.alertes = [
    { niveau: 'critique', titre: 'Stock ATPE sous le seuil', texte: 'Niger (62%), Mali (58%), Guinée-Bissau (57%) : risques de rupture de l’aliment thérapeutique dans les centres CRENAS.', couleur: '#E5243B' },
    { niveau: 'critique', titre: 'Rupture de dépistage MUAC', texte: '« C’est le doigt de la faim » — redéployer 240 relais communautaires dans les zones de soudure avant les pics de Juillet.', couleur: '#E5243B' },
    { niveau: 'attention', titre: 'Allaitement exclusif très en deçà de l’objectif', texte: 'Nigeria (22%) et Niger (24%) contre un objectif OMS de 70% : renforcer les causeries ANJE via les rappels de l’App.', couleur: '#F26A21' },
    { niveau: 'info', titre: 'Qualité des données en progression', texte: 'Taux de complétude des fiches App à 92% (+6 pts vs 2023) grâce aux contrôles automatiques de plausibilité.', couleur: '#1CABE2' }
  ];

  /* File d'attente d'export (bouton « Générer Rapport ») */
  NC.DATA.rapports = [
    { titre: 'Rapport Mensuel Nutritionnel', detail: 'KPI, 15 graphiques et scorecard CRENAS de la vue courante', format: 'PDF' },
    { titre: 'Bulletin de Surveillance MUAC', detail: 'Dépistages, carences et cascade d’accompagnement', format: 'PDF' },
    { titre: 'Extraction Données Brutes', detail: 'Séries mensuelles et scorecard complète de la vue', format: 'CSV' },
    { titre: 'Note de Situation Soudure', detail: 'Analyse saisonnière des admissions Juin → Septembre', format: 'PDF' }
  ];
})(window);
