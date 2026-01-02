const express = require('express');
const router = express.Router();
// CHANGED: Import Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// CHANGED: Initialize Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

router.post('/analyze-chart', async (req, res) => {
    try {
        const { basicAdvice, riskComponents, riskMetrics, stockData, stockTicker } = req.body;

        if (!stockData || !stockTicker) {
            return res.status(400).json({ success: false, error: 'Missing required data' });
        }

        const prompt = `You are a professional stock market analyst. Provide detailed, actionable analysis with specific numbers and clear recommendations.
Analyze the following stock data and provide a detailed analysis:

Stock: ${stockTicker}
Current Price: ${stockData[stockData.length - 1].close}
Time Period: ${stockData.length} days
Historical Price Data: ${JSON.stringify(stockData.slice(-30))} // Send only recent data to save tokens
Basic Advice: ${basicAdvice}
Risk Metrics: ${JSON.stringify(riskMetrics)}
Risk Components: ${JSON.stringify(riskComponents)}

Please provide a comprehensive analysis including:
1. Overall Market Analysis (Historical market position, Price trends)
2. Risk Assessment (Volatility analysis, Maximum drawdown, Risk score)
3. Technical Analysis (Moving averages, Support and resistance levels)
4. Investment Strategy (Entry points, Exit points, Stop loss levels, Trading frequency)

Please provide specific numbers and actionable insights.`;

        // CHANGED: Call Gemini API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysisText = response.text();
        
        const resultPayload = {
            success: true,
            analysis: analysisText
        };

        return res.json(resultPayload);
    } catch (error) {
        console.error('Error in chart analysis:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;