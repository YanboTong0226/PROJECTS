const sellRoutes = require('../routes/sellStock');

describe("Sell Stock Route", function() {
    describe("Route Definition", function() {
        it("should have sell stock route defined", function() {
            expect(sellRoutes).toBeDefined();
        });

        it("should export express router", function() {
            expect(sellRoutes.stack).toBeDefined();
        });

        it("should have POST /sell-stock route", function() {
            const routes = sellRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const sellRoute = routes.find(r => r.path === '/sell-stock' && r.method?.post);
            expect(sellRoute).toBeDefined();
        });
    });
});

