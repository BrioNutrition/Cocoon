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
  window.scrollTo({ top: 260, behavior: "smooth" }); await wait(3500); window.scrollTo({ top: 0 });
  const bk = document.querySelector('.view:not([hidden]) .hub-back'); if (bk) bk.click(); await wait(1500);
  const pa = document.querySelector('.hb-t[data-go="documents"]'); if (pa) pa.click(); await wait(4000);
  tab("moi"); await wait(5000);
  tab("cocoony"); await wait(5000);
  tab("accueil"); await wait(3000);
  document.documentElement.dataset.theme = "light"; await wait(5000);
  tab("hub"); await wait(5000);
})();
