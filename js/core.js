"use strict";
/* ---------- grade scales ---------- */
const STD=[[97,'A+',4],[93,'A',4],[90,'A-',3.75],[87,'B+',3.25],[83,'B',3],[80,'B-',2.75],[77,'C+',2.25],[73,'C',2],[70,'C-',1.75],[67,'D+',1.25],[63,'D',1],[60,'D-',0.75],[0,'F',0]];
const S370=[[98,'A+',4],[93,'A',4],[90,'A-',3.75],[88,'B+',3.25],[83,'B',3],[80,'B-',2.75],[78,'C+',2.25],[73,'C',2],[70,'C-',1.75],[68,'D+',1.25],[63,'D',1],[60,'D-',0.75],[0,'F',0]];
const S1017=[[98,'A+',4],[93,'A',4],[90,'A-',3.75],[88,'B+',3.25],[82,'B',3],[80,'B-',2.75],[78,'C+',2.25],[72,'C',2],[70,'C-',1.75],[68,'D+',1.25],[60,'D',1],[0,'F',0]];
const PLAIN=[[90,'A',4],[80,'B',3],[70,'C',2],[60,'D',1],[0,'F',0]];
const SCALES={std:STD,plain:PLAIN,s370:S370,s1017:S1017};
const scaleOf=c=>(c.cuts&&c.cuts.length)?c.cuts:(SCALES[c.scale]||STD);
const COLORS={tob:'#FF7A59',syn:'#7B5CFF',fna:'#19C3A5',ecl:'#B8E651',eco:'#FFC233',hps:'#4C92FF'};
const LETTERS=['A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F'];
const GPAOF={'A+':4,'A':4,'A-':3.75,'B+':3.25,'B':3,'B-':2.75,'C+':2.25,'C':2,'C-':1.75,'D+':1.25,'D':1,'D-':0.75,'F':0};

/* ---------- earlier semesters ---------- */
let PRIOR=[], PRIOR_CR=0, PRIOR_QP=0, OLD_PCT={}, OLD_X=[], HIST={};
function setHistory(src){
  const ok=a=>Array.isArray(a)&&a.every(t=>t&&Array.isArray(t.c));
  PRIOR=(src&&ok(src.prior))?src.prior:[];
  OLD_PCT=(src&&src.oldPct&&typeof src.oldPct==='object')?src.oldPct:{};
  OLD_X=(src&&Array.isArray(src.oldX))?src.oldX:[];
  HIST=(src&&src.history&&typeof src.history==='object')?src.history:{};
  PRIOR_CR=PRIOR.reduce((a,s)=>a+s.c.reduce((b,x)=>b+x[1],0),0);
  PRIOR_QP=PRIOR.reduce((a,s)=>a+s.c.reduce((b,x)=>b+x[1]*x[2],0),0);
}

/* ---------- course definitions ---------- */
const I=(n,p,d,dl,opt)=>({n:n,p:p,e:null,w:null,d:d||null,dl:dl||'',opt:!!opt});
const G=(n,p,e,d)=>{const x=I(n,p,d);x.e=e;return x;};

