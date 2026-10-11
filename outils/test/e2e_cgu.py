import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8772','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
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
    pass
    await pg.goto('http://localhost:8772/'); await pg.wait_for_timeout(800)
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
    await pg.fill('#fiNom','Angel'); await pg.fill('#fiNaissance','1990-05-04'); await pg.click('#fiSave'); await pg.wait_for_timeout(9000)
    print('écran conditions:', await pg.is_visible('.cgu-bg'), '| visite en même temps:', await pg.is_visible('.tour-card'))
    await pg.screenshot(path='../cgu_1.png')
    go=pg.locator('.cgu .btn.big'); print('bouton bloqué:', await go.is_disabled(), '| interrupteur notifs:', await pg.is_visible('.cgu-sw'))
    await pg.click('.cgu .ln:has-text("conditions")'); await pg.wait_for_timeout(300); print('conditions:', (await pg.inner_text('.priv h2'))); await pg.screenshot(path='../cgu_terms.png'); await pg.click('.priv-x')
    await pg.click('.cgu-ck'); print('bouton actif:', not await go.is_disabled()); await pg.screenshot(path='../cgu_2.png')
    await go.click(); await pg.wait_for_timeout(1500)
    print('fermé:', not await pg.is_visible('.cgu-bg'), '| visite lancée:', await pg.is_visible('.tour-card'))
    pr=await pg.evaluate("JSON.stringify((__mock.T.cocoon_docs.find(r=>r.path.startsWith('data/users/')&&r.id==='prefs')||{}).data||{})"); print('prefs:', pr[:160])
    print('abonnement notifs:', await pg.evaluate("(__mock.T.cocoon_push_subs||[]).length"))
    await pg.click('.tab[data-tab="foyer"]',force=True); await pg.wait_for_timeout(200)
    await pg.evaluate("localStorage.setItem('foyer.tab','documents')"); await pg.reload(); await pg.wait_for_timeout(6500)
    print('rechargé pendant la visite -> visite sur l accueil:', await pg.is_visible('.tour-card'), await pg.evaluate("document.querySelector('.view:not([hidden])').dataset.view"))
    print('boutons visite:', await pg.evaluate("[...document.querySelectorAll('.tour-card button')].map(b=>b.className+':'+b.textContent)")); await pg.evaluate("(document.querySelector('.tour-card .btn.ghost')||{click(){}}).click()"); await pg.wait_for_timeout(300)
    await pg.reload(); await pg.wait_for_timeout(5000); await pg.wait_for_timeout(4000); print('après rechargement, écran conditions:', await pg.is_visible('.cgu-bg'), '| ancienne question notifs:', await pg.is_visible('.cx-ask'))
    await pg.click('.tab[data-tab="moi"]'); await pg.wait_for_timeout(500); print('réglage:', (await pg.inner_text('.set-row:has-text("Conditions")')).replace('\n',' | '))
    print('errors',[e for e in errs if 'ERR_FAILED' not in e])
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
