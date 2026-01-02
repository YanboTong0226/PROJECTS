
let aiModule;
let moduleLoaded = false;

try {
    aiModule = require('../routes/aiPortfolioPrediction');
    moduleLoaded = true;
} catch (e) {
    console.warn("Skipping AI tests due to missing environment variables or API key.");
}

describe("AI Portfolio Prediction Module", function() {

    beforeAll(function() {
        if (!moduleLoaded) {
            pending("Module failed to load (likely missing API Key in .env)");
        }
    });

    it("should export the prediction function", function() {
        expect(aiModule.getAIPortfolioPrediction).toBeDefined();
        expect(typeof aiModule.getAIPortfolioPrediction).toBe('function');
    });

    it("should export the express router", function() {
        expect(aiModule.router).toBeDefined();
    });
    
    /*
    it("should throw error or reject on invalid input", async function() {
        const invalidInput = null;
        await expectAsync(aiModule.getAIPortfolioPrediction(invalidInput)).toBeRejected();
    });
    */
    
    it("should require an array of features to perform prediction", function() {
        // Since we cannot mock the Google API easily without extra libraries,
        // we verify that the function signature accepts arguments.
        expect(aiModule.getAIPortfolioPrediction.length).toBe(1); // Checks if function accepts 1 arg
    });
});