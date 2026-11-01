/* Module isolé : ni les styles ni les anciens moteurs de simulation de la page
   ne traversent le Shadow DOM. Une seule séquence annulable à la fois. */
(function () {
  "use strict";
  const scriptURL = document.currentScript.src;
  const asset = (path) => new URL(path, scriptURL).href;
  const mount = document.getElementById("mealScanner");
  if (!mount || mount.shadowRoot) return;
  const root = mount.attachShadow({ mode: "open" });
  root.innerHTML = window.NUTRI_MEAL_TEMPLATE(asset);
  const q = (selector) => root.querySelector(selector);
  const qa = (selector) => [...root.querySelectorAll(selector)];
  let timers = [],
    busy = false,
    completed = false,
    importedURL = null,
    importVersion = 0;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = q(".scanner");
  const scanButton = q('[data-action="scan"]');
  const portion = () => q('input[value="generous"]').checked;
  const later = (fn, delay) =>
    timers.push(setTimeout(fn, reduced.matches ? Math.min(delay, 80) : delay));
  function cancel() {
    timers.forEach(clearTimeout);
    timers = [];
    busy = false;
  }
  function progress(value, message, step) {
    q(".progress").setAttribute("aria-valuenow", String(value));
    q(".progress i").style.width = value + "%";
    q(".percent").textContent = value + " %";
    q(".scan-status").textContent = message;
    qa(".timeline li").forEach((li, i) => {
      li.classList.toggle("active", i === step);
      li.classList.toggle("done", i < step);
      if (i === step) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
  }
  function renderIngredients() {
    const meal = window.NUTRI_MEAL_DATA.meal(portion());
    q(".ingredient-list").innerHTML = meal.items
      .map(
        (item, i) =>
          `<tr style="--delay:${i * 110}ms"><th scope="row"><div class="ingredient-name"><span class="ingredient-number">0${i + 1}</span><div><strong>${item.name}</strong><small>${item.group}</small></div></div></th><td>${item.grams} g</td><td>${item.kcal} kcal</td></tr>`,
      )
      .join("");
    // Les repères ne prétendent jamais localiser les aliments d'une photo importée.
    q(".markers").innerHTML = importedURL
      ? ""
      : meal.items
          .map(
            (item, i) =>
              `<span class="marker" style="left:${item.x}%;top:${item.y}%;--item-color:${item.color}"><i>0${i + 1}</i>${item.name}</span>`,
          )
          .join("");
    q(".empty-state").hidden = true;
    q(".results").hidden = false;
  }
  function renderNutrition() {
    const meal = window.NUTRI_MEAL_DATA.meal(portion());
    q(".nutrition").hidden = false;
    q(".kcal").textContent = meal.totals.kcal;
    q(".macros").innerHTML = [
      ["Protéines", "protein"],
      ["Glucides", "carbs"],
      ["Lipides", "fat"],
      ["Fibres", "fiber"],
    ]
      .map(
        ([label, key]) =>
          `<div><span>${label}</span><b>${meal.totals[key]} <small>g</small></b></div>`,
      )
      .join("");
    q(".distribution").hidden = false;
    q(".distribution-bar").innerHTML = meal.distribution
      .map(
        (group) =>
          `<i style="flex:${group.grams};background:${group.color}"></i>`,
      )
      .join("");
    q(".distribution-legend").innerHTML = meal.distribution
      .map(
        (group) =>
          `<li><i style="background:${group.color}" aria-hidden="true"></i>${group.name} <strong>${group.percent} %</strong></li>`,
      )
      .join("");
    renderRecommendations(meal);
    q(".verdict").hidden = false;
    q(".verdict").classList.toggle("warning", !meal.balanced);
    q(".verdict").innerHTML =
      `<span class="verdict-icon">${meal.balanced ? "✓" : "!"}</span><div><span>BILAN PÉDAGOGIQUE · PORTIONS D’EXEMPLE</span><h4>${meal.balanced ? "Une assiette plutôt équilibrée" : "Une assiette à rééquilibrer"}</h4><p>${meal.balanced ? "Féculents, protéines et légumes : les trois groupes sont présents dans des proportions variées." : "La portion de riz prend le dessus. Revenez à 150 g de riz ou augmentez la part de légumes pour retrouver les proportions de cet exemple."}</p></div>`;
  }
  function renderRecommendations(meal) {
    const advice = window.NUTRI_MEAL_DATA.recommendations(meal);
    q(".recommendations-empty").hidden = true;
    q(".recommendations-content").hidden = false;
    q(".recommendation-summary").textContent = advice.summary;
    q(".recommendation-summary").classList.toggle("warning", !meal.balanced);
    q(".recommendation-list").innerHTML = advice.items
      .map(
        (item) =>
          `<li><span class="recommendation-category">${item.category}</span><h4>${item.title}</h4><p>${item.detail}</p></li>`,
      )
      .join("");
    q(".recommendation-action").hidden = !advice.adjustable;
  }
  function idle(message) {
    cancel();
    completed = false;
    state.dataset.state = "ready";
    q(".results").hidden = true;
    q(".nutrition").hidden = true;
    q(".verdict").hidden = true;
    q(".distribution").hidden = true;
    q(".recommendations-empty").hidden = false;
    q(".recommendations-content").hidden = true;
    q(".empty-state").hidden = false;
    q(".markers").innerHTML = "";
    q(".analysis-tag").textContent = "EN ATTENTE";
    q(".capture-title").textContent = "Prêt pour la capture";
    q(".capture-sub").textContent = "Riz jollof · tilapia · légumes";
    scanButton.querySelector("span").textContent = "Photographier & analyser";
    scanButton.disabled = false;
    q(".analysis-panel").setAttribute("aria-busy", "false");
    progress(0, message || "En attente de la capture du repas.", -1);
  }
  function scan() {
    if (busy) return;
    idle();
    busy = true;
    state.dataset.state = "capturing";
    q(".analysis-panel").setAttribute("aria-busy", "true");
    scanButton.disabled = true;
    scanButton.querySelector("span").textContent = "Analyse de démonstration…";
    q(".analysis-tag").textContent = "SIMULATION EN COURS";
    q(".capture-title").textContent = "Capture du plat…";
    q(".capture-sub").textContent = importedURL
      ? "Votre photo · résultats d’exemple uniquement"
      : "Riz jollof, tilapia & légumes";
    progress(8, "01 / Capture de la photo…", 0);
    later(() => {
      state.dataset.state = "scanning";
      q(".capture-title").textContent = "Analyse de la composition";
      progress(30, "02 / Identification simulée des composants…", 1);
    }, 850);
    later(() => {
      renderIngredients();
      progress(64, "Trois composants d’exemple révélés.", 1);
    }, 2200);
    later(() => {
      progress(84, "03 / Calcul des valeurs pour les portions d’exemple…", 2);
      q(".capture-title").textContent = "Calcul des apports nutritionnels";
    }, 3500);
    later(() => {
      renderNutrition();
      completed = true;
      busy = false;
      timers = [];
      state.dataset.state = "complete";
      q(".analysis-panel").setAttribute("aria-busy", "false");
      q(".analysis-tag").textContent = "BILAN DISPONIBLE";
      q(".capture-title").textContent = "Analyse simulée terminée";
      q(".capture-sub").textContent = "Valeurs illustratives · à confirmer";
      progress(
        100,
        "Analyse terminée. Bilan et recommandations disponibles.",
        4,
      );
      scanButton.disabled = false;
      scanButton.querySelector("span").textContent = "Relancer l’analyse";
    }, 4700);
  }
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "scan") scan();
    if (button.dataset.action === "adjust-portion" && completed) {
      q('input[value="standard"]').checked = true;
      q('input[value="standard"]').dispatchEvent(
        new Event("change", { bubbles: true }),
      );
      q("#recommendation-heading").focus({ preventScroll: true });
    }
    if (button.dataset.action === "upload") q("#meal-file").click();
    if (button.dataset.action === "restore") {
      importVersion++;
      if (importedURL) URL.revokeObjectURL(importedURL);
      importedURL = null;
      q(".meal-photo").src = asset("assets/african-meal.jpg");
      q(".meal-photo").alt =
        "Photo illustrative : riz jollof, tilapia grillé et légumes";
      q(".image-tag").textContent = "PLAT D’EXEMPLE";
      q(".upload-feedback").replaceChildren();
      q("#meal-file").value = "";
      idle();
    }
  });
  root.addEventListener("change", (event) => {
    if (event.target.name === "rice-portion") {
      if (busy) idle("Portion modifiée. Relancez la simulation.");
      else if (completed) {
        renderIngredients();
        renderNutrition();
        q(".scan-status").textContent =
          "Bilan et recommandations recalculés avec la nouvelle portion de riz.";
      }
    }
  });
  q("#meal-file").addEventListener("change", (event) => {
    // Un événement issu d'un Shadow DOM peut perdre sa cible après dispatch.
    const input = event.currentTarget;
    const file = input.files[0];
    if (!file) return;
    const version = ++importVersion;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      q(".upload-feedback").textContent =
        "Choisissez une image JPEG, PNG ou WebP de 10 Mo maximum.";
      input.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (version !== importVersion) {
        URL.revokeObjectURL(url);
        return;
      }
      if (importedURL) URL.revokeObjectURL(importedURL);
      importedURL = url;
      q(".meal-photo").src = url;
      q(".meal-photo").alt = "Votre photo locale, non analysée par une IA";
      q(".image-tag").textContent = "PHOTO LOCALE · AUCUNE RECONNAISSANCE IA";
      q(".upload-feedback").innerHTML =
        'Photo locale affichée. Les résultats resteront ceux du plat d’exemple. <button class="text-button" data-action="restore">Revenir au plat d’exemple</button>';
      idle("Photo prête. La simulation utilisera les ingrédients d’exemple.");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      if (version === importVersion) {
        q(".upload-feedback").textContent =
          "Cette image est illisible. Essayez un autre fichier.";
        input.value = "";
      }
    };
    image.src = url;
  });
  // Suspendre une séquence quittée, sans modifier la navigation de la plateforme.
  const section = mount.closest("section");
  new MutationObserver(() => {
    if (!section.classList.contains("on") && busy)
      idle("Simulation interrompue. Vous pouvez la relancer.");
  }).observe(section, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && busy)
      idle("Simulation en pause. Relancez-la à votre retour.");
  });
  window.addEventListener("pagehide", (event) => {
    if (busy) idle("Simulation interrompue. Vous pouvez la relancer.");
    else cancel();
    // Le cache de navigation conserve le DOM et donc sa photo locale.
    if (!event.persisted) {
      importVersion++;
      if (importedURL) {
        URL.revokeObjectURL(importedURL);
        importedURL = null;
      }
    }
  });
})();
