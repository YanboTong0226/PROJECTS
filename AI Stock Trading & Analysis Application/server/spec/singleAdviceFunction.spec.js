const {
    calculateMovingAverage,
    generateStrategy,
    calculateRecentAverage,
    getSuggestedFrequency,
    calculateBuyQuantity,
    calculateStopLoss
} = require('../utils/singleAdviceFunction');

describe("Single Advice Functions", function() {
    describe("calculateMovingAverage", function() {
        it("should return empty array when data length is less than period", function() {
            const data = [{ date: '2024-01-01', price: 100 }];
            const result = calculateMovingAverage(data, 5);
            expect(result).toEqual([]);
        });

        it("should calculate moving average correctly", function() {
            const data = [
                { date: '2024-01-01', price: 100 },
                { date: '2024-01-02', price: 110 },
                { date: '2024-01-03', price: 120 },
                { date: '2024-01-04', price: 130 },
                { date: '2024-01-05', price: 140 }
            ];
            const result = calculateMovingAverage(data, 3);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(3); // 5 prices - 3 period + 1 = 3 results
            if (result.length > 0) {
                expect(result[0].date).toBeDefined();
                expect(result[0].avg).toBeDefined();
                expect(typeof result[0].avg).toBe('number');
                expect(result[0].avg).toBeGreaterThan(0);
            }
        });
    });

    describe("calculateRecentAverage", function() {
        it("should return null when data length is less than days", function() {
            const data = [{ date: '2024-01-01', price: 100 }];
            const result = calculateRecentAverage(data, 5);
            expect(result).toBeNull();
        });

        it("should calculate recent average correctly", function() {
            const data = [
                { date: '2024-01-01', price: 100 },
                { date: '2024-01-02', price: 110 },
                { date: '2024-01-03', price: 120 }
            ];
            const result = calculateRecentAverage(data, 3);
            expect(result).toBe(110);
        });
    });

    describe("getSuggestedFrequency", function() {
        it("should return 'Quarterly' for period 1", function() {
            expect(getSuggestedFrequency(1)).toBe('Quarterly');
        });

        it("should return 'Semi-annually' for period 2", function() {
            expect(getSuggestedFrequency(2)).toBe('Semi-annually');
        });

        it("should return 'Annually' for period 5", function() {
            expect(getSuggestedFrequency(5)).toBe('Annually');
        });
    });

    describe("calculateStopLoss", function() {
        it("should calculate stop loss price correctly", function() {
            const stockPrice = 100;
            const stopLossPercentage = 5;
            const result = calculateStopLoss(stockPrice, stopLossPercentage);
            expect(result).toBe(95);
        });

        it("should handle zero stock price", function() {
            const result = calculateStopLoss(0, 5);
            expect(result).toBe(0);
        });
    });

    describe("calculateBuyQuantity", function() {
        it("should calculate buy quantity correctly", function() {
            const accountBalance = 10000;
            const stockPrice = 100;
            const stopLossPercentage = 5;
            const riskPercentage = 2;
            const result = calculateBuyQuantity(accountBalance, stockPrice, stopLossPercentage, riskPercentage);
            expect(typeof result).toBe('number');
            expect(isFinite(result)).toBe(true);
            expect(result).toBeGreaterThanOrEqual(0);
        });
    });

    describe("generateStrategy", function() {
        it("should return strategy object", function() {
            const stockData = [
                { date: '2024-01-01', price: 100 },
                { date: '2024-01-02', price: 110 }
            ];
            const movingAverage = [{ date: '2024-01-02', avg: 105 }];
            const result = generateStrategy(stockData, movingAverage, 10000, 5, 2);
            expect(result.strategy).toBeDefined();
            expect(result.buyQuantity).toBeDefined();
        });

        it("should return 'Not enough data' when data is insufficient", function() {
            const stockData = [];
            const movingAverage = [];
            const result = generateStrategy(stockData, movingAverage, 10000, 5, 2);
            expect(result.strategy).toContain('Not enough data');
        });
    });
});

