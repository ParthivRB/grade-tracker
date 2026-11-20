"use strict";
/* ---------- Canvas: the browser extension hands readings to Tally; this file shows them ---------- */
const CV_KEY='tally-canvas';
const CV_ZIP='tally-canvas-extension.zip';
function cvCfg(){ try{ const c=JSON.parse(localStorage.getItem(CV_KEY)||'null'); return (c&&typeof c==='object')?c:null; }catch(e){ return null; } }
function cvSave(c){ try{ if(c) localStorage.setItem(CV_KEY,JSON.stringify(c)); else localStorage.removeItem(CV_KEY); }catch(e){} }
const cvAgo=function(t){ if(!t) return 'never'; const m=Math.round((Date.now()-t)/60000); return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' days ago'; };

/* ---------- talking to the extension ---------- */
let cvExt=false, cvPending=null;
function cvPing(){ try{ window.postMessage({tallyExt:'ping'},location.origin); }catch(e){} }
window.addEventListener('message',function(e){
  if(e.source!==window||e.origin!==location.origin) return;
  const d=e.data; if(!d||typeof d!=='object') return;
  if(d.tallyExt==='pong'){ cvExt=true; const el=document.getElementById('cvState'); if(el) cvStateText(el); }
  else if(d.tallyExt==='canvas') canvasIngest(d);
  else if(d.tallyExt==='prog') cvProg(d);
});

/* ---------- the connect step (inside setup) ---------- */
/* live progress pill while the extension reads Canvas */
let cvProgT=null;
function cvProg(d){
  const st=d.state; if(st!=='start'&&st!=='run'&&st!=='done'&&st!=='fail') return;
  const c=cvCfg(); if(c&&c.off) return;
  let el=document.getElementById('cvProg');
  if(!el){
    el=document.createElement('div'); el.id='cvProg'; el.className='cvprog'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite');
    el.innerHTML='<b class="cvpt"></b><span class="cvpm"></span><i class="cvpb"><u></u></i>';
    document.body.appendChild(el); void el.offsetWidth;
  }
  const n=+d.n||0, i=+d.i||0, t=el.querySelector('.cvpt'), m=el.querySelector('.cvpm'), u=el.querySelector('u');
  el.classList.add('in'); el.classList.toggle('ok',st==='done'); el.classList.toggle('bad',st==='fail'); el.classList.toggle('ind',st==='start'||(st==='run'&&!n));
  if(st==='start'){ t.textContent='Syncing with Canvas'; m.textContent='Finding your classes…'; u.style.width='30%'; }
  else if(st==='run'){ t.textContent='Syncing with Canvas'; m.textContent='Class '+(i+1)+' of '+n+(d.name?' · '+d.name:''); u.style.width=Math.round((i+1)/n*100)+'%'; }
  else if(st==='done'){ t.textContent='Canvas synced'; m.textContent=n?(n+' class'+(n===1?'':'es')+' read'):'Done'; u.style.width='100%'; }
  else { t.textContent='Sync did not finish'; m.textContent='Reload your Canvas page and try again.'; }
  clearTimeout(cvProgT);
  cvProgT=setTimeout(function(){ el.classList.remove('in'); setTimeout(function(){ if(!el.classList.contains('in')) el.remove(); },350); },st==='done'?2200:st==='fail'?6000:25000);
}
function cvStateText(el){
  const cfg=cvCfg();
  el.innerHTML='<i></i><span>'+(cvExt?(cfg&&!cfg.off?'Extension connected. Open your Canvas and click its icon to refresh.':'Extension found. Open your Canvas, click the Tally icon, then press Sync with Tally.'):'Waiting for the extension…')+'</span>';
  el.classList.toggle('ok',cvExt);
}
function canvasStepHtml(){
  const cfg=cvCfg();
  if(cfg&&!cfg.off) return '<span class="tk">Canvas</span><h2>Canvas is connected.</h2>'
    +'<p class="slead">Tally is reading <b>'+esc(cfg.host||'your Canvas')+'</b> through the browser extension. Last update '+esc(cvAgo(cfg.last))+'. Visiting Canvas refreshes your grades automatically.</p>'
    +'<p class="slead" style="font-size:13.5px">New grades and assignments always ask for your approval first. Nothing changes until you tap Approve.</p>'
    +'<div class="cvwait" id="cvState"></div>'
    +'<div class="cvconn"><button type="button" class="btn danger" data-s="cvoff">Disconnect</button></div>';
  return '<span class="tk">Step 3 · Canvas</span><h2>Connect Canvas with the Tally extension.</h2>'
    +'<p class="slead">The extension reads your classes, sections, weights and grades from your own signed-in Canvas and keeps them up to date. No token, no password, and nothing leaves your browser. Works in Chrome, Edge, Brave and Arc on a computer.</p>'
    +'<ol class="ssteps">'
    +'<li><span class="sn">1</span><div><b>Download the extension</b><small>Unzip it somewhere you will keep it.</small></div><a class="btn pri sm" href="'+CV_ZIP+'" download>Download</a></li>'
    +'<li><span class="sn">2</span><div><b>Add it to your browser</b><small>Open <span class="cvcode">chrome://extensions</span>, turn on Developer mode, click Load unpacked, and choose the unzipped folder.</small></div><button type="button" class="btn sm" data-s="cvext">Copy address</button></li>'
    +'<li><span class="sn">3</span><div><b>Sync from Canvas</b><small>Open your Canvas, click the Tally icon in the toolbar, and press Sync with Tally. Your classes show up here.</small></div></li></ol>'
    +'<div class="cvwait" id="cvState"></div>'
    +'<details class="cvmore"><summary>Why an extension?</summary><p>Canvas does not let websites read it directly, to protect your data. An extension runs inside your Canvas tab, as you, so it can. It only reads your own classes and grades, and only sends them to Tally in your browser.</p></details>';
}
function canvasStepWire(body,ctl){
  const st=body.querySelector('#cvState'); if(st){ cvStateText(st); cvPing(); const t=setInterval(function(){ if(!document.body.contains(st)){ clearInterval(t); return; } if(!cvExt) cvPing(); },1500); }
  const auto=body.querySelector('#cvAuto');
  if(auto) auto.addEventListener('change',function(){ const c=cvCfg(); if(c){ c.auto=auto.checked; cvSave(c); } });
  body.querySelectorAll('[data-s=cvoff]').forEach(function(b){ b.addEventListener('click',function(){ if(confirm('Disconnect Canvas on this device? Your classes and grades stay in Tally. Updates from the extension will be ignored until you connect again.')){ const c=cvCfg()||{}; cvSave({off:true,id:c.id}); ctl.refresh(); } }); });
  body.querySelectorAll('[data-s=cvext]').forEach(function(b){ b.addEventListener('click',function(){ const done=function(){ b.textContent='Copied ✓'; setTimeout(function(){ b.textContent='Copy address'; },2000); }; if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText('chrome://extensions').then(done,function(){ fallbackCopy('chrome://extensions'); done(); }); else { fallbackCopy('chrome://extensions'); done(); } }); });
}

