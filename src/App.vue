<script setup>
import { ref } from 'vue';
import './assets/style.css';
import TreemapPlotly from './components/TreemapPlotly.vue';
import NetworkPlotly from './components/networkchart.vue';
import Abstract from './components/abstract.vue';
import JointRisk from './components/JointRisk.vue';
import { MainDashboard } from '@/utils/mainlogic';

const {
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
  isLoading,
  CaseOR,
  SympOR,
} = MainDashboard();

const showBottomStudies = ref(true);
const activeTab = ref('features');

const statConfig = {
  'Studies':                  { icon: 'mdi-book-open-variant',  color: 'indigo' },
  'Cases':                    { icon: 'mdi-account-group',       color: 'teal-darken-1' },
  'Affected Systems':         { icon: 'mdi-human',               color: 'orange-darken-2' },
  'Unique Clinical Features': { icon: 'mdi-stethoscope',         color: 'purple-darken-1' },
};

</script>

<template>
  <v-app>
      <v-navigation-drawer
        v-model="drawer"
        location="left"
        app
        :width="drawerWidth"
        >
      <div style="margin: 1em 1em 0.5em 1em;">
        <div class="d-flex align-center" style="gap: 8px;">
          <v-icon color="blue-darken-2" size="22">mdi-filter-variant</v-icon>
          <span style="font-size: 18px; font-weight: 600; letter-spacing: 0.03em;">Filter Options</span>
        </div>
        <v-divider class="mt-2" />
      </div>
      <div class="pa-3" style="display: flex; flex-wrap: wrap; gap: 8px;">
        <v-card
          v-for="([key, filter]) in Object.entries(filters).filter(([k]) => k !== 'Days')"
          :key="key"
          class="pa-1"
          style="flex: 1 1 100%;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          background: #f4f5f7;"
          elevation="0"
        >
        <v-switch
          v-model="filter.enabled"
          :label="labelMap[key] || key"
          color="blue-darken-2"
          class="black-label filter-switch"
          hide-details="auto"
        ></v-switch>

      <div v-if="filter.enabled && filter.type === 'checkbox'" class="pb-1 px-2">
        <v-checkbox
          v-for="option in filter.options"
          :key="option"
          v-model="filter.model"
          :value="option"
          :label="option"
          density="compact"
          hide-details
          color="blue-darken-2"
        />
      </div>
      <div v-else-if="filter.enabled && filter.type === 'range'" style="display: flex;">
        <v-range-slider
          v-model="filter.model"
          :min="filter.min"
          :max="filter.max"
          step="1"
          style="max-width: 500px;"
          thumb-label="always"
          color="blue-darken-2"
        ></v-range-slider>
      </div>
      </v-card>

      <v-card
      class="pa-1"
      style="flex: 1 1 100%;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      background:  #f4f5f7;"
      elevation="0">
      <v-switch v-model="filters.Days.enabled" label="Days" color="blue-darken-2"
          class="black-label filter-switch"
          hide-details="auto"></v-switch>
      <div v-if="filters.Days.enabled" class="d-flex align-center ga-2" style="padding-bottom: 10px; padding: 0rem 0.5rem 0.5rem 0.5rem;">
        <v-text-field
          v-model.number="filters.Days.model[0]"
          label="Min"
          min="1"
          type="number"
          density="compact"
          style="width: 100px;"
          variant="outlined"
          hide-details
        >
      </v-text-field>
        <span>—</span>
        <v-text-field
          v-model.number="filters.Days.model[1]"
          label="Max"
          type="number"
          density="compact"
          style="width: 100px; text-align: center"
          variant="outlined"
          hide-details
        ></v-text-field>
      </div>
    </v-card>
    </div>
    </v-navigation-drawer>

    <v-main>
    <v-progress-linear v-if="isLoading" indeterminate color="blue-darken-2" />
    <v-container fluid class="px-8 py-4">
    <v-row class="mb-4" dense>
      <v-col cols="auto" class="d-flex align-center mr-4">
        <v-btn
          variant="text"
          class="d-flex align-center pl-1 pr-3 py-2"
          @click.stop="drawer = !drawer"
          style="background-color: rgba(0, 0, 0, 0.06); border-radius: 4px;"
        >
          <v-icon class="mr-0" size="26">
            {{ drawer ? 'mdi-chevron-left' : 'mdi-chevron-right' }}
          </v-icon>
          <span class="text-h6">FILTER</span>
        </v-btn>
      </v-col>
        <v-row dense justify="end" class="gap-4">
          <v-col cols="6" sm="6" md="3" v-for="(value, label) in { 'Studies': studies, 'Cases': cases, 'Affected Systems': affected_systems, 'Unique Clinical Features': unique_symptoms }" :key="label">
          <v-card
            elevation="2"
            class="pa-4 text-left"
          >
            <div class="pl-2">
              <div class="d-flex align-center text-subtitle-1 text-grey-darken-1" style="gap: 4px;">
                <v-icon :color="statConfig[label]?.color" size="1em">{{ statConfig[label]?.icon }}</v-icon>
                {{ label }}
              </div>
              <div class="text-h4 font-weight-bold">{{ value }}</div>
            </div>
            <v-btn
              v-if="label === 'Studies'"
              size="small"
              class="position-absolute"
              style="top: 8px; right: 8px;"
              @click="showTable1 = !showTable1"
            >
              {{ showTable1 ? 'Hide Studies' : 'Show Studies' }}
            </v-btn>
          </v-card>
        </v-col>
        </v-row>
      </v-row>

      <v-row v-if="showTable1" class="my-4" align="stretch">
        <v-col cols="12" md="8" style="display:flex; flex-direction:column;">
        <v-card elevation="2" style="flex:1; display: flex; flex-direction: column;">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="blue-grey-darken-1">mdi-text-box-multiple</v-icon>
              List of Studies
            </v-card-title>
            <v-card-text style="flex: 1; padding: 0;">
               <div v-if="rows.length">
                <v-data-table
                :items="showtables"
                :headers="filteredcol"
                fixed-header
                class="custom-table"
                :items-per-page="5"
                :items-per-page-options="[{value:5,title:'5'},{value:10,title:'10'},{value:20,title:'20'}]"
                style="font-size: 0.875rem">
                <template #item="{ item }">
                  <tr @click="handleRowClick(item)"
                  :class="{ 'selected-row':  isSelected(item) }">
                    <td v-for="col in filteredcol" :key="col.key">
                      {{ item[col.key] }}
                    </td>
                  </tr>
                </template>
              </v-data-table>
              </div>
              <div v-else style="text-align: center">
                No data available
              </div>
            </v-card-text>
          </v-card>
      </v-col>
        <v-col cols="12" md="4" style="display:flex; flex-direction:column;">
          <Abstract :row="selectedRow" style="flex:1;"/>
        </v-col>
      </v-row>

      <!-- Top Clinical Features Info Boxes -->
      <v-row class="my-4">
        <v-col cols="12" md="6">
          <v-card class="pa-4" elevation="2">
            <v-card-title class="text-h6">
              <v-icon class="mr-2" color="primary">mdi-trending-up</v-icon>
              Top 5 Clinical Features by Count
            </v-card-title>
            <v-card-text>
              <div v-if="topSymptomsByCount.length > 0">
                <v-list density="compact">
                  <v-list-item
                    v-for="(item, index) in topSymptomsByCount"
                    :key="index"
                    class="px-0"
                  >
                    <template v-slot:prepend>
                      <v-chip size="small" color="primary" class="mr-2">{{ index + 1 }}</v-chip>
                    </template>
                    <v-list-item-title>
                      {{ formatSymptomName(item.symptom) }}
                    </v-list-item-title>
                    <template v-slot:append>
                      <v-chip size="small" color="blue-grey-lighten-3">{{ item.count }}</v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
              <div v-else class="text-center text-grey">
                No data available
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="pa-4" elevation="2">
            <v-card-title class="text-h6">
              <v-icon class="mr-2" color="error">mdi-alert-circle</v-icon>
              Top 5 Clinical Features by Relative Risk
            </v-card-title>
            <v-card-text>
              <div v-if="topSymptomsByRiskRatio.length > 0">
                <v-list density="compact">
                  <v-list-item
                    v-for="(item, index) in topSymptomsByRiskRatio"
                    :key="index"
                    class="px-0"
                  >
                    <template v-slot:prepend>
                      <v-chip size="small" color="error" class="mr-2">{{ index + 1 }}</v-chip>
                    </template>
                    <v-list-item-title>
                      {{ formatSymptomName(item.symptom) }}
                    </v-list-item-title>
                    <template v-slot:append>
                      <v-chip size="small" color="orange-darken-2">RR: {{ item.riskRatio.toFixed(2) }}</v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
              <div v-else class="text-center text-grey">
                No data available
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <div class="d-flex justify-center mt-4 mb-3">
        <v-btn-toggle v-model="activeTab" mandatory class="tab-toggle" style="width: 100%;">
          <v-btn value="features" class="tab-bubble" rounded="pill" style="flex: 1;">
            <v-icon class="mr-2" color="green-darken-2">mdi-family-tree</v-icon>
            Clinical Features
          </v-btn>
          <v-btn value="joint" class="tab-bubble" rounded="pill" style="flex: 1;">
            <v-icon class="mr-2" color="deep-purple">mdi-set-all</v-icon>
            Joint Relative Risk
          </v-btn>
        </v-btn-toggle>
      </div>

      <v-window v-model="activeTab">
        <!-- ── TAB 1: Clinical Features ── -->
        <v-window-item value="features">
          <v-row class="mb-1 mt-2">
            <v-col cols="12">
              <TreemapPlotly :data="treemapProps" @node-selected="handleTreemapSelection" />
            </v-col>
          </v-row>
          <v-row class="mb-4" style="margin-top: 0;">
            <v-col cols="12">
              <NetworkPlotly
                :graphData="nxgraphData"
                :treemapSelection="treemapSelection"
                @selected_node="handlenodeselection"
              />
            </v-col>
          </v-row>
          <v-row class="my-4" style="min-height: 60vh;">
            <v-col cols="12" style="height: 100%;">
            <v-card elevation="2" style="height: 100%; display: flex; flex-direction: column;">
                <v-card-title class="d-flex align-center flex-wrap">
                <v-icon class="mr-2" color="blue-grey-darken-1">mdi-text-box-multiple</v-icon>
                <div>List of Studies</div>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  class="ml-2"
                  @click="showBottomStudies = !showBottomStudies"
                  :title="showBottomStudies ? 'Collapse' : 'Expand'"
                >
                  <v-icon>{{ showBottomStudies ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-btn>
                <div class="d-flex flex-wrap px-4 py-2">
                  <template v-for="(item, index) in filteredTreemap" :key="index">
                    <v-chip class="ma-1" closable @click:close="removeTreemapLevel(index)">
                      {{ item }}
                    </v-chip>
                    <span v-if="index < filteredTreemap.length - 1" style="font-size: 25px;">/</span>
                  </template>
                  <template v-for="(item, index) in nodeSAll" :key="item">
                    <v-chip class="ma-1" color="primary" closable @click:close="clearSelectedNode(item)">
                      {{ item }}
                    </v-chip>
                    <span v-if="index < nodeSAll.length - 1" style="font-size: 20px; margin: 4px 2px; color: #1867c0;">&</span>
                  </template>
                </div>
                <template v-if="treemapSelection.length === 4">
                  <v-select
                    v-model="Symptoms"
                    :items="states"
                    density="compact"
                    label="Select Additional Clinical Features"
                    multiple
                    persistent-hint
                    @update:model-value="handleTableSelect"
                    :menu-props="{ contentClass: 'fixed-select-menu' }"
                  >
                    <template v-slot:selection="{ index }">
                      <span v-if="index === 0">{{ Symptoms.join(' & ') }}</span>
                    </template>
                  </v-select>
                </template>
                </v-card-title>
                <!-- Applied filters summary -->
                <div v-if="Object.entries(filters).some(([, f]) => f.enabled)" class="px-4 py-2 d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="([key, f]) in Object.entries(filters).filter(([, f]) => f.enabled)"
                    :key="key"
                    size="small"
                    color="blue-darken-2"
                    variant="tonal"
                  >
                    {{ labelMap[key] || key }}:
                    <span v-if="f.type === 'checkbox'">&nbsp;{{ f.model.join(', ') }}</span>
                    <span v-else>&nbsp;{{ f.model[0] }} – {{ f.model[1] }}</span>
                  </v-chip>
                </div>
                <v-expand-transition>
                  <div v-show="showBottomStudies">
                    <v-card-text style="padding: 0;">
                      <v-row class="ma-0" align="stretch">
                        <v-col cols="12" md="8" class="pa-0" style="display:flex; flex-direction:column;">
                          <div v-if="treemapSelection.length > 0 || selectedNodeName">
                            <v-data-table
                              :items="showtable2"
                              :headers="filteredcol2"
                              fixed-header
                              class="custom-table"
                              :items-per-page="5"
                              :items-per-page-options="[{value:5,title:'5'},{value:10,title:'10'},{value:20,title:'20'}]"
                              style="font-size: 0.875rem"
                              :row-props="item => ({ onClick: () => handleRowClick(item.item), class: isSelected(item.item) ? 'selected-row' : '', style: 'cursor:pointer' })"
                            />
                          </div>
                          <div v-else>
                            <v-data-table
                              :items="showtables"
                              :headers="filteredcol"
                              fixed-header
                              class="custom-table"
                              :items-per-page="5"
                              :items-per-page-options="[{value:5,title:'5'},{value:10,title:'10'},{value:20,title:'20'}]"
                              style="font-size: 0.875rem"
                              :row-props="item => ({ onClick: () => handleRowClick(item.item), class: isSelected(item.item) ? 'selected-row' : '', style: 'cursor:pointer' })"
                            />
                          </div>
                        </v-col>
                        <v-col cols="12" md="4" class="pa-3" style="display:flex; flex-direction:column;">
                          <Abstract :row="selectedRow" style="flex:1;" />
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </div>
                </v-expand-transition>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- ── TAB 2: Joint Relative Risk ── -->
        <v-window-item value="joint">
          <JointRisk :caseRows="CaseOR" :symptomRows="SympOR" />
        </v-window-item>
      </v-window>

    </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.selected-row {
  background-color: #e3f2fd !important;
  transition: background-color 0.3s ease;
}
</style>

<style>
.custom-table td {
  white-space: pre-line;
}

.tab-toggle {
  gap: 12px;
  background: transparent !important;
  box-shadow: none !important;
}

.tab-bubble {
  font-weight: 500;
  font-size: 0.95rem;
  text-transform: none;
  letter-spacing: 0.01em;
  padding: 0 24px !important;
  height: 42px !important;
  border: 1.5px solid rgba(0, 0, 0, 0.15) !important;
  background: #fff !important;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08) !important;
  transition: all 0.18s ease !important;
}

.tab-bubble:hover {
  box-shadow: 0 3px 10px rgba(0,0,0,0.13) !important;
  border-color: rgba(0,0,0,0.25) !important;
}

.tab-bubble.v-btn--active {
  background: #fff !important;
  color: #37474f !important;
  border: 2px solid #546e7a !important;
  box-shadow: 0 2px 8px rgba(84,110,122,0.18) !important;
}

.tab-bubble.v-btn--active .v-icon {
  color: #546e7a !important;
}

/* v-main sets overflow-y:auto which silently converts overflow-x:visible → auto,
   clipping card box-shadows on the left/right edges. Override it here. */
.v-main,
.v-main__wrap {
  overflow-x: visible !important;
}

/* v-window sets overflow:hidden for tab transitions, clipping shadows on cards inside */
.v-window,
.v-window__container,
.v-window-item {
  overflow: visible !important;
}

/* Uniform stronger shadow on all elevation-2 cards */
.v-card.v-card--variant-elevated {
  box-shadow: 0 3px 8px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.10) !important;
}

/* Filter panel: smaller text */
.filter-switch .v-label {
  font-size: 16px !important;
}
</style>


