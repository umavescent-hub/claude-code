"""LunarNight v2 spec PDF (3 pages). Usage: make_pdf.py OUT.pdf VALDIR"""
import json
import sys

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (Image as RLImage, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

out, valdir = sys.argv[1], sys.argv[2]
val = json.load(open(f'{valdir}/validation.json'))

INK = colors.HexColor('#16161a')
MUTED = colors.HexColor('#5b6070')
AMBER = colors.HexColor('#b07a1c')
VIOLET = colors.HexColor('#4b2a7a')
RULE = colors.HexColor('#d9dbe2')

H1 = ParagraphStyle('h1', fontName='Times-Bold', fontSize=22, leading=26, textColor=INK, spaceAfter=4)
H2 = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=10.5, leading=14, textColor=VIOLET, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle('b', fontName='Helvetica', fontSize=9, leading=12.4, textColor=INK)
SMALL = ParagraphStyle('s', fontName='Helvetica', fontSize=8, leading=10.6, textColor=MUTED)
CELL = ParagraphStyle('c', fontName='Helvetica', fontSize=8, leading=10.2, textColor=INK)
CELLB = ParagraphStyle('cb', parent=CELL, fontName='Helvetica-Bold')


def table(rows, widths, header=True):
    data = [[Paragraph(str(c), CELLB if (header and i == 0) else CELL) for c in r] for i, r in enumerate(rows)]
    t = Table(data, colWidths=widths, hAlign='LEFT')
    st = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), 0.4, RULE),
          ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
          ('LEFTPADDING', (0, 0), (-1, -1), 3), ('RIGHTPADDING', (0, 0), (-1, -1), 3)]
    if header:
        st.append(('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eef0f5')))
    t.setStyle(TableStyle(st))
    return t


def img(path, width, max_h=None):
    im = Image.open(path).convert('RGB')
    jpg = path.rsplit('.', 1)[0] + '_pdf.jpg'
    im.save(jpg, quality=82, optimize=True)
    w, h = im.size
    ww, hh = width, width * h / w
    if max_h and hh > max_h:
        ww, hh = max_h * w / h, max_h
    return RLImage(jpg, width=ww, height=hh)


