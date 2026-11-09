/* Lunar Night OS: modules/fable.js, Fable 5.1 Studio (first tab inside Forge).
   LN.fableStudio = { mount(el), measureFrame(imageData), FORMATS }
   Five sub-tabs:
     Brand Brain     edit the style memory every Fable call carries (LN.brain)
     Asset recipes   precise prompts for titles, plates, pre-vis and sound
     Shoot planner   Fable plans the shots, then they fire to the ticket rail
     Frame doctor    three grade numbers measured on the phone, then Fable's fixes
     Higgsfield      briefs to paste into the chef's own Claude chat
   Every live call goes through LN.ai.ask from a click; every prompt is also
   offered as copyable text (LN.ai.compose) for a Fable 5.1 chat. */
;(() => {
  const LN = window.LN
  const { h, ui } = LN
  const { clamp } = LN.math

  /* ============================================================ shared */
  const FORMATS = [
    {
      id: 'review',
      label: 'Marketplace Review',
      short: 'Review',
      cat: 'review',
      style:
        'TikTok main series reviewing home-cook plates. 25–40 s for reach (65–90 s with the verdict after 60 s when chasing Creator Rewards). Cuts every 1–3 s, every pause cut, hard cuts, at most 2 transitions of about 0.2 s. 2–3 push-ins of 8–15% on the bite, the money shot and the verdict. Hook card: white box, black Inter Bold, lowercase, 8 words max, about 2 s. Captions: Inter Bold, white with black outline, 3–4 words a line, always on. Voice 100, music 10–20, one SFX per big moment at 30–60. Ends on the verdict plus a rating card held 1.5 s, no goodbye. Export 1080p at 30 fps (60 if shot at 60).',
    },
    {
      id: 'night',
      label: 'Lunar Night Reel',
      short: 'Night',
      cat: null,
      style:
        'Night exteriors per the LunarNight v2 runbook. 3–5 s static holds and hard cuts; a single-shot reel runs 5–7 s and loops, a montage is 5–7 shots with the car-pass shot third or last. Dead-still braced frame (car roof, post or wall). 24 fps with a 360° shutter (1/24 s) so lights streak, ISO 400 (never above 1600), white balance 3200K (2800K for the blue variant), 1.5–2 stops under, manual focus. 1x or 2x only, never the ultrawide. 30–75 min after sunset (Santa Fe in November: 5:30–6:30 pm). One coloured light on one plain building, lots of dark sky, no people. Roll 8 s per shot and wait for the car pass. Lime #D6DB05 condensed lowercase text, ambient sound or the night sound, no voice, no SFX.',
    },
    {
      id: 'doc',
      label: 'Road to Three Stars',
      short: 'Doc',
      cat: 'doc',
      style:
        'The documentary of the climb. Hook inside 0–3 s; montage cuts about every 1.8 s on action apexes; emotional beats about 4.5 s. Dreamcore only for memory and heritage; VHS 4:3 only for confessions, failures and archive chaos. Editorial serif chapter titles plus all-caps mono data lines. Voice-first audio spine, music ducked under speech, foley close and loud. Handheld kitchen techniques are fine.',
    },
    {
      id: 'rd',
      label: 'R&D Lab',
      short: 'R&D',
      cat: 'rd',
      style:
        'Recipe research and plating. Speed ramps (never below 0.5x without a 60 fps source), mono data cards, macro razor-sharp, plating shots from the shot bible. Warm the plate highlights, keep reds and oranges honest.',
    },
  ]
  const FMT = Object.fromEntries(FORMATS.map(f => [f.id, f]))
  const fmtOptions = (key = 'short') =>
    FORMATS.map(f => ({ value: f.id, label: f[key] }))

  const today = () => new Date().toISOString().slice(0, 10)
  const str = (v, max = 400) =>
    v == null ? '' : String(v).replace(/\s+/g, ' ').trim().slice(0, max)
  const STORE = 'fable.v1'
  const saved = LN.store.get(STORE, {}) || {}
  const remember = (key, value) => {
    saved[key] = value
    LN.store.set(STORE, saved)
  }

  /* Live state: resolved once. Live buttons stay hidden until Claude answers yes. */
  let live = null
  const liveP = Promise.resolve()
    .then(() => LN.ai.available())
    .then(v => {
      live = !!v
      return live
    })
    .catch(() => {
      live = false
      return false
    })
  function liveOnly(el) {
    el.hidden = live !== true
    liveP.then(v => {
      el.hidden = !v
    })
    return el
  }
  function offlineOnly(el) {
    el.hidden = live !== false
    liveP.then(v => {
      el.hidden = v
    })
    return el
  }
  const offlineNote = text =>
    offlineOnly(
      h(
        'p',
        { class: 'fs-offline' },
        text ||
          'Live Fable 5.1 runs when this page is open in claude.ai. Copy the prompt into a Fable 5.1 chat instead; it carries your Brand Brain.',
      ),
    )

  /** A live action: button + status line + stop. run(signal) does the ask. */
  function liveAction(label, run, o = {}) {
    let ctl = null
    const status = h('p', { class: 'fs-status', role: 'status' })
    const stop = ui.btn(
      'Stop',
      () => {
        if (ctl) ctl.abort()
      },
      { kind: 'quiet', small: true },
    )
    stop.hidden = true
    const btn = ui.btn(
      label,
      async () => {
        if (ctl) return
        if (o.before && o.before() === false) return
        ctl = new AbortController()
        btn.disabled = true
        stop.hidden = false
        status.className = 'fs-status busy'
        status.textContent = o.busy || 'Fable 5.1 is working…'
        try {
          await run(ctl.signal, status)
          if (status.classList.contains('busy')) {
            status.className = 'fs-status'
            status.textContent = ''
          }
        } catch (e) {
          status.className = 'fs-status err'
          status.textContent =
            e && e.code ? LN.ai.explain(e) : String((e && e.message) || e)
        } finally {
          ctl = null
          btn.disabled = false
          stop.hidden = true
        }
      },
      { kind: o.kind, small: o.small },
    )
    const el = liveOnly(
      h(
        'div',
        { class: 'fs-live' },
        h('div', { class: 'ln-row' }, btn, stop),
        status,
      ),
    )
    return { el, btn, status }
  }

  /** Prompt box: shows the request; Copy adds the Brand Brain (LN.ai.compose). */
  function promptBox(getPrompt, o = {}) {
    const pre = h('pre', { class: 'fs-prompt-text', tabindex: '0' })
    const meta = h('span', { class: 'ln-faint' })
    const withBrain = o.brain !== false
    const copy = () =>
      LN.copy(withBrain ? LN.ai.compose(getPrompt()) : getPrompt(), {
        label: withBrain ? 'Prompt copied with your Brand Brain' : 'Copied',
      })
    const el = h(
      'div',
      { class: 'ln-copyblock fs-prompt' },
      h(
        'header',
        null,
        h('span', null, o.title || 'Prompt for a Fable 5.1 chat'),
        h(
          'button',
          { type: 'button', class: 'ln-btn small ghost', onClick: copy },
          o.button || 'Copy prompt',
        ),
      ),
      pre,
      h('footer', { class: 'fs-prompt-foot' }, meta),
    )
    const refresh = () => {
      const p = getPrompt()
      pre.textContent = p
      meta.textContent = withBrain
        ? `${p.length.toLocaleString('en-US')} characters. Copy adds your Brand Brain on top (${LN.brain.context().length.toLocaleString('en-US')} more).`
        : `${p.length.toLocaleString('en-US')} characters.`
    }
    refresh()
    return { el, refresh, copy }
  }

  const card = (title, ...kids) =>
    h(
      'div',
      { class: 'ln-card fs-card' },
      title ? h('h3', null, title) : null,
      ...kids,
    )
  const sub = text => h('p', { class: 'ln-muted ln-small fs-sub' }, text)

  /** Pull a fenced code block (or the whole answer) out of chat text. */
  function codeFrom(text, lang) {
    const s = String(text || '')
    const re = new RegExp(`\`\`\`(?:${lang})?\\s*\\n([\\s\\S]*?)\`\`\``, 'i')
    const m = s.match(re)
    if (m) return m[1].trim()
    const i = s.search(/<!doctype html|<html/i)
    if (i >= 0) {
      const j = s.lastIndexOf('</html>')
      return s.slice(i, j > i ? j + 7 : undefined).trim()
    }
    return ''
  }
  function jsonFrom(text) {
    if (text && typeof text === 'object') return text
    const s = String(text || '')
    const f = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const t = f ? f[1] : s
    const a = t.indexOf('{')
    const b = t.lastIndexOf('}')
    if (a < 0 || b <= a) throw new Error('No JSON object in the answer.')
    return JSON.parse(t.slice(a, b + 1))
  }

  /* ============================================================ 1. Brand Brain */
  const TWEAK_AREAS = [
    'Hook',
    'Cut and pacing',
    'Captions',
    'Text and titles',
    'Colour',
    'Audio and music',
    'Transitions and zooms',
    'Cover',
    'Other',
  ]

  function renderBrain(el) {
    const statsEl = h('div', { class: 'fs-stats' })
    const paintStats = () => {
      const b = LN.brain.get()
      statsEl.replaceChildren(
        ui.stat(String(b.approved.length), 'Approved edits'),
        ui.stat(String(b.tweaks.length), 'CapCut tweaks'),
        ui.stat(
          `${Math.round(LN.brain.context().length / 100) / 10}k`,
          'Characters per call',
        ),
        ui.stat(
          b.updatedAt
            ? new Date(b.updatedAt).toISOString().slice(0, 10)
            : 'default',
          'Last change',
        ),
      )
    }

    /* Style guide */
    const guide = ui.field({
      label: 'Style guide',
      multiline: true,
      rows: 14,
      value: LN.brain.get().styleGuide,
      onInput: () => paintDirty(),
    })
    guide.input.classList.add('fs-guide')
    const dirty = h('span', { class: 'fs-dirty', 'aria-live': 'polite' })
    const paintDirty = () => {
      const on = guide.get() !== LN.brain.get().styleGuide
      dirty.textContent = on ? 'Unsaved changes' : 'Saved'
      dirty.classList.toggle('on', on)
    }
    const saveGuide = ui.btn('Save style guide', () => {
      LN.brain.setStyle(guide.get())
      LN.toast('Style guide saved. The next Fable call carries it.')
    })
    const resetGuide = ui.btn(
      'Reset to default',
      () =>
        LN.sheet({
          title: 'Reset the style guide?',
          body: 'This puts back the original Lunar Night style guide. Your approved edits and CapCut tweaks stay. Export first if you want to keep this version.',
          actions: [
            { label: 'Cancel', kind: 'quiet' },
            {
              label: 'Reset style guide',
              kind: 'danger',
              onClick: () => {
                LN.brain.setStyle(LN.brain.DEFAULT_STYLE)
                guide.set(LN.brain.DEFAULT_STYLE)
                paintDirty()
                LN.toast('Style guide reset to default')
              },
            },
          ],
        }),
      { kind: 'ghost' },
    )

    /* Approved edits */
    const A = {
      title: ui.field({
        label: 'Title',
        placeholder: 'green chile stew, Española',
      }),
      format: ui.select({
        label: 'Format',
        options: fmtOptions('label'),
        value: 'review',
      }),
      hook: ui.field({
        label: 'Hook',
        placeholder: 'first line or first image',
      }),
      pacing: ui.field({
        label: 'Pacing',
        placeholder: 'cuts every 1.5 s, verdict at 31 s',
      }),
      music: ui.field({
        label: 'Music and sound',
        placeholder: 'voice 100, lo-fi at 15, one crunch SFX',
      }),
      look: ui.field({
        label: 'Look',
        placeholder: 'Dreamcore bake at 60%, warm plate',
      }),
      whatWorked: ui.field({
        label: 'What worked',
        multiline: true,
        rows: 3,
        placeholder: 'why you approved it: the bite landed on the beat…',
      }),
    }
    const approvedList = h('div', { class: 'fs-entries' })
    const logApproved = ui.btn(
      'Log approved edit',
      () => {
        const entry = {}
        for (const k of Object.keys(A)) entry[k] = str(A[k].get(), 600)
        entry.format = FMT[entry.format]
          ? FMT[entry.format].label
          : entry.format
        if (!entry.title && !entry.whatWorked) {
          LN.toast('Give it a title or say what worked first.', {
            kind: 'warn',
          })
          return
        }
        LN.brain.addApproved(entry)
        for (const k of Object.keys(A)) if (k !== 'format') A[k].set('')
        LN.toast('Approved edit logged. Fable learns from it on the next call.')
      },
      { kind: 'ghost' },
    )

    /* CapCut tweaks */
    const T = {
      project: ui.field({ label: 'Project', placeholder: 'tamales review' }),
      area: ui.select({
        label: 'Area',
        options: TWEAK_AREAS.map(a => ({ value: a, label: a })),
        value: 'Cut and pacing',
      }),
      before: ui.field({
        label: 'Before (the AI pass)',
        multiline: true,
        rows: 2,
        placeholder: 'hook card on screen 3.5 s',
      }),
      after: ui.field({
        label: 'After (what you changed in CapCut)',
        multiline: true,
        rows: 2,
        placeholder: 'cut it to 2 s, first bite moved to 0:01',
      }),
      why: ui.field({
        label: 'Why',
        multiline: true,
        rows: 2,
        placeholder: 'viewers were gone before the bite',
      }),
    }
    const tweakList = h('div', { class: 'fs-entries' })
    const logTweak = ui.btn(
      'Log CapCut tweak',
      () => {
        const entry = {}
        for (const k of Object.keys(T)) entry[k] = str(T[k].get(), 600)
        if (!entry.before && !entry.after) {
          LN.toast('Fill in before and after first.', { kind: 'warn' })
          return
        }
        LN.brain.addTweak(entry)
        for (const k of Object.keys(T)) if (k !== 'area') T[k].set('')
        LN.toast('Tweak logged. The next AI pass will not repeat it.')
      },
      { kind: 'ghost' },
    )

    const entryCard = (kind, x) => {
      const rows =
        kind === 'approved'
          ? [
              ['Format', x.format],
              ['Hook', x.hook],
              ['Pacing', x.pacing],
              ['Music', x.music],
              ['Look', x.look],
              ['Worked', x.whatWorked],
            ]
          : [
              ['Before', x.before],
              ['After', x.after],
              ['Why', x.why],
            ]
      return h(
        'article',
        { class: 'fs-entry' },
        h(
          'header',
          null,
          h(
            'div',
            { class: 'fs-entry-title' },
            h('b', null, (kind === 'approved' ? x.title : x.project) || '—'),
            h(
              'span',
              { class: 'ln-faint' },
              [kind === 'tweaks' ? x.area : '', x.date]
                .filter(Boolean)
                .join(' · '),
            ),
          ),
          ui.btn(
            'Delete',
            () => {
              LN.brain.remove(kind, x.id)
              LN.toast('Entry deleted')
            },
            {
              kind: 'danger',
              small: true,
              aria: `Delete ${(kind === 'approved' ? x.title : x.project) || 'entry'}`,
            },
          ),
        ),
        ui.kv(rows.filter(r => r[1]).map(([k, v]) => [k, String(v)])),
      )
    }
    const paintLists = () => {
      const b = LN.brain.get()
      approvedList.replaceChildren(
        ...(b.approved.length
          ? b.approved.map(x => entryCard('approved', x))
          : [
              ui.empty(
                'No approved edits yet. After a cut you love, log it here: the hook, the pacing, the music and what worked.',
              ),
            ]),
      )
      tweakList.replaceChildren(
        ...(b.tweaks.length
          ? b.tweaks.map(x => entryCard('tweaks', x))
          : [
              ui.empty(
                'No tweaks yet. When you fix an AI cut in CapCut, log what you changed and why, so the next pass starts there.',
              ),
            ]),
      )
    }

    /* What Fable sees */
    const ctxPre = h('pre', { class: 'fs-prompt-text fs-context' })
    const paintCtx = () => {
      ctxPre.textContent = LN.brain.context()
    }

    /* Backup */
    const exportBtn = ui.btn(
      'Export .json',
      () =>
        LN.save({
          filename: `lunar-night-brand-brain-${today()}.json`,
          data: LN.brain.export(),
          mime: 'application/json',
        }),
      { kind: 'ghost' },
    )
    const importPick = ui.filePick({
      accept: 'application/json,.json',
      label: 'Import .json',
      onFile: async file => {
        let data
        try {
          data = JSON.parse(await file.text())
          if (!data || typeof data.styleGuide !== 'string')
            throw new Error('no style guide')
        } catch (_e) {
          LN.toast('That file is not a Brand Brain export.', { kind: 'err' })
          return
        }
        const na = Array.isArray(data.approved) ? data.approved.length : 0
        const nt = Array.isArray(data.tweaks) ? data.tweaks.length : 0
        LN.sheet({
          title: 'Replace your Brand Brain?',
          body: `${file.name} holds a style guide of ${data.styleGuide.length.toLocaleString('en-US')} characters, ${na} approved edits and ${nt} tweaks. It replaces what this browser holds now.`,
          actions: [
            { label: 'Cancel', kind: 'quiet' },
            {
              label: 'Replace',
              onClick: () => {
                try {
                  LN.brain.import(data)
                  guide.set(LN.brain.get().styleGuide)
                  paintDirty()
                  LN.toast('Brand Brain imported')
                } catch (e) {
                  LN.toast(`Import failed: ${e.message}`, { kind: 'err' })
                }
              },
            },
          ],
        })
      },
    })

    const repaint = () => {
      paintStats()
      paintLists()
      paintCtx()
      paintDirty()
    }
    LN.bus.on('brain', repaint)
    repaint()

    el.append(
      ui.section(
        {
          eyebrow: 'Train your personal editor',
          title: 'Brand Brain',
          lede: 'Your style guide, the edits you approved and the fixes you made by hand. Every Fable 5.1 call from this OS carries all three, and so does every prompt you copy, so the editor learns your taste instead of starting cold.',
        },
        ui.callout(
          'warn',
          'The Brand Brain lives in this browser only. Clearing site data, a private window or a different phone starts from the default. Export the .json after a session of changes and keep it in Files by Google; import it on any device.',
          'It stays on this phone',
        ),
        statsEl,
        h('div', { class: 'ln-row' }, exportBtn, importPick),
      ),
      ui.section(
        {
          eyebrow: 'Part 1',
          title: 'Style guide',
          lede: 'Plain sentences Fable follows unless a request says otherwise. Keep it to what you would tell a new editor on day one.',
        },
        guide.el,
        h('div', { class: 'ln-row' }, saveGuide, resetGuide, dirty),
      ),
      ui.section(
        {
          eyebrow: 'Part 2',
          title: 'Approved edits',
          lede: 'Log the cuts you posted and liked. The eight most recent ride along with every call.',
        },
        h(
          'div',
          { class: 'ln-split' },
          card(
            'Log an approved edit',
            h(
              'div',
              { class: 'fs-form' },
              Object.values(A).map(f => f.el),
            ),
            logApproved,
          ),
          h('div', { class: 'ln-stack' }, approvedList),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Part 3',
          title: 'Final tweaks',
          lede: 'What you changed in CapCut after the AI pass. This is the strongest teacher: Fable is told not to repeat the original mistake.',
        },
        h(
          'div',
          { class: 'ln-split' },
          card(
            'Log a CapCut tweak',
            h(
              'div',
              { class: 'fs-form' },
              Object.values(T).map(f => f.el),
            ),
            logTweak,
          ),
          h('div', { class: 'ln-stack' }, tweakList),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Transparency',
          title: 'What Fable sees',
          lede: 'This block goes on top of every live call and every copied prompt, word for word.',
        },
        h(
          'details',
          { class: 'fs-details' },
          h('summary', null, 'Show the Brand Brain block'),
          ctxPre,
        ),
      ),
    )
  }

  /* ============================================================ 2. Asset recipes */
  const MB_URL =
    'https://cdn.jsdelivr.net/npm/mediabunny@1.62.1/dist/bundles/mediabunny.min.mjs'
  const THREE_URL =
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'

  const pct = v => `${Math.round(v * 100)}%`

  /** The shared spec for every "record an MP4 on the phone" generator. */
  function videoSpec({ W, H, fps, dur, extra = [] }) {
    const fixed = typeof dur === 'number'
    const n = fixed ? Math.round(fps * dur) : 0
    const fileName = fixed
      ? `LN_<name>_${W}x${H}_${fps}p_${dur}s.mp4`
      : `LN_<name>_${W}x${H}_<fps>p.mp4`
    return [
      'HOW IT RUNS',
      '- The chef saves the file, opens it in Chrome on his Pixel 10 Pro XL (Android), sets the controls, previews, taps Render, then saves the video and drops it into CapCut Mobile as an overlay.',
      '- One self-contained file: inline CSS and JS. The only network request allowed is the Mediabunny 1.62.1 ES module, loaded with a dynamic import() from:',
      `  ${MB_URL}`,
      '  No other scripts, fonts, images or frameworks.',
      '',
      'FRAME',
      fixed
        ? `- Canvas exactly ${W} × ${H} px, ${fps} fps, ${dur} s: ${n} frames.`
        : `- Canvas exactly ${W} × ${H} px, at the chosen frame rate, for the chosen in–out range.`,
      '- Pure black #000000 wherever the effect is absent, on every frame. CapCut’s Screen blend drops pure black, so no lifted blacks, gradients, vignettes or haze outside the effect itself.',
      '- No text, logos, UI or watermarks drawn into the frame.',
      fixed
        ? '- Seamless loop: every moving element completes whole cycles over the duration, so the last frame flows into the first.'
        : '- No loop: the plate follows the source clip frame for frame.',
      fixed
        ? '- Deterministic: a seeded PRNG (mulberry32) with the seed as a number input, so the preview and the render show the same frames.'
        : '- Deterministic: the same clip and settings give the same plate.',
      ...extra,
      '',
      'RENDER (try in this order, and print which path ran)',
      `1. Frame-accurate MP4 with WebCodecs + Mediabunny: new Output({format: new Mp4OutputFormat({fastStart: 'in-memory'}), target: new BufferTarget()}); pick the codec with await getFirstEncodableVideoCodec(['avc', 'vp9'], {width: ${W}, height: ${H}}); const src = new CanvasSource(canvas, {codec, bitrate: QUALITY_HIGH}); output.addVideoTrack(src, {frameRate: fps}); await output.start(); for each frame i: draw(i / fps) then await src.add(i / fps, 1 / fps); await output.finalize(); the file is target.buffer.`,
      '2. Fallback when WebCodecs or the import fails: canvas.captureStream(fps) + MediaRecorder, choosing the first type MediaRecorder.isTypeSupported accepts from video/mp4;codecs=avc1, video/mp4, video/webm;codecs=vp9, video/webm. Draw in real time with requestAnimationFrame for exactly the duration, then stop. Say on screen that this path can drop frames and may give a .webm.',
      '',
      'UI (phone first, portrait, dark)',
      '- A live preview scaled to fit the screen width, play/pause, the controls as range sliders with their values shown, Render, a progress bar with frame count, and Cancel.',
      `- When done: a Save button that downloads the file as ${fileName} (or .webm) through an <a download> on a Blob URL, plus a <video> of the result so a long-press can save it if the download is blocked.`,
      '- Buttons at least 44 px tall. Keep the page from scrolling sideways.',
      '',
      'OUTPUT',
      '- Reply with the complete file in one ```html code block, then at most five short lines on how to use it. Nothing else.',
    ].join('\n')
  }

  function overlayJsonSpec(plate, keys) {
    return [
      'OUTPUT',
      'Return JSON only, exactly this shape:',
      `{"plate":"${plate}","params":{${keys.map(k => `"${k}":0.0`).join(',')}},"size":"9x16","fps":24,"duration":5,"seed":7,"blend":"Screen","opacity":60,"why":"one plain sentence"}`,
      '- params are 0 to 1 (two decimals). size is one of 9x16, 16x9, 4x3. fps is 24 or 30. duration is 3, 5, 10 or 15 seconds. seed is an integer 1–9999. opacity is the CapCut overlay opacity, 0–100.',
    ].join('\n')
  }

  const SHOTS = () => (LN.data && LN.data.shots) || []
  const LENSES = () =>
    (LN.data && LN.data.shotGuide && LN.data.shotGuide.lenses) || [
      { lens: '0.5x', focal: '12mm' },
      { lens: '1x', focal: '24mm' },
      { lens: '2x', focal: '48mm' },
      { lens: '5x', focal: '113mm' },
    ]

  const ASSETS = [
    {
      id: 'motion',
      label: 'Motion title',
      tag: 'Motion Forge scene',
      blurb: 'Fable writes a scene as JSON; Motion Forge renders the MP4.',
      routes: [{ id: 'scene', label: 'Motion Forge scene' }],
      controls: [
        {
          key: 'idea',
          type: 'field',
          multiline: true,
          label: 'The idea',
          value:
            'a chapter card for the documentary: "chapter one" over "the first fire", editorial serif, slow fade, one thin amber rule',
        },
        {
          key: 'dur',
          type: 'slider',
          label: 'Length',
          min: 3,
          max: 10,
          step: 1,
          value: 5,
          unit: ' s',
        },
        {
          key: 'aspect',
          type: 'seg',
          label: 'Frame',
          options: [
            { value: '9:16', label: '9:16' },
            { value: '16:9', label: '16:9' },
          ],
          value: '9:16',
        },
        {
          key: 'fps',
          type: 'seg',
          label: 'Frame rate',
          options: [
            { value: 24, label: '24 fps' },
            { value: 30, label: '30 fps' },
          ],
          value: 24,
        },
        {
          key: 'bg',
          type: 'seg',
          label: 'Background',
          options: [
            { value: 'black', label: 'Black · Screen' },
            { value: 'green', label: 'Green · Chroma key' },
          ],
          value: 'black',
        },
      ],
      json: () => true,
      prompt: s => {
        const idea = `${s.idea.trim() || 'a restrained title card'}. ${s.dur} s long, ${s.aspect === '16:9' ? '16:9 landscape (1920 x 1080)' : '9:16 vertical (1080 x 1920)'}, ${s.fps} fps, background "${s.bg}".`
        if (LN.forgeMotion && typeof LN.forgeMotion.buildPrompt === 'function')
          return LN.forgeMotion.buildPrompt(idea)
        return [
          'TASK',
          'Write one motion-graphics SCENE as JSON for Lunar Night OS (Motion Forge). The phone renders it frame by frame to an MP4. You are writing data, not code.',
          '',
          'THE IDEA',
          idea,
          '',
          'OUTPUT',
          'One JSON object: {"version":1,"name":"…","width":1080,"height":1920,"fps":24,"duration":5,"background":"black","layers":[…]}. No fences, no prose.',
        ].join('\n')
      },
      answer: () => [
        'Fable answers with one scene as JSON. Nothing in it runs as code, so it is safe to paste.',
        'Live: tap Send to Motion Forge under the answer. From a chat: copy the JSON, open the Motion Forge tab and paste it into the scene editor.',
        'Play it through, fix any line the checker flags (or ask Fable to fix it), then render the MP4 and save it.',
      ],
      capcut: s =>
        s.bg === 'green'
          ? [
              h(
                'span',
                null,
                'Add it on top: ',
                ui.path('Overlay', 'Add overlay'),
              ),
              h(
                'span',
                null,
                'Key the green: ',
                ui.path('Cutout', 'Chroma key'),
                ', tap the green, Intensity until the edges clean up.',
              ),
              'Trim it to the beat and keep the type inside the safe zone: top 130 px, right 140 px, bottom 484 px clear.',
            ]
          : [
              h(
                'span',
                null,
                'Add it on top: ',
                ui.path('Overlay', 'Add overlay'),
              ),
              h(
                'span',
                null,
                'Select the overlay, then ',
                ui.path('Blend', 'Screen'),
                '. The black drops out; the type stays.',
              ),
              'Pinch it to fill the frame, trim it to the beat, and keep the type out of the top 130 px, right 140 px and bottom 484 px.',
            ],
    },
    {
      id: 'vhs',
      label: 'VHS tracking',
      tag: 'Overlay plate',
      blurb:
        'For confessions, failures and archive chaos. Overlay Forge or a generator.',
      routes: [
        { id: 'forge', label: 'Overlay Forge params' },
        { id: 'html', label: 'HTML generator' },
      ],
      controls: [
        {
          key: 'mood',
          type: 'seg',
          label: 'Tape',
          options: [
            { value: 'clean dub', label: 'Clean dub' },
            { value: 'found tape', label: 'Found tape' },
            { value: 'archive chaos', label: 'Archive chaos' },
          ],
          value: 'found tape',
        },
        {
          key: 'tracking',
          type: 'slider',
          label: 'Tracking error',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.5,
          format: pct,
        },
        {
          key: 'noise',
          type: 'slider',
          label: 'Noise and dropouts',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.45,
          format: pct,
        },
        {
          key: 'chroma',
          type: 'slider',
          label: 'Chroma fringe',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.55,
          format: pct,
        },
        {
          key: 'dur',
          type: 'seg',
          label: 'Length',
          options: [3, 5, 10, 15].map(v => ({ value: v, label: `${v} s` })),
          value: 5,
        },
        {
          key: 'fps',
          type: 'seg',
          label: 'Frame rate',
          options: [
            { value: 24, label: '24 fps' },
            { value: 30, label: '30 fps' },
          ],
          value: 24,
        },
      ],
      json: route => route === 'forge',
      prompt: (s, route) => {
        const brief = [
          'THE PLATE',
          `A VHS tracking-error overlay: "${s.mood}". Tracking error about ${pct(s.tracking)}, noise and dropouts about ${pct(s.noise)}, chroma fringe about ${pct(s.chroma)}. It sits over a documentary confession or failure beat (the format uses VHS 4:3 for those), so it should feel like real tape: a rolling tracking band, horizontal tear lines, head-switching noise along the bottom edge, sparse dropouts, a red/cyan fringe on bright edges. Nothing cartoonish, no fake timestamps or text.`,
        ]
        if (route === 'forge')
          return [
            'TASK',
            'Design the slider settings for the VHS plate in Lunar Night OS Overlay Forge. The chef dials your numbers in, the phone renders the MP4, and CapCut lays it over the clip with Screen blend.',
            '',
            ...brief,
            '',
            'THE PLATE’S CONTROLS',
            '- intensity: overall strength of the tape damage.',
            '- tracking: how far and how often the tracking band rolls and tears.',
            '- noise: snow, dropouts and head-switching noise.',
            '- chroma: red/cyan fringe on bright edges.',
            '',
            overlayJsonSpec('vhs', [
              'intensity',
              'tracking',
              'noise',
              'chroma',
            ]),
            `- Use fps ${s.fps} and duration ${s.dur} unless the look needs otherwise; say why in "why".`,
          ].join('\n')
        return [
          'TASK',
          'Write a single self-contained HTML generator page that draws a VHS tracking-error overlay on a canvas and records it to an MP4 on the phone.',
          '',
          ...brief,
          '',
          videoSpec({
            W: 1080,
            H: 1920,
            fps: s.fps,
            dur: s.dur,
            extra: [
              '- Controls: tracking, noise, chroma, intensity (0–1), starting at the values above.',
              '- Draw the damage as light on black only (white snow, bright tear lines, coloured fringe), never dark marks: Screen blend can only brighten.',
            ],
          }),
        ].join('\n')
      },
      answer: route =>
        route === 'forge'
          ? [
              'Fable answers with the plate settings as JSON.',
              'Open the Overlay Forge tab, pick the VHS plate, and set each slider to the value shown under the answer.',
              'Set size, frame rate, length and seed the same, preview, then render the MP4 and save it.',
            ]
          : [
              'Fable answers with one HTML file. Live: tap Save generator (.html) under the answer. From a chat: copy the code block into a new file named vhs-generator.html.',
              'Open the file in Chrome on the phone (Files by Google › tap it › Open with Chrome).',
              'Preview, tap Render, then Save. The page says whether it made a frame-accurate MP4 or a real-time recording.',
            ],
      capcut: () => [
        h('span', null, 'Add the plate: ', ui.path('Overlay', 'Add overlay')),
        h(
          'span',
          null,
          'Select it, then ',
          ui.path('Blend', 'Screen'),
          '. Opacity 40–70 to taste.',
        ),
        'Trim it to the confession or failure beat only. The canon keeps VHS for those moments.',
      ],
    },
    {
      id: 'leak',
      label: 'Dreamcore leak',
      tag: 'Overlay plate',
      blurb: 'Warm peach-to-lavender light for memory and heritage beats.',
      routes: [
        { id: 'forge', label: 'Overlay Forge params' },
        { id: 'html', label: 'HTML generator' },
      ],
      controls: [
        {
          key: 'variant',
          type: 'seg',
          label: 'Style',
          options: [
            { value: 'drift', label: 'Drift' },
            { value: 'burn', label: 'Edge burn' },
          ],
          value: 'drift',
        },
        {
          key: 'warmth',
          type: 'slider',
          label: 'Warmth',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.7,
          format: pct,
        },
        {
          key: 'speed',
          type: 'slider',
          label: 'Drift speed',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.3,
          format: pct,
        },
        {
          key: 'intensity',
          type: 'slider',
          label: 'Intensity',
          min: 0,
          max: 1,
          step: 0.05,
          value: 0.65,
          format: pct,
        },
        {
          key: 'dur',
          type: 'seg',
          label: 'Length',
          options: [3, 5, 10, 15].map(v => ({ value: v, label: `${v} s` })),
          value: 10,
        },
        {
          key: 'fps',
          type: 'seg',
          label: 'Frame rate',
          options: [
            { value: 24, label: '24 fps' },
            { value: 30, label: '30 fps' },
          ],
          value: 24,
        },
      ],
      json: route => route === 'forge',
      prompt: (s, route) => {
        const brief = [
          'THE PLATE',
          `A Dreamcore light leak, "${s.variant === 'burn' ? 'edge burn: light bleeding in from one frame edge like an over-exposed gate' : 'drift: soft blooms of light drifting slowly across the frame'}". Palette: the house Dreamcore look, analogous peach to lavender (warm highlights, lavender falloff), never neon, never green. Warmth about ${pct(s.warmth)}, drift speed about ${pct(s.speed)}, intensity about ${pct(s.intensity)}. It sits over memory and heritage beats in the documentary, so it should feel gentle and unhurried: big soft shapes, slow, no sparkles or lens-flare clichés.`,
        ]
        if (route === 'forge')
          return [
            'TASK',
            'Design the slider settings for the light-leak plate in Lunar Night OS Overlay Forge. The chef dials your numbers in, the phone renders the MP4, and CapCut lays it over the clip with Screen blend.',
            '',
            ...brief,
            '',
            'THE PLATE’S CONTROLS',
            '- variant: "drift" or "burn" (put it in params as a string).',
            '- warmth: 0 cool to 1 warm amber.',
            '- speed: how fast the light drifts.',
            '- intensity: how bright the light gets.',
            '- edgeBias: 0 spread across the frame, 1 hugging the edges.',
            '',
            overlayJsonSpec('leak', [
              'warmth',
              'speed',
              'intensity',
              'edgeBias',
            ]).replace('"params":{', `"params":{"variant":"${s.variant}",`),
            `- Use fps ${s.fps} and duration ${s.dur} unless the look needs otherwise; say why in "why". Opacity for a leak sits around 30–40.`,
          ].join('\n')
        return [
          'TASK',
          'Write a single self-contained HTML generator page that draws a Dreamcore light-leak overlay on a canvas and records it to an MP4 on the phone.',
          '',
          ...brief,
          '',
          videoSpec({
            W: 1080,
            H: 1920,
            fps: s.fps,
            dur: s.dur,
            extra: [
              '- Controls: warmth, drift speed, intensity, edge bias (0–1), a Drift/Edge burn switch, and two colour pickers starting at peach #F2B48C and lavender #B9A3E3.',
              '- Build the light from large radial gradients composited with "lighter" and a heavy blur, so it is smooth with no banding; add a 1–2% dither if banding shows.',
            ],
          }),
        ].join('\n')
      },
      answer: route =>
        route === 'forge'
          ? [
              'Fable answers with the plate settings as JSON.',
              'Open the Overlay Forge tab, pick Light leak, and set each slider to the value shown under the answer.',
              'Set size, frame rate, length and seed the same, preview, then render the MP4 and save it.',
            ]
          : [
              'Fable answers with one HTML file. Live: tap Save generator (.html). From a chat: copy the code block into a new file named leak-generator.html.',
              'Open it in Chrome on the phone (Files by Google › tap it › Open with Chrome).',
              'Preview, tap Render, then Save.',
            ],
      capcut: () => [
        h('span', null, 'Add the plate: ', ui.path('Overlay', 'Add overlay')),
        h(
          'span',
          null,
          'Select it, then ',
          ui.path('Blend', 'Screen'),
          '. Opacity 30–40.',
        ),
        'Memory and heritage beats only. Keep the leak off the faces and the plate’s honest colours.',
      ],
    },
    {
      id: 'halation',
      label: 'Halation plate',
      tag: 'Overlay plate',
      blurb:
        'Red-orange bloom around bright edges, built from your own clip or CapCut’s tools.',
      routes: [
        { id: 'capcut', label: 'CapCut recipe params' },
        { id: 'html', label: 'HTML generator' },
      ],
      controls: [
        {
          key: 'look',
          type: 'seg',
          label: 'Look',
          options: [
            { value: 'dreamcore', label: 'Dreamcore · heavy warm' },
            { value: 'night', label: 'Lunar Night · faint cool' },
          ],
          value: 'dreamcore',
        },
        {
          key: 'threshold',
          type: 'slider',
          label: 'Highlight threshold',
          min: 0.6,
          max: 0.95,
          step: 0.01,
          value: 0.8,
          format: v => v.toFixed(2),
        },
        {
          key: 'blur',
          type: 'slider',
          label: 'Blur',
          min: 20,
          max: 40,
          step: 1,
          value: 28,
          unit: ' px',
        },
        {
          key: 'opacity',
          type: 'slider',
          label: 'Opacity',
          min: 25,
          max: 45,
          step: 1,
          value: 35,
          unit: '%',
        },
      ],
      json: route => route === 'capcut',
      prompt: (s, route) => {
        const look =
          s.look === 'dreamcore'
            ? 'Dreamcore: heavy, warm halation (red-orange bleed into neighbours), lifted milky blacks are fine in this look.'
            : 'Lunar Night: faint, cool halation; the black floor stays at 0, so the plate adds light only around the brightest cores (bulbs, signs, the moon). Glow radius about 2% of frame width.'
        if (route === 'capcut')
          return [
            'TASK',
            'Set the numbers for the chef’s halation recipe in CapCut Mobile. There is no halation plate in the OS; the recipe uses CapCut’s own tools.',
            '',
            'THE RECIPE (from his playbook)',
            'Duplicate the clip onto an overlay track, set Blend to Screen or Lighten, add Blur 20–40, warm the Temperature, lower Opacity to 25–45%, then optionally a Glow effect at low strength.',
            '',
            'THE LOOK',
            look,
            `Starting point: blur ${s.blur}, opacity ${s.opacity}%.`,
            '',
            'OUTPUT',
            'Return JSON only, exactly this shape:',
            '{"blend":"Screen","blur":28,"temperature":20,"opacity":35,"glow":10,"why":"one plain sentence"}',
            '- blend is "Screen" or "Lighten". blur 20–40. temperature −50 to 50 (CapCut Adjust on the duplicate). opacity 25–45. glow 0–30 (0 means skip the Glow effect).',
            '- Free CapCut tools only, nothing with a Pro badge.',
          ].join('\n')
        return [
          'TASK',
          'Write a single self-contained HTML generator page that builds a halation plate from one of the chef’s own clips and records it to an MP4 on the phone. The plate is the glow only, on black, so CapCut can Screen it back over the same clip.',
          '',
          'THE LOOK',
          look,
          '',
          'PROCESS',
          '- A file input (accept="video/*") loads the clip from the camera roll into a muted <video>. Show its length and an in/out range (max 15 s).',
          `- Per frame: draw the video frame to an offscreen canvas at 1080 × 1920 (cover-fit), keep only pixels whose luma is above the threshold (start ${s.threshold.toFixed(2)}, soft knee 0.05), blur that mask (start ${s.blur} px, using ctx.filter = "blur()"), tint it ${s.look === 'dreamcore' ? 'red-orange (#FF5A1F core falling to #FF9A5A)' : 'cool silver-blue (#9FB8FF), very faint'}, and draw it on pure black. The original picture never appears in the plate.`,
          '- Frame stepping for the render: set video.currentTime = in + i / fps and await the "seeked" event (or requestVideoFrameCallback) before drawing each frame, so frames line up with the clip.',
          '- Use the clip’s own frame rate if the user picks it from 24 / 30 / 60; default 24.',
          '',
          videoSpec({
            W: 1080,
            H: 1920,
            fps: 24,
            dur: null,
            extra: [
              '- Controls: threshold, blur, tint strength, and a before/after preview toggle that shows the plate Screened over the frame.',
            ],
          }),
        ].join('\n')
      },
      answer: route =>
        route === 'capcut'
          ? [
              'Fable answers with five numbers.',
              'Build the recipe in CapCut with them (the steps are below).',
              'Check it on a second screen at 50% brightness; if the plate reads as fog, drop the opacity first.',
            ]
          : [
              'Fable answers with one HTML file. Live: tap Save generator (.html). From a chat: copy the code block into a new file named halation-generator.html.',
              'Open it in Chrome on the phone, load the clip, set the range, preview, Render, Save.',
              'The plate lines up with the clip frame for frame, so start both at the same point on the timeline.',
            ],
      capcut: route =>
        route === 'capcut'
          ? [
              h(
                'span',
                null,
                'Select the clip, ',
                ui.path('Duplicate'),
                ', then move the copy to an overlay track (',
                ui.path('Overlay'),
                ' or Switch to overlay, depending on the version).',
              ),
              h(
                'span',
                null,
                'On the copy: ',
                ui.path('Blend', 'Screen'),
                ' (or Lighten), Opacity from the answer.',
              ),
              h(
                'span',
                null,
                'Still on the copy: ',
                ui.path('Adjust', 'Temperature'),
                ' and a Blur effect at the answer’s value.',
              ),
              'Optional: a Glow effect at low strength over both.',
            ]
          : [
              h(
                'span',
                null,
                'Add the plate: ',
                ui.path('Overlay', 'Add overlay'),
              ),
              h(
                'span',
                null,
                'Line it up with the clip’s first frame, then ',
                ui.path('Blend', 'Screen'),
                ', Opacity 25–45.',
              ),
            ],
      verify:
        'Where Duplicate and the move to an overlay track sit varies by CapCut version. Check that Blend shows on the overlay copy; it does not work on main-track clips.',
    },
    {
      id: 'previs',
      label: '3D camera pre-vis',
      tag: 'HTML page',
      blurb:
        'Block a shot in 3D on the phone before you cook: plate, phone, path.',
      routes: [{ id: 'html', label: 'three.js page' }],
      controls: [
        {
          key: 'shot',
          type: 'select',
          label: 'Shot from the bible',
          options: () =>
            SHOTS()
              .filter(x => x.cat === 'rd' || x.cat === 'review')
              .map(x => ({ value: x.id, label: `${x.id} · ${x.name}` })),
          value: 'rd-01',
        },
        {
          key: 'move',
          type: 'seg',
          label: 'Camera move',
          options: [
            { value: 'static', label: 'Static' },
            { value: 'push-in', label: 'Push-in' },
            { value: 'orbit', label: 'Orbit' },
            { value: 'slide', label: 'Slide' },
            { value: 'overhead drop', label: 'Overhead drop' },
          ],
          value: 'push-in',
        },
        {
          key: 'lens',
          type: 'seg',
          label: 'Lens',
          options: () => LENSES().map(l => ({ value: l.lens, label: l.lens })),
          value: '2x',
        },
        {
          key: 'diam',
          type: 'slider',
          label: 'Plate diameter',
          min: 20,
          max: 34,
          step: 1,
          value: 28,
          unit: ' cm',
        },
        {
          key: 'dur',
          type: 'slider',
          label: 'Shot length',
          min: 2,
          max: 10,
          step: 1,
          value: 5,
          unit: ' s',
        },
      ],
      json: () => false,
      prompt: s => {
        const shot = SHOTS().find(x => x.id === s.shot)
        const lens = LENSES().find(l => l.lens === s.lens) || {
          focal: '24mm',
        }
        const shotText = shot
          ? `${shot.name} (${shot.id}): ${shot.logline} Bible settings: lens ${shot.lens}, ${shot.fps}, hold "${shot.hold}", light: ${shot.light}`
          : 'A plating shot at the pass.'
        return [
          'TASK',
          'Write ONE self-contained HTML page: a simple 3D pre-vis (blocking) of a single shot, so the chef can rehearse the camera move on his phone before he cooks. Blocking, not a render: clean primitives, readable at a glance.',
          '',
          'THE SHOT',
          `- ${shotText}`,
          `- Planned move: ${s.move}, ${s.dur} s, on the ${s.lens} lens (${lens.focal} full-frame equivalent), vertical 9:16.`,
          `- Plate: round, ${s.diam} cm across, on a counter or pass 90 cm high.`,
          '',
          'LIBRARY',
          '- three.js r128 only, as one classic script tag:',
          `  <script src="${THREE_URL}"></script>`,
          '  Use the global THREE. No ES module imports, no other scripts, no OrbitControls file (write a small one-finger orbit and two-finger zoom yourself), no textures, models or web fonts.',
          '',
          'SCENE (1 unit = 1 cm, real sizes)',
          '- Counter slab, the plate (a flat cylinder with a raised rim), two or three primitives as food in amber #E5A93C and crimson #9E2A2B, background obsidian #08080A, one key light from the side the shot’s light note describes, a dim fill.',
          '- The phone as a 7.6 × 16.3 × 0.9 cm box with a wireframe frustum for its view. Field of view: treat the lens as a full-frame equivalent focal length f; the video’s long side spans 2·atan(17.3 / f), the short side 2·atan(9.7 / f); held vertical, the long side is vertical.',
          '- The camera path as a visible line with keyframe dots, and the 9:16 frame edge drawn on the plate plane when looking from above.',
          '',
          'CONTROLS (phone first, portrait)',
          '- Two views: Camera (exactly what the phone sees, 9:16 letterboxed, with a rule-of-thirds overlay) and Overview (orbit around the set). A toggle switches them.',
          '- Play/pause, a scrub slider over the move, and speed 0.5x / 1x.',
          '- A HUD: time, lens-to-plate distance in cm, height above the counter in cm, angle above the counter in degrees. These numbers are the point: he copies them to the real rig.',
          '- Sliders to adjust the move: start and end distance, height, and (for orbit) arc in degrees.',
          '- Optional Record animatic button: canvas.captureStream(24) + MediaRecorder on the Camera view for the shot length, saved through an <a download> Blob link (mp4 if supported, else webm).',
          '- Buttons at least 44 px, devicePixelRatio capped at 2, no sideways scroll, resize-safe.',
          '',
          'OUTPUT',
          '- The complete file in one ```html code block, then at most four short lines on how to use it. Nothing else.',
        ].join('\n')
      },
      answer: () => [
        'Fable answers with one HTML file. Live: tap Save generator (.html). From a chat: copy the code block into a new file named previs.html.',
        'Open it in Chrome on the phone. Scrub the move in Camera view until the frame works.',
        'Copy the HUD numbers (distance, height, angle) to the shot ticket, then rehearse the move once with an empty plate.',
      ],
      capcut: () => [
        'Nothing to import for the final cut: the pre-vis is a rehearsal tool.',
        h(
          'span',
          null,
          'If you record the animatic, drop it on the main track as a stand-in to time the edit, then replace it: ',
          ui.path('Replace'),
          '.',
        ),
      ],
    },
    {
      id: 'foley',
      label: 'Foley and spatial stems',
      tag: 'Sound',
      blurb:
        'Sear, knife, plate, pour or the night itself: as Sound Forge settings or a WebAudio generator.',
      routes: [
        { id: 'forge', label: 'Sound Forge params' },
        { id: 'html', label: 'WebAudio generator' },
      ],
      controls: [
        {
          key: 'sound',
          type: 'select',
          label: 'Sound',
          options: [
            'sear sizzle in a hot pan',
            'knife on a wooden board',
            'plate set down on steel',
            'jus or sauce pour',
            'ice and a cold walk-in hum',
            'night ambience: crickets, distant road',
            'a single car pass at night',
          ].map(v => ({ value: v, label: v })),
          value: 'sear sizzle in a hot pan',
        },
        {
          key: 'space',
          type: 'seg',
          label: 'Space',
          options: [
            { value: 'mono centre', label: 'Mono centre' },
            { value: 'wide stereo', label: 'Wide stereo' },
            { value: 'moves left to right', label: 'Left → right' },
            { value: 'binaural (headphones)', label: 'Binaural' },
          ],
          value: 'wide stereo',
        },
        {
          key: 'dur',
          type: 'slider',
          label: 'Length',
          min: 1,
          max: 30,
          step: 1,
          value: 6,
          unit: ' s',
        },
        {
          key: 'stems',
          type: 'slider',
          label: 'Variations',
          min: 1,
          max: 4,
          step: 1,
          value: 2,
        },
      ],
      json: route => route === 'forge',
      prompt: (s, route) => {
        const brief = [
          'THE SOUND',
          `- ${s.sound}, ${s.dur} s, ${s.space}, ${s.stems} variation${s.stems > 1 ? 's' : ''} so repeats don’t sound copy-pasted.`,
          '- Use: Marketplace Review puts one SFX per big moment at 30–60 under voice at 100; the documentary wants foley close and loud under the voice; Lunar Night reels use no SFX (night sound only, at 100).',
          '- Close-miked and dry; no music, no voice. Peaks at −3 dBFS, 10 ms fades in and out so nothing clicks.',
        ]
        if (route === 'forge')
          return [
            'TASK',
            'Design synthesis settings for this sound so the chef can dial them into Lunar Night OS Sound Forge (which renders 48 kHz WAV stems on the phone).',
            '',
            ...brief,
            '',
            'OUTPUT',
            'Return JSON only, exactly this shape:',
            '{"stems":[{"name":"sear-a","duration":6,"layers":[{"source":"noise|tone|clicks|crackle|rumble","bandHz":[300,6000],"levelDb":-12,"attackMs":5,"decayMs":200,"sustain":0.6,"releaseMs":400,"rateHz":0,"pan":0,"panMove":"static|left-to-right|right-to-left|orbit"}],"peakDb":-3,"why":"one plain sentence"}]}',
            `- ${s.stems} stems. 1 to 5 layers each. Plain numbers only.`,
          ].join('\n')
        return [
          'TASK',
          'Write ONE self-contained HTML page that synthesises this sound with the Web Audio API and saves it as WAV files on the phone. No samples, no network requests, no libraries.',
          '',
          ...brief,
          '',
          'ENGINE',
          `- OfflineAudioContext, 2 channels, 48000 Hz, ${s.dur} s per stem. Build the sound from noise buffers, filters (BiquadFilterNode), envelopes (GainNode automation) and oscillators.`,
          '- Seeded PRNG (mulberry32) for every noise buffer and event time, with a seed input, so a stem can be re-made exactly.',
          `- Space: ${s.space}. Use StereoPannerNode automation for movement; for binaural use PannerNode with panningModel "HRTF" and a moving position.`,
          '- Write each render as 24-bit PCM WAV by hand (RIFF header + little-endian samples), normalised so the peak is −3 dBFS.',
          '',
          'UI (phone first, dark, buttons at least 44 px)',
          '- Sliders for the main character of the sound (for a sear: heat, fat crackle, pan size), a seed, Render, and an <audio> preview for each stem.',
          `- Save buttons that download LN_${s.sound.split(/[^a-z]+/i)[0]}_<n>_48k24.wav through an <a download> Blob link, plus a "Save all" that saves them one after another.`,
          '',
          'OUTPUT',
          '- The complete file in one ```html code block, then at most four short lines on how to use it. Nothing else.',
        ].join('\n')
      },
      answer: route =>
        route === 'forge'
          ? [
              'Fable answers with one settings sheet per stem.',
              'Open the Sound Forge tab and dial the layers in by ear; the numbers are a starting point, not gospel.',
              'Render the WAVs, then listen on the phone speaker and on earbuds before you save.',
            ]
          : [
              'Fable answers with one HTML file. Live: tap Save generator (.html). From a chat: copy the code block into a new file named foley-generator.html.',
              'Open it in Chrome on the phone, render, listen, save the WAVs.',
            ],
      capcut: () => [
        h(
          'span',
          null,
          'Add the sound: ',
          ui.path('Audio', 'Sounds', 'Your sounds', 'From device'),
          '.',
        ),
        h(
          'span',
          null,
          'If the WAV does not show, put it in a video first and use ',
          ui.path('Audio', 'Extracted'),
          ', then Import sound only.',
        ),
        'Volume 30–60 for an SFX under voice at 100. One per big moment.',
      ],
      verify:
        'The exact tab names for importing audio from device storage on CapCut Android are not established in your notes. Look for Your sounds or From device under Audio › Sounds.',
    },
  ]
  const ASSET = Object.fromEntries(ASSETS.map(a => [a.id, a]))

  function buildControl(spec, value, onChange) {
    const opts =
      typeof spec.options === 'function' ? spec.options() : spec.options
    if (spec.type === 'slider')
      return ui.slider({
        label: spec.label,
        min: spec.min,
        max: spec.max,
        step: spec.step,
        value,
        unit: spec.unit,
        format: spec.format,
        onInput: onChange,
      }).el
    if (spec.type === 'seg')
      return ui.seg({ label: spec.label, options: opts, value, onChange }).el
    if (spec.type === 'select') {
      const c = ui.select({
        label: spec.label,
        options: opts,
        value,
        onChange,
      })
      return c.el
    }
    return ui.field({
      label: spec.label,
      multiline: spec.multiline,
      rows: 3,
      value,
      onInput: onChange,
    }).el
  }

  function renderRecipes(el) {
    const st = saved.recipes || {}
    let current = ASSET[st.current] ? st.current : 'motion'
    const params = {}
    const routes = {}
    for (const a of ASSETS) {
      params[a.id] = {}
      for (const c of a.controls)
        params[a.id][c.key] =
          st.params && st.params[a.id] && st.params[a.id][c.key] !== undefined
            ? st.params[a.id][c.key]
            : c.value
      routes[a.id] =
        st.routes && a.routes.some(r => r.id === st.routes[a.id])
          ? st.routes[a.id]
          : a.routes[0].id
    }
    const persist = () => remember('recipes', { current, params, routes })

    const picks = h('div', {
      class: 'fs-picks',
      role: 'group',
      'aria-label': 'Asset',
    })
    const btns = ASSETS.map(a =>
      h(
        'button',
        {
          type: 'button',
          class: 'fs-pick',
          'aria-pressed': String(a.id === current),
          onClick: () => {
            current = a.id
            for (const b of btns)
              b.setAttribute('aria-pressed', String(b.dataset.id === a.id))
            persist()
            paint()
          },
          dataset: { id: a.id },
        },
        h('span', { class: 'fs-pick-tag' }, a.tag),
        h('b', null, a.label),
      ),
    )
    picks.append(...btns)
    const body = h('div', { class: 'fs-recipe' })

    function paint() {
      const a = ASSET[current]
      const s = params[a.id]
      const route = () => routes[a.id]
      const getPrompt = () => a.prompt(s, route())
      const box = promptBox(getPrompt)
      const answerSteps = h('div')
      const capSteps = h('div')
      const paintSteps = () => {
        answerSteps.replaceChildren(ui.steps(a.answer(route())))
        capSteps.replaceChildren(ui.steps(a.capcut(route())))
      }
      const routeSeg =
        a.routes.length > 1
          ? ui.seg({
              label: 'Route',
              options: a.routes.map(r => ({ value: r.id, label: r.label })),
              value: route(),
              onChange: v => {
                routes[a.id] = v
                persist()
                box.refresh()
                paintSteps()
                result.replaceChildren()
              },
            }).el
          : null
      const controls = a.controls.map(c =>
        buildControl(c, s[c.key], v => {
          s[c.key] = v
          persist()
          box.refresh()
          paintSteps()
        }),
      )
      const result = h('div', { class: 'fs-result' })
      const action = liveAction(
        'Ask Fable 5.1',
        async (signal, status) => {
          result.replaceChildren()
          const isJson = a.json(route())
          if (isJson) {
            const res = await LN.ai.ask(getPrompt(), { json: true, signal })
            showJson(a, route(), res, result)
            return
          }
          const pre = h('pre', { class: 'fs-prompt-text fs-stream' })
          result.append(pre)
          const res = await LN.ai.ask(getPrompt(), {
            signal,
            onText: ({ text }) => {
              pre.textContent = text
              status.textContent = `Writing… ${text.length.toLocaleString('en-US')} characters`
            },
          })
          showText(a, res, result, pre)
        },
        { busy: 'Fable 5.1 is designing it…' },
      )
      paintSteps()
      body.replaceChildren(
        h(
          'div',
          { class: 'ln-split' },
          h(
            'div',
            { class: 'ln-stack' },
            h('p', { class: 'fs-blurb' }, a.blurb),
            routeSeg,
            h('div', { class: 'fs-form' }, controls),
          ),
          h(
            'div',
            { class: 'ln-stack' },
            box.el,
            action.el,
            offlineNote(),
            result,
          ),
        ),
        h(
          'div',
          { class: 'ln-grid wide fs-howto' },
          card('What to do with Fable’s answer', answerSteps),
          card(
            'CapCut import',
            capSteps,
            a.verify ? ui.callout('verify', a.verify) : null,
          ),
        ),
      )
    }

    function showJson(a, route, res, out) {
      let data
      try {
        data = jsonFrom(res)
      } catch (e) {
        out.append(ui.callout('warn', e.message, 'Could not read the answer'))
        return
      }
      const text = JSON.stringify(data, null, 2)
      if (a.id === 'motion') {
        const scene =
          data && data.scene && typeof data.scene === 'object'
            ? data.scene
            : data
        const sceneText =
          LN.forgeMotion && LN.forgeMotion.stringify
            ? LN.forgeMotion.stringify(scene)
            : JSON.stringify(scene, null, 2)
        const check =
          LN.forgeMotion && LN.forgeMotion.validateScene
            ? LN.forgeMotion.validateScene(scene)
            : { ok: true, errors: [], warnings: [] }
        out.append(
          check.ok
            ? ui.callout(
                'ok',
                `Scene checks out: ${(scene.layers || []).length} layers, ${scene.duration} s.${check.warnings.length ? ` ${check.warnings.join(' ')}` : ''}`,
              )
            : ui.callout(
                'warn',
                h(
                  'ul',
                  { class: 'fs-list' },
                  check.errors.slice(0, 8).map(e => h('li', null, e)),
                ),
                'Motion Forge will flag these',
              ),
          h(
            'div',
            { class: 'ln-row' },
            ui.btn('Send to Motion Forge', () => sendToMotion(scene, out)),
            ui.btn('Copy scene JSON', () => LN.copy(sceneText), {
              kind: 'quiet',
            }),
          ),
          ui.copyBlock(sceneText, { title: 'Scene JSON' }),
        )
        return
      }
      if (route === 'forge' && data.params && a.id !== 'foley') {
        const rows = Object.entries(data.params).map(([k, v]) => [
          k,
          typeof v === 'number' ? `${pct(clamp(v, 0, 1))}  (${v})` : String(v),
        ])
        rows.push(
          ['Size', String(data.size || '9x16')],
          ['Frame rate', `${data.fps || 24} fps`],
          ['Length', `${data.duration || 5} s`],
          ['Seed', String(data.seed || 1)],
          [
            'In CapCut',
            `${data.blend || 'Screen'}, opacity ${data.opacity ?? '—'}`,
          ],
        )
        out.append(
          card(
            'Set these in Overlay Forge',
            ui.kv(rows),
            data.why ? sub(str(data.why)) : null,
          ),
        )
      } else if (a.id === 'halation') {
        out.append(
          card(
            'Your halation numbers',
            ui.kv([
              ['Blend', String(data.blend || 'Screen')],
              ['Blur', String(data.blur ?? '—')],
              ['Temperature', LN.fmt.signed(Number(data.temperature) || 0)],
              ['Opacity', `${data.opacity ?? '—'}%`],
              ['Glow', data.glow ? String(data.glow) : 'skip'],
            ]),
            data.why ? sub(str(data.why)) : null,
          ),
        )
      } else if (a.id === 'foley' && Array.isArray(data.stems)) {
        out.append(
          ...data.stems.slice(0, 6).map(stem =>
            card(
              `${str(stem.name, 40) || 'stem'} · ${stem.duration || '?'} s`,
              ui.table(
                ['Source', 'Band Hz', 'dB', 'A/D/S/R', 'Pan'],
                (stem.layers || [])
                  .slice(0, 6)
                  .map(L => [
                    str(L.source, 20),
                    Array.isArray(L.bandHz) ? L.bandHz.join('–') : '—',
                    String(L.levelDb ?? '—'),
                    `${L.attackMs ?? 0}/${L.decayMs ?? 0}/${L.sustain ?? 0}/${L.releaseMs ?? 0}`,
                    `${L.pan ?? 0} ${L.panMove && L.panMove !== 'static' ? str(L.panMove, 20) : ''}`,
                  ]),
                { label: 'Stem layers' },
              ),
              stem.why ? sub(str(stem.why)) : null,
            ),
          ),
        )
      }
      out.append(ui.copyBlock(text, { title: 'Fable’s answer (JSON)' }))
    }

    function showText(a, res, out, pre) {
      const text = (res && res.text) || ''
      pre.remove()
      const code = codeFrom(text, 'html')
      if (!code) {
        out.append(
          ui.callout(
            'warn',
            'No HTML file came back. Ask again, or copy the prompt into a Fable 5.1 chat.',
          ),
          ui.copyBlock(text, { title: 'Answer' }),
        )
        return
      }
      const notes = text.slice(text.lastIndexOf('```') + 3).trim()
      out.append(
        res && res.truncated
          ? ui.callout(
              'warn',
              'The answer was cut off before the end, so the file is probably incomplete. Ask again, or use the prompt in a Fable 5.1 chat.',
            )
          : ui.callout(
              'ok',
              `${(code.length / 1024).toFixed(1)} KB of HTML. Save it, then open it in Chrome on the phone.`,
            ),
        h(
          'div',
          { class: 'ln-row' },
          ui.btn('Save generator (.html)', () =>
            LN.save({
              filename: `ln-${a.id}-generator.html`,
              data: code,
              mime: 'text/html',
            }),
          ),
          ui.btn('Copy code', () => LN.copy(code), { kind: 'quiet' }),
        ),
        notes ? sub(notes.slice(0, 600)) : null,
        h(
          'details',
          { class: 'fs-details' },
          h('summary', null, 'Show the code'),
          h('pre', { class: 'fs-prompt-text' }, code),
        ),
      )
    }

    el.append(
      ui.section(
        {
          eyebrow: 'Fable writes it, the phone makes it',
          title: 'Asset recipes',
          lede: 'Pick an asset and set it up. You get a precise prompt, what to do with the answer, and how it goes into CapCut. Fable 5.1 writes code or settings; the phone’s browser or the other Forge tabs render the actual file.',
        },
        picks,
        body,
      ),
    )
    paint()
  }

  /** Hand a scene to Motion Forge and switch to its tab. */
  function sendToMotion(scene, out) {
    LN.bus.emit('motion:load', scene)
    const root = out.closest('.m-forge')
    const tab =
      root &&
      LN.$$('[role="tab"]', root).find(
        b => b.textContent.trim() === 'Motion Forge',
      )
    if (tab) tab.click()
    LN.toast(
      'Sent to Motion Forge. If the editor does not show it, use Copy scene JSON and paste it there.',
      { ms: 5200 },
    )
  }

  /* ============================================================ 3. Shoot planner */
  function shotsFor(fid) {
    const all = SHOTS()
    const f = FMT[fid]
    let list = f.cat ? all.filter(x => x.cat === f.cat) : []
    if (fid === 'night')
      list = all.filter(x =>
        (x.tags || []).some(t => /night|moon|lunar|street|drive/.test(t)),
      )
    return list
  }
  const LUNAR_STARTER = [
    {
      name: 'Establishing: one coloured light on one plain building',
      lens: '1x',
      fps: '24 fps · 1/24 s',
      ois: 'Off · braced',
      duration: '8 s roll',
      notes:
        'Subject in the middle third, horizon in the lower third, lots of sky. 3200K, ISO 400, zebras inside the brightest bulb.',
    },
    {
      name: 'The sign, tighter',
      lens: '2x',
      fps: '24 fps · 1/24 s',
      ois: 'Off · braced',
      duration: '8 s roll',
      notes:
        'Expose for the neon or sodium: ISO only, stay under 1600. Grey sky means go colder (2800K).',
    },
    {
      name: 'The car pass (hero, cut third or last)',
      lens: '1x',
      fps: '24 fps · 1/24 s',
      ois: 'Off · braced on the car roof or a post',
      duration: '8 s roll, wait for the car',
      notes:
        'Hands off. Let the tail lights streak across the frame; the 360° shutter does the work.',
    },
    {
      name: 'Second building, a different colour',
      lens: '1x',
      fps: '24 fps · 1/24 s',
      ois: 'Off · braced',
      duration: '8 s roll',
      notes:
        'Green porch bulb or red tail light against the violet sky. No people in frame.',
    },
    {
      name: 'Sky hold with the moon or a pole light',
      lens: '2x',
      fps: '24 fps · 1/24 s',
      ois: 'Off · braced',
      duration: '8 s roll',
      notes:
        'Shoot before the sky goes black: 30–75 min after sunset (5:30–6:30 pm in Santa Fe now).',
    },
  ]
  function starterPlan(fid) {
    if (fid === 'night') return LUNAR_STARTER.map(x => ({ ...x }))
    const plans = (LN.data && LN.data.shotPlans) || []
    const pid = {
      review: 'plan-review',
      doc: 'plan-doc-night',
      rd: 'plan-rd-night',
    }[fid]
    const plan = plans.find(p => p.id === pid)
    const byId = Object.fromEntries(SHOTS().map(x => [x.id, x]))
    return ((plan && plan.shots) || [])
      .slice(0, 8)
      .map(id => byId[id])
      .filter(Boolean)
      .map(x => ({
        shotId: x.id,
        name: x.name,
        lens: x.lens,
        fps: x.fps,
        ois: x.ois,
        duration: x.duration,
        notes: str(x.logline, 240),
      }))
  }

  function plannerPrompt(s) {
    const f = FMT[s.format]
    const shots = shotsFor(s.format)
    const lenses = LENSES()
      .map(l => `${l.lens} (${l.focal} eq.)`)
      .join(', ')
    return [
      'TASK',
      `Plan the shoot for one ${f.label} video. The plan becomes tickets on the chef’s shot rail, in shooting order.`,
      '',
      'THE SHOOT',
      `- Format: ${f.label}. ${f.style}`,
      `- Dish or venue: ${s.dish.trim() || 'not given'}`,
      `- Location and time: ${s.where.trim() || 'not given'}`,
      `- Constraints: ${s.constraints.trim() || 'none given'}`,
      '',
      'THE ONLY GEAR',
      `- A Pixel 10 Pro XL, handheld or braced on what is there (counter, wall, car roof, a rack over hotel pans). No gimbal, tripod rig, external mic, light kit or desktop software. Lenses: ${lenses}. Frame rates: 4K24, 4K30, 4K60, SLO120, SLO240. Stabilization: Standard, Locked, Active (1080p only), Cinematic Pan, or Off when braced.`,
      '',
      shots.length
        ? 'SHOT BIBLE (reuse an id when a shot fits; leave shotId out when none does)'
        : 'SHOT BIBLE: none for this format; leave shotId out.',
      ...shots.slice(0, 45).map(x => `${x.id} ${x.name} (${x.lens}, ${x.fps})`),
      '',
      'OUTPUT',
      'Return JSON only, exactly this shape:',
      '{"plan":[{"name":"short shot name","lens":"1x","fps":"4K24","ois":"Locked","duration":"4–6 s","notes":"one or two plain sentences: framing, light, what to watch","shotId":"rd-01"}]}',
      `- ${s.format === 'night' ? '5 to 7' : '6 to 12'} shots in shooting order (not cut order).`,
      '- Don’t invent facts about the venue, the cook or awards. Nobody in frame who has not said yes.',
    ].join('\n')
  }

  function renderPlanner(el) {
    const s = {
      format: 'review',
      dish: '',
      where: '',
      constraints: '',
      ...(saved.planner || {}),
    }
    if (!FMT[s.format]) s.format = 'review'
    let plan = { items: starterPlan(s.format), source: 'starter' }
    const persist = () => remember('planner', s)
    const box = promptBox(() => plannerPrompt(s))
    const set = k => v => {
      s[k] = v
      persist()
      box.refresh()
    }
    const formatSeg = ui.seg({
      label: 'Format',
      options: fmtOptions('label'),
      value: s.format,
      onChange: v => {
        set('format')(v)
        if (plan.source === 'starter') {
          plan = { items: starterPlan(v), source: 'starter' }
          paintPlan()
        }
      },
    })
    const dish = ui.field({
      label: 'Dish or venue',
      value: s.dish,
      placeholder: 'tamales from a Marketplace seller, Española',
      onInput: set('dish'),
    })
    const where = ui.field({
      label: 'Location and time',
      value: s.where,
      placeholder: 'their porch, Saturday 4 pm, low sun',
      onInput: set('where'),
    })
    const cons = ui.field({
      label: 'Constraints',
      multiline: true,
      value: s.constraints,
      placeholder: 'solo, 20 minutes, seller off camera',
      onInput: set('constraints'),
    })
    const planEl = h('div', { class: 'ln-stack' })
    const ids = () => new Set(SHOTS().map(x => x.id))

    function paintPlan() {
      const known = ids()
      const head = h(
        'div',
        { class: 'fs-plan-head' },
        h(
          'div',
          null,
          h(
            'b',
            null,
            plan.source === 'fable'
              ? `Fable’s plan · ${plan.items.length} shots`
              : `Starter plan · ${plan.items.length} shots`,
          ),
          sub(
            plan.source === 'fable'
              ? 'Tailored to the shoot above. Fire it, then reorder on the rail.'
              : s.format === 'night'
                ? 'From your LunarNight v2 runbook. Ask Fable to tailor it to tonight’s street.'
                : 'From the Shot Bible’s plan for this format. Ask Fable to tailor it to this dish.',
          ),
        ),
        ui.btn(
          'Fire to the rail',
          () => {
            const out = LN.shotlist.addMany(
              plan.items.map(x => ({
                ...(x.shotId && known.has(x.shotId)
                  ? { shotId: x.shotId }
                  : {}),
                name: x.name,
                lens: x.lens,
                fps: x.fps,
                ois: x.ois,
                duration: x.duration,
                notes: x.notes,
              })),
            )
            LN.toast(`${out.length} tickets on the rail. Heard.`)
          },
          { disabled: !plan.items.length },
        ),
      )
      planEl.replaceChildren(
        head,
        h(
          'ol',
          { class: 'fs-plan' },
          plan.items.map(x =>
            h(
              'li',
              null,
              h(
                'div',
                { class: 'fs-plan-name' },
                h('b', null, x.name),
                x.shotId && known.has(x.shotId)
                  ? ui.chip(x.shotId, 'amber')
                  : null,
              ),
              h(
                'div',
                { class: 'fs-plan-meta' },
                [x.lens, x.fps, x.ois, x.duration].filter(Boolean).join(' · '),
              ),
              x.notes ? h('p', null, x.notes) : null,
            ),
          ),
        ),
      )
    }

    const action = liveAction(
      'Plan it with Fable 5.1',
      async signal => {
        const res = await LN.ai.ask(plannerPrompt(s), { json: true, signal })
        const data = jsonFrom(res)
        const known = ids()
        const items = (Array.isArray(data.plan) ? data.plan : [])
          .slice(0, 16)
          .map(x => ({
            name: str(x && x.name, 120),
            lens: str(x && x.lens, 24),
            fps: str(x && x.fps, 24),
            ois: str(x && x.ois, 40),
            duration: str(x && x.duration, 24),
            notes: str(x && x.notes, 400),
            shotId:
              x && known.has(String(x.shotId)) ? String(x.shotId) : undefined,
          }))
          .filter(x => x.name)
        if (!items.length)
          throw new Error('The plan came back empty. Try again.')
        plan = { items, source: 'fable' }
        paintPlan()
      },
      { busy: 'Fable 5.1 is planning the shoot…' },
    )
    paintPlan()

    el.append(
      ui.section(
        {
          eyebrow: 'Before you leave the kitchen',
          title: 'Shoot planner',
          lede: 'Tell Fable the format, the dish and the place. It plans the shots on the Pixel only, reuses Shot Bible ids where they fit, and the plan fires straight to the ticket rail.',
        },
        h(
          'div',
          { class: 'ln-split' },
          card(
            'The shoot',
            formatSeg.el,
            dish.el,
            where.el,
            cons.el,
            action.el,
            offlineNote(),
          ),
          h('div', { class: 'ln-card fs-card' }, planEl),
        ),
        box.el,
      ),
    )
  }

  /* ============================================================ 4. Frame doctor */
  const LIN = new Float32Array(256)
  for (let i = 0; i < 256; i++) LIN[i] = LN.color.srgb2lin(i / 255)
  const labF = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  /** sRGB bytes → CIELAB (D65). */
  function lab(r8, g8, b8) {
    const r = LIN[r8]
    const g = LIN[g8]
    const b = LIN[b8]
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    const fx = labF(x)
    const fy = labF(y)
    const fz = labF(z)
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
  }
  /** The three numbers, measured on (downscaled) ImageData. */
  function measureFrame(img) {
    const d = img.data
    const BINS = 1024
    const hist = new Uint32Array(BINS)
    let n = 0
    let under = 0
    let sa = 0
    let sb = 0
    let sn = 0
    const rgb = [0, 0, 0]
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      hist[Math.min(BINS - 1, Math.floor(y * BINS))]++
      n++
      if (y < 0.03) under++
      if (y >= 0.02 && y <= 0.18) {
        const L = lab(r, g, b)
        sa += L[1]
        sb += L[2]
        sn++
        rgb[0] += r
        rgb[1] += g
        rgb[2] += b
      }
    }
    const pctl = q => {
      const target = q * n
      let c = 0
      for (let i = 0; i < BINS; i++) {
        c += hist[i]
        if (c >= target) return (i + 0.5) / BINS
      }
      return 1
    }
    const coarse = new Array(64).fill(0)
    for (let i = 0; i < BINS; i++) coarse[i >> 4] += hist[i]
    return {
      n,
      p1: n ? pctl(0.01) : 0,
      p99: n ? pctl(0.99) : 0,
      under3: n ? under / n : 0,
      a: sn ? sa / sn : 0,
      b: sn ? sb / sn : 0,
      shadowShare: n ? sn / n : 0,
      shadowRgb: sn ? rgb.map(v => v / sn) : [0, 0, 0],
      hist: coarse,
    }
  }
  function toneName(a, b) {
    if (Math.abs(a) < 4 && Math.abs(b) < 4) return 'neutral grey'
    if (b <= -8 && a >= 6) return 'violet'
    if (b <= -8 && a > -6) return 'blue'
    if (b <= -8) return 'teal-blue'
    if (a <= -6) return 'green-teal'
    if (b >= 8 && a >= 6) return 'warm orange-red'
    if (b >= 8) return 'warm yellow'
    if (a >= 6) return 'magenta'
    return 'near neutral'
  }
  const NIGHT = {
    black: 'p1 at 0 (≤ 0.01), with 30–80% of the frame under 3%',
    white: '0.30–0.44 (only light cores reach 0.94+)',
    tone: 'Lab a +12 to +18, b −17 to −28 (violet-blue darks)',
  }
  const DOCTOR_NOTES = {
    review:
      'Your notes set no measured numbers for Marketplace Review. Correct first: a white napkin reads white. Warm food sells and blue suppresses appetite, so keep reds and oranges honest. Happy plates bake Dreamcore (lifted, milky blacks, lavender shadows); dark plates bake LunarNight (crushed blacks). The Lunar Night numbers are shown for reference only.',
    night:
      'Targets from your LunarNight v2 runbook, measured from the two reference reels.',
    doc: 'Your notes set no measured numbers for the documentary. Night scenes take the Lunar Night numbers (shown); Dreamcore memory beats lift the black point on purpose; VHS confessions are their own world.',
    rd: 'Your notes set no measured numbers for R&D Lab. The shot bible grades the blacks to obsidian with one cold silver line, and warms the plate highlights. The Lunar Night numbers are shown for reference only.',
  }
  function judge(m) {
    const black = m.p1 <= 0.01 ? 'ok' : m.p1 <= 0.03 ? 'close' : 'off'
    const white =
      m.p99 >= 0.3 && m.p99 <= 0.44
        ? 'ok'
        : m.p99 >= 0.24 && m.p99 <= 0.52
          ? 'close'
          : 'off'
    let tone = 'off'
    if (m.shadowShare < 0.005) tone = 'none'
    else if (m.a >= 12 && m.a <= 18 && m.b >= -28 && m.b <= -17) tone = 'ok'
    else if (m.a >= 6 && m.a <= 24 && m.b >= -34 && m.b <= -10) tone = 'close'
    return { black, white, tone }
  }

  function histSvg(m, night) {
    const max = Math.max(1, ...m.hist.map(v => Math.sqrt(v)))
    const W = 320
    const H = 80
    const bw = W / m.hist.length
    return LN.s(
      'svg',
      {
        viewBox: `0 0 ${W} ${H + 14}`,
        class: 'fs-hist',
        role: 'img',
        'aria-label': `Luma histogram. Black floor ${m.p1.toFixed(3)}, paper white ${m.p99.toFixed(2)}.`,
      },
      night
        ? LN.s('rect', {
            x: 0.3 * W,
            y: 0,
            width: 0.14 * W,
            height: H,
            class: 'fs-hist-band',
          })
        : null,
      m.hist.map((v, i) => {
        const hh = (Math.sqrt(v) / max) * H
        return LN.s('rect', {
          x: i * bw + 0.5,
          y: H - hh,
          width: Math.max(1, bw - 1),
          height: hh,
          class: 'fs-hist-bar',
        })
      }),
      LN.s('line', {
        x1: m.p1 * W,
        x2: m.p1 * W,
        y1: 0,
        y2: H,
        class: 'fs-hist-mark',
      }),
      LN.s('line', {
        x1: m.p99 * W,
        x2: m.p99 * W,
        y1: 0,
        y2: H,
        class: 'fs-hist-mark',
      }),
      LN.s('text', { x: 0, y: H + 12, class: 'fs-hist-label' }, '0'),
      LN.s(
        'text',
        { x: W, y: H + 12, class: 'fs-hist-label', 'text-anchor': 'end' },
        '1.0',
      ),
      night
        ? LN.s(
            'text',
            {
              x: 0.37 * W,
              y: H + 12,
              class: 'fs-hist-label',
              'text-anchor': 'middle',
            },
            'paper white',
          )
        : null,
    )
  }

  /** A sample night frame, drawn here so the page has numbers at rest. */
  function drawSample(c) {
    c.width = 270
    c.height = 480
    const x = c.getContext('2d')
    const sky = x.createLinearGradient(0, 0, 0, 330)
    sky.addColorStop(0, '#05030a')
    sky.addColorStop(0.55, '#1f1236')
    sky.addColorStop(1, '#3a2466')
    x.fillStyle = sky
    x.fillRect(0, 0, 270, 480)
    x.fillStyle = '#000'
    x.fillRect(0, 330, 270, 150)
    x.fillStyle = '#120b1e'
    x.fillRect(60, 250, 150, 85)
    x.beginPath()
    x.moveTo(50, 252)
    x.lineTo(135, 205)
    x.lineTo(220, 252)
    x.fill()
    x.fillStyle = '#d9822b'
    x.fillRect(150, 280, 22, 20)
    const g = x.createRadialGradient(95, 290, 1, 95, 290, 40)
    g.addColorStop(0, '#d8ffd0')
    g.addColorStop(0.15, '#26e04a')
    g.addColorStop(1, 'rgba(0,80,20,0)')
    x.fillStyle = g
    x.fillRect(50, 245, 90, 90)
    x.fillStyle = '#e6e6f0'
    x.beginPath()
    x.arc(205, 70, 6, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = '#2a1648'
    x.fillRect(0, 335, 270, 4)
    return c
  }

  async function loadImage(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file)
      } catch (_e) {
        /* fall through to <img> */
      }
    }
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }
  }
  const dims = src => [
    src.naturalWidth || src.width,
    src.naturalHeight || src.height,
  ]

  function doctorPrompt(s, m, name, withImage) {
    const f = FMT[s.format]
    const j = judge(m)
    const tone = `${toneName(m.a, m.b)} (a ${LN.fmt.signed(m.a, 1)}, b ${LN.fmt.signed(m.b, 1)})`
    return [
      'TASK',
      `Read one frame from the chef’s ${f.label} footage and prescribe fixes he can make on his phone. ${withImage ? 'The frame is attached.' : 'Attach the frame to this message if you can; otherwise work from the numbers.'}`,
      '',
      'MEASURED ON THE PHONE (trust these over your eye; the display may be dim)',
      `- Frame: ${name}`,
      `- Black floor (p1 luma, 0–1): ${m.p1.toFixed(3)}`,
      `- Paper white (p99 luma): ${m.p99.toFixed(3)}`,
      `- Share of the frame under 3% luma: ${Math.round(m.under3 * 100)}%`,
      `- Shadow tone (mean CIELAB a/b over pixels with luma 0.02–0.18, ${Math.round(m.shadowShare * 100)}% of the frame): ${tone}`,
      '',
      'TARGETS',
      `- ${DOCTOR_NOTES[s.format]}`,
      `- Lunar Night numbers: black floor ${NIGHT.black}; paper white ${NIGHT.white}; shadow tone ${NIGHT.tone}.`,
      s.format === 'night'
        ? `- Verdict so far: black floor ${j.black}, paper white ${j.white}, shadow tone ${j.tone}.`
        : null,
      '- Lunar Night CapCut recipe for reference: Adjust Exposure −15, Contrast +25, Shadows −40, Highlights −10, Saturation +15, Temperature −30, Tint +15 (0 for the blue variant), Fade 0, Vignette +10; HSL Blue hue +15 sat +10, Green sat +10, Orange sat +10, Yellow sat −10; Glow 25, Grain 20. If it looks grey: Shadows −50 and Exposure −20.',
      '',
      'TOOLS YOU MAY PRESCRIBE (use these exact names in "tool")',
      '- "CapCut Adjust": Brightness, Contrast, Saturation, Exposure, Sharpen, Highlights, Shadows, Temperature, Tint, Fade, Vignette, Grain (values as CapCut shows them, about −50 to +50).',
      '- "HSL": per colour, hue / saturation / luminance.',
      '- "Curves": RGB or one channel, as points like "input 0.10 → 0.00".',
      '- "Pixel": the stock Pixel Camera Pro controls, for the next shoot.',
      '- "Blackmagic": the Blackmagic Camera app on the Pixel, for the next shoot.',
      '',
      'RULES',
      '- Order: correct, match, grade on one adjustment layer, look, finish. Fix capture problems at capture.',
      '- CapCut Mobile cannot import .cube LUTs; do not prescribe a LUT import. Free tools only, nothing with a Pro badge.',
      '- The dark look never lifts blacks and never uses Fade. Never touch the Orange hue; keep reds and oranges honest on food.',
      '',
      'OUTPUT',
      'Return JSON only, exactly this shape:',
      '{"read":"two or three plain sentences on what the numbers and the picture say","fixes":[{"tool":"CapCut Adjust","setting":"Shadows","value":"−40","why":"one short sentence"}]}',
      '- 3 to 7 fixes, the most important first.',
    ]
      .filter(x => x !== null)
      .join('\n')
  }

  function renderDoctor(el) {
    const s = { format: 'night', send: true, ...(saved.doctor || {}) }
    if (!FMT[s.format]) s.format = 'night'
    let m = null
    let src = null
    let name = 'sample frame drawn by the OS'
    let isSample = true
    const preview = h('canvas', {
      class: 'fs-frame',
      'aria-label': 'The frame being measured',
    })
    const numbers = h('div', { class: 'ln-stack' })
    const fixesEl = h('div', { class: 'ln-stack' })
    let imagesOk = false
    const persist = () => remember('doctor', s)

    function analyse(source) {
      const [w, hh] = dims(source)
      const k = Math.min(1, 360 / Math.max(w, hh))
      preview.width = Math.max(1, Math.round(w * k))
      preview.height = Math.max(1, Math.round(hh * k))
      const ctx = preview.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(source, 0, 0, preview.width, preview.height)
      m = measureFrame(ctx.getImageData(0, 0, preview.width, preview.height))
      paintNumbers()
      box.refresh()
    }

    const VERDICT = {
      ok: ['On target', 'sage'],
      close: ['Close', 'amber'],
      off: ['Off target', 'crimson'],
      none: ['Too few darks to read', ''],
    }
    function paintNumbers() {
      if (!m) return
      const night = s.format === 'night'
      const j = judge(m)
      const row = (label, value, target, v, extra) =>
        h(
          'div',
          { class: 'fs-num' },
          h('span', { class: 'fs-num-label' }, label),
          h('b', { class: 'ln-num' }, value),
          h(
            'span',
            { class: 'fs-num-target' },
            `${night ? 'Target' : 'Lunar Night ref.'}: ${target}`,
          ),
          night ? ui.chip(VERDICT[v][0], VERDICT[v][1]) : null,
          extra || null,
        )
      const sw = m.shadowRgb
      const boost = Math.max(1, 150 / Math.max(1, ...sw))
      numbers.replaceChildren(
        h(
          'p',
          { class: 'ln-small ln-muted' },
          isSample ? 'Sample frame drawn by the OS, not a photo. ' : '',
          DOCTOR_NOTES[s.format],
        ),
        row(
          'Black floor · p1 luma',
          m.p1.toFixed(3),
          NIGHT.black,
          j.black,
          h(
            'span',
            { class: 'fs-num-extra' },
            `${Math.round(m.under3 * 100)}% of the frame under 3%`,
          ),
        ),
        row('Paper white · p99 luma', m.p99.toFixed(2), NIGHT.white, j.white),
        row(
          'Shadow tone · Lab a / b',
          `${LN.fmt.signed(m.a, 1)} / ${LN.fmt.signed(m.b, 1)}`,
          NIGHT.tone,
          j.tone,
          h(
            'span',
            { class: 'fs-num-extra' },
            h('i', {
              class: 'fs-swatch',
              style: {
                background: `rgb(${sw.map(v => Math.round(clamp(v * boost, 0, 255))).join(',')})`,
              },
              'aria-hidden': 'true',
            }),
            `${toneName(m.a, m.b)} · ${Math.round(m.shadowShare * 100)}% of the frame is shadow`,
          ),
        ),
        histSvg(m, night),
      )
    }

    const box = promptBox(() =>
      m ? doctorPrompt(s, m, name, false) : 'Load a frame first.',
    )
    const formatSeg = ui.seg({
      label: 'Format',
      options: fmtOptions('label'),
      value: s.format,
      onChange: v => {
        s.format = v
        persist()
        paintNumbers()
        box.refresh()
      },
    })
    const pick = ui.filePick({
      accept: 'image/*',
      label: 'Choose a frame',
      kind: 'ghost',
      onFile: async file => {
        try {
          src = await loadImage(file)
          name = file.name || 'frame'
          isSample = false
          fixesEl.replaceChildren()
          analyse(src)
          LN.toast('Measured on this phone. Nothing was sent.')
        } catch (_e) {
          LN.toast('That image could not be opened. Try a JPEG or PNG.', {
            kind: 'err',
          })
        }
      },
    })
    const sendToggle = ui.toggle({
      label: 'Send the frame image too',
      checked: s.send,
      onChange: v => {
        s.send = v
        persist()
      },
    })
    sendToggle.el.hidden = true
    LN.ai.limits().then(l => {
      imagesOk = !!(l && l.images)
      sendToggle.el.hidden = !imagesOk
    })

    async function frameBlob() {
      const [w, hh] = dims(src)
      const k = Math.min(1, 1024 / Math.max(w, hh))
      const c = document.createElement('canvas')
      c.width = Math.round(w * k)
      c.height = Math.round(hh * k)
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height)
      return new Promise(res => c.toBlob(res, 'image/jpeg', 0.88))
    }

    const action = liveAction(
      'Ask Fable 5.1 for fixes',
      async signal => {
        const withImage = imagesOk && s.send && src
        const opts = { json: true, signal }
        if (withImage) {
          const blob = await frameBlob()
          if (blob) opts.images = [blob]
        }
        const res = await LN.ai.ask(
          doctorPrompt(s, m, name, !!opts.images),
          opts,
        )
        paintFixes(jsonFrom(res))
      },
      {
        busy: 'Fable 5.1 is reading the frame…',
        before: () => {
          if (!m) {
            LN.toast('Load a frame first.', { kind: 'warn' })
            return false
          }
          if (isSample) {
            LN.toast(
              'Choose one of your own frames first; the sample is a drawing.',
              {
                kind: 'warn',
              },
            )
            return false
          }
          return true
        },
      },
    )

    function paintFixes(data) {
      const fixes = Array.isArray(data && data.fixes) ? data.fixes : []
      fixesEl.replaceChildren(
        card(
          'Fable’s read',
          h('p', { class: 'fs-read' }, str(data && data.read, 900) || '—'),
          h(
            'ol',
            { class: 'fs-fixes' },
            fixes
              .slice(0, 10)
              .map(f =>
                h(
                  'li',
                  null,
                  h(
                    'div',
                    { class: 'fs-fix-head' },
                    ui.chip(str(f.tool, 30) || 'Fix', 'amber'),
                    h('b', null, str(f.setting, 80)),
                    h('span', { class: 'ln-num fs-fix-val' }, str(f.value, 40)),
                  ),
                  f.why ? h('p', null, str(f.why, 300)) : null,
                ),
              ),
          ),
          ui.callout(
            'tip',
            'Apply the fixes, export one frame, and measure it again here. Check on a second screen at 50% brightness.',
          ),
        ),
      )
    }

    el.append(
      ui.section(
        {
          eyebrow: 'Read a grade in 30 seconds',
          title: 'Frame doctor',
          lede: 'Load a frame from the camera roll. The phone measures the three numbers that make the look: black floor, paper white and shadow tone. Nothing leaves the phone until you tap Ask.',
        },
        h(
          'div',
          { class: 'ln-split' },
          h(
            'div',
            { class: 'ln-stack' },
            formatSeg.el,
            h('div', { class: 'fs-frame-wrap' }, preview),
            h('div', { class: 'ln-row' }, pick),
          ),
          h(
            'div',
            { class: 'ln-stack' },
            card('The three numbers', numbers),
            sendToggle.el,
            action.el,
            offlineNote(
              'Live Fable 5.1 runs when this page is open in claude.ai. Copy the prompt below into a Fable 5.1 chat and attach the same frame.',
            ),
            fixesEl,
          ),
        ),
        box.el,
      ),
    )
    analyse(drawSample(document.createElement('canvas')))
  }

  /* ============================================================ 5. Higgsfield */
  function renderHiggs(el) {
    const s = {
      format: 'doc',
      script:
        'Before the stars, there was a kitchen at the end of a dirt road. My grandmother cooked by feel. I am still learning to.',
      voice: 'low, warm, unhurried narrator',
      len: 20,
      size: '1080x1920',
      cover: 'a single plate under one tungsten pass lamp, black all around',
      broll:
        'steam rising off a cast-iron pan in a dark kitchen, one warm light',
      blen: 5,
      bfps: 24,
      brain: true,
      ...(saved.higgs || {}),
    }
    const persist = () => remember('higgs', s)
    const boxes = []
    const set = k => v => {
      s[k] = v
      persist()
      for (const b of boxes) b.refresh()
    }
    const words = () => s.script.trim().split(/\s+/).filter(Boolean).length
    const lookFor = fid =>
      ({
        review:
          'Warm, honest food colour: warm plate highlights, cooler background, reds and oranges true, never neon. Clean and bright enough to read on a phone.',
        night:
          'LunarNight: a true black floor, low paper white, violet-blue darks, one pure coloured practical light (green, orange, neon blue or red), lots of dark sky.',
        doc: 'Obsidian #08080A world, tungsten amber #E5A93C and sear crimson #9E2A2B warmth, cold lunar silver #C8D0DC on steel and glass. Dreamcore (lifted, peach to lavender) only for memory and heritage.',
        rd: 'Obsidian background, macro razor-sharp, one raking light, warm plate highlights, one cold silver line on the rim.',
      })[fid]
    const guard = [
      'Before you generate anything: tell me which Higgsfield model you will use and what it will cost in credits, then wait for my yes.',
      'Ground rules: no Native or Pueblo symbols, regalia, patterns or people; no faces or hands unless I say so; no stars, Michelin marks or awards; no fake-shock expressions; nothing presented as a real dish of mine.',
    ]
    const wrap = text =>
      s.brain ? `${LN.brain.context()}\n\n---\n\n${text}` : text

    const voBrief = () =>
      [
        'Use the Higgsfield connector to make a voiceover for my video.',
        guard[0],
        '',
        `FORMAT: ${FMT[s.format].label}. ${s.format === 'night' ? 'Note: Lunar Night reels carry no voice; this is for another cut.' : ''}`.trim(),
        'SCRIPT (read it word for word, do not rewrite it)',
        s.script.trim(),
        '',
        `VOICE: ${s.voice}. Plain, specific, no hype; about 150 words a minute.`,
        `LENGTH: about ${s.len} s. The script is ${words()} words, about ${Math.round((words() / 150) * 60)} s at that pace; if it will not fit, tell me before you generate. Don’t cut words yourself.`,
        'DELIVERY: one clean take, no music or SFX under it, 48 kHz WAV if offered (MP3 otherwise). It sits under footage in CapCut Mobile at voice 100 with music ducked to 10–20.',
      ].join('\n')
    const coverBrief = () => {
      const [w, hh] = s.size.split('x')
      return [
        'Use the Higgsfield connector to make one cover/thumbnail image.',
        guard[0],
        guard[1],
        '',
        `SIZE: exactly ${w} × ${hh} px${s.size === '1080x1920' ? ' (9:16)' : ' (16:9)'}.`,
        `SUBJECT: ${s.cover.trim()}.`,
        `LOOK: ${lookFor(s.format)}`,
        'COMPOSITION: the most colourful element is the hero; strong single subject readable at thumbnail size.',
        s.size === '1080x1920'
          ? 'SAFE ZONE: keep the top 130 px, the right 140 px and the bottom 484 px free of anything important (app buttons cover them).'
          : 'SAFE ZONE: keep the subject inside the centre 80% of the frame.',
        'TEXT: none in the image. I add the title (4 words max, Estrella Early) in CapCut.',
        'Give me two variations if the cost is the same.',
      ].join('\n')
    }
    const brollBrief = () =>
      [
        'Use the Higgsfield connector to make one short b-roll clip.',
        guard[0],
        guard[1],
        '',
        `CLIP: ${s.broll.trim()}.`,
        `LENGTH: ${s.blen} s. FRAME: 1080 × 1920 (9:16), ${s.bfps} fps.`,
        `LOOK: ${lookFor(s.format)}`,
        'CAMERA: a dead-still frame or one slow push-in (100% to 108%); no whip pans, no drone moves, no morphing.',
        'NO TEXT, logos or watermarks in the frame.',
        'I will label it as AI-made where I use it and cut it in as texture, never as my food.',
      ].join('\n')

    const block = (title, getText, controls) => {
      const box = promptBox(() => wrap(getText()), {
        title: `${title} brief`,
        button: 'Copy brief',
        brain: false,
      })
      boxes.push(box)
      return card(title, h('div', { class: 'fs-form' }, controls), box.el)
    }
    const wordsEl = h('p', { class: 'ln-small ln-faint ln-num' })
    const paintWords = () => {
      wordsEl.textContent = `${words()} words · about ${Math.round((words() / 150) * 60)} s at 150 words a minute`
    }
    paintWords()

    el.append(
      ui.section(
        {
          eyebrow: 'Optional · through your own Claude chat',
          title: 'Higgsfield briefs',
          lede: 'Copy-ready briefs for a voiceover, a cover and a short b-roll clip. Paste one into a Claude chat that has the Higgsfield connector switched on; Claude runs it there. This OS never calls Higgsfield and never spends your credits.',
        },
        h(
          'div',
          { class: 'ln-grid wide' },
          ui.callout(
            'verify',
            h(
              'div',
              null,
              h(
                'p',
                null,
                '$39 a month = 1,000 credits (about 3.9 cents each). A 3-minute video ran 241 credits (about $9.50).',
              ),
              h(
                'p',
                { class: 'ln-small' },
                'From your notes (CapCut skill, video 1); check current pricing. Every brief asks Claude to quote the credit cost and wait for your yes.',
              ),
            ),
            'Cost, from your notes',
          ),
          h(
            'div',
            { class: 'ln-stack' },
            ui.seg({
              label: 'Format',
              options: fmtOptions('label'),
              value: s.format,
              onChange: set('format'),
            }).el,
            ui.toggle({
              label: 'Put my Brand Brain on top of each brief',
              checked: s.brain,
              onChange: set('brain'),
            }).el,
          ),
        ),
        h(
          'div',
          { class: 'ln-grid wide fs-higgs' },
          block('Voiceover', voBrief, [
            ui.field({
              label: 'Script',
              multiline: true,
              rows: 4,
              value: s.script,
              onInput: v => {
                set('script')(v)
                paintWords()
              },
            }).el,
            wordsEl,
            ui.field({
              label: 'Voice style',
              value: s.voice,
              onInput: set('voice'),
            }).el,
            ui.slider({
              label: 'Length',
              min: 5,
              max: 90,
              step: 5,
              value: s.len,
              unit: ' s',
              onInput: set('len'),
            }).el,
          ]),
          block('Cover image', coverBrief, [
            ui.seg({
              label: 'Size',
              options: [
                { value: '1080x1920', label: '1080 × 1920' },
                { value: '1280x720', label: '1280 × 720' },
              ],
              value: s.size,
              onChange: set('size'),
            }).el,
            ui.field({
              label: 'Subject',
              multiline: true,
              rows: 2,
              value: s.cover,
              onInput: set('cover'),
            }).el,
          ]),
          block('B-roll clip', brollBrief, [
            ui.field({
              label: 'Clip',
              multiline: true,
              rows: 2,
              value: s.broll,
              onInput: set('broll'),
            }).el,
            ui.slider({
              label: 'Length',
              min: 3,
              max: 10,
              step: 1,
              value: s.blen,
              unit: ' s',
              onInput: set('blen'),
            }).el,
            ui.seg({
              label: 'Frame rate',
              options: [
                { value: 24, label: '24 fps' },
                { value: 30, label: '30 fps' },
              ],
              value: s.bfps,
              onChange: set('bfps'),
            }).el,
          ]),
        ),
      ),
    )
  }

  /* ============================================================ mount */
  function mount(el) {
    const root = h('div', { class: 'fs' })
    const badge = h('span', { class: 'fs-badge' }, 'Checking for Fable 5.1…')
    liveP.then(v => {
      badge.textContent = v ? 'Fable 5.1 live' : 'Copy-prompt mode'
      badge.classList.add(v ? 'live' : 'copy')
    })
    root.append(
      h(
        'header',
        { class: 'fs-head' },
        h(
          'div',
          { class: 'fs-head-row' },
          h('div', { class: 'ln-eyebrow' }, 'Fable 5.1 Studio'),
          badge,
        ),
        h(
          'p',
          null,
          'Fable 5.1 reads text and images and answers in text. Here it writes settings, scenes and small generator pages; your phone and the other Forge tabs turn them into files. Every call carries your Brand Brain.',
        ),
      ),
      ui.tabs(
        [
          { id: 'brain', label: 'Brand Brain', render: renderBrain },
          { id: 'recipes', label: 'Asset recipes', render: renderRecipes },
          { id: 'plan', label: 'Shoot planner', render: renderPlanner },
          { id: 'doctor', label: 'Frame doctor', render: renderDoctor },
          { id: 'higgs', label: 'Higgsfield', render: renderHiggs },
        ],
        { key: 'fable' },
      ).el,
    )
    el.append(root)
  }

  LN.fableStudio = { mount, measureFrame, FORMATS }
})()
