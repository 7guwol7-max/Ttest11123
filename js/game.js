// 평등의 나라 · 취풍 무협전 — 필드(장별 미션) · 공통 UI · 입력 · 메인 루프
const $=s=>document.querySelector(s);
const cv=$('#game'),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
const W=30,H=20,T=16,KEY='equality-rpg-chwipung-v2',OLDKEY='equality-rpg-chwipung-v1';
const STEP_MS=150;

// ================= 상태 =================
function fresh(){return {v:2,stage:0,x:LAYOUT[0].start[0],y:LAYOUT[0].start[1],dir:'down',hp:[100,90,130],ki:20,xp:0,coins:40,
 items:{potion:3,rice:0,bomb:1,smoke:1,hint:1,charm:0},wpn:[0,0,0],lantern:false,
 talked:false,flags:{},kills:[],shrine:false,trial:false,trialFails:0,boss:false,explored:'',
 finished:false,trialRec:[],pledge:'',sound:true,right:0,wrong:0,defeated:0,qptr:[0,0,0,0,0,0]}}
function stageReset(){Object.assign(S,{talked:false,flags:{},kills:[],shrine:false,trial:false,trialFails:0,boss:false,explored:''});const s=startOf(S.stage);S.x=s[0];S.y=s[1];S.dir='down'}
let S=fresh();
function startOf(st){return st===1?genMaze().start:LAYOUT[st].start}
try{
 let a=JSON.parse(localStorage.getItem(KEY));
 if(!a){const o=JSON.parse(localStorage.getItem(OLDKEY));if(o&&Number.isInteger(o.stage)){a={stage:o.stage,xp:o.xp||0,items:{potion:o.potions||3},pledge:o.pledge||'',sound:o.sound!==false,right:o.right||0,wrong:o.wrong||0,defeated:o.defeated||0,trialRec:o.trialRec||[],finished:!!o.finished,_migrated:true}}}
 if(a&&Number.isInteger(a.stage)&&a.stage>=0&&a.stage<5){
  const base=fresh();S={...base,...a,items:{...base.items,...(a.items||{})},flags:a.flags&&typeof a.flags==='object'?a.flags:{}};
  if(a._migrated){delete S._migrated;stageReset()}
 }
}catch{}
function sanitize(){
 if(!Array.isArray(S.kills))S.kills=[];
 if(!Array.isArray(S.wpn)||S.wpn.length!==3)S.wpn=[0,0,0];
 S.wpn=S.wpn.map((v,i)=>Math.max(0,Math.min(WEAPONS[i].length-1,v|0)));
 for(const k of ITEM_ORDER)S.items[k]=Math.max(0,Math.min(99,S.items[k]|0));
 S.coins=Math.max(0,S.coins|0);S.ki=Math.max(0,Math.min(100,S.ki|0));
 if(!Array.isArray(S.hp)||S.hp.length!==3)S.hp=[100,90,130];
 S.hp=S.hp.map((v,i)=>Math.max(0,Math.min(maxHp(i),Number.isFinite(+v)?+v:maxHp(i))));
 if(!partyIdx().some(i=>S.hp[i]>0))healAll();
 if(!Array.isArray(S.qptr)||S.qptr.length!==6)S.qptr=[0,0,0,0,0,0];
 if(!Array.isArray(S.trialRec))S.trialRec=[];
 S.pledge=String(S.pledge||'').slice(0,300);
}
let mode='title',grid=null,mapImg=null,ENTS=[],keys={},path=[],pendingTarget=null,cooldown=0,now=0,trans=null,dialog=null,shake=0,floaters=[],followers=[],tapDir=null,lastBump=0,explored=null,MENU=null,alertT=0;
const pl={x:S.x,y:S.y,fx:S.x,fy:S.y,t:1,dir:S.dir||'down',step:0};

const level=()=>1+Math.floor(Math.sqrt(S.xp/60));
const maxHp=i=>MEMBERS[i].max+(level()-1)*10;
const atkOf=i=>MEMBERS[i].atk+Math.round((level()-1)*2.5)+WEAPONS[i][S.wpn[i]][1];
const joined=i=>MEMBERS[i].join<S.stage||(MEMBERS[i].join===S.stage&&(S.talked||i===0));
const partyIdx=()=>[0,1,2].filter(joined);
function healAll(){partyIdx().forEach(i=>S.hp[i]=maxHp(i))}
function josa(w,pair){const c=w.charCodeAt(w.length-1)-0xac00;const has=c>=0&&c<=11171&&c%28!==0;const [a,b]=pair.split('/');return w+(has?a:b)}
function save(){try{S.x=pl.x;S.y=pl.y;S.dir=pl.dir;if(explored)S.explored=packExplored();localStorage.setItem(KEY,JSON.stringify(S));$('#savestatus').textContent='진행 자동 저장됨'}catch{$('#savestatus').textContent='저장 불가 · 이 창을 유지하세요'}}
function log(t,kind=''){const p=document.createElement('p');p.className=kind;p.textContent='▸ '+t;const L=$('#log');L.append(p);while(L.children.length>40)L.firstChild.remove();L.scrollTop=L.scrollHeight}
function hash(x,y,s=0){let h=(x*374761393+y*668265263+s*982451653)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296}
const F=()=>S.flags;
function flagArr(k){if(!Array.isArray(S.flags[k]))S.flags[k]=[];return S.flags[k]}

// ================= 미로(2장) =================
let MAZE=null;
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function genMaze(){
 if(MAZE)return MAZE;
 const r=rng(20261102),g=Array.from({length:H},()=>Array(W).fill('#'));
 const inRoom=(x,y)=>x>=21&&y<=7;
 const cells=[];for(let y=1;y<H-1;y+=2)for(let x=1;x<W-2;x+=2)if(!inRoom(x,y))cells.push([x,y]);
 const vis=new Set(),key=(x,y)=>x+','+y;
 const st=[[1,17]];vis.add(key(1,17));g[17][1]='.';
 while(st.length){const [x,y]=st[st.length-1];
  const nb=[[2,0],[-2,0],[0,2],[0,-2]].map(([dx,dy])=>[x+dx,y+dy,dx,dy]).filter(([nx,ny])=>nx>=1&&ny>=1&&nx<=27&&ny<=17&&!inRoom(nx,ny)&&!vis.has(key(nx,ny)));
  if(!nb.length){st.pop();continue}
  const [nx,ny,dx,dy]=nb[(r()*nb.length)|0];g[y+dy/2][x+dx/2]='.';g[ny][nx]='.';vis.add(key(nx,ny));st.push([nx,ny]);
 }
 for(let i=0;i<16;i++){const [x,y]=cells[(r()*cells.length)|0];const [dx,dy]=[[2,0],[0,2]][(r()*2)|0];const nx=x+dx,ny=y+dy;if(nx<=27&&ny<=17&&!inRoom(nx,ny))g[y+dy/2][x+dx/2]='.'}
 for(let y=15;y<=18;y++)for(let x=1;x<=5;x++)g[y][x]='.';
 for(let y=1;y<=7;y++)for(let x=22;x<=28;x++)g[y][x]='.';
 for(let x=22;x<=28;x++)g[1][x]=':';
 g[8][25]='D';if(g[9][25]==='#')g[9][25]='.';
 for(let y=0;y<H;y++){g[y][0]='#';g[y][W-1]='#'}for(let x=0;x<W;x++){g[0][x]='#';g[H-1][x]='#'}
 // 시작점 기준 거리
 const dist={},q=[[2,17]];dist[key(2,17)]=0;
 while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(g[ny]&&g[ny][nx]&&g[ny][nx]!=='#'&&g[ny][nx]!=='D'&&dist[key(nx,ny)]==null){dist[key(nx,ny)]=dist[key(x,y)]+1;q.push([nx,ny])}}}
 const open=(x,y)=>g[y]&&g[y][x]&&g[y][x]!=='#'&&g[y][x]!=='D';
 const deg=(x,y)=>[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>open(x+dx,y+dy)).length;
 const ends=Object.keys(dist).map(k=>k.split(',').map(Number)).filter(([x,y])=>deg(x,y)===1&&!(x<=6&&y>=14)&&!(Math.abs(x-25)+Math.abs(y-9)<3)).sort((a,b)=>dist[key(...b)]-dist[key(...a)]);
 const pickSpread=(list,n,minD,taken)=>{const out=[];for(const p of list){if(out.length>=n)break;if([...out,...taken].every(o=>Math.abs(o[0]-p[0])+Math.abs(o[1]-p[1])>=minD))out.push(p)}return out};
 const frags=pickSpread(ends,3,9,[]);
 const chests=pickSpread(ends.filter(p=>!frags.includes(p)),3,6,frags);
 const corr=Object.keys(dist).map(k=>k.split(',').map(Number)).filter(([x,y])=>dist[key(x,y)]>=7&&!(x<=6&&y>=14)&&deg(x,y)===2&&!(Math.abs(x-25)+Math.abs(y-9)<2));
 corr.sort((a,b)=>hash(a[0],a[1],7)-hash(b[0],b[1],7));
 const mobs=pickSpread(corr,6,7,[...frags,...chests]);
 MAZE={grid:g,start:[2,17],npc:[4,16],shop:[1,15],villagers:[],frags,chests,mobs,stele:[23,6],trial:[27,6],boss:[25,3],gate:[28,1],door:[25,8]};
 return MAZE;
}

// ================= 지도·문 =================
function layoutOf(st){return st===1?genMaze():LAYOUT[st]}
function buildGrid(st){return st===1?genMaze().grid.map(r=>r.slice()):MAPS[st].map(r=>r.split(''))}
function doorOpenAt(x,y){
 const st=S.stage;
 if(st===1)return fragCount()>=3;
 if(st===2){const i=LAYOUT[2].pens.findIndex(p=>p.door[0]===x&&p.door[1]===y);return i>=0&&penSolved(i)}
 if(st===3)return bellsDone();
 if(st===4)return S.trial;
 return false;
}
function tileSolid(x,y){if(x<0||y<0||x>=W||y>=H)return true;const c=grid[y][x];if(c==='D')return !doorOpenAt(x,y);return c==='#'||c==='~'||c==='H'||c==='W'}
function walkable(x,y,ignoreEnt){if(tileSolid(x,y))return false;if(ignoreEnt)return true;return !entAt(x,y)}
function entAt(x,y){for(const e of ENTS)if(!e.gone&&e.x===x&&e.y===y)return e;return null}
function bfs(start,goal,adjOK){
 const q=[start],seen=new Set([start.join()]),prev={};
 while(q.length){const p=q.shift();
  const done=adjOK?Math.abs(p[0]-goal[0])+Math.abs(p[1]-goal[1])===1:(p[0]===goal[0]&&p[1]===goal[1]);
  if(done){const out=[];let k=p.join();while(k!==start.join()){out.unshift(k.split(',').map(Number));k=prev[k]}return out}
  for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const x=p[0]+dx,y=p[1]+dy,k=x+','+y;if(!seen.has(k)&&walkable(x,y)){seen.add(k);prev[k]=p.join();q.push([x,y])}}
 }
 return null;
}

