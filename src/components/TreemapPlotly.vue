<template>
    <v-card elevation="2">
        <v-card-text class="plot-container">
            <div ref="plotlyContainer" class="plot-inner"></div>
        </v-card-text>
    </v-card>
</template>

<script>
import Plotly from 'plotly.js-dist';
import { systemColorMap as color_map } from '@/utils/colorMap';

export default {
    name: 'TreemapPlotly',
    props:{
        data: {
        type: Object,
        default: () => ({})
        }
    },
    emits: ['node-selected'], // parent monitor

    data() {
    return {
      plotlyContainer: null,
    };
    },

    mounted() {
      // save reference to the chart container when component mounts
      this.plotlyContainer = this.$refs.plotlyContainer;
      window.addEventListener('resize', this.handleResize);},

    beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    },
    // watch the data prop deeply and re-render the chart when data changes
    // debounce to avoid rendering too frequently
    watch:{
      data: {
      handler(newData) {
        this.plotlyContainer = this.$refs.plotlyContainer;
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.renderChart(newData.data1, newData.data2);
        }, 100);
      },
      immediate: true,
      deep: true
    }
    },
  methods: {
    /**
    * prepare data for plotly treemap from hierarchical levels.
    * input: data1 array with { Level1, Level2, ..., Count, rr, rr_nr } fields.
    * output: { labels, parents, ids, values, colors, customdata } formatted for Plotly.
    */
      prepareTreemapDataFromLevels(data1) {
        const labels = ['All Clinical Features'];
        const parents = [''];
        const ids = ['All Clinical Features'];
        const colors = ['white'];
        const nodeSet = new Set(['All Clinical Features']);
        const nodeCounts = { 'All Clinical Features': 0 };
        const riskMap = new Map();

        data1.forEach(row => {
          const rawLevels = Object.keys(row)
            .filter(k => k.startsWith('Level'))
            .map(k => row[k]);
          // filter out 'none' values to keep only valid levels
          const levels = [];
          for (let i = 0; i < rawLevels.length; i++) {
            if (rawLevels[i] != 'none') {
              levels.push(rawLevels[i]);
            }
          }

          const path = levels.join('||');
          if (path) {
            riskMap.set(path, { rr: row.rr, rr_nr: row.rr_nr });
          }

          const count = row.Count || 0;
          if (levels.length === 0) return;

          let parentId = 'All Clinical Features';
          const level1Name = levels[0];
          const level1Color = color_map[level1Name];


          let currentId = '';
          levels.forEach((levelVal, idx) => {
            // create a unique ID for each level using prefix L1:, L2:
            const idParts = levels.slice(0, idx + 1).map((v, i) => `L${i + 1}:${v}`);
            currentId = idParts.join('||');
            // if node does not exist, add it to the treemap structure
            if (!nodeSet.has(currentId)) {
              labels.push(levelVal);
              ids.push(currentId);
              parents.push(parentId);
              colors.push(level1Color);
              nodeSet.add(currentId);
              nodeCounts[currentId] = 0;// initialize count for this node

            }

            parentId = currentId;
          });

          // add count to uplayers
          let tempId = currentId;
          while (tempId) {
            nodeCounts[tempId] = (nodeCounts[tempId] || 0) + count;
            const parentIndex = ids.indexOf(tempId);
            tempId = parents[parentIndex];
          }
        });

        const values = ids.map(id => nodeCounts[id] || 0);

        // Identify leaf nodes: nodes that don't appear as parents (except for root '')
        const parentSet = new Set(parents.filter(p => p !== ''));
        const isLeafNode = ids.map(id => !parentSet.has(id));

        const customdata = ids.map((id, index) => {
          // Only show risk ratio for leaf nodes
          if (!isLeafNode[index]) {
            return [''];  // Non-leaf nodes get empty customdata
          }

          const path = id.split('||').map(part => part.split(':')[1]).filter(Boolean).join('||');
          const risk = riskMap.get(path) || {};
          const format = (val) => (val === null || val === undefined || !isFinite(val) ? 'N/A' : val.toFixed(2));
          return [`<br>Relative Risk: ${format(risk.rr_nr)}`];
        });

        return { labels, parents, ids, values, colors, customdata};
      },



    async renderChart(data1, data2) {

      if (!data1 || !data1.length) {
        if (this.$refs.plotlyContainer) {
          Plotly.purge(this.$refs.plotlyContainer);
        }
        return;
      }
      const { labels, parents, ids, values, colors, customdata} = this.prepareTreemapDataFromLevels(data1);
      const text = labels.map(label => label);

      const data = [
        {
          type: 'treemap',
          labels,
          parents,
          ids,
          values,
          customdata,
          marker: { colors },
          text: text,
          textinfo: "text",
          branchvalues: 'total',
          hovertemplate: '<b>%{label}</b><br>Count: %{value}%{customdata[0]}<extra></extra>',
        },
      ];

      const layout = {
        margin: { l: 40, r: 40, b: 20, t: 20 },
        height: 600,
        paper_bgcolor: '#fff',
        plot_bgcolor: '#f9f9f9',
        showlegend: false,
      };
      // re-render the chart with new data
      Plotly.purge(this.$refs.plotlyContainer);
      await Plotly.newPlot(this.$refs.plotlyContainer, data, layout, { responsive: true, scrollZoom: true, displayModeBar: true });
      // click event handler for user interaction
      this.plotlyContainer.on('plotly_click', (eventData) => {
          const clickedId = eventData.points?.[0]?.id;
          const point = eventData.points[0];
          const fullData = point.fullData;
          if (!clickedId) return;

          if (clickedId.endsWith('Muscle damage')) {
            const data2Text = Object.entries(data2)
              .map(([key, value]) => `${key}: ${value}`)
              .join('<br>');
            const nodeLabel = fullData.labels[point.pointNumber] || clickedId;
            const fullText = `${nodeLabel}<br><br>${data2Text}`;
            const updatedText = [...fullData.text];
            updatedText[point.pointNumber] = fullText;

            Plotly.restyle(this.plotlyContainer, { text: [updatedText] }, [0]);
          }
      //console.log(clickedId); //L1:Urinary System||L2:Kidney

      // find the matching path from data1
      function findMatchingPath(data1, findstr) {
        const results = [];
        data1.forEach(item => {
          const path = [];

          let strIndex = 0;
          const maxLevel = 4;
          for (let i = 1; i <= maxLevel; i++) {
            const levelKey = `Level${i}`;
            const currentPrefix = findstr[strIndex];
            if (item[levelKey] === currentPrefix) {
              path.push(item[levelKey]);
              strIndex++;
            } else {
              path.push('none');
            }
            if (strIndex >= findstr.length) break;
          }
          if (strIndex === findstr.length) {
            results.push(path);
          }
        });
        // Special handling for 'Others': return the last matching result
        return findstr[0] === 'Others'
        ? results[results.length - 1]
        : results[0];

      }

        let selection = [];
        const findstr = clickedId.split('||').map(part => part.split(':')[1]);

        if (clickedId === 'All Clinical Features') {
          selection = [];
        } else {
          selection = findMatchingPath(data1, findstr);
        };
        this.$emit('node-selected', selection);
      })
    },
  },
};

</script>
<style scoped>
.plot-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.plot-inner {
  width: 100%;
  height: 100%;
  min-height: 600px;
}
</style>

