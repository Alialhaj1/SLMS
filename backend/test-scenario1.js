/**
 * PHASE 3.6 - SCENARIO 1: BALANCED JOURNAL ENTRY
 * Purpose: Test basic capital investment journal entry
 * 
 * Expected:
 * - Journal creates successfully
 * - Status progresses: Draft -> Posted
 * - Trial Balance is balanced
 * - General Ledger shows correct balances
 * - Balance Sheet equation holds (Assets = Equity)
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let authToken = '';
let companyId = '';
let journalId = '';

// Test accounts (must exist in COA)
const CASH_ACCOUNT_CODE = '1000';
const CAPITAL_ACCOUNT_CODE = '3000';
const TEST_AMOUNT = 100000;

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function success(message) {
  log(`✅ ${message}`, GREEN);
}

function error(message) {
  log(`❌ ${message}`, RED);
}

function info(message) {
  log(`ℹ️  ${message}`, BLUE);
}

function warn(message) {
  log(`⚠️  ${message}`, YELLOW);
}

async function login() {
  try {
    info('Step 1: Authenticating...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@slms.com',
      password: 'Admin@123'
    });

    authToken = response.data.token;
    companyId = response.data.user.companyId;
    
    success(`Logged in as ${response.data.user.email}`);
    success(`Company ID: ${companyId}`);
    return true;
  } catch (err) {
    error(`Login failed: ${err.message}`);
    if (err.response?.data) {
      console.log(err.response.data);
    }
    return false;
  }
}

async function checkAccounts() {
  try {
    info('\nStep 2: Checking required accounts...');
    
    const response = await axios.get(`${API_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const accounts = response.data.data || response.data;
    const cash = accounts.find(a => a.code === CASH_ACCOUNT_CODE);
    const capital = accounts.find(a => a.code === CAPITAL_ACCOUNT_CODE);

    if (!cash) {
      error(`Cash account (${CASH_ACCOUNT_CODE}) not found!`);
      warn('Please create account: 1000 - Cash (Type: Asset)');
      return false;
    }

    if (!capital) {
      error(`Capital account (${CAPITAL_ACCOUNT_CODE}) not found!`);
      warn('Please create account: 3000 - Owner Capital (Type: Equity)');
      return false;
    }

    success(`Cash Account: ${cash.code} - ${cash.name} (${cash.type})`);
    success(`Capital Account: ${capital.code} - ${capital.name} (${capital.type})`);
    
    return { cash, capital };
  } catch (err) {
    error(`Failed to check accounts: ${err.message}`);
    return false;
  }
}

async function createJournal(cashAccount, capitalAccount) {
  try {
    info('\nStep 3: Creating balanced journal entry...');
    
    const journalData = {
      date: new Date().toISOString().split('T')[0],
      reference: 'CAP-001',
      description: 'Owner capital investment - Test Scenario 1',
      lines: [
        {
          accountId: cashAccount.id,
          debitAmount: TEST_AMOUNT,
          creditAmount: 0,
          description: 'Cash received from owner'
        },
        {
          accountId: capitalAccount.id,
          debitAmount: 0,
          creditAmount: TEST_AMOUNT,
          description: 'Owner capital contribution'
        }
      ]
    };

    info(`Journal Data: ${JSON.stringify(journalData, null, 2)}`);

    const response = await axios.post(`${API_BASE}/journals`, journalData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    journalId = response.data.data?.id || response.data.id;
    
    success(`Journal created: ID = ${journalId}`);
    success(`Status: ${response.data.data?.status || response.data.status}`);
    success(`Debit Total: ${TEST_AMOUNT.toLocaleString()}`);
    success(`Credit Total: ${TEST_AMOUNT.toLocaleString()}`);
    success(`Balance: ${TEST_AMOUNT - TEST_AMOUNT} ✓`);
    
    return journalId;
  } catch (err) {
    error(`Failed to create journal: ${err.message}`);
    if (err.response?.data) {
      console.log(JSON.stringify(err.response.data, null, 2));
    }
    return false;
  }
}

async function postJournal() {
  try {
    info('\nStep 4: Posting journal entry...');
    
    const response = await axios.post(
      `${API_BASE}/journals/${journalId}/post`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    success(`Journal posted successfully!`);
    success(`Status: ${response.data.data?.status || response.data.status}`);
    
    return true;
  } catch (err) {
    error(`Failed to post journal: ${err.message}`);
    if (err.response?.data) {
      console.log(JSON.stringify(err.response.data, null, 2));
    }
    return false;
  }
}

async function checkTrialBalance() {
  try {
    info('\nStep 5: Checking Trial Balance...');
    
    const today = new Date().toISOString().split('T')[0];
    const yearStart = new Date().getFullYear() + '-01-01';
    
    const response = await axios.get(
      `${API_BASE}/reports/trial-balance?from_date=${yearStart}&to_date=${today}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const data = response.data.data || response.data;
    const summary = data.summary;

    info(`Trial Balance as of ${today}`);
    info(`Total Debit:  ${summary.total_debit.toLocaleString()}`);
    info(`Total Credit: ${summary.total_credit.toLocaleString()}`);
    info(`Variance:     ${summary.variance}`);

    if (summary.is_balanced) {
      success(`Trial Balance is BALANCED ✓`);
      return true;
    } else {
      error(`Trial Balance is UNBALANCED ✗`);
      error(`Variance: ${summary.variance}`);
      return false;
    }
  } catch (err) {
    error(`Failed to check trial balance: ${err.message}`);
    return false;
  }
}

async function checkGeneralLedger(accountCode, expectedBalance) {
  try {
    info(`\nStep 6: Checking General Ledger for account ${accountCode}...`);
    
    // Note: Need to get account ID first
    const accountsResponse = await axios.get(`${API_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const accounts = accountsResponse.data.data || accountsResponse.data;
    const account = accounts.find(a => a.code === accountCode);
    
    if (!account) {
      error(`Account ${accountCode} not found`);
      return false;
    }

    const today = new Date().toISOString().split('T')[0];
    const yearStart = new Date().getFullYear() + '-01-01';
    
    const response = await axios.get(
      `${API_BASE}/reports/general-ledger/${account.id}?from_date=${yearStart}&to_date=${today}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const glData = response.data.data || response.data;
    
    info(`Account: ${account.code} - ${account.name}`);
    info(`Opening Balance: ${glData.opening_balance?.toLocaleString() || 0}`);
    info(`Ending Balance: ${glData.ending_balance?.toLocaleString() || 0}`);
    info(`Transaction Count: ${glData.transactions?.length || 0}`);

    if (glData.transactions && glData.transactions.length > 0) {
      const lastTx = glData.transactions[glData.transactions.length - 1];
      info(`Last Running Balance: ${lastTx.running_balance?.toLocaleString()}`);
      
      if (Math.abs(Math.abs(lastTx.running_balance) - expectedBalance) < 0.01) {
        success(`General Ledger balance matches expected: ${expectedBalance.toLocaleString()} ✓`);
        return true;
      } else {
        error(`Balance mismatch: Expected ${expectedBalance}, Got ${lastTx.running_balance}`);
        return false;
      }
    } else {
      warn(`No transactions found for account ${accountCode}`);
      return false;
    }
  } catch (err) {
    error(`Failed to check general ledger: ${err.message}`);
    if (err.response?.data) {
      console.log(JSON.stringify(err.response.data, null, 2));
    }
    return false;
  }
}

async function checkBalanceSheet() {
  try {
    info('\nStep 7: Checking Balance Sheet...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_BASE}/reports/balance-sheet?as_of_date=${today}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const data = response.data.data || response.data;
    const summary = data.summary;

    info(`Balance Sheet as of ${today}`);
    info(`Total Assets:      ${summary.total_assets.toLocaleString()}`);
    info(`Total Liabilities: ${summary.total_liabilities.toLocaleString()}`);
    info(`Total Equity:      ${summary.total_equity.toLocaleString()}`);
    info(`Retained Earnings: ${summary.retained_earnings.toLocaleString()}`);

    const rightSide = summary.total_liabilities + summary.total_equity;
    info(`\nEquation Check:`);
    info(`  Assets = ${summary.total_assets.toLocaleString()}`);
    info(`  Liabilities + Equity = ${rightSide.toLocaleString()}`);

    if (summary.is_balanced) {
      success(`Balance Sheet is BALANCED ✓`);
      success(`Equation: Assets (${summary.total_assets.toLocaleString()}) = Liabilities (${summary.total_liabilities.toLocaleString()}) + Equity (${summary.total_equity.toLocaleString()})`);
      return true;
    } else {
      error(`Balance Sheet is UNBALANCED ✗`);
      error(`Variance: ${summary.balance_variance}`);
      return false;
    }
  } catch (err) {
    error(`Failed to check balance sheet: ${err.message}`);
    if (err.response?.data) {
      console.log(JSON.stringify(err.response.data, null, 2));
    }
    return false;
  }
}

async function runScenario1() {
  console.log('\n' + '='.repeat(70));
  log('🧪 PHASE 3.6 - SCENARIO 1: BALANCED JOURNAL ENTRY', YELLOW);
  console.log('='.repeat(70) + '\n');

  // Step 1: Login
  const isLoggedIn = await login();
  if (!isLoggedIn) {
    error('Cannot proceed without authentication');
    return false;
  }

  // Step 2: Check accounts
  const accounts = await checkAccounts();
  if (!accounts) {
    error('Required accounts not found. Please create them first.');
    return false;
  }

  // Step 3: Create journal
  const journalCreated = await createJournal(accounts.cash, accounts.capital);
  if (!journalCreated) {
    error('Failed to create journal');
    return false;
  }

  // Step 4: Post journal
  const journalPosted = await postJournal();
  if (!journalPosted) {
    error('Failed to post journal');
    return false;
  }

  // Step 5: Check Trial Balance
  const tbBalanced = await checkTrialBalance();
  
  // Step 6: Check General Ledger
  const cashGLCorrect = await checkGeneralLedger(CASH_ACCOUNT_CODE, TEST_AMOUNT);
  const capitalGLCorrect = await checkGeneralLedger(CAPITAL_ACCOUNT_CODE, TEST_AMOUNT);
  
  // Step 7: Check Balance Sheet
  const bsBalanced = await checkBalanceSheet();

  // Final Results
  console.log('\n' + '='.repeat(70));
  log('📊 SCENARIO 1 TEST RESULTS', YELLOW);
  console.log('='.repeat(70));
  
  const results = [
    { test: 'Journal Created', passed: journalCreated },
    { test: 'Journal Posted', passed: journalPosted },
    { test: 'Trial Balance Balanced', passed: tbBalanced },
    { test: 'Cash GL Correct', passed: cashGLCorrect },
    { test: 'Capital GL Correct', passed: capitalGLCorrect },
    { test: 'Balance Sheet Balanced', passed: bsBalanced }
  ];

  results.forEach(result => {
    if (result.passed) {
      success(`${result.test}`);
    } else {
      error(`${result.test}`);
    }
  });

  const allPassed = results.every(r => r.passed);
  
  console.log('='.repeat(70));
  if (allPassed) {
    success('\n🎉 SCENARIO 1 PASSED ✅\n');
    success('All acceptance criteria met!');
    success('Ready to proceed to Scenario 2: Unbalanced Entry Rejection');
  } else {
    error('\n❌ SCENARIO 1 FAILED\n');
    error('Please review failed tests above');
  }
  console.log('='.repeat(70) + '\n');

  return allPassed;
}

// Run the scenario
runScenario1()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    error(`Unexpected error: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
