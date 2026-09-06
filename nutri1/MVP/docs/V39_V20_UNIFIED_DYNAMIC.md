# NUTRI.N°1 V39 — V20 Unified Dynamic Edition

V39 uses the V20 visual/interaction experience as the baseline and restores the dynamic layer without replacing the page structure.

Required dynamic pages:
1. Executive Home
2. Citizen Dashboard 360°
3. Connected Devices
4. AI Food & Meal Scanner
5. AI Nutrition & Prevention
6. Nutritionist Network
7. Healthy Food Marketplace
8. African Food Cloud
9. Ministry of Health Command Center
10. Ministry of Agriculture Food Intelligence
11. Research & Evidence Graph

Preserved:
- V20-style cards, navigation, layout and page structure
- V20-style charts and KPI presentation
- Country/language engine and localization package
- WHO and UNICEF buttons and dedicated pages
- V17-style Payments presentation and country-specific payment methods

V39 also removes stale calls to a missing legacy drawCharts() function that could cause navigation errors. The dynamic layer uses Chart.js when available and an SVG fallback when Chart.js is unavailable.
