// 교사 문제 템플릿: 엑셀(.xlsx)·CSV 읽기, 엑셀에서 복사한 표 붙여넣기, CSV 템플릿·내보내기 만들기
// 외부 라이브러리 없이 동작(엑셀 압축은 브라우저 내장 DecompressionStream으로 풂)
const QTEMPLATE_URL='assets/question-template.xlsx';
const QHEAD=['장','질문','보기1','보기2','보기3','보기4','정답','해설'];
const QOX=['O · 맞아요','X · 아니에요'];
const QEXAMPLES=[
 ['1','(예시) 단톡방에서 친구를 놀리는 글을 보았을 때 알맞은 행동은?','같이 웃는 이모티콘을 보낸다','멈추자고 말하거나 어른에게 알린다','다른 방에 퍼뜨린다','','2','차별적인 말에는 동조하지 않아요.'],
 ['전체','(예시) 성별과 관계없이 좋아하는 색을 고를 수 있다.','','','','','O','누구나 자신의 취향을 가질 수 있어요.'],
 ['2','(예시) 온라인에서 처음 만난 사람에게 이야기해도 괜찮은 것은?','우리 집 주소','다니는 학교 이름','좋아하는 게임 장르','','좋아하는 게임 장르','나를 알아볼 수 있는 신상정보는 알려 주지 않아요.']
];

// ---------- 엑셀(.xlsx = ZIP + XML) ----------
async function qInflate(u8){const ds=new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new Uint8Array(await new Response(ds).arrayBuffer())}
function qUnzip(buf){
 const dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);let eocd=-1;
 for(let i=buf.length-22;i>=Math.max(0,buf.length-65558);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break}}
 if(eocd<0)throw new Error('엑셀 파일 구조를 읽지 못했어요.');
 const n=dv.getUint16(eocd+10,true);let p=dv.getUint32(eocd+16,true);const files=new Map(),dec=new TextDecoder();
 for(let k=0;k<n;k++){
  if(dv.getUint32(p,true)!==0x02014b50)throw new Error('엑셀 파일 구조를 읽지 못했어요.');
  const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nlen=dv.getUint16(p+28,true),xlen=dv.getUint16(p+30,true),clen=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
  files.set(dec.decode(buf.subarray(p+46,p+46+nlen)).replace(/\\/g,'/'),{method,csize,off});p+=46+nlen+xlen+clen;
 }
 const find=name=>files.get(name)||[...files.entries()].find(([k])=>k.toLowerCase()===name.toLowerCase())?.[1];
 return {async get(name){const f=find(name);if(!f)return null;const s=f.off+30+dv.getUint16(f.off+26,true)+dv.getUint16(f.off+28,true);const data=buf.subarray(s,s+f.csize);
  const raw=f.method===0?data:f.method===8?await qInflate(data):null;if(!raw)throw new Error('지원하지 않는 엑셀 압축 방식이에요.');return new TextDecoder().decode(raw)}};
}
function qCol(letters){let n=0;for(const ch of letters.toUpperCase())n=n*26+(ch.charCodeAt(0)-64);return n-1}
function qTexts(el){return [...el.getElementsByTagName('t')].filter(t=>!(t.parentNode&&t.parentNode.nodeName==='rPh')).map(t=>t.textContent).join('')}
async function readXlsx(buf){
 if(typeof DecompressionStream!=='function')throw new Error('이 브라우저는 엑셀 파일을 읽을 수 없어요. CSV로 저장해 올려 주세요.');
 const z=qUnzip(buf),P=s=>new DOMParser().parseFromString(s||'<x/>','application/xml');
 const wb=P(await z.get('xl/workbook.xml'));
 const sheets=[...wb.getElementsByTagName('sheet')];if(!sheets.length)throw new Error('엑셀 시트를 찾지 못했어요.');
 const sheet=sheets.find(s=>(s.getAttribute('name')||'').trim()==='문제')||sheets[0];
 const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
 const rels=P(await z.get('xl/_rels/workbook.xml.rels'));
 let target=([...rels.getElementsByTagName('Relationship')].find(r=>r.getAttribute('Id')===rid)||{getAttribute:()=>null}).getAttribute('Target')||'worksheets/sheet1.xml';
 target=target.replace(/^\//,'').replace(/^xl\//,'');
 const ssTxt=await z.get('xl/sharedStrings.xml');
 const shared=ssTxt?[...P(ssTxt).getElementsByTagName('si')].map(qTexts):[];
 const sx=P(await z.get('xl/'+target));
 const rows=[];
 for(const r of sx.getElementsByTagName('row')){
  const ri=(+r.getAttribute('r')||rows.length+1)-1;const row=[];let ci=0;
  for(const c of r.getElementsByTagName('c')){
   const ref=c.getAttribute('r');if(ref)ci=qCol(ref.replace(/[0-9]/g,''));
   const t=c.getAttribute('t'),vEl=c.getElementsByTagName('v')[0];let v='';
   if(t==='s')v=vEl?shared[+vEl.textContent]??'':'';
   else if(t==='inlineStr')v=qTexts(c);
   else if(t==='b')v=vEl&&vEl.textContent==='1'?'TRUE':'FALSE';
   else v=vEl?vEl.textContent:'';
   if(/^-?\d+\.0+$/.test(v))v=v.replace(/\.0+$/,'');
   row[ci]=v;ci++;
  }
  rows[ri]=row;
 }
 return Array.from(rows,r=>r||[]);
}

// ---------- CSV ----------
function decodeText(buf){
 let s=new TextDecoder('utf-8').decode(buf);
 if(s.includes('�')){try{s=new TextDecoder('euc-kr').decode(buf)}catch{}}  // 엑셀 한글 CSV(CP949)
 return s.replace(/^﻿/,'');
}
function parseCSV(text){
 const first=text.split(/\r?\n/,1)[0]||'';
 const delim=first.includes('\t')?'\t':(first.split(';').length>first.split(',').length?';':',');
 const rows=[];let row=[],f='',q=false,start=true;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(q){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=ch;continue}
  if(ch==='"'&&start){q=true;start=false;continue}
  if(ch===delim){row.push(f);f='';start=true;continue}
  if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f='';start=true;continue}
  f+=ch;start=false;
 }
 if(f!==''||row.length){row.push(f);rows.push(row)}
 return rows;
}

