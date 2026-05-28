import { getSymptomColumns } from './dataParsing.js';

/**
 * Get the top N symptoms by count (how many times they appear as 'Y')
 */
export function getTopSymptomsByCount(symptomData, n = 5) {
  if (!symptomData || !symptomData.length) return [];

  const symptomCols = getSymptomColumns(symptomData);
  const counts = {};

  // Count occurrences of 'Y' for each symptom
  symptomCols.forEach((col) => {
    counts[col] = 0;
    symptomData.forEach((row) => {
      if (row[col] === 'Y' || row[col] === 'y') {
        counts[col]++;
      }
    });
  });

  // Convert to array and sort by count descending
  const sorted = Object.entries(counts)
    .map(([symptom, count]) => ({ symptom, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);

  return sorted;
}

/**
 * Get the top N symptoms by risk ratio
 */
export function getTopSymptomsByRiskRatio(treemapData, n = 5) {
  if (!Array.isArray(treemapData) || treemapData.length === 0) return [];

  const entries = treemapData
    .map((row) => {
      const levels = Object.keys(row)
        .filter((k) => k.startsWith('Level'))
        .map((k) => row[k])
        .filter((lvl) => lvl && lvl !== 'none');
      if (!levels.length) return null;

      const rr = row.rr_nr ?? row.rr;
      if (!Number.isFinite(rr) || rr <= 0) return null;

      return {
        symptom: levels.join('||'),
        riskRatio: rr,
        count: row.Count ?? 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.riskRatio - a.riskRatio)
    .slice(0, n);

  return entries;
}

/**
 * Format symptom name for display (extract last part after ||)
 */
export function formatSymptomName(symptom) {
  if (!symptom || typeof symptom !== 'string') return '';
  const parts = symptom.split('||');
  const lastPart = parts[parts.length - 1] || symptom;
  // Replace underscores with forward slash with spaces
  return lastPart.replace(/_/g, ' / ');
}
