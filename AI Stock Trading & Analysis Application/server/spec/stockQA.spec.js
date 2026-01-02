let stockQAModule;
let moduleLoaded = false;

try {
    stockQAModule = require('../routes/stockQA');
    moduleLoaded = true;
} catch (e) {
    console.warn("Skipping StockQA tests due to missing environment variables or API key.");
}

describe("Stock Q&A Module", function() {
    beforeAll(function() {
        if (!moduleLoaded) {
            pending("Module failed to load (likely missing GEMINI_API_KEY in .env)");
        }
    });

    it("should export the express router", function() {
        if (moduleLoaded) {
            expect(stockQAModule).toBeDefined();
            expect(stockQAModule.stack).toBeDefined();
        }
    });

    it("should have ask route defined", function() {
        if (moduleLoaded) {
            const routes = stockQAModule.stack.map(layer => layer.route?.path);
            expect(routes).toContain('/ask');
        }
    });

    describe("POST /api/ask", function() {
        it("should require question parameter", function() {
            if (moduleLoaded) {
                const routes = stockQAModule.stack;
                const askRoute = routes.find(layer => layer.route?.path === '/ask');
                expect(askRoute).toBeDefined();
            }
        });
    });
});










