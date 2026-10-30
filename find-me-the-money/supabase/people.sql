-- Find Me the Money: people (name, email, email-list choice) and their activity.
-- Paste into Supabase -> SQL Editor -> New query, then Run. Safe to run more than once.
-- Activity is what someone did and when (like "checkin-2" or "lesson-C1"). It never holds amounts,
-- store names or anything else from a budget.

-- One row per account: who they are and whether they want emails from Brad.
create table if not exists public.people (
  user_id uuid primary key references auth.users on delete cascade,
  email text,
  first_name text,
  marketing_opt_in boolean not null default true,
  step int,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.people enable row level security;
drop policy if exists "people own read" on public.people;
drop policy if exists "people own insert" on public.people;
drop policy if exists "people own update" on public.people;
drop policy if exists "people own delete" on public.people;
create policy "people own read"   on public.people for select using (auth.uid() = user_id);
create policy "people own insert" on public.people for insert with check (auth.uid() = user_id);
create policy "people own update" on public.people for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "people own delete" on public.people for delete using (auth.uid() = user_id);

-- What people do in the app. The app can add its own events; it can't read anyone's.
create table if not exists public.activity (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  event text not null check (char_length(event) between 1 and 60),
  at timestamptz not null default now()
);
create index if not exists activity_user_at on public.activity (user_id, at desc);
alter table public.activity enable row level security;
drop policy if exists "activity own insert" on public.activity;
drop policy if exists "activity own delete" on public.activity;
create policy "activity own insert" on public.activity for insert with check (auth.uid() = user_id);
create policy "activity own delete" on public.activity for delete using (auth.uid() = user_id);

-- For Brad only: one row per person. It lives in its own schema, which the app can't reach.
-- See it in Table Editor (pick the "admin" schema at the top) or with: select * from admin.people_overview;
-- Weeks count when all 3 weekly steps are done (categorize, update balances, read the recap); the app sends
-- "week-done" once for each. Weeks run Sunday to Saturday, Arizona time.
create schema if not exists admin;
revoke all on schema admin from anon, authenticated;
drop view if exists admin.people_overview;
create view admin.people_overview as
with now_az as (
  select (now() at time zone 'America/Phoenix')::date as d
), this_week as (
  select d - extract(dow from d)::int as ws from now_az
), weeks as (
  select distinct user_id, d - extract(dow from d)::int as ws
  from (select user_id, (at at time zone 'America/Phoenix')::date as d from public.activity where event = 'week-done') x
), runs as (
  select user_id, count(*) as n, max(ws) as last_ws
  from (select user_id, ws, ws - (7 * row_number() over (partition by user_id order by ws))::int as g from weeks) i
  group by user_id, g
), streaks as (
  select r.user_id, sum(r.n) as weeks_done, max(r.n) as best_week_streak,
    max(case when r.last_ws >= t.ws - 7 then r.n else 0 end) as week_streak
  from runs r cross join this_week t group by r.user_id
)
select
  p.first_name,
  coalesce(p.email, u.email) as email,
  p.marketing_opt_in as on_email_list,
  p.step,
  p.created_at::date as joined,
  p.last_seen,
  (now()::date - p.last_seen::date) as days_since_seen,
  coalesce(s.week_streak, 0) as week_streak,
  coalesce(s.weeks_done, 0) as weeks_done,
  coalesce(s.best_week_streak, 0) as best_week_streak,
  count(a.*) filter (where a.event like 'lesson-%') as lessons_done,
  count(a.*) filter (where a.event like 'quiz-pass-%') as quizzes_passed,
  count(a.*) filter (where a.event = 'scan-save') as weeks_scanned,
  count(a.*) filter (where a.event = 'spend-add') as purchases_by_hand,
  count(a.*) filter (where a.event = 'challenge-start') as challenges_started,
  bool_or(a.event = 'reminders-on') as reminders_on,
  max(a.at) as last_activity
from public.people p
left join auth.users u on u.id = p.user_id
left join streaks s on s.user_id = p.user_id
left join public.activity a on a.user_id = p.user_id
group by p.user_id, p.first_name, p.email, u.email, p.marketing_opt_in, p.step, p.created_at, p.last_seen, s.week_streak, s.weeks_done, s.best_week_streak
order by coalesce(s.week_streak, 0) desc, p.last_seen desc;

-- For your email tool: only people who said yes.
create or replace view admin.email_list as
select first_name, email, created_at::date as joined from public.people where marketing_opt_in and email is not null order by created_at;
