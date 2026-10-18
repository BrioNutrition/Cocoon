/* Cocoon · connexion à Supabase (clé « anon public » : faite pour être publique).
   Ne jamais mettre la clé « service_role » / « secret » ici. */
window.COCOON_CONFIG = {
  url: "https://wzyycxapukzwbhbawkqo.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eXljeGFwdWt6d2JoYmF3a3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNTY0NDUsImV4cCI6MjEwNjkzMjQ0NX0.JAnluVnpPjjLiaDXxCReugfQGv1p2081BI8ZvU82H6U",
  /* Double authentification par code e-mail : passer à true une fois Brevo branché dans Supabase
     (SMTP) et le modèle « Magic link » collé (supabase/emails/connexion.html), sinon l'e-mail n'a pas de code */
  codeEmail: false,
  /* Clé publique des notifications (faite pour être publique ; la clé secrète va dans Supabase) */
  vapid: "BHK-FwWfQD0A4HJEo7IY4-PmER_oO3kGTGA799csoc5aRJOWnky_Ay4TAmRSfsgZHnsH0Z2Ftld7-Fcv4cntx4k"
};
