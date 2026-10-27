const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const publicApp = fs.readFileSync(path.join(repoRoot, 'public', 'app.js'), 'utf8');
const adminApp = fs.readFileSync(path.join(repoRoot, 'admin', 'app.js'), 'utf8');

test('storefront no longer fakes a successful local order on static hosts', () => {
  assert.ok(!publicApp.includes('isStaticHost'));
  assert.ok(!publicApp.includes('local_static'));
  assert.ok(!publicApp.includes("fetch('/api/checkout'"));
});

test('admin console uses the configured backend base for all API calls', () => {
  assert.match(adminApp, /function\s+getApiBase\s*\(|const\s+apiUrl\s*=|fetch\(\s*apiUrl\(/);
  assert.ok(!adminApp.includes("fetch('/api/admin/summary'"));
  assert.ok(!adminApp.includes("fetch('/api/orders'"));
  assert.ok(!adminApp.includes("fetch(`/api/orders/"));
});
