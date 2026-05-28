const assert = require('assert');

async function testParsingHelpers() {
  const {
    getSymptomColumns,
    normalizeDaysMapString,
  } = await import('../src/utils/dataParsing.js');

  const symptomRows = [
    {
      'S/N': '1',
      'Hydration||none||none||Hydration status': 'Y',
      'SystemA||OrganA||CatA||Symptom1': 'N',
      days_map: { 'SystemA||OrganA||CatA||Symptom1': '5' },
    },
    {
      'S/N': '2',
      'SystemB||OrganB||CatB||Symptom2': 'Y',
      days_map: { 'SystemB||OrganB||CatB||Symptom2': '2' },
      __studyKey: 'bundle::2',
    },
  ];

  const symptomCols = getSymptomColumns(symptomRows);
  assert(symptomCols.includes('Hydration||none||none||Hydration status'));
  assert(symptomCols.includes('SystemA||OrganA||CatA||Symptom1'));
  assert(symptomCols.includes('SystemB||OrganB||CatB||Symptom2'));
  assert(!symptomCols.includes('S/N'));
  assert(!symptomCols.includes('days_map'));
  assert(!symptomCols.includes('__studyKey'));

  const parsedObject = normalizeDaysMapString({ foo: '7' });
  assert.deepStrictEqual(parsedObject, { foo: '7' });

  const parsedString = normalizeDaysMapString('{"foo":"7"}');
  assert.deepStrictEqual(parsedString, { foo: '7' });

  const parsedEmpty = normalizeDaysMapString('not valid json');
  assert.deepStrictEqual(parsedEmpty, {});
}

exports.run = async function run() {
  await testParsingHelpers();
};
