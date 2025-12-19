-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES app_accounts(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on account_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);

-- Create index on read status for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(account_id, read);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(account_id, created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();