// ================= 미션 =================
const lettersGot=()=>flagArr('letters').length;
const fragCount=()=>flagArr('frags').length;
const freedCount=()=>flagArr('freed').length;
const keysGot=()=>flagArr('keys').length;
function bellsDone(){return flagArr('bells').length>=3}
function penSolved(i){const pen=LAYOUT[2].pens[i];const bp=boulderPos(i);return pen.plates.every(p=>bp.some(b=>b[0]===p[0]&&b[1]===p[1]))}
function boulderPos(i){const bp=S.flags.bpos||(S.flags.bpos={});if(!bp[i])bp[i]=LAYOUT[2].pens[i].boulders.map(b=>b.slice());return bp[i]}
function missionDone(){
 const st=S.stage;
 if(st===0)return !!F().delivered;
 if(st===1)return fragCount()>=3;
 if(st===2)return freedCount()>=3;
 if(st===3)return bellsDone();
 return keysGot()>=4;
}
function missionLine(){
 const st=S.stage;
 if(st===0)return lettersGot()<5?`② 칭찬 편지 모으기 ${lettersGot()} / 5<br><span>정원 안·강 건너·집 뒤까지 구석구석</span>`:'③ 도사님께 편지 전하기<br><span>도사님은 길 위에 계신다</span>';
 if(st===1)return `② 어둠의 미로 · 열쇠 조각 ${fragCount()} / 3<br><span>막다른 길을 뒤져라 · 상자에 등불이 있다</span>`;
 if(st===2)return `② 바위 밀어 친구 구하기 ${freedCount()} / 3<br><span>꽃자리에 바위를 · 꼬이면 팻말 조사</span>`;
 if(st===3){const b=flagArr('bells');return `② 종 울리기 ${BELL_ORDER.map((i,k)=>(k<b.length?'✔':'')+['산','강','바람'][i]).join(' → ')}<br><span>노란 시야를 피해 풀숲으로</span>`}
 return `② 그림자 장수 물리치기 · 평등의 열쇠 ${keysGot()} / 4<br><span>서쪽·동쪽 날개와 북쪽 작은 방</span>`;
}
function questText(){
 const st=S.stage,npc=STORY[st].npcName;
 if(S.finished)return '모든 고을에 평등의 빛을 되찾았다!';
 if(!S.talked)return `① ${npc}에게 말 걸기<br><span>노란 화살표를 따라가자</span>`;
 if(!missionDone())return missionLine();
 if(!S.shrine)return `④ 비석 조사<br><span>${STELE_TITLE[st]}</span>`;
 if(!S.trial)return `⑤ 외줄 수련 · ${TRIAL.names[st]}<br><span>깃발 수련터</span>`;
 if(!S.boss)return `⑥ ${ENEMY_NAMES[st].boss} 처치<br><span>정답 필살기로 보호막 3겹을 깨자</span>`;
 return st===4?'⑦ 마지막 문으로!<br><span>왕좌 뒤 평등의 문</span>':'⑦ 성문으로 이동<br><span>다음 고을로 떠나자</span>';
}

// ================= 엔티티 =================
function buildEntities(){
 const st=S.stage,L=layoutOf(st),E=[];
 const add=(kind,p,extra={})=>E.push({kind,x:p[0],y:p[1],...extra});
 add('npc',L.npc);add('shop',L.shop);
 (L.villagers||[]).forEach((p,i)=>add('villager',p,{id:i}));
 if(st===0)LAYOUT[0].items.forEach((p,i)=>{if(!flagArr('letters').includes(i))add('letter',p,{id:i})});
 if(st===1)L.frags.forEach((p,i)=>{if(!flagArr('frags').includes(i))add('frag',p,{id:i})});
 (L.chests||[]).forEach((p,i)=>{if(CHESTS[st][i])add('chest',p,{id:i,open:flagArr('chests').includes(i)})});
 (L.mobs||[]).forEach((p,i)=>{if(!S.kills.includes('m'+i)&&STAGE_MOBS[st][i])add('mob',p,{id:'m'+i,types:STAGE_MOBS[st][i],hx:p[0],hy:p[1],fx:p[0],fy:p[1],t:1,next:0})});
 if(st===2)LAYOUT[2].pens.forEach((pen,i)=>{
  if(!flagArr('freed').includes(i))add('friend',pen.friend,{id:i});
  add('sign',pen.sign,{id:i});
  boulderPos(i).forEach((b,j)=>add('boulder',b,{pen:i,j}));
 });
 if(st===3){LAYOUT[3].bells.forEach((p,i)=>add('bell',p,{id:i}));
  LAYOUT[3].guards.forEach((r,i)=>{if(!S.kills.includes('g'+i))add('guard',r[0],{id:'g'+i,route:r,dirSign:1,fx:r[0][0],fy:r[0][1],t:1,next:0,face:r[0][0]===r[1][0]?(r[1][1]>r[0][1]?'down':'up'):(r[1][0]>r[0][0]?'right':'left')})})}
 if(st===4)LAYOUT[4].shadows.forEach((p,i)=>{if(!flagArr('keys').includes(i))add('shadow',p,{id:i})});
 add('stele',L.stele);add('trial',L.trial);
 if(!S.boss)add('boss',L.boss);
 add('gate',L.gate);
 return E;
}
const ENT=k=>ENTS.find(e=>e.kind===k);
function loadStage(){
 grid=buildGrid(S.stage);mapImg=renderMap(S.stage);
 ENTS=buildEntities();
 explored=S.stage===1?unpackExplored(S.explored):null;
 if(!walkable(pl.x,pl.y)){const s=startOf(S.stage);pl.x=s[0];pl.y=s[1]}
 pl.fx=pl.x;pl.fy=pl.y;pl.t=1;
 followers=partyIdx().slice(1).map(i=>({i,x:pl.x,y:pl.y,fx:pl.x,fy:pl.y}));
 path=[];pendingTarget=null;reveal();hud();
}
function refreshEnts(){const keep=new Map(ENTS.filter(e=>e.kind==='mob'||e.kind==='guard').map(e=>[e.id,e]));ENTS=buildEntities();ENTS.forEach((e,i)=>{if(keep.has(e.id)&&(e.kind==='mob'||e.kind==='guard'))ENTS[i]=keep.get(e.id)})}

// ----- 시야(2장 미로) -----
function packExplored(){if(!explored)return '';let s='';for(let i=0;i<explored.length;i+=4)s+=((explored[i]|explored[i+1]<<1|explored[i+2]<<2|explored[i+3]<<3)).toString(16);return s}
function unpackExplored(s){const a=new Uint8Array(W*H);if(s)for(let i=0;i<s.length;i++){const v=parseInt(s[i],16)||0;for(let b=0;b<4;b++)if(i*4+b<a.length)a[i*4+b]=(v>>b)&1}return a}
const visionR=()=>S.lantern?5.2:3.4;
function reveal(){if(!explored)return;const r=visionR();for(let y=0;y<H;y++)for(let x=0;x<W;x++)if((x-pl.x)**2+(y-pl.y)**2<=r*r)explored[y*W+x]=1}

