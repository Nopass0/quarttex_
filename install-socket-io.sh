#!/bin/bash

# Install socket.io-client package
echo "Installing socket.io-client..."
cd frontend && npm install socket.io-client@^4.7.2

if [ $? -eq 0 ]; then
    echo "Successfully installed socket.io-client"
    echo "Now you can uncomment the WebSocket code in the dispute components"
else
    echo "Failed to install socket.io-client"
    exit 1
fi