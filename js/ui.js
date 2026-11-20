"use strict";
/* ---------- saving: local browser + embedded in this page ---------- */
let pubT=null, statT=null;
function setStat(t,cls){ const el=document.getElementById('saveStat'); if(el){ el.textContent=t; el.className='savestat '+(cls||''); } }
function publishSelf(){ setStat('Saved on this device','ok'); clearTimeout(statT); statT=setTimeout(function(){ setStat('',''); },1600); }
function save(){
  W.ts=Date.now();
  try{ localStorage.setItem(KEY3,JSON.stringify(W)); }catch(e){ setStat('Couldn’t save in this browser','warn'); return; }
  setStat('Saving…','busy');
  clearTimeout(pubT); pubT=setTimeout(publishSelf,350);
  scheduleSync();
}

/* ---------- charts + home ---------- */
function cumPoints(gp){
  let cr=0,qp=0; const pts=[];
  if(W.base&&W.base.cr>0&&typeof W.base.gpa==='number'){ cr=W.base.cr; qp=cr*W.base.gpa; pts.push({l:'Before',v:W.base.gpa}); }
  PRIOR.forEach(function(t,pi){ t.c.forEach(x=>{cr+=x[1];qp+=x[1]*x[2];}); if(cr) pts.push({l:t.short||t.t,v:qp/cr,k:'p'+pi}); });
  const ai=W.sems.findIndex(x=>x.id===W.active); W.sems.forEach((sm,i)=>{ if(i<ai){ const t=semTotals(sm); if(t.cr){ cr+=t.cr; qp+=t.qp; pts.push({l:sm.short||sm.name,v:qp/cr,k:'s'+sm.id}); } } });
  if(gp&&gp.cr) pts.push({l:S.short||S.name,v:gp.cum,proj:true,k:'s'+W.active});
  else if(pts.length) pts.push({l:S.short||S.name,v:pts[pts.length-1].v,proj:true,k:'s'+W.active});
  return pts;
}
function chartSvg(pts){
  const W=640,H=260,pl=46,pr=28,pt=34,pb=40;
  const vals=pts.map(p=>p.v);
  let lo=Math.floor((Math.min.apply(null,vals)-0.02)*20)/20, hi=4;
  if(hi-lo<0.1) lo=hi-0.1;
  const X=i=>pl+(pts.length===1?0:i*(W-pl-pr)/(pts.length-1));
  const Y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb);
  let g='';
  [lo,(lo+hi)/2,hi].forEach(v=>{ g+='<line class="ch-grid" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'"/><text x="'+(pl-10)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end">'+v.toFixed(2)+'</text>'; });
  const solid=pts.filter(p=>!p.proj), last=pts.filter(p=>p.proj);
  const d=a=>a.map((p,i)=>(i?'L':'M')+X(pts.indexOf(p)).toFixed(1)+' '+Y(p.v).toFixed(1)).join(' ');
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Cumulative GPA by semester">'+g;
  if(solid.length>1){
    const base=(H-pb).toFixed(1);
    s+='<path class="ch-area" d="'+d(solid)+' L'+X(solid.length-1).toFixed(1)+' '+base+' L'+X(0).toFixed(1)+' '+base+' Z"/>';
  }
  s+='<path class="ch-line" d="'+d(solid)+'"/>';
  if(last.length&&solid.length){ const lp=solid[solid.length-1]; s+='<path class="ch-line" stroke-dasharray="2 9" d="M'+X(pts.indexOf(lp)).toFixed(1)+' '+Y(lp.v).toFixed(1)+' L'+X(pts.indexOf(last[0])).toFixed(1)+' '+Y(last[0].v).toFixed(1)+'"/>'; }
  pts.forEach(function(p,i){
    s+='<circle class="ch-dot'+(p.proj?' proj':'')+'" cx="'+X(i).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="7"/>';
    s+='<text class="val" x="'+X(i).toFixed(1)+'" y="'+(Y(p.v)-16).toFixed(1)+'" text-anchor="middle">'+f3(p.v)+'</text>';
    const full=String(p.l), lab=full.length>13?full.slice(0,12)+'…':full, last=(i===pts.length-1&&pts.length>1);
    s+='<text class="lbl'+(p.k?' ed':'')+'"'+(p.k?' data-k="'+esc(p.k)+'"':'')+' x="'+(X(i)+(last?10:0)).toFixed(1)+'" y="'+(H-14)+'" text-anchor="'+(last?'end':'middle')+'">'+esc(lab)+(p.k?'<title>Double-click to rename</title>':'')+'</text>';
  });
  return s+'</svg>';
}
function heroHtml(){
  const gp=gpaCalc('whatif');
  if(!PRIOR_CR) return '<section class="hero" style="grid-template-columns:1fr"><div class="hl"><div class="lab">What-if semester GPA</div><div class="gnum">'+(gp.cr?g2(gp.sem):'–')+'</div>'
    +(gp.cr?'<p class="sub">'+gp.cr+' credits counted</p>':'<div class="after">Add credits in the GPA section to see a what-if GPA for this semester.</div>')
    +'</div></section>';
  return '<section class="hero"><div class="hl"><div class="lab">Cumulative GPA</div><div class="gnum">'+g2(PRIOR_QP/PRIOR_CR)+'</div>'
    +'<p class="sub">'+(gp.all?gp.all+' credits this semester':'No credits set this semester')+' · '+(PRIOR_CR+gp.all+(W.transfer||0))+' total</p>'
    +(gp.cr?'<div class="after"><b>'+g2(gp.cum)+'</b> with your what-ifs</div>':'<div class="after">'+(gp.all?'Enter some scores to see a what-if GPA for this semester.':'Add credits in the GPA section to see a what-if GPA for this semester.')+'</div>')
    +'</div><div class="hc">'+chartSvg(cumPoints(gp))+'</div></section>';
}
function gpaSumHtml(){
  const a=gpaCalc('cur'),b=gpaCalc('whatif'),c=gpaCalc('pick');
  if(!a.cr&&!b.cr&&!c.cr) return '<div class="banner"><b>Add credits to see GPA.</b> Type each class’s credits in the table below.</div>';
  const box=(t,x)=>'<div class="card gp"><div class="t">'+t+'</div><div class="v">'+g2(x.sem)+'</div><div class="s">Cumulative '+g2(x.cum)+'</div></div>';
  const miss=a.missing.length?'<p class="semnote">Not counted yet (no credits): '+a.missing.map(esc).join(', ')+'.</p>':'';
  return '<div class="gpagrid">'+box('Semester GPA now',a)+box('Semester GPA what-if',b)+box('With your letter picks',c)+'</div>'+miss;
}

