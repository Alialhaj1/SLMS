const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔄 محاولة تسجيل الدخول...');
    
    const response = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'ali@alhajco.com',
      password: 'A11A22A33'
    }, {
      timeout: 10000,
      validateStatus: () => true // Accept any status
    });

    console.log('\n✅ الرد من السيرفر:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('\n❌ خطأ:');
    if (error.code === 'ECONNREFUSED') {
      console.error('السيرفر لا يستجيب على المنفذ 4000');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('انتهى الوقت المحدد');
    } else if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testLogin();
