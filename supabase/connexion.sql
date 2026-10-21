-- =========================================================
--  Cocoon · écran de connexion
--  À coller une fois dans Supabase → SQL Editor → Run (peut être relancé sans danger).
--  Permet à l'écran de connexion de dire « Aucun compte avec cette adresse : crée ton compte »
--  au lieu de « E-mail ou mot de passe incorrect » quand l'adresse n'est pas inscrite.
--  Ne renvoie que vrai/faux, jamais d'autre information sur le compte.
-- =========================================================

create or replace function public.cocoon_email_exists(e text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(e)));
$$;
revoke all on function public.cocoon_email_exists(text) from public;
grant execute on function public.cocoon_email_exists(text) to anon, authenticated;
