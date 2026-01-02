const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');
const { fetchRealTimeStockPrice, fetchHistoricalData } = require('../BuyStocks');
const sharedState = require('./sharedState');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// --- 新增导入：用于 AI 分析 ---
const { 
    calculateReturns, 
    calculateStandardDeviation, 
    calculateSharpeRatio 
} = require('../utils/multipleAdviceFunction');
// 假设 aiPortfolioPrediction.js 和 virtualPortfolio.js 都在 routes 目录下
const { getAIPortfolioPrediction } = require('./aiPortfolioPrediction'); 

// 从 CSV 文件获取股票价格（用于非标准股票代码）
function getStockPriceFromCSV(symbol) {
    return new Promise((resolve, reject) => {
        const csvPath = path.join(__dirname, 'output.csv');
        let latestPrice = null;
        let latestDate = null;
        
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                const date = row['DATE/TICKER'];
                const price = parseFloat(row[symbol]);
                
                if (!isNaN(price) && price > 0) {
                    if (!latestDate || date > latestDate) {
                        latestDate = date;
                        latestPrice = price;
                    }
                }
            })
            .on('end', () => {
                if (latestPrice !== null) {
                    resolve(latestPrice);
                } else {
                    reject(new Error(`No price data found for ${symbol} in CSV`));
                }
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

// 从 CSV 文件获取历史价格数据
function getHistoricalDataFromCSV(symbol, days = 365) {
    return new Promise((resolve, reject) => {
        const csvPath = path.join(__dirname, 'output.csv');
        const historicalData = [];
        
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                const date = row['DATE/TICKER'];
                const price = parseFloat(row[symbol]);
                
                if (!isNaN(price) && price > 0 && date) {
                    historicalData.push({
                        date: date,
                        price: price
                    });
                }
            })
            .on('end', () => {
                // 按日期排序（从旧到新）
                historicalData.sort((a, b) => a.date.localeCompare(b.date));
                
                // 只返回最近 N 天的数据
                const recentData = historicalData.slice(-days);
                resolve(recentData);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

// 智能获取股票价格（先尝试 API，失败再尝试 CSV）
// 优先使用 API 以支持标准美股
async function getSmartStockPrice(symbol) {
    try {
        // 首先尝试使用 API（Finnhub）获取标准美股价格
        const apiPrice = await fetchRealTimeStockPrice(symbol);
        console.log(`Got price for ${symbol} from API: ${apiPrice}`);
        return apiPrice;
    } catch (apiError) {
        console.log(`API lookup failed for ${symbol}, trying CSV...`);
        try {
            // 如果 API 失败，尝试从 CSV 获取（非标准股票）
            const csvPrice = await getStockPriceFromCSV(symbol);
            console.log(`Got price for ${symbol} from CSV: ${csvPrice}`);
            return csvPrice;
        } catch (csvError) {
            console.error(`Both API and CSV failed for ${symbol}`);
            throw new Error(`Unable to get price for ${symbol}: ${apiError.message}`);
        }
    }
}

// 智能获取历史数据（先尝试 API，失败再尝试 CSV）
// 优先使用 API 以支持标准美股
async function getSmartHistoricalData(symbol, days = 365) {
    try {
        // 首先尝试使用 API 获取标准美股历史数据
        const apiData = await fetchHistoricalData(symbol, days);
        if (apiData && apiData.length > 0) {
            console.log(`Got ${apiData.length} historical data points for ${symbol} from API`);
            return apiData;
        }
        throw new Error('No API data');
    } catch (apiError) {
        console.log(`API historical lookup failed for ${symbol}, trying CSV...`);
        try {
            // 如果 API 失败，尝试从 CSV 获取
            const csvData = await getHistoricalDataFromCSV(symbol, days);
            if (csvData.length > 0) {
                console.log(`Got ${csvData.length} historical data points for ${symbol} from CSV`);
                return csvData;
            }
            throw new Error('No CSV data');
        } catch (csvError) {
            console.error(`Both API and CSV historical data failed for ${symbol}`);
            return [];
        }
    }
}

// 虚拟买入股票（不扣除真实余额）
router.post('/virtual-buy', async (req, res) => {
    const { symbol, quantity, buyDate } = req.body;
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    if (!symbol || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid symbol or quantity' });
    }

    try {
        const connection = await pool.getConnection();
        
        // 获取用户虚拟余额（如果不存在则使用默认值100000）
        const [userRows] = await connection.query(
            'SELECT COALESCE(virtual_balance, 100000.00) as virtual_balance FROM users WHERE email = ?', 
            [username]
        );
        
        if (userRows.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'User not found' });
        }

        let virtualBalance = parseFloat(userRows[0].virtual_balance);
        
        // 如果虚拟余额字段不存在，初始化为100000
        if (!virtualBalance || isNaN(virtualBalance)) {
            virtualBalance = 100000.00;
            await connection.query(
                'UPDATE users SET virtual_balance = ? WHERE email = ?',
                [virtualBalance, username]
            );
        }
        
        // 获取价格：如果指定了买入日期，尝试获取历史价格；否则使用当前价格
        let price;
        let timestamp;
        
        if (buyDate) {
            // 用户指定了买入日期，尝试获取该日期的历史价格
            const historicalData = await getSmartHistoricalData(symbol, 365);
            const buyDateStr = buyDate.replace(/-/g, ''); // YYYY-MM-DD -> YYYYMMDD
            const historicalPrice = historicalData.find(d => d.date === buyDateStr);
            
            if (historicalPrice) {
                price = historicalPrice.price;
                timestamp = buyDate + ' 09:30:00'; // 使用指定日期
                console.log(`Using historical price for ${symbol} on ${buyDate}: ${price}`);
            } else {
                // 如果找不到该日期的历史价格，使用最接近的历史价格
                const sortedData = historicalData.sort((a, b) => {
                    return Math.abs(parseInt(a.date) - parseInt(buyDateStr)) - 
                           Math.abs(parseInt(b.date) - parseInt(buyDateStr));
                });
                if (sortedData.length > 0) {
                    price = sortedData[0].price;
                    timestamp = buyDate + ' 09:30:00';
                    console.log(`Using closest historical price for ${symbol}: ${price} (from ${sortedData[0].date})`);
                } else {
                    price = await getSmartStockPrice(symbol);
                    timestamp = buyDate + ' 09:30:00';
                    console.log(`No historical data for ${symbol}, using current price: ${price}`);
                }
            }
        } else {
            // 使用当前实时价格
            price = await getSmartStockPrice(symbol);
            timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        
        const totalCost = price * quantity;

        if (virtualBalance < totalCost) {
            connection.release();
            return res.status(400).json({ 
                error: 'Insufficient virtual balance', 
                virtualBalance, 
                totalCost 
            });
        }

        // 插入虚拟交易记录（is_virtual = 1 表示虚拟交易）
        // 检查is_virtual列是否存在，如果不存在则只插入其他字段
        try {
            await connection.query(
                `INSERT INTO stock_transactions 
                (timestamp, email, stock_name, number, current_price, is_sold, is_virtual) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [timestamp, username, symbol.toUpperCase(), quantity, price, '0', 1]
            );
        } catch (error) {
            // 如果is_virtual列不存在，尝试不包含该列的插入
            if (error.message.includes('is_virtual')) {
                await connection.query(
                    `INSERT INTO stock_transactions 
                    (timestamp, email, stock_name, number, current_price, is_sold) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [timestamp, username, symbol.toUpperCase(), quantity, price, '0']
                );
            } else {
                throw error;
            }
        }

        // 更新虚拟余额
        await connection.query(
            'UPDATE users SET virtual_balance = COALESCE(virtual_balance, 100000.00) - ? WHERE email = ?',
            [totalCost, username]
        );

        // 获取更新后的余额
        const [updatedUser] = await connection.query(
            'SELECT virtual_balance FROM users WHERE email = ?',
            [username]
        );

        connection.release();

        res.json({ 
            success: true,
            message: 'Virtual stock purchase successful', 
            data: { 
                username, 
                symbol: symbol.toUpperCase(), 
                quantity, 
                price, 
                totalCost, 
                remainingVirtualBalance: parseFloat(updatedUser[0].virtual_balance)
            } 
        });
    } catch (error) {
        console.error('Error processing virtual stock purchase:', error.message);
        res.status(500).json({ error: `Failed to process virtual purchase: ${error.message}` });
    }
});

// 获取虚拟投资组合概览（包含实时盈亏）
router.get('/virtual-portfolio', async (req, res) => {
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    try {
        const connection = await pool.getConnection();
        
        // 获取用户虚拟余额
        const [userRows] = await connection.query(
            'SELECT COALESCE(virtual_balance, 100000.00) as virtual_balance FROM users WHERE email = ?', 
            [username]
        );
        
        if (userRows.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'User not found' });
        }

        const virtualBalance = parseFloat(userRows[0].virtual_balance) || 100000.00;

        // 获取所有未卖出的虚拟持仓
        // 先检查is_virtual列是否存在
        let holdings;
        try {
            [holdings] = await connection.query(
                `SELECT stock_name, SUM(number) as total_quantity, 
                 AVG(current_price) as avg_buy_price,
                 MIN(timestamp) as first_purchase_date
                 FROM stock_transactions 
                 WHERE email = ? AND is_sold = FALSE AND is_virtual = 1
                 GROUP BY stock_name`,
                [username]
            );
        } catch (error) {
            // 如果is_virtual列不存在，查询所有未卖出的交易（假设都是虚拟的）
            if (error.message.includes('is_virtual')) {
                [holdings] = await connection.query(
                    `SELECT stock_name, SUM(number) as total_quantity, 
                     AVG(current_price) as avg_buy_price,
                     MIN(timestamp) as first_purchase_date
                     FROM stock_transactions 
                     WHERE email = ? AND is_sold = FALSE
                     GROUP BY stock_name`,
                    [username]
                );
            } else {
                throw error;
            }
        }

        // 获取每只股票的实时价格并计算盈亏
        const portfolioData = [];
        let totalInvested = 0;
        let totalCurrentValue = 0;

        for (const holding of holdings) {
            try {
                const currentPrice = await getSmartStockPrice(holding.stock_name);
                const invested = holding.total_quantity * holding.avg_buy_price;
                const currentValue = holding.total_quantity * currentPrice;
                const profitLoss = currentValue - invested;
                const profitLossPercent = ((currentPrice - holding.avg_buy_price) / holding.avg_buy_price) * 100;

                portfolioData.push({
                    symbol: holding.stock_name,
                    quantity: parseInt(holding.total_quantity),
                    avgBuyPrice: parseFloat(holding.avg_buy_price),
                    currentPrice: currentPrice,
                    invested: invested,
                    currentValue: currentValue,
                    profitLoss: profitLoss,
                    profitLossPercent: profitLossPercent,
                    firstPurchaseDate: holding.first_purchase_date
                });

                totalInvested += invested;
                totalCurrentValue += currentValue;
            } catch (error) {
                console.error(`Error fetching price for ${holding.stock_name}:`, error);
                // 如果无法获取实时价格，使用买入价格
                const invested = holding.total_quantity * holding.avg_buy_price;
                portfolioData.push({
                    symbol: holding.stock_name,
                    quantity: parseInt(holding.total_quantity),
                    avgBuyPrice: parseFloat(holding.avg_buy_price),
                    currentPrice: holding.avg_buy_price,
                    invested: invested,
                    currentValue: invested,
                    profitLoss: 0,
                    profitLossPercent: 0,
                    firstPurchaseDate: holding.first_purchase_date,
                    error: 'Unable to fetch current price'
                });
                totalInvested += invested;
                totalCurrentValue += invested;
            }
        }

        // 排序：表现最好和最差（始终显示，无论盈亏）
        portfolioData.sort((a, b) => b.profitLossPercent - a.profitLossPercent);
        // Winners: 表现最好的前5只（包括 P/L >= 0）
        const winners = portfolioData.slice(0, Math.min(5, portfolioData.length));
        // Losers: 表现最差的后5只（从排序末尾取，排除已在 winners 中的）
        const losersStartIndex = Math.max(portfolioData.length - 5, winners.length);
        const losers = portfolioData.slice(losersStartIndex).reverse();

        const totalProfitLoss = totalCurrentValue - totalInvested;
        const totalProfitLossPercent = totalInvested > 0 
            ? (totalProfitLoss / totalInvested) * 100 
            : 0;

        connection.release();

        res.json({
            success: true,
            portfolio: {
                virtualBalance: virtualBalance,
                totalInvested: totalInvested,
                totalCurrentValue: totalCurrentValue,
                totalProfitLoss: totalProfitLoss,
                totalProfitLossPercent: totalProfitLossPercent,
                holdings: portfolioData,
                winners: winners,
                losers: losers,
                totalHoldings: portfolioData.length
            }
        });
    } catch (error) {
        console.error('Error fetching virtual portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch virtual portfolio' });
    }
});

// 虚拟卖出股票
router.post('/virtual-sell', async (req, res) => {
    const { symbol, quantity, sellDate } = req.body;
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    if (!symbol || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid symbol or quantity' });
    }

    try {
        const connection = await pool.getConnection();
        
        // 查找该股票的所有未卖出虚拟交易记录
        let rows;
        try {
            [rows] = await connection.query(
                `SELECT * FROM stock_transactions 
                 WHERE stock_name = ? AND email = ? AND is_virtual = 1 AND (is_sold = '0' OR is_sold IS NULL)
                 ORDER BY timestamp ASC`,
                [symbol.toUpperCase(), username]
            );
        } catch (error) {
            if (error.message.includes('is_virtual')) {
                [rows] = await connection.query(
                    `SELECT * FROM stock_transactions 
                     WHERE stock_name = ? AND email = ? AND (is_sold = '0' OR is_sold IS NULL)
                     ORDER BY timestamp ASC`,
                    [symbol.toUpperCase(), username]
                );
            } else {
                throw error;
            }
        }

        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'No holdings found for this stock' });
        }

        // 计算总持仓
        const totalHoldings = rows.reduce((sum, r) => sum + r.number, 0);
        if (quantity > totalHoldings) {
            connection.release();
            return res.status(400).json({ 
                error: 'Sell quantity exceeds available stock', 
                availableQuantity: totalHoldings 
            });
        }

        // 获取卖出价格：如果指定了卖出日期，使用历史价格；否则使用当前价格
        let sellPrice;
        if (sellDate) {
            const historicalData = await getSmartHistoricalData(symbol, 365);
            const sellDateStr = sellDate.replace(/-/g, '');
            const historicalPrice = historicalData.find(d => d.date === sellDateStr);
            
            if (historicalPrice) {
                sellPrice = historicalPrice.price;
                console.log(`Using historical sell price for ${symbol} on ${sellDate}: ${sellPrice}`);
            } else {
                const sortedData = historicalData.sort((a, b) => {
                    return Math.abs(parseInt(a.date) - parseInt(sellDateStr)) - 
                           Math.abs(parseInt(b.date) - parseInt(sellDateStr));
                });
                sellPrice = sortedData.length > 0 ? sortedData[0].price : await getSmartStockPrice(symbol);
                console.log(`Using closest historical sell price for ${symbol}: ${sellPrice}`);
            }
        } else {
            sellPrice = await getSmartStockPrice(symbol);
        }

        const sellAmount = sellPrice * quantity;

        // 计算买入成本和利润（FIFO 先进先出）
        let remainingToSell = quantity;
        let totalBuyCost = 0;
        
        for (const row of rows) {
            if (remainingToSell <= 0) break;
            
            const sellFromThis = Math.min(remainingToSell, row.number);
            totalBuyCost += sellFromThis * row.current_price;
            remainingToSell -= sellFromThis;
            
            // 更新或标记为已卖出
            const newQuantity = row.number - sellFromThis;
            if (newQuantity > 0) {
                await connection.query(
                    'UPDATE stock_transactions SET number = ? WHERE timestamp = ? AND email = ?',
                    [newQuantity, row.timestamp, username]
                );
            } else {
                await connection.query(
                    `UPDATE stock_transactions SET number = 0, is_sold = '1' WHERE timestamp = ? AND email = ?`,
                    [row.timestamp, username]
                );
            }
        }

        const profit = sellAmount - totalBuyCost;

        // 更新虚拟余额
        await connection.query(
            'UPDATE users SET virtual_balance = COALESCE(virtual_balance, 100000.00) + ? WHERE email = ?',
            [sellAmount, username]
        );

        connection.release();

        res.json({
            success: true,
            message: 'Virtual stock sold successfully',
            data: {
                symbol: symbol.toUpperCase(),
                quantity,
                price: sellPrice,
                sellAmount,
                buyCost: totalBuyCost,
                profit,
                sellDate: sellDate || new Date().toISOString().split('T')[0]
            }
        });
    } catch (error) {
        console.error('Error processing virtual sell:', error);
        res.status(500).json({ error: 'Failed to process virtual sell' });
    }
});

