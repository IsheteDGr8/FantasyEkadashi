// Hand-maintained mirror of supabase/schema.sql. Regenerate via
// `supabase gen types typescript` if you wire up the Supabase CLI later.

export type LeagueStatus = "open" | "active" | "completed";
export type MatchStatus =
  | "scheduled"
  | "awaiting_submissions"
  | "pending_review"
  | "completed"
  | "walkover";
export type SubmissionSource = "ocr" | "manual" | "mixed";

export type Profile = {
  id: string;
  display_name: string;
  timezone: string;
  created_at: string;
};

export type League = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  timezone: string;
  status: LeagueStatus;
  current_round: number;
  created_at: string;
};

export type LeagueMember = {
  league_id: string;
  user_id: string;
  seed: number | null;
  eliminated_at: string | null;
  joined_at: string;
};

export type Match = {
  id: string;
  league_id: string;
  round: number;
  ekadashi_date: string; // ISO date (YYYY-MM-DD)
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
  screen_time_minutes: number;
  screenshot_path: string | null;
  source: SubmissionSource;
  disputed: boolean;
  dispute_note: string | null;
  submitted_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "display_name">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      leagues: {
        Row: League;
        Insert: Omit<League, "id" | "created_at" | "status" | "current_round"> & {
          status?: LeagueStatus;
          current_round?: number;
        };
        Update: Partial<League>;
        Relationships: [];
      };
      league_members: {
        Row: LeagueMember;
        Insert: Pick<LeagueMember, "league_id" | "user_id"> &
          Partial<LeagueMember>;
        Update: Partial<LeagueMember>;
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
        Insert: Omit<
          Submission,
          "id" | "submitted_at" | "disputed" | "dispute_note" | "screenshot_path"
        > & {
          disputed?: boolean;
          dispute_note?: string | null;
          screenshot_path?: string | null;
        };
        Update: Partial<Submission>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_league_member: {
        Args: { target_league: string };
        Returns: boolean;
      };
    };
    Enums: {
      league_status: LeagueStatus;
      match_status: MatchStatus;
      submission_source: SubmissionSource;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
