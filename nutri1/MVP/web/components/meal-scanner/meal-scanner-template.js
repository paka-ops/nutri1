(function () {
  "use strict";
  const icon = (name) => {
    const paths = {
      camera:
        '<path d="M14 4h-4L8 7H4a2 2 0 0 0-2 2v10h20V9a2 2 0 0 0-2-2h-4z"/><circle cx="12" cy="13" r="4"/>',
      upload: '<path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      nutrition:
        '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M9 3h6v3H9zM7 11h3m-3 5h3m4-5h3m-3 5h3"/>',
      shield:
        '<path d="m12 3 8 3v6c0 4-5 8-8 9-3-1-8-5-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
      plus: '<path d="M12 6v12M6 12h12"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  };
  window.NUTRI_MEAL_TEMPLATE = function (asset) {
    return `<link rel="stylesheet" href="${asset("meal-scanner.css")}">
    <div class="scanner" lang="fr" data-state="ready">
      <header class="app-header">
        <div class="heading-group"><span class="module-icon">${icon("nutrition")}</span><div><p class="breadcrumb">NUTRITION / SCANNER ALIMENTAIRE</p><h2>Analyse nutritionnelle du repas</h2><p class="subtitle">Vérifiez la composition, les apports et les ajustements possibles.</p></div></div>
        <span class="demo-badge">Mode démonstration</span>
      </header>
      <div class="safety-note">${icon("shield")}<p><strong>Données d’exemple, non validées cliniquement.</strong> Les résultats ne sont pas issus d’une reconnaissance IA et ne remplacent pas un avis professionnel.</p></div>
      <div class="workflow">
        <ol class="timeline" aria-label="Étapes de l’analyse simulée">
          <li data-step="0"><b>1</b><span>Capture</span></li><li data-step="1"><b>2</b><span>Composition</span></li><li data-step="2"><b>3</b><span>Apports</span></li><li data-step="3"><b>4</b><span>Recommandations</span></li>
        </ol>
        <div class="status-line"><span class="scan-status" role="status" aria-live="polite">En attente de la capture du repas.</span><span class="percent" aria-hidden="true">0 %</span></div>
        <div class="progress" role="progressbar" aria-label="Analyse simulée" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"><i></i></div>
      </div>
      <div class="workspace">
        <section class="capture-panel panel" aria-labelledby="capture-heading">
          <div class="panel-top"><h3 id="capture-heading">Photo du repas</h3><span class="section-number">01</span></div>
          <div class="viewfinder">
            <img class="meal-photo" src="${asset("assets/african-meal.jpg")}" alt="Photo illustrative d’un plat ouest-africain : riz jollof, tilapia grillé et légumes" width="1024" height="1024">
            <div class="shade"></div><div class="scan-grid" aria-hidden="true"></div><div class="scan-beam" aria-hidden="true"></div><div class="flash" aria-hidden="true"></div>
            <div class="frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <span class="image-tag">PLAT D’EXEMPLE</span><div class="markers" aria-hidden="true"></div>
            <div class="view-caption"><strong class="capture-title">Prêt pour la capture</strong><span class="capture-sub">Riz jollof · tilapia · légumes</span></div>
          </div>
          <div class="capture-controls"><button class="primary" data-action="scan">${icon("camera")}<span>Photographier & analyser</span></button><button class="upload" data-action="upload">${icon("upload")} Choisir une photo / caméra</button><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" class="sr-only" id="meal-file" aria-label="Choisir une photo de plat"></div>
          <p class="photo-note">Photo illustrative générée. Import local uniquement ; aucune image transmise.</p><p class="upload-feedback" role="status"></p>
          <fieldset class="portion-control"><legend>Portion de riz cuite · simulation</legend><label><input type="radio" name="rice-portion" value="standard" checked><span>150 g<small>Portion de référence</small></span></label><label><input type="radio" name="rice-portion" value="generous"><span>300 g<small>Portion augmentée</small></span></label></fieldset>
          <p class="field-help">Le calcul est mis à jour selon la portion choisie. La photo reste identique.</p>
        </section>
        <section class="analysis-panel panel" aria-labelledby="analysis-heading">
          <div class="panel-top"><h3 id="analysis-heading">Résultats nutritionnels</h3><span class="analysis-tag">EN ATTENTE</span></div>
          <div class="analysis-heading"><h4>Riz jollof, tilapia grillé et légumes</h4><p>Repas d’exemple · Afrique de l’Ouest</p></div>
          <div class="empty-state">${icon("nutrition")}<h4>Aucun résultat pour le moment</h4><p>Lancez l’analyse pour consulter les composants et les apports du repas.</p><ul><li>Portions et énergie par aliment</li><li>Macronutriments et répartition des groupes</li><li>Bilan et recommandations pratiques</li></ul></div>
          <div class="results" hidden>
            <div class="table-scroll"><table><caption>Composition du repas · valeurs d’exemple</caption><thead><tr><th scope="col">Aliment / groupe</th><th scope="col">Portion cuite</th><th scope="col">Énergie</th></tr></thead><tbody class="ingredient-list"></tbody></table></div>
            <div class="nutrition" hidden><div class="energy"><span>Énergie totale</span><strong><b class="kcal">0</b> <small>kcal</small></strong><span>Estimation pour cette portion</span></div><div class="macros"></div></div>
            <div class="distribution" hidden><h4>Répartition des groupes alimentaires</h4><p>Part de la masse cuite · pourcentages arrondis, non caloriques</p><div class="distribution-bar" aria-hidden="true"></div><ul class="distribution-legend"></ul></div>
            <div class="verdict" hidden></div>
          </div>
        </section>
      </div>
      <section class="recommendations-panel panel" aria-labelledby="recommendation-heading">
        <div class="panel-top"><div><h3 id="recommendation-heading" tabindex="-1">Recommandations nutritionnelles</h3><p class="panel-description">Ajustements proposés à partir des portions de cet exemple.</p></div><span class="section-number">03</span></div>
        <div class="recommendations-empty"><span class="pending-icon">${icon("plus")}</span><p>Les recommandations seront disponibles après l’analyse du repas.</p></div>
        <div class="recommendations-content" hidden><div class="recommendation-summary"></div><ol class="recommendation-list"></ol><div class="recommendation-action" hidden><p><strong>Comparer avant de modifier.</strong> Testez le scénario de référence sans changer la photo.</p><button class="primary" data-action="adjust-portion">Simuler avec 150 g de riz</button></div><div class="professional-note">${icon("shield")}<p><strong>À adapter à votre situation.</strong> Sans âge, activité, antécédents ou objectifs, ces conseils restent généraux. En cas de diabète, de maladie rénale, de grossesse ou de régime prescrit, faites valider les portions par un professionnel de santé.</p></div></div>
      </section>
      <details class="method"><summary>Méthode, confidentialité et limites</summary><p>Les ingrédients et leurs valeurs sont prédéfinis. Aucune image n’est envoyée à un serveur. Une photo importée reste locale et ne modifie pas les ingrédients de l’exemple.</p><p>Le bilan « plutôt équilibré » illustre une règle simplifiée : les trois groupes sont présents, avec au moins 40 % de légumes et au plus 40 % de féculents en masse cuite. Ce n’est ni une règle universelle ni une évaluation clinique. Les calories ne suffisent pas à juger l’équilibre.</p><p>Les estimations varient selon la recette, l’huile et les portions ; elles ne constituent pas un avis médical. Une véritable analyse nécessitera un modèle de reconnaissance, une base alimentaire validée et une confirmation des portions.</p></details>
    </div>`;
  };
})();
