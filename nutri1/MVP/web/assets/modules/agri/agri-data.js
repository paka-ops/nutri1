/* ============================================================================
   NUTRI.N°1 — DONNÉES AGRO-ALIMENTAIRES (module Agriculture, v58)
   ---------------------------------------------------------------------------
   Générateur DÉTERMINISTE et REPRODUCTIBLE de données agricoles modélisées
   pour les 15 États membres CEDEAO/AES (+ Mauritanie, Tchad) :

     - catalogue de 30 produits (7 groupes) : rendements, pertes, prix,
       coefficients nutritionnels (kcal, protéines, fer, vitamine A, zinc) ;
     - profil pays : population, terres cultivées, irrigation, chaîne du froid,
       stockage, dépendance aux importations, zones agro-climatiques ;
     - séries 2010 → année courante : production, surfaces, rendements, pertes,
       climat (pluie/température/anomalie), prix, importations ;
     - répartition régionale, besoins nationaux, bilan alimentaire, nutriments.

   ⚠️ IMPORTANCE — TRANSPARENCE DES DONNÉES
   Toutes les valeurs sont des ESTIMATIONS MODÉLISÉES (démonstration
   d'infrastructure), calibrées sur des ordres de grandeur publics
   (FAOSTAT / SPAM / enquêtes nationales). Elles ne sont PAS des statistiques
   officielles et doivent être remplacées par les données du Ministère avant
   tout usage décisionnel. Chaque indicateur est étiqueté par `source` :
     'reported'  → ordre de grandeur public (population, terres)
     'modelled'  → estimation du modèle NUTRI.N°1 (à calibrer)
   ========================================================================== */
