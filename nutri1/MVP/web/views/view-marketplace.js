/* ==========================================================================
   NUTRI.N°1 — Healthy Food Marketplace view  (SESSION 8)
   Renders <section id="marketplace"> as a Dark Bento grid with two spaces:
   "Store" (catalogue, filters, cart) and "By health context" (local foods and
   nutrition goals for a context, selection for nutritionist review).

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Styles     : styles/views.css  (.vm-*)
   Preserves  : populateGeneralStoreCountry(), selectGeneralCategory(), renderGeneralHealthyStore(),
                renderPatientFoodBridge(), openPatientFoodMarketplace(), populateClinicalFoodCountry(),
                selectFoodContext(), renderClinicalFood(), recommendClinicalFood(), viewClinicalFood(),
                requestNutritionistReview(), addToCart(), renderCart(), viewProduct(), checkoutMarket()
                #generalHealthyStore #generalStoreCountry #generalStoreSearch #generalStorePrice
                #generalHealthyProducts .store-tab #clinicalFoodCountry .condition-card[data-condition]
                #foodContextTitle #foodContextDescription #foodSafetyBadge #foodPathCountry
                #conditionProducts #foodRationale #patientFoodBridge #cartItems #cartTotal
   Storage    : localStorage.nutri_cart  ([{n: product name, q: quantity}])
   Note       : demonstration only. Products, prices (US dollars) and food lists are the
                samples of the original prototype; there is no stock, seller, delivery or
                traceability record behind them. The food list of a health context depends on
                the country only; it is not filtered by the context. Nothing is sent anywhere.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('marketplace');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'market.title': 'Healthy Food Marketplace',
      'market.sub': 'Nutritious African foods for everyday family meals, and local foods to discuss for a health context.',
      'market.demo': 'Demonstration · sample products',
      'market.tabs': 'Marketplace space', 'market.tab.store': 'Store', 'market.tab.context': 'By health context',
      'market.store.pill': 'FOR EVERY HOUSEHOLD', 'market.store.title': 'Healthy Food Store',
      'market.f.country': 'Country of origin', 'market.f.all': 'All countries', 'market.f.search': 'Search', 'market.f.search.ph': 'Search healthy foods',
      'market.f.price': 'Price', 'market.price.all': 'All prices', 'market.price.low': 'Under $8', 'market.price.mid': '$8 to $15', 'market.price.high': 'Above $15',
      'market.cats': 'Categories',
      'market.cat.all': 'All foods', 'market.cat.cereals': 'Cereals & grains', 'market.cat.tubers': 'Roots & tubers', 'market.cat.fruits': 'Fruits & vegetables',
      'market.cat.legumes': 'Legumes & seeds', 'market.cat.oils': 'Healthy oils', 'market.cat.biofortified': 'Biofortified foods',
      'market.count': '{n} product(s)',
      'market.none': 'No sample product matches these filters.', 'market.none.country': 'No sample product for {country} yet.', 'market.showall': 'Show all countries',
      'market.add': 'Add to cart', 'market.details': 'Details', 'market.details.hide': 'Hide details',
      'market.d.origin': 'Origin', 'market.d.category': 'Category', 'market.d.price': 'Sample price', 'market.d.trace': 'Traceability',
      'market.d.trace.none': 'No batch record is attached in this demonstration.',
      'market.toast.add': 'Added to cart: {name}',
      'market.cart.title': 'Cart', 'market.cart.empty': 'Your cart is empty.', 'market.cart.items': '{n} item(s)',
      'market.cart.total': 'Estimated total', 'market.cart.note': 'Sample prices in US dollars. No order is placed.',
      'market.cart.checkout': 'Go to payment', 'market.cart.clear': 'Empty cart', 'market.cart.need': 'Add a product before going to payment.',
      'market.cart.less': 'Decrease quantity: {name}', 'market.cart.more': 'Increase quantity: {name}', 'market.cart.remove': 'Remove: {name}', 'market.cart.qty': 'Quantity',
      'market.toast.checkout': 'Payment opened for your cart.',
      'market.ctx.pill': 'PERSONALIZED FOOD PATHWAY', 'market.ctx.title': 'What is the nutrition context?',
      'market.ctx.sub': 'Select a context to see its nutrition goals and local foods to discuss. This is nutrition support, not a substitute for medical treatment.',
      'market.ctx.country': 'Patient country', 'market.ctx.list': 'Nutrition contexts',
      'market.c.diabetes': 'Diabetes', 'market.c.diabetes.s': 'Balanced carbohydrate choices', 'market.c.diabetes.t': 'Foods for diabetes', 'market.c.diabetes.b': 'Nutritionist review',
      'market.c.diabetes.d': 'Prioritize minimally processed local foods, fiber-rich choices and balanced portions; individual plans should follow the patient’s clinical profile.',
      'market.c.hypertension': 'Hypertension', 'market.c.hypertension.s': 'Heart-conscious food choices', 'market.c.hypertension.t': 'Foods for hypertension', 'market.c.hypertension.b': 'Professional guidance',
      'market.c.hypertension.d': 'Prioritize fresh, minimally processed foods and lower-sodium choices using locally available ingredients.',
      'market.c.renal': 'Kidney / Renal', 'market.c.renal.s': 'Clinician-guided renal nutrition', 'market.c.renal.t': 'Kidney / renal nutrition', 'market.c.renal.b': 'Clinical review required',
      'market.c.renal.d': 'Renal diets are highly individualized. Food selection should be linked to kidney function and clinician guidance.',
      'market.c.anemia': 'Anemia', 'market.c.anemia.s': 'Iron-rich food pathway', 'market.c.anemia.t': 'Foods for anemia', 'market.c.anemia.b': 'Clinical context',
      'market.c.anemia.d': 'Prioritize iron-rich local foods and foods that support dietary iron absorption, according to the patient’s cause and treatment plan.',
      'market.c.malnutrition': 'Malnutrition', 'market.c.malnutrition.s': 'Energy & nutrient density', 'market.c.malnutrition.t': 'Foods for malnutrition', 'market.c.malnutrition.b': 'Clinical monitoring',
      'market.c.malnutrition.d': 'Prioritize energy- and nutrient-dense foods appropriate to age and clinical condition, with professional monitoring.',
      'market.c.obesity': 'Overweight / Obesity', 'market.c.obesity.s': 'Energy-aware dietary choices', 'market.c.obesity.t': 'Foods for overweight / obesity', 'market.c.obesity.b': 'Personalized plan',
      'market.c.obesity.d': 'Prioritize nutrient-dense foods, vegetables, legumes and balanced portions while avoiding overly restrictive approaches.',
      'market.c.child': 'Child nutrition', 'market.c.child.s': 'Age-appropriate foods', 'market.c.child.t': 'Foods for child nutrition', 'market.c.child.b': 'Pediatric guidance',
      'market.c.child.d': 'Prioritize age-appropriate, nutrient-dense foods and culturally relevant family foods, with growth monitoring.',
      'market.c.maternal': 'Pregnancy / Lactation', 'market.c.maternal.s': 'Maternal nutrition support', 'market.c.maternal.t': 'Foods for pregnancy / lactation', 'market.c.maternal.b': 'Maternal guidance',
      'market.c.maternal.d': 'Prioritize dietary diversity and nutrient-dense local foods adapted to pregnancy or lactation needs.',
      'market.path': 'Pathway', 'market.path.1': 'Context', 'market.path.3': 'Local foods', 'market.path.4': 'Nutrition goals', 'market.path.5': 'Professional review',
      'market.foods.count': '{n} local food(s) · {country}',
      'market.food.add': 'Add to selection', 'market.food.added': 'In selection',
      'market.toast.food': '{name} added to the selection for review.',
      'market.why.title': 'Nutrition goals for this context',
      'market.why.note': 'The foods shown are common local foods for the selected country. The list is not filtered by the context: a nutrition professional adapts the choices and portions to the patient.',
      'market.review.title': 'Nutritionist validation',
      'market.review.sub': 'A selection can be reviewed against the patient’s full profile before any purchase.',
      'market.review.empty': 'No food selected yet.', 'market.review.count': '{n} food(s) selected',
      'market.review.remove': 'Remove from selection: {name}',
      'market.review.cta': 'Request nutritionist review', 'market.review.need': 'Select at least one food first.',
      'market.review.sent': 'Review requested (demonstration): no message was sent. Continue in the Nutritionist Network.',
      'market.review.open': 'Open Nutritionist Network',
      'market.bridge.title': 'Citizen Dashboard link',
      'market.bridge.sub': 'The dashboard and the marketplace are not linked yet: the context is chosen here by hand.',
      'market.bridge.country': 'Country', 'market.bridge.context': 'Nutrition context', 'market.bridge.match': 'Food choice', 'market.bridge.match.v': 'Reviewed by a nutritionist',
      'market.bridge.open': 'Open Citizen Dashboard',
      'market.nodetail': 'Detailed composition is not available in this demonstration.'
    },
    fr: {
      'market.title': 'Marché des aliments sains',
      'market.sub': 'Des aliments africains nutritifs pour les repas de la famille, et des aliments locaux à envisager selon un contexte de santé.',
      'market.demo': 'Démonstration · produits d’exemple',
      'market.tabs': 'Espace du marché', 'market.tab.store': 'Boutique', 'market.tab.context': 'Par contexte de santé',
      'market.store.pill': 'POUR CHAQUE FOYER', 'market.store.title': 'Boutique d’aliments sains',
      'market.f.country': 'Pays d’origine', 'market.f.all': 'Tous les pays', 'market.f.search': 'Recherche', 'market.f.search.ph': 'Rechercher un aliment sain',
      'market.f.price': 'Prix', 'market.price.all': 'Tous les prix', 'market.price.low': 'Moins de 8 $', 'market.price.mid': 'De 8 à 15 $', 'market.price.high': 'Plus de 15 $',
      'market.cats': 'Catégories',
      'market.cat.all': 'Tous les aliments', 'market.cat.cereals': 'Céréales et grains', 'market.cat.tubers': 'Racines et tubercules', 'market.cat.fruits': 'Fruits et légumes',
      'market.cat.legumes': 'Légumineuses et graines', 'market.cat.oils': 'Huiles saines', 'market.cat.biofortified': 'Aliments biofortifiés',
      'market.count': '{n} produit(s)',
      'market.none': 'Aucun produit d’exemple ne correspond à ces filtres.', 'market.none.country': 'Pas encore de produit d’exemple pour ce pays : {country}.', 'market.showall': 'Afficher tous les pays',
      'market.add': 'Ajouter au panier', 'market.details': 'Détails', 'market.details.hide': 'Masquer les détails',
      'market.d.origin': 'Origine', 'market.d.category': 'Catégorie', 'market.d.price': 'Prix d’exemple', 'market.d.trace': 'Traçabilité',
      'market.d.trace.none': 'Aucune fiche de lot n’est associée dans cette démonstration.',
      'market.toast.add': 'Ajouté au panier : {name}',
      'market.cart.title': 'Panier', 'market.cart.empty': 'Votre panier est vide.', 'market.cart.items': '{n} article(s)',
      'market.cart.total': 'Total estimé', 'market.cart.note': 'Prix d’exemple en dollars américains. Aucune commande n’est passée.',
      'market.cart.checkout': 'Aller au paiement', 'market.cart.clear': 'Vider le panier', 'market.cart.need': 'Ajoutez un produit avant d’aller au paiement.',
      'market.cart.less': 'Diminuer la quantité : {name}', 'market.cart.more': 'Augmenter la quantité : {name}', 'market.cart.remove': 'Retirer : {name}', 'market.cart.qty': 'Quantité',
      'market.toast.checkout': 'Paiement ouvert pour votre panier.',
      'market.ctx.pill': 'PARCOURS ALIMENTAIRE PERSONNALISÉ', 'market.ctx.title': 'Quel est le contexte nutritionnel ?',
      'market.ctx.sub': 'Sélectionnez un contexte pour voir ses objectifs nutritionnels et des aliments locaux à envisager. C’est un appui nutritionnel, pas un substitut au traitement médical.',
      'market.ctx.country': 'Pays du patient', 'market.ctx.list': 'Contextes nutritionnels',
      'market.c.diabetes': 'Diabète', 'market.c.diabetes.s': 'Choix de glucides équilibrés', 'market.c.diabetes.t': 'Aliments et diabète', 'market.c.diabetes.b': 'Avis du nutritionniste',
      'market.c.diabetes.d': 'Privilégier les aliments locaux peu transformés, riches en fibres, et des portions équilibrées ; le plan individuel doit suivre le profil clinique du patient.',
      'market.c.hypertension': 'Hypertension', 'market.c.hypertension.s': 'Choix favorables au cœur', 'market.c.hypertension.t': 'Aliments et hypertension', 'market.c.hypertension.b': 'Accompagnement professionnel',
      'market.c.hypertension.d': 'Privilégier les aliments frais, peu transformés et moins salés, à partir d’ingrédients disponibles localement.',
      'market.c.renal': 'Rein / Rénal', 'market.c.renal.s': 'Nutrition rénale guidée par le clinicien', 'market.c.renal.t': 'Nutrition rénale', 'market.c.renal.b': 'Avis clinique obligatoire',
      'market.c.renal.d': 'Les régimes rénaux sont très individualisés. Le choix des aliments doit dépendre de la fonction rénale et de l’avis du clinicien.',
      'market.c.anemia': 'Anémie', 'market.c.anemia.s': 'Parcours d’aliments riches en fer', 'market.c.anemia.t': 'Aliments et anémie', 'market.c.anemia.b': 'Contexte clinique',
      'market.c.anemia.d': 'Privilégier les aliments locaux riches en fer et ceux qui favorisent son absorption, selon la cause et le traitement du patient.',
      'market.c.malnutrition': 'Malnutrition', 'market.c.malnutrition.s': 'Densité en énergie et en nutriments', 'market.c.malnutrition.t': 'Aliments et malnutrition', 'market.c.malnutrition.b': 'Suivi clinique',
      'market.c.malnutrition.d': 'Privilégier des aliments denses en énergie et en nutriments, adaptés à l’âge et à l’état clinique, avec un suivi professionnel.',
      'market.c.obesity': 'Surpoids / Obésité', 'market.c.obesity.s': 'Choix attentifs à l’énergie', 'market.c.obesity.t': 'Aliments et surpoids / obésité', 'market.c.obesity.b': 'Plan personnalisé',
      'market.c.obesity.d': 'Privilégier les aliments denses en nutriments, les légumes, les légumineuses et des portions équilibrées, sans approche trop restrictive.',
      'market.c.child': 'Nutrition de l’enfant', 'market.c.child.s': 'Aliments adaptés à l’âge', 'market.c.child.t': 'Aliments et nutrition de l’enfant', 'market.c.child.b': 'Avis pédiatrique',
      'market.c.child.d': 'Privilégier des aliments adaptés à l’âge, denses en nutriments, et les plats familiaux habituels, avec un suivi de la croissance.',
      'market.c.maternal': 'Grossesse / Allaitement', 'market.c.maternal.s': 'Appui nutritionnel maternel', 'market.c.maternal.t': 'Aliments pendant la grossesse / l’allaitement', 'market.c.maternal.b': 'Suivi maternel',
      'market.c.maternal.d': 'Privilégier la diversité alimentaire et les aliments locaux denses en nutriments, adaptés aux besoins de la grossesse ou de l’allaitement.',
      'market.path': 'Parcours', 'market.path.1': 'Contexte', 'market.path.3': 'Aliments locaux', 'market.path.4': 'Objectifs nutritionnels', 'market.path.5': 'Avis professionnel',
      'market.foods.count': '{n} aliment(s) locaux · {country}',
      'market.food.add': 'Ajouter à la sélection', 'market.food.added': 'Dans la sélection',
      'market.toast.food': 'Ajouté à la sélection à faire valider : {name}.',
      'market.why.title': 'Objectifs nutritionnels de ce contexte',
      'market.why.note': 'Les aliments affichés sont des aliments locaux courants du pays choisi. La liste n’est pas filtrée selon le contexte : un professionnel de la nutrition adapte les choix et les portions au patient.',
      'market.review.title': 'Validation par un nutritionniste',
      'market.review.sub': 'Une sélection peut être examinée au regard du profil complet du patient avant tout achat.',
      'market.review.empty': 'Aucun aliment sélectionné pour l’instant.', 'market.review.count': '{n} aliment(s) sélectionné(s)',
      'market.review.remove': 'Retirer de la sélection : {name}',
      'market.review.cta': 'Demander l’avis d’un nutritionniste', 'market.review.need': 'Sélectionnez d’abord au moins un aliment.',
      'market.review.sent': 'Avis demandé (démonstration) : aucun message n’a été envoyé. Poursuivez dans le Réseau de nutritionnistes.',
      'market.review.open': 'Ouvrir le Réseau de nutritionnistes',
      'market.bridge.title': 'Lien avec le tableau de bord citoyen',
      'market.bridge.sub': 'Le tableau de bord et le marché ne sont pas encore reliés : le contexte se choisit ici à la main.',
      'market.bridge.country': 'Pays', 'market.bridge.context': 'Contexte nutritionnel', 'market.bridge.match': 'Choix des aliments', 'market.bridge.match.v': 'Revu par un nutritionniste',
      'market.bridge.open': 'Ouvrir le tableau de bord citoyen',
      'market.nodetail': 'La composition détaillée n’est pas disponible dans cette démonstration.'
    }
  });

  /* ---- 2. Sample data (carried over from the original prototype) -------- */
  var PRODUCTS = [
    ['Orange-fleshed sweet potato', 'TG', 'tubers', 3.9, 'Provitamin A • local'],
    ['Biofortified sweet potato flour', 'TG', 'biofortified', 6.5, 'Provitamin A • biofortified'],
    ['Whole sorghum grain', 'TG', 'cereals', 4.8, 'Whole grain • local'],
    ['Millet family pack', 'SN', 'cereals', 5.5, 'Whole grain • local'],
    ['Baobab fruit powder', 'SN', 'fruits', 8.9, 'Vitamin C • fiber'],
    ['Fresh leafy vegetable basket', 'GH', 'fruits', 7.5, 'Fresh • nutrient-rich'],
    ['Cowpea family pack', 'BF', 'legumes', 6.2, 'Protein • fiber • local'],
    ['Groundnut & seed mix', 'NG', 'legumes', 7.8, 'Protein • healthy fats'],
    ['Cold-pressed local seed oil', 'CI', 'oils', 11.5, 'Quality fats'],
    ['Moringa leaf powder', 'GH', 'biofortified', 7.2, 'Micronutrients'],
    ['Family fruit basket', 'CI', 'fruits', 12.5, 'Seasonal • fresh'],
    ['Nutrient-rich legume flour', 'NG', 'legumes', 10.2, 'Protein • fiber'],
    ['Healthy whole-grain mix', 'SN', 'cereals', 8.7, 'Fiber • whole grain']
  ].map(function (p, i) { return { id: i, name: p[0], country: p[1], cat: p[2], price: p[3], tags: p[4].split(' • ') }; });
  var CATS = ['all', 'cereals', 'tubers', 'fruits', 'legumes', 'oils', 'biofortified'];
  var PRICES = ['all', 'low', 'mid', 'high'];
  var CONTEXTS = {
    diabetes: ['Fiber', 'Lower added sugars', 'Portion balance'], hypertension: ['Lower sodium', 'Potassium context', 'Heart-conscious choices'],
    renal: ['Individualized protein', 'Sodium context', 'Mineral monitoring'], anemia: ['Iron-rich foods', 'Vitamin C pairing', 'Diet diversity'],
    malnutrition: ['Energy density', 'Protein', 'Micronutrient density'], obesity: ['Fiber', 'Energy awareness', 'Diet quality'],
    child: ['Growth', 'Diet diversity', 'Micronutrients'], maternal: ['Iron', 'Protein', 'Diet diversity']
  };
  var CTX_ICON = { diabetes: 'drop', hypertension: 'heart', renal: 'kidney', anemia: 'drop', malnutrition: 'bowl', obesity: 'scale', child: 'child', maternal: 'people' };
  var G = 'cereals', L = 'legumes', F = 'fruits', T = 'tubers', B = 'biofortified';
  var FOODS = {
    TG: [['Orange-fleshed sweet potato', T, 'Provitamin A • local'], ['Baobab fruit pulp', F, 'Vitamin C • fiber'], ['Moringa leaves', F, 'Micronutrient-rich'], ['Cowpea', L, 'Plant protein • fiber'], ['Fortified cereal blend', G, 'Nutrient-dense']],
    GH: [['Orange-fleshed sweet potato', T, 'Provitamin A • local'], ['Groundnut', L, 'Protein • healthy fats'], ['Beans', L, 'Protein • fiber'], ['Moringa', F, 'Micronutrients'], ['Whole maize', G, 'Staple • fiber']],
    SN: [['Baobab', F, 'Vitamin C • fiber'], ['Cowpea', L, 'Protein • fiber'], ['Millet', G, 'Whole grain'], ['Groundnut', L, 'Protein • healthy fats'], ['Leafy vegetables', F, 'Micronutrients']],
    NG: [['Beans', L, 'Protein • fiber'], ['Sweet potato', T, 'Carotenoids'], ['Sorghum', G, 'Whole grain'], ['Vegetables', F, 'Fiber • micronutrients'], ['Groundnut', L, 'Protein • healthy fats']],
    CI: [['Plantain', F, 'Local staple'], ['Beans', L, 'Protein • fiber'], ['Orange-fleshed sweet potato', T, 'Provitamin A'], ['Baobab', F, 'Vitamin C'], ['Leafy vegetables', F, 'Micronutrients']],
    BF: [['Sorghum', G, 'Whole grain'], ['Cowpea', L, 'Protein • fiber'], ['Baobab', F, 'Vitamin C'], ['Groundnut', L, 'Protein • healthy fats'], ['Leafy vegetables', F, 'Micronutrients']],
    'default': [['Local whole grains', G, 'Fiber • whole grain'], ['Legumes', L, 'Protein • fiber'], ['Local leafy vegetables', F, 'Micronutrients'], ['Local fruits', F, 'Vitamins • fiber'], ['Biofortified foods', B, 'Micronutrient support']]
  };
  /* French for sample names, tags and goals (lower-cased keys). */
  var FR = {
    'orange-fleshed sweet potato': 'Patate douce à chair orange', 'biofortified sweet potato flour': 'Farine de patate douce biofortifiée', 'whole sorghum grain': 'Sorgho en grains entiers',
    'millet family pack': 'Mil, format familial', 'baobab fruit powder': 'Poudre de fruit de baobab', 'fresh leafy vegetable basket': 'Panier de légumes-feuilles frais',
    'cowpea family pack': 'Niébé, format familial', 'groundnut & seed mix': 'Mélange d’arachides et de graines', 'cold-pressed local seed oil': 'Huile de graines locale pressée à froid',
    'moringa leaf powder': 'Poudre de feuilles de moringa', 'family fruit basket': 'Panier de fruits familial', 'nutrient-rich legume flour': 'Farine de légumineuses riche en nutriments',
    'healthy whole-grain mix': 'Mélange de céréales complètes',
    'baobab fruit pulp': 'Pulpe de fruit de baobab', 'moringa leaves': 'Feuilles de moringa', 'cowpea': 'Niébé', 'fortified cereal blend': 'Mélange de céréales enrichi', 'groundnut': 'Arachide',
    'beans': 'Haricots', 'moringa': 'Moringa', 'whole maize': 'Maïs complet', 'baobab': 'Baobab', 'millet': 'Mil', 'leafy vegetables': 'Légumes-feuilles', 'sweet potato': 'Patate douce',
    'sorghum': 'Sorgho', 'vegetables': 'Légumes', 'plantain': 'Banane plantain', 'local whole grains': 'Céréales complètes locales', 'legumes': 'Légumineuses',
    'local leafy vegetables': 'Légumes-feuilles locaux', 'local fruits': 'Fruits locaux', 'biofortified foods': 'Aliments biofortifiés',
    'provitamin a': 'Provitamine A', 'local': 'Local', 'biofortified': 'Biofortifié', 'whole grain': 'Céréale complète', 'vitamin c': 'Vitamine C', 'fiber': 'Fibres', 'fresh': 'Frais',
    'nutrient-rich': 'Riche en nutriments', 'protein': 'Protéines', 'healthy fats': 'Bonnes graisses', 'quality fats': 'Graisses de qualité', 'micronutrients': 'Micronutriments',
    'seasonal': 'De saison', 'micronutrient-rich': 'Riche en micronutriments', 'plant protein': 'Protéines végétales', 'nutrient-dense': 'Dense en nutriments', 'staple': 'Aliment de base',
    'carotenoids': 'Caroténoïdes', 'local staple': 'Aliment de base local', 'vitamins': 'Vitamines', 'micronutrient support': 'Apport en micronutriments',
    'lower added sugars': 'Moins de sucres ajoutés', 'portion balance': 'Portions équilibrées', 'lower sodium': 'Moins de sel', 'potassium context': 'Potassium à surveiller',
    'heart-conscious choices': 'Choix favorables au cœur', 'individualized protein': 'Protéines individualisées', 'sodium context': 'Sel à surveiller', 'mineral monitoring': 'Suivi des minéraux',
    'iron-rich foods': 'Aliments riches en fer', 'vitamin c pairing': 'Association avec la vitamine C', 'diet diversity': 'Diversité alimentaire', 'energy density': 'Densité énergétique',
    'micronutrient density': 'Densité en micronutriments', 'energy awareness': 'Attention à l’énergie', 'diet quality': 'Qualité de l’alimentation', 'growth': 'Croissance', 'iron': 'Fer'
  };
  var missing = {};
  function tr(s) {
    var k = String(s).toLowerCase();
    if (!FR[k]) missing[k] = 1;
    if (I18N.lang === 'fr' && FR[k]) return FR[k];
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---- 3. State ------------------------------------------------------------ */
  var KEY = 'nutri_cart';
  function codes() { return (I18N.countries || []).map(function (c) { return c.code; }); }
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && sel.value) ? sel.value : 'TG'; }
  function loadCart() {
    try {
      var raw = JSON.parse(global.localStorage.getItem(KEY) || '[]'), out = [];
      (Array.isArray(raw) ? raw : []).forEach(function (r) {
        var p = byName(r && r.n), q = Math.floor(Number(r && r.q));
        if (p && q >= 1) out.push({ id: p.id, q: Math.min(q, 99) });
      });
      return out;
    } catch (e) { return []; }
  }
  function saveCart() { try { global.localStorage.setItem(KEY, JSON.stringify(state.cart.map(function (r) { return { n: PRODUCTS[r.id].name, q: r.q }; }))); } catch (e) { /* ignore */ } }
  function byName(n) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].name === n) return PRODUCTS[i]; return null; }
  var state = { tab: 'store', country: headerCountry(), cat: 'all', q: '', price: 'all', open: -1, cart: [], ctxCountry: headerCountry(), ctx: 'diabetes', plan: [], sent: false };
  state.cart = loadCart();

  /* ---- 4. Helpers ------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function money(v) {
    try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'USD' }); } catch (e) { return '$' + Number(v).toFixed(2); }
  }
  function notify(msg) { if (typeof global.toast === 'function') { try { global.toast(msg); } catch (e) { /* ignore */ } } }
  function nav(id) { if (typeof global.go === 'function') global.go(id); }
  var PATHS = {
    store: '<path d="M4 9.500 5.500 4h13L20 9.500M4 9.500a2.700 2.700 0 0 0 5.300 0 2.700 2.700 0 0 0 5.400 0 2.700 2.700 0 0 0 5.300 0M5.500 12.500V20h13v-7.500M10 20v-4.500h4V20"/>',
    cart: '<path d="M4 5h2l2.200 10h9.300l1.800-7H7"/><circle cx="9.500" cy="18.500" r="1.300"/><circle cx="16.500" cy="18.500" r="1.300"/>',
    all: '<rect x="4" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.500"/>',
    cereals: '<path d="M12 21V8M12 8c-2-1-3-3-3-5 2 0 3 1.500 3 3 0-1.500 1-3 3-3 0 2-1 4-3 5zM12 13c-2.500 0-4-1.500-4-4M12 13c2.500 0 4-1.500 4-4M12 18c-2.500 0-4-1.500-4-4M12 18c2.500 0 4-1.500 4-4"/>',
    tubers: '<path d="M6 14c0-5 4-9 8-9 3 0 5 2 5 5 0 5-5 9-9 9-2.500 0-4-2-4-5z"/><path d="M11 11.500h.100M14.500 9.500h.100M11.500 15h.100"/>',
    fruits: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c2-4 5-7 9-9"/>',
    legumes: '<path d="M7 4c7 0 12 5 12 12 0 2-1.500 4-4 4-5.500 0-10-4.500-10-10 0-3 0-6 2-6z"/><circle cx="10" cy="10" r="1.200"/><circle cx="14" cy="14.500" r="1.200"/>',
    oils: '<path d="M12 3.500c3.500 4.300 6 7.500 6 10.800A6 6 0 0 1 6 14.300c0-3.300 2.500-6.500 6-10.800z"/>',
    biofortified: '<path d="M12 21v-8M12 13c0-4-2.500-6.500-7-6.500 0 4 2.500 6.500 7 6.500zM12 10c0-3.500 2.300-5.800 6.500-5.800 0 3.700-2.300 5.800-6.500 5.800z"/>',
    drop: '<path d="M12 3.500c3.500 4.300 6 7.500 6 10.800A6 6 0 0 1 6 14.300c0-3.300 2.500-6.500 6-10.800z"/>',
    heart: '<path d="M12 20s-7.500-4.600-7.500-10.200A4.300 4.300 0 0 1 12 7.200a4.300 4.300 0 0 1 7.500 2.600C19.500 15.400 12 20 12 20z"/>',
    kidney: '<path d="M14 4c-4.500 0-8 3.500-8 8s3 8 6.500 8c2.500 0 3.500-1.500 3.500-3s-2-2.500-2-5 3.500-2.500 3.500-5-1.500-3-3.500-3z"/>',
    bowl: '<path d="M4 11h16a8 8 0 0 1-16 0zM9 20h6M9 7c0-1.500 1.500-1.500 1.500-3M13.500 7c0-1.500 1.500-1.500 1.500-3"/>',
    scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.500 9.500a5 5 0 0 1 7 0M12 9v2.500"/>',
    child: '<circle cx="12" cy="7" r="3"/><path d="M7 20v-3a5 5 0 0 1 10 0v3"/>',
    people: '<circle cx="9" cy="8" r="3.200"/><path d="M3 20c0-3.300 2.700-5.500 6-5.500s6 2.200 6 5.500M16 5.200a3.200 3.200 0 0 1 0 5.800M21 20c0-2.600-1.500-4.500-3.800-5.200"/>',
    target: '<circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="4.500"/><circle cx="12" cy="12" r="1"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="m6 6 12 12M18 6 6 18"/>',
    pin: '<path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="m16 16 4 4"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra, id) {
    return '<header class="vm-card__head"><span class="vh-ico">' + ico(icon) + '</span><h3' + (id ? ' id="' + id + '"' : '') + '>' + esc(title) + '</h3>' + (extra || '') + '</header>';
  }
  function tags(list) { return '<ul class="vm-tags">' + list.map(function (x) { return '<li>' + esc(tr(x)) + '</li>'; }).join('') + '</ul>'; }
  function $(id) { return doc.getElementById(id); }
  function refocus(sel) { var el = root.querySelector(sel); if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } }

  /* ---- 5. Store ------------------------------------------------------------- */
  function filtered() {
    var q = state.q.trim().toLowerCase();
    return PRODUCTS.filter(function (p) {
      return (state.country === 'all' || p.country === state.country) && (state.cat === 'all' || p.cat === state.cat) &&
        (!q || p.name.toLowerCase().indexOf(q) >= 0 || (FR[p.name.toLowerCase()] || '').toLowerCase().indexOf(q) >= 0) &&
        (state.price === 'all' || (state.price === 'low' && p.price < 8) || (state.price === 'mid' && p.price >= 8 && p.price <= 15) || (state.price === 'high' && p.price > 15));
    });
  }
  function productsHtml() {
    var list = filtered();
    var count = '<p class="vm-count" role="status">' + esc(t('market.count', { n: list.length })) + '</p>';
    if (!list.length) {
      var none = state.country !== 'all' && !PRODUCTS.some(function (p) { return p.country === state.country; });
      return count + '<div class="vm-empty"><p>' + esc(none ? t('market.none.country', { country: cname(state.country) }) : t('market.none')) + '</p>' +
        (state.country !== 'all' ? '<button type="button" class="btn secondary" data-vm-act="showall">' + esc(t('market.showall')) + '</button>' : '') + '</div>';
    }
    return count + '<ul class="vm-products">' + list.map(function (p) {
      var open = state.open === p.id;
      return '<li class="vm-product product-card"><div class="vm-product__top"><span class="vm-product__ico">' + ico(p.cat) + '</span>' +
        '<div><h4>' + esc(tr(p.name)) + '</h4><small>' + ico('pin') + esc(cname(p.country)) + '</small></div></div>' + tags(p.tags) +
        '<p class="vm-price product-price">' + esc(money(p.price)) + '</p>' +
        '<div class="vm-actions"><button type="button" class="btn primary" data-vm-act="add" data-vm-id="' + p.id + '">' + esc(t('market.add')) + '</button>' +
        '<button type="button" class="btn secondary" data-vm-act="details" data-vm-id="' + p.id + '" aria-expanded="' + open + '">' + esc(t(open ? 'market.details.hide' : 'market.details')) + '</button></div>' +
        (open ? '<dl class="vm-detail"><div><dt>' + esc(t('market.d.origin')) + '</dt><dd>' + esc(cname(p.country)) + '</dd></div><div><dt>' + esc(t('market.d.category')) + '</dt><dd>' + esc(t('market.cat.' + p.cat)) + '</dd></div>' +
          '<div><dt>' + esc(t('market.d.price')) + '</dt><dd>' + esc(money(p.price)) + '</dd></div><div><dt>' + esc(t('market.d.trace')) + '</dt><dd>' + esc(t('market.d.trace.none')) + '</dd></div></dl>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function chipsHtml() {
    return CATS.map(function (c) {
      var on = state.cat === c;
      return '<button type="button" class="vm-chip store-tab' + (on ? ' active' : '') + '" data-vm-cat="' + c + '" aria-pressed="' + on + '">' + ico(c) + '<span>' + esc(t('market.cat.' + c)) + '</span></button>';
    }).join('');
  }
  function cartCount() { return state.cart.reduce(function (a, r) { return a + r.q; }, 0); }
  function cartTotal() { return state.cart.reduce(function (a, r) { return a + r.q * PRODUCTS[r.id].price; }, 0); }
  function cartHtml() {
    var n = cartCount();
    var h = head('cart', t('market.cart.title'), '<span class="pill vm-pillcount">' + esc(t('market.cart.items', { n: n })) + '</span>');
    if (!n) return h + '<div id="cartItems"><p class="vm-empty">' + esc(t('market.cart.empty')) + '</p></div><p id="cartTotal" hidden></p><p class="vm-note">' + ico('info') + '<span>' + esc(t('market.cart.note')) + '</span></p>';
    return h + '<ul id="cartItems" class="vm-cartlist">' + state.cart.map(function (r) {
      var p = PRODUCTS[r.id], nm = tr(p.name);
      return '<li class="cart-row"><div class="vm-cartlist__txt"><b>' + esc(nm) + '</b><small>' + esc(money(p.price)) + '</small></div>' +
        '<div class="vm-qty"><button type="button" data-vm-act="less" data-vm-id="' + p.id + '" aria-label="' + esc(t('market.cart.less', { name: nm })) + '">' + ico('minus') + '</button>' +
        '<output aria-label="' + esc(t('market.cart.qty')) + '">' + r.q + '</output>' +
        '<button type="button" data-vm-act="more" data-vm-id="' + p.id + '" aria-label="' + esc(t('market.cart.more', { name: nm })) + '">' + ico('plus') + '</button>' +
        '<button type="button" class="vm-qty__rm" data-vm-act="remove" data-vm-id="' + p.id + '" aria-label="' + esc(t('market.cart.remove', { name: nm })) + '">' + ico('x') + '</button></div></li>';
    }).join('') + '</ul>' +
      '<p class="vm-total"><span>' + esc(t('market.cart.total')) + '</span><b id="cartTotal">' + esc(money(cartTotal())) + '</b></p>' +
      '<p class="vm-note">' + ico('info') + '<span>' + esc(t('market.cart.note')) + '</span></p>' +
      '<div class="vm-actions"><button type="button" class="btn primary" data-vm-act="checkout">' + esc(t('market.cart.checkout')) + '</button>' +
      '<button type="button" class="btn secondary" data-vm-act="clear">' + esc(t('market.cart.clear')) + '</button></div>';
  }
  function storeHtml() {
    var cs = codes();
    return '<section class="card vm-store general-store-extension" id="generalHealthyStore" aria-labelledby="vmStoreTitle">' +
      '<span class="pill vm-pill">' + esc(t('market.store.pill')) + '</span>' + head('store', t('market.store.title'), '', 'vmStoreTitle') +
      '<div class="vm-filters">' +
        '<label class="vm-field"><span>' + esc(t('market.f.country')) + '</span><select id="generalStoreCountry"><option value="all"' + (state.country === 'all' ? ' selected' : '') + '>' + esc(t('market.f.all')) + '</option>' +
          cs.map(function (c) { return '<option value="' + c + '"' + (c === state.country ? ' selected' : '') + '>' + esc(cname(c)) + '</option>'; }).join('') + '</select></label>' +
        '<label class="vm-field"><span>' + esc(t('market.f.search')) + '</span><input id="generalStoreSearch" type="search" autocomplete="off" maxlength="60" placeholder="' + esc(t('market.f.search.ph')) + '" value="' + esc(state.q) + '"></label>' +
        '<label class="vm-field"><span>' + esc(t('market.f.price')) + '</span><select id="generalStorePrice">' + PRICES.map(function (p) {
          return '<option value="' + p + '"' + (p === state.price ? ' selected' : '') + '>' + esc(t('market.price.' + p)) + '</option>'; }).join('') + '</select></label>' +
      '</div><div class="vm-chips healthy-store-tabs" id="vmChips" role="group" aria-label="' + esc(t('market.cats')) + '">' + chipsHtml() + '</div>' +
      '<div id="generalHealthyProducts" class="vm-results">' + productsHtml() + '</div></section>' +
      '<section class="card vm-cart" id="vmCart" aria-label="' + esc(t('market.cart.title')) + '">' + cartHtml() + '</section>';
  }

  /* ---- 6. Health context ---------------------------------------------------- */
  function foods() { return FOODS[state.ctxCountry] || FOODS['default']; }
  function foodsHtml() {
    return '<ul class="vm-products">' + foods().map(function (f, i) {
      var inPlan = state.plan.indexOf(f[0]) >= 0;
      return '<li class="vm-product product-card"><div class="vm-product__top"><span class="vm-product__ico">' + ico(f[1]) + '</span><div><h4>' + esc(tr(f[0])) + '</h4>' +
        '<small>' + esc(f[2].split(' • ').map(tr).join(' · ')) + '</small></div></div>' +
        '<div class="vm-actions"><button type="button" class="btn ' + (inPlan ? 'secondary' : 'primary') + '" data-vm-act="plan" data-vm-food="' + i + '" aria-pressed="' + inPlan + '">' +
        (inPlan ? ico('check') : '') + esc(t(inPlan ? 'market.food.added' : 'market.food.add')) + '</button></div></li>';
    }).join('') + '</ul>';
  }
  function reviewHtml() {
    var n = state.plan.length;
    return head('people', t('market.review.title')) + '<p class="vm-sub">' + esc(t('market.review.sub')) + '</p>' +
      '<p class="vm-count" id="vmPlanCount" tabindex="-1">' + esc(n ? t('market.review.count', { n: n }) : t('market.review.empty')) + '</p>' +
      (n ? '<ul class="vm-plan">' + state.plan.map(function (name, i) {
        return '<li><span>' + esc(tr(name)) + '</span><button type="button" data-vm-act="unplan" data-vm-i="' + i + '" aria-label="' + esc(t('market.review.remove', { name: tr(name) })) + '">' + ico('x') + '</button></li>';
      }).join('') + '</ul>' : '') +
      (state.sent ? '<p class="vm-sent" role="status">' + ico('check') + '<span>' + esc(t('market.review.sent')) + '</span></p>' : '') +
      '<div class="vm-actions">' + (state.sent
        ? '<button type="button" class="btn primary" data-vm-act="network">' + esc(t('market.review.open')) + '</button>'
        : '<button type="button" class="btn primary" data-vm-act="review">' + esc(t('market.review.cta')) + '</button>') + '</div>';
  }
  function resultHtml() {
    var c = state.ctx, goals = CONTEXTS[c];
    return '<header class="vm-card__head"><span class="vh-ico">' + ico(CTX_ICON[c]) + '</span><h3 id="foodContextTitle" tabindex="-1">' + esc(t('market.c.' + c + '.t')) + '</h3>' +
        '<span id="foodSafetyBadge" class="pill vm-badge">' + esc(t('market.c.' + c + '.b')) + '</span></header>' +
      '<p id="foodContextDescription" class="vm-sub">' + esc(t('market.c.' + c + '.d')) + '</p>' +
      '<ol class="vm-path food-pathway" aria-label="' + esc(t('market.path')) + '"><li>' + esc(t('market.path.1')) + '</li><li id="foodPathCountry">' + esc(cname(state.ctxCountry)) + '</li><li>' + esc(t('market.path.3')) + '</li><li>' + esc(t('market.path.4')) + '</li><li>' + esc(t('market.path.5')) + '</li></ol>' +
      '<p class="vm-count">' + esc(t('market.foods.count', { n: foods().length, country: cname(state.ctxCountry) })) + '</p>' +
      '<div id="conditionProducts">' + foodsHtml() + '</div>';
  }
  function whyHtml() {
    return head('target', t('market.why.title')) + '<ul id="foodRationale" class="vm-goals">' + CONTEXTS[state.ctx].map(function (g) {
      return '<li class="rationale-item">' + ico('check') + '<b>' + esc(tr(g)) + '</b></li>'; }).join('') + '</ul>' +
      '<p class="vm-note">' + ico('info') + '<span>' + esc(t('market.why.note')) + '</span></p>';
  }
  function bridgeHtml() {
    function item(k, v) { return '<div class="bridge-item"><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>'; }
    return head('link', t('market.bridge.title')) + '<p class="vm-sub">' + esc(t('market.bridge.sub')) + '</p>' +
      '<dl id="patientFoodBridge" class="vm-bridge__items food-bridge">' + item(t('market.bridge.country'), cname(state.ctxCountry)) + item(t('market.bridge.context'), t('market.c.' + state.ctx)) + item(t('market.bridge.match'), t('market.bridge.match.v')) + '</dl>' +
      '<div class="vm-actions"><button type="button" class="btn secondary" data-vm-act="citizen">' + esc(t('market.bridge.open')) + '</button></div>';
  }
  function contextHtml() {
    var cs = codes();
    return '<section class="card vm-select clinical-market-selector" aria-labelledby="vmCtxTitle"><span class="pill vm-pill">' + esc(t('market.ctx.pill')) + '</span>' +
      '<div class="vm-select__head"><div><h3 id="vmCtxTitle">' + esc(t('market.ctx.title')) + '</h3><p class="vm-sub">' + esc(t('market.ctx.sub')) + '</p></div>' +
      '<label class="vm-field"><span>' + esc(t('market.ctx.country')) + '</span><select id="clinicalFoodCountry">' + cs.map(function (c) {
        return '<option value="' + c + '"' + (c === state.ctxCountry ? ' selected' : '') + '>' + esc(cname(c)) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="vm-conditions condition-grid" role="group" aria-label="' + esc(t('market.ctx.list')) + '">' + Object.keys(CONTEXTS).map(function (c) {
        var on = state.ctx === c;
        return '<button type="button" class="vm-condition condition-card' + (on ? ' active' : '') + '" data-condition="' + c + '" aria-pressed="' + on + '"><span class="vm-condition__ico">' + ico(CTX_ICON[c]) + '</span>' +
          '<b>' + esc(t('market.c.' + c)) + '</b><small>' + esc(t('market.c.' + c + '.s')) + '</small></button>'; }).join('') + '</div></section>' +
      '<section class="card vm-result" id="vmResult" aria-labelledby="foodContextTitle">' + resultHtml() + '</section>' +
      '<section class="card vm-why" id="vmWhy">' + whyHtml() + '</section>' +
      '<section class="card vm-review" id="vmReview">' + reviewHtml() + '</section>' +
      '<section class="card vm-bridge" id="vmBridge">' + bridgeHtml() + '</section>';
  }

  /* ---- 7. Render ------------------------------------------------------------ */
  function tabBtn(id, icon) {
    var on = state.tab === id;
    return '<button type="button" role="tab" id="vmTab-' + id + '" class="vm-tab' + (on ? ' is-on' : '') + '" data-vm-tab="' + id + '" aria-selected="' + on + '" aria-controls="vmPanel-' + id + '" tabindex="' + (on ? 0 : -1) + '">' + ico(icon) + '<span>' + esc(t('market.tab.' + id)) + '</span></button>';
  }
  function render() {
    root.innerHTML = '<div class="vm">' +
      '<section class="card vm-hero"><div class="vh-head"><div class="vm-hero__title"><span class="vh-ico">' + ico('store') + '</span><div><h2>' + esc(t('market.title')) + '</h2>' +
        '<p class="vm-sub">' + esc(t('market.sub')) + '</p></div></div><span class="pill vm-demo">' + esc(t('market.demo')) + '</span></div>' +
        '<div class="vm-tabs" role="tablist" aria-label="' + esc(t('market.tabs')) + '">' + tabBtn('store', 'store') + tabBtn('context', 'target') + '</div></section>' +
      '<div class="vm-panel vm-panel--store" id="vmPanel-store" role="tabpanel" aria-labelledby="vmTab-store"' + (state.tab === 'store' ? '' : ' hidden') + '>' + storeHtml() + '</div>' +
      '<div class="vm-panel vm-panel--context" id="vmPanel-context" role="tabpanel" aria-labelledby="vmTab-context"' + (state.tab === 'context' ? '' : ' hidden') + '>' + contextHtml() + '</div></div>';
  }
  function paint(id, html) { var el = $(id); if (el) el.innerHTML = html; else render(); }
  function paintProducts() { paint('generalHealthyProducts', productsHtml()); }
  function paintCart() { paint('vmCart', cartHtml()); }
  function paintContext() {
    paint('vmResult', resultHtml()); paint('vmWhy', whyHtml()); paint('vmReview', reviewHtml()); paint('vmBridge', bridgeHtml());
    var btns = root.querySelectorAll('.vm-condition');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-condition') === state.ctx;
      btns[i].classList.toggle('active', on); btns[i].setAttribute('aria-pressed', String(on));
    }
  }
  function setTab(id, focus) {
    if (id !== 'store' && id !== 'context') return;
    state.tab = id; render();
    if (focus) refocus('#vmTab-' + id);
  }

  /* ---- 8. Actions ----------------------------------------------------------- */
  function setCat(c) {
    if (CATS.indexOf(c) < 0) return;
    state.cat = c; paint('vmChips', chipsHtml()); paintProducts();
  }
  function add(p, quiet) {
    if (!p) return false;
    var row = null;
    state.cart.forEach(function (r) { if (r.id === p.id) row = r; });
    if (row) row.q = Math.min(99, row.q + 1); else state.cart.push({ id: p.id, q: 1 });
    saveCart(); paintCart();
    if (!quiet) notify(t('market.toast.add', { name: tr(p.name) }));
    return true;
  }
  function changeQty(id, d) {
    state.cart = state.cart.filter(function (r) { if (r.id === id) r.q = d === 0 ? 0 : Math.min(99, r.q + d); return r.q > 0; });
    saveCart(); paintCart();
  }
  function checkout() {
    if (!state.cart.length) { notify(t('market.cart.need')); return false; }
    var pay = global.NutriBentoViews && global.NutriBentoViews.payments;
    if (pay && pay.setOrder) pay.setOrder(cartTotal());
    else if (typeof global.renderPayments === 'function') global.renderPayments(headerCountry());
    nav('payments');
    notify(t('market.toast.checkout'));
    return true;
  }
  function selectContext(c) {
    if (!CONTEXTS[c]) return;
    state.ctx = c; state.sent = false; paintContext();
  }
  function planToggle(name) {
    var i = state.plan.indexOf(name);
    if (i >= 0) state.plan.splice(i, 1); else { state.plan.push(name); notify(t('market.toast.food', { name: tr(name) })); }
    state.sent = false;
    paint('conditionProducts', foodsHtml()); paint('vmReview', reviewHtml());
  }
  function review() {
    if (!state.plan.length) { notify(t('market.review.need')); refocus('#vmPlanCount'); return false; }
    state.sent = true; paint('vmReview', reviewHtml()); refocus('#vmReview [data-vm-act="network"]');
    return true;
  }
  function syncStore() {
    var c = $('generalStoreCountry'), s = $('generalStoreSearch'), p = $('generalStorePrice');
    if (c && (c.value === 'all' || codes().indexOf(c.value) >= 0)) state.country = c.value;
    if (s) state.q = s.value.slice(0, 60);
    if (p && PRICES.indexOf(p.value) >= 0) state.price = p.value;
  }

  root.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-vm-tab],[data-vm-cat],[data-condition],[data-vm-act]');
    if (!el || !root.contains(el)) return;
    if (el.hasAttribute('data-vm-tab')) { setTab(el.getAttribute('data-vm-tab'), true); return; }
    if (el.hasAttribute('data-vm-cat')) { var c = el.getAttribute('data-vm-cat'); setCat(c); refocus('[data-vm-cat="' + c + '"]'); return; }
    if (el.hasAttribute('data-condition')) { selectContext(el.getAttribute('data-condition')); return; }
    var act = el.getAttribute('data-vm-act'), id = Number(el.getAttribute('data-vm-id'));
    if (act === 'add') add(PRODUCTS[id]);
    else if (act === 'details') { state.open = state.open === id ? -1 : id; paintProducts(); refocus('[data-vm-act="details"][data-vm-id="' + id + '"]'); }
    else if (act === 'showall') { state.country = 'all'; var s = $('generalStoreCountry'); if (s) s.value = 'all'; paintProducts(); refocus('#generalStoreCountry'); }
    else if (act === 'less' || act === 'more') { changeQty(id, act === 'more' ? 1 : -1); refocus('[data-vm-act="' + act + '"][data-vm-id="' + id + '"]'); if (!root.contains(doc.activeElement)) refocus('#vmCart h3'); }
    else if (act === 'remove') { changeQty(id, 0); }
    else if (act === 'clear') { state.cart = []; saveCart(); paintCart(); }
    else if (act === 'checkout') checkout();
    else if (act === 'plan') { var f = foods()[Number(el.getAttribute('data-vm-food'))]; if (f) { planToggle(f[0]); refocus('[data-vm-food="' + el.getAttribute('data-vm-food') + '"]'); } }
    else if (act === 'unplan') { var nm = state.plan[Number(el.getAttribute('data-vm-i'))]; if (nm) { planToggle(nm); refocus('#vmPlanCount'); } }
    else if (act === 'review') review();
    else if (act === 'network') nav('network');
    else if (act === 'citizen') nav('citizen');
  });
  root.addEventListener('keydown', function (ev) {
    if (!ev.target.closest || !ev.target.closest('[data-vm-tab]')) return;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); setTab(state.tab === 'store' ? 'context' : 'store', true); }
  });
  root.addEventListener('input', function (ev) { if (ev.target.id === 'generalStoreSearch') { syncStore(); paintProducts(); } });
  root.addEventListener('change', function (ev) {
    var id = ev.target.id;
    if (id === 'generalStoreCountry' || id === 'generalStorePrice') { syncStore(); paintProducts(); }
    else if (id === 'clinicalFoodCountry' && codes().indexOf(ev.target.value) >= 0) { state.ctxCountry = ev.target.value; state.plan = []; state.sent = false; paintContext(); }
  });
  root.addEventListener('submit', function (ev) { ev.preventDefault(); });
  doc.addEventListener('nutri:countryChanged', function () { state.country = headerCountry(); state.ctxCountry = headerCountry(); state.plan = []; state.sent = false; state.open = -1; render(); });

  /* ---- 9. Legacy API (index.html delegates its old functions here) ----------- */
  var api = {
    render: render, setTab: setTab,
    populateGeneralStoreCountry: function () { state.country = headerCountry(); render(); },
    selectGeneralCategory: function (c) { setCat(c); },
    renderGeneralHealthyStore: function () { syncStore(); paintProducts(); },
    renderPatientFoodBridge: function () { paint('vmBridge', bridgeHtml()); },
    populateClinicalFoodCountry: function () { state.ctxCountry = headerCountry(); render(); },
    selectFoodContext: function (c) { selectContext(c); },
    renderClinicalFood: function () { var e = $('clinicalFoodCountry'); if (e && codes().indexOf(e.value) >= 0 && e.value !== state.ctxCountry) { state.ctxCountry = e.value; state.plan = []; state.sent = false; } paintContext(); },
    recommendClinicalFood: function (name) { var ok = foods().some(function (f) { return f[0] === name; }); if (ok && state.plan.indexOf(name) < 0) planToggle(name); return ok; },
    viewClinicalFood: function () { notify(t('market.nodetail')); },
    requestNutritionistReview: review,
    addToCart: function (name) { return add(byName(name)); },
    renderCart: paintCart,
    viewProduct: function (name) { var p = byName(name); if (!p) return false; state.open = p.id; paintProducts(); return true; },
    checkoutMarket: checkout,
    untranslated: function () { return Object.keys(missing); },
    state: function () {
      return { tab: state.tab, country: state.country, cat: state.cat, q: state.q, price: state.price, shown: filtered().length, items: cartCount(), total: Math.round(cartTotal() * 100) / 100,
        ctx: state.ctx, ctxCountry: state.ctxCountry, plan: state.plan.slice(), sent: state.sent };
    }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.marketplace = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'marketplace');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { state.country = headerCountry(); state.ctxCountry = headerCountry(); render(); });
  I18N.onChange(function () { syncStore(); render(); });
})(window);
