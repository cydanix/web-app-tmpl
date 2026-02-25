-- Create user_profiles table (linked to IAM accounts by UUID, no cross-database FK)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY,
    iam_account_id UUID NOT NULL UNIQUE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    username VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_iam_account_id ON user_profiles(iam_account_id);
