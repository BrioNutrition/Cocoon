import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8769','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for cs in ['dark','light']:
      ctx=await b.new_context(viewport={'width':400,'height':860},color_scheme=cs)
      await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
      await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
      await ctx.route('**/fonts.g*/**',lambda r:r.abort())
      pg=await ctx.new_page(); await pg.goto('http://localhost:8769/'); await pg.wait_for_timeout(1200)
      await pg.add_init_script('window.__noTour=1')
      print(cs,'data-theme:',await pg.evaluate("document.documentElement.dataset.theme||'(auto)'"),'| fond connexion:',await pg.evaluate("getComputedStyle(document.getElementById('cxGate')).backgroundColor"),'| fond app:',await pg.evaluate("getComputedStyle(document.body).backgroundColor"))
      await ctx.close()
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
