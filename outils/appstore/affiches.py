"""Images App Store (style « affiche dégradée » choisi par Angel) à partir de outils/appstore/raw/."""
import asyncio,os,sys
from playwright.async_api import async_playwright
D=os.path.dirname(os.path.abspath(__file__)); OUTD=os.path.abspath(D+'/../../app/appstore')
LOGO=D+'/logo.png'
CSS='''<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Fredoka:wdth,wght@75..125,300..700&display=swap">
<style>*{box-sizing:border-box}html,body{margin:0;width:440px;height:956px;overflow:hidden;font-family:"Bricolage Grotesque",system-ui;color:#1C1B2E}
.phone{position:absolute;container-type:inline-size}
.phone .fr{position:relative;border-radius:17cqw;padding:2.6cqw;background:linear-gradient(140deg,#8E8A86 0%,#4B4846 18%,#2C2A29 50%,#55524F 82%,#9A9590 100%);
  box-shadow:inset 0 0 0 .5cqw #1B1A19,inset 0 0 0 .9cqw #6F6B67,0 30px 60px rgba(28,27,46,.30)}
.phone .fr::before,.phone .fr::after{content:"";position:absolute;width:1.1cqw;border-radius:1cqw;background:linear-gradient(90deg,#3A3836,#77726E)}
.phone .fr::before{left:-.9cqw;top:19%;height:7%;box-shadow:0 13cqw 0 #5A5653,0 26cqw 0 #5A5653}
.phone .fr::after{right:-.9cqw;top:27%;height:15%}
.phone .scr{position:relative;border-radius:14.5cqw;overflow:hidden;background:#F6F5FB;padding-top:11cqw}
.phone .scr::before{content:"9:41";position:absolute;left:9cqw;top:3.6cqw;font:700 4.1cqw/1 -apple-system,"SF Pro Text","Bricolage Grotesque",sans-serif;color:#1C1B2E}
.phone .scr::after{content:"";position:absolute;left:50%;top:2.6cqw;width:29cqw;height:8.4cqw;margin-left:-14.5cqw;border-radius:9cqw;background:#050507}
.phone img.s{display:block;width:100%;height:auto}
h1{margin:0;font-weight:800;letter-spacing:-.03em;line-height:1.02}
.hl{background:#FFC94A;padding:0 8px;border-radius:10px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.st{position:absolute;font-weight:900;font-size:15px;background:#FFE14D;color:#1C1B2E;padding:7px 12px;border-radius:13px;box-shadow:0 4px 0 rgba(0,0,0,.15)}
</style>'''
def A(img,title,rot=-3,cat="left"):  # affiche dégradée
  cpos="left:18px" if cat=="left" else "right:18px"
  return f'''<body style="background:radial-gradient(120% 70% at 100% 0%,#FFD66B 0%,transparent 55%),linear-gradient(165deg,#FF9C80,#E2629B 55%,#8C5BD6)">
<div style="position:absolute;left:30px;right:30px;top:58px;color:#fff">
<div style="display:flex;align-items:center;gap:10px"><img src="file://{LOGO}" style="width:40px;height:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.18)"><span style="font-family:Fredoka,sans-serif;font-weight:700;font-variation-settings:'wdth' 115;font-size:30px;letter-spacing:-.01em">Cocoon</span></div>
<h1 style="font-size:42px;margin-top:18px">{title}</h1></div>
<div class="phone" style="left:66px;width:308px;top:250px;transform:rotate({rot}deg)"><div class="fr"><div class="scr"><img class="s" src="file://{D}/raw/{img}.png"></div></div></div>
<img src="file://{LOGO}" style="position:absolute;right:26px;top:34px;width:74px;height:74px;border-radius:23px;transform:rotate({-10 if cat=='left' else 10}deg);box-shadow:0 12px 26px rgba(0,0,0,.22)"></body>'''
def B(img,title,sub):  # clair épuré
  return f'''<body style="background:#F6F5FB">
<div style="position:absolute;left:32px;right:32px;top:70px;text-align:center"><h1 style="font-size:40px">{title}</h1><p style="margin:12px 0 0;font-size:17px;color:#625F7E">{sub}</p></div>
<div class="phone" style="left:52px;right:52px;top:270px;height:790px"><div class="scr"><img class="s" src="file://{D}/raw/{img}.png"></div></div></body>'''
def C(img,title,cards):  # téléphone qui déborde + bulles
  cs="".join(f'<div style="position:absolute;{pos};background:#fff;border-radius:20px;padding:12px 14px;box-shadow:0 14px 34px rgba(28,27,46,.18);font-weight:800;font-size:15px;display:flex;gap:10px;align-items:center;transform:rotate({r}deg)"><span style="font-size:24px;font-family:Apple Color Emoji,Noto Color Emoji">{e}</span><span>{t}<small style="display:block;font-weight:600;font-size:12px;color:#625F7E">{s}</small></span></div>' for pos,r,e,t,s in cards)
  return f'''<body style="background:linear-gradient(180deg,#FFF3D6,#FFE1E8)">
<div style="position:absolute;left:30px;right:30px;top:64px"><h1 style="font-size:40px">{title}</h1></div>
<div class="phone" style="left:70px;right:70px;top:250px;height:820px"><div class="scr"><img class="s" src="file://{D}/raw/{img}.png"></div></div>{cs}</body>'''
PAGES={
 '1':A('01-accueil','Ton foyer,<br>enfin serein.',-3,'left'),
 '2':A('02-foyer','Tout le foyer,<br>dans une seule appli.',3,'right'),
 '3':A('03-taches','Chacun son tour,<br>sans se disputer.',-3,'left'),
 '4':A('05-repas','Le menu de la semaine<br>remplit les courses.',3,'right'),
 '5':A('06-agenda','Les anniversaires<br>se préparent tout seuls.',-3,'left'),
 '6':A('09-cocoony','Un secrétaire à qui<br>on parle normalement.',3,'right'),
 '7':A('07-budget','Qui doit quoi,<br>sans calculatrice.',-3,'left'),
 'B':B('02-foyer','Ton foyer, <span class="hl">enfin serein</span>.','Tâches, courses, repas, agenda, budget et papiers, au même endroit.'),
 'C':C('02-foyer','Tout le foyer,<br>en un coup d\'œil.',[("left:14px;top:420px",-4,"✅","4 tâches","dont 1 aujourd'hui"),("right:12px;top:560px",3,"🛒","7 articles","rangés par rayon"),("left:22px;top:760px",2,"🎂","Anniv d'Emma","dans 9 jours")]),
}
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':440,'height':956},device_scale_factor=3)
    for k in sys.argv[1:] or [x for x in PAGES if x.isdigit()]:
      f=f'{D}/_p{k}.html'; open(f,'w').write('<!doctype html><html><head><meta charset="utf-8">'+CSS+'</head>'+PAGES[k]+'</html>')
      await pg.goto('file://'+f); await pg.wait_for_timeout(1200); await (pg.screenshot(path=OUTD+'/appstore-'+k+'.jpg',type='jpeg',quality=92) if k.isdigit() else pg.screenshot(path=D+'/style-'+k+'.png'))
    await b.close()
asyncio.run(m())
