const fs = require('fs');
const csv = require('csv-parser');
const express = require('express');
const router = express.Router();
const {
    fillMissingDates,
    calculateReturns,
    calculateStandardDeviation,
    calculateCorrelation,
    meanVarianceOptimization,
    predictOptimalWeights // predictOptimalWeights 现在会返回 { weights: [...], analysis: "..." }
} = require('../utils/multipleAdviceFunction');

// --- 第一个路由 (portfolio-recommendation) 保持不变 ---
router.get('/portfolio-recommendation', (req, res) => {
    // ... (此部分代码不变)
    const { investmentYears, maxPortfolioSize } = req.query;
    if (!investmentYears || !maxPortfolioSize) {
        return res.json({ success: false, message: 'investmentYears and maxPortfolioSize are required.' });
    }
    const investmentYearsInt = parseInt(investmentYears, 10);
    const maxPortfolioSizeInt = parseInt(maxPortfolioSize, 10);
    if (isNaN(investmentYearsInt) || isNaN(maxPortfolioSizeInt)) {
        return res.json({ success: false, message: 'investmentYears and maxPortfolioSize must be valid numbers.' });
    }
    const stocks = [];
    const stockPrices = {};
    const allDates = new Set();
    const startDate = 20190102;
    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('headers', (headers) => {
            headers.forEach(header => {
                if (header !== 'DATE/TICKER') {
                    stocks.push(header);
                    stockPrices[header] = [];
                }
            });
        })
        .on('data', (row) => {
            const rowDate = parseInt(row['DATE/TICKER'], 10);
            if (rowDate >= startDate) {
                stocks.forEach(stock => {
                    const price = parseFloat(row[stock]);
                    if (!isNaN(price)) {
                        stockPrices[stock].push({ date: rowDate, price });
                        allDates.add(rowDate);
                    }
                });
            }
        })
        .on('end', () => {
            stocks.forEach(stock => {
                fillMissingDates(stockPrices[stock], allDates);
            });
            const returnsData = {};
            const correlationMatrix = {};
            stocks.forEach(stock => {
                returnsData[stock] = calculateReturns(stockPrices[stock].map(d => d.price));
            });
            for (let i = 0; i < stocks.length; i++) {
                for (let j = i + 1; j < stocks.length; j++) {
                    const stockA = stocks[i];
                    const stockB = stocks[j];
                    const correlation = calculateCorrelation(returnsData[stockA], returnsData[stockB]);
                    if (!correlationMatrix[stockA]) correlationMatrix[stockA] = {};
                    if (!correlationMatrix[stockB]) correlationMatrix[stockB] = {};
                    correlationMatrix[stockA][stockB] = correlation;
                    correlationMatrix[stockB][stockA] = correlation;
                }
            }
            const highCorrelationPairs = [];
            const lowCorrelationPairs = [];
            const negativeCorrelationPairs = [];
            for (let i = 0; i < stocks.length; i++) {
                for (let j = i + 1; j < stocks.length; j++) {
                    const stockA = stocks[i];
                    const stockB = stocks[j];
                    const correlation = correlationMatrix[stockA][stockB];
                    if (correlation > 0.8) {
                        highCorrelationPairs.push({ stockA, stockB, correlation });
                    } else if (correlation < 0.3 && correlation >= 0) {
                        lowCorrelationPairs.push({ stockA, stockB, correlation });
                    } else if (correlation < 0) {
                        negativeCorrelationPairs.push({ stockA, stockB, correlation });
                    }
                }
            }
            const selectedStocks = new Set();
            if (investmentYearsInt > 3) {
                highCorrelationPairs.forEach(({ stockA, stockB }) => {
                    if (selectedStocks.size < maxPortfolioSizeInt) {
                        if (!selectedStocks.has(stockA)) {
                            selectedStocks.add(stockA);
                        }
                        if (selectedStocks.size < maxPortfolioSizeInt && !selectedStocks.has(stockB)) {
                            selectedStocks.add(stockB);
                        }
                    }
                });
                lowCorrelationPairs.forEach(({ stockA, stockB }) => {
                    if (selectedStocks.size < maxPortfolioSizeInt) {
                        if (!selectedStocks.has(stockA)) {
                            selectedStocks.add(stockA);
                        }
                        if (selectedStocks.size < maxPortfolioSizeInt && !selectedStocks.has(stockB)) {
                            selectedStocks.add(stockB);
                        }
                    }
                });
            } else {
                lowCorrelationPairs.forEach(({ stockA, stockB }) => {
                    if (selectedStocks.size < maxPortfolioSizeInt) {
                        if (!selectedStocks.has(stockA)) {
                            selectedStocks.add(stockA);
                        }
                        if (selectedStocks.size < maxPortfolioSizeInt && !selectedStocks.has(stockB)) {
                            selectedStocks.add(stockB);
                        }
                    }
                });
            }
            const finalSelectedStocks = Array.from(selectedStocks).slice(0, maxPortfolioSizeInt);
            res.json({
                success: true,
                selectedStocks: finalSelectedStocks
            });
        })
        .on('error', (err) => {
            console.error(err);
            res.json({ success: false, message: 'Error processing stock data.' });
        });
});
// --- 第一个路由结束 ---


