const registerRoutes = require('../routes/register');

describe("Register Route", function() {
    describe("Route Definition", function() {
        it("should have register route defined", function() {
            expect(registerRoutes).toBeDefined();
        });

        it("should export express router", function() {
            expect(registerRoutes.stack).toBeDefined();
        });

        it("should have POST /register route", function() {
            const routes = registerRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const registerRoute = routes.find(r => r.path === '/register' && r.method?.post);
            expect(registerRoute).toBeDefined();
        });
    });
});

