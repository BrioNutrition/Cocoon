# Cocoon — notes pour Claude (à lire en premier)

Cocoon est une PWA de gestion du foyer (tâches, courses, repas, agenda, budget, papiers, maison, événements, Cocoony).
Propriétaire : Angel (francophone : **toujours répondre en français**). Site : https://brionutrition.github.io/Cocoon/

## Où est quoi
- `source/assistant-du-foyer.html` : **LE fichier source** de l'app (HTML + CSS + JS en un seul fichier). C'est lui qu'on modifie.
- `index.html`, `sw.js`, `cocoon-runtime.js`, `manifest.webmanifest` (racine) : version compilée servie par GitHub Pages. Ne pas éditer à la main.
- `outils/` : `build.py` (compilation), `construire.sh`, `demo/make_demo.py` (fabrique la démo), `src/` (runtime, service worker), `test/` (tests Playwright).
- `supabase/functions/` : fonctions Edge (`cocoon-push`, `cocoon-invite`, `cocoon-agenda`). Angel les redéploie lui-même.
- `app/` : coquille iPhone Capacitor 7 (`fr.cocoon.app`) + module natif `app/ios-native/NativeTabs.swift`. Guide : `app/XCODE.md`.
- Artefacts claude.ai : app https://claude.ai/artifact/Xu9LzXYTYJVDHX4aZPyFkN (publier `source/assistant-du-foyer.html`),
  démo https://claude.ai/artifact/7tebDVh9kopPojpP9pDoVe (publier la démo générée, **jamais la modifier à la main**),
  présentation https://claude.ai/artifact/Cr1ix44a4Z9B2GrJnPkX4k (publier `presentation/contenu.html` avec ses images `img/…`).

## Procédure à chaque modification
1. Modifier `source/assistant-du-foyer.html` (correctifs en Python qui vérifient le nombre de remplacements ; pas de réécriture complète).
2. Vérifier la syntaxe : extraire les `<script>` et `node --check`.
3. `bash outils/construire.sh demo` → reconstruit la racine + `/tmp/demo-foyer.html`.
4. Tests : seulement ceux concernés (`cd outils && python3 test/waitport.py test/e2e.py && python3 test/e2e.py`) ; suite complète
   (`bash outils/test/run_e2e.sh`, ~9 min, 23 tests) une fois par lot. Captures : une petite, pas de planches.
5. Commit (fin de message : lignes `Co-Authored-By` / `Claude-Session` données par la session), puis
   `git fetch -q origin main; git rebase -q origin/main && git push -q origin HEAD:main`.
6. Publier les deux artefacts (avec leur `url`) **à chaque modification**, sans attendre (demandé par Angel le 22 oct. :
   « on supprimera si tu as fait n'importe quoi »).

## Sécurité (non négociable)
La clé privée VAPID, les clés Supabase service-role/secret, la clé SMTP Brevo, la clé APNs et la clé App Store Connect (.p8)
ne vont **jamais** dans `config.js` ni dans le dépôt public. Secrets serveur → secrets des Edge Functions Supabase ;
clés de publication Apple → secrets GitHub. `config.js` ne contient que l'URL Supabase et la clé publique (anon).

## Économie (demandé par Angel)
Grouper les demandes, 2–3 propositions en texte plutôt que 5 maquettes (maquettes seulement si le design compte),
tests ciblés.

## Repères dans le code source
`el()` crée un élément ; `S` = état global ; `setTab()` ; `renderAllNow()` ; `upSheet(id,label)` → feuille du bas `{P,sheet,close}` ;
`needMe()`, `meId()`, `membre()`, `humains()`, `isAdmin()` ; `toast()` ; `haptic()`. Données : table Supabase `cocoon_docs`
(foyer, path, id) ; collections `taches`, `courses`, `rdv`, `depenses`, `documents`, `evenements`, `repas`, `plats`…
Catégories de tâches perso : `CAT[id]` avec `perso:true`, retrouvées via `catNom/catC` sur les tâches (`syncTaskCats`).

## Où on en est (22 oct. 2026)
- Fait (web) : Repas (« Ce soir » + frise + fiche), Premium (bannière en haut du Foyer + comparatif), feuille « Nouvelle tâche »
  (pastilles, catégories perso, **tâches à tour de rôle**), accueil (bonjour + carte du foyer), raccourcis (appui long Cocoony,
  icône iPhone, manifeste Android), Cocoony plus souple (« lasagnes demain soir »), passe d'accessibilité (taille du texte,
  contrastes, zones tactiles, animations réduites), ménage du code.
- Fait (app iPhone, conversation du Mac d'Angel) : projet Capacitor qui tourne dans Xcode, barre d'onglets native qui arrive en
  fondu, alertes iOS natives, Face ID à la connexion (proposé une fois, réglable), connexion revue, sous-menus sans animation.
- Essayé puis annulé à la demande d'Angel (ne pas reproposer tel quel) : gestes façon Rappels sur les tâches (cocher direct,
  glisser, appui long), Foyer en mosaïque « bento », changement de page façon iOS.
