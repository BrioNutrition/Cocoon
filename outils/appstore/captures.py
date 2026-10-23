"""Captures de l'app pour l'App Store et le site : bash outils/construire.sh demo, puis python3 outils/appstore/captures.py
(→ outils/appstore/raw/*.png, 1320×2868), puis python3 outils/appstore/affiches.py (→ app/appstore/appstore-N.png)."""
import asyncio, os, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=HERE+'/raw'; os.makedirs(OUT,exist_ok=True)
DEMO='file://'+HERE+'/demo-cap.html'
# copie de la démo avec S exposé (window.__S) pour remplir le foyer d'exemple
_s=open('/tmp/demo-foyer.html',encoding='utf-8').read(); open(HERE+'/demo-cap.html','w',encoding='utf-8').write(_s.replace("(function demoBoot(){","window.__S=S;(function demoBoot(){",1))
ONB=open(HERE+'/../../app/preview/auto.js').read()
ONB=ONB[:ONB.index('  const tab = (t)')]+'  window.__onbDone=1;\n})();'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':440,'height':956},device_scale_factor=3)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(DEMO); await pg.add_script_tag(content=ONB)
    for _ in range(80):
      if await pg.evaluate('!!window.__onbDone'): break
      await pg.wait_for_timeout(500)
    print('onboarding', await pg.evaluate('!!window.__onbDone'), await pg.evaluate('typeof __S'), await pg.evaluate('Object.keys(__S.db||{}).slice(0,8)'))
    await pg.wait_for_timeout(3000)
    await pg.add_script_tag(path=HERE+'/seed.js'); await pg.wait_for_timeout(2500)
    print('seed', await pg.evaluate('window.__seeded||window.__seedErr'))
    await pg.add_style_tag(content='.demo-bar{display:none!important}')
    await pg.evaluate("document.documentElement.dataset.theme='light'")
    await pg.add_script_tag(path=HERE+'/ios.js')   # habillage iPhone : barre d'onglets Liquid Glass, boutons ronds en verre
    tab=lambda t: pg.evaluate("document.querySelector('#tabs .tab[data-tab=%s]').click()"%t)
    async def shot(n,w=1500,on=1): await pg.wait_for_timeout(w); await pg.evaluate('window.scrollTo(0,0)'); await pg.wait_for_timeout(300); await pg.evaluate('__ios(%d)'%on); await pg.wait_for_timeout(200); await pg.screenshot(path=OUT+'/'+n+'.png')
    await tab('accueil'); await shot('01-accueil',2500,0)
    await tab('hub'); await shot('02-foyer',2500)
    for go,n in [('foyer','03-taches'),('courses','04-courses'),('repas','05-repas'),('agenda','06-agenda'),('budget','07-budget'),('documents','08-papiers')]:
      await tab('hub'); await pg.wait_for_timeout(600); await pg.evaluate("document.querySelector('.hb-t[data-go=%s]').click()"%go); await shot(n,1800)
    await tab('cocoony'); await shot('09-cocoony',2500,2)
    await tab('hub'); await pg.wait_for_timeout(600); await pg.evaluate("document.querySelector('.hb-pban').click()"); await shot('10-plus',1500)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
    print(errs[:3])
    await b.close()
asyncio.run(main())
