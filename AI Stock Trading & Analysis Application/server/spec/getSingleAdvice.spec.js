const singleAdviceRoutes = require('../routes/getSingleAdvice');

describe("Get Single Advice Route", function() {
    describe("Route Definition", function() {
        it("should have getSingleAdvice route defined", function() {
            expect(singleAdviceRoutes).toBeDefined();
        });

        it("should export express router", function() {
            expect(singleAdviceRoutes.stack).toBeDefined();
        });

        it("should have GET /getSingleAdvice route", function() {
            const routes = singleAdviceRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const adviceRoute = routes.find(r => r.path === '/getSingleAdvice' && r.method?.get);
            expect(adviceRoute).toBeDefined();
        });
    });
});

