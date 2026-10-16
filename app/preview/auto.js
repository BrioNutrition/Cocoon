/* Aperçu simulateur : remplit la démo toute seule puis passe d'un écran à l'autre (le workflow fait une capture toutes les 3 s) */
(async function(){
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const vis = (e) => !!(e && e.offsetParent !== null);
  async function until(fn, ms) { const t = Date.now(); while (Date.now() - t < (ms || 8000)) { const v = fn(); if (v) return v; await wait(150); } return null; }
  async function click(sel) { const e = await until(() => { const x = $(sel); return vis(x) ? x : null; }); if (e) e.click(); await wait(350); return !!e; }
  async function opt(txt) { const e = await until(() => [...document.querySelectorAll(".opt")].find((x) => vis(x) && x.textContent.includes(txt))); if (e) e.click(); await wait(250); return !!e; }
  async function fill(sel, v) { const e = await until(() => { const x = $(sel); return vis(x) ? x : null; }); if (!e) return; e.focus(); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); e.blur(); await wait(200); }
  const next = () => click("#wzNext");
  window.__noTour = 1;
  { const C = window.Capacitor || {}, d = document.createElement("div");
    d.style.cssText = "position:fixed;z-index:2147483647;left:8px;right:8px;top:60px;background:#000c;color:#0f0;font:11px/1.3 monospace;padding:6px;border-radius:8px;pointer-events:none";
    d.textContent = "diag · native=" + (C.isNativePlatform ? C.isNativePlatform() : "?") + " · registerPlugin=" + typeof C.registerPlugin + " · nativePromise=" + typeof C.nativePromise + " · plugins=" + Object.keys(C.Plugins || {}).join(",") + " · class=" + document.documentElement.className;
    document.body.appendChild(d); setTimeout(() => d.remove(), 9000); }
  await wait(1500);
  if (!(await click("#spGo"))) return;
  await fill("#wzNom", "Nours"); await next();
  await opt("En couple"); await fill("#wzPart", "Emma"); await next();
  await opt("Pas d"); await next();
  await opt("Appartement"); await opt("Locataire"); await next();
  await next(); await opt("Aucun"); await next();
  for (let k = 0; k < 8; k++) { if ([...document.querySelectorAll(".opt")].some((x) => vis(x) && x.textContent.includes("Suivre les colis"))) break; await opt("Moitié-moitié"); await next(); }
  await opt("Suivre les colis"); await next(); await next();
  await wait(4500);
  await fill("#fiNom", "Angel"); await fill("#fiNaissance", "1990-05-04"); await click("#fiSave");
  await wait(7000);
  await click(".cgu-ck"); await click(".cgu .btn.big");
  await wait(1500);
  for (let k = 0; k < 6; k++) { const b = $(".tour-card .btn.ghost"); if (vis(b)) b.click(); const n = $(".cx-ask-no"); if (vis(n)) n.click(); await wait(500); }
  const tab = (t) => { const b = document.querySelector('#tabs .tab[data-tab="' + t + '"]'); if (b) b.click(); };
  await wait(5000);                     // accueil
  tab("hub"); await wait(5000);         // le foyer
  const ag = document.querySelector('.hb-t[data-go="agenda"]'); if (ag) ag.click(); await wait(2500);
  document.querySelectorAll(".prem-page:not([hidden])").forEach((p) => p.click()); await wait(3500);
  tab("moi"); await wait(5000);
  tab("cocoony"); await wait(5000);
  tab("accueil"); await wait(3000);
  document.documentElement.dataset.theme = "dark"; await wait(5000);
  tab("hub"); await wait(5000);
})();
