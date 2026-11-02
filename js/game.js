// 평등의 나라 · 취풍 무협전 — 필드 이동 + 사이드뷰 턴제 전투
const $=s=>document.querySelector(s);
const cv=$('#game'),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
const W=30,H=20,T=16,KEY='equality-rpg-chwipung-v1';
const STEP_MS=150;

// ---------- 상태 ----------
function fresh(){return {stage:0,x:4,y:13,dir:'down',hp:[100,90,130],xp:0,potions:3,kills:[],talked:false,shrine:false,finished:false,trial:false,trialFails:0,trialRec:[],pledge:'',sound:true,right:0,wrong:0,defeated:0}}
let S=fresh();
try{const a=JSON.parse(localStorage.getItem(KEY));if(a&&Number.isInteger(a.stage)&&a.stage>=0&&a.stage<5&&Array.isArray(a.kills)){S={...S,...a};S.kills=S.kills.filter(v=>Number.isInteger(v)&&v>=0&&v<3);if(!Array.isArray(S.hp)||S.hp.length!==3)S.hp=[100,90,130];S.potions=Math.max(0,Math.min(20,Number(S.potions)||0));S.pledge=String(S.pledge||'').slice(0,300)}}catch{}
let mode='title',grid=null,mapImg=null,E=null,keys={},path=[],pendingTarget=null,lastMove=0,cooldown=0,now=0,trans=null,dialog=null,B=null,shake=0,floaters=[];
const pl={x:S.x,y:S.y,fx:S.x,fy:S.y,t:1,dir:S.dir||'down',step:0};
let followers=[];

const level=()=>1+Math.floor(S.xp/300);
const maxHp=i=>MEMBERS[i].max+(level()-1)*10;
const joined=i=>MEMBERS[i].join<S.stage||(MEMBERS[i].join===S.stage&&(S.talked||MEMBERS[i].join===0));
const partyIdx=()=>[0,1,2].filter(joined);
function josa(w,pair){const c=w.charCodeAt(w.length-1)-0xac00;const has=c>=0&&c<=11171&&c%28!==0;const [a,b]=pair.split('/');return w+(has?a:b)}
function save(){try{S.x=pl.x;S.y=pl.y;S.dir=pl.dir;localStorage.setItem(KEY,JSON.stringify(S));$('#savestatus').textContent='진행 자동 저장됨'}catch{$('#savestatus').textContent='저장 불가 · 이 창을 유지하세요'}}
function log(t,kind=''){const p=document.createElement('p');p.className=kind;p.textContent='▸ '+t;const L=$('#log');L.append(p);while(L.children.length>40)L.firstChild.remove();L.scrollTop=L.scrollHeight}
function hash(x,y,s=0){let h=(x*374761393+y*668265263+s*982451653)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296}

// ---------- 지도 ----------
function makeMap(stage){
 const a=Array.from({length:H},()=>Array(W).fill(0));
 const dens=[0.07,0.16,0.05,0.1,0.06][stage];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(x===0||y===0||x===W-1||y===H-1)a[y][x]=1;
  else if(hash(x,y,stage)<dens)a[y][x]=1;
  else if(hash(y,x,stage+7)<0.12)a[y][x]=6;
 }
 for(let y=1;y<H-1;y++){a[y][15]=2;a[y][16]=2}
 for(let x=1;x<W-1;x++)for(let y=9;y<=11;y++)a[y][x]=(x===15||x===16)?3:4;
 for(let y=2;y<=17;y++){a[y][4]=4;a[y][25]=4}
 for(let y=3;y<6;y++)for(let x=3;x<7;x++)a[y][x]=5;
 if(stage===0||stage===4)for(let y=13;y<16;y++)for(let x=19;x<23;x++)a[y][x]=5;
 for(const [x,y] of [[4,13],[7,11],[10,7],[11,14],[10,8],[11,13],[23,8],[26,4],[24,16],[21,8]])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X>0&&X<W-1&&Y>0&&Y<H-1&&(a[Y][X]===1||a[Y][X]===5&&!(stage===0||stage===4)))a[Y][X]=0}
 // 게이트 주변 진입로
 for(let y=4;y<=8;y++)if(a[y][24]===1)a[y][24]=0;
 return a;
}
const solid=v=>v===1||v===2||v===5;
function walkable(x,y,ignoreEnt){if(x<0||y<0||x>=W||y>=H||solid(grid[y][x]))return false;if(ignoreEnt)return true;return !entAt(x,y)}
function entAt(x,y){
 if(!E)return null;
 if(E.npc.x===x&&E.npc.y===y)return E.npc;
 if(E.stele.x===x&&E.stele.y===y)return E.stele;
 if(E.gate.x===x&&E.gate.y===y)return E.gate;
 if(E.trial&&E.trial.x===x&&E.trial.y===y)return E.trial;
 for(const m of E.mobs)if(!S.kills.includes(m.id)&&m.x===x&&m.y===y)return m;
 return null;
}
function loadStage(){
 grid=makeMap(S.stage);mapImg=renderMap(S.stage);
 const sh=S.stage%2;
 E={npc:{kind:'npc',x:7,y:11},stele:{kind:'stele',x:24,y:16},gate:{kind:'gate',x:26,y:4},trial:{kind:'trial',x:21,y:8},
  mobs:[[0,10,7+sh],[1,11,14-sh],[2,23,8]].map(([id,x,y])=>({kind:'mob',id,x,y,hx:x,hy:y,fx:x,fy:y,t:1,next:0}))};
 if(!walkable(pl.x,pl.y)){pl.x=4;pl.y=13}
 pl.fx=pl.x;pl.fy=pl.y;pl.t=1;
 followers=partyIdx().slice(1).map(i=>({i,x:pl.x,y:pl.y,fx:pl.x,fy:pl.y}));
 path=[];pendingTarget=null;hud();
}
function bfs(start,goal,adjOK){
 const q=[start],seen=new Set([start.join()]),prev={};
 while(q.length){const p=q.shift();
  const done=adjOK?Math.abs(p[0]-goal[0])+Math.abs(p[1]-goal[1])===1:(p[0]===goal[0]&&p[1]===goal[1]);
  if(done){const out=[];let k=p.join();while(k!==start.join()){out.unshift(k.split(',').map(Number));k=prev[k]}return out}
  for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const x=p[0]+dx,y=p[1]+dy,k=x+','+y;if(!seen.has(k)&&walkable(x,y)){seen.add(k);prev[k]=p.join();q.push([x,y])}}
 }
 return null;
}

