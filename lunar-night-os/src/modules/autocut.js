/* modules/autocut.js — Auto-Cut, the phone-only "remove silences and bad takes".
   LN.autocut = { mount(el), engine } is the Auto-Cut tab inside The Cut.
   Engine (pure, no DOM): RMS envelope in 10 ms hops, noise floor at p10, threshold
   floor + dB or absolute, island merge, padding, min keep, double-clap detection
   (sharp, broadband, fast-decaying transients 0.15–0.7 s apart) and the bad-take cut.
   UI: pick a clip, waveform with a ruler, tap to toggle, stats, segment list,
   Export A (jump-cut MP4 through Mediabunny + WebCodecs), Export B (cut list). */
;(() => {
  const LN = window.LN

  /* ================================================================ engine */
  const E = {}
  const DB_FLOOR = -100
  const toDb = ms => (ms > 1e-10 ? 10 * Math.log10(ms) : DB_FLOOR)

  E.DEFAULTS = Object.freeze({
    mode: 'floor', // 'floor' = noise floor + offsetDb, 'abs' = absDb
    offsetDb: 8,
    absDb: -42,
    minSilence: 0.45,
    lead: 0.12,
    tail: 0.18,
    minKeep: 0.25,
    claps: true,
    clapTail: 0.3,
  })

  /** Average the channels into one Float32Array. */
  E.mono = channels => {
    const n = channels[0].length
    if (channels.length === 1) return channels[0]
    const out = new Float32Array(n)
    const k = 1 / channels.length
    for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i] * k
    return out
  }

  /** RMS envelope in dBFS, one value per non-overlapping block of `hop` seconds. */
  E.envelope = (x, sr, hop = 0.01) => {
    const m = Math.max(1, Math.round(sr * hop))
    const n = Math.ceil(x.length / m)
    const db = new Float32Array(n)
    for (let k = 0; k < n; k++) {
      const a = k * m
      const b = Math.min(x.length, a + m)
      let s = 0
      for (let i = a; i < b; i++) s += x[i] * x[i]
      db[k] = toDb(s / Math.max(1, b - a))
    }
    return { db, hop: m / sr }
  }

  E.percentile = (arr, p) => {
    if (!arr.length) return DB_FLOOR
    const s = Float32Array.from(arr).sort()
    const i = Math.min(
      s.length - 1,
      Math.max(0, Math.floor(p * (s.length - 1))),
    )
    return s[i]
  }

  /* --- radix-2 FFT (in place) for the spectral-flatness test */
  function fft(re, im) {
    const n = re.length
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1
      for (; j & bit; bit >>= 1) j ^= bit
      j ^= bit
      if (i < j) {
        let t = re[i]
        re[i] = re[j]
        re[j] = t
        t = im[i]
        im[i] = im[j]
        im[j] = t
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len
      const wr = Math.cos(ang)
      const wi = Math.sin(ang)
      for (let i = 0; i < n; i += len) {
        let cr = 1
        let ci = 0
        for (let j = 0; j < len / 2; j++) {
          const a = i + j
          const b = a + len / 2
          const tr = re[b] * cr - im[b] * ci
          const ti = re[b] * ci + im[b] * cr
          re[b] = re[a] - tr
          im[b] = im[a] - ti
          re[a] += tr
          im[a] += ti
          const nr = cr * wr - ci * wi
          ci = cr * wi + ci * wr
          cr = nr
        }
      }
    }
  }

  /** Spectral flatness (0..1) of ~10.7 ms of audio from sample `at`, 300 Hz–12 kHz. */
  E.flatness = (x, sr, at) => {
    const N = 2 ** Math.round(Math.log2(sr * 0.0107))
    const re = new Float64Array(N)
    const im = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      const j = at + i
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
      re[i] = j >= 0 && j < x.length ? x[j] * w : 0
    }
    fft(re, im)
    const lo = Math.max(1, Math.floor((300 * N) / sr))
    const hi = Math.min(
      N / 2 - 1,
      Math.floor((Math.min(12000, sr * 0.45) * N) / sr),
    )
    let lg = 0
    let ar = 0
    let c = 0
    for (let k = lo; k <= hi; k++) {
      const p = re[k] * re[k] + im[k] * im[k] + 1e-20
      lg += Math.log(p)
      ar += p
      c++
    }
    return c ? Math.exp(lg / c) / (ar / c) : 0
  }

  /**
   * Hand-clap candidates: a sharp rise (>= 15 dB above 7.5–20 ms earlier), a peak at least
   * `minPeakDb`, a fast decay (>= 10 dB down 40–60 ms later) and a broadband, noise-like
   * spectrum (flatness >= 0.18). Speech vowels fail the decay or the flatness test.
   */
  E.transients = (x, sr, o = {}) => {
    const sub = Math.max(1, Math.round(sr * 0.0025))
    const n = Math.floor(x.length / sub)
    const e = new Float32Array(n)
    for (let j = 0; j < n; j++) {
      let s = 0
      const a = j * sub
      for (let i = a; i < a + sub; i++) s += x[i] * x[i]
      e[j] = toDb(s / sub)
    }
    const minPeak = o.minPeakDb ?? -30
    const out = []
    for (let j = 8; j < n - 24; j++) {
      if (e[j] < minPeak - 6) continue
      let before = DB_FLOOR
      for (let k = j - 8; k <= j - 3; k++) before = Math.max(before, e[k])
      let pk = DB_FLOOR
      let pj = j
      for (let k = j; k <= j + 3; k++)
        if (e[k] > pk) {
          pk = e[k]
          pj = k
        }
      if (pk < minPeak || e[j] - before < 15) continue
      let later = 0
      for (let k = pj + 16; k <= pj + 24; k++) later += e[k]
      later /= 9
      if (pk - later < 10) continue
      const flat = E.flatness(x, sr, j * sub - sub)
      if (flat < 0.18) continue
      // refine the onset to the first sample above half the local peak
      let peakAbs = 0
      for (let i = j * sub - sub; i < (pj + 1) * sub; i++)
        peakAbs = Math.max(peakAbs, Math.abs(x[i] || 0))
      let on = j * sub - sub
      while (on < (pj + 1) * sub && Math.abs(x[on] || 0) < peakAbs * 0.5) on++
      out.push({ t: on / sr, peakDb: pk, flat })
      j += 24 // 60 ms refractory
    }
    return out
  }

  /** Pair transients 0.15–0.7 s apart into double claps. */
  E.pairClaps = (trs, minGap = 0.15, maxGap = 0.7) => {
    const pairs = []
    for (let i = 0; i < trs.length - 1; i++) {
      const g = trs[i + 1].t - trs[i].t
      if (g >= minGap && g <= maxGap) {
        pairs.push({ c1: trs[i].t, c2: trs[i + 1].t })
        i++
        // a third clap right after belongs to the same marker
        while (i + 1 < trs.length && trs[i + 1].t - trs[i].t <= maxGap) i++
      }
    }
    return pairs
  }

  const mergeRanges = list => {
    const s = list.filter(r => r[1] - r[0] > 1e-6).sort((a, b) => a[0] - b[0])
    const out = []
    for (const r of s) {
      const last = out[out.length - 1]
      if (last && r[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], r[1])
      else out.push([r[0], r[1]])
    }
    return out
  }
  const subtract = (ranges, cuts) => {
    let cur = ranges.map(r => [r[0], r[1]])
    for (const [ca, cb] of cuts) {
      const next = []
      for (const [a, b] of cur) {
        if (cb <= a || ca >= b) next.push([a, b])
        else {
          if (ca > a) next.push([a, ca])
          if (cb < b) next.push([cb, b])
        }
      }
      cur = next
    }
    return cur
  }

  /** Snap a time to the source frame grid. */
  E.snap = (t, fps, t0 = 0) => (fps ? t0 + Math.round((t - t0) * fps) / fps : t)

  /**
   * Full analysis. x: mono Float32Array, sr: sample rate, p: params (see DEFAULTS) plus
   * fps / t0 for frame snapping. Returns envelope, floor, threshold, islands, claps,
   * bad takes and the alternating keep/cut regions covering [0, duration].
   */
  E.analyze = (x, sr, p = {}) => {
    const P = { ...E.DEFAULTS, ...p }
    const duration = x.length / sr
    const env = E.envelope(x, sr, 0.01)
    const { db, hop } = env
    const floorDb = E.percentile(db, 0.1)
    const loudDb = E.percentile(db, 0.95)
    const threshDb = P.mode === 'abs' ? P.absDb : floorDb + P.offsetDb
    // islands of sound
    let islands = []
    let k0 = -1
    for (let k = 0; k <= db.length; k++) {
      const on = k < db.length && db[k] > threshDb
      if (on && k0 < 0) k0 = k
      if (!on && k0 >= 0) {
        islands.push([k0 * hop, Math.min(duration, k * hop)])
        k0 = -1
      }
    }
    // gaps shorter than min silence are part of the speech
    const merged = []
    for (const r of islands) {
      const last = merged[merged.length - 1]
      if (last && r[0] - last[1] < P.minSilence) last[1] = r[1]
      else merged.push([r[0], r[1]])
    }
    islands = merged
    // claps and bad takes
    let transients = []
    let claps = []
    const takes = []
    if (P.claps) {
      transients = E.transients(x, sr, {
        minPeakDb: Math.max(threshDb + 10, loudDb - 14),
      })
      claps = E.pairClaps(transients)
      const firstOnsetAfter = t => {
        const k = Math.ceil(t / hop)
        for (let i = Math.max(0, k); i < db.length; i++)
          if (db[i] > threshDb) return i * hop
        return duration
      }
      for (const c of claps) {
        const idx = islands.findIndex(
          r => r[0] <= c.c1 + 0.02 && r[1] >= c.c1 - 0.02,
        )
        let start = Math.max(0, c.c1 - P.lead)
        if (idx >= 0) {
          const own = islands[idx]
          if (own[0] >= c.c1 - 0.1 && idx > 0) start = islands[idx - 1][0]
          else start = own[0]
          start = Math.max(0, start - P.lead)
        }
        const nextOn = firstOnsetAfter(c.c2 + 0.12)
        const end = Math.min(
          duration,
          c.c2 + P.clapTail,
          Math.max(c.c2 + 0.1, nextOn - P.lead),
        )
        takes.push({ start, end, c1: c.c1, c2: c.c2 })
      }
    }
    // keep ranges: long-enough islands, padded, merged, minus bad takes
    let keeps = mergeRanges(
      islands
        .filter(r => r[1] - r[0] >= P.minKeep)
        .map(r => [
          Math.max(0, r[0] - P.lead),
          Math.min(duration, r[1] + P.tail),
        ]),
    )
    keeps = subtract(
      keeps,
      takes.map(t => [t.start, t.end]),
    ).filter(r => r[1] - r[0] >= P.minKeep)
    if (P.fps)
      keeps = mergeRanges(
        keeps.map(r => [
          Math.max(0, E.snap(r[0], P.fps, P.t0 || 0)),
          Math.min(duration, E.snap(r[1], P.fps, P.t0 || 0)),
        ]),
      )
    const regions = E.fill(keeps, duration, takes)
    return {
      duration,
      sampleRate: sr,
      env,
      floorDb,
      loudDb,
      threshDb,
      islands,
      transients,
      claps,
      takes,
      regions,
      params: P,
    }
  }

  /** Alternate keep/cut regions covering [0, duration]. */
  E.fill = (keeps, duration, takes = []) => {
    const out = []
    let t = 0
    const cutReason = (a, b) => {
      let ov = 0
      for (const tk of takes)
        ov += Math.max(0, Math.min(b, tk.end) - Math.max(a, tk.start))
      return ov > (b - a) * 0.5 ? 'take' : 'silence'
    }
    for (const [a, b] of keeps) {
      if (a - t > 1e-6)
        out.push({ start: t, end: a, keep: false, reason: cutReason(t, a) })
      out.push({ start: a, end: b, keep: true, reason: 'speech' })
      t = b
    }
    if (duration - t > 1e-6)
      out.push({
        start: t,
        end: duration,
        keep: false,
        reason: cutReason(t, duration),
      })
    return out
  }

  /** Apply manual overrides [{t, keep}] to the region containing t. */
  E.applyOverrides = (regions, overrides) =>
    regions.map(r => {
      const o = overrides.find(v => v.t >= r.start && v.t < r.end)
      if (!o || o.keep === r.keep) return { ...r }
      return { ...r, keep: o.keep, manual: true }
    })

  /** Contiguous kept ranges (adjacent keeps merged). */
  E.keepRanges = regions =>
    mergeRanges(regions.filter(r => r.keep).map(r => [r.start, r.end]))

  E.stats = (regions, duration) => {
    const kept = E.keepRanges(regions)
    const total = kept.reduce((s, r) => s + r[1] - r[0], 0)
    const cuts = E.fill(kept, duration).filter(r => !r.keep).length
    return {
      original: duration,
      kept: total,
      removed: duration - total,
      pct: duration ? ((duration - total) / duration) * 100 : 0,
      cuts,
      keeps: kept.length,
    }
  }

  /** Text and CSV cut lists. Cuts are listed last-first so CapCut times never shift. */
  E.cutList = (regions, o = {}) => {
    const fps = Math.round(o.fps || 30)
    const tc = t => LN.fmt.tc(t, fps)
    const dur = o.duration
    const kept = E.keepRanges(regions)
    const cuts = E.fill(kept, dur).filter(r => !r.keep)
    const reasonOf = c => {
      const hit = regions.filter(
        r => !r.keep && r.end > c.start && r.start < c.end,
      )
      if (hit.some(r => r.reason === 'take')) return 'bad take'
      if (hit.some(r => r.manual)) return 'manual'
      if (c.start <= 1e-6) return 'head silence'
      if (c.end >= dur - 1e-6) return 'tail silence'
      return 'silence'
    }
    const st = E.stats(regions, dur)
    const lines = [
      'KUBRICK · AUTO-CUT LIST',
      `Clip: ${o.name || 'clip'} · ${tc(dur)} at ${fps} fps · source timecode`,
      `Keep ${st.keeps} pieces, cut ${cuts.length}. New length ${tc(st.kept)} (${st.pct.toFixed(1)}% removed).`,
      '',
      'Work from the LAST cut up to the FIRST, so the earlier times never move.',
      '',
    ]
    const rows = []
    cuts.forEach((c, i) => {
      rows.push({ n: i + 1, c, why: reasonOf(c) })
    })
    for (const { n, c, why } of rows.slice().reverse()) {
      const id = String(n).padStart(2, '0')
      const len = `${(c.end - c.start).toFixed(2)} s`
      let line
      if (c.start <= 1e-6 && c.end >= dur - 1e-6)
        line = `${id}  Delete the whole clip`
      else if (c.start <= 1e-6)
        line = `${id}  Split at ${tc(c.end)} → delete the piece before it`
      else if (c.end >= dur - 1e-6)
        line = `${id}  Split at ${tc(c.start)} → delete the piece after it`
      else
        line = `${id}  Split at ${tc(c.start)} · Split at ${tc(c.end)} → delete`
      lines.push(`${line}   · ${why} · ${len}`)
    }
    if (!rows.length) lines.push('Nothing to cut. The take is tight already.')
    const csv = [
      'cut,order_to_do,split_in_tc,split_out_tc,start_s,end_s,duration_s,reason,action',
      ...rows.map(({ n, c, why }) =>
        [
          n,
          rows.length - n + 1,
          tc(c.start),
          tc(c.end),
          c.start.toFixed(3),
          c.end.toFixed(3),
          (c.end - c.start).toFixed(3),
          why,
          'delete',
        ].join(','),
      ),
    ].join('\n')
    return { txt: `${lines.join('\n')}\n`, csv: `${csv}\n`, count: rows.length }
  }

  /**
   * Build the output audio for kept range `k` with equal-power crossfades of 2h samples
   * centred on every joint. src: Float32Array[] channels, ranges: [[a,b]] in seconds.
   * Returns Float32Array[] (one per channel) of exactly B_k - A_k samples.
   */
  E.chunkAudio = (src, sr, ranges, k, xfSamples) => {
    const N = src[0].length
    const S = ranges.map(r => [Math.round(r[0] * sr), Math.round(r[1] * sr)])
    const [A, B] = S[k]
    const L = Math.max(0, B - A)
    const halfFor = j => {
      // joint between range j and j+1
      const l1 = S[j][1] - S[j][0]
      const l2 = S[j + 1][1] - S[j + 1][0]
      return Math.max(
        0,
        Math.min(
          Math.floor(xfSamples / 2),
          Math.floor(l1 / 2),
          Math.floor(l2 / 2),
        ),
      )
    }
    const hIn = k > 0 ? halfFor(k - 1) : 0
    const hOut = k < S.length - 1 ? halfFor(k) : 0
    const at = (ch, i) => (i >= 0 && i < N ? ch[i] : 0)
    return src.map(ch => {
      const out = new Float32Array(L)
      for (let i = 0; i < L; i++) out[i] = at(ch, A + i)
      if (hIn) {
        const Bp = S[k - 1][1]
        const n2 = 2 * hIn
        for (let i = 0; i < hIn; i++) {
          const q = hIn + i
          const g = (Math.PI / 2) * ((q + 0.5) / n2)
          out[i] = at(ch, A + i) * Math.sin(g) + at(ch, Bp + i) * Math.cos(g)
        }
      }
      if (hOut) {
        const An = S[k + 1][0]
        const n2 = 2 * hOut
        for (let q = 0; q < hOut; q++) {
          const i = L - hOut + q
          const g = (Math.PI / 2) * ((q + 0.5) / n2)
          out[i] =
            at(ch, A + i) * Math.cos(g) + at(ch, An - hOut + q) * Math.sin(g)
        }
      }
      return out
    })
  }

  /* --- demo take: speech-like bursts, 1.2 s pauses, a fluffed line, a double clap, a retake */
  E.demo = (sr = 24000) => {
    const DUR = 15.4
    const N = Math.round(sr * DUR)
    let seed = 1234567
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    const gauss = () => {
      let u = 0
      let v = 0
      while (u === 0) u = rnd()
      while (v === 0) v = rnd()
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    }
    const x = new Float32Array(N)
    let a = 0
    for (let i = 0; i < N; i++) {
      a = 0.8 * a + 0.2 * gauss()
      x[i] = a * 0.0021
    }
    const syllable = (t0, dur, f0, amp) => {
      const i0 = Math.round(t0 * sr)
      const n = Math.round(dur * sr)
      const F1 = 550 + rnd() * 300
      const F2 = 1300 + rnd() * 600
      const gains = []
      for (let k = 1; k <= 22; k++) {
        const f = f0 * k
        gains.push(
          f < Math.min(3200, sr * 0.45)
            ? (1 / k) *
                (1 +
                  2.5 * Math.exp(-(((f - F1) / 160) ** 2)) +
                  1.5 * Math.exp(-(((f - F2) / 220) ** 2)))
            : 0,
        )
      }
      const norm = gains.reduce((s, g) => s + g, 0)
      let ph = 0
      for (let j = 0; j < n && i0 + j < N; j++) {
        const t = j / sr
        ph +=
          (2 * Math.PI * f0 * (1 + 0.08 * Math.sin((Math.PI * t) / dur))) / sr
        let env = 1
        if (t < 0.025) env = Math.sin((Math.PI / 2) * (t / 0.025)) ** 2
        else if (t > dur - 0.04)
          env = Math.sin((Math.PI / 2) * ((dur - t) / 0.04)) ** 2
        let s = 0
        for (let k = 1; k <= 22; k++)
          if (gains[k - 1]) s += gains[k - 1] * Math.sin(k * ph)
        x[i0 + j] += (amp * env * s) / norm
      }
    }
    const phrase = (p0, p1, f0) => {
      let t = p0
      const ss = []
      while (t < p1 - 0.05) {
        let d = 0.14 + rnd() * 0.12
        if (t + d > p1) d = p1 - t
        ss.push([t, d])
        t += d + 0.05 + rnd() * 0.07
      }
      const last = ss[ss.length - 1]
      last[1] = p1 - last[0]
      for (const [s, d] of ss) syllable(s, d, f0 * (0.9 + rnd() * 0.25), 0.3)
    }
    const clap = t0 => {
      const i0 = Math.round(t0 * sr)
      let hp = 0
      let prev = 0
      for (let j = 0; j < 0.09 * sr && i0 + j < N; j++) {
        const t = j / sr
        const env = t < 0.0005 ? t / 0.0005 : Math.exp(-(t - 0.0005) / 0.012)
        const w = gauss()
        hp = 0.94 * (hp + w - prev)
        prev = w
        x[i0 + j] += 0.2 * env * hp
      }
    }
    phrase(0.8, 2.6, 132)
    phrase(3.8, 5.4, 140)
    const fluffSeed = seed
    phrase(6.6, 7.9, 150)
    clap(8.5)
    clap(8.85)
    seed = fluffSeed
    phrase(9.9, 11.2, 150)
    phrase(11.3, 11.7, 145)
    phrase(12.9, 14.4, 136)
    return { channels: [x], sampleRate: sr, duration: DUR }
  }

  /* ================================================================ UI */
  const STORE = 'autocut.params'
  const HABIT = 'Fluffed a line? Pause, clap twice, restart the sentence.'
  const sec = (t, d = 2) => `${Number(t).toFixed(d)} s`

  function mount(root) {
    const { h, s, ui } = LN
    root.classList.add('ac')
    const saved = LN.store.get(STORE, {})
    const st = {
      params: {
        ...E.DEFAULTS,
        ...(saved && typeof saved === 'object' ? saved : {}),
      },
      xfFrames: 3,
      size: '1080',
      zoom: 1,
      src: null, // {name, file?, channels, sampleRate, duration, mono, fps, t0, video:{...}, demo}
      result: null,
      regions: [],
      overrides: [],
      exportBlob: null,
      busy: false,
    }

    /* ---------- habit + source */
    const habitStrip = s(
      'svg',
      {
        class: 'ac-habit-svg',
        viewBox: '0 0 360 64',
        role: 'img',
        'aria-label':
          'Take, pause, clap clap, restart. Auto-Cut removes from the start of the take through the claps.',
      },
      s('rect', { x: 0, y: 22, width: 360, height: 20, class: 'ac-hs-base' }),
      s('rect', { x: 10, y: 22, width: 104, height: 20, class: 'ac-hs-cut' }),
      s('rect', { x: 114, y: 22, width: 92, height: 20, class: 'ac-hs-cut' }),
      s('rect', { x: 236, y: 22, width: 114, height: 20, class: 'ac-hs-keep' }),
      s('path', {
        d: 'M150 18 L150 46 M168 18 L168 46',
        class: 'ac-hs-clap',
      }),
      s('text', { x: 12, y: 14, class: 'ac-hs-t' }, 'fluffed take'),
      s('text', { x: 140, y: 14, class: 'ac-hs-t amber' }, 'clap clap'),
      s('text', { x: 238, y: 14, class: 'ac-hs-t' }, 'restart'),
      s('text', { x: 12, y: 60, class: 'ac-hs-t crimson' }, 'removed'),
      s('text', { x: 238, y: 60, class: 'ac-hs-t' }, 'kept'),
    )

    const srcName = h('b', { class: 'ac-src-name' }, 'Demo take')
    const srcMeta = h('span', { class: 'ac-src-meta ln-num' }, '')
    const status = h('p', {
      class: 'ac-status ln-small',
      role: 'status',
      'aria-live': 'polite',
    })
    const picker = ui.filePick({
      accept: 'video/*',
      label: 'Choose a talking clip',
      kind: '',
      onFile: f => loadFile(f),
    })
    const demoBtn = ui.btn('Back to demo', () => loadDemo(), {
      kind: 'quiet',
      small: true,
    })
    demoBtn.hidden = true

    /* ---------- waveform */
    const canvas = h('canvas', {
      class: 'ac-canvas',
      role: 'img',
      'aria-label': 'Waveform with kept and cut regions',
    })
    const playhead = h('i', { class: 'ac-playhead', hidden: true })
    const waveInner = h('div', { class: 'ac-wave-inner' }, canvas, playhead)
    const waveBox = h(
      'div',
      {
        class: 'ac-wave',
        tabindex: '0',
        'aria-label': 'Waveform, scrolls sideways when zoomed',
      },
      waveInner,
    )
    const zoomSeg = ui.seg({
      options: [
        { value: 1, label: 'Fit' },
        { value: 2, label: '2×' },
        { value: 4, label: '4×' },
      ],
      value: 1,
      onChange: v => {
        st.zoom = v
        draw(true)
      },
    })
    zoomSeg.el.setAttribute('aria-label', 'Zoom the waveform')
    const legend = h(
      'div',
      { class: 'ac-legend' },
      h('span', { class: 'k keep' }, 'keep'),
      h('span', { class: 'k cut' }, 'cut'),
      h('span', { class: 'k clap' }, 'clap'),
      h('span', { class: 'k thr' }, 'threshold'),
    )
    const statsRow = h('div', { class: 'ac-stats' })
    const segList = h('div', {
      class: 'ac-seglist',
      role: 'list',
      'aria-label': 'Segments',
    })
    const segCount = h('span', { class: 'ln-faint ln-small ln-num' }, '')
    const resetBtn = ui.btn(
      'Clear hand edits',
      () => {
        st.overrides = []
        rebuild()
      },
      { kind: 'quiet', small: true },
    )

    /* ---------- detection controls */
    const readout = h('p', { class: 'ac-readout ln-num' })
    const modeSeg = ui.seg({
      label: 'Threshold',
      options: [
        { value: 'floor', label: 'Floor + dB' },
        { value: 'abs', label: 'Absolute' },
      ],
      value: st.params.mode,
      onChange: v => setParam('mode', v),
    })
    const sl = (key, label, min, max, step, fmt) =>
      ui.slider({
        label,
        min,
        max,
        step,
        value: st.params[key],
        format: fmt,
        onChange: v => setParam(key, v),
      })
    const offSl = sl('offsetDb', 'Above the floor', 3, 20, 1, v => `+${v} dB`)
    const absSl = sl('absDb', 'Absolute level', -60, -20, 1, v => `${v} dBFS`)
    const silSl = sl('minSilence', 'Min silence', 0.2, 1.5, 0.05, v => sec(v))
    const leadSl = sl('lead', 'Lead-in pad', 0, 0.4, 0.01, v => sec(v))
    const tailSl = sl('tail', 'Tail pad', 0, 0.5, 0.01, v => sec(v))
    const keepSl = sl('minKeep', 'Min keep', 0.1, 1, 0.05, v => sec(v))
    const clapTg = ui.toggle({
      label: 'Clap to cut (double clap removes the take before it)',
      checked: st.params.claps,
      onChange: v => setParam('claps', v),
    })
    const syncMode = () => {
      offSl.el.hidden = st.params.mode !== 'floor'
      absSl.el.hidden = st.params.mode !== 'abs'
    }
    const defaultsBtn = ui.btn(
      'Reset to house defaults',
      () => {
        st.params = { ...E.DEFAULTS }
        modeSeg.set(st.params.mode)
        offSl.set(st.params.offsetDb)
        absSl.set(st.params.absDb)
        silSl.set(st.params.minSilence)
        leadSl.set(st.params.lead)
        tailSl.set(st.params.tail)
        keepSl.set(st.params.minKeep)
        clapTg.set(st.params.claps)
        LN.store.set(STORE, st.params)
        syncMode()
        analyze()
      },
      { kind: 'quiet', small: true },
    )

    /* ---------- export A */
    const sizeSeg = ui.seg({
      label: 'Size',
      options: [
        { value: 'source', label: 'Source' },
        { value: '1080', label: '1080p' },
        { value: '720', label: '720p' },
      ],
      value: st.size,
      onChange: v => {
        st.size = v
      },
    })
    const xfSeg = ui.seg({
      label: 'Audio crossfade',
      options: [
        { value: 2, label: '2 fr' },
        { value: 3, label: '3 fr' },
        { value: 4, label: '4 fr' },
      ],
      value: st.xfFrames,
      onChange: v => {
        st.xfFrames = v
      },
    })
    const renderBtn = ui.btn('Render jump cut .mp4', () => renderA(), {
      block: true,
    })
    const exportNote = h('p', { class: 'ln-small ln-muted' })
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
        class: 'ac-progress',
        hidden: true,
        role: 'status',
        'aria-live': 'polite',
      },
      h('div', { class: 'ac-bar' }, barFill),
      h('div', { class: 'ac-prog-row' }, progText, cancelBtn),
    )
    const result = h('div', { class: 'ac-result', hidden: true })

    /* ---------- export B */
    const listBlock = ui.copyBlock('', { title: 'Cut list (.txt)' })
    const stepsText = () => capcutSteps()
    const txtBtn = ui.btn('Save cut list .txt', () => saveList('txt'), {
      kind: 'ghost',
    })
    const csvBtn = ui.btn('Save .csv', () => saveList('csv'), { kind: 'ghost' })
    const stepsBtn = ui.btn(
      'Copy CapCut steps',
      () => LN.copy(stepsText(), { label: 'CapCut steps copied' }),
      { kind: 'quiet' },
    )

    /* ---------- preview (real clips) */
    const video = h('video', {
      class: 'ac-video',
      controls: true,
      playsinline: true,
      preload: 'metadata',
      hidden: true,
    })
    const skipTg = ui.toggle({
      label: 'Skip the cuts while playing',
      checked: true,
    })
    skipTg.el.hidden = true
    const demoPlay = ui.btn('Play the cut', () => playDemo(), {
      kind: 'ghost',
      small: true,
    })

    /* ---------- layout */
    root.append(
      ui.section(
        {
          eyebrow: 'Auto-Cut',
          title: 'Every pause cut, on the phone',
          lede: 'Pick a talking clip. Auto-Cut finds the silences and the takes you clapped out, shows you the cut, and hands back a jump-cut MP4 or a cut list for CapCut. House style for the Marketplace Review is every pause cut; this does that pass for you.',
        },
        h(
          'div',
          { class: 'ac-habit ln-card' },
          h('div', { class: 'ln-eyebrow' }, 'The habit'),
          h('p', { class: 'ac-habit-line' }, HABIT),
          habitStrip,
          h(
            'p',
            { class: 'ln-small ln-muted' },
            'Two sharp claps 0.15–0.7 s apart mark the take before them as bad. Auto-Cut removes from the start of that take (the last long pause) through the second clap plus 0.3 s, then keeps the restart.',
          ),
        ),
        h(
          'div',
          { class: 'ln-card ac-source' },
          h(
            'div',
            { class: 'ac-src-row' },
            h('div', { class: 'ac-src-id' }, srcName, srcMeta),
            h('div', { class: 'ln-row' }, picker, demoBtn),
          ),
          status,
          video,
          skipTg.el,
        ),
      ),
      ui.section(
        { eyebrow: 'Read the take', title: 'The cut, drawn' },
        h(
          'div',
          { class: 'ln-card ac-wavecard' },
          h('div', { class: 'ac-wave-head' }, legend, zoomSeg.el),
          waveBox,
          h(
            'p',
            { class: 'ln-small ln-faint' },
            'Tap a region to flip it between keep and cut. Level is drawn in dB so the room tone shows.',
          ),
          statsRow,
          h('div', { class: 'ln-row ac-wave-actions' }, demoPlay, resetBtn),
        ),
        h(
          'div',
          { class: 'ln-split ac-tune' },
          h(
            'div',
            { class: 'ln-card' },
            h('h3', null, 'Segments'),
            segCount,
            segList,
          ),
          h(
            'div',
            { class: 'ln-card' },
            h('h3', null, 'Detection'),
            readout,
            modeSeg.el,
            offSl.el,
            absSl.el,
            silSl.el,
            leadSl.el,
            tailSl.el,
            keepSl.el,
            clapTg.el,
            h('div', null, defaultsBtn),
          ),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Export',
          title: 'Take it to CapCut',
          lede: 'Two ways out. A renders the jump cut on the phone. B hands you the split points so you can cut the original clip yourself.',
        },
        h(
          'div',
          { class: 'ln-grid wide ac-exports' },
          h(
            'div',
            { class: 'ln-card ac-exp' },
            h('div', { class: 'ln-eyebrow' }, 'A · Jump-cut MP4'),
            h(
              'p',
              { class: 'ln-small ln-muted' },
              'Re-encodes only the kept ranges with new timestamps, H.264 video, AAC audio (Opus if this browser has no AAC encoder), and a short audio crossfade on every joint so no cut clicks.',
            ),
            sizeSeg.el,
            xfSeg.el,
            renderBtn,
            exportNote,
            progress,
            result,
          ),
          h(
            'div',
            { class: 'ln-card ac-exp' },
            h('div', { class: 'ln-eyebrow' }, 'B · Cut list'),
            h(
              'p',
              { class: 'ln-small ln-muted' },
              'Every cut as "Split at HH:MM:SS:FF → delete", listed last to first. Use it when you want the untouched source quality in CapCut.',
            ),
            h('div', { class: 'ac-btns' }, txtBtn, csvBtn, stepsBtn),
            listBlock,
          ),
        ),
      ),
      ui.section(
        { eyebrow: 'Notes', title: 'Before you trust it' },
        h(
          'div',
          { class: 'ln-grid' },
          ui.callout(
            'rule',
            'Marketplace Review: cuts every 1–3 s, every pause cut, hard cuts. Auto-Cut does the pause pass. You still cut on motion or sound for the b-roll.',
            'House style',
          ),
          ui.callout(
            'verify',
            h(
              'span',
              null,
              'Some CapCut builds carry their own pause or silence remover. Look for it on a selected clip before you count on it: ',
              ui.path(
                'Tap the clip',
                'Edit or Audio',
                'Remove pauses (label varies)',
              ),
              '. If it is there and free, compare its cut with this one on the same take. Labels and Pro status change between builds.',
            ),
          ),
          ui.callout(
            'tip',
            'Leave a beat of silence before and after every clap. Claps that land on top of a word are harder to hear apart from a hard consonant, and the take boundary is the last pause of 0.45 s or more.',
            'Clap clean',
          ),
          ui.callout(
            'verify',
            'CapCut’s playhead readout may show minutes and seconds only. Pinch the timeline wide until single frames show, or use the seconds columns in the .csv.',
          ),
        ),
      ),
    )
    syncMode()

    /* ================================================================ analysis */
    function setParam(k, v) {
      st.params[k] = v
      LN.store.set(STORE, st.params)
      if (k === 'mode') syncMode()
      analyze()
    }

    function analyze() {
      if (!st.src) return
      st.result = E.analyze(st.src.mono, st.src.sampleRate, {
        ...st.params,
        fps: st.src.fps,
        t0: st.src.t0 || 0,
      })
      rebuild()
    }

    function rebuild() {
      if (!st.result) return
      st.regions = E.applyOverrides(st.result.regions, st.overrides)
      const r = st.result
      readout.replaceChildren(
        h('span', null, `Floor ${r.floorDb.toFixed(1)} dBFS`),
        h('span', null, `Threshold ${r.threshDb.toFixed(1)} dBFS`),
        h(
          'span',
          null,
          `${r.claps.length} double clap${r.claps.length === 1 ? '' : 's'}`,
        ),
      )
      renderStats()
      renderSegs()
      renderList()
      draw()
      st.exportBlob = null
      syncExport()
    }

    function renderStats() {
      const x = E.stats(st.regions, st.src.duration)
      statsRow.replaceChildren(
        ui.stat(sec(x.original, 1), 'Original'),
        ui.stat(sec(x.kept, 1), 'New'),
        ui.stat(`${x.pct.toFixed(0)}%`, 'Removed'),
        ui.stat(String(x.cuts), x.cuts === 1 ? 'Cut' : 'Cuts'),
      )
    }

    const fpsTc = () => Math.round(st.src.fps || 30)

    function renderSegs() {
      const fps = fpsTc()
      segCount.textContent = `${st.regions.length} regions · timecode at ${fps} fps · tap to flip`
      segList.replaceChildren(
        ...st.regions.map((r, i) => {
          const tag = r.keep ? 'keep' : r.reason === 'take' ? 'take' : 'cut'
          const label = r.keep
            ? 'Keep'
            : r.reason === 'take'
              ? 'Bad take'
              : 'Cut'
          return h(
            'button',
            {
              type: 'button',
              role: 'listitem',
              class: `ac-seg ${tag}${r.manual ? ' manual' : ''}`,
              'aria-pressed': String(r.keep),
              'aria-label': `${label} ${LN.fmt.tc(r.start, fps)} to ${LN.fmt.tc(r.end, fps)}. Tap to ${r.keep ? 'cut' : 'keep'}.`,
              onClick: () => toggleAt((r.start + r.end) / 2),
            },
            h('span', { class: 'n ln-num' }, String(i + 1).padStart(2, '0')),
            h(
              'span',
              { class: 'tc ln-num' },
              `${LN.fmt.tc(r.start, fps)} → ${LN.fmt.tc(r.end, fps)}`,
            ),
            h(
              'span',
              { class: 'len ln-num' },
              `${sec(r.end - r.start)}${r.manual ? ' · by hand' : ''}`,
            ),
            h('span', { class: `tag ${tag}` }, label),
          )
        }),
      )
    }

    function renderList() {
      const { txt } = E.cutList(st.regions, {
        fps: fpsTc(),
        duration: st.src.duration,
        name: st.src.name,
      })
      listBlock.setText(txt)
    }

    function toggleAt(t) {
      const r = st.regions.find(x => t >= x.start && t < x.end)
      if (!r) return
      const keep = !r.keep
      st.overrides = st.overrides.filter(o => !(o.t >= r.start && o.t < r.end))
      const base = st.result.regions.find(x => t >= x.start && t < x.end)
      if (!base || base.keep !== keep) st.overrides.push({ t, keep })
      rebuild()
    }

    /* ================================================================ drawing */
    let peaks = null // {w, max: Float32Array, rms: Float32Array}
    const scaleY = db => Math.max(0, Math.min(1, (db + 60) / 60))

    function computePeaks(w) {
      const x = st.src.mono
      const n = x.length
      const max = new Float32Array(w)
      const rms = new Float32Array(w)
      for (let c = 0; c < w; c++) {
        const a = Math.floor((c * n) / w)
        const b = Math.max(a + 1, Math.floor(((c + 1) * n) / w))
        let m = 0
        let s2 = 0
        const step = Math.max(1, Math.floor((b - a) / 2000))
        let cnt = 0
        for (let i = a; i < b && i < n; i += step) {
          const v = Math.abs(x[i])
          if (v > m) m = v
          s2 += v * v
          cnt++
        }
        max[c] = 20 * Math.log10(m + 1e-9)
        rms[c] = 10 * Math.log10(s2 / Math.max(1, cnt) + 1e-12)
      }
      peaks = { w, max, rms }
    }

    const cssVar = (n, fb) => {
      try {
        const v = getComputedStyle(document.documentElement)
          .getPropertyValue(n)
          .trim()
        return v || fb
      } catch (_e) {
        return fb
      }
    }
    let themeCache = null
    function theme() {
      if (themeCache) return themeCache
      const P = LN.palette || {}
      const hex = (v, fb) => (/^#[0-9a-f]{6}$/i.test(v) ? v : fb)
      const t = {
        bg: hex(P.uiBg || cssVar('--obsidian', ''), '#0a0a0b'),
        panel: hex(P.uiPanel || cssVar('--graphite', ''), '#161618'),
        accent: hex(P.accent || cssVar('--amber', ''), '#00d4e0'),
        red: hex(cssVar('--crimson', ''), '#fe2c55'),
        keep: hex(cssVar('--silver', ''), '#e4e4e7'),
        dim: hex(cssVar('--silver-3', ''), '#71717a'),
        text: hex(cssVar('--silver-2', ''), '#a1a1aa'),
        line: hex(cssVar('--line', ''), '#26262a'),
        font: cssVar('--f-data', '') || 'ui-monospace, monospace',
      }
      t.rgba = (h, a) => {
        const [r, g, b] = LN.color.hex2rgb(h)
        return `rgba(${r},${g},${b},${a})`
      }
      themeCache = t
      return t
    }

    function draw(resized) {
      if (!st.src) return
      const box = waveBox.clientWidth || 360
      const cssW = Math.min(16000, Math.round(box * st.zoom))
      const cssH = 176
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = Math.round(cssW * dpr)
      const H = Math.round(cssH * dpr)
      if (canvas.width !== W || canvas.height !== H || resized) {
        canvas.width = W
        canvas.height = H
        canvas.style.width = `${cssW}px`
        canvas.style.height = `${cssH}px`
        waveInner.style.width = `${cssW}px`
      }
      if (!peaks || peaks.w !== W) computePeaks(W)
      const ctx = canvas.getContext('2d')
      const T = theme()
      const dur = st.src.duration
      const rulerH = 22 * dpr
      const lane = 10 * dpr
      const top = lane + 4 * dpr
      const waveH = H - rulerH - top
      const mid = top + waveH / 2
      const xOf = t => (t / dur) * W
      ctx.fillStyle = T.bg
      ctx.fillRect(0, 0, W, H)
      // region backgrounds + lane
      for (const r of st.regions) {
        const x0 = xOf(r.start)
        const x1 = xOf(r.end)
        if (r.keep) {
          ctx.fillStyle = T.rgba(T.keep, 0.05)
          ctx.fillRect(x0, top, x1 - x0, waveH)
          ctx.fillStyle = T.rgba(T.keep, 0.7)
        } else {
          ctx.fillStyle = T.rgba(T.red, 0.12)
          ctx.fillRect(x0, top, x1 - x0, waveH)
          ctx.fillStyle = T.red
        }
        ctx.fillRect(x0, 0, Math.max(1, x1 - x0 - dpr), lane)
      }
      // waveform (dB scale): peak envelope dim, RMS bright
      const inKeep = new Uint8Array(W)
      for (const r of st.regions)
        if (r.keep)
          for (
            let c = Math.floor(xOf(r.start));
            c < Math.ceil(xOf(r.end)) && c < W;
            c++
          )
            if (c >= 0) inKeep[c] = 1
      for (let c = 0; c < W; c++) {
        const hp = scaleY(peaks.max[c]) * (waveH / 2 - dpr)
        const hr = scaleY(peaks.rms[c]) * (waveH / 2 - dpr)
        ctx.fillStyle = inKeep[c] ? T.rgba(T.keep, 0.36) : T.rgba(T.dim, 0.3)
        ctx.fillRect(c, mid - hp, 1, hp * 2 || 1)
        ctx.fillStyle = inKeep[c] ? T.keep : T.rgba(T.dim, 0.6)
        ctx.fillRect(c, mid - hr, 1, hr * 2 || 1)
      }
      // crimson hatch over cut regions
      ctx.save()
      ctx.beginPath()
      for (const r of st.regions)
        if (!r.keep)
          ctx.rect(xOf(r.start), top, xOf(r.end) - xOf(r.start), waveH)
      ctx.clip()
      ctx.strokeStyle = T.rgba(T.red, 0.5)
      ctx.lineWidth = dpr
      const gap = 7 * dpr
      ctx.beginPath()
      for (let x = -waveH; x < W + waveH; x += gap) {
        ctx.moveTo(x, top + waveH)
        ctx.lineTo(x + waveH, top)
      }
      ctx.stroke()
      ctx.restore()
      // threshold (RMS) lines
      const ty = scaleY(st.result.threshDb) * (waveH / 2 - dpr)
      ctx.strokeStyle = T.rgba(T.accent, 0.7)
      ctx.setLineDash([4 * dpr, 4 * dpr])
      ctx.lineWidth = dpr
      ctx.beginPath()
      ctx.moveTo(0, mid - ty)
      ctx.lineTo(W, mid - ty)
      ctx.moveTo(0, mid + ty)
      ctx.lineTo(W, mid + ty)
      ctx.stroke()
      ctx.setLineDash([])
      // claps
      ctx.fillStyle = T.accent
      ctx.strokeStyle = T.accent
      for (const c of st.result.claps)
        for (const t of [c.c1, c.c2]) {
          const x = Math.round(xOf(t)) + 0.5
          ctx.beginPath()
          ctx.moveTo(x, top)
          ctx.lineTo(x, top + waveH)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x - 4 * dpr, top)
          ctx.lineTo(x + 4 * dpr, top)
          ctx.lineTo(x, top + 6 * dpr)
          ctx.closePath()
          ctx.fill()
        }
      // ruler
      const ry = H - rulerH
      ctx.fillStyle = T.panel
      ctx.fillRect(0, ry, W, rulerH)
      ctx.fillStyle = T.line
      ctx.fillRect(0, ry, W, dpr)
      const pxPerSec = cssW / dur
      const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
      const major = steps.find(v => v * pxPerSec >= 64) || 600
      const minor = major / (major >= 10 ? 5 : 2)
      ctx.fillStyle = T.text
      ctx.font = `${10 * dpr}px ${T.font}`
      ctx.textBaseline = 'top'
      for (let t = 0; t <= dur + 1e-6; t += minor) {
        const isMajor = Math.abs(t / major - Math.round(t / major)) < 1e-6
        const x = Math.round(xOf(t))
        ctx.fillRect(x, ry, dpr, (isMajor ? 7 : 4) * dpr)
        if (isMajor && x < W - 30 * dpr) {
          const m = Math.floor(t / 60)
          const s2 = t - m * 60
          const lab =
            major < 1
              ? `${m}:${s2.toFixed(1).padStart(4, '0')}`
              : `${m}:${String(Math.round(s2)).padStart(2, '0')}`
          ctx.fillText(lab, x + 3 * dpr, ry + 8 * dpr)
        }
      }
    }

    canvas.addEventListener('click', e => {
      if (!st.src) return
      const rect = canvas.getBoundingClientRect()
      const t = ((e.clientX - rect.left) / rect.width) * st.src.duration
      toggleAt(Math.max(0, Math.min(st.src.duration - 1e-6, t)))
    })
    if (typeof ResizeObserver === 'function') {
      let lastW = 0
      new ResizeObserver(() => {
        const w = waveBox.clientWidth
        if (w && Math.abs(w - lastW) > 2) {
          lastW = w
          draw(true)
        }
      }).observe(waveBox)
    }

    /* ================================================================ playback */
    let raf = 0
    let demoCtx = null
    let demoStop = null
    const setPlayhead = t => {
      if (t == null || !st.src) {
        playhead.hidden = true
        return
      }
      playhead.hidden = false
      playhead.style.left = `${(t / st.src.duration) * 100}%`
    }
    function loopVideo() {
      cancelAnimationFrame(raf)
      const tick = () => {
        if (video.paused || video.ended) {
          raf = 0
          return
        }
        const t = video.currentTime
        if (skipTg.get()) {
          const r = st.regions.find(x => t >= x.start && t < x.end)
          if (r && !r.keep) {
            const next = st.regions.find(x => x.keep && x.start >= r.end - 1e-6)
            if (next) video.currentTime = next.start
            else video.pause()
          }
        }
        setPlayhead(video.currentTime)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    video.addEventListener('play', loopVideo)
    video.addEventListener('seeked', () => setPlayhead(video.currentTime))

    function stopDemo() {
      if (demoStop) demoStop()
      demoStop = null
      demoPlay.textContent = 'Play the cut'
    }
    async function playDemo() {
      if (demoStop) {
        stopDemo()
        return
      }
      if (!st.src) return
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!demoCtx) demoCtx = new Ctx()
        await demoCtx.resume()
        const src = st.src
        const buf = demoCtx.createBuffer(
          src.channels.length,
          src.channels[0].length,
          src.sampleRate,
        )
        src.channels.forEach((c, i) => buf.copyToChannel(c, i))
        const ranges = E.keepRanges(st.regions)
        if (!ranges.length) {
          LN.toast('Nothing is kept, so there is nothing to play.', {
            kind: 'warn',
          })
          return
        }
        const t0 = demoCtx.currentTime + 0.05
        let at = t0
        const nodes = []
        const map = []
        for (const [a, b] of ranges) {
          const n = demoCtx.createBufferSource()
          n.buffer = buf
          n.connect(demoCtx.destination)
          n.start(at, a, b - a)
          nodes.push(n)
          map.push([at, a, b])
          at += b - a
        }
        demoPlay.textContent = 'Stop'
        let alive = true
        const tick = () => {
          if (!alive) return
          const now = demoCtx.currentTime
          if (now >= at) {
            stopDemo()
            return
          }
          const seg = map.find(m => now >= m[0] && now < m[0] + (m[2] - m[1]))
          setPlayhead(seg ? seg[1] + (now - seg[0]) : null)
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        demoStop = () => {
          alive = false
          for (const n of nodes)
            try {
              n.stop()
            } catch (_e) {
              /* not started */
            }
          setPlayhead(null)
        }
      } catch (e) {
        LN.toast(`Playback is not available here: ${e.message}`, {
          kind: 'warn',
        })
      }
    }

    LN.bus.on('route', id => {
      if (id !== 'edit') {
        if (!video.paused) video.pause()
        stopDemo()
      }
    })

    /* ================================================================ loading */
    let objUrl = null
    function setSource(src) {
      stopDemo()
      st.src = src
      st.src.mono = E.mono(src.channels)
      st.overrides = []
      peaks = null
      srcName.textContent = src.name
      const v = src.video
      srcMeta.textContent = [
        LN.fmt.tc(src.duration, Math.round(src.fps || 30)),
        v ? `${v.width}×${v.height}` : null,
        src.fps ? `${Math.round(src.fps * 100) / 100} fps` : null,
        `${(src.sampleRate / 1000).toFixed(1)} kHz`,
        src.demo ? 'synthesised' : null,
      ]
        .filter(Boolean)
        .join(' · ')
      demoBtn.hidden = !!src.demo
      demoPlay.hidden = !src.demo
      video.hidden = !!src.demo
      skipTg.el.hidden = !!src.demo
      result.hidden = true
      result.replaceChildren()
      analyze()
    }

    function loadDemo() {
      if (objUrl) URL.revokeObjectURL(objUrl)
      objUrl = null
      video.removeAttribute('src')
      const d = E.demo(24000)
      setSource({
        name: 'Demo take',
        demo: true,
        channels: d.channels,
        sampleRate: d.sampleRate,
        duration: d.duration,
        fps: 30,
        t0: 0,
      })
      status.textContent =
        'A synthesised talking take: four lines, one fluffed line, a double clap and the retake. Pick your own clip to cut it for real.'
    }

    async function probeVideo(file) {
      const MB = await LN.lib.mediabunny()
      const input = new MB.Input({
        source: new MB.BlobSource(file),
        formats: MB.ALL_FORMATS,
      })
      const vt = await input.getPrimaryVideoTrack()
      if (!vt) return { MB, input, vt: null }
      const stats = await vt.computePacketStats(120)
      let fps = stats.averagePacketRate || 30
      for (const std of [23.976, 24, 25, 29.97, 30, 50, 59.94, 60])
        if (Math.abs(fps - std) / std < 0.01) fps = std
      const t0 = await vt.getFirstTimestamp()
      const rotation =
        typeof vt.getRotation === 'function'
          ? await vt.getRotation()
          : vt.rotation || 0
      const width =
        typeof vt.getDisplayWidth === 'function'
          ? await vt.getDisplayWidth()
          : vt.displayWidth
      const height =
        typeof vt.getDisplayHeight === 'function'
          ? await vt.getDisplayHeight()
          : vt.displayHeight
      return {
        MB,
        input,
        vt,
        fps,
        t0: Math.max(0, t0 || 0),
        rotation,
        width,
        height,
        codec: vt.codec,
      }
    }

    async function decodeViaMediabunny(file) {
      const MB = await LN.lib.mediabunny()
      const input = new MB.Input({
        source: new MB.BlobSource(file),
        formats: MB.ALL_FORMATS,
      })
      const at = await input.getPrimaryAudioTrack()
      if (!at) throw new Error('This clip has no audio track.')
      if (!(await at.canDecode()))
        throw new Error(
          `This browser cannot decode ${at.codec || 'this'} audio.`,
        )
      const sink = new MB.AudioSampleSink(at)
      const chunks = []
      let sr = 48000
      let nch = 1
      let total = 0
      for await (const smp of sink.samples()) {
        sr = smp.sampleRate
        nch = Math.min(2, smp.numberOfChannels)
        const parts = []
        for (let c = 0; c < nch; c++) {
          const a = new Float32Array(smp.numberOfFrames)
          smp.copyTo(a, { planeIndex: c, format: 'f32-planar' })
          parts.push(a)
        }
        chunks.push(parts)
        total += smp.numberOfFrames
        smp.close()
      }
      const channels = []
      for (let c = 0; c < nch; c++) {
        const out = new Float32Array(total)
        let o = 0
        for (const p of chunks) {
          out.set(p[c] || p[0], o)
          o += p[0].length
        }
        channels.push(out)
      }
      return { channels, sampleRate: sr }
    }

    async function loadFile(file) {
      if (st.busy) return
      st.busy = true
      stopDemo()
      status.textContent = `Reading the sound of ${file.name}…`
      srcName.textContent = file.name
      srcMeta.textContent = LN.fmt.bytes(file.size)
      try {
        let audio = null
        const big = file.size > 400 * 1048576
        if (!big) {
          try {
            const ab = await LN.media.decodeAudio(file, 48000)
            const channels = []
            for (let c = 0; c < Math.min(2, ab.numberOfChannels); c++)
              channels.push(ab.getChannelData(c))
            audio = { channels, sampleRate: ab.sampleRate }
          } catch (e) {
            console.warn('[autocut] decodeAudio failed, trying Mediabunny', e)
          }
        }
        if (!audio) {
          status.textContent = 'Decoding the audio track with Mediabunny…'
          audio = await decodeViaMediabunny(file)
        }
        let vinfo = null
        try {
          vinfo = await probeVideo(file)
        } catch (e) {
          console.warn('[autocut] video probe failed', e)
        }
        if (objUrl) URL.revokeObjectURL(objUrl)
        objUrl = URL.createObjectURL(file)
        video.src = objUrl
        const duration = audio.channels[0].length / audio.sampleRate
        setSource({
          name: file.name,
          file,
          channels: audio.channels,
          sampleRate: audio.sampleRate,
          duration,
          fps: (vinfo && vinfo.fps) || 30,
          t0: (vinfo && vinfo.t0) || 0,
          video:
            vinfo && vinfo.vt
              ? {
                  width: vinfo.width,
                  height: vinfo.height,
                  rotation: vinfo.rotation,
                  codec: vinfo.codec,
                }
              : null,
          probeFailed: !vinfo,
        })
        const x = E.stats(st.regions, duration)
        status.textContent = `Found ${x.cuts} cut${x.cuts === 1 ? '' : 's'} and ${st.result.claps.length} double clap${st.result.claps.length === 1 ? '' : 's'}. Check the red, flip anything wrong, then export.`
      } catch (e) {
        console.warn('[autocut] load failed', e)
        status.textContent = `Could not read that clip: ${e.message || e}. Try a clip straight from the Pixel camera (MP4).`
        LN.toast('Could not read that clip.', { kind: 'err' })
        if (!st.src || st.src.demo) loadDemo()
      } finally {
        st.busy = false
      }
    }

    /* ================================================================ export B */
    function baseName() {
      const n = (st.src && st.src.name) || 'clip'
      return LN.fmt.slug(n.replace(/\.[^.]+$/, '')) || 'clip'
    }
    async function saveList(kind) {
      const { txt, csv } = E.cutList(st.regions, {
        fps: fpsTc(),
        duration: st.src.duration,
        name: st.src.name,
      })
      const data = kind === 'csv' ? csv : txt
      await LN.save({
        filename: `${baseName()}_cutlist.${kind}`,
        data,
        mime: kind === 'csv' ? 'text/csv' : 'text/plain',
      })
    }
    function capcutSteps() {
      const { txt, count } = E.cutList(st.regions, {
        fps: fpsTc(),
        duration: st.src.duration,
        name: st.src.name,
      })
      const steps = [
        'CAPCUT STEPS · AUTO-CUT (one tap per line)',
        '',
        '1. Open CapCut. Tap your project, or tap New project and add the original clip.',
        '   You should see: the clip on the timeline under the preview.',
        '2. Pinch the timeline outwards (two fingers apart) until you can move frame by frame.',
        '   You should see: the time ruler with small ticks between seconds.',
        `3. Start with the LAST cut on the list (cut ${String(count).padStart(2, '0')}). Drag the timeline until the playhead sits on its first time.`,
        '   You should see: the white playhead line at that time; the readout at the top matches.',
        '4. Tap the clip once.',
        '   You should see: a white border on the clip and the clip toolbar at the bottom.',
        '5. Tap Split.',
        '   You should see: the clip break into two pieces at the playhead.',
        '6. Drag to the second time on the same line. Tap the clip. Tap Split.',
        '   You should see: a short piece between the two splits.',
        '7. Tap that short piece. Tap Delete.',
        '   You should see: the piece gone and the clips closed up.',
        '8. Repeat 3–7 for the next cut up the list, until cut 01 is done.',
        '   You should see: no pauses left when you play it back.',
        '9. Head or tail cuts need one split: split, tap the piece before (head) or after (tail), tap Delete.',
        '',
        'Label variants: the toolbar may say Edit first; Split and Delete sit in the clip toolbar on current builds.',
        '',
        txt,
      ]
      return steps.join('\n')
    }

    /* ================================================================ export A */
    function syncExport() {
      const real = st.src && !st.src.demo && st.src.file
      const anyKeep = st.regions.some(r => r.keep)
      renderBtn.disabled = !real || !anyKeep || !!ac
      if (!st.src || st.src.demo)
        exportNote.textContent =
          'The demo has no picture. Pick a clip to render the jump cut; the cut list works now.'
      else if (st.src.probeFailed)
        exportNote.textContent =
          'The video engine (Mediabunny) did not load, so rendering is off. The cut list still works; reload with a connection to render.'
      else if (!anyKeep)
        exportNote.textContent = 'Everything is cut. Keep at least one region.'
      else {
        const x = E.stats(st.regions, st.src.duration)
        exportNote.textContent = `${x.keeps} pieces, ${sec(x.kept, 1)} out. Rendering runs on this phone; keep the screen on.`
      }
    }

    const evenDim = n => Math.max(2, Math.round(n / 2) * 2)

    async function renderA() {
      if (!st.src || !st.src.file || ac) return
      ac = new AbortController()
      const signal = ac.signal
      renderBtn.disabled = true
      progress.hidden = false
      result.hidden = true
      result.replaceChildren()
      barFill.style.width = '0%'
      cancelBtn.hidden = false
      progText.textContent = 'Loading the video engine…'
      if (!video.paused) video.pause()
      let output = null
      try {
        const out = await renderJumpCut(
          signal,
          (done, total, phase) => {
            barFill.style.width = `${Math.round((done / Math.max(1, total)) * 100)}%`
            progText.textContent = `${phase} ${done}/${total} frames`
          },
          o => {
            output = o
          },
        )
        st.exportBlob = out
        showResult(out)
      } catch (e) {
        if (output && signal.aborted)
          try {
            await output.cancel()
          } catch (_e) {
            /* already closed */
          }
        if (signal.aborted) {
          progText.textContent = 'Cancelled.'
          LN.toast('Render cancelled.', { kind: 'warn' })
        } else {
          console.warn('[autocut] render failed', e)
          progText.textContent = `Render failed: ${e.message || e}`
          LN.toast('Render failed. The cut list still works.', {
            kind: 'err',
            ms: 5200,
          })
        }
      } finally {
        ac = null
        cancelBtn.hidden = true
        syncExport()
      }
    }

    async function renderJumpCut(signal, onProgress, onOutput) {
      const MB = await LN.lib.mediabunny()
      const src = st.src
      const input = new MB.Input({
        source: new MB.BlobSource(src.file),
        formats: MB.ALL_FORMATS,
      })
      const vt = await input.getPrimaryVideoTrack()
      if (!vt) throw new Error('This file has no video track.')
      if (!(await vt.canDecode()))
        throw new Error(
          `This browser cannot decode ${vt.codec || 'this'} video. Shoot H.264 or HEVC from the Pixel camera.`,
        )
      const fps = src.fps || 30
      const ranges = E.keepRanges(st.regions)
      if (!ranges.length) throw new Error('Nothing is kept.')
      // size
      const dw = src.video ? src.video.width : vt.displayWidth
      const dh = src.video ? src.video.height : vt.displayHeight
      const rot = src.video ? src.video.rotation || 0 : 0
      const short = Math.min(dw, dh)
      const want =
        st.size === 'source' ? short : Math.min(short, Number(st.size))
      const tryDims = [want, 1080, 720]
        .filter((v, i, a) => v <= short && a.indexOf(v) === i)
        .map(v => {
          const k = v / short
          return [evenDim(dw * k), evenDim(dh * k)]
        })
      if (!tryDims.length) tryDims.push([evenDim(dw), evenDim(dh)])
      let dims = null
      for (const [w, hh] of tryDims)
        if (await MB.canEncodeVideo('avc', { width: w, height: hh })) {
          dims = [w, hh]
          break
        }
      if (!dims)
        throw new Error('This browser has no H.264 encoder for this size.')
      if (dims[0] !== tryDims[0][0])
        LN.toast(
          `H.264 at the chosen size is not available here; rendering ${dims[0]}×${dims[1]}.`,
          { kind: 'warn' },
        )
      // audio codec: AAC if this browser encodes it, else Opus (inside MP4)
      const sr = src.sampleRate
      const nch = Math.min(2, src.channels.length)
      let aCodec = null
      if (
        await MB.canEncodeAudio('aac', {
          numberOfChannels: nch,
          sampleRate: sr,
        })
      )
        aCodec = 'aac'
      else if (
        await MB.canEncodeAudio('opus', {
          numberOfChannels: nch,
          sampleRate: 48000,
        })
      )
        aCodec = 'opus'
      if (!aCodec)
        throw new Error('This browser has neither an AAC nor an Opus encoder.')
      let audioSrc = src.channels.slice(0, nch)
      let aRate = sr
      if (aCodec === 'opus' && sr !== 48000) {
        audioSrc = await resample(audioSrc, sr, 48000)
        aRate = 48000
      }
      const needTransform =
        rot !== 0 || dims[0] !== evenDim(dw) || dims[1] !== evenDim(dh)
      const output = new MB.Output({
        format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }),
        target: new MB.BufferTarget(),
      })
      onOutput(output)
      const vSource = new MB.VideoSampleSource({
        codec: 'avc',
        quality: new MB.Quality('very-high'),
        keyFrameInterval: 1,
        sizeChangeBehavior: 'contain',
        ...(needTransform
          ? { transform: { width: dims[0], height: dims[1], fit: 'contain' } }
          : {}),
      })
      const aSource = new MB.AudioBufferSource({
        codec: aCodec,
        quality: new MB.Quality({
          bitrate: aCodec === 'aac' ? 192000 : 160000,
        }),
      })
      output.addVideoTrack(vSource, { frameRate: fps })
      output.addAudioTrack(aSource)
      await output.start()
      const sink = new MB.VideoSampleSink(vt)
      const total = Math.max(
        1,
        ranges.reduce((s2, r) => s2 + Math.round((r[1] - r[0]) * fps), 0),
      )
      const xf = Math.round((st.xfFrames / fps) * aRate)
      const Actx =
        window.OfflineAudioContext || window.webkitOfflineAudioContext
      const mkCtx = new Actx(nch, 1, aRate)
      let off = 0
      let done = 0
      const abort = () => {
        const e = new Error('Render cancelled')
        e.name = 'AbortError'
        return e
      }
      for (let k = 0; k < ranges.length; k++) {
        const [a, b] = ranges[k]
        for await (const smp of sink.samples(a, b)) {
          if (signal.aborted) {
            smp.close()
            throw abort()
          }
          const t = smp.timestamp
          if (t >= b - 1e-4) {
            smp.close()
            break
          }
          const s0 = Math.max(t, a)
          const e0 = Math.min(t + (smp.duration || 1 / fps), b)
          if (e0 - s0 < 1e-4) {
            smp.close()
            continue
          }
          smp.setTimestamp(off + (s0 - a))
          smp.setDuration(e0 - s0)
          await vSource.add(smp)
          smp.close()
          done++
          onProgress(Math.min(done, total), total, 'Cutting')
        }
        // the audio for this range, with crossfades on the joints
        const pcm = E.chunkAudio(audioSrc, aRate, ranges, k, xf)
        if (pcm[0].length) {
          const buf = mkCtx.createBuffer(nch, pcm[0].length, aRate)
          pcm.forEach((c, i) => buf.copyToChannel(c, i))
          await aSource.add(buf)
        }
        off += b - a
      }
      if (signal.aborted) throw abort()
      onProgress(total, total, 'Finishing')
      vSource.close()
      aSource.close()
      await output.finalize()
      const blob = new Blob([output.target.buffer], { type: 'video/mp4' })
      return {
        blob,
        filename: `${baseName()}_autocut.mp4`,
        width: dims[0],
        height: dims[1],
        duration: off,
        aCodec,
        frames: done,
      }
    }

    async function resample(channels, from, to) {
      const len = Math.round((channels[0].length * to) / from)
      const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext
      const ctx = new Ctx(channels.length, len, to)
      const buf = ctx.createBuffer(channels.length, channels[0].length, from)
      channels.forEach((c, i) => buf.copyToChannel(c, i))
      const n = ctx.createBufferSource()
      n.buffer = buf
      n.connect(ctx.destination)
      n.start()
      const r = await ctx.startRendering()
      return channels.map((_, i) => r.getChannelData(i))
    }

    let resultUrl = null
    function showResult(out) {
      progText.textContent = `Done: ${out.frames} frames, ${sec(out.duration, 2)}.`
      if (resultUrl) URL.revokeObjectURL(resultUrl)
      resultUrl = URL.createObjectURL(out.blob)
      const v = h('video', {
        class: 'ac-video',
        controls: true,
        playsinline: true,
        src: resultUrl,
      })
      const kids = [
        h('b', { class: 'ac-file' }, out.filename),
        h(
          'span',
          { class: 'ln-small ln-muted ln-num' },
          `${out.width}×${out.height} · H.264 + ${out.aCodec === 'aac' ? 'AAC' : 'Opus'} · ${sec(out.duration, 1)} · ${LN.fmt.bytes(out.blob.size)}`,
        ),
        v,
        ui.btn(
          `Save ${out.filename}`,
          () =>
            LN.save({
              filename: out.filename,
              data: out.blob,
              mime: 'video/mp4',
            }),
          { block: true },
        ),
      ]
      if (out.aCodec === 'opus')
        kids.push(
          ui.callout(
            'verify',
            'This browser has no AAC encoder, so the sound is Opus inside the MP4. Chrome and Android play it. Whether CapCut imports Opus audio is unverified: if the clip lands silent in CapCut, use the cut list (B) on the original instead.',
          ),
        )
      kids.push(
        h(
          'p',
          { class: 'ln-small ln-faint' },
          'Import it in CapCut as a normal clip. It is a re-encode: for the cleanest picture, cut the original with list B.',
        ),
      )
      result.replaceChildren(...kids)
      result.hidden = false
    }

    loadDemo()
    // read-only handle for QA scripts
    LN.autocut.debug = () => ({
      src: st.src,
      result: st.result,
      regions: st.regions,
      exported: st.exportBlob,
    })
  }

  LN.autocut = { mount, engine: E }
})()
