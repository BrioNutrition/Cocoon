#!/bin/bash
# Branche le code natif de Cocoon dans le projet iOS généré par « npx cap add ios »
set -e
cd "$(dirname "$0")/.."
cat ios-native/NativeTabs.swift >> ios/App/App/AppDelegate.swift
SB=ios/App/App/Base.lproj/Main.storyboard
sed -i '' 's/customClass="CAPBridgeViewController" customModule="Capacitor"/customClass="MainViewController" customModule="App" customModuleProvider="target"/' "$SB"
grep -o 'customClass="[A-Za-z]*"' "$SB"
# Autorisations demandées par l'app (sans elles, iOS ferme l'app dès qu'on prend un papier en photo)
PL=ios/App/App/Info.plist
# plutil plutôt que PlistBuddy : PlistBuddy coupe les textes à l'apostrophe (« l'appareil »)
pl(){ plutil -replace "$1" -string "$2" "$PL"; }
pl NSCameraUsageDescription "Cocoon utilise l'appareil photo pour ranger tes papiers (bail, carte grise…) et ajouter des photos."
pl NSPhotoLibraryUsageDescription "Cocoon accède à tes photos pour ranger un papier ou choisir une photo de profil."
pl NSPhotoLibraryAddUsageDescription "Cocoon enregistre dans tes photos les papiers que tu télécharges."
pl NSLocalNetworkUsageDescription "Cocoon se connecte à ton Mac pendant les essais (rechargement en direct)."
pl NSCalendarsUsageDescription "Cocoon peut ajouter les rendez-vous du foyer à ton calendrier."
/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" "$PL" >/dev/null 2>&1 && /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Cocoon" "$PL" || true
echo "Info.plist : autorisations ajoutées"
# Raccourcis de l'icône (appui long sur Cocoon dans l'écran d'accueil de l'iPhone)
/usr/libexec/PlistBuddy -c "Delete :UIApplicationShortcutItems" "$PL" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :UIApplicationShortcutItems array" "$PL"
i=0
for it in "tache|Nouvelle tâche|checkmark.circle" "courses|Ajouter aux courses|cart" "rdv|Un rendez-vous|calendar" "cocoony|Demander à Cocoony|sparkles"; do
  IFS='|' read -r k t ic <<< "$it"
  /usr/libexec/PlistBuddy -c "Add :UIApplicationShortcutItems:$i dict" "$PL"
  /usr/libexec/PlistBuddy -c "Add :UIApplicationShortcutItems:$i:UIApplicationShortcutItemType string fr.cocoon.app.$k" "$PL"
  /usr/libexec/PlistBuddy -c "Add :UIApplicationShortcutItems:$i:UIApplicationShortcutItemTitle string $t" "$PL"
  /usr/libexec/PlistBuddy -c "Add :UIApplicationShortcutItems:$i:UIApplicationShortcutItemIconSymbolName string $ic" "$PL"
  i=$((i+1))
done
echo "Info.plist : raccourcis de l'icône ajoutés"
