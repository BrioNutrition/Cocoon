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
  var SBP = new Promise(function (res) {
    function ok() { if (window.supabase && !sb) { sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "cocoon.auth" } }); res(); } }
    if (window.supabase) return ok();
    var t = document.getElementById("sbjs"); if (t) t.addEventListener("load", ok);
    var iv = setInterval(function () { if (window.supabase) { clearInterval(iv); ok(); } }, 40);
  });
  function introOut() { try { if (window.cxIntroOut) window.cxIntroOut(); } catch (_) {} }
  var ME = null, FOYER = null, ROLE = "membre", INVITE = null;
  var readyResolve, READY = new Promise(function (r) { readyResolve = r; });

  /* =================== Écran de connexion =================== */
  var G = null;
  function gate() {
    if (G) return G;
    var css = document.createElement("style");
    css.textContent = [
      "#cxGate{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px 18px;background:#F6F5FB;color:#1C1B2E;font-family:Fredoka,system-ui,-apple-system,sans-serif;overflow:auto}",
      "#cxGate[hidden]{display:none!important}",
      "#cxGate .cx-card{width:min(400px,100%);display:grid;gap:14px;text-align:center}",
      "#cxGate .cx-logo{width:84px;height:84px;margin:0 auto 2px;border-radius:24px;box-shadow:0 10px 30px rgba(60,40,120,.18)}",
      "#cxGate h1{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:800;font-size:34px;letter-spacing:-.03em;margin:0}",
      "#cxGate p{margin:0;color:#5A5876;font-size:15.5px;line-height:1.45}",
      "#cxGate form{display:grid;gap:10px;text-align:left;margin-top:6px}",
      "#cxGate label{font-size:13px;font-weight:600;color:#5A5876;display:grid;gap:5px}",
      "#cxGate input{font:inherit;font-size:16px;padding:13px 14px;border-radius:14px;border:2px solid #E3E0F0;background:#fff;color:#1C1B2E;outline:none}",
      "#cxGate input:focus{border-color:#1C1B2E}",
      "#cxGate .cx-btn{font:inherit;font-weight:700;font-size:17px;border:0;border-radius:16px;padding:15px;background:#1C1B2E;color:#fff;cursor:pointer;margin-top:4px}",
      "#cxGate .cx-btn.alt{background:linear-gradient(135deg,#FFD66B,#FFB38A,#FF9CB0);color:#1C1B2E}",
      "#cxGate .cx-btn[disabled]{opacity:.6}",
      "#cxGate .cx-link{font:inherit;border:0;background:none;color:#3D3A5C;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:6px;font-size:14.5px}",
      "#cxGate .cx-msg{font-size:14px;padding:10px 12px;border-radius:12px;background:#FFF1D6;color:#6B4A00;text-align:left}",
      "#cxGate .cx-msg.err{background:#FFE3DD;color:#8A2A16}",
      "#cxGate .cx-msg[hidden]{display:none}",
      "#cxGate .cx-inv{font-size:14px;padding:10px 12px;border-radius:12px;background:#E5F6EC;color:#1E5B38}",
      "@media (prefers-color-scheme:dark){#cxGate{background:#15141F;color:#F3F1FA}#cxGate p,#cxGate label{color:#B6B3CC}#cxGate input{background:#211F2E;border-color:#33304A;color:#F3F1FA}#cxGate input:focus{border-color:#F3F1FA}#cxGate .cx-btn{background:#F3F1FA;color:#15141F}#cxGate .cx-link{color:#D8D5EA}}"
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
        (invite && G.mode !== "foyer" ? '<div class="cx-inv">Tu as reçu une invitation : connecte-toi ou crée ton compte pour rejoindre le foyer.</div>' : "");
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
            '<div class="cx-msg" hidden></div><button class="cx-btn" type="submit">' + (sign ? "Créer mon compte" : "Se connecter") + "</button></form>" +
            '<button class="cx-link" type="button" data-go="' + (sign ? "login" : "signup") + '">' + (sign ? "J'ai déjà un compte" : "Pas encore de compte ? Créer un compte") + "</button>" +
            (sign ? "" : '<button class="cx-link" type="button" data-go="forgot">Mot de passe oublié</button>');
          var f = card.querySelector("form");
          if (extra) msg(extra.t, extra.err);
          f.addEventListener("submit", async function (e) {
            e.preventDefault();
            var b = f.querySelector("button"), em = f.email.value.trim(), pw = f.pw.value;
            b.disabled = true; msg("");
            try {
              if (sign) {
                var r = await sb.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname } });
                if (r.error) throw r.error;
                if (!r.data.session) { G.show("login", { t: "Compte créé ! Ouvre l'e-mail de confirmation qu'on vient de t'envoyer, puis connecte-toi ici." }); return; }
              } else {
                var r2 = await sb.auth.signInWithPassword({ email: em, password: pw });
                if (r2.error) throw r2.error;
              }
            } catch (err) { msg(frErr(err), true); }
            finally { b.disabled = false; }
          });
          bindGo();
          setTimeout(function () { var i = f.email; if (i) i.focus(); }, 60);
          return;
        }
        if (mode === "forgot") {
          card.innerHTML = head("Mot de passe oublié", "On t'envoie un lien pour en choisir un nouveau.") +
            '<form><label>E-mail<input type="email" name="email" autocomplete="email" required></label><div class="cx-msg" hidden></div><button class="cx-btn" type="submit">Envoyer le lien</button></form>' +
            '<button class="cx-link" type="button" data-go="login">Retour</button>';
          var f2 = card.querySelector("form");
          f2.addEventListener("submit", async function (e) {
            e.preventDefault(); var b = f2.querySelector("button"); b.disabled = true;
            var r = await sb.auth.resetPasswordForEmail(f2.email.value.trim(), { redirectTo: location.origin + location.pathname });
            b.disabled = false; msg(r.error ? frErr(r.error) : "C'est parti : regarde ta boîte mail.", !!r.error);
          });
          bindGo(); return;
        }
        if (mode === "newpw") {
          card.innerHTML = head("Nouveau mot de passe", "") +
            '<form><label>Nouveau mot de passe<input type="password" name="pw" minlength="6" autocomplete="new-password" required></label><div class="cx-msg" hidden></div><button class="cx-btn" type="submit">Enregistrer</button></form>';
          var f3 = card.querySelector("form");
          f3.addEventListener("submit", async function (e) {
            e.preventDefault(); var r = await sb.auth.updateUser({ password: f3.pw.value });
            if (r.error) msg(frErr(r.error), true); else { G.hide(); afterLogin(r.data.user); }
          });
          return;
        }
        if (mode === "foyer") {
          card.innerHTML = head("Ton foyer", "Crée ton foyer pour commencer. Pour rejoindre celui de quelqu'un, demande-lui son <b>lien d'invitation</b> (dans Cocoon : onglet Moi → Mon compte) et ouvre-le.") +
            '<div class="cx-msg" hidden></div><button class="cx-btn alt" type="button" data-act="create">Créer mon foyer</button>' +
            '<button class="cx-link" type="button" data-act="out">Se déconnecter</button>';
          if (extra) msg(extra.t, extra.err);
          card.querySelector('[data-act="create"]').addEventListener("click", async function (e) {
            var btn = e.target; btn.disabled = true; btn.textContent = "Création du foyer…";
            var r = await sb.rpc("cocoon_create_foyer");
            if (r.error) { btn.disabled = false; btn.textContent = "Créer mon foyer"; msg(frErr(r.error), true); return; }
            LS.set("cocoon.foyer", r.data.id);
            FOYER = r.data.id; INVITE = r.data.code; ROLE = "admin"; ALL = true; /* foyer neuf : rien à charger */
            finish();
          });
          card.querySelector('[data-act="out"]').addEventListener("click", logout);
          return;
        }
        if (mode === "wait") { card.innerHTML = head("Cocoon", "Connexion…"); }
      },
      hide: function () { g.hidden = true; G.mode = null; }
    };
    function bindGo() { card.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { G.show(b.getAttribute("data-go")); }); }); }
    return G;
  }
  function frErr(e) {
    var m = String((e && (e.message || e.error_description)) || e || "");
    if (/Invalid login/i.test(m)) return "E-mail ou mot de passe incorrect.";
    if (/Email not confirmed/i.test(m)) return "Confirme d'abord ton adresse : clique sur le lien reçu par e-mail.";
    if (/already registered|already exists/i.test(m)) return "Un compte existe déjà avec cet e-mail : connecte-toi.";
    if (/Password should be/i.test(m)) return "Le mot de passe doit faire au moins 6 caractères.";
    if (/rate limit|too many/i.test(m)) return "Trop d'essais d'un coup : réessaie dans quelques minutes.";
    if (/fetch|network/i.test(m)) return "Pas de connexion internet.";
    return m || "Une erreur est survenue.";
  }
  async function logout() { await sb.auth.signOut(); LS.del("cocoon.foyer"); location.reload(); }

  /* =================== Session & foyer =================== */
  var started = false;
  async function afterLogin(user) {
    if (!user) return;
    ME = user;
    var join = LS.get("cocoon.join");
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
    if (!started) { started = true; startRealtime(); readyResolve(); }
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
      Object.keys(all).forEach(function (p) { cache[p] = all[p]; });
      ALL = true;
    } catch (_) {}
  }
  var DOMP = new Promise(function (r) { if (document.readyState !== "loading") r(); else document.addEventListener("DOMContentLoaded", r); });
  Promise.all([SBP, DOMP]).then(async function () {
    sb.auth.onAuthStateChange(function (ev, session) {
      if (ev === "PASSWORD_RECOVERY") { gate().show("newpw"); return; }
      if (ev === "SIGNED_IN" && session && !started && G && G.mode !== "foyer") afterLogin(session.user);
      if (ev === "SIGNED_OUT" && started) location.reload();
    });
    var s = await sb.auth.getSession();
    if (s.data && s.data.session) { introOut(); if (!started) afterLogin(s.data.session.user); }
    else if (!G || G.mode !== "newpw") gate().show(LS.get("cocoon.join") ? "signup" : "login");
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
  function notify(path, id) {
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
      cache[path] = all; delete loading[path];
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
    var r = await sb.from("cocoon_docs").upsert({ foyer: FOYER, path: this.path, id: this.id, data: val, updated_at: new Date().toISOString(), updated_by: ME.id });
    if (r.error) fail(this.path, r.error);
  };
  DocRef.prototype.update = async function (patch) {
    await READY; await load(this.path).catch(function () {});
    var cur = clone((cache[this.path] || {})[this.id]) || {}, flat = {}, dotted = false;
    Object.keys(patch || {}).forEach(function (k) { var v = patch[k] === undefined ? null : patch[k]; if (k.indexOf(".") >= 0) { dotted = true; deepSet(cur, k, v); } else { cur[k] = v; flat[k] = v; } });
    apply(this.path, this.id, clean(cur));
    var r = dotted
      ? await sb.from("cocoon_docs").upsert({ foyer: FOYER, path: this.path, id: this.id, data: clean(cur), updated_at: new Date().toISOString(), updated_by: ME.id })
      : await sb.rpc("cocoon_merge", { f: FOYER, p: this.path, i: this.id, patch: clean(flat) });
    if (r.error) fail(this.path, r.error);
  };
  DocRef.prototype.delete = async function () {
    await READY; apply(this.path, this.id, null);
    var r = await sb.from("cocoon_docs").delete().eq("foyer", FOYER).eq("path", this.path).eq("id", this.id);
    if (r.error) fail(this.path, r.error);
  };
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
        if (pl.eventType !== "DELETE" && row.updated_by === ME.id && recent[key] && Date.now() - recent[key] < 6000) return;
        if (pl.eventType === "DELETE") { if (!(row.id in cache[row.path])) return; delete cache[row.path][row.id]; }
        else cache[row.path][row.id] = row.data;
        notify(row.path, row.id);
      })
      .subscribe(function (status) { if (status === "SUBSCRIBED" && channel._was) resync(); if (status === "SUBSCRIBED") channel._was = true; });
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") resync(); });
    window.addEventListener("online", resync);
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
  var TEN_YEARS = 60 * 60 * 24 * 365 * 10;
  var assets = {
    upload: async function (file, opts) {
      await READY;
      if (file.size > 20 * 1024 * 1024) { var e = new Error("Fichier trop lourd"); e.code = "too_large"; throw e; }
      var type = (opts && opts.type) || file.type || "application/octet-stream";
      if (!/^(image\/(png|jpe?g|webp|gif|heic)|application\/pdf)$/.test(type)) { var e2 = new Error("Format"); e2.code = "unsupported_type"; throw e2; }
      var name = String(file.name || "fichier").normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-60);
      var path = FOYER + "/" + genId() + "-" + name;
      var r = await sb.storage.from(BUCKET).upload(path, file, { contentType: type, upsert: false });
      if (r.error) { var e3 = new Error(frErr(r.error)); e3.code = /size|large/i.test(r.error.message) ? "too_large" : "upload_failed"; throw e3; }
      var s = await sb.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
      if (s.error) throw s.error;
      return { id: s.data.signedUrl, path: path, url: s.data.signedUrl };
    },
    delete: async function (ref) {
      await READY;
      var m = String(ref || "").match(/\/object\/sign\/[^/]+\/([^?]+)/), path = m ? decodeURIComponent(m[1]) : String(ref || "");
      if (path) await sb.storage.from(BUCKET).remove([path]);
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
    newCode: async function () { var r = await sb.rpc("cocoon_new_code", { f: FOYER }); if (r.error) throw new Error(frErr(r.error)); INVITE = r.data; return INVITE; },
    ready: READY,
    /* Calendrier du téléphone : envoie les rappels (communs + perso) quand ils changent */
    saveCal: async function (x) {
      await READY;
      var rows = [{ owner: "foyer", events: x.shared || [] }, { owner: ME.id, events: x.perso || [], moi: x.moi || null }];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], sig = JSON.stringify([r.events, r.moi || null]);
        if (calSent[r.owner] === sig) continue;
        var res = await sb.from("cocoon_cal").upsert({ foyer: FOYER, owner: r.owner, events: r.events, moi: r.moi || null, updated_at: new Date().toISOString() });
        if (!res.error) calSent[r.owner] = sig;
      }
    },
    calUrl: async function () {
      await READY;
      var r = await sb.rpc("cocoon_cal_token", { f: FOYER });
      if (r.error) throw new Error(/function|exist/i.test(r.error.message) ? "le calendrier n'est pas encore activé dans Supabase" : frErr(r.error));
      return CFG.url.replace(/^https?:/, "webcal:").replace(/\/$/, "") + "/functions/v1/cocoon-agenda?t=" + r.data;
    }
  };
  var calSent = {};
})();
