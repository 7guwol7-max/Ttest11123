// 전투 — 여러 적 · 동료 교대 차례 · 공격/필살기(문제)/기술/도구/방어/도망 · 미니게임(동체시력 게임·타이밍 막기·주문·힘겨루기)
let B=null;
const ABORT={abort:true};
const BPOS=[{x:372,y:142},{x:416,y:122},{x:428,y:162}];
const ESLOT=[{x:112,y:156},{x:50,y:132},{x:165,y:120}];
const ESTAT={
 goblin:{hp:[55,70,85,100,118],atk:[11,14,17,20,23],xp:30,coin:10},
 fox:{hp:[45,57,69,82,96],atk:[9,12,15,17,20],xp:30,coin:12},
 wisp:{hp:[34,43,52,62,72],atk:[7,9,11,13,15],xp:26,coin:9},
 golem:{hp:[95,118,140,165,190],atk:[13,16,19,22,26],xp:48,coin:18},
 guard:{hp:[92,92,92,92,92],atk:[17,17,17,17,17],xp:40,coin:14},
 boss:{hp:[340,450,560,670,880],atk:[15,18,21,25,29],xp:320,coin:90},
 shadow:{hp:[360,360,360,360,360],atk:[22,22,22,22,22],xp:180,coin:40}
};
const QORDER={};
function shuffleArr(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function nextQuestion(p){
 const list=p==='all'?stages.flatMap((s,si)=>s.qs.map((q,qi)=>[si,qi])):stages[p].qs.map((q,qi)=>[p,qi]);
 const key=String(p);if(!QORDER[key]||QORDER[key].length!==list.length)QORDER[key]=shuffleArr(list.map((_,i)=>i));
 const idx=p==='all'?5:p;if(!Array.isArray(S.qptr))S.qptr=[0,0,0,0,0,0];
 const ptr=S.qptr[idx]|0;S.qptr[idx]=ptr+1;
 const [si,qi]=list[QORDER[key][ptr%list.length]];return stages[si].qs[qi];
}
function makeEnemy(type,st,extra={}){
 const s=ESTAT[type];const mult=extra.mult||1;const hp=Math.round(s.hp[st]*mult);
 return {type,st,name:extra.name||ENEMY_NAMES[st][type]||type,hp,max:hp,atk:Math.round(s.atk[st]*(extra.atkMult||1)),
  shield:type==='boss'?3:type==='shadow'?2:0,shieldMax:type==='boss'?3:type==='shadow'?2:0,stun:0,charge:false,turn:0,usedShell:false,usedSimon:0,stole:[],
  flash:0,shake:0,alpha:1,dead:false,slot:0,isBoss:type==='boss'||type==='shadow',quizPool:extra.quizPool??st,sprite:type==='shadow'?'shadow':type,spriteStage:st,xp:s.xp,coin:s.coin};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function W8(ms){const b=B;if(b)b.lastTick=performance.now();await sleep(ms);if(B!==b||!b||b.over)throw ABORT;b.lastTick=performance.now()}
const aliveE=()=>B.enemies.filter(e=>!e.dead);
const aliveP=()=>partyIdx().filter(i=>S.hp[i]>0);
function bMsg(t){$('#bmsg').textContent=t}
function fl(x,y,text,color,big){floaters.push({x,y,text,color,big,t0:performance.now()})}

// ---------- 시작/종료 ----------
function startBattle(opts){
 if(B||trans||TR)return;
 const st=S.stage;
 if(!aliveP().length)healAll();
 let enemies=[];
 if(opts.kind==='boss'){const b=makeEnemy('boss',st,{quizPool:st===4?'all':st});enemies=[b]}
 else if(opts.kind==='shadow'){const id=opts.id;enemies=[makeEnemy('shadow',4,{name:'그림자 '+ENEMY_NAMES[id].boss,quizPool:id})];enemies[0].shadowOf=id;enemies[0].spriteStage=id}
 else enemies=opts.types.map(tp=>makeEnemy(tp,st,{quizPool:st===4?'all':st}));
 enemies.forEach((e,i)=>{e.slot=i;placeEnemy(e)});
 B={opts,st,enemies,round:1,turnIdx:0,actor:null,waiting:null,mini:null,act:null,eact:null,fx:[],defend:{},vuln:{},guardAll:false,smoke:false,shown:false,over:false,cursor:null,pFlash:[0,0,0],crashes:0,boss:opts.kind==='boss'||opts.kind==='shadow',startXp:S.xp,startLv:level()};
 mode='battle';keys={};path=[];dialog=null;$('#dialog').hidden=true;MENU=null;$('#menuui').hidden=true;
 Music.sfx('encounter');
 const b=B;
 trans={t0:performance.now(),dur:600,kind:'swirl',mid:()=>{if(B!==b)return;b.shown=true;Music.play(b.boss?'boss':'battle');$('#battleui').hidden=false;$('#questbox').hidden=true;bParty();runBattle()}};
}
async function runBattle(){
 const b=B;
 try{await battleMain()}
 catch(err){
  if(err===ABORT||B!==b||!b||b.over)return;
  console.error(err);b.crashes++;b.waiting=null;b.mini=null;b.act=null;b.eact=null;
  if(b.crashes<4){bMsg('(잠깐! 전열을 가다듬었다)');setTimeout(()=>{if(B===b&&!b.over)runBattle()},300)}else endBattle('run');
 }
}
function endBattle(result){
 const b=B;if(!b)return;b.over=true;b.waiting=null;b.mini=null;
 const ent=b.opts.ent;
 trans={t0:performance.now(),dur:500,kind:'fade',mid:()=>{
  $('#battleui').hidden=true;$('#questbox').hidden=false;$('#bcmd').innerHTML='';
  B=null;mode=dialog?'dialog':'field';cooldown=performance.now()+2000;
  if(result==='lose'){const s=startOf(S.stage);pl.x=s[0];pl.y=s[1];pl.dir='down';loadStage()}
  else if(result==='win'){refreshEnts()}
  else if(ent&&(ent.kind==='mob')){ent.x=ent.hx;ent.y=ent.hy;ent.fx=ent.x;ent.fy=ent.y;ent.t=1}
  else if(ent&&ent.kind==='guard'){/* 도망치면 감시꾼은 제자리에서 다시 순찰 */}
  Music.play('field');save();hud();cv.focus();
 }};
}

// ---------- 질문 패널 ----------
function ask(html,buttons,opt={}){
 return new Promise(resolve=>{B.lastTick=performance.now();B.waiting={html,buttons,opt,resolve:v=>{if(B)B.lastTick=performance.now();resolve(v)},sel:Math.min(opt.sel||0,buttons.length-1)};renderAsk()});
}
function renderAsk(){
 const w=B&&B.waiting;if(!w)return;const el=$('#bcmd');
 el.innerHTML=w.html+`<div class="${w.opt.cols===2?'cmds':w.opt.cols===3?'cmds3':'clist'}">`+w.buttons.map((b,i)=>`<button class="choice${b.cls?' '+b.cls:''}" data-i="${i}" ${b.disabled?'disabled':''}>${b.key?`<kbd>${b.key}</kbd>`:''}${b.label}</button>`).join('')+'</div>';
 el.querySelectorAll('.choice').forEach((btn,i)=>{btn.onclick=()=>askPick(i);btn.onmouseenter=()=>{if(B&&B.waiting===w){w.sel=i;markAsk()}}});
 markAsk();
}
function markAsk(){const w=B&&B.waiting;if(!w)return;$('#bcmd').querySelectorAll('.choice').forEach((b,i)=>b.classList.toggle('sel',i===w.sel));const bt=w.buttons[w.sel];B.cursor=bt&&bt.enemy?bt.enemy:null}
function askPick(i){const w=B&&B.waiting;if(!w)return;const b=w.buttons[i];if(!b||b.disabled){Music.sfx('bump');return}B.waiting=null;B.cursor=null;Music.sfx('select');$('#bcmd').innerHTML='';w.resolve(b.value)}
function battleKey(k){
 if(!B)return;
 if(B.mini){B.mini.key(k);return}
 const w=B.waiting;if(!w)return;const n=w.buttons.length,cols=w.opt.cols||1;
 const mv=d=>{w.sel=(w.sel+d+n*4)%n;markAsk();Music.sfx('select')};
 if(k==='ArrowDown'||k==='s'||k==='S')mv(cols);
 else if(k==='ArrowUp'||k==='w'||k==='W')mv(-cols);
 else if(k==='ArrowRight'||k==='d'||k==='D')mv(1);
 else if(k==='ArrowLeft'||k==='a'||k==='A')mv(-1);
 else if(k===' '||k==='Enter')askPick(w.sel);
 else if((k==='Escape'||k==='Backspace')&&w.opt.back){B.waiting=null;B.cursor=null;$('#bcmd').innerHTML='';w.resolve('back')}
 else if(/^[1-9]$/.test(k)&&+k<=n){w.sel=+k-1;markAsk();askPick(+k-1)}
}
function battlePointer(x,y){
 if(!B)return;
 if(B.mini&&B.mini.click){B.mini.click(x,y);return}
 const w=B.waiting;if(!w)return;
 const i=w.buttons.findIndex(b=>b.enemy&&Math.abs(b.enemy.x-x)<26&&y<b.enemy.y+6&&y>b.enemy.y-60);
 if(i>=0)askPick(i);
}
function battleGuard(t){
 if(!B.shown)return;
 if(B.mini||B.waiting||B.over)B.lastTick=t;
 else if(B.lastTick&&t-B.lastTick>8000&&!trans){B.lastTick=t;B.act=null;B.eact=null;console.warn('battle watchdog: restarting turn loop');runBattle()}
 if(B.waiting&&!$('#bcmd').querySelector('.choice'))renderAsk();
 if($('#battleui').hidden){$('#battleui').hidden=false;$('#questbox').hidden=true}
}

// ---------- 상태창 ----------
function bParty(){
 if(!B)return;
 $('#bparty').innerHTML=partyIdx().map(i=>{const hp=S.hp[i],mx=maxHp(i);return `<div class="pm ${hp<=0?'ko':hp<mx*.3?'low':''} ${B.actor===i?'act':''}"><b>${B.actor===i?'▶':''}${MEMBERS[i].name}</b><div class="bar"><i style="transform:scaleX(${Math.max(0,hp)/mx})"></i></div><span>${hp} / ${mx}${B.defend[i]?' 🛡':''}</span></div>`}).join('')+
 `<div class="ki"><span>기력</span><div class="bar"><i style="transform:scaleX(${S.ki/100})"></i></div><span>${S.ki}</span></div>`;
}
function gainKi(n){S.ki=Math.max(0,Math.min(100,S.ki+n))}

// ---------- 메인 흐름 ----------
async function battleMain(){
 const b=B;
 if(!b.introDone){
  b.introDone=true;
  const e0=b.enemies[0];
  const names=b.enemies.length>1?`${e0.name} 외 ${b.enemies.length-1}마리`:e0.name;
  bMsg(`${josa(names,'이/가')} 나타났다!${b.boss?' (강적)':''}`);
  const taunt=e0.type==='shadow'?'…지난 고을에서 배운 것을 기억하느냐…':(TAUNTS[b.st][e0.type]||'');
  const extra=b.boss?`<p class="explain">보호막 ${e0.shieldMax}겹! 「필살기」 정답으로만 깨진다.</p>`:'';
  await ask(`<p class="q"><small>${e0.name}</small>「${taunt}」</p>${extra}`,[{label:'싸운다!',value:'go'}]);
 }
 while(true){
  if(!aliveE().length){await victory();return}
  if(!aliveP().length){await defeat();return}
  const party=aliveP();
  const actor=party[b.turnIdx%party.length];b.turnIdx++;
  b.actor=actor;bParty();
  const res=await playerTurn(actor);
  b.actor=null;bParty();
  if(res==='run'){bMsg('걸음아 날 살려라~! 무사히 도망쳤다.');Music.sfx('door');log('전투에서 물러났다. 다시 다가가면 재도전할 수 있다.');await W8(500);endBattle('run');return}
  if(!aliveE().length){await victory();return}
  await enemyPhase();
  b.defend={};b.vuln={};b.guardAll=false;b.smoke=false;b.round++;bParty();
 }
}
async function playerTurn(a){
 const b=B,st=b.st,sk=SKILLS[a];
 while(true){
  const hpTxt=aliveE().map(e=>`${e.name} ${e.hp}/${e.max}${e.shield?` 🛡${e.shield}`:''}${e.charge?' ⚠강공격 준비':''}${e.stun?' 💫':''}`).join(' · ');
  bMsg(`${MEMBERS[a].name}의 차례 · ${hpTxt}`);
  const cmd=await ask(`<p class="q"><small>${MEMBERS[a].name} · ${WEAPONS[a][S.wpn[a]][0]} (공격 ${atkOf(a)})</small>무엇을 할까? 정답 필살기가 가장 강하다!</p>`,[
   {label:'공격',value:'attack',key:'1'},{label:'필살기 (문제)',value:'quiz',key:'2'},
   {label:`${sk.name} <small>기력 ${sk.cost}</small>`,value:'skill',key:'3',disabled:S.ki<sk.cost},{label:'도구',value:'item',key:'4'},
   {label:'방어',value:'guard',key:'5'},{label:b.boss?'도망 불가':'도망',value:'run',key:'6',disabled:b.boss}
  ],{cols:2});
  if(cmd==='attack'){const t=await pickTarget();if(t==='back')continue;await doAttack(a,t);return}
  if(cmd==='quiz'){const t=await pickTarget();if(t==='back')continue;await doQuiz(a,t);return}
  if(cmd==='skill'){if(S.ki<sk.cost){bMsg('기력이 부족하다! (공격·방어·정답으로 기력이 찬다)');await W8(700);continue}
   let t=null;if(a===1){t=await pickTarget();if(t==='back')continue}
   await doSkill(a,t);return}
  if(cmd==='item'){const r=await pickItem(a);if(r==='back')continue;if(r==='run')return 'run';return}
  if(cmd==='guard'){b.defend[a]=true;gainKi(15);Music.sfx('block');bMsg(`${MEMBERS[a].name}은(는) 방어 자세를 취했다! (받는 피해 절반 · 기력 +15)`);bParty();await W8(650);return}
  if(cmd==='run'){
   if(b.boss){continue}
   const chance=.5+aliveE().filter(e=>e.stun).length*.15;
   if(Math.random()<chance)return 'run';
   bMsg('도망치려 했지만 길이 막혔다!');Music.sfx('wrong');await W8(700);return;
  }
 }
}
async function pickTarget(){
 const list=aliveE();if(list.length===1)return list[0];
 const r=await ask('<p class="q"><small>대상 선택</small>누구를 노릴까? (←→ 또는 적을 클릭)</p>',list.map((e,i)=>({label:`${e.name} ${e.hp}/${e.max}${e.shield?' 🛡'+e.shield:''}`,value:e,enemy:e,key:String(i+1)})).concat([{label:'뒤로',value:'back'}]),{back:true});
 return r;
}

// ---------- 플레이어 행동 ----------
function slashFx(x,y,col='#ffd75e'){for(let i=0;i<12;i++)B.fx.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.8)*4,t0:performance.now(),c:[col,'#fff','#ff7a5a'][i%3]})}
function dmgEnemy(e,amount,o={}){
 if(e.dead)return 0;
 let d=amount;
 if(e.shield>0&&!o.quiz)d=d*(o.pierce?.8:.35);
 if(e.defUp)d*=.6;
 d=Math.max(1,Math.round(d));
 e.hp-=d;if(e.shield>0)e.hp=Math.max(1,e.hp);
 e.flash=1;e.shake=8;fl(e.x,e.y-62,String(d),o.quiz?'#ffd75e':'#fff',o.quiz||d>=40);
 if(e.shield>0&&!o.quiz&&e.hp===1)fl(e.x,e.y-80,'보호막이 버틴다!','#c8b8ff');
 if(e.hp<=0){e.hp=0;e.dead=true;Music.sfx('stun');fl(e.x,e.y-40,DEFEAT_LINES[e.type]||'으악!','#ffe9a8');
  if(e.stole.length){for(const k of e.stole)S.items[k]++;fl(e.x,e.y-20,'훔친 도구를 되찾았다!','#7be38a');e.stole=[]}}
 return d;
}
async function attackAnim(who,target,hit){
 const b=B;b.act={who,target,t0:performance.now(),dur:720,hitAt:330};
 await W8(330);hit();await W8(390);b.act=null;
}
async function doAttack(a,e){
 bMsg(`${MEMBERS[a].name}의 공격!`);
 await attackAnim([a],e,()=>{let d=atkOf(a)*(.85+Math.random()*.3);const crit=Math.random()<.12;if(crit)d*=1.7;Music.sfx('hit');shake=crit?6:3;slashFx(e.x,e.y-30);dmgEnemy(e,d);if(crit)fl(e.x+20,e.y-90,'치명타!','#ff9a6b')});
 gainKi(12);bParty();await W8(250);
}
async function doQuiz(a,e){
 const b=B;const q=nextQuestion(e.quizPool);
 const order=shuffleArr(q[1].map((v,i)=>({v,i})));b.curQ=q;b.curOrder=order;
 let removed=-1;
 let ans;
 while(true){
  const btns=order.map((o,k)=>({label:o.v,value:o.i,key:String(k+1),disabled:o.i===removed}));
  if(S.items.hint>0&&removed<0)btns.push({label:`힌트 부적 쓰기 (${S.items.hint}) — 오답 하나 지우기`,value:'hint',cls:'hintbtn'});
  ans=await ask(`<p class="q"><small>${MEMBERS[a].name}의 필살기 · ${e.shield?`보호막 깨기 (${e.shieldMax-e.shield+1}/${e.shieldMax})`:'정답을 고르세요'}</small>${q[0]}</p>`,btns);
  if(ans==='hint'){S.items.hint--;const wrong=order.filter(o=>o.i!==q[2]);removed=wrong[(Math.random()*wrong.length)|0].i;Music.sfx('chime');continue}
  break;
 }
 if(ans===q[2]){
  S.right++;gainKi(30);
  const finale=e.isBoss&&e.shield===1&&aliveP().length>1;
  const who=finale?aliveP():[a];
  const name=finale?`${stages[b.st].power} 합격기 · 다 함께!`:MEMBERS[a].move.replace('{p}',stages[Math.min(b.st,4)].power);
  bMsg(`정답! ${who.map(i=>MEMBERS[i].name).join('·')}의 「${name}」!`);Music.sfx('ok');
  await attackAnim(who,e,()=>{Music.sfx('big');shake=who.length>1?9:6;slashFx(e.x,e.y-34);slashFx(e.x,e.y-34,'#ffffff');
   const d=80+atkOf(a)*1.6+(who.length>1?40:0);
   if(e.shield>0){e.shield--;fl(e.x,e.y-100,'보호막 파괴!','#c8b8ff',true)}
   dmgEnemy(e,d,{quiz:true})});
  bParty();
  await ask(`<p class="q ok"><small>정답!</small>${q[1][q[2]]}</p><p class="explain">${q[3]}</p>`,[{label:'계속',value:1}]);
 } else {
  S.wrong++;gainKi(5);b.vuln[a]=true;Music.sfx('wrong');shake=3;
  bMsg(`앗, 기술이 꼬였다! ${MEMBERS[a].name}이(가) 비틀거린다 (이번 턴 받는 피해 증가)`);
  await ask(`<p class="q ng"><small>오답…</small>다시 생각해 보자!</p><p class="explain">💡 ${q[3]}</p>`,[{label:'계속',value:1}]);
 }
 save();
}
async function doSkill(a,t){
 const b=B,sk=SKILLS[a];S.ki-=sk.cost;bParty();
 bMsg(`${MEMBERS[a].name}의 「${sk.name}」!`);Music.sfx('ok');
 if(a===0){await attackAnim([0],'all',()=>{Music.sfx('big');shake=6;for(const e of aliveE()){slashFx(e.x,e.y-30);dmgEnemy(e,atkOf(0)*1.3*(.9+Math.random()*.2))}})}
 else if(a===1){await attackAnim([1],t,()=>{Music.sfx('big');shake=5;slashFx(t.x,t.y-30,'#7be3ff');dmgEnemy(t,atkOf(1)*2.4,{pierce:true})})}
 else {b.guardAll=true;aliveP().forEach(i=>{const h=Math.round(maxHp(i)*.15);S.hp[i]=Math.min(maxHp(i),S.hp[i]+h);fl(BPOS[i].x,BPOS[i].y-40,'+'+h,'#7be38a')});Music.sfx('heal');bMsg('곰돌 방패! 이번 턴 받는 피해가 크게 줄고 일행이 회복했다.');bParty();hud();await W8(700)}
 bParty();await W8(250);
}
async function pickItem(a){
 const b=B;
 const btns=ITEM_ORDER.map(k=>{const usable=!['hint','charm'].includes(k);return {label:`${ITEMS[k].name} ×${S.items[k]} <small>${usable?ITEMS[k].desc:(k==='hint'?'필살기 문제 중에 사용':'강공격 때 자동 발동')}</small>`,value:k,disabled:S.items[k]<=0||!usable}});
 btns.push({label:'뒤로',value:'back'});
 const k=await ask('<p class="q"><small>도구</small>무엇을 쓸까?</p>',btns,{back:true});
 if(k==='back')return 'back';
 S.items[k]--;Music.sfx('select');
 if(k==='potion'){aliveP().forEach(i=>{S.hp[i]=Math.min(maxHp(i),S.hp[i]+60);fl(BPOS[i].x,BPOS[i].y-40,'+60','#7be38a')});Music.sfx('heal');bMsg('회복약을 나눠 마셨다! 일행 체력 +60')}
 else if(k==='rice'){const ko=partyIdx().filter(i=>S.hp[i]<=0);const i=ko.length?ko[0]:aliveP().sort((x,y)=>S.hp[x]/maxHp(x)-S.hp[y]/maxHp(y))[0];const h=Math.round(maxHp(i)*.6);S.hp[i]=Math.min(maxHp(i),S.hp[i]+h);fl(BPOS[i].x,BPOS[i].y-40,'+'+h,'#7be38a');Music.sfx('heal');bMsg(`우정 떡! ${MEMBERS[i].name}이(가) 힘을 되찾았다.`)}
 else if(k==='bomb'){bMsg('폭죽 펑펑!');Music.sfx('big');shake=7;for(const e of aliveE()){slashFx(e.x,e.y-30,'#ff9a3a');dmgEnemy(e,40+12*b.st)}}
 else if(k==='smoke'){if(!b.boss){bMsg('연막탄! 뿌연 연기 속으로 도망쳤다.');save();hud();await W8(500);return 'run'}b.smoke=true;bMsg('연막탄! 적의 다음 공격이 빗나간다.')}
 save();hud();bParty();await W8(800);return 'ok';
}

