CREATE TABLE org_invitations (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL UNIQUE,
    role_id UUID NOT NULL,
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    consumed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_org_invitations_code ON org_invitations(code);
CREATE INDEX idx_org_invitations_org_id ON org_invitations(org_id);