// ================= 타일 그리기 =================
function renderMap(stage){
 const c=document.createElement('canvas');c.width=W*T;c.height=H*T;const g=c.getContext('2d');const th=THEMES[stage];
 const px=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
 const at=(x,y)=>grid[y]&&grid[y][x];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const v=grid[y][x],X=x*T,Y=y*T;
  if(v==='~'){px(X,Y,T,T,th.water);for(let i=0;i<3;i++){const r=hash(x,y,i+50);px(X+((r*12)|0),Y+3+i*5,4,1,th.waterL)}
   if(at(x-1,y)!=='~'&&at(x-1,y)!=='=')px(X,Y,2,T,'#ffffff40');if(at(x,y-1)!=='~'&&at(x,y-1)!=='=')px(X,Y,T,2,'#ffffff40');continue}
  if(v==='='){const vert=at(x-1,y)==='~'||at(x+1,y)==='~';px(X,Y,T,T,'#8a5a2a');
   if(vert){for(let i=0;i<T;i+=4){px(X,Y+i,T,3,'#b07a3a');px(X,Y+i+3,T,1,'#5a3a1a')}if(at(x-1,y)==='~')px(X,Y,2,T,'#4a2a10');if(at(x+1,y)==='~')px(X+T-2,Y,2,T,'#4a2a10')}
   else{for(let i=0;i<T;i+=4){px(X+i,Y,3,T,'#b07a3a');px(X+i+3,Y,1,T,'#5a3a1a')}if(at(x,y-1)==='~')px(X,Y,T,2,'#4a2a10');if(at(x,y+1)==='~')px(X,Y+T-2,T,2,'#4a2a10')}continue}
  if(v==='_'||(stage===4&&(v==='#'||v==='D'||v==='W'||v===':'))){px(X,Y,T,T,'#a89a88');px(X,Y,T,1,'#8a7c6a');px(X,Y,1,T,'#8a7c6a');if((x+y)%2)px(X+2,Y+2,12,12,'#b0a290');
   if(v===':'){px(X,Y,T,T,th.path);px(X,Y,T,1,'#e8c060');px(X,Y+T-1,T,1,'#e8c060');if((x+y)%3===0)px(X+6,Y+6,4,4,th.pathD)}
   if(v==='W'){px(X,Y,T,T,'#4a3a4a');px(X,Y,T,4,'#6a5a6a');for(let i=0;i<T;i+=8)px(X+i+((y%2)*4),Y+4,1,12,'#2a1a2a');px(X,Y+10,T,1,'#2a1a2a')}
   if(v==='#'){drawTree(g,X,Y,th,stage,x,y)}
   continue}
  const gc=th.grass;px(X,Y,T,T,gc[0]);
  for(let i=0;i<5;i++){const r=hash(x,y,i);const r2=hash(y,x,i+3);px(X+((r*15)|0),Y+((r2*15)|0),1,1,i%2?gc[1]:gc[2])}
  if(hash(x,y,99)<.25){px(X+5,Y+9,1,2,gc[1]);px(X+7,Y+8,1,3,gc[1]);px(X+9,Y+9,1,2,gc[1])}
  if(v===':'){px(X,Y,T,T,th.path);for(let i=0;i<4;i++){const r=hash(x,y,i+20),r2=hash(y,x,i+30);px(X+((r*14)|0),Y+((r2*14)|0),2,1,th.pathD)}
   for(const [dx,dy,ex,ey,ew,eh] of [[0,-1,0,0,T,1],[0,1,0,T-1,T,1],[-1,0,0,0,1,T],[1,0,T-1,0,1,T]]){const n=at(x+dx,y+dy);if(n!==':'&&n!=='='&&n!=null)px(X+ex,Y+ey,ew,eh,th.pathD)}}
  if(v===','){if(stage===3){for(let i=0;i<6;i++){const r=hash(x,y,i+40);px(X+1+((r*13)|0),Y+3+((i*2)%10),2,6,i%2?'#5a7a4a':'#7a9a5a')}px(X,Y+12,T,4,'#4a6a3a')}
   else for(let i=0;i<3;i++){const r=hash(x,y,i+40),r2=hash(y,x,i+41);const fx=X+2+((r*11)|0),fy=Y+2+((r2*11)|0);px(fx,fy,3,1,th.flower[i%3]);px(fx+1,fy-1,1,3,th.flower[i%3]);px(fx+1,fy,1,1,'#ffe066')}}
  if(v==='W'){px(X,Y+3,T,3,'#8a5a2a');px(X,Y+10,T,3,'#8a5a2a');for(let i=1;i<T;i+=7){px(X+i,Y,3,T,'#6a3f1f');px(X+i,Y,3,2,'#b07a3a')}}
 }
 const houses=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=grid[y][x];if(v==='#'&&stage!==4)drawTree(g,x*T,y*T,th,stage,x,y);if(v==='H'&&at(x,y-1)!=='H'&&at(x-1,y)!=='H')houses.push([x,y])}
 for(const [x,y] of houses){let w=0,h=0;while(grid[y][x+w]==='H')w++;while(grid[y+h]&&grid[y+h][x]==='H')h++;drawHouse(g,x*T,y*T,w*T,h*T,stage)}
 return c;
}
function drawTree(g,X,Y,th,stage,x,y){
 const [a,b,d]=th.treeC;const px=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(X+x,Y+y,w,h)};
 if(th.tree==='pine'){px(7,12,2,4,'#5a3a1a');for(let i=0;i<3;i++){const w=12-i*3,yy=9-i*4;px(8-w/2-1,yy,w+2,5,d);px(8-w/2,yy,w,4,i%2?b:a)}px(7,0,2,2,b)}
 else if(th.tree==='rock'){px(1,5,14,10,d);px(2,4,12,10,a);px(3,4,6,3,b);px(4,12,9,2,d)}
 else if(th.tree==='lantern'){if((x+y)%3===0){px(5,2,6,2,d);px(4,4,8,2,a);px(5,6,6,5,b);px(6,7,4,3,'#fff6c0');px(4,11,8,2,a);px(6,13,4,3,'#6a5a4a')}else{px(3,1,10,14,'#8a3a2a');px(4,2,8,12,'#b8483a');px(4,2,8,2,'#d8684a');px(3,13,10,2,'#5a2a1a')}}
 else{px(7,11,2,5,'#6a3f1f');px(6,15,4,1,'#4a2a12');px(2,3,12,9,d);px(1,5,14,6,d);px(3,2,10,9,a);px(2,4,12,6,a);px(4,3,4,3,b);px(3,6,2,2,b);if(th.tree==='blossom'){px(9,5,1,1,'#fff');px(5,8,1,1,'#fff');px(11,8,1,1,'#fff')}}
}
function drawHouse(g,X,Y,w,h,stage){
 const roof=['#3a4a7a','#8a6a2a','#c8486a','#4a4a5a','#b8282a'][stage],roofL=['#5a6a9a','#b08a3a','#e86a8a','#6a6a7a','#ffd75e'][stage];
 const px=(x,y,ww,hh,c)=>{g.fillStyle=c;g.fillRect(X+x,Y+y,ww,hh)};
 px(2,h*.45,w-4,h*.55,'#2a1a10');px(3,h*.45,w-6,h*.55-1,'#f2e4c4');
 for(let i=3;i<w-3;i+=Math.max(10,(w-6)/4|0))px(i,h*.45,2,h*.55-1,'#7a4a2a');
 px(w/2-5,h-14,10,13,'#5a3a1a');px(w/2-4,h-13,8,12,'#8a5a2a');px(w/2,h-13,1,12,'#5a3a1a');
 px(8,h*.6,8,6,'#5a3a1a');px(9,h*.6+1,6,4,'#e8d8a8');px(w-16,h*.6,8,6,'#5a3a1a');px(w-15,h*.6+1,6,4,'#e8d8a8');
 const rh=h*.5;px(-3,rh-4,w+6,4,'#1a1a2a');px(-4,rh-7,3,3,'#1a1a2a');px(w+1,rh-7,3,3,'#1a1a2a');
 for(let i=0;i<rh-4;i++){const inset=Math.max(0,(rh-4-i)*0.25|0);px(inset-2,i,w+4-inset*2,1,i%3===0?roofL:roof)}
 px(4,0,w-8,2,'#1a1a2a');px(2,-2,4,3,'#1a1a2a');px(w-6,-2,4,3,'#1a1a2a');
}

// ================= HUD =================
function invText(){const it=S.items;return ITEM_ORDER.filter(k=>it[k]>0).map(k=>`${ITEMS[k].name} ${it[k]}`).join(' · ')||'도구 없음'}
function hud(){
 $('#quest').innerHTML=questText();
 $('#qtitle').textContent=`제${S.stage+1}장 ${stages[S.stage].name}`;
 const seals=S.stage+(S.boss?1:0);
 $('#inventory').textContent=`Lv.${level()} · 경험치 ${S.xp} · ${S.coins}냥 · 기력 ${S.ki} · 인장 ${seals}/5 — ${invText()}`;
 $('#sound').textContent=S.sound?'소리 ON':'소리 OFF';
 if($('#play'))$('#play').textContent=S.xp||S.talked||S.stage?'이어서 원정하기':'원정 시작';
 const P=$('#party');P.innerHTML='';
 MEMBERS.forEach((m,i)=>{const d=document.createElement('div');
  if(!joined(i)){d.className='card empty';d.textContent='??? · 아직 만나지 못함';P.append(d);return}
  d.className='card';const c=document.createElement('canvas');c.width=40;c.height=40;Sprites.face(c,m.key);
  const hp=Math.min(S.hp[i],maxHp(i));
  d.innerHTML=`<div class="info"><b>${m.name}</b> <small>${WEAPONS[i][S.wpn[i]][0]} · 공격 ${atkOf(i)}</small><br><meter min="0" max="${maxHp(i)}" low="${maxHp(i)*.3}" optimum="${maxHp(i)}" value="${hp}"></meter><br>${hp} / ${maxHp(i)}</div>`;
  d.prepend(c);P.append(d)});
}

// ================= 대화 =================
const SPEAKER={baram:'바람',bomi:'보미',gomdol:'곰돌',master:'허허 도사',sys:'안내',cat:'냥냥 상인',villager:'마을 사람',villager2:'마을 사람',friend0:'친구',friend1:'친구',friend2:'친구'};
function say(lines,then){
 mode='dialog';keys={};path=[];
 dialog={lines,i:0,shown:0,then,start:performance.now()};
 $('#dialog').hidden=false;showLine();
}
function showLine(){const [who,text,name]=dialog.lines[dialog.i];Sprites.face($('#face'),who);$('#dname').textContent=name||SPEAKER[who]||who;dialog.shown=0;dialog.start=performance.now();$('#dline').textContent='';Music.sfx('select')}
function dialogAdvance(){
 if(!dialog)return;const text=dialog.lines[dialog.i][1];
 if(dialog.shown<text.length){dialog.shown=text.length;dialog.start=performance.now()-text.length*28-50;$('#dline').textContent=text;return}
 dialog.i++;
 if(dialog.i>=dialog.lines.length){const t=dialog.then;dialog=null;$('#dialog').hidden=true;mode='field';cooldown=performance.now()+400;if(t)t();return}
 showLine();
}
function updateDialog(){if(!dialog)return;const text=dialog.lines[dialog.i][1];const n=Math.min(text.length,Math.floor((performance.now()-dialog.start)/28));if(n!==dialog.shown){dialog.shown=n;$('#dline').textContent=text.slice(0,n)}}

