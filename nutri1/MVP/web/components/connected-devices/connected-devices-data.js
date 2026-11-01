/* ============================================================================
 * NUTRI.N°1 — Connected Devices Lab · data model
 * ----------------------------------------------------------------------------
 * Pure data + physiological generators used by connected-devices.js.
 * No DOM access here: the module can be unit-tested in isolation.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* Data categories the citizen can grant or revoke (per-account consent). */
  var SCOPES = [
    {
      id: 'heart', icon: '❤️', loinc: '8867-4', fhir: 'Observation',
      label: { fr: 'Fréquence cardiaque', en: 'Heart rate' }, unit: 'bpm'
    },
    {
      id: 'glucose', icon: '🩸', loinc: '2339-0', fhir: 'Observation',
      label: { fr: 'Glycémie', en: 'Blood glucose' }, unit: 'mmol/L'
    },
    {
      id: 'bp', icon: '🩺', loinc: '85354-9', fhir: 'Observation (component)',
      label: { fr: 'Tension artérielle', en: 'Blood pressure' }, unit: 'mmHg'
    },
    {
      id: 'weight', icon: '⚖️', loinc: '29463-7', fhir: 'Observation',
      label: { fr: 'Poids', en: 'Body weight' }, unit: 'kg'
    },
    {
      id: 'steps', icon: '👣', loinc: '55423-8', fhir: 'Observation',
      label: { fr: 'Activité / pas', en: 'Activity / steps' }, unit: { fr: 'pas', en: 'steps' }
    },
    {
      id: 'sleep', icon: '😴', loinc: '93832-4', fhir: 'Observation',
      label: { fr: 'Sommeil', en: 'Sleep' }, unit: { fr: 'h', en: 'h' }
    }
  ];

  /* Devices shown in the catalogue. `scopes` = categories requested at pairing. */
  var DEVICES = [
    {
      id: 'apple-health', icon: '🍎', vendor: 'Apple', firmware: 'iOS 17.4 · HealthKit',
      name: { fr: 'Apple Health', en: 'Apple Health' },
      desc: {
        fr: 'Passerelle iOS HealthKit — pouls, pas, sommeil et poids agrégés depuis l’iPhone et la montre.',
        en: 'iOS HealthKit bridge — heart rate, steps, sleep and weight aggregated from iPhone and watch.'
      },
      transport: 'OAuth 2.0 + HealthKit',
      kind: 'platform', scopes: ['heart', 'steps', 'sleep', 'weight'],
      battery: null, signal: 3
    },
    {
      id: 'health-connect', icon: '🤖', vendor: 'Google', firmware: 'Health Connect 1.1',
      name: { fr: 'Health Connect', en: 'Health Connect' },
      desc: {
        fr: 'Passerelle Android Health Connect — agrégation des applications santé et sportives.',
        en: 'Android Health Connect bridge — aggregates health and fitness applications.'
      },
      transport: 'Android API + OAuth',
      kind: 'platform', scopes: ['heart', 'steps', 'sleep', 'glucose'],
      battery: null, signal: 2
    },
    {
      id: 'cgm', icon: '🩸', vendor: 'Dexcom', firmware: 'G7 · FW 2.4.1',
      name: { fr: 'Capteur de glucose (CGM)', en: 'Glucose sensor (CGM)' },
      desc: {
        fr: 'Capteur de glucose interstitiel — une mesure toutes les 5 minutes, alerte hypo/hyper.',
        en: 'Interstitial glucose sensor — one reading every 5 minutes, hypo/hyper alerts.'
      },
      transport: 'BLE 5.2',
      kind: 'sensor', scopes: ['glucose'], battery: 68, signal: 3
    },
    {
      id: 'bp', icon: '🩺', vendor: 'Omron', firmware: 'M6 Comfort · FW 1.8',
      name: { fr: 'Tensiomètre connecté', en: 'Connected blood pressure monitor' },
      desc: {
        fr: 'Tensiomètre brassard — systolique, diastolique et pouls à chaque mesure.',
        en: 'Cuff blood pressure monitor — systolic, diastolic and pulse on every reading.'
      },
      transport: 'BLE 5.0',
      kind: 'sensor', scopes: ['bp', 'heart'], battery: 82, signal: 2
    },
    {
      id: 'wearable', icon: '⌚', vendor: 'Garmin', firmware: 'Venu 3 · FW 12.2',
      name: { fr: 'Montre / bracelet connecté', en: 'Connected watch / band' },
      desc: {
        fr: 'Montre connectée — pouls continu, SpO₂, pas et qualité du sommeil.',
        en: 'Connected watch — continuous pulse, SpO₂, steps and sleep quality.'
      },
      transport: 'BLE 5.3',
      kind: 'sensor', scopes: ['heart', 'steps', 'sleep'], battery: 54, signal: 3
    },
    {
      id: 'scale', icon: '⚖️', vendor: 'Withings', firmware: 'Body+ · FW 3.1',
      name: { fr: 'Balance connectée', en: 'Smart scale' },
      desc: {
        fr: 'Balance impédancemètre — poids, masse grasse et hydratation à chaque pesée.',
        en: 'Body-composition scale — weight, fat mass and hydration on every weigh-in.'
      },
      transport: 'Wi-Fi + BLE',
      kind: 'sensor', scopes: ['weight'], battery: 91, signal: 1
    }
  ];

  /* Local gateways by country code (used by the HUD). */
  var GATEWAYS = {
    TG: { city: 'Lomé', flag: '🇹🇬' }, BJ: { city: 'Cotonou', flag: '🇧🇯' },
    BF: { city: 'Ouagadougou', flag: '🇧🇫' }, CV: { city: 'Praia', flag: '🇨🇻' },
    CI: { city: 'Abidjan', flag: '🇨🇮' }, GM: { city: 'Banjul', flag: '🇬🇲' },
    GH: { city: 'Accra', flag: '🇬🇭' }, GN: { city: 'Conakry', flag: '🇬🇳' },
    GW: { city: 'Bissau', flag: '🇬🇼' }, LR: { city: 'Monrovia', flag: '🇱🇷' },
    ML: { city: 'Bamako', flag: '🇲🇱' }, MR: { city: 'Nouakchott', flag: '🇲🇷' },
    NE: { city: 'Niamey', flag: '🇳🇪' }, NG: { city: 'Lagos', flag: '🇳🇬' },
    SN: { city: 'Dakar', flag: '🇸🇳' }, SL: { city: 'Freetown', flag: '🇸🇱' },
    TD: { city: "N'Djamena", flag: '🇹🇩' }, CM: { city: 'Yaoundé', flag: '🇨🇲' },
    CF: { city: 'Bangui', flag: '🇨🇫' }
  };

  /* Interoperability reference table (static, illustrative). */
  var INTEROP = [
    { scope: 'glucose', label: { fr: 'Glycémie capillaire', en: 'Capillary glucose' }, loinc: '2339-0', resource: 'Observation' },
    { scope: 'heart', label: { fr: 'Fréquence cardiaque', en: 'Heart rate' }, loinc: '8867-4', resource: 'Observation' },
    { scope: 'bp', label: { fr: 'Tension artérielle (composants)', en: 'Blood pressure (components)' }, loinc: '85354-9', resource: 'Observation' },
    { scope: 'weight', label: { fr: 'Poids corporel', en: 'Body weight' }, loinc: '29463-7', resource: 'Observation' },
    { scope: 'steps', label: { fr: 'Nombre de pas', en: 'Step count' }, loinc: '55423-8', resource: 'Observation' },
    { scope: 'sleep', label: { fr: 'Durée de sommeil', en: 'Sleep duration' }, loinc: '93832-4', resource: 'Observation' }
  ];

  /* Small helpers -------------------------------------------------------- */
  function rnd(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function round(v, d) {
    var f = Math.pow(10, d == null ? 1 : d);
    return Math.round(v * f) / f;
  }

  /* Stateful physiological generators — one instance per simulation. */
  function createGenerators(seed) {
    var s = {
      hr: 72 + rnd(-4, 4),
      spo2: 97.6,
      glucose: 5.4 + rnd(-0.6, 0.6),
      sys: 122, dia: 78,
      weight: 68.4,
      steps: 4820,
      sleep: 6.8,
      phase: 0
    };
    if (seed) s.hr = seed;

    return {
      /** Heart rate random walk with a slow circadian drift. */
      heart: function () {
        s.phase += 0.06;
        s.hr = clamp(s.hr + rnd(-1.4, 1.4) + Math.sin(s.phase) * 0.12, 58, 96);
        return round(s.hr, 0);
      },
      spo2: function () {
        s.spo2 = clamp(s.spo2 + rnd(-0.35, 0.35), 95.2, 99.4);
        return round(s.spo2, 1);
      },
      glucose: function () {
        /* Slow drift + post-meal excursions + the occasional correction dip,
           so the clinical threshold engine has something to detect. */
        var shock = 0;
        if (Math.random() < 0.05) shock = rnd(1.0, 3.2);        /* meal */
        if (Math.random() < 0.012) shock = -rnd(1.2, 2.4);      /* correction / fasting dip */
        s.glucose = clamp(s.glucose + rnd(-0.26, 0.22) - (s.glucose - 5.9) * 0.07 + shock, 2.9, 12.2);
        return round(s.glucose, 1);
      },
      bp: function () {
        s.sys = clamp(s.sys + rnd(-2.2, 2.2), 108, 148);
        s.dia = clamp(s.dia + rnd(-1.6, 1.6), 64, 96);
        return { sys: Math.round(s.sys), dia: Math.round(s.dia) };
      },
      weight: function () {
        s.weight = clamp(s.weight + rnd(-0.06, 0.06), 66.5, 71.5);
        return round(s.weight, 1);
      },
      steps: function () {
        s.steps += Math.round(rnd(8, 90));
        return s.steps;
      },
      sleep: function () {
        s.sleep = clamp(s.sleep + rnd(-0.04, 0.04), 5.4, 8.6);
        return round(s.sleep, 1);
      }
    };
  }

  /* Thresholds used by the alert engine. */
  var THRESHOLDS = {
    glucoseLow: 3.9,
    glucoseHigh: 7.8,
    glucoseCriticalHigh: 10.0,
    sysHigh: 140,
    diaHigh: 90
  };

  /* Merge a catalogue device with its live simulation fields. */
  function instantiate(device) {
    return {
      id: device.id,
      icon: device.icon,
      vendor: device.vendor,
      firmware: device.firmware,
      name: device.name,
      desc: device.desc,
      transport: device.transport,
      kind: device.kind,
      scopes: device.scopes.slice(),
      battery: device.battery,
      signal: device.signal,
      status: 'offline',
      progress: 0,
      phase: '',
      imported: 0,
      lastValue: null,
      lastUnit: '',
      lastAt: null,
      lastSync: null,
      failures: 0
    };
  }

  global.NUTRI_DEVICES_SIM_DATA = {
    version: '1.0.0',
    scopes: SCOPES,
    devices: DEVICES,
    gateways: GATEWAYS,
    interop: INTEROP,
    thresholds: THRESHOLDS,
    instantiate: instantiate,
    createGenerators: createGenerators,
    helpers: { rnd: rnd, clamp: clamp, round: round }
  };
})(window);
