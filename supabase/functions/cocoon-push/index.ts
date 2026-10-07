// @ts-nocheck
// Cocoon · notifications sur le téléphone
// Fonction Supabase « cocoon-push » — à déployer avec « Verify JWT » DÉSACTIVÉ :
//  - la tâche planifiée (toutes les 15 min) l'appelle avec une clé interne pour les rappels du matin ;
//  - l'app l'appelle avec le compte connecté pour les événements en direct (courses, tâche confiée, test).
// Secrets à ajouter (Edge Functions → Secrets) : VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const VAPID = { pub: Deno.env.get("VAPID_PUBLIC_KEY") || "", priv: Deno.env.get("VAPID_PRIVATE_KEY") || "", sub: "https://brionutrition.github.io/Cocoon/" };

// ---------- CORE (sans dépendance : chiffrement Web Push + agenda du jour) ----------
const te = new TextEncoder();
function b64uEnc(buf) { const b = new Uint8Array(buf); let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64uDec(str) { const s = String(str).replace(/-/g, "+").replace(/_/g, "/"); const p = s + "===".slice((s.length + 3) % 4); const bin = atob(p); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
function cat(...parts) { const n = parts.reduce((a, p) => a + p.length, 0), o = new Uint8Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; }
async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8));
}
// En-tête VAPID : prouve que la notification vient bien de Cocoon (RFC 8292)
async function vapidHeader(endpoint, vapid) {
  const aud = new URL(endpoint).origin, pub = b64uDec(vapid.pub);
  const jwk = { kty: "EC", crv: "P-256", d: vapid.priv, x: b64uEnc(pub.slice(1, 33)), y: b64uEnc(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64uEnc(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64uEnc(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.sub })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(head + "." + body));
  return "vapid t=" + head + "." + body + "." + b64uEnc(sig) + ", k=" + vapid.pub;
}
// Chiffrement du message pour le téléphone (RFC 8291, aes128gcm)
async function encryptPayload(text, p256dh, authB64) {
  const ua = b64uDec(p256dh), auth = b64uDec(authB64);
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, kp.privateKey, 256));
  const ikm = await hkdf(auth, shared, cat(te.encode("WebPush: info\0"), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, cat(te.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
async function sendOne(sub, payload, vapid, fetcher) {
  const body = await encryptPayload(JSON.stringify(payload), sub.p256dh, sub.auth);
  const r = await (fetcher || fetch)(sub.endpoint, { method: "POST", body, headers: {
    "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "43200", Urgency: "normal",
    Authorization: await vapidHeader(sub.endpoint, vapid) } });
  return r.status;
}
// Heure locale de la personne
function localNow(tz, now) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(now || new Date()).map((x) => [x.type, x.value]));
  return { date: p.year + "-" + p.month + "-" + p.day, min: Number(p.hour) * 60 + Number(p.minute) };
}
const DAY = 864e5;
const dnum = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const addDays = (s, n) => new Date(dnum(s) + n * DAY).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((dnum(a) - dnum(b)) / DAY);
const quiet = (min) => min >= 21 * 60 + 30 || min < 7 * 60 + 30;
const BYD = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
function occursOn(e, D) {
  if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) return false;
  if (D < e.date) return false;
  if (!e.rrule) return D === e.date;
  const R = Object.fromEntries(String(e.rrule).split(";").map((x) => x.split("=")));
  const iv = Math.max(1, parseInt(R.INTERVAL || "1", 10) || 1), d = new Date(dnum(D)), b = new Date(dnum(e.date));
  if (R.FREQ === "WEEKLY") {
    const days = R.BYDAY ? R.BYDAY.split(",") : [BYD[b.getUTCDay()]];
    if (!days.includes(BYD[d.getUTCDay()])) return false;
    const mon = (x) => x.getTime() - ((x.getUTCDay() + 6) % 7) * DAY;
    return Math.round((mon(d) - mon(b)) / (7 * DAY)) % iv === 0;
  }
  if (R.FREQ === "MONTHLY") { const m = (d.getUTCFullYear() - b.getUTCFullYear()) * 12 + d.getUTCMonth() - b.getUTCMonth(); return d.getUTCDate() === b.getUTCDate() && m % iv === 0; }
  if (R.FREQ === "YEARLY") return d.getUTCDate() === b.getUTCDate() && d.getUTCMonth() === b.getUTCMonth();
  return D === e.date;
}
// Le résumé du matin : ce qui concerne cette personne aujourd'hui
function buildDigest({ shared, mine, moi, today, repas, noms }) {
  const tomorrow = addDays(today, 1), evs = [];
  for (const e of shared || []) if (!e.pour || !e.pour.length || !moi || e.pour.includes(moi)) evs.push(e);
  for (const e of mine || []) evs.push(e);
  const late = [], now = [], other = [];
  for (const e of evs) {
    const id = String(e.uid || ""), t = String(e.titre || "").trim(); if (!t) continue;
    if (id.startsWith("t-")) { if (e.date < today) late.push(t); else if (e.date === today) now.push(t); continue; }
    if (id.startsWith("bin-")) { if (occursOn(e, today)) now.push(t.replace(/^Sortir la poubelle : /, "Sortir la poubelle ") + (e.time === "193000" ? " ce soir" : "")); continue; }
    if (id.startsWith("d-")) { const n = diffDays(e.date, today), nm = t.replace(/ expire$/, ""); if (n === 30 || n === 7) other.push(nm + " expire dans " + n + " jours"); else if (n === 0) other.push(nm + " expire aujourd'hui"); continue; }
    if (id.startsWith("ab-")) { if (occursOn(e, tomorrow)) other.push(t + " demain"); continue; }
    if (id.startsWith("bd-")) { if (occursOn(e, today)) other.push("🎂 " + t); continue; }
    if (id.startsWith("r-")) { if (e.date === today) now.push("RDV · " + t); continue; }
    if (occursOn(e, today)) now.push(t); // entretien, contrôle technique, révision…
  }
  const lines = [];
  if (late.length) lines.push("⏰ En retard : " + late.slice(0, 2).join(", ") + (late.length > 2 ? "…" : ""));
  for (const t of now) lines.push("• " + t);
  const hasItems = lines.length > 0 || other.length > 0, after = other.map((t) => "• " + t);
  const who = (id) => (id ? (id === moi ? "toi" : noms[id] || null) : null);
  for (const [slot, label] of [["midi", "Ce midi"], ["soir", "Ce soir"]]) {
    const r = (repas || {})[today + "_" + slot]; if (!r || !r.plat) continue;
    const c = who(r.cuisine), v = who(r.vaisselle), bits = [];
    if (c) bits.push(c === "toi" ? "tu cuisines" : c + " cuisine");
    if (v) bits.push(v === "toi" ? "tu fais la vaisselle" : v + " fait la vaisselle");
    lines.push("🍽 " + label + " : " + r.plat + (bits.length ? " (" + bits.join(", ") + ")" : ""));
  }
  return { hasItems, lines: lines.concat(after) };
}
function digestPayload(dg, nudge) {
  const max = 6, lines = dg.lines.slice(0, max);
  if (dg.lines.length > max) lines.push("…et " + (dg.lines.length - max) + " autre" + (dg.lines.length - max > 1 ? "s" : ""));
  if (!dg.hasItems) {
    if (!nudge) return lines.length ? { title: "☀️ Ta journée dans le cocon", body: lines.join("\n"), url: "./", tag: "matin" } : null;
    return { title: "☀️ Rien de prévu aujourd'hui", body: ["Pense à ajouter tes tâches pour que rien ne passe à la trappe ✍️"].concat(lines).join("\n"), url: "./", tag: "matin" };
  }
  return { title: "☀️ Ta journée dans le cocon", body: lines.join("\n"), url: "./", tag: "matin" };
}
const PREFS0 = { matin: true, heure: "08:00", courses: true, taches: true, nuit: true };
const prefsOf = (p) => Object.assign({}, PREFS0, p || {});
const hm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : 480; };
// ---------- FIN CORE ----------

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const out = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });

