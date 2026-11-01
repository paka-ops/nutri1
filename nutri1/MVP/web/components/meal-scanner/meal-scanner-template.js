(function () {
  "use strict";
  const icon = (name) => {
    const paths = {
      camera:
        '<path d="M14 4h-4L8 7H4a2 2 0 0 0-2 2v10h20V9a2 2 0 0 0-2-2h-4z"/><circle cx="12" cy="13" r="4"/>',
      upload: '<path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>',
      arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      leaf: '<path d="M20 3C6 1 1 9 6 16s16 0 14-13ZM4 21 16 9"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  };
  window.NUTRI_MEAL_TEMPLATE = function (asset) {
    return `<link rel="stylesheet" href="${asset("meal-scanner.css")}">
    <article class="scanner" lang="fr" data-state="ready">
      <header class="intro"><div><p class="eyebrow">NUTRI VISION <span>FOOD INTELLIGENCE</span></p>
      <h2>Votre assiette.<br><em>Une nouvelle perspective.</em></h2>
      <p class="lead">Du plat à la connaissance : découvrez ce qui nourrit votre corps, en un scan.</p></div>
      <span class="demo-badge"><i></i> Démonstration interactive</span></header>
      <div class="workspace">
        <div class="capture-panel">
          <div class="panel-top"><span><i class="live-dot"></i> VUE DU PLAT</span><span>01 / CAPTURE</span></div>
          <div class="viewfinder">
            <img class="meal-photo" src="${asset("assets/african-meal.jpg")}" alt="Photo illustrative d’un plat ouest-africain : riz jollof, tilapia grillé et légumes" width="1024" height="1024">
            <div class="shade"></div><div class="scan-grid" aria-hidden="true"></div><div class="scan-beam" aria-hidden="true"></div><div class="flash" aria-hidden="true"></div>
            <div class="frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <span class="image-tag">AFRIQUE DE L’OUEST · PLAT D’EXEMPLE</span>
            <div class="markers" aria-hidden="true"></div>
            <div class="view-caption"><span class="target-icon">＋</span><strong class="capture-title">Une assiette, toute une histoire.</strong><span class="capture-sub">Cadrez. Photographiez. Explorez.</span></div>
          </div>
          <div class="capture-controls"><button class="primary" data-action="scan">${icon("camera")}<span>Photographier & analyser</span>${icon("arrow")}</button>
          <button class="upload" data-action="upload">${icon("upload")} Choisir une photo / caméra</button>
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" class="sr-only" id="meal-file" aria-label="Choisir une photo de plat"></div>
          <p class="photo-note">Photo illustrative générée. L’analyse est simulée, pas une reconnaissance réelle.</p>
          <p class="upload-feedback" role="status"></p>
        </div>
        <div class="analysis-panel">
          <div class="panel-top"><span>${icon("leaf")} DANS VOTRE ASSIETTE</span><span class="analysis-tag">EN ATTENTE</span></div>
          <div class="analysis-heading"><h3>Riz jollof & tilapia</h3><p>Un classique ouest-africain, un regard nutritionnel.</p></div>
          <ol class="timeline" aria-label="Étapes de la démonstration"><li data-step="0"><b>01</b><span>Capture</span></li><li data-step="1"><b>02</b><span>Ingrédients</span></li><li data-step="2"><b>03</b><span>Nutrition</span></li></ol>
          <div class="status-line"><span class="scan-status" role="status" aria-live="polite">Prêt à explorer votre plat ?</span><span class="percent" aria-hidden="true">0 %</span></div>
          <div class="progress" role="progressbar" aria-label="Analyse simulée" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"><i></i></div>
          <div class="empty-state">${icon("leaf")}<h4>Le bon réflexe commence ici.</h4><p>Lancez la capture pour révéler les ingrédients, les calories et l’équilibre du repas.</p><div class="empty-pills"><span>Ingrédients</span><span>Calories</span><span>Équilibre</span></div></div>
          <div class="results" hidden>
            <div class="result-heading"><h4>Les composants du plat</h4><span>Portions d’exemple</span></div>
            <ul class="ingredient-list"></ul>
            <div class="nutrition" hidden><div class="energy"><span>ÉNERGIE ESTIMÉE</span><strong><b class="kcal">0</b> <small>kcal</small></strong><span>pour cette assiette d’exemple</span></div><div class="macros"></div></div>
            <div class="verdict" hidden></div>
          </div>
        </div>
      </div>
      <footer class="experiment"><div><span class="eyebrow">ET SI ON CHANGEAIT LA PORTION ?</span><h3>Même recette. Nouvel équilibre.</h3><p>Comparez deux portions de riz : les résultats changent, pas la photo.</p></div><fieldset><legend>Portion de riz cuite</legend><label><input type="radio" name="rice-portion" value="standard" checked> 150 g <span>· classique</span></label><label><input type="radio" name="rice-portion" value="generous"> 300 g <span>· généreuse</span></label></fieldset></footer>
      <details class="method"><summary>Comprendre cette démonstration et ses limites</summary><p>Les ingrédients et leurs valeurs sont prédéfinis. Aucune image n’est envoyée à un serveur. Une photo importée reste locale et ne modifie pas les ingrédients de l’exemple.</p><p>Le bilan « plutôt équilibré » illustre une règle simplifiée : les trois groupes sont présents, avec au moins 40 % de légumes et au plus 40 % de féculents en masse cuite. Ce n’est ni une règle universelle ni une évaluation clinique. Les calories ne suffisent pas à juger l’équilibre.</p><p>Les estimations varient selon la recette, l’huile et les portions ; elles ne constituent pas un avis médical. Une véritable analyse nécessitera un modèle de reconnaissance, une base alimentaire validée et une confirmation des portions.</p></details>
    </article>`;
  };
})();
