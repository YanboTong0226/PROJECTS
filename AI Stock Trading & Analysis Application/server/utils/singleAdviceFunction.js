const fs = require('fs');
const csv = require('csv-parser');
const express = require('express');
const router = express.Router();
const math = require('mathjs');
function calculateMovingAverage(data, period) {
    if (data.length < period) return []; // If there is insufficient data, return an empty array.

    const prices = data.map(item => item.price);
    let movingAvg = [];
    for (let i = 0; i < prices.length - period + 1; i++) {
        const avg = prices.slice(i, i + period).reduce((a, b) => a + b, 0) / period;
        movingAvg.push({ date: data[i + period - 1].date, avg: avg });
    }
    return movingAvg;
}

function generateStrategy(stockData, movingAverage, initialCapital, stopLossPercentage, riskPercentage) {
    const recentAvg = calculateRecentAverage(stockData, 10); // The average value of the last 10 days
    const longTermAvg = movingAverage[movingAverage.length - 1]?.avg; // Long-term average (the last moving average value).

    if (recentAvg == null || longTermAvg == null) {
        return { strategy: "Not enough data to generate a strategy.", buyQuantity: 0 };
    }

    let strategy = "Hold the stock.";
    let buyQuantity = 0;
    const stockPrice = stockData[stockData.length - 1]?.price; // Get the current stock price.

    // Improved strategy: Comparison of short-term average and long-term average.
    if (recentAvg > longTermAvg) {
        strategy = "Buy the stock.";

        // To calculate the number of shares to buy based on money management and risk management principles
        buyQuantity = calculateBuyQuantity(initialCapital, stockPrice, stopLossPercentage, riskPercentage);
    } else if (recentAvg < longTermAvg) {
        strategy = "Sell the stock.";
    }

    return { strategy, buyQuantity };
}

function calculateRecentAverage(data, days) {
    if (data.length < days) return null;
    const recentData = data.slice(-days);
    const avg = recentData.reduce((sum, item) => sum + item.price, 0) / days;
    return avg;
}

// Return the recommended trading frequency based on the investment period.
function getSuggestedFrequency(period) {
    if (period === 1) return 'Quarterly';
    if (period === 2) return 'Semi-annually';
    return 'Annually';
}
function calculateBuyQuantity(accountBalance, stockPrice, stopLossPercentage, riskPercentage) {
    const stopLossPrice = calculateStopLoss(stockPrice, stopLossPercentage);
    const stopLossAmount = stockPrice - stopLossPrice;
    const maxRiskAmount = accountBalance * (riskPercentage / 100);
    const buyQuantity = Math.floor(maxRiskAmount / stopLossAmount);
    return buyQuantity;
}
// Calculate the stop-loss price level.
function calculateStopLoss(stockPrice, stopLossPercentage) {
    return stockPrice * (1 - stopLossPercentage / 100); // stop-loss price
}
module.exports = {
    calculateMovingAverage,
    generateStrategy,
    calculateRecentAverage,
    getSuggestedFrequency,
    calculateBuyQuantity,
    calculateStopLoss
};