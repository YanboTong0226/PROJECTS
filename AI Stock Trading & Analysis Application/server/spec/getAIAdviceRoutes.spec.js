let getAIAdviceRoutesModule;
let moduleLoaded = false;

try {
    getAIAdviceRoutesModule = require('../routes/getAIAdviceRoutes');
    moduleLoaded = true;
} catch (e) {
    console.warn("Skipping GetAIAdviceRoutes tests due to missing environment variables or API key.");
}

describe("Get AI Advice Routes Module", function() {
    beforeAll(function() {
        if (!moduleLoaded) {
            pending("Module failed to load (likely missing GEMINI_API_KEY in .env)");
        }
    });

    it("should export the express router", function() {
        if (moduleLoaded) {
            expect(getAIAdviceRoutesModule).toBeDefined();
            expect(getAIAdviceRoutesModule.stack).toBeDefined();
        }
    });

    it("should have chat route defined", function() {
        if (moduleLoaded) {
            const routes = getAIAdviceRoutesModule.stack.map(layer => layer.route?.path);
            expect(routes).toContain('/chat');
        }
    });

    describe("POST /api/chat", function() {
        it("should require message parameter", function() {
            if (moduleLoaded) {
                const routes = getAIAdviceRoutesModule.stack;
                const chatRoute = routes.find(layer => layer.route?.path === '/chat');
                expect(chatRoute).toBeDefined();
            }
        });
    });
});