// ================= 화면 안 메뉴(상점·가방) =================
function menuOpen(html,buttons,onBack){
 mode='menu';keys={};path=[];
 MENU={sel:0,buttons,onBack};
 const el=$('#mpanel');
 el.innerHTML=html+`<div class="mbtns">`+buttons.map((b,i)=>`<button class="choice" data-i="${i}" ${b.disabled?'disabled':''}>${b.label}</button>`).join('')+'</div>';
 $('#menuui').hidden=false;
 el.querySelectorAll('.choice').forEach((btn,i)=>{btn.onclick=()=>menuChoose(i);btn.onmouseenter=()=>{if(MENU){MENU.sel=i;menuMark()}}});
 menuMark();
}
function menuMark(){if(!MENU)return;$('#mpanel').querySelectorAll('.choice').forEach((b,i)=>b.classList.toggle('sel',i===MENU.sel))}
function menuChoose(i){if(!MENU)return;const b=MENU.buttons[i];if(!b||b.disabled){Music.sfx('bump');return}Music.sfx('select');b.fn()}
function menuClose(){MENU=null;$('#menuui').hidden=true;if(mode==='menu')mode='field';cooldown=performance.now()+300;hud();cv.focus()}
function menuKey(k){
 if(!MENU)return;const n=MENU.buttons.length;
 if(k==='ArrowDown'||k==='s'||k==='S'||k==='ArrowRight'||k==='d'||k==='D'){MENU.sel=(MENU.sel+1)%n;menuMark();Music.sfx('select')}
 else if(k==='ArrowUp'||k==='w'||k==='W'||k==='ArrowLeft'||k==='a'||k==='A'){MENU.sel=(MENU.sel-1+n)%n;menuMark();Music.sfx('select')}
 else if(k===' '||k==='Enter')menuChoose(MENU.sel);
 else if(k==='Escape'||k==='Backspace')(MENU.onBack||menuClose)();
 else if(/^[1-9]$/.test(k)&&+k<=n){MENU.sel=+k-1;menuMark();menuChoose(+k-1)}
}
function openShop(sel=0){
 const btns=ITEM_ORDER.map(k=>({label:`${ITEMS[k].name} <small>${ITEMS[k].desc}</small> <b>${ITEMS[k].price}냥</b> (가진 수 ${S.items[k]})`,disabled:S.coins<ITEMS[k].price,fn:()=>{S.coins-=ITEMS[k].price;S.items[k]++;Music.sfx('coin');save();openShop(ITEM_ORDER.indexOf(k))}}));
 btns.push({label:'나가기',fn:()=>{menuClose();say([['cat','또 오라냥~ 요괴를 물리치면 냥(돈)이 생긴다냥!']])}});
 menuOpen(`<h3>냥냥 상인의 만물 보따리</h3><p>가진 돈 <b>${S.coins}냥</b> · 전투에서 쓸 도구를 고르라냥!</p>`,btns);
 if(MENU){MENU.sel=Math.min(sel,btns.length-1);menuMark()}
}
function openBag(){
 if(mode!=='field')return;
 const wp=partyIdx().map(i=>`${MEMBERS[i].name}: ${WEAPONS[i][S.wpn[i]][0]} (공격 ${atkOf(i)})`).join('<br>');
 const btns=[];
 if(S.items.potion>0)btns.push({label:`회복약 쓰기 (${S.items.potion})`,fn:()=>{potion();openBag()}});
 if(S.items.rice>0)btns.push({label:`우정 떡 쓰기 (${S.items.rice})`,fn:()=>{if(partyIdx().every(i=>S.hp[i]>=maxHp(i))){log('모두 건강하다.');return}S.items.rice--;partyIdx().forEach(i=>S.hp[i]=Math.min(maxHp(i),S.hp[i]+Math.round(maxHp(i)*.6)));Music.sfx('heal');save();hud();openBag()}});
 btns.push({label:'닫기',fn:menuClose});
 menuOpen(`<h3>가방</h3><p>${wp}</p><p>돈 ${S.coins}냥 · 기력 ${S.ki}/100${S.lantern?' · 반딧불 등불':''}</p><p>${ITEM_ORDER.map(k=>`${ITEMS[k].name} ${S.items[k]}개 <small>(${ITEMS[k].desc})</small>`).join('<br>')}</p>`,btns);
}

// ================= 모달 =================
function openModal(html){keys={};path=[];$('#body').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}
function closeModal(){if($('#modal').open)$('#modal').close()}
$('#close').onclick=closeModal;
$('#modal').addEventListener('close',()=>{$('#body').innerHTML='';keys={};cv.focus()});

// ================= 보상 =================
function giveReward(r,source){
 const msgs=[];
 if(r.weapon){const [m,t]=r.weapon;if(S.wpn[m]<t){S.wpn[m]=t;msgs.push(`${MEMBERS[m].name}의 무기: ${WEAPONS[m][t][0]}! (공격 +${WEAPONS[m][t][1]})`)}else{S.coins+=30;msgs.push(`이미 더 좋은 무기가 있다. 대신 30냥!`)}}
 if(r.items)for(const [k,n] of Object.entries(r.items)){S.items[k]+=n;msgs.push(`${ITEMS[k].name} +${n}`)}
 if(r.key==='lantern'){S.lantern=true;msgs.push('반딧불 등불! 미로에서 더 멀리 보인다.');reveal()}
 if(r.coins){S.coins+=r.coins;msgs.push(`${r.coins}냥`)}
 Music.sfx('chest');save();hud();
 return msgs;
}

// ================= 상호작용 =================
function interact(e){
 if(!e)return;
 face(e);
 const st=S.stage,sc=STORY[st];
 switch(e.kind){
  case 'npc':{
   const who=st===1?'bomi':st===2?'gomdol':'master';
   if(!S.talked){say(sc.first,()=>{S.talked=true;healAll();const keep=followers;loadStage();followers.forEach(f=>{const o=keep.find(k=>k.i===f.i);if(o)Object.assign(f,{x:o.x,y:o.y,fx:o.fx,fy:o.fy});else{f.x=e.x;f.y=e.y;f.fx=f.x;f.fy=f.y}});save();hud();log('임무를 받았다!','gold')});return}
   if(st===0&&lettersGot()>=5&&!F().delivered){say(sc.deliver,()=>{F().delivered=true;S.xp+=60;S.coins+=30;healAll();save();hud();log('편지를 전했다! (+60 경험치 · 30냥)','gold')});return}
   say(sc.again.map(([w,t])=>[w===sc.npc?who:w,t]),()=>{healAll();S.ki=Math.max(S.ki,30);Music.sfx('heal');save();hud();log('일행의 체력이 모두 회복되었다.','gold')});return}
  case 'villager':{const [name,text]=sc.villagers[e.id];say([[e.id%2?'villager2':'villager',text,name]]);return}
  case 'shop':say([['cat','어서 오라냥! 냥냥 상인의 만물 보따리다냥.']],()=>openShop());return;
  case 'letter':{flagArr('letters').push(e.id);e.gone=true;Music.sfx('key');S.xp+=15;save();hud();
   const n=lettersGot();say([['sys',`칭찬 편지를 주웠다! (${n}/5) 「${['네 목소리 멋져!','괜찮아, 내가 옆에 있을게.','너랑 노는 게 제일 재밌어.','고마워, 넌 좋은 친구야.','있는 그대로의 네가 좋아.'][e.id]}」`]].concat(n>=5?[['sys','편지를 모두 모았다! 도사님께 전하러 가자.']]:[]));return}
  case 'frag':{flagArr('frags').push(e.id);e.gone=true;Music.sfx('key');S.xp+=20;save();hud();
   const n=fragCount();say([['sys',`비밀 열쇠 조각을 찾았다! (${n}/3)`]].concat(n>=3?(sc.done||[]):[]),()=>{if(n>=3)Music.sfx('door')});return}
  case 'chest':{if(e.open){say([['sys','빈 상자다.']]);return}e.open=true;flagArr('chests').push(e.id);const msgs=giveReward(CHESTS[st][e.id]);say([['sys','상자를 열었다! '+msgs.join(' · ')]]);return}
  case 'mob':if(!S.talked){say([['sys',`${josa(sc.npcName,'이/가')} 부르고 있다. 이야기부터 듣고 오자.`]]);return}startBattle({kind:'mob',types:e.types,ent:e});return;
  case 'guard':startBattle({kind:'guard',types:['guard','guard'],ent:e});return;
  case 'friend':{
   if(!penSolved(e.id)){say([['sys','「틀」 우리에 갇혀 있다. 앞마당의 반짝이는 꽃자리에 바위를 전부 올리면 문이 열린다.']]);return}
   const [name,text]=sc.friends[e.id];
   say([[`friend${e.id}`,text,name]],()=>{flagArr('freed').push(e.id);e.gone=true;const msgs=giveReward(FRIEND_GIFTS[e.id]);S.xp+=40;log(`${name} 구출! ${msgs.join(' · ')}`,'gold');
    if(freedCount()>=3)say(sc.done);save();hud()});return}
  case 'sign':{
   if(penSolved(e.id)){say([['sys','이미 열린 우리다. 꽃자리의 바위는 그대로 두자.']]);return}
   say([['sys','팻말: 「바위가 꼬였나요? 처음 자리로 돌려놓을게요.」']],()=>{S.flags.bpos[e.id]=LAYOUT[2].pens[e.id].boulders.map(b=>b.slice());refreshEnts();if(boulderPos(e.id).some(b=>b[0]===pl.x&&b[1]===pl.y)){const n=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>[e.x+dx,e.y+dy]).find(([x,y])=>walkable(x,y));if(n){pl.x=n[0];pl.y=n[1];pl.fx=pl.x;pl.fy=pl.y}}Music.sfx('push');save()});return}
  case 'boulder':say([['sys','커다란 바위다. 반대쪽에서 걸어가면 밀 수 있다.']]);return;
  case 'bell':ringBell(e);return;
  case 'shadow':if(!S.talked){say([['sys','그림자가 웅크리고 있다… 도사님 이야기부터 듣자.']]);return}startBattle({kind:'shadow',id:e.id,ent:e});return;
  case 'stele':
   if(!S.talked||!missionDone()){say([['sys','비석에 희미한 글씨가 새겨져 있다… 아직 읽을 수 없다. 이 고을의 임무를 먼저 끝내자.']]);return}
   if(S.shrine){say([['sys',`「${STELE_TITLE[st]}」 — ${stages[st].qs[2][3]}`]]);return}
   S.shrine=true;S.items.potion++;partyIdx().forEach(i=>S.hp[i]=Math.min(maxHp(i),S.hp[i]+40));S.xp+=40;Music.sfx('chime');save();hud();
   say([['sys',`수호 비석 · ${stages[st].power}의 가르침\n「${STELE_TITLE[st]}」`],['sys',stages[st].qs[2][3]],['sys',`비석에 빛이 깃들었다! (회복약 +1 · 체력 +40) 깃발 수련터에서 「외줄 수련 · ${TRIAL.names[st]}」을 통과하면 ${ENEMY_NAMES[st].boss}의 결계가 풀린다!`]]);return;
  case 'trial':
   if(S.trial){say([['sys','이미 통과한 수련터다.']]);return}
   if(!S.shrine){say([['sys','외줄 수련터다. 아직 문이 닫혀 있다. 비석을 먼저 조사하자.']]);return}
   startTrial();return;
  case 'boss':
   if(!S.shrine){say([['sys','보라색 봉인 결계가 길을 막고 있다. 이 고을의 임무와 비석부터!']]);return}
   if(!S.trial){say([['sys','결계가 아직 남아 있다! 깃발 수련터에서 외줄 수련을 통과하면 완전히 풀린다.']]);return}
   startBattle({kind:'boss',ent:e});return;
  case 'gate':
   if(!S.boss){say([['sys',st===4?'평등의 문은 대마왕을 물리쳐야 열린다.':'성문이 굳게 닫혀 있다. 이 고을의 보스를 먼저 물리치자.']]);return}
   Music.sfx('door');
   if(st===4){S.finished=true;save();hud();ending();return}
   fadeTo(()=>{S.stage++;stageReset();pl.x=S.x;pl.y=S.y;pl.dir='down';healAll();loadStage();save();chapterCard();Music.play('field')});return;
 }
}
function ringBell(e){
 const rung=flagArr('bells');
 if(rung.length>=3){say([['sys',`${BELL_NAMES[e.id]}이 은은하게 울린다. 사당 문은 이미 열렸다.`]]);return}
 if(rung.includes(e.id)){say([['sys','이미 울린 종이다. 다음 종을 찾자.']]);return}
 if(BELL_ORDER[rung.length]===e.id){rung.push(e.id);Music.sfx('bell');S.xp+=20;save();hud();
  say([['sys',`댕—! ${BELL_NAMES[e.id]}이 울렸다. (${rung.length}/3)`]].concat(rung.length>=3?STORY[3].done:[]),()=>{if(rung.length>=3)Music.sfx('door')})}
 else{S.flags.bells=[];Music.sfx('bellbad');save();hud();say([['sys',`종소리가 어긋났다… 처음부터 다시! (순서: ${BELL_ORDER.map(i=>BELL_NAMES[i]).join(' → ')})`]])}
}
function face(e){const dx=e.x-pl.x,dy=e.y-pl.y;if(Math.abs(dx)>Math.abs(dy))pl.dir=dx>0?'right':'left';else if(dy)pl.dir=dy>0?'down':'up'}
function chapterCard(){const c=$('#chapter');$('#chapNo').textContent=`제 ${S.stage+1} 장`;$('#chapName').textContent=stages[S.stage].name;$('#chapDesc').textContent=['칭찬 편지를 모아라!','어둠의 미로에서 열쇠를 찾아라!','바위를 밀어 친구를 구하라!','들키지 말고 종을 울려라!','그림자 장수를 물리쳐라!'][S.stage];c.hidden=true;void c.offsetWidth;c.hidden=false;clearTimeout(chapterCard.t);chapterCard.t=setTimeout(()=>c.hidden=true,2700);log(`제${S.stage+1}장 · ${stages[S.stage].name}에 도착했다.`,'gold')}
function fadeTo(mid){trans={t0:performance.now(),dur:700,kind:'fade',mid,done:false}}

