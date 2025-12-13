import axios from 'axios';

const API = process.env.API_URL || 'http://localhost:4000';

function fail(msg: string, err?: any): never {
  console.error('SMOKE-FAIL:', msg);
  if (err) console.error(err && err.response ? err.response.data || err.response.statusText : err);
  process.exit(1);
}

async function waitForHealth(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await axios.get(`${API}/api/health`);
      if (r.status === 200 && r.data && r.data.status === 'ok') return;
    } catch (e) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  fail('health check did not become ready in time');
}

async function main() {
  console.log('SMOKE: waiting for API health...');
  await waitForHealth();
  console.log('SMOKE: health ok');

  const unique = Date.now();
  const email = `smoke+${unique}@example.com`;
  const password = 'Sm0keTest!';

  // Register (ignore if user already exists)
  try {
    console.log('SMOKE: register');
    await axios.post(`${API}/api/auth/register`, { email, password, full_name: 'Smoke Tester', role: 'Admin' });
  } catch (e: any) {
    if (e.response && e.response.status >= 500) fail('register failed', e);
  }

  // Login
  console.log('SMOKE: login');
  let loginResp;
  try {
    loginResp = await axios.post(`${API}/api/auth/login`, { email, password });
  } catch (e) {
    fail('login failed', e);
  }
  const { accessToken, refreshToken } = loginResp!.data;
  if (!accessToken || !refreshToken) fail('login response missing tokens');

  // Access protected endpoint
  console.log('SMOKE: access protected /api/me');
  let meResp;
  try {
    meResp = await axios.get(`${API}/api/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch (e) {
    fail('/api/me failed', e);
  }
  if (!meResp!.data || meResp!.data.email !== email) fail('/api/me returned unexpected data', meResp!.data);

  // Refresh (rotation)
  console.log('SMOKE: refresh (rotate)');
  let refreshResp;
  try {
    refreshResp = await axios.post(`${API}/api/auth/refresh`, { refreshToken });
  } catch (e) {
    fail('refresh failed', e);
  }
  const newRefresh = refreshResp!.data.refreshToken;
  if (!newRefresh) fail('refresh did not return new refresh token');

  // Ensure old refresh is rejected
  console.log('SMOKE: ensure old refresh is rejected');
  try {
    await axios.post(`${API}/api/auth/refresh`, { refreshToken });
    fail('old refresh should have been rejected');
  } catch (e: any) {
    if (e.response && e.response.status === 401) console.log('SMOKE: old refresh rejected as expected');
    else fail('old refresh rejection unexpected', e);
  }

  // Logout using the new refresh token
  console.log('SMOKE: logout with new refresh');
  try {
    await axios.post(`${API}/api/auth/logout`, { refreshToken: newRefresh });
  } catch (e) {
    fail('logout failed', e);
  }

  // Ensure new refresh is rejected after logout
  console.log('SMOKE: ensure new refresh is rejected after logout');
  try {
    await axios.post(`${API}/api/auth/refresh`, { refreshToken: newRefresh });
    fail('refresh after logout should be rejected');
  } catch (e: any) {
    if (e.response && e.response.status === 401) console.log('SMOKE: refresh after logout rejected as expected');
    else fail('refresh after logout rejection unexpected', e);
  }

  console.log('SMOKE: all checks passed');
  process.exit(0);
}

main().catch((e: any) => { console.error(e); process.exit(1); });
