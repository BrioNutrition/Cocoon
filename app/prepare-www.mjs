// Prépare le dossier www/ de l'app à partir du site (racine du dépôt).
// PREVIEW=1 : version de démonstration (sans compte) qui se remplit toute seule, pour les captures du simulateur.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."), www = path.resolve(import.meta.dirname, "www");
fs.rmSync(www, { recursive: true, force: true }); fs.mkdirSync(www, { recursive: true });
const copy = (f) => { const s = path.join(root, f); if (fs.existsSync(s)) fs.cpSync(s, path.join(www, f), { recursive: true }); };
for (const f of ["index.html", "cocoon-runtime.js", "config.js", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable.png", "pdfjs", "splash"]) copy(f);
// le module Capacitor (registerPlugin…) pour le code de l'app, sans outil de compilation
const core = path.join(import.meta.dirname, "node_modules", "@capacitor", "core", "dist", "capacitor.js");
const CAP = fs.existsSync(core) ? '<script src="capacitor.js"></script>' : "";
if (CAP) fs.copyFileSync(core, path.join(www, "capacitor.js"));
{ const ix = path.join(www, "index.html"); if (CAP && fs.existsSync(ix)) { let h = fs.readFileSync(ix, "utf8"); h = h.replace(/<head>/i, "<head>" + CAP); fs.writeFileSync(ix, h); } }
if (process.env.PREVIEW === "1") {
  let html = fs.readFileSync(path.join(import.meta.dirname, "preview", "demo.html"), "utf8");
  const auto = fs.readFileSync(path.join(import.meta.dirname, "preview", "auto.js"), "utf8");
  const tag = "<script>" + auto + "</script>";
  if (/^\s*(<!doctype|<html)/i.test(html)) { const i = html.lastIndexOf("</body>"); html = i >= 0 ? html.slice(0, i) + tag + html.slice(i) : html + tag; }
  else html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' + CAP + '</head><body>' + html + tag + "</body></html>";
  fs.writeFileSync(path.join(www, "index.html"), html);
}
console.log("www prêt", process.env.PREVIEW === "1" ? "(aperçu démo)" : "");
