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

describe("Risk Management Functions", function() {
    describe("calculateVolatility", function() {
        it("should calculate volatility", function() {
            const prices = [100, 110, 105, 115, 120];
            const volatility = calculateVolatility(prices);
            expect(typeof volatility).toBe('number');
            expect(volatility).toBeGreaterThanOrEqual(0);
        });

        it("should return 0 for empty prices", function() {
            const volatility = calculateVolatility([]);
            expect(volatility).toBe(0);
        });

        it("should return 0 for single price", function() {
            const volatility = calculateVolatility([100]);
            expect(volatility).toBe(0);
        });
    });

    describe("calculateBeta", function() {
        it("should calculate beta coefficient", function() {
            const stockReturns = [0.1, 0.2, 0.15];
            const marketReturns = [0.12, 0.18, 0.14];
            const beta = calculateBeta(stockReturns, marketReturns);
            expect(typeof beta).toBe('number');
        });

        it("should return 1 for empty arrays", function() {
            const beta = calculateBeta([], []);
            expect(beta).toBe(1);
        });
    });

    describe("calculateSharpeRatio", function() {
        it("should calculate Sharpe ratio", function() {
            const returns = [0.1, 0.2, 0.15, 0.05];
            const sharpeRatio = calculateSharpeRatio(returns);
            expect(typeof sharpeRatio).toBe('number');
        });

        it("should return 0 for empty returns", function() {
            const sharpeRatio = calculateSharpeRatio([]);
            expect(sharpeRatio).toBe(0);
        });
    });

    describe("calculateMaxDrawdown", function() {
        it("should calculate maximum drawdown", function() {
            const prices = [100, 120, 110, 130, 100];
            const maxDrawdown = calculateMaxDrawdown(prices);
            expect(typeof maxDrawdown).toBe('number');
            expect(maxDrawdown).toBeGreaterThanOrEqual(0);
            expect(maxDrawdown).toBeLessThanOrEqual(1);
        });

        it("should return 0 for empty prices", function() {
            const maxDrawdown = calculateMaxDrawdown([]);
            expect(maxDrawdown).toBe(0);
        });
    });

    describe("calculateVaR", function() {
        it("should calculate Value at Risk", function() {
            const returns = [0.1, -0.2, 0.15, -0.05, 0.08];
            const var95 = calculateVaR(returns, 0.95);
            expect(typeof var95).toBe('number');
            expect(var95).toBeGreaterThanOrEqual(0);
        });

        it("should return 0 for empty returns", function() {
            const var95 = calculateVaR([], 0.95);
            expect(var95).toBe(0);
        });
    });

    describe("calculateCVaR", function() {
        it("should calculate Conditional VaR", function() {
            const returns = [0.1, -0.2, 0.15, -0.05, 0.08];
            const cvar95 = calculateCVaR(returns, 0.95);
            expect(typeof cvar95).toBe('number');
            expect(cvar95).toBeGreaterThanOrEqual(0);
        });

        it("should return 0 for empty returns", function() {
            const cvar95 = calculateCVaR([], 0.95);
            expect(cvar95).toBe(0);
        });
    });

    describe("calculateDynamicStopLoss", function() {
        it("should calculate dynamic stop loss price", function() {
            const currentPrice = 100;
            const volatility = 0.15;
            const atr = 2.5;
            const riskTolerance = 0.05;
            const stopLoss = calculateDynamicStopLoss(currentPrice, volatility, atr, riskTolerance);
            expect(typeof stopLoss).toBe('number');
            expect(stopLoss).toBeLessThan(currentPrice);
        });

        it("should return 0 for invalid current price", function() {
            const stopLoss = calculateDynamicStopLoss(0, 0.15, 2.5, 0.05);
            expect(stopLoss).toBe(0);
        });
    });

    describe("calculateATR", function() {
        it("should calculate Average True Range", function() {
            const highPrices = [105, 115, 110, 120];
            const lowPrices = [95, 105, 100, 110];
            const closePrices = [100, 110, 105, 115];
            const atr = calculateATR(highPrices, lowPrices, closePrices);
            expect(typeof atr).toBe('number');
            expect(atr).toBeGreaterThanOrEqual(0);
        });

        it("should return 0 for empty arrays", function() {
            const atr = calculateATR([], [], []);
            expect(atr).toBe(0);
        });
    });

    describe("calculatePositionSize", function() {
        it("should calculate position size", function() {
            const accountBalance = 10000;
            const riskPerTrade = 0.02;
            const stopLoss = 95;
            const currentPrice = 100;
            const positionSize = calculatePositionSize(accountBalance, riskPerTrade, stopLoss, currentPrice);
            expect(typeof positionSize).toBe('number');
            expect(positionSize).toBeGreaterThanOrEqual(0);
        });

        it("should return 0 when priceRisk is zero or negative", function() {
            const positionSize = calculatePositionSize(10000, 0.02, 100, 100);
            expect(positionSize).toBe(0);
        });
    });

    describe("calculateRiskScore", function() {
        it("should calculate risk score", function() {
            const stockData = {
                prices: [100, 110, 105, 115, 120],
                returns: [0.1, -0.045, 0.095, 0.043]
            };
            const marketData = {
                prices: [150, 160, 155, 165, 170],
                returns: [0.067, -0.031, 0.065, 0.030]
            };
            const riskScore = calculateRiskScore(stockData, marketData);
            expect(riskScore.riskScore).toBeDefined();
            expect(riskScore.components).toBeDefined();
            expect(typeof riskScore.riskScore).toBe('number');
        });

        it("should return default values for empty stock data", function() {
            const riskScore = calculateRiskScore({}, {});
            expect(riskScore.riskScore).toBe(0);
            expect(riskScore.components).toBeDefined();
        });
    });
});

