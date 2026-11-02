// 외줄 수련 — 장대 위에서 방향키로 균형을 잡으며 장애물을 넘는 미니게임 (장마다 1회, 보스 결계를 푸는 시험)
const TRIAL={
 names:['존중의 장대','비밀의 외나무','자유의 꽃바람 다리','용기의 안개 줄','연대의 마지막 장대'],
 desc:[
  '굴러오는 「놀림 통」은 <b>점프</b>, 끊어진 곳도 <b>점프</b>! 옆에서 날아드는 <b>까마귀</b>는 <b>↓ 웅크리기</b>로 피하라.',
  '좌우로 나는 <b>도깨비불</b>, 기름칠한 <b>미끄러운 구간</b>(방향키가 잘 안 먹힘), 그림자가 생기면 <b>낙석</b>! ↑↓로 속도를 바꿔 피하라.',
  '<b>돌풍</b>에 <b>출렁다리</b>, 보라 안개 속에선 <b>좌우가 반대</b>! 뒤에서는 <b>먹구름</b>이 쫓아온다 — 멈추면 잡힌다!',
  '침묵의 <b>안개</b>에 <b>좁은 장대</b>(더 쉽게 기운다)까지! 먹구름은 더 빨라졌다. 동료들의 응원을 믿어라!',
  '지금까지의 모든 시련이 한꺼번에! 겹쳐 오는 통, 돌풍 속 낙석, 반대 안개 속 까마귀… <b>연대</b>의 힘으로 건너라.'
 ],
 good:[['고마워','괜찮아?','멈춰!','존중해','함께해'],['비밀번호','지켜 줘','신고하기','안전','확인하기'],['좋아해','자유','내 취향','울어도 돼','다 같이'],['도와주세요','용기','말해도 돼','함께 가자','괜찮아'],['존중','보호','자유','용기','연대']],
 bad:[['놀림','조롱','비웃음'],['유포','캐묻기','낚시'],['편견','고정관념','틀'],['협박','침묵','두려움'],['차별','혐오','불평등']],
 len:[2300,2700,3000,3300,3800],
 speed:[80,86,90,94,100],
 drift:[1.2,1.35,1.5,1.6,1.65],
 kinds:[['gap','roller','crow'],['gap','roller','crow','swing','slip','rock'],['gap','roller','swing','gust','reverse','bounce','rock'],['gap','roller','crow','swing','gust','slip','reverse','narrow','rock'],['gap','roller','crow','swing','gust','slip','reverse','bounce','narrow','rock']],
 chaser:[0,0,62,70,80]
};
const AIR=0.62,PY=232,PX=240;
let TR=null;
const pick=a=>a[(Math.random()*a.length)|0];
const rnd=(a,b)=>a+Math.random()*(b-a);
function trialAssist(){const f=S.trialFails||0,dm=teacherTrialMul();return {drift:Math.max(.4,(1-.18*f)*dm.drift),speed:Math.max(.75,(1-.06*f)*dm.speed),hearts:3+Math.min(2,f)+dm.hearts}}
function buildCourse(st,as){
 const L=TRIAL.len[st],ev=[],spd=TRIAL.speed[st]*as.speed;
 const maxGap=Math.min(30+st*4,spd*AIR*.6);
 const kinds=TRIAL.kinds[st];
 let d=360,i=0;
 while(d<L-300){
  const k=i<kinds.length?kinds[i]:pick(kinds);i++;
  if(k==='gap'){const len=rnd(maxGap*.75,maxGap);ev.push({type:'gap',d,len});d+=len}
  else if(k==='roller'){const v=38+st*7;ev.push({type:'roller',d,v,word:pick(TRIAL.bad[st]),r:0});if(st>=4&&Math.random()<.45)ev.push({type:'roller',d:d+46,v,word:pick(TRIAL.bad[st]),r:0})}
  else if(k==='swing'){ev.push({type:'swing',d,amp:rnd(95,128),w:rnd(1.8,2.3)+st*.12,ph:rnd(0,6.28),x:PX})}
  else if(k==='gust'){const len=rnd(170,230);ev.push({type:'gust',d,len,dir:Math.random()<.5?-1:1,pow:Math.min(3.3,2.4+st*.3)});d+=len*(st>=3?.45:1)}
  else if(k==='crow'){ev.push({type:'crow',d,side:Math.random()<.5?-1:1,x:null,word:pick(TRIAL.bad[st])})}
  else if(k==='rock'){ev.push({type:'rock',d,trig:null})}
  else{const len=rnd(170,230);ev.push({type:k,d,len});d+=len*(st>=3?.5:.85)}
  const sp=rnd(150,205)-st*8;
  if(Math.random()<.7)ev.push({type:'orb',d:d+sp/2,word:pick(TRIAL.good[st])});
  d+=sp;
 }
 const fog=st>=3?[{d0:L*.28,d1:L*(st===3?.78:.55)}]:[];
 if(st===4)fog.push({d0:L*.72,d1:L*.9});
 return {L,ev,fog};
}
function initTrial(){
 const as=trialAssist(),st=S.stage;
 const t={stage:st,as,phase:'intro',time:0,count:3,hearts:as.hearts,maxHearts:as.hearts,orbs:0,got:[],lost:0,
  speed:TRIAL.speed[st]*as.speed,drift:TRIAL.drift[st]*as.drift,p1:rnd(0,6),p2:rnd(0,6),p3:rnd(0,6),
  P:{d:0,lean:0,lv:0,air:0,inv:0,falling:0,fallDir:1},menu:null,msg:null,touch:0,shown:false,done:false,panelAt:0};
 t.c=buildCourse(st,as);t.gusts=t.c.ev.filter(e=>e.type==='gust');t.zones=t.c.ev.filter(e=>['slip','reverse','bounce','narrow'].includes(e.type));t.chase=TRIAL.chaser[st]*as.speed;t.chD=-240;t.bt=0;t.bs=1;
 return t;
}
function startTrial(practice){
 if(mode!=='field'||trans||B||TR)return;
 TR=initTrial();TR.practice=!!practice;mode='trial';keys={};path=[];
 Music.sfx('encounter');
 trans={t0:performance.now(),dur:600,kind:'swirl',mid:()=>{if(!TR)return;TR.shown=true;Music.play('trial');trialIntroPanel()}};
}
// ----- 패널(메뉴) -----
function trialPanel(html,buttons){
 if(!TR)return;
 const el=$('#tpanel');
 el.innerHTML=html+buttons.map((b,i)=>`<button class="choice" data-i="${i}"><kbd>${i+1}</kbd>${b[0]}</button>`).join('');
 $('#trialui').hidden=false;
 TR.menu={sel:0,fns:buttons.map(b=>b[1])};
 el.querySelectorAll('.choice').forEach((btn,i)=>{btn.onclick=()=>trialChoose(i);btn.onmouseenter=()=>{if(TR&&TR.menu){TR.menu.sel=i;trialMark()}}});
 trialMark();
}
function trialChoose(i){
 if(!TR||!TR.menu)return;const fn=TR.menu.fns[i];if(!fn)return;
 TR.menu=null;$('#trialui').hidden=true;Music.sfx('select');fn();
}
function trialMark(){if(!TR||!TR.menu)return;$('#tpanel').querySelectorAll('.choice').forEach((b,i)=>b.classList.toggle('sel',i===TR.menu.sel))}
function trialKey(k){
 if(!TR)return;
 if(k==='m'||k==='M'){toggleSound();return}
 if(TR.menu){const n=TR.menu.fns.length;
  if(k==='ArrowDown'||k==='s'||k==='S'||k==='ArrowRight'||k==='d'||k==='D'){TR.menu.sel=(TR.menu.sel+1)%n;trialMark();Music.sfx('select')}
  else if(k==='ArrowUp'||k==='w'||k==='W'||k==='ArrowLeft'||k==='a'||k==='A'){TR.menu.sel=(TR.menu.sel-1+n)%n;trialMark();Music.sfx('select')}
  else if(k===' '||k==='Enter')trialChoose(TR.menu.sel);
  else if(/^[1-9]$/.test(k)&&+k<=n)trialChoose(+k-1);
  return;
 }
 if(TR.phase==='run'){if(k===' '||k==='Enter'||k==='z'||k==='Z')trialJump();else if(k==='Escape'||k==='p'||k==='P')trialPause()}
}
function trialIntroPanel(){
 const st=TR.stage;
 trialPanel(`<h3>외줄 수련 · ${TRIAL.names[st]}</h3><p>${TRIAL.desc[st]}</p>
  <p class="keys">← → 균형 잡기 (기울어진 <b>반대쪽</b>을 누르기!)<br>Space 점프 · ↑ 빠르게 · ↓ 천천히+웅크리기 · Esc 일시정지</p>
  <p class="muted">터치: 화면 왼쪽·오른쪽을 누르고 있기 · 가운데 또는 A 버튼 점프<br>목숨 ${'♥'.repeat(TR.hearts)}${S.trialFails?` · 도사님 도움: 바람이 약해지고 목숨이 늘었다 (${S.trialFails}번째 재도전)`:''}</p>`,
  [['수련 시작!',()=>{TR.phase='count';TR.count=3}],['나중에 하기',()=>exitTrial(false)]]);
}
function trialPause(){
 if(!TR||TR.phase!=='run')return;
 TR.phase='pause';keys={};TR.touch=0;
 trialPanel('<h3>일시정지</h3><p>숨을 고르자… 준비되면 다시 출발!</p>',[['계속하기',()=>{TR.phase='count';TR.count=1.5}],['포기하고 나가기',()=>{S.trialFails=(S.trialFails||0)+1;save();exitTrial(false)}]]);
}
function trialJump(){const P=TR.P;if(TR.phase==='run'&&P.air<=0&&P.falling<=0){P.air=AIR;Music.sfx('jump')}}
function trialMsg(text,color='#fff'){TR.msg={text,color,t:TR.time}}
// ----- 진행 -----
function trialUpdate(dt){
 const T=TR;T.time+=dt;
 if(!T.shown)return;
 if((T.phase==='intro'||T.phase==='pause')&&!T.menu){T.phase==='intro'?trialIntroPanel():(T.phase='run',trialPause());return}
 if(T.phase==='count'){T.count-=dt;if(T.count<=0){T.phase='run';Music.sfx('ok');trialMsg('출발!','#ffd75e')}return}
 if(T.phase==='clear'||T.phase==='fail'){if(!T.menu&&T.time>=T.panelAt){T.phase==='clear'?clearPanel():failPanel()}return}
 if(T.phase!=='run')return;
 const P=T.P;
 if(P.falling>0){P.falling-=dt;if(P.falling<=0)afterFall();return}
 const up=keys.ArrowUp||keys.w||keys.W,dn=keys.ArrowDown||keys.s||keys.S;
 // 공중에서는 감속하지 않음(느리게 누른 채 점프해도 틈을 넘을 수 있게)
 const v=T.speed*(up?1.45:(dn&&P.air<=0)?.5:1);
 P.d+=v*dt;
 const Lk=keys.ArrowLeft||keys.a||keys.A?1:0,Rk=keys.ArrowRight||keys.d||keys.D?1:0;
 const inZ=type=>T.zones.some(e=>e.type===type&&P.d>=e.d&&P.d<=e.d+e.len);
 const slip=inZ('slip'),rev=inZ('reverse'),bounce=inZ('bounce'),narrow=inZ('narrow');
 let input=Math.max(-1,Math.min(1,(Rk-Lk)+T.touch));if(rev)input=-input;
 P.crouch=!!dn&&P.air<=0;
 const tt=T.time;
 const drift=T.drift*(slip?1.4:1)*(Math.sin(tt*1.3+T.p1)*.6+Math.sin(tt*2.7+T.p2)*.35+Math.sin(tt*.5+T.p3)*.55);
 let gust=0;for(const g of T.gusts)if(P.d>=g.d&&P.d<=g.d+g.len)gust+=g.dir*g.pow*T.as.drift;
 if(bounce){T.bt+=dt;if(T.bt>.6){T.bt=0;T.bs=-T.bs;P.lv+=T.bs*1.8*T.as.drift}}
 const acc=drift+gust+input*4.4*(slip?.45:1)+P.lean*(narrow?2.2:1.25)-P.lv*2.4;
 if(T.chase){T.chD+=T.chase*dt;if(T.chD>P.d-8&&P.inv<=0){T.chD=P.d-210;fall('chaser');return}}
 P.lv+=acc*dt;P.lean+=P.lv*dt*(P.air>0?.6:1);
 if(P.air>0)P.air=Math.max(0,P.air-dt);
 if(P.inv>0)P.inv-=dt;
 if(Math.abs(P.lean)>=1){fall('balance');return}
 for(const e of T.c.ev){
  if(e.type==='gap'){if(P.air<=0&&P.d>e.d+3&&P.d<e.d+e.len-3){fall('gap');return}}
  else if(e.type==='roller'&&!e.gone){
   if(e.d-P.d<280){e.d-=e.v*dt;e.r+=e.v*dt/9}
   if(e.d<P.d-60)e.gone=true;
   else if(P.air<=0&&P.inv<=0&&Math.abs(e.d-P.d)<12){e.gone=true;fall('roller',e.word);return}
  }
  else if(e.type==='swing'){
   e.x=PX+Math.sin(tt*e.w+e.ph)*e.amp;
   if(!e.hit&&P.inv<=0&&Math.abs(e.d-P.d)<11&&Math.abs(e.x-(PX+P.lean*7))<16){e.hit=true;const dir=Math.cos(tt*e.w+e.ph)>=0?1:-1;P.lv+=dir*2.6;Music.sfx('hurt');shake=4;trialMsg('퍽! 도깨비불에 휘청!','#ff9a6b')}
  }
  else if(e.type==='crow'&&!e.done){
   const dd=e.d-P.d;
   if(e.x==null&&dd<T.speed*.75&&dd>-20){e.x=PX+e.side*190;Music.sfx('charge')}
   if(e.x!=null){e.x-=e.side*260*dt;if(Math.sign(e.x-PX)===-e.side&&Math.abs(e.x-PX)>210)e.done=true;
    if(!e.hit&&P.inv<=0&&!P.crouch&&Math.abs(e.d-P.d)<12&&Math.abs(e.x-(PX+P.lean*7))<18){e.hit=true;fall('crow',e.word);return}}
  }
  else if(e.type==='rock'&&!e.done){
   const dd=e.d-P.d;
   if(e.trig==null&&dd<T.speed*1.1&&dd>0){e.trig=tt;Music.sfx('charge')}
   if(e.trig!=null&&tt-e.trig>=1.1){e.done=true;e.landT=tt;shake=3;Music.sfx('push');if(P.inv<=0&&Math.abs(e.d-P.d)<14){fall('rock');return}}
  }
  else if(e.type==='orb'&&!e.got&&Math.abs(e.d-P.d)<14){e.got=true;T.orbs++;T.got.push(e.word);Music.sfx('chime');floaters.push({x:PX+22,y:PY-30,text:'+'+e.word,color:'#ffd75e',t0:performance.now()})}
 }
 if(P.d>=T.c.L){T.phase='clear';T.panelAt=T.time+1.1;trialClear()}
}
function fall(reason,word){
 const T=TR,P=T.P;P.falling=.9;P.fallDir=Math.sign(P.lean)||1;if(!teacherGod())T.hearts--;T.lost++;Music.sfx('splash');shake=6;
 trialMsg(reason==='balance'?'균형을 잃었다!':reason==='gap'?'끊어진 곳에 빠졌다!':reason==='crow'?`「${word}」 까마귀에 채였다! (↓ 웅크리기)`:reason==='rock'?'낙석에 맞았다! (그림자를 보면 속도 조절)':reason==='chaser'?'먹구름에 붙잡혔다! (멈추지 마!)':`「${word}」에 부딪혔다!`,'#ff6b5b');
}
function afterFall(){
 const T=TR,P=T.P;
 if(T.hearts<=0){T.phase='fail';T.panelAt=T.time+.4;if(!T.practice)S.trialFails=(S.trialFails||0)+1;save();Music.sfx('wrong');return}
 P.d=Math.max(0,P.d-50);
 for(let k=0;k<3;k++)for(const e of T.c.ev)if(e.type==='gap'&&P.d>e.d-24&&P.d<e.d+e.len+4)P.d=Math.max(0,e.d-30);
 for(const e of T.c.ev){if(e.type==='roller'&&!e.gone&&e.d>P.d-20&&e.d<P.d+170)e.d=P.d+300;if((e.type==='crow'||e.type==='rock')&&!e.done&&e.d>P.d-20&&e.d<P.d+120){e.x=null;e.trig=null;e.hit=false}}
 if(T.chase)T.chD=Math.min(T.chD,P.d-220);
 P.lean=0;P.lv=0;P.air=0;P.inv=1.8;
 trialMsg('다시 일어섰다! ♥'+T.hearts,'#7be38a');
}
function trialClear(){
 const T=TR,perfect=T.lost===0,xp=100+T.orbs*10,before=level();
 if(T.practice){T.reward={xp:0,perfect,up:false};Music.play('victory',null);trialMsg('연습 완주!','#ffd75e');return}
 S.trial=true;S.xp+=xp;if(perfect)S.items.potion++;
 S.trialRec=Array.isArray(S.trialRec)?S.trialRec:[];
 S.trialRec[T.stage]={orbs:T.orbs,lost:T.lost,tries:(S.trialFails||0)+1};
 S.trialFails=0;T.reward={xp,perfect,up:level()>before};if(T.reward.up)healAll();
 save();hud();Music.play('victory',null);trialMsg('수련 완주!','#ffd75e');
}
function clearPanel(){
 const T=TR,r=T.reward;
 trialPanel(`<h3>${T.practice?'연습 완주':'수련 성공!'} · ${TRIAL.names[T.stage]}</h3><p>${T.practice?'교사용 연습이라 진행 상황은 바뀌지 않아요.':'결계가 완전히 풀렸다. 이제 보스에게 도전할 수 있다!'}</p>
  <p>모은 구슬 ${T.orbs}개 · 경험치 +${r.xp}${r.perfect?' · <b>한 번도 안 떨어짐! 회복약 +1</b>':` · 떨어진 횟수 ${T.lost}`}${r.up?` · 레벨 업! Lv.${level()}`:''}</p>
  ${T.got.length?`<p class="keys">모은 말: ${T.got.join(' · ')}</p>`:''}`,[[T.practice?'연습 끝내기':'보스에게 가자!',()=>exitTrial(!T.practice)]]);
}
function failPanel(){
 const f=S.trialFails||0;
 const btns=[['다시 도전',()=>retryTrial()],['잠시 쉬기 (필드로)',()=>exitTrial(false)]];
 if(f>=2&&!TR.practice)btns.push(['도사님 도움으로 통과하기',()=>{S.trial=true;S.trialRec=Array.isArray(S.trialRec)?S.trialRec:[];S.trialRec[TR.stage]={orbs:0,lost:TR.lost,tries:f,helped:true};S.trialFails=0;save();exitTrial(true)}]);
 trialPanel(`<h3>수련 실패…</h3><p>${pick(['괜찮아, 넘어져도 다시 일어나면 돼!','허허, 균형은 연습할수록 좋아지는 법이지!','혼자 힘들면 도움을 청해도 된단다.'])}</p><p class="muted">다시 도전할수록 바람이 약해지고 목숨이 늘어납니다.${f>=2?' 너무 어렵다면 도사님의 도움을 받아 통과할 수도 있어요.':''}</p>`,btns);
}
function retryTrial(){TR=initTrial();TR.shown=true;TR.phase='count';TR.count=2.5;keys={};Music.play('trial')}
function exitTrial(cleared){
 if(!TR)return;TR.phase='exit';
 trans={t0:performance.now(),dur:600,kind:'fade',mid:()=>{
  TR=null;$('#trialui').hidden=true;mode='field';keys={};cooldown=performance.now()+800;
  Music.play('field');hud();cv.focus();
  if(cleared){log(`외줄 수련 통과! ${ENEMY_NAMES[S.stage].boss}의 결계가 풀렸다.`,'gold');say([['sys',`결계가 완전히 풀렸다! 이제 ${ENEMY_NAMES[S.stage].boss}에게 도전하자.`]])}
  else log('외줄 수련터에서 물러났다. 준비되면 다시 도전하자.');
 }};
}
// ----- 그리기 -----
function ttxt(s,x,y,size,color,align='center'){ctx.font=size+'px NeoDunggeunmo, monospace';ctx.textAlign=align;ctx.lineWidth=3;ctx.strokeStyle='#1a0a05';ctx.strokeText(s,x,y);ctx.fillStyle=color;ctx.fillText(s,x,y)}
function heart(x,y,full){const c=full?'#ff4a5a':'#4a2a35';ctx.fillStyle='#1a0a05';ctx.fillRect(x-1,y,11,7);ctx.fillRect(x,y-1,4,2);ctx.fillRect(x+5,y-1,4,2);ctx.fillRect(x+1,y+7,7,2);ctx.fillRect(x+3,y+9,3,1);
 ctx.fillStyle=c;ctx.fillRect(x,y,9,6);ctx.fillRect(x+1,y-0,3,1);ctx.fillRect(x+5,y,3,1);ctx.fillRect(x+1,y+6,7,1);ctx.fillRect(x+2,y+7,5,1);ctx.fillRect(x+3,y+8,3,1);if(full){ctx.fillStyle='#ffb0b8';ctx.fillRect(x+1,y+1,2,2)}}
