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
INTRO_CSS = """<style>
#cxIntro{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:#F6F5FB;pointer-events:none}
@media (prefers-color-scheme:dark){#cxIntro{background:#15141F}#cxIntro .cxi-name{color:#F3F1FA}}
#cxIntro .cxi-c{display:flex;flex-direction:column;align-items:center;gap:6px}
#cxIntro .cxi-logo{width:132px;height:132px;border-radius:30px;margin-bottom:14px;filter:drop-shadow(0 16px 30px rgba(232,118,90,.28));animation:cxiPop .9s cubic-bezier(.34,1.45,.64,1) .05s both}
#cxIntro .cxi-name{font-family:"Bricolage Grotesque","Avenir Next","Segoe UI",system-ui,sans-serif;font-weight:800;font-size:58px;letter-spacing:-.045em;line-height:.95;color:#1C1B2E;display:flex}
#cxIntro .cxi-name span{display:inline-block;animation:cxiRise .7s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(.32s + var(--i) * .06s)}
@keyframes cxiPop{from{opacity:0;transform:scale(.15) rotate(-30deg)}to{opacity:1;transform:none}}
@keyframes cxiRise{from{opacity:0;transform:translateY(22px) scale(.9)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#cxIntro *{animation:none!important}}
#cxGate .cx-card{animation:cxCardIn .5s cubic-bezier(.2,.9,.3,1) both}
@keyframes cxCardIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
</style>"""
INTRO_HTML = """<div id="cxIntro" aria-hidden="true"><div class="cxi-c"><img class="cxi-logo" src="icon-192.png" alt=""><div class="cxi-name"><span style="--i:0">C</span><span style="--i:1">o</span><span style="--i:2">c</span><span style="--i:3">o</span><span style="--i:4">o</span><span style="--i:5">n</span></div></div></div>
<script>(function(){var T=performance.now(),done=false;window.cxIntroOut=function(){if(done)return;done=true;var el=document.getElementById("cxIntro");if(!el)return;var wait=Math.max(0,1250-(performance.now()-T));setTimeout(function(){var c=el.querySelector(".cxi-c");try{c.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateY(-26px) scale(.94)"}],{duration:420,easing:"cubic-bezier(.4,0,.2,1)",fill:"forwards"});el.animate([{opacity:1},{opacity:0}],{duration:460,delay:120,easing:"ease-out",fill:"forwards"}).onfinish=function(){el.remove();};}catch(_){el.remove();}},wait);};setTimeout(function(){window.cxIntroOut();},9000);})();</script>"""
ACCOUNT_CSS = """<style>
.cx-acc{display:grid;gap:12px;background:var(--surface);border:2px solid var(--line);border-radius:20px;padding:14px}
.cx-row{display:grid;gap:4px}.cx-k{font-size:13px;color:var(--muted);font-weight:600}.cx-v{font-size:15.5px;word-break:break-all}
.cx-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.cx-out{justify-self:start}
</style>"""

INTRO = 1
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
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Fredoka:wdth,wght@75..125,300..700&display=swap">
{INTRO_CSS}
<script src="config.js"></script>
<script id="sbjs" async src="{SUPABASE_JS}"></script>
<script src="cocoon-runtime.js"></script>
{ACCOUNT_CSS}
</head>
<body>
{INTRO_HTML}
"""
html = head + s + ACCOUNT_JS + "\n</body>\n</html>\n"
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
shutil.copy(os.path.join(HERE, "src", "cocoon-runtime.js"), os.path.join(OUT, "cocoon-runtime.js"))
shutil.copy(os.path.join(HERE, "src", "sw.js"), os.path.join(OUT, "sw.js"))
if not os.path.exists(os.path.join(OUT, "config.js")):
    shutil.copy(os.path.join(HERE, "src", "config.example.js"), os.path.join(OUT, "config.js"))
open(os.path.join(OUT, ".nojekyll"), "w").close()
print("OK →", OUT, f"({len(html)//1024} Ko)")
