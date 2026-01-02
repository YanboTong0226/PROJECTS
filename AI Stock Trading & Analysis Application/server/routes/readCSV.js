const fs = require('fs');
const csv = require('csv-parser');
const express = require('express');
const router = express.Router();
router.get('/stocks', (req, res) => {
    const stockCodes = [];

    // Assume the CSV file name is 'stocks.csv'.
    fs.createReadStream(__dirname + '/output.csv')
        .pipe(csv())
        .on('headers', (headers) => {
            console.log('Headers:', headers);
            stockCodes.push(...headers.slice(1));
        })
        .on('data', (row) => {
            // console.log('Row:', row);
        })
        .on('end', () => {
            console.log('CSV File Read Complete');
            res.json({ success: true, stocks: stockCodes });
        })
        .on('error', (err) => {
            console.log('Error:', err);
            res.json({ success: false, message: 'error in reading csv file' });
        });
});
module.exports = router;