// 回测功能：基于历史数据测试策略
router.post('/backtest', async (req, res) => {
    const { symbol, startDate, endDate, strategy, initialCapital } = req.body;

    if (!symbol) {
        return res.status(400).json({ error: 'Stock symbol is required' });
    }

    try {
        // 获取历史数据（默认365天，优先使用 CSV 数据）
        const days = 365;
        const historicalData = await getSmartHistoricalData(symbol, days);
        
        if (!historicalData || historicalData.length === 0) {
            return res.status(400).json({ error: 'No historical data available for this symbol' });
        }

        // 转换日期格式（如果提供）
        let filteredData = historicalData;
        if (startDate && endDate) {
            const start = parseInt(startDate.toString().replace(/-/g, ''));
            const end = parseInt(endDate.toString().replace(/-/g, ''));
            filteredData = historicalData.filter(item => {
                const date = parseInt(item.date);
                return date >= start && date <= end;
            });
        }

        if (filteredData.length === 0) {
            return res.status(400).json({ error: 'No data available for the specified date range' });
        }

        const capital = initialCapital || 10000;
        
        // 简单的回测策略：买入持有
        const buyPrice = filteredData[0].price;
        const sellPrice = filteredData[filteredData.length - 1].price;
        const shares = Math.floor(capital / buyPrice);
        const finalValue = shares * sellPrice;
        const profitLoss = finalValue - capital;
        const profitLossPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

        // 计算最大回撤
        let maxPrice = buyPrice;
        let maxDrawdown = 0;
        let maxDrawdownDate = filteredData[0].date;
        for (const data of filteredData) {
            if (data.price > maxPrice) {
                maxPrice = data.price;
            }
            const drawdown = ((maxPrice - data.price) / maxPrice) * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
                maxDrawdownDate = data.date;
            }
        }

        // 计算波动率（标准差）
        const prices = filteredData.map(d => d.price);
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // 年化波动率

        res.json({
            success: true,
            backtest: {
                symbol: symbol.toUpperCase(),
                strategy: strategy || 'Buy and Hold',
                startDate: filteredData[0].date,
                endDate: filteredData[filteredData.length - 1].date,
                initialCapital: capital,
                buyPrice: buyPrice,
                sellPrice: sellPrice,
                shares: shares,
                finalValue: finalValue,
                profitLoss: profitLoss,
                profitLossPercent: profitLossPercent,
                maxDrawdown: maxDrawdown,
                maxDrawdownDate: maxDrawdownDate,
                volatility: volatility,
                dataPoints: filteredData.length,
                priceHistory: filteredData.map(d => ({
                    date: d.date,
                    price: d.price
                }))
            }
        });
    } catch (error) {
        console.error('Error running backtest:', error);
        res.status(500).json({ error: `Failed to run backtest: ${error.message}` });
    }
});