function baseDefaults(){
  const mods=[['Module 1','2026-09-12','2026-09-14'],['Module 2','2026-09-30','2026-10-02'],['Module 3','2026-10-24','2026-10-26'],['Module 4','2026-11-14','2026-11-16'],['Module 5','2026-12-07','2026-12-09']];
  return {v:1,ts:0,gpaPick:{},courses:[
  {id:'tob',name:'Technologies of the Body',code:'ENGFLM 0585 · Hebert',credits:null,scale:'std',scaleAssumed:true,pooled:false,lenience:0,fill:90,target:'A',ec:null,
   notes:[
    'Weekly reflections: 13 are offered but only 10 count, so each one is 5% of your grade. Pick the ones you skip.',
    'Two absences are allowed. More than two starts to hurt your grade. Regular lateness counts as an absence.',
    'Late work isn’t accepted without prior approval from Dr. Hebert.',
    'Creative Assignment #1 was due Sep 22–29, #2 Oct 27–Nov 3, #3 on Dec 1.',
    'The syllabus has no grading scale, so the standard +/− scale is used here.'],
   cats:[
    {name:'Participation and attendance',w:20,rule:'avg',items:[I('Participation and attendance',100)]},
    {name:'Creative Assignment #1 (flipbook / zoetrope)',w:10,rule:'avg',items:[I('Creative Assignment #1',100,'2026-09-29','due Sep 22–29')]},
    {name:'Creative Assignment #2 (video project)',w:10,rule:'avg',items:[I('Creative Assignment #2',100,'2026-11-03','due Oct 27–Nov 3')]},
    {name:'Creative Assignment #3 (stop-motion short)',w:10,rule:'avg',items:[I('Creative Assignment #3',100,'2026-12-01')]},
    {name:'Weekly reflections (best 10 of 13)',w:50,rule:'best',n:10,items:[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n=>I('Reflection '+n,100))}
   ]},
  {id:'syn',name:'Synaptic Transmission',code:'NROSCI 1017 · Fraser',credits:null,scale:'s1017',scaleAssumed:false,pooled:false,lenience:0,fill:90,target:'A',ec:null,
   notes:[
    'Exams 1–3 are 20% each and the final is 30%. No exams are dropped, and there are no make-ups for unexcused absences.',
    'The final has a Unit 4 section plus a cumulative section.',
    'Four quizzes are 2.5% each. Optional case studies can replace a lower quiz if the case study score is higher. A quiz you skipped (zero) isn’t swapped.',
    'Exam dates aren’t in the syllabus. Check Canvas and add them to the item names if you want them here.'],
   cats:[
    {name:'Exam 1',w:20,rule:'avg',items:[I('Exam 1',100)]},
    {name:'Exam 2',w:20,rule:'avg',items:[I('Exam 2',100)]},
    {name:'Exam 3',w:20,rule:'avg',items:[I('Exam 3',100)]},
    {name:'Final exam',w:30,rule:'avg',items:[I('Final exam',100)]},
    {name:'Quizzes (and optional case studies)',w:10,rule:'swap',items:[I('Quiz 1',100),I('Quiz 2',100),I('Quiz 3',100),I('Quiz 4',100),I('Case study 1',100,null,'',true),I('Case study 2',100,null,'',true)]}
   ]},
  {id:'fna',name:'Functional Neuroanatomy',code:'NROSCI 1011 · Fanselow',credits:null,scale:'std',scaleAssumed:false,pooled:true,lenience:0,fill:90,target:'A',
   ec:{label:'Extra points (in-class exercises, online modules)',unit:'pts',val:null},
   notes:[
    'Graded on total points out of 370. Nothing is dropped.',
    'Anatomy quizzes can be taken twice. General quizzes once. All quizzes and case studies close at 11:59:00 PM.',
    'Extra points come from in-class exercises (in person only) and some online modules. They only help.',
    'The syllabus lists the Module 5 exam as Mon 12/9, 2:00–2:50 AM. Dec 9, 2026 is a Wednesday, so confirm the date and time on Canvas.'],
   cats:[
    {name:'Anatomy quizzes',w:25,rule:'sum',items:mods.map(m=>I(m[0]+' anatomy quiz',5,m[1]))},
    {name:'General quizzes',w:25,rule:'sum',items:mods.map(m=>I(m[0]+' general quiz',5,m[1]))},
    {name:'Case studies',w:20,rule:'sum',items:mods.map(m=>I(m[0]+' case study',4,m[1]))},
    {name:'Module exams',w:300,rule:'sum',items:mods.map(m=>I(m[0]+' exam',60,m[2]))}
   ]},
  {id:'ecl',name:'Ecology Lab',code:'BIOSC 0373 · Olmsted',credits:null,scale:'std',scaleAssumed:false,pooled:false,lenience:0.5,fill:90,target:'A',
   ec:{label:'Extra credit: research talks (+1 point each, max 3)',unit:'pct',val:null,max:3},
   notes:[
    'Final grades within 0.5% of the next letter round up. The letter shown here already counts that.',
    'Late work loses 10% and is accepted until the last day of class (work from the first 8 weeks was due by Oct 30). Failing submitted work is floored at 50%.',
    'Two unexcused absences and you can’t pass the class.',
    'Extra credit talks need a one-page summary within a week of attending.',
    'Dates for notebook checks, drafts and discussions are the week they’re due. Check the schedule for the exact day.'],
   cats:[
    {name:'Field notebook / datasheet checks',w:15,rule:'avg',items:[I('Notebook check 1',100,'2026-09-25','week of Sep 21'),I('Notebook check 2',100,'2026-10-23','week of Oct 19'),I('Notebook check 3',100,'2026-11-20','week of Nov 16')]},
    {name:'Mini-manuscripts (final drafts)',w:20,rule:'avg',items:[I('Mini-manuscript 1 final',100,'2026-10-16','week of Oct 12'),I('Mini-manuscript 2 final',100,'2026-11-20','week of Nov 16')]},
    {name:'Paper discussions',w:10,rule:'avg',items:[I('Paper discussion 1',100,'2026-10-02','week of Sep 28'),I('Paper discussion 2',100,'2026-10-23','week of Oct 19')]},
    {name:'Assignments and activities',w:25,rule:'avg',items:[I('Assignments and activities (running average)',100)]},
    {name:'Student-led research project',w:15,rule:'avg',items:[I('Research project',100)]},
    {name:'Final presentation',w:15,rule:'avg',items:[I('Final presentation',100,'2026-12-04','week of Nov 30')]}
   ]},
  {id:'eco',name:'Ecology',code:'BIOSC 0370 · Lehrer',credits:null,scale:'s370',scaleAssumed:false,pooled:false,lenience:0,fill:90,target:'A',ec:null,
   notes:[
    'Only your best 3 of 4 exams count (115 points each, 69% of the grade). A skipped exam is fine, but a zero from cheating still counts.',
    'Participation (Top Hat): 75 of 100 points is full credit. Homework: 80 of 100 points is full credit. Extra points beyond that don’t carry over.',
    'For both, enter points earned and points possible so far, and the full-credit line is applied for you.',
    'Late homework loses 10% per day for up to 10 days. Exams are 9/15, 10/6 and 11/5. The final date isn’t set yet.'],
   cats:[
    {name:'Exams (best 3 of 4)',w:69,rule:'best',n:3,items:[G('Exam 1',115,null,'2026-09-15'),G('Exam 2',115,null,'2026-10-06'),G('Exam 3',115,null,'2026-11-05'),I('Final exam',115,null,'date to be announced')]},
    {name:'Participation (Top Hat)',w:15,rule:'cap',cap:0.75,items:[G('Class 1 · Introduction to Ecology',3,null),G('Class 2 · Evolutionary Ecology',3,null),G('Class 3 · Global Climates',4,null),G('Class 5 · Terrestrial Biomes',2,null),G('Class 6 · Aquatic Biomes',4,null),G('Class 8 · Aquatic adaptations',4,null),G('Class 10 · Variable environments',4,null),G('Class 11 · Life Histories',4,null),G('Class 12 · Reproductive Strategies',4,null),G('Class 14 · Social Behaviors',4,null),G('Class 15 · Population Distributions',4,null),G('Class 18 · Population Dynamics',6,null),G('Class 19 · Predation and Herbivory',4,null),G('Class 20 · Predation and Herbivory',4,null),G('Class 23 · Community Structure, part 1',2,null),G('Class 24 · Community Succession',4,null)]},
    {name:'Homework (Achieve)',w:16,rule:'cap',cap:0.8,items:[G('Chapter 1 homework',4,null,'2026-08-30'),G('Chapter 5 homework',4,null,'2026-08-30'),G('Post-debate reflection',4,null,'2026-09-04'),G('Chapter 2 homework',4,null,'2026-09-06'),G('Chapter 3 homework',4,null,'2026-09-06'),G('Biome climate diagram',2,null,'2026-09-08'),G('Chapter 4 homework',7,null,'2026-09-13'),G('Chapter 6 homework',7,null,'2026-09-20'),G('Class 9 · Terrestrial adaptations',4,null,'2026-09-22'),G('Chapter 7 homework',4,null,'2026-09-27'),G('Chapter 8 homework',4,null,'2026-09-27'),G('Chapter 9 homework',4,null,'2026-10-04'),G('Chapter 10 homework',4,null,'2026-10-04'),G('Chapter 11 homework',7,null,'2026-10-11'),G('Class 16 · Population growth',5,null,'2026-10-15'),G('Chapter 12 homework',4,null,'2026-10-18'),G('Chapter 13 homework',4,null,'2026-10-18'),G('Class 17 · Population dynamics',6,null,'2026-10-20'),G('Chapter 14 homework',7,null,'2026-10-25'),G('Chapter 15 homework',7,null,'2026-11-01'),G('Class 21 · Competition',8,null,'2026-11-04'),G('Chapter 17 homework',7,null,'2026-11-08'),G('Class 23 · Community structure, part 2',2,null,'2026-11-12'),G('Chapter 19 homework',4,null,'2026-11-15'),G('Chapter 20 homework',4,null,'2026-11-15')]}
   ]},
  {id:'hps',name:'Mind and Medicine',code:'HPS 0612 · Atanasova',credits:null,scale:'std',scaleAssumed:true,pooled:false,lenience:0,fill:90,target:'A',
   ec:{label:'Extra credit (percentage points added)',unit:'pct',val:null},
   notes:[
    'Canvas says assignments aren’t weighted. The weights here come from the syllabus.',
    'Quizzes in the first category are treated as equal weight. Change that by editing their “out of” values.',
    'Top Hat quizzes can’t be made up. Extra credit exists to cover missed ones.',
    'White paper: the syllabus says due Dec 11, Canvas lists Dec 12. The earlier date is used. Presentations are in class Nov 30 and Dec 2.',
    'The syllabus has no grading scale, so the standard +/− scale is used here.'],
   cats:[
    {name:'Comprehension quizzes (Canvas)',w:15,rule:'avg',items:[
      I('Quiz on arguments and reading an article',100,'2026-08-28'),I('Quiz 2.1 · Rise and Fall of the Asylum',100,'2026-08-31'),I('Quiz 2.2 · Szasz',100,'2026-09-02'),I('Quiz 3 · Rosenhan',100),
      I('Quiz 4.2 · Medical model',100,'2026-09-16'),I('Quiz 5.1 · Biopsychosocial model',100,'2026-09-21'),I('Quiz 5.2 · Harmful dysfunction',100,'2026-09-21'),
      I('Quiz 6.1.1 · Ex-Patients’ Movement',100,'2026-09-28'),I('Quiz 6.1.2 · Neurodiversity',100,'2026-09-28'),I('Quiz 9.1 · Addiction as a brain disease',100,'2026-10-21'),
      I('Quiz 9.2 · Addiction as a contextual disease',100,'2026-10-21'),I('Quiz 11.1 · Medicalization of cannabis',100,'2026-11-02'),I('Quiz 11.2 · Cannabis use disorder',100,'2026-11-04')]},
    {name:'In-class quizzes (Top Hat)',w:15,rule:'avg',items:[I('Top Hat overall',100)]},
    {name:'Midterm quiz',w:15,rule:'avg',items:[I('Midterm quiz',100,'2026-10-18')]},
    {name:'Final quiz',w:15,rule:'avg',items:[I('Final quiz',100,'2026-11-29')]},
    {name:'Group presentation',w:10,rule:'avg',items:[I('Group presentation',100,'2026-12-02','in class Nov 30 / Dec 2')]},
    {name:'Group white paper',w:20,rule:'avg',items:[I('Group white paper',100,'2026-12-11','Canvas: Dec 12')]},
    {name:'White paper individual notes',w:5,rule:'avg',items:[I('Individual notes',100,'2026-12-12')]},
    {name:'Course dictionary (Quizlet)',w:5,rule:'avg',items:[I('Course dictionary',100)]}
   ]}
  ]};
}

