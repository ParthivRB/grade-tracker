"use strict";
/* ---------- start ---------- */
/* ---------- first-run tour + setup wizard ---------- */
const TOUR_KEY='tally-tour-seen';
let tourEl=null, tourKey=null;
const ICON_CHECK='<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="22" fill="#0D1226"/><path class="ck" d="M21.5 33.5 29 41 43 25" fill="none" stroke="#FFB81C" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function tourShell(cls){
  tourClose(true);
  const el=document.createElement('div'); el.className='tour '+cls; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true');
  el.innerHTML='<div class="tbg" aria-hidden="true"><i></i><i></i><i></i></div><div class="tframe"></div>';
  document.body.appendChild(el); tourEl=el; el._rel=trapFocus(el); el.setAttribute('aria-label',cls==='tourv'?'Tally tour':'Set up Tally'); document.documentElement.classList.add('tour-lock');
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('open'); }); });
  return el.querySelector('.tframe');
}
function tourClose(now){
  const el=tourEl; if(!el) return; tourEl=null;
  if(tourKey){ document.removeEventListener('keydown',tourKey,true); tourKey=null; }
  document.documentElement.classList.remove('tour-lock'); if(el._rel&&!now) el._rel();
  if(now){ el.remove(); return; }
  el.classList.remove('open'); el.classList.add('closing'); setTimeout(function(){ el.remove(); },420);
}
const mkLetter=p=>{ const r=STD.find(x=>p+1e-9>=x[0]); return r?r[1]:'F'; };
const TOUR=[
  {k:'Welcome',t:'Meet Tally.',b:'Grades, what-ifs and your GPA in one calm place. No account and nothing to install. It just works, right here in your browser.',
   s:'<div class="st st1">'
     +'<div class="mk m1" style="--c:#7B5CFF;--fg:#fff"><b>Neuroscience</b><small>NROSCI 1000</small><span class="mL">A</span><em>94.2%</em><div class="mkbar"><i style="--w:72%"></i></div></div>'
     +'<div class="mk m2" style="--c:#19C3A5;--fg:#052A24"><b>Organic Chemistry</b><small>CHEM 0310</small><span class="mL">B+</span><em>88.1%</em><div class="mkbar"><i style="--w:55%"></i></div></div>'
     +'<div class="mk m3" style="--c:#FFC233;--fg:#33240A"><b>Statistics</b><small>STAT 1100</small><span class="mL">A-</span><em>91.0%</em><div class="mkbar"><i style="--w:64%"></i></div></div></div>'},
  {k:'Canvas',t:'Connect Canvas. Classes build themselves.',b:'Add the Tally browser extension once. It creates every class and section with the right weights, fills in grades that are already posted, and slots each new grade into the right section on its own.',
   s:'<div class="st st7"><div class="cvbr"><div class="cvbar"><span class="cvdots"><i></i><i></i><i></i></span><span class="cvurl">canvas.school.edu</span><span class="cvbm">Connect</span></div>'
     +'<div class="cvbody">'
     +[['Neuroscience','#7B5CFF','#fff',[['Homework','30%',3],['Exams','70%',1]]],['Organic Chemistry','#19C3A5','#052A24',[['Labs','25%',4],['Quizzes','15%',5],['Exams','60%',2]]],['Statistics','#FFC233','#33240A',[['Homework','40%',3],['Final','60%',0]]]].map(function(c,i){ return '<div class="cvk" style="--c:'+c[1]+';--fg:'+c[2]+';--i:'+i+'"><b>'+c[0]+'</b><div class="cvsec">'+c[3].map(function(s,j){ return '<span class="cvch" style="--j:'+j+'">'+s[0]+' <em>'+s[1]+'</em>'+(s[2]?'<u>'+(i===0&&j===0?'<s>3</s><s class="n4">4</s>':s[2])+'</u>':'')+'</span>'; }).join('')+'</div></div>'; }).join('')
     +'</div><div class="cvnew">HW 4 · 10/10</div></div></div>'},
  {k:'What-ifs',t:'See your grade before it happens.',b:'Drag the final exam score and watch the grade move. Every class has this, for every assignment.',
   s:'<div class="st st2"><div class="mk wide" style="--c:#4C92FF;--fg:#fff"><div class="mkh"><b>Organic Chemistry</b><small>What-if final grade</small></div>'
     +'<div class="mkg"><span class="mL" id="twL">B+</span><span class="mP" id="twP">87.9%</span></div>'
     +'<div class="mkr"><span>Final exam score</span><b id="twV">85%</b></div><input type="range" id="twR" min="40" max="100" value="85" aria-label="Final exam score">'
     +'<div class="mkticks"><span>40</span><span>70</span><span>100</span></div></div><p class="hint2"><span class="hand">↔</span> Drag the slider</p></div>',
   mount:function(sl){ const r=sl.querySelector('#twR'), L=sl.querySelector('#twL'), P=sl.querySelector('#twP'), V=sl.querySelector('#twV');
     const up=function(){ const v=+r.value, p=0.7*89.1+0.3*v, nl=mkLetter(p); V.textContent=v+'%'; P.textContent=p.toFixed(1)+'%'; if(L.textContent!==nl){ L.textContent=nl; L.classList.remove('bump'); void L.offsetWidth; L.classList.add('bump'); } r.style.setProperty('--v',((v-40)/60*100)+'%'); };
     r.addEventListener('input',up); up(); }},
  {k:'Your syllabus, understood',t:'Dropped quizzes? Handled.',b:'Drop the lowest, best N of M, a final that replaces your worst exam, capped points, extra credit. Tally follows the rules your professor wrote. Try the switch.',
   s:'<div class="st st3"><div class="dl"><div class="dlh"><b>Quizzes</b><span id="dlA">84.0%</span></div><div class="dlc">'
     +[92,61,88,95,84].map((v,i)=>'<span class="dch'+(v===61?' low':'')+'" style="--d:'+(i*70)+'ms">Quiz '+(i+1)+'<b>'+v+'</b></span>').join('')
     +'</div><label class="swrow dlsw"><span>Drop lowest score</span><input type="checkbox" class="swi" id="dlT"><i></i></label></div></div>',
   mount:function(sl){ const t=sl.querySelector('#dlT'), a=sl.querySelector('#dlA'), low=sl.querySelector('.dch.low');
     t.addEventListener('change',function(){ low.classList.toggle('gone',t.checked); a.textContent=(t.checked?89.75:84).toFixed(1)+'%'; a.classList.remove('bump'); void a.offsetWidth; a.classList.add('bump'); }); }},
  {k:'Calendar',t:'Your whole week, at a glance.',b:'Add class times once. Tally lays out every week of the semester, with breaks and days off built in.',
   s:(function(){ const B=[[0,8,22,'#7B5CFF','#fff','Neuro'],[2,8,22,'#7B5CFF','#fff','Neuro'],[1,30,26,'#19C3A5','#052A24','O-Chem'],[0,44,30,'#FFC233','#33240A','Lab'],[2,62,18,'#FF7A59','#2A1006','Stats'],[1,70,16,'#C9A6FF','#1a1033','Study']];
     return '<div class="st st4"><div class="mcal"><div class="mch">'+['Mon','Tue','Wed','Thu','Fri'].map(d=>'<span>'+d+'</span>').join('')+'</div><div class="mcg">'
       +[0,1,2,3,4].map(c=>'<div class="mcc">'+B.filter(b=>b[0]===c).map((b,i)=>'<span class="mb" style="top:'+b[1]+'%;height:'+b[2]+'%;--c:'+b[3]+';--fg:'+b[4]+';--d:'+(200+B.indexOf(b)*110)+'ms">'+b[5]+'</span>').join('')+'</div>').join('')
       +'<div class="mbreak"><b>Fall break</b></div></div></div></div>'; })()},
  {k:'Private by default',t:'Your grades stay yours.',b:'There is no account. Everything is saved on this device. Hide every grade with one tap and hover to peek. Sync between your devices only if you want to.',
   s:'<div class="st st5"><div class="pv on" id="pvBox"><small>Cumulative GPA</small><span class="pvn">3.87</span><button type="button" class="pvb" id="pvB" aria-label="Show or hide grades"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div>'
     +'<div class="pvchips"><span style="--d:300ms">No account</span><span style="--d:420ms">Saved on this device</span><span style="--d:540ms">Optional sync</span></div><p class="hint2">Hover the number or tap the eye</p></div>',
   mount:function(sl){ const b=sl.querySelector('#pvB'), box=sl.querySelector('#pvBox'); b.addEventListener('click',function(){ box.classList.toggle('on'); }); }},
  {k:'Let’s go',t:'Set up in about a minute.',b:'Give your syllabi to ChatGPT or Claude and Tally builds every class, weight and due date for you. Or add them yourself.',
   s:'<div class="st st6"><div class="bigmark">'+ICON_CHECK+'</div><div class="rings"><i></i><i></i><i></i></div></div>'}
];
function tourOpen(){
  try{ localStorage.setItem(TOUR_KEY,'1'); }catch(e){}
  const fr=tourShell('tourv'); let i=0;
  const has=hasData();
  fr.innerHTML='<div class="tbars">'+TOUR.map(()=>'<i><b></b></i>').join('')+'</div><button type="button" class="tskip" data-t="skip">Skip</button>'
    +'<div class="tslides">'+TOUR.map((s,j)=>'<section class="slide" data-i="'+j+'"><div class="tx"><span class="tk">'+s.k+'</span><h2>'+s.t+'</h2><p>'+s.b+'</p></div><div class="stw">'+s.s+'</div></section>').join('')+'</div>'
    +'<div class="tnav"><button type="button" class="tback" data-t="back">Back</button><span class="tcount"></span><div class="tgo"><button type="button" class="btn tsec" data-t="explore">'+(has?'Done':'Explore first')+'</button><button type="button" class="btn pri tnext" data-t="next">Next</button></div></div>';
  const slides=[...fr.querySelectorAll('.slide')], bars=[...fr.querySelectorAll('.tbars b')];
  TOUR.forEach((s,j)=>{ if(s.mount) s.mount(slides[j]); });
  function show(n){
    i=Math.max(0,Math.min(TOUR.length-1,n));
    slides.forEach((s,j)=>{ s.classList.toggle('on',j===i); s.classList.toggle('past',j<i); s.setAttribute('aria-hidden',j===i?'false':'true'); });
    const on=slides[i]; on.classList.remove('play'); void on.offsetWidth; on.classList.add('play');
    bars.forEach((b,j)=>{ b.parentNode.classList.toggle('done',j<i); b.parentNode.classList.toggle('cur',j===i); });
    fr.querySelector('.tback').style.visibility=i?'visible':'hidden';
    fr.querySelector('.tcount').textContent=(i+1)+' of '+TOUR.length;
    const last=i===TOUR.length-1;
    fr.querySelector('.tnext').textContent=last?(has?'Set up more classes':'Set up my classes'):'Next';
    fr.querySelector('.tsec').style.display=last?'':'none';
    fr.classList.toggle('lastslide',last);
  }
  fr.addEventListener('click',function(ev){
    const b=ev.target.closest('[data-t]'); if(!b) return; const t=b.dataset.t;
    if(t==='next'){ if(i===TOUR.length-1){ tourClose(); setTimeout(function(){ setupOpen(); },260); } else show(i+1); }
    else if(t==='back') show(i-1);
    else if(t==='skip'||t==='explore') tourClose();
  });
  bars.forEach((b,j)=>b.parentNode.addEventListener('click',function(){ show(j); }));
  let sx=null; const area=fr.querySelector('.tslides');
  area.addEventListener('pointerdown',function(e){ if(e.target.closest('input,button,label')) return; sx=e.clientX; });
  area.addEventListener('pointerup',function(e){ if(sx==null) return; const d=e.clientX-sx; sx=null; if(Math.abs(d)>50) show(i+(d<0?1:-1)); });
  tourKey=function(e){ if(e.target&&e.target.matches&&e.target.matches('input[type=range]')) return;
    if(e.key==='ArrowRight'){ e.preventDefault(); if(i<TOUR.length-1) show(i+1); } else if(e.key==='ArrowLeft'){ e.preventDefault(); show(i-1); } else if(e.key==='Escape') tourClose(); };
  document.addEventListener('keydown',tourKey,true);
  show(0); setTimeout(function(){ const n=fr.querySelector('.tnext'); if(n) n.focus({preventScroll:true}); },450);
}
function sampleSemester(){
  const d=n=>isoPlus(n);
  return {semesters:[{name:'Sample semester',current:true,finished:false,startDate:d(-38),endDate:d(66),classes:[
    {name:'Intro to Neuroscience',code:'NROSCI 1000',professor:'Dr. Rivera',credits:3,scale:'plus-minus',meetings:[{days:['Mon','Wed'],start:'10:00',end:'11:15',location:'Langley A221'}],categories:[
      {name:'Exams',weight:50,scoring:'average',replaceLowestWithFlagged:true,items:[{name:'Midterm 1',earned:86,outOf:100},{name:'Midterm 2',earned:null,outOf:100,due:d(9)},{name:'Final exam',earned:null,outOf:100,due:d(60),replacesLowest:true}]},
      {name:'Quizzes',weight:20,scoring:'average',dropLowest:1,items:[{name:'Quiz 1',earned:9,outOf:10},{name:'Quiz 2',earned:6,outOf:10},{name:'Quiz 3',earned:10,outOf:10},{name:'Quiz 4',earned:null,outOf:10,due:d(4)}]},
      {name:'Labs',weight:30,scoring:'total',items:[{name:'Lab 1',earned:18,outOf:20},{name:'Lab 2',earned:19,outOf:20},{name:'Lab 3',earned:null,outOf:20,due:d(11)}]}],
      notes:['Lowest quiz is dropped.','The final replaces your lowest midterm if it is higher.']},
    {name:'Statistics',code:'STAT 1100',professor:'Dr. Okafor',credits:4,scale:'plus-minus',meetings:[{days:['Tue','Thu'],start:'13:00',end:'14:15',location:'Benedum 102'}],categories:[
      {name:'Homework',weight:30,scoring:'best',bestN:4,items:[{name:'HW 1',earned:10,outOf:10},{name:'HW 2',earned:8,outOf:10},{name:'HW 3',earned:9,outOf:10},{name:'HW 4',earned:null,outOf:10,due:d(3)},{name:'HW 5',earned:null,outOf:10,due:d(17)}]},
      {name:'Exams',weight:70,scoring:'average',items:[{name:'Exam 1',earned:91,outOf:100},{name:'Exam 2',earned:null,outOf:100,due:d(13)}]}]},
    {name:'Writing Seminar',code:'ENGCMP 0200',professor:'Prof. Lee',credits:3,scale:'plain',totalPointsGrading:true,meetings:[{days:['Fri'],start:'09:00',end:'11:50',location:'Cathedral 316'}],categories:[
      {name:'Assignments',weight:100,scoring:'total',items:[{name:'Essay 1',earned:45,outOf:50},{name:'Essay 2',earned:null,outOf:50,due:d(8)},{name:'Portfolio',earned:null,outOf:100,due:d(58)}]}]}
  ]}]};
}
const courseCount=()=>W.sems.reduce((a,s)=>a+s.courses.length,0);
function setupOpen(start){
  const fr=tourShell('setupv');
  let step=start||'sem', rows=[{n:'',c:''},{n:'',c:''},{n:'',c:''}], added=0, how='';
  fr.innerHTML='<div class="sbar"><div class="sbrand">'+ICON_CHECK+'<span>Set up Tally</span></div><button type="button" class="tskip" data-s="close">Close</button></div><div class="sbody"></div>';
  const body=fr.querySelector('.sbody');
  const dots=()=>{ const order=['sem','how','go','done'], cur=step==='sem'?0:step==='how'?1:step==='done'?3:2; return '<div class="sdots">'+order.map((o,j)=>'<i class="'+(j<cur?'d':j===cur?'c':'')+'"></i>').join('')+'</div>'; };
  function card(inner){ return '<div class="sstep">'+dots()+inner+'</div>'; }
  function draw(){
    let h='';
    if(step==='sem') h=card('<span class="tk">Step 1</span><h2>Let’s set up your semester.</h2><p class="slead">No account needed. Everything you add stays on this device.</p>'
      +'<div class="sform"><label class="sfl">Semester name<input type="text" id="sName" value="'+esc(S.name)+'" placeholder="Fall 2026"></label>'
      +'<div class="stwo"><div class="sfl"><span>First day <em>optional</em></span>'+dateField('name="sStart"',S.start,'First day','Pick a date')+'</div><div class="sfl"><span>Last day <em>optional</em></span>'+dateField('name="sEnd"',S.end,'Last day','Pick a date')+'</div></div></div>'
      +'<div class="sact"><span></span><button type="button" class="btn pri" data-s="semnext">Continue</button></div>');
    else if(step==='how') h=card('<span class="tk">Step 2</span><h2>How do you want to add classes?</h2><p class="slead">You can mix and match later.</p><div class="sopts">'
      +'<button type="button" class="sopt rec" data-s="pick" data-h="canvas"><span class="soi" style="--c:#E66000">▦</span><b>Connect Canvas</b><small>Add the Tally extension once. It builds every class and section, fills in posted grades, and keeps them up to date.</small><em>Automatic · stays up to date</em></button>'
      +'<button type="button" class="sopt" data-s="pick" data-h="ai"><span class="soi" style="--c:#7B5CFF">✦</span><b>Use AI with your syllabi</b><small>Upload syllabi to ChatGPT or Claude. It builds every class, weight, rule and due date.</small></button>'
      +'<button type="button" class="sopt" data-s="pick" data-h="manual"><span class="soi" style="--c:#19C3A5">＋</span><b>Add them myself</b><small>Type in class names and credits. Add categories and scores later.</small></button>'
      +'<button type="button" class="sopt" data-s="pick" data-h="sample"><span class="soi" style="--c:#FFC233">◎</span><b>Try a sample semester</b><small>Explore with made-up classes first. Delete it anytime.</small></button></div>'
      +'<div class="sact"><button type="button" class="btn" data-s="back" data-to="sem">Back</button><span></span></div>');
    else if(step==='canvas') h=card(canvasStepHtml()+'<div class="sact"><button type="button" class="btn" data-s="back" data-to="how">Back</button><span></span></div>');
    else if(step==='ai') h=card('<span class="tk">Step 3 · AI setup</span><h2>Let AI read your syllabi.</h2><p class="slead">Takes about a minute. Works with ChatGPT, Claude, or any chat that can make files.</p><ol class="ssteps">'
      +'<li><span class="sn">1</span><div><b>Copy the Tally prompt</b><small>It tells the AI exactly what file to make.</small></div><button type="button" class="btn pri sm" data-s="copy">Copy prompt</button></li>'
      +'<li><span class="sn">2</span><div><b>Open a chat and attach your syllabi</b><small>Paste the prompt, attach syllabi and any grades (PDFs, screenshots, Canvas exports).</small></div><div class="sbtns"><a class="btn sm" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT ↗</a><a class="btn sm" href="https://claude.ai/new" target="_blank" rel="noopener">Claude ↗</a></div></li>'
      +'<li><span class="sn">3</span><div><b>Drop the file it gives you</b><small>Usually called grades.json.</small></div></li></ol>'
      +'<label class="sdrop" id="sDrop"><input type="file" id="sFile" accept=".json,application/json" hidden><span class="sdi">⤓</span><b>Drop grades.json here</b><small>or click to choose the file</small><span class="serr" id="sErr"></span></label>'
      +'<div class="sact"><button type="button" class="btn" data-s="back" data-to="how">Back</button><span></span></div>');
    else if(step==='manual') h=card('<span class="tk">Step 3 · Your classes</span><h2>Add your classes.</h2><p class="slead">Just the names for now. Each one starts with Homework, Midterm and Final, and you can change that anytime.</p>'
      +'<div class="srows">'+rows.map((r,j)=>'<div class="srow" style="--d:'+(j*60)+'ms"><input type="text" data-r="'+j+'" data-k="n" value="'+esc(r.n)+'" placeholder="'+(['Organic Chemistry','Statistics','Writing Seminar','Class name'][Math.min(j,3)])+'" aria-label="Class name"><input type="number" step="0.5" min="0" inputmode="decimal" data-r="'+j+'" data-k="c" value="'+esc(r.c)+'" placeholder="Credits" aria-label="Credits"></div>').join('')+'</div>'
      +'<button type="button" class="sadd" data-s="addrow">＋ Another class</button>'
      +'<div class="sact"><button type="button" class="btn" data-s="back" data-to="how">Back</button><button type="button" class="btn pri" data-s="savemanual">Add classes</button></div>');
    else if(step==='done') h=card('<div class="sdone"><div class="bigmark">'+ICON_CHECK+'</div><h2>You’re all set.</h2><p class="slead">'+(how==='sample'?'The sample semester is loaded. Switch back to your own semester from the name at the top.':added?(added+' class'+(added===1?'':'es')+' added. Tap any class to fill in scores and try what-ifs.'):'Your semester is ready. Add classes anytime from the home page.')+'</p>'
      +'<button type="button" class="btn pri" data-s="close">Open Tally</button><small class="sfoot">Replay this anytime from Backup and reset at the bottom of the home page.</small></div>');
    body.innerHTML=h; const st=body.querySelector('.sstep'); requestAnimationFrame(function(){ st.classList.add('in'); });
    if(step==='ai') wireDrop();
    if(step==='canvas') canvasStepWire(body,{refresh:function(){ go('canvas'); }});
    const f=body.querySelector('input[type=text]'); if(f&&step!=='done') setTimeout(function(){ f.focus({preventScroll:true}); },300);
  }
  function go(s){ const st=body.querySelector('.sstep'); if(st){ st.classList.add('out'); setTimeout(function(){ step=s; draw(); },180); } else { step=s; draw(); } }
  function wireDrop(){
    const dz=body.querySelector('#sDrop'), fi=body.querySelector('#sFile'), er=body.querySelector('#sErr');
    const take=function(file){ if(!file) return; const r=new FileReader(); r.onload=function(){ try{ const v=JSON.parse(r.result); if(!okFile(v)) throw 0; const before=courseCount(); importFile(v); added=Math.max(0,courseCount()-before); how='ai'; go('done'); }catch(e){ er.textContent='That file isn’t a Tally grade file. Ask the AI to use the exact format from the prompt.'; dz.classList.add('bad'); setTimeout(function(){ dz.classList.remove('bad'); },600); } }; r.readAsText(file); };
    fi.addEventListener('change',function(){ take(fi.files[0]); });
    ['dragenter','dragover'].forEach(t=>dz.addEventListener(t,function(e){ e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave','drop'].forEach(t=>dz.addEventListener(t,function(e){ e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop',function(e){ take(e.dataTransfer&&e.dataTransfer.files[0]); });
  }
  fr.addEventListener('input',function(e){ const t=e.target; if(t.dataset.r!=null) rows[+t.dataset.r][t.dataset.k]=t.value; });
  fr.addEventListener('click',function(ev){
    const b=ev.target.closest('[data-s]'); if(!b) return; const a=b.dataset.s;
    if(a==='close'){ tourClose(); view='home'; setHash(); render(); window.scrollTo(0,0); }
    else if(a==='back') go(b.dataset.to);
    else if(a==='semnext'){ const n=(body.querySelector('#sName').value||'').trim(); if(n) S.name=n; const s1=body.querySelector('input[name=sStart]').value, s2=body.querySelector('input[name=sEnd]').value; S.start=s1||''; S.end=s2||''; if(S.start&&S.end&&S.end<S.start){ const x=S.start; S.start=S.end; S.end=x; } save(); render(true); go('how'); }
    else if(a==='pick'){ const h=b.dataset.h; if(h==='sample'){ const before=courseCount(); mergeSimple(sampleSemester()); added=courseCount()-before; how='sample'; go('done'); } else go(h); }
    else if(a==='copy'){ const done=function(){ b.textContent='Copied ✓'; b.classList.add('ok'); setTimeout(function(){ b.textContent='Copy prompt'; b.classList.remove('ok'); },2000); };
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(AI_PROMPT).then(done,function(){ fallbackCopy(AI_PROMPT); done(); }); else { fallbackCopy(AI_PROMPT); done(); } }
    else if(a==='addrow'){ rows.push({n:'',c:''}); const st=body.querySelector('.srows'); const j=rows.length-1; st.insertAdjacentHTML('beforeend','<div class="srow"><input type="text" data-r="'+j+'" data-k="n" placeholder="Class name" aria-label="Class name"><input type="number" step="0.5" min="0" inputmode="decimal" data-r="'+j+'" data-k="c" placeholder="Credits" aria-label="Credits"></div>'); st.lastElementChild.querySelector('input').focus(); }
    else if(a==='savemanual'){ const list=rows.filter(r=>r.n.trim()); if(!list.length){ const f=body.querySelector('.srow input'); if(f){ f.focus(); f.classList.add('shake'); setTimeout(function(){ f.classList.remove('shake'); },500); } return; }
      list.forEach(function(r){ const mk=(n,w,items)=>({name:n,w:w,rule:'avg',items:items}); const c=normCourse({name:r.n.trim(),credits:num(r.c),scale:'std',pooled:false,cats:[mk('Homework',30,[I('Homework 1',100),I('Homework 2',100)]),mk('Midterm',30,[I('Midterm',100)]),mk('Final exam',40,[I('Final exam',100)])]}); c.color=nextColor(); S.courses.push(c); syncColors(); });
      added=list.length; how='manual'; save(); render(true); go('done'); }
  });
  tourKey=function(e){ if(e.key==='Escape'&&!document.querySelector('.dpop,.tpop')) tourClose(); };
  document.addEventListener('keydown',tourKey,true);
  draw();
}
function fallbackCopy(t){ const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove(); }