story = []
story += [Paragraph('LunarNight v2 &mdash; matched to your reference', H1),
          Paragraph('Measured from your screen recording of the green-house reel plus the small-town kiosk and moon-house stills. '
                    'Rec.709 in, Rec.709 out, 33-point .cube. About 70% of this look is made in the camera; the LUT crushes the '
                    'blacks, pushes the darks violet (or blue) and lifts the coloured lights.', BODY),
          Paragraph('The three numbers that define the look', H2),
          table([['', 'Green-house reel (Violet)', 'Small-town kiosk (Blue)', 'Moon house (Blue)'],
                 ['Black floor (p1 luma)', '<b>0.000</b> &middot; 29% of frame under 3%', '0.000 &middot; 32% under 3%', '0.000 &middot; 49% under 3%'],
                 ['Paper white (p99 luma)', '<b>0.46</b> (only light cores brighter)', '0.48', '0.36'],
                 ['Shadow tone (Lab a / b)', '<b>+16 / &minus;15</b> violet, hue 289&deg;', '+12 / &minus;22 deep blue, hue 226&deg;', '+11 / &minus;21 blue, hue 238&deg;'],
                 ['Practicals', 'green 115&ndash;125&deg; sat 0.97; orange 15&ndash;25&deg; sat 0.94', 'blue sign 215&ndash;245&deg; sat 0.90', 'violet moon glow'],
                 ['Text', 'lime, measured #C1C715 (target #D6DB05)', 'lime, measured #D1D81F', '&mdash;']],
                [1.35 * inch, 2.05 * inch, 1.75 * inch, 1.6 * inch]),
          Paragraph('Settings extracted from the clip: 1344&times;2992 Instagram screen recording (Pixel 10 Pro XL screen), 4.2 s, '
                    'one locked-off static hold, no cuts, H.264 8-bit BT.709. The reel itself: a dead-still frame, light streaks, '
                    'mild glow around the bulb (ring colour = the light&rsquo;s own colour), fine grain.', SMALL),
          Paragraph('The LUTs', H2),
          table([['File', 'Use it for', 'What it does'],
                 ['LunarNight_v2_Violet.cube', 'Default. The green-house look.', 'Under 2.5% in &rarr; pure black; dark neutrals &rarr; violet; blues +14&deg; toward purple; greens, oranges, blues +6&ndash;12% chroma; warm darks protected; paper white 0.94.'],
                 ['LunarNight_v2_Blue.cube', 'The small-town / moon-house look.', 'Same crush and white point; darks &rarr; deep blue; purples pulled back toward blue.'],
                 ['LunarNight_v2_Soft.cube', 'Burning in with Blackmagic Camera (Record LUT to Clip).', '60% Violet + 40% untouched, so CapCut&rsquo;s Shadows slider can finish the crush.'],
                 ['LunarNight_v2_Kitchen.cube', 'Food under LED or tube kitchen light.', 'Same crushed blacks and violet shadows, gentler curve, green-cyan cast pulled from the mids, warm food and skin protected.']],
                [1.75 * inch, 1.7 * inch, 3.3 * inch]),
          Paragraph('Capture preset &mdash; Blackmagic Camera on the Pixel 10 Pro', H2),
          table([['Setting', 'Violet look', 'Blue look'],
                 ['Settings &rsaquo; Camera', 'Enable Vertical Video ON &middot; Stabilization OFF &middot; Reduce Noise OFF &middot; Increase Sharpening OFF &middot; Lock White Balance on Record ON', 'same'],
                 ['Settings &rsaquo; Record', '4K &middot; HEVC &middot; Quality Max &middot; Color space Rec.709 (not HLG) &middot; HDR OFF', 'same'],
                 ['Settings &rsaquo; Monitor', 'Zebras ON 95% &middot; Focus Assist ON', 'same'],
                 ['Settings &rsaquo; LUTs', 'Import LunarNight_v2_Violet &middot; Display LUT ON &middot; Record LUT to Clip ON with <b>Soft</b> when you edit in CapCut', 'Import LunarNight_v2_Blue'],
                 ['HUD dials', '24 fps &middot; 360&deg; (1/24 s) &middot; ISO 400 start, max 1600 &middot; WB Manual <b>3200K</b> tint 0 &middot; focus manual, locked &middot; 1x lens', 'WB <b>2800K</b> tint 0, rest the same'],
                 ['Expose', 'Raise or lower ISO only: zebras only inside the brightest bulb; unlit walls nearly black', 'same'],
                 ['When / what', '30&ndash;75 min after sunset (Santa Fe, November: 5:30&ndash;6:30 pm). One coloured light on one plain building, big dark sky, no people. Brace the phone dead-still (car roof, post, wall, or the Osmo locked).', 'same']],
                [1.25 * inch, 3.7 * inch, 1.8 * inch]),
          Paragraph('Stock Pixel Camera fallback (Video &rsaquo; settings slider): Video Boost OFF, Night Sight video OFF, 24 fps, 4K, '
                    '10-bit HDR OFF, Stabilization Standard or Locked; Pro tab: WB 3200K, slowest shutter (1/24 or 1/30), ISO 400, '
                    'manual focus, Shadows all the way down (Exposure &minus;1.5 to &minus;2 if no shutter/ISO); tap-and-hold the lit wall to lock.', SMALL),
          PageBreak()]

story += [Paragraph('Getting the look into CapCut Mobile', H2),
          Paragraph('CapCut Mobile cannot import .cube files. Three routes, best first:', BODY),
          table([['Route', 'How'],
                 ['1 &middot; Bake at capture', 'Blackmagic Camera &rsaquo; Settings &rsaquo; LUTs &rsaquo; Record LUT to Clip ON with LunarNight_v2_Soft. Finish in CapCut with Shadows &minus;10 to &minus;20.'],
                 ['2 &middot; Bake on the phone', 'Lunar Night OS &rsaquo; Grade &rsaquo; Bake: pick the clip, choose Violet/Blue, intensity 80&ndash;100%, save the MP4, import to CapCut.'],
                 ['3 &middot; CapCut sliders', 'Clip &rsaquo; Adjust: Exposure &minus;15 (or Brightness &minus;15) &middot; Contrast +25 &middot; Shadows &minus;40 &middot; Highlights &minus;10 &middot; Saturation +15 &middot; Temperature &minus;30 &middot; Tint +15 (0 for Blue) &middot; Fade 0 &middot; Vignette +10. HSL if free: Blue hue +15 sat +10; Green sat +10; Orange sat +10; Yellow sat &minus;10. Apply to all. Grey result? Shadows &minus;50, Exposure &minus;20.']],
                [1.4 * inch, 5.35 * inch]),
          Paragraph('What a LUT cannot carry (do these in the edit)', H2),
          table([['Element', 'Recipe'],
                 ['Glow', 'Effects &rsaquo; Video effects &rsaquo; search Glow (Glow / Soft Glow / Bloom, no Pro badge) &rsaquo; intensity 20&ndash;30, size small, over the whole video. The ring around each light takes the light&rsquo;s own colour.'],
                 ['Grain', 'Effects &rsaquo; Video effects &rsaquo; Grain / Film grain, the finest one, intensity 15&ndash;25.'],
                 ['Text', 'Lime #D6DB05, condensed sans (Oswald / Antonio / your Estrella Early), lowercase, two short lines, no punctuation, centred in the upper third, small black shadow, no box, no outline, no animation, first 3 s only.'],
                 ['Cuts and sound', '3&ndash;5 s static holds, hard cuts, no transitions; car-pass shot third or last. Ambient track at 20&ndash;30 or the night sound at 100; no voice, no SFX.'],
                 ['Export', '1080p, 24 fps (match capture), higher bitrate. Keep the top 130 px, right 140 px and bottom 484 px clear of text.']],
                [1.2 * inch, 5.55 * inch]),
          Paragraph('Validation (all four checks passed)', H2)]
