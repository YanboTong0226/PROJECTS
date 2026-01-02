const express = require('express');
const router = express.Router();
const { fetchRealTimeStockPrice } = require('../BuyStocks');
const csv = require('csv-parser');
const fs = require('fs');
const {
    calculateMovingAverage,
    generateStrategy,
    getSuggestedFrequency,
    calculateBuyQuantity
} = require('../utils/singleAdviceFunction');
const {
    calculateVolatility,
    calculateBeta,
    calculateSharpeRatio,
    calculateMaxDrawdown,
    calculateVaR,
    calculateCVaR,
    calculateDynamicStopLoss,
    calculateATR,
    calculatePositionSize,
    calculateRiskScore
} = require('../utils/riskManagement');

router.get('/getSingleAdvice', async (req, res) => {
    const stockTicker = req.query.stock;
    const period = parseInt(req.query.period, 10);
    const initialCapital = parseFloat(req.query.capital);

    // 根据投资期限设置风险参数
    let riskTolerance;
    let riskPerTrade;
    let maxPositionSize;

    if (period === 1) {
        riskTolerance = 0.05;
        riskPerTrade = 0.02;
        maxPositionSize = 0.2;
    } else if (period === 2) {
        riskTolerance = 0.10;
        riskPerTrade = 0.03;
        maxPositionSize = 0.3;
    } else if (period === 5) {
        riskTolerance = 0.15;
        riskPerTrade = 0.04;
        maxPositionSize = 0.4;
    } else {
        return res.json({ success: false, message: 'Invalid period specified.' });
    }

    // 读取历史数据
    const stockData = [];
    const marketData = []; // 假设这是市场指数数据

    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('data', (row) => {
            if (row['DATE/TICKER'] && row[stockTicker]) {
                const price = parseFloat(row[stockTicker]);
                if (!isNaN(price) && price >= 0) {
                    stockData.push({
                        date: row['DATE/TICKER'],
                        price: price,
                        high: parseFloat(row[`${stockTicker}_HIGH`] || price),
                        low: parseFloat(row[`${stockTicker}_LOW`] || price),
                        close: price
                    });
                }
            }
        })
        .on('end', async () => {
            if (stockData.length === 0) {
                return res.json({ success: false, message: 'No valid stock data available' });
            }

            try {
                // 获取实时价格
                const realTimePrice = await fetchRealTimeStockPrice(stockTicker);
                
                // 计算技术指标
                const prices = stockData.map(d => d.price);
                const highPrices = stockData.map(d => d.high);
                const lowPrices = stockData.map(d => d.low);
                const closePrices = stockData.map(d => d.close);
                
                // 计算风险指标
                const volatility = calculateVolatility(prices);
                const atr = calculateATR(highPrices, lowPrices, closePrices);
                const maxDrawdown = calculateMaxDrawdown(prices);
                const var95 = calculateVaR(prices.map((p, i) => i > 0 ? (p - prices[i-1])/prices[i-1] : 0));
                const cvar95 = calculateCVaR(prices.map((p, i) => i > 0 ? (p - prices[i-1])/prices[i-1] : 0));
                
                // 计算动态止损价格
                const stopLossPrice = calculateDynamicStopLoss(realTimePrice, volatility, atr, riskTolerance);
                
                // 计算建议仓位
                const positionSize = calculatePositionSize(initialCapital, riskPerTrade, stopLossPrice, realTimePrice);
                const maxShares = Math.floor(initialCapital * maxPositionSize / realTimePrice);
                const finalPositionSize = Math.min(positionSize, maxShares);
                
                // 计算风险评分
                const riskMetrics = calculateRiskScore(
                    { prices, returns: prices.map((p, i) => i > 0 ? (p - prices[i-1])/prices[i-1] : 0) },
                    { prices: marketData.map(d => d.price), returns: marketData.map((d, i) => i > 0 ? (d.price - marketData[i-1].price)/marketData[i-1].price : 0) }
                );

                // 生成交易建议
                const strategy = generateStrategy(stockData, calculateMovingAverage(stockData, period), initialCapital, riskTolerance, riskPerTrade);
                const frequency = getSuggestedFrequency(period);

                res.json({
                    success: true,
                    strategy: strategy.strategy,
                    buyQuantity: strategy.strategy === "Buy the stock." ? finalPositionSize : 0,
                    frequency: frequency,
                    currentPrice: realTimePrice,
                    riskMetrics: {
                        volatility,
                        atr,
                        maxDrawdown,
                        var95,
                        cvar95,
                        riskScore: riskMetrics.riskScore,
                        components: riskMetrics.components
                    },
                    stopLoss: stopLossPrice,
                    positionSize: strategy.strategy === "Buy the stock." ? finalPositionSize : 0,
                    maxPositionSize: maxShares
                });
            } catch (error) {
                console.error('Error in stock analysis:', error);
                res.json({ success: false, message: 'Error in stock analysis' });
            }
        })
        .on('error', (err) => {
            console.error('Error reading stock data:', err);
            res.json({ success: false, message: 'Error reading stock data' });
        });
});

module.exports = router;