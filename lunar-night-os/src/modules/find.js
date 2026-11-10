/* Kubrick: modules/find.js, Find it (00).
   "Where is…" across the chef's four apps: CapCut Mobile, CapCut Desktop,
   Blackmagic Camera and Pixel Camera. Search first, then tappable replicas
   drawn from LN.data.appMaps, each item carrying the house value and the
   Kubrick module that does the job. "Match my app" edits persist in
   LN.store('appmaps.v1') and merge over the built-in data.
   Exposes LN.finder = { search(query), open(appId, screenId, itemId) }. */
;(() => {
  const LN = window.LN
  const { h, s, ui } = LN
  const ST = LN.store
  const OV_KEY = 'appmaps.v1'
  const APP_KEY = 'find.app'

  /* ------------------------------------------------------------ icons */
  const ICONS = {
    dot: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
    x: 'M6 6l12 12M18 6L6 18',
    back: 'M15 5l-7 7 7 7',
    forward: 'M9 5l7 7-7 7',
    badge: 'M4 7h16v10H4zM8 10h3M13 10h3',
    upload: 'M12 16V5M7 10l5-5 5 5M5 19h14',
    frame: 'M4 5h16v14H4zM4 15l5-4 4 3 3-2 4 3',
    clock: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 8v4l3 2',
    play: 'M8 5l11 7-11 7z',
    diamond: 'M12 4l8 8-8 8-8-8z',
    undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
    redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
    expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    mute: 'M4 10v4h4l5 4V6L8 10zM16 9l4 6M20 9l-4 6',
    image:
      'M4 5h16v14H4zM8 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0M4 17l6-5 4 3 6-5',
    transition: 'M4 12h6M14 12h6M12 6v12',
    plus: 'M12 5v14M5 12h14',
    music:
      'M9 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 18V5l8-2v12M20 15m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    scissors:
      'M7 7m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M7 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M9 9l11 11M9 15L20 4',
    text: 'M5 6h14M12 6v13M9 19h6',
    sparkle:
      'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z',
    layers: 'M12 4l9 5-9 5-9-5zM3 14l9 5 9-5',
    captions: 'M3 6h18v12H3zM6 13h6M14 13h4M6 16h3M11 16h7',
    ratio: 'M5 4h14v16H5zM5 10h14',
    filter: 'M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M12 5v14M5 12h14',
    sliders: 'M4 7h16M4 12h16M4 17h16M9 5v4M15 10v4M7 15v4',
    sticker: 'M5 5h14v9l-5 5H5zM14 19v-5h5',
    canvas: 'M4 4h16v16H4zM8 8h8v8H8z',
    gear: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
    camera: 'M4 8h4l2-3h4l2 3h4v11H4zM12 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    list: 'M5 7h14M5 12h14M5 17h14',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    user: 'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0',
    speed:
      'M4 16a8 8 0 0 1 16 0M12 16l4-6M12 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
    volume: 'M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12',
    motion: 'M4 18l5-8 4 5 3-3 4 6',
    trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
    cutout: 'M4 4h16v16H4zM12 8a4 4 0 0 1 0 8M8 20l4-4 4 4',
    crop: 'M7 3v14h14M3 7h14v14',
    mask: 'M4 4h16v16H4zM12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
    opacity:
      'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 4v16M12 8l6 2M12 12l7 0M12 16l6-2',
    blend:
      'M9 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0M15 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0',
    swap: 'M4 8h13l-3-3M20 16H7l3 3',
    mic: 'M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
    copy: 'M8 8h12v12H8zM4 16V4h12',
    reverse: 'M20 12H6M10 8l-4 4 4 4',
    freeze: 'M12 3v18M5 7l14 10M19 7L5 17',
    blur: 'M12 4c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z',
    stabilize:
      'M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M12 2v4M12 18v4M2 12h4M18 12h4',
    wave: 'M3 12h2l2-6 3 12 3-12 3 12 2-6h3',
    target:
      'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 2v4M12 18v4M2 12h4M18 12h4',
    mirror: 'M12 3v18M4 8l5 4-5 4zM20 8l-5 4 5 4z',
    rotate: 'M20 12a8 8 0 1 1-3-6M20 4v5h-5',
    curve: 'M4 19C8 19 9 5 13 5s5 14 7 14',
    check: 'M5 12l5 5L20 7',
    sun: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
    moon: 'M19 14A8 8 0 0 1 10 5a8 8 0 1 0 9 9z',
    contrast: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 4a8 8 0 0 1 0 16z',
    drop: 'M12 3c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z',
    sharp: 'M4 20L12 4l8 16zM8 20l4-8 4 8',
    hsl: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 4v8l6 4M12 12l-7 4',
    temp: 'M10 4a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 9v8',
    fade: 'M4 20h16M4 16h12M4 12h8M4 8h4',
    vignette: 'M4 4h16v16H4zM12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
    grain:
      'M6 6h.5M12 5h.5M18 7h.5M8 11h.5M15 12h.5M5 16h.5M11 17h.5M18 16h.5M14 19h.5M9 20h.5',
    keyboard: 'M3 7h18v10H3zM6 10h1M9 10h1M12 10h1M15 10h1M18 10h1M7 14h10',
    font: 'M4 19L10 5h4l6 14M7 14h10',
    style: 'M4 5h16v4H4zM4 11h10v3H4zM4 16h16v3H4z',
    bubble: 'M4 5h16v10h-9l-4 4v-4H4z',
    pen: 'M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3',
    beat: 'M3 12h3l2-7 3 14 3-10 2 6 2-3h3',
    cursor: 'M6 4l12 8-6 1-3 6z',
    flag: 'M6 21V4h11l-2 4 2 4H6',
    magnet: 'M6 4v8a6 6 0 0 0 12 0V4M6 4h4v8M14 4h4v8',
    snap: 'M4 6v12M20 6v12M8 12h8M12 8v8',
    link: 'M10 14l4-4M8 16l-2 2a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0M16 8l2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0',
    lut: 'M4 4h16v16H4zM4 12h16M12 4v16M8 8h.5M16 16h.5',
    wheel:
      'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 4v6M12 14v6',
    lens: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
    shutter:
      'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 3l5 9M7 6l10 0M4 15l5-9M7 18l5-9M17 18L7 18M20 9l-5 9',
    iris: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    iso: 'M4 6h16v12H4zM8 10v4M12 10v4M16 10v4',
    record:
      'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
    zebra: 'M4 4h16v16H4zM4 12l8-8M4 20L20 4M12 20l8-8',
    search: 'M10 10m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0M15 15l5 5',
    flower:
      'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3',
    lock: 'M6 11h12v9H6zM9 11V7a3 3 0 0 1 6 0v4',
  }
  const icon = name =>
    s(
      'svg',
      {
        class: 'fd-ico',
        viewBox: '0 0 24 24',
        width: 20,
        height: 20,
        'aria-hidden': 'true',
      },
      s('path', {
        d: ICONS[name] || ICONS.dot,
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 1.6,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    )

  /* ------------------------------------------------------------ data + overrides */
  const DATA = (LN.data.appMaps && LN.data.appMaps.apps) || []
  const apps = () => DATA
  const appById = id => DATA.find(a => a.id === id) || DATA[0]

  const loadOv = () => {
    const o = ST.get(OV_KEY, {})
    return o && typeof o === 'object' ? o : {}
  }
  const saveOv = o => ST.set(OV_KEY, o)
  const screenOv = (appId, screenId, create) => {
    const o = loadOv()
    if (!o[appId]) {
      if (!create) return null
      o[appId] = {}
    }
    if (!o[appId][screenId]) {
      if (!create) return null
      o[appId][screenId] = { items: {}, order: {}, added: [] }
    }
    return { all: o, sc: o[appId][screenId] }
  }
  const patchItem = (appId, screenId, itemId, patch) => {
    const { all, sc } = screenOv(appId, screenId, true)
    sc.items[itemId] = { ...(sc.items[itemId] || {}), ...patch }
    saveOv(all)
  }
  const setOrder = (appId, screenId, regionId, ids) => {
    const { all, sc } = screenOv(appId, screenId, true)
    sc.order[regionId] = ids
    saveOv(all)
  }
  const addItem = (appId, screenId, regionId, label, pro) => {
    const { all, sc } = screenOv(appId, screenId, true)
    const id = `u-${LN.fmt.slug(label)}`
    if (!sc.added.some(a => a.id === id))
      sc.added.push({ id, regionId, label, pro: pro ? 'pro' : 'free' })
    saveOv(all)
    return id
  }
  const resetScreen = (appId, screenId) => {
    const o = loadOv()
    if (o[appId]) delete o[appId][screenId]
    saveOv(o)
  }

  /** The built-in screen merged with the chef's overrides. */
  const getScreen = (appId, screenId) => {
    const app = appById(appId)
    const base = app.screens.find(x => x.id === screenId)
    if (!base) return null
    const ov = screenOv(appId, screenId, false)
    const sc = ov ? ov.sc : null
    const regions = base.regions.map(r => {
      let items = r.items.map(x => ({ ...x, appId, screenId, regionId: r.id }))
      if (sc) {
        for (const a of sc.added || [])
          if (a.regionId === r.id)
            items.push({
              id: a.id,
              label: a.label,
              does: 'Added from your screenshot.',
              altLabels: [],
              icon: 'dot',
              opens: null,
              pro: a.pro || 'free',
              confidence: 'confirmed',
              house: null,
              added: true,
              appId,
              screenId,
              regionId: r.id,
            })
        items = items.map(x => {
          const p = (sc.items && sc.items[x.id]) || {}
          return {
            ...x,
            label: p.label || x.label,
            builtLabel: x.label,
            hidden: !!p.hidden,
            pro: p.pro === undefined ? x.pro : p.pro ? 'pro' : 'free',
            confidence: p.confirmed ? 'confirmed' : x.confidence,
            edited: !!(
              p.label ||
              p.hidden ||
              p.pro !== undefined ||
              p.confirmed
            ),
          }
        })
        const order = sc.order && sc.order[r.id]
        if (order && order.length) {
          const pos = new Map(order.map((id, i) => [id, i]))
          items.sort(
            (a, b) =>
              (pos.has(a.id) ? pos.get(a.id) : 999) -
              (pos.has(b.id) ? pos.get(b.id) : 999),
          )
        }
      } else
        items = items.map(x => ({ ...x, hidden: false, builtLabel: x.label }))
      return { ...r, items }
    })
    return { ...base, regions }
  }
  const allItems = appId => {
    const app = appById(appId)
    const out = []
    for (const sc of app.screens)
      for (const r of getScreen(appId, sc.id).regions)
        for (const x of r.items) if (!x.hidden) out.push(x)
    return out
  }

  /* parents: screenId → {screenId, itemId} that opens it (BFS from root) */
  const parentMap = appId => {
    const app = appById(appId)
    const par = new Map()
    par.set(app.root, null)
    const q = [app.root]
    while (q.length) {
      const sid = q.shift()
      const sc = getScreen(appId, sid)
      if (!sc) continue
      for (const r of sc.regions)
        for (const x of r.items)
          if (
            x.opens &&
            !par.has(x.opens) &&
            app.screens.some(z => z.id === x.opens)
          ) {
            par.set(x.opens, { screenId: sid, itemId: x.id, label: x.label })
            q.push(x.opens)
          }
    }
    return par
  }
  /** Tap path to an item, as labels. */
  const pathTo = item => {
    const app = appById(item.appId)
    const par = parentMap(item.appId)
    const parts = []
    let sid = item.screenId
    const seen = new Set()
    while (sid && !seen.has(sid)) {
      seen.add(sid)
      const sc = app.screens.find(z => z.id === sid)
      const p = par.get(sid)
      if (p) {
        parts.unshift(p.label)
        sid = p.screenId
      } else {
        if (sc && sc.entry) parts.unshift(...sc.entry)
        else if (sid !== app.root && sc) parts.unshift(sc.name)
        break
      }
    }
    parts.push(item.label)
    return parts
  }

  /* ------------------------------------------------------------ search */
  const SYN = [
    ['colour', 'color'],
    ['wb', 'white balance', 'kelvin', 'temperature', 'temp'],
    ['subtitles', 'captions', 'caption', 'subtitle'],
    ['lut', 'cube', 'look'],
    ['speed curve', 'curve', 'ramp', 'speed ramp'],
    ['export', 'render', 'save video', 'bitrate', 'bit rate', 'code rate'],
    ['zebra', 'zebras', 'clipping'],
    ['fps', 'frame rate', 'framerate'],
    ['shutter', 'shutter angle', '360'],
    ['stabilisation', 'stabilization', 'stabilize', 'stabilise', 'eis'],
    ['pip', 'overlay', 'picture in picture'],
    ['sfx', 'sound effects', 'sound fx'],
    ['font', 'fonts', 'typeface'],
    ['ratio', 'aspect', '9:16', 'vertical'],
    ['grain', 'particles', 'noise'],
    ['hdr', '10-bit', '10 bit'],
    ['brightness', 'exposure'],
    ['tint', 'hue'],
    ['adjust', 'adjustment', 'grade', 'sliders'],
    ['volume', 'levels', 'loudness', 'db'],
    ['blend', 'blend mode', 'screen', 'multiply'],
    ['focus', 'peaking', 'focus assist'],
    ['iso', 'gain'],
    ['record', 'rec', 'shoot'],
    ['keyframe', 'diamond', 'zoom in', 'push in'],
    ['remove background', 'remove bg', 'cutout', 'chroma', 'green screen'],
    ['default ending', 'ending', 'outro'],
    ['text', 'title', 'hook card'],
  ]
  const norm = q =>
    String(q || '')
      .toLowerCase()
      .replace(/[^a-z0-9:.+\-\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const singular = w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)
  const expand = q => {
    const terms = new Set([q])
    for (const group of SYN)
      if (group.some(g => q.includes(g))) for (const g of group) terms.add(g)
    return Array.from(terms)
  }
  const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const hasWord = (text, w) =>
    !!w && new RegExp(`(^|[^a-z0-9])${esc(w)}(s|es)?([^a-z0-9]|$)`).test(text)
  const score = (item, q, terms) => {
    const lab = norm(item.label)
    const alts = (item.altLabels || []).map(norm)
    const does = norm(item.does)
    const house = item.house
      ? norm(`${item.house.value} ${item.house.why || ''}`)
      : ''
    let sc = 0
    for (const t of terms) {
      if (!t) continue
      /* the typed word outranks its synonyms */
      const k = t === q || singular(t) === singular(q) ? 1 : 0.6
      const w = singular(t)
      if (lab === t || lab === w) sc += 100 * k
      else if (lab.startsWith(t)) sc += 60 * k
      else if (hasWord(lab, w)) sc += 40 * k
      if (alts.some(a => a === t || a === w)) sc += 70 * k
      else if (alts.some(a => hasWord(a, w))) sc += 30 * k
      if (hasWord(does, w)) sc += 12 * k
      if (hasWord(house, w)) sc += 8 * k
    }
    const words = q.split(' ').filter(Boolean)
    if (words.length > 1)
      for (const wd of words) {
        const w = singular(wd)
        if (hasWord(lab, w)) sc += 15
        else if (hasWord(does, w)) sc += 4
      }
    return sc
  }
  const search = query => {
    const q = norm(query)
    if (!q) return []
    const terms = expand(q)
    const out = []
    for (const app of apps())
      for (const item of allItems(app.id)) {
        const sc = score(item, q, terms)
        if (sc > 0)
          out.push({
            score: sc,
            app: app.name,
            appId: app.id,
            screenId: item.screenId,
            itemId: item.id,
            label: item.label,
            path: pathTo(item),
            does: item.does,
            house: item.house,
            pro: item.pro,
            confidence: item.confidence,
          })
      }
    out.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    return out.slice(0, 24)
  }

  /* ------------------------------------------------------------ status */
  const status = appId => {
    const c = { confirmed: 0, likely: 0, unverified: 0 }
    for (const x of allItems(appId))
      c[x.confidence] = (c[x.confidence] || 0) + 1
    return c
  }
  const CONF_LABEL = {
    confirmed: 'confirmed',
    likely: 'likely',
    unverified: 'check on your phone',
  }
  const CONF_NOTE = {
    confirmed:
      'Confirmed: the label was quoted by the app maker or by two independent guides. The position in the row is still only likely.',
    likely:
      'Likely: one guide, or your own notes plus memory. The label is probably right; the position is not checked.',
  }
  const PRO_LABEL = { free: 'free', pro: 'Pro', unknown: 'Pro: unknown' }
  const moduleTitle = hash => {
    const id = String(hash || '').replace('#', '')
    const m = (LN.modules || []).find(x => x.id === id)
    return m ? m.title : id
  }

  /* ------------------------------------------------------------ module */
  let mountEl = null
  const EDIT_KEY = 'find.edit'
  let state = {
    app: ST.get(APP_KEY, 'capcut-mobile'),
    stack: [],
    screen: null,
    selected: null,
    edit: !!ST.get(EDIT_KEY, false),
    landscape: true,
    hi: null,
  }
  const refs = {}
  /* an item is identified by screen + id: the same id can sit on the
     dimmed base screen behind a sheet (Export, Templates, Canvas…) */
  const sameItem = (a, b) =>
    !!a &&
    !!b &&
    a.id === b.id &&
    a.screenId === b.screenId &&
    a.regionId === b.regionId
  const isSel = item => sameItem(state.selected, item)

  const goScreen = (screenId, push = true) => {
    const app = appById(state.app)
    if (!app.screens.some(z => z.id === screenId)) return
    if (push && state.screen && state.screen !== screenId)
      state.stack.push(state.screen)
    state.screen = screenId
    renderReplica()
  }
  const goBack = () => {
    const prev = state.stack.pop()
    state.screen = prev || appById(state.app).root
    state.selected = null
    renderReplica()
    renderDetail()
  }
  const setApp = id => {
    state.app = id
    ST.set(APP_KEY, id)
    state.stack = []
    state.screen = appById(id).root
    state.selected = null
    state.hi = null
    if (refs.appSeg) refs.appSeg.set(id)
    renderAll()
  }
  const open = (appId, screenId, itemId) => {
    const app = appById(appId)
    if (!app) return
    state.app = app.id
    ST.set(APP_KEY, app.id)
    state.stack = []
    /* build the stack from the parent chain so Back works */
    const par = parentMap(app.id)
    const chain = []
    let sid = screenId
    const seen = new Set()
    while (sid && par.get(sid) && !seen.has(sid)) {
      seen.add(sid)
      sid = par.get(sid).screenId
      chain.unshift(sid)
    }
    state.stack = chain
    state.screen = screenId
    const sc = getScreen(app.id, screenId)
    let item = null
    for (const r of sc.regions)
      for (const x of r.items) if (x.id === itemId) item = x
    state.selected = item
    state.hi = item
    if (refs.appSeg) refs.appSeg.set(app.id)
    renderAll()
    if (mountEl) {
      const target = refs.replicaWrap
      if (target && target.scrollIntoView)
        target.scrollIntoView({
          block: 'start',
          behavior: LN.reducedMotion() ? 'auto' : 'smooth',
        })
    }
  }
  LN.finder = { search, open, getScreen, pathTo }

  /* ---------------------------------------------- replica: item button */
  const itemBtn = (item, kind) => {
    const cls = ['fd-item', `fd-k-${kind}`]
    const sel = isSel(item)
    if (sel) cls.push('is-sel')
    if (sameItem(state.hi, item)) cls.push('fd-hi')
    if (item.hidden) cls.push('is-hidden')
    if (item.pro === 'pro') cls.push('is-pro')
    const b = h(
      'button',
      {
        type: 'button',
        class: cls.join(' '),
        'aria-pressed': String(sel),
        'aria-label': `${item.label}${item.opens ? ', opens a panel' : ''}`,
        title: item.does,
        dataset: { item: item.id },
        onClick: () => {
          if (item.hidden && !state.edit) return
          state.selected = item
          state.hi = null
          if (item.opens && !state.edit) {
            goScreen(item.opens)
            renderDetail()
            return
          }
          renderReplica()
          renderDetail()
        },
      },
      kind === 'tabs' || kind === 'hud' || kind === 'sheet' || kind === 'list'
        ? null
        : icon(item.icon),
      h('span', { class: 'fd-lab' }, item.label),
      item.pro === 'pro'
        ? h('i', { class: 'fd-pro', 'aria-label': 'Pro' }, 'PRO')
        : null,
      item.opens
        ? h('i', { class: 'fd-chev', 'aria-hidden': 'true' }, '›')
        : null,
    )
    return b
  }
  const visibleItems = r => r.items.filter(x => state.edit || !x.hidden)

  const regionEl = (r, app) => {
    const items = visibleItems(r)
    const k = r.kind
    const el = h('div', {
      class: `fd-region fd-r-${k}${r.area ? ` fd-area-${r.area}` : ''}`,
      dataset: { region: r.id },
      role: 'group',
      'aria-label': `${r.id} (${k})`,
    })
    if (k === 'preview') {
      const [first, ...rest] = items
      el.append(
        h(
          'div',
          { class: 'fd-canvas' },
          app.id === 'blackmagic' || app.id === 'pixel-camera'
            ? h(
                'div',
                { class: 'fd-scene' },
                h('i', { class: 'fd-light' }),
                h('i', { class: 'fd-horizon' }),
              )
            : h(
                'div',
                { class: 'fd-clipframe' },
                h('i'),
                h('i'),
                h('i'),
                h('i'),
              ),
          first ? itemBtn(first, 'preview') : null,
        ),
      )
      if (rest.length)
        el.append(
          h(
            'div',
            { class: 'fd-r-hud fd-canvas-bar' },
            rest.map(x => itemBtn(x, 'hud')),
          ),
        )
      return el
    }
    if (k === 'timeline') {
      el.append(
        h(
          'div',
          { class: 'fd-tl' },
          h(
            'div',
            { class: 'fd-tl-ruler' },
            '0s',
            h('span', null, '2s'),
            h('span', null, '4s'),
          ),
          h(
            'div',
            { class: 'fd-tl-lane' },
            items
              .filter(x =>
                ['mute', 'cover', 'adjtrack', 'ruler'].includes(x.id),
              )
              .map(x => itemBtn(x, 'tl')),
            h('i', { class: 'fd-clip c1' }),
            items.filter(x => x.id === 'transition').map(x => itemBtn(x, 'tl')),
            h('i', { class: 'fd-clip c2' }),
            items
              .filter(x => ['add', 'main'].includes(x.id))
              .map(x => itemBtn(x, 'tl')),
          ),
          h(
            'div',
            { class: 'fd-tl-lane sub' },
            items
              .filter(x => ['addaudio', 'audiotracks'].includes(x.id))
              .map(x => itemBtn(x, 'tl')),
          ),
          h('i', { class: 'fd-playhead' }),
        ),
      )
      return el
    }
    el.append(...items.map(x => itemBtn(x, k)))
    return el
  }

  const frameFor = (app, screen, body) => {
    if (app.device === 'desktop') return body
    const land = app.landscape && state.landscape
    return h(
      'div',
      { class: `fd-phone${land ? ' land' : ''} fd-app-${app.id}` },
      h('i', { class: 'fd-punch' }),
      h('div', { class: 'fd-screen' }, body),
    )
  }

  const phoneBody = (app, screen) => {
    const parts = []
    if (screen.over) {
      const base = getScreen(app.id, screen.over)
      const baseRegions = base.regions.filter(
        r => r.kind === 'topbar' || r.kind === 'preview' || r.kind === 'hud',
      )
      parts.push(
        h(
          'div',
          { class: 'fd-base', 'aria-hidden': 'true', inert: true },
          baseRegions.map(r => regionEl(r, app)),
        ),
      )
      parts.push(
        h(
          'div',
          { class: 'fd-sheetwrap' },
          h(
            'div',
            { class: 'fd-sheet-head' },
            h('b', null, screen.name),
            h('span', null, '✓'),
          ),
          screen.regions.map(r => regionEl(r, app)),
        ),
      )
      return h('div', { class: 'fd-stack' }, parts)
    }
    const hasAreas = screen.regions.some(r => r.area)
    if (hasAreas && app.landscape && state.landscape)
      return h(
        'div',
        { class: 'fd-hudgrid' },
        screen.regions.map(r => regionEl(r, app)),
      )
    return h(
      'div',
      { class: 'fd-stack' },
      screen.regions.map(r => regionEl(r, app)),
    )
  }

  const desktopBody = (app, screen) => {
    const editor = getScreen(app.id, 'editor')
    const slot = id =>
      editor.regions.filter(r => r.slot === id).map(r => regionEl(r, app))
    const focus = screen.slot
    const panel = (id, title, kids) =>
      h(
        'div',
        {
          class: `fd-win-panel fd-slot-${id}${focus === id ? ' is-focus' : ''}`,
        },
        h('div', { class: 'fd-win-ptitle' }, title),
        kids,
      )
    const own =
      screen.id === 'editor' ? [] : screen.regions.map(r => regionEl(r, app))
    const dim = x =>
      screen.id === 'editor' ? x : h('div', { class: 'fd-dim', inert: true }, x)
    return h(
      'div',
      { class: 'fd-win' },
      h(
        'div',
        { class: 'fd-win-title' },
        h('i', { class: 'fd-dots' }),
        slot('title'),
      ),
      h(
        'div',
        { class: 'fd-win-top' },
        panel(
          'assets',
          'Assets',
          focus === 'assets' ? [dim(slot('assets')), own] : dim(slot('assets')),
        ),
        panel(
          'player',
          'Player',
          focus === 'player' ? [dim(slot('player')), own] : dim(slot('player')),
        ),
        panel(
          'inspector',
          screen.slot === 'inspector' ? screen.name : 'Inspector',
          focus === 'inspector'
            ? [dim(slot('inspector')), own]
            : dim(slot('inspector')),
        ),
      ),
      h(
        'div',
        { class: 'fd-win-bottom' },
        dim(slot('timeline')),
        dim(slot('tracks')),
      ),
      focus === 'dialog'
        ? h(
            'div',
            { class: 'fd-dialog' },
            h('div', { class: 'fd-win-ptitle' }, screen.name),
            own,
          )
        : null,
    )
  }

  const renderReplica = () => {
    if (!refs.replica) return
    const app = appById(state.app)
    const screen = getScreen(app.id, state.screen || app.root)
    const crumbs = [...state.stack, screen.id].map(id => {
      const sc = app.screens.find(z => z.id === id)
      return sc ? sc.name : id
    })
    const bar = h(
      'div',
      { class: 'fd-navbar' },
      ui.btn('‹ Back', goBack, {
        kind: 'quiet',
        small: true,
        disabled: !state.stack.length,
        aria: 'Back',
      }),
      h('div', { class: 'fd-crumbs' }, ui.path(app.name, ...crumbs)),
      app.landscape
        ? ui.btn(
            state.landscape ? 'Portrait' : 'Landscape',
            () => {
              state.landscape = !state.landscape
              renderReplica()
            },
            { kind: 'quiet', small: true },
          )
        : null,
    )
    const body =
      app.device === 'desktop'
        ? desktopBody(app, screen)
        : phoneBody(app, screen)
    refs.replica.replaceChildren(
      bar,
      h('div', { class: 'fd-stage' }, frameFor(app, screen, body)),
    )
  }

  /* ---------------------------------------------- detail card */
  const renderDetail = () => {
    if (!refs.detail) return
    const item = state.selected
    const app = appById(state.app)
    if (!item || item.appId !== app.id) {
      refs.detail.replaceChildren(
        h(
          'div',
          { class: 'ln-card fd-detail' },
          h('h3', null, 'Tap any button in the replica'),
          h(
            'p',
            { class: 'ln-muted ln-small' },
            'Each one shows what it does, the house value, whether it is Pro, and how sure the research is. Buttons with › open their panel.',
          ),
        ),
      )
      return
    }
    const sc = getScreen(app.id, item.screenId)
    const conf = item.confidence
    const kids = [
      h(
        'div',
        { class: 'fd-detail-head' },
        icon(item.icon),
        h('h3', null, item.label),
        h(
          'div',
          { class: 'ln-row' },
          ui.chip(
            PRO_LABEL[item.pro] || item.pro,
            item.pro === 'pro' ? 'crimson' : '',
          ),
          h(
            'span',
            { class: `ln-chip fd-conf-${conf}` },
            CONF_LABEL[conf] || conf,
          ),
        ),
      ),
      h('div', { class: 'fd-pathrow' }, ui.path(app.name, ...pathTo(item))),
      h('p', { class: 'fd-does' }, item.does),
      item.altLabels && item.altLabels.length
        ? h(
            'p',
            { class: 'ln-faint ln-small' },
            `Also seen as: ${item.altLabels.join(', ')}`,
          )
        : null,
      CONF_NOTE[conf] && !item.added
        ? h('p', { class: 'ln-faint ln-small' }, CONF_NOTE[conf])
        : null,
    ]
    if (item.house) {
      kids.push(
        h(
          'div',
          { class: 'fd-house' },
          h('b', null, 'House value'),
          h('div', { class: 'fd-house-val' }, item.house.value),
          item.house.why
            ? h('div', { class: 'ln-muted ln-small' }, item.house.why)
            : null,
          item.house.go
            ? h(
                'a',
                { class: 'ln-btn small ghost', href: item.house.go },
                `Go do it in ${moduleTitle(item.house.go)}`,
              )
            : null,
        ),
      )
    }
    if (conf === 'unverified')
      kids.push(
        ui.callout(
          'verify',
          `This label comes from memory, not from a source. Open ${app.name} and look for "${item.label}" at ${pathTo(item).join(' › ')}. If it is there, turn on Edit mode and mark it confirmed.`,
        ),
      )
    if (item.pro === 'unknown')
      kids.push(
        h(
          'p',
          { class: 'ln-faint ln-small' },
          'No source says whether this needs Pro. The badge on your phone is the only reliable sign.',
        ),
      )

    if (state.edit) {
      const region = sc.regions.find(r => r.id === item.regionId)
      const ids = region.items.map(x => x.id)
      const i = ids.indexOf(item.id)
      const move = d => {
        const j = i + d
        if (j < 0 || j >= ids.length) return
        const next = ids.slice()
        ;[next[i], next[j]] = [next[j], next[i]]
        setOrder(app.id, item.screenId, item.regionId, next)
        refreshSelected()
      }
      const name = ui.field({
        label: 'Label on my phone',
        value: item.label,
        onInput: v => {
          patchItem(app.id, item.screenId, item.id, {
            label: v.trim() || undefined,
          })
        },
      })
      name.input.addEventListener('change', refreshSelected)
      kids.push(
        h(
          'div',
          { class: 'fd-editbox' },
          h('div', { class: 'ln-eyebrow' }, 'Match my app'),
          name.el,
          h(
            'div',
            { class: 'ln-row' },
            ui.btn('▲ Up', () => move(-1), {
              kind: 'quiet',
              small: true,
              disabled: i <= 0,
            }),
            ui.btn('▼ Down', () => move(1), {
              kind: 'quiet',
              small: true,
              disabled: i >= ids.length - 1,
            }),
            ui.btn(
              item.hidden ? 'Show' : 'Hide',
              () => {
                patchItem(app.id, item.screenId, item.id, {
                  hidden: !item.hidden,
                })
                refreshSelected()
              },
              { kind: 'quiet', small: true },
            ),
            ui.btn(
              item.pro === 'pro' ? 'Not Pro' : 'Mark Pro',
              () => {
                patchItem(app.id, item.screenId, item.id, {
                  pro: item.pro !== 'pro',
                })
                refreshSelected()
              },
              { kind: 'quiet', small: true },
            ),
            ui.btn(
              conf === 'confirmed' ? 'Confirmed ✓' : 'Confirmed on my phone',
              () => {
                patchItem(app.id, item.screenId, item.id, {
                  confirmed: conf !== 'confirmed',
                })
                refreshSelected()
              },
              { kind: conf === 'confirmed' ? 'ghost' : 'quiet', small: true },
            ),
          ),
          item.builtLabel && item.builtLabel !== item.label
            ? h(
                'p',
                { class: 'ln-faint ln-small' },
                `Built-in label: ${item.builtLabel}`,
              )
            : null,
        ),
      )
    }
    refs.detail.replaceChildren(h('div', { class: 'ln-card fd-detail' }, kids))
  }
  const refreshSelected = () => {
    if (state.selected) {
      const sc = getScreen(state.app, state.selected.screenId)
      let found = null
      for (const r of sc.regions)
        for (const x of r.items) if (x.id === state.selected.id) found = x
      state.selected = found
    }
    renderReplica()
    renderDetail()
    renderStatus()
  }

  /* ---------------------------------------------- status line */
  const renderStatus = () => {
    if (!refs.status) return
    const app = appById(state.app)
    const c = status(app.id)
    refs.status.replaceChildren(
      h('span', { class: 'fd-st c' }, `${c.confirmed} confirmed`),
      h('span', { class: 'fd-st l' }, `${c.likely} likely`),
      h(
        'span',
        { class: 'fd-st u' },
        `${c.unverified} to check on your ${app.device === 'desktop' ? 'computer' : 'phone'}`,
      ),
      h('span', { class: 'ln-faint' }, `· ${app.version}`),
    )
  }

  /* ---------------------------------------------- search UI */
  const renderResults = q => {
    const res = search(q)
    if (!norm(q)) {
      refs.results.replaceChildren()
      return
    }
    if (!res.length) {
      refs.results.replaceChildren(
        ui.empty(
          `Nothing called "${q}" in the four maps. Try another word, or add it with Match my app.`,
        ),
      )
      return
    }
    refs.results.replaceChildren(
      h(
        'div',
        { class: 'fd-results' },
        res.slice(0, 8).map(r =>
          h(
            'div',
            { class: 'fd-result' },
            h(
              'div',
              { class: 'fd-result-main' },
              h(
                'div',
                { class: 'fd-result-top' },
                h('b', null, r.label),
                h('span', { class: 'ln-chip' }, r.app),
                r.pro === 'pro' ? ui.chip('Pro', 'crimson') : null,
                h(
                  'span',
                  { class: `ln-chip fd-conf-${r.confidence}` },
                  CONF_LABEL[r.confidence],
                ),
              ),
              h('div', null, ui.path(r.app, ...r.path)),
              r.house
                ? h('div', { class: 'fd-result-house' }, r.house.value)
                : h('div', { class: 'ln-faint ln-small' }, r.does),
            ),
            ui.btn('Show me', () => open(r.appId, r.screenId, r.itemId), {
              small: true,
            }),
          ),
        ),
      ),
    )
  }

  /* ---------------------------------------------- screenshot reader */
  const diffAgainst = (screen, got) => {
    const current = []
    for (const r of screen.regions)
      for (const x of r.items) if (!x.hidden) current.push(x)
    const key = v => norm(v)
    const matchOf = label => {
      const k = key(label)
      return (
        current.find(
          x =>
            key(x.label) === k || (x.altLabels || []).some(a => key(a) === k),
        ) || null
      )
    }
    const matched = []
    const added = []
    for (const g of got) {
      const m = matchOf(g.label)
      if (m) matched.push({ item: m, pro: !!g.pro, label: g.label })
      else added.push(g)
    }
    const seen = new Set(matched.map(m => m.item.id))
    const seenRegions = new Set(matched.map(m => m.item.regionId))
    const toolbarIds = current
      .filter(x => seenRegions.has(x.regionId))
      .map(x => x.id)
    const missing = current.filter(
      x => toolbarIds.includes(x.id) && !seen.has(x.id),
    )
    const builtOrder = toolbarIds.filter(id => seen.has(id))
    const gotOrder = matched
      .map(m => m.item.id)
      .filter(id => toolbarIds.includes(id))
    const reordered = builtOrder.join('|') !== gotOrder.join('|')
    return { matched, added, missing, reordered, gotOrder }
  }
  const applyDiff = (app, screen, d) => {
    const regionOf = id =>
      screen.regions.find(r => r.items.some(x => x.id === id))
    for (const m of d.matched) {
      patchItem(app.id, screen.id, m.item.id, {
        confirmed: true,
        pro: m.pro,
        label: norm(m.label) !== norm(m.item.builtLabel) ? m.label : undefined,
      })
    }
    for (const x of d.missing)
      patchItem(app.id, screen.id, x.id, { hidden: true })
    const lastRegion = screen.regions
      .filter(r => ['toolbar', 'tabs', 'sheet', 'list', 'hud'].includes(r.kind))
      .pop()
    if (lastRegion)
      for (const a of d.added)
        addItem(app.id, screen.id, lastRegion.id, a.label, !!a.pro)
    if (d.reordered) {
      const byRegion = new Map()
      for (const id of d.gotOrder) {
        const r = regionOf(id)
        if (!r) continue
        if (!byRegion.has(r.id)) byRegion.set(r.id, [])
        byRegion.get(r.id).push(id)
      }
      for (const [rid, ids] of byRegion) setOrder(app.id, screen.id, rid, ids)
    }
  }
  const readScreenshot = async file => {
    const app = appById(state.app)
    const screen = getScreen(app.id, state.screen || app.root)
    const labels = []
    for (const r of screen.regions)
      for (const x of r.items) if (!x.hidden) labels.push(x.label)
    const prompt =
      `This is a screenshot of the "${screen.name}" screen of ${app.name} (${app.version}). ` +
      `List every visible tool or control label in reading order (left to right, top to bottom), exactly as written on screen, ` +
      `and whether it carries a Pro or crown badge. The expected labels, for reference only, are: ${labels.join(', ')}. ` +
      `Do not invent labels you cannot read. Answer as JSON only: {"items":[{"label":"Split","pro":false}]}`
    refs.readout.replaceChildren(
      h('p', { class: 'ln-muted ln-small' }, 'Reading the screenshot…'),
    )
    try {
      const res = await LN.ai.ask(prompt, {
        json: true,
        images: file,
        brain: false,
      })
      const got = Array.isArray(res && res.items)
        ? res.items
            .filter(x => x && typeof x.label === 'string' && x.label.trim())
            .map(x => ({ label: x.label.trim().slice(0, 40), pro: !!x.pro }))
        : []
      if (!got.length) {
        refs.readout.replaceChildren(
          ui.callout(
            'warn',
            'No labels came back. Take the screenshot with the toolbar fully visible and try again.',
          ),
        )
        return
      }
      const d = diffAgainst(screen, got)
      const row = (title, list, kind) =>
        list.length
          ? h(
              'div',
              { class: 'fd-diffrow' },
              h('b', null, title),
              h(
                'div',
                { class: 'ln-row' },
                list.map(l => ui.chip(l, kind)),
              ),
            )
          : null
      refs.readout.replaceChildren(
        h(
          'div',
          { class: 'ln-stack fd-diff' },
          h(
            'div',
            { class: 'ln-eyebrow' },
            `${got.length} labels read on ${screen.name}`,
          ),
          row(
            'Added (on your phone, not in the map)',
            d.added.map(a => a.label),
            'amber',
          ),
          row(
            'Missing (in the map, not on your phone)',
            d.missing.map(x => x.label),
            'crimson',
          ),
          row(
            'Seen',
            d.matched.map(m => m.label),
            'sage',
          ),
          d.reordered
            ? h(
                'p',
                { class: 'ln-small' },
                `Order differs. New order: ${d.gotOrder
                  .map(id => {
                    let l = id
                    for (const r of screen.regions)
                      for (const x of r.items) if (x.id === id) l = x.label
                    return l
                  })
                  .join(' › ')}`,
              )
            : h('p', { class: 'ln-small ln-muted' }, 'Order matches.'),
          h(
            'div',
            { class: 'ln-row' },
            ui.btn('Apply to the map', () => {
              applyDiff(app, screen, d)
              refs.readout.replaceChildren(
                ui.callout(
                  'ok',
                  `${screen.name} now matches your screenshot: ${d.matched.length} confirmed, ${d.added.length} added, ${d.missing.length} hidden.`,
                ),
              )
              refreshSelected()
            }),
            ui.btn('Discard', () => refs.readout.replaceChildren(), {
              kind: 'quiet',
            }),
          ),
        ),
      )
    } catch (e) {
      refs.readout.replaceChildren(ui.callout('warn', LN.ai.explain(e)))
    }
  }

  /* ---------------------------------------------- match my app panel */
  const matchPanel = async () => {
    const app = appById(state.app)
    const editToggle = ui.toggle({
      label: 'Edit mode: rename, reorder, hide, mark Pro, mark confirmed',
      checked: state.edit,
      onChange: v => {
        state.edit = v
        ST.set(EDIT_KEY, v)
        mountEl.classList.toggle('is-edit', v)
        renderReplica()
        renderDetail()
      },
    })
    refs.readout = h('div')
    const exportBtn = ui.btn(
      'Export overrides (.json)',
      () =>
        LN.save({
          filename: 'kubrick-appmaps.json',
          data: JSON.stringify(
            { kind: 'kubrick-appmaps', version: 1, overrides: loadOv() },
            null,
            2,
          ),
          mime: 'application/json',
        }),
      { kind: 'quiet', small: true },
    )
    const importBtn = ui.filePick({
      accept: '.json,application/json',
      label: 'Import overrides (.json)',
      small: true,
      onFile: async f => {
        try {
          const d = JSON.parse(await f.text())
          if (
            !d ||
            d.kind !== 'kubrick-appmaps' ||
            typeof d.overrides !== 'object'
          )
            throw new Error('bad')
          saveOv(d.overrides)
          LN.toast('Overrides imported')
          refreshSelected()
        } catch (_e) {
          LN.toast('That is not a Kubrick app-map file.', { kind: 'err' })
        }
      },
    })
    const resetBtn = ui.btn(
      'Reset this screen',
      () => {
        LN.sheet({
          title: 'Reset this screen?',
          body: 'Your renames, order, hidden items and Pro marks on this screen go back to the built-in map.',
          actions: [
            {
              label: 'Reset',
              kind: 'danger',
              onClick: () => {
                resetScreen(app.id, state.screen || app.root)
                refreshSelected()
              },
            },
            { label: 'Keep', kind: 'quiet' },
          ],
        })
      },
      { kind: 'danger', small: true },
    )
    const aiOn = await LN.ai.available()
    const shotRow = aiOn
      ? h(
          'div',
          { class: 'ln-stack' },
          ui.filePick({
            accept: 'image/*',
            label: 'Read my screenshot',
            kind: 'ghost',
            onFile: readScreenshot,
          }),
          h(
            'p',
            { class: 'ln-faint ln-small' },
            'Take a screenshot of the current screen on your phone with the toolbar scrolled into view. Fable 5.1 reads the labels and shows a diff against the map before anything changes.',
          ),
          refs.readout,
        )
      : h(
          'div',
          { class: 'ln-stack' },
          h(
            'p',
            { class: 'ln-faint ln-small' },
            'Read my screenshot needs Fable 5.1, which is reachable only when this page is open in claude.ai. Edit mode still works by hand.',
          ),
        )
    return h(
      'div',
      { class: 'ln-card fd-match' },
      h('h3', null, 'Match my app'),
      h(
        'p',
        { class: 'ln-muted ln-small' },
        'CapCut moves tools between builds. Make the map equal your exact version; changes stay on this phone.',
      ),
      editToggle.el,
      shotRow,
      h('div', { class: 'ln-row' }, exportBtn, importBtn, resetBtn),
    )
  }

  const renderAll = () => {
    renderStatus()
    renderReplica()
    renderDetail()
    if (refs.matchHost) {
      refs.matchHost.replaceChildren()
      matchPanel().then(el => refs.matchHost.replaceChildren(el))
    }
  }

  /* ------------------------------------------------------------ mount */
  LN.register({
    id: 'find',
    num: 0,
    title: 'Find it',
    short: 'Find',
    kicker: 'YOUR APPS',
    blurb:
      'Where is it in CapCut, Blackmagic Camera and Pixel Camera, with the house value on every button.',
    lede: 'Four replicas of the apps you really use, drawn from their real arrangement. Search a tool, press Show me, and the button lights up where it lives, with what to set it to.',
    outputs: [
      'CapCut Mobile map',
      'CapCut Desktop map',
      'Blackmagic Camera map',
      'Pixel Camera map',
    ],
    mount(el) {
      mountEl = el
      if (!DATA.length) {
        el.append(
          ui.callout('warn', 'The app maps did not load (data/appmaps.js).'),
        )
        return
      }
      if (!DATA.some(a => a.id === state.app)) state.app = DATA[0].id
      state.screen = appById(state.app).root
      el.classList.toggle('is-edit', state.edit)

      const input = h('input', {
        class: 'ln-input fd-search',
        type: 'search',
        id: 'fd-search',
        placeholder:
          'Where is… LUT, speed curve, white balance, captions, zebra, export',
        autocomplete: 'off',
        'aria-label': 'Where is',
        onInput: () => renderResults(input.value),
      })
      refs.results = h('div', {
        class: 'fd-results-host',
        'aria-live': 'polite',
      })
      const tries = [
        'LUT',
        'speed curve',
        'white balance',
        'captions',
        'zebra',
        'export',
      ].map(t =>
        h(
          'button',
          {
            type: 'button',
            class: 'ln-chip',
            onClick: () => {
              input.value = t
              renderResults(t)
            },
          },
          t,
        ),
      )
      refs.appSeg = ui.seg({
        label: 'App',
        options: DATA.map(a => ({ value: a.id, label: a.short || a.name })),
        value: state.app,
        onChange: setApp,
      })
      refs.status = h('div', { class: 'fd-status' })
      refs.replica = h('div', { class: 'fd-replica' })
      refs.detail = h('div', { class: 'fd-detail-host' })
      refs.matchHost = h('div')
      refs.replicaWrap = h('div', { class: 'fd-replica-wrap' }, refs.replica)

      el.append(
        ui.section(
          {},
          h(
            'div',
            { class: 'ln-stack fd-searchbox' },
            h(
              'label',
              { class: 'ln-label', for: 'fd-search' },
              h('span', null, 'Where is…'),
            ),
            input,
            h(
              'div',
              { class: 'ln-row' },
              h('span', { class: 'ln-faint ln-small' }, 'try'),
              tries,
            ),
            refs.results,
          ),
        ),
        ui.section(
          { id: 'fd-apps' },
          refs.appSeg.el,
          refs.status,
          h(
            'div',
            { class: 'ln-split fd-split' },
            refs.replicaWrap,
            h('div', { class: 'ln-stack' }, refs.detail, refs.matchHost),
          ),
        ),
      )
      renderAll()
    },
  })
})()
