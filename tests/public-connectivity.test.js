const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const storefrontJs = fs.readFileSync(path.join(root, '..', 'Laural-sHaven-UI', 'app.js'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, '..', 'Laural-sHaven-UI-AdminConsole', 'app.js'), 'utf8');
const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('storefront uses the public API only', () => {
  assert.match(storefrontJs, /https:\/\/laurals-haven-api\.onrender\.com/);
  assert.doesNotMatch(storefrontJs, /localhost:3000|127\.0\.0\.1|MOCK_MENU_RESPONSE|getMockResponse\(/);
});

test('admin console uses the public API only', () => {
  assert.match(adminJs, /https:\/\/laurals-haven-api\.onrender\.com/);
  assert.doesNotMatch(adminJs, /localhost:3000|127\.0\.0\.1|MOCK_ORDERS_RESPONSE|getMockResponse\(/);
});

test('backend supports the required order status flow', () => {
  assert.match(serverJs, /rejected/);
  assert.match(serverJs, /cooking/);
  assert.match(serverJs, /completed/);
  assert.match(serverJs, /STATUS_FLOW\s*=\s*\[[^\]]*pending[^\]]*accepted[^\]]*rejected[^\]]*cooking[^\]]*completed/);
});