// ---------- 적 행동 ----------
function pickVictim(){const p=aliveP();return p[(Math.random()*p.length)|0]}
function hurt(i,raw,quiet){
 const b=B;let d=raw;if(b.defend[i])d*=.5;if(b.guardAll)d*=.3;if(b.vuln[i])d*=1.5;d*=1-Math.min(.25,(level()-1)*.02);
 d=Math.max(1,Math.round(d));S.hp[i]=Math.max(0,S.hp[i]-d);b.pFlash[i]=1;gainKi(6);
 fl(BPOS[i].x,BPOS[i].y-44,'-'+d,'#ff6b5b');if(!quiet)Music.sfx('hurt');
 if(S.hp[i]<=0)fl(BPOS[i].x,BPOS[i].y-62,'쓰러졌다!','#ff9a8a');
 bParty();hud();return d;
}
async function enemyAnim(e,target,hit){const b=B;b.eact={e,target,t0:performance.now(),dur:620,hitAt:300};await W8(300);hit();await W8(320);b.eact=null}
async function enemyPhase(){
 const b=B;
 for(const e of b.enemies.slice()){
  if(e.dead)continue;
  if(!aliveP().length)return;
  e.defUp=0;
  if(e.stun>0){e.stun--;bMsg(`${josa(e.name,'은/는')} 어지러워서 움직이지 못한다! 💫`);await W8(700);continue}
  if(b.smoke){bMsg(`연막 속에서 ${e.name}의 공격이 빗나갔다!`);await W8(600);continue}
  const phase2=e.isBoss&&e.hp<e.max*.5;
  const atk=e.atk*(phase2?1.2:1);
  if(e.charge){e.charge=false;await heavyAttack(e,atk,e.isBoss&&Math.random()<.5);continue}
  let act='hit';const r=Math.random();
  if(e.type==='boss'||e.type==='shadow'){
   const pat=e.type==='boss'?['hit','charge','shell','hit','summon','simon','all','mash','charge','hit']:['hit','shell','charge','simon','all','mash'];
   act=pat[e.turn%pat.length];
   if(act==='summon'&&(aliveE().length>=3||b.st===4&&e.type==='shadow'))act='all';
   if(phase2&&r<.25)act='all';
  }
  else if(e.type==='goblin')act=r<.62?'hit':'charge';
  else if(e.type==='fox')act=(!e.usedShell&&b.round>=2&&r<.35)?'shell':(r<.55&&hasStealable())?'steal':'hit';
  else if(e.type==='wisp')act=r<.3?'drain':'double';
  else if(e.type==='golem')act=e.turn%2===0?'charge':'hit';
  else if(e.type==='guard')act=(!e.called&&aliveE().length<3&&r<.25)?'whistle':r<.55?'hit':'charge';
  e.turn++;
  await doEnemy(e,act,atk);
 }
}
function hasStealable(){return ['potion','bomb','smoke','rice'].some(k=>S.items[k]>0)}
async function doEnemy(e,act,atk){
 const b=B;
 if(act==='hit'){const v=pickVictim();bMsg(`${e.name}의 공격!`);await enemyAnim(e,v,()=>{hurt(v,atk*(.85+Math.random()*.3));shake=3});return}
 if(act==='charge'){e.charge=true;Music.sfx('charge');bMsg(`${josa(e.name,'이/가')} ${e.type==='golem'?'몸을 크게 부풀린다':e.isBoss?'엄청난 기운을 모은다':'무기를 높이 치켜들었다'}! ⚠ 다음 차례에 강공격! (방어·곰돌 방패·타이밍 막기로 대비)`);await W8(1100);return}
 if(act==='steal'){const ks=['potion','bomb','smoke','rice'].filter(k=>S.items[k]>0);const k=ks[(Math.random()*ks.length)|0];
  await enemyAnim(e,pickVictim(),()=>{S.items[k]--;e.stole.push(k);Music.sfx('steal');fl(e.x,e.y-70,`${ITEMS[k].name} 슬쩍!`,'#ff9a6b')});
  bMsg(`${josa(e.name,'이/가')} ${josa(ITEMS[k].name,'을/를')} 훔쳐 갔다! (쓰러뜨리면 되찾는다)`);hud();await W8(900);return}
 if(act==='drain'){const v=pickVictim();bMsg(`${josa(e.name,'이/가')} 겁을 준다! 기력이 빠져나간다…`);await enemyAnim(e,v,()=>{hurt(v,atk*.5);gainKi(-18);fl(BPOS[v].x,BPOS[v].y-60,'기력 -18','#c8b8ff')});bParty();return}
 if(act==='double'){bMsg(`${e.name}의 연속 공격!`);for(let k=0;k<2;k++){if(!aliveP().length)return;const v=pickVictim();await enemyAnim(e,v,()=>{hurt(v,atk*.6)})}return}
 if(act==='whistle'){e.called=true;Music.sfx('alarm');const ne=makeEnemy('guard',b.st);ne.slot=[0,1,2].find(s=>!b.enemies.some(x=>!x.dead&&x.slot===s))??2;placeEnemy(ne);b.enemies.push(ne);bMsg(`${josa(e.name,'이/가')} 호루라기를 불었다! 감시꾼이 한 명 더 나타났다!`);await W8(1000);return}
 if(act==='summon'){const tp=Math.random()<.5?'goblin':'fox';const ne=makeEnemy(tp,b.st,{quizPool:e.quizPool});ne.slot=[1,2].find(s=>!b.enemies.some(x=>!x.dead&&x.slot===s))??2;placeEnemy(ne);b.enemies.push(ne);Music.sfx('alarm');bMsg(`${josa(e.name,'이/가')} 부하 ${josa(ne.name,'을/를')} 불러냈다!`);await W8(1000);return}
 if(act==='all'){bMsg(`${e.name}의 광역 공격! 「${e.isBoss?'편견의 폭풍':'몸통 박치기'}」!`);await enemyAnim(e,'all',()=>{for(const i of aliveP())hurt(i,atk*.85,true);Music.sfx('hurt');shake=6});return}
 if(act==='shell'){e.usedShell=true;const ok=await shellGame(e);
  if(ok){e.stun=1;dmgEnemy(e,25+b.st*5);Music.sfx('perfect');bMsg(`맞혔다! ${josa(e.name,'이/가')} 당황해서 어지러워한다! 💫`);await W8(1000)}
  else if(hasStealable()){await doEnemy(e,'steal',atk)}
  else{const v=pickVictim();bMsg(`틀렸다! ${e.name}의 비웃음 공격!`);await enemyAnim(e,v,()=>hurt(v,atk*1.3))}
  return}
 if(act==='simon'){const ok=await simonGame(e);
  if(ok){e.stun=1;gainKi(25);Music.sfx('perfect');bMsg(`주문을 그대로 되받아쳤다! ${josa(e.name,'이/가')} 휘청인다! (기력 +25)`);bParty();await W8(1000)}
  else{bMsg(`주문이 틀렸다! ${e.name}의 저주가 일행을 덮친다!`);await enemyAnim(e,'all',()=>{for(const i of aliveP())hurt(i,atk*1.0,true);Music.sfx('hurt');shake=6})}
  return}
 if(act==='mash'){const ok=await mashGame(e);
  if(ok){e.stun=1;dmgEnemy(e,30+b.st*6);Music.sfx('perfect');bMsg(`힘겨루기 승리! ${josa(e.name,'을/를')} 밀쳐 냈다! 💫`);await W8(1000)}
  else{const v=pickVictim();bMsg(`힘겨루기에서 밀렸다! ${MEMBERS[v].name}이(가) 크게 튕겨 나간다!`);await enemyAnim(e,v,()=>{hurt(v,atk*1.6);shake=7})}
  return}
}
function placeEnemy(e){const s=e.isBoss?{x:112,y:162}:ESLOT[e.slot]||ESLOT[2];e.x=s.x;e.y=s.y}
async function heavyAttack(e,atk,all){
 const b=B;
 bMsg(`${e.name}의 강공격!! 타이밍을 맞춰 막아라!`);
 const res=await qte(e);
 const mult=res==='perfect'?0:res==='good'?.4:1;
 const targets=all?aliveP():[pickVictim()];
 await enemyAnim(e,all?'all':targets[0],()=>{
  if(mult===0){Music.sfx('perfect');fl(240,96,'완벽 방어!','#7be38a',true);dmgEnemy(e,15+b.st*4)}
  else{for(const i of targets)hurt(i,atk*(e.isBoss?2:2.2)*mult,true);Music.sfx(mult<1?'block':'hurt');shake=mult<1?3:8;if(mult<1)fl(240,96,'막았다!','#ffd75e',true)}
 });
 bMsg(res==='perfect'?'완벽하게 막고 되받아쳤다!':res==='good'?'반쯤 막아 냈다!':'막지 못했다…!');await W8(600);
}

