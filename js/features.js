"use strict";
/* ---------- trends ---------- */
function trendPoints(c){
  const gr=[]; c.cats.forEach((k,a)=>k.items.forEach((it,b)=>{ if(it.e!=null&&it.p>0&&!it.opt) gr.push({it:it,a:a,b:b,d:it.d||''}); }));
  gr.sort((x,y)=>(x.d&&y.d)?(x.d<y.d?-1:x.d>y.d?1:0):(x.d?-1:y.d?1:(x.a-y.a||x.b-y.b)));
  const pts=[], inc=new Set();
  gr.forEach(g=>{
    inc.add(g.it);
    const c2=Object.assign({},c,{cats:c.cats.map(k=>Object.assign({},k,{items:k.items.map(it=>inc.has(it)?it:Object.assign({},it,{e:null,w:null}))}))});
    const r=courseRes(c2,'cur'); if(r.pct!=null) pts.push({v:r.pct,n:g.it.n||'Item',d:g.d});
  });
  return pts;
}
function smoothPath(P){
  const n=P.length; if(n<2) return '';
  if(n===2) return 'M'+P[0][0].toFixed(1)+' '+P[0][1].toFixed(1)+' L'+P[1][0].toFixed(1)+' '+P[1][1].toFixed(1);
  const dx=[],m=[],t=new Array(n);
  for(let i=0;i<n-1;i++){ dx.push(P[i+1][0]-P[i][0]); m.push((P[i+1][1]-P[i][1])/(dx[i]||1)); }
  t[0]=m[0]; t[n-1]=m[n-2];
  for(let i=1;i<n-1;i++){ t[i]=(m[i-1]*m[i]<=0)?0:(m[i-1]+m[i])/2; }
  for(let i=0;i<n-1;i++){ if(m[i]===0){ t[i]=0; t[i+1]=0; continue; } const a=t[i]/m[i], b=t[i+1]/m[i], h=Math.hypot(a,b); if(h>3){ const k=3/h; t[i]=k*a*m[i]; t[i+1]=k*b*m[i]; } }
  let d='M'+P[0][0].toFixed(1)+' '+P[0][1].toFixed(1);
  for(let i=0;i<n-1;i++){ const h=dx[i]/3; d+=' C'+(P[i][0]+h).toFixed(1)+' '+(P[i][1]+t[i]*h).toFixed(1)+' '+(P[i+1][0]-h).toFixed(1)+' '+(P[i+1][1]-t[i+1]*h).toFixed(1)+' '+P[i+1][0].toFixed(1)+' '+P[i+1][1].toFixed(1); }
  return d;
}
function trendSvg(pts){
  const W=640,H=210,pl=44,pr=16,pt=22,pb=34;
  let lo=Math.min.apply(null,pts.map(p=>p.v)), hi=Math.max.apply(null,pts.map(p=>p.v));
  lo=Math.max(0,Math.floor(lo/5)*5-5); hi=Math.min(110,Math.ceil(hi/5)*5+5); if(hi-lo<10){ hi=lo+10; }
  const X=i=>pl+(pts.length>1?i*(W-pl-pr)/(pts.length-1):(W-pl-pr)/2), Y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb);
  let g=''; [lo,(lo+hi)/2,hi].forEach(v=>{ g+='<line class="ch-grid" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'"/><text x="'+(pl-8)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end">'+Math.round(v)+'%</text>'; });
  const xy=pts.map((p,i)=>[X(i),Y(p.v)]), line=smoothPath(xy);
  const base=(H-pb).toFixed(1);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Grade over time">'+g
    +'<path class="tr-area" d="'+line+' L'+X(pts.length-1).toFixed(1)+' '+base+' L'+X(0).toFixed(1)+' '+base+' Z"/><path class="tr-line" d="'+line+'"/>';
  const few=pts.length<=14;
  pts.forEach((p,i)=>{
    const x=X(i).toFixed(1), y=Y(p.v).toFixed(1), last=i===pts.length-1;
    s+='<circle class="tr-hit" cx="'+x+'" cy="'+y+'" r="'+(few?9:Math.max(4,(W-pl-pr)/pts.length/2))+'"><title>'+esc(p.n)+': '+f1(p.v)+'%</title></circle>';
    if(few||last) s+='<circle class="tr-dot'+(last?' end':'')+'" cx="'+x+'" cy="'+y+'" r="'+(last?4.5:3)+'"/>';
  });
  s+='<text class="tr-v" x="'+X(pts.length-1).toFixed(1)+'" y="'+(Y(pts[pts.length-1].v)-12).toFixed(1)+'" text-anchor="end">'+f1(pts[pts.length-1].v)+'%</text>';
  const lab=(i,anc)=>'<text x="'+X(i).toFixed(1)+'" y="'+(H-10)+'" text-anchor="'+anc+'">'+esc(String(pts[i].n).slice(0,14))+'</text>';
  s+=lab(0,'start')+(pts.length>1?lab(pts.length-1,'end'):'');
  return s+'</svg>';
}
function trendInner(c){
  const pts=trendPoints(c);
  if(pts.length<2) return '<p class="trnone">Enter a couple of scores and your grade over time shows up here.</p>';
  const first=pts[0].v, last=pts[pts.length-1].v, d=last-first;
  return '<div class="trhead"><span>Your grade as each score came in</span><b class="'+(d>=0?'up':'dn')+'">'+(d>=0?'▲ ':'▼ ')+f1(Math.abs(d))+' pts</b></div>'+trendSvg(pts);
}
function trendHtml(c){ return '<section class="card trendc"><h2 class="projh">Grade trend</h2><div id="trendBox">'+trendInner(c)+'</div></section>'; }
/* ---------- undo ---------- */
let undoT=null;
const undoStack=[], redoStack=[];
const isMac=/Mac|iPhone|iPad/i.test((navigator.platform||'')+(navigator.userAgent||''));
const UKEY=isMac?'⌘Z':'Ctrl+Z';
function undoToast(msg,label,fn,ms){
  let el=document.getElementById('undoBar'); if(el) el.remove();
  el=document.createElement('div'); el.id='undoBar'; el.className='undobar'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite');
  el.innerHTML='<span>'+esc(msg)+'</span><button type="button" data-u="1">'+esc(label)+'</button><i class="uprog" style="animation-duration:'+Math.round(ms/1000)+'s"></i>';
  document.body.appendChild(el); document.body.classList.add('hasundo'); requestAnimationFrame(function(){ el.classList.add('in'); });
  clearTimeout(undoT);
  const hide=function(){ el.classList.remove('in'); document.body.classList.remove('hasundo'); setTimeout(function(){ el.remove(); },300); };
  undoT=setTimeout(hide,ms);
  el.querySelector('button').addEventListener('click',function(){ clearTimeout(undoT); hide(); fn(); });
}
function restoreSnap(snap,v0){
  W=loadAny(JSON.parse(snap)); S=W.sems.find(x=>x.id===W.active)||W.sems[0]; W.active=S.id; editing=false;
  view=(v0==='home'||v0==='cal'||getC(v0))?v0:'home'; refreshPrior(); syncColors(); save(); setHash(); render(true);
}
function undoNow(){
  const e=undoStack.pop(); if(!e) return false;
  redoStack.push({msg:e.msg,snap:JSON.stringify(W),v0:view});
  restoreSnap(e.snap,e.v0);
  undoToast('Undid: '+e.msg,'Redo',redoNow,8000); return true;
}
function redoNow(){
  const e=redoStack.pop(); if(!e) return false;
  undoStack.push({msg:e.msg,snap:JSON.stringify(W),v0:view});
  restoreSnap(e.snap,e.v0);
  undoToast('Redone: '+e.msg,'Undo',undoNow,8000); return true;
}
/* big=true keeps the toast up much longer (imports and other large changes) */
function showUndo(msg,snap,v0,big){
  undoStack.push({msg:msg,snap:snap,v0:v0}); if(undoStack.length>12) undoStack.shift(); redoStack.length=0;
  undoToast(msg,'Undo ('+UKEY+')',undoNow,big?60000:12000);
}
document.addEventListener('keydown',function(ev){
  if(!(ev.metaKey||ev.ctrlKey)||ev.altKey) return;
  const k=ev.key.toLowerCase(); if(k!=='z'&&k!=='y') return;
  const t=ev.target; if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable)) return;
  if(document.querySelector('.modal,.wio,.tour,.tpop,.dpop')) return;
  const redo=(k==='y')||(k==='z'&&ev.shiftKey);
  if(redo?redoStack.length:undoStack.length){ ev.preventDefault(); redo?redoNow():undoNow(); }
});
const doDel=function(msg,fn,big){ const sn=JSON.stringify(W), v0=view; fn(); showUndo(msg,sn,v0,big); };
/* ---------- what-if popup ---------- */
function wiOpen(c,ki,ii){
  const list=[]; c.cats.forEach((k,a)=>k.items.forEach((it,b)=>list.push({a:a,b:b,k:k,it:it})));
  if(!list.length){ alert('Add an item to this class first.'); return; }
  let cur=list.find(x=>x.a===ki&&x.b===ii)||list.find(x=>x.it.e==null&&!x.it.opt)||list[0];
  const ov=document.createElement('div'); ov.className='wio'; ov.style.setProperty('--c',COLORS[c.id]); ov.style.setProperty('--fg',TILE[c.id]);
  ov.innerHTML='<div class="wic" role="dialog" aria-modal="true" aria-label="What-if"><div class="wih"><div><b>'+esc(c.name)+'</b><small>What-if final grade</small></div><button type="button" class="wix" data-w="x" aria-label="Close">×</button></div>'
    +'<div class="wig"><span class="wiL"></span><span class="wiP"></span><span class="wiD"></span></div>'
    +'<div class="wipick"><span class="wil">Section</span><div class="wipills" id="wiSec"></div><span class="wil">Assignment</span><div class="wipills" id="wiIt"></div></div>'
    +'<div class="wir"><span>Score</span><b class="wiV"></b></div><input type="range" class="wiR"><div class="witk"><span>0</span><span class="wimid"></span><span class="wimax"></span></div>'
    +'<div class="wiq"></div>'
    +'<div class="wia"><button type="button" class="wbtn ghost" data-w="clear">Clear what-if</button><button type="button" class="wbtn" data-w="keep">Keep it</button></div></div>';
  document.body.appendChild(ov); const rel=trapFocus(ov); requestAnimationFrame(function(){ ov.classList.add('open'); });
  const R=ov.querySelector('.wiR'), L=ov.querySelector('.wiL'), P=ov.querySelector('.wiP'), D=ov.querySelector('.wiD'), V=ov.querySelector('.wiV'), Q=ov.querySelector('.wiq');
  function pills(){
    const secs=c.cats.map((k,a)=>({a:a,k:k})).filter(x=>x.k.items.length);
    ov.querySelector('#wiSec').innerHTML=secs.map(x=>'<button type="button" class="wip'+(x.a===cur.a?' on':'')+'" data-w="sec" data-a="'+x.a+'">'+esc(x.k.name)+'</button>').join('');
    ov.querySelector('#wiIt').innerHTML=cur.k.items.map((it,b)=>'<button type="button" class="wip'+(b===cur.b?' on':'')+(it.e!=null?' done':'')+'" data-w="item" data-b="'+b+'">'+esc(it.n||'Item')+(it.e!=null?'<i>✓</i>':it.w!=null?'<i>◆</i>':'')+'</button>').join('');
  }
  const baseRes=()=>courseRes(c,'whatif').pct;
  function setItem(){
    const p=cur.it.p||100, st=p>=40?1:0.5; R.min=0; R.max=p; R.step=st;
    const v0=cur.it.w!=null?cur.it.w:(cur.it.e!=null?cur.it.e:Math.round(p*0.85/st)*st); R.value=v0;
    ov.querySelector('.wimid').textContent=trim((p/2).toFixed(1)); ov.querySelector('.wimax').textContent=trim(p.toFixed(1));
    Q.innerHTML=[1,.9,.8,.7].map(f=>'<button type="button" data-w="q" data-v="'+(p*f)+'">'+Math.round(f*100)+'%</button>').join('');
    upd();
  }
  let lastL='';
  function upd(){
    const v=+R.value, p=cur.it.p||100, prev=cur.it.w;
    const before=baseRes(); cur.it.w=v; const r=courseRes(c,'whatif'); cur.it.w=prev;
    V.textContent=trim(v.toFixed(1))+' / '+trim(p.toFixed(1))+'  ·  '+Math.round(v/p*100)+'%';
    const nl=letterOf(c,r.pct); if(nl!==lastL){ L.textContent=nl; L.classList.remove('bump'); void L.offsetWidth; L.classList.add('bump'); lastL=nl; }
    P.textContent=pctS(r.pct);
    const d=(r.pct!=null&&before!=null)?r.pct-before:0; D.textContent=Math.abs(d)<0.05?'':(d>0?'+':'−')+Math.abs(d).toFixed(1)+' vs now'; D.className='wiD'+(d>0.05?' up':d<-0.05?' dn':'');
    R.style.setProperty('--v',(v/p*100)+'%');
  }
  function close(){ ov.classList.remove('open'); document.removeEventListener('keydown',kd,true); rel(); setTimeout(function(){ ov.remove(); },260); }
  const kd=function(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } };
  document.addEventListener('keydown',kd,true);
  R.addEventListener('input',upd);
  ov.addEventListener('click',function(e){
    if(e.target===ov){ close(); return; }
    const b=e.target.closest('[data-w]'); if(!b) return; const w=b.dataset.w;
    if(w==='x') close();
    else if(w==='sec'){ const a=+b.dataset.a, k=c.cats[a]; const nb=Math.max(0,k.items.findIndex(x=>x.e==null&&!x.opt)); cur=list.find(x=>x.a===a&&x.b===nb)||list.find(x=>x.a===a); pills(); setItem(); }
    else if(w==='item'){ cur=list.find(x=>x.a===cur.a&&x.b===+b.dataset.b); pills(); setItem(); }
    else if(w==='q'){ R.value=b.dataset.v; upd(); }
    else if(w==='keep'){ cur.it.w=+R.value; save(); close(); render(true); }
    else if(w==='clear'){ cur.it.w=null; save(); close(); render(true); }
  });
  pills(); setItem(); setTimeout(function(){ R.focus({preventScroll:true}); },200);
}
function secModal(c){
  openModal('Add a section',
    '<label class="f">Section name<input type="text" name="n" placeholder="e.g. Labs, Quizzes, Participation" required></label>'
    +'<div class="two"><label class="f">'+(c.pooled?'Points each':'Weight (%)')+'<input type="number" name="w" step="any" min="0" value="'+(c.pooled?100:Math.max(0,Math.round(100-c.cats.reduce((t,k)=>t+(k.w||0),0))))+'"></label><label class="f">How many items<input type="number" name="cnt" min="0" max="40" step="1" value="3"></label></div>'
    +(c.pooled?'':'<div class="two"><label class="f">Scoring<select name="r"><option value="avg">Average of scores</option><option value="sum">Total points</option><option value="best">Only the best N count</option></select></label><label class="f">Each item is out of<input type="number" name="p" step="any" min="0" value="100"></label></div>'
    +'<label class="swrow"><span>Drop the lowest score</span><input type="checkbox" class="swi" name="drop"><i></i></label>'),
    'Add section',function(v){
      const n=(v.n||'').trim(); if(!n) return false;
      const cnt=Math.max(0,Math.min(40,Math.floor(num(v.cnt)||0))), p=c.pooled?(num(v.w)||100):(num(v.p)||100), base=n.replace(/s$/i,'');
      const items=[]; for(let i=1;i<=cnt;i++) items.push(I(base+' '+i,p));
      const k={name:n,w:c.pooled?0:(num(v.w)||0),rule:c.pooled?'sum':(v.r||'avg'),items:items};
      if(!c.pooled&&v.drop==='on'&&(k.rule==='avg'||k.rule==='sum')) k.drop=1;
      if(k.rule==='best') k.n=Math.max(1,cnt-1);
      c.cats.push(k); save(); render(true);
      setTimeout(function(){ const all=document.querySelectorAll('.cat'); const el=all[all.length-1]; if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.classList.add('flash'); } },60);
    });
}
/* ---------- calendar ---------- */
const DAYN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MONN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], CAL_RH=100;
let calWk=null, calDay=null;
const calMQ=window.matchMedia('(max-width:720px)');
calMQ.addEventListener?calMQ.addEventListener('change',function(){ if(view==='cal') calRedraw(); }):0;
const pd=i=>new Date(i+'T12:00:00');
const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addD=(i,n)=>{ const d=pd(i); d.setDate(d.getDate()+n); return isoD(d); };
const mondayOf=i=>addD(i,-pd(i).getDay());
const DLET=['S','M','T','W','Th','F','S'];
const dayDiff=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const tMin=t=>{ const p=String(t||'').split(':'); return p.length<2?null:(+p[0])*60+(+p[1]); };
const minT=m=>{ m=Math.max(0,Math.min(1439,m)); return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); };
function fmtT(m,ap){ const h=Math.floor(m/60), mm=m%60; return (h%12||12)+(mm?':'+String(mm).padStart(2,'0'):'')+(ap===false?'':(h>=12?' PM':' AM')); }
function fmtR(a,b){ const same=(a>=720)===(b>=720); return fmtT(a,!same)+' – '+fmtT(b); }
function wkLabel(mon){ const a=pd(mon), b=pd(addD(mon,6)); return MONN[a.getMonth()]+' '+a.getDate()+' – '+(a.getMonth()===b.getMonth()?'':MONN[b.getMonth()]+' ')+b.getDate(); }
function evOn(e,D){
  if(D<e.date) return false; if(e.until&&D>e.until) return false; if((e.skip||[]).includes(mondayOf(D))) return false;
  const n=dayDiff(e.date,D);
  if(e.rep==='none') return n===0; if(e.rep==='daily') return true; if(e.rep==='weekly') return n%7===0; if(e.rep==='biweekly') return n%14===0;
  return pd(D).getDate()===pd(e.date).getDate();
}
function meetSum(c){ return c.meets.filter(m=>m.days.length&&m.st&&m.en).map(m=>{ const ds=m.days.slice().sort((a,b)=>a-b).map(d=>DAYN[d]).join(' '); return ds+' · '+fmtR(tMin(m.st),tMin(m.en))+(m.loc?' · '+m.loc:''); }); }
function calView(){
  return '<div class="cal"><div class="calhd"><div class="calhl">'+semTitle()+'</div>'
    +'<div class="caldates"><div><span>Starts</span>'+dateField('data-f="semstart"',S.start,'Semester start','Pick a date')+'</div><div><span>Ends</span>'+dateField('data-f="semend"',S.end,'Semester end','Pick a date')+'</div></div></div>'
    +'<div id="calSum"></div><div id="calBody"></div></div>';
}
function calRedraw(){ const b=document.getElementById('calBody'), u=document.getElementById('calSum'); if(b&&u&&view==='cal'){ const p=calBody(); u.innerHTML=p.sum; b.innerHTML=p.rest; calFit(); requestAnimationFrame(calFit); } }
function calFit(){
  const g=document.querySelector('.calgrid'); if(!g||view!=='cal') return;
  const hrs=+g.dataset.hrs||9, ax=g.querySelector('.axis'); if(!ax) return;
  g.style.setProperty('--rh','60px');
  const top=ax.getBoundingClientRect().top+window.scrollY, avail=window.innerHeight-top-34;
  const rh=Math.max(calMQ.matches?64:72,Math.min(112,Math.floor(avail/hrs)));
  g.style.setProperty('--rh',rh+'px');
  g.querySelectorAll('.ev[data-dur]').forEach(function(e){ e.classList.toggle('tight',(+e.dataset.dur)*rh<46); });
}
window.addEventListener('resize',function(){ if(view==='cal') calFit(); });
function calBody(){
  const st=S.start||'', en=S.end||'', okR=st&&en&&en>=st;
  const w0=okR?mondayOf(st):null, w1=okR?mondayOf(en):null;
  const curW=mondayOf(TODAY);
  if(!calWk){ let r=TODAY; if(okR){ if(r<st) r=st; if(r>en) r=en; } calWk=mondayOf(r); }
  if(okR){ if(calWk<w0) calWk=w0; if(calWk>w1) calWk=w1; }
  const offs=S.off||[];
  const weeks=[]; if(okR&&dayDiff(w0,w1)<=7*40) for(let w=w0;w<=w1;w=addD(w,7)) weeks.push(w);
  // summary
  let sum;
  if(okR){
    const k=weeks.indexOf(calWk)+1, tot=weeks.length, span=Math.max(1,dayDiff(st,en)), done=Math.min(1,Math.max(0,dayDiff(st,TODAY)/span));
    const note=TODAY<st?'Starts in '+dayDiff(TODAY,st)+' day'+(dayDiff(TODAY,st)===1?'':'s'):TODAY>en?'Semester finished':dayDiff(TODAY,en)+' day'+(dayDiff(TODAY,en)===1?'':'s')+' left';
    sum='<section class="card calsumc"><div class="calsum"><div class="calwk">Week '+k+'<small>of '+tot+'</small></div><div class="calnote">'+note+'</div></div><div class="calmid"><div class="calprog"><i style="width:'+(done*100).toFixed(1)+'%"></i></div>'
      +(weeks.length?'<div class="wks">'+weeks.map((w,i)=>'<button type="button" class="wk'+(w===calWk?' on':'')+(w===curW?' now':'')+(offs.some(o=>o.end>=w&&o.start<=addD(w,6))?' hasoff':'')+'" data-act="calwk" data-w="'+w+'" aria-label="Week '+(i+1)+', '+wkLabel(w)+'" title="'+wkLabel(w)+'">'+(i+1)+'</button>').join('')+'</div>':'')+'</div></section>';
  } else sum='<section class="card calsumc"><div class="calhint">Set your semester’s first and last day to see week numbers and your progress.</div></section>';
  // events
  const meets=[]; S.courses.forEach(c=>c.meets.forEach(m=>{ const a=tMin(m.st), b=tMin(m.en); if(m.days.length&&a!=null&&b!=null&&b>a) meets.push({c:c,m:m,a:a,b:b}); }));
  const evs=(S.events||[]);
  let lo=1e9,hi=-1; meets.forEach(x=>{ lo=Math.min(lo,x.a); hi=Math.max(hi,x.b); }); evs.forEach(e=>{ if(!e.allDay){ const a=tMin(e.st), b=tMin(e.en); if(a!=null){ lo=Math.min(lo,a); hi=Math.max(hi,b!=null&&b>a?b:a+60); } } });
  if(hi<0){ lo=9*60; hi=17*60; }
  if(hi-lo<6*60){ const c=(hi+lo)/2; lo=c-3*60; hi=c+3*60; }
  const h0=Math.max(0,Math.floor(lo/60)), h1=Math.min(24,Math.ceil(hi/60)), HRS=(h1-h0);
  const wkend=true;
  const nd0=wkend?7:5, days=[]; for(let i=0;i<nd0;i++) days.push(addD(calWk,wkend?i:i+1));
  const mob=calMQ.matches; if(!calDay||!days.includes(calDay)) calDay=days.includes(TODAY)?TODAY:days[0];
  const inSem=d=>!okR||(d>=st&&d<=en);
  const offOn=d=>offs.filter(o=>d>=o.start&&d<=o.end).sort((a,b)=>dayDiff(a.start,a.end)-dayDiff(b.start,b.end))[0];
  const dayEventsAll=days.map(d=>{
    const L=[], offH=offOn(d); if(inSem(d)&&!offH) meets.forEach(x=>{ if(x.m.days.includes(pd(d).getDay())&&!(x.c.skip||[]).includes(calWk)) L.push({a:x.a,b:x.b,col:COLORS[x.c.id],fg:TILE[x.c.id],t:x.c.name,loc:x.m.loc,go:'clsopen',id:x.c.id}); });
    const allDay=[];
    evs.forEach(e=>{ if(!evOn(e,d)) return; if(e.allDay||tMin(e.st)==null) allDay.push(e); else { const a=tMin(e.st); let b=tMin(e.en); if(b==null||b<=a) b=a+60; L.push({a:a,b:b,col:e.color,fg:fgFor(e.color),t:e.t,loc:e.loc,go:'evedit',id:e.id}); } });
    L.sort((x,y)=>x.a-y.a||y.b-x.b);
    const out=[]; let cluster=[],cend=-1;
    const flush=()=>{ const lanes=[]; cluster.forEach(x=>{ let l=0; while(lanes[l]!==undefined&&lanes[l]>x.a) l++; lanes[l]=x.b; x.lane=l; }); const n=lanes.length; cluster.forEach(x=>{ x.n=n; out.push(x); }); cluster=[]; };
    L.forEach(x=>{ if(cluster.length&&x.a>=cend){ flush(); cend=-1; } cluster.push(x); cend=Math.max(cend,x.b); }); if(cluster.length) flush();
    const dues=[];
    return {d:d,blocks:out,allDay:allDay,dues:dues,off:offH};
  });
  const dayEvents=mob?dayEventsAll.filter(x=>x.d===calDay):dayEventsAll, nd=dayEvents.length, vdays=dayEvents.map(x=>x.d);
  dayEvents.forEach(x=>{ const w=pd(x.d).getDay(); x.quiet=!mob&&(w===0||w===6)&&!x.blocks.length&&!x.allDay.length&&!x.off; });
  const colsT=dayEvents.map(x=>x.quiet?'minmax(0,.34fr)':'minmax(0,1fr)').join(' '), fullN=dayEvents.filter(x=>!x.quiet).length, quietN=dayEvents.length-fullN;
  const hasTop=dayEvents.some(x=>x.allDay.length||x.dues.length);
  const segs=[]; dayEvents.forEach((x,i)=>{ if(!x.off) return; const prev=i>0&&dayEvents[i-1].off&&dayEvents[i-1].off.id===x.off.id; if(prev){ segs[segs.length-1].n++; } else segs.push({o:x.off,a:i,n:1}); });
  const segAt={}; segs.forEach(sg=>{ segAt[sg.a]=sg; });
  const nowM=(new Date()).getHours()*60+(new Date()).getMinutes();
  let g='<div class="calgrid" style="--n:'+nd+';--cols:'+colsT+';--hrs:'+HRS+';--rh:'+CAL_RH+'px;min-width:'+(mob?0:'calc(52px + '+(fullN*128+quietN*52)+'px)')+'" data-hrs="'+HRS+'">';
  g+=(mob?'':'<div></div>')+dayEvents.map(x=>{ if(mob) return ''; const d=pd(x.d); return '<div class="dh'+(x.d===TODAY?' today':'')+(inSem(x.d)?'':' outsem')+(x.quiet?' quiet':'')+(x.off?' isoff':'')+'"><b>'+DAYN[d.getDay()]+'</b><span>'+d.getDate()+'</span></div>'; }).join('');
  if(segs.length){
    g+='<div></div><div class="offrow">'+segs.map(sg=>{ const o=sg.o, k=OFFK[o.kind], A=pd(o.start), B=pd(o.end), n=dayDiff(o.start,o.end)+1, cl=o.start<vdays[sg.a], cr=o.end>vdays[sg.a+sg.n-1];
      const rng=n===1?MONN[A.getMonth()]+' '+A.getDate():MONN[A.getMonth()]+' '+A.getDate()+' – '+(A.getMonth()===B.getMonth()?'':MONN[B.getMonth()]+' ')+B.getDate();
      return '<button type="button" class="offban'+(cl?' contl':'')+(cr?' contr':'')+'" style="--c:'+k[1]+';grid-column:'+(sg.a+1)+' / '+(sg.a+sg.n+1)+'" data-act="offedit" data-id="'+o.id+'"><b>'+esc(o.t)+'</b><span>'+(sg.n>1?k[0]+' · '+rng+(n>1?' · '+n+' days':''):k[0])+'</span></button>'; }).join('')+'</div>';
  }
  if(hasTop){
    g+='<div class="dlab">All day</div>'+dayEvents.map(x=>'<div class="dues">'+x.allDay.map(e=>'<button type="button" class="cdue ev2" style="--c:'+e.color+'" data-act="evedit" data-id="'+e.id+'" title="'+esc(e.t)+'">'+esc(e.t)+'</button>').join('')
      +x.dues.map(u=>'<button type="button" class="cdue'+(u.it.e!=null?' dn':'')+'" style="--c:'+COLORS[u.c.id]+'" data-act="go" data-v="'+u.c.id+'" title="'+esc(u.c.name+' · '+u.it.n)+'">'+esc(u.it.n)+'</button>').join('')+'</div>').join('');
  }
  let ax=''; for(let h=h0;h<=h1;h++) ax+='<span'+(h===h0?' class="f0"':'')+' style="top:calc(var(--rh)*'+(h-h0)+')">'+(h===h1?'':fmtT(h*60,true).replace(':00',''))+'</span>';
  g+='<div class="axis">'+ax+'</div>';
  dayEvents.forEach(x=>{
    g+='<div class="cdcol'+(x.d===TODAY?' today':'')+(inSem(x.d)?'':' outsem')+(x.quiet?' quiet':'')+(x.off?' offday':'')+((x.off&&dayEvents[dayEvents.indexOf(x)-1]&&dayEvents[dayEvents.indexOf(x)-1].off&&dayEvents[dayEvents.indexOf(x)-1].off.id===x.off.id)?' joined':'')+'"'+(x.off?' style="--oc:'+OFFK[x.off.kind][1]+'"':'')+' data-act="evnew" data-date="'+x.d+'" data-h0="'+h0+'" data-hrs="'+HRS+'">';
    { const si=dayEvents.indexOf(x); if(segAt[si]) g+='<div class="offbg" style="width:calc(100% * '+segAt[si].n+')"></div>'; }
    x.blocks.forEach(b=>{
      const top=(b.a/60-h0), dur=(b.b-b.a)/60, w=100/b.n;
      g+='<button type="button" class="ev'+(dur<0.55?' sm':'')+'" style="--c:'+b.col+';--fg:'+b.fg+';top:calc(var(--rh)*'+top.toFixed(4)+');min-height:max(30px,calc(var(--rh)*'+dur.toFixed(4)+' - 3px));left:calc('+(b.lane*w).toFixed(2)+'% + 3px);width:calc('+w.toFixed(2)+'% - 6px)" data-dur="'+dur.toFixed(3)+'" data-d="'+x.d+'" data-act="'+b.go+'" data-'+(b.go==='go'?'v':'id')+'="'+b.id+'"><span class="nm">'+esc(b.t)+'</span><span class="tm">'+fmtR(b.a,b.b)+'</span>'+(b.loc?'<span class="lc">'+esc(b.loc)+'</span>':'')+'</button>';
    });
    if(x.d===TODAY&&nowM>=h0*60&&nowM<=h1*60) g+='<div class="nowl" style="top:calc(var(--rh)*'+(nowM/60-h0).toFixed(4)+')"></div>';
    g+='</div>';
  });
  g+='</div>';
  const any=meets.length||evs.length;
  const prevOff=okR&&calWk<=w0, nextOff=okR&&calWk>=w1;
  const arrow=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="'+(d<0?'M14.5 6 8.5 12l6 6':'M9.5 6l6 6-6 6')+'"/></svg>';
  const tb='<div class="caltb"><div class="calnav"><button type="button" class="tg" data-act="calwk" data-w="prev"'+(prevOff?' disabled':'')+' aria-label="Previous week">'+arrow(-1)+'</button><button type="button" class="tg" data-act="calwk" data-w="next"'+(nextOff?' disabled':'')+' aria-label="Next week">'+arrow(1)+'</button></div><div class="caltitle">'+wkLabel(calWk)+'<small>'+pd(calWk).getFullYear()+'</small></div>'
    +'<button type="button" class="btn sm" data-act="calwk" data-w="today">Today</button><button type="button" class="btn sm" data-act="offadd">＋ Day off</button><button type="button" class="btn pri sm" data-act="evadd">＋ Event</button></div>';
  const legend=S.courses.length?'<div class="callg">'+S.courses.map(c=>{ const m=meetSum(c); return '<button type="button" class="lg" data-act="go" data-v="'+c.id+'"><i data-cid="'+c.id+'" style="background:'+COLORS[c.id]+'"></i><div><b>'+esc(c.name)+'</b><small>'+(m.length?m.map(esc).join('<br>'):'No time set · add one under ✎ Edit')+'</small></div></button>'; }).join('')+'</div>':'';
  const offList='<section class="offs"><div class="offh"><h3>Days off</h3><div class="offact"><button type="button" class="btn sm" data-act="offus">Add US holidays</button><button type="button" class="btn pri sm" data-act="offadd">＋ Add</button></div></div>'
    +(offs.length?'<div class="offgrid">'+offs.slice().sort((a,b)=>a.start<b.start?-1:1).map(o=>{ const k=OFFK[o.kind], same=o.start===o.end, A=pd(o.start), B=pd(o.end), past=o.end<TODAY;
      const rng=same?DAYN[A.getDay()]+', '+MONN[A.getMonth()]+' '+A.getDate():MONN[A.getMonth()]+' '+A.getDate()+' – '+(A.getMonth()===B.getMonth()?'':MONN[B.getMonth()]+' ')+B.getDate(), n=dayDiff(o.start,o.end)+1;
      return '<button type="button" class="off'+(past?' past':'')+'" style="--c:'+k[1]+'" data-act="offedit" data-id="'+o.id+'"><i></i><div><b>'+esc(o.t)+'</b><small>'+rng+(n>1?' · '+n+' days':'')+'</small></div><span>'+k[0]+'</span></button>'; }).join('')+'</div>'
      :'<p class="calhint">Add holidays, breaks and days off. Classes are hidden on those days.</p>')+'</section>';
  const strip=mob?'<div class="daystrip">'+dayEventsAll.map(x=>{ const d=pd(x.d), has=x.blocks.length||x.allDay.length||x.dues.length; return '<button type="button" class="dsb'+(x.d===calDay?' on':'')+(x.d===TODAY?' tod':'')+(x.off?' hasoff':'')+'" data-act="calday" data-d="'+x.d+'" aria-label="'+DAYN[d.getDay()]+' '+d.getDate()+'"><b>'+DLET[d.getDay()]+'</b><span>'+d.getDate()+'</span><i'+(has||x.off?'':' class="nil"')+'></i></button>'; }).join('')+'</div>':'';
  const empty=any?'':'<div class="calempty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M8 3v3.5M16 3v3.5M3.5 10h17"/></svg><b>Nothing scheduled yet</b><p>Add when each class meets under ✎ Edit on the class page, or add your own event.</p><button type="button" class="btn pri" data-act="evadd">＋ Add an event</button></div>';
  const skN=S.courses.filter(c=>c.meets.length&&(c.skip||[]).includes(calWk)).length+evs.filter(e=>e.rep!=='none'&&(e.skip||[]).includes(calWk)).length;
  const skRow=skN?'<div class="skrow"><span>'+skN+' skipped this week</span><button type="button" class="btn sm" data-act="calrestore">Restore</button></div>':'';
  let dayhd='';
  if(mob&&dayEvents[0]){ const x0=dayEvents[0], n0=x0.blocks.length+x0.allDay.length, DF=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    dayhd='<div class="dayhd"><b>'+DF[pd(x0.d).getDay()]+'</b><span>'+MONN[pd(x0.d).getMonth()]+' '+pd(x0.d).getDate()+' · '+(n0?n0+' on the schedule':(x0.off?x0.off.t:'free day'))+'</span></div>';
    if(!n0&&!x0.off) g='<div class="dayempty"><b>Nothing scheduled</b><p>Enjoy the free time, or add something.</p><button type="button" class="btn pri" data-act="evadd" data-date="'+x0.d+'">＋ Add an event</button></div>'; }
  return {sum:sum,rest:'<div class="calcard">'+tb+skRow+strip+dayhd+'<div class="calscroll'+(any?'':' dim')+'">'+g+'</div>'+(mob?'':empty)+'</div>'+offList+legend};
}
function offModal(e,edit){
  const v=Object.assign({t:'',kind:'holiday',start:TODAY,end:''},e||{});
  const body='<label class="f">Name<input type="text" name="t" value="'+esc(v.t)+'" placeholder="Thanksgiving break, Spring recess…" required></label>'
    +'<div class="f"><span>Type</span><div class="kinds">'+Object.keys(OFFK).map(k=>'<label class="kd" style="--c:'+OFFK[k][1]+'"><input type="radio" name="kind" value="'+k+'"'+(v.kind===k?' checked':'')+'><span>'+OFFK[k][0]+'</span></label>').join('')+'</div></div>'
    +'<div class="two"><div class="f"><span>First day</span>'+dateField('name="start"',v.start,'First day','Pick a date')+'</div><div class="f"><span>Last day</span>'+dateField('name="end"',v.end&&v.end!==v.start?v.end:'','Last day','Same day')+'</div></div>'
    +'<span class="hint">Leave the last day empty for a single day. Classes won’t show on these days.</span>'
    +(edit?'<div><button type="button" class="btn danger sm" data-act="offdel" data-id="'+v.id+'">Delete</button></div>':'');
  openModal(edit?'Edit day off':'Add a day off',body,edit?'Save':'Add',function(f){
    const no=normOff({id:edit?v.id:null,t:(f.t||'').trim()||'Day off',kind:f.kind,start:f.start,end:f.end||f.start});
    S.off=S.off||[]; const i=S.off.findIndex(x=>x.id===no.id); if(i>=0) S.off[i]=no; else S.off.push(no);
    calWk=mondayOf(no.start); save(); render(true);
  });
}
function nthDow(y,m,dow,n){ const d=new Date(y,m,1); const first=(dow-d.getDay()+7)%7; return isoD(new Date(y,m,1+first+7*(n-1))); }
function lastDow(y,m,dow){ const d=new Date(y,m+1,0); return isoD(new Date(y,m,d.getDate()-((d.getDay()-dow+7)%7))); }
function addUSHolidays(){
  const st=S.start, en=S.end; if(!(st&&en&&en>=st)){ alert('Set your semester’s first and last day first, then I can add the holidays that fall inside it.'); return; }
  const out=[]; const y0=pd(st).getFullYear(), y1=pd(en).getFullYear();
  for(let y=y0;y<=y1;y++){
    const th=nthDow(y,10,4,4);
    [['New Year’s Day',y+'-01-01',y+'-01-01'],['Martin Luther King Jr. Day',nthDow(y,0,1,3)],['Presidents’ Day',nthDow(y,1,1,3)],['Memorial Day',lastDow(y,4,1)],['Juneteenth',y+'-06-19'],['Independence Day',y+'-07-04'],['Labor Day',nthDow(y,8,1,1)],['Indigenous Peoples’ Day',nthDow(y,9,1,2)],['Veterans Day',y+'-11-11'],['Thanksgiving',th,addD(th,1)],['Christmas Day',y+'-12-25']].forEach(h=>out.push({t:h[0],kind:'holiday',start:h[1],end:h[2]||h[1]}));
  }
  S.off=S.off||[]; let n=0;
  out.forEach(h=>{ if(h.end<st||h.start>en) return; if(S.off.some(o=>o.t===h.t&&o.start===h.start)) return; S.off.push(normOff(h)); n++; });
  save(); calRedraw(); setStat(n?'Added '+n+' holiday'+(n===1?'':'s'):'Those holidays are already added','ok');
}
function classModal(id,d){
  const c=getC(id); if(!c) return;
  const ms=c.meets.filter(m=>m.days.includes(pd(d).getDay())&&m.st&&m.en);
  const body='<div class="cmod"><i style="background:'+COLORS[id]+'"></i><div><b>'+esc(c.name)+'</b><small>'+(c.code?esc(c.code)+' · ':'')+DAYN[pd(d).getDay()]+', '+fmtDL(d)+'</small>'+ms.map(m=>'<small>'+fmtR(tMin(m.st),tMin(m.en))+(m.loc?' · '+esc(m.loc):'')+'</small>').join('')+'</div></div>'
    +'<div><button type="button" class="btn" data-act="skipwk" data-k="c" data-id="'+id+'">Skip this week</button></div><span class="hint">Hides this class for the week of '+wkLabel(calWk)+'. Use Restore on the calendar to bring it back.</span>';
  openModal('Class',body,'Open class',function(){ view=id; editing=false; setHash(); render(); window.scrollTo(0,0); });
}
function evModal(e,edit){
  const v=Object.assign({t:'',date:TODAY,allDay:false,st:'09:00',en:'10:00',loc:'',note:'',color:'#FF7A59',rep:'none',until:''},e||{});
  const ro=(val,l)=>'<option value="'+val+'"'+(v.rep===val?' selected':'')+'>'+l+'</option>';
  const body='<label class="f">Title<input type="text" name="t" value="'+esc(v.t)+'" placeholder="Study group, office hours, exam…" required></label>'
    +'<div class="f"><span>Date</span>'+dateField('name="date"',v.date,'Date','Pick a date')+'</div>'
    +'<label class="swrow"><span>All day</span><input type="checkbox" name="allDay" id="evAll" class="swi"'+(v.allDay?' checked':'')+'><i></i></label>'
    +'<div class="two" id="evTimes"'+(v.allDay?' style="display:none"':'')+'><div class="f"><span>Starts</span>'+timeField('name="st"',v.st,'Start time')+'</div><div class="f"><span>Ends</span>'+timeField('name="en"',v.en,'End time')+'</div></div>'
    +'<label class="f">Location<input type="text" name="loc" value="'+esc(v.loc)+'" placeholder="Optional"></label>'
    +'<div class="two"><label class="f">Repeats<select name="rep">'+ro('none','Does not repeat')+ro('daily','Every day')+ro('weekly','Every week')+ro('biweekly','Every 2 weeks')+ro('monthly','Every month')+'</select></label><div class="f"><span>Until</span>'+dateField('name="until"',v.until,'Repeat until','Never')+'</div></div>'
    +'<div class="f"><span>Color</span><div class="evcs">'+PALETTE.map(p=>'<label class="evc" title="'+pname(p)+'"><input type="radio" name="color" aria-label="'+pname(p)+'" value="'+p+'"'+(p.toLowerCase()===v.color.toLowerCase()?' checked':'')+'><i style="background:'+p+'"></i></label>').join('')+'</div></div>'
    +'<label class="f">Notes<textarea name="note" placeholder="Optional">'+esc(v.note)+'</textarea></label>'
    +(edit&&v.rep!=='none'?'<div class="f"><span>Skip weeks</span><div class="skchips">'+(v.skip||[]).map(w=>'<span class="skc">'+wkLabel(w)+'<button type="button" data-act="unskip" data-k="e" data-id="'+v.id+'" data-w="'+w+'" aria-label="Restore this week">×</button></span>').join('')+'</div><div><button type="button" class="btn sm" data-act="skipwk" data-k="e" data-id="'+v.id+'">Skip the week of '+wkLabel(calWk)+'</button></div></div>':'')
    +(edit?'<div><button type="button" class="btn danger sm" data-act="evdel" data-id="'+v.id+'">Delete event</button></div>':'');
  openModal(edit?'Edit event':'New event',body,edit?'Save':'Add event',function(f){
    const ne=normEvent({id:edit?v.id:null,t:(f.t||'').trim()||'Event',date:f.date,allDay:f.allDay==='on',st:f.st,en:f.en,loc:f.loc,note:f.note,color:f.color,rep:f.rep,until:f.until,skip:(edit&&(S.events||[]).find(x=>x.id===v.id)||{}).skip||[]});
    if(!ne.allDay&&ne.st&&ne.en&&ne.en<=ne.st) ne.en=minT(tMin(ne.st)+60);
    S.events=S.events||[]; const i=S.events.findIndex(x=>x.id===ne.id); if(i>=0) S.events[i]=ne; else S.events.push(ne);
    calWk=mondayOf(ne.date); save(); render(true);
  });
  const all=document.getElementById('evAll'); if(all) all.addEventListener('change',function(){ const t=document.getElementById('evTimes'); if(t) t.style.display=all.checked?'none':''; });
}
/* ---------- class editing ---------- */
const gradesOff=c=>!!(c.noGpa&&c.noGrades);
const scaleSel=c=>c.cuts?'custom':(c.scale==='plain'?'plain':(c.scale==='std'?'std':'custom'));
function editPanel(c){
  const sel=scaleSel(c), rows=scaleOf(c);
  const op=(v,l)=>'<option value="'+v+'"'+(sel===v?' selected':'')+'>'+l+'</option>';
  const cuts=sel==='custom'?'<div class="cuts">'+rows.map((r,i)=>'<div class="cut"><b>'+esc(r[1])+'</b><label>from <input type="number" step="any" data-f="cut" data-col="0" data-i="'+i+'" data-c="'+c.id+'" value="'+r[0]+'"'+(i===rows.length-1?' disabled':'')+'> %</label><label>GPA <input type="number" step="any" data-f="cut" data-col="2" data-i="'+i+'" data-c="'+c.id+'" value="'+r[2]+'"></label></div>').join('')+'</div>':'';
  return '<section class="card editp"><h3>Class settings</h3>'
    +'<div class="two"><label class="f">Name<input type="text" data-f="cname" data-c="'+c.id+'" value="'+esc(c.name)+'"></label><label class="f">Code<input type="text" data-f="ccode" data-c="'+c.id+'" value="'+esc(c.code)+'"></label></div>'
    +'<div class="two"><label class="f">Professor<input type="text" data-f="cprof" data-c="'+c.id+'" value="'+esc(c.prof)+'" placeholder="Dr. Smith"></label>'
    +'<label class="f">Credits<input type="number" step="0.5" min="0" inputmode="decimal" data-f="credits" data-c="'+c.id+'" value="'+(c.credits==null?'':c.credits)+'" placeholder="3"></label></div>'
    +'<div class="two"><label class="f">Graded by<select data-f="pooled" data-c="'+c.id+'"><option value="0"'+(c.pooled?'':' selected')+'>Weighted categories</option><option value="1"'+(c.pooled?' selected':'')+'>Total points</option></select></label>'
    +'<label class="f">Grading scale<select data-f="scale" data-c="'+c.id+'">'+op('std','Plus/minus (A+ at 97)')+op('plain','Plain letters (A at 90)')+op('custom','Custom cutoffs')+'</select></label></div>'
    +cuts
    +'<label class="swrow" style="margin:2px 0 14px"><span>Count in GPA<small style="display:block;font-weight:500;font-size:12.5px;color:var(--mut);margin-top:2px">Turn off for pass/fail or audit classes. Credits still count toward your total.</small></span><input type="checkbox" class="swi" data-f="nogpa" data-c="'+c.id+'"'+(c.noGpa?'':' checked')+'><i></i></label>'
    +(c.noGpa?'<label class="swrow" style="margin:-4px 0 14px"><span>Track grades<small style="display:block;font-weight:500;font-size:12.5px;color:var(--mut);margin-top:2px">Turn off to hide scores and grades for this class completely.</small></span><input type="checkbox" class="swi" data-f="nograde" data-c="'+c.id+'"'+(c.noGrades?'':' checked')+'><i></i></label>':'')
    +meetsEdit(c)
    +'<label class="f">Notes<textarea data-f="cnotes" data-c="'+c.id+'" placeholder="Syllabus notes, one per line">'+esc(c.notes.join('\n'))+'</textarea></label>'
    +'<div class="editact"><button type="button" class="btn danger" data-act="delclass" data-c="'+c.id+'">Delete class</button></div></section>';
}
function timeField(attrs,val,label){ return '<span class="tp"><input type="hidden" '+attrs+' value="'+esc(val||'')+'"><button type="button" class="tpbtn'+(val?'':' empty')+'" data-tp aria-label="'+label+'">'+(val?fmtT(tMin(val)):'Set time')+'</button></span>'; }
const fmtDL=i=>{ const d=pd(i); return MONN[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear(); };
function dateField(attrs,val,label,ph){ return '<span class="tp"><input type="hidden" '+attrs+' value="'+esc(val||'')+'"><button type="button" class="tpbtn dpbtn'+(val?'':' empty')+'" data-dp data-ph="'+esc(ph||'Pick a date')+'" aria-label="'+label+'">'+(val?fmtDL(val):esc(ph||'Pick a date'))+'</button></span>'; }
let dpEl=null;
function dpClose(){ if(dpEl){ const b=dpEl._btn; dpEl.remove(); dpEl=null; if(b&&document.contains(b)){ try{ b.focus({preventScroll:true}); }catch(e){} } } }
function dpOpen(btn){
  dpClose(); tpClose(); const inp=btn.parentNode.querySelector('input'); if(!inp) return;
  let sel=inp.value||'', vm=pd(sel||TODAY); vm=new Date(vm.getFullYear(),vm.getMonth(),1,12);
  const el=document.createElement('div'); el.className='dpop'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','Pick a date'); document.body.appendChild(el); dpEl=el;
  function set(v){ inp.value=v; btn.textContent=v?fmtDL(v):btn.dataset.ph; btn.classList.toggle('empty',!v); inp.dispatchEvent(new Event('input',{bubbles:true})); }
  function draw(){
    const first=new Date(vm.getFullYear(),vm.getMonth(),1,12), lead=first.getDay(), start=new Date(first); start.setDate(1-lead);
    let cells='';
    for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); const iso=isoD(d), cls=(d.getMonth()!==vm.getMonth()?'o ':'')+(iso===TODAY?'t ':'')+(iso===sel?'on ':'');
      cells+='<button type="button" class="'+cls+'" data-d="'+iso+'">'+d.getDate()+'</button>'; }
    el.innerHTML='<div class="dph"><button type="button" class="dpnav" data-n="-1" aria-label="Previous month"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6 8.5 12l6 6"/></svg></button><div class="dpt">'+['January','February','March','April','May','June','July','August','September','October','November','December'][vm.getMonth()]+' <small>'+vm.getFullYear()+'</small></div><button type="button" class="dpnav" data-n="1" aria-label="Next month"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></svg></button></div>'
      +'<div class="dpw">'+DLET.map(x=>'<span>'+x+'</span>').join('')+'</div><div class="dpg">'+cells+'</div>'
      +'<div class="tpfoot"><button type="button" class="tpclear" data-x="1">Clear</button><button type="button" class="tpclear dpt0" data-today="1">Today</button></div>';
  }
  el.addEventListener('click',function(ev){
    const b=ev.target.closest('button'); if(!b) return;
    if(b.dataset.n){ vm=new Date(vm.getFullYear(),vm.getMonth()+(+b.dataset.n),1,12); draw(); return; }
    if(b.dataset.x){ set(''); dpClose(); return; }
    if(b.dataset.today){ set(TODAY); dpClose(); return; }
    if(b.dataset.d){ sel=b.dataset.d; set(sel); dpClose(); }
  });
  draw();
  el.setAttribute('role','dialog');
  el._btn=btn; const r=btn.getBoundingClientRect(), w=300, hgt=el.offsetHeight;
  let left=Math.min(Math.max(8,r.left),innerWidth-w-8), top=r.bottom+8; if(top+hgt>innerHeight-8) top=Math.max(8,r.top-hgt-8);
  el.style.left=left+'px'; el.style.top=top+'px'; const f1=el.querySelector('.dpg .on')||el.querySelector('.dpg .t')||el.querySelector('.dpg button:not(.o)'); if(f1) f1.focus({preventScroll:true});
}
let tpEl=null;
function tpClose(){ if(tpEl){ const b=tpEl._btn; tpEl.remove(); tpEl=null; if(b&&document.contains(b)){ try{ b.focus({preventScroll:true}); }catch(e){} } } }
function tpOpen(btn){
  tpClose(); const inp=btn.parentNode.querySelector('input'); if(!inp) return;
  let m=tMin(inp.value);
  if(m==null){ const isEnd=inp.dataset.f==='men'||inp.name==='en', sc=inp.closest('.mtimes')||inp.closest('form'), st=isEnd&&sc?sc.querySelector('input[data-f=mst],input[name=st]'):null; m=(st&&tMin(st.value)!=null)?tMin(st.value):540; }
  const el=document.createElement('div'); el.className='tpop'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','Pick a time'); document.body.appendChild(el); tpEl=el;
  function apply(){ inp.value=minT(m); btn.textContent=fmtT(m); btn.classList.remove('empty'); inp.dispatchEvent(new Event('input',{bubbles:true})); }
  function draw(first){
    const h=Math.floor(m/60), mm=m%60, pm=h>=12, h12=h%12||12;
    const mins=[]; for(let i=0;i<60;i+=5) mins.push(i); if(!mins.includes(mm)){ mins.push(mm); mins.sort((a,b)=>a-b); }
    el.innerHTML='<div class="tpshow">'+fmtT(m)+'</div><div class="tpcols">'
      +'<div class="tpcol" data-c="h">'+[1,2,3,4,5,6,7,8,9,10,11,12].map(x=>'<button type="button" data-k="h" data-v="'+x+'"'+(x===h12?' class="on"':'')+'>'+x+'</button>').join('')+'</div>'
      +'<div class="tpcol" data-c="m">'+mins.map(x=>'<button type="button" data-k="m" data-v="'+x+'"'+(x===mm?' class="on"':'')+'>'+String(x).padStart(2,'0')+'</button>').join('')+'</div>'
      +'<div class="tpcol ampm"><button type="button" data-k="p" data-v="0"'+(pm?'':' class="on"')+'>AM</button><button type="button" data-k="p" data-v="1"'+(pm?' class="on"':'')+'>PM</button></div></div>'
      +'<div class="tpfoot"><button type="button" class="tpclear" data-k="x">Clear</button><button type="button" class="btn pri sm" data-k="d">Done</button></div>';
    el.querySelectorAll('.tpcol[data-c]').forEach(function(col){ const on=col.querySelector('.on'); if(on) col.scrollTop=on.offsetTop-col.clientHeight/2+on.offsetHeight/2; });
  }
  el.addEventListener('click',function(ev){
    const b=ev.target.closest('button[data-k]'); if(!b) return; const k=b.dataset.k, v=+b.dataset.v;
    const h=Math.floor(m/60), mm=m%60, pm=h>=12;
    if(k==='h') m=((v%12)+(pm?12:0))*60+mm;
    else if(k==='m') m=h*60+v;
    else if(k==='p') m=((h%12)+(v?12:0))*60+mm;
    else if(k==='x'){ inp.value=''; btn.textContent='Set time'; btn.classList.add('empty'); inp.dispatchEvent(new Event('input',{bubbles:true})); tpClose(); return; }
    else { tpClose(); return; }
    apply(); draw();
  });
  if(!inp.value) apply();
  draw(true);
  el._btn=btn; const r=btn.getBoundingClientRect(), w=288, hgt=el.offsetHeight;
  let left=Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8), top=r.bottom+8; if(top+hgt>innerHeight-8) top=Math.max(8,r.top-hgt-8);
  el.style.left=left+'px'; el.style.top=top+'px'; el.setAttribute('role','dialog'); const f0=el.querySelector('.tpcol .on'); if(f0) f0.focus({preventScroll:true});
  el.querySelectorAll('.tpcol[data-c]').forEach(function(col){ const on=col.querySelector('.on'); if(on) col.scrollTop=on.offsetTop-col.clientHeight/2+on.offsetHeight/2; });
}
document.addEventListener('click',function(ev){ const t=ev.target.closest&&ev.target.closest('[data-tp]'); if(t){ ev.preventDefault(); ev.stopPropagation(); dpClose(); tpOpen(t); return; } const d=ev.target.closest&&ev.target.closest('[data-dp]'); if(d){ ev.preventDefault(); ev.stopPropagation(); dpOpen(d); return; } if(tpEl&&!tpEl.contains(ev.target)) tpClose(); if(dpEl&&!dpEl.contains(ev.target)) dpClose(); },true);
document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ tpClose(); dpClose(); } });
window.addEventListener('resize',function(){ tpClose(); dpClose(); });
const DCH=[[0,'S'],[1,'M'],[2,'T'],[3,'W'],[4,'Th'],[5,'F'],[6,'S']];
function meetsEdit(c){
  const rows=c.meets.map((m,i)=>'<div class="mrow"><div class="dchips">'+DCH.map(d=>'<button type="button" class="'+(m.days.includes(d[0])?'on':'')+'" data-act="mday" data-c="'+c.id+'" data-mi="'+i+'" data-d="'+d[0]+'" aria-pressed="'+m.days.includes(d[0])+'" aria-label="'+DAYN[d[0]]+'">'+d[1]+'</button>').join('')+'</div>'
    +'<div class="mtimes">'+timeField('data-f="mst" data-c="'+c.id+'" data-mi="'+i+'"',m.st,'Start time')+'<span>to</span>'+timeField('data-f="men" data-c="'+c.id+'" data-mi="'+i+'"',m.en,'End time')+'</div>'
    +'<input type="text" class="mloc" data-f="mloc" data-c="'+c.id+'" data-mi="'+i+'" value="'+esc(m.loc)+'" placeholder="Room (optional)" aria-label="Room">'
    +'<button type="button" class="mdel" data-act="mdel" data-c="'+c.id+'" data-mi="'+i+'" aria-label="Remove this time" title="Remove">×</button></div>').join('');
  return '<div class="f meets"><span>Class times</span>'+rows+'<div><button type="button" class="btn sm" data-act="madd" data-c="'+c.id+'">＋ '+(c.meets.length?'Add another time':'Add a time')+'</button></div><span class="hint">Shows in the Calendar tab at the top.</span></div>';
}
let openCats=new Set();
const CAPL=c=>scaleOf(c).map(r=>r[1]).filter(l=>l!=='A+'&&l!=='A');
function quickRule(c,k,ki){
  const r=k.rule||'avg', base='data-c="'+c.id+'" data-k="'+ki+'"', real=k.items.filter(i=>!i.opt).length;
  const step=(act,label,val)=>'<span class="qf"><span class="ql">'+label+'</span><span class="qstep"><button type="button" data-act="'+act+'" '+base+' data-d="-1" aria-label="Less">−</button><b>'+val+'</b><button type="button" data-act="'+act+'" '+base+' data-d="1" aria-label="More">+</button></span></span>';
  const curve='<label class="qf"><span class="ql">Curve</span><span class="qin"><input type="number" step="0.5" inputmode="decimal" data-f="qbonus" '+base+' value="'+(k.bonus||'')+'" placeholder="0" aria-label="Section curve in points"><em>pts</em></span></label>';
  let main='';
  if(r==='avg'||r==='sum') main=step('qdropn','Drop lowest',k.drop||0)+step('qhin','Drop highest',k.dropHi||0)+curve
    +'<label class="qsw"><input type="checkbox" class="swi" data-f="catrp" '+base+(k.rp?' checked':'')+'><i></i><span>Final replaces lowest</span></label>';
  else if(r==='best') main=step('qbestn','Count the best',(k.n||real)+' of '+real)+curve;
  else if(r==='cap') main='<span class="qlab strong">Full credit at '+Math.round((k.cap||0.8)*100)+'% of points</span>'+curve;
  else if(r==='swap') main='<span class="qlab strong">Optional items replace your lowest</span>'+curve;
  const open=editing||openCats.has(c.id+':'+ki);
  return '<div class="qrule">'+main+(editing?'':'<button type="button" class="qmore'+(open?' on':'')+'" data-act="catopts" '+base+'>'+(open?'Done':'Scoring type')+'</button>')+'</div>';
}
function warnHtml(c){
  const capd=(courseRes(c,'whatif').capped||[]);
  return capd.length?'<div class="rwarn">Your grade is capped at '+capd.map(q=>q.cap).join('/')+': '+capd.map(q=>esc((c.cats[q.cat]||{}).name||'a section')+' is under '+trim(String(q.min))+'%').join(', ')+'.</div>':'';
}
function classRules(c){
  const opt=(v,l)=>'<button type="button" class="'+(c.round===v?'on':'')+'" data-act="cround" data-c="'+c.id+'" data-m="'+v+'">'+l+'</button>';
  const reqs=c.pooled?'':(c.reqs||[]).map((q,qi)=>'<div class="creq"><span>Need</span><select data-f="reqcat" data-c="'+c.id+'" data-q="'+qi+'" aria-label="Section">'+c.cats.map((k,i)=>'<option value="'+i+'"'+(i===q.cat?' selected':'')+'>'+esc(k.name)+'</option>').join('')+'</select><span>at least</span><span class="qin"><input type="number" step="any" min="0" max="100" data-f="reqmin" data-c="'+c.id+'" data-q="'+qi+'" value="'+q.min+'" aria-label="Minimum percent"><em>%</em></span><span>or the best grade is</span><select data-f="reqcap" data-c="'+c.id+'" data-q="'+qi+'" aria-label="Capped grade">'+CAPL(c).map(l=>'<option'+(l===q.cap?' selected':'')+'>'+l+'</option>').join('')+'</select><button type="button" class="creqx" data-act="reqdel" data-c="'+c.id+'" data-q="'+qi+'" aria-label="Remove">×</button></div>').join('');
  return '<section class="crules"><div class="crow"><b>Class rules</b>'
    +'<label class="qf"><span class="ql">Curve</span><span class="qin"><input type="number" step="0.5" inputmode="decimal" data-f="ccurve" data-c="'+c.id+'" value="'+(c.curve||'')+'" placeholder="0" aria-label="Class curve in points"><em>pts</em></span></label>'
    +'<span class="qf"><span class="ql">Round final %</span><span class="qseg">'+opt('none','Off')+opt('whole','Nearest')+opt('ceil','Up')+'</span></span>'
    +(c.pooled?'':'<button type="button" class="qmore" data-act="reqadd" data-c="'+c.id+'">＋ Must-pass minimum</button>')+'</div>'
    +reqs+'<div id="rwarn">'+warnHtml(c)+'</div></section>';
}
function catEdit(c,k,ki){
  const base='data-c="'+c.id+'" data-k="'+ki+'"', r=k.rule||'avg';
  const del='<button type="button" class="btn danger sm" data-act="delcat" '+base+'>Delete category</button>';
  if(c.pooled) return '<div class="catedit">'+del+'</div>';
  const op=(v,l)=>'<option value="'+v+'"'+(r===v?' selected':'')+'>'+l+'</option>';
  let extra='';
  if(r==='avg'||r==='sum') extra='<label>Drop lowest <input type="number" min="0" step="1" data-f="catdrop" '+base+' value="'+(k.drop||0)+'"></label><label class="chk"><input type="checkbox" data-f="catrp" '+base+(k.rp?' checked':'')+'> Allow items to replace the lowest</label>';
  else if(r==='best') extra='<label>Count the best <input type="number" min="1" step="1" data-f="catn" '+base+' value="'+(k.n||1)+'"> of '+k.items.length+'</label>';
  else if(r==='cap') extra='<label>Full credit at <input type="number" min="1" step="any" data-f="catcap" '+base+' value="'+(Math.round((k.cap||0.8)*1000)/10)+'"> % of points</label>';
  else if(r==='swap') extra='<span class="hint">Mark items “Optional” below. They replace your lowest regular score when higher.</span>';
  return '<div class="catedit"><label>Scoring <select data-f="catrule" '+base+'>'+op('avg','Average of scores')+op('sum','Total points')+op('best','Only the best N count')+op('cap','Capped points')+op('swap','Optional items replace lowest')+'</select></label>'+extra+del+'</div>';
}
/* ---------- live color painting (no re-render) ---------- */
function paintColors(){
  document.querySelectorAll('.cpage[data-id]').forEach(function(p){ const id=p.dataset.id; if(!COLORS[id]) return; p.style.setProperty('--c',COLORS[id]); p.style.setProperty('--fg',TILE[id]);
    p.querySelectorAll('.cc button').forEach(function(b){ const on=b.dataset.v.toLowerCase()===COLORS[id].toLowerCase(); b.classList.toggle('on',on); b.setAttribute('aria-pressed',on?'true':'false'); }); });
  document.querySelectorAll('.tw[data-id]').forEach(function(w){ const id=w.dataset.id, t=w.querySelector('.tile'); if(t&&COLORS[id]){ t.style.setProperty('--c',COLORS[id]); t.style.setProperty('--fg',TILE[id]); } });
  document.querySelectorAll('[data-cid]').forEach(function(d){ const id=d.dataset.cid; if(COLORS[id]) d.style.background=COLORS[id]; });
}
/* ---------- accent picker ---------- */
(function(){
  const btn=document.getElementById('accBtn'); const pop=document.createElement('div'); pop.className='pop'; pop.id='accPop'; pop.setAttribute('role','dialog'); pop.setAttribute('aria-label','Accent colors'); document.body.appendChild(pop);
  const eq=(a,b)=>a&&b&&a.toLowerCase()===b.toLowerCase();
  const sw=(list,cur,kind,id,big)=>'<div class="sw'+(big?' big':'')+'">'+list.map(c=>'<button type="button" style="--c:'+c+'" class="'+(eq(c,cur)?'on':'')+'" data-k="'+kind+'" data-id="'+(id||'')+'" data-v="'+c+'" aria-label="'+c+'" aria-pressed="'+(eq(c,cur)?'true':'false')+'"></button>').join('')+'</div>';
  const same=p=>ACC.preset===p.n||(p.n==='Classic'&&!ACC.preset&&!ACC.main&&!Object.keys(ACC.cls).length);
  function build(){
    pop.innerHTML='<h4>Style</h4><div class="pre">'+PRESETS.map((p,i)=>'<button type="button" data-k="pre" data-i="'+i+'" class="'+(same(p)?'on':'')+'"><span class="strip"><i style="background:'+(p.main||MAINS[0])+'"></i>'+Object.keys(COLORS0).map(id=>'<i style="background:'+(p.cls[id]||COLORS0[id])+'"></i>').join('')+'</span><b>'+p.n+'</b></button>').join('')+'</div>'
      +'<h4>Main color</h4>'+sw(MAINS,ACC.main||MAINS[0],'main','',true)
      +'<p class="pophint">To recolor one class, open it and pick a color at the top.</p>';
  }
  function set(open){ if(open) build(); pop.classList.toggle('open',open); btn.setAttribute('aria-expanded',open); }
  btn.addEventListener('click',function(ev){ ev.stopPropagation(); set(!pop.classList.contains('open')); });
  document.addEventListener('click',function(ev){ if(pop.classList.contains('open')&&!pop.contains(ev.target)) set(false); });
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'&&pop.classList.contains('open')){ set(false); btn.focus(); } });
  document.addEventListener('click',function(ev){
    const b=ev.target.closest('.cc button'); if(!b) return;
    ACC.cls[b.dataset.id]=b.dataset.v; delete ACC.preset; saveAcc(); applyAcc(); paintColors();
  });
  pop.addEventListener('click',function(ev){
    ev.stopPropagation();
    const b=ev.target.closest('button'); if(!b) return; const k=b.dataset.k;
    if(k==='main'){ ACC.main=b.dataset.v; delete ACC.preset; }
    else if(k==='pre'){ const p=PRESETS[+b.dataset.i]; ACC={main:p.main,cls:{},preset:p.n}; const cols=Object.keys(p.cls).map(id=>p.cls[id]); if(cols.length) S.courses.forEach((c,i)=>{ ACC.cls[c.id]=cols[i%cols.length]; }); }
    else return;
    saveAcc(); applyAcc(); build(); paintColors();
  });
})();
/* ---------- theme ---------- */
(function(){
  const root=document.documentElement, btn=document.getElementById('themeBtn'), mq=matchMedia('(prefers-color-scheme:dark)');
  const cur=()=>root.dataset.theme||(mq.matches?'dark':'light');
  function sync(){ if(!root.dataset.theme) root.dataset.theme=cur(); btn.setAttribute('aria-pressed',cur()==='dark'); const m=document.querySelector('meta[name=theme-color]'); if(m) m.content=cur()==='dark'?'#000000':'#1B3FD1'; }
  sync();
  btn.addEventListener('click',function(){
    const n=cur()==='dark'?'light':'dark';
    root.classList.add('theming'); root.dataset.theme=n;
    try{localStorage.setItem('pitt-theme',n)}catch(e){}
    sync(); setTimeout(()=>root.classList.remove('theming'),500);
  });
})();
document.addEventListener('click',function(ev){
  const b=ev.target.closest('[data-act]'); if(!b) return;
  const a=b.dataset.act;
  if(a==='mday'){ const c=getC(b.dataset.c), m=c&&c.meets[+b.dataset.mi]; if(m){ const d=+b.dataset.d; m.days=m.days.includes(d)?m.days.filter(x=>x!==d):m.days.concat(d).sort((x,y)=>x-y); save(); render(true); } return; }
  if(a==='madd'){ const c=getC(b.dataset.c); if(c){ c.meets.push(normMeet({})); save(); render(true); } return; }
  if(a==='mdel'){ const c=getC(b.dataset.c); if(c){ c.meets.splice(+b.dataset.mi,1); save(); render(true); } return; }
  if(a==='calday'){ calDay=b.dataset.d; calRedraw(); return; }
  if(a==='calwk'){ const w=b.dataset.w; if(w==='prev'){ calWk=addD(calWk,-7); if(calDay) calDay=addD(calDay,-7); } else if(w==='next'){ calWk=addD(calWk,7); if(calDay) calDay=addD(calDay,7); } else if(w==='today'){ calWk=null; calDay=null; } else { calWk=w; calDay=null; } calRedraw(); return; }
  if(a==='evnew'){ const r=b.getBoundingClientRect(), mins=Math.round((((ev.clientY-r.top)/r.height)*(+b.dataset.hrs)*60+(+b.dataset.h0)*60)/30)*30; evModal({date:b.dataset.date,st:minT(mins),en:minT(mins+60)}); return; }
  if(a==='wiopen'){ const c=getC(b.dataset.c); if(c) wiOpen(c,b.dataset.k!=null?+b.dataset.k:-1,b.dataset.i!=null?+b.dataset.i:-1); return; }
  if(a==='secnew'){ const c=getC(b.dataset.c); if(c) secModal(c); return; }
  if(a==='catopts'){ const key=b.dataset.c+':'+b.dataset.k; if(openCats.has(key)) openCats.delete(key); else openCats.add(key); render(true); return; }
  if(a==='cround'){ const c=getC(b.dataset.c); if(c){ c.round=b.dataset.m; save(); render(true); } return; }
  if(a==='reqadd'){ const c=getC(b.dataset.c); if(c){ c.reqs.push({cat:Math.max(0,c.cats.length-1),min:60,cap:CAPL(c).includes('D')?'D':CAPL(c)[0]}); save(); render(true); } return; }
  if(a==='reqdel'){ const c=getC(b.dataset.c); if(c){ c.reqs.splice(+b.dataset.q,1); save(); render(true); } return; }
  if(a==='qdropn'||a==='qbestn'||a==='qhin'){ const c=getC(b.dataset.c), k=c&&c.cats[+b.dataset.k]; if(!k) return; const real=k.items.filter(i=>!i.opt).length, d=+b.dataset.d;
    if(a==='qdropn') k.drop=Math.max(0,Math.min(Math.max(0,real-1-(k.dropHi||0)),(k.drop||0)+d));
    else if(a==='qhin') k.dropHi=Math.max(0,Math.min(Math.max(0,real-1-(k.drop||0)),(k.dropHi||0)+d));
    else k.n=Math.max(1,Math.min(real,(k.n||real)+d)); save(); render(true); return; }
  if(a==='tourplay'){ tourOpen(); return; }
  if(a==='setupplay'){ setupOpen(); return; }
  if(a==='setupai'){ setupOpen('ai'); return; }
  if(a==='setupcanvas'){ setupOpen('canvas'); return; }
  if(a==='clsopen'){ classModal(b.dataset.id,b.dataset.d); return; }
  if(a==='skipwk'){ const o=b.dataset.k==='e'?(S.events||[]).find(x=>x.id===b.dataset.id):getC(b.dataset.id); if(o){ o.skip=o.skip||[]; if(!o.skip.includes(calWk)) o.skip.push(calWk); save(); closeModal(); calRedraw(); } return; }
  if(a==='unskip'){ const o=b.dataset.k==='e'?(S.events||[]).find(x=>x.id===b.dataset.id):getC(b.dataset.id); if(o){ o.skip=(o.skip||[]).filter(w=>w!==b.dataset.w); save(); const ch=b.closest('.skc'); if(ch) ch.remove(); calRedraw(); } return; }
  if(a==='calrestore'){ S.courses.forEach(c=>{ c.skip=(c.skip||[]).filter(w=>w!==calWk); }); (S.events||[]).forEach(e=>{ e.skip=(e.skip||[]).filter(w=>w!==calWk); }); save(); calRedraw(); return; }
  if(a==='offadd'){ offModal({start:b.dataset.date||calWk||TODAY}); return; }
  if(a==='offedit'){ const o=(S.off||[]).find(x=>x.id===b.dataset.id); if(o) offModal(o,true); return; }
  if(a==='offdel'){ doDel('Removed day off',function(){ S.off=(S.off||[]).filter(x=>x.id!==b.dataset.id); closeModal(); save(); calRedraw(); }); return; }
  if(a==='offus'){ addUSHolidays(); return; }
  if(a==='evadd'){ evModal({date:b.dataset.date||calWk||TODAY}); return; }
  if(a==='evedit'){ const e=(S.events||[]).find(x=>x.id===b.dataset.id); if(e) evModal(e,true); return; }
  if(a==='evdel'){ doDel('Deleted event',function(){ S.events=(S.events||[]).filter(x=>x.id!==b.dataset.id); closeModal(); save(); calRedraw(); }); return; }
  if(a==='go'){ view=b.dataset.v; if(view==='cal') calWk=null; wipeArmed=false; editing=false; reorder=false; setHash(); render(); window.scrollTo(0,0); return; }
  if(a==='jump'){ view='home'; wipeArmed=false; setHash(); render(); const el=document.getElementById(b.dataset.t); if(el&&el.classList.contains('col')){ delete LAY.col[el.dataset.sec]; saveLay(); el.classList.remove('col'); } if(el) el.scrollIntoView(); else window.scrollTo(0,0); return; }
  if(a==='sectoggle'){ const id=b.dataset.s; LAY.col[id]=!LAY.col[id]; saveLay(); b.closest('.hsec').classList.toggle('col',!!LAY.col[id]); b.setAttribute('aria-expanded',String(!LAY.col[id])); return; }
  if(a==='syncconnect'){
    const repo=($('#syncRepo').value||'').trim(), tok=($('#syncTok').value||'').trim(), m=$('#syncmsg');
    if(!/^[\w.-]+\/[\w.-]+$/.test(repo)){ if(m) m.textContent='Enter the repo as your-username/repo-name.'; return; }
    if(tok.length<20){ if(m) m.textContent='Paste the fine-grained token from GitHub.'; return; }
    setSyncCfg({repo:repo,token:tok,path:'grade-tracker-data.json',synced:false}); render(true); syncNow(); return;
  }
  if(a==='syncnow'){ syncNow(); return; }
  if(a==='syncoff'){ if(confirm('Disconnect sync on this device? Your grades stay here and in the cloud copy.')){ setSyncCfg(null); render(true); } return; }
  if(a==='reorder'){ reorder=!reorder; render(true); return; }
  if(a==='classmove'){
    const i=S.courses.findIndex(x=>x.id===b.dataset.c), j=i+(+b.dataset.d); if(i<0||j<0||j>=S.courses.length) return;
    const before={}; document.querySelectorAll('.tw').forEach(e=>{ before[e.dataset.id]=e.getBoundingClientRect(); });
    const t=S.courses[i]; S.courses[i]=S.courses[j]; S.courses[j]=t; save(); render(true);
    if(!REDUCED) document.querySelectorAll('.tw').forEach(e=>{ const o=before[e.dataset.id]; if(!o) return; const n=e.getBoundingClientRect(); const dx=o.left-n.left, dy=o.top-n.top; if(dx||dy) e.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.7,.2,1)'}); });
    return;
  }
  if(a==='dismissbanner'){ LAY.bn=true; saveLay(); const bn=b.closest('.banner'); if(bn){ bn.classList.add('gone'); setTimeout(function(){ render(true); },320); } else render(true); return; }
  if(a==='secmove'){ moveSec(b.dataset.s,+b.dataset.d); return; }
  const c=b.dataset.c?getC(b.dataset.c):null;
  if(a==='add'){ c.cats[+b.dataset.k].items.push(I('New item',(c.pooled?5:100))); save(); render(true); }
  else if(a==='addopt'){ c.cats[+b.dataset.k].items.push(I('Case study',100,null,'',true)); save(); render(true); }
  else if(a==='goal'){ c.target=b.dataset.l; save(); refresh(); }
  else if(a==='newclass'){ newClassModal(); }
  else if(a==='edit'){ editing=!editing; render(true); }
  else if(a==='addcat'){ c.cats.push({name:'New category',w:c.pooled?0:Math.max(0,100-c.cats.reduce((t,k)=>t+(k.w||0),0)),rule:'avg',items:[I('Item 1',c.pooled?10:100)]}); save(); render(true); }
  else if(a==='delcat'){
    const k=c.cats[+b.dataset.k];
    if(c.cats.length<2){ alert('A class needs at least one category.'); return; }
    { doDel('Deleted “'+k.name+'”',function(){ const di=+b.dataset.k; c.cats.splice(di,1); c.reqs=(c.reqs||[]).filter(q=>q.cat!==di).map(q=>({cat:q.cat>di?q.cat-1:q.cat,min:q.min,cap:q.cap})); if(c.ec.cat!=null){ if(c.ec.cat===di) c.ec.cat=null; else if(c.ec.cat>di) c.ec.cat--; } save(); render(true); }); }
  }
  else if(a==='delclass'){
    doDel('Deleted “'+c.name+'”',function(){ S.courses=S.courses.filter(x=>x.id!==c.id); delete S.gpaPick[c.id]; editing=false; view='home'; save(); setHash(); render(); window.scrollTo(0,0); });
  }
  else if(a==='rp'||a==='optflag'){ const it=c.cats[+b.dataset.k].items[+b.dataset.i]; if(a==='rp') it.rp=!it.rp; else it.opt=!it.opt; save(); render(true); }
  else if(a==='copyprompt'){
    const ta=document.getElementById('aiPrompt'); const done=()=>{ b.textContent='Copied'; setTimeout(function(){ b.textContent='Copy prompt'; },1600); };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(AI_PROMPT).then(done,function(){ ta.select(); document.execCommand('copy'); done(); });
    else { ta.select(); document.execCommand('copy'); done(); }
  }
  else if(a==='mvopen'){ mvOpen(c,+b.dataset.k,+b.dataset.i,b); }
  else if(a==='del'){ const it=c.cats[+b.dataset.k].items[+b.dataset.i]; doDel('Removed “'+(it&&it.n||'item')+'”',function(){ c.cats[+b.dataset.k].items.splice(+b.dataset.i,1); save(); render(true); }); }
  else if(a==='download'){
    const json=JSON.stringify(W,null,2), name='tally-'+TODAY+'.json';
    let file=null; try{ file=new File([json],name,{type:'application/json'}); }catch(e){}
    if(file&&navigator.canShare&&navigator.canShare({files:[file]})){ navigator.share({files:[file],title:'Tally backup'}).catch(function(){}); }
    else { const blob=new Blob([json],{type:'application/json'}); const u=URL.createObjectURL(blob); const l=document.createElement('a'); l.href=u; l.download=name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function(){URL.revokeObjectURL(u);},1000); }
    setStat('Backup saved','ok');
  }
  else if(a==='export'){ $('#bk').value=JSON.stringify(W); $('#bkmsg').textContent='Copy all of that text and keep it somewhere safe.'; }
  else if(a==='import'){
    try{ const v=JSON.parse($('#bk').value); if(!okFile(v)) throw new Error('x'); importFile(v); }
    catch(e){ $('#bkmsg').textContent='That text isn’t a valid backup. Paste the full text you copied earlier.'; }
  }
  else if(a==='wipe'){
    doDel('Cleared every score in this semester',function(){ S.courses.forEach(x=>{ x.cats.forEach(k=>k.items.forEach(it=>{it.e=null;it.w=null;})); if(x.ec){ x.ec.pts.e=x.ec.pts.w=x.ec.pct.e=x.ec.pct.w=null; } }); save(); render(); });
  }
});

