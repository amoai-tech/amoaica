import assert from 'node:assert/strict';

// Read-only smoke checks. Does not send email or update passwords.
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3011';
const configured = process.env.TEST_SUPABASE_CONFIGURED === 'true';

async function request(path, status) {
  const response = await fetch(new URL(path, base), {
    redirect: 'manual',
    signal: AbortSignal.timeout(12000),
  });
  assert.equal(response.status, status, path + ': expected ' + status + ', got ' + response.status);
  return response;
}

for (const [path, expected] of [
  ['/forgot-password', 'Send password reset link'],
  ['/reset-password', 'Choose a new password'],
]) {
  const response = await request(path, 200);
  const page = await response.text();
  assert.ok(page.includes(expected), path + ': missing expected form');
  console.log('PASS: ' + path);
}

const signin = await request('/sign-in', 200);
const signinHtml = await signin.text();
if (configured) {
  assert.match(signinHtml, /Forgot password\?/);
  console.log('PASS: sign-in links to reset');
} else {
  assert.match(signinHtml, /Supabase setup pending/);
  console.log('PASS: unconfigured CI sign-in stays in safe mode');
}

const invalid = await request('/auth/callback?next=%2F%2Fevil.example', 307);
assert.match(invalid.headers.get('location') ?? '', /\/sign-in\?error=auth/);
console.log('PASS: invalid recovery callback cannot redirect externally');

const ai = await request('/api/copilotkit/info', configured ? 401 : 503);
console.log('PASS: unauthenticated AI API returns ' + ai.status);
console.log('Password recovery smoke checks passed; actual email link and password update require user session.');
