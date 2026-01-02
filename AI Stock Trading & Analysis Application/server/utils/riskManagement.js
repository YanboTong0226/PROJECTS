const math = require('mathjs');

// 计算波动率 (Volatility)
function calculateVolatility(prices, period = 20) {
    if (!prices || prices.length === 0) return 0;
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    if (returns.length === 0) return 0;
    const stdDev = math.std(returns.slice(-period));
    return stdDev * Math.sqrt(252); // 年化波动率
}

// 计算Beta系数
function calculateBeta(stockReturns, marketReturns) {
    if (!stockReturns || !marketReturns || stockReturns.length === 0 || marketReturns.length === 0) {
        return 1; // 默认返回1，表示与市场同步
    }
    // 手动计算协方差
    const meanStock = math.mean(stockReturns);
    const meanMarket = math.mean(marketReturns);
    let covariance = 0;
    for (let i = 0; i < stockReturns.length; i++) {
        covariance += (stockReturns[i] - meanStock) * (marketReturns[i] - meanMarket);
    }
    covariance /= stockReturns.length;
    
    // 计算市场方差
    const marketVariance = math.variance(marketReturns);
    return marketVariance === 0 ? 1 : covariance / marketVariance;
}

// 计算夏普比率 (Sharpe Ratio)
function calculateSharpeRatio(returns, riskFreeRate = 0.02) {
    if (!returns || returns.length === 0) return 0;
    const meanReturn = math.mean(returns);
    const stdDev = math.std(returns);
    return stdDev === 0 ? 0 : (meanReturn - riskFreeRate) / stdDev;
}

// 计算最大回撤 (Maximum Drawdown)
function calculateMaxDrawdown(prices) {
    if (!prices || prices.length === 0) return 0;
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > peak) {
            peak = prices[i];
        }
        const drawdown = (peak - prices[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    return maxDrawdown;
}

// 计算风险价值 (Value at Risk)
function calculateVaR(returns, confidenceLevel = 0.95) {
    if (!returns || returns.length === 0) return 0;
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * (1 - confidenceLevel));
    return -sortedReturns[index];
}

// 计算条件风险价值 (Conditional VaR)
function calculateCVaR(returns, confidenceLevel = 0.95) {
    if (!returns || returns.length === 0) return 0;
    const varValue = calculateVaR(returns, confidenceLevel);
    const tailReturns = returns.filter(r => r <= -varValue);
    return tailReturns.length === 0 ? 0 : -math.mean(tailReturns);
}

// 计算动态止损价格
function calculateDynamicStopLoss(currentPrice, volatility, atr, riskTolerance) {
    if (!currentPrice || currentPrice <= 0) return 0;
    const baseStopLoss = currentPrice * (1 - riskTolerance);
    const volatilityAdjustment = currentPrice * (volatility || 0) * 2;
    const atrAdjustment = (atr || 0) * 2;
    
    return Math.max(
        baseStopLoss,
        currentPrice - volatilityAdjustment,
        currentPrice - atrAdjustment
    );
}

// 计算ATR (Average True Range)
function calculateATR(highPrices, lowPrices, closePrices, period = 14) {
    if (!highPrices || !lowPrices || !closePrices || 
        highPrices.length === 0 || lowPrices.length === 0 || closePrices.length === 0) {
        return 0;
    }
    const trueRanges = [];
    
    for (let i = 1; i < highPrices.length; i++) {
        const high = highPrices[i];
        const low = lowPrices[i];
        const prevClose = closePrices[i - 1];
        
        const tr1 = high - low;
        const tr2 = Math.abs(high - prevClose);
        const tr3 = Math.abs(low - prevClose);
        
        trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    return trueRanges.length === 0 ? 0 : math.mean(trueRanges.slice(-period));
}

// 计算投资组合权重
function calculatePortfolioWeights(stocks, riskFreeRate = 0.02) {
    if (!stocks || stocks.length === 0) return [];
    const returns = stocks.map(stock => stock.returns || []);
    const meanReturns = returns.map(r => r.length === 0 ? 0 : math.mean(r));
    
    // 手动计算协方差矩阵
    const n = stocks.length;
    const covMatrix = Array(n).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const meanI = meanReturns[i];
            const meanJ = meanReturns[j];
            let covariance = 0;
            
            for (let k = 0; k < returns[i].length; k++) {
                covariance += (returns[i][k] - meanI) * (returns[j][k] - meanJ);
            }
            covMatrix[i][j] = returns[i].length === 0 ? 0 : covariance / returns[i].length;
        }
    }
    
    // 使用简单的等权重分配
    return Array(n).fill(1/n);
}

// 计算风险调整后的仓位大小
function calculatePositionSize(accountBalance, riskPerTrade, stopLoss, currentPrice) {
    if (!accountBalance || !riskPerTrade || !stopLoss || !currentPrice) return 0;
    const riskAmount = accountBalance * riskPerTrade;
    const priceRisk = currentPrice - stopLoss;
    return priceRisk <= 0 ? 0 : Math.floor(riskAmount / priceRisk);
}

// 计算综合风险评分
function calculateRiskScore(stockData, marketData) {
    if (!stockData || !stockData.prices || stockData.prices.length === 0) {
        return {
            riskScore: 0,
            components: {
                volatility: 0,
                beta: 1,
                maxDrawdown: 0,
                var95: 0,
                sharpeRatio: 0
            }
        };
    }

    const volatility = calculateVolatility(stockData.prices);
    const beta = calculateBeta(stockData.returns || [], marketData?.returns || []);
    const maxDrawdown = calculateMaxDrawdown(stockData.prices);
    const var95 = calculateVaR(stockData.returns || []);
    const sharpeRatio = calculateSharpeRatio(stockData.returns || []);
    
    // 归一化各个指标
    const normalizedVolatility = Math.min(volatility / 0.5, 1);
    const normalizedBeta = Math.min(beta / 2, 1);
    const normalizedDrawdown = maxDrawdown;
    const normalizedVaR = Math.min(var95 / 0.1, 1);
    const normalizedSharpe = Math.max(0, Math.min(sharpeRatio / 2, 1));
    
    // 计算综合风险评分 (0-100)
    const riskScore = (
        normalizedVolatility * 0.3 +
        normalizedBeta * 0.2 +
        normalizedDrawdown * 0.2 +
        normalizedVaR * 0.2 +
        (1 - normalizedSharpe) * 0.1
    ) * 100;
    
    return {
        riskScore,
        components: {
            volatility,
            beta,
            maxDrawdown,
            var95,
            sharpeRatio
        }
    };
}

module.exports = {
    calculateVolatility,
    calculateBeta,
    calculateSharpeRatio,
    calculateMaxDrawdown,
    calculateVaR,
    calculateCVaR,
    calculateDynamicStopLoss,
    calculateATR,
    calculatePortfolioWeights,
    calculatePositionSize,
    calculateRiskScore
}; 