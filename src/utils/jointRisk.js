/**
 * Joint symptom risk utility.
 *
 * Computes a risk ratio (and Katz log-normal 95 % CI) for N ≥ 2 symptoms
 * co-occurring simultaneously.
 *
 * Mirrors the ETL's calculate_joint_rr_matrix definition:
 *   Exposed   — every selected symptom is 'Y'
 *   Unexposed — NOT all selected symptoms are 'Y' (any other pattern counts);
 *               rows with unknown outcome are still excluded.
 *
 * NOTE: caseRows and symptomRows must be parallel arrays produced by
 * useDataLoader (filteredCaseData / filteredSymptomData).
 */

const PASSED_AWAY = 'passed away';
const RECOVERED   = 'recovered';

const normalizeOutcome = (v) => (v ?? '').toString().trim().toLowerCase();
const normalizeSym     = (v) => (v ?? '').toString().trim().toUpperCase();

/**
 * Compute joint risk for a set of symptoms.
 *
 * @param {object[]} caseRows         - Parallel case records (has .Outcome).
 * @param {object[]} symptomRows      - Parallel symptom records (same index).
 * @param {string[]} selectedSymptoms - Column keys to query jointly (≥ 2).
 * @returns {object|null}  null when < 2 symptoms, otherwise result object.
 */
export function computeJointRisk(caseRows, symptomRows, selectedSymptoms) {
  if (
    !Array.isArray(caseRows) ||
    !Array.isArray(symptomRows) ||
    caseRows.length !== symptomRows.length
  ) {
    throw new Error('caseRows and symptomRows must be parallel arrays of equal length.');
  }
  if (!selectedSymptoms || selectedSymptoms.length < 2) return null;

  let a = 0; // passed away & exposed   (all Y)
  let b = 0; // recovered   & exposed   (all Y)
  let c = 0; // passed away & unexposed (not all Y)
  let d = 0; // recovered   & unexposed (not all Y)

  const matchedCases = [];

  for (let i = 0; i < caseRows.length; i++) {
    const outcome    = normalizeOutcome(caseRows[i].Outcome);
    const isPassedAway = outcome === PASSED_AWAY;
    const isRecovered  = outcome === RECOVERED;
    if (!isPassedAway && !isRecovered) continue;

    const syms = symptomRows[i];
    const allPresent = selectedSymptoms.every((s) => normalizeSym(syms[s]) === 'Y');

    if (allPresent) {
      matchedCases.push(caseRows[i]);
      if (isPassedAway) a++;
      else b++;
    } else {
      // ETL unexposed: any row that is NOT all-Y
      if (isPassedAway) c++;
      else d++;
    }
  }

  const nExposed   = a + b;
  const nUnexposed = c + d;

  const riskExposed   = nExposed   > 0 ? a / nExposed   : NaN;
  const riskUnexposed = nUnexposed > 0 ? c / nUnexposed : NaN;

  let rr = NaN, ciLow = NaN, ciHigh = NaN;

  if (Number.isFinite(riskExposed) && Number.isFinite(riskUnexposed) && riskUnexposed > 0) {
    rr = riskExposed / riskUnexposed;

    // Woolf log-normal 95 % CI: SE = sqrt(1/a − 1/(a+b) + 1/c − 1/(c+d))
    if (a > 0 && nExposed > 0 && c > 0 && nUnexposed > 0) {
      const se  = Math.sqrt(1 / a - 1 / nExposed + 1 / c - 1 / nUnexposed);
      const lnRr = Math.log(rr);
      ciLow  = Math.exp(lnRr - 1.96 * se);
      ciHigh = Math.exp(lnRr + 1.96 * se);
    }
  }

  return {
    selectedSymptoms,
    nExposed,
    nUnexposed,
    nDeadExposed:   a,
    nDeadUnexposed: c,
    rr,
    ciLow,
    ciHigh,
    riskExposed,
    riskUnexposed,
    matchedCases,
  };
}
