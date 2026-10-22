#!/bin/bash
# Remet à jour le code natif de Cocoon dans le projet iOS (après une modification de ios-native/NativeTabs.swift) :
# retire l'ancienne copie ajoutée à la fin d'AppDelegate.swift et colle la nouvelle. Puis ▶︎ dans Xcode.
set -e
cd "$(dirname "$0")/.."
AD=ios/App/App/AppDelegate.swift
n=$(grep -n '^import LocalAuthentication$' "$AD" | head -1 | cut -d: -f1)
if [ -n "$n" ]; then head -n $((n-1)) "$AD" > "$AD.tmp" && mv "$AD.tmp" "$AD"; fi
cat ios-native/NativeTabs.swift >> "$AD"
echo "Code natif à jour dans $AD : appuie sur ▶︎ dans Xcode."
