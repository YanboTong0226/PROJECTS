const {
    fillMissingDates,
    calculateReturns,
    calculateStandardDeviation,
    calculateCorrelation,
    meanVarianceOptimization,
    calculateSharpeRatio
} = require('../utils/multipleAdviceFunction');

describe("Multiple Advice Functions", function() {
    describe("fillMissingDates", function() {
        it("should fill missing dates with previous price", function() {
            const stockData = [
                { date: 20200101, price: 100 },
                { date: 20200103, price: 110 }
            ];
            const allDates = new Set([20200101, 20200102, 20200103]);
            fillMissingDates(stockData, allDates);
            expect(stockData.length).toBe(3);
            // The function modifies the array in place, check that missing date is filled
            expect(stockData[1].date).toBe(20200102);
            expect(stockData[1].price).toBe(100); // Should use previous price
        });

        it("should handle empty stockData", function() {
            const stockData = [];
            const allDates = new Set([20200101, 20200102]);
            fillMissingDates(stockData, allDates);
            expect(stockData.length).toBe(2);
        });
    });

    describe("calculateReturns", function() {
        it("should calculate returns correctly", function() {
            const prices = [100, 110, 120];
            const returns = calculateReturns(prices);
            expect(returns.length).toBe(2);
            expect(returns[0]).toBeCloseTo(0.1, 2); // (110-100)/100
            expect(returns[1]).toBeCloseTo(0.0909, 2); // (120-110)/110
        });

        it("should handle zero prices", function() {
            const prices = [100, 0, 110];
            const returns = calculateReturns(prices);
            // When yesterdayPrice is 0, the function returns 0
            expect(returns.length).toBe(2);
            expect(returns[1]).toBe(0);
        });

        it("should return empty array for single price", function() {
            const prices = [100];
            const returns = calculateReturns(prices);
            expect(returns.length).toBe(0);
        });
    });

    describe("calculateStandardDeviation", function() {
        it("should calculate standard deviation", function() {
            const returns = [0.1, 0.2, 0.15, 0.05];
            const stdDev = calculateStandardDeviation(returns);
            expect(typeof stdDev).toBe('number');
            expect(stdDev).toBeGreaterThanOrEqual(0);
        });

        it("should handle invalid values", function() {
            const returns = [0.1, Infinity, 0.15];
            const stdDev = calculateStandardDeviation(returns);
            expect(isNaN(stdDev)).toBe(true);
        });
    });

    describe("calculateCorrelation", function() {
        it("should calculate correlation between two return arrays", function() {
            const returns1 = [0.1, 0.2, 0.15];
            const returns2 = [0.15, 0.25, 0.2];
            const correlation = calculateCorrelation(returns1, returns2);
            expect(typeof correlation).toBe('number');
            expect(correlation).toBeGreaterThanOrEqual(-1);
            // Allow small floating point precision errors
            expect(correlation).toBeLessThanOrEqual(1.0001);
        });

        it("should handle arrays of different lengths", function() {
            const returns1 = [0.1, 0.2, 0.15, 0.05];
            const returns2 = [0.15, 0.25];
            const correlation = calculateCorrelation(returns1, returns2);
            expect(typeof correlation).toBe('number');
        });
    });

    describe("calculateSharpeRatio", function() {
        it("should calculate Sharpe ratio", function() {
            const returns = [0.1, 0.2, 0.15, 0.05];
            const sharpeRatio = calculateSharpeRatio(returns);
            expect(typeof sharpeRatio).toBe('number');
        });

        it("should return 0 for empty returns", function() {
            const returns = [];
            const sharpeRatio = calculateSharpeRatio(returns);
            expect(sharpeRatio).toBe(0);
        });
    });

    describe("meanVarianceOptimization", function() {
        it("should return weights array", function() {
            const stocksData = [
                { ticker: 'AAPL', prices: [100, 110, 120] },
                { ticker: 'MSFT', prices: [200, 210, 220] }
            ];
            const marketData = { prices: [150, 160, 170] };
            const weights = meanVarianceOptimization(stocksData, marketData);
            expect(Array.isArray(weights)).toBe(true);
            expect(weights.length).toBe(2);
        });

        it("should return weights that sum to approximately 1", function() {
            const stocksData = [
                { ticker: 'AAPL', prices: [100, 110, 120, 130, 140] },
                { ticker: 'MSFT', prices: [200, 210, 220, 230, 240] }
            ];
            const marketData = { prices: [150, 160, 170, 180, 190] };
            const weights = meanVarianceOptimization(stocksData, marketData);
            const sum = weights.reduce((a, b) => a + b, 0);
            // Allow for floating point precision errors
            expect(sum).toBeGreaterThan(0.99);
            expect(sum).toBeLessThan(1.01);
        });
    });
});

