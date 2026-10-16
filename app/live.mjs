// Rechargement en direct : sert www/ sur le réseau local et lance l'app dans le simulateur (ou l'iPhone branché)
// en lui disant de charger cette adresse. Après une modification : `npm run www`, puis tire vers le bas / recharge l'app.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { spawn } from "node:child_process";
const www = path.resolve(import.meta.dirname, "www"), PORT = 8100;
const ip = Object.values(os.networkInterfaces()).flat().find(i => i && i.family === "IPv4" && !i.internal)?.address || "localhost";
const TYPES = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".webmanifest":"application/manifest+json", ".png":"image/png", ".svg":"image/svg+xml", ".webp":"image/webp", ".mjs":"text/javascript", ".wasm":"application/wasm", ".pdf":"application/pdf" };
http.createServer((q, r) => { let f = path.join(www, decodeURIComponent(q.url.split("?")[0])); if (f.endsWith(path.sep)) f = path.join(f, "index.html");
  if (!f.startsWith(www) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(r);
}).listen(PORT, () => {
  console.log(`www servi sur http://${ip}:${PORT}`);
  spawn("npx", ["cap", "run", "ios", "--live-reload", "--host", ip, "--port", String(PORT)], { stdio: "inherit", cwd: import.meta.dirname });
});
