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
  démo https://claude.ai/artifact/7tebDVh9kopPojpP9pDoVe (publier la démo générée, **jamais la modifier à la main**).

## Procédure à chaque modification
1. Modifier `source/assistant-du-foyer.html` (correctifs en Python qui vérifient le nombre de remplacements ; pas de réécriture complète).
2. Vérifier la syntaxe : extraire les `<script>` et `node --check`.
3. `bash outils/construire.sh demo` → reconstruit la racine + `/tmp/demo-foyer.html`.
4. Tests : seulement ceux concernés (`cd outils && python3 test/waitport.py test/e2e.py && python3 test/e2e.py`) ; suite complète
   (`bash outils/test/run_e2e.sh`, ~9 min, 23 tests) une fois par lot. Captures : une petite, pas de planches.
5. Commit (fin de message : lignes `Co-Authored-By` / `Claude-Session` données par la session), puis
   `git fetch -q origin main; git rebase -q origin/main && git push -q origin HEAD:main`.
6. Publier les deux artefacts (avec leur `url`) seulement à la fin d'un lot ou quand Angel dit « publie ».

## Sécurité (non négociable)
La clé privée VAPID, les clés Supabase service-role/secret, la clé SMTP Brevo, la clé APNs et la clé App Store Connect (.p8)
ne vont **jamais** dans `config.js` ni dans le dépôt public. Secrets serveur → secrets des Edge Functions Supabase ;
clés de publication Apple → secrets GitHub. `config.js` ne contient que l'URL Supabase et la clé publique (anon).

## Économie (demandé par Angel)
Grouper les demandes, 2–3 propositions en texte plutôt que 5 maquettes (maquettes seulement si le design compte),
tests ciblés, pas de republication à chaque micro-changement.

## Repères dans le code source
`el()` crée un élément ; `S` = état global ; `setTab()` ; `renderAllNow()` ; `upSheet(id,label)` → feuille du bas `{P,sheet,close}` ;
`needMe()`, `meId()`, `membre()`, `humains()`, `isAdmin()` ; `toast()` ; `haptic()`. Données : table Supabase `cocoon_docs`
(foyer, path, id) ; collections `taches`, `courses`, `rdv`, `depenses`, `documents`, `evenements`, `repas`, `plats`…
Catégories de tâches perso : `CAT[id]` avec `perso:true`, retrouvées via `catNom/catC` sur les tâches (`syncTaskCats`).

## Où on en est (17 oct. 2026)
Fait récemment : Repas (« Ce soir » + frise + fiche en feuille), Premium (bannière en haut du Foyer + comparatif),
feuille « Nouvelle tâche » + catégories perso, accueil (bonjour + carte du foyer), démarrage, ménage du code.
Prochaine étape : **Capacitor / Xcode sur le Mac d'Angel** (suivre `app/XCODE.md`), puis : notifications natives (APNs),
tâches à tour de rôle, définir le Premium, bouton « Une idée, un bug ? », passe d'accessibilité, test Android, page de présentation.
À faire côté Angel : redéployer `cocoon-push`, coller les modèles d'e-mail, vérifier OTP à 6 chiffres.
Idée en attente : Cocoony qui comprend « lasagnes demain soir » sans « on mange ».
