const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔄 Testing login...\n');
    
    const response = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'ali@alhajco.com',
      password: 'A11A22A33'
    });
    
    console.log('✅ Login successful!');
    console.log('📧 Email:', response.data.user.email);
    console.log('🔑 Token:', response.data.accessToken.substring(0, 50) + '...');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Login failed:');
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data.message || error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testLogin();
