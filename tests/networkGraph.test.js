const assert = require('assert');

async function testBuildGraph() {
  const { buildGraph } = await import('../src/utils/networkGraph.js');
  const dfFiltered = [
    { 'S/N': '1', 'System||Organ||Cat||SymA': 'Y', 'System||Organ||Cat||SymB': 'Y' },
    { 'S/N': '2', 'System||Organ||Cat||SymA': 'Y', 'System||Organ||Cat||SymC': 'Y' },
  ];

  const graph = buildGraph(dfFiltered, []);
  assert(graph.nodes.length >= 1);
  assert(graph.groupmap.System || graph.nodes.length >= 1);

  const subgraph = buildGraph(dfFiltered, ['System', 'Organ', 'Cat', 'SymA']);
  assert(subgraph.nodes.length >= 1);
}

exports.run = async function run() {
  await testBuildGraph();
};
