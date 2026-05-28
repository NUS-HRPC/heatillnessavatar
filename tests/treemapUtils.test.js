const assert = require('assert');

async function testProcessTreemapData() {
  const { processTreemapData } = await import('../src/utils/treemapUtils.js');

  const data = [
    {
      'SystemA||OrganA||CatA||Symptom1': 'Y',
      'SystemB||OrganB||CatB||Symptom2': 'N',
      days_map: "{'SystemA||OrganA||CatA||Symptom1': '5'}",
    },
    {
      'SystemA||OrganA||CatA||Symptom1': 'Y',
      'SystemB||OrganB||CatB||Symptom2': 'Y',
      days_map: "{'SystemB||OrganB||CatB||Symptom2': '3'}",
    },
  ];
  const caseData = [
    { 'S/N': '1', Sex: 'M' },
    { 'S/N': '2', Sex: 'F' },
  ];
  const symptomCols = [
    'SystemA||OrganA||CatA||Symptom1',
    'SystemB||OrganB||CatB||Symptom2',
  ];

  const { occurrenceData, affectedSystems, uniqueSymptoms } = processTreemapData(
    [0, 1],
    data,
    caseData,
    symptomCols,
    { days_switch: false }
  );

  assert.strictEqual(occurrenceData.length, 2);
  const first = occurrenceData.find((d) => d.Level4 === 'Symptom1');
  const second = occurrenceData.find((d) => d.Level4 === 'Symptom2');
  assert.strictEqual(first.Count, 2);
  assert.strictEqual(second.Count, 1);
  assert.strictEqual(affectedSystems, 2);
  assert.strictEqual(uniqueSymptoms, 2);
}

async function testApplyDayFilterToSymptoms() {
  const { applyDayFilterToSymptoms } = await import('../src/utils/treemapUtils.js');
  const rows = [
    {
      'S/N': '1',
      'SystemA||OrganA||CatA||Symptom1': 'Y',
      days_map: "{'SystemA||OrganA||CatA||Symptom1': '10'}",
    },
  ];
  const filtered = applyDayFilterToSymptoms(rows, ['SystemA||OrganA||CatA||Symptom1'], {
    days_switch: true,
    day_min: 1,
    day_max: 5,
  });
  assert.strictEqual(filtered[0]['SystemA||OrganA||CatA||Symptom1'], 'NR');
}

async function testRiskRatiosUseUnionedSymptomKeys() {
  const { computeRiskRatiosForTreemap } = await import('../src/utils/treemapUtils.js');

  const filteredCaseData = [
    { Outcome: 'Recovered' },
    { Outcome: 'Passed away' },
  ];
  const symptomRows = [
    { 'S/N': '1', 'SystemA||OrganA||CatA||Symptom1': 'Y', days_map: {} },
    { 'S/N': '2', 'SystemB||OrganB||CatB||Symptom2': 'Y', days_map: {} },
  ];

  const map = computeRiskRatiosForTreemap(symptomRows, filteredCaseData);
  assert(map.has('SystemA||OrganA||CatA||Symptom1'));
  assert(map.has('SystemB||OrganB||CatB||Symptom2'));
}

exports.run = async function run() {
  await testProcessTreemapData();
  await testApplyDayFilterToSymptoms();
  await testRiskRatiosUseUnionedSymptomKeys();
};
