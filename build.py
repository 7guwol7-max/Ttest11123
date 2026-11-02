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
