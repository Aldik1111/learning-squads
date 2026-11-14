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
text("From a short lesson<br/>to practice with others", 65, 327, 890, 35, MINT, height=105)
circle(1060, 236, 106, GOLD)
circle(1161, 378, 66, MINT)
circle(994, 420, 36, CORAL)
text("Learn", 1019, 211, 180, 25, INK, bold=True)
text("Practise", 1124, 363, 150, 20, INK, bold=True)
line(64, 514, 1210, 514, "#4B6A59", 1)
for x, name, caption in [(64,"Python","Write and run code"),(464,"How to use AI","Ask clearly. Check the answer."),(888,"Spanish","Start a conversation")]:
    text(name, x, 548, 350, 24, PAPER, bold=True)
    text(caption, x, 588, 340, 18, MINT)
finish()

# 2: chosen audience and unvalidated problem hypothesis
frame(2, "USER AND PROBLEM")
title("Knowing the lesson is not the same as practising")
text("Our initial audience: working adults in the US, aged 25–45.",60,153,1130,23,MUTED)
text("20", 60, 267, 400, 132, INK, bold=True, leading=140)
text("minutes after work", 67, 420, 400, 29, bold=True)
text("An illustrative situation,<br/>not measured learning time.", 67, 473, 390, 19, MUTED)
line(506, 254, 506, 572, LINE, 2)
for y, number, heading, description in [(260,"01","Wants to learn a skill","Plenty of material, but the next step is unclear."),(374,"02","Reaches the exercise","Needs a clear check and an explanation of mistakes."),(488,"03","Puts off the conversation","Finding someone ready to practise is a separate task.")]:
    text(number,555,y,60,21,CORAL,bold=True)
    text(heading,625,y-2,575,26,bold=True)
    text(description,625,y+40,550,20,MUTED,height=70)
text("Interview hypothesis: connecting these steps helps people get to practice more often.",60,616,1150,20,INK,bold=True)
finish()

# 3: product loop
frame(3,"SOLUTION")
title("A lesson, a check and people in one journey")
steps=[("01","Learn","A short lesson and examples.<br/>Start on your own."),("02","Check","A quiz with explanations.<br/>For Python: run real code."),("03","Practise","Python / AI: an assigned group.<br/>Spanish: one-to-one practice.")]
for i,(n,h,b) in enumerate(steps):
    x=60+i*400
    circle(x+34,282,34,[MINT,GOLD,MINT][i]);text(n,x+15,267,50,22,bold=True)
    text(h,x,350,350,31,bold=True)
    text(b,x,403,345,23,MUTED,height=105)
    if i<2: arrow(x+109,282,x+342)
box(60,558,1160,72,INK,10)
text("No signup form: a guest profile is created automatically.",86,580,1110,23,PAPER,bold=True)
finish()

# 4: actual new-release plans screen, full original capture retained
frame(4,"PRODUCT")
title("A free MVP. A clear $19/month demo.")
image = ImageReader(str(ROOT / "assets" / "published-plans-5ad4.png"))
iw, ih = image.getSize(); crop_x, crop_y, crop_w, crop_h = 380, 250, 1140, 640
scale = min(1160/crop_w, 440/crop_h); dw, dh = crop_w*scale, crop_h*scale
image_x = 60 + (1160-dw)/2
c.saveState()
clip = c.beginPath(); clip.rect(image_x, H-190-dh, dw, dh)
c.clipPath(clip, stroke=0, fill=0)
c.drawImage(image, image_x-crop_x*scale, H-190+crop_y*scale-ih*scale, width=iw*scale, height=ih*scale, mask="auto")
c.restoreState()
text(STATUS["snapshot_note"],60,635,1160,15,MUTED,height=35)
finish()

# 5: GROUPS-002 approved rules; source draft until release alignment
frame(5,"PRACTICE TOGETHER")
title("One shared schedule. Two ways to practise.")
text("GROUPS-002 · implemented locally; deployment and live Meet checks pending",60,153,1160,20,CORAL,height=55)
box(60,238,740,327,MINT,10)
text("Python + How to use AI",84,262,690,29,bold=True)
text("An automatically numbered group, up to 4 people.<br/>One active group per course, matched by shared availability.",84,313,686,22,MUTED,height=94)
text("Members-only chat, progress and calendar.<br/>Change your schedule: rematch without losing personal progress.",84,415,686,22,INK,height=100)
text("Spanish",854,264,366,29,bold=True)
text("No course groups.<br/>One-to-one matching with an available speaker whose primary language is Spanish.",854,317,360,22,MUTED,height=170)
text("15 minutes per module",854,510,360,23,bold=True,height=58)
text("Server-created Meet links are in local implementation. Real admission is not verified.",60,595,1150,18,MUTED,height=30)
text("Language is self-reported. Time since opening Meet is not proof of attendance.",60,632,1150,17,MUTED,height=30)
finish()

