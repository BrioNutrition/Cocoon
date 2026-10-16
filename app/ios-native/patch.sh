#!/bin/bash
# Branche le code natif de Cocoon dans le projet iOS généré par « npx cap add ios »
set -e
cd "$(dirname "$0")/.."
cat ios-native/NativeTabs.swift >> ios/App/App/AppDelegate.swift
SB=ios/App/App/Base.lproj/Main.storyboard
sed -i '' 's/customClass="CAPBridgeViewController" customModule="Capacitor"/customClass="MainViewController" customModule="App" customModuleProvider="target"/' "$SB"
grep -o 'customClass="[A-Za-z]*"' "$SB"
