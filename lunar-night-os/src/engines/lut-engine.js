/* Lunar Night OS: colour engine (owned by Grade).
   Builds the three house looks as 3D LUTs, reads and writes .cube files, and
   grades pixels in the page. Pure maths, no DOM except ImageData.data inside
   applyToImageData. A classic script that also loads in Node/Bun through
   `await import(path)` (strict ESM), so: no top-level `this`, no window.

   Colour model
   - Input and output are 0..1 Rec.709 display-referred, gamma-encoded values
     (what the phone records with 10-bit HDR off). Rec.709 and sRGB share
     primaries; the sRGB curve is used as the display decode.
   - Hue-selective work happens in OKLab / OKLCh (Ottosson 2020), where equal
     steps look equal and hue stays put when chroma changes.
   - Tone curves are defined on the gamma-encoded 0..255 scale the chef knows
     from CapCut. They are applied to OKLab lightness through the neutral that
     has the same lightness, so a grey ramp follows the curve exactly and
     colours keep their hue and chroma.
   - Every control is smooth: cosine hue windows, smoothstep gates, monotone
     cubic curves and a soft gamut knee. No hard thresholds, so the 33-point
     lattice interpolates cleanly.

   API (globalThis.LN_LUT, and LN.lut in the page)
     LOOKS, defaults(id), transform(id, params, r, g, b) -> [r, g, b],
     build(id, params, size = 33) -> Float32Array, identity(size),
     toCube(table, size, {title, comments}), parseCube(text),
     sample(table, size, r, g, b, out?), applyToImageData(img, table, size, k),
     lutStats(table).
   Table order is the .cube order: index = ((b * size + g) * size + r) * 3. */
