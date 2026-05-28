const assert = require('assert');

async function testSecondTableAndFilterByNode() {
  const { secondTable, FilterByNode } = await import('../src/utils/tableUtils.js');

  const filteredCaseData = [
    { 'S/N': '1', __studyKey: 'base::1', Authors: 'A', Year: '2020', Title: 'T1', Journal: 'J', 'PMID/DOI': 'PMID: 1\nDOI: d1', 'Study type (case study/case series/XX)': 'case', Abstract: 'abs' },
    { 'S/N': '1', __studyKey: 'contrib::1', Authors: 'B', Year: '2021', Title: 'T2', Journal: 'J', 'PMID/DOI': 'PMID: 2\nDOI: d2', 'Study type (case study/case series/XX)': 'case', Abstract: 'abs2' },
  ];
  const filteredSymptomData = [
    { 'S/N': '1', __studyKey: 'base::1', 'System||Organ||Cat||SymA': 'Y' },
    { 'S/N': '1', __studyKey: 'contrib::1', 'System||Organ||Cat||SymA': 'N', 'System||Organ||Cat||SymB': 'Y' },
  ];

  const base = secondTable(filteredCaseData, filteredSymptomData, ['System']);
  assert.strictEqual(base.datat2.length, 2);
  assert(base.select_filter.SymA.includes('base::1'));
  assert(base.select_filter.SymB.includes('contrib::1'));

  const filtered = FilterByNode(base, ['System']);
  assert.strictEqual(filtered.datat2.length, 2);
}

exports.run = async function run() {
  await testSecondTableAndFilterByNode();
};
