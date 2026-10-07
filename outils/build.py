#!/usr/bin/env python3
"""Construit la version hébergée de Cocoon (GitHub Pages + Supabase)
à partir du fichier de l'app Claude (assistant-du-foyer.html).

Usage : python3 build.py ../assistant-du-foyer.html dist/
"""
import base64, io, json, os, re, shutil, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "../assistant-du-foyer.html"
OUT = sys.argv[2] if len(sys.argv) > 2 else "dist"
HERE = os.path.dirname(os.path.abspath(__file__))
SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"

s = open(SRC, encoding="utf-8").read()


def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, ("introuvable" if not c else f"{c} fois", a[:90])
    s = s.replace(a, b)


# ---- Adapter l'app à l'hébergement --------------------------------------
rep('const APP_URL="https://claude.ai/artifact/Xu9LzXYTYJVDHX4aZPyFkN";',
    'const APP_URL=location.origin+location.pathname;')
rep('" : "+APP_URL+"\\nConnecte-toi avec ton compte Claude, puis choisis',
    '" : "+(window.cocoonHost?cocoonHost.inviteUrl():APP_URL)+"\\nCrée ton compte avec ton e-mail, puis choisis')
a = s.index('ol.append(el("li",{},el("b",{text:"Donne-lui l\'accès : "})')
b = s.index("\n", a)
s = s[:a] + 'ol.append(el("li",{},el("b",{text:"Ce lien ouvre ton foyer : "}),"ne l\'envoie qu\'aux membres. Il crée son compte avec son e-mail et arrive directement chez vous."));' + s[b:]

# Carte « Mon compte » en bas de l'onglet Moi
rep('<details class="done-list" id="mDoneWrap">',
    '<div class="sub cx-account" id="cxAccount" hidden></div>\n    <details class="done-list" id="mDoneWrap">')

# ---- Icônes de l'app (tirées du logo) ------------------------------------
os.makedirs(OUT, exist_ok=True)
m = re.search(r'class="brand-logo" src="data:image/(\w+);base64,([^"]+)"', s)
icons = {}
if m:
    from PIL import Image
    im = Image.open(io.BytesIO(base64.b64decode(m.group(2)))).convert("RGBA")
    for size, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        bg = Image.new("RGBA", (size, size), (255, 241, 222, 255))
        lg = im.resize((size, size), Image.LANCZOS)
        bg.alpha_composite(lg)
        bg.convert("RGB").save(os.path.join(OUT, name), optimize=True)
        icons[name] = size
    mk = Image.new("RGBA", (512, 512), (255, 241, 222, 255))
    lg = im.resize((400, 400), Image.LANCZOS)
    mk.alpha_composite(lg, (56, 56))
    mk.convert("RGB").save(os.path.join(OUT, "icon-maskable.png"), optimize=True)

manifest = {
    "name": "Cocoon", "short_name": "Cocoon", "lang": "fr",
    "description": "Le carnet partagé de la maison : tâches, courses, papiers, budget.",
    "start_url": "./", "scope": "./", "display": "standalone",
    "background_color": "#F6F5FB", "theme_color": "#F6F5FB",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
}
json.dump(manifest, open(os.path.join(OUT, "manifest.webmanifest"), "w"), ensure_ascii=False, indent=2)

ACCOUNT_JS = r"""
<script>
/* Carte « Mon compte » (version hébergée) */
(function(){
  if(!window.cocoonHost) return;
  cocoonHost.ready.then(function(){
    var box=document.getElementById("cxAccount"); if(!box) return; box.hidden=false;
    function draw(){
      box.innerHTML='<h3>Mon compte</h3><div class="cx-acc"><div class="cx-row"><span class="cx-k">Connecté avec</span><b class="cx-v"></b></div>'+
        '<div class="cx-row cx-inv"><span class="cx-k">Lien d\'invitation du foyer</span><div class="cx-btns"><button type="button" class="btn" data-a="copy">Copier le lien</button>'+
        (navigator.share?'<button type="button" class="btn ghost" data-a="share">Partager</button>':'')+
        (cocoonHost.isAdmin()?'<button type="button" class="btn ghost" data-a="reset">Nouveau lien</button>':'')+'</div></div>'+
        '<button type="button" class="btn ghost cx-out" data-a="out">Se déconnecter</button></div>';
      box.querySelector(".cx-v").textContent=cocoonHost.email()||"";
    }
    function say(t){ var x=document.querySelector(".toast"); if(window.__cxToast) window.__cxToast(t); else alert(t); }
    draw();
    box.addEventListener("click",async function(e){
      var b=e.target.closest("[data-a]"); if(!b) return; var a=b.getAttribute("data-a");
      if(a==="copy"){ try{ await navigator.clipboard.writeText(cocoonHost.inviteUrl()); b.textContent="Lien copié ✓"; setTimeout(draw,1800); }catch(_){ prompt("Copie ce lien :",cocoonHost.inviteUrl()); } }
      if(a==="share"){ try{ await navigator.share({title:"Cocoon",text:"Rejoins notre foyer sur Cocoon",url:cocoonHost.inviteUrl()}); }catch(_){} }
      if(a==="reset"){ if(!confirm("Créer un nouveau lien ? L'ancien ne marchera plus.")) return; try{ await cocoonHost.newCode(); b.textContent="Nouveau lien prêt ✓"; setTimeout(draw,1800); }catch(err){ alert(err.message); } }
      if(a==="out"){ if(confirm("Se déconnecter de Cocoon sur cet appareil ?")) cocoonHost.logout(); }
    });
  });
})();
if("serviceWorker" in navigator&&location.protocol==="https:") addEventListener("load",function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
</script>
"""
ACCOUNT_CSS = """<style>
.cx-acc{display:grid;gap:12px;background:var(--surface);border:2px solid var(--line);border-radius:20px;padding:14px}
.cx-row{display:grid;gap:4px}.cx-k{font-size:13px;color:var(--muted);font-weight:600}.cx-v{font-size:15.5px;word-break:break-all}
.cx-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.cx-out{justify-self:start}
</style>"""

head = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F6F5FB" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15141F" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Cocoon">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="description" content="Cocoon, le carnet partagé de la maison : tâches, courses, papiers, budget.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">
<script src="config.js"></script>
<script src="{SUPABASE_JS}"></script>
<script src="cocoon-runtime.js"></script>
{ACCOUNT_CSS}
</head>
<body>
"""
html = head + s + ACCOUNT_JS + "\n</body>\n</html>\n"
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
shutil.copy(os.path.join(HERE, "src", "cocoon-runtime.js"), os.path.join(OUT, "cocoon-runtime.js"))
shutil.copy(os.path.join(HERE, "src", "sw.js"), os.path.join(OUT, "sw.js"))
if not os.path.exists(os.path.join(OUT, "config.js")):
    shutil.copy(os.path.join(HERE, "src", "config.example.js"), os.path.join(OUT, "config.js"))
open(os.path.join(OUT, ".nojekyll"), "w").close()
print("OK →", OUT, f"({len(html)//1024} Ko)")