function drawAbyss(st,dd,t){
 const par=dd*.5;
 const base=['#2f78c8','#123d22','#7aa84a','#2a2238','#2a1a4a'][st];
 ctx.fillStyle=base;ctx.fillRect(0,0,480,320);
 const n0=Math.floor((par-(320-PY))/40)-1;
 for(let n=n0;n<n0+11;n++){
  const y=PY-(n*40-par);
  for(let j=0;j<5;j++){
   const h=hash(n,j,st+90),x=64+h*352;
   if(st===0){ctx.fillStyle='#5aa0e8';ctx.fillRect(x,y,18,2);ctx.fillRect(x+6,y+2,10,1);if(j===0){ctx.fillStyle='#6a7a8a';ctx.fillRect(x+40,y+12,10,6)}}
   else if(st===1){ctx.fillStyle=j%2?'#1d5a34':'#2e7a44';ctx.beginPath();ctx.arc(x,y,10+h*8,0,7);ctx.fill()}
   else if(st===2){ctx.fillStyle=['#ff7aa8','#ffe06a','#ffffff'][j%3];ctx.fillRect(x,y,3,3);ctx.fillRect(x+20,y+18,2,2);ctx.fillStyle='#6a983a';ctx.fillRect(x+9,y+9,8,2)}
   else if(st===3){ctx.fillStyle='rgba(255,255,255,.10)';const cx=(x+t/40*(j%2?1:-1))%420+30;ctx.fillRect(cx,y,40,6);ctx.fillRect(cx+8,y-4,22,4)}
   else{const f=.5+Math.sin(t/200+n+j)*.5;ctx.fillStyle=`rgba(255,215,94,${.25+f*.5})`;ctx.fillRect(x,y,3,3);ctx.fillStyle='rgba(154,138,224,.25)';ctx.fillRect(x-20,y+14,30,2)}
  }
 }
 // 깊이감 그라데이션
 const g=ctx.createLinearGradient(64,0,240,0);g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(64,0,176,320);
 const g2=ctx.createLinearGradient(416,0,240,0);g2.addColorStop(0,'rgba(0,0,0,.35)');g2.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g2;ctx.fillRect(240,0,176,320);
}
function drawBanks(st,dd){
 const th=THEMES[st];
 for(const side of [0,1]){
  const x0=side?416:0;
  ctx.fillStyle=th.grass[0];ctx.fillRect(x0,0,64,320);
  const n0=Math.floor((dd-(320-PY))/16)-1;
  for(let n=n0;n<n0+22;n++){
   const y=PY-(n*16-dd);const h=hash(n,side,st+50);
   const edge=side?416-((h*6)|0):64+((h*6)|0)-6;
   ctx.fillStyle='#2a1a10';ctx.fillRect(side?edge-4:edge,y,6,16);
   ctx.fillStyle=th.grass[1];ctx.fillRect(x0+((h*40)|0),y+4,3,3);
   if(n%3===0){for(let j=0;j<2;j++){if(hash(n,j+side*2,st+60)<.65)drawTree(ctx,(side?424:6)+j*24,y-8,th,st,n,j)}}
  }
 }
}
function drawTrial(t){
 const T=TR,st=T.stage,P=T.P,L=T.c.L;
 const sy=d=>PY-(d-P.d);
 drawAbyss(st,P.d,t);
 // 돌풍 구역
 for(const g of T.gusts){const y0=sy(g.d+g.len),y1=sy(g.d);if(y1<-10||y0>330)continue;
  ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(64,y0,352,y1-y0);
  for(let i=0;i<16;i++){const yy=y0+((i*53)%Math.max(1,(y1-y0)|0));const xx=64+(((t*.22*g.dir+i*67)%352)+352)%352;ctx.fillStyle=st===2?['#ff9ec4','#ffffff'][i%2]:'rgba(255,255,255,.7)';ctx.fillRect(xx,yy,st===2?3:10,st===2?3:1)}
  const ay=Math.max(y0+10,Math.min(y1-10,PY-60));ttxt(g.dir>0?'▶▶ 돌풍':'돌풍 ◀◀',g.dir>0?110:370,ay,12,'#ffe06a')}
 drawBanks(st,P.d);
 // 장대
 const gaps=T.c.ev.filter(e=>e.type==='gap');
 const pole=(d0,d1)=>{const ya=sy(d1),yb=sy(d0);if(yb<-4||ya>324)return;ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(PX+8,ya,6,yb-ya);ctx.fillStyle='#5a3a1a';ctx.fillRect(PX-7,ya,14,yb-ya);ctx.fillStyle='#9a6a32';ctx.fillRect(PX-6,ya,12,yb-ya);ctx.fillStyle='#c08a48';ctx.fillRect(PX-5,ya,3,yb-ya);
  const b0=Math.ceil(d0/48)*48;for(let b=b0;b<d1;b+=48){const y=sy(b);ctx.fillStyle='#e8d8a8';ctx.fillRect(PX-8,y,16,2);ctx.fillStyle='#8a7a5a';ctx.fillRect(PX-8,y+2,16,1)}};
 let cur=-120;for(const g of gaps){pole(cur,g.d);const ya=sy(g.d),yb=sy(g.d+g.len);ctx.fillStyle='#c08a48';ctx.fillRect(PX-6,ya-3,4,3);ctx.fillRect(PX+2,ya-2,3,2);ctx.fillRect(PX-4,yb,3,3);ctx.fillRect(PX+3,yb,3,2);cur=g.d+g.len}
 pole(cur,L+140);
 // 출발·도착 발판
 const deck=(d0,d1)=>{const ya=sy(d1),yb=sy(d0);if(yb<0||ya>320)return;ctx.fillStyle='#4a2a12';ctx.fillRect(PX-44,ya,88,yb-ya);ctx.fillStyle='#a8743a';for(let y=ya+1;y<yb;y+=6)ctx.fillRect(PX-43,y,86,4)};
 deck(-120,-6);deck(L+6,L+140);
 const fy=sy(L+70);if(fy>-40&&fy<360){ctx.fillStyle='#1a0a0a';ctx.fillRect(PX-30,fy-28,4,40);ctx.fillRect(PX+26,fy-28,4,40);ctx.fillStyle='#c8302a';ctx.fillRect(PX-29,fy-27,2,38);ctx.fillRect(PX+27,fy-27,2,38);ctx.fillStyle='#1a1a2a';ctx.fillRect(PX-36,fy-34,72,6);ctx.fillStyle='#ffd75e';ctx.fillRect(PX-14,fy-30,28,6);ttxt('완주',PX,fy-38,12,'#ffd75e')}
 // 출발점 응원단
 const cy=sy(-60);if(cy<360){const fans=[['master',PX-30]];if(S.stage>=1)fans.push(['bomi',PX+30]);if(S.stage>=2)fans.push(['gomdol',PX+56]);fans.forEach(([k,x],i)=>Sprites.draw(ctx,k,'front',x,cy+((t/200+i)|0)%2*-2,1.5,{}));if(cy>40&&cy<330)ttxt('힘내라!',PX,cy-34,12,'#fff')}
 // 구간 효과
 for(const z of T.zones){const y0=sy(z.d+z.len),y1=sy(z.d);if(y1<-10||y0>330)continue;const ly=Math.max(y0+12,Math.min(y1-6,PY-70));
  if(z.type==='slip'){ctx.fillStyle='rgba(150,220,255,.55)';ctx.fillRect(PX-7,y0,14,y1-y0);for(let yy=y0+6;yy<y1;yy+=18){ctx.fillStyle='#fff';ctx.fillRect(PX-3+((yy/18|0)%2)*4,yy,2,2)}ttxt('미끌!',PX+30,ly,11,'#bfefff')}
  else if(z.type==='narrow'){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(PX-7,y0,4,y1-y0);ctx.fillRect(PX+3,y0,4,y1-y0);ttxt('좁은 장대!',PX+38,ly,11,'#ffe9a8')}
  else if(z.type==='bounce'){ctx.fillStyle='rgba(255,230,150,.7)';for(let yy=y0;yy<y1;yy+=9)ctx.fillRect(PX-11+Math.sin(t/70+yy*.3)*3,yy,22,1);ttxt('출렁!',PX+30,ly,11,'#ffe9a8')}
  else if(z.type==='reverse'){ctx.fillStyle='rgba(170,90,255,.2)';ctx.fillRect(64,y0,352,y1-y0);for(let i=0;i<6;i++){const yy=y0+((i*47+t/20)%Math.max(1,y1-y0));ctx.fillStyle='rgba(220,180,255,.6)';ctx.fillRect(90+i*55,yy,10,2)}ttxt('⇄ 좌우 반대!',PX,Math.max(y0+14,Math.min(y1-8,PY-90)),13,'#e0c8ff')}
 }
 // 장애물·구슬
 for(const e of T.c.ev){
  const y=sy(e.d);if(y<-30||y>350)continue;
  if(e.type==='orb'&&!e.got){const p=Math.sin(t/150+e.d)*1.5;ctx.fillStyle='rgba(255,215,94,.35)';ctx.beginPath();ctx.arc(PX,y-4,9+p,0,7);ctx.fill();ctx.fillStyle='#ffd75e';ctx.beginPath();ctx.arc(PX,y-4,5,0,7);ctx.fill();ctx.fillStyle='#fff8d0';ctx.fillRect(PX-2,y-7,2,2);ttxt(e.word,PX+16,y-1,11,'#fff3b0','left')}
  else if(e.type==='roller'&&!e.gone){ctx.save();ctx.translate(PX,y-6);ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(-9,6,18,3);ctx.fillStyle='#3a1a0a';ctx.beginPath();ctx.arc(0,0,10,0,7);ctx.fill();ctx.fillStyle='#9a4a2a';ctx.beginPath();ctx.arc(0,0,9,0,7);ctx.fill();ctx.rotate(e.r);ctx.fillStyle='#e8c070';ctx.fillRect(-9,-1,18,2);ctx.fillRect(-1,-9,2,18);ctx.restore();ttxt(e.word,PX,y-20,11,'#ff9a8a');
   if(e.d-P.d<280&&e.d-P.d>40&&((t/120)|0)%2)ttxt('!',PX+18,y-8,16,'#ff4a3a')}
  else if(e.type==='crow'&&!e.done){
   if(e.x!=null){const x=e.x,yy=y-16,f=((t/70)|0)%2;ctx.fillStyle='#1a1a22';ctx.beginPath();ctx.ellipse(x,yy,8,5,0,0,7);ctx.fill();ctx.fillRect(x-14,yy-(f?6:-2),10,3);ctx.fillRect(x+4,yy-(f?6:-2),10,3);ctx.fillStyle='#ffd75e';ctx.fillRect(x+(e.side<0?6:-9),yy-1,3,2);ctx.fillStyle='#ff4a4a';ctx.fillRect(x+(e.side<0?3:-5),yy-3,2,2);ttxt(e.word,x,yy-12,10,'#ff9a8a');
    if(!P.crouch&&e.d-P.d<T.speed*.9&&e.d-P.d>-10)ttxt('↓ 웅크려!',PX,PY-66,15,'#ff6b5b')}
   else if(e.d-P.d<300&&e.d-P.d>0)ttxt(e.side>0?'까마귀 ◀':'▶ 까마귀',e.side>0?380:100,y-14,11,'#ff9a8a')}
  else if(e.type==='rock'){
   if(e.trig!=null&&!e.done){const k=Math.min(1,(T.time-e.trig)/1.1);ctx.fillStyle=`rgba(0,0,0,${.25+k*.35})`;ctx.beginPath();ctx.ellipse(PX,y-2,5+k*11,2+k*4,0,0,7);ctx.fill();const ry=y-6-(1-k)*150;ctx.fillStyle='#3a3a3a';ctx.beginPath();ctx.arc(PX,ry,9,0,7);ctx.fill();ctx.fillStyle='#8a8a8a';ctx.beginPath();ctx.arc(PX-2,ry-2,6,0,7);ctx.fill();if(((t/120)|0)%2)ttxt('낙석!',PX+34,y-8,12,'#ff6b5b')}
   else if(e.done&&T.time-e.landT<.6){const k=(T.time-e.landT)/.6;ctx.fillStyle=`rgba(140,140,140,${1-k})`;for(let j=0;j<6;j++)ctx.fillRect(PX+Math.cos(j)*k*30,y-4-Math.sin(j*2)*k*12,3,3)}}
  else if(e.type==='swing'){ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(PX-e.amp,y-6);ctx.lineTo(PX+e.amp,y-6);ctx.stroke();ctx.setLineDash([]);
   const x=e.x;ctx.fillStyle='rgba(176,106,255,.35)';ctx.beginPath();ctx.arc(x,y-6,11,0,7);ctx.fill();ctx.fillStyle='#b06aff';ctx.beginPath();ctx.arc(x,y-6,7,0,7);ctx.fill();ctx.fillRect(x-3,y-17,6,6);ctx.fillStyle='#f0d0ff';ctx.fillRect(x-4,y-8,3,3);ctx.fillRect(x+1,y-8,3,3);ctx.fillStyle='#1a0a2a';ctx.fillRect(x-3,y-7,1,2);ctx.fillRect(x+2,y-7,1,2)}
 }
 // 주인공
 const blink=P.inv>0&&((t/80)|0)%2===0;
 const lift=P.air>0?Math.sin((1-P.air/AIR)*Math.PI)*14:0;
 const px=PX+P.lean*7;
 if(P.falling>0){
  const k=1-P.falling/.9;ctx.save();ctx.globalAlpha=1-k*.6;ctx.translate(px+P.fallDir*k*34,PY+k*10);ctx.rotate(P.fallDir*k*3);ctx.scale(1-k*.7,1-k*.7);Sprites.draw(ctx,'baram','back',0,0,2,{});ctx.restore();
  if(k>.55){const r=(k-.55)*60;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px+P.fallDir*34,PY+12,r,r*.4,0,0,7);ctx.stroke()}
 } else if(!blink){
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(px,PY,10-lift/3,3,0,0,7);ctx.fill();
  ctx.save();ctx.translate(px,PY-lift);ctx.rotate(P.lean*.5);
  const bob=T.phase==='run'&&P.air<=0?((t/140)|0)%2:0;
  if(P.crouch)ctx.scale(1.12,.68);
  Sprites.draw(ctx,'baram','back',0,-bob,2,{});
  ctx.rotate(P.lean*.3);ctx.fillStyle='#3a2410';ctx.fillRect(-36,-20,72,4);ctx.fillStyle='#b07a3a';ctx.fillRect(-35,-19,70,2);ctx.fillStyle='#d8382a';ctx.fillRect(-40,-23,6,8);ctx.fillRect(34,-23,6,8);ctx.fillStyle='#ffd75e';ctx.fillRect(-39,-16,4,3);ctx.fillRect(35,-16,4,3);
  ctx.restore();
 }
 // 안개
 let fog=0;for(const z of T.c.fog){if(P.d>z.d0-80&&P.d<z.d1+80)fog=Math.max(fog,Math.min(1,(P.d-(z.d0-80))/80,(z.d1+80-P.d)/80))}
 if(fog>0){const g=ctx.createRadialGradient(px,PY-10,36,px,PY-10,130);g.addColorStop(0,'rgba(34,28,52,0)');g.addColorStop(1,`rgba(34,28,52,${.96*fog})`);ctx.fillStyle=g;ctx.fillRect(0,0,480,320);if(fog>.5)ttxt('침묵의 안개…',PX,40,12,'rgba(220,210,255,.8)')}
 // 안개 속에서도 굴러오는 통은 경고 표시(공정하게)
 if(fog>.2)for(const e of T.c.ev){if(e.type!=='roller'||e.gone)continue;const dd=e.d-P.d;if(dd>10&&dd<280){const y=Math.max(PY-140,sy(e.d));ttxt('▼ 「'+e.word+'」 굴러온다!',PX,y-14,12,'#ff6b5b')}}
 // 쫓아오는 먹구름
 if(T.chase){const cy=sy(T.chD);if(cy<380){ctx.fillStyle='rgba(28,18,40,.88)';for(let i=0;i<10;i++){ctx.beginPath();ctx.arc(60+i*40,cy+Math.sin(t/200+i)*4,28,0,7);ctx.fill()}ctx.fillRect(30,cy,420,Math.max(0,360-cy));ctx.fillStyle='#ff4a5a';ctx.fillRect(214,cy-6,6,4);ctx.fillRect(258,cy-6,6,4)}
  if(T.chD>P.d-110&&T.phase==='run')ttxt('먹구름이 쫓아온다! ↑로 달려!',PX,160,13,'#ff9a8a')}
 // HUD
 ctx.fillStyle='rgba(16,26,90,.85)';ctx.fillRect(6,6,168,36);ctx.strokeStyle='#f4ecd8';ctx.lineWidth=2;ctx.strokeRect(6,6,168,36);
 ttxt('외줄 수련 · '+TRIAL.names[st],12,20,11,'#ffd75e','left');
 for(let i=0;i<T.maxHearts;i++)heart(14+i*14,27,i<T.hearts);
 ttxt('구슬 '+T.orbs,410,22,13,'#ffd75e','left');
 // 진행 막대
 const pr=Math.max(0,Math.min(1,P.d/L));ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(464,50,8,200);ctx.fillStyle='#7be38a';ctx.fillRect(464,50+200*(1-pr),8,200*pr);ctx.strokeStyle='#f4ecd8';ctx.lineWidth=1;ctx.strokeRect(464,50,8,200);ttxt('도착',468,46,10,'#fff');
 // 균형 계기판
 const mx=140,mw=200,my=296;
 ctx.fillStyle='rgba(16,26,90,.9)';ctx.fillRect(mx-8,my-14,mw+16,24);ctx.strokeStyle='#f4ecd8';ctx.strokeRect(mx-8,my-14,mw+16,24);
 ctx.fillStyle='#c83a2a';ctx.fillRect(mx,my-4,mw,8);ctx.fillStyle='#e8b030';ctx.fillRect(mx+mw*.12,my-4,mw*.76,8);ctx.fillStyle='#3fae5a';ctx.fillRect(mx+mw*.3,my-4,mw*.4,8);
 const nx=mx+mw/2+Math.max(-1,Math.min(1,P.lean))*mw/2;ctx.fillStyle='#fff';ctx.fillRect(nx-1,my-9,3,18);ctx.fillStyle='#1a0a05';ctx.fillRect(nx-2,my-10,5,2);
 ttxt('균형',mx-14,my+4,11,'#fff','right');
 if(T.phase==='run'&&Math.abs(P.lean)>.5&&P.falling<=0&&((t/150)|0)%2)ttxt(P.lean>0?'◀ 왼쪽!':'오른쪽! ▶',P.lean>0?mx-40:mx+mw+40,my-22,16,'#ff6b5b');
 // 카운트다운·메시지
 if(T.phase==='count')ttxt(String(Math.ceil(T.count)),PX,150,48,'#ffd75e');
 if(T.msg&&T.time-T.msg.t<1.3)ttxt(T.msg.text,PX,120,18,T.msg.color);
}
// 필드의 깃발 수련터
function drawTrialPost(X,Y,t){
 const open=S.talked&&S.shrine&&!S.trial;
 if(open){ctx.fillStyle=`rgba(255,215,94,${.25+Math.sin(t/160)*.15})`;ctx.beginPath();ctx.arc(X,Y-10,14,0,7);ctx.fill()}
 ctx.fillStyle='#2a1a0a';ctx.fillRect(X-8,Y-24,3,24);ctx.fillRect(X+5,Y-24,3,24);
 ctx.fillStyle='#9a6a32';ctx.fillRect(X-7,Y-23,1,23);ctx.fillRect(X+6,Y-23,1,23);
 ctx.fillStyle='#e8d8a8';ctx.fillRect(X-6,Y-14,12,1);
 const wave=((t/180)|0)%2;
 ctx.fillStyle=S.trial?'#3fae5a':'#d8382a';ctx.fillRect(X-5,Y-23,10,8+wave);
 ctx.fillStyle='#fff6c0';ctx.fillRect(X-3,Y-20,6,1);ctx.fillRect(X-1,Y-21,2,4);
 ctx.fillStyle='#5a4a3a';ctx.fillRect(X-9,Y-2,18,2);
}