// ---------- 타일 그리기 ----------
function renderMap(stage){
 const c=document.createElement('canvas');c.width=W*T;c.height=H*T;const g=c.getContext('2d');const th=THEMES[stage];
 const px=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const v=grid[y][x],X=x*T,Y=y*T;
  // 바닥
  if(v===2){px(X,Y,T,T,th.water);for(let i=0;i<3;i++){const r=hash(x,y,i+50);px(X+((r*12)|0),Y+3+i*5,4,1,th.waterL)}
   if(grid[y][x-1]!==2&&grid[y][x-1]!==3)px(X,Y,2,T,'#ffffff55');if(grid[y][x+1]!==2&&grid[y][x+1]!==3)px(X+T-2,Y,2,T,'#00000033');continue}
  if(v===3){px(X,Y,T,T,'#8a5a2a');for(let i=0;i<T;i+=4){px(X+i,Y,3,T,'#b07a3a');px(X+i+3,Y,1,T,'#5a3a1a')}
   if(y===9)px(X,Y,T,3,'#5a3a1a');if(y===11)px(X,Y+T-3,T,3,'#5a3a1a');continue}
  const gc=th.grass;px(X,Y,T,T,gc[0]);
  for(let i=0;i<5;i++){const r=hash(x,y,i);const r2=hash(y,x,i+3);px(X+((r*15)|0),Y+((r2*15)|0),1,1,i%2?gc[1]:gc[2])}
  if(hash(x,y,99)<.25){px(X+5,Y+9,1,2,gc[1]);px(X+7,Y+8,1,3,gc[1]);px(X+9,Y+9,1,2,gc[1])}
  if(v===4){px(X,Y,T,T,th.path);for(let i=0;i<4;i++){const r=hash(x,y,i+20),r2=hash(y,x,i+30);px(X+((r*14)|0),Y+((r2*14)|0),2,1,th.pathD)}
   for(const [dx,dy,ex,ey,ew,eh] of [[0,-1,0,0,T,1],[0,1,0,T-1,T,1],[-1,0,0,0,1,T],[1,0,T-1,0,1,T]]){const n=grid[y+dy]&&grid[y+dy][x+dx];if(n!==4&&n!==3&&n!==undefined)px(X+ex,Y+ey,ew,eh,th.pathD)}}
  if(v===6){for(let i=0;i<3;i++){const r=hash(x,y,i+40),r2=hash(y,x,i+41);const fx=X+2+((r*11)|0),fy=Y+2+((r2*11)|0);px(fx,fy,3,1,th.flower[i%3]);px(fx+1,fy-1,1,3,th.flower[i%3]);px(fx+1,fy,1,1,'#ffe066')}}
 }
 // 장애물(나무 등) & 집
 const houses=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=grid[y][x];if(v===1)drawTree(g,x*T,y*T,th,stage,x,y);if(v===5&&!(grid[y-1]&&grid[y-1][x]===5)&&!(grid[y][x-1]===5))houses.push([x,y])}
 for(const [x,y] of houses){let w=0,h=0;while(grid[y][x+w]===5)w++;while(grid[y+h]&&grid[y+h][x]===5)h++;drawHouse(g,x*T,y*T,w*T,h*T,stage)}
 return c;
}
function drawTree(g,X,Y,th,stage,x,y){
 const [a,b,d]=th.treeC;const px=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(X+x,Y+y,w,h)};
 if(th.tree==='pine'){px(7,12,2,4,'#5a3a1a');for(let i=0;i<3;i++){const w=12-i*3,yy=9-i*4;px(8-w/2-1,yy,w+2,5,d);px(8-w/2,yy,w,4,i%2?b:a)}px(7,0,2,2,b)}
 else if(th.tree==='rock'){px(1,5,14,10,d);px(2,4,12,10,a);px(3,4,6,3,b);px(4,12,9,2,d)}
 else if(th.tree==='lantern'){if((x+y)%3===0){px(5,2,6,2,d);px(4,4,8,2,a);px(5,6,6,5,b);px(6,7,4,3,'#fff6c0');px(4,11,8,2,a);px(6,13,4,3,'#6a5a4a')}else{px(3,1,10,14,'#8a7a6a');px(4,2,8,12,'#b8a890');px(4,2,8,2,'#d8c8a8');px(3,13,10,2,'#5a4a3a')}}
 else{px(7,11,2,5,'#6a3f1f');px(6,15,4,1,'#4a2a12');px(2,3,12,9,d);px(1,5,14,6,d);px(3,2,10,9,a);px(2,4,12,6,a);px(4,3,4,3,b);px(3,6,2,2,b);if(th.tree==='blossom'){px(9,5,1,1,'#fff');px(5,8,1,1,'#fff');px(11,8,1,1,'#fff')}}
}
function drawHouse(g,X,Y,w,h,stage){
 const roof=['#3a4a7a','#8a6a2a','#c8486a','#4a4a5a','#b8282a'][stage],roofL=['#5a6a9a','#b08a3a','#e86a8a','#6a6a7a','#ffd75e'][stage];
 const wall=stage===4?'#f0d8a8':'#f2e4c4',post=stage===4?'#b8282a':'#7a4a2a';
 const px=(x,y,ww,hh,c)=>{g.fillStyle=c;g.fillRect(X+x,Y+y,ww,hh)};
 px(2,h*.45,w-4,h*.55,'#2a1a10');px(3,h*.45,w-6,h*.55-1,wall);
 for(let i=3;i<w-3;i+=Math.max(10,(w-6)/4|0))px(i,h*.45,2,h*.55-1,post);
 px(w/2-5,h-14,10,13,'#5a3a1a');px(w/2-4,h-13,8,12,'#8a5a2a');px(w/2,h-13,1,12,'#5a3a1a');
 px(8,h*.6,8,6,'#5a3a1a');px(9,h*.6+1,6,4,'#e8d8a8');px(w-16,h*.6,8,6,'#5a3a1a');px(w-15,h*.6+1,6,4,'#e8d8a8');
 // 지붕 (처마가 휘어 올라감)
 const rh=h*.5;px(-3,rh-4,w+6,4,'#1a1a2a');px(-4,rh-7,3,3,'#1a1a2a');px(w+1,rh-7,3,3,'#1a1a2a');
 for(let i=0;i<rh-4;i++){const inset=Math.max(0,(rh-4-i)*0.25|0);px(inset-2,i,w+4-inset*2,1,i%3===0?roofL:roof)}
 px(4,0,w-8,2,'#1a1a2a');px(2,-2,4,3,'#1a1a2a');px(w-6,-2,4,3,'#1a1a2a');
 if(stage===4){px(w/2-6,rh*.3,12,6,'#ffd75e');px(w/2-5,rh*.3+1,10,4,'#b8282a')}
}

// ---------- HUD ----------
function questText(){
 const npc=SCRIPTS[S.stage].npcName;
 if(S.finished)return '모든 고을에 평등의 빛을 되찾았다!';
 if(!S.talked)return `① ${npc}에게 말 걸기<br><span>출발 지점 오른쪽 길 위</span>`;
 const k=[0,1].filter(i=>S.kills.includes(i)).length;
 if(k<2)return `② 떠돌이 요괴 혼내 주기 ${k} / 2<br><span>정답을 외치면 필살기 발동!</span>`;
 if(!S.shrine)return '③ 강 건너 남쪽 비석 조사<br><span>다리를 건너 오른쪽 아래</span>';
 if(!S.trial)return `④ 외줄 수련 · ${TRIAL.names[S.stage]}<br><span>보스 결계 옆 깃발 수련터</span>`;
 if(!S.kills.includes(2))return `⑤ ${ENEMY_NAMES[S.stage][2]} 처치<br><span>정답 필살기 3번 필요</span>`;
 return S.stage===4?'⑥ 북동쪽 성문으로!<br><span>마지막 문을 열자</span>':'⑥ 북동쪽 성문으로 이동<br><span>다음 고을로 떠나자</span>';
}
function hud(){
 $('#quest').innerHTML=questText();
 $('#zone').textContent=`제${S.stage+1}장 · ${stages[S.stage].name}`;$('#qtitle').textContent=`제${S.stage+1}장 ${stages[S.stage].name}`;
 const seals=S.stage+(S.kills.includes(2)?1:0);
 $('#inventory').textContent=`Lv.${level()}  ·  경험치 ${S.xp}  ·  회복약 ${S.potions}개  ·  수호 인장 ${seals}/5`;
 $('#sound').textContent=S.sound?'소리 ON':'소리 OFF';
 if($('#play'))$('#play').textContent=S.xp||S.talked||S.stage?'이어서 원정하기':'원정 시작';
 const P=$('#party');P.innerHTML='';
 MEMBERS.forEach((m,i)=>{const d=document.createElement('div');
  if(!joined(i)){d.className='card empty';d.textContent='??? · 아직 만나지 못함';P.append(d);return}
  d.className='card';const c=document.createElement('canvas');c.width=40;c.height=40;Sprites.face(c,m.key);
  const hp=Math.min(S.hp[i],maxHp(i));
  d.innerHTML=`<div class="info"><b>${m.name}</b> <small>${m.title}</small><br><meter min="0" max="${maxHp(i)}" low="${maxHp(i)*.3}" optimum="${maxHp(i)}" value="${hp}"></meter><br>${hp} / ${maxHp(i)}</div>`;
  d.prepend(c);P.append(d)});
}

// ---------- 대화 ----------
const SPEAKER={baram:'바람',bomi:'보미',gomdol:'곰돌',master:'허허 도사',sys:'안내',goblin:'',fox:'',boss:''};
function say(lines,then){
 mode='dialog';keys={};path=[];
 dialog={lines,i:0,shown:0,then,start:performance.now()};
 $('#dialog').hidden=false;showLine();
}
function showLine(){const [who,text]=dialog.lines[dialog.i];Sprites.face($('#face'),who);$('#dname').textContent=SPEAKER[who]??who;dialog.shown=0;dialog.start=performance.now();$('#dline').textContent='';Music.sfx('select')}
function dialogAdvance(){
 if(!dialog)return;const text=dialog.lines[dialog.i][1];
 if(dialog.shown<text.length){dialog.shown=text.length;dialog.start=performance.now()-text.length*28-50;$('#dline').textContent=text;return}
 dialog.i++;
 if(dialog.i>=dialog.lines.length){const t=dialog.then;dialog=null;$('#dialog').hidden=true;mode='field';cooldown=performance.now()+400;if(t)t();return}
 showLine();
}
function updateDialog(){if(!dialog)return;const text=dialog.lines[dialog.i][1];const n=Math.min(text.length,Math.floor((performance.now()-dialog.start)/28));if(n!==dialog.shown){dialog.shown=n;$('#dline').textContent=text.slice(0,n)}}

