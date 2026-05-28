# Contribution Bundles

This folder contains runtime-loaded contribution bundles for the heat illness dataset.

This repo is the deploy-facing approval gate for contribution bundles. Upstream ETL and staging generation happen in `nexgen-treemap`, but only bundles committed here ship to the published app.

The app reads:

- [`index.json`](./index.json): manifest of approved bundles
- one JSON bundle file per approved contribution

If a pull request adds a new bundle and adds it to `index.json`, the built app will attempt to load it at runtime.

## Submission Workflow

To submit a dataset addition:

1. Create one new bundle JSON file in `public/contributions/`.
2. Add one entry for that file in `public/contributions/index.json`.
3. Check the runtime and review rules below.
4. Run `npm test` and `npm run build`.
5. Open a PR with the bundle, manifest update, and supporting notes.

Most public submissions should only need to touch `public/contributions/`. Frontend code changes are only needed if the submission also changes app behavior or requires new UI handling.

The app will:

- load the base dataset from `public/data/base/`
- load all bundles listed in `index.json`
- skip invalid bundles entirely
- merge valid bundles after the base dataset
- union symptom columns across all rows
- backfill missing symptom values as `NR`

## File Contract

### Required files

- Manifest: `public/contributions/index.json`
- Bundle: `public/contributions/<bundle-id>.json`

### Manifest schema

```json
{
  "schemaVersion": 1,
  "bundles": [
    {
      "id": "contrib-example",
      "path": "contributions/contrib-example.json"
    }
  ]
}
```

### Bundle format

```json
{
  "schemaVersion": 1,
  "id": "contrib-example",
  "cases": [
    {
      "S/N": "1",
      "Authors": "Example et al.",
      "Year": "2026",
      "Title": "Example study",
      "Journal": "Example Journal",
      "PMID/DOI": "PMID: NIL\nDOI: 10.1000/example",
      "Study Type": "Case report",
      "Abstract": "",
      "Age": 24,
      "BMI": null,
      "Temperature": 41.2,
      "Sex": "F",
      "Outcome": "Recovered",
      "Diagnosis": "EHS",
      "HydrationStatus": "NR",
      "grouped_Activity Classification Activity Type (Case Type)": "Military Training",
      "Rh": null,
      "WBGT": null,
      "Days": {
        "Nervous System||Brain||Consciousness State||Altered Conscious State": "1"
      }
    }
  ],
  "symptoms": [
    {
      "S/N": "1",
      "Nervous System||Brain||Consciousness State||Altered Conscious State": "Y",
      "days_map": {
        "Nervous System||Brain||Consciousness State||Altered Conscious State": "1"
      }
    }
  ]
}
```

## Runtime Rules

These are the requirements the loader actually depends on at runtime:

- `index.json` must parse as JSON and contain a `bundles` array.
- Each manifest entry should include a `path` that resolves under `public/contributions/`.
- Each bundle file must parse as JSON.
- `cases` must be an array.
- `symptoms` must be an array.
- `cases.length` must equal `symptoms.length`.
- `days_map` is normalized to `{}` when it is missing or not an object.
- `Days` is normalized to `{}` when it is missing or not an object.

If a listed bundle fails these checks or cannot be fetched, the app skips that bundle and continues loading the base dataset and any other valid bundles.

## Review Rules

These rules are part of the contribution contract even when the runtime does not strictly enforce every field:

- Use `schemaVersion: 1`.
- Keep the manifest `id`, bundle `id`, and file name aligned.
- Each `cases[i]` and `symptoms[i]` pair should describe the same case.
- Keep `cases[i]["S/N"]` and `symptoms[i]["S/N"]` aligned whenever `S/N` is present.
- Each symptom key should use the flattened hierarchy format `Level1||Level2||Level3||Level4`.
- Symptom presence values should be `Y`, `N`, or `NR`.
- `Days` and `days_map` should agree for symptom-day entries.
- Missing numeric values should usually be `null`.
- Missing free-text values should usually be an empty string.

### Recommended case fields

These fields should be present whenever the source data supports them:

- `S/N`
- `Authors`
- `Year`
- `Title`
- `Journal`
- `PMID/DOI`
- `Study Type`
- `Abstract`
- `Age`
- `BMI`
- `Temperature`
- `Sex`
- `Outcome`
- `Diagnosis`
- `HydrationStatus`
- `grouped_Activity Classification Activity Type (Case Type)`
- `Rh`
- `WBGT`
- `Days`

### Symptom key policy

- New symptom keys are allowed.
- The app will merge them into the global runtime schema.
- Older base rows and unrelated bundles will be backfilled with `NR` for those keys.

### Identity rules

- `S/N` does not need to be globally unique across bundles.
- Keep `S/N` correct relative to the source study.
- The app creates internal merge-safe identifiers automatically.

## Authoring Checklist

- File name is stable and descriptive, for example:
  `contrib-2026-example-study.json`
- `id` in the bundle matches the manifest entry.
- Manifest `path` matches the bundle file name exactly.
- `cases.length === symptoms.length`
- `cases[i]["S/N"]` matches `symptoms[i]["S/N"]` for each row whenever `S/N` is present
- `Days` and `days_map` agree for positive symptom-day entries
- Symptom keys use the `||` hierarchy format
- Bundle is valid JSON

## Submission Checklist

- Add the new bundle file under `public/contributions/`
- Add the new bundle entry to [`index.json`](./index.json)
- Run `npm test`
- Run `npm run build`
- Describe the data source in the PR body
- State whether the bundle introduces any new symptom keys
- State whether any fields were unavailable and left blank or `null`

## Failure Behavior

The runtime loader is fail-closed for contribution bundles:

- invalid bundles are skipped entirely
- valid bundles still load
- the base dataset still loads

This means a malformed contribution will not break the whole app, but it also will not appear in the merged dataset.

CI will catch broken tests and build failures, but it does not replace source-level review of the submitted data.

## Authoring Defaults

If an LLM or script is generating a contribution:

- prefer preserving source terminology exactly for bibliographic fields
- prefer `null` for missing numeric values
- prefer empty string for missing free-text fields
- prefer `NR` for unknown symptom presence
- prefer string day values inside `Days` and `days_map`
- do not add internal fields such as `__bundleId`, `__rowIndex`, or `__studyKey`; the app generates those
