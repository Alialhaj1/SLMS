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
  // Login user 7 (creator) and user 12 (reviewer/approver)
  const login7 = await post('/api/auth/login', { email: 'import@darkhawlan.com', password: 'A11A22A33', tenant_id: 7 }, '');
  const tk7 = login7.body.data.accessToken;
  console.log('User 7 logged in');

  const login12 = await post('/api/auth/login', { email: 'finance@darkhawlan.com', password: 'A11A22A33', tenant_id: 7 }, '');
  if (!login12.body?.data?.accessToken) { console.log('User 12 login FAILED:', JSON.stringify(login12.body).substring(0, 200)); return; }
  const tk12 = login12.body.data.accessToken;
  console.log('User 12 logged in');

  // ---- TEST 1: Document 8 (bank_transfer, already submitted, assigned to user 12) ----
  console.log('\n========= APPROVAL WORKFLOW TEST =========');

  // 1. User 12 checks inbox
  const inbox12 = await get('/api/approval-documents/inbox', tk12);
  console.log('1. User 12 inbox total:', inbox12.body?.total || inbox12.body?.data?.length || 0);
  if (inbox12.body?.data?.length > 0) {
    inbox12.body.data.forEach(d => console.log('   -', d.id, d.title, d.status));
  }

  // 2. User 12 views document 8 (should set to under_review)
  console.log('\n2. View document 8...');
  const viewR = await get('/api/approval-documents/8/tracker', tk12);
  console.log('   Tracker status:', viewR.status, 'current stage:', viewR.body?.data?.currentStage || viewR.body?.currentStage);

  // 3. User 12 approves step 1 (review)
  console.log('\n3. Approve doc 8 (step 1 = review)...');
  const approve1 = await post('/api/approval-documents/8/approve', { comment: 'Reviewed and approved - moving to last step' }, tk12);
  console.log('   Result:', approve1.status, JSON.stringify(approve1.body).substring(0, 300));

  // 4. Check doc status after step 1 approval
  const afterStep1 = await get('/api/approval-documents/8', tk12);
  const d1 = afterStep1.body?.data || afterStep1.body;
  console.log('   After step1: status=' + d1?.status + ', step=' + d1?.current_step + '/' + d1?.total_steps + ', assignee=' + d1?.current_assignee);

  // 5. Step 2 is tenant_admin (role 9) - user 7 has this role but is creator - should fail
  console.log('\n4. Creator (user 7) tries to approve own doc...');
  const creatorApprove = await post('/api/approval-documents/8/approve', { comment: 'Self approve attempt' }, tk7);
  console.log('   Result:', creatorApprove.status, JSON.stringify(creatorApprove.body).substring(0, 200));

  // 6. User 12 also has Admin role so can approve step 2
  console.log('\n5. User 12 approves step 2 (final approve)...');
  const approve2 = await post('/api/approval-documents/8/approve', { comment: 'Final approval - ready to post' }, tk12);
  console.log('   Result:', approve2.status, JSON.stringify(approve2.body).substring(0, 300));

  const afterStep2 = await get('/api/approval-documents/8', tk12);
  const d2 = afterStep2.body?.data || afterStep2.body;
  console.log('   After step2: status=' + d2?.status + ', step=' + d2?.current_step + '/' + d2?.total_steps);

  // 7. Post the document
  console.log('\n6. Post document 8...');
  const posted = await post('/api/approval-documents/8/post', { confirmToken: 'CONFIRM', comment: 'Posted to accounting' }, tk12);
  console.log('   Post result:', posted.status, JSON.stringify(posted.body).substring(0, 200));

  const afterPost = await get('/api/approval-documents/8', tk12);
  const d3 = afterPost.body?.data || afterPost.body;
  console.log('   After post: status=' + d3?.status);

  // 8. Check audit trail
  console.log('\n7. Audit trail for doc 8...');
  const timeline = await get('/api/approval-documents/8/timeline', tk12);
  const actions = timeline.body?.data || timeline.body?.timeline || [];
  if (Array.isArray(actions)) {
    actions.forEach(a => console.log('   ' + a.action + ' by user ' + a.actor_id + ' at ' + a.acted_at));
  } else {
    console.log('   Timeline:', JSON.stringify(timeline.body).substring(0, 300));
  }

  // 9. Check notifications for user 7 (creator)
  console.log('\n8. Notifications for creator (user 7)...');
  const notifs7 = await get('/api/notifications?limit=10', tk7);
  const recent = (notifs7.body?.data || []).filter(n => n.type && n.type.startsWith('approval_'));
  recent.slice(0, 5).forEach(n => console.log('   ' + n.type + ' → ' + n.action_url + ' at ' + n.created_at));

  // 10. Test REJECT flow with a new document
  console.log('\n========= REJECTION TEST =========');
  const submit2 = await post('/api/approval-documents/submit', {
    documentType: 'bank_transfer', referenceId: 997, referenceTable: 'payment_vouchers',
    documentNumber: 'BT-TEST-REJ', title: 'Test Rejection Flow', amount: 3000, currency: 'SAR'
  }, tk7);
  const rejDocId = submit2.body?.data?.approvalDocumentId || submit2.body?.approvalDocumentId;
  console.log('Submitted doc for rejection test, id:', rejDocId);

  // User 12 rejects with too-short reason
  const shortReject = await post('/api/approval-documents/' + rejDocId + '/reject', { comment: 'no' }, tk12);
  console.log('Short reason reject:', shortReject.status, shortReject.body?.message || shortReject.body?.data?.message);

  // User 12 rejects with proper reason
  const properReject = await post('/api/approval-documents/' + rejDocId + '/reject', { comment: 'Missing supporting documents and receipts. Please attach all relevant files.' }, tk12);
  console.log('Proper reject:', properReject.status, properReject.body?.message || properReject.body?.data?.message);

  const afterReject = await get('/api/approval-documents/' + rejDocId, tk7);
  const rd = afterReject.body?.data || afterReject.body;
  console.log('After reject: status=' + rd?.status + ', step=' + rd?.current_step + ', assignee=' + rd?.current_assignee);

  // Creator resubmits
  console.log('\nResubmit after rejection...');
  const resub = await post('/api/approval-documents/' + rejDocId + '/resubmit', { comment: 'Added missing documents' }, tk7);
  console.log('Resubmit:', resub.status, resub.body?.message || resub.body?.data?.message);

  const afterResub = await get('/api/approval-documents/' + rejDocId, tk7);
  const rsd = afterResub.body?.data || afterResub.body;
  console.log('After resubmit: status=' + rsd?.status + ', step=' + rsd?.current_step + ', assignee=' + rsd?.current_assignee);

  // 11. Test RECALL flow
  console.log('\n========= RECALL TEST =========');
  const submit3 = await post('/api/approval-documents/submit', {
    documentType: 'bank_transfer', referenceId: 996, referenceTable: 'payment_vouchers',
    documentNumber: 'BT-TEST-RCL', title: 'Test Recall Flow', amount: 2000, currency: 'SAR'
  }, tk7);
  const rclDocId = submit3.body?.data?.approvalDocumentId || submit3.body?.approvalDocumentId;
  console.log('Submitted doc for recall test, id:', rclDocId);

  const recall = await post('/api/approval-documents/' + rclDocId + '/recall', { comment: 'Made a mistake, recalling' }, tk7);
  console.log('Recall:', recall.status, recall.body?.message || recall.body?.data?.message);

  const afterRecall = await get('/api/approval-documents/' + rclDocId, tk7);
  const rcld = afterRecall.body?.data || afterRecall.body;
  console.log('After recall: status=' + rcld?.status);

  // 12. Test auto-approve (amount below threshold)
  console.log('\n========= AUTO-APPROVE TEST =========');
  const submitAuto = await post('/api/approval-documents/submit', {
    documentType: 'expense_claim', referenceId: 995, referenceTable: 'expense_requests',
    documentNumber: 'EXP-AUTO-001', title: 'Small Expense (auto-approve)', amount: 50, currency: 'SAR'
  }, tk7);
  console.log('Auto-approve submit:', submitAuto.status, 'status:', submitAuto.body?.data?.status || submitAuto.body?.status,
    'autoApproved:', submitAuto.body?.data?.autoApproved || submitAuto.body?.autoApproved);

  console.log('\n========= ALL TESTS COMPLETE =========');
})().catch(e => console.error('ERR:', e.message, e.stack));