// --- 优化的 /multiplestock-analysis 路由 (添加了新的逻辑) ---
router.get('/multiplestock-analysis', (req, res) => {
    console.time("Total /multiplestock-analysis request");
    const stockTickers = req.query.stocks;
    const analysisType = req.query.type;
    if (!stockTickers) {
        return res.json({ success: false, message: 'Stock tickers are required.' });
    }
    const tickers = stockTickers.split(',');
    const startDate = 20190102;
    const allDates = new Set();
    const marketDataRaw = [];
    const stocksDataRaw = {};
    tickers.forEach(ticker => {
        stocksDataRaw[ticker] = [];
    });
    console.time("1. File Reading Time");
    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('data', (row) => {
            const rowDate = parseInt(row['DATE/TICKER'], 10);
            if (isNaN(rowDate) || rowDate < startDate) {
                return;
            }
            allDates.add(rowDate);
            if (row['MARKET']) {
                const price = parseFloat(row['MARKET']);
                if (!isNaN(price)) {
                    marketDataRaw.push({ date: rowDate, price });
                }
            }
            tickers.forEach(ticker => {
                if (row[ticker]) {
                    const price = parseFloat(row[ticker]);
                    if (!isNaN(price)) {
                        stocksDataRaw[ticker].push({ date: rowDate, price });
                    }
                }
            });
        })
        .on('error', (err) => {
            console.error('Error reading stock data:', err);
            return res.json({ success: false, message: 'Error reading stock data.' });
        })
        .on('end', () => {
            console.timeEnd("1. File Reading Time");
            console.time("2. Data Processing (fillMissingDates)");
            const stocksData = [];
            const marketData = [];
            fillMissingDates(marketDataRaw, allDates);
            marketData.push(...marketDataRaw);
            for (const ticker of tickers) {
                const stockData = stocksDataRaw[ticker];
                if (stockData.length === 0) {
                    return res.json({ success: false, message: `No data available for stock ${ticker} after 2019.` });
                }
                fillMissingDates(stockData, allDates);
                stocksData.push({
                    ticker: ticker,
                    prices: stockData.map(data => data.price),
                    dates: stockData.map(data => data.date)
                });
            }
            console.timeEnd("2. Data Processing (fillMissingDates)");
            try {
                console.time("3. Traditional Analysis Time");
                const traditionalWeights = meanVarianceOptimization(stocksData, { prices: marketData.map(d => d.price) });
                console.timeEnd("3. Traditional Analysis Time");
                
                if (analysisType === 'ai') {
                    console.time("4. AI Analysis Time (Waiting for API)");
                    // aiResult 现在是 { weights: [...], analysis: "..." }
                    predictOptimalWeights(stocksData)
                        .then(aiResult => {
                            console.timeEnd("4. AI Analysis Time (Waiting for API)");
                            console.timeEnd("Total /multiplestock-analysis request");
                            
                            // --- 修改了响应 ---
                            res.json({
                                success: true,
                                portfolioWeights: traditionalWeights,
                                aiPortfolioWeights: aiResult.weights, // <--- 提取 .weights
                                aiAnalysis: aiResult.analysis      // <--- 添加 .analysis
                            });
                        })
                        .catch(error => {
                            console.error('Error in AI prediction:', error);
                            console.timeEnd("4. AI Analysis Time (Waiting for API)");
                            console.timeEnd("Total /multiplestock-analysis request");
                            
                            // --- 修改了回退响应 ---
                            res.json({
                                success: true,
                                portfolioWeights: traditionalWeights,
                                aiPortfolioWeights: traditionalWeights,
                                aiAnalysis: "AI Analysis failed. Using traditional weights as a fallback.", // <--- 添加分析
                                message: 'AI optimization failed, using traditional weights instead'
                            });
                        });
                } else {
                    console.log("Skipping AI analysis as it was not requested.");
                    console.timeEnd("Total /multiplestock-analysis request");
                    
                    res.json({
                        success: true,
                        portfolioWeights: traditionalWeights
                    });
                }
            } catch (calcError) {
                console.error('Error during financial calculation:', calcError);
                console.timeEnd("Total /multiplestock-analysis request");
                res.json({ success: false, message: `Error during financial calculation: ${calcError.message}` });
            }
        });
});

module.exports = router;