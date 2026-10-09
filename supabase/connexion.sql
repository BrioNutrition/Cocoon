-- =========================================================
--  Cocoon · message « aucun compte à cette adresse »
--  À coller une fois dans Supabase → SQL Editor → Run (peut être relancé sans danger).
--  Permet à l'écran de connexion de dire si l'e-mail n'a pas de compte
--  ou si c'est le mot de passe qui est faux. Ne renvoie que vrai / faux.
-- =========================================================
create or replace function public.cocoon_email_exists(e text)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists(select 1 from auth.users where lower(email) = lower(trim(e)));
$$;
revoke all on function public.cocoon_email_exists(text) from public;
grant execute on function public.cocoon_email_exists(text) to anon, authenticated;
