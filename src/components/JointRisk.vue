<script setup>
import { ref, computed, watch } from 'vue';
import { getBinarySymptomColumns } from '@/utils/dataParsing';
import { computeJointRisk } from '@/utils/jointRisk';
import { riskRatioWithNr } from '@/utils/riskRatios';
import { handleTableSelection } from '@/utils/tableUtils';
import Abstract from '@/components/abstract.vue';

const props = defineProps({
  caseRows:    { type: Array, default: () => [] },
  symptomRows: { type: Array, default: () => [] },
});

const MAX_COMBO  = 5;

const selectedSymptoms  = ref([]);
const minJointN         = ref(5);
const searchText        = ref('');

// ── Available symptoms (all columns, computed once per data change) ──────────
const symTail = (key) => {
  const parts = key.split('||');
  return parts[parts.length - 1].replace(/_/g, ' ');
};

const availableSymptoms = computed(() => {
  const keys = getBinarySymptomColumns(props.symptomRows);
  return keys.map((k) => ({ title: symTail(k), value: k }));
});

// Cap selection at MAX_COMBO
watch(selectedSymptoms, (val) => {
  if (val.length > MAX_COMBO) selectedSymptoms.value = val.slice(0, MAX_COMBO);
});

// ── Main joint-risk result ────────────────────────────────────────────────────
const result = computed(() => {
  if (selectedSymptoms.value.length < 2) return null;
  if (!props.caseRows.length || !props.symptomRows.length) return null;
  return computeJointRisk(
    props.caseRows,
    props.symptomRows,
    selectedSymptoms.value,
  );
});

// ── Individual RRs per selected symptom (shown as reference) ─────────────────
const individualRRs = computed(() => {
  if (!result.value || !props.caseRows.length) return [];
  const outcomes = props.caseRows.map((r) => r.Outcome);
  return selectedSymptoms.value.map((sym) => {
    const symptoms = props.symptomRows.map((r) => r[sym]);
    const { rr, a, b } = riskRatioWithNr(outcomes, symptoms);
    return { sym, rr, n: a + b };
  });
});

// ── Table for matched cases ───────────────────────────────────────────────────
const DISPLAY_FIELDS = ['Authors', 'Year', 'Title', 'Journal', 'PMID/DOI', 'Cases'];

const selectedRow = ref(null);

const processedTableItems = computed(() => {
  if (!result.value?.matchedCases.length) return [];
  return handleTableSelection(result.value.matchedCases);
});

const tableHeaders = computed(() =>
  DISPLAY_FIELDS.map((f) => ({ title: f, key: f }))
);

// rows shown in table (no Abstract column)
const tableItems = computed(() =>
  processedTableItems.value.map(({ Abstract: _a, ...rest }) => rest)
);

function handleRowClick(item) {
  selectedRow.value = processedTableItems.value.find((row) =>
    DISPLAY_FIELDS.every((k) => row[k] === item[k])
  ) || null;
}

function isSelected(item) {
  if (!selectedRow.value) return false;
  return DISPLAY_FIELDS.every((k) => item[k] === selectedRow.value[k]);
}

// reset selection when symptoms change
watch(result, () => { selectedRow.value = null; });

// ── Helpers ───────────────────────────────────────────────────────────────────
const belowMinN = computed(() => result.value && result.value.nExposed < minJointN.value);

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(3) : 'N/A';
}
function fmtPct(n) {
  return Number.isFinite(n) ? (n * 100).toFixed(1) + '%' : 'N/A';
}
function rrColor(rr) {
  if (!Number.isFinite(rr)) return 'grey';
  if (rr > 2) return 'error';
  if (rr > 1) return 'warning';
  return 'success';
}
</script>

