# Virtual Portfolio Feature

## Overview

The Virtual Portfolio feature allows users to simulate stock trading without using real money. Users can buy stocks at real-time prices, track their portfolio performance, and see profit/loss calculations based on current market prices.

## Features

1. **Virtual Stock Purchases**: Buy stocks using virtual balance (default: $100,000)
2. **Real-time Price Tracking**: Automatically fetches current stock prices from Finnhub API
3. **Portfolio Performance**: 
   - Total invested amount
   - Current portfolio value
   - Total profit/loss (both absolute and percentage)
4. **Winners & Losers**: Highlights top performing and worst performing stocks
5. **Backtesting**: Test trading strategies on historical data

## Database Setup

Before using the virtual portfolio feature, you need to run the database migration script:

1. Open MySQL Workbench or your MySQL client
2. Connect to your `Stock_analysis_system` database
3. Run the migration script: `server/database_migration.sql`

This will:
- Add `virtual_balance` column to `users` table (default: $100,000)
- Add `is_virtual` column to `stock_transactions` table (to distinguish virtual from real trades)
- Create indexes for better query performance

**Note**: If you see errors about columns already existing, that's okay - just continue. The script is idempotent.

## API Endpoints

### 1. Virtual Buy Stock
- **Endpoint**: `POST /api/virtual-buy`
- **Body**: 
  ```json
  {
    "symbol": "AAPL",
    "quantity": 10
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Virtual stock purchase successful",
    "data": {
      "symbol": "AAPL",
      "quantity": 10,
      "price": 150.25,
      "totalCost": 1502.50,
      "remainingVirtualBalance": 98497.50
    }
  }
  ```

### 2. Get Virtual Portfolio
- **Endpoint**: `GET /api/virtual-portfolio`
- **Response**: 
  ```json
  {
    "success": true,
    "portfolio": {
      "virtualBalance": 98497.50,
      "totalInvested": 1502.50,
      "totalCurrentValue": 1520.00,
      "totalProfitLoss": 17.50,
      "totalProfitLossPercent": 1.17,
      "holdings": [...],
      "winners": [...],
      "losers": [...],
      "totalHoldings": 1
    }
  }
  ```

### 3. Virtual Sell Stock
- **Endpoint**: `POST /api/virtual-sell`
- **Body**: 
  ```json
  {
    "timestamp": "2024-01-01 12:00:00",
    "sellQuantity": 5
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Virtual stock sold successfully",
    "data": {
      "sellAmount": 760.00,
      "realTimePrice": 152.00,
      "remainingQuantity": 5,
      "isSold": false
    }
  }
  ```

### 4. Backtest Strategy
- **Endpoint**: `POST /api/backtest`
- **Body**: 
  ```json
  {
    "symbol": "AAPL",
    "startDate": "20230101",
    "endDate": "20231231",
    "strategy": "Buy and Hold",
    "initialCapital": 10000
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "backtest": {
      "symbol": "AAPL",
      "strategy": "Buy and Hold",
      "startDate": "20230101",
      "endDate": "20231231",
      "initialCapital": 10000,
      "buyPrice": 150.00,
      "sellPrice": 180.00,
      "shares": 66,
      "finalValue": 11880.00,
      "profitLoss": 1880.00,
      "profitLossPercent": 18.80,
      "maxDrawdown": 12.5,
      "volatility": 25.3,
      "dataPoints": 252
    }
  }
  ```

## Frontend Usage

1. Navigate to the "Virtual Portfolio" page from the navigation bar
2. Enter a stock symbol (e.g., AAPL, MSFT, GOOGL) and quantity
3. Click "Buy Stock" to make a virtual purchase
4. The portfolio will automatically update showing:
   - Your virtual balance
   - Total invested amount
   - Current portfolio value
   - Profit/loss for each stock
   - Top winners and losers

## Key Features

### Real-time Price Updates
- Prices are fetched from Finnhub API in real-time
- Portfolio automatically refreshes every 30 seconds
- Manual refresh button available

### Winners & Losers Highlighting
- **Winners**: Stocks with positive profit/loss (highlighted in green)
- **Losers**: Stocks with negative profit/loss (highlighted in red)
- Shows top 5 winners and top 5 losers

### Portfolio Summary Cards
- **Virtual Balance**: Remaining virtual cash
- **Total Invested**: Sum of all purchase costs
- **Total P/L**: Current profit or loss
- **Total P/L %**: Percentage gain or loss

## Notes

- Virtual trades are separate from real trades
- Virtual balance starts at $100,000 for all users
- All prices are fetched in real-time from Finnhub API
- Historical data for backtesting comes from Finnhub API
- The system tracks price movements from the moment you buy

## Troubleshooting

### "User not logged in" error
- Make sure you're logged in before accessing the virtual portfolio

### "Insufficient virtual balance" error
- Your virtual balance is too low to make the purchase
- Check your current balance in the portfolio summary

### Price fetch errors
- Check your Finnhub API key in `.env` file
- Verify the stock symbol is correct
- Some symbols may not be available on Finnhub

### Database errors
- Make sure you've run the migration script
- Check that MySQL is running
- Verify database connection settings in `server/utils/db.js`




