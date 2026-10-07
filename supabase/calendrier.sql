-- =========================================================
--  Cocoon · ajout « calendrier du téléphone »
--  (si tu as déjà lancé schema.sql avant, colle seulement ce fichier)
-- =========================================================
-- =========================================================
create table if not exists public.cocoon_cal (
  foyer uuid not null references public.cocoon_foyers(id) on delete cascade,
  owner text not null,              -- 'foyer' (commun) ou id du compte (perso)
  events jsonb not null default '[]'::jsonb,
  moi text,                         -- id du membre correspondant au compte
  updated_at timestamptz not null default now(),
  primary key (foyer, owner)
);
alter table public.cocoon_cal enable row level security;
drop policy if exists "calendrier du foyer" on public.cocoon_cal;
create policy "calendrier du foyer" on public.cocoon_cal for all
  using (public.cocoon_is_member(foyer) and (owner = 'foyer' or owner = auth.uid()::text))
  with check (public.cocoon_is_member(foyer) and (owner = 'foyer' or owner = auth.uid()::text));

create table if not exists public.cocoon_cal_tokens (
  token text primary key default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  user_id uuid not null references auth.users(id) on delete cascade,
  foyer uuid not null references public.cocoon_foyers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, foyer)
);
alter table public.cocoon_cal_tokens enable row level security;
drop policy if exists "mon lien calendrier" on public.cocoon_cal_tokens;
create policy "mon lien calendrier" on public.cocoon_cal_tokens for select using (user_id = auth.uid());

-- Donne (ou crée) le lien secret de calendrier de la personne connectée
create or replace function public.cocoon_cal_token(f uuid)
returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if not public.cocoon_is_member(f) then raise exception 'pas membre de ce foyer'; end if;
  insert into public.cocoon_cal_tokens(user_id, foyer) values (auth.uid(), f) on conflict (user_id, foyer) do nothing;
  select token into t from public.cocoon_cal_tokens where user_id = auth.uid() and foyer = f;
  return t;
end $$;
grant execute on function public.cocoon_cal_token(uuid) to authenticated;