// ---------- 모달 ----------
function openModal(html){keys={};path=[];$('#body').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}
function closeModal(){if($('#modal').open)$('#modal').close()}
$('#close').onclick=closeModal;
$('#modal').addEventListener('close',()=>{$('#body').innerHTML='';keys={};cv.focus()});

// ---------- 상호작용 ----------
function healAll(){partyIdx().forEach(i=>S.hp[i]=maxHp(i))}
function interact(e){
 if(!e)return;
 face(e);
 if(e.kind==='npc'){
  const sc=SCRIPTS[S.stage];
  if(!S.talked){say(sc.first,()=>{S.talked=true;healAll();loadStageKeepPos();save();hud();log(S.stage===1?'보미가 동료가 되었다!':S.stage===2?'곰돌이 동료가 되었다!':'임무를 받았다: 떠돌이 요괴 2마리','gold')});}
  else{const who=S.stage===1?'bomi':S.stage===2?'gomdol':'master';say(sc.again.map(([w,t])=>[w===sc.npc?who:w,t]),()=>{healAll();Music.sfx('heal');save();hud();log('일행의 체력이 모두 회복되었다.','gold')})}
  return;
 }
 if(e.kind==='mob'){
  if(!S.talked){say([['sys',`${josa(SCRIPTS[S.stage].npcName,'이/가')} 부르고 있다. 이야기부터 듣고 오자.`]]);return}
  if(e.id===2&&!S.shrine){say([['sys','보라색 봉인 결계가 길을 막고 있다. 강 건너 남쪽 비석을 먼저 조사하자.']]);return}
  if(e.id===2&&!S.trial){say([['sys','결계가 아직 남아 있다! 바로 옆 깃발 수련터에서 외줄 수련을 통과하면 완전히 풀린다.']]);return}
  startBattle(e);return;
 }
 if(e.kind==='stele'){
  if(!S.talked||!S.kills.includes(0)||!S.kills.includes(1)){say([['sys','비석에 희미한 글씨가 새겨져 있다… 아직 읽을 수 없다. 떠돌이 요괴를 먼저 혼내 주자.']]);return}
  if(S.shrine){say([['sys',`「${STELE_TITLE[S.stage]}」 — ${stages[S.stage].qs[2][3]}`]]);return}
  S.shrine=true;S.potions++;partyIdx().forEach(i=>S.hp[i]=Math.min(maxHp(i),S.hp[i]+30));Music.sfx('chime');save();hud();
  say([['sys',`수호 비석 · ${stages[S.stage].power}의 가르침\n「${STELE_TITLE[S.stage]}」`],['sys',stages[S.stage].qs[2][3]],['sys',`비석에 빛이 깃들었다! ${ENEMY_NAMES[S.stage][2]}의 결계가 약해졌다. (회복약 +1 · 체력 +30)`],['sys',`보스 옆 깃발 수련터에서 「외줄 수련 · ${TRIAL.names[S.stage]}」을 통과하면 결계가 완전히 풀린다!`]],()=>log('결계가 약해졌다! 외줄 수련터로 가자.','gold'));
  return;
 }
 if(e.kind==='trial'){
  if(S.trial){say([['sys','이미 통과한 수련터다. 결계는 풀려 있다!']]);return}
  if(!S.talked||!S.shrine){say([['sys','외줄 수련터다. 아직 수련터 문이 닫혀 있다. 비석을 먼저 조사하자.']]);return}
  startTrial();return;
 }
 if(e.kind==='gate'){
  if(!S.kills.includes(2)){say([['sys','성문이 굳게 닫혀 있다. 이 고을의 보스를 먼저 물리치자.']]);return}
  Music.sfx('door');
  if(S.stage===4){S.finished=true;save();hud();ending();return}
  fadeTo(()=>{S.stage++;S.kills=[];S.talked=false;S.shrine=false;S.trial=false;S.trialFails=0;pl.x=4;pl.y=13;pl.dir='down';healAll();loadStage();save();chapterCard();Music.play('field')});
 }
}
function loadStageKeepPos(){const keep=followers;loadStage();followers.forEach(f=>{const o=keep.find(k=>k.i===f.i);if(o)Object.assign(f,{x:o.x,y:o.y,fx:o.fx,fy:o.fy});else{f.x=E.npc.x;f.y=E.npc.y;f.fx=f.x;f.fy=f.y}})}
function face(e){const dx=e.x-pl.x,dy=e.y-pl.y;if(Math.abs(dx)>Math.abs(dy))pl.dir=dx>0?'right':'left';else if(dy)pl.dir=dy>0?'down':'up'}
function chapterCard(){const c=$('#chapter');$('#chapNo').textContent=`제 ${S.stage+1} 장`;$('#chapName').textContent=stages[S.stage].name;$('#chapDesc').textContent=stages[S.stage].desc;c.hidden=true;void c.offsetWidth;c.hidden=false;clearTimeout(chapterCard.t);chapterCard.t=setTimeout(()=>c.hidden=true,2700);log(`제${S.stage+1}장 · ${stages[S.stage].name}에 도착했다.`,'gold')}
function fadeTo(mid){trans={t0:performance.now(),dur:700,kind:'fade',mid,done:false}}

// ---------- 필드 이동 ----------
const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function tryStep(dir){
 pl.dir=dir;const [dx,dy]=DIRS[dir];const nx=pl.x+dx,ny=pl.y+dy;
 const e=entAt(nx,ny);
 if(e){path=[];if((e.kind==='mob'&&performance.now()>cooldown)||(e.kind==='gate'&&S.kills.includes(2)))interact(e);else if(now-lastBump>250){Music.sfx('bump');lastBump=now}return false}
 if(!walkable(nx,ny)){if(now-lastBump>250){Music.sfx('bump');lastBump=now}return false}
 // 동료 따라오기
 let px=pl.x,py=pl.y;for(const f of followers){const ox=f.x,oy=f.y;f.fx=f.x;f.fy=f.y;f.x=px;f.y=py;px=ox;py=oy}
 pl.fx=pl.x;pl.fy=pl.y;pl.x=nx;pl.y=ny;pl.t=0;pl.step++;
 if(pl.step%8===0)save();
 return true;
}
let lastBump=0,tapDir=null;
function updateField(dt){
 if(pl.t<1){pl.t=Math.min(1,pl.t+dt/STEP_MS);if(pl.t<1)return}
 const k=keys;let dir=k.ArrowUp||k.w||k.W?'up':k.ArrowDown||k.s||k.S?'down':k.ArrowLeft||k.a||k.A?'left':k.ArrowRight||k.d||k.D?'right':null;
 // 아주 짧게 누른 방향키도 놓치지 않기(한 프레임 안에 떼도 한 칸 이동/방향 전환)
 if(!dir&&tapDir)dir=tapDir;tapDir=null;
 if(dir){path=[];pendingTarget=null;tryStep(dir);hudCoords();return}
 if(path.length){const [nx,ny]=path.shift();const d=nx>pl.x?'right':nx<pl.x?'left':ny>pl.y?'down':'up';if(!tryStep(d)){path=[]}
  if(!path.length&&pendingTarget&&mode==='field'){const t=pendingTarget;pendingTarget=null;if(Math.abs(t.x-pl.x)+Math.abs(t.y-pl.y)===1)interact(t)}}
}
function hudCoords(){}
function updateMobs(t){
 for(const m of E.mobs){
  if(S.kills.includes(m.id))continue;
  if(t<m.next||m.id===2)continue;
  m.next=t+700+Math.random()*900;
  const opts=[[0,1],[1,0],[0,-1],[-1,0]].map(([dx,dy])=>[m.x+dx,m.y+dy]).filter(([x,y])=>Math.abs(x-m.hx)<=2&&Math.abs(y-m.hy)<=2&&walkable(x,y,true)&&!entAt(x,y)&&!followers.some(f=>f.x===x&&f.y===y));
  if(!opts.length)continue;const [x,y]=opts[(Math.random()*opts.length)|0];
  if(x===pl.x&&y===pl.y){if(S.talked&&t>cooldown&&mode==='field'&&pl.t>=1){Music.sfx('encounter');interact(m)}continue}
  m.fx=m.x;m.fy=m.y;m.x=x;m.y=y;m.t=0;
 }
}

