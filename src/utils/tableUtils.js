import { getSymptomColumns } from './dataParsing.js';

const BASE_COLUMNS = [
  'Authors',
  'Year',
  'Title',
  'Journal',
  'PMID/DOI',
  'Study Type',
  'Abstract',
];

const SELECTED_FIELDS = [
  'Authors',
  'Year',
  'Title',
  'Journal',
  'PMID/DOI',
  'Cases',
  'Abstract',
];

function formatPMIDDOI(value) {
  if (!value) return '';
  let pmid = '';
  let doi = '';

  if (value.startsWith('https')) {
    doi = value.slice(19).trim();
  } else {
    const parts = value.split(/\nDOI:/i);
    if (parts.length > 1) {
      pmid = parts[0].replace(/^PMID:\s*/i, '').trim();
      doi = parts[1].trim();
    } else {
      const [pmidLine, rawDoi] = value.split(/\nPMID:/i);
      doi = (pmidLine || '').replace(/^DOI:\s*/i, '').trim();
      pmid = (rawDoi || '').trim();
    }
  }

  return `PMID: ${pmid.toUpperCase() || 'NIL'}\nDOI: ${doi}`;
}

export function manualFix(str = '') {
  if (!str || str === null || str === undefined) return '';
  return String(str)
    .replace(/ÇŽ/g, 'ă')
    .replace(/È™/g, 'ș')
    .replace(/È›/g, 'ț')
    .replace(/Ã³/g, 'ó')
    .replace(/Ä…/g, 'ą')
    .replace(/Å‚/g, 'ł')
    .replace(/Å„/g, 'ń')
    .replace(/Ä™/g, 'ę')
    .replace(/Ã/g, 'í')
    .replace(/íº/g, 'ú')
    .replace(/í¡/g, 'á')
    .replace(/í/g, 'Á')
    .replace(/í¶/g, 'ö')
    .replace(/í¼/g, 'ü')
    .replace(/í©/g, 'é')
    .replace(/Oâ€™/g, "O'")
    .replace(/ â€œ/g, ' ')
    .replace(/â€/g, '')
    .replace(/â€¢/g, '')
    .replace(/Î¼/g, 'mu')
    .replace(/âˆ¼/g, '∼')
    .replace(/Â/g, '')
    .replace(/Î”/g, '');
}

function groupCaseRows(rows, includeIndex) {
  const tableColumns = includeIndex ? ['S/N', ...BASE_COLUMNS] : BASE_COLUMNS;
  const groupMap = new Map();

  rows.forEach((row) => {
    const normalizedRow = {
      ...row,
      'Study Type': row['Study Type'] ?? row['Study type (case study/case series/XX)'],
    };
    const key = normalizedRow.__studyKey || tableColumns.map((col) => normalizedRow[col]).join('|');
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        ...Object.fromEntries(tableColumns.map((col) => [col, normalizedRow[col]])),
        Cases: 1,
      });
    } else {
      groupMap.get(key).Cases += 1;
    }
  });

  return Array.from(groupMap.values()).map((row) => {
    const renamed = { ...row };
    renamed['PMID/DOI'] = formatPMIDDOI(renamed['PMID/DOI']);
    renamed.Authors = manualFix(renamed.Authors);
    renamed.Abstract = manualFix(renamed.Abstract);
    return renamed;
  });
}

export function handleTableSelection(df, includeIndex = false) {
  const data = groupCaseRows(df, includeIndex);
  const selectFields = includeIndex ? ['S/N', ...SELECTED_FIELDS] : SELECTED_FIELDS;
  const sorted = data.sort((a, b) => (a.Authors || '').toLowerCase().localeCompare((b.Authors || '').toLowerCase()));
  return sorted.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([key]) => selectFields.includes(key)))
  );
}

function getStudyId(row) {
  return String(row?.__studyKey ?? row?.['S/N'] ?? '');
}

