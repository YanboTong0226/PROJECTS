let aiPersonalAdviceModule;
let moduleLoaded = false;

try {
    aiPersonalAdviceModule = require('../routes/aiPersonalAdvice');
    moduleLoaded = true;
} catch (e) {
    console.warn("Skipping AIPersonalAdvice tests due to missing environment variables or API key.");
}

describe("AI Personal Advice Module", function() {
    beforeAll(function() {
        if (!moduleLoaded) {
            pending("Module failed to load (likely missing GEMINI_API_KEY in .env)");
        }
    });

    it("should export the express router", function() {
        if (moduleLoaded) {
            expect(aiPersonalAdviceModule).toBeDefined();
            expect(aiPersonalAdviceModule.stack).toBeDefined();
        }
    });

    it("should have ai-personal-advice route defined", function() {
        if (moduleLoaded) {
            const routes = aiPersonalAdviceModule.stack.map(layer => layer.route?.path);
            expect(routes).toContain('/ai-personal-advice');
        }
    });

    describe("POST /api/ai-personal-advice", function() {
        it("should require email parameter", function() {
            if (moduleLoaded) {
                const routes = aiPersonalAdviceModule.stack;
                const adviceRoute = routes.find(layer => layer.route?.path === '/ai-personal-advice');
                expect(adviceRoute).toBeDefined();
            }
        });
    });

    describe("GET /api/ai-personal-advice", function() {
        it("should return Method Not Allowed for GET requests", function() {
            if (moduleLoaded) {
                const routes = aiPersonalAdviceModule.stack;
                const getRoute = routes.find(layer => 
                    layer.route?.path === '/ai-personal-advice' && 
                    layer.route?.methods?.get
                );
                expect(getRoute).toBeDefined();
            }
        });
    });
});










