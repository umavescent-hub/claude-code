/* modules/manual.js: the production manual (reader, search, .md export) and
   the playbook's recall deck with its 15-minute block timer.
   Chapters come from LN.data.manual (built from manual/NN-slug.md). */
;(() => {
  const { h, s, ui } = LN
  const CHAPTERS = Array.isArray(LN.data && LN.data.manual)
    ? LN.data.manual
    : []
  const WPM = 220
  const readMin = ch => Math.max(1, Math.round((ch.words || 0) / WPM))
  const pad2 = n => String(n).padStart(2, '0')
  const smooth = () => (LN.reducedMotion() ? 'auto' : 'smooth')

  /* ---------------------------------------------------------- recall cards */
  // The Creator Playbook recall deck, copied as written (Nov 4, 2026).
  const BLOCKS = {
    'pb-color': 'Block 1 · Color theory',
    'pb-grade': 'Block 2 · Grading in CapCut',
    'pb-edit': 'Block 3 · Editing workflow',
    'pb-money': 'Block 4 · Money',
    'pb-fonts': 'Block 5 · Fonts',
  }
  const MONEY_NOTE =
    'Creator-reported figures that change. Check the in-app dashboards before planning on them.'
  const PLAYBOOK = [
    [
      'pb-color',
      'Which carries more picture information to the eye: luminance or color? Why?',
      'Luminance; about 120M rods vs 6M cones, so detail and exposure read before color',
    ],
    [
      'pb-color',
      'Name the angle between complementary colors and the Hollywood pairing it produces.',
      '180°; teal and orange',
    ],
    [
      'pb-color',
      'What is the skin-tone line and what happens if your grade crosses it?',
      'The narrow hue line where all skin sits between red and yellow; crossing it turns people green or magenta',
    ],
    ['pb-color', 'Which color family suppresses appetite?', 'Blue'],
    ['pb-color', 'Minimum contrast ratio for readable text on video?', '4.5:1'],
    [
      'pb-grade',
      'Give the five-step grading order in CapCut.',
      'Correct (Basic) → Match → Grade (Curves/HSL/Wheels on adjustment layer) → Look (LUT) → Finish (halation, grain, vignette)',
    ],
    ['pb-grade', 'What LUT intensity turns a filter into a grade?', '50–70%'],
    [
      'pb-grade',
      'Which curve move makes dreamcore? Which makes the dark look?',
      'Lift the black point = dreamcore; drop the black point and pull shadows = dark',
    ],
    [
      'pb-grade',
      'How do you build halation in CapCut (blend mode, blur, opacity range)?',
      'Duplicate on overlay, Screen or Lighten blend, Blur 20–40, warm temp, Opacity 25–45%',
    ],
    [
      'pb-money',
      'What four things must be true for TikTok Creator Rewards eligibility?',
      '18+, personal account in good standing, 10,000 followers, 100,000 views in 30 days; and the video is over 1 minute',
    ],
    [
      'pb-money',
      'What is a qualified view, and roughly what share of total views qualify?',
      'A For You view watched 5+ seconds; often 50–70% of total views',
    ],
    [
      'pb-money',
      'How does the CapCut Template Creator Program pay?',
      'On how often templates are used and exported, plus referral rewards and challenge rewards',
    ],
    [
      'pb-fonts',
      'State the one-axis rule for pairing fonts.',
      'Differ clearly on one axis (serif/sans, condensed/wide, display/text), agree on mood and x-height',
    ],
    [
      'pb-fonts',
      'Max fonts per video, and the three roles?',
      'Two; display for titles, workhorse for captions, workhorse bold for emphasis',
    ],
    [
      'pb-edit',
      'In the edit order, what comes immediately after the rough cut to the beat?',
      'Structure: hook → what/where → cook/plate → verdict → payoff, built past 60 s',
    ],
  ].map(([block, q, a], i) => ({
    id: `pb${pad2(i + 1)}`,
    n: i + 1,
    block,
    q,
    a,
    note: block === 'pb-money' ? MONEY_NOTE : '',
    src: BLOCKS[block],
  }))

  const hash = str => {
    let x = 5381
    for (let i = 0; i < str.length; i++)
      x = ((x << 5) + x + str.charCodeAt(i)) | 0
    return (x >>> 0).toString(36)
  }
  // "> [!RECALL] Question :: Answer" lines in chapter markdown become cards.
  const RECALL_LINE = /^\s*>\s*\[!RECALL\]\s*(.+?)\s*::\s*(.+?)\s*$/i
  const chapterCards = ch =>
    String(ch.md || '')
      .split('\n')
      .map(l => l.match(RECALL_LINE))
      .filter(Boolean)
      .map((m, i) => ({
        id: `${ch.id}-${hash(m[1])}`,
        n: i + 1,
        block: `ch:${ch.id}`,
        q: m[1],
        a: m[2],
        note: '',
        src: `Ch ${pad2(ch.num)} · ${ch.title}`,
      }))
  const CH_CARDS = CHAPTERS.map(chapterCards)

  const DECKS = [
    { key: 'playbook', label: 'Creator Playbook · all 15', cards: PLAYBOOK },
    ...Object.keys(BLOCKS).map(k => ({
      key: k,
      label: BLOCKS[k],
      cards: PLAYBOOK.filter(c => c.block === k),
    })),
    ...CHAPTERS.map((ch, i) => ({
      key: `ch:${ch.id}`,
      label: `Ch ${pad2(ch.num)} · ${ch.title}`,
      cards: CH_CARDS[i],
    })).filter(d => d.cards.length),
  ]
  const allCh = CH_CARDS.flat()
  if (allCh.length)
    DECKS.push({
      key: 'all',
      label: 'Everything',
      cards: PLAYBOOK.concat(allCh),
    })
  const deckBy = key => DECKS.find(d => d.key === key) || DECKS[0]

  /* ---------------------------------------------------------- dates */
  const dayStr = d =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const parseDay = str => {
    const [y, m, d] = String(str).split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }
  const addDays = (str, n) => {
    const d = parseDay(str)
    d.setDate(d.getDate() + n)
    return dayStr(d)
  }
  const today = () => dayStr(new Date())
  const diffDays = (a, b) => {
    const A = parseDay(a)
    const B = parseDay(b)
    return Math.round(
      (Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) -
        Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) /
        86400000,
    )
  }
  const niceDay = str =>
    parseDay(str).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  const relDay = str => {
    const n = diffDays(today(), str)
    if (n === 0) return 'today'
    if (n === 1) return 'tomorrow'
    if (n > 1) return `in ${n} days`
    if (n === -1) return 'overdue since yesterday'
    return `overdue by ${-n} days`
  }

  /* ---------------------------------------------------------- recall store */
  const RKEY = 'manual.recall'
  const loadRecall = () => {
    const r = LN.store.get(RKEY, null)
    return r && typeof r === 'object' && r.decks ? r : { v: 1, decks: {} }
  }
  const saveRecall = r => LN.store.set(RKEY, r)
  function nextDue(st) {
    if (!st || !st.first) return null
    const due = []
    if (st.rerun)
      due.push({ date: st.rerun, label: 'Rerun (last score under 80%)' })
    if (!st.d2) due.push({ date: addDays(st.first, 2), label: 'Day-2 recall' })
    if (!st.d7) due.push({ date: addDays(st.first, 7), label: 'Day-7 recall' })
    due.sort((a, b) => diffDays(b.date, a.date))
    return due[0] || null
  }
  function logSession(deckKey, got, total) {
    const r = loadRecall()
    const d = today()
    const st = r.decks[deckKey] || { first: d, d2: null, d7: null, runs: 0 }
    if (st.first !== d) {
      if (!st.d2 && diffDays(st.first, d) >= 2) st.d2 = d
      if (!st.d7 && diffDays(st.first, d) >= 7) st.d7 = d
    }
    const pct = total ? got / total : 0
    st.rerun = pct < 0.8 ? addDays(d, 1) : null
    st.runs = (st.runs || 0) + 1
    st.last = { date: d, got, total }
    r.decks[deckKey] = st
    saveRecall(r)
    return st
  }

  /* ---------------------------------------------------------- chapter DOM */
  function prepChapter(ch) {
    // ch.html is a trusted build-time string from build.mjs (never user input).
    const art = h('article', {
      class: 'mn-article ln-prose',
      dataset: { ch: ch.id },
      html: ch.html,
    })
    for (const cb of LN.$$('.ln-copyblock', art)) {
      const head = cb.querySelector('header')
      const pre = cb.querySelector('pre')
      if (head && pre && !head.querySelector('button'))
        head.append(
          h(
            'button',
            {
              type: 'button',
              class: 'ln-btn small ghost',
              onClick: () => LN.copy(pre.textContent, { label: 'Copied' }),
            },
            'Copy',
          ),
        )
    }
    for (const bq of LN.$$('blockquote', art)) {
      const txt = bq.textContent.trim()
      if (!/^\[!RECALL\]/i.test(txt)) continue
      const cards = txt
        .split(/\[!RECALL\]/i)
        .map(t => t.trim())
        .filter(t => t.includes('::'))
        .map(t => {
          const i = t.indexOf('::')
          return { q: t.slice(0, i).trim(), a: t.slice(i + 2).trim() }
        })
      const prev = bq.previousElementSibling
      const group =
        prev && prev.classList.contains('mn-qa-group')
          ? prev
          : h(
              'div',
              { class: 'mn-qa-group' },
              h(
                'div',
                { class: 'mn-qa-head' },
                'Recall · say it before you open it',
              ),
            )
      for (const c of cards)
        group.append(
          h(
            'details',
            { class: 'mn-qa' },
            h('summary', null, h('span', null, c.q)),
            h('p', null, c.a),
          ),
        )
      if (group === prev) bq.remove()
      else bq.replaceWith(group)
    }
    for (const hd of LN.$$('h1, h2, h3, h4', art))
      hd.setAttribute('tabindex', '-1')
    return art
  }

  // Search index: one entry per h1-h3 section, text taken from DOM text nodes.
  function indexChapter(ci, art) {
    const out = []
    let cur = null
    for (const node of Array.from(art.children)) {
      const m = /^H([1-3])$/.exec(node.tagName)
      if (m && node.id) {
        cur = {
          ci,
          id: node.id,
          title: node.textContent.trim(),
          level: Number(m[1]),
          text: '',
        }
        out.push(cur)
        continue
      }
      if (!cur) {
        cur = { ci, id: '', title: CHAPTERS[ci].title, level: 1, text: '' }
        out.push(cur)
      }
      cur.text += ` ${node.textContent}`
    }
    for (const e of out) {
      e.text = e.text.replace(/\s+/g, ' ').trim()
      e.hay = `${e.title} ${e.text}`.toLowerCase()
      e.titleLow = e.title.toLowerCase()
    }
    return out
  }

  const escRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  function markText(text, terms) {
    // Build highlighted nodes from plain text: text nodes + <mark> elements.
    const frag = document.createDocumentFragment()
    if (!terms.length) {
      frag.append(text)
      return frag
    }
    const re = new RegExp(terms.map(escRe).join('|'), 'gi')
    let last = 0
    for (const m of text.matchAll(re)) {
      if (m.index > last) frag.append(text.slice(last, m.index))
      frag.append(h('mark', null, m[0]))
      last = m.index + m[0].length
    }
    if (last < text.length) frag.append(text.slice(last))
    return frag
  }
  function snippet(text, terms) {
    const low = text.toLowerCase()
    let pos = -1
    for (const t of terms) {
      const p = low.indexOf(t)
      if (p >= 0 && (pos < 0 || p < pos)) pos = p
    }
    if (pos < 0) pos = 0
    let start = Math.max(0, pos - 60)
    if (start > 0) {
      const sp = text.indexOf(' ', start)
      if (sp > 0 && sp < pos) start = sp + 1
    }
    let end = Math.min(text.length, pos + 150)
    if (end < text.length) {
      const sp = text.lastIndexOf(' ', end)
      if (sp > pos) end = sp
    }
    return `${start > 0 ? '… ' : ''}${text.slice(start, end)}${end < text.length ? ' …' : ''}`
  }

  /* ---------------------------------------------------------- markdown export */
  function manualMarkdown() {
    const total = CHAPTERS.reduce((n, c) => n + readMin(c), 0)
    const toc = CHAPTERS.map(
      c => `- ${pad2(c.num)} ${c.title} (${readMin(c)} min read)`,
    ).join('\n')
    const body = CHAPTERS.map(c => String(c.md || '').trim()).join(
      '\n\n---\n\n',
    )
    return `# Kubrick: Production manual\n\nChef Rainbird (@Popé) · exported ${today()} · ${CHAPTERS.length} chapters · about ${total} min of reading\n\n## Contents\n\n${toc}\n\n---\n\n${body}\n`
  }
  const saveAll = () =>
    LN.save({
      filename: 'Kubrick-Manual.md',
      data: manualMarkdown(),
      mime: 'text/markdown',
    })
  const saveChapter = ch =>
    LN.save({
      filename: `Kubrick-${ch.file || `${ch.id}.md`}`,
      data: `${String(ch.md || '').trim()}\n`,
      mime: 'text/markdown',
    })

  /* ========================================================== READ panel */
  let tabsApi = null
  let recallApi = null

  function renderRead(panel) {
    if (!CHAPTERS.length) {
      panel.append(
        ui.empty(
          'No chapters yet. Add manual/NN-slug.md files and rebuild: they appear here with search and reading times.',
        ),
      )
      return
    }
    const arts = CHAPTERS.map(prepChapter)
    const index = arts.flatMap((a, i) => indexChapter(i, a))
    const pos = LN.store.get('manual.pos', null)
    let cur = Math.max(
      0,
      CHAPTERS.findIndex(c => pos && c.id === pos.ch),
    )
    let activeId = ''

    /* toolbar */
    const qInput = h('input', {
      class: 'ln-input mn-q',
      id: 'mn-q',
      type: 'search',
      placeholder: 'Search every chapter: zebras, zip, recall…',
      autocomplete: 'off',
      enterkeyhint: 'search',
    })
    const tocBtn = ui.btn('Contents', () => openTocSheet(), {
      kind: 'quiet',
      small: true,
    })
    tocBtn.classList.add('mn-tocbtn')
    const resumeBtn = ui.btn('', () => resume(), { kind: 'ghost', small: true })
    resumeBtn.classList.add('mn-resume')
    resumeBtn.hidden = true
    const toolbar = h(
      'div',
      { class: 'mn-toolbar' },
      h(
        'div',
        { class: 'mn-search' },
        h('label', { class: 'ln-label', for: 'mn-q' }, 'Search the manual'),
        qInput,
      ),
      h(
        'div',
        { class: 'mn-tools' },
        tocBtn,
        resumeBtn,
        ui.btn('Download manual (.md)', saveAll, {
          kind: 'ghost',
          small: true,
        }),
      ),
    )
    const results = h('div', {
      class: 'mn-results',
      role: 'region',
      'aria-label': 'Search results',
      hidden: true,
    })
    const status = h('p', {
      class: 'mn-status',
      role: 'status',
      'aria-live': 'polite',
    })

    /* panes */
    const asideNav = h('div', { class: 'mn-aside-nav' })
    const totalMin = CHAPTERS.reduce((n, c) => n + readMin(c), 0)
    const aside = h(
      'aside',
      { class: 'mn-aside', 'aria-label': 'Manual contents' },
      h(
        'div',
        { class: 'mn-aside-in' },
        h('div', { class: 'ln-eyebrow' }, 'Contents'),
        asideNav,
        h(
          'p',
          { class: 'mn-aside-total' },
          `${CHAPTERS.length} chapter${CHAPTERS.length === 1 ? '' : 's'} · about ${totalMin} min`,
        ),
      ),
    )
    const chMeta = h('div', { class: 'mn-chmeta' })
    const artHost = h('div', { class: 'mn-arthost' })
    const chEnd = h('div', { class: 'mn-chend' })
    const reader = h('div', { class: 'mn-reader' }, chMeta, artHost, chEnd)
    const fab = h(
      'button',
      {
        type: 'button',
        class: 'mn-fab',
        'aria-label': 'Open contents',
        hidden: true,
        onClick: () => openTocSheet(),
      },
      h('span', { 'aria-hidden': 'true' }, '≡'),
      'Contents',
    )
    panel.append(
      toolbar,
      status,
      results,
      h('div', { class: 'mn-panes' }, aside, reader),
      fab,
    )

    /* contents list (desktop aside + phone sheet) */
    function buildToc(onPick) {
      return h(
        'ol',
        { class: 'mn-toc' },
        CHAPTERS.map((ch, i) => {
          const on = i === cur
          const secs = ch.headings.filter(x => x.level >= 2)
          return h(
            'li',
            { class: `mn-toc-ch${on ? ' on' : ''}` },
            h(
              'button',
              {
                type: 'button',
                class: 'mn-toc-chbtn',
                'aria-current': on ? 'true' : null,
                onClick: () => onPick(i, ''),
              },
              h('span', { class: 'n' }, pad2(ch.num)),
              h('span', { class: 't' }, ch.title),
              h('span', { class: 'rt' }, `${readMin(ch)} min`),
            ),
            on && secs.length
              ? h(
                  'ol',
                  { class: 'mn-toc-secs' },
                  secs.map(x =>
                    h(
                      'li',
                      null,
                      h(
                        'button',
                        {
                          type: 'button',
                          class: `mn-toc-sec l${x.level}${x.id === activeId ? ' on' : ''}`,
                          dataset: { sec: x.id },
                          onClick: () => onPick(i, x.id),
                        },
                        x.text,
                      ),
                    ),
                  ),
                )
              : null,
          )
        }),
      )
    }
    const renderAside = () =>
      asideNav.replaceChildren(buildToc((i, sec) => jump(i, sec)))

    function openTocSheet() {
      let sheet = null
      const pick = (i, sec) => {
        if (sheet) sheet.close()
        requestAnimationFrame(() => jump(i, sec))
      }
      sheet = LN.sheet({
        title: 'Contents',
        body: h(
          'div',
          { class: 'm-manual mn-sheet-toc' },
          buildToc(pick),
          h(
            'p',
            { class: 'mn-aside-total' },
            `${CHAPTERS.length} chapter${CHAPTERS.length === 1 ? '' : 's'} · about ${totalMin} min · ${WPM} words a minute`,
          ),
        ),
      })
    }

    /* chapter view */
    function showChapter(i) {
      cur = i
      const ch = CHAPTERS[i]
      chMeta.replaceChildren(
        h(
          'div',
          { class: 'ln-eyebrow' },
          `Chapter ${pad2(ch.num)} · ${readMin(ch)} min read · ${ch.words.toLocaleString('en-US')} words`,
        ),
        ui.btn('Chapter .md', () => saveChapter(ch), {
          kind: 'quiet',
          small: true,
          aria: `Download chapter ${pad2(ch.num)} as Markdown`,
        }),
      )
      artHost.replaceChildren(arts[i])
      const cards = CH_CARDS[i]
      const prev = CHAPTERS[i - 1]
      const next = CHAPTERS[i + 1]
      chEnd.replaceChildren(
        cards.length
          ? h(
              'div',
              { class: 'mn-drill' },
              h(
                'p',
                null,
                h(
                  'b',
                  null,
                  `${cards.length} recall card${cards.length === 1 ? '' : 's'}`,
                ),
                ' in this chapter. Run them as a scored session, then the deck books your day-2 and day-7 dates.',
              ),
              ui.btn('Drill these cards', () => drill(`ch:${ch.id}`), {
                kind: 'ghost',
                small: true,
              }),
            )
          : null,
        h(
          'nav',
          { class: 'mn-pager', 'aria-label': 'Chapters' },
          prev
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'prev',
                  onClick: () => jump(i - 1, ''),
                },
                h('small', null, 'Previous'),
                h('span', null, `${pad2(prev.num)} ${prev.title}`),
              )
            : h('span'),
          next
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'next',
                  onClick: () => jump(i + 1, ''),
                },
                h('small', null, 'Next'),
                h('span', null, `${pad2(next.num)} ${next.title}`),
              )
            : h('span'),
        ),
      )
      const first = arts[i].querySelector('h1, h2, h3')
      activeId = first ? first.id : ''
      renderAside()
    }

    function flash(el) {
      if (LN.reducedMotion()) return
      el.classList.remove('mn-flash')
      void el.offsetWidth
      el.classList.add('mn-flash')
      setTimeout(() => el.classList.remove('mn-flash'), 1600)
    }
    function jump(i, secId) {
      if (i !== cur) showChapter(i)
      const target = secId ? document.getElementById(secId) : null
      if (target && arts[i].contains(target)) {
        target.scrollIntoView({ block: 'start', behavior: smooth() })
        target.focus({ preventScroll: true })
        flash(target)
        setActive(target.id)
      } else {
        chMeta.scrollIntoView({ block: 'start', behavior: 'auto' })
        const first = arts[i].querySelector('h1, h2, h3')
        if (first) setActive(first.id)
      }
      resumeBtn.hidden = true
    }

    /* position memory + scroll spy */
    function setActive(id) {
      if (!id) return
      if (id !== activeId) {
        activeId = id
        for (const b of LN.$$('.mn-toc-sec', asideNav))
          b.classList.toggle('on', b.dataset.sec === id)
      }
      LN.store.set('manual.pos', {
        ch: CHAPTERS[cur].id,
        sec: id,
        at: Date.now(),
      })
    }
    const scrollPad = () =>
      Number.parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      ) || 104
    let spyRaf = 0
    let lastSaved = ''
    function spy() {
      spyRaf = 0
      if (panel.offsetParent === null) return
      const line = scrollPad() + 40
      let active = null
      for (const hd of LN.$$('h1, h2, h3', arts[cur])) {
        if (hd.getBoundingClientRect().top <= line) active = hd
        else break
      }
      if (!active) active = arts[cur].querySelector('h1, h2, h3')
      if (active && active.id !== lastSaved) {
        lastSaved = active.id
        setActive(active.id)
      }
      if (
        !resumeBtn.hidden &&
        active &&
        active.id !== CHAPTERS[cur].headings[0]?.id
      )
        resumeBtn.hidden = true
    }
    window.addEventListener(
      'scroll',
      () => {
        if (!spyRaf) spyRaf = requestAnimationFrame(spy)
      },
      { passive: true },
    )
    function resume() {
      const p = LN.store.get('manual.pos', null)
      const target = resumeBtn.dataset.sec || (p && p.sec)
      const i = CHAPTERS.findIndex(c => p && c.id === p.ch)
      jump(i >= 0 ? i : cur, target)
    }

    /* phone: floating Contents once the toolbar scrolls away */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        ([e]) => {
          fab.hidden = e.isIntersecting
        },
        { rootMargin: '-120px 0px 0px 0px' },
      )
      io.observe(toolbar)
    }

    /* search */
    let qTimer = 0
    function runSearch() {
      const q = qInput.value.trim().toLowerCase()
      const terms = Array.from(
        new Set(q.split(/[\s\-–—/]+/).filter(t => t.length >= 2)),
      )
      if (!terms.length) {
        results.hidden = true
        results.replaceChildren()
        status.textContent = ''
        return
      }
      const hits = []
      for (const e of index) {
        if (!terms.every(t => e.hay.includes(t))) continue
        let score = 0
        for (const t of terms) {
          score += e.hay.split(t).length - 1
          if (e.titleLow.includes(t)) score += 6
        }
        hits.push({ e, score })
      }
      hits.sort((a, b) => b.score - a.score || a.e.ci - b.e.ci)
      const chs = new Set(hits.map(x => x.e.ci)).size
      status.textContent = hits.length
        ? `${hits.length} section${hits.length === 1 ? '' : 's'} in ${chs} chapter${chs === 1 ? '' : 's'}`
        : `Nothing matches “${qInput.value.trim()}”. Try one word.`
      results.hidden = !hits.length
      results.replaceChildren(
        ...hits.slice(0, 24).map(({ e }) => {
          const ch = CHAPTERS[e.ci]
          return h(
            'button',
            {
              type: 'button',
              class: 'mn-hit',
              onClick: () => jump(e.ci, e.id),
            },
            h(
              'span',
              { class: 'mn-hit-path' },
              h('span', null, `${pad2(ch.num)} ${ch.title}`),
              e.level > 1 ? h('i', { 'aria-hidden': 'true' }, '›') : null,
              e.level > 1 ? h('span', null, e.title) : null,
            ),
            h(
              'span',
              { class: 'mn-hit-snip' },
              markText(snippet(e.text, terms), terms),
            ),
          )
        }),
        hits.length > 24
          ? h(
              'p',
              { class: 'mn-status' },
              `Showing the first 24. Add a word to narrow it.`,
            )
          : null,
      )
    }
    qInput.addEventListener('input', () => {
      clearTimeout(qTimer)
      qTimer = setTimeout(runSearch, 120)
    })
    qInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        clearTimeout(qTimer)
        runSearch()
        const first = results.querySelector('.mn-hit')
        if (first) first.focus()
      }
      if (e.key === 'Escape') {
        qInput.value = ''
        runSearch()
      }
    })

    /* first frame */
    showChapter(cur)
    if (pos && pos.sec && cur >= 0) {
      const el = document.getElementById(pos.sec)
      const firstId = CHAPTERS[cur].headings[0]?.id
      if (el && arts[cur].contains(el) && pos.sec !== firstId) {
        resumeBtn.dataset.sec = pos.sec
        resumeBtn.textContent = `Resume · ${el.textContent.trim().slice(0, 40)}`
        resumeBtn.setAttribute(
          'aria-label',
          `Resume reading at ${el.textContent.trim()}`,
        )
        resumeBtn.hidden = false
      }
    }
  }

  function drill(deckKey) {
    if (!tabsApi) return
    tabsApi.show('recall')
    if (recallApi) recallApi.useDeck(deckKey)
    const bar = LN.$('.m-manual .ln-tabs')
    if (bar) bar.scrollIntoView({ block: 'start', behavior: smooth() })
  }

  /* ========================================================== RECALL panel */
  const PHASES = [
    {
      id: 'law',
      label: 'Law lines',
      min: 2,
      tip: 'Read only the bolded law lines of one module. Nothing else.',
    },
    {
      id: 'drill',
      label: 'Drill in CapCut',
      min: 8,
      tip: 'Do that module’s drill in CapCut, on real footage.',
    },
    {
      id: 'recall',
      label: 'Recall',
      min: 5,
      tip: 'Answer the cards without scrolling up. Wrong means read that one line again.',
    },
  ]
  const BLOCK_MS = PHASES.reduce((n, p) => n + p.min, 0) * 60000
  const mmss = ms => {
    const t = Math.max(0, Math.ceil(ms / 1000))
    return `${Math.floor(t / 60)}:${pad2(t % 60)}`
  }

  function blockTimer(onRecallPhase) {
    const R = 52
    const C = 2 * Math.PI * R
    const GAP = 3
    let elapsed = 0
    let startedAt = 0
    let running = false
    let interval = 0
    let lastPhase = -1
    let audio = null
    let chimeBus = null
    let chimeOn = true

    const ring = s('svg', {
      viewBox: '0 0 120 120',
      class: 'mn-ring',
      role: 'img',
      'aria-label': '15-minute block progress',
    })
    let acc = 0
    const segs = PHASES.map(p => {
      const len = (p.min / 15) * C
      const el = s('circle', {
        cx: 60,
        cy: 60,
        r: R,
        class: 'mn-ring-seg',
        'stroke-dasharray': `${Math.max(0, len - GAP)} ${C}`,
        'stroke-dashoffset': String(-acc),
      })
      acc += len
      return el
    })
    const prog = s('circle', {
      cx: 60,
      cy: 60,
      r: R,
      class: 'mn-ring-prog',
      'stroke-dasharray': `0 ${C}`,
    })
    ring.append(s('g', { transform: 'rotate(-90 60 60)' }, segs, prog))
    const phaseEl = h('div', { class: 'mn-ring-phase' }, PHASES[0].label)
    const leftEl = h('div', { class: 'mn-ring-left ln-num' }, '2:00')
    const totEl = h(
      'div',
      { class: 'mn-ring-tot ln-num' },
      'Block 0:00 / 15:00',
    )
    const tipEl = h('p', { class: 'mn-timer-tip' }, PHASES[0].tip)
    const legend = h(
      'ol',
      { class: 'mn-legend' },
      PHASES.map((p, i) =>
        h(
          'li',
          { dataset: { i: String(i) } },
          h('b', { class: 'ln-num' }, `${p.min}:00`),
          h('span', null, p.label),
        ),
      ),
    )
    const startBtn = ui.btn('Start the block', () =>
      running ? pause() : start(),
    )
    const skipBtn = ui.btn('Next phase', () => skip(), {
      kind: 'quiet',
      small: true,
    })
    const resetBtn = ui.btn('Reset', () => reset(), {
      kind: 'quiet',
      small: true,
    })
    const chime = ui.toggle({
      label:
        'Soft chime and buzz at each phase change (only after you tap Start)',
      checked: true,
      onChange: v => {
        chimeOn = v
        if (running) scheduleChimes()
      },
    })

    const now = () => elapsed + (running ? Date.now() - startedAt : 0)
    const phaseAt = t => {
      let a = 0
      for (let i = 0; i < PHASES.length; i++) {
        a += PHASES[i].min * 60000
        if (t < a) return { i, end: a }
      }
      return { i: PHASES.length, end: BLOCK_MS }
    }

    function tone(at, freq) {
      const o = audio.createOscillator()
      const g = audio.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(0.09, at + 0.04)
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6)
      o.connect(g).connect(chimeBus)
      o.start(at)
      o.stop(at + 1.7)
    }
    // Chimes are scheduled on the audio clock, so they still land on time
    // while the timer callbacks are throttled (CapCut in front).
    function scheduleChimes() {
      if (chimeBus) {
        try {
          chimeBus.disconnect()
        } catch (_e) {
          /* already gone */
        }
        chimeBus = null
      }
      if (!audio || !chimeOn || !running) return
      chimeBus = audio.createGain()
      chimeBus.connect(audio.destination)
      const t = now()
      let a = 0
      for (let i = 0; i < PHASES.length; i++) {
        a += PHASES[i].min * 60000
        if (a <= t) continue
        const at = audio.currentTime + (a - t) / 1000
        const last = i === PHASES.length - 1
        tone(at, last ? 523.25 : 659.25)
        tone(at + 0.32, last ? 392 : 783.99)
      }
    }
    function buzz() {
      if (!chimeOn) return
      try {
        if (navigator.vibrate) navigator.vibrate([90, 80, 90])
      } catch (_e) {
        /* no vibration */
      }
    }

    function paint() {
      const t = Math.min(now(), BLOCK_MS)
      const ph = phaseAt(t)
      prog.setAttribute('stroke-dasharray', `${(t / BLOCK_MS) * C} ${C}`)
      const done = ph.i >= PHASES.length
      phaseEl.textContent = done ? 'Block done' : PHASES[ph.i].label
      leftEl.textContent = done ? '15:00' : mmss(ph.end - t)
      totEl.textContent = `Block ${mmss(t)} / 15:00`
      tipEl.textContent = done
        ? 'Loop closed. Two modules a day, max: the next block waits for tomorrow.'
        : PHASES[ph.i].tip
      for (const li of legend.children)
        li.classList.toggle('on', Number(li.dataset.i) === ph.i)
      for (let i = 0; i < segs.length; i++)
        segs[i].classList.toggle('on', i === ph.i)
      if (running && ph.i !== lastPhase && lastPhase >= 0) {
        buzz()
        if (done) {
          LN.toast('Block done. Close the loop: score the cards.')
        } else {
          LN.toast(`${PHASES[ph.i].label}: ${PHASES[ph.i].min} min`)
          if (PHASES[ph.i].id === 'recall' && onRecallPhase) onRecallPhase()
        }
      }
      lastPhase = ph.i
      if (done && running) {
        elapsed = BLOCK_MS
        running = false
        clearInterval(interval)
        startBtn.textContent = 'Start a new block'
      }
    }
    function tickOn() {
      clearInterval(interval)
      if (running) interval = setInterval(paint, 250)
    }
    function start() {
      if (now() >= BLOCK_MS) elapsed = 0
      // The tap is the permission: only now may the page make a sound.
      try {
        const AC = window.AudioContext || window.webkitAudioContext
        if (AC && !audio) audio = new AC()
        if (audio && audio.state === 'suspended') audio.resume()
      } catch (_e) {
        audio = null
      }
      startedAt = Date.now()
      running = true
      lastPhase = phaseAt(now()).i
      startBtn.textContent = 'Pause'
      root.classList.add('running')
      scheduleChimes()
      tickOn()
      paint()
    }
    function pause() {
      elapsed = now()
      running = false
      startBtn.textContent = 'Resume'
      root.classList.remove('running')
      scheduleChimes()
      tickOn()
      paint()
    }
    function reset() {
      elapsed = 0
      running = false
      lastPhase = -1
      startBtn.textContent = 'Start the block'
      root.classList.remove('running')
      scheduleChimes()
      tickOn()
      paint()
    }
    function skip() {
      const t = now()
      const ph = phaseAt(t)
      if (ph.i >= PHASES.length) return
      elapsed += ph.end - t
      if (!running) lastPhase = ph.i
      scheduleChimes()
      paint()
    }
    LN.bus.on('route', id => {
      if (id === 'manual') tickOn()
      else clearInterval(interval)
      paint()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') paint()
    })

    const root = h(
      'div',
      { class: 'ln-card mn-timer' },
      h(
        'div',
        { class: 'mn-timer-head' },
        h('div', { class: 'ln-eyebrow' }, 'The 15-minute block'),
        h(
          'p',
          { class: 'ln-small ln-muted' },
          'One module per block. Phone face down, except for CapCut.',
        ),
      ),
      h(
        'div',
        { class: 'mn-ring-wrap' },
        ring,
        h('div', { class: 'mn-ring-c' }, phaseEl, leftEl, totEl),
      ),
      legend,
      tipEl,
      h('div', { class: 'ln-row mn-timer-acts' }, startBtn, skipBtn, resetBtn),
      chime.el,
      h(
        'p',
        { class: 'ln-small ln-faint' },
        'Flip Keep screen awake in the footer so the ring stays lit between phases.',
      ),
    )
    paint()
    return { el: root }
  }

  function renderRecall(panel) {
    let deckKey = LN.store.get('manual.deck', 'playbook')
    if (!DECKS.some(d => d.key === deckKey)) deckKey = 'playbook'
    let sess = null

    const deckSel = ui.select({
      id: 'mn-deck',
      label: 'Deck',
      options: DECKS.map(d => ({
        value: d.key,
        label: `${d.label} (${d.cards.length})`,
      })),
      value: deckKey,
      onChange: v => useDeck(v),
    })
    const dueEl = h('div', { class: 'mn-due', 'aria-live': 'polite' })
    const cardHost = h('div', { class: 'ln-card mn-card' })
    const schedHost = h('div', { class: 'mn-sched' })
    const timer = blockTimer(() => {
      cardHost.scrollIntoView({ block: 'start', behavior: smooth() })
    })

    function newSession(cards) {
      const deck = deckBy(deckKey)
      const list = cards || deck.cards
      sess = { deck, cards: list, i: 0, shown: false, got: [], missed: [] }
      renderCard()
    }
    function useDeck(key) {
      deckKey = deckBy(key).key
      deckSel.set(deckKey)
      LN.store.set('manual.deck', deckKey)
      newSession()
      renderDue()
    }

    function renderCard() {
      const { cards, i } = sess
      if (!cards.length) {
        cardHost.replaceChildren(ui.empty('This deck has no cards yet.'))
        return
      }
      if (i >= cards.length) return renderResult()
      const c = cards[i]
      const dots = h(
        'div',
        { class: 'mn-dots', 'aria-hidden': 'true' },
        cards.map((x, k) =>
          h('span', {
            class:
              k < i
                ? sess.got.includes(x)
                  ? 'got'
                  : 'miss'
                : k === i
                  ? 'now'
                  : '',
          }),
        ),
      )
      const ans = h(
        'div',
        { class: 'mn-card-a', hidden: !sess.shown },
        h('div', { class: 'ln-eyebrow' }, 'Answer'),
        h('p', null, c.a),
        c.note ? h('p', { class: 'ln-small ln-faint' }, c.note) : null,
      )
      const acts = sess.shown
        ? h(
            'div',
            { class: 'mn-card-acts two' },
            ui.btn('I got it', () => mark(true)),
            ui.btn('I missed it', () => mark(false), { kind: 'quiet' }),
          )
        : h(
            'div',
            { class: 'mn-card-acts' },
            ui.btn('Show answer', () => {
              sess.shown = true
              renderCard()
              const b = cardHost.querySelector('.mn-card-acts button')
              if (b) b.focus()
            }),
          )
      cardHost.replaceChildren(
        h(
          'div',
          { class: 'mn-card-top' },
          h(
            'span',
            { class: 'ln-eyebrow' },
            `Card ${i + 1} of ${cards.length}`,
          ),
          h('span', { class: 'mn-card-src' }, c.src),
        ),
        dots,
        h('p', { class: 'mn-card-q' }, c.q),
        ans,
        acts,
        h(
          'p',
          { class: 'mn-card-tally ln-num' },
          `Got ${sess.got.length} · Missed ${sess.missed.length}`,
        ),
      )
    }
    function mark(ok) {
      const c = sess.cards[sess.i]
      ;(ok ? sess.got : sess.missed).push(c)
      sess.i++
      sess.shown = false
      renderCard()
      const b = cardHost.querySelector('.mn-card-acts button')
      if (b) b.focus({ preventScroll: true })
    }
    function renderResult() {
      const total = sess.cards.length
      const got = sess.got.length
      const pct = Math.round((got / total) * 100)
      const pass = got / total >= 0.8
      const fullDeck = sess.cards === sess.deck.cards
      const st = fullDeck ? logSession(deckKey, got, total) : null
      const nd = st ? nextDue(st) : null
      cardHost.replaceChildren(
        h(
          'div',
          { class: 'ln-eyebrow' },
          fullDeck ? 'Session scored' : 'Missed-card pass',
        ),
        h(
          'div',
          { class: 'mn-score' },
          h('b', { class: 'ln-num' }, `${got} / ${total}`),
          h('span', { class: 'ln-num' }, `${pct}%`),
        ),
        pass
          ? ui.callout(
              'ok',
              nd
                ? `At or above 80%. Next recall: ${niceDay(nd.date)}, ${nd.label.toLowerCase()} (${relDay(nd.date)}).`
                : 'At or above 80%. The schedule for this deck is complete.',
              'Locked in',
            )
          : ui.callout(
              'warn',
              `Under 80%: rerun this block tomorrow${st ? ` (${niceDay(st.rerun)})` : ''}. Read each missed line once, nothing else.`,
              'Rerun this block tomorrow',
            ),
        sess.missed.length
          ? h(
              'div',
              { class: 'mn-missed' },
              h('div', { class: 'ln-eyebrow' }, 'Read these lines again'),
              ui.kv(sess.missed.map(c => [c.q, c.a])),
            )
          : null,
        h(
          'div',
          { class: 'ln-row' },
          sess.missed.length
            ? ui.btn('Run the missed cards', () =>
                newSession(sess.missed.slice()),
              )
            : null,
          ui.btn('Run the deck again', () => newSession(), {
            kind: sess.missed.length ? 'quiet' : '',
          }),
        ),
        fullDeck
          ? null
          : h(
              'p',
              { class: 'ln-small ln-faint' },
              'A missed-card pass does not change your score or your dates.',
            ),
      )
      renderDue()
    }

    function renderDue() {
      const r = loadRecall()
      const st = r.decks[deckKey]
      const nd = nextDue(st)
      const d = today()
      const timeline = st
        ? [
            ['First', st.first, true],
            ['Day 2', addDays(st.first, 2), !!st.d2],
            ['Day 7', addDays(st.first, 7), !!st.d7],
          ]
        : [
            ['First', d, false],
            ['Day 2', addDays(d, 2), false],
            ['Day 7', addDays(d, 7), false],
          ]
      dueEl.replaceChildren(
        h('div', { class: 'ln-eyebrow' }, 'Next recall due'),
        h(
          'p',
          { class: 'mn-due-big' },
          st
            ? nd
              ? niceDay(nd.date)
              : 'All done'
            : 'After your first session',
        ),
        h(
          'p',
          { class: 'mn-due-sub' },
          st
            ? nd
              ? `${nd.label} · ${relDay(nd.date)}`
              : 'Day 2 and day 7 are both done. Rerun when a score dips.'
            : `Score a first session today and this deck comes back ${niceDay(addDays(d, 2))} and ${niceDay(addDays(d, 7))}.`,
        ),
        h(
          'ol',
          { class: 'mn-tl' },
          timeline.map(([k, date, done]) =>
            h(
              'li',
              { class: done ? 'done' : nd && nd.date === date ? 'next' : '' },
              h('span', null, k),
              h('b', null, niceDay(date)),
            ),
          ),
        ),
      )
      renderSched(r)
    }

    function renderSched(r) {
      const keys = Object.keys(r.decks).filter(k =>
        DECKS.some(d => d.key === k),
      )
      const rows = keys.map(k => {
        const st = r.decks[k]
        const nd = nextDue(st)
        return [
          deckBy(k).label,
          niceDay(st.first),
          st.d2 ? `done ${niceDay(st.d2)}` : niceDay(addDays(st.first, 2)),
          st.d7 ? `done ${niceDay(st.d7)}` : niceDay(addDays(st.first, 7)),
          st.last ? `${st.last.got}/${st.last.total}` : '–',
          nd ? `${niceDay(nd.date)} (${relDay(nd.date)})` : 'complete',
        ]
      })
      schedHost.replaceChildren(
        rows.length
          ? ui.table(
              ['Deck', 'First', 'Day 2', 'Day 7', 'Last', 'Next due'],
              rows,
              {
                label: 'Recall schedule',
              },
            )
          : ui.empty(
              'No sessions yet. Each deck books its own day-2 and day-7 dates from its first scored session.',
            ),
        rows.length
          ? h(
              'div',
              { class: 'ln-row' },
              ui.btn(
                'Reset recall dates',
                () =>
                  LN.sheet({
                    title: 'Reset recall dates?',
                    body: 'This clears every deck’s first-session date, day-2 and day-7 marks and last scores on this phone.',
                    actions: [
                      { label: 'Keep them', kind: 'quiet' },
                      {
                        label: 'Reset',
                        kind: 'danger',
                        onClick: () => {
                          LN.store.del(RKEY)
                          renderDue()
                          LN.toast('Recall dates cleared')
                        },
                      },
                    ],
                  }),
                { kind: 'quiet', small: true },
              ),
            )
          : null,
      )
    }

    panel.append(
      h(
        'div',
        { class: 'mn-recall' },
        h(
          'div',
          { class: 'mn-recall-top' },
          h(
            'div',
            { class: 'mn-recall-intro' },
            h('h2', { class: 'ln-h2' }, 'Pull it out, don’t read it again'),
            h(
              'p',
              { class: 'mn-recall-lede' },
              'Answer out loud before you tap Show answer. Score yourself honestly: under 80% means rerun that block tomorrow. Each deck comes back on day 2 and day 7.',
            ),
            deckSel.el,
          ),
          dueEl,
        ),
        h('div', { class: 'mn-recall-grid' }, cardHost, timer.el),
        ui.section(
          {
            eyebrow: 'Spaced schedule',
            title: 'Every deck you have run',
          },
          schedHost,
          ui.callout(
            'rule',
            h(
              'ul',
              { class: 'mn-rules' },
              h(
                'li',
                null,
                'Two modules a day, max. Sleep is when the grade settles in.',
              ),
              h('li', null, 'Finish the block before you open anything else.'),
              h(
                'li',
                null,
                'Stand up, change rooms, or shoot the drill outside.',
              ),
              h('li', null, 'Run the deck again on day 2 and day 7.'),
            ),
            'The playbook’s rules',
          ),
        ),
      ),
    )
    newSession()
    renderDue()
    recallApi = { useDeck }
  }

  /* ========================================================== register */
  LN.register({
    id: 'manual',
    num: 9,
    title: 'Manual',
    short: 'Manual',
    kicker: 'REFERENCE',
    blurb:
      'Every chapter in one searchable reader, a Markdown export, and the playbook’s recall deck on a 15-minute timer.',
    lede: 'The whole production manual on the phone: search every chapter, jump to the section, download it as Markdown. The Recall tab runs the playbook’s study protocol: 2 minutes of law lines, 8 of CapCut drill, 5 of recall, then the same deck again on day 2 and day 7.',
    outputs: [
      'Production manual',
      'Search',
      'Recall deck',
      'Markdown download',
    ],
    mount(el) {
      tabsApi = ui.tabs(
        [
          { id: 'read', label: 'Read', render: renderRead },
          { id: 'recall', label: 'Recall', render: renderRecall },
        ],
        { key: 'manual' },
      )
      el.append(tabsApi.el)
    },
  })
})()
