# Cocoon sur iPhone : démarrer avec Xcode

L'app iPhone, c'est le site Cocoon (le dossier racine du dépôt) dans une coquille Capacitor, plus un petit module natif
(`ios-native/NativeTabs.swift`) qui affiche la barre d'onglets, les menus et les boutons d'iOS (Liquid Glass sur iOS 26).

## 1. Une seule fois : installer les outils (≈ 1 h, surtout le téléchargement de Xcode)

1. **Xcode** depuis l'App Store (gratuit, ~15 Go). L'ouvrir une fois, accepter la licence, laisser installer les composants iOS.
2. **Outils en ligne de commande** : dans le Terminal, `xcode-select --install`.
3. **Node.js 22** (version LTS) : https://nodejs.org → installer le .pkg.
4. **Git** est fourni avec les outils Xcode. Récupérer le dépôt :
   ```bash
   cd ~/Documents
   git clone https://github.com/BrioNutrition/Cocoon.git
   cd Cocoon/app
   ```

## 2. Une seule fois : créer le projet iOS (≈ 3 min)

```bash
npm run setup:ios
```
Ça installe Capacitor, prépare `www/` à partir du site, crée `ios/`, branche le module natif et ajoute les autorisations
(appareil photo, photos, calendrier) dans `Info.plist`. Le dossier `ios/` n'est pas dans le dépôt : il se régénère.

## 3. Voir l'app

- **Dans Xcode** : `npm run ios` ouvre le projet. En haut, choisir un simulateur (ex. iPhone 17 Pro) puis ▶︎ (Cmd+R).
- **Sans ouvrir Xcode** : `npm run run:ios` (choisit un simulateur dans la liste et lance).
- **Sur ton iPhone** (gratuit, sans compte payant) : brancher l'iPhone en USB, dans Xcode › projet *App* › *Signing & Capabilities*,
  cocher *Automatically manage signing* et choisir ton identifiant Apple (Team « Personal Team »). Sur l'iPhone :
  Réglages › Confidentialité et sécurité › *Mode développeur* à activer, puis Réglages › Général › VPN et gestion de l'appareil › faire confiance.
  Avec un compte gratuit, l'app installée expire au bout de 7 jours (il suffit de relancer depuis Xcode).

## 4. Travailler au quotidien

| Ce qui change | À faire |
|---|---|
| Le code web (`source/assistant-du-foyer.html`) | `bash ../outils/construire.sh` puis `npm run run:ios` (ou ▶︎ dans Xcode après `npx cap sync ios`) |
| Le module natif (`ios-native/NativeTabs.swift`) | recopier dans `ios/App/App/AppDelegate.swift` (ou supprimer `ios/` et relancer `npm run setup:ios`), puis ▶︎ |
| Voir les changements sans recompiler | `npm run live:ios`, puis ▶︎ dans Xcode (une fois) : l'app charge le site depuis ton Mac (même Wi-Fi) et se recharge toute seule à chaque `npm run www`. Ctrl+C pour arrêter, puis ▶︎ pour réinstaller l'app sans le Mac |
| Recevoir tout seul les mises à jour faites par Claude | `npm run auto:ios`, puis ▶︎ dans Xcode (une fois) : comme ci-dessus, et le Mac va chercher les nouveautés sur GitHub toutes les 30 s ; l'app se recharge dès qu'il y en a. Laisser le Terminal ouvert, Mac et iPhone sur le même Wi-Fi. Ctrl+C pour arrêter, puis ▶︎ pour réinstaller l'app sans le Mac |

## 5. Bon à savoir

- **Notifications** : les notifications web actuelles ne marchent pas dans l'app iOS. Il faudra le plugin
  `@capacitor/push-notifications` et une clé APNs (compte Apple Developer payant). La clé APNs va **uniquement dans les secrets
  Supabase** (Edge Functions), jamais dans le dépôt.
- **Publier sur l'App Store / TestFlight** : compte Apple Developer (99 €/an). La clé App Store Connect (.p8) va dans les
  **secrets GitHub**, jamais dans le dépôt.
- **Aperçu sans Mac** (désactivé par défaut) : `.github/workflows/ios-preview.yml` ne se lance plus qu'à la main
  (GitHub › Actions › « Run workflow ») ; captures publiées dans la branche `apercu-ios`.
- **Android** (plus tard) : `npm i @capacitor/android && npx cap add android`. Prévoir le bouton « retour » d'Android.
