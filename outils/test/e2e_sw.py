import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist_sw'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8766','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':400,'height':860})
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.type+':'+m.text[:150])); pg.on('requestfailed',lambda r: errs.append('FAIL '+r.url[:90]))
    await pg.add_init_script('window.__noTour=1')
    await pg.goto('http://localhost:8766/'); await pg.wait_for_timeout(1500)
    await pg.click('#cxGate [data-go="signup"]'); await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-btn')
    await pg.wait_for_timeout(500); await pg.click('#cxGate [data-act="create"]'); await pg.wait_for_selector('#cxGate', state='hidden'); await pg.wait_for_timeout(2500)
    print('sw:', await pg.evaluate("navigator.serviceWorker.controller?'contrôlée':'non'"))
    await pg.evaluate("localStorage.setItem('foyer.tab','courses')")
    for k in range(3):
      t0=time.time(); await pg.reload()
      try:
        await pg.wait_for_function("document.querySelector('#cxIntro')===null && !document.getElementById('boot')", timeout=15000); print('rechargement',k,await pg.evaluate("document.querySelector('.view:not([hidden])').dataset.view"),'OK en',round(time.time()-t0,2),'s | sw:', await pg.evaluate("navigator.serviceWorker.controller?'contrôlée':'non'"))
      except Exception as e:
        print('rechargement',k,'BLOQUÉ'); await pg.screenshot(path='../stuck.png'); break
    print('\n'.join(errs[-25:])); print('gate:', await pg.evaluate("(()=>{const g=document.getElementById('cxGate'); return g?(!g.hidden)+' '+g.innerText.slice(0,80):'none'})()")); print('outbox', await pg.evaluate("localStorage.getItem('cocoon.outbox')"))
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
