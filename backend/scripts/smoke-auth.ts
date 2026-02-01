import axios from 'axios';

const API = process.env.API_URL || 'http://localhost:4000';

function fail(msg: string, err?: any) {
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
      // ignore
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

  try {
    console.log('SMOKE: register');
    await axios.post(`${API}/api/auth/register`, { email, password, full_name: 'Smoke Tester', role: 'Admin' });
  } catch (e: any) {
    // allow 409-like if user exists, but treat other errors as failure
    if (e.response && e.response.status === 500) fail('register failed', e);
  }

  console.log('SMOKE: login');
  const login = await axios.post(`${API}/api/auth/login`, { email, password }).catch((e) => fail('login failed', e));
  const { accessToken, refreshToken } = login.data;
  if (!accessToken || !refreshToken) fail('login response missing tokens');

  console.log('SMOKE: access protected /api/me');
  const me = await axios.get(`${API}/api/me`, { headers: { Authorization: `Bearer ${accessToken}` } }).catch((e) => fail('/api/me failed', e));
  if (!me.data || me.data.email !== email) fail('/api/me returned unexpected data', me.data);

  console.log('SMOKE: refresh (rotate)');
  const refreshResp = await axios.post(`${API}/api/auth/refresh`, { refreshToken }).catch((e) => fail('refresh failed', e));
  const newRefresh = refreshResp.data.refreshToken;
  if (!newRefresh) fail('refresh did not return new refresh token');

  console.log('SMOKE: ensure old refresh is rejected');
  await axios.post(`${API}/api/auth/refresh`, { refreshToken }).then(() => fail('old refresh should have been rejected')).catch((e) => {
    if (e.response && e.response.status === 401) console.log('SMOKE: old refresh rejected as expected');
    else fail('old refresh rejection unexpected', e);
  });

  console.log('SMOKE: logout with new refresh');
  await axios.post(`${API}/api/auth/logout`, { refreshToken: newRefresh }).catch((e) => fail('logout failed', e));

  console.log('SMOKE: ensure new refresh is rejected after logout');
  await axios.post(`${API}/api/auth/refresh`, { refreshToken: newRefresh }).then(() => fail('refresh after logout should be rejected')).catch((e) => {
    if (e.response && e.response.status === 401) console.log('SMOKE: refresh after logout rejected as expected');
    else fail('refresh after logout rejection unexpected', e);
  });

  console.log('SMOKE: all checks passed');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
