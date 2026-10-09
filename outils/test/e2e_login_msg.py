import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read(); PORT=8793
srv=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844})
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page(); await pg.goto(f'http://localhost:{PORT}/'); await pg.wait_for_timeout(800)
    await pg.fill('#cxGate input[name=email]','inconnu@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-btn'); await pg.wait_for_timeout(400)
    print('inconnu :', await pg.inner_text('#cxGate .cx-msg'))
    await pg.click('#cxGate [data-go="signup"]'); await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-btn'); await pg.wait_for_timeout(600)
    await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(800)
    if await pg.is_visible('#cxGate [data-go="login"]'): await pg.click('#cxGate [data-go="login"]')
    await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','mauvais00'); await pg.click('#cxGate .cx-btn'); await pg.wait_for_timeout(400)
    print('mauvais mdp :', await pg.inner_text('#cxGate .cx-msg'))
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
