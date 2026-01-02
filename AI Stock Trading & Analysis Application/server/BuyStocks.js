// stockPriceService.js
const axios = require('axios');
require('dotenv').config();

/**
 * Fetch real-time stock price using Finnhub API
 * @param {string} symbol - Stock ticker symbol (e.g., 'AAPL', 'MSFT')
 * @returns {Promise<number>} Current stock price
 */
async function fetchRealTimeStockPrice(symbol) {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY is not configured in .env file');
  }

  try {
    // Finnhub Quote API - returns current price
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const response = await axios.get(url, {
      timeout: 10000 // 10 second timeout
    });

    if (response.data && response.data.c !== undefined && response.data.c !== null) {
      // 'c' is the current price
      return parseFloat(response.data.c);
    } else if (response.data && response.data.pc !== undefined) {
      // Fallback to previous close price if current price is not available
      console.warn(`Current price not available for ${symbol}, using previous close price`);
      return parseFloat(response.data.pc);
    } else {
      throw new Error(`No price data found for ${symbol}. Response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    if (error.response) {
      // API returned an error response
      console.error(`Finnhub API error for ${symbol}:`, error.response.status, error.response.data);
      throw new Error(`Finnhub API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // Request was made but no response received
      console.error(`No response from Finnhub API for ${symbol}:`, error.message);
      throw new Error(`Network error: Unable to reach Finnhub API`);
    } else {
      // Error setting up the request
      console.error(`Error fetching price for ${symbol}:`, error.message);
      throw error;
    }
  }
}

/**
 * Fetch historical stock data using Alpha Vantage API
 * @param {string} symbol - Stock ticker symbol
 * @param {number} days - Number of days of historical data (default: 365)
 * @returns {Promise<Array>} Array of historical price data
 */
