/* Lunar Night OS: modules/forge.js, the Forge shell (07).
   Four tabs, each owned by its own file and mounted through window.LN:
     Fable 5.1 Studio  LN.fableStudio  (fable.js)
     Motion Forge      LN.forgeMotion  (forge-motion.js)
     Overlay Forge     LN.forgeVideo   (forge-video.js)
     Sound Forge       LN.forgeAudio   (forge-audio.js)
   The first visit lands on Motion Forge, so the first frame is a live preview. */
;(() => {
  const LN = window.LN
  const { h, ui } = LN

  const TABS = [
    { id: 'studio', label: 'Fable 5.1 Studio', api: 'fableStudio' },
    { id: 'motion', label: 'Motion Forge', api: 'forgeMotion' },
    { id: 'video', label: 'Overlay Forge', api: 'forgeVideo' },
    { id: 'audio', label: 'Sound Forge', api: 'forgeAudio' },
  ]

  const ready = tab => {
    const api = LN[tab.api]
    return api && typeof api.mount === 'function' ? api : null
  }

  function mountInto(api, tab, panel) {
    try {
      api.mount(panel)
    } catch (e) {
      console.error(`[LN] ${tab.label} failed to mount`, e)
      panel.append(
        h(
          'div',
          { class: 'ln-fail' },
          `${tab.label} failed to load: ${e && e.message}`,
        ),
      )
    }
  }

  function mountTab(tab, panel) {
    const api = ready(tab)
    if (api) {
      mountInto(api, tab, panel)
      return
    }
    // Sub-modules register while the page loads. Give a late one a moment
    // before calling it missing.
    const note = h(
      'p',
      { class: 'forge-note', role: 'status' },
      `Loading ${tab.label}…`,
    )
    panel.append(note)
    let tries = 0
    const retry = () => {
      const late = ready(tab)
      if (late) {
        note.remove()
        mountInto(late, tab, panel)
        return
      }
      tries += 1
      if (tries < 12) {
        setTimeout(retry, 250)
        return
      }
      note.textContent = `${tab.label} is unavailable in this copy of the OS. Reload the page; the other Forge tabs still work.`
    }
    setTimeout(retry, 250)
  }

  LN.register({
    id: 'forge',
    num: 7,
    title: 'Forge',
    short: 'Forge',
    kicker: 'FABLE 5.1 ASSETS',
    blurb:
      'Fable 5.1 designs titles, texture plates and sound as code; the phone renders the MP4 and WAV files you drop into CapCut.',
    lede: 'Fable 5.1 designs the asset as code or a scene; your phone renders the file. Motion titles, overlay plates, grain, light leaks and sound you can drop straight into CapCut.',
    outputs: [
      'Motion titles (MP4)',
      'Overlay plates (MP4)',
      'Sound pack (WAV)',
      'Fable 5.1 recipes',
    ],
    mount(el) {
      // First visit: open on a live preview. Motion Forge if it loaded,
      // otherwise Overlay Forge. After that, the tab the chef last used.
      if (LN.store.get('tabs.forge', null) == null) {
        const motion = ready(TABS[1]) || !ready(TABS[2])
        LN.store.set('tabs.forge', motion ? 'motion' : 'video')
      }
      const tabs = ui.tabs(
        TABS.map(tab => ({
          id: tab.id,
          label: tab.label,
          render: panel => mountTab(tab, panel),
        })),
        { key: 'forge' },
      )
      el.append(tabs.el)
    },
  })
})()
