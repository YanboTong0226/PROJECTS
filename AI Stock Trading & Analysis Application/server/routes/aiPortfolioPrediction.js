const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-lite", // 切换回 gemini-pro，因为它更擅长遵循复杂的 JSON 格式
    generationConfig: { response_mime_type: "application/json" }
});

// --- 核心 AI 函数（已修改） ---
async function getAIPortfolioPrediction(features) {
    console.log('--- Calling Gemini API for AI portfolio prediction ---');
    
    // --- 修改了 Prompt ---
    // 现在我们请求一个包含 "weights" 和 "analysis" 的 JSON 对象
    const prompt = `You are a professional portfolio manager. Analyze the given stock features and suggest optimal portfolio weights.
Given the following stock features:
${features.map((f, i) => `Stock ${i + 1}:
- Returns: ${f.returns}
- Risk: ${f.risk}
- Sharpe Ratio: ${f.sharpeRatio}`).join('\n')}

Please analyze these stocks and suggest optimal portfolio weights that maximize the Sharpe Ratio while maintaining diversification.
Return a single, valid JSON object with two keys:
1.  "weights": An array of numbers that sum to 1.
2.  "analysis": A brief string (2-3 sentences) explaining *why* you chose these weights, based on risk, returns, and diversification.

Example:
{
  "weights": [0.4, 0.3, 0.3],
  "analysis": "I prioritized Stock 1 due to its high Sharpe Ratio, while balancing with Stocks 2 and 3 to reduce overall portfolio volatility."
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponseText = response.text();
        
        // --- 修改了返回逻辑 ---
        const aiObject = JSON.parse(aiResponseText); // 现在的 aiObject 是 { weights: [...], analysis: "..." }

        // 验证权重
        const weights = aiObject.weights;
        const sum = weights.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1) > 0.01) {
            // 归一化权重
            aiObject.weights = weights.map(w => w / sum);
        }
        
        // 返回完整的对象 (包含 "weights" 和 "analysis")
        return aiObject;

    } catch (error) {
        console.error('!!! Critical Error in getAIPortfolioPrediction:', error);
        throw new Error('AI prediction failed: ' + error.message);
    }
}
// --- 核心函数结束 ---


// 路由（现在返回完整的 AI 对象）
router.post('/ai-predict', async (req, res) => {
    try {
        const { features } = req.body;
        const aiResult = await getAIPortfolioPrediction(features);
        res.json(aiResult); // 返回完整的 { weights: [...], analysis: "..." }
        
    } catch (error) {
        console.error('Error in /ai-predict route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error in AI prediction',
            error: error.message 
        });
    }
});

// --- 导出路由和核心函数 ---
module.exports = { router, getAIPortfolioPrediction };