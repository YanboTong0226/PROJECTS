require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const cors = require('./middleware/cors');
const registerRoutes = require('./routes/register');
const userRoutes = require('./routes/userManagement');
const readCSVRoutes = require('./routes/readCSV');
const sellRoutes = require('./routes/sellStock');
const stockTrendRoutes = require('./routes/stock-trend');
const singleAdviceRoutes = require('./routes/getSingleAdvice');
const multipleAdviceRoutes=require('./routes/getMultipleAdvice')
const buyAndViewStocksRoutes=require('./routes/buyAndViewStocks')
const getAIAdviceRoutes=require('./routes/getAIAdviceRoutes')
const stockQARoutes = require('./routes/stockQA');
const aiPersonalAdviceRoutes = require('./routes/aiPersonalAdvice');
const chartAnalysisRoutes = require('./routes/chartAnalysis');
const aiPortfolioPredictionRoutes = require('./routes/aiPortfolioPrediction').router;
const virtualPortfolioRoutes = require('./routes/virtualPortfolio');

// use CORS middleware
app.use(cors);

app.use(bodyParser.json());
app.use(express.json());
app.use('/api', registerRoutes);
app.use('/api', readCSVRoutes);
app.use('/api', userRoutes);
app.use('/api', sellRoutes);
app.use('/api', singleAdviceRoutes);
app.use('/api', multipleAdviceRoutes);
app.use('/api', stockTrendRoutes);
app.use('/api', buyAndViewStocksRoutes);
app.use('/api', getAIAdviceRoutes);
app.use('/api', stockQARoutes);
app.use('/api', aiPersonalAdviceRoutes);
app.use('/api', chartAnalysisRoutes);
app.use('/api', aiPortfolioPredictionRoutes);
app.use('/api', virtualPortfolioRoutes);

// start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
