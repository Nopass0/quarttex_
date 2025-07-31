# Merchant Emulator

A comprehensive merchant emulator application for testing the Chase payment platform.

## Features

- **Merchant Management**
  - Create and manage multiple merchants with API keys
  - Toggle between RUB and USDT-TRC20 payment types
  - Configure liquidity percentage (0-100%)
  - Set custom USDT rates for each merchant

- **Traffic Generation**
  - Configurable transaction intervals with variance
  - Amount probability distributions:
    - 1000-3000 RUB: 64%
    - 3000-5000 RUB: 69%
    - 5000-10000 RUB: 73%
    - 10000-20000 RUB: 82%
    - 20000-50000 RUB: 88%
    - 50000-100000 RUB: 92%
  - Transaction limits and counters
  - Automatic mock/liquid transaction handling

- **Callback Server**
  - Hosts endpoint on configurable port (default: 8080)
  - Receives POST callbacks with {id, status}
  - Automatically fetches transaction details on callback

- **Statistics & Analytics**
  - Success/failure rates
  - Error breakdown by category
  - Status distribution tracking
  - Liquid vs non-liquid transaction counts
  - Total amounts processed

- **Data Export**
  - Export transaction history to JSON
  - Export statistics to JSON
  - Automatic file organization by date

- **Device Emulator Integration** (Planned)
  - Manage virtual devices
  - Emit balance top-up notifications
  - Support for connected device operations

## Installation

```bash
# Clone the repository
cd /mnt/c/Projects/chase/merchant_emulator

# Build the application
cargo build --release

# Run the application
cargo run --release
```

## Configuration

The application uses default configuration that can be modified:

- **API Base URL**: `http://localhost:5000`
- **Callback Server Port**: `8080`
- **Data Directory**: System data directory + `/merchant-emulator`
- **Export Directory**: Downloads directory + `/merchant-emulator-exports`

## Usage

### Creating a Merchant

1. Select "Create New Merchant" from the main menu
2. Enter merchant name and API key
3. The application will verify the API key by connecting to the backend

### Configuring Traffic

1. Select a merchant
2. Choose "Configure Traffic Parameters"
3. Set interval, variance, and amount probabilities
4. Enable traffic generation with "Start Traffic"

### Viewing Statistics

- Per-merchant statistics available in merchant menu
- Global statistics available from main menu
- Real-time updates as transactions are processed

### Exporting Data

1. Select a merchant
2. Choose "Export Data"
3. Files will be saved to the configured export directory

## API Integration

The emulator integrates with the Chase merchant API:

- `GET /api/merchant/connect` - Verify merchant connection
- `GET /api/merchant/balance` - Get merchant balance
- `POST /api/merchant/transactions/create` - Create transactions
- `GET /api/merchant/transactions` - Fetch transaction details

## Error Handling

All API errors are:
- Logged with full details
- Categorized in statistics
- Saved in transaction history
- Displayed in the UI with helpful messages

## Data Persistence

The application automatically saves:
- Merchant configurations
- Transaction history
- Statistics data

Data is saved on:
- Every update operation
- Application exit
- Export operations