/* ---------- state ---------- */
const KEY='pitt-grade-tracker-fall26-v2', KEY1='pitt-grade-tracker-fall26-v1';
const KEY3='gradetracker-v3';
let W=null, S=null, view='home', dbDoc=null, wipeArmed=false, editing=false, reorder=false;

function ecShape(e){
  const bx=x=>({e:(x&&typeof x.e==='number')?x.e:null,w:(x&&typeof x.w==='number')?x.w:null});
  const o={label:e.label||'Extra credit',pts:bx(e.pts),pct:bx(e.pct),total:(typeof e.total==='number'&&e.total>0)?e.total:null,cat:(typeof e.cat==='number'&&e.cat>=0)?e.cat:null};
  if(e.max!=null){ o.max=e.max; o.mu=e.mu||e.unit||'pct'; }
  if(e.val!=null&&typeof e.val==='number'){ o[e.unit==='pts'?'pts':'pct'].e=e.val; }
  return o;
}
function normEc(D){
  D.courses.forEach(function(c){ c.ec=ecShape(c.ec||{}); });
}
function loadMerged(saved){
  const D=defaults(); normEc(D);
  setHistory(saved); D.prior=PRIOR; D.oldPct=OLD_PCT; D.oldX=OLD_X; D.history=HIST;
  if(!saved||!saved.courses) return D;
  D.gpaPick=saved.gpaPick||{};
  D.ts=saved.ts||0;
  D.courses.forEach(c=>{
    const sc=saved.courses.find(x=>x.id===c.id);
    if(!sc) return;
    if(sc.credits!==undefined) c.credits=sc.credits;
    if(typeof sc.fill==='number') c.fill=sc.fill;
    if(sc.target) c.target=sc.target;
    if(c.ec&&sc.ec){
      const m=ecShape(sc.ec);
      c.ec.pts=m.pts; c.ec.pct=m.pct; c.ec.total=m.total; c.ec.cat=m.cat;
    }
    c.cats.forEach(k=>{
      const sk=(sc.cats||[]).find(x=>x.name===k.name);
      if(!sk) return;
      if(typeof sk.w==='number') k.w=sk.w;
      const defItems=k.items;
      if(Array.isArray(sk.items)) k.items=sk.items.map(it=>({n:String(it.n||''),p:(typeof it.p==='number'?it.p:100),e:(typeof it.e==='number'?it.e:null),w:(typeof it.w==='number'?it.w:null),d:it.d||null,dl:it.dl||'',opt:!!it.opt}));
      if(k.rule==='best'&&/^Weekly reflections/.test(k.name)&&k.items.length===10) k.items=k.items.concat(defItems.slice(10));
    });
  });
  return D;
}
const uid=()=>'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const subOf=c=>[c.code,c.prof].filter(Boolean).join(' · ');
function normItem(it){ return {n:String(it.n==null?'':it.n),p:(typeof it.p==='number'?it.p:100),e:(typeof it.e==='number'?it.e:null),w:(typeof it.w==='number'?it.w:null),d:it.d||null,dl:it.dl||'',opt:!!it.opt,rp:!!it.rp}; }
const DM={su:0,mo:1,tu:2,we:3,th:4,fr:5,sa:6,m:1,w:3,f:5,r:4};
function normT(x){ const m=String(x==null?'':x).trim().match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/i); if(!m) return ''; let h=+m[1]; const mi=+(m[2]||0), ap=(m[3]||'').toLowerCase(); if(ap==='pm'&&h<12) h+=12; if(ap==='am'&&h===12) h=0; if(h>23||mi>59) return ''; return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0'); }
function normMeet(m){
  m=m||{}; const ds=(Array.isArray(m.days)?m.days:[]).map(d=>typeof d==='number'?d:DM[String(d).toLowerCase().slice(0,2)]).filter(d=>d>=0&&d<=6);
  return {days:Array.from(new Set(ds)).sort((a,b)=>a-b),st:normT(m.st!=null?m.st:m.start),en:normT(m.en!=null?m.en:m.end),loc:String(m.loc!=null?m.loc:(m.location||''))};
}
const OFFK={holiday:['Holiday','#FF6FA8'],break:['Break','#2DD4FF'],dayoff:['Day off','#FFC233'],noclass:['No class','#FF7A59']};
const isD=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'');
function normOff(o){ o=o||{}; const a=isD(o.start)?o.start:TODAY; let b=isD(o.end)?o.end:a; if(b<a) b=a; return {id:o.id||uid(),t:String(o.t||'Day off'),kind:OFFK[o.kind]?o.kind:'dayoff',start:a,end:b}; }
function normEvent(e){
  e=e||{}; return {id:e.id||uid(),t:String(e.t||e.title||'Event'),date:/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')?e.date:TODAY,allDay:!!e.allDay,st:normT(e.st),en:normT(e.en),loc:String(e.loc||''),note:String(e.note||''),color:/^#[0-9a-f]{6}$/i.test(e.color||'')?e.color:'#FF7A59',rep:['none','daily','weekly','biweekly','monthly'].includes(e.rep)?e.rep:'none',until:/^\d{4}-\d{2}-\d{2}$/.test(e.until||'')?e.until:'',skip:(Array.isArray(e.skip)?e.skip:[]).filter(isD)};
}
function normCourse(c){
  c.curve=(typeof c.curve==='number'&&isFinite(c.curve))?c.curve:0; c.round=(c.round==='whole'||c.round==='ceil')?c.round:'none'; c.reqs=(Array.isArray(c.reqs)?c.reqs:[]).filter(q=>q&&typeof q.cat==='number'&&typeof q.min==='number'&&q.cap).map(q=>({cat:q.cat,min:q.min,cap:String(q.cap)}));
  c.noGpa=!!c.noGpa; c.noGrades=!!c.noGrades; c.meets=(Array.isArray(c.meets)?c.meets:[]).map(normMeet); c.skip=(Array.isArray(c.skip)?c.skip:[]).filter(w=>/^\d{4}-\d{2}-\d{2}$/.test(w));
  c.id=c.id||uid(); c.name=c.name||'Untitled class'; c.code=c.code||''; c.prof=c.prof||''; if(c.credits===undefined) c.credits=null;
  c.scale=c.scale||'std'; c.pooled=!!c.pooled; c.lenience=c.lenience||0; c.fill=(typeof c.fill==='number')?c.fill:90; c.target=c.target||'A';
  c.ec=ecShape(c.ec||{}); c.notes=Array.isArray(c.notes)?c.notes:[]; c.cats=Array.isArray(c.cats)?c.cats:[];
  c.cats.forEach(k=>{ k.name=k.name||'Category'; k.w=(typeof k.w==='number')?k.w:0; k.rule=k.rule||'avg'; k.items=(k.items||[]).map(normItem); k.dropHi=Math.max(0,Math.floor(+k.dropHi||0)); k.bonus=(typeof k.bonus==='number'&&isFinite(k.bonus))?k.bonus:0; });
  return c;
}
function defaultSemName(){ const m=new Date().getMonth(), y=new Date().getFullYear(); return (m<=4?'Spring ':m<=7?'Summer ':'Fall ')+y; }
function emptyW(){ const id=uid(); return {v:3,active:id,sems:[{id:id,name:defaultSemName(),done:false,courses:[],gpaPick:{}}],ts:0,base:null,prior:[],oldPct:{},oldX:[],history:{}}; }
/* simple import format (what an AI helper writes for you) */
function fromSimple(src){
  const RULE={average:'avg',avg:'avg',total:'sum',sum:'sum',best:'best',capped:'cap',cap:'cap',optionalreplaceslowest:'swap',optionalreplacelowest:'swap',swap:'swap'};
  const gp=x=>{ if(typeof x==='number') return x; const L=String(x||'').toUpperCase().replace('−','-').trim(); return GPAOF[L]!==undefined?GPAOF[L]:null; };
  const w={v:3,active:null,sems:[],ts:0,base:null,prior:[],oldPct:{},oldX:[],history:{}};
  (src.semesters||[]).forEach(sm=>{
    const courses=(sm.classes||[]).map(cl=>{
      const cats=(cl.categories||[]).map(k=>({
        name:k.name,w:typeof k.weight==='number'?k.weight:0,rule:RULE[String(k.scoring||'average').toLowerCase().replace(/[^a-z]/g,'')]||'avg',
        drop:k.dropLowest>0?k.dropLowest:0,dropHi:k.dropHighest>0?k.dropHighest:0,bonus:typeof k.curvePoints==='number'?k.curvePoints:0,n:k.bestN,cap:typeof k.fullCreditPercent==='number'?k.fullCreditPercent/100:undefined,rp:!!k.replaceLowestWithFlagged,
        items:(k.items||[]).map(it=>({n:it.name,p:it.outOf,e:it.earned,w:null,d:it.due||null,dl:'',opt:!!it.optional,rp:!!it.replacesLowest}))
      }));
      const c={curve:typeof cl.curvePercent==='number'?cl.curvePercent:0,round:(String(cl.rounding||'').toLowerCase()==='up'?'ceil':(String(cl.rounding||'').toLowerCase()==='nearest'||String(cl.rounding||'').toLowerCase()==='whole')?'whole':'none'),name:cl.name,code:cl.code||'',prof:cl.professor||cl.prof||'',credits:typeof cl.credits==='number'?cl.credits:null,scale:String(cl.scale||'').toLowerCase()==='plain'?'plain':'std',pooled:!!cl.totalPointsGrading,cats:cats,notes:Array.isArray(cl.notes)?cl.notes:[]};
      if(Array.isArray(cl.meetings)) c.meets=cl.meetings.map(normMeet);
      if(Array.isArray(cl.requirements)) c.reqs=cl.requirements.map(q=>({cat:cats.findIndex(k=>String(k.name).toLowerCase()===String(q.category||'').toLowerCase()),min:+q.minPercent,cap:String(q.otherwiseMaxGrade||'D')})).filter(q=>q.cat>=0&&isFinite(q.min));
      if(Array.isArray(cl.cutoffs)&&cl.cutoffs.length) c.cuts=cl.cutoffs.map(x=>[x.min,x.letter,typeof x.gpa==='number'?x.gpa:(GPAOF[x.letter]||0)]).sort((a,b)=>b[0]-a[0]);
      if(cl.extraCredit){ const e=cl.extraCredit; c.ec={label:e.label||'Extra credit',pts:{e:e.points==null?null:e.points},pct:{e:e.percent==null?null:e.percent},total:e.totalPoints}; }
      return normCourse(c);
    });
    const id=uid(); w.sems.push({id:id,name:sm.name||'Semester',done:!!sm.finished,start:/^\d{4}-\d{2}-\d{2}$/.test(sm.startDate||'')?sm.startDate:'',end:/^\d{4}-\d{2}-\d{2}$/.test(sm.endDate||'')?sm.endDate:'',events:[],gpaPick:{},courses:courses}); if(sm.current) w.active=id;
  });
  (src.earlier||[]).forEach(t=>{
    const c=(t.classes||[]).map(x=>[x.name||'Class',+x.credits||0,gp(x.grade!=null?x.grade:x.gpa)]).filter(x=>x[2]!=null&&x[1]>0);
    if(c.length) w.prior.push({t:t.name||'Earlier',c:c,short:t.short||t.name||'Earlier'});
  });
  if(!w.sems.length){ const e=emptyW(); w.sems=e.sems; w.active=e.active; }
  if(!w.active) w.active=w.sems[w.sems.length-1].id;
  return w;
}
function loadAny(src){
  if(src&&(Array.isArray(src.semesters)||Array.isArray(src.earlier))&&!src.sems&&!src.courses){ const w=fromSimple(src); setHistory(w); return w; }
  if(src&&Array.isArray(src.sems)){
    const w={v:3,active:src.active,sems:src.sems.map(sm=>Object.assign({},sm,{id:sm.id||uid(),name:sm.name||'Semester',short:sm.short||'',done:!!sm.done,start:/^\d{4}-\d{2}-\d{2}$/.test(sm.start||'')?sm.start:'',end:/^\d{4}-\d{2}-\d{2}$/.test(sm.end||'')?sm.end:'',events:(sm.events||[]).map(normEvent),off:(sm.off||[]).map(normOff),gpaPick:sm.gpaPick||{},courses:(sm.courses||[]).map(normCourse)})),ts:src.ts||0,base:src.base||null,transfer:(src.transfer>0?+src.transfer:0)};
    if(!w.sems.length){ const e=emptyW(); w.sems=e.sems; w.active=e.active; }
    if(!w.sems.some(x=>x.id===w.active)) w.active=w.sems[0].id;
    setHistory(src); w.prior=PRIOR; w.oldPct=OLD_PCT; w.oldX=OLD_X; w.history=HIST;
    return w;
  }
  if(src&&src.courses){
    const D=loadMerged(src), id=uid();
    return {v:3,active:id,sems:[{id:id,name:'Fall 2026',done:false,courses:D.courses.map(normCourse),gpaPick:D.gpaPick||{}}],ts:D.ts||0,base:null,prior:PRIOR,oldPct:OLD_PCT,oldX:OLD_X,history:HIST};
  }
  setHistory(null); return emptyW();
}
function semTotals(sm){
  let cr=0,qp=0;
  sm.courses.forEach(c=>{
    if(!(c.credits>0)||c.noGpa) return;
    const pick=sm.gpaPick[c.id];
    const g=(pick&&GPAOF[pick]!==undefined)?GPAOF[pick]:gpaOf(c,courseRes(c,pick==='proj'?'proj':'whatif').pct);
    if(g==null) return; cr+=c.credits; qp+=c.credits*g;
  });
  return {cr:cr,qp:qp};
}
function refreshPrior(){
  let cr=PRIOR.reduce((a,t)=>a+t.c.reduce((b,x)=>b+x[1],0),0), qp=PRIOR.reduce((a,t)=>a+t.c.reduce((b,x)=>b+x[1]*x[2],0),0);
  if(W.base&&W.base.cr>0&&typeof W.base.gpa==='number'){ cr+=W.base.cr; qp+=W.base.cr*W.base.gpa; }
  const ai=W.sems.findIndex(x=>x.id===W.active); W.sems.forEach((sm,i)=>{ if(i<ai){ const t=semTotals(sm); cr+=t.cr; qp+=t.qp; } });
  PRIOR_CR=cr; PRIOR_QP=qp;
}
function nextColor(){
  const used=new Set(S?S.courses.map(c=>(ACC.cls[c.id]||c.color||'').toLowerCase()):[]);
  return PALETTE.find(p=>!used.has(p.toLowerCase()))||PALETTE[(S?S.courses.length:0)%PALETTE.length];
}
function syncColors(){
  W.sems.forEach(sm=>sm.courses.forEach(c=>{ if(!c.color) c.color=COLORS0[c.id]||PALETTE[sm.courses.indexOf(c)%PALETTE.length]; }));
  applyAcc();
}
function adoptState(v){
  W=loadAny(v); S=W.sems.find(x=>x.id===W.active); view='home'; editing=false; refreshPrior(); syncColors(); save(); render();
}
function readLocal(k){ try{ const r=localStorage.getItem(k||KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }

/* ---------- grade engine ---------- */
function ratio(it,mode,fill){
  if(!(it.p>0)) return null;
  if((mode==='proj'||mode==='whatif')&&it.w!=null) return it.w/it.p;
  if(it.e!=null) return it.e/it.p;
  if(mode==='proj'&&!it.opt&&fill!=null) return fill/100;
  return null;
}
function catPlan(cat,mode,fill){
  const rule=cat.rule||'avg', st={}, L=[];
  cat.items.forEach((it,i)=>{ const r=ratio(it,mode,fill); if(r!=null) L.push({i:i,r:r,p:it.p,opt:!!it.opt,rp:!!it.rp}); });
  let cnt;
  if(rule==='swap'){
    const base=L.filter(x=>!x.opt), ex=L.filter(x=>x.opt).sort((a,b)=>b.r-a.r||a.i-b.i);
    const low=base.filter(x=>x.r>0).sort((a,b)=>a.r-b.r||a.i-b.i); let ci=0;
    low.forEach(x=>{ if(ci<ex.length&&ex[ci].r>x.r){ st[x.i]={s:'drop',by:ex[ci].i}; st[ex[ci].i]={s:'use',for:x.i}; x.r=ex[ci].r; ci++; } });
    cnt=base;
  }else{
    cnt=L.slice();
    if(cat.rp&&(rule==='avg'||rule==='sum')){
      const rps=L.filter(x=>x.rp).sort((a,b)=>b.r-a.r||a.i-b.i), low=L.filter(x=>!x.rp).sort((a,b)=>a.r-b.r||a.i-b.i); let bi=0;
      rps.forEach(x=>{ if(bi<low.length&&x.r>low[bi].r){ st[low[bi].i]={s:'drop',by:x.i}; st[x.i]={s:'use',for:low[bi].i}; low[bi].r=x.r; bi++; } });
    }
    const real=cat.items.filter(it=>!it.opt).length;
    let keep=Infinity;
    if(rule==='best') keep=cat.n||real;
    else if((rule==='avg'||rule==='sum')&&cat.drop>0) keep=Math.max(1,real-cat.drop);
    if(cnt.length>keep){
      const order=cnt.slice().sort((a,b)=>b.r-a.r||a.i-b.i), kept=new Set(order.slice(0,keep).map(x=>x.i));
      cnt.forEach(x=>{ if(!kept.has(x.i)) st[x.i]={s:'drop'}; });
      cnt=cnt.filter(x=>kept.has(x.i));
    }
    if((rule==='avg'||rule==='sum')&&cat.dropHi>0&&cnt.length>cat.dropHi){
      const hi=cnt.slice().sort((a,b)=>b.r-a.r||a.i-b.i).slice(0,cat.dropHi), hs=new Set(hi.map(x=>x.i));
      cnt.forEach(x=>{ if(hs.has(x.i)) st[x.i]={s:'drop'}; });
      cnt=cnt.filter(x=>!hs.has(x.i));
    }
  }
  cnt.forEach(x=>{ if(!st[x.i]) st[x.i]={s:'count'}; });
  const sumE=a=>a.reduce((t,x)=>t+x.r*x.p,0), sumP=a=>a.reduce((t,x)=>t+x.p,0);
  let pct=null;
  if(cnt.length){
    if(rule==='avg'||rule==='swap') pct=100*cnt.reduce((t,x)=>t+x.r,0)/cnt.length;
    else if(rule==='cap') pct=Math.min(100,100*(sumE(cnt)/sumP(cnt))/(cat.cap||1));
    else pct=100*sumE(cnt)/sumP(cnt);
  }
  return {pct:pct,st:st,cnt:cnt,scored:L.length};
}
function catRes(cat,mode,fill){ const r=catPlan(cat,mode,fill); return r.pct==null?null:{pct:r.pct+(cat.bonus||0)}; }
function ecAmt(c,k,mode){
  const b=c.ec&&c.ec[k]; if(!b) return 0;
  const v=(mode!=='cur'&&b.w!=null)?b.w:b.e; if(v==null) return 0;
  return (c.ec.max!=null&&c.ec.mu===k)?Math.min(v,c.ec.max):v;
}
function ecTotal(c){
  if(c.ec&&c.ec.total>0) return c.ec.total;
  let t=0; c.cats.forEach(k=>k.items.forEach(it=>{ if(!it.opt&&it.p>0) t+=it.p; })); return t;
}
function capPct(c,letter){
  const rows=scaleOf(c), i=rows.findIndex(r=>r[1]===letter);
  return i<=0?100:rows[i-1][0]-0.001;
}
function finishPct(c,pct,unmet){
  if(pct==null) return pct;
  pct+=(c.curve||0);
  if(c.round==='whole') pct=Math.round(pct); else if(c.round==='ceil') pct=Math.ceil(pct-1e-9);
  unmet.forEach(q=>{ pct=Math.min(pct,capPct(c,q.cap)); });
  return pct;
}
function courseRes(c,mode,fill){
  if(fill===undefined) fill=c.fill;
  if(c.pooled){
    let E=0,P=0,allP=0,done=0,count=0;
    c.cats.forEach(k=>k.items.forEach(it=>{
      if(!(it.p>0)) return;
      allP+=it.p; count++;
      if(it.e!=null){ done+=it.p; }
      const r=ratio(it,mode,fill);
      if(r!=null){ E+=r*it.p; P+=it.p; }
    }));
    let pct=null;
    if(P>0){ pct=100*(E+ecAmt(c,'pts',mode))/P+ecAmt(c,'pct',mode); pct=finishPct(c,pct,[]); }
    return {pct:pct,progress:allP?done/allP:0,capped:[]};
  }
  let num=0,den=0,tw=0,pw=0; const catPcts={};
  const ecP=ecAmt(c,'pts',mode), ecK=(c.ec&&c.ec.cat!=null&&c.cats[c.ec.cat])?c.ec.cat:null;
  c.cats.forEach(k=>{
    const w=k.w||0; tw+=w;
    const real=k.items.filter(it=>!it.opt);
    const entered=real.filter(it=>it.e!=null&&it.p>0).length;
    const denom=Math.max(1,Math.min(real.length,k.rule==='best'?(k.n||real.length):(((k.drop>0||k.dropHi>0)&&(k.rule==='avg'||k.rule==='sum'))?real.length-(k.drop||0)-(k.dropHi||0):real.length)));
    pw+=w*Math.min(1,entered/denom);
    const r=catRes(k,mode,fill);
    if(r){ catPcts[c.cats.indexOf(k)]=r.pct; }
    if(r){
      let p=r.pct;
      if(ecK!=null&&c.cats.indexOf(k)===ecK&&ecP){ const P=k.items.filter(it=>!it.opt).reduce((t,it)=>t+(it.p||0),0); if(P>0) p+=100*ecP/P; }
      num+=w*p; den+=w;
    }
  });
  let pct=null;
  if(den>0){
    pct=num/den;
    pct+=ecAmt(c,'pct',mode);
    if(ecK==null){ const T=ecTotal(c); if(T>0) pct+=100*ecP/T; }
  }
  const capped=[];
  if(pct!=null) pct=finishPct(c,pct,(c.reqs||[]).filter(q=>catPcts[q.cat]!=null&&catPcts[q.cat]<q.min).map(q=>{ capped.push(q); return q; }));
  return {pct:pct,progress:tw?pw/tw:0,capped:capped};
}
function scaleRow(c,pct){
  if(pct==null) return null;
  const sc=scaleOf(c); const adj=pct+(c.lenience||0)+1e-9;
  return sc.find(r=>adj>=r[0])||sc[sc.length-1];
}
const letterOf=(c,pct)=>{const r=scaleRow(c,pct);return r?r[1]:'–';};
function remaining(c){
  let n=0; c.cats.forEach(k=>k.items.forEach(it=>{ if(!it.opt&&it.p>0&&it.e==null&&it.w==null) n++; })); return n;
}
function dropInfo(k){
  const rule=k.rule||'avg';
  if(!(rule==='swap'||rule==='best'||k.rp||k.drop>0||k.dropHi>0)) return null;
  const P=catPlan(k,'whatif',null), dropped=[], pairs=[];
  Object.keys(P.st).forEach(i=>{ const x=P.st[i]; if(x.s==='drop'){ if(x.by==null) dropped.push(+i); else pairs.push([x.by,+i]); } });
  return {st:P.st,dropped:dropped,pairs:pairs,scored:P.scored};
}
function tileNeed(c){
  if(!remaining(c)) return '';
  const L=c.target||'A', r=scaleOf(c).find(x=>x[1]===L); if(!r) return '';
  const n=needed(c,r[0]);
  let t;
  if(n.kind==='lock') t=L+' is locked in';
  else if(n.kind==='out') t=L+' is out of reach';
  else if(n.kind==='over') t=L+' needs over 100% on the rest';
  else t='Need <b>'+f1(Math.ceil(n.x*10)/10)+'%</b> on the rest for '+(/^[AF]/.test(L)?'an ':'a ')+L;
  return '<span class="tneed">'+t+'</span>';
}
function needed(c,min){
  const g=x=>{const p=courseRes(c,'proj',x).pct; return p==null?-1e9:p+(c.lenience||0)+1e-9;};
  if(g(0)>=min) return {kind:'lock'};
  if(g(150)<min) return {kind:'out'};
  let lo=0,hi=150;
  for(let i=0;i<50;i++){ const mid=(lo+hi)/2; if(g(mid)>=min) hi=mid; else lo=mid; }
  const x=Math.ceil(hi*1000)/1000;
  return {kind:x>100?'over':'need',x:x};
}

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const num=v=>{v=String(v).trim(); if(v==='') return null; const x=parseFloat(v); return isNaN(x)?null:x;};
const f1=x=>(Math.round(x*10)/10).toFixed(1);
const trim=s=>s.indexOf('.')<0?s:s.replace(/0+$/,'').replace(/\.$/,'');
const f3=x=>trim((Math.round(x*1000)/1000).toFixed(3));
const pctS=x=>x==null?'–':f3(x)+'%';
const getC=id=>S?S.courses.find(c=>c.id===id):null;
const T=new Date();
const TODAY=T.getFullYear()+'-'+String(T.getMonth()+1).padStart(2,'0')+'-'+String(T.getDate()).padStart(2,'0');
function isoPlus(n){const d=new Date(T.getFullYear(),T.getMonth(),T.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const fd=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const gpaOf=(c,pct)=>{const r=scaleRow(c,pct);return r?r[2]:null;};
const g2=x=>x==null?'–':trim((Math.round(x*1000)/1000).toFixed(3));

function defaults(){
  const D=baseDefaults();
  const C=id=>D.courses.find(c=>c.id===id);
  const K=(c,n)=>c.cats.find(k=>k.name===n);

  /* Synaptic Transmission: scores from Canvas */
  const syn=C('syn');
  K(syn,'Quizzes (and optional case studies)').items=[G('Unit 1 quiz',14,null,'2026-09-15'),G('Unit 2 quiz',11,null,'2026-10-11'),G('Unit 3 quiz',13,null,'2026-11-07'),I('Unit 4 quiz (extra time)',13),I('Case study #1',13,'2026-11-07','',true)];

  /* Mind and Medicine: scores from Canvas */
  const hps=C('hps');
  const q=K(hps,'Comprehension quizzes (Canvas)'); q.rule='sum';
  q.items=[G('Quiz on arguments and reading an article',10,null,'2026-08-28'),G('Quiz 2.1 · Rise and Fall of the Asylum',5,null,'2026-08-31'),G('Quiz 2.2 · Szasz',4,null,'2026-09-02'),G('Quiz 3 · Rosenhan',10,null),G('Quiz 4.2 · Medical model',10,null,'2026-09-16'),G('Quiz 5.1 · Biopsychosocial model',10,null,'2026-09-21'),G('Quiz 5.2 · Harmful dysfunction',10,null,'2026-09-21'),G('Quiz 6.1.1 · Ex-Patients’ Movement',10,null,'2026-09-28'),G('Quiz 6.1.2 · Neurodiversity',10,null,'2026-09-28'),G('Quiz 9.1 · Addiction as a brain disease',3,null,'2026-10-21'),G('Quiz 9.2 · Addiction as a contextual disease',3,null,'2026-10-21'),G('Quiz 11.1 · Medicalization of cannabis',5,null,'2026-11-02'),G('Quiz 11.2 · Cannabis use disorder',5,null,'2026-11-04')];
  K(hps,'Midterm quiz').items=[G('Midterm quiz',20,null,'2026-10-18')];
  const gp=K(hps,'Group presentation'); gp.items=[G('Final presentation',100,null,'2026-12-09')]; gp.items[0].dl='in class Nov 30 / Dec 2';
  K(hps,'Group white paper').items=[G('Phase 3 · Complete paper',35,null,'2026-12-12')];
  K(hps,'White paper individual notes').items=[G('Individual notes submission',35,null,'2026-12-12')];
  hps.notes=[
    "Canvas says assignments aren’t weighted. The weights here come from the syllabus.",
    "Quizzes are scored by total points within the category, the way Canvas groups work.",
    "Top Hat quizzes can’t be made up. Extra credit exists to cover missed ones.",
    "Final presentations, the white paper and individual notes are due Dec 9 and Dec 12 on Canvas.",
    "The syllabus has no grading scale, so the standard +/− scale is used here."
  ];
  return D;
}



function ruleText(k){
  const r=k.rule||'avg';
  const dn=(k.drop>0&&(r==='avg'||r==='sum')?' Your lowest '+k.drop+(k.drop>1?' scores are':' score is')+' dropped.':'')+(k.dropHi>0&&(r==='avg'||r==='sum')?' Your highest '+k.dropHi+(k.dropHi>1?' scores are':' score is')+' dropped.':'')+(k.bonus?' Section curve '+(k.bonus>0?'+':'−')+Math.abs(k.bonus)+' points.':'');
  const rp=k.rp&&(r==='avg'||r==='sum')?' Items marked “replaces lowest” take the place of your lowest score when they’re higher.':'';
  if(r==='avg') return (k.items.length>1?'Each item counts equally.':'')+dn+rp;
  if(r==='sum') return (dn+rp).trim();
  if(r==='best') return 'Only your best '+k.n+' of '+k.items.length+' count.';
  if(r==='cap') return Math.round((k.cap||0)*100)+'% of all points is full credit. Enter points earned and possible so far.';
  if(r==='swap') return 'A higher optional score replaces your lowest regular score. A score you skipped isn’t swapped.';
  return '';
}
function ruleLive(c,k){
  const d=dropInfo(k); if(!d) return ruleText(k);
  const nm=i=>esc(k.items[i].n), pc=i=>pctS(100*ratio(k.items[i],'whatif',null));
  const parts=[];
  if(d.dropped.length) parts.push((k.rule==='best'?'Counting your best '+k.n+' of '+k.items.length+'. ':'')+'<b>Dropped:</b> '+d.dropped.map(i=>nm(i)+' ('+pc(i)+')').join(', ')+'.');
  if(d.pairs.length) parts.push(d.pairs.map(p=>'<b>'+nm(p[0])+'</b> ('+pc(p[0])+') replaces '+nm(p[1])+' ('+pc(p[1])+')').join(' · '));
  if(parts.length) return parts.join(' ');
  return ruleText(k)+(k.rule==='best'?' '+(d.scored?d.scored+' scored so far, nothing dropped yet.':'Nothing scored yet.'):'');
}
function itemRow(c,k,i,it){
  const base='data-c="'+c.id+'" data-k="'+k+'" data-i="'+i+'"';
  const late=it.d&&it.d<TODAY&&it.e==null&&!it.opt;
  const due=it.d?'<div class="due'+(late?' late':'')+'" data-due="1">'+(it.dl?esc(it.dl)+' · ':'')+(late?'past due · ':'')+fd(it.d)+'</div>':(it.dl?'<div class="due">'+esc(it.dl)+'</div>':'');
  const cat=c.cats[k]; let flag='';
  if(!c.pooled&&(editing||cat.rp||cat.rule==='swap')){
    if(cat.rule==='swap') flag='<button type="button" class="mini'+(it.opt?' on':'')+'" data-act="optflag" '+base+'>Optional</button>';
    else if((cat.rule==='avg'||cat.rule==='sum')&&cat.rp) flag='<button type="button" class="mini'+(it.rp?' on':'')+'" data-act="rp" '+base+'>Replaces lowest</button>';
  }
  return '<div class="grid" data-r="'+k+'-'+i+'">'
    +'<div class="it"><input type="text" data-f="n" '+base+' value="'+esc(it.n)+'" aria-label="Item name">'+due+'<div class="tag" data-tag></div>'+flag+'</div>'
    +'<input type="number" step="any" inputmode="decimal" data-f="e" '+base+' value="'+(it.e==null?'':it.e)+'" placeholder="earned" aria-label="Points earned">'
    +'<input type="number" step="any" inputmode="decimal" data-f="p" '+base+' value="'+(it.p==null?'':it.p)+'" placeholder="out of" aria-label="Points possible">'
    +'<input type="number" step="any" inputmode="decimal" data-f="w" '+base+' value="'+(it.w==null?'':it.w)+'" placeholder="what-if" aria-label="What-if score (replaces earned)">'
    +'<button type="button" class="rpct" data-act="wiopen" '+base+' title="Try a what-if for this item">–</button>'
    +'<button class="x" data-act="del" '+base+' aria-label="Remove item" title="Remove">×</button></div>';
}
function needHtml(c){
  const left=remaining(c);
  if(!left) return '<h3>What you need</h3><div class="empty" style="padding:0">Everything has a score or a what-if, so the projection is final.</div>';
  const sc=scaleOf(c);
  const goal=c.target||'A';
  const chips='<div class="goal" role="group" aria-label="Goal grade">'+['A+','A','A-','B+','B','B-'].map(L=>'<button type="button" class="'+(L===goal?'on':'')+'" data-act="goal" data-c="'+c.id+'" data-l="'+L+'">'+L+'</button>').join('')+'</div>';
  const rows=['A+','A','A-','B+','B','B-'].map(L=>{
    const r=sc.find(x=>x[1]===L); if(!r) return '';
    const n=needed(c,r[0]);
    let cls='nd',txt;
    if(n.kind==='lock'){cls+=' lock';txt='Already locked in';}
    else if(n.kind==='out'){cls+=' out';txt='Out of reach';}
    else if(n.kind==='over'){cls+=' out';txt='Needs over 100% on the rest';}
    else txt='Average '+f3(n.x)+'% on the rest';
    if(L===goal) cls+=' goalrow';
    return '<div class="'+cls+'"><b>'+L+'</b><span>'+txt+'</span></div>';
  }).join('');
  return '<h3>What you need on the '+left+' ungraded item'+(left===1?'':'s')+'</h3>'+chips+'<div class="needgrid">'+rows+'</div>';
}
function backupHtml(skipAi){
  return syncHtml()+'<details><summary>Backup and reset</summary>'
    +'<div class="replayrow"><button type="button" class="btn" data-act="setupai">✦ Set up classes with AI</button><button type="button" class="btn" data-act="tourplay">▶ Replay demo</button><button type="button" class="btn" data-act="setupplay">↺ Replay setup</button></div>'
    +'<p class="sub">Everything saves on this device automatically. To move to another phone or computer, tap <b>Save backup</b>, send the file to yourself (AirDrop, Messages, email, Files), then tap <b>Restore from file</b> on the other device.</p>'
    +'<div class="addrow" style="padding-left:0"><button class="btn pri" data-act="download">Save backup</button>'
    +'<label class="btn" style="cursor:pointer">Restore from file<input type="file" id="bkfile" accept=".json,application/json" hidden></label>'
    +'<button class="btn" data-act="wipe" id="wipeBtn">Clear scores in this semester</button></div>'
    +'<textarea id="bk" aria-label="Backup text" placeholder="Or paste backup text here"></textarea>'
    +'<div class="addrow" style="padding-left:0"><button class="btn" data-act="export">Show backup text</button><button class="btn" data-act="import">Restore from text</button></div>'
    +'<div class="sub" id="bkmsg"></div></details>';
}

function gpaCalc(kind){
  let cr=0,qp=0,missing=[],all=0;
  S.courses.forEach(c=>{
    if(!(c.credits>0)){ missing.push(c.name); return; }
    all+=c.credits;
    if(c.noGpa) return;
    let g=null;
    if(kind==='cur') g=gpaOf(c,courseRes(c,'cur').pct);
    else if(kind==='proj') g=gpaOf(c,courseRes(c,'proj').pct);
    else if(kind==='whatif') g=gpaOf(c,courseRes(c,'whatif').pct);
    else { const pick=S.gpaPick[c.id]; g=(pick&&GPAOF[pick]!==undefined)?GPAOF[pick]:gpaOf(c,courseRes(c,pick==='proj'?'proj':'whatif').pct); }
    if(g==null) return;
    cr+=c.credits; qp+=c.credits*g;
  });
  return {cr:cr,all:all,qp:qp,sem:cr?qp/cr:null,cum:(PRIOR_CR+cr)?(PRIOR_QP+qp)/(PRIOR_CR+cr):null,missing:missing};
}
const LETTER_OF_GPA={'4':'A','3.75':'A-','3.25':'B+','3':'B','2.75':'B-','2.25':'C+','2':'C','1.75':'C-','1.25':'D+','1':'D','0.75':'D-','0':'F'};
const TILE={tob:'#2A1006',syn:'#FFFFFF',fna:'#052A24',ecl:'#1D2B04',eco:'#33240A',hps:'#06173A'};
const TILE0=Object.assign({},TILE), COLORS0=Object.assign({},COLORS);
const MAINS=['#1B3FD1','#6D3AE0','#0B7A75','#D6336C','#C2410C','#1F7A3E','#1F2433'];
const PNAMES={'#ff7a59':'Coral','#ffc233':'Yellow','#b8e651':'Lime','#19c3a5':'Teal','#2dd4ff':'Sky','#4c92ff':'Blue','#7b5cff':'Violet','#c9a6ff':'Lavender','#ff6fa8':'Pink','#ededf2':'Silver'};
const pname=v=>PNAMES[String(v).toLowerCase()]||v;
const PALETTE=['#FF7A59','#FFC233','#B8E651','#19C3A5','#2DD4FF','#4C92FF','#7B5CFF','#C9A6FF','#FF6FA8','#EDEDF2'];
const PRESETS=[
 {n:'Classic',main:null,cls:{}},
 {n:'Sunset',main:'#D6336C',cls:{tob:'#FF7A59',syn:'#FF6FA8',fna:'#FFC233',ecl:'#C9A6FF',eco:'#FF9F5A',hps:'#7B5CFF'}},
 {n:'Ocean',main:'#0B7A75',cls:{tob:'#2DD4FF',syn:'#4C92FF',fna:'#19C3A5',ecl:'#7B5CFF',eco:'#B8E651',hps:'#8FD3FF'}},
 {n:'Candy',main:'#6D3AE0',cls:{tob:'#FF6FA8',syn:'#7B5CFF',fna:'#2DD4FF',ecl:'#C9A6FF',eco:'#FFC233',hps:'#19C3A5'}},
 {n:'Forest',main:'#1F7A3E',cls:{tob:'#B8E651',syn:'#19C3A5',fna:'#7FD18B',ecl:'#FFC233',eco:'#E8D36A',hps:'#4C92FF'}},
 {n:'Mono',main:'#1F2433',cls:{tob:'#EDEDF2',syn:'#C9CCD6',fna:'#B1B6C6',ecl:'#9DA3B7',eco:'#D8DBE3',hps:'#BEC3D0'}}
];
let ACC={main:null,cls:{}};
try{ const a=JSON.parse(localStorage.getItem('pitt-accent')||'null'); if(a&&typeof a==='object'){ ACC.main=typeof a.main==='string'?a.main:null; ACC.cls=(a.cls&&typeof a.cls==='object')?a.cls:{}; ACC.preset=typeof a.preset==='string'?a.preset:null; } }catch(e){}
function fgFor(hex){
  const n=parseInt(hex.slice(1),16), r=n>>16&255,g=n>>8&255,b=n&255;
  const L=(0.2126*r+0.7152*g+0.0722*b)/255;
  if(L<0.55) return '#FFFFFF';
  const d=v=>Math.round(v*0.13).toString(16).padStart(2,'0'); return '#'+d(r)+d(g)+d(b);
}
function applyAcc(){
  const root=document.documentElement;
  if(ACC.main&&ACC.main.toLowerCase()!==MAINS[0].toLowerCase()){ root.style.setProperty('--acc',ACC.main); root.setAttribute('data-acc',''); }
  else { root.style.removeProperty('--acc'); root.removeAttribute('data-acc'); }
  if(typeof W==='undefined'||!W) return;
  W.sems.forEach(sm=>sm.courses.forEach(c=>{
    const o=ACC.cls[c.id], col=(o&&/^#[0-9a-f]{6}$/i.test(o))?o:(c.color||'#EDEDF2');
    COLORS[c.id]=col; TILE[c.id]=(!o&&TILE0[c.id]&&col===COLORS0[c.id])?TILE0[c.id]:fgFor(col);
  }));
}
function saveAcc(){ try{ localStorage.setItem('pitt-accent',JSON.stringify(ACC)); }catch(e){} }
applyAcc();
const SEMCOL=[['#FFC233','#33240A'],['#19C3A5','#052A24'],['#7B5CFF','#FFFFFF'],['#FF7A59','#2A1006']];
const FONT_URL='https://fonts.googleapis.com/css2?family=Unbounded:wght@600;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
