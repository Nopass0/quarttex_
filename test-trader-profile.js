// Test script to check trader profile endpoint
const axios = require('axios');

async function testTraderProfile() {
  try {
    // First login to get trader token
    const loginResponse = await axios.post('http://localhost:3000/api/user/auth', {
      email: 'trader1@test.com',
      password: 'testpass123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token:', token);
    
    // Now fetch trader profile
    const profileResponse = await axios.get('http://localhost:3000/api/trader/profile', {
      headers: {
        'x-trader-token': token
      }
    });
    
    console.log('\nTrader Profile Response:');
    console.log(JSON.stringify(profileResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testTraderProfile();