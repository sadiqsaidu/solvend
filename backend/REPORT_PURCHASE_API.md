# Report Purchase API - Corrected Implementation

## Overview
This document describes the corrected report purchase API that now properly aligns with the smart contract functionality, enabling businesses to purchase vending machine data insights at different time granularities.

## API Endpoint
`POST /api/report/create`

## Request Body
```json
{
  "buyerWallet": "string",     // Required: Buyer's wallet address
  "reportType": "string",      // Required: "Daily", "Weekly", or "Monthly"
  "timeframeDays": number      // Required: Number of days (1-365)
}
```

## Request Examples

### Daily Report (1 USDC)
```json
{
  "buyerWallet": "8x7K2mN9pQ4rT5vL3sH6jW1eY8uI0oP7a",
  "reportType": "Daily",
  "timeframeDays": 1
}
```

### Weekly Report (5 USDC)
```json
{
  "buyerWallet": "8x7K2mN9pQ4rT5vL3sH6jW1eY8uI0oP7a",
  "reportType": "Weekly",
  "timeframeDays": 7
}
```

### Monthly Report (20 USDC)
```json
{
  "buyerWallet": "8x7K2mN9pQ4rT5vL3sH6jW1eY8uI0oP7a",
  "reportType": "Monthly",
  "timeframeDays": 30
}
```

## Response
```json
{
  "referenceId": "uuid-1234-5678-9abc-def0",
  "reportId": "report-1704067200000-12345678",
  "treasuryTokenAccount": "TREASURY_TOKEN_ACCOUNT_PUBKEY",
  "reportType": "Weekly",
  "timeframeDays": 7,
  "amount": 5000000,
  "memo": "uuid-1234-5678-9abc-def0"
}
```

## Pricing (Matching Smart Contract)
- **Daily**: 1,000,000 units (1 USDC)
- **Weekly**: 5,000,000 units (5 USDC)
- **Monthly**: 20,000,000 units (20 USDC)

## Business Use Cases

### 1. Daily Insights
- Real-time performance monitoring
- Daily sales analytics
- Immediate trend detection

### 2. Weekly Insights
- Weekly performance summaries
- Weekly trend analysis
- Medium-term planning data

### 3. Monthly Insights
- Monthly business intelligence
- Long-term trend analysis
- Strategic planning data

## Validation Rules
- `reportType` must be one of: "Daily", "Weekly", "Monthly"
- `timeframeDays` must be between 1 and 365
- `buyerWallet` must be a valid wallet address
- Price is automatically calculated based on `reportType`

## Database Schema
The Report model now includes:
- `reportType`: Enum (Daily, Weekly, Monthly)
- `timeframeDays`: Number (1-365)
- `amount`: Automatically calculated price
- All existing fields (referenceId, reportId, buyerWallet, status, etc.)

## Integration with Smart Contract
This API now properly matches the smart contract's `buy_report` function:
- Same report types (Daily, Weekly, Monthly)
- Same pricing structure
- Same timeframe handling
- Compatible data structure for blockchain integration

