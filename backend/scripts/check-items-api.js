/* eslint-disable no-console */

// Calls the running backend API and prints how many items it returns for a company.
// Usage: node scripts/check-items-api.js

const baseUrl = process.env.API_URL || 'http://localhost:4000';

async function main() {
  const email = process.env.LOGIN_EMAIL || 'ali@alhajco.com';
  const password = process.env.LOGIN_PASSWORD || 'A11A22A33';
  const companyId = Number(process.env.COMPANY_ID || '1');

  console.log(`API_URL=${baseUrl}`);
  console.log(`LOGIN_EMAIL=${email}`);
  console.log(`COMPANY_ID=${companyId}`);

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const loginJson = await loginRes.json().catch(() => null);
  if (!loginRes.ok || !loginJson?.success) {
    console.log('Login failed:', loginRes.status, loginJson);
    process.exit(1);
  }

  const token = loginJson.data?.accessToken;
  if (!token) {
    console.log('No accessToken in login response:', loginJson);
    process.exit(1);
  }

  const itemsRes = await fetch(`${baseUrl}/api/master/items`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Company-Id': String(companyId),
    },
  });

  const itemsJson = await itemsRes.json().catch(() => null);
  if (!itemsRes.ok) {
    console.log('Items API failed:', itemsRes.status, itemsJson);
    process.exit(1);
  }

  const total = itemsJson?.total;
  const rows = Array.isArray(itemsJson?.data) ? itemsJson.data : [];
  console.log(`Items API success: total=${total} rows.length=${rows.length}`);

  if (rows.length > 0) {
    console.log('First item:', rows[0]?.code, '|', rows[0]?.name, '|', rows[0]?.name_ar);
    console.log('Last item:', rows[rows.length - 1]?.code, '|', rows[rows.length - 1]?.name, '|', rows[rows.length - 1]?.name_ar);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
