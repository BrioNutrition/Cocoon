// Mode « mises à jour automatiques » : le Mac sert l'app en direct (live.mjs) et va chercher toutes les 30 s
// les nouveautés poussées sur GitHub (branche main). Dès qu'il y en a, il prépare www/ et l'app se recharge toute seule.
// Une seule fois : ▶︎ dans Xcode après le lancement. Ctrl+C pour arrêter.
import { spawn, execSync } from "node:child_process";
const dir = import.meta.dirname, sh = (c) => execSync(c, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const live = spawn(process.execPath, ["live.mjs"], { cwd: dir, stdio: "inherit" });
const stop = () => { live.kill("SIGINT"); setTimeout(() => process.exit(0), 300); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
let warned = false;
const tick = () => {
  try {
    const avant = sh("git rev-parse HEAD");
    sh("git fetch -q origin main");
    if (sh("git rev-parse origin/main") === avant) return;
    sh("git merge -q --ff-only origin/main");
    console.log("⬇︎ nouvelle version :", sh("git log --oneline -1"));
    if (sh("git diff --name-only " + avant + " HEAD").split("\n").some(f => f.startsWith("app/ios-native/")))
      console.log("⚠︎ le code natif a changé : lance « npm run native:ios » dans un autre Terminal, puis ▶︎ dans Xcode.");
    sh(process.execPath + " prepare-www.mjs"); warned = false;
  } catch (e) {
    if (!warned) console.log("⚠︎ mise à jour impossible (modifications locales ? autre branche ?) :", String(e.stderr || e.message).split("\n")[0]);
    warned = true;
  }
};
setTimeout(tick, 3000); setInterval(tick, 30000);
