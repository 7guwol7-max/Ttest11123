// 자체 작곡 칩튠 (5음계) + 효과음
const Music=(()=>{
let ac=null,master=null,enabled=true,song=null,tracks=[],timer=null,cur='';
const N={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
function midi(n){const m=n.match(/^([A-G]#?)(\d)$/);return m?12*(+m[2]+1)+N[m[1]]:null}
function parse(str){return str.trim().split(/\s+/).map(t=>{const [n,d]=t.split(':');return [n==='-'?null:midi(n),+d]})}
function bassLine(roots){const out=[];for(const r of roots){for(let i=0;i<4;i++){out.push(r+'2:1');out.push(r+'3:1')}}return out.join(' ')}
const SONGS={
 field:{bpm:112,tracks:[
  {wave:'square',vol:.05,seq:parse('A4:2 C5:2 D5:2 E5:2 G5:3 E5:1 D5:4 E5:2 D5:2 C5:2 A4:2 D5:6 -:2 A4:2 C5:2 D5:2 E5:2 G5:2 A5:2 G5:2 E5:2 D5:2 E5:2 C5:2 D5:2 A4:6 -:2 E5:2 G5:2 A5:4 G5:2 E5:2 D5:4 C5:2 D5:2 E5:2 G5:2 E5:6 -:2 D5:2 E5:2 G5:2 E5:2 D5:2 C5:2 A4:4 C5:2 D5:2 C5:2 G4:2 A4:6 -:2')},
  {wave:'triangle',vol:.09,seq:parse('A2:4 E3:4 C3:4 G3:4 F2:4 C3:4 G2:4 D3:4 A2:4 E3:4 C3:4 G3:4 D3:4 G2:4 A2:4 E2:4 C3:4 G3:4 F2:4 C3:4 A2:4 E3:4 E2:4 B2:4 D3:4 A2:4 F2:4 C3:4 G2:4 D3:4 A2:4 E2:4')},
  {wave:'noise',vol:.025,seq:parse('C4:2 -:2 C4:1 C4:1 -:2').concat(...Array(31).fill(parse('C4:2 -:2 C4:1 C4:1 -:2')))}
 ]},
 battle:{bpm:156,tracks:[
  {wave:'square',vol:.05,seq:parse('E5:1 E5:1 G5:1 E5:1 A5:2 G5:2 E5:1 D5:1 E5:2 B4:4 D5:1 D5:1 E5:1 D5:1 G5:2 E5:2 D5:2 B4:2 A4:4 E5:1 E5:1 G5:1 A5:1 B5:2 A5:2 G5:2 E5:2 D5:2 E5:2 G5:1 A5:1 G5:1 E5:1 D5:2 B4:2 E5:6 -:2')},
  {wave:'triangle',vol:.1,seq:parse(bassLine(['E','E','D','D','C','C','D','E']))},
  {wave:'noise',vol:.03,seq:[].concat(...Array(16).fill(parse('C4:1 -:1 C4:1 C4:1')))}
 ]},
 boss:{bpm:168,tracks:[
  {wave:'square',vol:.05,seq:parse('A4:1 A4:1 C5:1 A4:1 D5:2 E5:2 G5:1 E5:1 D5:2 C5:4 A4:1 A4:1 C5:1 A4:1 D5:2 E5:2 C5:2 D5:2 A4:4 E5:2 G5:2 A5:2 G5:2 E5:1 G5:1 A5:2 C6:4 A5:1 G5:1 E5:2 D5:2 C5:2 D5:1 E5:1 A4:4 -:2')},
  {wave:'sawtooth',vol:.035,seq:parse(bassLine(['A','A','F','F','C','C','G','A']))},
  {wave:'noise',vol:.035,seq:[].concat(...Array(32).fill(parse('C4:1 C4:1')))}
 ]},
 trial:{bpm:176,tracks:[
  {wave:'square',vol:.05,seq:parse('B4:1 E5:1 G5:1 E5:1 A5:1 G5:1 E5:2 D5:1 E5:1 G5:2 E5:2 B4:2 B4:1 E5:1 G5:1 A5:1 B5:2 A5:2 G5:1 A5:1 G5:1 E5:1 D5:4 E5:1 G5:1 A5:1 B5:1 D6:2 B5:2 A5:1 B5:1 A5:1 G5:1 E5:2 G5:2 A5:2 G5:1 E5:1 D5:2 B4:2 E5:6 -:2')},
  {wave:'triangle',vol:.1,seq:parse(bassLine(['E','E','C','D','E','E','C','B']))},
  {wave:'noise',vol:.035,seq:[].concat(...Array(16).fill(parse('C4:1 C4:1 -:1 C4:1')))}
 ]},
 victory:{bpm:140,once:true,tracks:[
  {wave:'square',vol:.06,seq:parse('E5:1 G5:1 A5:1 C6:3 A5:1 C6:2 D6:2 E6:6 -:2')},
  {wave:'triangle',vol:.1,seq:parse('A3:3 E3:3 A3:2 C4:4 G3:4 A3:6 -:2')}
 ]},
 ending:{bpm:96,tracks:[
  {wave:'square',vol:.045,seq:parse('E5:2 D5:2 C5:2 D5:2 E5:4 G5:4 A5:2 G5:2 E5:2 D5:2 E5:8 C5:2 D5:2 E5:2 G5:2 A5:4 C6:4 A5:2 G5:2 E5:2 G5:2 A5:8')},
  {wave:'triangle',vol:.09,seq:parse('C3:8 G2:8 A2:8 E2:8 F2:8 C3:8 D3:8 A2:8')}
 ]}
};
function ensure(){
 if(ac)return true;
 try{ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.8;master.connect(ac.destination);return true}catch{return false}
}
let noiseBuf=null;
function tone(wave,m,t,dur,vol,dest){
 if(m==null||!ac)return;
 try{toneRaw(wave,m,t,dur,vol,dest)}catch(err){/* 소리 오류가 게임 진행을 막지 않도록 */}
}
function toneRaw(wave,m,t,dur,vol,dest){
 const g=ac.createGain();g.connect(dest||master);
 let src;
 if(wave==='noise'){
  if(!noiseBuf){noiseBuf=ac.createBuffer(1,ac.sampleRate*.2,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  src=ac.createBufferSource();src.buffer=noiseBuf;dur=Math.min(dur,.06);
 }else{src=ac.createOscillator();src.type=wave;src.frequency.value=440*Math.pow(2,(m-69)/12)}
 g.gain.setValueAtTime(vol,t);g.gain.setValueAtTime(vol,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur*.98);
 src.connect(g);src.start(t);src.stop(t+dur);
}
function tick(){
 if(!song||!ac)return;
 const ahead=ac.currentTime+.25,eighth=60/song.bpm/2;let done=true;
 for(const tr of tracks){
  while(tr.t<ahead){
   if(tr.i>=tr.seq.length){if(song.once){tr.t=Infinity;break}tr.i=0}
   const [m,d]=tr.seq[tr.i++];tone(tr.wave,m,tr.t,d*eighth*.95,tr.vol);tr.t+=d*eighth;
  }
  if(tr.t!==Infinity)done=false;
 }
 if(done&&song.once){const next=song.next;song=null;cur='';if(next)play(next)}
}
function play(name,next){
 if(cur===name)return;cur=name;
 if(!enabled){song=null;return}
 if(!ensure())return;ac.resume&&ac.resume();
 song={...SONGS[name],next};const t0=ac.currentTime+.08;
 tracks=song.tracks.map(tr=>({...tr,i:0,t:t0}));
 if(!timer)timer=setInterval(tick,40);
 tick();
}
function stop(){song=null;cur=''}
function setEnabled(v){enabled=v;if(!v){const c=cur;stop();cur=c;if(master)master.gain.value=0}else{if(master)master.gain.value=.8;const c=cur;cur='';if(c)play(c)}}
function sfx(kind){
 if(!enabled||!ensure())return;ac.resume&&ac.resume();const t=ac.currentTime+.01;
 const S={
  select:[['square',84,0,.05,.04]],
  ok:[['square',79,0,.06,.05],['square',86,.06,.09,.05]],
  hit:[['noise',60,0,.08,.12],['square',48,0,.12,.06],['square',43,.05,.12,.05]],
  big:[['noise',60,0,.1,.14],['sawtooth',55,0,.1,.06],['sawtooth',62,.08,.1,.06],['square',74,.16,.2,.05],['noise',60,.16,.1,.1]],
  hurt:[['square',52,0,.09,.06],['square',47,.08,.12,.06],['noise',60,0,.06,.08]],
  wrong:[['sawtooth',46,0,.16,.05],['sawtooth',45,.16,.22,.05]],
  heal:[['triangle',72,0,.08,.1],['triangle',76,.07,.08,.1],['triangle',79,.14,.08,.1],['triangle',84,.21,.16,.1]],
  chime:[['triangle',84,0,.2,.1],['triangle',88,.12,.2,.1],['triangle',91,.24,.4,.1]],
  door:[['square',60,0,.06,.05],['square',67,.07,.06,.05],['square',72,.14,.12,.05]],
  jump:[['square',67,0,.05,.05],['square',74,.05,.05,.05],['square',79,.1,.06,.04]],
  splash:[['noise',60,0,.18,.12],['square',45,0,.15,.05],['triangle',72,.12,.08,.06],['triangle',79,.2,.08,.05]],
  encounter:[['square',72,0,.05,.05],['square',76,.05,.05,.05],['square',79,.1,.05,.05],['square',84,.15,.05,.05],['noise',60,.2,.1,.08]],
  bump:[['square',40,0,.04,.04]]
 }[kind]||[];
 for(const [w,m,dt,d,v] of S)tone(w,m,t+dt,d,v);
}
return {play,stop,sfx,setEnabled,get current(){return cur}};
})();
