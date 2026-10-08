import asyncio, subprocess, sys, os, time, statistics
from playwright.async_api import async_playwright
D=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else 'dist'); MOCK=open('test/mock-supabase.js').read(); PORT=8770+len(sys.argv[1]) if len(sys.argv)>1 else 8770
srv=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'-d',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
REC="""(function(){ window.__fr=[]; let last=0; function f(t){ if(last) window.__fr.push([t,t-last]); last=t; const bt=document.getElementById('boot'); if(bt) window.__seen=t; else if(window.__seen&&!window.__bootGone) window.__bootGone=t; const ci=document.getElementById('cxIntro'); if(ci) window.__ci=t; requestAnimationFrame(f); } requestAnimationFrame(f);
 window.__lt=[]; try{ new PerformanceObserver(l=>{ for(const e of l.getEntries()) window.__lt.push([Math.round(e.startTime),Math.round(e.duration)]); }).observe({type:'longtask',buffered:true}); }catch(_){}
 window.__mk=[]; const _ra=window.requestAnimationFrame;
 new MutationObserver(()=>{ const bt=document.getElementById('boot'); if(bt) window.__seen=1; if(!bt&&window.__seen&&!window.__bootGone) window.__bootGone=performance.now(); }).observe(document.documentElement,{childList:true,subtree:true}); })();"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844})
    await ctx.route('**/cdn.jsdelivr.net/**',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
    await ctx.route('**/config.js',lambda r:r.fulfill(body='window.COCOON_CONFIG={url:"https://mock.supabase.co",key:"anon"};',content_type='application/javascript'))
    await ctx.route('**/fonts.g*/**',lambda r:r.abort())
    pg=await ctx.new_page()
    await pg.goto(f'http://localhost:{PORT}/'); await pg.wait_for_timeout(800)
    await pg.click('#cxGate [data-go="signup"]'); await pg.fill('#cxGate input[name=email]','angel@test.fr'); await pg.fill('#cxGate input[name=pw]','secret123'); await pg.click('#cxGate .cx-btn')
    await pg.wait_for_timeout(500); await pg.click('#cxGate [data-act="create"]'); await pg.wait_for_selector('#cxGate', state='hidden'); await pg.wait_for_timeout(2500)
    await pg.click('#spGo'); await pg.fill('#wzNom','Nours'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("En couple")'); await pg.fill('#wzPart','Emma'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("Pas d")'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("Appartement")'); await pg.click('.opt:has-text("Locataire")'); await pg.click('#wzNext')
    await pg.click('.opt:has-text("Aucun")'); await pg.click('#wzNext'); await pg.click('.opt:has-text("Suivre les colis")'); await pg.click('#wzNext')
    await pg.click('#wzNext'); await pg.wait_for_timeout(4200)
    await pg.fill('#fiNom','Angel'); await pg.fill('#fiNaissance','1990-05-04'); await pg.click('#fiSave'); await pg.wait_for_timeout(3000)
    for t in ['Payer la cantine','Appeler le plombier','Arroser','Sortir le chien','Réserver le resto']:
      await pg.click('#navAdd'); await pg.fill('#quickTitle',t); await pg.click('#quickForm button[type=submit]'); await pg.wait_for_timeout(200)
    await pg.wait_for_timeout(1500)
    await pg.add_init_script(REC)
    cdp=await ctx.new_cdp_session(pg); await cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    res=[]
    for k in range(3):
      await pg.reload(); await pg.wait_for_timeout(5500)
      fr=await pg.evaluate("window.__fr"); bg=await pg.evaluate("window.__bootGone||0")
      # fenêtre : 1,6 s avant la disparition de l'écran de lancement (vol + arrivée) jusqu'à 1 s après
      w=[d for t,d in fr if bg-1600<=t<=bg+1000]
      lt=await pg.evaluate("window.__lt"); print('  intro jusqu\'à',round(await pg.evaluate('window.__ci||0')),'| boot vu jusqu\'à', round(await pg.evaluate('window.__seen||0')),'| écran parti à',round(bg),'ms | tâches longues (début, durée) relatives:', [(t-round(bg),d) for t,d in lt if bg-2500<=t<=bg+1500])
      res.append((len(w), sum(1 for d in w if d>34), max(w) if w else 0))
    print(sys.argv[1] if len(sys.argv)>1 else 'dist', '→ images:', [r[0] for r in res], '| saccades >34ms:', [r[1] for r in res], '| pire image (ms):', [round(r[2]) for r in res])
    await b.close()
try: asyncio.run(main())
finally: srv.kill()
