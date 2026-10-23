-- Find Me the Money: database setup for accounts and shared budgets.
-- Paste into Supabase -> SQL Editor -> New query, then Run. Safe to run more than once.

-- One saved plan per account (owner).
create table if not exists public.plans (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- A spouse who shares the owner's plan. One shared plan per person.
create table if not exists public.plan_members (
  owner_id uuid not null references auth.users on delete cascade,
  member_id uuid not null references auth.users on delete cascade,
  owner_email text,
  member_email text,
  created_at timestamptz not null default now(),
  primary key (owner_id, member_id)
);
create unique index if not exists plan_members_one_plan on public.plan_members (member_id);

-- Invite codes: used once, good for 7 days.
create table if not exists public.plan_invites (
  code text primary key,
  owner_id uuid not null references auth.users on delete cascade,
  owner_email text default (auth.jwt() ->> 'email'),
  expires_at timestamptz not null default now() + interval '7 days'
);

alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_invites enable row level security;

-- May the signed-in person use this owner's plan? (their own, or one shared with them)
create or replace function public.can_use_plan(p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = p_owner
      or exists (select 1 from plan_members m where m.owner_id = p_owner and m.member_id = auth.uid());
$$;

drop policy if exists "own plan read" on public.plans;
drop policy if exists "own plan insert" on public.plans;
drop policy if exists "own plan update" on public.plans;
drop policy if exists "own plan delete" on public.plans;
drop policy if exists "plan read" on public.plans;
drop policy if exists "plan insert" on public.plans;
drop policy if exists "plan update" on public.plans;
drop policy if exists "plan delete" on public.plans;
create policy "plan read"   on public.plans for select using (public.can_use_plan(user_id));
create policy "plan insert" on public.plans for insert with check (public.can_use_plan(user_id));
create policy "plan update" on public.plans for update using (public.can_use_plan(user_id)) with check (public.can_use_plan(user_id));
create policy "plan delete" on public.plans for delete using (auth.uid() = user_id);

-- Both people can see and end a share; joining only happens through join_plan below.
drop policy if exists "members read" on public.plan_members;
drop policy if exists "members leave" on public.plan_members;
create policy "members read"  on public.plan_members for select using (auth.uid() in (owner_id, member_id));
create policy "members leave" on public.plan_members for delete using (auth.uid() in (owner_id, member_id));

drop policy if exists "invites own" on public.plan_invites;
create policy "invites own" on public.plan_invites for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Turns an invite code into a shared plan for the signed-in spouse.
create or replace function public.join_plan(invite text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv plan_invites;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into inv from plan_invites where code = upper(invite) and expires_at > now();
  if inv.code is null then raise exception 'invite not found'; end if;
  if inv.owner_id = auth.uid() then raise exception 'own invite'; end if;
  delete from plan_members where member_id = auth.uid();
  insert into plan_members (owner_id, member_id, owner_email, member_email)
    values (inv.owner_id, auth.uid(), inv.owner_email, auth.jwt() ->> 'email');
  delete from plan_invites where code = inv.code;
  return inv.owner_id;
end $$;

revoke execute on function public.join_plan(text) from public, anon;
grant execute on function public.join_plan(text) to authenticated;