// ================= 필드 이동 =================
const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function tryStep(dir){
 pl.dir=dir;const [dx,dy]=DIRS[dir];const nx=pl.x+dx,ny=pl.y+dy;
 const e=entAt(nx,ny);
 if(e&&e.kind==='boulder'){ // 바위 밀기
  const bx=nx+dx,by=ny+dy;
  if(tileSolid(bx,by)||entAt(bx,by)||grid[by][bx]==='D'){if(now-lastBump>250){Music.sfx('bump');lastBump=now}return false}
  const bp=boulderPos(e.pen);bp[e.j]=[bx,by];e.x=bx;e.y=by;Music.sfx('push');
  const was=flagArr('solvedPens');
  if(penSolved(e.pen)&&!was.includes(e.pen)){was.push(e.pen);Music.sfx('door');log('꽃자리에 바위가 모두 올라갔다! 우리 문이 열렸다.','gold');floaters.push({x:LAYOUT[2].pens[e.pen].door[0]*T+8,y:LAYOUT[2].pens[e.pen].door[1]*T,text:'철컥!',color:'#ffd75e',t0:performance.now()})}
  save();
 } else if(e){path=[];if((e.kind==='mob'&&performance.now()>cooldown)||(e.kind==='gate'&&S.boss)||e.kind==='letter'||e.kind==='frag')interact(e);else if(now-lastBump>250){Music.sfx('bump');lastBump=now}return false}
 if(!walkable(nx,ny)){if(now-lastBump>250){Music.sfx('bump');lastBump=now}return false}
 let px=pl.x,py=pl.y;for(const f of followers){const ox=f.x,oy=f.y;f.fx=f.x;f.fy=f.y;f.x=px;f.y=py;px=ox;py=oy}
 pl.fx=pl.x;pl.fy=pl.y;pl.x=nx;pl.y=ny;pl.t=0;pl.step++;
 reveal();
 if(pl.step%8===0)save();
 return true;
}
function updateField(dt){
 if(pl.t<1){pl.t=Math.min(1,pl.t+dt/STEP_MS);if(pl.t<1)return}
 const k=keys;let dir=k.ArrowUp||k.w||k.W?'up':k.ArrowDown||k.s||k.S?'down':k.ArrowLeft||k.a||k.A?'left':k.ArrowRight||k.d||k.D?'right':null;
 if(!dir&&tapDir)dir=tapDir;tapDir=null;
 if(dir){path=[];pendingTarget=null;tryStep(dir);return}
 if(path.length){const [nx,ny]=path.shift();const d=nx>pl.x?'right':nx<pl.x?'left':ny>pl.y?'down':'up';if(!tryStep(d)){path=[]}
  if(!path.length&&pendingTarget&&mode==='field'){const t=pendingTarget;pendingTarget=null;if(Math.abs(t.x-pl.x)+Math.abs(t.y-pl.y)===1)interact(t)}}
}
function updateMobs(t,dt){
 for(const m of ENTS){
  if(m.gone)continue;
  if(m.kind==='mob'){
   if(t<m.next)continue;m.next=t+700+Math.random()*900;
   const opts=[[0,1],[1,0],[0,-1],[-1,0]].map(([dx,dy])=>[m.x+dx,m.y+dy]).filter(([x,y])=>Math.abs(x-m.hx)<=2&&Math.abs(y-m.hy)<=2&&walkable(x,y,true)&&grid[y][x]!=='D'&&!entAt(x,y)&&!followers.some(f=>f.x===x&&f.y===y));
   if(!opts.length)continue;const [x,y]=opts[(Math.random()*opts.length)|0];
   if(x===pl.x&&y===pl.y){if(S.talked&&t>cooldown&&mode==='field'&&pl.t>=1){Music.sfx('encounter');interact(m)}continue}
   m.fx=m.x;m.fy=m.y;m.x=x;m.y=y;m.t=0;
  }
  if(m.kind==='guard'){
   if(t>=m.next){m.next=t+620;
    const [a,b]=m.route;const tgt=m.dirSign>0?b:a;
    if(m.x===tgt[0]&&m.y===tgt[1]){m.dirSign*=-1;const t2=m.dirSign>0?b:a;m.face=t2[0]>m.x?'right':t2[0]<m.x?'left':t2[1]>m.y?'down':'up'}
    else{const sx=Math.sign(tgt[0]-m.x),sy=Math.sign(tgt[1]-m.y);const nx=m.x+sx,ny=m.y+sy;m.face=sx>0?'right':sx<0?'left':sy>0?'down':'up';
     if(!(nx===pl.x&&ny===pl.y)&&!entAt(nx,ny)){m.fx=m.x;m.fy=m.y;m.x=nx;m.y=ny;m.t=0}}
   }
   if(S.talked&&t>cooldown&&mode==='field'&&!trans&&guardSees(m)){alertT=t;Music.sfx('alarm');floaters.push({x:m.x*T+8,y:m.y*T-10,text:'!',color:'#ff4a3a',big:true,t0:t});log('들켰다! 침묵 감시꾼과 싸움이 벌어진다!','red');interact(m);return}
  }
 }
}
function visionTiles(m){
 const [dx,dy]=DIRS[m.face],out=[];
 for(let k=1;k<=3;k++){const x=m.x+dx*k,y=m.y+dy*k;if(tileSolid(x,y))break;out.push([x,y]);const e=entAt(x,y);if(e&&e!==m&&e.kind!=='guard')break}
 return out;
}
function guardSees(m){
 const hidden=grid[pl.y][pl.x]===',';
 const d=Math.abs(m.x-pl.x)+Math.abs(m.y-pl.y);
 if(d===1&&pl.t>=1)return true;
 if(hidden)return false;
 return visionTiles(m).some(([x,y])=>x===pl.x&&y===pl.y);
}

