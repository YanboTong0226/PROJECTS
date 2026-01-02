const {pool} = require("../utils/db");
const {fetchRealTimeStockPrice} = require("../BuyStocks");
const moment = require("moment");
const express = require("express");
const router = express.Router();
const sharedState = require('./sharedState');

router.post('/buy-stock', async (req, res) => {
    const { symbol, quantity } = req.body;
    const username1 = sharedState.getUsername();
    try {
        const connection = await pool.getConnection();
        const [userRows] = await connection.query('SELECT balance FROM users WHERE email = ?', [username1]);
        const userBalance = userRows[0].balance;

        const price = await fetchRealTimeStockPrice(symbol);
        const totalCost = price * quantity;
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

        if (userBalance < totalCost) {
            return res.status(400).json({ error: 'Insufficient balance', userBalance, totalCost });
        }

        await connection.query('INSERT INTO stock_transactions (timestamp, email, stock_name, number, current_price, is_sold) VALUES (?, ?, ?, ?, ?, ?)', [
            timestamp,
            username1,
            symbol,
            quantity,
            price,
            '0',
        ]);
        await connection.query('UPDATE users SET balance = balance - ? WHERE email = ?', [totalCost, username1]);
        connection.release();

        res.json({ message: 'Stock purchase successful', data: { username1, symbol, quantity, price, totalCost } });
    } catch (error) {
        console.error('Error processing stock purchase:', error.message);
        res.status(500).json({ error: `Failed to fetch stock price for ${symbol}` });
    }
});

// View the stocks the user is currently buying (where `is_sold = FALSE`).
router.get('/active-stocks', async (req, res) => {
    const username1 = sharedState.getUsername();
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM stock_transactions WHERE email = ? AND is_sold = FALSE',
            [username1]
        );
        connection.release();

        const dataWithLocalTime = rows.map(row => {
            // `moment(row.timestamp)` will automatically handle the timezone and convert it to local time by default.
            const localTime = moment(row.timestamp).local().format('YYYY-MM-DD HH:mm:ss');
            return {
                ...row,
                timestamp: localTime,
            };
        });

        res.json({
            message: 'Active stocks retrieved successfully',
            data: dataWithLocalTime,
        });
    } catch (error) {
        console.error('Error fetching active stocks:', error.message);
        res.status(500).json({ error: 'Failed to retrieve active stocks' });
    }
});

module.exports = router;