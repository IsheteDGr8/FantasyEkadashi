-- ============================================================================
-- Fantasy Ekadashi — database schema (v2)
-- ============================================================================
-- Run this entire file once in the Supabase SQL editor on a fresh project.
-- Creates tables, RLS policies, the screenshots storage bucket, and the
-- trigger that auto-creates a profile when a user signs up.
--
-- Auth model: phone + password. We never send SMS (not free). The app maps a
-- phone number to a synthetic email (<digits>@fe.local) and uses Supabase's
-- free email/password auth under the hood. The phone is the login; the
-- display name is what other players see.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- CLEAN SLATE
-- Drops any objects from a previous version so this file produces a guaranteed
-- fresh schema. This deletes app data (NOT auth users). On a brand-new Supabase
-- project these are harmless no-ops. Remove this block if you ever want to keep
-- existing data.
-- ----------------------------------------------------------------------------
drop table if exists public.submissions cascade;
drop table if exists public.matches cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
-- legacy tables from the previous (email magic-link) version, if present:
drop table if exists public.league_members cascade;
drop table if exists public.leagues cascade;
drop table if exists public.profiles cascade;

drop type if exists public.group_status cascade;
drop type if exists public.match_status cascade;
drop type if exists public.submission_source cascade;
drop type if exists public.league_status cascade;

-- ----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    phone        text,                         -- private, never shown publicly
    is_admin     boolean not null default false,
    created_at   timestamptz not null default now()
);

-- Create a profile row automatically on signup, pulling name/phone from the
-- user metadata the sign-up server action sets.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name, phone)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'display_name', 'Player'),
        new.raw_user_meta_data ->> 'phone'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- groups (a league for one circle of friends)
-- ----------------------------------------------------------------------------
create type group_status as enum ('open', 'active', 'completed');

create table if not exists public.groups (
    id            uuid primary key default gen_random_uuid(),
    name          text not null,
    join_code     text not null unique,
    admin_id      uuid not null references public.profiles(id) on delete cascade,
    timezone      text not null default 'Asia/Kolkata',
    status        group_status not null default 'open',
    current_round int not null default 0,
    created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- group_members
-- ----------------------------------------------------------------------------
create table if not exists public.group_members (
    group_id      uuid not null references public.groups(id) on delete cascade,
    user_id       uuid not null references public.profiles(id) on delete cascade,
    seed          int,
    eliminated_at timestamptz,
    joined_at     timestamptz not null default now(),
    primary key (group_id, user_id)
);

create index if not exists idx_members_user on public.group_members(user_id);

-- ----------------------------------------------------------------------------
-- matches
-- ----------------------------------------------------------------------------
create type match_status as enum (
    'scheduled',
    'awaiting_submissions',
    'pending_review',
    'completed'
);

create table if not exists public.matches (
    id             uuid primary key default gen_random_uuid(),
    group_id       uuid not null references public.groups(id) on delete cascade,
    round          int not null,
    ekadashi_date  date not null,
    player_a       uuid references public.profiles(id) on delete set null,
    player_b       uuid references public.profiles(id) on delete set null, -- null = bye
    winner_id      uuid references public.profiles(id) on delete set null,
    status         match_status not null default 'scheduled',
    created_at     timestamptz not null default now()
);

create index if not exists idx_matches_group_round on public.matches(group_id, round);
create index if not exists idx_matches_players on public.matches(player_a, player_b);

-- ----------------------------------------------------------------------------
-- submissions (per player, per match) — competed categories
--   Score = (Social - WhatsApp) + Games + Entertainment + Creativity.
--   Messages and FaceTime are not in these categories, so they're excluded
--   automatically. WhatsApp lives inside iOS "Social", so we subtract it.
-- ----------------------------------------------------------------------------
create type submission_source as enum ('ocr', 'manual', 'mixed');

create table if not exists public.submissions (
    id                  uuid primary key default gen_random_uuid(),
    match_id            uuid not null references public.matches(id) on delete cascade,
    player_id           uuid not null references public.profiles(id) on delete cascade,
    social_min          int not null default 0 check (social_min between 0 and 1440),
    games_min           int not null default 0 check (games_min between 0 and 1440),
    entertainment_min   int not null default 0 check (entertainment_min between 0 and 1440),
    creativity_min      int not null default 0 check (creativity_min between 0 and 1440),
    whatsapp_min        int not null default 0 check (whatsapp_min between 0 and 1440),
    total_min           int generated always as (
                            greatest(social_min - whatsapp_min, 0)
                            + games_min + entertainment_min + creativity_min
                        ) stored,
    screenshot_path     text,
    source              submission_source not null default 'manual',
    disputed            boolean not null default false,
    dispute_note        text,
    submitted_at        timestamptz not null default now(),
    unique (match_id, player_id)
);

create index if not exists idx_subs_match on public.submissions(match_id);

-- ============================================================================
-- Row-level security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.matches        enable row level security;
alter table public.submissions    enable row level security;

-- Is the current user a member of this group? (security definer avoids
-- recursive-RLS evaluation against group_members.)
create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.group_members
        where group_id = target_group and user_id = auth.uid()
    );
$$;

-- profiles --------------------------------------------------------------------
drop policy if exists "read own or co-member profiles" on public.profiles;
create policy "read own or co-member profiles"
    on public.profiles for select
    using (
        id = auth.uid()
        or exists (
            select 1
            from public.group_members m1
            join public.group_members m2 on m1.group_id = m2.group_id
            where m1.user_id = auth.uid() and m2.user_id = profiles.id
        )
    );

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());

-- groups ----------------------------------------------------------------------
drop policy if exists "members or admin read group" on public.groups;
create policy "members or admin read group"
    on public.groups for select
    using (admin_id = auth.uid() or public.is_group_member(id));

-- (group create/update/start handled server-side via service role)

-- group_members ---------------------------------------------------------------
drop policy if exists "read members of your groups" on public.group_members;
create policy "read members of your groups"
    on public.group_members for select
    using (user_id = auth.uid() or public.is_group_member(group_id));

-- matches ---------------------------------------------------------------------
drop policy if exists "read matches in your groups" on public.matches;
create policy "read matches in your groups"
    on public.matches for select
    using (public.is_group_member(group_id));

-- submissions -----------------------------------------------------------------
drop policy if exists "read submissions in your groups" on public.submissions;
create policy "read submissions in your groups"
    on public.submissions for select
    using (
        exists (
            select 1 from public.matches
            where id = submissions.match_id
            and public.is_group_member(matches.group_id)
        )
    );

drop policy if exists "insert own submission" on public.submissions;
create policy "insert own submission"
    on public.submissions for insert
    with check (
        player_id = auth.uid()
        and exists (
            select 1 from public.matches
            where id = match_id
            and (player_a = auth.uid() or player_b = auth.uid())
            and status in ('scheduled', 'awaiting_submissions')
        )
    );

drop policy if exists "update own submission" on public.submissions;
create policy "update own submission"
    on public.submissions for update
    using (player_id = auth.uid())
    with check (player_id = auth.uid());

-- ============================================================================
-- Storage bucket for screenshots (public read; per-user upload folders)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

drop policy if exists "upload to own folder" on storage.objects;
create policy "upload to own folder"
    on storage.objects for insert
    with check (
        bucket_id = 'screenshots'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists "public read screenshots" on storage.objects;
create policy "public read screenshots"
    on storage.objects for select
    using (bucket_id = 'screenshots');

drop policy if exists "delete own screenshots" on storage.objects;
create policy "delete own screenshots"
    on storage.objects for delete
    using (
        bucket_id = 'screenshots'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
