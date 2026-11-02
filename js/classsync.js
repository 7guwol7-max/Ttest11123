// 우리 반 연동판 — 교사가 낸 문제·설정을 서버(Supabase)에 저장하고, 같은 반 학생 화면에 실시간 반영
// 서버에는 반 코드별 「문제·출제 방식·난이도·시작 장」만 저장한다(학생 이름·기록 등 개인정보는 저장하지 않음).
const SYNC={
 url:'https://uiemjuhmejyasysjmzfc.supabase.co',
 key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZW1qdWhtZWp5YXN5c2ptemZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTc0MjYsImV4cCI6MjEwMDc5MzQyNn0.MkThNQ5ctVbN8ekgio_T2dXRptei284Tw1MO9g_Jtjg', // 공개용(anon) 키
 libs:['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js','https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'],
 store:'equality-rpg-sync-v1',poll:30000
};
const CODE_ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let SY=(()=>{try{const v=JSON.parse(localStorage.getItem(SYNC.store));if(v&&typeof v==='object'&&/^[A-Z0-9]{6}$/.test(v.code||''))return {role:v.role==='teacher'?'teacher':'student',code:v.code,key:v.role==='teacher'&&typeof v.key==='string'?v.key:undefined,lastTs:v.lastTs||null,lastStart:v.lastStart??null}}catch{}return {role:null,code:null}})();
let sbc=null,chan=null,pollT=null,pushT=null,SYNC_APPLYING=false,syncStatus={text:'',ok:true},liveState='';
function saveSync(){try{localStorage.setItem(SYNC.store,JSON.stringify(SY))}catch{}syncUI()}
function normCode(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)}
function randStr(n){const r=crypto.getRandomValues(new Uint8Array(n));let s='';for(const b of r)s+=CODE_ABC[b%CODE_ABC.length];return s}
function loadLib(){return new Promise((res,rej)=>{if(window.supabase)return res();let k=0;const tryUrl=()=>{const s=document.createElement('script');s.src=SYNC.libs[k];s.onload=()=>res();s.onerror=()=>{s.remove();k++;if(k<SYNC.libs.length)tryUrl();else rej(new Error('서버 연결 도구를 불러오지 못했어요'))};document.head.appendChild(s)};tryUrl()})}
async function client(){if(sbc)return sbc;await loadLib();sbc=window.supabase.createClient(SYNC.url,SYNC.key,{auth:{persistSession:false,autoRefreshToken:false}});return sbc}
async function fetchRow(code){const c=await client();const {data,error}=await c.from('rpg_class_sets').select('data,updated_at').eq('code',code).maybeSingle();if(error)throw new Error(error.message||'읽기 실패');return data}
function toast(t){const el=$('#synctoast');if(!el)return;el.textContent=t;el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>{el.hidden=true},5200)}

// ---------- 학생 ----------
function applyRemote(row,first){
 if(!row||!row.data)return false;
 if(!first&&SY.lastTs&&row.updated_at&&row.updated_at<=SY.lastTs)return false;
 const prev=new Set(CLS.questions.map(q=>q.id));
 const c=cleanClass(row.data);
 SYNC_APPLYING=true;try{CLS=c;saveClass();QORDER_RESET()}finally{SYNC_APPLYING=false}
 const fresh=c.questions.filter(q=>!prev.has(q.id));
 if(!first&&fresh.length)PRIORITY=fresh.concat(PRIORITY.filter(p=>!fresh.some(f=>f.id===p.id))).slice(0,20);
 let msg=first?`우리 반(${SY.code})에 들어왔어요! 선생님 문제 ${c.questions.length}개 · 난이도 ${DIFF[c.difficulty].name}`:`선생님이 문제를 바꿨어요!${fresh.length?` 새 문제 ${fresh.length}개가 다음 필살기에 나와요.`:''} (선생님 문제 ${c.questions.length}개)`;
 if(c.startStage!=null&&c.startStage!==SY.lastStart&&S.stage<c.startStage&&!S.finished&&!B&&!TR){teacherJumpQuiet(c.startStage);msg+=` · ${STAGE_LABEL(c.startStage)}로 이동`}
 SY.lastStart=c.startStage;SY.lastTs=row.updated_at||SY.lastTs;saveSync();
 log(msg,'gold');toast(msg);hud();return true;
}
async function joinClass(code){
 code=normCode(code);if(code.length!==6)throw new Error('반 코드는 6글자예요.');
 const row=await fetchRow(code);if(!row)throw new Error('그런 반 코드가 없어요. 선생님께 다시 확인해 주세요.');
 const keepTeacher=SY.role==='teacher'&&SY.code===code;
 SY={role:keepTeacher?'teacher':'student',code,key:keepTeacher?SY.key:undefined,lastTs:null,lastStart:null};
 applyRemote(row,true);subscribe();return row;
}
function leaveClass(){SY={role:null,code:null};saveSync();if(chan&&sbc){sbc.removeChannel(chan);chan=null}clearInterval(pollT);liveState='';syncUI()}
async function poll(){if(!SY.code||SY.role==='teacher'||document.hidden)return;try{const row=await fetchRow(SY.code);if(row)applyRemote(row,false)}catch{}}
async function subscribe(){
 clearInterval(pollT);pollT=setInterval(poll,SYNC.poll);
 try{const c=await client();if(chan){c.removeChannel(chan);chan=null}
  chan=c.channel('rpg-class-'+SY.code).on('postgres_changes',{event:'*',schema:'public',table:'rpg_class_sets',filter:'code=eq.'+SY.code},p=>{if(SY.role==='teacher')return;if(p&&p.new&&p.new.data)applyRemote(p.new,false)}).subscribe(st=>{liveState=st;syncUI()});
 }catch{liveState='';syncUI()}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});