- Fait : bouton « Une idée, un bug ? » (tout en bas des Réglages, `openRetour()`) → collection `retours` ; pour lire :
  `select foyer, data, updated_at from cocoon_docs where path='retours' order by updated_at desc;`
- Tuiles du Foyer : essayé puis annulé (Angel préfère l'actuel, ne pas reproposer tel quel) : « pastel » (tuile à sa couleur),
  « carte postale » (bandeau de couleur en haut), « liste groupée » (lignes façon Réglages).
- Premium défini (formule « Cocoony au centre ») : 3,99 €/mois ou 39,99 €/an (2 mois offerts), 1 mois d'essai, un abonnement
  pour tout le foyer. Premium = photos de papiers et Cocoony intelligent sans limite, papiers illimités, sauvegarde, plusieurs
  foyers. Gratuit = tout le reste (budget et graphiques, thèmes compris) + 5 photos et 20 questions à Cocoony par mois, 25 papiers.
  Prix dans `PM_PRIX`, avantages dans `PM_FEATS`/`PM_FREE`. Fenêtre Premium presque plein écran (`.pm-sheet`).
  Limites **appliquées** (demandé par Angel) : `PM_LIM`, `pmCan(k)` bloque et ouvre la tuile `pmLimitPop(k)` ; tuile aussi en haut
  de Papiers dès 22 papiers. Papiers = compte du foyer ; photos lues et questions à Cocoony intelligent = compteur du mois dans
  les prefs de chacun (`pmUse`). Le mode simple de Cocoony reste illimité. Foyer Premium si `foyer/config.premium` est vrai
  (à poser par le paiement, pas encore branché).
- Sauvegarde du foyer (Réglages › Mes données, `backupFoyer()`) : gratuit = `.json` (foyer + espace perso, sans fichiers) ;
  Premium = `.zip` (donnees.json + papiers/ + LISEZMOI.txt), écrit sans bibliothèque (`zipBlob`, fichiers stockés).
- Heure des repas : `repasH(sl,m)` = heure du repas (`repas.heure`) sinon heure habituelle du foyer (`foyer/config.repasH`, réglée
  par l'admin sous « Repas affichés ») sinon 8h / 12h30 / 19h30. Un repas est « passé » 2 h après son heure (`repasFini`).
- Ticket de caisse en photo : Budget › + › « Un ticket de caisse (photo) » (`scanTicket()`, visible seulement si Cocoony intelligent
  lit les images) → fiche dépense remplie (enseigne, date, total, catégorie) à vérifier ; compte comme une photo lue.
- Fiche baby-sitter : Maison › tuile « Fiche baby-sitter » (`openGarde()`, données dans `fiches/garde`). « Partager le lien »
  → https://brionutrition.github.io/Cocoon/fiche/#… : page statique `fiche/index.html` (à modifier à la main), tout le contenu
  est dans le lien (JSON compressé deflate-raw, base64url), rien n'est mis en ligne. Infos publiques des profils, téléphones
  des parents (infos de profil), contacts cochés, 15/18/17/112.
- « Avec ce qu'il y a dans le frigo » (Repas, `openFrigo()`) : 3 idées de plats ; Cocoony intelligent si dispo (compte comme une
  question), sinon `frigoLocal()` sur les plats connus. « Au menu » vise le prochain midi/soir libre, « Ajouter aux courses » le manquant.
- Étoiles des enfants : `starEarn(t)` (appelé par `completeTask`) ajoute 1 étoile dans `etoiles` quand une tâche « pour » un enfant
  est faite ; cochée par l'enfant lui-même = à valider par un adulte. Récompense par enfant dans `recompenses/<id>`
  {nom, objectif, utilisees}. Carte `starCard(m)` : feuille de l'enfant (accueil), sa fiche profil, et Moi s'il a un compte.
- Garanties : dans le formulaire Papiers, bloc « Facture d'un achat ? » (`dAchat`, `dGar`, raccourcis 1/2/3/5 ans) →
  `documents.achat` / `documents.garantieFin` ; la lecture photo remplit l'achat (+2 ans par défaut). Pastille sur le papier,
  rappel 45 j avant la fin, vue « Garanties » (`S.docCat="__gar"`) qui réunit papiers et équipements de Maison (`garantieFin`).
- Page de présentation : `presentation/contenu.html` (à modifier, publiable tel quel en artefact, images dans `presentation/img/`)
  → `presentation/index.html` fabriqué par `construire.sh` ; en ligne sur https://brionutrition.github.io/Cocoon/presentation/.
- Prochaines idées : notifications natives (APNs), paiement Premium, test Android, animations du personnage (format Lottie ou Rive, une animation par humeur, à mettre dans `outils/src/anim/`).
- À faire côté Angel : redéployer `cocoon-push`, coller les modèles d'e-mail, vérifier OTP à 6 chiffres, brancher Brevo (codeEmail).
- Deux conversations peuvent travailler en parallèle (web et Mac) : toujours `git pull --rebase` avant de modifier,
  pousser après, et republier les deux artefacts (liens plus haut) à chaque modification.