// ================= 필드 그리기 =================
function lerp(a,b,t){return a+(b-a)*t}
function drawField(t){
 ctx.drawImage(mapImg,0,0);
 const st=S.stage,th=THEMES[st];
 // 물결
 ctx.fillStyle=th.waterL;
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){if(grid[y][x]!=='~')continue;if(hash(x,y,3)<.5){const o=((t/120+y*5+x*3)|0)%14;ctx.fillRect(x*T+o,y*T+((y*7+x)%13),3,1)}}
 // 문
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(grid[y][x]==='D')drawDoor(x*T,y*T,doorOpenAt(x,y),st);
 // 꽃자리(3장)
 if(st===2)LAYOUT[2].pens.forEach((pen,i)=>pen.plates.forEach(p=>{const X=p[0]*T,Y=p[1]*T;const on=boulderPos(i).some(b=>b[0]===p[0]&&b[1]===p[1]);ctx.fillStyle=on?'#ffd75e':`rgba(255,240,120,${.45+Math.sin(t/200)*.25})`;ctx.fillRect(X+2,Y+2,12,12);ctx.fillStyle='#ff6aa0';ctx.fillRect(X+6,Y+3,4,10);ctx.fillRect(X+3,Y+6,10,4);ctx.fillStyle='#fff6c0';ctx.fillRect(X+7,Y+7,2,2)}));
 // 감시꾼 시야
 if(st===3)for(const m of ENTS)if(m.kind==='guard'&&!m.gone){ctx.fillStyle=t-alertT<800?'rgba(255,80,60,.35)':'rgba(255,230,80,.28)';for(const [x,y] of visionTiles(m))ctx.fillRect(x*T+1,y*T+1,T-2,T-2)}
 const list=[];
 for(const e of ENTS){if(e.gone)continue;list.push({y:(e.kind==='mob'||e.kind==='guard')?e.y:e.y,draw:()=>drawEnt(e,t)})}
 const pt=pl.t;
 for(const f of followers){const X=lerp(f.fx,f.x,pt)*T+8,Y=lerp(f.fy,f.y,pt)*T+16;const dir=f.x>f.fx?'right':f.x<f.fx?'left':f.y<f.fy?'up':'down';list.push({y:f.y-.01,draw:()=>drawWalker(MEMBERS[f.i].key,dir,X,Y,pt<1?pl.step:0)})}
 const PX=lerp(pl.fx,pl.x,pt)*T+8,PY=lerp(pl.fy,pl.y,pt)*T+16;
 list.push({y:pl.y+.01,draw:()=>{drawWalker('baram',pl.dir,PX,PY,pt<1?pl.step:0);if(st===3&&grid[pl.y][pl.x]===','&&pt>=1){ctx.fillStyle='rgba(60,90,50,.75)';ctx.fillRect(PX-7,PY-7,14,7)}}});
 list.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
 // 안개(미로)
 if(explored){const r=visionR();for(let y=0;y<H;y++)for(let x=0;x<W;x++){const d=Math.hypot(x-lerp(pl.fx,pl.x,pt),y-lerp(pl.fy,pl.y,pt));if(d<=r-.6)continue;const seen=explored[y*W+x];ctx.fillStyle=seen?`rgba(5,12,8,${Math.min(.62,(d-r+.6)*.5+.35)})`:'#050c08';ctx.fillRect(x*T,y*T,T,T)}}
 // 목표 표시
 const goal=currentGoal();if(goal&&(!explored||explored[goal.y*W+goal.x])){const bob=Math.sin(t/180)*2;const X=goal.x*T+8,Y=goal.y*T-(goal.kind==='gate'?26:goal.kind==='boss'?22:6)+bob;ctx.fillStyle='#2a1a0a';ctx.fillRect(X-4,Y-6,9,5);ctx.fillRect(X-2,Y-1,5,2);ctx.fillStyle='#ffd75e';ctx.fillRect(X-3,Y-5,7,3);ctx.fillRect(X-1,Y-2,3,2)}
}
function currentGoal(){
 if(S.finished)return null;
 if(!S.talked)return ENT('npc');
 if(!missionDone()){
  if(S.stage===0)return lettersGot()>=5?ENT('npc'):null;
  if(S.stage===3){const want=BELL_ORDER[flagArr('bells').length];return ENTS.find(e=>e.kind==='bell'&&e.id===want)}
  return null;
 }
 if(!S.shrine)return ENT('stele');if(!S.trial)return ENT('trial');if(!S.boss)return ENT('boss');return ENT('gate');
}
function drawWalker(key,dir,X,Y,step){const pose=dir==='up'?'back':dir==='down'?'front':'side';const frame=step%2;Sprites.draw(ctx,key,pose,X,Y+1-(step?frame:0),1,{frame,flip:dir==='right'})}
function drawDoor(X,Y,open,st){
 if(open){ctx.fillStyle=st===4?'#b8282a':'#a8743a';ctx.fillRect(X,Y,T,T);ctx.fillStyle='rgba(255,240,170,.35)';ctx.fillRect(X+2,Y+2,12,12);return}
 ctx.fillStyle='#2a1a0a';ctx.fillRect(X,Y,T,T);ctx.fillStyle=st===2?'#c84a8a':'#7a4a1a';ctx.fillRect(X+1,Y+1,14,14);ctx.fillStyle='#4a2a0a';ctx.fillRect(X+7,Y+1,2,14);ctx.fillStyle='#ffd75e';ctx.fillRect(X+5,Y+7,6,4);ctx.fillStyle='#2a1a0a';ctx.fillRect(X+7,Y+8,2,2)
}
function drawEnt(e,t){
 const X=e.x*T+8,Y=e.y*T+16,st=S.stage;
 if(explored&&!explored[e.y*W+e.x])return;
 if(explored&&(e.kind==='mob')&&Math.hypot(e.x-pl.x,e.y-pl.y)>visionR())return;
 switch(e.kind){
  case 'npc':{const k=st===1&&!S.talked?'bomi':st===2&&!S.talked?'gomdol':(st===1||st===2)?'fire':'master';if(k==='fire')drawFire(X,Y,t);else Sprites.draw(ctx,k,'front',X,Y+1+(((t/600)|0)%2),1,{});
   if(!S.talked){const b=((t/300)|0)%2;ctx.fillStyle='#fff';ctx.fillRect(X+6,Y-22-b,6,7);ctx.fillStyle='#d8382a';ctx.fillRect(X+8,Y-21-b,2,3);ctx.fillRect(X+8,Y-17-b,2,1)}break}
  case 'shop':Sprites.draw(ctx,'cat','front',X,Y+1,1,{});ctx.fillStyle='#ffd75e';ctx.fillRect(X+5,Y-4,4,4);break;
  case 'villager':Sprites.draw(ctx,e.id%2?'villager2':'villager','front',X,Y+1,1,{});break;
  case 'letter':{const b=Math.sin(t/200+e.id)*1.5;ctx.fillStyle='rgba(255,200,220,.4)';ctx.beginPath();ctx.arc(X,Y-7,7,0,7);ctx.fill();ctx.fillStyle='#2a1a0a';ctx.fillRect(X-6,Y-12+b,12,9);ctx.fillStyle='#fff6e0';ctx.fillRect(X-5,Y-11+b,10,7);ctx.fillStyle='#ff5a8a';ctx.fillRect(X-1,Y-9+b,3,3);ctx.fillRect(X-2,Y-8+b,1,1);ctx.fillRect(X+2,Y-8+b,1,1);break}
  case 'frag':{const b=Math.sin(t/200+e.id)*1.5;ctx.fillStyle='rgba(255,215,94,.4)';ctx.beginPath();ctx.arc(X,Y-7,8,0,7);ctx.fill();ctx.fillStyle='#ffd75e';ctx.fillRect(X-5,Y-11+b,5,5);ctx.fillRect(X,Y-9+b,6,2);ctx.fillRect(X+3,Y-9+b,2,4);ctx.fillStyle='#8a5a10';ctx.fillRect(X-4,Y-10+b,2,2);break}
  case 'chest':{ctx.fillStyle='#2a1a0a';ctx.fillRect(X-7,Y-12,14,11);ctx.fillStyle=e.open?'#6a4a2a':'#a8642a';ctx.fillRect(X-6,Y-11,12,9);ctx.fillStyle='#ffd75e';ctx.fillRect(X-6,Y-8,12,2);if(!e.open){ctx.fillRect(X-1,Y-9,2,4)}else{ctx.fillStyle='#1a0a05';ctx.fillRect(X-5,Y-11,10,3)}break}
  case 'mob':{const mX=lerp(e.fx,e.x,e.t)*T+8,mY=lerp(e.fy,e.y,e.t)*T+16;const bob=Math.sin(t/200+e.hx)*1;Sprites.draw(ctx,e.types[0],'front',mX,mY+1+bob,1,{stage:st});if(e.types.length>1){ctx.fillStyle='#1a0a05';ctx.fillRect(mX+4,mY-20,11,8);ctx.fillStyle='#ff6b5b';ctx.font='8px NeoDunggeunmo, monospace';ctx.textAlign='left';ctx.fillText('×'+e.types.length,mX+5,mY-13)}break}
  case 'guard':{const mX=lerp(e.fx,e.x,e.t)*T+8,mY=lerp(e.fy,e.y,e.t)*T+16;Sprites.draw(ctx,'guard','front',mX,mY+1,1,{stage:st});const [dx,dy]=DIRS[e.face];ctx.fillStyle='#ffe06a';ctx.fillRect(mX+dx*7-1,mY-9+dy*7,3,3);break}
  case 'friend':Sprites.draw(ctx,'friend'+e.id,'front',X,Y+1,1,{});if(!penSolved(e.id)){ctx.fillStyle='rgba(40,20,40,.7)';for(let i=-6;i<=6;i+=4)ctx.fillRect(X+i,Y-18,1,18)}break;
  case 'sign':ctx.fillStyle='#4a2a10';ctx.fillRect(X-1,Y-8,2,8);ctx.fillStyle='#c89a5a';ctx.fillRect(X-6,Y-14,12,7);ctx.fillStyle='#4a2a10';ctx.fillRect(X-4,Y-12,8,1);ctx.fillRect(X-4,Y-10,6,1);break;
  case 'boulder':{const on=LAYOUT[2].pens[e.pen].plates.some(p=>p[0]===e.x&&p[1]===e.y);ctx.fillStyle='#2a2a2a';ctx.beginPath();ctx.arc(X,Y-7,8,0,7);ctx.fill();ctx.fillStyle=on?'#b8a87a':'#8a8a92';ctx.beginPath();ctx.arc(X,Y-7,7,0,7);ctx.fill();ctx.fillStyle='#c8c8d0';ctx.fillRect(X-4,Y-11,4,3);ctx.fillStyle='#5a5a62';ctx.fillRect(X+1,Y-5,4,2);ctx.fillStyle='#3a2a2a';ctx.font='7px NeoDunggeunmo, monospace';ctx.textAlign='center';ctx.fillText('틀',X,Y-5);break}
  case 'bell':{const rung=flagArr('bells').includes(e.id);ctx.fillStyle='#3a2a1a';ctx.fillRect(X-8,Y-18,16,2);ctx.fillRect(X-8,Y-18,2,18);ctx.fillRect(X+6,Y-18,2,18);const sw=rung?Math.sin(t/150)*1.5:0;ctx.fillStyle=rung?'#ffd75e':'#c8a040';ctx.fillRect(X-4+sw,Y-15,8,9);ctx.fillRect(X-5+sw,Y-8,10,2);ctx.fillStyle='#7a5a10';ctx.fillRect(X-1+sw,Y-6,2,2);ctx.fillStyle='#fff';ctx.font='7px NeoDunggeunmo, monospace';ctx.textAlign='center';ctx.fillText(BELL_NAMES[e.id][0],X,Y+5);break}
  case 'shadow':{Sprites.draw(ctx,'shadow','front',X,Y+2,1.3,{alpha:.85+Math.sin(t/300)*.1});ctx.fillStyle='rgba(120,90,200,.25)';ctx.beginPath();ctx.arc(X,Y-11,13,0,7);ctx.fill();break}
  case 'stele':drawStele(X,Y,t);break;
  case 'trial':drawTrialPost(X,Y,t);break;
  case 'boss':{Sprites.draw(ctx,'boss','front',X,Y+2,1.4,{stage:st});if(!S.trial){ctx.strokeStyle=`rgba(190,110,255,${.5+Math.sin(t/150)*.3})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(X,Y-10,14,15,0,0,Math.PI*2);ctx.stroke()}break}
  case 'gate':drawGate(X,Y,t);break;
 }
}
function drawFire(X,Y,t){const f=((t/120)|0)%3;ctx.fillStyle='#5a3a1a';ctx.fillRect(X-6,Y-3,12,3);ctx.fillStyle='#e8481a';ctx.fillRect(X-4,Y-9-f,8,6+f);ctx.fillStyle='#ffd75e';ctx.fillRect(X-2,Y-7-f%2,4,4);ctx.fillStyle='#fff6c0';ctx.fillRect(X-1,Y-5,2,2)}
function drawStele(X,Y,t){
 const ready=S.talked&&missionDone();
 if(ready||S.shrine){ctx.fillStyle=S.shrine?`rgba(255,215,94,${.25+Math.sin(t/300)*.1})`:`rgba(150,220,255,${.3+Math.sin(t/150)*.2})`;ctx.beginPath();ctx.arc(X,Y-10,13,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#2a2a32';ctx.fillRect(X-6,Y-21,12,20);ctx.fillStyle='#8a8f9a';ctx.fillRect(X-5,Y-20,10,18);ctx.fillStyle='#b8bcc6';ctx.fillRect(X-5,Y-20,10,2);
 ctx.fillStyle=S.shrine?'#ffd75e':'#5a5f6a';for(let i=0;i<4;i++)ctx.fillRect(X-3,Y-16+i*3,6,1);
 ctx.fillStyle='#5a4a3a';ctx.fillRect(X-8,Y-3,16,3);
}
function drawGate(X,Y,t){
 const open=S.boss;
 ctx.fillStyle='#1a0a0a';ctx.fillRect(X-13,Y-26,3,26);ctx.fillRect(X+10,Y-26,3,26);
 ctx.fillStyle='#c8302a';ctx.fillRect(X-12,Y-25,2,25);ctx.fillRect(X+10,Y-25,2,25);
 ctx.fillStyle=open?`rgba(255,240,170,${.6+Math.sin(t/200)*.3})`:'#6a3a1a';ctx.fillRect(X-10,Y-22,20,22);
 if(!open){ctx.fillStyle='#4a2a10';ctx.fillRect(X,Y-22,1,22);ctx.fillStyle='#ffd75e';ctx.fillRect(X-3,Y-12,2,2);ctx.fillRect(X+2,Y-12,2,2)}
 ctx.fillStyle='#1a1a2a';ctx.fillRect(X-17,Y-31,34,5);ctx.fillRect(X-19,Y-33,4,3);ctx.fillRect(X+15,Y-33,4,3);
 ctx.fillStyle='#2a6a5a';ctx.fillRect(X-16,Y-30,32,3);ctx.fillStyle='#ffd75e';ctx.fillRect(X-5,Y-27,10,3);
}

// ================= 전환 효과 =================
function drawTrans(t){
 if(!trans)return;const k=(t-trans.t0)/trans.dur;
 if(k>=.5&&!trans.done){trans.done=true;try{trans.mid&&trans.mid()}catch(err){console.error(err)}}
 if(k>=1){trans=null;return}
 const v=k<.5?k*2:2-k*2;
 if(trans.kind==='swirl'){ctx.fillStyle='#000';const n=12;for(let i=0;i<n;i++){const h=320/n;ctx.fillRect(i%2?480*(1-v):0,i*h,480*v,h)}if(k<.5){ctx.fillStyle=`rgba(255,255,255,${Math.max(0,.6-k*2)})`;ctx.fillRect(0,0,480,320)}}
 else{ctx.fillStyle=`rgba(0,0,0,${v})`;ctx.fillRect(0,0,480,320)}
}
function drawFloaters(t){
 floaters=floaters.filter(f=>{const k=(t-f.t0)/900;if(k>1)return false;ctx.save();ctx.globalAlpha=1-k*k;ctx.font=(f.big?'bold 24px':'16px')+' NeoDunggeunmo, monospace';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#1a0a05';const y=f.y-Math.sin(Math.min(k*3,1)*Math.PI/2)*14;ctx.strokeText(f.text,f.x,y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,y);ctx.restore();return true});
}

// ================= 안전장치 + 메인 루프 =================
let last=performance.now();
function guard(t){
 if(mode==='title')return;
 const dlg=$('#dialog'),bui=$('#battleui');
 if(mode==='dialog'&&!dialog)mode='field';
 if(dialog&&mode==='field'&&!trans)mode='dialog';
 if(!dialog&&!dlg.hidden)dlg.hidden=true;
 if(dialog&&dlg.hidden)dlg.hidden=false;
 if(mode==='menu'&&!MENU)mode='field';
 if(!MENU&&!$('#menuui').hidden)$('#menuui').hidden=true;
 if(MENU&&mode!=='menu'){MENU=null;$('#menuui').hidden=true}
 if(mode!=='battle'&&!B&&!trans&&!bui.hidden){bui.hidden=true}
 if(mode==='battle'&&!B&&!trans){mode='field';bui.hidden=true;cooldown=t+1500}
 if(mode==='battle'&&B&&!trans)battleGuard(t);
 if(mode==='trial'&&!TR&&!trans){mode='field';$('#trialui').hidden=true}
 if(mode!=='trial'&&TR&&!trans){TR=null;$('#trialui').hidden=true}
 if(mode!=='trial'&&!TR&&!$('#trialui').hidden)$('#trialui').hidden=true;
 if(TR&&TR.menu&&$('#trialui').hidden)$('#trialui').hidden=false;
 if(mode==='field'&&pl.t>=1&&grid&&tileSolid(pl.x,pl.y)){const s=startOf(S.stage);pl.x=s[0];pl.y=s[1];pl.fx=pl.x;pl.fy=pl.y}
}
function frame(t){
 requestAnimationFrame(frame);
 try{
  const dt=Math.min(50,t-last);last=t;now=t;
  guard(t);
  if(mode==='field'&&!trans&&!$('#modal').open){updateField(dt);updateMobs(t,dt)}
  if(mode==='field'||mode==='dialog'||mode==='menu'){for(const m of ENTS)if((m.kind==='mob'||m.kind==='guard')&&m.t<1)m.t=Math.min(1,m.t+dt/260)}
  if(mode==='dialog'){updateDialog();if(pl.t<1)pl.t=Math.min(1,pl.t+dt/STEP_MS)}
  if(mode==='battle'&&B)updateBattle(t,dt);
  if(mode==='trial'&&TR&&!trans&&!$('#modal').open)trialUpdate(dt/1000);
  ctx.save();
  try{
   if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.85;if(shake<.4)shake=0}
   if(mode==='trial'&&TR&&TR.shown)drawTrial(t);
   else if(mode==='battle'&&B&&B.shown)drawBattle(t);
   else if(grid)drawField(t);
   drawFloaters(t);
  }finally{ctx.restore()}
  drawTrans(t);
 }catch(err){console.error(err)}
}

// ================= 입력 =================
function act(){
 if($('#modal').open)return;
 if(mode==='dialog'){dialogAdvance();return}
 if(mode==='menu'){menuKey(' ');return}
 if(mode==='battle'){battleKey(' ');return}
 if(mode==='trial'){if(!trans||(TR&&TR.menu))trialKey(' ');return}
 if(mode!=='field'||trans)return;
 const [dx,dy]=DIRS[pl.dir];const e=entAt(pl.x+dx,pl.y+dy)||[[0,1],[1,0],[0,-1],[-1,0]].map(([a,b])=>entAt(pl.x+a,pl.y+b)).find(Boolean);
 if(e)interact(e);else log('주변에 조사할 것이 없다.');
}
const DIRKEY={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
addEventListener('keydown',ev=>{
 if($('#modal').open||['TEXTAREA','INPUT','SELECT'].includes(ev.target.tagName))return;
 if(mode==='title'){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();$('#play').click()}return}
 const k=ev.key;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(k))ev.preventDefault();
 if(mode==='trial'){if(trans&&!(TR&&TR.menu))return;if(/^(Arrow(Up|Down|Left|Right)|[wasdWASD])$/.test(k))keys[k]=true;if(!ev.repeat)trialKey(k);return}
 if(mode==='battle'){if(!ev.repeat||/^Arrow/.test(k))battleKey(k);return}
 if(mode==='menu'){if(!ev.repeat)menuKey(k);return}
 if(k===' '||k==='Enter'){if(!ev.repeat)act();return}
 if(mode==='dialog')return;
 if(k==='1'){potion();return}
 if(k==='j'||k==='J'){journal();return}
 if(k==='i'||k==='I'){openBag();return}
 if(k==='m'||k==='M'){toggleSound();return}
 keys[k]=true;
 const td=DIRKEY[k];if(td&&!ev.repeat&&mode==='field'){tapDir=td;if(pl.t>=1)pl.dir=td}
});
addEventListener('keyup',ev=>{delete keys[ev.key]});
addEventListener('blur',()=>{keys={};if(TR&&TR.phase==='run'&&mode==='trial')trialPause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&TR&&TR.phase==='run'&&mode==='trial')trialPause()});
const trialRelease=()=>{if(TR)TR.touch=0};
cv.addEventListener('pointerup',trialRelease);cv.addEventListener('pointercancel',trialRelease);cv.addEventListener('pointerleave',trialRelease);
cv.addEventListener('pointerdown',ev=>{
 const r=cv.getBoundingClientRect();
 if(mode==='trial'){if(!TR||trans||TR.menu||TR.phase!=='run')return;const fx=(ev.clientX-r.left)/r.width;if(fx<.38)TR.touch=-1;else if(fx>.62)TR.touch=1;else trialJump();try{cv.setPointerCapture(ev.pointerId)}catch{}return}
 if(mode==='battle'){battlePointer((ev.clientX-r.left)/r.width*480,(ev.clientY-r.top)/r.height*320);return}
 if(mode==='dialog'){dialogAdvance();return}
 if(mode!=='field'||trans)return;
 const x=Math.floor((ev.clientX-r.left)/r.width*W),y=Math.floor((ev.clientY-r.top)/r.height*H);
 const e=entAt(x,y);
 if(e&&e.kind!=='boulder'){if(Math.abs(e.x-pl.x)+Math.abs(e.y-pl.y)===1){interact(e);return}const p=bfs([pl.x,pl.y],[e.x,e.y],true);if(p){path=p;pendingTarget=e}return}
 if(!walkable(x,y))return;const p=bfs([pl.x,pl.y],[x,y]);if(p){path=p;pendingTarget=null}
});
$('#dialog').addEventListener('click',dialogAdvance);
document.querySelectorAll('[data-move]').forEach(b=>{
 const [dx,dy]=b.dataset.move.split(',').map(Number);const k=dx>0?'ArrowRight':dx<0?'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';
 const down=e=>{e.preventDefault();if(mode==='battle'){battleKey(k);return}if(mode==='menu'){menuKey(k);return}if(mode==='trial'&&TR&&TR.menu){trialKey(k);return}keys[k]=true;if(mode==='field'){tapDir=DIRKEY[k];if(pl.t>=1)pl.dir=tapDir}};const up=()=>delete keys[k];
 b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);
});
$('#abtn').addEventListener('click',act);
$('#act').onclick=act;

// ================= 메뉴 버튼 =================
function potion(){
 if(mode!=='field')return;
 if(S.items.potion<=0){log('회복약이 없다. 냥냥 상인에게 사거나 NPC에게 가면 무료로 회복할 수 있다.','red');return}
 if(partyIdx().every(i=>S.hp[i]>=maxHp(i))){log('일행의 체력이 이미 가득 차 있다.');return}
 S.items.potion--;partyIdx().forEach(i=>S.hp[i]=Math.min(maxHp(i),S.hp[i]+60));Music.sfx('heal');save();hud();log('회복약 사용! 일행 체력 +60','gold');
}
$('#potion').onclick=potion;$('#bag').onclick=openBag;
function badges(){return stages.map((s,i)=>`<span class="${i<S.stage||(i===S.stage&&S.boss)?'on':''}">${s.power}</span>`).join('')}
function journal(){
 if(S.finished){ending();return}
 const learned=stages.slice(0,S.stage+(S.shrine?1:0)).map((s,i)=>`<p><b style="color:#ffd75e">${s.name} · ${STELE_TITLE[i]}</b><br>${s.qs[2][3]}</p>`).join('')||'<p class="muted">비석을 조사하면 배운 내용이 기록됩니다.</p>';
 openModal(`<h2>바람의 수련 수첩</h2><p>현재: 제${S.stage+1}장 ${stages[S.stage].name}<br>레벨 ${level()} · 경험치 ${S.xp} · ${S.coins}냥 · 물리친 요괴 ${S.defeated}마리<br>정답 필살기 ${S.right}회 · 오답 ${S.wrong}회</p><div class="badgegrid">${badges()}</div><h2 style="font-size:17px">외줄 수련 기록</h2><p>${TRIAL.names.map((n,i)=>{const r=(S.trialRec||[])[i];return `${n}: ${r?(r.helped?'도사님 도움으로 통과':`통과 · 구슬 ${r.orbs}개 · 떨어짐 ${r.lost}번`):(i===S.stage&&S.trial?'통과':'—')}`}).join('<br>')}</p><h2 style="font-size:17px">비석에서 배운 것</h2>${learned}`);
}
$('#journal').onclick=journal;
function toggleSound(){S.sound=!S.sound;Music.setEnabled(S.sound);save();hud();if(S.sound)Music.sfx('ok')}
$('#sound').onclick=toggleSound;
$('#help').onclick=()=>openModal(`<h2>취풍 무협전 안내</h2><p><b>이동</b> 방향키/WASD · 바닥 클릭·터치<br><b>대화·조사</b> Space/Enter · <b>가방</b> I · <b>회복약</b> 1 · <b>수첩</b> J · <b>소리</b> M</p>
<p><b>장마다 다른 임무</b><br>1장 칭찬 편지 모으기 · 2장 어둠의 미로에서 열쇠 조각 찾기 · 3장 바위 밀기로 친구 구출 · 4장 감시꾼을 피해 종 울리기 · 5장 그림자 장수 물리치기. 임무를 마치면 비석 → 외줄 수련 → 보스 → 성문 순서입니다.</p>
<p><b>전투</b> 차례가 된 동료가 행동합니다. 공격(무기) · 필살기(문제를 맞히면 큰 피해) · 기술(기력 사용) · 도구 · 방어 · 도망. 적은 강공격을 예고하거나 동체시력 게임·주문·힘겨루기를 걸어 옵니다. 타이밍 막기는 Space를 초록 칸에서!</p>
<p><b>보스</b>는 보호막 3겹이 있어 정답 필살기로만 깨집니다. 오답이면 해설이 나오니 다시 도전하세요.</p>
<p class="muted">상자와 친구의 선물로 무기를 얻으면 공격력이 오릅니다. 요괴를 물리치면 냥(돈)이 생겨 냥냥 상인에게 도구를 살 수 있어요.</p>`);
$('#video').onclick=()=>openModal('<h2>학습 영상 · 웰컴 투 디지털 월드</h2><iframe src="https://www.youtube-nocookie.com/embed/kB666Wpu-Ls" title="양성평등 교육 영상" allowfullscreen></iframe><p><a href="https://www.youtube.com/watch?v=kB666Wpu-Ls" target="_blank" rel="noopener">YouTube에서 영상 보기 ↗</a></p>');
$('#reset').onclick=()=>{openModal('<h2>새 원정을 시작할까요?</h2><p>경험치, 무기, 도구, 동료와 진행이 모두 초기화됩니다.</p><button id="keep">기록 유지</button> <button id="new">초기화하고 시작</button>');$('#keep').onclick=closeModal;$('#new').onclick=()=>{
 const snd=S.sound;S=fresh();S.sound=snd;MAZE=MAZE;pl.x=S.x;pl.y=S.y;pl.dir='down';try{localStorage.removeItem(KEY)}catch{}
 closeModal();trans=null;B=null;TR=null;dialog=null;MENU=null;floaters=[];
 $('#battleui').hidden=true;$('#dialog').hidden=true;$('#trialui').hidden=true;$('#menuui').hidden=true;
 if($('#splash'))$('#splash').remove();
 mode='field';loadStage();chapterCard();Music.play('field');save();log('새 원정을 시작했다.','gold');introHint();cv.focus()}};
function introHint(){setTimeout(()=>{if(mode==='field'&&!S.talked&&S.stage===0&&!dialog&&!B&&!trans&&!$('#modal').open)say([['baram','하아암~ 잘 잤다. …응? 사부님이 길 위에서 손짓하고 계시네.'],['sys','방향키(WASD)로 걸어가서 Space로 말을 걸자. 노란 화살표가 목표야!']])},1600)}
function ending(){
 Music.play('ending');
 openModal(`<h2>마지막 장 · 평등의 나라를 되찾다</h2><canvas class="endart" id="endart" width="200" height="56"></canvas><p>다섯 고을의 요괴와 불평등 대마왕을 물리쳤다!<br>바람: "공부로 이기는 무공… 생각보다 멋진데요, 사부님?"<br>허허 도사: "허허, 이제야 알았느냐. 진짜 무공은 일상에서 쓰는 거란다."</p><p>이제 <b style="color:#ffd75e">존중 · 보호 · 자유 · 용기 · 연대</b>의 힘을 현실에서도 펼쳐 보자.</p><div class="badgegrid">${stages.map(s=>`<span class="on">${s.power}</span>`).join('')}</div><p class="muted">레벨 ${level()} · 정답 필살기 ${S.right}회 · 오답 ${S.wrong}회 · 물리친 요괴 ${S.defeated}마리 · 외줄 수련 구슬 ${(S.trialRec||[]).reduce((a,r)=>a+(r&&r.orbs||0),0)}개</p><label for="pledge">나의 실천 약속</label><textarea id="pledge" maxlength="300" placeholder="친구를 놀리는 말에 동조하지 않고…">${S.pledge.replace(/</g,'&lt;')}</textarea><p class="muted">개인정보는 적지 마세요. 이 브라우저에만 저장됩니다.</p><button id="promise">약속 저장 · 원정 기록 내려받기</button>`);
 const c=$('#endart'),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#1a2a6a';g.fillRect(0,0,200,56);g.fillStyle='#ffd75e';for(let i=0;i<30;i++)g.fillRect((i*53)%200,(i*29)%30,1,1);
 g.fillStyle='#3a6a3a';g.fillRect(0,46,200,10);
 [['master',40],['baram',80],['bomi',112],['gomdol',144],['cat',176]].forEach(([k,x])=>{const img=Sprites.get(k,'front',0,0);g.drawImage(img,x-img.width,48-img.height*2,img.width*2,img.height*2)});
 $('#promise').onclick=()=>{S.pledge=$('#pledge').value.trim().slice(0,300);save();const url=URL.createObjectURL(new Blob([`평등의 나라 · 취풍 무협전 원정 기록\n완료: 5개 고을 / 수호 인장 5개\n레벨 ${level()} · 경험치 ${S.xp}\n정답 필살기 ${S.right}회 · 오답 ${S.wrong}회 · 물리친 요괴 ${S.defeated}마리\n외줄 수련: ${TRIAL.names.map((n,i)=>{const r=(S.trialRec||[])[i];return n+(r?(r.helped?'(도움)':`(구슬 ${r.orbs})`):'')}).join(', ')}\n배운 힘: 존중 · 보호 · 자유 · 용기 · 연대\n${typeof teacherReportText==='function'?teacherReportText():''}\n나의 약속: ${S.pledge}`],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='평등의나라_원정기록.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#promise').textContent='약속 저장 완료 · 다시 내려받기'};
}

// ================= 타이틀·시작 =================
function titleArt(){const c=$('#titleart');if(!c)return;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,160,40);
 [['goblin',20,1],['baram',56,0],['bomi',78,0],['gomdol',100,0],['wisp',124,1],['fox',148,1]].forEach(([k,x,e])=>{const img=Sprites.get(k,'front',0,e?S.stage:0);g.drawImage(img,x-img.width,38-img.height*2,img.width*2,img.height*2)})}
$('#play').onclick=()=>{
 $('#splash').remove();mode='field';Music.setEnabled(S.sound);loadStage();
 if(S.finished){Music.play('ending');ending()}else{Music.play('field');chapterCard();if(!S.talked&&S.stage===0&&!S.xp)introHint()}
 cv.focus();
};
document.fonts&&document.fonts.ready.then(titleArt);titleArt();
sanitize();
document.querySelectorAll('nav button,.hotkeys button').forEach(b=>b.addEventListener('click',()=>{if(!$('#modal').open)cv.focus()}));
pl.x=S.x;pl.y=S.y;pl.fx=S.x;pl.fy=S.y;
loadStage();hud();
requestAnimationFrame(frame);
window.__game={get TR(){return TR},startTrial,get keys(){return keys},get dialog(){return dialog},get trans(){return trans},get S(){return S},get mode(){return mode},get B(){return B},get ENTS(){return ENTS},get MENU(){return MENU},pl,interact,startBattle,walkable,bfs,get grid(){return grid},loadStage,refreshEnts,genMaze,penSolved,missionDone,tileSolid,entAt,save,hud};
