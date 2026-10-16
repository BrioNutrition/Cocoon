import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8779','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':400,'height':860},has_touch=True)
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.add_init_script('window.__noTour=1')
    await pg.goto('http://localhost:8779/'); await pg.wait_for_timeout(800)
    # oeil
    await pg.fill('#cxGate input[name=pw]','secret123')
    eye=pg.locator('#cxGate .cx-eye'); await eye.tap(); await pg.wait_for_timeout(150); t1=await pg.get_attribute('#cxGate input[name=pw]','type')
    await eye.tap(); await pg.wait_for_timeout(150); t2=await pg.get_attribute('#cxGate input[name=pw]','type')
    await pg.wait_for_timeout(700); await eye.click(); await pg.wait_for_timeout(150); t3=await pg.get_attribute('#cxGate input[name=pw]','type')
    print('oeil tap/tap/clic:',t1,t2,t3)
    await pg.click('#cxGate [data-go="signup"]'); await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-btn')
    for _ in range(40):
      if await pg.is_visible('#cxGate [data-act="out"]'): break
      await pg.wait_for_timeout(250)
    print('écran après inscription:', (await pg.inner_text('#cxGate'))[:100].replace('\n',' | ') if await pg.is_visible('#cxGate') else 'app')
    await pg.click('#cxGate [data-act="out"]'); await pg.wait_for_timeout(1200)
    await pg.click('#cxGate [data-go="forgot"]'); await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.click('#cxGate .cx-btn'); await pg.wait_for_timeout(600)
    print('écran code:', (await pg.inner_text('#cxGate'))[:120].replace('\n',' | ')); await pg.screenshot(path='../pw_code.png')
    await pg.fill('#cxGate input[name=code]','000000'); await pg.click('#cxGate .cx-btn'); await pg.wait_for_timeout(400); print('mauvais code:', await pg.inner_text('#cxGate .cx-msg'))
    await pg.fill('#cxGate input[name=code]','123 456'); await pg.click('#cxGate .cx-btn'); await pg.wait_for_timeout(600)
    print('écran ensuite:', (await pg.inner_text('#cxGate'))[:60].replace('\n',' | '), '| msg', await pg.inner_text('#cxGate .cx-msg') if await pg.locator('#cxGate .cx-msg').count() else '-', '| val', await pg.evaluate("(document.querySelector('#cxGate input[name=code]')||{}).value"))
    await pg.fill('#cxGate input[name=pw]','nouveau123'); await pg.click('#cxGate .cx-btn'); await pg.wait_for_timeout(300)
    print('confirmation:', (await pg.inner_text('#cxGate'))[:80].replace('\n',' | ')); await pg.screenshot(path='../pw_ok.png')
    await pg.wait_for_timeout(2500); print('après:', await pg.is_visible('#cxGate'), (await pg.inner_text('#cxGate'))[:40] if await pg.is_visible('#cxGate') else '')
    print('errors',errs); await b.close()
try: asyncio.run(main())
finally: srv.kill()