;(() => {
  /* ------------------------------------------------------------ small maths */
  const PI = Math.PI
  const D2R = PI / 180
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x)
  const smooth = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
  }
  /** Rises e0..e1, falls f0..f1 (both smoothstep). */
  const band = (x, e0, e1, f0, f1) =>
    smooth(e0, e1, x) * (1 - smooth(f0, f1, x))

  /* ------------------------------------------------------------ transfer */
  // sRGB / Rec.709 display decode and encode, odd-extended so out-of-range
  // intermediate values stay continuous.
  const decode = c => {
    const a = c < 0 ? -c : c
    const v = a <= 0.04045 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4
    return c < 0 ? -v : v
  }
  const encode = c => {
    const a = c < 0 ? -c : c
    const v = a <= 0.0031308 ? a * 12.92 : 1.055 * a ** (1 / 2.4) - 0.055
    return c < 0 ? -v : v
  }

  /* ------------------------------------------------------------ OKLab */
  function linToLab(r, g, b, o) {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    o[0] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
    o[1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    o[2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    return o
  }
  function labToLin(L, a, b, o) {
    const l = L + 0.3963377774 * a + 0.2158037573 * b
    const m = L - 0.1055613458 * a - 0.0638541728 * b
    const s = L - 0.0894841775 * a - 1.291485548 * b
    const l3 = l * l * l
    const m3 = m * m * m
    const s3 = s * s * s
    o[0] = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
    o[1] = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
    o[2] = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
    return o
  }
  /** OKLab lightness of the grey with gamma-encoded value v, and back. */
  const greyL = v => Math.cbrt(decode(v))
  const greyV = L => encode(L * L * L)
  const hueOf = (a, b) => {
    const h = Math.atan2(b, a) / D2R
    return h < 0 ? h + 360 : h
  }
  /** Any angle → [0, 360). */
  const wrap = h => {
    const x = h % 360
    return x < 0 ? x + 360 : x
  }
  const hueDist = (h, c) => {
    const d = Math.abs(h - c) % 360
    return d > 180 ? 360 - d : d
  }
  /** Flat-top cosine window: 1 within ±core° of c, 0 beyond ±(core + edge)°. */
  const hueWin = (h, c, core, edge) => {
    const d = hueDist(h, c)
    if (d <= core) return 1
    if (d >= core + edge) return 0
    return 0.5 + 0.5 * Math.cos((PI * (d - core)) / edge)
  }

  /* ------------------------------------------------------------ curves */
  /** Monotone cubic through (xs, ys): Fritsch–Carlson tangents, Hermite
   *  segments. Input is clamped to the first and last x. */
  function monotone(xs, ys) {
    const n = xs.length
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
      const s = a * a + b * b
      if (s > 9) {
        const t = 3 / Math.sqrt(s)
        m[i] = t * a * d[i]
        m[i + 1] = t * b * d[i]
      }
    }
    return x => {
      if (x <= xs[0]) return ys[0]
      if (x >= xs[n - 1]) return ys[n - 1]
      let i = 0
      while (x > xs[i + 1]) i++
      const h = xs[i + 1] - xs[i]
      const t = (x - xs[i]) / h
      const t2 = t * t
      const t3 = t2 * t
      return (
        (2 * t3 - 3 * t2 + 1) * ys[i] +
        (t3 - 2 * t2 + t) * h * m[i] +
        (3 * t2 - 2 * t3) * ys[i + 1] +
        (t3 - t2) * h * m[i + 1]
      )
    }
  }
  /** Points given on the 0..255 scale → monotone curve on 0..1. Contrast
   *  scales each point's distance from the straight line joining the end
   *  points (0 = that line, 1 = as drawn, 2 = twice the S). */
  function curve255(points, contrast = 1) {
    const xs = points.map(p => p[0] / 255)
    const ys = points.map(p => p[1] / 255)
    const y0 = ys[0]
    const y1 = ys[ys.length - 1]
    for (let i = 1; i < ys.length - 1; i++) {
      const line = y0 + (y1 - y0) * xs[i]
      ys[i] = line + contrast * (ys[i] - line)
    }
    for (let i = 1; i < ys.length; i++)
      ys[i] = Math.max(ys[i], ys[i - 1] + 1e-5)
    return monotone(xs, ys)
  }

  /* ------------------------------------------------------------ hue bands */
  // The eight CapCut HSL colours, placed at the OKLCh hue of the matching
  // sRGB colour (red #FF0000, orange #FF8000 ... magenta #FF00FF).
  const BAND_HUES = [29.2, 52.8, 109.8, 142.5, 194.8, 264.1, 293.8, 328.4]
  /** Cosine interpolation of per-band rows [hue°, chroma, light] around the
   *  circle. Weights of neighbouring bands always sum to 1. */
  function bandLookup(rows) {
    const n = BAND_HUES.length
    return (h, o) => {
      let k = n - 1
      for (let i = 0; i < n; i++) if (h >= BAND_HUES[i]) k = i
      const c0 = BAND_HUES[k]
      const c1 = k === n - 1 ? BAND_HUES[0] + 360 : BAND_HUES[k + 1]
      const hh = h < c0 ? h + 360 : h
      const w = 0.5 - 0.5 * Math.cos((PI * (hh - c0)) / (c1 - c0))
      const r0 = rows[k]
      const r1 = rows[(k + 1) % n]
      o[0] = r0[0] + (r1[0] - r0[0]) * w
      o[1] = r0[1] + (r1[1] - r0[1]) * w
      o[2] = r0[2] + (r1[2] - r0[2]) * w
      return o
    }
  }

  /* ------------------------------------------------------------ gamut */
  // Cusp table: for every hue, the lightness and chroma of the most
  // saturated sRGB colour. Those colours sit on the six cube edges that run
  // red → yellow → green → cyan → blue → magenta → red.
  const CUSP_L = new Float32Array(361)
  const CUSP_C = new Float32Array(361)
  {
    const pts = []
    const o = [0, 0, 0]
    const N = 400
    for (let e = 0; e < 6; e++)
      for (let i = 0; i < N; i++) {
        const t = i / N
        const u = 1 - t
        const rgb = [
          [1, t, 0],
          [u, 1, 0],
          [0, 1, t],
          [0, u, 1],
          [t, 0, 1],
          [1, 0, u],
        ][e]
        linToLab(rgb[0], rgb[1], rgb[2], o)
        const h = Math.atan2(o[2], o[1]) / D2R
        pts.push([h < 0 ? h + 360 : h, o[0], Math.hypot(o[1], o[2])])
      }
    pts.sort((x, y) => x[0] - y[0])
    const first = pts[0]
    const last = pts[pts.length - 1]
    pts.unshift([last[0] - 360, last[1], last[2]])
    pts.push([first[0] + 360, first[1], first[2]])
    let j = 0
    for (let d = 0; d <= 360; d++) {
      while (pts[j + 1][0] < d) j++
      const p0 = pts[j]
      const p1 = pts[j + 1]
      const f = (d - p0[0]) / (p1[0] - p0[0] || 1)
      CUSP_L[d] = p0[1] + (p1[1] - p0[1]) * f
      CUSP_C[d] = p0[2] + (p1[2] - p0[2]) * f
    }
  }
  const cusp = (T, h) => {
    const x = wrap(h)
    const i = Math.floor(x)
    return T[i] + (T[i + 1] - T[i]) * (x - i)
  }
  const cuspL = h => cusp(CUSP_L, h)
  /** Chroma of the gamut edge at (L, h), from the cusp triangle. */
  const edgeC = (L, h) => {
    const Lc = cusp(CUSP_L, h)
    const Cc = cusp(CUSP_C, h)
    return Math.max(1e-4, L <= Lc ? (Cc * L) / Lc : (Cc * (1 - L)) / (1 - Lc))
  }
  /** Soft lightness ceiling along the upper gamut edge (cusp → white). A
   *  vivid colour is not brightened past what its chroma allows, so a glazed
   *  carrot or chilli oil stays rich instead of bleaching toward cream. */
  function ceilingL(L, C, h) {
    const Lc = cusp(CUSP_L, h)
    const top = 1 - (1 - Lc) * Math.min(1, C / cusp(CUSP_C, h))
    const w = 0.03
    if (L <= top - w) return L
    return top - w + w * Math.tanh((L - top + w) / w)
  }
  const GT = [0, 0, 0]
  // Linear-light slack. OKLab bends the cube's faces, so near a primary a
  // straight line can dip a hair outside (R ≈ -0.0004 next to blue) and come
  // back. Counting that hair as inside keeps the boundary search continuous;
  // the final clamp removes it at no visible cost.
  const SLACK = 0.002
  const inGamut = (L, a, b) => {
    labToLin(L, a, b, GT)
    return (
      GT[0] >= -SLACK &&
      GT[0] <= 1 + SLACK &&
      GT[1] >= -SLACK &&
      GT[1] <= 1 + SLACK &&
      GT[2] >= -SLACK &&
      GT[2] <= 1 + SLACK
    )
  }
  const KNEE = 0.85
  const ALPHA = 0.2
  /** OKLab → gamma-encoded RGB in o, with soft gamut compression.
   *  Out-of-gamut colours move toward an anchor on the grey axis (Ottosson's
   *  adaptive-L0 projection toward the hue's cusp): soft colours keep their
   *  lightness and lose chroma, vivid colours trade a little lightness to
   *  keep their chroma. A soft knee starts at 85% of the way to the edge, so
   *  saturated colours roll into the gamut without a crease or a hue shift. */
  function labToRgb(L, a, b, o) {
    const C = Math.hypot(a, b)
    if (C < 1e-9 || L <= 0 || L >= 1.5) {
      const v = encode(clamp01(L <= 0 ? 0 : L * L * L))
      o[0] = o[1] = o[2] = v
      return o
    }
    const Lc = cuspL(hueOf(a, b))
    const Ld = L - Lc
    const ad = Ld < 0 ? -Ld : Ld
    const k = 2 * (Ld > 0 ? 1 - Lc : Lc)
    const e1 = 0.5 * k + ad + (ALPHA * C) / k
    const L0 = clamp(
      Lc +
        0.5 *
          Math.sign(Ld) *
          (e1 - Math.sqrt(Math.max(0, e1 * e1 - 2 * k * ad))),
      0,
      1,
    )
    let t = 1
    if (!inGamut(L0 + (L - L0) / KNEE, a / KNEE, b / KNEE)) {
      // March in from outside to the outermost crossing, then bisect
      // inside that step (a bare bisection could land on either side of a
      // leftover bulge and jump between neighbouring colours).
      let lo = 0
      let hi = 1 / KNEE
      for (let i = 15; i >= 0; i--) {
        const m = i / 16 / KNEE
        if (inGamut(L0 + (L - L0) * m, a * m, b * m)) {
          lo = m
          hi = (i + 1) / 16 / KNEE
          break
        }
      }
      for (let i = 0; i < 16; i++) {
        const m = (lo + hi) / 2
        if (inGamut(L0 + (L - L0) * m, a * m, b * m)) lo = m
        else hi = m
      }
      if (lo < 1e-9) t = 0
      else {
        const x = 1 / lo
        t = (KNEE + (1 - KNEE) * Math.tanh((x - KNEE) / (1 - KNEE))) * lo
      }
    }
    labToLin(L0 + (L - L0) * t, a * t, b * t, o)
    o[0] = encode(clamp01(o[0]))
    o[1] = encode(clamp01(o[1]))
    o[2] = encode(clamp01(o[2]))
    return o
  }

  /* ------------------------------------------------------------ shared scratch */
  const LAB = [0, 0, 0]
  const BAND = [0, 0, 0]
  /** Skin weight: skin hues at moderate saturation (C/L). Maillard crust sits
   *  near C/L 0.2 and is left alone; faces sit near 0.06 to 0.14. */
  const skinWeight = (h, C, L) =>
    hueWin(h, 52, 10, 16) * band(C / Math.max(L, 0.05), 0.025, 0.055, 0.15, 0.2)
  /** Hue rotation fades out near white: rotating a bright yellow toward
   *  orange would push it over the yellow cusp and bleach it in one step. */
  const edgeGuard = L => 1 - smooth(0.84, 0.985, L)
  /** Split-tones are for greys and soft colours; vivid colours take less. */
  const tintable = C => 1 - 0.55 * smooth(0.05, 0.2, C)
  /** Vibrance weight: 1 for soft colours, 0 at the gamut edge and near
   *  white. Boosts are scaled by it so vivid colours do not clip and pale
   *  highlights stay pale (near yellow's tip the gamut edge moves too fast
   *  to push against); cuts always apply in full. */
  const vibrance = (C, L, h) =>
    (1 - smooth(0.55, 1.05, C / edgeC(L, h))) * (1 - smooth(0.8, 0.97, L))
  /** Chroma × f. A cut (f ≤ 1) applies in full. A boost works on chroma
   *  relative to the gamut edge and saturates softly into it, so colours
   *  far from the edge get the whole push and colours near it slide onto it
   *  instead of clipping; near white the boost fades out. */
  function scaleC(C, f, L, h) {
    if (!(f > 1)) return C * Math.max(0, f)
    const fe = 1 + (f - 1) * (1 - smooth(0.8, 0.97, L))
    const E = edgeC(L, h)
    const x = (C / E) * fe
    const y = x <= 0.7 ? x : 0.7 + 0.3 * Math.tanh((x - 0.7) / 0.3)
    return Math.max(C, y * E)
  }
  /** Chroma after a curve takes lightness from L0 to L1. When a vivid
   *  colour is darkened its C/L is kept, the way closing the iris would: the
   *  lower gamut edge is a straight line from black, so the colour stays
   *  inside instead of being pushed out and clipped. */
  const followDark = (C, L0, L1, h) =>
    L1 < L0 && L0 > 0
      ? C * (1 + (L1 / L0 - 1) * smooth(0.5, 1, C / edgeC(L0, h)))
      : C

  /* ------------------------------------------------------------ look 1: Lunar Night */
  // Toning vectors in OKLab (a = green→magenta, b = blue→yellow).
  const SILVER_H = 258.4 // hue of #C8D0DC
  const COBALT_H = 236 // cobalt/teal shadow lean
  const AMBER_H = 80 // tungsten champagne amber (#E5A93C sits at 78°)
  function prepLunar(p) {
    const gain = 2 ** p.exposure
    const curve = curve255(
      [
        [0, p.blackLift],
        [55, 38],
        [100, 91.33],
        [145, 144.67],
        [190, 198],
        [255, p.highlightRoll],
      ],
      p.contrast,
    )
    const fp = p.foodPop
    const gt = p.greenTame
    const bc = p.blueCrush
    const cy = (gt + bc) / 2
    const look = bandLookup([
      [-4 * fp, 0.18 * fp, -0.06 * fp], // red → crimson #9E2A2B
      [3 * fp, 0.22 * fp, 0.04 * fp], // orange: crust, duck fat, yolk
      [-10 * fp, -0.08 * fp, 0.02 * fp], // yellow → gold
      [15 * gt, -0.28 * gt, -0.15 * gt], // green → emerald / forest
      [-8 * cy, -0.35 * cy, -0.12 * cy], // cyan → steel
      [-6 * bc, -0.4 * bc, -0.2 * bc], // blue → obsidian shadows
      [0, -0.45 * bc, -0.2 * bc], // purple: sensor chroma noise
      [0, -0.45 * bc, -0.2 * bc], // magenta: sensor chroma noise
    ])
    // Global saturation applies in full to non-food hues. Food hues keep
    // their own recipe at the default 0.88 and follow any change from it.
    const sat = p.saturation
    const satFood = sat <= 0.88 ? sat / 0.88 : 1 + (sat - 0.88)
    // Split-tone strengths ("intensity 16" and "intensity 14" in CapCut terms).
    const sc = p.shadowCool / 16
    const hw = p.highlightWarm / 14
    const shL = 0.0118 * sc // cobalt lift in the blacks
    const shC = 0.0125 * sc
    const shA = Math.cos(COBALT_H * D2R) * shC
    const shB = Math.sin(COBALT_H * D2R) * shC
    const siA = Math.cos(SILVER_H * D2R) * 0.009
    const siB = Math.sin(SILVER_H * D2R) * 0.009
    const amA = Math.cos(AMBER_H * D2R) * 0.0165 * hw
    const amB = Math.sin(AMBER_H * D2R) * 0.0165 * hw
    const gA = 0.0026 // tiny magenta
    const gB = -0.0046 // slightly cool
    return (r, g, b, o) => {
      let lr = decode(r)
      let lg = decode(g)
      let lb = decode(b)
      if (gain !== 1) {
        // Exposure in linear light. Pushing up uses a soft shoulder,
        // y = gx / (1 + (g - 1)x²), which keeps white at white and is
        // monotone for gains up to 2 (+1 EV), so highlights never clip.
        if (gain < 1) {
          lr *= gain
          lg *= gain
          lb *= gain
        } else {
          const k = gain - 1
          lr = (gain * lr) / (1 + k * lr * lr)
          lg = (gain * lg) / (1 + k * lg * lg)
          lb = (gain * lb) / (1 + k * lb * lb)
        }
      }
      linToLab(lr, lg, lb, LAB)
      let L = LAB[0]
      const C = Math.hypot(LAB[1], LAB[2])
      let h = hueOf(LAB[1], LAB[2])
      // Hue-selective recipe, faded in by chroma so greys stay grey.
      look(h, BAND)
      const protect = 1 - 0.75 * skinWeight(h, C, L)
      const gC = smooth(0, 0.025, C) * protect
      const gL = smooth(0.02, 0.13, C) * protect
      // Boosts work like vibrance: they fade as a colour nears the gamut
      // edge, so already-vivid food does not clip. Cuts apply in full.
      const vib = vibrance(C, L, h)
      const hIn = h
      const dC = BAND[1] * gC
      // Lightness cuts ease off for pale colours in the highlights, so pale
      // blues and lavenders stay luminous silver instead of turning to grey
      // smudge; vivid greens and blues still sink.
      const pale = smooth(0.68, 0.95, L) * (1 - smooth(0.08, 0.2, C))
      const dL = BAND[2] * gL * (BAND[2] < 0 ? 1 - 0.7 * pale : 1)
      h = wrap(h + BAND[0] * gC * edgeGuard(L))
      const satH = sat + (satFood - sat) * hueWin(h, 60, 48, 28)
      let C2 = scaleC(C, (1 + dC) * satH, L, hIn)
      const L1 = L * (1 + (dL > 0 ? dL * vib : dL))
      C2 = followDark(C2, L, L1, h)
      // Filmic tone curve on lightness.
      L = greyL(curve(clamp01(greyV(clamp01(L1)))))
      C2 = followDark(C2, L1, L, h)
      L = ceilingL(L, C2, h)
      const v = greyV(L)
      // Split-tone: cool world, warm food.
      const lift = 1 - smooth(0.02, 0.32, v)
      const shadow =
        (0.3 + 0.7 * smooth(0.02, 0.12, v)) * (1 - smooth(0.1, 0.5, v))
      const high = smooth(0.48, 0.96, v)
      const skin = skinWeight(h, C2, L)
      const warm = hueWin(h, 58, 40, 30) * smooth(0.02, 0.07, C2)
      const cool = (1 - warm) * tintable(C2)
      const amber = warm * high * (1 - 0.5 * skin) * tintable(C2)
      const hr = h * D2R
      let A = C2 * Math.cos(hr)
      let B = C2 * Math.sin(hr)
      L += cool * lift * shL
      A += cool * (shadow * shA + high * siA + gA) + amber * amA
      B += cool * (shadow * shB + high * siB + gB) + amber * amB
      return labToRgb(L, A, B, o)
    }
  }

  /* ------------------------------------------------------------ look 2: Dreamcore */
  function prepDream(p) {
    const fade = p.fade
    const top = 0.958 - 0.12 * fade
    // Mid slope = 1.1 × contrast × (top - fade): 0.79 at the defaults.
    const s = 1.1 * p.contrast
    const d = 0.2
    const tone = monotone(
      [0, 0.5 - d, 0.5, 0.5 + d, 1],
      [0, 0.5 - s * d, 0.5, 0.5 + s * d, 1],
    )
    const look = bandLookup([
      [-5, -0.12, 0.05], // red → coral rose
      [0, -0.02, 0.04], // orange
      [-6, -0.12, 0.03], // yellow → soft gold
      [20, -0.32, 0.07], // green → mint
      [8, -0.25, 0.05], // cyan → pale aqua
      [10, -0.25, 0.06], // blue → periwinkle
      [4, -0.18, 0.05], // purple → lavender
      [0, -0.12, 0.04], // magenta
    ])
    const sat = p.saturation
    const tA = 0.0022 * p.warmth + 0.0085 * p.magenta // Temp +12, Tint +10
    const tB = 0.0105 * p.warmth
    const haA = Math.cos(48 * D2R) * 0.016 * p.halationTint // red-gold
    const haB = Math.sin(48 * D2R) * 0.016 * p.halationTint
    const lvA = Math.cos(284 * D2R) * 0.017 // cyan-lavender shadows
    const lvB = Math.sin(284 * D2R) * 0.017
    return (r, g, b, o) => {
      linToLab(decode(r), decode(g), decode(b), LAB)
      let L = LAB[0]
      const C = Math.hypot(LAB[1], LAB[2])
      let h = hueOf(LAB[1], LAB[2])
      look(h, BAND)
      const gC = smooth(0, 0.03, C)
      h = wrap(h + BAND[0] * gC * edgeGuard(L))
      // Pastel: soft ceiling on chroma, then the saturation control.
      let C2 = C * Math.max(0, 1 + BAND[1] * gC)
      C2 = scaleC(0.17 * Math.tanh(C2 / 0.17), sat, L, h)
      L *= 1 + BAND[2] * smooth(0.02, 0.09, C)
      L += 0.035 * smooth(0.03, 0.15, C) * (1 - L)
      const Ld = greyL(fade + (top - fade) * tone(clamp01(greyV(clamp01(L)))))
      C2 = followDark(C2, L, Ld, h)
      L = Ld
      const v = greyV(L)
      const shadow = 1 - smooth(0.08, 0.55, v)
      const high = smooth(0.45, 1, v)
      const halo = smooth(0.62, 1, v)
      const cast = 0.3 + 0.7 * high
      const tt = tintable(C2)
      const hr = h * D2R
      const A = C2 * Math.cos(hr) + tt * (cast * tA + halo * haA + shadow * lvA)
      const B = C2 * Math.sin(hr) + tt * (cast * tB + halo * haB + shadow * lvB)
      return labToRgb(L, A, B, o)
    }
  }

  /* ------------------------------------------------------------ look 3: VHS */
  function prepVhs(p) {
    // Gamma bump in the mids, tape shoulder in the highlights, a hair of
    // lift so the green shadow tint has somewhere to live.
    const tone = monotone(
      [0, 0.1, 0.3, 0.5, 0.75, 1],
      [0.008, 0.13, 0.355, 0.565, 0.8, 0.985],
    )
    const rb = p.redBleed
    const look = bandLookup([
      [7 * rb, 0.16 * rb, 0.03 * rb], // red: hot, drifting to orange-red
      [3 * rb, 0.06, 0.02], // orange
      [-3, -0.12, 0], // yellow
      [-6, -0.18, -0.02], // green → olive
      [-4, -0.45, -0.03], // cyan: tired
      [0, -0.45, -0.04], // blue: tired
      [0, -0.3, -0.02], // purple
      [-4, -0.1, 0], // magenta
    ])
    const chroma = p.chroma
    const bl = p.blackLevel
    const wl = Math.max(p.whiteLevel, bl + 0.05)
    const shA = Math.cos(128 * D2R) * 0.019 * p.shadowTint // green/yellow
    const shB = Math.sin(128 * D2R) * 0.019 * p.shadowTint
    const hiA = Math.cos(352 * D2R) * 0.02 * p.highlightTint // magenta-pink
    const hiB = Math.sin(352 * D2R) * 0.02 * p.highlightTint
    return (r, g, b, o) => {
      linToLab(decode(r), decode(g), decode(b), LAB)
      let L = LAB[0]
      const C = Math.hypot(LAB[1], LAB[2])
      let h = hueOf(LAB[1], LAB[2])
      look(h, BAND)
      const gC = smooth(0, 0.03, C)
      // Skin goes a touch yellow, like consumer tape.
      h = wrap(h + (BAND[0] * gC + 4 * skinWeight(h, C, L)) * edgeGuard(L))
      let C2 = scaleC(C, (1 + BAND[1] * gC) * chroma, L, h)
      L *= 1 + BAND[2] * smooth(0.02, 0.09, C)
      const Lt = greyL(tone(clamp01(greyV(clamp01(L)))))
      C2 = followDark(C2, L, Lt, h)
      L = Lt
      const v = greyV(L)
      // Faces keep half the green shadow tint: tape skin reads a touch
      // yellow, not olive.
      const shadow =
        band(v, 0, 0.1, 0.25, 0.6) * (1 - 0.5 * skinWeight(h, C2, L))
      const high = smooth(0.55, 1, v)
      const tt = tintable(C2)
      const hr = h * D2R
      const A = C2 * Math.cos(hr) + tt * (shadow * shA + high * hiA)
      const B = C2 * Math.sin(hr) + tt * (shadow * shB + high * hiB)
      labToRgb(L, A, B, o)
      // Full range squeezed into the legal-range window, like tape played
      // back through a cheap deck.
      o[0] = bl + (wl - bl) * o[0]
      o[1] = bl + (wl - bl) * o[1]
      o[2] = bl + (wl - bl) * o[2]
      return o
    }
  }

  /* ------------------------------------------------------------ look table */
  const LOOKS = {
    lunar: {
      id: 'lunar',
      name: 'Lunar Night',
      file: 'LunarNight_Master.cube',
      tagline:
        'Cold obsidian world, lunar-silver highlights, warm amber and crimson on the plate.',
      params: [
        {
          key: 'exposure',
          label: 'Exposure',
          min: -1,
          max: 1,
          step: 0.05,
          default: 0,
          unit: 'EV',
          help: 'Brightness in stops, applied before the curve. Above 0 the highlights roll instead of clipping.',
        },
        {
          key: 'contrast',
          label: 'Contrast',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Strength of the filmic S. 0 is flat between the black lift and the highlight roll; 2 doubles the bend.',
        },
        {
          key: 'blackLift',
          label: 'Black lift',
          min: 0,
          max: 20,
          step: 1,
          default: 6,
          unit: '/255',
          help: 'Matte toe. Pure black lifts to this level before the cobalt shadow tint; with the defaults blacks print at #08080A.',
        },
        {
          key: 'highlightRoll',
          label: 'Highlight roll',
          min: 220,
          max: 255,
          step: 1,
          default: 242,
          unit: '/255',
          help: 'Where pure white lands. Lower keeps plates and chef whites from glaring.',
        },
        {
          key: 'shadowCool',
          label: 'Shadow cool',
          min: 0,
          max: 40,
          step: 1,
          default: 16,
          help: 'Cobalt-teal split tone in the blacks and shadows. Warm food is protected from it.',
        },
        {
          key: 'highlightWarm',
          label: 'Highlight warm',
          min: 0,
          max: 40,
          step: 1,
          default: 14,
          help: 'Tungsten champagne in the highlights of warm colours only, so steel and whites stay silver.',
        },
        {
          key: 'foodPop',
          label: 'Food pop',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Scales the red, orange and yellow recipe: crimson sauce, Maillard crust, yolk and gold. Skin is protected.',
        },
        {
          key: 'greenTame',
          label: 'Green tame',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Pushes greens toward deep forest and emerald and quiets them. 0 leaves greens alone.',
        },
        {
          key: 'blueCrush',
          label: 'Blue crush',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Darkens and quiets blue, purple and magenta into obsidian. Also hides phone chroma noise.',
        },
        {
          key: 'saturation',
          label: 'Saturation',
          min: 0,
          max: 2,
          step: 0.01,
          default: 0.88,
          unit: '×',
          help: 'Overall colour for non-food hues. Food hues follow any change from 0.88.',
        },
      ],
    },
    dream: {
      id: 'dream',
      name: 'Dreamcore',
      file: 'Dreamcore_Halation.cube',
      tagline:
        'Milky lifted blacks, pastel warmth and red-gold highlights. A LUT can only tint highlights the colour of halation; it cannot bloom them.',
      params: [
        {
          key: 'fade',
          label: 'Fade',
          min: 0,
          max: 0.25,
          step: 0.005,
          default: 0.1,
          help: 'Milky lift in the blacks, as a share of full white. 0.1 is about 26/255.',
        },
        {
          key: 'warmth',
          label: 'Warmth',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Golden temperature cast (about Temp +12 at 1), strongest in the highlights.',
        },
        {
          key: 'magenta',
          label: 'Magenta',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Rose tint cast (about Tint +10 at 1), strongest in the highlights.',
        },
        {
          key: 'contrast',
          label: 'Contrast',
          min: 0.5,
          max: 1.2,
          step: 0.01,
          default: 0.85,
          unit: '×',
          help: 'Mid-tone contrast. Below 1 the picture softens like an old memory.',
        },
        {
          key: 'halationTint',
          label: 'Halation tint',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Red-gold tint in the brightest areas, the colour of film halation.',
        },
        {
          key: 'saturation',
          label: 'Saturation',
          min: 0,
          max: 1.5,
          step: 0.01,
          default: 0.9,
          unit: '×',
          help: 'Pastel colour level. Greens lean mint, blues lean periwinkle.',
        },
      ],
    },
    vhs: {
      id: 'vhs',
      name: 'VHS',
      file: 'VHS_Tape_Grade.cube',
      tagline:
        '1990s consumer tape: legal-range blacks and whites, tired blues, hot reds, green shadows. Colour only; add grain and blur for the smear.',
      params: [
        {
          key: 'blackLevel',
          label: 'Black level',
          min: 0,
          max: 0.15,
          step: 0.001,
          default: 0.063,
          help: 'Where black sits. 0.063 is 16/255, video legal black.',
        },
        {
          key: 'whiteLevel',
          label: 'White level',
          min: 0.8,
          max: 1,
          step: 0.005,
          default: 0.92,
          help: 'Where white sits. 0.92 is about 235/255, video legal white.',
        },
        {
          key: 'chroma',
          label: 'Chroma',
          min: 0,
          max: 1.5,
          step: 0.01,
          default: 0.85,
          unit: '×',
          help: 'Overall colour level. Blues and cyans are always quieter than reds.',
        },
        {
          key: 'redBleed',
          label: 'Red bleed',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Hot reds that drift toward orange-red, like an overdriven chroma circuit.',
        },
        {
          key: 'shadowTint',
          label: 'Shadow tint',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Green-yellow in the shadows.',
        },
        {
          key: 'highlightTint',
          label: 'Highlight tint',
          min: 0,
          max: 2,
          step: 0.05,
          default: 1,
          unit: '×',
          help: 'Magenta-pink in the highlights.',
        },
      ],
    },
  }
  const PREP = { lunar: prepLunar, dream: prepDream, vhs: prepVhs }

  /* ------------------------------------------------------------ API */
  function lookOf(lookId) {
    const look = LOOKS[lookId]
    if (!look)
      throw new Error(
        `Unknown look "${lookId}". Use one of: ${Object.keys(LOOKS).join(', ')}.`,
      )
    return look
  }
  /** Defaults merged with params; every value finite and inside its range. */
  function resolve(look, params) {
    const out = {}
    for (const d of look.params) {
      const raw =
        params && params[d.key] != null ? Number(params[d.key]) : d.default
      const v = Number.isFinite(raw) ? raw : d.default
      out[d.key] = clamp(v, d.min, d.max)
    }
    return out
  }
  function defaults(lookId) {
    const out = {}
    for (const d of lookOf(lookId).params) out[d.key] = d.default
    return out
  }
  let lastKey = ''
  let lastFn = null
  function prepared(lookId, params) {
    const look = lookOf(lookId)
    const p = resolve(look, params)
    const key = `${lookId}:${JSON.stringify(p)}`
    if (key !== lastKey) {
      lastFn = PREP[lookId](p)
      lastKey = key
    }
    return lastFn
  }
  /** Grade one colour. r, g, b and the result are 0..1 gamma-encoded. */
  function transform(lookId, params, r, g, b) {
    const fn = prepared(lookId, params)
    const o = [0, 0, 0]
    fn(clamp01(+r || 0), clamp01(+g || 0), clamp01(+b || 0), o)
    return o
  }
  function checkSize(size) {
    const n = Number(size)
    if (!Number.isInteger(n) || n < 2 || n > 256)
      throw new Error(
        `LUT size must be a whole number from 2 to 256 (got ${size}).`,
      )
    return n
  }
  /** Bake a look into a size³ lattice in .cube order (red fastest). */
  function build(lookId, params, size = 33) {
    const n = checkSize(size)
    const fn = prepared(lookId, params)
    const t = new Float32Array(n * n * n * 3)
    const o = [0, 0, 0]
    const q = n - 1
    let i = 0
    for (let b = 0; b < n; b++)
      for (let g = 0; g < n; g++)
        for (let r = 0; r < n; r++) {
          fn(r / q, g / q, b / q, o)
          t[i++] = clamp01(o[0])
          t[i++] = clamp01(o[1])
          t[i++] = clamp01(o[2])
        }
    return t
  }
  function identity(size) {
    const n = checkSize(size)
    const t = new Float32Array(n * n * n * 3)
    const q = n - 1
    let i = 0
    for (let b = 0; b < n; b++)
      for (let g = 0; g < n; g++)
        for (let r = 0; r < n; r++) {
          t[i++] = r / q
          t[i++] = g / q
          t[i++] = b / q
        }
    return t
  }
  function checkTable(table, n) {
    const want = n * n * n * 3
    if (!table || table.length !== want)
      throw new Error(
        `The table holds ${table ? table.length : 0} values; a ${n}³ LUT needs ${want}.`,
      )
  }
  const num6 = v => {
    const s = v.toFixed(6)
    return s === '-0.000000' ? '0.000000' : s
  }
  /** Adobe/IRIDAS .cube text: comments, TITLE, LUT_3D_SIZE, DOMAIN_MIN/MAX,
   *  then size³ lines "r g b" with 6 decimals, '\n' endings, trailing newline. */
  function toCube(table, size, opts = {}) {
    const n = checkSize(size)
    checkTable(table, n)
    const title = String(opts.title == null ? 'Lunar Night OS' : opts.title)
      .replace(/"/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    const comments =
      opts.comments == null
        ? []
        : Array.isArray(opts.comments)
          ? opts.comments
          : [opts.comments]
    const lines = []
    for (const c of comments)
      for (const line of String(c).split(/\r\n|\r|\n/))
        lines.push(line.trim() ? `# ${line.trimEnd()}` : '#')
    lines.push(`TITLE "${title}"`)
    lines.push(`LUT_3D_SIZE ${n}`)
    lines.push('DOMAIN_MIN 0.0 0.0 0.0')
    lines.push('DOMAIN_MAX 1.0 1.0 1.0')
    for (let i = 0; i < table.length; i += 3) {
      const r = table[i]
      const g = table[i + 1]
      const b = table[i + 2]
      if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b))
        throw new Error(`The table has a non-numeric value at entry ${i / 3}.`)
      lines.push(`${num6(r)} ${num6(g)} ${num6(b)}`)
    }
    return `${lines.join('\n')}\n`
  }
  const triple = (parts, lineNo, key) => {
    const v = parts.slice(1, 4).map(Number)
    if (parts.length < 4 || v.some(x => !Number.isFinite(x)))
      throw new Error(`Line ${lineNo}: ${key} needs three numbers.`)
    return v
  }
  /** Parse an Adobe/IRIDAS (or Resolve) 3D .cube file. Accepts CRLF, comments,
   *  blank lines and header keywords in any order before the data. */
  function parseCube(text) {
    if (typeof text !== 'string')
      throw new Error('parseCube needs the text of a .cube file.')
    const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)
    let title = ''
    let size = 0
    let domainMin = [0, 0, 0]
    let domainMax = [1, 1, 1]
    let table = null
    let want = 0
    let count = 0
    for (let li = 0; li < lines.length; li++) {
      let line = lines[li].trim()
      if (!line || line[0] === '#') continue
      const c = line.charCodeAt(0)
      const isData = (c >= 48 && c <= 57) || c === 45 || c === 43 || c === 46
      if (!isData) {
        const parts = line.split(/\s+/)
        const key = parts[0].toUpperCase()
        if (key === 'TITLE') {
          const m = line.match(/^\S+\s+"([^"]*)"/)
          title = m ? m[1] : line.slice(parts[0].length).trim()
        } else if (key === 'LUT_1D_SIZE' || key === 'LUT_1D_INPUT_RANGE') {
          throw new Error(
            'This is a 1D LUT (LUT_1D_SIZE). Only 3D .cube LUTs (LUT_3D_SIZE) can be used here.',
          )
        } else if (key === 'LUT_3D_SIZE') {
          if (table)
            throw new Error(`Line ${li + 1}: LUT_3D_SIZE appears twice.`)
          const n = Number(parts[1])
          if (!Number.isInteger(n) || n < 2 || n > 256)
            throw new Error(
              `Line ${li + 1}: LUT_3D_SIZE must be 2 to 256 (got "${parts[1]}").`,
            )
          size = n
          want = n * n * n
          table = new Float32Array(want * 3)
        } else if (key === 'DOMAIN_MIN') {
          domainMin = triple(parts, li + 1, key)
        } else if (key === 'DOMAIN_MAX') {
          domainMax = triple(parts, li + 1, key)
        } else if (key === 'LUT_3D_INPUT_RANGE') {
          const lo = Number(parts[1])
          const hi = Number(parts[2])
          if (!Number.isFinite(lo) || !Number.isFinite(hi))
            throw new Error(
              `Line ${li + 1}: LUT_3D_INPUT_RANGE needs two numbers.`,
            )
          domainMin = [lo, lo, lo]
          domainMax = [hi, hi, hi]
        }
        // Other keywords (LUT_IN_VIDEO_RANGE and friends) are ignored.
        continue
      }
      if (!table)
        throw new Error(`Line ${li + 1}: data starts before LUT_3D_SIZE.`)
      const hash = line.indexOf('#')
      if (hash > 0) line = line.slice(0, hash).trim()
      const parts = line.split(/\s+/)
      const r = Number(parts[0])
      const g = Number(parts[1])
      const b = Number(parts[2])
      if (
        parts.length !== 3 ||
        !Number.isFinite(r) ||
        !Number.isFinite(g) ||
        !Number.isFinite(b)
      )
        throw new Error(
          `Line ${li + 1}: expected three numbers "r g b", found "${line.slice(0, 48)}".`,
        )
      if (count < want) {
        table[count * 3] = r
        table[count * 3 + 1] = g
        table[count * 3 + 2] = b
      }
      count++
    }
    if (!table)
      throw new Error('No LUT_3D_SIZE line: this is not a 3D .cube LUT.')
    if (count !== want)
      throw new Error(
        `Expected ${want} data lines for LUT_3D_SIZE ${size}, found ${count}.`,
      )
    return { title, size, domainMin, domainMax, table }
  }
  /** Trilinear lookup. Inputs are clamped to 0..1. Writes into out if given. */
  function sample(table, size, r, g, b, out) {
    const n = size
    const q = n - 1
    const o = out || [0, 0, 0]
    const x = clamp01(+r || 0) * q
    const y = clamp01(+g || 0) * q
    const z = clamp01(+b || 0) * q
    let xi = Math.floor(x)
    let yi = Math.floor(y)
    let zi = Math.floor(z)
    if (xi > q - 1) xi = q - 1
    if (yi > q - 1) yi = q - 1
    if (zi > q - 1) zi = q - 1
    const fx = x - xi
    const fy = y - yi
    const fz = z - zi
    const gx = 1 - fx
    const gy = 1 - fy
    const gz = 1 - fz
    const sy = n * 3
    const sz = n * n * 3
    const i0 = xi * 3 + yi * sy + zi * sz
    for (let c = 0; c < 3; c++) {
      const i = i0 + c
      const c00 = table[i] * gx + table[i + 3] * fx
      const c10 = table[i + sy] * gx + table[i + sy + 3] * fx
      const c01 = table[i + sz] * gx + table[i + sz + 3] * fx
      const c11 = table[i + sz + sy] * gx + table[i + sz + sy + 3] * fx
      o[c] = (c00 * gy + c10 * fy) * gz + (c01 * gy + c11 * fy) * fz
    }
    return o
  }
  /** Grade RGBA pixels in place: original mixed toward graded by intensity
   *  (0..1). Alpha is untouched. No allocation per pixel. */
  function applyToImageData(imageData, table, size, intensity = 1) {
    const d = imageData && imageData.data
    if (!d) throw new Error('applyToImageData needs an ImageData (or {data}).')
    const n = checkSize(size)
    checkTable(table, n)
    const k = clamp01(Number(intensity))
    if (!(k > 0)) return imageData
    const q = n - 1
    const s = q / 255
    const sy = n * 3
    const sz = n * n * 3
    const t = table
    const len = d.length - (d.length % 4)
    for (let p = 0; p < len; p += 4) {
      const r0 = d[p]
      const g0 = d[p + 1]
      const b0 = d[p + 2]
      const x = r0 * s
      const y = g0 * s
      const z = b0 * s
      let xi = x | 0
      let yi = y | 0
      let zi = z | 0
      if (xi > q - 1) xi = q - 1
      if (yi > q - 1) yi = q - 1
      if (zi > q - 1) zi = q - 1
      const fx = x - xi
      const fy = y - yi
      const fz = z - zi
      const gx = 1 - fx
      const gy = 1 - fy
      const gz = 1 - fz
      const i = xi * 3 + yi * sy + zi * sz
      const j = i + sy
      const u = i + sz
      const w = u + sy
      const R =
        (t[i] * gx + t[i + 3] * fx) * gy * gz +
        (t[j] * gx + t[j + 3] * fx) * fy * gz +
        (t[u] * gx + t[u + 3] * fx) * gy * fz +
        (t[w] * gx + t[w + 3] * fx) * fy * fz
      const G =
        (t[i + 1] * gx + t[i + 4] * fx) * gy * gz +
        (t[j + 1] * gx + t[j + 4] * fx) * fy * gz +
        (t[u + 1] * gx + t[u + 4] * fx) * gy * fz +
        (t[w + 1] * gx + t[w + 4] * fx) * fy * fz
      const B =
        (t[i + 2] * gx + t[i + 5] * fx) * gy * gz +
        (t[j + 2] * gx + t[j + 5] * fx) * fy * gz +
        (t[u + 2] * gx + t[u + 5] * fx) * gy * fz +
        (t[w + 2] * gx + t[w + 5] * fx) * fy * fz
      const r1 = r0 + (R * 255 - r0) * k
      const g1 = g0 + (G * 255 - g0) * k
      const b1 = b0 + (B * 255 - b0) * k
      d[p] = r1 <= 0 ? 0 : r1 >= 255 ? 255 : (r1 + 0.5) | 0
      d[p + 1] = g1 <= 0 ? 0 : g1 >= 255 ? 255 : (g1 + 0.5) | 0
      d[p + 2] = b1 <= 0 ? 0 : b1 >= 255 ? 255 : (b1 + 0.5) | 0
    }
    return imageData
  }
  function lutStats(table) {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    let sum = 0
    for (let i = 0; i < table.length; i++) {
      const v = table[i]
      if (v < min) min = v
      if (v > max) max = v
      sum += v
    }
    return table.length
      ? { min, max, mean: sum / table.length }
      : { min: 0, max: 0, mean: 0 }
  }

  const api = {
    LOOKS,
    defaults,
    transform,
    build,
    identity,
    toCube,
    parseCube,
    sample,
    applyToImageData,
    lutStats,
  }
  globalThis.LN_LUT = api
  if (globalThis.LN) globalThis.LN.lut = api
})()
