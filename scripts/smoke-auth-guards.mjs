// Read-only unauthenticated checks. Never logs cookies or API credentials.
// AMO_EXPECT_AUTH_CONFIGURED=true for local against the real dev Supabase.
// Omit it in CI to verify the safe no-database state.
import assert from 'node:assert/strict';

const base = process.env.AMO_BASE_URL ?? 'http://127.0.0.1:3001';
const configured = process.env.AMO_EXPECT_AUTH_CONFIGURED === 'true';

async function check(path, method, status) {
  const response = await fetch(new URL(path, base), {
    method,
    redirect: 'manual',
    signal: AbortSignal.timeout(14000),
  });
  assert.equal(response.status, status, [method, path, response.status, 'wanted', status].join(' '));
  return response;
}

const signin = await check('/sign-in', 'GET', 200);
const html = await signin.text();
assert.match(html, configured ? /Sign in to AMO AI/ : /Supabase setup pending/);
console.log('PASS sign-in or pending-setup page');

const home = await check('/', 'GET', configured ? 307 : 200);
if (configured) {
  assert.match(home.headers.get('location') ?? '', /\/sign-in/);
}
console.log('PASS anonymous homepage behavior');

const apiStatus = configured ? 401 : 503;
for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
  await check('/api/copilotkit/info', method, apiStatus);
  console.log('PASS anonymous AI API ' + method + ' => ' + apiStatus);
}

const callback = await check('/auth/callback', 'GET', 307);
assert.match(callback.headers.get('location') ?? '', /\/sign-in/);
console.log('PASS invalid OAuth callback redirect');

console.log('Authentication guard smoke tests passed (no real user session tested).');
