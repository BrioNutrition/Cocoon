-- Double authentification obligatoire (code d'une app : Mots de passe sur iPhone, Google Authenticator…)
-- À lancer dans Supabase › SQL Editor, APRÈS avoir mis en ligne la version de l'app qui demande le code.
-- Effet : une session sans le 2e facteur (aal1) ne peut plus rien lire ni écrire. L'app demande le code
-- (ou sa configuration) juste après la connexion ; la configuration elle-même passe par l'API d'auth,
-- elle n'est donc pas bloquée par ces règles. Les fonctions Edge en service-role ne sont pas concernées.
-- Pré-requis : Authentication › Multi-Factor › TOTP activé (c'est le réglage par défaut).
-- Pour réinitialiser le code d'un membre qui a perdu son téléphone : Authentication › Users › (le membre)
-- › Multi-Factor › supprimer le facteur. Il le reconfigurera à sa prochaine connexion.

do $$
declare t text;
begin
  foreach t in array array['cocoon_foyers','cocoon_members','cocoon_docs','cocoon_cal','cocoon_cal_tokens','cocoon_push_subs','cocoon_push_prefs'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "double authentification" on public.%I', t);
      execute format('create policy "double authentification" on public.%I as restrictive for all to authenticated
                      using ((select auth.jwt() ->> ''aal'') = ''aal2'') with check ((select auth.jwt() ->> ''aal'') = ''aal2'')', t);
    end if;
  end loop;
end $$;

-- Fichiers du foyer (papiers, photos)
drop policy if exists "cocoon double authentification" on storage.objects;
create policy "cocoon double authentification" on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'cocoon' or (select auth.jwt() ->> 'aal') = 'aal2')
  with check (bucket_id <> 'cocoon' or (select auth.jwt() ->> 'aal') = 'aal2');

-- Les fonctions appelées depuis l'app (rejoindre un foyer, supprimer son compte…) tournent en « security definer »
-- et ne voient pas ces règles : elles sont appelées après la vérification du code, mais ne la revérifient pas.
