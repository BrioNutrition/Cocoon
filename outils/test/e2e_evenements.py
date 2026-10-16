import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8765','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':400,'height':860})
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append('console:'+m.text))
    await pg.add_init_script('window.__noTour=1')
    await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(800)
    await pg.screenshot(path='../w1.png')
    await pg.click('#cxGate [data-go="signup"]'); await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-btn')
    await pg.wait_for_timeout(500); await pg.screenshot(path='../w2.png')
    for _k in range(80):  # GATE_RETRY
      if await pg.is_visible('#cxGate [data-act="create"]'): break
      if _k in (12,32,52) and await pg.is_visible('#cxGate .cx-btn'):
        if await pg.is_visible('#cxGate input[name=email]') and not (await pg.input_value('#cxGate input[name=email]')): await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123')
        await pg.click('#cxGate .cx-btn')
      await pg.wait_for_timeout(250)
    if not await pg.is_visible('#cxGate [data-act="create"]'): print('GATEFAIL', (await pg.inner_text('#cxGate'))[:250].replace('\n',' | '), await pg.evaluate('document.title'))
    t0=time.time(); await pg.click('#cxGate [data-act="create"]'); await pg.wait_for_selector('#cxGate', state='hidden'); print('foyer créé en', round(time.time()-t0,2),'s'); await pg.wait_for_timeout(2500)
    await pg.screenshot(path='../w3.png')
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
    await pg.click('.tab[data-tab="accueil"]'); await pg.wait_for_timeout(1500)
    await pg.click('.tab[data-tab="hub"]'); await pg.wait_for_timeout(500)
    await pg.click('.hb-t[data-go="agenda"]'); await pg.wait_for_timeout(900); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    await pg.click('.hub-add[data-add="agenda"]'); await pg.wait_for_timeout(400)
    await pg.click('.ev-opt.hot'); await pg.click('.ev-type:has-text("Anniversaire")'); await pg.fill('#evNom','Anniv de Patoune'); await pg.fill('#evDeb','2030-05-10')
    await pg.click('#evCreate'); await pg.wait_for_selector('.ev-frise', timeout=8000); await pg.wait_for_timeout(1500)
    for _ in range(25):
      n=await pg.evaluate("document.querySelectorAll('.ev-frise .ev-it').length")
      if n==9: break
      await pg.wait_for_timeout(200)
    print('frise items', n); assert n==9, n
    await pg.click('.ev-seg button:has-text("Budget")'); await pg.click('.ev-add'); await pg.fill('#evDepT','Gâteau'); await pg.fill('.ev-form input[inputmode=decimal]','35'); await pg.click('.ev-form button[type=submit]'); await pg.wait_for_timeout(1200)
    t=await pg.inner_text('.ev-bud'); print('bud', t.replace('\n',' | ')); assert '35' in t
    await pg.click('.pp-grab'); await pg.wait_for_timeout(700); c=await pg.locator('.ag-ev').count(); print('agenda events',c); assert c==1
    await pg.screenshot(path='../ev/h_list.png')
    print('OK EVENEMENTS')
    print('errors',errs)
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