(function (w) {
  'use strict';
  if (w.NUTRI_AGRI_DATA) return;

  const R = (w.NX && w.NX.rng) || { fn: () => Math.random, gauss: () => 0 };

  /* ------------------------------------------------------------------ groupes */
  const GROUPS = {
    cereals: { fr: 'Céréales', en: 'Cereals', color: '#c9ee59', icon: '🌾', kcalShare: .42 },
    tubers: { fr: 'Racines & tubercules', en: 'Roots & tubers', color: '#f5b642', icon: '🥔', kcalShare: .22 },
    legumes: { fr: 'Légumineuses', en: 'Legumes & pulses', color: '#18d67f', icon: '🫘', kcalShare: .08 },
    fruits_veg: { fr: 'Fruits & légumes', en: 'Fruits & vegetables', color: '#3fc8f0', icon: '🥬', kcalShare: .07 },
    oilseeds: { fr: 'Oléagineux', en: 'Oilseeds', color: '#a78bfa', icon: '🌰', kcalShare: .11 },
    animal: { fr: 'Produits animaux & pêche', en: 'Animal-source & fisheries', color: '#ff6b5e', icon: '🐟', kcalShare: .07 },
    cash: { fr: 'Cultures de rente', en: 'Cash crops', color: '#f472b6', icon: '💠', kcalShare: 0 }
  };

  /* ------------------------------------------------------------------ produits
     nut  = pour 100 g de partie comestible (modèle composition, à confronter
            aux analyses de laboratoire NUTRI.N°1)
     loss = [récolte, séchage/stockage, transport, transformation, marché] en %
     need = besoin de référence kg/habitant/an (panier alimentaire modèle)
     price= prix producteur USD/kg de référence
     water= besoin hydrique indicatif mm ; cyc = cycle cultural en jours
     st   = sensibilité climat : [%rendement/°C, %rendement/10% déficit pluvio]
     zone = aptitude relative par zone agro-climatique (0-1.3)
  */
  const CROPS = [
    { id: 'maize', fr: 'Maïs', en: 'Maize', group: 'cereals', per: 1, yld: 2.2, yldTop: 4.6, nut: { kcal: 365, prot: 9.4, fe: 2.7, va: 11, zn: 2.2, fib: 7.3 }, loss: [3, 6.5, 1.5, 2.5, 2], need: 62, price: .28, water: 550, cyc: 110, st: [7.5, 12], zone: { sahel: .9, sudan: 1.1, guinea: 1.05, coastal: .8, highland: 1.0 }, share: .22 },
    { id: 'rice', fr: 'Riz', en: 'Rice', group: 'cereals', per: 1, yld: 2.4, yldTop: 4.2, nut: { kcal: 360, prot: 7, fe: .8, va: 0, zn: 1.1, fib: 1.3 }, loss: [3.5, 5, 1.5, 4.5, 2], need: 46, price: .55, water: 1200, cyc: 130, st: [6.5, 9], zone: { sahel: .8, sudan: 1, guinea: 1.15, coastal: 1.1, highland: .8 }, share: .11 },
    { id: 'sorghum', fr: 'Sorgho', en: 'Sorghum', group: 'cereals', per: 1, yld: 1.1, yldTop: 2.1, nut: { kcal: 339, prot: 11.3, fe: 3.4, va: 1, zn: 1.7, fib: 6.3 }, loss: [3, 6, 1.5, 2.5, 2], need: 20, price: .32, water: 400, cyc: 105, st: [5.5, 9], zone: { sahel: 1.2, sudan: 1.15, guinea: .85, coastal: .6, highland: .9 }, share: .13 },
    { id: 'millet', fr: 'Mil (petit mil)', en: 'Pearl millet', group: 'cereals', per: 1, yld: .85, yldTop: 1.7, nut: { kcal: 378, prot: 11, fe: 3, va: 1, zn: 2.5, fib: 8.5 }, loss: [3, 7, 1.5, 2.5, 2], need: 16, price: .35, water: 330, cyc: 90, st: [5, 8.5], zone: { sahel: 1.3, sudan: 1.1, guinea: .7, coastal: .5, highland: .8 }, share: .14 },
    { id: 'fonio', fr: 'Fonio', en: 'Fonio', group: 'cereals', per: 1, yld: .7, yldTop: 1.2, nut: { kcal: 350, prot: 8, fe: 2.5, va: 1, zn: 1.6, fib: 3 }, loss: [5, 8, 2, 6, 3], need: 1.5, price: .95, water: 350, cyc: 80, st: [4.5, 10], zone: { sahel: 1.15, sudan: 1.1, guinea: .95, coastal: .6, highland: .9 }, share: .01 },
    { id: 'wheat', fr: 'Blé', en: 'Wheat', group: 'cereals', per: 1, yld: 1.6, yldTop: 3.4, nut: { kcal: 340, prot: 11.5, fe: 3.6, va: 0, zn: 2.6, fib: 2.7 }, loss: [2.5, 5, 1, 3.5, 1.5], need: 14, price: .4, water: 480, cyc: 120, st: [8, 11], zone: { sahel: .7, sudan: .9, guinea: .8, coastal: .5, highland: 1.1 }, share: .02 },
    { id: 'cassava', fr: 'Manioc', en: 'Cassava', group: 'tubers', per: 1, yld: 11.5, yldTop: 21, nut: { kcal: 160, prot: 1.4, fe: .3, va: 1, zn: .3, fib: 1.8 }, loss: [4, 8, 6, 7, 9], need: 165, price: .17, water: 620, cyc: 330, st: [4, 7], zone: { sahel: .5, sudan: .85, guinea: 1.25, coastal: 1.2, highland: .8 }, share: .20 },
    { id: 'yam', fr: 'Igname', en: 'Yam', group: 'tubers', per: 1, yld: 12, yldTop: 20, nut: { kcal: 118, prot: 1.5, fe: .6, va: 3, zn: .3, fib: 4.1 }, loss: [5, 14, 5, 5, 8], need: 42, price: .45, water: 900, cyc: 270, st: [4.5, 9], zone: { sahel: .55, sudan: 1.1, guinea: 1.25, coastal: 1.0, highland: .9 }, share: .09 },
    { id: 'sweetpotato', fr: 'Patate douce', en: 'Sweet potato', group: 'tubers', per: 1, yld: 6, yldTop: 12, nut: { kcal: 86, prot: 1.6, fe: .6, va: 709, zn: .3, fib: 3 }, loss: [5, 12, 6, 5, 9], need: 22, price: .3, water: 500, cyc: 120, st: [5, 12], zone: { sahel: 1.0, sudan: 1.1, guinea: 1.05, coastal: .9, highland: .9 }, share: .04 },
    { id: 'potato', fr: 'Pomme de terre', en: 'Potato', group: 'tubers', per: 1, yld: 9, yldTop: 18, nut: { kcal: 77, prot: 2, fe: .8, va: 0, zn: .3, fib: 2.2 }, loss: [5, 15, 5, 6, 8], need: 9, price: .55, water: 550, cyc: 100, st: [6, 13], zone: { sahel: .5, sudan: .8, guinea: .9, coastal: .7, highland: 1.2 }, share: .01 },
    { id: 'cowpea', fr: 'Niébé', en: 'Cowpea', group: 'legumes', per: 1, yld: .7, yldTop: 1.5, nut: { kcal: 336, prot: 23.5, fe: 8.3, va: 3, zn: 3.4, fib: 10.6 }, loss: [4, 9, 2, 4, 3], need: 18, price: .85, water: 350, cyc: 80, st: [5, 9], zone: { sahel: 1.2, sudan: 1.15, guinea: .9, coastal: .6, highland: .8 }, share: .075 },
    { id: 'groundnut', fr: 'Arachide', en: 'Groundnut', group: 'legumes', per: 1, yld: 1.0, yldTop: 1.9, nut: { kcal: 567, prot: 25.8, fe: 4.6, va: 0, zn: 3.3, fib: 8.5 }, loss: [4, 8, 2, 5, 3], need: 12, price: .72, water: 450, cyc: 110, st: [5, 10], zone: { sahel: 1.15, sudan: 1.1, guinea: 1.0, coastal: .7, highland: .85 }, share: .07 },
    { id: 'soybean', fr: 'Soja', en: 'Soybean', group: 'legumes', per: 1, yld: 1.2, yldTop: 2.4, nut: { kcal: 446, prot: 36.5, fe: 15.7, va: 1, zn: 4.9, fib: 9.3 }, loss: [3, 7, 2, 4, 3], need: 4, price: .58, water: 500, cyc: 110, st: [5.5, 9], zone: { sahel: .6, sudan: .95, guinea: 1.2, coastal: 1.1, highland: .8 }, share: .015 },
    { id: 'bambara', fr: 'Voandzou', en: 'Bambara groundnut', group: 'legumes', per: 1, yld: .8, yldTop: 1.4, nut: { kcal: 350, prot: 19, fe: 4.3, va: 2, zn: 2.7, fib: 6.5 }, loss: [5, 9, 2, 5, 4], need: 2, price: .7, water: 330, cyc: 120, st: [4.5, 9], zone: { sahel: 1.1, sudan: 1.1, guinea: 1.0, coastal: .6, highland: .8 }, share: .008 },
    { id: 'tomato', fr: 'Tomate', en: 'Tomato', group: 'fruits_veg', per: 1, yld: 12, yldTop: 26, nut: { kcal: 18, prot: .9, fe: .3, va: 42, zn: .2, fib: 1.2 }, loss: [6, 5, 9, 4, 12], need: 18, price: .68, water: 600, cyc: 100, st: [7, 16], zone: { sahel: .85, sudan: 1.1, guinea: 1.05, coastal: .85, highland: 1.15 }, share: .012 },
    { id: 'onion', fr: 'Oignon', en: 'Onion', group: 'fruits_veg', per: 1, yld: 13, yldTop: 25, nut: { kcal: 40, prot: 1.1, fe: .2, va: 0, zn: .2, fib: 1.7 }, loss: [5, 16, 5, 3, 9], need: 13, price: .5, water: 520, cyc: 110, st: [6, 12], zone: { sahel: 1.15, sudan: 1.05, guinea: .8, coastal: .6, highland: .95 }, share: .009 },
    { id: 'okra', fr: 'Gombo', en: 'Okra', group: 'fruits_veg', per: 1, yld: 5.5, yldTop: 11, nut: { kcal: 33, prot: 1.9, fe: .6, va: 36, zn: .6, fib: 3.2 }, loss: [6, 6, 8, 4, 11], need: 6, price: .8, water: 480, cyc: 90, st: [6.5, 13], zone: { sahel: 1.05, sudan: 1.1, guinea: 1.05, coastal: .9, highland: .85 }, share: .006 },
    { id: 'plantain', fr: 'Bananier plantain', en: 'Plantain', group: 'fruits_veg', per: 1, yld: 9, yldTop: 17, nut: { kcal: 122, prot: 1.3, fe: .6, va: 56, zn: .2, fib: 2.3 }, loss: [7, 6, 10, 3, 13], need: 34, price: .42, water: 1300, cyc: 330, st: [5, 10], zone: { sahel: .4, sudan: .85, guinea: 1.25, coastal: 1.2, highland: .8 }, share: .01 },
    { id: 'mango', fr: 'Mangue', en: 'Mango', group: 'fruits_veg', per: 1, yld: 8, yldTop: 16, nut: { kcal: 60, prot: .8, fe: .2, va: 54, zn: .1, fib: 1.6 }, loss: [8, 5, 11, 3, 14], need: 14, price: .52, water: 700, cyc: 365, st: [6, 12], zone: { sahel: .85, sudan: 1.1, guinea: 1.15, coastal: 1.0, highland: .9 }, share: .012 },
    { id: 'leafy', fr: 'Légumes-feuilles', en: 'Leafy vegetables', group: 'fruits_veg', per: 1, yld: 7, yldTop: 15, nut: { kcal: 42, prot: 4.6, fe: 3.5, va: 400, zn: .9, fib: 3.5 }, loss: [8, 4, 12, 3, 15], need: 16, price: .62, water: 420, cyc: 60, st: [6, 14], zone: { sahel: 1.0, sudan: 1.05, guinea: 1.1, coastal: 1.05, highland: 1.0 }, share: .008 },
    { id: 'sesame', fr: 'Sésame', en: 'Sesame', group: 'oilseeds', per: 1, yld: .6, yldTop: 1.2, nut: { kcal: 573, prot: 17.7, fe: 14.6, va: 1, zn: 7.8, fib: 11.8 }, loss: [4, 8, 2, 5, 4], need: 3, price: 1.25, water: 380, cyc: 95, st: [5.5, 11], zone: { sahel: 1.2, sudan: 1.1, guinea: .95, coastal: .6, highland: .8 }, share: .02 },
    { id: 'palm', fr: 'Palmier à huile', en: 'Oil palm', group: 'oilseeds', per: 1, yld: 2.6, yldTop: 6, nut: { kcal: 884, prot: 0, fe: .01, va: 762, zn: 0, fib: 0 }, loss: [4, 6, 3, 8, 5], need: 13, price: 1.05, water: 1600, cyc: 365, st: [4, 9], zone: { sahel: .3, sudan: .8, guinea: 1.3, coastal: 1.25, highland: .6 }, share: .012 },
    { id: 'shea', fr: 'Karité', en: 'Shea', group: 'oilseeds', per: 1, yld: .5, yldTop: 1.1, nut: { kcal: 884, prot: 4, fe: 3, va: 0, zn: 1, fib: 0 }, loss: [6, 7, 3, 9, 6], need: 1, price: .62, water: 600, cyc: 365, st: [4, 9], zone: { sahel: .8, sudan: 1.15, guinea: 1.1, coastal: .6, highland: .8 }, share: .01 },
    { id: 'sunflower', fr: 'Tournesol', en: 'Sunflower', group: 'oilseeds', per: 1, yld: 1.1, yldTop: 2.2, nut: { kcal: 584, prot: 20.8, fe: 5.3, va: 3, zn: 5, fib: 8.6 }, loss: [4, 7, 2, 6, 4], need: 2, price: .6, water: 500, cyc: 105, st: [6, 11], zone: { sahel: 1.0, sudan: 1.05, guinea: .9, coastal: .6, highland: .9 }, share: .004 },
    { id: 'milk', fr: 'Lait local', en: 'Local milk', group: 'animal', per: 1, yld: 3.5, yldTop: 8, nut: { kcal: 61, prot: 3.2, fe: .05, va: 37, zn: .4, fib: 0 }, loss: [2, 4, 8, 6, 12], need: 30, price: .58, water: 0, cyc: 0, st: [8, 14], zone: { sahel: 1.25, sudan: 1.2, guinea: .9, coastal: .6, highland: 1.0 }, share: .01, unitLivestock: true },
    { id: 'eggs', fr: 'Œufs', en: 'Eggs', group: 'animal', per: 1, yld: 6, yldTop: 14, nut: { kcal: 155, prot: 13, fe: 1.8, va: 160, zn: 1.1, fib: 0 }, loss: [2, 3, 6, 2, 5], need: 7, price: 2.6, water: 0, cyc: 0, st: [7, 12], zone: { sahel: 1.0, sudan: 1.05, guinea: 1.05, coastal: 1.0, highland: 1.0 }, share: .004, unitLivestock: true },
    { id: 'poultry', fr: 'Volaille', en: 'Poultry meat', group: 'animal', per: 1, yld: 5, yldTop: 12, nut: { kcal: 190, prot: 22, fe: 1.4, va: 30, zn: 1.8, fib: 0 }, loss: [3, 3, 6, 2, 6], need: 13, price: 3.1, water: 0, cyc: 0, st: [7, 13], zone: { sahel: 1.0, sudan: 1.05, guinea: 1.05, coastal: 1.0, highland: 1.0 }, share: .006, unitLivestock: true },
    { id: 'beef', fr: 'Viande bovine / petits ruminants', en: 'Beef & small ruminants', group: 'animal', per: 1, yld: 3.2, yldTop: 7, nut: { kcal: 250, prot: 26, fe: 3.5, va: 0, zn: 4.6, fib: 0 }, loss: [3, 4, 7, 2, 7], need: 8, price: 4.4, water: 0, cyc: 0, st: [9, 16], zone: { sahel: 1.3, sudan: 1.2, guinea: .9, coastal: .6, highland: 1.0 }, share: .012, unitLivestock: true },
    { id: 'fish', fr: 'Pêche & aquaculture', en: 'Fisheries & aquaculture', group: 'animal', per: 1, yld: 1.6, yldTop: 4.5, nut: { kcal: 96, prot: 20.1, fe: 1, va: 10, zn: .5, fib: 0 }, loss: [4, 6, 9, 7, 10], need: 19, price: 2.8, water: 0, cyc: 0, st: [5, 9], zone: { sahel: .7, sudan: .9, guinea: 1.0, coastal: 1.25, highland: .7 }, share: .006, unitFishery: true },
    { id: 'cocoa', fr: 'Cacao', en: 'Cocoa', group: 'cash', per: .7, yld: .55, yldTop: 1.1, nut: { kcal: 600, prot: 13, fe: 8, va: 3, zn: 5, fib: 26 }, loss: [4, 6, 3, 4, 4], need: 0, price: 2.95, water: 1500, cyc: 365, st: [6, 12], zone: { sahel: 0, sudan: .5, guinea: 1.3, coastal: 1.2, highland: .6 }, share: .028, export: .92 },
    { id: 'coffee', fr: 'Café', en: 'Coffee', group: 'cash', per: .7, yld: .5, yldTop: 1.0, nut: { kcal: 350, prot: 12, fe: 4, va: 0, zn: 3, fib: 26 }, loss: [4, 6, 3, 5, 4], need: 0, price: 2.2, water: 1300, cyc: 365, st: [7, 13], zone: { sahel: 0, sudan: .5, guinea: 1.2, coastal: 1.1, highland: 1.25 }, share: .004, export: .9 },
    { id: 'cashew', fr: 'Anacarde', en: 'Cashew', group: 'cash', per: .6, yld: .7, yldTop: 1.4, nut: { kcal: 574, prot: 18, fe: 6.7, va: 0, zn: 5.8, fib: 3.3 }, loss: [5, 7, 3, 8, 6], need: 0, price: 1.35, water: 900, cyc: 365, st: [6, 11], zone: { sahel: .4, sudan: 1.0, guinea: 1.25, coastal: 1.1, highland: .8 }, share: .012, export: .88 },
    { id: 'cotton', fr: 'Coton', en: 'Cotton', group: 'cash', per: 0, yld: .9, yldTop: 1.8, nut: { kcal: 506, prot: 32.6, fe: 5.5, va: 6, zn: 4.9, fib: 6.5 }, loss: [4, 7, 3, 6, 5], need: 0, price: .68, water: 700, cyc: 180, st: [6, 12], zone: { sahel: 1.0, sudan: 1.15, guinea: .95, coastal: .5, highland: .8 }, share: .035, export: .95 }
  ];

  /* ------------------------------------------------------------------- zones */
  const ZONES = {
    sahel: { fr: 'Sahel', rain: [300, 650], temp: 29.5, tempAnom: 1.35 },
    sudan: { fr: 'Zone soudanienne', rain: [650, 1050], temp: 27.5, tempAnom: 1.15 },
    guinea: { fr: 'Zone guinéenne', rain: [1050, 1700], temp: 26, tempAnom: 0.95 },
    coastal: { fr: 'Littoral & lagunaire', rain: [900, 2000], temp: 27, tempAnom: 1.0 },
    highland: { fr: 'Hauts plateaux', rain: [800, 1400], temp: 23, tempAnom: 1.05 }
  };

  /* ------------------------------------------------------------------ pays */
  function P(o) { return o; }
  const COUNTRIES = {
    BJ: P({ name: 'Bénin', pop: 14.5, arable: 2.9, zones: { sudan: .55, guinea: .35, coastal: .10 }, regions: ['Alibori', 'Atacora', 'Borgou', 'Zou-Collines', 'Atlantique-Littoral', 'Mono-Couffo'], irrigation: .015, cold: .04, storage: .18, road: .45, cold_need: .62, fertilizer: 95, lossBase: 21, import: .22, undernourish: 9.4, agriGDP: .26, smallholder: .86 }),
    BF: P({ name: 'Burkina Faso', pop: 23.5, arable: 6.4, zones: { sahel: .40, sudan: .45, guinea: .15 }, regions: ['Sahel', 'Nord', 'Centre', 'Boucle du Mouhoun', 'Hauts-Bassins', 'Est'], irrigation: .02, cold: .02, storage: .15, road: .4, cold_need: .55, fertilizer: 78, lossBase: 23, import: .18, undernourish: 12.6, agriGDP: .21, smallholder: .9 }),
    CV: P({ name: 'Cabo Verde', pop: .62, arable: .05, zones: { sahel: .6, coastal: .4 }, regions: ['Santo Antão', 'São Vicente', 'Santiago', 'Fogo', 'Boa Vista'], irrigation: .15, cold: .12, storage: .3, road: .7, cold_need: .8, fertilizer: 130, lossBase: 14, import: .72, undernourish: 6.2, agriGDP: .08, smallholder: .7 }),
    CI: P({ name: "Côte d'Ivoire", pop: 32, arable: 7.3, zones: { guinea: .55, coastal: .35, sudan: .10 }, regions: ['Nord', 'Centre', 'Est', 'Sud-Ouest', 'Sud', 'Ouest-Montagneux'], irrigation: .03, cold: .05, storage: .22, road: .55, cold_need: .68, fertilizer: 110, lossBase: 21, import: .2, undernourish: 8.1, agriGDP: .19, smallholder: .8 }),
    GM: P({ name: 'Gambie', pop: 2.8, arable: .45, zones: { sudan: .35, sahel: .45, coastal: .20 }, regions: ['Banjul-Kanifing', 'North Bank', 'Lower River', 'Central River', 'Upper River', 'West Coast'], irrigation: .03, cold: .02, storage: .16, road: .4, cold_need: .5, fertilizer: 70, lossBase: 26, import: .48, undernourish: 14.2, agriGDP: .24, smallholder: .92 }),
    GH: P({ name: 'Ghana', pop: 34.5, arable: 5.3, zones: { guinea: .45, coastal: .3, sudan: .15, highland: .10 }, regions: ['Ashanti', 'Bono-Ahafo', 'Northern', 'Upper East-West', 'Volta-Oti', 'Greater Accra'], irrigation: .012, cold: .05, storage: .24, road: .6, cold_need: .65, fertilizer: 105, lossBase: 19, import: .26, undernourish: 6.4, agriGDP: .21, smallholder: .78 }),
    GN: P({ name: 'Guinée', pop: 15, arable: 2.6, zones: { guinea: .55, highland: .3, coastal: .15 }, regions: ['Boké', 'Kindia', 'Mamou', 'Labé', 'Kankan', 'Nzérékoré'], irrigation: .04, cold: .03, storage: .14, road: .3, cold_need: .5, fertilizer: 62, lossBase: 24, import: .3, undernourish: 15.9, agriGDP: .25, smallholder: .9 }),
    GW: P({ name: 'Guinée-Bissau', pop: 2.2, arable: .55, zones: { coastal: .6, guinea: .4 }, regions: ['Bissau', 'Cacheu', 'Oio', 'Bafatá', 'Gabú', 'Bolama-Bijagós'], irrigation: .02, cold: .01, storage: .12, road: .28, cold_need: .45, fertilizer: 48, lossBase: 28, import: .42, undernourish: 17.5, agriGDP: .3, smallholder: .93 }),
    LR: P({ name: 'Liberia', pop: 5.6, arable: .6, zones: { coastal: .65, guinea: .35 }, regions: ['Montserrado', 'Bong', 'Nimba', 'Lofa', 'Grand Bassa', 'Sinoe'], irrigation: .005, cold: .02, storage: .1, road: .25, cold_need: .42, fertilizer: 35, lossBase: 28, import: .55, undernourish: 25.6, agriGDP: .28, smallholder: .94 }),
    ML: P({ name: 'Mali', pop: 24.5, arable: 6.5, zones: { sahel: .45, sudan: .40, guinea: .15 }, regions: ['Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'Tombouctou-Gao'], irrigation: .08, cold: .02, storage: .14, road: .35, cold_need: .5, fertilizer: 72, lossBase: 24, import: .16, undernourish: 11.8, agriGDP: .36, smallholder: .88 }),
    NE: P({ name: 'Niger', pop: 27, arable: 17, zones: { sahel: .80, sudan: .20 }, regions: ['Tillabéri', 'Dosso', 'Tahoua', 'Maradi', 'Zinder', 'Diffa-Agadez'], irrigation: .03, cold: .01, storage: .13, road: .3, cold_need: .45, fertilizer: 40, lossBase: 25, import: .19, undernourish: 13.4, agriGDP: .39, smallholder: .95 }),
    NG: P({ name: 'Nigeria', pop: 232, arable: 34, zones: { sudan: .45, guinea: .40, coastal: .15 }, regions: ['Nord-Ouest', 'Nord-Est', 'Nord-Centre', 'Sud-Ouest', 'Sud-Est', 'Sud-Sud'], irrigation: .015, cold: .08, storage: .26, road: .5, cold_need: .7, fertilizer: 90, lossBase: 22, import: .24, undernourish: 14.7, agriGDP: .23, smallholder: .8 }),
    SN: P({ name: 'Sénégal', pop: 18.5, arable: 3.4, zones: { sahel: .55, sudan: .30, coastal: .15 }, regions: ['Saint-Louis', 'Louga-Matam', 'Thiès-Diourbel', 'Dakar', 'Kaolack-Fatick', 'Casamance'], irrigation: .06, cold: .06, storage: .22, road: .55, cold_need: .6, fertilizer: 85, lossBase: 20, import: .38, undernourish: 9.1, agriGDP: .16, smallholder: .85 }),
    SL: P({ name: 'Sierra Leone', pop: 8.8, arable: 1.4, zones: { coastal: .5, guinea: .4, highland: .10 }, regions: ['Western', 'Northern', 'North-West', 'Southern', 'Eastern', 'Kono'], irrigation: .01, cold: .02, storage: .11, road: .3, cold_need: .45, fertilizer: 45, lossBase: 26, import: .44, undernourish: 24.4, agriGDP: .25, smallholder: .92 }),
    TG: P({ name: 'Togo', pop: 9.7, arable: 2.7, zones: { sudan: .40, guinea: .35, coastal: .25 }, regions: ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes'], irrigation: .01, cold: .04, storage: .2, road: .5, cold_need: .58, fertilizer: 88, lossBase: 22, import: .25, undernourish: 10.6, agriGDP: .23, smallholder: .88 }),
    MR: P({ name: 'Mauritanie', pop: 5, arable: .42, zones: { sahel: .75, sudan: .25 }, regions: ['Trarza-Brakna', 'Gorgol-Guidimakha', 'Assaba-Hodh', 'Adrar-Inchiri', 'Nouakchott'], irrigation: .12, cold: .03, storage: .2, road: .35, cold_need: .55, fertilizer: 60, lossBase: 25, import: .52, undernourish: 10.1, agriGDP: .19, smallholder: .72 }),
    TD: P({ name: 'Tchad', pop: 20.5, arable: 4.8, zones: { sahel: .60, sudan: .35, guinea: .05 }, regions: ['Logone-Chari', 'Mayo-Kebbi', 'Tandjilé', 'Guéra', 'Salamat', 'Ouest-Sahel'], irrigation: .02, cold: .01, storage: .1, road: .2, cold_need: .4, fertilizer: 30, lossBase: 27, import: .3, undernourish: 21.7, agriGDP: .42, smallholder: .95 })
  };

  const YEARS = (function () { const a = []; for (let y = 2010; y <= 2026; y++) a.push(y); return a; })();

  /* -------------------------------------------------- indices climatiques */
  /** Indice ENSO / stress pluviométrique annuel par pays (déterministe). */
  function climateIndex(cc, year) {
    const base = R.fn('climate|' + cc + '|' + year);
    const enso = Math.sin((year - 2010) * 1.25) * .6 + Math.sin((year - 2012) * .47) * .4;
    const shocks = { 2011: -.9, 2015: -1.25, 2017: -.5, 2019: -.35, 2021: -.45, 2022: -.75, 2023: -.4, 2024: .6, 2025: -.3 };
    const shock = shocks[year] || 0;
    const val = (enso + (base() - .5) * 1.1 + shock);
    return Math.max(-2.2, Math.min(2.2, val));
  }
  /** Anomalie thermique (°C) par rapport à la période 1981-2010. */
  function tempAnomaly(cc, year) {
    const t = 0.62 + (year - 2010) * 0.031 + (R.between('t|' + cc + '|' + year, -.28, .34));
    return Math.max(.1, t);
  }

  /* ------------------------------------------------------- rendement modèle */
  function zoneFactor(crop, c) {
    let f = 0, tot = 0;
    for (const z in c.zones) { const w = c.zones[z]; f += w * (crop.zone[z] == null ? .6 : crop.zone[z]); tot += w; }
    return tot ? f / tot : .8;
  }
  function yieldFor(crop, c, year) {
    const zf = zoneFactor(crop, c);
    const zTier = 0.72 + Math.min(1.1, c.fertilizer / 110) * .32;      // intrants / mécanisation (modèle)
    const tech = 1 + (year - 2010) * 0.0088 + (c.irrigation * 1.6);      // progrès + irrigation
    const ci = climateIndex(c.country, year);
    const ta = tempAnomaly(c.country, year);
    const clim = 1 + (-ci * crop.st[1] / 100) * .5 - (ta - .6) * crop.st[0] / 100 * 4.2;
    const rnd = 1 + (R.between('y|' + c.country + '|' + crop.id + '|' + year, -.075, .075));
    const y = crop.yld * zf * zTier * tech * clim * rnd;
    return Math.max(crop.yld * .18, y);
  }
  /* Somme des parts de culture : sert à normaliser la répartition de la surface
     cultivée pour qu'elle ne dépasse jamais la surface arable du pays. */
  const SHARE_SUM = CROPS.reduce((s, x) => s + (x.share || 0), 0);
  function areaFor(crop, c) {
    // c.arable est exprimé en millions d'hectares ; seule une partie est
    // effectivement cultivée chaque année (jachère, parcours, pertes de sol).
    const cultivated = c.arable * 1e6 * (crop.group === 'cash' ? .68 : .62);
    const rnd = R.between('a|' + c.country + '|' + crop.id, .82, 1.18);
    return Math.max(2000, cultivated * ((crop.share || 0) / SHARE_SUM) * rnd);
  }
  function lossFor(crop, c, year) {
    const reduction = .16 * Math.min(1.15, c.cold / .1) + .1 * (c.storage / .25) - 1; // effet chaîne du froid + stockage
    const scale = Math.max(.42, Math.min(1.9, (c.lossBase / 22) * (1 + (year - 2010) * -.0035) * (1 - Math.max(-.12, reduction * .06))));
    const stages = crop.loss.map(v => v * scale * (1 + R.between('l|' + c.country + '|' + crop.id + '|' + year, -.07, .07)));
    const total = stages.reduce((a, b) => a + b, 0);
    return {
      stages: {
        harvest: stages[0], storage: stages[1], transport: stages[2], processing: stages[3], market: stages[4]
      },
      total: Math.min(58, total),
      coldRelated: Math.min(95, (stages[2] + stages[4] + crop.loss[1] * scale * (1 - Math.min(1, c.cold / .3))) * 1.9)
    };
  }

  /* ------------------------------------------------------------- build() */
  function build(cc, year, opts) {
    const o = opts || {};
    const profile = Object.assign({ country: cc, name: cc }, COUNTRIES[cc] || COUNTRIES.TG);
    const c = Object.assign({}, COUNTRIES[cc] || COUNTRIES.TG, { country: cc });
    const y = year || 2026;
    const priceIndex = (yy) => Math.pow(1.035, yy - 2015) * (1 + Math.sin((yy - 2010) * .9) * .06);

    /* --- production par produit ---------------------------------------- */
    const crops = CROPS.map(crop => {
      const area = areaFor(crop, c);
      const yld = yieldFor(crop, c, y);
      const production = area * yld;                     // tonnes
      const loss = lossFor(crop, c, y);
      const lostT = production * (loss.total / 100);
      const avail = production - lostT;
      const need = crop.need * profile.pop * 1e6 * .001 * 1000; // kg->t : need(kg/hab/an)*pop
      const needT = crop.need * profile.pop * 1e6 / 1000;
      const imported = needT > 0 ? Math.max(0, needT - avail) * (profile.import * (crop.group === 'cash' ? 0 : 1)) * R.between('i|' + cc + '|' + crop.id + '|' + y, .85, 1.15) : 0;
      const exported = crop.export ? production * crop.export * R.between('e|' + cc + '|' + crop.id, .85, 1.15) : 0;
      const price = crop.price * priceIndex(y) * (1 + R.between('p|' + cc + '|' + crop.id + '|' + y, -.09, .09));
      const totalAvail = avail - exported + imported;
      const gapT = Math.max(0, needT - totalAvail);
      const wasteHousehold = totalAvail * (0.055 + (1 - Math.min(1, c.cold / .3)) * .035);
      const consumed = Math.max(0, totalAvail - wasteHousehold);
      const kcal = consumed * 1e6 * (crop.nut.kcal / 100) / 1000;       // kcal totales (milliers)
      return {
        id: crop.id, fr: crop.fr, en: crop.en, group: crop.group, icon: GROUPS[crop.group].icon,
        unit: 't', areaHa: area, yieldTha: yld, productionT: production,
        loss, lossT: lostT, lossPct: loss.total,
        availT: avail, needT, importedT: imported, exportedT: exported, totalAvailT: totalAvail,
        gapT, sufficiency: needT > 0 ? (totalAvail / needT) * 100 : 100,
        priceUsdKg: price, valueUsd: production * price * 1000 * 1000 / 1000, // USD (t * USD/kg * 1000/1000)
        lossValueUsd: lostT * price * 1000,
        consumedT: consumed, nut: crop.nut, kcalTotal: kcal,
        waterMm: crop.water, cycleDays: crop.cyc,
        climateSensitivity: crop.st.slice(),
        nutritionDensity: (crop.nut.prot * .28 + crop.nut.fe * 2.6 + crop.nut.va / 22 + crop.nut.zn * 1.8) / (crop.nut.kcal / 100)
      };
    }).map(x => { x.valueUsd = x.productionT * x.priceUsdKg * 1000; x.lossValueUsd = x.lossT * x.priceUsdKg * 1000; return x; })
      .sort((a, b) => b.productionT - a.productionT);

    /* --- totaux --------------------------------------------------------- */
    const S = (f) => crops.reduce((s, x2) => s + f(x2), 0);
    const productionT = S(x2 => x2.productionT), areaHa = S(x2 => x2.areaHa);
    const lossT = S(x2 => x2.lossT), lossValueUsd = S(x2 => x2.lossValueUsd);
    const foodCrops = crops.filter(x2 => x2.group !== 'cash');
    const needT = foodCrops.reduce((s, x2) => s + x2.needT, 0);
    const availFoodT = foodCrops.reduce((s, x2) => s + x2.totalAvailT, 0);
    const lossFoodT = foodCrops.reduce((s, x2) => s + x2.lossT, 0);
    const gapT = foodCrops.reduce((s, x2) => s + x2.gapT, 0);
    const importT = foodCrops.reduce((s, x2) => s + x2.importedT, 0);
    const kcalTotal = foodCrops.reduce((s, x2) => s + x2.kcalTotal, 0); // milliers de kcal
    const totals = {
      productionT, areaHa, avgYield: productionT / Math.max(1, areaHa),
      lossT, lossPct: (lossT / productionT) * 100, lossValueUsd,
      needT, availFoodT, gapT, importT,
      consumedT: foodCrops.reduce((s, x2) => s + x2.consumedT, 0),
      exportedT: foodCrops.reduce((s, x2) => s + x2.exportedT, 0),
      wasteT: foodCrops.reduce((s, x2) => s + (x2.totalAvailT - x2.consumedT), 0),
      selfSufficiency: needT ? (availFoodT / needT) * 100 : 100,
      kcalPerCapDay: (kcalTotal * 1000) / (profile.pop * 1e6) / 365,
      valueUsd: S(x2 => x2.valueUsd),
      exportValueUsd: S(x2 => x2.exportedT * x2.priceUsdKg * 1000),
      population: profile.pop,
      farms: Math.round(profile.pop * 1e6 * profile.smallholder / 6.1)
    };
    /* besoins nutritionnels (repères OMS/FAO) et couverture */
    const nutNeed = { kcal: 2100, prot: 52, fe: 11.5, va: 480, zn: 8.2 };
    const nutGain = { kcal: 0, prot: 0, fe: 0, va: 0, zn: 0 };
    foodCrops.forEach(x2 => {
      const edible = x2.consumedT * 1e6; // g (1 t = 1e6 g)
      nutGain.kcal += edible * x2.nut.kcal / 100 / 1000;      // milliers de kcal
      nutGain.prot += edible * x2.nut.prot / 100 / 1000;
      nutGain.fe += edible * x2.nut.fe / 100 / 1000;
      nutGain.va += edible * x2.nut.va / 100 / 1000;
      nutGain.zn += edible * x2.nut.zn / 100 / 1000;
    });
    const pop = profile.pop * 1e6;
    const nutrients = {
      kcal: (nutGain.kcal * 1000) / pop / 365,
      prot: (nutGain.prot * 1000) / pop / 365,
      fe: (nutGain.fe * 1000) / pop / 365 * 1000 / 1000,
      va: (nutGain.va * 1000) / pop / 365,
      zn: (nutGain.zn * 1000) / pop / 365 * 1000 / 1000,
      need: nutNeed
    };
    nutrients.coverage = {
      kcal: nutrients.kcal / nutNeed.kcal * 100,
      prot: nutrients.prot / nutNeed.prot * 100,
      fe: nutrients.fe / nutNeed.fe * 100,
      va: nutrients.va / nutNeed.va * 100,
      zn: nutrients.zn / nutNeed.zn * 100
    };

    /* --- historique 2010 → y -------------------------------------------- */
    const years = YEARS.filter(v => v <= y);
    const history = {
      years, productionT: [], lossPct: [], yieldTha: [], areaHa: [], climateRisk: [], importT: [], valueUsd: [], kcalPerCap: [], gapT: [], climateIndex: []
    };
    let baseProd = productionT, baseArea = areaHa, baseLoss = totals.lossPct, baseYield = totals.avgYield;
    for (let i = years.length - 1; i >= 0; i--) {
      const yy = years[i], back = y - yy;
      const g = Math.pow(1 + .031 - back * .0008, -back);
      const ci = climateIndex(cc, yy);
      const clim = 1 - ci * .055;
      const prod = baseProd * g * clim;
      const area = baseArea * Math.pow(1.012, -back) * (1 + (R.between('ha|' + cc + '|' + yy, -.02, .02)));
      history.productionT[i] = prod;
      history.areaHa[i] = area;
      history.yieldTha[i] = prod / Math.max(1, area);
      history.lossPct[i] = baseLoss * (1 + .028 * back) * (1 + R.between('lp|' + cc + '|' + yy, -.04, .04));
      history.climateRisk[i] = Math.max(0, Math.min(100, 50 - ci * 24 + (tempAnomaly(cc, yy) - .6) * 18));
      history.importT[i] = importT * Math.pow(1.021, -back) * (1 + R.between('im|' + cc + '|' + yy, -.07, .07));
      history.valueUsd[i] = prod * (productionT ? totals.valueUsd / productionT : .3) * Math.pow(.975, back);
      history.kcalPerCap[i] = (prod / baseProd) * nutrients.kcal;
      history.climateIndex[i] = ci;
    }

    /* --- régions -------------------------------------------------------- */
    const regions = (profile.regions || []).map((name, i) => {
      const seed = 'r|' + cc + '|' + name;
      const share = R.between(seed + '|s', .09, .26);
      const pot = R.between(seed + '|p', .55, 1.35);
      const clim = Math.max(0, Math.min(100, 46 - climateIndex(cc, y) * 18 + (pot - 1) * 16 + R.between(seed + '|c', -8, 8)));
      const storageLocal = Math.max(.03, Math.min(.75, c.storage * R.between(seed + '|st', .55, 1.45)));
      const coldLocal = Math.max(.005, Math.min(.6, c.cold * R.between(seed + '|cd', .4, 1.6)));
      const lossLocal = Math.max(6, Math.min(48, c.lossBase * (1 + (1 - storageLocal / .3) * .22) * R.between(seed + '|l', .82, 1.2)));
      return {
        name, share, potential: pot, climateRisk: clim,
        cold: coldLocal, storage: storageLocal, lossPct: lossLocal,
        productionT: productionT * share * (profile.regions.length ? 1 : 1),
        population: profile.pop * 1e6 * R.between(seed + '|pop', .7, 1.3) / profile.regions.length,
        yieldIndex: pot * 100,
        hotspot: lossLocal > 26 ? 'loss' : clim > 62 ? 'climate' : 'stable'
      };
    });
    // normalisation des parts régionales
    const shareSum = regions.reduce((s, r) => s + r.share, 0) || 1;
    regions.forEach(r => {
      r.share = r.share / shareSum;
      r.productionT = productionT * r.share;
      r.lossT = r.productionT * r.lossPct / 100;
      r.lossValueUsd = r.lossT * (totals.valueUsd / Math.max(1, productionT));
      r.gapT = Math.max(0, (needT * r.population / pop) - (r.productionT * (1 - r.lossPct / 100)));
    });

    /* --- climat : série mensuelle + événements --------------------------- */
    const monthly = [];
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const rainBase = (function () {
      let s = 0; for (const z in profile.zones) s += profile.zones[z] * ((ZONES[z] || ZONES.sudan).rain[0] + (ZONES[z] || ZONES.sudan).rain[1]) / 2;
      return s;
    })();
    /* Distribution intra-annuelle : une saison des pluies centrée sur l'été
       boréal, recalculée pour que la somme des 12 mois retombe exactement sur la
       pluviométrie annuelle de référence (rainBase) du pays. */
    const rawRain = [], phaseOf = [];
    let rawSum = 0;
    for (let m = 0; m < 12; m++) {
      const phase = Math.sin(((m - 3) / 12) * Math.PI * 2);
      const v = Math.max(0, 1 + phase * 2.4) * (1 + R.between('mr|' + cc + '|' + y + '|' + m, -.22, .22));
      rawRain.push(v); phaseOf.push(phase); rawSum += v;
    }
    for (let m = 0; m < 12; m++) {
      const phase = phaseOf[m];
      const rain = rainBase * rawRain[m] / rawSum;
      const temp = (ZONES[Object.keys(profile.zones)[0]] || ZONES.sudan).temp + tempAnomaly(cc, y) + Math.sin(((m - 2) / 12) * Math.PI * 2) * 2.6 + R.between('mt|' + cc + '|' + y + '|' + m, -.7, .7);
      monthly.push({ m: months[m], rain, temp, ndvi: Math.max(.1, Math.min(.9, .35 + phase * .35 + (rain / (rainBase / 12 * 2.4)) * .18)) });
    }
    const events = [];
    years.forEach(yy => {
      const ci = climateIndex(cc, yy);
      if (ci < -.75) events.push({ year: yy, type: 'drought', fr: 'Sécheresse / déficit pluviométrique', en: 'Drought / rainfall deficit', severity: Math.min(100, Math.round(-ci * 42)) });
      if (ci > .85) events.push({ year: yy, type: 'flood', fr: 'Excès pluviométrique / inondations', en: 'Flooding / excess rainfall', severity: Math.min(100, Math.round(ci * 40)) });
      if (tempAnomaly(cc, yy) > 1.15) events.push({ year: yy, type: 'heat', fr: 'Vague de chaleur', en: 'Heat wave', severity: Math.min(100, Math.round((tempAnomaly(cc, yy) - .7) * 55)) });
    });
    const pests = ['Chenille légionnaire (Spodoptera)', 'Mouche blanche / virus', 'Criquet pèlerin', 'Rouille du maïs', 'Aflatoxines (stockage humide)', 'Mildiou (tomate/pomme de terre)'];
    events.forEach((e, i) => { if (i % 3 === 0) e.pest = pests[(i + Math.round(R.between('pest|' + cc + '|' + e.year, 0, 5))) % pests.length]; });

    /* --- prix marché & volatilité ---------------------------------------- */
    const prices = {
      years, basketIndex: [], volatility: [], termsOfTrade: []
    };
    years.forEach((yy, i) => {
      prices.basketIndex[i] = 100 * priceIndex(yy) * (1 + R.between('bp|' + cc + '|' + yy, -.06, .06));
      prices.volatility[i] = 6 + Math.abs(climateIndex(cc, yy)) * 5.5 + R.between('vol|' + cc + '|' + yy, -.8, 1.4);
      prices.termsOfTrade[i] = 100 * (1 + (R.between('tot|' + cc + '|' + yy, -.08, .08))) * Math.pow(.995, y - yy);
    });

    /* --- qualité / traçabilité des données ------------------------------- */
    const dataQuality = {
      completeness: Math.round(58 + Math.min(34, c.storage * 90)),
      timeliness: Math.round(41 + c.road * 48),
      granularity: Math.round(38 + profile.regions.length * 5.5),
      laboratory: Math.round(12 + (o.labCoverage || 0) * 72),
      traceability: Math.round(14 + c.cold * 130),
      gaps: [
        { fr: 'Rendements par parcelle (télédétection + relevés terrain)', en: 'Plot-level yields (remote sensing + field)', status: 'partial' },
        { fr: 'Pertes post-récolte par étape et par produit', en: 'Post-harvest losses by stage & product', status: 'missing' },
        { fr: 'Analyse de laboratoire de la composition des aliments locaux', en: 'Laboratory composition of local foods', status: 'missing' },
        { fr: 'Prix réels par marché et par semaine', en: 'Weekly market-level prices', status: 'partial' },
        { fr: 'Registre des producteurs (petits exploitants)', en: 'Farmer registry (smallholders)', status: 'missing' },
        { fr: 'Bilan alimentaire national consolidé', en: 'Consolidated national food balance', status: 'partial' }
      ]
    };

    return {
      country: cc, countryName: profile.name, year: y, years, crops, totals, nutrients, history,
      regions, climate: { monthly, events, rainBase, climateIndex: climateIndex(cc, y), tempAnomaly: tempAnomaly(cc, y), zones: profile.zones },
      prices, profile: c, dataQuality,
      provenance: {
        reported: ['population', 'terres cultivées', 'découpage régional'],
        modelled: ['rendements', 'pertes post-récolte', 'prix', 'climat', 'nutriments disponibles', 'prévisions'],
        note: w.NUTRI_AGRI_I18N_TEXT ? w.NUTRI_AGRI_I18N_TEXT.dataNote : ''
      }
    };
  }

  /* --------------------------------------------------------------- outils */
  const byId = {}; CROPS.forEach(c => byId[c.id] = c);
  const api = {
    GROUPS, CROPS, COUNTRIES, ZONES, YEARS,
    crop: id => byId[id],
    build,
    groupLabel(id, lang) { const g = GROUPS[id]; return g ? (g[lang] || g.fr) : id; },
    cropLabel(id, lang) { const c = byId[id]; return c ? (c[lang === 'en' ? 'en' : 'fr'] || c.fr) : id; },
    availableCountries() { return Object.keys(COUNTRIES); },
    /** conversion nutrition -> « jours-personnes » couverts */
    peopleDays(kcal) { return kcal / 2100; }
  };
  w.NUTRI_AGRI_DATA = api;
})(window);
