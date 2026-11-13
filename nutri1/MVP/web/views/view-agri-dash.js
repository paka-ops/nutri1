/* ==========================================================================
   NUTRI.N°1 — Agriculture & food sovereignty dashboard  (TASK 6)
   Mounts into #vrDash (placeholder emitted by views/view-agri.js): the real-time data
   mandate, live KPIs, five animated overview charts (streaming curve, gauge, radar,
   stacked columns, flow map) and the explorer of the 15 indicators with, for each one,
   a live chart, "Captation App" and "Angle mort comblé".

   Depends on : js/bento-dash.js (NutriBentoDash), js/bento-i18n.js, views/view-agri.js
   Styles     : styles/views.css  (.nd-* shared block 12h, .vrd-* in block 11b)
   Note       : ALL figures are simulated in the browser (seeded per country). The rest of
                the Agri view keeps showing only what was really entered in the Food Cloud.
                The mandate and indicator texts below are editable in the dictionary
                (keys agd.mandate, agd.iN.t / .c / .a).
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N, D = global.NutriBentoDash;
  var root = doc.getElementById('agri');
  if (!root || !I18N || !D) return;
  var NS = 'agd';

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'agd.mandate.t': 'Agriculture & food sovereignty',
      'agd.mandate': 'Steer food sovereignty from what households really eat: link, at high frequency and at sub-national level, what is consumed to what is produced, imported, stored and lost.',
      'agd.k1': 'Meals captured today', 'agd.k2': 'Contributing households', 'agd.k3': 'Markets covered', 'agd.k4': 'Reporting producers',
      'agd.o1.t': 'Captured demand vs declared local supply', 'agd.o1.s': 'Index, base 100 · streaming',
      'agd.o2.t': 'Overall self-sufficiency', 'agd.o2.s': 'Share of captured demand covered by local production',
      'agd.o3.t': 'Sovereignty by value chain', 'agd.o3.s': 'Coverage of demand, %',
      'agd.o4.t': 'Declared production by region', 'agd.o4.s': 'Thousand tonnes, by food group',
      'agd.o5.t': 'Flows from production basins to markets', 'agd.o5.s': 'Relative volumes inferred from purchase origins',
      'agd.fam.demand': 'Demand', 'agd.fam.market': 'Markets', 'agd.fam.prod': 'Production', 'agd.fam.resil': 'Resilience',
      'agd.l.value': 'Captured demand', 'agd.l.supply': 'Declared local supply', 'agd.l.farm': 'Farm-gate price', 'agd.l.retail': 'Retail price paid',
      'agd.l.cereals': 'Cereals', 'agd.l.tubers': 'Tubers', 'agd.l.legumes': 'Legumes', 'agd.l.veg': 'Vegetables', 'agd.l.animal': 'Animal products', 'agd.l.fruits': 'Fruit',
      'agd.l.maize': 'Maize', 'agd.l.rice': 'Rice', 'agd.l.cassava': 'Cassava', 'agd.l.yam': 'Yam', 'agd.l.cowpea': 'Cowpea', 'agd.l.sorghum': 'Sorghum', 'agd.l.millet': 'Millet',
      'agd.l.local': 'Local', 'agd.l.regional': 'Regional (ECOWAS)', 'agd.l.imported': 'Imported',
      'agd.l.r1': 'Coastal', 'agd.l.r2': 'Plateaux', 'agd.l.r3': 'Central', 'agd.l.r4': 'Kara', 'agd.l.r5': 'Savanna',
      'agd.l.m1': 'Capital markets', 'agd.l.m2': 'Secondary towns', 'agd.l.m3': 'Border markets',
      'agd.l.q1': 'Jan–Mar', 'agd.l.q2': 'Apr–Jun', 'agd.l.q3': 'Jul–Sep', 'agd.l.q4': 'Oct–Dec',
      'agd.l.w1': 'W-5', 'agd.l.w2': 'W-4', 'agd.l.w3': 'W-3', 'agd.l.w4': 'W-2', 'agd.l.w5': 'W-1', 'agd.l.w6': 'This week',
      'agd.l.t1': 'M-5', 'agd.l.t2': 'M-4', 'agd.l.t3': 'M-3', 'agd.l.t4': 'M-2', 'agd.l.t5': 'M-1', 'agd.l.t6': 'This month',
      'agd.l.trad': 'Traditional cereals', 'agd.l.imp': 'Imported rice & wheat',
      'agd.l.field': 'Field', 'agd.l.storage': 'Storage', 'agd.l.transport': 'Transport', 'agd.l.marketloss': 'Market', 'agd.l.home': 'Household',
      'agd.l.own': 'Own production', 'agd.l.bought': 'Market purchase', 'agd.l.gift': 'Gift & barter', 'agd.l.aid': 'Assistance',
      'agd.l.last': 'Last season', 'agd.l.intent': 'Intended',
      'agd.l.c1': 'Self-sufficiency', 'agd.l.c2': 'Local calories', 'agd.l.c3': 'Affordable prices', 'agd.l.c4': 'Availability', 'agd.l.c5': 'Crop diversity',
      'agd.i1.t': 'Self-sufficiency rate per staple, measured against real demand',
      'agd.i1.c': 'Quantities eaten per food, declared or scanned in meals, aggregated by area and matched with the production declared by producers.',
      'agd.i1.a': 'Annual food balance sheets estimate demand as a residual; here it is measured at the plate, every month and per region.',
      'agd.i2.t': 'Share of calories of local, regional and imported origin',
      'agd.i2.c': 'Origin of scanned products (barcode, brand, market) and of the ingredients of logged dishes.',
      'agd.i2.a': 'Customs see volumes entering the country, not what ends up on the plate, nor in which households.',
      'agd.i3.t': 'Effective demand per value chain',
      'agd.i3.c': 'Frequency and portion sizes per food group in food diaries (cereals, tubers, legumes, vegetables, animal products).',
      'agd.i3.a': 'Value chains are planned from supply; disaggregated final demand is unknown between two household surveys.',
      'agd.i4.t': 'Prices actually paid by households for the basic basket',
      'agd.i4.c': 'Prices entered at purchase or read from scanned receipts, geolocated by market.',
      'agd.i4.a': 'Official price collection covers a few reference markets weekly; neighbourhood and rural prices are invisible.',
      'agd.i5.t': 'Seasonality of consumption and early detection of the lean season',
      'agd.i5.c': 'Weekly change in meals per day, portion sizes and dietary diversity, per region.',
      'agd.i5.a': 'The lean season is declared after the fact; here it is detected from the first weeks of decline.',
      'agd.i6.t': 'Local availability: stock-outs reported at the point of purchase',
      'agd.i6.c': '“Not found / out of stock” reports and forced substitutions logged during purchases.',
      'agd.i6.a': 'No statistic tracks local supply disruptions in near real time.',
      'agd.i7.t': 'Substitution between traditional cereals and imported rice and wheat',
      'agd.i7.c': 'Composition of staple dishes: millet, sorghum, fonio and maize versus rice, bread and pasta.',
      'agd.i7.a': 'The shift in preferences is invisible in production statistics until imports surge.',
      'agd.i8.t': 'Declared post-harvest losses and household waste',
      'agd.i8.c': 'Producer and household modules: quantities lost in the field, in storage, in transport, at market and as leftovers.',
      'agd.i8.a': 'Losses are estimated with flat coefficients; no measurement per stage and per area.',
      'agd.i9.t': 'Self-consumption and non-market channels',
      'agd.i9.c': 'Source declared for each food: own field, gift, barter, market or assistance.',
      'agd.i9.a': 'Self-consumed production escapes market statistics and distorts the real food balance.',
      'agd.i10.t': 'Diversity of crops actually eaten (neglected species included)',
      'agd.i10.c': 'Number of distinct local species and varieties recorded in meals per household and per month.',
      'agd.i10.a': 'Agricultural censuses follow the main crops only; neglected and underutilised species are not counted.',
      'agd.i11.t': 'Adoption of biofortified and fortified foods',
      'agd.i11.c': 'Scans and entries of biofortified products (orange-fleshed sweet potato, orange maize) and fortified flours and oils.',
      'agd.i11.a': 'Seed and product distribution is known; actual consumption is not.',
      'agd.i12.t': 'Sowing intentions and on-farm stocks',
      'agd.i12.c': 'Producers declare in the app the areas they plan to sow and the stocks they still hold.',
      'agd.i12.a': 'Season forecasts arrive late; stocks held by farmers are a black box.',
      'agd.i13.t': 'Smallholder market access: farm-gate price versus retail price',
      'agd.i13.c': 'Selling prices declared by producers matched with the prices households pay for the same product in the same area.',
      'agd.i13.a': 'The margin captured along the chain is unknown per product and per territory.',
      'agd.i14.t': 'Climate shocks felt on the plate',
      'agd.i14.c': 'Geolocated drops in consumption crossed with rainfall and drought alerts.',
      'agd.i14.a': 'The impact of a shock is measured on yields months later, not on what people actually eat.',
      'agd.i15.t': 'Territorial food sovereignty index (composite)',
      'agd.i15.c': 'Aggregation of indicators 1, 2, 4, 6 and 10 per commune and region, recomputed continuously.',
      'agd.i15.a': 'No up-to-date sub-national indicator exists to target agricultural investment.'
    },
    fr: {
      'agd.mandate.t': 'Agriculture & souveraineté alimentaire',
      'agd.mandate': 'Piloter la souveraineté alimentaire à partir de ce que les ménages mangent réellement : relier, à haute fréquence et à l’échelle infranationale, ce qui est consommé à ce qui est produit, importé, stocké et perdu.',
      'agd.k1': 'Repas captés aujourd’hui', 'agd.k2': 'Ménages contributeurs', 'agd.k3': 'Marchés couverts', 'agd.k4': 'Producteurs déclarants',
      'agd.o1.t': 'Demande captée vs offre locale déclarée', 'agd.o1.s': 'Indice base 100 · flux continu',
      'agd.o2.t': 'Autosuffisance globale', 'agd.o2.s': 'Part de la demande captée couverte par la production locale',
      'agd.o3.t': 'Souveraineté par filière', 'agd.o3.s': 'Couverture de la demande, %',
      'agd.o4.t': 'Production déclarée par région', 'agd.o4.s': 'Milliers de tonnes, par groupe d’aliments',
      'agd.o5.t': 'Flux des bassins de production vers les marchés', 'agd.o5.s': 'Volumes relatifs déduits de l’origine des achats',
      'agd.fam.demand': 'Demande', 'agd.fam.market': 'Marchés', 'agd.fam.prod': 'Production', 'agd.fam.resil': 'Résilience',
      'agd.l.value': 'Demande captée', 'agd.l.supply': 'Offre locale déclarée', 'agd.l.farm': 'Prix bord champ', 'agd.l.retail': 'Prix payé au détail',
      'agd.l.cereals': 'Céréales', 'agd.l.tubers': 'Tubercules', 'agd.l.legumes': 'Légumineuses', 'agd.l.veg': 'Maraîchage', 'agd.l.animal': 'Produits animaux', 'agd.l.fruits': 'Fruits',
      'agd.l.maize': 'Maïs', 'agd.l.rice': 'Riz', 'agd.l.cassava': 'Manioc', 'agd.l.yam': 'Igname', 'agd.l.cowpea': 'Niébé', 'agd.l.sorghum': 'Sorgho', 'agd.l.millet': 'Mil',
      'agd.l.local': 'Local', 'agd.l.regional': 'Régional (CEDEAO)', 'agd.l.imported': 'Importé',
      'agd.l.r1': 'Maritime', 'agd.l.r2': 'Plateaux', 'agd.l.r3': 'Centrale', 'agd.l.r4': 'Kara', 'agd.l.r5': 'Savanes',
      'agd.l.m1': 'Marchés de la capitale', 'agd.l.m2': 'Villes secondaires', 'agd.l.m3': 'Marchés frontaliers',
      'agd.l.q1': 'Janv.–mars', 'agd.l.q2': 'Avr.–juin', 'agd.l.q3': 'Juil.–sept.', 'agd.l.q4': 'Oct.–déc.',
      'agd.l.w1': 'S-5', 'agd.l.w2': 'S-4', 'agd.l.w3': 'S-3', 'agd.l.w4': 'S-2', 'agd.l.w5': 'S-1', 'agd.l.w6': 'Cette sem.',
      'agd.l.t1': 'M-5', 'agd.l.t2': 'M-4', 'agd.l.t3': 'M-3', 'agd.l.t4': 'M-2', 'agd.l.t5': 'M-1', 'agd.l.t6': 'Ce mois',
      'agd.l.trad': 'Céréales traditionnelles', 'agd.l.imp': 'Riz & blé importés',
      'agd.l.field': 'Champ', 'agd.l.storage': 'Stockage', 'agd.l.transport': 'Transport', 'agd.l.marketloss': 'Marché', 'agd.l.home': 'Ménage',
      'agd.l.own': 'Propre production', 'agd.l.bought': 'Achat au marché', 'agd.l.gift': 'Don & troc', 'agd.l.aid': 'Assistance',
      'agd.l.last': 'Campagne passée', 'agd.l.intent': 'Intentions',
      'agd.l.c1': 'Autosuffisance', 'agd.l.c2': 'Calories locales', 'agd.l.c3': 'Prix abordables', 'agd.l.c4': 'Disponibilité', 'agd.l.c5': 'Diversité cultivée',
      'agd.i1.t': 'Taux d’autosuffisance par produit de base, mesuré sur la demande réelle',
      'agd.i1.c': 'Quantités consommées par aliment, déclarées ou scannées dans les repas, agrégées par zone et rapprochées de la production déclarée par les producteurs.',
      'agd.i1.a': 'Les bilans alimentaires annuels estiment la demande par solde ; ici elle est mesurée dans l’assiette, chaque mois et par région.',
      'agd.i2.t': 'Part des calories d’origine locale, régionale et importée',
      'agd.i2.c': 'Origine des produits scannés (code-barres, marque, marché) et des ingrédients des plats saisis.',
      'agd.i2.a': 'Les douanes voient les volumes qui entrent dans le pays, pas ce qui finit dans l’assiette ni dans quels ménages.',
      'agd.i3.t': 'Demande effective par filière',
      'agd.i3.c': 'Fréquences et portions par groupe d’aliments dans les journaux alimentaires (céréales, tubercules, légumineuses, maraîchage, produits animaux).',
      'agd.i3.a': 'Les filières sont planifiées à partir de l’offre ; la demande finale désagrégée est inconnue entre deux enquêtes ménages.',
      'agd.i4.t': 'Prix réellement payés par les ménages pour le panier de base',
      'agd.i4.c': 'Prix saisis au moment de l’achat ou lus sur les tickets scannés, géolocalisés par marché.',
      'agd.i4.a': 'Les relevés officiels couvrent quelques marchés de référence, chaque semaine ; les prix de quartier et ruraux sont invisibles.',
      'agd.i5.t': 'Saisonnalité de la consommation et détection précoce de la soudure',
      'agd.i5.c': 'Variation hebdomadaire du nombre de repas par jour, des portions et de la diversité alimentaire, par région.',
      'agd.i5.a': 'La soudure est constatée après coup ; ici elle est détectée dès les premières semaines de baisse.',
      'agd.i6.t': 'Disponibilité de proximité : ruptures signalées au point d’achat',
      'agd.i6.c': 'Signalements « introuvable / en rupture » et substitutions forcées enregistrés lors des achats.',
      'agd.i6.a': 'Aucune statistique ne suit les ruptures locales d’approvisionnement en quasi temps réel.',
      'agd.i7.t': 'Substitution entre céréales traditionnelles et riz ou blé importés',
      'agd.i7.c': 'Composition des plats de base : mil, sorgho, fonio et maïs face au riz, au pain et aux pâtes.',
      'agd.i7.a': 'Le glissement des préférences est invisible dans les statistiques de production jusqu’à l’envolée des importations.',
      'agd.i8.t': 'Pertes post-récolte et gaspillage des ménages déclarés',
      'agd.i8.c': 'Modules producteurs et ménages : quantités perdues au champ, au stockage, au transport, au marché et en restes.',
      'agd.i8.a': 'Les pertes sont estimées par coefficients forfaitaires ; aucune mesure par étape ni par zone.',
      'agd.i9.t': 'Autoconsommation et circuits non marchands',
      'agd.i9.c': 'Source déclarée pour chaque aliment : propre champ, don, troc, marché ou assistance.',
      'agd.i9.a': 'La production autoconsommée échappe aux statistiques marchandes et fausse le bilan alimentaire réel.',
      'agd.i10.t': 'Diversité des cultures réellement consommées (espèces négligées incluses)',
      'agd.i10.c': 'Nombre d’espèces et de variétés locales distinctes relevées dans les repas, par ménage et par mois.',
      'agd.i10.a': 'Les recensements agricoles ne suivent que les grandes cultures ; les espèces négligées et sous-utilisées ne sont pas comptées.',
      'agd.i11.t': 'Adoption des aliments biofortifiés et fortifiés',
      'agd.i11.c': 'Scans et saisies de produits biofortifiés (patate douce à chair orange, maïs orange) et de farines et huiles enrichies.',
      'agd.i11.a': 'La distribution de semences et de produits est connue ; la consommation effective ne l’est pas.',
      'agd.i12.t': 'Intentions de semis et stocks paysans',
      'agd.i12.c': 'Les producteurs déclarent dans l’application les surfaces qu’ils prévoient de semer et les stocks qu’ils détiennent encore.',
      'agd.i12.a': 'Les prévisions de campagne arrivent tard ; les stocks détenus par les paysans sont une boîte noire.',
      'agd.i13.t': 'Accès des petits producteurs au marché : prix bord champ face au prix de détail',
      'agd.i13.c': 'Prix de vente déclarés par les producteurs, rapprochés des prix payés par les ménages pour le même produit dans la même zone.',
      'agd.i13.a': 'La marge captée le long de la chaîne est inconnue par produit et par territoire.',
      'agd.i14.t': 'Chocs climatiques ressentis dans l’assiette',
      'agd.i14.c': 'Baisses de consommation géolocalisées, croisées avec les alertes de pluviométrie et de sécheresse.',
      'agd.i14.a': 'L’impact d’un choc est mesuré sur les rendements des mois plus tard, pas sur ce que les gens mangent réellement.',
      'agd.i15.t': 'Indice de souveraineté alimentaire territoriale (composite)',
      'agd.i15.c': 'Agrégation des indicateurs 1, 2, 4, 6 et 10 par commune et par région, recalculée en continu.',
      'agd.i15.a': 'Il n’existe aucun indicateur infranational à jour pour cibler l’investissement agricole.'
    }
  });

  /* ---- 2. Definitions (base levels of the simulated series) ----------------- */
  var REG = ['r1', 'r2', 'r3', 'r4', 'r5'];
  var DEFS = [
    { id: 'i1', fam: 'demand', type: 'bars', value: 71, min: 40, max: 98, dec: 0, unit: '%', good: 'up', labels: ['maize', 'cassava', 'yam', 'sorghum', 'cowpea', 'rice'], vals: [96, 104, 101, 88, 79, 34], vunit: ' %', barMax: 110 },
    { id: 'i2', fam: 'demand', type: 'donut', value: 68, min: 45, max: 90, dec: 0, unit: '%', good: 'up', labels: ['local', 'regional', 'imported'], vals: [68, 9, 23] },
    { id: 'i3', fam: 'demand', type: 'radar', value: 104, min: 80, max: 130, dec: 0, unit: '', good: 'up', labels: ['cereals', 'tubers', 'legumes', 'veg', 'animal'], vals: [92, 78, 54, 61, 43] },
    { id: 'i4', fam: 'market', type: 'line', value: 112, min: 90, max: 140, dec: 1, unit: '', good: 'down', vol: 0.9 },
    { id: 'i5', fam: 'resil', type: 'heat', value: 2.6, min: 1.6, max: 3, dec: 1, unit: '', good: 'up', vol: 0.03, labels: REG, cols: ['q1', 'q2', 'q3', 'q4'], grid: [[2.8, 2.6, 2.5, 2.9], [2.8, 2.5, 2.4, 2.9], [2.7, 2.3, 2.2, 2.8], [2.6, 2.1, 2.0, 2.8], [2.5, 1.9, 1.8, 2.7]], vdec: 1, heatMax: 3, heatTone: 'lime' },
    { id: 'i6', fam: 'market', type: 'line', value: 38, min: 10, max: 90, dec: 0, unit: '‰', good: 'down', vol: 2.4 },
    { id: 'i7', fam: 'demand', type: 'stack', value: 57, min: 35, max: 80, dec: 0, unit: '%', good: 'up', series: ['trad', 'imp'], cols: ['t1', 't2', 't3', 't4', 't5', 't6'], grid: [[61, 60, 59, 58, 57, 57], [39, 40, 41, 42, 43, 43]] },
    { id: 'i8', fam: 'prod', type: 'bars', value: 21, min: 8, max: 40, dec: 1, unit: '%', good: 'down', vol: 0.3, labels: ['field', 'storage', 'transport', 'marketloss', 'home'], vals: [4.2, 7.8, 3.1, 2.6, 3.4], vdec: 1, vunit: ' %' },
    { id: 'i9', fam: 'prod', type: 'donut', value: 34, min: 15, max: 60, dec: 0, unit: '%', good: 'up', labels: ['own', 'bought', 'gift', 'aid'], vals: [34, 55, 8, 3] },
    { id: 'i10', fam: 'prod', type: 'line', value: 23, min: 12, max: 40, dec: 1, unit: '', good: 'up', vol: 0.25 },
    { id: 'i11', fam: 'prod', type: 'gauge', value: 18, min: 0, max: 100, dec: 1, unit: '%', good: 'up', vol: 0.5 },
    { id: 'i12', fam: 'prod', type: 'stack', value: 106, min: 85, max: 125, dec: 0, unit: '', good: 'up', series: ['last', 'intent'], cols: ['maize', 'rice', 'sorghum', 'cowpea', 'cassava', 'yam'], grid: [[100, 100, 100, 100, 100, 100], [108, 121, 96, 112, 103, 99]] },
    { id: 'i13', fam: 'market', type: 'line', value: 46, min: 25, max: 75, dec: 0, unit: '%', good: 'up', vol: 0.8, s1: 'farm', s2: { off: 52, name: 'retail' } },
    { id: 'i14', fam: 'resil', type: 'heat', value: 12, min: 0, max: 45, dec: 0, unit: '%', good: 'down', vol: 1, labels: REG, cols: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'], grid: [[2, 3, 2, 4, 3, 2], [3, 4, 6, 5, 4, 3], [4, 6, 9, 12, 10, 8], [5, 9, 14, 19, 17, 13], [7, 13, 21, 28, 26, 22]], heatMax: 30, vunit: ' %' },
    { id: 'i15', fam: 'resil', type: 'radar', value: 63, min: 30, max: 95, dec: 0, unit: '/100', good: 'up', labels: ['c1', 'c2', 'c3', 'c4', 'c5'], vals: [71, 68, 52, 66, 58] }
  ];
  var OVER = [
    { id: 'o1', type: 'line', value: 104, min: 88, max: 122, dec: 0, vol: 1.1, s1: 'value', s2: { off: -9, name: 'supply' } },
    { id: 'o2', type: 'gauge', value: 71, min: 0, max: 100, dec: 0, unit: '%', good: 'up', vol: 0.5 },
    { id: 'o3', type: 'radar', value: 0, min: 0, max: 1, labels: ['cereals', 'tubers', 'legumes', 'veg', 'animal', 'fruits'], vals: [78, 102, 81, 66, 47, 73], radarMax: 110 },
    { id: 'o4', type: 'stack', value: 0, min: 0, max: 1, series: ['cereals', 'tubers', 'legumes'], cols: REG, grid: [[180, 240, 160, 150, 210], [260, 310, 190, 120, 60], [30, 45, 40, 55, 70]] }
  ];
  var FLOWS = { left: REG, right: ['m1', 'm2', 'm3'], links: [[0, 0, 9], [1, 0, 7], [1, 1, 4], [2, 1, 5], [2, 0, 3], [3, 1, 4], [3, 2, 2], [4, 2, 5], [4, 1, 3]] };
  var KPIS = [{ k: 'k1', base: 18400, step: 9 }, { k: 'k2', base: 6120, step: 1 }, { k: 'k3', base: 214, step: 0 }, { k: 'k4', base: 1385, step: 0.4 }];

  /* ---- 3. State & render ------------------------------------------------------ */
  function country() { var sel = doc.getElementById('country'); return (sel && sel.value) || 'TG'; }
  var seed = '', model = null, over = null, explorer = null, kpi = [], paused = false;
  function build() {
    seed = NS + ':' + country();
    model = new D.Model(DEFS, seed); over = new D.Model(OVER, seed + ':o');
    var r = D.rng(seed + ':k');
    kpi = KPIS.map(function (k) { return Math.round(k.base * (0.85 + r() * 0.3)); });
    /* One explorer for the life of the page (its click handler is bound once): only its data model is swapped. */
    if (explorer) explorer.cfg.model = model;
    else explorer = new D.Explorer({ ns: NS, defs: DEFS, families: ['demand', 'market', 'prod', 'resil'], model: model });
  }
  function t(k, p) { return I18N.t(k, p); }
  function kpisHtml() {
    return KPIS.map(function (k, i) { return '<li><span>' + D.esc(t(NS + '.' + k.k)) + '</span><b data-vrd-kpi="' + i + '">' + D.fmt(kpi[i], 0) + '</b></li>'; }).join('');
  }
  function oChart(i) { var d = OVER[i]; return D.chart(d, over.st[d.id], NS, { label: t(NS + '.o' + (i + 1) + '.t'), h: i === 0 ? 220 : 230 }); }
  function html() {
    var P = function (i, cls, extra) { return D.panel('vrd-p vrd-p--' + cls, t(NS + '.o' + (i + 1) + '.t'), t(NS + '.o' + (i + 1) + '.s'), (extra || '') + oChart(i), 'data-vrd-o="' + i + '"'); };
    return '<div class="nd vrd">' + D.mandate(NS) +
      '<ul class="nd-kpis">' + kpisHtml() + '</ul>' +
      '<div class="vrd-grid">' + P(0, 'wide') + P(1, 'gauge') + P(2, 'third') + P(3, 'third') +
        D.panel('vrd-p vrd-p--third', t(NS + '.o5.t'), t(NS + '.o5.s'), D.flows({ left: FLOWS.left, right: FLOWS.right, links: FLOWS.links, label: t(NS + '.o5.t') }, NS)) + '</div>' +
      explorer.html() + D.note() + '</div>';
  }
  var host = doc.createElement('div'); host.className = 'vrd-host';
  function paint() { host.innerHTML = html(); }
  function mount() {
    var slot = doc.getElementById('vrDash');
    if (!slot) return;
    if (seed !== NS + ':' + country()) { build(); paint(); }
    if (host.parentNode !== slot) slot.appendChild(host);
  }
  function tick() {
    if (paused || !host.firstChild) return;
    model.tick(); over.tick();
    KPIS.forEach(function (k, i) {
      kpi[i] += Math.round(k.step * (0.5 + model.rand() * 1.5));
      var el = host.querySelector('[data-vrd-kpi="' + i + '"]'); if (el) el.textContent = D.fmt(kpi[i], 0);
    });
    [0, 1, 2, 3].forEach(function (i) {
      var el = host.querySelector('[data-vrd-o="' + i + '"]');
      if (el) { el.classList.add('is-live'); el.innerHTML = oChart(i); }
    });
    explorer.tick();
  }

  build();
  explorer.bind(host);
  paint();
  D.live(root, tick, 2600);

  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.agriDash = {
    mount: mount, tick: tick,
    pause: function (v) { paused = v !== false; },
    state: function () { return { country: country(), fam: explorer.fam, sel: explorer.sel, shown: explorer.list().length, value: model.st[explorer.sel].v }; }
  };
  I18N.onChange(function () { paint(); });
  doc.addEventListener('nutri:countryChanged', function () { mount(); });
  var ag = global.NutriBentoViews.agri;
  if (ag && ag.render) ag.render();
  mount();
})(window);