// 获取股票价格走势（从买入时间到现在）
router.get('/price-timeline/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    try {
        const connection = await pool.getConnection();
        
        // 获取该股票的买入时间
        let purchaseDate;
        try {
            const [rows] = await connection.query(
                `SELECT MIN(timestamp) as first_purchase_date 
                 FROM stock_transactions 
                 WHERE email = ? AND stock_name = ? AND is_sold = FALSE AND is_virtual = 1`,
                [username, symbol.toUpperCase()]
            );
            
            if (rows.length === 0 || !rows[0].first_purchase_date) {
                connection.release();
                return res.status(404).json({ error: 'No purchase record found for this stock' });
            }
            
            purchaseDate = new Date(rows[0].first_purchase_date);
        } catch (error) {
            if (error.message.includes('is_virtual')) {
                const [rows] = await connection.query(
                    `SELECT MIN(timestamp) as first_purchase_date 
                     FROM stock_transactions 
                     WHERE email = ? AND stock_name = ? AND is_sold = FALSE`,
                    [username, symbol.toUpperCase()]
                );
                
                if (rows.length === 0 || !rows[0].first_purchase_date) {
                    connection.release();
                    return res.status(404).json({ error: 'No purchase record found for this stock' });
                }
                
                purchaseDate = new Date(rows[0].first_purchase_date);
            } else {
                throw error;
            }
        }
        
        connection.release();

        // 计算从买入到现在有多少天
        const now = new Date();
        const daysSincePurchase = Math.ceil((now - purchaseDate) / (1000 * 60 * 60 * 24));
        const days = Math.max(1, Math.min(daysSincePurchase, 365)); // 最多365天

        // 获取历史数据（优先使用 CSV 数据）
        const historicalData = await getSmartHistoricalData(symbol.toUpperCase(), days);
        
        // 过滤出买入日期之后的数据
        const purchaseDateStr = purchaseDate.toISOString().split('T')[0].replace(/-/g, '');
        const filteredData = historicalData.filter(item => {
            return parseInt(item.date) >= parseInt(purchaseDateStr);
        });

        // 获取买入价格
        const buyPrice = filteredData.length > 0 ? filteredData[0].price : null;

        res.json({
            success: true,
            symbol: symbol.toUpperCase(),
            purchaseDate: purchaseDate.toISOString().split('T')[0],
            buyPrice: buyPrice,
            timeline: filteredData.map(item => ({
                date: item.date,
                price: item.price,
                // 计算盈亏百分比
                profitLossPercent: buyPrice ? ((item.price - buyPrice) / buyPrice * 100) : 0
            }))
        });
    } catch (error) {
        console.error('Error fetching price timeline:', error);
        res.status(500).json({ error: `Failed to fetch price timeline: ${error.message}` });
    }
});

