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

## Invitations par e-mail (une seule fois)

Dans l'app, on peut saisir l'e-mail d'un membre (questionnaire du foyer et « Ajouter un membre ») :
il reçoit un e-mail pour installer Cocoon et arrive directement dans le foyer.

1. **Edge Functions** → *Deploy a new function* → *Via Editor* → nom : `cocoon-invite`
   → coller `supabase/functions/cocoon-invite/index.ts` → *Deploy*.
   Ici, **laisser « Verify JWT » activé**.
2. **Authentication** → *Email Templates* → *Invite user* : mettre le texte en français
   (voir ci-dessous).
3. Conseillé : **Authentication** → *SMTP Settings* → brancher un service d'e-mails
   (ex. Resend, Brevo) — l'envoi intégré de Supabase est limité à quelques e-mails par heure.

Modèle d'e-mail « Invite user » :

```
Sujet : Tu es invité(e) dans le foyer Cocoon 🏡
<h2>On t'attend dans Cocoon !</h2>
<p>Tu as été invité(e) à rejoindre un foyer sur Cocoon, le carnet partagé de la maison.</p>
<p><a href="{{ .ConfirmationURL }}">Rejoindre le foyer</a></p>
<p>Sur iPhone : ouvre le lien dans Safari, puis Partager → « Sur l'écran d'accueil ».</p>
```

## Notifications sur le téléphone (une seule fois)

1. **Supabase → SQL Editor** : colle et lance `supabase/notifications.sql` (tables, rappel toutes les 15 min).
2. **Edge Functions → Secrets** : ajoute `VAPID_PUBLIC_KEY` (la valeur `vapid` de `config.js`) et `VAPID_PRIVATE_KEY` (la clé secrète, à ne jamais mettre dans le site).
3. **Edge Functions → Deploy a new function** : nom `cocoon-push`, colle `supabase/functions/cocoon-push/index.ts`, puis **désactive « Verify JWT »**.
4. Sur chaque téléphone : ajouter Cocoon à l'écran d'accueil (iPhone), puis **Moi → Notifications → Activer**.

Ce qui est envoyé (au plus 1 à 2 par jour) : un résumé le matin à l'heure choisie s'il y a quelque chose
(sinon « pense à ajouter tes tâches », un jour sur deux au plus), le départ aux courses (au plus toutes les 3 h)
et une tâche confiée pour aujourd'hui ou demain. Rien entre 21h30 et 7h30.

## Protection du serveur (une seule fois)

**Supabase → SQL Editor** : colle et lance `supabase/securite.sql`. Même en contournant l'app, la base refuse alors
de modifier le profil d'un autre membre qui a son compte, de se nommer admin, de réclamer une invitation destinée
à une autre adresse e-mail ou de supprimer un profil sans en avoir le droit. Le créateur du foyer peut retirer
n'importe quel membre (son accès est coupé).

## Message « aucun compte à cette adresse » (une seule fois)

**Supabase → SQL Editor** : colle et lance `supabase/connexion.sql`. L'écran de connexion distingue alors
« aucun compte avec cet e-mail » de « mot de passe incorrect ». Sans ce script, il affiche le message commun
« E-mail ou mot de passe incorrect ».

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
