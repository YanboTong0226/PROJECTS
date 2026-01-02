const userRoutes = require('../routes/userManagement');
const sharedState = require('../routes/sharedState');

describe("User Management Routes", function() {
    beforeEach(function() {
        sharedState.setUsername(null);
    });

    describe("Route Definitions", function() {
        it("should have user management routes defined", function() {
            expect(userRoutes).toBeDefined();
        });

        it("should export express router", function() {
            expect(userRoutes.stack).toBeDefined();
        });

        it("should have POST /login route", function() {
            const routes = userRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const loginRoute = routes.find(r => r.path === '/login' && r.method?.post);
            expect(loginRoute).toBeDefined();
        });

        it("should have POST /deposit route", function() {
            const routes = userRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const depositRoute = routes.find(r => r.path === '/deposit' && r.method?.post);
            expect(depositRoute).toBeDefined();
        });

        it("should have PUT /change-password route", function() {
            const routes = userRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const changePasswordRoute = routes.find(r => r.path === '/change-password' && r.method?.put);
            expect(changePasswordRoute).toBeDefined();
        });

        it("should have GET /user-balance route", function() {
            const routes = userRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const balanceRoute = routes.find(r => r.path === '/user-balance' && r.method?.get);
            expect(balanceRoute).toBeDefined();
        });

        it("should have GET /check-login route", function() {
            const routes = userRoutes.stack.map(layer => ({
                path: layer.route?.path,
                method: layer.route?.methods
            }));
            const checkLoginRoute = routes.find(r => r.path === '/check-login' && r.method?.get);
            expect(checkLoginRoute).toBeDefined();
        });
    });
});

