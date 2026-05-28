const RECOVERED_INDICATORS = ['recovered'];
const PASSED_AWAY_INDICATORS = ['passed away'];

const normalizeOutcome = (value) => (value ?? '').toString().trim().toLowerCase();
const normalizeSymptom = (value) => (value ?? '').toString().trim().toUpperCase();

function countContingency(outcomes, symptoms, includeNrAsAbsent = false) {
  if (outcomes.length !== symptoms.length) {
    throw new Error('Outcome and symptom arrays must have the same length.');
  }

  let a = 0; // passed away & symptom present
  let b = 0; // recovered & symptom present
  let c = 0; // passed away & symptom absent
  let d = 0; // recovered & symptom absent

  for (let i = 0; i < outcomes.length; i += 1) {
    const outcome = normalizeOutcome(outcomes[i]);
    const symptom = normalizeSymptom(symptoms[i]);
    const isPassedAway = PASSED_AWAY_INDICATORS.includes(outcome);
    const isRecovered = RECOVERED_INDICATORS.includes(outcome);
    if (!isPassedAway && !isRecovered) continue;

    const symptomPresent = symptom === 'Y';
    const symptomAbsent = includeNrAsAbsent ? symptom === 'N' || symptom === 'NR' : symptom === 'N';
    if (!symptomPresent && !symptomAbsent) continue;

    if (symptomPresent && isPassedAway) a += 1;
    if (symptomPresent && isRecovered) b += 1;
    if (symptomAbsent && isPassedAway) c += 1;
    if (symptomAbsent && isRecovered) d += 1;
  }

  return { a, b, c, d };
}

function computeRiskRatio(outcomes, symptoms, includeNrAsAbsent = false) {
  const { a, b, c, d } = countContingency(outcomes, symptoms, includeNrAsAbsent);
  const riskExposed = a + b > 0 ? a / (a + b) : NaN;
  const riskUnexposed = c + d > 0 ? c / (c + d) : NaN;
  const rr =
    Number.isFinite(riskExposed) && Number.isFinite(riskUnexposed) && riskUnexposed > 0
      ? riskExposed / riskUnexposed
      : NaN;
  return { rr, a, b, c, d };
}

/**
 * Risk ratio using only 'Y' vs 'N'.
 */
export function riskRatio(outcomes, symptoms) {
  return computeRiskRatio(outcomes, symptoms, false);
}

/**
 * Risk ratio using 'Y' vs 'N'/'NR'.
 */
export function riskRatioWithNr(outcomes, symptoms) {
  return computeRiskRatio(outcomes, symptoms, true);
}

/**
 * Calculate risk ratios for a set of symptom keys against an outcome key.
 * @param {Array<object>} rows Array of records.
 * @param {Array<string>} symptomKeys Keys for symptom columns.
 * @param {string} outcomeKey Key for the outcome column.
 * @returns {Array<object>} Risk ratio stats per symptom.
 */
export function calculateRiskRatios(rows, symptomKeys, outcomeKey) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const outcomes = rows.map((row) => row[outcomeKey]);

  return symptomKeys.map((symptomKey) => {
    const symptoms = rows.map((row) => row[symptomKey]);
    const { rr, a, b, c, d } = riskRatio(outcomes, symptoms);
    const {
      rr: rrWithNr,
      a: aNr,
      b: bNr,
      c: cNr,
      d: dNr,
    } = riskRatioWithNr(outcomes, symptoms);

    return {
      symptom: symptomKey,
      rr,
      rr_nr: rrWithNr,
      a,
      b,
      c,
      d,
      c_nr: cNr,
      d_nr: dNr,
    };
  });
}