// ---------- 그리기: 필드 ----------
function lerp(a,b,t){return a+(b-a)*t}
function drawField(t){
 ctx.drawImage(mapImg,0,0);
 // 물결 반짝임
 ctx.fillStyle=THEMES[S.stage].waterL;
 for(let y=1;y<H-1;y++){if(y>=9&&y<=11)continue;for(const x of [15,16]){const o=((t/120+y*5+x*3)|0)%16;ctx.fillRect(x*T+o,y*T+((y*7)%13),3,1)}}
 const list=[];
 const st=S.stage;
 // NPC
 const npcKey=st===1&&!S.talked?'bomi':st===2&&!S.talked?'gomdol':(st===1||st===2)?'fire':'master';
 list.push({y:E.npc.y,draw:()=>{const X=E.npc.x*T+8,Y=E.npc.y*T+16;if(npcKey==='fire')drawFire(X,Y,t);else Sprites.draw(ctx,npcKey,'front',X,Y+1+(((t/600)|0)%2),1,{})}});
 // 비석
 list.push({y:E.stele.y,draw:()=>drawStele(E.stele.x*T+8,E.stele.y*T+16,t)});
 // 성문
 list.push({y:E.gate.y,draw:()=>drawGate(E.gate.x*T+8,E.gate.y*T+16,t)});
 list.push({y:E.trial.y,draw:()=>drawTrialPost(E.trial.x*T+8,E.trial.y*T+16,t)});
 // 몬스터
 for(const m of E.mobs){if(S.kills.includes(m.id))continue;
  const X=lerp(m.fx,m.x,m.t)*T+8,Y=lerp(m.fy,m.y,m.t)*T+16;const type=ENEMY_TYPES[m.id];
  list.push({y:m.y,draw:()=>{const bob=Math.sin(t/200+m.id)*1;if(m.id===2){Sprites.draw(ctx,type,'front',X,Y+2,1.4,{stage:st,frame:0});if(!S.trial){ctx.strokeStyle=`rgba(190,110,255,${.5+Math.sin(t/150)*.3})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(X,Y-10,14,15,0,0,Math.PI*2);ctx.stroke()}}else Sprites.draw(ctx,type,'front',X,Y+1+bob,1,{stage:st})}});
 }
 // 동료 & 주인공
 const pt=pl.t;
 for(const f of followers){const X=lerp(f.fx,f.x,pt)*T+8,Y=lerp(f.fy,f.y,pt)*T+16;const dir=f.x>f.fx?'right':f.x<f.fx?'left':f.y<f.fy?'up':'down';list.push({y:f.y-.01,draw:()=>drawWalker(MEMBERS[f.i].key,dir,X,Y,pt<1?pl.step:0)})}
 const PX=lerp(pl.fx,pl.x,pt)*T+8,PY=lerp(pl.fy,pl.y,pt)*T+16;
 list.push({y:pl.y+.01,draw:()=>drawWalker('baram',pl.dir,PX,PY,pt<1?pl.step:0)});
 list.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 // 목표 표시
 const goal=currentGoal();if(goal){const bob=Math.sin(t/180)*2;const X=goal.x*T+8,Y=goal.y*T-(goal.kind==='gate'?26:goal.kind==='mob'&&goal.id===2?22:6)+bob;ctx.fillStyle='#2a1a0a';ctx.fillRect(X-4,Y-6,9,5);ctx.fillRect(X-2,Y-1,5,2);ctx.fillStyle='#ffd75e';ctx.fillRect(X-3,Y-5,7,3);ctx.fillRect(X-1,Y-2,3,2)}
}
function currentGoal(){if(S.finished)return null;if(!S.talked)return E.npc;const m=E.mobs.find(m=>m.id<2&&!S.kills.includes(m.id));if(m)return m;if(!S.shrine)return E.stele;if(!S.trial)return E.trial;if(!S.kills.includes(2))return E.mobs[2];return E.gate}
function drawWalker(key,dir,X,Y,step){
 const pose=dir==='up'?'back':dir==='down'?'front':'side';const frame=step%2;
 Sprites.draw(ctx,key,pose,X,Y+1-(step?frame:0),1,{frame,flip:dir==='right'});
}
function drawFire(X,Y,t){const f=((t/120)|0)%3;ctx.fillStyle='#5a3a1a';ctx.fillRect(X-6,Y-3,12,3);ctx.fillStyle='#e8481a';ctx.fillRect(X-4,Y-9-f,8,6+f);ctx.fillStyle='#ffd75e';ctx.fillRect(X-2,Y-7-f%2,4,4);ctx.fillStyle='#fff6c0';ctx.fillRect(X-1,Y-5,2,2)}
function drawStele(X,Y,t){
 const ready=S.talked&&S.kills.includes(0)&&S.kills.includes(1);
 if(ready||S.shrine){ctx.fillStyle=S.shrine?`rgba(255,215,94,${.25+Math.sin(t/300)*.1})`:`rgba(150,220,255,${.3+Math.sin(t/150)*.2})`;ctx.beginPath();ctx.arc(X,Y-10,13,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#2a2a32';ctx.fillRect(X-6,Y-21,12,20);ctx.fillStyle='#8a8f9a';ctx.fillRect(X-5,Y-20,10,18);ctx.fillStyle='#b8bcc6';ctx.fillRect(X-5,Y-20,10,2);
 ctx.fillStyle=S.shrine?'#ffd75e':'#5a5f6a';for(let i=0;i<4;i++)ctx.fillRect(X-3,Y-16+i*3,6,1);
 ctx.fillStyle='#5a4a3a';ctx.fillRect(X-8,Y-3,16,3);
}
function drawGate(X,Y,t){
 const open=S.kills.includes(2);
 ctx.fillStyle='#1a0a0a';ctx.fillRect(X-13,Y-26,3,26);ctx.fillRect(X+10,Y-26,3,26);
 ctx.fillStyle='#c8302a';ctx.fillRect(X-12,Y-25,2,25);ctx.fillRect(X+10,Y-25,2,25);
 ctx.fillStyle=open?`rgba(255,240,170,${.6+Math.sin(t/200)*.3})`:'#6a3a1a';ctx.fillRect(X-10,Y-22,20,22);
 if(!open){ctx.fillStyle='#4a2a10';ctx.fillRect(X,Y-22,1,22);ctx.fillStyle='#ffd75e';ctx.fillRect(X-3,Y-12,2,2);ctx.fillRect(X+2,Y-12,2,2)}
 ctx.fillStyle='#1a1a2a';ctx.fillRect(X-17,Y-31,34,5);ctx.fillRect(X-19,Y-33,4,3);ctx.fillRect(X+15,Y-33,4,3);
 ctx.fillStyle='#2a6a5a';ctx.fillRect(X-16,Y-30,32,3);ctx.fillStyle='#ffd75e';ctx.fillRect(X-5,Y-27,10,3);
}

// ---------- 전투 ----------
const BPOS=[{x:372,y:138},{x:414,y:118},{x:428,y:156}];
function startBattle(m){
 if(B||trans||!m)return;
 if(!partyIdx().some(i=>S.hp[i]>0))healAll();
 const boss=m.id===2;
 B={m,id:m.id,boss,stage:S.stage,name:ENEMY_NAMES[S.stage][m.id],type:ENEMY_TYPES[m.id],max:boss?300:100,hp:boss?300:100,qs:boss?[0,1,2]:[m.id],qn:0,phase:'intro',sel:0,order:null,anim:null,hitCount:0,eFlash:0,eShake:0,eAlpha:1,ex:110,ey:150,pFlash:[0,0,0],pOff:[0,0,0],fx:[]};
 mode='battle';keys={};path=[];dialog=null;$('#dialog').hidden=true;
 Music.sfx('encounter');
 trans={t0:performance.now(),dur:600,kind:'swirl',mid:()=>{if(!B)return;Music.play(boss?'boss':'battle');$('#battleui').hidden=false;$('#questbox').hidden=true;$('#zone').hidden=true;bIntro()}};
}
function bParty(){
 $('#bparty').innerHTML=partyIdx().map(i=>{const hp=S.hp[i],mx=maxHp(i);return `<div class="pm ${hp<=0?'ko':hp<mx*.3?'low':''}"><b>${MEMBERS[i].name}</b><div class="bar"><i style="transform:scaleX(${Math.max(0,hp)/mx})"></i></div><span>${hp} / ${mx}</span></div>`}).join('')+`<div class="pm"><span>회복약 ${S.potions}개</span></div>`;
}
function bMsg(t){$('#bmsg').textContent=t}
function bIntro(){
 B.phase='intro';bParty();bMsg(`${josa(B.name,'이/가')} 나타났다!${B.boss?' (보스)':''}`);
 $('#bcmd').innerHTML=`<p class="q"><small>${B.name}</small>「${TAUNTS[S.stage][B.id]}」</p><button class="choice sel" data-act="next">계속하기</button>`;
 B.sel=0;bindChoices(()=>bCommand());
}
function bCommand(){
 B.phase='cmd';bParty();
 const q=B.boss?` · 시험 ${B.qn+1} / 3`:'';
 bMsg(`${B.name}  체력 ${B.hp} / ${B.max}${q}`);
 $('#bcmd').innerHTML=`<p class="q"><small>무엇을 할까?</small>정답을 외치면 필살기가 터진다!</p><div class="cmds"><button class="choice" data-act="skill"><kbd>1</kbd>필살기 (문제 풀기)</button><button class="choice" data-act="potion"><kbd>2</kbd>회복약 (${S.potions})</button><button class="choice" data-act="run"><kbd>3</kbd>도망치기</button></div>`;
 bindChoices(act=>{if(act==='skill')bQuiz();else if(act==='potion')bPotion();else bRun()});
}
function bQuiz(){
 B.phase='quiz';const q=stages[S.stage].qs[B.qs[B.qn]];
 const order=q[1].map((v,i)=>({v,i}));for(let j=order.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[order[j],order[k]]=[order[k],order[j]]}
 B.order=order;
 $('#bcmd').innerHTML=`<p class="q"><small>${B.boss?`보스 시험 ${B.qn+1} / 3`:'필살기 발동 조건'} · 정답을 고르세요</small>${q[0]}</p>`+order.map((o,k)=>`<button class="choice" data-act="${o.i}"><kbd>${k+1}</kbd>${o.v}</button>`).join('');
 bindChoices(act=>bAnswer(+act));
}
function bAnswer(choice){
 const q=stages[S.stage].qs[B.qs[B.qn]];$('#bcmd').innerHTML='';B.phase='anim';
 if(choice===q[2]){
  S.right++;
  const alive=partyIdx().filter(i=>S.hp[i]>0);
  const finale=B.boss&&B.hp<=100;
  const who=finale&&alive.length>1?alive:[alive[B.hitCount%alive.length]];
  B.hitCount++;
  const moveName=finale&&who.length>1?`${stages[S.stage].power} 합격기 · 다 함께!`:MEMBERS[who[0]].move.replace('{p}',stages[S.stage].power);
  bMsg(`${who.map(i=>MEMBERS[i].name).join('·')}의 「${moveName}」!`);
  Music.sfx('ok');
  B.anim={kind:'attack',who,t0:performance.now(),dur:900,hitAt:420,hit:false,after:()=>{
   B.hp=Math.max(0,B.hp-100);B.phase='result';
   $('#bcmd').innerHTML=`<p class="q ok"><small>정답!</small>${q[1][q[2]]}</p><p class="explain">${q[3]}</p><button class="choice sel" data-act="next">${B.hp<=0?'승리!':'계속하기'}</button>`;
   bMsg(`${B.name}에게 100 피해! (남은 체력 ${B.hp} / ${B.max})`);
   bindChoices(()=>{if(B.hp<=0)bVictory();else{B.qn++;bCommand()}});
  }};
 } else {
  S.wrong++;
  const alive=partyIdx().filter(i=>S.hp[i]>0);const target=alive[(Math.random()*alive.length)|0];
  bMsg(`앗, 기술이 꼬였다! ${B.name}의 반격!`);Music.sfx('wrong');
  B.anim={kind:'enemy',target,t0:performance.now(),dur:800,hitAt:380,hit:false,after:()=>{
   bParty();B.phase='result';const allKO=partyIdx().every(i=>S.hp[i]<=0);
   $('#bcmd').innerHTML=`<p class="q ng"><small>오답… ${MEMBERS[target].name} 체력 -20</small>다시 생각해 보자!</p><p class="explain">💡 ${q[3]}</p><button class="choice sel" data-act="next">${allKO?'…':'다시 도전'}</button>`;
   bindChoices(()=>{if(allKO)bDefeat();else bCommand()});
  }};
 }
 save();
}
function bPotion(){
 // 회복약이 없을 때도 선택지를 다시 연결해 전투가 멈추지 않게 한다
 if(S.potions<=0){bCommand();bMsg('회복약이 없다! NPC에게 가면 무료로 회복할 수 있다.');Music.sfx('wrong');return}
 S.potions--;partyIdx().forEach(i=>S.hp[i]=Math.min(maxHp(i),Math.max(S.hp[i],0)+50));Music.sfx('heal');
 for(const i of partyIdx())floaters.push({x:BPOS[i].x,y:BPOS[i].y-36,text:'+50',color:'#7be38a',t0:performance.now()});
 save();hud();bParty();bMsg('회복약을 나눠 마셨다! 일행 체력 +50');bCommand();bMsg('회복약을 나눠 마셨다! 일행 체력 +50');
}
function bRun(){Music.sfx('door');bMsg('걸음아 날 살려라~! 무사히 도망쳤다.');log('전투에서 물러났다. 다시 다가가면 재도전할 수 있다.');endBattle()}
function bVictory(){
 B.phase='end';const xp=B.boss?300:100;const before=level();
 S.kills.push(B.id);S.xp+=xp;S.defeated++;
 let extra='';if(B.boss){S.potions+=1;extra=' · 회복약 +1 · 수호 인장 획득!'}
 const up=level()>before;if(up)healAll();
 Music.play('victory',null);
 bMsg(`${josa(B.name,'을/를')} 물리쳤다! 경험치 +${xp}${extra}`);
 $('#bcmd').innerHTML=`<p class="q"><small>${B.name}</small>「${B.boss?DEFEAT_LINES[2]:DEFEAT_LINES[B.id]}」</p>${up?`<p class="explain">레벨 업! Lv.${level()} — 최대 체력이 늘고 모두 회복했다!</p>`:''}<button class="choice sel" data-act="next">필드로 돌아가기</button>`;
 bindChoices(()=>{log(`${josa(B.name,'을/를')} 물리쳤다! (+${xp} XP)`,'gold');if(B.boss)log(`수호 인장을 얻었다! 북동쪽 성문이 열렸다.`,'gold');endBattle()});
 save();hud();
}
function bDefeat(){
 B.phase='end';B.lost=true;bMsg('일행이 모두 쓰러졌다… 눈앞이 캄캄해진다…');
 $('#bcmd').innerHTML=`<p class="q"><small>허허 도사</small>「허허, 무리하지 말거라. 해설을 다시 읽고 오면 이길 수 있다!」</p><button class="choice sel" data-act="next">마을에서 정신 차리기</button>`;
 bindChoices(()=>{healAll();pl.x=4;pl.y=13;pl.dir='down';save();endBattle(true);log('출발 지점에서 정신을 차렸다. 체력이 회복되었다.','red')});
}
function endBattle(warp){
 const m=B&&B.m;
 trans={t0:performance.now(),dur:500,kind:'fade',mid:()=>{
  $('#battleui').hidden=true;$('#questbox').hidden=false;$('#zone').hidden=false;
  if(m&&!S.kills.includes(m.id)){m.x=m.hx;m.y=m.hy;m.fx=m.x;m.fy=m.y;m.t=1}
  B=null;mode=dialog?'dialog':'field';cooldown=performance.now()+2000;
  if(warp)loadStage();
  Music.play('field');hud();cv.focus();
 }};
}
let choiceAct=null;
function bindChoices(fn){
 const btns=[...$('#bcmd').querySelectorAll('.choice')];choiceAct=fn;B.lastFn=fn;B.stuck=0;B.sel=Math.max(0,Math.min(B.sel,btns.length-1));if(B.phase==='quiz'||B.phase==='cmd')B.sel=0;
 btns.forEach((b,k)=>{b.onclick=()=>{if(choiceAct===fn){choiceAct=null;Music.sfx('select');fn(b.dataset.act)}};b.onmouseenter=()=>{B&&(B.sel=k);markSel()}});
 markSel();
}
function markSel(){const btns=[...$('#bcmd').querySelectorAll('.choice')];btns.forEach((b,k)=>b.classList.toggle('sel',B&&k===B.sel))}
function battleKey(k){
 if(!B||!choiceAct)return;const btns=[...$('#bcmd').querySelectorAll('.choice')];if(!btns.length)return;
 const cols=B.phase==='cmd'?2:1;
 if(k==='ArrowDown'||k==='s'){B.sel=(B.sel+cols)%btns.length;Music.sfx('select')}
 else if(k==='ArrowUp'||k==='w'){B.sel=(B.sel-cols+btns.length*2)%btns.length;Music.sfx('select')}
 else if(k==='ArrowRight'||k==='d'){B.sel=(B.sel+1)%btns.length;Music.sfx('select')}
 else if(k==='ArrowLeft'||k==='a'){B.sel=(B.sel-1+btns.length)%btns.length;Music.sfx('select')}
 else if(k===' '||k==='Enter'){btns[B.sel]&&btns[B.sel].click();return}
 else if(/^[1-9]$/.test(k)&&btns.length>1){const b=btns[+k-1];if(b){B.sel=+k-1;markSel();b.click()}return}
 markSel();
}
function updateBattle(t){
 const a=B.anim;if(!a)return;const e=t-a.t0;
 if(!a.hit&&e>=a.hitAt){a.hit=true;
  if(a.kind==='attack'){B.eFlash=1;B.eShake=10;shake=a.who.length>1?8:5;Music.sfx('big');floaters.push({x:B.ex,y:B.ey-(B.boss?80:56),text:'100',color:'#ffd75e',big:true,t0:t});
   for(let i=0;i<14;i++)B.fx.push({x:B.ex,y:B.ey-30,vx:(Math.random()-.5)*5,vy:(Math.random()-.8)*4,t0:t,c:['#ffd75e','#fff','#ff7a5a'][i%3]})}
  else{const i=a.target;S.hp[i]=Math.max(0,S.hp[i]-20);B.pFlash[i]=1;shake=4;Music.sfx('hurt');floaters.push({x:BPOS[i].x,y:BPOS[i].y-40,text:'-20',color:'#ff6b5b',t0:t});hud()}
 }
 if(e>=a.dur){B.anim=null;a.after&&a.after()}
}
function drawBattleBg(t){
 const th=THEMES[B.stage];const g=ctx.createLinearGradient(0,0,0,110);g.addColorStop(0,th.sky[0]);g.addColorStop(1,th.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,480,110);
 // 구름
 ctx.fillStyle='#ffffff99';for(let i=0;i<4;i++){const x=((i*140+t/60)%620)-70;ctx.fillRect(x,22+i*13,46,6);ctx.fillRect(x+8,17+i*13,26,6)}
 // 먼 산
 ctx.fillStyle=th.mount[0];ctx.beginPath();ctx.moveTo(0,110);for(let x=0;x<=480;x+=20)ctx.lineTo(x,70+Math.sin(x/37)*14+Math.sin(x/11)*4);ctx.lineTo(480,110);ctx.fill();
 ctx.fillStyle=th.mount[1];ctx.beginPath();ctx.moveTo(0,110);for(let x=0;x<=480;x+=16)ctx.lineTo(x,88+Math.sin(x/23+2)*8);ctx.lineTo(480,110);ctx.fill();
 if(B.stage===4){ctx.fillStyle='#1a0f20';ctx.fillRect(200,46,80,64);ctx.fillRect(190,40,100,8);ctx.fillRect(220,26,40,16);ctx.fillRect(212,22,56,6);ctx.fillStyle='#ffd75e';ctx.fillRect(236,60,8,10)}
 // 땅
 ctx.fillStyle=th.ground[0];ctx.fillRect(0,108,480,212);
 ctx.fillStyle=th.ground[1];for(let y=112;y<320;y+=10)for(let x=((y/10)%2)*20;x<480;x+=40)ctx.fillRect(x+((y*7)%13),y,14,2);
 ctx.fillStyle='#00000022';ctx.fillRect(0,108,480,3);
}
function drawBattle(t){
 drawBattleBg(t);
 const a=B.anim;const e=a?t-a.t0:0;
 // 적
 let ex=B.ex,ey=B.ey;
 if(a&&a.kind==='enemy'){const k=e<a.hitAt?e/a.hitAt:Math.max(0,1-(e-a.hitAt)/(a.dur-a.hitAt));const tg=BPOS[a.target];ex=lerp(B.ex,tg.x-30,Math.sin(k*Math.PI/2));ey=lerp(B.ey,tg.y,k)}
 if(B.eShake>0){ex+=(Math.random()-.5)*B.eShake;B.eShake*=.88;if(B.eShake<.5)B.eShake=0}
 if(B.phase==='end'&&B.hp<=0)B.eAlpha=Math.max(0,B.eAlpha-.02);
 const sc=B.boss?4:3;
 ctx.fillStyle='#00000033';ctx.beginPath();ctx.ellipse(ex,ey,B.boss?30:22,5,0,0,Math.PI*2);ctx.fill();
 Sprites.draw(ctx,B.type,'front',ex,ey+Math.sin(t/250)*2,sc,{stage:B.stage,alpha:B.eAlpha,flash:B.eFlash});
 B.eFlash=Math.max(0,B.eFlash-.06);
 // 일행
 for(const i of partyIdx()){
  const p=BPOS[i];let x=p.x,y=p.y;
  if(a&&a.kind==='attack'&&a.who.includes(i)){const k=e<a.hitAt?e/a.hitAt:Math.max(0,1-(e-a.hitAt)/(a.dur-a.hitAt));const off=a.who.indexOf(i)*14;x=lerp(p.x,B.ex+50+off,Math.sin(k*Math.PI/2));y=lerp(p.y,B.ey-6+off/2,k)-Math.sin(k*Math.PI)*16}
  const ko=S.hp[i]<=0;
  ctx.fillStyle='#00000033';ctx.beginPath();ctx.ellipse(x,y,12,3,0,0,Math.PI*2);ctx.fill();
  if(ko){ctx.save();ctx.translate(x,y-6);ctx.rotate(-Math.PI/2);Sprites.draw(ctx,MEMBERS[i].key,'side',0,14,2,{alpha:.6});ctx.restore()}
  else Sprites.draw(ctx,MEMBERS[i].key,'side',x,y+(B.phase==='cmd'||B.phase==='quiz'?Math.sin(t/220+i)*1:0),2,{frame:a&&a.kind==='attack'&&a.who.includes(i)?((t/90)|0)%2:0,flash:B.pFlash[i]});
  B.pFlash[i]=Math.max(0,B.pFlash[i]-.05);
 }
 // 베기 효과
 if(a&&a.kind==='attack'&&e>a.hitAt-60&&e<a.hitAt+260){const k=(e-a.hitAt+60)/320;ctx.save();ctx.translate(B.ex,B.ey-(B.boss?40:28));ctx.strokeStyle=`rgba(255,255,255,${1-k})`;ctx.lineWidth=4;for(let j=0;j<a.who.length;j++){ctx.beginPath();ctx.arc(0,0,22+k*20+j*6,-1.2+j*.6,.6+k*1.2+j*.6);ctx.stroke()}ctx.strokeStyle=`rgba(255,215,94,${1-k})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-30+k*10,-30);ctx.lineTo(30-k*10,30);ctx.stroke();ctx.restore()}
 if(a&&a.kind==='enemy'&&e>a.hitAt-40&&e<a.hitAt+200){const tg=BPOS[a.target];ctx.fillStyle='#fff';for(let j=0;j<5;j++){const ang=j*1.26+t/100;ctx.fillRect(tg.x+Math.cos(ang)*14-1,tg.y-18+Math.sin(ang)*14-1,3,3)}}
 // 파편
 B.fx=B.fx.filter(p=>{const k=(t-p.t0)/600;if(k>1)return false;ctx.fillStyle=p.c;ctx.fillRect(p.x+p.vx*k*40,p.y+p.vy*k*40+k*k*40,2,2);return true});
}
function drawFloaters(t){
 floaters=floaters.filter(f=>{const k=(t-f.t0)/900;if(k>1)return false;ctx.save();ctx.globalAlpha=1-k*k;ctx.font=(f.big?'bold 24px':'16px')+' NeoDunggeunmo, monospace';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#1a0a05';const y=f.y-Math.sin(Math.min(k*3,1)*Math.PI/2)*14;ctx.strokeText(f.text,f.x,y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,y);ctx.restore();return true});
}

// ---------- 전환 효과 ----------
function drawTrans(t){
 if(!trans)return;const k=(t-trans.t0)/trans.dur;
 if(k>=.5&&!trans.done){trans.done=true;try{trans.mid&&trans.mid()}catch(err){console.error(err)}}
 if(k>=1){trans=null;return}
 const v=k<.5?k*2:2-k*2;
 if(trans.kind==='swirl'){ctx.fillStyle='#000';const n=12;for(let i=0;i<n;i++){const h=320/n;ctx.fillRect(i%2?480*(1-v):0,i*h,480*v,h)}if(k<.5){ctx.fillStyle=`rgba(255,255,255,${Math.max(0,.6-k*2)})`;ctx.fillRect(0,0,480,320)}}
 else{ctx.fillStyle=`rgba(0,0,0,${v})`;ctx.fillRect(0,0,480,320)}
}

// ---------- 메인 루프 ----------
let last=performance.now();
// 안전장치: 화면(DOM)과 게임 상태가 어긋나 멈춘 것처럼 보이는 상황을 매 프레임 자동 복구
function guard(t){
 if(mode==='title')return;
 const dlg=$('#dialog'),bui=$('#battleui');
 if(mode==='dialog'&&!dialog)mode='field';
 if(dialog&&mode==='field'&&!trans)mode='dialog';
 if(!dialog&&!dlg.hidden)dlg.hidden=true;
 if(dialog&&dlg.hidden)dlg.hidden=false;
 if(mode!=='battle'&&!B&&!trans&&!bui.hidden){bui.hidden=true;$('#questbox').hidden=false}
 if(mode==='battle'&&!B&&!trans){mode='field';bui.hidden=true;$('#questbox').hidden=false;cooldown=t+1500}
 if(mode==='battle'&&B&&!trans){
  if(bui.hidden){bui.hidden=false;$('#questbox').hidden=true}
  if(!B.anim&&!choiceAct){B.stuck=B.stuck||t;if(t-B.stuck>1200){B.stuck=0;recoverBattle()}}else B.stuck=0;
 }
 if(mode==='trial'&&!TR&&!trans){mode='field';$('#trialui').hidden=true;$('#questbox').hidden=false}
 if(mode!=='trial'&&TR&&!trans){TR=null;$('#trialui').hidden=true}
 if(mode!=='trial'&&!TR&&!$('#trialui').hidden)$('#trialui').hidden=true;
 if(TR&&TR.menu&&$('#trialui').hidden)$('#trialui').hidden=false;
 if(mode==='field'&&pl.t>=1&&!walkable(pl.x,pl.y,true)){pl.x=4;pl.y=13;pl.fx=4;pl.fy=13}
}
function recoverBattle(){
 const btns=$('#bcmd').querySelectorAll('.choice');
 if(B.phase==='end'){if(B.lost){healAll();pl.x=4;pl.y=13;pl.dir='down';save();endBattle(true)}else endBattle();return}
 if(btns.length&&B.lastFn&&B.phase!=='anim'){bindChoices(B.lastFn);return}
 bCommand();
}
function frame(t){
 requestAnimationFrame(frame);
 try{
  const dt=Math.min(50,t-last);last=t;now=t;
  guard(t);
  if(mode==='field'&&!trans&&!$('#modal').open){updateField(dt);updateMobs(t)}
  if(mode==='field'||mode==='dialog'){for(const m of E.mobs)if(m.t<1)m.t=Math.min(1,m.t+dt/260)}
  if(mode==='dialog'){updateDialog();if(pl.t<1)pl.t=Math.min(1,pl.t+dt/STEP_MS)}
  if(mode==='battle'&&B)updateBattle(t);
  if(mode==='trial'&&TR&&!trans&&!$('#modal').open)trialUpdate(dt/1000);
  ctx.save();
  try{
   if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.85;if(shake<.4)shake=0}
   if(mode==='trial'&&TR&&TR.shown)drawTrial(t);
   else if(mode==='battle'&&B&&$('#battleui').hidden===false)drawBattle(t);
   else if(E)drawField(t);
   drawFloaters(t);
  }finally{ctx.restore()}
  drawTrans(t);
 }catch(err){console.error(err)}
}

// ---------- 입력 ----------
function act(){
 if($('#modal').open)return;
 if(mode==='dialog'){dialogAdvance();return}
 if(mode==='battle'){battleKey(' ');return}
 if(mode==='trial'){if(!trans||(TR&&TR.menu))trialKey(' ');return}
 if(mode!=='field'||trans)return;
 const [dx,dy]=DIRS[pl.dir];const e=entAt(pl.x+dx,pl.y+dy)||[[0,1],[1,0],[0,-1],[-1,0]].map(([a,b])=>entAt(pl.x+a,pl.y+b)).find(Boolean);
 if(e)interact(e);else log('주변에 조사할 것이 없다.');
}
addEventListener('keydown',ev=>{
 if(mode==='title'){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();$('#play').click()}return}
 if($('#modal').open||ev.target.tagName==='TEXTAREA'||ev.target.tagName==='INPUT')return;
 const k=ev.key;
 // Enter/Space가 포커스된 버튼까지 눌러 두 번 처리되는 것을 막는다
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(k))ev.preventDefault();
 if(mode==='trial'){if(trans&&!(TR&&TR.menu))return;if(/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(k))keys[k]=true;if(!ev.repeat)trialKey(k);return}
 if(mode==='battle'){if(!ev.repeat)battleKey(k);return}
 if(k===' '||k==='Enter'){if(!ev.repeat)act();return}
 if(mode==='dialog')return;
 if(k==='1'){potion();return}
 if(k==='j'||k==='J'){journal();return}
 if(k==='m'||k==='M'){toggleSound();return}
 keys[k]=true;
 const td={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[k];
 if(td&&!ev.repeat&&mode==='field'){tapDir=td;if(pl.t>=1)pl.dir=td}
});
addEventListener('keyup',ev=>{delete keys[ev.key]});
addEventListener('blur',()=>{keys={};if(TR&&TR.phase==='run'&&mode==='trial')trialPause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&TR&&TR.phase==='run'&&mode==='trial')trialPause()});
const trialRelease=()=>{if(TR)TR.touch=0};
cv.addEventListener('pointerup',trialRelease);cv.addEventListener('pointercancel',trialRelease);cv.addEventListener('pointerleave',trialRelease);
cv.addEventListener('pointerdown',ev=>{
 if(mode==='trial'){if(!TR||trans)return;if(TR.menu){return}if(TR.phase!=='run')return;const r=cv.getBoundingClientRect(),fx=(ev.clientX-r.left)/r.width;if(fx<.38)TR.touch=-1;else if(fx>.62)TR.touch=1;else trialJump();try{cv.setPointerCapture(ev.pointerId)}catch{}return}
 if(mode==='dialog'){dialogAdvance();return}
 if(mode!=='field'||trans)return;
 const r=cv.getBoundingClientRect();const x=Math.floor((ev.clientX-r.left)/r.width*W),y=Math.floor((ev.clientY-r.top)/r.height*H);
 const e=entAt(x,y);
 if(e){if(Math.abs(e.x-pl.x)+Math.abs(e.y-pl.y)===1){interact(e);return}const p=bfs([pl.x,pl.y],[e.x,e.y],true);if(p){path=p;pendingTarget=e}return}
 if(!walkable(x,y))return;const p=bfs([pl.x,pl.y],[x,y]);if(p){path=p;pendingTarget=null}
});
$('#dialog').addEventListener('click',dialogAdvance);
document.querySelectorAll('[data-move]').forEach(b=>{
 const [dx,dy]=b.dataset.move.split(',').map(Number);const k=dx>0?'ArrowRight':dx<0?'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';
 const down=e=>{e.preventDefault();if(mode==='battle'){battleKey(k);return}if(mode==='trial'&&TR&&TR.menu){trialKey(k);return}keys[k]=true};const up=()=>delete keys[k];
 b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);
});
$('#abtn').addEventListener('click',act);
$('#act').onclick=act;

// ---------- 메뉴 ----------
function potion(){
 if(mode!=='field')return;
 if(S.potions<=0){log('회복약이 없다. 마을 NPC에게 가면 무료로 회복할 수 있다.','red');return}
 if(partyIdx().every(i=>S.hp[i]>=maxHp(i))){log('일행의 체력이 이미 가득 차 있다.');return}
 S.potions--;partyIdx().forEach(i=>S.hp[i]=Math.min(maxHp(i),S.hp[i]+50));Music.sfx('heal');save();hud();log('회복약 사용! 일행 체력 +50','gold');
}
$('#potion').onclick=potion;
function badges(){return stages.map((s,i)=>`<span class="${i<S.stage||(i===S.stage&&S.kills.includes(2))?'on':''}">${s.power}</span>`).join('')}
function journal(){
 if(S.finished){ending();return}
 const learned=stages.slice(0,S.stage+(S.shrine?1:0)).map((s,i)=>`<p><b style="color:#ffd75e">${s.name} · ${STELE_TITLE[i]}</b><br>${s.qs[2][3]}</p>`).join('')||'<p class="muted">비석을 조사하면 배운 내용이 기록됩니다.</p>';
 openModal(`<h2>바람의 수련 수첩</h2><p>현재: 제${S.stage+1}장 ${stages[S.stage].name}<br>레벨 ${level()} · 경험치 ${S.xp} · 물리친 요괴 ${S.defeated}마리<br>정답 필살기 ${S.right}회 · 오답 ${S.wrong}회</p><div class="badgegrid">${badges()}</div><h2 style="font-size:17px">외줄 수련 기록</h2><p>${TRIAL.names.map((n,i)=>{const r=(S.trialRec||[])[i];return `${n}: ${r?(r.helped?'도사님 도움으로 통과':`통과 · 구슬 ${r.orbs}개 · 떨어짐 ${r.lost}번`):(i===S.stage&&S.trial?'통과':'—')}`}).join('<br>')}</p><h2 style="font-size:17px">비석에서 배운 것</h2>${learned}`);
}
$('#journal').onclick=journal;
function toggleSound(){S.sound=!S.sound;Music.setEnabled(S.sound);save();hud();if(S.sound)Music.sfx('ok')}
$('#sound').onclick=toggleSound;
$('#help').onclick=()=>openModal(`<h2>취풍 무협전 안내</h2><p><b>이동</b> 방향키 / WASD · 마우스·터치로 바닥 누르기<br><b>대화·조사</b> Space / Enter (대상을 바라보고)<br><b>전투</b> ↑↓←→ 선택, Space/Enter 결정, 숫자키 1~3 바로 선택<br><b>기타</b> 1 회복약 · J 수련 수첩 · M 소리 켜기/끄기</p><p>요괴에게 닿으면 사이드뷰 전투가 시작됩니다. <b>「필살기」</b>를 고르면 문제가 나오고, 정답을 고르면 동료의 필살기가 터져 100 피해를 줍니다. 떠돌이 요괴는 1번, 보스는 3번 맞혀야 쓰러집니다.</p><p><b>외줄 수련</b> 장마다 보스 결계 옆 깃발 수련터에서 장대 위를 건넙니다. ←→로 균형(기울어진 반대쪽!), Space 점프, ↑↓ 속도, Esc 일시정지. 굴러오는 통·끊어진 장대·도깨비불·돌풍·안개를 넘어 끝까지 가면 결계가 풀립니다. 실패할수록 쉬워지고, 두 번 실패하면 도움을 받아 통과할 수도 있어요.</p><p>틀리면 요괴가 반격해 동료 한 명의 체력이 20 줄고 해설이 나옵니다. 해설을 읽고 다시 도전하세요. 모두 쓰러져도 출발 지점에서 회복해 다시 도전할 수 있어요.</p><p class="muted">진행 순서: NPC와 대화 → 떠돌이 요괴 2마리 → 강 건너 남쪽 비석 → 외줄 수련 → 보스 → 북동쪽 성문. 노란 화살표가 다음 목표를 가리킵니다. 2장에서는 보미, 3장에서는 곰돌이 동료가 됩니다.</p>`);
$('#video').onclick=()=>openModal('<h2>학습 영상 · 웰컴 투 디지털 월드</h2><iframe src="https://www.youtube-nocookie.com/embed/kB666Wpu-Ls" title="양성평등 교육 영상" allowfullscreen></iframe><p><a href="https://www.youtube.com/watch?v=kB666Wpu-Ls" target="_blank" rel="noopener">YouTube에서 영상 보기 ↗</a></p>');
$('#reset').onclick=()=>{openModal('<h2>새 원정을 시작할까요?</h2><p>경험치, 동료, 인장, 약속과 진행이 모두 초기화됩니다.</p><button id="keep">기록 유지</button> <button id="new">초기화하고 시작</button>');$('#keep').onclick=closeModal;$('#new').onclick=()=>{
 const snd=S.sound;S=fresh();S.sound=snd;pl.x=S.x;pl.y=S.y;pl.dir='down';try{localStorage.removeItem(KEY)}catch{}
 closeModal();trans=null;choiceAct=null;B=null;TR=null;dialog=null;floaters=[];
 $('#battleui').hidden=true;$('#trialui').hidden=true;$('#questbox').hidden=false;$('#dialog').hidden=true;
 if($('#splash')){$('#splash').remove()}
 mode='field';loadStage();chapterCard();Music.play('field');save();log('새 원정을 시작했다.','gold');introHint();cv.focus()}};
function introHint(){setTimeout(()=>{if(mode==='field'&&!S.talked&&S.stage===0&&!dialog&&!B&&!trans&&!$('#modal').open)say([['baram','하아암~ 잘 잤다. …응? 사부님이 길 위에서 손짓하고 계시네.'],['sys','방향키(WASD)로 걸어가서 Space로 말을 걸자. 노란 화살표가 목표야!']])},1600)}
function ending(){
 Music.play('ending');
 openModal(`<h2>마지막 장 · 평등의 나라를 되찾다</h2><canvas class="endart" id="endart" width="200" height="56"></canvas><p>다섯 고을의 요괴와 불평등 대마왕을 물리쳤다!<br>바람: "공부로 이기는 무공… 생각보다 멋진데요, 사부님?"<br>허허 도사: "허허, 이제야 알았느냐. 진짜 무공은 일상에서 쓰는 거란다."</p><p>이제 <b style="color:#ffd75e">존중 · 보호 · 자유 · 용기 · 연대</b>의 힘을 현실에서도 펼쳐 보자.</p><div class="badgegrid">${stages.map(s=>`<span class="on">${s.power}</span>`).join('')}</div><p class="muted">레벨 ${level()} · 정답 필살기 ${S.right}회 · 오답 ${S.wrong}회 · 물리친 요괴 ${S.defeated}마리 · 외줄 수련 구슬 ${(S.trialRec||[]).reduce((a,r)=>a+(r&&r.orbs||0),0)}개</p><label for="pledge">나의 실천 약속</label><textarea id="pledge" maxlength="300" placeholder="친구를 놀리는 말에 동조하지 않고…">${S.pledge.replace(/</g,'&lt;')}</textarea><p class="muted">개인정보는 적지 마세요. 이 브라우저에만 저장됩니다.</p><button id="promise">약속 저장 · 원정 기록 내려받기</button>`);
 const c=$('#endart'),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#1a2a6a';g.fillRect(0,0,200,56);g.fillStyle='#ffd75e';for(let i=0;i<30;i++)g.fillRect((i*53)%200,(i*29)%30,1,1);
 g.fillStyle='#3a6a3a';g.fillRect(0,46,200,10);
 [['master',40],['baram',80],['bomi',112],['gomdol',144]].forEach(([k,x])=>{const img=Sprites.get(k,'front',0,0);g.drawImage(img,x-img.width,48-img.height*2,img.width*2,img.height*2)});
 $('#promise').onclick=()=>{S.pledge=$('#pledge').value.trim().slice(0,300);save();const url=URL.createObjectURL(new Blob([`평등의 나라 · 취풍 무협전 원정 기록\n완료: 5개 고을 / 수호 인장 5개\n레벨 ${level()} · 경험치 ${S.xp}\n정답 필살기 ${S.right}회 · 오답 ${S.wrong}회 · 물리친 요괴 ${S.defeated}마리\n외줄 수련: ${TRIAL.names.map((n,i)=>{const r=(S.trialRec||[])[i];return n+(r?(r.helped?'(도움)':`(구슬 ${r.orbs})`):'')}).join(', ')}\n배운 힘: 존중 · 보호 · 자유 · 용기 · 연대\n나의 약속: ${S.pledge}`],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='평등의나라_원정기록.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#promise').textContent='약속 저장 완료 · 다시 내려받기'};
}

// ---------- 타이틀 ----------
function titleArt(){const c=$('#titleart'),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,160,40);
 [['goblin',22,1],['baram',62,0],['bomi',84,0],['gomdol',106,0],['fox',140,1]].forEach(([k,x,e])=>{const img=Sprites.get(k,'front',0,e?S.stage:0);g.drawImage(img,x-img.width,38-img.height*2,img.width*2,img.height*2)})}
$('#play').onclick=()=>{
 $('#splash').remove();mode='field';Music.setEnabled(S.sound);loadStage();
 if(S.finished){Music.play('ending');ending()}else{Music.play('field');chapterCard();if(!S.talked&&S.stage===0&&!S.xp)introHint()}
 cv.focus();
};
document.fonts&&document.fonts.ready.then(titleArt);titleArt();
// 저장된 체력이 모두 0이거나 비정상이면 회복
if(typeof S.trial!=='boolean')S.trial=S.kills.includes(2);S.trialFails=Math.max(0,Math.min(9,Number(S.trialFails)||0));if(!Array.isArray(S.trialRec))S.trialRec=[];
S.hp=S.hp.map((v,i)=>Math.max(0,Math.min(maxHp(i),Number.isFinite(+v)?+v:maxHp(i))));
if(!partyIdx().some(i=>S.hp[i]>0))healAll();
// 마우스로 누른 버튼에 포커스가 남아 키 입력을 가로채지 않도록
document.querySelectorAll('nav button,.hotkeys button').forEach(b=>b.addEventListener('click',()=>{if(!$('#modal').open)cv.focus()}));
grid=makeMap(S.stage);mapImg=renderMap(S.stage);
loadStage();hud();
requestAnimationFrame(frame);
window.__game={get TR(){return TR},startTrial,get keys(){return keys},get dialog(){return dialog},get choiceAct(){return choiceAct},get trans(){return trans},get S(){return S},get mode(){return mode},get B(){return B},get E(){return E},pl,interact,startBattle,bAnswer,walkable,bfs,makeMap,get grid(){return grid},loadStage};
