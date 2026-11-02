// 자체 제작 도트 스프라이트 (16x16) + 자동 외곽선
const Sprites=(()=>{
const FRONT=['......oooo......','....oohhhhoo....','...ohhhhhhhho...','..ohhhhhhhhhho..','..obbbbbbbbbbo..','..ohssssssssho..','..ohsessssesho..','..ohsessssesho..','...osmssssmso...','....osssssso....','...occwwwwcco...','..occcwccwccco..','..sccccccccccs..','...obbbbbbbbo...','...oppo..oppo...','...offo..offo...'];
const FRONT2=FRONT.slice(0,14).concat(['....oppooppo....','....offooffo....']);
const BACK=['......oooo......','....oohhhhoo....','...ohhhhhhhho...','..ohhhhhhhhhho..','..obbbbbbbbbbo..','..ohhhhhhhhhho..','..ohhhhhhhhhho..','..ohhhhhhhhhho..','...ohhhhhhhho...','....osssssso....','...occccccco....','..occcccccccco..','..sccccccccccs..','...obbbbbbbbo...','...oppo..oppo...','...offo..offo...'];
const SIDE=['.......oooo.....','.....oohhhhoo...','....ohhhhhhhho..','...ohhhhhhhhhho.','...obbbbbbbbbbo.','...osssssshhhho.','...oessssshhhho.','...oessssshhho..','...osmssssssho..','....osssssso....','....occwwcco....','...occcwcccco...','...osccccccco...','....obbbbbbo....','....oppooppo....','...offo..offo...'];
const SIDE2=SIDE.slice(0,14).concat(['.....opppo......','....offfo.......']);
const GOBLIN=['....h......h....','....hh....hh....','...gggggggggg...','..gggggggggggg..','..ggwg.gg.wggg..','..ggkk.gg.kkgg..','...gggggggggg...','....gwwwwwwg....','....gggggggg....','..ggggbbbbgggg..','..gg.gbbbbg.gg..','.....bbbbbb.....','.....bbbbbb.....','.....gg..gg.....','....kkk..kkk....'];
const FOX=['...rr......rr...','...rwr....rwr...','...rrrrrrrrrr...','....rrrrrrrr....','...rrkrrrrkrr...','....rwwkkwwr....','.....wwwwww.....','......rrrr...rr.','.....rrrrrr..rr.','....rrwwwwrrrr..','....rrwwwwrrrr..','.....rrrrrrww...','.....rr..rr.....','....kkk..kkk....'];
const BOSS=['...h........h...','...hh..hh..hh...','....hhhhhhhh....','...rrrrrrrrrr...','..rrkrrrrrrkrr..','..rrwwrrrrwwrr..','...rrrrkkrrrr...','....rwwwwwwr....','.....rrrrrr.....','...aaaaggaaaa...','..aaaaaggaaaaa..','..rr.aaagaa.rr..','..rr.aaaaaa.rr..','.....aaaaaa.....','.....aaggaa.....','.....aa..aa.....','....kkk..kkk....'];
const WISP=['.......hh.......','......hrrh......','.....hrrrrh.....','....hrrwwrrh....','...hrrwwwwrrh...','..hrrwwwwwwrrh..','..hrwwkwwkwwrh..','..hrwwkwwkwwrh..','..hrwwwwwwwwrh..','..hrrwwmmwwrrh..','...hrrwwwwrrh...','....hrrrrrrh....','.....hhhhhh.....','...h..h..h..h...'];
const GOLEM=['....aaaaaaaa....','..aaaaaaaaaaaa..','.aaggaaaaaaggaa.','.aaaaaaaaaaaaaa.','.aakkaaaaaakkaa.','.aawkaaaaaawkaa.','.aaaaaaaaaaaaaa.','.aaaarrrrrraaaa.','..aaaaaaaaaaaa..','aaaaaaaaaaaaaaaa','aagaaaaaaaaaagaa','aaaaaaaaaaaaaaaa','.aaaaaaaaaaaaaa.','..aaaa....aaaa..','..kkkk....kkkk..'];
const CAT=['...oo......oo...','...oyo....oyo...','...oyyooooyyo...','..oyyyyyyyyyyo..','..oyyeyyyyeyyo..','..oyyeyyyyeyyo..','..oyyyymmyyyyo..','...oyyyyyyyyo...','....oooooooo....','...occcwwccco...','..occcwwwwccco..','..yccccccccccy..','...occcccccco...','...oyyo..oyyo...','...oooo..oooo...'];
const base={o:'#2a1a12',s:'#f7c9a0',e:'#1a1a1a',m:'#f39a8a'};
const PAL={
 baram:{...base,h:'#2b2b3a',b:'#2f6fd8',c:'#3a7bd5',w:'#f4f1e6',p:'#6b4a2b',f:'#3a2a1a'},
 bomi:{...base,h:'#8a4421',b:'#e8473b',c:'#3fae6a',w:'#ffe08a',p:'#2f4f8f',f:'#5a2a1a'},
 gomdol:{...base,s:'#e8b48a',h:'#5a3a22',b:'#ff8fc0',c:'#b8483e',w:'#ff9fcf',p:'#4a3a2a',f:'#2a1a0a'},
 master:{...base,h:'#f0f0f0',b:'#7a4fb0',c:'#7a4fb0',w:'#ffd75e',p:'#5a3a8a',f:'#3a2a1a'},
 villager:{...base,h:'#3a2a1a',b:'#e0a030',c:'#d88a3a',w:'#fff',p:'#6a4a2a',f:'#3a2a1a'},
 villager2:{...base,h:'#6a3a1a',b:'#3aa0d8',c:'#e86a8a',w:'#fff',p:'#3a4a6a',f:'#3a2a1a'},
 friend0:{...base,s:'#fff0f0',h:'#ffffff',b:'#ff8ab0',c:'#ff8ab0',w:'#fff',p:'#e85a8a',f:'#c84a6a'},
 friend1:{...base,s:'#d8c8b8',h:'#5a5a6a',b:'#2a2a3a',c:'#f0f0f0',w:'#e86a3a',p:'#4a4a5a',f:'#2a2a2a'},
 friend2:{...base,s:'#f0c890',h:'#a85a2a',b:'#ffd75e',c:'#3aa05a',w:'#fff',p:'#7a4a2a',f:'#4a2a1a'},
 cat:{o:'#2a1a12',y:'#f0a040',e:'#1a1a1a',m:'#ff8a9a',c:'#7a3ab0',w:'#ffd75e'}
};
const WISP_PAL=[['#c8501a','#ff8a3a','#ffe0a0'],['#2a6ac8','#5ab0ff','#d0f0ff'],['#c83a8a','#ff6ab0','#ffe0f0'],['#5a4a8a','#9a8ac8','#e0d8ff'],['#8a1a1a','#e84a3a','#ffc0a0']];
const GOLEM_PAL=[['#8a9a7a','#5a8a3a'],['#6a7a6a','#3a6a3a'],['#c8a8b8','#7aa04a'],['#7a7a8a','#5a6a5a'],['#6a5a5a','#8a3a3a']];
const ENEMY_PAL=[
 {g:'#4cc46a',h:'#f4e6b0',w:'#ffffff',k:'#1a1a1a',b:'#8a5a2a',r:'#ff7a3a',a:'#8a3ab0'},
 {g:'#5a9ad8',h:'#ffd75e',w:'#ffffff',k:'#1a1a1a',b:'#3a3a6a',r:'#c06a2a',a:'#2a5a8a'},
 {g:'#ff8ac0',h:'#ffffff',w:'#ffffff',k:'#1a1a1a',b:'#c84a8a',r:'#e8a020',a:'#e05a8a'},
 {g:'#8a7ab0',h:'#c8c8d8',w:'#ffffff',k:'#1a1a1a',b:'#4a3a5a',r:'#6a5a8a',a:'#3a3a4a'},
 {g:'#c84a3a',h:'#ffd75e',w:'#ffffff',k:'#1a1a1a',b:'#5a1a1a',r:'#a82a8a',a:'#3a1a3a'}
];
const cache=new Map();
function overlay(rows,key){
 const a=rows.map(r=>r.split(''));
 const set=(x,y,c)=>{if(a[y]&&a[y][x]!==undefined)a[y][x]=c};
 if(key==='bomi'){ // 포니테일
  for(let y=3;y<10;y++){set(14,y,'h');} set(15,5,'h');set(15,6,'h');set(13,9,'b');
 }
 if(key==='gomdol'){ // 곰 귀 모자 + 넓은 어깨
  set(2,0,'h');set(3,0,'h');set(2,1,'h');set(3,1,'o');set(12,0,'h');set(13,0,'h');set(13,1,'h');set(12,1,'o');
  set(1,11,'c');set(14,11,'c');set(1,12,'s');set(14,12,'s');
 }
 if(key==='master'){ // 흰 수염
  for(const [x,y] of [[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[6,10],[7,10],[8,10],[9,10],[7,11],[8,11]])set(x,y,'w2');
 }
 return a;
}
function render(rows,pal,key){
 const h=rows.length,w=16,c=document.createElement('canvas');c.width=w+2;c.height=h+2;const g=c.getContext('2d');
 const grid=overlay(rows,key);
 const color=ch=>ch==='w2'?'#ffffff':pal[ch];
 // 외곽선
 g.fillStyle=pal.o||'#2a1a12';
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const ch=grid[y][x];if(ch!=='.'&&color(ch)){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;const n=grid[ny]&&grid[ny][nx];if(!n||n==='.')g.fillRect(nx+1,ny+1,1,1)}}}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const ch=grid[y][x];const col=ch!=='.'&&color(ch);if(col){g.fillStyle=col;g.fillRect(x+1,y+1,1,1)}}
 // 하이라이트
 return c;
}
function get(key,pose,frame=0,stage=0){
 const id=key+'|'+pose+'|'+frame+'|'+stage;
 if(cache.has(id))return cache.get(id);
 let img;
 if(key==='goblin'||key==='fox'||key==='boss'){
  const rows=key==='goblin'?GOBLIN:key==='fox'?FOX:BOSS;
  img=render(rows,{o:'#1a0f0a',...ENEMY_PAL[stage%5]},key);
 } else if(key==='wisp'){const p=WISP_PAL[stage%5];img=render(WISP,{o:'#1a0a1a',h:p[0],r:p[1],w:p[2],k:'#1a0a1a',m:'#ff4a6a'},key)}
 else if(key==='golem'){const p=GOLEM_PAL[stage%5];img=render(GOLEM,{o:'#1a1410',a:p[0],g:p[1],k:'#1a1a1a',w:'#ffffff',r:'#3a2a2a'},key)}
 else if(key==='guard'){img=render(GOBLIN,{o:'#0a0a14',g:'#5a6a8a',h:'#c8c8d8',w:'#ffe06a',k:'#1a1a1a',b:'#2a2a4a'},key)}
 else if(key==='shadow'){img=render(BOSS,{o:'#05030a',h:'#8a7ab0',r:'#3a2a5a',k:'#ff4a6a',w:'#c8b8ff',a:'#241a3a',g:'#5a4a8a'},key)}
 else if(key==='cat'){img=render(CAT,PAL.cat,key)}
 else {
  const rows=pose==='back'?BACK:pose==='side'?(frame?SIDE2:SIDE):(frame?FRONT2:FRONT);
  img=render(rows,PAL[key]||PAL.villager,key);
 }
 cache.set(id,img);return img;
}
const whites=new WeakMap();
function white(img){let c=whites.get(img);if(c)return c;c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);whites.set(img,c);return c}
// 그리기: (x,y)=발 아래 중앙 기준
function draw(ctx,key,pose,x,y,scale=1,opt={}){
 const img=get(key,pose,opt.frame||0,opt.stage||0);
 const w=img.width*scale,h=img.height*scale;
 ctx.save();
 if(opt.alpha!=null)ctx.globalAlpha=opt.alpha;
 if(opt.flip){ctx.translate(Math.round(x),0);ctx.scale(-1,1);ctx.drawImage(img,Math.round(-w/2),Math.round(y-h),w,h)}
 else ctx.drawImage(img,Math.round(x-w/2),Math.round(y-h),w,h);
 if(opt.flash>0.02){const wi=white(img);ctx.globalAlpha=Math.min(1,opt.flash)*(opt.alpha??1);if(opt.flip)ctx.drawImage(wi,Math.round(-w/2),Math.round(y-h),w,h);else ctx.drawImage(wi,Math.round(x-w/2),Math.round(y-h),w,h)}
 ctx.restore();
}
function face(cv,key){ // 초상화 (머리 부분 확대)
 const g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,cv.width,cv.height);
 g.fillStyle=key==='sys'?'#1a2a6a':'#0d1442';g.fillRect(0,0,cv.width,cv.height);
 if(key==='sys'){g.fillStyle='#ffd75e';g.font='24px NeoDunggeunmo';g.textAlign='center';g.fillText('!',cv.width/2,cv.height/2+8);return}
 const img=get(key,'front',0,face.stage||0);
 const s=cv.width/12;
 g.drawImage(img,0,0,18,12,-3*s,-0.5*s+2,18*s,12*s);
}
return {get,draw,face,PAL};
})();
