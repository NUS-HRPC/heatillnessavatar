import { normalizeDaysMapString } from "./dataParsing.js";
import { getSymptomColumns } from './dataParsing.js';
import { riskRatio, riskRatioWithNr } from "./riskRatios.js";

function parseDayValue(value) {
  if (value === null || value === undefined) return NaN;
  const str = String(value).trim();
  if (!str) return NaN;
  const num = Number(str);
  return Number.isFinite(num) ? num : NaN;
}

function applyDayFilterToRow(row, symptomCols, filters) {
  if (!filters.days_switch || !row) return row;
  const daysObj = normalizeDaysMapString(row.days_map);
  let updated = row;
  let changed = false;

  for (const sym of symptomCols) {
    const currentVal = row[sym];
    if (!currentVal) continue;
    const normalized = String(currentVal).trim().toUpperCase();
    if (normalized !== "Y" && normalized !== "N") continue;

    const numVal = parseDayValue(daysObj?.[sym]);
    const inRange =
      !Number.isNaN(numVal) &&
      numVal >= filters.day_min &&
      numVal <= filters.day_max;
    if (!inRange) {
      if (!changed) {
        updated = { ...row };
        changed = true;
      }
      updated[sym] = "NR";
    }
  }

  return updated;
}

export function applyDayFilterToSymptoms(rows, symptomCols, filters) {
  if (!filters.days_switch) return rows;
  return rows.map((row) => applyDayFilterToRow(row, symptomCols, filters));
}

export function processTreemapData(
  filteredIndices,
  data,
  caseData,
  symptomCols,
  filters,
) {
  const dfLong = [];
  const affectedSystemsSet = new Set();
  const uniqueSymptomsSet = new Set();

  filteredIndices.forEach((i) => {
    const row = applyDayFilterToRow(data[i], symptomCols, filters);
    for (const col of symptomCols) {
      const val = row[col];
      if (val && val.toUpperCase() === "Y") {
        const levels = col
          .split("||")
          .map((str) => str.replace(/\//g, "_"))
          .filter(Boolean);
        const entry = {
          "S/N": caseData[i]["S/N"],
          Sex: caseData[i].Sex,
          Presence: 1,
        };
        levels.forEach((lvl, idx) => {
          entry[`Level${idx + 1}`] = lvl;
        });

        dfLong.push(entry);
        if (levels[0] && levels[0] !== "Others") {
          affectedSystemsSet.add(levels[0]);
        }
        if (levels[levels.length - 1]) {
          uniqueSymptomsSet.add(levels[levels.length - 1]);
        }
      }
    }
  });

  const occurrenceMap = new Map();
  for (const item of dfLong) {
    const levelKeys = Object.keys(item).filter((k) => k.startsWith("Level"));
    const key = levelKeys.map((k) => item[k]).join("||");
    occurrenceMap.set(key, (occurrenceMap.get(key) || 0) + 1);
  }

  const dfOccurrence = Array.from(occurrenceMap.entries()).map(
    ([key, count]) => {
      const levels = key.split("||");
      const entry = { Count: count };
      levels.forEach((lvl, idx) => {
        entry[`Level${idx + 1}`] = lvl;
      });
      return entry;
    },
  );

  const filteredOccurrence = dfOccurrence
    .filter(
      (entry) =>
        entry.Level1 !== "Body core temperature (°C)" && entry.Count > 0,
    )
    .map((entry, index) => ({ ...entry, index }));

  return {
    occurrenceData: filteredOccurrence,
    longFormatData: dfLong,
    affectedSystems: affectedSystemsSet.size,
    uniqueSymptoms: uniqueSymptomsSet.size,
  };
}

export function computeRiskRatiosForTreemap(symptomRows, filteredCaseData) {
  if (!symptomRows.length || !filteredCaseData.length) return new Map();
  const outcomes = filteredCaseData.map((row) => row.Outcome);
  const symptomKeys = getSymptomColumns(symptomRows);

  const map = new Map();
  symptomKeys.forEach((key) => {
    const symptoms = symptomRows.map((row) => row[key]);
    const { rr } = riskRatio(outcomes, symptoms);
    const { rr: rrNr } = riskRatioWithNr(outcomes, symptoms);
    const path = key
      .split("||")
      .map((part) => part.replace(/\//g, "_"))
      .filter((part) => part && part !== "none")
      .join("||");
    map.set(path, { rr, rr_nr: rrNr });
  });

  return map;
}
