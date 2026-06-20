// Hand-maintained mirror of supabase/schema.sql.

export type GroupStatus = "open" | "active" | "completed";
export type MatchStatus =
  | "scheduled"
  | "awaiting_submissions"
  | "pending_review"
  | "completed";
export type SubmissionSource = "ocr" | "manual" | "mixed";

export type Profile = {
  id: string;
  display_name: string;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  join_code: string;
  admin_id: string;
  timezone: string;
  status: GroupStatus;
  current_round: number;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  seed: number | null;
  eliminated_at: string | null;
  joined_at: string;
};

export type Match = {
  id: string;
  group_id: string;
  round: number;
  ekadashi_date: string;
  player_a: string | null;
  player_b: string | null;
  winner_id: string | null;
  status: MatchStatus;
  created_at: string;
};

export type Submission = {
  id: string;
  match_id: string;
  player_id: string;
  social_min: number;
  games_min: number;
  entertainment_min: number;
  creativity_min: number;
  whatsapp_min: number;
  total_min: number;
  screenshot_path: string | null;
  source: SubmissionSource;
  disputed: boolean;
  dispute_note: string | null;
  submitted_at: string;
};

type WritableSubmission = Omit<Submission, "id" | "total_min" | "submitted_at">;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "display_name">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      groups: {
        Row: Group;
        Insert: Omit<Group, "id" | "created_at" | "status" | "current_round"> & {
          status?: GroupStatus;
          current_round?: number;
        };
        Update: Partial<Group>;
        Relationships: [];
      };
      group_members: {
        Row: GroupMember;
        Insert: Pick<GroupMember, "group_id" | "user_id"> & Partial<GroupMember>;
        Update: Partial<GroupMember>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, "id" | "created_at" | "status" | "winner_id"> & {
          status?: MatchStatus;
          winner_id?: string | null;
        };
        Update: Partial<Match>;
        Relationships: [];
      };
      submissions: {
        Row: Submission;
        Insert: Partial<WritableSubmission> &
          Pick<WritableSubmission, "match_id" | "player_id">;
        Update: Partial<WritableSubmission>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_group_member: {
        Args: { target_group: string };
        Returns: boolean;
      };
    };
    Enums: {
      group_status: GroupStatus;
      match_status: MatchStatus;
      submission_source: SubmissionSource;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