// 获取投资组合价值时间轴
router.get('/portfolio-timeline', async (req, res) => {
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    try {
        const connection = await pool.getConnection();
        
        // 获取所有持仓及其买入时间
        let holdings;
        try {
            [holdings] = await connection.query(
                `SELECT stock_name, SUM(number) as total_quantity, 
                 AVG(current_price) as avg_buy_price,
                 MIN(timestamp) as first_purchase_date
                 FROM stock_transactions 
                 WHERE email = ? AND is_sold = FALSE AND is_virtual = 1
                 GROUP BY stock_name`,
                [username]
            );
        } catch (error) {
            if (error.message.includes('is_virtual')) {
                [holdings] = await connection.query(
                    `SELECT stock_name, SUM(number) as total_quantity, 
                     AVG(current_price) as avg_buy_price,
                     MIN(timestamp) as first_purchase_date
                     FROM stock_transactions 
                     WHERE email = ? AND is_sold = FALSE
                     GROUP BY stock_name`,
                    [username]
                );
            } else {
                throw error;
            }
        }

        if (holdings.length === 0) {
            connection.release();
            return res.json({
                success: true,
                timeline: [],
                message: 'No holdings found'
            });
        }

        // 找到最早的买入日期
        const earliestPurchase = new Date(Math.min(...holdings.map(h => new Date(h.first_purchase_date))));
        const now = new Date();
        const daysSincePurchase = Math.ceil((now - earliestPurchase) / (1000 * 60 * 60 * 24));
        const days = Math.max(1, Math.min(daysSincePurchase, 365));

        // 获取所有股票的历史数据
        const stockTimelines = {};
        for (const holding of holdings) {
            try {
                console.log(`Fetching historical data for ${holding.stock_name}, days: ${days}`);
                const historicalData = await getSmartHistoricalData(holding.stock_name, days);
                console.log(`Received ${historicalData.length} data points for ${holding.stock_name}`);
                
                // If no data available, skip this stock but continue with others
                if (historicalData.length === 0) {
                    console.warn(`No historical data available for ${holding.stock_name}, skipping...`);
                    continue;
                }
                
                const purchaseDate = new Date(holding.first_purchase_date);
                const purchaseDateStr = purchaseDate.toISOString().split('T')[0].replace(/-/g, '');
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');
                const isTodayPurchase = purchaseDateStr === todayStr;
                
                console.log(`Filtering data from purchase date: ${purchaseDateStr} (isToday: ${isTodayPurchase})`);
                
                let filteredData = historicalData.filter(item => {
                    return parseInt(item.date) >= parseInt(purchaseDateStr);
                });
                
                // If purchase date is today and no data after filtering, use recent available data
                if (filteredData.length === 0 && isTodayPurchase && historicalData.length > 0) {
                    console.warn(`No data for today (${purchaseDateStr}) for ${holding.stock_name}, using recent available data`);
                    // Use the most recent data points (at least the last 30 days or all available if less)
                    const recentData = historicalData.slice(-Math.min(30, historicalData.length));
                    filteredData = recentData;
                }
                
                // If still no data, try using all available data
                if (filteredData.length === 0 && historicalData.length > 0) {
                    console.warn(`No data after purchase date for ${holding.stock_name}, using all available data`);
                    filteredData = historicalData;
                }
                
                console.log(`Filtered to ${filteredData.length} data points for ${holding.stock_name}`);
                
                if (filteredData.length > 0) {
                    stockTimelines[holding.stock_name] = {
                        quantity: parseInt(holding.total_quantity),
                        avgBuyPrice: parseFloat(holding.avg_buy_price),
                        prices: filteredData
                    };
                } else {
                    console.warn(`No data available for ${holding.stock_name} after all filtering attempts`);
                }
            } catch (error) {
                console.error(`Error fetching timeline for ${holding.stock_name}:`, error.message);
                // Continue with other stocks even if one fails
            }
        }

        connection.release();

        // 检查是否有任何股票数据
        if (Object.keys(stockTimelines).length === 0) {
            console.log('No stock timeline data available');
            return res.json({
                success: true,
                timeline: [],
                message: 'No historical data available for holdings'
            });
        }

        // 合并所有日期，计算每天的投资组合价值
        const allDates = new Set();
        Object.values(stockTimelines).forEach(timeline => {
            timeline.prices.forEach(item => allDates.add(item.date));
        });

        console.log(`Total unique dates: ${allDates.size}`);

        const sortedDates = Array.from(allDates).sort();
        const portfolioTimeline = [];

        for (const date of sortedDates) {
            let totalValue = 0;
            let totalInvested = 0;

            Object.entries(stockTimelines).forEach(([symbol, timeline]) => {
                const priceData = timeline.prices.find(p => p.date === date);
                if (priceData) {
                    const invested = timeline.quantity * timeline.avgBuyPrice;
                    const currentValue = timeline.quantity * priceData.price;
                    totalInvested += invested;
                    totalValue += currentValue;
                }
            });

            if (totalInvested > 0) {
                portfolioTimeline.push({
                    date: date,
                    totalInvested: totalInvested,
                    totalValue: totalValue,
                    profitLoss: totalValue - totalInvested,
                    profitLossPercent: ((totalValue - totalInvested) / totalInvested) * 100
                });
            }
        }

        console.log(`Generated portfolio timeline with ${portfolioTimeline.length} data points`);

        res.json({
            success: true,
            timeline: portfolioTimeline,
            holdings: holdings.map(h => ({
                symbol: h.stock_name,
                quantity: parseInt(h.total_quantity),
                avgBuyPrice: parseFloat(h.avg_buy_price)
            }))
        });
    } catch (error) {
        console.error('Error fetching portfolio timeline:', error);
        res.status(500).json({ error: `Failed to fetch portfolio timeline: ${error.message}` });
    }
});

