/* Audit statique du dictionnaire du module #ai : parité FR/EN et couverture.
   Aucun réseau, aucun DOM : lit les sources et relève les clés référencées.
   Usage : node ai-prevention-i18n-audit.js   (code retour 1 si anomalie) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = path.resolve(__dirname, '../../nutri1/MVP/web/components/ai-prevention');
const FILES = ['ai-prevention-template.js', 'ai-prevention.js', 'ai-prevention-charts.js',
  'ai-prevention-model.js', 'ai-prevention-data.js'];

/* --- 1. Dictionnaire réel, chargé comme dans le navigateur -------------------- */
const sandbox = {
  window: {},
  document: { documentElement: { setAttribute() { }, getAttribute() { return null; } }, addEventListener() { } },
  localStorage: { getItem: () => null, setItem() { }, removeItem() { } },
  addEventListener() { }
};
sandbox.window = sandbox;
sandbox.window.document = sandbox.document;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(DIR, 'ai-prevention-i18n.js'), 'utf8'), sandbox);

const I = sandbox.AIP_I18N;
if (!I || !I.strings) { console.error('AIP_I18N.strings introuvable'); process.exit(2); }
const dict = I.strings;
const fr = Object.keys(dict.fr);
const en = Object.keys(dict.en);

/* --- 2. Clés référencées dans les sources ------------------------------------- */
/*
   Trois formes coexistent dans le code :
     a) t('ai.risk.diabetes')                      → littéral
     b) t('ai.day.' + key), t(`ai.q.${q}`)         → famille concaténée
     c) { labelKey: 'ai.sensors.glucose' } puis t(cfg.labelKey)  → littéral « nu »
   On relève donc TOUT littéral en forme de clé, plus les préfixes concaténés,
   au lieu de recopier un domaine fermé qui se désynchronise dès qu'on ajoute une valeur.
*/
const used = new Set();
const prefixes = new Set();
const literalKey = /['"`](ai\.[a-z0-9_.]*)['"`]/gi;
const concatKey = /\bt\(\s*['"`](ai\.[a-z0-9_.]*)['"`]\s*\+/gi;
for (const file of FILES) {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  let m;
  while ((m = literalKey.exec(src))) {
    const key = m[1];
    if (key.endsWith('.')) prefixes.add(key);       // base de concaténation
    else used.add(key);
  }
  while ((m = concatKey.exec(src))) prefixes.add(m[1]);
  while ((m = /\bt\(\s*`(ai\.[a-z0-9_.]*)\$\{/gi.exec(src))) prefixes.add(m[1]);
}

const isFamilyBase = (k) => k.endsWith('.');
const referenced = (k) => used.has(k) || [...prefixes].some((p) => k.startsWith(p) && k !== p);

/* --- 3. Contrôles ------------------------------------------------------------- */
const missing = [...used].filter((k) => !(k in dict.fr) || !(k in dict.en));
const brokenFamilies = [...prefixes].filter((p) => !fr.some((k) => k.startsWith(p)));
const onlyFr = fr.filter((k) => !(k in dict.en));
const onlyEn = en.filter((k) => !(k in dict.fr));
const unused = fr.filter((k) => !referenced(k) && !isFamilyBase(k));

console.log('clés littérales :', used.size, '| familles concaténées :', prefixes.size);
console.log('clés FR :', fr.length, '| clés EN :', en.length);
console.log('manquantes :', missing.length ? missing : 'aucune');
console.log('familles sans aucune clé :', brokenFamilies.length ? brokenFamilies : 'aucune');
console.log('FR sans EN :', onlyFr.length ? onlyFr : 'aucune');
console.log('EN sans FR :', onlyEn.length ? onlyEn : 'aucune');
console.log('déclarées mais jamais référencées :', unused.length ? unused : 'aucune');

const bad = missing.length || brokenFamilies.length || onlyFr.length || onlyEn.length;
process.exit(bad ? 1 : 0);
