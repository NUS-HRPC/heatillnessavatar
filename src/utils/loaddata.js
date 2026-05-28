import { ref } from 'vue';
import { getSymptomColumns } from './dataParsing.js';
import { applyFiltersToData } from './filtering.js';
import {
  applyDayFilterToSymptoms,
  processTreemapData,
  // calculateMuscleDamage, // Temporarily disabled - biomarker columns filtered out
  computeRiskRatiosForTreemap,
} from './treemapUtils.js';
import { buildGraph } from './networkGraph.js';
import { handleTableSelection } from './tableUtils.js';
import { loadRuntimeData } from './runtimeData.js';

const selectedFields = ['Authors', 'Year', 'Title', 'Journal', 'PMID/DOI', 'Cases', 'Abstract'];

const state = {
  columns: ref([]),
  rows: ref([]),
  studies: ref([]),
  cases: ref([]),
  unique_symptoms: ref([]),
  affected_systems: ref([]),
  caseData: ref([]),
  symptomData: ref([]),
  treemapSelection: ref([]),
  nxgraphData: ref([]),
  treemapData: ref([]),
  tableData: ref([]),
  muscleDamageData: ref([]),
  NodeRef: ref([]),
  filteredCaseData: ref([]),
  filteredSymptomData: ref([]),
};

let prevDfTreemap = [];
let runtimeDataset = null;
let runtimeDatasetPromise = null;

function normalizeOutcomeValue(value) {
  const normalized = (value ?? '').toString().trim();
  if (!normalized) return 'NR';
  const lower = normalized.toLowerCase();
  if (lower === 'recovered') return 'Recovered';
  if (lower === 'passed away' || lower === 'passed_away') return 'Passed Away';
  return 'NR';
}

async function getRuntimeDataset() {
  if (runtimeDataset) {
    return runtimeDataset;
  }

  if (!runtimeDatasetPromise) {
    runtimeDatasetPromise = loadRuntimeData().then(({ caseData, symptomData }) => {
      const normalizedCases = caseData.map((row) => ({
        ...row,
        Outcome: normalizeOutcomeValue(row.Outcome),
      }));

      runtimeDataset = {
        caseData: normalizedCases,
        symptomData,
      };

      return runtimeDataset;
    });
  }

  return runtimeDatasetPromise;
}

export function useDataLoader() {
  async function fetchAndLoadData(filters = {}) {
    const { caseData, symptomData } = await getRuntimeDataset();

    const symptomCols = getSymptomColumns(symptomData);

    state.caseData.value = caseData;

    // Filter pipeline (matching Python ETL behavior):
    // 1. applyFiltersToData: Filters cases by age, sex, diagnosis, outcome, etc.
    //    - If days filter enabled, excludes cases with NO symptoms in day range
    // 2. applyDayFilterToSymptoms: Changes 'Y' to 'NR' for symptoms outside day range
    // 3. processTreemapData: Counts only 'Y' values with full 4-level hierarchy
    const filteredIndices = applyFiltersToData(caseData, filters);
    const filteredRows = filteredIndices.map((i) => ({ ...caseData[i] }));
    state.rows.value = filteredRows;

    const filteredCaseData = filteredIndices.map((i) => ({ index: i, ...caseData[i] }));

    const seen = new Set();
    const dfCaseForCount = filteredCaseData.filter((row) => {
      const sn = row.__studyKey ?? row['S/N'];
      if (seen.has(sn)) return false;
      seen.add(sn);
      return true;
    });
    state.studies.value = dfCaseForCount.length;
    state.cases.value = filteredCaseData.length;

    state.symptomData.value = symptomData;
    const filteredSymptoms = filteredIndices.map((i) => symptomData[i]);
    const dayAdjustedSymptoms = applyDayFilterToSymptoms(filteredSymptoms, symptomCols, filters);
    state.filteredSymptomData.value = dayAdjustedSymptoms;

    const riskRatioMap = computeRiskRatiosForTreemap(dayAdjustedSymptoms, filteredCaseData);

    const { occurrenceData, longFormatData, affectedSystems, uniqueSymptoms } = processTreemapData(
      filteredIndices,
      symptomData,
      caseData,
      symptomCols,
      filters
    );

    const treemapWithRisk = occurrenceData.map((entry) => {
      const levels = Object.keys(entry)
        .filter((k) => k.startsWith('Level'))
        .map((k) => entry[k])
        .filter((lvl) => lvl && lvl !== 'none');
      const path = levels.join('||');
      const risk = riskRatioMap.get(path) || {};
      return {
        ...entry,
        rr: risk.rr ?? null,
        rr_nr: risk.rr_nr ?? null,
      };
    });

    const dfTreemapChanged = JSON.stringify(prevDfTreemap) !== JSON.stringify(treemapWithRisk);
    if (dfTreemapChanged) {
      state.treemapSelection.value = [];
    }
    prevDfTreemap = [...treemapWithRisk];

    state.affected_systems.value = affectedSystems;
    state.unique_symptoms.value = uniqueSymptoms;

    const nxgraph = buildGraph(dayAdjustedSymptoms, state.treemapSelection.value);
    // const muscleDamageV = calculateMuscleDamage(longFormatData); // Temporarily disabled
    const muscleDamageV = { Male: 0, Female: 0 }; // Placeholder
    const filteredTable = handleTableSelection(filteredCaseData);

    state.columns.value = selectedFields.map((field) => ({ title: field, key: field }));
    state.filteredCaseData.value = filteredCaseData;

    return {
      treemapData: treemapWithRisk,
      tableData: filteredTable,
      nxgraphData: nxgraph,
      originalSymptomData: dayAdjustedSymptoms,
      mDamage: muscleDamageV,
    };
  }

  async function applyFilters(options = {}) {
    try {
      const {
        treemapData: tData,
        tableData: filteredTable,
        nxgraphData: nxgraph,
        originalSymptomData,
        mDamage: muscleDamageV,
      } = await fetchAndLoadData(options);

      state.treemapData.value = tData;
      state.tableData.value = filteredTable;
      state.nxgraphData.value = {
        ...nxgraph,
        originalSymptomData,
      };
      state.muscleDamageData.value = muscleDamageV;
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  }

  return {
    ...state,
    fetchAndLoadData,
    applyFilters,
    updateTreemapSelection: (selection) => {
      state.treemapSelection.value = [...selection];
      const nxgraph = buildGraph(state.filteredSymptomData.value, selection);
      state.nxgraphData.value = {
        ...nxgraph,
        originalSymptomData: state.symptomData.value,
      };
    },
  };
}

export { applyDayFilterToSymptoms } from './treemapUtils.js';
export { handleTableSelection, secondTable, FilterByNode } from './tableUtils.js';