/* ---------- review sheet ---------- */
function canvasReview(p,opts){
  opts=opts||{};
  if(typeof tourClose==='function') tourClose(true);
  const old=document.getElementById('cvOv'); if(old) old.remove();
  const host=p.host||'Canvas';
  const used=new Set(), fresh=!S.courses.length;
  const rows=p.courses.map(function(pc,i){
    const sug=canvasSuggest(S.courses,pc,host,used), real=pc.groups.some(function(g){ return g.items.some(cvUsable); });
    return {pc:pc,sel:sug||'new',on:fresh?real:(!!sug&&real),i:i,empty:!real};
  });
  const matched=rows.filter(function(r){ return r.sel!=='new'; }).length;
  const ov=document.createElement('div'); ov.className='wio cvov'; ov.id='cvOv';
  const rel=trapFocus(ov);
  function line(r){
    const ex=r.sel==='new'?null:S.courses.find(function(c){ return c.id===r.sel; });
    const st=canvasPreview(ex,r.pc,host);
    const secs=r.pc.groups.filter(function(g){ return g.items.some(cvUsable); });
    if(r.empty) return '<div class="cvs">No graded work in Canvas yet</div>';
    if(!ex){
      const warn=(r.pc.cs!=null&&st.assignments>0&&st.graded===0)?'<div class="cvwarn">Canvas shows a grade for this class, but Tally could not read any individual scores. Your school may hide them. Tell support using the extension’s “Copy a report” button.</div>':'';
      return warn+'<div class="cvs">'+st.sections+' section'+(st.sections===1?'':'s')+' · '+st.assignments+' assignment'+(st.assignments===1?'':'s')+(st.graded?' · <b>'+st.graded+' grade'+(st.graded===1?'':'s')+' already posted</b>':'')+'</div>'
        +'<div class="cvchips">'+secs.slice(0,8).map(function(g){ return '<span>'+esc(g.name)+(r.pc.weighted&&g.w?' <em>'+trim(String(g.w))+'%</em>':'')+'</span>'; }).join('')+'</div>';
    }
    const bits=[]; if(st.items) bits.push('+'+st.items+' new assignment'+(st.items===1?'':'s')); if(st.cats) bits.push('+'+st.cats+' new section'+(st.cats===1?'':'s')); if(st.scores) bits.push(st.scores+' new grade'+(st.scores===1?'':'s')); if(st.upd) bits.push(st.upd+' updated');
    return '<div class="cvs">'+(bits.length?bits.join(' · '):'Already up to date')+'</div>';
  }
  const cfg0=cvCfg(); let autoOn=cfg0&&!cfg0.off?!!cfg0.auto:true;
  function draw(){
    const n=rows.filter(function(r){ return r.on; }).length;
    ov.innerHTML='<div class="cvc" role="dialog" aria-modal="true" aria-label="Import from Canvas"><div class="cvh"><div><h3>Found '+p.courses.length+' class'+(p.courses.length===1?'':'es')+' in Canvas</h3><small>'+(fresh?'Adding to <b>'+esc(S.name)+'</b>.':'Matched <b>'+matched+' of '+p.courses.length+'</b> to your existing classes. The rest are unchecked: tick only the ones you want added to <b>'+esc(S.name)+'</b>.')+'</small></div><button type="button" class="rgx" data-cv="x" aria-label="Close">×</button></div>'
      +'<div class="cvlist">'+rows.map(function(r){
        const ex=S.courses.filter(function(c){ return !c.cv||c.id===r.sel||(c.cv&&c.cv.id===r.pc.id); });
        return '<div class="cvr'+(r.on?'':' cvoff')+(r.empty?' empty':'')+'" style="--d:'+(r.i*50)+'ms"><label class="cvt"><input type="checkbox" class="swi" data-cv="on" data-i="'+r.i+'"'+(r.on?' checked':'')+'><i></i><span><b>'+esc(r.pc.name)+'</b><small>'+esc(r.pc.code)+(r.pc.term?' · '+esc(r.pc.term):'')+(r.pc.cs!=null?' · Canvas shows '+trim(String(Math.round(r.pc.cs*100)/100))+'%'+(r.pc.cg?' ('+esc(r.pc.cg)+')':''):'')+'</small></span></label>'
          +'<select data-cv="sel" data-i="'+r.i+'" aria-label="Where to put '+esc(r.pc.name)+'"><option value="new"'+(r.sel==='new'?' selected':'')+'>Create a new class</option>'+ex.map(function(c){ return '<option value="'+c.id+'"'+(r.sel===c.id?' selected':'')+'>Update “'+esc(c.name)+'”</option>'; }).join('')+'</select>'
          +line(r)+'</div>';
      }).join('')+'</div>'
      +''
      +'<div class="cva"><button type="button" class="wbtn ghost" data-cv="x">Cancel</button><button type="button" class="wbtn" data-cv="go"'+(n?'':' disabled')+'>Import '+n+' class'+(n===1?'':'es')+'</button></div></div>';
  }
  function close(skipped){
    ov.classList.remove('open'); document.removeEventListener('keydown',kd,true); rel(); setTimeout(function(){ ov.remove(); },260);
    if(skipped&&opts.first&&!cvCfg()) cvSave({auto:false,host:host,last:opts.at||Date.now(),id:opts.id});
  }
  const kd=function(e){ if(e.key==='Escape'){ e.stopPropagation(); close(true); } };
  document.addEventListener('keydown',kd,true);
  ov.addEventListener('change',function(e){ const t=e.target; if(t.dataset.cv==='auto'){ autoOn=t.checked; return; } const r=rows[+t.dataset.i]; if(!r) return; if(t.dataset.cv==='on') r.on=t.checked; else if(t.dataset.cv==='sel') r.sel=t.value; draw(); });
  ov.addEventListener('click',function(e){
    if(e.target===ov){ close(true); return; }
    const b=e.target.closest('[data-cv]'); if(!b||b.tagName==='INPUT'||b.tagName==='SELECT') return;
    if(b.dataset.cv==='x') close(true);
    else if(b.dataset.cv==='go'){
      const c=cvCfg(); const next=Object.assign({},c&&!c.off?c:{},{auto:autoOn,host:host,last:opts.at||Date.now()}); if(opts.id) next.id=opts.id; delete next.off; cvSave(next);
      canvasApply(rows.filter(function(r){ return r.on; }),host); close(false);
    }
  });
  document.body.appendChild(ov); draw(); requestAnimationFrame(function(){ ov.classList.add('open'); });
}

