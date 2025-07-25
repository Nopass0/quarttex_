# Rate Display Guide for Dual-Rate System

## Overview
The system now implements a dual-rate system with two rate fields:
- `rate`: Always contains the Rapira rate with KKK (used for all calculations)
- `merchantRate`: Contains the rate displayed to merchants (either merchant's custom rate or Rapira rate)

## Backend Changes
1. **Transaction Model**: Added `merchantRate` field to store merchant's display rate
2. **Transaction Creation**: 
   - `rate` field always stores Rapira rate with KKK
   - `merchantRate` stores either:
     - Merchant's custom rate (if `countInRubEquivalent = false`)
     - Rapira base rate without KKK (if `countInRubEquivalent = true`)
3. **Calculations**: All balance freezing, trader profits, and commissions use the `rate` field

## Frontend Implementation Guide

### 1. Update Transaction Types
```typescript
interface Transaction {
  // ... existing fields
  rate: number;         // Rapira rate with KKK (for calculations)
  merchantRate: number; // Rate displayed to merchant
  // ... other fields
}
```

### 2. Display Logic for Merchants
When displaying rates to merchants, always use `merchantRate`:

```typescript
// In transaction list or detail view
const displayRate = transaction.merchantRate;
const cryptoAmount = transaction.amount / transaction.merchantRate;
```

### 3. Display Logic for Traders
When displaying rates to traders, always use `rate`:

```typescript
// In trader interfaces
const calculationRate = transaction.rate;
const frozenAmount = transaction.amount / transaction.rate;
```

### 4. Example Components

#### Transaction Detail for Merchants
```typescript
export function MerchantTransactionDetail({ transaction }: { transaction: Transaction }) {
  const displayedRate = transaction.merchantRate;
  const cryptoAmount = transaction.amount / displayedRate;
  
  return (
    <div>
      <p>Сумма: {transaction.amount} RUB</p>
      <p>Курс: {displayedRate.toFixed(2)} RUB/USDT</p>
      <p>К получению: {cryptoAmount.toFixed(2)} USDT</p>
    </div>
  );
}
```

#### Transaction Detail for Traders
```typescript
export function TraderTransactionDetail({ transaction }: { transaction: Transaction }) {
  const calculationRate = transaction.rate;
  const frozenAmount = transaction.amount / calculationRate;
  
  return (
    <div>
      <p>Сумма: {transaction.amount} RUB</p>
      <p>Курс расчета: {calculationRate.toFixed(2)} RUB/USDT</p>
      <p>Заморожено: {frozenAmount.toFixed(2)} USDT</p>
    </div>
  );
}
```

## Important Notes
1. **Never use `rate` field for merchant display** - it contains KKK and is only for internal calculations
2. **Always use `merchantRate` for merchant interfaces** - this is what they expect to see
3. **The `adjustedRate` field is deprecated** - use `rate` for calculations and `merchantRate` for display
4. **Crypto calculations for merchant display** should use `merchantRate`, not `rate`

## API Response Example
```json
{
  "id": "tx123",
  "amount": 5000,
  "rate": 102.5,        // Rapira rate with KKK (for calculations)
  "merchantRate": 95.0, // Merchant's custom rate or Rapira base rate
  "status": "IN_PROGRESS",
  // ... other fields
}
```

## Migration Checklist
- [ ] Update transaction type definitions to include `merchantRate`
- [ ] Update merchant transaction lists to display `merchantRate`
- [ ] Update merchant transaction details to use `merchantRate` for crypto calculations
- [ ] Update trader interfaces to continue using `rate` for calculations
- [ ] Test with both merchant settings (countInRubEquivalent true/false)