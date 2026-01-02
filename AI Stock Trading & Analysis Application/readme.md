# AI-Powered Stock Analysis and Trading Platform

A comprehensive full-stack web application that provides AI-powered stock analysis and portfolio management capabilities. The platform combines traditional financial analysis with modern AI technologies to deliver intelligent investment advice and real-time market insights.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Contributing](#contributing)
- [License](#license)

## Overview

This platform is designed to help investors make informed decisions through:

- **Real-time Stock Analysis**: Get detailed analysis of individual stocks with risk metrics and investment recommendations
- **Portfolio Optimization**: AI-powered portfolio recommendations based on correlation analysis and mean-variance optimization
- **Virtual Portfolio Trading**: Simulate stock trading with $100,000 virtual balance without risking real money
- **Hedge Analysis**: Analyze stock correlation to identify hedging opportunities and reduce portfolio risk
- **Risk Management**: Comprehensive risk assessment tools including VaR, CVaR, volatility analysis, and dynamic stop-loss calculations
- **AI-Powered Insights**: Integration with Google Gemini AI for intelligent Q&A and investment advice
- **Stock Agent**: Interactive AI agent for stock market analysis and trading strategies

## Features

### Core Features

1. **User Authentication & Management**

   - Secure user registration and login
   - Password hashing with bcrypt
   - User profile management
   - Balance tracking

2. **Single Stock Analysis**

   - Real-time stock price fetching
   - Technical indicators (Moving averages, ATR, etc.)
   - Risk metrics calculation (Volatility, Sharpe Ratio, Max Drawdown, VaR, CVaR)
   - Dynamic stop-loss recommendations
   - Position sizing suggestions
   - Investment strategy recommendations based on time horizon (1, 2, or 5 years)

3. **Multiple Stock Comparison**

   - Portfolio correlation analysis
   - Mean-variance optimization
   - AI-powered portfolio weight recommendations
   - Diversification analysis

4. **Portfolio Management**
   - Buy and sell stocks
   - View active holdings
   - Transaction history
   - Real-time portfolio valuation

5. **Virtual Portfolio Trading**
   - **Single Trade**: Buy individual stocks with quantity selection
   - **Batch Orders**: Execute multiple buy/sell orders simultaneously
   - **Hedge Analysis**: Analyze stock correlation to find hedging opportunities and reduce portfolio risk
   - **Historical Simulation**: Trade using past date prices
   - **FIFO sell order processing**
   - Virtual balance: $100,000 starting capital
   - Real-time price tracking via Finnhub API
   - Portfolio performance metrics (Total P/L, Winners & Losers)
   - Interactive price timeline charts
   - Backtesting strategies on historical data

## Technology Stack

### Frontend

- HTML5, CSS3, JavaScript
- Modern responsive UI design

### Backend

- **Node.js** (v14.0.0+)
- **Express.js** - Web framework
- **MySQL** - Database
- **bcryptjs** - Password hashing
- **Finnhub API** - Real-time stock data via API
- **csv-parser** - CSV data processing
- **mathjs** - Financial calculations

## Project Structure

```
├── frontend/                    # Frontend application
│   ├── index.html              # Landing/redirect page
│   ├── login.html              # User login page
│   ├── register.html           # User registration page
│   ├── singleStock.html        # Single stock analysis page
│   ├── multipleStockAnalysis.html  # Portfolio analysis page
│   ├── virtualPortfolio.html   # Virtual portfolio trading page
│   ├── getAIAdvice.html        # AI advice page
│   ├── userInformation.html   # User profile page
│   ├── navbar.html            # Navigation component
│   └── loginStyle.css         # Styling
│
├── server/                     # Backend server
│   ├── server.js              # Main server file
│   ├── routes/                # API routes
│   │   ├── register.js        # User registration
│   │   ├── userManagement.js  # User operations
│   │   ├── buyAndViewStocks.js # Trading operations
│   │   ├── sellStock.js       # Stock selling
│   │   ├── virtualPortfolio.js # Virtual portfolio trading & hedge analysis
│   │   ├── getSingleAdvice.js # Single stock advice
│   │   ├── getMultipleAdvice.js # Portfolio advice
│   │   ├── stockQA.js         # AI Q&A
│   │   ├── chartAnalysis.js   # Chart analysis
│   │   ├── aiPortfolioPrediction.js # AI portfolio optimization
│   │   ├── stock-trend.js     # Stock trend analysis
│   │   └── readCSV.js         # CSV data reading
│   ├── utils/                 # Utility functions
│   │   ├── db.js              # Database connection
│   │   ├── singleAdviceFunction.js # Single stock calculations
│   │   ├── multipleAdviceFunction.js # Portfolio calculations
│   │   └── riskManagement.js  # Risk metrics
│   ├── middleware/            # Middleware
│   │   └── cors.js            # CORS configuration
│   └── spec/                  # Tests
│
├── res/                        # Resource files
│   ├── stocks.xlsx           # Stock data
│   └── trades.xlsx           # Trade records
│
├── PromptCoder/               # AI Stock Agent Framework
│   ├── procoder/              # Core prompt coding library
│   ├── Stockagent/            # Stock market AI agent
│   │   ├── app.py            # Flask web application
│   │   ├── agent.py          # Agent logic
│   │   ├── stock.py          # Stock data interface
│   │   └── templates/        # HTML templates
│   ├── requirements.txt      # Python dependencies
│   └── setup.py              # Package setup
│
├── images/                     # Documentation images
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

## Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **npm** (Node Package Manager)
- **Python** (v3.8 or higher) - for Stock Agent
- **pip** (Python Package Manager)
- **MySQL** (with MySQL Workbench recommended)
- **Git** (for cloning repositories)

## Installation

### 1. Clone the Repository

```bash
git clone [repository-url]
cd "AI-Powered Stock Analysis and Trading Platform"
```

### 2. Install Node.js Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 3. Install Python Dependencies (for Stock Agent)

```bash
cd PromptCoder
pip install -e .
cd stockagent
```

### 4. Install Google Gemini AI

```bash
# Install Google Generative AI package
npm install @google/generative-ai

# Install all dependencies
npm install
```

### 5. Set Up MySQL Database

1. Create a MySQL database named `Stock_analysis_system`
2. Create the following tables:

**Users Table:**

```sql
CREATE TABLE users (
    email VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 100000.00
);
```

**Transactions Table:**

```sql
CREATE TABLE stock_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    stock_name VARCHAR(10) NOT NULL,
    number INT NOT NULL,
    current_price DECIMAL(10, 2) NOT NULL,
    is_sold BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES users(email)
);
```

### 6. Set Up Virtual Portfolio 

Run the database migration script to enable virtual portfolio features:

```bash
# Open MySQL Workbench or MySQL command line
# Connect to your Stock_analysis_system database
# Run the migration script:
source server/database_migration.sql

# Or manually execute:
mysql -u root -p Stock_analysis_system < server/database_migration.sql
```

This will add:
- `virtual_balance` column to `users` table (default: $100,000)
- `is_virtual` column to `stock_transactions` table
- Indexes for better query performance

## Configuration

### 1. Database Configuration

Update the database connection settings in `server/utils/db.js`:

```javascript
const pool = mysql.createPool({
  port: 3306,
  host: "localhost",
  user: "root",
  password: "YOUR_PASSWORD",
  database: "Stock_analysis_system",
});
```

### 2. Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

### 3. API Keys

You can obtain API keys from:

- **Google Gemini API**: https://platform.google.com/gemini
- **Finnhub API**: https://finnhub.io/ (Free tier available - 60 calls/minute, used for real-time prices)
- **Alpha Vantage API**: https://www.alphavantage.co/support/#api-key (Free tier available - 25 calls/day, used for historical price data)

## Running the Application

### 1. Start the Backend Server

```bash
cd server
node server.js
```

The backend server will start on `http://localhost:3000`

### 2. Start the Frontend Server

Open a new terminal:

```bash
npx http-server ./frontend -p 3001 --cors
```

The frontend will be available at `http://localhost:3001`

### 3. Start the Stock Agent 

Open a new terminal:

```bash
cd PromptCoder
cd Stockagent
python app.py
```

The Stock Agent will start on `http://localhost:5000`

**Note:** The Stock Agent is a separate AI-powered module for advanced stock market analysis and trading strategies.

## API Documentation

### User Management

#### Register User

- **Endpoint**: `POST /api/register`
- **Body**:
  ```json
  {
    "username": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: Success message or error

#### Login User

- **Endpoint**: `POST /api/login`
- **Body**:
  ```json
  {
    "username": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: Login status and user information

#### Check Login Status

- **Endpoint**: `GET /api/check-login`
- **Response**: `{ "loggedIn": true/false }`

### Stock Trading

#### Buy Stock

- **Endpoint**: `POST /api/buy-stock`
- **Body**:
  ```json
  {
    "symbol": "AAPL",
    "quantity": 10
  }
  ```
- **Response**: Transaction details and updated balance

#### Sell Stock

- **Endpoint**: `POST /api/sell-stock`
- **Body**:
  ```json
  {
    "symbol": "AAPL",
    "quantity": 5
  }
  ```
- **Response**: Sale confirmation and updated balance

#### View Active Stocks

- **Endpoint**: `GET /api/active-stocks`
- **Response**: Array of currently held stocks with details

### Virtual Portfolio

#### Virtual Buy Stock

- **Endpoint**: `POST /api/virtual-buy`
- **Body**:
  ```json
  {
    "symbol": "AAPL",
    "quantity": 10,
    "buyDate": "2024-01-01" // Optional, for historical simulation
  }
  ```
- **Response**: Transaction details and remaining virtual balance

#### Get Virtual Portfolio

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
      "losers": [...]
    }
  }
  ```

#### Virtual Sell Stock

- **Endpoint**: `POST /api/virtual-sell`
- **Body**:
  ```json
  {
    "symbol": "AAPL",
    "quantity": 5,
    "sellDate": "2024-02-01" // Optional
  }
  ```
- **Response**: Sale details and profit/loss information

#### Batch Buy

- **Endpoint**: `POST /api/batch-buy`
- **Body**:
  ```json
  {
    "orders": [
      {"symbol": "AAPL", "quantity": 10},
      {"symbol": "MSFT", "quantity": 5}
    ],
    "buyDate": "2024-01-01" // Optional
  }
  ```
- **Response**: Array of results for each order

#### Hedge Analysis

- **Endpoint**: `POST /api/hedge-analysis`
- **Body**:
  ```json
  {
    "symbols": ["AAPL", "MSFT", "GLD", "XOM"]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "analysis": {
      "correlationMatrix": {...},
      "hedgeSuggestions": [...],
      "riskWarnings": [...]
    }
  }
  ```

#### Portfolio Timeline

- **Endpoint**: `GET /api/portfolio-timeline`
- **Response**: Historical portfolio value data points

#### Backtest Strategy

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
- **Response**: Backtest results with performance metrics

### Stock Analysis

#### Single Stock Advice

- **Endpoint**: `GET /api/getSingleAdvice`
- **Query Parameters**:
  - `stock`: Stock ticker symbol (e.g., "AAPL")
  - `period`: Investment period in years (1, 2, or 5)
  - `capital`: Initial investment capital
- **Response**:
  ```json
  {
    "success": true,
    "strategy": "Buy the stock." | "Hold the stock." | "Sell the stock.",
    "buyQuantity": 100,
    "frequency": "Monthly",
    "currentPrice": 150.25,
    "riskMetrics": {
      "volatility": 0.15,
      "atr": 2.5,
      "maxDrawdown": 0.12,
      "var95": 0.05,
      "cvar95": 0.08,
      "riskScore": 6.5
    },
    "stopLoss": 142.50,
    "positionSize": 100,
    "maxPositionSize": 200
  }
  ```

#### Multiple Stock Analysis

- **Endpoint**: `GET /api/multiplestock-analysis`
- **Query Parameters**:
  - `stocks`: Comma-separated stock tickers (e.g., "AAPL,MSFT,GOOGL")
  - `type`: Analysis type - "ai" for AI-powered analysis (optional)
- **Response**:
  ```json
  {
    "success": true,
    "portfolioWeights": [0.4, 0.3, 0.3],
    "aiPortfolioWeights": [0.35, 0.35, 0.3],
    "aiAnalysis": "Analysis explanation..."
  }
  ```

#### Portfolio Recommendation

- **Endpoint**: `GET /api/portfolio-recommendation`
- **Query Parameters**:
  - `investmentYears`: Investment horizon in years
  - `maxPortfolioSize`: Maximum number of stocks in portfolio
- **Response**:
  ```json
  {
    "success": true,
    "selectedStocks": ["AAPL", "MSFT", "GOOGL"]
  }
  ```

### AI Features

#### Stock Q&A

- **Endpoint**: `POST /api/ask`
- **Body**:
  ```json
  {
    "question": "What is the outlook for AAPL stock?"
  }
  ```
- **Response**:
  ```json
  {
    "answer": "AI-generated answer...",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

#### Chart Analysis

- **Endpoint**: `POST /api/analyze-chart`
- **Body**:
  ```json
  {
    "stockTicker": "AAPL",
    "stockData": [...],
    "basicAdvice": "...",
    "riskMetrics": {...},
    "riskComponents": {...}
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "analysis": "Detailed AI analysis..."
  }
  ```

#### AI Portfolio Prediction

- **Endpoint**: `POST /api/ai-predict`
- **Body**:
  ```json
  {
    "features": [
      {
        "returns": 0.12,
        "risk": 0.15,
        "sharpeRatio": 0.8
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "weights": [0.4, 0.3, 0.3],
    "analysis": "Portfolio analysis explanation..."
  }
  ```

### Stock Trends

#### Get Stock Trend

- **Endpoint**: `GET /api/stock-trend`
- **Query Parameters**:
  - `symbol`: Stock ticker symbol
- **Response**: Historical price data and trends

## Database Schema

### Users Table

| Field           | Type          | Description                     |
| --------------- | ------------- | ------------------------------- |
| email           | VARCHAR(255)  | Primary key, user email         |
| password        | VARCHAR(255)  | Hashed password                 |
| balance         | DECIMAL(15,2) | User account balance            |
| virtual_balance | DECIMAL(15,2) | Virtual trading balance ($100k) |

### Stock Transactions Table

| Field         | Type          | Description                      |
| ------------- | ------------- | -------------------------------- |
| id            | INT           | Primary key, auto-increment      |
| email         | VARCHAR(255)  | Foreign key to users table       |
| stock_name    | VARCHAR(10)   | Stock ticker symbol              |
| number        | INT           | Number of shares                 |
| current_price | DECIMAL(10,2) | Price at time of transaction     |
| is_sold       | BOOLEAN       | Whether the stock has been sold  |
| is_virtual    | BOOLEAN       | Virtual trade flag (0=real, 1=virtual) |
| timestamp     | DATETIME      | Transaction timestamp            |

## Data Files

### output.csv

Stores historical stock price data in CSV format:

- Format: `DATE/TICKER,STOCK1,STOCK2,...,MARKET`
- Contains daily price data for multiple stocks
- Used for portfolio analysis and recommendations

### Excel Files

Located in `res/` directory:

- `stocks.xlsx`: Stock data
- `trades.xlsx`: Trade records

## Testing

The project includes test specifications using Jasmine:

```bash
cd server
npm test
```

Test files are located in `server/spec/`:

- `aiPortfolioPrediction.spec.js`
- `sharedState.spec.js`

## Troubleshooting

1. Create a `.env` file in the `ai-agent/PromptCoder2/Stockagent` directory with:

1. **Database Connection Error**

   - Verify MySQL is running
   - Check database credentials in `server/utils/db.js`
   - Ensure database `Stock_analysis_system` exists

2. **API Key Errors**

   - Verify `.env` files are created in correct directories
   - Check API keys are valid and have sufficient credits

3. **Port Already in Use**

   - Change port numbers in configuration files
   - Kill processes using the ports: `lsof -ti:3000 | xargs kill`

4. **CORS Errors**
   - Verify frontend is running on port 3001
   - Check CORS middleware is properly configured

5. **Batch/Basket Trading Error (Duplicate Entry)**
   
   If you encounter `ER_DUP_ENTRY` errors related to timestamps during batch trading (e.g., `Duplicate entry '...' for key 'stock_transactions.PRIMARY'`), it means your database is using `timestamp` as the primary key. To fix this and allow multiple transactions at the same second, run the following SQL commands in MySQL Workbench:

   ```sql
   -- 1. Drop existing primary key (assuming it's named PRIMARY)
   ALTER TABLE stock_transactions DROP PRIMARY KEY;

   -- 2. Add a new auto-increment ID column as the primary key
   ALTER TABLE stock_transactions ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST;

   -- 3. (Optional) Add index to timestamp for query performance
   ALTER TABLE stock_transactions ADD INDEX idx_timestamp (timestamp);

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Contact

For any questions or concerns, please contact the development team.

---
