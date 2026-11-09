/* modules/forge-motion.js — Motion Forge, a tab inside Forge.
   The phone-only version of "AI writes Remotion code, the code becomes motion graphics":
   Fable 5.1 writes a declarative SCENE as JSON; this module checks it, plays it on a canvas
   and renders it frame by frame to MP4 with LN.media.renderCanvasVideo.
   JSON is the whole interface. A scene is data: nothing in it is ever evaluated as code.
   LN.forgeMotion = { mount(el), renderScene(ctx, scene, t), validateScene(scene),
                      templates, buildPrompt(idea), stringify(scene), flags } */
;(() => {
  const { h, ui } = LN
  const { clamp, lerp } = LN.math

  /* ============================================================ scene schema v1 */
  const MAX_DUR = 20 // the validator's limit, seconds
  const ASK_DUR = 15 // what Fable 5.1 is asked to stay under
  const MAX_LAYERS = 60
  const TYPES = [
    'text',
    'rect',
    'circle',
    'line',
    'grain',
    'leak',
    'scanlines',
    'counter',
    'glow',
  ]
  const REVEALS = [
    'none',
    'typewriter',
    'tracking-in',
    'blur-in',
    'mask-up',
    'word-by-word',
  ]
  const TEXT_ONLY = new Set(['typewriter', 'tracking-in', 'word-by-word'])
  const ANCHOR = {
    center: [0.5, 0.5],
    top: [0.5, 0],
    bottom: [0.5, 1],
    left: [0, 0.5],
    right: [1, 0.5],
    'top-left': [0, 0],
    'top-right': [1, 0],
    'bottom-left': [0, 1],
    'bottom-right': [1, 1],
  }
  const EASE_NAMES = [
    'linear',
    'inQuad',
    'outQuad',
    'inOutQuad',
    'inCubic',
    'outCubic',
    'inOutCubic',
    'inExpo',
    'outExpo',
    'inOutExpo',
    'outBack',
    'spring',
    'steps(n)',
  ]
  const SCENE_KEYS = [
    'version',
    'name',
    'width',
    'height',
    'fps',
    'duration',
    'background',
    'layers',
  ]
  const LAYER_KEYS = [
    'type',
    'start',
    'end',
    'props',
    'keys',
    'reveal',
    'revealDur',
  ]
  const BG = { black: '#000000', green: '#00FF00', obsidian: '#08080A' }
  const LUNAR = {
    obsidian: '#08080A',
    silver: '#C8D0DC',
    moon: '#E8ECF2',
    amber: '#E5A93C',
    crimson: '#9E2A2B',
    bone: '#F4F1EA',
  }
  const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

  /* Every prop: kind, limits, whether keys may animate it, and its plain-words meaning.
     The same table feeds the validator, the Scene format panel and the Fable 5.1 prompt. */
  const SPEC = {
    text: {
      k: 'str',
      max: 400,
      doc: 'The words. "\\n" starts a new line. ★ and ☆ draw as clean vector stars.',
    },
    font: {
      k: 'font',
      doc: '"display" (Instrument Serif), "serif-italic" (Cormorant Garamond italic), "mono" (JetBrains Mono), or a family name from the list below.',
    },
    size: {
      k: 'num',
      min: 0.5,
      max: 1200,
      key: true,
      doc: 'Font size in px. On grain it is the grain size; on scanlines, the line spacing.',
    },
    weight: { k: 'int', min: 100, max: 900, doc: 'Font weight, 100 to 900.' },
    tracking: {
      k: 'num',
      min: -0.2,
      max: 2,
      key: true,
      doc: 'Letter-spacing in em: 0.3 adds 30% of the font size between letters.',
    },
    color: {
      k: 'color',
      key: true,
      doc: 'Fill colour: "#RRGGBB", "#RGB" or "none".',
    },
    stroke: {
      k: 'color',
      key: true,
      doc: 'Outline colour, or "none" (the default).',
    },
    align: {
      k: 'enum',
      values: ['left', 'center', 'right'],
      doc: 'Line alignment inside a text block. Defaults to the anchor side.',
    },
    x: {
      k: 'num',
      min: -20000,
      max: 20000,
      key: true,
      unit: true,
      doc: 'Where the anchor sits across the frame. −1 to 1 is a fraction of the width (0.5 = centre); any other number is px from the left.',
    },
    y: {
      k: 'num',
      min: -20000,
      max: 20000,
      key: true,
      unit: true,
      doc: 'Where the anchor sits down the frame (0 = top), same units as x.',
    },
    anchor: {
      k: 'enum',
      values: Object.keys(ANCHOR),
      doc: 'Which point of the layer sits on x, y: center, top, bottom, left, right, top-left, top-right, bottom-left or bottom-right.',
    },
    w: {
      k: 'num',
      min: -20000,
      max: 20000,
      key: true,
      unit: true,
      doc: 'Width of a rect, line or oval glow: −1 to 1 is a fraction of the frame width; any other number is px.',
    },
    h: {
      k: 'num',
      min: -20000,
      max: 20000,
      key: true,
      unit: true,
      doc: 'Height, same units (fraction of the frame height, or px). A line with h 0 is horizontal.',
    },
    radius: {
      k: 'num',
      min: 0,
      max: 8000,
      key: true,
      doc: 'Circle or glow radius, rect corner radius, or leak size, in px.',
    },
    lineWidth: {
      k: 'num',
      min: 0,
      max: 400,
      key: true,
      doc: 'Thickness of strokes, lines, outline stars and scanlines, in px.',
    },
    opacity: { k: 'num', min: 0, max: 1, key: true, doc: '0 to 1.' },
    blur: {
      k: 'num',
      min: 0,
      max: 400,
      key: true,
      doc: 'Gaussian blur in px.',
    },
    glow: {
      k: 'num',
      min: 0,
      max: 1,
      key: true,
      doc: 'Halation, 0 to 1: a tight glow in the layer colour over a wider, warmer under-glow.',
    },
    maxWidth: {
      k: 'num',
      min: 0,
      max: 20000,
      key: true,
      unit: true,
      doc: 'Text wraps at this width: a fraction of the frame width, or px.',
    },
    lineHeight: {
      k: 'num',
      min: 0.5,
      max: 4,
      key: true,
      doc: 'Line spacing as a multiple of size (default 1.15).',
    },
    from: { k: 'num', min: -1e9, max: 1e9, doc: 'Counter start value.' },
    to: { k: 'num', min: -1e9, max: 1e9, doc: 'Counter end value.' },
    decimals: {
      k: 'int',
      min: 0,
      max: 4,
      doc: 'Counter digits after the point, 0 to 4.',
    },
    pad: {
      k: 'int',
      min: 0,
      max: 8,
      doc: 'Counter: zero-pad the whole part to this many digits (3 shows 42 as 042).',
    },
    prefix: {
      k: 'str',
      max: 60,
      doc: 'Counter text before the number, e.g. "BATCH ".',
    },
    suffix: {
      k: 'str',
      max: 60,
      doc: 'Counter text after the number, e.g. " °C".',
    },
  }
  const TEXT_COMMON = [
    'font',
    'size',
    'weight',
    'tracking',
    'color',
    'align',
    'x',
    'y',
    'anchor',
    'opacity',
    'blur',
    'glow',
  ]
  const TYPE_INFO = {
    text: {
      props: [
        'text',
        ...TEXT_COMMON,
        'maxWidth',
        'lineHeight',
        'stroke',
        'lineWidth',
      ],
      doc: 'Type: serif titles, mono data.',
    },
    counter: {
      props: [
        'from',
        'to',
        'decimals',
        'pad',
        'prefix',
        'suffix',
        ...TEXT_COMMON,
      ],
      doc: 'A number that counts from → to over revealDur (default 1.6 s). Digits stay locked in place while it counts.',
    },
    rect: {
      props: [
        'x',
        'y',
        'w',
        'h',
        'anchor',
        'radius',
        'color',
        'stroke',
        'lineWidth',
        'opacity',
        'blur',
        'glow',
      ],
      doc: 'A box or frame: color fills it, stroke outlines it.',
    },
    circle: {
      props: [
        'x',
        'y',
        'radius',
        'color',
        'stroke',
        'lineWidth',
        'opacity',
        'blur',
        'glow',
      ],
      doc: 'A dot or ring centred on x, y.',
    },
    line: {
      props: [
        'x',
        'y',
        'w',
        'h',
        'anchor',
        'color',
        'lineWidth',
        'opacity',
        'blur',
        'glow',
      ],
      doc: 'A rule across its w × h box: h 0 is horizontal, w 0 is vertical.',
    },
    glow: {
      props: ['x', 'y', 'radius', 'w', 'h', 'color', 'opacity'],
      doc: 'A soft bloom of light. Set w and h for an oval.',
    },
    leak: {
      props: ['x', 'y', 'radius', 'color', 'opacity'],
      doc: 'A slow light leak drifting in near x, y. Seeded, so every render is identical.',
    },
    grain: {
      props: ['size', 'color', 'opacity'],
      doc: 'Film grain over the whole frame, new each frame, seeded.',
    },
    scanlines: {
      props: ['size', 'lineWidth', 'color', 'opacity'],
      doc: 'VHS raster lines. The default colour is the background, so they slice through the type.',
    },
  }
  const REVEAL_DOC = {
    none: 'on from its start.',
    typewriter:
      'types on letter by letter behind a cursor (text and counter only).',
    'tracking-in':
      'letters close in from wide spacing as they fade up (text and counter only).',
    'blur-in': 'pulls into focus as it fades up.',
    'mask-up': 'each line rises out of a hidden slot.',
    'word-by-word': 'words fade up one after another (text and counter only).',
  }
  // Friendly hints for props people (and models) often reach for.
  const ALIAS = {
    colour: 'color',
    fill: 'color',
    fontSize: 'size',
    fontFamily: 'font',
    fontWeight: 'weight',
    letterSpacing: 'tracking',
    textAlign: 'align',
    alignment: 'align',
    alpha: 'opacity',
    width: 'w',
    height: 'h',
    strokeWidth: 'lineWidth',
    thickness: 'lineWidth',
    content: 'text',
    value: 'to',
    r: 'radius',
    left: 'x',
    top: 'y',
  }
  const DEFAULTS = {
    text: {
      text: '',
      font: 'display',
      size: 72,
      tracking: 0,
      color: LUNAR.silver,
      x: 0.5,
      y: 0.5,
      anchor: 'center',
      opacity: 1,
      blur: 0,
      glow: 0,
      lineHeight: 1.15,
      stroke: 'none',
    },
    counter: {
      from: 0,
      to: 100,
      decimals: 0,
      pad: 0,
      prefix: '',
      suffix: '',
      font: 'mono',
      size: 96,
      tracking: 0,
      color: LUNAR.silver,
      x: 0.5,
      y: 0.5,
      anchor: 'center',
      opacity: 1,
      blur: 0,
      glow: 0,
    },
    rect: {
      x: 0.5,
      y: 0.5,
      w: 0.5,
      h: 0.1,
      anchor: 'center',
      radius: 0,
      color: LUNAR.silver,
      stroke: 'none',
      lineWidth: 2,
      opacity: 1,
      blur: 0,
      glow: 0,
    },
    circle: {
      x: 0.5,
      y: 0.5,
      radius: 40,
      color: LUNAR.silver,
      stroke: 'none',
      lineWidth: 2,
      opacity: 1,
      blur: 0,
      glow: 0,
    },
    line: {
      x: 0.5,
      y: 0.5,
      w: 0.4,
      h: 0,
      anchor: 'center',
      color: LUNAR.silver,
      lineWidth: 2,
      opacity: 1,
      blur: 0,
      glow: 0,
    },
    glow: {
      x: 0.5,
      y: 0.5,
      radius: 480,
      color: LUNAR.amber,
      opacity: 0.35,
    },
    leak: { x: 0, y: 0.35, radius: 900, color: LUNAR.amber, opacity: 0.4 },
    grain: { size: 2, color: LUNAR.silver, opacity: 0.08 },
    scanlines: { size: 4, lineWidth: 1.5, opacity: 0.35 },
  }

  /* ============================================================ easing */
  const springRaw = u => 1 - Math.exp(-7 * u) * Math.cos(10 * u)
  const SPRING_END = springRaw(1)
  const EASE = {
    linear: u => u,
    inQuad: u => u * u,
    outQuad: u => 1 - (1 - u) * (1 - u),
    inOutQuad: u => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
    inCubic: u => u * u * u,
    outCubic: u => 1 - (1 - u) ** 3,
    inOutCubic: u => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
    inExpo: u => (u <= 0 ? 0 : 2 ** (10 * u - 10)),
    outExpo: u => (u >= 1 ? 1 : 1 - 2 ** (-10 * u)),
    inOutExpo: u =>
      u <= 0
        ? 0
        : u >= 1
          ? 1
          : u < 0.5
            ? 2 ** (20 * u - 10) / 2
            : (2 - 2 ** (-20 * u + 10)) / 2,
    outBack: u => {
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2
    },
    spring: u => (u >= 1 ? 1 : springRaw(u) / SPRING_END),
  }
  const STEPS_RE = /^steps\((\d{1,2})\)$/
  /** Ease function by name, or null when the name is not part of the schema. */
  function easeFn(name) {
    if (name == null) return EASE.linear
    if (typeof name !== 'string') return null
    if (Object.hasOwn(EASE, name)) return EASE[name]
    const m = STEPS_RE.exec(name)
    if (!m) return null
    const n = Number(m[1])
    if (n < 1 || n > 60) return null
    return u => Math.min(1, Math.floor(u * n + 1e-9) / n)
  }

  /* ============================================================ colour + units */
  function rgbOf(v) {
    if (typeof v !== 'string' || !HEX_RE.test(v)) return null
    let s = v.slice(1)
    if (s.length === 3) s = s.replace(/./g, c => c + c)
    const n = Number.parseInt(s, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const ch8 = x => clamp(Math.round(x), 0, 255)
  const rgba = (c, a = 1) =>
    `rgba(${ch8(c[0])},${ch8(c[1])},${ch8(c[2])},${clamp(a, 0, 1)})`
  const mixRGB = (a, b, t) => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ]
  // Film halation runs warm: the under-glow is pulled toward tungsten amber + sear crimson.
  const WARM = [204, 98, 46]
  const CRIMSON = rgbOf(LUNAR.crimson)
  const BONE = rgbOf(LUNAR.bone)
  const bgHex = b =>
    BG[b] || (typeof b === 'string' && HEX_RE.test(b) ? b : BG.black)
  // −1…1 is a fraction of the frame; any other number is a design px. Design px sit on
  // a 1080 px short side (a 1080×1920 or 1920×1080 frame is 1:1), so a 540×960 export
  // is the same card at half resolution and a 2160×3840 export is the same card in 4K.
  const DESIGN_SHORT = 1080
  const isFrac = v => v >= -1 && v <= 1
  const posX = (v, e) => (isFrac(v) ? v * e.W : v * e.s)
  const posY = (v, e) => (isFrac(v) ? v * e.H : v * e.s)
  const dimX = (v, e) => (isFrac(v) ? v * e.W : v * e.s)
  const dimY = (v, e) => (isFrac(v) ? v * e.H : v * e.s)

  /* ============================================================ seeded noise */
  function mulberry32(a) {
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function hash32(a, b) {
    let x = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)) >>> 0
    x ^= x >>> 16
    x = Math.imul(x, 0x7feb352d)
    x ^= x >>> 15
    x = Math.imul(x, 0x846ca68b)
    x ^= x >>> 16
    return x >>> 0
  }
  const SALT = { grain: 0x6a09, leak: 0xbb67 }
  const seedFor = (type, index) => hash32(index + 1, SALT[type] || 7)

  /* ============================================================ canvas capability */
  const C2D =
    typeof CanvasRenderingContext2D !== 'undefined'
      ? CanvasRenderingContext2D.prototype
      : {}
  const NATIVE_LS = 'letterSpacing' in C2D
  const HAS_FILTER = 'filter' in C2D
  // QA hook: force the per-glyph letter-spacing path that browsers without
  // ctx.letterSpacing use.
  const flags = { forceGlyphLayout: false }
  const nativeLS = () => NATIVE_LS && !flags.forceGlyphLayout
  function setBlur(ctx, px) {
    if (HAS_FILTER) ctx.filter = px > 0.3 ? `blur(${px.toFixed(2)}px)` : 'none'
  }

  /* ============================================================ fonts */
  const KEY_FONTS = {
    display: {
      family: 'Instrument Serif',
      italic: false,
      weight: 400,
      cat: 'serif',
    },
    'serif-italic': {
      family: 'Cormorant Garamond',
      italic: true,
      weight: 500,
      cat: 'serif',
    },
    mono: { family: 'JetBrains Mono', italic: false, weight: 500, cat: 'mono' },
  }
  const FALLBACK = {
    serif:
      'Georgia, "Times New Roman", "Noto Serif", "Liberation Serif", serif',
    mono: '"Space Mono", ui-monospace, "Roboto Mono", "Droid Sans Mono", "Liberation Mono", monospace',
    sans: 'Roboto, "Noto Sans", "Liberation Sans", sans-serif',
  }
  /** Every family named in LN.fonts (the faces the page loads from Google Fonts). */
  function fontFamilies() {
    const out = []
    for (const v of Object.values(LN.fonts || {})) {
      for (const f of Array.isArray(v) ? v : [v]) {
        if (typeof f === 'string' && f && !out.includes(f)) out.push(f)
      }
    }
    return out
  }
  function fontCat(family) {
    const F = LN.fonts || {}
    if (
      family === F.mono ||
      (F.metaFaces || []).includes(family) ||
      /mono|courier/i.test(family)
    )
      return 'mono'
    if (/oswald|antonio|sans|inter\b|roboto/i.test(family)) return 'sans'
    return 'serif'
  }
  const specCache = new Map()
  function fontSpec(name, weight) {
    const key = `${name}|${weight || ''}`
    let f = specCache.get(key)
    if (f) return f
    const kw = KEY_FONTS[name]
    const family = kw ? kw.family : String(name || 'Instrument Serif')
    const cat = kw ? kw.cat : fontCat(family)
    let alt = ''
    if (cat === 'serif')
      alt =
        family === 'Cormorant Garamond'
          ? '"Instrument Serif", '
          : '"Cormorant Garamond", '
    else if (cat === 'mono' && family !== 'JetBrains Mono')
      alt = '"JetBrains Mono", '
    f = {
      family,
      italic: kw ? kw.italic : false,
      weight: weight || (kw ? kw.weight : 400),
      mono: cat === 'mono',
      stack: `"${family}", ${alt}${FALLBACK[cat]}`,
    }
    specCache.set(key, f)
    return f
  }
  const fontCss = (f, px) =>
    `${f.italic ? 'italic ' : ''}${f.weight} ${px.toFixed(2)}px ${f.stack}`
  /** document.fonts.load() specs for every face a scene draws with. */
  function fontLoads(scene) {
    const out = new Set()
    for (const L of (scene && scene.layers) || []) {
      if (!L || (L.type !== 'text' && L.type !== 'counter')) continue
      const p = { ...DEFAULTS[L.type], ...(L.props || {}) }
      const f = fontSpec(p.font, p.weight)
      out.add(`${f.italic ? 'italic ' : ''}${f.weight} 64px "${f.family}"`)
    }
    return [...out]
  }

  /* ============================================================ text layout */
  const widthCache = new Map()
  const metricCache = new Map()
  const layoutCache = new Map()
  const capSize = (m, limit) => {
    if (m.size > limit) m.clear()
  }
  /** Web fonts arriving late change every measurement, so drop the caches then. */
  function clearMeasureCaches() {
    widthCache.clear()
    metricCache.clear()
    layoutCache.clear()
  }
  try {
    document.fonts.addEventListener('loadingdone', clearMeasureCaches)
  } catch (_e) {
    /* FontFaceSet events unsupported */
  }
  // ctx.font must already be css, with letterSpacing 0.
  function textW(ctx, css, s) {
    const k = `${css}\u0001${s}`
    let w = widthCache.get(k)
    if (w === undefined) {
      w = ctx.measureText(s).width
      capSize(widthCache, 6000)
      widthCache.set(k, w)
    }
    return w
  }
  function vmetrics(ctx, css, px) {
    let m = metricCache.get(css)
    if (!m) {
      const a = ctx.measureText('H')
      const d = ctx.measureText('gjpqy')
      m = {
        cap:
          a.actualBoundingBoxAscent > 0 ? a.actualBoundingBoxAscent : px * 0.7,
        desc:
          d.actualBoundingBoxDescent > 0
            ? d.actualBoundingBoxDescent
            : px * 0.22,
        em: textW(ctx, css, 'M') || px * 0.6,
      }
      capSize(metricCache, 400)
      metricCache.set(css, m)
    }
    return m
  }
  const STAR = { '★': 'fill', '☆': 'outline' }

  /** Lines → glyph runs with x positions. Letter-spacing is added by hand to every
   *  position, so the layout is identical whether the browser draws runs with
   *  ctx.letterSpacing (native) or one glyph at a time (glyph mode). */
  function layoutText(ctx, css, track, str, maxW, glyph) {
    const key = `${glyph ? 'g' : 'n'}|${css}|${track.toFixed(2)}|${maxW.toFixed(1)}|${str}`
    const hit = layoutCache.get(key)
    if (hit) return hit
    const W = s => textW(ctx, css, s)
    const span = s => {
      const n = Array.from(s).length
      return n ? W(s) + (n - 1) * track : 0
    }
    const rows = []
    for (const para of str.split('\n')) {
      if (!(maxW > 0)) {
        rows.push(para)
        continue
      }
      let cur = ''
      for (const word of para.split(' ')) {
        const next = cur ? `${cur} ${word}` : word
        if (cur && span(next) > maxW) {
          rows.push(cur)
          cur = word
        } else cur = next
      }
      rows.push(cur)
    }
    const lines = []
    let ci = 0
    let word = -1
    let width = 0
    for (const row of rows) {
      const chars = Array.from(row)
      const xs = [0]
      let pre = ''
      for (let i = 0; i < chars.length; i++) {
        pre += chars[i]
        xs.push(W(pre) + (i + 1) * track)
      }
      const segs = []
      let run = null
      let inWord = false
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i]
        if (c === ' ' || c === '\t') {
          inWord = false
          run = null
          continue
        }
        if (!inWord) {
          inWord = true
          word++
          run = null
        }
        const star = STAR[c] || null
        if (star || glyph) {
          segs.push({
            text: c,
            x: xs[i],
            w: xs[i + 1] - xs[i] - track,
            ci: ci + i,
            n: 1,
            word,
            star,
          })
          run = null
          continue
        }
        if (!run) {
          run = { text: '', x: xs[i], w: 0, ci: ci + i, n: 0, word, star: null }
          segs.push(run)
        }
        run.text += c
        run.n++
      }
      const lw = chars.length ? xs[chars.length] - track : 0
      lines.push({ n: chars.length, ci0: ci, xs, width: lw, segs })
      width = Math.max(width, lw)
      ci += chars.length
    }
    const out = { lines, width, nChars: ci, nWords: word + 1 }
    capSize(layoutCache, 600)
    layoutCache.set(key, out)
    return out
  }

  function counterString(p, v) {
    const d = clamp(Math.round(Number(p.decimals) || 0), 0, 4)
    let s = Math.abs(v).toFixed(d)
    const pad = clamp(Math.round(Number(p.pad) || 0), 0, 8)
    if (pad) {
      const [ip, fp] = s.split('.')
      s = ip.padStart(pad, '0') + (fp != null ? `.${fp}` : '')
    }
    return v < 0 && Number(s) !== 0 ? `−${s}` : s
  }
  /** One line: prefix, a right-aligned numeric field with tabular digit slots, suffix.
   *  The field is as wide as the widest value, so digits never jitter while counting. */
  function layoutCounter(ctx, css, track, p, v) {
    const W = s => textW(ctx, css, s)
    let D = 0
    for (let d = 0; d <= 9; d++) D = Math.max(D, W(String(d)))
    const adv = c => (c >= '0' && c <= '9' ? D : W(c))
    const numW = str => {
      let w = 0
      for (const c of str) w += adv(c) + track
      return w
    }
    const cur = counterString(p, v)
    const field = Math.max(
      numW(counterString(p, Number(p.from) || 0)),
      numW(counterString(p, Number(p.to) || 0)),
      numW(cur),
    )
    const segs = []
    const xs = []
    let x = 0
    let ci = 0
    const put = (c, slot) => {
      xs.push(x)
      if (c !== ' ')
        segs.push({
          text: c,
          x: x + (slot - W(c)) / 2,
          w: slot,
          ci,
          n: 1,
          word: 0,
          star: STAR[c] || null,
        })
      x += slot + track
      ci++
    }
    for (const c of String(p.prefix || '')) put(c, W(c))
    // the right-alignment gap sits between the prefix and the number
    x += Math.max(0, field - numW(cur))
    for (const c of cur) put(c, adv(c))
    for (const c of String(p.suffix || '')) put(c, W(c))
    xs.push(x)
    const width = Math.max(0, x - track)
    return {
      lines: [{ n: ci, ci0: 0, xs, width, segs }],
      width,
      nChars: ci,
      nWords: 1,
    }
  }

  /* ============================================================ drawing helpers */
  /** Halation: draw only the shadows of the shape (it is shifted off-canvas and its
   *  shadow shifted back), as a wide warm under-glow, a halo and a tight core.
   *  paint(dx) must draw the shape moved dx px to the right. */
  function glowPasses(ctx, g, col, ref, paint) {
    if (!(g > 0.001) || !col) return
    const OFF = 40000
    const shadowOnly = !(HAS_FILTER && ctx.filter && ctx.filter !== 'none')
    const warm = mixRGB(col, WARM, 0.72)
    const spread = 0.55 + 0.45 * g
    ctx.save()
    ctx.shadowOffsetY = 0
    ctx.shadowOffsetX = shadowOnly ? OFF : 0
    const passes = [
      [warm, 0.6 * g, 1.05 * ref * spread],
      [col, 0.5 * g, 0.36 * ref * spread],
      [col, 0.6 * g, 0.085 * ref],
    ]
    for (const [c, a, b] of passes) {
      ctx.shadowColor = rgba(c, a)
      ctx.shadowBlur = Math.max(1, b)
      paint(shadowOnly ? -OFF : 0)
    }
    ctx.restore()
  }
  function starPath(ctx, cx, cy, R) {
    const r = R * 0.382
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r : R
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const x = cx + Math.cos(a) * rad
      const y = cy + Math.sin(a) * rad
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.closePath()
  }
  function paintSeg(ctx, seg, text, x, y, fill, stroke, lw, starLw, px) {
    if (seg.star) {
      starPath(ctx, x + seg.w / 2, y - px * 0.3, px * 0.36)
      if (seg.star === 'fill') {
        ctx.fillStyle = rgba(fill || stroke)
        ctx.fill()
      } else {
        ctx.lineJoin = 'miter'
        ctx.miterLimit = 10
        ctx.lineWidth = starLw
        ctx.strokeStyle = rgba(stroke || fill)
        ctx.stroke()
      }
      return
    }
    if (!text) return
    if (fill) {
      ctx.fillStyle = rgba(fill)
      ctx.fillText(text, x, y)
    }
    if (stroke && lw > 0) {
      ctx.lineJoin = 'round'
      ctx.lineWidth = lw
      ctx.strokeStyle = rgba(stroke)
      ctx.strokeText(text, x, y)
    }
  }
  function rrectPath(ctx, x, y, w, hh, r) {
    let X = x
    let Y = y
    let Wd = w
    let Ht = hh
    if (Wd < 0) {
      X += Wd
      Wd = -Wd
    }
    if (Ht < 0) {
      Y += Ht
      Ht = -Ht
    }
    const R = Math.max(0, Math.min(r, Wd / 2, Ht / 2))
    if (!R) {
      ctx.rect(X, Y, Wd, Ht)
      return
    }
    ctx.moveTo(X + R, Y)
    ctx.arcTo(X + Wd, Y, X + Wd, Y + Ht, R)
    ctx.arcTo(X + Wd, Y + Ht, X, Y + Ht, R)
    ctx.arcTo(X, Y + Ht, X, Y, R)
    ctx.arcTo(X, Y, X + Wd, Y, R)
    ctx.closePath()
  }
  const revDur = (L, def) =>
    typeof L.revealDur === 'number' && L.revealDur > 0 ? L.revealDur : def
  function defaultRevealDur(reveal, lay) {
    if (reveal === 'typewriter') return clamp(lay.nChars * 0.045, 0.35, 3)
    if (reveal === 'word-by-word') return clamp(lay.nWords * 0.3, 0.6, 5)
    if (reveal === 'tracking-in') return 1.8
    if (reveal === 'mask-up') return 0.9 + 0.12 * (lay.lines.length - 1)
    if (reveal === 'blur-in') return 1
    return 0
  }
  /** blur-in / mask-up for shapes; full-frame layers just fade in. */
  function shapeReveal(L, lt, box, env) {
    const r = L.reveal || 'none'
    if (r === 'none') return { alpha: 1, blur: 0, dy: 0, clip: null }
    const D = revDur(L, r === 'mask-up' ? 0.9 : 1)
    const u = D > 0 ? clamp(lt / D, 0, 1) : 1
    if (r === 'mask-up') {
      const e = EASE.outExpo(u)
      return {
        alpha: 1,
        blur: 0,
        dy: (1 - e) * box.h * 1.05,
        clip: e < 1 ? box.y + box.h : null,
      }
    }
    const e = EASE.outCubic(u)
    return {
      alpha: e,
      blur:
        r === 'blur-in'
          ? (1 - e) * Math.max(6 * env.s, 0.12 * Math.min(box.w, box.h))
          : 0,
      dy: 0,
      clip: null,
    }
  }
  const fadeIn = (L, lt) => {
    const r = L.reveal || 'none'
    if (r === 'none') return 1
    const D = revDur(L, 1)
    return EASE.outCubic(D > 0 ? clamp(lt / D, 0, 1) : 1)
  }
  function clipBelow(ctx, y) {
    ctx.beginPath()
    ctx.rect(-1e6, -1e6, 2e6, y + 1e6)
    ctx.clip()
  }

  /* ============================================================ layer painters */
  function drawText(ctx, L, p, lt, env, counter) {
    const f = fontSpec(p.font, p.weight)
    const px = p.size * env.s
    if (!(px >= 0.5)) return
    const fill = p.color
    const stroke = counter ? null : p.stroke
    if (!fill && !stroke) return
    const reveal = L.reveal || 'none'
    let trackEm = Number(p.tracking) || 0
    if (reveal === 'tracking-in') {
      const u = clamp(lt / revDur(L, 1.8), 0, 1)
      trackEm += (1 - EASE.outExpo(u)) * 0.32
    }
    const track = trackEm * px
    const css = fontCss(f, px)
    const glyph = !nativeLS()
    ctx.font = css
    if (NATIVE_LS) ctx.letterSpacing = '0px'
    let lay
    let D
    if (counter) {
      D = revDur(L, 1.6)
      const k = EASE.outCubic(clamp(lt / D, 0, 1))
      lay = layoutCounter(
        ctx,
        css,
        track,
        p,
        lerp(Number(p.from) || 0, Number(p.to) || 0, k),
      )
    } else {
      const maxW = p.maxWidth ? Math.abs(dimX(p.maxWidth, env)) : 0
      const str = String(p.text == null ? '' : p.text)
      lay = layoutText(ctx, css, track, str, maxW, glyph)
      D = revDur(L, defaultRevealDur(reveal, lay))
    }
    if (!lay.nChars) return
    const m = vmetrics(ctx, css, px)
    const lineH = px * (p.lineHeight || 1.15)
    const [ax, ay] = ANCHOR[p.anchor] || ANCHOR.center
    const left = posX(p.x, env) - ax * lay.width
    const top = posY(p.y, env) - ay * lay.lines.length * lineH
    const align = p.align || (ax === 0 ? 'left' : ax === 1 ? 'right' : 'center')
    const lx = lay.lines.map(
      l =>
        left +
        (align === 'left'
          ? 0
          : align === 'right'
            ? lay.width - l.width
            : (lay.width - l.width) / 2),
    )
    const by = lay.lines.map((_, i) => top + (i + 0.5) * lineH + m.cap / 2)

    const u = D > 0 ? clamp(lt / D, 0, 1) : 1
    let alpha = clamp(Number(p.opacity), 0, 1)
    let blur = (Number(p.blur) || 0) * env.s
    let visible = Number.POSITIVE_INFINITY
    let wordFx = null
    let lineFx = null
    if (reveal === 'blur-in') {
      const e = EASE.outCubic(u)
      alpha *= e
      blur += (1 - e) * 0.16 * px
    } else if (reveal === 'tracking-in') {
      alpha *= EASE.outCubic(clamp(u * 1.3, 0, 1))
      blur += (1 - EASE.outCubic(u)) * 0.03 * px
    } else if (reveal === 'typewriter') {
      visible = Math.floor(u * lay.nChars + 1e-6)
    } else if (reveal === 'word-by-word') {
      const n = Math.max(1, lay.nWords)
      const fd = Math.min(0.75, Math.max(0.2, D * 0.4))
      const stag = n > 1 ? Math.max(0, D - fd) / (n - 1) : 0
      wordFx = w => {
        const e = EASE.outCubic(clamp((lt - w * stag) / fd, 0, 1))
        return [e, (1 - e) * 0.22 * px, (1 - e) * 0.05 * px]
      }
    } else if (reveal === 'mask-up') {
      const n = lay.lines.length
      const stag = Math.min(0.14, D / (n + 2))
      const fd = Math.max(0.2, D - stag * (n - 1))
      lineFx = i => {
        const e = EASE.outExpo(clamp((lt - i * stag) / fd, 0, 1))
        return [e, (1 - e) * lineH * 1.05]
      }
    }
    if (alpha <= 0.002) return

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    if (NATIVE_LS) ctx.letterSpacing = glyph ? '0px' : `${track.toFixed(3)}px`
    setBlur(ctx, blur)
    ctx.globalAlpha = alpha
    const lw =
      p.lineWidth != null ? p.lineWidth * env.s : Math.max(1, px * 0.03)
    const starLw =
      p.lineWidth != null
        ? Math.max(0.5, p.lineWidth * env.s)
        : Math.max(1.2, px * 0.034)
    const below = m.desc + px * 0.08
    const paint = dx => {
      for (let li = 0; li < lay.lines.length; li++) {
        const line = lay.lines[li]
        if (line.ci0 >= visible) break
        let dy = 0
        let clipped = false
        if (lineFx) {
          const [e, d] = lineFx(li)
          if (e <= 0) continue
          dy = d
          if (e < 1) {
            ctx.save()
            clipBelow(ctx, by[li] + below)
            clipped = true
          }
        }
        for (const seg of line.segs) {
          if (seg.ci >= visible) break
          let a = 1
          let sdy = dy
          let sb = 0
          if (wordFx) {
            const r = wordFx(seg.word)
            a = r[0]
            sdy += r[1]
            sb = r[2]
            if (a <= 0.002) continue
          }
          const text =
            seg.ci + seg.n > visible
              ? Array.from(seg.text)
                  .slice(0, visible - seg.ci)
                  .join('')
              : seg.text
          if (a < 1) ctx.globalAlpha = alpha * a
          if (sb > 0.3) setBlur(ctx, blur + sb)
          paintSeg(
            ctx,
            seg,
            text,
            lx[li] + seg.x + dx,
            by[li] + sdy,
            fill,
            stroke,
            lw,
            starLw,
            px,
          )
          if (a < 1) ctx.globalAlpha = alpha
          if (sb > 0.3) setBlur(ctx, blur)
        }
        if (clipped) ctx.restore()
      }
    }
    glowPasses(ctx, Number(p.glow) || 0, fill || stroke, px, paint)
    paint(0)

    if (reveal === 'typewriter') {
      const after = lt - D
      const on = u < 1 || (after < 1.5 && Math.floor(after * 2.2) % 2 === 0)
      if (!on) return
      const k = Math.min(visible, lay.nChars)
      let li = lay.lines.length - 1
      for (let i = 0; i < lay.lines.length; i++) {
        if (k < lay.lines[i].ci0 + lay.lines[i].n) {
          li = i
          break
        }
      }
      const line = lay.lines[li]
      const cx = lx[li] + line.xs[clamp(k - line.ci0, 0, line.n)]
      const cw = f.mono ? m.em * 0.9 : Math.max(1.5, px * 0.055)
      setBlur(ctx, 0)
      ctx.globalAlpha = alpha * 0.85
      ctx.fillStyle = rgba(fill || stroke)
      ctx.fillRect(cx, by[li] - m.cap * 1.08, cw, m.cap * 1.22)
    }
  }

  function drawRect(ctx, L, p, lt, env) {
    const fill = p.color
    const stroke = p.stroke
    if (!fill && !stroke) return
    const w = dimX(p.w, env)
    const hh = dimY(p.h, env)
    const [ax, ay] = ANCHOR[p.anchor] || ANCHOR.center
    const x0 = posX(p.x, env) - ax * Math.abs(w)
    const y0 = posY(p.y, env) - ay * Math.abs(hh)
    const box = { x: x0, y: y0, w: Math.abs(w), h: Math.abs(hh) }
    if (box.w < 0.25 || box.h < 0.25) return
    const rv = shapeReveal(L, lt, box, env)
    const a = clamp(Number(p.opacity), 0, 1) * rv.alpha
    if (a <= 0.002) return
    const lw = (Number(p.lineWidth) || 0) * env.s
    const r = (Number(p.radius) || 0) * env.s
    ctx.globalAlpha = a
    setBlur(ctx, (Number(p.blur) || 0) * env.s + rv.blur)
    if (rv.clip != null) clipBelow(ctx, rv.clip)
    const paint = dx => {
      ctx.beginPath()
      rrectPath(ctx, x0 + dx, y0 + rv.dy, box.w, box.h, r)
      if (fill) {
        ctx.fillStyle = rgba(fill)
        ctx.fill()
      }
      if (stroke && lw > 0) {
        ctx.lineWidth = lw
        ctx.strokeStyle = rgba(stroke)
        ctx.stroke()
      }
    }
    const ref = clamp(Math.min(box.w, box.h), 24 * env.s, 220 * env.s)
    glowPasses(ctx, Number(p.glow) || 0, fill || stroke, ref, paint)
    paint(0)
  }

  function drawCircle(ctx, L, p, lt, env) {
    const fill = p.color
    const stroke = p.stroke
    const r = (Number(p.radius) || 0) * env.s
    if ((!fill && !stroke) || r < 0.2) return
    const cx = posX(p.x, env)
    const cy = posY(p.y, env)
    const rv = shapeReveal(
      L,
      lt,
      { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r },
      env,
    )
    const a = clamp(Number(p.opacity), 0, 1) * rv.alpha
    if (a <= 0.002) return
    const lw = (Number(p.lineWidth) || 0) * env.s
    ctx.globalAlpha = a
    setBlur(ctx, (Number(p.blur) || 0) * env.s + rv.blur)
    if (rv.clip != null) clipBelow(ctx, rv.clip)
    const paint = dx => {
      ctx.beginPath()
      ctx.arc(cx + dx, cy + rv.dy, r, 0, Math.PI * 2)
      if (fill) {
        ctx.fillStyle = rgba(fill)
        ctx.fill()
      }
      if (stroke && lw > 0) {
        ctx.lineWidth = lw
        ctx.strokeStyle = rgba(stroke)
        ctx.stroke()
      }
    }
    glowPasses(
      ctx,
      Number(p.glow) || 0,
      fill || stroke,
      Math.max(r * 2.6, 30 * env.s),
      paint,
    )
    paint(0)
  }

  function drawLine(ctx, L, p, lt, env) {
    const c = p.color
    if (!c) return
    const w = dimX(p.w, env)
    const hh = dimY(p.h, env)
    const aw = Math.abs(w)
    const ah = Math.abs(hh)
    if (Math.hypot(aw, ah) < 0.5) return
    const [ax, ay] = ANCHOR[p.anchor] || ANCHOR.center
    const left = posX(p.x, env) - ax * aw
    const top = posY(p.y, env) - ay * ah
    const lw = Math.max(0.5, (Number(p.lineWidth) || 0) * env.s)
    const x0 = w >= 0 ? left : left + aw
    const x1 = w >= 0 ? left + aw : left
    const y0 = hh >= 0 ? top : top + ah
    const y1 = hh >= 0 ? top + ah : top
    const box = { x: left - lw / 2, y: top - lw / 2, w: aw + lw, h: ah + lw }
    const rv = shapeReveal(L, lt, box, env)
    const a = clamp(Number(p.opacity), 0, 1) * rv.alpha
    if (a <= 0.002) return
    ctx.globalAlpha = a
    setBlur(ctx, (Number(p.blur) || 0) * env.s + rv.blur)
    if (rv.clip != null) clipBelow(ctx, rv.clip)
    ctx.lineCap = 'square'
    ctx.lineWidth = lw
    ctx.strokeStyle = rgba(c)
    const paint = dx => {
      ctx.beginPath()
      ctx.moveTo(x0 + dx, y0 + rv.dy)
      ctx.lineTo(x1 + dx, y1 + rv.dy)
      ctx.stroke()
    }
    glowPasses(ctx, Number(p.glow) || 0, c, Math.max(lw * 7, 22 * env.s), paint)
    paint(0)
  }

  function bloom(ctx, cx, cy, rx, ry, col, alpha, rot) {
    if (rx < 0.5 || ry < 0.5 || alpha <= 0.002) return
    ctx.save()
    ctx.translate(cx, cy)
    if (rot) ctx.rotate(rot)
    ctx.scale(rx, ry)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, rgba(col, alpha))
    g.addColorStop(0.18, rgba(col, alpha * 0.66))
    g.addColorStop(0.42, rgba(col, alpha * 0.28))
    g.addColorStop(0.7, rgba(col, alpha * 0.08))
    g.addColorStop(1, rgba(col, 0))
    ctx.fillStyle = g
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }

  function drawGlow(ctx, L, p, lt, env) {
    if (!p.color) return
    const a = clamp(Number(p.opacity), 0, 1) * fadeIn(L, lt)
    const r = (Number(p.radius) || 0) * env.s
    const rx = p.w != null ? Math.abs(dimX(p.w, env)) / 2 : r
    const ry = p.h != null ? Math.abs(dimY(p.h, env)) / 2 : r
    ctx.globalCompositeOperation = 'screen'
    bloom(ctx, posX(p.x, env), posY(p.y, env), rx, ry, p.color, a, 0)
  }

  function drawLeak(ctx, L, p, lt, env, index) {
    if (!p.color) return
    const op = clamp(Number(p.opacity), 0, 1) * fadeIn(L, lt)
    if (op <= 0.002) return
    const rnd = mulberry32(seedFor('leak', index))
    const { W, H } = env
    const R = (Number(p.radius) || 0) * env.s
    const bx = posX(p.x, env)
    const by = posY(p.y, env)
    const T = Math.PI * 2
    ctx.globalCompositeOperation = 'screen'
    for (let j = 0; j < 3; j++) {
      const ox = (rnd() - 0.5) * 0.45 * W
      const oy = (rnd() - 0.5) * 0.4 * H
      const fx = 0.035 + rnd() * 0.05
      const fy = 0.03 + rnd() * 0.045
      const ph = rnd() * T
      const ph2 = rnd() * T
      const fl = 0.16 + rnd() * 0.22
      const rr = R * (0.55 + rnd() * 0.6)
      const rot = (rnd() - 0.5) * 1.4
      const cx = bx + ox + Math.sin(T * fx * lt + ph) * 0.16 * W
      const cy = by + oy + Math.cos(T * fy * lt + ph2) * 0.1 * H
      const k = 0.74 + 0.26 * Math.sin(T * fl * lt + ph * 1.7)
      const col =
        j === 1
          ? mixRGB(p.color, CRIMSON, 0.35)
          : j === 2
            ? mixRGB(p.color, BONE, 0.3)
            : p.color
      const a = op * k * (j === 2 ? 0.55 : 1)
      bloom(
        ctx,
        cx,
        cy,
        rr * 1.35,
        rr * 0.72,
        col,
        a,
        rot + 0.25 * Math.sin(T * 0.03 * lt + ph2),
      )
    }
  }

  const grainTiles = new Map()
  const TILE = 192
  function grainSet(seed, rgb) {
    const key = `${seed}|${rgb.join(',')}`
    let set = grainTiles.get(key)
    if (set) return set
    if (grainTiles.size > 24) grainTiles.clear()
    const rnd = mulberry32(seed)
    set = []
    for (let n = 0; n < 4; n++) {
      const c = document.createElement('canvas')
      c.width = TILE
      c.height = TILE
      const g = c.getContext('2d')
      const img = g.createImageData(TILE, TILE)
      const d = img.data
      for (let i = 0; i < TILE * TILE; i++) {
        const v = rnd()
        d[i * 4] = rgb[0]
        d[i * 4 + 1] = rgb[1]
        d[i * 4 + 2] = rgb[2]
        d[i * 4 + 3] = Math.round(v * v * v * 255)
      }
      g.putImageData(img, 0, 0)
      set.push(c)
    }
    grainTiles.set(key, set)
    return set
  }
  function drawGrain(ctx, L, p, lt, env, index) {
    if (!p.color) return
    const op = clamp(Number(p.opacity), 0, 1) * fadeIn(L, lt)
    if (op <= 0.002) return
    const seed = seedFor('grain', index)
    const tiles = grainSet(seed, p.color.map(ch8))
    const frame = Math.floor(env.t * env.fps + 1e-6)
    const hs = hash32(seed, frame)
    const tile = tiles[hs % tiles.length]
    const gs = Math.max(0.75, (Number(p.size) || 2) * env.s)
    const ox = (hs >>> 8) % TILE
    const oy = (hs >>> 16) % TILE
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = op
    ctx.imageSmoothingEnabled = gs > 1.25
    const pat = ctx.createPattern(tile, 'repeat')
    if (!pat) return
    ctx.scale(gs, gs)
    ctx.translate(-ox, -oy)
    ctx.fillStyle = pat
    ctx.fillRect(ox, oy, env.W / gs + 1, env.H / gs + 1)
  }

  function drawScanlines(ctx, L, p, lt, env) {
    const col = p.color || rgbOf(env.bg)
    const op = clamp(Number(p.opacity), 0, 1) * fadeIn(L, lt)
    if (!col || op <= 0.002) return
    const period = Math.max(2, (Number(p.size) || 4) * env.s)
    const th = Math.min(
      period,
      Math.max(0.5, (Number(p.lineWidth) || 0) * env.s),
    )
    ctx.globalAlpha = op
    ctx.fillStyle = rgba(col)
    ctx.beginPath()
    for (let y = 0; y < env.H; y += period) ctx.rect(0, y, env.W, th)
    ctx.fill()
  }

  const PAINT = {
    text: (ctx, L, p, lt, env) => drawText(ctx, L, p, lt, env, false),
    counter: (ctx, L, p, lt, env) => drawText(ctx, L, p, lt, env, true),
    rect: drawRect,
    circle: drawCircle,
    line: drawLine,
    glow: drawGlow,
    leak: drawLeak,
    grain: drawGrain,
    scanlines: drawScanlines,
  }

  /* ============================================================ keys */
  function keyValue(list, lt, isColor) {
    const conv = v => (isColor ? rgbOf(v) : Number(v))
    const first = list[0]
    if (!Array.isArray(first)) return undefined
    if (lt <= first[0]) return conv(first[1])
    for (let k = 1; k < list.length; k++) {
      const b = list[k]
      if (lt < b[0]) {
        const a = list[k - 1]
        const span = b[0] - a[0]
        const u = span > 0 ? clamp((lt - a[0]) / span, 0, 1) : 1
        const e = (easeFn(b[2]) || EASE.linear)(u)
        if (!isColor) return lerp(Number(a[1]), Number(b[1]), e)
        const ca = rgbOf(a[1])
        const cb = rgbOf(b[1])
        return ca && cb ? mixRGB(ca, cb, e) : ca || cb
      }
    }
    return conv(list[list.length - 1][1])
  }
  /** Defaults + props + keyed values at layer time lt. Colours become [r,g,b] or null. */
  function resolveProps(L, lt) {
    const p = { ...DEFAULTS[L.type], ...(L.props || {}) }
    if ('color' in p) p.color = rgbOf(p.color)
    if ('stroke' in p) p.stroke = rgbOf(p.stroke)
    const keys = L.keys
    if (keys && typeof keys === 'object') {
      for (const k of Object.keys(keys)) {
        const list = keys[k]
        if (!Array.isArray(list) || !list.length || !SPEC[k]) continue
        const v = keyValue(list, lt, SPEC[k].k === 'color')
        if (v !== undefined && v !== null && !Number.isNaN(v)) p[k] = v
      }
    }
    return p
  }

  /* ============================================================ renderScene */
  const warned = new Set()
  /**
   * Draw `scene` at time t (seconds) onto ctx, filling ctx.canvas. Positions in −1…1
   * are fractions of the canvas; px values are design px on a 1080 px short side and
   * scale with the canvas, so the same scene renders at any size or preset.
   */
  function renderScene(ctx, scene, t) {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    const sc = scene && typeof scene === 'object' ? scene : {}
    const env = {
      W,
      H,
      s: Math.min(W, H) / DESIGN_SHORT,
      fps: sc.fps > 0 ? sc.fps : 30,
      t,
      bg: bgHex(sc.background),
    }
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.shadowBlur = 0
    ctx.shadowColor = 'rgba(0,0,0,0)'
    setBlur(ctx, 0)
    ctx.fillStyle = env.bg
    ctx.fillRect(0, 0, W, H)
    const layers = Array.isArray(sc.layers) ? sc.layers : []
    const end0 = sc.duration > 0 ? sc.duration : Number.POSITIVE_INFINITY
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i]
      if (!L || !PAINT[L.type]) continue
      const start = typeof L.start === 'number' ? L.start : 0
      const end = typeof L.end === 'number' ? L.end : end0
      if (t < start || t >= end) continue
      const lt = t - start
      ctx.save()
      try {
        PAINT[L.type](ctx, L, resolveProps(L, lt), lt, env, i)
      } catch (e) {
        if (!warned.has(i)) {
          warned.add(i)
          console.warn('[forge-motion] layer could not draw', i, e)
        }
      }
      ctx.restore()
    }
    ctx.restore()
  }

  /* ============================================================ validateScene */
  const show = v => {
    if (v === undefined) return 'nothing'
    const s = JSON.stringify(v)
    return s.length > 40 ? `${s.slice(0, 38)}…` : s
  }
  const isNum = v => typeof v === 'number' && Number.isFinite(v)
  function checkValue(spec, v, where, err, inKey) {
    switch (spec.k) {
      case 'num':
        if (!isNum(v) || v < spec.min || v > spec.max)
          err(
            `${where} must be a number from ${spec.min} to ${spec.max} (got ${show(v)}).`,
          )
        return
      case 'int':
        if (!Number.isInteger(v) || v < spec.min || v > spec.max)
          err(
            `${where} must be a whole number from ${spec.min} to ${spec.max} (got ${show(v)}).`,
          )
        return
      case 'color':
        if (
          !(
            typeof v === 'string' &&
            (HEX_RE.test(v) || (!inKey && v === 'none'))
          )
        )
          err(
            `${where} must be a hex colour like "#C8D0DC"${inKey ? '' : ' or "none"'} (got ${show(v)}).`,
          )
        return
      case 'str':
        if (typeof v !== 'string' || v.length > spec.max)
          err(`${where} must be text of up to ${spec.max} characters.`)
        return
      case 'enum':
        if (!spec.values.includes(v))
          err(
            `${where} must be one of: ${spec.values.join(', ')} (got ${show(v)}).`,
          )
        return
      case 'font': {
        const fams = fontFamilies()
        if (!(typeof v === 'string' && (KEY_FONTS[v] || fams.includes(v))))
          err(
            `${where} must be "display", "serif-italic", "mono" or one of: ${fams.join(', ')} (got ${show(v)}).`,
          )
        return
      }
      default:
    }
  }
  /**
   * Check a scene against schema v1.
   * → {ok, errors: [readable strings], warnings: [readable strings]}
   */
  function validateScene(scene) {
    const errors = []
    const warnings = []
    const err = m => {
      if (errors.length < 40) errors.push(m)
    }
    if (!scene || typeof scene !== 'object' || Array.isArray(scene))
      return {
        ok: false,
        errors: ['A scene must be one JSON object: { "version": 1, … }.'],
        warnings,
      }
    for (const k of Object.keys(scene))
      if (!SCENE_KEYS.includes(k))
        err(`Unknown scene key "${k}". Allowed: ${SCENE_KEYS.join(', ')}.`)
    if (scene.version !== 1)
      err(`version must be 1 (got ${show(scene.version)}).`)
    if (
      scene.name !== undefined &&
      (typeof scene.name !== 'string' || scene.name.length > 80)
    )
      err('name must be a short label of up to 80 characters.')
    const intIn = (key, lo, hi) => {
      const v = scene[key]
      if (v === undefined) return
      if (!Number.isInteger(v) || v < lo || v > hi)
        err(
          `${key} must be a whole number from ${lo} to ${hi} (got ${show(v)}).`,
        )
    }
    intIn('width', 64, 4096)
    intIn('height', 64, 4096)
    intIn('fps', 12, 60)
    const dur = scene.duration
    let durOk = false
    if (!isNum(dur) || dur <= 0)
      err(`duration must be a number of seconds above 0 (got ${show(dur)}).`)
    else if (dur > MAX_DUR)
      err(
        `duration is ${dur} s; the limit is ${MAX_DUR} s. Split it into shorter titles.`,
      )
    else durOk = true
    const b = scene.background
    if (
      b !== undefined &&
      !(typeof b === 'string' && (Object.hasOwn(BG, b) || HEX_RE.test(b)))
    )
      err(
        `background must be "black", "green", "obsidian" or a hex like "#08080A" (got ${show(b)}).`,
      )
    const layers = scene.layers
    if (!Array.isArray(layers)) {
      err('layers must be a list of layer objects.')
      return { ok: false, errors, warnings }
    }
    if (!layers.length) err('layers is empty: add at least one layer.')
    if (layers.length > MAX_LAYERS)
      err(`${layers.length} layers is too many; keep it to ${MAX_LAYERS}.`)
    let soft = false
    layers.slice(0, MAX_LAYERS).forEach((L, i) => {
      if (!L || typeof L !== 'object' || Array.isArray(L)) {
        err(
          `Layer ${i + 1} must be an object like {"type": "text", "props": {…}}.`,
        )
        return
      }
      const txt =
        L.props && typeof L.props.text === 'string'
          ? ` "${L.props.text.replace(/\s+/g, ' ').slice(0, 18)}${L.props.text.length > 18 ? '…' : ''}"`
          : ''
      const lb = `Layer ${i + 1}${typeof L.type === 'string' ? ` (${L.type}${txt})` : ''}`
      for (const k of Object.keys(L))
        if (!LAYER_KEYS.includes(k))
          err(`${lb}: unknown key "${k}". Allowed: ${LAYER_KEYS.join(', ')}.`)
      if (!TYPES.includes(L.type)) {
        err(
          `${lb}: unknown type ${show(L.type)}. Use one of: ${TYPES.join(', ')}.`,
        )
        return
      }
      const info = TYPE_INFO[L.type]
      const start = L.start === undefined ? 0 : L.start
      if (!isNum(start) || start < 0)
        err(`${lb}: start must be seconds, 0 or more (got ${show(L.start)}).`)
      else if (durOk && start >= dur)
        err(
          `${lb}: start (${start} s) is at or after the scene end (${dur} s), so it never shows.`,
        )
      if (L.end !== undefined) {
        if (!isNum(L.end))
          err(`${lb}: end must be seconds (got ${show(L.end)}).`)
        else if (isNum(start) && L.end <= start)
          err(`${lb}: end (${L.end} s) must come after start (${start} s).`)
      }
      const props = L.props === undefined ? {} : L.props
      if (!props || typeof props !== 'object' || Array.isArray(props)) {
        err(`${lb}: props must be an object.`)
      } else {
        for (const k of Object.keys(props)) {
          if (!info.props.includes(k)) {
            const hint =
              ALIAS[k] && info.props.includes(ALIAS[k])
                ? ` Did you mean "${ALIAS[k]}"?`
                : ''
            err(
              `${lb}: unknown prop "${k}" for ${L.type}.${hint} Allowed: ${info.props.join(', ')}.`,
            )
            continue
          }
          checkValue(SPEC[k], props[k], `${lb}: props.${k}`, err, false)
        }
        if (
          L.type === 'text' &&
          !(typeof props.text === 'string' && props.text.trim())
        )
          err(`${lb}: props.text is missing or empty.`)
        if ((Number(props.glow) || 0) > 0 || (Number(props.blur) || 0) > 0)
          soft = true
      }
      if (
        L.type === 'grain' ||
        L.type === 'leak' ||
        L.type === 'glow' ||
        L.type === 'scanlines'
      )
        soft = true
      if (L.keys !== undefined) {
        if (!L.keys || typeof L.keys !== 'object' || Array.isArray(L.keys)) {
          err(
            `${lb}: keys must be an object like {"opacity": [[0, 0], [1, 1]]}.`,
          )
        } else {
          for (const [prop, list] of Object.entries(L.keys)) {
            const at = `${lb}: keys.${prop}`
            if (!info.props.includes(prop)) {
              err(`${at}: "${prop}" is not a prop of ${L.type}.`)
              continue
            }
            const spec = SPEC[prop]
            if (!spec.key) {
              err(`${at}: only number and colour props can be keyed.`)
              continue
            }
            if (!Array.isArray(list) || !list.length) {
              err(`${at} must be a list like [[0, 0], [1, 1, "outCubic"]].`)
              continue
            }
            let prevT = Number.NEGATIVE_INFINITY
            let sawFrac = false
            let sawPx = false
            list.forEach((key, j) => {
              const kat = `${at}[${j}]`
              if (!Array.isArray(key) || key.length < 2 || key.length > 3) {
                err(`${kat} must be [time, value] or [time, value, "ease"].`)
                return
              }
              const [kt, kv, ke] = key
              if (!isNum(kt) || kt < 0)
                err(
                  `${kat}: time must be seconds from the layer start, 0 or more (got ${show(kt)}).`,
                )
              else if (kt < prevT)
                err(
                  `${kat}: time ${kt} comes before the key before it (${prevT}). Keep keys in time order.`,
                )
              else prevT = kt
              checkValue(spec, kv, `${kat}: value`, err, true)
              if (spec.unit && isNum(kv) && kv !== 0) {
                if (isFrac(kv)) sawFrac = true
                else sawPx = true
              }
              if (key.length === 3 && !easeFn(ke))
                err(
                  `${kat}: unknown ease ${show(ke)}. Use: ${EASE_NAMES.join(', ')}.`,
                )
            })
            if (sawFrac && sawPx)
              err(
                `${at} mixes fractions (−1 to 1) and px. Use one unit for a prop.`,
              )
          }
        }
      }
      if (L.reveal !== undefined) {
        if (!REVEALS.includes(L.reveal))
          err(
            `${lb}: unknown reveal ${show(L.reveal)}. Use: ${REVEALS.join(', ')}.`,
          )
        else if (
          TEXT_ONLY.has(L.reveal) &&
          L.type !== 'text' &&
          L.type !== 'counter'
        )
          err(
            `${lb}: reveal "${L.reveal}" works on text and counter layers only.`,
          )
      }
      if (
        L.revealDur !== undefined &&
        (!isNum(L.revealDur) || L.revealDur <= 0 || L.revealDur > MAX_DUR)
      )
        err(
          `${lb}: revealDur must be seconds above 0, up to ${MAX_DUR} (got ${show(L.revealDur)}).`,
        )
    })
    if (scene.background === 'green' && soft)
      warnings.push(
        'Green background: glow, blur, grain, leaks and scanlines have soft edges that key badly in CapCut. Use black and Screen for those.',
      )
    return { ok: errors.length === 0, errors, warnings }
  }

  /* ============================================================ JSON helpers */
  function spaced(json) {
    let out = ''
    let inStr = false
    let esc = false
    for (const c of json) {
      out += c
      if (inStr) {
        if (esc) esc = false
        else if (c === '\\') esc = true
        else if (c === '"') inStr = false
        continue
      }
      if (c === '"') inStr = true
      else if (c === ',' || c === ':') out += ' '
    }
    return out
  }
  /** Pretty-print, keeping short arrays and objects (keys, props) on one line. */
  function stringify(v, max = 62) {
    const out = (val, ind, lead) => {
      const flat = spaced(JSON.stringify(val) ?? 'null')
      if (
        val === null ||
        typeof val !== 'object' ||
        ind.length + lead + flat.length <= max
      )
        return flat
      const inner = `${ind}  `
      if (Array.isArray(val))
        return `[\n${val.map(x => inner + out(x, inner, 0)).join(',\n')}\n${ind}]`
      const keys = Object.keys(val).filter(k => val[k] !== undefined)
      return `{\n${keys
        .map(k => {
          const kl = `${JSON.stringify(k)}: `
          return inner + kl + out(val[k], inner, kl.length)
        })
        .join(',\n')}\n${ind}}`
    }
    return out(v, '', 0)
  }
  function jsonErrorText(e, s) {
    const msg = String((e && e.message) || e)
    if (/line \d+/.test(msg)) return `JSON syntax error: ${msg}`
    const m = msg.match(/position (\d+)/)
    if (!m) return `JSON syntax error: ${msg}`
    const pos = Number(m[1])
    const line = s.slice(0, pos).split('\n').length
    return `JSON syntax error on line ${line}: ${msg}`
  }
  function parseStrict(text) {
    const s = String(text || '')
    if (!s.trim()) throw new Error('The editor is empty.')
    try {
      return JSON.parse(s)
    } catch (e) {
      throw new Error(jsonErrorText(e, s))
    }
  }
  /** Pull the scene out of chat text: fences and prose around the object are fine. */
  function parseLoose(text) {
    let s = String(text || '').trim()
    if (!s) throw new Error('Nothing to read yet: paste the scene JSON first.')
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence) s = fence[1].trim()
    const a = s.indexOf('{')
    const b = s.lastIndexOf('}')
    if (a < 0 || b <= a)
      throw new Error(
        'No JSON object found. A scene starts with { and ends with }.',
      )
    s = s.slice(a, b + 1)
    try {
      return JSON.parse(s)
    } catch (e) {
      throw new Error(jsonErrorText(e, s))
    }
  }
  function sceneFromAnswer(res) {
    if (typeof res === 'string') return parseLoose(res)
    if (res && typeof res === 'object') {
      if (Array.isArray(res.layers)) return res
      if (res.scene && typeof res.scene === 'object') return res.scene
      if (typeof res.text === 'string') return parseLoose(res.text)
    }
    return res
  }
  const clone = o => JSON.parse(JSON.stringify(o))
  function sceneSlug(sc) {
    const first = (sc.layers || []).find(
      l =>
        l && l.type === 'text' && l.props && typeof l.props.text === 'string',
    )
    const base = sc.name || (first && first.props.text) || 'scene'
    return LN.fmt.slug(base).slice(0, 40).replace(/-+$/, '') || 'scene'
  }

  /* ============================================================ templates */
  const r3 = v => Math.round(v * 1000) / 1000
  /** Hold `peak`, then fade out over the last `out` seconds of a layer `len` long. */
  const fadeOut = (len, peak = 1, out = 0.8) => [
    [0, peak],
    [r3(Math.max(0, len - out)), peak],
    [r3(len), 0, 'inCubic'],
  ]
  /** Fade in over `inDur`, hold, fade out. */
  const fadeInOut = (len, peak, inDur = 0.6, out = 0.8) => [
    [0, 0],
    [inDur, peak, 'outCubic'],
    [r3(Math.max(inDur, len - out)), peak],
    [r3(len), 0, 'inCubic'],
  ]
  const sceneOf = (name, duration, background, layers) => ({
    version: 1,
    name,
    width: 1080,
    height: 1920,
    fps: 30,
    duration,
    background,
    layers,
  })

  function tChapter() {
    const D = 6
    return sceneOf('Chapter card · The Reduction', D, 'obsidian', [
      {
        type: 'glow',
        props: {
          x: 0.5,
          y: 0.468,
          w: 1150,
          h: 520,
          color: LUNAR.silver,
          opacity: 0.09,
        },
        keys: { opacity: fadeInOut(D, 0.09, 1.8, 0.9) },
      },
      {
        type: 'text',
        start: 0.35,
        props: {
          text: 'ACT II',
          font: 'mono',
          size: 30,
          weight: 500,
          tracking: 0.62,
          color: LUNAR.silver,
          x: 0.5,
          y: 0.416,
        },
        reveal: 'blur-in',
        revealDur: 1.2,
        keys: { opacity: fadeOut(D - 0.35, 0.8) },
      },
      {
        type: 'text',
        start: 0.55,
        props: {
          text: 'The Reduction',
          font: 'serif-italic',
          size: 136,
          weight: 500,
          tracking: 0.01,
          color: LUNAR.moon,
          x: 0.5,
          y: 0.47,
          glow: 0.42,
        },
        reveal: 'tracking-in',
        revealDur: 2.4,
        keys: { opacity: fadeOut(D - 0.55) },
      },
      {
        type: 'line',
        start: 1.6,
        props: {
          x: 0.5,
          y: 0.522,
          w: 0,
          h: 0,
          lineWidth: 2,
          color: LUNAR.silver,
        },
        keys: {
          w: [
            [0, 0],
            [1.2, 0.13, 'inOutCubic'],
          ],
          opacity: fadeOut(D - 1.6, 0.4),
        },
      },
      {
        type: 'text',
        start: 2.1,
        props: {
          text: 'SANTA FE, NEW MEXICO',
          font: 'mono',
          size: 25,
          weight: 400,
          tracking: 0.36,
          color: LUNAR.silver,
          x: 0.5,
          y: 0.552,
        },
        reveal: 'typewriter',
        revealDur: 1.1,
        keys: { opacity: fadeOut(D - 2.1, 0.62) },
      },
      { type: 'grain', props: { size: 2.2, opacity: 0.07 } },
    ])
  }

  function tLab() {
    const D = 5
    const L = 0.074
    const R = 0.926
    const T = 0.09
    const B = 0.735
    const len = 56
    const brackets = []
    const corner = (x, y, ah, av) => {
      const keys = { opacity: fadeInOut(D, 0.55, 0.6, 0.6) }
      brackets.push(
        {
          type: 'line',
          props: {
            x,
            y,
            w: len,
            h: 0,
            anchor: ah,
            lineWidth: 3,
            color: LUNAR.silver,
          },
          keys,
        },
        {
          type: 'line',
          props: {
            x,
            y,
            w: 0,
            h: len,
            anchor: av,
            lineWidth: 3,
            color: LUNAR.silver,
          },
          keys,
        },
      )
    }
    corner(L, T, 'left', 'top')
    corner(R, T, 'right', 'top')
    corner(L, B, 'left', 'bottom')
    corner(R, B, 'right', 'bottom')
    // REC dot: 1 Hz hard blink (steps(1) holds each value until the next key)
    const life = D - 0.2
    const blink = [[0, 1]]
    for (let k = 1; k * 0.5 < life - 0.6; k++)
      blink.push([r3(k * 0.5), k % 2 ? 0.12 : 1, 'steps(1)'])
    blink.push([r3(life - 0.05), 0, 'inCubic'])
    return sceneOf('Lab stamp · Batch 042', D, 'black', [
      ...brackets,
      {
        type: 'circle',
        start: 0.2,
        props: { x: 0.118, y: 0.122, radius: 11, color: '#C23B32', glow: 0.55 },
        keys: { opacity: blink },
      },
      {
        type: 'text',
        start: 0.2,
        props: {
          text: 'REC',
          font: 'mono',
          size: 28,
          weight: 500,
          tracking: 0.3,
          color: LUNAR.silver,
          x: 0.142,
          y: 0.122,
          anchor: 'left',
        },
        keys: { opacity: fadeOut(D - 0.2, 0.8, 0.6) },
      },
      {
        type: 'counter',
        start: 0.5,
        props: {
          prefix: 'R&D // BATCH ',
          from: 1,
          to: 42,
          pad: 3,
          font: 'mono',
          size: 54,
          weight: 500,
          tracking: 0.08,
          color: LUNAR.moon,
          x: 0.118,
          y: 0.6,
          anchor: 'left',
          glow: 0.18,
        },
        reveal: 'blur-in',
        revealDur: 1.4,
        keys: { opacity: fadeOut(D - 0.5, 1, 0.6) },
      },
      {
        type: 'text',
        start: 1.3,
        props: {
          text: '— AGED DUCK & KOJI JUS',
          font: 'mono',
          size: 34,
          weight: 500,
          tracking: 0.14,
          color: LUNAR.amber,
          x: 0.118,
          y: 0.642,
          anchor: 'left',
          glow: 0.3,
        },
        reveal: 'typewriter',
        revealDur: 1.1,
        keys: { opacity: fadeOut(D - 1.3, 1, 0.6) },
      },
      {
        type: 'line',
        start: 2.1,
        props: {
          x: 0.118,
          y: 0.672,
          w: 0,
          h: 0,
          anchor: 'left',
          lineWidth: 2,
          color: LUNAR.amber,
        },
        keys: {
          w: [
            [0, 0],
            [0.9, 0.5, 'outExpo'],
          ],
          opacity: fadeOut(D - 2.1, 0.5, 0.6),
        },
      },
      { type: 'scanlines', props: { size: 4, lineWidth: 1.6, opacity: 0.38 } },
    ])
  }

  function tStars() {
    const D = 6
    const xs = [0.37, 0.5, 0.63]
    const base = xs.map((x, i) => {
      const s0 = r3(0.7 + i * 0.15)
      return {
        type: 'text',
        start: s0,
        props: {
          text: '☆',
          font: 'display',
          size: 120,
          color: LUNAR.silver,
          x,
          y: 0.505,
          lineWidth: 2.5,
        },
        reveal: 'blur-in',
        revealDur: 0.9,
        keys: { opacity: fadeOut(r3(D - s0), 0.3) },
      }
    })
    const lit = xs.map((x, i) => {
      const s0 = r3(1.7 + i * 0.4)
      const len = r3(D - s0)
      return {
        type: 'text',
        start: s0,
        props: {
          text: '☆',
          font: 'display',
          size: 120,
          color: LUNAR.amber,
          x,
          y: 0.505,
          lineWidth: 3,
        },
        keys: {
          opacity: fadeInOut(len, 1, 0.35, 0.8),
          glow: [
            [0, 0],
            [0.45, 0.95, 'outCubic'],
            [1.6, 0.55, 'inOutCubic'],
          ],
        },
      }
    })
    return sceneOf('Road to three stars', D, 'black', [
      {
        type: 'glow',
        start: 1.5,
        props: {
          x: 0.5,
          y: 0.505,
          w: 1000,
          h: 420,
          color: LUNAR.amber,
          opacity: 0.2,
        },
        keys: { opacity: fadeInOut(D - 1.5, 0.2, 1.6, 0.9) },
      },
      {
        type: 'text',
        start: 0.2,
        props: {
          text: 'ROAD TO',
          font: 'display',
          size: 76,
          tracking: 0.42,
          color: LUNAR.silver,
          x: 0.5,
          y: 0.43,
        },
        reveal: 'tracking-in',
        revealDur: 2,
        keys: { opacity: fadeOut(D - 0.2) },
      },
      ...base,
      ...lit,
      {
        type: 'line',
        start: 3,
        props: {
          x: 0.5,
          y: 0.578,
          w: 0,
          h: 0,
          lineWidth: 2,
          color: LUNAR.silver,
        },
        keys: {
          w: [
            [0, 0],
            [1, 0.2, 'inOutCubic'],
          ],
          opacity: fadeOut(D - 3, 0.35),
        },
      },
      {
        type: 'text',
        start: 3.2,
        props: {
          text: 'SANTA FE, NEW MEXICO',
          font: 'mono',
          size: 24,
          tracking: 0.42,
          color: LUNAR.silver,
          x: 0.5,
          y: 0.606,
        },
        reveal: 'typewriter',
        revealDur: 1,
        keys: { opacity: fadeOut(D - 3.2, 0.55) },
      },
    ])
  }

  function tQuote() {
    const D = 7
    return sceneOf('Kinetic quote', D, 'obsidian', [
      {
        type: 'leak',
        props: {
          x: 0.02,
          y: 0.3,
          radius: 820,
          color: LUNAR.amber,
          opacity: 0.2,
        },
        keys: { opacity: fadeInOut(D, 0.2, 1.5, 1) },
      },
      {
        type: 'leak',
        props: {
          x: 0.98,
          y: 0.78,
          radius: 760,
          color: LUNAR.crimson,
          opacity: 0.18,
        },
        keys: { opacity: fadeInOut(D, 0.18, 1.5, 1) },
      },
      {
        type: 'text',
        start: 0.5,
        props: {
          text: 'The sauce doesn’t care\nhow tired you are.',
          font: 'display',
          size: 92,
          lineHeight: 1.12,
          color: LUNAR.moon,
          x: 0.5,
          y: 0.455,
          maxWidth: 0.86,
          glow: 0.18,
        },
        reveal: 'word-by-word',
        revealDur: 2.6,
        keys: { opacity: fadeOut(D - 0.5) },
      },
      {
        type: 'text',
        start: 3.5,
        props: {
          text: '— AFTER SERVICE',
          font: 'mono',
          size: 24,
          tracking: 0.4,
          color: LUNAR.amber,
          x: 0.5,
          y: 0.565,
        },
        reveal: 'blur-in',
        revealDur: 1,
        keys: { opacity: fadeOut(D - 3.5, 0.85) },
      },
      { type: 'grain', props: { size: 2.2, opacity: 0.06 } },
    ])
  }

  function tData() {
    const D = 7
    const rows = [
      { label: '01 · TEMPERATURE', to: 62.5, decimals: 1, suffix: ' °C' },
      { label: '02 · TIME', to: 48, decimals: 0, suffix: ' h' },
      { label: '03 · SALINITY', to: 1.2, decimals: 1, suffix: ' %' },
    ]
    return sceneOf(
      'Recipe data card',
      D,
      'black',
      rows.flatMap((r, i) => {
        const y = r3(0.31 + i * 0.145)
        const s0 = r3(0.3 + i * 0.5)
        return [
          {
            type: 'text',
            start: s0,
            props: {
              text: r.label,
              font: 'mono',
              size: 24,
              weight: 500,
              tracking: 0.34,
              color: LUNAR.amber,
              x: 0.12,
              y: r3(y - 0.05),
              anchor: 'left',
            },
            reveal: 'typewriter',
            revealDur: 0.6,
            keys: { opacity: fadeOut(r3(D - s0), 0.9) },
          },
          {
            type: 'counter',
            start: r3(s0 + 0.15),
            props: {
              from: 0,
              to: r.to,
              decimals: r.decimals,
              suffix: r.suffix,
              font: 'display',
              size: 170,
              color: LUNAR.moon,
              x: 0.12,
              y: r3(y + 0.008),
              anchor: 'left',
              glow: 0.14,
            },
            reveal: 'mask-up',
            revealDur: 1.6,
            keys: { opacity: fadeOut(r3(D - s0 - 0.15)) },
          },
          {
            type: 'line',
            start: r3(s0 + 0.3),
            props: {
              x: 0.12,
              y: r3(y + 0.058),
              w: 0,
              h: 0,
              anchor: 'left',
              lineWidth: 1.5,
              color: LUNAR.silver,
            },
            keys: {
              w: [
                [0, 0],
                [1.2, 0.76, 'inOutCubic'],
              ],
              opacity: fadeOut(r3(D - s0 - 0.3), 0.22),
            },
          },
        ]
      }),
    )
  }

  function tLocation() {
    const D = 5
    const pulse = [
      [0, 0],
      [0.3, 1, 'outCubic'],
      [1.2, 0.45, 'inOutQuad'],
      [2.1, 1, 'inOutQuad'],
      [3, 0.45, 'inOutQuad'],
      [3.9, 1, 'inOutQuad'],
      [D - 0.2, 0, 'inCubic'],
    ]
    return sceneOf('Location stamp · Santa Fe', D, 'black', [
      {
        type: 'circle',
        start: 0.2,
        props: { x: 0.11, y: 0.652, radius: 7, color: LUNAR.amber, glow: 0.7 },
        keys: { opacity: pulse },
      },
      {
        type: 'text',
        start: 0.3,
        props: {
          text: 'SANTA FE',
          font: 'mono',
          size: 46,
          weight: 500,
          tracking: 0.34,
          color: LUNAR.moon,
          x: 0.14,
          y: 0.652,
          anchor: 'left',
        },
        reveal: 'typewriter',
        revealDur: 0.55,
        keys: { opacity: fadeOut(D - 0.3, 1, 0.6) },
      },
      {
        type: 'text',
        start: 1,
        props: {
          text: '35.6870° N · 105.9378° W',
          font: 'mono',
          size: 28,
          weight: 400,
          tracking: 0.14,
          color: LUNAR.silver,
          x: 0.14,
          y: 0.686,
          anchor: 'left',
        },
        reveal: 'typewriter',
        revealDur: 1.5,
        keys: { opacity: fadeOut(D - 1, 0.8, 0.6) },
      },
      {
        type: 'line',
        start: 1.9,
        props: {
          x: 0.14,
          y: 0.712,
          w: 0,
          h: 0,
          anchor: 'left',
          lineWidth: 1.5,
          color: LUNAR.silver,
        },
        keys: {
          w: [
            [0, 0],
            [1.1, 0.34, 'inOutCubic'],
          ],
          opacity: fadeOut(D - 1.9, 0.32, 0.6),
        },
      },
    ])
  }

  const TEMPLATES = [
    {
      id: 'chapter',
      name: 'Chapter card',
      focus: 0.485,
      note: 'ACT II · The Reduction. The serif italic tracks in under a halation glow; the mono meta types on. Obsidian full-frame card.',
      scene: tChapter,
    },
    {
      id: 'lab',
      name: 'Lab stamp',
      focus: 0.55,
      note: 'R&D // BATCH 042 — AGED DUCK & KOJI JUS. A mono HUD: the batch number counts up, the REC dot blinks, scanlines slice the type.',
      scene: tLab,
    },
    {
      id: 'stars',
      name: 'Road to three stars',
      focus: 0.5,
      note: 'ROAD TO ★★★. Three outline stars ignite in amber. A goal marker: the stars stay outlines, so it never reads as an award.',
      scene: tStars,
    },
    {
      id: 'quote',
      name: 'Kinetic quote',
      focus: 0.48,
      note: 'One monologue line, word by word, over a slow amber and crimson leak. Swap in your own line.',
      scene: tQuote,
    },
    {
      id: 'data',
      name: 'Recipe data card',
      focus: 0.43,
      note: '62.5 °C, 48 h, 1.2 % salinity. The counters roll up under amber mono labels; the digits stay locked in place.',
      scene: tData,
    },
    {
      id: 'location',
      name: 'Location stamp',
      focus: 0.6,
      note: 'SANTA FE · 35.6870° N 105.9378° W types on beside a breathing amber dot.',
      scene: tLocation,
    },
  ]

  /** The time a scene is fully on screen: for posters and reduced-motion stills. */
  function heroTime(sc) {
    let t = 0
    for (const L of sc.layers || []) {
      const s0 = typeof L.start === 'number' ? L.start : 0
      let d = 0
      if (L.reveal && L.reveal !== 'none') d = revDur(L, 1.2)
      if (L.type === 'counter') d = Math.max(d, revDur(L, 1.6))
      if (L.keys && L.keys.glow) d = Math.max(d, 1.6)
      t = Math.max(t, s0 + d)
    }
    return clamp(
      Math.max(t + 0.3, sc.duration * 0.6),
      0,
      Math.max(0, sc.duration - 0.9),
    )
  }

  /* ============================================================ Fable 5.1 prompt */
  function schemaText() {
    const out = ['TYPES AND THEIR PROPS (no other props are accepted)']
    for (const t of TYPES)
      out.push(`- ${t}: ${TYPE_INFO[t].props.join(', ')}. ${TYPE_INFO[t].doc}`)
    out.push('', 'PROPS')
    for (const [k, s] of Object.entries(SPEC)) out.push(`- ${k}: ${s.doc}`)
    out.push(`- Font families allowed by name: ${fontFamilies().join(', ')}.`)
    out.push(
      '',
      `EASES: ${EASE_NAMES.join(', ')}. steps(n) jumps in n hard steps (n from 1 to 60): use steps(1) for a blinking REC dot.`,
      '',
      'REVEALS (play from the layer start over revealDur seconds)',
    )
    for (const [k, d] of Object.entries(REVEAL_DOC)) out.push(`- ${k}: ${d}`)
    out.push(
      '- Counters count over revealDur (default 1.6 s) whatever the reveal. On grain, leak, scanlines and glow, blur-in and mask-up simply fade in.',
    )
    return out.join('\n')
  }
  function frameText() {
    return [
      'SCENE',
      '{"version": 1, "name": "short label", "width": 1080, "height": 1920, "fps": 30, "duration": 6, "background": "black", "layers": [ ...layers ]}',
      '- version is always 1. name is a short label; it names the saved file.',
      '- 9:16 vertical by default: width 1080, height 1920. Use width 1920, height 1080 only when the idea asks for 16:9 or landscape.',
      '- fps: 30 unless the idea asks for 24 or 60.',
      `- duration: seconds, at most ${ASK_DUR}. Most titles want 4 to 8 s.`,
      '- background: "black" (the default: CapCut’s Screen blend drops pure black), "green" (#00FF00 for CapCut Chroma key: hard-edged type and shapes only, no glow, blur, grain, leak or scanlines), "obsidian" (#08080A full-frame card), or "#RRGGBB".',
      '- Layers draw in order: the first sits at the back.',
      '',
      'LAYER',
      '{"type": "text", "start": 0.5, "end": 6, "props": {…}, "keys": {"opacity": [[0, 0], [0.8, 1, "outCubic"]]}, "reveal": "tracking-in", "revealDur": 1.8}',
      '- start defaults to 0 and end to the scene end, in seconds.',
      '- keys animate number and colour props: "prop": [[t, value], [t, value, "ease"], …]. Key times are seconds from the layer start, in order. The ease on a key shapes the move into that key. Before the first key the first value holds; after the last key the last value holds. Keys override props.',
      '- reveal plays from the layer start over revealDur seconds.',
      '- Units: x, y, w, h and maxWidth from −1 to 1 are fractions of the frame (x 0.5 = centre); any other number is px. All px (size, radius, lineWidth, blur and px positions) are design px on a 1080 px short side, exact in a 1080 x 1920 frame; the phone scales them for other sizes. Keep one unit per prop: all fractions or all px.',
    ].join('\n')
  }
  const LOOK_TEXT = [
    'LUNAR NIGHT LOOK',
    '- Palette: obsidian #08080A; lunar silver #C8D0DC for type and highlights; moonlight #E8ECF2 for the brightest type; tungsten amber #E5A93C and sear crimson #9E2A2B are food accents, used sparingly.',
    '- Type: an editorial serif ("display" or "serif-italic") for titles; small all-caps "mono" with wide tracking (0.2 to 0.45) for data, places and batch codes.',
    '- Restraint, like an A24 or Chef’s Table title card: one idea per card, lots of black, slow confident moves (outExpo, inOutCubic, outCubic). Glow 0.2 to 0.5 on the hero line only; grain 0.05 to 0.08 if any. Nothing bouncy unless asked.',
    '- Fade every layer out over the last 0.6 to 1 s with opacity keys.',
    '- Keep type in the safe area: in 9:16, y from 0.1 to 0.72 and x from 0.08 to 0.86 (app buttons cover the edges).',
    '- Never invent facts, numbers, names or awards. "Road to three stars" is a goal: never show stars as awarded.',
  ].join('\n')
  /** The full, self-contained prompt for one scene. LN.ai.ask adds the Brand Brain. */
  function buildPrompt(idea) {
    const ask =
      String(idea || '').trim() ||
      'A restrained title card for tonight’s episode.'
    return [
      'TASK',
      'Write one motion-graphics SCENE as JSON for Lunar Night OS (Motion Forge). The chef’s phone renders it frame by frame to an MP4 and lays it over footage in CapCut Mobile. You are writing data, not code.',
      '',
      'THE IDEA',
      ask,
      '',
      'OUTPUT',
      'Return exactly one JSON object that matches the schema below: no markdown fences, no comments, no text before or after it. Use only the keys, types, props, eases and reveals listed here; anything else is rejected.',
      '',
      frameText(),
      '',
      schemaText(),
      '',
      LOOK_TEXT,
      '',
      'EXAMPLE 1: chapter card',
      JSON.stringify(tChapter()),
      '',
      'EXAMPLE 2: location stamp',
      JSON.stringify(tLocation()),
    ].join('\n')
  }
  function buildFixPrompt(text, errors) {
    return [
      'TASK',
      'This Lunar Night OS motion scene failed validation. Fix every problem below and return the corrected scene as one JSON object only: no fences, no prose. Keep the design; change only what the problems require.',
      '',
      'PROBLEMS',
      ...errors.map(e => `- ${e}`),
      '',
      'SCENE AS SENT',
      text,
      '',
      frameText(),
      '',
      schemaText(),
    ].join('\n')
  }

  /* ============================================================ UI */
  const STORE_KEY = 'forgeMotion.v1'
  const PRESETS = [
    { id: '1080x1920', w: 1080, h: 1920, label: '1080×1920' },
    { id: '1920x1080', w: 1920, h: 1080, label: '1920×1080' },
    { id: '2160x3840', w: 2160, h: 3840, label: '2160×3840', slow: true },
    { id: '3840x2160', w: 3840, h: 2160, label: '3840×2160', slow: true },
  ]
  const IDEA =
    'a 5 s vertical title for the duck episode, typewriter mono, amber glow'
  function icon(kind) {
    return LN.s(
      'svg',
      {
        viewBox: '0 0 16 16',
        width: '16',
        height: '16',
        'aria-hidden': 'true',
      },
      kind === 'play'
        ? LN.s('path', { d: 'M5 2.8v10.4L13.4 8z', fill: 'currentColor' })
        : [
            LN.s('rect', {
              x: '3.5',
              y: '3',
              width: '3',
              height: '10',
              rx: '0.6',
              fill: 'currentColor',
            }),
            LN.s('rect', {
              x: '9.5',
              y: '3',
              width: '3',
              height: '10',
              rx: '0.6',
              fill: 'currentColor',
            }),
          ],
    )
  }
  const portrait = (w, hh) => hh >= w

  function formatDoc() {
    const shape = `{
  "version": 1,
  "name": "Chapter card",
  "width": 1080, "height": 1920, "fps": 30,
  "duration": 6,
  "background": "black",
  "layers": [
    { "type": "text", "start": 0.5, "end": 6,
      "props": { "text": "The Reduction", "font": "serif-italic",
                 "size": 136, "x": 0.5, "y": 0.47, "glow": 0.4 },
      "keys": { "opacity": [[0, 0], [0.8, 1, "outCubic"]] },
      "reveal": "tracking-in", "revealDur": 2.4 }
  ]
}`
    const frameRows = [
      ['version', 'Always 1.'],
      ['name', 'Optional short label. It names the saved file.'],
      [
        'width, height',
        'The output frame, 64–4096 px: 1080 × 1920 is 9:16 vertical. Sizes stay in design px (1080 px short side), so 540 × 960 is the same card at half resolution.',
      ],
      ['fps', '12–60. The render presets can change it.'],
      [
        'duration',
        `Seconds, up to ${MAX_DUR} here (Fable is asked for ${ASK_DUR} or less).`,
      ],
      [
        'background',
        '"black" (pure #000, for Screen blend), "green" (#00FF00, for Chroma key), "obsidian" (#08080A full-frame card) or "#RRGGBB".',
      ],
      ['layers', `Up to ${MAX_LAYERS}. The first draws at the back.`],
    ]
    const layerRows = [
      ['type', TYPES.join(', ')],
      ['start, end', 'Seconds. start defaults to 0, end to the scene end.'],
      [
        'props',
        'The layer’s look and place. Only the props listed for its type.',
      ],
      [
        'keys',
        'Animation: {"prop": [[t, value], [t, value, "ease"]]}. t counts from the layer start; the ease shapes the move into that key. Number and colour props only.',
      ],
      ['reveal', REVEALS.join(', ')],
      ['revealDur', 'Seconds the reveal takes. Counters also count over it.'],
    ]
    return h(
      'div',
      { class: 'fm-doc ln-stack' },
      h(
        'p',
        { class: 'ln-prose' },
        'A scene is plain JSON: one frame size, a length, a background and a stack of layers. The renderer reads it once per frame. Nothing in it runs as code, so a scene copied out of a chat is safe to paste.',
      ),
      ui.copyBlock(shape, { title: 'Shape', button: 'Copy' }),
      h('h4', { class: 'ln-h3' }, 'Scene'),
      ui.table(['Key', 'Meaning'], frameRows, { label: 'Scene keys' }),
      h('h4', { class: 'ln-h3' }, 'Layer'),
      ui.table(['Key', 'Meaning'], layerRows, { label: 'Layer keys' }),
      h('h4', { class: 'ln-h3' }, 'Types'),
      ui.table(
        ['Type', 'Draws', 'Props'],
        TYPES.map(t => [t, TYPE_INFO[t].doc, TYPE_INFO[t].props.join(', ')]),
        { label: 'Layer types' },
      ),
      h('h4', { class: 'ln-h3' }, 'Props'),
      ui.table(
        ['Prop', 'Meaning'],
        Object.entries(SPEC).map(([k, s]) => [k, s.doc]),
        { label: 'Props' },
      ),
      h(
        'p',
        { class: 'ln-muted ln-small' },
        `Fonts by name: ${fontFamilies().join(', ')}.`,
      ),
      h('h4', { class: 'ln-h3' }, 'Eases and reveals'),
      ui.kv([
        ['Eases', EASE_NAMES.join(', ')],
        ...Object.entries(REVEAL_DOC).map(([k, d]) => [k, d]),
      ]),
      ui.callout(
        'rule',
        'Positions from −1 to 1 are fractions of the frame, so a scene re-frames between 9:16 and 16:9. Every px value is a design px on a 1080 px short side (true px in a 1080 × 1920 frame) and scales with the export: half size at 540 × 960, double in 4K. Keep one unit per animated prop.',
        'Units',
      ),
    )
  }

  function mount(el) {
    const root = h('div', { class: 'fm' })
    el.append(root)
    const saved = LN.store.get(STORE_KEY, null) || {}
    const st = {
      scene: null,
      tplId: null,
      dirty: false,
      playing: !LN.reducedMotion(),
      cur: 0,
      raf: 0,
      last: 0,
      lastDrawn: -1,
      visible: true,
      outId: '1080x1920',
      fps: 30,
      fpsTouched: false,
      rendering: false,
      renderAC: null,
      result: null,
      resultURL: null,
      asking: false,
      askAC: null,
      ai: false,
      errors: [],
    }

    /* ---------------- stage: monitor */
    const canvas = h('canvas', {
      class: 'fm-canvas',
      width: 540,
      height: 960,
      role: 'img',
      'aria-label': 'Scene preview',
    })
    const pctx = canvas.getContext('2d', { alpha: false })
    const safe = h(
      'div',
      { class: 'fm-safe', hidden: true, 'aria-hidden': 'true' },
      h('i', { class: 't' }),
      h('i', { class: 'r' }),
      h('i', { class: 'b' }),
      h('span', null, 'App UI covers the shaded bands'),
    )
    const screen = h('div', { class: 'fm-screen' }, canvas, safe)
    const monName = h('span', { class: 'fm-mon-name' })
    const monSpec = h('span', { class: 'fm-mon-spec ln-num' })
    const monHead = h('div', { class: 'fm-monhead' }, monName, monSpec)
    const playBtn = h('button', {
      type: 'button',
      class: 'fm-play',
      'aria-label': 'Play',
      onClick: () => (st.playing ? pause() : play()),
    })
    const scrub = h('input', {
      type: 'range',
      class: 'ln-range fm-scrub',
      min: 0,
      max: 179,
      step: 1,
      value: 0,
      'aria-label': 'Scrub through the scene, one frame per step',
    })
    const tc = h('output', { class: 'fm-tc ln-num' }, '00:00:00:00')
    scrub.addEventListener('input', () => {
      pause()
      st.cur = Number(scrub.value) / st.fps
      drawPreview(true)
    })
    const transport = h('div', { class: 'fm-transport' }, playBtn, scrub, tc)
    const bgSeg = ui.seg({
      label: 'Background',
      options: [
        { value: 'black', label: 'Black · Screen' },
        { value: 'green', label: 'Green · Key' },
        { value: 'obsidian', label: 'Obsidian · Card' },
      ],
      value: 'black',
      onChange: v => setBackground(v),
    })
    const safeTg = ui.toggle({
      label: 'Safe area',
      onChange: v => {
        safe.hidden = !v
      },
    })
    const monitor = h(
      'div',
      { class: 'fm-monitor' },
      monHead,
      screen,
      transport,
      h('div', { class: 'fm-ctl' }, bgSeg.el, safeTg.el),
    )

    /* ---------------- stage: template gallery */
    const cards = TEMPLATES.map((T, i) => {
      const poster = h('canvas', {
        width: 240,
        height: 300,
        'aria-hidden': 'true',
      })
      const btn = h(
        'button',
        {
          type: 'button',
          class: 'fm-tpl',
          'aria-pressed': 'false',
          onClick: () => loadTemplate(T.id),
        },
        poster,
        h(
          'span',
          { class: 'fm-tpl-meta' },
          h('i', null, LN.fmt.pad(i + 1)),
          h('b', null, T.name),
        ),
      )
      return { T, btn, poster }
    })
    const tplNote = h('p', { class: 'fm-tplnote' })
    const side = h(
      'div',
      { class: 'fm-side' },
      h(
        'div',
        { class: 'fm-sidehead' },
        h('div', { class: 'ln-eyebrow' }, 'Templates'),
        h(
          'p',
          { class: 'ln-faint ln-small' },
          'Tap one to load it into the preview and the editor.',
        ),
      ),
      h(
        'div',
        { class: 'fm-gallery', role: 'group', 'aria-label': 'Templates' },
        cards.map(c => c.btn),
      ),
      tplNote,
    )

    /* ---------------- Ask Fable 5.1 */
    const idea = ui.field({
      label: 'Your idea',
      multiline: true,
      rows: 3,
      value: typeof saved.idea === 'string' && saved.idea ? saved.idea : IDEA,
      placeholder: IDEA,
      onInput: () => {
        persist()
        if (promptDetails.open)
          promptBlock.setText(LN.ai.compose(buildPrompt(idea.get())))
      },
    })
    const askBtn = ui.btn('Ask Fable 5.1', () => askFable())
    const copyBtn = ui.btn(
      'Copy prompt for a Fable chat',
      () =>
        LN.copy(LN.ai.compose(buildPrompt(idea.get())), {
          label: 'Prompt copied. Paste it into a Fable 5.1 chat.',
        }),
      { kind: 'ghost' },
    )
    const stopBtn = ui.btn('Stop', () => st.askAC && st.askAC.abort(), {
      kind: 'quiet',
      small: true,
    })
    stopBtn.hidden = true
    const askRow = h('div', { class: 'ln-row' }, askBtn, copyBtn, stopBtn)
    const askStatus = h('div', {
      class: 'fm-status',
      role: 'status',
      'aria-live': 'polite',
    })
    const aiNote = ui.callout(
      'tip',
      'Fable 5.1 answers live only when this page is open in claude.ai. Copy the prompt into a Fable 5.1 chat, then paste the JSON it sends back below.',
      'Copy route',
    )
    aiNote.hidden = true
    const paste = ui.field({
      label: 'Paste scene JSON',
      multiline: true,
      rows: 4,
      placeholder:
        'Paste the scene Fable sent back in the chat. Text or ``` fences around it are fine.',
    })
    const pasteStatus = h('div', {
      class: 'fm-status',
      role: 'status',
      'aria-live': 'polite',
    })
    const pasteBtn = ui.btn('Load pasted scene', () => loadPasted(), {
      kind: 'ghost',
    })
    const promptBlock = ui.copyBlock('', {
      title: 'Prompt with your Brand Brain',
      button: 'Copy',
    })
    const promptDetails = h(
      'details',
      { class: 'fm-details' },
      h('summary', null, 'Read the full prompt'),
      h('div', null, promptBlock),
    )
    promptDetails.addEventListener('toggle', () => {
      if (promptDetails.open)
        promptBlock.setText(LN.ai.compose(buildPrompt(idea.get())))
    })
    const fableSec = ui.section(
      {
        eyebrow: 'Ask Fable 5.1',
        title: 'Describe it. Fable writes the scene.',
        lede: 'Fable 5.1 sends back scene JSON, never code. It is checked against the scene format before it reaches the preview.',
      },
      idea.el,
      askRow,
      askStatus,
      aiNote,
      h(
        'div',
        { class: 'fm-paste ln-stack' },
        paste.el,
        h('div', { class: 'ln-row' }, pasteBtn),
        pasteStatus,
      ),
      promptDetails,
    )

    /* ---------------- scene editor */
    const jsonId = LN.uid('fm-json')
    const jsonTa = h('textarea', {
      class: 'ln-textarea fm-json',
      id: jsonId,
      rows: 18,
      spellcheck: 'false',
      autocomplete: 'off',
      autocapitalize: 'off',
      autocorrect: 'off',
    })
    jsonTa.addEventListener('input', () => {
      st.dirty = true
      editorNote('Edited. Apply to play it.', 'busy')
    })
    jsonTa.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        applyEditor()
      }
    })
    const edStatus = h('div', {
      class: 'fm-status',
      role: 'status',
      'aria-live': 'polite',
    })
    const fixRow = h('div', { class: 'ln-row', hidden: true })
    const fixAsk = ui.btn('Ask Fable 5.1 to fix it', () => askFix(), {
      kind: 'ghost',
      small: true,
    })
    const fixCopy = ui.btn(
      'Copy a fix-it prompt',
      () =>
        LN.copy(LN.ai.compose(buildFixPrompt(jsonTa.value, st.errors)), {
          label: 'Fix-it prompt copied. Paste it into a Fable 5.1 chat.',
        }),
      { kind: 'quiet', small: true },
    )
    fixRow.append(fixAsk, fixCopy)
    const formatDetails = h(
      'details',
      { class: 'fm-details' },
      h('summary', null, 'Scene format'),
      h('div', null, formatDoc()),
    )
    const editorSec = ui.section(
      {
        eyebrow: 'Scene JSON',
        title: 'The scene, as data',
        lede: 'Every frame is drawn from this JSON. Change a number, tap Apply, and the preview follows.',
      },
      formatDetails,
      h(
        'div',
        { class: 'ln-field' },
        h('label', { class: 'ln-label', for: jsonId }, 'Scene JSON'),
        jsonTa,
      ),
      h(
        'div',
        { class: 'ln-row' },
        ui.btn('Apply', () => applyEditor()),
        ui.btn('Validate', () => validateEditor(), { kind: 'ghost' }),
        ui.btn('Revert', () => revertEditor(), { kind: 'quiet' }),
        ui.btn('Save .json', () => saveJson(), { kind: 'quiet' }),
      ),
      edStatus,
      fixRow,
    )

    /* ---------------- render */
    const frameHost = h('div', { class: 'fm-seghost' })
    const fpsHost = h('div', { class: 'fm-seghost' })
    const summaryHost = h('div')
    const renderBtn = ui.btn('Render MP4', () => doRender())
    const cancelBtn = ui.btn(
      'Cancel',
      () => st.renderAC && st.renderAC.abort(),
      {
        kind: 'danger',
      },
    )
    cancelBtn.hidden = true
    const bar = h('i')
    const progLabel = h('span', { class: 'ln-num' })
    const prog = h(
      'div',
      { class: 'fm-progress', hidden: true },
      h('div', { class: 'fm-bar' }, bar),
      progLabel,
    )
    const rStatus = h('div', {
      class: 'fm-status',
      role: 'status',
      'aria-live': 'polite',
    })
    const video = h('video', {
      class: 'fm-video',
      controls: true,
      loop: true,
      playsinline: true,
      preload: 'metadata',
      'aria-label': 'Rendered MP4',
    })
    video.muted = true
    const videoNote = h('p', { class: 'ln-faint ln-small', hidden: true })
    video.addEventListener('error', () => {
      videoNote.hidden = false
      videoNote.textContent =
        'This browser cannot play the file inline. Save it and open it in Photos or CapCut.'
    })
    video.addEventListener('loadedmetadata', () => {
      videoNote.hidden = true
    })
    const resultKv = h('div')
    const saveBtn = ui.btn('Save MP4', () => saveResult())
    const saveNote = h('p', { class: 'ln-faint ln-small' })
    const resultBox = h(
      'div',
      { class: 'fm-result', hidden: true },
      h('div', { class: 'fm-result-media' }, video, videoNote),
      h(
        'div',
        { class: 'ln-stack' },
        resultKv,
        h('div', { class: 'ln-row' }, saveBtn),
        saveNote,
      ),
    )
    const recipe = h(
      'div',
      { class: 'fm-recipe ln-stack' },
      h('h3', { class: 'ln-h3' }, 'Into CapCut'),
      ui.steps([
        'Save the MP4, open your project in CapCut and park the playhead where the title should land.',
        h(
          'span',
          null,
          'Tap ',
          ui.path('Overlay', 'Add overlay'),
          ' and pick the LN_motion file.',
        ),
        h(
          'span',
          null,
          'Black background: select the overlay, then ',
          ui.path('Blend', 'Screen'),
          '. The black drops out and only the light stays.',
        ),
        h(
          'span',
          null,
          'Green background: select the overlay, then ',
          ui.path('Cutout', 'Chroma key'),
          '. Drag the picker onto the green and raise Intensity until the edges are clean.',
        ),
        'Pinch the overlay to fill the frame, then trim it on the timeline.',
      ]),
      ui.callout(
        'verify',
        'CapCut renames and moves these between versions. If Blend or Cutout is not on the overlay’s toolbar, swipe the toolbar sideways. Check one title over footage before you build a whole edit on it: Screen should leave no grey veil.',
      ),
      ui.callout(
        'tip',
        'Glow, blur, grain, leaks and scanlines have soft edges that are part green, so they key badly. For halation, render on black and use Screen.',
      ),
    )
    const renderSec = ui.section(
      {
        eyebrow: 'Render',
        title: 'Export the MP4',
        lede: 'Frame by frame through WebCodecs, so every frame matches the preview. 4K is four times the pixels of 1080p, so it takes about four times as long.',
      },
      h('div', { class: 'fm-rendergrid' }, frameHost, fpsHost),
      summaryHost,
      h('div', { class: 'ln-row' }, renderBtn, cancelBtn),
      prog,
      rStatus,
      resultBox,
      recipe,
    )

    /* ---------------- page assembly */
    side.prepend(
      h(
        'header',
        { class: 'fm-intro' },
        h('div', { class: 'ln-eyebrow' }, 'Motion Forge · scene JSON → MP4'),
        h(
          'h2',
          { class: 'ln-h2' },
          'Title cards as data, rendered on the phone',
        ),
        h(
          'p',
          { class: 'fm-lede' },
          'Fable 5.1 writes a scene as JSON. The phone checks it, plays it and renders it frame by frame to an MP4 you lay over footage in CapCut. A scene is data; nothing in it runs as code.',
        ),
      ),
    )
    root.append(
      h('div', { class: 'fm-stage' }, monitor, side),
      h('div', { class: 'fm-cols' }, fableSec, editorSec),
      renderSec,
    )

    /* ---------------- state transitions */
    function persist() {
      LN.store.set(STORE_KEY, {
        tplId: st.tplId,
        scene: st.tplId ? null : st.scene,
        bg: st.scene ? st.scene.background : null,
        outId: st.outId,
        fps: st.fpsTouched ? st.fps : null,
        idea: idea.get(),
      })
    }
    const frames = () => Math.max(1, Math.round(st.scene.duration * st.fps))
    function outDims() {
      if (st.outId === 'scene')
        return [st.scene.width || 1080, st.scene.height || 1920]
      const p = PRESETS.find(x => x.id === st.outId) || PRESETS[0]
      return [p.w, p.h]
    }
    const presetFor = sc =>
      (
        PRESETS.find(
          p => p.w === (sc.width || 1080) && p.h === (sc.height || 1920),
        ) || { id: 'scene' }
      ).id
    function editorNote(text, kind) {
      edStatus.className = `fm-status ${kind || ''}`.trim()
      edStatus.replaceChildren(...[text].flat(Number.POSITIVE_INFINITY))
    }
    function showErrors(host, head, errors) {
      host.className = 'fm-status err'
      host.replaceChildren(
        h('b', null, head),
        h(
          'ul',
          { class: 'fm-errs' },
          errors.map(e => h('li', null, e)),
        ),
      )
    }
    function okLine(sc, v) {
      const n = Math.round(sc.duration * (sc.fps || 30))
      const base = `Valid · ${sc.width || 1080}×${sc.height || 1920} · ${sc.fps || 30} fps · ${LN.fmt.dur(sc.duration)} · ${n} frames · ${sc.layers.length} layers`
      return v.warnings.length
        ? [base, h('br'), h('span', { class: 'fm-warn' }, v.warnings.join(' '))]
        : base
    }
    function setEditor(text, dirty) {
      jsonTa.value = text
      st.dirty = !!dirty
    }
    /** Make `scene` (already validated) the live scene. */
    function applyScene(scene, o = {}) {
      if (o.play && !LN.reducedMotion()) {
        st.playing = true
        setPlayUi()
      }
      const prevFrame = st.scene
        ? `${st.scene.width || 1080}x${st.scene.height || 1920}`
        : null
      st.scene = clone(scene)
      st.tplId = o.tplId || null
      st.errors = []
      fixRow.hidden = true
      setEditor(stringify(st.scene), false)
      editorNote(okLine(st.scene, validateScene(st.scene)), 'ok')
      // Output frame: follow the scene when its declared frame changes (a Fable 16:9
      // scene, a size typed into the JSON) or is not a preset; otherwise keep the
      // chef's pick, so 16:9 or 4K sticks while trying templates.
      const own = presetFor(st.scene)
      const frameKey = `${st.scene.width || 1080}x${st.scene.height || 1920}`
      if (
        !o.keepOut &&
        (own === 'scene' || st.outId === 'scene' || frameKey !== prevFrame)
      )
        st.outId = own
      if (!st.fpsTouched) st.fps = st.scene.fps || 30
      for (const c of cards)
        c.btn.setAttribute('aria-pressed', String(c.T.id === st.tplId))
      const T = TEMPLATES.find(x => x.id === st.tplId)
      tplNote.replaceChildren(
        ...(T
          ? [h('b', null, `${T.name}. `), T.note]
          : [
              h('b', null, 'Custom scene. '),
              `${st.scene.name || 'From the editor'}: ${st.scene.layers.length} layers.`,
            ]),
      )
      monName.textContent = T ? T.name : st.scene.name || 'Custom scene'
      canvas.setAttribute('aria-label', `Scene preview: ${monName.textContent}`)
      bgSeg.set(
        Object.hasOwn(BG, st.scene.background || 'black')
          ? st.scene.background || 'black'
          : null,
      )
      buildRenderControls()
      sizePreview()
      st.cur = st.playing ? 0 : heroTime(st.scene)
      st.lastDrawn = -1
      drawPreview(true)
      persist()
      ensureFonts(st.scene)
      if (st.playing) startLoop()
    }
    function loadTemplate(id) {
      const T = TEMPLATES.find(x => x.id === id) || TEMPLATES[0]
      if (st.dirty)
        LN.toast('Your unapplied edits were replaced by the template.', {
          kind: 'warn',
        })
      applyScene(T.scene(), { tplId: T.id, play: true })
      showMonitor()
    }
    /** On a phone the cards and forms sit below the monitor: bring the preview to the chef. */
    function showMonitor() {
      screen.scrollIntoView({
        block: 'nearest',
        behavior: LN.reducedMotion() ? 'auto' : 'smooth',
      })
    }
    function setBackground(v) {
      st.scene.background = v
      const re = /"background"\s*:\s*"[^"]*"/
      if (re.test(jsonTa.value))
        jsonTa.value = jsonTa.value.replace(re, `"background": "${v}"`)
      else if (!st.dirty) setEditor(stringify(st.scene), false)
      if (!st.dirty) editorNote(okLine(st.scene, validateScene(st.scene)), 'ok')
      drawPreview(true)
      persist()
    }

    /* ---------------- editor actions */
    function readEditor() {
      let obj
      try {
        obj = parseStrict(jsonTa.value)
      } catch (e) {
        st.errors = [e.message]
        showErrors(edStatus, 'The JSON does not parse:', st.errors)
        fixRow.hidden = false
        return null
      }
      const v = validateScene(obj)
      if (!v.ok) {
        st.errors = v.errors
        showErrors(
          edStatus,
          `${v.errors.length} ${v.errors.length === 1 ? 'problem' : 'problems'} to fix before it can play:`,
          v.errors,
        )
        fixRow.hidden = false
        return null
      }
      st.errors = []
      fixRow.hidden = true
      return { obj, v }
    }
    function validateEditor() {
      const r = readEditor()
      if (r)
        editorNote(
          st.dirty
            ? [okLine(r.obj, r.v), ' Tap Apply to play it.']
            : okLine(r.obj, r.v),
          'ok',
        )
    }
    function applyEditor() {
      const r = readEditor()
      if (!r) return
      const same =
        st.tplId &&
        stringify(r.obj) ===
          stringify(TEMPLATES.find(x => x.id === st.tplId).scene())
      applyScene(r.obj, { tplId: same ? st.tplId : null })
      LN.toast('Scene applied')
    }
    function revertEditor() {
      setEditor(stringify(st.scene), false)
      st.errors = []
      fixRow.hidden = true
      editorNote(okLine(st.scene, validateScene(st.scene)), 'ok')
    }
    async function saveJson() {
      let sc = st.scene
      if (st.dirty) {
        const r = readEditor()
        if (!r) {
          LN.toast('Fix the problems first, or tap Revert.', { kind: 'warn' })
          return
        }
        sc = r.obj
      }
      await LN.save({
        filename: `LN_motion_${sceneSlug(sc)}.json`,
        data: `${stringify(sc)}\n`,
        mime: 'application/json',
      })
    }
    /** Load JSON from Fable or a paste: valid → live; invalid → editor with problems. */
    function takeScene(obj, statusEl, label) {
      const v = validateScene(obj)
      if (v.ok) {
        applyScene(obj, { tplId: null, play: true })
        showMonitor()
        statusEl.className = 'fm-status ok'
        statusEl.replaceChildren(
          `${label}: “${obj.name || sceneSlug(obj)}”, ${LN.fmt.dur(obj.duration)}, ${obj.layers.length} layers. It is in the preview now.`,
        )
        return true
      }
      setEditor(stringify(obj), true)
      st.errors = v.errors
      showErrors(
        edStatus,
        `${label} needs ${v.errors.length} ${v.errors.length === 1 ? 'fix' : 'fixes'} before it can play:`,
        v.errors,
      )
      fixRow.hidden = false
      statusEl.className = 'fm-status err'
      statusEl.replaceChildren(
        `${label} did not pass the scene check (${v.errors.length} ${v.errors.length === 1 ? 'problem' : 'problems'}). It is in the editor below with the list.`,
      )
      return false
    }
    function loadPasted() {
      let obj
      try {
        obj = parseLoose(paste.get())
      } catch (e) {
        pasteStatus.className = 'fm-status err'
        pasteStatus.replaceChildren(e.message)
        return
      }
      takeScene(obj, pasteStatus, 'Pasted scene')
    }

    /* ---------------- Fable 5.1 */
    function setAsking(on) {
      st.asking = on
      askBtn.disabled = on || !st.ai
      fixAsk.disabled = on || !st.ai
      stopBtn.hidden = !on
    }
    async function runAsk(prompt, statusEl, label) {
      if (st.asking) return
      st.askAC = new AbortController()
      setAsking(true)
      statusEl.className = 'fm-status busy'
      statusEl.replaceChildren('Fable 5.1 is writing the scene…')
      try {
        const res = await LN.ai.ask(prompt, {
          json: true,
          signal: st.askAC.signal,
        })
        let obj
        try {
          obj = sceneFromAnswer(res)
        } catch (e) {
          statusEl.className = 'fm-status err'
          statusEl.replaceChildren(e.message)
          return
        }
        takeScene(obj, statusEl, label)
      } catch (e) {
        if (st.askAC && st.askAC.signal.aborted) {
          statusEl.className = 'fm-status'
          statusEl.replaceChildren('Stopped.')
          return
        }
        if (e && typeof e.text === 'string') {
          try {
            takeScene(parseLoose(e.text), statusEl, label)
            return
          } catch (_e) {
            /* fall through to the explanation */
          }
        }
        statusEl.className = 'fm-status err'
        statusEl.replaceChildren(LN.ai.explain(e))
      } finally {
        setAsking(false)
        st.askAC = null
      }
    }
    function askFable() {
      runAsk(buildPrompt(idea.get()), askStatus, 'Fable’s scene')
    }
    function askFix() {
      runAsk(buildFixPrompt(jsonTa.value, st.errors), edStatus, 'Fable’s fix')
    }
    LN.ai
      .available()
      .then(ok => {
        st.ai = !!ok
        askBtn.disabled = !st.ai
        fixAsk.hidden = !st.ai
        askBtn.className = st.ai ? 'ln-btn' : 'ln-btn quiet'
        copyBtn.className = st.ai ? 'ln-btn ghost' : 'ln-btn'
        aiNote.hidden = st.ai
        if (!st.ai) askRow.prepend(copyBtn)
      })
      .catch(() => {
        aiNote.hidden = false
      })

    /* ---------------- preview */
    function sizePreview() {
      const [w, hh] = outDims()
      screen.style.setProperty('--ar', String(w / hh))
      screen.classList.toggle('is-land', !portrait(w, hh))
      const shortMax = 640
      const k = Math.min(1, shortMax / Math.min(w, hh))
      const bw = Math.max(2, Math.round(w * k))
      const bh = Math.max(2, Math.round(hh * k))
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw
        canvas.height = bh
      }
      scrub.max = String(frames() - 1)
      monSpec.textContent = `${w}×${hh} · ${st.fps} fps · ${LN.fmt.dur(st.scene.duration)}`
      st.lastDrawn = -1
    }
    function drawPreview(force) {
      if (!st.scene) return
      const n = frames()
      const fi = clamp(Math.floor(st.cur * st.fps + 1e-6), 0, n - 1)
      if (!force && fi === st.lastDrawn) return
      st.lastDrawn = fi
      renderScene(pctx, st.scene, fi / st.fps)
      scrub.value = String(fi)
      tc.textContent = LN.fmt.tc(fi / st.fps, st.fps)
    }
    function tick(now) {
      st.raf = 0
      if (!st.playing || !st.visible || st.rendering || !st.scene) return
      const dt = st.last ? Math.min(0.25, (now - st.last) / 1000) : 0
      st.last = now
      st.cur = (st.cur + dt) % st.scene.duration
      drawPreview(false)
      st.raf = requestAnimationFrame(tick)
    }
    function startLoop() {
      if (st.raf || !st.playing || !st.visible || st.rendering) return
      st.last = 0
      st.raf = requestAnimationFrame(tick)
    }
    function setPlayUi() {
      playBtn.replaceChildren(icon(st.playing ? 'pause' : 'play'))
      playBtn.setAttribute('aria-label', st.playing ? 'Pause' : 'Play')
      monHead.classList.toggle('is-live', st.playing)
    }
    function play(fromStart) {
      if (fromStart) st.cur = 0
      st.playing = true
      setPlayUi()
      startLoop()
    }
    function pause() {
      st.playing = false
      if (st.raf) cancelAnimationFrame(st.raf)
      st.raf = 0
      setPlayUi()
    }
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(entries => {
        st.visible = entries.some(e => e.isIntersecting)
        if (st.visible) {
          drawPreview(true)
          startLoop()
        }
      }).observe(screen)
    }
    LN.bus.on('route', id => {
      if (id !== 'forge') st.visible = false
    })
    const fontsSeen = new Set()
    function ensureFonts(scene) {
      const specs = fontLoads(scene).filter(s => !fontsSeen.has(s))
      if (!specs.length) return
      for (const s of specs) fontsSeen.add(s)
      LN.fontsReady(specs).then(() => {
        clearMeasureCaches()
        drawPreview(true)
        drawPosters()
      })
    }
    function drawPosters() {
      const off = document.createElement('canvas')
      off.width = 540
      off.height = 960
      const octx = off.getContext('2d', { alpha: false })
      for (const c of cards) {
        const sc = c.T.scene()
        renderScene(octx, sc, heroTime(sc))
        const cw = off.width * 0.9
        const chh = cw * 1.25
        const sy = clamp(c.T.focus * off.height - chh / 2, 0, off.height - chh)
        const g = c.poster.getContext('2d', { alpha: false })
        g.drawImage(
          off,
          (off.width - cw) / 2,
          sy,
          cw,
          chh,
          0,
          0,
          c.poster.width,
          c.poster.height,
        )
      }
    }

    /* ---------------- render controls */
    function buildRenderControls() {
      const sw = st.scene.width || 1080
      const sh = st.scene.height || 1920
      const opts = PRESETS.map(p => ({
        value: p.id,
        label: p.slow ? `${p.label} · slow` : p.label,
      }))
      if (!PRESETS.some(p => p.w === sw && p.h === sh))
        opts.unshift({ value: 'scene', label: `${sw}×${sh} · scene` })
      const frameSeg = ui.seg({
        label: 'Frame',
        options: opts,
        value: st.outId,
        onChange: v => {
          st.outId = v
          sizePreview()
          drawPreview(true)
          renderSummary()
          persist()
        },
      })
      const fpsOpts = [24, 30, 60]
      if (!fpsOpts.includes(st.fps)) fpsOpts.push(st.fps)
      const fpsSeg = ui.seg({
        label: 'Frame rate',
        options: fpsOpts
          .sort((a, b) => a - b)
          .map(v => ({ value: v, label: `${v} fps` })),
        value: st.fps,
        onChange: v => {
          st.fps = Number(v)
          st.fpsTouched = true
          sizePreview()
          drawPreview(true)
          renderSummary()
          persist()
        },
      })
      frameHost.replaceChildren(frameSeg.el)
      fpsHost.replaceChildren(fpsSeg.el)
      renderSummary()
    }
    function renderSummary() {
      const [w, hh] = outDims()
      const n = frames()
      const slow = PRESETS.some(p => p.slow && p.id === st.outId)
      summaryHost.replaceChildren(
        ui.kv([
          ['Output', `${w} × ${hh} · ${st.fps} fps`],
          ['Length', `${LN.fmt.dur(st.scene.duration)} · ${n} frames`],
          [
            'Encoder',
            LN.media && LN.media.hasWebCodecs()
              ? 'WebCodecs, frame by frame · MP4 (H.264 when the browser offers it)'
              : 'Real-time capture: this browser has no WebCodecs, so frames can drop',
          ],
          ['File', `LN_motion_${sceneSlug(st.scene)}.mp4`],
        ]),
        slow
          ? ui.callout(
              'warn',
              '4K renders are slow on a phone and need a lot of memory. Plug in, keep the screen on, and try 1080 first.',
              '4K',
            )
          : '',
      )
    }
    function setProgress(done, total, t0) {
      const pct = total ? done / total : 0
      bar.style.width = `${(pct * 100).toFixed(1)}%`
      let eta = ''
      if (t0 && done > 2) {
        const left = (((performance.now() - t0) / done) * (total - done)) / 1000
        eta = ` · about ${Math.max(1, Math.round(left))} s left`
      }
      progLabel.textContent = `Frame ${done} / ${total} · ${Math.round(pct * 100)}%${eta}`
    }
    async function doRender() {
      if (st.rendering || !st.scene) return
      const scene = clone(st.scene)
      const v = validateScene(scene)
      if (!v.ok) {
        showErrors(
          rStatus,
          'The scene has problems; fix them in the editor first:',
          v.errors,
        )
        return
      }
      if (!LN.media || typeof LN.media.renderCanvasVideo !== 'function') {
        rStatus.className = 'fm-status err'
        rStatus.replaceChildren('The video encoder did not load on this page.')
        return
      }
      const [w, hh] = outDims()
      const fps = st.fps
      st.rendering = true
      if (st.raf) cancelAnimationFrame(st.raf)
      st.raf = 0
      st.renderAC = new AbortController()
      renderBtn.disabled = true
      cancelBtn.hidden = false
      prog.hidden = false
      setProgress(0, Math.max(1, Math.round(scene.duration * fps)))
      rStatus.className = 'fm-status busy'
      rStatus.replaceChildren('Loading fonts and the encoder…')
      try {
        await LN.fontsReady(fontLoads(scene))
        clearMeasureCaches()
        rStatus.replaceChildren('Rendering. Keep this page open.')
        const t0 = performance.now()
        const res = await LN.media.renderCanvasVideo({
          width: w,
          height: hh,
          fps,
          duration: scene.duration,
          signal: st.renderAC.signal,
          draw: (ctx, t) => renderScene(ctx, scene, t),
          onProgress: (d, n) => setProgress(d, n, t0),
        })
        const secs = ((performance.now() - t0) / 1000).toFixed(1)
        showResult(res, scene, w, hh, fps)
        rStatus.className = 'fm-status ok'
        rStatus.replaceChildren(
          `Rendered ${res.frames} frames in ${secs} s. Tap Save MP4 to keep it.`,
        )
      } catch (e) {
        if (e && e.name === 'AbortError') {
          rStatus.className = 'fm-status'
          rStatus.replaceChildren('Render cancelled.')
        } else {
          rStatus.className = 'fm-status err'
          rStatus.replaceChildren(`Render failed: ${(e && e.message) || e}`)
        }
      } finally {
        st.rendering = false
        st.renderAC = null
        renderBtn.disabled = false
        cancelBtn.hidden = true
        prog.hidden = true
        startLoop()
      }
    }
    function showResult(res, scene, w, hh, fps) {
      if (st.resultURL) URL.revokeObjectURL(st.resultURL)
      const name = `LN_motion_${sceneSlug(scene)}.${res.ext}`
      st.result = { ...res, name }
      st.resultURL = URL.createObjectURL(res.blob)
      video.poster = posterFor(scene, w, hh)
      video.src = st.resultURL
      saveNote.textContent = ''
      const how =
        res.via === 'webcodecs'
          ? `${String(res.codec).toUpperCase()} · frame-accurate`
          : `${res.codec} · real-time capture, frames can drop`
      resultKv.replaceChildren(
        ui.kv([
          ['File', name],
          ['Size', LN.fmt.bytes(res.blob.size)],
          ['Frames', `${res.frames} · ${w}×${hh} · ${fps} fps`],
          ['Encoder', how],
        ]),
      )
      resultBox.hidden = false
    }
    /** A still of the rendered scene at its hero frame, used as the video poster. */
    function posterFor(scene, w, hh) {
      try {
        const k = 360 / Math.min(w, hh)
        const c = document.createElement('canvas')
        c.width = Math.round(w * k)
        c.height = Math.round(hh * k)
        renderScene(
          c.getContext('2d', { alpha: false }),
          scene,
          heroTime(scene),
        )
        return c.toDataURL('image/jpeg', 0.86)
      } catch (_e) {
        return ''
      }
    }
    async function saveResult() {
      if (!st.result) return
      const r = await LN.save({
        filename: st.result.name,
        data: st.result.blob,
        mime: st.result.blob.type,
      })
      if (r === 'saved')
        saveNote.replaceChildren(
          `Saved ${st.result.name}. Next, in CapCut: `,
          ui.path('Overlay', 'Add overlay'),
          '.',
        )
    }

    /* ---------------- first frame */
    let first = null
    if (saved.scene && validateScene(saved.scene).ok)
      first = { scene: saved.scene, tplId: null }
    else {
      const T = TEMPLATES.find(x => x.id === saved.tplId) || TEMPLATES[0]
      const sc = T.scene()
      if (saved.bg && (Object.hasOwn(BG, saved.bg) || HEX_RE.test(saved.bg)))
        sc.background = saved.bg
      first = { scene: sc, tplId: T.id }
    }
    if (typeof saved.fps === 'number' && [24, 30, 60].includes(saved.fps)) {
      st.fps = saved.fps
      st.fpsTouched = true
    }
    if (
      saved.outId &&
      (saved.outId === 'scene' || PRESETS.some(p => p.id === saved.outId))
    )
      st.outId = saved.outId
    setPlayUi()
    const ownFirst = presetFor(first.scene)
    applyScene(first.scene, {
      tplId: first.tplId,
      // keep a remembered preset only when it still fits this scene's frame
      keepOut: st.outId !== 'scene' && ownFirst !== 'scene' && !!saved.outId,
    })
    drawPosters()
    const allFonts = new Set()
    for (const T of TEMPLATES)
      for (const s of fontLoads(T.scene())) allFonts.add(s)
    LN.fontsReady([...allFonts]).then(() => {
      clearMeasureCaches()
      drawPosters()
      drawPreview(true)
    })
  }

  LN.forgeMotion = {
    mount,
    renderScene,
    validateScene,
    templates: TEMPLATES,
    buildPrompt,
    stringify,
    flags,
  }
})()
