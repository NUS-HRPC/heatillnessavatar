import { ref, onMounted, watch, computed, onUnmounted } from 'vue';
import { debounce, throttle } from 'lodash-es';
import { useDataLoader, secondTable, FilterByNode } from '@/utils/loaddata';
import { getTopSymptomsByCount, getTopSymptomsByRiskRatio, formatSymptomName } from '@/utils/topSymptoms';


export function MainDashboard() {
  // define all filter options, need change if data change
  const filters = ref({
    Sex: {
      enabled: false,
      model: ['F', 'M', 'NR'],
      type: 'checkbox',
      options: ['F', 'M', 'NR'],
    },
    Diagnosis: {
      enabled: false,
      model: ['EHS', 'EHI', 'OTHER'],
      type: 'checkbox',
      options: ['EHS', 'EHI', 'OTHER'],
    },
    Outcome: {
      enabled: false,
      model: ['Recovered', 'Passed Away', 'NR'],
      type: 'checkbox',
      options: ['Recovered', 'Passed Away', 'NR'],
    },
    HydrationStatus: {
      enabled: false,
      model: ['Hydrated', 'Hypohydrated', 'NR'],
      type: 'checkbox',
      options: ['Hydrated', 'Hypohydrated', 'NR'],
    },
    ActivityType: {
      enabled: false,
      model: [
        'Military Training',
        'Physical activity/Training/Exercise',
        'Occupational Outdooor Physical Work',
        'Occupational Indoor Physical Work',
        'Refugee Movement/ Forced Migration',
        'Physical activity (Unspecified)',
        'Physical Work',
        'NR',
      ],
      type: 'checkbox',
      options: [
        'Military Training',
        'Physical activity/Training/Exercise',
        'Occupational Outdooor Physical Work',
        'Occupational Indoor Physical Work',
        'Refugee Movement/ Forced Migration',
        'Physical Work',
        'NR',
      ],
    },
    Age: { enabled: false, model: [18, 64], type: 'range', min: 18, max: 64 },
    Temperature: { enabled: false, model: [36, 45], type: 'range', min: 36, max: 45 },
    BMI: { enabled: false, model: [17, 44], type: 'range', min: 17, max: 44 },
    RH: { enabled: false, model: [13, 100], type: 'range', min: 13, max: 100 },
    WBGT: { enabled: false, model: [2, 37], type: 'range', min: 2, max: 37 },
    Days: { enabled: false, model: [1, 630], min: 1, max: 630 },
  });

  // actual text showed in drawer
  const labelMap = {
    Temperature: 'Temperature (°C)',
    RH: 'Relative Humidity (%)',
    WBGT: 'Wet Bulb Globe Temperature (°C)',
    HydrationStatus: 'Hydration Status',
    Diagnosis: 'Diagnosis (EHS/EHI/Other)',
    ActivityType: 'Activity Classification (Grouped)'
  };

  const {
    columns,
    rows,
    fetchAndLoadData,
    applyFilters,
    filteredCaseData: CaseOR,
    filteredSymptomData: SympOR,
    treemapData,
    tableData,
    nxgraphData,
    updateTreemapSelection,
    treemapSelection,
    studies,
    cases,
    unique_symptoms,
    affected_systems,
    muscleDamageData: musOR,
  } = useDataLoader();

  const drawer = ref(true);
  const drawerWidth = ref(window.innerWidth < 600 ? 240 : window.innerWidth * 0.18);

  // table states
  const filteredcol = ref([]);
  const table2 = ref([]);
  const table2Original = ref([]);
  const filteredcol2 = ref([]);

  // filtering states
  const states = ref([]);
  const cleanedColumn = ref({});
  const Symptoms = ref([]);

  // selection states
  const selectedNodeName = ref('');
  const nodeSAll = ref([]);
  const selectedRow = ref(null);

  // visualization and display states
  const activeChart = ref('network');
  const showTable1 = ref(false);

  // top symptoms states
  const topSymptomsByCount = ref([]);
  const topSymptomsByRiskRatio = ref([]);

  // auto-size for drawer
  const updateDrawerWidth = throttle(() => {
    drawerWidth.value = window.innerWidth < 600 ? 240 : window.innerWidth * 0.18;
  }, 200);

  const buildFilterPayload = () => {
    const {
      Sex,
      Diagnosis,
      Outcome,
      HydrationStatus,
      ActivityType,
      Age,
      Temperature,
      BMI,
      RH,
      WBGT,
      Days,
    } =
      filters.value;
    return {
      sex_switch: Sex.enabled,
      select_sex: Sex.model,
      diagnosis_switch: Diagnosis.enabled,
      diagnosis: Diagnosis.model,
      age_switch: Age.enabled,
      age_min: Age.model[0],
      age_max: Age.model[1],
      outcome_switch: Outcome.enabled,
      outcome: Outcome.model,
      hydration_switch: HydrationStatus.enabled,
      hydration: HydrationStatus.model,
      activity_switch: ActivityType.enabled,
      activity: ActivityType.model,
      temp_switch: Temperature.enabled,
      temp_min: Temperature.model[0],
      temp_max: Temperature.model[1],
      bmi_switch: BMI.enabled,
      bmi_min: BMI.model[0],
      bmi_max: BMI.model[1],
      rh_switch: RH.enabled,
      rh_min: RH.model[0],
      rh_max: RH.model[1],
      wbgt_switch: WBGT.enabled,
      wbgt_min: WBGT.model[0],
      wbgt_max: WBGT.model[1],
      days_switch: Days.enabled,
      day_min: Days.model[0],
      day_max: Days.model[1],
    };
  };

  const ensureBaseResult = () => {
    if (!BaseResult) {
      BaseResult = secondTable(CaseOR.value, SympOR.value, treemapSelection.value);
    }
    return BaseResult;
  };

  const updateTopSymptoms = () => {
    if (!SympOR.value || !SympOR.value.length) return;

    // Top 5 by count
    topSymptomsByCount.value = getTopSymptomsByCount(SympOR.value, 5);

    // Top 5 by risk ratio - aligned to treemap data
    topSymptomsByRiskRatio.value = getTopSymptomsByRiskRatio(treemapData.value, 5);
  };

  const refreshTableFromNodes = (nodes) => {
    const base = ensureBaseResult();
    const finalResult = FilterByNode(base, nodes);
    applyTableResult(finalResult);
  };

  // lifecycle, initialization
  const isLoading = ref(true);

  onMounted(async () => {
    try {
      const {
        treemapData: tData,
        tableData: filteredTable,
        nxgraphData: nxgraph,
        originalSymptomData,
        mDamage: muscleDamageRef,
      } = await fetchAndLoadData();

      treemapData.value = tData;
      tableData.value = filteredTable;
      nxgraphData.value = { ...nxgraph, originalSymptomData };
      musOR.value = muscleDamageRef;
      filteredcol.value = columns.value.filter((col) => col.key !== 'Abstract');

      // Initialize table2 with all studies (empty treemap selection)
      BaseResult = secondTable(CaseOR.value, SympOR.value, []);
      applyTableResult(BaseResult);

      // Compute top symptoms
      updateTopSymptoms();

      window.addEventListener('resize', updateDrawerWidth);
    } catch (error) {
      console.error('Error during initialization:', error);
    } finally {
      isLoading.value = false;
    }
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateDrawerWidth);
  });

  let BaseResult = null; // stores intermediate filtered result (used for node selection)

  async function handleTreemapSelection(selection) {
    // handle treemap selection
    const systemAbbr = {
      'Respiratory System': 'RS',
      'Central Nervous System': 'CNS',
    };

    if (selection[2] === 'Others') {
      const system = selection[0];
      selection[2] = `Others(${systemAbbr[system] || system})`;
    }

    updateTreemapSelection(selection);
    treemapSelection.value = selection;
    nodeSAll.value = [];

    // apply filtering pipeline: secondTable -> FilterByNode -> update table
    BaseResult = secondTable(CaseOR.value, SympOR.value, selection);
    refreshTableFromNodes([]);
  }

  async function handlenodeselection(selection) {
    // handle node select data
    if (typeof selection === 'string') {
      if (!nodeSAll.value.includes(selection)) {
        nodeSAll.value.push(selection);
      }
    } else if (Array.isArray(selection)) {
      nodeSAll.value = selection.filter((item) => item);
    }
    refreshTableFromNodes(nodeSAll.value);
  }

  function clearSelectedNode(node) {
    // clear a selected node and reapply filtering
    nodeSAll.value = nodeSAll.value.filter((item) => item !== node);
    refreshTableFromNodes(nodeSAll.value);
  }

  function applyTableResult(result) {
    // update table2 results based on filter result
    table2.value = result.datat2;
    table2Original.value = result.datat2;
    filteredcol2.value = columns.value.filter((col) => col.key !== 'Abstract' && col.key !== 'S/N');
    states.value = [...result.symptomNames].sort();
    cleanedColumn.value = result.select_filter;
    Symptoms.value = [];
  }

  async function handleTableSelect() {
    // handle symptom selection (table2 filtering, for multi-selector)
    const selectedSymptoms = Object.values(Symptoms.value);
    const arrays = selectedSymptoms.map(sym => cleanedColumn.value[sym] || []);
    const all_index = arrays.reduce(
      (acc, curr) => acc.filter(x => curr.includes(x)),
      arrays[0] || []
    );

    if (selectedSymptoms.length === 0){
      table2.value = table2Original.value;
    } else if (all_index.length === 0) {
      table2.value = [];
    } else {
      table2.value = table2Original.value.filter((row) => all_index.includes(String(row['S/N'])));
    }
  }

  // computed values for UI binding
  const showtables = computed(() =>
    tableData.value.length
      ? tableData.value.map(({ Abstract, ...rest }) => rest)
      : []
  );
  const showtable2 = computed(() =>
    table2.value.length
      ? table2.value.map(row =>
          Object.fromEntries(
            Object.entries(row).filter(([key]) => key !== 'Abstract' && key !== 'S/N')
          )
        )
      : []
  );

  // Treemap props wrapper
  const treemapProps = computed(() => ({
    data1: treemapData.value,
    data2: musOR.value,
  }));
  // reset selected row when toggling table1 display
  watch(showTable1, (val) => {
  if (val) {
      selectedRow.value = null;
  }
  });

  function handleRowClick(row_select) {
  const keys = Object.keys(row_select);
  const match = (data) => data.find((row) => keys.every((key) => row[key] === row_select[key]));
  selectedRow.value = match(tableData.value) || match(table2Original.value) || null;
}
  // check if a row is currently selected
  function isSelected(item) {
    if (!selectedRow.value) return false;
    return filteredcol.value.every((col) => item[col.key] === selectedRow.value[col.key]);
  }

  const filteredTreemap = computed(() => {
    return treemapSelection.value.filter((item) => item !== 'none');
  });

  function removeTreemapLevel(indexToRemove) {
    // return to previous level(node), get the actual index.
    const actualIndex = treemapSelection.value
      .map((item, i) => (item !== 'none' ? i : -1))
      .filter((i) => i !== -1)[indexToRemove];
    if (actualIndex !== undefined) {
      // remove items after the target level
      treemapSelection.value.splice(actualIndex, 1);
      let endIndex = actualIndex - 1;
      while (endIndex >= 0 && treemapSelection.value[endIndex] === 'none') {
        endIndex--;
      }
      const newSelection = treemapSelection.value.slice(0, endIndex + 1);
      handleTreemapSelection(newSelection);
    }
  }

  // debounced filter application (avoid too many updates)
  const debouncedApplyFilters = debounce(async (payload) => {
    await applyFilters(payload);
    // After filters are applied, recompute table2 with current treemap selection
    if (CaseOR.value && SympOR.value) {
      BaseResult = secondTable(CaseOR.value, SympOR.value, treemapSelection.value);
      applyTableResult(BaseResult);
      // Update top symptoms after filtering
      updateTopSymptoms();
    }
  }, 100);

  watch(
    () => filters.value,
    () => {
      const { Days } = filters.value;
      if (Days.model[0] > Days.model[1]) return;
      nodeSAll.value = [];
      BaseResult = null;
      debouncedApplyFilters(buildFilterPayload());
    },
    { deep: true }
  );
  // expose methods and states used by App.vue
  return {
    filters,
    labelMap,
    drawer,
    drawerWidth,
    filteredcol,
    filteredcol2,
    states,
    Symptoms,
    selectedNodeName,
    nodeSAll,
    selectedRow,
    activeChart,
    showTable1,
    rows,
    nxgraphData,
    treemapSelection,
    studies,
    cases,
    unique_symptoms,
    affected_systems,
    topSymptomsByCount,
    topSymptomsByRiskRatio,
    formatSymptomName,
    handleTreemapSelection,
    handlenodeselection,
    clearSelectedNode,
    handleTableSelect,
    handleRowClick,
    isSelected,
    showtables,
    showtable2,
    treemapProps,
    filteredTreemap,
    removeTreemapLevel,
    // exposed for JointRisk component
    CaseOR,
    SympOR,
    isLoading,
  };
}
