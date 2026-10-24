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
  éclairées par un halo de leur couleur (dégradé dans le fond de `.hb-t`, fixe : pas de calque flouté), pastilles dorées, pas de sous-titre sous « Le foyer » (retiré par Angel). Pas de tuile Événements dans le Foyer (retirée par Angel). Tuiles-boutons à ombre dure : proposées puis écartées.
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
- Anniversaires : **rien dans les rendez-vous ni de menu à part** (demandé par Angel) ; tout est dans l'événement « Anniversaire »
  (`evAnnivCard`, onglet Frise) : idées de cadeaux (`evenements.idees`, « Aux achats » = achat de l'événement) et « Le rappeler chaque
  année » (`evenements.annuel`, coché par défaut) → rappel 7 j avant la date suivante, « Préparer celui du … » recrée l'événement.
- Événements : toute la ligne du modèle coche/décoche ; les étapes faites restent dépliées (« N réalisées ») ; sous « Créer avec le
  modèle … », lien « Continuer sans utiliser le modèle » (`#evCreateSans`) qui crée l'événement sans aucune étape.
  Anneaux d'avancement (`evRing`, raccourci `.wg-ring.emo`) : emoji du type au centre (`emoIco`), anneau à la couleur du type sur
  fond teinté, % dans la ligne du bas, pastille verte ✓ à 100 % ; anneau des raccourcis centré en hauteur, plus gros (60 px, 56 en court) et décalé vers la gauche sur les longs ; remplissage animé seulement la 1re fois ou si le % change (`ringNew`).
- « + » de l'Agenda : toujours le menu de l'app « Ajouter à l'agenda » (`evPick`), plus la feuille d'actions iOS (elle attendait sa propre
  animation, d'où la lenteur). « + » des Papiers : menu `openDocAdd()` (« Ajouter un papier » : photo lue par Cocoony, fichier, à la main,
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
  en haut, grand titre juste dessous (« enfin serein. » en dégradé, `.sp-grad`), une phrase, 7 étiquettes des atouts (`.sp-chips`), bouton en bas ;
  cartes `.sp-stickers` masquées ; bandeau « Démo » masqué dans la démo (hunk CSS de `demo_patch.json`) ; fond sombre classique
  (lueur `.sp-aura` retirée et lueurs `.aurora` masquées sur cet écran, demandé par Angel) ; textes affichés 560 ms après le départ du logo.
- **Bienvenue** : « Créer mon cocon » lance directement le questionnaire ; les conditions restent **à la fin** (après le profil, `onboardGate`).
  À la 1re acceptation, `cguWelcome` : confettis sur l'app floutée derrière (`.wb`, flou du fond), Cocoony + bulle « Bienvenue chez toi … ! »
  qui annonce la visite guidée, « C'est parti ! » → visite. Ordre : profil (étape 2) → conditions → Cocoony → visite ; la bienvenue s'ouvre
  par-dessus les conditions (flou immédiat, `after._over`), qui s'effacent dessous. Pop-up « Bienvenue dans ton foyer 🥳 » (`maybeWelcome`) supprimée. Après « Terminer » du profil : plus d'animation
  « Bienvenue chez toi, … » (`reveal` n'est plus appelé), « Avant de commencer » s'affiche aussitôt (`openCgu(w,true)`, sans fondu) pendant que le
  foyer se prépare derrière (`applyPlan`) ; « C'est parti ! » de Cocoony lance la visite tout de suite, son écran s'efface par-dessus. Plus de phrase « Tu pourras relire ces textes… ». Écran « enfin serein » :
  tout apparaît **en même temps** quand le logo arrive en haut à gauche (`flySplash` → `sp-show` après l'atterrissage).
- Fond du questionnaire et du profil (étape 2) : **uni + grain fin**, sans lueurs (choix A d'Angel parmi 5 ; `.aurora i` masqués, grain SVG
  feTurbulence en fond de `.aurora`). Essayés puis écartés : motif maison, cases ou boutons Liquid Glass.
- Fin du questionnaire (`warmup`) : **boîte aux lettres** (`.mbx` : enveloppe qui descend dans la fente, drapeau qui se lève) au lieu du feu de bois,
  une seule ligne « Nous livrons le courrier… » (`WARM_LINES`), plus de sous-titre « Cocoon prépare tout pour vous » (demandé par Angel).
- Récap du questionnaire : chaque groupe montre « Voir le détail / Masquer le détail » (`.wq-hint`) et une flèche qui tourne ; plusieurs groupes ouverts à la fois (`wqRow(...,{multi:true})`, `W.opens`), lignes de détail `.wq-dr`
  (case + titre + infos dessous) ; interrupteurs `.wq-tg` façon iOS (51×31, vert #34C759, pastille qui glisse avec rebond et s'étire à l'appui ;
  bascule visible tout de suite, action 260 ms après). Fiche profil : aperçu revenu en **bannière tout en haut** (`pwCard`), champs blancs en sombre.
- **Conditions / Confidentialité** (`openTerms`, `openPrivacy`) : feuilles `upSheet` comme Cocoon Plus (`#termsPage`, `#privPage`, z-index au-dessus
  de la connexion), même fermeture que Cocoon Plus (flou du fond qui s'efface en fondu, demandé par Angel) ; toucher la poignée `.pp-grab` ferme (toutes les feuilles) ; exposées sur
  `window` pour les liens de l'écran de connexion (avant : ces liens ne faisaient rien, l'app étant dans une IIFE).
- **Fiche profil** : en-tête `#fHead`, puis aperçu en bannière juste au-dessus de la case Identité, puis formulaire (essai « carte à droite » abandonné).
  En-tête (étape, titre, phrase ; « Ton profil » hors inscription) déplacé dans `#fHead`, sur toute la largeur au-dessus des deux colonnes.
  Pas de titre « Profil » ; pendant l'inscription : pas de barre, pas de retour (la mini-barre `hubMini` ignore un titre vide), pas de bande « Démo ». Apparence Automatique/Clair/Sombre : appliquée dès le clic (`E.theme0` = l'ancienne),
  validée par Enregistrer/Terminer (`E.themeOk`), remise comme avant si on quitte sans enregistrer (`closeEditor`) ; boutons l'un sous l'autre en colonne étroite.
- Images instantanées à l'ouverture : photo de Cocoony gardée dans `cocoon.secid` (posée par un petit script avant le gros script),
  miniatures 192 px des photos de profil dans `cocoon.thumbs` (`THUMBS`, `makeThumb`, utilisées par `avatarFor`) ; effacées à la déconnexion.
- App iPhone à jour toute seule : `cd app && npm run auto:ios` (`app/auto.mjs`) sur le Mac d'Angel → récupère `main` toutes les 30 s et
  recharge l'app (via `live.mjs`). Il suffit donc de pousser sur `main`.
- Deux conversations peuvent travailler en parallèle (web et Mac) : toujours `git pull --rebase` avant de modifier,
  pousser après, et republier les deux artefacts (liens plus haut) à chaque modification.
