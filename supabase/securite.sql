-- =========================================================
--  Cocoon · protection côté serveur
--  À coller une fois dans Supabase → SQL Editor → Run (peut être relancé sans danger).
--  Même si quelqu'un contourne l'app, la base refuse :
--   - de modifier le profil d'un membre qui a son propre compte (sauf lui-même) ;
--   - de se donner le rôle d'admin ;
--   - de rattacher le compte de quelqu'un d'autre à un profil ;
--   - de supprimer un profil sans en avoir le droit ;
--   - de se faire passer pour un autre (« modifié par »).
--  Le créateur du foyer peut retirer n'importe quel membre du foyer.
-- =========================================================

-- Le créateur du foyer
create or replace function public.cocoon_is_owner(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.cocoon_foyers where id = f and owner = auth.uid());
$$;

-- Un admin du foyer : le créateur, ou un membre dont le profil porte le rôle « admin »
create or replace function public.cocoon_is_admin(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.cocoon_is_owner(f)
      or exists(select 1 from public.cocoon_members where foyer = f and user_id = auth.uid() and role = 'admin')
      or exists(select 1 from public.cocoon_docs where foyer = f and path = 'membres'
                 and data->>'uid' = auth.uid()::text and data->>'role' = 'admin');
$$;

-- Le foyer a-t-il déjà un admin ? (le tout premier profil peut le devenir)
create or replace function public.cocoon_has_admin(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.cocoon_docs where foyer = f and path = 'membres' and data->>'role' = 'admin');
$$;

create or replace function public.cocoon_guard_docs()
returns trigger language plpgsql set search_path = public as $$
declare
  me uuid := auth.uid();
  f uuid := coalesce(new.foyer, old.foyer);
  p text := coalesce(new.path, old.path);
  ou text; nu text; orole text; nrole text;
begin
  if me is null then return coalesce(new, old); end if;          -- fonctions du serveur (clé secrète)
  if tg_op <> 'DELETE' then new.updated_by := me; end if;         -- on ne peut pas signer à la place d'un autre

  if p = 'membres' then
    ou := case when tg_op <> 'INSERT' then old.data->>'uid' end;
    nu := case when tg_op <> 'DELETE' then new.data->>'uid' end;
    orole := coalesce(case when tg_op <> 'INSERT' then old.data->>'role' end, 'membre');
    nrole := coalesce(case when tg_op <> 'DELETE' then new.data->>'role' end, 'membre');

    if tg_op = 'DELETE' then
      if ou = me::text or public.cocoon_is_owner(f) or (ou is null and public.cocoon_is_admin(f)) then return old; end if;
      raise exception 'Seul le créateur du foyer peut retirer ce membre.' using errcode = '42501';
    end if;

    -- Le profil d'un membre qui a son compte n'appartient qu'à lui
    if tg_op = 'UPDATE' and ou is not null and ou <> me::text then
      raise exception 'Ce profil appartient à un autre membre : lui seul peut le modifier.' using errcode = '42501';
    end if;
    -- On ne rattache que son propre compte
    if nu is not null and nu <> me::text and nu is distinct from ou then
      raise exception 'Impossible de rattacher le compte de quelqu''un d''autre.' using errcode = '42501';
    end if;
    -- Réclamer un profil sans compte : seulement une invitation (pas un animal ni un enfant géré par les admins),
    -- et si l'invitation porte un e-mail, ce doit être le sien
    if tg_op = 'UPDATE' and ou is null and nu is not null then
      if coalesce(old.data->>'type', 'adulte') = 'animal'
         or (coalesce(old.data->>'type', 'adulte') = 'enfant' and coalesce(old.data->>'invite', 'false') <> 'true') then
        raise exception 'Ce profil est géré par les admins du foyer.' using errcode = '42501';
      end if;
      if nullif(old.data->>'email', '') is not null
         and lower(old.data->>'email') <> lower(coalesce(auth.jwt()->>'email', '')) then
        raise exception 'Cette invitation est destinée à une autre adresse e-mail.' using errcode = '42501';
      end if;
    end if;
    -- Le rôle d'admin se donne seulement par un admin (ou au tout premier profil du foyer)
    if nrole = 'admin' and nrole is distinct from orole
       and not public.cocoon_is_admin(f) and public.cocoon_has_admin(f) then
      raise exception 'Seul un admin peut nommer un admin.' using errcode = '42501';
    end if;
    return new;
  end if;

  if p = 'profils' then
    if tg_op = 'DELETE' then
      if old.id = me::text or public.cocoon_is_owner(f) then return old; end if;
      raise exception 'Seul le créateur du foyer peut retirer ce membre.' using errcode = '42501';
    end if;
    if new.id <> me::text then raise exception 'Ce profil appartient à un autre membre.' using errcode = '42501'; end if;
    return new;
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists cocoon_guard_docs on public.cocoon_docs;
create trigger cocoon_guard_docs before insert or update or delete on public.cocoon_docs
  for each row execute function public.cocoon_guard_docs();

-- Le créateur retire un membre du foyer : accès coupé, notifications et espace perso supprimés
create or replace function public.cocoon_remove_member(f uuid, u uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.cocoon_is_owner(f) then raise exception 'réservé au créateur du foyer'; end if;
  if u = auth.uid() then raise exception 'le créateur ne peut pas se retirer lui-même'; end if;
  delete from public.cocoon_members where foyer = f and user_id = u;
  delete from public.cocoon_docs where foyer = f and (path like 'data/users/' || u::text || '%' or (path = 'profils' and id = u::text));
  delete from public.cocoon_cal where foyer = f and owner = u::text;
  delete from public.cocoon_cal_tokens where foyer = f and user_id = u;
  if to_regclass('public.cocoon_push_subs') is not null then
    execute 'delete from public.cocoon_push_subs where foyer = $1 and user_id = $2' using f, u;
  end if;
end $$;
grant execute on function public.cocoon_remove_member(uuid, uuid) to authenticated;
grant execute on function public.cocoon_is_owner(uuid) to authenticated;
grant execute on function public.cocoon_is_admin(uuid) to authenticated;