// ---------- 교사 ----------
async function pushClass(){const c=await client();const {data,error}=await c.rpc('rpg_save_class',{p_code:SY.code,p_key:SY.key,p_data:classForShare(CLS.startStage)});if(error)throw new Error(error.message||'저장 실패');return data}
function setStatus(text,ok=true){syncStatus={text,ok};const e=$('#cs-status');if(e){e.textContent=text;e.className='tmsg '+(ok?'ok':'ng')}syncUI()}
function classSyncHook(){
 if(SYNC_APPLYING||SY.role!=='teacher'||!SY.code||!SY.key)return;
 clearTimeout(pushT);setStatus('저장 중…');
 pushT=setTimeout(async()=>{try{const ts=await pushClass();SY.lastTs=ts;saveSync();setStatus('학생 화면에 반영됨 ✓ '+new Date().toLocaleTimeString('ko-KR'))}catch(e){setStatus('저장하지 못했어요 — 인터넷 연결을 확인해 주세요 ('+e.message+')',false)}},600);
}
async function createClass(myKey){
 myKey=String(myKey||'').trim();
 if(myKey&&(myKey.length<8||myKey.length>40))throw new Error('반 비밀번호는 8~40자로 정해 주세요.');
 for(let i=0;i<5;i++){
  const code=randStr(6),key=myKey||randStr(10);
  SY={role:'teacher',code,key,lastTs:null,lastStart:null};
  try{const ts=await pushClass();SY.lastTs=ts;saveSync();subscribe();return SY}
  catch(e){if(!/wrong key/.test(e.message)){SY={role:null,code:null};saveSync();throw e}}
 }
 throw new Error('반 코드를 만들지 못했어요. 다시 눌러 주세요.');
}
async function connectTeacher(code,key){
 code=normCode(code);key=String(key||'').trim();
 const c=await client();const {data,error}=await c.rpc('rpg_check_class',{p_code:code,p_key:key});
 if(error)throw new Error(error.message);if(!data)throw new Error('반 코드나 반 비밀번호가 맞지 않아요. (대소문자 구분)');
 const row=await fetchRow(code);
 SY={role:'teacher',code,key,lastTs:row&&row.updated_at,lastStart:null};saveSync();
 if(row){SYNC_APPLYING=true;try{CLS=cleanClass(row.data);saveClass();QORDER_RESET()}finally{SYNC_APPLYING=false}}
 subscribe();
}
function joinUrl(code){return location.origin+location.pathname+'?class='+code}

