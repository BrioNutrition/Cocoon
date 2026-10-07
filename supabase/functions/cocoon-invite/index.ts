// Cocoon · invitation d'un membre par e-mail
// Fonction Supabase « cocoon-invite » — laisser « Verify JWT » ACTIVÉ (seuls les membres connectés peuvent inviter).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const anon = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return out(405, { error: "méthode non autorisée" });

  // Qui invite ?
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(jwt);
  const me = who?.user;
  if (!me) return out(401, { error: "connecte-toi d'abord" });

  let body: { email?: string; nom?: string; foyer?: string; site?: string } = {};
  try { body = await req.json(); } catch (_) { return out(400, { error: "requête invalide" }); }
  const email = String(body.email || "").trim().toLowerCase();
  const foyer = String(body.foyer || "");
  const site = String(body.site || "").split("#")[0].split("?")[0];
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return out(400, { error: "adresse e-mail invalide" });
  if (!/^https:\/\//.test(site)) return out(400, { error: "adresse du site invalide" });

  // L'invitant fait bien partie du foyer ?
  const { data: mem } = await admin.from("cocoon_members").select("user_id").eq("foyer", foyer).eq("user_id", me.id).maybeSingle();
  if (!mem) return out(403, { error: "tu ne fais pas partie de ce foyer" });
  const { data: f } = await admin.from("cocoon_foyers").select("code").eq("id", foyer).maybeSingle();
  if (!f) return out(404, { error: "foyer introuvable" });

  const redirectTo = site + "?rejoindre=" + foyer + "." + f.code;
  const inv = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { foyer, nom: String(body.nom || "").slice(0, 40), invite_par: me.email || "" },
  });
  if (!inv.error) return out(200, { ok: true, mode: "invite" });

  // Déjà un compte Cocoon : on lui envoie un lien de connexion qui l'amène dans le foyer
  if (/already|registered|exists/i.test(inv.error.message)) {
    const otp = await anon.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
    if (otp.error) return out(400, { error: otp.error.message });
    return out(200, { ok: true, mode: "magic" });
  }
  if (/rate limit/i.test(inv.error.message)) return out(429, { error: "trop d'e-mails envoyés pour l'instant, réessaie dans une heure" });
  return out(400, { error: inv.error.message });
});