// Garde une trace ; renvoie false si c'était déjà fait (évite les doublons)
async function once(user_id, kind, key) {
  const { error } = await admin.from("cocoon_push_log").insert({ user_id, kind, key });
  return !error;
}
async function deliver(subs, payload) {
  let ok = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      const st = await sendOne(s, payload, VAPID);
      if (st === 404 || st === 410) await admin.from("cocoon_push_subs").delete().eq("endpoint", s.endpoint);
      else if (st < 300) ok++;
    } catch (_) { /* appareil injoignable : on réessaiera la prochaine fois */ }
  }));
  return ok;
}
async function foyerDocs(foyer, path) {
  const { data } = await admin.from("cocoon_docs").select("id,data").eq("foyer", foyer).eq("path", path);
  return data || [];
}
async function membresOf(foyer) {
  const rows = await foyerDocs(foyer, "membres"), byUid = {}, noms = {};
  for (const r of rows) { const d = r.data || {}; noms[r.id] = d.nom || ""; if (d.uid) byUid[d.uid] = r.id; }
  return { byUid, noms, rows };
}

async function tick() {
  const now = new Date();
  const { data: subs } = await admin.from("cocoon_push_subs").select("*");
  if (!subs || !subs.length) return { sent: 0 };
  const users = {};
  for (const s of subs) (users[s.user_id + "|" + s.foyer] = users[s.user_id + "|" + s.foyer] || []).push(s);
  const ids = [...new Set(subs.map((s) => s.user_id))];
  const { data: pr } = await admin.from("cocoon_push_prefs").select("user_id,prefs").in("user_id", ids);
  const prefs = Object.fromEntries((pr || []).map((p) => [p.user_id, prefsOf(p.prefs)]));
  const cache = {};
  let sent = 0;
  for (const k of Object.keys(users)) {
    const [uid, foyer] = k.split("|"), list = users[k], P = prefs[uid] || prefsOf(null);
    if (!P.matin) continue;
    const L = localNow(list[0].tz, now), H = hm(P.heure);
    if (L.min < H || L.min >= H + 60) continue;
    if (!(await once(uid, "matin", L.date))) continue;
    if (!cache[foyer]) {
      const [cal, rep, mem] = await Promise.all([
        admin.from("cocoon_cal").select("owner,events,moi").eq("foyer", foyer),
        foyerDocs(foyer, "repas"), membresOf(foyer)]);
      cache[foyer] = { cal: cal.data || [], repas: Object.fromEntries(rep.map((r) => [r.id, r.data])), mem };
    }
    const C = cache[foyer], shared = C.cal.find((r) => r.owner === "foyer"), mine = C.cal.find((r) => r.owner === uid);
    const moi = (mine && mine.moi) || C.mem.byUid[uid] || null;
    const dg = buildDigest({ shared: shared && shared.events, mine: mine && mine.events, moi, today: L.date, repas: C.repas, noms: C.mem.noms });
    let nudge = false;
    if (!dg.hasItems) {
      const { data: prev } = await admin.from("cocoon_push_log").select("key").eq("user_id", uid).eq("kind", "vide").eq("key", addDays(L.date, -1)).maybeSingle();
      if (!prev) { nudge = true; await once(uid, "vide", L.date); }
    }
    const payload = digestPayload(dg, nudge);
    if (payload) sent += await deliver(list, payload);
  }
  await admin.from("cocoon_push_log").delete().lt("sent_at", new Date(Date.now() - 40 * DAY).toISOString());
  return { sent };
}

