const assert = require('assert');

function approxEqual(a, b, epsilon = 1e-6) {
  assert(Math.abs(a - b) <= epsilon, `Expected ${a} ≈ ${b}`);
}

async function testBasicRiskRatio(riskRatio) {
  const outcomes = ['Recovered', 'Recovered', 'Passed away', 'Passed away'];
  const symptoms = ['Y', 'N', 'Y', 'N'];
  const result = riskRatio(outcomes, symptoms);
  assert.strictEqual(result.a, 1);
  assert.strictEqual(result.b, 1);
  assert.strictEqual(result.c, 1);
  assert.strictEqual(result.d, 1);
  approxEqual(result.rr, 1);
}

async function testRiskRatioWithNrAsAbsent(riskRatioWithNr) {
  const outcomes = ['Recovered', 'Recovered', 'Passed away', 'Passed away'];
  const symptoms = ['Y', 'NR', 'Y', 'NR'];
  const result = riskRatioWithNr(outcomes, symptoms);
  assert.strictEqual(result.a, 1);
  assert.strictEqual(result.b, 1);
  assert.strictEqual(result.c, 1);
  assert.strictEqual(result.d, 1);
  approxEqual(result.rr, 1);
}

async function testZeroUnexposedRisk(riskRatio) {
  const outcomes = ['Recovered', 'Passed away'];
  const symptoms = ['Y', 'Y']; // no unexposed group -> Infinity rr
  const result = riskRatio(outcomes, symptoms);
  assert.strictEqual(result.c, 0);
  assert.strictEqual(result.d, 0);
  assert(Number.isNaN(result.rr));
}

exports.run = async function run() {
  const { riskRatio, riskRatioWithNr } = await import('../src/utils/riskRatios.js');
  await testBasicRiskRatio(riskRatio);
  await testRiskRatioWithNrAsAbsent(riskRatioWithNr);
  await testZeroUnexposedRisk(riskRatio);
};
