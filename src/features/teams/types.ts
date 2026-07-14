export interface TeamLead {
  first_name: string | null;
  last_name: string | null;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  lead_id: string | null;
  lead?: TeamLead | null;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
}

export interface TeamMember {
  team_id: number;
  user_id: string;
  added_at: string;
  profile?: TeamMemberProfile;
}