function buildCleanedMaps(symptomRows, treemapSelection) {
  const level = treemapSelection.length;
  const rawColumnKeys = getSymptomColumns(symptomRows);

  const cleanedColumnToSN = {};
  const cleanedNodeToSN = {};

  symptomRows.forEach((row) => {
    const sn = getStudyId(row);
    rawColumnKeys.forEach((key) => {
      const value = row[key];
      if (!value || typeof value !== 'string' || value.toUpperCase() !== 'Y') return;
      const keyParts = key.split('||');
      const cleanedKey = keyParts.at(-1);
      if (!cleanedColumnToSN[cleanedKey]) cleanedColumnToSN[cleanedKey] = [];
      cleanedColumnToSN[cleanedKey].push(String(sn));

      const nodeIndex = level > 0 ? level - 1 : keyParts.length - 1;
      let nodeKey = keyParts[nodeIndex];
      if (nodeKey === 'none' || !nodeKey) {
        let i = level - 2;
        while (i >= 0) {
          if (keyParts[i] && keyParts[i] !== 'none') {
            nodeKey = keyParts[i];
            break;
          }
          i -= 1;
        }
      }
      if (!cleanedNodeToSN[nodeKey]) cleanedNodeToSN[nodeKey] = [];
      cleanedNodeToSN[nodeKey].push(String(sn));
    });
  });

  const symptomNames = Object.keys(cleanedColumnToSN).filter(
    (key) => key !== treemapSelection[treemapSelection.length - 1]
  );

  return { cleanedColumnToSN, cleanedNodeToSN, symptomNames };
}

function binarizeSymptoms(symptomRows) {
  const columnKeys = getSymptomColumns(symptomRows);
  const binarized = symptomRows.map((row) => {
    const newRow = {};
    columnKeys.forEach((key) => {
      newRow[key] = row[key] === 'Y' || row[key] === 'y' ? 1 : 0;
    });
    return newRow;
  });
  const usedColumns = columnKeys.filter((col) => binarized.some((row) => row[col] === 1));
  return { binarized, usedColumns };
}

export function secondTable(filteredCaseData, filteredSymptomData, treemapSelection) {
  if (!filteredSymptomData.length) {
    return { datat2: [], select_filter: {}, symptomNames: [], cleanedNodeToSN: {}, originalFiltered: [] };
  }

  const { binarized, usedColumns } = binarizeSymptoms(filteredSymptomData);
  const level = treemapSelection.length;  const matchingIndexes =
    level === 0
      ? filteredSymptomData.map((_, idx) => idx)
      : binarized.reduce((acc, row, idx) => {
          const isMatch = usedColumns.some((col) => {
            const levels = col.split('||');
            const match =
              levels.length >= level &&
              levels.slice(0, level).every((lvl, i) => lvl === treemapSelection[i]);
            return match && row[col] === 1;
          });
          if (isMatch) acc.push(idx);
          return acc;
        }, []);

  const dfCaseInfoFiltered = matchingIndexes.map((idx) => filteredCaseData[idx]);
  const dfSymptomFiltered = matchingIndexes.map((idx) => filteredSymptomData[idx]);

  const uniqueCaseMap = new Map();
  dfCaseInfoFiltered.forEach((row) => {
    const studyId = getStudyId(row);
    if (!uniqueCaseMap.has(studyId)) {
      uniqueCaseMap.set(studyId, row);
    }
  });
  const uniqueCases = Array.from(uniqueCaseMap.values());

  const { cleanedColumnToSN, cleanedNodeToSN, symptomNames } = buildCleanedMaps(
    dfSymptomFiltered,
    treemapSelection
  );
  const filteredTable = handleTableSelection(uniqueCases, true);

  return {
    datat2: filteredTable,
    select_filter: cleanedColumnToSN,
    symptomNames,
    cleanedNodeToSN,
    originalFiltered: uniqueCases,
  };
}

export function FilterByNode(baseResult, selectedNode) {
  const { cleanedNodeToSN, originalFiltered } = baseResult;
  if (!selectedNode || selectedNode.length === 0) {
    return { ...baseResult, nodeSelected: [] };
  }
  const arrays = selectedNode.map((node) => cleanedNodeToSN[node] || []);
  const intersection = arrays.reduce(
    (acc, curr) => acc.filter((x) => curr.includes(x)),
    arrays[0] || []
  );

  const finalFilteredTable = originalFiltered.filter((row) => intersection.includes(getStudyId(row)));
  const displayTable = handleTableSelection(finalFilteredTable, true);

  return {
    ...baseResult,
    datat2: displayTable,
    nodeSelected: intersection,
  };
}
