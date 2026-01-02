-- Database Migration Script for Virtual Portfolio Feature
-- Run this script in your MySQL database to add support for virtual portfolio tracking
-- Note: If columns already exist, you may see errors. This is normal and can be ignored.

-- Step 1: Add virtual_balance column to users table
-- This stores the virtual balance for simulated trading
-- If the column already exists, you'll see an error - that's okay, just continue
ALTER TABLE users 
ADD COLUMN virtual_balance DECIMAL(15, 2) DEFAULT 100000.00;

-- Step 2: Initialize virtual_balance for existing users
UPDATE users 
SET virtual_balance = 100000.00 
WHERE virtual_balance IS NULL;

-- Step 3: Add is_virtual column to stock_transactions table
-- This flag distinguishes virtual trades from real trades
-- 0 = real trade, 1 = virtual trade
-- If the column already exists, you'll see an error - that's okay, just continue
ALTER TABLE stock_transactions 
ADD COLUMN is_virtual BOOLEAN DEFAULT FALSE;

-- Step 4: Set default value for existing transactions (all existing transactions are real)
UPDATE stock_transactions 
SET is_virtual = FALSE 
WHERE is_virtual IS NULL;

-- Step 5: Create index for better query performance
-- If the index already exists, you'll see an error - that's okay
CREATE INDEX idx_virtual_transactions 
ON stock_transactions(email, is_virtual, is_sold);

-- Step 6: Verify the changes
SELECT 
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM users WHERE virtual_balance IS NOT NULL) as users_with_virtual_balance,
    (SELECT COUNT(*) FROM stock_transactions WHERE is_virtual IS NOT NULL) as transactions_with_flag;

