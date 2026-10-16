import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright
D=os.path.abspath('dist'); MOCK=open('test/mock-supabase.js').read()+"""
__mock.T.cocoon_foyers.push({id:'f1',owner:'o',code:'c0de'});
__mock.T.cocoon_docs.push({foyer:'f1',path:'foyer',id:'config',data:{nom:'Nours',qFait:true,categories:['maison','courses','factures']}});
__mock.T.cocoon_docs.push({foyer:'f1',path:'membres',id:'angel',data:{nom:'Angel',type:'adulte',role:'admin',c:'#3D7BD9',uid:'o',ordre:1}});
__mock.T.cocoon_docs.push({foyer:'f1',path:'membres',id:'emma',data:{nom:'Emma',type:'adulte',role:'membre',c:'#8A5CD6',invite:true,ordre:2}});
__mock.T.cocoon_docs.push({foyer:'f1',path:'taches',id:'t1',data:{titre:'Sortir les poubelles',cat:'maison',pour:'tous',creeLe:1}});
"""
srv=subprocess.Popen([sys.executable,'-m','http.server','8767','-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':400,'height':860})
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.add_init_script('window.__noTour=1')
    await pg.goto('http://localhost:8767/?rejoindre=f1.c0de'); await pg.wait_for_timeout(800)
    print('url nettoyée:',pg.url); await pg.screenshot(path='/tmp/dk/j1.png')
    await pg.fill('#cxGate input[name=email]','emma@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-btn')
    await pg.wait_for_timeout(2500); await pg.screenshot(path='/tmp/dk/j2.png')
    print('demande avant de rejoindre:', await pg.is_visible('#cxGate [data-act="join"]'), '| membres avant:', await pg.evaluate("__mock.T.cocoon_members.filter(m=>m.foyer==='f1').length"))
    await pg.click('#cxGate [data-act="own"]'); await pg.wait_for_timeout(1500); print('écran ensuite:', (await pg.inner_text('#cxGate'))[:80].replace('\n',' | ')); await pg.click('#cxGate [data-act="create"]'); await pg.wait_for_timeout(2000); await pg.screenshot(path='/tmp/dk/j4.png')
    print('membres:',await pg.evaluate("JSON.stringify(__mock.T.cocoon_members)"))
    print('errors',errs)
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