document.addEventListener('change',function(ev){
  const t=ev.target; if(!(t&&(t.id==='bkfile'||t.id==='bkfile2')&&t.files&&t.files[0])) return;
  const r=new FileReader();
  r.onload=function(){ try{ const v=JSON.parse(r.result); if(!okFile(v)) throw new Error('x'); importFile(v); }catch(e){ const m=$('#bkmsg'); if(m) m.textContent='That file isn’t a valid grade file.'; alert('That file isn’t a valid grade file.'); } };
  r.readAsText(t.files[0]);
});

/* ---------- move an item to another section ---------- */
let mvEl=null;
function mvClose(){ if(mvEl){ const b=mvEl._btn; mvEl.remove(); mvEl=null; if(b&&document.contains(b)){ try{ b.focus({preventScroll:true}); }catch(e){} } } }
function mvDo(c,k,i,to){
  const from=c.cats[k], dest=c.cats[to]; if(!from||!dest||k===to) return;
  const it=from.items[i]; if(!it) return;
  doDel('Moved “'+(it.n||'item')+'” to '+dest.name,function(){
    from.items.splice(i,1); it.opt=false; it.rp=false; if(it.cid) it.mv=1; dest.items.push(it); save(); render(true);
  });
}
function mvOpen(c,k,i,btn){
  mvClose();
  const el=document.createElement('div'); el.className='mvpop'; el.setAttribute('role','menu'); el.setAttribute('aria-label','Move to section'); el._btn=btn;
  const it=c.cats[k].items[i];
  el.innerHTML='<h4>Move “'+esc(it.n||'item')+'” to</h4>'+c.cats.map(function(s,j){ return '<button type="button" role="menuitem" data-to="'+j+'"'+(j===k?' class="cur" aria-current="true"':'')+'><span>'+esc(s.name)+'</span>'+(j===k?'<em>here</em>':'<em>'+s.items.length+' item'+(s.items.length===1?'':'s')+'</em>')+'</button>'; }).join('');
  document.body.appendChild(el); mvEl=el;
  const r=btn.getBoundingClientRect(), w=el.offsetWidth, h=el.offsetHeight;
  el.style.left=Math.max(10,Math.min(innerWidth-w-10,r.left))+'px';
  el.style.top=Math.max(10,Math.min(innerHeight-h-10,(r.bottom+h+12>innerHeight)?r.top-h-6:r.bottom+6))+'px';
  el.addEventListener('click',function(ev){ const t=ev.target.closest('button[data-to]'); if(!t) return; const to=+t.dataset.to; el._btn=null; mvClose(); mvDo(c,k,i,to); });
  const first=el.querySelector('button:not(.cur)')||el.querySelector('button'); if(first) first.focus({preventScroll:true});
}
document.addEventListener('mousedown',function(ev){ if(mvEl&&!mvEl.contains(ev.target)&&!(ev.target.closest&&ev.target.closest('.mvb'))) mvClose(); });
document.addEventListener('keydown',function(ev){
  if(!mvEl) return;
  if(ev.key==='Escape'){ ev.preventDefault(); mvClose(); }
  else if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ ev.preventDefault(); const bs=[].slice.call(mvEl.querySelectorAll('button')), n=bs.indexOf(document.activeElement); bs[(n+(ev.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus(); }
},true);
/* drag the handle onto another section */
let mvDrag=null;
document.addEventListener('dragstart',function(ev){
  const b=ev.target.closest&&ev.target.closest('.mvb'); if(!b){ return; }
  mvDrag={c:b.dataset.c,k:+b.dataset.k,i:+b.dataset.i}; mvClose();
  try{ ev.dataTransfer.effectAllowed='move'; ev.dataTransfer.setData('text/plain','tally-item'); const row=b.closest('.grid'); if(row) ev.dataTransfer.setDragImage(row,20,18); }catch(e){}
  const row=b.closest('.grid'); if(row) setTimeout(function(){ row.classList.add('mvdrag'); },0);
  document.body.classList.add('mvdragging');
});
document.addEventListener('dragover',function(ev){
  if(!mvDrag) return; const sec=ev.target.closest&&ev.target.closest('section.cat'); if(!sec) return;
  ev.preventDefault(); try{ ev.dataTransfer.dropEffect='move'; }catch(e){}
  document.querySelectorAll('section.cat.mvover').forEach(function(x){ if(x!==sec) x.classList.remove('mvover'); }); sec.classList.add('mvover');
});
function mvEnd(){ mvDrag=null; document.body.classList.remove('mvdragging'); document.querySelectorAll('.mvover,.mvdrag').forEach(function(x){ x.classList.remove('mvover','mvdrag'); }); }
document.addEventListener('dragend',mvEnd);
document.addEventListener('drop',function(ev){
  if(!mvDrag) return; const sec=ev.target.closest&&ev.target.closest('section.cat'); if(!sec){ mvEnd(); return; }
  ev.preventDefault(); const d=mvDrag, secs=[].slice.call(document.querySelectorAll('section.cat')), to=secs.indexOf(sec); mvEnd();
  const c=S.courses.find(function(x){ return x.id===d.c; }); if(c&&to>=0) mvDo(c,d.k,d.i,to);
});
