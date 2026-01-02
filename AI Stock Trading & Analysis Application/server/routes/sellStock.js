const express = require('express');
const { pool } = require('../utils/db');
const router = express.Router();
const { fetchRealTimeStockPrice } = require('../BuyStocks');

router.post('/sell-stock', async (req, res) => {
    const { timestamp, sellQuantity } = req.body;
    if (!timestamp || !sellQuantity || sellQuantity <= 0) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM stock_transactions WHERE timestamp = ?', [timestamp]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = rows[0];
        const { email, stock_name, number } = transaction;

        if (sellQuantity > number) {
            return res.status(400).json({ error: 'Sell quantity exceeds available stock', availableQuantity: number });
        }

        const realTimePrice = await fetchRealTimeStockPrice(stock_name);
        const sellAmount = sellQuantity * realTimePrice;

        await connection.query('UPDATE users SET balance = balance + ? WHERE email = ?', [sellAmount, email]);

        const remainingQuantity = number - sellQuantity;
        const updateQuery = remainingQuantity > 0
            ? 'UPDATE stock_transactions SET number = ? WHERE timestamp = ?'
            : 'UPDATE stock_transactions SET number = ?, is_sold = TRUE WHERE timestamp = ?';

        await connection.query(updateQuery, [remainingQuantity, timestamp]);

        return res.status(200).json({
            message: 'Stock sold successfully',
            sellAmount,
            realTimePrice,
            remainingQuantity,
            isSold: remainingQuantity === 0
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});








module.exports = router;
