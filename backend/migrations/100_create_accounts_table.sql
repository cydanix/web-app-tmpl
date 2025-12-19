-- Create accounts table linked to IAM accounts
-- Note: This assumes nano-iam's accounts table exists in the same database
CREATE TABLE IF NOT EXISTS app_accounts (
    id UUID PRIMARY KEY,
    iam_account_id UUID NOT NULL UNIQUE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (iam_account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_accounts_iam_account_id ON app_accounts(iam_account_id);