// ---------- 화면 ----------
function syncUI(){
 const b=$('#classbadge');if(b){if(SY.code){b.hidden=false;b.textContent=`🏫 우리 반 ${SY.code}${SY.role==='teacher'?' (교사)':''}${liveState==='SUBSCRIBED'?' · 실시간':''}`}else b.hidden=true}
 const j=$('#cjoinstate');if(j)j.textContent=SY.code?`지금 우리 반: ${SY.code} ✓`:'';
}
TEACHER_EXT.push({key:'class',name:'우리 반 연결',
 render(){
  if(SY.role!=='teacher')return `<h3>우리 반 연결 <small>(서버에 저장해 학생 화면에 실시간 반영)</small></h3>
   <p>반을 만들면 <b>반 코드</b>가 생겨요. 학생은 첫 화면에 반 코드를 넣거나 입장 주소로 들어오면 되고, 선생님이 문제를 넣고 고칠 때마다 학생 화면에 바로 반영돼요.</p>
   <p class="muted">선생님마다 자기 반을 따로 만들고, 반마다 <b>반 비밀번호</b>를 정해요. 비밀번호는 서버에 암호화(해시)되어 저장되고, 그 비밀번호를 아는 선생님만 그 반의 문제를 바꿀 수 있어요.</p>
   <div class="trow"><input id="cs-newkey" type="password" maxlength="40" placeholder="반 비밀번호 정하기 (8자 이상)" aria-label="새 반 비밀번호" autocomplete="new-password"><input id="cs-newkey2" type="password" maxlength="40" placeholder="한 번 더" aria-label="반 비밀번호 확인" autocomplete="new-password"><button id="cs-new" class="primary">새 반 만들기</button></div>
   <p class="muted">비워 두면 비밀번호를 자동으로 만들어 드려요(연결 후 「보기」로 확인).</p>
   <div class="trow"><span id="cs-status" class="tmsg"></span></div>
   <h3>이미 만든 반에 다시 연결</h3>
   <div class="trow"><input id="cs-code" maxlength="6" placeholder="반 코드 6글자" aria-label="반 코드"><input id="cs-key" type="password" maxlength="40" placeholder="반 비밀번호" aria-label="반 비밀번호" autocomplete="current-password"><button id="cs-conn">연결</button></div>
   <p class="muted">서버에는 문제·출제 방식·난이도·시작 장만 저장돼요. 학생 이름이나 기록은 저장하지 않습니다.</p>`;
  return `<h3>우리 반 연결됨</h3>
   <div class="bigcode">${SY.code}</div>
   <p>학생 입장: 첫 화면에 <b>반 코드 ${SY.code}</b> 입력, 또는 아래 주소로 접속</p>
   <div class="trow"><input id="cs-url" readonly value="${escH(joinUrl(SY.code))}" style="flex:1;min-width:240px"><button id="cs-copy">주소 복사</button></div>
   <p>반 비밀번호: <b id="cs-keyv" class="secret">${'•'.repeat(10)}</b> <button id="cs-show" class="mini">보기</button> <span class="muted">— 다른 기기에서 이 반을 고치려면 반 코드와 반 비밀번호가 필요해요. 잊으면 되찾을 수 없으니 꼭 적어 두세요.</span></p>
   <div class="trow"><label>학생 시작 장 <select id="cs-start"><option value="">학생 진행 그대로</option>${stageOpts(CLS.startStage)}</select></label></div>
   <p>선생님 문제 <b>${CLS.questions.length}개</b> · 난이도 <b>${DIFF[CLS.difficulty].name}</b> · ${CLS.mode==='only'?'선생님 문제 우선':'기본 문제와 섞어서'} — 「문제 관리」·「진행 이동」 탭에서 바꾸면 자동으로 저장돼요.</p>
   <div class="trow"><button id="cs-push" class="primary">지금 다시 저장</button><span id="cs-status" class="tmsg ${syncStatus.ok?'ok':'ng'}">${escH(syncStatus.text)}</span></div>
   <div class="trow"><button id="cs-leave">이 기기에서 연결 끊기</button></div>`;
 },
 bind(){
  const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn};
  on('#cs-new',async()=>{const k1=$('#cs-newkey').value,k2=$('#cs-newkey2').value;if(k1!==k2){setStatus('두 번 입력한 비밀번호가 달라요.',false);return}setStatus('반을 만드는 중…');try{await createClass(k1);teacherPanel('class');setStatus('반을 만들었어요! 학생에게 반 코드를 알려 주세요.')}catch(e){setStatus(e.message,false)}});
  on('#cs-conn',async()=>{setStatus('연결 중…');try{await connectTeacher($('#cs-code').value,$('#cs-key').value);teacherPanel('class');setStatus('연결했어요! 이 반의 문제를 불러왔어요.')}catch(e){setStatus(e.message,false)}});
  on('#cs-copy',async()=>{try{await navigator.clipboard.writeText($('#cs-url').value);setStatus('주소를 복사했어요.')}catch{$('#cs-url').select();setStatus('칸을 길게 눌러 복사해 주세요.')}});
  on('#cs-show',()=>{$('#cs-keyv').textContent=SY.key||''});
  on('#cs-push',()=>classSyncHook());
  on('#cs-leave',()=>{if(confirm('이 기기에서 반 연결을 끊을까요? (서버의 반과 문제는 그대로 남아요)')){leaveClass();teacherPanel('class')}});
  const st=$('#cs-start');if(st)st.onchange=e=>{CLS.startStage=e.target.value===''?null:+e.target.value;saveClass()};
 }
});
// 첫 화면 반 입장
(function(){
 const btn=$('#cjoinbtn'),inp=$('#ccode'),msg=$('#cjoinmsg');
 if(btn)btn.onclick=async()=>{msg.textContent='확인 중…';try{await joinClass(inp.value);msg.textContent='';inp.value=''}catch(e){msg.textContent=e.message}};
 if(inp)inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();btn.click()}});
 const q=new URLSearchParams(location.search).get('class');
 (async()=>{
  if(q&&normCode(q).length===6&&!(SY.code===normCode(q))){try{await joinClass(q)}catch(e){if(msg)msg.textContent=e.message}}
  else if(SY.code){try{const row=await fetchRow(SY.code);if(row){SY.role==='teacher'?null:applyRemote(row,false)}subscribe()}catch{}}
  syncUI();
 })();
})();
window.__sync={get SY(){return SY},joinClass,createClass,connectTeacher,leaveClass,poll,applyRemote};
