/* ============================================================================
 * NutriApp Santé · moh-nutriapp-model.js
 * Préparation du state selon le mode (région / pays) et génération des districts.
 * ========================================================================== */
(function (global) {
  'use strict';
  const MOH = global.MOHNutriApp;
  if (!MOH) return;
  const C = MOH.COLORS;

  MOH.model = {};

  /* Génération des districts d'un pays (données cohérentes dérivées du pays) */
  function makeDistricts(country) {
    const names = MOH.DISTRICTS;
    const out = [];
    // Facteurs de variation déterministes (simule des différences inter-districts)
    const seeds = [0.92, 0.85, 1.08, 0.78, 1.15, 0.88, 0.95, 0.72, 1.1, 0.83, 1.02, 0.75];
    for (let i = 0; i < names.length; i++) {
      const k = seeds[i];
      out.push({
        code: country.code + '_' + i,
        name: names[i],
        adm: Math.round(country.adm * k / names.length * 1.2),
        guer: Math.min(0.98, Math.max(0.55, country.guer * (0.88 + (k - 0.7) * 0.2))),
        abandon: Math.max(0.02, Math.min(0.25, country.abandon ? country.abandon * (1.1 - (k - 0.7)) : 0.12)),
        deces: Math.max(0.005, Math.min(0.08, (country.deces || 0.03) * (1.2 - (k - 0.7) * 0.3))),
        depist: Math.max(0.2, Math.min(0.85, country.depist * (0.85 + (k - 0.7) * 0.25))),
        stocks: Math.max(15, Math.min(95, (country.stocks || 50) * (0.75 + (k - 0.7) * 0.4))),
        dhis2: Math.max(0.4, Math.min(0.99, country.dhis2 * (0.82 + (k - 0.7) * 0.3))),
        score: Math.max(15, Math.min(95, country.score * (0.7 + (k - 0.7) * 0.6)))
      });
    }
    return out;
  }

  function makeStockZones(country) {
    const bases = MOH.ATPE_STOCKS_ZONES.slice();
    return bases.map(b => {
      const delta = (country.score - 50) / 100 * 15;
      const jours = Math.max(10, Math.min(95, Math.round(b.jours + delta + (Math.random() - 0.5) * 8)));
      return { zone: b.zone, jours, cible: 60, etat: jours > 60 ? 'ok' : jours >= 45 ? 'warn' : jours >= 30 ? 'orange' : 'critique' };
    });
  }

  /* Construit l'état courant du dashboard */
  MOH.model.build = function (opts) {
    opts = opts || {};
    const mode = opts.mode || 'region';
    let country;
    if (mode === 'country') {
      country = MOH.COUNTRIES.find(c => c.code === opts.country) || MOH.COUNTRIES[0];
    }
    const districts = mode === 'country' ? makeDistricts(country) : null;
    const stockZones = mode === 'country' ? makeStockZones(country) : null;

    const region = MOH.REGION;
    const kpis = {};
    if (mode === 'region') {
      kpis.k1 = { value: MOH.fmtInt(region.adm), subLabel: 'Enfants dépistés & pris en charge via l\'application (16 pays)', badge: { kind: 'up', text: '↑ +12% vs mois passé (Pic soudure : +67%)' } };
      kpis.k2 = { value: MOH.fmtPctRaw(region.guer * 100, 1), subLabel: 'Seuil d\'urgence Sphère : ≥ 75%', badge: { kind: 'ok', text: '✓ Conforme Norme Sphère' }, gauge: region.guer, gaugeColor: C.tertiary };
      kpis.k3 = { value: region.rupture + ' structures', subLabel: 'Sur ' + MOH.fmtInt(region.totalStructures) + ' points de distribution suivis dans l\'App (' + (region.rupture / region.totalStructures * 100).toFixed(1) + '%)', badge: { kind: 'danger', text: '⚠ URGENT REAPPRO' } };
      kpis.k4 = { value: MOH.fmtPctRaw(region.depist * 100, 0), subLabel: 'Objectif national : 100% des consultations', badge: { kind: 'up', text: '↑ +8 pts vs 2023' }, gauge: region.depist, gaugeColor: C.quaternary };
      kpis.k5 = { value: MOH.fmtPctRaw(region.dhis2 * 100, 0), subLabel: 'Fiches d\'enquêtes synchronisées dans les 24h', badge: { kind: 'warn', text: '→ 7 régions < 60%' } };
    } else {
      // Comparaison régionale
      const avgGuer = region.guer;
      const deltaAdmPct = ((country.adm / 2000) / (region.adm / 16 / 2000) - 1) * 100;
      const deltaGuer = (country.guer - avgGuer) * 100;
      kpis.k1 = { value: MOH.fmtInt(country.adm), subLabel: 'Enfants dépistés & pris en charge via l\'application', badge: { kind: deltaAdmPct >= 0 ? 'up' : 'down', text: (deltaAdmPct >= 0 ? '↑ ' : '↓ ') + MOH.fmtPctRaw(Math.abs(deltaAdmPct),0) + ' vs moyenne régionale' } };
      kpis.k2 = { value: MOH.fmtPctRaw(country.guer * 100, 1), subLabel: 'Seuil d\'urgence Sphère : ≥ 75%', badge: { kind: country.guer >= 0.75 ? 'ok' : 'danger', text: country.guer >= 0.75 ? '✓ Conforme Norme Sphère (' + (deltaGuer >= 0 ? '+' : '') + deltaGuer.toFixed(1) + ' pts vs région)' : '⚠ En dessous du seuil Sphère' }, gauge: country.guer, gaugeColor: country.guer >= 0.75 ? C.tertiary : C.danger };
      kpis.k3 = { value: country.rupture + ' structures', subLabel: 'Points de distribution en alerte rupture sur le territoire', badge: { kind: country.rupture > 10 ? 'danger' : country.rupture > 4 ? 'warn' : 'ok', text: country.rupture > 10 ? '⚠ URGENT REAPPRO' : (country.rupture > 4 ? 'À surveiller' : '✓ Stocks corrects') } };
      kpis.k4 = { value: MOH.fmtPctRaw((country.depist || country.cpn || 0.4) * 100, 0), subLabel: 'Objectif national : 100% des CPN', badge: { kind: 'up', text: '↑ +8 pts vs 2023' }, gauge: country.depist || country.cpn || 0.4, gaugeColor: C.quaternary };
      kpis.k5 = { value: MOH.fmtPctRaw(country.dhis2 * 100, 0), subLabel: 'Fiches synchronisées dans les 24h', badge: { kind: country.dhis2 >= 0.75 ? 'ok' : 'warn', text: country.dhis2 >= 0.75 ? '✓ Bonne complétude' : '→ Améliorer la synchro terrain' } };
    }

    return {
      mode, country, districts, stockZones,
      kpis,
      breadcrumb: mode === 'region'
        ? 'Ministère de la Santé / NutriApp / ' + region.name
        : 'Ministère de la Santé / NutriApp / ' + country.name
    };
  };
})(window);
