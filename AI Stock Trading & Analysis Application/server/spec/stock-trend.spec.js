const stockTrendRoutes = require('../routes/stock-trend');

describe("Stock Trend Route", function() {
    describe("Route Definition", function() {
        it("should have stock-trend route defined", function() {
            expect(stockTrendRoutes).toBeDefined();
        });

        it("should export express router", function() {
            expect(stockTrendRoutes.stack).toBeDefined();
        });

        it("should have GET /stock-trend route", function() {
            const routes = stockTrendRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const trendRoute = routes.find(r => r.path === '/stock-trend' && r.method?.get);
            expect(trendRoute).toBeDefined();
        });
    });
});

