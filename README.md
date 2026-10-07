# Cocoon

Le carnet partagé de la maison : tâches, courses, papiers, budget, maison et véhicules.
Application web installable sur iPhone et Android (« Ajouter à l'écran d'accueil »).

- **Hébergement** : GitHub Pages (ce dépôt).
- **Données** : Supabase (comptes, base partagée en temps réel, fichiers des papiers).

## Mise en route (une seule fois)

1. **Supabase** → *SQL Editor* → coller tout `supabase/schema.sql` → *Run*.
2. **Supabase** → *Authentication* → *URL Configuration* :
   - *Site URL* : l'adresse GitHub Pages de l'app (ex. `https://brionutrition.github.io/cocoon/`)
   - *Redirect URLs* : la même adresse.
3. Renseigner `config.js` avec la *Project URL* et la clé **anon public** (*Project Settings → API*).
   Ne jamais y mettre la clé `service_role`.
4. **GitHub** → *Settings* → *Pages* → *Deploy from a branch* → `main` / `(root)`.

## Calendrier du téléphone (une seule fois)

Le bouton « Ajouter à mon calendrier » abonne le téléphone à un calendrier Cocoon
qui se met à jour tout seul (tâches, rendez-vous, papiers, poubelles…).

1. **SQL Editor** → coller `supabase/calendrier.sql` → *Run*
   (inutile si `schema.sql` a été lancé après le 7 octobre 2026).
2. **Edge Functions** → *Deploy a new function* → *Via Editor* → nom : `cocoon-agenda`
   → coller `supabase/functions/cocoon-agenda/index.ts` → *Deploy*.
3. Dans la fonction → *Details* (ou *Settings*) → désactiver **Verify JWT** / *Enforce JWT verification* → *Save*.

## Inviter quelqu'un

Dans l'app : onglet **Moi → Mon compte → Copier le lien**. La personne ouvre le lien,
crée son compte avec son e-mail et arrive directement dans le foyer.
« Nouveau lien » rend les anciens liens invalides.

## Sécurité

- Chaque foyer ne voit que ses propres données (règles RLS dans `supabase/schema.sql`).
- L'espace perso (`data/users/<id>/…`) n'est visible que par son propriétaire.
- Les fichiers sont dans un espace de stockage privé, accessibles par des liens signés.

## Mettre à jour l'app

L'app est développée dans Claude (`assistant-du-foyer.html`). Pour regénérer le site :

```
python3 outils/build.py chemin/vers/assistant-du-foyer.html .
```

`build.py` ne remplace pas `config.js` s'il existe déjà.

## Limites connues

- Le « secrétaire » répond en mode simple (sans Claude) dans la version hébergée.
- E-mails de Supabase gratuits limités (quelques e-mails par heure) : suffisant pour un foyer.
