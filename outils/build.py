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
    '<div class="sub cx-notif" id="cxNotif" hidden></div>\n    <div class="sub cx-account" id="cxAccount" hidden></div>\n    <details class="done-list" id="mDoneWrap">')

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
    # Logo carré plein bord (si fourni) : iOS et Android arrondissent eux-mêmes l'icône
    full = os.path.join(HERE, "src", "logo-full.png")
    if os.path.exists(full):
        fl = Image.open(full).convert("RGB")
        for size, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png"), (512, "icon-maskable.png")]:
            fl.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)

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
/* Carte « Notifications » (version hébergée) */
(function(){
  if(!window.cocoonHost||!cocoonHost.push) return;
  cocoonHost.ready.then(function(){
    var box=document.getElementById("cxNotif"); if(!box) return;
    var P=cocoonHost.push, D={matin:true,heure:"08:00",courses:true,taches:true,nuit:true}, prefs=Object.assign({},D), on=false, busy=false, msg="", mt=0;
    function esc(t){ return String(t||"").replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
    function sw(k,label,sub){ return '<label class="cx-sw"><span><b>'+label+'</b><small>'+sub+'</small></span><input type="checkbox" data-k="'+k+'"'+(prefs[k]?' checked':'')+'><i aria-hidden="true"></i></label>'; }
    function say(t){ msg=t; draw(); clearTimeout(mt); mt=setTimeout(function(){ msg=""; draw(); },3500); }
    async function load(){ var st=await P.status(); on=st.on; if(on){ try{ prefs=Object.assign({},D,await P.prefs()); }catch(_){} } draw(); }
    function draw(){
      var sup=P.support(); box.hidden=(sup==="off"); if(sup==="off") return;
      var h='<h3>Notifications</h3><div class="cx-acc">';
      if(sup==="ios-home") h+='<p class="cx-p">Sur iPhone, ajoute d\'abord Cocoon à l\'écran d\'accueil : dans Safari, touche <b>Partager</b> puis <b>Sur l\'écran d\'accueil</b>. Ouvre ensuite Cocoon depuis son icône pour activer les notifications.</p>';
      else if(sup==="no") h+='<p class="cx-p">Ce navigateur ne gère pas les notifications. Essaie avec Safari sur iPhone ou Chrome sur Android.</p>';
      else if(!on){
        h+='<p class="cx-p">Un rappel le matin, seulement s\'il y a quelque chose à faire, et quelques alertes utiles en direct. Jamais la nuit.</p><button type="button" class="btn" data-a="on">Activer les notifications</button>';
        if(P.permission()==="denied") h+='<p class="cx-p cx-warn">Les notifications sont bloquées pour Cocoon : autorise-les dans les réglages du téléphone (Réglages → Notifications → Cocoon).</p>';
      } else {
        h+=sw("matin","Rappel du matin","Ta journée en une seule notification. S\'il n\'y a rien, un petit rappel pour penser à ajouter tes tâches (un jour sur deux au plus).");
        if(prefs.matin) h+='<label class="cx-row2"><span>Heure du rappel</span><select data-k="heure">'+["07:30","08:00","08:30","09:00","09:30"].map(function(v){ return '<option value="'+v+'"'+(prefs.heure===v?' selected':'')+'>'+v.replace(/^0/,"").replace(":","h")+'</option>'; }).join("")+'</select></label>';
        h+=sw("courses","Départ aux courses","Quand quelqu\'un part au magasin, pour ajouter ce qui manque (au plus une fois toutes les 3 h).");
        h+=sw("taches","Tâche qu\'on te confie","Seulement si elle est pour aujourd\'hui ou demain.");
        h+=sw("nuit","Silence la nuit","Rien entre 21h30 et 7h30.");
        h+='<div class="cx-btns"><button type="button" class="btn ghost" data-a="demo">Tester toutes les notifications</button><button type="button" class="btn ghost" data-a="off">Désactiver sur ce téléphone</button></div>';
      }
      if(msg) h+='<p class="cx-p cx-msg2" role="status">'+esc(msg)+'</p>';
      box.innerHTML=h+'</div>';
    }
    box.addEventListener("change",async function(e){ var k=e.target.getAttribute("data-k"); if(!k) return;
      prefs[k]=e.target.type==="checkbox"?e.target.checked:e.target.value; draw();
      try{ await P.savePrefs(prefs); say("Réglage enregistré ✓"); }catch(err){ say(err.message||"Réglage non enregistré."); } });
    box.addEventListener("click",async function(e){ var b=e.target.closest("[data-a]"); if(!b||busy) return; var a=b.getAttribute("data-a"); busy=true; b.disabled=true;
      try{
        if(a==="on"){ await P.enable(); await load(); say("C'est activé ✓"); }
        if(a==="off"){ await P.disable(); on=false; say("Notifications désactivées sur ce téléphone."); }
        if(a==="demo"){ var d=await P.demo(); say(d&&d.sent?"Envoyé ✓ Tu vas recevoir un exemple de chaque notification, à quelques secondes d'intervalle.":"Rien n'est arrivé : désactive puis réactive les notifications."); }
        if(a==="test"){ var r=await P.test(); say(r&&r.sent?"Test envoyé ✓":"Le test n'est arrivé sur aucun téléphone : désactive puis réactive."); }
      }catch(err){ say(err.message||"Ça n'a pas marché."); }
      busy=false; if(b) b.disabled=false; });
    load();
    document.addEventListener("visibilitychange",function(){ if(document.visibilityState==="visible") load(); });
  });
})();
</script>
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
        '<button type="button" class="btn ghost cx-out" data-a="out">Se déconnecter</button><span class="cx-ver">Version '+(window.COCOON_BUILD||"")+'</span></div>';
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
if("serviceWorker" in navigator&&location.protocol==="https:"){ var _had=!!navigator.serviceWorker.controller, _rl=false;
  navigator.serviceWorker.addEventListener("controllerchange",function(){ if(_had&&!_rl){ _rl=true; location.reload(); } });
  addEventListener("load",function(){ navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(function(r){ try{ r.update(); }catch(_){} }).catch(function(){}); }); }
</script>
"""
INTRO_CSS = """<style>
#cxIntro{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:#F6F5FB;pointer-events:none}
html[data-theme="dark"] #cxIntro{background:#15141F}html[data-theme="dark"] #cxIntro .cxi-name{color:#F3F1FA}
#cxIntro .cxi-c{display:flex;flex-direction:column;align-items:center;gap:6px}
#cxIntro .cxi-w{position:relative;width:132px;height:132px;margin-bottom:14px;animation:cxiFloat 5s linear .9s infinite}
#cxIntro .cxi-w i{position:absolute;inset:0;border-radius:30px;border:2px solid rgba(255,201,74,.6);opacity:0;animation:cxiRing 2.4s cubic-bezier(.2,.6,.4,1) .7s infinite}
#cxIntro .cxi-w i:nth-child(2){animation-delay:1.9s}
@keyframes cxiRing{0%{opacity:.75;transform:scale(1)}100%{opacity:0;transform:scale(2.6)}}
@keyframes cxiFloat{0%,100%{translate:0 0;rotate:0deg}25%{translate:0 -3px;rotate:2deg}50%{translate:0 -6px;rotate:0deg}75%{translate:0 -3px;rotate:-2deg}}
#cxIntro .cxi-logo{position:relative;display:block;width:132px;height:132px;border-radius:30px;filter:drop-shadow(0 16px 30px rgba(232,118,90,.28));animation:cxiPop .9s cubic-bezier(.34,1.45,.64,1) .05s both}
#cxIntro .cxi-name{font-family:"Bricolage Grotesque","Avenir Next","Segoe UI",system-ui,sans-serif;font-weight:800;font-size:58px;letter-spacing:-.045em;line-height:.95;color:#1C1B2E;display:flex}
#cxIntro .cxi-name span{display:inline-block;animation:cxiRise .7s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(.32s + var(--i) * .06s)}
@keyframes cxiPop{from{opacity:0;transform:scale(.15) rotate(-30deg)}to{opacity:1;transform:none}}
@keyframes cxiRise{from{opacity:0;transform:translateY(22px) scale(.9)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#cxIntro *{animation:none!important}}
#cxGate .cx-card{animation:cxCardIn .5s cubic-bezier(.2,.9,.3,1) both}
@keyframes cxCardIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
</style>"""
INTRO_HTML = """<div id="cxIntro" aria-hidden="true"><div class="cxi-c"><div class="cxi-w"><i></i><i></i><img class="cxi-logo" src="icon-192.png" alt=""></div><div class="cxi-name"><span style="--i:0">C</span><span style="--i:1">o</span><span style="--i:2">c</span><span style="--i:3">o</span><span style="--i:4">o</span><span style="--i:5">n</span></div></div></div>
<script>(function(){var T=performance.now(),done=false;window.cxIntroOut=function(fast){if(done)return;done=true;var el=document.getElementById("cxIntro");if(!el)return;if(fast){el.remove();return;}var wait=Math.max(0,1250-(performance.now()-T));setTimeout(function(){var c=el.querySelector(".cxi-c");try{c.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateY(-26px) scale(.94)"}],{duration:420,easing:"cubic-bezier(.4,0,.2,1)",fill:"forwards"});el.animate([{opacity:1},{opacity:0}],{duration:460,delay:120,easing:"ease-out",fill:"forwards"}).onfinish=function(){el.remove();};}catch(_){el.remove();}},wait);};setTimeout(function(){window.cxIntroOut();},9000);})();</script>"""
ACCOUNT_CSS = """<style>
.cx-acc{display:grid;gap:12px;background:var(--surface);border:2px solid var(--line);border-radius:20px;padding:14px}
.cx-row{display:grid;gap:4px}.cx-k{font-size:13px;color:var(--muted);font-weight:600}.cx-v{font-size:15.5px;word-break:break-all}
.cx-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.cx-out{justify-self:start}.cx-ver{font-size:12px;color:var(--muted)}
.cx-p{margin:0;font-size:14.5px;line-height:1.45;color:var(--muted)}.cx-p b{color:var(--ink)}.cx-warn{color:#B5482F}.cx-msg2{color:var(--ink);font-weight:600}
.cx-notif .btn{justify-self:start}
.cx-sw{display:flex;align-items:center;gap:12px;cursor:pointer}
.cx-sw span{flex:1;display:grid;gap:2px}.cx-sw b{font-size:15px}.cx-sw small{font-size:12.5px;color:var(--muted);line-height:1.35}
.cx-sw input{position:absolute;opacity:0;width:1px;height:1px}
.cx-sw i{flex:none;width:46px;height:28px;border-radius:99px;background:var(--line);position:relative;transition:background .2s}
.cx-sw i::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.3,.8,.4,1)}
.cx-sw input:checked+i{background:#2F9E5B}.cx-sw input:checked+i::after{transform:translateX(18px)}
.cx-sw input:focus-visible+i{outline:2px solid var(--ink);outline-offset:2px}
.cx-row2{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14.5px;font-weight:600;padding-left:2px}
.cx-row2 select{font:inherit;font-size:15px;padding:7px 10px;border-radius:12px;border:2px solid var(--line);background:var(--surface);color:var(--ink)}
</style>"""

INTRO = 1
import datetime as _dt
BUILD = (_dt.datetime.utcnow()+_dt.timedelta(hours=2)).strftime("%d/%m %H:%M")
head = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F6F5FB">
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
<script>try{{var _t=localStorage.getItem("cocoon.theme");if(_t!=="auto")document.documentElement.dataset.theme=_t==="dark"?"dark":"light";}}catch(e){{document.documentElement.dataset.theme="light";}}</script>
<script>window.COCOON_BUILD="{BUILD}";</script>
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