# 6: workflows, not claims about named competitors
frame(6,"WHAT IS DIFFERENT")
title("Fewer steps between a lesson and a conversation")
text("A comparison of learning workflows, not an audit of competitors.",60,153,1160,21,MUTED)
rows=[("Self-study","Material → self-check → find practice"),("Assemble it yourself","Course + chat + people + meeting link"),("Learning Squads","Feedback → matched group or language partner")]
for i,(label,content) in enumerate(rows):
    y=258+i*115
    if i==2:box(60,y-20,1160,96,MINT,0)
    text(label,82,y,320,26,bold=True)
    text(content,420,y+3,755,23,INK if i==2 else MUTED,height=65)
    if i<2:line(80,y+75,1200,y+75)
text("Hypothesis to test",60,601,340,19,CORAL,bold=True)
text("Less coordination could mean more completed practice.",403,599,805,22,bold=True,height=60)
finish()

# 7: measurement plan, not invented traction
frame(7,"VALUE AND RETENTION")
title("Come back for the next practice")
text("Hypothesis: feedback and a plan with others create a reason to return.",60,153,1160,23,MUTED,height=65)
text("First module",60,272,480,31,bold=True)
arrow(60,328,440)
text("Clear feedback",60,357,480,31,bold=True)
arrow(60,414,440)
text("Next practice",60,442,490,31,bold=True)
line(578,260,578,578)
text("What we will measure in a pilot",635,262,575,27,bold=True)
metrics=[("Activation","Share of new guests who submit their first quiz."),("Practice","Share of invitations accepted by a partner."),("Day 7 return","A learning action on the seventh day after starting.")]
for i,(h,b) in enumerate(metrics):
    y=319+i*89;text(h,635,y,560,21,CORAL,bold=True);text(b,635,y+31,550,19,MUTED,height=60)
text("First channels: interest communities and friend invitations. This is a pilot plan; demand and retention are not measured yet.",60,616,1160,19,MUTED,height=50)
finish()

# 8: owner-approved demo price; explicit illustrative economics, not traction
frame(8,"BUSINESS HYPOTHESIS")
title("$19/month. A hypothesis to test.")
text("Demo price only. No charge. All current MVP features remain free.",60,153,1160,23,MUTED)
text("Illustrative pilot inputs",60,248,475,28,bold=True)
for y,label,value in [(304,"Gross margin","80% assumed"),(366,"Monthly retention","90% assumed"),(428,"Acquisition scenario","$400 / 10 hypothetical payers")]:
    text(label,60,y,475,22,bold=True)
    text(value,60,y+29,475,21,MUTED,height=53)
text("Test willingness to pay; measure real costs,<br/>conversion and retention before charging.",60,522,475,20,MUTED,height=65)
text("Illustrative unit economics",585,248,625,28,bold=True)
for y,label,value in [(308,"CAC","$400 / 10 = $40"),(375,"LTV","$19 × 80% / 10% churn = $152"),(442,"LTV / CAC","3.8× in this scenario")]:
    text(label,585,y,150,23,bold=True)
    text(value,755,y,455,23,MUTED,height=60)
text("No measured revenue, paying users, CAC or LTV.<br/>This is a model to validate, not achieved economics.",585,522,625,19,MUTED,height=63)
box(60,610,1160,51,INK,0)
text("$100m ARR scenario: 100,000,000 / (12 × $19) → 438,597 paying users. Not a forecast.",80,625,1120,19,PAPER,bold=True,height=35)
finish()

# 9: evidence and remaining requirements
frame(9,"SUBMISSION READINESS",dark=True)
text("Show the working journey.<br/>Support it with evidence.",60,91,1160,43,PAPER,bold=True,height=125)
text("Verified checks",60,266,560,27,MINT,bold=True)
for i,item in enumerate(STATUS["verified"]):
    text(f"{i+1:02d}",60,322+i*64,50,20,GOLD,bold=True)
    text(item,121,320+i*64,490,22,PAPER,height=55)
text("Still outstanding",681,266,540,27,MINT,bold=True)
for i,item in enumerate(STATUS["pending"]):
    text(f"{i+1:02d}",681,322+i*64,50,20,GOLD,bold=True)
    text(item,742,320+i*64,470,22,PAPER,height=55)
line(60,546,1220,546,"#4B6A59",1)
text("Source code and evidence",60,571,530,24,PAPER,bold=True)
text("GitHub · codex/hackathon-release",60,613,760,21,MINT)
c.linkURL(STATUS["source_url"],(60,H-646,800,H-610),relative=0)
if STATUS["live_url"]:
    text("Public website →",835,571,375,24,PAPER,bold=True)
    text(STATUS["live_url"].removeprefix("https://"),835,612,375,16,MINT,height=55)
    c.linkURL(STATUS["live_url"],(835,H-665,1210,H-570),relative=0)
else:
    text("Public URL<br/>not verified yet",835,582,375,21,GOLD,height=70)
finish()
c.save()
print(OUTPUT)
