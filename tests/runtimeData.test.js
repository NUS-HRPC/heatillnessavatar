const assert = require('assert');

function createFetch(responses) {
  return async function fetchImpl(url) {
    if (!(url in responses)) {
      return {
        ok: false,
        status: 404,
        async json() {
          throw new Error(`Unexpected request: ${url}`);
        },
      };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return responses[url];
      },
    };
  };
}

async function testBuildRuntimeAssetUrl() {
  const { buildRuntimeAssetUrl } = await import('../src/utils/runtimeData.js');
  assert.strictEqual(
    buildRuntimeAssetUrl('data/base/cases.json', '/heatillnessavatar/'),
    '/heatillnessavatar/data/base/cases.json'
  );
}

async function testLoadRuntimeDataBaseAndContributionMerge() {
  const { loadRuntimeData } = await import('../src/utils/runtimeData.js');

  const fetchImpl = createFetch({
    '/heatillnessavatar/data/base/cases.json': [
      { 'S/N': '1', Authors: 'Base', Outcome: 'Recovered', Days: { 'System||Organ||Cat||BaseSym': '1' } },
    ],
    '/heatillnessavatar/data/base/symptoms.json': [
      { 'S/N': '1', 'System||Organ||Cat||BaseSym': 'Y', days_map: { 'System||Organ||Cat||BaseSym': '1' } },
    ],
    '/heatillnessavatar/contributions/index.json': {
      schemaVersion: 1,
      bundles: [
        { id: 'valid-bundle', path: 'contributions/valid-bundle.json' },
        { id: 'invalid-bundle', path: 'contributions/invalid-bundle.json' },
      ],
    },
    '/heatillnessavatar/contributions/valid-bundle.json': {
      schemaVersion: 1,
      id: 'valid-bundle',
      cases: [
        { 'S/N': '1', Authors: 'Contribution', Outcome: 'Passed away' },
      ],
      symptoms: [
        { 'S/N': '1', 'System||Organ||Cat||ContributionSym': 'Y', days_map: { 'System||Organ||Cat||ContributionSym': '4' } },
      ],
    },
    '/heatillnessavatar/contributions/invalid-bundle.json': {
      schemaVersion: 1,
      id: 'invalid-bundle',
      cases: [{ 'S/N': '2', Authors: 'Bad' }],
      symptoms: [],
    },
  });

  const { caseData, symptomData } = await loadRuntimeData({
    fetchImpl,
    baseUrl: '/heatillnessavatar/',
  });

  assert.strictEqual(caseData.length, 2);
  assert.strictEqual(symptomData.length, 2);
  assert.strictEqual(caseData[0].__bundleId, 'base');
  assert.strictEqual(caseData[1].__bundleId, 'valid-bundle');
  assert.notStrictEqual(caseData[0].__studyKey, caseData[1].__studyKey);
  assert.strictEqual(caseData[1].__rowIndex, 1);

  assert.strictEqual(symptomData[0]['System||Organ||Cat||ContributionSym'], 'NR');
  assert.strictEqual(symptomData[1]['System||Organ||Cat||BaseSym'], 'NR');
  assert.deepStrictEqual(symptomData[1].days_map, { 'System||Organ||Cat||ContributionSym': '4' });
  assert.strictEqual(symptomData[1].__studyKey, caseData[1].__studyKey);
}

async function testLoadRuntimeDataFailsClearlyWhenBaseMissing() {
  const { loadRuntimeData } = await import('../src/utils/runtimeData.js');
  const fetchImpl = createFetch({
    '/data/base/symptoms.json': [],
    '/contributions/index.json': { schemaVersion: 1, bundles: [] },
  });

  await assert.rejects(
    () => loadRuntimeData({ fetchImpl, baseUrl: '/' }),
    /Failed to load data\/base\/cases\.json/
  );
}

exports.run = async function run() {
  await testBuildRuntimeAssetUrl();
  await testLoadRuntimeDataBaseAndContributionMerge();
  await testLoadRuntimeDataFailsClearlyWhenBaseMissing();
};
