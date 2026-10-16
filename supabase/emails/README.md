# Mails de Cocoon (Supabase Auth + Brevo)

À coller dans Supabase › Authentication › Emails › Templates.

| Fichier | Modèle Supabase | Objet |
|---|---|---|
| confirmation.html | Confirm sign up | Confirme ton adresse pour ouvrir ton cocon |
| invitation.html | Invite user | Tu es invité·e à rejoindre un foyer sur Cocoon |
| connexion.html | Magic link | Ton lien pour te connecter à Cocoon |
| mot-de-passe.html | Reset password | Choisis un nouveau mot de passe Cocoon |
| changement-adresse.html | Change email address | Confirme ta nouvelle adresse e-mail |

## Codes à 6 chiffres (rester dans l'app)

Les mails « Confirm sign up », « Reset password » et « Magic link » affichent maintenant aussi le code `{{ .Token }}`.
Dans l'app, après « Créer mon compte » ou « Mot de passe oublié », un écran demande ce code : la personne n'a plus besoin
d'ouvrir le lien (qui, sur iPhone, ouvre Safari au lieu de l'app installée).
Après avoir recollé ces modèles dans Supabase, vérifier dans Authentication › Providers › Email que la longueur du code (« Email OTP Length ») est 6.