<template>
  <v-card class="pa-4" elevation="2">
    <v-card-title class="text-h6 d-flex align-center">
      <v-icon class="mr-2" color="deep-purple">mdi-set-all</v-icon>
      Joint Relative Risk
      <v-tooltip location="bottom" max-width="320">
        <template #activator="{ props }">
          <v-icon v-bind="props" size="18" color="blue-grey" class="ml-2" style="cursor: default;">mdi-information-outline</v-icon>
        </template>
        Computed from all cases matching the current filter options. Treemap and network graph selections do not affect this calculation.
      </v-tooltip>
    </v-card-title>
    <v-card-text>
      <!-- ── Controls ── -->
      <v-row dense class="mb-2" align="start">
        <v-col cols="12" md="7">
          <v-autocomplete
            v-model="selectedSymptoms"
            v-model:search="searchText"
            :items="availableSymptoms"
            item-title="title"
            item-value="value"
            label="Select clinical features (2–5)"
            multiple
            chips
            closable-chips
            clearable
            density="compact"
            variant="outlined"
            :hint="`${selectedSymptoms.length} of ${MAX_COMBO} max selected`"
            persistent-hint
            @update:model-value="searchText = ''"
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-text-field
            v-model.number="minJointN"
            label="Min joint n"
            type="number"
            min="1"
            density="compact"
            variant="outlined"
            hint="Warn below this"
            persistent-hint
          />
        </v-col>
      </v-row>

      <!-- ── Prompt ── -->
      <v-alert v-if="selectedSymptoms.length < 2" type="info" variant="tonal" class="mb-4">
        Select at least 2 clinical features to compute the joint relative risk.
      </v-alert>

      <!-- ── Combination size warning ── -->
      <v-alert
        v-if="selectedSymptoms.length > 3"
        type="warning"
        variant="tonal"
        class="mb-3"
      >
        {{ selectedSymptoms.length }}-way combination — joint n shrinks rapidly; expect
        wide confidence intervals.
      </v-alert>

      <!-- ── Small-n warning ── -->
      <v-alert v-if="belowMinN" type="warning" variant="tonal" class="mb-4">
        Joint n&nbsp;=&nbsp;<strong>{{ result.nExposed }}</strong> is below the minimum
        threshold of {{ minJointN }}. The confidence interval is unreliable — interpret
        with caution.
      </v-alert>

      <!-- ── Result ── -->
      <template v-if="result">
        <!-- selected combo chips -->
        <div class="mb-3">
          <v-chip
            v-for="sym in result.selectedSymptoms"
            :key="sym"
            color="deep-purple"
            variant="tonal"
            class="mr-1 mb-1"
            size="small"
          >
            {{ symTail(sym) }}
          </v-chip>
          <v-chip size="small" color="grey" variant="outlined" class="ml-1 mb-1">
            {{ result.selectedSymptoms.length }}-way combination
          </v-chip>
        </div>

        <!-- stats grid -->
        <v-row dense class="mb-4">
          <v-col cols="6" sm="3">
            <v-card variant="tonal" color="blue" class="pa-3 text-center">
              <div class="text-caption text-grey-darken-2">All present (joint n)</div>
              <div class="text-h5 font-weight-bold">{{ result.nExposed }}</div>
              <div class="text-caption">
                {{ result.nDeadExposed }} passed away /
                {{ result.nExposed - result.nDeadExposed }} recovered
              </div>
            </v-card>
          </v-col>

          <v-col cols="6" sm="3">
            <v-card variant="tonal" color="blue-grey" class="pa-3 text-center">
              <div class="text-caption text-grey-darken-2">Not all present (reference)</div>
              <div class="text-h5 font-weight-bold">{{ result.nUnexposed }}</div>
              <div class="text-caption">
                {{ result.nDeadUnexposed }} passed away /
                {{ result.nUnexposed - result.nDeadUnexposed }} recovered
              </div>
            </v-card>
          </v-col>

          <v-col cols="6" sm="3">
            <v-card variant="tonal" :color="rrColor(result.rr)" class="pa-3 text-center">
              <div class="text-caption text-grey-darken-2">Relative Risk</div>
              <div class="text-h5 font-weight-bold">{{ fmt(result.rr) }}</div>
              <div class="text-caption">
                95 % CI [{{ fmt(result.ciLow) }}, {{ fmt(result.ciHigh) }}]
              </div>
            </v-card>
          </v-col>

          <v-col cols="6" sm="3">
            <v-card variant="tonal" color="orange" class="pa-3 text-center">
              <div class="text-caption text-grey-darken-2">Mortality (exposed)</div>
              <div class="text-h5 font-weight-bold">{{ fmtPct(result.riskExposed) }}</div>
              <div class="text-caption">vs {{ fmtPct(result.riskUnexposed) }} (absent)</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- individual symptom RR reference -->
        <v-card variant="outlined" class="mb-4 pa-3">
          <div class="text-subtitle-2 mb-2">
            Individual clinical feature RR (reference — each clinical feature alone, Y vs N)
          </div>
          <v-row dense>
            <v-col
              v-for="item in individualRRs"
              :key="item.sym"
              cols="12"
              sm="6"
              md="4"
            >
              <div class="d-flex align-center flex-wrap gap-1 py-1">
                <span class="text-body-2 mr-1">
                  {{ symTail(item.sym) }}
                </span>
                <v-chip
                  size="x-small"
                  :color="rrColor(item.rr)"
                  variant="tonal"
                >
                  RR {{ Number.isFinite(item.rr) ? item.rr.toFixed(2) : 'N/A' }}
                </v-chip>
                <span class="text-caption text-grey">(n={{ item.n }})</span>
              </div>
            </v-col>
          </v-row>
        </v-card>

        <!-- matched cases table -->
        <div class="text-subtitle-2 mb-2">
          Matched cases — all {{ result.selectedSymptoms.length }} clinical features present
          (n = {{ result.nExposed }})
        </div>

        <v-row v-if="tableItems.length" align="stretch">
          <v-col cols="12" md="8" style="display:flex; flex-direction:column;">
            <v-data-table
              :items="tableItems"
              :headers="tableHeaders"
              fixed-header
              density="compact"
              class="custom-table"
              :items-per-page="5"
              :items-per-page-options="[{value:5,title:'5'},{value:10,title:'10'},{value:20,title:'20'}]"
              style="font-size: 0.875rem;"
            >
              <template #item="{ item }">
                <tr @click="handleRowClick(item)" :class="{ 'selected-row': isSelected(item) }" style="cursor:pointer;">
                  <td v-for="col in tableHeaders" :key="col.key">{{ item[col.key] }}</td>
                </tr>
              </template>
            </v-data-table>
          </v-col>
          <v-col cols="12" md="4" style="display:flex; flex-direction:column;">
            <Abstract :row="selectedRow" style="flex:1;" />
          </v-col>
        </v-row>
        <div v-else class="text-center text-grey py-4">No matched cases.</div>
      </template>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.selected-row td {
  background-color: #e3f2fd !important;
}
tr { cursor: pointer; }
</style>
