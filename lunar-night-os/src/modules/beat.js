/* modules/beat.js: Music Edit (Beat Forge), a tab inside The Cut.
   LN.beatForge = { mount(el), analyse(audioBuffer, opts), plan(analysis, opts) }

   1. Music analysis in the browser: STFT spectral-flux onset envelope (46 ms
      window, 11.6 ms hop, chunked), tempo by onset autocorrelation with a
      log-Gaussian prior at 120 BPM, Ellis dynamic-programming beat tracking
      refined to a steady grid, downbeat phase by accent, energy sections
      (RMS + centroid novelty) and the strongest transients.
   2. A rules engine that turns the analysis, the clip list and a format into
      a layered plan (V1 V2 V3 T1 A1 A2) in seconds, frames, beats and bars.
      Fable 5.1 can draft the same plan; it is validated and snapped to the grid.
   3. Outputs: a CapCut build sheet (Mobile + Desktop), beat-marker lists,
      a live canvas preview on the WebAudio clock, and an experimental
      rough-cut render through Mediabunny. */
;(() => {
  const LN = window.LN

  /* ============================================================ constants */
  const STYLES = ['4K Lunar', 'VHS', 'Dreamcore', 'B-roll']
  const STYLE_COL = {
    '4K Lunar': '#7a64e0',
    VHS: '#dda13e',
    Dreamcore: '#e3a3c4',
    'B-roll': '#8db39a',
  }
  const SEC_COL = {
    intro: '#4c6a8f',
    build: '#dda13e',
    drop: '#c0392b',
    break: '#8db39a',
    outro: '#6b7486',
  }
  const LAYERS = ['V1', 'V2', 'V3', 'T1', 'A1', 'A2']
  const LAYER_NAME = {
    V1: 'V1 main',
    V2: 'V2 overlay',
    V3: 'V3 FX plates',
    T1: 'T1 text',
    A1: 'A1 music',
    A2: 'A2 SFX',
  }
  /** Format house rules (CONTRACT canon). house = cut-length rule in seconds. */
  const FORMATS = {
    night: {
      id: 'night',
      name: 'Lunar Night Reel',
      fps: 24,
      sfx: false,
      accent: 'cut',
      ramps: false,
      maxTransitions: 0,
      music: 25,
      musicNote: '20–30 per the runbook (or the night sound at 100)',
      voice: 'none: music-led, no voice, no SFX',
      house: { min: 3, max: 5, text: '3–5 s static holds, hard cuts' },
      text: 'lime',
    },
    market: {
      id: 'market',
      name: 'Marketplace Review',
      fps: 30,
      sfx: true,
      sfxVol: 45,
      accent: 'zoom',
      ramps: true,
      maxTransitions: 2,
      music: 15,
      musicNote: '10–20 under the voice',
      voice: 'voice 100, music 10–20, one SFX per big moment at 30–60',
      house: { min: 1, max: 3, text: 'a cut every 1–3 s, 2 transitions max' },
      text: 'hook',
    },
    r2s: {
      id: 'r2s',
      name: 'Road to Three Stars',
      fps: 24,
      sfx: true,
      sfxVol: 35,
      accent: 'flash',
      ramps: true,
      maxTransitions: 99,
      music: 15,
      musicNote: 'under the voice spine',
      voice: 'voice-first audio spine',
      house: { min: 1.8, max: 4.5, text: 'montage ≈1.8 s, emotional ≈4.5 s' },
      text: 'editorial',
    },
    rnd: {
      id: 'rnd',
      name: 'R&D Lab',
      fps: 30,
      sfx: true,
      sfxVol: 40,
      accent: 'flash',
      ramps: true,
      extraRamps: true,
      maxTransitions: 99,
      music: 100,
      musicNote: 'music-led; 15 under any voice',
      voice: 'optional voice; mono data cards carry the facts',
      house: { min: 0.5, max: 3, text: 'speed ramps carry the pace' },
      text: 'mono',
    },
  }
  /** Section → primary style chain (first available wins). */
  const SECTION_STYLE = {
    intro: ['Dreamcore', 'VHS', 'B-roll', '4K Lunar'],
    build: ['VHS', 'Dreamcore', 'B-roll', '4K Lunar'],
    drop: ['4K Lunar', 'B-roll', 'VHS', 'Dreamcore'],
    break: ['Dreamcore', 'VHS', 'B-roll', '4K Lunar'],
    outro: ['VHS', 'Dreamcore', '4K Lunar', 'B-roll'],
  }
  const RAMPS = {
    'Impact Drop': {
      nodes: [2, 0.5, 1, 1, 1],
      how: 'node 1 at 2.0x, node 2 at 0.5x just after the hit, nodes 3–5 at 1.0x',
    },
    'Impact run-in': {
      nodes: [1, 1, 1, 2, 4],
      how: 'nodes 1–3 at 1.0x, node 4 at 2.0x, node 5 at 4.0x into the downbeat',
    },
    'Whip-Pulse': {
      nodes: [4, 1, 1, 1, 1],
      how: 'node 1 at 4.0x, nodes 2–5 at 1.0x (the whip lands on the cut)',
    },
  }
  const PLATES = {
    Grain: { blend: 'Overlay', opacity: 20 },
    'VHS tracking': { blend: 'Screen', opacity: 40 },
    'Light leak': { blend: 'Screen', opacity: 35 },
    'White flash': { blend: 'Normal', opacity: 100 },
  }

  /* ============================================================ small maths */
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)
  const yieldUI = () => new Promise(r => setTimeout(r, 0))
  const median = a => {
    if (!a.length) return 0
    const s = Array.from(a).sort((x, y) => x - y)
    const m = s.length >> 1
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
  }
  const meanStd = a => {
    let m = 0
    for (const v of a) m += v
    m /= a.length || 1
    let v2 = 0
    for (const v of a) v2 += (v - m) * (v - m)
    return [m, Math.sqrt(v2 / (a.length || 1)) || 1e-9]
  }
  const r3 = x => Math.round(x * 1000) / 1000
  const abortErr = () => {
    const e = new Error('Cancelled')
    e.name = 'AbortError'
    return e
  }

  function makeFFT(n) {
    const levels = Math.round(Math.log2(n))
    const rev = new Uint32Array(n)
    for (let i = 0; i < n; i++) {
      let r = 0
      let x = i
      for (let b = 0; b < levels; b++) {
        r = (r << 1) | (x & 1)
        x >>= 1
      }
      rev[i] = r
    }
    const cs = new Float64Array(n / 2)
    const sn = new Float64Array(n / 2)
    for (let i = 0; i < n / 2; i++) {
      cs[i] = Math.cos((2 * Math.PI * i) / n)
      sn[i] = Math.sin((2 * Math.PI * i) / n)
    }
    return (re, im) => {
      for (let i = 0; i < n; i++) {
        const j = rev[i]
        if (j > i) {
          let t = re[i]
          re[i] = re[j]
          re[j] = t
          t = im[i]
          im[i] = im[j]
          im[j] = t
        }
      }
      for (let size = 2; size <= n; size <<= 1) {
        const half = size >> 1
        const step = n / size
        for (let i = 0; i < n; i += size) {
          for (let j = i, k = 0; j < i + half; j++, k += step) {
            const l = j + half
            const tre = re[l] * cs[k] + im[l] * sn[k]
            const tim = im[l] * cs[k] - re[l] * sn[k]
            re[l] = re[j] - tre
            im[l] = im[j] - tim
            re[j] += tre
            im[j] += tim
          }
        }
      }
    }
  }

  /* ============================================================ analysis */
  // Measured on synthetic click tracks: the flux peak leads the true onset by
  // roughly this much at a 46 ms window, so beat times are shifted later.
  const LATENCY = 0.0085

  /**
   * Analyse an AudioBuffer (or {sampleRate, length, numberOfChannels, getChannelData}).
   * opts: {onProgress(fraction, label), signal, name}
   * → Promise<analysis>
   */
  async function analyse(buf, opts = {}) {
    const onP = opts.onProgress || (() => {})
    const sr0 = buf.sampleRate
    const nch = buf.numberOfChannels || 1
    const dec = Math.max(1, Math.round(sr0 / 22050))
    const sr = sr0 / dec
    const n = Math.floor(buf.length / dec)
    const chans = []
    for (let c = 0; c < nch; c++) chans.push(buf.getChannelData(c))
    const x = new Float32Array(n)
    const norm = 1 / (nch * dec)
    for (let i = 0; i < n; i++) {
      let s = 0
      const o = i * dec
      for (let c = 0; c < nch; c++) {
        const ch = chans[c]
        for (let k = 0; k < dec; k++) s += ch[o + k]
      }
      x[i] = s * norm
    }
    onP(0.02, 'Mixing to mono')
    await yieldUI()

    // STFT: 46.4 ms Hann window, 11.6 ms hop, frames centred on i * hop.
    const win = Math.round(0.0464 * sr)
    const hop = Math.round(0.01161 * sr)
    let nfft = 1
    while (nfft < win) nfft <<= 1
    const fr = sr / hop
    const T = Math.max(1, Math.floor(n / hop) + 1)
    const hann = new Float64Array(win)
    for (let i = 0; i < win; i++)
      hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1))
    const fft = makeFFT(nfft)
    const nb = nfft / 2 + 1
    // ~48 mel-spaced bands, 30 Hz to Nyquist
    const NB = 48
    const mel = f => 2595 * Math.log10(1 + f / 700)
    const m0 = mel(30)
    const m1 = mel(sr / 2)
    const bandOf = new Int16Array(nb)
    let lowTop = 0
    let highFrom = NB
    for (let k = 0; k < nb; k++) {
      const f = (k * sr) / nfft
      bandOf[k] =
        f < 30
          ? -1
          : Math.min(NB - 1, Math.floor(((mel(f) - m0) / (m1 - m0)) * NB))
    }
    for (let b = 0; b < NB; b++) {
      const fb = 700 * (10 ** ((m0 + ((b + 1) / NB) * (m1 - m0)) / 2595) - 1)
      if (fb <= 180) lowTop = b + 1
      if (fb > 2500 && highFrom === NB) highFrom = b
    }
    const re = new Float64Array(nfft)
    const im = new Float64Array(nfft)
    const band = new Float64Array(NB)
    let prev = new Float64Array(NB)
    let cur = new Float64Array(NB)
    const flux = new Float32Array(T)
    const lowFlux = new Float32Array(T)
    const highFlux = new Float32Array(T)
    const rms = new Float32Array(T)
    const cent = new Float32Array(T)
    const lowFrac = new Float32Array(T)
    const ampNorm = 4 / nfft
    for (let t = 0; t < T; t++) {
      if (opts.signal && opts.signal.aborted) throw abortErr()
      const c = t * hop - (win >> 1)
      re.fill(0)
      im.fill(0)
      let e = 0
      for (let i = 0; i < win; i++) {
        const j = c + i
        const v = j >= 0 && j < n ? x[j] : 0
        e += v * v
        re[i] = v * hann[i]
      }
      rms[t] = Math.sqrt(e / win)
      fft(re, im)
      band.fill(0)
      let sm = 0
      let sf = 0
      let lowE = 0
      let totE = 0
      for (let k = 1; k < nb; k++) {
        const mag = Math.hypot(re[k], im[k]) * ampNorm
        const p = mag * mag
        const b = bandOf[k]
        if (b >= 0) band[b] += p
        sm += mag
        sf += mag * ((k * sr) / nfft)
        totE += p
        if ((k * sr) / nfft < 160) lowE += p
      }
      cent[t] = sm > 1e-9 ? sf / sm : 0
      lowFrac[t] = totE > 1e-12 ? lowE / totE : 0
      let fl = 0
      let lo = 0
      let hi = 0
      for (let b = 0; b < NB; b++) {
        cur[b] = Math.log1p(1000 * Math.sqrt(band[b]))
        const d = cur[b] - prev[b]
        if (d > 0) {
          fl += d
          if (b < lowTop) lo += d
          if (b >= highFrom) hi += d
        }
      }
      flux[t] = t ? fl : 0
      lowFlux[t] = t ? lo : 0
      highFlux[t] = t ? hi : 0
      const sw = prev
      prev = cur
      cur = sw
      if (t % 600 === 599) {
        onP(0.04 + 0.66 * (t / T), 'Reading the onsets')
        await yieldUI()
      }
    }

    // Onset envelope: remove the local mean (0.5 s), half-wave rectify, unit std.
    const env = new Float32Array(T)
    const half = Math.round(fr * 0.25)
    let acc = 0
    let cnt = 0
    for (let t = 0; t < Math.min(T, half); t++) {
      acc += flux[t]
      cnt++
    }
    for (let t = 0; t < T; t++) {
      const add = t + half
      if (add < T) {
        acc += flux[add]
        cnt++
      }
      const rem = t - half - 1
      if (rem >= 0) {
        acc -= flux[rem]
        cnt--
      }
      env[t] = Math.max(0, flux[t] - acc / cnt)
    }
    const [, sd] = meanStd(env)
    for (let t = 0; t < T; t++) env[t] /= sd
    onP(0.74, 'Finding the tempo')
    await yieldUI()

    const an = {
      version: 1,
      name: opts.name || 'track',
      duration: buf.length / sr0,
      sampleRate: sr0,
      fr,
      hopSec: 1 / fr,
      winSec: win / sr,
      env,
      flux,
      lowFlux,
      highFlux,
      rms,
      cent,
      lowFrac,
      bandSplit: [lowTop, NB - highFrom, NB],
      offsetMs: 0,
    }
    const tempo = estimateTempo(env, fr)
    an.candidates = tempo.candidates
    an.bpmDetected = tempo.bpm
    onP(0.8, 'Tracking the beats')
    await yieldUI()
    const tracked = trackBeats(env, fr, tempo.bpm)
    an.steady = tracked.steady
    an.bpm = tracked.bpm
    an.baseBeats = fillGrid(tracked.beats, an.duration, tracked.steady)
    applyOffset(an)
    onP(0.9, 'Bars and sections')
    await yieldUI()
    structure(an)
    an.transients = findTransients(an)
    an.peaks = peaks(x, sr, 100)
    an.peakRate = 100
    onP(1, 'Done')
    return an
  }

  function estimateTempo(env, fr) {
    const T = env.length
    const minLag = Math.max(2, Math.floor((fr * 60) / 240))
    const maxLag = Math.min(T - 2, Math.ceil((fr * 60) / 40))
    const acf = new Float64Array(maxLag + 2)
    for (let l = minLag - 1; l <= maxLag + 1 && l < T; l++) {
      let s = 0
      for (let t = 0; t + l < T; t++) s += env[t] * env[t + l]
      acf[l] = s / (T - l)
    }
    const prior = bpm => Math.exp(-0.5 * (Math.log2(bpm / 120) / 1.0) ** 2)
    let best = minLag
    let bestS = -1
    for (let l = minLag; l <= maxLag; l++) {
      const s = acf[l] * prior((fr * 60) / l)
      if (s > bestS) {
        bestS = s
        best = l
      }
    }
    // parabolic refinement of the peak lag
    let lag = best
    if (best > minLag && best < maxLag) {
      const a = acf[best - 1]
      const b = acf[best]
      const c = acf[best + 1]
      const den = a - 2 * b + c
      if (den < 0) lag = best + (0.5 * (a - c)) / den
    }
    const bpm = (fr * 60) / lag
    const score = b => {
      const l = (fr * 60) / b
      const i = Math.round(l)
      return i >= minLag - 1 && i <= maxLag + 1 ? acf[i] : 0
    }
    const top = score(bpm) || 1
    return {
      bpm,
      candidates: [
        { bpm, label: 'detected', score: 1 },
        { bpm: bpm / 2, label: 'half', score: score(bpm / 2) / top },
        { bpm: bpm * 2, label: 'double', score: score(bpm * 2) / top },
      ],
    }
  }

  const interp = (a, f) => {
    if (f <= 0) return a[0]
    const i = Math.floor(f)
    if (i >= a.length - 1) return a[a.length - 1]
    const u = f - i
    return a[i] * (1 - u) + a[i + 1] * u
  }

  function smoothEnv(env, sigma) {
    const r = Math.max(1, Math.ceil(sigma * 3))
    const k = []
    let ks = 0
    for (let i = -r; i <= r; i++) {
      const v = Math.exp(-0.5 * (i / sigma) ** 2)
      k.push(v)
      ks += v
    }
    const out = new Float32Array(env.length)
    for (let t = 0; t < env.length; t++) {
      let s = 0
      for (let i = -r; i <= r; i++) {
        const j = t + i
        if (j >= 0 && j < env.length) s += env[j] * k[i + r]
      }
      out[t] = s / ks
    }
    return out
  }

  /** Ellis (2007) dynamic programming, then a sub-frame steady-grid fit. */
  function trackBeats(env, fr, bpm) {
    const T = env.length
    const period = (fr * 60) / bpm
    const local = smoothEnv(env, Math.max(1, period / 32))
    const cum = new Float64Array(T)
    const back = new Int32Array(T).fill(-1)
    const tight = 100
    for (let t = 0; t < T; t++) {
      const lo = Math.max(0, Math.round(t - 2 * period))
      const hi = Math.round(t - period / 2)
      let best = Number.NEGATIVE_INFINITY
      let arg = -1
      for (let p = lo; p <= hi; p++) {
        const s = cum[p] - tight * Math.log((t - p) / period) ** 2
        if (s > best) {
          best = s
          arg = p
        }
      }
      cum[t] = local[t] + (arg >= 0 ? Math.max(0, best) : 0)
      back[t] = arg >= 0 && best > 0 ? arg : -1
    }
    // last beat: the best cumulative score in the final period
    let end = T - 1
    let bs = Number.NEGATIVE_INFINITY
    for (let t = Math.max(0, Math.floor(T - period)); t < T; t++)
      if (cum[t] > bs) {
        bs = cum[t]
        end = t
      }
    const frames = []
    for (let t = end; t >= 0; t = back[t]) {
      frames.push(t)
      if (back[t] < 0) break
    }
    frames.reverse()
    // trim weak leading/trailing beats
    const strong = frames.map(f => local[f])
    const thr = 0.25 * median(strong)
    while (frames.length > 2 && local[frames[0]] < thr) frames.shift()
    while (frames.length > 2 && local[frames[frames.length - 1]] < thr)
      frames.pop()
    const K = frames.length
    if (K < 4) {
      return {
        bpm,
        steady: false,
        beats: frames.map(f => f / fr + LATENCY),
      }
    }
    // least-squares line through (k, frame)
    let sk = 0
    let sf = 0
    let skk = 0
    let skf = 0
    for (let k = 0; k < K; k++) {
      sk += k
      sf += frames[k]
      skk += k * k
      skf += k * frames[k]
    }
    const P0 = (K * skf - sk * sf) / (K * skk - sk * sk)
    const A0 = (sf - P0 * sk) / K
    let res = 0
    for (let k = 0; k < K; k++) res += (frames[k] - (A0 + k * P0)) ** 2
    const rmsRes = Math.sqrt(res / K) / fr
    const steady = rmsRes < 0.03
    if (!steady) {
      const ibi = []
      for (let k = 1; k < K; k++) ibi.push(frames[k] - frames[k - 1])
      return {
        bpm: (fr * 60) / median(ibi),
        steady: false,
        beats: frames.map(f => refinePeak(local, f) / fr + LATENCY),
      }
    }
    // fine search of period and phase on the smoothed envelope
    const fit = fitGrid(local, P0, A0, K)
    const beats = []
    for (let k = 0; k < K; k++) beats.push((fit.A + k * fit.P) / fr + LATENCY)
    return { bpm: (fr * 60) / fit.P, steady: true, beats }
  }

  function refinePeak(a, f) {
    if (f <= 0 || f >= a.length - 1) return f
    const x = a[f - 1]
    const y = a[f]
    const z = a[f + 1]
    const den = x - 2 * y + z
    return den < 0 ? f + clamp((0.5 * (x - z)) / den, -0.5, 0.5) : f
  }

  function fitGrid(local, P0, A0, K) {
    const score = (P, A) => {
      let s = 0
      for (let k = 0; k < K; k++) s += interp(local, A + k * P)
      return s
    }
    let bestP = P0
    let bestA = A0
    let best = score(P0, A0)
    for (let pass = 0; pass < 2; pass++) {
      const pr = pass ? 0.0008 : 0.004
      const ar = pass ? 0.4 : 3
      const ps = pass ? 0.00004 : 0.0004
      const as = pass ? 0.02 : 0.1
      const cP = bestP
      const cA = bestA
      for (let p = cP * (1 - pr); p <= cP * (1 + pr); p += cP * ps) {
        // keep the middle beat fixed while the period moves
        const mid = cA + (K / 2) * cP
        for (let da = -ar; da <= ar; da += as) {
          const A = mid - (K / 2) * p + da
          const s = score(p, A)
          if (s > best) {
            best = s
            bestP = p
            bestA = A
          }
        }
      }
    }
    return { P: bestP, A: bestA }
  }

  /** Extend a steady grid to cover the whole track (from the first beat ≥ 0). */
  function fillGrid(beats, duration, steady) {
    if (!steady || beats.length < 2) return beats.slice()
    const P = (beats[beats.length - 1] - beats[0]) / (beats.length - 1)
    let t0 = beats[0]
    while (t0 - P >= -0.001) t0 -= P
    const out = []
    for (let t = t0; t < duration - 0.02; t += P) out.push(t)
    return out
  }

  function applyOffset(an) {
    const o = (an.offsetMs || 0) / 1000
    an.beats = an.baseBeats.map(t => t + o)
  }

  const envAt = (an, t) => {
    const f = (t - LATENCY) * an.fr
    const i = Math.round(f)
    let m = 0
    for (let k = i - 2; k <= i + 2; k++)
      if (k >= 0 && k < an.env.length && an.env[k] > m) m = an.env[k]
    return m
  }
  const frameMean = (arr, an, t0, t1) => {
    const a = Math.max(0, Math.floor(t0 * an.fr))
    const b = Math.min(arr.length, Math.max(a + 1, Math.floor(t1 * an.fr)))
    let s = 0
    for (let i = a; i < b; i++) s += arr[i]
    return s / Math.max(1, b - a)
  }

  /** Downbeat phase, bars and labelled energy sections. */
  function structure(an) {
    const B = an.beats.length
    const P = 60 / an.bpm
    // downbeat phase: accent (onset + low-band kick) summed per phase mod 4
    const accent = an.beats.map(t => {
      const f = Math.round((t - LATENCY) * an.fr)
      let lo = 0
      for (let k = f - 2; k <= f + 2; k++)
        if (k >= 0 && k < an.lowFlux.length) lo = Math.max(lo, an.lowFlux[k])
      return envAt(an, t) + 0.5 * lo
    })
    const ph = [0, 0, 0, 0]
    const pc = [0, 0, 0, 0]
    for (let i = 0; i < B; i++) {
      ph[i % 4] += accent[i]
      pc[i % 4]++
    }
    let phase = 0
    for (let p = 1; p < 4; p++)
      if (ph[p] / (pc[p] || 1) > ph[phase] / (pc[phase] || 1)) phase = p
    an.downbeatPhase = phase
    an.bars = []
    for (let i = phase; i < B; i += 4) an.bars.push(i)
    // per-bar features
    const bars = an.bars
    const feats = []
    for (let j = 0; j < bars.length; j++) {
      const t0 = an.beats[bars[j]]
      const t1 = bars[j] + 4 < B ? an.beats[bars[j] + 4] : t0 + 4 * P
      const r = frameMean(an.rms, an, t0, t1)
      feats.push({
        db: 20 * Math.log10(r + 1e-6),
        cent: frameMean(an.cent, an, t0, t1),
        low: frameMean(an.lowFrac, an, t0, t1),
        on: frameMean(an.env, an, t0, t1),
      })
    }
    const NBar = feats.length
    const keys = ['db', 'cent', 'low', 'on']
    const W = { db: 1.4, cent: 1, low: 1, on: 0.8 }
    const z = feats.map(() => ({}))
    for (const k of keys) {
      const [m, s] = meanStd(feats.map(f => f[k]))
      feats.forEach((f, j) => {
        z[j][k] = ((f[k] - m) / s) * W[k]
      })
    }
    // novelty: distance between the 2 bars after and the 2 bars before
    const L = NBar >= 16 ? 2 : 1
    const nov = new Float64Array(NBar)
    for (let j = L; j <= NBar - L; j++) {
      let d = 0
      for (const k of keys) {
        let a = 0
        let b = 0
        for (let i = 0; i < L; i++) {
          a += z[j + i] ? z[j + i][k] : 0
          b += z[j - 1 - i][k]
        }
        d += ((a - b) / L) ** 2
      }
      nov[j] = Math.sqrt(d)
    }
    const minLen = NBar >= 24 ? 4 : 2
    const [nm, ns] = meanStd(Array.from(nov).filter(v => v > 0))
    const cands = []
    for (let j = 1; j < NBar; j++) {
      const v = nov[j]
      if (v <= nm + 0.4 * ns) continue
      let isMax = true
      for (let k = j - 2; k <= j + 2; k++)
        if (k !== j && k > 0 && k < NBar && nov[k] > v) isMax = false
      if (isMax) cands.push({ j, v })
    }
    cands.sort((a, b) => b.v - a.v)
    const maxSecs = Math.max(2, Math.round(an.duration / 7))
    const cuts = [0, NBar]
    for (const c of cands) {
      if (cuts.length - 1 >= maxSecs) break
      if (cuts.every(x => Math.abs(x - c.j) >= minLen)) cuts.push(c.j)
    }
    cuts.sort((a, b) => a - b)
    const secs = []
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i]
      const b = cuts[i + 1]
      let e = 0
      let lo = 0
      for (let j = a; j < b; j++) {
        e += feats[j].db
        lo += feats[j].low
      }
      secs.push({ bar0: a, bar1: b, db: e / (b - a), low: lo / (b - a) })
    }
    labelSections(secs)
    // leading beats before the first downbeat belong to the first section
    an.sections = secs.map((s, i) => {
      const b0 = i === 0 ? 0 : bars[s.bar0]
      const b1 = s.bar1 < bars.length ? bars[s.bar1] : B
      return {
        label: s.label,
        startBeat: b0,
        endBeat: b1,
        startBar: s.bar0 + 1,
        endBar: s.bar1,
        start: r3(i === 0 ? 0 : an.beats[b0]),
        end: r3(b1 < B ? an.beats[b1] : an.duration),
        energy: Math.round(s.db * 10) / 10,
      }
    })
  }

  function labelSections(secs) {
    const n = secs.length
    const dbs = secs.map(s => s.db)
    const lo = Math.min(...dbs)
    const hi = Math.max(...dbs)
    const E = s => (hi - lo < 1.5 ? 0.5 : (s.db - lo) / (hi - lo))
    for (const s of secs) s.label = E(s) >= 0.68 ? 'drop' : ''
    if (!secs.some(s => s.label === 'drop') && n) {
      let m = secs[0]
      for (const s of secs) if (s.db > m.db) m = s
      if (n > 1) m.label = 'drop'
    }
    if (n > 1 && secs[0].label !== 'drop') secs[0].label = 'intro'
    if (n > 2 && secs[n - 1].label !== 'drop') secs[n - 1].label = 'outro'
    for (let i = 0; i < n; i++) {
      if (secs[i].label) continue
      const next = secs[i + 1]
      secs[i].label = next && next.label === 'drop' ? 'build' : 'break'
    }
    if (n === 1) secs[0].label = 'drop'
    // an intro that runs straight into the drop gives its last 4 bars to a build
    for (let i = 0; i < secs.length - 1; i++) {
      const s = secs[i]
      if (
        s.label === 'intro' &&
        secs[i + 1].label === 'drop' &&
        s.bar1 - s.bar0 >= 8
      ) {
        const b = { ...s, bar0: s.bar1 - 4, label: 'build' }
        s.bar1 -= 4
        secs.splice(i + 1, 0, b)
        i++
      }
    }
  }

  function findTransients(an) {
    const env = an.env
    const out = []
    for (let t = 3; t < env.length - 3; t++) {
      const v = env[t]
      if (v < 1.2) continue
      let ok = true
      for (let k = t - 3; k <= t + 3; k++)
        if (k !== t && env[k] > v) {
          ok = false
          break
        }
      if (!ok) continue
      // per-band average rise: low bands vs the whole spectrum
      const [nLo, nHi, nAll] = an.bandSplit
      const all = an.flux[t] / nAll + 1e-9
      const lo = an.lowFlux[t] / Math.max(1, nLo)
      const hi = an.highFlux[t] / Math.max(1, nHi)
      const kind =
        lo > 1.2 * all ? 'kick' : lo < 0.3 * all && hi > all ? 'hat' : 'snare'
      out.push({
        t: r3(refinePeak(env, t) / an.fr + LATENCY),
        s: Math.round(v * 100) / 100,
        kind,
      })
    }
    out.sort((a, b) => b.s - a.s)
    return out.slice(0, 400).sort((a, b) => a.t - b.t)
  }

  function peaks(x, sr, rate) {
    const step = Math.max(1, Math.round(sr / rate))
    const n = Math.ceil(x.length / step)
    const out = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      let m = 0
      const e = Math.min(x.length, (i + 1) * step)
      for (let j = i * step; j < e; j++) {
        const v = x[j] < 0 ? -x[j] : x[j]
        if (v > m) m = v
      }
      out[i] = m
    }
    return out
  }

  /* ------------------------------------------------------------ tempo edits */
  /** Re-grid at a new BPM: steady grid, phase fitted to the onset envelope. */
  function setBpm(an, bpm) {
    bpm = clamp(bpm, 40, 240)
    const P = (an.fr * 60) / bpm
    const local = smoothEnv(an.env, Math.max(1, P / 32))
    const K = Math.max(2, Math.floor(an.env.length / P) - 1)
    let bestA = 0
    let best = -1
    for (let A = 0; A < P; A += 0.25) {
      let s = 0
      for (let k = 0; k < K; k++) s += interp(local, A + k * P)
      if (s > best) {
        best = s
        bestA = A
      }
    }
    const beats = []
    for (let k = 0; k <= K; k++) beats.push((bestA + k * P) / an.fr + LATENCY)
    an.bpm = bpm
    an.steady = true
    an.baseBeats = fillGrid(beats, an.duration, true)
    applyOffset(an)
    structure(an)
  }
  function halfTime(an) {
    const keep = an.downbeatPhase % 2
    an.baseBeats = an.baseBeats.filter((_, i) => i % 2 === keep)
    an.bpm /= 2
    applyOffset(an)
    structure(an)
  }
  function doubleTime(an) {
    const b = an.baseBeats
    const out = []
    for (let i = 0; i < b.length; i++) {
      out.push(b[i])
      const nx = i + 1 < b.length ? b[i + 1] : b[i] + (b[i] - b[i - 1] || 0)
      if (nx < an.duration) out.push((b[i] + nx) / 2)
    }
    an.baseBeats = out
    an.bpm *= 2
    applyOffset(an)
    structure(an)
  }
  function nudge(an, ms) {
    an.offsetMs = clamp((an.offsetMs || 0) + ms, -500, 500)
    applyOffset(an)
    for (const s of an.sections) {
      s.start = r3(s.startBeat ? an.beats[s.startBeat] : 0)
      s.end = r3(
        s.endBeat < an.beats.length ? an.beats[s.endBeat] : an.duration,
      )
    }
  }

  /** Beat time for a fractional global beat index (extrapolates at the ends). */
  function beatTime(an, b) {
    const B = an.beats
    const n = B.length
    if (n < 2) return b * (60 / an.bpm)
    if (b <= 0) return B[0] + b * (B[1] - B[0])
    if (b >= n - 1) return B[n - 1] + (b - (n - 1)) * (B[n - 1] - B[n - 2])
    const i = Math.floor(b)
    return B[i] + (b - i) * (B[i + 1] - B[i])
  }
  const isDown = (an, b) =>
    Number.isInteger(b) && (((b - an.downbeatPhase) % 4) + 4) % 4 === 0
  const barOf = (an, b) => {
    const rel = b - an.downbeatPhase
    const bar = Math.floor(rel / 4) + 1
    const beat = rel - Math.floor(rel / 4) * 4 + 1
    return { bar, beat }
  }
  const barLabel = (an, b) => {
    const { bar, beat } = barOf(an, b)
    const bt = Number.isInteger(beat) ? String(beat) : String(r3(beat))
    return `${bar}.${bt}`
  }

  /** A compact, JSON-safe summary (for Fable and for exports). */
  function summary(an, maxTransients = 200) {
    return {
      bpm: Math.round(an.bpm * 100) / 100,
      steady: an.steady,
      duration: r3(an.duration),
      firstBeat: r3(an.beats[0] || 0),
      beatPeriod: r3(60 / an.bpm),
      downbeatPhase: an.downbeatPhase,
      sections: an.sections.map(s => ({
        label: s.label,
        start: s.start,
        end: s.end,
        startBeat: s.startBeat,
        endBeat: s.endBeat,
        bars: `${s.startBar}–${s.endBar}`,
      })),
      transients: an.transients
        .slice()
        .sort((a, b) => b.s - a.s)
        .slice(0, maxTransients)
        .sort((a, b) => a.t - b.t),
    }
  }

  /* ============================================================ plan (rules engine) */
  const slug = s =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'clip'
  const pad2 = n => String(Math.floor(Math.abs(n))).padStart(2, '0')
  const tc = (sec, fps) => {
    const total = Math.round(Math.max(0, sec) * fps)
    const f = total % fps
    const s = Math.floor(total / fps)
    return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}:${pad2(f)}`
  }
  const EXAMPLE_CLIPS = [
    { name: 'motel-sign-4k', style: '4K Lunar', duration: 8 },
    { name: 'gas-station-4k', style: '4K Lunar', duration: 8 },
    { name: 'tape-kitchen', style: 'VHS', duration: 6 },
    { name: 'tape-hands', style: 'VHS', duration: 5 },
    { name: 'pastel-plate', style: 'Dreamcore', duration: 6 },
    { name: 'steam-broll', style: 'B-roll', duration: 5 },
  ]

  function normClips(list) {
    const src = Array.isArray(list) && list.length ? list : EXAMPLE_CLIPS
    const seen = {}
    return src.map((c, i) => {
      const name = String((c && c.name) || `clip ${i + 1}`).slice(0, 80)
      let id = (c && c.id) || slug(name)
      while (seen[id]) id = `${id}-${i}`
      seen[id] = true
      return {
        id,
        name,
        style: STYLES.includes(c && c.style) ? c.style : 'B-roll',
        duration: Number(c && c.duration) > 0 ? Number(c.duration) : 5,
        file: (c && c.file) || null,
      }
    })
  }

  function windowFor(an, length, from) {
    const bars = an.bars
    const B = an.beats.length
    if (!bars.length) return { b0: 0, b1: Math.max(1, B - 1) }
    const first = bars[0]
    let maxEnd = first
    for (let b = first; beatTime(an, b) <= an.duration + 0.01; b += 4)
      maxEnd = b
    const P = 60 / an.bpm
    const nb = Math.max(4, Math.round(length / P / 4) * 4)
    let b0 = first
    if (from !== 'top') {
      const drop = an.sections.find(s => s.label === 'drop')
      if (drop) b0 = drop.startBeat - Math.round((nb * 0.4) / 4) * 4
    }
    b0 = Math.max(first, first + Math.round((b0 - first) / 4) * 4)
    let b1 = Math.min(b0 + nb, maxEnd)
    if (b1 - b0 < nb) b0 = Math.max(first, b1 - nb)
    if (b1 <= b0) b1 = b0 + 4
    return { b0, b1 }
  }

  function evenSplit(len, target) {
    const n = Math.max(1, Math.round(len / target))
    const base = Math.floor(len / n)
    const out = []
    let extra = len - base * n
    for (let i = 0; i < n; i++) {
      out.push(base + (extra > 0 ? 1 : 0))
      extra--
    }
    return out
  }

  /** Cut lengths (in beats) for one section, from the cut vocabulary. */
  function sectionCuts(an, label, b0, b1, ctx) {
    const len = b1 - b0
    const out = []
    let cur = b0
    const push = (nb, kind) => {
      out.push({ b0: cur, nb, kind })
      cur += nb
    }
    if (ctx.pace === 'house') {
      const P = 60 / an.bpm
      const minB = Math.max(1, Math.ceil(ctx.fmt.house.min / P - 0.05))
      const maxB = Math.max(minB, Math.floor(ctx.fmt.house.max / P + 0.05))
      const want = { intro: 4, break: 4, outro: 4, build: 2, drop: 1 }[label]
      const L = clamp(want, minB, maxB)
      for (const nb of evenSplit(len, L)) push(nb, `hold-${nb}`)
      return out
    }
    if (label === 'build') {
      if (len >= 8) {
        const a = Math.floor((len * 0.5) / 2) * 2
        const b = Math.floor(len * 0.25)
        for (let i = 0; i < a; i += 2) push(2, 'build-2')
        for (let i = 0; i < b; i++) push(1, 'build-1')
      } else if (len >= 3) {
        for (let i = 0; i < len - 2; i++) push(1, 'build-1')
      }
      while (b1 - cur > 1.001) push(0.5, 'stutter')
      // last beat before the drop: four flashes, or two stutters if too short
      const q = ctx.quarterOk ? 0.25 : 0.5
      while (b1 - cur > 0.001) push(q, q === 0.25 ? 'flash' : 'stutter')
      return out
    }
    if (label === 'drop') {
      const strong = ctx.strongOffbeats
      for (let b = b0; b < b1; b++) {
        const { bar, beat } = barOf(an, b)
        const barInSec = Math.floor((b - b0) / 4)
        const phraseEnd = barInSec % 4 === 3 && beat === 4
        const fill = b > b0 && strong.has(b) && beat !== 1
        if ((phraseEnd || fill) && !ctx.doubledBars.has(bar) && b !== b0) {
          ctx.doubledBars.add(bar)
          push(0.5, 'double-a')
          push(0.5, 'double-b')
        } else push(1, 'standard')
      }
      return out
    }
    const pattern =
      label === 'intro' ? [4, 4, 2, 2] : label === 'break' ? [4, 2, 2] : [4]
    let i = 0
    while (b1 - cur > 0.001) {
      const nb = Math.min(pattern[i++ % pattern.length], b1 - cur)
      push(nb, nb >= 4 ? 'hold' : 'hold-2')
    }
    return out
  }

  /**
   * Rules-engine plan.
   * opts: {clips:[{name, style, duration, file?}], format:'night'|'market'|'r2s'|'rnd',
   *        aspect:'9:16'|'16:9', length (s), fps?, pace:'beat'|'house', ramps?, from:'auto'|'top'}
   */
  function plan(an, opts = {}) {
    const fmt = FORMATS[opts.format] || FORMATS.night
    const o = {
      format: fmt.id,
      aspect: opts.aspect === '16:9' ? '16:9' : '9:16',
      length: clamp(Number(opts.length) || 30, 6, 180),
      fps: Number(opts.fps) || fmt.fps,
      pace: opts.pace === 'house' ? 'house' : 'beat',
      ramps: opts.ramps == null ? fmt.ramps : !!opts.ramps,
      from: opts.from === 'top' ? 'top' : 'auto',
    }
    const clips = normClips(opts.clips)
    const W = windowFor(an, o.length, o.from)
    const raw = rulesItems(an, W, clips, fmt, o)
    return finish(an, W, raw, clips, fmt, o, 'rules')
  }

  function makePicker(an, clips) {
    const byStyle = {}
    for (const s of STYLES) byStyle[s] = clips.filter(c => c.style === s)
    const turn = {}
    const cursor = {}
    let last = null
    const has = s => byStyle[s] && byStyle[s].length > 0
    const styleFor = chain => chain.find(has) || clips[0].style
    const pick = (style, avoid) => {
      const list = has(style) ? byStyle[style] : clips
      const k = turn[style] || 0
      let c = list[k % list.length]
      if (list.length > 1 && (c === last || c === avoid)) {
        turn[style] = k + 1
        c = list[(k + 1) % list.length]
      }
      turn[style] = (turn[style] || 0) + 1
      last = c
      return c
    }
    /** source in-point, rotating through the clip; slows a too-short clip. */
    const take = (clip, dur) => {
      let speed = 1
      let note = ''
      if (dur > clip.duration) {
        speed = Math.max(0.5, clip.duration / dur)
        note =
          speed > 0.5
            ? `clip is short: play it at ${speed.toFixed(2)}x`
            : 'clip is short: 0.5x, then Freeze the last frame'
        cursor[clip.id] = 0
      }
      let c = cursor[clip.id] || 0
      if (c + dur * speed > clip.duration + 1e-6) c = 0
      cursor[clip.id] = c + dur * speed
      return { inPoint: r3(c), speed: r3(speed), note }
    }
    return { has, styleFor, pick, take }
  }

  function rulesItems(an, W, clips, fmt, o) {
    const P = 60 / an.bpm
    const pk = makePicker(an, clips)
    const secs = an.sections
      .map(s => ({
        label: s.label,
        b0: Math.max(s.startBeat, W.b0),
        b1: Math.min(s.endBeat, W.b1),
      }))
      .filter(s => s.b1 - s.b0 >= 1)
    // strong off-beat transients in drops mark fills worth a 1/2-beat double
    const ss = an.transients.map(t => t.s).sort((a, b) => a - b)
    const q70 = ss[Math.floor(ss.length * 0.7)] || 0
    const strongOffbeats = new Set()
    for (const t of an.transients) {
      if (t.s < q70) continue
      const bf = beatIndexAt(an, t.t)
      const frac = bf - Math.floor(bf)
      if (Math.abs(frac - 0.5) < 0.12) strongOffbeats.add(Math.floor(bf))
    }
    const ctx = {
      fmt,
      pace: o.pace,
      strongOffbeats,
      doubledBars: new Set(),
      quarterOk: 0.25 * P * o.fps >= 2,
    }
    const items = []
    const v1 = []
    let doubles = 0
    for (const s of secs) {
      const style = pk.styleFor(SECTION_STYLE[s.label] || SECTION_STYLE.break)
      for (const c of sectionCuts(an, s.label, s.b0, s.b1, ctx)) {
        let st = style
        if (c.kind === 'double-b') {
          doubles++
          if (pk.has('VHS') && doubles % 2 === 1) {
            const clip = pk.pick('VHS')
            const dur = beatTime(an, c.b0 + c.nb) - beatTime(an, c.b0)
            items.push({
              layer: 'V2',
              b0: c.b0,
              nb: c.nb,
              clip: clip.id,
              clipName: clip.name,
              style: 'VHS',
              box: '4:3',
              blend: 'Normal',
              opacity: 100,
              kind: 'insert',
              section: s.label,
              ...pk.take(clip, dur),
            })
            // the V1 cut underneath carries on: merge into the previous half
            v1[v1.length - 1].nb += c.nb
            v1[v1.length - 1].kind = 'standard'
            continue
          }
          if (pk.has('B-roll') && style !== 'B-roll') st = 'B-roll'
        }
        const clip = pk.pick(st)
        const dur = beatTime(an, c.b0 + c.nb) - beatTime(an, c.b0)
        v1.push({
          layer: 'V1',
          b0: c.b0,
          nb: c.nb,
          clip: clip.id,
          clipName: clip.name,
          style: clip.style,
          box: clip.style === 'VHS' ? '4:3' : 'full',
          kind: c.kind,
          section: s.label,
          ...pk.take(clip, dur),
        })
      }
    }
    items.push(...v1)
    decorate(an, W, items, v1, secs, fmt, o)
    return items
  }

  /** Transitions, accents, ramps, plates, text, music and SFX around V1. */
  function decorate(an, W, items, v1, secs, fmt, o) {
    const P = 60 / an.bpm
    const flashBeats = 2 / o.fps / P
    // style transitions, on section boundaries only
    const bounds = []
    for (let i = 1; i < v1.length; i++)
      if (v1[i].section !== v1[i - 1].section || isSectionStart(secs, v1[i].b0))
        if (secs.some(s => Math.abs(s.b0 - v1[i].b0) < 1e-6))
          bounds.push({ i, prev: v1[i - 1], cur: v1[i] })
    const firstDrop = v1.find(c => c.section === 'drop')
    const order = bounds
      .slice()
      .sort((a, b) => (b.cur === firstDrop) - (a.cur === firstDrop))
    let used = 0
    for (const bd of order) {
      const a = bd.prev.style
      const b = bd.cur.style
      let name = ''
      if (a === 'VHS' && b !== 'VHS') name = 'Tape snap'
      else if (a !== 'VHS' && b === 'VHS') name = 'Tape in'
      else if (b === 'Dreamcore' && a !== 'Dreamcore') name = 'Dream glow'
      else if (a === 'Dreamcore' && b !== 'Dreamcore') name = 'Glow snap'
      if (!name) continue
      if (used >= fmt.maxTransitions) {
        bd.cur.transition = `${name} (hard cut only: ${fmt.name} rule)`
        continue
      }
      used++
      bd.cur.transition = name
      const at = bd.cur.b0
      const plate = (p, b0, nb, opacity) =>
        items.push({
          layer: 'V3',
          plate: p,
          b0,
          nb,
          blend: PLATES[p].blend,
          opacity,
          kind: 'transition',
          note: name,
        })
      if (name === 'Tape snap') plate('VHS tracking', at - 0.25, 0.25, 70)
      if (name === 'Tape in') plate('VHS tracking', at, 0.5, 70)
      if (name === 'Dream glow') plate('Light leak', at - 0.5, 1, 55)
      if (name === 'Glow snap') plate('Light leak', at - 0.5, 0.5, 55)
    }
    // the drop accent + Impact Drop ramp
    if (firstDrop) {
      if (fmt.accent === 'flash')
        items.push({
          layer: 'V3',
          plate: 'White flash',
          b0: firstDrop.b0,
          nb: flashBeats,
          frames: 2,
          blend: 'Normal',
          opacity: 100,
          kind: 'accent',
          note: '2-frame white flash on the drop downbeat',
        })
      if (fmt.accent === 'zoom') firstDrop.accent = 'Zoom punch 110% → 100%'
      if (o.ramps) {
        firstDrop.ramp = 'Impact Drop'
        const k = v1.indexOf(firstDrop)
        if (k > 0 && v1[k - 1].nb >= 1) v1[k - 1].ramp = 'Impact run-in'
      }
    }
    if (o.ramps) {
      for (const bd of bounds)
        if (bd.cur !== firstDrop && !bd.cur.ramp && bd.cur.nb >= 1)
          bd.cur.ramp = 'Whip-Pulse'
      if (fmt.extraRamps)
        for (const c of v1)
          if (
            c.section === 'drop' &&
            !c.ramp &&
            isDown(an, c.b0) &&
            (barOf(an, c.b0).bar - barOf(an, W.b0).bar) % 4 === 0
          )
            c.ramp = 'Whip-Pulse'
    }
    // continuous plates: grain everywhere, tracking over VHS runs, leak over Dreamcore
    items.push({
      layer: 'V3',
      plate: 'Grain',
      b0: W.b0,
      nb: W.b1 - W.b0,
      blend: 'Overlay',
      opacity: 20,
      kind: 'bed',
      note:
        fmt.id === 'night'
          ? 'or Effects › Grain 20 (runbook)'
          : 'Forge grain plate',
    })
    for (const [style, p] of [
      ['VHS', 'VHS tracking'],
      ['Dreamcore', 'Light leak'],
    ]) {
      let run = null
      for (const c of v1.concat([{ style: '', b0: W.b1 }])) {
        if (c.style === style) {
          if (!run) run = { b0: c.b0, b1: c.b0 + c.nb }
          else run.b1 = c.b0 + c.nb
        } else if (run) {
          items.push({
            layer: 'V3',
            plate: p,
            b0: run.b0,
            nb: run.b1 - run.b0,
            blend: PLATES[p].blend,
            opacity: PLATES[p].opacity,
            kind: 'bed',
            note: `over the ${style} run`,
          })
          run = null
        }
      }
    }
    // T1 text
    const beatsFor = s => Math.max(1, Math.round(s / P))
    const text = (b0, nb, t, style) =>
      items.push({ layer: 'T1', b0, nb, text: t, style, kind: 'text' })
    if (fmt.text === 'lime')
      text(W.b0, beatsFor(3), 'your two lines\nlowercase', 'lime')
    if (fmt.text === 'hook') {
      text(W.b0, beatsFor(2), 'your hook here', 'hook')
      text(W.b1 - beatsFor(1.5), beatsFor(1.5), 'rating x/10', 'rating')
    }
    if (fmt.text === 'editorial') {
      text(W.b0, Math.min(8, W.b1 - W.b0), 'episode title', 'editorial')
      if (firstDrop) text(firstDrop.b0, 8, 'day 00 · your number', 'mono')
    }
    if (fmt.text === 'mono')
      for (const s of secs)
        if (s.label === 'drop')
          for (let b = s.b0; b + 4 <= s.b1; b += 16)
            text(b, 8, 'trial 00 · temp · time', 'mono')
    // A1 music
    items.push({
      layer: 'A1',
      b0: W.b0,
      nb: W.b1 - W.b0,
      volume: fmt.music,
      fadeOut: r3(Math.min(2, 4 * P)),
      kind: 'music',
      note: fmt.musicNote,
    })
    // A2 SFX, on transients near the big moments
    if (!fmt.sfx) return
    const vol = fmt.sfxVol
    const sfx = (b0, nb, name, note) =>
      items.push({
        layer: 'A2',
        b0,
        nb,
        sfx: name,
        volume: vol,
        kind: 'sfx',
        note,
      })
    if (firstDrop) {
      const b = snapToTransient(an, firstDrop.b0, 0.25)
      sfx(b, 1, 'impact', 'on the drop transient')
      if (fmt.id !== 'market' && firstDrop.b0 - 4 >= W.b0)
        sfx(firstDrop.b0 - 4, 4, 'riser', 'last bar of the build')
    }
    let whoosh = 0
    for (const bd of bounds) {
      if (bd.cur === firstDrop || !bd.cur.ramp) continue
      if (fmt.id === 'market' && whoosh >= 2) break
      whoosh++
      sfx(bd.cur.b0 - 0.5, 0.5, 'whoosh', 'under the Whip-Pulse')
    }
    if (fmt.id === 'rnd') {
      const ticks = an.transients
        .filter(t => t.kind !== 'kick')
        .map(t => ({ ...t, b: beatIndexAt(an, t.t) }))
        .filter(t =>
          secs.some(s => s.label === 'drop' && t.b >= s.b0 + 1 && t.b < s.b1),
        )
        .sort((a, b) => b.s - a.s)
        .slice(0, 6)
      for (const t of ticks) sfx(r3(t.b), 0.25, 'tick', `transient ${t.kind}`)
    }
  }

  const isSectionStart = (secs, b) => secs.some(s => Math.abs(s.b0 - b) < 1e-6)

  /** Fractional global beat index for a song time. */
  function beatIndexAt(an, t) {
    const B = an.beats
    if (B.length < 2) return t / (60 / an.bpm)
    if (t <= B[0]) return (t - B[0]) / (B[1] - B[0])
    let lo = 0
    let hi = B.length - 1
    if (t >= B[hi]) return hi + (t - B[hi]) / (B[hi] - B[hi - 1])
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1
      if (B[m] <= t) lo = m
      else hi = m
    }
    return lo + (t - B[lo]) / (B[lo + 1] - B[lo])
  }

  function snapToTransient(an, b, within) {
    let best = null
    for (const t of an.transients) {
      const bi = beatIndexAt(an, t.t)
      if (Math.abs(bi - b) <= within && (!best || t.s > best.s))
        best = { ...t, bi }
    }
    return best ? r3(best.bi) : b
  }

  /** Beat-domain items → timed plan (seconds, frames, beats, bars). */
  function finish(an, W, raw, clips, fmt, o, source, notes) {
    const fps = o.fps
    const t0 = beatTime(an, W.b0)
    const T = b => beatTime(an, b) - t0
    const duration = T(W.b1)
    const layers = {}
    for (const L of LAYERS) layers[L] = []
    raw.forEach((r, k) => {
      const s = Math.max(0, T(r.b0))
      const sF = Math.round(s * fps)
      const eF = r.frames
        ? sF + r.frames
        : Math.min(Math.round(duration * fps), Math.round(T(r.b0 + r.nb) * fps))
      const e = r.frames
        ? s + r.frames / fps
        : Math.min(duration, T(r.b0 + r.nb))
      if (eF <= sF) return
      layers[r.layer].push({
        ...r,
        id: `${r.layer}-${k}`,
        start: r3(s),
        end: r3(e),
        startFrame: sF,
        endFrame: eF,
        frames: eF - sF,
        beat: r3(r.b0 - W.b0 + 1),
        beats: r3(r.nb),
        bar: barLabel(an, r.b0),
        tcIn: tc(s, fps),
        tcOut: tc(e, fps),
      })
    })
    for (const L of LAYERS) layers[L].sort((a, b) => a.start - b.start)
    // lanes for overlapping V3 plates (each lane = one CapCut overlay track)
    const ends = []
    for (const it of layers.V3) {
      let lane = ends.findIndex(e => e <= it.startFrame)
      if (lane < 0) lane = ends.length
      ends[lane] = it.endFrame
      it.lane = lane
    }
    const cutAt = new Set(layers.V1.map(c => c.startFrame))
    const markers = []
    for (let b = W.b0; b <= W.b1; b++) {
      const t = T(b)
      const f = Math.round(t * fps)
      const sec = an.sections.find(s => b >= s.startBeat && b < s.endBeat)
      markers.push({
        n: b - W.b0 + 1,
        t: r3(t),
        song: r3(t + t0),
        frame: f,
        tc: tc(t, fps),
        bar: barLabel(an, b),
        down: isDown(an, b),
        cut: cutAt.has(f),
        section: sec ? sec.label : '',
      })
    }
    const cutMarks = layers.V1.slice(1).map(c => ({
      t: c.start,
      frame: c.startFrame,
      tc: c.tcIn,
      bar: c.bar,
      onBeat: Number.isInteger(c.b0),
    }))
    const sections = an.sections
      .filter(s => s.endBeat > W.b0 && s.startBeat < W.b1)
      .map(s => {
        const b0 = Math.max(s.startBeat, W.b0)
        const b1 = Math.min(s.endBeat, W.b1)
        return {
          label: s.label,
          start: r3(T(b0)),
          end: r3(T(b1)),
          tcIn: tc(T(b0), fps),
          bars: `${barOf(an, b0).bar}–${barOf(an, b1).bar - 1}`,
        }
      })
    const drop = layers.V1.find(c => c.section === 'drop')
    const warnings = []
    if (!clips.some(c => c.style === '4K Lunar'))
      warnings.push('No 4K Lunar clip: the drop falls back to another style.')
    if (o.pace === 'beat' && fmt.house)
      warnings.push(
        `Beat vocabulary is faster than the ${fmt.name} house rule (${fmt.house.text}). Switch Pace to House to follow it.`,
      )
    for (const c of layers.V1)
      if (c.note && !warnings.includes(`${c.clipName}: ${c.note}`))
        warnings.push(`${c.clipName}: ${c.note}`)
    const avg = layers.V1.length ? duration / layers.V1.length : 0
    return {
      version: 1,
      source,
      notes: notes || '',
      format: fmt.id,
      formatName: fmt.name,
      aspect: o.aspect,
      fps,
      pace: o.pace,
      ramps: o.ramps,
      bpm: Math.round(an.bpm * 100) / 100,
      track: an.name,
      window: {
        startBeat: W.b0,
        endBeat: W.b1,
        songStart: r3(t0),
        songEnd: r3(t0 + duration),
      },
      duration: r3(duration),
      frames: Math.round(duration * fps),
      clips: clips.map(c => ({
        id: c.id,
        name: c.name,
        style: c.style,
        duration: c.duration,
      })),
      sections,
      layers,
      markers,
      cutMarks,
      stats: {
        cuts: layers.V1.length,
        avgCut: r3(avg),
        drop: drop ? drop.tcIn : null,
        dropStyle: drop ? drop.style : null,
      },
      warnings,
      opts: o,
    }
  }

  /* ============================================================ Fable 5.1 */
  function fablePrompt(an, opts) {
    const fmt = FORMATS[opts.format] || FORMATS.night
    const clips = normClips(opts.clips)
    const o = { ...opts, length: clamp(Number(opts.length) || 30, 6, 180) }
    const W = windowFor(an, o.length, opts.from === 'top' ? 'top' : 'auto')
    const total = W.b1 - W.b0
    const sum = summary(an, 200)
    const rel = b => b - W.b0
    const sections = an.sections
      .filter(s => s.endBeat > W.b0 && s.startBeat < W.b1)
      .map(s => ({
        label: s.label,
        startBeat: Math.max(0, rel(s.startBeat)),
        endBeat: Math.min(total, rel(s.endBeat)),
        start: r3(Math.max(0, beatTime(an, s.startBeat) - beatTime(an, W.b0))),
      }))
    const t0 = beatTime(an, W.b0)
    const transients = sum.transients
      .filter(t => t.t >= t0 && t.t <= beatTime(an, W.b1))
      .map(t => ({
        beat: r3(beatIndexAt(an, t.t) - W.b0),
        t: r3(t.t - t0),
        s: t.s,
        kind: t.kind,
      }))
    const data = {
      bpm: sum.bpm,
      beatPeriod: sum.beatPeriod,
      totalBeats: total,
      downbeatsAt: 'every 4 beats from beat 0',
      sections,
      transients,
      clips: clips.map(c => ({
        name: c.name,
        style: c.style,
        duration: c.duration,
      })),
      format: fmt.name,
      aspect: opts.aspect || '9:16',
      fps: Number(opts.fps) || fmt.fps,
    }
    return `You are planning a multi-layer, beat-synced CapCut edit for Chef Rainbird (@Popé). Pixel 10 Pro XL footage, CapCut Mobile.

