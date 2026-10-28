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
- **Foyer de nuit** (choisi par Angel, maquette C) : sur l'onglet Foyer, `html.foyer-nuit` (posée par `setTab`). Fond et tuiles
  aux **couleurs habituelles du thème** (`var(--bg)`/`var(--surface)`, demandé par Angel : pas de fond de nuit à part), tuiles
  éclairées par un halo de leur couleur (dégradé dans le fond de `.hb-t`, fixe : pas de calque flouté), pastilles dorées, pas de sous-titre sous « Le foyer » (retiré par Angel). Tuile **Événements** remise dans le Foyer (groupe Gestion, 26 oct., car le « + » de l'Agenda ne crée plus que des rendez-vous). Tuiles-boutons à ombre dure : proposées puis écartées.
- Tuiles du Foyer : essayé puis annulé (Angel préfère l'actuel, ne pas reproposer tel quel) : « pastel » (tuile à sa couleur),
  « carte postale » (bandeau de couleur en haut), « liste groupée » (lignes façon Réglages).
- **Noms des formules** (choisis par Angel) : gratuit = **Cocoon Essentiel**, payant = **Cocoon Plus** (le mot « Premium » ne doit plus
  apparaître à l'écran ; le code garde ses noms internes `pm*`, `openPremium`, `premium`).
- Premium défini (formule « Cocoony au centre ») : 3,99 €/mois ou 39,99 €/an (2 mois offerts), 1 mois d'essai, un abonnement
  pour tout le foyer. Premium = photos de papiers et Cocoony intelligent sans limite, papiers illimités, sauvegarde, plusieurs
  foyers. Gratuit = tout le reste (budget et graphiques, thèmes compris) + 5 photos et 20 questions à Cocoony par mois, 25 papiers.
  Prix dans `PM_PRIX`, avantages dans `PM_FEATS`/`PM_FREE`. Fenêtre Cocoon Plus plein écran sans défilement, style « deux affiches » choisi par Angel (`openPremium`, classes `px*` : Essentiel gris + Cocoony qui dort, Plus en dégradé + lignes « Avant → Après », logo Cocoony sur « Cocoony malin ») ; `pmFit` resserre puis réduit pour tenir.
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
- Plafonds par catégorie : existaient déjà (« Objectifs », `foyer/config.objectifs`, barres à 80 %/100 %). Ajouté : message quand
  une dépense fait passer 80 % ou 100 % (`catSpent`), et notification dans la cloche (kind « Budget », une par palier et par mois).
- Mode vacances : Maison › tuile « Vacances » (`openVac()`, `vacances/actuel` {debut, fin}). `enVac(d)` : `binNext` saute les sorties
  de poubelles pendant l'absence ; au départ, les tâches récurrentes de la période passent au lendemain du retour, et la liste
  « avant de partir » (`VAC_LIST`) devient des tâches pour la veille (`vacances:true`). Lien vers la fiche baby-sitter.
- Réserves (Repas › « Frigo, congélateur, placard », `openStock()`, collection `stock` {nom, lieu, dlc}) : rappel 2 j avant (7 j
  congélateur), « Consommé » retire, « Une idée avec ce qui périme bientôt » ouvre le frigo prérempli (`openFrigo(pre)`).
- Anniversaires des membres **dans l'agenda** (demandé par Angel le 24 oct.) : calculés chaque année depuis `membres.naissance` (`annivOn(k)`, `annivList`),
  rien n'est enregistré ; ligne « 🎂 Ton anniversaire · 36 ans » / « Anniversaire d'Emma » (`.rdv.anniv`) dans « À venir » et le jour choisi, 🎂 sur le jour du calendrier (`.ag-cake`).
  La date saisie au profil à l'inscription apparaît donc toute seule. Organiser la fête : événement « Anniversaire » : « Anniversaire »
  (`evAnnivCard`, onglet Frise) : idées de cadeaux (`evenements.idees`, « Aux achats » = achat de l'événement) et « Le rappeler chaque
  année » (`evenements.annuel`, coché par défaut) → rappel 7 j avant la date suivante, « Préparer celui du … » recrée l'événement.
- Événements : toute la ligne du modèle coche/décoche ; les étapes faites restent dépliées (« N réalisées ») ; sous « Créer avec le
  modèle … », lien « Continuer sans utiliser le modèle » (`#evCreateSans`) qui crée l'événement sans aucune étape.
  Anneaux d'avancement (`evRing`, raccourci `.wg-ring.emo`) : emoji du type au centre (`emoIco`), anneau à la couleur du type sur
  fond teinté, % dans la ligne du bas, pastille verte ✓ à 100 % ; anneau des raccourcis centré en hauteur, plus gros (60 px, 56 en court) et décalé vers la gauche sur les longs ; remplissage animé seulement la 1re fois ou si le % change (`ringNew`).
- « + » de l'Agenda : **ouvre directement un rendez-vous** (26 oct., Angel ; les événements se créent depuis la tuile Événements du Foyer ; `evPick` ne sert plus depuis le « + »). « + » des Papiers : menu `openDocAdd()` (« Ajouter un papier » : photo lue par Cocoony, fichier, à la main,
  facture avec garantie ; boutons `#docAddPhoto/File/Main/Gar`, les tests cliquent `#docAddMain`).
- Rendez-vous : formulaire dans une feuille du bas façon « Nouvel événement » (`openRdvSheet()`, ouverte dès que `S.rdvForm`
  est posé puis `renderRdv()`), grille de types `RDV_TYPES` qui remplit le titre, mêmes champs `ev-inp` / bouton `ev-cta`.
- Harmonisation visuelle (audit du 22 oct., bloc CSS « harmonisation » en fin de feuille principale) : jour choisi / aujourd'hui =
  pastille dégradée partout ; sélecteurs de personne = pastille jaune ; titres de section dans une page = petites majuscules ;
  tuiles Foyer, Maison et Moi = fond blanc + **emoji en couleur** sur carré teinté (Angel préfère les emojis aux icônes dessinées) ;
  écrans vides = titre en gras + phrase. Emojis des tuiles : `emoIco(e)` dessine l’emoji sur un canevas, le recadre sur ses pixels et l’affiche en image (centrage exact sur toutes les polices ; repli en texte).
  Raccourcis courts du Foyer : contenu collé au titre (`.wg .wg-big{margin-top:0}`).
- Bannière Premium du Foyer : Cocoony (`.hb-cat`, image du personnage) monte du bas puis se penche vers « Cocoon Premium » en
  boucle douce ; `S.pbanT` mémorise le début pour ne pas rejouer l'entrée à chaque rendu (classe `seen` après 1,6 s).
  Essayé puis annulé (Angel) : Cocoony redessiné en vectoriel avec yeux/oreille/mèche animés — on garde l'image du logo.
- **Images App Store** (style « affiche dégradée » choisi par Angel : dégradé Cocoon Plus, logo + « Cocoon » en Fredoka comme l'app,
  titre blanc, téléphone incliné, Cocoony en coin, pas d'autocollant) : `app/appstore/appstore-1…7.jpg` (1320×2868, iPhone 6,9").
  Captures habillées « app iPhone » par `outils/appstore/ios.js` (`__ios(onglet)` : barre d'onglets Liquid Glass flottante,
  barre du haut comme `NT.topbar` : même position (offsetTop), boutons en verre Liquid Glass (reflet, bord lumineux), « + » en verre jaune, titre 21 pt ; barre d'accueil) ; même cadre iPhone Pro Max que le site, téléphone entier, Cocoony en haut à droite.
  Pour les refaire : `bash outils/construire.sh demo` puis `python3 outils/appstore/captures.py` (foyer d'exemple `seed.js`, écrans dans
  `outils/appstore/raw/`) puis `python3 outils/appstore/affiches.py` (titres dans `PAGES`).
- Page de présentation : `presentation/contenu.html` (à modifier, publiable tel quel en artefact, images dans `presentation/img/`)
  → `presentation/index.html` fabriqué par `construire.sh` ; en ligne sur https://brionutrition.github.io/Cocoon/presentation/.
  Refonte du 23 oct. : haut de page en « affiche dégradée » (comme l'App Store, Cocoony en coin, pastille « Bientôt sur l'App Store »),
  carrousel de 7 écrans, tarifs en « deux affiches » comme dans l'app. Téléphones fixes façon iPhone Pro Max (`.phone > .fr > .scr`, cadre titane,
  Dynamic Island, unités `cqw`), bandeau du haut à angles droits, pas de « L'appli du foyer ». Rubriques = bande sombre façon « card shuffle » (modèle
  envoyé par Angel) : titre coloré + texte à gauche qui suivent la carte, flèches en bas, grandes cartes verticales (écrans `img/c-*.jpg`)
  en éventail (pivot sous le paquet) ; la carte balayée sort à gauche (sortie courte, glisser limité à ~150 px avec résistance) puis repasse derrière toutes les autres ;
  flèches fixes (`fit()` réserve la hauteur du titre et du texte les plus longs) et en verre Liquid Glass ; passage de carte = une seule
  animation Web Animations (sortie, changement de plan via z-index dans les clés, rangement) ; images des cartes 960 px (nettes) ; `shuffleCardSlider({deck,prev,next,title,text,num})` (glisser, flèches ‹ ›, clavier ←/→). Images `presentation/img/*.jpg` = captures de
  `outils/appstore/raw/` réduites à 600 px de large.
- Prochaines idées : notifications natives (APNs), paiement Premium, test Android, animations du personnage (format Lottie ou Rive, une animation par humeur, à mettre dans `outils/src/anim/`).
- À faire côté Angel : redéployer `cocoon-push`, coller les modèles d'e-mail, vérifier OTP à 6 chiffres, brancher Brevo (codeEmail).
- Fenêtre ou feuille du bas ouverte → `html.nav-off` (`navOffNow`/`navOffWatch`) : la barre d'onglets descend hors de l'écran (sans fondu,
  l'inverse de son arrivée) **en même temps** que la fenêtre monte (0,32 s, `navOffNow` immédiat → `window.__ntSync`) et remonte à la
  fermeture ; iPhone : `NT.hide` glisse vers le bas (`slidOut` dans NativeTabs.swift).
  Après une modif de `app/ios-native/NativeTabs.swift` : sur le Mac `npm run native:ios` puis ▶︎ (le mode auto le signale).
- **Après une déconnexion** (choix B d'Angel) : écran « Content de te revoir » en affiche dégradée (Cocoony, « Cocoon », « Ton cocon
  t'attend. ») + feuille blanche : avatar, nom, 👑 « Maître du foyer · Chez les … » (ou « foyer de … 👑 »), Face ID (app iPhone, si activé,
  `faceIdButton`), mot de passe, « Mot de passe oublié », « Changer de compte » (efface le compte retenu → formulaire classique `{plain:true}`).
  Compte retenu dans `cocoon.last` : écrit par l'app (`saveLast()` dans `renderAllNowInner`), e-mail ajouté par `logout()` du runtime ;
  effacé à la suppression du compte. Le faux Supabase des tests garde maintenant ses comptes (`mockU`).
  **Tous les écrans de connexion** ont la même affiche (connexion, création de compte, mot de passe oublié, code, nouveau mot de passe,
  foyer à créer/rejoindre) : `poster(mode)` dans le runtime déplace le contenu dans la feuille blanche (`TAGS` = phrase en blanc par écran) ;
  « Cocoon » en Bricolage 800 comme la barre du haut de l'app.
  Création de compte avec une adresse déjà prise (`cocoon_email_exists`, erreur « already registered » ou utilisateur sans identité) :
  `taken(em)` → « Cette adresse e-mail est déjà utilisée… » + « Me connecter à ce compte » (connexion, e-mail prérempli) et « Mot de passe oublié ? ».
- **Thème sombre par défaut partout** (demandé par Angel, connexion et questionnaire compris) : script tout en haut du `<head>` (source et
  `build.py`) : sans choix enregistré → `cocoon.theme=dark` (migration unique des anciens « auto » via `cocoon.themeD`) ; `curTheme()` vaut
  « dark » par défaut ; « Clair » et « Automatique » restent dans Personnaliser. Manifeste et `theme-color` en #13121C. Démo : sombre aussi.
- **Questionnaire refait** (24 oct., choix d'Angel sur 5 maquettes par étape) : fonctions `wq*` avant `renderWizard`, mêmes données `W.a`
  qu'avant (buildPlan/applyPlan inchangés sauf soins décochés `a.petOff` et photo `a.petPhoto`). 1 plaque de porte « Chez les … » (`wqNom`) ;
  2 compteurs Adultes (1–2) / Enfants / Colocataires + prénoms dessous (`wqMenage`, boutons `#wqAdP`, `#wqKidP`, `#wqColP`) ; 3 fiche animal
  (photo, nom `#wqPet0`, espèce, soins en interrupteurs + date du dernier, `#wqPetAdd`, « Pas d'animal » : juste un contour jaune quand choisi, pas de rond, idem « Aucun véhicule » ; en changeant d'étape, fiches repliées en une ligne `.wq-pet-min` (« Modifier » la rouvre) et fiches vides retirées) ; 4 liste façon Réglages qui se
  déplie (`wqRow`, `W.open`), équipements rangés par pièce (`EQUIP_G`, rappels pour chacun dans buildPlan) + « Autre chose ? »
  (`#wqEqAdd`, `a.equipPerso` → équipements de Maison, groupe du récap) ; 5 une ligne par bac + « Je ferai ça plus tard » (`#wqLater`) ; 6 garage (`#wqVvoiture`…, « Aucun véhicule »),
  contrôle technique facultatif en une colonne pour la voiture et pour la moto/scooter (`a.motoCT`/`a.motoMec`, CT moto à 5 ans puis tous les 3 ans) ;
  7 total « Chaque mois » qui monte + section « Autre » (`a.abosPerso`, `#wqAbAdd`, catégorie budget « autre ») ; 8 partage **seulement s'il y a un 2e adulte** (`wzAdults`), moitié-moitié par défaut (« Garder
  moitié-moitié ») ; **papiers retirés** ; 10 « Ce qui m'énerve le plus, c'est… » (phrases `WQ_PRIO`, `.opt.wq-phr` ; contour 1,5 px choisi ou non et pas d'enfoncement : rien ne bouge) ; 11 groupes repliés
  avec un interrupteur par groupe (`wqPlan`, `#wqG-…`, `P.partageOff`). Sans partage réglé (foyer créé seul puis membre ajouté), rien n'est
  partagé par défaut : formulaire de dépense vide et `budgetAdd` suit `foyer/config.partage` (sinon dépense à soi).
- **Écran « Ton foyer, enfin serein »** (avant « Créer mon cocon », choix F d'Angel parmi 10 maquettes) : épuré, logo + « Cocoon » côte à côte
  en haut, grand titre juste dessous (« enfin serein. » en dégradé, `.sp-grad`), une phrase, les atouts en **grille fixe de 6 cartes** (`.sp-cards`, demandé par Angel : plus de défilement) avec derrière chaque carte une lueur de sa couleur (`--g`) qui s'allume l'une après l'autre (`spGlow`, classe `.glow` remise par `spMarqRestart` car le lancement annule les animations), bouton en bas ; même fond uni que le questionnaire ;
  cartes `.sp-stickers` masquées ; bandeau « Démo » masqué dans la démo (hunk CSS de `demo_patch.json`) ; fond sombre classique
  (lueur `.sp-aura` retirée et lueurs `.aurora` masquées sur cet écran, demandé par Angel) ; textes affichés 560 ms après le départ du logo.
- **Bienvenue** : « Créer mon cocon » lance directement le questionnaire ; les conditions restent **à la fin** (après le profil, `onboardGate`).
  À la 1re acceptation, `cguWelcome` : confettis sur l'app floutée derrière (`.wb`, flou du fond), Cocoony + bulle « Bienvenue chez toi … ! »
  qui annonce la visite guidée, « C'est parti ! » → visite. Ordre : profil (étape 2) → conditions → Cocoony → visite ; la bienvenue s'ouvre
  par-dessus les conditions (flou immédiat, `after._over`), qui s'effacent dessous. Pop-up « Bienvenue dans ton foyer 🥳 » (`maybeWelcome`) supprimée. Après « Terminer » du profil : plus d'animation
  « Bienvenue chez toi, … » (`reveal` n'est plus appelé), « Avant de commencer » s'affiche aussitôt (`openCgu(w,true)`, sans fondu) pendant que le
  foyer se prépare derrière (`applyPlan`) ; « C'est parti ! » de Cocoony lance la visite tout de suite, son écran s'efface par-dessus. Plus de phrase « Tu pourras relire ces textes… ». Écran « enfin serein » :
  tout apparaît **en même temps** quand le logo arrive en haut à gauche (`flySplash` → `sp-show` après l'atterrissage).
- Animation de lancement (`#boot` dans la source, `#cxIntro` dans `build.py`) : même fond uni que l'app (**#13121C = `--bg` de l'app**, préféré par Angel ; clair #F6F5FB ; `--au-bg` vaut la même chose, aussi posé sur `html` pendant l'accueil et le questionnaire : pas de saut de couleur à la fin), **sans lueur derrière le logo** ni halo pendant le vol (`flyLogo`) (demandé par Angel).
- **Plus de grain nulle part** (demandé par Angel le 24 oct.) : fonds unis. Ancien : fond du questionnaire et du profil (étape 2) : **uni + grain fin**, sans lueurs (choix A d'Angel parmi 5 ; `.aurora i` masqués, grain SVG
  feTurbulence en fond de `.aurora`). Essayés puis écartés : motif maison, cases ou boutons Liquid Glass.
- Fin du questionnaire (`warmup`) : **boîte aux lettres** (`.mbx` : l'enveloppe arrive et flotte au-dessus de la fente pendant la préparation ; quand tout est prêt, `warmup` ajoute `.drop` :
  elle tombe dans la fente, le drapeau se lève, puis écran suivant) ; fond identique au questionnaire (uni, `.warmup`) au lieu du feu de bois,
  une seule ligne « Nous livrons le courrier… » (`WARM_LINES`), plus de sous-titre « Cocoon prépare tout pour vous » (demandé par Angel).
- Récap du questionnaire : chaque groupe montre « Voir le détail / Masquer le détail » (`.wq-hint`) et une flèche qui tourne ; plusieurs groupes ouverts à la fois (`wqRow(...,{multi:true})`, `W.opens`), lignes de détail `.wq-dr`
  (case + titre + infos dessous) ; interrupteurs `.wq-tg` façon iOS (51×31, vert #34C759, pastille qui glisse avec rebond et s'étire à l'appui ;
  bascule visible tout de suite, action 260 ms après). Fiche profil : aperçu revenu en **bannière tout en haut** (`pwCard`), champs blancs en sombre.
- **Conditions / Confidentialité** (`openTerms`, `openPrivacy`) : feuilles `upSheet` comme Cocoon Plus (`#termsPage`, `#privPage`, z-index au-dessus
  de la connexion), même fermeture que Cocoon Plus (flou du fond qui s'efface en fondu, demandé par Angel) ; toucher la poignée `.pp-grab` ferme (toutes les feuilles) ; exposées sur
  `window` pour les liens de l'écran de connexion (avant : ces liens ne faisaient rien, l'app étant dans une IIFE).
- **Âge** (demandé par Angel, `ageBlock` au « Terminer » du profil) : créer un foyer = 18 ans ; avant 15 ans, seulement en reprenant un profil
  préparé par un adulte (`E.claimId`) ; message `.age-stop`. Conditions : partie « L'âge », `CGU_V="2026-10-24"` (chacun réaccepte une fois).
  Fiche profil : plus de sélecteur de couleur personnalisée (rectangle `#fiCouleur` retiré, les ronds suffisent).
- **Fiche profil** : en-tête `#fHead`, puis aperçu en bannière juste au-dessus de la case Identité, puis formulaire (essai « carte à droite » abandonné).
  En-tête (étape, titre, phrase ; « Ton profil » hors inscription) déplacé dans `#fHead`, sur toute la largeur au-dessus des deux colonnes.
  Pas de titre « Profil » ; pendant l'inscription : pas de barre, pas de retour (la mini-barre `hubMini` ignore un titre vide), pas de bande « Démo ». Apparence Automatique/Clair/Sombre : appliquée dès le clic (`E.theme0` = l'ancienne),
  validée par Enregistrer/Terminer (`E.themeOk`), remise comme avant si on quitte sans enregistrer (`closeEditor`) ; boutons l'un sous l'autre en colonne étroite.
- Images instantanées à l'ouverture : photo de Cocoony gardée dans `cocoon.secid` (posée par un petit script avant le gros script),
  miniatures 192 px des photos de profil dans `cocoon.thumbs` (`THUMBS`, `makeThumb`, utilisées par `avatarFor`) ; effacées à la déconnexion.
- Fenêtre Événements sur iPhone : retour et « ⋯ » façon **en-tête de feuille iOS** (Rappels, Calendrier) : « ‹ Retour » en texte jaune, ⋯ cerclé jaune, sans fond (`html.native-tabs:not(.zz) .ev-back/.ev-more`). Essayé puis abandonné (Angel : « fonctionne mal ») : vrais boutons natifs posés par-dessus via `NT.topbar` (ne suivaient pas la fenêtre). Sur le web : ronds en verre CSS.
- Animal sans photo : **emoji du téléphone** selon l'espèce/race (`petEmo`, `PET_EMO` : 🐱 🐶 🐰 🐹 🐦 🐟 🐢 🐴 🐍 🦎…, sinon 🐾) dans son rond (`.av-pet`) ; anciennes icônes dessinées (`petSvg`) retirées.
- **Accueil « ultime »** (choisi par Angel le 26 oct., maquette qui réunit les 5 propositions) : bonjour + 2e ligne en dégradé qui résume la journée
  (`#homeL2` : « journée calme. » / « N choses aujourd'hui. » / « grosse journée ! », calculée dans `renderToday`) ; carte du foyer inchangée ; carte
  « Le plus urgent » à part **supprimée** (27 oct., cohérence : elle est devenue la grande carte de « Aujourd'hui ») ; titre « Ta journée » (`#daySec`, sans lien Agenda : retiré par Angel ; bouton « Aujourd'hui » visible hors du jour même) au-dessus de la frise
  (la semaine `#week` et l'en-tête `#dayHead` sont masqués sur l'accueil). Plus de date tout en haut de l'accueil (`#foyerName` masqué, la date est dans « Ta journée »). **« Ta journée » façon « Maintenant, ensuite » + semaine** (choix C puis 1 d'Angel, 27 oct.) : titre = jour choisi (le jour même : la date, « Mardi 27 octobre », car « aujourd'hui » est déjà dans le bonjour ; sinon « Demain », « Mar. 3 nov. »),
  à droite rien sur le jour même (« Semaine N » retiré par Angel), « Revenir à aujourd'hui » (`#wkToday`) dès qu'on regarde un autre jour ou un autre mois (même hauteur que le titre, zone de toucher agrandie par `:before` : le titre et la semaine ne bougent plus) ; **semaine qui se déplie** (choix B d'Angel, 27 oct., remplace la semaine qu'on faisait glisser) : la semaine du jour choisi est **fixe** ;
  un bouton rond « + » dessous (`.jm-grab`, devient « − » ouvert ; plus de poignée à tirer ni de « Semaine N » cliquable : ça s'ouvrait en faisant défiler, Angel) **déplie le mois entier** comme Calendrier sur iPhone (`jmOpen`, `S.accOpen`) :
  même grille `.jm-g` (cases de 46 px), fermée = fenêtre `.jm-v` d'une rangée décalée sur la semaine du jour, ouverte = tout le mois (hauteur et décalage en transition CSS) ;
  en-tête du mois `.jm-h` (« Octobre 2026 », ‹ › = `S.accMo`) ; replier revient au mois du jour choisi ;
  toucher un jour = le choisir (`S.accDay`). Plus de glisser du tout (ni semaine ni jour : `weekBrowse`, `dayShift`, `S.accWk` supprimés) ; points de couleur par jour (`dayDots` : bleu rendez-vous, jaune événement, rose anniversaire, blanc tâches, rouge tâche restée en retard ; pas les repas) + légende `.jw-leg` **seulement mois déplié** ; jour vide = « Rien de prévu pour toi aujourd'hui. Profite ! » ; foyer vide et thème clair vérifiés le 27 oct. ;
  **une seule grande carte** (`.jn`) : rendez-vous/repas dans les 2 h (compte à rebours, « 📍 Itinéraire », « Voir › »), sinon la tâche la plus en retard/urgente (« ✓ C'est fait », « Plus tard » = lendemain, `S.urgT`), sinon le prochain ; « Ensuite » en petites cartes qui défilent (`.jx`) ;
  « À cocher » = tâches du jour (`.jt`) ; jour choisi = `S.accDay`. Grande date + frise de l'année : essayées puis remplacées ; ancienne frise `.td-tl` supprimée; « Cocoony » en **une ligne** (`renderCocNote`, `#cocNote`, phrases très courtes coupées par « … » si besoin, ex. « Rien de prévu ce soir 🍽️ », bouton + ×,
  une remarque à la fois : soir sans repas → frigo, papier qui expire sous 14 j, événement sous 21 j avec des choses à préparer, courses en cours/longue liste ;
  « Non merci » mémorisé dans `cocoon.cocNo`) ; puis **« En un coup d'œil »** (ex « Mes raccourcis », 27 oct.) : par défaut Courses, Papiers, Budget (`WG_DEF`) ; Agenda et Poubelles **retirés** de la liste (déjà dans « Aujourd'hui ») ;
  Repas = la semaine des repas (« 5 sur 9 prévus », ce qui reste à prévoir sur 7 jours). Rangement **automatique** (27 oct.) : deux colonnes, la dernière carte en large si le nombre est impair (choix « Petit / Large » retiré de la feuille) ; Budget sans dépense = « Aucune dépense ».
  Événements et anniversaires apparaissent dans la journée (« Toute la journée », en premier) ; points du jour choisi en couleur avec contour sombre 1,5 px (bordure du point lui-même, pas d'ombre : toujours concentrique), centrés sous le chiffre.
  Grande carte d'un autre jour : « À 14h » / « Dans la journée » (plus de « Premier »).
  Bannière « rendez-vous dans X min » (`#rdvAlert`) masquée sur l'accueil (doublon de la frise). Noms des repas partout : Petit-déj / Déjeuner / Repas (`RSLOTS`, frise).
  Cartes de l'accueil (foyer, journée, raccourcis, Cocoony) : contour fin 1 px (`var(--line)`) ; lueurs essayées puis **retirées** (Angel).
  **Raccourcis en « carte à la une »** (choix C d'Angel parmi 3 styles × 9 raccourcis) : `wgX(k)` donne emoji (`e`), compte à rebours en haut à droite
  (`cd`, rouge si `hot`), petite ligne (`cap`), titre (`big`), détail (`small`), étiquette en bas (`chip`), barre (`bar`, événement), anneau (`ring`, semaine), bac en couleur (`bin`) ;
  rendu `.wg.wgc` (fond teinté de `--wc`) dans `renderWidgets` (ancien rendu `wgData`/`budgetSpark` supprimé). Planche des 3 styles : A liste détaillée, B visuel, C carte à la une.
  Texte coupé d'un raccourci (étiquette, détail, petite ligne, compte à rebours) : défile pour tout lire puis revient d'un coup au début, en boucle (`wgMarquee`, `.mq`, `wgMq`, demandé par Angel) ; Repas : « Déjeuner » (midi), « Repas » (soir), « Petit-déj » (matin).
- **Même style que l'accueil ailleurs** (27 oct., Angel : tout fait) :
  Repas = même rangée de jours que l'accueil (`jmGrid(o)` réutilisable : semaine fixe, « + » déplie le mois, `S.rOpen`/`S.rMo`, points couleur des repas, `S.rDay` → `S.rWeek` calculé) ; ancienne frise `.r-strip` / « Cette semaine ‹ › » retirées ;
  « Ce soir » (`.r-hero`) et le total de Budget (`.b-hero`) au style de la carte « à la une » (fond teinté, contour de couleur, petite ligne colorée ; « Une idée avec le frigo » en jaune, « Choisir un plat ») ; Budget vide = « Aucune dépense » ;
  Cocoony en une ligne dans les pages (`cocLine(clé,texte,bouton,fn)`, × mémorisé dans `cocoon.cocNo`) : Courses « Appui long = changer de rayon » (ex-astuce), Budget vide « Je fais les comptes 💶 » + « + Dépense » ; pas de ligne dans Papiers (le bandeau « N papiers à renouveler » le fait déjà) ;
  Agenda = grille du mois de l'accueil (`renderAgenda` : `.jm.open.ag-jm`, cases `.jw-d`, jour choisi ou aujourd'hui en dégradé, aujourd'hui cerclé sinon, points b/y/p au lieu de la barre d'événement et du 🎂, ‹ › `jmNav`, légende) ;
  Tâches (`taskRow`, CSS `.item[data-key]`) et Courses (`.c-item`) = lignes de « À cocher » : rond à gauche, plus de barre de couleur ni de rotation, contour fin, avatar de la personne à droite (`.t-av`, l'étiquette « Tout le foyer » retirée des infos).
- **Courses refaites en listes-notes** (27 oct., Angel) : plus de barre « Ajouter » ; « + » en haut (`fabAct("courses")` → `openCListForm`) ; collection `listes`
  {titre, emoji, date, lieu, qui, prive (moi seul, filtré dans l'app), par, recur:"semaine", fini, finiLe, montant, articles[]} ; articles = `courses` avec `liste`
  (sans `liste` ou liste finie/supprimée = liste principale `CL_DEF="principale"`, note « Liste de courses » ; Repas/frigo/Cocoony/accueil ajoutent là).
  Page = cartes en 2 colonnes, **style C « aperçu »** (choix d'Angel, 27 oct. ; lueur/fond teinté retirés) : `clRow` → `.cl-card` fond uni, date en texte gris en haut à droite `.ka-cd`, magasin en petite ligne, **titre à la couleur de la liste**, 3 premiers articles à rond (`.ka-ul`/`.ka-li`, barrés et rond vert si pris) + « + N autres » ; ouverte : « x sur y au caddie » ; **« ⋯ » en haut à droite de la liste ouverte seulement** (Angel) ; cartes fermées : « 🛒 x / y » sous le titre ; (`.ka-opt` → `clMenu`, menu en `position:fixed` sur `body` ; la date passe dans la petite ligne) ; carte = `div role=button` ; la liste déroulée passe **en premier** dans la grille (plus de trou) et la liste déroulée = **un seul bloc** `.cl-open` (carte + `CL_PANEL`, persistant comme `CL_OPEN`, sans traits entre les deux) qui s'agrandit (`clVT` = View Transitions : nom par carte, groupes rognés `overflow:clip`, images ancrées en haut à gauche sans étirement, ancienne image cachée tout de suite = pas de fantôme) ; (28 oct. : à la fermeture la carte fermée est étirée au bloc `object-fit:fill` et n'apparaît qu'après 55 % : plus de double contour) **fermeture = l'inverse, en douceur** (`clVT(fn,true)` → `html.vt-close`, 0,4 s ; la liste qui se ferme s'appelle `cl-x` (`S.clClosing`, remis à zéro juste après le rendu ; fond du groupe seulement sous `html.vt-close` : sinon rectangle vide à la réouverture, bug vu sur iPhone) : fond de carte sur son groupe, au-dessus des autres, contenu ouvert effacé sur les 40 % du début, carte fermée en fondu à partir de 35 % ; le champ perd le focus) ; « Valider la liste » sans icône, seul en bas ; classes `ka-*` car `cl-bar`/`cl-dot`… existent déjà ailleurs ; **plus d'historique « Terminées » ni de « Refaire »** (Angel, 27 oct. : une liste validée disparaît, elle reste seulement dans la base avec `fini`/`montant`).
  **Listes enregistrées** (Angel, 28 oct., remplacent les favorites) : ⋯ → « Enregistrer la liste » (`clSave`) copie titre, couleur, magasin et articles dans la collection **`modeles`** (même titre = mise à jour) ; la copie reste même si la liste est validée ou supprimée ; le « + » (`openCListPick`) propose « Nouvelle liste » ou les listes enregistrées (`clMods`) → « Recréer » (`clRecreer`) ou × pour l'oublier ; sans liste enregistrée, le « + » ouvre directement le formulaire.
  **Listes déroulantes** : toucher une ligne la déroule sur la page (`S.clOpenId`, `openCList`) (la carte touchée prend toute la largeur, `.cl-card.open`, le bloc déroulé est dans la grille `CL_GRID`) dans `CL_PANEL` (`clPanelFill` : champ `#cForm`/`#cNom`, habituels, « Pour qui », articles, « ✓ Valider la liste » + « ⋯ ») ; `renderCHome` garde le bloc déroulé en place (le champ garde le clavier) et remplace le reste autour ;
  le formulaire (créer / Modifier) reste une feuille du bas (`clSheet`), refermée à l'enregistrement → la liste se déroule ; Dupliquer déroule la copie ; Supprimer replie.
  Éléments de la liste (`CL_NODES`) rangés dans `#cStash` quand rien n'est déroulé ;
  « ⋯ » (`clMenu`) : Modifier, Dupliquer (`clDup`), Valider, Supprimer ; « ✓ Valider la liste » (`clValidate` → `clDone`) : **petite fenêtre** « Combien ça a coûté ? » (montant ou « Sans montant », titre « Liste terminée 🎉 » si tout est pris), quand le dernier article passe au caddie (`cSelOk` → `clFinish`) la liste part **tout de suite** dans « Terminées » (`clDone(l,0,true)` renvoie l'id) puis la fenêtre « Liste terminée 🎉 » demande le montant (facultatif, met à jour `montant` + `budgetAdd`) → `budgetAdd(…,"courses")`, liste en « Terminées »,
  **plus de rayons** dans une liste (Angel : jamais par catégorie en vrai) : articles dans l'ordre d'ajout, astuce « appui long = rayon » retirée ; **Valider (finie ou pas) = la liste disparaît et part dans « Terminées »** avec tous ses articles (`articles[].pris`), rien ne retourne dans la liste principale (si `recur`, recréée à +7 j avec tous les articles). Option « Ajouter les ingrédients des repas prévus » **retirée** du formulaire (Angel : inutile ; `clAddIng` reste dans le code, plus appelé).
  Couleur de liste = **pastilles** (`CL_COLS`, champ `couleur` ; anciennes listes à emoji : couleur de l'emoji via `clCol`), plus d'emoji ; page vide = « Aucune liste en cours » (plus de liste fictive) ;
  Supprimer / Valider = **instantanés avec « Annuler » 5 s** (28 oct., Angel) : `clUndoable(msg, listes, articles, commit)` cache tout de suite (`S.clHide`, `S.cHideIt`, filtrés par `clAll`/`cItemsOf`), `toastUndo`, la base n'est écrite qu'après 5 s (ou à la fermeture de la page, `COMMITS`) ; dans `clDone` les articles sont supprimés avant de marquer la liste `fini`.
  **Lot du 28 oct.** (Angel : 1 à 5 + réordonner) : **doublons** (`addCourses` : même article pas coché dans la même liste → quantités additionnées si nombres, `S.cMerged` → « Déjà dans la liste : Lait × 2 ») ;
  **ligne d'article** (Angel, 28 oct.) : à droite la quantité = **sélecteur natif** (`<select class=c-qs>` invisible sur la pastille `.c-qb`, 1 à 30, roue sur iPhone), puis **crayon** (`.c-ed` → `cArtEdit` : **petite fenêtre « Renommer »**, le nom seulement, Annuler / OK ; Angel ; renommer avec le nom d'un autre article pas coché de la liste = **réunis**, quantités additionnées), puis × tout à droite ;
  **réordonner** : **rester appuyé sur la ligne** (380 ms, ancien appui long « rayon » remplacé) puis glisser (`cDragStart(row,it,y0)` : écoute la fenêtre, `touchmove` non passif bloque le défilement pendant le déplacement, le clic qui suit est ignoré ; plus de poignée ≡) → `courses.ordre` (même échelle que `ajouteLe` : `cOrd(i)`, un nouvel article va à la fin ; `S.cDrag` bloque les rendus pendant le glisser) ;
  **« Dans quelle liste ? »** (`clPick()` → id, null = liste principale, undefined = annulé ; fenêtre `.clp-ov` ; rien n'est demandé s'il n'y a que la liste principale) pour Repas/frigo (`ingToCourses`), Cocoony (deux chemins), croquettes de l'animal ; **achats d'un événement** → liste à son nom créée toute seule (`evListe(ev)`, `listes.ev`, rose) ;
  **Envoyer** (⋯ → « Envoyer », `clShare` : texte « • 🥛 Lait × 2 », `navigator.share` sinon presse-papiers). Animation d'ouverture **à chaque fois** : la carte refermée garde `cl-x`, `clVT` lui rend son nom (`data-vt`) avant la transition suivante. « ⋯ » : la liste ouverte ne rétrécit plus à l'appui (`.cl-open>.cl-card:active`), menu sans petit triangle (`.ev-pop.no-tip`).
  **Liste ouverte** (choix 2 d'Angel, 27 oct., bloc CSS `.cl-panel …` après `.c-item.on .c-box`) : champ « Ajouter un article… » avec « + » jaune à gauche ; pastilles de suggestions
  (plats `mealMiss()` + habituels : **retirées** par Angel, `#cHab` masqué dans la liste, code gardé) ; « Pour qui » et la carte `#cRepas` masqués dans la liste (« … pour Emma » au clavier marche toujours) ;
  lignes à filets : nom + « × 2 » (`qte` numérique) + « pour les lasagnes » (`platLow`), avatar de qui l'a ajouté s'il n'est pas moi ; « ✓ Valider la liste » en dégradé.
  Estimation du prix d'une liste (« ~22 € ») : essayée puis retirée (Angel).
  « Je fais les courses » / bandeau en direct (`#cLive`) **masqués** (Angel : inutile). **Pas de fin automatique** : même tout coché, c'est nous qui validons (Angel : on peut ajouter un article de dernière minute ; `clFinish` n'est plus appelé). **Emoji devant chaque article** (`foodEmo(nom)`, liste `FOOD_EMO` mot-clé → emoji, mots les plus longs d'abord, pluriels gérés par `foodSg`, rien d'enregistré ; `.f-emo` non barré) dans la liste et l'aperçu des cartes. Titre des cartes 19 px (23 px ouverte), compteur « 🛒 x / y » 15 px. **Cocher un article = juste coché**, à sa place (rond vert, barré ; Angel, 27 oct. : pas d'animation, plus de rubrique « Au caddie », plus de sélection jaune ni de barre ; re-toucher décoche) ; en haut de la liste ouverte « 🛒 2 / 6 » (`.ka-cnt`).
- Anneaux de sélection des ronds de couleur (`.cl-cols`, `.nc-c`, `.coc-opt`, `.tk-cat .ic`, `.tk-dot`) en `outline` + `outline-offset` (les `box-shadow` à 2,5 px se décentraient sur iPhone) ; « + » du champ d'article en SVG centré.
- **Calendriers remis à aujourd'hui** en quittant un écran (`calReset(prevTab)` dans `setTab` : accueil `accDay/accOpen/accMo`, agenda `agDay/agM`, repas `rDay/rWeek/rOpen/rMo`, budget `bMonth`, semaine des tâches `wkDay`) et au retour dans l'app après 5 min.
- Menu « Tes foyers » (`openFoyerMenu`) : **menu de l'app aussi sur iPhone** (pas de `nativeizeMenu`, demandé par Angel).
- App iPhone à jour toute seule : `cd app && npm run auto:ios` (`app/auto.mjs`) sur le Mac d'Angel → récupère `main` toutes les 30 s et
  recharge l'app (via `live.mjs`). Il suffit donc de pousser sur `main`.
- Deux conversations peuvent travailler en parallèle (web et Mac) : toujours `git pull --rebase` avant de modifier,
  pousser après, et republier les deux artefacts (liens plus haut) à chaque modification.
