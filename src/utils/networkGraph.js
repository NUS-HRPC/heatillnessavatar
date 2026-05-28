import { getSymptomColumns } from './dataParsing.js';

export function buildGraph(dfFiltered, treemapSelection) {
  if (!dfFiltered || dfFiltered.length === 0) {
    return { nodes: [], edges: [], level: 0, groupmap: {} };
  }

  const columnKeys = getSymptomColumns(dfFiltered);
  const binarizedData = dfFiltered.map((row) => {
    const newRow = {};
    columnKeys.forEach((key) => {
      newRow[key] = row[key] === 'Y' || row[key] === 'y' ? 1 : 0;
    });
    return newRow;
  });

  const usedColumns = columnKeys.filter((col) => binarizedData.some((row) => row[col] === 1));
  const groupLevel = Math.max(0, treemapSelection.length - 1);
  const groupMap = {};

  usedColumns.forEach((col) => {
    const levels = col.split('||');
    let key = levels[groupLevel];
    if (key === 'none') {
      let i = groupLevel - 1;
      while (i >= 0) {
        if (levels[i] !== 'none') {
          key = levels[i];
          break;
        }
        i -= 1;
      }
    }
    if (!groupMap[key]) groupMap[key] = [];
    groupMap[key].push(col);
  });

  const groupBinaryMatrix = binarizedData.map((row) => {
    const newRow = {};
    Object.entries(groupMap).forEach(([group, cols]) => {
      newRow[group] = cols.reduce((sum, col) => sum + (row[col] || 0), 0);
    });
    return newRow;
  });

  const nodes = Object.keys(groupMap);
  const edges = [];

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      let coOccurrence = 0;

      for (let k = 0; k < groupBinaryMatrix.length; k += 1) {
        if (groupBinaryMatrix[k][nodeA] > 0 && groupBinaryMatrix[k][nodeB] > 0) {
          coOccurrence += 1;
        }
      }
      if (coOccurrence > 0) {
        const [source, target] = [nodeA, nodeB].sort();
        edges.push({ source, target, weight: coOccurrence });
      }
    }
  }

  if (treemapSelection.length > 0) {
    const selectedNode = treemapSelection[treemapSelection.length - 1];
    const finalEdges = [];
    const nodeSet = new Set([selectedNode]);
    edges.forEach((edge) => {
      if (edge.source === selectedNode || edge.target === selectedNode) {
        nodeSet.add(edge.source);
        nodeSet.add(edge.target);
        finalEdges.push(edge);
      }
    });

    return {
      nodes: [...nodeSet].map((id) => ({ id })),
      edges: finalEdges,
      level: groupLevel,
      groupmap: groupMap,
    };
  }

  return {
    nodes: nodes.map((id) => ({ id })),
    edges,
    level: groupLevel,
    groupmap: groupMap,
  };
}
