# NUTRI.N°1 V33 — Production Localization System

V33 replaces automatic text detection with explicit i18n keys.

## Architecture

- `/web/locales/en.json` — canonical English
- `/web/locales/fr.json` — French
- `/web/locales/es.json` — Spanish
- `/web/locales/ewe.json` — Ewe
- `/web/locales/kab.json` — Kabyè
- `/web/locales/manifest.json` — locale registry
- `/web/locales/coverage-report.json` — translation coverage audit

## Static UI

Every converted visible text node in the HTML is represented by an explicit `data-i18n="ui.*"` key.

## Dynamic UI

Application code must use:

`NUTRI_I18N.t("ui.key")`

or:

`NUTRI_I18N.renderModule(container)`

after rendering a dynamic module.

This avoids the previous failure mode where translating a text node once prevented subsequent language switches from finding the canonical source.

## Official languages

English, French and Spanish are first-class locales. Togo's default can be French, while Ewe and Kabyè remain available as local-language options.

## Production localization

New features must add their strings to all relevant locale JSON files before release. A CI validation step should fail the build when a required key is missing from a production locale.
