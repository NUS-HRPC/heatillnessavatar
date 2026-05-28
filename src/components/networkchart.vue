<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2" color="teal">mdi-graph-outline</v-icon>
      Associated Clinical Features
    </v-card-title>
    <v-card-text class="plot-container">
      <div class="plot-inner">
      <div v-if="hasData" ref="plotlyContainer" class="plot-graph" hide-details="auto"></div>
         <div v-if="shouldShowSlider" style="display: flex; align-items: center; justify-content: flex-start; width: 100%; margin-top: 10px; padding-left: 10px; ">
          <span class="slider-label"> Number of clinical features to show </span>
            <v-slider
                v-model="show_nodes_count"
                :min="30"
                :max="maxNodeCount"
                :step="1"
                style="max-width: 400px; margin: 0 10px"
                thumb-label="always"
                thumb-label-position="bottom"
                color="blue-darken-2"
            />
            <span style="font-weight: 500; white-space: nowrap; padding-bottom: 20px;">
              Max: {{ maxNodeCount }}
            </span>
          </div>
      </div>
    </v-card-text>
  </v-card>
</template>


<script>
import Plotly from 'plotly.js-dist';
import { nextTick } from 'vue';
import { systemColorMap } from '@/utils/colorMap';


export default {
  name: 'NetworkPlotly',
  props: {
    graphData: {
      type: Object,
      default: () => ({ nodes: [], edges: [] })
    },
    treemapSelection: Object
  },
  emits: ['selected_node'],
  mounted() {
    this.$nextTick(() => {
    if (!this.hasData) return;
    this.plotlyContainer = this.$refs.plotlyContainer;
    if (this.plotlyContainer) {
      this.renderGraph(this.graphData, this.selectiondata);
    }
  });
  },
 watch: {
  graphData: {
    handler(newVal) {
      if (!this.hasData) return;
      this.plotlyContainer = this.$refs.plotlyContainer;
      this.renderGraph(newVal, this.treemapSelection);
    },
    deep: true,
    immediate: true
  },
  treemapSelection: {
    handler(newVal) {
      if (!this.hasData) return;
      this.show_nodes_count = 30;
      this.renderGraph(this.graphData, newVal);
    },
    deep: true,
    immediate: true
  },
   show_nodes_count(newVal) {
    if (!this.hasData) return;
    this.renderGraph(this.graphData, this.treemapSelection);
  }
  },
  data() {
    return {
    plotlyContainer: null,
    show_nodes_count: 30
    };
  },
  computed: {
    shouldShowSlider() {
      return (
        this.treemapSelection &&
        Object.keys(this.treemapSelection).length &&
        this.graphData &&
        Array.isArray(this.graphData.nodes) &&
        this.graphData.nodes.length > 30
      );
    },
    maxNodeCount() {
      return this.graphData && this.graphData.nodes
    ? this.graphData.nodes.length
    : 0;
    },
    hasData() {
    return (
      this.graphData &&
      Array.isArray(this.graphData.nodes) &&
      this.graphData.nodes.length > 0
    );
  },
  },
  methods: {

    async renderGraph(graphData) {
      try {

      if (!this.hasData || !graphData || !graphData.nodes || graphData.nodes.length === 0) {
        return;
      }

        const result = {};
        const level = graphData.level;

        // process groupmap, assign each node ID to its corresponding system/group
        for (const key in graphData.groupmap) {
          const values = graphData.groupmap[key];

          for (const entry of values) {
            const parts = entry.split('||');
            // if part matches the current key, assign system name to result
            if (parts[level] === key) {
              result[key] = parts[0];
              break;
            }
            else{
              result[key] = parts[0];
            }
          }
        }

        // need change if system change
        const color_map = systemColorMap;

        let nodes = [];
        let edges = [];
        // if too many nodes, filter edges by weight (top-N strongest connections)
        if (graphData.nodes.length > 30){
        const sortedEdges = [...graphData.edges].sort((a, b) => b.weight - a.weight);
        //console.log('sorted:', sortedEdges);
        const edgesToShow = sortedEdges.slice(0, this.show_nodes_count);
        const nodeIds = new Set();
            edgesToShow.forEach(e => {
              nodeIds.add(e.source);
              nodeIds.add(e.target);
            });


        const filteredNodes = graphData.nodes.filter(n => nodeIds.has(n.id));
        nodes = filteredNodes;
        edges = edgesToShow;}
        else{
        nodes = graphData.nodes;
        edges = graphData.edges || [];
        };

        if (!nodes || nodes.length === 0) return;
        // node positions (layout)
        const positions = {};
        const { id: centerId } = nodes[0];
        positions[centerId] = { x: 0, y: 0 };
        // build adjacency info, edge weights and mappings
        const connWeights = {};
        const edgeMap = {};

        edges.forEach(edge => {
          const { source, target, weight } = edge;

          if (source === centerId) connWeights[target] = weight;
          else if (target === centerId) connWeights[source] = weight;


          [source, target].forEach(node => {
            if (!edgeMap[node]) edgeMap[node] = [];
            const other = node === source ? target : source;
            edgeMap[node].push({ other, weight });
          });
        });
        // normalize edge weights (used for edge thickness and node distances)
        const weights = Object.values(connWeights);
        const minWeight = Math.min(...weights, 0);
        const maxWeight = Math.max(...weights, 1);

        const normalize_line = w => {
          if (maxWeight === minWeight) return 0.5;
          return ((w - minWeight) / (maxWeight - minWeight)) + 1;
        };

        const normalize = w => {
          if (maxWeight === minWeight) return 0.5;
          return 1 - (w - minWeight) / (maxWeight - minWeight);
        };

        // separate connected and isolated nodes
        const connectedNodes = nodes.filter(n => n.id !== centerId && connWeights[n.id] !== undefined);
        const isolatedNodes = nodes.filter(n => n.id !== centerId && connWeights[n.id] === undefined);

        //const otherNodes = nodes.slice(1);
        const angleStep = (2 * Math.PI) / connectedNodes.length;

        connectedNodes.forEach((node, i) => {
        const rawWeight = connWeights[node.id] ?? minWeight;
        const normWeight = normalize(rawWeight);
        const radius = 1 + 2 * normWeight; // [1, 3]

        positions[node.id] = {
          x: radius * Math.cos(i * angleStep),
          y: radius * Math.sin(i * angleStep)
        };});


      const isoAngleStep = (2 * Math.PI) / isolatedNodes.length;
      const isolatedRadius = 0.2;
      const centerX = 0;
      const centerY = 0;

      isolatedNodes.forEach((node, i) => {
        const angle = i * isoAngleStep;
        positions[node.id] = {
          x: centerX + isolatedRadius * Math.cos(angle),
          y: centerY + isolatedRadius * Math.sin(angle)
        };
      });
        //console.log(positions);

        const edgeTraces = [];
        edges.forEach(({ source, target, weight }) => {
          const src = positions[source];
          const tgt = positions[target];
          if (src && tgt) {
            edgeTraces.push({
              type: 'scatter',
              mode: 'lines',
              x: [src.x, tgt.x],
              y: [src.y, tgt.y],
              line: {
                width: normalize_line(weight ?? 2),
                color: '#888'
              },
              hoverinfo: 'none',
              showlegend: false
            });
          }
        });


        const nodeX = [], nodeY = [], nodeText = [], nodeColor = []

        nodes.forEach(node => {
          const pos = positions[node.id];
          nodeX.push(pos.x);
          nodeY.push(pos.y);
          nodeText.push(node.id);

        const systemKey = result[node.id];
        if (systemKey && color_map[systemKey]) {
          nodeColor.push(color_map[systemKey]);
        }
        }
      );

      //list of connections for each node
      const customData = nodes.map(node => {
        const connections = edgeMap[node.id] || [];
        return connections.map(c => `- ${c.other}: ${c.weight}`).join('<br>');
      });

      // Compute initial axis ranges with 10% padding for ~90% zoom
      const xPad = (Math.max(...nodeX) - Math.min(...nodeX)) * 0.1 || 1;
      const yPad = (Math.max(...nodeY) - Math.min(...nodeY)) * 0.1 || 1;
      const xRange = [Math.min(...nodeX) - xPad, Math.max(...nodeX) + xPad];
      const yRange = [Math.min(...nodeY) - yPad, Math.max(...nodeY) + yPad];
      // Legend for system categories
      const legendTraces = Object.entries(color_map).map(([system, color]) => {
      const displayName =
      system === 'Lymphatic System (Thymus, Lymph nodes, Spleen, Lymphatic vessels)' ? 'Lymphatic System' :
      system === 'Integumentary System (hair, skin, nails, glands)' ? 'Integumentary System' :
      system;
      return {
      type: 'scatter',
      mode: 'markers',
      x: [null],
      y: [null],
      name: displayName,
      marker: {
        color: color,
        size: 12
      },
      showlegend: true,
      hoverinfo: 'skip'
    }});
      const edgeTracesNoLegend = edgeTraces.map(trace => ({
        ...trace,
        showlegend: false
      }));
      //console.log(legendTraces);
        const data = [
          ...edgeTracesNoLegend,
          ...legendTraces,
          {
            type: 'scatter',
            mode: 'markers+text',
            x: nodeX,
            y: nodeY,
            text: nodeText,
            customdata: customData,
            textposition: 'top center',
            showlegend: false,
            marker: {
              size: 11,
              color: nodeColor,
              line:{
                width:2,
                color: '#000000'

              },
            },
            hoverinfo: 'text',
            hovertemplate:
              "<b>Node:</b> %{text}<br>" +
              "<b>Connections:</b><br>%{customdata}<extra></extra>",
          }
        ];

        const layout = {
          showlegend: true,
          hovermode: 'closest',
          margin: { l: 0, r: 0, b: 120, t: 30 },
          xaxis: { showgrid: false, zeroline: false, showticklabels: false, range: xRange },
          yaxis: { showgrid: false, zeroline: false, showticklabels: false, range: yRange },
          legend: {
            orientation: 'h',
            x: 0,
            y: -0.15,
            xanchor: 'left',
            yanchor: 'top',
            font: {
              family: 'Arial',
              size: 12,
              color: 'black'
            },
            itemwidth: 6
          },

          plot_bgcolor: '#FAFAFA',
          dragmode: 'pan',
          paper_bgcolor: '#ffffff',
        };

        await nextTick();

        Plotly.purge(this.$refs.plotlyContainer);
        await Plotly.newPlot(this.$refs.plotlyContainer, data, layout, { responsive: true, scrollZoom: true, displayModeBar: true });

        if (!this.plotlyContainer) return;
        // handle node click events
        this.plotlyContainer.on('plotly_click', (eventData) => {
          const point = eventData.points?.[0];

          if (!point) return;
          const clickedId = point.text;

          if (!clickedId || clickedId === 'undefined') {
            return;
          }
          if (clickedId === centerId && level !== 0) {
            return;
          }
        let selection = [];
        if (clickedId === 'All Clinical Features') {
          selection = [];
        } else {
         selection = clickedId;
        };
        //console.log(selection);
        this.$emit('selected_node', selection);
      })
      } catch (error) {
        console.error('Error rendering Plotly graph:', error);
      }
    }
  }
};
</script>

<style scoped>
.plot-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  overflow: hidden;
}

.plot-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: auto;
  min-height: 800px;
}

.plot-graph {
  width: 100%;
  height: auto;
  min-height: 750px;
}

.slider-label {
  font-weight: 500;
  white-space: nowrap;
  margin-right: 10px;
  padding-bottom: 20px;
}

</style>


<style>
.v-slider-thumb__label > div {
  background-color: white !important;
  color: black !important;
}
</style>