async function fetchHistoricalData(symbol, days = 365) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  // If API key not configured or is placeholder, use synthetic data
  if (!apiKey || apiKey === 'your_alpha_vantage_api_key_here') {
    console.warn(`ALPHA_VANTAGE_API_KEY not configured. Using synthetic data for ${symbol}...`);
    try {
      const currentPrice = await fetchRealTimeStockPrice(symbol);
      return generateSyntheticHistoricalData(symbol, currentPrice, days);
    } catch (priceError) {
      throw new Error(`Failed to fetch price for ${symbol}: ${priceError.message}`);
    }
  }

  try {
    // Alpha Vantage TIME_SERIES_DAILY endpoint
    // outputsize=compact returns last 100 trading days (free tier)
    // outputsize=full requires premium subscription
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}&outputsize=compact`;
    
    console.log(`Fetching historical data from Alpha Vantage for ${symbol}...`);
    const response = await axios.get(url, {
      timeout: 20000 // 20 second timeout for historical data
    });

    // Check for API errors
    if (response.data && response.data['Error Message']) {
      throw new Error(`Alpha Vantage API error: ${response.data['Error Message']}`);
    }

    if (response.data && response.data['Note']) {
      throw new Error(`Alpha Vantage API rate limit: ${response.data['Note']}`);
    }

    // Check for Information message (rate limit or premium feature)
    if (response.data && response.data['Information']) {
      console.warn(`Alpha Vantage API limit reached: ${response.data['Information']}`);
      console.log(`Using synthetic data for ${symbol} due to API limit...`);
      // Fall back to synthetic data - use Finnhub for current price
      const currentPrice = await fetchRealTimeStockPrice(symbol);
      return generateSyntheticHistoricalData(symbol, currentPrice, days);
    }

    if (response.data && response.data['Time Series (Daily)']) {
      const timeSeries = response.data['Time Series (Daily)'];
      const historicalData = [];
      
      // Get all dates and sort them
      const dates = Object.keys(timeSeries).sort();
      
      // Calculate the cutoff date (days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Filter dates within the requested range and format data
      for (const dateStr of dates) {
        const date = new Date(dateStr);
        if (date >= cutoffDate) {
          const data = timeSeries[dateStr];
          const formattedDate = dateStr.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
          
          historicalData.push({
            date: formattedDate,
            price: parseFloat(data['4. close']), // close price
            high: parseFloat(data['2. high']),
            low: parseFloat(data['3. low']),
            open: parseFloat(data['1. open']),
            volume: parseFloat(data['5. volume'])
          });
        }
      }
      
      // If cutoffDate filter resulted in no data, return all available data
      if (historicalData.length === 0 && dates.length > 0) {
        console.warn(`No data after cutoff date for ${symbol}, returning all available data (${dates.length} points)`);
        for (const dateStr of dates) {
          const data = timeSeries[dateStr];
          const formattedDate = dateStr.replace(/-/g, '');
          
          historicalData.push({
            date: formattedDate,
            price: parseFloat(data['4. close']),
            high: parseFloat(data['2. high']),
            low: parseFloat(data['3. low']),
            open: parseFloat(data['1. open']),
            volume: parseFloat(data['5. volume'])
          });
        }
      }
      
      // Sort by date (oldest first)
      historicalData.sort((a, b) => a.date.localeCompare(b.date));
      
      console.log(`Successfully fetched ${historicalData.length} data points from Alpha Vantage for ${symbol}`);
      return historicalData;
    } else {
      throw new Error(`No historical data found for ${symbol}. Response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn(`Alpha Vantage API rate limit reached. Using fallback...`);
      try {
        const currentPrice = await fetchRealTimeStockPrice(symbol);
        return generateSyntheticHistoricalData(symbol, currentPrice, days);
      } catch (priceError) {
        console.error(`Cannot get price for ${symbol} (429), using default value...`);
        return generateSyntheticHistoricalData(symbol, 100, days);
      }
    }
    console.error(`Error fetching historical data from Alpha Vantage for ${symbol}:`, error.message);
    
    // Fallback: Try to get current price and generate synthetic data
    console.warn(`Falling back to synthetic data for ${symbol}...`);
    try {
      const currentPrice = await fetchRealTimeStockPrice(symbol);
      return generateSyntheticHistoricalData(symbol, currentPrice, days);
    } catch (priceError) {
      console.error(`Cannot get price for ${symbol}, using default value...`);
      // Use a default price of 100 to generate some synthetic data
      return generateSyntheticHistoricalData(symbol, 100, days);
    }
  }
}

// Generate synthetic historical data when API is unavailable
function generateSyntheticHistoricalData(symbol, currentPrice, days) {
  const historicalData = [];
  const now = new Date();
  
  // Ensure we generate at least 30 trading days of data for timeline
  const minDays = Math.max(days, 60); // Check at least 60 calendar days to get ~30 trading days
  let tradingDaysCount = 0;
  const targetTradingDays = Math.max(days, 30); // At least 30 trading days
  
  // Generate data going backwards from today
  for (let i = 0; tradingDaysCount < targetTradingDays && i < minDays * 2; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Skip weekends (Saturday = 6, Sunday = 0) - only include trading days
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }
    
    tradingDaysCount++;
    
    // Add some random variation (±5%) to simulate price movement
    // Make it more realistic by trending towards current price
    const daysAgo = i;
    const trendFactor = 1 - (daysAgo * 0.001); // Slight upward trend over time
    const variation = (Math.random() - 0.5) * 0.1; // -5% to +5%
    const price = currentPrice * trendFactor * (1 + variation);
    
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    historicalData.push({
      date: dateStr,
      price: parseFloat(price.toFixed(2)),
      high: parseFloat((price * 1.02).toFixed(2)),
      low: parseFloat((price * 0.98).toFixed(2)),
      open: parseFloat((price * 0.99).toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
  }
  
  // Sort by date (oldest first)
  historicalData.sort((a, b) => a.date.localeCompare(b.date));
  
  console.log(`Generated ${historicalData.length} synthetic data points for ${symbol}`);
  return historicalData;
}

module.exports = { 
  fetchRealTimeStockPrice,
  fetchHistoricalData 
};
