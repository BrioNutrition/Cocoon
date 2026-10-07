import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8767','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':400,'height':860})
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('http://localhost:8767/'); await pg.wait_for_timeout(1500)
    await pg.fill('#cxGate input[name=pw]','secret123')
    print('type:', await pg.get_attribute('#cxGate input[name=pw]','type'))
    await pg.click('#cxGate .cx-eye'); print('après œil:', await pg.get_attribute('#cxGate input[name=pw]','type'), await pg.get_attribute('#cxGate .cx-eye','aria-label'))
    await pg.screenshot(path='../eye1.png',clip={'x':0,'y':300,'width':400,'height':260})
    await pg.click('#cxGate .cx-eye'); print('re-clic:', await pg.get_attribute('#cxGate input[name=pw]','type'))
    await pg.click('#cxGate [data-go="signup"]'); print('œil sur création de compte:', await pg.locator('#cxGate .cx-eye').count())
    await pg.fill('#cxGate input[name=email]','a@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-eye'); await pg.click('#cxGate .cx-btn'); await pg.wait_for_timeout(600)
    print('compte créé, écran suivant:', await pg.evaluate("(document.querySelector('#cxGate h1')||{}).textContent"))
    print('errors',errs)
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
