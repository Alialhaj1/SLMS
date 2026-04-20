const h = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const d = JSON.stringify(body);
    const r = h.request({ hostname: 'localhost', port: 4000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'Content-Length': Buffer.byteLength(d) } }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch (e) { resolve({ status: res.statusCode, body: b }); } });
    });
    r.on('error', reject); r.write(d); r.end();
  });
}
function get(path, token) {
  return new Promise((resolve, reject) => {
    h.get({ hostname: 'localhost', port: 4000, path, headers: { Authorization: 'Bearer ' + token } }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(b) }); } catch (e) { resolve({ status: res.statusCode, body: b }); } });
    }).on('error', reject);
  });
}

(async () => {
  const login7 = await post('/api/auth/login', { email: 'import@darkhawlan.com', password: 'A11A22A33', tenant_id: 7 }, '');
  const tk7 = login7.body.data.accessToken;
  const login12 = await post('/api/auth/login', { email: 'finance@darkhawlan.com', password: 'A11A22A33', tenant_id: 7 }, '');
  const tk12 = login12.body.data.accessToken;
  const login8 = await post('/api/auth/login', { email: 'ali@darkhawlan.com', password: 'A11A22A33', tenant_id: 7 }, '');
  const tk8 = login8.body?.data?.accessToken;

  console.log('===== VOID TEST =====');
  // Submit + approve + post + void
  const s1 = await post('/api/approval-documents/submit', {
    documentType: 'bank_transfer', referenceId: 990, referenceTable: 'payment_vouchers',
    documentNumber: 'BT-VOID-001', title: 'Test Void Flow', amount: 8000, currency: 'SAR'
  }, tk7);
  const voidDocId = s1.body?.data?.approvalDocumentId || s1.body?.approvalDocumentId;
  console.log('Submitted:', voidDocId);

  // Approve step 1 + step 2
  await post('/api/approval-documents/' + voidDocId + '/approve', { comment: 'Review OK' }, tk12);
  await post('/api/approval-documents/' + voidDocId + '/approve', { comment: 'Approved' }, tk12);
  // Post
  await post('/api/approval-documents/' + voidDocId + '/post', { confirmToken: 'CONFIRM' }, tk12);
  console.log('Posted, now voiding...');

  // Void with bad token
  const badVoid = await post('/api/approval-documents/' + voidDocId + '/void', { voidConfirm: 'YES', reason: 'Wrong payment' }, tk12);
  console.log('Bad void token:', badVoid.body?.message || badVoid.body?.data?.message);

  // Void with short reason
  const shortVoid = await post('/api/approval-documents/' + voidDocId + '/void', { voidConfirm: 'VOID', reason: 'err' }, tk12);
  console.log('Short reason:', shortVoid.body?.message || shortVoid.body?.data?.message);

  // Proper void
  const goodVoid = await post('/api/approval-documents/' + voidDocId + '/void', { voidConfirm: 'VOID', reason: 'Duplicate payment detected. Reversing this transaction.' }, tk12);
  console.log('Void result:', goodVoid.status, goodVoid.body?.message || goodVoid.body?.data?.message);

  // Check status
  const { Pool } = require('pg');
  const pool = new Pool({ host: 'postgres', port: 5432, user: 'slms', password: 'slms_pass', database: 'slms_db' });
  const vr = await pool.query('SELECT status, voided_at FROM approval_documents WHERE id=$1', [voidDocId]);
  console.log('After void:', vr.rows[0]);

  console.log('\n===== DELEGATION TEST =====');
  const s2 = await post('/api/approval-documents/submit', {
    documentType: 'bank_transfer', referenceId: 989, referenceTable: 'payment_vouchers',
    documentNumber: 'BT-DEL-001', title: 'Test Delegation Flow', amount: 5000, currency: 'SAR'
  }, tk7);
  const delDocId = s2.body?.data?.approvalDocumentId || s2.body?.approvalDocumentId;
  console.log('Submitted:', delDocId, 'assigned to user 12');

  // User 12 delegates to user 8
  if (tk8) {
    const delRes = await post('/api/approval-documents/' + delDocId + '/delegate', { toUserId: 8, reason: 'I am on vacation' }, tk12);
    console.log('Delegate to user 8:', delRes.status, delRes.body?.message || delRes.body?.data?.message);

    const dr = await pool.query('SELECT current_assignee FROM approval_documents WHERE id=$1', [delDocId]);
    console.log('After delegate, assignee:', dr.rows[0].current_assignee);

    // Delegate to creator (should fail)
    const badDel = await post('/api/approval-documents/' + delDocId + '/delegate', { toUserId: 7, reason: 'Delegating to creator' }, tk8);
    console.log('Delegate to creator:', badDel.body?.message || badDel.body?.data?.message);
  } else {
    console.log('User 8 login failed, skipping delegation test');
  }

  console.log('\n===== REMINDER TEST =====');
  const remRes = await post('/api/approval-documents/' + delDocId + '/remind', { comment: 'Please review ASAP' }, tk7);
  console.log('Reminder:', remRes.status, remRes.body?.message || remRes.body?.data?.message);

  console.log('\n===== CANCEL TEST =====');
  const s3 = await post('/api/approval-documents/submit', {
    documentType: 'bank_transfer', referenceId: 988, referenceTable: 'payment_vouchers',
    documentNumber: 'BT-CANCEL', title: 'Test Cancel Flow', amount: 1000, currency: 'SAR'
  }, tk7);
  const cancelDocId = s3.body?.data?.approvalDocumentId || s3.body?.approvalDocumentId;
  // Recall first (from pending_review to draft)
  await post('/api/approval-documents/' + cancelDocId + '/recall', {}, tk7);
  // Now cancel
  const cancelRes = await post('/api/approval-documents/' + cancelDocId + '/cancel', { comment: 'No longer needed' }, tk7);
  console.log('Cancel:', cancelRes.status, cancelRes.body?.message || cancelRes.body?.data?.message);
  const cr = await pool.query('SELECT status FROM approval_documents WHERE id=$1', [cancelDocId]);
  console.log('After cancel:', cr.rows[0]);

  console.log('\n===== INBOX COUNT + BELL =====');
  const cnt7 = await get('/api/approval-documents/inbox-count', tk7);
  const cnt12 = await get('/api/approval-documents/inbox-count', tk12);
  console.log('User 7 inbox count:', cnt7.body?.count);
  console.log('User 12 inbox count:', cnt12.body?.count);
  
  const unread7 = await get('/api/notifications/unread-count', tk7);
  const unread12 = await get('/api/notifications/unread-count', tk12);
  console.log('User 7 unread notifications:', unread7.body?.data?.count);
  console.log('User 12 unread notifications:', unread12.body?.data?.count);

  console.log('\n===== MONITOR DASHBOARD =====');
  const mon = await get('/api/approval-documents/monitor', tk7);
  const kpis = mon.body?.kpis || {};
  console.log('KPIs:', JSON.stringify(kpis));

  pool.end();
  console.log('\n===== ALL VOID/DELEGATE/CANCEL TESTS COMPLETE =====');
})().catch(e => console.error('ERR:', e.message, e.stack));
