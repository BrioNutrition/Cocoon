import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8769','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
STUB="""
Object.defineProperty(window,'Notification',{value:{permission:'default',requestPermission:async()=>{ window.Notification.permission='granted'; return 'granted'; }},configurable:true});
(function(){ let sub=null; const fake={pushManager:{getSubscription:async()=>sub,subscribe:async(o)=>{ window.__subKey=o.applicationServerKey.length; sub={endpoint:'https://web.push.apple.com/XYZ',toJSON:()=>({endpoint:'https://web.push.apple.com/XYZ',keys:{p256dh:'BPk',auth:'au'}}),unsubscribe:async()=>{ sub=null; return true; }}; return sub; }}};
  window.PushManager=function(){}; Object.defineProperty(navigator,'serviceWorker',{value:{getRegistration:async()=>fake,register:async()=>fake,ready:Promise.resolve(fake),addEventListener(){},controller:null},configurable:true}); })();
"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':400,'height':860})
    await ctx.add_init_script(STUB)
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon",vapid:"BHK-FwWfQD0A4HJEo7IY4-PmER_oO3kGTGA799csoc5aRJOWnky_Ay4TAmRSfsgZHnsH0Z2Ftld7-Fcv4cntx4k"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('http://localhost:8769/'); await pg.wait_for_timeout(800)
    await pg.click('#cxGate [data-go="signup"]'); await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-btn')
    await pg.wait_for_timeout(500); await pg.click('#cxGate [data-act="create"]'); await pg.wait_for_selector('#cxGate', state='hidden'); await pg.wait_for_timeout(2500)
    await pg.click('#spGo'); await pg.fill('#wzNom','Nours'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("En couple")'); await pg.fill('#wzPart','Emma'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("Pas d")'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("Appartement")'); await pg.click('.opt:has-text("Locataire")'); await pg.click('#wzNext')
    await pg.click('#wzNext'); await pg.click('.opt:has-text("Aucun")'); await pg.click('#wzNext')
    while not await pg.is_visible('.opt:has-text("Suivre les colis")'): await pg.click('#wzNext')
    await pg.click('.opt:has-text("Suivre les colis")'); await pg.click('#wzNext')
    await pg.click('#wzNext'); await pg.wait_for_timeout(4200)
    await pg.fill('#fiNom','Angel'); await pg.fill('#fiNaissance','1990-05-04'); await pg.click('#fiSave'); await pg.wait_for_timeout(2600)
    await pg.add_style_tag(content='.toast{display:none!important}')
    print('demande avant l\'accueil (pendant le questionnaire) :', 'non vérifié ici')
    await pg.wait_for_selector('.cx-ask.on', timeout=15000); await pg.wait_for_timeout(500)
    print('demande affichée sur l\'accueil:', (await pg.inner_text('.cx-ask'))[:160].replace('\n',' | '))
    await pg.screenshot(path='../ask1.png')
    await pg.click('.cx-ask-ok'); await pg.wait_for_timeout(1500)
    print('après « Activer » : fenêtre fermée:', await pg.locator('.cx-ask').count()==0, '| abonnement:', await pg.evaluate("(__mock.T.cocoon_push_subs||[]).length"), '| mémo:', await pg.evaluate("localStorage.getItem('cocoon.pushAsk')"))
    await pg.click('.tab[data-tab="moi"]'); await pg.wait_for_timeout(500)
    print('carte Moi:', (await pg.inner_text('#cxNotif'))[:60].replace('\n',' | '))
    await pg.reload(); await pg.wait_for_timeout(9000)
    print('après relance, redemande ?', await pg.locator('.cx-ask').count())
    print('errors',errs)
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