function canvasApply(rows,host){
  const sn=JSON.stringify(W), v0=view; let made=0, linked=0, scores=0;
  rows.forEach(function(r){
    let c=r.sel==='new'?null:S.courses.find(function(x){ return x.id===r.sel; });
    const isNew=!c;
    if(!c) c=normCourse({name:r.pc.name,code:r.pc.code,prof:r.pc.prof,credits:null,scale:'std',cats:[]});
    const st=canvasMerge(c,r.pc,host);
    if(isNew){ c.color=nextColor(); S.courses.push(c); syncColors(); made++; } else linked++;
    scores+=st.scores;
  });
  view='home'; editing=false; save(); setHash(); render(); window.scrollTo(0,0);
  const msg=(made?made+' new class'+(made===1?'':'es'):'')+(made&&linked?' + ':'')+(linked?linked+' updated':'');
  cvLog('Imported: '+msg+(scores?' · '+scores+' grade'+(scores===1?'':'s'):''),'imp');
  showUndo('Imported from Canvas: '+msg+(scores?' · '+scores+' grade'+(scores===1?'':'s')+' filled in':''),sn,v0,true);
}

/* ---------- a new reading arrives ---------- */
function cvToast(msg,label,fn){
  let el=document.getElementById('undoBar'); if(el) el.remove();
  el=document.createElement('div'); el.id='undoBar'; el.className='undobar'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite');
  el.innerHTML='<span>'+esc(msg)+'</span><button type="button">'+esc(label)+'</button><i class="uprog"></i>';
  document.body.appendChild(el); requestAnimationFrame(function(){ el.classList.add('in'); });
  const hide=function(){ el.classList.remove('in'); setTimeout(function(){ el.remove(); },300); };
  const t=setTimeout(hide,12000);
  el.querySelector('button').addEventListener('click',function(){ clearTimeout(t); hide(); fn(); });
}
const cvIdle=function(){ const a=document.activeElement; return !document.querySelector('.modal,.wio,.tour,.tpop,.dpop')&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
/* every change from Canvas waits for a tap on Approve; each step is written to a small activity log */
const CVLOG_KEY='tally-canvas-log';
function cvLogGet(){ try{ const a=JSON.parse(localStorage.getItem(CVLOG_KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function cvLog(msg,kind){ try{ const a=cvLogGet(); if(a[0]&&a[0].m===msg&&a[0].k===kind&&Date.now()-a[0].t<6*3600*1000) return; a.unshift({t:Date.now(),k:kind||'info',m:msg}); localStorage.setItem(CVLOG_KEY,JSON.stringify(a.slice(0,200))); }catch(e){} }
function cvBits(st){ const b=[]; if(st.scores) b.push(st.scores+' new grade'+(st.scores===1?'':'s')); if(st.items) b.push(st.items+' new assignment'+(st.items===1?'':'s')); if(st.cats) b.push(st.cats+' new section'+(st.cats===1?'':'s')); if(st.upd) b.push(st.upd+' changed'); return b; }
function cvAskClose(){ const el=document.getElementById('cvAsk'); if(el){ el.classList.remove('in'); setTimeout(function(){ el.remove(); },300); } }
function cvAsk(p,plan,any){
  let el=document.getElementById('cvAsk');
  if(!el){ el=document.createElement('div'); el.id='cvAsk'; el.className='cvask'; el.setAttribute('role','alertdialog'); el.setAttribute('aria-label','Canvas has updates'); document.body.appendChild(el); void el.offsetWidth; }
  const rows=plan.linked.filter(function(x){ return cvBits(x.stats).length; });
  el.innerHTML='<b class="cvat">Canvas has updates</b>'
    +'<ul class="cval">'+rows.slice(0,4).map(function(x){ return '<li><span>'+esc(x.course.name)+'</span><em>'+esc(cvBits(x.stats).join(' · '))+'</em></li>'; }).join('')+(rows.length>4?'<li><span>and '+(rows.length-4)+' more classes</span></li>':'')+'</ul>'
    +(plan.fresh.length?'<p class="cvan">'+plan.fresh.length+' new class'+(plan.fresh.length===1?'':'es')+' also showed up in Canvas.</p>':'')
    +'<div class="cvab">'+(any?'<button type="button" class="cvaok" data-q="ok">Approve</button>':'')+(plan.fresh.length?'<button type="button" data-q="new">New classes…</button>':'')+'<button type="button" class="ghost" data-q="no">Not now</button></div>';
  requestAnimationFrame(function(){ el.classList.add('in'); });
  el.onclick=function(ev){
    const b=ev.target.closest('[data-q]'); if(!b) return; const q=b.dataset.q;
    if(q==='ok'){
      const sn=JSON.stringify(W), v0=view, t=plan.totals; canvasSync(W.sems,p,false); save(); render(true);
      const msg=cvBits(t).join(' · '); cvLog('Approved: '+msg,'ok'); showUndo('Canvas updated: '+msg,sn,v0,true);
      if(!plan.fresh.length) cvAskClose(); else cvAsk(p,{linked:[],fresh:plan.fresh,totals:{items:0,scores:0,upd:0,cats:0}},0);
    }else if(q==='new'){ cvAskClose(); canvasReview({v:1,host:p.host,courses:plan.fresh}); }
    else{ cvLog('Dismissed an update from Canvas','no'); cvAskClose(); }
  };
}
function canvasIngest(d){
  const cfg=cvCfg(); if(cfg&&cfg.off) return;
  const linked=W.sems.some(function(se){ return se.courses.some(function(c){ return c.cv; }); });
  if(cfg&&linked&&cfg.id===d.id) return;
  const p=canvasClean(d.payload); if(!p) return;
  if(!cfg||!linked){ canvasReview(p,{first:true,id:d.id,at:d.at}); return; }
  cfg.id=d.id; cfg.last=d.at||Date.now(); cfg.host=p.host||cfg.host; cvSave(cfg);
  const plan=canvasSync(W.sems,p,true), t=plan.totals, any=t.items+t.scores+t.upd+t.cats;
  if(!any&&!plan.fresh.length) return;
  cvLog('Canvas has '+(any?cvBits(t).join(' · '):'')+(any&&plan.fresh.length?' and ':'')+(plan.fresh.length?plan.fresh.length+' new class'+(plan.fresh.length===1?'':'es'):'')+', waiting for approval','found');
  cvAsk(p,plan,any);
}
/* the hidden activity log */
function cvLogOpen(){
  const old=document.getElementById('cvLogOv'); if(old) old.remove();
  const ov=document.createElement('div'); ov.className='wio cvov'; ov.id='cvLogOv'; const rel=trapFocus(ov);
  const kinds={found:'Waiting',ok:'Approved',no:'Skipped',imp:'Imported',info:''};
  function draw(){
    const a=cvLogGet(), cfg=cvCfg();
    ov.innerHTML='<div class="cvc" role="dialog" aria-modal="true" aria-label="Canvas activity"><div class="cvh"><div><h3>Canvas activity</h3><small>'+(cfg&&!cfg.off?'Connected to <b>'+esc(cfg.host||'Canvas')+'</b> · last update '+esc(cvAgo(cfg.last)):'Not connected')+'. Kept on this device only.</small></div></div>'
      +'<div class="cvlist">'+(a.length?a.map(function(x){ return '<div class="cvlg"><span class="cvlk k-'+esc(x.k)+'">'+esc(kinds[x.k]||'Note')+'</span><b>'+esc(x.m)+'</b><small>'+esc(cvAgo(x.t))+'</small></div>'; }).join(''):'<div class="cvs" style="padding:18px 6px">Nothing yet. When Canvas has new grades or assignments, they show up here and in a small popup that waits for your approval.</div>')+'</div>'
      +'<div class="cva">'+(a.length?'<button type="button" class="wbtn ghost" data-lg="clear">Clear</button>':'')+'<button type="button" class="wbtn" data-lg="x">Done</button></div></div>';
  }
  function close(){ ov.classList.remove('open'); document.removeEventListener('keydown',kd,true); rel(); setTimeout(function(){ ov.remove(); },260); }
  const kd=function(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } };
  document.addEventListener('keydown',kd,true);
  ov.addEventListener('click',function(e){ if(e.target===ov){ close(); return; } const b=e.target.closest('[data-lg]'); if(!b) return; if(b.dataset.lg==='x') close(); else if(b.dataset.lg==='clear'){ try{ localStorage.removeItem(CVLOG_KEY); }catch(x){} draw(); } });
  document.body.appendChild(ov); draw(); requestAnimationFrame(function(){ ov.classList.add('open'); });
}
