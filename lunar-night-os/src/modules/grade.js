/* Lunar Night OS: Grade (module 5). Look Lab, LUT export, CapCut routes,
   slider recipes, layer order and the Bake mount. Colour maths lives in
   engines/lut-engine.js (globalThis.LN_LUT); this file is UI only. */
;(() => {
  const { h, s, ui } = LN

  /* ------------------------------------------------------------ CapCut paths
     Research patches these. `status` is how sure research is about the path:
     'contradicted' and 'unverified' render with a verify callout. */
  const CAPCUT = {
    adjustClip: {
      path: ['Tap the clip', 'Adjust'],
      alt: ['Tap the clip', 'Edit', 'Adjust'],
      status: 'strong',
    },
    adjustLayer: {
      path: ['Nothing selected', 'Adjust'],
      status: 'moderate',
    },
    applyAll: { path: ['Adjust', 'Apply to all'], status: 'moderate' },
    hsl: { path: ['Adjust', 'HSL'], status: 'moderate' },
    curves: { path: ['Adjust', 'Curves'], status: 'moderate' },
    lutMobile: {
      path: ['Tap the clip', 'Adjust', 'LUT', 'Import'],
      status: 'contradicted',
    },
    lutDesktop: {
      path: ['Adjustment', 'LUT', 'Import'],
      status: 'moderate',
    },
    filtersImport: {
      path: ['Nothing selected', 'Filters', 'Import / +'],
      status: 'unverified',
    },
    effects: {
      path: ['Nothing selected', 'Effects', 'Video effects'],
      status: 'strong',
    },
    overlay: {
      path: ['Nothing selected', 'Overlay', 'Add overlay'],
      status: 'strong',
    },
    blend: { path: ['Tap the overlay', 'Blend'], status: 'strong' },
    splitTone: {
      path: ['Adjust', 'Split tone'],
      status: 'unverified',
    },
    tintLabel: 'Tint / Hue',
  }
  const PIXEL = {
    extract: ['Files by Google', 'Downloads', 'Tap the zip', 'Extract'],
    bmLut: ['Settings', 'LUTs', 'LUT Selection', 'Import LUT'],
    hdrOff: ['Camera', 'Video', 'Settings', '10-bit HDR', 'Off'],
  }

  /* ------------------------------------------------------------ slider recipes
     Adjust: [label, value]. HSL: [colour, hue, sat, light] (null = leave).
     Curve: CapCut points on 0..255 (null = take the .cube's grey axis).
     Split: {shadows, highlights} as {name, hue° on the wheel, amount}. */
  const HSL_SWATCH = {
    Red: '#e0473c',
    Orange: '#ec8a2c',
    Yellow: '#e8cb3a',
    Green: '#3f9e52',
    Cyan: '#2fa7b6',
    Blue: '#3a6fd8',
    Purple: '#8a4fc4',
    Magenta: '#cf3f8e',
  }
  const RECIPES = [
    {
      id: 'lunar',
      lut: 'lunar',
      name: 'Lunar Night',
      sub: 'Kitchen and plate. Matches LunarNight_Master.cube.',
      adjust: [
        ['Brightness', -6],
        ['Contrast', 14],
        ['Saturation', -12],
        ['Exposure', -8],
        ['Sharpen', 12],
        ['Highlight', -18],
        ['Shadow', -10],
        ['Temp', -8],
        ['Tint', 4],
        ['Fade', 6],
        ['Vignette', 18],
        ['Grain', 15],
      ],
      hsl: [
        ['Red', -4, 18, -6],
        ['Orange', 3, 22, 4],
        ['Yellow', -10, -8, 2],
        ['Green', 15, -28, -15],
        ['Cyan', -8, -35, -12],
        ['Blue', -6, -40, -20],
        ['Purple', null, -45, -20],
        ['Magenta', null, -45, -20],
      ],
      curve: [
        [0, 6],
        [55, 38],
        [190, 198],
        [255, 242],
      ],
      split: {
        shadows: { name: 'Cobalt-teal', hue: 200, amount: 16 },
        highlights: { name: 'Tungsten champagne amber', hue: 40, amount: 14 },
      },
      effects: [],
      notes: [
        'Fade +6 is the matte toe of the kitchen look: blacks print at #08080A, not 0. Night exteriors on the v2 look keep Fade at 0.',
      ],
    },
    {
      id: 'v2',
      lut: 'v2:Violet',
      name: 'Lunar Night v2',
      sub: 'Night exteriors, from your runbook. Rebuilds LunarNight_v2_Violet.cube for clips shot at 3200K and underexposed.',
      adjust: [
        ['Exposure', -15],
        ['Contrast', 25],
        ['Shadow', -40],
        ['Highlight', -10],
        ['Saturation', 15],
        ['Temp', -30],
        ['Tint', 15],
        ['Fade', 0],
        ['Vignette', 10],
      ],
      hsl: [
        ['Red', null, null, null],
        ['Orange', null, 10, null],
        ['Yellow', null, -10, null],
        ['Green', null, 10, null],
        ['Cyan', null, null, null],
        ['Blue', 15, 10, null],
        ['Purple', null, null, null],
        ['Magenta', null, null, null],
      ],
      curve: null,
      split: null,
      effects: [
        ['Glow', 'Intensity 25, size or range small, over the whole video'],
        ['Grain', 'Intensity 20, finest one, over the whole video'],
      ],
      notes: [
        'No Exposure slider in your build? Use Brightness −15.',
        'Tint +15 is the violet sky. For the deep-blue small-town variant, leave Tint at 0.',
        'Fade stays at 0. It lifts the blacks and kills the look.',
        'Looks grey instead of black? Shadow −50 and Exposure −20.',
      ],
    },
    {
      id: 'dream',
      lut: 'dream',
      name: 'Dreamcore',
      sub: 'Memory and heritage. Starting points next to Dreamcore_Halation.cube.',
      adjust: [
        ['Sharpen', -20],
        ['Contrast', -12],
        ['Highlight', 10],
        ['Shadow', 18],
        ['Fade', 14],
        ['Temp', 12],
        ['Tint', 10],
        ['Vignette', 25],
        ['Grain', 28],
      ],
      hsl: null,
      curve: null,
      split: null,
      effects: [
        ['Dreamy › Edge glow', 'Intensity 24, range 65'],
        ['Chromatic aberration', 'Horizontal 8, vertical 0'],
      ],
      notes: [
        'A LUT can tint highlights the colour of halation but cannot bloom them. The glow effect does the bloom.',
      ],
    },
    {
      id: 'vhs',
      lut: 'vhs',
      name: 'VHS',
      sub: 'Confessions, failures, archive chaos. Starting points next to VHS_Tape_Grade.cube.',
      adjust: [
        ['Contrast', -8],
        ['Saturation', -6],
        ['Sharpen', -15],
        ['Fade', 18],
        ['Highlight', -12],
        ['Temp', 6],
        ['Tint', -4],
        ['Grain', 30],
        ['Vignette', 20],
      ],
      hsl: null,
      curve: null,
      split: null,
      effects: [
        ['Retro › VHS / DV', 'Default, then trim to the clip'],
        ['Scanlines', 'Intensity 18, speed 10'],
        ['Noise / Jitter', 'Intensity 12'],
      ],
      overlay: {
        what: 'Forge VHS tracking plate',
        blend: 'Screen',
        opacity: 35,
      },
      notes: [
        'Shoot or crop 4:3 for VHS beats. The LUT is colour only; the effects and the overlay make the tape.',
      ],
    },
  ]
  const TWO_SIDED = new Set([
    'Brightness',
    'Contrast',
    'Saturation',
    'Exposure',
    'Highlight',
    'Shadow',
    'Temp',
    'Tint',
  ])

  const LAYERS = [
    {
      n: 5,
      name: 'Titles and HUD',
      note: 'Text, rating cards, mono data lines. Always last, never graded.',
    },
    {
      n: 4,
      name: 'Texture',
      note: 'Grain, halation, VHS. Forge plates on Screen or Overlay.',
    },
    {
      n: 3,
      name: 'Creative Adjust + HSL',
      note: 'The slider recipe, at reduced strength when a LUT sits below it.',
    },
    {
      n: 2,
      name: 'The look',
      note: 'The LUT at 38–62%, or a clip with the look baked in.',
    },
    {
      n: 1,
      name: 'Fixes',
      note: 'Exposure and white balance per clip. A white napkin reads white.',
    },
  ]

  const LOOK_ORDER = ['base', 'lunar', 'dream', 'vhs']
  const V2_ORDER = ['Violet', 'Blue', 'Soft', 'Kitchen']
  const DEFAULT_INTENSITY = 50
  const BAND = [38, 62]
  const PREVIEW_LONG = 960
  const PREVIEW_SHORT = 540
  const SOURCE_LONG = 1280

  /* ------------------------------------------------------------ engine glue */
  const lutApi = () => globalThis.LN_LUT || LN.lut || null
  const v2Data = () => (LN.data && LN.data.lutsV2) || null
  const v2Cache = {}
  function v2Table(key) {
    if (v2Cache[key]) return v2Cache[key]
    const d = v2Data()
    const look = d && d.looks && d.looks[key]
    if (!look) return null
    const bin = atob(look.data)
    const n = bin.length >> 1
    const t = new Float32Array(n)
    for (let i = 0; i < n; i++)
      t[i] = (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) / 65535
    v2Cache[key] = t
    return t
  }
  const isV2 = id => typeof id === 'string' && id.startsWith('v2:')
  const v2Key = id => id.slice(3)
  function lookName(id) {
    if (id === 'base') return 'Base'
    if (isV2(id)) {
      const d = v2Data()
      const l = d && d.looks[v2Key(id)]
      return l ? l.name : id
    }
    const L = lutApi()
    return L && L.LOOKS[id] ? L.LOOKS[id].name : id
  }
  const shortName = id => (isV2(id) ? `v2 ${v2Key(id)}` : lookName(id))
  const cubeName = (id, size) => {
    if (isV2(id)) return v2Data().looks[v2Key(id)].file
    const f = lutApi().LOOKS[id].file
    return size === 33 ? f : f.replace(/\.cube$/, `_${size}.cube`)
  }
  /** Grey axis of a look, as [x, y] on 0..255 (Rec.709 luma). */
  function greyAxis(id, params, steps = 32) {
    const L = lutApi()
    const out = []
    const o = [0, 0, 0]
    for (let i = 0; i <= steps; i++) {
      const v = i / steps
      let r
      if (isV2(id)) r = L.sample(v2Table(v2Key(id)), 33, v, v, v, o)
      else r = L.transform(id, params, v, v, v)
      out.push([v * 255, (0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2]) * 255])
    }
    return out
  }
  /** Where a look pushes the greys: average HSV hue and saturation of the
   *  output for shadow greys and highlight greys. */
  function measureTone(id, params) {
    const L = lutApi()
    const o = [0, 0, 0]
    const at = vs => {
      let x = 0
      let y = 0
      let sat = 0
      for (const v of vs) {
        const c = isV2(id)
          ? L.sample(v2Table(v2Key(id)), 33, v, v, v, o).slice()
          : L.transform(id, params, v, v, v)
        const mx = Math.max(c[0], c[1], c[2])
        const mn = Math.min(c[0], c[1], c[2])
        const d = mx - mn
        let hue = 0
        if (d > 1e-6) {
          if (mx === c[0]) hue = ((c[1] - c[2]) / d) % 6
          else if (mx === c[1]) hue = (c[2] - c[0]) / d + 2
          else hue = (c[0] - c[1]) / d + 4
          hue *= 60
        }
        const sv = mx > 1e-6 ? d / mx : 0
        x += Math.cos((hue * Math.PI) / 180) * sv
        y += Math.sin((hue * Math.PI) / 180) * sv
        sat += sv
      }
      const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
      return { hue, amount: Math.round((sat / vs.length) * 100) }
    }
    return { shadows: at([0.12, 0.2, 0.28]), highlights: at([0.7, 0.8, 0.88]) }
  }

  /* ------------------------------------------------------------ helpers */
  const debounce = (fn, ms) => {
    let t = 0
    return (...a) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...a), ms)
    }
  }
  const signed = v =>
    v == null ? '—' : v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v)}`
  const asciiSigned = v =>
    v == null ? '-' : v === 0 ? '0' : `${v > 0 ? '+' : '-'}${Math.abs(v)}`
  const decimals = step =>
    step >= 1 ? 0 : step >= 0.01 ? 2 : step >= 0.001 ? 3 : 4
  function fmtParam(d, v) {
    const n = Number(v)
    const dec = decimals(d.step || 1)
    if (d.unit === 'EV')
      return `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(2)} EV`
    if (d.unit === '×') return `${n.toFixed(dec)}×`
    if (d.unit === '/255') return `${Math.round(n)}/255`
    return n.toFixed(dec)
  }
  /** Fritsch–Carlson monotone cubic through points, sampled for drawing. */
  function monotonePath(pts) {
    const n = pts.length
    const xs = pts.map(p => p[0])
    const ys = pts.map(p => p[1])
    const d = []
    for (let i = 0; i < n - 1; i++)
      d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
    const m = new Array(n)
    m[0] = d[0]
    m[n - 1] = d[n - 2]
    for (let i = 1; i < n - 1; i++)
      m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        m[i] = 0
        m[i + 1] = 0
        continue
      }
      const a = m[i] / d[i]
      const b = m[i + 1] / d[i]
      const q = a * a + b * b
      if (q > 9) {
        const t = 3 / Math.sqrt(q)
        m[i] = t * a * d[i]
        m[i + 1] = t * b * d[i]
      }
    }
    const out = []
    for (let i = 0; i < n - 1; i++) {
      const hh = xs[i + 1] - xs[i]
      for (let k = 0; k < 16; k++) {
        const t = k / 16
        const t2 = t * t
        const t3 = t2 * t
        out.push([
          xs[i] + hh * t,
          (2 * t3 - 3 * t2 + 1) * ys[i] +
            (t3 - 2 * t2 + t) * hh * m[i] +
            (3 * t2 - 2 * t3) * ys[i + 1] +
            (t3 - t2) * hh * m[i + 1],
        ])
      }
    }
    out.push([xs[n - 1], ys[n - 1]])
    return out
  }
  const polyline = pts =>
    pts.map(p => `${p[0].toFixed(1)},${(255 - p[1]).toFixed(1)}`).join(' ')
  const verifyFor = (entry, what) =>
    entry.status === 'contradicted' || entry.status === 'unverified'
      ? ui.callout(
          'verify',
          h(
            'span',
            null,
            `${what} `,
            ui.path(entry.path),
            ` is ${entry.status} in the research. Open CapCut and check the row of tools before you rely on it.`,
          ),
        )
      : null

  /* ------------------------------------------------------------ test scene */
  function prng(seed) {
    let a = seed >>> 0
    return () => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function ellipse(ctx, cx, cy, rx, ry, rot = 0) {
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
  }
  function roundRect(ctx, x, y, w, hh, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + hh, r)
    ctx.arcTo(x + w, y + hh, x, y + hh, r)
    ctx.arcTo(x, y + hh, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
  /** Back of a hand and three fingers, foreground and out of focus. */
  function drawHand(ctx, x, y) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-0.32)
    ctx.filter = 'blur(2.6px)'
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 16
    const skin = (y0, y1) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1)
      g.addColorStop(0, '#c99470')
      g.addColorStop(0.4, '#a9714f')
      g.addColorStop(1, '#6a4231')
      return g
    }
    // Fingers first, so the back of the hand overlaps their roots
    const fingers = [
      [-118, -34, 104, 25],
      [-126, -6, 112, 26],
      [-114, 22, 100, 25],
      [-92, 48, 80, 23],
    ]
    for (const [fx, fy, fw, fh] of fingers) {
      ctx.fillStyle = skin(fy, fy + fh)
      roundRect(ctx, fx, fy, fw + 60, fh, fh / 2)
      ctx.fill()
    }
    ctx.fillStyle = skin(-52, 80)
    ellipse(ctx, 60, 10, 110, 66)
    ctx.fill()
    ctx.fillRect(60, -56, 200, 132)
    ctx.shadowColor = 'transparent'
    // Knuckle sheen from the candle
    ctx.fillStyle = 'rgba(255,214,170,0.22)'
    ellipse(ctx, 10, -34, 70, 10, -0.05)
    ctx.fill()
    ctx.fillStyle = 'rgba(60,30,20,0.25)'
    for (const [fx, fy, , fh] of fingers) {
      ctx.fillRect(fx + 52, fy + fh - 2, 30, 2)
    }
    ctx.filter = 'none'
    ctx.restore()
  }
  /** Procedural food test plate at 960×540: every hue a grade has to get
   *  right (crust, sauce, herbs, yolk, flame, skin, steel, greys). */
  function drawScene(ctx, W, H) {
    const rnd = prng(20261109)
    const stripH = Math.round(H * 0.1)
    const sceneH = H - stripH
    ctx.save()
    // Wall behind the counter
    let g = ctx.createLinearGradient(0, 0, 0, sceneH * 0.2)
    g.addColorStop(0, '#0b0c0f')
    g.addColorStop(1, '#16181c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, sceneH * 0.2)
    // Slate counter
    const top = sceneH * 0.2 + 18
    g = ctx.createLinearGradient(0, top, 0, sceneH)
    g.addColorStop(0, '#2a2e35')
    g.addColorStop(0.45, '#1f2228')
    g.addColorStop(1, '#131519')
    ctx.fillStyle = g
    ctx.fillRect(0, top, W, sceneH - top)
    // Slate grain and faint veins
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * W
      const y = top + rnd() * (sceneH - top)
      ctx.fillStyle =
        rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.18)'
      ctx.fillRect(x, y, 1 + rnd() * 2, 1)
    }
    ctx.strokeStyle = 'rgba(190,200,215,0.06)'
    ctx.lineWidth = 1.2
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      const y0 = top + rnd() * (sceneH - top)
      ctx.moveTo(-10, y0)
      ctx.bezierCurveTo(
        W * 0.3,
        y0 + (rnd() - 0.5) * 120,
        W * 0.6,
        y0 + (rnd() - 0.5) * 120,
        W + 10,
        y0 + (rnd() - 0.5) * 80,
      )
      ctx.stroke()
    }
    // Brushed steel rail at the back edge of the counter
    const railY = sceneH * 0.2
    g = ctx.createLinearGradient(0, railY, 0, railY + 18)
    g.addColorStop(0, '#3c4047')
    g.addColorStop(0.3, '#c9ced6')
    g.addColorStop(0.55, '#8b919a')
    g.addColorStop(1, '#2c2f35')
    ctx.fillStyle = g
    ctx.fillRect(0, railY, W, 18)
    for (let i = 0; i < 520; i++) {
      const y = railY + rnd() * 18
      ctx.fillStyle =
        rnd() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'
      ctx.fillRect(rnd() * W, y, 20 + rnd() * 140, 0.6)
    }
    // Candle at the back right, a touch soft (behind the focus plane)
    ctx.filter = 'blur(1.2px)'
    const cx = W * 0.865
    const cBase = railY + 4
    g = ctx.createLinearGradient(cx - 22, 0, cx + 22, 0)
    g.addColorStop(0, '#9c9284')
    g.addColorStop(0.45, '#efe8da')
    g.addColorStop(1, '#8a8173')
    ctx.fillStyle = g
    roundRect(ctx, cx - 20, cBase - 46, 40, 50, 5)
    ctx.fill()
    ctx.strokeStyle = '#1a1410'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(cx, cBase - 46)
    ctx.lineTo(cx + 1, cBase - 53)
    ctx.stroke()
    ctx.filter = 'none'
    // Warm glow (additive)
    ctx.globalCompositeOperation = 'lighter'
    g = ctx.createRadialGradient(cx, cBase - 66, 2, cx, cBase - 66, 260)
    g.addColorStop(0, 'rgba(255,170,70,0.55)')
    g.addColorStop(0.18, 'rgba(230,130,45,0.22)')
    g.addColorStop(0.5, 'rgba(160,80,25,0.07)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, sceneH)
    // Flame
    g = ctx.createRadialGradient(cx, cBase - 60, 1, cx, cBase - 64, 14)
    g.addColorStop(0, 'rgba(255,252,235,1)')
    g.addColorStop(0.35, 'rgba(255,214,120,0.95)')
    g.addColorStop(0.75, 'rgba(240,130,40,0.6)')
    g.addColorStop(1, 'rgba(200,80,20,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(cx, cBase - 88)
    ctx.bezierCurveTo(cx + 11, cBase - 70, cx + 8, cBase - 53, cx, cBase - 53)
    ctx.bezierCurveTo(cx - 8, cBase - 53, cx - 11, cBase - 70, cx, cBase - 88)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    // Plate shadow
    const px = W * 0.43
    const py = sceneH * 0.58
    const prx = W * 0.27
    const pry = sceneH * 0.33
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.75)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetX = -14
    ctx.shadowOffsetY = 18
    ellipse(ctx, px, py, prx, pry)
    ctx.fillStyle = '#4a4f57'
    ctx.fill()
    ctx.restore()
    // Steel rim
    g = ctx.createLinearGradient(px - prx, py - pry, px + prx, py + pry)
    g.addColorStop(0, '#6a7079')
    g.addColorStop(0.3, '#d8dde4')
    g.addColorStop(0.55, '#7d838c')
    g.addColorStop(0.8, '#e6e9ee')
    g.addColorStop(1, '#5b6068')
    ellipse(ctx, px, py, prx, pry)
    ctx.fillStyle = g
    ctx.fill()
    // Porcelain
    g = ctx.createRadialGradient(
      px + prx * 0.25,
      py - pry * 0.35,
      10,
      px,
      py,
      prx,
    )
    g.addColorStop(0, '#f4f0e8')
    g.addColorStop(0.6, '#e4dfd5')
    g.addColorStop(1, '#bdb7ac')
    ellipse(ctx, px, py, prx - 13, pry - 9)
    ctx.fillStyle = g
    ctx.fill()
    // Well of the plate
    ellipse(ctx, px, py + 4, prx * 0.66, pry * 0.64)
    ctx.strokeStyle = 'rgba(120,110,95,0.22)'
    ctx.lineWidth = 3
    ctx.stroke()
    // Crimson sauce swoosh
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#7d171c'
    ctx.lineWidth = 30
    ctx.beginPath()
    ctx.moveTo(px - prx * 0.55, py + pry * 0.38)
    ctx.bezierCurveTo(
      px - prx * 0.2,
      py + pry * 0.62,
      px + prx * 0.25,
      py + pry * 0.5,
      px + prx * 0.52,
      py + pry * 0.08,
    )
    ctx.stroke()
    ctx.strokeStyle = 'rgba(178,44,48,0.85)'
    ctx.lineWidth = 14
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,200,190,0.35)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(px - prx * 0.4, py + pry * 0.44)
    ctx.bezierCurveTo(
      px - prx * 0.12,
      py + pry * 0.55,
      px + prx * 0.2,
      py + pry * 0.44,
      px + prx * 0.4,
      py + pry * 0.16,
    )
    ctx.stroke()
    // Seared protein (duck breast, sliced face to camera)
    ctx.save()
    ctx.translate(px + 6, py - 8)
    ctx.rotate(-0.12)
    ctx.shadowColor = 'rgba(40,20,10,0.55)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 10
    roundRect(ctx, -105, -50, 210, 96, 44)
    g = ctx.createLinearGradient(0, -50, 0, 46)
    g.addColorStop(0, '#7a3d18')
    g.addColorStop(0.5, '#5c2a10')
    g.addColorStop(1, '#2e1408')
    ctx.fillStyle = g
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.save()
    ctx.clip()
    // Maillard mottling
    for (let i = 0; i < 240; i++) {
      const x = -105 + rnd() * 210
      const y = -50 + rnd() * 70
      const r = 0.8 + rnd() * 2.6
      ctx.fillStyle =
        rnd() < 0.5 ? 'rgba(28,11,4,0.26)' : 'rgba(190,110,48,0.20)'
      ellipse(ctx, x, y, r * 1.6, r)
      ctx.fill()
    }
    // Sliced face: rosy centre inside a crust band
    g = ctx.createLinearGradient(0, 14, 0, 46)
    g.addColorStop(0, '#3a1a0b')
    g.addColorStop(0.18, '#a44a3f')
    g.addColorStop(0.55, '#c56a5f')
    g.addColorStop(0.9, '#8f3a30')
    g.addColorStop(1, '#3a1a0b')
    ctx.fillStyle = g
    ctx.fillRect(-105, 16, 210, 32)
    ctx.fillStyle = 'rgba(245,225,200,0.55)'
    ctx.fillRect(-105, 16, 210, 3)
    // Glaze sheen and speculars
    g = ctx.createLinearGradient(-60, -50, 40, 10)
    g.addColorStop(0, 'rgba(255,220,170,0)')
    g.addColorStop(0.5, 'rgba(255,215,160,0.20)')
    g.addColorStop(1, 'rgba(255,220,170,0)')
    ctx.fillStyle = g
    ctx.fillRect(-105, -50, 210, 66)
    ctx.restore()
    ctx.fillStyle = 'rgba(255,248,232,0.92)'
    for (const [x, y, rx, ry] of [
      [-40, -36, 14, 3],
      [6, -40, 8, 2.2],
      [42, -32, 18, 3.4],
      [-70, -22, 6, 2],
      [70, -18, 7, 2],
    ]) {
      ellipse(ctx, x, y, rx, ry, -0.08)
      ctx.fill()
    }
    ctx.restore()
    // Egg-yolk dot
    const yx = px - prx * 0.5
    const yy = py - pry * 0.18
    g = ctx.createRadialGradient(yx - 4, yy - 5, 1, yx, yy, 17)
    g.addColorStop(0, '#ffd36a')
    g.addColorStop(0.5, '#f2a516')
    g.addColorStop(1, '#c8730a')
    ellipse(ctx, yx, yy, 17, 15)
    ctx.fillStyle = g
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,240,0.9)'
    ellipse(ctx, yx - 6, yy - 6, 4, 2.4, -0.5)
    ctx.fill()
    // Emerald herb dots
    const herbs = [
      [-0.62, 0.05],
      [-0.3, -0.42],
      [0.05, -0.5],
      [0.38, -0.36],
      [0.58, -0.08],
      [0.44, 0.34],
      [-0.08, 0.66],
      [-0.48, 0.5],
      [0.2, 0.62],
      [-0.66, -0.22],
    ]
    for (const [hx, hy] of herbs) {
      const x = px + hx * prx * 0.92
      const y = py + hy * pry * 0.92
      const r = 4 + rnd() * 3.5
      ctx.fillStyle = ['#1c6a33', '#2b8a45', '#3aa356'][Math.floor(rnd() * 3)]
      ellipse(ctx, x, y, r, r * 0.85)
      ctx.fill()
      ctx.fillStyle = 'rgba(210,255,215,0.45)'
      ellipse(ctx, x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.2)
      ctx.fill()
    }
    // Low-key light: one warm source top right, falling off to the edges
    ctx.globalCompositeOperation = 'multiply'
    g = ctx.createRadialGradient(
      W * 0.58,
      sceneH * 0.32,
      W * 0.08,
      W * 0.5,
      sceneH * 0.5,
      W * 0.72,
    )
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.45, '#e2ded8')
    g.addColorStop(0.8, '#8c8a90')
    g.addColorStop(1, '#55555c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, sceneH)
    ctx.globalCompositeOperation = 'source-over'
    // Chef's hand entering from the right (skin patch), out of focus
    drawHand(ctx, W * 0.9, sceneH * 0.73)
    // Calibration strip: grey ramp and colour patches
    const sy = sceneH
    ctx.fillStyle = '#060607'
    ctx.fillRect(0, sy, W, stripH)
    const steps = 11
    const rampW = W * 0.46
    for (let i = 0; i < steps; i++) {
      const v = Math.round((i / (steps - 1)) * 255)
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(
        4 + (i * (rampW - 8)) / steps,
        sy + 6,
        (rampW - 8) / steps - 2,
        stripH - 12,
      )
    }
    const patches = [
      '#b8312f',
      '#d9772b',
      '#e3c33a',
      '#3c8f4a',
      '#2b9aa8',
      '#2f5fb8',
      '#6d42a8',
      '#b23a85',
      '#e0ac8a',
      '#8d5a3c',
    ]
    const pw = (W - rampW - 6) / patches.length
    patches.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(rampW + 2 + i * pw, sy + 6, pw - 2, stripH - 12)
    })
    ctx.restore()
    // Sensor noise, so the plate reads like a frame, not a vector
    const img = ctx.getImageData(0, 0, W, sceneH)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const n = (rnd() - 0.5) * 7
      d[i] += n
      d[i + 1] += n
      d[i + 2] += n
    }
    ctx.putImageData(img, 0, 0)
  }

  /* ------------------------------------------------------------ module */
  LN.register({
    id: 'grade',
    num: 5,
    title: 'Grade',
    short: 'Grade',
    kicker: 'COLOR',
    blurb:
      'Tune the house looks live on a test plate or your own frame, then take real .cube files and slider recipes to CapCut.',
    lede: 'Three house looks as real 33-point .cube files, tuned live on a test plate or a frame from your camera roll. Then three honest ways into CapCut Mobile: import if your build allows it, bake it into the clip here, or dial the slider recipe.',
    outputs: [
      '3 real .cube LUTs (33³)',
      'Live look lab',
      'CapCut slider recipes',
      'Bake a look into a clip',
    ],
    mount(el) {
      const L = lutApi()
      if (!L) {
        el.append(
          ui.callout(
            'warn',
            'The colour engine did not load, so the Look Lab is off. Reload the page; if it stays off, save the offline copy and open that.',
          ),
        )
        return
      }
      mountGrade(el, L)
    },
  })

  function mountGrade(el, L) {
    /* ---------------- state */
    const hasV2 = !!v2Data()
    const storedParams = LN.store.get('grade.params', {})
    const allParams = {}
    for (const id of Object.keys(L.LOOKS))
      allParams[id] = {
        ...L.defaults(id),
        ...((storedParams && storedParams[id]) || {}),
      }
    let look = LN.store.get('grade.look', 'lunar')
    if (
      !(
        look === 'base' ||
        L.LOOKS[look] ||
        (isV2(look) && hasV2 && v2Data().looks[v2Key(look)])
      )
    )
      look = 'lunar'
    let intensity = Number(LN.store.get('grade.intensity', DEFAULT_INTENSITY))
    if (!Number.isFinite(intensity)) intensity = DEFAULT_INTENSITY
    let exportSize = LN.store.get('grade.size', 33) === 17 ? 17 : 33
    let split = 0.5
    let before = false
    let table = null
    let tableSize = 33
    let tableKey = ''
    let usingFrame = false

    const paramsOf = id =>
      isV2(id) || id === 'base' ? {} : { ...allParams[id] }
    const keyOf = (id, size) => `${id}|${size}|${JSON.stringify(paramsOf(id))}`

    function tableFor(id, size) {
      if (id === 'base') return null
      if (isV2(id)) return v2Table(v2Key(id))
      return L.build(id, allParams[id], size)
    }
    function ensureTable(size) {
      if (look === 'base') {
        table = null
        tableKey = ''
        return
      }
      const sz = isV2(look) ? 33 : size
      const k = keyOf(look, sz)
      if (k === tableKey && table) return
      table = tableFor(look, sz)
      tableSize = sz
      tableKey = k
    }

    function persist() {
      LN.store.set('grade.params', allParams)
      LN.store.set('grade.look', look)
      LN.store.set('grade.intensity', intensity)
    }
    function emit() {
      const msg = { look, params: paramsOf(look), intensity }
      if (isV2(look)) msg.v2 = v2Key(look)
      LN.bus.emit('grade:params', msg)
    }
    // Read-only handle for Bake and other modules.
    LN.grade = {
      state: () => ({
        look,
        name: lookName(look),
        params: paramsOf(look),
        intensity,
      }),
      table(size = 33) {
        if (look === 'base') return null
        const sz = isV2(look) ? 33 : size
        return { table: tableFor(look, sz), size: sz }
      },
    }

    /* ---------------- preview canvas */
    const canvas = h('canvas', {
      class: 'gr-canvas',
      width: PREVIEW_LONG,
      height: PREVIEW_SHORT,
      role: 'img',
      'aria-label': 'Look preview',
    })
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let src = null
    let work = null
    let fullSrc = null // ≤1280 source for still export

    function setSource(drawFn, w, hh) {
      canvas.width = w
      canvas.height = hh
      drawFn(ctx, w, hh)
      src = ctx.getImageData(0, 0, w, hh)
      work = ctx.createImageData(w, hh)
      stage.classList.toggle('is-portrait', hh > w)
    }
    function loadScene() {
      usingFrame = false
      fullSrc = null
      setSource(drawScene, PREVIEW_LONG, PREVIEW_SHORT)
      frameNote.textContent = 'Test plate · 960 × 540'
      sceneBtn.hidden = true
      render()
    }
    async function loadFrame(file) {
      if (!file || !/^image\//.test(file.type || 'image/')) {
        LN.toast('Pick an image: a still from your camera roll.', {
          kind: 'warn',
        })
        return
      }
      let bmp
      try {
        bmp = await createImageBitmap(file)
      } catch (_e) {
        LN.toast(
          'That image could not be read. Use a JPEG or PNG from the camera roll.',
          { kind: 'err' },
        )
        return
      }
      const k1 = Math.min(1, SOURCE_LONG / Math.max(bmp.width, bmp.height))
      const fw = Math.max(1, Math.round(bmp.width * k1))
      const fh = Math.max(1, Math.round(bmp.height * k1))
      const full = h('canvas', { width: fw, height: fh })
      full.getContext('2d').drawImage(bmp, 0, 0, fw, fh)
      fullSrc = full
      const long = Math.max(fw, fh)
      const short = Math.min(fw, fh)
      const k2 = Math.min(1, PREVIEW_LONG / long, PREVIEW_SHORT / short)
      const pw = Math.max(1, Math.round(fw * k2))
      const ph = Math.max(1, Math.round(fh * k2))
      setSource((c, w, hh) => c.drawImage(full, 0, 0, w, hh), pw, ph)
      if (bmp.close) bmp.close()
      usingFrame = true
      frameNote.textContent = `Your frame · ${fw} × ${fh}`
      sceneBtn.hidden = false
      render()
      LN.toast('Frame loaded. Every look now grades your shot.')
    }

    let rafId = 0
    function render() {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        draw()
      })
    }
    function draw() {
      if (!src) return
      const W = src.width
      const H = src.height
      if (before || look === 'base' || !table) {
        ctx.putImageData(src, 0, 0)
      } else {
        work.data.set(src.data)
        L.applyToImageData(work, table, tableSize, intensity / 100)
        ctx.putImageData(work, 0, 0)
        const sx = Math.round(split * W)
        if (sx > 0) ctx.putImageData(src, 0, 0, 0, 0, sx, H)
      }
      const graded = !before && look !== 'base'
      afterTag.textContent = graded
        ? `${shortName(look)} · ${Math.round(intensity)}%`
        : before
          ? 'Before'
          : 'Base · ungraded'
      beforeTag.hidden = !graded || split < 0.12
      divider.hidden = !graded
    }

    /* ---------------- rebuilds */
    const rebuildFull = debounce(() => {
      ensureTable(33)
      render()
    }, 220)
    let lastFast = 0
    function rebuildLive() {
      const now = performance.now()
      if (now - lastFast > 70) {
        lastFast = now
        ensureTable(17)
        render()
      }
      rebuildFull()
    }

    /* ---------------- stage: canvas + split + tags */
    const beforeTag = h('span', { class: 'gr-tag gr-tag-l' }, 'Before')
    const afterTag = h('span', { class: 'gr-tag gr-tag-r' }, '')
    const knob = h('span', { class: 'gr-knob', 'aria-hidden': 'true' })
    const divider = h(
      'div',
      {
        class: 'gr-divider',
        role: 'slider',
        tabindex: '0',
        'aria-label': 'Before and after split',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': '50',
        'aria-valuetext': 'Before on the left half',
      },
      h('span', { class: 'gr-line', 'aria-hidden': 'true' }),
      knob,
    )
    const stage = h(
      'div',
      { class: 'gr-stage' },
      canvas,
      beforeTag,
      afterTag,
      divider,
    )
    function setSplit(v) {
      split = Math.min(1, Math.max(0, v))
      divider.style.left = `${(split * 100).toFixed(2)}%`
      divider.setAttribute('aria-valuenow', String(Math.round(split * 100)))
      divider.setAttribute(
        'aria-valuetext',
        split <= 0
          ? 'All after'
          : split >= 1
            ? 'All before'
            : `Before on the left ${Math.round(split * 100)}%`,
      )
      render()
    }
    divider.addEventListener('pointerdown', e => {
      e.preventDefault()
      divider.setPointerCapture(e.pointerId)
      divider.classList.add('is-drag')
      const move = ev => {
        const r = stage.getBoundingClientRect()
        setSplit((ev.clientX - r.left) / r.width)
      }
      const up = () => {
        divider.classList.remove('is-drag')
        divider.removeEventListener('pointermove', move)
        divider.removeEventListener('pointerup', up)
        divider.removeEventListener('pointercancel', up)
      }
      divider.addEventListener('pointermove', move)
      divider.addEventListener('pointerup', up)
      divider.addEventListener('pointercancel', up)
    })
    divider.addEventListener('keydown', e => {
      const step = e.shiftKey ? 0.1 : 0.02
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setSplit(split - step)
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
        setSplit(split + step)
      else if (e.key === 'Home') setSplit(0)
      else if (e.key === 'End') setSplit(1)
      else return
      e.preventDefault()
    })

    /* ---------------- look selection */
    const lookSeg = ui.seg({
      label: 'Look',
      options: LOOK_ORDER.map(id => ({
        value: id,
        label: id === 'base' ? 'Base' : L.LOOKS[id].name,
      })),
      value: isV2(look) ? null : look,
      onChange: v => selectLook(v),
    })
    const v2Seg = hasV2
      ? ui.seg({
          label: 'Runbook v2 · measured files',
          options: V2_ORDER.filter(k => v2Data().looks[k]).map(k => ({
            value: `v2:${k}`,
            label: k,
          })),
          value: isV2(look) ? look : null,
          onChange: v => selectLook(v),
        })
      : null
    const lookLine = h('p', { class: 'gr-lookline' })
    function selectLook(id) {
      look = id
      lookSeg.set(isV2(id) ? null : id)
      if (v2Seg) v2Seg.set(isV2(id) ? id : null)
      ensureTable(33)
      buildParams()
      persist()
      emit()
      render()
    }

    /* ---------------- intensity */
    const intensitySl = ui.slider({
      label: 'Intensity',
      min: 0,
      max: 100,
      step: 1,
      value: intensity,
      format: v => `${v}%`,
      onInput: v => {
        intensity = v
        render()
        persist()
        emit()
      },
    })
    intensitySl.el.classList.add('gr-intensity')
    intensitySl.el.append(
      h(
        'div',
        { class: 'gr-band', 'aria-hidden': 'true' },
        h('span', {
          class: 'gr-band-mark',
          style: {
            '--a': String(BAND[0] / 100),
            '--b': String(BAND[1] / 100),
          },
        }),
      ),
      h(
        'p',
        { class: 'gr-band-note' },
        h('span', null, '0'),
        h('b', null, `${BAND[0]}–${BAND[1]}% sweet spot`),
        h('span', null, '100'),
      ),
    )

    /* ---------------- compare controls */
    const holdBtn = h(
      'button',
      {
        type: 'button',
        class: 'ln-btn quiet small gr-hold',
        'aria-pressed': 'false',
      },
      'Hold to see before',
    )
    const setBefore = v => {
      if (before === v) return
      before = v
      holdBtn.setAttribute('aria-pressed', String(v))
      render()
    }
    holdBtn.addEventListener('pointerdown', e => {
      e.preventDefault()
      setBefore(true)
    })
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel'])
      holdBtn.addEventListener(ev, () => setBefore(false))
    holdBtn.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setBefore(true)
      }
    })
    holdBtn.addEventListener('keyup', () => setBefore(false))
    holdBtn.addEventListener('blur', () => setBefore(false))
    holdBtn.addEventListener('contextmenu', e => e.preventDefault())

    const framePick = ui.filePick({
      accept: 'image/*',
      label: 'Use my frame',
      kind: 'ghost',
      small: true,
      onFile: loadFrame,
    })
    const sceneBtn = ui.btn('Test plate', loadScene, {
      kind: 'quiet',
      small: true,
    })
    sceneBtn.hidden = true
    const stillBtn = ui.btn('Save still (.png)', saveStill, {
      kind: 'quiet',
      small: true,
    })
    const frameNote = h('span', { class: 'gr-framenote' }, '')

    async function saveStill() {
      const srcCanvas =
        fullSrc ||
        (() => {
          const c = h('canvas', { width: src.width, height: src.height })
          c.getContext('2d').putImageData(src, 0, 0)
          return c
        })()
      const c = h('canvas', {
        width: srcCanvas.width,
        height: srcCanvas.height,
      })
      const cx = c.getContext('2d', { willReadFrequently: true })
      cx.drawImage(srcCanvas, 0, 0)
      if (look !== 'base') {
        const t = LN.grade.table(33)
        const img = cx.getImageData(0, 0, c.width, c.height)
        L.applyToImageData(img, t.table, t.size, intensity / 100)
        cx.putImageData(img, 0, 0)
      }
      const blob = await new Promise(r => c.toBlob(r, 'image/png'))
      if (!blob) {
        LN.toast('The still could not be encoded.', { kind: 'err' })
        return
      }
      const name = `${LN.fmt.slug(lookName(look))}-${Math.round(intensity)}pct${usingFrame ? '' : '-test-plate'}.png`
      await LN.save({ filename: name, data: blob, mime: 'image/png' })
    }

    /* ---------------- per-look params */
    const paramsHost = h('div', { class: 'gr-params' })
    const paramsHead = h('div', { class: 'gr-params-head' })
    function buildParams() {
      paramsHost.replaceChildren()
      if (look === 'base') {
        lookLine.textContent =
          'Base is the frame as recorded. Pick a look to grade it.'
        paramsHead.replaceChildren(
          h('span', { class: 'ln-eyebrow' }, 'Look settings'),
        )
        paramsHost.append(
          ui.empty('No settings: Base is the untouched Rec.709 frame.'),
        )
        return
      }
      if (isV2(look)) {
        const d = v2Data().looks[v2Key(look)]
        lookLine.textContent = d.use
        paramsHead.replaceChildren(
          h('span', { class: 'ln-eyebrow' }, 'Look settings'),
        )
        paramsHost.append(
          ui.callout(
            'rule',
            `${d.file} is fitted to your reference reels, so it has no sliders. It expects 3200K, 1.5–2 stops under. Use Intensity to taste.`,
            'Measured file',
          ),
        )
        return
      }
      const def = L.LOOKS[look]
      lookLine.textContent = def.tagline
      paramsHead.replaceChildren(
        h('span', { class: 'ln-eyebrow' }, `${def.name} settings`),
        ui.btn('Reset look', resetLook, { kind: 'quiet', small: true }),
      )
      for (const d of def.params) {
        const sl = ui.slider({
          label: d.label,
          min: d.min,
          max: d.max,
          step: d.step,
          value: allParams[look][d.key],
          format: v => fmtParam(d, v),
          onInput: v => {
            allParams[look][d.key] = v
            rebuildLive()
            persist()
            emit()
          },
        })
        sl.el.dataset.key = d.key
        sl.el.append(h('p', { class: 'gr-help' }, d.help))
        paramsHost.append(sl.el)
      }
    }
    function resetLook() {
      if (look === 'base' || isV2(look)) return
      allParams[look] = L.defaults(look)
      intensity = DEFAULT_INTENSITY
      intensitySl.set(intensity)
      ensureTable(33)
      buildParams()
      persist()
      emit()
      render()
      LN.toast(`${lookName(look)} back to its defaults at 50%`)
    }

    /* ---------------- section 1: Look Lab */
    const lab = ui.section(
      {
        eyebrow: '01 · Look Lab',
        title: 'Taste the look before you cook with it',
        lede: 'A test plate with every colour a grade can ruin: crust, crimson sauce, herbs, yolk, flame, skin, steel and a grey ramp. Drag the split, push the intensity, then try it on a frame of your own.',
      },
      h(
        'div',
        { class: 'gr-lab' },
        h(
          'div',
          { class: 'gr-lab-view' },
          stage,
          h(
            'div',
            { class: 'gr-stage-bar' },
            frameNote,
            h('span', { class: 'gr-hint' }, 'Drag the line · arrows nudge it'),
          ),
          h(
            'div',
            { class: 'ln-row gr-tools' },
            holdBtn,
            framePick,
            sceneBtn,
            stillBtn,
          ),
        ),
        h(
          'div',
          { class: 'gr-lab-controls' },
          lookSeg.el,
          v2Seg ? v2Seg.el : null,
          lookLine,
          intensitySl.el,
          h('div', { class: 'gr-params-wrap' }, paramsHead, paramsHost),
        ),
      ),
    )

    /* ---------------- section 2: Export */
    const sizeSeg = ui.seg({
      label: 'Lattice size',
      options: [
        { value: 33, label: '33³ · standard' },
        { value: 17, label: '17³ · light' },
      ],
      value: exportSize,
      onChange: v => {
        exportSize = v
        LN.store.set('grade.size', v)
        renderFiles()
      },
    })
    const filesHost = h('div', { class: 'gr-files' })
    const packNote = h('p', { class: 'ln-small ln-muted' })

    function cubeComments(id, size) {
      const def = L.LOOKS[id]
      const p = allParams[id]
      return [
        `${def.name} - Lunar Night OS colour engine`,
        def.tagline,
        `${size}-point 3D LUT, made ${new Date().toISOString().slice(0, 10)}.`,
        'Input: Rec.709 SDR, gamma-encoded (record with 10-bit HDR off).',
        'Output: Rec.709 SDR. Use at 38-62% intensity.',
        `Params: ${Object.entries(p)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')}`,
      ]
    }
    function v2Comments(d) {
      return [
        `${d.name} - LunarNight v2 runbook, measured from the reference reels`,
        d.use,
        'Input and output: Rec.709 SDR. Expects 3200K, 1.5-2 stops under.',
      ]
    }
    function cubeOpts(id, size) {
      if (isV2(id)) {
        const d = v2Data().looks[v2Key(id)]
        return { title: d.name, comments: v2Comments(d) }
      }
      return { title: L.LOOKS[id].name, comments: cubeComments(id, size) }
    }
    function cubeText(id, size) {
      if (isV2(id)) return L.toCube(v2Table(v2Key(id)), 33, cubeOpts(id, 33))
      return L.toCube(
        L.build(id, allParams[id], size),
        size,
        cubeOpts(id, size),
      )
    }
    /** Exact .cube byte size without building the lattice: every data line
     *  is "0.000000 0.000000 0.000000\n" (27 bytes). */
    function cubeBytes(id, size) {
      const n = isV2(id) ? 33 : size
      const head =
        new Blob([L.toCube(L.identity(2), 2, cubeOpts(id, n))]).size -
        8 * 27 +
        (String(n).length - 1)
      return head + n * n * n * 27
    }

    async function saveCube(id) {
      const name = cubeName(id, isV2(id) ? 33 : exportSize)
      let text
      try {
        text = cubeText(id, exportSize)
      } catch (e) {
        LN.toast(`Could not build the LUT: ${e.message}`, { kind: 'err' })
        return
      }
      await LN.save({ filename: name, data: text, mime: 'text/plain' })
    }

    function readme(size) {
      const lines = [
        'LUNAR NIGHT OS · LUT PACK',
        `Made ${new Date().toISOString().slice(0, 10)} · ${size}-point 3D .cube files · Rec.709 in and out`,
        '',
        'WHAT IS INSIDE',
      ]
      for (const id of ['lunar', 'dream', 'vhs'])
        lines.push(
          `  ${cubeName(id, size)}  ${L.LOOKS[id].name}: ${L.LOOKS[id].tagline}`,
        )
      lines.push(
        '',
        'UNZIP ON THE PIXEL',
        '  Files by Google > Downloads > tap the zip > Extract.',
        '  The .cube files land in a folder next to the zip.',
        '',
        'INTENSITY',
        `  Use ${BAND[0]}-${BAND[1]}%. At 100% a LUT is a filter, not a grade.`,
        '  Never stack the LUT and the full slider recipe both at 100%.',
        '',
        'INPUT: Rec.709 / SDR',
        '  These LUTs expect Rec.709 SDR footage. Record with 10-bit HDR OFF',
        '  for LUT work (Pixel Camera: Video settings > 10-bit HDR > Off;',
        '  Blackmagic Camera: Color space Rec.709, HDR off).',
        '  On HDR/HLG clips the look will clip and shift.',
        '',
        'GETTING THEM INTO CAPCUT MOBILE: THREE ROUTES',
        `  A. Import. If your Adjust panel shows LUT > Import (${CAPCUT.lutMobile.path.join(' > ')}),`,
        '     import the .cube there and set the intensity. Most 2025-26 reports say',
        '     CapCut mobile cannot import custom LUTs; CapCut desktop can',
        `     (${CAPCUT.lutDesktop.path.join(' > ')}). Check your build in 60 seconds:`,
        '     tap a clip > Adjust, swipe the whole row, look for a LUT or + tile.',
        '  B. Bake. Lunar Night OS > Grade > Bake the look into a clip. Or bake at',
        `     capture: Blackmagic Camera > ${PIXEL.bmLut.join(' > ')}, then`,
        '     Record LUT to Clip ON (use LunarNight_v2_Soft for a lighter bake).',
        '  C. Sliders. Lunar Night OS > Grade > Slider recipes: Adjust, HSL,',
        '     Curves and effects, number by number. Free, no import needed.',
        '',
        'LAYER ORDER',
        '  1 Exposure / white balance fixes',
        `  2 LUT at ${BAND[0]}-${BAND[1]}% or a baked clip`,
        '  3 Creative Adjust / HSL',
        '  4 Grain, halation, VHS overlays (Forge plates on Screen / Overlay)',
        '  5 Titles / HUD',
        '',
        'SETTINGS BAKED INTO THESE FILES',
      )
      for (const id of ['lunar', 'dream', 'vhs'])
        lines.push(
          `  ${L.LOOKS[id].name}: ${L.LOOKS[id].params
            .map(
              d =>
                `${d.label} ${fmtParam(d, allParams[id][d.key]).replace(/−/g, '-')}`,
            )
            .join(', ')}`,
        )
      lines.push('')
      return lines.join('\n')
    }

    async function savePack() {
      packBtn.disabled = true
      try {
        const files = []
        for (const id of ['lunar', 'dream', 'vhs'])
          files.push({
            name: cubeName(id, exportSize),
            data: cubeText(id, exportSize),
          })
        files.push({ name: 'README.txt', data: readme(exportSize) })
        const blob = await LN.zip(files)
        const name = `LunarNight_LUT_Pack_${exportSize}.zip`
        const r = await LN.save({
          filename: name,
          data: blob,
          mime: 'application/zip',
        })
        if (r === 'saved')
          packNote.textContent = `Last saved: ${name} · ${LN.fmt.bytes(blob.size)}`
      } catch (e) {
        LN.toast(`The pack could not be built: ${e.message}`, { kind: 'err' })
      } finally {
        packBtn.disabled = false
      }
    }
    async function saveV2Pack() {
      const d = v2Data()
      const files = V2_ORDER.filter(k => d.looks[k]).map(k => ({
        name: d.looks[k].file,
        data: cubeText(`v2:${k}`, 33),
      }))
      files.push({
        name: 'README.txt',
        data: [
          'LUNARNIGHT v2 · RUNBOOK LUTS (33-point, Rec.709 in and out)',
          '',
          ...V2_ORDER.filter(k => d.looks[k]).map(
            k => `  ${d.looks[k].file}: ${d.looks[k].use}`,
          ),
          '',
          'Unzip: Files by Google > Downloads > tap the zip > Extract.',
          `Blackmagic Camera: ${PIXEL.bmLut.join(' > ')}. Display LUT ON.`,
          'Record LUT to Clip ON when you edit in CapCut (it cannot load .cube files);',
          'use the Soft file for a lighter bake and finish the crush with Shadow.',
          'Shoot 3200K (2800K for the blue variant), 1.5-2 stops under, HDR off.',
          '',
        ].join('\n'),
      })
      const blob = await LN.zip(files)
      await LN.save({
        filename: 'LunarNight_v2_Runbook_LUTs.zip',
        data: blob,
        mime: 'application/zip',
      })
    }

    function fileRow(id) {
      const n = isV2(id) ? 33 : exportSize
      const name = cubeName(id, n)
      return h(
        'li',
        { class: 'gr-file' },
        h(
          'div',
          { class: 'gr-file-meta' },
          h('b', null, name),
          h(
            'span',
            null,
            `${lookName(id)} · ${n}³ · ${LN.fmt.bytes(cubeBytes(id, n))}`,
          ),
        ),
        ui.btn('Save .cube', () => saveCube(id), {
          kind: 'quiet',
          small: true,
          aria: `Save ${name}`,
        }),
      )
    }
    function renderFiles() {
      const house = h(
        'ul',
        { class: 'gr-filelist', 'aria-label': 'House look files' },
        ['lunar', 'dream', 'vhs'].map(fileRow),
      )
      const v2 = hasV2
        ? h(
            'ul',
            { class: 'gr-filelist', 'aria-label': 'Runbook v2 files' },
            V2_ORDER.filter(k => v2Data().looks[k]).map(k =>
              fileRow(`v2:${k}`),
            ),
          )
        : null
      filesHost.replaceChildren(
        h('h3', { class: 'ln-h3' }, 'House looks · your current settings'),
        house,
        v2
          ? h('h3', { class: 'ln-h3' }, 'Runbook v2 · fixed, always 33³')
          : null,
        v2,
      )
    }
    const refreshFiles = debounce(renderFiles, 400)
    LN.bus.on('grade:params', refreshFiles)

    const packBtn = ui.btn('Download LUT pack (.zip)', savePack, {
      block: true,
    })
    const exportSec = ui.section(
      {
        eyebrow: '02 · Export',
        title: 'Real .cube files, built from your settings',
        lede: 'The pack carries all three house looks exactly as you tuned them above, plus a README with the unzip steps, the intensity band and the CapCut routes.',
      },
      h(
        'div',
        { class: 'ln-split gr-export' },
        h(
          'div',
          { class: 'ln-card gr-pack' },
          h('span', { class: 'ln-eyebrow' }, 'The pack'),
          h('p', { class: 'gr-pack-title' }, '3 looks · README.txt · one zip'),
          sizeSeg.el,
          packBtn,
          hasV2
            ? ui.btn('Runbook v2 LUTs (.zip)', saveV2Pack, {
                kind: 'ghost',
                block: true,
              })
            : null,
          packNote,
          h(
            'div',
            { class: 'gr-unzip' },
            h('span', { class: 'ln-small ln-muted' }, 'Unzip on the Pixel'),
            ui.path(PIXEL.extract),
          ),
          ui.callout(
            'tip',
            h(
              'span',
              null,
              'Record with 10-bit HDR off. These LUTs expect Rec.709 SDR; HDR clips clip and shift. Use 33³ unless an app refuses it.',
            ),
          ),
        ),
        h(
          'div',
          { class: 'ln-stack' },
          filesHost,
          ui.callout(
            'rule',
            'Inside claude.ai each single file arrives zipped (the viewer cannot hand over a bare .cube). Extract it the same way as the pack. The offline copy saves bare .cube files.',
            'One file at a time',
          ),
        ),
      ),
    )
    renderFiles()

    /* ---------------- section 3: Routes */
    const jumpBtn = (label, id) =>
      ui.btn(
        label,
        () => {
          const t = document.getElementById(id)
          if (t)
            t.scrollIntoView({
              behavior: LN.reducedMotion() ? 'auto' : 'smooth',
              block: 'start',
            })
        },
        { kind: 'ghost', small: true },
      )
    const routeCard = (tag, title, kids, kind) =>
      h(
        'article',
        { class: `ln-card gr-route ${kind || ''}`.trim() },
        h('span', { class: 'gr-route-tag' }, tag),
        h('h3', null, title),
        kids,
      )
    const routesSec = ui.section(
      {
        eyebrow: '03 · Into CapCut Mobile',
        title: 'Three honest routes',
        lede: 'CapCut Mobile and LUT files do not reliably meet. Pick the route your build allows; B and C always work.',
      },
      h(
        'div',
        { class: 'ln-grid gr-routes' },
        routeCard(
          'Route A',
          'Import, if your build has it',
          h(
            'div',
            { class: 'ln-stack' },
            h(
              'p',
              { class: 'ln-prose' },
              'If your Adjust panel shows a LUT tile with Import, bring the .cube in there and set its intensity to 38–62%.',
            ),
            ui.path(CAPCUT.lutMobile.path),
            ui.callout(
              'verify',
              h(
                'span',
                null,
                'Most 2025–26 reports say CapCut Mobile cannot import custom LUTs, while CapCut desktop can (',
                ui.path(CAPCUT.lutDesktop.path),
                '). Check in 60 seconds: tap a clip, tap Adjust, swipe the whole row of tools and look for LUT or a + tile. Then deselect everything, tap Filters and look for Import. Nothing there means no import in your build.',
              ),
            ),
          ),
        ),
        routeCard(
          'Route B',
          'Bake it into the clip',
          h(
            'div',
            { class: 'ln-stack' },
            h(
              'p',
              { class: 'ln-prose' },
              'Grade the clip right here on the phone and bring CapCut a finished MP4. Or bake at capture: Blackmagic Camera loads the .cube and records it into the clip.',
            ),
            ui.path(PIXEL.bmLut),
            h(
              'p',
              { class: 'ln-small ln-muted' },
              'Then Display LUT on and Record LUT to Clip on. LunarNight_v2_Soft leaves room to finish the crush in CapCut.',
            ),
            jumpBtn('Go to Bake', 'gr-bake'),
          ),
          'is-sure',
        ),
        routeCard(
          'Route C',
          'Dial the slider recipe',
          h(
            'div',
            { class: 'ln-stack' },
            h(
              'p',
              { class: 'ln-prose' },
              'Free on every build. Adjust, HSL and Curves rebuild each look number by number. Put them on an adjustment layer so one change covers the reel.',
            ),
            ui.path(CAPCUT.adjustLayer.path),
            h(
              'p',
              { class: 'ln-small ln-muted' },
              'Per clip instead: ',
              ui.path(CAPCUT.adjustClip.path),
              ' then ',
              ui.path(CAPCUT.applyAll.path),
              '.',
            ),
            jumpBtn('Go to recipes', 'gr-recipes'),
          ),
          'is-sure',
        ),
      ),
    )

    /* ---------------- section 4: Slider recipes */
    function adjustTable(rows) {
      return h(
        'div',
        { class: 'gr-adjust', role: 'table', 'aria-label': 'Adjust sliders' },
        rows.map(([label, v]) => {
          const two = TWO_SIDED.has(label)
          const pct = Math.min(1, Math.abs(v) / 50) * 50
          return h(
            'div',
            { class: 'gr-adj-row', role: 'row' },
            h(
              'span',
              { class: 'gr-adj-k', role: 'cell' },
              label === 'Tint' ? CAPCUT.tintLabel : label,
            ),
            h(
              'span',
              {
                class: `gr-adj-bar ${two ? 'two' : 'one'}`,
                role: 'presentation',
                style: two
                  ? {
                      '--l': `${v < 0 ? 50 - pct : 50}%`,
                      '--w': `${pct}%`,
                    }
                  : { '--l': '0%', '--w': `${Math.min(100, Math.abs(v))}%` },
              },
              h('i', null),
            ),
            h(
              'b',
              {
                class: `gr-adj-v ln-num ${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}`,
                role: 'cell',
              },
              signed(v),
            ),
          )
        }),
      )
    }
    function hslTable(rows) {
      return ui.table(
        ['Colour', 'Hue', 'Sat', 'Light'],
        rows.map(([c, hu, sa, li]) => [
          h(
            'span',
            { class: 'gr-swatch-cell' },
            h('i', {
              class: 'gr-swatch',
              style: { background: HSL_SWATCH[c] },
            }),
            c,
          ),
          h('span', { class: hu == null ? 'ln-faint' : '' }, signed(hu)),
          h('span', { class: sa == null ? 'ln-faint' : '' }, signed(sa)),
          h('span', { class: li == null ? 'ln-faint' : '' }, signed(li)),
        ]),
        { label: 'HSL values' },
      )
    }
    function curvePlot(rec) {
      const measured = greyAxis(rec.lut, paramsOf(rec.lut))
      const pts =
        rec.curve ||
        [0, 64, 128, 192, 255].map(x => {
          const i = Math.round((x / 255) * (measured.length - 1))
          return [x, Math.round(measured[i][1])]
        })
      const grid = []
      for (let v = 0; v <= 256; v += 32) {
        const x = Math.min(v, 255)
        const major = v % 64 === 0
        grid.push(
          s('line', {
            x1: x,
            y1: 0,
            x2: x,
            y2: 255,
            class: major ? 'g-major' : 'g-minor',
          }),
          s('line', {
            x1: 0,
            y1: 255 - x,
            x2: 255,
            y2: 255 - x,
            class: major ? 'g-major' : 'g-minor',
          }),
        )
      }
      const svg = s(
        'svg',
        {
          viewBox: '-14 -6 276 276',
          class: 'gr-curve',
          role: 'img',
          'aria-label': `Curve for ${rec.name}: points ${pts.map(p => `(${p[0]}, ${p[1]})`).join(' ')}`,
        },
        s('rect', { x: 0, y: 0, width: 255, height: 255, class: 'g-bg' }),
        grid,
        s('line', { x1: 0, y1: 255, x2: 255, y2: 0, class: 'g-id' }),
        s('polyline', { points: polyline(measured), class: 'g-measured' }),
        rec.curve
          ? s('polyline', {
              points: polyline(monotonePath(rec.curve)),
              class: 'g-curve',
            })
          : null,
        pts.map(p =>
          s('circle', {
            cx: p[0],
            cy: 255 - p[1],
            r: 4.5,
            class: rec.curve ? 'g-pt' : 'g-pt measured',
          }),
        ),
        [0, 128, 255].map(v =>
          s('text', { x: v, y: 268, class: 'g-axis' }, String(v)),
        ),
        [128, 255].map(v =>
          s('text', { x: -4, y: 258 - v, class: 'g-axis end' }, String(v)),
        ),
      )
      return h(
        'figure',
        { class: 'gr-fig' },
        svg,
        h(
          'figcaption',
          null,
          h(
            'b',
            { class: 'ln-num' },
            pts.map(p => `(${p[0]}, ${p[1]})`).join('  '),
          ),
          h(
            'span',
            null,
            rec.curve
              ? 'Solid: the recipe points. Dashed: the .cube grey axis at your current settings.'
              : 'No curve in the recipe. These points trace the .cube grey axis (dashed): add them in Curves if you skip the LUT.',
          ),
        ),
      )
    }
    function wheel(rec) {
      const measured = !rec.split
      const tone = rec.split || measureTone(rec.lut, paramsOf(rec.lut))
      const R = 100
      const segs = []
      for (let i = 0; i < 72; i++) {
        const a0 = ((i * 5 - 90) * Math.PI) / 180
        const a1 = (((i + 1) * 5 - 90 + 0.6) * Math.PI) / 180
        const p = (a, r) =>
          `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`
        segs.push(
          s('path', {
            d: `M${p(a0, R)} A${R},${R} 0 0 1 ${p(a1, R)} L${p(a1, R - 12)} A${R - 12},${R - 12} 0 0 0 ${p(a0, R - 12)} Z`,
            fill: `hsl(${i * 5}, 58%, 52%)`,
          }),
        )
      }
      const marker = (t, cls, label) => {
        const a = ((t.hue - 90) * Math.PI) / 180
        const r = t.amount < 2 ? 0 : Math.min(1, t.amount / 50) * (R - 18)
        const x = r * Math.cos(a)
        const y = r * Math.sin(a)
        return s(
          'g',
          { class: `w-mark ${cls}` },
          s('line', { x1: 0, y1: 0, x2: x, y2: y }),
          s('circle', {
            cx: x,
            cy: y,
            r: 8,
            fill: `hsl(${t.hue}, 60%, ${cls === 'sh' ? 42 : 66}%)`,
          }),
          s('text', { x, y: y + 3.5 }, label),
        )
      }
      const svg = s(
        'svg',
        {
          viewBox: '-112 -112 224 224',
          class: 'gr-wheel',
          role: 'img',
          'aria-label': `Split tone for ${rec.name}: shadows hue ${Math.round(tone.shadows.hue)} at ${tone.shadows.amount}, highlights hue ${Math.round(tone.highlights.hue)} at ${tone.highlights.amount}`,
        },
        segs,
        s('circle', { r: R - 13, class: 'w-disc' }),
        [0.25, 0.5, 0.75].map(k =>
          s('circle', { r: (R - 18) * k, class: 'w-ring' }),
        ),
        s('line', { x1: -(R - 13), y1: 0, x2: R - 13, y2: 0, class: 'w-ring' }),
        s('line', { x1: 0, y1: -(R - 13), x2: 0, y2: R - 13, class: 'w-ring' }),
        marker(tone.shadows, 'sh', 'S'),
        marker(tone.highlights, 'hi', 'H'),
      )
      const row = (k, t) =>
        h(
          'li',
          null,
          h('i', {
            class: 'gr-swatch',
            style: {
              background: `hsl(${t.hue}, 60%, ${k === 'Shadows' ? 42 : 66}%)`,
            },
          }),
          h('span', null, k),
          h(
            'b',
            { class: 'ln-num' },
            measured
              ? t.amount < 2
                ? 'neutral · 0'
                : `hue ${Math.round(t.hue)}° · ${t.amount}`
              : `${t.name} · ${t.amount}`,
          ),
        )
      return h(
        'figure',
        { class: 'gr-fig' },
        svg,
        h(
          'figcaption',
          null,
          h(
            'ul',
            { class: 'gr-tone' },
            row('Shadows', tone.shadows),
            row('Highlights', tone.highlights),
          ),
          h(
            'span',
            null,
            measured
              ? 'Measured from the .cube: where it pushes dark and bright greys (amount is saturation × 100). No split-tone slider move in the recipe.'
              : 'Distance from the centre is the amount. If your build has no split tone, get the same lean with Temp and the Blue/Orange HSL rows.',
          ),
        ),
      )
    }
    function recipeText(rec) {
      const out = [
        `${rec.name.toUpperCase()} · CapCut Mobile slider recipe`,
        rec.sub,
        '',
        `ADJUST (${CAPCUT.adjustClip.path.join(' > ')})`,
      ]
      for (const [k, v] of rec.adjust) out.push(`  ${k}: ${asciiSigned(v)}`)
      if (rec.hsl) {
        out.push('', `HSL (${CAPCUT.hsl.path.join(' > ')})  hue / sat / light`)
        for (const [c, hu, sa, li] of rec.hsl)
          if (hu != null || sa != null || li != null)
            out.push(
              `  ${c}: ${asciiSigned(hu)} / ${asciiSigned(sa)} / ${asciiSigned(li)}`,
            )
      }
      if (rec.curve)
        out.push(
          '',
          `CURVES (${CAPCUT.curves.path.join(' > ')}), white/luma channel`,
          `  ${rec.curve.map(p => `(${p[0]},${p[1]})`).join(' ')}`,
        )
      if (rec.split)
        out.push(
          '',
          'SPLIT TONE',
          `  Shadows: ${rec.split.shadows.name}, intensity ${rec.split.shadows.amount}`,
          `  Highlights: ${rec.split.highlights.name}, intensity ${rec.split.highlights.amount}`,
        )
      if (rec.effects.length) {
        out.push('', `EFFECTS (${CAPCUT.effects.path.join(' > ')})`)
        for (const [n, v] of rec.effects) out.push(`  ${n}: ${v}`)
      }
      if (rec.overlay)
        out.push(
          '',
          `OVERLAY (${CAPCUT.overlay.path.join(' > ')})`,
          `  ${rec.overlay.what}, Blend ${rec.overlay.blend} at ${rec.overlay.opacity}%`,
        )
      if (rec.notes.length) {
        out.push('', 'NOTES')
        for (const n of rec.notes) out.push(`  - ${n}`)
      }
      out.push(
        '',
        `Rule: never stack the LUT and this full recipe both at 100%. With the LUT at ${BAND[0]}-${BAND[1]}%, run the recipe at about half strength.`,
      )
      return out.join('\n')
    }
    function recipePanel(rec, host) {
      const block = (title, ...kids) =>
        h(
          'div',
          { class: 'gr-rblock' },
          h('h4', { class: 'gr-rblock-h' }, title),
          ...kids,
        )
      const effects = rec.effects.length
        ? block(
            'Effects',
            ui.path(CAPCUT.effects.path),
            h(
              'ul',
              { class: 'gr-fx' },
              rec.effects.map(([n, v]) =>
                h('li', null, h('b', null, n), h('span', null, v)),
              ),
            ),
            rec.overlay
              ? h(
                  'p',
                  { class: 'ln-small' },
                  'Plus the ',
                  h('a', { href: '#forge' }, rec.overlay.what),
                  ': ',
                  ui.path(CAPCUT.overlay.path),
                  ' then ',
                  ui.path([...CAPCUT.blend.path, rec.overlay.blend]),
                  ` at ${rec.overlay.opacity}% opacity.`,
                )
              : null,
            ui.callout(
              'verify',
              'CapCut renames and regroups effects between builds. Search the panel for the plain word (glow, grain, VHS, scan, chromatic, jitter) and skip anything with a Pro badge: it can block a free export.',
            ),
          )
        : null
      host.append(
        h(
          'div',
          { class: 'gr-recipe' },
          h(
            'header',
            { class: 'gr-recipe-head' },
            h(
              'div',
              null,
              h('h3', { class: 'gr-recipe-name' }, rec.name),
              h('p', { class: 'ln-muted' }, rec.sub),
            ),
            ui.btn(
              'Copy recipe',
              () =>
                LN.copy(recipeText(rec), {
                  label: `${rec.name} recipe copied`,
                }),
              {
                kind: 'ghost',
                small: true,
              },
            ),
          ),
          h(
            'div',
            { class: 'gr-recipe-grid' },
            block(
              'Adjust',
              ui.path(CAPCUT.adjustClip.path),
              adjustTable(rec.adjust),
            ),
            rec.hsl
              ? block('HSL', ui.path(CAPCUT.hsl.path), hslTable(rec.hsl))
              : block(
                  'HSL',
                  h(
                    'p',
                    { class: 'ln-small ln-muted' },
                    'Leave HSL at 0 for this look. The LUT or the Adjust row carries the colour.',
                  ),
                ),
            block('Curves', curvePlot(rec)),
            block('Split tone', wheel(rec)),
            effects,
          ),
          rec.notes.length
            ? h(
                'ul',
                { class: 'gr-notes' },
                rec.notes.map(n => h('li', null, n)),
              )
            : null,
        ),
      )
    }
    const recipeTabs = ui.tabs(
      RECIPES.filter(r => r.id !== 'v2' || hasV2).map(rec => ({
        id: rec.id,
        label: rec.name,
        render: host => recipePanel(rec, host),
      })),
      { key: 'grade-recipe' },
    )
    const recipesSec = ui.section(
      {
        id: 'gr-recipes',
        eyebrow: '04 · Slider recipes',
        title: 'Every look, number by number',
        lede: 'Route C. Values are CapCut Mobile slider positions (two-sided sliders run about −50 to +50). Dreamcore and VHS are starting points: trim to the footage.',
      },
      ui.callout(
        'verify',
        h(
          'span',
          null,
          'Slider labels move between builds: Tint may read Hue, Exposure may be missing (use Brightness), and Split tone may not exist on mobile (',
          ui.path(CAPCUT.splitTone.path),
          '). HSL or Curves may carry a Pro badge in your build.',
        ),
      ),
      recipeTabs.el,
    )

    /* ---------------- section 5: Layer order */
    const layerSec = ui.section(
      {
        eyebrow: '05 · Layer order',
        title: 'Build the stack from the bottom',
        lede: 'CapCut stacks bottom to top. Fix first, look second, taste third, texture fourth, words last.',
      },
      h(
        'div',
        { class: 'gr-layers-wrap' },
        h('span', { class: 'gr-layer-axis' }, 'Top · seen last'),
        h(
          'ol',
          { class: 'gr-layers', 'aria-label': 'Layer stack, top to bottom' },
          LAYERS.map(l =>
            h(
              'li',
              { class: `gr-layer l${l.n}` },
              h('span', { class: 'gr-layer-n ln-num' }, String(l.n)),
              h('div', null, h('b', null, l.name), h('span', null, l.note)),
            ),
          ),
        ),
        h('span', { class: 'gr-layer-axis' }, 'Bottom · applied first'),
      ),
      ui.callout(
        'rule',
        `Never stack the LUT and the full slider recipe both at 100%. LUT at ${BAND[0]}–${BAND[1]}%, then the recipe at about half its numbers, or the recipe alone at full.`,
      ),
      h(
        'p',
        { class: 'ln-small ln-muted' },
        'Forge plates go on layer 4: ',
        ui.path(CAPCUT.overlay.path),
        ' then ',
        ui.path(CAPCUT.blend.path),
        ' on Screen or Overlay, 20–45% opacity.',
      ),
    )

    /* ---------------- section 6: Bake */
    const bakeHost = h('div', { class: 'gr-bake-host' })
    const bakeSec = ui.section(
      {
        id: 'gr-bake',
        eyebrow: '06 · Bake',
        title: 'Bake the look into a clip',
        lede: 'Route B. The look you set in the Lab is burned into the pixels, so CapCut only has to cut.',
      },
      bakeHost,
    )
    try {
      if (LN.bake) LN.bake.mount(bakeHost)
      else
        bakeHost.append(
          ui.callout(
            'tip',
            h(
              'span',
              null,
              'The clip baker did not load in this copy. Bake at capture instead: Blackmagic Camera ',
              ui.path(PIXEL.bmLut),
              ' with Record LUT to Clip on, or use the slider recipe.',
            ),
          ),
        )
    } catch (e) {
      console.error('[grade] bake mount failed', e)
      bakeHost.append(
        h(
          'div',
          { class: 'ln-fail' },
          `The baker failed to load: ${e.message}`,
        ),
      )
    }

    el.append(lab, exportSec, routesSec, recipesSec, layerSec, bakeSec)

    /* ---------------- first frame */
    setSplit(0.5)
    loadScene()
    ensureTable(33)
    buildParams()
    draw()
    emit()
  }
})()