const fx=x=>trim((Math.round(x*100)/100).toFixed(2));
function pastPct(n){
  if(OLD_PCT[n]!=null) return OLD_PCT[n];
  const h=HIST[n]; return (h&&h.variants&&h.variants.length===1&&h.variants[0].pct!=null)?h.variants[0].pct:null;
}
function pastDetail(n){
  const h=HIST[n]; if(!h||!h.variants||!h.variants.length) return '';
  const many=h.variants.length>1;
  return (many?'<div class="semnote" style="margin:4px 0 0">Your sheet has '+h.variants.length+' versions of this class, shown below.</div>':'')
  +h.variants.map(function(v,vi){
    const cats=v.cats.map(function(k){
      const its=k.items.map(i=>'<span class="chip">'+(i.n?esc(i.n)+' ':'')+'<b>'+fx(i.e)+'</b>/'+fx(i.p)+'</span>').join('');
      const ex=(k.extra||[]).map(x=>'<span class="chip ex'+(x.e<0?' neg':'')+'">'+(x.n?esc(x.n)+' ':'')+(x.e<0?'−'+fx(-x.e)+' deducted':'+'+fx(x.e)+' extra')+'</span>').join('');
      return '<div class="hxc"><div class="hxh"><b>'+esc(k.name)+'</b><span>'+trim((Math.round(k.w*1000)/10).toFixed(1))+'% of grade</span><span class="hxa">'+(k.avg!=null?f3(k.avg*100)+'%':'–')+'</span></div>'
        +'<div class="hxi">'+its+ex+'</div>'+(k.note?'<div class="hxn">'+esc(k.note)+'</div>':'')+'</div>';
    }).join('');
    return (many?'<div class="hxv">Version '+(vi+1)+'</div>':'')+cats
      +'<div class="hxf">Final '+(v.pct!=null?f3(v.pct)+'%':'–')+(v.letter?' · '+esc(v.letter):'')+'</div>';
  }).join('');
}
function pastRow(x,gg,cr){
  const pct=pastPct(x[0]);
  const cells='<span class="n">'+esc(x[0])+'</span><span class="m">'+cr+'</span><span class="m">'+(pct!=null?f3(pct)+'%':'')+'</span><span class="gg">'+gg+'</span>';
  return HIST[x[0]]?'<details class="hx"><summary class="cr">'+cells+'</summary><div class="hxb">'+pastDetail(x[0])+'</div></details>':'<div class="cr">'+cells+'</div>';
}
function projHomeHtml(){
  const b=gpaCalc('proj');
  const rows=S.courses.map(function(c){ const pr=courseRes(c,'proj');
    return '<tr><td><i class="dot" data-cid="'+c.id+'" style="background:'+COLORS[c.id]+'"></i>'+esc(c.name)+'</td><td class="r">'+c.fill+'%</td><td class="r">'+letterOf(c,pr.pct)+'</td><td class="r">'+pctS(pr.pct)+'</td></tr>'; }).join('');
  const gp=b.cr?'<p class="semnote">Projected semester GPA <b>'+g2(b.sem)+'</b>'+(PRIOR_CR&&b.cum!=null?' · cumulative <b>'+g2(b.cum)+'</b>':'')+'</p>':'<p class="semnote">Add credits in the GPA planner to see a projected GPA.</p>';
  return '<div class="card panel scroll"><table><thead><tr><th>Class</th><th class="r">Rest scores</th><th class="r">Letter</th><th class="r">Percent</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+gp;
}
/* ---------- collapsible, reorderable sections ---------- */
const LAY_KEY='gt-layout';
let LAY={order:[],col:{},bn:false};
try{ const l=JSON.parse(localStorage.getItem(LAY_KEY)||'null'); if(l&&typeof l==='object'){ LAY.order=Array.isArray(l.order)?l.order:[]; LAY.col=(l.col&&typeof l.col==='object')?l.col:{}; LAY.bn=!!l.bn; } }catch(e){}
function saveLay(){ try{ localStorage.setItem(LAY_KEY,JSON.stringify(LAY)); }catch(e){} }
function secOrder(avail){ const o=LAY.order.filter(x=>avail.indexOf(x)>=0); avail.forEach(x=>{ if(o.indexOf(x)<0) o.push(x); }); return o; }
function secHtml(id,title,body){
  const col=!!LAY.col[id];
  return '<section class="hsec'+(col?' col':'')+'" data-sec="'+id+'" id="'+id+'">'
    +'<div class="sechead"><button type="button" class="sectoggle" data-act="sectoggle" data-s="'+id+'" aria-expanded="'+(!col)+'"><svg class="schev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 1.5 6 6l4.5-4.5"/></svg><h2>'+title+'</h2></button>'
    +'<div class="secctl">'+(id==='classes'&&S.courses.length>1?'<button type="button" class="rord'+(reorder?' on':'')+'" data-act="reorder">'+(reorder?'Done':'Reorder')+'</button>':'')+'<button type="button" data-act="secmove" data-s="'+id+'" data-d="-1" aria-label="Move '+title+' up" title="Move up">↑</button><button type="button" data-act="secmove" data-s="'+id+'" data-d="1" aria-label="Move '+title+' down" title="Move down">↓</button></div></div>'
    +'<div class="secbody"><div class="secin">'+body+'</div></div></section>';
}
function moveSec(id,d){
  const els=Array.prototype.slice.call(document.querySelectorAll('.hsec')), i=els.findIndex(e=>e.dataset.sec===id), j=i+d;
  if(i<0||j<0||j>=els.length) return;
  const a=els[i], b=els[j], ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
  if(d<0) b.before(a); else b.after(a);
  const na=a.getBoundingClientRect(), nb=b.getBoundingClientRect();
  if(!REDUCED){ const o={duration:380,easing:'cubic-bezier(.2,.7,.2,1)'};
    a.animate([{transform:'translateY('+(ra.top-na.top)+'px)'},{transform:'none'}],o); b.animate([{transform:'translateY('+(rb.top-nb.top)+'px)'},{transform:'none'}],o); }
  LAY.order=Array.prototype.slice.call(document.querySelectorAll('.hsec')).map(e=>e.dataset.sec); saveLay();
}
function homeView(){
  if(!S.courses.length) return emptyHome();
  const anyScore=S.courses.some(c=>c.cats.some(k=>k.items.some(it=>it.e!=null)));
  const tileList=S.courses.map(function(c,ci){
    const cur=courseRes(c,'cur'), wi=courseRes(c,'whatif');
    let late=0; c.cats.forEach(k=>k.items.forEach(it=>{ if(it.d&&it.d<TODAY&&it.e==null&&!it.opt) late++; }));
    const mv=reorder?'<div class="tmv"><button type="button" data-act="classmove" data-c="'+c.id+'" data-d="-1" aria-label="Move '+esc(c.name)+' earlier"'+(ci===0?' disabled':'')+'>←</button><button type="button" data-act="classmove" data-c="'+c.id+'" data-d="1" aria-label="Move '+esc(c.name)+' later"'+(ci===S.courses.length-1?' disabled':'')+'>→</button></div>':'';
    return '<div class="tw" data-id="'+c.id+'">'+mv+'<button class="tile'+(c.noGpa?' nog':'')+'" style="--c:'+COLORS[c.id]+';--fg:'+TILE[c.id]+'" data-act="go" data-v="'+c.id+'">'
      +(c.noGpa
        ?'<div class="tl"><div class="nm">'+esc(c.name)+'</div><div class="cd">'+(subOf(c)?esc(subOf(c))+' · ':'')+'Not in GPA</div></div>'
          +'<div class="mr">'+(gradesOff(c)?'<span class="mo">Grades off</span>':'<span class="ml">'+letterOf(c,cur.pct)+'</span><span class="mp">'+(cur.pct==null?'No scores':pctS(cur.pct))+'</span>')+'</div>'
        :'<div class="tl"><div class="nm">'+esc(c.name)+'</div><div class="cd">'+esc(subOf(c))+'</div>'
        +'<div class="row"><span class="p">'+(cur.pct==null?'No scores yet':pctS(cur.pct))+'</span><span class="pj">What-if <b>'+letterOf(c,wi.pct)+' · '+pctS(wi.pct)+'</b></span></div></div>'
        +'<div class="L">'+letterOf(c,cur.pct)+'</div>'
        +'<div class="tbar"><i style="width:'+Math.round(cur.progress*100)+'%"></i></div>'
        +'<div class="tfoot"><small>'+Math.round(cur.progress*100)+'% of the grade is in</small>'
        +(late&&cur.pct!=null?'<span class="late">'+late+' past due</span>':'')+'</div>')
      +'</button></div>';
  });
  const tilesMain=tileList.filter((t,i)=>!S.courses[i].noGpa).join(''), tilesMini=tileList.filter((t,i)=>S.courses[i].noGpa).join('');
  const tiles=tilesMain+(tilesMini?'</div><div class="tiles tmini">'+tilesMini:'');
  const lim=isoPlus(14), up=[];
  S.courses.forEach(c=>gradesOff(c)?0:c.cats.forEach(k=>k.items.forEach(it=>{ if(it.d&&it.e==null&&!it.opt&&it.d>=TODAY&&it.d<=lim) up.push({d:it.d,dl:it.dl,c:c.name,id:c.id,n:it.n}); })));
  up.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  const upHtml=up.length?up.map(u=>'<div class="up"><div class="d">'+fd(u.d)+'</div><div><div style="font-weight:700">'+esc(u.n)+'</div><div class="c"><i class="dot" style="background:'+COLORS[u.id]+'"></i>'+esc(u.c)+(u.dl?' · '+esc(u.dl):'')+'</div></div></div>').join('')
    :'<div class="empty">Nothing with a due date in the next two weeks.</div>';
  const gpaRows=S.courses.map(c=>{
    const cur=courseRes(c,'cur'),wi=courseRes(c,'whatif'), pick=S.gpaPick[c.id]||'whatif';
    const opts='<option value="whatif"'+(pick==='whatif'?' selected':'')+'>What-if</option><option value="proj"'+(pick==='proj'?' selected':'')+'>Projected</option>'+LETTERS.map(L=>'<option value="'+L+'"'+(pick===L?' selected':'')+'>'+L+'</option>').join('');
    return '<tr'+(c.noGpa?' style="opacity:.5" title="Not counted in GPA"':'')+'><td><i class="dot" data-cid="'+c.id+'" style="background:'+COLORS[c.id]+'"></i>'+esc(c.name)+(c.noGpa?' <small style="color:var(--mut)">· not in GPA</small>':'')+'</td><td><input type="number" step="0.5" min="0" inputmode="decimal" data-f="credits" data-c="'+c.id+'" value="'+(c.credits==null?'':c.credits)+'" placeholder="–" aria-label="Credits for '+esc(c.name)+'"></td>'
      +'<td class="r">'+letterOf(c,cur.pct)+'</td><td class="r">'+letterOf(c,wi.pct)+'</td><td class="r"><select data-f="pick" data-c="'+c.id+'" aria-label="Letter to use for '+esc(c.name)+'">'+opts+'</select></td></tr>';
  }).join('');
  const cards=PRIOR.map(function(s,si){
    const scr=s.c.reduce((a,x)=>a+x[1],0), sqp=s.c.reduce((a,x)=>a+x[1]*x[2],0);
    let cr=0,qp=0; PRIOR.slice(0,si+1).forEach(t=>t.c.forEach(x=>{cr+=x[1];qp+=x[1]*x[2];}));
    return '<section class="card sem"><div class="semtop" style="--hd:'+SEMCOL[si][0]+';--hf:'+SEMCOL[si][1]+'"><h3>'+esc(s.t)+'</h3><div class="g">'+g2(sqp/scr)+'<small>'+scr+' credits</small></div></div><div class="semb">'
      +s.c.map(x=>pastRow(x,(LETTER_OF_GPA[String(x[2])]||x[2]),x[1]+' cr')).join('')
      +(s.x||[]).map(n=>pastRow([n],'–','no credit')).join('')
      +'<div class="semnote">Cumulative after this semester: <b>'+g2(qp/cr)+'</b>'+((OLD_X[si]||[]).length?'<br>Not in GPA (0.00 in your sheet): '+OLD_X[si].map(esc).join(', '):'')+'</div></div></section>';
  }).join('');
  const trCard='<section class="card sem tr"><div class="semtop" style="--hd:var(--card2,rgba(127,127,127,.16));--hf:var(--ink)"><h3>Transfer credit</h3><div class="g"><input type="number" min="0" step="0.5" inputmode="decimal" data-f="transfer" value="'+(W.transfer||'')+'" placeholder="0" aria-label="Transfer credits"><small>credits, not in GPA</small></div></div></section>';
  const upl='<label class="btn pri" style="cursor:pointer;margin-left:8px">Upload grade file<input type="file" id="bkfile2" accept=".json,application/json" hidden></label>';
  const showBanner=!anyScore&&!LAY.bn;
  const banner=showBanner?'<div class="banner dismissable"><b>Start with what you already have.</b> Upload a grade file, or open a class and fill in the Earned column. '+upl+'<button type="button" class="bx" data-act="dismissbanner" aria-label="Dismiss" title="Dismiss">×</button></div>':'';
  const bottomUp=(!anyScore&&LAY.bn)?'<div class="uprow"><label class="uplink">Upload a grade file<input type="file" id="bkfile2" accept=".json,application/json" hidden></label></div>':'';
  const gpaTable='<div id="gpasum"></div><div class="card panel scroll"><table><thead><tr><th>Class</th><th>Credits</th><th class="r">Now</th><th class="r">What-if</th><th class="r">Letter to use</th></tr></thead><tbody>'+gpaRows+'</tbody></table></div>'+(!PRIOR.length?baseHtml():'');
  const secs={
    classes:{t:'This semester',b:'<div class="tiles">'+tiles+'</div><button class="addclass" data-act="newclass"><span>＋</span> Add class</button>'},
    coming:{t:'Coming up',b:'<div class="card panel">'+upHtml+'</div>'},
    gpa:{t:'GPA planner',b:gpaTable},
    projected:{t:'Projected final',b:'<div id="projbox">'+projHomeHtml()+'</div>'}
  };
  if(PRIOR.length) secs.history={t:'Past semesters',b:'<div class="semgrid">'+cards+'</div>'+trCard};
  return semTitle()
    +'<div id="heroBox">'+heroHtml()+'</div>'+banner
    +secOrder(Object.keys(secs)).map(id=>secHtml(id,secs[id].t,secs[id].b)).join('')
    +bottomUp+backupHtml();
}

