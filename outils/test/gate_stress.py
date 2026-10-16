import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()
srv=subprocess.Popen([sys.executable,'-m','http.server','8771','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def one(b,i):
    ctx=await b.new_context(viewport={'width':400,'height':860})
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page(); logs=[]; pg.on('console',lambda m: logs.append(m.type+':'+m.text[:150])); pg.on('pageerror',lambda e:logs.append('ERR '+str(e)[:200]))
    await pg.add_init_script('window.__noTour=1')
    await pg.goto('http://localhost:8771/'); await pg.wait_for_timeout(800)
    tl=[]
    async def st(tag):
        s=await pg.evaluate("(()=>{const g=document.getElementById('cxGate'); if(!g) return 'nogate'; const h=g.querySelector('h1'); const e=g.querySelector('input[name=email]'); const m=g.querySelector('.cx-msg'); return (g.hidden?'H':'V')+'|'+(h?h.textContent:'')+'|'+(e?e.value:'-')+'|'+(m&&!m.hidden?m.textContent:'')+'|'+(g.querySelector('[data-act=create]')?'CREATE':'')})()")
        tl.append(tag+' '+s)
    await st('start')
    await pg.click('#cxGate [data-go="signup"]'); await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await st('filled'); await pg.click('#cxGate .cx-btn')
    ok=False
    for k in range(40):
        await st(str(k))
        if await pg.is_visible('#cxGate [data-act="create"]'): ok=True; break
        await pg.wait_for_timeout(250)
    if not ok:
        print('FAIL run',i); seen=None
        for t in tl:
            if t.split(' ',1)[1]!=seen: print('  ',t); seen=t.split(' ',1)[1]
        for l in logs[-15:]: print('  log',l)
    await ctx.close(); return ok
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); n=0
    for i in range(int(sys.argv[1]) if len(sys.argv)>1 else 20):
      if not await one(b,i): n+=1
    print('fails',n); await b.close()
try: asyncio.run(main())
finally: srv.kill()
