"use strict";
(function(){
  const SEL=['.gnum','.hero .after b','.hc svg','.semtop .g','.semnote b','.gp .v','.gp .s','.tile .L','.tile .p','.tile .pj','.tile .mr','.gletter','.gpct','.ghint','.cpct','.rpct','.grid input[data-f=e]','.grid input[data-f=w]','td.r','.projres','.cr .gg','.cr .m','.chip','.need','.fillbox b','.cmpv','.trendc svg'].join(',');
  const st=document.createElement('style'); st.id='privCss';
  st.textContent=':is('+SEL+'){transition:filter .32s cubic-bezier(.2,.7,.2,1)}'
    +'html[data-priv] :is('+SEL+'){filter:blur(max(6px,.2em));user-select:none;-webkit-user-select:none}'
    +'html[data-priv] .hc svg{filter:blur(7px)}'
    +'html[data-priv] :is('+SEL+'):is(:hover,:focus,:focus-within,.rv){filter:blur(0);user-select:auto;-webkit-user-select:auto}';
  document.head.appendChild(st);
  const root=document.documentElement, btn=document.getElementById('privBtn');
  function set(on,save){
    if(on) root.setAttribute('data-priv',''); else root.removeAttribute('data-priv');
    btn.setAttribute('aria-pressed',on?'true':'false'); const l=on?'Show grades':'Hide grades'; btn.setAttribute('aria-label',l); btn.title=l;
    if(save){ try{ localStorage.setItem('gt-priv',on?'1':'0'); }catch(e){} }
  }
  let init=false; try{ init=localStorage.getItem('gt-priv')==='1'; }catch(e){}
  set(init,false);
  btn.addEventListener('click',function(){ set(!root.hasAttribute('data-priv'),true); });
  document.addEventListener('click',function(ev){
    if(!root.hasAttribute('data-priv')||!matchMedia('(hover:none)').matches) return;
    const t=ev.target.closest&&ev.target.closest(SEL); if(!t) return;
    t.classList.add('rv'); clearTimeout(t._rt); t._rt=setTimeout(function(){ t.classList.remove('rv'); },3200);
  },true);
})();
(function init(){
  let src3=readLocal(KEY3), migrated=false;
  if(src3&&Array.isArray(src3.sems)) W=loadAny(src3);
  else{
    let emb=null; try{ emb=JSON.parse(document.getElementById('saved').textContent); }catch(e){}
    const loc=readLocal(KEY), et=(emb&&emb.ts)||0, lt=(loc&&loc.ts)||0;
    let src=(lt>et)?loc:emb;
    if(!src){ const o=readLocal(KEY1); if(o&&o.courses) src=o; }
    W=loadAny(src||null); migrated=!!src;
  }
  S=W.sems.find(x=>x.id===W.active)||W.sems[0]; W.active=S.id;
  refreshPrior(); syncColors();
  if(migrated) save();
  const h=(location.hash||'').replace('#','');
  if(h&&(h==='cal'||getC(h))) view=h;
  render();
  if(syncCfg()) syncNow();
  try{ if(cvCfg()) setTimeout(function(){ canvasRefresh(false); },1500); }catch(e){}
  try{ if(localStorage.getItem(TOUR_KEY)!=='1'&&location.hash!=='#canvas') setTimeout(function(){ if(!tourEl) tourOpen(); },600); }catch(e){}
  try{ if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')) navigator.serviceWorker.register('sw.js'); }catch(e){}
  try{
    const sc=JSON.parse(sessionStorage.getItem('gt-scroll')||'null');
    if(sc&&Date.now()-sc.t<20000) window.scrollTo(0,sc.y);
    sessionStorage.removeItem('gt-scroll');
  }catch(e){}
  
})();
