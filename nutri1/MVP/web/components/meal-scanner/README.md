# Nutri Vision — scanner immersif

Démonstration en français de la section `#scanner`. Fonctionne sur le serveur
statique existant : ouvrir `index.html#scanner`, sans compilation ni API.

## Organisation

- `meal-scanner-data.js` : ingrédients d’exemple, portions, calcul des totaux et
  règle pédagogique d’équilibre, répartition arrondie à 100 % et recommandations
  adaptées aux deux scénarios (fonctions pures, données non mutées).
- `meal-scanner-template.js` : structure de l’interface et pictogrammes SVG locaux.
- `meal-scanner.css` : tableau de bord nutritionnel responsive, tableaux de
  composition, indicateurs d’apports, recommandations, animations et mouvement réduit.
- `meal-scanner-host.css` : adaptation du bandeau pays/langue sur mobile, limitée
  à l’affichage du scanner pour éviter un débordement du cadre de la plateforme.
- `meal-scanner.js` : contrôleur, progression, imports locaux et annulation des
  séquences lors d’une navigation, d’un changement de portion ou d’onglet.
- `assets/african-meal.jpg` : photo illustrative générée d’un plat ouest-africain.

`index.html` ne contient qu’un point de montage, un titre pour la navigation,
un repli sans JavaScript, la feuille de cadre mobile et les trois inclusions JS. Le contrôleur résout les
ressources relativement à sa propre URL (compatible avec les sous-dossiers).

Le Shadow DOM protège le module des feuilles globales et des anciens moteurs
V41/V43/V44 qui recherchent les boutons « Scan now » dans le document. Aucun
écouteur global n’est supprimé et les autres sections ne sont pas modifiées.

## Parcours

1. **Photographier & analyser** simule une capture avec flash, puis un balayage.
2. Les trois composants apparaissent avec leurs repères, portions et calories.
3. Un bilan affiche un tableau des aliments, l’énergie, les macros, la répartition
   en masse des trois groupes et un conseil d’équilibre.
4. Une section dédiée présente trois recommandations : proportions du repas,
   légumes et fibres, préparation (huile, sel, sauces). Elles sont recalculées avec
   les portions ; elles ne sont ni personnalisées ni des prescriptions médicales.
5. Passer de 150 g à 300 g de riz recalcule le résultat (500 → 740 kcal) et
   montre un bilan différent ; la photo ne change pas, ce qui est précisé. Le bouton
   **Simuler avec 150 g de riz** applique le scénario de référence, actualise les
   valeurs et les recommandations et conserve un focus clavier logique.
6. **Choisir une photo / caméra** permet un import local (ou l’appareil photo sur
   les appareils compatibles). Une photo importée ne fait l’objet d’aucune
   reconnaissance. Les faux repères y sont supprimés, les limites affichées et
   un bouton permet de retrouver le plat illustratif.

## Limites volontaires

Ce module est une **simulation de produit**, pas une IA d’analyse alimentaire.
Les ingrédients et valeurs sont prédéfinis, incluent l’huile de cuisson dans
l’exemple et ne proviennent pas d’une base alimentaire validée. Les deux bilans
reposent sur une règle simplifiée de proportions en masse cuite, documentée dans
l’interface. Ce n’est ni une recommandation universelle ni une évaluation clinique.

Les images importées ne sont ni envoyées ni conservées. Les imports sont limités
à JPEG/PNG/WebP, 10 Mo, avec vérification du décodage et révocation des URL objets.
Le mode `prefers-reduced-motion` supprime les animations et raccourcit la séquence.
Le module dispose d’états annoncés, d’une progression accessible et de contrôles
natifs utilisables au clavier.

## Tests

Depuis la racine du dépôt :

```sh
npm install --prefix tools/nvtest
npm run --prefix tools/nvtest meal-scanner
```

Suite déterministe jsdom, sans serveur ni CDN (**22 vérifications**) : totaux et équilibre, phases,
double-clic, recommandations conditionnelles et action associée, répartition à 100 %, portions, annulation, import invalide/trop lourd/illisible, photo
locale, imports concurrents, restauration, mouvement réduit et intégration HTML.
