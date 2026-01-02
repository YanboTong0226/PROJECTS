const multipleAdviceRoutes = require('../routes/getMultipleAdvice');

describe("Get Multiple Advice Routes", function() {
    describe("Route Definitions", function() {
        it("should have multiple advice routes defined", function() {
            expect(multipleAdviceRoutes).toBeDefined();
        });

        it("should export express router", function() {
            expect(multipleAdviceRoutes.stack).toBeDefined();
        });

        it("should have GET /portfolio-recommendation route", function() {
            const routes = multipleAdviceRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const portfolioRoute = routes.find(r => r.path === '/portfolio-recommendation' && r.method?.get);
            expect(portfolioRoute).toBeDefined();
        });

        it("should have GET /multiplestock-analysis route", function() {
            const routes = multipleAdviceRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const analysisRoute = routes.find(r => r.path === '/multiplestock-analysis' && r.method?.get);
            expect(analysisRoute).toBeDefined();
        });
    });
});

