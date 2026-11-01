/* Données illustratives par portion cuite, non issues d'une reconnaissance IA.
   Les valeurs incluent l'huile de cuisson. À remplacer par une source validée
   et une estimation de portion confirmée avant tout usage nutritionnel réel. */
(function () {
  "use strict";
  const ingredients = [
    {
      id: "rice",
      name: "Riz jollof",
      group: "Féculents",
      grams: 150,
      kcal: 240,
      protein: 4,
      carbs: 43,
      fat: 6,
      fiber: 2,
      x: 29,
      y: 48,
      color: "#edb36c",
    },
    {
      id: "fish",
      name: "Tilapia grillé",
      group: "Protéines",
      grams: 120,
      kcal: 180,
      protein: 30,
      carbs: 0,
      fat: 7,
      fiber: 0,
      x: 66,
      y: 35,
      color: "#9ccbf8",
    },
    {
      id: "greens",
      name: "Légumes & tomate",
      group: "Légumes",
      grams: 200,
      kcal: 80,
      protein: 4,
      carbs: 12,
      fat: 2,
      fiber: 6,
      x: 68,
      y: 69,
      color: "#bce88a",
    },
  ];
  function meal(generous) {
    const items = ingredients.map((item) => {
      const factor = generous && item.id === "rice" ? 2 : 1;
      return {
        ...item,
        ...Object.fromEntries(
          ["grams", "kcal", "protein", "carbs", "fat", "fiber"].map((key) => [
            key,
            item[key] * factor,
          ]),
        ),
      };
    });
    const totals = Object.fromEntries(
      ["grams", "kcal", "protein", "carbs", "fat", "fiber"].map((key) => [
        key,
        items.reduce((sum, item) => sum + item[key], 0),
      ]),
    );
    // Règle pédagogique explicite, pas un score clinique : diversité des trois
    // groupes, ≥ 40 % de légumes et ≤ 40 % de féculents, en masse cuite.
    const vegetables =
      items.find((item) => item.id === "greens").grams / totals.grams;
    const starch =
      items.find((item) => item.id === "rice").grams / totals.grams;
    return { items, totals, balanced: vegetables >= 0.4 && starch <= 0.4 };
  }
  window.NUTRI_MEAL_DATA = { meal };
})();
