const fs = require('fs');
const path = require('path');

async function run() {
  const testsDir = __dirname;
  const files = fs.readdirSync(testsDir).filter((f) => f.endsWith('.test.js'));

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const fullPath = path.join(testsDir, file);
    try {
      const mod = require(fullPath);
      if (typeof mod.run !== 'function') {
        throw new Error('Test file must export a run() function');
      }
      await Promise.resolve(mod.run());
      console.log(`✓ ${file}`);
      passed += 1;
    } catch (err) {
      console.error(`✗ ${file}`);
      console.error(err);
      failed += 1;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
