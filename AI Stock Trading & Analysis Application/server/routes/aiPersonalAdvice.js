require("dotenv").config();
const express = require("express");
const router = express.Router();
// CHANGED: Import Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { pool } = require('../utils/db');

// CHANGED: Initialize Gemini AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

router.get('/ai-personal-advice', (req, res) => {
    res.status(405).json({ error: 'Method Not Allowed' });
});

router.post('/ai-personal-advice', async (req, res) => {
    console.log('[aiPersonalAdvice.js] POST /api/ai-personal-advice called, body:', req.body);
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const [transactions] = await pool.query('SELECT * FROM stock_transactions WHERE email = ?', [email]);
        const [user] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!user[0]) {
            return res.status(404).json({ error: "User not found" });
        }

        const prompt = `
You are a professional stock investment advisor. Here are the user's historical stock transactions and current account balance. Please analyze the user's investment style and provide personalized investment advice (e.g., which stocks to buy/sell, suggested portfolio allocation, risk warnings, etc.). Please answer in English.

User's transaction history:
${JSON.stringify(transactions, null, 2)}

User's current balance: ${user[0].balance}
`;

        // CHANGED: Call Gemini API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const adviceText = response.text();

        res.json({ advice: adviceText });

    } catch (error) {
        console.error("[aiPersonalAdvice.js] Error generating AI personal advice:", error);
        res.status(500).json({ error: "Failed to generate advice", details: error.message });
    }
});

module.exports = router;