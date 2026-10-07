/* Faux Supabase en mémoire, pour tester l'app sans réseau. */
(function () {
  var users0=null; var T = (function(){ try{ var x=JSON.parse(localStorage.getItem('mockT')||'null'); if(x) return x; }catch(_){} return { cocoon_foyers: [], cocoon_members: [], cocoon_docs: [], cocoon_cal: [] }; })(), STO=null; setInterval(function(){ try{ localStorage.setItem('mockT',JSON.stringify(T)); }catch(_){} },200), files = {}, users = {}, session = null, authCbs = [], chans = [];
  window.__mock = { T: T, files: files, chans: chans, calls: [] };
  function uuid() { return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); }
  function ok(d) { return Promise.resolve({ data: d, error: null }); }
  function emit(ev, s) { authCbs.forEach(function (c) { c(ev, s); }); }
  function rt(type, row, old) { chans.forEach(function (ch) { ch.h.forEach(function (h) { var f = h.filter && h.filter.filter; if (f) { var m = f.match(/^(\w+)=eq\.(.+)$/); if (type !== "DELETE" && row[m[1]] !== m[2]) return; } setTimeout(function () { h.cb({ eventType: type, new: row || {}, old: old || {} }); }, 5); }); }); }
  window.__mock.remote = function (row) { var i = T.cocoon_docs.findIndex(function (r) { return r.foyer === row.foyer && r.path === row.path && r.id === row.id; }); if (i >= 0) T.cocoon_docs[i] = row; else T.cocoon_docs.push(row); rt("UPDATE", row); };
  function Q(t) { this.t = t; this.f = []; this.op = "select"; }
  Q.prototype.select = function () { return this; };
  Q.prototype.eq = function (c, v) { this.f.push([c, v]); return this; };
  Q.prototype.range = function (a, b) { this.r = [a, b]; return this; };
  Q.prototype.maybeSingle = function () { this.single = true; return this; };
  Q.prototype.upsert = function (row) { this.op = "upsert"; this.row = row; return this; };
  Q.prototype.delete = function () { this.op = "delete"; return this; };
  Q.prototype.then = function (res, rej) {
    var self = this, rows = T[this.t]; window.__mock.calls.push([this.op, this.t, JSON.stringify(this.f), this.row && this.row.path]);
    var match = function (r) { return self.f.every(function (x) { return r[x[0]] === x[1]; }); };
    var out;
    if (this.op === "select") { var d = rows.filter(match).map(function (r) { return JSON.parse(JSON.stringify(r)); }); if (this.r) d = d.slice(this.r[0], this.r[1] + 1); if (this.t === "cocoon_members") d.forEach(function (m) { var f = T.cocoon_foyers.find(function (x) { return x.id === m.foyer; }); m.cocoon_foyers = f ? { owner: f.owner, code: f.code } : null; }); out = { data: this.single ? (d[0] || null) : d, error: null }; }
    else if (this.op === "upsert") { var r = JSON.parse(JSON.stringify(this.row)); var i = rows.findIndex(function (x) { return self.t === "cocoon_cal" ? (x.foyer === r.foyer && x.owner === r.owner) : (x.foyer === r.foyer && x.path === r.path && x.id === r.id); }); if (i >= 0) rows[i] = r; else rows.push(r); rt(i >= 0 ? "UPDATE" : "INSERT", r); out = { data: null, error: null }; }
    else { var del = rows.filter(match); T[this.t] = rows.filter(function (x) { return !match(x); }); del.forEach(function (x) { rt("DELETE", null, { foyer: x.foyer, path: x.path, id: x.id }); }); out = { data: null, error: null }; }
    return Promise.resolve(out).then(res, rej);
  };
  var client = {
    auth: {
      getSession: function () { if(!session&&STO){ try{ session=JSON.parse(STO.getItem('cocoon.auth')||'null'); }catch(_){} } return ok({ session: session }); },
      onAuthStateChange: function (cb) { authCbs.push(cb); return { data: { subscription: { unsubscribe: function () {} } } }; },
      signUp: function (o) { if (users[o.email]) return Promise.resolve({ data: {}, error: { message: "User already registered" } }); var u = { id: uuid(), email: o.email }; users[o.email] = { u: u, pw: o.password }; session = { user: u }; STO&&STO.setItem('cocoon.auth',JSON.stringify(session)); setTimeout(function () { emit("SIGNED_IN", session); }, 1); return ok({ session: session, user: u }); },
      signInWithPassword: function (o) { var x = users[o.email]; if (!x || x.pw !== o.password) return Promise.resolve({ data: {}, error: { message: "Invalid login credentials" } }); session = { user: x.u }; STO&&STO.setItem('cocoon.auth',JSON.stringify(session)); setTimeout(function () { emit("SIGNED_IN", session); }, 1); return ok({ session: session }); },
      signOut: function () { session = null; STO&&STO.removeItem('cocoon.auth'); emit("SIGNED_OUT", null); return ok(null); },
      resetPasswordForEmail: function () { return ok({}); },
      updateUser: function () { return ok({ user: session.user }); }
    },
    rpc: function (n, a) {
      window.__mock.calls.push(["rpc", n, JSON.stringify(a)]);
      var me = session.user.id;
      if (n === "cocoon_create_foyer") { var f = { id: uuid(), owner: me, code: "c0de" }; T.cocoon_foyers.push(f); T.cocoon_members.push({ foyer: f.id, user_id: me, role: "admin" }); return ok({ id: f.id, code: f.code }); }
      if (n === "cocoon_join_foyer") { var g = T.cocoon_foyers.find(function (x) { return x.id === a.f && x.code === a.c; }); if (!g) return ok(false); T.cocoon_members.push({ foyer: a.f, user_id: me, role: "membre" }); return ok(true); }
      if (n === "cocoon_merge") { var rows = T.cocoon_docs, i = rows.findIndex(function (x) { return x.foyer === a.f && x.path === a.p && x.id === a.i; }); var r = i >= 0 ? rows[i] : { foyer: a.f, path: a.p, id: a.i, data: {} }; r.data = Object.assign({}, r.data, a.patch); r.updated_by = me; if (i < 0) rows.push(r); rt("UPDATE", JSON.parse(JSON.stringify(r))); return ok(null); }
      if (n === "cocoon_cal_token") return ok("ab12cd34ef56ab12cd34ef56ab12cd34");
      if (n === "cocoon_new_code") { var h = T.cocoon_foyers.find(function (x) { return x.id === a.f; }); h.code = "n3w"; return ok("n3w"); }
      return Promise.resolve({ data: null, error: { message: "rpc inconnue " + n } });
    },
    from: function (t) { return new Q(t); },
    channel: function () { var ch = { h: [], on: function (type, filter, cb) { ch.h.push({ filter: { filter: filter.filter }, cb: cb }); return ch; }, subscribe: function (cb) { setTimeout(function () { cb && cb("SUBSCRIBED"); }, 1); return ch; } }; chans.push(ch); return ch; },
    storage: { from: function () { return {
      upload: function (p, f) { files[p] = f; return ok({ path: p }); },
      createSignedUrl: function (p) { return ok({ signedUrl: "https://mock.supabase.co/storage/v1/object/sign/cocoon/" + encodeURIComponent(p).replace(/%2F/g, "/") + "?token=t" }); },
      remove: function (ps) { ps.forEach(function (p) { delete files[p]; }); window.__mock.removed = ps; return ok(null); }
    }; } }
  };
  window.supabase = { createClient: function (u,k,o) { STO=o&&o.auth&&o.auth.storage||null; return client; } };
})();
