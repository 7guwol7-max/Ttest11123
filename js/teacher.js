// 교사용 기능: 진행 이동 · 연습(진행 불변) · 난이도/무적 · 문제 관리 · 학생용 링크/파일 · 학습 기록
const CLASS_KEY=window.CLASS_STORE_KEY||'equality-rpg-class-v1',TEACH_KEY='equality-rpg-teacher-v1';
const BASE_QS=stages.map((s,si)=>s.qs.map((q,qi)=>[q[0],q[1],q[2],q[3],`b${si}-${qi}`]));
const DIFF={easy:{hp:.8,dmg:.6,drift:.75,speed:.95,hearts:1,name:'쉬움'},normal:{hp:1,dmg:1,drift:1,speed:1,hearts:0,name:'보통'},hard:{hp:1.2,dmg:1.3,drift:1.12,speed:1.05,hearts:0,name:'어려움'}};
const REC=[{xp:0,wpn:[0,0,0]},{xp:950,wpn:[1,0,0]},{xp:2000,wpn:[1,1,1]},{xp:3300,wpn:[2,1,1]},{xp:4800,wpn:[2,2,2]}];
const STEPS=['처음부터 (이야기 시작)','임무 시작 (대화 후)','임무 완료 (비석 전)','비석 완료 (외줄 수련 전)','수련 완료 (보스 바로 앞)','보스 처치 (성문 앞)'];
const STAGE_LABEL=i=>`${i+1}장 ${stages[i].name}`;

