import axios from 'axios';

async function testApiDevice() {
  const API_URL = 'http://localhost:3001/api';
  
  // First login as trader
  console.log("Logging in as trader...");
  const loginResponse = await axios.post(`${API_URL}/trader/login`, {
    email: 'trader@test.com',
    password: 'trader123'
  });
  
  const token = loginResponse.data.token;
  console.log("Got token:", token.substring(0, 20) + "...");
  
  // Get devices
  console.log("\nGetting devices...");
  const devicesResponse = await axios.get(`${API_URL}/trader/devices`, {
    headers: {
      'x-trader-token': token
    }
  });
  
  console.log("Devices count:", devicesResponse.data.length);
  
  if (devicesResponse.data.length > 0) {
    const device = devicesResponse.data[0];
    console.log("\nFirst device:", {
      id: device.id,
      name: device.name,
      firstConnectionAt: device.firstConnectionAt,
      isOnline: device.isOnline,
      isWorking: device.isWorking
    });
    
    // Get single device
    console.log(`\nGetting device ${device.id}...`);
    const deviceResponse = await axios.get(`${API_URL}/trader/devices/${device.id}`, {
      headers: {
        'x-trader-token': token
      },
      params: { _t: Date.now() } // Prevent caching
    });
    
    console.log("Device details:", {
      id: deviceResponse.data.id,
      name: deviceResponse.data.name,
      firstConnectionAt: deviceResponse.data.firstConnectionAt,
      isOnline: deviceResponse.data.isOnline,
      isWorking: deviceResponse.data.isWorking
    });
  }
}

testApiDevice().catch(console.error);