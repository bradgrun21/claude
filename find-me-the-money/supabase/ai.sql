-- Find Me the Money: AI snaps and chat (limits, costs, the community unlock).
-- Paste into Supabase -> SQL Editor -> New query, then Run. Safe to run more than once.
-- Every table here has row level security on and NO policies, so only the server (the ai and
-- community-hook Edge Functions, with the service role) can read or write them. Nothing here holds a
-- photo, a chat message, an amount or a store name: only emails, counts and costs.

-- who has extra snaps: joined the free community, or a paid member (paid_until runs 35 days from the last
-- Zapier hook or monthly import, so a cancelled member simply runs out)
create table if not exists public.ai_access (
  email text primary key,               -- lowercased
  community boolean not null default false,
  paid_until date,
  source text,                          -- 'zapier-free', 'zapier-paid', 'import'
  updated_at timestamptz not null default now()
);
alter table public.ai_access enable row level security;

-- this month's count per household (the plan owner, so a couple shares one count)
create table if not exists public.ai_usage (
  owner_id uuid not null references auth.users on delete cascade,
  month text not null,                  -- 'YYYY-MM' in the plan's time zone
  snaps int not null default 0,
  chats int not null default 0,
  cost_usd numeric(10, 4) not null default 0,
  primary key (owner_id, month)
);
alter table public.ai_usage enable row level security;

-- the whole app's AI spend this month: the kill switch (AI_MONTHLY_CAP_USD) and its two alert emails
create table if not exists public.ai_spend (
  month text primary key,               -- 'YYYY-MM' (UTC)
  cost_usd numeric(10, 4) not null default 0,
  alerted_80 boolean not null default false,
  alerted_100 boolean not null default false
);
alter table public.ai_spend enable row level security;

-- speed limits (per account per minute) and probing (rejected outputs per account per day; 10+ pauses AI for 24 hours)
create table if not exists public.ai_minute (
  owner_id uuid not null references auth.users on delete cascade,
  kind text not null,
  minute timestamptz not null,
  n int not null default 0,
  primary key (owner_id, kind, minute)
);
alter table public.ai_minute enable row level security;
create table if not exists public.ai_flags (
  owner_id uuid not null references auth.users on delete cascade,
  day date not null,
  rejects int not null default 0,
  paused_until timestamptz,
  primary key (owner_id, day)
);
alter table public.ai_flags enable row level security;

-- "Joined the community with a different email?": a second email that also unlocks snaps
alter table public.people add column if not exists alt_email text;

-- count one snap or chat message, atomically, so two quick taps can't both slip past the limit.
-- lim null = no monthly limit (paid). per_minute caps bursts. Returns { allowed, used, remaining, reason }.
create or replace function public.use_ai(owner uuid, kind text, lim int, mon text, per_minute int)
returns json language plpgsql security definer set search_path = public as $$
declare used int; burst int;
begin
  insert into ai_minute (owner_id, kind, minute, n) values (owner, kind, date_trunc('minute', now()), 1)
    on conflict (owner_id, kind, minute) do update set n = ai_minute.n + 1 returning n into burst;
  delete from ai_minute where minute < now() - interval '10 minutes';
  if per_minute is not null and burst > per_minute then
    return json_build_object('allowed', false, 'reason', 'speed');
  end if;
  insert into ai_usage (owner_id, month) values (owner, mon) on conflict do nothing;
  if kind = 'snap' then
    update ai_usage set snaps = snaps + 1 where owner_id = owner and month = mon and (lim is null or snaps < lim) returning snaps into used;
  else
    update ai_usage set chats = chats + 1 where owner_id = owner and month = mon and (lim is null or chats < lim) returning chats into used;
  end if;
  if used is null then
    select case when kind = 'snap' then snaps else chats end into used from ai_usage where owner_id = owner and month = mon;
    return json_build_object('allowed', false, 'reason', 'limit', 'used', used, 'remaining', 0);
  end if;
  return json_build_object('allowed', true, 'used', used, 'remaining', case when lim is null then null else greatest(lim - used, 0) end);
end $$;

-- give a snap or chat back when the AI call itself failed (nobody pays for our error)
create or replace function public.refund_ai(owner uuid, kind text, mon text)
returns void language sql security definer set search_path = public as $$
  update ai_usage set snaps = greatest(snaps - case when kind = 'snap' then 1 else 0 end, 0),
                      chats = greatest(chats - case when kind = 'chat' then 1 else 0 end, 0)
  where owner_id = owner and month = mon;
$$;

-- add what one call cost, to the household and to the app's month; returns the app's month total
create or replace function public.add_ai_cost(owner uuid, mon text, spend_mon text, cost numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare total numeric;
begin
  update ai_usage set cost_usd = cost_usd + cost where owner_id = owner and month = mon;
  insert into ai_spend (month, cost_usd) values (spend_mon, cost)
    on conflict (month) do update set cost_usd = ai_spend.cost_usd + cost returning cost_usd into total;
  return total;
end $$;

-- one rejected AI output (counts only, never the text); 10 in a day pauses that account's AI for 24 hours
create or replace function public.ai_reject(owner uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into ai_flags (owner_id, day, rejects) values (owner, current_date, 1)
    on conflict (owner_id, day) do update set rejects = ai_flags.rejects + 1 returning rejects into n;
  if n >= 10 then update ai_flags set paused_until = now() + interval '24 hours' where owner_id = owner and day = current_date and paused_until is null; end if;
  return n;
end $$;

-- only the server calls these
revoke all on function public.use_ai(uuid, text, int, text, int) from public, anon, authenticated;
revoke all on function public.refund_ai(uuid, text, text) from public, anon, authenticated;
revoke all on function public.add_ai_cost(uuid, text, text, numeric) from public, anon, authenticated;
revoke all on function public.ai_reject(uuid) from public, anon, authenticated;
