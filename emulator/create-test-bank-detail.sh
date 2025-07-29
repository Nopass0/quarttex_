#!/usr/bin/env bash

# Create a test trader
TRADER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/traders \
  -H "Content-Type: application/json" \
  -d '{
    "login": "test_trader_'$(date +%s)'",
    "name": "Test Trader",
    "password": "Test123!",
    "agentId": null
  }')

TRADER_ID=$(echo $TRADER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
TRADER_TOKEN=$(echo $TRADER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Created trader: $TRADER_ID"

# Create a bank detail for the trader
BANK_DETAIL_RESPONSE=$(curl -s -X POST http://localhost:3000/api/trader/bank-details \
  -H "Content-Type: application/json" \
  -H "x-trader-token: $TRADER_TOKEN" \
  -d '{
    "bank": "Сбербанк",
    "phone": "+79001234567",
    "cardNumber": "4111111111111111",
    "enabled": true
  }')

BANK_DETAIL_ID=$(echo $BANK_DETAIL_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "Created bank detail: $BANK_DETAIL_ID"
echo ""
echo "Use this code to connect device: $BANK_DETAIL_ID"
echo "Trader token: $TRADER_TOKEN"