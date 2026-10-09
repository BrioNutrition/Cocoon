import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8768','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':400,'height':860},color_scheme='dark')
    await ctx.add_init_script("try{localStorage.setItem('cocoon.theme','auto')}catch(e){}")
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.add_init_script('window.__noTour=1')
    await pg.goto('http://localhost:8768/'); await pg.wait_for_timeout(1500)
    await pg.fill('#cxGate input[name=pw]','x'); await pg.screenshot(path='../dk/50gate.png')
    print('theme-color', await pg.get_attribute('#cxTc','content'))
    await pg.evaluate("document.documentElement.dataset.theme='light'"); await pg.wait_for_timeout(50); print('theme-color light', await pg.get_attribute('#cxTc','content'))
    print('errors',errs); await b.close()
try: asyncio.run(main())
finally: srv.kill()