function ecHtml(c){
  const e=c.ec;
  const lim=k=>(e.max!=null&&e.mu===k)?' <small>max '+e.max+'</small>':'';
  const fld=(k,f,v,lab)=>'<input type="number" step="any" inputmode="decimal" data-f="'+f+'" data-u="'+k+'" data-c="'+c.id+'" value="'+(v==null?'':v)+'" placeholder="–" aria-label="'+lab+'">';
  const ecK=(!c.pooled&&e.cat!=null&&c.cats[e.cat])?e.cat:null;
  const sel=c.pooled?'':'<select class="ecsel" data-f="eccat" data-c="'+c.id+'" aria-label="Where the extra points count"><option value="">Total grade</option>'+c.cats.map((k,i)=>'<option value="'+i+'"'+(ecK===i?' selected':'')+'>'+esc(k.name)+'</option>').join('')+'</select>';
  const tot=(c.pooled||ecK!=null)?'':'<label class="ectot">out of <input type="number" step="any" inputmode="decimal" data-f="ectotal" data-c="'+c.id+'" value="'+(e.total==null?'':e.total)+'" placeholder="'+f3(ecTotal(c))+'" aria-label="Total points in this class"> total points</label>';
  const hp=c.pooled?'Added to the points you’ve earned.':'Count in: '+sel;
  return '<section class="ecbox" id="ecbox"><div class="ecl"><b>'+esc(e.label)+'</b><small>Use points, percent, or both. A what-if replaces the earned amount on that row.</small></div>'
    +'<div class="ecgrid"><div></div><div class="ech">Earned</div><div class="ech">What-if</div>'
    +'<div class="eck">Points'+lim('pts')+'<small class="ecto">'+hp+'</small></div>'+fld('pts','ece',e.pts.e,'Extra credit points earned')+fld('pts','ecw',e.pts.w,'Extra credit points what-if')
    +'<div class="eck">Percent'+lim('pct')+'<small>Added straight onto your final percent.</small></div>'+fld('pct','ece',e.pct.e,'Extra credit percent earned')+fld('pct','ecw',e.pct.w,'Extra credit percent what-if')
    +'</div>'+tot+'</section>';
}
function courseView(c){
  const cats=c.cats.map((k,ki)=>{
    const meta=c.pooled
      ?'<span>'+k.items.reduce((a,x)=>a+(x.p||0),0)+' points total</span>'
      :'<label>Weight <input type="number" step="any" inputmode="decimal" data-f="cw" data-c="'+c.id+'" data-k="'+ki+'" value="'+k.w+'" aria-label="Category weight in percent"> %</label>';
    const rt=c.pooled?'':ruleText(k);
    const ttl=editing?'<input type="text" class="catname" data-f="catname" data-c="'+c.id+'" data-k="'+ki+'" value="'+esc(k.name)+'" aria-label="Category name">':esc(k.name);
    return '<section class="card cat"><div class="cathead"><h3>'+ttl+'</h3><div class="catmeta">'+meta+'<span class="cpct" data-k="'+ki+'">–</span></div></div>'
      +((editing||openCats.has(c.id+':'+ki))?catEdit(c,k,ki):'')
      +(c.pooled?'':quickRule(c,k,ki))
      +((rt||(editing&&!c.pooled))?'<div class="rule" data-rl="'+ki+'">'+rt+'</div>':'')
      +'<div class="grid h"><div>Item</div><div>Earned</div><div>Out of</div><div>What-if</div><div style="text-align:center">Score</div><div></div></div>'
      +k.items.map((it,ii)=>itemRow(c,ki,ii,it)).join('')
      +'<div class="addrow"><button class="btn" data-act="add" data-c="'+c.id+'" data-k="'+ki+'">Add item</button>'
      +(k.rule==='swap'?'<button class="btn" data-act="addopt" data-c="'+c.id+'" data-k="'+ki+'">Add optional item</button>':'')+'</div></section>';
  }).join('');
  const ec=ecHtml(c);
  const notes=c.notes.length?'<div class="notes"><h2>Notes</h2><ul>'+c.notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul></div>':'';
  const tot=c.cats.reduce((a,k)=>a+(k.w||0),0);
  const wn=(!c.pooled&&Math.abs(tot-100)>0.01)?'<div class="banner">Category weights add up to '+f1(tot)+'%, not 100%. Grades are scaled to the weights you’ve set.</div>':'';
  const cc='<div class="cc" aria-label="Class color">'+PALETTE.map(v=>'<button type="button" style="--c:'+v+'" class="'+(v.toLowerCase()===COLORS[c.id].toLowerCase()?'on':'')+'" data-id="'+c.id+'" data-v="'+v+'" aria-label="'+pname(v)+'" aria-pressed="'+(v.toLowerCase()===COLORS[c.id].toLowerCase())+'"></button>').join('')+'</div>';
  if(gradesOff(c)) return '<div class="cpage" data-id="'+c.id+'" style="--c:'+COLORS[c.id]+';--fg:'+TILE[c.id]+'"><div class="cpbar"><div class="cpl"><button class="back" data-act="go" data-v="home">← All classes</button><button type="button" class="editlink'+(editing?' on':'')+'" data-act="edit" data-c="'+c.id+'">'+(editing?'Done editing':'✎ Edit')+'</button></div>'+cc+'</div>'
    +'<section class="cband"><header class="chead"><div><h1>'+esc(c.name)+'</h1><p>'+esc(subOf(c))+'</p></div>'
    +'<div class="chctl"><label class="fld">Credits <input type="number" step="0.5" min="0" inputmode="decimal" data-f="credits" data-c="'+c.id+'" value="'+(c.credits==null?'':c.credits)+'" placeholder="–"></label></div></header>'
    +'<p class="goff">Grades are off for this class. It isn’t counted in your GPA and its scores aren’t tracked. Turn grades back on under ✎ Edit.</p></section>'
    +(editing?editPanel(c):'')+notes+'</div>';
  return '<div class="cpage" data-id="'+c.id+'" style="--c:'+COLORS[c.id]+';--fg:'+TILE[c.id]+'"><div class="cpbar"><div class="cpl"><button class="back" data-act="go" data-v="home">← All classes</button><button type="button" class="editlink'+(editing?' on':'')+'" data-act="edit" data-c="'+c.id+'">'+(editing?'Done editing':'✎ Edit')+'</button></div>'+cc+'</div>'
    +'<section class="cband"><header class="chead"><div><h1>'+esc(c.name)+'</h1><p>'+esc(subOf(c))+'</p></div>'
    +'<div class="chctl"><label class="fld">Credits <input type="number" step="0.5" min="0" inputmode="decimal" data-f="credits" data-c="'+c.id+'" value="'+(c.credits==null?'':c.credits)+'" placeholder="–"></label></div></header>'
    +'<div id="sum"></div></section>'
    +(editing?editPanel(c):'')+classRules(c)+wn+cats+'<button type="button" class="addsec" data-act="secnew" data-c="'+c.id+'"><span>＋</span> Add a section<small>Homework, labs, exams, participation…</small></button>'+ec
    +'<section class="card csum" id="projcard"><h2 class="projh">Projected final</h2><div id="projsum"></div>'
    +'<div class="fillbox"><label for="fill"><span>Assume the rest of your work scores</span><b id="fillv">'+c.fill+'%</b></label>'
    +'<input type="range" id="fill" min="0" max="110" step="1" value="'+c.fill+'" data-f="fill" data-c="'+c.id+'"></div>'
    +'<div class="need" id="need"></div></section>'
    +trendHtml(c)
    +notes+'</div>';
}
function projHtml(c){
  return '<div class="projres"><span class="l" data-s="pL"></span><span class="p" data-s="pP"></span><span class="h">projected final'+(c.scaleAssumed?' · assumed +/− scale':'')+'</span></div>';
}
function sumHtml(c){
  const as=c.scaleAssumed?' · assumed +/− scale':'';
  return '<div class="gblocks">'
    +'<div><div class="glabel">Graded so far</div><div class="gletter" data-s="cL"></div><div class="gpct" data-s="cP"></div><div class="ghint" data-s="cH"></div></div>'
    +'<div><div class="glabel">What-if final<button type="button" class="wibtn sm" data-act="wiopen" data-c="'+c.id+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/></svg>Try a what-if</button></div><div class="gletter" data-s="wL"></div><div class="gpct" data-s="wP"></div><div class="ghint">'+as.replace(/^ · /,'')+'</div></div></div>'
    +'<div class="track" title="Share of the grade that has a score"><i data-s="bar"></i></div>';
}
const REDUCED=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function setTxt(el,t){
  if(!el||el.textContent===t) return;
  el.textContent=t;
  if(!REDUCED){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
}
function tweenPct(el,to){
  if(!el) return;
  const from=el._v; el._v=to;
  cancelAnimationFrame(el._raf);
  clearTimeout(el._to);
  if(REDUCED||to==null||from==null||from===to){ el.textContent=pctS(to); return; }
  const t0=performance.now(), D=420;
  clearTimeout(el._to); el._to=setTimeout(function(){ cancelAnimationFrame(el._raf); el.textContent=pctS(to); },D+80);
  (function step(now){
    const k=Math.min(1,(now-t0)/D), e=1-Math.pow(1-k,3);
    el.textContent=k<1?f3(from+(to-from)*e)+'%':pctS(to);
    if(k<1) el._raf=requestAnimationFrame(step);
  })(t0);
}
function mount(id,html){ const h=$(id); if(h&&!h.firstChild) h.innerHTML=html; return h; }
function updateSum(c){
  const h=mount('#sum',sumHtml(c)); if(!h) return;
  const cur=courseRes(c,'cur'), wi=courseRes(c,'whatif'), q=k=>h.querySelector('[data-s="'+k+'"]');
  setTxt(q('cL'),letterOf(c,cur.pct)); tweenPct(q('cP'),cur.pct);
  setTxt(q('cH'),Math.round(cur.progress*100)+'% of the grade is in');
  setTxt(q('wL'),letterOf(c,wi.pct)); tweenPct(q('wP'),wi.pct);
  q('bar').style.width=Math.round(cur.progress*100)+'%';
}
function updateProj(c){
  const h=mount('#projsum',projHtml(c)); if(!h) return;
  const pr=courseRes(c,'proj'), q=k=>h.querySelector('[data-s="'+k+'"]');
  setTxt(q('pL'),letterOf(c,pr.pct)); tweenPct(q('pP'),pr.pct);
}

/* ---------- render + refresh ---------- */
function render(quiet){
  const m=$('#main');
  document.body.classList.toggle('calview',view==='cal');
  const ct=document.getElementById('calTab'); if(ct) ct.classList.toggle('on',view==='cal');
  if(view==='cal') m.innerHTML=calView();
  else if(view==='home'||!getC(view)){ view='home'; m.innerHTML=homeView(); }
  else m.innerHTML=courseView(getC(view));
  if(!REDUCED&&!quiet){ m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter'); clearTimeout(m._et); m._et=setTimeout(function(){ m.classList.remove('enter'); },900); }
  if(view==='cal') calRedraw();
  refresh();
}
function refresh(){
  if(view==='home'){
    const h=$('#heroBox'); if(h) h.innerHTML=heroHtml();
    const g=$('#gpasum'); if(g) g.innerHTML=gpaSumHtml();
    const pb=$('#projbox'); if(pb) pb.innerHTML=projHomeHtml();
    return;
  }
  const c=getC(view); if(!c||gradesOff(c)) return;
  const rwn=$('#rwarn'); if(rwn) rwn.innerHTML=warnHtml(c);
  const trb=$('#trendBox'); if(trb) trb.innerHTML=trendInner(c);
  updateSum(c);
  updateProj(c);
  $('#need').innerHTML=needHtml(c);
  $$('.cpct').forEach(el=>{
    const k=c.cats[+el.dataset.k]; const r=catRes(k,'whatif',null);
    el.textContent=r?pctS(r.pct):'–';
  });
  $$('[data-rl]').forEach(el=>{ el.innerHTML=c.pooled?'':ruleLive(c,c.cats[+el.dataset.rl]); });
  const infos=c.cats.map(k=>c.pooled?null:dropInfo(k));
  $$('.grid[data-r]').forEach(row=>{
    const p=row.dataset.r.split('-'), k=c.cats[+p[0]], d=infos[+p[0]], s=d&&d.st[+p[1]], tg=row.querySelector('[data-tag]');
    row.classList.toggle('dropped',!!(s&&s.s==='drop'));
    if(!tg) return;
    let t='',cl='tag';
    if(s&&s.s==='drop'){ t=s.by!=null?'Replaced by '+k.items[s.by].n:'Dropped'; cl+=' d'; }
    else if(s&&s.s==='use'){ t='Replaces '+k.items[s.for].n; cl+=' u'; }
    else if(s&&s.s==='count'&&(d.dropped.length||d.pairs.length)){ t='Counts'; cl+=' c'; }
    tg.className=cl; tg.textContent=t;
  });
  $$('.rpct').forEach(el=>{
    const it=c.cats[+el.dataset.k].items[+el.dataset.i];
    el.classList.remove('wi','on');
    if(it.w!=null&&it.p>0){ el.textContent=pctS(100*it.w/it.p); el.classList.add('wi'); el.title=it.e!=null&&it.p>0?'What-if (earned: '+pctS(100*it.e/it.p)+')':'What-if'; }
    else if(it.e!=null&&it.p>0){ el.textContent=pctS(100*it.e/it.p); el.classList.add('on'); el.title=''; }
    else { el.textContent='–'; el.title=''; }
  });
}

/* ---------- sync through your own private GitHub repo ---------- */
const SYNC_KEY='gt-sync';
function syncCfg(){ try{ return JSON.parse(localStorage.getItem(SYNC_KEY)||'null'); }catch(e){ return null; } }
function setSyncCfg(c){ try{ if(c) localStorage.setItem(SYNC_KEY,JSON.stringify(c)); else localStorage.removeItem(SYNC_KEY); }catch(e){} }
const b64e=t=>btoa(unescape(encodeURIComponent(t)));
const b64d=t=>decodeURIComponent(escape(atob(String(t).replace(/\s/g,''))));
const dataCount=d=>(d&&Array.isArray(d.sems))?d.sems.reduce((a,x)=>a+(x.courses||[]).length,0):((d&&d.courses)?d.courses.length:0);
function ghFetch(cfg,method,body){
  return fetch('https://api.github.com/repos/'+cfg.repo+'/contents/'+(cfg.path||'grade-tracker-data.json'),{method:method,cache:'no-store',
    headers:{Authorization:'Bearer '+cfg.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},body:body?JSON.stringify(body):undefined});
}
async function pullRemote(cfg){
  const r=await ghFetch(cfg,'GET');
  if(r.status===404) return {none:true};
  if(r.status===401||r.status===403) throw new Error('GitHub refused the token. Check it has Contents read and write on that repo.');
  if(!r.ok) throw new Error('GitHub said '+r.status);
  const j=await r.json(); return {sha:j.sha,data:JSON.parse(b64d(j.content))};
}
async function pushRemote(cfg,sha){
  const r=await ghFetch(cfg,'PUT',{message:'Sync grades',content:b64e(JSON.stringify(W)),sha:sha||undefined});
  if(r.status===409||r.status===422) return {conflict:true};
  if(r.status===401||r.status===403||r.status===404) throw new Error('GitHub refused the write. Check the repo name and the token’s Contents read and write permission.');
  if(!r.ok) throw new Error('GitHub said '+r.status);
  const j=await r.json(); return {sha:j.content&&j.content.sha};
}
function adoptRemote(v){
  const keep=view; W=loadAny(v); W.ts=v.ts||0; S=W.sems.find(x=>x.id===W.active)||W.sems[0]; W.active=S.id;
  refreshPrior(); syncColors(); try{ localStorage.setItem(KEY3,JSON.stringify(W)); }catch(e){}
  if(keep!=='home'&&keep!=='cal'&&!getC(keep)) view='home'; editing=false; render(true);
}
let syncBusy=false, syncAgain=false, syncT=null;
function syncStatus(t,warn,busy){ const m=document.getElementById('syncmsg'); if(m) m.textContent=t; setStat(t,warn?'warn':(busy?'busy':'ok')); if(!warn&&!busy){ clearTimeout(statT); statT=setTimeout(function(){ setStat('',''); },1800); } }
function scheduleSync(){ if(!syncCfg()) return; clearTimeout(syncT); syncT=setTimeout(function(){ syncNow(); },2500); }
async function syncNow(){
  const cfg=syncCfg(); if(!cfg||!W) return;
  if(syncBusy){ syncAgain=true; return; } syncBusy=true;
  try{
    syncStatus('Syncing…',false,true);
    const rem=await pullRemote(cfg);
    if(rem.none){ const p=await pushRemote(cfg,null); if(p.conflict) syncAgain=true; }
    else{
      const rts=(rem.data&&rem.data.ts)||0, lts=W.ts||0;
      let useCloud=rts>lts;
      if(!cfg.synced&&hasData()&&dataCount(rem.data)>0&&rts!==lts){
        useCloud=confirm('This device and your cloud copy both have grades.\n\nOK: keep the CLOUD copy (replaces what is on this device).\nCancel: keep THIS device and overwrite the cloud copy.');
      }
      if(useCloud&&rts!==lts) adoptRemote(rem.data);
      else if(!useCloud&&(lts>rts||!cfg.synced)){ if(lts<=rts){ W.ts=Date.now(); try{ localStorage.setItem(KEY3,JSON.stringify(W)); }catch(e){} } const p=await pushRemote(cfg,rem.sha); if(p.conflict) syncAgain=true; }
    }
    cfg.synced=true; cfg.last=Date.now(); setSyncCfg(cfg); syncStatus('Synced');
    const lm=document.getElementById('synclast'); if(lm) lm.textContent='Last synced just now.';
  }catch(e){ syncStatus(navigator.onLine===false?'Offline. It will sync when you’re back online.':('Sync problem: '+(e&&e.message||e)),true); }
  finally{ syncBusy=false; if(syncAgain){ syncAgain=false; setTimeout(function(){ syncNow(); },400); } }
}
document.addEventListener('visibilitychange',function(){ if(!document.hidden&&syncCfg()) syncNow(); });
window.addEventListener('online',function(){ if(syncCfg()) syncNow(); });
function syncHtml(){
  const cfg=syncCfg();
  if(cfg) return '<details class="sync"><summary>Automatic sync · on</summary>'
    +'<p class="sub">Connected to <b>'+esc(cfg.repo)+'</b>. Changes upload a couple of seconds after you make them, and other devices pick them up when you open the app.</p>'
    +'<p class="sub" id="synclast">'+(cfg.last?'Last synced '+new Date(cfg.last).toLocaleString()+'.':'')+'</p>'
    +'<div class="addrow" style="padding-left:0"><button class="btn pri" data-act="syncnow">Sync now</button><button class="btn" data-act="syncoff">Disconnect this device</button></div><div class="sub" id="syncmsg"></div></details>';
  return '<details class="sync"><summary>Automatic sync (advanced)</summary>'
    +'<p class="sub">Keep your phone and computer in step through a private GitHub repo that only you can see. Nothing is sent anywhere until you connect.</p>'
    +'<ol class="steps"><li>On GitHub, create a new <b>private</b> repo, for example <code>grade-data</code>.</li>'
    +'<li>Go to GitHub, Settings, Developer settings, Fine-grained tokens. Make a token for <b>only that repo</b> with <b>Contents: Read and write</b>.</li>'
    +'<li>Paste the repo and the token below. Do the same on your other device with the same repo and token.</li></ol>'
    +'<div class="syncf"><input type="text" id="syncRepo" placeholder="your-username/grade-data" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="GitHub repo"><input type="password" id="syncTok" placeholder="github_pat_…" autocomplete="off" aria-label="GitHub token"><button class="btn pri" data-act="syncconnect">Connect</button></div>'
    +'<p class="sub">The token is stored only in this browser, so keep it limited to that one repo. If you ever lose a device, revoke the token on GitHub.</p><div class="sub" id="syncmsg"></div></details>';
}
const okFile=v=>!!(v&&typeof v==='object'&&(v.courses||v.sems||v.semesters||v.earlier));
const isSimple=v=>!!(v&&(v.semesters||v.earlier)&&!v.sems&&!v.courses);
function mergeSimple(v){
  const w=fromSimple(v); let jump=null, added=0;
  if(Array.isArray(v.semesters)&&v.semesters.length) w.sems.forEach(sm=>{
    const ex=W.sems.find(x=>x.name.trim().toLowerCase()===sm.name.trim().toLowerCase());
    if(ex){ if(!ex.start&&sm.start) ex.start=sm.start; if(!ex.end&&sm.end) ex.end=sm.end; sm.courses.forEach(c=>{ if(!ex.courses.some(y=>y.name.trim().toLowerCase()===c.name.trim().toLowerCase())){ ex.courses.push(c); added++; } }); if(w.active===sm.id) jump=ex.id; }
    else { W.sems.push(sm); added+=sm.courses.length; if(w.active===sm.id) jump=sm.id; }
  });
  W.prior=(W.prior||[]).concat(w.prior); setHistory(W);
  W.active=jump||W.active; S=W.sems.find(x=>x.id===W.active); view='home'; editing=false; refreshPrior(); syncColors(); save(); render(); window.scrollTo(0,0);
  setStat('Added '+added+' class'+(added===1?'':'es')+(w.prior.length?' and '+w.prior.length+' earlier semester'+(w.prior.length===1?'':'s'):''),'ok');
}
function importFile(v){
  if(isSimple(v)&&hasData()){ mergeSimple(v); return; }
  if(!confirmReplace()) return; adoptState(v); setStat('Grades loaded','ok');
}
function hasData(){ return !!(W&&W.sems.some(sm=>sm.courses.length)); }
function confirmReplace(){ return !hasData()||confirm('Loading a file replaces everything saved in this browser. Download a backup first if you want to keep it. Load the file?'); }
function renameLabel(k){
  let cur='', set;
  if(k[0]==='p'){ const t=W.prior[+k.slice(1)]; if(!t) return; cur=t.short||t.t; set=function(v){ t.short=v; }; }
  else { const sm=W.sems.find(x=>x.id===k.slice(1)); if(!sm) return; cur=sm.short||sm.name; set=function(v){ sm.short=v; }; }
  openModal('Graph label','<label class="f">Label on the graph<input name="name" type="text" value="'+esc(cur)+'" required></label>','Save',function(v){ const n=(v.name||'').trim(); if(!n) return false; set(n); save(); render(true); });
}
function inlineEditHeader(el){
  const c=getC(view); if(!c) return; const box=el.closest('.chead>div'); if(!box||box.querySelector('input')) return;
  const first=el.tagName==='H1'?'cname':'ccode';
  box.innerHTML='<input class="inl nm" type="text" data-f="cname" data-c="'+c.id+'" value="'+esc(c.name)+'" aria-label="Class name"><div class="inlr"><input class="inl" type="text" data-f="ccode" data-c="'+c.id+'" value="'+esc(c.code)+'" placeholder="Code" aria-label="Code"><input class="inl" type="text" data-f="cprof" data-c="'+c.id+'" value="'+esc(c.prof)+'" placeholder="Professor" aria-label="Professor"></div>';
  const inp=box.querySelector('[data-f='+first+']'); inp.focus(); inp.select();
  box.addEventListener('focusout',function(){ setTimeout(function(){ if(box.contains(document.activeElement)) return; box.innerHTML='<h1>'+esc(c.name)+'</h1><p>'+esc(subOf(c))+'</p>'; },0); });
  box.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key==='Escape'){ e.preventDefault(); document.activeElement.blur(); } });
}
document.addEventListener('dblclick',function(ev){
  const t=ev.target.closest('text.ed'); if(t){ renameLabel(t.dataset.k); return; }
  const h=ev.target.closest('.chead h1,.chead p'); if(h) inlineEditHeader(h);
});
/* ---------- events ---------- */
document.addEventListener('wheel',function(ev){ const a=document.activeElement; if(a&&a.type==='number'&&ev.target===a) a.blur(); },{passive:true});
document.addEventListener('input',function(ev){
  const t=ev.target, f=t.dataset&&t.dataset.f; if(!f) return;
  const c=t.dataset.c?getC(t.dataset.c):null;
  if(f==='e'||f==='w'||f==='p'){ const it=c.cats[+t.dataset.k].items[+t.dataset.i]; it[f]=num(t.value); if(f==='p'&&it.p==null) it.p=0; }
  else if(f==='n'){ c.cats[+t.dataset.k].items[+t.dataset.i].n=t.value; }
  else if(f==='cw'){ c.cats[+t.dataset.k].w=num(t.value)||0; }
  else if(f==='credits'){ c.credits=num(t.value); document.querySelectorAll('input[data-f=credits][data-c="'+c.id+'"]').forEach(i=>{ if(i!==t) i.value=t.value; }); }
  else if(f==='ece'||f==='ecw'){ c.ec[t.dataset.u][f==='ece'?'e':'w']=num(t.value); }
  else if(f==='ectotal'){ c.ec.total=num(t.value); }
  else if(f==='eccat'){ c.ec.cat=t.value===''?null:+t.value; save(); render(true); return; }
  else if(f==='fill'){ c.fill=num(t.value)||0; const fv=document.getElementById('fillv'); if(fv) fv.textContent=c.fill+'%'; }
  else if(f==='cname'){ c.name=t.value||'Untitled class'; const h=document.querySelector('.chead h1'); if(h) h.textContent=c.name; }
  else if(f==='ccode'||f==='cprof'){ c[f==='ccode'?'code':'prof']=t.value; const p=document.querySelector('.chead p'); if(p) p.textContent=subOf(c); }
  else if(f==='cnotes'){ c.notes=t.value.split('\n').map(x=>x.trim()).filter(Boolean); }
  else if(f==='pooled'){ c.pooled=t.value==='1'; save(); render(true); return; }
  else if(f==='scale'){ if(t.value==='custom'){ if(!c.cuts) c.cuts=scaleOf(c).map(r=>r.slice()); } else { c.cuts=null; c.scale=t.value; c.scaleAssumed=false; } save(); render(true); return; }
  else if(f==='cut'){ if(!c.cuts) c.cuts=scaleOf(c).map(r=>r.slice()); const v=num(t.value); if(v!=null) c.cuts[+t.dataset.i][+t.dataset.col]=v; }
  else if(f==='catname'){ c.cats[+t.dataset.k].name=t.value||'Category'; }
  else if(f==='catrule'){ const k=c.cats[+t.dataset.k]; k.rule=t.value; if(k.rule==='best'&&!k.n) k.n=Math.max(1,k.items.filter(i=>!i.opt).length-1); if(k.rule==='cap'&&!k.cap) k.cap=0.8; save(); render(true); return; }
  else if(f==='catdrop'){ c.cats[+t.dataset.k].drop=Math.max(0,Math.floor(num(t.value)||0)); }
  else if(f==='catn'){ c.cats[+t.dataset.k].n=Math.max(1,Math.floor(num(t.value)||1)); }
  else if(f==='catcap'){ const v=num(t.value); c.cats[+t.dataset.k].cap=(v>0?v/100:0.8); }
  else if(f==='catrp'){ c.cats[+t.dataset.k].rp=t.checked; save(); render(true); return; }
  else if(f==='qbonus'){ c.cats[+t.dataset.k].bonus=num(t.value)||0; }
  else if(f==='ccurve'){ c.curve=num(t.value)||0; }
  else if(f==='reqmin'){ const q=c.reqs[+t.dataset.q]; if(q) q.min=num(t.value)||0; }
  else if(f==='reqcat'){ const q=c.reqs[+t.dataset.q]; if(q) q.cat=+t.value; }
  else if(f==='reqcap'){ const q=c.reqs[+t.dataset.q]; if(q) q.cap=t.value; }
  else if(f==='basecr'||f==='basegpa'){ W.base=W.base||{cr:null,gpa:null}; W.base[f==='basecr'?'cr':'gpa']=num(t.value); refreshPrior(); }
  else if(f==='nogpa'){ c.noGpa=!t.checked; save(); render(true); return; }
  else if(f==='nograde'){ c.noGrades=!t.checked; save(); render(true); return; }
  else if(f==='pick'){ S.gpaPick[c.id]=t.value; }
  else if(f==='mst'||f==='men'||f==='mloc'){ const m=c.meets[+t.dataset.mi]; if(m) m[f==='mst'?'st':f==='men'?'en':'loc']=t.value; }
  else if(f==='semstart'||f==='semend'){ S[f==='semstart'?'start':'end']=t.value; save(); calRedraw(); return; }
  else if(f==='transfer'){ W.transfer=Math.max(0,num(t.value)||0); }
  if(f==='e'){
    const row=t.closest('.grid'), du=row&&row.querySelector('[data-due]');
    const it=c.cats[+t.dataset.k].items[+t.dataset.i];
    if(du){ du.classList.toggle('late',!!(it.d&&it.d<TODAY&&it.e==null)); }
  }
  save(); refresh();
});
function setHash(){ try{ location.hash=(view==='home'?'':view); }catch(e){} }
const AI_PROMPT=`I'm going to give you my syllabi and/or my grades (PDFs, screenshots, spreadsheets, Canvas exports, or pasted text). Turn everything into ONE JSON file for my Tally web app, and give it back as a downloadable file named grades.json (or, if you can't make files, as a single code block I can save as grades.json).

What to do:
- For each syllabus: create the class, and read its grading policy carefully. Pull out every grade category and its weight, how scores are combined (average, total points, best N, dropped lowest scores, a final that replaces the lowest exam, optional extra work that replaces a low score, capped points), the grading scale cutoffs, the credits, any extra credit, and any rules worth remembering (late policy, attendance, no make-ups). Put those rules in the class "notes" as short plain sentences.
- Create every graded item you can find in the syllabus or schedule (each exam, quiz, homework, project, reflection) as an item with its due date, "earned": null, and its point value ("outOf"). If the syllabus doesn't give points, use 100.
- If I also give you grades, fill in "earned" for the items they match. Don't guess scores: if a score isn't graded or isn't given, use null.
- If the syllabus has other grading rules, add them: a category's "dropHighest" (number), "curvePoints" (points added to a category, like 3), a class's "curvePercent" (points added to the final percent), a class's "rounding" ("nearest" if the final percent rounds to the nearest whole number, or "up" if it always rounds up), and "requirements" such as [{ "category": "Final exam", "minPercent": 60, "otherwiseMaxGrade": "D" }] when the class caps your grade unless you hit a minimum. Leave out anything the syllabus doesn't say.
- If the syllabus or schedule gives when each class meets (days, start and end time in 24-hour format, and the room), put it in "meetings" (one entry per different meeting pattern, such as a lecture and a lab). If it gives the semester's first and last day, put them in "startDate" and "endDate" (YYYY-MM-DD). Leave these out if they aren't given.
- If something is unclear or the syllabus contradicts itself (weights that don't add to 100, a missing scale), ask me before you write the file.

Use exactly this format:

{
  "semesters": [
    {
      "name": "Fall 2026",
      "startDate": "2026-08-24",
      "endDate": "2026-12-11",
      "current": true,
      "finished": false,
      "classes": [
        {
          "name": "Intro to Biology",
          "code": "BIOSC 0150",
          "professor": "Dr. Smith",
          "credits": 3,
          "meetings": [{ "days": ["Mon", "Wed"], "start": "09:30", "end": "10:45", "location": "Room 101" }],
          "scale": "plus-minus",
          "categories": [
            {
              "name": "Homework",
              "weight": 20,
              "scoring": "average",
              "dropLowest": 1,
              "items": [
                { "name": "HW 1", "earned": 9, "outOf": 10 },
                { "name": "HW 2", "earned": null, "outOf": 10, "due": "2026-09-30" }
              ]
            },
            {
              "name": "Exams",
              "weight": 80,
              "scoring": "average",
              "replaceLowestWithFlagged": true,
              "items": [
                { "name": "Midterm", "earned": 80, "outOf": 100 },
                { "name": "Final", "earned": null, "outOf": 100, "replacesLowest": true }
              ]
            }
          ]
        }
      ]
    }
  ],
  "earlier": [
    { "name": "Spring 2026", "classes": [ { "name": "Calculus I", "credits": 4, "grade": "A-" } ] }
  ]
}

Rules:
- "weight" is the category's share of the final grade in percent (they should add up to 100).
- "scoring" is one of: "average" (each item counts equally), "total" (add up all points), "best" (also add "bestN", how many scores count), "capped" (also add "fullCreditPercent", e.g. 80 means 80% of all points is full credit), or "optionalReplaceLowest" (items marked "optional": true replace the lowest regular score if higher).
- "dropLowest" is how many of the lowest scores get dropped (average or total only).
- "scale" is "plus-minus" (A+, A, A-, B+ ...) or "plain" (A, B, C). If the syllabus lists its own cutoffs, add "cutoffs": [ {"letter":"A","min":93,"gpa":4}, ... ].
- If a class is graded by total points instead of weighted categories, set "totalPointsGrading": true and use one category.
- Semesters where I only know the final letter grades go under "earlier". Semesters where I have the full breakdown go under "semesters". Mark this semester "current": true.
- "due" is a date like "2026-09-30". "notes" is an array of short strings.
- Optional extra credit per class: "extraCredit": { "points": 2, "percent": null, "totalPoints": 400 }.`;
function aiCard(open){
  return '<button type="button" class="aicta" data-act="setupai"><span class="soi" style="--c:#7B5CFF">✦</span><span><b>Set up classes with AI</b><small>Give your syllabi to ChatGPT or Claude and Tally builds every class for you.</small></span><span class="go">Start →</span></button>';
}
function emptyHome(){
  return semTitle()
    +(PRIOR_CR?'<div id="heroBox">'+heroHtml()+'</div>':'')
    +'<section class="welc"><h2>Welcome to Tally.</h2><p>Set up your semester in about a minute. No account, nothing to install. Everything stays on this device.</p>'
    +'<div class="onbrow"><button class="btn pri big" data-act="setupplay">Start setup</button><button class="btn big" data-act="newclass">Add a class</button><label class="btn big" style="cursor:pointer">Upload a grade file<input type="file" id="bkfile2" accept=".json,application/json" hidden></label><button class="btn big" data-act="tourplay">Watch the tour</button></div></section>'
    +aiCard(true)+backupHtml(true);
}
function baseHtml(){
  const b=W.base||{};
  return '<div class="card base"><div class="bl"><b>Before this semester</b><small>Optional. Adds your earlier credits and GPA to the cumulative GPA.</small></div>'
    +'<div class="basectl"><label><input type="number" step="any" min="0" inputmode="decimal" data-f="basecr" value="'+(b.cr==null?'':b.cr)+'" placeholder="0" aria-label="Earlier credits"> credits</label>'
    +'<label><input type="number" step="0.001" min="0" max="4" inputmode="decimal" data-f="basegpa" value="'+(b.gpa==null?'':b.gpa)+'" placeholder="3.50" aria-label="Earlier GPA"> GPA</label></div></div>';
}
function semTitle(){
  return '<h1 class="page-h"><button class="semtitle" id="semBtn" aria-haspopup="menu" aria-expanded="false">'+esc(S.name)+'<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 1.5 6 6l4.5-4.5"/></svg></button></h1>';
}
/* ---------- modal + semester menu ---------- */
function trapFocus(root){
  const prev=document.activeElement;
  const kd=function(e){
    if(e.key!=='Tab') return; const act=document.activeElement; if(act&&act.closest&&act.closest('.dpop,.tpop')) return;
    const f=[...root.querySelectorAll('a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary')].filter(el=>el.offsetParent!==null||el===document.activeElement);
    if(!f.length) return; const a=f[0], z=f[f.length-1];
    if(!root.contains(act)){ e.preventDefault(); a.focus(); }
    else if(e.shiftKey&&act===a){ e.preventDefault(); z.focus(); }
    else if(!e.shiftKey&&act===z){ e.preventDefault(); a.focus(); }
  };
  document.addEventListener('keydown',kd,true);
  return function(){ document.removeEventListener('keydown',kd,true); if(prev&&prev.focus&&document.contains(prev)){ try{ prev.focus({preventScroll:true}); }catch(e){} } };
}
function openModal(title,body,okLabel,onOk){
  closeModal();
  const m=document.createElement('div'); m.className='modal'; m.id='modal';
  m.innerHTML='<div class="mbox" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><h3>'+esc(title)+'</h3><form>'+body+'<div class="mact"><button type="button" class="btn" data-m="cancel">Cancel</button><button type="submit" class="btn pri">'+esc(okLabel)+'</button></div></form></div>';
  document.body.appendChild(m); m._rel=trapFocus(m); requestAnimationFrame(function(){ m.classList.add('open'); });
  const f=m.querySelector('form'), first=f.querySelector('input:not([type=checkbox]),select'); if(first){ first.focus(); if(first.select) first.select(); }
  f.addEventListener('submit',function(ev){ ev.preventDefault(); const v={}; new FormData(f).forEach(function(val,k){ v[k]=val; }); if(onOk(v)!==false) closeModal(); });
  m.addEventListener('click',function(ev){ if(ev.target===m||(ev.target.dataset&&ev.target.dataset.m==='cancel')) closeModal(); });
}
function closeModal(){ const m=document.getElementById('modal'); if(m){ if(m._rel) m._rel(); m.remove(); } }
document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ if(document.querySelector('.tpop,.dpop')) return; closeModal(); closeSemMenu(); } });
function setActive(id){
  const keepCal=view==='cal'; calWk=null; calDay=null;
  W.active=id; S=W.sems.find(x=>x.id===id); editing=false; view=keepCal?'cal':'home'; refreshPrior(); applyAcc(); save(); setHash(); render(); window.scrollTo(0,0);
}
function addSem(name,copy){
  const sm={id:uid(),name:name,done:false,start:'',end:'',events:[],off:[],courses:[],gpaPick:{}};
  if(copy) sm.courses=S.courses.map(function(c){
    const n=JSON.parse(JSON.stringify(c)); n.id=uid(); n.color=ACC.cls[c.id]||c.color; delete n.cuts; if(c.cuts) n.cuts=c.cuts.map(r=>r.slice());
    delete n.cv; n.cats.forEach(k=>{ delete k.cid; delete k.cw; delete k.cdrop; delete k.cdrophi; k.items.forEach(it=>{ it.e=null; it.w=null; it.d=null; it.dl=''; delete it.cid; delete it.cn; delete it.cs; }); });
    n.ec=ecShape({label:c.ec.label,max:c.ec.max,mu:c.ec.mu}); return n;
  });
  W.sems.push(sm); setActive(sm.id); syncColors();
}
const semPop=document.createElement('div'); semPop.className='pop menu'; semPop.id='semPop'; semPop.setAttribute('role','menu'); document.body.appendChild(semPop);
function closeSemMenu(){ semPop.classList.remove('open'); const b=document.getElementById('semBtn'); if(b) b.setAttribute('aria-expanded','false'); }
function openSemMenu(btn){
  semPop.innerHTML='<h4>Semesters</h4>'+W.sems.map(sm=>'<button type="button" class="mi'+(sm.id===W.active?' on':'')+'" data-m="go" data-id="'+sm.id+'"><span>'+esc(sm.name)+'</span><small>'+sm.courses.length+' class'+(sm.courses.length===1?'':'es')+''+'</small></button>').join('')
    +'<div class="msep"></div><button type="button" class="mi act" data-m="new">＋ New semester</button><button type="button" class="mi act" data-m="rename">Rename this semester</button>'
    +(W.sems.length>1?'<button type="button" class="mi act danger" data-m="del">Delete this semester</button>':'');
  const r=btn.getBoundingClientRect(); semPop.style.top=(r.bottom+10)+'px'; semPop.style.left=Math.max(16,r.left)+'px';
  semPop.classList.add('open'); btn.setAttribute('aria-expanded','true');
}
document.addEventListener('click',function(ev){
  const sb=ev.target.closest('#semBtn');
  if(sb){ ev.stopPropagation(); if(semPop.classList.contains('open')) closeSemMenu(); else openSemMenu(sb); return; }
  if(semPop.classList.contains('open')&&!semPop.contains(ev.target)) closeSemMenu();
},true);
semPop.addEventListener('click',function(ev){
  const b=ev.target.closest('[data-m]'); if(!b) return; const m=b.dataset.m;
  if(m==='done') return;
  closeSemMenu();
  if(m==='go'){ if(b.dataset.id!==W.active) setActive(b.dataset.id); }
  else if(m==='new'){
    openModal('New semester','<label class="f">Name<input name="name" type="text" value="'+esc(defaultSemName()===S.name?'Next semester':defaultSemName())+'" required></label>','Create',function(v){ const n=(v.name||'').trim(); if(!n) return false; addSem(n,false); });
  }
  else if(m==='rename'){
    openModal('Rename semester','<label class="f">Name<input name="name" type="text" value="'+esc(S.name)+'" required></label>','Save',function(v){ const n=(v.name||'').trim(); if(!n) return false; S.name=n; save(); render(true); });
  }
  else if(m==='del'){
    if(W.sems.length<2){ alert('Tally needs at least one semester. Rename this one instead.'); return; }
    const nm=S.name; closeSemMenu(); doDel('Deleted “'+nm+'”',function(){ const i=W.sems.indexOf(S); W.sems.splice(i,1); setActive(W.sems[Math.max(0,i-1)].id); },true);
  }
});
semPop.addEventListener('change',function(ev){ const t=ev.target; if(t.dataset&&t.dataset.m==='done'){ S.done=t.checked; refreshPrior(); save(); refresh(); } });
function newClassModal(){
  openModal('Add a class',
    '<label class="f">Class name<input name="name" type="text" placeholder="e.g. Organic Chemistry" required></label>'
    +'<div class="two"><label class="f">Code (optional)<input name="code" type="text" placeholder="CHEM 0310"></label><label class="f">Professor (optional)<input name="prof" type="text" placeholder="Dr. Smith"></label></div>'
    +'<label class="f">Credits<input name="credits" type="number" step="0.5" min="0" placeholder="3"></label>'
    +'<label class="f">How is it graded?<select name="kind"><option value="weighted">Weighted categories (homework 30%, exams 70%…)</option><option value="points">Total points</option></select></label>'
    +'<label class="f">Start with<select name="tpl"><option value="hmf">Homework, Midterm, Final</option><option value="blank">One blank category</option></select></label>'
    +'<label class="swrow"><span>Count in GPA<small style="display:block;font-weight:500;font-size:12.5px;color:var(--mut);margin-top:2px">Turn off for pass/fail or audit classes.</small></span><input type="checkbox" class="swi" name="gpa" id="ncGpa" checked><i></i></label>'
    +'<label class="swrow" id="ncTrack" style="display:none"><span>Track grades<small style="display:block;font-weight:500;font-size:12.5px;color:var(--mut);margin-top:2px">Turn off to hide scores and grades completely.</small></span><input type="checkbox" class="swi" name="grades" checked><i></i></label>',
    'Add class',function(v){
      const name=(v.name||'').trim(); if(!name) return false;
      const mk=(n,w,rule,items)=>({name:n,w:w,rule:rule,items:items});
      let cats, pooled=false;
      if(v.kind==='points'){ pooled=true; cats=[mk('Assignments',100,'sum',[I('Assignment 1',100),I('Assignment 2',100)])]; }
      else if(v.tpl==='hmf') cats=[mk('Homework',30,'avg',[I('Homework 1',100),I('Homework 2',100)]),mk('Midterm',30,'avg',[I('Midterm',100)]),mk('Final exam',40,'avg',[I('Final exam',100)])];
      else cats=[mk('Assignments',100,'avg',[I('Assignment 1',100)])];
      const c=normCourse({name:name,code:(v.code||'').trim(),prof:(v.prof||'').trim(),credits:num(v.credits),pooled:pooled,scale:'std',cats:cats,noGpa:v.gpa!=='on',noGrades:v.gpa!=='on'&&v.grades!=='on'});
      c.color=nextColor(); S.courses.push(c); syncColors(); view=c.id; editing=true; save(); setHash(); render(); window.scrollTo(0,0);
    });
  const g=document.getElementById('ncGpa'), tr=document.getElementById('ncTrack');
  if(g&&tr) g.addEventListener('change',function(){ tr.style.display=g.checked?'none':''; });
}
