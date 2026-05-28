import { normalizeDaysMapString } from './dataParsing.js';

function parseDayValue(value) {
  if (value === null || value === undefined) return NaN;
  const str = String(value).trim();
  if (!str) return NaN;
  const num = Number(str);
  return Number.isFinite(num) ? num : NaN;
}

export function checkDayRange(daysObj, min, max) {
  return Object.values(daysObj || {}).some((v) => {
    const numVal = parseDayValue(v);
    return !Number.isNaN(numVal) && numVal >= min && numVal <= max;
  });
}

export function parseDays(days) {
  // Days is now an object from Python ETL, but use normalizer for safety
  return normalizeDaysMapString(days);
}

export function applyFiltersToData(caseData, filters) {
  const {
    sex_switch = false,
    select_sex,
    diagnosis_switch = false,
    diagnosis,
    age_switch = false,
    age_min,
    age_max,
    outcome_switch = false,
    outcome,
    hydration_switch = false,
    hydration,
    activity_switch = false,
    activity,
    temp_switch = false,
    temp_min,
    temp_max,
    bmi_switch = false,
    bmi_min,
    bmi_max,
    rh_switch = false,
    rh_min,
    rh_max,
    wbgt_switch = false,
    wbgt_min,
    wbgt_max,
    days_switch = false,
    day_min,
    day_max,
  } = filters;

  return caseData.reduce((acc, d, i) => {
    const sex = d.Sex || '';
    const diagnosisVal = d.Diagnosis || '';
    const age = d.Age;
    const temp = d.Temperature;
    const bmi = d.BMI;
    const outcomeVal = d.Outcome || '';
    const hydrationVal = d.HydrationStatus || '';
    const activityVal = (d['grouped_Activity Classification Activity Type (Case Type)'] || '').trim();
    const rh = d.Rh;
    const wbgt = d.WBGT;
    const days = parseDays(d.Days);

    // Enhanced day range check: if enabled, case must have at least one symptom in range
    // This matches Python's behavior of filtering out cases with no symptoms in day range
    let dayRangePass = true;
    if (days_switch) {
      dayRangePass = checkDayRange(days, day_min, day_max);
      // If no symptoms fall in the day range, exclude this case entirely
      if (!dayRangePass) {
        return acc;
      }
    }

    const outcomeNormalized = outcomeVal.toString().trim().toLowerCase();
    const outcomeAllowed =
      !outcome_switch ||
      (outcome &&
        outcome.some(
          (opt) => opt?.toString().trim().toLowerCase() === outcomeNormalized,
        ));

    if (
      (!sex_switch || select_sex.includes(sex)) &&
      (!diagnosis_switch || (diagnosis && diagnosis.includes(diagnosisVal))) &&
      (!age_switch || (age >= age_min && age <= age_max)) &&
      outcomeAllowed &&
      (!hydration_switch || (hydration && hydration.includes(hydrationVal))) &&
      (!activity_switch || (activity && activity.includes(activityVal))) &&
      (!temp_switch || (temp !== null && temp >= temp_min && temp <= temp_max)) &&
      (!bmi_switch || (bmi >= bmi_min && bmi <= bmi_max)) &&
      (!rh_switch || (rh !== null && rh >= rh_min && rh <= rh_max)) &&
      (!wbgt_switch || (wbgt !== null && wbgt >= wbgt_min && wbgt <= wbgt_max))
    ) {
      acc.push(i);
    }
    return acc;
  }, []);
}