function escH(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function loadJSON(k){try{return JSON.parse(localStorage.getItem(k))}catch{return null}}
function defaultClass(){return {v:1,mode:'add',difficulty:'normal',startStage:null,questions:[]}}
function newId(){return Math.random().toString(36).slice(2,10)}
function cleanQuestion(q){
 if(!q||typeof q!=='object')return null;
 const text=String(q.text??'').trim().slice(0,240);
 const choices=Array.isArray(q.choices)?q.choices.map(c=>String(c??'').trim().slice(0,100)).filter(Boolean).slice(0,4):[];
 const answer=Number(q.answer);
 const stage=q.stage==='all'?'all':Number(q.stage);
 if(!text||choices.length<2||!Number.isInteger(answer)||answer<0||answer>=choices.length)return null;
 if(!(stage==='all'||(Number.isInteger(stage)&&stage>=0&&stage<5)))return null;
 const explain=String(q.explain??'').trim().slice(0,300);
 const id=String(q.id||'').replace(/[^a-z0-9]/gi,'').slice(0,16)||newId();
 return {id,stage,text,choices,answer,explain};
}
function cleanClass(c){
 const d=defaultClass();if(!c||typeof c!=='object')return d;
 d.mode=c.mode==='only'?'only':'add';
 d.difficulty=Object.prototype.hasOwnProperty.call(DIFF,c.difficulty)?c.difficulty:'normal';
 d.startStage=Number.isInteger(c.startStage)&&c.startStage>=0&&c.startStage<5?c.startStage:null;
 const seen=new Set();
 d.questions=(Array.isArray(c.questions)?c.questions:[]).slice(0,200).map(cleanQuestion).filter(q=>q&&!seen.has(q.id)&&seen.add(q.id));
 return d;
}
let CLS=cleanClass(loadJSON(CLASS_KEY)),TEA=(()=>{const t=loadJSON(TEACH_KEY)||{};return {pin:typeof t.pin==='string'&&/^\d{4,8}$/.test(t.pin)?t.pin:'1234',god:!!t.god}})();
let POOLV=1,PRIORITY=[];
function saveClass(){try{localStorage.setItem(CLASS_KEY,JSON.stringify(CLS))}catch{}POOLV++;teacherBadge();if(typeof classSyncHook==='function')classSyncHook()}
function saveTeach(){try{localStorage.setItem(TEACH_KEY,JSON.stringify(TEA))}catch{}teacherBadge()}

// ---------- 출제 ----------
function customArr(q){return [escH(q.text),q.choices.map(escH),q.answer,escH(q.explain||'선생님이 낸 문제예요.'),'c'+q.id]}
function questionPool(p){
 const sts=p==='all'?[0,1,2,3,4]:[p];const out=[],ids=new Set();
 const add=a=>{if(!ids.has(a[4])){ids.add(a[4]);out.push(a)}};
 for(const s of sts){const cus=CLS.questions.filter(q=>q.stage===s||q.stage==='all');
  if(!(CLS.mode==='only'&&cus.length))BASE_QS[s].forEach(add);
  cus.forEach(q=>add(customArr(q)))}
 return out.length?out:BASE_QS[p==='all'?0:p];
}
function poolVersion(){return POOLV}
function takePriority(p){const i=PRIORITY.findIndex(q=>p==='all'||q.stage===p||q.stage==='all');if(i<0)return null;return customArr(PRIORITY.splice(i,1)[0])}
function recordAnswer(q,ok){const id=q&&q[4]||'?';if(!S.qstats||typeof S.qstats!=='object'||Array.isArray(S.qstats))S.qstats={};const r=Array.isArray(S.qstats[id])?S.qstats[id]:(S.qstats[id]=[0,0]);r[ok?0:1]++}
function questionById(id){
 if(id.startsWith('b')){const [s,i]=id.slice(1).split('-').map(Number);const q=BASE_QS[s]&&BASE_QS[s][i];return q?{text:q[0],stage:s,custom:false}:null}
 const q=CLS.questions.find(q=>'c'+q.id===id);return q?{text:q.text,stage:q.stage,custom:true}:null;
}
const teacherHpMul=()=>DIFF[CLS.difficulty].hp;
const teacherDmgMul=()=>DIFF[CLS.difficulty].dmg;
const teacherTrialMul=()=>{const d=DIFF[CLS.difficulty];return {drift:d.drift,speed:d.speed,hearts:d.hearts}};
const teacherGod=()=>!!TEA.god;
function teacherBadge(){
 const el=$('#teachbadge');if(!el)return;
 const parts=[];if(CLS.questions.length)parts.push(`선생님 문제 ${CLS.questions.length}개${CLS.mode==='only'?'(우선)':''}`);
 if(CLS.difficulty!=='normal')parts.push(`난이도 ${DIFF[CLS.difficulty].name}`);if(TEA.god)parts.push('무적 모드');
 el.textContent=parts.length?'🍎 '+parts.join(' · '):'';el.hidden=!parts.length;
}
function teacherReportText(){
 const tot=S.right+S.wrong,rate=tot?Math.round(S.right/tot*100):0;
 const miss=Object.entries(S.qstats||{}).filter(([,r])=>r[1]>0).sort((a,b)=>b[1][1]-a[1][1]).slice(0,5).map(([id,r])=>{const q=questionById(id);return q?`- ${q.text} (틀림 ${r[1]}·맞힘 ${r[0]})`:null}).filter(Boolean);
 return `정답률 ${rate}% (정답 ${S.right} · 오답 ${S.wrong})${miss.length?'\n다시 볼 문제:\n'+miss.join('\n'):''}`;
}

// ---------- 진행 이동 ----------
function abortAll(){
 if(B){B.over=true;B.waiting=null;B.mini=null}B=null;TR=null;dialog=null;MENU=null;trans=null;
 ['#battleui','#trialui','#menuui','#dialog'].forEach(s=>{const e=$(s);if(e)e.hidden=true});$('#questbox').hidden=false;$('#bcmd').innerHTML='';
 if($('#splash')){$('#splash').remove();Music.setEnabled(S.sound)}
 keys={};path=[];pendingTarget=null;mode='field';
}
function completeMission(st){
 const f=S.flags;
 if(st===0){f.letters=[0,1,2,3,4];f.delivered=true}
 if(st===1)f.frags=[0,1,2];
 if(st===2){f.freed=[0,1,2];f.solvedPens=[0,1,2];f.bpos={};LAYOUT[2].pens.forEach((pen,i)=>{f.bpos[i]=pen.plates.map(p=>p.slice())})}
 if(st===3)f.bells=BELL_ORDER.slice();
 if(st===4)f.keys=[0,1,2,3];
}
function teacherJump(st,step,rec){
 abortAll();
 S.stage=st;stageReset();S.finished=false;
 if(step>=1)S.talked=true;
 if(step>=2)completeMission(st);
 if(step>=3)S.shrine=true;if(step>=4)S.trial=true;if(step>=5)S.boss=true;
 if(rec){S.xp=Math.max(S.xp,REC[st].xp);S.wpn=S.wpn.map((v,i)=>Math.max(v,REC[st].wpn[i]))}
 pl.x=S.x;pl.y=S.y;pl.dir='down';
 loadStage();healAll();S.ki=Math.max(S.ki,40);
 if(step>=2){const g=currentGoal();if(g){const p=bfs([pl.x,pl.y],[g.x,g.y],true);if(p&&p.length){const [x,y]=p[p.length-1];pl.x=x;pl.y=y;pl.fx=x;pl.fy=y;pl.t=1;followers.forEach(f=>{f.x=x;f.y=y;f.fx=x;f.fy=y});reveal()}}}
 save();hud();Music.play('field');chapterCard();cv.focus();
 log(`[교사] ${STAGE_LABEL(st)} · ${STEPS[step]}(으)로 이동했다.`,'gold');
}
function practice(kind){
 abortAll();const st=S.stage;
 if(kind==='trial')startTrial(true);
 else if(kind==='boss')startBattle({kind:'boss',practice:true});
 else if(kind==='shadow')startBattle({kind:'shadow',id:(Math.random()*4)|0,practice:true});
 else startBattle({kind:'mob',types:STAGE_MOBS[st][(Math.random()*STAGE_MOBS[st].length)|0],practice:true});
}

// ---------- 링크/파일 ----------
function b64u(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
async function packClass(obj){
 const bytes=new TextEncoder().encode(JSON.stringify(obj));
 if(typeof CompressionStream==='function'){try{const cs=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));return 'z'+b64u(new Uint8Array(await new Response(cs).arrayBuffer()))}catch{}}
 return 'p'+b64u(bytes);
}
async function unpackClass(s){
 const bytes=unb64u(s.slice(1));
 if(s[0]==='z'){const ds=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return JSON.parse(await new Response(ds).text())}
 return JSON.parse(new TextDecoder().decode(bytes));
}
function classForShare(startStage){return {v:1,mode:CLS.mode,difficulty:CLS.difficulty,startStage:startStage,questions:CLS.questions}}
function applyClass(obj,source){
 const c=cleanClass(obj);CLS=c;saveClass();QORDER_RESET();
 let msg=`${source}: 선생님 문제 ${c.questions.length}개 · 난이도 ${DIFF[c.difficulty].name}${c.mode==='only'?' · 선생님 문제 우선 출제':''}`;
 if(c.startStage!=null&&S.stage<c.startStage&&!S.finished){teacherJumpQuiet(c.startStage);msg+=` · ${STAGE_LABEL(c.startStage)}부터 시작`}
 return msg;
}
function teacherJumpQuiet(st){S.stage=st;stageReset();S.xp=Math.max(S.xp,REC[st].xp);S.wpn=S.wpn.map((v,i)=>Math.max(v,REC[st].wpn[i]));pl.x=S.x;pl.y=S.y;pl.dir='down';loadStage();healAll();save()}
function QORDER_RESET(){for(const k of Object.keys(QORDER))delete QORDER[k]}
async function applyClassFromHash(){
 const m=location.hash.match(/[#&]class=([A-Za-z0-9_-]+)/);if(!m)return;
 let msg;
 try{msg=applyClass(await unpackClass(m[1]),'선생님이 보낸 학습 설정을 적용했어요')}
 catch{msg='선생님 링크를 읽지 못했어요. 링크가 끝까지 복사되었는지 확인해 주세요.'}
 try{history.replaceState(null,'',location.pathname+location.search)}catch{}
 const n=$('#classnote');if(n){n.textContent=msg;n.hidden=false}
 log(msg,'gold');hud();teacherBadge();
}

// ---------- 화면 ----------
let TTAB=null,EDITING=null;
function openTeacher(){
 let ok=false;try{ok=sessionStorage.getItem('teach-ok')==='1'}catch{}
 if(ok){teacherPanel(TTAB||(TEACHER_EXT.length?TEACHER_EXT[0].key:'move'));return}
 const first=TEACHER_EXT.length?TEACHER_EXT[0].key:'move';
 openModal(`<h2>교사용 메뉴</h2><p>교사용 비밀번호를 입력하세요.${TEA.pin==='1234'?' <span class="muted">(처음 비밀번호: 1234 — 설정 탭에서 꼭 바꿔 주세요)</span>':''}</p>
  <div class="trow"><input id="tpin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" aria-label="교사용 비밀번호"><button id="tpinok">들어가기</button></div><p class="muted" id="tpinmsg"></p>
  <p class="muted">학생이 실수로 들어오지 않게 막는 간단한 잠금입니다(보안 기능은 아니에요).</p>`);
 const go=()=>{if($('#tpin').value===TEA.pin){try{sessionStorage.setItem('teach-ok','1')}catch{}teacherPanel(first)}else{$('#tpinmsg').textContent='비밀번호가 맞지 않아요.';$('#tpin').value=''}};
 $('#tpinok').onclick=go;$('#tpin').addEventListener('keydown',e=>{if(e.key==='Enter')go()});setTimeout(()=>$('#tpin')&&$('#tpin').focus(),50);
}
const TEACHER_EXT=[];
function tabs(cur){return `<div class="ttabs">${[...TEACHER_EXT.map(e=>[e.key,e.name]),['move','진행 이동'],['quiz','문제 관리'],['share','학생에게 보내기'],['stats','학습 기록'],['set','설정']].map(([k,n])=>`<button data-tab="${k}" class="${k===cur?'on':''}">${n}</button>`).join('')}</div>`}
function stageOpts(sel,withAll){return (withAll?`<option value="all" ${sel==='all'?'selected':''}>모든 장</option>`:'')+stages.map((s,i)=>`<option value="${i}" ${sel===i?'selected':''}>${STAGE_LABEL(i)}</option>`).join('')}
function teacherPanel(tab){
 TTAB=tab;$('#modal').classList.add('wide');
 let h=`<h2>🍎 교사용 메뉴</h2>${tabs(tab)}`;
 if(tab==='move'){
  h+=`<h3>장·단계 바로가기</h3>
  <div class="trow"><label>장 <select id="tj-st">${stageOpts(S.stage)}</select></label><label>단계 <select id="tj-step">${STEPS.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label></div>
  <label class="chk"><input type="checkbox" id="tj-rec" checked> 그 장에 알맞은 레벨·무기로 맞추기</label>
  <div class="trow"><button id="tj-go" class="primary">이동하기</button><button id="tj-end">엔딩 화면 보기</button></div>
  <h3>바로 체험 <small>(진행 상황은 바뀌지 않아요 · 현재 장 기준)</small></h3>
  <div class="trow"><button data-pr="mob">일반 전투</button><button data-pr="boss">보스전</button><button data-pr="shadow">그림자 장수전</button><button data-pr="trial">외줄 수련</button></div>
  <h3>시연·난이도</h3>
  <div class="trow"><label>난이도 <select id="t-diff">${Object.entries(DIFF).map(([k,v])=>`<option value="${k}" ${CLS.difficulty===k?'selected':''}>${v.name}</option>`).join('')}</select></label><span class="muted">적 체력·피해와 외줄 수련 바람이 달라져요 (학생 링크에도 담김)</span></div>
  <label class="chk"><input type="checkbox" id="t-god" ${TEA.god?'checked':''}> 무적 모드 (시연용 · 이 기기에만 · 피해와 목숨 감소 없음)</label>
  <div class="trow"><button id="t-heal">일행 회복·기력 가득</button><button id="t-items">도구 5개씩 받기</button><button id="t-coin">냥 +500</button></div>
  <p class="muted">지금: ${STAGE_LABEL(S.stage)} · Lv.${level()} · 경험치 ${S.xp} · ${S.coins}냥</p>`;
 }
 if(tab==='quiz'){
  const e=EDITING&&CLS.questions.find(q=>q.id===EDITING);
  const v=e||{stage:S.stage,text:'',choices:['','','',''],answer:0,explain:''};
  h+=`<h3>${e?'문제 고치기':'문제 추가'}</h3>
  <div class="trow"><label>장 <select id="q-st">${stageOpts(v.stage,true)}</select></label><label class="chk"><input type="checkbox" id="q-pri" checked> 다음 필살기에서 바로 출제</label></div>
  <label class="blk">질문<textarea id="q-text" maxlength="240" rows="2" placeholder="예) 친구가 놀림을 당할 때 할 수 있는 행동은?">${escH(v.text)}</textarea></label>
  <div class="qch">${[0,1,2,3].map(i=>`<label><input type="radio" name="q-ans" value="${i}" ${v.answer===i?'checked':''} aria-label="정답 ${i+1}"><input id="q-c${i}" maxlength="100" placeholder="보기 ${i+1}${i>=2?' (비워도 돼요)':''}" value="${escH(v.choices[i]||'')}"></label>`).join('')}</div>
  <p class="muted">동그라미를 눌러 정답을 고르세요. <button id="q-ox" class="mini">O/X 문제로 채우기</button></p>
  <label class="blk">해설 (틀렸을 때 보여 줄 말)<textarea id="q-exp" maxlength="300" rows="2">${escH(v.explain)}</textarea></label>
  <div class="trow"><button id="q-add" class="primary">${e?'고친 내용 저장':'문제 추가'}</button>${e?'<button id="q-cancel">고치기 취소</button>':''}<span id="q-msg" class="tmsg"></span></div>
  <h3>여러 문제 한꺼번에 붙여넣기</h3>
  <p class="muted">한 줄에 한 문제 — <b>장 | 질문 | 보기1 / 보기2 / 보기3 | 정답 번호 | 해설</b> (장은 1~5 또는 「전체」, 해설은 생략 가능)</p>
  <textarea id="q-bulk" rows="3" placeholder="1 | 단톡방에서 친구를 놀리는 글을 보면? | 같이 웃는다 / 멈추자고 말한다 / 다른 방에 퍼뜨린다 | 2 | 차별적인 말에는 동조하지 않아요."></textarea>
  <div class="trow"><button id="q-bulkadd">한꺼번에 추가</button><span id="q-bmsg" class="tmsg"></span></div>
  <h3>출제 방식</h3>
  <select id="q-mode"><option value="add" ${CLS.mode==='add'?'selected':''}>기본 문제 + 선생님 문제 섞어서 출제</option><option value="only" ${CLS.mode==='only'?'selected':''}>선생님 문제가 있는 장은 선생님 문제만 출제</option></select>
  <h3>선생님 문제 (${CLS.questions.length}개)</h3>
  <div class="qlist">${CLS.questions.map(q=>`<div class="qitem"><span class="tag">${q.stage==='all'?'모든 장':(q.stage+1)+'장'}</span> ${escH(q.text)}<br><small>정답: ${escH(q.choices[q.answer])} · 보기 ${q.choices.length}개</small><span class="qbtns"><button data-pri="${q.id}" class="mini">바로 출제</button><button data-edit="${q.id}" class="mini">고치기</button><button data-del="${q.id}" class="mini">삭제</button></span></div>`).join('')||'<p class="muted">아직 없어요. 위에서 추가해 보세요.</p>'}</div>
  ${CLS.questions.length?'<button id="q-clear">선생님 문제 모두 지우기</button>':''}
  <details><summary>기본 문제 보기 (학습지 기반 ${BASE_QS.flat().length}개)</summary>${BASE_QS.map((l,si)=>`<p><b>${STAGE_LABEL(si)}</b><br>${l.map((q,qi)=>`${qi+1}. ${q[0]} <small>→ ${q[1][q[2]]}</small>`).join('<br>')}</p>`).join('')}</details>`;
 }
 if(tab==='share'){
  h+=`<h3>학생에게 보내기</h3>
  <p>선생님 문제 <b>${CLS.questions.length}개</b>, 출제 방식, 난이도(<b>${DIFF[CLS.difficulty].name}</b>)를 링크 하나에 담습니다. 학생이 링크를 열면 그 기기에 <b>바로 적용</b>돼요.</p>
  <div class="trow"><label>학생 시작 장 <select id="s-start"><option value="">학생 진행 그대로</option>${stageOpts(null)}</select></label></div>
  <div class="trow"><button id="s-make" class="primary">학생용 링크 만들기</button></div>
  <textarea id="s-link" rows="3" readonly placeholder="여기에 링크가 만들어져요"></textarea>
  <div class="trow"><button id="s-copy">링크 복사</button><span id="s-msg" class="tmsg"></span></div>
  ${location.protocol==='file:'?'<p class="warn">지금은 내려받은 파일로 실행 중이라 링크를 만들 수 없어요. 웹 주소(배포 사이트)에서 열거나 아래 파일 기능을 쓰세요.</p>':''}
  <h3>파일로 주고받기</h3>
  <div class="trow"><button id="s-export">설정 파일 저장 (.json)</button><label class="filebtn">설정 파일 불러오기<input type="file" id="s-import" accept=".json,application/json"></label><span id="s-fmsg" class="tmsg"></span></div>
  <p class="muted">서버 없이 동작합니다. 학생이 링크를 연 뒤 문제를 바꾸면 새 링크를 다시 보내 주세요. 모든 학생 화면에 실시간으로 반영하려면 <a href="class.html">우리 반 연동판</a>을 쓰세요.</p>`;
 }
 if(tab==='stats'){
  const tot=S.right+S.wrong,rate=tot?Math.round(S.right/tot*100):0;
  const byStage=[0,1,2,3,4].map(st=>{let r=0,w=0;for(const [id,v] of Object.entries(S.qstats||{})){const q=questionById(id);if(q&&(q.stage===st||(q.stage==='all'&&st===S.stage))){r+=v[0];w+=v[1]}}return [r,w]});
  const miss=Object.entries(S.qstats||{}).filter(([,v])=>v[1]>0).sort((a,b)=>b[1][1]-a[1][1]).slice(0,10);
  h+=`<h3>이 기기의 학습 기록</h3><p>정답 필살기 <b>${S.right}</b>회 · 오답 <b>${S.wrong}</b>회 · 정답률 <b>${rate}%</b></p>
  <table class="ttable"><tr><th>장</th><th>맞힘</th><th>틀림</th><th>정답률</th></tr>${byStage.map(([r,w],i)=>`<tr><td>${STAGE_LABEL(i)}</td><td>${r}</td><td>${w}</td><td>${r+w?Math.round(r/(r+w)*100)+'%':'—'}</td></tr>`).join('')}</table>
  <h3>자주 틀린 문제</h3>${miss.map(([id,v])=>{const q=questionById(id);return q?`<p>${escH(q.text)}<br><small>틀림 ${v[1]} · 맞힘 ${v[0]}${q.custom?' · 선생님 문제':''}</small></p>`:''}).join('')||'<p class="muted">아직 틀린 문제가 없어요.</p>'}
  <div class="trow"><button id="st-reset">학습 기록 초기화</button></div>
  <p class="muted">기록은 학생마다 각자 기기에 저장됩니다. 학생은 엔딩의 「원정 기록 내려받기」 파일로 정답률과 다시 볼 문제를 제출할 수 있어요.</p>`;
 }
 if(tab==='set'){
  h+=`<h3>비밀번호 바꾸기</h3><div class="trow"><input id="p1" type="password" inputmode="numeric" maxlength="8" placeholder="새 비밀번호 (숫자 4~8자리)"><input id="p2" type="password" inputmode="numeric" maxlength="8" placeholder="한 번 더"><button id="p-save">바꾸기</button><span id="p-msg" class="tmsg"></span></div>
  <h3>정리</h3><div class="trow"><button id="t-lock">교사 메뉴 잠그기</button><button id="t-resetcls">선생님 설정 초기화 (문제·난이도)</button></div>`;
 }
 const ext=TEACHER_EXT.find(e=>e.key===tab);if(ext)h+=ext.render();
 openModal(h);$('#modal').classList.add('wide');
 bindTeacher(tab);if(ext)ext.bind();
}
function msg(id,t,ok=true){const e=$(id);if(e){e.textContent=t;e.className='tmsg '+(ok?'ok':'ng')}}
function readForm(){
 const choices=[0,1,2,3].map(i=>$('#q-c'+i).value.trim());
 let answer=+((document.querySelector('input[name="q-ans"]:checked')||{}).value||0);
 // 빈 보기를 빼고 정답 번호를 맞춤
 const kept=[];let ans=-1;choices.forEach((c,i)=>{if(c){if(i===answer)ans=kept.length;kept.push(c)}});
 const st=$('#q-st').value;
 return {id:EDITING||newId(),stage:st==='all'?'all':+st,text:$('#q-text').value,choices:kept,answer:ans,explain:$('#q-exp').value};
}
function parseBulk(text){
 const ok=[],bad=[];
 text.split(/\r?\n/).forEach((line,n)=>{if(!line.trim())return;
  const p=line.split('|').map(s=>s.trim());
  const stTxt=(p[0]||'').replace(/장/,'');const stage=/^(전체|모든|all|0)$/i.test(stTxt)?'all':(+stTxt)-1;
  const q=cleanQuestion({stage,text:p[1],choices:(p[2]||'').split('/').map(s=>s.trim()),answer:(+p[3])-1,explain:p[4]||''});
  if(q)ok.push(q);else bad.push(n+1)});
 return {ok,bad};
}
function bindTeacher(tab){
 document.querySelectorAll('.ttabs button').forEach(b=>b.onclick=()=>{EDITING=null;teacherPanel(b.dataset.tab)});
 const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn};
 if(tab==='move'){
  on('#tj-go',()=>{const st=+$('#tj-st').value,step=+$('#tj-step').value;closeModal();teacherJump(st,step,$('#tj-rec').checked)});
  on('#tj-end',()=>{closeModal();abortAll();S.stage=4;S.boss=true;S.finished=true;loadStage();save();hud();ending()});
  document.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{closeModal();practice(b.dataset.pr)});
  $('#t-diff').onchange=e=>{CLS.difficulty=e.target.value;saveClass()};
  $('#t-god').onchange=e=>{TEA.god=e.target.checked;saveTeach()};
  on('#t-heal',()=>{healAll();S.ki=100;save();hud();log('[교사] 일행 회복·기력 가득','gold');teacherPanel('move')});
  on('#t-items',()=>{for(const k of ITEM_ORDER)S.items[k]=Math.max(S.items[k],5);save();hud();log('[교사] 도구 5개씩 지급','gold');teacherPanel('move')});
  on('#t-coin',()=>{S.coins+=500;save();hud();log('[교사] 냥 +500','gold');teacherPanel('move')});
 }
 if(tab==='quiz'){
  on('#q-ox',()=>{$('#q-c0').value='O · 맞아요';$('#q-c1').value='X · 아니에요';$('#q-c2').value='';$('#q-c3').value=''});
  on('#q-add',()=>{const raw=readForm();const q=cleanQuestion(raw);
   if(!q){msg('#q-msg',!raw.text.trim()?'질문을 입력해 주세요.':raw.choices.length<2?'보기를 2개 이상 입력해 주세요.':'정답으로 고른 보기가 비어 있어요.',false);return}
   const i=CLS.questions.findIndex(x=>x.id===q.id);if(i>=0)CLS.questions[i]=q;else CLS.questions.push(q);
   const pri=$('#q-pri').checked;if(pri){PRIORITY=PRIORITY.filter(x=>x.id!==q.id);PRIORITY.unshift(q)}
   saveClass();EDITING=null;teacherPanel('quiz');msg('#q-msg',`${i>=0?'고쳤어요':'추가했어요'}!${pri?' 다음 필살기에서 바로 나와요.':''}`)});
  on('#q-cancel',()=>{EDITING=null;teacherPanel('quiz')});
  on('#q-bulkadd',()=>{const {ok,bad}=parseBulk($('#q-bulk').value);const room=200-CLS.questions.length;const add=ok.slice(0,Math.max(0,room));CLS.questions.push(...add);saveClass();teacherPanel('quiz');msg('#q-bmsg',`${add.length}개 추가${bad.length?` · 형식이 맞지 않는 줄: ${bad.join(', ')}`:''}${ok.length>add.length?' · 최대 200개까지':''}`,!bad.length)});
  $('#q-mode').onchange=e=>{CLS.mode=e.target.value==='only'?'only':'add';saveClass()};
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{CLS.questions=CLS.questions.filter(q=>q.id!==b.dataset.del);PRIORITY=PRIORITY.filter(q=>q.id!==b.dataset.del);saveClass();teacherPanel('quiz')});
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{EDITING=b.dataset.edit;teacherPanel('quiz')});
  document.querySelectorAll('[data-pri]').forEach(b=>b.onclick=()=>{const q=CLS.questions.find(q=>q.id===b.dataset.pri);if(q){PRIORITY=PRIORITY.filter(x=>x.id!==q.id);PRIORITY.unshift(q);b.textContent='대기 중 ✔'}});
  on('#q-clear',()=>{if(confirm('선생님 문제를 모두 지울까요?')){CLS.questions=[];PRIORITY=[];saveClass();teacherPanel('quiz')}});
 }
 if(tab==='share'){
  on('#s-make',async()=>{if(location.protocol==='file:'){msg('#s-msg','파일 실행에서는 링크를 만들 수 없어요.',false);return}
   const sv=$('#s-start').value;const code=await packClass(classForShare(sv===''?null:+sv));
   const url=location.origin+location.pathname+'#class='+code;$('#s-link').value=url;msg('#s-msg',`링크 길이 ${url.length}자${url.length>4000?' · 길어서 메신저에서 잘릴 수 있어요. 파일로 보내기를 권해요.':''}`)});
  on('#s-copy',async()=>{const t=$('#s-link').value;if(!t){msg('#s-msg','먼저 링크를 만들어 주세요.',false);return}try{await navigator.clipboard.writeText(t);msg('#s-msg','복사했어요!')}catch{$('#s-link').select();document.execCommand&&document.execCommand('copy');msg('#s-msg','복사했어요! (안 되면 칸을 길게 눌러 복사)')}});
  on('#s-export',()=>{const sv=$('#s-start').value;const blob=new Blob([JSON.stringify(classForShare(sv===''?null:+sv),null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='평등의나라_선생님설정.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
  $('#s-import').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>500000){msg('#s-fmsg','파일이 너무 커요.',false);return}
   try{const m=applyClass(JSON.parse(await f.text()),'설정 파일을 불러왔어요');msg('#s-fmsg',m);hud()}catch{msg('#s-fmsg','설정 파일을 읽지 못했어요.',false)}};
 }
 if(tab==='stats')on('#st-reset',()=>{if(confirm('이 기기의 학습 기록(정답·오답 통계)을 지울까요?')){S.qstats={};S.right=0;S.wrong=0;save();teacherPanel('stats')}});
 if(tab==='set'){
  on('#p-save',()=>{const a=$('#p1').value,b=$('#p2').value;if(!/^\d{4,8}$/.test(a)){msg('#p-msg','숫자 4~8자리로 정해 주세요.',false);return}if(a!==b){msg('#p-msg','두 번 입력한 비밀번호가 달라요.',false);return}TEA.pin=a;saveTeach();msg('#p-msg','바꿨어요!')});
  on('#t-lock',()=>{try{sessionStorage.removeItem('teach-ok')}catch{}closeModal()});
  on('#t-resetcls',()=>{if(confirm('선생님 문제, 출제 방식, 난이도를 처음 상태로 되돌릴까요?')){CLS=defaultClass();PRIORITY=[];saveClass();teacherPanel('set')}});
 }
}
$('#teacher').onclick=openTeacher;
$('#modal').addEventListener('close',()=>$('#modal').classList.remove('wide'));
teacherBadge();
applyClassFromHash();
window.addEventListener('hashchange',applyClassFromHash);
window.__teacher={teacherJump,practice,questionPool,get CLS(){return CLS},get PRIORITY(){return PRIORITY},packClass,unpackClass,applyClass,parseBulk,openTeacher};
