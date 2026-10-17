// Rechargement en direct sur l'iPhone branché (ou le simulateur) : le Mac sert www/ sur le réseau local,
// l'app installée charge cette adresse au lieu de sa copie, et se recharge toute seule dès que www/ change
// (`npm run www` après une modification du site). Le code natif (Swift) demande toujours un ▶︎ dans Xcode.
// Ctrl+C : l'app reprend sa copie locale (il faudra refaire ▶︎ pour la réinstaller sans le Mac).
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os"; 
const dir = import.meta.dirname, www = path.resolve(dir, "www"), PORT = 8100;
const cfgFile = path.resolve(dir, "ios/App/App/capacitor.config.json");
const ip = Object.values(os.networkInterfaces()).flat().find(i => i && i.family === "IPv4" && !i.internal)?.address || "localhost";
const TYPES = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".webmanifest":"application/manifest+json", ".png":"image/png", ".svg":"image/svg+xml", ".webp":"image/webp", ".mjs":"text/javascript", ".wasm":"application/wasm", ".pdf":"application/pdf" };
// la page écoute le Mac et se recharge quand www/ change
const HOOK = '<script>(function(){var es=new EventSource("/__live");es.onmessage=function(){location.reload()};})();</script>';
const clients = new Set(), orig = fs.readFileSync(cfgFile, "utf8");
http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  if (u === "/__live") { r.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" }); r.write(": ok\n\n"); clients.add(r); q.on("close", () => clients.delete(r)); return; }
  let f = path.join(www, u); if (f.endsWith(path.sep)) f = path.join(f, "index.html");
  if (!f.startsWith(www) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" });
  if (f.endsWith("index.html")) { const h = fs.readFileSync(f, "utf8"); const i = h.lastIndexOf("</body>"); return r.end(i >= 0 ? h.slice(0, i) + HOOK + h.slice(i) : h + HOOK); }
  fs.createReadStream(f).pipe(r);
}).listen(PORT, () => {
  // l'app installée charge le Mac au lieu de sa copie
  const cfg = JSON.parse(orig); cfg.server = { url: `http://${ip}:${PORT}`, cleartext: true };
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, "\t"));
  console.log(`\nCocoon servi sur http://${ip}:${PORT}`);
  console.log("→ Dans Xcode : choisis ton iPhone en haut, puis ▶︎ (une fois). Ensuite l'app se recharge toute seule.");
  console.log("→ L'iPhone et le Mac doivent être sur le même Wi-Fi. Ctrl+C pour arrêter.\n");
});
// www/ est recréé à chaque `npm run www` : on surveille le dossier de l'app et on attend la fin de la copie
let t = null;
fs.watch(dir, { recursive: true }, (_, f) => { if (!f || !String(f).startsWith("www")) return;
  clearTimeout(t); t = setTimeout(() => { if (!fs.existsSync(path.join(www, "index.html"))) return; for (const c of clients) c.write("data: reload\n\n"); console.log("↻ rechargé", new Date().toLocaleTimeString("fr-FR")); }, 1000); });
const stop = () => { fs.writeFileSync(cfgFile, orig); console.log("\nL'app reprend sa copie locale (refais ▶︎ dans Xcode pour l'utiliser sans le Mac)."); process.exit(0); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
