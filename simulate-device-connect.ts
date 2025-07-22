// Simulate device WebSocket connection
import WebSocket from 'ws';

async function simulateDeviceConnect() {
  const deviceToken = process.argv[2];
  
  if (!deviceToken) {
    console.log("Usage: bun simulate-device-connect.ts <device-token>");
    console.log("\nAvailable device tokens:");
    console.log("- 48b67c803a962fec1b16c088c01ae35ffa456677b33adb5fbd87b5cd15c42cf0 (Device: 456)");
    console.log("- b7d3d7c730e5a3c6dcf47b4bb96a3c60f69c9c5b087171c5efb88e48d9b9b80f (Device: 123)");
    process.exit(1);
  }
  
  console.log(`Connecting to WebSocket with token: ${deviceToken.substring(0, 10)}...`);
  
  const ws = new WebSocket('ws://localhost:3001/ws/device-ping');
  
  ws.on('open', () => {
    console.log('WebSocket connected, sending ping...');
    
    // Send ping every second
    const interval = setInterval(() => {
      const pingData = {
        type: 'ping',
        deviceToken: deviceToken,
        batteryLevel: Math.floor(Math.random() * 30) + 70, // 70-100%
        networkSpeed: Math.floor(Math.random() * 50) + 50  // 50-100 Mbps
      };
      
      console.log('Sending ping:', pingData);
      ws.send(JSON.stringify(pingData));
    }, 1000);
    
    // Handle pong responses
    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      console.log('Received response:', response);
    });
    
    // Cleanup on close
    ws.on('close', () => {
      console.log('WebSocket closed');
      clearInterval(interval);
      process.exit(0);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(interval);
      process.exit(1);
    });
  });
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\nClosing connection...');
    ws.close();
  });
}

simulateDeviceConnect().catch(console.error);