// ---------- 표 → 문제 ----------
function rowsToQuestions(rows){
 const norm=c=>String(c??'').replace(/\s/g,'');
 const hi=rows.findIndex(r=>r&&r.some(c=>['질문','문제'].includes(norm(c))));
 let map={stage:0,text:1,c:[2,3,4,5],ans:6,exp:7};
 if(hi>=0){const h=rows[hi].map(norm);const f=pred=>h.findIndex(pred);
  map={stage:f(c=>c==='장'||/^장\(/.test(c)||c==='단원'),text:f(c=>c==='질문'||c==='문제'),c:[1,2,3,4].map(k=>f(c=>c==='보기'+k||c==='선택지'+k)),ans:f(c=>c.startsWith('정답')),exp:f(c=>c.startsWith('해설'))}}
 const ok=[],bad=[];let examples=0;
 for(let i=(hi>=0?hi+1:0);i<rows.length;i++){
  const r=rows[i]||[];const g=k=>k>=0?String(r[k]??'').trim():'';
  const text=g(map.text),chs=map.c.map(g),ansRaw=g(map.ans),stRaw=g(map.stage),line=i+1;
  if(!text&&!chs.some(Boolean)&&!ansRaw)continue;
  if(/^\(예시\)/.test(text)){examples++;continue}
  const fail=reason=>bad.push({line,reason,text});
  const st=stRaw.replace(/\s|장/g,'');let stage;
  if(!st||/^(전체|모든|모두|all|0)$/i.test(st))stage='all';else if(/^[1-5]$/.test(st))stage=+st-1;else{fail(`장 「${stRaw}」 → 1~5 또는 「전체」로 적어 주세요`);continue}
  let choices=[];const idx=[];chs.forEach((c,k)=>{if(c){choices.push(c);idx.push(k)}});
  const a=ansRaw.replace(/\s/g,'');let answer=-1;
  const isO=/^(o|○|◯|맞아요|맞음|맞다|참|true)$/i.test(a),isX=/^(x|×|✕|아니에요|아님|틀리다|틀림|거짓|false)$/i.test(a);
  if(!text){fail('질문이 비어 있어요');continue}
  if(!choices.length&&(isO||isX)){choices=QOX.slice();answer=isO?0:1}
  else if(/^[1-4]번?$/.test(a)){const k=+a[0]-1;answer=idx.indexOf(k);if(answer<0){fail(`정답 ${k+1}번 보기가 비어 있어요`);continue}}
  else if(a){answer=choices.findIndex(c=>c===ansRaw.trim()||c.replace(/\s/g,'')===a);
   if(answer<0&&(isO||isX)&&choices.length===2)answer=isO?0:1;
   if(answer<0){fail(`정답 「${ansRaw}」에 맞는 보기가 없어요 (번호 1~4, 보기 글자 그대로, 또는 O/X)`);continue}}
  if(choices.length<2){fail('보기를 2개 이상 적어 주세요 (O/X 문제는 보기를 비우고 정답에 O 또는 X)');continue}
  if(answer<0){fail('정답을 적어 주세요 (보기 번호, 정답 글자, 또는 O/X)');continue}
  const q=cleanQuestion({stage,text,choices,answer,explain:g(map.exp)});
  if(!q){fail('형식을 확인해 주세요');continue}
  q.line=line;q.cut=text.length>240||choices.some(c=>c.length>100)||g(map.exp).length>300;ok.push(q);
 }
 return {ok,bad,examples};
}
async function readQuestionFile(file){
 if(file.size>3000000)throw new Error('파일이 너무 커요 (3MB 이하로 올려 주세요).');
 const buf=new Uint8Array(await file.arrayBuffer());
 const isZip=buf[0]===0x50&&buf[1]===0x4b;
 if(!isZip&&/\.xls$/i.test(file.name))throw new Error('예전 엑셀 형식(.xls)은 읽을 수 없어요. 엑셀에서 「다른 이름으로 저장 › Excel 통합 문서(.xlsx)」로 저장해 올려 주세요.');
 if(!isZip&&/\.(hwp|hwpx|docx?|pdf)$/i.test(file.name))throw new Error('엑셀(.xlsx)이나 CSV 파일만 올릴 수 있어요. 템플릿을 내려받아 작성해 주세요.');
 return rowsToQuestions(isZip?await readXlsx(buf):parseCSV(decodeText(buf)));
}

// ---------- 내보내기 ----------
function qCsvCell(v){v=String(v??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function questionsToCSV(qs,withExamples){
 const rows=[QHEAD];if(withExamples)rows.push(...QEXAMPLES);
 for(const q of qs){const ox=q.choices.length===2&&q.choices[0]===QOX[0]&&q.choices[1]===QOX[1];
  rows.push([q.stage==='all'?'전체':String(q.stage+1),q.text,...(ox?['','','','']:[0,1,2,3].map(k=>q.choices[k]||'')),ox?(q.answer===0?'O':'X'):String(q.answer+1),q.explain||''])}
 return '﻿'+rows.map(r=>r.map(qCsvCell).join(',')).join('\r\n')+'\r\n';
}
function qDownload(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
