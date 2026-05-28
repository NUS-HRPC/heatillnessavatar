/**
 * Data parsing utilities
 *
 * Note: All data transformation logic (CSV parsing, column extraction,
 * type conversion, etc.) has been moved to Python ETL pipeline.
 * This file now only contains utility functions needed for frontend operations.
 */

/**
 * Get all symptom column names from the symptom data
 * (Excludes S/N, days_map, and internal metadata keys)
 */
export function getSymptomColumns(symptomData) {
  if (!symptomData || symptomData.length === 0) return [];

  const keys = new Set();
  symptomData.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (key === 'S/N' || key === 'days_map' || key.startsWith('__')) return;
      keys.add(key);
    });
  });

  return [...keys];
}

/**
 * Like getSymptomColumns, but excludes columns that contain no 'Y' values
 * (e.g. biomarker columns with numeric/string values that slipped through the ETL).
 */
export function getBinarySymptomColumns(symptomData) {
  const cols = getSymptomColumns(symptomData);
  return cols.filter(k =>
    symptomData.some(row => {
      const v = row[k];
      return v != null && String(v).toUpperCase().trim() === 'Y';
    })
  );
}

/**
 * Normalizes Days field - handles both string and object types
 * Python ETL now exports Days as objects, so this mainly handles legacy data
 */
export function normalizeDaysMapString(daysMap) {
  // If already an object, return as-is
  if (typeof daysMap === 'object' && daysMap !== null) {
    return daysMap;
  }
  // If empty/null, return empty object
  if (!daysMap) return {};
  // If string, try to parse
  if (typeof daysMap === 'string') {
    try {
      return JSON.parse(daysMap);
    } catch {
      return {};
    }
  }
  return {};
}