// Batch Buy - Buy multiple stocks at once
router.post('/batch-buy', async (req, res) => {
    const { orders, buyDate } = req.body;
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({ error: 'No orders provided' });
    }

    const results = [];
    
    try {
        const connection = await pool.getConnection();
        
        // Get user's virtual balance
        const [userRows] = await connection.query(
            'SELECT COALESCE(virtual_balance, 100000.00) as virtual_balance FROM users WHERE email = ?', 
            [username]
        );
        
        if (userRows.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'User not found' });
        }

        let virtualBalance = parseFloat(userRows[0].virtual_balance) || 100000.00;
        
        // Process each order
        for (const order of orders) {
            const { symbol, quantity } = order;
            
            if (!symbol || !quantity || quantity <= 0) {
                results.push({ symbol, success: false, error: 'Invalid symbol or quantity' });
                continue;
            }

            try {
                // Get price
                let price;
                let timestamp;
                
                if (buyDate) {
                    const historicalData = await getSmartHistoricalData(symbol, 365);
                    const buyDateStr = buyDate.replace(/-/g, '');
                    const historicalPrice = historicalData.find(d => d.date === buyDateStr);
                    
                    if (historicalPrice) {
                        price = historicalPrice.price;
                    } else {
                        const sortedData = historicalData.sort((a, b) => {
                            return Math.abs(parseInt(a.date) - parseInt(buyDateStr)) - 
                                   Math.abs(parseInt(b.date) - parseInt(buyDateStr));
                        });
                        price = sortedData.length > 0 ? sortedData[0].price : await getSmartStockPrice(symbol);
                    }
                    timestamp = buyDate + ' 09:30:00';
                } else {
                    price = await getSmartStockPrice(symbol);
                    timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
                }
                
                const totalCost = price * quantity;

                if (virtualBalance < totalCost) {
                    results.push({ 
                        symbol, 
                        success: false, 
                        error: 'Insufficient balance',
                        required: totalCost,
                        available: virtualBalance
                    });
                    continue;
                }

                // Insert transaction
                try {
                    await connection.query(
                        `INSERT INTO stock_transactions 
                        (timestamp, email, stock_name, number, current_price, is_sold, is_virtual) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [timestamp, username, symbol.toUpperCase(), quantity, price, '0', 1]
                    );
                } catch (insertError) {
                    if (insertError.message.includes('is_virtual')) {
                        await connection.query(
                            `INSERT INTO stock_transactions 
                            (timestamp, email, stock_name, number, current_price, is_sold) 
                            VALUES (?, ?, ?, ?, ?, ?)`,
                            [timestamp, username, symbol.toUpperCase(), quantity, price, '0']
                        );
                    } else {
                        throw insertError;
                    }
                }

                // Update balance
                virtualBalance -= totalCost;
                await connection.query(
                    'UPDATE users SET virtual_balance = ? WHERE email = ?',
                    [virtualBalance, username]
                );

                results.push({
                    symbol: symbol.toUpperCase(),
                    success: true,
                    quantity,
                    price,
                    totalCost,
                    remainingBalance: virtualBalance
                });

            } catch (orderError) {
                console.error(`Error processing order for ${symbol}:`, orderError);
                results.push({ symbol, success: false, error: orderError.message });
            }
        }

        connection.release();

        res.json({
            success: true,
            message: 'Batch orders processed',
            results,
            finalBalance: virtualBalance
        });

    } catch (error) {
        console.error('Error processing batch buy:', error);
        res.status(500).json({ error: 'Failed to process batch orders' });
    }
});

// In-memory basket orders storage (in production, use database)
let basketOrdersStorage = [];
let basketIdCounter = 1;

// Get all active basket orders
router.get('/basket-orders', async (req, res) => {
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    try {
        // Aggregate basket orders by symbol and action
        const aggregatedBaskets = [];
        const basketMap = new Map();

        basketOrdersStorage.forEach(order => {
            const key = `${order.symbol}-${order.action}`;
            if (basketMap.has(key)) {
                const existing = basketMap.get(key);
                existing.totalQuantity += order.quantity;
                existing.participantCount++;
                existing.participants.push({
                    username: order.username,
                    quantity: order.quantity
                });
            } else {
                basketMap.set(key, {
                    id: order.id,
                    symbol: order.symbol,
                    action: order.action,
                    totalQuantity: order.quantity,
                    participantCount: 1,
                    participants: [{
                        username: order.username,
                        quantity: order.quantity
                    }],
                    createdAt: order.createdAt
                });
            }
        });

        basketMap.forEach(value => aggregatedBaskets.push(value));

        res.json({
            success: true,
            baskets: aggregatedBaskets
        });
    } catch (error) {
        console.error('Error fetching basket orders:', error);
        res.status(500).json({ error: 'Failed to fetch basket orders' });
    }
});

// Join a basket order
router.post('/basket-join', async (req, res) => {
    const { symbol, quantity, action } = req.body;
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    if (!symbol || !quantity || quantity <= 0 || !action) {
        return res.status(400).json({ error: 'Invalid order parameters' });
    }

    try {
        // Check if user already has an order for this symbol/action
        const existingIndex = basketOrdersStorage.findIndex(
            o => o.username === username && o.symbol === symbol.toUpperCase() && o.action === action
        );

        if (existingIndex >= 0) {
            // Update existing order
            basketOrdersStorage[existingIndex].quantity += quantity;
        } else {
            // Add new order
            basketOrdersStorage.push({
                id: basketIdCounter++,
                username,
                symbol: symbol.toUpperCase(),
                quantity,
                action,
                createdAt: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Successfully joined basket order',
            order: {
                symbol: symbol.toUpperCase(),
                quantity,
                action
            }
        });
    } catch (error) {
        console.error('Error joining basket order:', error);
        res.status(500).json({ error: 'Failed to join basket order' });
    }
});

// Execute a basket order
router.post('/basket-execute', async (req, res) => {
    const { basketId } = req.body;
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    try {
        // Find the basket order
        const basketOrder = basketOrdersStorage.find(o => o.id === parseInt(basketId));
        
        if (!basketOrder) {
            return res.status(404).json({ error: 'Basket order not found' });
        }

        const { symbol, action } = basketOrder;
        
        // Get all orders for this symbol and action
        const relatedOrders = basketOrdersStorage.filter(
            o => o.symbol === symbol && o.action === action
        );

        const connection = await pool.getConnection();
        const results = [];
        let successCount = 0;

        for (const order of relatedOrders) {
            try {
                const price = await getSmartStockPrice(symbol);
                const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

                if (action === 'buy') {
                    const totalCost = price * order.quantity;

                    // Get user's balance
                    const [userRows] = await connection.query(
                        'SELECT COALESCE(virtual_balance, 100000.00) as virtual_balance FROM users WHERE email = ?',
                        [order.username]
                    );

                    if (userRows.length > 0) {
                        const balance = parseFloat(userRows[0].virtual_balance);
                        
                        if (balance >= totalCost) {
                            // Insert transaction
                            try {
                                await connection.query(
                                    `INSERT INTO stock_transactions 
                                    (timestamp, email, stock_name, number, current_price, is_sold, is_virtual) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                    [timestamp, order.username, symbol, order.quantity, price, '0', 1]
                                );
                            } catch (insertError) {
                                if (insertError.message.includes('is_virtual')) {
                                    await connection.query(
                                        `INSERT INTO stock_transactions 
                                        (timestamp, email, stock_name, number, current_price, is_sold) 
                                        VALUES (?, ?, ?, ?, ?, ?)`,
                                        [timestamp, order.username, symbol, order.quantity, price, '0']
                                    );
                                }
                            }

                            // Update balance
                            await connection.query(
                                'UPDATE users SET virtual_balance = virtual_balance - ? WHERE email = ?',
                                [totalCost, order.username]
                            );

                            results.push({ username: order.username, success: true });
                            successCount++;
                        } else {
                            results.push({ username: order.username, success: false, error: 'Insufficient balance' });
                        }
                    }
                } else if (action === 'sell') {
                    // Handle sell logic
                    let rows;
                    try {
                        [rows] = await connection.query(
                            `SELECT * FROM stock_transactions 
                             WHERE stock_name = ? AND email = ? AND is_virtual = 1 AND (is_sold = '0' OR is_sold IS NULL)
                             ORDER BY timestamp ASC`,
                            [symbol, order.username]
                        );
                    } catch (queryError) {
                        if (queryError.message.includes('is_virtual')) {
                            [rows] = await connection.query(
                                `SELECT * FROM stock_transactions 
                                 WHERE stock_name = ? AND email = ? AND (is_sold = '0' OR is_sold IS NULL)
                                 ORDER BY timestamp ASC`,
                                [symbol, order.username]
                            );
                        } else {
                            throw queryError;
                        }
                    }

                    const totalHoldings = rows.reduce((sum, r) => sum + r.number, 0);
                    
                    if (order.quantity <= totalHoldings) {
                        const sellAmount = price * order.quantity;
                        let remainingToSell = order.quantity;

                        for (const row of rows) {
                            if (remainingToSell <= 0) break;
                            
                            const sellFromThis = Math.min(remainingToSell, row.number);
                            remainingToSell -= sellFromThis;
                            
                            const newQuantity = row.number - sellFromThis;
                            if (newQuantity > 0) {
                                await connection.query(
                                    'UPDATE stock_transactions SET number = ? WHERE timestamp = ? AND email = ?',
                                    [newQuantity, row.timestamp, order.username]
                                );
                            } else {
                                await connection.query(
                                    `UPDATE stock_transactions SET number = 0, is_sold = '1' WHERE timestamp = ? AND email = ?`,
                                    [row.timestamp, order.username]
                                );
                            }
                        }

                        await connection.query(
                            'UPDATE users SET virtual_balance = COALESCE(virtual_balance, 100000.00) + ? WHERE email = ?',
                            [sellAmount, order.username]
                        );

                        results.push({ username: order.username, success: true });
                        successCount++;
                    } else {
                        results.push({ username: order.username, success: false, error: 'Insufficient holdings' });
                    }
                }
            } catch (orderError) {
                console.error(`Error processing basket order for ${order.username}:`, orderError);
                results.push({ username: order.username, success: false, error: orderError.message });
            }
        }

        // Remove executed orders from storage
        basketOrdersStorage = basketOrdersStorage.filter(
            o => !(o.symbol === symbol && o.action === action)
        );

        connection.release();

        res.json({
            success: true,
            message: 'Basket order executed',
            symbol,
            action,
            participantCount: successCount,
            results
        });
    } catch (error) {
        console.error('Error executing basket order:', error);
        res.status(500).json({ error: 'Failed to execute basket order' });
    }
});

