require("dotenv").config();
const express = require("express");
const router = express.Router();
// CHANGED: Import Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");

// CHANGED: Initialize Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

router.post('/ask', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        const prompt = `
You are a professional stock investment advisor. Please answer the following question in English, ensuring your answer is professional, accurate and in English.

Question: ${question}

Please consider the following aspects:
1. If the question is about a specific stock, provide a detailed analysis.
2. If the question is about investment strategy, provide concrete advice.
3. If the question is about market trends, provide an objective analysis.
4. If the question is about risk control, provide practical suggestions.

Make sure your answer is:
1. Professional and accurate
2. Easy to understand
3. Specific and actionable
4. Includes necessary risk warnings

Please answer ONLY in English, no matter what language the question is.
`;

        // CHANGED: Call Gemini API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text();
        
        res.json({ 
            answer,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Error generating AI answer:", error);
        res.status(500).json({ 
            error: "Failed to generate answer",
            details: error.message 
        });
    }
});

module.exports = router;