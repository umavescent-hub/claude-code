/* Kubrick: modules/forge-audio.js, the Sound Forge tab inside Forge (07).
   LN.forgeAudio = { mount(el), DESIGNS, renderWav(id, params), render, buildPack }
   Eight house sounds synthesized with OfflineAudioContext at 48 kHz stereo.
   Every random number comes from a seeded PRNG, so one seed always gives the
   same file. Each render is normalized to -1 dBFS and encoded as 24-bit WAV
   with LN.media.wav. */
;(() => {
  const LN = window.LN
  const { h, ui } = LN
  const { clamp } = LN.math

  const SR = 48000
  const TARGET_DB = -1
  const TARGET = 10 ** (TARGET_DB / 20)
  const STORE_KEY = 'forge-audio.v1'
  const PI2 = Math.PI / 2

  /* ------------------------------------------------------------ seeded random */
  const mulberry32 = seed => {
    let a = seed >>> 0
    return () => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const hashStr = s => {
    let x = 2166136261
    for (let i = 0; i < s.length; i++)
      x = Math.imul(x ^ s.charCodeAt(i), 16777619)
    return x >>> 0
  }

  /* ------------------------------------------------------------ synthesis kit */
  // Every helper takes k = {ctx, out, rng}. Times are seconds from the start.

  /** Write fn(t) for t in [0, dur] onto an AudioParam as a value curve. */
  function curve(param, t0, dur, fn, scale = 1) {
    const d = Math.max(dur, 0.002)
    const n = clamp(Math.ceil(d * 2000), 32, 16384)
    const c = new Float32Array(n)
    for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * d) * scale
    if (t0 > 0.0005) param.setValueAtTime(c[0], 0)
    param.setValueCurveAtTime(c, Math.max(0, t0), d)
  }
  /** Same as curve(), but forced to reach 0 at the end (no stuck tail). */
  const env = (param, t0, dur, fn, scale = 1) =>
    curve(param, t0, dur, t => fn(t) * clamp((dur - t) / 0.004, 0, 1), scale)
  /** Click-free attack (sine-squared), then exponential decay. */
  const decayEnv = (attack, tau) => t =>
    t < attack
      ? Math.sin((t / attack) * PI2) ** 2
      : Math.exp(-(t - attack) / tau)

  function noiseBuf(k, sec, channels = 2, mod = null) {
    const n = Math.max(1, Math.ceil(sec * SR))
    const buf = k.ctx.createBuffer(channels, n, SR)
    for (let c = 0; c < channels; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < n; i++) {
        const x = k.rng() * 2 - 1
        d[i] = mod ? x * mod(i / SR, c) : x
      }
    }
    return buf
  }

  function filterChain(k, input, filters, t, dur) {
    let node = input
    for (const f of filters || []) {
      const b = k.ctx.createBiquadFilter()
      b.type = f.type
      b.Q.value = f.Q ?? 0.707
      b.frequency.setValueAtTime(f.f, Math.max(0, t))
      if (f.fEnd)
        b.frequency.exponentialRampToValueAtTime(
          f.fEnd,
          Math.max(0, t) + (f.sweep || dur),
        )
      node.connect(b)
      node = b
    }
    return node
  }

  function routeOut(k, node, pan, dest) {
    let n = node
    if (pan) {
      const p = k.ctx.createStereoPanner()
      p.pan.value = clamp(pan, -1, 1)
      n.connect(p)
      n = p
    }
    n.connect(dest || k.out)
  }

  /** Oscillator voice with an envelope, optional pitch sweep and pan. */
  function tone(k, o) {
    const { ctx } = k
    const t = o.t || 0
    const d = o.dur
    const osc = ctx.createOscillator()
    osc.type = o.type || 'sine'
    osc.frequency.setValueAtTime(o.f, t)
    if (o.fEnd)
      osc.frequency.exponentialRampToValueAtTime(o.fEnd, t + (o.sweep || d))
    if (o.detune) osc.detune.value = o.detune
    const g = ctx.createGain()
    env(
      g.gain,
      t,
      d,
      o.env || decayEnv(o.attack ?? 0.002, o.tau ?? d / 5),
      o.amp ?? 1,
    )
    osc.connect(g)
    routeOut(k, filterChain(k, g, o.filters, t, d), o.pan, o.dest)
    osc.start(t)
    osc.stop(t + d + 0.005)
    return osc
  }

  /** Filtered noise burst (independent noise per channel = natural width). */
  function burst(k, o) {
    const { ctx } = k
    const t = o.t || 0
    const d = o.dur
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf(k, d + 0.01, o.mono ? 1 : 2, o.mod)
    const filtered = filterChain(k, src, o.filters, t, d)
    const g = ctx.createGain()
    env(
      g.gain,
      t,
      d,
      o.env || decayEnv(o.attack ?? 0.001, o.tau ?? d / 5),
      o.amp ?? 1,
    )
    filtered.connect(g)
    routeOut(k, g, o.pan, o.dest)
    src.start(t)
    return src
  }

  const tanhCurve = drive => {
    const n = 4096
    const c = new Float32Array(n)
    const norm = Math.tanh(drive)
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1
      c[i] = Math.tanh(drive * x) / norm
    }
    return c
  }

  /* ------------------------------------------------------------ designs */
  const R = (key, label, min, max, step, value, unit = '') => ({
    key,
    label,
    min,
    max,
    step,
    value,
    unit,
  })

  const DESIGNS = [
    {
      id: 'subdrop',
      name: 'Sub drop',
      tag: 'Impact',
      use: 'Verdict hit, rating card, chapter title. Saturation adds harmonics so the drop still reads on a phone speaker.',
      params: [
        R('length', 'Length', 1.5, 3, 0.1, 2.2, ' s'),
        R('drive', 'Saturation', 0, 100, 1, 35, '%'),
        R('end', 'End pitch', 24, 40, 1, 28, ' Hz'),
        R('hit', 'Noise hit', 0, 100, 1, 40, '%'),
      ],
      duration: p => p.length,
      build(k, p) {
        const { ctx } = k
        const T = p.length
        const osc = ctx.createOscillator()
        osc.frequency.setValueAtTime(90, 0)
        osc.frequency.exponentialRampToValueAtTime(p.end, T * 0.75)
        const pre = ctx.createGain()
        const fadeLen = Math.min(0.3, T * 0.18)
        env(pre.gain, 0, T, t => {
          const att = t < 0.012 ? Math.sin((t / 0.012) * PI2) ** 2 : 1
          const dec = Math.exp(-Math.max(0, t - 0.15) / (T * 0.38))
          const u = (t - (T - fadeLen)) / fadeLen
          const fade = u > 0 ? Math.cos(clamp(u, 0, 1) * PI2) ** 2 : 1
          return att * dec * fade
        })
        const shaper = ctx.createWaveShaper()
        shaper.curve = tanhCurve(1 + (p.drive / 100) * 6)
        shaper.oversample = '4x'
        osc.connect(pre).connect(shaper).connect(k.out)
        osc.start(0)
        osc.stop(T)
        if (p.hit > 0)
          burst(k, {
            t: 0,
            dur: 0.45,
            attack: 0.001,
            tau: 0.06,
            amp: (p.hit / 100) * 0.7,
            filters: [{ type: 'lowpass', f: 7000, fEnd: 220, sweep: 0.35 }],
          })
      },
    },
    {
      id: 'riser',
      name: 'Riser',
      tag: 'Build',
      use: 'Into the lid lift or the money shot. The hard cut lands on the reveal frame.',
      params: [
        R('length', 'Length', 2, 8, 0.1, 4, ' s'),
        R('bright', 'Brightness', 2000, 12000, 100, 7000, ' Hz'),
        R('detune', 'Detune', 0, 40, 1, 16, ' ct'),
        R('tone', 'Tone mix', 0, 100, 1, 55, '%'),
      ],
      duration: p => p.length + 0.06,
      build(k, p) {
        const T = p.length
        const rise = t =>
          clamp(t / T, 0, 1) ** 2.2 * clamp((T - t) / 0.003, 0, 1)
        const noiseAmp = 1 - (p.tone / 100) * 0.45
        burst(k, {
          dur: T,
          env: rise,
          amp: 0.6 * noiseAmp,
          filters: [
            { type: 'highpass', f: 160 },
            { type: 'bandpass', f: 450, fEnd: p.bright, sweep: T, Q: 1.4 },
          ],
        })
        burst(k, {
          dur: T,
          env: rise,
          amp: 0.3 * noiseAmp,
          filters: [{ type: 'lowpass', f: 700, fEnd: p.bright, sweep: T }],
        })
        const lp = k.ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.setValueAtTime(600, 0)
        lp.frequency.exponentialRampToValueAtTime(p.bright * 0.55, T)
        lp.connect(k.out)
        for (const side of [-1, 0, 1])
          tone(k, {
            type: 'sawtooth',
            dur: T,
            f: 110,
            fEnd: 880,
            sweep: T,
            detune: side * p.detune + (k.rng() - 0.5) * 2,
            pan: side * 0.7,
            env: rise,
            amp: (p.tone / 100) * 0.2,
            dest: lp,
          })
      },
    },
    {
      id: 'tape',
      name: 'Tape stop',
      tag: 'Transport',
      use: 'A "wait, what" beat in a review, or the VHS confession cut in the documentary. Click is a single deck button.',
      params: [
        {
          key: 'mode',
          label: 'Mode',
          type: 'choice',
          options: [
            { value: 'stop', label: 'Wind-down' },
            { value: 'start', label: 'Spin-up' },
            { value: 'click', label: 'Click' },
          ],
          value: 'stop',
        },
        R('length', 'Motor time', 0.6, 2.5, 0.1, 1.3, ' s'),
        R('pitch', 'Motor pitch', 60, 200, 1, 110, ' Hz'),
        R('wow', 'Wow', 0, 100, 1, 35, '%'),
      ],
      duration: p => (p.mode === 'click' ? 0.32 : p.length + 0.3),
      build(k, p) {
        const click = (t, amp, pm = 1) => {
          burst(k, {
            t,
            dur: 0.03,
            attack: 0.0003,
            tau: 0.0035,
            amp,
            filters: [{ type: 'bandpass', f: 3400 * pm, Q: 2.5 }],
          })
          tone(k, { t, dur: 0.04, f: 1500 * pm, tau: 0.006, amp: amp * 0.25 })
          tone(k, { t, dur: 0.05, f: 240, tau: 0.012, amp: amp * 0.3 })
        }
        if (p.mode === 'click') {
          click(0.02, 1)
          click(0.115, 0.55, 1.25)
          return
        }
        // Transport clunk: plastic body, low thump, a rattle just after.
        tone(k, { dur: 0.16, f: 150, fEnd: 52, sweep: 0.1, tau: 0.035 })
        tone(k, { dur: 0.06, f: 420, tau: 0.02, amp: 0.15 })
        burst(k, {
          dur: 0.05,
          tau: 0.008,
          amp: 0.55,
          filters: [{ type: 'bandpass', f: 1600, Q: 1 }],
        })
        burst(k, {
          t: 0.038,
          dur: 0.03,
          tau: 0.005,
          amp: 0.25,
          filters: [{ type: 'bandpass', f: 2600, Q: 2 }],
        })
        // Motor: speed curve drives pitch and level.
        const stop = p.mode === 'stop'
        const t0 = stop ? 0.03 : 0.09
        const L = p.length
        const D = stop ? L : L + 0.15
        const speed = t => {
          const u = clamp(t / L, 0, 1)
          return stop ? (1 - u) ** 1.6 : 1 - (1 - u) ** 2.2
        }
        const level = t => {
          const s = speed(t) ** 0.7
          if (stop) return s
          const fo = clamp((D - t) / 0.12, 0, 1)
          return s * Math.sin(fo * PI2) ** 2
        }
        const motor = k.ctx.createGain()
        env(motor.gain, t0, D, level, 0.32)
        const lp = k.ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 1400
        lp.Q.value = 1
        lp.connect(motor).connect(k.out)
        const wow = k.ctx.createOscillator()
        wow.frequency.value = 4.2
        const wowAmt = k.ctx.createGain()
        wowAmt.gain.value = (p.wow / 100) * 0.025 * p.pitch
        wow.connect(wowAmt)
        const flutter = k.ctx.createOscillator()
        flutter.frequency.value = 0.9
        const flAmt = k.ctx.createGain()
        flAmt.gain.value = (p.wow / 100) * 0.012 * p.pitch
        flutter.connect(flAmt)
        for (const [type, mult, amp] of [
          ['sawtooth', 1, 0.7],
          ['sine', 2.003, 0.5],
        ]) {
          const o = k.ctx.createOscillator()
          o.type = type
          curve(
            o.frequency,
            t0,
            D,
            t => p.pitch * mult * (0.08 + 0.92 * speed(t)),
          )
          wowAmt.connect(o.frequency)
          flAmt.connect(o.frequency)
          const g = k.ctx.createGain()
          g.gain.value = amp
          o.connect(g).connect(lp)
          o.start(t0)
          o.stop(t0 + D + 0.01)
        }
        for (const o of [wow, flutter]) {
          o.start(0)
          o.stop(t0 + D + 0.01)
        }
        burst(k, {
          t: t0,
          dur: D,
          env: level,
          amp: 0.06,
          filters: [
            { type: 'highpass', f: 2500 },
            { type: 'lowpass', f: 9000 },
          ],
        })
      },
    },
    {
      id: 'shutter',
      name: 'Shutter',
      tag: 'Mechanical',
      use: 'Cover freeze frame, the 45° hero still, R&D plating cards.',
      params: [
        R('length', 'Length', 0.15, 0.4, 0.01, 0.24, ' s'),
        R('tone', 'Mechanism pitch', 60, 160, 1, 100, '%'),
        R('gap', 'Curtain gap', 20, 120, 1, 55, ' ms'),
        R('body', 'Body', 0, 100, 1, 50, '%'),
      ],
      duration: p => p.length + 0.02,
      build(k, p) {
        const m = p.tone / 100
        const g = p.gap / 1000
        const T = p.length
        const body = p.body / 100
        // Mirror slap: mid crack plus a low body knock.
        burst(k, {
          t: 0.004,
          dur: 0.06,
          attack: 0.0005,
          tau: 0.012,
          amp: 0.8,
          filters: [{ type: 'bandpass', f: 1300 * m, Q: 1.2 }],
        })
        tone(k, {
          t: 0.004,
          dur: 0.08,
          f: 190 * m,
          fEnd: 120 * m,
          tau: 0.018,
          amp: body * 0.8,
        })
        // First and second curtain.
        burst(k, {
          t: 0.016,
          dur: 0.02,
          attack: 0.0003,
          tau: 0.003,
          amp: 0.6,
          filters: [{ type: 'highpass', f: 3200 * m }],
        })
        burst(k, {
          t: 0.016 + g,
          dur: 0.025,
          attack: 0.0003,
          tau: 0.0035,
          amp: 0.75,
          filters: [{ type: 'bandpass', f: 4200 * m, Q: 1.5 }],
        })
        tone(k, { t: 0.016 + g, dur: 0.05, f: 2600 * m, tau: 0.008, amp: 0.12 })
        // Mirror return and spring wind, then the mirror lands.
        const w0 = Math.min(0.03 + g, T * 0.55)
        const w1 = T - 0.016
        if (w1 - w0 > 0.02)
          burst(k, {
            t: w0,
            dur: w1 - w0,
            env: t => Math.sin(Math.PI * clamp(t / (w1 - w0), 0, 1)) ** 1.5,
            amp: 0.28,
            filters: [{ type: 'bandpass', f: 700 * m, fEnd: 2400 * m, Q: 2 }],
          })
        burst(k, {
          t: w1,
          dur: 0.014,
          attack: 0.0004,
          tau: 0.004,
          amp: 0.45,
          filters: [{ type: 'bandpass', f: 1600 * m, Q: 1.4 }],
        })
        tone(k, { t: w1, dur: 0.03, f: 210 * m, tau: 0.01, amp: body * 0.4 })
      },
    },
    {
      id: 'steel',
      name: 'Knife steel',
      tag: 'Ring',
      use: 'R&D Lab opener, the knife beat before service, a heritage cut.',
      params: [
        R('length', 'Length', 2, 6, 0.1, 3.5, ' s'),
        R('pitch', 'Pitch', 500, 1600, 10, 880, ' Hz'),
        R('decay', 'Ring time', 30, 150, 1, 100, '%'),
        R('scrape', 'Scrape', 0, 100, 1, 60, '%'),
      ],
      duration: p => p.length,
      build(k, p) {
        const T = p.length
        const ts = p.scrape > 0 ? 0.19 : 0.008
        if (p.scrape > 0) {
          // Stick-slip: the level jumps every ~3 ms, per channel.
          const grains = [0, 1].map(() =>
            Array.from({ length: 80 }, () => 0.25 + 0.75 * k.rng()),
          )
          burst(k, {
            dur: 0.24,
            env: t =>
              Math.sin(Math.PI * clamp(t / 0.2, 0, 1)) ** 0.8 *
              (t < 0.2 ? 1 : Math.exp(-(t - 0.2) / 0.01)),
            mod: (t, c) => grains[c][Math.min(79, Math.floor(t * 330))],
            amp: (p.scrape / 100) * 0.55,
            filters: [
              { type: 'highpass', f: 1800 },
              { type: 'bandpass', f: 2800, fEnd: 7200, sweep: 0.2, Q: 2.5 },
            ],
          })
        }
        const RATIOS = [1, 2.76, 5.4, 8.93]
        const AMPS = [1, 0.6, 0.38, 0.22]
        const RING = [1, 0.75, 0.5, 0.32]
        RATIOS.forEach((r, i) => {
          const t60 = RING[i] * T * (p.decay / 100)
          for (const side of [-1, 1])
            tone(k, {
              t: ts,
              dur: T - ts,
              f:
                p.pitch *
                r *
                (1 + side * 0.0009 * (i + 1) + (k.rng() - 0.5) * 0.0004),
              attack: 0.0015,
              tau: t60 / 6.9,
              amp: AMPS[i] * 0.22,
              pan: side * 0.55,
            })
        })
        burst(k, {
          t: ts,
          dur: 0.02,
          attack: 0.0002,
          tau: 0.002,
          amp: 0.25,
          filters: [
            { type: 'bandpass', f: Math.min(16000, p.pitch * 11), Q: 3 },
          ],
        })
      },
    },
    {
      id: 'sizzle',
      name: 'Sizzle loop',
      tag: 'Loop',
      loop: true,
      xfade: 1,
      use: 'Under the sear or the bite, low. The last sample runs into the first, so it loops with no seam.',
      params: [
        R('length', 'Length', 10, 30, 1, 12, ' s'),
        R('pops', 'Pops', 1, 12, 0.5, 4, '/s'),
        R('crackle', 'Crackle', 0, 100, 1, 60, '%'),
        R('hiss', 'Oil hiss', 0, 100, 1, 40, '%'),
      ],
      duration: p => p.length + 1,
      build(k, p) {
        const { ctx, rng } = k
        const D = p.length + 1
        const n = Math.ceil(D * SR)
        // Hiss bed: white noise with a slow random wobble.
        const hiss = ctx.createBuffer(2, n, SR)
        for (let c = 0; c < 2; c++) {
          const d = hiss.getChannelData(c)
          const pts = Array.from(
            { length: Math.ceil(D * 4) + 2 },
            () => 0.6 + 0.4 * rng(),
          )
          for (let i = 0; i < n; i++) {
            const x = (i / SR) * 4
            const j = Math.floor(x)
            const f = x - j
            d[i] = (rng() * 2 - 1) * (pts[j] * (1 - f) + pts[j + 1] * f)
          }
        }
        // Crackle: dense micro-impulses. Pops: sparse louder bursts.
        const sparks = (rate, minLen, maxLen, ampFn) => {
          const buf = ctx.createBuffer(2, n, SR)
          const L = buf.getChannelData(0)
          const Rr = buf.getChannelData(1)
          let t = -Math.log(1 - rng()) / rate
          while (t < D) {
            const i0 = Math.floor(t * SR)
            const len = Math.floor(minLen + (maxLen - minLen) * rng())
            const amp = ampFn()
            const pan = rng()
            const gl = Math.cos(pan * PI2)
            const gr = Math.sin(pan * PI2)
            for (let j = 0; j < len && i0 + j < n; j++) {
              const e = Math.exp((-5 * j) / len) * (j < 3 ? (j + 1) / 4 : 1)
              const x = (rng() * 2 - 1) * amp * e
              L[i0 + j] += x * gl
              Rr[i0 + j] += x * gr
            }
            t += -Math.log(1 - rng()) / rate
          }
          return buf
        }
        const crackle = sparks(
          150 + p.crackle * 6,
          3,
          14,
          () => 0.15 + 0.85 * rng() ** 3,
        )
        const pops = sparks(
          p.pops,
          SR * 0.006,
          SR * 0.026,
          () => 0.5 + 0.5 * rng(),
        )
        const layer = (buf, filters, gain) => {
          const s = ctx.createBufferSource()
          s.buffer = buf
          const f = filterChain(k, s, filters, 0, D)
          const g = ctx.createGain()
          g.gain.value = gain
          f.connect(g).connect(k.out)
          s.start(0)
        }
        layer(
          hiss,
          [
            { type: 'highpass', f: 2200 },
            { type: 'lowpass', f: 10000 },
          ],
          (p.hiss / 100) * 0.35,
        )
        layer(
          crackle,
          [{ type: 'highpass', f: 1500 }],
          0.15 + (p.crackle / 100) * 0.75,
        )
        layer(
          pops,
          [
            { type: 'highpass', f: 300 },
            { type: 'lowpass', f: 7000 },
          ],
          0.8,
        )
      },
      /** Equal-power crossfade of the 1 s overrun into the head: a seamless loop. */
      post(chs, p) {
        const L = Math.round(p.length * SR)
        const X = Math.round(SR)
        return chs.map(src => {
          const o = new Float32Array(L)
          o.set(src.subarray(0, L))
          for (let i = 0; i < X; i++) {
            const w = (i / X) * PI2
            o[i] = src[i] * Math.sin(w) + src[L + i] * Math.cos(w)
          }
          return o
        })
      },
    },
    {
      id: 'drone',
      name: 'Lunar drone',
      tag: 'Bed',
      use: 'The ambient track for a Lunar Night reel at 20–30, or under a night beat in the documentary.',
      params: [
        R('length', 'Length', 15, 60, 1, 20, ' s'),
        R('root', 'Root', 30, 60, 0.5, 41, ' Hz'),
        R('filter', 'Darkness', 150, 900, 10, 360, ' Hz'),
        R('lfo', 'Drift rate', 0.02, 0.3, 0.01, 0.08, ' Hz'),
        R('width', 'Width', 0, 100, 1, 70, '%'),
      ],
      duration: p => p.length,
      build(k, p) {
        const { ctx, rng } = k
        const T = p.length
        const w = p.width / 100
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.Q.value = 4
        curve(
          lp.frequency,
          0,
          T,
          t => p.filter * (0.7 + 0.3 * Math.sin((Math.PI * t) / T)),
        )
        const lfo = ctx.createOscillator()
        lfo.frequency.value = p.lfo
        const lfoAmt = ctx.createGain()
        lfoAmt.gain.value = p.filter * 0.35
        lfo.connect(lfoAmt).connect(lp.frequency)
        const drift = ctx.createOscillator()
        drift.frequency.value = p.lfo * 0.37
        const driftAmt = ctx.createGain()
        driftAmt.gain.value = 0.25 * w
        drift.connect(driftAmt)
        const amp = ctx.createGain()
        const fi = Math.min(4, T * 0.2)
        const fo = Math.min(6, T * 0.25)
        env(amp.gain, 0, T, t => {
          const a = Math.sin(clamp(t / fi, 0, 1) * PI2) ** 2
          const b = Math.sin(clamp((T - t) / fo, 0, 1) * PI2) ** 2
          return a * b
        })
        lp.connect(amp).connect(k.out)
        const voices = [
          ['sawtooth', 1, -7, -w, 0.3, false],
          ['sawtooth', 1, 6, w, 0.3, false],
          ['sawtooth', 2, -5, -0.6 * w, 0.16, true],
          ['sawtooth', 2, 4, 0.6 * w, 0.16, true],
          ['triangle', 1.5, 2, 0, 0.1, false],
        ]
        if (p.root * 0.5 >= 20) voices.push(['sine', 0.5, 0, 0, 0.35, false])
        for (const [type, mult, cents, pan, gain, moves] of voices) {
          const o = ctx.createOscillator()
          o.type = type
          o.frequency.value = p.root * mult
          o.detune.value = cents + (rng() - 0.5) * 3
          const g = ctx.createGain()
          g.gain.value = gain
          const panner = ctx.createStereoPanner()
          panner.pan.value = pan
          if (moves) driftAmt.connect(panner.pan)
          o.connect(g).connect(panner).connect(lp)
          o.start(0)
          o.stop(T)
        }
        for (const o of [lfo, drift]) {
          o.start(0)
          o.stop(T)
        }
        const air = ctx.createBufferSource()
        air.buffer = noiseBuf(k, T)
        const airLp = filterChain(k, air, [{ type: 'lowpass', f: 220 }], 0, T)
        const airG = ctx.createGain()
        airG.gain.value = 0.08
        airLp.connect(airG).connect(amp)
        air.start(0)
      },
    },
    {
      id: 'thud',
      name: 'Walk-in thud',
      tag: 'Door',
      use: 'Walk-in door for the documentary open or the end of service. Room is a generated impulse through a ConvolverNode.',
      params: [
        R('room', 'Room size', 0.3, 1.6, 0.05, 0.7, ' s'),
        R('weight', 'Weight', 40, 90, 1, 56, ' Hz'),
        R('latch', 'Latch', 0, 100, 1, 60, '%'),
        R('mix', 'Room mix', 0, 100, 1, 35, '%'),
      ],
      duration: p => 0.15 + p.room + 0.35,
      build(k, p) {
        const { ctx, rng } = k
        const dry = ctx.createGain()
        dry.gain.value = 1 - (p.mix / 100) * 0.5
        dry.connect(k.out)
        // Procedural IR: decaying noise that darkens over time, plus early
        // reflections off steel walls (different per ear).
        const n = Math.ceil(p.room * SR)
        const ir = ctx.createBuffer(2, n, SR)
        for (let c = 0; c < 2; c++) {
          const d = ir.getChannelData(c)
          let y = 0
          for (let i = Math.floor(SR * 0.001); i < n; i++) {
            const t = i / SR
            const a = 0.15 + 0.8 * (t / p.room)
            y += (1 - a) * (rng() * 2 - 1 - y)
            d[i] = y * Math.exp((-6.9 * t) / p.room)
          }
          ;[0.0061, 0.0113, 0.0167, 0.0234, 0.0311].forEach((ms, j) => {
            const i = Math.floor((ms + (rng() - 0.5) * 0.002) * SR)
            if (i < n) d[i] += 0.6 * 0.8 ** j * (rng() < 0.5 ? -1 : 1)
          })
        }
        const conv = ctx.createConvolver()
        conv.normalize = true
        conv.buffer = ir
        const wet = ctx.createGain()
        wet.gain.value = (p.mix / 100) * 1.2
        dry.connect(conv)
        conv.connect(wet).connect(k.out)
        // Door slab: pitched thump, low noise body, gasket whump.
        tone(k, {
          t: 0.01,
          dur: 0.5,
          f: p.weight * 2.2,
          fEnd: p.weight,
          sweep: 0.09,
          attack: 0.003,
          tau: 0.085,
          dest: dry,
        })
        burst(k, {
          t: 0.01,
          dur: 0.25,
          attack: 0.002,
          tau: 0.045,
          amp: 0.9,
          filters: [{ type: 'lowpass', f: 260 }],
          dest: dry,
        })
        burst(k, {
          t: 0.014,
          dur: 0.12,
          tau: 0.03,
          amp: 0.3,
          filters: [{ type: 'bandpass', f: 700, Q: 0.8 }],
          dest: dry,
        })
        if (p.latch > 0) {
          const L = p.latch / 100
          burst(k, {
            t: 0.085,
            dur: 0.03,
            attack: 0.0003,
            tau: 0.004,
            amp: L * 0.9,
            filters: [{ type: 'bandpass', f: 2700, Q: 4 }],
            dest: dry,
          })
          burst(k, {
            t: 0.114,
            dur: 0.03,
            attack: 0.0003,
            tau: 0.003,
            amp: L * 0.7,
            filters: [{ type: 'bandpass', f: 4600, Q: 5 }],
            dest: dry,
          })
          for (const f of [3150, 4720, 6080])
            tone(k, {
              t: 0.114,
              dur: 0.12,
              f,
              tau: 0.035,
              amp: L * 0.07,
              dest: dry,
            })
        }
      },
    },
  ]
  const byId = Object.fromEntries(DESIGNS.map(d => [d.id, d]))

  const defaults = d => {
    const p = { seed: 1 }
    for (const q of d.params) p[q.key] = q.value
    return p
  }
  /** Merge and clamp user params onto a design's defaults. */
  function resolve(d, params = {}) {
    const p = defaults(d)
    for (const q of d.params) {
      const v = params[q.key]
      if (v == null) continue
      if (q.type === 'choice') {
        if (q.options.some(o => o.value === v)) p[q.key] = v
      } else if (Number.isFinite(Number(v)))
        p[q.key] = clamp(Number(v), q.min, q.max)
    }
    const s = Math.floor(Number(params.seed))
    if (Number.isFinite(s) && s > 0) p.seed = s % 1000000
    return p
  }
  const isDefault = (d, p) => {
    const def = defaults(d)
    return Object.keys(def).every(key => def[key] === p[key])
  }

  /* ------------------------------------------------------------ render */
  /**
   * Render a design to normalized stereo Float32 channels.
   * → {id, params, channels:[L,R], dur, peakDb, rmsDb, gainDb}
   */
  async function render(id, params) {
    const d = byId[id]
    if (!d) throw new Error(`Unknown sound design: ${id}`)
    const p = resolve(d, params)
    const dur = d.duration(p)
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext
    if (!OAC) throw new Error('This browser has no OfflineAudioContext.')
    const ctx = new OAC({
      numberOfChannels: 2,
      length: Math.ceil(dur * SR),
      sampleRate: SR,
    })
    const out = ctx.createGain()
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 16
    out.connect(hp).connect(ctx.destination)
    if (!d.loop) {
      // Guard: whatever a design leaves ringing ends at zero, not in a click.
      out.gain.setValueAtTime(1, Math.max(0, dur - 0.03))
      out.gain.linearRampToValueAtTime(0, dur)
    }
    d.build({ ctx, out, rng: mulberry32(p.seed ^ hashStr(id)) }, p)
    const buf = await ctx.startRendering()
    let chs = [buf.getChannelData(0), buf.getChannelData(1)]
    chs = d.post ? d.post(chs, p) : chs.map(c => new Float32Array(c))
    let peak = 0
    let sum = 0
    for (const c of chs)
      for (let i = 0; i < c.length; i++) {
        const a = Math.abs(c[i])
        if (a > peak) peak = a
        sum += c[i] * c[i]
      }
    const gain = peak > 0 ? TARGET / peak : 1
    for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= gain
    const len = chs[0].length
    const rms = Math.sqrt(sum / (len * chs.length)) * gain
    return {
      id,
      params: p,
      channels: chs,
      dur: len / SR,
      peakDb: 20 * Math.log10(peak * gain || 1e-9),
      rmsDb: 20 * Math.log10(rms || 1e-9),
      gainDb: 20 * Math.log10(gain),
    }
  }
  /** Render a design to a 48 kHz / 24-bit stereo WAV file. */
  const renderWav = async (id, params) =>
    LN.media.wav((await render(id, params)).channels, SR, 24)

  const fileName = (id, seed) => `kubrick-${id}-s${seed}.wav`

  const packReadme = rows =>
    [
      'KUBRICK SOUND PACK',
      '48 kHz, 24-bit, stereo WAV. Every file peaks at -1 dBFS.',
      'Rendered on your phone by the Sound Forge from seed 1 at default settings.',
      '',
      ...rows.map(
        r =>
          `${r.file}  ${r.dur.toFixed(2)} s  peak ${r.peakDb.toFixed(1)} dBFS  RMS ${r.rmsDb.toFixed(1)} dBFS\n  ${r.use}`,
      ),
      '',
      'HOUSE STYLE',
      '- Marketplace Review: voice 100, music 10-20, one SFX per big moment at 30-60.',
      '- Lunar Night reels: no SFX. Ambient track at 20-30 (the drone works) or the night sound at 100.',
      '- Road to Three Stars: voice first, music ducked under speech.',
      '',
      'INTO CAPCUT (labels vary; check on your phone)',
      '1. Files by Google > Browse > Downloads > tap the .zip > Extract.',
      '2. CapCut: playhead on the moment > Audio > Sounds > Your sounds > From device > pick the .wav.',
      '3. Tap the sound > Volume > 30-60 for an SFX.',
      'If a .wav does not show up, move it into Music/ with Files by Google.',
      '',
    ].join('\n')

  /** All eight designs at defaults (seed 1), zipped with a README. → Blob */
  async function buildPack(onStep, cache = {}) {
    const files = []
    const rows = []
    for (let i = 0; i < DESIGNS.length; i++) {
      const d = DESIGNS[i]
      if (onStep) onStep(i, d)
      const r = cache[d.id] || (await render(d.id, {}))
      const file = `${LN.fmt.pad(i + 1)}-${d.id}.wav`
      files.push({
        name: `kubrick-sfx/${file}`,
        data: LN.media.wav(r.channels, SR, 24),
      })
      rows.push({
        file,
        dur: r.dur,
        peakDb: r.peakDb,
        rmsDb: r.rmsDb,
        use: d.use,
      })
    }
    files.push({ name: 'kubrick-sfx/README.txt', data: packReadme(rows) })
    return LN.zip(files)
  }

  /* ------------------------------------------------------------ playback */
  let actx = null
  let playing = null
  function stopPlayback() {
    if (!playing) return
    const p = playing
    playing = null
    try {
      p.src.stop()
    } catch (_e) {
      /* already stopped */
    }
    p.onEnd()
  }
  function play(result, loop, onEnd) {
    stopPlayback()
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) throw new Error('Audio playback is not available here.')
      actx = new AC({ latencyHint: 'playback' })
    }
    if (actx.state === 'suspended') actx.resume()
    const [L, Rch] = result.channels
    const buf = actx.createBuffer(2, L.length, SR)
    buf.copyToChannel(L, 0)
    buf.copyToChannel(Rch, 1)
    const src = actx.createBufferSource()
    src.buffer = buf
    src.loop = loop
    src.connect(actx.destination)
    const me = { src, start: actx.currentTime + 0.02, dur: result.dur, onEnd }
    src.onended = () => {
      if (playing === me) {
        playing = null
        onEnd()
      }
    }
    src.start(me.start)
    playing = me
    return me
  }
  const playhead = me => {
    if (!actx || playing !== me) return -1
    const t = actx.currentTime - me.start
    if (t < 0) return 0
    return (t % me.dur) / me.dur
  }

  /* ------------------------------------------------------------ waveform */
  function drawWave(canvas, result, color, head = -1) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const ch = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    const g = canvas.getContext('2d')
    g.clearRect(0, 0, cw, ch)
    g.fillStyle = LN.palette.uiBg
    g.fillRect(0, 0, cw, ch)
    const lane = ch / 2
    g.fillStyle = `${color}1f`
    g.fillRect(0, 0, cw, ch)
    g.fillStyle = `${color}33`
    g.fillRect(0, lane - 0.5 * dpr, cw, dpr)
    if (result) {
      if (!result.cols || result.cols.w !== cw) {
        // Min/max per pixel column, cached per width.
        const cols = { w: cw, data: [] }
        for (const c of result.channels) {
          const mm = new Float32Array(cw * 2)
          const step = c.length / cw
          for (let x = 0; x < cw; x++) {
            let lo = 0
            let hi = 0
            const a = Math.floor(x * step)
            const b = Math.min(c.length, Math.floor((x + 1) * step) + 1)
            for (let i = a; i < b; i++) {
              const v = c[i]
              if (v < lo) lo = v
              if (v > hi) hi = v
            }
            mm[x * 2] = lo
            mm[x * 2 + 1] = hi
          }
          cols.data.push(mm)
        }
        result.cols = cols
      }
      g.fillStyle = color
      result.cols.data.forEach((mm, ci) => {
        const mid = lane * ci + lane / 2
        const amp = lane / 2 - 2 * dpr
        for (let x = 0; x < cw; x++) {
          const y0 = mid - mm[x * 2 + 1] * amp
          const y1 = mid - mm[x * 2] * amp
          g.fillRect(x, y0, 1, Math.max(dpr * 0.75, y1 - y0))
        }
      })
    }
    if (head >= 0) {
      const x = Math.round(head * cw)
      g.fillStyle = '#ffffff'
      g.fillRect(x - dpr, 0, 2 * dpr, ch)
      g.fillRect(x - 3 * dpr, 0, 6 * dpr, 3 * dpr)
    }
  }

  /* ------------------------------------------------------------ UI */
  const fmtVal = q => v => {
    const dec = q.step < 0.1 ? 2 : q.step < 1 ? 1 : 0
    return `${Number(v).toFixed(dec)}${q.unit}`
  }
  const dbfs = db => `${LN.fmt.signed(db, 1)} dBFS`

  function mount(root) {
    const saved = LN.store.get(STORE_KEY, {}) || {}
    const state = {}
    for (const d of DESIGNS) state[d.id] = resolve(d, saved[d.id])
    const persist = () => LN.store.set(STORE_KEY, state)
    const defaultCache = {}
    let queue = Promise.resolve()
    const enqueue = fn => {
      const p = queue.then(fn)
      queue = p.catch(() => {})
      return p
    }

    const cards = DESIGNS.map((d, i) => buildCard(d, i))

    function buildCard(d, i) {
      const color = LN.palette.tracks[i % LN.palette.tracks.length]
      const c = { d, result: null, pending: null, token: 0, me: null, raf: 0 }
      const canvas = h('canvas', {
        class: 'sf-wave',
        role: 'img',
        'aria-label': `Waveform of ${d.name}, left channel above right`,
      })
      const len = h('span', { class: 'sf-len' }, '…')
      const peak = h('span', { class: 'sf-peak' }, 'Rendering…')
      const rms = h('span', null, '')
      const size = h('span', null, '')
      const controls = []
      const paramEls = d.params.map(q => {
        if (q.type === 'choice') {
          const s = ui.seg({
            label: q.label,
            options: q.options,
            value: state[d.id][q.key],
            onChange: v => change(q.key, v),
          })
          controls.push([q, s])
          return s.el
        }
        const s = ui.slider({
          label: q.label,
          min: q.min,
          max: q.max,
          step: q.step,
          value: state[d.id][q.key],
          format: fmtVal(q),
          onInput: v => change(q.key, v),
        })
        controls.push([q, s])
        return s.el
      })
      const seed = ui.field({
        label: 'Seed',
        type: 'number',
        value: state[d.id].seed,
        onInput: v => {
          const n = Math.floor(Number(v))
          if (n > 0) change('seed', n % 1000000)
        },
      })
      seed.input.setAttribute('min', '1')
      seed.input.setAttribute('inputmode', 'numeric')
      const playBtn = ui.btn('Play', () => togglePlay(), {
        kind: 'quiet',
        aria: `Play ${d.name}`,
      })
      playBtn.setAttribute('aria-pressed', 'false')
      const saveBtn = ui.btn('Save .wav', () => saveOne(), { kind: 'ghost' })

      function change(key, v) {
        state[d.id] = resolve(d, { ...state[d.id], [key]: v })
        persist()
        schedule(220)
      }
      function syncControls() {
        for (const [q, s] of controls) s.set(state[d.id][q.key])
        seed.set(state[d.id].seed)
      }
      let timer = 0
      function schedule(ms) {
        clearTimeout(timer)
        peak.textContent = 'Rendering…'
        c.pending = new Promise(res => {
          timer = setTimeout(() => res(rerender()), ms)
        })
        return c.pending
      }
      async function rerender() {
        const token = ++c.token
        const p = { ...state[d.id] }
        try {
          const r = await enqueue(() => render(d.id, p))
          if (isDefault(d, r.params)) defaultCache[d.id] = r
          if (token !== c.token) return c.result
          c.result = r
          if (c.me) stop()
          paint()
          return r
        } catch (e) {
          console.warn('[Sound Forge] render failed', e)
          peak.textContent = 'Render failed'
          LN.toast(`${d.name} could not render: ${e.message}`, { kind: 'err' })
          return null
        }
      }
      function paint() {
        const r = c.result
        drawWave(canvas, r, color, c.me ? playhead(c.me) : -1)
        if (!r) return
        len.textContent = `${r.dur.toFixed(2)} s`
        peak.textContent = `Peak ${dbfs(r.peakDb)}`
        rms.textContent = `RMS ${dbfs(r.rmsDb)}`
        size.textContent = LN.fmt.bytes(44 + r.channels[0].length * 6)
      }
      function tick() {
        if (!c.me) return
        drawWave(canvas, c.result, color, playhead(c.me))
        c.raf = requestAnimationFrame(tick)
      }
      function stop() {
        if (c.me) stopPlayback()
      }
      function ended() {
        c.me = null
        cancelAnimationFrame(c.raf)
        playBtn.textContent = 'Play'
        playBtn.setAttribute('aria-pressed', 'false')
        drawWave(canvas, c.result, color, -1)
      }
      async function togglePlay() {
        if (c.me) {
          stop()
          return
        }
        const r = c.pending ? await c.pending : c.result
        if (!r) return
        try {
          c.me = play(r, !!d.loop, ended)
        } catch (e) {
          LN.toast(e.message, { kind: 'err' })
          return
        }
        playBtn.textContent = d.loop ? 'Stop loop' : 'Stop'
        playBtn.setAttribute('aria-pressed', 'true')
        if (!LN.reducedMotion()) tick()
      }
      async function saveOne() {
        const r = c.pending ? await c.pending : c.result
        if (!r) return
        await LN.save({
          filename: fileName(d.id, r.params.seed),
          data: LN.media.wav(r.channels, SR, 24),
          mime: 'audio/wav',
        })
      }

      const el = h(
        'article',
        {
          class: 'sf-card',
          style: { '--sf-c': `var(--t${(i % 6) + 1})` },
          dataset: { design: d.id },
        },
        h(
          'header',
          { class: 'sf-head' },
          h('span', { class: 'sf-num' }, LN.fmt.pad(i + 1)),
          h(
            'div',
            { class: 'sf-title' },
            h('h3', null, d.name),
            h('span', { class: 'sf-tag' }, d.tag),
          ),
          len,
        ),
        h('p', { class: 'sf-use' }, d.use),
        h('div', { class: 'sf-clip' }, canvas),
        h('div', { class: 'sf-meter' }, peak, rms, size),
        h('div', { class: 'sf-params' }, paramEls),
        h(
          'div',
          { class: 'sf-foot' },
          h('div', { class: 'sf-seed' }, seed.el),
          ui.btn(
            'New seed',
            () => {
              const n = 1 + Math.floor(Math.random() * 99999)
              state[d.id] = { ...state[d.id], seed: n }
              seed.set(n)
              persist()
              schedule(0)
            },
            { kind: 'quiet', small: true },
          ),
          ui.btn(
            'Defaults',
            () => {
              state[d.id] = defaults(d)
              syncControls()
              persist()
              schedule(0)
            },
            { kind: 'quiet', small: true },
          ),
        ),
        h('div', { class: 'sf-acts' }, playBtn, saveBtn),
      )
      Object.assign(c, { el, canvas, schedule, paint, stop, color })
      return c
    }

    /* Pack */
    const packStatus = h(
      'span',
      { class: 'sf-status', role: 'status' },
      'All eight at defaults, seed 1, plus a README.',
    )
    const packBtn = ui.btn('Download SFX pack (.zip)', async () => {
      stopPlayback()
      packBtn.disabled = true
      try {
        const blob = await buildPack((i, d) => {
          packStatus.textContent = `Rendering ${i + 1}/8 · ${d.name}`
        }, defaultCache)
        packStatus.textContent = `Pack ready · ${LN.fmt.bytes(blob.size)}`
        await LN.save({
          filename: 'kubrick-sfx-pack.zip',
          data: blob,
          mime: 'application/zip',
        })
      } catch (e) {
        packStatus.textContent = 'The pack could not render.'
        LN.toast(e.message || 'Pack failed', { kind: 'err' })
      } finally {
        packBtn.disabled = false
      }
    })

    const spec = h(
      'div',
      { class: 'sf-spec' },
      ['48 kHz', '24-bit', 'Stereo', 'Peak −1 dBFS', 'Seeded'].map(t =>
        h('span', null, t),
      ),
    )

    const intro = ui.section(
      {
        eyebrow: 'Sound Forge',
        title: 'Eight house sounds, synthesized here',
        lede: 'Each sound is built on your phone from oscillators, filtered noise and a seed. The same seed always gives the same file. Shape it, play it, save the .wav.',
      },
      h(
        'div',
        { class: 'sf-bar' },
        spec,
        h('div', { class: 'sf-pack' }, packBtn, packStatus),
      ),
      ui.callout(
        'tip',
        h(
          'span',
          null,
          'In claude.ai a .wav arrives inside a .zip. Extract it in Files by Google: ',
          ui.path('Browse', 'Downloads', 'tap the .zip', 'Extract'),
          '.',
        ),
        'Extract in Files by Google',
      ),
    )

    const grid = h(
      'div',
      { class: 'sf-grid' },
      cards.map(c => c.el),
    )

    const rules = ui.section(
      {
        eyebrow: 'House style',
        title: 'Where a sound is allowed',
        lede: 'One SFX per big moment, never a bed of them. Night reels get none.',
      },
      ui.table(
        ['Format', 'Sound rule', 'From this page'],
        [
          [
            'Marketplace Review',
            'Voice 100, music 10–20, one SFX per big moment at 30–60.',
            'Sub drop on the verdict, riser into the reveal, shutter on the cover, sizzle under the bite.',
          ],
          [
            'Lunar Night reel',
            'Ambient track at 20–30 or the night sound at 100. No voice, no SFX.',
            'Only the lunar drone, as the ambient track at 20–30.',
          ],
          [
            'Road to Three Stars',
            'Voice first. Music ducked under speech; foley close and loud.',
            'Walk-in thud, knife steel, tape stop on a VHS confession.',
          ],
        ],
        { label: 'Sound rules by format' },
      ),
      ui.callout(
        'rule',
        'Night reels use no SFX. Leave everything but the drone off a Lunar Night reel.',
        'Runbook',
      ),
    )

    const capcut = ui.section(
      {
        eyebrow: 'Into CapCut',
        title: 'From the zip to the timeline',
      },
      ui.steps([
        h(
          'span',
          null,
          'Save one .wav or the pack. Then extract it: ',
          ui.path(
            'Files by Google',
            'Browse',
            'Downloads',
            'tap the .zip',
            'Extract',
          ),
          '.',
        ),
        h(
          'span',
          null,
          'In CapCut, park the playhead on the moment, then ',
          ui.path('Audio', 'Sounds', 'Your sounds', 'From device'),
          ' and pick the .wav.',
        ),
        h(
          'span',
          null,
          'Tap the sound, then ',
          ui.path('Volume'),
          ': 30–60 for an SFX, 20–30 for the drone on a night reel.',
        ),
        h(
          'span',
          null,
          'For a longer sizzle, place the loop twice end to end. The seam is crossfaded, so it does not click.',
        ),
      ]),
      ui.callout(
        'verify',
        h(
          'span',
          null,
          'Device audio import is noted as ',
          ui.path('Audio', 'Sounds', 'Your sounds', 'From device'),
          ', but the tab names were not checked on a 2026 build. On your phone, confirm that Sounds has a device tab and that an extracted .wav appears there. If it doesn’t, move the .wav into Music/ with Files by Google and look again.',
        ),
      ),
    )

    root.append(h('div', { class: 'sf' }, intro, grid, rules, capcut))

    // First frame: every card renders at its saved settings, one at a time.
    for (const c of cards) c.schedule(0)

    // Keep waveforms crisp on resize; stop sound when the tab or view hides.
    if (typeof ResizeObserver === 'function') {
      let rt = 0
      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(rt)
        rt = requestAnimationFrame(() => {
          for (const c of cards) c.paint()
        })
      })
      ro.observe(grid)
    }
    LN.bus.on('route', id => {
      if (id !== 'forge') stopPlayback()
    })
    if (typeof MutationObserver === 'function')
      new MutationObserver(() => {
        if (root.hidden) stopPlayback()
      }).observe(root, { attributes: true, attributeFilter: ['hidden'] })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') stopPlayback()
    })
  }

  LN.forgeAudio = {
    mount,
    DESIGNS,
    renderWav,
    render,
    buildPack,
    SAMPLE_RATE: SR,
  }
})()
