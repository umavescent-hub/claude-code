/* Lunar Night OS: modules/edit.js, The Cut (03).
   Seven tabs: Formats, Algorithm, Speed Ramps, Audio Spine, Auto-Cut (mounted
   from LN.autocut, owned by autocut.js), Captions and Edit Plan.
   Fable 5.1 writes plans and caption cards as text; the chef runs them tap by
   tap in CapCut Mobile. Shared state:
     edit.format       'market' | 'reel' | 'doc' | 'lab'  (+ bus 'edit:format')
     devicefacts.v1    read only, written by Rig's checklist (+ bus 'devicefacts') */
;(() => {
  const LN = window.LN
  const { h, s, ui } = LN
  const ST = LN.store
  const clamp = LN.math.clamp

  /* ------------------------------------------------------------ helpers */
  const fx = (x, d = 2) => Number(x).toFixed(d)
  const sec = (x, d = 2) => `${fx(x, d)} s`
  const words = t =>
    String(t || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
  const today = () => new Date().toISOString().slice(0, 10)
  const num = (v, d) => {
    const n = Number.parseFloat(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : d
  }

  /* Device facts: Rig's checklist writes {key: true|false|null}. Key names are
     matched loosely (lowercase, letters and digits only) so either side can
     rename a key without breaking this page. */
  const facts = () => {
    const f = ST.get('devicefacts.v1', {})
    return f && typeof f === 'object' ? f : {}
  }
  const factFor = re => {
    const f = facts()
    for (const k of Object.keys(f)) {
      if (re.test(k.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        const v = f[k]
        if (v === true || v === false) return v
      }
    }
    return null
  }
  /** A callout that follows one device fact: verify until Rig answers it. */
  function factNote(re, o) {
    const box = h('div', { class: 'edit-fact' })
    const paint = () => {
      const v = factFor(re)
      let c
      if (v === true) c = ui.callout('ok', o.yes, 'Checked on your phone')
      else if (v === false) c = ui.callout('warn', o.no, 'Not on your phone')
      else c = ui.callout('verify', o.check)
      box.replaceChildren(c)
    }
    paint()
    LN.bus.on('devicefacts', paint)
    return box
  }
  const FACT = {
    beats: /beat/,
    smooth: /smoothslow|slowmo|opticalflow/,
    curve: /speedcurve|curvecustom|customcurve/,
    captions: /autocaption/,
    fps60: /60fps|fps60|4k60/,
  }

  /** Split "…You should see: …" into the tap and its check line. */
  function stepNode(text) {
    const str = String(text || '')
    const m = str.split(/you should see:?/i)
    const act = m[0].trim()
    const see = m.slice(1).join(' ').trim()
    return h(
      'div',
      { class: 'edit-step' },
      h('span', null, act),
      see
        ? h(
            'span',
            { class: 'edit-see' },
            h('b', null, 'You should see: '),
            see,
          )
        : h(
            'span',
            { class: 'edit-see missing' },
            'No "You should see:" check on this step. Ask for one before you trust it.',
          ),
    )
  }

  /* ------------------------------------------------------------ formats */
  const FORMATS = [
    {
      id: 'market',
      name: 'Marketplace Review',
      tag: 'TikTok main series',
      length: '25–40 s for reach · 65–90 s for Creator Rewards',
      fps: 30,
      rules: [
        [
          'Cuts',
          'Every 1–3 s. Cut every pause. Hard cuts; 2 transitions max, about 0.2 s each.',
        ],
        [
          'Zooms',
          '2–3 push-ins of 8–15% on the bite, the money shot and the verdict.',
        ],
        [
          'Hook card',
          'White box, black Inter Bold, lowercase, 8 words max, just below the top safe band, about 2 s, no animation.',
        ],
        [
          'Captions',
          'Inter Bold, white, black outline, no box, 3–4 words a line, always on.',
        ],
        ['Title, cover', 'Estrella Early, 4 words max.'],
        ['Sound', 'Voice 100, music 10–20, one SFX per big moment at 30–60.'],
        [
          'Colour',
          'Subtle filter 20–40 plus Adjust, or bake Dreamcore (happy) or LunarNight (dark).',
        ],
        ['Ending', 'The verdict, then a rating card held 1.5 s. No goodbye.'],
        ['Export', '1080p at 30 fps, or 60 if you shot 60.'],
      ],
    },
    {
      id: 'reel',
      name: 'Lunar Night Reel',
      tag: 'Night exteriors',
      length: '5–7 s single shot, or a 5–7 shot montage',
      fps: 24,
      rules: [
        [
          'Cuts',
          '3–5 s static holds, hard cuts, no transitions. A single shot runs 5–7 s and loops.',
        ],
        ['Montage', '5–7 shots. The car-pass shot goes third or last.'],
        [
          'Text',
          'Lime #D6DB05, condensed sans (Oswald, Antonio or Estrella Early), lowercase, two short lines, no punctuation, centred in the upper third, small black shadow; no box, outline or animation; first 3 s only.',
        ],
        [
          'Sound',
          'An ambient track at 20–30, or the night sound at 100. No voice, no SFX.',
        ],
        [
          'Cut law',
          'The exception: cut on nothing. The music sets the rhythm, so "cut on motion" and "every 3 s" do not apply.',
        ],
        ['Cover', 'The most colourful frame, 4 words max, same lime text.'],
        ['Export', '1080p at 24 fps (match what you shot), higher bitrate.'],
      ],
    },
    {
      id: 'doc',
      name: 'Road to Three Stars',
      tag: 'The documentary',
      length: 'No fixed length',
      fps: 24,
      rules: [
        ['Hook', 'Inside 0–3 s.'],
        [
          'Cuts',
          'Montage cuts about every 1.8 s on action apexes; emotional beats hold about 4.5 s.',
        ],
        [
          'Looks',
          'Dreamcore for memory and heritage; VHS 4:3 for confessions and failures.',
        ],
        [
          'Type',
          'Editorial serif chapter titles plus mono data lines; workhorse captions.',
        ],
        [
          'Sound',
          'Voice first. Music ducked under speech; foley close and loud.',
        ],
      ],
    },
    {
      id: 'lab',
      name: 'R&D Lab',
      tag: 'Recipe development',
      length: 'No fixed length',
      fps: null,
      rules: [
        [
          'Motion',
          'Speed ramps on pours and knife work. Never below 0.5x without a 60 fps source.',
        ],
        ['Type', 'Mono data cards: grams, degrees, minutes.'],
        ['Shots', 'Macro and plating, from the Shot Bible (R&D cards).'],
        ['Captions', 'The playbook workhorse: 2–4 words a card.'],
        ['Export', '1080×1920 at the source frame rate.'],
      ],
    },
  ]
  const FMT = Object.fromEntries(FORMATS.map(f => [f.id, f]))
  const getFormat = () => {
    const id = ST.get('edit.format', 'market')
    return FMT[id] ? id : 'market'
  }
  const setFormat = id => {
    if (!FMT[id] || id === getFormat()) return
    ST.set('edit.format', id)
    LN.bus.emit('edit:format', id)
  }
  const onFormat = fn => LN.bus.on('edit:format', fn)
  /** Segmented format picker that stays in sync with every other picker. */
  function formatSeg(label = 'Format') {
    const seg = ui.seg({
      label,
      options: FORMATS.map(f => ({ value: f.id, label: f.name })),
      value: getFormat(),
      onChange: setFormat,
    })
    onFormat(id => seg.set(id))
    return seg
  }

  /* Structure timelines, drawn to scale (viewBox units = seconds × k). */
  const TL_KIND = ['hook', 'a', 'b', 'c', 'd', 'e']
  function timeline(o) {
    const W = 360
    const X0 = 10
    const X1 = 350
    const Y = 24
    const H = 30
    const x = t => X0 + (t / o.total) * (X1 - X0)
    const svg = s('svg', {
      viewBox: `0 0 ${W} 84`,
      class: 'edit-tl',
      role: 'img',
      'aria-label': o.label,
    })
    for (const b of o.bands || [])
      svg.append(
        s('rect', {
          x: x(b.a),
          y: Y - 4,
          width: x(b.b) - x(b.a),
          height: H + 8,
          class: 'edit-tl-band',
        }),
      )
    for (const g of o.segs) {
      const w = x(g.b) - x(g.a)
      svg.append(
        s('rect', {
          x: x(g.a) + 0.5,
          y: Y,
          width: Math.max(1, w - 1),
          height: H,
          rx: 2,
          class: `edit-tl-seg k-${g.kind || 'a'}`,
        }),
      )
      if (w > g.label.length * 5.4 + 6)
        svg.append(
          s(
            'text',
            { x: x(g.a) + 4, y: Y + H / 2 + 3.5, class: 'edit-tl-lab' },
            g.label,
          ),
        )
    }
    for (const c of o.cuts || [])
      svg.append(
        s('line', {
          x1: x(c),
          x2: x(c),
          y1: Y,
          y2: Y + H,
          class: 'edit-tl-cut',
        }),
      )
    const tick = o.tick || 5
    for (let t = 0; t <= o.total + 1e-9; t += tick) {
      svg.append(
        s('line', {
          x1: x(t),
          x2: x(t),
          y1: Y + H + 2,
          y2: Y + H + 6,
          class: 'edit-tl-tick',
        }),
        s(
          'text',
          {
            x: x(t),
            y: Y + H + 16,
            class: 'edit-tl-num',
            'text-anchor':
              t === 0 ? 'start' : t + tick > o.total + 1e-9 ? 'end' : 'middle',
          },
          `${LN.math.round(t, 1)}s`,
        ),
      )
    }
    for (const m of o.marks || []) {
      svg.append(
        s('line', {
          x1: x(m.t),
          x2: x(m.t),
          y1: Y - 8,
          y2: Y + H + 2,
          class: `edit-tl-mark ${m.strong ? 'strong' : ''}`.trim(),
        }),
        s(
          'text',
          {
            x: x(m.t),
            y: Y - 11,
            class: 'edit-tl-marklab',
            'text-anchor': m.anchor || 'middle',
          },
          m.label,
        ),
      )
    }
    const legend = h(
      'ul',
      { class: 'edit-tl-legend' },
      o.segs
        .filter(g => !g.hideLegend)
        .map(g =>
          h(
            'li',
            null,
            h('i', { class: `k-${g.kind || 'a'}`, 'aria-hidden': 'true' }),
            h('span', { class: 'ln-num' }, `${fx(g.a, 1)}–${fx(g.b, 1)} s`),
            ` ${g.label}`,
          ),
        ),
    )
    return h(
      'figure',
      { class: 'edit-tl-wrap' },
      o.title ? h('figcaption', { class: 'ln-h3' }, o.title) : null,
      svg,
      legend,
      o.note ? h('p', { class: 'ln-faint ln-small' }, o.note) : null,
    )
  }
  const seg = (a, b, label, kind) => ({ a, b, label, kind })

  function marketTimelines(variant) {
    if (variant === 'rewards')
      return h(
        'div',
        { class: 'ln-stack' },
        timeline({
          title: 'Rewards cut · 65–90 s · verdict past the 60 s line',
          label:
            'Marketplace Review rewards cut: hook 0 to 3 s, what and where 3 to 10, cook and plate 10 to 45, verdict 45 to 60, payoff 60 to 75, end window 65 to 90',
          total: 90,
          tick: 15,
          segs: [
            seg(0, 3, 'Hook', 'hook'),
            seg(3, 10, 'What + where', 'a'),
            seg(10, 45, 'Cook / plate', 'b'),
            seg(45, 60, 'Verdict', 'c'),
            seg(60, 75, 'Payoff: score + rating card', 'd'),
          ],
          bands: [{ a: 65, b: 90 }],
          marks: [
            { t: 60, label: '60 s line', strong: true },
            { t: 90, label: 'end 65–90', anchor: 'end' },
          ],
          note: 'Playbook structure (Module 3). The shaded band is where the video may end: 65–90 s. Only videos over 1 minute earn Creator Rewards.',
        }),
        ui.callout(
          'rule',
          'The playbook says two things: Module 3 puts the verdict at 45–60 s, and Module 4 says the verdict "lands after 60 s". This plan keeps the verdict talk at 45–60 and holds the score and the 1.5 s rating card until after 60 s, so the payoff crosses the line. If the talk runs long, slide the whole verdict past 60.',
          'Two playbook lines, one cut',
        ),
      )
    return timeline({
      title: 'Reach cut · 25–40 s (drawn at 35 s)',
      label:
        'Marketplace Review reach cut at 35 seconds: hook 0 to 3, what and where 3 to 7, cook and plate 7 to 25, verdict 25 to 33.5, rating card 33.5 to 35',
      total: 35,
      tick: 5,
      segs: [
        seg(0, 3, 'Hook', 'hook'),
        seg(3, 7, 'Where', 'a'),
        seg(7, 25, 'Cook / plate', 'b'),
        seg(25, 33.5, 'Verdict', 'c'),
        seg(33.5, 35, 'Rating card 1.5 s', 'd'),
      ],
      bands: [{ a: 0, b: 2 }],
      marks: [{ t: 1.5, label: 'swipe ~1.5 s' }],
      cuts: [1.5, 4.5, 9, 11.5, 14, 16.5, 19, 21.5, 23, 27, 30],
      note: 'The playbook order squeezed to 35 s; the section lengths are a starting point, not a playbook number. Thin lines show cuts every 1–3 s. The shaded band is the hook card, about the first 2 s.',
    })
  }
  function reelTimelines(carLast) {
    const shots = 6
    const hold = 4
    const car = carLast ? shots - 1 : 2
    const segs = []
    for (let i = 0; i < shots; i++)
      segs.push(
        seg(
          i * hold,
          (i + 1) * hold,
          i === car ? 'Car pass' : `Shot ${i + 1}`,
          i === car ? 'c' : 'a',
        ),
      )
    return h(
      'div',
      { class: 'ln-stack' },
      timeline({
        title: 'Single shot · 5–7 s, loops',
        label: 'Single-shot Night Reel: one 6 second hold, lime text 0 to 3 s',
        total: 7,
        tick: 1,
        segs: [seg(0, 6, 'One braced hold, loops', 'a')],
        bands: [{ a: 0, b: 3 }],
        marks: [
          { t: 3, label: 'text off at 3 s' },
          { t: 6, label: 'loop', anchor: 'end' },
        ],
        note: 'The shaded band is the lime text: first 3 s only.',
      }),
      timeline({
        title: `Montage · 6 shots × 4 s · car pass ${carLast ? 'last' : 'third'}`,
        label: `Night Reel montage: six 4 second holds, car pass in shot ${car + 1}`,
        total: 24,
        tick: 4,
        segs,
        bands: [{ a: 0, b: 3 }],
        note: '5–7 shots, each a 3–5 s static hold, hard cuts, no transitions.',
      }),
    )
  }
  function docTimeline() {
    const segs = [seg(0, 3, 'Hook', 'hook')]
    const cuts = []
    let t = 3
    const montage = (n, label) => {
      const a = t
      for (let i = 1; i < n; i++) cuts.push(LN.math.round(a + i * 1.8, 2))
      t = LN.math.round(a + n * 1.8, 2)
      segs.push(seg(a, t, label, 'a'))
    }
    const beat = label => {
      segs.push(seg(t, LN.math.round(t + 4.5, 2), label, 'c'))
      t = LN.math.round(t + 4.5, 2)
    }
    montage(5, 'Montage 5 × 1.8 s')
    beat('Beat 4.5 s')
    montage(4, 'Montage 4 × 1.8')
    beat('Beat 4.5 s')
    return timeline({
      title: 'Documentary rhythm · example 30 s',
      label:
        'Documentary: hook 0 to 3 s, montage cuts every 1.8 s, emotional beats of 4.5 s',
      total: 30,
      tick: 5,
      segs,
      cuts,
      note: 'Hook inside 0–3 s, montage cuts about every 1.8 s on action apexes, emotional beats about 4.5 s. Dreamcore for memory, VHS 4:3 for confessions.',
    })
  }

  function renderFormats(el) {
    const detail = h('div', { class: 'ln-stack' })
    const cards = h('div', { class: 'edit-fmt-grid', role: 'group' })
    const btns = {}
    for (const f of FORMATS) {
      btns[f.id] = h(
        'button',
        {
          type: 'button',
          class: 'edit-fmt',
          'aria-pressed': 'false',
          onClick: () => setFormat(f.id),
        },
        h('span', { class: 'ln-eyebrow' }, f.tag),
        h('b', null, f.name),
        h('small', null, f.length),
      )
      cards.append(btns[f.id])
    }
    function paint() {
      const id = getFormat()
      const f = FMT[id]
      for (const k of Object.keys(btns))
        btns[k].setAttribute('aria-pressed', String(k === id))
      const kids = [
        h('h3', { class: 'ln-h2' }, f.name),
        h('p', { class: 'ln-muted' }, f.length),
        ui.kv(f.rules),
      ]
      if (id === 'market') {
        const host = h('div')
        const v = ST.get('edit.market.variant', 'reach')
        const sw = ui.seg({
          label: 'Cut',
          options: [
            { value: 'reach', label: 'Reach 25–40 s' },
            { value: 'rewards', label: 'Rewards 65–90 s' },
          ],
          value: v,
          onChange: nv => {
            ST.set('edit.market.variant', nv)
            host.replaceChildren(marketTimelines(nv))
          },
        })
        host.append(marketTimelines(v))
        kids.push(sw.el, host)
      } else if (id === 'reel') {
        const host = h('div')
        const last = ST.get('edit.reel.carLast', false)
        const sw = ui.seg({
          label: 'Car pass',
          options: [
            { value: 'third', label: 'Third' },
            { value: 'last', label: 'Last' },
          ],
          value: last ? 'last' : 'third',
          onChange: nv => {
            ST.set('edit.reel.carLast', nv === 'last')
            host.replaceChildren(reelTimelines(nv === 'last'))
          },
        })
        host.append(reelTimelines(last))
        kids.push(sw.el, host)
      } else if (id === 'doc') {
        kids.push(docTimeline())
      } else {
        kids.push(
          ui.callout(
            'tip',
            h(
              'span',
              null,
              'R&D Lab has no fixed structure. Build the ramp on the ',
              h('b', null, 'Speed Ramps'),
              ' tab, and pull macro and plating shots from the ',
              h('a', { href: '#shots' }, 'Shot Bible'),
              '.',
            ),
          ),
        )
      }
      kids.push(
        ui.callout(
          'rule',
          'One format per video. Never mix house styles: the hook card, captions, sound levels and colour all follow the format you pick here.',
        ),
      )
      detail.replaceChildren(
        h('div', { class: 'ln-card edit-fmt-detail' }, kids),
      )
    }
    onFormat(paint)
    paint()
    el.append(
      ui.section(
        {
          eyebrow: 'Pick the format first',
          title: 'Four formats, four house styles',
          lede: 'Tap a format. Every other tab on this page follows it: the hook, the audio levels, the caption style and the edit plan.',
        },
        cards,
        detail,
      ),
    )
  }

  /* ------------------------------------------------------------ algorithm */
  const LABELS_VARY =
    'Labels vary by CapCut version. If yours differs, use the closest wording and note it.'
  const STEPS = [
    {
      n: 1,
      title: 'Dump and tag',
      law: 'Import everything. Delete the obvious junk first, so the timeline only holds candidates.',
      taps: [['New project', 'pick the clips', 'Add']],
      verify: `The import button may read "Add" or show a check mark. ${LABELS_VARY}`,
    },
    {
      n: 2,
      title: 'Hook',
      law: 'Pick the one shot that stops a stranger: the plate landing, the cut into the meat, the first bite reaction. It goes at 0:00. You have about 1.5 s before the swipe.',
      taps: [['Touch and hold the hook clip', 'drag it to the start']],
      hook: true,
    },
    {
      n: 3,
      title: 'Rough cut to the beat',
      law: 'Drop the music, let Beats mark it, then split and trim so cuts land on the markers. A review averages 1.5–3 s a shot; hold longer only on the hero plate.',
      taps: [
        ['Audio', 'Sounds', 'pick a track', 'Add'],
        ['Tap the music', 'Beats', 'Auto generate'],
        ['Playhead on a beat dot', 'tap the clip', 'Split'],
      ],
      fact: {
        re: FACT.beats,
        yes: 'Beats › Auto generate is on your phone, with the beat dots.',
        no: 'No Auto generate on your phone. Tap Add beat by hand on each kick or snare, then split on the dots.',
        check:
          'Beats › Auto generate comes from memory, not a checked source. Tap the music clip and look for Beats (older builds: Match cut), then an Auto generate toggle. If it is missing or Pro, add beats by hand with Add beat.',
      },
    },
    {
      n: 4,
      title: 'Structure',
      law: 'Hook (0–3 s) → what and where (3–10 s) → the cook or plate (10–45 s) → verdict (45–60 s) → payoff or next episode (60–75 s). Over 60 s is the Creator Rewards line, so a Rewards cut runs 65–90 s.',
      taps: [],
      structure: true,
    },
    {
      n: 5,
      title: 'Motion',
      law: 'Keyframes on Scale and Position for a slow punch-in: 100% to 108% over a 3 s hold. One move per shot; two reads as cheap.',
      taps: [
        ['Tap the clip', 'playhead at its start', 'keyframe diamond'],
        ['Playhead 3 s later', 'pinch the preview to 108%'],
      ],
      verify:
        'Pinching shows no exact percentage on some builds. If you see no number, push in a little and compare against the first frame.',
    },
    {
      n: 6,
      title: 'Masks',
      law: 'Linear or Mirror masks for text reveals and split grades: grade one half of the frame to show before and after.',
      taps: [['Tap the clip', 'Mask', 'Linear or Mirror']],
      verify: `Mask is in the clip toolbar on the builds remembered here; scroll the toolbar sideways to find it. ${LABELS_VARY}`,
    },
    {
      n: 7,
      title: 'Speed',
      law: 'Speed › Curve for ramps on pours and knife work. Never below 0.5x without a 60 fps source.',
      taps: [['Tap the clip', 'Speed', 'Curve']],
      ramps: true,
    },
    {
      n: 8,
      title: 'Audio',
      law: 'Voice peaks at −6 to −3 dB. Music under the voice at −18 to −12 dB, ducked with volume keyframes while you speak. Your mic track is already clean; resist over-processing.',
      taps: [
        ['Tap the clip', 'Volume'],
        ['Tap the music', 'keyframe diamond', 'Volume'],
      ],
      verify:
        'CapCut shows volume as 0–1000 (100 = the clip as recorded), not dB, and has no meter on mobile as far as the notes go. Reduce noise is Pro on mobile, and Pro tools can block export, so skip it.',
    },
    {
      n: 9,
      title: 'Captions',
      law: 'Auto captions, then fix every line. Captions are your voice in the low-talk style: 2–4 words a card, inside the safe zones.',
      taps: [['Captions', 'Auto captions', 'English', 'Generate']],
      fact: {
        re: FACT.captions,
        yes: 'Auto captions works on your phone.',
        no: 'Auto captions is missing or locked on your phone. Type captions with Text › Add text, using the cards from the Captions tab.',
        check:
          'On some versions Auto captions sits under Text instead of Captions. Check once and note where yours is.',
      },
    },
    {
      n: 10,
      title: 'Text and titles',
      law: 'Two fonts max. Keep text out of the bottom 20% (TikTok buttons and caption) and the right 12% (the action rail).',
      taps: [['Text', 'Add text', 'Font', 'Import']],
      verify:
        'Font import takes .ttf or .otf only. The Import button sits in the Font list; the playbook calls it the (+) button.',
    },
    {
      n: 11,
      title: 'Colour',
      law: 'One grade across the whole timeline: correct each clip, match, grade on one adjustment layer, then the look (LUT 50–70%), then finish (halation, grain, vignette).',
      taps: [['Filters or Adjust', 'set the values', 'Apply to all']],
      grade: true,
    },
    {
      n: 12,
      title: 'Export',
      law: '1080×1920, the frame rate you shot, the highest bitrate CapCut offers, H.264. Upload the file; never re-record the screen.',
      taps: [
        [
          '1080P ▾ chip',
          'Resolution 1080p',
          'Frame rate',
          'Code rate: Higher',
          'Export',
        ],
      ],
      verify:
        'Older builds say "Code rate", newer ones may say "Bit rate". No codec choice is known on mobile, so you may not see an H.264 option; Higher bitrate is the setting that matters.',
    },
  ]

  /** Hook architecture for 0–3 s: three layers, per format. */
  const HOOK = {
    market: {
      shock:
        'Frame 0 is the payoff: the plate landing, the knife into the meat, or the first-bite face.',
      hit: 'One SFX with a hard attack on frame 0 (crunch, pop, sizzle) at 30–60.',
      title:
        'Hook card: white box, black Inter Bold, lowercase, 8 words max, about 2 s, no animation.',
    },
    reel: {
      shock:
        'The most colourful frame of the night: one coloured light on one plain building.',
      hit: 'No SFX in a reel. The hit is the music: start on a downbeat, or let the night sound carry it at 100.',
      title:
        'Lime #D6DB05, condensed, lowercase, two short lines, upper third, first 3 s.',
    },
    doc: {
      shock:
        'The strongest action apex of the episode, out of order if you need it.',
      hit: 'Foley close and loud on frame 0: the knife hit, the sear, the pan.',
      title: 'Editorial serif chapter title with one mono data line under it.',
    },
    lab: {
      shock:
        'The impact frame of the ramp: the pour landing, the blade through.',
      hit: 'The impact sound right on the speed drop.',
      title: 'Mono data card: the one number that matters (°C, g, s).',
    },
  }
  function hookDiagram(fid) {
    const k = HOOK[fid]
    const W = 360
    const X0 = 92
    const X1 = 350
    const x = t => X0 + (t / 3) * (X1 - X0)
    const rows = [
      ['Visual shock', 'shock', [0, 1.5]],
      ['Hard transient', 'hit', [0, 0.12]],
      ['Title', 'title', fid === 'market' ? [0, 2] : [0, 3]],
    ]
    const svg = s('svg', {
      viewBox: `0 0 ${W} 112`,
      class: 'edit-hook-svg',
      role: 'img',
      'aria-label':
        'Hook architecture, 0 to 3 seconds: visual shock from frame 0, a hard transient on frame 0, a title on screen from frame 0',
    })
    rows.forEach(([lab, cls, [a, b]], i) => {
      const y = 10 + i * 28
      svg.append(
        s('text', { x: 0, y: y + 13, class: 'edit-hook-lab' }, lab),
        s('rect', {
          x: X0,
          y,
          width: X1 - X0,
          height: 18,
          class: 'edit-hook-lane',
        }),
      )
      if (cls === 'hit')
        svg.append(
          s('path', {
            d: `M${x(0)} ${y + 18} L${x(0)} ${y} L${x(0.45)} ${y + 18} Z`,
            class: 'edit-hook-hit',
          }),
        )
      else
        svg.append(
          s('rect', {
            x: x(a),
            y,
            width: x(b) - x(a),
            height: 18,
            class: `edit-hook-${cls}`,
          }),
        )
    })
    for (let t = 0; t <= 3; t += 0.5)
      svg.append(
        s(
          'text',
          {
            x: x(t),
            y: 104,
            class: 'edit-tl-num',
            'text-anchor': t === 0 ? 'start' : t === 3 ? 'end' : 'middle',
          },
          `${t}s`,
        ),
      )
    svg.append(
      s('line', {
        x1: x(1.5),
        x2: x(1.5),
        y1: 4,
        y2: 92,
        class: 'edit-tl-mark strong',
      }),
    )
    return h(
      'div',
      { class: 'ln-card' },
      h('h3', null, `Hook architecture, 0–3 s · ${FMT[fid].name}`),
      svg,
      ui.kv([
        ['Visual shock', k.shock],
        ['Hard transient', k.hit],
        ['Title', k.title],
      ]),
      h(
        'p',
        { class: 'ln-faint ln-small' },
        'The amber line is the swipe, about 1.5 s in. All three layers start on frame 0.',
      ),
    )
  }

  /* "Every 3 s something changes" meter.
     Input: shot lengths in seconds; "4.8@2.2" marks an in-shot change
     (a push-in, text or SFX) 2.2 s into that shot. */
  function parseShots(text) {
    const out = []
    for (const tok of String(text || '').split(/[\s,;]+/)) {
      if (!tok) continue
      const [len, ...inside] = tok.split('@')
      const L = num(len, Number.NaN)
      if (!(L > 0)) continue
      out.push({
        len: L,
        inside: inside.map(x => num(x, -1)).filter(x => x > 0 && x < L),
      })
    }
    return out
  }
  function meterAnalyse(shots, limit = 3) {
    const events = [0]
    let t = 0
    for (const sh of shots) {
      for (const c of sh.inside) events.push(t + c)
      t += sh.len
      events.push(t)
    }
    events.sort((a, b) => a - b)
    const gaps = []
    for (let i = 1; i < events.length; i++) {
      const g = events[i] - events[i - 1]
      if (g > limit + 1e-6) gaps.push({ a: events[i - 1], b: events[i], g })
    }
    const total = t
    const avg = shots.length ? total / shots.length : 0
    return { total, avg, events, gaps }
  }
  function renderMeter() {
    const host = h('div', { class: 'ln-stack' })
    const out = h('div', { class: 'ln-stack' })
    const f = ui.field({
      label: 'Shot lengths in seconds (2.4 1.8 4.8@2.2 …)',
      value: ST.get('edit.meter', '2.4 1.8 2.6 4.8@2.2 2 6.5 1.5 3.6'),
      multiline: true,
      rows: 2,
      onInput: v => {
        ST.set('edit.meter', v)
        paint()
      },
    })
    function paint() {
      const shots = parseShots(f.get())
      const fid = getFormat()
      if (!shots.length) {
        out.replaceChildren(ui.empty('Type at least one shot length.'))
        return
      }
      const r = meterAnalyse(shots)
      const W = 360
      const X0 = 4
      const X1 = 356
      const x = t => X0 + (t / r.total) * (X1 - X0)
      const svg = s('svg', {
        viewBox: `0 0 ${W} 58`,
        class: 'edit-meter',
        role: 'img',
        'aria-label': `${shots.length} shots, ${fx(r.total, 1)} seconds, ${r.gaps.length} gaps over 3 seconds`,
      })
      let t = 0
      shots.forEach((sh, i) => {
        svg.append(
          s('rect', {
            x: x(t) + 0.5,
            y: 10,
            width: Math.max(1, x(t + sh.len) - x(t) - 1),
            height: 24,
            class: `edit-meter-shot ${i % 2 ? 'alt' : ''}`.trim(),
          }),
        )
        for (const c of sh.inside)
          svg.append(
            s('circle', {
              cx: x(t + c),
              cy: 22,
              r: 3,
              class: 'edit-meter-dot',
            }),
          )
        t += sh.len
      })
      for (const g of r.gaps)
        svg.append(
          s('rect', {
            x: x(g.a + 3),
            y: 6,
            width: Math.max(1.5, x(g.b) - x(g.a + 3)),
            height: 32,
            class: 'edit-meter-gap',
          }),
        )
      const ticks = r.total > 40 ? 10 : 5
      for (let k = 0; k <= r.total + 1e-9; k += ticks)
        svg.append(
          s(
            'text',
            {
              x: x(k),
              y: 52,
              class: 'edit-tl-num',
              'text-anchor': k === 0 ? 'start' : 'middle',
            },
            `${k}s`,
          ),
        )
      const kids = [
        svg,
        h(
          'div',
          { class: 'edit-stats' },
          ui.stat(String(shots.length), 'Shots'),
          ui.stat(sec(r.total, 1), 'Total'),
          ui.stat(sec(r.avg, 1), 'Average shot'),
          ui.stat(String(r.gaps.length), 'Gaps over 3 s'),
        ),
      ]
      if (fid === 'reel')
        kids.push(
          ui.callout(
            'tip',
            'Lunar Night Reel is the exception: 3–5 s static holds, the music sets the rhythm. Gaps here are expected; switch the format to check a review or a doc cut.',
          ),
        )
      else if (!r.gaps.length)
        kids.push(
          ui.callout(
            'ok',
            'Something changes at least every 3 s. Fire it.',
            'On the pass',
          ),
        )
      else
        kids.push(
          ui.steps(
            r.gaps.map(g =>
              h(
                'span',
                null,
                h('b', null, `${fx(g.a, 1)}–${fx(g.b, 1)} s`),
                ` runs ${fx(g.g, 1)} s with no change. Add a push-in, a text card, an SFX or a cut near ${fx(Math.min(g.b - 0.2, g.a + 2.5), 1)} s.`,
              ),
            ),
          ),
        )
      if (fid === 'market' && r.avg > 3)
        kids.push(
          ui.callout(
            'warn',
            `Average shot ${fx(r.avg, 1)} s. Marketplace Review cuts every 1–3 s; trim the pauses.`,
          ),
        )
      out.replaceChildren(...kids)
    }
    onFormat(paint)
    paint()
    host.append(
      f.el,
      h(
        'p',
        { class: 'ln-faint ln-small' },
        'Add @seconds after a length to mark a change inside the shot, e.g. 4.8@2.2 is a 4.8 s shot with a push-in 2.2 s in. Red bands are the seconds past the 3 s mark with nothing new.',
      ),
      out,
    )
    return host
  }

  function renderAlgorithm(el) {
    const state = ST.get('edit.algo', null) || {
      current: 'Marketplace ep 1',
      projects: {},
    }
    if (!state.projects || typeof state.projects !== 'object')
      state.projects = {}
    const save = () => ST.set('edit.algo', state)
    const proj = () => {
      const name = state.current || 'Untitled'
      if (!state.projects[name]) state.projects[name] = { done: {} }
      return state.projects[name]
    }
    const list = h('ol', { class: 'edit-algo' })
    const progress = h('div', { class: 'edit-progress' })
    const nameField = ui.field({
      label: 'Project name',
      value: state.current,
      placeholder: 'e.g. Marketplace ep 12, tamales',
      onInput: v => {
        state.current = v.trim() || 'Untitled'
        save()
        paintList()
        paintProjects()
      },
    })
    const projRow = h('div', { class: 'ln-row edit-projects' })
    function paintProjects() {
      const names = Object.keys(state.projects).filter(n => n !== state.current)
      projRow.replaceChildren(
        ...(names.length
          ? [
              h('span', { class: 'ln-faint ln-small' }, 'Other projects:'),
              ...names.slice(0, 8).map(n =>
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'ln-chip',
                    onClick: () => {
                      state.current = n
                      nameField.set(n)
                      save()
                      paintList()
                      paintProjects()
                    },
                  },
                  n,
                ),
              ),
            ]
          : []),
      )
    }
    const hookHost = h('div')
    const structHost = h('div')
    const paintFormatBits = () => {
      const fid = getFormat()
      hookHost.replaceChildren(hookDiagram(fid))
      const f = FMT[fid]
      structHost.replaceChildren(
        h(
          'p',
          { class: 'ln-small ln-muted' },
          `Your format is ${f.name}: ${f.length}. The Formats tab draws its structure to scale.`,
        ),
      )
    }
    function paintList() {
      const p = proj()
      const done = STEPS.filter(st => p.done[st.n]).length
      progress.replaceChildren(
        h(
          'div',
          { class: 'edit-progress-bar', 'aria-hidden': 'true' },
          h('i', { style: { width: `${(done / STEPS.length) * 100}%` } }),
        ),
        h(
          'span',
          { class: 'ln-num' },
          `${done}/${STEPS.length} done · ${state.current}`,
        ),
      )
      for (const li of list.children) {
        const n = Number(li.dataset.n)
        const on = !!p.done[n]
        li.classList.toggle('done', on)
        const b = li.querySelector('.edit-check')
        b.setAttribute('aria-pressed', String(on))
      }
    }
    for (const st of STEPS) {
      const body = [h('p', { class: 'edit-law' }, st.law)]
      for (const t of st.taps) body.push(h('div', null, ui.path(t)))
      if (st.verify) body.push(ui.callout('verify', st.verify))
      if (st.fact) body.push(factNote(st.fact.re, st.fact))
      if (st.hook) body.push(hookHost)
      if (st.structure) body.push(structHost)
      if (st.ramps)
        body.push(
          h(
            'p',
            { class: 'ln-small ln-muted' },
            'Build the curve on the Speed Ramps tab; it gives the node table and the output length.',
          ),
        )
      if (st.grade)
        body.push(
          h(
            'p',
            { class: 'ln-small ln-muted' },
            'The full order and the LUT routes live on ',
            h('a', { href: '#grade' }, 'Grade'),
            '.',
          ),
        )
      const check = h(
        'button',
        {
          type: 'button',
          class: 'edit-check',
          'aria-pressed': 'false',
          'aria-label': `Step ${st.n} done: ${st.title}`,
          onClick: () => {
            const p = proj()
            if (p.done[st.n]) p.done[st.n] = false
            else p.done[st.n] = true
            p.updated = today()
            save()
            paintList()
          },
        },
        String(st.n).padStart(2, '0'),
      )
      list.append(
        h(
          'li',
          { dataset: { n: String(st.n) } },
          check,
          h(
            'details',
            null,
            h('summary', null, st.title),
            h('div', { class: 'ln-stack edit-algo-body' }, body),
          ),
        ),
      )
    }
    onFormat(paintFormatBits)
    paintFormatBits()
    paintProjects()
    paintList()
    el.append(
      ui.section(
        {
          eyebrow: 'Playbook, Module 3',
          title: 'The 12-step edit order',
          lede: 'Same order every time, so the decisions are already made. Never skip, never reorder. Tap a number when the step is done; open a step for the taps.',
        },
        h('div', { class: 'ln-grid edit-algo-head' }, nameField.el, progress),
        projRow,
        list,
        h(
          'div',
          { class: 'ln-row' },
          ui.btn(
            'Clear this project',
            () =>
              LN.sheet({
                title: 'Clear the checklist?',
                body: `Untick all 12 steps for "${state.current}".`,
                actions: [
                  { label: 'Keep', kind: 'quiet' },
                  {
                    label: 'Clear',
                    kind: 'danger',
                    onClick: () => {
                      proj().done = {}
                      save()
                      paintList()
                    },
                  },
                ],
              }),
            { kind: 'quiet', small: true },
          ),
        ),
      ),
      ui.section(
        { eyebrow: 'The laws', title: 'Cut on motion or sound' },
        ui.callout(
          'rule',
          'Cut on motion or on sound, never on nothing. A cut hides inside movement (a hand lifting, a pan ending) or on a beat. The exception is the Lunar Night reel, whose rhythm comes from the music.',
          'Law 2',
        ),
        ui.callout(
          'rule',
          'Every 3 s something changes: the shot, the scale, the text, the sound or the colour.',
          'Law 3',
        ),
        ui.callout(
          'rule',
          'Once an episode structure works, duplicate the project, strip the media and keep the text, timing, effects and grade. That skeleton is next week’s speed-run and a CapCut template you can sell.',
          'Law 4 · save the skeleton',
        ),
      ),
      ui.section(
        {
          eyebrow: 'Law 3 meter',
          title: 'Change every 3 s',
          lede: 'Type your shot lengths in order. The meter flags every stretch longer than 3 s where nothing changes.',
        },
        renderMeter(),
      ),
    )
  }

  /* ------------------------------------------------------------ speed ramps */
  /* A node is {t, v, o?}: clip time t (s), speed v (x). o, when set, is an
     instant drop: the curve leaves the node at speed o instead of v. */
  const RAMP_PRESETS = {
    impact: {
      name: 'Impact Drop',
      nodes: [
        { t: 0, v: 4.5 },
        { t: 0.2, v: 5 },
        { t: 0.35, v: 5, o: 0.4 },
        { t: 1.8, v: 0.4 },
        { t: 2.1, v: 5.5 },
      ],
      impact: 2,
      note: 'Fast in, instant drop at 0.35 s, a 0.4x hold to 1.8 s, then out at 5.5x. The drop is the impact frame.',
    },
    whip: {
      name: 'Whip-Pulse',
      nodes: [
        { t: 0, v: 6 },
        { t: 0.2, v: 0.8 },
        { t: 1.4, v: 0.8 },
        { t: 1.6, v: 6 },
      ],
      impact: 1,
      note: '6.0x, down to 0.8x for 1.2 s, back to 6.0x. The 0.2 s edges are a starting point; drag them.',
    },
  }
  const VMIN = 0.1
  const VMAX = 10
  const leaveV = nd => (nd.o == null ? nd.v : nd.o)
  const rampInterp = (va, vb, u, mode) =>
    va * (vb / va) ** (mode === 'linear' ? u : u * u * (3 - 2 * u))
  /** Output seconds for one segment: the integral of dt / speed. */
  function segOut(va, vb, T, mode) {
    if (T <= 0) return 0
    if (Math.abs(va - vb) < 1e-9) return T / va
    if (mode === 'linear') {
      const L = Math.log(vb / va)
      return ((T / va) * (1 - Math.exp(-L))) / L
    }
    const N = 240
    let acc = 0
    for (let i = 0; i <= N; i++) {
      const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2
      acc += w / rampInterp(va, vb, i / N, mode)
    }
    return (T / N / 3) * acc
  }
  function rampOut(nodes, mode) {
    const at = [0]
    for (let i = 0; i < nodes.length - 1; i++)
      at.push(
        at[i] +
          segOut(
            leaveV(nodes[i]),
            nodes[i + 1].v,
            nodes[i + 1].t - nodes[i].t,
            mode,
          ),
      )
    return at
  }
  const cloneNodes = ns => ns.map(n => ({ ...n }))

  function renderRamps(el) {
    const saved = ST.get('edit.ramp', null)
    const st = {
      preset: 'impact',
      mode: 'eased',
      impact: RAMP_PRESETS.impact.impact,
      nodes: cloneNodes(RAMP_PRESETS.impact.nodes),
      sel: 2,
    }
    if (saved && Array.isArray(saved.nodes) && saved.nodes.length >= 2) {
      Object.assign(st, saved)
      st.nodes = saved.nodes
        .map(n => ({
          t: Math.max(0, num(n.t, 0)),
          v: clamp(num(n.v, 1), VMIN, VMAX),
          ...(n.o == null ? {} : { o: clamp(num(n.o, 1), VMIN, VMAX) }),
        }))
        .sort((a, b) => a.t - b.t)
      st.nodes[0].t = 0
    }
    st.impact = clamp(Math.round(st.impact), 0, st.nodes.length - 1)
    st.sel = clamp(Math.round(st.sel || 0), 0, st.nodes.length - 1)
    const save = () =>
      ST.set('edit.ramp', {
        preset: st.preset,
        mode: st.mode,
        impact: st.impact,
        nodes: st.nodes,
        sel: st.sel,
      })
    let span = 1
    const fitSpan = () => {
      const last = st.nodes[st.nodes.length - 1].t
      span = Math.max(1, Math.ceil((last * 1.12 + 0.05) * 4) / 4)
    }
    fitSpan()

    /* chart geometry */
    const W = 360
    const H = 236
    const PX0 = 40
    const PX1 = 350
    const PY0 = 12
    const PY1 = 200
    const X = t => PX0 + (t / span) * (PX1 - PX0)
    const Yv = v => PY1 - ((Math.log10(v) + 1) / 2) * (PY1 - PY0)
    const tFromX = x => ((x - PX0) / (PX1 - PX0)) * span
    const vFromY = y => 10 ** (((PY1 - y) / (PY1 - PY0)) * 2 - 1)

    const svg = s('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'edit-ramp',
      role: 'img',
      'aria-label':
        'Speed curve: clip time across, speed up on a log scale from 0.1x to 10x. Drag the dots.',
    })
    const gGrid = s('g')
    const gCurve = s('g')
    const gNodes = s('g')
    svg.append(gGrid, gCurve, gNodes)

    function drawGrid() {
      gGrid.replaceChildren(
        s('rect', {
          x: PX0,
          y: Yv(0.5),
          width: PX1 - PX0,
          height: PY1 - Yv(0.5),
          class: 'edit-ramp-slow',
        }),
        s(
          'text',
          {
            x: PX1 - 4,
            y: PY1 - 6,
            class: 'edit-ramp-slowlab',
            'text-anchor': 'end',
          },
          'under 0.5x: 60 fps source',
        ),
      )
      for (const v of [0.1, 0.2, 0.5, 1, 2, 5, 10]) {
        gGrid.append(
          s('line', {
            x1: PX0,
            x2: PX1,
            y1: Yv(v),
            y2: Yv(v),
            class: v === 1 ? 'edit-ramp-one' : 'edit-ramp-grid',
          }),
          s(
            'text',
            {
              x: PX0 - 6,
              y: Yv(v) + 3.5,
              class: 'edit-tl-num',
              'text-anchor': 'end',
            },
            `${v}x`,
          ),
        )
      }
      const step = span <= 1.5 ? 0.25 : span <= 4 ? 0.5 : 1
      for (let t = 0; t <= span + 1e-9; t += step) {
        gGrid.append(
          s('line', {
            x1: X(t),
            x2: X(t),
            y1: PY0,
            y2: PY1,
            class: 'edit-ramp-grid v',
          }),
          s(
            'text',
            {
              x: X(t),
              y: PY1 + 14,
              class: 'edit-tl-num',
              'text-anchor': 'middle',
            },
            `${LN.math.round(t, 2)}`,
          ),
        )
      }
      gGrid.append(
        s(
          'text',
          { x: PX1, y: H - 4, class: 'edit-tl-num', 'text-anchor': 'end' },
          'clip time (s)',
        ),
      )
    }

    let handles = []
    function curvePath() {
      const pts = []
      const ns = st.nodes
      for (let i = 0; i < ns.length - 1; i++) {
        const a = ns[i]
        const b = ns[i + 1]
        if (a.o != null) pts.push([X(a.t), Yv(a.v)])
        const va = leaveV(a)
        const N = 40
        for (let k = 0; k <= N; k++) {
          const u = k / N
          pts.push([
            X(a.t + (b.t - a.t) * u),
            Yv(rampInterp(va, b.v, u, st.mode)),
          ])
        }
      }
      return pts
        .map((p, i) => `${i ? 'L' : 'M'}${fx(p[0], 1)} ${fx(p[1], 1)}`)
        .join(' ')
    }
    function drawCurve() {
      const imp = st.nodes[st.impact]
      gCurve.replaceChildren(
        s('line', {
          x1: X(imp.t),
          x2: X(imp.t),
          y1: PY0,
          y2: PY1,
          class: 'edit-tl-mark strong',
        }),
        s(
          'text',
          {
            x: X(imp.t) + 4,
            y: PY0 + 10,
            class: 'edit-tl-marklab',
          },
          'impact',
        ),
        s('path', { d: curvePath(), class: 'edit-ramp-curve' }),
      )
    }
    function buildHandles() {
      gNodes.replaceChildren()
      handles = st.nodes.map((nd, i) => {
        const main = makeHandle(i, 'v')
        const drop = nd.o != null ? makeHandle(i, 'o') : null
        return { main, drop }
      })
      placeHandles()
    }
    function makeHandle(i, key) {
      const g = s('g', {
        class: `edit-ramp-node ${key === 'o' ? 'drop' : ''}`.trim(),
        tabindex: '0',
        role: 'slider',
        'aria-label': `Node ${i + 1} ${key === 'o' ? 'drop-to speed' : 'speed'}`,
      })
      const hit = s('circle', { r: 17, class: 'edit-ramp-hit' })
      const dot =
        key === 'o'
          ? s('rect', {
              width: 10,
              height: 10,
              x: -5,
              y: -5,
              class: 'edit-ramp-dot',
              transform: 'rotate(45)',
            })
          : s('circle', { r: 6, class: 'edit-ramp-dot' })
      g.append(hit, dot)
      g.addEventListener('pointerdown', e => startDrag(e, i, key, g))
      g.addEventListener('keydown', e => keyNudge(e, i, key))
      g.addEventListener('focus', () => select(i))
      gNodes.append(g)
      return g
    }
    function placeHandles() {
      handles.forEach((hd, i) => {
        const nd = st.nodes[i]
        hd.main.setAttribute(
          'transform',
          `translate(${fx(X(nd.t), 2)} ${fx(Yv(nd.v), 2)})`,
        )
        hd.main.setAttribute('aria-valuetext', `${fx(nd.t)} s, ${fx(nd.v)}x`)
        hd.main.classList.toggle('sel', i === st.sel)
        if (hd.drop) {
          hd.drop.setAttribute(
            'transform',
            `translate(${fx(X(nd.t), 2)} ${fx(Yv(nd.o), 2)})`,
          )
          hd.drop.setAttribute('aria-valuetext', `drops to ${fx(nd.o)}x`)
        }
      })
    }
    const svgPoint = e => {
      const m = svg.getScreenCTM()
      if (!m) return null
      const p = svg.createSVGPoint()
      p.x = e.clientX
      p.y = e.clientY
      return p.matrixTransform(m.inverse())
    }
    function limitsT(i) {
      if (i === 0) return [0, 0]
      const lo = st.nodes[i - 1].t + 0.02
      const hi = i < st.nodes.length - 1 ? st.nodes[i + 1].t - 0.02 : span * 3
      return [lo, hi]
    }
    function moveNode(i, key, t, v) {
      const nd = st.nodes[i]
      if (key === 'o') nd.o = LN.math.round(clamp(v, VMIN, VMAX), 2)
      else {
        const [lo, hi] = limitsT(i)
        nd.t = LN.math.round(clamp(t, lo, hi), 2)
        nd.v = LN.math.round(clamp(v, VMIN, VMAX), 2)
      }
      update(false)
    }
    function startDrag(e, i, key, g) {
      e.preventDefault()
      select(i)
      g.setPointerCapture?.(e.pointerId)
      const move = ev => {
        const p = svgPoint(ev)
        if (!p) return
        moveNode(i, key, tFromX(p.x), vFromY(p.y))
      }
      const up = () => {
        g.removeEventListener('pointermove', move)
        g.removeEventListener('pointerup', up)
        g.removeEventListener('pointercancel', up)
        const before = span
        fitSpan()
        if (before !== span) {
          drawGrid()
          drawCurve()
          placeHandles()
        }
        save()
      }
      g.addEventListener('pointermove', move)
      g.addEventListener('pointerup', up)
      g.addEventListener('pointercancel', up)
    }
    function keyNudge(e, i, key) {
      const nd = st.nodes[i]
      const v = key === 'o' ? nd.o : nd.v
      const f = e.shiftKey ? 1.25 : 1.05
      let t = nd.t
      let nv = v
      if (e.key === 'ArrowUp') nv = v * f
      else if (e.key === 'ArrowDown') nv = v / f
      else if (e.key === 'ArrowRight' && key === 'v') t += 0.01
      else if (e.key === 'ArrowLeft' && key === 'v') t -= 0.01
      else return
      e.preventDefault()
      moveNode(i, key, t, nv)
      save()
    }
    function select(i) {
      st.sel = i
      placeHandles()
      paintTableSel()
    }

    /* readouts */
    const stats = h('div', { class: 'edit-stats' })
    const tcBox = h('div')
    const warnBox = h('div', { class: 'ln-stack' })
    const tableHost = h('div')
    const copy = ui.copyBlock('', { title: 'Node table', button: 'Copy table' })
    const presetNote = h('p', { class: 'ln-small ln-muted' })
    let inputs = []

    function nodeText() {
      const at = rampOut(st.nodes, st.mode)
      const total = at[at.length - 1]
      const imp = at[st.impact]
      const lines = [
        `${RAMP_PRESETS[st.preset] ? RAMP_PRESETS[st.preset].name : 'Custom ramp'} · CapCut Speed › Curve › Custom`,
        'node  clip time  speed',
      ]
      st.nodes.forEach((nd, i) => {
        const sp =
          nd.o == null
            ? `${fx(nd.v, 1)}x`
            : `${fx(nd.v, 1)}x then drop to ${fx(nd.o, 1)}x (two beats, as close as CapCut allows)`
        lines.push(
          `${String(i + 1).padStart(2)}    ${fx(nd.t).padStart(5)} s   ${sp}${i === st.impact ? '   <- impact' : ''}`,
        )
      })
      lines.push(
        '',
        `Clip span ${sec(st.nodes[st.nodes.length - 1].t)} -> output ${sec(total)} (${st.mode === 'linear' ? 'straight on the log scale' : 'eased between nodes'})`,
        `Impact at output ${sec(imp, 3)}: ${[24, 30, 60]
          .map(f => `${LN.fmt.tc(imp, f)} @${f}`)
          .join(' · ')}`,
      )
      return lines.join('\n')
    }
    function paintTableSel() {
      for (const r of inputs) r.row.classList.toggle('sel', r.i === st.sel)
    }
    function buildTable() {
      inputs = []
      const rows = st.nodes.map((nd, i) => {
        const mk = (key, val, o = {}) => {
          const inp = h('input', {
            class: 'ln-input edit-num',
            type: 'number',
            inputmode: 'decimal',
            step: o.step || '0.01',
            min: o.min,
            max: o.max,
            value: val == null ? '' : String(val),
            placeholder: o.ph || '',
            disabled: o.disabled,
            'aria-label': `Node ${i + 1} ${o.label}`,
            onFocus: () => select(i),
            onChange: e => {
              const raw = e.target.value
              if (key === 'o') {
                if (raw === '') {
                  const { o: _drop, ...rest } = st.nodes[i]
                  st.nodes[i] = rest
                } else st.nodes[i].o = clamp(num(raw, 1), VMIN, VMAX)
                st.preset = 'custom'
                update(true)
                return
              }
              if (key === 't') {
                const [lo, hi] = limitsT(i)
                st.nodes[i].t = LN.math.round(clamp(num(raw, 0), lo, hi), 2)
              } else st.nodes[i].v = clamp(num(raw, 1), VMIN, VMAX)
              st.preset = 'custom'
              fitSpan()
              update(true)
            },
          })
          return inp
        }
        const imp = h(
          'button',
          {
            type: 'button',
            class: 'ln-chip',
            'aria-pressed': String(i === st.impact),
            'aria-label': `Mark node ${i + 1} as the impact`,
            onClick: () => {
              st.impact = i
              update(true)
            },
          },
          i === st.impact ? 'impact' : 'mark',
        )
        const cells = [
          String(i + 1),
          mk('t', nd.t, { label: 'clip time', min: 0, disabled: i === 0 }),
          mk('v', nd.v, { label: 'speed', min: VMIN, max: VMAX }),
          mk('o', nd.o, { label: 'drop to', ph: '—', min: VMIN, max: VMAX }),
          imp,
        ]
        return cells
      })
      const tbl = ui.table(
        ['#', 'Time s', 'Speed x', 'Drop to', 'Impact'],
        rows,
        {
          label: 'Ramp nodes',
        },
      )
      LN.$$('tbody tr', tbl).forEach((row, i) => inputs.push({ row, i }))
      tableHost.replaceChildren(tbl)
      paintTableSel()
    }
    function update(rebuild) {
      if (rebuild) {
        st.impact = clamp(st.impact, 0, st.nodes.length - 1)
        st.sel = clamp(st.sel, 0, st.nodes.length - 1)
        drawGrid()
        buildHandles()
        buildTable()
        save()
      } else {
        placeHandles()
        for (const r of inputs) {
          const nd = st.nodes[r.i]
          const ins = LN.$$('input', r.row)
          if (ins[0] && document.activeElement !== ins[0])
            ins[0].value = String(nd.t)
          if (ins[1] && document.activeElement !== ins[1])
            ins[1].value = String(nd.v)
          if (ins[2] && document.activeElement !== ins[2])
            ins[2].value = nd.o == null ? '' : String(nd.o)
        }
      }
      drawCurve()
      const at = rampOut(st.nodes, st.mode)
      const total = at[at.length - 1]
      const srcSpan = st.nodes[st.nodes.length - 1].t
      const imp = at[st.impact]
      stats.replaceChildren(
        ui.stat(sec(srcSpan), 'Clip span'),
        ui.stat(sec(total), 'Output'),
        ui.stat(`${fx(srcSpan / total, 2)}x`, 'Average speed'),
        ui.stat(sec(imp, 3), 'Impact (output)'),
      )
      tcBox.replaceChildren(
        h(
          'div',
          { class: 'edit-nowrap' },
          ui.table(
            ['fps', 'Impact timecode', 'Frame', 'Output frames'],
            [24, 30, 60].map(f => [
              String(f),
              LN.fmt.tc(imp, f),
              String(LN.fmt.frames(imp, f)),
              String(LN.fmt.frames(total, f)),
            ]),
            { label: 'Impact frame timecodes' },
          ),
        ),
      )
      const minV = Math.min(...st.nodes.map(n => Math.min(n.v, leaveV(n))))
      const warns = []
      if (minV < 0.5)
        warns.push(
          ui.callout(
            'warn',
            `The lowest speed is ${fx(minV, 2)}x. Below 0.5x needs a 60 fps source (playbook): a 24 or 30 fps clip at ${fx(minV, 1)}x repeats frames and stutters.`,
            'Below 0.5x needs 60 fps',
          ),
          factNote(FACT.fps60, {
            yes: 'Your Pixel records 60 fps in the mode you use. Shoot pours and knife work at 60 for this ramp.',
            no: 'Your capture setup does not give you 60 fps in this mode. Keep every node at 0.5x or above.',
            check:
              'Confirm your camera app records at 60 fps at the resolution you use (Rig has the check), and shoot this shot at 60.',
          }),
        )
      warns.push(
        factNote(FACT.smooth, {
          yes: 'Smooth slow-mo is on your phone. Try it on the slow hold and compare edges on fast hands.',
          no: 'No Smooth slow-mo on your phone (or it is Pro). Rely on a 60 fps source instead.',
          check:
            'Smooth slow-mo (and any Optical flow or Frame blending choice) comes from memory: on 2023–24 builds it sat in the Speed panel with a Pro badge, and the modes may be desktop only. Open Speed on a slowed clip and note whether the toggle exists and whether it is Pro.',
        }),
      )
      warnBox.replaceChildren(...warns)
      copy.setText(nodeText())
    }

    const presetSel = ui.select({
      label: 'Preset',
      options: [
        { value: 'impact', label: 'Impact Drop' },
        { value: 'whip', label: 'Whip-Pulse' },
        { value: 'custom', label: 'Custom (your nodes)' },
      ],
      value: RAMP_PRESETS[st.preset] ? st.preset : 'custom',
      onChange: v => {
        const p = RAMP_PRESETS[v]
        if (!p) return
        st.preset = v
        st.nodes = cloneNodes(p.nodes)
        st.impact = p.impact
        st.sel = p.impact
        presetNote.textContent = p.note
        fitSpan()
        update(true)
      },
    })
    presetNote.textContent = RAMP_PRESETS[st.preset]
      ? RAMP_PRESETS[st.preset].note
      : 'Your own nodes. Pick a preset to start again.'
    const modeSeg = ui.seg({
      label: 'Between nodes',
      options: [
        { value: 'eased', label: 'Eased' },
        { value: 'linear', label: 'Straight' },
      ],
      value: st.mode,
      onChange: v => {
        st.mode = v
        update(true)
      },
    })
    const addBtn = ui.btn(
      'Add node',
      () => {
        const i = st.sel < st.nodes.length - 1 ? st.sel : st.nodes.length - 2
        const a = st.nodes[i]
        const b = st.nodes[i + 1]
        if (b.t - a.t < 0.05) {
          LN.toast('No room between these two nodes', { kind: 'warn' })
          return
        }
        const t = LN.math.round((a.t + b.t) / 2, 2)
        const v = LN.math.round(rampInterp(leaveV(a), b.v, 0.5, st.mode), 2)
        st.nodes.splice(i + 1, 0, { t, v })
        if (st.impact > i) st.impact += 1
        st.sel = i + 1
        st.preset = 'custom'
        presetSel.set('custom')
        update(true)
      },
      { kind: 'quiet', small: true },
    )
    const delBtn = ui.btn(
      'Delete node',
      () => {
        if (st.nodes.length <= 2 || st.sel === 0) {
          LN.toast('Keep the first node and at least two nodes', {
            kind: 'warn',
          })
          return
        }
        st.nodes.splice(st.sel, 1)
        if (st.impact >= st.sel) st.impact = Math.max(0, st.impact - 1)
        st.sel = Math.max(0, st.sel - 1)
        st.preset = 'custom'
        presetSel.set('custom')
        fitSpan()
        update(true)
      },
      { kind: 'quiet', small: true },
    )
    const dropBtn = ui.btn(
      'Toggle drop',
      () => {
        const nd = st.nodes[st.sel]
        if (nd.o == null) nd.o = LN.math.round(clamp(nd.v / 4, VMIN, VMAX), 2)
        else {
          const { o: _drop, ...rest } = nd
          st.nodes[st.sel] = rest
        }
        st.preset = 'custom'
        presetSel.set('custom')
        update(true)
      },
      { kind: 'quiet', small: true },
    )

    drawGrid()
    buildHandles()
    buildTable()
    update(false)

    const capSteps = ui.steps(
      [
        'Tap the clip on the timeline. You should see: a white border round the clip and the clip toolbar along the bottom.',
        'Tap Speed. You should see: two choices, Normal and Curve.',
        'Tap Curve. You should see: preset tiles such as None, Custom, Montage, Hero, Bullet.',
        'Tap Custom. You should see: the Custom tile highlighted, with Edit on it.',
        'Tap Custom again (Edit). You should see: a graph with a white playhead line and a few dots on it.',
        'Drag the graph so the playhead sits at the first time in the node table. The graph spans the whole clip. You should see: the playhead over that point in the clip.',
        'Tap + Add beat (or drag the dot already there). You should see: a dot on the playhead.',
        'Drag the dot up or down to the speed in the table. You should see: the dot at that height (0.1x at the bottom, 1x in the middle, 10x at the top).',
        'For a "drop to" node, add a second beat as close after the first as the editor allows, and pull it down to the drop speed. You should see: a near-vertical fall in the line.',
        'Repeat for every node, then tap the check mark. You should see: the clip a new length on the timeline. Compare it with Output above.',
      ].map(stepNode),
    )

    el.append(
      ui.section(
        {
          eyebrow: 'Speed › Curve',
          title: 'Speed-ramp curve',
          lede: 'Clip time runs across; speed runs up on a log scale, 0.1x to 10x, the way CapCut draws it. Drag a dot to move it, or type in the table. The page integrates the curve to give the real output length and where the impact lands.',
        },
        h(
          'div',
          { class: 'ln-split' },
          h(
            'div',
            { class: 'ln-stack' },
            h('div', { class: 'ln-card flush edit-ramp-card' }, svg),
            h('div', { class: 'ln-row' }, addBtn, delBtn, dropBtn),
          ),
          h(
            'div',
            { class: 'ln-stack' },
            presetSel.el,
            presetNote,
            modeSeg.el,
            stats,
            tcBox,
          ),
        ),
        warnBox,
      ),
      ui.section(
        {
          eyebrow: 'Numbers',
          title: 'Node table',
          lede: 'Time is clip time in seconds. "Drop to" makes an instant fall right after that node: CapCut cannot jump, so build it as two beats as close together as it allows.',
        },
        tableHost,
        copy,
      ),
      ui.section(
        {
          eyebrow: 'In CapCut',
          title: 'Put the curve in',
          lede: 'One tap per line. Check the "You should see" line before the next tap.',
        },
        h(
          'p',
          null,
          ui.path(
            'Tap the clip',
            'Speed',
            'Curve',
            'Custom',
            'Edit',
            'move the beats',
          ),
        ),
        capSteps,
        factNote(FACT.curve, {
          yes: 'Speed › Curve › Custom and its beat editor match your phone.',
          no: 'Your CapCut has no Custom curve. Use Normal speed on split pieces: split at each node and set each piece’s speed.',
          check:
            'The Curve presets, "+ Add beat", the 0.1x–10x axis and whether beats stick to source frames or output time all come from memory, not a checked source. Open Custom once and compare; CapCut’s own before → after duration readout should match Output here within a few frames.',
        }),
      ),
    )
  }

  /* ------------------------------------------------------------ audio spine */
  /* CapCut volume is 0–1000 with 100 = the clip as recorded (from memory, see
     the verify note). If that scale is linear amplitude, dB = 20·log10(v/100). */
  const volDb = v =>
    v <= 0 ? '−∞ dB' : `${LN.fmt.signed(20 * Math.log10(v / 100), 1)} dB`
  const dbVol = db => Math.round(100 * 10 ** (db / 20))
  const AUDIO = {
    market: {
      len: 35,
      rows: [
        [
          'Voice',
          '100',
          '−6 to −3 dB peaks',
          'Every pause cut. This is the spine.',
        ],
        [
          'Music bed',
          '10–20',
          '−18 to −12 dB, ducked',
          `House style. 10–20 is ${volDb(10)} to ${volDb(20)} against the track as imported.`,
        ],
        [
          'Foley',
          '100, sizzles +4 dB',
          '—',
          `Extract audio from the 60 fps clips; +4 dB is about volume ${dbVol(4)}.`,
        ],
        [
          'SFX',
          '30–60',
          '—',
          'One per big moment: the bite, the money shot, the verdict.',
        ],
      ],
      duck: { up: 20, down: 10 },
      note: 'House style sets the bed at 10–20 under the voice. The ducking planner below dips it a little further while you talk.',
    },
    reel: {
      len: 7,
      rows: [
        ['Voice', 'off', '—', 'No voice in a reel.'],
        ['Music bed', '20–30', '—', 'A slowed or ambient track.'],
        [
          'Night sound',
          '100',
          '—',
          'Or skip the track and keep the clip’s own night sound at 100.',
        ],
        ['SFX', 'off', '—', 'No SFX.'],
      ],
      duck: null,
      note: 'Pick one: an ambient track at 20–30, or the night sound at 100. Nothing to duck.',
    },
    doc: {
      len: 30,
      rows: [
        [
          'Voice',
          '100',
          '−6 to −3 dB peaks',
          'Voice first: the edit follows the words.',
        ],
        [
          'Music bed',
          '75 → 18 under speech',
          '−18 to −12 dB under voice',
          'Ducked with volume keyframes, 6-frame ramps.',
        ],
        [
          'Foley',
          '100, sizzles +4 dB',
          '—',
          `Close and loud. +4 dB is about volume ${dbVol(4)}.`,
        ],
        [
          'SFX',
          'sparingly',
          '—',
          'Sound Forge hits and risers on chapter turns.',
        ],
      ],
      duck: { up: 75, down: 18 },
      note: 'Voice-first spine: music sits up between lines and dips to 18 under every line.',
    },
    lab: {
      len: 20,
      rows: [
        ['Voice', '100', '−6 to −3 dB peaks', 'Short data lines.'],
        [
          'Music bed',
          '75 → 18 under speech',
          '−18 to −12 dB under voice',
          'Ducked when you speak.',
        ],
        [
          'Foley',
          '100, sizzles +4 dB',
          '—',
          'The pour, the blade, the sear: from the 60 fps clips.',
        ],
        ['SFX', '30–60', '—', 'The impact sound right on the ramp’s drop.'],
      ],
      duck: { up: 75, down: 18 },
      note: 'Playbook dB targets, with the brief’s 75 → 18 duck.',
    },
  }
  function parseRegions(text) {
    const out = []
    for (const line of String(text || '').split(/[\n,;]+/)) {
      const m = line.match(
        /(-?\d+(?:[.,]\d+)?)\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?)/,
      )
      if (!m) continue
      const a = num(m[1], 0)
      const b = num(m[2], 0)
      if (b > a && a >= 0) out.push([a, b])
    }
    out.sort((p, q) => p[0] - q[0])
    return out
  }
  /** Speech regions in → volume keyframes out, ramps of rampF frames. */
  function duckPlan(regions, fps, up, down, rampF) {
    const R = rampF
    const merged = []
    for (const [a, b] of regions) {
      const fa = Math.round(a * fps)
      const fb = Math.round(b * fps)
      const last = merged[merged.length - 1]
      if (last && fa - R <= last[1] + R) last[1] = Math.max(last[1], fb)
      else merged.push([fa, fb])
    }
    const keys = []
    for (const [fa, fb] of merged) {
      if (fa - R <= 0) keys.push({ f: 0, v: down, what: 'start ducked' })
      else {
        keys.push({ f: fa - R, v: up, what: 'start the dip' })
        keys.push({ f: fa, v: down, what: 'voice starts' })
      }
      keys.push({ f: fb, v: down, what: 'voice ends' })
      keys.push({ f: fb + R, v: up, what: 'back up' })
    }
    return { keys, merged }
  }

  function renderAudio(el) {
    const saved = ST.get('edit.duck', {})
    const st = {
      regions: saved.regions || '0.4-2.6\n4.0-9.5\n9.8-12.0\n15.2-21.0',
      fps: saved.fps || 30,
      ramp: saved.ramp || 6,
      up: saved.up,
      down: saved.down,
    }
    const save = () => ST.set('edit.duck', st)
    const lanes = h('div')
    const levels = h('div')
    const plannerOut = h('div', { class: 'ln-stack' })
    const copy = ui.copyBlock('', {
      title: 'Volume keyframes',
      button: 'Copy keyframes',
    })

    const defaults = () => AUDIO[getFormat()].duck || { up: 75, down: 18 }
    const upField = ui.field({
      label: 'Music between lines',
      type: 'number',
      value: st.up ?? defaults().up,
      onInput: v => {
        st.up = num(v, defaults().up)
        save()
        paint()
      },
    })
    const downField = ui.field({
      label: 'Music under voice',
      type: 'number',
      value: st.down ?? defaults().down,
      onInput: v => {
        st.down = num(v, defaults().down)
        save()
        paint()
      },
    })
    const regField = ui.field({
      label: 'Speech regions, seconds (one per line: 4.0-9.5)',
      value: st.regions,
      multiline: true,
      rows: 4,
      onInput: v => {
        st.regions = v
        save()
        paint()
      },
    })
    const fpsSeg = ui.seg({
      label: 'Frame rate',
      options: [24, 30, 60].map(f => ({ value: f, label: `${f} fps` })),
      value: st.fps,
      onChange: v => {
        st.fps = v
        save()
        paint()
      },
    })
    const rampSl = ui.slider({
      label: 'Ramp length',
      min: 2,
      max: 12,
      value: st.ramp,
      format: v => `${v} frames`,
      onInput: v => {
        st.ramp = v
        save()
        paint()
      },
    })

    function lanesSvg(fid, plan) {
      const A = AUDIO[fid]
      const regions = parseRegions(st.regions)
      const len = Math.max(
        A.len,
        regions.length ? Math.ceil(regions[regions.length - 1][1] + 2) : 0,
      )
      const W = 360
      const X0 = 70
      const X1 = 354
      const x = t => X0 + (clamp(t, 0, len) / len) * (X1 - X0)
      const LH = 26
      const names = [
        'Voice',
        fid === 'reel' ? 'Music / night' : 'Music bed',
        'Foley',
        'SFX',
      ]
      const svg = s('svg', {
        viewBox: `0 0 ${W} ${4 * (LH + 8) + 22}`,
        class: 'edit-lanes',
        role: 'img',
        'aria-label': `Audio spine for ${FMT[fid].name}: voice, music bed, foley and SFX lanes over ${len} seconds`,
      })
      names.forEach((n, i) => {
        const y = 4 + i * (LH + 8)
        svg.append(
          s('text', { x: 0, y: y + LH / 2 + 4, class: 'edit-hook-lab' }, n),
          s('rect', {
            x: X0,
            y,
            width: X1 - X0,
            height: LH,
            class: 'edit-lane',
          }),
        )
      })
      const yOf = i => 4 + i * (LH + 8)
      if (fid === 'reel') {
        svg.append(
          s(
            'text',
            { x: X0 + 6, y: yOf(0) + 17, class: 'edit-lane-off' },
            'off: no voice',
          ),
          s('rect', {
            x: x(0),
            y: yOf(1) + LH * 0.55,
            width: x(len) - x(0),
            height: LH * 0.45,
            class: 'edit-lane-music',
          }),
          s(
            'text',
            { x: X0 + 6, y: yOf(1) + 12, class: 'edit-lane-off' },
            'track 20–30, or night sound 100',
          ),
          s(
            'text',
            { x: X0 + 6, y: yOf(2) + 17, class: 'edit-lane-off' },
            'the clip’s own night sound',
          ),
          s(
            'text',
            { x: X0 + 6, y: yOf(3) + 17, class: 'edit-lane-off' },
            'off: no SFX',
          ),
        )
      } else {
        for (const [a, b] of regions)
          svg.append(
            s('rect', {
              x: x(a),
              y: yOf(0) + 3,
              width: Math.max(1, x(b) - x(a)),
              height: LH - 6,
              rx: 2,
              class: 'edit-lane-voice',
            }),
          )
        /* music envelope from the keyframes (linear between keys) */
        const up = plan.up
        const top = Math.max(up, plan.down, 1)
        const yv = v => yOf(1) + LH - 2 - (v / top) * (LH - 6)
        const pts = [
          [
            x(0),
            yv(plan.keys.length && plan.keys[0].f === 0 ? plan.keys[0].v : up),
          ],
        ]
        for (const k of plan.keys) pts.push([x(k.f / st.fps), yv(k.v)])
        pts.push([x(len), yv(up)])
        const d = pts
          .map((p, i) => `${i ? 'L' : 'M'}${fx(p[0], 1)} ${fx(p[1], 1)}`)
          .join(' ')
        svg.append(
          s('path', {
            d: `${d} L${x(len)} ${yOf(1) + LH} L${x(0)} ${yOf(1) + LH} Z`,
            class: 'edit-lane-music',
          }),
          s('path', { d, class: 'edit-lane-env' }),
        )
        /* example foley blocks and SFX hits, scaled to the lane */
        for (const [a, b] of [
          [0.1, 0.18],
          [0.42, 0.5],
          [0.7, 0.76],
        ])
          svg.append(
            s('rect', {
              x: x(a * len),
              y: yOf(2) + 5,
              width: x(b * len) - x(a * len),
              height: LH - 10,
              rx: 2,
              class: 'edit-lane-foley',
            }),
          )
        for (const t of [0, 0.55, 0.88])
          svg.append(
            s('path', {
              d: `M${fx(x(t * len), 1)} ${yOf(3) + LH - 3} L${fx(x(t * len), 1)} ${yOf(3) + 3} L${fx(x(t * len) + 9, 1)} ${yOf(3) + LH - 3} Z`,
              class: 'edit-hook-hit',
            }),
          )
      }
      const step = len > 40 ? 10 : 5
      for (let t = 0; t <= len + 1e-9; t += step)
        svg.append(
          s(
            'text',
            {
              x: x(t),
              y: 4 * (LH + 8) + 14,
              class: 'edit-tl-num',
              'text-anchor': t === 0 ? 'start' : 'middle',
            },
            `${t}s`,
          ),
        )
      return svg
    }

    function paint() {
      const fid = getFormat()
      const A = AUDIO[fid]
      levels.replaceChildren(
        ui.table(['Track', 'CapCut volume', 'Playbook dB', 'Notes'], A.rows, {
          label: 'Levels by track',
        }),
        h('p', { class: 'ln-small ln-muted' }, A.note),
      )
      if (!A.duck) {
        const plan = { keys: [], up: 0, down: 0 }
        lanes.replaceChildren(lanesSvg(fid, plan))
        plannerOut.replaceChildren(
          ui.callout(
            'tip',
            'Lunar Night Reel has no voice, so there is nothing to duck. Switch format to plan a duck.',
          ),
        )
        copy.hidden = true
        return
      }
      copy.hidden = false
      const up = clamp(num(upField.get(), A.duck.up), 0, 1000)
      const down = clamp(num(downField.get(), A.duck.down), 0, 1000)
      const regions = parseRegions(st.regions)
      const plan = duckPlan(regions, st.fps, up, down, st.ramp)
      plan.up = up
      plan.down = down
      lanes.replaceChildren(lanesSvg(fid, plan))
      if (!regions.length) {
        plannerOut.replaceChildren(
          ui.empty('Type at least one speech region, like 4.0-9.5.'),
        )
        copy.setText('')
        return
      }
      const rows = plan.keys.map((k, i) => [
        String(i + 1),
        sec(k.f / st.fps),
        LN.fmt.tc(k.f / st.fps, st.fps),
        String(k.f),
        String(k.v),
        k.what,
      ])
      plannerOut.replaceChildren(
        h(
          'p',
          { class: 'ln-small ln-muted' },
          `${plan.merged.length} ducked stretch${plan.merged.length === 1 ? '' : 'es'} · ${plan.keys.length} keyframes · ramps of ${st.ramp} frames = ${sec(st.ramp / st.fps, 3)} at ${st.fps} fps · ${up} is ${volDb(up)}, ${down} is ${volDb(down)}`,
        ),
        h(
          'div',
          { class: 'edit-nowrap' },
          ui.table(['#', 'Time', 'Timecode', 'Frame', 'Volume', 'What'], rows, {
            label: 'Ducking keyframes',
          }),
        ),
      )
      copy.setText(
        [
          `Music ducking · ${FMT[fid].name} · ${st.fps} fps · ${st.ramp}-frame ramps · ${up} -> ${down}`,
          'Tap the music clip, move the playhead to each time, tap the keyframe diamond, then Volume and set the value.',
          ...plan.keys.map(
            (k, i) =>
              `${String(i + 1).padStart(2)}  ${LN.fmt.tc(k.f / st.fps, st.fps)}  (${fx(k.f / st.fps)} s)  volume ${k.v}  ${k.what}`,
          ),
        ].join('\n'),
      )
    }
    onFormat(id => {
      const d = AUDIO[id].duck
      if (d) {
        upField.set(String(d.up))
        downField.set(String(d.down))
        st.up = d.up
        st.down = d.down
        save()
      }
      if (FMT[id].fps) {
        st.fps = FMT[id].fps
        fpsSeg.set(st.fps)
      }
      paint()
    })
    paint()

    el.append(
      ui.section(
        {
          eyebrow: 'Four tracks',
          title: 'The audio spine',
          lede: 'Voice on top, music bed under it, foley close, SFX on the big moments. The levels follow the format you picked.',
        },
        formatSeg().el,
        h('div', { class: 'ln-card flush edit-lanes-card' }, lanes),
        levels,
        ui.callout(
          'verify',
          'CapCut’s Volume slider runs 0–1000 with 100 as the clip as recorded, and the dB figures here assume that scale is linear. Both come from memory. Check once: set a clip to 50 and listen for a clear drop (about −6 dB). There is no level meter on mobile, so judge voice peaks on the export.',
        ),
      ),
      ui.section(
        {
          eyebrow: 'Foley and SFX',
          title: 'Fill the lower tracks',
          lede: 'Foley comes from your own clips. SFX come from the Sound Forge.',
        },
        h(
          'div',
          { class: 'ln-grid' },
          h(
            'div',
            { class: 'ln-card' },
            h('h3', null, 'Foley from the 60 fps clips'),
            ui.steps(
              [
                'Tap a 60 fps clip with a sizzle or a knife hit. You should see: a white border round the clip.',
                'Tap Extract audio in the clip toolbar. You should see: a new audio bar under the clip, and the clip itself muted.',
                `Tap the new audio bar, then Volume, and set ${dbVol(4)} for sizzles (+4 dB). You should see: the number ${dbVol(4)} above the slider.`,
              ].map(stepNode),
            ),
          ),
          h(
            'div',
            { class: 'ln-card' },
            h('h3', null, 'SFX from the Sound Forge'),
            h(
              'p',
              { class: 'ln-small ln-muted' },
              'Render whooshes, hits and risers as WAV in ',
              h('a', { href: '#forge' }, 'Forge › Sound Forge'),
              ', then bring them in from your phone’s storage.',
            ),
            ui.steps(
              [
                'Tap Audio in the main toolbar. You should see: Sounds, Extracted, Sound effects and Record (labels vary).',
                'Tap Sounds, then look for a tab for files on your device. You should see: your saved WAV files listed.',
                'Tap the file, then the add button. You should see: a new audio bar at the playhead.',
                'Tap the bar, Volume, set 30–60. You should see: the value above the slider.',
              ].map(stepNode),
            ),
            ui.callout(
              'verify',
              'The tab for files on your device (Your sounds › From device, or similar) is not established for Android, and WAV import is expected but unchecked. Try one Sound Forge WAV once and note the path.',
            ),
          ),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Ducking planner',
          title: 'Speech in, keyframes out',
          lede: 'Type when you talk. The planner gives keyframe pairs that dip the music with short ramps at your frame rate, ready to set one by one.',
        },
        h(
          'div',
          { class: 'ln-split' },
          h('div', { class: 'ln-stack' }, regField.el, fpsSeg.el, rampSl.el),
          h(
            'div',
            { class: 'ln-stack' },
            h('div', { class: 'edit-two' }, upField.el, downField.el),
            plannerOut,
          ),
        ),
        copy,
      ),
    )
  }

  /* ------------------------------------------------------------ music edit */
  function renderMusic(el) {
    if (LN.beatForge && typeof LN.beatForge.mount === 'function') {
      try {
        LN.beatForge.mount(el)
      } catch (e) {
        console.error('[LN] Beat Forge failed to mount', e)
        el.append(
          h(
            'div',
            { class: 'ln-fail' },
            `Music Edit failed to load: ${e && e.message}`,
          ),
        )
      }
      return
    }
    el.append(
      ui.callout(
        'tip',
        'Music Edit is not available in this build.',
        'Music Edit',
      ),
    )
  }

  /* ------------------------------------------------------------ auto-cut */
  function renderAutocut(el) {
    const mountIt = () => {
      try {
        LN.autocut.mount(el)
      } catch (e) {
        console.error('[LN] Auto-Cut failed to mount', e)
        el.append(
          h(
            'div',
            { class: 'ln-fail' },
            `Auto-Cut failed to load: ${e && e.message}`,
          ),
        )
      }
    }
    if (LN.autocut && typeof LN.autocut.mount === 'function') {
      mountIt()
      return
    }
    const note = h(
      'div',
      { class: 'ln-stack' },
      ui.callout(
        'tip',
        'Auto-Cut is loading. It finds silences and bad takes in a talking clip and gives back a jump-cut MP4 and a cut list.',
        'Auto-Cut',
      ),
    )
    el.append(note)
    let tries = 0
    const retry = () => {
      if (LN.autocut && typeof LN.autocut.mount === 'function') {
        note.remove()
        mountIt()
        return
      }
      tries += 1
      if (tries < 12) {
        setTimeout(retry, 250)
        return
      }
      note.replaceChildren(
        ui.callout(
          'warn',
          'Auto-Cut is not in this copy of the OS. Do it by hand: play the talking clip, split at the start and end of every pause, delete the pauses. The 12-step order on the Algorithm tab still applies.',
          'Auto-Cut unavailable',
        ),
        h(
          'p',
          null,
          ui.path(
            'Tap the clip',
            'playhead at the pause',
            'Split',
            'tap the pause',
            'Delete',
          ),
        ),
      )
    }
    setTimeout(retry, 250)
  }

  /* ------------------------------------------------------------ captions */
  const CAP_STYLE = {
    market: {
      rows: [
        ['Font', 'Inter Bold'],
        ['Colour', 'White with a black outline, no box'],
        ['Line', '3–4 words a line, always on, no bouncing'],
        ['Place', 'Low, under your face, but above the bottom quarter'],
        [
          'Hook card',
          'White box, black Inter Bold, lowercase, 8 words max, about 2 s, below the top band',
        ],
      ],
      max: 4,
      caseRule: 'Natural casing for captions; the hook card is all lowercase.',
    },
    reel: {
      rows: [
        ['Font', 'Condensed sans: Oswald, Antonio or Estrella Early'],
        [
          'Colour',
          'Lime #D6DB05, small black shadow; no box, outline or animation',
        ],
        ['Line', 'Two short lines, lowercase, no punctuation'],
        ['Place', 'Centred in the upper third, just above the building'],
        ['Time', 'First 3 s of the shot only'],
      ],
      max: 4,
      caseRule: 'All lowercase, no punctuation, two short lines.',
    },
    doc: {
      rows: [
        [
          'Font',
          'The pairing’s workhorse, Medium weight (pairing 10: Merriweather; pairing 1: Inter)',
        ],
        ['Size', '4–5% of frame height: 80–100 px on 1080×1920'],
        [
          'Colour',
          'Off-white #F2EDE4 with a 60% black shadow. Never pure yellow on food',
        ],
        ['Line', '2–4 words a card'],
        ['Place', 'Middle third, inside the safe zones'],
      ],
      max: 4,
      caseRule: 'Natural sentence casing, light punctuation.',
    },
    lab: {
      rows: [
        ['Font', 'The workhorse, Medium weight; mono for data cards'],
        ['Size', '80–100 px on 1080×1920'],
        ['Colour', 'Off-white #F2EDE4 with a 60% black shadow'],
        ['Line', '2–4 words a card'],
        ['Place', 'Middle third; data cards clear of the right 140 px'],
      ],
      max: 4,
      caseRule: 'Natural casing; keep numbers and units exact (180 °C, 12 g).',
    },
  }
  /** 9:16 frame with the safe zones and where this format's text sits. */
  function captionFrame(fid) {
    const svg = s('svg', {
      viewBox: '0 0 1080 1920',
      class: 'edit-frame',
      role: 'img',
      'aria-label': `Caption placement for ${FMT[fid].name} on a 1080 by 1920 frame, with the top 130, right 140 and bottom 484 pixel safe zones shaded`,
    })
    svg.append(
      s('rect', {
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        class: 'edit-frame-bg',
      }),
      s('rect', {
        x: 0,
        y: 0,
        width: 1080,
        height: 130,
        class: 'edit-frame-unsafe',
      }),
      s('rect', {
        x: 940,
        y: 130,
        width: 140,
        height: 1306,
        class: 'edit-frame-unsafe',
      }),
      s('rect', {
        x: 0,
        y: 1436,
        width: 1080,
        height: 484,
        class: 'edit-frame-unsafe',
      }),
      s('line', {
        x1: 0,
        x2: 1080,
        y1: 640,
        y2: 640,
        class: 'edit-frame-third',
      }),
      s('line', {
        x1: 0,
        x2: 1080,
        y1: 1280,
        y2: 1280,
        class: 'edit-frame-third',
      }),
      s('line', {
        x1: 0,
        x2: 1080,
        y1: 1440,
        y2: 1440,
        class: 'edit-frame-quarter',
      }),
      s(
        'text',
        { x: 24, y: 1500, class: 'edit-frame-note' },
        'bottom 484 px: app UI',
      ),
      s('text', { x: 24, y: 100, class: 'edit-frame-note' }, 'top 130 px'),
    )
    const cx = 470
    if (fid === 'market') {
      svg.append(
        s('rect', {
          x: 120,
          y: 180,
          width: 700,
          height: 120,
          rx: 14,
          class: 'edit-cap-box',
          fill: LN.palette.bone,
        }),
        s(
          'text',
          {
            x: cx,
            y: 258,
            class: 'edit-cap-hook',
            fill: LN.palette.obsidian,
            'text-anchor': 'middle',
          },
          'twelve dollar tamales?',
        ),
        s(
          'text',
          {
            x: cx,
            y: 1360,
            class: 'edit-cap-market',
            fill: LN.palette.bone,
            stroke: LN.palette.obsidian,
            'text-anchor': 'middle',
          },
          'the masa is soft',
        ),
      )
    } else if (fid === 'reel') {
      svg.append(
        s(
          'text',
          {
            x: cx,
            y: 470,
            class: 'edit-cap-reel',
            fill: LN.palette.lime,
            'text-anchor': 'middle',
          },
          'small town',
        ),
        s(
          'text',
          {
            x: cx,
            y: 570,
            class: 'edit-cap-reel',
            fill: LN.palette.lime,
            'text-anchor': 'middle',
          },
          'in the south',
        ),
      )
    } else {
      svg.append(
        s(
          'text',
          {
            x: cx,
            y: 990,
            class: 'edit-cap-work',
            fill: LN.palette.bone,
            'text-anchor': 'middle',
          },
          fid === 'lab' ? 'brine at 6%' : 'my grandmother’s horno',
        ),
      )
      if (fid === 'lab')
        svg.append(
          s('rect', {
            x: 80,
            y: 700,
            width: 520,
            height: 110,
            rx: 6,
            class: 'edit-cap-databox',
          }),
          s(
            'text',
            { x: 110, y: 770, class: 'edit-cap-data' },
            '62 °C · 45 MIN',
          ),
        )
    }
    return svg
  }
  function applyGlossary(text, glossary) {
    let out = String(text || '')
    for (const term of glossary) {
      const plain = term
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (!plain) continue
      const loose = plain.replace(
        /[aeioun]/gi,
        c => `[${c}${c.toUpperCase()}\\u00C0-\\u00FF]`,
      )
      try {
        out = out.replace(
          new RegExp(`(^|[^\\p{L}])${loose}(?=$|[^\\p{L}])`, 'giu'),
          (_m, pre) => `${pre}${term}`,
        )
      } catch (_e) {
        /* odd term: skip it */
      }
    }
    return out
  }
  /** Offline split: glossary spellings, then cards of at most `max` words. */
  function localCards(raw, glossary, max = 4) {
    const fixed = applyGlossary(raw, glossary)
    const cards = []
    for (const phrase of fixed.split(/(?<=[.!?,;:])\s+|\n+/)) {
      const w = words(phrase.replace(/[.!?;:]+$/g, ''))
      for (let i = 0; i < w.length; ) {
        const left = w.length - i
        const take =
          left <= max
            ? left
            : left === max + 1
              ? Math.ceil(left / 2)
              : Math.min(max, 3)
        cards.push(
          w
            .slice(i, i + take)
            .join(' ')
            .replace(/,$/, ''),
        )
        i += take
      }
    }
    return cards.filter(Boolean)
  }
  const splitGlossary = t =>
    String(t || '')
      .split(/[,\n]+/)
      .map(x => x.trim())
      .filter(Boolean)

  function renderCaptions(el) {
    const styleHost = h('div', { class: 'edit-cap-style' })
    const paintStyle = () => {
      const fid = getFormat()
      styleHost.replaceChildren(
        h('div', { class: 'edit-frame-wrap' }, captionFrame(fid)),
        h(
          'div',
          { class: 'ln-stack' },
          h('h3', { class: 'ln-h3' }, `${FMT[fid].name} captions`),
          ui.kv(CAP_STYLE[fid].rows),
          h(
            'p',
            { class: 'ln-faint ln-small' },
            'Preview in this page’s fonts. Shaded: keep text out of the top 130 px, right 140 px and bottom 484 px. Dashed lines: the thirds; the solid line is the bottom quarter.',
          ),
        ),
      )
    }
    onFormat(paintStyle)
    paintStyle()

    const raw = ui.field({
      label: 'Raw auto-captions (paste from CapCut)',
      value: ST.get(
        'edit.capraw',
        'ok so this lady in espanola sells red chile pork tamales out of her kitchen. twelve bucks a dozen. the masa is so soft and the chile has that slow heat. honestly i was not ready for this',
      ),
      multiline: true,
      rows: 5,
      onInput: v => {
        ST.set('edit.capraw', v)
        paintLocal()
      },
    })
    const gloss = ui.field({
      label: 'Glossary: spell these exactly (Tewa, Spanish, dish names)',
      value: ST.get(
        'edit.glossary',
        'Ohkay Owingeh, Tewa, Popé, Española, Santa Fe, chile, masa, posole, horno',
      ),
      multiline: true,
      rows: 2,
      onInput: v => {
        ST.set('edit.glossary', v)
        paintLocal()
      },
    })
    const result = h('div', { class: 'ln-stack' })
    const status = h('p', { class: 'ln-small ln-muted', role: 'status' })

    function cardList(hook, cards, max, label) {
      const all = []
      if (hook) all.push(`HOOK: ${hook}`)
      all.push(...cards)
      const list = h(
        'ol',
        { class: 'edit-cards' },
        cards.map(c => {
          const n = words(c).length
          return h(
            'li',
            { class: n > max ? 'over' : '' },
            h('span', null, c),
            n > max ? ui.chip(`${n} words`, 'crimson') : null,
            h(
              'button',
              {
                type: 'button',
                class: 'ln-btn small quiet',
                'aria-label': `Copy card: ${c}`,
                onClick: () => LN.copy(c, { label: 'Card copied' }),
              },
              'Copy',
            ),
          )
        }),
      )
      const hookWords = words(hook)
      return h(
        'div',
        { class: 'ln-stack' },
        h('h3', { class: 'ln-h3' }, label),
        hook
          ? h(
              'div',
              { class: 'edit-hookcard' },
              h('span', { class: 'ln-eyebrow' }, 'Hook card'),
              h('b', null, hook),
              hookWords.length > 8 || hook !== hook.toLowerCase()
                ? ui.chip('over 8 words or not lowercase', 'crimson')
                : ui.chip(`${hookWords.length} words`, 'sage'),
            )
          : null,
        list,
        h(
          'div',
          { class: 'ln-row' },
          ui.btn(
            'Copy all cards',
            () => LN.copy(all.join('\n'), { label: 'Cards copied' }),
            {
              kind: 'ghost',
              small: true,
            },
          ),
        ),
      )
    }
    function paintLocal() {
      const fid = getFormat()
      const cards = localCards(
        raw.get(),
        splitGlossary(gloss.get()),
        CAP_STYLE[fid].max,
      )
      result.replaceChildren(
        cardList(
          '',
          fid === 'reel'
            ? cards.map(c => c.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ''))
            : cards,
          CAP_STYLE[fid].max,
          'Quick split (on the phone, no Fable)',
        ),
        h(
          'p',
          { class: 'ln-faint ln-small' },
          'Glossary spellings applied and cut to 4 words or fewer. It does not fix misheard words or write the hook; Polish with Fable 5.1 does.',
        ),
      )
    }
    function prompt() {
      const fid = getFormat()
      const C = CAP_STYLE[fid]
      return [
        `You clean CapCut auto-captions for Chef Rainbird's ${FMT[fid].name} video.`,
        `Caption style: ${C.rows.map(r => `${r[0]}: ${r[1]}`).join('; ')}.`,
        `Casing: ${C.caseRule}`,
        `Glossary. Spell these exactly as written, with their accents and capitals (Tewa, Spanish and dish names): ${splitGlossary(gloss.get()).join(', ') || '(none)'}.`,
        'Rules:',
        `- Split the speech into caption cards of 1 to ${C.max} words, in spoken order. Never more than ${C.max} words on a card.`,
        '- Fix words the auto-captions misheard, using the glossary and context. Keep his words, his order and his voice. Add nothing he did not say.',
        '- No emoji, no hashtags, no exclamation marks.',
        '- Write one hook card: 8 words or fewer, all lowercase, casual, true to what he says.',
        '- List any word you were unsure about in "unsure".',
        'Return only JSON in exactly this shape: {"hook":"…","cards":["…"],"unsure":["…"]}',
        '',
        'RAW CAPTIONS:',
        raw.get(),
      ].join('\n')
    }
    const polishBtn = ui.btn('Polish with Fable 5.1', async () => {
      polishBtn.disabled = true
      status.textContent = 'Fable 5.1 is cleaning the captions…'
      try {
        const r = await LN.ai.ask(prompt(), { json: true })
        const cards = (Array.isArray(r && r.cards) ? r.cards : [])
          .map(c => String(c).trim())
          .filter(Boolean)
        if (!cards.length) throw { code: 'invalid_json' }
        const hook = String((r && r.hook) || '').trim()
        const fid = getFormat()
        result.replaceChildren(
          cardList(hook, cards, CAP_STYLE[fid].max, 'Polished by Fable 5.1'),
          Array.isArray(r.unsure) && r.unsure.length
            ? ui.callout(
                'verify',
                `Check these words against what you said: ${r.unsure.join(', ')}.`,
                'Fable was unsure',
              )
            : null,
        )
        const over = cards.filter(
          c => words(c).length > CAP_STYLE[fid].max,
        ).length
        status.textContent = over
          ? `${cards.length} cards; ${over} run over ${CAP_STYLE[fid].max} words. Split those by hand.`
          : `${cards.length} cards, all ${CAP_STYLE[fid].max} words or fewer.`
      } catch (e) {
        status.textContent = LN.ai.explain(e)
      } finally {
        polishBtn.disabled = false
      }
    })
    LN.ai.available().then(ok => {
      if (!ok) {
        polishBtn.disabled = true
        status.textContent =
          'Fable 5.1 is reachable only inside claude.ai. Copy the prompt into a Fable 5.1 chat instead.'
      }
    })
    onFormat(paintLocal)
    paintLocal()

    el.append(
      ui.section(
        {
          eyebrow: 'Captions',
          title: 'Generate, then fix every line',
          lede: 'CapCut writes the first draft. You fix every line; Fable 5.1 can do the spelling pass first.',
        },
        h(
          'p',
          null,
          ui.path('Captions', 'Auto captions', 'English', 'Generate'),
        ),
        ui.steps(
          [
            'Tap Captions in the main toolbar (some versions put it under Text). You should see: Auto captions in the list.',
            'Tap Auto captions. You should see: a language choice.',
            'Pick English. You should see: English selected.',
            'Tap Generate. You should see: a progress bar, then caption bars on their own track under the video.',
            'Tap the first caption bar, then Edit. You should see: the keyboard with that caption’s text.',
            'Fix the line: spelling, names, 4 words max. Do every line; no exceptions. You should see: the corrected text on the preview.',
          ].map(stepNode),
        ),
        factNote(FACT.captions, {
          yes: 'Auto captions works on your phone.',
          no: 'Auto captions is missing or locked on your phone. Type the cards below with Text › Add text instead.',
          check:
            'Auto captions moves between Captions and Text across versions, and some caption styles are Pro. Run it once on a talking clip and note where it lives.',
        }),
      ),
      ui.section(
        {
          eyebrow: 'Style',
          title: 'Caption style for this format',
          lede: 'Never mix styles between formats.',
        },
        formatSeg().el,
        styleHost,
      ),
      ui.section(
        {
          eyebrow: 'Fable 5.1',
          title: 'Polish the captions',
          lede: 'Paste the raw captions. Fable 5.1 fixes misheard words, keeps your Tewa, Spanish and dish names spelled your way, cuts cards to 4 words, and writes a hook card.',
        },
        h('div', { class: 'ln-split' }, raw.el, gloss.el),
        h(
          'div',
          { class: 'ln-row' },
          polishBtn,
          ui.btn(
            'Copy prompt for a Fable 5.1 chat',
            () => LN.copy(LN.ai.compose(prompt()), { label: 'Prompt copied' }),
            {
              kind: 'ghost',
            },
          ),
        ),
        status,
        result,
      ),
    )
  }

  /* ------------------------------------------------------------ edit plan */
  const PLAN_TARGET = { market: 30, reel: 7, doc: 60, lab: 30 }
  const SAMPLE_CLIPS = [
    'plate-landing - 4.2 - the plate drops onto the truck hood, steam rising',
    'handoff - 6.0 - she hands the bag through the screen door',
    'unwrap - 5.5 - husk peeled back, red chile pork inside',
    'inside-shot - 3.0 - macro of the masa and the chile',
    'first-bite - 4.0 - first bite, my face',
    'verdict-talk - 9.0 - I give the score and why',
  ].join('\n')
  const SAMPLE_PLAN = {
    hook: {
      text: 'twelve dollar tamales from a stranger',
      clip: 'plate-landing',
      in: 0,
      out: 2,
    },
    rows: [
      [
        'plate-landing',
        0,
        2,
        'twelve dollar tamales from a stranger',
        'thud 40',
        '',
      ],
      ['handoff', 1, 3.5, 'española, saturday', '', ''],
      ['handoff', 3.5, 6, 'twelve bucks a dozen', '', ''],
      ['unwrap', 0.5, 3, 'red chile pork', '', ''],
      ['unwrap', 3, 5, '', '', '108% push-in'],
      ['inside-shot', 0, 2.5, 'look at that masa', '', ''],
      ['plate-landing', 2.2, 4.2, '', 'sizzle 35', ''],
      ['first-bite', 0.3, 3.3, '', 'crunch 45', '112% on the bite'],
      ['verdict-talk', 0, 3, '', '', ''],
      ['verdict-talk', 3.5, 6.5, '', '', ''],
      ['verdict-talk', 6.5, 8.5, '8.5/10', 'pop 50', '110% on the verdict'],
      ['rating card', 0, 1.5, '8.5 · the masa is the move', '', ''],
    ].map((r, i) => ({
      n: i + 1,
      clip: r[0],
      keep_in: r[1],
      keep_out: r[2],
      on_screen_text: r[3],
      sfx: r[4],
      zoom: r[5],
    })),
    steps: [
      'Open CapCut and tap New project. You should see: your camera roll.',
      'Tap the six clips in this order: plate-landing, handoff, unwrap, inside-shot, first-bite, verdict-talk. You should see: a number on each clip, 1 to 6.',
      'Tap Add. You should see: the six clips in a row on the timeline.',
      'Tap Ratio (or Aspect ratio) in the bottom toolbar. You should see: a row of shapes.',
      'Tap 9:16. You should see: the preview fill a tall frame.',
      'Tap the back arrow, then tap the first clip, plate-landing. You should see: a white border round it.',
      'Drag the timeline until the playhead sits at 00:02. You should see: 00:02 in the time readout.',
      'Tap Split. You should see: the clip cut in two at the playhead.',
      'Tap the right-hand piece. You should see: a white border round only that piece.',
      'Tap Delete. You should see: plate-landing now 2 s long, with handoff right after it.',
      'Do the same split and delete for each row of the cut sheet, in order. You should see: the timeline match the Keep column.',
    ],
    cover: {
      frame: 'unwrap at 1.2 s, red chile showing',
      title: 'Twelve Dollar Tamales',
    },
  }
  function normPlan(r) {
    const o = r && typeof r === 'object' ? r : {}
    const hk = o.hook && typeof o.hook === 'object' ? o.hook : {}
    const cv = o.cover && typeof o.cover === 'object' ? o.cover : {}
    const str = v => (v == null ? '' : String(v))
    return {
      hook: {
        text: str(hk.text),
        clip: str(hk.clip),
        in: num(hk.in, 0),
        out: num(hk.out, 0),
      },
      rows: (Array.isArray(o.rows) ? o.rows : [])
        .filter(x => x && typeof x === 'object')
        .map((x, i) => ({
          n: num(x.n, i + 1),
          clip: str(x.clip),
          keep_in: num(x.keep_in, 0),
          keep_out: num(x.keep_out, 0),
          on_screen_text: str(x.on_screen_text),
          sfx: str(x.sfx),
          zoom: str(x.zoom),
        })),
      steps: (Array.isArray(o.steps) ? o.steps : [])
        .map(x => str(x).trim())
        .filter(Boolean),
      cover: { frame: str(cv.frame), title: str(cv.title) },
    }
  }
  const rowLen = r => Math.max(0, r.keep_out - r.keep_in)
  function planChecks(p, fid, target) {
    const out = []
    const total = p.rows.reduce((a, r) => a + rowLen(r), 0)
    if (words(p.hook.text).length > 8)
      out.push(
        `Hook text runs ${words(p.hook.text).length} words; the house max is 8.`,
      )
    if (
      p.hook.text &&
      p.hook.text !== p.hook.text.toLowerCase() &&
      fid !== 'doc'
    )
      out.push('Hook text has capitals; the house style is lowercase.')
    if (words(p.cover.title).length > 4)
      out.push(
        `Cover title runs ${words(p.cover.title).length} words; the max is 4.`,
      )
    if (target > 0 && Math.abs(total - target) > target * 0.15)
      out.push(
        `Kept total is ${sec(total, 1)} against a ${sec(target, 0)} target.`,
      )
    const bad = p.rows.filter(r => r.keep_out <= r.keep_in)
    if (bad.length)
      out.push(
        `Row ${bad.map(r => r.n).join(', ')}: keep out is not after keep in.`,
      )
    if (fid === 'market') {
      const long = p.rows.filter(
        r => rowLen(r) > 3.05 && !/rating/i.test(r.clip),
      )
      if (long.length)
        out.push(
          `Row ${long.map(r => r.n).join(', ')} hold${long.length === 1 ? 's' : ''} over 3 s; Marketplace cuts every 1–3 s.`,
        )
      const zooms = p.rows.filter(r => r.zoom.trim()).length
      if (zooms && (zooms < 2 || zooms > 3))
        out.push(`${zooms} zooms; the house style is 2–3.`)
    }
    const noSee = p.steps.filter(x => !/you should see/i.test(x)).length
    if (noSee)
      out.push(
        `${noSee} step${noSee === 1 ? '' : 's'} without a "You should see:" check.`,
      )
    return { total, issues: out }
  }
  function planMarkdown(p, meta) {
    const L = [
      `# Edit plan: ${meta.title}`,
      '',
      `${meta.format} · target ${meta.target} s · kept ${fx(meta.total, 1)} s · ${meta.date}`,
      '',
      '## Hook (0–3 s)',
      '',
      `- Text: ${p.hook.text || '—'}`,
      `- Clip: ${p.hook.clip || '—'} ${fx(p.hook.in, 1)}–${fx(p.hook.out, 1)} s`,
      '',
      '## Cut sheet',
      '',
      '| # | Clip | Keep (s) | Len | On-screen text | SFX | Zoom |',
      '|---|---|---|---|---|---|---|',
      ...p.rows.map(
        r =>
          `| ${r.n} | ${r.clip} | ${fx(r.keep_in, 1)}–${fx(r.keep_out, 1)} | ${fx(rowLen(r), 1)} | ${r.on_screen_text.replace(/\|/g, '/')} | ${r.sfx} | ${r.zoom} |`,
      ),
      '',
      '## CapCut, one tap per line',
      '',
      ...p.steps.map((x, i) => {
        const [act, ...see] = x.split(/you should see:?/i)
        return `${i + 1}. ${act.trim()}${see.length ? `\n   - You should see: ${see.join(' ').trim()}` : ''}`
      }),
      '',
      '## Cover',
      '',
      `- Frame: ${p.cover.frame || '—'}`,
      `- Title: ${p.cover.title || '—'}`,
      '',
    ]
    return L.join('\n')
  }
  const planText = md =>
    md
      .replace(/^#+ /gm, '')
      .replace(/^\|---.*$/gm, '')
      .replace(/^\| ?/gm, '')
      .replace(/ ?\|$/gm, '')
      .replace(/ \| /g, '  ·  ')

  function renderPlan(el) {
    const saved = ST.get('edit.plan.inputs', {})
    const fidNow = getFormat()
    const target = ui.field({
      label: 'Target length (s)',
      type: 'number',
      value: saved.target || PLAN_TARGET[fidNow],
      onInput: () => saveInputs(),
    })
    const bpm = ui.field({
      label: 'Music BPM (optional)',
      type: 'number',
      value: saved.bpm || '',
      placeholder: 'e.g. 92',
      onInput: () => {
        saveInputs()
        paintBeat()
      },
    })
    const title = ui.field({
      label: 'Project name',
      value: saved.title || 'Marketplace ep 1',
      onInput: () => saveInputs(),
    })
    const clips = ui.field({
      label: 'Clips: name - duration - what happens (one per line)',
      value: saved.clips || SAMPLE_CLIPS,
      multiline: true,
      rows: 6,
      onInput: () => saveInputs(),
    })
    const verdict = ui.field({
      label: 'Verdict and score (what you say)',
      value:
        saved.verdict ||
        '8.5/10. the masa is the move. would drive back for these.',
      multiline: true,
      rows: 2,
      onInput: () => saveInputs(),
    })
    function saveInputs() {
      ST.set('edit.plan.inputs', {
        target: target.get(),
        bpm: bpm.get(),
        title: title.get(),
        clips: clips.get(),
        verdict: verdict.get(),
      })
    }
    const beatNote = h('p', { class: 'ln-small ln-muted' })
    function paintBeat() {
      const b = num(bpm.get(), 0)
      if (b >= 40 && b <= 240) {
        const one = 60 / b
        beatNote.textContent = `At ${b} BPM one beat is ${sec(one, 3)}: 2 beats ${sec(one * 2)}, 4 beats ${sec(one * 4)}, 8 beats ${sec(one * 8)}. Fable lands cuts on these.`
      } else
        beatNote.textContent =
          'No BPM: cuts land on motion or sound instead of the beat grid.'
    }
    paintBeat()
    onFormat(id => {
      target.set(String(PLAN_TARGET[id]))
      saveInputs()
    })
    const fromRail = ui.btn(
      'Load from shot list',
      () => {
        const rail = LN.shotlist.all().filter(t => t.status !== '86')
        if (!rail.length) {
          LN.toast(
            'The shot list is empty. Add shots on the Shot Bible page.',
            { kind: 'warn' },
          )
          return
        }
        clips.set(
          rail
            .map(
              t =>
                `${LN.fmt.slug(t.name || 'clip') || 'clip'} - ${String(t.duration || '?').replace(/\s*s$/, '')} - ${t.notes || t.name || ''}`,
            )
            .join('\n'),
        )
        saveInputs()
        LN.toast(
          `Loaded ${rail.length} shots. Fix each duration to the real clip length.`,
        )
      },
      { kind: 'quiet', small: true },
    )

    function prompt() {
      const fid = getFormat()
      const f = FMT[fid]
      const b = num(bpm.get(), 0)
      const one = b >= 40 && b <= 240 ? 60 / b : 0
      return [
        'You are the editor for Chef Rainbird (@Popé). He edits only in CapCut Mobile on an Android Pixel 10 Pro XL. You write the plan; he does every tap himself on the phone. You cannot open his project.',
        `FORMAT: ${f.name}. House rules: ${f.rules.map(r => `${r[0]}: ${r[1]}`).join(' ')}`,
        `TARGET LENGTH: ${num(target.get(), PLAN_TARGET[fid])} s (stay within 10%).`,
        one
          ? `MUSIC: ${b} BPM. One beat = ${fx(one, 3)} s. Land cuts on beats where the action allows: shot lengths of 2, 4 or 8 beats (${fx(one * 2)}, ${fx(one * 4)}, ${fx(one * 8)} s).`
          : 'MUSIC: no BPM given. Cut on motion or on sound.',
        'CLIPS (name - duration in s - what happens):',
        clips.get().trim(),
        `VERDICT / SCORE (his words): ${verdict.get().trim() || '(none)'}`,
        'LAWS: the hook fills 0-3 s with three layers starting on frame 0: a visual shock, a hard transient (sound with a sharp attack), and a title. Every 3 s something changes (shot, scale, text, sound or colour). Cut on motion or on sound, never on nothing (a Lunar Night Reel is the exception: static holds, music rhythm).',
        'CAPCUT LABELS (checked Nov 2026; labels vary by version): Ratio -> 9:16. Captions -> Auto captions -> English -> Generate. The keyframe is the diamond icon. Overlay -> Add overlay. Audio -> Sound effects. Filters / Adjust -> Apply to all. Text -> Add text -> Font -> Import. Tap a clip -> Speed -> Curve. Export settings sit on the 1080P chip next to Export. When you are unsure of a label, write "label varies by version" and give the closest wording. Never invent a menu.',
        'PLAN RULES:',
        '- rows: one row per kept piece, in timeline order; row 1 is the hook. keep_in and keep_out are seconds inside that clip (0 <= keep_in < keep_out <= its duration). Add a final row for the rating card when the format calls for one.',
        '- on_screen_text: hook card or caption text in the house style, "" if none. sfx: sound and CapCut volume, e.g. "crunch 45", "" if none. zoom: e.g. "108% push-in over 3 s", "" if none.',
        '- steps: child-simple. One tap per line, never two. Every step ends with "You should see: ..." naming exactly what appears on screen. Start on the CapCut home screen; end after Export (1080p, the format\'s frame rate, the highest bitrate). Do not skip steps; repeat a pattern by naming the rows it covers.',
        '- cover: frame = clip name and second; title = 4 words max.',
        '- The Brand Brain above lists tweaks he made by hand after earlier plans. Apply them; do not repeat the original mistake.',
        'Return only JSON in exactly this shape:',
        '{"hook":{"text":"","clip":"","in":0,"out":0},"rows":[{"n":1,"clip":"","keep_in":0,"keep_out":0,"on_screen_text":"","sfx":"","zoom":""}],"steps":["... You should see: ..."],"cover":{"frame":"","title":""}}',
      ].join('\n')
    }

    const result = h('div', { class: 'ln-stack edit-plan' })
    const status = h('p', { class: 'ln-small ln-muted', role: 'status' })
    let current = null
    let currentMd = ''

    function renderResult(p, label) {
      const fid = getFormat()
      const tgt = num(target.get(), PLAN_TARGET[fid])
      const chk = planChecks(p, fid, tgt)
      current = p
      currentMd = planMarkdown(p, {
        title: title.get().trim() || 'Untitled',
        format: FMT[fid].name,
        target: tgt,
        total: chk.total,
        date: today(),
      })
      const rows = p.rows.map(r => [
        String(r.n),
        r.clip,
        `${fx(r.keep_in, 1)}–${fx(r.keep_out, 1)}`,
        fx(rowLen(r), 1),
        r.on_screen_text,
        r.sfx,
        r.zoom,
      ])
      result.replaceChildren(
        h(
          'div',
          { class: 'edit-plan-head' },
          h('span', { class: 'ln-eyebrow' }, label),
          h('h3', { class: 'ln-h2' }, title.get().trim() || 'Untitled'),
        ),
        h(
          'div',
          { class: 'edit-stats' },
          ui.stat(String(p.rows.length), 'Pieces'),
          ui.stat(sec(chk.total, 1), 'Kept'),
          ui.stat(sec(tgt, 0), 'Target'),
          ui.stat(String(p.steps.length), 'Taps'),
        ),
        h(
          'div',
          { class: 'edit-hookcard' },
          h(
            'span',
            { class: 'ln-eyebrow' },
            `Hook · ${p.hook.clip || '—'} ${fx(p.hook.in, 1)}–${fx(p.hook.out, 1)} s`,
          ),
          h('b', null, p.hook.text || '—'),
        ),
        ui.table(
          ['#', 'Clip', 'Keep s', 'Len', 'On-screen text', 'SFX', 'Zoom'],
          rows,
          { label: 'Cut sheet' },
        ),
        chk.issues.length
          ? ui.callout(
              'warn',
              h(
                'ul',
                { class: 'edit-issues' },
                chk.issues.map(x => h('li', null, x)),
              ),
              'Check before you cut',
            )
          : ui.callout(
              'ok',
              'Hook, lengths, zooms and checks all match the house rules.',
              'On the pass',
            ),
        h('h3', { class: 'ln-h3' }, 'In CapCut, one tap per line'),
        ui.steps(p.steps.map(stepNode)),
        ui.kv([
          ['Cover frame', p.cover.frame || '—'],
          ['Cover title', p.cover.title || '—'],
        ]),
      )
    }
    renderResult(
      normPlan(ST.get('edit.plan.last', null) || SAMPLE_PLAN),
      ST.get('edit.plan.last', null)
        ? 'Your last plan'
        : 'Example plan · replace with yours',
    )

    const buildBtn = ui.btn('Build the plan with Fable 5.1', async () => {
      if (!clips.get().trim()) {
        LN.toast('List your clips first', { kind: 'warn' })
        return
      }
      buildBtn.disabled = true
      status.textContent = 'Fable 5.1 is writing the cut sheet and the taps…'
      try {
        const r = await LN.ai.ask(prompt(), { json: true })
        const p = normPlan(r)
        if (!p.rows.length || !p.steps.length) throw { code: 'invalid_json' }
        ST.set('edit.plan.last', p)
        renderResult(p, `Fable 5.1 · ${today()}`)
        status.textContent =
          'Plan ready. Work down the taps; tick the 12 steps on the Algorithm tab as you go.'
      } catch (e) {
        status.textContent = LN.ai.explain(e)
      } finally {
        buildBtn.disabled = false
      }
    })
    LN.ai.available().then(ok => {
      if (!ok) {
        buildBtn.disabled = true
        status.textContent =
          'Fable 5.1 is reachable only inside claude.ai. Copy the prompt into a Fable 5.1 chat, then follow its plan.'
      }
    })
    const fname = ext =>
      `${LN.fmt.slug(title.get() || 'edit-plan') || 'edit-plan'}-cut-sheet.${ext}`
    const exportRow = h(
      'div',
      { class: 'ln-row' },
      ui.btn(
        'Save .md',
        () =>
          LN.save({
            filename: fname('md'),
            data: currentMd,
            mime: 'text/markdown',
          }),
        { kind: 'ghost', small: true },
      ),
      ui.btn(
        'Save .txt',
        () =>
          LN.save({
            filename: fname('txt'),
            data: planText(currentMd),
            mime: 'text/plain',
          }),
        { kind: 'ghost', small: true },
      ),
      ui.btn(
        'Copy plan',
        () => LN.copy(planText(currentMd), { label: 'Plan copied' }),
        { kind: 'quiet', small: true },
      ),
      ui.btn(
        'Copy prompt',
        () => LN.copy(LN.ai.compose(prompt()), { label: 'Prompt copied' }),
        { kind: 'quiet', small: true },
      ),
    )

    /* the learning loop */
    const algo = ST.get('edit.algo', {}) || {}
    const tProject = ui.field({
      label: 'Project',
      value: title.get() || algo.current || '',
    })
    const tArea = ui.select({
      label: 'What you changed',
      options: [
        'hook',
        'pacing',
        'captions',
        'on-screen text',
        'audio',
        'zoom',
        'colour',
        'cover',
        'other',
      ].map(x => ({ value: x, label: x })),
      value: 'pacing',
    })
    const tBefore = ui.field({
      label: 'The plan said',
      placeholder: 'e.g. hook on plate-landing 0–2 s',
    })
    const tAfter = ui.field({
      label: 'You did',
      placeholder: 'e.g. hook on first-bite 0.3–1.8 s',
    })
    const tWhy = ui.field({
      label: 'Why',
      placeholder: 'e.g. the bite face stops the scroll faster',
      multiline: true,
      rows: 2,
    })
    const tList = h('div', { class: 'ln-stack' })
    const paintTweaks = () => {
      const tw = LN.brain.get().tweaks.slice(0, 5)
      tList.replaceChildren(
        tw.length
          ? h(
              'ul',
              { class: 'edit-tweaks' },
              tw.map(x =>
                h(
                  'li',
                  null,
                  h(
                    'span',
                    { class: 'ln-faint ln-small' },
                    `${x.date || ''} · ${x.project || '—'} · ${x.area || ''}`,
                  ),
                  h('span', null, `${x.before || '—'} → ${x.after || '—'}`),
                  x.why
                    ? h('span', { class: 'ln-muted ln-small' }, x.why)
                    : null,
                ),
              ),
            )
          : ui.empty(
              'No tweaks logged yet. The first one teaches the next plan.',
            ),
      )
    }
    LN.bus.on('brain', paintTweaks)
    paintTweaks()
    const logBtn = ui.btn('Log it to the Brand Brain', () => {
      if (!tAfter.get().trim()) {
        LN.toast('Say what you did instead', { kind: 'warn' })
        return
      }
      LN.brain.addTweak({
        project: tProject.get().trim() || title.get().trim() || 'Untitled',
        area: tArea.get(),
        before: tBefore.get().trim(),
        after: tAfter.get().trim(),
        why: tWhy.get().trim(),
      })
      tBefore.set('')
      tAfter.set('')
      tWhy.set('')
      LN.toast('Logged. The next plan reads it.')
    })

    el.append(
      ui.section(
        {
          eyebrow: 'Claude builds the timeline',
          title: 'Edit Plan from Fable 5.1',
          lede: 'Fable 5.1 cannot open CapCut, so it writes the plan: a cut sheet and every tap, each with a check. You run it on the phone.',
        },
        formatSeg().el,
        h('div', { class: 'edit-two' }, title.el, target.el),
        h(
          'div',
          { class: 'edit-two' },
          bpm.el,
          h('div', { class: 'ln-field edit-beat' }, beatNote),
        ),
        clips.el,
        h('div', { class: 'ln-row' }, fromRail),
        verdict.el,
        h('div', { class: 'ln-row' }, buildBtn),
        status,
      ),
      ui.section(
        { eyebrow: 'The plan', title: 'Cut sheet and taps' },
        result,
        exportRow,
      ),
      ui.section(
        {
          eyebrow: 'The learning loop',
          title: 'After you post: log what you changed',
          lede: 'Every change you make by hand teaches the next plan. It goes into the Brand Brain, which rides along with every Fable 5.1 request.',
        },
        h(
          'div',
          { class: 'ln-card ln-stack' },
          h('div', { class: 'edit-two' }, tProject.el, tArea.el),
          tBefore.el,
          tAfter.el,
          tWhy.el,
          h('div', { class: 'ln-row' }, logBtn),
        ),
        h('h3', { class: 'ln-h3' }, 'Latest tweaks'),
        tList,
      ),
    )
  }

  /* ------------------------------------------------------------ register */
  LN.register({
    id: 'edit',
    num: 3,
    title: 'The Cut',
    short: 'Cut',
    kicker: 'CAPCUT EDIT',
    blurb:
      'Format playbooks, the 12-step CapCut order, speed ramps, the audio spine, captions, and a tap-by-tap Edit Plan from Fable 5.1.',
    lede: 'Pick the format, then cut it the same way every time. Ramps and ducks are worked out to the frame here; Fable 5.1 writes the cut sheet and every tap, and you run it in CapCut on the phone.',
    outputs: [
      'Format playbooks',
      'Speed-ramp curves',
      'Audio spine',
      'Auto-cut',
      'Edit Plan from Fable 5.1',
    ],
    mount(el) {
      const tabs = ui.tabs(
        [
          { id: 'formats', label: 'Formats', render: renderFormats },
          { id: 'algorithm', label: 'Algorithm', render: renderAlgorithm },
          { id: 'ramps', label: 'Speed Ramps', render: renderRamps },
          { id: 'audio', label: 'Audio Spine', render: renderAudio },
          { id: 'autocut', label: 'Auto-Cut', render: renderAutocut },
          { id: 'music', label: 'Music Edit', render: renderMusic },
          { id: 'captions', label: 'Captions', render: renderCaptions },
          { id: 'plan', label: 'Edit Plan', render: renderPlan },
        ],
        { key: 'edit' },
      )
      el.append(tabs.el)
    },
  })
})()