FORMAT: ${fmt.name}. House rules: cuts ${fmt.house.text}; sound ${fmt.voice}; music volume ${fmt.musicNote}; SFX ${fmt.sfx ? 'allowed, one per big moment' : 'NONE'}.
STYLES: '4K Lunar' (clean Lunar Night footage), 'VHS' (Hi8/VHS texture, shown in a 4:3 box), 'Dreamcore', 'B-roll'.
CUT VOCABULARY in beats: 4 (hold), 2, 1 (standard), 0.5 (stutter), 0.25 (flash).
SECTION RULES: intro and break use 4- and 2-beat holds in VHS or Dreamcore. build accelerates 2 → 1 → 0.5 and ends on a riser into the drop. drop switches to clean 4K Lunar on its first downbeat (hard cut + a 2-frame white flash or a zoom punch), then 1-beat cuts with occasional 0.5-beat doubles on fills (use the transients). outro uses 4-beat holds. Style transitions only on section boundaries (VHS→4K is the "Tape snap": 4:3 box to full frame on the downbeat). Speed ramps: "Impact Drop" on the first drop downbeat, "Whip-Pulse" between sections.

ANALYSIS (beats are counted from 0 = the first beat of the edit; all startBeat values must be multiples of 0.25 inside 0..${total}):
${JSON.stringify(data)}

