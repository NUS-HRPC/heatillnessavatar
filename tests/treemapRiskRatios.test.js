const assert = require('assert');

async function testRiskRatiosMap(computeRiskRatiosForTreemap) {
  const filteredCaseData = [
    { 'S/N': '1', Outcome: 'Recovered' },
    { 'S/N': '2', Outcome: 'Passed away' },
    { 'S/N': '3', Outcome: 'Recovered' },
    { 'S/N': '4', Outcome: 'Passed away' },
  ];

  const symptomRows = [
    { 'S/N': '1', 'System||Organ/Sub||Category||SymptomA': 'Y', days_map: '{}' },
    { 'S/N': '2', 'System||Organ/Sub||Category||SymptomA': 'Y', days_map: '{}' },
    { 'S/N': '3', 'System||Organ/Sub||Category||SymptomA': 'N', days_map: '{}' },
    { 'S/N': '4', 'System||Organ/Sub||Category||SymptomA': 'N', days_map: '{}' },
  ];

  const map = computeRiskRatiosForTreemap(symptomRows, filteredCaseData);
  const entry = map.get('System||Organ_Sub||Category||SymptomA');
  assert(entry, 'Expected risk ratio entry for path');
  assert.strictEqual(entry.rr, 1);
  assert.strictEqual(entry.rr_nr, 1);
}

exports.run = async function run() {
  const { computeRiskRatiosForTreemap } = await import('../src/utils/treemapUtils.js');
  await testRiskRatiosMap(computeRiskRatiosForTreemap);
};
