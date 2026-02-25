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

export const getOrg = (): Promise<OrgResponse> =>
  api.get("/org", { auth: true });

export const inviteMember = (email: string, role: string): Promise<{ message: string }> =>
  api.post("/org/invite", { email, role }, { auth: true });

export const removeMember = (profileId: string): Promise<{ message: string }> =>
  api.delete(`/org/members/${profileId}`, undefined, { auth: true });

export const updateMemberRole = (profileId: string, role: string): Promise<{ message: string }> =>
  api.put(`/org/members/${profileId}/role`, { role }, { auth: true });
