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
pl(){ /usr/libexec/PlistBuddy -c "Delete :$1" "$PL" 2>/dev/null || true; /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$PL"; }
pl NSCameraUsageDescription "Cocoon utilise l'appareil photo pour ranger tes papiers (bail, carte grise…) et ajouter des photos."
pl NSPhotoLibraryUsageDescription "Cocoon accède à tes photos pour ranger un papier ou choisir une photo de profil."
pl NSPhotoLibraryAddUsageDescription "Cocoon enregistre dans tes photos les papiers que tu télécharges."
pl NSCalendarsUsageDescription "Cocoon peut ajouter les rendez-vous du foyer à ton calendrier."
/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" "$PL" >/dev/null 2>&1 && /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Cocoon" "$PL" || true
echo "Info.plist : autorisations ajoutées"
