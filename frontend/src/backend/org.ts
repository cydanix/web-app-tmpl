import { api } from "./api-client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface OrgMemberInfo {
  profile_id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  role: string;
  joined_at: string;
}

export interface OrgResponse {
  org: Organization;
  members: OrgMemberInfo[];
}

export interface OrgInvitation {
  id: string;
  org_id: string;
  code: string;
  role_id: string;
  created_by: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_by: string | null;
  created_at: string;
}

export interface OrgInvitationInfo {
  code: string;
  org_name: string;
  role: string;
  expires_at: string;
}

export const getOrg = (): Promise<OrgResponse> =>
  api.get("/org", { auth: true });

export const createInvitation = (role: string): Promise<{ id: string; code: string; expires_at: string }> =>
  api.post("/org/invitations", { role }, { auth: true });

export const listInvitations = (): Promise<OrgInvitation[]> =>
  api.get("/org/invitations", { auth: true });

export const revokeInvitation = (id: string): Promise<{ message: string }> =>
  api.delete(`/org/invitations/${id}`, undefined, { auth: true });

export const getInvitationInfo = (code: string): Promise<OrgInvitationInfo> =>
  api.get(`/org/invitations/${code}/info`);

export const removeMember = (profileId: string): Promise<{ message: string }> =>
  api.delete(`/org/members/${profileId}`, undefined, { auth: true });

export const updateMemberRole = (profileId: string, role: string): Promise<{ message: string }> =>
  api.put(`/org/members/${profileId}/role`, { role }, { auth: true });
