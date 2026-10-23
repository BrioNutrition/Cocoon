/* Habillage « app iPhone » pour les captures (comme dans l'app Capacitor) : barre d'onglets native en verre Liquid Glass qui flotte en bas,
   barre du haut avec boutons ronds en verre (retour, +) et titre, barre d'accueil iOS. window.__ios(onglet) : 0 Accueil, 1 Foyer, 2 Cocoony, 3 Moi. */
(function(){
  const css=document.createElement("style"); css.textContent=`
  /* verre Liquid Glass d'iOS 26 : matière claire et translucide, reflet net en haut, bord qui réfracte la lumière (épaisseur),
     légère ombre de contact ; le contenu derrière est flouté et saturé */
  .ios-glass{position:relative;isolation:isolate;
    background:linear-gradient(180deg,rgba(255,255,255,.62) 0%,rgba(255,255,255,.34) 48%,rgba(255,255,255,.5) 100%);
    -webkit-backdrop-filter:blur(14px) saturate(2.1) brightness(1.06);backdrop-filter:blur(14px) saturate(2.1) brightness(1.06);
    box-shadow:inset 0 1.5px 1px rgba(255,255,255,.98),inset 0 -1.5px 1.5px rgba(255,255,255,.7),inset 1px 0 1px rgba(255,255,255,.45),inset -1px 0 1px rgba(255,255,255,.45),
      inset 0 -6px 10px -6px rgba(28,27,46,.10),0 0 0 .6px rgba(28,27,46,.07),0 6px 18px rgba(28,27,46,.13),0 1px 3px rgba(28,27,46,.08)}
  .ios-glass::before{content:"";position:absolute;inset:1.5px;border-radius:inherit;z-index:-1;pointer-events:none;
    background:radial-gradient(120% 70% at 30% 0%,rgba(255,255,255,.75),rgba(255,255,255,0) 60%),radial-gradient(90% 60% at 70% 110%,rgba(255,255,255,.35),rgba(255,255,255,0) 70%)}
  #iosTab{position:fixed;left:14px;right:14px;bottom:22px;height:66px;border-radius:40px;z-index:9999;display:flex;align-items:center;justify-content:space-around;padding:0 6px;
    font:600 10.5px/1 -apple-system,"SF Pro Text","Bricolage Grotesque",sans-serif;color:#3C3B47}
  #iosTab .it{position:relative;flex:1;height:56px;margin:0 2px;border-radius:30px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
  #iosTab .it.on{background:rgba(28,27,46,.07);color:#C98B00}
  #iosTab svg{width:26px;height:26px}
  #iosTab img{width:27px;height:27px;border-radius:8px}
  #iosHome{position:fixed;left:50%;bottom:8px;width:140px;height:5px;margin-left:-70px;border-radius:9px;background:#1C1B2E;z-index:10000}
  #iosTop{position:fixed;left:0;right:0;z-index:9998;display:flex;align-items:center;justify-content:space-between;padding:0 16px;pointer-events:none}
  #iosTop .b{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#1C1B2E}
  #iosTop .b svg{width:20px;height:20px;position:relative}
  /* « + » : verre teinté jaune (prominentGlass), même reflet et même bord lumineux */
  #iosTop .b.pro{background:linear-gradient(180deg,rgba(255,214,110,.96) 0%,rgba(255,196,60,.88) 55%,rgba(255,206,90,.95) 100%);
    box-shadow:inset 0 1.5px 1px rgba(255,255,255,.95),inset 0 -1.5px 1.5px rgba(255,240,200,.85),inset 1px 0 1px rgba(255,255,255,.5),inset -1px 0 1px rgba(255,255,255,.5),
      inset 0 -6px 10px -6px rgba(150,90,0,.25),0 0 0 .6px rgba(150,90,0,.12),0 6px 18px rgba(232,160,0,.32),0 1px 3px rgba(28,27,46,.08)}
  #iosTop .acts{display:flex;gap:10px}
  #iosTop b{position:absolute;left:50%;transform:translateX(-50%);font:700 21px/1 -apple-system,"SF Pro Display","Bricolage Grotesque",sans-serif;color:#1C1B2E;white-space:nowrap}
  #iosTop .sp{width:44px}`;
  document.head.append(css);
  const I={
    house:'<svg viewBox="0 0 24 24"><path d="M12 3.2 2.8 11a1 1 0 0 0 1.3 1.5l.9-.8V20a1.4 1.4 0 0 0 1.4 1.4H10v-5.2a2 2 0 0 1 4 0v5.2h3.6A1.4 1.4 0 0 0 19 20v-8.3l.9.8A1 1 0 0 0 21.2 11Z" fill="currentColor"/></svg>',
    people:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.6" fill="currentColor"/><circle cx="17.2" cy="9" r="2.8" fill="currentColor"/><path d="M2.5 19.2c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6c0 .8-.5 1.3-1.3 1.3H3.8c-.8 0-1.3-.5-1.3-1.3Z" fill="currentColor"/><path d="M16.3 20.5h4.1c.7 0 1.1-.4 1.1-1.1 0-2.6-2-4.4-4.6-4.4-.9 0-1.7.2-2.4.6 1.2 1.1 1.9 2.6 1.9 4.4 0 .2 0 .3-.1.5Z" fill="currentColor"/></svg>',
    person:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.6" r="3.4" fill="currentColor"/><path d="M5.9 18.3c1.3-2 3.5-3.2 6.1-3.2s4.8 1.2 6.1 3.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    back:'<svg viewBox="0 0 24 24"><path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus:'<svg viewBox="0 0 24 24"><path d="M12 4.5v15M4.5 12h15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    cal:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'};
  window.__ios=function(on){
    document.documentElement.classList.add("native-tabs");
    document.querySelectorAll("#iosTab,#iosHome,#iosTop").forEach(e=>e.remove());
    const lg=(document.querySelector(".brand-logo")||{}).src||"";
    const items=[["Accueil",I.house],["Foyer",I.people],["Cocoony",'<img src="'+lg+'" alt="">'],["Moi",I.person]];
    const t=document.createElement("div"); t.id="iosTab"; t.className="ios-glass";
    t.innerHTML=items.map(([n,ic],i)=>'<div class="it'+(i===on?" on":"")+'">'+ic+'<span>'+n+'</span></div>').join(""); document.body.append(t);
    const h=document.createElement("div"); h.id="iosHome"; document.body.append(h);
    /* barre du haut d'une rubrique : la barre web (cachée en mode natif) donne la position, le titre et s'il y a un « + » */
    const bar=document.querySelector(".view:not([hidden]) .hub-bar");
    /* comme l'app (sync → NT.topbar) : position = offsetTop de la barre web (sans les animations d'arrivée), retour en verre,
       « sync » = calendrier en verre, « + » = verre jaune (prominentGlass), titre en 21 pt gras */
    if(bar){ let y=0; for(let n=bar;n;n=n.offsetParent) y+=n.offsetTop; y-=scrollY;
      const tt=(bar.querySelector(".hb-title")||{}).textContent||"", back=!!bar.querySelector(".hub-back,.pg-back");
      const acts=(bar.querySelector(".hub-sync")?'<span class="b ios-glass">'+I.cal+'</span>':"")+(bar.querySelector(".hub-add")?'<span class="b ios-glass pro">'+I.plus+'</span>':"");
      const top=document.createElement("div"); top.id="iosTop"; top.style.top=Math.round(y+Math.max(0,(bar.offsetHeight-44)/2))+"px"; top.style.height="44px";
      top.innerHTML=(back?'<span class="b ios-glass">'+I.back+'</span>':'<span class="sp"></span>')+'<b>'+tt+'</b><span class="acts">'+(acts||'<span class="sp"></span>')+'</span>'; document.body.append(top); }
  };
})();
