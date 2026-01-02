const readCSVRoutes = require('../routes/readCSV');

describe("Read CSV Route", function() {
    describe("Route Definition", function() {
        it("should have readCSV routes defined", function() {
            expect(readCSVRoutes).toBeDefined();
        });

        it("should export express router", function() {
            expect(readCSVRoutes.stack).toBeDefined();
        });

        it("should have GET /stocks route", function() {
            const routes = readCSVRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const stocksRoute = routes.find(r => r.path === '/stocks' && r.method?.get);
            expect(stocksRoute).toBeDefined();
        });
    });
});

