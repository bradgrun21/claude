-- Find Me the Money: schedule payday reminders. Run in Supabase -> SQL Editor AFTER the
-- "reminders" Edge Function is deployed and its secrets are set. Safe to run more than once.
-- Replace PASTE-YOUR-CRON-SECRET with the same text you saved as the CRON_SECRET secret.

-- reminders sent: one per plan, day and kind
create table if not exists public.notify_log (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  kind text,
  sent_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);
alter table public.notify_log enable row level security; -- no policies: only the server can read or write it

-- one of each kind a day (a bill reminder and a 30-Day Challenge nudge can both go out on the same day)
alter table public.notify_log alter column kind set default 'bills';
update public.notify_log set kind = 'bills' where kind is null;
alter table public.notify_log alter column kind set not null;
alter table public.notify_log drop constraint if exists notify_log_pkey;
alter table public.notify_log add primary key (user_id, day, kind);

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- every hour at 5 past; the function itself only sends at each person's chosen local time
select cron.unschedule('fmtm-reminders') where exists (select 1 from cron.job where jobname = 'fmtm-reminders');
select cron.schedule('fmtm-reminders', '5 * * * *', $$
  select net.http_post(
    url := 'https://ktgwaedkaxsrqencglnu.supabase.co/functions/v1/reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'PASTE-YOUR-CRON-SECRET'),
    body := '{}'::jsonb
  );
$$);

-- To pause everything: select cron.unschedule('fmtm-reminders');   (or set REMINDERS_MODE to off)
