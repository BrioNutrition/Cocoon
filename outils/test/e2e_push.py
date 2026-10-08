import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8768','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
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
    await pg.goto('http://localhost:8768/'); await pg.wait_for_timeout(800)
    await pg.click('#cxGate [data-go="signup"]'); await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-btn')
    await pg.wait_for_timeout(500); await pg.click('#cxGate [data-act="create"]'); await pg.wait_for_selector('#cxGate', state='hidden'); await pg.wait_for_timeout(2500)
    await pg.click('#spGo'); await pg.fill('#wzNom','Nours'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("En couple")'); await pg.fill('#wzPart','Emma'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("Pas d")'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("Appartement")'); await pg.click('.opt:has-text("Locataire")'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("Aucun")'); await pg.click('#wzNext'); await pg.click('.opt:has-text("Suivre les colis")'); await pg.click('#wzNext')
    await pg.click('#wzNext'); await pg.wait_for_timeout(4200)
    await pg.fill('#fiNom','Angel'); await pg.fill('#fiNaissance','1990-05-04'); await pg.click('#fiSave'); await pg.wait_for_timeout(2600)
    await pg.add_style_tag(content='.toast{display:none!important}')
    await pg.click('.tab[data-tab="moi"]'); await pg.wait_for_timeout(500)
    print('carte:', (await pg.inner_text('#cxNotif'))[:140].replace('\n',' | '))
    await pg.locator('#cxNotif').scroll_into_view_if_needed(); await pg.screenshot(path='../pn0.png')
    await pg.click('#cxNotif [data-a="on"]'); await pg.wait_for_timeout(800)
    print('après activation:', (await pg.inner_text('#cxNotif')).replace('\n',' | ')[:400])
    print('abonnement en base:', await pg.evaluate("JSON.stringify(__mock.T.cocoon_push_subs)"), '| clé:', await pg.evaluate("window.__subKey"))
    print('appels fonction:', await pg.evaluate("JSON.stringify((__mock.invites||[]).filter(x=>x[0]==='cocoon-push'))"))
    await pg.locator('#cxNotif').scroll_into_view_if_needed(); await pg.screenshot(path='../pn1.png')
    await pg.locator('#cxNotif input[data-k="courses"]').evaluate("e=>e.click()"); await pg.wait_for_timeout(300)
    await pg.select_option('#cxNotif select[data-k="heure"]','07:30'); await pg.wait_for_timeout(300)
    print('réglages:', await pg.evaluate("JSON.stringify(__mock.T.cocoon_push_prefs)"))
    await pg.click('#cxNotif [data-a="demo"]'); await pg.wait_for_timeout(500)
    print('démo:', await pg.evaluate("JSON.stringify((__mock.invites||[]).filter(x=>x[1]&&x[1].type==='demo'))"), '|', [l for l in (await pg.inner_text('#cxNotif')).split('\n') if 'Envoy' in l])
    # événements
    await pg.click('.tab[data-tab="foyer"]'); await pg.click('.viewseg button[data-go="courses"] >> visible=true'); await pg.fill('#cNom','lait'); await pg.press('#cNom','Enter'); await pg.wait_for_timeout(400)
    await pg.click('.cl-go'); await pg.wait_for_timeout(500)
    print('événement courses:', await pg.evaluate("JSON.stringify((__mock.invites||[]).filter(x=>x[1]&&x[1].type==='courses'))"))
    await pg.click('.tab[data-tab="moi"]'); await pg.wait_for_timeout(300)
    await pg.click('#cxNotif [data-a="off"]'); await pg.wait_for_timeout(500)
    print('désactivé, base:', await pg.evaluate("JSON.stringify(__mock.T.cocoon_push_subs)"), '|', (await pg.inner_text('#cxNotif')).replace('\n',' | ')[:120])
    print('errors',errs)
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
