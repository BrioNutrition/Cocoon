-- =========================================================
--  Cocoon · base de données Supabase
--  À coller UNE FOIS dans Supabase → SQL Editor → Run.
--  (Peut être relancé sans danger.)
-- =========================================================

-- Foyers -------------------------------------------------
create table if not exists public.cocoon_foyers (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  code text not null default replace(gen_random_uuid()::text,'-',''),
  created_at timestamptz not null default now()
);

-- Membres (qui a accès à quel foyer) ---------------------
create table if not exists public.cocoon_members (
  foyer uuid not null references public.cocoon_foyers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'membre',
  joined_at timestamptz not null default now(),
  primary key (foyer, user_id)
);

-- Données de l'app (tâches, papiers, budget…) ------------
create table if not exists public.cocoon_docs (
  foyer uuid not null references public.cocoon_foyers(id) on delete cascade,
  path text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (foyer, path, id)
);
alter table public.cocoon_docs replica identity full;

-- Est-ce que l'utilisateur connecté fait partie du foyer ?
create or replace function public.cocoon_is_member(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.cocoon_members where foyer = f and user_id = auth.uid());
$$;

-- Sécurité (RLS) -----------------------------------------
alter table public.cocoon_foyers  enable row level security;
alter table public.cocoon_members enable row level security;
alter table public.cocoon_docs    enable row level security;

drop policy if exists "foyer visible par ses membres" on public.cocoon_foyers;
create policy "foyer visible par ses membres" on public.cocoon_foyers
  for select using (public.cocoon_is_member(id));

drop policy if exists "membres visibles par le foyer" on public.cocoon_members;
create policy "membres visibles par le foyer" on public.cocoon_members
  for select using (public.cocoon_is_member(foyer));
drop policy if exists "quitter le foyer" on public.cocoon_members;
create policy "quitter le foyer" on public.cocoon_members
  for delete using (user_id = auth.uid());

-- Tout le foyer lit/écrit les données communes ; l'espace perso
-- (data/users/<id>/…) n'est visible que par son propriétaire.
drop policy if exists "donnees du foyer" on public.cocoon_docs;
create policy "donnees du foyer" on public.cocoon_docs
  for all
  using (public.cocoon_is_member(foyer) and (path not like 'data/users/%' or path like 'data/users/' || auth.uid()::text || '%'))
  with check (public.cocoon_is_member(foyer) and (path not like 'data/users/%' or path like 'data/users/' || auth.uid()::text || '%'));

-- Modifier quelques champs d'un élément sans écraser le reste
create or replace function public.cocoon_merge(f uuid, p text, i text, patch jsonb)
returns void language sql security invoker set search_path = public as $$
  insert into public.cocoon_docs(foyer, path, id, data, updated_at, updated_by)
  values (f, p, i, patch, now(), auth.uid())
  on conflict (foyer, path, id) do update
    set data = public.cocoon_docs.data || excluded.data, updated_at = now(), updated_by = auth.uid();
$$;
grant execute on function public.cocoon_merge(uuid, text, text, jsonb) to authenticated;

-- Créer un foyer (la personne devient admin) -------------
create or replace function public.cocoon_create_foyer()
returns json language plpgsql security definer set search_path = public as $$
declare f public.cocoon_foyers;
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  insert into public.cocoon_foyers(owner) values (auth.uid()) returning * into f;
  insert into public.cocoon_members(foyer, user_id, role) values (f.id, auth.uid(), 'admin');
  return json_build_object('id', f.id, 'code', f.code);
end $$;

-- Rejoindre un foyer avec le lien d'invitation -----------
create or replace function public.cocoon_join_foyer(f uuid, c text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  if not exists(select 1 from public.cocoon_foyers where id = f and code = c) then return false; end if;
  insert into public.cocoon_members(foyer, user_id) values (f, auth.uid()) on conflict do nothing;
  return true;
end $$;

-- Changer le code d'invitation (rend les anciens liens invalides)
create or replace function public.cocoon_new_code(f uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not exists(select 1 from public.cocoon_foyers where id = f and owner = auth.uid()) then raise exception 'réservé au créateur du foyer'; end if;
  update public.cocoon_foyers set code = replace(gen_random_uuid()::text,'-','') where id = f returning code into c;
  return c;
end $$;

grant execute on function public.cocoon_create_foyer() to authenticated;
grant execute on function public.cocoon_join_foyer(uuid, text) to authenticated;
grant execute on function public.cocoon_new_code(uuid) to authenticated;
grant execute on function public.cocoon_is_member(uuid) to authenticated;

-- Temps réel (les modifs d'Emma apparaissent tout de suite)
do $$ begin
  alter publication supabase_realtime add table public.cocoon_docs;
exception when duplicate_object then null; end $$;

-- Fichiers (photos et PDF des papiers) -------------------
insert into storage.buckets (id, name, public)
values ('cocoon', 'cocoon', false)
on conflict (id) do nothing;

drop policy if exists "cocoon fichiers lecture" on storage.objects;
create policy "cocoon fichiers lecture" on storage.objects for select
  using (bucket_id = 'cocoon' and public.cocoon_is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "cocoon fichiers ajout" on storage.objects;
create policy "cocoon fichiers ajout" on storage.objects for insert
  with check (bucket_id = 'cocoon' and public.cocoon_is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "cocoon fichiers suppression" on storage.objects;
create policy "cocoon fichiers suppression" on storage.objects for delete
  using (bucket_id = 'cocoon' and public.cocoon_is_member(((storage.foldername(name))[1])::uuid));

-- =========================================================
--  Calendrier du téléphone (abonnement qui se met à jour seul)
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
