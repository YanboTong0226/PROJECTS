const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../utils/db');
const router = express.Router();

// register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const connection = await pool.getConnection();
        const [existingUser] = await connection.query('SELECT email FROM users WHERE email = ?', [username]);
        if (existingUser.length > 0) {
            connection.release();
            return res.json({ success: false, message: 'The username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.query('INSERT INTO users (email, password) VALUES (?, ?)', [username, hashedPassword]);
        connection.release();
        res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).send('Error registering user.');
    }
});

module.exports = router;