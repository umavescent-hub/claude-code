/* modules/type.js — Type & HUD.
   Title cards, HUD stamps, mattes and safe-zone guides, drawn on canvas here and
   saved as pixel-exact transparent PNGs (mattes and guides also as SVG). CapCut
   only places the files, so the type never depends on CapCut's font list.
   Every layout is computed in export pixels; the preview paints the same ops at
   a scale factor k, so preview and export match. */
;(() => {
  const { h, ui } = LN

  /* ============================================================ palette + canvases */
  const COLORS = [
    { id: 'bone', label: 'Bone', hex: '#F4F1EA' },
    { id: 'amber', label: 'Tungsten', hex: '#E5A93C' },
    { id: 'silver', label: 'Lunar silver', hex: '#C8D0DC' },
    { id: 'crimson', label: 'Crimson', hex: '#9E2A2B' },
  ]
  // The warmer under-glow for each text colour: the print blooming on the screen.
  const WARM = {
    bone: '#E0954A',
    amber: '#D8702A',
    silver: '#C98F5C',
    crimson: '#B3381F',
  }
  const hexOf = id => (COLORS.find(c => c.id === id) || COLORS[0]).hex
  const OBSIDIAN = '#08080A'
  const CRIMSON = '#9E2A2B'

  const CANVASES = [
    { id: '16x9', label: '16:9', W: 3840, H: 2160 },
    { id: '9x16', label: '9:16', W: 2160, H: 3840 },
    { id: '4x3', label: '4:3', W: 2880, H: 2160 },
    { id: '1x1', label: '1:1', W: 2160, H: 2160 },
  ]
  const canvasOf = id => CANVASES.find(c => c.id === id) || CANVASES[0]

  /* ============================================================ faces */
  const TITLE_FACES = [
    {
      id: 'cormorant',
      family: 'Cormorant Garamond',
      weight: 600,
      italic: true,
      label: 'Cormorant Garamond SemiBold',
      note: 'High-contrast Garamond. The italic is the house chapter face.',
    },
    {
      id: 'instrument',
      family: 'Instrument Serif',
      weight: 400,
      italic: true,
      label: 'Instrument Serif',
      note: 'Condensed editorial serif. Tight, modern, A24 poster energy.',
    },
    {
      id: 'playfair',
      family: 'Playfair Display',
      weight: 600,
      italic: false,
      label: 'Playfair Display SemiBold',
      note: 'Heavier hairlines, so it survives compression at small sizes.',
    },
  ]
  const META_FACES = [
    {
      id: 'jetbrains',
      family: 'JetBrains Mono',
      weight: 500,
      label: 'JetBrains Mono Medium',
      note: 'Clean, even colour. The default data line.',
    },
    {
      id: 'spacemono',
      family: 'Space Mono',
      weight: 400,
      label: 'Space Mono',
      note: 'Quirkier, retro-technical. Good for lab stamps.',
    },
    {
      id: 'courier',
      family: 'Courier Prime',
      weight: 400,
      label: 'Courier Prime',
      note: 'Typewriter. Reads as a script page or a kitchen ticket.',
    },
  ]
  const faceOf = (list, id) => list.find(f => f.id === id) || list[0]
  const SERIF_FB = 'Georgia, "Times New Roman", serif'
  const MONO_FB = 'ui-monospace, Menlo, Consolas, monospace'
  const fontCss = (f, px) =>
    `${f.italic ? 'italic ' : ''}${f.weight} ${Math.max(0.5, px).toFixed(2)}px "${f.face.family}", ${f.mono ? MONO_FB : SERIF_FB}`
  const fontSpec = f =>
    `${f.italic ? 'italic ' : ''}${f.weight} 64px "${f.face.family}"`

  // Font loading: await each spec once, redraw whenever the page finishes loading fonts.
  const loaded = new Set()
  async function ensureFonts(specs) {
    const want = specs.filter(s => !loaded.has(s))
    if (!want.length) return
    await LN.fontsReady(want)
    for (const s of want) loaded.add(s)
  }

  /* ============================================================ tracked text */
  const probe = document.createElement('canvas').getContext('2d')
  const HAS_LS = !!probe && 'letterSpacing' in probe
  let LS_TRAIL = true
  if (HAS_LS) {
    probe.font = '40px monospace'
    probe.letterSpacing = '0px'
    const a = probe.measureText('AAAA').width
    probe.letterSpacing = '10px'
    const b = probe.measureText('AAAA').width
    probe.letterSpacing = '0px'
    LS_TRAIL = b - a > 35
  }
  function textW(ctx, text, track) {
    if (!text) return 0
    if (HAS_LS) {
      ctx.letterSpacing = `${track}px`
      const w = ctx.measureText(text).width - (LS_TRAIL ? track : 0)
      ctx.letterSpacing = '0px'
      return w
    }
    let w = 0
    for (const ch of text) w += ctx.measureText(ch).width + track
    return w - track
  }
  function fillT(ctx, text, x, y, align, track) {
    const w = textW(ctx, text, track)
    let sx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
    ctx.textAlign = 'left'
    if (HAS_LS) {
      ctx.letterSpacing = `${track}px`
      ctx.fillText(text, sx, y)
      ctx.letterSpacing = '0px'
      return
    }
    for (const ch of text) {
      ctx.fillText(ch, sx, y)
      sx += ctx.measureText(ch).width + track
    }
  }
  /** Width of text in export pixels. font: {face, weight, italic, mono, px}, trackEm. */
  function measure(text, font, trackEm) {
    probe.font = fontCss(font, font.px)
    return textW(probe, text, trackEm * font.px)
  }

  /* ============================================================ painter
     ops (export pixels): text {text, font, color, alpha, x, y, align, trackEm}
     rect {x,y,w,h,color,alpha} · circle {x,y,r,color} · path {pts, lw, color, alpha} */
  function paintOps(ctx, ops, k) {
    ctx.save()
    ctx.textBaseline = 'middle'
    for (const o of ops) {
      ctx.globalAlpha = o.alpha == null ? 1 : o.alpha
      if (o.t === 'text') {
        if (!o.text) continue
        ctx.fillStyle = o.color
        ctx.font = fontCss(o.font, o.font.px * k)
        fillT(ctx, o.text, o.x * k, o.y * k, o.align, o.trackEm * o.font.px * k)
      } else if (o.t === 'rect') {
        ctx.fillStyle = o.color
        const hgt = k === 1 ? o.h : Math.max(o.h * k, 0.8)
        const wid = k === 1 ? o.w : Math.max(o.w * k, 0.8)
        ctx.fillRect(o.x * k, o.y * k, wid, hgt)
      } else if (o.t === 'circle') {
        ctx.fillStyle = o.color
        ctx.beginPath()
        ctx.arc(o.x * k, o.y * k, o.r * k, 0, Math.PI * 2)
        ctx.fill()
      } else if (o.t === 'path') {
        ctx.strokeStyle = o.color
        ctx.lineWidth = Math.max(o.lw * k, k === 1 ? 1 : 0.8)
        ctx.lineCap = 'butt'
        ctx.lineJoin = 'miter'
        ctx.beginPath()
        o.pts.forEach(([x, y], i) => {
          if (i) ctx.lineTo(x * k, y * k)
          else ctx.moveTo(x * k, y * k)
        })
        ctx.stroke()
      }
    }
    ctx.restore()
  }
  const brackets = (x0, y0, x1, y1, arm, lw, color, alpha = 1) =>
    [
      [
        [x0, y0 + arm],
        [x0, y0],
        [x0 + arm, y0],
      ],
      [
        [x1 - arm, y0],
        [x1, y0],
        [x1, y0 + arm],
      ],
      [
        [x1, y1 - arm],
        [x1, y1],
        [x1 - arm, y1],
      ],
      [
        [x0 + arm, y1],
        [x0, y1],
        [x0, y1 - arm],
      ],
    ].map(pts => ({ t: 'path', pts, lw, color, alpha }))

  /* ============================================================ title card layouts */
  const PRESETS = [
    {
      id: 'chapter',
      label: 'Chapter card',
      size: 10,
      desc: 'Centred serif italic, a mono eyebrow above, a thin rule, the data lines below. Act breaks and episode openers.',
    },
    {
      id: 'lower',
      label: 'Lower third',
      size: 5.4,
      desc: 'Left-aligned name and place over a hairline accent bar. Introduces a person, a farm, a supplier.',
    },
    {
      id: 'lab',
      label: 'Lab stamp',
      size: 3.2,
      desc: 'A mono HUD block in the top-left corner, title set in the meta face. R&D batches and test numbers.',
    },
    {
      id: 'pass',
      label: 'Pass ticket',
      size: 7.6,
      desc: 'Bottom-left title on a long rule with the batch code under it, like a ticket on the pass.',
    },
    {
      id: 'negative',
      label: 'Negative space',
      size: 3.6,
      desc: 'A small title in the lower-right third and nothing else. Let the frame breathe.',
    },
  ]
  const presetOf = id => PRESETS.find(p => p.id === id) || PRESETS[0]

  const CARD_DEFAULT = {
    preset: 'chapter',
    canvas: '16x9',
    bg: 'transparent',
    eyebrow: 'ROAD TO THREE STARS — EP. 07',
    title: 'The Reduction',
    meta: 'R&D // BATCH 042 — AGED DUCK & KOJI JUS',
    detail: '113MM // F2.8 // 3200K // 1/48S',
    titleFace: 'cormorant',
    italic: true,
    metaFace: 'jetbrains',
    titleSize: 10,
    titleTrack: -1,
    metaSize: 1.7,
    metaTrack: 22,
    titleColor: 'bone',
    metaColor: 'silver',
    accent: 'amber',
    glow: true,
    glowAmt: 55,
    glowRad: 1.4,
    safe: false,
  }

  const up = s => String(s || '').toUpperCase()

  /** Stack items top-down from y. items: {h, op(cy) → op|op[]} or {gap}. */
  function stack(items, y) {
    const ops = []
    let cy = y
    items.forEach((it, i) => {
      if (it.gap != null) {
        const prev = items[i - 1]
        const next = items[i + 1]
        if (prev && next && prev.h != null && next.h != null) cy += it.gap
        return
      }
      const r = it.op(cy + it.h / 2)
      if (Array.isArray(r)) ops.push(...r)
      else if (r) ops.push(r)
      cy += it.h
    })
    return { ops, end: cy }
  }
  const stackH = items =>
    items.reduce((sum, it, i) => {
      if (it.gap != null) {
        const prev = items[i - 1]
        const next = items[i + 1]
        return prev && next && prev.h != null && next.h != null
          ? sum + it.gap
          : sum
      }
      return sum + it.h
    }, 0)
  // Drop items whose text is empty, then drop orphan gaps (stack() skips those).
  const only = items => items.filter(it => it && (it.gap != null || it.h > 0))

  /** All drawing ops for one title card at export size W×H. */
  function cardOps(s, W, H) {
    const U = Math.min(W, H) / 100
    const portrait = H > W
    const tFace = faceOf(TITLE_FACES, s.titleFace)
    const mFace = faceOf(META_FACES, s.metaFace)
    const cT = hexOf(s.titleColor)
    const cM = hexOf(s.metaColor)
    const cA = hexOf(s.accent)
    const eyebrow = up(s.eyebrow).trim()
    const meta = up(s.meta).trim()
    const detail = up(s.detail).trim()
    const title = String(s.title || '').trim()
    const mono = (px, weight) => ({
      face: mFace,
      weight: weight || mFace.weight,
      italic: false,
      mono: true,
      px,
    })
    const mPx = s.metaSize * U
    const ePx = mPx * 0.92
    const dPx = mPx * 0.86
    const mTr = s.metaTrack / 100
    const tTr = s.titleTrack / 100
    const titleFont = {
      face: tFace,
      weight: tFace.weight,
      italic: !!s.italic,
      mono: false,
      px: s.titleSize * U,
    }
    // Scale a font down until the text fits maxW. Returns the final width.
    const fit = (text, font, trackEm, maxW) => {
      const w = measure(text, font, trackEm)
      if (w > maxW && w > 0) {
        font.px *= maxW / w
        return maxW
      }
      return w
    }
    const T = (text, font, color, x, y, align, trackEm, alpha = 1) => ({
      t: 'text',
      text,
      font,
      color,
      x,
      y,
      align,
      trackEm,
      alpha,
    })
    const side = portrait ? W * 0.075 : W * 0.07
    const rail = portrait ? W * (150 / 1080) : W * 0.07
    // Bottom anchor: portrait sits above the 484 px caption band (scaled from 1080×1920).
    const base = f => (portrait ? H * (1 - 520 / 1920) : H * f)
    const hair = Math.max(2, Math.round(0.09 * U))
    const p = s.preset

    if (p === 'chapter') {
      const cx = W / 2
      const tW = fit(title, titleFont, tTr, W * (portrait ? 0.84 : 0.78))
      const tPx = titleFont.px
      fit(meta, mono(mPx), mTr, W * 0.86)
      const items = only([
        eyebrow && {
          h: ePx,
          op: y => T(eyebrow, mono(ePx), cA, cx, y, 'center', mTr),
        },
        { gap: tPx * 0.5 },
        title && {
          h: tPx * 0.9,
          op: y => T(title, titleFont, cT, cx, y, 'center', tTr),
        },
        { gap: tPx * 0.42 },
        {
          h: hair,
          op: y => ({
            t: 'rect',
            x: cx - Math.min(8 * U, tW * 0.3 || 8 * U) / 2,
            y: y - hair / 2,
            w: Math.min(8 * U, tW * 0.3 || 8 * U),
            h: hair,
            color: cA,
            alpha: 0.85,
          }),
        },
        { gap: mPx * 1.5 },
        meta && {
          h: mPx,
          op: y => T(meta, mono(mPx), cM, cx, y, 'center', mTr),
        },
        { gap: mPx * 0.9 },
        detail && {
          h: dPx,
          op: y => T(detail, mono(dPx), cM, cx, y, 'center', mTr, 0.66),
        },
      ])
      return stack(items, H * 0.48 - stackH(items) / 2).ops
    }

    if (p === 'lower') {
      const bar = Math.max(2, Math.round(0.14 * U))
      const x0 = side + 2.4 * U
      fit(title, titleFont, tTr, (portrait ? W - x0 - rail : W * 0.6) - 0)
      const tPx = titleFont.px
      const items = only([
        eyebrow && {
          h: ePx,
          op: y => T(eyebrow, mono(ePx), cA, x0, y, 'left', mTr),
        },
        { gap: tPx * 0.42 },
        title && {
          h: tPx * 0.92,
          op: y => T(title, titleFont, cT, x0, y, 'left', tTr),
        },
        { gap: mPx * 1.3 },
        meta && {
          h: mPx,
          op: y => T(meta, mono(mPx), cM, x0, y, 'left', mTr),
        },
        { gap: mPx * 0.9 },
        detail && {
          h: dPx,
          op: y => T(detail, mono(dPx), cM, x0, y, 'left', mTr, 0.66),
        },
      ])
      const tot = stackH(items)
      const y0 = base(0.86) - tot
      const r = stack(items, y0)
      return [
        {
          t: 'rect',
          x: side,
          y: y0 - 0.3 * U,
          w: bar,
          h: tot + 0.6 * U,
          color: cA,
          alpha: 0.9,
        },
        ...r.ops,
      ]
    }

    if (p === 'lab') {
      const pad = 2 * U
      const x0 = side + pad
      const y0 = (portrait ? H * 0.085 : H * 0.085) + pad
      const tf = mono(s.titleSize * U, 700)
      const tText = up(title)
      const labTr = Math.max(0.04, mTr * 0.45)
      const maxW = (portrait ? W - rail : W * 0.62) - x0 - pad
      fit(tText, tf, labTr, maxW)
      const dot = ePx * 0.3
      const ew = eyebrow
        ? measure(eyebrow, mono(ePx), mTr) + dot * 2 + ePx * 0.7
        : 0
      const widths = [
        ew,
        measure(tText, tf, labTr),
        meta ? measure(meta, mono(mPx), mTr) : 0,
        detail ? measure(detail, mono(dPx), mTr) : 0,
      ]
      const cw = Math.min(maxW, Math.max(...widths, 10 * U))
      const items = only([
        eyebrow && {
          h: ePx,
          op: y => [
            { t: 'circle', x: x0 + dot, y, r: dot, color: CRIMSON },
            T(eyebrow, mono(ePx), cA, x0 + dot * 2 + ePx * 0.7, y, 'left', mTr),
          ],
        },
        { gap: tf.px * 0.62 },
        tText && {
          h: tf.px,
          op: y => T(tText, tf, cT, x0, y, 'left', labTr),
        },
        { gap: tf.px * 0.62 },
        {
          h: hair,
          op: y => ({
            t: 'rect',
            x: x0,
            y: y - hair / 2,
            w: cw,
            h: hair,
            color: cM,
            alpha: 0.4,
          }),
        },
        { gap: mPx * 1.15 },
        meta && {
          h: mPx,
          op: y => T(meta, mono(mPx), cM, x0, y, 'left', mTr),
        },
        { gap: mPx * 0.9 },
        detail && {
          h: dPx,
          op: y => T(detail, mono(dPx), cM, x0, y, 'left', mTr, 0.66),
        },
      ])
      const r = stack(items, y0)
      const arm = 2.2 * U
      return [
        ...brackets(
          x0 - pad,
          y0 - pad,
          x0 + cw + pad,
          r.end + pad,
          arm,
          hair,
          cM,
          0.75,
        ),
        ...r.ops,
      ]
    }

    if (p === 'pass') {
      const x0 = side
      const ruleMax = portrait ? W - x0 - rail : W * 0.62
      const tW = fit(title, titleFont, tTr, ruleMax)
      const tPx = titleFont.px
      const mw = meta ? measure(meta, mono(mPx), mTr) : 0
      const dw = detail ? measure(detail, mono(dPx), mTr) : 0
      const oneRow = mw + dw + 5 * U <= ruleMax
      const ruleW = Math.min(
        ruleMax,
        Math.max(
          portrait ? ruleMax : W * 0.46,
          tW,
          oneRow ? mw + dw + 5 * U : Math.max(mw, dw),
        ),
      )
      const items = only([
        eyebrow && {
          h: ePx,
          op: y => T(eyebrow, mono(ePx), cA, x0, y, 'left', mTr),
        },
        { gap: tPx * 0.36 },
        title && {
          h: tPx * 0.92,
          op: y => T(title, titleFont, cT, x0, y, 'left', tTr),
        },
        { gap: tPx * 0.3 },
        {
          h: hair,
          op: y => ({
            t: 'rect',
            x: x0,
            y: y - hair / 2,
            w: ruleW,
            h: hair,
            color: cA,
            alpha: 0.85,
          }),
        },
        { gap: mPx * 1.2 },
        (meta || detail) && {
          h: oneRow ? mPx : mPx + (meta && detail ? mPx * 0.9 + dPx : 0),
          op: y => {
            if (oneRow)
              return [
                T(meta, mono(mPx), cM, x0, y, 'left', mTr),
                T(detail, mono(dPx), cM, x0 + ruleW, y, 'right', mTr, 0.66),
              ]
            const top = y - (mPx + mPx * 0.9 + dPx) / 2 + mPx / 2
            return [
              T(meta, mono(mPx), cM, x0, top, 'left', mTr),
              T(
                detail,
                mono(dPx),
                cM,
                x0,
                top + mPx / 2 + mPx * 0.9 + dPx / 2,
                'left',
                mTr,
                0.66,
              ),
            ]
          },
        },
      ])
      const tot = stackH(items)
      return stack(items, base(0.87) - tot).ops
    }

    // negative space
    const x1 = portrait ? W - rail - W * 0.02 : W * 0.925
    fit(title, titleFont, tTr, portrait ? W * 0.6 : W * 0.4)
    const tPx = titleFont.px
    const e2 = ePx * 0.86
    const m2 = mPx * 0.86
    const d2 = dPx * 0.86
    const items = only([
      eyebrow && {
        h: e2,
        op: y => T(eyebrow, mono(e2), cA, x1, y, 'right', mTr, 0.9),
      },
      { gap: tPx * 0.5 },
      title && {
        h: tPx * 0.92,
        op: y => T(title, titleFont, cT, x1, y, 'right', tTr),
      },
      { gap: tPx * 0.5 },
      meta && {
        h: m2,
        op: y => T(meta, mono(m2), cM, x1, y, 'right', mTr, 0.85),
      },
      { gap: m2 * 0.9 },
      detail && {
        h: d2,
        op: y => T(detail, mono(d2), cM, x1, y, 'right', mTr, 0.55),
      },
    ])
    const tot = stackH(items)
    return stack(items, base(0.885) - tot).ops
  }

  function cardFonts(s) {
    const tFace = faceOf(TITLE_FACES, s.titleFace)
    const mFace = faceOf(META_FACES, s.metaFace)
    return [
      fontSpec({ face: tFace, weight: tFace.weight, italic: !!s.italic }),
      fontSpec({ face: mFace, weight: mFace.weight }),
      fontSpec({ face: mFace, weight: 700 }),
    ]
  }

  /* ============================================================ compositing */
  const scratch = {}
  function scratchCanvas(name, W, H, keep) {
    let c = keep ? scratch[name] : null
    if (!c) {
      c = document.createElement('canvas')
      if (keep) scratch[name] = c
    }
    if (c.width !== W || c.height !== H) {
      c.width = W
      c.height = H
    }
    return c
  }
  function letterboxBars(ctx, W, H) {
    const bar = barsFor(W, H, 2.39)
    ctx.fillStyle = '#000000'
    if (bar.mode === 'letter') {
      ctx.fillRect(0, 0, W, bar.size)
      ctx.fillRect(0, H - bar.size, W, bar.size)
    } else {
      ctx.fillRect(0, 0, bar.size, H)
      ctx.fillRect(W - bar.size, 0, bar.size, H)
    }
  }
  /**
   * Paint a title card into canvas (pixel size = export size × k).
   * Aura glow: the text layer is laid back three times through growing blurs in its
   * own colour, plus a warmer, wider, slightly dropped under-glow — a projected print
   * blooming. Composited with 'lighter' so the halo adds light, never mud.
   */
  function paintCard(canvas, s, k, keep) {
    const W = canvas.width
    const H = canvas.height
    const cv = canvasOf(s.canvas)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    const layer = scratchCanvas('layer', W, H, keep)
    const lctx = layer.getContext('2d')
    lctx.clearRect(0, 0, W, H)
    paintOps(lctx, cardOps(s, cv.W, cv.H), k)
    if (s.bg === 'obsidian') {
      ctx.fillStyle = OBSIDIAN
      ctx.fillRect(0, 0, W, H)
    } else if (s.bg === 'letterbox') {
      letterboxBars(ctx, W, H)
    }
    if (s.glow && s.glowAmt > 0 && 'filter' in ctx) {
      const R = (s.glowRad / 100) * cv.W * k
      const I = s.glowAmt / 100
      const tint = scratchCanvas('tint', W, H, keep)
      const tctx = tint.getContext('2d')
      tctx.clearRect(0, 0, W, H)
      tctx.globalCompositeOperation = 'source-over'
      tctx.drawImage(layer, 0, 0)
      tctx.globalCompositeOperation = 'source-in'
      tctx.fillStyle = WARM[s.titleColor] || WARM.bone
      tctx.fillRect(0, 0, W, H)
      tctx.globalCompositeOperation = 'source-over'
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.filter = `blur(${(R * 1.35).toFixed(2)}px)`
      ctx.globalAlpha = Math.min(1, I * 0.8)
      ctx.drawImage(tint, 0, R * 0.14)
      const passes = [
        [0.1, 0.9],
        [0.36, 0.62],
        [1, 0.42],
      ]
      for (const [f, a] of passes) {
        ctx.filter = `blur(${Math.max(0.3, R * f).toFixed(2)}px)`
        ctx.globalAlpha = Math.min(1, I * a)
        ctx.drawImage(layer, 0, 0)
      }
      ctx.restore()
      if (!keep) {
        tint.width = 0
        tint.height = 0
      }
    }
    ctx.drawImage(layer, 0, 0)
    if (!keep) {
      layer.width = 0
      layer.height = 0
    }
  }

  /* ============================================================ HUD stamp */
  const LENSES = [
    { mm: 12, ap: '1.7', note: 'Ultrawide' },
    { mm: 24, ap: '1.68', note: 'Main 1x' },
    { mm: 48, ap: '1.68', note: 'Main 2x crop' },
    { mm: 113, ap: '2.8', note: '5x tele' },
  ]
  const SHUTTERS = [24, 30, 48, 50, 60, 96, 100, 120, 250]
  const ISOS = [50, 100, 200, 400, 800, 1600, 3200]
  const HUD_DEFAULT = {
    canvas: '16x9',
    lens: 113,
    ap: '2.8',
    kelvin: 3200,
    shutter: 48,
    iso: 400,
    fps: 24,
    tc: '00:42:17:08',
    label: 'R&D // BATCH 042',
    rec: true,
    corners: true,
    cross: true,
    hist: true,
    size: 1.7,
    color: 'silver',
    face: 'jetbrains',
  }
  const HIST = Array.from({ length: 56 }, (_, i) => {
    // A Lunar Night histogram shape: crushed-black spike, violet shadow hump,
    // thin mids, a little spike for the light cores. A glyph, not a measurement.
    const x = i / 55
    const g = (c, w) => Math.exp(-(((x - c) / w) ** 2))
    return Math.min(
      1,
      0.96 * g(0, 0.035) +
        0.52 * g(0.2, 0.09) +
        0.2 * g(0.56, 0.12) +
        0.16 * g(0.965, 0.018) +
        0.025 +
        0.035 * Math.abs(Math.sin(i * 1.7)),
    )
  })
  const tcOk = tc => /^\d{2}:\d{2}:\d{2}[:;]\d{2}$/.test(tc)
  const hudLensLine = s =>
    `${s.lens}MM // F${s.ap} // ${s.kelvin}K // 1/${s.shutter}S // ISO ${s.iso}`
  const angleOf = s => Math.round((360 * s.fps) / s.shutter)

  function hudOps(s, W, H) {
    const U = Math.min(W, H) / 100
    const c = hexOf(s.color)
    const face = faceOf(META_FACES, s.face)
    const px = s.size * U
    const f = (p, w) => ({
      face,
      weight: w || face.weight,
      italic: false,
      mono: true,
      px: p,
    })
    const tr = 0.16
    const m = 4.2 * U
    const lw = Math.max(2, Math.round(0.11 * U))
    const ops = []
    const T = (text, font, x, y, align, color = c, alpha = 1) => ({
      t: 'text',
      text,
      font,
      color,
      x,
      y,
      align,
      trackEm: tr,
      alpha,
    })
    if (s.corners)
      ops.push(...brackets(m, m, W - m, H - m, 5.2 * U, lw, c, 0.85))
    const ix = m + 2.2 * U
    const top = m + 2.4 * U
    const bottom = H - m - 2.4 * U
    // top-left: REC + timecode
    let x = ix
    if (s.rec) {
      const r = px * 0.32
      ops.push({ t: 'circle', x: x + r, y: top, r, color: CRIMSON })
      x += r * 2 + px * 0.6
      ops.push(T('REC', f(px, 700), x, top, 'left'))
      x += measure('REC', f(px, 700), tr) + px * 1.4
    }
    const tc = tcOk(s.tc) ? s.tc : '00:00:00:00'
    ops.push(T(`TC ${tc}`, f(px), x, top, 'left'))
    // top-right: fps + shutter angle, label under it
    ops.push(T(`${s.fps} FPS · ${angleOf(s)}°`, f(px), W - ix, top, 'right'))
    if (s.label)
      ops.push(
        T(up(s.label), f(px * 0.86), W - ix, top + px * 1.9, 'right', c, 0.7),
      )
    // bottom-right: histogram glyph
    let histW = 0
    if (s.hist) {
      histW = 12 * U
      const hh = 4.6 * U
      const x1 = W - ix
      const x0 = x1 - histW
      const yb = bottom + px * 0.5
      const bw = histW / HIST.length
      HIST.forEach((v, i) => {
        const bh = Math.max(lw * 0.5, v * hh)
        ops.push({
          t: 'rect',
          x: x0 + i * bw,
          y: yb - bh,
          w: Math.max(1, bw * 0.72),
          h: bh,
          color: c,
          alpha: 0.78,
        })
      })
      ops.push({
        t: 'rect',
        x: x0,
        y: yb,
        w: histW,
        h: lw,
        color: c,
        alpha: 0.9,
      })
      ops.push(T('LUM', f(px * 0.7), x0, yb - hh - px * 0.9, 'left', c, 0.6))
    }
    // bottom-left: the camera line (split in two when it would hit the histogram)
    const line = hudLensLine(s)
    const room = W - ix * 2 - (histW ? histW + 3 * U : 0)
    if (measure(line, f(px), tr) <= room) {
      ops.push(T(line, f(px), ix, bottom, 'left'))
    } else {
      const a = `${s.lens}MM // F${s.ap} // ${s.kelvin}K`
      const b = `1/${s.shutter}S // ISO ${s.iso}`
      ops.push(T(a, f(px), ix, bottom - px * 1.7, 'left'))
      ops.push(T(b, f(px), ix, bottom, 'left'))
    }
    // centre cross
    if (s.cross) {
      const cx = W / 2
      const cy = H / 2
      const arm = 2.4 * U
      const gap = 0.7 * U
      const o = { t: 'path', lw, color: c, alpha: 0.85 }
      ops.push(
        {
          ...o,
          pts: [
            [cx - arm, cy],
            [cx - gap, cy],
          ],
        },
        {
          ...o,
          pts: [
            [cx + gap, cy],
            [cx + arm, cy],
          ],
        },
        {
          ...o,
          pts: [
            [cx, cy - arm],
            [cx, cy - gap],
          ],
        },
        {
          ...o,
          pts: [
            [cx, cy + gap],
            [cx, cy + arm],
          ],
        },
      )
    }
    return ops
  }
  function paintHud(canvas, s, k) {
    const cv = canvasOf(s.canvas)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    paintOps(ctx, hudOps(s, cv.W, cv.H), k)
  }

  /* ============================================================ mattes + guides */
  /** Bars for a target aspect inside W×H (integers, symmetric). */
  function barsFor(W, H, ar) {
    if (ar > W / H) {
      const size = Math.round((H - W / ar) / 2)
      return { mode: 'letter', size, picW: W, picH: H - size * 2 }
    }
    const size = Math.round((W - H * ar) / 2)
    return { mode: 'pillar', size, picW: W - size * 2, picH: H }
  }
  const MATTES = [
    {
      id: '239-letterbox-16x9',
      name: '2.39:1 letterbox',
      frame: '16:9',
      ar: 2.39,
      use: 'Scope widescreen inside a 16:9 master.',
    },
    {
      id: '239-letterbox-9x16',
      name: '2.39:1 letterbox',
      frame: '9:16',
      ar: 2.39,
      use: 'A cinema strip floating in a vertical reel.',
    },
    {
      id: '43-pillarbox-16x9',
      name: '4:3 pillarbox',
      frame: '16:9',
      ar: 4 / 3,
      use: 'VHS confessions and archive inside a 16:9 master.',
    },
    {
      id: '43-window-9x16',
      name: '4:3 window',
      frame: '9:16',
      ar: 4 / 3,
      use: 'A 4:3 picture is wider than a vertical frame, so its bars land top and bottom.',
    },
    {
      id: '34-window-9x16',
      name: '3:4 window',
      frame: '9:16',
      ar: 3 / 4,
      use: 'Vertical 4:3 for confessions that still fill most of the phone.',
    },
    {
      id: '185-16x9',
      name: '1.85:1 flat',
      frame: '16:9',
      ar: 1.85,
      use: 'The gentle theatrical crop: thin bars, almost no picture lost.',
    },
    {
      id: '185-9x16',
      name: '1.85:1 flat',
      frame: '9:16',
      ar: 1.85,
      use: 'A wide band in a vertical frame for one held establishing shot.',
    },
  ]
  const RES = {
    uhd: { label: '4K UHD', land: [3840, 2160], port: [2160, 3840] },
    hd: { label: '1080p', land: [1920, 1080], port: [1080, 1920] },
  }
  function matteGeom(m, res) {
    const [W, H] = RES[res][m.frame === '9:16' ? 'port' : 'land']
    const b = barsFor(W, H, m.ar)
    const rects =
      b.mode === 'letter'
        ? [
            [0, 0, W, b.size],
            [0, H - b.size, W, b.size],
          ]
        : [
            [0, 0, b.size, H],
            [W - b.size, 0, b.size, H],
          ]
    return { W, H, ...b, rects }
  }
  const matteName = (m, res) => {
    const g = matteGeom(m, res)
    return `LN-matte_${m.id}_${g.W}x${g.H}`
  }
  function matteSvg(m, res) {
    const g = matteGeom(m, res)
    const rects = g.rects
      .map(
        ([x, y, w, hh]) =>
          `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="#000000"/>`,
      )
      .join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.W}" height="${g.H}" viewBox="0 0 ${g.W} ${g.H}" shape-rendering="crispEdges"><title>${m.name} in ${m.frame}, ${g.W}x${g.H}, bars ${g.size} px</title>${rects}</svg>\n`
  }
  function mattePng(m, res) {
    const g = matteGeom(m, res)
    const c = document.createElement('canvas')
    c.width = g.W
    c.height = g.H
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#000000'
    for (const r of g.rects) ctx.fillRect(...r)
    return toPng(c)
  }

  const GUIDES = [
    {
      id: 'house',
      label: 'TikTok house band',
      top: 130,
      bottom: 484,
      right: 140,
      left: 0,
      src: 'HOUSE BAND · RUNBOOK + PLAYBOOK',
      blurb:
        'Your runbook and playbook numbers: keep the top 130 px, right 140 px and bottom 484 px clear.',
    },
    {
      id: 'apps',
      label: 'Shorts · Reels · TikTok',
      top: 220,
      bottom: 420,
      right: 140,
      left: 0,
      src: 'APPROX. ACROSS SHORTS · REELS · TIKTOK',
      blurb:
        'A rough footprint of all three apps: about 220 px of top UI, 420 px of caption and buttons, a 140 px action rail.',
    },
    {
      id: 'strict',
      label: 'Strict cross-post box',
      top: 270,
      bottom: 670,
      right: 160,
      left: 65,
      src: 'STRICT BOX · X 65–920 · Y 270–1250',
      blurb:
        'The tightest box from the platform research (x 65–920, y 270–1250). Text inside it survives every app.',
    },
  ]
  const guideOf = id => GUIDES.find(g => g.id === id) || GUIDES[0]
  const GW = 1080
  const GH = 1920

  /** Guide shapes at 1080×1920: rect {fill, alpha}, line {stroke, w, dash}, text. */
  function guideShapes(gid) {
    const g = guideOf(gid)
    const band = '#9E2A2B'
    const amber = '#E5A93C'
    const silver = '#C8D0DC'
    const sh = []
    const R = (x, y, w, hh) =>
      sh.push({ k: 'rect', x, y, w, h: hh, fill: band, alpha: 0.34 })
    R(0, 0, GW, g.top)
    R(0, GH - g.bottom, GW, g.bottom)
    R(GW - g.right, g.top, g.right, GH - g.top - g.bottom)
    if (g.left) R(0, g.top, g.left, GH - g.top - g.bottom)
    const L = (x1, y1, x2, y2, stroke, w, dash, alpha = 1) =>
      sh.push({ k: 'line', x1, y1, x2, y2, stroke, w, dash, alpha })
    // thirds + centre cross
    for (const x of [GW / 3, (GW * 2) / 3]) L(x, 0, x, GH, silver, 2, null, 0.3)
    for (const y of [GH / 3, (GH * 2) / 3]) L(0, y, GW, y, silver, 2, null, 0.3)
    L(GW / 2 - 36, GH / 2, GW / 2 + 36, GH / 2, silver, 2, null, 0.8)
    L(GW / 2, GH / 2 - 36, GW / 2, GH / 2 + 36, silver, 2, null, 0.8)
    // safe rectangle edges
    const x0 = g.left
    const x1 = GW - g.right
    const y0 = g.top
    const y1 = GH - g.bottom
    L(x0, y0, x1, y0, amber, 3, [18, 10])
    L(x0, y1, x1, y1, amber, 3, [18, 10])
    L(x1, y0, x1, y1, amber, 3, [18, 10])
    if (g.left) L(x0, y0, x0, y1, amber, 3, [18, 10])
    const Tx = (
      text,
      x,
      y,
      size,
      fill,
      anchor = 'middle',
      rot = 0,
      alpha = 1,
    ) => sh.push({ k: 'text', text, x, y, size, fill, anchor, rot, alpha })
    const bone = '#F4F1EA'
    Tx(`TOP UI ≈ ${g.top} PX`, GW / 2, g.top / 2, 26, bone)
    Tx(
      `CAPTION · HANDLE · BUTTONS ≈ ${g.bottom} PX`,
      GW / 2,
      GH - g.bottom / 2 - 20,
      26,
      bone,
    )
    Tx(g.src, GW / 2, GH - g.bottom / 2 + 24, 20, bone, 'middle', 0, 0.75)
    Tx(
      `ACTION RAIL ≈ ${g.right} PX`,
      GW - g.right / 2,
      (y0 + y1) / 2,
      24,
      bone,
      'middle',
      -90,
    )
    Tx('GUIDE ONLY · DELETE BEFORE EXPORT', (x0 + x1) / 2, y0 + 44, 24, amber)
    Tx(
      'TEXT LIVES INSIDE THE DASHED LINE',
      (x0 + x1) / 2,
      y1 - 40,
      20,
      amber,
      'middle',
      0,
      0.85,
    )
    return sh
  }
  function guideCanvas(gid, scale = 1) {
    const c = document.createElement('canvas')
    c.width = Math.round(GW * scale)
    c.height = Math.round(GH * scale)
    paintGuide(c.getContext('2d'), gid, scale)
    return c
  }
  function paintGuide(ctx, gid, k) {
    ctx.save()
    for (const s of guideShapes(gid)) {
      ctx.globalAlpha = s.alpha == null ? 1 : s.alpha
      if (s.k === 'rect') {
        ctx.fillStyle = s.fill
        ctx.fillRect(s.x * k, s.y * k, s.w * k, s.h * k)
      } else if (s.k === 'line') {
        ctx.strokeStyle = s.stroke
        ctx.lineWidth = Math.max(1, s.w * k)
        ctx.setLineDash(s.dash ? s.dash.map(d => d * k) : [])
        ctx.beginPath()
        ctx.moveTo(s.x1 * k, s.y1 * k)
        ctx.lineTo(s.x2 * k, s.y2 * k)
        ctx.stroke()
      } else if (s.k === 'text') {
        ctx.fillStyle = s.fill
        ctx.font = `500 ${s.size * k}px "JetBrains Mono", ${MONO_FB}`
        ctx.textBaseline = 'middle'
        ctx.save()
        ctx.translate(s.x * k, s.y * k)
        if (s.rot) ctx.rotate((s.rot * Math.PI) / 180)
        fillT(ctx, s.text, 0, 0, 'center', s.size * k * 0.14)
        ctx.restore()
      }
    }
    ctx.restore()
  }
  const esc = t =>
    String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  function guideSvg(gid) {
    const g = guideOf(gid)
    const parts = guideShapes(gid).map(s => {
      const op = s.alpha == null || s.alpha === 1 ? '' : ` opacity="${s.alpha}"`
      if (s.k === 'rect')
        return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.fill}"${op}/>`
      if (s.k === 'line')
        return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.stroke}" stroke-width="${s.w}"${s.dash ? ` stroke-dasharray="${s.dash.join(' ')}"` : ''}${op}/>`
      const tf = s.rot ? ` transform="rotate(${s.rot} ${s.x} ${s.y})"` : ''
      return `<text x="${s.x}" y="${s.y}" fill="${s.fill}" font-family="JetBrains Mono, Menlo, monospace" font-weight="500" font-size="${s.size}" letter-spacing="${(s.size * 0.14).toFixed(1)}" text-anchor="${s.anchor}" dominant-baseline="central"${tf}${op}>${esc(s.text)}</text>`
    })
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}" viewBox="0 0 ${GW} ${GH}"><title>Safe-zone guide (${esc(g.label)}), 1080x1920, approximate. Delete before export.</title>${parts.join('')}</svg>\n`
  }

  /* ============================================================ files */
  function toPng(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => {
        if (b) resolve(b)
        else reject(new Error('The PNG could not be encoded (out of memory?)'))
      }, 'image/png')
    })
  }
  async function busy(btn, label, fn) {
    const old = btn.textContent
    btn.disabled = true
    btn.textContent = label
    try {
      return await fn()
    } catch (e) {
      console.warn('[type] export failed', e)
      LN.toast(`Could not make the file: ${e.message || e}`, { kind: 'err' })
      return null
    } finally {
      btn.disabled = false
      btn.textContent = old
    }
  }

  /* ============================================================ small UI helpers */
  function swatches(label, value, onChange) {
    let cur = value
    const btns = COLORS.map(c =>
      h(
        'button',
        {
          type: 'button',
          class: 'ty-swatch',
          'aria-pressed': String(c.id === cur),
          dataset: { v: c.id },
          title: `${c.label} ${c.hex}`,
          onClick: () => api.set(c.id, true),
        },
        h('i', { style: { background: c.hex }, 'aria-hidden': 'true' }),
        h('span', null, c.label),
      ),
    )
    const el = h(
      'div',
      { class: 'ln-field' },
      h('span', { class: 'ln-label' }, label),
      h(
        'div',
        { class: 'ty-swatches', role: 'group', 'aria-label': label },
        btns,
      ),
    )
    const api = {
      el,
      get: () => cur,
      set(v, fire) {
        cur = v
        for (const b of btns)
          b.setAttribute('aria-pressed', String(b.dataset.v === v))
        if (fire) onChange(v)
      },
    }
    return api
  }
  const group = (title, ...kids) =>
    h(
      'fieldset',
      { class: 'ty-group' },
      h('legend', null, title),
      h('div', { class: 'ty-group-body' }, ...kids),
    )
  const loadState = (key, def) => {
    const v = LN.store.get(key, null)
    return v && typeof v === 'object' ? { ...def, ...v } : { ...def }
  }

  /** A preview stage: sizes a canvas to the box, at device pixels, keeping W:H. */
  function stage(o) {
    const cv = h('canvas', {
      class: 'ty-canvas',
      role: 'img',
      'aria-label': o.aria,
    })
    const read = h('div', { class: 'ty-readout' })
    const wrap = h('div', { class: 'ty-frame' }, cv)
    const el = h(
      'div',
      { class: `ty-stage ${o.class || ''}`.trim() },
      wrap,
      read,
    )
    let pending = false
    let cssW = 0
    const size = () => {
      const { W, H } = o.dims()
      const aw = wrap.clientWidth
      if (!aw) return false
      const maxH = Math.min(window.innerHeight * (o.maxVh || 0.6), 760)
      cssW = Math.min(aw, (maxH * W) / H)
      const cssH = (cssW * H) / W
      cv.style.width = `${cssW}px`
      cv.style.height = `${cssH}px`
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      const pw = Math.min(Math.round(cssW * dpr), 1600)
      const ph = Math.round((pw * H) / W)
      if (cv.width !== pw || cv.height !== ph) {
        cv.width = pw
        cv.height = ph
      }
      el.classList.toggle('is-land', W >= H)
      return true
    }
    const draw = () => {
      if (pending) return
      pending = true
      requestAnimationFrame(async () => {
        pending = false
        if (!size()) return
        await ensureFonts(o.fonts())
        const { W } = o.dims()
        o.paint(cv, cv.width / W)
        read.textContent = o.readout()
      })
    }
    if (typeof ResizeObserver === 'function')
      new ResizeObserver(() => draw()).observe(wrap)
    document.fonts?.addEventListener?.('loadingdone', draw)
    return { el, canvas: cv, draw }
  }

  /* ============================================================ section: title card designer */
  function designer(jump) {
    const s = loadState('type.card.v1', CARD_DEFAULT)
    const save = () => LN.store.set('type.card.v1', s)
    const st = stage({
      aria: 'Title card preview',
      class: 'ty-card-stage',
      dims: () => canvasOf(s.canvas),
      fonts: () => cardFonts(s),
      paint: (c, k) => {
        paintCard(c, s, k, true)
        if (s.safe) paintSafe(c, s)
      },
      readout: () => {
        const cv = canvasOf(s.canvas)
        return `${cv.W} × ${cv.H} PX · PNG${s.bg === 'transparent' ? ' · ALPHA' : s.bg === 'letterbox' ? ' · 2.39 BARS' : ' · OBSIDIAN'}${s.glow ? ` · GLOW ${s.glowAmt}` : ''}`
      },
    })
    const set = (k, v) => {
      s[k] = v
      save()
      sync()
      st.draw()
    }

    const presetDesc = h('p', { class: 'ty-desc' })
    const preset = ui.seg({
      label: 'Layout',
      options: PRESETS.map(p => ({ value: p.id, label: p.label })),
      value: s.preset,
      onChange: v => {
        s.preset = v
        s.titleSize = presetOf(v).size
        titleSize.set(s.titleSize)
        set('preset', v)
      },
    })
    const canvasSeg = ui.seg({
      label: 'Canvas',
      options: CANVASES.map(c => ({ value: c.id, label: c.label })),
      value: s.canvas,
      onChange: v => set('canvas', v),
    })
    const bgSeg = ui.seg({
      label: 'Background',
      options: [
        { value: 'transparent', label: 'Transparent' },
        { value: 'obsidian', label: 'Obsidian' },
        { value: 'letterbox', label: 'Letterboxed' },
      ],
      value: s.bg,
      onChange: v => set('bg', v),
    })
    const field = (key, label, ph) =>
      ui.field({
        label,
        value: s[key],
        placeholder: ph,
        onInput: v => set(key, v),
      })
    const fEyebrow = field('eyebrow', 'Eyebrow', 'ROAD TO THREE STARS — EP. 07')
    const fTitle = field('title', 'Title', 'The Reduction')
    const fMeta = field('meta', 'Meta line', 'R&D // BATCH 042')
    const fDetail = field(
      'detail',
      'Detail line',
      '113MM // F2.8 // 3200K // 1/48S',
    )

    const titleFace = ui.select({
      label: 'Title face',
      options: TITLE_FACES.map(f => ({ value: f.id, label: f.label })),
      value: s.titleFace,
      onChange: v => {
        s.italic = faceOf(TITLE_FACES, v).italic
        italic.set(s.italic)
        set('titleFace', v)
      },
    })
    const italic = ui.toggle({
      label: 'Italic',
      checked: s.italic,
      onChange: v => set('italic', v),
    })
    const metaFace = ui.select({
      label: 'Meta face (all caps)',
      options: META_FACES.map(f => ({ value: f.id, label: f.label })),
      value: s.metaFace,
      onChange: v => set('metaFace', v),
    })
    const titleSize = ui.slider({
      label: 'Title size',
      min: 2,
      max: 18,
      step: 0.2,
      value: s.titleSize,
      format: v => `${v.toFixed(1)}% of short side`,
      onInput: v => set('titleSize', v),
    })
    const titleTrack = ui.slider({
      label: 'Title tracking',
      min: -4,
      max: 4,
      step: 0.5,
      value: s.titleTrack,
      format: v => LN.fmt.signed(v, 1),
      onInput: v => set('titleTrack', v),
    })
    const metaSize = ui.slider({
      label: 'Meta size',
      min: 1,
      max: 3.4,
      step: 0.1,
      value: s.metaSize,
      format: v => `${v.toFixed(1)}%`,
      onInput: v => set('metaSize', v),
    })
    const metaTrack = ui.slider({
      label: 'Meta tracking',
      min: 0,
      max: 40,
      step: 1,
      value: s.metaTrack,
      format: v => LN.fmt.signed(v),
      onInput: v => set('metaTrack', v),
    })
    const cTitle = swatches('Title colour', s.titleColor, v =>
      set('titleColor', v),
    )
    const cMeta = swatches('Meta colour', s.metaColor, v => set('metaColor', v))
    const cAccent = swatches('Accent: eyebrow and rules', s.accent, v =>
      set('accent', v),
    )
    const glow = ui.toggle({
      label: 'Aura glow (halation)',
      checked: s.glow,
      onChange: v => set('glow', v),
    })
    const glowAmt = ui.slider({
      label: 'Glow intensity',
      min: 0,
      max: 100,
      step: 1,
      value: s.glowAmt,
      onInput: v => set('glowAmt', v),
    })
    const glowRad = ui.slider({
      label: 'Glow radius',
      min: 0.3,
      max: 4,
      step: 0.1,
      value: s.glowRad,
      format: v => `${v.toFixed(1)}% of width`,
      onInput: v => set('glowRad', v),
    })
    const safe = ui.toggle({
      label: 'Show safe zones (preview only)',
      checked: s.safe,
      onChange: v => set('safe', v),
    })
    const saveBtn = ui.btn('Save PNG (transparent, 4K)', () => exportCard(), {
      id: 'ty-card-save',
      block: true,
    })
    const reset = ui.btn(
      'Reset example',
      () => {
        Object.assign(s, CARD_DEFAULT)
        preset.set(s.preset)
        canvasSeg.set(s.canvas)
        bgSeg.set(s.bg)
        fEyebrow.set(s.eyebrow)
        fTitle.set(s.title)
        fMeta.set(s.meta)
        fDetail.set(s.detail)
        titleFace.set(s.titleFace)
        italic.set(s.italic)
        metaFace.set(s.metaFace)
        titleSize.set(s.titleSize)
        titleTrack.set(s.titleTrack)
        metaSize.set(s.metaSize)
        metaTrack.set(s.metaTrack)
        cTitle.set(s.titleColor)
        cMeta.set(s.metaColor)
        cAccent.set(s.accent)
        glow.set(s.glow)
        glowAmt.set(s.glowAmt)
        glowRad.set(s.glowRad)
        safe.set(s.safe)
        set('preset', s.preset)
      },
      { kind: 'quiet', small: true },
    )
    const equiv = h('div', { class: 'ty-equiv' })

    function sync() {
      presetDesc.textContent = presetOf(s.preset).desc
      const cv = canvasOf(s.canvas)
      saveBtn.textContent =
        s.bg === 'transparent'
          ? 'Save PNG (transparent, 4K)'
          : `Save PNG (${s.bg === 'letterbox' ? 'letterboxed' : 'obsidian'}, 4K)`
      saveBtn.title = `${cv.W} × ${cv.H} px`
      glowAmt.input.disabled = !s.glow
      glowRad.input.disabled = !s.glow
      const tf = faceOf(TITLE_FACES, s.titleFace)
      const mf = faceOf(META_FACES, s.metaFace)
      const titleFaceName =
        s.preset === 'lab' ? `${mf.family} Bold, all caps` : tf.label
      equiv.replaceChildren(
        h('div', { class: 'ln-eyebrow' }, 'Same card typed in CapCut'),
        ui.kv([
          [
            'Title',
            `${titleFaceName}${s.italic && s.preset !== 'lab' ? ' Italic' : ''} · spacing ${LN.fmt.signed(s.titleTrack, 1)}`,
          ],
          [
            'Meta',
            `${mf.label} · all caps · spacing ${LN.fmt.signed(s.metaTrack)} · line spacing +8`,
          ],
          [
            'Colours',
            `${hexOf(s.titleColor)} / ${hexOf(s.metaColor)} / ${hexOf(s.accent)}`,
          ],
          ['Glow', s.glow ? 'Baked into the PNG' : 'Off'],
        ]),
      )
    }

    async function exportCard() {
      const cv = canvasOf(s.canvas)
      await busy(saveBtn, 'Rendering 4K…', async () => {
        await ensureFonts(cardFonts(s))
        const c = document.createElement('canvas')
        c.width = cv.W
        c.height = cv.H
        paintCard(c, s, 1, false)
        const blob = await toPng(c)
        c.width = 0
        c.height = 0
        const name = `LN-title_${LN.fmt.slug(s.title) || 'card'}_${s.preset}_${cv.W}x${cv.H}.png`
        return LN.save({ filename: name, data: blob, mime: 'image/png' })
      })
    }

    sync()
    if (jump) jump.designer = { setFace }
    function setFace(kind, id) {
      if (kind === 'title') {
        titleFace.set(id)
        s.italic = faceOf(TITLE_FACES, id).italic
        italic.set(s.italic)
        set('titleFace', id)
      } else {
        metaFace.set(id)
        set('metaFace', id)
      }
    }

    const controls = h(
      'div',
      { class: 'ty-controls' },
      group('Layout', preset.el, presetDesc, canvasSeg.el, bgSeg.el),
      group('Words', fEyebrow.el, fTitle.el, fMeta.el, fDetail.el),
      group(
        'Type',
        h('div', { class: 'ty-two' }, titleFace.el, metaFace.el),
        italic.el,
        titleSize.el,
        titleTrack.el,
        metaSize.el,
        metaTrack.el,
      ),
      group('Colour', cTitle.el, cMeta.el, cAccent.el),
      group('Aura glow', glow.el, glowAmt.el, glowRad.el),
      h(
        'div',
        { class: 'ty-save' },
        saveBtn,
        h('div', { class: 'ln-row ty-save-row' }, safe.el, reset),
        equiv,
      ),
    )
    return h('div', { class: 'ty-designer' }, st.el, controls)
  }

  /** Preview-only safe-zone marks on the card stage. */
  function paintSafe(c, s) {
    const cv = canvasOf(s.canvas)
    const k = c.width / cv.W
    const ctx = c.getContext('2d')
    ctx.save()
    ctx.strokeStyle = 'rgba(229,169,60,0.85)'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    if (cv.H > cv.W) {
      const f = cv.W / 1080
      const t = 130 * f * k
      const b = 484 * f * k
      const r = 140 * f * k
      ctx.fillStyle = 'rgba(158,42,43,0.22)'
      ctx.fillRect(0, 0, c.width, t)
      ctx.fillRect(0, c.height - b, c.width, b)
      ctx.fillRect(c.width - r, t, r, c.height - t - b)
      ctx.strokeRect(0.5, t, c.width - r - 0.5, c.height - t - b)
    } else {
      // Action safe (93%) and title safe (90%).
      for (const inset of [0.035, 0.05]) {
        const x = c.width * inset
        const y = c.height * inset
        ctx.strokeRect(x, y, c.width - x * 2, c.height - y * 2)
      }
    }
    ctx.restore()
  }

  /* ============================================================ section: HUD stamp */
  function hudSection() {
    const s = loadState('type.hud.v1', HUD_DEFAULT)
    const save = () => LN.store.set('type.hud.v1', s)
    const st = stage({
      aria: 'HUD stamp preview',
      class: 'ty-hud-stage',
      dims: () => canvasOf(s.canvas),
      fonts: () => {
        const f = faceOf(META_FACES, s.face)
        return [
          fontSpec({ face: f, weight: f.weight }),
          fontSpec({ face: f, weight: 700 }),
        ]
      },
      paint: (c, k) => paintHud(c, s, k),
      readout: () => {
        const cv = canvasOf(s.canvas)
        return `${cv.W} × ${cv.H} PX · PNG · ALPHA · ${s.fps} FPS · ${angleOf(s)}° SHUTTER`
      },
    })
    const set = (k, v) => {
      s[k] = v
      save()
      st.draw()
      angle.textContent = `Shutter angle at ${s.fps} fps: ${angleOf(s)}°${angleOf(s) === 360 ? ' (the runbook streak)' : angleOf(s) === 180 ? ' (the 180° rule)' : ''}`
    }
    const angle = h('p', { class: 'ty-desc' })
    const apSel = ui.select({
      label: 'Aperture',
      options: [
        { value: '1.68', label: 'f/1.68 (main)' },
        { value: '1.7', label: 'f/1.7 (ultrawide)' },
        { value: '2.8', label: 'f/2.8 (5x tele)' },
      ],
      value: s.ap,
      onChange: v => set('ap', v),
    })
    const lens = ui.seg({
      label: 'Lens (35 mm equivalent)',
      options: LENSES.map(l => ({ value: l.mm, label: `${l.mm} mm` })),
      value: s.lens,
      onChange: v => {
        const l = LENSES.find(x => x.mm === v)
        s.ap = l.ap
        apSel.set(l.ap)
        set('lens', v)
      },
    })
    const kelvin = ui.slider({
      label: 'White balance',
      min: 2000,
      max: 7500,
      step: 100,
      value: s.kelvin,
      unit: ' K',
      onInput: v => set('kelvin', v),
    })
    const shutter = ui.select({
      label: 'Shutter',
      options: SHUTTERS.map(d => ({ value: d, label: `1/${d} s` })),
      value: s.shutter,
      onChange: v => set('shutter', Number(v)),
    })
    const iso = ui.select({
      label: 'ISO',
      options: ISOS.map(d => ({ value: d, label: String(d) })),
      value: s.iso,
      onChange: v => set('iso', Number(v)),
    })
    const fps = ui.seg({
      label: 'Frame rate',
      options: [24, 30, 60].map(v => ({ value: v, label: `${v} fps` })),
      value: s.fps,
      onChange: v => set('fps', v),
    })
    const tc = ui.field({
      label: 'Timecode start (HH:MM:SS:FF)',
      value: s.tc,
      onInput: v => {
        tc.input.setAttribute('aria-invalid', String(!tcOk(v)))
        set('tc', v)
      },
    })
    const label = ui.field({
      label: 'Top-right label',
      value: s.label,
      onInput: v => set('label', v),
    })
    const tog = (key, text) =>
      ui.toggle({ label: text, checked: s[key], onChange: v => set(key, v) })
    const face = ui.select({
      label: 'Face',
      options: META_FACES.map(f => ({ value: f.id, label: f.label })),
      value: s.face,
      onChange: v => set('face', v),
    })
    const size = ui.slider({
      label: 'Text size',
      min: 1,
      max: 3.2,
      step: 0.1,
      value: s.size,
      format: v => `${v.toFixed(1)}%`,
      onInput: v => set('size', v),
    })
    const colour = ui.seg({
      label: 'HUD colour',
      options: [
        { value: 'silver', label: 'Lunar silver' },
        { value: 'bone', label: 'Bone' },
        { value: 'amber', label: 'Tungsten' },
      ],
      value: s.color,
      onChange: v => set('color', v),
    })
    const canvasSeg = ui.seg({
      label: 'Canvas',
      options: CANVASES.map(c => ({ value: c.id, label: c.label })),
      value: s.canvas,
      onChange: v => set('canvas', v),
    })
    const btn = ui.btn(
      'Save HUD PNG',
      () =>
        busy(btn, 'Rendering…', async () => {
          const cv = canvasOf(s.canvas)
          const f = faceOf(META_FACES, s.face)
          await ensureFonts([
            fontSpec({ face: f, weight: f.weight }),
            fontSpec({ face: f, weight: 700 }),
          ])
          const c = document.createElement('canvas')
          c.width = cv.W
          c.height = cv.H
          paintHud(c, s, 1)
          const blob = await toPng(c)
          c.width = 0
          c.height = 0
          return LN.save({
            filename: `LN-hud_${s.lens}mm_${s.fps}fps_${cv.W}x${cv.H}.png`,
            data: blob,
            mime: 'image/png',
          })
        }),
      { id: 'ty-hud-save', block: true },
    )
    set('lens', s.lens)
    const controls = h(
      'div',
      { class: 'ty-controls' },
      group(
        'Camera',
        lens.el,
        h('div', { class: 'ty-two' }, apSel.el, iso.el),
        kelvin.el,
        h('div', { class: 'ty-two' }, shutter.el, fps.el),
        angle,
      ),
      group('Readout', tc.el, label.el),
      group(
        'Marks',
        h(
          'div',
          { class: 'ty-toggles' },
          tog('rec', 'REC dot'),
          tog('corners', 'Corner frame lines'),
          tog('cross', 'Centre cross'),
          tog('hist', 'Histogram glyph'),
        ),
      ),
      group('Look', face.el, size.el, colour.el, canvasSeg.el),
      h('div', { class: 'ty-save' }, btn),
    )
    return h('div', { class: 'ty-designer' }, st.el, controls)
  }

  /* ============================================================ section: mattes + guides */
  function mattesSection() {
    let res = LN.store.get('type.matteRes', 'uhd')
    if (!RES[res]) res = 'uhd'
    let gid = LN.store.get('type.guide', 'house')
    const cards = h('div', { class: 'ty-mattes' })
    const renderCards = () => {
      cards.replaceChildren(
        ...MATTES.map(m => {
          const g = matteGeom(m, res)
          const thumb = LN.s(
            'svg',
            {
              viewBox: `0 0 ${g.W} ${g.H}`,
              class: `ty-thumb ${m.frame === '9:16' ? 'port' : ''}`,
              role: 'img',
              'aria-label': `${m.name} in ${m.frame}`,
            },
            LN.s('rect', {
              x: 0,
              y: 0,
              width: g.W,
              height: g.H,
              class: 'pic',
            }),
            ...g.rects.map(([x, y, w, hh]) =>
              LN.s('rect', { x, y, width: w, height: hh, class: 'bar' }),
            ),
          )
          const png = ui.btn(
            'PNG',
            () =>
              busy(png, '…', async () =>
                LN.save({
                  filename: `${matteName(m, res)}.png`,
                  data: await mattePng(m, res),
                  mime: 'image/png',
                }),
              ),
            { small: true, kind: 'ghost' },
          )
          png.dataset.matte = m.id
          const svg = ui.btn(
            'SVG',
            () =>
              LN.save({
                filename: `${matteName(m, res)}.svg`,
                data: matteSvg(m, res),
                mime: 'image/svg+xml',
              }),
            { small: true, kind: 'quiet' },
          )
          svg.dataset.matteSvg = m.id
          return h(
            'article',
            { class: 'ty-matte' },
            h('div', { class: 'ty-thumb-box' }, thumb),
            h(
              'div',
              { class: 'ty-matte-body' },
              h(
                'div',
                { class: 'ty-matte-head' },
                h('b', null, m.name),
                ui.chip(`in ${m.frame}`),
              ),
              h('p', { class: 'ty-desc' }, m.use),
              h(
                'p',
                { class: 'ty-nums ln-num' },
                `${g.W}×${g.H} · bars ${g.size} px ${g.mode === 'letter' ? 'top + bottom' : 'left + right'} · picture ${g.picW}×${g.picH}`,
              ),
              h('div', { class: 'ln-row' }, png, svg),
            ),
          )
        }),
      )
    }
    const resSeg = ui.seg({
      label: 'Matte size',
      options: Object.entries(RES).map(([v, r]) => ({
        value: v,
        label: r.label,
      })),
      value: res,
      onChange: v => {
        res = v
        LN.store.set('type.matteRes', v)
        renderCards()
      },
    })
    renderCards()

    // Safe-zone guide
    const gCanvas = h('canvas', {
      class: 'ty-guide-canvas',
      role: 'img',
      'aria-label': 'Safe-zone guide preview, 1080 by 1920',
    })
    const gBlurb = h('p', { class: 'ty-desc' })
    const drawGuide = async () => {
      await ensureFonts(['500 64px "JetBrains Mono"'])
      const k = 0.3
      gCanvas.width = Math.round(GW * k)
      gCanvas.height = Math.round(GH * k)
      paintGuide(gCanvas.getContext('2d'), gid, k)
      gBlurb.textContent = guideOf(gid).blurb
    }
    const gSeg = ui.seg({
      label: 'Guide',
      options: GUIDES.map(g => ({ value: g.id, label: g.label })),
      value: gid,
      onChange: v => {
        gid = v
        LN.store.set('type.guide', v)
        drawGuide()
      },
    })
    drawGuide()
    document.fonts?.addEventListener?.('loadingdone', drawGuide)
    const gPng = ui.btn(
      'Guide PNG (1080×1920)',
      () =>
        busy(gPng, 'Rendering…', async () => {
          await ensureFonts(['500 64px "JetBrains Mono"'])
          return LN.save({
            filename: `LN-guide_safe-zones_${gid}_1080x1920.png`,
            data: await toPng(guideCanvas(gid, 1)),
            mime: 'image/png',
          })
        }),
      { id: 'ty-guide-png' },
    )
    const gSvg = ui.btn(
      'Guide SVG',
      () =>
        LN.save({
          filename: `LN-guide_safe-zones_${gid}_1080x1920.svg`,
          data: guideSvg(gid),
          mime: 'image/svg+xml',
        }),
      { kind: 'quiet', id: 'ty-guide-svg' },
    )
    const zip = ui.btn(
      'All mattes + guides (.zip)',
      () =>
        busy(zip, 'Packing…', async () => {
          await ensureFonts(['500 64px "JetBrains Mono"'])
          const files = []
          for (const m of MATTES) {
            files.push({
              name: `${matteName(m, res)}.png`,
              data: await mattePng(m, res),
            })
            files.push({
              name: `${matteName(m, res)}.svg`,
              data: matteSvg(m, res),
            })
          }
          for (const g of GUIDES) {
            files.push({
              name: `LN-guide_safe-zones_${g.id}_1080x1920.png`,
              data: await toPng(guideCanvas(g.id, 1)),
            })
            files.push({
              name: `LN-guide_safe-zones_${g.id}_1080x1920.svg`,
              data: guideSvg(g.id),
            })
          }
          const blob = await LN.zip(files)
          return LN.save({
            filename: `LN-mattes-guides_${RES[res].label.replace(/\s+/g, '')}.zip`,
            data: blob,
            mime: 'application/zip',
          })
        }),
      { kind: 'ghost', id: 'ty-zip' },
    )

    return h(
      'div',
      { class: 'ln-stack ty-mattes-wrap' },
      h('div', { class: 'ty-bar' }, resSeg.el, zip),
      cards,
      h(
        'p',
        { class: 'ln-muted ln-small' },
        'Bars are pure black (#000000) so they sit on the crushed black floor of the look. Unzip a .zip with Files by Google › tap the zip › Extract.',
      ),
      h(
        'div',
        { class: 'ty-guide' },
        h('div', { class: 'ty-guide-view' }, gCanvas),
        h(
          'div',
          { class: 'ln-stack' },
          h('h3', { class: 'ln-h3' }, '9:16 safe-zone guide · 1080 × 1920'),
          gSeg.el,
          gBlurb,
          h('div', { class: 'ln-row' }, gPng, gSvg),
          ui.callout(
            'verify',
            h(
              'span',
              null,
              'These bands are approximate. No app publishes an organic safe zone; the numbers come from ad specs, practitioner templates and your own runbook, and the UI moves with app version, caption length and music or product chips. Post one private test to each app, screenshot it, and lay this guide over the screenshot.',
            ),
          ),
          ui.callout(
            'rule',
            'Framing aid only. Put the guide on the top track while you edit, then delete it before you export.',
          ),
        ),
      ),
    )
  }

  /* ============================================================ section: font system */
  function fontSection(jump) {
    const disp = TITLE_FACES.map((f, i) =>
      h(
        'article',
        { class: 'ty-spec' },
        h(
          'div',
          { class: 'ty-spec-top' },
          h('span', null, `DISPLAY · 0${i + 1}`),
          h('span', null, 'CapCut spacing −2 to 0'),
        ),
        h(
          'p',
          {
            class: `ty-sample ty-f-${f.id}`,
            style: {
              fontStyle: f.italic ? 'italic' : 'normal',
              fontWeight: String(f.weight),
            },
          },
          h('span', { class: 'ty-act' }, 'ACT II'),
          'The Reduction',
        ),
        h(
          'div',
          { class: 'ty-spec-foot' },
          h(
            'div',
            null,
            h('b', null, `${f.label}${f.italic ? ' Italic' : ''}`),
            h('p', null, f.note),
          ),
          ui.btn(
            'Set as title',
            () => {
              jump.designer?.setFace('title', f.id)
              jump.go('ty-designer')
              LN.toast(`Title face: ${f.label}`)
            },
            { small: true, kind: 'ghost' },
          ),
        ),
      ),
    )
    const lines = [
      'R&D // BATCH 042 — AGED DUCK & KOJI JUS',
      '113MM // F2.8 // 3200K',
      '35.6870° N, 105.9378° W',
    ]
    const meta = META_FACES.map((f, i) =>
      h(
        'article',
        { class: 'ty-spec ty-spec-meta' },
        h(
          'div',
          { class: 'ty-spec-top' },
          h('span', null, `META · 0${i + 1}`),
          h('span', null, 'Spacing +15 to +28 · line +8'),
        ),
        h(
          'div',
          { class: `ty-meta-sample ty-f-${f.id}` },
          lines.map(l => h('p', null, l)),
        ),
        h(
          'div',
          { class: 'ty-spec-foot' },
          h('div', null, h('b', null, f.label), h('p', null, f.note)),
          ui.btn(
            'Set as meta',
            () => {
              jump.designer?.setFace('meta', f.id)
              jump.go('ty-designer')
              LN.toast(`Meta face: ${f.label}`)
            },
            { small: true, kind: 'ghost' },
          ),
        ),
      ),
    )
    return h(
      'div',
      { class: 'ln-stack ty-fonts' },
      ui.table(
        ['Role', 'Faces', 'Case', 'CapCut spacing', 'Line spacing'],
        [
          [
            'Chapter titles',
            'Cormorant Garamond SemiBold Italic, Instrument Serif, Playfair Display',
            'As written',
            '−2 to 0',
            'Default',
          ],
          [
            'Batch codes, lens callouts, GPS',
            'JetBrains Mono, Space Mono, Courier Prime',
            'ALL CAPS',
            '+15 to +28',
            '+8',
          ],
        ],
        { label: 'Font system' },
      ),
      h('div', { class: 'ty-specs' }, disp),
      h('div', { class: 'ty-specs' }, meta),
      ui.callout(
        'rule',
        h(
          'span',
          null,
          'The reliable route: set the card here and save it as a transparent PNG, then place it as an overlay. Font, tracking and glow are baked into the pixels, so nothing depends on which fonts CapCut ships or on how its spacing slider counts.',
        ),
        'Render here, place in CapCut',
      ),
      ui.callout(
        'verify',
        h(
          'span',
          null,
          'Custom fonts in CapCut Mobile: your playbook lists ',
          ui.path('Text', 'Add text', 'Font', 'Import'),
          ' for .ttf and .otf files, but the research could not confirm that path on Android. Check it: open ',
          ui.path('Text', 'Add text'),
          ', look in the Fonts tab for an Import or + button. If it is there, all six faces are free on Google Fonts (SIL Open Font License). If not, use the PNG route. CapCut’s spacing scale is also undocumented, so the −2 to 0 and +15 to +28 numbers are starting points: match them by eye against a PNG from this page.',
        ),
      ),
    )
  }

  /* ============================================================ section: CapCut placement */
  function capcutSection() {
    return h(
      'div',
      { class: 'ln-stack ty-capcut' },
      ui.steps([
        h(
          'span',
          null,
          'Save the PNG here. It lands in Downloads; if it is inside a .zip, open Files by Google, tap the zip and choose Extract.',
        ),
        h(
          'span',
          null,
          'In CapCut, park the playhead where the card starts, with nothing selected. Tap ',
          ui.path('Overlay', 'Add overlay', 'Photos'),
          ' and pick the PNG.',
        ),
        h(
          'span',
          null,
          'Pinch the overlay out until its edges meet the frame edges. The PNG has the same shape as the frame, so at full frame every element sits where you set it here.',
        ),
        h(
          'span',
          null,
          'Set the duration: drag the overlay clip’s end handle on the timeline. Chapter cards hold about 3–4 s; HUD stamps can run the whole shot.',
        ),
        h(
          'span',
          null,
          'Optional: select the overlay and tap ',
          ui.path('Animation', 'In'),
          ' (a slow fade) and ',
          ui.path('Animation', 'Out'),
          '. Keep it to a fade: the brand never animates type with bounces or slides.',
        ),
        h(
          'span',
          null,
          'Mattes go on the top overlay track, above titles and footage. Guides go on top while you frame, then get deleted before ',
          ui.path('Export'),
          '.',
        ),
      ]),
      ui.callout(
        'verify',
        h(
          'span',
          null,
          'Labels vary by CapCut build. ',
          ui.path('Overlay', 'Add overlay'),
          ' is confirmed in your notes; the Photos tab name, whether a still overlay defaults to 3 s, whether the overlay snaps to the frame edges, and the Animation tab names are not. Do one dry run with a matte: if it does not fill the frame exactly, pinch until the black bars touch the frame edges.',
        ),
      ),
      ui.callout(
        'tip',
        'Leave the overlay’s Blend on Normal for titles, HUD stamps and mattes. The glow is already in the PNG’s alpha, so Screen would double it.',
      ),
    )
  }

  /* ============================================================ register */
  LN.register({
    id: 'type',
    num: 6,
    title: 'Type & HUD',
    short: 'Type',
    kicker: 'TITLES',
    blurb:
      'Chapter cards, HUD stamps, mattes and safe-zone guides, set here and saved as pixel-exact transparent PNGs.',
    lede: 'Set every title, camera stamp and matte here, then save it as a transparent PNG at full 4K. CapCut only has to place the file, so the type, the tracking and the glow look the same on every phone.',
    outputs: [
      '4K transparent PNG title cards',
      'HUD stamps',
      'Letterbox & pillarbox mattes',
      'Safe-zone guides',
    ],
    mount(el) {
      const ids = {}
      const jump = {
        go: id => {
          const t = ids[id]
          if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' })
        },
      }
      const sec = (id, o, body) => {
        const x = ui.section({ ...o, id }, body)
        ids[id] = x
        return x
      }
      const index = h(
        'nav',
        { class: 'ty-index', 'aria-label': 'On this page' },
        [
          ['ty-designer', 'Title card'],
          ['ty-hud', 'HUD stamp'],
          ['ty-mattes', 'Mattes & guides'],
          ['ty-fonts', 'Font system'],
          ['ty-capcut', 'Into CapCut'],
        ].map(([id, label], i) =>
          h(
            'button',
            { type: 'button', onClick: () => jump.go(id) },
            h('span', null, LN.fmt.pad(i + 1)),
            label,
          ),
        ),
      )
      el.append(
        index,
        sec(
          'ty-designer',
          {
            eyebrow: '01 · Title card designer',
            title: 'Set the card, save the pixels',
            lede: 'A filled example is loaded. Change the words, pick a layout, and save a 4K PNG with a real alpha channel. The checkerboard is the preview only; it is not in the file.',
          },
          designer(jump),
        ),
        sec(
          'ty-hud',
          {
            eyebrow: '02 · HUD stamp',
            title: 'The camera, written on the frame',
            lede: 'A still overlay in the language of a cinema monitor: lens, aperture, Kelvin, shutter, ISO, frame rate and a start timecode. The stamp is a still, so the timecode shows the start value and does not run.',
          },
          hudSection(),
        ),
        sec(
          'ty-mattes',
          {
            eyebrow: '03 · Mattes & guides',
            title: 'Bars, windows and the safe band',
            lede: 'Exact-pixel mattes as PNG and SVG, plus a 9:16 framing guide that shows where the apps’ buttons and captions cover the frame.',
          },
          mattesSection(),
        ),
        sec(
          'ty-fonts',
          {
            eyebrow: '04 · Font system',
            title: 'Two voices: the serif and the data line',
            lede: 'A high-contrast serif for chapter titles at tight tracking, and an all-caps mono for the facts: batch codes, lens callouts, coordinates. One pairing per series.',
          },
          fontSection(jump),
        ),
        sec(
          'ty-capcut',
          {
            eyebrow: '05 · Into CapCut',
            title: 'Place a PNG overlay',
            lede: 'The same six taps for every file on this page.',
          },
          capcutSection(),
        ),
      )
    },
  })
})()
