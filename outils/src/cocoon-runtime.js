/* =========================================================
   Cocoon · moteur hébergé (Supabase)
   Remplace l'environnement Claude (window.claude.use) :
   - "db"        : base partagée du foyer, temps réel
   - "user"      : compte connecté
   - "assets"    : photos et PDF des papiers
   - "downloads" : téléchargement de fichiers (agenda, export)
   - "sample"    : indisponible hors de Claude → le secrétaire passe en mode simple
   ========================================================= */
(function () {
  "use strict";
  var CFG = window.COCOON_CONFIG || {};
  var BUCKET = "cocoon";
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (_) {} }
  };

  /* ---------- Invitation dans l'URL : ?rejoindre=<foyer>.<code> ---------- */
  (function keepInvite() {
    try {
      var u = new URL(location.href), j = u.searchParams.get("rejoindre");
      if (j) { LS.set("cocoon.join", j); u.searchParams.delete("rejoindre"); history.replaceState(null, "", u.pathname + (u.search || "") + u.hash); }
      if (/type=invite/.test(location.hash)) LS.set("cocoon.setpw", "1");
    } catch (_) {}
  })();

  if (!CFG.url || !CFG.key || /VOTRE|xxxx/.test(CFG.url + CFG.key)) {
    document.addEventListener("DOMContentLoaded", function () {
      gate().show("setup");
    });
    window.claude = { use: function () { return new Promise(function () {}); } };
    return;
  }

  /* supabase-js est chargé en asynchrone (la page s'affiche tout de suite) */
  var sb = null;
  function keep() { return LS.get("cocoon.keep") !== "0"; }
  var authStore = {
    getItem: function (k) { try { return (keep() ? localStorage : sessionStorage).getItem(k); } catch (_) { return null; } },
    setItem: function (k, v) { try { if (keep()) { localStorage.setItem(k, v); sessionStorage.removeItem(k); } else { sessionStorage.setItem(k, v); localStorage.removeItem(k); } } catch (_) {} },
    removeItem: function (k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (_) {} }
  };
  var SBP = new Promise(function (res) {
    function ok() { if (window.supabase && !sb) { sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "cocoon.auth", storage: authStore } }); res(); } }
    if (window.supabase) return ok();
    var t = document.getElementById("sbjs"); if (t) { t.addEventListener("load", ok);
      /* hors connexion au lancement : on retente le chargement quand le réseau revient */
      t.addEventListener("error", function () { window.addEventListener("online", function re() { if (window.supabase) return; var n = document.createElement("script"); n.src = t.src; n.onload = ok; document.head.appendChild(n); window.removeEventListener("online", re); }); }); }
    var iv = setInterval(function () { if (window.supabase) { clearInterval(iv); ok(); } }, 40);
  });
  function introOut() { try { if (window.cxIntroOut) window.cxIntroOut(); } catch (_) {} }
  var ME = null, FOYER = null, ROLE = "membre", INVITE = null, DELETING = false;
  var readyResolve, READY = new Promise(function (r) { readyResolve = r; });
  var liveResolve, LIVE = new Promise(function (r) { liveResolve = r; }); /* connexion Supabase confirmée */
  var FROM_SNAP = false;

  /* =================== Écran de connexion =================== */
  var G = null;
  var started = false;
  function gate() {
    if (G) return G;
    var css = document.createElement("style");
    css.textContent = [
      "#cxGate{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px 18px;background:#F6F5FB;color:#1C1B2E;font-family:'Bricolage Grotesque','Avenir Next',system-ui,-apple-system,sans-serif;overflow:auto}",
      "#cxGate[hidden]{display:none!important}",
      "#cxGate .cx-card{width:min(400px,100%);display:grid;gap:14px;text-align:center}",
      "#cxGate .cx-logo{width:84px;height:84px;margin:0 auto 2px;border-radius:24px;box-shadow:0 10px 30px rgba(60,40,120,.18)}",
      "#cxGate h1{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:800;font-size:34px;letter-spacing:-.03em;margin:0}",
      "#cxGate p{margin:0;color:#5A5876;font-size:15.5px;line-height:1.45}#cxGate h1+p{margin-top:-10px}#cxGate .cx-ok{width:72px;height:72px;margin:0 auto 6px;border-radius:50%;background:#3CC37A;color:#fff;display:grid;place-items:center;animation:cxOk .5s cubic-bezier(.3,1.5,.5,1) both}@keyframes cxOk{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}#cxGate .cx-code{font-size:26px!important;letter-spacing:.3em;text-align:center;font-weight:800}#cxGate .cx-pw{position:relative;display:block}#cxGate .cx-pw input{width:100%;box-sizing:border-box;padding-right:52px}#cxGate .cx-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:42px;height:42px;border:0;background:none;border-radius:12px;color:#5A5876;display:grid;place-items:center;cursor:pointer;padding:0}#cxGate .cx-eye[aria-pressed='true']{color:#1C1B2E}#cxGate h1+p+form,#cxGate h1+p+.cx-inv{margin-top:8px}",
      "#cxGate form{display:grid;gap:10px;text-align:left;margin-top:6px}",
      "#cxGate label{font-size:13px;font-weight:600;color:#5A5876;display:grid;gap:5px}",
      "#cxGate input{font:inherit;font-size:16px;padding:13px 14px;border-radius:14px;border:2px solid #E3E0F0;background:#fff;color:#1C1B2E;outline:none}",
      "#cxGate input:focus{border-color:#1C1B2E}",
      "#cxGate .cx-btn{font:inherit;font-weight:700;font-size:17px;border:0;border-radius:16px;padding:15px;background:#1C1B2E;color:#fff;cursor:pointer;margin-top:4px}",
      "#cxGate .cx-btn.alt{background:linear-gradient(135deg,#FFD66B,#FFB38A,#FF9CB0);color:#1C1B2E}",
      "#cxGate .cx-btn[disabled]{opacity:.6}",
      "#cxGate .cx-legal{margin:10px 0 0;font-size:12.5px;line-height:1.45;color:#6A6886;text-align:center}#cxGate .cx-legal .cx-link{font-size:12.5px;padding:2px}" +
      "#cxGate .cx-link{font:inherit;border:0;background:none;color:#3D3A5C;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:6px;font-size:14.5px}",
      "#cxGate .cx-keep{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:inherit;cursor:pointer;margin:2px 0}",
      "#cxGate .cx-keep input{width:22px;height:22px;accent-color:#1C1B2E;margin:0;padding:0}",
      "#cxGate .cx-msg{font-size:14px;padding:10px 12px;border-radius:12px;background:#FFF1D6;color:#6B4A00;text-align:left}",
      "#cxGate .cx-msg.err{background:#FFE3DD;color:#8A2A16}",
      "#cxGate .cx-msg[hidden]{display:none}",
      "#cxGate .cx-inv{font-size:14px;padding:10px 12px;border-radius:12px;background:#E5F6EC;color:#1E5B38}",
      (function () {
        var R = [
          ["", "background:#13121C;color:#EDEBF7"],
          [" p, label, .cx-eye", "color:#A3A0BE"],
          [" .cx-eye[aria-pressed='true']", "color:#EDEBF7"],
          [" input", "background:#1E1D2B;border-color:#3A3852;color:#EDEBF7"],
          [" input:focus", "border-color:#FFC94A"],
          [" .cx-btn", "background:#FFC94A;color:#1C1B2E"],
          [" .cx-keep input", "accent-color:#FFC94A"],
          [" .cx-link", "color:#D8D5EA"],
          [" .cx-msg", "background:#3A3020;color:#FFE3A0"],
          [" .cx-msg.err", "background:#3D2226;color:#FFB3A6"],
          [" .cx-inv", "background:#1F3A2A;color:#BFE8CD"],
          [" .cx-logo", "box-shadow:0 10px 30px rgba(0,0,0,.45)"]
        ];
        function blk(p) { return R.map(function (r) { return r[0].split(",").map(function (x) { return p + " #cxGate" + (x.trim() ? " " + x.trim() : ""); }).join(",") + "{" + r[1] + "}"; }).join(""); }
        return "@media (prefers-color-scheme: dark){" + blk(':root:not([data-theme="light"])') + "}" + blk(':root[data-theme="dark"]');
      })()
    ].join("");
    document.head.appendChild(css);
    var g = document.createElement("div");
    g.id = "cxGate"; g.hidden = true;
    g.innerHTML = '<div class="cx-card" role="dialog" aria-label="Connexion à Cocoon"></div>';
    document.body.appendChild(g);
    var card = g.firstChild;
    function logoSrc() { var l = document.querySelector(".brand-logo"); return l ? l.src : ""; }
    function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function msg(t, err) { var m = card.querySelector(".cx-msg"); if (!m) return; m.hidden = !t; m.textContent = t || ""; m.className = "cx-msg" + (err ? " err" : ""); }
    function head(title, sub) {
      var invite = LS.get("cocoon.join");
      return '<img class="cx-logo" alt="" src="' + logoSrc() + '"><h1>' + esc(title) + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") +
        (invite && G.mode !== "foyer" && G.mode !== "join" ? '<div class="cx-inv">Tu as reçu une invitation : connecte-toi ou crée ton compte pour rejoindre le foyer.</div>' : "");
    }
    G = {
      mode: null,
      show: function (mode, extra) {
        G.mode = mode; g.hidden = false; if (mode !== "wait") introOut();
        if (mode === "setup") {
          card.innerHTML = head("Cocoon", "L'app n'est pas encore reliée à sa base de données. Renseigne l'adresse et la clé Supabase dans <b>config.js</b>.");
          return;
        }
        if (mode === "login" || mode === "signup") {
          var sign = mode === "signup";
          card.innerHTML = head(sign ? "Créer mon compte" : "Bienvenue sur Cocoon", sign ? "Un compte par personne : chacun a son espace perso dans le foyer." : "Le carnet partagé de la maison.") +
            '<form autocomplete="on"><label>E-mail<input type="email" name="email" autocomplete="email" required inputmode="email"></label>' +
            '<label>Mot de passe<input type="password" name="pw" minlength="6" autocomplete="' + (sign ? "new-password" : "current-password") + '" required></label>' +
            '<label class="cx-keep"><input type="checkbox" name="keep"' + (keep() ? " checked" : "") + '><span>Rester connecté</span></label>' +
            '<div class="cx-msg" hidden></div><button class="cx-btn" type="submit">' + (sign ? "Créer mon compte" : "Se connecter") + "</button></form>" +
            '<button class="cx-link" type="button" data-go="' + (sign ? "login" : "signup") + '">' + (sign ? "J'ai déjà un compte" : "Pas encore de compte ? Créer un compte") + "</button>" +
            (sign ? "" : '<button class="cx-link" type="button" data-go="forgot">Mot de passe oublié</button>') +
            '<p class="cx-legal">' + (sign ? "En créant un compte, tu acceptes les " : "") + '<button class="cx-link cx-priv" type="button" data-terms="1">' + (sign ? "conditions d'utilisation" : "Conditions d'utilisation") + '</button>' + (sign ? " et la " : " · ") + '<button class="cx-link cx-priv" type="button" data-priv="1">' + (sign ? "politique de confidentialité" : "Confidentialité") + "</button>" + (sign ? "." : "") + "</p>";
          var f = card.querySelector("form");
          if (extra) msg(extra.t, extra.err);
          f.addEventListener("submit", async function (e) {
            e.preventDefault();
            var b = f.querySelector(".cx-btn"), em = f.email.value.trim(), pw = f.pw.value;
            LS.set("cocoon.keep", f.keep && !f.keep.checked ? "0" : "1");
            b.disabled = true; msg(""); await SBP;
            try {
              if (sign) {
                var r = await sb.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname } });
                if (r.error) throw r.error;
                if (!r.data.session) { G.show("code", { email: em, type: "signup" }); return; }
              } else {
                FRESH = true; var r2 = await sb.auth.signInWithPassword({ email: em, password: pw });
                if (r2.error) { FRESH = false; throw r2.error; }
              }
            } catch (err) { msg(frErr(err), true); }
            finally { b.disabled = false; }
          });
          bindGo();
          /* focus auto sur l'e-mail, sauf si on a déjà commencé à remplir (sinon le texte tapé part dans le mauvais champ),
             et jamais sur téléphone : le clavier s'ouvrirait tout seul (par ex. juste après « Se déconnecter ») */
          var touch = false; try { touch = matchMedia("(pointer: coarse)").matches; } catch (_) {}
          if (!touch) setTimeout(function () { var i = f.email; if (i && !i.value && !f.pw.value && !f.contains(document.activeElement)) i.focus(); }, 60);
          return;
        }
        if (mode === "forgot") {
          card.innerHTML = head("Mot de passe oublié", "On t'envoie un code par e-mail pour en choisir un nouveau, sans quitter l'app.") +
            '<form><label>E-mail<input type="email" name="email" autocomplete="email" required></label><div class="cx-msg" hidden></div><button class="cx-btn" type="submit">Recevoir le code</button></form>' +
            '<button class="cx-link" type="button" data-go="login">Retour</button>';
          var f2 = card.querySelector("form");
          f2.addEventListener("submit", async function (e) {
            e.preventDefault(); var b = f2.querySelector("button"); b.disabled = true;
            var em2 = f2.email.value.trim(); await SBP; var r = await sb.auth.resetPasswordForEmail(em2, { redirectTo: location.origin + location.pathname });
            b.disabled = false; if (r.error) { msg(frErr(r.error), true); return; } G.show("code", { email: em2, type: "recovery" });
          });
          bindGo(); return;
        }
        if (mode === "pwok") {
          card.innerHTML = '<div class="cx-ok" aria-hidden="true"><svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
            "<h1>Mot de passe enregistré</h1><p>C'est bon, il est changé. On t'emmène dans ton foyer…</p>";
          return;
        }
        if (mode === "code") {
          var cem = (extra && extra.email) || "", ctype = (extra && extra.type) || "signup";
          card.innerHTML = head("Vérifie ta boîte mail", "On a envoyé un code à <b>" + esc(cem) + "</b>. Tape-le ici, sans quitter l'app.") +
            '<form><label>Code reçu par e-mail<input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,10}" maxlength="10" required class="cx-code" placeholder="123456"></label><div class="cx-msg" hidden></div><button class="cx-btn" type="submit">Valider</button></form>' +
            '<button class="cx-link" type="button" data-act="again">Renvoyer un code</button><button class="cx-link" type="button" data-go="' + (ctype === "recovery" ? "forgot" : "signup") + '">Changer d\'adresse</button>' +
            '<p class="cx-legal">Tu peux aussi toucher le bouton du mail : ça marche, mais ça ouvre le navigateur.</p>';
          var f4 = card.querySelector("form");
          f4.addEventListener("submit", async function (e) {
            e.preventDefault(); var b = f4.querySelector("button"); b.disabled = true; msg(""); await SBP;
            var r = await sb.auth.verifyOtp({ email: cem, token: f4.code.value.replace(/\s/g, ""), type: ctype });
            b.disabled = false;
            if (r.error) { msg(frErr(r.error), true); return; }
            if (ctype === "recovery") { var ru = r.data.user || (r.data.session && r.data.session.user); if (ru) LS.set(DEV2FA + ru.id, "1"); G.show("newpw"); return; }
            var cu = r.data.user || (r.data.session && r.data.session.user); if (cu) LS.set(DEV2FA + cu.id, "1");
            G.show("wait"); if (!started) afterLogin(cu);
          });
          card.querySelector('[data-act="again"]').addEventListener("click", async function (e) { var b = e.target; b.disabled = true; await SBP;
            var r = ctype === "recovery" ? await sb.auth.resetPasswordForEmail(cem, { redirectTo: location.origin + location.pathname }) : await sb.auth.resend({ type: "signup", email: cem, options: { emailRedirectTo: location.origin + location.pathname } });
            b.disabled = false; msg(r.error ? frErr(r.error) : "Nouveau code envoyé.", !!r.error); });
          bindGo(); setTimeout(function () { try { f4.code.focus(); } catch (_) {} }, 80);
          return;
        }
        if (mode === "newpw") {
          card.innerHTML = head(LS.get("cocoon.setpw") ? "Choisis ton mot de passe" : "Nouveau mot de passe", "") +
            '<form><label>Nouveau mot de passe<input type="password" name="pw" minlength="6" autocomplete="new-password" required></label><div class="cx-msg" hidden></div><button class="cx-btn" type="submit">Enregistrer</button></form>';
          var f3 = card.querySelector("form"); if (extra) msg(extra.t, extra.err);
          f3.addEventListener("submit", async function (e) {
            e.preventDefault(); await SBP; var r = await sb.auth.updateUser({ password: f3.pw.value });
            if (r.error) { msg(frErr(r.error), true); return; }
            LS.del("cocoon.setpw"); var u = r.data.user; G.show("pwok");
            setTimeout(function () { G.hide(); if (!started) afterLogin(u); }, 1600);
          });
          return;
        }
        if (mode === "join") {
          var has = extra && extra.has;
          card.innerHTML = head("Une invitation t'attend", "Quelqu'un t'a envoyé un lien pour rejoindre <b>son foyer</b> dans Cocoon. Tu y verras ses tâches, ses courses, son agenda et ses papiers partagés.") +
            '<div class="cx-msg" hidden></div><button class="cx-btn" type="button" data-act="join">Rejoindre ce foyer</button>' +
            '<button class="cx-btn alt" type="button" data-act="own">' + (has ? "Non merci, garder mon foyer" : "Non, créer mon propre foyer") + '</button>' +
            '<button class="cx-link" type="button" data-act="out">Se déconnecter</button>';
          card.querySelector('[data-act="join"]').addEventListener("click", function (e) { e.target.disabled = true; e.target.textContent = "On t'ajoute au foyer…"; afterLogin(ME, "join"); });
          card.querySelector('[data-act="own"]').addEventListener("click", function () { LS.del("cocoon.join"); G.show("wait"); afterLogin(ME); });
          card.querySelector('[data-act="out"]').addEventListener("click", function () { LS.del("cocoon.join"); logout(); });
          return;
        }
        if (mode === "foyer") {
          card.innerHTML = head("Ton foyer", "Crée ton foyer pour commencer. Pour rejoindre celui de quelqu'un, demande-lui son <b>lien d'invitation</b> (dans Cocoon : onglet Moi → Mon compte) et ouvre-le.") +
            '<div class="cx-msg" hidden></div><button class="cx-btn alt" type="button" data-act="create">Créer mon foyer</button>' +
            '<button class="cx-link" type="button" data-act="out">Se déconnecter</button>';
          if (extra) msg(extra.t, extra.err);
          card.querySelector('[data-act="create"]').addEventListener("click", async function (e) {
            var btn = e.target; btn.disabled = true; btn.textContent = "Création du foyer…";
            await SBP; var r = await sb.rpc("cocoon_create_foyer");
            if (r.error) { btn.disabled = false; btn.textContent = "Créer mon foyer"; msg(frErr(r.error), true); return; }
            LS.set("cocoon.foyer", r.data.id);
            FOYER = r.data.id; INVITE = r.data.code; ROLE = "admin"; ALL = true; /* foyer neuf : rien à charger */
            finish();
          });
          card.querySelector('[data-act="out"]').addEventListener("click", logout);
          return;
        }
        if (mode === "mail2fa") {
          /* Double authentification : un code par e-mail à la première connexion sur cet appareil (ou après une déconnexion).
             iOS propose le code reçu dans Mail au-dessus du clavier (champ « one-time-code ») : un toucher suffit. */
          var mu = extra && extra.user, macc = extra && extra.acc, mem = (mu && mu.email) || "";
          card.innerHTML = head("Vérifie que c'est toi", "On a envoyé un code à <b>" + esc(mem) + "</b>. Sur iPhone, il apparaît au-dessus du clavier : touche-le, c'est tout.") +
            '<form><label>Code reçu par e-mail<input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,10}" maxlength="10" required class="cx-code" placeholder="123456"></label><div class="cx-msg" hidden></div><button class="cx-btn" type="submit">Valider</button></form>' +
            '<button class="cx-link" type="button" data-act="again">Renvoyer un code</button><button class="cx-link" type="button" data-act="out">Se déconnecter</button>' +
            '<p class="cx-legal">Demandé une seule fois par appareil : la prochaine fois, Cocoon s\'ouvre directement.</p>';
          var f6 = card.querySelector("form");
          var send = async function () { await SBP; var r = await sb.auth.signInWithOtp({ email: mem, options: { shouldCreateUser: false } }); if (r.error) msg(frErr(r.error), true); return !r.error; };
          send();
          card.querySelector('[data-act="out"]').addEventListener("click", logout);
          card.querySelector('[data-act="again"]').addEventListener("click", async function (e) { var b = e.target; b.disabled = true; var ok = await send(); b.disabled = false; if (ok) msg("Nouveau code envoyé.", false); });
          f6.addEventListener("submit", async function (e) {
            e.preventDefault(); var b = f6.querySelector("button"), code = String(f6.code.value || "").replace(/\D/g, "");
            if (code.length < 6) { msg("Tape les chiffres du code reçu.", true); return; }
            b.disabled = true; msg(""); await SBP;
            var r = await sb.auth.verifyOtp({ email: mem, token: code, type: "email" });
            if (r.error) { b.disabled = false; msg(frErr(r.error), true); return; }
            var u2 = r.data.user || mu; LS.set(DEV2FA + u2.id, "1"); G.show("wait"); afterLogin(u2, macc);
          });
          return;
        }
        if (mode === "wait") { card.innerHTML = head("Cocoon", "Connexion…"); }
      },
      hide: function () { g.hidden = true; G.mode = null; }
    };
    /* Petit œil pour afficher le mot de passe pendant qu'on le tape */
    var EYE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    var EYE_OFF = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7c2 0 3.7.7 5.1 1.6M22 12s-3.6 7-10 7c-2 0-3.7-.7-5.1-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';
    function addEyes() {
      card.querySelectorAll('input[type="password"]').forEach(function (inp) {
        if (inp.parentNode.classList && inp.parentNode.classList.contains("cx-pw")) return;
        var w = document.createElement("span"); w.className = "cx-pw"; inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
        var b = document.createElement("button"); b.type = "button"; b.className = "cx-eye"; b.setAttribute("aria-label", "Afficher le mot de passe"); b.setAttribute("aria-pressed", "false"); b.innerHTML = EYE;
        w.appendChild(b);
      });
    }
    /* Bascule fiable (iPhone compris) : on agit au relâcher du doigt, sans laisser le champ perdre le focus */
    function eyeToggle(b) { var w = b.parentNode, inp = w && w.querySelector("input"); if (!inp) return;
      var show = inp.type === "password", had = document.activeElement === inp, n = inp.value.length;
      inp.type = show ? "text" : "password"; b.innerHTML = show ? EYE_OFF : EYE; b.setAttribute("aria-pressed", String(show)); b.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
      if (had) { try { inp.blur(); inp.focus({ preventScroll: true }); inp.setSelectionRange(n, n); } catch (_) {} } }
    var eyeT = 0;
    card.addEventListener("touchend", function (e) { var b = e.target.closest && e.target.closest(".cx-eye"); if (!b) return; e.preventDefault(); eyeT = Date.now(); eyeToggle(b); }, { passive: false });
    card.addEventListener("mousedown", function (e) { if (e.target.closest && e.target.closest(".cx-eye")) e.preventDefault(); });
    card.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".cx-eye"); if (!b) return; e.preventDefault(); if (Date.now() - eyeT < 600) return; eyeToggle(b); });
    try { new MutationObserver(function () { addEyes(); }).observe(card, { childList: true, subtree: true }); } catch (_) {}
    var _show = G.show; G.show = function () { var r = _show.apply(G, arguments); try { addEyes(); } catch (_) {} return r; };
    function bindGo() { card.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { G.show(b.getAttribute("data-go")); }); });
      card.querySelectorAll("[data-priv]").forEach(function (b) { b.addEventListener("click", function () { if (typeof window.openPrivacy === "function") window.openPrivacy(); }); });
      card.querySelectorAll("[data-terms]").forEach(function (b) { b.addEventListener("click", function () { if (typeof window.openTerms === "function") window.openTerms(); }); }); }
    return G;
  }
  function frErr(e) {
    var m = String((e && (e.message || e.error_description)) || e || "");
    if (/Invalid login/i.test(m)) return "E-mail ou mot de passe incorrect.";
    if (/Token has expired|invalid.*token|otp/i.test(m)) return "Code incorrect ou expiré : vérifie-le, ou demande un nouveau code.";
    if (/Email not confirmed/i.test(m)) return "Confirme d'abord ton adresse : clique sur le lien reçu par e-mail.";
    if (/already registered|already exists/i.test(m)) return "Un compte existe déjà avec cet e-mail : connecte-toi.";
    if (/Password should be/i.test(m)) return "Le mot de passe doit faire au moins 6 caractères.";
    if (/rate limit|too many/i.test(m)) return "Trop d'essais d'un coup : réessaie dans quelques minutes.";
    if (/fetch|network/i.test(m)) return "Pas de connexion internet.";
    return m || "Une erreur est survenue.";
  }
  async function logout() { try { if (ME) LS.del(DEV2FA + ME.id); } catch (_) {}
 try { await Promise.race([PUSH.disable(), new Promise(function (r) { setTimeout(r, 2500); })]); } catch (_) {} LS.del("cocoon.snap"); LS.del("cocoon.outbox"); LS.del("cocoon.foyer"); try { await SBP; await sb.auth.signOut(); } catch (_) {} authStore.removeItem("cocoon.auth"); location.reload(); }

  /* =================== Session & foyer =================== */
  /* Double authentification : code par e-mail tant que cet appareil n'a pas été vérifié (oublié à la déconnexion) */
  var DEV2FA = "cocoon.dev2fa.";
  function mailReady(user, acc) {
    if (!CFG.codeEmail || LS.get(DEV2FA + user.id)) return true;   /* interrupteur dans config.js */
    gate().show("mail2fa", { user: user, acc: acc });
    return false;
  }
  /* App iPhone : Face ID à la connexion (après « Se connecter » seulement, pas à chaque ouverture).
     Proposé la première fois ; ensuite demandé à chaque connexion s'il est activé (Moi › Réglages). */
  var FRESH = false;
  async function faceIdStep() {
    var N = window.__nt, C = window.Capacitor;
    try {
      /* le pont natif est créé par la page : on l'attend un instant si on est dans l'app */
      if (!N && C && C.isNativePlatform && C.isNativePlatform()) { for (var k = 0; k < 20 && !window.__nt; k++) await new Promise(function (r) { setTimeout(r, 100); }); N = window.__nt; }
      if (!N || !N.faceid || !N.faceidCheck || !N.alert) return true;
      var st = await N.faceid({}); if (!st || !st.available) return true;
      var lab = st.label || "Face ID";
      if (!st.asked) {
        var r = await N.alert({ title: "Utiliser " + lab + " à la connexion ?", message: "Après ton mot de passe, " + lab + " confirmera que c'est bien toi. Tu pourras changer d'avis dans Moi › Réglages.",
          actions: [{ id: "no", title: "Plus tard", style: "cancel" }, { id: "ok", title: "Activer", style: "default" }] });
        var on = !!(r && r.id === "ok"); st = await N.faceid({ enabled: on, asked: true }); if (!on) return true;
      }
      if (!st.enabled) return true;
      for (;;) {
        var c = await N.faceidCheck({ reason: "Confirme que c'est bien toi pour ouvrir Cocoon" });
        if (c && c.ok) return true;
        var r2 = await N.alert({ title: lab + " n'a pas abouti", message: "Pour ouvrir Cocoon, confirme que c'est bien toi.",
          actions: [{ id: "out", title: "Se déconnecter", style: "destructive" }, { id: "again", title: "Réessayer", style: "cancel" }] });
        if (!r2 || r2.id !== "again") { logout(); return false; }
      }
    } catch (_) { return true; }
  }
  async function afterLogin(user, acc) {
    if (!user) return;
    if (!mailReady(user, acc)) return;
    if (FRESH) { FRESH = false; if (!(await faceIdStep())) return; }
    ME = user;
    var join = LS.get("cocoon.join");
    /* Un lien d'invitation ne fait plus entrer dans un foyer sans le demander */
    if (join && acc !== "join") {
      var jf = join.split(".")[0], mm = await sb.from("cocoon_members").select("foyer").eq("user_id", user.id);
      var mine = (mm.data || []).map(function (x) { return x.foyer; });
      if (mine.indexOf(jf) >= 0) { LS.del("cocoon.join"); LS.set("cocoon.foyer", jf); join = null; }
      else { gate().show("join", { has: mine.length > 0 }); return; }
    }
    if (join) {
      var p = join.split("."), r = await sb.rpc("cocoon_join_foyer", { f: p[0], c: p[1] || "" });
      LS.del("cocoon.join");
      if (r.error || r.data !== true) { gate().show("foyer", { t: "Ce lien d'invitation n'est plus valable. Demande un nouveau lien.", err: true }); return; }
      LS.set("cocoon.foyer", p[0]);
    }
    var m = await sb.from("cocoon_members").select("foyer,role,cocoon_foyers(owner,code)").eq("user_id", user.id);
    if (m.error) { gate().show("foyer", { t: frErr(m.error), err: true }); return; }
    if (!m.data.length) { gate().show("foyer"); return; }
    var want = LS.get("cocoon.foyer"), row = m.data.find(function (x) { return x.foyer === want; }) || m.data[0];
    FOYER = row.foyer; ROLE = row.role; LS.set("cocoon.foyer", FOYER);
    var f = row.cocoon_foyers; if (Array.isArray(f)) f = f[0];
    if (f) { INVITE = f.code; if (f.owner === user.id) ROLE = "admin"; }
    await preload();
    finish();
  }
  function finish() {
    gate().hide();
    var top = function () { try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (_) { window.scrollTo(0, 0); } };
    top(); requestAnimationFrame(function () { top(); requestAnimationFrame(top); }); setTimeout(top, 400);
    if (!started) { started = true; startRealtime(); liveResolve(); readyResolve(); saveSnapSoon(); IS_LIVE = true; run(); }
    if (LS.get("cocoon.setpw")) gate().show("newpw", { t: "Bienvenue ! Choisis un mot de passe pour te reconnecter plus tard." });
  }
  /* Charge tout le foyer en une seule requête (au lieu d'une par rubrique) */
  async function preload() {
    try {
      var all = {}, from = 0, step = 1000;
      for (;;) {
        var r = await sb.from("cocoon_docs").select("path,id,data").eq("foyer", FOYER).range(from, from + step - 1);
        if (r.error) return;
        r.data.forEach(function (row) { (all[row.path] = all[row.path] || {})[row.id] = row.data; });
        if (r.data.length < step) break; from += step;
      }
      overlay(all);
      Object.keys(all).forEach(function (p) { cache[p] = all[p]; });
      ALL = true;
    } catch (_) {}
  }
  var DOMP = new Promise(function (r) { if (document.readyState !== "loading") r(); else document.addEventListener("DOMContentLoaded", r); });
  DOMP.then(function () {
    var urlAuth = /access_token=|type=recovery|code=/.test(location.hash + location.search);
    if (urlAuth) { try { localStorage.setItem("foyer.tab", "accueil"); } catch (_) {} }
    if (!FROM_SNAP && !authStore.getItem("cocoon.auth") && !urlAuth && (!G || !G.mode)) gate().show(LS.get("cocoon.join") ? "signup" : "login");
  });
  Promise.all([SBP, DOMP]).then(async function () {
    sb.auth.onAuthStateChange(function (ev, session) {
      if (ev === "PASSWORD_RECOVERY") { if (!G || G.mode !== "newpw") gate().show("newpw"); return; }
      if (ev === "SIGNED_IN" && session && !started && G && G.mode !== "foyer" && G.mode !== "join" && G.mode !== "code" && G.mode !== "wait" && G.mode !== "pwok" && G.mode !== "mail2fa") afterLogin(session.user);
      if (ev === "SIGNED_OUT" && started && !DELETING) location.reload();
    });
    var s = await sb.auth.getSession();
    if (FROM_SNAP) {
      if (s.data && s.data.session && s.data.session.user.id === ME.id) { goLive(s.data.session.user); }
      else if ((s.error && isNetErr(s.error)) || !navigator.onLine) { netDown = true; offUI(); waitOnline(); }
      else if (!DELETING) { LS.del("cocoon.snap"); location.reload(); }
      return;
    }
    if (s.data && s.data.session) { try { if (window.cxIntroOut) window.cxIntroOut(true); } catch (_) {} if (!started) afterLogin(s.data.session.user); }
    else if (!G || (G.mode !== "newpw" && G.mode !== "login" && G.mode !== "signup")) gate().show(LS.get("cocoon.join") ? "signup" : "login");
  });

  /* =================== Base de données (API façon Firestore) =================== */
  var cache = {};          // path -> { id: data }
  var ALL = false;         // tout le foyer est déjà en mémoire
  var loading = {};        // path -> Promise
  var colSubs = {};        // path -> Set(fn)
  var docSubs = {};        // path|id -> Set(fn)
  var recent = {};         // path|id -> horodatage de la dernière écriture locale
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function genId() { var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", s = ""; var r = new Uint8Array(20); crypto.getRandomValues(r); for (var i = 0; i < 20; i++) s += a[r[i] % 62]; return s; }
  function DocSnap(id, data) { this.id = id; this._d = data; this.exists = data != null; }
  DocSnap.prototype.data = function () { return this._d == null ? undefined : clone(this._d); };
  var snapT = 0;
  function saveSnapSoon() { clearTimeout(snapT); snapT = setTimeout(function () {
    if (!ME || !FOYER || !keep()) return;
    try { localStorage.setItem("cocoon.snap", JSON.stringify({ v: 1, u: ME.id, email: ME.email || "", f: FOYER, role: ROLE, invite: INVITE, at: Date.now(), cache: cache })); } catch (_) { LS.del("cocoon.snap"); }
  }, 1200); }
  async function refreshAll() {
    var old = cache, fresh = {}, from = 0, step = 1000;
    try {
      for (;;) {
        var r = await sb.from("cocoon_docs").select("path,id,data").eq("foyer", FOYER).range(from, from + step - 1);
        if (r.error) return;
        r.data.forEach(function (row) { (fresh[row.path] = fresh[row.path] || {})[row.id] = row.data; });
        if (r.data.length < step) break; from += step;
      }
    } catch (_) { return; }
    overlay(fresh);
    var paths = {}; Object.keys(old).forEach(function (p) { paths[p] = 1; }); Object.keys(fresh).forEach(function (p) { paths[p] = 1; });
    Object.keys(paths).forEach(function (p) { var n = fresh[p] || {}; if (JSON.stringify(old[p] || {}) !== JSON.stringify(n)) { cache[p] = n; notify(p, null); } });
    saveSnapSoon();
  }
  function notify(path, id) { saveSnapSoon();
    var set = colSubs[path];
    if (set) { var snap = colSnap(path); set.forEach(function (fn) { try { fn(snap); } catch (e) { console.error(e); } }); }
    Object.keys(docSubs).forEach(function (k) {
      if (id == null ? k.indexOf(path + "|") !== 0 : k !== path + "|" + id) return;
      var d = docSnap(path, k.slice(path.length + 1)); docSubs[k].forEach(function (fn) { try { fn(d); } catch (e) { console.error(e); } });
    });
  }
  function colSnap(path) {
    var c = cache[path] || {}, docs = Object.keys(c).map(function (id) { return new DocSnap(id, c[id]); });
    return { docs: docs, size: docs.length, empty: !docs.length, forEach: function (f) { docs.forEach(f); } };
  }
  function docSnap(path, id) { var c = cache[path]; return new DocSnap(id, c && Object.prototype.hasOwnProperty.call(c, id) ? c[id] : null); }
  function load(path, force) {
    if (cache[path] && !force) return Promise.resolve();
    if (ALL && !force) { cache[path] = {}; return Promise.resolve(); }
    if (loading[path] && !force) return loading[path];
    loading[path] = (async function () {
      var all = {}, from = 0, step = 1000;
      for (;;) {
        var r = await sb.from("cocoon_docs").select("id,data").eq("foyer", FOYER).eq("path", path).range(from, from + step - 1);
        if (r.error) { delete loading[path]; throw r.error; }
        r.data.forEach(function (row) { all[row.id] = row.data; });
        if (r.data.length < step) break; from += step;
      }
      var o = {}; o[path] = all; overlay(o); cache[path] = o[path]; delete loading[path];
    })();
    return loading[path];
  }
  async function resync() {
    var paths = Object.keys(cache);
    for (var i = 0; i < paths.length; i++) {
      try { var before = JSON.stringify(cache[paths[i]]); await load(paths[i], true); if (JSON.stringify(cache[paths[i]]) !== before) notify(paths[i], null); } catch (_) {}
    }
  }
  function deepSet(o, key, v) { var ks = key.split("."), x = o; for (var i = 0; i < ks.length - 1; i++) { if (typeof x[ks[i]] !== "object" || x[ks[i]] === null) x[ks[i]] = {}; x = x[ks[i]]; } x[ks[ks.length - 1]] = v; }
  function apply(path, id, data) { cache[path] = cache[path] || {}; if (data == null) delete cache[path][id]; else cache[path][id] = data; recent[path + "|" + id] = Date.now(); notify(path, id); }
  function fail(path, err) { load(path, true).then(function () { notify(path, null); }).catch(function () {}); var e = new Error(frErr(err)); e.code = (err && err.code) || "write_failed"; throw e; }
  function clean(data) { return JSON.parse(JSON.stringify(data == null ? {} : data)); }

  function ColRef(path) { this.path = path; }
  ColRef.prototype.doc = function (id) { return new DocRef(this.path, id || genId()); };
  ColRef.prototype.add = async function (data) { var d = new DocRef(this.path, genId()); await d.set(data); return d; };
  ColRef.prototype.get = async function () { await READY; await load(this.path); return colSnap(this.path); };
  ColRef.prototype.onSnapshot = function (cb, onErr) {
    var path = this.path, live = true;
    (colSubs[path] = colSubs[path] || new Set()).add(cb);
    READY.then(function () { return load(path); }).then(function () { if (live) cb(colSnap(path)); }).catch(function (e) { if (onErr) onErr(e); });
    return function () { live = false; colSubs[path] && colSubs[path].delete(cb); };
  };
  function DocRef(path, id) { this.path = path; this.id = id; }
  DocRef.prototype.acquire = async function () { return { acquired: true, release: async function () {} }; };
  DocRef.prototype.collection = function (name) { return new ColRef(this.path + "/" + this.id + "/" + name); };
  DocRef.prototype.get = async function () { await READY; await load(this.path); return docSnap(this.path, this.id); };
  DocRef.prototype.onSnapshot = function (cb, onErr) {
    var key = this.path + "|" + this.id, self = this, live = true;
    (docSubs[key] = docSubs[key] || new Set()).add(cb);
    READY.then(function () { return load(self.path); }).then(function () { if (live) cb(docSnap(self.path, self.id)); }).catch(function (e) { if (onErr) onErr(e); });
    return function () { live = false; docSubs[key] && docSubs[key].delete(cb); };
  };
  DocRef.prototype.set = async function (data, opts) {
    await READY; await load(this.path).catch(function () {});
    var cur = (cache[this.path] || {})[this.id], val = clean(data);
    if (opts && opts.merge && cur) val = Object.assign(clone(cur), val);
    apply(this.path, this.id, val);
    return enqueue({ k: "set", p: this.path, i: this.id, d: val });
  };
  DocRef.prototype.update = async function (patch) {
    await READY; await load(this.path).catch(function () {});
    var cur = clone((cache[this.path] || {})[this.id]) || {}, flat = {}, dotted = false;
    Object.keys(patch || {}).forEach(function (k) { var v = patch[k] === undefined ? null : patch[k]; if (k.indexOf(".") >= 0) { dotted = true; deepSet(cur, k, v); } else { cur[k] = v; flat[k] = v; } });
    apply(this.path, this.id, clean(cur));
    return enqueue(dotted ? { k: "set", p: this.path, i: this.id, d: clean(cur) } : { k: "merge", p: this.path, i: this.id, d: clean(flat) });
  };
  DocRef.prototype.delete = async function () {
    await READY; apply(this.path, this.id, null);
    return enqueue({ k: "del", p: this.path, i: this.id });
  };

  /* ---------- Hors connexion : les modifications attendent le retour du réseau ---------- */
  var OUT = [], IS_LIVE = false, netDown = false, flushing = null, waiters = {}, seq = 0, hadOffline = false, retryT = 0;
  try { var _o = JSON.parse(LS.get("cocoon.outbox") || "null"); if (_o && Array.isArray(_o.ops)) { OUT = _o.ops; seq = OUT.reduce(function (m, x) { return Math.max(m, x.n || 0); }, 0); OUT._u = _o.u; OUT._f = _o.f; } } catch (_) {}
  function saveOut() { if (OUT.length) LS.set("cocoon.outbox", JSON.stringify({ u: ME && ME.id, f: FOYER, ops: OUT })); else LS.del("cocoon.outbox"); offUI(); }
  function isNetErr(e) {
    if (!e) return false;
    var m = String((e.message || "") + " " + (e.details || "") + " " + (e.name || ""));
    return !navigator.onLine || /fetch|network|load failed|timeout|timed out|aborted|offline|retryable|JWT|jwt expired|ERR_/i.test(m) || e.status === 0;
  }
  function overlay(target) {
    OUT.forEach(function (op) {
      var c = target[op.p]; if (!c) { if (op.k === "del") return; c = target[op.p] = {}; }
      if (op.k === "del") delete c[op.i];
      else if (op.k === "set") c[op.i] = clone(op.d);
      else c[op.i] = Object.assign({}, c[op.i] || {}, clone(op.d));
    });
  }
  function pendingFor(path, id) { for (var i = 0; i < OUT.length; i++) if (OUT[i].p === path && OUT[i].i === id) return true; return false; }
  function enqueue(op) {
    op.n = ++seq; OUT.push(op); saveOut();
    var p = new Promise(function (res, rej) { waiters[op.n] = { res: res, rej: rej }; });
    if (!IS_LIVE || netDown || !navigator.onLine) { var w = waiters[op.n]; delete waiters[op.n]; w.res(); p = Promise.resolve(); }
    run();
    return p;
  }
  function send(op) {
    var now = new Date().toISOString();
    if (op.k === "set") return sb.from("cocoon_docs").upsert({ foyer: FOYER, path: op.p, id: op.i, data: op.d, updated_at: now, updated_by: ME.id });
    if (op.k === "merge") return sb.rpc("cocoon_merge", { f: FOYER, p: op.p, i: op.i, patch: op.d });
    return sb.from("cocoon_docs").delete().eq("foyer", FOYER).eq("path", op.p).eq("id", op.i);
  }
  function releaseAll() { Object.keys(waiters).forEach(function (k) { var w = waiters[k]; delete waiters[k]; w.res(); }); }
  function run() {
    if (flushing || !IS_LIVE || !OUT.length) return;
    if ((OUT._u && ME && OUT._u !== ME.id) || (OUT._f && FOYER && OUT._f !== FOYER)) { OUT.length = 0; delete OUT._u; delete OUT._f; saveOut(); return; }
    flushing = (async function () {
      while (OUT.length) {
        if (!navigator.onLine) { netDown = true; releaseAll(); break; }
        var op = OUT[0], r;
        try { r = await send(op); } catch (e) { r = { error: e }; }
        if (r && r.error && isNetErr(r.error)) { netDown = true; hadOffline = true; releaseAll(); clearTimeout(retryT); retryT = setTimeout(function () { netDown = false; run(); }, 8000); break; }
        OUT.shift(); saveOut(); recent[op.p + "|" + op.i] = Date.now();
        var w = waiters[op.n]; delete waiters[op.n];
        if (r && r.error) {
          load(op.p, true).then(function () { notify(op.p, null); }).catch(function () {});
          var e = new Error(frErr(r.error)); e.code = r.error.code || "write_failed";
          if (w) w.rej(e); else offToast("Une modification faite hors connexion n'a pas pu être enregistrée : " + e.message);
        } else { netDown = false; if (w) w.res(); }
      }
    })();
    flushing.then(function () {
      flushing = null; offUI();
      if (!OUT.length && hadOffline && !netDown) { hadOffline = false; refreshAll(); offToast("✓ Tout est synchronisé"); }
      else if (OUT.length && !netDown) run();
    });
  }
  function goLive(user) { if (IS_LIVE) return; ME = user; IS_LIVE = true; netDown = false; liveResolve(); startRealtime(); refreshAll(); run(); offUI(); stillMember(); }
  async function stillMember() {
    try { var r = await sb.from("cocoon_members").select("foyer").eq("foyer", FOYER).eq("user_id", ME.id).maybeSingle();
      if (!r.error && !r.data && !DELETING) { LS.del("cocoon.snap"); LS.del("cocoon.foyer"); LS.del("cocoon.outbox"); location.reload(); } } catch (_) {}
  }
  function waitOnline() {
    var tries = 0;
    async function again() {
      if (IS_LIVE || !navigator.onLine) return;
      try { var s2 = await sb.auth.getSession(); if (s2.data && s2.data.session && s2.data.session.user.id === ME.id) { hadOffline = true; goLive(s2.data.session.user); return; }
        if (!s2.error || !isNetErr(s2.error)) { if (OUT.length) offToast("Reconnecte-toi pour envoyer tes modifications."); LS.del("cocoon.snap"); setTimeout(function () { location.reload(); }, 1500); return; } } catch (_) {}
      if (++tries < 40) setTimeout(again, 6000);
    }
    window.addEventListener("online", again); setTimeout(again, 6000);
  }
  window.addEventListener("online", function () { netDown = false; hadOffline = !!OUT.length; offUI(); run(); });
  window.addEventListener("offline", function () { netDown = true; hadOffline = true; offUI(); });

  /* Petit bandeau « Hors connexion » */
  var offEl = null, offTT = 0;
  function offBox() {
    if (offEl || !document.body) return offEl;
    var st = document.createElement("style");
    st.textContent = '.cx-off{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translate(-50%,-140%);z-index:9998;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px);padding:8px 14px;border-radius:999px;background:var(--ink,#1C1B2E);color:var(--bg,#fff);font:600 13.5px/1.3 inherit;font-family:inherit;box-shadow:0 8px 24px rgba(0,0,0,.18);white-space:nowrap;transition:transform .35s cubic-bezier(.3,.8,.4,1),opacity .35s;opacity:0;pointer-events:none}.cx-off.on{transform:translate(-50%,0);opacity:1}.cx-off svg{width:16px;height:16px;flex:none}.cx-off.ok{background:#2F9E5B;color:#fff}';
    document.head.appendChild(st);
    offEl = document.createElement("div"); offEl.className = "cx-off"; offEl.setAttribute("role", "status"); offEl.setAttribute("aria-live", "polite");
    document.body.appendChild(offEl); return offEl;
  }
  function offUI() {
    var b = offBox(); if (!b) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", offUI, { once: true }); return; }
    var off = netDown || !navigator.onLine;
    if (off) {
      clearTimeout(offTT); b.classList.remove("ok");
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 3.4-2M13.6 10.2A10 10 0 0 1 19 12.5M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/><path d="M3 3l18 18"/></svg>';
      b.append("Hors connexion" + (OUT.length ? " · " + OUT.length + " en attente" : " · tu peux continuer"));
      b.classList.add("on");
    } else if (!b.classList.contains("ok")) b.classList.remove("on");
  }
  function offToast(t) {
    var b = offBox(); if (!b) return; clearTimeout(offTT);
    b.textContent = t; b.classList.toggle("ok", /^✓/.test(t)); b.classList.add("on");
    offTT = setTimeout(function () { b.classList.remove("on"); setTimeout(function () { b.classList.remove("ok"); offUI(); }, 400); }, 2600);
  }

  function pathOf(p) { var s = String(p).split("/").filter(Boolean); return { col: s.slice(0, -1).join("/"), id: s[s.length - 1] }; }
  var db = {
    collection: function (p) { return new ColRef(String(p).split("/").filter(Boolean).join("/")); },
    doc: function (p) { var x = pathOf(p); return new DocRef(x.col, x.id); }
  };

  /* ---------- Temps réel ---------- */
  var channel = null;
  function startRealtime() {
    channel = sb.channel("cocoon-" + FOYER)
      .on("postgres_changes", { event: "*", schema: "public", table: "cocoon_docs", filter: "foyer=eq." + FOYER }, function (pl) {
        var row = pl.eventType === "DELETE" ? pl.old : pl.new;
        if (!row || (row.foyer && row.foyer !== FOYER) || !row.path) return;
        if (!cache[row.path]) { if (!ALL) return; cache[row.path] = {}; }
        var key = row.path + "|" + row.id;
        if (pendingFor(row.path, row.id)) return;
        if (pl.eventType !== "DELETE" && row.updated_by === ME.id && recent[key] && Date.now() - recent[key] < 6000) return;
        if (pl.eventType === "DELETE") { if (!(row.id in cache[row.path])) return; delete cache[row.path][row.id]; }
        else cache[row.path][row.id] = row.data;
        notify(row.path, row.id);
      })
      .subscribe(function (status) { if (status === "SUBSCRIBED" && channel._was) resync(); if (status === "SUBSCRIBED") channel._was = true; });
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") resync(); });
    window.addEventListener("online", function () { if (!OUT.length) resync(); });
  }

  /* =================== Utilisateur =================== */
  var user = {
    id: async function () { await READY; return ME.id; },
    isOwner: async function () { await READY; return ROLE === "admin"; },
    canEdit: async function () { return true; },
    can: async function () { return true; },
    email: function () { return ME && ME.email; }
  };

  /* =================== Fichiers =================== */
  /* Les fichiers ne sont plus partagés par des liens permanents : on garde seulement leur chemin
     (« sb:<foyer>/<id>-nom ») et on crée un lien temporaire au moment de l'afficher. */
  var LINK_S = 60 * 60;           // images affichées dans l'app : 1 h
  var OPEN_S = 5 * 60;            // document ouvert : 5 min
  function refPath(ref) {
    ref = String(ref || "");
    if (ref.indexOf("sb:") === 0) return ref.slice(3);
    var m = ref.match(/\/object\/sign\/[^/]+\/([^?]+)/); return m ? decodeURIComponent(m[1]) : null;
  }
  var assets = {
    upload: async function (file, opts) {
      if (!navigator.onLine || netDown) { var eo = new Error("Pas de connexion : ajoute ce fichier quand tu auras du réseau."); eo.code = "offline"; throw eo; }
      await LIVE;
      if (file.size > 20 * 1024 * 1024) { var e = new Error("Fichier trop lourd"); e.code = "too_large"; throw e; }
      var type = (opts && opts.type) || file.type || "application/octet-stream";
      if (!/^(image\/(png|jpe?g|webp|gif|heic)|application\/pdf)$/.test(type)) { var e2 = new Error("Format"); e2.code = "unsupported_type"; throw e2; }
      var name = String(file.name || "fichier").normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-60);
      var path = FOYER + "/" + genId() + "-" + name;
      var r = await sb.storage.from(BUCKET).upload(path, file, { contentType: type, upsert: false });
      if (r.error) { var e3 = new Error(frErr(r.error)); e3.code = /size|large/i.test(r.error.message) ? "too_large" : "upload_failed"; throw e3; }
      var s = await sb.storage.from(BUCKET).createSignedUrl(path, LINK_S);
      return { id: "sb:" + path, path: path, url: s.error ? null : s.data.signedUrl };
    },
    delete: async function (ref) {
      await LIVE;
      var path = refPath(ref) || String(ref || "");
      if (path) await sb.storage.from(BUCKET).remove([path]);
    },
    /* Est-ce une référence de fichier de cette version (à signer avant affichage) ? */
    isRef: function (ref) { return !!refPath(ref); },
    /* Liens temporaires pour plusieurs fichiers : { ref: url } */
    sign: async function (refs, secs) {
      await LIVE;
      var list = (refs || []).map(function (r) { return { r: r, p: refPath(r) }; }).filter(function (x) { return x.p; });
      if (!list.length) return {};
      var res = await sb.storage.from(BUCKET).createSignedUrls(list.map(function (x) { return x.p; }), secs || LINK_S);
      var out = {}; if (res.error || !res.data) return out;
      res.data.forEach(function (d, i) { if (d && d.signedUrl && list[i]) out[list[i].r] = d.signedUrl; });
      return out;
    },
    open: async function (ref) { var o = await assets.sign([ref], OPEN_S); return o[ref] || null; },
    /* Ancien lien permanent → le fichier change d'adresse (l'ancien lien ne marche plus) */
    migrate: async function (ref) {
      await LIVE;
      ref = String(ref || ""); if (ref.indexOf("sb:") === 0) return ref;
      var path = refPath(ref); if (!path) return ref;
      var dl = await sb.storage.from(BUCKET).download(path); if (dl.error || !dl.data) return ref;
      var tail = path.split("/").pop().replace(/^[^-]*-/, ""), np = path.split("/")[0] + "/" + genId() + "-" + tail;
      var up = await sb.storage.from(BUCKET).upload(np, dl.data, { contentType: dl.data.type || undefined, upsert: false });
      if (up.error) return ref;
      await sb.storage.from(BUCKET).remove([path]);
      return "sb:" + np;
    }
  };

  /* =================== Téléchargements =================== */
  var downloads = {
    save: async function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data], { type: /\.html?$/.test(o.filename) ? "text/html" : /\.ics$/.test(o.filename) ? "text/calendar" : /\.json$/.test(o.filename) ? "application/json" : "text/plain" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = o.filename || "cocoon.txt";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      return true;
    }
  };

  /* =================== Ouverture instantanée depuis l'instantané local =================== */
  (function () {
    var snap = null; try { snap = JSON.parse(localStorage.getItem("cocoon.snap") || "null"); } catch (_) {}
    if (!snap || snap.v !== 1 || !keep() || !authStore.getItem("cocoon.auth") || LS.get("cocoon.join") || (LS.get("cocoon.foyer") && LS.get("cocoon.foyer") !== snap.f)) return;
    ME = { id: snap.u, email: snap.email }; FOYER = snap.f; ROLE = snap.role || "membre"; INVITE = snap.invite || null;
    Object.keys(snap.cache || {}).forEach(function (p) { cache[p] = snap.cache[p]; }); ALL = true;
    FROM_SNAP = true; started = true; readyResolve();
    DOMP.then(function () { try { if (window.cxIntroOut) window.cxIntroOut(true); } catch (_) {} });
  })();

  /* =================== Point d'entrée pour l'app =================== */
  window.claude = {
    use: async function (name) {
      if (name === "db") { await READY; return db; }
      if (name === "user") { await READY; return user; }
      if (name === "assets") { await READY; return assets; }
      if (name === "downloads") return downloads;
      return null; /* "sample" (Claude) indisponible hors de Claude */
    }
  };
  window.cocoonHost = {
    inviteUrl: function () { return FOYER && INVITE ? location.origin + location.pathname + "?rejoindre=" + FOYER + "." + INVITE : location.origin + location.pathname; },
    email: function () { return ME && ME.email; },
    isAdmin: function () { return ROLE === "admin"; },
    logout: logout,
    /* Supprimer mon compte : fichiers (si je suis le dernier du foyer), données perso, accès, puis le compte lui-même */
    deleteAccount: async function (myFiles) {
      await LIVE;
      var mem = await sb.from("cocoon_members").select("user_id").eq("foyer", FOYER);
      var alone = !mem.error && (mem.data || []).filter(function (x) { return x.user_id !== ME.id; }).length === 0;
      var paths = [];
      if (alone) {
        var ls = await sb.storage.from(BUCKET).list(FOYER, { limit: 1000 });
        if (!ls.error) paths = (ls.data || []).map(function (o) { return FOYER + "/" + o.name; });
      } else paths = (myFiles || []).map(refPath).filter(Boolean);
      for (var i = 0; i < paths.length; i += 100) { try { await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100)); } catch (_) {} }
      DELETING = true;
      var r = await sb.rpc("cocoon_delete_me");
      if (r.error) { DELETING = false; throw new Error(/function|exist/i.test(r.error.message) ? "la suppression de compte n'est pas encore installée dans Supabase (script securite.sql)" : frErr(r.error)); }
      try { await Promise.race([PUSH.disable(), new Promise(function (ok) { setTimeout(ok, 2500); })]); } catch (_) {}
      ["cocoon.snap", "cocoon.outbox", "cocoon.foyer", "cocoon.theme", "cocoon.palette", "cocoon.bootSeen"].forEach(function (k) { LS.del(k); });
      try { await sb.auth.signOut(); } catch (_) {}
      authStore.removeItem("cocoon.auth");
      return { foyerSupprime: alone };
    },
    /* Le créateur retire un membre du foyer (accès coupé côté serveur) */
    removeMember: async function (uid) { await LIVE; var r = await sb.rpc("cocoon_remove_member", { f: FOYER, u: uid }); if (r.error) throw new Error(/function|exist/i.test(r.error.message) ? "la protection du serveur n'est pas encore installée dans Supabase (securite.sql)" : frErr(r.error)); },
    /* Plusieurs foyers : liste, changement, création */
    foyerId: function () { return FOYER || null; },
    foyers: async function () {
      await LIVE; var m = await sb.from("cocoon_members").select("foyer,role").eq("user_id", ME.id);
      if (m.error) throw new Error(frErr(m.error));
      var out = [];
      for (var i = 0; i < (m.data || []).length; i++) { var row = m.data[i], nom = "";
        try { var c = await sb.from("cocoon_docs").select("data").eq("foyer", row.foyer).eq("path", "foyer").eq("id", "config"); if (!c.error && c.data && c.data[0] && c.data[0].data) nom = c.data[0].data.nom || ""; } catch (_) {}
        out.push({ id: row.foyer, role: row.role, nom: nom, current: row.foyer === FOYER }); }
      return out;
    },
    switchFoyer: function (id) { if (!id || id === FOYER) return false; if (OUT.length) throw new Error("des changements sont encore en cours d'envoi : réessaie dans un instant"); LS.set("cocoon.foyer", id); LS.del("cocoon.snap"); LS.del("cocoon.bootSeen"); location.reload(); return true; },
    createFoyer: async function () { await LIVE; if (OUT.length) throw new Error("des changements sont encore en cours d'envoi : réessaie dans un instant");
      var r = await sb.rpc("cocoon_create_foyer"); if (r.error) throw new Error(frErr(r.error));
      LS.set("cocoon.foyer", r.data.id); LS.del("cocoon.snap"); location.reload(); return r.data.id; },
    newCode: async function () { await LIVE; var r = await sb.rpc("cocoon_new_code", { f: FOYER }); if (r.error) throw new Error(frErr(r.error)); INVITE = r.data; return INVITE; },
    ready: READY,
    pending: function () { return OUT.length; },
    online: function () { return IS_LIVE && !netDown && navigator.onLine; },
    /* Invitation par e-mail (fonction Supabase « cocoon-invite ») */
    inviteEmail: async function (email, nom) {
      await LIVE;
      var r = await sb.functions.invoke("cocoon-invite", { body: { email: email, nom: nom || "", foyer: FOYER, site: location.origin + location.pathname } });
      if (r.error) {
        var m = r.error.message || ""; try { var ctx = r.error.context && (await r.error.context.json()); if (ctx && ctx.error) m = ctx.error; } catch (_) {}
        if (/not found|404|Failed to send a request/i.test(m)) m = "l'envoi d'e-mails n'est pas encore activé dans Supabase";
        throw new Error(m || "envoi impossible");
      }
      return r.data || { ok: true };
    },
    /* Calendrier du téléphone : envoie les rappels (communs + perso) quand ils changent */
    saveCal: async function (x) {
      await LIVE;
      var rows = [{ owner: "foyer", events: x.shared || [] }, { owner: ME.id, events: x.perso || [], moi: x.moi || null }];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], sig = JSON.stringify([r.events, r.moi || null]);
        if (calSent[r.owner] === sig) continue;
        var res = await sb.from("cocoon_cal").upsert({ foyer: FOYER, owner: r.owner, events: r.events, moi: r.moi || null, updated_at: new Date().toISOString() });
        if (!res.error) calSent[r.owner] = sig;
      }
    },
    calUrl: async function () {
      await LIVE;
      var r = await sb.rpc("cocoon_cal_token", { f: FOYER });
      if (r.error) throw new Error(/function|exist/i.test(r.error.message) ? "le calendrier n'est pas encore activé dans Supabase" : frErr(r.error));
      return CFG.url.replace(/^https?:/, "webcal:").replace(/\/$/, "") + "/functions/v1/cocoon-agenda?t=" + r.data;
    }
  };
  var calSent = {};

  /* =================== Notifications sur le téléphone =================== */
  function u8(b64) { var s = String(b64 || "").replace(/-/g, "+").replace(/_/g, "/"); s += "===".slice((s.length + 3) % 4); var bin = atob(s), o = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }
  function swReg() { return navigator.serviceWorker.getRegistration().then(function (r) { return r || navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }); }).then(function () { return navigator.serviceWorker.ready; }); }
  var PUSH = {
    /* "ok" | "ios-home" (iPhone : ajouter à l'écran d'accueil d'abord) | "no" (navigateur trop ancien) | "off" (pas encore activé côté Supabase) */
    support: function () {
      if (!CFG.vapid) return "off";
      var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return ios && !standalone ? "ios-home" : "no";
      if (ios && !standalone) return "ios-home";
      return "ok";
    },
    permission: function () { return "Notification" in window ? Notification.permission : "denied"; },
    status: async function () {
      if (PUSH.support() !== "ok") return { on: false };
      try { var reg = await swReg(), sub = await reg.pushManager.getSubscription(); return { on: !!sub && Notification.permission === "granted" }; } catch (_) { return { on: false }; }
    },
    enable: async function () {
      await LIVE;
      var p = await Notification.requestPermission();
      if (p !== "granted") { var e = new Error(p === "denied" ? "Les notifications sont bloquées pour Cocoon dans les réglages du téléphone." : "Autorisation non donnée."); e.code = "denied"; throw e; }
      var reg = await swReg(), sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(CFG.vapid) });
      var j = sub.toJSON(), tz = "Europe/Paris"; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (_) {}
      var r = await sb.rpc("cocoon_push_claim", { e: j.endpoint, k: j.keys.p256dh, a: j.keys.auth, f: FOYER, z: tz, u: navigator.userAgent });
      if (r.error) throw new Error(/function|exist/i.test(r.error.message) ? "les notifications ne sont pas encore activées dans Supabase" : frErr(r.error));
      return true;
    },
    disable: async function () {
      if (!("serviceWorker" in navigator)) return;
      var reg = await navigator.serviceWorker.getRegistration(); if (!reg || !reg.pushManager) return;
      var sub = await reg.pushManager.getSubscription(); if (!sub) return;
      try { await sb.from("cocoon_push_subs").delete().eq("endpoint", sub.endpoint); } catch (_) {}
      try { await sub.unsubscribe(); } catch (_) {}
    },
    prefs: async function () { await LIVE; var r = await sb.from("cocoon_push_prefs").select("prefs").eq("user_id", ME.id).maybeSingle(); return (r.data && r.data.prefs) || {}; },
    savePrefs: async function (p) { await LIVE; var r = await sb.from("cocoon_push_prefs").upsert({ user_id: ME.id, prefs: p, updated_at: new Date().toISOString() }); if (r.error) throw new Error(frErr(r.error)); },
    event: async function (o) { try { if (!CFG.vapid || !IS_LIVE || !navigator.onLine) return; await sb.functions.invoke("cocoon-push", { body: Object.assign({ mode: "event", foyer: FOYER }, o || {}) }); } catch (_) {} },
    demo: async function () { await LIVE; var r = await sb.functions.invoke("cocoon-push", { body: { mode: "event", type: "demo", foyer: FOYER } }); if (r.error) throw new Error("la fonction « cocoon-push » ne répond pas (redéploie-la dans Supabase)"); return r.data; },
    test: async function () { await LIVE; var r = await sb.functions.invoke("cocoon-push", { body: { mode: "event", type: "test", foyer: FOYER } }); if (r.error) throw new Error("la fonction « cocoon-push » ne répond pas encore (à déployer dans Supabase)"); return r.data; }
  };
  window.cocoonHost.push = PUSH;
})();
