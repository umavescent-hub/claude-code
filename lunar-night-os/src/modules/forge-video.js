/* Lunar Night OS: modules/forge-video.js, Overlay Forge (a tab inside Forge).
   Six looping texture plates, drawn by pure, seeded canvas renderers:
     RENDERERS[id](ctx, w, h, t, params, rng)
       t       seconds from the start of the clip
       params  the plate's sliders plus { variant, fps, duration, seed }
       rng     frameRng(seed, frame): rng() is fresh each frame,
               rng.fork(...key) is the same on every frame (stable layouts)
   Noise is seeded by (seed, frame), so the preview, the still and the MP4 show
   the same frames. Anything that moves completes whole cycles per loop, so
   plates loop cleanly. Every size is relative to the short side of the frame
   (u = short / 1080), so the look holds from a thumbnail to 4K.
   LN.forgeVideo = { mount, RENDERERS, PLATES, rng, defaults, render, renderClip } */
;(() => {
  const LN = window.LN
  const { h, ui } = LN
  const { clamp, lerp, smoothstep } = LN.math
  const TAU = Math.PI * 2
  const REF_AREA = 1080 * 1920
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

  /* ------------------------------------------------------------ seeded random */
  /** 32-bit FNV-1a over the parts, finished with a murmur3 avalanche. */
  function hash(...parts) {
    let x = 0x811c9dc5
    for (const part of parts) {
      const s = String(part)
      for (let i = 0; i < s.length; i++) {
        x ^= s.charCodeAt(i)
        x = Math.imul(x, 0x01000193)
      }
      x ^= 0xff
      x = Math.imul(x, 0x01000193)
    }
    x ^= x >>> 16
    x = Math.imul(x, 0x85ebca6b)
    x ^= x >>> 13
    x = Math.imul(x, 0xc2b2ae35)
    x ^= x >>> 16
    return x >>> 0
  }

  /** mulberry32 → [0, 1) */
  function prng(seed) {
    let a = seed >>> 0
    const next = () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    next.state = () => a
    return next
  }

  /** Frame RNG: fresh per (seed, frame). fork(...key) is independent of the frame. */
  function frameRng(seed, frame) {
    const s = Math.trunc(num(seed, 1))
    const f = Math.trunc(num(frame, 0))
    const r = prng(hash(s, 'f', f))
    r.seed = s
    r.frame = f
    r.fork = (...key) => prng(hash(s, ...key))
    return r
  }

  /* ------------------------------------------------------------ shared helpers */
  const pool = new Map()
  /** Reusable offscreen canvas per purpose and size (kept small: big ones are purged). */
  function scratch(key, w, ht) {
    const k = `${key}:${w}x${ht}`
    let c = pool.get(k)
    if (!c) {
      c = document.createElement('canvas')
      c.width = w
      c.height = ht
      pool.set(k, c)
      if (pool.size > 14) {
        const oldest = pool.keys().next().value
        const o = pool.get(oldest)
        pool.delete(oldest)
        o.width = 0
        o.height = 0
      }
    }
    return c
  }
  function purge(maxPixels = 2.6e6) {
    for (const [k, c] of pool) {
      if (c.width * c.height > maxPixels) {
        pool.delete(k)
        c.width = 0
        c.height = 0
      }
    }
  }

  /** Frame unit: the short side over 1080. params.zoom > 1 draws a magnified
   *  crop (used for the small card thumbnails). */
  const unit = (w, ht, p) => (Math.min(w, ht) / 1080) * num(p && p.zoom, 1)
  const loopN = p =>
    Math.max(1, Math.round(num(p.duration, 5) * num(p.fps, 24)))
  const phase = (t, p) => {
    const D = num(p.duration, 5)
    return (((t / D) % 1) + 1) % 1
  }
  /** Wrapped Gaussian pulse around c on the 0..1 loop. */
  const pulse = (ph, c, width) => {
    let d = ph - c
    d -= Math.round(d)
    return Math.exp(-(d * d) / (2 * width * width))
  }
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1)})`

  function reset(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.shadowBlur = 0
    ctx.shadowColor = 'rgba(0,0,0,0)'
    ctx.imageSmoothingEnabled = true
    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'
    ctx.textAlign = 'left'
    if ('filter' in ctx) ctx.filter = 'none'
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  }

  const COL = {
    silver: [200, 208, 220], // #C8D0DC
    ink: [226, 231, 238],
    bone: [244, 241, 234],
    amber: [229, 169, 60], // #E5A93C
    crimson: [158, 42, 43], // #9E2A2B
    // Sear crimson lifted so it reads as light, not as a stain.
    crimsonGlow: [190, 48, 44],
    ember: [226, 98, 50],
    rose: [232, 152, 164],
    champagne: [250, 233, 202],
    rec: [214, 64, 58],
  }

  /* ------------------------------------------------------------ grain fields */
  // Gaussian-ish noise from the sum of four random bytes (Irwin-Hall),
  // mapped through a lookup table. Film grain is soft and clumpy: we draw it
  // at the grain's cell size and let bilinear scaling round the particles.
  const SIGMA4 = 147.8 // σ of the sum of four uniform bytes
  const SIGMA2 = 104.5 // σ of the sum of two
  const lutCache = new Map()
  function levelLut(sigma) {
    const key = `l${Math.round(sigma * 8)}`
    let lut = lutCache.get(key)
    if (!lut) {
      lut = new Uint8ClampedArray(1021)
      const s8 = Math.round(sigma * 8) / 8
      for (let s = 0; s <= 1020; s++) lut[s] = 128 + ((s - 510) / SIGMA4) * s8
      lutCache.set(key, lut)
    }
    return lut
  }
  function offsetLut(sigma, n) {
    const key = `o${n}:${Math.round(sigma * 8)}`
    let lut = lutCache.get(key)
    if (!lut) {
      const mid = n === 4 ? 510 : 255
      const sd = n === 4 ? SIGMA4 : SIGMA2
      const s8 = Math.round(sigma * 8) / 8
      lut = new Int16Array(mid * 2 + 1)
      for (let s = 0; s <= mid * 2; s++)
        lut[s] = Math.round(((s - mid) / sd) * s8)
      lutCache.set(key, lut)
    }
    return lut
  }

  /** Fill a canvas of (cols × rows) cells with grey grain around 128. */
  function grainField(key, cols, rows, sigma, chroma, seed) {
    const c = scratch(key, cols, rows)
    const g = c.getContext('2d')
    let img = c._img
    if (!img || img.width !== cols || img.height !== rows) {
      img = g.createImageData(cols, rows)
      c._img = img
    }
    const px = new Uint32Array(img.data.buffer)
    const n = cols * rows
    let x = seed | 0 || 0x2545f491
    if (chroma <= 0.01) {
      const lut = levelLut(sigma)
      for (let i = 0; i < n; i++) {
        x ^= x << 13
        x ^= x >>> 17
        x ^= x << 5
        const v =
          lut[
            (x & 255) +
              ((x >>> 8) & 255) +
              ((x >>> 16) & 255) +
              ((x >>> 24) & 255)
          ]
        px[i] = 0xff000000 | (v << 16) | (v << 8) | v
      }
    } else {
      // Dye-layer grain: each channel gets its own small offset; blue grainiest.
      const lum = offsetLut(sigma, 4)
      const chr = offsetLut(sigma * 0.55 * chroma, 2)
      for (let i = 0; i < n; i++) {
        x ^= x << 13
        x ^= x >>> 17
        x ^= x << 5
        const l =
          128 +
          lum[
            (x & 255) +
              ((x >>> 8) & 255) +
              ((x >>> 16) & 255) +
              ((x >>> 24) & 255)
          ]
        x ^= x << 13
        x ^= x >>> 17
        x ^= x << 5
        let r = l + chr[(x & 255) + ((x >>> 8) & 255)]
        let gg = l + chr[((x >>> 16) & 255) + ((x >>> 24) & 255)]
        x ^= x << 13
        x ^= x >>> 17
        x ^= x << 5
        let b = l + ((chr[(x & 255) + ((x >>> 8) & 255)] * 5) >> 2)
        r = r < 0 ? 0 : r > 255 ? 255 : r
        gg = gg < 0 ? 0 : gg > 255 ? 255 : gg
        b = b < 0 ? 0 : b > 255 ? 255 : b
        px[i] = 0xff000000 | (b << 16) | (gg << 8) | r
      }
    }
    g.putImageData(img, 0, 0)
    return c
  }

  /** Positive-only noise on black, max(0, N) × sigma: the static floor of a
   *  Screen plate. tint: false for neutral, true for independent R, G, B. */
  function floorField(key, cols, rows, sigma, tint, seed) {
    const c = scratch(key, cols, rows)
    const g = c.getContext('2d')
    let img = c._img
    if (!img || img.width !== cols || img.height !== rows) {
      img = g.createImageData(cols, rows)
      c._img = img
    }
    const px = new Uint32Array(img.data.buffer)
    const n = cols * rows
    const lkey = `p${tint ? 2 : 4}:${Math.round(sigma * 8)}`
    let lut = lutCache.get(lkey)
    if (!lut) {
      const mid = tint ? 255 : 510
      const sd = tint ? SIGMA2 : SIGMA4
      lut = new Uint8ClampedArray(mid * 2 + 1)
      for (let s = 0; s <= mid * 2; s++)
        lut[s] = Math.max(0, (s - mid) / sd) * sigma
      lutCache.set(lkey, lut)
    }
    let x = seed | 0 || 0x1b873593
    for (let i = 0; i < n; i++) {
      x ^= x << 13
      x ^= x >>> 17
      x ^= x << 5
      if (!tint) {
        const v =
          lut[
            (x & 255) +
              ((x >>> 8) & 255) +
              ((x >>> 16) & 255) +
              ((x >>> 24) & 255)
          ]
        px[i] = 0xff000000 | (v << 16) | (v << 8) | v
      } else {
        const r = lut[(x & 255) + ((x >>> 8) & 255)]
        const gg = lut[((x >>> 16) & 255) + ((x >>> 24) & 255)]
        x ^= x << 13
        x ^= x >>> 17
        x ^= x << 5
        const b = lut[(x & 255) + ((x >>> 8) & 255)]
        px[i] = 0xff000000 | (b << 16) | (gg << 8) | r
      }
    }
    g.putImageData(img, 0, 0)
    return c
  }

  /** A 256 px grey noise tile per seed, used to dither smooth gradients. */
  const tiles = new Map()
  function noiseTile(seed) {
    let c = tiles.get(seed)
    if (!c) {
      const f = grainField('tile-build', 256, 256, 22, 0, hash(seed, 'tile'))
      c = document.createElement('canvas')
      c.width = 256
      c.height = 256
      c.getContext('2d').drawImage(f, 0, 0)
      tiles.set(seed, c)
      if (tiles.size > 6) tiles.delete(tiles.keys().next().value)
    }
    return c
  }
  /** Overlay a moving grain tile: black stays black, gradients get texture. */
  function dither(ctx, w, ht, rng, amount) {
    if (amount <= 0) return
    const tile = noiseTile(rng.seed)
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = amount
    const ox = Math.floor(rng() * 256)
    const oy = Math.floor(rng() * 256)
    ctx.translate(-ox, -oy)
    ctx.fillStyle = ctx.createPattern(tile, 'repeat')
    ctx.fillRect(ox, oy, w, ht)
    ctx.restore()
  }

  /* ------------------------------------------------------------ 1 · VHS */
  const RED = []
  const CYAN = []
  const MAG = []
  const GRN = []
  for (let v = 0; v < 256; v++) {
    RED.push(`rgb(${v},0,0)`)
    CYAN.push(`rgb(0,${v},${v})`)
    MAG.push(`rgb(${Math.round(v * 0.62)},0,${Math.round(v * 0.7)})`)
    GRN.push(`rgb(0,${Math.round(v * 0.55)},${Math.round(v * 0.3)})`)
  }

  function drawVhs(ctx, w, ht, t, p, rng) {
    reset(ctx)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, ht)
    const u = unit(w, ht, p)
    const I = num(p.intensity, 0.7)
    const trk = num(p.tracking, 0.5)
    const nz = num(p.noise, 0.5)
    const chroma = num(p.chroma, 0.55)
    const ph = phase(t, p)
    const area = (w * ht) / (u * u * REF_AREA)
    // Half horizontal resolution, stretched back at the end:
    // VHS luma is soft sideways and crisp from line to line.
    const vw = Math.max(2, Math.ceil(w / 2))
    const sx = vw / w
    const c = scratch('vhs', vw, ht)
    const g = c.getContext('2d')
    reset(g)
    g.fillStyle = '#000'
    g.fillRect(0, 0, vw, ht)
    g.globalCompositeOperation = 'lighter'
    const dx = chroma * 5 * u * sx // red left, cyan right: white where they meet
    const gain = I * (0.9 + 0.1 * rng())
    const one = Math.max(1, u)
    const streak = (x, y, len, th, a) => {
      const v = Math.round(255 * Math.min(1, a * gain))
      if (v < 2) return
      g.fillStyle = RED[v]
      g.fillRect(x - dx, y, len, th)
      g.fillStyle = CYAN[v]
      g.fillRect(x + dx, y, len, th)
    }
    const comet = (x, y, len, th, a) => {
      streak(x, y, len, th, a)
      streak(x + len, y, len * 1.6, th, a * 0.32)
      streak(x - len * 0.22, y, len * 0.22, th, a * 0.45)
    }

    // Static floor: fine luma noise smeared along each line, so the black
    // shimmers the way tape black does. Then chroma blotches, wider and softer.
    const lineH = Math.max(1, 2 * u)
    const floorS = (5 + 24 * nz) * I * (0.92 + 0.16 * rng())
    if (floorS > 0.5) {
      const cols = Math.ceil(vw / Math.max(1, 3 * u)) + 1
      const rows = Math.ceil(ht / lineH) + 1
      const f = floorField(
        'vhs-floor',
        cols,
        rows,
        floorS,
        false,
        hash(rng.seed, 'vf', rng.frame),
      )
      g.drawImage(f, 0, 0, cols * (vw / (cols - 1)), rows * lineH)
    }
    const chromaS = 26 * chroma * I * (0.4 + 0.6 * nz)
    if (chromaS > 0.5) {
      const cols = Math.ceil(vw / Math.max(1, 14 * u)) + 1
      const rows = Math.ceil(ht / (lineH * 2)) + 1
      const f = floorField(
        'vhs-chroma',
        cols,
        rows,
        chromaS,
        true,
        hash(rng.seed, 'vc', rng.frame),
      )
      g.drawImage(f, 0, 0, cols * (vw / (cols - 1)), rows * lineH * 2)
    }

    // Snow: short dashes over the whole frame, new every frame.
    const snow = Math.round(area * 2200 * nz ** 1.2)
    for (let k = 0; k < snow; k++) {
      const len = (1 + 12 * rng() * rng()) * u * sx * 2
      streak(
        rng() * vw,
        Math.floor(rng() * ht),
        len,
        one,
        0.08 + 0.6 * rng() ** 3,
      )
    }

    // Tracking bands roll down the frame: one per loop, a thin one twice per loop.
    const B = rng.fork('vhs-bands')
    const bands = [{ k: 1, off: B(), size: 0.05 + 0.11 * trk, gain: 1 }]
    if (trk > 0.3)
      bands.push({ k: 2, off: B(), size: 0.012 + 0.04 * trk, gain: 0.6 })
    const row = lineH
    for (const b of bands) {
      const bh = b.size * ht
      const cy = (((ph * b.k + b.off) % 1) * (1 + 2 * b.size) - b.size) * ht
      const top = cy - bh / 2
      const y1 = Math.min(ht, top + bh)
      // The torn leading edge: a broken bright line that jitters.
      if (top > 0 && top < ht) {
        let ex = -rng() * 30 * u * sx
        while (ex < vw) {
          const seg = (20 + 140 * rng()) * u * sx
          streak(
            ex,
            top + (rng() - 0.5) * 3 * u,
            seg,
            Math.max(1, 1.4 * u),
            (0.35 + 0.5 * rng()) * b.gain * (0.4 + 0.6 * trk),
          )
          ex += seg + rng() * 40 * u * sx
        }
      }
      for (let y = Math.max(0, Math.floor(top)); y < y1; y += row) {
        const q = (y - top) / bh
        // Dense near the torn top edge, thinning out below it.
        const env = Math.sin(Math.PI * q) ** 1.2 * (1 - 0.45 * q)
        const lg = env * b.gain * (0.45 + 0.55 * trk) * (0.7 + 0.3 * rng())
        streak(0, y, vw, row * 0.6, 0.12 * lg)
        const n = 1 + Math.round(lg * 14 * rng())
        for (let k = 0; k < n; k++) {
          comet(
            rng() * vw,
            y,
            (6 + 170 * rng() ** 2) * u * sx,
            Math.max(1, u * (0.8 + rng())),
            (0.3 + 0.9 * rng()) * lg,
          )
        }
        if (rng() < 0.4 * lg) {
          const v = Math.round(
            255 * Math.min(1, (0.25 + 0.3 * chroma) * lg * gain),
          )
          g.fillStyle = rng() < 0.5 ? MAG[v] : GRN[v]
          g.fillRect(rng() * vw, y, (30 + 240 * rng()) * u * sx, row)
        }
      }
    }

    // Tear lines: thin bright lines with a displaced kink.
    const tears = rng() < 0.12 + 0.55 * trk ? 1 + Math.floor(rng() * 2.5) : 0
    for (let k = 0; k < tears; k++) {
      const y = rng() * ht
      const x0 = rng() * vw * 0.6
      const len = (0.15 + 0.85 * rng()) * vw
      const th = Math.max(1, u * (1 + 1.5 * rng()))
      const a = (0.35 + 0.65 * rng()) * (0.45 + 0.55 * trk)
      streak(x0, y, len, th, a)
      streak(
        x0 + len * rng(),
        y + th * 2,
        (20 + 90 * rng()) * u * sx,
        th,
        a * 0.7,
      )
    }

    // Head-switching band: the bottom 6 %, jittering every frame.
    const hsH = ht * 0.06 * (0.92 + 0.16 * rng())
    const hsTop = ht - hsH + (rng() - 0.5) * 6 * u * (0.4 + trk)
    const hsGain = 0.6 + 0.4 * trk
    let x = -rng() * 20 * u * sx
    while (x < vw) {
      const seg = (12 + 90 * rng()) * u * sx
      streak(
        x,
        hsTop + (rng() - 0.5) * 2.5 * u,
        seg,
        Math.max(1, 1.6 * u),
        (0.45 + 0.4 * rng()) * hsGain,
      )
      x += seg + rng() * 8 * u * sx
    }
    const hsRow = Math.max(1, 1.5 * u)
    for (let y = hsTop + 2 * u; y < ht; y += hsRow) {
      const q = (y - hsTop) / hsH
      const shift = (rng() - 0.5) * 40 * u * sx * (0.5 + trk)
      const n = 2 + Math.floor(5 * rng())
      for (let k = 0; k < n; k++) {
        streak(
          rng() * vw + shift,
          y,
          (5 + 110 * rng() ** 2) * u * sx,
          one,
          (0.1 + 0.45 * rng()) * (1 - 0.55 * q) * hsGain,
        )
      }
    }

    // Dropouts: oxide loss, a bright comet for a frame.
    if (rng() < 0.06 + 0.3 * nz) {
      const n = rng() < 0.3 ? 2 : 1
      for (let k = 0; k < n; k++) {
        comet(
          rng() * vw * 0.9,
          rng() * ht,
          (0.04 + 0.3 * rng()) * vw,
          Math.max(1, u * (1 + 2 * rng())),
          0.85 + 0.15 * rng(),
        )
      }
    }

    // A faint hum bar breathing down the frame.
    const humY = ((ph + 0.37) % 1) * ht * 1.4 - ht * 0.2
    const hb = ht * 0.16
    const hum = g.createLinearGradient(0, humY - hb, 0, humY + hb)
    hum.addColorStop(0, 'rgba(255,255,255,0)')
    hum.addColorStop(0.5, `rgba(255,255,255,${0.028 * I})`)
    hum.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = hum
    g.fillRect(0, humY - hb, vw, hb * 2)

    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(c, 0, 0, w, ht)
  }

  /* ------------------------------------------------------------ 2 · light leak */
  /** Gaussian-ish elliptical bloom, layered outer → core. */
  function bloom(ctx, x, y, r, aspect, rot, layers) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(r, r * aspect)
    for (const L of layers) {
      const R = L.k
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
      gr.addColorStop(0, rgba(L.c, L.a))
      gr.addColorStop(0.22, rgba(L.c, L.a * 0.8))
      gr.addColorStop(0.45, rgba(L.c, L.a * 0.42))
      gr.addColorStop(0.7, rgba(L.c, L.a * 0.12))
      gr.addColorStop(1, rgba(L.c, 0))
      ctx.fillStyle = gr
      ctx.fillRect(-R, -R, 2 * R, 2 * R)
    }
    ctx.restore()
  }
  // Halation order: a crimson rim, ember, tungsten amber, a champagne core.
  const tungsten = (a, w) => [
    { c: COL.crimsonGlow, a: 0.95 * a, k: 1 },
    { c: COL.ember, a: 0.72 * a, k: 0.7 },
    { c: COL.amber, a: (0.75 + 0.2 * w) * a, k: 0.46 },
    { c: COL.champagne, a: 0.72 * a, k: 0.2 },
  ]
  const roseGlow = a => [
    { c: COL.crimsonGlow, a: 0.5 * a, k: 1 },
    { c: COL.rose, a: 0.8 * a, k: 0.66 },
    { c: COL.champagne, a: 0.75 * a, k: 0.3 },
  ]
  /** Whole cycles per loop and a path amplitude that keep drift speed steady. */
  function drift(speed, D, ampMax) {
    const dist = (0.006 + 0.05 * speed) * D
    const n = Math.max(1, Math.round(dist / (4 * ampMax)))
    return { n, amp: Math.min(ampMax, dist / (4 * n)) }
  }

  function drawLeak(ctx, w, ht, t, p, rng) {
    reset(ctx)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, ht)
    const D = num(p.duration, 5)
    const ph = phase(t, p)
    const warmth = num(p.warmth, 0.85)
    const speed = num(p.speed, 0.35)
    const I = num(p.intensity, 0.75)
    const edge = num(p.edgeBias, 0.3)
    const burn = p.variant === 'burn'
    const L = rng.fork('leak', burn ? 'burn' : 'drift')
    const big = Math.max(w, ht)
    const { n, amp } = drift(speed, D, 0.16)
    // One flare per loop, about a second wide whatever the loop length.
    const flare = pulse(ph, L(), Math.min(0.12, 0.5 / D))
    ctx.globalCompositeOperation = 'screen'

    if (!burn) {
      // Drift: soft blooms wander on closed paths; one of them flares once per loop.
      for (let k = 0; k < 4; k++) {
        const rose = L() < lerp(0.82, 0.1, warmth)
        let bx = L()
        let by = L()
        bx = lerp(bx, bx < 0.5 ? -0.12 : 1.12, edge * 0.8)
        by = lerp(by, by < 0.5 ? -0.1 : 1.1, edge * 0.4)
        const r = (0.28 + 0.3 * L()) * big * (1 + 0.25 * edge)
        const aspect = 0.55 + 0.6 * L()
        const rot0 = L() * TAU
        const p1 = L() * TAU
        const p2 = L() * TAU
        const n2 = n + (L() < 0.5 ? 0 : 1)
        const x = (bx + amp * Math.sin(TAU * n * ph + p1)) * w
        const y = (by + amp * 0.8 * Math.sin(TAU * n2 * ph + p2)) * ht
        const breathe = 0.8 + 0.2 * Math.sin(TAU * ph * (1 + (k % 2)) + p1)
        const a = I * breathe * (0.75 + 0.6 * flare * (k === 0 ? 1 : 0.45))
        const rot = rot0 + 0.22 * Math.sin(TAU * ph + p2)
        bloom(
          ctx,
          x,
          y,
          r,
          aspect,
          rot,
          rose ? roseGlow(a) : tungsten(a, warmth),
        )
      }
    } else {
      // Edge burn: light bleeding in at the gate, tall and hot along the edge.
      const count = 2 + (L() < 0.55 ? 1 : 0)
      const first = L() < 0.5 ? 0 : 1
      for (let k = 0; k < count; k++) {
        // The second leak comes in from the opposite edge.
        const side = k === 1 ? 1 - first : k === 0 ? first : L() < 0.5 ? 0 : 1
        const rose = L() < lerp(0.75, 0.05, warmth)
        const along = 0.12 + 0.76 * L()
        const depth = lerp(0.64, 0.3, edge)
        const p1 = L() * TAU
        const cy = (along + amp * 1.2 * Math.sin(TAU * n * ph + p1)) * ht
        const rx = depth * w
        const ry = (0.32 + 0.38 * L()) * ht
        const cx = side ? w + rx * 0.12 : -rx * 0.12
        const breathe = 0.78 + 0.22 * Math.sin(TAU * ph * (k + 1) + p1)
        const a = I * breathe * (0.95 + 0.6 * flare)
        bloom(
          ctx,
          cx,
          cy,
          rx,
          ry / rx,
          0,
          rose ? roseGlow(a) : tungsten(a, warmth),
        )
        // Hot fog hugging the edge.
        const fw = (0.06 + 0.06 * L()) * w
        bloom(ctx, side ? w : 0, cy, fw, (ry * 0.85) / fw, 0, [
          { c: COL.amber, a: 0.7 * a, k: 1 },
          { c: COL.champagne, a: 0.85 * a, k: 0.5 },
        ])
      }
    }
    // A warm wash at the flare's peak, like a frame of light-struck stock.
    if (flare > 0.02) {
      ctx.fillStyle = rgba(burn ? COL.champagne : COL.amber, 0.06 * flare * I)
      ctx.fillRect(0, 0, w, ht)
    }
    dither(ctx, w, ht, rng, 0.3)
  }

  /* ------------------------------------------------------------ 3 · film grain */
  const GRAIN_SIZE = { fine: 1, medium: 1.7, coarse: 2.6 }
  function drawGrain(ctx, w, ht, t, p, rng) {
    reset(ctx)
    const u = unit(w, ht, p)
    const I = num(p.intensity, 0.45)
    const chroma = num(p.chroma, 0.2)
    const size = (GRAIN_SIZE[p.variant] || GRAIN_SIZE.medium) * u
    // σ in 8-bit levels around 50 % grey. Cells below one pixel average out
    // when the plate is shown small, so the preview keeps the true strength.
    const sigma = (5 + 44 * I) / 0.727
    const fine = Math.max(1, size)
    const coarse = Math.max(1, size * 2.3)
    const aFine = Math.min(1, size)
    const aCoarse = Math.min(1, size * 2.3)
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, ht)
    ctx.imageSmoothingQuality = 'high'
    const layer = (key, cell, s, chr, alpha) => {
      const cols = Math.ceil(w / cell) + 2
      const rows = Math.ceil(ht / cell) + 2
      const f = grainField(
        key,
        cols,
        rows,
        s,
        chr,
        hash(rng.seed, key, rng.frame),
      )
      ctx.globalAlpha = alpha
      ctx.drawImage(f, -rng() * cell, -rng() * cell, cols * cell, rows * cell)
    }
    layer('grain-a', fine, sigma * aFine, chroma, 1)
    layer('grain-b', coarse, sigma * aCoarse, 0, 0.38)
    ctx.globalAlpha = 1
  }

  /* ------------------------------------------------------------ 4 · dust & scratches */
  function speck(ctx, x, y, r, a) {
    if (r < 1.2) {
      ctx.fillStyle = rgba(COL.bone, a)
      ctx.beginPath()
      ctx.arc(x, y, Math.max(0.5, r), 0, TAU)
      ctx.fill()
      return
    }
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, rgba(COL.bone, a))
    gr.addColorStop(0.55, rgba(COL.bone, a * 0.78))
    gr.addColorStop(1, rgba(COL.bone, 0))
    ctx.fillStyle = gr
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
  }

  function drawDust(ctx, w, ht, t, p, rng) {
    reset(ctx)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, ht)
    const u = unit(w, ht, p)
    const dens = num(p.density, 0.5)
    const scr = num(p.scratches, 0.45)
    const fps = num(p.fps, 24)
    const N = loopN(p)
    const fr = Number.isFinite(rng.frame) ? rng.frame : Math.round(t * fps)
    const f = ((fr % N) + N) % N
    const area = (w * ht) / (u * u * REF_AREA)
    ctx.globalCompositeOperation = 'lighter'

    // Specks: new on every frame, like dirt on each frame of a print.
    const specks = Math.round(
      (6 + 220 * dens ** 2) * area * (0.6 + 0.8 * rng()),
    )
    for (let k = 0; k < specks; k++) {
      const x = rng() * w
      const y = rng() * ht
      const big = rng() < 0.1 ? 2.2 : 1
      const r = (0.9 + 3.2 * rng() ** 2.2) * u * (0.8 + 0.5 * dens) * big
      const a = 0.3 + 0.65 * rng()
      const lobes = 1 + Math.floor(rng() * 3)
      for (let l = 0; l < lobes; l++) {
        speck(
          ctx,
          x + (rng() - 0.5) * r * 1.6,
          y + (rng() - 0.5) * r * 1.6,
          r * (0.45 + 0.6 * rng()),
          a,
        )
      }
    }
    if (rng() < 0.2 * dens)
      speck(ctx, rng() * w, rng() * ht, (5 + 8 * rng()) * u, 0.45 + 0.4 * rng())

    // Fibres: short curls, new every frame.
    ctx.lineCap = 'round'
    const fibres = Math.round((0.4 + 3.2 * dens) * area * 2 * rng())
    for (let k = 0; k < fibres; k++) {
      const x0 = rng() * w
      const y0 = rng() * ht
      const len = (8 + 46 * rng()) * u
      const ang = rng() * TAU
      const bend = (rng() - 0.5) * 3
      const ex = x0 + Math.cos(ang) * len
      const ey = y0 + Math.sin(ang) * len
      ctx.strokeStyle = rgba(COL.bone, 0.4 + 0.45 * rng())
      ctx.lineWidth = (0.6 + 0.9 * rng()) * u
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(
        (x0 + ex) / 2 - Math.sin(ang) * bend * len * 0.4,
        (y0 + ey) / 2 + Math.cos(ang) * bend * len * 0.4,
        ex,
        ey,
      )
      ctx.stroke()
    }

    // Hairs: caught in the gate for a few frames, then gone. Lifetimes wrap
    // around the loop, so a hair at the end carries into the first frames.
    const BACK = 6
    ctx.lineCap = 'round'
    for (let back = 0; back < BACK; back++) {
      const s = (((f - back) % N) + N) % N
      const H = rng.fork('hair', s)
      if (H() > 0.04 + 0.38 * dens) continue
      const life = 1 + Math.floor(H() * BACK)
      if (back >= life) continue
      const x0 = H() * w
      const y0 = H() * ht
      const len = (30 + 170 * H()) * u
      const ang = H() * TAU
      const bend = (H() - 0.5) * 2.4
      const lw = (0.7 + 1.0 * H()) * u
      const alpha = (0.5 + 0.45 * H()) * (0.85 + 0.15 * rng())
      const jx = (rng() - 0.5) * 1.5 * u
      const jy = (rng() - 0.5) * 1.5 * u
      const cx = Math.cos(ang)
      const cyy = Math.sin(ang)
      const nx = -cyy * bend * len
      const ny = cx * bend * len
      ctx.strokeStyle = rgba(COL.bone, alpha)
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.moveTo(x0 + jx, y0 + jy)
      ctx.bezierCurveTo(
        x0 + cx * len * 0.33 + nx * 0.35 + jx,
        y0 + cyy * len * 0.33 + ny * 0.35 + jy,
        x0 + cx * len * 0.66 - nx * 0.25 + jx,
        y0 + cyy * len * 0.66 - ny * 0.25 + jy,
        x0 + cx * len + jx,
        y0 + cyy * len + jy,
      )
      ctx.stroke()
    }

    // Vertical scratches: a few lanes, each live for part of a slot, flickering.
    const lanes = Math.round(scr * 4)
    const slot = Math.max(8, Math.round(fps * 1.25))
    const si = Math.floor(f / slot)
    const local = f - si * slot
    for (let k = 0; k < lanes; k++) {
      const S = rng.fork('scratch', k, si)
      if (S() > 0.3 + 0.55 * scr) continue
      const start = Math.floor(S() * slot * 0.6)
      const len = Math.max(3, Math.round(slot * (0.25 + 0.75 * S())))
      if (local < start || local >= start + len) continue
      const sx = (0.04 + 0.92 * S()) * w + (rng() - 0.5) * 1.4 * u
      const full = S() < 0.65
      const y0 = full ? 0 : S() * ht * 0.6
      const y1 = full ? ht : y0 + (0.25 + 0.75 * S()) * (ht - y0)
      const lw = (0.8 + 1.6 * S()) * u
      const a = (0.35 + 0.5 * S()) * (0.35 + 0.65 * rng())
      // Scratches are never quite vertical: a slight slant along the run.
      const slant = (S() - 0.5) * 6 * u
      ctx.lineCap = 'butt'
      let y = y0
      while (y < y1) {
        const yEnd = Math.min(y1, y + (0.15 + 0.6 * rng()) * ht)
        const xa = sx + slant * (y / ht)
        const xb = sx + slant * (yEnd / ht)
        ctx.strokeStyle = rgba(COL.bone, a * 0.22)
        ctx.lineWidth = lw * 3.2
        ctx.beginPath()
        ctx.moveTo(xa, y)
        ctx.lineTo(xb, yEnd)
        ctx.stroke()
        ctx.strokeStyle = rgba(COL.bone, a)
        ctx.lineWidth = lw
        ctx.stroke()
        y = yEnd + rng() * 0.08 * ht
      }
    }
  }

  /* ------------------------------------------------------------ 5 · scanlines & CRT */
  const patterns = new Map()
  function lineTile(P, str, white) {
    const key = `ln${P}:${Math.round(str * 100)}:${white ? 1 : 0}`
    let c = patterns.get(key)
    if (!c) {
      c = document.createElement('canvas')
      c.width = 4
      c.height = P
      const g = c.getContext('2d')
      for (let y = 0; y < P; y++) {
        const d = 0.5 - 0.5 * Math.cos((TAU * (y + 0.5)) / P)
        const v = white
          ? Math.round(255 * (1 - 0.62 * str * d ** 1.3))
          : Math.round(255 * 0.42 * str * (1 - d) ** 2.2)
        g.fillStyle = `rgb(${v},${v},${v})`
        g.fillRect(0, y, 4, 1)
      }
      patterns.set(key, c)
    }
    return c
  }
  function maskTile(cw, mask, str, white) {
    const key = `mk${cw}:${Math.round(mask * 100)}:${Math.round(str * 100)}:${white ? 1 : 0}`
    let c = patterns.get(key)
    if (!c) {
      c = document.createElement('canvas')
      c.width = cw * 3
      c.height = 1
      const g = c.getContext('2d')
      const k = white
        ? Math.round(90 * mask)
        : Math.round(60 * mask * (0.4 + 0.6 * str))
      const cols = white
        ? [
            [255, 255 - k, 255 - k],
            [255 - k, 255, 255 - k],
            [255 - k, 255 - k, 255],
          ]
        : [
            [k, 0, 0],
            [0, k, 0],
            [0, 0, k],
          ]
      cols.forEach((cc, i) => {
        g.fillStyle = `rgb(${cc[0]},${cc[1]},${cc[2]})`
        g.fillRect(i * cw, 0, cw, 1)
      })
      patterns.set(key, c)
    }
    return c
  }

  function drawScan(ctx, w, ht, t, p) {
    reset(ctx)
    const white = p.variant !== 'black'
    const u = unit(w, ht, p)
    const lines = num(p.lines, 0.55)
    const str = num(p.strength, 0.55)
    const roll = num(p.roll, 0.3)
    const vig = num(p.vignette, 0.5)
    const mask = num(p.mask, 0.2)
    ctx.fillStyle = white ? '#fff' : '#000'
    ctx.fillRect(0, 0, w, ht)
    const mode = white ? 'multiply' : 'lighter'

    // Scanlines: a raised-cosine profile per line pair. Never under 2 px.
    const P = Math.max(2, Math.round(lerp(7, 3, lines) * u))
    ctx.globalCompositeOperation = mode
    ctx.fillStyle = ctx.createPattern(lineTile(P, str, white), 'repeat')
    ctx.fillRect(0, 0, w, ht)

    // Aperture-grille phosphor stripes.
    if (mask > 0.01) {
      const cw = Math.max(1, Math.round(u))
      ctx.fillStyle = ctx.createPattern(
        maskTile(cw, mask, str, white),
        'repeat',
      )
      ctx.fillRect(0, 0, w, ht)
    }

    // Hum bar: rolls through whole cycles per loop.
    if (roll > 0.01) {
      const D = num(p.duration, 5)
      const n = Math.max(1, Math.round(roll * D * 0.3))
      const bh = ht * 0.3
      const y = ((phase(t, p) * n) % 1) * (ht + bh) - bh / 2
      const gr = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2)
      if (white) {
        const d = Math.round(255 * (1 - 0.16 * str))
        gr.addColorStop(0, '#fff')
        gr.addColorStop(0.5, `rgb(${d},${d},${d})`)
        gr.addColorStop(1, '#fff')
      } else {
        gr.addColorStop(0, 'rgba(214,222,234,0)')
        gr.addColorStop(0.5, `rgba(214,222,234,${0.1 * str})`)
        gr.addColorStop(1, 'rgba(214,222,234,0)')
      }
      ctx.fillStyle = gr
      ctx.fillRect(0, y - bh / 2, w, bh)
    }

    // Vignette: Multiply darkens a white plate's edges; on black it dims
    // the raster towards the edges, like the hot centre of a tube.
    if (vig > 0.01) {
      ctx.globalCompositeOperation = 'multiply'
      ctx.save()
      ctx.translate(w / 2, ht / 2)
      ctx.scale(w / 2, ht / 2)
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.SQRT2)
      const depth = (white ? 0.6 : 0.9) * vig
      for (let i = 0; i <= 6; i++) {
        const s = i / 6
        const r = lerp(0.42, 1, s)
        const v = Math.round(255 * (1 - depth * smoothstep(0, 1, s)))
        gr.addColorStop(r / Math.SQRT2, `rgb(${v},${v},${v})`)
      }
      gr.addColorStop(0, '#fff')
      ctx.fillStyle = gr
      ctx.fillRect(-1, -1, 2, 2)
      ctx.restore()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  /* ------------------------------------------------------------ 6 · camcorder REC */
  const MONTHS = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ')
  const pad2 = n => String(Math.floor(Math.abs(n))).padStart(2, '0')
  const dateStamp = (d = new Date()) =>
    `${MONTHS[d.getMonth()]} ${pad2(d.getDate())} ${d.getFullYear()}`
  const clockStamp = (d = new Date()) => {
    const hh = d.getHours()
    return `${hh % 12 || 12}:${pad2(d.getMinutes())} ${hh >= 12 ? 'PM' : 'AM'}`
  }
  /** "11:47 PM" + t seconds → "11:47:03 PM" (24 h in, 24 h out). */
  function clockAt(text, t) {
    const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\s*$/i.exec(
      text || '',
    )
    if (!m) return String(text || '').toUpperCase()
    let hh = Number(m[1])
    const ap = m[4] ? m[4].replace(/\./g, '').toUpperCase() : ''
    if (ap) hh = (hh % 12) + (ap === 'PM' ? 12 : 0)
    const s =
      (((hh * 3600 + Number(m[2]) * 60 + Number(m[3] || 0) + Math.floor(t)) %
        86400) +
        86400) %
      86400
    const H = Math.floor(s / 3600)
    const tail = `${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`
    return ap
      ? `${H % 12 || 12}:${tail} ${H >= 12 ? 'PM' : 'AM'}`
      : `${pad2(H)}:${tail}`
  }
  const FACE_KEYS = ['jet', 'space', 'courier']
  function faceStack(variant) {
    const faces = (LN.fonts && LN.fonts.metaFaces) || ['JetBrains Mono']
    const i = Math.max(0, FACE_KEYS.indexOf(variant))
    const face = faces[i] || faces[0]
    return `"${face}", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`
  }

  function battery(ctx, x, y, bw, bh, level, t, fs) {
    const low = level <= 0.2
    if (low && Math.floor(t * 2) % 2 === 1) return // an empty battery blinks
    const lw = Math.max(1, fs * 0.085)
    const nub = fs * 0.14
    ctx.lineWidth = lw
    ctx.strokeRect(x + lw / 2, y + lw / 2, bw - nub - lw, bh - lw)
    ctx.fillRect(x + bw - nub, y + bh * 0.3, nub, bh * 0.4)
    const cells = 4
    const filled = low ? 1 : Math.ceil(level * cells - 0.001)
    const ix = x + lw * 2.2
    const iy = y + lw * 2.2
    const iw = bw - nub - lw * 4.4
    const ih = bh - lw * 4.4
    const gap = iw * 0.08
    const cw = (iw - gap * (cells - 1)) / cells
    for (let i = 0; i < filled; i++)
      ctx.fillRect(ix + i * (cw + gap), iy, cw, ih)
  }

  function drawRec(ctx, w, ht, t, p, rng) {
    reset(ctx)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, ht)
    const S = Math.min(w, ht)
    const fs = 0.036 * S * num(p.scale, 1)
    const m = 0.06 * S
    const arm = 0.07 * S
    const pad = 0.03 * S
    const glow = num(p.glow, 0.5)
    const jit = num(p.jitter, 0.2)
    const fps = num(p.fps, 24)
    const ink = rgba(COL.ink, 1)
    const halo = (c, a) => {
      ctx.shadowColor = rgba(c, a)
      ctx.shadowBlur = fs * 0.6 * glow
    }
    // Tape wobble: the whole OSD slips sideways by a pixel or two.
    ctx.translate((rng() - 0.5) * 2 * jit * 0.006 * S, 0)

    // Corner brackets.
    halo(COL.silver, 0.6)
    ctx.strokeStyle = rgba(COL.silver, 1)
    ctx.lineWidth = Math.max(1, 0.0042 * S)
    ctx.lineCap = 'square'
    ctx.beginPath()
    for (const [cx, cy, dx, dy] of [
      [m, m, 1, 1],
      [w - m, m, -1, 1],
      [m, ht - m, 1, -1],
      [w - m, ht - m, -1, -1],
    ]) {
      ctx.moveTo(cx, cy + dy * arm)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx + dx * arm, cy)
    }
    ctx.stroke()

    ctx.font = `500 ${fs.toFixed(2)}px ${faceStack(p.variant)}`
    ctx.textBaseline = 'middle'
    if ('letterSpacing' in ctx)
      ctx.letterSpacing = `${(0.08 * fs).toFixed(2)}px`
    const top = m + pad + fs * 0.5
    const bottom = ht - m - pad - fs * 0.5
    const left = m + pad
    const right = w - m - pad

    // REC ● in crimson; the dot blinks once a second.
    halo(COL.crimson, 0.95)
    ctx.fillStyle = rgba(COL.rec, 1)
    ctx.textAlign = 'left'
    ctx.fillText('REC', left, top)
    if (Math.floor(t * 2) % 2 === 0) {
      const rw = ctx.measureText('REC').width
      ctx.beginPath()
      ctx.arc(left + rw + fs * 0.55, top, fs * 0.3, 0, TAU)
      ctx.fill()
    }

    // Tape speed and battery, top right.
    halo(COL.silver, 0.6)
    ctx.fillStyle = ink
    ctx.strokeStyle = ink
    const bw = fs * 1.8
    const bh = fs * 0.88
    const bx = right - bw
    battery(ctx, bx, top - bh / 2, bw, bh, num(p.battery, 0.75), t, fs)
    ctx.textAlign = 'right'
    ctx.fillText('SP', bx - fs * 0.7, top)

    // Clock and date, bottom left; tape counter, bottom right.
    ctx.textAlign = 'left'
    ctx.fillText(clockAt(p.clock || '', t), left, bottom - fs * 1.45)
    ctx.fillText(String(p.date || dateStamp()).toUpperCase(), left, bottom)
    ctx.textAlign = 'right'
    ctx.fillText(LN.fmt.tc(t, fps), right, bottom)
  }

  /* ------------------------------------------------------------ plate catalogue */
  const pct = v => `${Math.round(v * 100)}%`
  const P = (key, label, value, extra) => ({
    key,
    label,
    value,
    min: 0,
    max: 1,
    step: 0.01,
    format: pct,
    ...extra,
  })

  const PLATES = [
    {
      id: 'vhs',
      name: 'VHS tracking & noise',
      short: 'VHS',
      blurb:
        'Tape noise for confessions and archive chaos: tracking bands rolling through, tear lines, red and cyan fringe, and the head-switching band along the bottom.',
      params: [
        P('intensity', 'Intensity', 0.7),
        P('tracking', 'Tracking error', 0.5),
        P('noise', 'Noise and dropouts', 0.5),
        P('chroma', 'Chroma fringe', 0.55),
      ],
      presets: [
        {
          label: 'Clean dub',
          set: { intensity: 0.45, tracking: 0.18, noise: 0.25, chroma: 0.35 },
        },
        {
          label: 'Found tape',
          set: { intensity: 0.7, tracking: 0.5, noise: 0.5, chroma: 0.55 },
        },
        {
          label: 'Archive chaos',
          set: { intensity: 0.95, tracking: 0.92, noise: 0.85, chroma: 0.85 },
        },
      ],
      base: () => 'Black',
      modes: () => ['Screen'],
      opacity: 70,
      why: 'Screen keeps only the light in the plate. The black drops out and the tape noise lands on your picture.',
      bpp: 0.2,
      tag: () => 'vhs',
      draw: drawVhs,
    },
    {
      id: 'leak',
      name: 'Light leak & halation',
      short: 'Leak',
      blurb:
        'Warm film light for memory and heritage beats: tungsten amber, crimson, rose and champagne blooms that drift and flare once a loop. Edge burn bleeds in from the gate instead.',
      variants: {
        label: 'Style',
        value: 'drift',
        options: [
          { value: 'drift', label: 'Drift' },
          { value: 'burn', label: 'Edge burn' },
        ],
      },
      params: [
        P('warmth', 'Warmth', 0.85),
        P('speed', 'Drift speed', 0.35),
        P('intensity', 'Intensity', 0.75),
        P('edgeBias', 'Edge bias', 0.3),
      ],
      presets: [
        {
          label: 'Tungsten drift',
          set: {
            variant: 'drift',
            warmth: 0.85,
            speed: 0.35,
            intensity: 0.75,
            edgeBias: 0.3,
          },
        },
        {
          label: 'Dreamcore rose',
          set: {
            variant: 'drift',
            warmth: 0.15,
            speed: 0.22,
            intensity: 0.68,
            edgeBias: 0.12,
          },
        },
        {
          label: 'Gate burn',
          set: {
            variant: 'burn',
            warmth: 0.7,
            speed: 0.5,
            intensity: 0.85,
            edgeBias: 0.65,
          },
        },
      ],
      base: () => 'Black',
      modes: () => ['Screen'],
      opacity: 80,
      why: 'Screen adds the light without ever darkening. Where the plate is black, nothing changes.',
      bpp: 0.12,
      tag: p => (p.variant === 'burn' ? 'leak-burn' : 'leak'),
      draw: drawLeak,
    },
    {
      id: 'grain',
      name: 'Film grain',
      short: 'Grain',
      blurb:
        'Fresh grain every frame on 50 % grey: soft, clumped particles with a Gaussian spread, not TV static. Lay it over anything that looks too clean.',
      variants: {
        label: 'Grain size',
        value: 'medium',
        options: [
          { value: 'fine', label: 'Fine' },
          { value: 'medium', label: 'Medium' },
          { value: 'coarse', label: 'Coarse' },
        ],
      },
      params: [
        P('intensity', 'Intensity', 0.45),
        P('chroma', 'Chroma grain', 0.2),
      ],
      presets: [
        {
          label: 'Whisper',
          set: { variant: 'fine', intensity: 0.25, chroma: 0 },
        },
        {
          label: 'Night stock',
          set: { variant: 'medium', intensity: 0.45, chroma: 0.2 },
        },
        {
          label: 'Rough',
          set: { variant: 'coarse', intensity: 0.75, chroma: 0.45 },
        },
      ],
      base: () => '50 % grey',
      modes: () => ['Overlay', 'Soft light'],
      opacity: 60,
      why: 'Overlay pushes the grain into the midtones and leaves the 50 % grey invisible. Soft light does the same, gentler.',
      bpp: 0.32,
      tag: p => `grain-${p.variant || 'medium'}`,
      draw: drawGrain,
    },
    {
      id: 'dust',
      name: 'Dust & scratches',
      short: 'Dust',
      blurb:
        'Specks on every frame, hairs caught in the gate for a few frames, and flickering vertical scratches, as if tonight ran through a tired projector.',
      params: [P('density', 'Density', 0.5), P('scratches', 'Scratches', 0.45)],
      presets: [
        { label: 'Clean print', set: { density: 0.2, scratches: 0.12 } },
        { label: 'Tired print', set: { density: 0.5, scratches: 0.45 } },
        { label: 'Dragged print', set: { density: 0.9, scratches: 0.85 } },
      ],
      base: () => 'Black',
      modes: () => ['Screen'],
      opacity: 75,
      why: 'Screen shows only the specks and scratches. The black plate disappears.',
      bpp: 0.09,
      tag: () => 'dust',
      draw: drawDust,
    },
    {
      id: 'scan',
      name: 'Scanlines & CRT',
      short: 'CRT',
      blurb:
        'A tube raster: fine lines, a slow hum bar and a vignette. The white plate darkens through Multiply; the black plate glows through Screen.',
      variants: {
        label: 'Plate',
        value: 'white',
        options: [
          { value: 'white', label: 'White · Multiply' },
          { value: 'black', label: 'Black · Screen' },
        ],
      },
      params: [
        P('lines', 'Line density', 0.55),
        P('strength', 'Strength', 0.55),
        P('roll', 'Roll speed', 0.3),
        P('vignette', 'Vignette', 0.5),
        P('mask', 'Phosphor mask', 0.2),
      ],
      presets: [
        {
          label: 'Monitor',
          set: {
            variant: 'white',
            lines: 0.55,
            strength: 0.55,
            roll: 0.3,
            vignette: 0.5,
            mask: 0.2,
          },
        },
        {
          label: 'Soft raster',
          set: {
            variant: 'white',
            lines: 0.8,
            strength: 0.35,
            roll: 0.15,
            vignette: 0.3,
            mask: 0,
          },
        },
        {
          label: 'Phosphor glow',
          set: {
            variant: 'black',
            lines: 0.6,
            strength: 0.7,
            roll: 0.4,
            vignette: 0.6,
            mask: 0.5,
          },
        },
      ],
      base: p => (p.variant === 'black' ? 'Black' : 'White'),
      modes: p => (p.variant === 'black' ? ['Screen'] : ['Multiply']),
      opacity: 60,
      why: 'Multiply keeps the dark lines and the vignette and makes the white vanish. On the black plate, Screen keeps the glowing raster and drops the black.',
      bpp: 0.06,
      tag: p => `scan-${p.variant === 'black' ? 'black' : 'white'}`,
      draw: drawScan,
    },
    {
      id: 'rec',
      name: 'Camcorder REC',
      short: 'REC',
      blurb:
        'The camcorder viewfinder: blinking crimson REC, tape speed, battery, a running clock and counter, and a date stamp that defaults to tonight.',
      variants: {
        label: 'Typeface',
        value: 'jet',
        options: [
          { value: 'jet', label: 'JetBrains' },
          { value: 'space', label: 'Space' },
          { value: 'courier', label: 'Courier' },
        ],
      },
      params: [
        P('scale', 'HUD size', 1, {
          min: 0.7,
          max: 1.4,
          step: 0.05,
          format: v => `${v.toFixed(2)}×`,
        }),
        P('glow', 'Glow', 0.5),
        P('jitter', 'Tape jitter', 0.2),
        P('battery', 'Battery', 0.75),
      ],
      presets: [
        {
          label: 'Handycam',
          set: {
            variant: 'jet',
            scale: 1,
            glow: 0.5,
            jitter: 0.2,
            battery: 0.75,
          },
        },
        {
          label: 'Low battery',
          set: {
            variant: 'space',
            scale: 1,
            glow: 0.6,
            jitter: 0.35,
            battery: 0.1,
          },
        },
        {
          label: 'Clean OSD',
          set: {
            variant: 'jet',
            scale: 0.9,
            glow: 0.15,
            jitter: 0,
            battery: 1,
          },
        },
      ],
      base: () => 'Black',
      modes: () => ['Screen'],
      opacity: 100,
      why: 'Screen drops the black and keeps the HUD crisp. Leave it at full opacity.',
      bpp: 0.05,
      tag: () => 'rec',
      draw: drawRec,
    },
  ]
  const PLATE = Object.fromEntries(PLATES.map(pl => [pl.id, pl]))

  function defaults(id) {
    const pl = PLATE[id]
    if (!pl) return {}
    const o = {}
    for (const d of pl.params) o[d.key] = d.value
    if (pl.variants) o.variant = pl.variants.value
    return o
  }

  /** Pure draw functions; missing params and rng fall back to defaults. */
  const RENDERERS = {}
  for (const pl of PLATES) {
    RENDERERS[pl.id] = (ctx, w, ht, t, params, rng) => {
      const p = { ...defaults(pl.id), ...(params || {}) }
      const r = rng || frameRng(num(p.seed, 1), Math.round(t * num(p.fps, 24)))
      pl.draw(ctx, w, ht, t, p, r)
    }
  }

  const CANVAS_MODE = {
    Screen: 'screen',
    Overlay: 'overlay',
    'Soft light': 'soft-light',
    Multiply: 'multiply',
  }
  const SIZES = {
    '9x16': { w: 1080, h: 1920, label: '9:16' },
    '16x9': { w: 1920, h: 1080, label: '16:9' },
    '4x3': { w: 1440, h: 1080, label: '4:3' },
    '4k': { w: 3840, h: 2160, label: '4K' },
  }
  const DURATIONS = [3, 5, 10, 15]

  const bitrateFor = (pl, W, H, fps) =>
    Math.round(clamp(pl.bpp * W * H * fps, 2e6, 40e6))

  async function prepare(pl, p) {
    if (pl.id === 'rec')
      await LN.fontsReady([`500 40px ${faceStack(p.variant)}`])
  }

  /**
   * Headless render (no UI, no save).
   * render({type, width, height, fps, duration, seed, params, signal, onProgress, onFrame})
   * → {blob, ext, codec, via, frames, filename, bitrate}
   */
  async function render(o) {
    const pl = PLATE[o.type]
    if (!pl) throw new Error(`Unknown plate "${o.type}"`)
    // H.264 wants even dimensions.
    const W = Math.max(2, Math.round(num(o.width, 1080) / 2) * 2)
    const H = Math.max(2, Math.round(num(o.height, 1920) / 2) * 2)
    const fps = num(o.fps, 24)
    const duration = num(o.duration, 5)
    const seed = Math.trunc(num(o.seed, 1))
    const p = { ...defaults(pl.id), ...(o.params || {}), fps, duration, seed }
    await prepare(pl, p)
    const bitrate = bitrateFor(pl, W, H, fps)
    const res = await LN.media.renderCanvasVideo({
      width: W,
      height: H,
      fps,
      duration,
      bitrate,
      signal: o.signal,
      onProgress: o.onProgress,
      draw: (ctx, t, i, n) => {
        pl.draw(ctx, W, H, i / fps, p, frameRng(seed, i))
        if (o.onFrame) o.onFrame(ctx.canvas, i, n)
      },
    })
    purge()
    res.bitrate = bitrate
    res.filename = `LN_${pl.tag(p)}_${W}x${H}_${fps}p_${duration}s.${res.ext}`
    return res
  }

  /* ------------------------------------------------------------ the test still */
  /** "Lunar chart": a tone ramp and the four Lunar Night swatches. */
  function drawChart(g, w, ht) {
    reset(g)
    g.fillStyle = '#08080A'
    g.fillRect(0, 0, w, ht)
    const S = Math.min(w, ht)
    const px = 0.08 * w
    const fsz = Math.max(7, S * 0.026)
    const rampTop = ht * 0.16
    const rampH = ht * 0.3
    const ramp = g.createLinearGradient(px, 0, w - px, 0)
    ramp.addColorStop(0, '#08080A')
    ramp.addColorStop(1, '#C8D0DC')
    g.fillStyle = ramp
    g.fillRect(px, rampTop, w - 2 * px, rampH)
    const sw = [
      ['#08080A', 'OBSIDIAN'],
      ['#9E2A2B', 'CRIMSON'],
      ['#E5A93C', 'AMBER'],
      ['#F4F1EA', 'BONE'],
    ]
    const top = ht * 0.56
    const sh = ht * 0.26
    const gap = 0.02 * w
    const cw = (w - 2 * px - gap * 3) / 4
    g.font = `${fsz.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`
    g.textBaseline = 'top'
    sw.forEach(([c, name], i) => {
      const x = px + i * (cw + gap)
      g.fillStyle = c
      g.fillRect(x, top, cw, sh)
      g.fillStyle = '#6B7486'
      if (cw > fsz * 5) g.fillText(name, x, top + sh + fsz * 0.7)
    })
    g.strokeStyle = '#2B2E3D'
    g.lineWidth = Math.max(1, S * 0.002)
    g.strokeRect(px, top, cw, sh)
    g.fillStyle = '#6B7486'
    g.fillText('SHADOWS', px, rampTop + rampH + fsz * 0.7)
    g.textAlign = 'right'
    g.fillText('HIGHLIGHTS', w - px, rampTop + rampH + fsz * 0.7)
    g.textAlign = 'left'
  }

  /* ------------------------------------------------------------ UI */
  const KEY = 'forge.video.v1'
  function loadState() {
    const s = LN.store.get(KEY, null) || {}
    const st = {
      type: PLATE[s.type] ? s.type : 'vhs',
      size: SIZES[s.size] ? s.size : '9x16',
      fps: s.fps === 30 ? 30 : 24,
      dur: DURATIONS.includes(s.dur) ? s.dur : 5,
      seed: Number.isInteger(s.seed) ? clamp(s.seed, 1, 99999) : 26,
      view: s.view === 'blend' ? 'blend' : 'plate',
      params: {},
      look: {},
    }
    for (const pl of PLATES) {
      const saved = (s.params && s.params[pl.id]) || {}
      const p = defaults(pl.id)
      for (const d of pl.params) {
        if (typeof saved[d.key] === 'number')
          p[d.key] = clamp(saved[d.key], d.min, d.max)
      }
      if (
        pl.variants &&
        pl.variants.options.some(o => o.value === saved.variant)
      )
        p.variant = saved.variant
      if (pl.id === 'rec') {
        p.date = typeof saved.date === 'string' ? saved.date.slice(0, 24) : ''
        p.clock =
          typeof saved.clock === 'string' ? saved.clock.slice(0, 16) : ''
      }
      st.params[pl.id] = p
      const lk = (s.look && s.look[pl.id]) || {}
      st.look[pl.id] = {
        opacity: Number.isFinite(lk.opacity)
          ? clamp(Math.round(lk.opacity), 5, 100)
          : pl.opacity,
        mode: typeof lk.mode === 'string' ? lk.mode : '',
      }
    }
    return st
  }

  function mount(root) {
    root.classList.add('fv')
    const st = loadState()
    const sessionClock = clockStamp()
    let saveTimer = 0
    const persist = () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => LN.store.set(KEY, st), 250)
    }
    const plate = () => PLATE[st.type]
    const prm = () => st.params[st.type]
    /** Params as the renderers see them, with the REC text resolved. */
    const live = () => {
      const p = { ...prm(), fps: st.fps, duration: st.dur, seed: st.seed }
      if (st.type === 'rec') {
        p.date = (p.date || '').trim() || dateStamp()
        p.clock = (p.clock || '').trim() || sessionClock
      }
      return p
    }
    const modeOf = id => {
      const pl = PLATE[id]
      const modes = pl.modes(st.params[id])
      const want = st.look[id].mode
      return modes.includes(want) ? want : modes[0]
    }

    /* ---- plate cards */
    const cards = {}
    const cardRow = h(
      'div',
      { class: 'fv-cards', role: 'group', 'aria-label': 'Plates' },
      PLATES.map(pl => {
        const cv = h('canvas', {
          class: 'fv-thumb',
          width: 256,
          height: 144,
          'aria-hidden': 'true',
        })
        const tag = h('span', { class: 'fv-card-tag' })
        const btn = h(
          'button',
          {
            type: 'button',
            class: 'fv-card',
            dataset: { id: pl.id },
            'aria-pressed': String(pl.id === st.type),
            onClick: () => select(pl.id),
          },
          cv,
          h('span', { class: 'fv-card-name' }, pl.short),
          tag,
        )
        cards[pl.id] = { btn, cv, tag }
        return btn
      }),
    )
    const tagCard = id => {
      cards[id].tag.textContent = modeOf(id)
    }
    /** Card thumbnail: a magnified 16:9 view of the plate at frame i. The
     *  selected card is redrawn on every preview frame, so it animates. */
    function thumb(id, i = Math.round(1.5 * st.fps)) {
      const pl = PLATE[id]
      const c = cards[id].cv
      const p = {
        ...st.params[id],
        fps: st.fps,
        duration: st.dur,
        seed: st.seed,
        zoom: 3,
      }
      if (id === 'rec') {
        p.date = (p.date || '').trim() || dateStamp()
        p.clock = (p.clock || '').trim() || sessionClock
      }
      pl.draw(
        c.getContext('2d'),
        c.width,
        c.height,
        i / st.fps,
        p,
        frameRng(st.seed, i),
      )
    }

    /* ---- monitor */
    const canvas = h('canvas', {
      class: 'fv-canvas',
      width: 270,
      height: 480,
      role: 'img',
      'aria-label': 'Live preview of the plate',
    })
    const pctx = canvas.getContext('2d', { alpha: false })
    const screen = h('div', { class: 'fv-screen' }, canvas)
    const monName = h('span', null, '')
    const monSize = h('span', { class: 'ln-num' }, '')
    const monTc = h('span', { class: 'ln-num' }, '00:00:00:00')
    const monLoop = h('span', { class: 'ln-num' }, '')
    const playBtn = ui.btn('Pause', () => setPlaying(!playing), {
      kind: 'quiet',
      small: true,
    })
    const monitor = h(
      'div',
      { class: 'fv-monitor' },
      h('div', { class: 'fv-mon-bar' }, monName, monSize),
      screen,
      h('div', { class: 'fv-mon-bar' }, monTc, monLoop),
    )

    let still = null
    let stillFit = null
    const clearStill = ui.btn(
      'Clear still',
      () => {
        if (still && still.close) still.close()
        still = null
        stillFit = null
        clearStill.hidden = true
        stillNote.textContent = 'Blended over the Lunar chart.'
        repaint()
      },
      { kind: 'quiet', small: true },
    )
    clearStill.hidden = true
    const stillNote = h(
      'p',
      { class: 'fv-note' },
      'Blended over the Lunar chart.',
    )
    const viewSeg = ui.seg({
      label: 'Preview',
      value: st.view,
      options: [
        { value: 'plate', label: 'Plate' },
        { value: 'blend', label: 'Blended' },
      ],
      onChange: v => {
        st.view = v
        persist()
        labels()
        repaint()
      },
    })
    const pick = ui.filePick({
      accept: 'image/*',
      label: 'Use your still',
      small: true,
      onFile: async file => {
        try {
          // Decode at preview size: a 50 MP frame is far more than the monitor needs.
          let bmp
          try {
            bmp = await createImageBitmap(file, {
              resizeWidth: 1600,
              resizeQuality: 'high',
            })
          } catch (_e) {
            bmp = await createImageBitmap(file)
          }
          if (still && still.close) still.close()
          still = bmp
          stillFit = null
          clearStill.hidden = false
          stillNote.textContent = `Blended over ${file.name}.`
          st.view = 'blend'
          viewSeg.set('blend')
          persist()
          labels()
          repaint()
        } catch (_e) {
          LN.toast('That image could not be read. Try a JPEG or PNG.', {
            kind: 'err',
          })
        }
      },
    })
    const viewRow = h(
      'div',
      { class: 'fv-view' },
      viewSeg.el,
      h('div', { class: 'ln-row fv-view-acts' }, pick, clearStill, playBtn),
    )

    /* ---- look controls */
    const lookHost = h('div', { class: 'ln-stack' })
    const sliders = {}
    let presetBtns = []
    let variantSeg = null
    const seedField = ui.field({
      label: 'Seed',
      type: 'number',
      value: st.seed,
      onInput: v => {
        const n = Math.trunc(Number(v))
        if (!Number.isFinite(n) || n < 1) return
        st.seed = Math.min(99999, n)
        changed({ thumbs: true })
      },
    })
    seedField.input.setAttribute('inputmode', 'numeric')
    seedField.input.min = '1'
    seedField.input.max = '99999'
    const seedRow = h(
      'div',
      { class: 'fv-seed' },
      seedField.el,
      ui.btn(
        'New seed',
        () => {
          st.seed = 1 + Math.floor(Math.random() * 99998)
          seedField.set(st.seed)
          changed({ thumbs: true })
        },
        { kind: 'ghost', small: true },
      ),
    )
    const blendHost = h('div', { class: 'ln-stack' })

    function matches(ps) {
      const p = prm()
      return Object.entries(ps.set).every(([k, v]) =>
        typeof v === 'number' ? Math.abs((p[k] ?? -1) - v) < 0.005 : p[k] === v,
      )
    }
    function markPresets() {
      const pl = plate()
      presetBtns.forEach((b, i) =>
        b.setAttribute('aria-pressed', String(matches(pl.presets[i]))),
      )
    }
    function applyPreset(ps) {
      const p = prm()
      Object.assign(p, ps.set)
      for (const [k, v] of Object.entries(ps.set)) {
        if (sliders[k]) sliders[k].set(v)
      }
      if (variantSeg && ps.set.variant) variantSeg.set(ps.set.variant)
      changed({ recipe: true, blend: true })
    }

    function buildBlend() {
      const pl = plate()
      const modes = pl.modes(prm())
      const look = st.look[pl.id]
      const kids = [h('div', { class: 'ln-eyebrow' }, 'In CapCut')]
      if (modes.length > 1) {
        kids.push(
          ui.seg({
            label: 'Blend',
            value: modeOf(pl.id),
            options: modes.map(m => ({ value: m, label: m })),
            onChange: v => {
              look.mode = v
              changed({ recipe: true })
            },
          }).el,
        )
      } else {
        kids.push(
          h(
            'p',
            { class: 'fv-note' },
            'Blend: ',
            h('b', null, modes[0]),
            '. The opacity below sets the Blended preview and the recipe.',
          ),
        )
      }
      kids.push(
        ui.slider({
          label: 'Opacity',
          min: 5,
          max: 100,
          step: 5,
          value: look.opacity,
          unit: '%',
          onInput: v => {
            look.opacity = v
            changed({ recipe: true })
          },
        }).el,
      )
      blendHost.replaceChildren(...kids)
    }

    function buildLook() {
      const pl = plate()
      const p = prm()
      for (const k of Object.keys(sliders)) delete sliders[k]
      presetBtns = pl.presets.map(ps =>
        h(
          'button',
          {
            type: 'button',
            class: 'ln-chip fv-preset',
            'aria-pressed': 'false',
            onClick: () => applyPreset(ps),
          },
          ps.label,
        ),
      )
      variantSeg = pl.variants
        ? ui.seg({
            label: pl.variants.label,
            value: p.variant,
            options: pl.variants.options,
            onChange: v => {
              p.variant = v
              changed({ recipe: true, blend: true })
            },
          })
        : null
      const grid = h('div', { class: 'fv-params' })
      for (const d of pl.params) {
        const s = ui.slider({
          label: d.label,
          min: d.min,
          max: d.max,
          step: d.step,
          value: p[d.key],
          format: d.format,
          onInput: v => {
            p[d.key] = v
            changed()
          },
        })
        sliders[d.key] = s
        grid.append(s.el)
      }
      const extra = []
      if (pl.id === 'rec') {
        const date = ui.field({
          label: 'Date stamp',
          value: p.date,
          placeholder: dateStamp(),
          onInput: v => {
            p.date = v.slice(0, 24)
            changed()
          },
        })
        const clock = ui.field({
          label: 'Clock starts at',
          value: p.clock,
          placeholder: sessionClock,
          onInput: v => {
            p.clock = v.slice(0, 16)
            changed()
          },
        })
        extra.push(
          h('div', { class: 'fv-params' }, date.el, clock.el),
          h(
            'p',
            { class: 'fv-note' },
            'Leave them empty for tonight’s date and the time you opened this page. The clock and counter run with the clip.',
          ),
        )
      }
      const kids = [
        h(
          'header',
          { class: 'fv-look-head' },
          h('h3', { class: 'ln-h3' }, pl.name),
          h('p', { class: 'fv-blurb' }, pl.blurb),
        ),
        h(
          'div',
          { class: 'fv-presets', role: 'group', 'aria-label': 'Presets' },
          presetBtns,
        ),
        variantSeg ? variantSeg.el : null,
        grid,
        ...extra,
        seedRow,
        blendHost,
      ]
      lookHost.replaceChildren(...kids.filter(Boolean))
      buildBlend()
      markPresets()
    }

    /* ---- output */
    const sizeNote = h('p', { class: 'fv-note ln-num' })
    const warn4k = ui.callout(
      'warn',
      '4K is 8.3 million pixels a frame: slow to render and a large file. Use it only if your CapCut project is 4K; 9:16 or 16:9 at 1080 is right for Reels, Shorts and TikTok.',
      'Slow, large file',
    )
    const sizeSeg = ui.seg({
      label: 'Size',
      value: st.size,
      options: Object.entries(SIZES).map(([value, s]) => ({
        value,
        label: s.label,
      })),
      onChange: v => {
        st.size = v
        changed({ size: true })
      },
    })
    const fpsSeg = ui.seg({
      label: 'Frame rate',
      value: st.fps,
      options: [
        { value: 24, label: '24 fps' },
        { value: 30, label: '30 fps' },
      ],
      onChange: v => {
        st.fps = v
        changed({ thumbs: true, size: true })
      },
    })
    const durSeg = ui.seg({
      label: 'Length',
      value: st.dur,
      options: DURATIONS.map(d => ({ value: d, label: `${d} s` })),
      onChange: v => {
        st.dur = v
        changed({ size: true })
      },
    })
    const engine = h(
      'p',
      { class: 'fv-note' },
      LN.media && LN.media.hasWebCodecs()
        ? 'This browser has WebCodecs, so renders should be frame-accurate: every frame encoded in order. The result below says which path ran.'
        : 'No WebCodecs in this browser: renders fall back to real-time capture, which can drop frames.',
    )

    /* ---- render */
    const renderBtn = ui.btn('Render MP4', () => renderClip(), { block: true })
    const stillBtn = ui.btn('Save still (.png)', () => saveStill(), {
      kind: 'quiet',
      block: true,
    })
    const barFill = h('i')
    const progText = h('span', { class: 'ln-num' }, '')
    let ac = null
    const cancelBtn = ui.btn('Cancel', () => ac && ac.abort(), {
      kind: 'danger',
      small: true,
    })
    const progress = h(
      'div',
      {
        class: 'fv-progress',
        hidden: true,
        role: 'status',
        'aria-live': 'polite',
      },
      h('div', { class: 'fv-bar' }, barFill),
      h('div', { class: 'fv-prog-row' }, progText, cancelBtn),
    )
    const result = h('div', { class: 'fv-result', hidden: true })
    const statusLine = h('p', { class: 'fv-note', role: 'status' })

    /* ---- recipe */
    const recipeHost = h('div', { class: 'ln-stack fv-recipe' })
    function buildRecipe() {
      const pl = plate()
      const p = prm()
      const mode = modeOf(pl.id)
      const op = st.look[pl.id].opacity
      const sz = SIZES[st.size]
      const steps = [
        h(
          'span',
          null,
          `Render the plate at your project size (${sz.label}, ${sz.w} × ${sz.h}) and save it to the phone. It usually lands in Downloads.`,
        ),
        h(
          'span',
          null,
          'In CapCut, park the playhead where the texture should start, tap ',
          ui.path('Overlay', 'Add overlay'),
          ' and pick the MP4 from your videos.',
        ),
        h(
          'span',
          null,
          'Pinch the overlay out on the preview until its edges meet the frame edges. It matches the project size, so nothing crops.',
        ),
        h(
          'span',
          null,
          'With the overlay selected, tap ',
          ui.path('Blend', mode),
          ', then set ',
          ui.path('Opacity'),
          ' to ',
          h('b', null, `${op}%`),
          '.',
        ),
        pl.id === 'rec'
          ? h(
              'span',
              null,
              'Drag its end to the end of the shot. The counter restarts on every copy, so render one clip as long as the shot.',
            )
          : h(
              'span',
              null,
              'Drag its end to the end of the shot. For a longer shot, tap ',
              ui.path('Duplicate'),
              ' and butt the copies end to end: the plate loops cleanly.',
            ),
      ]
      const kids = [
        h(
          'div',
          { class: 'ln-row' },
          ui.chip(`${pl.base(p)} plate`),
          ui.chip(mode, 'amber'),
          ui.chip(`Opacity ${op}%`),
        ),
        h('p', { class: 'fv-why' }, pl.why),
        ui.steps(steps),
        pl.id === 'grain'
          ? ui.callout(
              'tip',
              'Grain textures everything under it. Keep it above your other plates, and give it the last word over a light leak.',
            )
          : null,
        ui.callout(
          'verify',
          h(
            'span',
            null,
            'CapCut renames and moves menus between updates. On your phone, check that the bottom toolbar has ',
            ui.path('Overlay', 'Add overlay'),
            ', that the selected overlay shows ',
            ui.path('Blend'),
            ' (scroll the clip toolbar sideways if it is hidden), and that its list has ',
            `${mode} and an Opacity slider.`,
          ),
        ),
      ]
      recipeHost.replaceChildren(...kids.filter(Boolean))
    }

    /* ---- layout */
    root.append(
      ui.section(
        {
          eyebrow: 'Overlay Forge',
          title: 'Plates for the blend modes',
          lede: 'Six looping texture plates, built on black, grey or white for a CapCut blend mode. Pick one, tune it against the live preview, then render the MP4 at your project size.',
        },
        cardRow,
        h(
          'div',
          { class: 'fv-stage' },
          h('div', { class: 'fv-left' }, monitor, viewRow, stillNote),
          h(
            'div',
            { class: 'fv-right' },
            h('div', { class: 'ln-card fv-look' }, lookHost),
            h(
              'div',
              { class: 'ln-card fv-out' },
              h('div', { class: 'ln-eyebrow' }, 'Output'),
              sizeSeg.el,
              warn4k,
              h('div', { class: 'fv-two' }, fpsSeg.el, durSeg.el),
              sizeNote,
              engine,
              h('div', { class: 'fv-actions' }, renderBtn, stillBtn),
              progress,
              statusLine,
              result,
            ),
          ),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Use in CapCut',
          title: 'Lay it over the footage',
          lede: 'Every plate carries its own blend mode. These steps follow the plate you have selected.',
        },
        recipeHost,
      ),
    )

    /* ---- painting */
    let playing = !LN.reducedMotion()
    let visible = true
    let onRoute = true
    let busy = false
    let raf = 0
    let clock0 = performance.now()
    let lastI = Math.round(1.5 * st.fps)

    function stillBase(g, W, H) {
      if (still) {
        if (!stillFit || stillFit.width !== W || stillFit.height !== H) {
          stillFit = document.createElement('canvas')
          stillFit.width = W
          stillFit.height = H
          const sg = stillFit.getContext('2d')
          sg.imageSmoothingQuality = 'high'
          const s = Math.max(W / still.width, H / still.height)
          const dw = still.width * s
          const dh = still.height * s
          sg.drawImage(still, (W - dw) / 2, (H - dh) / 2, dw, dh)
        }
        g.drawImage(stillFit, 0, 0)
        return
      }
      const c = scratch('fv-chart', W, H)
      if (!c._ok) {
        drawChart(c.getContext('2d'), W, H)
        c._ok = true
      }
      g.drawImage(c, 0, 0)
    }

    function paint(i) {
      const pl = plate()
      const p = live()
      const W = canvas.width
      const H = canvas.height
      const t = i / st.fps
      const rng = frameRng(st.seed, i)
      if (st.view === 'blend') {
        const off = scratch('fv-plate', W, H)
        pl.draw(off.getContext('2d'), W, H, t, p, rng)
        reset(pctx)
        stillBase(pctx, W, H)
        pctx.globalCompositeOperation = CANVAS_MODE[modeOf(pl.id)] || 'screen'
        pctx.globalAlpha = st.look[pl.id].opacity / 100
        pctx.drawImage(off, 0, 0)
        reset(pctx)
      } else {
        pl.draw(pctx, W, H, t, p, rng)
        reset(pctx)
      }
      thumb(pl.id, i)
      monTc.textContent = LN.fmt.tc(t, st.fps)
    }
    const frames = () => Math.max(1, Math.round(st.dur * st.fps))
    function repaint() {
      if (busy) return
      lastI %= frames()
      paint(lastI)
    }
    const shouldRun = () =>
      playing &&
      visible &&
      onRoute &&
      !busy &&
      document.visibilityState !== 'hidden'
    function loop(now) {
      raf = 0
      if (!shouldRun()) return
      raf = requestAnimationFrame(loop)
      const i = Math.floor(((now - clock0) / 1000) * st.fps) % frames()
      if (i === lastI) return
      lastI = i
      paint(i)
    }
    function kick() {
      if (!raf && shouldRun()) {
        clock0 = performance.now() - (lastI / st.fps) * 1000
        raf = requestAnimationFrame(loop)
      }
    }
    function halt() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    function setPlaying(on) {
      playing = on
      playBtn.textContent = on ? 'Pause' : 'Play'
      if (on) kick()
      else {
        halt()
        repaint()
      }
    }

    function sizeCanvas() {
      const sz = SIZES[st.size]
      screen.style.setProperty('--fv-ar', String(sz.w / sz.h))
      const r = screen.getBoundingClientRect()
      const cssW = r.width || 270
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      let W = Math.round(cssW * dpr)
      let H = Math.round((W * sz.h) / sz.w)
      const cap = 1280 / Math.max(W, H)
      if (cap < 1) {
        W = Math.round(W * cap)
        H = Math.round(H * cap)
      }
      if (W > sz.w) {
        W = sz.w
        H = sz.h
      }
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
        repaint()
      }
    }

    function labels() {
      const pl = plate()
      const sz = SIZES[st.size]
      const p = prm()
      monName.textContent =
        st.view === 'blend'
          ? `${pl.short} · ${modeOf(pl.id)} ${st.look[pl.id].opacity}%`
          : `${pl.short} · ${pl.base(p)} plate`
      monSize.textContent = `${sz.w}×${sz.h} · ${st.fps}p`
      monLoop.textContent = `Loop ${st.dur} s · seed ${st.seed}`
      const mb = (bitrateFor(pl, sz.w, sz.h, st.fps) * st.dur) / 8 / 1e6
      sizeNote.textContent = `${sz.w} × ${sz.h} px · ${frames()} frames · up to about ${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
      warn4k.hidden = st.size !== '4k'
      stillNote.hidden = st.view !== 'blend'
      for (const id of Object.keys(cards)) tagCard(id)
    }

    function changed(o = {}) {
      persist()
      markPresets()
      if (o.size) sizeCanvas()
      if (o.recipe || o.size) buildRecipe()
      // Blend modes can change with the variant (the CRT plate).
      if (o.blend) buildBlend()
      if (o.thumbs)
        for (const id of Object.keys(cards)) if (id !== st.type) thumb(id)
      labels()
      if (!raf) repaint()
    }

    function select(id) {
      if (!PLATE[id] || busy) return
      st.type = id
      for (const [k, c] of Object.entries(cards))
        c.btn.setAttribute('aria-pressed', String(k === id))
      buildLook()
      buildRecipe()
      labels()
      persist()
      prepare(PLATE[id], live()).then(() => {
        if (!raf) repaint()
      })
      repaint()
    }

    /* ---- render + save */
    function setBusy(on) {
      busy = on
      renderBtn.disabled = on
      stillBtn.disabled = on
      progress.hidden = !on
      for (const c of Object.values(cards)) c.btn.disabled = on
      if (on) {
        halt()
        barFill.style.width = '0%'
        progText.textContent = 'Preparing the encoder…'
      }
    }
    const codecName = res => {
      const c = String(res.codec || '')
      if (c === 'avc' || c.includes('avc1')) return 'H.264'
      if (c === 'hevc') return 'HEVC'
      if (c.includes('vp9')) return 'VP9'
      if (c.includes('vp8')) return 'VP8'
      return res.ext.toUpperCase()
    }
    function showResult(res) {
      const exact = res.via === 'webcodecs'
      const kids = [
        h('div', { class: 'fv-file' }, res.filename),
        h(
          'div',
          { class: 'ln-row' },
          ui.chip(
            exact ? 'Frame-accurate' : 'Real-time capture',
            exact ? 'sage' : 'crimson',
          ),
          ui.chip(`${codecName(res)} ${res.ext.toUpperCase()}`),
          ui.chip(LN.fmt.bytes(res.blob.size)),
          ui.chip(`${(res.ms / 1000).toFixed(1)} s to render`),
        ),
        h(
          'p',
          { class: 'fv-note' },
          exact
            ? `Encoded frame by frame with WebCodecs: all ${res.frames} frames are in the file.`
            : 'Captured in real time with MediaRecorder: frames can drop if the phone is busy. If it stutters in CapCut, render again with nothing else open.',
        ),
      ]
      if (res.ext === 'webm')
        kids.push(
          ui.callout(
            'verify',
            'This browser made a WebM, not an MP4. CapCut may not import WebM; render in Chrome on the Pixel to get an MP4.',
          ),
        )
      kids.push(
        h(
          'div',
          { class: 'ln-row' },
          ui.btn('Save again', () => saveResult(res), {
            kind: 'ghost',
            small: true,
          }),
        ),
      )
      result.replaceChildren(...kids)
      result.hidden = false
    }
    const saveResult = res =>
      LN.save({ filename: res.filename, data: res.blob, mime: res.blob.type })

    async function renderClip(over = {}) {
      if (busy) return null
      const pl = plate()
      const sz = SIZES[st.size]
      const W = Math.round(num(over.width, sz.w))
      const H = Math.round(num(over.height, sz.h))
      const fps = num(over.fps, st.fps)
      const duration = num(over.duration, st.dur)
      ac = new AbortController()
      setBusy(true)
      statusLine.textContent = ''
      const t0 = performance.now()
      const fit = (src, i) => {
        if (i % 3) return
        reset(pctx)
        pctx.fillStyle = '#000'
        pctx.fillRect(0, 0, canvas.width, canvas.height)
        const s = Math.min(canvas.width / src.width, canvas.height / src.height)
        const dw = src.width * s
        const dh = src.height * s
        pctx.drawImage(
          src,
          (canvas.width - dw) / 2,
          (canvas.height - dh) / 2,
          dw,
          dh,
        )
        monTc.textContent = LN.fmt.tc(i / fps, fps)
      }
      try {
        const res = await render({
          type: pl.id,
          width: W,
          height: H,
          fps,
          duration,
          seed: st.seed,
          params: live(),
          signal: ac.signal,
          onFrame: fit,
          onProgress: (done, total) => {
            const f = done / total
            barFill.style.width = `${(f * 100).toFixed(1)}%`
            const el = (performance.now() - t0) / 1000
            const left = f > 0.04 ? Math.max(0, el / f - el) : 0
            progText.textContent = `Frame ${done} / ${total} · ${Math.round(f * 100)}%${left ? ` · about ${Math.ceil(left)} s left` : ''}`
          },
        })
        res.ms = performance.now() - t0
        api.last = res
        showResult(res)
        statusLine.textContent = ''
        await saveResult(res)
        return res
      } catch (e) {
        if (e && e.name === 'AbortError') {
          statusLine.textContent = 'Render cancelled. Nothing was saved.'
          LN.toast('Render cancelled', { kind: 'warn' })
        } else {
          console.warn('[forge-video] render failed', e)
          statusLine.textContent = `Render failed: ${(e && e.message) || e}. Try a smaller size or a shorter length.`
          LN.toast('Render failed', { kind: 'err' })
        }
        return null
      } finally {
        ac = null
        setBusy(false)
        purge()
        repaint()
        kick()
      }
    }

    async function saveStill() {
      if (busy) return
      const pl = plate()
      const sz = SIZES[st.size]
      const p = live()
      await prepare(pl, p)
      const c = document.createElement('canvas')
      c.width = sz.w
      c.height = sz.h
      const i = lastI % frames()
      pl.draw(
        c.getContext('2d', { alpha: false }),
        sz.w,
        sz.h,
        i / st.fps,
        p,
        frameRng(st.seed, i),
      )
      const blob = await new Promise(r => c.toBlob(r, 'image/png'))
      c.width = 0
      c.height = 0
      purge()
      if (!blob) {
        LN.toast('This browser could not make the PNG.', { kind: 'err' })
        return
      }
      await LN.save({
        filename: `LN_${pl.tag(p)}_${sz.w}x${sz.h}_still.png`,
        data: blob,
        mime: 'image/png',
      })
    }

    /* ---- start */
    buildLook()
    buildRecipe()
    labels()
    for (const pl of PLATES) thumb(pl.id)
    sizeCanvas()
    setPlaying(playing)
    repaint()
    LN.fontsReady(FACE_KEYS.map(k => `500 40px ${faceStack(k)}`)).then(() => {
      thumb('rec')
      if (!raf) repaint()
    })

    if (typeof ResizeObserver === 'function')
      new ResizeObserver(() => sizeCanvas()).observe(screen)
    // Animate while the monitor or the plate cards are on screen: the
    // selected card animates with the preview, so it needs the loop too.
    if (typeof IntersectionObserver === 'function') {
      const seen = new Map()
      const io = new IntersectionObserver(entries => {
        for (const e of entries) seen.set(e.target, e.isIntersecting)
        visible = Array.from(seen.values()).some(Boolean)
        if (visible) kick()
        else halt()
      })
      io.observe(screen)
      io.observe(cardRow)
    }
    LN.bus.on('route', id => {
      onRoute = id === 'forge'
      if (onRoute) kick()
      else halt()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') halt()
      else kick()
    })

    api.renderClip = renderClip
    api.state = st
    api.isRunning = () => raf !== 0
    return { renderClip, select }
  }

  const api = {
    mount,
    RENDERERS,
    PLATES,
    rng: frameRng,
    defaults,
    render,
    renderClip: null,
    isRunning: () => false,
    last: null,
  }
  LN.forgeVideo = api
})()
