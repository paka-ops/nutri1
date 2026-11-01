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
    // Arrondi par plus forts restes : les trois parts affichées totalisent 100 %.
    const distribution = items.map((item) => ({
      name: item.group,
      grams: item.grams,
      percent: Math.floor((item.grams / totals.grams) * 100),
      remainder: ((item.grams / totals.grams) * 100) % 1,
      color: item.color,
    }));
    const missing =
      100 - distribution.reduce((sum, group) => sum + group.percent, 0);
    [...distribution]
      .sort((a, b) => b.remainder - a.remainder)
      .slice(0, missing)
      .forEach((group) => group.percent++);
    return {
      items,
      totals,
      balanced: vegetables >= 0.4 && starch <= 0.4,
      distribution,
    };
  }
  // Conseils pédagogiques liés aux portions : pas de prescription personnalisée.
  function recommendations(result) {
    const rice = result.items.find((item) => item.id === "rice");
    const standard = meal(false);
    return {
      summary: result.balanced
        ? "Proportions variées dans cet exemple. Conservez la diversité et vérifiez les quantités réellement servies."
        : "Priorité : revoir la place des féculents. La portion de riz représente " +
          result.distribution.find((group) => group.name === "Féculents")
            .percent +
          " % de la masse de cette assiette.",
      adjustable: rice.grams > 150,
      items: [
        result.balanced
          ? {
              category: "À maintenir",
              title: "Conserver les trois groupes alimentaires",
              detail:
                "Cet exemple associe 150 g de riz, 120 g de tilapia et 200 g de légumes. Gardez cette diversité ; les quantités adaptées dépendent de vos besoins.",
            }
          : {
              category: "Ajustement prioritaire",
              title: "Comparer avec une portion de riz de 150 g",
              detail:
                "Passer de " +
                rice.grams +
                " g à 150 g de riz, sans modifier le poisson ni les légumes, fait passer l’exemple de " +
                result.totals.kcal +
                " à " +
                standard.totals.kcal +
                " kcal (−" +
                (result.totals.kcal - standard.totals.kcal) +
                " kcal). Il s’agit d’un scénario, pas d’un objectif calorique personnel.",
            },
        {
          category: "Légumes et fibres",
          title: result.balanced
            ? "Varier les légumes au fil des repas"
            : "Préserver la portion de légumes",
          detail:
            "Les 200 g de légumes de cet exemple contribuent aux " +
            result.totals.fiber +
            " g de fibres du repas. Alternez selon les disponibilités : feuilles locales, gombo, carotte ou tomate. Ne remplacez pas les légumes par du riz supplémentaire.",
        },
        {
          category: "Préparation",
          title: "Vérifier l’huile, le sel et les sauces",
          detail:
            "Privilégiez une cuisson grillée ou mijotée et mesurez l’huile ajoutée. Goûtez avant d’ajouter sel ou bouillon. Ces quantités ne sont pas déductibles de la photo et peuvent modifier les apports.",
        },
      ],
    };
  }
  window.NUTRI_MEAL_DATA = { meal, recommendations };
})();
