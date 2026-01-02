require("dotenv").config();
const express = require("express");
const router = express.Router();
// CHANGED: Import Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) { // CHANGED: Check for Gemini key
    console.error("❌ ERROR: Missing GEMINI_API_KEY in .env file!");
    process.exit(1);
}

// CHANGED: Initialize Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

router.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            return res.status(400).json({ error: "Message is required" });
        }

        // CHANGED: Call Gemini API
        const result = await model.generateContent(userMessage);
        const response = await result.response;
        const aiResponse = response.text();

        res.json({ response: aiResponse });
    } catch (error) {
        console.error("❌ Error calling AI API:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
