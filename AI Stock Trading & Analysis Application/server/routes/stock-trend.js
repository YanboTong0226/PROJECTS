const express = require('express');
const router = express.Router();
const csv = require('csv-parser');
const fs = require('fs');

router.get('/stock-trend', (req, res) => {
    const stockTicker = req.query.stock;

    if (!stockTicker) {
        return res.json({ success: false, message: 'Stock ticker is required.' });
    }


    // Set January 1, 2019, as the starting point for filtering, and format it as YYYYMMDD.
    const startDate = 20200101;

    const stockData = [];
    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('data', (row) => {
            if (row['DATE/TICKER'] && row[stockTicker]) {
                const price = parseFloat(row[stockTicker]);
                if (!isNaN(price)) {

                    const rowDate = parseInt(row['DATE/TICKER'], 10);

                    if (rowDate >= startDate) {
                        stockData.push({ date: row['DATE/TICKER'], price });
                    }
                }
            }
        })
        .on('end', () => {
            if (stockData.length === 0) {
                return res.json({ success: false, message: 'No data available for this stock after 2019.' });
            }

            res.json({ success: true, data: stockData });
        })
        .on('error', (err) => {
            console.error(err);
            res.json({ success: false, message: 'Error reading stock data.' });
        });
});
module.exports = router;