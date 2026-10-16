#!/bin/bash
# Construit le site à partir de source/assistant-du-foyer.html et met à jour la racine du dépôt (servie par GitHub Pages).
# Usage : bash outils/construire.sh        (ajoute « demo » pour régénérer aussi la démo dans /tmp/demo-foyer.html)
set -e; cd "$(dirname "$0")"
rm -rf dist && python3 build.py ../source/assistant-du-foyer.html dist/
for f in index.html sw.js cocoon-runtime.js manifest.webmanifest; do cp dist/$f ../$f; done
if [ "$1" = "demo" ]; then python3 demo/make_demo.py ../source/assistant-du-foyer.html /tmp/demo-foyer.html; fi
echo "OK : site reconstruit"