// Batch Sell - Sell multiple stocks at once
router.post('/batch-sell', async (req, res) => {
    const { orders } = req.body;
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({ error: 'No orders provided' });
    }

    const results = [];
    
    try {
        const connection = await pool.getConnection();

        for (const order of orders) {
            const { symbol, quantity, sellDate } = order;
            
            if (!symbol || !quantity || quantity <= 0) {
                results.push({ symbol, success: false, error: 'Invalid symbol or quantity' });
                continue;
            }

            try {
                // Find holdings
                let rows;
                try {
                    [rows] = await connection.query(
                        `SELECT * FROM stock_transactions 
                         WHERE stock_name = ? AND email = ? AND is_virtual = 1 AND (is_sold = '0' OR is_sold IS NULL)
                         ORDER BY timestamp ASC`,
                        [symbol.toUpperCase(), username]
                    );
                } catch (queryError) {
                    if (queryError.message.includes('is_virtual')) {
                        [rows] = await connection.query(
                            `SELECT * FROM stock_transactions 
                             WHERE stock_name = ? AND email = ? AND (is_sold = '0' OR is_sold IS NULL)
                             ORDER BY timestamp ASC`,
                            [symbol.toUpperCase(), username]
                        );
                    } else {
                        throw queryError;
                    }
                }

                const totalHoldings = rows.reduce((sum, r) => sum + r.number, 0);
                
                if (quantity > totalHoldings) {
                    results.push({ 
                        symbol, 
                        success: false, 
                        error: 'Insufficient holdings',
                        available: totalHoldings
                    });
                    continue;
                }

                // Get sell price
                let sellPrice;
                if (sellDate) {
                    const historicalData = await getSmartHistoricalData(symbol, 365);
                    const sellDateStr = sellDate.replace(/-/g, '');
                    const historicalPrice = historicalData.find(d => d.date === sellDateStr);
                    sellPrice = historicalPrice ? historicalPrice.price : await getSmartStockPrice(symbol);
                } else {
                    sellPrice = await getSmartStockPrice(symbol);
                }

                const sellAmount = sellPrice * quantity;
                let remainingToSell = quantity;
                let totalBuyCost = 0;

                for (const row of rows) {
                    if (remainingToSell <= 0) break;
                    
                    const sellFromThis = Math.min(remainingToSell, row.number);
                    totalBuyCost += sellFromThis * row.current_price;
                    remainingToSell -= sellFromThis;
                    
                    const newQuantity = row.number - sellFromThis;
                    if (newQuantity > 0) {
                        await connection.query(
                            'UPDATE stock_transactions SET number = ? WHERE timestamp = ? AND email = ?',
                            [newQuantity, row.timestamp, username]
                        );
                    } else {
                        await connection.query(
                            `UPDATE stock_transactions SET number = 0, is_sold = '1' WHERE timestamp = ? AND email = ?`,
                            [row.timestamp, username]
                        );
                    }
                }

                const profit = sellAmount - totalBuyCost;

                // 更新虚拟余额
                await connection.query(
                    'UPDATE users SET virtual_balance = COALESCE(virtual_balance, 100000.00) + ? WHERE email = ?',
                    [sellAmount, username]
                );

                results.push({
                    symbol: symbol.toUpperCase(),
                    success: true,
                    quantity,
                    price: sellPrice,
                    sellAmount,
                    profit
                });

            } catch (orderError) {
                console.error(`Error processing sell order for ${symbol}:`, orderError);
                results.push({ symbol, success: false, error: orderError.message });
            }
        }

        connection.release();

        res.json({
            success: true,
            message: 'Batch sell orders processed',
            results
        });

    } catch (error) {
        console.error('Error processing batch sell:', error);
        res.status(500).json({ error: 'Failed to process batch sell orders' });
    }
});

