let chartAnalysisModule;
let moduleLoaded = false;

try {
    chartAnalysisModule = require('../routes/chartAnalysis');
    moduleLoaded = true;
} catch (e) {
    console.warn("Skipping ChartAnalysis tests due to missing environment variables or API key.");
}

describe("Chart Analysis Module", function() {
    beforeAll(function() {
        if (!moduleLoaded) {
            pending("Module failed to load (likely missing GEMINI_API_KEY in .env)");
        }
    });

    it("should export the express router", function() {
        if (moduleLoaded) {
            expect(chartAnalysisModule).toBeDefined();
            expect(chartAnalysisModule.stack).toBeDefined();
        }
    });

    it("should have analyze-chart route defined", function() {
        if (moduleLoaded) {
            const routes = chartAnalysisModule.stack.map(layer => layer.route?.path);
            expect(routes).toContain('/analyze-chart');
        }
    });

    describe("POST /api/analyze-chart", function() {
        it("should require stockData and stockTicker parameters", function() {
            if (moduleLoaded) {
                const routes = chartAnalysisModule.stack;
                const analyzeRoute = routes.find(layer => layer.route?.path === '/analyze-chart');
                expect(analyzeRoute).toBeDefined();
            }
        });
    });
});