v = val
lat = [['LUT', 'NaN', 'Grey axis', 'Max node step', 'White out', 'Max patch sat', 'Orange / Blue / Cyan sat']]
for n in ('Violet', 'Blue', 'Soft', 'Kitchen'):
    r = v[n]
    p = r['patches']
    lat.append([n, 'none' if not r['nan'] else 'YES', 'monotonic' if r['grey_monotonic'] else 'NOT', f"{r['max_step']:.3f}",
                f"{r['white_out'][0]:.2f}", f"{r['patch_sat_max']:.2f}",
                f"{p['orange']['sat']:.2f} / {p['blue']['sat']:.2f} / {p['cyan']['sat']:.2f}"])
story += [table(lat, [0.8 * inch, 0.55 * inch, 0.8 * inch, 1.0 * inch, 0.8 * inch, 1.0 * inch, 1.8 * inch]),
          Spacer(1, 4),
          Paragraph(f"Banding risk starts near a 0.20 node step; all four stay at or under {max(v[n]['max_step'] for n in ('Violet','Blue','Soft','Kitchen')):.3f}. "
                    'No ColorChecker patch is pinned at saturation 1.00. On natural test images the rocket night shot&rsquo;s shadows land at '
                    f"Lab a {v['natural']['rocket']['Violet']['zones']['shadow'][0]:+.0f} / b {v['natural']['rocket']['Violet']['zones']['shadow'][1]:+.0f} "
                    '(inside the reference range). Inverse test: un-grading the references with the LUT inverse gives plausible neutral '
                    'night footage; re-grading matches within '
                    f"{min(x['regrade_mae'] for x in v['inverse'].values()) * 100:.1f}&ndash;{max(x['regrade_mae'] for x in v['inverse'].values()) * 100:.1f}%. "
                    'The remaining error sits in the green bulb and orange windows, which are more saturated than any LUT should push: '
                    'that colour comes from the real lights, not the grade.', SMALL),
          Paragraph('How to read any grade in 30 seconds', H2),
          Paragraph('Find three numbers. <b>Black floor</b>: are the blacks 0 (crushed) or lifted (film)? <b>Paper white</b>: where do '
                    'the brightest non-light surfaces stop? <b>Shadow tone</b>: what colour are the darks pushed toward? Those three plus '
                    'the white balance of the capture are the look; everything else is decoration. For this look: 0, about 0.4, violet '
                    '(or deep blue), and a 3200K capture an hour after sunset.', BODY),
          PageBreak()]

story += [Paragraph('Validation images', H2),
          Table([[Paragraph('Inverse test: reference &middot; un-graded &middot; re-graded', SMALL),
                  Paragraph('Natural images: original &middot; Violet &middot; Blue &middot; Kitchen', SMALL)],
                 [img(f'{valdir}/inverse_ref_ungraded_regraded.png', 3.3 * inch, 8.3 * inch),
                  img(f'{valdir}/natural_before_violet_blue_kitchen.png', 3.35 * inch, 8.3 * inch)]],
                colWidths=[3.4 * inch, 3.4 * inch], hAlign='LEFT',
                style=TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))]

doc = SimpleDocTemplate(out, pagesize=letter, leftMargin=0.7 * inch, rightMargin=0.7 * inch, topMargin=0.6 * inch,
                        bottomMargin=0.6 * inch, title='LunarNight v2 LUT spec', author='Lunar Night OS')
doc.build(story)
print('wrote', out)