// ---------- 미니게임 ----------
function miniButtons(html,btns){$('#bcmd').innerHTML=html+(btns?`<div class="clist">${btns.map((b,i)=>`<button class="choice" data-i="${i}">${b}</button>`).join('')}</div>`:'')}
function shellGame(e){
 const b=B,st=b.st;
 return new Promise(resolve=>{
  const swaps=5+st*2+(e.isBoss?3:0),dur=Math.max(170,380-st*35-(e.isBoss?40:0));
  const m={type:'shell',e,pos:[0,1,2],ball:(Math.random()*3)|0,phase:'show',t0:performance.now(),swaps:[],sel:1,chosen:-1,glint:false,result:null};
  for(let i=0;i<swaps;i++){const a=(Math.random()*3)|0;let c=(Math.random()*3)|0;if(c===a)c=(a+1)%3;m.swaps.push([a,c])}
  m.swapI=0;m.swapT0=0;m.dur=dur;
  bMsg(`${josa(e.name,'이/가')} 동체시력 게임을 걸어 왔다! 「구슬이 든 그릇을 눈으로 따라와 봐~」`);
  miniButtons('<p class="q"><small>동체시력 게임</small>구슬이 어느 그릇에 들어가는지 잘 봐!</p>');
  const choose=slot=>{if(m.phase!=='choose')return;m.chosen=slot;m.phase='reveal';m.t0=performance.now();const cup=m.pos.indexOf(slot);m.result=cup===m.ball;Music.sfx(m.result?'chime':'wrong');$('#bcmd').innerHTML='';setTimeout(()=>{if(B!==b)return;B.mini=null;resolve(m.result)},1100)};
  m.key=k=>{if(m.phase!=='choose')return;if(k==='ArrowLeft'||k==='a'||k==='A'){m.sel=(m.sel+2)%3;Music.sfx('select')}else if(k==='ArrowRight'||k==='d'||k==='D'){m.sel=(m.sel+1)%3;Music.sfx('select')}else if(k===' '||k==='Enter')choose(m.sel);else if(/^[1-3]$/.test(k))choose(+k-1)};
  m.click=(x,y)=>{if(m.phase!=='choose')return;const s=[180,240,300].findIndex(cx=>Math.abs(cx-x)<26);if(s>=0&&y>50&&y<120)choose(s)};
  m.update=t=>{
   if(m.phase==='show'&&t-m.t0>1100){m.phase='shuffle';m.swapT0=t}
   if(m.phase==='shuffle'){const k=(t-m.swapT0)/m.dur;if(k>=1){const [a,c]=m.swaps[m.swapI];const ia=m.pos.indexOf(a),ic=m.pos.indexOf(c);m.pos[ia]=c;m.pos[ic]=a;m.swapI++;m.swapT0=t;Music.sfx('shuffle');
     if(m.swapI>=m.swaps.length){m.phase='choose';m.t0=t;m.glint=aliveP().includes(1);
      miniButtons(`<p class="q"><small>동체시력 게임</small>구슬은 어디에? (←→·Space, 숫자 1~3, 그릇 클릭)${m.glint?' <b>보미의 매의 눈이 번뜩!</b>':''}</p>`,['1 왼쪽 그릇','2 가운데 그릇','3 오른쪽 그릇']);
      $('#bcmd').querySelectorAll('.choice').forEach((bt,i)=>bt.onclick=()=>choose(i))}}}
  };
  m.draw=t=>{
   ctx.fillStyle='rgba(20,10,30,.72)';ctx.fillRect(140,40,200,92);ctx.strokeStyle='#ffd75e';ctx.lineWidth=2;ctx.strokeRect(140,40,200,92);
   ctx.fillStyle='#7a2a1a';ctx.fillRect(150,104,180,8);
   const slotX=s=>180+s*60;
   for(let cup=0;cup<3;cup++){
    let x=slotX(m.pos[cup]),y=100,lift=0;
    if(m.phase==='shuffle'&&m.swapI<m.swaps.length){const [a,c]=m.swaps[m.swapI];const k=Math.min(1,(t-m.swapT0)/m.dur);if(cup===m.pos.indexOf(a)||cup===m.pos.indexOf(c)){const from=slotX(m.pos[cup]),to=slotX(cup===m.pos.indexOf(a)?c:a);x=from+(to-from)*k;y=100-Math.sin(k*Math.PI)*(cup===m.pos.indexOf(a)?14:-6)}}
    if(m.phase==='show'||(m.phase==='reveal'&&(cup===m.ball||m.pos[cup]===m.chosen)))lift=18;
    if(cup===m.ball&&lift){ctx.fillStyle='#ffd75e';ctx.beginPath();ctx.arc(x,y-4,5,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(x-2,y-7,2,2)}
    ctx.fillStyle='#2a1a0a';ctx.fillRect(x-15,y-26-lift,30,24);ctx.fillStyle='#c8641a';ctx.fillRect(x-13,y-24-lift,26,20);ctx.fillStyle='#e8944a';ctx.fillRect(x-13,y-24-lift,26,4);ctx.fillStyle='#ffd75e';ctx.fillRect(x-13,y-12-lift,26,2);
    if(m.phase==='choose'&&m.glint&&cup===m.ball&&t-m.t0<350){ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillRect(x-3,y-34,6,6)}
   }
   if(m.phase==='choose'){const x=slotX(m.sel);ttxt('▼',x,56,14,'#ffd75e')}
   if(m.phase==='show')ttxt('잘 봐!',240,54,14,'#fff');
   if(m.phase==='reveal')ttxt(m.result?'맞혔다!':'틀렸다!',240,54,16,m.result?'#7be38a':'#ff6b5b');
  };
  b.mini=m;
 });
}
function qte(e){
 const b=B,st=b.st;
 if(S.items.charm>0){S.items.charm--;hud();Music.sfx('perfect');fl(240,80,'수호 부적 발동!','#7be38a',true);return sleep(700).then(()=>'perfect')}
 return new Promise(resolve=>{
  const speed=1.0+st*.14+(e.isBoss?.2:0),zone=.26-st*.015,center=.25+Math.random()*.5,perfect=.07;
  const m={type:'qte',t0:performance.now(),done:false,res:null,pos:0,center,zone,perfect};
  const finish=res=>{if(m.done)return;m.done=true;m.res=res;Music.sfx(res==='perfect'?'perfect':res==='good'?'block':'wrong');setTimeout(()=>{if(B!==b)return;B.mini=null;$('#bcmd').innerHTML='';resolve(res)},500)};
  const press=()=>{if(m.done)return;const d=Math.abs(m.pos-center);finish(d<=perfect/2?'perfect':d<=zone/2?'good':'miss')};
  miniButtons('<p class="q"><small>타이밍 막기</small>바늘이 초록 칸에 오면 Space! (가운데 노란 칸은 완벽 방어 + 반격)</p>',['막기!']);
  $('#bcmd').querySelector('.choice').onclick=press;
  m.key=k=>{if(k===' '||k==='Enter'||k==='z'||k==='Z')press()};
  m.click=()=>press();
  m.update=t=>{if(m.done)return;const el=(t-m.t0)/1000;if(el<.5){m.pos=0;return}const ph=(el-.5)*speed;m.pos=1-Math.abs((ph%2)-1);if(el>3.6)finish('miss')};
  m.draw=t=>{
   const x0=140,w=200,y=70;ctx.fillStyle='rgba(20,10,30,.78)';ctx.fillRect(x0-10,y-26,w+20,52);ctx.strokeStyle='#ff6b5b';ctx.lineWidth=2;ctx.strokeRect(x0-10,y-26,w+20,52);
   ttxt('강공격! 막아라!',240,y-10,13,'#ff9a8a');
   ctx.fillStyle='#5a1a1a';ctx.fillRect(x0,y,w,12);ctx.fillStyle='#3fae5a';ctx.fillRect(x0+w*(center-zone/2),y,w*zone,12);ctx.fillStyle='#ffd75e';ctx.fillRect(x0+w*(center-perfect/2),y,w*perfect,12);
   const nx=x0+w*m.pos;ctx.fillStyle='#fff';ctx.fillRect(nx-1,y-4,3,20);
   if(m.res)ttxt(m.res==='perfect'?'완벽!':m.res==='good'?'막았다!':'실패!',240,y+30,14,m.res==='miss'?'#ff6b5b':'#7be38a');
  };
  b.mini=m;
 });
}
function simonGame(e){
 const b=B,st=b.st;
 return new Promise(resolve=>{
  const len=Math.min(7,3+Math.floor(st*.8)+(e.isBoss?1:0));const ARR=['up','right','down','left'],SYM={up:'↑',right:'→',down:'↓',left:'←'};
  const seq=Array.from({length:len},()=>ARR[(Math.random()*4)|0]);
  const step=Math.max(330,560-st*45);
  const m={type:'simon',seq,shown:-1,phase:'show',t0:performance.now(),input:[],done:false,res:null,lastIn:0};
  bMsg(`${josa(e.name,'이/가')} 주문을 왼다! 순서를 외워서 그대로 되받아쳐라!`);
  miniButtons('<p class="q"><small>주문 따라 하기</small>화살표 순서를 잘 외워!</p>');
  const finish=ok=>{if(m.done)return;m.done=true;m.res=ok;setTimeout(()=>{if(B!==b)return;B.mini=null;$('#bcmd').innerHTML='';resolve(ok)},600)};
  const input=d=>{if(m.phase!=='input'||m.done)return;m.input.push(d);m.lastIn=performance.now();const i=m.input.length-1;if(seq[i]!==d){Music.sfx('wrong');finish(false);return}Music.sfx('select');if(m.input.length===seq.length)finish(true)};
  m.key=k=>{const d={ArrowUp:'up',w:'up',W:'up',ArrowRight:'right',d:'right',D:'right',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left'}[k];if(d)input(d)};
  m.update=t=>{
   if(m.phase==='show'){const k=Math.floor((t-m.t0)/step);if(k!==m.shown&&k<seq.length){m.shown=k;Music.sfx('shuffle')}if(k>=seq.length+1){m.phase='input';m.lastIn=t;
     miniButtons(`<p class="q"><small>주문 따라 하기</small>방향키로 ${seq.length}개를 순서대로! (버튼도 가능)</p>`,['↑ 위','→ 오른쪽','↓ 아래','← 왼쪽']);
     $('#bcmd').querySelectorAll('.choice').forEach((bt,i)=>bt.onclick=()=>input(ARR[i]))}}
   if(m.phase==='input'&&!m.done&&t-m.lastIn>4000)finish(false);
  };
  m.draw=t=>{
   ctx.fillStyle='rgba(20,10,30,.78)';ctx.fillRect(130,38,220,72);ctx.strokeStyle='#c8b8ff';ctx.lineWidth=2;ctx.strokeRect(130,38,220,72);
   if(m.phase==='show'){ttxt('외워라!',240,54,12,'#c8b8ff');const k=Math.floor((t-m.t0)/step);const inStep=((t-m.t0)%step)/step;if(k<seq.length&&inStep<.78)ttxt(SYM[seq[k]],240,96,36,'#ffd75e');ttxt(`${Math.min(k+1,seq.length)} / ${seq.length}`,320,104,10,'#fff')}
   else{ttxt('따라 하라!',240,54,12,'#ffd75e');for(let i=0;i<seq.length;i++){const x=240+(i-(seq.length-1)/2)*26;const v=m.input[i];ctx.fillStyle=v?(v===seq[i]?'#3fae5a':'#c83a2a'):'#2a2a4a';ctx.fillRect(x-11,72,22,24);if(v)ttxt(SYM[v],x,91,16,'#fff')}
    if(m.res!=null)ttxt(m.res?'성공!':'실패!',240,108,12,m.res?'#7be38a':'#ff6b5b')}
  };
  b.mini=m;
 });
}
function mashGame(e){
 const b=B,st=b.st;
 return new Promise(resolve=>{
  const m={type:'mash',v:.35,t0:performance.now(),last:performance.now(),done:false,res:null};
  const decay=.17+st*.03+(e.isBoss?.05:0);
  bMsg(`${josa(e.name,'이/가')} 힘겨루기를 걸어 왔다! Space를 마구 눌러 밀어내라!`);
  miniButtons('<p class="q"><small>힘겨루기</small>3초 안에 게이지를 끝까지! (Space 연타 · 버튼 연타)</p>',['힘내라!']);
  const finish=ok=>{if(m.done)return;m.done=true;m.res=ok;setTimeout(()=>{if(B!==b)return;B.mini=null;$('#bcmd').innerHTML='';resolve(ok)},600)};
  const press=()=>{if(m.done)return;m.v=Math.min(1.05,m.v+.075);Music.sfx('mash');if(m.v>=1)finish(true)};
  $('#bcmd').querySelector('.choice').onclick=press;
  m.key=k=>{if(k===' '||k==='Enter'||k==='z'||k==='Z')press()};
  m.click=()=>press();
  m.update=t=>{if(m.done)return;const dt=(t-m.last)/1000;m.last=t;m.v=Math.max(0,m.v-decay*dt);if(t-m.t0>3200)finish(m.v>=1)};
  m.draw=t=>{const x0=140,w=200,y=70;ctx.fillStyle='rgba(20,10,30,.78)';ctx.fillRect(x0-10,y-26,w+20,54);ctx.strokeStyle='#ffd75e';ctx.lineWidth=2;ctx.strokeRect(x0-10,y-26,w+20,54);
   ttxt('힘겨루기! 연타!',240,y-10,13,'#ffd75e');ctx.fillStyle='#3a1a1a';ctx.fillRect(x0,y,w,14);ctx.fillStyle=m.v>.75?'#7be38a':'#e8b030';ctx.fillRect(x0,y,w*Math.min(1,m.v),14);
   const left=Math.max(0,3.2-(t-m.t0)/1000);ttxt(left.toFixed(1)+'초',240,y+30,11,'#fff');if(m.res!=null)ttxt(m.res?'이겼다!':'밀렸다!',320,y+30,12,m.res?'#7be38a':'#ff6b5b')};
  b.mini=m;
 });
}

// ---------- 승리/패배 ----------
async function victory(){
 const b=B,st=b.st,o=b.opts;
 const xp=Math.round(b.enemies.reduce((a,e)=>a+e.xp,0)*(1+st*.3)),coins=Math.round(b.enemies.reduce((a,e)=>a+e.coin,0)*(1+st*.2));
 const before=level();S.xp+=xp;S.coins+=coins;S.defeated+=b.enemies.length;
 let extra=[];
 if(o.kind==='mob'||o.kind==='guard'){if(o.ent&&!S.kills.includes(o.ent.id))S.kills.push(o.ent.id);if(Math.random()<.3){const k=['potion','bomb','smoke','hint'][(Math.random()*4)|0];S.items[k]++;extra.push(`${ITEMS[k].name} 1개를 주웠다`)}}
 if(o.kind==='boss'){S.boss=true;S.items.potion++;extra.push('수호 인장 획득! 회복약 +1')}
 if(o.kind==='shadow'){flagArr('keys').push(o.id);S.items.potion++;extra.push(`평등의 열쇠 획득! (${keysGot()}/4) 회복약 +1`);if(keysGot()>=4)extra.push('열쇠가 모두 모였다! 성 한가운데 비석으로!')}
 const up=level()>before;if(up){healAll();extra.push(`레벨 업! Lv.${level()} — 체력·공격력 상승, 모두 회복`)}
 Music.play('victory',null);save();hud();
 bMsg(`승리! 경험치 +${xp} · ${coins}냥`);
 const e0=b.enemies[0];
 await ask(`<p class="q"><small>${e0.name}</small>「${DEFEAT_LINES[e0.type]||'으윽…'}」</p>${extra.length?`<p class="explain">${extra.join('<br>')}</p>`:''}`,[{label:'필드로 돌아가기',value:1}]);
 log(`${b.enemies.length>1?e0.name+' 무리':e0.name}를 물리쳤다! (+${xp} 경험치 · ${coins}냥)`,'gold');
 if(o.kind==='boss')log('수호 인장을 얻었다! 성문이 열렸다.','gold');
 endBattle('win');
}
async function defeat(){
 const b=B;const lost=Math.floor(S.coins*.2);S.coins-=lost;
 bMsg('일행이 모두 쓰러졌다… 눈앞이 캄캄해진다…');Music.sfx('wrong');
 await ask(`<p class="q"><small>허허 도사</small>「허허, 무리하지 말거라. 해설을 다시 읽고, 도구를 챙겨서 다시 오너라!」</p><p class="explain">${lost?`냥 ${lost}을(를) 잃었다. `:''}출발 지점에서 회복한다.</p>`,[{label:'정신 차리기',value:1}]);
 healAll();S.ki=Math.max(S.ki,20);save();log('출발 지점에서 정신을 차렸다. 체력이 회복되었다.','red');endBattle('lose');
}

// ---------- 갱신·그리기 ----------
function updateBattle(t){
 if(!B)return;
 if(B.mini&&B.mini.update)B.mini.update(t);
 for(const e of B.enemies){e.flash=Math.max(0,e.flash-.06);if(e.shake>0){e.shake*=.85;if(e.shake<.4)e.shake=0}if(e.dead)e.alpha=Math.max(0,e.alpha-.03)}
 for(let i=0;i<3;i++)B.pFlash[i]=Math.max(0,B.pFlash[i]-.05);
}
function drawBattleBg(t){
 const st=B.opts.kind==='shadow'?4:B.st,th=THEMES[st];const g=ctx.createLinearGradient(0,0,0,110);g.addColorStop(0,th.sky[0]);g.addColorStop(1,th.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,480,110);
 ctx.fillStyle='#ffffff99';for(let i=0;i<4;i++){const x=((i*140+t/60)%620)-70;ctx.fillRect(x,22+i*13,46,6);ctx.fillRect(x+8,17+i*13,26,6)}
 ctx.fillStyle=th.mount[0];ctx.beginPath();ctx.moveTo(0,110);for(let x=0;x<=480;x+=20)ctx.lineTo(x,70+Math.sin(x/37)*14+Math.sin(x/11)*4);ctx.lineTo(480,110);ctx.fill();
 ctx.fillStyle=th.mount[1];ctx.beginPath();ctx.moveTo(0,110);for(let x=0;x<=480;x+=16)ctx.lineTo(x,88+Math.sin(x/23+2)*8);ctx.lineTo(480,110);ctx.fill();
 if(st===4){ctx.fillStyle='#1a0f20';ctx.fillRect(200,46,80,64);ctx.fillRect(190,40,100,8);ctx.fillRect(220,26,40,16);ctx.fillRect(212,22,56,6);ctx.fillStyle='#ffd75e';ctx.fillRect(236,60,8,10)}
 ctx.fillStyle=th.ground[0];ctx.fillRect(0,108,480,212);
 ctx.fillStyle=th.ground[1];for(let y=112;y<320;y+=10)for(let x=((y/10)%2)*20;x<480;x+=40)ctx.fillRect(x+((y*7)%13),y,14,2);
 ctx.fillStyle='#00000022';ctx.fillRect(0,108,480,3);
}
function eScale(e){return e.isBoss?3.6:e.type==='golem'?2.8:B.enemies.length>1?2.4:3}
function drawBattle(t){
 const b=B;drawBattleBg(t);
 for(const e of b.enemies)if(e.x==null)placeEnemy(e);
 const ea=b.eact,pa=b.act;
 // 적
 for(const e of b.enemies.slice().sort((a,c)=>a.y-c.y)){
  if(e.dead&&e.alpha<=0)continue;
  let x=e.x,y=e.y;
  if(ea&&ea.e===e){const el=t-ea.t0;const k=el<ea.hitAt?el/ea.hitAt:Math.max(0,1-(el-ea.hitAt)/(ea.dur-ea.hitAt));const tg=ea.target==='all'?{x:390,y:142}:BPOS[ea.target];x=lerp(e.x,tg.x-34,Math.sin(k*Math.PI/2));y=lerp(e.y,tg.y,k)}
  if(e.shake)x+=(Math.random()-.5)*e.shake;
  const sc=eScale(e);
  ctx.fillStyle='#00000033';ctx.beginPath();ctx.ellipse(x,y,e.isBoss?28:18,4,0,0,7);ctx.fill();
  if(e.charge){ctx.fillStyle=`rgba(255,60,40,${.25+Math.sin(t/90)*.15})`;ctx.beginPath();ctx.arc(x,y-26,30,0,7);ctx.fill()}
  Sprites.draw(ctx,e.sprite,'front',x,y+Math.sin(t/250+e.slot)*2,sc,{stage:e.spriteStage,alpha:e.alpha,flash:e.flash});
  if(!e.dead){
   const top=y-18*sc-6;const bw=e.isBoss?60:38;ctx.fillStyle='#1a0a05';ctx.fillRect(x-bw/2-1,top-1,bw+2,6);ctx.fillStyle='#5a1a1a';ctx.fillRect(x-bw/2,top,bw,4);ctx.fillStyle=e.hp<e.max*.3?'#ff6b5b':'#7be38a';ctx.fillRect(x-bw/2,top,bw*e.hp/e.max,4);
   for(let s=0;s<e.shieldMax;s++){const sx=x-(e.shieldMax-1)*7+s*14,sy=top-9;ctx.fillStyle=s<e.shield?'#c8b8ff':'#3a2a5a';ctx.beginPath();ctx.moveTo(sx,sy-5);ctx.lineTo(sx+5,sy-2);ctx.lineTo(sx+5,sy+3);ctx.lineTo(sx,sy+6);ctx.lineTo(sx-5,sy+3);ctx.lineTo(sx-5,sy-2);ctx.fill()}
   if(e.stun)ttxt('💫',x+14,top-4,12,'#fff');
   if(e.charge&&((t/200)|0)%2)ttxt('⚠',x-18,top-4,14,'#ff4a3a');
   if(b.cursor===e)ttxt('▼',x,top-16+Math.sin(t/120)*2,16,'#ffd75e');
  }
 }
 // 일행
 for(const i of partyIdx()){
  const p=BPOS[i];let x=p.x,y=p.y;
  if(pa&&pa.who.includes(i)){const el=t-pa.t0;const k=el<pa.hitAt?el/pa.hitAt:Math.max(0,1-(el-pa.hitAt)/(pa.dur-pa.hitAt));const off=pa.who.indexOf(i)*14;const tg=pa.target==='all'?{x:110,y:146}:pa.target;x=lerp(p.x,tg.x+46+off,Math.sin(k*Math.PI/2));y=lerp(p.y,tg.y-4+off/2,k)-Math.sin(k*Math.PI)*16}
  else if(b.actor===i)x-=10;
  const ko=S.hp[i]<=0;
  ctx.fillStyle='#00000033';ctx.beginPath();ctx.ellipse(x,y,12,3,0,0,7);ctx.fill();
  if(ko){ctx.save();ctx.translate(x,y-6);ctx.rotate(-Math.PI/2);Sprites.draw(ctx,MEMBERS[i].key,'side',0,14,2,{alpha:.6});ctx.restore()}
  else Sprites.draw(ctx,MEMBERS[i].key,'side',x,y+(b.waiting?Math.sin(t/220+i):0),2,{frame:pa&&pa.who.includes(i)?((t/90)|0)%2:0,flash:b.pFlash[i]});
  if(b.actor===i&&!ko)ttxt('▼',x,y-44+Math.sin(t/150)*2,12,'#7be3ff');
  if(b.defend[i]&&!ko){ctx.strokeStyle='rgba(120,200,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-16,18,0,7);ctx.stroke()}
 }
 if(b.guardAll){ctx.strokeStyle=`rgba(255,150,200,${.6+Math.sin(t/120)*.2})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(405,130,62,46,0,0,7);ctx.stroke()}
 // 베기
 if(pa){const el=t-pa.t0;if(el>pa.hitAt-60&&el<pa.hitAt+260){const k=(el-pa.hitAt+60)/320;const tg=pa.target==='all'?{x:110,y:150}:pa.target;ctx.save();ctx.translate(tg.x,tg.y-30);ctx.strokeStyle=`rgba(255,255,255,${1-k})`;ctx.lineWidth=4;for(let j=0;j<Math.max(1,pa.who.length);j++){ctx.beginPath();ctx.arc(0,0,22+k*20+j*6,-1.2+j*.6,.6+k*1.2+j*.6);ctx.stroke()}ctx.restore()}}
 if(ea){const el=t-ea.t0;if(el>ea.hitAt-40&&el<ea.hitAt+200){const tgs=ea.target==='all'?aliveP():[ea.target];ctx.fillStyle='#fff';for(const tg of tgs){const p=BPOS[tg];for(let j=0;j<5;j++){const ang=j*1.26+t/100;ctx.fillRect(p.x+Math.cos(ang)*14-1,p.y-18+Math.sin(ang)*14-1,3,3)}}}}
 b.fx=b.fx.filter(p=>{const k=(t-p.t0)/600;if(k>1)return false;ctx.fillStyle=p.c;ctx.fillRect(p.x+p.vx*k*40,p.y+p.vy*k*40+k*k*40,2,2);return true});
 if(b.mini&&b.mini.draw)b.mini.draw(t);
}
