# Heat Illness Avatar

Canonical application and deployment repo for the heat illness treemap SPA. This repo owns the Vue/Vite app, committed runtime JSON, contribution approval manifest, tests, and GitHub Pages deployment.

Upstream ETL remains in `nexgen-treemap`. Data updates are generated there and then copied here in a separate reviewable PR.

## What Is In This Repo

- `src/`: production SPA source
- `public/data/base/`: deployable base runtime JSON
- `public/contributions/`: deployable contribution manifest and approved bundles
- `tests/`: Node-based unit tests for runtime loading and transformation helpers
- `.github/workflows/`: CI and GitHub Pages deployment workflows

## Runtime Data Loading

The app fetches runtime assets from `public/`, which Vite copies into `dist/` during build:

- base dataset: `public/data/base/cases.json` and `public/data/base/symptoms.json`
- approved contribution manifest: `public/contributions/index.json`
- approved contribution bundles: `public/contributions/*.json`

This repo is the production approval gate for those files. The deployed app will load only what is committed here.

## SPA Overview

The application entry point is [`src/App.vue`](./src/App.vue). It renders:

- cohort filters for sex, diagnosis, outcome, hydration, activity type, age, temperature, BMI, relative humidity, WBGT, and day range
- summary cards for studies, cases, affected systems, and unique symptoms
- a symptom treemap
- a co-occurrence network or bar chart derived from the current selection
- study tables and abstract detail views

The main runtime flow is:

1. Load base data from `public/data/base/`.
2. Load approved bundles from `public/contributions/index.json`.
3. Normalize and merge base plus contribution rows.
4. Apply cohort and day filters.
5. Rebuild treemap counts, risk ratios, graph edges, and table state.

If a contribution bundle is malformed, the loader skips it and continues with the remaining valid data.

## ETL Handoff

This repo does not run the upstream notebook. The handoff is manual by design:

1. Regenerate or review JSON outputs in `nexgen-treemap`.
2. Copy approved files into this repo:
   - `public/data/base/cases.json`
   - `public/data/base/symptoms.json`
   - `public/contributions/index.json`
   - `public/contributions/*.json` when contribution bundles change
3. Open a PR here so CI verifies the app against the new data before deploy.

## Contribution Contract

`public/contributions/index.json` is the deploy-facing approval gate for bundles on static hosting.

- Each manifest entry points to a runtime JSON file under `public/contributions/`.
- Bundle files are expected to use the shape `{ "schemaVersion": 1, "id": "contrib-foo", "cases": [...], "symptoms": [...] }`.
- Base `cases.json` and `symptoms.json` must stay index-aligned.
- Contribution `cases` and `symptoms` arrays must also stay index-aligned.
- Runtime aggregation unions symptom keys across base data and approved contributions and backfills missing keys as `NR`.
- A contribution is deployable only when both the bundle file and its manifest entry are committed here.

Full authoring guidance lives in [`public/contributions/README.md`](./public/contributions/README.md).

## Public Contributions

External data submissions should be opened as pull requests against this repo.

Typical contribution-only PRs change:

- `public/contributions/index.json`
- `public/contributions/<bundle-id>.json`

Each PR should also explain:

- the source dataset or paper
- whether the bundle adds new symptom keys
- whether any important fields were unavailable and left blank or `null`

Before opening the PR, run:

```bash
npm test
npm run build
```

The runtime loader will skip malformed bundles instead of breaking the app, but reviewers still expect submissions to follow the authoring contract in [`public/contributions/README.md`](./public/contributions/README.md).

## Local Development

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm test
npm run build
npm run preview
```

When running locally, edits under `public/data/base/` and `public/contributions/` affect runtime data without changing source imports.

## CI/CD

- Pull requests run `npm ci`, `npm test`, and `npm run build`.
- Pushes to `main` run the same checks, upload the generated `dist/` as a GitHub Pages artifact, and deploy.
- `dist/` is a CI-generated artifact and is not committed.

## Notes

- The Vite base path remains `/heatillnessavatar/` for GitHub Pages hosting.
- Some labels and color maps are hard-coded to the current symptom taxonomy. If ETL output changes system names, review the frontend mappings in the same change set.