// --- 新增：AI 分析当前虚拟投资组合 ---
router.get('/virtual-portfolio-analysis', async (req, res) => {
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    try {
        const connection = await pool.getConnection();

        // 1. 获取当前持仓 (与 virtual-portfolio 路由类似的逻辑)
        let holdings;
        try {
            [holdings] = await connection.query(
                `SELECT stock_name, SUM(number) as total_quantity, AVG(current_price) as avg_buy_price
                 FROM stock_transactions 
                 WHERE email = ? AND is_sold = FALSE AND is_virtual = 1
                 GROUP BY stock_name`,
                [username]
            );
        } catch (err) {
            // 回退逻辑：如果 is_virtual 不存在
             [holdings] = await connection.query(
                `SELECT stock_name, SUM(number) as total_quantity, AVG(current_price) as avg_buy_price
                 FROM stock_transactions 
                 WHERE email = ? AND is_sold = FALSE
                 GROUP BY stock_name`,
                [username]
            );
        }
        connection.release();

        if (holdings.length < 2) {
            return res.json({ 
                success: false, 
                message: 'You need at least 2 stocks in your portfolio for AI optimization analysis.' 
            });
        }

        // 2. 准备数据：获取历史价格、计算当前价值和指标
        const stocksData = [];
        let totalPortfolioValue = 0;
        const stockDetails = [];

        for (const holding of holdings) {
            const symbol = holding.stock_name;
            const quantity = parseInt(holding.total_quantity);

            // 获取历史数据用于计算指标
            const historicalData = await getSmartHistoricalData(symbol, 365);
            
            if (!historicalData || historicalData.length < 30) {
                console.warn(`Insufficient historical data for ${symbol}, skipping analysis for this stock.`);
                continue;
            }

            // 获取当前实时价格用于计算当前权重
            const currentPrice = await getSmartStockPrice(symbol);
            const currentValue = quantity * currentPrice;
            totalPortfolioValue += currentValue;

            const prices = historicalData.map(d => d.price);
            const returns = calculateReturns(prices);

            stocksData.push({
                ticker: symbol,
                returns: returns,
                risk: calculateStandardDeviation(returns),
                sharpeRatio: calculateSharpeRatio(returns),
                currentValue: currentValue,
                quantity: quantity,
                currentPrice: currentPrice
            });
        }

        if (stocksData.length < 2) {
            return res.json({ 
                success: false, 
                message: 'Insufficient historical data for your holdings to perform analysis.' 
            });
        }

        // 3. 调用 AI 获取建议权重
        // 注意：我们需要把 stocksData 映射成 aiPortfolioPrediction 需要的格式
        const aiFeatures = stocksData.map(s => ({
            returns: s.returns,
            risk: s.risk,
            sharpeRatio: s.sharpeRatio
        }));

        const aiResult = await getAIPortfolioPrediction(aiFeatures);

        // 4. 整合结果：对比当前权重 vs AI 建议权重
        const comparisonResult = stocksData.map((stock, index) => {
            const currentWeight = stock.currentValue / totalPortfolioValue;
            const suggestedWeight = aiResult.weights[index];
            const difference = suggestedWeight - currentWeight;
            
            // 计算建议操作
            let suggestion = "Hold";
            let actionValue = 0; // 需要买入/卖出的金额

            if (difference > 0.02) { // 建议增加超过 2%
                suggestion = "Buy";
                actionValue = totalPortfolioValue * difference; 
            } else if (difference < -0.02) { // 建议减少超过 2%
                suggestion = "Sell";
                actionValue = totalPortfolioValue * Math.abs(difference);
            }

            return {
                symbol: stock.ticker,
                currentPrice: stock.currentPrice,
                currentWeight: (currentWeight * 100).toFixed(2) + '%',
                suggestedWeight: (suggestedWeight * 100).toFixed(2) + '%',
                difference: (difference * 100).toFixed(2) + '%',
                suggestion: suggestion,
                suggestedActionValue: actionValue.toFixed(2), // 建议变动的金额
                risk: stock.risk,
                sharpeRatio: stock.sharpeRatio
            };
        });

        res.json({
            success: true,
            totalPortfolioValue: totalPortfolioValue,
            aiAnalysis: aiResult.analysis,
            recommendations: comparisonResult
        });

    } catch (error) {
        console.error('Error in virtual portfolio analysis:', error);
        res.status(500).json({ error: 'Failed to analyze portfolio: ' + error.message });
    }
});