Return JSON only, exactly this shape:
{"layers":{
 "V1":[{"startBeat":0,"clip":"<clip name>","style":"4K Lunar|VHS|Dreamcore|B-roll","ramp":"Impact Drop|Whip-Pulse|","transition":"Tape snap|"}],
 "V2":[{"startBeat":0,"beats":0.5,"clip":"<VHS clip name>"}],
 "V3":[{"startBeat":0,"beats":4,"plate":"Grain|VHS tracking|Light leak|White flash","blend":"Screen|Overlay|Soft light|Normal","opacity":40}],
 "T1":[{"startBeat":0,"beats":6,"text":"short lowercase text"}],
 "A2":[{"startBeat":0,"beats":1,"sfx":"impact|riser|whoosh|tick","volume":40}]},
 "notes":"one or two plain sentences on the idea"}
V1 lists cut points in order: each V1 item starts a new cut that runs until the next item's startBeat, and the first V1 item starts at 0. Use only the clip names given.`
  }

  /** Validate Fable's JSON and snap it to the grid. Returns a plan or throws. */
  function fromFable(obj, an, opts) {
    if (!obj || typeof obj !== 'object')
      throw new Error('Fable did not return a JSON object.')
    const L = obj.layers && typeof obj.layers === 'object' ? obj.layers : obj
    if (!Array.isArray(L.V1) || L.V1.length < 2)
      throw new Error('The plan needs at least two V1 cuts.')
    const fmt = FORMATS[opts.format] || FORMATS.night
    const o = {
      format: fmt.id,
      aspect: opts.aspect === '16:9' ? '16:9' : '9:16',
      length: clamp(Number(opts.length) || 30, 6, 180),
      fps: Number(opts.fps) || fmt.fps,
      pace: opts.pace === 'house' ? 'house' : 'beat',
      ramps: opts.ramps == null ? fmt.ramps : !!opts.ramps,
      from: opts.from === 'top' ? 'top' : 'auto',
    }
    const clips = normClips(opts.clips)
    const W = windowFor(an, o.length, o.from)
    const total = W.b1 - W.b0
    const pk = makePicker(an, clips)
    const fixes = []
    const q = v => clamp(Math.round(Number(v) * 4) / 4, 0, total)
    const num = v => Number.isFinite(Number(v))
    const findClip = (name, style) => {
      const n = String(name || '').toLowerCase()
      const c = clips.find(x => x.name.toLowerCase() === n || x.id === n)
      if (c) return c
      fixes.push(`unknown clip "${String(name).slice(0, 40)}"`)
      return pk.pick(STYLES.includes(style) ? style : clips[0].style)
    }
    const secAt = b =>
      (
        an.sections.find(
          s => W.b0 + b >= s.startBeat && W.b0 + b < s.endBeat,
        ) || {}
      ).label || ''
    // V1: cut points
    const pts = []
    for (const it of L.V1) {
      if (!it || !num(it.startBeat)) {
        fixes.push('dropped a V1 item without startBeat')
        continue
      }
      const b = q(it.startBeat)
      if (Number(it.startBeat) !== b) fixes.push('snapped a cut to the grid')
      if (b >= total || pts.some(p => p.b === b)) continue
      pts.push({ b, it })
    }
    pts.sort((a, b) => a.b - b.b)
    if (!pts.length) throw new Error('No usable V1 cuts.')
    if (pts[0].b !== 0) {
      fixes.push('first cut moved to beat 0')
      pts[0].b = 0
    }
    const items = []
    const v1 = []
    pts.forEach((p, i) => {
      const end = i + 1 < pts.length ? pts[i + 1].b : total
      const clip = findClip(p.it.clip, p.it.style)
      const dur = beatTime(an, W.b0 + end) - beatTime(an, W.b0 + p.b)
      const c = {
        layer: 'V1',
        b0: W.b0 + p.b,
        nb: end - p.b,
        clip: clip.id,
        clipName: clip.name,
        style: clip.style,
        box: clip.style === 'VHS' ? '4:3' : 'full',
        kind: 'fable',
        section: secAt(p.b),
        ...pk.take(clip, dur),
      }
      if (RAMPS[p.it.ramp]) c.ramp = p.it.ramp
      if (typeof p.it.transition === 'string' && p.it.transition)
        c.transition = p.it.transition.slice(0, 40)
      v1.push(c)
    })
    items.push(...v1)
    const span = (it, layer) => {
      if (!it || !num(it.startBeat)) return null
      const b = q(it.startBeat)
      const nb = clamp(
        Math.round(Number(it.beats || 1) * 4) / 4,
        0.25,
        total - b,
      )
      return b < total && nb > 0 ? { layer, b0: W.b0 + b, nb } : null
    }
    for (const it of Array.isArray(L.V2) ? L.V2 : []) {
      const s = span(it, 'V2')
      if (!s) continue
      const clip = findClip(it.clip, 'VHS')
      const dur = beatTime(an, s.b0 + s.nb) - beatTime(an, s.b0)
      items.push({
        ...s,
        clip: clip.id,
        clipName: clip.name,
        style: clip.style,
        box: '4:3',
        blend: 'Normal',
        opacity: 100,
        kind: 'insert',
        ...pk.take(clip, dur),
      })
    }
    for (const it of Array.isArray(L.V3) ? L.V3 : []) {
      const s = span(it, 'V3')
      const name = Object.keys(PLATES).find(
        k => k.toLowerCase() === String(it && it.plate).toLowerCase(),
      )
      if (!s || !name) {
        fixes.push('dropped an unknown plate')
        continue
      }
      const blend = [
        'Normal',
        'Screen',
        'Overlay',
        'Soft light',
        'Lighten',
        'Multiply',
      ].includes(it.blend)
        ? it.blend
        : PLATES[name].blend
      const pl = {
        ...s,
        plate: name,
        blend,
        opacity: clamp(
          Math.round(Number(it.opacity) || PLATES[name].opacity),
          0,
          100,
        ),
        kind: 'fable',
      }
      if (name === 'White flash') {
        pl.frames = 2
        pl.nb = 2 / o.fps / (60 / an.bpm)
      }
      items.push(pl)
    }
    for (const it of Array.isArray(L.T1) ? L.T1 : []) {
      const s = span(it, 'T1')
      if (!s || typeof it.text !== 'string') continue
      items.push({
        ...s,
        text: it.text.replace(/[<>]/g, '').slice(0, 80),
        style:
          fmt.text === 'lime' ? 'lime' : fmt.text === 'hook' ? 'hook' : 'mono',
        kind: 'text',
      })
    }
    const A2 = Array.isArray(L.A2) ? L.A2 : []
    if (!fmt.sfx && A2.length) fixes.push(`removed SFX (${fmt.name}: no SFX)`)
    if (fmt.sfx)
      for (const it of A2) {
        const s = span(it, 'A2')
        if (!s) continue
        items.push({
          ...s,
          sfx: String(it.sfx || 'hit').slice(0, 24),
          volume:
            fmt.id === 'market'
              ? clamp(Number(it.volume) || 45, 30, 60)
              : clamp(Number(it.volume) || fmt.sfxVol, 0, 100),
          kind: 'sfx',
        })
      }
    items.push({
      layer: 'A1',
      b0: W.b0,
      nb: total,
      volume: fmt.music,
      fadeOut: r3(Math.min(2, (4 * 60) / an.bpm)),
      kind: 'music',
      note: fmt.musicNote,
    })
    const notes =
      `${typeof obj.notes === 'string' ? obj.notes.slice(0, 300) : ''}${
        fixes.length
          ? ` (validator: ${Array.from(new Set(fixes)).slice(0, 6).join('; ')})`
          : ''
      }`.trim()
    return finish(an, W, items, clips, fmt, o, 'fable', notes)
  }

  /* ============================================================ build sheet */
  const secs2 = s => `${Number(s).toFixed(2)} s`
  const step = (doIt, see, extra = {}) => ({ do: doIt, see, ...extra })

  function whatOf(it) {
    if (it.layer === 'V1' || it.layer === 'V2')
      return `${it.clipName} from ${secs2(it.inPoint)}${it.speed !== 1 ? ` at ${it.speed}x` : ''}`
    if (it.layer === 'V3') return `${it.plate} plate`
    if (it.layer === 'T1') return it.text.replace(/\n/g, ' / ')
    if (it.layer === 'A1') return 'music'
    return `${it.sfx} SFX`
  }
  function lookOf(it) {
    if (it.layer === 'V1' || it.layer === 'V2')
      return `${it.style}${it.box === '4:3' ? ' · 4:3 box' : ''}`
    if (it.layer === 'V3') return `${it.blend} ${it.opacity}%`
    if (it.layer === 'T1') return it.style
    return `volume ${it.volume}`
  }
  function notesOf(it) {
    return [
      it.transition,
      it.ramp ? `ramp: ${it.ramp}` : '',
      it.accent,
      it.note,
      it.layer === 'A1' ? `fade out ${it.fadeOut} s` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }
  function layerRows(plan, layer) {
    return plan.layers[layer].map((it, i) => [
      String(i + 1).padStart(2, '0'),
      it.tcIn,
      it.tcOut,
      String(it.frames),
      String(it.beat),
      it.bar,
      whatOf(it),
      lookOf(it),
      notesOf(it),
    ])
  }
  const ROW_HEAD = [
    '#',
    'In',
    'Out',
    'Frames',
    'Beat',
    'Bar',
    'What',
    'Look',
    'Notes',
  ]

  function sheetModel(plan, mode) {
    const fmt = FORMATS[plan.format]
    const L = plan.layers
    const tall = plan.aspect === '9:16'
    const box = tall
      ? 'a 4:3 box 1080 × 810 px, centred (black bars above and below)'
      : 'a 4:3 box 1440 × 1080 px, centred (pillarbox: black bars left and right)'
    const first = L.V1[0]
    const marks = plan.cutMarks
    const groups = []
    const g = (title, steps, verify) => groups.push({ title, steps, verify })
    const ramps = L.V1.filter(c => c.ramp)
    const vhsV1 = L.V1.filter(c => c.box === '4:3')
    const overlays = L.V2.concat(L.V3)
    const accentZoom = L.V1.find(c => c.accent)
    const songIn = plan.window.songStart
    if (mode === 'desktop') {
      g('Start the project', [
        step('Open CapCut on the computer.', 'The home screen.'),
        step('Click Create project.', 'An empty editor.'),
        step('Click Import.', 'A file window.'),
        step(
          `Select the song and every clip in the V1/V2 tables, then click Open.`,
          'Thumbnails in the Media panel.',
        ),
        step('Click Ratio under the player.', 'A list of ratios.', {
          verify: true,
        }),
        step(
          `Click ${plan.aspect}.`,
          `The player turns ${tall ? 'tall' : 'wide'}.`,
        ),
      ])
      g(
        'Music and beat marks',
        [
          step(
            'Drag the song onto the timeline, under the main track.',
            'A green audio track starting at 0.',
          ),
          ...(songIn > 0.05
            ? [
                step(
                  `Click the timecode and move the playhead to ${secs2(songIn)}.`,
                  'The playhead at the song in-point.',
                ),
                step(
                  'Press Ctrl+B (Cmd+B on a Mac) to split.',
                  'A cut in the music.',
                  {
                    verify: true,
                  },
                ),
                step(
                  'Click the left piece and press Delete.',
                  'A gap before the music.',
                ),
                step(
                  'Drag the music to 0.',
                  'The music starts at 00:00:00:00.',
                ),
              ]
            : []),
          step('Select the music track.', 'A white outline on it.'),
          step(
            'Click the Beat (Auto beat) button above the timeline, or move the playhead to each mark below and press M to add a marker.',
            'Markers or yellow beat dots along the music.',
            { verify: true },
          ),
          step(
            'Check three marks against the list (00:00:SS:FF).',
            'Each mark sits within one frame of the list.',
          ),
        ],
        true,
      )
      g('Split on the marks and place V1', [
        step(
          `Drag ${first ? first.clipName : 'the first clip'} onto the main track.`,
          'It starts at 0.',
        ),
        step(
          'Add clips to the main track until it runs past the end of the music.',
          `The main track is longer than ${secs2(plan.duration)}.`,
        ),
        step(
          'Move the playhead to mark 1 and press Ctrl+B. Repeat for every mark.',
          `${marks.length} cuts, each on a marker.`,
          { verify: true },
        ),
        step(
          `Delete everything after ${plan.layers.V1.length ? L.V1[L.V1.length - 1].tcOut : 'the end'}.`,
          'The video ends where the music ends.',
        ),
        step(
          'Right-click segment 1 › Replace clip, pick its clip, slide to its In point (V1 table).',
          'The segment shows the new clip at the same length.',
          { verify: true },
        ),
        step(
          'Repeat Replace for every V1 row.',
          `${L.V1.length} segments, in table order.`,
        ),
      ])
      g(
        'Overlays, blend and masks',
        [
          step(
            'Drag each V2 and V3 row onto a track above the main track, at its In time.',
            'Overlay tracks above the main track.',
          ),
          step(
            'Drag each overlay’s right edge to its Out time.',
            'Its end on the marker.',
          ),
          step(
            'Select an overlay › Video › Basic › Blend: pick the mode from its row, then set Opacity.',
            'The plate blends into the picture.',
            { verify: true },
          ),
          step(
            `For each 4:3 row: Video › Mask › Rectangle, sized to ${box}.`,
            'The VHS picture sits in a 4:3 box over black.',
            { verify: true },
          ),
        ],
        true,
      )
      if (ramps.length)
        g(
          'Speed ramps',
          [
            step(
              'Select a row with a ramp › Speed › Curve › Custom.',
              'A speed graph with nodes.',
              { verify: true },
            ),
            step(
              'Set the nodes as listed under Speed ramps.',
              'The curve matches the row.',
            ),
            step(
              'Trim the segment back to its next marker (the curve changes its length).',
              'The segment ends on the marker again.',
            ),
          ],
          true,
        )
      g(
        'Look, text, sound, export',
        [
          step(
            'Select the 4K rows › Adjustment › LUT › Import, and load LunarNight_v2_Violet.cube at 50–70%.',
            'The 4K rows turn to the Lunar Night look.',
            { verify: true },
          ),
          step(
            'Text › Default text for each T1 row, then style it as listed.',
            'The text on the player.',
          ),
          ...(fmt.sfx
            ? [
                step(
                  'Audio › Sound effects: add each A2 row at its In time and set its volume.',
                  'Short clips on an audio track.',
                ),
              ]
            : [
                step(
                  `No SFX: ${fmt.name} is music-led.`,
                  'Only the music track.',
                ),
              ]),
          step(
            `Select the music and set Volume to ${fmt.music}.`,
            'The level in the inspector.',
          ),
          step('Click Export (top right).', 'The export window.'),
          step(
            `Set 1080p, ${plan.fps} fps, bit rate Higher, H.264.`,
            'The settings in the window.',
            { verify: true },
          ),
          step('Click Export.', 'A progress bar, then the finished file.'),
        ],
        true,
      )
      return groups
    }
    // ---- CapCut Mobile (Android)
    g('Start the project', [
      step('Open CapCut.', 'The home screen with New project.'),
      step('Tap New project.', 'Your camera roll.'),
      step(
        `Tap ${first ? first.clipName : 'your first clip'}.`,
        'A number 1 on its thumbnail.',
      ),
      step('Tap Add.', 'The editor, with the clip on the main track.'),
      step(
        'Tap an empty spot on the timeline.',
        'The main toolbar along the bottom.',
      ),
      step(
        'Tap Aspect ratio (older builds: Ratio or Format).',
        'A row of ratios.',
        {
          path: ['Aspect ratio'],
        },
      ),
      step(
        `Tap ${plan.aspect}.`,
        `The preview turns ${tall ? 'tall' : 'wide'}.`,
      ),
      step('Tap the back arrow.', 'The main toolbar again.'),
    ])
    const music = [
      step(
        'Swipe the timeline right to the very start.',
        'The timer reads 00:00.',
      ),
      step('Tap Audio.', 'Sounds, Extracted, Sound effects and Record.', {
        path: ['Audio'],
      }),
      step('Tap Sounds.', 'The sound library.', { path: ['Audio', 'Sounds'] }),
      step(
        'Tap the tab for files on your phone (Your sounds or From device).',
        'The audio files on your phone.',
        { verify: true },
      ),
      step(`Tap ${plan.track}.`, 'It starts to play.'),
      step('Tap the + (Use) next to it.', 'A music track under the video.'),
    ]
    if (songIn > 0.05)
      music.push(
        step('Tap the music track.', 'A white border on it.'),
        step(
          `Drag the timeline until the timer reads ${secs2(songIn)}.`,
          'The playhead at the song in-point.',
        ),
        step('Tap Split.', 'The music splits at the playhead.', {
          path: ['Split'],
        }),
        step('Tap the left piece.', 'Only the left piece has the border.'),
        step('Tap Delete.', 'A gap before the music.', { path: ['Delete'] }),
        step(
          'Long-press the music and drag it to 00:00.',
          'The music starts at 00:00.',
        ),
      )
    music.push(
      step('Tap the music track.', 'A white border on it.'),
      step('Tap Volume.', 'A slider, 100 = original level.', {
        path: ['Volume'],
      }),
      step(
        `Drag it to ${fmt.music}.`,
        `The slider reads ${fmt.music} (${fmt.musicNote}).`,
      ),
      step('Tap the tick.', 'The music toolbar again.'),
      step('Tap Fades.', 'Fade in and Fade out sliders.', { path: ['Fades'] }),
      step(
        `Set Fade out to ${secs2(L.A1[0] ? L.A1[0].fadeOut : 1)}.`,
        'The slider reads that length.',
      ),
      step('Tap the tick.', 'The music toolbar again.'),
    )
    g('Add the music', music, true)
    g(
      'Beat marks',
      [
        step('Tap the music track.', 'A white border on it.'),
        step(
          'Tap Beats (older builds: Match cut).',
          'Auto generate and + Add beat.',
          {
            path: ['Beats'],
            verify: true,
          },
        ),
        step(
          'Exact way: drag the timeline to the first time in the cut-mark list.',
          'The timer reads that time.',
        ),
        step('Tap + Add beat.', 'A yellow dot under the playhead.'),
        step(
          `Repeat the last two lines for every cut mark (${marks.length} marks).`,
          'One yellow dot per mark.',
        ),
        step(
          'Fast way instead: tap Auto generate, then Beats I (the label varies).',
          'Yellow dots along the music.',
          { verify: true },
        ),
        step(
          'Check three dots against the list.',
          'Each dot within one frame of the list. If they drift, use the exact way.',
        ),
        step('Tap the tick.', 'The main toolbar.'),
      ],
      true,
    )
    g('Split on the marks', [
      step(
        'Tap the + at the right end of the main track.',
        'Your camera roll.',
      ),
      step(
        'Add clips until the main track runs past the end of the music.',
        `The main track is longer than ${secs2(plan.duration)}.`,
      ),
      step(
        'Drag the timeline until the playhead sits on the first yellow dot.',
        'The playhead on the dot.',
      ),
      step('Tap the main track.', 'A white border on the clip.'),
      step('Tap Split.', 'A cut line on the yellow dot.', { path: ['Split'] }),
      step(
        `Repeat the last three lines for every yellow dot (${marks.length}).`,
        `${L.V1.length} segments on the main track.`,
      ),
      step(
        `Tap the piece after ${secs2(plan.duration)}.`,
        'A white border on it.',
      ),
      step('Tap Delete.', 'The video ends where the music ends.', {
        path: ['Delete'],
      }),
    ])
    g(
      'Place the V1 clips',
      [
        step('Tap segment 1.', 'A white border on it.'),
        step('Tap Replace.', 'Your camera roll.', {
          path: ['Replace'],
          verify: true,
        }),
        step(
          `Tap ${first ? first.clipName : 'the row’s clip'}.`,
          'A frame window over the clip.',
        ),
        step(
          `Slide the window so it starts at ${first ? secs2(first.inPoint) : 'the In point'}.`,
          'The window sits on the right part of the clip.',
        ),
        step('Tap Confirm.', 'Segment 1 shows the clip, same length.'),
        step(
          `Repeat the last five lines for every V1 row (${L.V1.length} rows).`,
          'The main track matches the V1 table.',
        ),
        ...(vhsV1.length
          ? [
              step(
                'For a 4:3 VHS clip: tap an empty spot, then Background.',
                'Color, Style and Blur.',
                { path: ['Background'] },
              ),
              step(
                'Tap Color, then black.',
                'Black bars around the 4:3 picture.',
                {
                  path: ['Background', 'Color'],
                },
              ),
              step(
                'For a 9:16 phone clip in a VHS row: tap the segment, then Mask.',
                'None, Split, Filmstrip, Circle, Rectangle…',
                { path: ['Mask'], verify: true },
              ),
              step(
                `Tap Rectangle and drag it to ${box}.`,
                'The picture inside a 4:3 box over black.',
              ),
            ]
          : []),
      ],
      true,
    )
    if (overlays.length)
      g(
        'Overlays: V2 inserts and V3 plates',
        [
          step(
            'Drag the timeline to the row’s In time.',
            'The timer reads the In time.',
          ),
          step('Tap an empty spot on the timeline.', 'The main toolbar.'),
          step('Tap Overlay.', 'Add overlay.', { path: ['Overlay'] }),
          step('Tap Add overlay.', 'Your camera roll.', {
            path: ['Overlay', 'Add overlay'],
          }),
          step(
            'Tap the row’s clip or plate, then Add.',
            'A new overlay track under the main track.',
          ),
          step(
            'Pinch the preview to size it.',
            'V2 inserts: a 4:3 box, 80% of the width. Plates: full frame.',
          ),
          step(
            'Drag its right edge to the row’s Out time.',
            'Its end lines up with the yellow dot.',
          ),
          step('Tap Blend.', 'Mode tiles and an Opacity slider.', {
            path: ['Blend'],
            verify: true,
          }),
          step(
            'Tap the mode in the row’s Look column.',
            'The plate blends into the picture.',
          ),
          step(
            'Drag Opacity to the row’s number.',
            'The slider reads that number.',
          ),
          step('Tap the tick.', 'The overlay toolbar.'),
          step(
            `Repeat for every V2 and V3 row (${overlays.length} rows).`,
            'One overlay per row.',
          ),
        ],
        true,
      )
    if (ramps.length)
      g(
        'Speed ramps',
        [
          step('Tap the segment with a ramp.', 'A white border on it.'),
          step('Tap Speed.', 'Normal and Curve.', { path: ['Speed'] }),
          step('Tap Curve.', 'Presets: None, Custom, Montage, Hero, Bullet…', {
            path: ['Speed', 'Curve'],
          }),
          step('Tap Custom.', 'Custom is applied.'),
          step('Tap Custom again (Edit).', 'A graph with about five nodes.'),
          step(
            'Drag each node to the speed listed under Speed ramps.',
            'The curve matches.',
          ),
          step('Tap the tick.', 'The clip is a new length.'),
          step(
            'Drag the segment’s right edge back to its yellow dot.',
            'The segment ends on the mark again.',
          ),
          step(
            `Repeat for every ramp (${ramps.length}).`,
            'Every ramp row done.',
          ),
        ],
        true,
      )
    if (accentZoom)
      g('Zoom punch on the drop', [
        step(
          `Drag the timeline to ${accentZoom.tcIn}.`,
          'The playhead on the drop downbeat.',
        ),
        step('Tap the drop segment.', 'A white border on it.'),
        step('Tap the diamond (keyframe).', 'A diamond on the segment.'),
        step('Pinch the preview out to 110%.', 'The picture slightly bigger.'),
        step(
          `Move the playhead ${Math.max(2, Math.round((30 / plan.bpm) * plan.fps))} frames right.`,
          'Half a beat later.',
        ),
        step('Pinch back to 100%.', 'A second diamond appears.'),
      ])
    g('Text', [
      step(
        'Drag the timeline to the T1 row’s In time.',
        'The timer reads the In time.',
      ),
      step('Tap Text.', 'Add text.', { path: ['Text'] }),
      step('Tap Add text.', 'A keyboard and a text box.', {
        path: ['Text', 'Add text'],
      }),
      step(
        'Type the row’s text (your words, lowercase).',
        'The text on the preview.',
      ),
      step(textStyleLine(fmt), 'The text styled.'),
      step(
        'Drag the text bar’s right edge to the Out time.',
        'The text bar ends at the Out time.',
      ),
    ])
    if (fmt.sfx)
      g('SFX', [
        step(
          'Drag the timeline to the A2 row’s In time.',
          'The timer reads it.',
        ),
        step('Tap Audio.', 'Sounds, Extracted, Sound effects.', {
          path: ['Audio'],
        }),
        step('Tap Sound effects.', 'A search box.', {
          path: ['Audio', 'Sound effects'],
        }),
        step(
          'Search the row’s SFX name (impact, riser, whoosh, tick).',
          'A list of sounds.',
        ),
        step(
          'Tap the + next to one without a Pro badge.',
          'A short clip on an audio track.',
        ),
        step(
          'Tap it, then Volume, and set the row’s number.',
          'The slider reads it.',
        ),
        step(
          `Repeat for every A2 row (${L.A2.length}).`,
          'One SFX per big moment.',
        ),
      ])
    else
      g('SFX', [
        step(
          `Skip SFX: a ${fmt.name} is music-led, no SFX.`,
          'Only the music under the picture.',
        ),
      ])
    g('Export', [
      step(
        'Tap the resolution chip at the top right (1080P ▾).',
        'Resolution, Frame rate and Code rate.',
      ),
      step('Tap 1080p.', '1080p is highlighted.'),
      step(`Tap ${plan.fps}.`, `${plan.fps} is highlighted.`),
      step(
        'Tap Higher under Code rate (or Bit rate).',
        'Higher is highlighted.',
      ),
      step('Tap Export.', 'A progress screen, then Done.'),
    ])
    return groups
  }

  function textStyleLine(fmt) {
    if (fmt.text === 'lime')
      return 'Font: a condensed sans (Oswald, Antonio or Estrella Early); colour lime #D6DB05; small black shadow; no box, outline or animation; upper third.'
    if (fmt.text === 'hook')
      return 'Hook card: white box, black Inter Bold, lowercase, 8 words max, below the top safe band, no animation. Rating card: hold 1.5 s at the end.'
    if (fmt.text === 'editorial')
      return 'Editorial serif for titles, mono for data lines; keep the top 130 px, right 140 px and bottom 484 px clear.'
    return 'Mono data card (Space Grotesk / IBM Plex Mono pairing or Space Mono); no animation; inside the safe zone.'
  }

  function rampLines(plan) {
    return plan.layers.V1.filter(c => c.ramp).map(
      c => `${c.tcIn} ${c.clipName}: ${c.ramp}: ${RAMPS[c.ramp].how}`,
    )
  }

  function sheetText(plan, mode, md) {
    const fmt = FORMATS[plan.format]
    const out = []
    const h = (lvl, t) =>
      out.push(md ? `${'#'.repeat(lvl)} ${t}` : t.toUpperCase())
    const line = t => out.push(t)
    h(1, `Music Edit build sheet: ${plan.track}`)
    line('')
    line(
      `${plan.formatName} · ${plan.aspect} · ${plan.fps} fps · ${plan.bpm} BPM · ${secs2(plan.duration)} (${plan.frames} frames) · ${plan.stats.cuts} cuts · plan by ${plan.source === 'fable' ? 'Fable 5.1 (validated)' : 'the rules engine'}`,
    )
    line(
      `Song in-point ${secs2(plan.window.songStart)} → out ${secs2(plan.window.songEnd)}. Drop at ${plan.stats.drop || 'n/a'}.`,
    )
    line(`House rules: ${fmt.house.text}; ${fmt.voice}.`)
    if (plan.notes) line(`Notes: ${plan.notes}`)
    for (const w of plan.warnings) line(`! ${w}`)
    line('')
    h(2, 'Sections')
    for (const s of plan.sections)
      line(
        `- ${s.label} ${s.tcIn} (${secs2(s.start)}–${secs2(s.end)}), bars ${s.bars}`,
      )
    line('')
    for (const layer of LAYERS) {
      const rows = layerRows(plan, layer)
      if (!rows.length) continue
      h(2, `${LAYER_NAME[layer]} (${rows.length})`)
      if (md) {
        line(`| ${ROW_HEAD.join(' | ')} |`)
        line(`|${ROW_HEAD.map(() => '---').join('|')}|`)
        for (const r of rows)
          line(`| ${r.map(c => String(c).replace(/\|/g, '/')).join(' | ')} |`)
      } else for (const r of rows) line(r.filter(Boolean).join('  '))
      line('')
    }
    h(2, `Cut marks (${plan.cutMarks.length})`)
    for (const [i, m] of plan.cutMarks.entries())
      line(
        `${md ? '- ' : ''}${String(i + 1).padStart(2, '0')}  ${m.tc}  ${secs2(m.t)}  bar ${m.bar}${m.onBeat ? '' : '  (between beats)'}`,
      )
    line('')
    const rl = rampLines(plan)
    if (rl.length) {
      h(2, 'Speed ramps (Speed › Curve › Custom)')
      for (const r of rl) line(`${md ? '- ' : ''}${r}`)
      line('')
    }
    h(
      2,
      mode === 'desktop'
        ? 'CapCut Desktop, step by step'
        : 'CapCut Mobile, step by step',
    )
    let n = 0
    for (const g of sheetModel(plan, mode)) {
      h(3, g.title)
      for (const s of g.steps) {
        n++
        line(
          `${md ? `${n}. ` : `${String(n).padStart(2, '0')}  `}${s.do}${s.path ? ` [${s.path.join(' › ')}]` : ''}${s.verify ? ' (verify on your device)' : ''}`,
        )
        line(`${md ? '   ' : '    '}You should see: ${s.see}`)
      }
      line('')
    }
    h(2, 'Look routes for the 4K rows')
    line(
      `${md ? '- ' : ''}Route A: LUT import, if your phone has it (unverified on mobile; desktop has Adjustment › LUT › Import). Check: Adjust › look for a LUT tile, 60 seconds.`,
    )
    line(
      `${md ? '- ' : ''}Route B: bake it. Blackmagic Camera Record LUT to Clip, or the OS Bake in Grade.`,
    )
    line(
      `${md ? '- ' : ''}Route C: sliders. Exposure −15, Contrast +25, Shadows −40, Highlights −10, Saturation +15, Temperature −30, Tint +15, Fade 0, Vignette +10, then Apply to all.`,
    )
    line('')
    line(
      'Paths marked (verify on your device) come from unverified research; labels vary between CapCut builds.',
    )
    return out.join('\n')
  }

  function markersText(plan) {
    const head = `# Lunar Night OS beat marks: ${plan.track}\n# ${plan.bpm} BPM · ${plan.fps} fps · timeline 0 = song ${secs2(plan.window.songStart)} · CUT = a V1 cut lands here\n# n    timecode     seconds   bar.beat  flags`
    const rows = plan.markers.map(
      m =>
        `${String(m.n).padStart(3, '0')}  ${m.tc}  ${m.t.toFixed(3).padStart(8)}  ${m.bar.padEnd(8)}  ${[m.down ? 'DOWN' : '', m.cut ? 'CUT' : '', m.section].filter(Boolean).join(' ')}`,
    )
    const between = plan.cutMarks.filter(c => !c.onBeat)
    const extra = between.length
      ? `\n# cuts between beats (stutters and flashes)\n${between.map(c => `---  ${c.tc}  ${c.t.toFixed(3).padStart(8)}  ${c.bar}`).join('\n')}`
      : ''
    return `${head}\n${rows.join('\n')}${extra}\n`
  }
  function markersCsv(plan) {
    const rows = [
      'n,timeline_s,timecode,frame,song_s,bar_beat,downbeat,cut,section',
    ]
    for (const m of plan.markers)
      rows.push(
        [
          m.n,
          m.t,
          m.tc,
          m.frame,
          m.song,
          m.bar,
          m.down ? 1 : 0,
          m.cut ? 1 : 0,
          m.section,
        ].join(','),
      )
    for (const c of plan.cutMarks.filter(x => !x.onBeat))
      rows.push(
        ['', c.t, c.tc, c.frame, '', c.bar, 0, 1, 'between beats'].join(','),
      )
    return `${rows.join('\n')}\n`
  }

  /* ============================================================ compositor */
  const mkCanvas = (w, h) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }
  let lut6 = null
  /** LunarNight_v2_Violet as a 64³ lookup (fast enough for every preview frame). */
  function getLut() {
    if (lut6 !== null) return lut6
    lut6 = false
    try {
      const d = LN.data && LN.data.lutsV2
      const look = d && d.looks && d.looks.Violet
      if (!look) return lut6
      const S = d.size
      const bin = atob(look.data)
      const tab = new Float32Array(S * S * S * 3)
      for (let i = 0; i < tab.length; i++)
        tab[i] =
          (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) / 65535
      const out = new Uint8Array(64 * 64 * 64 * 3)
      const s1 = S - 1
      const at = (r, g, b, c) => tab[((b * S + g) * S + r) * 3 + c]
      let o = 0
      for (let r = 0; r < 64; r++)
        for (let g = 0; g < 64; g++)
          for (let b = 0; b < 64; b++) {
            const fr = (r / 63) * s1
            const fg = (g / 63) * s1
            const fb = (b / 63) * s1
            const r0 = Math.floor(fr)
            const g0 = Math.floor(fg)
            const b0 = Math.floor(fb)
            const r1 = Math.min(s1, r0 + 1)
            const g1 = Math.min(s1, g0 + 1)
            const b1 = Math.min(s1, b0 + 1)
            const dr = fr - r0
            const dg = fg - g0
            const db = fb - b0
            for (let c = 0; c < 3; c++) {
              const c00 = at(r0, g0, b0, c) * (1 - dr) + at(r1, g0, b0, c) * dr
              const c10 = at(r0, g1, b0, c) * (1 - dr) + at(r1, g1, b0, c) * dr
              const c01 = at(r0, g0, b1, c) * (1 - dr) + at(r1, g0, b1, c) * dr
              const c11 = at(r0, g1, b1, c) * (1 - dr) + at(r1, g1, b1, c) * dr
              const v =
                (c00 * (1 - dg) + c10 * dg) * (1 - db) +
                (c01 * (1 - dg) + c11 * dg) * db
              out[o++] = Math.round(clamp(v, 0, 1) * 255)
            }
          }
      lut6 = out
    } catch (e) {
      console.warn('[beat] LUT unavailable', e)
      lut6 = false
    }
    return lut6
  }
  function lutRect(ctx, x, y, w, h) {
    const L = getLut()
    if (!L || w < 1 || h < 1) return
    const img = ctx.getImageData(x, y, w, h)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const k =
        (((d[i] >> 2) << 12) | ((d[i + 1] >> 2) << 6) | (d[i + 2] >> 2)) * 3
      d[i] = L[k]
      d[i + 1] = L[k + 1]
      d[i + 2] = L[k + 2]
    }
    ctx.putImageData(img, x, y)
  }

  function makeComp(W, H) {
    const big = Math.max(W, H) > 700
    const vhs = mkCanvas(big ? 320 : 224, big ? 240 : 168)
    const scan = mkCanvas(1, 3)
    const sctx = scan.getContext('2d')
    sctx.fillStyle = 'rgba(0,0,0,0.9)'
    sctx.fillRect(0, 2, 1, 1)
    const noise = []
    let seed = 1234567
    for (let n = 0; n < 4; n++) {
      const c = mkCanvas(128, 128)
      const x = c.getContext('2d')
      const id = x.createImageData(128, 128)
      for (let i = 0; i < id.data.length; i += 4) {
        seed = (seed * 1664525 + 1013904223) >>> 0
        const v = seed >>> 24
        id.data[i] = v
        id.data[i + 1] = v
        id.data[i + 2] = v
        id.data[i + 3] = 255
      }
      x.putImageData(id, 0, 0)
      noise.push(c)
    }
    return {
      W,
      H,
      vhs,
      vctx: vhs.getContext('2d', { willReadFrequently: true }),
      tmp: mkCanvas(W, H),
      scan,
      noise,
      seed: 99,
    }
  }

  const hash = s => {
    let h = 2166136261
    for (let i = 0; i < s.length; i++)
      h = Math.imul(h ^ s.charCodeAt(i), 16777619)
    return h >>> 0
  }

  function drawCover(c, img, x, y, w, h) {
    const sw = img.videoWidth || img.width
    const sh = img.videoHeight || img.height
    if (!sw || !sh) return
    const k = Math.max(w / sw, h / sh)
    const dw = sw * k
    const dh = sh * k
    c.save()
    c.beginPath()
    c.rect(x, y, w, h)
    c.clip()
    c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
    c.restore()
  }

  /** Colour-coded stand-in frame when no file is loaded. */
  function drawCard(c, it, t, x, y, w, h) {
    const hv = hash(it.clip || it.clipName || 'x')
    c.save()
    c.beginPath()
    c.rect(x, y, w, h)
    c.clip()
    const u = Math.min(w, h)
    const style = it.style
    if (style === '4K Lunar') {
      const g = c.createLinearGradient(0, y, 0, y + h)
      g.addColorStop(0, '#2a1b4a')
      g.addColorStop(0.55, '#0c0a18')
      g.addColorStop(1, '#020203')
      c.fillStyle = g
      c.fillRect(x, y, w, h)
      const bx = x + w * (0.22 + (hv % 20) / 100)
      const bw = w * 0.5
      const by = y + h * 0.5
      c.fillStyle = '#07070c'
      c.fillRect(bx, by, bw, h * 0.32)
      const neon = ['#22ff77', '#ff8a2a', '#3d6bff', '#ff2d3c'][hv % 4]
      c.shadowColor = neon
      c.shadowBlur = u * 0.06
      c.fillStyle = neon
      c.fillRect(bx + bw * 0.12, by + h * 0.05, bw * 0.76, h * 0.03)
      c.fillRect(bx + bw * 0.4, by + h * 0.14, bw * 0.2, h * 0.08)
      c.shadowBlur = 0
      const sweep = ((t * 0.35 + (hv % 7) / 7) % 1.4) - 0.2
      c.fillStyle = 'rgba(255,214,150,0.85)'
      c.fillRect(x + w * sweep, y + h * 0.84, w * 0.25, u * 0.008)
      c.fillStyle = 'rgba(255,40,40,0.8)'
      c.fillRect(x + w * (sweep - 0.08), y + h * 0.845, w * 0.1, u * 0.006)
    } else if (style === 'VHS') {
      const g = c.createLinearGradient(0, y, 0, y + h)
      g.addColorStop(0, '#7a5a3a')
      g.addColorStop(1, '#2b1a10')
      c.fillStyle = g
      c.fillRect(x, y, w, h)
      const cx = x + w * 0.5 + Math.sin(t * 1.3 + hv) * w * 0.04
      const cy = y + h * 0.58
      c.fillStyle = '#efe6d6'
      c.beginPath()
      c.ellipse(cx, cy, w * 0.3, h * 0.14, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = ['#c8541e', '#9e2a2b', '#d9a43c'][hv % 3]
      c.beginPath()
      c.ellipse(cx, cy - h * 0.01, w * 0.16, h * 0.07, t * 0.4, 0, Math.PI * 2)
      c.fill()
    } else if (style === 'Dreamcore') {
      const g = c.createLinearGradient(x, y, x + w, y + h)
      g.addColorStop(0, '#ffd9c2')
      g.addColorStop(0.5, '#e9c6ee')
      g.addColorStop(1, '#b9b4f2')
      c.fillStyle = g
      c.fillRect(x, y, w, h)
      c.fillStyle = 'rgba(255,255,255,0.7)'
      for (let i = 0; i < 4; i++) {
        const px =
          x + ((i * 0.31 + t * 0.03 + (hv % 10) / 10) % 1.2) * w - w * 0.1
        c.beginPath()
        c.ellipse(
          px,
          y + h * (0.25 + i * 0.15),
          w * 0.18,
          h * 0.05,
          0,
          0,
          Math.PI * 2,
        )
        c.fill()
      }
    } else {
      const g = c.createLinearGradient(0, y, 0, y + h)
      g.addColorStop(0, '#2a2016')
      g.addColorStop(1, '#0b0906')
      c.fillStyle = g
      c.fillRect(x, y, w, h)
      c.fillStyle = '#3c3a38'
      c.fillRect(x + w * 0.3, y + h * 0.6, w * 0.4, h * 0.18)
      c.fillStyle = 'rgba(240,240,240,0.35)'
      for (let i = 0; i < 5; i++) {
        const k = (t * 0.25 + i / 5) % 1
        c.beginPath()
        c.arc(
          x + w * (0.45 + Math.sin(k * 6 + i) * 0.06),
          y + h * (0.58 - k * 0.4),
          u * (0.04 + k * 0.08),
          0,
          Math.PI * 2,
        )
        c.fill()
      }
    }
    c.fillStyle = 'rgba(244,241,234,0.9)'
    c.font = `600 ${Math.max(9, Math.round(u * 0.05))}px "JetBrains Mono", monospace`
    c.textAlign = 'center'
    c.fillText(String(it.clipName || '').slice(0, 22), x + w / 2, y + h * 0.36)
    c.font = `${Math.max(8, Math.round(u * 0.035))}px "JetBrains Mono", monospace`
    c.fillStyle = 'rgba(244,241,234,0.6)'
    c.fillText(
      `${style} · src ${t.toFixed(1)} s`,
      x + w / 2,
      y + h * 0.36 + u * 0.055,
    )
    c.restore()
  }

  const painterFor = (img, it, srcT) => (c, x, y, w, h) =>
    img ? drawCover(c, img, x, y, w, h) : drawCard(c, it, srcT, x, y, w, h)

  function boxRect(W, H, frac) {
    if (H >= W) {
      const w = W * frac
      const h = (w * 3) / 4
      return { x: (W - w) / 2, y: (H - h) / 2, w, h }
    }
    const h = H * frac
    const w = (h * 4) / 3
    return { x: (W - w) / 2, y: (H - h) / 2, w, h }
  }

  /** VHS / Hi8: low res, chroma offset and blur, crush, noise, scanlines. */
  function vhsInto(ctx, comp, paint, r, t, seedKey) {
    const lw = comp.vhs.width
    const lh = comp.vhs.height
    const v = comp.vctx
    v.fillStyle = '#000'
    v.fillRect(0, 0, lw, lh)
    paint(v, 0, 0, lw, lh)
    const img = v.getImageData(0, 0, lw, lh)
    const d = img.data
    const src = new Uint8ClampedArray(d)
    let s = (comp.seed = (comp.seed * 1103515245 + 12345 + seedKey) >>> 0)
    const trackY = Math.floor(((t * 0.21) % 1) * lh)
    for (let y = 0; y < lh; y++) {
      const shift = Math.abs(y - trackY) < 3 ? 3 : 0
      for (let x = 0; x < lw; x++) {
        const i = (y * lw + x) * 4
        const xs = Math.min(lw - 1, x + shift)
        const ir = (y * lw + Math.min(lw - 1, xs + 2)) * 4
        const ib = (y * lw + Math.max(0, xs - 2)) * 4
        const R = src[ir]
        const G = src[(y * lw + xs) * 4 + 1]
        const B = src[ib + 2]
        const l = 0.3 * R + 0.59 * G + 0.11 * B
        s = (s * 1664525 + 1013904223) >>> 0
        const n = ((s >>> 24) - 128) * 0.12 + (shift ? 40 : 0)
        d[i] = ((l + (R - l) * 0.8) * 1.05 - 14) * 1.1 + n
        d[i + 1] = (l + (G - l) * 0.8 - 14) * 1.1 + n
        d[i + 2] = ((l + (B - l) * 0.8) * 0.9 - 14) * 1.1 + n
      }
    }
    v.putImageData(img, 0, 0)
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(comp.vhs, r.x, r.y, r.w, r.h)
    ctx.globalAlpha = 0.28
    ctx.fillStyle = ctx.createPattern(comp.scan, 'repeat')
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.globalAlpha = 0.85
    ctx.fillStyle = '#f4f1ea'
    const u = Math.min(r.w, r.h)
    ctx.font = `${Math.max(8, Math.round(u * 0.06))}px "Courier Prime", "Space Mono", monospace`
    ctx.textAlign = 'left'
    ctx.fillText('PLAY ▶', r.x + u * 0.06, r.y + u * 0.1)
    ctx.restore()
  }

  function dreamOn(ctx, comp) {
    const { W, H, tmp } = comp
    const tc2 = tmp.getContext('2d')
    tc2.clearRect(0, 0, W, H)
    tc2.drawImage(ctx.canvas, 0, 0)
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.5
    ctx.filter = `blur(${Math.max(2, Math.round(W / 50))}px)`
    ctx.drawImage(tmp, 0, 0)
    ctx.filter = 'none'
    ctx.globalCompositeOperation = 'lighten'
    ctx.globalAlpha = 0.55
    ctx.fillStyle = '#3b2c58'
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'soft-light'
    ctx.globalAlpha = 0.5
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#ffc9a8')
    g.addColorStop(1, '#c7b5ff')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  function drawPlate(ctx, comp, p, t) {
    const { W, H } = comp
    const a = clamp(p.opacity / 100, 0, 1)
    const local = t - p.start
    ctx.save()
    if (p.plate === 'White flash') {
      ctx.globalAlpha = a
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, W, H)
    } else if (p.plate === 'Grain') {
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = a
      const tile = comp.noise[Math.floor(t * 24) % comp.noise.length]
      const pat = ctx.createPattern(tile, 'repeat')
      ctx.translate(
        (Math.floor(t * 97) % 64) - 64,
        (Math.floor(t * 53) % 64) - 64,
      )
      ctx.fillStyle = pat
      ctx.fillRect(0, 0, W + 128, H + 128)
    } else if (p.plate === 'VHS tracking') {
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = a
      const tile = comp.noise[Math.floor(t * 30) % comp.noise.length]
      ctx.fillStyle = ctx.createPattern(tile, 'repeat')
      for (let k = 0; k < 3; k++) {
        const y = (((t * 0.35 + k * 0.37) % 1) * 1.1 - 0.05) * H
        ctx.fillRect(0, y, W, H * (0.012 + 0.02 * ((k + 1) % 2)))
      }
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillRect(0, ((t * 0.5) % 1) * H, W, Math.max(1, H * 0.003))
    } else if (p.plate === 'Light leak') {
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = a
      const cx = W * (0.15 + 0.7 * ((local * 0.18) % 1))
      const g = ctx.createRadialGradient(
        cx,
        H * 0.3,
        0,
        cx,
        H * 0.3,
        Math.max(W, H) * 0.6,
      )
      g.addColorStop(0, 'rgba(255,170,90,0.95)')
      g.addColorStop(0.45, 'rgba(255,90,140,0.45)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  }

  function drawText(ctx, comp, it) {
    const { W, H } = comp
    const u = Math.min(W, H) / 1080
    const lines = String(it.text || '').split('\n')
    const right = W - 140 * u
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (it.style === 'lime') {
      const fs = Math.round(86 * u)
      ctx.font = `600 ${fs}px Oswald, Antonio, "Arial Narrow", sans-serif`
      ctx.fillStyle = '#D6DB05'
      ctx.shadowColor = 'rgba(0,0,0,0.9)'
      ctx.shadowBlur = 4 * u
      ctx.shadowOffsetY = 3 * u
      lines.forEach((l, i) => {
        ctx.fillText(l.toLowerCase(), right / 2, H * 0.26 + i * fs * 1.05)
      })
    } else if (it.style === 'hook' || it.style === 'rating') {
      const fs = Math.round((it.style === 'hook' ? 58 : 72) * u)
      ctx.font = `700 ${fs}px Inter, Arial, sans-serif`
      const tw = Math.max(...lines.map(l => ctx.measureText(l).width)) + fs
      const y = it.style === 'hook' ? 130 * u + fs * 1.4 : H * 0.42
      ctx.fillStyle = '#fff'
      ctx.fillRect(
        right / 2 - tw / 2,
        y - fs * 0.8,
        tw,
        fs * 1.6 * lines.length,
      )
      ctx.fillStyle = '#000'
      lines.forEach((l, i) => {
        ctx.fillText(l.toLowerCase(), right / 2, y + i * fs * 1.6)
      })
    } else if (it.style === 'editorial') {
      const fs = Math.round(96 * u)
      ctx.font = `italic 400 ${fs}px "Cormorant Garamond", "Playfair Display", Georgia, serif`
      ctx.fillStyle = '#f4f1ea'
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = 8 * u
      lines.forEach((l, i) => {
        ctx.fillText(l, right / 2, H * 0.3 + i * fs * 1.1)
      })
    } else {
      const fs = Math.round(38 * u)
      ctx.font = `500 ${fs}px "Space Mono", "JetBrains Mono", monospace`
      const tw =
        Math.max(...lines.map(l => ctx.measureText(l).width)) + fs * 1.2
      const y = H - 484 * u * (H > W ? 1 : 0.35) - fs * 1.4
      ctx.fillStyle = 'rgba(7,7,9,0.72)'
      ctx.fillRect(right / 2 - tw / 2, y - fs, tw, fs * 2 * lines.length)
      ctx.strokeStyle = '#D6DB05'
      ctx.lineWidth = Math.max(1, 2 * u)
      ctx.strokeRect(right / 2 - tw / 2, y - fs, tw, fs * 2 * lines.length)
      ctx.fillStyle = '#f4f1ea'
      lines.forEach((l, i) => {
        ctx.fillText(l, right / 2, y + i * fs * 2)
      })
    }
    ctx.restore()
  }

  const activeF = (list, f) =>
    list.find(it => f >= it.startFrame && f < it.endFrame) || null

  /** Draw one frame of the plan at time t. getSrc(item, srcTime) → image | null. */
  function drawFrame(ctx, comp, plan, t, getSrc, hud) {
    const { W, H } = comp
    const f = t * plan.fps + 1e-6
    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    const v1 = activeF(plan.layers.V1, f)
    if (v1) {
      const local = t - v1.start
      const srcT = v1.inPoint + local * v1.speed
      const paint = painterFor(getSrc(v1, srcT), v1, srcT)
      const z = v1.accent
        ? 1 + 0.1 * Math.max(0, 1 - local / (30 / plan.bpm))
        : 1
      ctx.save()
      if (z !== 1) {
        ctx.translate(W / 2, H / 2)
        ctx.scale(z, z)
        ctx.translate(-W / 2, -H / 2)
      }
      if (v1.box === '4:3') vhsInto(ctx, comp, paint, boxRect(W, H, 1), t, 1)
      else paint(ctx, 0, 0, W, H)
      ctx.restore()
      if (v1.style === '4K Lunar') lutRect(ctx, 0, 0, W, H)
      if (v1.style === 'Dreamcore') dreamOn(ctx, comp)
    }
    const v2 = activeF(plan.layers.V2, f)
    if (v2) {
      const local = t - v2.start
      const srcT = v2.inPoint + local * v2.speed
      const r = boxRect(W, H, 0.8)
      vhsInto(ctx, comp, painterFor(getSrc(v2, srcT), v2, srcT), r, t, 7)
      ctx.strokeStyle = 'rgba(244,241,234,0.6)'
      ctx.lineWidth = 1
      ctx.strokeRect(r.x, r.y, r.w, r.h)
    }
    for (const p of plan.layers.V3)
      if (f >= p.startFrame && f < p.endFrame) drawPlate(ctx, comp, p, t)
    for (const x of plan.layers.T1)
      if (f >= x.startFrame && f < x.endFrame) drawText(ctx, comp, x)
    if (hud && v1) {
      const u = Math.min(W, H)
      ctx.font = `${Math.max(9, Math.round(u * 0.035))}px "JetBrains Mono", monospace`
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(7,7,9,0.6)'
      ctx.fillRect(0, H - u * 0.08, W, u * 0.08)
      ctx.fillStyle = '#d4dce8'
      ctx.fillText(
        `${tc(t, plan.fps)}  bar ${v1.bar}  ${v1.section}  ${v1.style}`,
        u * 0.03,
        H - u * 0.028,
      )
    }
    ctx.restore()
  }

  /* ============================================================ rough-cut render */
  function musicSlice(buf, start, dur, fadeOut) {
    const sr = buf.sampleRate
    const s0 = Math.max(0, Math.round(start * sr))
    const n = Math.max(1, Math.round(dur * sr))
    const ch = []
    const fadeN = Math.round(fadeOut * sr)
    for (let c = 0; c < 2; c++) {
      const src = buf.getChannelData(Math.min(c, buf.numberOfChannels - 1))
      const out = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const j = s0 + i
        let v = j < src.length ? src[j] : 0
        if (i > n - fadeN) v *= (n - i) / fadeN
        out[i] = v
      }
      ch.push(out)
    }
    return { ch, n, sr }
  }

  /**
   * Render the plan to a video file with the music.
   * o: {width, height, files: Map(clipId → File), music: AudioBuffer, signal, onProgress}
   */
  async function renderRough(plan, o) {
    const MB = await LN.lib.mediabunny()
    const W = o.width
    const H = o.height
    const fps = plan.fps
    const sr = 48000
    const canAudio = async c => {
      try {
        return await MB.canEncodeAudio(c, {
          numberOfChannels: 2,
          sampleRate: sr,
        })
      } catch (_e) {
        return false
      }
    }
    let container = 'mp4'
    let acodec = null
    if (o.music && (await canAudio('aac'))) acodec = 'aac'
    else if (o.music && (await canAudio('opus'))) {
      acodec = 'opus'
      container = 'webm'
    }
    let vcodec = await MB.getFirstEncodableVideoCodec(
      container === 'mp4' ? ['avc', 'hevc'] : ['vp9', 'vp8', 'av1'],
      { width: W, height: H },
    )
    if (!vcodec && container === 'webm') {
      container = 'mp4'
      acodec = null
      vcodec = await MB.getFirstEncodableVideoCodec(['avc', 'hevc'], {
        width: W,
        height: H,
      })
    }
    if (!vcodec) throw new Error('This browser has no video encoder.')
    const output = new MB.Output({
      format:
        container === 'mp4'
          ? new MB.Mp4OutputFormat({ fastStart: 'in-memory' })
          : new MB.WebMOutputFormat(),
      target: new MB.BufferTarget(),
    })
    const canvas = mkCanvas(W, H)
    const ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: true,
    })
    const quality = MB.QUALITY_HIGH || new MB.Quality('high')
    const vs = new MB.CanvasSource(canvas, {
      codec: vcodec,
      bitrate: quality,
      keyFrameInterval: 2,
    })
    output.addVideoTrack(vs, { frameRate: fps })
    let as = null
    if (acodec) {
      as = new MB.AudioBufferSource({ codec: acodec, bitrate: quality })
      output.addAudioTrack(as)
    }
    await output.start()
    const comp = makeComp(W, H)
    const inputs = new Map()
    const iters = new Map()
    const sinkFor = async id => {
      const file = o.files && o.files.get(id)
      if (!file) return null
      if (!inputs.has(id)) {
        const rec = { input: null, sink: null, dur: 0 }
        try {
          rec.input = new MB.Input({
            source: new MB.BlobSource(file),
            formats: MB.ALL_FORMATS,
          })
          const tr = await rec.input.getPrimaryVideoTrack()
          if (tr) {
            const dw = tr.displayWidth || W
            const dh = tr.displayHeight || H
            const k = Math.min(1, Math.max(W / dw, H / dh))
            rec.sink = new MB.CanvasSink(tr, {
              width: Math.max(16, Math.round((dw * k) / 2) * 2),
              height: Math.max(16, Math.round((dh * k) / 2) * 2),
              fit: 'fill',
            })
            rec.dur = await tr.computeDuration()
          }
        } catch (e) {
          console.warn('[beat] cannot read', file.name, e)
        }
        inputs.set(id, rec)
      }
      return inputs.get(id)
    }
    const frameFor = async (it, f) => {
      const rec = await sinkFor(it.clip)
      if (!rec || !rec.sink) return null
      let iter = iters.get(it.id)
      if (!iter) {
        const ts = []
        for (let k = it.startFrame; k < it.endFrame; k++)
          ts.push(
            clamp(
              it.inPoint + (k / fps - it.start) * it.speed,
              0,
              Math.max(0, rec.dur - 0.02),
            ),
          )
        iter = {
          gen: rec.sink.canvasesAtTimestamps(ts),
          last: null,
          next: it.startFrame,
        }
        iters.set(it.id, iter)
      }
      while (iter.next <= f) {
        const r = await iter.gen.next()
        iter.next++
        if (r.done) break
        if (r.value) iter.last = r.value.canvas
      }
      return iter.last
    }
    const music = acodec
      ? musicSlice(
          o.music,
          plan.window.songStart,
          plan.duration,
          (plan.layers.A1[0] || {}).fadeOut || 1,
        )
      : null
    let aNext = 0
    const pushAudio = async upTo => {
      while (music && aNext < music.n && aNext / music.sr <= upTo) {
        const len = Math.min(music.sr, music.n - aNext)
        const ab = new AudioBuffer({
          length: len,
          numberOfChannels: 2,
          sampleRate: music.sr,
        })
        for (let c = 0; c < 2; c++)
          ab.copyToChannel(music.ch[c].subarray(aNext, aNext + len), c)
        await as.add(ab)
        aNext += len
      }
    }
    const n = plan.frames
    try {
      for (let k = 0; k < n; k++) {
        if (o.signal && o.signal.aborted) throw abortErr()
        const t = k / fps
        await pushAudio(t + 1)
        const imgs = {}
        for (const L of ['V1', 'V2']) {
          const it = activeF(plan.layers[L], k + 1e-6)
          if (it) imgs[it.id] = await frameFor(it, k)
        }
        drawFrame(ctx, comp, plan, t, it => imgs[it.id] || null, false)
        await vs.add(t, 1 / fps)
        if (o.onProgress) o.onProgress(k + 1, n)
        if (k % 8 === 7) await yieldUI()
      }
      await pushAudio(Number.POSITIVE_INFINITY)
      await output.finalize()
    } catch (e) {
      try {
        await output.cancel()
      } catch (_e) {
        /* already closed */
      }
      throw e
    } finally {
      for (const rec of inputs.values())
        try {
          if (rec.input && rec.input.dispose) rec.input.dispose()
        } catch (_e) {
          /* ignore */
        }
    }
    const mime = container === 'mp4' ? 'video/mp4' : 'video/webm'
    return {
      blob: new Blob([output.target.buffer], { type: mime }),
      ext: container,
      vcodec,
      acodec,
      frames: n,
    }
  }

  /* ============================================================ UI */
  function mount(el) {
    const ui = LN.ui
    const h = LN.h
    const state = { an: null, plan: null, format: 'night', length: 30 }
    const root = h('div', { class: 'm-beat ln-stack' })
    const status = h(
      'div',
      { class: 'beat-status ln-muted' },
      'Pick a track to analyse.',
    )
    const out = h('div', { class: 'ln-stack' })
    const fmtSeg = ui.seg({
      options: Object.values(FORMATS).map(f => ({
        value: f.id,
        label: f.name,
      })),
      value: state.format,
      onChange: v => {
        state.format = v
        rebuild()
      },
    })
    const lenField = ui.field({
      label: 'Target length (s)',
      type: 'number',
      value: String(state.length),
      onInput: v => {
        state.length = Number(v) || 30
        rebuild()
      },
    })
    const pick = ui.filePick({
      accept: 'audio/*,video/*',
      label: 'Choose music',
      kind: 'primary',
      onFile: async file => {
        status.textContent = 'Decoding…'
        try {
          const buf = await LN.media.decodeAudio(file)
          status.textContent = 'Analysing beats…'
          state.an = await analyse(buf, {
            name: file.name.replace(/\.[^.]+$/, ''),
            onProgress: p => {
              status.textContent = `Analysing… ${Math.round(p * 100)}%`
            },
          })
          rebuild()
        } catch (e) {
          console.error('[LN.beatForge]', e)
          status.textContent = `Could not analyse: ${e && e.message}`
        }
      },
    })
    function rebuild() {
      out.replaceChildren()
      if (!state.an) return
      const an = state.an
      state.plan = plan(an, { format: state.format, length: state.length })
      const p = state.plan
      status.textContent = `${an.name}: ${Math.round(an.bpm)} BPM · ${an.sections.length} sections · plan ${p.items ? p.items.length : ''} cuts`
      const s = summary(an, 20)
      out.append(
        ui.kv([
          ['BPM', String(s.bpm)],
          ['Beat', `${s.beatPeriod}s`],
          ['Duration', `${s.duration}s`],
          [
            'Sections',
            s.sections
              .map(
                x => `${x.label} ${Math.round(x.start)}–${Math.round(x.end)}s`,
              )
              .join(' · '),
          ],
        ]),
        ui.copyBlock(sheetText(p, 'mobile', false), {
          title: 'Build sheet (CapCut Mobile)',
        }),
        h(
          'div',
          { class: 'ln-row' },
          ui.btn('Save build sheet .md', () =>
            LN.save({
              filename: `${an.name}_music_edit.md`,
              data: sheetText(p, 'mobile', true),
              mime: 'text/markdown',
            }),
          ),
          ui.btn(
            'Save beat markers .csv',
            () =>
              LN.save({
                filename: `${an.name}_beats.csv`,
                data: markersCsv(p),
                mime: 'text/csv',
              }),
            { kind: 'quiet' },
          ),
          ui.btn(
            'Copy desktop steps',
            () => LN.copy(sheetText(p, 'desktop', false)),
            { kind: 'quiet' },
          ),
        ),
        ui.callout(
          'verify',
          'Beats › Auto-generate and marker import vary by CapCut build. If the beat marks don’t appear, add them by hand at the listed timecodes.',
          'Check on your phone',
        ),
      )
    }
    root.append(
      ui.callout(
        'tip',
        'Pick a song. Beat Forge finds the BPM, bars and sections, then writes a layer-by-layer multi-layer cut (VHS → 4K Lunar on the drop) as tap-by-tap CapCut steps.',
        'Music Edit',
      ),
      h(
        'div',
        { class: 'ln-row' },
        pick,
        fmtSeg.el || fmtSeg,
        lenField.el || lenField,
      ),
      status,
      out,
    )
    el.append(root)
  }

  LN.beatForge = {
    mount,
    analyse,
    plan,
    summary,
    sheetText,
    markersText,
    markersCsv,
    renderRough,
  }
})()
