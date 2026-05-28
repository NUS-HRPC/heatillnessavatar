const BASE_CASES_PATH = 'data/base/cases.json';
const BASE_SYMPTOMS_PATH = 'data/base/symptoms.json';
const CONTRIBUTIONS_MANIFEST_PATH = 'contributions/index.json';
const CONTRIBUTION_SCHEMA_VERSION = 1;

const CASE_DEFAULTS = {
  'S/N': '',
  Authors: '',
  Year: '',
  Title: '',
  Journal: '',
  'PMID/DOI': '',
  'Study Type': '',
  Abstract: '',
  Age: null,
  BMI: null,
  Temperature: null,
  Sex: '',
  Outcome: '',
  Diagnosis: '',
  HydrationStatus: '',
  'grouped_Activity Classification Activity Type (Case Type)': '',
  Rh: null,
  WBGT: null,
};

function normalizeBaseUrl(baseUrl = import.meta.env?.BASE_URL ?? '/') {
  if (!baseUrl) return '/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function buildRuntimeAssetUrl(path, baseUrl = import.meta.env?.BASE_URL ?? '/') {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = String(path ?? '').replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`;
}

function getFetcher(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Runtime data loading requires fetch.');
  }
  return fetchImpl;
}

async function fetchJsonAsset(path, options = {}) {
  const fetchImpl = getFetcher(options.fetchImpl);
  const url = buildRuntimeAssetUrl(path, options.baseUrl);
  const response = await fetchImpl(url);

  if (!response?.ok) {
    throw new Error(`Failed to load ${path}: ${response?.status ?? 'unknown status'}`);
  }

  return response.json();
}

function normalizeDaysObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...value };
}

function createStudyKey(row, bundleId) {
  return [
    bundleId,
    row['S/N'] ?? '',
    row.Authors ?? '',
    row.Year ?? '',
    row.Title ?? '',
    row.Journal ?? '',
    row['PMID/DOI'] ?? '',
  ].join('::');
}

function normalizeCaseRow(row, bundleId, rowIndex) {
  const normalized = {
    ...CASE_DEFAULTS,
    ...(row ?? {}),
  };

  normalized['Study Type'] = normalized['Study Type'] || normalized['Study type (case study/case series/XX)'] || '';
  normalized.Days = normalizeDaysObject(normalized.Days);
  normalized.__bundleId = bundleId;
  normalized.__rowIndex = rowIndex;
  normalized.__studyKey = createStudyKey(normalized, bundleId);

  return normalized;
}

function normalizeSymptomRow(row, bundleId, rowIndex, studyKey) {
  const normalized = { ...(row ?? {}) };
  normalized['S/N'] = normalized['S/N'] ?? '';
  normalized.days_map = normalizeDaysObject(normalized.days_map);
  normalized.__bundleId = bundleId;
  normalized.__rowIndex = rowIndex;
  normalized.__studyKey = studyKey;
  return normalized;
}

function getSymptomKeysFromRows(rows) {
  const keys = new Set();

  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (
        key === 'S/N' ||
        key === 'days_map' ||
        key.startsWith('__')
      ) {
        return;
      }
      keys.add(key);
    });
  });

  return [...keys];
}

function rectangularizeSymptomRows(rows) {
  const symptomKeys = getSymptomKeysFromRows(rows);

  return rows.map((row) => {
    const normalized = { ...row };
    symptomKeys.forEach((key) => {
      if (normalized[key] === undefined) {
        normalized[key] = 'NR';
      }
    });
    return normalized;
  });
}

function validateParallelData(cases, symptoms, label) {
  if (!Array.isArray(cases) || !Array.isArray(symptoms)) {
    throw new Error(`${label} cases and symptoms must both be arrays.`);
  }

  if (cases.length !== symptoms.length) {
    throw new Error(`${label} cases/symptoms length mismatch: ${cases.length} vs ${symptoms.length}.`);
  }
}

function normalizeParallelRows(cases, symptoms, bundleId, startingRowIndex) {
  return cases.map((caseRow, offset) => {
    const rowIndex = startingRowIndex + offset;
    const normalizedCase = normalizeCaseRow(caseRow, bundleId, rowIndex);
    const normalizedSymptom = normalizeSymptomRow(
      symptoms[offset],
      bundleId,
      rowIndex,
      normalizedCase.__studyKey
    );

    if (!normalizedCase['S/N'] && normalizedSymptom['S/N']) {
      normalizedCase['S/N'] = normalizedSymptom['S/N'];
      normalizedCase.__studyKey = createStudyKey(normalizedCase, bundleId);
      normalizedSymptom.__studyKey = normalizedCase.__studyKey;
    }

    if (!normalizedSymptom['S/N'] && normalizedCase['S/N']) {
      normalizedSymptom['S/N'] = normalizedCase['S/N'];
    }

    return {
      caseRow: normalizedCase,
      symptomRow: normalizedSymptom,
    };
  });
}

function isValidManifest(manifest) {
  return manifest && Array.isArray(manifest.bundles);
}

async function loadContributionManifest(options = {}) {
  try {
    const manifest = await fetchJsonAsset(CONTRIBUTIONS_MANIFEST_PATH, options);
    if (!isValidManifest(manifest)) {
      console.warn('Ignoring invalid contributions manifest.');
      return { schemaVersion: CONTRIBUTION_SCHEMA_VERSION, bundles: [] };
    }
    return manifest;
  } catch (error) {
    console.warn('Unable to load contributions manifest. Proceeding with base data only.', error);
    return { schemaVersion: CONTRIBUTION_SCHEMA_VERSION, bundles: [] };
  }
}

async function loadContributionBundles(manifest, options = {}, startingRowIndex = 0) {
  let nextRowIndex = startingRowIndex;
  const merged = [];

  for (const bundle of manifest.bundles) {
    const bundleId = bundle?.id || bundle?.path || `bundle-${nextRowIndex}`;
    if (!bundle?.path) {
      console.warn(`Skipping contribution bundle ${bundleId}: missing path.`);
      continue;
    }

    try {
      const payload = await fetchJsonAsset(bundle.path, options);
      validateParallelData(payload?.cases, payload?.symptoms, `Contribution bundle ${bundleId}`);

      const normalizedRows = normalizeParallelRows(
        payload.cases,
        payload.symptoms,
        bundleId,
        nextRowIndex
      );
      merged.push(...normalizedRows);
      nextRowIndex += normalizedRows.length;
    } catch (error) {
      console.warn(`Skipping contribution bundle ${bundleId}.`, error);
    }
  }

  return merged;
}

export async function loadRuntimeData(options = {}) {
  const [baseCases, baseSymptoms] = await Promise.all([
    fetchJsonAsset(BASE_CASES_PATH, options),
    fetchJsonAsset(BASE_SYMPTOMS_PATH, options),
  ]);

  validateParallelData(baseCases, baseSymptoms, 'Base dataset');

  const baseRows = normalizeParallelRows(baseCases, baseSymptoms, 'base', 0);
  const manifest = await loadContributionManifest(options);
  const contributionRows = await loadContributionBundles(manifest, options, baseRows.length);
  const combinedRows = [...baseRows, ...contributionRows];

  const symptomRows = rectangularizeSymptomRows(
    combinedRows.map((row) => row.symptomRow)
  );

  return {
    caseData: combinedRows.map((row) => row.caseRow),
    symptomData: symptomRows,
  };
}
