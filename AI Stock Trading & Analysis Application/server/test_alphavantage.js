require('dotenv').config();
const { fetchHistoricalData } = require('./BuyStocks');

async function testAlphaVantage() {
    console.log('Testing Alpha Vantage API...');
    console.log('ALPHA_VANTAGE_API_KEY:', process.env.ALPHA_VANTAGE_API_KEY ? 'Set (length: ' + process.env.ALPHA_VANTAGE_API_KEY.length + ')' : 'NOT SET');
    
    if (!process.env.ALPHA_VANTAGE_API_KEY || process.env.ALPHA_VANTAGE_API_KEY === 'your_alpha_vantage_api_key_here') {
        console.error('\n✗ ERROR: ALPHA_VANTAGE_API_KEY is not set in .env file!');
        console.error('Please:');
        console.error('1. Visit https://www.alphavantage.co/support/#api-key');
        console.error('2. Sign up for a free API key');
        console.error('3. Add ALPHA_VANTAGE_API_KEY=your_key_here to server/.env file');
        process.exit(1);
    }
    
    try {
        console.log('\n1. Testing historical data for AAPL (30 days)...');
        const historical = await fetchHistoricalData('AAPL', 30);
        console.log('✓ Received', historical.length, 'data points');
        if (historical.length > 0) {
            console.log('\nSample data (oldest):');
            console.log(historical[0]);
            console.log('\nLatest data:');
            console.log(historical[historical.length - 1]);
            console.log('\nDate range:', historical[0].date, 'to', historical[historical.length - 1].date);
        }
        
        console.log('\n✓ Alpha Vantage API test passed!');
    } catch (error) {
        console.error('\n✗ Error:', error.message);
        if (error.message.includes('rate limit')) {
            console.error('\nNote: Alpha Vantage free tier has a rate limit of 25 calls/day.');
            console.error('Please wait a moment and try again later.');
        }
        process.exit(1);
    }
}

testAlphaVantage();


