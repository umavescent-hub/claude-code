/* Kubrick — core runtime. No dependencies. Exposes window.LN.
   Every module registers itself with LN.register({...}); LN.boot() renders the
   shell, the home view and the router. See ../CONTRACT.md for the full API. */
;(() => {
  const LN = (window.LN = window.LN || {})
  LN.version = '1.0.0'
  LN.data = LN.data || {}
  LN.modules = LN.modules || []
  LN.failed = LN.failed || []

  /* ------------------------------------------------------------ math */
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
  const lerp = (a, b, t) => a + (b - a) * t
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
  }
  LN.math = {
    clamp,
    lerp,
    mix: lerp,
    smoothstep,
    fract: x => x - Math.floor(x),
    round: (x, d = 0) => {
      const p = 10 ** d
      return Math.round(x * p) / p
    },
  }

  /* ------------------------------------------------------------ DOM */
  const SVGNS = 'http://www.w3.org/2000/svg'
  let uidN = 0
  function build(el, props, kids, isSvg) {
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k]
        if (v == null || v === false) continue
        if (k === 'class') el.setAttribute('class', v)
        else if (k === 'style' && typeof v === 'object') {
          for (const s of Object.keys(v)) {
            if (s.startsWith('--')) el.style.setProperty(s, v[s])
            else el.style[s] = v[s]
          }
        } else if (k === 'html') el.innerHTML = v
        else if (k === 'text') el.textContent = v
        else if (k === 'dataset') Object.assign(el.dataset, v)
        else if (k === 'ref' && typeof v === 'function') v(el)
        else if (k.startsWith('on') && typeof v === 'function')
          el.addEventListener(k.slice(2).toLowerCase(), v)
        else if (
          !isSvg &&
          (k === 'value' || k === 'checked' || k === 'selected')
        )
          el[k] = v
        else if (v === true) el.setAttribute(k, '')
        else el.setAttribute(k, String(v))
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false || kid === true) continue
      el.append(kid instanceof Node ? kid : String(kid))
    }
    return el
  }
  /** Element builder: LN.h('div', {class:'x', onClick: fn}, 'text', child) */
  LN.h = (tag, props, ...kids) =>
    build(document.createElement(tag), props, kids, false)
  /** SVG element builder with the same signature. */
  LN.s = (tag, props, ...kids) =>
    build(document.createElementNS(SVGNS, tag), props, kids, true)
  LN.$ = (sel, root = document) => root.querySelector(sel)
  LN.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel))
  LN.uid = (p = 'ln') => `${p}-${(++uidN).toString(36)}`
  LN.reducedMotion = () => {
    try {
      return matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch (_e) {
      return false
    }
  }

  /* ------------------------------------------------------------ storage */
  const PREFIX = 'lnos:'
  LN.store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(PREFIX + key)
        return v == null ? fallback : JSON.parse(v)
      } catch (_e) {
        return fallback
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value))
        return true
      } catch (_e) {
        return false
      }
    },
    del(key) {
      try {
        localStorage.removeItem(PREFIX + key)
      } catch (_e) {
        /* storage unavailable */
      }
    },
  }

  /* ------------------------------------------------------------ events */
  const handlers = new Map()
  LN.bus = {
    on(evt, fn) {
      if (!handlers.has(evt)) handlers.set(evt, new Set())
      handlers.get(evt).add(fn)
      return () => handlers.get(evt).delete(fn)
    },
    emit(evt, data) {
      const set = handlers.get(evt)
      if (!set) return
      for (const fn of Array.from(set)) {
        try {
          fn(data)
        } catch (e) {
          console.error(`[LN] handler for "${evt}" failed`, e)
        }
      }
    },
  }

  /* ------------------------------------------------------------ toast + sheet */
  let toastHost = null
  LN.toast = (msg, opts = {}) => {
    const kind = opts.kind || 'ok'
    const ms = opts.ms || 3400
    if (!toastHost) {
      toastHost = LN.h('div', {
        class: 'ln-toasts',
        role: 'status',
        'aria-live': 'polite',
      })
      document.body.append(toastHost)
    }
    const t = LN.h('div', { class: `ln-toast ${kind}` }, msg)
    toastHost.append(t)
    setTimeout(() => t.remove(), ms)
    return t
  }

  /** In-page dialog (alert/confirm never show in the viewer).
   *  LN.sheet({title, body: Node|string, actions:[{label, kind, onClick}]}) → {close} */
  LN.sheet = ({ title, body, actions = [], onClose } = {}) => {
    const prevFocus = document.activeElement
    const close = () => {
      backdrop.remove()
      document.removeEventListener('keydown', onKey)
      if (onClose) onClose()
      if (prevFocus && prevFocus.focus) prevFocus.focus()
    }
    const onKey = e => {
      if (e.key === 'Escape') close()
    }
    const acts = actions.length
      ? actions
      : [{ label: 'Close', kind: 'quiet', onClick: close }]
    const sheet = LN.h(
      'div',
      { class: 'ln-sheet', role: 'dialog', 'aria-modal': 'true' },
      title ? LN.h('h2', { class: 'ln-h2' }, title) : null,
      typeof body === 'string'
        ? LN.h('div', { class: 'ln-prose' }, body)
        : body,
      LN.h(
        'div',
        { class: 'ln-row' },
        acts.map(a =>
          LN.h(
            'button',
            {
              class: `ln-btn ${a.kind || ''}`,
              type: 'button',
              onClick: () => {
                const keep = a.onClick ? a.onClick(close) : false
                if (keep !== true) close()
              },
            },
            a.label,
          ),
        ),
      ),
    )
    const backdrop = LN.h(
      'div',
      {
        class: 'ln-sheet-backdrop',
        onClick: e => {
          if (e.target === backdrop) close()
        },
      },
      sheet,
    )
    document.body.append(backdrop)
    document.addEventListener('keydown', onKey)
    const firstBtn = sheet.querySelector('button, textarea, input')
    if (firstBtn) firstBtn.focus()
    return { close, el: sheet }
  }

  /** Copy text inside a click handler. Falls back to a sheet with the text selected. */
  LN.copy = async (text, opts = {}) => {
    try {
      await navigator.clipboard.writeText(text)
      LN.toast(opts.label || 'Copied')
      return true
    } catch (_e) {
      const ta = LN.h('textarea', {
        class: 'ln-textarea',
        rows: 10,
        readonly: true,
      })
      ta.value = text
      LN.sheet({
        title: 'Copy this text',
        body: LN.h(
          'div',
          { class: 'ln-stack' },
          LN.h(
            'p',
            { class: 'ln-muted ln-small' },
            'Clipboard access is blocked here. The text is selected: long-press and choose Copy.',
          ),
          ta,
        ),
      })
      setTimeout(() => {
        ta.focus()
        ta.select()
      }, 30)
      return false
    }
  }

  /* ------------------------------------------------------------ claude runtime bridge */
  function claudeUse(name) {
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        return Promise.resolve(window.claude.use(name)).catch(() => null)
      }
    } catch (_e) {
      /* not in a viewer */
    }
    return Promise.resolve(null)
  }
  LN.inViewer = () =>
    !!(window.claude && typeof window.claude.use === 'function')

  /* ------------------------------------------------------------ zip (store method) */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })()
  LN.crc32 = bytes => {
    let crc = -1
    for (let i = 0; i < bytes.length; i++)
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
    return (crc ^ -1) >>> 0
  }
  async function toBytes(d) {
    if (d instanceof Uint8Array) return d
    if (d instanceof ArrayBuffer) return new Uint8Array(d)
    if (ArrayBuffer.isView(d))
      return new Uint8Array(d.buffer, d.byteOffset, d.byteLength)
    if (typeof Blob !== 'undefined' && d instanceof Blob)
      return new Uint8Array(await d.arrayBuffer())
    return new TextEncoder().encode(String(d))
  }
  /** Build a .zip Blob (no compression). files: [{name, data: string|Uint8Array|ArrayBuffer|Blob}] */
  LN.zip = async files => {
    const enc = new TextEncoder()
    const parts = []
    const central = []
    let offset = 0
    const now = new Date()
    const dosTime =
      ((now.getHours() << 11) |
        (now.getMinutes() << 5) |
        (now.getSeconds() >> 1)) &
      0xffff
    const dosDate =
      (((now.getFullYear() - 1980) << 9) |
        ((now.getMonth() + 1) << 5) |
        now.getDate()) &
      0xffff
    for (const f of files) {
      const name = enc.encode(f.name)
      const data = await toBytes(f.data)
      const crc = LN.crc32(data)
      const lh = new DataView(new ArrayBuffer(30))
      lh.setUint32(0, 0x04034b50, true)
      lh.setUint16(4, 20, true)
      lh.setUint16(6, 0x0800, true)
      lh.setUint16(8, 0, true)
      lh.setUint16(10, dosTime, true)
      lh.setUint16(12, dosDate, true)
      lh.setUint32(14, crc, true)
      lh.setUint32(18, data.length, true)
      lh.setUint32(22, data.length, true)
      lh.setUint16(26, name.length, true)
      lh.setUint16(28, 0, true)
      parts.push(new Uint8Array(lh.buffer), name, data)
      const ch = new DataView(new ArrayBuffer(46))
      ch.setUint32(0, 0x02014b50, true)
      ch.setUint16(4, 20, true)
      ch.setUint16(6, 20, true)
      ch.setUint16(8, 0x0800, true)
      ch.setUint16(10, 0, true)
      ch.setUint16(12, dosTime, true)
      ch.setUint16(14, dosDate, true)
      ch.setUint32(16, crc, true)
      ch.setUint32(20, data.length, true)
      ch.setUint32(24, data.length, true)
      ch.setUint16(28, name.length, true)
      ch.setUint32(42, offset, true)
      central.push(new Uint8Array(ch.buffer), name)
      offset += 30 + name.length + data.length
    }
    const cdSize = central.reduce((s, p) => s + p.length, 0)
    const end = new DataView(new ArrayBuffer(22))
    end.setUint32(0, 0x06054b50, true)
    end.setUint16(8, files.length, true)
    end.setUint16(10, files.length, true)
    end.setUint32(12, cdSize, true)
    end.setUint32(16, offset, true)
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], {
      type: 'application/zip',
    })
  }

  /* ------------------------------------------------------------ saving files */
  // Extensions the viewer's `downloads` capability accepts. Anything else (.cube, .wav)
  // is wrapped in a .zip automatically when saving inside the viewer.
  LN.SAVE_EXT = new Set(
    'gif png jpg jpeg webp mp4 webm mov txt json md docx pptx epub csv ttf html svg pdf xlsx zip fig'.split(
      ' ',
    ),
  )
  let downloadsP = null
  LN.downloads = () => {
    if (!downloadsP) downloadsP = claudeUse('downloads')
    return downloadsP
  }
  const SAVE_COPY = {
    declined: 'Save cancelled.',
    rate_limited: 'Another save prompt is open. Finish it, then try again.',
    too_large:
      'That file is too large to save here. Try a shorter or smaller version.',
    rejected_extension: 'This file type cannot be saved here.',
    extension_not_enabled: 'This file type is switched off in this view.',
    bad_request: 'The file could not be prepared. Try again.',
  }
  function nativeDownload(filename, blob) {
    const url = URL.createObjectURL(blob)
    const a = LN.h('a', {
      href: url,
      download: filename,
      style: { display: 'none' },
    })
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
  /**
   * Offer a generated file to the viewer.
   * LN.save({filename, data, mime}) → 'saved' | 'declined' | 'unavailable' | errorCode
   * Inside claude.ai it uses the `downloads` capability (viewer confirms each save);
   * a non-allowlisted extension is zipped first. In a standalone copy it downloads natively.
   */
  LN.save = async ({ filename, data, mime, quiet } = {}) => {
    let name = String(filename || 'lunar-night-file.txt')
    const ext = (name.split('.').pop() || '').toLowerCase()
    const dl = await LN.downloads()
    if (dl) {
      let payload = data
      if (!LN.SAVE_EXT.has(ext)) {
        payload = await LN.zip([{ name, data }])
        name = `${name}.zip`
      }
      if (
        typeof payload === 'string' ||
        payload instanceof Blob ||
        payload instanceof ArrayBuffer ||
        ArrayBuffer.isView(payload)
      ) {
        /* acceptable as-is */
      } else {
        payload = String(payload)
      }
      try {
        await dl.save({ filename: name, data: payload })
        if (!quiet) LN.toast(`Saved ${name}`)
        return 'saved'
      } catch (e) {
        const code = (e && e.code) || 'unavailable'
        LN.toast(
          SAVE_COPY[code] ||
            'Saving is unavailable in this view. Open the page in claude.ai, or use the offline copy.',
          { kind: code === 'declined' ? 'warn' : 'err' },
        )
        return code
      }
    }
    if (!LN.inViewer()) {
      const blob =
        data instanceof Blob
          ? data
          : new Blob([data], { type: mime || 'application/octet-stream' })
      nativeDownload(name, blob)
      if (!quiet) LN.toast(`Downloading ${name}`)
      return 'saved'
    }
    LN.toast(
      'Saving files is unavailable in this view. Open the page from claude.ai, or save the offline copy from the footer.',
      { kind: 'err', ms: 6000 },
    )
    return 'unavailable'
  }
  /** True when this view can hand the viewer a file. */
  LN.canSave = async () => !!(await LN.downloads()) || !LN.inViewer()

  /* ------------------------------------------------------------ Claude (Fable 5.1) via `sample` */
  let sampleP = null
  const sampleNS = () => {
    if (!sampleP) sampleP = claudeUse('sample')
    return sampleP
  }
  const AI_COPY = {
    unavailable:
      'Fable 5.1 is reachable only when this page is open in claude.ai. The recipe text below still works: copy it into a Fable 5.1 chat.',
    not_granted:
      'Claude access was not allowed for this page. Reload the page to be asked again.',
    sampling_disabled: 'Claude is not available for this account.',
    rate_limited: 'Usage limit reached for now. Try again in a little while.',
    session_expired: 'Sign in to claude.ai again, then retry.',
    refused: 'Fable 5.1 declined this request. Rephrase it and try again.',
    empty_completion: 'No answer came back. Ask for less at a time.',
    invalid_json: 'The answer was not in the expected format. Try again.',
    upstream_error: 'Connection dropped. Try again.',
    image_rejected:
      'That image could not be sent. Use a JPEG or PNG under 20 MB.',
    images_unavailable:
      'Images cannot be sent from this view; text requests still work.',
    prompt_too_large: 'Too much text in one request. Shorten it.',
    cancelled: 'Stopped.',
  }
  /* ------------------------------------------------------------ Brand Brain (style memory) */
  // The chef's style guide plus a log of approved edits and the manual tweaks made after
  // AI passes. Every Fable 5.1 call carries it, so the "editor" learns the chef's taste.
  const BRAIN_KEY = 'brain.v1'
  const BRAIN_STYLE = `LUNAR NIGHT STYLE GUIDE (edit this to make it yours)
Who: a Native (Ohkay Owingeh / Tewa Pueblo) chef in Santa Fe chasing three Michelin stars. Formats: recipe R&D, raw restaurant reviews, a night documentary of the climb, and Lunar Night reels.
The look (LunarNight v2, measured from the reference reels): a true black floor (crush everything under about 2.5%; never lift; never touch Fade); a low paper white (0.30-0.44) so only light cores go bright; darks pushed violet (or deep blue for the small-town variant), never grey; coloured practical lights kept pure (green porch bulbs, orange sodium, neon blue, red tail lights). About 70% is made in camera: ~3200K white balance, 1.5-2 stops under, a slow 360-degree shutter (1/24 s at 24 fps) that streaks moving lights, and a dead-still braced frame.
Food inside the look: the dish is the practical light. Tungsten amber (#E5A93C) and sear crimson (#9E2A2B) warmth in an obsidian (#08080A) world; steel and glass stay cold lunar silver (#C8D0DC). Macro razor-sharp. Dreamcore only for memory and heritage; VHS 4:3 only for confessions, failures and archive chaos.
Pacing: reels are 3-5 s static holds, hard cuts, no transitions, the car-pass or hero shot third or last. Documentary and R&D: hook inside 0-3 s, montage cuts about every 1.8 s on action apexes, emotional beats about 4.5 s.
Sound: reels use a slowed or ambient track at 20-30 or the night sound at 100, no voice, no SFX. Documentary: dialogue first, music ducked under speech, foley close and loud.
Type: reels use lime #D6DB05 in a condensed sans (Oswald, Antonio or Estrella Early), lowercase, two short lines, no punctuation, centred in the upper third, small black shadow, no box, no outline, no animation, on screen for the first 3 s. Documentary chapter titles use a high-contrast serif with tight tracking plus all-caps mono data lines.
Delivery: 1080p at the capture frame rate (24 fps), higher bitrate; keep the top 130 px, right 140 px and bottom 484 px clear of text.
Marketplace Review (the TikTok main series): 25-40 s (or 65-90 s with the verdict after 60 s when chasing Creator Rewards); cuts every 1-3 s, every pause cut, hard cuts, at most 2 transitions; 2-3 push-ins of 8-15% on the bite, money shot and verdict; hook card in a white box with black Inter Bold, lowercase, 8 words max, about 2 s; captions Inter Bold white with black outline, 3-4 words a line, always on; title and cover in Estrella Early, 4 words max; voice 100, music 10-20, one SFX per big moment at 30-60; end on the verdict and a rating card held 1.5 s, no goodbye.
Colour order: correct each clip, match, grade on one adjustment layer, then the look (LUT 50-70%), then finish (halation, grain, vignette). Food: warm the plate highlights, cool the background, keep reds and oranges honest, never touch the Orange hue; the skin-tone line stays put.
Voice: plain, specific, unhurried; kitchen vernacular; no hype words; no invented numbers; credit people and places; heritage told with care and specifics, never as decoration.
Never: lifted grey blacks in the dark look, stock transitions, emoji captions, fake urgency, fake-shock thumbnails, pure yellow text on food.`
  const brainDefault = () => ({
    styleGuide: BRAIN_STYLE,
    approved: [],
    tweaks: [],
    updatedAt: 0,
  })
  const loadBrain = () => {
    const b = LN.store.get(BRAIN_KEY, null)
    if (!b || typeof b !== 'object') return brainDefault()
    return {
      ...brainDefault(),
      ...b,
      approved: Array.isArray(b.approved) ? b.approved : [],
      tweaks: Array.isArray(b.tweaks) ? b.tweaks : [],
    }
  }
  const saveBrain = b => {
    b.updatedAt = Date.now()
    LN.store.set(BRAIN_KEY, b)
    LN.bus.emit('brain', b)
    return b
  }
  const newId = p =>
    `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  LN.brain = {
    DEFAULT_STYLE: BRAIN_STYLE,
    get: () => loadBrain(),
    setStyle: text =>
      saveBrain({ ...loadBrain(), styleGuide: String(text || '') }),
    /** Log an edit the chef approved: {title, format, hook, pacing, music, look, whatWorked, notes} */
    addApproved: entry => {
      const b = loadBrain()
      b.approved.unshift({
        id: newId('a'),
        date: new Date().toISOString().slice(0, 10),
        ...entry,
      })
      return saveBrain(b)
    },
    /** Log a manual tweak made in CapCut after an AI pass: {project, area, before, after, why} */
    addTweak: entry => {
      const b = loadBrain()
      b.tweaks.unshift({
        id: newId('k'),
        date: new Date().toISOString().slice(0, 10),
        ...entry,
      })
      return saveBrain(b)
    },
    remove: (kind, id) => {
      const b = loadBrain()
      if (kind === 'approved') b.approved = b.approved.filter(x => x.id !== id)
      if (kind === 'tweaks') b.tweaks = b.tweaks.filter(x => x.id !== id)
      return saveBrain(b)
    },
    reset: () => saveBrain(brainDefault()),
    export: () =>
      JSON.stringify(
        { kind: 'lunar-night-brand-brain', version: 1, ...loadBrain() },
        null,
        2,
      ),
    import: json => {
      const d = typeof json === 'string' ? JSON.parse(json) : json
      if (!d || typeof d.styleGuide !== 'string')
        throw new Error('Not a Brand Brain file')
      return saveBrain({
        styleGuide: d.styleGuide,
        approved: Array.isArray(d.approved) ? d.approved : [],
        tweaks: Array.isArray(d.tweaks) ? d.tweaks : [],
      })
    },
    /** Text block prepended to every Fable 5.1 prompt. */
    context: (o = {}) => {
      const b = loadBrain()
      const max = o.max || 8
      const fmt = x =>
        Object.entries(x)
          .filter(([k, v]) => k !== 'id' && v)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ')
      const parts = [
        "BRAND BRAIN — the chef's own style memory. Follow it unless the request says otherwise.",
        b.styleGuide.trim(),
      ]
      if (b.approved.length)
        parts.push(
          `APPROVED EDITS (most recent first):\n${b.approved
            .slice(0, max)
            .map(x => `- ${fmt(x)}`)
            .join('\n')}`,
        )
      if (b.tweaks.length)
        parts.push(
          `MANUAL TWEAKS THE CHEF MADE AFTER EARLIER AI PASSES (learn from these; do not repeat the original mistake):\n${b.tweaks
            .slice(0, max)
            .map(x => `- ${fmt(x)}`)
            .join('\n')}`,
        )
      return parts.join('\n\n')
    },
  }

  LN.ai = {
    MODEL: 'claude-fable-5-1',
    available: async () => !!(await sampleNS()),
    /** LN.ai.ask(prompt, {json, onText, signal, images, effort, cache, brain})
     *  → {text, truncated, modelApplied, modelTierApplied} or parsed JSON when json:true.
     *  The Brand Brain is prepended to string prompts unless brain:false.
     *  Rejects with {code, message, text?}. Call only from a click. */
    async ask(prompt, opts = {}) {
      const s = await sampleNS()
      if (!s) {
        const err = { code: 'unavailable', message: AI_COPY.unavailable }
        throw err
      }
      if (typeof prompt === 'string' && opts.brain !== false)
        prompt = `${LN.brain.context()}\n\n---\n\n${prompt}`
      const o = { model: LN.ai.MODEL, modelTier: 'complex' }
      if (opts.onText) o.onText = opts.onText
      if (opts.signal) o.signal = opts.signal
      if (opts.images) o.images = opts.images
      if (opts.effort) o.effort = opts.effort
      if (opts.cache !== undefined) o.cache = opts.cache
      if (opts.json) return s.json(prompt, o)
      return s(prompt, o)
    },
    explain: e =>
      AI_COPY[(e && e.code) || 'upstream_error'] || AI_COPY.upstream_error,
    /** Full prompt text with the Brand Brain, for "copy into a Fable 5.1 chat" buttons. */
    compose: prompt => `${LN.brain.context()}\n\n---\n\n${prompt}`,
    limits: async () => {
      const s = await sampleNS()
      if (!s || !s.limits) return null
      try {
        return await s.limits()
      } catch (_e) {
        return null
      }
    },
  }

  /* ------------------------------------------------------------ lazy libraries */
  const libs = {}
  LN.lib = {
    /** Mediabunny (MP4 demux/mux + WebCodecs conversion). ESM bundle from jsDelivr. */
    mediabunny() {
      if (!libs.mb)
        libs.mb = import(
          'https://cdn.jsdelivr.net/npm/mediabunny@1.62.1/dist/bundles/mediabunny.min.mjs'
        ).catch(e => {
          libs.mb = null
          throw e
        })
      return libs.mb
    },
  }

  /* ------------------------------------------------------------ formatting + colour */
  const pad = (n, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, '0')
  LN.fmt = {
    pad,
    num: (x, d = 0) => Number(x).toFixed(d),
    signed: (x, d = 0) =>
      `${x > 0 ? '+' : x < 0 ? '−' : '±'}${Math.abs(Number(x)).toFixed(d)}`,
    /** Timecode HH:MM:SS:FF */
    tc(sec, fps = 24) {
      const total = Math.round(sec * fps)
      const f = total % fps
      const s = Math.floor(total / fps)
      return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`
    },
    frames: (sec, fps) => Math.round(sec * fps),
    seconds: (frames, fps) => frames / fps,
    /** 180° shutter at fps → '1/48' */
    shutter: (fps, angle = 180) => `1/${Math.round((fps * 360) / angle)}`,
    bytes(n) {
      if (n < 1024) return `${n} B`
      if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
      if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
      return `${(n / 1073741824).toFixed(2)} GB`
    },
    dur: (sec, d = 1) => `${Number(sec).toFixed(d)} s`,
    slug: s =>
      String(s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
  }
  LN.color = {
    hex2rgb(hex) {
      const h = String(hex).replace('#', '')
      const v = h.length === 3 ? h.replace(/./g, c => c + c) : h
      const n = Number.parseInt(v, 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    },
    rgb2hex: (r, g, b) =>
      `#${[r, g, b]
        .map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0'))
        .join('')}`,
    srgb2lin: c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4),
    lin2srgb: c =>
      c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055,
  }
  LN.palette = {
    obsidian: '#070709',
    graphite: '#121318',
    line: '#1E202B',
    silver: '#D4DCE8',
    silverMuted: '#8A94A6',
    amber: '#DDA13E',
    crimson: '#A82424',
    bone: '#F4F1EA',
    // Kubrick UI accent (CapCut-style cyan) for canvas drawing of interface elements
    accent: '#00D4E0',
    uiBg: '#0A0A0B',
    uiPanel: '#161618',
    // Grade targets from the Lunar Night look
    gradeBlack: '#08080A',
    gradeSilver: '#C8D0DC',
    gradeAmber: '#E5A93C',
    gradeCrimson: '#9E2A2B',
    // LunarNight v2 runbook (measured from the reference reels)
    lime: '#D6DB05',
    violetShadow: '#2A1B4A',
    blueShadow: '#13254A',
  }
  LN.fonts = {
    display: 'Inter',
    body: 'Inter',
    mono: 'Roboto Mono',
    ui: 'Inter',
    titleFaces: ['Cormorant Garamond', 'Instrument Serif', 'Playfair Display'],
    metaFaces: ['JetBrains Mono', 'Space Mono', 'Courier Prime'],
    // Runbook reel captions: condensed sans, lowercase, lime #D6DB05
    reelFaces: ['Oswald', 'Antonio'],
  }
  /** Await web fonts before drawing them on canvas. specs: ['600 64px "Cormorant Garamond"'] */
  LN.fontsReady = async specs => {
    try {
      await Promise.all(specs.map(s => document.fonts.load(s)))
    } catch (_e) {
      /* fallback faces will be used */
    }
  }

  /* ------------------------------------------------------------ shared ticket rail (shot list) */
  const SL_KEY = 'shotlist.v1'
  let rail = LN.store.get(SL_KEY, [])
  if (!Array.isArray(rail)) rail = []
  const saveRail = () => {
    LN.store.set(SL_KEY, rail)
    LN.bus.emit('shotlist', rail.slice())
  }
  /** Kitchen-ticket shot list shared by every module.
   *  Ticket: {tid, shotId?, name, lens, fps, ois, notes, status:'queued'|'fired'|'pass'|'86', addedAt} */
  LN.shotlist = {
    all: () => rail.slice(),
    add(item) {
      const t = {
        tid: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        status: 'queued',
        addedAt: Date.now(),
        ...item,
      }
      rail.push(t)
      saveRail()
      return t
    },
    addMany(items) {
      const out = items.map(i => ({
        tid: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        status: 'queued',
        addedAt: Date.now(),
        ...i,
      }))
      rail.push(...out)
      saveRail()
      return out
    },
    update(tid, patch) {
      const t = rail.find(x => x.tid === tid)
      if (t) {
        Object.assign(t, patch)
        saveRail()
      }
      return t
    },
    remove(tid) {
      rail = rail.filter(x => x.tid !== tid)
      saveRail()
    },
    move(tid, dir) {
      const i = rail.findIndex(x => x.tid === tid)
      const j = i + dir
      if (i < 0 || j < 0 || j >= rail.length) return
      const [t] = rail.splice(i, 1)
      rail.splice(j, 0, t)
      saveRail()
    },
    clear() {
      rail = []
      saveRail()
    },
    onChange: fn => LN.bus.on('shotlist', fn),
  }

  /* ------------------------------------------------------------ UI kit */
  const ui = {}
  LN.ui = ui
  ui.btn = (label, onClick, o = {}) =>
    LN.h(
      'button',
      {
        type: 'button',
        class:
          `ln-btn ${o.kind || ''} ${o.small ? 'small' : ''} ${o.block ? 'block' : ''}`.trim(),
        id: o.id,
        title: o.title,
        'aria-label': o.aria,
        disabled: o.disabled,
        onClick,
      },
      label,
    )
  ui.chip = (text, kind = '') =>
    LN.h('span', { class: `ln-chip ${kind}`.trim() }, text)
  /** CapCut / Pixel tap path: ui.path('Edit', 'Speed', 'Curve') */
  ui.path = (...parts) => {
    const list = parts.flat()
    const el = LN.h('span', { class: 'ln-path' })
    list.forEach((p, i) => {
      if (i) el.append(LN.h('i', { 'aria-hidden': 'true' }, '›'))
      el.append(LN.h('span', null, p))
    })
    el.setAttribute('aria-label', list.join(', then '))
    return el
  }
  /** kinds: tip | warn | verify | rule | ok */
  ui.callout = (kind, content, title) => {
    const titles = {
      tip: 'Tip',
      warn: 'Watch out',
      verify: 'Verify on your device',
      rule: 'Rule',
      ok: 'Good to go',
    }
    return LN.h(
      'div',
      { class: `ln-callout ${kind}` },
      LN.h('b', null, title || titles[kind] || kind),
      LN.h('div', null, content),
    )
  }
  ui.kv = rows =>
    LN.h(
      'dl',
      { class: 'ln-kv' },
      rows.flatMap(([k, v]) => [LN.h('dt', null, k), LN.h('dd', null, v)]),
    )
  ui.table = (headers, rows, o = {}) =>
    LN.h(
      'div',
      { class: 'ln-scroll', tabindex: '0', 'aria-label': o.label || 'Table' },
      LN.h(
        'table',
        { class: 'ln-table' },
        LN.h(
          'thead',
          null,
          LN.h(
            'tr',
            null,
            headers.map(h => LN.h('th', { scope: 'col' }, h)),
          ),
        ),
        LN.h(
          'tbody',
          null,
          rows.map(r =>
            LN.h(
              'tr',
              null,
              r.map(c => LN.h('td', null, c)),
            ),
          ),
        ),
      ),
    )
  ui.steps = items =>
    LN.h(
      'ol',
      { class: 'ln-steps' },
      items.map(it => LN.h('li', null, LN.h('div', null, it))),
    )
  ui.stat = (value, label) =>
    LN.h(
      'div',
      { class: 'ln-stat' },
      LN.h('b', null, value),
      LN.h('span', null, label),
    )
  ui.section = ({ eyebrow, title, lede, id } = {}, ...kids) =>
    LN.h(
      'section',
      { class: 'ln-section', id },
      eyebrow || title || lede
        ? LN.h(
            'header',
            { class: 'ln-section-head' },
            eyebrow ? LN.h('div', { class: 'ln-eyebrow' }, eyebrow) : null,
            title ? LN.h('h2', { class: 'ln-h2' }, title) : null,
            lede ? LN.h('p', null, lede) : null,
          )
        : null,
      ...kids,
    )
  ui.copyBlock = (text, o = {}) => {
    const pre = LN.h('pre', null, text)
    const block = LN.h(
      'div',
      { class: 'ln-copyblock' },
      LN.h(
        'header',
        null,
        LN.h('span', null, o.title || 'Text'),
        LN.h(
          'button',
          {
            type: 'button',
            class: 'ln-btn small ghost',
            onClick: () =>
              LN.copy(pre.textContent, { label: o.copied || 'Copied' }),
          },
          o.button || 'Copy',
        ),
      ),
      pre,
    )
    block.setText = t => {
      pre.textContent = t
    }
    return block
  }
  /** Range slider. Returns {el, input, get, set}. */
  ui.slider = o => {
    const id = o.id || LN.uid('sl')
    const fmt = o.format || (v => `${v}${o.unit || ''}`)
    const out = LN.h('output', { for: id }, fmt(o.value))
    const input = LN.h('input', {
      type: 'range',
      class: 'ln-range',
      id,
      min: o.min,
      max: o.max,
      step: o.step || 1,
      value: o.value,
    })
    const paint = () => {
      const p = ((Number(input.value) - o.min) / (o.max - o.min)) * 100
      input.style.setProperty('--fill', `${p}%`)
      out.textContent = fmt(Number(input.value))
    }
    input.addEventListener('input', () => {
      paint()
      if (o.onInput) o.onInput(Number(input.value))
    })
    if (o.onChange)
      input.addEventListener('change', () => o.onChange(Number(input.value)))
    paint()
    const el = LN.h(
      'div',
      { class: 'ln-field' },
      LN.h(
        'label',
        { class: 'ln-label', for: id },
        LN.h('span', null, o.label),
        out,
      ),
      input,
    )
    return {
      el,
      input,
      get: () => Number(input.value),
      set(v) {
        input.value = v
        paint()
      },
    }
  }
  /** Segmented control. options: [{value,label}] Returns {el, get, set}. */
  ui.seg = o => {
    let value = o.value
    const btns = o.options.map(opt =>
      LN.h(
        'button',
        {
          type: 'button',
          'aria-pressed': String(opt.value === value),
          dataset: { v: String(opt.value) },
          onClick: () => api.set(opt.value, true),
        },
        opt.label,
      ),
    )
    const group = LN.h(
      'div',
      { class: 'ln-seg', role: 'group', 'aria-label': o.label || '' },
      btns,
    )
    const el = o.label
      ? LN.h(
          'div',
          { class: 'ln-field' },
          LN.h('span', { class: 'ln-label' }, o.label),
          group,
        )
      : group
    const api = {
      el,
      get: () => value,
      set(v, fire) {
        value = v
        for (const b of btns)
          b.setAttribute('aria-pressed', String(b.dataset.v === String(v)))
        if (fire && o.onChange) o.onChange(v)
      },
    }
    return api
  }
  ui.toggle = o => {
    const id = o.id || LN.uid('tg')
    const input = LN.h('input', { type: 'checkbox', id, role: 'switch' })
    input.checked = !!o.checked
    input.addEventListener(
      'change',
      () => o.onChange && o.onChange(input.checked),
    )
    const el = LN.h(
      'label',
      { class: 'ln-toggle', for: id },
      input,
      LN.h('span', null, o.label),
    )
    return {
      el,
      input,
      get: () => input.checked,
      set: v => (input.checked = !!v),
    }
  }
  ui.select = o => {
    const id = o.id || LN.uid('se')
    const sel = LN.h(
      'select',
      { class: 'ln-select', id },
      o.options.map(opt =>
        LN.h(
          'option',
          { value: String(opt.value), selected: opt.value === o.value },
          opt.label,
        ),
      ),
    )
    sel.addEventListener('change', () => o.onChange && o.onChange(sel.value))
    const el = LN.h(
      'div',
      { class: 'ln-field' },
      LN.h('label', { class: 'ln-label', for: id }, o.label),
      sel,
    )
    return {
      el,
      input: sel,
      get: () => sel.value,
      set: v => (sel.value = String(v)),
    }
  }
  ui.field = o => {
    const id = o.id || LN.uid('fd')
    const input = o.multiline
      ? LN.h('textarea', {
          class: 'ln-textarea',
          id,
          rows: o.rows || 4,
          placeholder: o.placeholder,
        })
      : LN.h('input', {
          class: 'ln-input',
          id,
          type: o.type || 'text',
          placeholder: o.placeholder,
        })
    input.value = o.value == null ? '' : o.value
    input.addEventListener('input', () => o.onInput && o.onInput(input.value))
    const el = LN.h(
      'div',
      { class: 'ln-field' },
      LN.h('label', { class: 'ln-label', for: id }, o.label),
      input,
    )
    return { el, input, get: () => input.value, set: v => (input.value = v) }
  }
  /** Sub-tabs. items: [{id,label,render(el)}]. Lazy-renders each panel once. */
  ui.tabs = (items, o = {}) => {
    const key = o.key ? `tabs.${o.key}` : null
    let current = (key && LN.store.get(key)) || items[0].id
    if (!items.some(i => i.id === current)) current = items[0].id
    const bar = LN.h('div', { class: 'ln-tabs', role: 'tablist' })
    const panels = LN.h('div')
    const rendered = new Set()
    const btns = {}
    const pans = {}
    for (const it of items) {
      const tabId = LN.uid('tab')
      const panId = LN.uid('pan')
      btns[it.id] = LN.h(
        'button',
        {
          type: 'button',
          role: 'tab',
          id: tabId,
          'aria-controls': panId,
          'aria-selected': 'false',
          onClick: () => show(it.id),
        },
        it.label,
      )
      pans[it.id] = LN.h('div', {
        role: 'tabpanel',
        id: panId,
        'aria-labelledby': tabId,
        hidden: true,
      })
      bar.append(btns[it.id])
      panels.append(pans[it.id])
    }
    function show(id) {
      current = id
      if (key) LN.store.set(key, id)
      for (const it of items) {
        const on = it.id === id
        btns[it.id].setAttribute('aria-selected', String(on))
        pans[it.id].hidden = !on
        if (on && !rendered.has(it.id)) {
          rendered.add(it.id)
          try {
            it.render(pans[it.id])
          } catch (e) {
            console.error(e)
            pans[it.id].append(
              LN.h(
                'div',
                { class: 'ln-fail' },
                `This panel failed to load: ${e.message}`,
              ),
            )
          }
        }
      }
    }
    show(current)
    return { el: LN.h('div', null, bar, panels), show }
  }
  ui.empty = text => LN.h('p', { class: 'ln-faint ln-small' }, text)
  /** File picker button that resolves the chosen File (images/videos from the camera roll). */
  ui.filePick = o => {
    const id = o.id || LN.uid('file')
    const input = LN.h('input', {
      type: 'file',
      id,
      accept: o.accept || '*/*',
      hidden: true,
    })
    input.addEventListener('change', () => {
      const f = input.files && input.files[0]
      if (f && o.onFile) o.onFile(f)
      input.value = ''
    })
    const btn = LN.h(
      'label',
      {
        class: `ln-btn ${o.kind || 'quiet'} ${o.small ? 'small' : ''}`.trim(),
        for: id,
        tabindex: '0',
      },
      o.label || 'Choose file',
    )
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        input.click()
      }
    })
    return LN.h('span', null, btn, input)
  }

  /* ------------------------------------------------------------ registry + router */
  /**
   * LN.register({ id, num, title, kicker, lede, outputs: [...], mount(el, ctx) })
   * id: ascii slug used as the #hash route. mount() runs once, on first visit.
   */
  LN.register = def => {
    if (!def || !def.id || typeof def.mount !== 'function') {
      console.error('[LN] bad module definition', def)
      return
    }
    LN.modules.push(def)
  }
  const views = new Map()
  let mainEl = null
  let railEl = null

  function renderHome(el) {
    const mods = LN.modules.slice().sort((a, b) => a.num - b.num)
    const rail = LN.shotlist.all()
    const count = s => rail.filter(t => t.status === s).length
    const pre = LN.store.get('preflight.v1', { checked: {}, total: 0 })
    const preDone = Object.values(pre.checked || {}).filter(Boolean).length
    const stats = LN.h(
      'div',
      {
        class: 'ln-grid',
        style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' },
      },
      ui.stat(
        String(rail.filter(t => t.status !== '86').length),
        'Shots all day',
      ),
      ui.stat(String(count('fired')), 'Fired'),
      ui.stat(String(count('pass')), 'On the pass'),
      ui.stat(pre.total ? `${preDone}/${pre.total}` : '0', 'Pre-flight checks'),
    )
    el.replaceChildren(
      LN.h(
        'section',
        { class: 'ln-hero' },
        LN.h('div', { class: 'ln-rec' }, 'Road to three stars · production OS'),
        LN.h('h1', null, 'Kubrick'),
        LN.h(
          'p',
          null,
          'Your production OS for the road to three stars. Everything between the walk-in and the upload, run from one phone: the Pixel 10 Pro XL rig, a shot bible, the CapCut edit, real .cube looks, titles, Fable 5.1 assets and the psychology of the first three seconds.',
        ),
        LN.h(
          'div',
          { class: 'ln-row' },
          LN.h('a', { class: 'ln-btn', href: '#rig' }, 'Start pre-flight'),
          LN.h(
            'a',
            { class: 'ln-btn ghost', href: '#shots' },
            'Build tonight’s shot list',
          ),
          LN.h('a', { class: 'ln-btn quiet', href: '#grade' }, 'Get the LUTs'),
        ),
      ),
      ui.section({ eyebrow: 'Tonight', title: 'Call sheet' }, stats),
      ui.section(
        {
          eyebrow: 'The pipeline',
          title: 'Prep, shoot, cut, grade, ship',
          lede: 'Numbered in the order the work happens. Each stage hands the next one something real: a checklist, a ticket rail, a cut, a look, a title, an asset, a hook.',
        },
        LN.h(
          'nav',
          { class: 'ln-pipeline', 'aria-label': 'Modules' },
          mods.map(m =>
            LN.h(
              'a',
              { href: `#${m.id}` },
              LN.h('span', { class: 'n' }, `${pad(m.num)} · ${m.kicker || ''}`),
              LN.h('b', null, m.title),
              LN.h('small', null, m.blurb || ''),
            ),
          ),
        ),
      ),
    )
  }

  function route() {
    const want = (location.hash || '').replace(/^#/, '')
    const target = views.has(want) ? want : 'home'
    for (const [id, v] of views) {
      const on = id === target
      v.el.hidden = !on
      if (on && !v.mounted) {
        v.mounted = true
        try {
          v.mount(v.body)
        } catch (e) {
          console.error(`[LN] module "${id}" failed to mount`, e)
          v.body.append(
            LN.h(
              'div',
              { class: 'ln-fail' },
              `This module failed to load: ${e && e.message}`,
            ),
          )
        }
      }
    }
    if (target === 'home') views.get('home').mount(views.get('home').body)
    for (const a of LN.$$('a', railEl)) {
      if (a.getAttribute('href') === `#${target}`)
        a.setAttribute('aria-current', 'page')
      else a.removeAttribute('aria-current')
    }
    const cur = LN.$('a[aria-current="page"]', railEl)
    if (cur && cur.scrollIntoView)
      cur.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    window.scrollTo(0, 0)
    LN.bus.emit('route', target)
  }

  function offlineCopy() {
    const style = document.getElementById('ln-style')
    const script = document.getElementById('ln-script')
    const fonts = document.getElementById('ln-fonts')
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Kubrick</title>${fonts ? fonts.outerHTML : ''}<style id="ln-style">${style ? style.textContent : ''}</style></head><body><div id="ln-app"></div><script id="ln-script">${script ? script.textContent : ''}</script></body></html>`
    return LN.save({
      filename: 'Kubrick.html',
      data: html,
      mime: 'text/html',
    })
  }

  let wakeLock = null
  async function setWake(on) {
    try {
      if (on) {
        wakeLock = await navigator.wakeLock.request('screen')
        LN.toast('Screen will stay awake while this page is open')
      } else if (wakeLock) {
        await wakeLock.release()
        wakeLock = null
      }
      return true
    } catch (_e) {
      LN.toast(
        'Keep-awake is not available here. Set Screen timeout to 10 min in Android Settings instead.',
        {
          kind: 'warn',
          ms: 5200,
        },
      )
      return false
    }
  }

  /** Render the shell and start routing. Called once by boot.js. */
  LN.boot = () => {
    const app =
      document.getElementById('ln-app') ||
      document.body.appendChild(LN.h('div', { id: 'ln-app' }))
    const mods = LN.modules.slice().sort((a, b) => a.num - b.num)
    railEl = LN.h(
      'nav',
      { class: 'ln-rail', 'aria-label': 'Modules' },
      mods.map(m =>
        LN.h(
          'a',
          { href: `#${m.id}` },
          LN.h('span', null, pad(m.num)),
          m.short || m.title,
        ),
      ),
    )
    const wake = ui.toggle({
      id: 'ln-wake',
      label: 'Keep screen awake',
      onChange: async v => {
        const ok = await setWake(v)
        if (!ok) wake.set(false)
      },
    })
    const header = LN.h(
      'header',
      { class: 'ln-top' },
      LN.h(
        'div',
        { class: 'ln-wrap' },
        LN.h(
          'div',
          { class: 'ln-top-row' },
          LN.h(
            'a',
            {
              class: 'ln-brand',
              href: '#home',
              'aria-label': 'Kubrick home',
            },
            LN.h('b', null, 'Kubrick'),
          ),
          LN.h('span', { class: 'ln-rec' }, 'OS'),
          LN.h(
            'div',
            { class: 'ln-top-meta' },
            LN.h(
              'span',
              { class: 'ln-hud' },
              'PIXEL 10 PRO XL · CAPCUT MOBILE · FABLE 5.1',
            ),
          ),
        ),
        railEl,
      ),
    )
    mainEl = LN.h('main', { class: 'ln-main ln-wrap', id: 'ln-main' })
    const homeEl = LN.h('section', { class: 'ln-view', 'data-view': 'home' })
    const homeBody = LN.h('div')
    homeEl.append(homeBody)
    mainEl.append(homeEl)
    views.set('home', {
      el: homeEl,
      body: homeBody,
      mounted: true,
      mount: renderHome,
    })
    for (const m of mods) {
      const el = LN.h('section', {
        class: 'ln-view',
        'data-view': m.id,
        hidden: true,
      })
      const head = LN.h(
        'header',
        { class: 'ln-view-head' },
        LN.h(
          'div',
          { class: 'ln-eyebrow' },
          `${pad(m.num)} / ${m.kicker || ''}`,
        ),
        LN.h('h1', null, m.title),
        m.lede ? LN.h('p', { class: 'ln-lede' }, m.lede) : null,
        m.outputs && m.outputs.length
          ? LN.h(
              'div',
              { class: 'ln-outputs' },
              m.outputs.map(o => ui.chip(o, 'amber')),
            )
          : null,
      )
      const body = LN.h('div', { class: `ln-view-body m-${m.id}` })
      el.append(head, body)
      mainEl.append(el)
      views.set(m.id, {
        el,
        body,
        mounted: false,
        mount: b => m.mount(b, { LN }),
      })
    }
    const footer = LN.h(
      'footer',
      { class: 'ln-foot' },
      LN.h(
        'div',
        { class: 'ln-wrap ln-foot-row' },
        LN.h(
          'div',
          null,
          `Kubrick v${LN.version} · built for the road to three stars`,
        ),
        LN.h(
          'div',
          { class: 'ln-row' },
          wake.el,
          ui.btn('Save offline copy (.html)', offlineCopy, {
            kind: 'quiet',
            small: true,
          }),
        ),
      ),
    )
    app.replaceChildren(header, mainEl, footer)
    LN.shotlist.onChange(() => {
      if (!views.get('home').el.hidden) renderHome(views.get('home').body)
    })
    LN.bus.on('preflight', () => {
      if (!views.get('home').el.hidden) renderHome(views.get('home').body)
    })
    window.addEventListener('hashchange', route)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && wake.get() && !wakeLock)
        setWake(true)
    })
    if (LN.failed.length) console.warn('[LN] failed to load:', LN.failed)
    route()
  }
})()
