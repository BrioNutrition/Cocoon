// Cocoon · calendrier du téléphone (abonnement webcal)
// Fonction Supabase « cocoon-agenda » — à déployer SANS vérification JWT
// (le calendrier de l'iPhone ne peut pas envoyer de clé ; le lien secret ?t=… sert de clé).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

type Ev = { uid: string; titre: string; date: string; desc?: string; rrule?: string; alarm?: boolean; timed?: boolean; time?: string; pour?: string[] };

const esc = (s: string) => String(s).replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
const d8 = (s: string) => s.replace(/-/g, "");
const nextDay = (s: string) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
// Lignes ICS de 75 octets max (règle du format)
const fold = (l: string) => { const out: string[] = []; let cur = ""; for (const ch of l) { if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = " " + ch; } else cur += ch; } out.push(cur); return out.join("\r\n"); };

function ics(evs: Ev[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cocoon//Foyer//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Cocoon", "X-WR-TIMEZONE:Europe/Paris", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const e of evs) {
    if (!e || !e.uid || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) continue;
    L.push("BEGIN:VEVENT", "UID:" + e.uid + "@cocoon", "DTSTAMP:" + stamp);
    if (e.timed && /^\d{6}$/.test(e.time || "")) L.push("DTSTART:" + d8(e.date) + "T" + e.time, "DURATION:PT15M");
    else L.push("DTSTART;VALUE=DATE:" + d8(e.date), "DTEND;VALUE=DATE:" + d8(nextDay(e.date)));
    L.push("SUMMARY:" + esc(e.titre || "Cocoon"));
    if (e.desc) L.push("DESCRIPTION:" + esc(e.desc));
    if (e.rrule && /^[A-Z0-9=;,]+$/.test(e.rrule)) L.push("RRULE:" + e.rrule);
    if (e.alarm) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(e.titre || "Cocoon"), "TRIGGER:" + (e.timed ? "-PT0M" : "-PT15H"), "END:VALARM");
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
}

Deno.serve(async (req) => {
  const t = new URL(req.url).searchParams.get("t") || "";
  const nf = () => new Response("Calendrier introuvable", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!/^[a-f0-9]{32,80}$/.test(t)) return nf();
  const { data: tok } = await sb.from("cocoon_cal_tokens").select("user_id,foyer").eq("token", t).maybeSingle();
  if (!tok) return nf();
  const { data: mem } = await sb.from("cocoon_members").select("user_id").eq("foyer", tok.foyer).eq("user_id", tok.user_id).maybeSingle();
  if (!mem) return nf(); // la personne a quitté le foyer
  const { data: rows } = await sb.from("cocoon_cal").select("owner,events,moi").eq("foyer", tok.foyer).in("owner", ["foyer", tok.user_id]);
  const shared = rows?.find((r) => r.owner === "foyer");
  const mine = rows?.find((r) => r.owner === tok.user_id);
  const moi = mine?.moi || null;
  const evs: Ev[] = [];
  for (const e of (shared?.events || []) as Ev[]) if (!e.pour || !e.pour.length || !moi || e.pour.includes(moi)) evs.push(e);
  for (const e of (mine?.events || []) as Ev[]) evs.push(e);
  evs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return new Response(ics(evs), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-cache, max-age=0", "content-disposition": 'inline; filename="cocoon.ics"' },
  });
});
