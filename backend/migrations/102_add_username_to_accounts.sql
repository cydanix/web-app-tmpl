-- Add username field to app_accounts table
ALTER TABLE app_accounts 
ADD COLUMN IF NOT EXISTS username VARCHAR(255);
