const fs = require('fs');
const csv = require('csv-parser');
const express = require('express');
const router = express.Router();
const math = require('mathjs');
// --- 导入您刚刚导出的 AI 核心函数 ---
const { getAIPortfolioPrediction } = require('../routes/aiPortfolioPrediction');

// --- (fillMissingDates, calculateReturns, calculateStandardDeviation, calculateCorrelation... 这些函数保持不变) ---
function fillMissingDates(stockData, allDates) {
    const dates = Array.from(allDates).sort((a, b) => a - b);
    const dateSet = new Set(dates);
    const filledData = [];
    let currentIndex = 0;
    dates.forEach(date => {
        if (stockData[currentIndex] && stockData[currentIndex].date === date) {
            filledData.push(stockData[currentIndex]);
            currentIndex++;
        } else {
            const previousPrice = filledData[filledData.length - 1]?.price || 0;
            filledData.push({ date: date, price: previousPrice });
        }
    });
    stockData.length = 0;
    stockData.push(...filledData);
}

function calculateReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        const yesterdayPrice = prices[i - 1];
        const todayPrice = prices[i];
        let dailyReturn = 0;
        if (yesterdayPrice !== 0) {
            dailyReturn = (todayPrice - yesterdayPrice) / yesterdayPrice;
        }
        returns.push(dailyReturn);
    }
    console.log(returns);
    return returns;
}

function calculateStandardDeviation(returns) {
    const invalidValues = returns.filter(r => r === Infinity || r === -Infinity);
    if (invalidValues.length > 0) {
        console.error('Invalid values found in returns array:', invalidValues);
        return NaN;
    }
    const mean = math.mean(returns);
    console.log('Mean:', mean);
    const variance = math.mean(returns.map(r => Math.pow(r - mean, 2)));
    console.log('Variance:', variance);
    const stddev = Math.sqrt(variance);
    console.log('Standard Deviation:', stddev);
    return stddev;
}

function calculateCorrelation(returns1, returns2) {
    const minLength = Math.min(returns1.length, returns2.length);
    const adjustedReturns1 = returns1.slice(0, minLength);
    const adjustedReturns2 = returns2.slice(0, minLength);
    return math.corr(adjustedReturns1, adjustedReturns2);
}

function meanVarianceOptimization(stocksData, marketData) {
    // ... (此函数保持不变) ...
    const returns = stocksData.map(stock => calculateReturns(stock.prices));
    const risks = stocksData.map(stock => calculateStandardDeviation(returns[stocksData.indexOf(stock)]));
    const riskFreeRate = 0.02;
    const sharpeRatios = returns.map(stockReturns => {
        const meanReturn = math.mean(stockReturns);
        const stdDev = math.std(stockReturns);
        return stdDev === 0 ? 0 : (meanReturn - riskFreeRate) / stdDev;
    });
    const n = stocksData.length;
    const correlationMatrix = [];
    for (let i = 0; i < n; i++) {
        let row = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                row.push(1);
            } else {
                const correlation = calculateCorrelation(returns[i], returns[j]);
                row.push(correlation);
            }
        }
        correlationMatrix.push(row);
    }
    const totalRisk = risks.reduce((acc, risk) => acc + risk, 0);
    const initialWeights = risks.map((risk, index) => {
        const riskAdjustment = risk / totalRisk;
        const sharpeAdjustment = 1 + (sharpeRatios[index] / 2);
        return riskAdjustment * sharpeAdjustment;
    });
    const adjustedWeights = initialWeights.map((weight, index) => {
        let adjustedWeight = weight;
        for (let j = 0; j < n; j++) {
            if (index !== j) {
                adjustedWeight *= (1 - Math.abs(correlationMatrix[index][j]));
            }
        }
        return adjustedWeight;
    });
    const totalAdjustedWeight = adjustedWeights.reduce((acc, weight) => acc + weight, 0);
    const finalWeights = adjustedWeights.map(weight => weight / totalAdjustedWeight);
    return finalWeights;
}

// --- 已修改的 AI 预测函数 ---
async function predictOptimalWeights(stocksData) {
    try {
        console.log("Preparing features for AI prediction...");
        const features = stocksData.map(stock => ({
            returns: calculateReturns(stock.prices),
            risk: calculateStandardDeviation(calculateReturns(stock.prices)),
            sharpeRatio: calculateSharpeRatio(calculateReturns(stock.prices))
        }));

        // --- 不再使用 fetch，而是直接调用函数 ---
        console.log("Calling local getAIPortfolioPrediction function...");
        const aiWeights = await getAIPortfolioPrediction(features);
        
        return aiWeights;

    } catch (error) {
        console.error('Error in predictOptimalWeights:', error);
        // Fallback to traditional optimization if AI prediction fails
        console.log("AI prediction failed, falling back to traditional optimization.");
        // 修复：返回正确格式的对象，而不是数组
        const fallbackWeights = meanVarianceOptimization(stocksData);
        return {
            weights: fallbackWeights,
            analysis: "AI analysis unavailable. Using traditional mean-variance optimization as fallback."
        };
    }
}
// --- 函数结束 ---

function calculateSharpeRatio(returns, riskFreeRate = 0.02) {
    if (!returns || returns.length === 0) return 0;
    const meanReturn = math.mean(returns);
    const stdDev = math.std(returns);
    return stdDev === 0 ? 0 : (meanReturn - riskFreeRate) / stdDev;
}

module.exports = {
    fillMissingDates,
    calculateReturns,
    calculateStandardDeviation,
    calculateCorrelation,
    meanVarianceOptimization,
    predictOptimalWeights,
    calculateSharpeRatio
};