-- =========================================================
--  Cocoon · notifications sur le téléphone
--  À coller une fois dans Supabase → SQL Editor → Run.
--  (Supabase doit déjà avoir schema.sql et calendrier.sql.)
-- =========================================================

-- 1. Les téléphones abonnés (un par appareil)
create table if not exists public.cocoon_push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  foyer uuid not null references public.cocoon_foyers(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  tz text not null default 'Europe/Paris',
  ua text,
  created_at timestamptz not null default now()
);
create index if not exists cocoon_push_subs_user on public.cocoon_push_subs(user_id);
create index if not exists cocoon_push_subs_foyer on public.cocoon_push_subs(foyer);
alter table public.cocoon_push_subs enable row level security;
drop policy if exists "mes appareils" on public.cocoon_push_subs;
create policy "mes appareils" on public.cocoon_push_subs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.cocoon_is_member(foyer));

-- Enregistre ce téléphone pour la personne connectée (le reprend s'il était à quelqu'un d'autre)
create or replace function public.cocoon_push_claim(e text, k text, a text, f uuid, z text, u text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.cocoon_is_member(f) then raise exception 'pas membre de ce foyer'; end if;
  delete from public.cocoon_push_subs where endpoint = e;
  insert into public.cocoon_push_subs(endpoint, user_id, foyer, p256dh, auth, tz, ua)
    values (e, auth.uid(), f, k, a, coalesce(nullif(z, ''), 'Europe/Paris'), left(u, 160));
end $$;
grant execute on function public.cocoon_push_claim(text, text, text, uuid, text, text) to authenticated;

-- 2. Les réglages de chacun (rappel du matin, courses, tâches confiées, silence la nuit)
create table if not exists public.cocoon_push_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.cocoon_push_prefs enable row level security;
drop policy if exists "mes réglages" on public.cocoon_push_prefs;
create policy "mes réglages" on public.cocoon_push_prefs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. Journal des envois (pour ne jamais envoyer deux fois la même chose)
create table if not exists public.cocoon_push_log (
  user_id uuid not null,
  kind text not null,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, key)
);
alter table public.cocoon_push_log enable row level security;  -- aucune règle : seule la fonction y accède

-- 4. Clé interne pour que seule la tâche planifiée puisse lancer les rappels du matin
create table if not exists public.cocoon_push_cfg (k text primary key, v text not null);
alter table public.cocoon_push_cfg enable row level security;  -- aucune règle : invisible depuis l'app
insert into public.cocoon_push_cfg(k, v)
  values ('cron', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
  on conflict (k) do nothing;

-- 5. Toutes les 15 minutes, Supabase appelle la fonction « cocoon-push »
--    (elle n'envoie le rappel du matin qu'à l'heure choisie par chacun, une fois par jour)
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('cocoon-push') where exists (select 1 from cron.job where jobname = 'cocoon-push');
select cron.schedule('cocoon-push', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://wzyycxapukzwbhbawkqo.supabase.co/functions/v1/cocoon-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('mode', 'tick', 'key', (select v from public.cocoon_push_cfg where k = 'cron'))
  );
$$);
