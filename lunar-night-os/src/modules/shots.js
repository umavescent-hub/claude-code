/* Kubrick — Shot Bible: 64 shots for the Pixel 10 Pro XL by format, with
   capture settings, the hold, the move and the steps; send any shot to the
   shared shot list that The Cut and Fable read. */
;(() => {
  const LN = window.LN
  const ui = LN.ui
  const h = LN.h
  const CATS = [
    {
      value: 'rd',
      label: 'R&D Lab',
      blurb: 'Kitchen, plating, pours and sears.',
    },
    {
      value: 'review',
      label: 'Marketplace Review',
      blurb: 'Home-cook plates, verdicts, the bite.',
    },
    {
      value: 'doc',
      label: 'Road to Three Stars',
      blurb: 'Night exteriors, confessions, the walk.',
    },
  ]
  const K = (s, k) => (s[k] == null ? '' : String(s[k]))
  function settingsLine(s) {
    return [
      K(s, 'lens'),
      K(s, 'fps'),
      K(s, 'shutter'),
      `ISO ${K(s, 'iso')}`,
      `EV ${K(s, 'ev')}`,
      K(s, 'wb'),
      `OIS ${K(s, 'ois')}`,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  function shotMd(s) {
    const L = []
    L.push(`# ${s.name}`, '', s.logline, '')
    L.push(
      `- Lens ${s.lens} (${s.focal}) · ${s.fps} · ${s.shutter} · ISO ${s.iso} · EV ${s.ev} · WB ${s.wb} · OIS ${s.ois}`,
    )
    L.push(`- Hold: ${s.hold} · Move: ${s.vector} · Duration: ${s.duration}`)
    if (s.light) L.push(`- Light: ${s.light}`)
    if (s.audio) L.push(`- Audio: ${s.audio}`)
    L.push('', '## Steps')
    for (const [i, st] of (s.steps || []).entries()) L.push(`${i + 1}. ${st}`)
    if (s.post) L.push('', `Post: ${s.post}`)
    return `${L.join('\n')}\n`
  }
  function openShot(s) {
    const body = h(
      'div',
      { class: 'ln-stack shots-detail' },
      h('p', { class: 'ln-lede' }, s.logline),
      ui.kv([
        ['Lens', `${s.lens} · ${s.focal}`],
        ['Frame rate', s.fps],
        ['Shutter', s.shutter],
        ['ISO / EV', `${s.iso} / ${s.ev}`],
        ['White balance', s.wb],
        ['OIS', s.ois],
        ['Hold', s.hold],
        ['Move', s.vector],
        ['Duration', s.duration],
        ['Difficulty', K(s, 'difficulty') || '—'],
      ]),
      s.light ? ui.callout('tip', s.light, 'Light') : null,
      s.audio ? ui.callout('rule', s.audio, 'Audio') : null,
      ui.steps
        ? ui.steps(s.steps || [])
        : h('ol', null, ...(s.steps || []).map(t => h('li', null, t))),
      s.post ? ui.callout('ok', s.post, 'In CapCut') : null,
      s.story ? h('p', { class: 'ln-muted ln-small' }, s.story) : null,
    )
    LN.sheet({
      title: s.name,
      body,
      actions: [
        {
          label: 'Add to shot list',
          kind: 'primary',
          onClick: () => {
            LN.shotlist.add({
              id: s.id,
              name: s.name,
              cat: s.cat,
              duration: s.duration,
              lens: s.lens,
              hold: s.hold,
            })
            LN.toast(`Added “${s.name}” to the shot list`)
          },
        },
        { label: 'Copy', onClick: () => LN.copy(shotMd(s)) },
        {
          label: 'Save .md',
          onClick: () =>
            LN.save({
              filename: `${s.id}.md`,
              data: shotMd(s),
              mime: 'text/markdown',
            }),
        },
      ],
    })
  }
  function mount(el) {
    const all = LN.data.shots || []
    const state = { cat: LN.store.get('shots.cat', 'rd'), q: '' }
    const root = h('div', { class: 'm-shots ln-stack' })
    const list = h('div', { class: 'shots-list' })
    const count = h('div', { class: 'ln-muted ln-small' })
    const seg = ui.seg({
      options: CATS,
      value: state.cat,
      onChange: v => {
        state.cat = v
        LN.store.set('shots.cat', v)
        render()
      },
    })
    const search = ui.field({
      label: 'Find a shot',
      placeholder: 'overhead, pour, car pass, verdict…',
      onInput: v => {
        state.q = v.trim().toLowerCase()
        render()
      },
    })
    function render() {
      list.replaceChildren()
      const rows = all.filter(
        s =>
          s.cat === state.cat &&
          (!state.q ||
            `${s.name} ${s.logline} ${(s.tags || []).join(' ')} ${s.hold} ${s.vector}`
              .toLowerCase()
              .includes(state.q)),
      )
      const cat = CATS.find(c => c.value === state.cat)
      count.textContent = `${rows.length} of ${all.filter(s => s.cat === state.cat).length} · ${cat ? cat.blurb : ''}`
      if (!rows.length) {
        list.append(ui.empty('No shot matches. Try one word.'))
        return
      }
      for (const s of rows) {
        const card = h(
          'button',
          { type: 'button', class: 'shots-card', onClick: () => openShot(s) },
          h(
            'div',
            { class: 'shots-card-head' },
            h('b', null, s.name),
            ui.chip(s.duration),
          ),
          h('div', { class: 'shots-card-set ln-small' }, settingsLine(s)),
          h('div', { class: 'ln-muted ln-small' }, `${s.hold} · ${s.vector}`),
        )
        list.append(card)
      }
    }
    root.append(
      ui.callout(
        'tip',
        'Tap a shot for the exact Blackmagic / Pixel Camera settings, the hold and the steps. “Add to shot list” sends it to The Cut’s Edit Plan and Fable.',
        'Shot Bible',
      ),
      seg.el || seg,
      search.el || search,
      count,
      list,
      h(
        'div',
        { class: 'ln-row' },
        ui.btn('Save this format as .md', () =>
          LN.save({
            filename: `kubrick_shots_${state.cat}.md`,
            data: all
              .filter(s => s.cat === state.cat)
              .map(shotMd)
              .join('\n---\n\n'),
            mime: 'text/markdown',
          }),
        ),
      ),
    )
    el.append(root)
    render()
  }
  LN.register({
    id: 'shots',
    num: 2,
    title: 'Shot Bible',
    short: 'Shots',
    kicker: 'SHOT LIST',
    blurb:
      '64 shots across the three formats, each with Pixel settings, the hold and the steps.',
    lede: 'Every shot the house uses, written for the Pixel 10 Pro XL: lens, frame rate, shutter, ISO, white balance, stabilisation, the hold and the move. Pick a format, tap a shot, add it to the list.',
    outputs: [
      '64 shots by format',
      'Capture settings per shot',
      'Shot list for The Cut and Fable',
      'Markdown download',
    ],
    mount,
  })
})()
