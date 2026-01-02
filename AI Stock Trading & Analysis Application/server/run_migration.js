/**
 * Database Migration Script Runner
 * This script automatically runs the database migration for virtual portfolio feature
 * 
 * Usage: node run_migration.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration (same as db.js)
const dbConfig = {
    port: 3306,
    host: "localhost",
    user: "root",
    password: "18043201520Ghy!",
    database: "Stock_analysis_system",
};

async function runMigration() {
    let connection;
    
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected successfully!');
        
        // Execute migration statements one by one
        const statements = [
            // Step 1: Add virtual_balance column
            `ALTER TABLE users ADD COLUMN virtual_balance DECIMAL(15, 2) DEFAULT 100000.00`,
            // Step 2: Initialize virtual_balance
            `UPDATE users SET virtual_balance = 100000.00 WHERE virtual_balance IS NULL`,
            // Step 3: Add is_virtual column
            `ALTER TABLE stock_transactions ADD COLUMN is_virtual BOOLEAN DEFAULT FALSE`,
            // Step 4: Set default value
            `UPDATE stock_transactions SET is_virtual = FALSE WHERE is_virtual IS NULL`,
            // Step 5: Create index
            `CREATE INDEX idx_virtual_transactions ON stock_transactions(email, is_virtual, is_sold)`
        ];
        
        console.log(`\nExecuting ${statements.length} migration statements...\n`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            try {
                console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
                await connection.query(statement);
                console.log(`✓ Statement ${i + 1} executed successfully\n`);
            } catch (error) {
                // If column/index already exists, that's okay
                if (error.code === 'ER_DUP_FIELDNAME' || 
                    error.code === 'ER_DUP_KEYNAME' ||
                    error.code === '42S21' || // Duplicate column name
                    error.message.includes('Duplicate column name') ||
                    error.message.includes('Duplicate key name') ||
                    error.message.includes('already exists')) {
                    console.log(`⚠ Statement ${i + 1} skipped (column/index already exists)\n`);
                } else {
                    throw error;
                }
            }
        }
        
        // Run verification query
        console.log('Running verification...');
        const [results] = await connection.query(`
            SELECT 
                'Migration completed successfully!' as status,
                (SELECT COUNT(*) FROM users WHERE virtual_balance IS NOT NULL) as users_with_virtual_balance,
                (SELECT COUNT(*) FROM stock_transactions WHERE is_virtual IS NOT NULL) as transactions_with_flag
        `);
        
        console.log('\n' + '='.repeat(50));
        console.log('Migration Results:');
        console.log('='.repeat(50));
        console.log(JSON.stringify(results[0], null, 2));
        console.log('='.repeat(50));
        console.log('\n✅ Migration completed successfully!');
        console.log('You can now use the virtual portfolio feature.\n');
        
    } catch (error) {
        console.error('\n❌ Migration failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('\nPlease check:');
        console.error('1. MySQL server is running');
        console.error('2. Database credentials are correct in run_migration.js');
        console.error('3. Database "Stock_analysis_system" exists');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

// Run the migration
runMigration();