async function event(me, body) {
  const foyer = String(body.foyer || "");
  const { data: mem } = await admin.from("cocoon_members").select("user_id").eq("foyer", foyer).eq("user_id", me.id).maybeSingle();
  if (!mem) return out(403, { error: "tu ne fais pas partie de ce foyer" });
  const M = await membresOf(foyer), myName = M.noms[M.byUid[me.id]] || (me.email || "").split("@")[0] || "Quelqu'un";
  const { data: subs } = await admin.from("cocoon_push_subs").select("*").eq("foyer", foyer);
  const ids = [...new Set((subs || []).map((s) => s.user_id))];
  const { data: pr } = ids.length ? await admin.from("cocoon_push_prefs").select("user_id,prefs").in("user_id", ids) : { data: [] };
  const prefs = Object.fromEntries((pr || []).map((p) => [p.user_id, prefsOf(p.prefs)]));
  const P = (u) => prefs[u] || prefsOf(null);
  const awake = (s) => !P(s.user_id).nuit || !quiet(localNow(s.tz).min);

  if (body.type === "test") {
    const mine = (subs || []).filter((s) => s.user_id === me.id);
    const n = await deliver(mine, { title: "🔔 Cocoon", body: "C'est tout bon : les notifications marchent sur ce téléphone.", url: "./", tag: "test" });
    return out(200, { ok: true, sent: n });
  }
  if (body.type === "courses") {
    // Une seule fois toutes les 3 heures par foyer
    const { data: last } = await admin.from("cocoon_push_log").select("sent_at").eq("user_id", foyer).eq("kind", "courses").eq("key", "foyer").maybeSingle();
    if (last && Date.now() - new Date(last.sent_at).getTime() < 3 * 3600e3) return out(200, { ok: true, sent: 0, skipped: "récent" });
    await admin.from("cocoon_push_log").upsert({ user_id: foyer, kind: "courses", key: "foyer", sent_at: new Date().toISOString() });
    const to = (subs || []).filter((s) => s.user_id !== me.id && P(s.user_id).courses && awake(s));
    const n = await deliver(to, { title: "🛒 " + myName + " part faire les courses", body: "Ajoute vite ce qui manque : ça apparaît en direct sur son téléphone.", url: "./#courses", tag: "courses" });
    return out(200, { ok: true, sent: n });
  }
  if (body.type === "tache") {
    const target = (M.rows.find((r) => r.id === body.pour) || {}).data, tuid = target && target.uid;
    if (!tuid || tuid === me.id) return out(200, { ok: true, sent: 0 });
    const to = (subs || []).filter((s) => s.user_id === tuid && P(tuid).taches && awake(s));
    if (!to.length) return out(200, { ok: true, sent: 0 });
    const L = localNow(to[0].tz), ech = String(body.echeance || "");
    if (ech !== L.date && ech !== addDays(L.date, 1)) return out(200, { ok: true, sent: 0 });
    const titre = String(body.titre || "").slice(0, 120);
    if (!(await once(tuid, "tache", (body.pour || "") + ":" + titre + ":" + ech))) return out(200, { ok: true, sent: 0 });
    const n = await deliver(to, { title: "📌 " + myName + " t'a confié une tâche", body: titre + (ech === L.date ? " · aujourd'hui" : " · demain"), url: "./", tag: "tache" });
    return out(200, { ok: true, sent: n });
  }
  return out(400, { error: "événement inconnu" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return out(405, { error: "méthode non autorisée" });
  if (!VAPID.pub || !VAPID.priv) return out(500, { error: "clés de notification manquantes dans les secrets Supabase" });
  let body = {};
  try { body = await req.json(); } catch (_) { return out(400, { error: "requête invalide" }); }
  if (body.mode === "tick") {
    const { data: cfg } = await admin.from("cocoon_push_cfg").select("v").eq("k", "cron").maybeSingle();
    if (!cfg || body.key !== cfg.v) return out(401, { error: "accès refusé" });
    return out(200, await tick());
  }
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(jwt);
  if (!who || !who.user) return out(401, { error: "connecte-toi d'abord" });
  return event(who.user, body);
});
