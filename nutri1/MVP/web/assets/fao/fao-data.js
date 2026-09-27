/* ============================================================================
   NUTRI.N°1 — FAO · FOOD SYSTEMS INTELLIGENCE · AFRIQUE DE L'OUEST
   fao-data.js — Jeu de données institutionnel harmonisé FAO / CILSS / CEDEAO
   Couleurs exclusives FAO :
     Primaire: #059669 | Secondaire: #D97706 | Tertiaire: #0891B2
     Quaternaire: #7C3AED | Danger: #DC2626 | Fond sidebar: #052E16
     Fond global: #F0FDF4 | Bordure cards: #BBF7D0 | Accent KPI: #059669 → #10B981
   ============================================================================ */

(function (root) {
  "use strict";

  var FAO_DATA = {
    meta: {
      institution: "FAO",
      title: "Food Systems Intelligence · Afrique de l'Ouest",
      region: "Afrique de l'Ouest (CEDEAO + Mauritanie / CILSS)",
      year: 2024,
      source: "FAOSTAT / GIEWS / Food Balance Sheets / CEDEAO ECOAGRIS 2024"
    },

    colors: {
      primary: "#059669",
      secondary: "#D97706",
      tertiary: "#0891B2",
      quaternary: "#7C3AED",
      danger: "#DC2626",
      warning: "#F59E0B",
      sidebar: "#052E16",
      bg: "#F0FDF4",
      border: "#BBF7D0",
      kpiStart: "#059669",
      kpiEnd: "#10B981",
      crops: {
        mil: "#059669",
        mais: "#D97706",
        riz: "#0891B2",
        sorgho: "#10B981",
        haricots: "#7C3AED",
        fonio: "#EAB308",
        arachide: "#B45309",
        niebe: "#047857",
        manioc: "#64748B",
        autres: "#94A3B8"
      }
    },

    // 5 KPIs FAO
    kpis: {
      production: {
        val: "52.4M t",
        numVal: 52.4,
        unit: "Mt",
        label: "Production céréalière 2024",
        sublabel: "Afrique de l'Ouest totale",
        badge: "↑ +4.1% vs 2023",
        badgeType: "good",
        color: "#059669",
        miniCrops: [
          { name: "Maïs", val: 16.2, color: "#D97706" },
          { name: "Mil", val: 14.8, color: "#059669" },
          { name: "Riz", val: 10.4, color: "#0891B2" },
          { name: "Sorgho", val: 7.8, color: "#10B981" },
          { name: "Haricots", val: 2.4, color: "#7C3AED" },
          { name: "Fonio", val: 0.8, color: "#EAB308" }
        ]
      },
      pertes: {
        val: "22%",
        numVal: 22,
        unit: "%",
        label: "Pertes post-récolte",
        sublabel: "= 11.5M tonnes perdues",
        valUsd: "3.4 Milliards USD",
        badge: "Urgence chaîne de valeur",
        badgeType: "bad",
        color: "#DC2626",
        gauge: { current: 22, max: 100, target: 10 }
      },
      hdds: {
        val: "4.2 / 12",
        numVal: 4.2,
        unit: "/12",
        label: "Score HDDS régional",
        sublabel: "Diversité alimentaire ménages",
        target: "Objectif OMS : ≥ 6 groupes",
        status: "Insuffisant",
        badge: "Déficit nutritionnel",
        badgeType: "warn",
        color: "#D97706",
        gauge: { current: 4.2, max: 12, target: 6.0 }
      },
      fortification: {
        val: "3 aliments",
        numVal: 3,
        targetTotal: 5,
        unit: "sur 5",
        label: "Couverture fortification",
        sublabel: "Sel iodé 89% | Farine 61% | Huile 45%",
        badge: "Cadre harmonisé CEDEAO",
        badgeType: "good",
        color: "#059669",
        items: [
          { name: "Sel iodé", pct: 89, color: "#059669" },
          { name: "Farine de blé", pct: 61, color: "#D97706" },
          { name: "Huile Vit. A", pct: 45, color: "#DC2626" }
        ]
      },
      biodiversite: {
        val: "6,200",
        numVal: 6200,
        total: 30000,
        unit: "espèces",
        label: "Biodiversité alimentaire",
        sublabel: "6,200 espèces cultivées documentées sur 30,000 comestibles",
        badge: "Potentiel sous-exploité",
        badgeType: "warn",
        color: "#0891B2",
        donut: [
          { label: "Cultivées", val: 6200, color: "#059669" },
          { label: "Perdues / Menacées", val: 4800, color: "#DC2626" },
          { label: "Inconnues / Sous-exploitées", val: 19000, color: "#94A3B8" }
        ]
      }
    },

    // 14 Pays FAO avec toutes les données requises
    countries: [
      { id: "NER", name: "Niger", prod: 4.8, besoin: 6.1, deficit: 1.3, auto: 78.7, pertes: 28, hdds: 3.8, fort: 45, revenus: 320, rank: 14, pop: 26.2 },
      { id: "MLI", name: "Mali", prod: 11.2, besoin: 9.8, deficit: -1.4, auto: 114.3, pertes: 22, hdds: 4.1, fort: 52, revenus: 480, rank: 13, pop: 22.6 },
      { id: "BFA", name: "Burkina Faso", prod: 6.7, besoin: 7.2, deficit: 0.5, auto: 93.1, pertes: 25, hdds: 4.4, fort: 61, revenus: 420, rank: 10, pop: 22.7 },
      { id: "SEN", name: "Sénégal", prod: 3.2, besoin: 4.8, deficit: 1.6, auto: 66.7, pertes: 18, hdds: 5.2, fort: 71, revenus: 720, rank: 6, pop: 17.3 },
      { id: "NGA", name: "Nigeria", prod: 18.4, besoin: 22.1, deficit: 3.7, auto: 83.3, pertes: 20, hdds: 5.8, fort: 63, revenus: 850, rank: 3, pop: 218.5 },
      { id: "GHA", name: "Ghana", prod: 4.1, besoin: 3.8, deficit: -0.3, auto: 107.9, pertes: 14, hdds: 6.1, fort: 74, revenus: 980, rank: 1, pop: 33.5 },
      { id: "CIV", name: "Côte d'Ivoire", prod: 3.8, besoin: 4.2, deficit: 0.4, auto: 90.5, pertes: 17, hdds: 5.9, fort: 68, revenus: 890, rank: 2, pop: 28.2 },
      { id: "MRT", name: "Mauritanie", prod: 0.5, besoin: 1.4, deficit: 0.9, auto: 35.7, pertes: 16, hdds: 4.2, fort: 58, revenus: 640, rank: 12, pop: 4.7 },
      { id: "SLE", name: "Sierra Leone", prod: 1.5, besoin: 2.1, deficit: 0.6, auto: 71.4, pertes: 24, hdds: 4.8, fort: 50, revenus: 410, rank: 8, pop: 8.6 },
      { id: "LBR", name: "Liberia", prod: 0.4, besoin: 1.1, deficit: 0.7, auto: 36.4, pertes: 26, hdds: 4.6, fort: 48, revenus: 390, rank: 9, pop: 5.3 },
      { id: "GNB", name: "Guinée-Bissau", prod: 0.3, besoin: 0.6, deficit: 0.3, auto: 50.0, pertes: 21, hdds: 4.3, fort: 44, revenus: 430, rank: 11, pop: 2.1 },
      { id: "GMB", name: "Gambie", prod: 0.2, besoin: 0.5, deficit: 0.3, auto: 40.0, pertes: 19, hdds: 5.1, fort: 62, revenus: 560, rank: 7, pop: 2.7 },
      { id: "BEN", name: "Bénin", prod: 2.1, besoin: 2.5, deficit: 0.4, auto: 84.0, pertes: 23, hdds: 5.3, fort: 65, revenus: 610, rank: 5, pop: 13.4 },
      { id: "TGO", name: "Togo", prod: 1.4, besoin: 1.6, deficit: 0.2, auto: 87.5, pertes: 20, hdds: 5.0, fort: 59, revenus: 540, rank: 7, pop: 8.8 }
    ],

    // Graphique 1 : 12 pays pour grouped bar + gap chart
    g1Data: [
      { name: "Niger", code: "NER", prod: 4.8, besoin: 6.1, deficit: 1.3, surplus: 0, auto: 78.7 },
      { name: "Mali", code: "MLI", prod: 11.2, besoin: 9.8, deficit: 0, surplus: 1.4, auto: 114.3 },
      { name: "Burkina", code: "BFA", prod: 6.7, besoin: 7.2, deficit: 0.5, surplus: 0, auto: 93.1 },
      { name: "Sénégal", code: "SEN", prod: 3.2, besoin: 4.8, deficit: 1.6, surplus: 0, auto: 66.7 },
      { name: "Nigeria", code: "NGA", prod: 18.4, besoin: 22.1, deficit: 3.7, surplus: 0, auto: 83.3 },
      { name: "Ghana", code: "GHA", prod: 4.1, besoin: 3.8, deficit: 0, surplus: 0.3, auto: 107.9 },
      { name: "C. d'Ivoire", code: "CIV", prod: 3.8, besoin: 4.2, deficit: 0.4, surplus: 0, auto: 90.5 },
      { name: "Bénin", code: "BEN", prod: 2.1, besoin: 2.5, deficit: 0.4, surplus: 0, auto: 84.0 },
      { name: "Togo", code: "TGO", prod: 1.4, besoin: 1.6, deficit: 0.2, surplus: 0, auto: 87.5 },
      { name: "Guinée", code: "GIN", prod: 3.6, besoin: 4.1, deficit: 0.5, surplus: 0, auto: 87.8 },
      { name: "Mauritanie", code: "MRT", prod: 0.5, besoin: 1.4, deficit: 0.9, surplus: 0, auto: 35.7 },
      { name: "Sierra Leone", code: "SLE", prod: 1.5, besoin: 2.1, deficit: 0.6, surplus: 0, auto: 71.4 }
    ],

    // Graphique 2 : Matrice Nutritive (18 aliments x 8 nutriments)
    g2Nutrients: [
      { key: "energie", label: "Énergie", unit: "kcal", max: 600, rda: 2000 },
      { key: "proteines", label: "Protéines", unit: "g", max: 60, rda: 50 },
      { key: "fer", label: "Fer", unit: "mg", max: 30, rda: 18 },
      { key: "zinc", label: "Zinc", unit: "mg", max: 8, rda: 11 },
      { key: "vitA", label: "Vit. A", unit: "μg", max: 1200, rda: 800 },
      { key: "vitC", label: "Vit. C", unit: "mg", max: 180, rda: 90 },
      { key: "calcium", label: "Calcium", unit: "mg", max: 500, rda: 1000 },
      { key: "folate", label: "Folate", unit: "μg", max: 400, rda: 400 }
    ],
    g2Foods: [
      { name: "Moringa feuilles", super: true, score: 98, vals: { energie: 92, proteines: 9.4, fer: 28.2, zinc: 3.2, vitA: 1120, vitC: 173, calcium: 440, folate: 380 } },
      { name: "Poisson séché", super: false, score: 86, vals: { energie: 290, proteines: 62.0, fer: 5.6, zinc: 7.2, vitA: 140, vitC: 0, calcium: 480, folate: 65 } },
      { name: "Niébé", super: true, score: 84, vals: { energie: 336, proteines: 23.5, fer: 8.3, zinc: 3.4, vitA: 65, vitC: 4, calcium: 110, folate: 350 } },
      { name: "Feuilles baobab", super: false, score: 81, vals: { energie: 78, proteines: 3.8, fer: 11.4, zinc: 1.8, vitA: 890, vitC: 165, calcium: 360, folate: 120 } },
      { name: "Fonio", super: true, score: 79, vals: { energie: 350, proteines: 10.2, fer: 7.1, zinc: 3.8, vitA: 20, vitC: 0, calcium: 84, folate: 210 } },
      { name: "Sésame", super: false, score: 77, vals: { energie: 573, proteines: 17.7, fer: 14.6, zinc: 7.8, vitA: 30, vitC: 0, calcium: 490, folate: 97 } },
      { name: "Mil", super: false, score: 75, vals: { energie: 378, proteines: 11.8, fer: 8.3, zinc: 3.1, vitA: 40, vitC: 0, calcium: 42, folate: 85 } },
      { name: "Arachide", super: false, score: 74, vals: { energie: 567, proteines: 25.8, fer: 4.6, zinc: 3.3, vitA: 10, vitC: 0, calcium: 92, folate: 240 } },
      { name: "Haricots", super: false, score: 72, vals: { energie: 333, proteines: 21.0, fer: 7.0, zinc: 2.8, vitA: 20, vitC: 3, calcium: 120, folate: 280 } },
      { name: "Patate douce (orange)", super: false, score: 71, vals: { energie: 86, proteines: 1.6, fer: 0.6, zinc: 0.3, vitA: 960, vitC: 24, calcium: 30, folate: 52 } },
      { name: "Oeuf", super: false, score: 70, vals: { energie: 155, proteines: 13.0, fer: 1.8, zinc: 1.3, vitA: 160, vitC: 0, calcium: 50, folate: 47 } },
      { name: "Sorgho", super: false, score: 68, vals: { energie: 339, proteines: 11.3, fer: 4.4, zinc: 2.1, vitA: 25, vitC: 0, calcium: 28, folate: 40 } },
      { name: "Viande bovine", super: false, score: 67, vals: { energie: 250, proteines: 26.0, fer: 2.6, zinc: 4.8, vitA: 15, vitC: 0, calcium: 18, folate: 12 } },
      { name: "Lait caillé", super: false, score: 65, vals: { energie: 61, proteines: 3.5, fer: 0.1, zinc: 0.4, vitA: 28, vitC: 1, calcium: 120, folate: 18 } },
      { name: "Maïs", super: false, score: 62, vals: { energie: 365, proteines: 9.4, fer: 2.7, zinc: 2.2, vitA: 45, vitC: 0, calcium: 7, folate: 25 } },
      { name: "Gombo", super: false, score: 60, vals: { energie: 33, proteines: 1.9, fer: 0.8, zinc: 0.4, vitA: 36, vitC: 23, calcium: 82, folate: 60 } },
      { name: "Banane plantain", super: false, score: 55, vals: { energie: 122, proteines: 1.3, fer: 0.6, zinc: 0.2, vitA: 55, vitC: 18, calcium: 15, folate: 22 } },
      { name: "Manioc", super: false, score: 48, vals: { energie: 160, proteines: 1.4, fer: 0.3, zinc: 0.3, vitA: 8, vitC: 21, calcium: 16, folate: 27 } }
    ],

    // Graphique 3 : Calendrier Gantt avec météo et malnutrition
    g3Months: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
    g3Activities: {
      prepa: { label: "Préparation sol", color: "#FEF3C7" },
      semis: { label: "Semis", color: "#BBF7D0" },
      croissance: { label: "Croissance", color: "rgba(5, 150, 105, 0.6)" },
      recolte: { label: "Récolte", color: "#D97706" },
      stockage: { label: "Stockage", color: "#92400E" }
    },
    g3Countries: {
      "NER": {
        name: "Niger (Sahel)",
        rain: [0, 1, 3, 10, 25, 60, 140, 180, 85, 15, 0, 0],
        malnutrition: [28, 30, 35, 48, 68, 85, 92, 88, 62, 40, 32, 29],
        crops: [
          { name: "Mil tardif", segs: [{ a: "prepa", s: 3.5, e: 4.8 }, { a: "semis", s: 4.8, e: 5.5 }, { a: "croissance", s: 5.5, e: 8.5 }, { a: "recolte", s: 8.5, e: 9.8 }, { a: "stockage", s: 9.8, e: 12.0 }] },
          { name: "Mil hâtif", segs: [{ a: "prepa", s: 4.0, e: 5.0 }, { a: "semis", s: 5.0, e: 5.6 }, { a: "croissance", s: 5.6, e: 7.8 }, { a: "recolte", s: 7.8, e: 8.8 }, { a: "stockage", s: 8.8, e: 11.5 }] },
          { name: "Sorgho", segs: [{ a: "prepa", s: 4.2, e: 5.2 }, { a: "semis", s: 5.2, e: 5.8 }, { a: "croissance", s: 5.8, e: 9.0 }, { a: "recolte", s: 9.0, e: 10.2 }, { a: "stockage", s: 10.2, e: 12.0 }] },
          { name: "Niébé", segs: [{ a: "prepa", s: 4.5, e: 5.5 }, { a: "semis", s: 5.5, e: 6.0 }, { a: "croissance", s: 6.0, e: 8.2 }, { a: "recolte", s: 8.2, e: 9.2 }, { a: "stockage", s: 9.2, e: 11.0 }] },
          { name: "Arachide", segs: [{ a: "prepa", s: 4.5, e: 5.3 }, { a: "semis", s: 5.3, e: 5.9 }, { a: "croissance", s: 5.9, e: 8.6 }, { a: "recolte", s: 8.6, e: 9.8 }, { a: "stockage", s: 9.8, e: 11.5 }] },
          { name: "Maïs pluvial", segs: [{ a: "prepa", s: 4.8, e: 5.6 }, { a: "semis", s: 5.6, e: 6.1 }, { a: "croissance", s: 6.1, e: 8.8 }, { a: "recolte", s: 8.8, e: 9.8 }, { a: "stockage", s: 9.8, e: 11.8 }] },
          { name: "Fonio", segs: [{ a: "prepa", s: 4.6, e: 5.4 }, { a: "semis", s: 5.4, e: 5.9 }, { a: "croissance", s: 5.9, e: 7.8 }, { a: "recolte", s: 7.8, e: 8.6 }, { a: "stockage", s: 8.6, e: 10.5 }] },
          { name: "Riz irrigué (S1)", segs: [{ a: "prepa", s: 0.2, e: 1.0 }, { a: "semis", s: 1.0, e: 1.6 }, { a: "croissance", s: 1.6, e: 4.5 }, { a: "recolte", s: 4.5, e: 5.5 }, { a: "stockage", s: 5.5, e: 7.0 }] },
          { name: "Riz pluvial (S2)", segs: [{ a: "prepa", s: 5.0, e: 6.0 }, { a: "semis", s: 6.0, e: 6.5 }, { a: "croissance", s: 6.5, e: 9.5 }, { a: "recolte", s: 9.5, e: 10.8 }, { a: "stockage", s: 10.8, e: 12.0 }] },
          { name: "Maraîchage contre-saison", segs: [{ a: "prepa", s: 9.5, e: 10.2 }, { a: "semis", s: 10.2, e: 10.8 }, { a: "croissance", s: 10.8, e: 12.0 }, { a: "recolte", s: 0.0, e: 2.8 }, { a: "stockage", s: 2.8, e: 4.0 }] }
        ]
      },
      "MLI": {
        name: "Mali",
        rain: [0, 0, 5, 20, 50, 110, 195, 240, 130, 30, 2, 0],
        malnutrition: [25, 28, 32, 44, 62, 78, 88, 82, 58, 36, 28, 25],
        crops: [
          { name: "Mil tardif", segs: [{ a: "prepa", s: 3.8, e: 4.9 }, { a: "semis", s: 4.9, e: 5.6 }, { a: "croissance", s: 5.6, e: 8.8 }, { a: "recolte", s: 8.8, e: 10.0 }, { a: "stockage", s: 10.0, e: 12.0 }] },
          { name: "Sorgho", segs: [{ a: "prepa", s: 4.0, e: 5.0 }, { a: "semis", s: 5.0, e: 5.7 }, { a: "croissance", s: 5.7, e: 9.2 }, { a: "recolte", s: 9.2, e: 10.4 }, { a: "stockage", s: 10.4, e: 12.0 }] },
          { name: "Maïs", segs: [{ a: "prepa", s: 4.5, e: 5.3 }, { a: "semis", s: 5.3, e: 5.9 }, { a: "croissance", s: 5.9, e: 8.8 }, { a: "recolte", s: 8.8, e: 9.8 }, { a: "stockage", s: 9.8, e: 12.0 }] },
          { name: "Riz pluvial", segs: [{ a: "prepa", s: 4.8, e: 5.6 }, { a: "semis", s: 5.6, e: 6.2 }, { a: "croissance", s: 6.2, e: 9.6 }, { a: "recolte", s: 9.6, e: 10.8 }, { a: "stockage", s: 10.8, e: 12.0 }] },
          { name: "Niébé", segs: [{ a: "prepa", s: 4.6, e: 5.4 }, { a: "semis", s: 5.4, e: 6.0 }, { a: "croissance", s: 6.0, e: 8.3 }, { a: "recolte", s: 8.3, e: 9.2 }, { a: "stockage", s: 9.2, e: 11.0 }] },
          { name: "Arachide", segs: [{ a: "prepa", s: 4.4, e: 5.2 }, { a: "semis", s: 5.2, e: 5.8 }, { a: "croissance", s: 5.8, e: 8.7 }, { a: "recolte", s: 8.7, e: 9.9 }, { a: "stockage", s: 9.9, e: 11.5 }] },
          { name: "Fonio", segs: [{ a: "prepa", s: 4.5, e: 5.3 }, { a: "semis", s: 5.3, e: 5.8 }, { a: "croissance", s: 5.8, e: 7.8 }, { a: "recolte", s: 7.8, e: 8.7 }, { a: "stockage", s: 8.7, e: 10.5 }] },
          { name: "Manioc", segs: [{ a: "prepa", s: 3.5, e: 4.5 }, { a: "semis", s: 4.5, e: 5.5 }, { a: "croissance", s: 5.5, e: 11.5 }, { a: "recolte", s: 11.5, e: 12.0 }, { a: "stockage", s: 0.0, e: 2.0 }] },
          { name: "Igname", segs: [{ a: "prepa", s: 2.5, e: 3.5 }, { a: "semis", s: 3.5, e: 4.5 }, { a: "croissance", s: 4.5, e: 10.0 }, { a: "recolte", s: 10.0, e: 11.5 }, { a: "stockage", s: 11.5, e: 12.0 }] },
          { name: "Maraîchage", segs: [{ a: "prepa", s: 9.6, e: 10.4 }, { a: "semis", s: 10.4, e: 11.0 }, { a: "croissance", s: 11.0, e: 12.0 }, { a: "recolte", s: 0.0, e: 3.0 }, { a: "stockage", s: 3.0, e: 4.5 }] }
        ]
      },
      "BFA": {
        name: "Burkina Faso",
        rain: [1, 2, 8, 35, 75, 125, 210, 260, 150, 45, 5, 1],
        malnutrition: [26, 29, 34, 46, 65, 80, 89, 84, 60, 38, 30, 27],
        crops: [
          { name: "Sorgho blanc", segs: [{ a: "prepa", s: 4.0, e: 5.0 }, { a: "semis", s: 5.0, e: 5.7 }, { a: "croissance", s: 5.7, e: 9.2 }, { a: "recolte", s: 9.2, e: 10.5 }, { a: "stockage", s: 10.5, e: 12.0 }] },
          { name: "Mil pénicillaire", segs: [{ a: "prepa", s: 4.2, e: 5.1 }, { a: "semis", s: 5.1, e: 5.8 }, { a: "croissance", s: 5.8, e: 8.9 }, { a: "recolte", s: 8.9, e: 10.0 }, { a: "stockage", s: 10.0, e: 12.0 }] },
          { name: "Maïs", segs: [{ a: "prepa", s: 4.4, e: 5.2 }, { a: "semis", s: 5.2, e: 5.8 }, { a: "croissance", s: 5.8, e: 8.7 }, { a: "recolte", s: 8.7, e: 9.8 }, { a: "stockage", s: 9.8, e: 11.8 }] },
          { name: "Niébé", segs: [{ a: "prepa", s: 4.7, e: 5.5 }, { a: "semis", s: 5.5, e: 6.0 }, { a: "croissance", s: 6.0, e: 8.3 }, { a: "recolte", s: 8.3, e: 9.3 }, { a: "stockage", s: 9.3, e: 11.2 }] },
          { name: "Arachide", segs: [{ a: "prepa", s: 4.5, e: 5.3 }, { a: "semis", s: 5.3, e: 5.9 }, { a: "croissance", s: 5.9, e: 8.8 }, { a: "recolte", s: 8.8, e: 10.0 }, { a: "stockage", s: 10.0, e: 11.6 }] },
          { name: "Riz de bas-fond", segs: [{ a: "prepa", s: 5.0, e: 5.8 }, { a: "semis", s: 5.8, e: 6.4 }, { a: "croissance", s: 6.4, e: 9.8 }, { a: "recolte", s: 9.8, e: 11.0 }, { a: "stockage", s: 11.0, e: 12.0 }] },
          { name: "Sésame", segs: [{ a: "prepa", s: 5.2, e: 6.0 }, { a: "semis", s: 6.0, e: 6.5 }, { a: "croissance", s: 6.5, e: 9.2 }, { a: "recolte", s: 9.2, e: 10.2 }, { a: "stockage", s: 10.2, e: 11.5 }] },
          { name: "Fonio", segs: [{ a: "prepa", s: 4.6, e: 5.4 }, { a: "semis", s: 5.4, e: 5.9 }, { a: "croissance", s: 5.9, e: 8.0 }, { a: "recolte", s: 8.0, e: 8.8 }, { a: "stockage", s: 8.8, e: 10.8 }] },
          { name: "Igname", segs: [{ a: "prepa", s: 2.8, e: 3.8 }, { a: "semis", s: 3.8, e: 4.8 }, { a: "croissance", s: 4.8, e: 10.2 }, { a: "recolte", s: 10.2, e: 11.6 }, { a: "stockage", s: 11.6, e: 12.0 }] },
          { name: "Maraîchage", segs: [{ a: "prepa", s: 9.8, e: 10.5 }, { a: "semis", s: 10.5, e: 11.1 }, { a: "croissance", s: 11.1, e: 12.0 }, { a: "recolte", s: 0.0, e: 3.2 }, { a: "stockage", s: 3.2, e: 4.2 }] }
        ]
      },
      "SEN": {
        name: "Sénégal",
        rain: [0, 0, 1, 3, 15, 65, 160, 250, 175, 45, 2, 0],
        malnutrition: [22, 24, 28, 38, 54, 70, 78, 74, 52, 32, 26, 23],
        crops: [
          { name: "Mil souna", segs: [{ a: "prepa", s: 4.5, e: 5.5 }, { a: "semis", s: 5.5, e: 6.2 }, { a: "croissance", s: 6.2, e: 8.8 }, { a: "recolte", s: 8.8, e: 9.8 }, { a: "stockage", s: 9.8, e: 12.0 }] },
          { name: "Arachide", segs: [{ a: "prepa", s: 4.8, e: 5.6 }, { a: "semis", s: 5.6, e: 6.3 }, { a: "croissance", s: 6.3, e: 9.2 }, { a: "recolte", s: 9.2, e: 10.4 }, { a: "stockage", s: 10.4, e: 12.0 }] },
          { name: "Maïs", segs: [{ a: "prepa", s: 5.0, e: 5.8 }, { a: "semis", s: 5.8, e: 6.4 }, { a: "croissance", s: 6.4, e: 9.0 }, { a: "recolte", s: 9.0, e: 10.0 }, { a: "stockage", s: 10.0, e: 11.8 }] },
          { name: "Riz pluvial", segs: [{ a: "prepa", s: 5.2, e: 6.0 }, { a: "semis", s: 6.0, e: 6.6 }, { a: "croissance", s: 6.6, e: 9.8 }, { a: "recolte", s: 9.8, e: 11.0 }, { a: "stockage", s: 11.0, e: 12.0 }] },
          { name: "Niébé", segs: [{ a: "prepa", s: 5.0, e: 5.8 }, { a: "semis", s: 5.8, e: 6.4 }, { a: "croissance", s: 6.4, e: 8.5 }, { a: "recolte", s: 8.5, e: 9.4 }, { a: "stockage", s: 9.4, e: 11.2 }] },
          { name: "Sorgho", segs: [{ a: "prepa", s: 4.8, e: 5.7 }, { a: "semis", s: 5.7, e: 6.3 }, { a: "croissance", s: 6.3, e: 9.5 }, { a: "recolte", s: 9.5, e: 10.6 }, { a: "stockage", s: 10.6, e: 12.0 }] },
          { name: "Fonio", segs: [{ a: "prepa", s: 5.0, e: 5.7 }, { a: "semis", s: 5.7, e: 6.2 }, { a: "croissance", s: 6.2, e: 8.2 }, { a: "recolte", s: 8.2, e: 9.0 }, { a: "stockage", s: 9.0, e: 10.8 }] },
          { name: "Manioc", segs: [{ a: "prepa", s: 4.0, e: 5.0 }, { a: "semis", s: 5.0, e: 6.0 }, { a: "croissance", s: 6.0, e: 12.0 }, { a: "recolte", s: 0.0, e: 2.5 }, { a: "stockage", s: 2.5, e: 4.0 }] },
          { name: "Riz irrigué Vallée", segs: [{ a: "prepa", s: 1.0, e: 2.0 }, { a: "semis", s: 2.0, e: 2.8 }, { a: "croissance", s: 2.8, e: 5.8 }, { a: "recolte", s: 5.8, e: 6.8 }, { a: "stockage", s: 6.8, e: 8.5 }] },
          { name: "Maraîchage Niayes", segs: [{ a: "prepa", s: 9.5, e: 10.3 }, { a: "semis", s: 10.3, e: 11.0 }, { a: "croissance", s: 11.0, e: 12.0 }, { a: "recolte", s: 0.0, e: 3.5 }, { a: "stockage", s: 3.5, e: 4.5 }] }
        ]
      },
      "GHA": {
        name: "Ghana",
        rain: [15, 35, 90, 140, 190, 210, 120, 90, 160, 170, 70, 25],
        malnutrition: [18, 19, 22, 28, 36, 45, 52, 48, 38, 28, 22, 19],
        crops: [
          { name: "Maïs (Saison 1)", segs: [{ a: "prepa", s: 1.8, e: 2.8 }, { a: "semis", s: 2.8, e: 3.4 }, { a: "croissance", s: 3.4, e: 6.5 }, { a: "recolte", s: 6.5, e: 7.5 }, { a: "stockage", s: 7.5, e: 9.0 }] },
          { name: "Maïs (Saison 2)", segs: [{ a: "prepa", s: 7.5, e: 8.2 }, { a: "semis", s: 8.2, e: 8.8 }, { a: "croissance", s: 8.8, e: 11.0 }, { a: "recolte", s: 11.0, e: 12.0 }, { a: "stockage", s: 0.0, e: 1.5 }] },
          { name: "Riz pluvial", segs: [{ a: "prepa", s: 3.5, e: 4.5 }, { a: "semis", s: 4.5, e: 5.2 }, { a: "croissance", s: 5.2, e: 8.8 }, { a: "recolte", s: 8.8, e: 10.0 }, { a: "stockage", s: 10.0, e: 12.0 }] },
          { name: "Igname", segs: [{ a: "prepa", s: 1.5, e: 2.5 }, { a: "semis", s: 2.5, e: 3.5 }, { a: "croissance", s: 3.5, e: 9.0 }, { a: "recolte", s: 9.0, e: 11.0 }, { a: "stockage", s: 11.0, e: 12.0 }] },
          { name: "Manioc", segs: [{ a: "prepa", s: 2.0, e: 3.0 }, { a: "semis", s: 3.0, e: 4.0 }, { a: "croissance", s: 4.0, e: 11.5 }, { a: "recolte", s: 11.5, e: 12.0 }, { a: "stockage", s: 0.0, e: 2.0 }] },
          { name: "Niébé", segs: [{ a: "prepa", s: 3.2, e: 4.0 }, { a: "semis", s: 4.0, e: 4.6 }, { a: "croissance", s: 4.6, e: 6.8 }, { a: "recolte", s: 6.8, e: 7.6 }, { a: "stockage", s: 7.6, e: 9.2 }] },
          { name: "Sorgho", segs: [{ a: "prepa", s: 4.2, e: 5.0 }, { a: "semis", s: 5.0, e: 5.7 }, { a: "croissance", s: 5.7, e: 9.5 }, { a: "recolte", s: 9.5, e: 10.8 }, { a: "stockage", s: 10.8, e: 12.0 }] },
          { name: "Arachide", segs: [{ a: "prepa", s: 3.8, e: 4.6 }, { a: "semis", s: 4.6, e: 5.2 }, { a: "croissance", s: 5.2, e: 8.2 }, { a: "recolte", s: 8.2, e: 9.2 }, { a: "stockage", s: 9.2, e: 11.0 }] },
          { name: "Plantain", segs: [{ a: "prepa", s: 2.5, e: 3.5 }, { a: "semis", s: 3.5, e: 4.5 }, { a: "croissance", s: 4.5, e: 12.0 }, { a: "recolte", s: 0.0, e: 3.0 }, { a: "stockage", s: 3.0, e: 4.5 }] },
          { name: "Maraîchage", segs: [{ a: "prepa", s: 9.0, e: 9.8 }, { a: "semis", s: 9.8, e: 10.4 }, { a: "croissance", s: 10.4, e: 12.0 }, { a: "recolte", s: 0.0, e: 2.5 }, { a: "stockage", s: 2.5, e: 3.8 }] }
        ]
      },
      "NGA": {
        name: "Nigeria",
        rain: [10, 25, 75, 120, 180, 220, 240, 210, 230, 160, 30, 10],
        malnutrition: [24, 26, 30, 42, 58, 72, 80, 76, 56, 36, 28, 25],
        crops: [
          { name: "Maïs", segs: [{ a: "prepa", s: 2.8, e: 3.8 }, { a: "semis", s: 3.8, e: 4.5 }, { a: "croissance", s: 4.5, e: 7.8 }, { a: "recolte", s: 7.8, e: 9.0 }, { a: "stockage", s: 9.0, e: 11.0 }] },
          { name: "Sorgho", segs: [{ a: "prepa", s: 4.0, e: 5.0 }, { a: "semis", s: 5.0, e: 5.8 }, { a: "croissance", s: 5.8, e: 9.6 }, { a: "recolte", s: 9.6, e: 11.0 }, { a: "stockage", s: 11.0, e: 12.0 }] },
          { name: "Mil", segs: [{ a: "prepa", s: 4.2, e: 5.1 }, { a: "semis", s: 5.1, e: 5.8 }, { a: "croissance", s: 5.8, e: 9.0 }, { a: "recolte", s: 9.0, e: 10.2 }, { a: "stockage", s: 10.2, e: 12.0 }] },
          { name: "Riz", segs: [{ a: "prepa", s: 3.5, e: 4.5 }, { a: "semis", s: 4.5, e: 5.3 }, { a: "croissance", s: 5.3, e: 9.2 }, { a: "recolte", s: 9.2, e: 10.5 }, { a: "stockage", s: 10.5, e: 12.0 }] },
          { name: "Igname", segs: [{ a: "prepa", s: 1.8, e: 2.8 }, { a: "semis", s: 2.8, e: 3.8 }, { a: "croissance", s: 3.8, e: 9.5 }, { a: "recolte", s: 9.5, e: 11.2 }, { a: "stockage", s: 11.2, e: 12.0 }] },
          { name: "Manioc", segs: [{ a: "prepa", s: 2.2, e: 3.2 }, { a: "semis", s: 3.2, e: 4.2 }, { a: "croissance", s: 4.2, e: 12.0 }, { a: "recolte", s: 0.0, e: 2.5 }, { a: "stockage", s: 2.5, e: 4.0 }] },
          { name: "Niébé", segs: [{ a: "prepa", s: 4.5, e: 5.3 }, { a: "semis", s: 5.3, e: 6.0 }, { a: "croissance", s: 6.0, e: 8.4 }, { a: "recolte", s: 8.4, e: 9.4 }, { a: "stockage", s: 9.4, e: 11.2 }] },
          { name: "Arachide", segs: [{ a: "prepa", s: 4.2, e: 5.0 }, { a: "semis", s: 5.0, e: 5.7 }, { a: "croissance", s: 5.7, e: 8.8 }, { a: "recolte", s: 8.8, e: 10.0 }, { a: "stockage", s: 10.0, e: 11.8 }] },
          { name: "Sésame", segs: [{ a: "prepa", s: 5.0, e: 5.8 }, { a: "semis", s: 5.8, e: 6.4 }, { a: "croissance", s: 6.4, e: 9.2 }, { a: "recolte", s: 9.2, e: 10.3 }, { a: "stockage", s: 10.3, e: 11.8 }] },
          { name: "Maraîchage", segs: [{ a: "prepa", s: 9.2, e: 10.0 }, { a: "semis", s: 10.0, e: 10.8 }, { a: "croissance", s: 10.8, e: 12.0 }, { a: "recolte", s: 0.0, e: 2.8 }, { a: "stockage", s: 2.8, e: 4.0 }] }
        ]
      },
      "CIV": {
        name: "Côte d'Ivoire",
        rain: [20, 45, 110, 150, 210, 260, 140, 100, 180, 190, 85, 30],
        malnutrition: [19, 21, 24, 32, 42, 54, 62, 58, 44, 30, 24, 20],
        crops: [
          { name: "Maïs", segs: [{ a: "prepa", s: 2.0, e: 3.0 }, { a: "semis", s: 3.0, e: 3.6 }, { a: "croissance", s: 3.6, e: 6.8 }, { a: "recolte", s: 6.8, e: 7.8 }, { a: "stockage", s: 7.8, e: 9.5 }] },
          { name: "Riz pluvial", segs: [{ a: "prepa", s: 3.0, e: 4.0 }, { a: "semis", s: 4.0, e: 4.8 }, { a: "croissance", s: 4.8, e: 8.5 }, { a: "recolte", s: 8.5, e: 9.8 }, { a: "stockage", s: 9.8, e: 11.5 }] },
          { name: "Igname", segs: [{ a: "prepa", s: 1.5, e: 2.5 }, { a: "semis", s: 2.5, e: 3.5 }, { a: "croissance", s: 3.5, e: 9.2 }, { a: "recolte", s: 9.2, e: 11.0 }, { a: "stockage", s: 11.0, e: 12.0 }] },
          { name: "Manioc", segs: [{ a: "prepa", s: 2.0, e: 3.0 }, { a: "semis", s: 3.0, e: 4.0 }, { a: "croissance", s: 4.0, e: 12.0 }, { a: "recolte", s: 0.0, e: 2.2 }, { a: "stockage", s: 2.2, e: 3.8 }] },
          { name: "Plantain", segs: [{ a: "prepa", s: 2.2, e: 3.2 }, { a: "semis", s: 3.2, e: 4.2 }, { a: "croissance", s: 4.2, e: 12.0 }, { a: "recolte", s: 0.0, e: 2.8 }, { a: "stockage", s: 2.8, e: 4.0 }] },
          { name: "Arachide", segs: [{ a: "prepa", s: 3.5, e: 4.3 }, { a: "semis", s: 4.3, e: 5.0 }, { a: "croissance", s: 5.0, e: 8.0 }, { a: "recolte", s: 8.0, e: 9.0 }, { a: "stockage", s: 9.0, e: 10.8 }] },
          { name: "Niébé", segs: [{ a: "prepa", s: 3.8, e: 4.5 }, { a: "semis", s: 4.5, e: 5.1 }, { a: "croissance", s: 5.1, e: 7.5 }, { a: "recolte", s: 7.5, e: 8.5 }, { a: "stockage", s: 8.5, e: 10.2 }] },
          { name: "Sorgho (Nord)", segs: [{ a: "prepa", s: 4.5, e: 5.3 }, { a: "semis", s: 5.3, e: 6.0 }, { a: "croissance", s: 6.0, e: 9.5 }, { a: "recolte", s: 9.5, e: 10.8 }, { a: "stockage", s: 10.8, e: 12.0 }] },
          { name: "Mil (Nord)", segs: [{ a: "prepa", s: 4.6, e: 5.4 }, { a: "semis", s: 5.4, e: 6.0 }, { a: "croissance", s: 6.0, e: 9.0 }, { a: "recolte", s: 9.0, e: 10.2 }, { a: "stockage", s: 10.2, e: 12.0 }] },
          { name: "Maraîchage", segs: [{ a: "prepa", s: 9.0, e: 9.8 }, { a: "semis", s: 9.8, e: 10.5 }, { a: "croissance", s: 10.5, e: 12.0 }, { a: "recolte", s: 0.0, e: 2.6 }, { a: "stockage", s: 2.6, e: 3.8 }] }
        ]
      }
    },

    // Graphique 4 : Sankey Chaîne de Valeur
    g4Sankey: {
      cols: [
        {
          name: "PRODUCTION",
          nodes: [
            { id: "p_cer", label: "Céréales", val: 28.5, color: "#059669" },
            { id: "p_leg", label: "Légumineuses", val: 8.2, color: "#10B981" },
            { id: "p_fl", label: "Fruits / Légumes", val: 11.4, color: "#D97706" },
            { id: "p_ani", label: "Prod. animaux", val: 4.3, color: "#0891B2" }
          ]
        },
        {
          name: "TRANSFORMATION",
          nodes: [
            { id: "t_meun", label: "Meunerie", val: 16.2, color: "#059669" },
            { id: "t_art", label: "Artisanat", val: 12.4, color: "#D97706" },
            { id: "t_ind", label: "Industriel", val: 9.8, color: "#7C3AED" },
            { id: "t_brut", label: "Non transformé", val: 14.0, color: "#10B981" }
          ]
        },
        {
          name: "DISTRIBUTION",
          nodes: [
            { id: "d_loc", label: "Marchés locaux", val: 21.5, color: "#059669" },
            { id: "d_reg", label: "Commerce rég.", val: 11.2, color: "#0891B2" },
            { id: "d_exp", label: "Export", val: 4.6, color: "#7C3AED" },
            { id: "d_crt", label: "Circuits courts", val: 8.2, color: "#D97706" }
          ]
        },
        {
          name: "CONSOMMATION",
          nodes: [
            { id: "c_rur", label: "Ménages ruraux", val: 22.1, color: "#059669" },
            { id: "c_urb", label: "Ménages urbains", val: 14.8, color: "#0891B2" },
            { id: "c_prog", label: "Programmes", val: 4.0, color: "#D97706" },
            { id: "c_pert", label: "Pertes finales", val: 11.5, color: "#DC2626" }
          ]
        }
      ],
      links: [
        // Production -> Transformation
        { source: "p_cer", target: "t_meun", val: 14.0, color: "#059669", crop: "Céréales", lossPct: 8 },
        { source: "p_cer", target: "t_art", val: 7.2, color: "#059669", crop: "Céréales", lossPct: 11 },
        { source: "p_cer", target: "t_ind", val: 4.1, color: "#059669", crop: "Céréales", lossPct: 6 },
        { source: "p_cer", target: "t_brut", val: 3.2, color: "#059669", crop: "Céréales", lossPct: 14 },

        { source: "p_leg", target: "t_art", val: 2.8, color: "#10B981", crop: "Légumineuses", lossPct: 9 },
        { source: "p_leg", target: "t_ind", val: 1.8, color: "#10B981", crop: "Légumineuses", lossPct: 5 },
        { source: "p_leg", target: "t_brut", val: 3.6, color: "#10B981", crop: "Légumineuses", lossPct: 12 },

        { source: "p_fl", target: "t_art", val: 2.0, color: "#D97706", crop: "Fruits/Légumes", lossPct: 22 },
        { source: "p_fl", target: "t_ind", val: 2.8, color: "#D97706", crop: "Fruits/Légumes", lossPct: 15 },
        { source: "p_fl", target: "t_brut", val: 6.6, color: "#D97706", crop: "Fruits/Légumes", lossPct: 28 },

        { source: "p_ani", target: "t_art", val: 0.4, color: "#0891B2", crop: "Prod. animaux", lossPct: 12 },
        { source: "p_ani", target: "t_ind", val: 1.1, color: "#0891B2", crop: "Prod. animaux", lossPct: 7 },
        { source: "p_ani", target: "t_brut", val: 2.8, color: "#0891B2", crop: "Prod. animaux", lossPct: 10 },

        // Transformation -> Distribution
        { source: "t_meun", target: "d_loc", val: 8.5, color: "#059669", crop: "Farines/Semoules", lossPct: 5 },
        { source: "t_meun", target: "d_reg", val: 4.8, color: "#059669", crop: "Farines/Semoules", lossPct: 4 },
        { source: "t_meun", target: "d_crt", val: 2.9, color: "#059669", crop: "Farines/Semoules", lossPct: 3 },

        { source: "t_art", target: "d_loc", val: 7.2, color: "#D97706", crop: "Produits locaux", lossPct: 7 },
        { source: "t_art", target: "d_crt", val: 3.8, color: "#D97706", crop: "Produits locaux", lossPct: 6 },
        { source: "t_art", target: "d_reg", val: 1.4, color: "#D97706", crop: "Produits locaux", lossPct: 9 },

        { source: "t_ind", target: "d_reg", val: 3.5, color: "#7C3AED", crop: "Agro-industrie", lossPct: 3 },
        { source: "t_ind", target: "d_exp", val: 3.8, color: "#7C3AED", crop: "Agro-industrie", lossPct: 2 },
        { source: "t_ind", target: "d_loc", val: 2.5, color: "#7C3AED", crop: "Agro-industrie", lossPct: 4 },

        { source: "t_brut", target: "d_loc", val: 6.8, color: "#10B981", crop: "Vrac frais", lossPct: 18 },
        { source: "t_brut", target: "d_crt", val: 4.2, color: "#10B981", crop: "Vrac frais", lossPct: 12 },
        { source: "t_brut", target: "d_reg", val: 2.2, color: "#10B981", crop: "Vrac frais", lossPct: 16 },
        { source: "t_brut", target: "d_exp", val: 0.8, color: "#10B981", crop: "Vrac frais", lossPct: 10 },

        // Distribution -> Consommation
        { source: "d_loc", target: "c_rur", val: 11.8, color: "#059669", crop: "Distribution locale", lossPct: 8 },
        { source: "d_loc", target: "c_urb", val: 7.2, color: "#059669", crop: "Distribution locale", lossPct: 6 },
        { source: "d_loc", target: "c_pert", val: 2.5, color: "#DC2626", crop: "Pertes étalage", lossPct: 100 },

        { source: "d_reg", target: "c_urb", val: 6.4, color: "#0891B2", crop: "Flux régionaux", lossPct: 5 },
        { source: "d_reg", target: "c_prog", val: 2.8, color: "#0891B2", crop: "Flux régionaux", lossPct: 4 },
        { source: "d_reg", target: "c_pert", val: 2.0, color: "#DC2626", crop: "Pertes transport", lossPct: 100 },

        { source: "d_crt", target: "c_rur", val: 5.6, color: "#D97706", crop: "Circuits courts", lossPct: 4 },
        { source: "d_crt", target: "c_urb", val: 1.8, color: "#D97706", crop: "Circuits courts", lossPct: 3 },
        { source: "d_crt", target: "c_pert", val: 0.8, color: "#DC2626", crop: "Pertes marchés", lossPct: 100 },

        { source: "d_exp", target: "c_prog", val: 1.2, color: "#7C3AED", crop: "Corridors humanitaires", lossPct: 2 },
        { source: "d_exp", target: "c_pert", val: 3.4, color: "#DC2626", crop: "Pertes frontières", lossPct: 100 }
      ],
      losses: [
        { step: "Récolte & Pré-traitement", vol: 3.2, pct: 28 },
        { step: "Stockage & Meunerie", vol: 3.6, pct: 31 },
        { step: "Transport & Transit", vol: 2.4, pct: 21 },
        { step: "Distribution & Ménages", vol: 2.3, pct: 20 }
      ]
    },

    // Graphique 5 & 13 : Données HDDS (14 pays)
    g5Hdds: [
      { name: "Ghana", code: "GHA", score: 6.1, rank: 1, std: 1.1 },
      { name: "Côte d'Ivoire", code: "CIV", score: 5.9, rank: 2, std: 1.2 },
      { name: "Nigeria", code: "NGA", score: 5.8, rank: 3, std: 1.4 },
      { name: "Bénin", code: "BEN", score: 5.3, rank: 4, std: 1.0 },
      { name: "Sénégal", code: "SEN", score: 5.2, rank: 5, std: 1.1 },
      { name: "Gambie", code: "GAM", score: 5.1, rank: 6, std: 1.0 },
      { name: "Togo", code: "TGO", score: 5.0, rank: 7, std: 1.1 },
      { name: "Sierra Leone", code: "SLE", score: 4.8, rank: 8, std: 1.2 },
      { name: "Liberia", code: "LBR", score: 4.6, rank: 9, std: 1.3 },
      { name: "Burkina Faso", code: "BFA", score: 4.4, rank: 10, std: 1.2 },
      { name: "Guinée-Bissau", code: "GNB", score: 4.3, rank: 11, std: 1.1 },
      { name: "Mauritanie", code: "MRT", score: 4.2, rank: 12, std: 1.0 },
      { name: "Mali", code: "MLI", score: 4.1, rank: 13, std: 1.3 },
      { name: "Niger", code: "NER", score: 3.8, rank: 14, std: 1.2 }
    ],

    // Graphique 6 : Gauges Fortification
    g6Fortification: [
      { id: "sel", name: "Sel iodé", pct: 89, target: 90, color: "#059669", status: "Conforme", gap: 1 },
      { id: "farine", name: "Farine blé fortifiée", pct: 61, target: 80, color: "#D97706", status: "En progrès", gap: 19 },
      { id: "huile", name: "Huile Vitamine A", pct: 45, target: 80, color: "#DC2626", status: "Critique", gap: 35 },
      { id: "semoule", name: "Semoule enrichie", pct: 38, target: 75, color: "#DC2626", status: "Critique", gap: 37 },
      { id: "lait", name: "Lait fortifié", pct: 22, target: 70, color: "#991B1B", status: "Très faible", gap: 48 }
    ],

    // Graphique 7 : Waterfall Pertes Post-Récolte
    g7Waterfall: [
      { label: "Production brute", pct: 100, delta: 100, type: "total", color: "#059669", vol: "52.4 Mt" },
      { label: "À la récolte", pct: 95.8, delta: -4.2, type: "loss", color: "#DC2626", vol: "-2.2 Mt" },
      { label: "Battage / égrenage", pct: 92.7, delta: -3.1, type: "loss", color: "#DC2626", vol: "-1.6 Mt" },
      { label: "Stockage ménage", pct: 86.9, delta: -5.8, type: "loss", color: "#DC2626", vol: "-3.0 Mt" },
      { label: "Transport", pct: 83.5, delta: -3.4, type: "loss", color: "#DC2626", vol: "-1.8 Mt" },
      { label: "Transformation", pct: 80.9, delta: -2.6, type: "loss", color: "#DC2626", vol: "-1.4 Mt" },
      { label: "Commerce / marché", pct: 78.0, delta: -2.9, type: "loss", color: "#DC2626", vol: "-1.5 Mt" },
      { label: "DISPONIBLE FINAL", pct: 78.0, delta: 78.0, type: "final", color: "#10B981", vol: "40.9 Mt" }
    ],

    // Graphique 8 : Scatter Diversité Cultures vs HDDS (80+ points)
    g8Scatter: (function () {
      var pts = [];
      var countries = [
        { c: "Niger", col: "#DC2626", baseX: 3.2, baseY: 3.4, count: 14 },
        { c: "Mali", col: "#F59E0B", baseX: 4.0, baseY: 3.9, count: 14 },
        { c: "Burkina", col: "#D97706", baseX: 4.8, baseY: 4.3, count: 14 },
        { c: "Sénégal", col: "#0891B2", baseX: 5.6, baseY: 5.0, count: 14 },
        { c: "Nigeria", col: "#7C3AED", baseX: 6.5, baseY: 5.7, count: 16 },
        { c: "Ghana", col: "#059669", baseX: 7.2, baseY: 6.2, count: 14 }
      ];
      countries.forEach(function (ct) {
        for (var i = 0; i < ct.count; i++) {
          var jx = (Math.random() - 0.5) * 2.2;
          var jy = (Math.random() - 0.5) * 1.3;
          var x = Math.max(1.2, Math.min(9.8, ct.baseX + jx));
          // correlation Y ~ 2.0 + 0.55 * X + noise
          var y = Math.max(2.1, Math.min(7.9, 1.8 + 0.58 * x + jy * 0.7));
          var hhs = Math.round(40 + Math.random() * 120);
          pts.push({
            country: ct.c,
            color: ct.col,
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            hhs: hhs,
            loc: ct.c + " · District " + String.fromCharCode(65 + i)
          });
        }
      });
      return pts;
    })(),

    // Graphique 9 : Stacked Area 2014->2024 (11 ans, 6 cultures, 38->52.4 Mt)
    g9Years: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    g9Crops: [
      { key: "mais", label: "Maïs", color: "#D97706", vals: [10.5, 11.0, 11.4, 12.1, 12.8, 13.5, 14.1, 14.6, 15.2, 15.7, 16.2] },
      { key: "mil", label: "Mil", color: "#059669", vals: [11.8, 12.0, 12.2, 12.5, 12.9, 13.2, 13.7, 14.0, 14.3, 14.5, 14.8] },
      { key: "sorgho", label: "Sorgho", color: "#10B981", vals: [6.4, 6.6, 6.7, 6.9, 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8] },
      { key: "riz", label: "Riz", color: "#0891B2", vals: [5.8, 6.2, 6.6, 7.1, 7.8, 8.2, 8.8, 9.3, 9.7, 10.1, 10.4] },
      { key: "haricots", label: "Haricots / Légumineuses", color: "#7C3AED", vals: [1.8, 1.9, 1.9, 2.0, 2.1, 2.1, 2.2, 2.3, 2.3, 2.4, 2.4] },
      { key: "autres", label: "Autres céréales (Fonio...)", color: "#94A3B8", vals: [0.5, 0.5, 0.6, 0.6, 0.6, 0.7, 0.7, 0.7, 0.8, 0.8, 0.8] }
    ],

    // Graphique 10 : Radar Systèmes Alimentaires (7 axes)
    g10Axes: [
      "Production",
      "Environnement",
      "Nutrition",
      "Économie",
      "Équité sociale",
      "Culture",
      "Gouvernance"
    ],
    g10Countries: {
      "NER": { name: "Niger", color: "#DC2626", vals: [45, 38, 32, 42, 41, 68, 39] },
      "SEN": { name: "Sénégal", color: "#0891B2", vals: [62, 54, 58, 65, 60, 72, 58] },
      "GHA": { name: "Ghana", color: "#059669", vals: [68, 61, 65, 70, 64, 75, 62] },
      "NGA": { name: "Nigeria", color: "#7C3AED", vals: [71, 48, 54, 68, 52, 65, 55] }
    },

    // Graphique 11 : Bar Chart Horizontal Valeur Nutritive (Mil vs Maïs vs Riz)
    g11Grains: [
      {
        nutrient: "Fer",
        unit: "mg/100g",
        rdaPortion: 5.0,
        mil: 8.3,
        mais: 2.7,
        riz: 0.8,
        comment: "Le Mil couvre 166% du besoin par portion"
      },
      {
        nutrient: "Zinc",
        unit: "mg/100g",
        rdaPortion: 2.5,
        mil: 3.1,
        mais: 2.2,
        riz: 1.1,
        comment: "Mil supérieur de 40% au Maïs et 180% au Riz"
      },
      {
        nutrient: "Protéines",
        unit: "g/100g",
        rdaPortion: 8.0,
        mil: 11.8,
        mais: 9.4,
        riz: 7.1,
        comment: "Profil d'acides aminés soufrés exceptionnel"
      },
      {
        nutrient: "Vit. B3",
        unit: "mg/100g",
        rdaPortion: 2.4,
        mil: 4.7,
        mais: 3.6,
        riz: 1.9,
        comment: "Essentielle au métabolisme énergétique"
      },
      {
        nutrient: "Calcium",
        unit: "mg/100g",
        rdaPortion: 30.0,
        mil: 42.0,
        mais: 7.0,
        riz: 28.0,
        comment: "Le Mil apporte 6× plus de calcium que le Maïs"
      }
    ],

    // Graphique 12 : Heatmap Prix Marchés 2024 (6 cultures x 12 mois)
    g12Months: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
    g12Countries: {
      "NER": {
        name: "Niger (Niamey / Maradi)",
        currency: "FCFA/kg",
        crops: [
          { name: "Mil", harvestMonths: [9, 10], prices: [280, 290, 310, 340, 390, 440, 480, 460, 350, 270, 260, 275], baseline: 275 },
          { name: "Sorgho", harvestMonths: [10, 11], prices: [250, 260, 280, 305, 350, 390, 430, 410, 320, 245, 230, 240], baseline: 240 },
          { name: "Maïs", harvestMonths: [9, 10], prices: [290, 305, 325, 360, 400, 435, 465, 450, 360, 295, 280, 285], baseline: 280 },
          { name: "Riz local", harvestMonths: [10, 11], prices: [480, 490, 500, 520, 550, 575, 590, 580, 540, 490, 475, 480], baseline: 470 },
          { name: "Niébé", harvestMonths: [8, 9], prices: [420, 440, 470, 520, 590, 660, 710, 680, 510, 400, 390, 410], baseline: 390 },
          { name: "Arachide", harvestMonths: [9, 10], prices: [520, 535, 560, 600, 660, 710, 750, 730, 600, 510, 495, 510], baseline: 500 }
        ]
      },
      "BFA": {
        name: "Burkina Faso (Ouaga / Bobo)",
        currency: "FCFA/kg",
        crops: [
          { name: "Mil", harvestMonths: [9, 10], prices: [260, 270, 290, 320, 370, 410, 450, 430, 330, 250, 240, 255], baseline: 250 },
          { name: "Sorgho", harvestMonths: [10, 11], prices: [230, 240, 260, 285, 330, 370, 400, 385, 300, 225, 215, 225], baseline: 220 },
          { name: "Maïs", harvestMonths: [8, 9], prices: [240, 250, 270, 295, 335, 365, 395, 370, 290, 235, 225, 230], baseline: 225 },
          { name: "Riz local", harvestMonths: [10, 11], prices: [450, 460, 475, 490, 520, 540, 560, 550, 510, 460, 445, 450], baseline: 440 },
          { name: "Niébé", harvestMonths: [8, 9], prices: [390, 410, 440, 490, 550, 610, 660, 630, 480, 380, 370, 385], baseline: 370 },
          { name: "Arachide", harvestMonths: [9, 10], prices: [490, 510, 530, 570, 620, 670, 710, 690, 570, 480, 470, 485], baseline: 470 }
        ]
      },
      "MLI": {
        name: "Mali (Sikasso / Ségou)",
        currency: "FCFA/kg",
        crops: [
          { name: "Mil", harvestMonths: [9, 10], prices: [250, 260, 280, 310, 350, 390, 430, 410, 320, 245, 235, 245], baseline: 240 },
          { name: "Sorgho", harvestMonths: [10, 11], prices: [220, 230, 250, 275, 315, 350, 385, 370, 290, 215, 205, 215], baseline: 210 },
          { name: "Maïs", harvestMonths: [8, 9], prices: [225, 235, 255, 280, 320, 350, 375, 355, 275, 220, 210, 220], baseline: 210 },
          { name: "Riz local", harvestMonths: [10, 11], prices: [440, 450, 465, 480, 510, 530, 550, 540, 495, 445, 435, 440], baseline: 430 },
          { name: "Niébé", harvestMonths: [8, 9], prices: [370, 390, 420, 470, 530, 590, 640, 610, 460, 360, 350, 365], baseline: 350 },
          { name: "Arachide", harvestMonths: [9, 10], prices: [470, 490, 510, 550, 600, 650, 690, 670, 550, 460, 450, 465], baseline: 450 }
        ]
      },
      "SEN": {
        name: "Sénégal (Dakar / Kaolack)",
        currency: "FCFA/kg",
        crops: [
          { name: "Mil", harvestMonths: [9, 10], prices: [290, 305, 325, 355, 395, 430, 460, 445, 365, 290, 275, 285], baseline: 280 },
          { name: "Sorgho", harvestMonths: [10, 11], prices: [270, 280, 300, 325, 365, 400, 430, 415, 340, 265, 255, 265], baseline: 260 },
          { name: "Maïs", harvestMonths: [8, 9], prices: [275, 285, 305, 335, 370, 405, 430, 415, 340, 270, 260, 270], baseline: 265 },
          { name: "Riz local", harvestMonths: [10, 11], prices: [460, 470, 485, 505, 530, 555, 570, 560, 520, 465, 450, 455], baseline: 450 },
          { name: "Niébé", harvestMonths: [8, 9], prices: [410, 430, 460, 510, 570, 630, 680, 650, 500, 400, 390, 405], baseline: 390 },
          { name: "Arachide", harvestMonths: [9, 10], prices: [480, 495, 520, 560, 610, 660, 700, 680, 560, 470, 460, 475], baseline: 460 }
        ]
      }
    },

    // Graphique 14 : Bubble Pertes x Revenus x Production
    g14Bubbles: [
      { name: "Niger", pertes: 28, revenus: 320, prod: 4.8, color: "#DC2626", text: "NER · 28% pertes · 320$/an · 4.8Mt" },
      { name: "Mali", pertes: 22, revenus: 480, prod: 11.2, color: "#F59E0B", text: "MLI · 22% pertes · 480$/an · 11.2Mt" },
      { name: "Burkina Faso", pertes: 25, revenus: 420, prod: 6.7, color: "#D97706", text: "BFA · 25% pertes · 420$/an · 6.7Mt" },
      { name: "Sénégal", pertes: 18, revenus: 720, prod: 3.2, color: "#0891B2", text: "SEN · 18% pertes · 720$/an · 3.2Mt" },
      { name: "Nigeria", pertes: 20, revenus: 850, prod: 18.4, color: "#7C3AED", text: "NGA · 20% pertes · 850$/an · 18.4Mt" },
      { name: "Ghana", pertes: 14, revenus: 980, prod: 4.1, color: "#059669", text: "GHA · 14% pertes · 980$/an · 4.1Mt" },
      { name: "Côte d'Ivoire", pertes: 17, revenus: 890, prod: 3.8, color: "#10B981", text: "CIV · 17% pertes · 890$/an · 3.8Mt" },
      { name: "Bénin", pertes: 23, revenus: 610, prod: 2.1, color: "#EAB308", text: "BEN · 23% pertes · 610$/an · 2.1Mt" }
    ],

    // Graphique 15 : Scorecard Nutrition-Agriculture (5 pays x 6 indicateurs)
    g15Scorecard: {
      indicators: [
        { key: "auto", label: "Autosuffisance", unit: "%", target: 100, max: 130, higherBetter: true, bands: [60, 90, 130] },
        { key: "hdds", label: "HDDS Score", unit: "/12", target: 6.0, max: 12, higherBetter: true, bands: [3.5, 5.0, 12] },
        { key: "pertes", label: "Pertes récolte", unit: "%", target: 15, max: 35, higherBetter: false, bands: [15, 22, 35] },
        { key: "fort", label: "Couv. Fortification", unit: "%", target: 80, max: 100, higherBetter: true, bands: [40, 70, 100] },
        { key: "prix", label: "Ratio prix/norm.", unit: "×", target: 1.10, max: 2.0, higherBetter: false, bands: [1.10, 1.35, 2.0] },
        { key: "revenus", label: "Revenu agri.", unit: "USD", target: 800, max: 1200, higherBetter: true, bands: [350, 700, 1200] }
      ],
      countries: [
        {
          name: "Ghana",
          code: "GHA",
          flag: "🇬🇭",
          overall: 84,
          data: { auto: 107.9, hdds: 6.1, pertes: 14, fort: 74, prix: 1.12, revenus: 980 }
        },
        {
          name: "Sénégal",
          code: "SEN",
          flag: "🇸🇳",
          overall: 73,
          data: { auto: 66.7, hdds: 5.2, pertes: 18, fort: 71, prix: 1.18, revenus: 720 }
        },
        {
          name: "Burkina Faso",
          code: "BFA",
          flag: "🇧🇫",
          overall: 61,
          data: { auto: 93.1, hdds: 4.4, pertes: 25, fort: 61, prix: 1.28, revenus: 420 }
        },
        {
          name: "Mali",
          code: "MLI",
          flag: "🇲🇱",
          overall: 64,
          data: { auto: 114.3, hdds: 4.1, pertes: 22, fort: 52, prix: 1.24, revenus: 480 }
        },
        {
          name: "Niger",
          code: "NER",
          flag: "🇳🇪",
          overall: 48,
          data: { auto: 78.7, hdds: 3.8, pertes: 28, fort: 45, prix: 1.42, revenus: 320 }
        }
      ]
    }
  };

  root.FAO_DATA = FAO_DATA;
})(typeof window !== "undefined" ? window : this);
