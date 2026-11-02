# 단일 HTML 파일(오프라인용) 생성: python3 build.py
import base64,re,pathlib
root=pathlib.Path(__file__).parent
html=(root/'index.html').read_text(encoding='utf-8')
css=(root/'style.css').read_text(encoding='utf-8')
font=base64.b64encode((root/'assets/neodgm.woff2').read_bytes()).decode()
css=css.replace("url('assets/neodgm.woff2')","url('data:font/woff2;base64,"+font+"')")
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
def inline(m):
    return '<script>'+(root/m.group(1)).read_text(encoding='utf-8')+'</script>'
html=re.sub(r'<script src="([^"]+)"></script>',inline,html)
lic=(root/'assets/OFL-neodgm.txt').read_text(encoding='utf-8')
html=html.replace('</body>','<script id="font-license" type="text/plain">'+lic.replace('</','<\\/')+'</script>\n</body>')
out=root/'평등의나라_취풍무협전.html'
out.write_text(html,encoding='utf-8');print(out.name,len(html))

# 우리 반 연동판(class.html) 생성: index.html을 바탕으로 반 코드 입장·서버 동기화를 더한다
src=(root/'index.html').read_text(encoding='utf-8')
def rep(s,a,b):
    assert s.count(a)==1,a
    return s.replace(a,b)
c=src
c=rep(c,'<title>평등의 나라 · 취풍 무협전</title>','<title>평등의 나라 · 우리 반 연동판</title>')
c=rep(c,'<div class="title">평등의 나라 <span>취풍 무협전</span></div>','<div class="title">평등의 나라 <span>취풍 무협전 · 우리 반</span></div>')
c=rep(c,'<script src="js/questions.js"></script>','<script>window.CLASS_STORE_KEY="equality-rpg-class-live-v1"</script>\n<script src="js/questions.js"></script>')
c=rep(c,'<script src="js/teacher.js"></script>','<script src="js/teacher.js"></script>\n<script src="js/classsync.js"></script>')
c=rep(c,'        <p class="classnote" id="classnote" hidden></p>','        <div class="cjoin"><b>🏫 우리 반 연동판</b><div class="cjrow"><input id="ccode" maxlength="6" placeholder="반 코드 (예: AB12CD)" autocomplete="off" aria-label="우리 반 코드"><button id="cjoinbtn">반 입장</button></div><small id="cjoinstate"></small> <small id="cjoinmsg"></small></div>\n        <p class="classnote" id="classnote" hidden></p>')
c=rep(c,'    <div class="zone" id="zone" hidden></div>','    <div class="zone" id="zone" hidden></div>\n    <div class="synctoast" id="synctoast" hidden></div>')
c=rep(c,'<span id="teachbadge" hidden></span>','<span id="classbadge" hidden></span> <span id="teachbadge" hidden></span>')
(root/'class.html').write_text('<!-- 자동 생성: python3 build.py (index.html을 고친 뒤 다시 실행) -->\n'+c,encoding='utf-8');print('class.html',len(c))
