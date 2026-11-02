"""교사용 문제 업로드 템플릿(엑셀) 만들기: python3 tools/make_template.py
결과: assets/question-template.xlsx  (게임의 교사용 메뉴 › 문제 관리에서 내려받기·올리기)
"""
import pathlib
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

root = pathlib.Path(__file__).resolve().parent.parent
HEAD = ['장', '질문', '보기1', '보기2', '보기3', '보기4', '정답', '해설']
WIDTH = [9, 46, 22, 22, 22, 22, 14, 44]
EXAMPLES = [
    ['1', '(예시) 단톡방에서 친구를 놀리는 글을 보았을 때 알맞은 행동은?', '같이 웃는 이모티콘을 보낸다', '멈추자고 말하거나 어른에게 알린다', '다른 방에 퍼뜨린다', '', '2', '차별적인 말에는 동조하지 않아요.'],
    ['전체', '(예시) 성별과 관계없이 좋아하는 색을 고를 수 있다.', '', '', '', '', 'O', '누구나 자신의 취향을 가질 수 있어요.'],
    ['2', '(예시) 온라인에서 처음 만난 사람에게 이야기해도 괜찮은 것은?', '우리 집 주소', '다니는 학교 이름', '좋아하는 게임 장르', '', '좋아하는 게임 장르', '나를 알아볼 수 있는 신상정보는 알려 주지 않아요.'],
]
thin = Side(style='thin', color='9AA3C8')
box = Border(left=thin, right=thin, top=thin, bottom=thin)

wb = Workbook()
ws = wb.active
ws.title = '문제'
ws.append(HEAD)
for i, w in enumerate(WIDTH):
    ws.column_dimensions[chr(65 + i)].width = w
for c in ws[1]:
    c.font = Font(bold=True, color='FFFFFF', size=12)
    c.fill = PatternFill('solid', fgColor='2A3F9E')
    c.alignment = Alignment(horizontal='center', vertical='center')
    c.border = box
ws.row_dimensions[1].height = 24
for r in EXAMPLES:
    ws.append(r)
for row in ws.iter_rows(min_row=2, max_row=1 + len(EXAMPLES)):
    for c in row:
        c.font = Font(italic=True, color='7A7F99')
        c.fill = PatternFill('solid', fgColor='F1F2F8')
        c.border = box
        c.alignment = Alignment(vertical='center', wrap_text=True)
for r in range(2 + len(EXAMPLES), 102):
    for col in range(1, 9):
        cell = ws.cell(row=r, column=col)
        cell.border = box
        cell.alignment = Alignment(vertical='center', wrap_text=True)
ws.freeze_panes = 'B2'
dv = DataValidation(type='list', formula1='"1,2,3,4,5,전체"', allow_blank=True,
                    promptTitle='장', prompt='문제가 나올 장: 1~5 또는 전체', showInputMessage=True)
ws.add_data_validation(dv)
dv.add('A2:A300')
dv2 = DataValidation(type='none', allow_blank=True, promptTitle='정답',
                     prompt='보기 번호(1~4), 정답 보기의 글자, 또는 O/X', showInputMessage=True)
ws.add_data_validation(dv2)
dv2.add('G2:G300')

guide = wb.create_sheet('작성 방법')
lines = [
    ('평등의 나라 · 선생님 문제 템플릿', True),
    ('', False),
    ('1. 「문제」 시트의 3번째 줄 아래부터 한 줄에 한 문제씩 적어요. 회색 (예시) 줄은 지워도 되고, 그대로 두면 자동으로 건너뛰어요.', False),
    ('2. 장: 1~5 중 하나, 또는 「전체」(모든 장에서 출제). 비워 두면 전체로 들어가요.', False),
    ('3. 질문: 학생에게 보여 줄 문제 (240자 이내).', False),
    ('4. 보기1~보기4: 2~4개를 적어요(각 100자 이내). 보기3·4는 비워도 돼요.', False),
    ('5. 정답: 보기 번호(1~4) 또는 정답 보기의 글자를 그대로 적어요.', False),
    ('   O/X 문제는 보기를 비우고 정답에 O 또는 X만 적으면 「O · 맞아요 / X · 아니에요」 보기가 자동으로 만들어져요.', False),
    ('6. 해설: 학생이 틀렸을 때 보여 줄 설명 (300자 이내, 비워도 돼요).', False),
    ('', False),
    ('올리기: 게임의 「교사용」 › 「문제 관리」 › 「파일 올리기」에서 이 파일(.xlsx)이나 CSV를 고르면, 미리보기로 확인한 뒤 추가할 수 있어요.', False),
    ('구글 시트: 같은 열 순서로 작성한 뒤 「파일 › 다운로드 › Microsoft Excel(.xlsx)」 또는 「CSV」로 내려받아 올려요.', False),
    ('엑셀에서 여러 줄을 복사해 「직접 붙여넣기」 칸에 붙여 넣어도 돼요.', False),
]
guide.column_dimensions['A'].width = 120
for t, bold in lines:
    guide.append([t])
    c = guide.cell(row=guide.max_row, column=1)
    c.font = Font(bold=bold, size=14 if bold else 11, color='2A3F9E' if bold else '222222')
    c.alignment = Alignment(wrap_text=True, vertical='top')

out = root / 'assets' / 'question-template.xlsx'
wb.save(out)
print(out, out.stat().st_size)
