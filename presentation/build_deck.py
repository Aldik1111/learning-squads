"""Build the editable-source, nine-slide hackathon PDF. No app dependencies."""
from pathlib import Path
import json
import math
import os
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parent
STATUS = json.loads((ROOT / "status.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "learning-squads-pitch.pdf"
W, H = 1280, 720
INK, PAPER, MUTED = "#163D35", "#F5F6EF", "#53665F"
MINT, GOLD, CORAL, LINE = "#C9E6C2", "#F0CC69", "#CE6B50", "#CDD8CE"


def register_fonts():
    explicit = os.environ.get("LEARNING_SQUADS_FONT_DIR")
    candidates = [Path(explicit)] if explicit else []
    candidates += [Path("C:/Windows/Fonts"), Path("/usr/share/fonts/truetype/dejavu")]
    for directory in candidates:
        regular, bold = directory / "arial.ttf", directory / "arialbd.ttf"
        if not regular.exists():
            regular, bold = directory / "DejaVuSans.ttf", directory / "DejaVuSans-Bold.ttf"
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("Body", str(regular)))
            pdfmetrics.registerFont(TTFont("Bold", str(bold)))
            pdfmetrics.registerFontFamily("Body", normal="Body", bold="Bold")
            return
    raise RuntimeError("Set LEARNING_SQUADS_FONT_DIR to Arial or DejaVu Sans font files.")


register_fonts()
c = canvas.Canvas(str(OUTPUT), pagesize=(W, H), pageCompression=1)
c.setTitle("Learning Squads - hackathon pitch")
c.setAuthor("Learning Squads")
c.setCreator("Learning Squads presentation/build_deck.py")
c.setSubject("Nine-slide draft; assumptions and verification status are explicit")


def box(x, y, width, height, fill, radius=0, stroke=None):
    c.setFillColor(HexColor(fill))
    c.setStrokeColor(HexColor(stroke or fill))
    c.roundRect(x, H-y-height, width, height, radius, fill=1, stroke=bool(stroke))


def text(value, x, y, width, size=24, color=INK, bold=False, height=None, leading=None):
    style = ParagraphStyle("text", fontName="Bold" if bold else "Body", fontSize=size,
                           leading=leading or size*1.25, textColor=HexColor(color))
    paragraph = Paragraph(value, style)
    _, actual_height = paragraph.wrap(width, 1200)
    if height is not None and actual_height > height + 0.1:
        raise ValueError(f"Text overflows allotted height: {value[:80]} ({actual_height} > {height})")
    paragraph.drawOn(c, x, H-y-actual_height)
    return actual_height


def line(x1, y1, x2, y2, color=LINE, width=2):
    c.setStrokeColor(HexColor(color)); c.setLineWidth(width)
    c.line(x1, H-y1, x2, H-y2)


def circle(x, y, radius, fill):
    c.setFillColor(HexColor(fill)); c.circle(x, H-y, radius, fill=1, stroke=0)


def arrow(x1, y, x2, color=INK):
    line(x1, y, x2, y, color)
    line(x2-10, y-6, x2, y, color)
    line(x2-10, y+6, x2, y, color)


def frame(number, label=None, dark=False):
    box(0, 0, W, H, INK if dark else PAPER)
    footer = MINT if dark else MUTED
    if label:
        text(label, 60, 40, 1100, 15, footer, bold=True)
    text(f"{STATUS['stage']} · {STATUS['date']}", 60, 679, 1000, 13, footer)
    text(f"{number:02d} / 09", 1138, 679, 90, 13, footer)


def title(value, subtitle=None):
    text(value, 60, 83, 1160, 42, bold=True, height=110)
    if subtitle:
        text(subtitle, 60, 153, 1140, 22, MUTED, height=74)


def finish():
    c.showPage()


# 1: promise and scope
frame(1, "SKILLS · WEB MVP", dark=True)
text("Learning<br/>Squads", 60, 117, 780, 78, PAPER, bold=True, height=205, leading=80)
text("От короткого урока<br/>к совместной практике", 65, 327, 890, 35, MINT, height=105)
circle(1060, 236, 106, GOLD)
circle(1161, 378, 66, MINT)
circle(994, 420, 36, CORAL)
text("Материал", 988, 211, 180, 25, INK, bold=True)
text("Практика", 1099, 363, 150, 20, INK, bold=True)
line(64, 514, 1210, 514, "#4B6A59", 1)
for x, name, caption in [(64,"Python","Написать и запустить код"),(464,"How to use AI","Сформулировать и проверить"),(888,"Spanish","Начать разговор")]:
    text(name, x, 548, 350, 24, PAPER, bold=True)
    text(caption, x, 588, 340, 18, MINT)
finish()

# 2: specific target learner, clearly a hypothesis
frame(2, "ПОЛЬЗОВАТЕЛЬ И ПРОБЛЕМА")
title("Знать материал - ещё не значит практиковаться")
text("Наша стартовая аудитория: работающие взрослые США, 25-45 лет.",60,153,1130,23,MUTED)
text("20", 60, 267, 400, 132, INK, bold=True, leading=140)
text("минут после работы", 67, 420, 400, 29, bold=True)
text("Пример ситуации, а не измеренная<br/>длительность обучения.", 67, 473, 390, 19, MUTED)
line(506, 254, 506, 572, LINE, 2)
for y, number, heading, description in [(260,"01","Хочет освоить навык","Материалов достаточно, но непонятен следующий шаг."),(374,"02","Доходит до упражнения","Нужны понятная проверка и объяснение ошибки."),(488,"03","Откладывает разговор","Найти готового к практике человека приходится отдельно.")]:
    text(number,555,y,60,21,CORAL,bold=True)
    text(heading,625,y-2,575,26,bold=True)
    text(description,625,y+40,550,20,MUTED,height=70)
text("Гипотеза для интервью: соединение этих шагов поможет чаще доходить до практики.",60,616,1150,20,INK,bold=True)
finish()

# 3: product loop
frame(3,"РЕШЕНИЕ")
title("Урок, проверка и люди - в одном пути")
steps=[("01","Изучить","Короткий материал и примеры.<br/>Можно начать одному."),("02","Проверить","Тест с объяснениями.<br/>Для Python - запуск кода."),("03","Практиковаться","Найти собеседника или команду.<br/>Перейти в Google Meet.")]
for i,(n,h,b) in enumerate(steps):
    x=60+i*400
    circle(x+34,282,34,[MINT,GOLD,MINT][i]);text(n,x+15,267,50,22,bold=True)
    text(h,x,350,350,31,bold=True)
    text(b,x,403,345,23,MUTED,height=105)
    if i<2: arrow(x+109,282,x+342)
box(60,558,1160,72,INK,10)
text("Без формы регистрации: гостевой профиль создаётся автоматически.",86,580,1110,23,PAPER,bold=True)
finish()

# 4: actual UI, no synthetic screenshot
frame(4,"ПРОДУКТ")
title("Три направления. Один понятный старт.")
image = ImageReader(str(ROOT / "assets" / "catalog-local.png"))
iw, ih = image.getSize(); scale = min(1160/iw, 440/ih)
dw, dh = iw*scale, ih*scale
c.drawImage(image, 60+(1160-dw)/2, H-190-dh, width=dw, height=dh, mask="auto")
text(STATUS["snapshot_note"],60,635,1160,15,MUTED,height=35)
finish()

# 5: social practice rules
frame(5,"СОВМЕСТНАЯ ПРАКТИКА")
title("Собеседник доступен сейчас - можно начать")
for x,heading,body in [(60,"Готовность","Основной язык +<br/>включённый режим общения"),(463,"Приглашение","Случайный подходящий<br/>пользователь или сокомандники"),(867,"Созвон","Настоящая Meet-ссылка<br/>от организатора")]:
    text(heading,x,263,330,29,bold=True)
    text(body,x,318,330,22,MUTED,height=90)
arrow(365,287,423);arrow(769,287,827)
line(60,445,1220,445)
for x,metric,body in [(60,"4","человека максимум<br/>в одной команде"),(463,"Без лимита","1:1 и групповые созвоны<br/>по договорённости"),(867,"15 минут","суммарная языковая<br/>практика на модуль")]:
    text(metric,x,477,340,37,bold=True)
    text(body,x,536,340,20,MUTED,height=70)
text("Язык указан самим пользователем. Время с перехода в Meet не доказывает присутствие.",60,632,1150,17,MUTED,height=30)
finish()

# 6: comparison of workflows, not unsupported competitor claims
frame(6,"ОТЛИЧИЕ")
title("Сокращаем путь между уроком и разговором")
text("Сравнение способов организации обучения, а не аудит конкурентов.",60,153,1160,21,MUTED)
rows=[("Самостоятельно","Материал → собственная проверка → поиск практики"),("Собрать вручную","Курс + чат + участники + ссылка на встречу"),("Learning Squads","Материал → обратная связь → доступные люди")]
for i,(label,content) in enumerate(rows):
    y=258+i*115
    if i==2:box(60,y-20,1160,96,MINT,0)
    text(label,82,y,320,26,bold=True)
    text(content,420,y+3,755,23,INK if i==2 else MUTED,height=65)
    if i<2:line(80,y+75,1200,y+75)
text("Проверяемая гипотеза",60,601,340,19,CORAL,bold=True)
text("Меньше ручных согласований - больше завершённых практик.",403,599,805,22,bold=True,height=60)
finish()

# 7: measurement plan, not fake traction
frame(7,"ЦЕННОСТЬ И УДЕРЖАНИЕ")
title("Возврат ради следующей практики")
text("Гипотеза: обратная связь и договорённость с людьми создают причину вернуться.",60,153,1160,23,MUTED,height=65)
text("Первый модуль",60,272,480,31,bold=True)
arrow(60,328,440)
text("Понятный результат",60,357,480,31,bold=True)
arrow(60,414,440)
text("Следующая практика",60,442,490,31,bold=True)
line(578,260,578,578)
text("Что измерим в пилоте",635,262,575,27,bold=True)
metrics=[("Активация","Доля новичков, отправивших первый тест."),("Практика","Доля приглашений, принятых собеседником."),("Возврат D7","Учебное действие на седьмой день после старта.")]
for i,(h,b) in enumerate(metrics):
    y=319+i*89;text(h,635,y,560,21,CORAL,bold=True);text(b,635,y+31,550,19,MUTED,height=60)
text("Первый канал - тематические сообщества и приглашения друзей. Это план пилота; метрик спроса и удержания пока нет.",60,616,1160,19,MUTED,height=50)
finish()

# 8: transparent business arithmetic
frame(8,"БИЗНЕС-ГИПОТЕЗА")
title("Подписка обсуждается. Экономику ещё проверяем.")
text("В MVP нет оплаты и утверждённой цены.",60,153,1160,23,MUTED)
text("Что можно проверять",60,256,460,28,bold=True)
text("Готовность платить за расширенную практику, новые модули и возможности команд.",60,308,453,24,MUTED,height=120)
text("До выбора модели: интервью,<br/>тест предложения, удержание<br/>и реальные затраты поддержки.",60,441,460,22,MUTED,height=110)
text("$100 млн ARR: арифметика масштаба",585,248,625,26,bold=True)
text("ARR = 12 × p × N",585,293,620,25,INK,bold=True)
text("p / месяц",590,351,200,18,MUTED,bold=True);text("Нужно платящих N",862,351,340,18,MUTED,bold=True)
for i,p in enumerate([10,20,30]):
    y=394+i*54
    line(585,y-10,1215,y-10)
    text(f"${p}",590,y,200,26,bold=True)
    text(f"{math.ceil(100_000_000/(12*p)):,}".replace(","," "),862,y,340,26,bold=True)
text("Иллюстративные цены. Не прогноз и не оценка рынка.",585,568,625,17,MUTED)
box(60,610,1160,51,INK,0)
text("Упрощённо: LTV ≈ p × валовая маржа / месячный отток. Требование: LTV > CAC.",80,625,1120,19,PAPER,bold=True,height=35)
finish()

# 9: readiness/evidence, refresh only after verified deployment
frame(9,"ПРОВЕРКА ПЕРЕД СДАЧЕЙ",dark=True)
text("Показать работающий путь.<br/>Подтвердить его проверками.",60,91,1160,43,PAPER,bold=True,height=125)
text("Подтверждено проверками",60,266,560,27,MINT,bold=True)
for i,item in enumerate(STATUS["verified"]):
    text(f"{i+1:02d}",60,322+i*64,50,20,GOLD,bold=True)
    text(item,121,320+i*64,490,22,PAPER,height=55)
text("До финальной сдачи",681,266,540,27,MINT,bold=True)
for i,item in enumerate(STATUS["pending"]):
    text(f"{i+1:02d}",681,322+i*64,50,20,GOLD,bold=True)
    text(item,742,320+i*64,470,22,PAPER,height=55)
line(60,546,1220,546,"#4B6A59",1)
text("Код и проверяемый статус",60,571,530,24,PAPER,bold=True)
text("github.com/Aldik1111/learning-squads",60,613,760,21,MINT)
c.linkURL(STATUS["repository"],(60,H-646,800,H-610),relative=0)
if STATUS["live_url"]:
    text("Публичный сайт →",835,571,375,24,PAPER,bold=True)
    text(STATUS["live_url"].removeprefix("https://"),835,612,375,16,MINT,height=55)
    c.linkURL(STATUS["live_url"],(835,H-665,1210,H-570),relative=0)
else:
    text("Публичный URL<br/>ещё не подтверждён",835,582,375,21,GOLD,height=70)
finish()
c.save()
print(OUTPUT)
