import asyncio, sys, os
from playwright.async_api import async_playwright
SRC, OUT, SCHEME = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
FREEZE='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} .toast{display:none!important} .aurora{display:none!important}'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':390,'height':844},color_scheme=SCHEME,device_scale_factor=1,reduced_motion='reduce')
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.add_init_script('window.__noTour=1'); await pg.clock.install(time=1791670000000)
    await pg.set_content('<!doctype html><html><head><meta charset=utf8><style>[hidden]{display:none!important}</style></head><body style="margin:0">'+open(SRC).read()+'</body></html>')
    await pg.clock.run_for(6000)
    async def shot(n,full=True):
      await pg.add_style_tag(content=FREEZE); await pg.clock.run_for(300); await pg.screenshot(path=f'{OUT}/{n}.png',full_page=full)
    await shot('00_splash')
    await pg.click('#spGo'); await pg.clock.run_for(400); await shot('01_wz_nom')
    await pg.fill('#wzNom','Nours'); await pg.click('#wzNext'); await pg.clock.run_for(300)
    await pg.click('#wqAdP'); await pg.fill('#wzPart','Emma'); await shot('02_wz_menage'); await pg.click('#wzNext'); await pg.clock.run_for(300)
    await pg.click('#wqPetAdd'); await pg.fill('#wqPet0','Moka'); await pg.clock.run_for(500); await shot('03_wz_animaux'); await pg.click('#wzNext'); await pg.clock.run_for(300)
    await pg.click('.opt:has-text("Appartement")'); await pg.click('.opt:has-text("Locataire")'); await pg.click('#wzNext'); await pg.clock.run_for(300)
    await pg.click('#wzNext'); await pg.clock.run_for(300); await pg.click('.opt:has-text("Aucun")'); await pg.click('#wzNext'); await pg.clock.run_for(300)
    await pg.click('.wz-abo-h:has-text("Électricité")'); await pg.fill('#wzAm-electricite','62,50'); await pg.fill('#wzJr-electricite','15'); await shot('04_wz_abos')
    k=0
    while not await pg.is_visible('.opt:has-text("rater un colis")'):
      if await pg.is_visible('.opt:has-text("Moitié-moitié")'): await pg.click('.opt:has-text("Moitié-moitié")')
      await pg.click('#wzNext'); await pg.clock.run_for(300); k+=1
      if k==2: await shot('05_wz_mid')
    await pg.click('.opt:has-text("rater un colis")'); await pg.click('#wzNext'); await pg.clock.run_for(400); await shot('06_wz_plan')
    await pg.click('#wzNext'); await pg.clock.run_for(5000)
    await shot('07_profil')
    await pg.fill('#fiNom','Angel'); await pg.fill('#fiNaissance','1990-01-01'); await pg.click('#fiSave'); await pg.clock.run_for(3000); await pg.wait_for_timeout(6000); await pg.clock.run_for(3000); await pg.wait_for_timeout(1500)
    if await pg.is_visible('.tour-card'): await shot('08_tour',False); await pg.click('.tour-card .btn.ghost'); await pg.clock.run_for(500)
    for n,a,d in [("Courses","120","2026-09-06"),("Courses Leclerc","84","2026-10-05"),("Resto","48","2026-10-08")]:
      await pg.click('.tab[data-tab="budget"]'); await pg.click('#bAddDep'); await pg.fill('#bfName',n); await pg.fill('#bfAmt',a); await pg.fill('#bfDate',d); await pg.click('#bForm button[type=submit]'); await pg.clock.run_for(400)
    for t in ["Sortir le linge","Arroser les plantes"]:
      await pg.click('#navAdd'); await pg.clock.run_for(300); await pg.fill('#quickTitle',t); await pg.click('#quickForm button[type=submit]'); await pg.clock.run_for(600)
    await pg.click('.tab[data-tab="accueil"]'); await pg.clock.run_for(500); await pg.evaluate('scrollTo(0,0)'); await shot('10_accueil')
    await pg.click('.tab[data-tab="foyer"]'); await pg.clock.run_for(500); await shot('11_foyer')
    for g in ["courses","repas","documents","maison"]:
      await pg.click(f'section:not([hidden]) .viewseg button[data-go="{g}"]'); await pg.clock.run_for(500); await shot('12_'+g)
    await pg.click('.tab[data-tab="budget"]'); await pg.clock.run_for(500); await pg.evaluate('scrollTo(0,0)'); await shot('13_budget')
    await pg.click('#bVolRec summary'); await pg.click('#bVolCat summary'); await pg.clock.run_for(300); await shot('14_budget_open')
    await pg.click('.b-who button:has-text("Moi")'); await pg.clock.run_for(300); await pg.evaluate('scrollTo(0,0)'); await shot('15_budget_moi',False)
    await pg.click('.tab[data-tab="moi"]'); await pg.clock.run_for(500); await shot('16_moi')
    await pg.click('#navAdd'); await pg.clock.run_for(400); await shot('17_sheet',False); await pg.keyboard.press('Escape'); await pg.clock.run_for(300)
    if await pg.is_visible('#sheet'): await pg.click('#sheetBg',force=True); await pg.clock.run_for(300)
    await pg.click('.tab[data-tab="accueil"]'); await pg.clock.run_for(300); await pg.evaluate('scrollTo(0,0)')
    if await pg.is_visible('#palBtn'): await pg.click('#palBtn'); await pg.clock.run_for(400); await shot('18_palette',False)
    print(OUT, len(os.listdir(OUT)), 'captures', errs)
    await b.close()
asyncio.run(main())
