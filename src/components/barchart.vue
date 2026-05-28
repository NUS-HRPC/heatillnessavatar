<template>
  <v-card>
    <v-card-title>Associated Clinical Features</v-card-title>
    <v-card-text class="plot-container">
      <div ref="plotlyContainer" class="plot-inner"></div>
    </v-card-text>
  </v-card>
</template>

<script>
import Plotly from 'plotly.js-dist';
import { nextTick } from 'vue';

export default {
  name: 'BarChartPlotly',
  props: {
    graphData: {
      type: Object,
      default: () => ({ nodes: [], edges: [] })
    },
    treemapSelection: Object
  },

  mounted() {
  if (this.treemapSelection && this.treemapSelection.length) {
    this.renderBarChart(this.graphData, this.treemapSelection);
  }
},
  watch: {
    graphData: {
      handler(newVal) {
        this.renderBarChart(newVal, this.treemapSelection);
      },
      deep: true,
      immediate: true
    },
    treemapSelection: {
      handler(newVal) {
        this.renderBarChart(this.graphData, newVal);
      },
      deep: true,
      immediate: true
  }
  },
  methods: {
    async renderBarChart(graphData, selectiondata) {
      try {
        const isMobile = window.innerWidth < 600;
        //console.log(graphData);
        const edges = graphData.edges || [];
        if (!edges.length) return;
        const sortedEdges = [...edges].sort((a, b) => b.weight - a.weight);
        const lastSelection =
          Array.isArray(selectiondata) && selectiondata.length
            ? selectiondata[selectiondata.length - 1]
            : (selectiondata?.name || null);

        let labels = [];
        let weights = []
        let hoverTexts =[];
        if (!lastSelection) {
          labels = sortedEdges.map(e => e.source);
          weights = sortedEdges.map(e => e.weight);
          hoverTexts = sortedEdges.map(e =>
          `(${e.source}, <br> ${e.weight})`
        );
        } else {

      const relatedEdges = sortedEdges.filter(
        e => e.source === lastSelection || e.target === lastSelection
      );

      labels = relatedEdges.map(e =>
        e.source === lastSelection ? e.target : e.source
      );

      weights = relatedEdges.map(e => e.weight);
      hoverTexts = relatedEdges.map(e =>
        ` (${e.source === lastSelection ? e.target : e.source}, ${e.weight})`
      );};


        const maxLabelLen = isMobile ? 14 : 40;
        const truncate = s => s.length > maxLabelLen ? s.slice(0, maxLabelLen) + '…' : s;

        const data = [
          {
            type: 'bar',
            x: labels.map(truncate),
            y: weights,
            hovertext: hoverTexts,
            hoverinfo: 'text',
            marker: {
              color: '#33aaff'
            }
          }
        ];
        const layout = {
          xaxis: {
            title: 'Node',
            tickangle: -90,
            automargin: true,
            showgrid: false,
            zeroline: false,
          },
          yaxis: {
            title: 'Count'
          },
          dragmode: 'pan',
          margin: { b: 350, l: 100, r: 100, t: 50 },
          plot_bgcolor: '#f9f9f9',
          paper_bgcolor: '#ffffff',
          hovermode: 'closest',
          bargap: 0.3
        };

        await nextTick();
        Plotly.newPlot(this.$refs.plotlyContainer, data, layout, { responsive: true, scrollZoom: true, displayModeBar: true });

      } catch (error) {
        console.error('Error rendering bar chart:', error);
      }
    }
  }
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
  width: 80%;
  height: 100%;
  min-height: 850px;
}

</style>