// ==================== Hedge Analysis Functions ====================

// Calculate correlation between two return arrays
function calculateCorrelation(returns1, returns2) {
    const n = Math.min(returns1.length, returns2.length);
    if (n === 0) return 0;
    
    const r1 = returns1.slice(0, n);
    const r2 = returns2.slice(0, n);
    
    const mean1 = r1.reduce((a, b) => a + b, 0) / n;
    const mean2 = r2.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;
    
    for (let i = 0; i < n; i++) {
        const diff1 = r1[i] - mean1;
        const diff2 = r2[i] - mean2;
        numerator += diff1 * diff2;
        sum1Sq += diff1 * diff1;
        sum2Sq += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator === 0 ? 0 : numerator / denominator;
}

// Hedge Analysis API - Analyze correlation between stocks
router.post('/hedge-analysis', async (req, res) => {
    const { symbols } = req.body;
    const username = sharedState.getUsername();
    
    if (!username) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length < 2) {
        return res.status(400).json({ error: 'At least 2 stock symbols are required' });
    }

    try {
        // Fetch historical data for all symbols
        const stockData = {};
        const days = 90; // Use 90 days for correlation analysis
        
        for (const symbol of symbols) {
            try {
                const historicalData = await getSmartHistoricalData(symbol.toUpperCase(), days);
                if (historicalData && historicalData.length > 0) {
                    const prices = historicalData.map(d => d.price);
                    // Calculate returns
                    const returns = [];
                    for (let i = 1; i < prices.length; i++) {
                        if (prices[i - 1] !== 0) {
                            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
                        } else {
                            returns.push(0);
                        }
                    }
                    stockData[symbol.toUpperCase()] = {
                        prices: prices,
                        returns: returns
                    };
                }
            } catch (error) {
                console.error(`Error fetching data for ${symbol}:`, error.message);
            }
        }

        const validSymbols = Object.keys(stockData);
        if (validSymbols.length < 2) {
            return res.status(400).json({ error: 'Not enough valid stock data for analysis' });
        }

        // Calculate correlation matrix
        const correlationMatrix = {};
        const correlationPairs = [];
        
        for (let i = 0; i < validSymbols.length; i++) {
            const symbolA = validSymbols[i];
            correlationMatrix[symbolA] = {};
            
            for (let j = 0; j < validSymbols.length; j++) {
                const symbolB = validSymbols[j];
                
                if (i === j) {
                    correlationMatrix[symbolA][symbolB] = 1;
                } else if (i < j) {
                    const correlation = calculateCorrelation(
                        stockData[symbolA].returns,
                        stockData[symbolB].returns
                    );
                    correlationMatrix[symbolA][symbolB] = correlation;
                    
                    // Classify correlation
                    let category = 'moderate';
                    if (correlation >= 0.7) category = 'high';
                    else if (correlation >= 0.3) category = 'moderate';
                    else if (correlation >= -0.3) category = 'low';
                    else category = 'negative';
                    
                    correlationPairs.push({
                        stockA: symbolA,
                        stockB: symbolB,
                        correlation: parseFloat(correlation.toFixed(4)),
                        category: category
                    });
                } else {
                    correlationMatrix[symbolA][symbolB] = correlationMatrix[symbolB][symbolA];
                }
            }
        }

        // Generate hedging suggestions
        const hedgeSuggestions = [];
        
        // Find negative correlation pairs (best for hedging)
        const negativePairs = correlationPairs.filter(p => p.category === 'negative');
        negativePairs.sort((a, b) => a.correlation - b.correlation); // Most negative first
        
        negativePairs.forEach(pair => {
            hedgeSuggestions.push({
                type: 'negative_correlation',
                stockA: pair.stockA,
                stockB: pair.stockB,
                correlation: pair.correlation,
                suggestion: `Buy ${pair.stockA} + Buy ${pair.stockB} (negative correlation hedges risk)`,
                hedgeRatio: Math.abs(1 / pair.correlation).toFixed(2)
            });
        });

        // Find low correlation pairs (good for diversification)
        const lowPairs = correlationPairs.filter(p => p.category === 'low');
        lowPairs.sort((a, b) => a.correlation - b.correlation);
        
        lowPairs.forEach(pair => {
            hedgeSuggestions.push({
                type: 'low_correlation',
                stockA: pair.stockA,
                stockB: pair.stockB,
                correlation: pair.correlation,
                suggestion: `Buy ${pair.stockA} + Buy ${pair.stockB} (low correlation for diversification)`,
                hedgeRatio: '1.00'
            });
        });

        // Warn about high correlation pairs (not good for hedging)
        const highPairs = correlationPairs.filter(p => p.category === 'high');
        highPairs.sort((a, b) => b.correlation - a.correlation); // Highest first
        
        const riskWarnings = highPairs.map(pair => ({
            stockA: pair.stockA,
            stockB: pair.stockB,
            correlation: pair.correlation,
            warning: `${pair.stockA} and ${pair.stockB} are highly correlated - no hedging benefit`
        }));

        res.json({
            success: true,
            analysis: {
                symbols: validSymbols,
                correlationMatrix: correlationMatrix,
                correlationPairs: correlationPairs,
                hedgeSuggestions: hedgeSuggestions,
                riskWarnings: riskWarnings,
                summary: {
                    totalPairs: correlationPairs.length,
                    negativePairs: negativePairs.length,
                    lowPairs: lowPairs.length,
                    highPairs: highPairs.length
                }
            }
        });
    } catch (error) {
        console.error('Error in hedge analysis:', error);
        res.status(500).json({ error: `Failed to analyze hedging: ${error.message}` });
    }
});

module.exports = router;

