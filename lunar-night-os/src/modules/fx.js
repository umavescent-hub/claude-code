/* Kubrick: modules/fx.js, Transitions (04).
   Seven moves, each with an animated demo (JS-driven, so it scrubs, pauses
   off-screen and respects reduced motion), the handheld move on shoot day,
   the CapCut Mobile tap sequence and a frame-timing calculator that also sets
   the demo's timing. Shared state:
     edit.format      'market' | 'reel' | 'doc' | 'lab' (owned by The Cut; bus 'edit:format')
     fx.fps           24 | 30 | 60 (bus 'fx:fps')
     fx.frames        {cardId: frames}
     devicefacts.v1   read only, written by Rig's checklist (bus 'devicefacts')
   Exposes LN.fx = { cards, demos, setFormat, setFps, setPhase } for other modules and QA. */
;(() => {
  const LN = window.LN
  const { h, s, ui } = LN
  const ST = LN.store
  const { clamp, lerp, smoothstep } = LN.math
  const P = LN.palette

  const FMT_KEY = 'edit.format'
  const FPS_KEY = 'fx.fps'
  const FRAMES_KEY = 'fx.frames'
  const FACTS_KEY = 'devicefacts.v1'

  /* ------------------------------------------------------------ formats */
  const FORMATS = [
    {
      id: 'market',
      name: 'Marketplace Review',
      short: 'Market',
      fps: 30,
      maxSec: 0.2,
      rule: 'At most 2 transitions, about 0.2 s each. Every other cut is hard. 2–3 punch-ins of 8–15% on the bite, the money shot and the verdict.',
    },
    {
      id: 'reel',
      name: 'Lunar Night Reel',
      short: 'Reel',
      fps: 24,
      maxSec: 0,
      rule: 'None. Hard cuts only, 3–5 s static holds, no SFX. The rhythm comes from the music.',
    },
    {
      id: 'doc',
      name: 'Road to Three Stars',
      short: 'Doc',
      fps: 24,
      maxSec: Number.POSITIVE_INFINITY,
      rule: 'The full set. Montage cuts about 1.8 s, emotional beats about 4.5 s. VHS 4:3 only for confessions and failures.',
    },
    {
      id: 'lab',
      name: 'R&D Lab',
      short: 'Lab',
      fps: 30,
      maxSec: Number.POSITIVE_INFINITY,
      rule: 'No transition rule is written for the lab. Speed ramps are its move (The Cut owns those); treat transitions as the documentary set.',
    },
  ]
  const FMT = Object.fromEntries(FORMATS.map(f => [f.id, f]))
  const getFormat = () => {
    const id = ST.get(FMT_KEY, 'market')
    return FMT[id] ? id : 'market'
  }
  const setFormat = id => {
    if (!FMT[id]) return
    ST.set(FMT_KEY, id)
    LN.bus.emit('edit:format', id)
  }
  const FPS_LIST = [24, 30, 60]
  const getFps = () => {
    const v = Number(ST.get(FPS_KEY, 0))
    return FPS_LIST.includes(v) ? v : FMT[getFormat()].fps
  }
  const setFps = v => {
    const n = Number(v)
    if (!FPS_LIST.includes(n)) return
    ST.set(FPS_KEY, n)
    LN.bus.emit('fx:fps', n)
  }
  const framesMap = () => {
    const m = ST.get(FRAMES_KEY, {})
    return m && typeof m === 'object' ? m : {}
  }
  const getFrames = card => {
    const m = framesMap()
    const v = Number(m[card.id])
    return Number.isFinite(v) && v >= 1 ? Math.round(v) : card.calc.frames
  }
  const setFrames = (card, v) => {
    const m = framesMap()
    m[card.id] = clamp(Math.round(Number(v) || card.calc.frames), 1, 999)
    ST.set(FRAMES_KEY, m)
    LN.bus.emit('fx:frames', { id: card.id, frames: m[card.id] })
  }

  /* ------------------------------------------------------------ helpers */
  const RM = LN.reducedMotion()
  const fx2 = (x, d = 2) => Number(x).toFixed(d)
  const secs = (frames, fps) => frames / fps
  const framesAt = (sec, fps) => Math.round(sec * fps)
  const frameOf = (t, fps) => Math.floor(t * fps + 1e-6)
  const easeIn = t => t * t
  const easeOut = t => 1 - (1 - t) * (1 - t)
  const easeInOut = t => smoothstep(0, 1, t)
  const jit = f => ((f * 9301 + 49297) % 233280) / 233280
  const pct = x => `${fx2(x * 100, 2)}%`

  /* Device facts: Rig writes {key: true|false|null}. Keys are matched loosely. */
  const facts = () => {
    const f = ST.get(FACTS_KEY, {})
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
  function factNote(re, o) {
    const box = h('div', { class: 'fx-fact' })
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

  /** One tap: path chips, the action, and the "You should see" check. */
  function tap(path, text, see) {
    return h(
      'div',
      { class: 'fx-tap' },
      h(
        'div',
        { class: 'fx-tap-act' },
        path && path.length ? ui.path(...path) : null,
        h('span', null, text),
      ),
      see
        ? h('div', { class: 'fx-see' }, h('b', null, 'You should see: '), see)
        : null,
    )
  }
  const verify = (...lines) =>
    ui.callout(
      'verify',
      h(
        'div',
        { class: 'ln-stack fx-verify' },
        lines.map(l => (typeof l === 'string' ? h('p', null, l) : l)),
      ),
    )
  const link = (hash, label) => h('a', { href: hash }, label)

  /* ------------------------------------------------------------ scenes (CSS shapes inside the 9:16 frame) */
  const sc = (kind, ...kids) => h('div', { class: `fx-sc sc-${kind}` }, ...kids)
  const part = (cls, style) => h('i', { class: `sc-${cls}`, style })
  const SCENES = {
    plate: () =>
      sc(
        'plate',
        part('table'),
        part('plate'),
        part('food'),
        part('spec', { left: '41%', top: '47%' }),
        part('spec', { left: '56%', top: '53%', width: '5px', height: '5px' }),
        part('fork'),
      ),
    pass: () =>
      sc(
        'pass',
        part('steel'),
        part('rail'),
        part('ticket'),
        part('plate', { width: '46%', height: '26%', left: '27%', top: '52%' }),
        part('food', { width: '22%', height: '12%', left: '39%', top: '58%' }),
        part('lamp'),
      ),
    dough: () =>
      sc('dough', part('board'), part('flour'), part('dough'), part('palm')),
    walkin: () =>
      sc(
        'walkin',
        part('cold'),
        part('shelf', { top: '34%' }),
        part('shelf', { top: '54%' }),
        part('shelf', { top: '74%' }),
        part('door'),
      ),
    pan: () =>
      sc(
        'pan',
        part('hob'),
        part('handle'),
        part('panring'),
        part('panin'),
        part('spec', { left: '34%', top: '38%' }),
      ),
    lunar: () =>
      sc(
        'lunar',
        part('sky'),
        part('moon'),
        part('bldg'),
        part('win'),
        part('bulb'),
        part('passtop'),
        part('plate', { width: '44%', height: '13%', left: '28%', top: '80%' }),
      ),
    confess: () =>
      sc(
        'confess',
        part('wall'),
        part('lamp'),
        part('shoulders'),
        part('head'),
        part('tabletop'),
      ),
  }
  const clip = (kind, cls = '') =>
    h('div', { class: `fx-clip ${cls}`.trim() }, SCENES[kind]())

  /* ------------------------------------------------------------ demo engine */
  const live = new Set()
  let raf = 0
  let onRoute = true
  function pump(now) {
    raf = 0
    let any = false
    for (const d of live) {
      if (!d.playing || !d.visible || !onRoute || document.hidden) continue
      any = true
      const total = d.total()
      d.setT(((now - d.t0) / 1000) % total, true)
    }
    if (any) raf = requestAnimationFrame(pump)
  }
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(pump)
  }
  const halt = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  /** Lane timeline under a demo. layout(): {total, lanes:[{label, color, blocks:[{from,to,label,soft}], keys:[t], marks:[{at,label}]}]} */
  function timeline() {
    const lanes = h('div', { class: 'fx-lanes' })
    const ticks = h('div', { class: 'fx-ticks', 'aria-hidden': 'true' })
    const head = h('div', { class: 'fx-head', 'aria-hidden': 'true' })
    const el = h(
      'div',
      { class: 'fx-tl', role: 'img', 'aria-label': 'Timeline of the move' },
      ticks,
      lanes,
      head,
    )
    let total = 1
    const render = lay => {
      total = Math.max(0.1, lay.total)
      const x = t => `${(clamp(t, 0, total) / total) * 100}%`
      ticks.replaceChildren(
        h('span', { class: 'fx-tick', style: { left: '0%' } }, '0 s'),
        h(
          'span',
          { class: 'fx-tick', style: { left: '100%' } },
          `${fx2(total, 1)} s`,
        ),
      )
      lanes.replaceChildren(
        lay.lanes.map(l =>
          h(
            'div',
            { class: 'fx-lane-row' },
            h('span', { class: 'fx-lane-label' }, l.label),
            h(
              'div',
              { class: 'fx-lane', style: { '--lc': l.color } },
              (l.blocks || []).map(b =>
                h(
                  'span',
                  {
                    class: `fx-block ${b.soft ? 'soft' : ''}`.trim(),
                    style: {
                      left: x(b.from),
                      width: `${((clamp(b.to, 0, total) - clamp(b.from, 0, total)) / total) * 100}%`,
                    },
                  },
                  b.label ? h('b', null, b.label) : null,
                ),
              ),
              (l.keys || []).map(t =>
                h('span', { class: 'fx-diamond', style: { left: x(t) } }),
              ),
              (l.marks || []).map(m =>
                h(
                  'span',
                  { class: 'fx-mark', style: { left: x(m.at) } },
                  h('b', null, m.label),
                ),
              ),
            ),
          ),
        ),
      )
    }
    const seek = t => {
      head.style.left = `${(clamp(t, 0, total) / total) * 100}%`
    }
    return { el, render, seek }
  }

  /**
   * Build one demo. spec(ctx) → { draw(t), layout(), total(), hud(t), poster }
   * ctx = { fps(), frames(), T() } where T is the card's frame count in seconds.
   */
  function makeDemo(card, spec, ctx, o = {}) {
    const frame = h('div', {
      class: 'fx-frame',
      dataset: { ar: o.ar || '9x16' },
    })
    const hudL = h('span', { class: 'fx-hud-l' }, 'A')
    const hudR = h('span', { class: 'fx-hud-r ln-num' }, '')
    const hud = h('div', { class: 'fx-hud', 'aria-live': 'off' }, hudL, hudR)
    const tl = timeline()
    const built = spec({ frame, ...ctx })
    const scrub = h('input', {
      type: 'range',
      class: 'ln-range fx-scrub',
      min: 0,
      max: 1000,
      step: 1,
      value: 0,
      'aria-label': `Scrub the ${card.title} demo`,
    })
    const btn = ui.btn(
      'Play',
      () => (demo.playing ? demo.pause() : demo.play()),
      {
        kind: 'quiet',
        small: true,
        aria: `Play or pause the ${card.title} demo`,
      },
    )
    const stage = h(
      'div',
      { class: 'fx-stage', dataset: { demo: card.id } },
      h('div', { class: 'fx-monitor' }, frame, hud),
      tl.el,
      h(
        'div',
        { class: 'fx-ctl' },
        btn,
        scrub,
        RM
          ? h(
              'span',
              { class: 'ln-faint ln-small' },
              'Reduced motion is on: drag to step through.',
            )
          : null,
      ),
    )
    const demo = {
      id: card.id,
      el: stage,
      frame,
      playing: false,
      visible: false,
      t: 0,
      t0: 0,
      total: () => Math.max(0.2, built.total()),
      setT(t, fromLoop) {
        const total = demo.total()
        demo.t = clamp(t, 0, total)
        built.draw(demo.t)
        tl.seek(demo.t)
        const fps = ctx.fps()
        const H = built.hud ? built.hud(demo.t) : {}
        hudL.textContent = H.label || ''
        hudR.textContent = `f ${String(frameOf(demo.t, fps)).padStart(3, '0')} · ${LN.fmt.tc(demo.t, fps)}`
        if (!fromLoop || !demo.scrubbing)
          scrub.value = String(Math.round((demo.t / total) * 1000))
      },
      play() {
        demo.playing = true
        demo.t0 = performance.now() - demo.t * 1000
        btn.textContent = 'Pause'
        btn.setAttribute('aria-pressed', 'true')
        live.add(demo)
        kick()
      },
      pause() {
        demo.playing = false
        btn.textContent = 'Play'
        btn.setAttribute('aria-pressed', 'false')
      },
      relayout() {
        tl.render(built.layout())
        demo.setT(demo.t)
        if (demo.playing) demo.t0 = performance.now() - demo.t * 1000
      },
    }
    scrub.addEventListener('input', () => {
      demo.scrubbing = true
      if (demo.playing) demo.pause()
      demo.setT((Number(scrub.value) / 1000) * demo.total())
    })
    scrub.addEventListener('change', () => {
      demo.scrubbing = false
    })
    // Visibility: play while on screen (not under reduced motion), stop off screen.
    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver(
        entries => {
          for (const e of entries) {
            demo.visible = e.isIntersecting
            if (demo.visible && !RM && !demo.userPaused) demo.play()
            else if (!demo.visible && demo.playing) {
              demo.pause()
              demo.autoPaused = true
            }
            if (demo.visible && demo.autoPaused && !RM) {
              demo.autoPaused = false
              demo.play()
            }
          }
        },
        { threshold: 0.15 },
      )
      io.observe(stage)
    } else {
      demo.visible = true
      if (!RM) demo.play()
    }
    btn.addEventListener('click', () => {
      demo.userPaused = !demo.playing
    })
    live.add(demo)
    tl.render(built.layout())
    demo.setT(built.poster ? built.poster() : 0)
    return demo
  }

  /* ------------------------------------------------------------ move diagrams (SVG, top-down) */
  function ownDiagram(kind) {
    const W = 240
    const H = 120
    const svg = s('svg', {
      class: 'fx-diag',
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      'aria-label': `${kind} move diagram`,
    })
    const line = (x1, y1, x2, y2, cls = 'd-line') =>
      s('line', { x1, y1, x2, y2, class: cls })
    const phone = (x, y, rot = 0) =>
      s(
        'g',
        { transform: `translate(${x} ${y}) rotate(${rot})` },
        s('rect', {
          x: -9,
          y: -18,
          width: 18,
          height: 36,
          rx: 3,
          class: 'd-phone',
        }),
        s('circle', { cx: 0, cy: -12, r: 2.2, class: 'd-lens' }),
      )
    const label = (x, y, text, cls = 'd-text') =>
      s('text', { x, y, class: cls }, text)
    const arrowDef = s(
      'defs',
      null,
      s(
        'marker',
        {
          id: 'fx-arr',
          viewBox: '0 0 10 10',
          refX: 9,
          refY: 5,
          markerWidth: 7,
          markerHeight: 7,
          orient: 'auto-start-reverse',
        },
        s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'd-arrhead' }),
      ),
    )
    svg.append(arrowDef)
    if (kind === 'whip') {
      svg.append(
        s('rect', {
          x: 18,
          y: 22,
          width: 66,
          height: 40,
          rx: 4,
          class: 'd-box',
        }),
        label(51, 46, 'A', 'd-big'),
        s('rect', {
          x: 156,
          y: 22,
          width: 66,
          height: 40,
          rx: 4,
          class: 'd-box',
        }),
        label(189, 46, 'B', 'd-big'),
        phone(120, 92, 0),
        s('path', { d: 'M96 78 Q120 56 144 78', class: 'd-arrow' }),
        s('path', { d: 'M104 102 Q120 116 136 102', class: 'd-arrow faint' }),
        label(120, 16, 'flick right, both clips', 'd-text mid'),
      )
    } else if (kind === 'wipe') {
      svg.append(
        s('rect', {
          x: 86,
          y: 10,
          width: 68,
          height: 22,
          rx: 3,
          class: 'd-box',
        }),
        label(120, 25, 'plate', 'd-text mid'),
        s('rect', {
          x: 70,
          y: 56,
          width: 28,
          height: 14,
          rx: 2,
          class: 'd-solid',
        }),
        s('path', { d: 'M104 63 L172 63', class: 'd-arrow' }),
        label(140, 52, 'pan / back / knife', 'd-text mid'),
        phone(120, 100, 0),
        line(112, 84, 92, 32, 'd-ray'),
        line(128, 84, 148, 32, 'd-ray'),
      )
    } else if (kind === 'match') {
      svg.append(
        s('rect', {
          x: 14,
          y: 14,
          width: 96,
          height: 92,
          rx: 4,
          class: 'd-box',
        }),
        s('ellipse', { cx: 62, cy: 86, rx: 22, ry: 8, class: 'd-solid' }),
        s('path', { d: 'M62 28 L62 70', class: 'd-arrow' }),
        label(62, 24, 'palm', 'd-text mid'),
        s('rect', {
          x: 130,
          y: 14,
          width: 96,
          height: 92,
          rx: 4,
          class: 'd-box',
        }),
        s('rect', { x: 146, y: 24, width: 10, height: 72, class: 'd-solid' }),
        s('path', { d: 'M160 60 L200 60', class: 'd-arrow' }),
        label(178, 24, 'door', 'd-text mid'),
        s('path', { d: 'M114 60 L126 60', class: 'd-cut' }),
        label(120, 112, 'cut on the impact frame', 'd-text mid'),
      )
    } else if (kind === 'push') {
      svg.append(
        s('circle', { cx: 190, cy: 60, r: 26, class: 'd-ring' }),
        s('circle', { cx: 190, cy: 60, r: 17, class: 'd-solid' }),
        phone(60, 60, 90),
        s('path', { d: 'M84 60 L150 60', class: 'd-arrow' }),
        label(116, 52, 'walk the phone in', 'd-text mid'),
        label(190, 104, 'dark pan', 'd-text mid'),
      )
    } else if (kind === 'light') {
      svg.append(
        s('circle', { cx: 120, cy: 50, r: 12, class: 'd-glow' }),
        s('circle', { cx: 120, cy: 50, r: 5, class: 'd-light' }),
        ...[0, 45, 90, 135, 180, 225, 270, 315].map(a =>
          s('line', {
            x1: 120 + Math.cos((a * Math.PI) / 180) * 18,
            y1: 50 + Math.sin((a * Math.PI) / 180) * 18,
            x2: 120 + Math.cos((a * Math.PI) / 180) * 28,
            y2: 50 + Math.sin((a * Math.PI) / 180) * 28,
            class: 'd-ray',
          }),
        ),
        label(
          120,
          100,
          'a real light in frame: bulb, flame, sear',
          'd-text mid',
        ),
      )
    } else if (kind === 'crop') {
      svg.append(
        s('rect', {
          x: 40,
          y: 15,
          width: 160,
          height: 90,
          rx: 3,
          class: 'd-box',
        }),
        s('rect', { x: 60, y: 15, width: 120, height: 90, class: 'd-dash' }),
        label(120, 64, '4:3 inside 16:9', 'd-text mid'),
        label(50, 10, '16:9 capture', 'd-text'),
      )
    } else {
      // 'lock': no camera move; the move lives in the edit
      svg.append(
        s('rect', {
          x: 70,
          y: 12,
          width: 100,
          height: 96,
          rx: 3,
          class: 'd-box',
        }),
        s('rect', { x: 78, y: 19.7, width: 84, height: 80.6, class: 'd-dash' }),
        label(120, 66, '100% → 108%', 'd-text mid'),
        phone(28, 60, 0),
        label(28, 100, 'locked', 'd-text mid'),
      )
    }
    return svg
  }
  /** Reuse the Shot Bible's vector diagrams when that module provides them. */
  function diagram(kind) {
    const V = LN.vectors
    if (V) {
      for (const fn of ['diagram', 'draw', 'render']) {
        if (typeof V[fn] === 'function') {
          try {
            const node = V[fn](kind)
            if (node instanceof Node) return node
          } catch (_e) {
            /* fall through to our own drawing */
          }
        }
      }
    }
    return ownDiagram(kind)
  }

  /* ------------------------------------------------------------ the seven moves */
  const CARDS = [
    {
      id: 'whip',
      num: 1,
      color: 'var(--t1)',
      title: 'Whip-pan + motion-blur seam',
      sub: 'Matching flicks at the end of A and the start of B. The blur hides the cut.',
      counts: true,
      allow: {
        market: ['count', '1 of your 2, kept near 0.2 s'],
        reel: ['no', 'hard cuts only'],
        doc: ['yes', 'full set'],
        lab: ['yes', 'doc set'],
      },
      diagram: 'whip',
      shoot: [
        'Both flicks go the same way, at the same speed. End A with a flick right; start B already flicking right, then settle on the subject.',
        'Lead with the elbows, the phone goes last. Stop the flick with the wrist, not the shoulder, so B settles in two or three frames.',
        'Count it: one, two, flick. Roll two seconds past the flick on A and two seconds before it on B, so there is meat to trim.',
        'Shutter 180° or slower so the flick smears on its own. Blackmagic at 360° smears most; a fast shutter gives stepped frames the edit cannot fix.',
        'Stabilization off for the flick: EIS fights a whip and warps the edges.',
      ],
      calc: { frames: 6, label: 'Flick, each side', kind: 'span' },
      taps: ctx => [
        tap(
          ['Tap clip A', 'Split'],
          `Park the playhead where the flick on A is at full speed. Split. Delete the piece after it. The flick you keep is ${ctx.frames()} frames (${fx2(ctx.T(), 2)} s at ${ctx.fps()} fps).`,
          'A ends mid-smear, not after it settles.',
        ),
        tap(
          ['Tap clip B', 'Split'],
          `Park the playhead ${ctx.frames()} frames into B's flick, where it settles. Split. Delete the piece before it.`,
          'B begins mid-smear and lands on the subject.',
        ),
        tap(
          ['Tap the flick on A', 'Motion blur'],
          'Blur 65, Blend 40, Direction Both, Times Twice. Tap the check mark. Repeat on the flick piece of B.',
          'The smear reads as one continuous move across the cut.',
        ),
        tap(
          [],
          'Leave the white square between the two clips alone. The seam is a hard cut; the blur is the transition.',
          'No transition tile is selected on that cut.',
        ),
      ],
      verifyNotes: () => [
        factNote(/motionblur/, {
          yes: 'Motion blur sits in the clip toolbar on your phone. Use it on both flick pieces.',
          no: 'No Motion blur tool on your build. Shoot the smear instead: 360° shutter and a faster flick, then try Effects › Video effects › search "motion blur" with its own sliders.',
          check: h(
            'div',
            { class: 'ln-stack' },
            h(
              'p',
              null,
              'Tap a clip and scroll its toolbar for Motion blur. If it is not there: ',
              ui.path('Effects', 'Video effects', 'search "motion blur"'),
              '. Write down the parameter names, their ranges and any Pro badge, then answer the Rig checklist.',
            ),
            h(
              'p',
              null,
              'Blur 65, Blend 40, Direction Both and Times Twice are the brief’s values. The labels and ranges were not checked on a phone; the parameter names come from recall of CapCut and JianYing (Blur, Blend, Direction, Times).',
            ),
          ),
        }),
      ],
      demo: ctx => {
        const A = clip('plate', 'is-a')
        const B = clip('pass', 'is-b')
        ctx.frame.append(A, B)
        const HOLD = 0.9
        const T = () => Math.max(0.05, ctx.T())
        const total = () => HOLD * 2 + T() * 2
        const draw = t => {
          const Tt = T()
          const seamIn = HOLD + Tt
          if (t < HOLD) {
            A.style.transform = 'none'
            A.style.filter = 'none'
            A.style.opacity = '1'
            B.style.opacity = '0'
          } else if (t < seamIn) {
            const k = easeIn((t - HOLD) / Tt)
            A.style.transform = `translateX(${-k * 125}%) scaleX(${1 + k * 0.7})`
            A.style.filter = `blur(${k * 7}px)`
            A.style.opacity = '1'
            B.style.opacity = '0'
          } else if (t < seamIn + Tt) {
            const k = 1 - easeOut((t - seamIn) / Tt)
            A.style.opacity = '0'
            B.style.opacity = '1'
            B.style.transform = `translateX(${k * 125}%) scaleX(${1 + k * 0.7})`
            B.style.filter = `blur(${k * 7}px)`
          } else {
            A.style.opacity = '0'
            B.style.opacity = '1'
            B.style.transform = 'none'
            B.style.filter = 'none'
          }
        }
        const layout = () => {
          const Tt = T()
          const tot = total()
          return {
            total: tot,
            lanes: [
              {
                label: 'Main',
                color: P.tracks[0],
                blocks: [
                  { from: 0, to: HOLD + Tt, label: 'A' },
                  { from: HOLD + Tt, to: tot, label: 'B' },
                ],
                marks: [{ at: HOLD + Tt, label: 'hard cut' }],
              },
              {
                label: 'Motion blur',
                color: P.tracks[3],
                blocks: [
                  { from: HOLD, to: HOLD + Tt, label: `${ctx.frames()} f` },
                  {
                    from: HOLD + Tt,
                    to: HOLD + Tt * 2,
                    label: `${ctx.frames()} f`,
                  },
                ],
              },
            ],
          }
        }
        return {
          draw,
          layout,
          total,
          hud: t => ({ label: t < HOLD + T() ? 'A · plate' : 'B · the pass' }),
          poster: () => HOLD + T() * 0.9,
        }
      },
    },
    {
      id: 'wipe',
      num: 2,
      color: 'var(--t2)',
      title: 'Foreground wipe',
      sub: 'A knife, your back or a copper pan crosses the lens. B is already behind it.',
      counts: true,
      allow: {
        market: ['count', '1 of your 2; 6 f at 30 fps keeps it at 0.2 s'],
        reel: ['no', 'hard cuts only'],
        doc: ['yes', 'full set'],
        lab: ['yes', 'doc set'],
      },
      diagram: 'wipe',
      shoot: [
        'Shoot A with the object crossing close to the lens, left to right, filling the frame for a beat. Shoot B starting with the same object leaving the frame the same way.',
        'Keep the crossing object dark and out of focus: the back of a jacket, the black of a pan, the flat of a knife. A sharp edge shows the mask line.',
        'Hold the phone still through the crossing. The wipe moves; the camera does not.',
        'Match the speed: the object should take about half a second to cross at a walking pace. Faster, and the mask has fewer frames to follow.',
      ],
      calc: { frames: 12, label: 'Wipe length', kind: 'span' },
      taps: ctx => [
        tap(
          ['Overlay', 'Add overlay'],
          `Pick clip B. Drag it so it starts ${ctx.frames()} frames before the end of A, under the crossing.`,
          'B sits on the track below the main track, overlapping the end of A.',
        ),
        tap(
          ['Tap the overlay', 'Mask', 'Split'],
          'Twist with two fingers until the edge stands vertical. Drag the double-arrow handle out for the feather (18 on the desktop slider; on the phone, pull until the edge is about a thumb-width soft).',
          'A soft vertical edge: B on one side, A on the other.',
        ),
        tap(
          ['Playhead on the first wipe frame', 'keyframe diamond'],
          'Drag the mask line just past the left edge of the frame, so B is hidden.',
          'A diamond on the overlay; the whole frame shows A.',
        ),
        tap(
          [`Playhead ${ctx.frames()} frames later`],
          `That is ${fx2(ctx.T(), 2)} s at ${ctx.fps()} fps. Drag the mask line past the right edge. CapCut adds the second keyframe itself.`,
          'A second diamond; the whole frame shows B.',
        ),
        tap(
          [],
          'Scrub the wipe frame by frame. The mask line must sit just behind the trailing edge of the object on every frame. Nudge where it leads.',
          'No sliver of A ever shows ahead of the object.',
        ),
        tap(
          ['Tap clip A', 'Split'],
          'Split A on the last wipe frame and delete its tail, then tap B › Overlay › back to the main track if your build offers it; otherwise leave B on the overlay.',
          'The timeline runs A, then B, with the wipe inside the overlap.',
        ),
      ],
      verifyNotes: () => [
        verify(
          'Mask names: tap any clip › Mask and read the row. Recall says None, Split, Filmstrip, Circle, Rectangle, Heart, Star; some builds or translations say Linear and Mirror for the first two. Use whichever gives one straight edge.',
          'Feather on the phone is the double-arrow handle. A numeric feather control on mobile is not established; "Feather 18" is a desktop slider value. Match the demo’s edge by eye.',
          'Keyframes on a mask: set the diamond, move the mask, and check that a second diamond appears on its own. If it does not, tap the diamond again at the second position.',
        ),
      ],
      demo: ctx => {
        const A = clip('plate', 'is-a')
        const B = clip('pass', 'is-b')
        const obj = h('div', { class: 'fx-wipe-obj' })
        ctx.frame.append(A, B, obj)
        const HOLD_A = 0.8
        const HOLD_B = 0.9
        const T = () => Math.max(0.05, ctx.T())
        const total = () => HOLD_A + T() + HOLD_B
        const F = 7
        const setMask = x => {
          const m = `linear-gradient(90deg, #000 0, #000 ${x - F}%, transparent ${x + F}%)`
          B.style.setProperty('-webkit-mask-image', m)
          B.style.setProperty('mask-image', m)
        }
        const draw = t => {
          const Tt = T()
          if (t < HOLD_A) {
            setMask(-20)
            obj.style.transform = 'translateX(-130%)'
          } else if (t < HOLD_A + Tt) {
            const k = (t - HOLD_A) / Tt
            const objX = lerp(-110, 130, k)
            obj.style.transform = `translateX(${objX}%)`
            setMask(objX + 10)
          } else {
            setMask(140)
            obj.style.transform = 'translateX(150%)'
          }
        }
        const layout = () => {
          const Tt = T()
          const tot = total()
          return {
            total: tot,
            lanes: [
              {
                label: 'Main A',
                color: P.tracks[0],
                blocks: [{ from: 0, to: HOLD_A + Tt, label: 'A' }],
              },
              {
                label: 'Overlay B',
                color: P.tracks[1],
                blocks: [{ from: HOLD_A, to: tot, label: 'B' }],
              },
              {
                label: 'Mask',
                color: P.tracks[4],
                blocks: [
                  {
                    from: HOLD_A,
                    to: HOLD_A + Tt,
                    label: `${ctx.frames()} f`,
                    soft: true,
                  },
                ],
                keys: [HOLD_A, HOLD_A + Tt],
              },
            ],
          }
        }
        return {
          draw,
          layout,
          total,
          hud: t => ({
            label:
              t < HOLD_A
                ? 'A · plate'
                : t < HOLD_A + T()
                  ? 'wipe'
                  : 'B · the pass',
          }),
          poster: () => HOLD_A + T() * 0.5,
        }
      },
    },
    {
      id: 'match',
      num: 3,
      color: 'var(--t3)',
      title: 'Match-action + sound bridge',
      sub: 'Palm lands on the dough; the walk-in door slams on the same frame. The sizzle starts early and ends in the thud.',
      counts: false,
      allow: {
        market: ['free', 'a hard cut; does not count against your 2'],
        reel: ['no', 'no SFX, no voice; cut on nothing'],
        doc: ['yes', 'the documentary’s spine'],
        lab: ['yes', 'yes'],
      },
      diagram: 'match',
      shoot: [
        'Shoot the impact twice, once per clip, with the motion going the same direction: palm down, door swinging shut. Same speed, same side of frame.',
        'Hold still through both impacts. A hit reads as a hit only if the frame does not move with it.',
        'Record the sounds clean: the palm on dough, the walk-in latch. Speech enhancement off for both; the sound is the shot.',
        'Roll a full second after each impact. The cut needs a settle on B, and the bridge needs clean sizzle under the end of A.',
      ],
      calc: { frames: 15, label: 'Pre-lap', kind: 'span' },
      taps: ctx => [
        tap(
          ['Pinch the timeline open', 'scrub to the impact on A', 'Split'],
          'Split on the exact frame the palm meets the dough. Delete everything after it.',
          'A ends on contact. One frame later would feel late.',
        ),
        tap(
          ['Tap clip B', 'Split'],
          'Split on the frame the door meets its frame. Delete everything before it.',
          'B starts on the slam. The two impacts share one frame.',
        ),
        tap(
          ['Tap clip B', 'Extract audio'],
          'Its sound drops onto its own track and the clip goes quiet.',
          'A green audio bar under B.',
        ),
        tap(
          ['Drag the audio bar left'],
          `Start it ${ctx.frames()} frames before the cut (${fx2(ctx.T(), 2)} s at ${ctx.fps()} fps). The thud stays on the cut; only the lead-in moves under A.`,
          'The audio bar begins under the end of A and runs into B.',
        ),
        tap(
          ['Tap the audio bar', 'Fades'],
          `Fade in over the same ${ctx.frames()} frames. Then tap clip A › Volume and keyframe its sound down under the pre-lap.`,
          'Sizzle rises under the palm, the thud hits on the cut, the room of B takes over.',
        ),
        tap(
          ['Audio', 'Sound effects'],
          'If the real thud is weak, lay one SFX on the cut frame at 30–60. One per big moment. The Sound Forge has house-made hits.',
          'One extra bar, starting exactly on the cut.',
        ),
      ],
      verifyNotes: () => [
        verify(
          'Frame-level stepping on CapCut mobile is not established. Pinch the timeline open as far as it goes and scrub; the readout under the demo gives both the frame number and the seconds, so scrub to the seconds.',
          'Extract audio is a clip-toolbar button on every build recalled. Fades (older builds: Fade) has Fade in and Fade out sliders; their maximum length is not established.',
          'Volume keyframes: tap the clip, set the diamond, change Volume, move the playhead, change it again. Check that a second diamond appears.',
        ),
      ],
      demo: ctx => {
        const A = clip('dough', 'is-a')
        const B = clip('walkin', 'is-b')
        ctx.frame.append(A, B)
        const palm = A.querySelector('.sc-palm')
        const dough = A.querySelector('.sc-dough')
        const door = B.querySelector('.sc-door')
        const APP = 1.0
        const HOLD_B = 1.1
        const T = () => Math.max(0.05, ctx.T())
        const total = () => APP + HOLD_B
        const draw = t => {
          if (t < APP) {
            const k = easeIn(t / APP)
            A.style.opacity = '1'
            B.style.opacity = '0'
            palm.style.transform = `translateY(${lerp(-75, 0, k)}%)`
            dough.style.transform = k > 0.985 ? 'scale(1.06, 0.9)' : 'none'
          } else {
            const u = t - APP
            A.style.opacity = '0'
            B.style.opacity = '1'
            const shake = Math.max(0, 0.22 - u) / 0.22
            const dx = Math.sin(u * 90) * shake * 2.2
            B.style.transform = `translate(${dx}px, ${-Math.abs(dx) * 0.4}px)`
            door.style.transform = u < 0.05 ? 'scaleX(0.96)' : 'none'
            door.style.transformOrigin = '0 50%'
          }
        }
        const layout = () => {
          const Tt = T()
          const tot = total()
          return {
            total: tot,
            lanes: [
              {
                label: 'Main',
                color: P.tracks[2],
                blocks: [
                  { from: 0, to: APP, label: 'A · palm' },
                  { from: APP, to: tot, label: 'B · door' },
                ],
                marks: [{ at: APP, label: 'impact' }],
              },
              {
                label: 'Audio B',
                color: P.tracks[5],
                blocks: [
                  {
                    from: APP - Tt,
                    to: APP,
                    label: `${ctx.frames()} f sizzle`,
                    soft: true,
                  },
                  { from: APP, to: tot, label: 'thud · room' },
                ],
                keys: [APP],
              },
            ],
          }
        }
        return {
          draw,
          layout,
          total,
          hud: t => ({
            label:
              t < APP
                ? t > APP - T()
                  ? 'A · sizzle under'
                  : 'A · palm'
                : 'B · walk-in',
          }),
          poster: () => APP - T() * 0.3,
        }
      },
    },
    {
      id: 'portal',
      num: 4,
      color: 'var(--t4)',
      title: 'Optical zoom-through portal',
      sub: 'Punch into the black of a pan until it fills the frame. Come out the other side in a new room.',
      counts: true,
      allow: {
        market: ['count', '1 of your 2; 8 f at 30 fps is 0.27 s, trim to 6'],
        reel: ['no', 'hard cuts only'],
        doc: ['yes', 'full set'],
        lab: ['yes', 'doc set'],
      },
      diagram: 'push',
      shoot: [
        'A: walk the phone straight into the pan on one lens. Do not jump lenses mid-shot; the Pixel stutters on a 2x to 5x switch while recording. Frame the black interior dead centre and keep pushing until it swallows the frame.',
        'If you want the 5x look, start on 5x from six feet back and walk in. The edit does the last 280%.',
        'B: start black. Inside the walk-in with the door shut, or under a cloche, then open it or pull back. The first frame of B must be as dark as the pan.',
        'Lock focus on the pan rim before the push so the black stays clean; autofocus hunting on black looks like a mistake.',
      ],
      calc: { frames: 8, label: 'Scale ramp', kind: 'span' },
      taps: ctx => [
        tap(
          [
            'Tap clip A',
            `playhead ${ctx.frames()} frames before its end`,
            'keyframe diamond',
          ],
          `That is ${fx2(ctx.T(), 2)} s before the cut at ${ctx.fps()} fps. Leave the scale at 100%.`,
          'A diamond on A. The pan sits in the middle of the frame.',
        ),
        tap(
          ['Playhead on the last frame of A', 'pinch the preview'],
          'Pinch out to 280% with the black interior under your fingers. Drag to keep the black centred. CapCut adds the second keyframe.',
          'The frame is all black pan at the last frame.',
        ),
        tap(
          ['Tap the first diamond', 'Graphs'],
          'Pick an ease-in curve, so the push starts slow and arrives fast.',
          'The scale creeps, then rushes into the black.',
        ),
        tap(
          ['Effects', 'Video effects', 'search "chromatic" or "RGB"'],
          'Pick the plainest RGB-split look without a Pro badge. Trim its bar to the 2 frames before and the 2 frames after the cut.',
          'A 4-frame colour fringe across the seam, nowhere else.',
        ),
        tap(
          [
            'Tap clip B',
            'Split 2 frames in',
            'tap the sliver',
            'Adjust',
            'Sharpen',
          ],
          'Push Sharpen most of the way up on just that sliver. Leave the rest of B alone.',
          'A two-frame crisp flash as the new room opens.',
        ),
        tap(
          [],
          '280% on a 4K clip delivered at 1080p is past pixel-for-pixel (2x). It is eight frames of blur into black; it does not matter.',
          'No softness you can see at speed.',
        ),
      ],
      verifyNotes: () => [
        verify(
          'Graphs: tap a keyframe and look for a Graphs button with preset curves plus Custom. The preset names are not confirmed; pick the one whose line starts flat and ends steep.',
          'Effect names change by build and region. Search "chromatic", "RGB" and "split"; note the name, its sliders and any Pro badge. Pro assets can block the export.',
          'Sharpen in Adjust runs 0 to 100 on recalled builds. Check the end value on yours.',
        ),
      ],
      demo: ctx => {
        const A = clip('pan', 'is-a')
        const B = clip('walkin', 'is-b')
        const r = h('div', { class: 'fx-ca fx-ca-r' })
        const b = h('div', { class: 'fx-ca fx-ca-b' })
        ctx.frame.append(A, B, r, b)
        const HOLD_A = 0.8
        const OUT = 0.45
        const HOLD_B = 0.8
        const T = () => Math.max(0.05, ctx.T())
        const total = () => HOLD_A + T() + OUT + HOLD_B
        const burst = () => 2 / ctx.fps()
        const draw = t => {
          const Tt = T()
          const cut = HOLD_A + Tt
          const bf = burst()
          if (t < HOLD_A) {
            A.style.opacity = '1'
            A.style.transform = 'none'
            B.style.opacity = '0'
          } else if (t < cut) {
            const k = easeIn((t - HOLD_A) / Tt)
            A.style.opacity = '1'
            A.style.transform = `scale(${lerp(1, 2.8, k)})`
            B.style.opacity = '0'
          } else {
            const u = t - cut
            A.style.opacity = '0'
            B.style.opacity = '1'
            const k = easeOut(clamp(u / OUT, 0, 1))
            const bright = lerp(0.08, 1, clamp(u / (bf * 2), 0, 1))
            const sharp = u < bf ? ' contrast(1.7) saturate(1.3)' : ''
            B.style.transform = `scale(${lerp(1.18, 1, k)})`
            B.style.filter = `brightness(${bright})${sharp}`
          }
          const inBurst = t >= cut - bf && t < cut + bf
          const amp = inBurst ? 1 - Math.abs(t - cut) / bf : 0
          r.style.opacity = String(amp * 0.85)
          b.style.opacity = String(amp * 0.85)
          r.style.transform = `translateX(${-amp * 5}px)`
          b.style.transform = `translateX(${amp * 5}px)`
        }
        const layout = () => {
          const Tt = T()
          const tot = total()
          const cut = HOLD_A + Tt
          const bf = burst()
          return {
            total: tot,
            lanes: [
              {
                label: 'Main',
                color: P.tracks[3],
                blocks: [
                  { from: 0, to: cut, label: 'A · pan' },
                  { from: cut, to: tot, label: 'B · walk-in' },
                ],
                marks: [{ at: cut, label: 'cut in black' }],
              },
              {
                label: 'Scale',
                color: P.tracks[0],
                blocks: [
                  {
                    from: HOLD_A,
                    to: cut,
                    label: `100→280% · ${ctx.frames()} f`,
                    soft: true,
                  },
                ],
                keys: [HOLD_A, cut],
              },
              {
                label: 'Effects',
                color: P.tracks[4],
                blocks: [
                  { from: cut - bf, to: cut + bf, label: 'RGB' },
                  { from: cut, to: cut + bf, label: 'sharpen' },
                ],
              },
            ],
          }
        }
        return {
          draw,
          layout,
          total,
          hud: t => ({
            label: t < HOLD_A + T() ? 'A · 5x into the pan' : 'B · walk-in',
          }),
          poster: () => HOLD_A + T() * 0.8,
        }
      },
    },
    {
      id: 'halation',
      num: 5,
      color: 'var(--t5)',
      title: 'Halation',
      sub: 'Light leaking into its neighbours. A blurred copy of the clip, screened over itself.',
      counts: false,
      allow: {
        market: [
          'free',
          'a finish step; strong and warm when baking Dreamcore',
        ],
        reel: ['swap', 'use the runbook’s Glow effect at 25 instead'],
        doc: ['yes', 'faint and cool on the dark look'],
        lab: ['yes', 'yes'],
      },
      diagram: 'light',
      shoot: [
        'Halation needs a real light core in frame to bloom: a bulb, a flame, a sear, a window. On a flat-lit plate it just fogs.',
        'Expose so the core clips a little and the rest sits under it. The overlay only lifts what is already bright.',
        'Keep the lens clean. Grease on the Pixel glass makes its own halation, in the wrong colour, on every shot.',
      ],
      calc: { frames: 24, label: 'Bloom-in', kind: 'generic' },
      taps: ctx => [
        tap(
          ['Tap the clip', 'Duplicate'],
          'Then tap the copy › Overlay (some builds: Switch to overlay). If your build has no Duplicate, use Overlay › Add overlay and pick the same clip from the gallery, trimmed to match.',
          'The same picture twice: one on the main track, one on the overlay track, lined up.',
        ),
        tap(
          ['Tap the overlay', 'Blend', 'Screen'],
          'Lighten also works. Set Opacity 25–45: 45 for Dreamcore, 25 for the dark look.',
          'The picture brightens a touch; nothing darkens.',
        ),
        tap(
          ['Effects', 'Video effects', 'search "Blur"'],
          'Pick the plain blur. Tap the effect › Object › the overlay. Intensity 20–40: 40 for Dreamcore, 20 for the dark look. Stretch its bar over the whole clip.',
          'The bright parts grow soft edges; the main picture under it stays sharp.',
        ),
        tap(
          ['Tap the overlay', 'Adjust', 'Temp'],
          'Warm for Dreamcore, cool for the dark look. This tints only the bloom.',
          'Peach halos on the happy look; a faint cold rim on the dark one.',
        ),
        tap(
          [],
          `To let the bloom arrive: keyframe the overlay’s Opacity from 0 to your value over ${ctx.frames()} frames (${fx2(ctx.T(), 2)} s at ${ctx.fps()} fps) on the hero plate.`,
          'The light swells as the plate lands.',
        ),
      ],
      verifyNotes: () => [
        verify(
          'Blend lives on overlay items only, not on main-track clips, on every build recalled. If Blend is missing, the copy is still on the main track.',
          'Duplicate and Overlay in the clip toolbar are recalled, not confirmed. Scroll the clip toolbar end to end and read the labels; Overlay may read Switch to overlay.',
          'Effects › Object (some builds: Apply to) picks which layer the blur hits. If the blur lands on everything, tap the effect bar and look for that picker.',
        ),
      ],
      controls: (ctx, demo) => {
        const st = ctx.state
        const paint = () => {
          demo.relayout()
        }
        const look = ui.seg({
          label: 'Look',
          options: [
            { value: 'dream', label: 'Dreamcore' },
            { value: 'dark', label: 'Dark look' },
          ],
          value: st.look,
          onChange: v => {
            st.look = v
            if (v === 'dream') {
              st.blur = 40
              st.op = 45
            } else {
              st.blur = 20
              st.op = 25
            }
            blur.set(st.blur)
            op.set(st.op)
            paint()
          },
        })
        const blur = ui.slider({
          label: 'Blur',
          min: 20,
          max: 40,
          step: 1,
          value: st.blur,
          onInput: v => {
            st.blur = v
            paint()
          },
        })
        const op = ui.slider({
          label: 'Opacity',
          min: 25,
          max: 45,
          step: 1,
          value: st.op,
          unit: '%',
          onInput: v => {
            st.op = v
            paint()
          },
        })
        return h('div', { class: 'fx-knobs' }, look.el, blur.el, op.el)
      },
      demo: ctx => {
        const base = clip('plate', 'is-a')
        const over = clip('plate', 'fx-halo')
        const split = h(
          'div',
          { class: 'fx-split' },
          h('b', null, 'off'),
          h('b', null, 'on'),
        )
        ctx.frame.append(base, over, split)
        ctx.state = { look: 'dream', blur: 40, op: 45 }
        const SWEEP = 2.6
        const total = () => SWEEP
        const apply = () => {
          const st = ctx.state
          const warm = st.look === 'dream'
          const px = lerp(2, 7, (st.blur - 20) / 20)
          over.style.filter = warm
            ? `blur(${px}px) brightness(1.45) sepia(0.45) saturate(1.5)`
            : `blur(${px}px) brightness(1.25) hue-rotate(185deg) saturate(0.7)`
          over.style.opacity = String(st.op / 100)
        }
        const draw = t => {
          apply()
          const k = t / SWEEP
          const x = lerp(
            8,
            92,
            k < 0.5 ? easeInOut(k * 2) : easeInOut(2 - k * 2),
          )
          over.style.clipPath = `inset(0 0 0 ${x}%)`
          split.style.left = `${x}%`
        }
        const layout = () => {
          const st = ctx.state
          return {
            total: SWEEP,
            lanes: [
              {
                label: 'Main',
                color: P.tracks[0],
                blocks: [{ from: 0, to: SWEEP, label: 'plate' }],
              },
              {
                label: 'Overlay',
                color: P.tracks[4],
                blocks: [
                  {
                    from: 0,
                    to: SWEEP,
                    label: `copy · Screen ${st.op}% · blur ${st.blur}`,
                  },
                ],
              },
            ],
          }
        }
        return {
          draw,
          layout,
          total,
          hud: () => ({
            label:
              ctx.state.look === 'dream' ? 'Dreamcore · warm' : 'Dark · cool',
          }),
          poster: () => SWEEP * 0.25,
        }
      },
    },
    {
      id: 'vhs',
      num: 6,
      color: 'var(--t6)',
      title: 'VHS 4:3 pillarbox',
      sub: 'Confessions and failures live in a tape frame. It snaps to clean Lunar Night on the frame the dish hits the pass.',
      counts: false,
      allow: {
        market: ['no', 'not in the house style'],
        reel: ['no', 'not in the look'],
        doc: ['yes', 'confessions, failures and archive chaos only'],
        lab: ['no', 'not in the format'],
      },
      diagram: 'crop',
      shoot: [
        'The Pixel shoots 16:9 or 9:16, never 4:3. Frame the confession with air on both sides so the 4:3 crop loses nothing that matters. Face in the middle third.',
        'Shoot the confession flat and plain: one lamp, one chair, no move. The tape texture does the work.',
        'The pass shot is a locked frame. Nothing moves except the plate sliding in. The snap lands on the frame it stops.',
        'Shoot the pass shot in the Lunar Night setup: 3200K, under by 1.5 to 2 stops, the dish as the practical light.',
      ],
      calc: { frames: 36, label: 'Snap frame', kind: 'snap' },
      taps: ctx => [
        tap(
          ['Aspect ratio', '9:16'],
          'The master stays vertical for the phone cut; 16:9 for the landscape master. Labels: Ratio or Format on older builds.',
          'The canvas is the phone shape; nothing else changes.',
        ),
        tap(
          ['Overlay', 'Add overlay'],
          h(
            'span',
            null,
            'Pick the matte PNG from ',
            link('#type', 'Type & HUD'),
            ': "4:3 window" for a 9:16 master, "4:3 pillarbox" for 16:9. Pinch it to fill the frame. Trim it to the confession exactly.',
          ),
          'Bars top and bottom (or left and right), black, crisp.',
        ),
        tap(
          ['Tap the confession clip', 'pinch the preview'],
          'Scale and drag until the face sits inside the window. The matte hides the rest.',
          'The picture fills the 4:3 window; the bars stay black.',
        ),
        tap(
          ['Overlay', 'Add overlay'],
          h(
            'span',
            null,
            'Add the "VHS tracking & noise" plate from the ',
            link('#forge', 'Forge'),
            ' › Blend › Screen, Opacity as the Forge card says. Add "Scanlines & CRT" the same way. Trim both to the confession.',
          ),
          'Tape noise and a slow tracking band over the face, inside the window.',
        ),
        tap(
          [
            'Pinch the timeline open',
            'scrub to the frame the plate stops',
            'Split',
          ],
          `Snap frame ${ctx.frames()} = ${LN.fmt.tc(ctx.T(), ctx.fps())} at ${ctx.fps()} fps. Split the main track there. Drag the right end of the matte and both plates to that same frame.`,
          'Every overlay ends on the cut. The next frame is clean 9:16 Lunar Night.',
        ),
        tap(
          [],
          h(
            'span',
            null,
            'No transition on the snap. Colour the confession with the VHS look from ',
            link('#grade', 'Grade'),
            ' and the pass shot with Lunar Night. The contrast is the point.',
          ),
          'Tape, then the night. Nothing in between.',
        ),
      ],
      verifyNotes: () => [
        verify(
          'Aspect ratio: with nothing selected, find the tile in the bottom toolbar. It has read Aspect ratio, Ratio and Format in different builds. The chip row should include 9:16, 16:9 and 4:3.',
          'The matte and plates are files you save from this OS: Files by Google › tap the zip › Extract, then Add overlay picks them from the gallery. Check that CapCut lists PNG files with transparency; the bars must be opaque and the window clear.',
        ),
      ],
      controls: (ctx, demo) => {
        const st = ctx.state
        const seg = ui.seg({
          label: 'Master',
          options: [
            { value: '9x16', label: '9:16' },
            { value: '16x9', label: '16:9' },
          ],
          value: st.master,
          onChange: v => {
            st.master = v
            demo.frame.dataset.ar = v
            demo.relayout()
          },
        })
        return h('div', { class: 'fx-knobs' }, seg.el)
      },
      demo: ctx => {
        const V = clip('confess', 'is-a fx-tape')
        const L = clip('lunar', 'is-b')
        const matte = h(
          'div',
          { class: 'fx-matte' },
          h('i', { class: 'fx-bar fx-bar-a' }),
          h('i', { class: 'fx-bar fx-bar-b' }),
        )
        const lines = h('div', { class: 'fx-vhs-lines' })
        const band = h('div', { class: 'fx-vhs-band' })
        ctx.frame.append(V, matte, lines, band, L)
        ctx.state = { master: '9x16' }
        const HOLD_L = 1.3
        const T = () => Math.max(0.1, ctx.T())
        const total = () => T() + HOLD_L
        const head = V.querySelector('.sc-head')
        const draw = t => {
          const Tt = T()
          const fps = ctx.fps()
          if (t < Tt) {
            const f = frameOf(t, fps)
            const j = jit(f)
            V.style.opacity = '1'
            matte.style.opacity = '1'
            lines.style.opacity = '1'
            band.style.opacity = '1'
            L.style.opacity = '0'
            V.style.transform = `translate(${(j - 0.5) * 1.6}px, ${(jit(f + 7) - 0.5) * 1.2}px)`
            band.style.transform = `translateY(${lerp(110, -20, (t / 1.6) % 1)}%)`
            head.style.boxShadow = `${-1.5 - j}px 0 0 rgba(255, 40, 110, 0.55), ${1.5 + j}px 0 0 rgba(0, 220, 255, 0.55)`
          } else {
            const u = t - Tt
            V.style.opacity = '0'
            matte.style.opacity = '0'
            lines.style.opacity = '0'
            band.style.opacity = '0'
            L.style.opacity = '1'
            const settle = u < 0.12 ? (0.12 - u) / 0.12 : 0
            L.style.transform = `translateY(${settle * 1.5}px)`
          }
        }
        const layout = () => {
          const Tt = T()
          const tot = total()
          return {
            total: tot,
            lanes: [
              {
                label: 'Main',
                color: P.tracks[5],
                blocks: [
                  { from: 0, to: Tt, label: 'confession' },
                  { from: Tt, to: tot, label: 'the pass · Lunar Night' },
                ],
                marks: [{ at: Tt, label: 'dish lands' }],
              },
              {
                label: 'Matte PNG',
                color: P.tracks[4],
                blocks: [
                  {
                    from: 0,
                    to: Tt,
                    label:
                      ctx.state.master === '9x16'
                        ? '4:3 window'
                        : '4:3 pillarbox',
                  },
                ],
              },
              {
                label: 'VHS plates',
                color: P.tracks[3],
                blocks: [
                  { from: 0, to: Tt, label: 'tape · Screen', soft: true },
                ],
              },
            ],
          }
        }
        return {
          draw,
          layout,
          total,
          hud: t => ({
            label: t < T() ? 'confession · tape' : 'the pass · clean',
          }),
          poster: () => T() * 0.6,
        }
      },
    },
    {
      id: 'punch',
      num: 7,
      color: 'var(--t1)',
      title: 'The punch-in',
      sub: 'House style: 2–3 per video, 8–15% on the bite, the money shot and the verdict. One move per shot.',
      counts: false,
      allow: {
        market: ['free', '2–3 per video; not a transition'],
        reel: ['no', 'static holds only'],
        doc: ['yes', 'one move per shot'],
        lab: ['yes', 'one move per shot'],
      },
      diagram: 'lock',
      shoot: [
        'No move in camera. Lock the frame and hold the shot a full three seconds longer than you think; the push lives in the edit.',
        'Frame loose. An 8–15% punch eats the edges, so leave air around the plate, or the rim leaves the frame mid-move.',
        'Shoot the three moments that get the punch, held: the bite, the money shot, the verdict.',
      ],
      calc: { frames: 72, label: 'Move length', kind: 'span' },
      taps: ctx => [
        tap(
          [
            'Tap the clip',
            'playhead on the first frame of the move',
            'keyframe diamond',
          ],
          'Leave the scale at 100%. One diamond.',
          'A diamond on the clip at the playhead.',
        ),
        tap(
          [`Playhead ${ctx.frames()} frames later`, 'pinch the preview'],
          `That is ${fx2(ctx.T(), 2)} s at ${ctx.fps()} fps. Slow push: pinch to 108%. Beat punch: pinch to 110–115% on the bite, the money shot or the verdict. CapCut adds the second diamond.`,
          'Two diamonds; the picture creeps in between them.',
        ),
        tap(
          ['Drag the preview'],
          'If the pinch drifted, drag the plate back to centre at the second diamond. Position keyframes ride along with scale.',
          'The plate stays centred through the move.',
        ),
        tap(
          ['Tap a diamond', 'Graphs'],
          'A gentle ease on both ends for the slow push. None for a beat punch; it should land on the beat.',
          'The slow push breathes; the punch snaps.',
        ),
        tap(
          [],
          'One move per shot. Two reads as cheap. Count them at the end: two or three in the whole video, never more.',
          'Every shot holds still except the three that push.',
        ),
      ],
      verifyNotes: () => [
        verify(
          'Pinch-to-scale on the preview with a keyframe set is the recalled mobile route; there is no numeric Scale box on mobile in recalled builds. Pinch slowly and read the picture: 108% is a small creep, 115% is a visible jump.',
          'The slow push of 100% → 108% over 3 s is the playbook’s number. The beat punch of 8–15% has no fixed length in the house style; the calculator gives frames at your fps for whatever length lands on the beat.',
        ),
      ],
      controls: (ctx, demo) => {
        const st = ctx.state
        const seg = ui.seg({
          label: 'Move',
          options: [
            { value: 'slow', label: 'Slow push 108%' },
            { value: 'beat', label: 'Beat punch 112%' },
          ],
          value: st.mode,
          onChange: v => {
            st.mode = v
            ctx.setFrames(
              v === 'slow'
                ? 3 * ctx.fps()
                : Math.max(2, Math.round(ctx.fps() / 5)),
            )
            demo.relayout()
          },
        })
        return h('div', { class: 'fx-knobs' }, seg.el)
      },
      demo: ctx => {
        const A = clip('plate', 'is-a')
        ctx.frame.append(A)
        ctx.state = { mode: 'slow' }
        const HOLD = 0.7
        const T = () => Math.max(0.05, ctx.T())
        const total = () => HOLD * 0.5 + T() + HOLD
        const target = () => (ctx.state.mode === 'slow' ? 1.08 : 1.12)
        const draw = t => {
          const Tt = T()
          const start = HOLD * 0.5
          let sc = 1
          if (t >= start && t < start + Tt) {
            const k = (t - start) / Tt
            sc = lerp(1, target(), ctx.state.mode === 'slow' ? easeInOut(k) : k)
          } else if (t >= start + Tt) sc = target()
          A.style.transform = `scale(${sc})`
        }
        const layout = () => {
          const Tt = T()
          const tot = total()
          const start = HOLD * 0.5
          return {
            total: tot,
            lanes: [
              {
                label: 'Main',
                color: P.tracks[0],
                blocks: [{ from: 0, to: tot, label: 'the bite' }],
              },
              {
                label: 'Scale',
                color: P.tracks[3],
                blocks: [
                  {
                    from: start,
                    to: start + Tt,
                    label: `100→${Math.round(target() * 100)}% · ${ctx.frames()} f`,
                    soft: true,
                  },
                ],
                keys: [start, start + Tt],
              },
            ],
          }
        }
        return {
          draw,
          layout,
          total,
          hud: t => {
            const Tt = T()
            const start = HOLD * 0.5
            const k = clamp((t - start) / Tt, 0, 1)
            const sc = ctx.state.mode === 'slow' ? easeInOut(k) : k
            return {
              label: `scale ${Math.round(lerp(100, target() * 100, sc))}%`,
            }
          },
          poster: () => HOLD * 0.5 + T() * 0.6,
        }
      },
    },
  ]
  const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]))

  /* ------------------------------------------------------------ calculators */
  function frameCalc(card, ctx) {
    const fpsNow = () => ctx.fps()
    const frIn = h('input', {
      class: 'ln-input ln-num fx-num',
      type: 'number',
      min: 1,
      max: 999,
      step: 1,
      inputmode: 'numeric',
      'aria-label': `${card.calc.label} in frames`,
    })
    const secIn = h('input', {
      class: 'ln-input ln-num fx-num',
      type: 'number',
      min: 0,
      step: 0.01,
      inputmode: 'decimal',
      'aria-label': `${card.calc.label} in seconds`,
    })
    const fpsOut = h('span', { class: 'fx-calc-fps ln-num' })
    const others = h('div', { class: 'fx-calc-others ln-small ln-muted' })
    const rule = h('div', { class: 'fx-calc-rule' })
    const tc = h('span', { class: 'fx-calc-tc ln-num' })
    const isSnap = card.calc.kind === 'snap'
    const paint = () => {
      const fps = fpsNow()
      const f = ctx.frames()
      const sec = secs(f, fps)
      if (document.activeElement !== frIn) frIn.value = String(f)
      if (document.activeElement !== secIn) secIn.value = fx2(sec, 2)
      fpsOut.textContent = `${fps} fps`
      tc.textContent = LN.fmt.tc(sec, fps)
      others.replaceChildren(
        'Same time: ',
        ...FPS_LIST.filter(x => x !== fps).flatMap((x, i) => [
          i ? ' · ' : '',
          h('b', { class: 'ln-num' }, `${framesAt(sec, x)} f`),
          ` at ${x}`,
        ]),
      )
      const fmt = FMT[ctx.format()]
      rule.replaceChildren()
      if (fmt.id === 'reel' && card.allow.reel[0] === 'no') {
        rule.append(ui.chip('Night Reel: hard cut, no move', 'crimson'))
      } else if (
        card.counts &&
        Number.isFinite(fmt.maxSec) &&
        sec > fmt.maxSec + 0.011
      ) {
        rule.append(
          ui.chip(
            `Over the ${fmt.short} limit of ${fmt.maxSec} s: ${framesAt(fmt.maxSec, fps)} f max at ${fps} fps`,
            'crimson',
          ),
        )
      } else if (card.counts && Number.isFinite(fmt.maxSec)) {
        rule.append(
          ui.chip(`Inside the ${fmt.short} limit of ${fmt.maxSec} s`, 'sage'),
        )
      }
    }
    frIn.addEventListener('input', () => {
      const v = Number(frIn.value)
      if (Number.isFinite(v) && v >= 1) ctx.setFrames(v)
    })
    secIn.addEventListener('input', () => {
      const v = Number(secIn.value)
      if (Number.isFinite(v) && v > 0)
        ctx.setFrames(Math.max(1, framesAt(v, fpsNow())))
    })
    const el = h(
      'div',
      { class: 'fx-calc' },
      h(
        'div',
        { class: 'fx-calc-row' },
        h(
          'label',
          { class: 'fx-calc-cell' },
          h('span', { class: 'ln-label' }, isSnap ? 'Frame' : 'Frames'),
          frIn,
        ),
        h('span', { class: 'fx-calc-eq', 'aria-hidden': 'true' }, '='),
        h(
          'label',
          { class: 'fx-calc-cell' },
          h('span', { class: 'ln-label' }, 'Seconds'),
          secIn,
        ),
        h('span', { class: 'fx-calc-at' }, 'at ', fpsOut),
      ),
      h(
        'div',
        { class: 'fx-calc-foot' },
        h(
          'span',
          { class: 'ln-small ln-muted' },
          isSnap ? 'Timecode of the snap: ' : 'As timecode: ',
        ),
        tc,
      ),
      others,
      rule,
    )
    return { el, paint }
  }

  /* ------------------------------------------------------------ card */
  function allowRow(card) {
    const row = h('div', { class: 'fx-allow', role: 'list' })
    const paint = () => {
      const cur = getFormat()
      row.replaceChildren(
        FORMATS.map(f => {
          const [kind, note] = card.allow[f.id]
          const k =
            kind === 'no'
              ? 'crimson'
              : kind === 'yes' || kind === 'free'
                ? 'sage'
                : kind === 'count'
                  ? 'amber'
                  : ''
          const chip = ui.chip(
            `${f.short}: ${kind === 'no' ? 'no' : kind === 'count' ? 'counts' : kind === 'swap' ? 'swap' : 'yes'}`,
            k,
          )
          chip.setAttribute('role', 'listitem')
          chip.title = note
          if (f.id === cur) chip.classList.add('is-on')
          return chip
        }),
      )
    }
    paint()
    LN.bus.on('edit:format', paint)
    return row
  }

  function card(cardDef) {
    const def = cardDef
    const ctx = {
      fps: getFps,
      format: getFormat,
      frames: () => getFrames(def),
      T: () => secs(getFrames(def), getFps()),
      setFrames: v => setFrames(def, v),
      state: {},
    }
    const demo = makeDemo(def, def.demo, ctx)
    const calc = frameCalc(def, ctx)
    const tapsHost = h('div', { class: 'ln-stack fx-taps' })
    const paintTaps = () => tapsHost.replaceChildren(def.taps(ctx))
    paintTaps()
    const activeNote = h('p', { class: 'fx-active ln-small' })
    const paintActive = () => {
      const f = FMT[getFormat()]
      const [kind, note] = def.allow[f.id]
      activeNote.textContent = `${f.name}: ${note}.`
      activeNote.dataset.kind = kind
    }
    paintActive()
    const refresh = () => {
      demo.relayout()
      calc.paint()
      paintTaps()
      paintActive()
    }
    LN.bus.on('fx:fps', refresh)
    LN.bus.on('edit:format', refresh)
    LN.bus.on('fx:frames', e => {
      if (e && e.id === def.id) refresh()
    })
    const knobs = def.controls ? def.controls(ctx, demo) : null
    const shootList = ui.steps(def.shoot)
    const el = h(
      'article',
      {
        class: 'fx-card',
        id: `fx-${def.id}`,
        style: { '--c': def.color },
        'aria-labelledby': `fx-${def.id}-h`,
      },
      h(
        'header',
        { class: 'fx-card-head' },
        h('span', { class: 'fx-num', 'aria-hidden': 'true' }, String(def.num)),
        h(
          'div',
          { class: 'fx-card-title' },
          h('h3', { class: 'ln-h2', id: `fx-${def.id}-h` }, def.title),
          h('p', { class: 'ln-muted' }, def.sub),
          allowRow(def),
          activeNote,
        ),
      ),
      h(
        'div',
        { class: 'fx-card-grid' },
        h('div', { class: 'fx-demo-col' }, demo.el, knobs),
        h(
          'div',
          { class: 'fx-body' },
          h(
            'section',
            { class: 'fx-block' },
            h('div', { class: 'ln-eyebrow' }, 'On shoot day'),
            h('div', { class: 'fx-shoot' }, diagram(def.diagram), shootList),
          ),
          h(
            'section',
            { class: 'fx-block' },
            h('div', { class: 'ln-eyebrow' }, 'In CapCut'),
            tapsHost,
            ...def.verifyNotes(),
          ),
          h(
            'section',
            { class: 'fx-block' },
            h(
              'div',
              { class: 'ln-eyebrow' },
              `Frame timing · ${def.calc.label}`,
            ),
            calc.el,
          ),
        ),
      ),
    )
    return { el, demo, refresh }
  }

  /* ------------------------------------------------------------ top strip: format + fps */
  function rulesStrip() {
    const fmtSeg = ui.seg({
      label: 'Format',
      options: FORMATS.map(f => ({ value: f.id, label: f.short })),
      value: getFormat(),
      onChange: id => {
        setFormat(id)
        setFps(FMT[id].fps)
        fpsSeg.set(FMT[id].fps)
      },
    })
    const fpsSeg = ui.seg({
      label: 'Timeline fps',
      options: FPS_LIST.map(v => ({ value: v, label: String(v) })),
      value: getFps(),
      onChange: v => setFps(v),
    })
    const ruleText = h('p', { class: 'fx-rule-text' })
    const name = h('b', { class: 'fx-rule-name' })
    const paint = () => {
      const f = FMT[getFormat()]
      name.textContent = f.name
      ruleText.textContent = f.rule
      fmtSeg.set(f.id)
      fpsSeg.set(getFps())
    }
    paint()
    LN.bus.on('edit:format', paint)
    LN.bus.on('fx:fps', paint)
    const table = ui.table(
      ['Format', 'Transitions', 'Punch-ins', 'Timeline fps'],
      [
        [
          'Marketplace Review',
          'At most 2, about 0.2 s each; hard cuts elsewhere',
          '2–3 of 8–15%: bite, money shot, verdict',
          '30 (60 if shot at 60)',
        ],
        [
          'Lunar Night Reel',
          'None. Hard cuts, 3–5 s static holds',
          'None. Static holds',
          '24',
        ],
        [
          'Road to Three Stars',
          'The full set',
          'One move per shot, 100→108% over 3 s',
          '24 (match the source)',
        ],
        [
          'R&D Lab',
          'No rule written; use the documentary set',
          'One move per shot',
          '30',
        ],
      ],
      { label: 'Transition rules by format' },
    )
    return ui.section(
      {
        eyebrow: 'Rules first',
        title: 'What the format allows',
        lede: 'Pick the format you are cutting. Every card below follows it: the chips say whether the move is allowed, the calculators flag the 0.2 s Marketplace limit, and the demos run at your timeline frame rate. The format is shared with The Cut.',
        id: 'fx-rules',
      },
      h(
        'div',
        { class: 'ln-card fx-rules' },
        h('div', { class: 'ln-row fx-rules-row' }, fmtSeg.el, fpsSeg.el),
        h('div', { class: 'fx-rule-line' }, name, ruleText),
      ),
      table,
      ui.callout(
        'rule',
        'Cut on motion or on sound, never on nothing. The one exception is the Lunar Night reel, whose rhythm comes from the music. Every 3 s something changes: shot, scale, text, sound or colour. Stock transitions from the white square are not the house style.',
      ),
    )
  }

  function quickList() {
    return ui.section(
      {
        eyebrow: 'The 30-second version',
        title: 'Seven moves',
        id: 'fx-quick',
      },
      h(
        'ol',
        { class: 'fx-quick' },
        CARDS.map(c =>
          h(
            'li',
            { style: { '--c': c.color } },
            h('a', { href: `#fx-${c.id}` }, h('b', null, c.title)),
            h('span', null, c.sub),
          ),
        ),
      ),
    )
  }

  function transitionsPanel() {
    return ui.section(
      {
        eyebrow: 'The white square',
        title: 'CapCut’s own transitions panel',
        lede: 'The small white square between two clips opens CapCut’s stock transitions. The house style uses it for at most two short cuts in a Marketplace Review and never in a reel. If you do open it, this is what to set.',
        id: 'fx-panel',
      },
      h(
        'div',
        { class: 'ln-card ln-stack' },
        tap(
          ['Tap the white square between two clips'],
          'The Transitions panel opens for that cut only. Pick a plain one from Basic without a Pro badge. Anything called Trending or Glitch is noise on food.',
          'A thumbnail row and a duration slider under it.',
        ),
        tap(
          ['Duration slider'],
          'Pull it down to 0.2 s. The default is 0.5 s and the minimum is 0.1 s on recalled builds.',
          'The slider reads 0.2 s and the cut shows a small transition icon.',
        ),
        tap(
          ['Apply to all'],
          'Do not tap it. It puts the same transition on every cut of the main track, which breaks the two-transition rule in one tap.',
          'Only the one cut carries the transition.',
        ),
        verify(
          'Duration: tap the white square and drag the slider to both ends. Note the minimum, the default and the maximum. The minimum of 0.1 s and the default of 0.5 s come from recall.',
          'Transitions sit between adjacent main-track clips only, not between overlays, on recalled builds. If your two clips are on different tracks, the square will not appear.',
        ),
      ),
    )
  }

  /* ------------------------------------------------------------ mount */
  function mount(el) {
    onRoute = true
    const cards = CARDS.map(c => card(c))
    const demos = new Map(cards.map(c => [c.demo.id, c.demo]))
    const fpsNote = verify(
      'CapCut mobile’s time readout shows minutes and seconds; a frame counter and frame-step buttons are not established. Every readout here gives both frames and seconds, so scrub to the seconds. Pinch the timeline to open it wider.',
    )
    el.append(
      rulesStrip(),
      quickList(),
      ui.section(
        {
          eyebrow: 'The moves',
          title: 'Seven transitions, demo first',
          lede: 'Each card: watch the move, read the handheld version for shoot day, then the taps. The calculator under each demo turns frames into seconds at your timeline rate and sets the demo’s timing.',
          id: 'fx-moves',
        },
        fpsNote,
        h(
          'div',
          { class: 'fx-cards' },
          cards.map(c => c.el),
        ),
      ),
      transitionsPanel(),
    )
    LN.bus.on('route', id => {
      onRoute = id === 'fx'
      if (onRoute) {
        for (const d of demos.values())
          if (d.playing) d.t0 = performance.now() - d.t * 1000
        kick()
      } else halt()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') halt()
      else {
        for (const d of demos.values())
          if (d.playing) d.t0 = performance.now() - d.t * 1000
        kick()
      }
    })
    LN.fx = {
      cards: CARDS,
      demos,
      setFormat,
      setFps,
      setFrames: (id, v) => CARD[id] && setFrames(CARD[id], v),
      /** Park a demo at a phase 0..1 (pauses it). Used by QA screenshots. */
      setPhase(id, p) {
        const d = demos.get(id)
        if (!d) return false
        d.pause()
        d.userPaused = true
        d.setT(clamp(p, 0, 0.999) * d.total())
        return true
      },
    }
  }

  LN.register({
    id: 'fx',
    num: 4,
    title: 'Transitions',
    short: 'FX',
    kicker: 'TRANSITIONS & EFFECTS',
    blurb:
      'Seven moves with demos, the handheld version for shoot day, the CapCut taps and frame-timing calculators.',
    lede: 'Seven ways to get from one shot to the next, and the rules on when you are allowed to. Each one is shot half in camera and finished in CapCut Mobile. The demos run at your timeline frame rate; the calculators turn frames into seconds so the keyframes land where you mean them to.',
    outputs: [
      'In-camera transitions',
      'CapCut tap sequences',
      'Frame-timing calculators',
    ],
    mount,
  })
})()
