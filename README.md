# Second Touch Atlas

A client-side React + TypeScript planning MVP for free six-week girls’ soccer cohorts across Georgia. Uses Vite and Leaflet. No backend, credentials, billing account, or paid API is required.

## Launch

Requires Node.js 22.12+ (or compatible newer Node).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To build and serve a production bundle:

```sh
npm run build
npm run preview
```

The included `dist/` is already built. For a no-install demonstration, serve it with `python3 -m http.server 8000 --directory dist` and open http://localhost:8000. Do not open index.html directly from the filesystem: data loading requires HTTP.

A pnpm lockfile is included for reproducible installs. With pnpm, run `pnpm install`, `pnpm dev`, and `pnpm test`.

## Three-minute demo

1. Open the Atlanta pilot. The initial view loads a labeled, precomputed example. Explain 3,000 allocated enrollments, 3,000 reserved places, 900 projected second-season registrations, and $180,000 delivery cost under the default assumptions. The 5,000 / 1,500 proposal targets remain reference markers.
2. Select Reduced budget. The actual heuristic recalculates the plan to fit $90,000. Set Coaches to 0 and Run updated plan to show an honest infeasible state. Restore the preset.
3. Select Statewide access. Explore all 159 counties, enable distance circles, and click a pitch or use field search. Exclude a recommended pitch and observe recalculation.
4. Compare methods. Select another method to update the map and all metrics. Scroll below the workspace for a side-by-side comparison table. No method is guaranteed to win.
5. Expand Saved scenarios, name and save the plan, change a preset, then load the saved result. It is explicitly labeled saved; Recalculate creates a fresh result.
6. Export plan to CSV. Use Print for a paper-friendly summary. Expand Methodology for source URLs, formulas, and limitations.

## Data and assumptions

- **Sourced:** 2020–2024 ACS five-year county statistics for all 159 Georgia counties, tract statistics for five core Atlanta counties, TIGER 2024 boundaries, and 1,479 actual OSM mapped soccer pitches. Retrieved October 25, 2026. The raw OSM snapshot timestamp is embedded in the dataset.
- **Estimated:** girls ages 6–14 = 80% of female ages 5–9 + female ages 10–14. Tract/county geometric centroids represent demand locations. Straight-line miles approximate access. ACS uncertainty is not propagated.
- **Illustrative operating assumptions:** all editable budgets, capacities, staffing ratios, take-up, retention, and costs. $300,000 delivery, $60 per place, and 30% registration are Team Dawgs proposal references. They are not validated costs or effects.
- The Atlanta preset covers Fulton, DeKalb, Cobb, Gwinnett, and Clayton; it is not the complete Atlanta MSA. Outside those five counties, one centroid per county greatly simplifies actual access. Required missing tract estimates are omitted, not invented.
- Private/no-access mapped pitches are unavailable. All other pitches remain unconfirmed, requiring permission, schedule, safety, and soccer-suitability checks. Multiple mapped pitches can belong to one venue.
- The $60 delivery envelope has no detailed component breakdown in the deck. The model does not additionally charge staff, fields, or equipment by default. Referee pay, training/certification, bags, and later-season subsidies from the broader approximately $1.6m proposal are outside this delivery model.
- Street tiles are optional and requested only for the visible map. No prefetching. Geometry, demographics, fields, and saved demo examples are local. Font fallbacks work offline.

## Model

`src/model.ts` is a replaceable, pure calculation layer. It allocates integer demand once across all waves, reserves the full cohort capacity and cost, caps unique fields, and limits staff per wave. A field has at most one cohort per wave. Higher-priority demand receives places first. Access selection maximizes marginal sum(enrollment × (1 + priority)) / cohort cost. Population first ranks total remaining demand reachable by each candidate. County rotation cycles alphabetically, skipping counties with no feasible option. Forced choices apply to each method and failures generate warnings.

Priority measures use within-scenario min/max normalization. Distance-based need uses the original non-unavailable candidate network, including excluded pitches, and stays fixed across methods. No existing-program dataset is claimed. All-zero weights produce equal access priority. None of these methods proves optimality.

## Data preparation

- `public/data/atlas.json`: cached model input.
- `public/data/counties.json`: cached map geography.
- `public/data/examples.json`: computed examples for the three presets.
- `public/data/sources.json`: source URLs, query, transformations, and limitations.
- `scripts/fetch-data.py`: optional standard-library downloader into `data-raw/`.
- `scripts/prepare-data.py`: transforms raw data separately from UI/model code.
- `scripts/cache-examples.ts`: rebuilds saved examples (`pnpm exec tsx scripts/cache-examples.ts`).

No refresh is required to run the demonstration. To refresh, retrieve sources, update retrieval dates, transform inputs, regenerate examples, run tests, and rebuild. Tract and county boundaries are accessed through Census Reporter. The direct Census API requested an API key; the Census Reporter public mirror worked without one.

## Checks

`npm test` runs focused checks for all methods: budget and cohort caps, per-wave staffing, field-wave uniqueness, duplicate demand, metric consistency, zero demand/staff/budget, weight sensitivity, unavailable forced pitches, exclusions, and zero-cost termination. `npm run build` includes TypeScript checking.

Browser checks cover desktop and narrow layouts, presets, zero staffing, stale results, comparison, field search/inspection/exclusion, local save/load, and CSV export. The heuristic results are scenarios for discussion, not field-booking recommendations.
