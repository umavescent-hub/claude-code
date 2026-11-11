/* Kubrick: modules/rig.js, Rig (01). Pre-flight for the Pixel 10 Pro XL.
   Sections: 3D camera map, capture presets by format, pre-flight checklist,
   shutter and flicker calculator, white balance guide, holding the phone,
   "settle it on your phone" device facts, native audio.
   Shared state written here:
     preflight.v1   {checked:{id:true}, total:N}   + LN.bus.emit('preflight')
     devicefacts.v1 {key: true|false|null}          + LN.bus.emit('devicefacts', obj)
   Spec numbers come only from research/pixel-hw.md and pixel-app.md, each with
   its confidence label; anything unverified carries a verify callout. */
;(() => {
  const LN = window.LN
  const { h, s, ui } = LN

  const FACTS_KEY = 'devicefacts.v1'
  const PRE_KEY = 'preflight.v1'

  /* ================================================================ shared */
  const readFacts = () => {
    const f = LN.store.get(FACTS_KEY, {})
    return f && typeof f === 'object' ? f : {}
  }
  const watchers = new Set()
  /** Register fn(facts) to run now and on every 'devicefacts' event. */
  function watchFacts(fn, el) {
    fn.el = el || null
    watchers.add(fn)
    fn(readFacts())
    return fn
  }
  LN.bus.on('devicefacts', () => {
    const f = readFacts()
    for (const fn of Array.from(watchers)) {
      if (fn.el && !fn.el.isConnected) {
        watchers.delete(fn)
        continue
      }
      fn(f)
    }
  })

  /** A one-line status that follows a device fact. text: {yes, no, none} */
  function factLine(key, text, tag = 'p') {
    const el = h(tag, { class: 'rig-factline' })
    watchFacts(f => {
      const v = f[key]
      const state = v === true ? 'yes' : v === false ? 'no' : 'none'
      el.dataset.state = state
      const lead = {
        yes: 'Your phone: yes. ',
        no: 'Your phone: no. ',
        none: 'Not settled yet. ',
      }[state]
      el.replaceChildren(h('b', null, lead), text[state])
    }, el)
    return el
  }

  const CONF_KIND = {
    confirmed: 'sage',
    likely: 'amber',
    unverified: 'gold',
    contradicted: 'crimson',
  }
  const confChip = c => ui.chip(c, CONF_KIND[c] || '')

  /* The exact 3D phone from modules/rig-phone.js (LN.rigPhone), when it is
     loaded. Its API is owned by another file, so every call is feature-
     detected and guarded; the CSS phone below is the fallback. */
  let phoneApi = null
  const RIG_PART = {
    uw: 'ultrawide',
    main: 'wide',
    tele: 'tele',
    ldaf: 'ldaf',
    flicker: 'flicker',
    flash: 'flash',
    mics: 'micRear',
  }
  function callPhone(names, ...args) {
    if (!phoneApi) return false
    for (const name of [].concat(names)) {
      if (typeof phoneApi[name] !== 'function') continue
      try {
        phoneApi[name](...args)
      } catch (_e) {
        /* optional hook on another agent's module */
      }
      return true
    }
    return false
  }

  const scrollToEl = el =>
    el.scrollIntoView({
      behavior: LN.reducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })

  /* ================================================================ 1. camera map data */
  // Positions are % of the back face (portrait, camera bar at the top).
  // Lens order is contradicted in research; the map follows the leak layout
  // (ultrawide left, 5x beside the flash) and says so in a verify callout.
  const PARTS = [
    {
      id: 'uw',
      tag: '.5x',
      name: '0.5x ultrawide',
      title: '0.5x ultrawide and Macro Focus',
      kind: 'lens',
      at: [15.4, 11.86],
      specs: [
        ['Sensor', '48 MP Quad PD, with autofocus', 'confirmed'],
        ['Aperture', 'ƒ/1.7', 'confirmed'],
        ['Field of view', '123° diagonal', 'confirmed'],
        [
          'Focal length',
          '≈12 mm (GSMArena) vs 13 mm (DXOMARK) equivalent',
          'contradicted',
        ],
        ['Sensor size', '1/2.51" vs 1/2.55" across listings', 'contradicted'],
        [
          'Stabilization',
          'No OIS. Google lists OIS on the wide and tele only',
          'likely',
        ],
        [
          'Macro Focus',
          'Focuses to about 2 cm; switches on at about 3–4 cm from the subject',
          'likely',
        ],
        ['Video', 'Up to 4K60 on the Pro', 'confirmed'],
      ],
      food: 'Texture: crust, crumb, blistered chile skin, salt on fat. Get within 3–4 cm and wait for the Macro flower. It is also the only lens wide enough for an overhead of a whole station in a tight kitchen.',
      night:
        'Never on a night reel (runbook). It bends the building and has no OIS, so it shows every sway.',
      verify:
        'Macro Focus Video is a listed Pro feature, but the control moved in 2025. In Video, look for the flower icon at the top right of the viewfinder; older builds keep it in Settings › More settings › Macro Focus. Note whether it offers Auto, On and Off.',
      fact: [
        'pixel_auto_macro_toggle',
        {
          yes: 'Set Macro Focus to Off for plating so the lens never jumps mid-take; On for texture.',
          no: 'Macro can cut in on its own near a plate. Stay back past about 4 cm, or shoot that plate on 1x.',
          none: 'Check whether Macro Focus can be set to Off (section 7).',
        },
      ],
    },
    {
      id: 'main',
      tag: '1x',
      name: '1x main',
      title: '1x main, 50 MP',
      kind: 'lens',
      at: [32.8, 11.86],
      specs: [
        ['Sensor', '50 MP Octa PD', 'confirmed'],
        ['Aperture', 'ƒ/1.68', 'confirmed'],
        ['Sensor size', '1/1.3"', 'confirmed'],
        ['Field of view', '82° diagonal', 'confirmed'],
        ['Focal length', '≈24–25 mm equivalent', 'confirmed'],
        ['Stabilization', 'OIS + EIS', 'confirmed'],
        ['2x', 'Centre crop of this sensor, "optical quality"', 'likely'],
        ['Sensor model', 'Samsung ISOCELL GNV, 1.2 µm pixels', 'likely'],
        [
          '12-bit',
          '12-bit 4K only through third-party apps such as Blackmagic Camera or MotionCam',
          'likely',
        ],
        ['Minimum focus', 'No published figure', 'unverified'],
      ],
      food: 'The default for the plate, the pass and the monologue. Biggest sensor and brightest aperture, so the cleanest shadows under a dim pass.',
      night:
        'The night-reel lens: 1x, or 2x for a tighter sign. Google’s own troubleshooting says 1x does best in low light.',
      verify:
        'Minimum focus is not published. In 1x with focus peaking on, slide toward a plate until the outline stops sharpening, and write that distance in your shot bible.',
    },
    {
      id: 'tele',
      tag: '5x',
      name: '5x periscope',
      title: '5x periscope telephoto',
      kind: 'lens',
      at: [50.1, 11.86],
      specs: [
        ['Sensor', '48 MP Quad PD', 'confirmed'],
        ['Aperture', 'ƒ/2.8', 'confirmed'],
        ['Optics', 'Folded periscope', 'confirmed'],
        ['Field of view', '22° diagonal', 'confirmed'],
        [
          'Focal length',
          '≈110–113 mm equivalent; one lab says 128 mm',
          'contradicted',
        ],
        ['Stabilization', 'OIS', 'confirmed'],
        [
          'Close focus',
          '≈30 cm with manual lens and manual focus. In auto it hands off to a crop of the main camera at about 57 cm',
          'likely',
        ],
        ['10x', 'Centre crop of this sensor', 'likely'],
        [
          'Video zoom',
          'Up to 20x. The 100x Pro Zoom is for photos only',
          'confirmed',
        ],
      ],
      food: 'Compression from across the pass: stacked plates, steam against a dark wall, hands at work, and you out of the cooks’ way. Lock the lens and focus by hand for tele-macro at 30 cm.',
      night:
        'ƒ/2.8 is dim. Skip it at night unless the sign is bright; in low light the phone may quietly use a crop of the main camera instead.',
      warn: [
        'Telephoto video stutter on Pixel 10 (reported Nov 2025; whether it is fixed is disputed). If pans judder, turn off ',
        ui.path('Settings', 'More settings', 'Video stabilization'),
        '. Tele OIS keeps working.',
      ],
      verify:
        'Manual lens selection is confirmed for photos only. Open Settings (bottom left) › Pro › Lens Selection › Manual, then swipe to Video and see whether the UW / W / T buttons stay.',
      fact: [
        'pixel_lens_lock',
        {
          yes: 'Lock T in Video so the 5x never swaps to a crop mid-take.',
          no: 'Video may swap lenses on its own. Stay past about 57 cm in good light, or use the lens dial in Blackmagic Camera.',
          none: 'Check whether Manual lens selection holds in Video (section 7).',
        },
      ],
    },
    {
      id: 'ldaf',
      tag: 'LDAF',
      name: 'LDAF',
      title: 'Laser autofocus (LDAF)',
      kind: 'sensor',
      at: [85.6, 7.9],
      specs: [
        [
          'Type',
          'Multi-zone LDAF (laser detect autofocus) sensor',
          'confirmed',
        ],
        ['Safety', 'Class 1 laser product', 'confirmed'],
        ['Position', 'Near the LED flash, right end of the bar', 'likely'],
        ['Range', 'Not published', 'unverified'],
      ],
      food: 'Laser autofocus measures distance instead of reading contrast (that is how the class works; Google does not describe its own). That helps focus land on a white plate, steel or a glossy sauce. Keep fingers and the side towel off the right end of the bar.',
      night:
        'Autofocus still hunts in the dark. Tap the lit wall, lock focus by hand and let peaking confirm it (runbook step 5).',
      verify:
        'Google’s diagram puts the LDAF near the flash, but the exact window is not confirmed. This map is schematic on the right end of the bar.',
    },
    {
      id: 'flicker',
      tag: 'Flicker',
      name: 'Spectral / flicker sensor',
      title: 'Spectral and flicker sensor',
      kind: 'sensor',
      at: [67.8, 15.9],
      specs: [
        ['Present', 'Spectral and flicker sensor on the rear', 'confirmed'],
        [
          'What it does',
          'Not documented by Google. Sensors of this class read 50/60 Hz mains flicker and LED PWM up to about 2 kHz, plus the colour of the light',
          'unverified',
        ],
        [
          'Anti-flicker control',
          'No user setting found in Pixel Camera',
          'unverified',
        ],
        ['Video frame rates', '24 / 30 / 60 fps; no 25 or 50', 'confirmed'],
      ],
      food: 'It can steer auto exposure and auto white balance under the pass LEDs. The moment you fix a shutter by hand it cannot help you; use the flicker calculator below.',
      night:
        'Neon and LED signs flicker too. 360° at 24 fps (1/24 s) is flicker-safe on 60 Hz mains; 1/48 is not.',
      verify:
        'Shoot 5 s at 24 fps under the kitchen LEDs, once at 1/48 and once at 1/60, then look for slow rolling bands on a white wall or plate.',
    },
    {
      id: 'flash',
      tag: 'Flash',
      name: 'Flash',
      title: 'LED flash and temperature sensor',
      kind: 'sensor',
      at: [67.8, 7.9],
      specs: [
        ['Type', 'LED flash', 'confirmed'],
        ['LED count', 'Single vs dual-tone two-LED', 'contradicted'],
        [
          'Beside it',
          'Temperature sensor (Pro and Pro XL only), outside the camera glass',
          'confirmed',
        ],
      ],
      food: 'Leave it off. A point light on the lens axis flattens food and puts a hot spot on every glaze. Move the plate to the window or under the pass light.',
      night:
        'Off. It lights the nearest wall and lifts the black floor the whole look depends on.',
      verify:
        'Single or dual LED is disputed. Look at the window on the bar; the advice does not change either way.',
    },
    {
      id: 'mics',
      tag: 'Mics',
      name: 'Microphones',
      title: 'Three microphones',
      kind: 'sensor',
      at: [85.6, 15.9],
      specs: [
        ['Count', '3 microphones', 'confirmed'],
        [
          'Top edge',
          'Hole on the top edge. Camera video records from it',
          'confirmed',
        ],
        [
          'Bottom edge',
          'Left of the USB-C port on the Pro XL, swapped from the 9 Pro XL',
          'confirmed',
        ],
        ['Rear', 'Beside the cameras, near the LDAF and flash', 'likely'],
        [
          'Features',
          'Stereo, Speech enhancement, wind noise reduction, Audio zoom',
          'confirmed',
        ],
      ],
      food: 'For sizzle, point the back of the phone at the pan and keep your hands off both short edges. See Native audio below.',
      night:
        'The night sound at 100 is a real choice (runbook). Braced dead-still, the mics hear cars and wind, not your hands.',
      warn: 'Landscape in your right hand covers the bottom mic: muffled, uneven sound and gain spikes. Turn the phone 180° so the USB-C port faces left. ("Left" is the outlets’ wording, presumably seen from the screen side.)',
    },
  ]

  const BODY = [
    ['Size', '162.8 × 76.6 × 8.5 mm'],
    ['Weight', '232 g'],
    ['Back', 'Gorilla Glass Victus 2, silky matte; polished aluminium frame'],
    ['Sealing', 'IP68'],
    ['Display', '6.8", 1–120 Hz, up to 3,300 nits peak'],
  ]

  /* ================================================================ 2. formats */
  // Night Reel: the runbook. Marketplace: the God Mode guide (step 2) and the
  // playbook. Kitchen: the Jade Shoot Kit (KITCHEN 30 / POUR 60) beside the
  // brief's 4K24 narrative; where they disagree both are shown as modes.
  // Documentary: starting points, labelled as such.
  const FORMATS = [
    {
      id: 'night',
      label: 'Night Reel',
      modes: [
        {
          id: 'violet',
          label: 'Violet · 3200K',
          src: 'LunarNight v2 runbook (canon)',
          fps: 24,
          fpsLabel: '24 fps',
          angle: 360,
          why: 'About 70% of the look is made here: cold WB turns the sky violet, underexposure drops the walls to black, and 360° streaks the cars.',
          quick: [
            ['Shoot', '4K · 24 fps · HEVC Max · Rec.709, HDR off'],
            [
              'Light',
              '360° (1/24 s) · ISO 400, never past 1600 · −1.5 to −2 stops',
            ],
            ['Colour', '3200K, tint 0 · LunarNight_v2_Violet on the monitor'],
            [
              'Hold',
              'Braced dead-still: car roof, post, wall or the Osmo as a stand',
            ],
          ],
          hud: ['24', '360°', '400', '3200K', 'MF', '1x'],
          g: {
            iso: '400 (under 1600)',
            wb: '3200K · tint 0',
            ev: '−1.5 to −2, by ISO',
            lens: '1x (2x crop)',
            stab: 'BM off · Pixel Standard',
            hdr: 'OFF · Rec.709',
            codec: 'HEVC · Max',
          },
          bm: {
            stab: [
              'OFF',
              'You are braced; stabilization only crops and wobbles.',
            ],
            res: '4K (3840 × 2160)',
            iso: [
              '400 to start; raise only until zebras sit inside the brightest bulb. Under 1600',
              'Expose for the lights with ISO alone (runbook step 3).',
            ],
            wb: ['Manual 3200K, tint 0', 'Cold WB turns the dusk sky violet.'],
            lens: [
              '1x (2x crop for a tighter sign). Never 0.5x',
              'The ultrawide bends the building.',
            ],
            shutter: '360°, or 1/24 if it shows speed',
            lut: [
              'LunarNight_v2_Violet.cube, Display LUT ON',
              'The LUT preview is the review.',
            ],
            rec: [
              'ON when you edit in CapCut (LunarNight_v2_Soft.cube for a lighter bake)',
              'CapCut mobile likely cannot load a .cube, so the look rides in the clip.',
            ],
          },
          px: {
            res: '4K',
            stab: ['Standard (or Locked)', 'You are braced anyway.'],
            off: 'Video Boost OFF · Night Sight video OFF',
            offWhy:
              'Both brighten the night and turn your blacks grey (runbook).',
            wb: '3200K (drag toward blue)',
            shutter: 'The slowest offered: 1/24 or 1/30',
            iso: '400 to start',
            ev: '−1.5 to −2, if your build has no shutter or ISO',
            shadows: 'All the way down',
            focus: 'Manual; drag until peaking outlines the building',
          },
        },
        {
          id: 'blue',
          label: 'Blue · 2800K',
          base: 'violet',
          why: 'The small-town variant: the same capture 400K colder, so the sky lands deep blue instead of violet.',
          quick: [
            ['Shoot', '4K · 24 fps · HEVC Max · Rec.709, HDR off'],
            [
              'Light',
              '360° (1/24 s) · ISO 400, never past 1600 · −1.5 to −2 stops',
            ],
            ['Colour', '2800K, tint 0 · LunarNight_v2_Blue on the monitor'],
            [
              'Hold',
              'Braced dead-still: car roof, post, wall or the Osmo as a stand',
            ],
          ],
          hud: ['24', '360°', '400', '2800K', 'MF', '1x'],
          g: { wb: '2800K · tint 0' },
          bm: {
            wb: ['Manual 2800K, tint 0', 'Colder WB: deep-blue sky.'],
            lut: [
              'LunarNight_v2_Blue.cube, Display LUT ON',
              'The LUT preview is the review.',
            ],
          },
          px: { wb: '2800K (drag toward blue)' },
        },
      ],
    },
    {
      id: 'market',
      label: 'Marketplace Review',
      modes: [
        {
          id: 'm30',
          label: '30 fps',
          src: 'God Mode guide step 2 and the playbook. Kelvin and EV are starting points',
          fps: 30,
          fpsLabel: '30 fps',
          angle: 180,
          why: 'Reviews live on the bite and the verdict. 30 fps matches the 1080p30 export, and Blackmagic holds the shutter and white balance steady between cuts.',
          quick: [
            ['Shoot', 'Blackmagic · 4K · 30 fps · HEVC · Rec.709, HDR off'],
            ['Light', '180° (1/60 s) · the lowest ISO that still looks bright'],
            ['Colour', 'WB locked to the light · peaking on'],
            [
              'Hold',
              'Handheld, loose and quick. Wipe the lens before every shoot',
            ],
          ],
          hud: ['30', '180°', '100', '5600K', 'MF', '1x'],
          g: {
            iso: 'Lowest that looks bright',
            wb: '5600K window · 4000K LED',
            ev: '−0.3',
            lens: '1x · 0.5x macro · 5x',
            stab: 'BM on · Pixel Standard',
            hdr: 'OFF · Rec.709',
            codec: 'HEVC',
          },
          bm: {
            stab: [
              'ON (handheld)',
              'Takes the edge off a walking pickup shot.',
            ],
            res: '4K (3840 × 2160); 1080p for a quick same-day clip',
            iso: [
              'The lowest that still looks bright',
              'Clean shadows on a dark plate (God Mode step 2).',
            ],
            wb: [
              'Locked: 5600K by a window, 4000K under LED',
              'Batter and glaze stay one colour across every cut.',
            ],
            lens: [
              '1x; 0.5x for the macro shot; 5x from 6 ft',
              'Per the 8-shot list.',
            ],
            shutter: '180° (1/60 s)',
            lut: ['Off', 'Colour happens in CapCut: filter 20–40 + Adjust.'],
            rec: ['OFF', 'Keep the file neutral for the CapCut filter.'],
          },
          px: {
            res: '4K',
            stab: ['Standard', 'Handheld default.'],
            off: 'Video Boost OFF',
            offWhy: 'Cloud processing can take hours.',
            wb: 'Match the light: 5600K window, 4000K LED',
            shutter: '1/60 if your build offers it',
            iso: 'The lowest that holds it',
            ev: '−0.3, so the glaze keeps its detail',
            shadows: 'Leave at 0',
            focus: 'Tap the plate',
          },
        },
        {
          id: 'm60',
          label: '60 fps slow-mo pull',
          base: 'm30',
          fps: 60,
          fpsLabel: '60 fps',
          why: 'Only for the slow-mo pull: a cheese pull, a pour or a crack. Speed never goes below 0.5x without a 60 fps source (playbook).',
          quick: [
            ['Shoot', 'Blackmagic · 4K · 60 fps · HEVC · Rec.709, HDR off'],
            [
              'Light',
              '180° (1/120 s) · the lowest ISO that still looks bright',
            ],
            ['Colour', 'WB locked to the light · peaking on'],
            ['Hold', 'Locked on the pull; 2 s'],
          ],
          hud: ['60', '180°', '200', '5600K', 'MF', '1x'],
          g: { iso: 'About 200; raise for 1/120' },
          bm: { shutter: '180° (1/120 s)' },
          px: { shutter: '1/120 if your build offers it' },
        },
      ],
    },
    {
      id: 'kitchen',
      label: 'Kitchen & R&D',
      modes: [
        {
          id: 'k30',
          label: 'KITCHEN 30 · kit',
          src: 'Jade Shoot Kit, Blackmagic preset KITCHEN 30 (fish-and-chips kitchen)',
          fps: 30,
          fpsLabel: '30 fps (not 29.97)',
          angle: 180,
          why: 'Smooth basket shakes, a 30 fps export with no conforming, and 1/60 covers exactly two 120 Hz LED pulses, so steel and tile never band.',
          quick: [
            [
              'Shoot',
              'SDR / Rec.709 (HDR off) · 4K · H.265 Max · WB locked on the white plate',
            ],
            [
              'Light',
              '1/60 shutter, flicker-free at 60 Hz · ISO 100, ceiling 400 (800 in a dim room)',
            ],
            [
              'Colour',
              '4000K LED · 5600K window · 3200K tungsten. Display LUT off',
            ],
            [
              'Hold',
              'Handheld: Claw & Sternum Lock, Ninja Walk, Counter Brace',
            ],
          ],
          hud: ['30', '1/60', '100', '4000K', 'MF', '1x'],
          g: {
            iso: '100 (ceiling 400; 800 dim)',
            wb: '4000K LED · 5600K window',
            ev: '−0.3 · −0.7 backlit',
            lens: '1x · 5x hero',
            stab: 'BM Standard · Pixel Standard',
            hdr: 'OFF · Rec.709',
            codec: 'H.265 · Max',
          },
          bm: {
            stab: [
              'Standard on 0.5x / 1x · Optical (or OFF) on 5x or a mount',
              'Avoids the 5x EIS stutter and the extra crop on a mount.',
            ],
            res: '4K UHD (3840 × 2160)',
            iso: [
              '100 on a lit line · 400–800 in a dim room',
              'Past 800, noise shows first in dark fryer oil. Move to the window instead.',
            ],
            wb: [
              'AWB on the white plate, then lock · or 4000K LED / 5600K window / 3200K tungsten',
              'One locked value keeps the batter the same gold. Tint about +10 if the plate looks green.',
            ],
            lens: [
              '1x main; 5x only for hero plates across the pass',
              'The biggest, cleanest sensor.',
            ],
            shutter: '1/60 (180°). Shutter Measurement = Shutter Speed',
            lut: [
              'Display LUT OFF (or a soft look for preview only)',
              'A baked look cannot be undone. Keep the file neutral and grade in CapCut.',
            ],
            rec: ['OFF', 'The kit grades from a clean file.'],
          },
          px: {
            res: '4K',
            stab: [
              'Standard',
              'Best for handheld plating and walking the line.',
            ],
            off: 'Video Boost OFF · Optimize FPS OFF',
            offWhy:
              'Boost is a cloud wait; auto 30/60 switching stutters ramps and cuts.',
            wb: '4000K LED · 5600K window · 3200K tungsten',
            shutter: 'Assume photo-only unless the Pro panel shows it in Video',
            iso: '—',
            ev: '−0.3 (one notch down) · −0.7 backlit by the window',
            shadows: 'Leave at 0',
            focus: 'Touch and hold the plate',
          },
        },
        {
          id: 'k60',
          label: '4K60 pours & sears',
          base: 'k30',
          fps: 60,
          fpsLabel: '60 fps (brief) · or the kit’s 30 project + Off Speed 60',
          src: 'The brief’s 4K60 for pours and sears; the Jade Shoot Kit’s Blackmagic preset POUR 60 is the same shot as Off Speed 60 on a 30 fps project',
          why: '60 fps gives CapCut a clean half-speed pour without Smooth slow-mo. The kit’s Off Speed 60 plays back slow on a 30 fps timeline with no conforming, but off-speed clips may record no audio, so grab the sizzle at normal speed too.',
          quick: [
            [
              'Shoot',
              '4K · 60 fps · HEVC Max · HDR off (kit: KITCHEN 30 + Off Speed 60; 120 at 1080p for pours)',
            ],
            [
              'Light',
              '1/120 (180° at 60), flicker-free at 60 Hz · ISO up a stop',
            ],
            ['Colour', 'Same locked WB as the rest of the scene'],
            ['Hold', 'Counter Brace or Towel Slider on steel'],
          ],
          hud: ['60', '1/120', '200', '4000K', 'MF', '1x'],
          g: { iso: 'About 200; 1/120 costs a stop' },
          bm: {
            shutter: '1/120 (180° at 60)',
          },
          px: { shutter: '1/120 if your build offers it' },
        },
        {
          id: 'k24',
          label: '4K24 narrative · brief',
          base: 'k30',
          fps: 24,
          exp: 1 / 60,
          fpsLabel: '24 fps',
          src: 'The brief. The kit says skip 24 for fast basket motion; use this for slow story beats',
          why: '24 reads as cinema for the story of a dish. 180° is 1/48, but under 60 Hz LEDs take 1/60 (144°): 1/48 can roll bands.',
          quick: [
            [
              'Shoot',
              '4K · 24 fps · HEVC Max · 10-bit HDR off when grading with LUTs',
            ],
            [
              'Light',
              '1/60 under LEDs (1/48 elsewhere) · ISO 50–400 · EV −0.3 to −0.7',
            ],
            ['Colour', '3800–4200K under LED · 3200K under tungsten'],
            ['Hold', 'Slow moves only: Towel Slider, Counter Brace'],
          ],
          hud: ['24', '1/60', '200', '4000K', 'MF', '1x'],
          g: {
            iso: '50–400',
            wb: '3800–4200K LED · 3200K tungsten',
            ev: '−0.3 to −0.7',
            hdr: 'OFF when grading with LUTs',
          },
          bm: {
            iso: [
              '50–400 (the lowest your build allows)',
              'The brief’s range.',
            ],
            wb: [
              '3800–4200K under LED · 3200K under tungsten',
              'The brief’s ranges.',
            ],
            shutter: '1/60 under LEDs (144°); 180° (1/48) elsewhere',
            lut: [
              'LunarNight_v2_Kitchen.cube, Display LUT ON',
              'Food under LED: violet shadows, green-cyan pulled, warm food kept.',
            ],
            rec: [
              'ON for CapCut; OFF to grade from clean',
              'Your call per project.',
            ],
          },
          px: { ev: '−0.3 to −0.7' },
        },
      ],
    },
    {
      id: 'doc',
      label: 'Documentary monologue',
      modes: [
        {
          id: 'mono',
          label: 'Monologue',
          src: 'Starting points built from the brief and the kit; no canon capture preset exists for this format',
          fps: 24,
          exp: 1 / 60,
          fpsLabel: '24 fps (30 is fine)',
          angle: 180,
          why: 'Voice-first. A still frame and honest skin let the words carry. Speech enhancement on, or your DJI mic.',
          quick: [
            ['Shoot', '4K · 24 fps · HEVC · Rec.709, HDR off'],
            [
              'Light',
              '1/60 under LEDs (1/48 elsewhere) · ISO 50–400 · EV −0.3',
            ],
            ['Colour', 'Locked to the room: 3200K lamp, 5600K window'],
            ['Hold', 'On a mount or braced at chest-to-eye height, 1x'],
          ],
          hud: ['24', '1/60', '200', '3200K', 'MF', '1x'],
          g: {
            iso: '50–400',
            wb: '3200K lamp · 5600K window',
            ev: '−0.3',
            lens: '1x, never 0.5x',
            stab: 'BM Optical/off · Pixel Standard',
            hdr: 'OFF · Rec.709',
            codec: 'HEVC',
          },
          bm: {
            stab: [
              'Optical or OFF (on a mount)',
              'No extra crop on a still frame.',
            ],
            res: '4K (3840 × 2160)',
            iso: ['50–400', 'Clean skin in the shadows.'],
            wb: [
              'Match the room: 3200K lamp / 5600K window',
              'Skin stays honest across takes.',
            ],
            lens: ['1x. Never 0.5x on a face', 'The ultrawide bends faces.'],
            shutter: '1/60 under LEDs; 180° (1/48) elsewhere',
            lut: [
              'Off',
              'Dreamcore for memory and VHS 4:3 for confessions come in the grade.',
            ],
            rec: ['OFF', 'Grade later.'],
          },
          px: {
            res: '4K',
            stab: [
              'Standard (on a mount)',
              'Locked is a crop meant for distant zoomed subjects (kit).',
            ],
            off: 'Video Boost OFF',
            offWhy: 'No cloud wait on a talking take.',
            wb: 'Match the room',
            shutter: '1/60 if your build offers it',
            iso: '50–400',
            ev: '−0.3, so skin highlights hold',
            shadows: 'Leave at 0',
            focus: 'Tap your face, then lock',
          },
        },
      ],
    },
  ]
  // Fill derived modes from their base.
  for (const f of FORMATS) {
    for (const m of f.modes) {
      if (!m.base) continue
      const b = f.modes.find(x => x.id === m.base)
      for (const k of Object.keys(b)) {
        if (k === 'bm' || k === 'px' || k === 'g')
          m[k] = { ...b[k], ...(m[k] || {}) }
        else if (m[k] === undefined) m[k] = b[k]
      }
    }
  }
  /* ================================================================ flicker maths */
  /** Flicker check for a shutter. Light pulses at 2 × mains Hz. */
  function flicker(fps, mains, angle) {
    const exp = angle / (360 * fps)
    const pulse = 2 * mains
    const cycles = exp * pulse
    const near = Math.round(cycles)
    const safe = near >= 1 && Math.abs(cycles - near) < 0.01
    const alts = []
    for (let k = 1; k / pulse <= 1 / fps + 1e-9; k++) {
      const t = k / pulse
      const den = pulse / k
      const label = Number.isInteger(den)
        ? `1/${den}`
        : `${k}/${pulse} (≈1/${Math.round(den)})`
      alts.push({ t, label, angle: Math.round(360 * fps * t), k })
    }
    let best = null
    for (const a of alts)
      if (!best || Math.abs(a.angle - angle) < Math.abs(best.angle - angle))
        best = a
    return { exp, pulse, cycles, safe, alts, best }
  }
  const fraction = (fps, angle) => {
    const d = (fps * 360) / angle
    return Number.isInteger(d) ? `1/${d}` : `1/${d.toFixed(1)}`
  }

  /* ================================================================ 3. pre-flight */
  const PREFLIGHT = [
    {
      group: 'Clean',
      items: [
        {
          id: 'lens_wipe',
          t: 'Wipe all three lenses and the bar',
          d: 'Microfiber, small circles from the centre outward. Kitchen air leaves a film that turns every highlight into haze.',
        },
        {
          id: 'screen_wipe',
          t: 'Wipe the screen',
          d: 'You judge focus and zebras on it. Grease reads as soft focus.',
        },
      ],
    },
    {
      group: 'Quiet',
      items: [
        {
          id: 'dnd',
          t: 'Do Not Disturb on',
          d: 'A buzz mid-take shakes the stabilizer and ruins a held frame.',
          path: ['Swipe down twice', 'Do Not Disturb'],
        },
        {
          id: 'airplane',
          t: 'Airplane mode on (night exteriors)',
          d: 'No calls, no vibration. Video Boost and Photos backup wait until you are back online.',
          path: ['Swipe down twice', 'Airplane mode'],
        },
      ],
    },
    {
      group: 'Storage',
      items: [
        {
          id: 'space',
          t: '25 GB free or more',
          d: 'One test measured about 550 MB per minute of 4K60 (AVC) and 440 MB (AV1). 25 GB holds roughly 45 minutes of 4K60.',
          path: ['Settings', 'Storage'],
        },
      ],
    },
    {
      group: 'Thermal',
      items: [
        {
          id: 'case_off',
          t: 'Case off on a hot line',
          d: 'Google publishes no heat limits. One 10-minute 4K60 test reached 37.1 °C with no shutdown, but not beside a flat-top. Let the glass breathe.',
        },
      ],
    },
    {
      group: 'Display',
      items: [
        {
          id: 'adaptive_off',
          t: 'Adaptive brightness off',
          d: 'Otherwise the screen dims and brightens with the room and you misread exposure.',
          path: ['Settings', 'Display', 'Adaptive brightness'],
        },
        {
          id: 'bright75',
          t: 'Brightness locked near 75%',
          d: 'The same screen every night, so dark looks dark. Zebras still have the last word.',
        },
      ],
    },
    {
      group: 'Look',
      items: [
        {
          id: 'lut_loaded',
          t: 'LUT loaded in Blackmagic, Display LUT on',
          d: 'The LUT preview is the review (runbook).',
          path: [
            'Blackmagic Camera',
            'Settings',
            'LUTs',
            'LUT Selection',
            'Import LUT',
          ],
        },
        {
          id: 'zebras',
          t: 'Zebras on at 95%, Focus Assist on',
          d: 'Stripes only inside the brightest bulb.',
          path: ['Blackmagic Camera', 'Settings', 'Monitor'],
        },
        {
          id: 'wb_locked',
          t: 'White balance set in Kelvin and locked',
          d: 'Blackmagic: Lock White Balance on Record ON. Pixel: tap the subject, then Lock.',
        },
        {
          id: 'focus_locked',
          t: 'Focus manual and locked',
          d: 'Tap the subject, lock, and check peaking on the edges.',
        },
        {
          id: 'audio_check',
          t: 'Audio check: 5 s test clip, played back',
          d: 'Listen for the hood fan and for your hand over the bottom mic.',
        },
      ],
    },
  ]
  const PRE_IDS = PREFLIGHT.flatMap(g => g.items.map(i => i.id))

  /* ================================================================ 5. white balance */
  const WB = [
    {
      id: 'violet',
      label: 'Violet night',
      k: [3200, 3200],
      use: 'Night Reel default (runbook). Under dusk light this pushes the sky violet.',
      set: 'Blackmagic: WB › Manual › 3200K, tint 0. Pixel: White balance slider to 3200K.',
    },
    {
      id: 'blue',
      label: 'Blue night',
      k: [2800, 2800],
      use: 'The small-town variant: deep-blue sky.',
      set: 'Blackmagic: WB › Manual › 2800K, tint 0.',
    },
    {
      id: 'candle',
      label: 'Candlelit',
      k: [2800, 3200],
      use: 'Dining room or a candle on the table. Set to the flame so the flame reads warm-white.',
      set: 'Start at 3000K and judge on the skin.',
    },
    {
      id: 'led',
      label: 'LED kitchen',
      k: [3800, 4200],
      use: 'The line under LED panels (the brief). Pair with 1/60 at 24 fps.',
      set: 'Blackmagic: 4000K. Pixel: drag to about 4000K and Lock.',
    },
    {
      id: 'golden',
      label: 'Golden window',
      k: [4800, 4800],
      use: 'Late sun through a window onto the pass: set 4800K and the gold stays without going orange.',
      set: 'Blackmagic: 4800K.',
    },
    {
      id: 'day',
      label: 'Daylight',
      k: [5400, 5600],
      use: 'Window light or outdoors at midday: plates read true.',
      set: 'Blackmagic: 5600K. Pixel: drag to about 5500K.',
    },
  ]
  const K_MIN = 2000
  const K_MAX = 7000
  /** Approximate sRGB colour of a black-body light (Tanner Helland fit). */
  function kelvinRGB(k) {
    const t = k / 100
    let r
    let g
    let b
    if (t <= 66) {
      r = 255
      g = 99.4708025861 * Math.log(t) - 161.1195681661
      b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
    } else {
      r = 329.698727446 * (t - 60) ** -0.1332047592
      g = 288.1221695283 * (t - 60) ** -0.0755148492
      b = 255
    }
    return LN.color.rgb2hex(r, g, b)
  }

  /* ================================================================ 7. device facts */
  const FACTS = [
    {
      key: 'capcut_lut_import',
      app: 'CapCut',
      status: 'contradicted',
      q: 'Can CapCut on your phone import a .cube LUT?',
      check: [
        'New project, add any clip.',
        ['Tap the clip', 'Adjust'],
        'Swipe the whole tool row both ways. Look for a LUT tile, or an Import / + tile.',
        ['Tap empty timeline', 'Filters'],
        'Look for an Import / + tile there too.',
      ],
      yes: 'Route A works: import LunarNight_v2_Violet.cube and set intensity.',
      no: 'Route B: bake it in Blackmagic (Record LUT to Clip) or with the OS Bake. Route C: the slider recipe.',
    },
    {
      key: 'capcut_hsl_free',
      app: 'CapCut',
      status: 'unverified',
      q: 'Is HSL free (no Pro badge)?',
      check: [['Tap the clip', 'Adjust', 'HSL'], 'Look for a Pro badge.'],
      yes: 'Run the HSL step of the recipe.',
      no: 'Skip HSL (runbook) and lean on Saturation and Temperature.',
    },
    {
      key: 'capcut_curves',
      app: 'CapCut',
      status: 'unverified',
      q: 'Does Adjust have Curves?',
      check: [
        ['Tap the clip', 'Adjust', 'Curves'],
        'Note the channels (white, red, green, blue). Add a point, then find how to delete it.',
      ],
      yes: 'Build the gentle S and the dark-look shadow pull (playbook).',
      no: 'Use Contrast + Shadows for the S.',
    },
    {
      key: 'capcut_tint_label',
      app: 'CapCut',
      status: 'contradicted',
      q: 'Is the green–magenta slider labelled Tint?',
      check: [
        ['Tap the clip', 'Adjust'],
        'Find the slider beside Temp. Read its label.',
      ],
      yes: 'The recipe reads as written: Tint +15.',
      no: 'It is labelled Hue: put the Tint values there.',
    },
    {
      key: 'capcut_range_50',
      app: 'CapCut',
      status: 'unverified',
      q: 'Do the Adjust sliders end at −50 and +50?',
      check: [
        ['Tap the clip', 'Adjust', 'Brightness'],
        'Drag to each end and read the number.',
      ],
      yes: 'The recipe numbers apply as written.',
      no: 'Write down the real ends; the recipe assumes a ±50 scale.',
    },
    {
      key: 'capcut_adjust_layer',
      app: 'CapCut',
      status: 'contradicted',
      q: 'With nothing selected, does Adjust add its own adjustment track?',
      check: [
        ['Tap empty timeline', 'Adjust'],
        'Note the new segment’s length and the track it lands on.',
      ],
      yes: 'Grade on one adjustment layer over the whole timeline (playbook step 11).',
      no: 'Grade the first clip, then Apply to all.',
    },
    {
      key: 'capcut_color_wheels',
      app: 'CapCut',
      status: 'contradicted',
      q: 'Does mobile Adjust have colour wheels?',
      check: [
        ['Tap the clip', 'Adjust'],
        'Swipe the tool row for Color wheel.',
      ],
      yes: 'Wheels are there for shadow and highlight tints.',
      no: 'Use Temp, Tint and HSL Blue for the violet shadow push.',
    },
    {
      key: 'capcut_motion_blur',
      app: 'CapCut',
      status: 'unverified',
      q: 'Is there a Motion blur tool for a selected clip?',
      check: [
        'Tap the clip and scroll its toolbar for Motion blur.',
        ['If not', 'Effects', 'Video effects', 'search "motion blur"'],
        'Note the parameter names and any Pro badge.',
      ],
      yes: 'Use it on speed ramps.',
      no: 'Shoot the blur instead: 180° or slower.',
    },
    {
      key: 'capcut_smooth_slowmo_free',
      app: 'CapCut',
      status: 'unverified',
      q: 'Is Smooth slow-mo free?',
      check: [
        ['Tap the clip', 'Speed', 'Normal'],
        'Set 0.3x. Look for Smooth slow-mo and a Pro badge.',
      ],
      yes: 'You can slow 30 fps footage without stutter.',
      no: 'Shoot 60 fps for anything you will slow down.',
    },
    {
      key: 'capcut_reduce_noise_free',
      app: 'CapCut',
      status: 'contradicted',
      q: 'Is Reduce noise free (no Pro badge)?',
      check: [
        ['Tap the clip', 'Reduce noise'],
        'Older builds call it Noise reduction. Look for a Pro badge.',
      ],
      yes: 'Clean the hood fan out of a monologue.',
      no: 'Avoid it: a Pro asset can block export.',
    },
    {
      key: 'capcut_font_import',
      app: 'CapCut',
      status: 'unverified',
      q: 'Can you import a .ttf or .otf font?',
      check: [
        ['Text', 'Add text', 'Font', 'Import'],
        'Pick Estrella Early or Inter from Downloads.',
      ],
      yes: 'Your house fonts work on the phone.',
      no: 'Render titles as PNGs in Type & HUD and overlay them.',
    },
    {
      key: 'capcut_export_higher',
      app: 'CapCut',
      status: 'unverified',
      q: 'Does export offer a Higher bit rate setting?',
      check: [
        'Tap the resolution chip at the top right (1080P ▾).',
        'Look for Bit rate or Code rate: Lower, Recommended, Higher.',
      ],
      yes: 'Export at Higher every time (runbook and playbook).',
      no: 'Note what it offers instead; pick the top setting.',
    },
    {
      key: 'pixel_video_shutter',
      app: 'Pixel Camera',
      status: 'contradicted',
      q: 'In Video, do the Pro controls show Shutter speed and ISO?',
      check: [
        ['Pixel Camera', 'Video', 'Sliders icon (bottom right)'],
        'List what appears: Brightness, Shadows, WB, Focus, Shutter, ISO.',
      ],
      yes: 'Path B can hold a fixed shutter.',
      no: 'Path B is auto exposure. Use Blackmagic Camera (Path A) for any fixed shutter.',
    },
    {
      key: 'pixel_shutter_flicker',
      app: 'Pixel Camera',
      status: 'unverified',
      q: 'Can you pick 1/60 and 1/120 in Video?',
      check: [
        'With Shutter showing, step through it at 24, 30 and 60 fps.',
        'Start a recording and check the value holds.',
      ],
      yes: 'Flicker-safe shutters are available in the stock app.',
      no: 'Use Blackmagic Camera under LEDs.',
    },
    {
      key: 'pixel_lens_lock',
      app: 'Pixel Camera',
      status: 'unverified',
      q: 'Does Lens selection: Manual (UW / W / T) hold in Video?',
      check: [
        ['Settings (bottom left)', 'Pro', 'Lens Selection', 'Manual'],
        'Swipe to Video. Are the UW / W / T buttons still there?',
      ],
      yes: 'Lock the lens per shot.',
      no: 'Video may swap lenses on its own: stay past about 57 cm on 5x.',
    },
    {
      key: 'pixel_auto_macro_toggle',
      app: 'Pixel Camera',
      status: 'unverified',
      q: 'Can Macro Focus be set to Off?',
      check: [
        'In Video, tap the flower icon at the top right of the viewfinder.',
        ['Older builds', 'Settings', 'More settings', 'Macro Focus'],
        'Note the choices: Auto, On, Off.',
      ],
      yes: 'Off for plating, On for texture.',
      no: 'Back off past about 4 cm so macro never cuts in.',
    },
    {
      key: 'pixel_speech_enh',
      app: 'Pixel Camera',
      status: 'unverified',
      q: 'Is there a Speech enhancement toggle in Video settings?',
      check: [
        ['Pixel Camera', 'Video', 'Video settings'],
        'Look for Speech enhancement (Pixel 11 puts it under Creator).',
      ],
      yes: 'On for monologues, off for raw sizzle.',
      no: 'Use your DJI mic for the monologue.',
    },
    {
      key: 'pixel_hdr_4k60',
      app: 'Pixel Camera',
      status: 'contradicted',
      q: 'Is 10-bit HDR available at 4K 60 fps without Video Boost?',
      check: [
        ['Video settings', 'Resolution 4K', 'Frames/sec 60'],
        'Is the 10-bit HDR toggle still active?',
      ],
      yes: 'Noted. Keep it off anyway when you grade with LUTs.',
      no: 'As expected: HDR is 4K30 natively.',
    },
    {
      key: 'pixel_codec_labels',
      app: 'Pixel Camera',
      status: 'unverified',
      q: 'Does Video format list AVC, HEVC and AV1?',
      check: [
        ['Settings (gear)', 'More settings', 'Video format'],
        'Write down the exact option labels.',
      ],
      yes: 'Pick HEVC.',
      no: 'Older wording: "Store videos efficiently" on = HEVC.',
    },
    {
      key: 'bmc_flicker_base',
      app: 'Blackmagic',
      status: 'unverified',
      q: 'Does Blackmagic Camera have a Flicker Free Shutter Based On setting?',
      check: [
        ['Blackmagic Camera', 'Settings (gear)', 'Camera'],
        'Look for Flicker Free Shutter Based On (50Hz / 60Hz). Version 3.5 has a settings search box: type "flicker".',
        'Set 60Hz and note whether the shutter picker then offers 1/60 and 1/120 first.',
      ],
      yes: 'Set 60Hz once; the shutter picker then favours flicker-safe values.',
      no: 'Pick 1/60 (30 fps) or 1/120 (60 fps) by hand from the calculator.',
    },
    {
      key: 'bmc_full_manual',
      app: 'Blackmagic',
      status: 'unverified',
      q: 'In Blackmagic Camera, does a fixed shutter force ISO to manual too?',
      check: [
        'Set Shutter to 180°, then try ISO on Auto.',
        'If ISO locks to a number, the app is in full manual.',
      ],
      yes: 'Set ISO by hand every setup (the runbook already does).',
      no: 'You can hold the shutter and let ISO float on the kitchen formats.',
    },
  ]

  /* ================================================================ render helpers */
  function mini(title, ...kids) {
    return h(
      'div',
      { class: 'ln-card rig-card' },
      title ? h('h3', { class: 'ln-h3' }, title) : null,
      ...kids,
    )
  }

  /* ================================================================ section 1: camera map */
  function buildPhone(onPick) {
    let rx = -8
    let ry = -24
    const phone = h('div', { class: 'rig-phone' })
    const setPose = (x, y, animate) => {
      rx = LN.math.clamp(x, -40, 40)
      ry = y
      phone.classList.toggle('is-animating', !!animate)
      phone.style.setProperty('--rx', String(rx))
      phone.style.setProperty('--ry', String(ry))
      const facing = (((ry % 360) + 540) % 360) - 180
      const back = Math.abs(facing) < 90
      sideLabel.textContent = back ? 'Back' : 'Screen side'
      stage.setAttribute(
        'aria-label',
        `Pixel 10 Pro XL, ${back ? 'back' : 'screen side'} facing you. Drag, or use the arrow keys to turn it.`,
      )
    }

    // Back face: the camera bar and its parts.
    const bar = h(
      'div',
      { class: 'rig-bar', 'aria-hidden': 'true' },
      h(
        'div',
        { class: 'rig-glass' },
        h('i', { class: 'rig-lens uw' }),
        h('i', { class: 'rig-lens main' }),
        h('i', { class: 'rig-lens tele' }),
      ),
      h('i', { class: 'rig-flash' }),
      h('i', { class: 'rig-temp' }),
      h('i', { class: 'rig-ldaf' }),
      h('i', { class: 'rig-fsensor' }),
      h('i', { class: 'rig-mic-hole' }),
    )
    const pins = PARTS.map((p, i) =>
      h(
        'button',
        {
          type: 'button',
          class: `rig-pin ${p.kind}`,
          style: { '--x': `${p.at[0]}%`, '--y': `${p.at[1]}%` },
          'aria-pressed': 'false',
          dataset: { part: p.id },
          'aria-label': `${p.name}: open the spec panel`,
          onClick: () => onPick(p.id),
        },
        h('span', { class: 'rig-pin-dot' }, String(i + 1)),
        p.kind === 'lens' ? h('span', { class: 'rig-pin-tag' }, p.tag) : null,
      ),
    )
    const back = h(
      'div',
      { class: 'rig-face rig-back' },
      h('div', { class: 'rig-sheen', 'aria-hidden': 'true' }),
      bar,
      pins,
    )
    const screen = h(
      'div',
      { class: 'rig-face rig-front' },
      h('i', { class: 'rig-punch', 'aria-hidden': 'true' }),
      h('div', { class: 'rig-hud' }),
    )
    const faces = [
      back,
      screen,
      h('div', { class: 'rig-face rig-edge rig-left' }),
      h(
        'div',
        { class: 'rig-face rig-edge rig-right' },
        h('i', { class: 'rig-key power' }),
        h('i', { class: 'rig-key vol' }),
      ),
      h(
        'div',
        { class: 'rig-face rig-edge rig-top' },
        h('i', { class: 'rig-hole' }),
      ),
      h(
        'div',
        { class: 'rig-face rig-edge rig-bottom' },
        h('i', { class: 'rig-hole' }),
        h('i', { class: 'rig-usb' }),
        h('i', { class: 'rig-grille' }),
      ),
    ]
    // Stacked slices give the rounded corners real thickness from any angle.
    const slices = [0, 1, 2, 3, 4, 5].map(k =>
      h('i', { class: 'rig-slice', style: { '--k': String(k) } }),
    )
    phone.append(...slices, ...faces)

    const sideLabel = h('span', { class: 'rig-side ln-small' })
    const stage = h(
      'div',
      {
        class: 'rig-stage',
        tabindex: '0',
        role: 'group',
        'aria-roledescription': '3D model',
      },
      h('div', { class: 'rig-light', 'aria-hidden': 'true' }),
      phone,
    )

    // Drag to turn. Pointer capture starts only after a real drag, so a tap
    // on a pin still reaches the pin.
    let start = null
    let dragging = false
    stage.addEventListener('pointerdown', e => {
      if (e.button) return
      start = { x: e.clientX, y: e.clientY, rx, ry, id: e.pointerId }
      dragging = false
    })
    stage.addEventListener('pointermove', e => {
      if (!start || e.pointerId !== start.id) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (!dragging && Math.hypot(dx, dy) > 6) {
        dragging = true
        try {
          stage.setPointerCapture(start.id)
        } catch (_e) {
          /* pointer already gone */
        }
        stage.classList.add('is-dragging')
      }
      if (dragging) setPose(start.rx - dy * 0.35, start.ry + dx * 0.6)
    })
    const end = () => {
      start = null
      if (dragging) setTimeout(() => stage.classList.remove('is-dragging'), 0)
      dragging = false
    }
    stage.addEventListener('pointerup', end)
    stage.addEventListener('pointercancel', end)
    stage.addEventListener('keydown', e => {
      const step = { ArrowLeft: [0, -20], ArrowRight: [0, 20] }
      const tilt = { ArrowUp: [10, 0], ArrowDown: [-10, 0] }
      const m = step[e.key] || tilt[e.key]
      if (m) {
        e.preventDefault()
        setPose(rx + m[0], ry + m[1], true)
      } else if (e.key === 'Home' || e.key === '0') {
        e.preventDefault()
        setPose(-8, -24, true)
      } else if (e.key === 'f' || e.key === 'F') {
        setPose(rx, ry + 180, true)
      }
    })

    const controls = h(
      'div',
      { class: 'rig-turns' },
      ui.btn('Turn left', () => setPose(rx, ry - 30, true), {
        kind: 'quiet',
        small: true,
      }),
      ui.btn('Flip', () => setPose(rx, ry + 180, true), {
        kind: 'quiet',
        small: true,
      }),
      ui.btn('Turn right', () => setPose(rx, ry + 30, true), {
        kind: 'quiet',
        small: true,
      }),
      ui.btn('Reset', () => setPose(-8, -24, true), {
        kind: 'quiet',
        small: true,
      }),
      sideLabel,
    )
    setPose(rx, ry)

    return {
      stage,
      controls,
      pins,
      hud: LN.$('.rig-hud', screen),
      showBack() {
        const facing = (((ry % 360) + 540) % 360) - 180
        if (Math.abs(facing) >= 90) setPose(-8, ry + 180, true)
      },
    }
  }

  function specPanel(p) {
    const kids = [
      h('div', { class: 'ln-eyebrow' }, `Part ${PARTS.indexOf(p) + 1} of 7`),
      h('h3', { class: 'ln-h2 rig-spec-title' }, p.title),
      h(
        'dl',
        { class: 'rig-specs' },
        p.specs.flatMap(([k, v, c]) => [
          h('dt', null, k),
          h('dd', null, h('span', null, v), confChip(c)),
        ]),
      ),
      h(
        'div',
        { class: 'rig-when' },
        h('div', null, h('b', null, 'Food'), h('p', null, p.food)),
        h('div', null, h('b', null, 'Night'), h('p', null, p.night)),
      ),
    ]
    if (p.warn) kids.push(ui.callout('warn', p.warn))
    if (p.fact) kids.push(factLine(p.fact[0], p.fact[1]))
    const shaky = p.specs.some(
      r => r[2] === 'unverified' || r[2] === 'contradicted',
    )
    if (p.verify)
      kids.push(
        ui.callout(
          'verify',
          [
            shaky ? 'Some numbers here are unverified or contradicted. ' : null,
            p.verify,
          ],
          undefined,
        ),
      )
    return kids
  }

  function sectionMap() {
    const panel = h('div', {
      class: 'ln-card rig-specpanel',
      'aria-live': 'polite',
    })
    let current = null
    const chips = h('div', {
      class: 'rig-parts',
      role: 'group',
      'aria-label': 'Camera parts',
    })
    const pick = (id, fromChip) => {
      current = id
      const p = PARTS.find(x => x.id === id)
      panel.replaceChildren(...specPanel(p))
      for (const b of phone.pins)
        b.setAttribute('aria-pressed', String(b.dataset.part === id))
      for (const b of chips.children)
        b.setAttribute('aria-pressed', String(b.dataset.part === id))
      if (fromChip) phone.showBack()
    }
    const phone = buildPhone(id => pick(id, false))
    PARTS.forEach((p, i) => {
      chips.append(
        h(
          'button',
          {
            type: 'button',
            dataset: { part: p.id },
            'aria-pressed': 'false',
            onClick: () => pick(p.id, true),
          },
          h('span', { class: 'ln-num' }, String(i + 1)),
          p.name,
        ),
      )
    })
    pick('main')

    const legend = h(
      'p',
      { class: 'rig-legend ln-small ln-muted' },
      confChip('confirmed'),
      ' official or two reputable sources · ',
      confChip('likely'),
      ' one reputable source · ',
      confChip('unverified'),
      ' / ',
      confChip('contradicted'),
      ' check it on the phone',
    )

    return {
      el: ui.section(
        {
          eyebrow: '01 · Camera map',
          title: 'The Obsidian Pixel 10 Pro XL',
          lede: 'Drag the phone or use the arrow keys. Tap a numbered part for its numbers, how sure we are of each, and when it earns a place on the line or the street.',
          id: 'rig-map',
        },
        h(
          'div',
          { class: 'ln-split rig-mapgrid' },
          h(
            'div',
            { class: 'ln-stack rig-mapcol' },
            phone.stage,
            phone.controls,
            chips,
          ),
          h('div', { class: 'ln-stack' }, panel, legend),
        ),
        h(
          'div',
          { class: 'ln-grid' },
          mini('Body', ui.kv(BODY)),
          ui.callout(
            'verify',
            'Lens order on the bar is contradicted: one leak reading puts the ultrawide on the left, one reading of Google’s diagram puts the wide there. The 5x beside the flash is likely. Check: in Video, cover one lens at a time with a fingertip while you switch .5 / 1 / 5; the lens that blacks out the frame is the one in use.',
          ),
        ),
      ),
      hud: phone.hud,
      current: () => current,
    }
  }

  /* ================================================================ section 2: presets */
  const modeExp = m => m.exp || m.angle / (360 * m.fps)
  function flickerNote(m) {
    const exp = modeExp(m)
    const c = exp * 120
    const safe = Math.abs(c - Math.round(c)) < 0.01 && Math.round(c) >= 1
    const frac = `1/${Math.round(1 / exp)}`
    return {
      safe,
      text: safe
        ? `${frac} s spans ${Math.round(c)} light pulse${Math.round(c) > 1 ? 's' : ''} at 60 Hz mains: no banding.`
        : `${frac} s spans ${c.toFixed(1)} pulses at 60 Hz mains: LEDs can roll bands. Use 1/60 or 1/120.`,
    }
  }

  /** A settings sheet: group header rows, then rows of setting · value · why + path. */
  function sheet(groups) {
    const el = h('div', { class: 'rig-sheet' })
    for (const g of groups) {
      el.append(h('div', { class: 'rig-grp' }, g.title))
      for (const r of g.rows) {
        el.append(
          h(
            'div',
            { class: 'rig-row' },
            h(
              'div',
              { class: 'rig-k' },
              r.k,
              r.check ? h('span', { class: 'rig-badge' }, 'Check') : null,
            ),
            h('div', { class: 'rig-v' }, h('em', null, r.v)),
            h(
              'div',
              { class: 'rig-w' },
              r.w ? h('span', null, r.w) : null,
              r.check && r.check !== true
                ? h('span', { class: 'rig-checknote' }, r.check)
                : null,
              r.path ? ui.path(r.path) : null,
              r.fact ? factLine(r.fact[0], r.fact[1], 'span') : null,
            ),
          ),
        )
      }
    }
    return el
  }

  function bmSheet(m) {
    const bm = m.bm
    const fl = flickerNote(m)
    return sheet([
      {
        title: 'Setup',
        rows: [
          {
            k: 'Vertical video',
            v: 'Enable Vertical Video ON',
            w: 'Native 9:16; nothing to crop later.',
            path: ['Settings', 'Camera', 'Enable Vertical Video'],
          },
          {
            k: 'Stabilization',
            v: bm.stab[0],
            w: bm.stab[1],
            path: ['Settings', 'Record', 'Stabilization'],
            check:
              'The runbook puts it under Settings › Camera, the kit under Settings › Record.',
          },
          {
            k: 'Noise reduction · sharpening',
            v: 'OFF · OFF',
            w: 'Both smear the dark areas and put halos on edges.',
            path: ['Settings', 'Camera'],
          },
          {
            k: 'Lock WB on record',
            v: 'ON',
            w: 'White balance cannot drift mid-take.',
            path: ['Settings', 'Camera', 'Lock White Balance on Record'],
          },
        ],
      },
      {
        title: 'Record',
        rows: [
          {
            k: 'Resolution',
            v: bm.res,
            w: 'Room to punch in and still deliver a sharp 1080 × 1920.',
            path: ['Settings', 'Record', 'Resolution'],
          },
          {
            k: 'Codec · quality',
            v: 'HEVC (H.265) · Max',
            w: 'Smaller than H.264 at the same quality. Low bitrate breaks steam and grain into blocks.',
            path: ['Settings', 'Record', 'Codec'],
          },
          {
            k: 'Color space',
            v: 'Rec.709 · HDR OFF',
            w: 'LUTs, CapCut and the platforms expect SDR. No HDR badge on the viewfinder.',
            path: ['Settings', 'Record', 'Color Space'],
          },
        ],
      },
      {
        title: 'Exposure · the HUD, left to right',
        rows: [
          {
            k: 'FPS',
            v: m.fpsLabel,
            w: 'Export at the same rate you shoot.',
            path: ['Tap FPS'],
          },
          {
            k: 'Shutter',
            v: bm.shutter,
            w: fl.text,
            path: ['Tap SHUTTER'],
          },
          {
            k: 'Flicker-free base',
            v: '60 Hz (US mains)',
            w: 'Kitchen LEDs and signs pulse at 120 Hz; the wrong base rolls bands on steel.',
            path: ['Settings', 'Camera', 'Flicker Free Shutter Based On'],
            check: 'From the kit only; the research did not cover it.',
            fact: [
              'bmc_flicker_base',
              {
                yes: 'Your build has it: set 60 Hz.',
                no: 'Not on your build: pick 1/60 or 1/120 by hand.',
                none: 'Settle it in section 7.',
              },
            ],
          },
          { k: 'ISO', v: bm.iso[0], w: bm.iso[1], path: ['Tap ISO'] },
          {
            k: 'White balance',
            v: bm.wb[0],
            w: bm.wb[1],
            path: ['Tap WB'],
          },
          {
            k: 'Focus',
            v: 'Tap the subject, then manual',
            w: 'Steam, hands and headlights make autofocus hunt mid-shot.',
            path: ['Tap FOCUS'],
          },
          {
            k: 'Lens',
            v: bm.lens[0],
            w: bm.lens[1],
            path: ['Lens buttons on the record screen'],
          },
        ],
      },
      {
        title: 'Monitor and look',
        rows: [
          {
            k: 'Zebras',
            v: 'ON, 95%',
            w: 'Night: stripes only inside the brightest bulb. Kitchen: fine on oil glints, never on the plate.',
            path: ['Settings', 'Monitor', 'Zebras'],
          },
          {
            k: 'Focus Assist',
            v: 'ON (peaking)',
            w: 'Shows what is sharp on a small screen.',
            path: ['Settings', 'Monitor', 'Focus Assist'],
          },
          {
            k: 'Display LUT',
            v: bm.lut[0],
            w: bm.lut[1],
            path: ['Settings', 'LUTs', 'LUT Selection', 'Import LUT'],
          },
          {
            k: 'Record LUT to Clip',
            v: bm.rec[0],
            w: bm.rec[1],
            path: ['Settings', 'LUTs', 'Record LUT to Clip'],
          },
        ],
      },
    ])
  }

  function pxSheet(m) {
    const px = m.px
    return sheet([
      {
        title: 'Video settings · bottom left, or swipe up',
        rows: [
          {
            k: 'Resolution',
            v: px.res,
            w: 'Never 8K: it only exists through Video Boost.',
            path: ['Video', 'Video settings', 'Resolution'],
          },
          {
            k: 'Frames/sec',
            v: `${m.fps} fps`,
            w: 'Pixel Camera records 24, 30 or 60.',
            path: ['Video settings', 'Frames/sec'],
          },
          {
            k: '10-bit HDR',
            v: 'OFF',
            w: 'HDR clips wash out in CapCut, and every LUT expects SDR.',
            path: ['Video settings', '10-bit HDR'],
          },
          {
            k: 'Boost and auto',
            v: px.off,
            w: px.offWhy,
            path: ['Video settings', 'Video Boost'],
          },
          {
            k: 'Stabilization',
            v: px.stab[0],
            w: px.stab[1],
            path: ['Video settings', 'Stabilization'],
          },
          {
            k: 'Video format',
            v: 'HEVC',
            w: 'Smaller than H.264 at the same quality.',
            path: ['Settings (gear)', 'More settings', 'Video format'],
            check:
              'Exact option labels are unverified; older builds say “Store videos efficiently”.',
            fact: [
              'pixel_codec_labels',
              {
                yes: 'Your build lists AVC, HEVC and AV1.',
                no: 'Your build words it differently: pick the HEVC / efficient option.',
                none: 'Settle it in section 7.',
              },
            ],
          },
        ],
      },
      {
        title: 'Pro controls · sliders icon, bottom right',
        rows: [
          {
            k: 'White balance',
            v: px.wb,
            w: 'The slider shows Kelvin; right is warmer.',
            path: ['Sliders icon', 'White balance'],
          },
          {
            k: 'Shutter · ISO',
            v: `${px.shutter} · ISO ${px.iso}`,
            w: 'Sources disagree on whether Video shows them on the Pixel 10 Pro.',
            path: ['Sliders icon'],
            check: true,
            fact: [
              'pixel_video_shutter',
              {
                yes: 'Your build shows them in Video.',
                no: 'Not in Video on your build: use Brightness, or Path A.',
                none: 'Settle it in section 7.',
              },
            ],
          },
          {
            k: 'Brightness',
            v: px.ev,
            w: 'Protects the white plate and the lights, the first things to clip.',
            path: ['Sliders icon', 'Brightness'],
          },
          {
            k: 'Shadows',
            v: px.shadows,
            w: 'Night: down drops the walls to black.',
            path: ['Sliders icon', 'Shadows'],
            check: 'Shadows in Video is unverified.',
          },
          {
            k: 'Focus',
            v: px.focus,
            w: 'Peaking shows in manual focus (confirmed for photos).',
            path: ['Sliders icon', 'Focus'],
          },
          {
            k: 'Lens selection',
            v: 'Manual (UW / W / T)',
            w: 'Stops the app swapping lenses as you move in.',
            path: ['Settings (bottom left)', 'Pro', 'Lens Selection', 'Manual'],
            check: 'Confirmed for photos only.',
            fact: [
              'pixel_lens_lock',
              {
                yes: 'Holds in Video on your phone.',
                no: 'Does not hold in Video on your phone.',
                none: 'Settle it in section 7.',
              },
            ],
          },
          {
            k: 'Lock',
            v: 'Tap the subject, then Lock · or touch and hold',
            w: 'Locks focus and exposure before hands and steam enter the frame.',
            path: ['Tap subject', 'Lock (top right)'],
            check:
              'Google documents tap, then Lock; the runbook and the kit say touch and hold. Keep whichever shows a lock icon.',
          },
        ],
      },
    ])
  }

  function presetBody(fmt, m) {
    const fl = flickerNote(m)
    const quick = h(
      'ol',
      { class: 'rig-quick' },
      m.quick.map(([k, v], i) =>
        h(
          'li',
          { style: { '--c': `var(--t${(i % 6) + 1})` } },
          h('b', null, k),
          h('span', null, v),
        ),
      ),
    )
    const tabs = ui.tabs(
      [
        {
          id: 'bm',
          label: 'Path A · Blackmagic Camera',
          render: el =>
            el.append(
              h(
                'div',
                { class: 'ln-stack' },
                hudRow(m),
                bmSheet(m),
                factLine('bmc_full_manual', {
                  yes: 'A fixed shutter puts ISO on manual too, so set ISO by hand every setup.',
                  no: 'Shutter can hold while ISO floats.',
                  none: 'One review says a fixed shutter needs full manual on the Pixel 10 Pro. Settle it in section 7.',
                }),
                ui.callout(
                  'verify',
                  'Labels vary by version; the kit reports that Blackmagic Camera 3.5 has a settings search box, so type the setting name if a path differs. The kit also says the Pixel 10 Pro XL is not yet on Blackmagic’s official device list: record and play back a 5-second test clip after every app update.',
                ),
              ),
            ),
        },
        {
          id: 'px',
          label: 'Path B · Pixel Camera',
          render: el =>
            el.append(
              h(
                'div',
                { class: 'ln-stack' },
                pxSheet(m),
                ui.callout(
                  'verify',
                  'Pixel Camera labels move between versions (10.1 merged the Advanced menu into one Settings list). Rows marked Check disagree between sources: run the matching item in section 7 once and the answers show here.',
                ),
              ),
            ),
        },
      ],
      { key: 'rig.app' },
    )
    return h(
      'div',
      { class: 'ln-stack' },
      h(
        'div',
        { class: 'ln-card rig-quickcard' },
        h(
          'div',
          { class: 'rig-quickhead' },
          h('h3', { class: 'ln-h3' }, 'The 30-second version'),
          ui.chip(
            fl.safe ? 'Flicker-safe at 60 Hz' : 'Banding risk at 60 Hz',
            fl.safe ? 'sage' : 'crimson',
          ),
        ),
        quick,
        h('p', { class: 'rig-why' }, h('b', null, 'Why. '), m.why),
        h('p', { class: 'ln-faint ln-small' }, `Source: ${m.src}.`),
      ),
      tabs.el,
    )
  }

  function hudRow(m) {
    return h(
      'div',
      {
        class: 'rig-hudrow',
        role: 'list',
        'aria-label': 'Blackmagic HUD dials, left to right',
      },
      ['FPS', 'Shutter', 'ISO', 'WB', 'Focus', 'Lens'].map((k, i) =>
        h(
          'div',
          { class: 'rig-dial', role: 'listitem' },
          h('span', null, k),
          h('b', { class: 'ln-num' }, m.hud[i]),
        ),
      ),
    )
  }

  function sectionPresets(onMode) {
    const store = LN.store.get('rig.preset', { fmt: 'night', mode: {} }) || {}
    let fmtId = FORMATS.some(f => f.id === store.fmt) ? store.fmt : 'night'
    const modeSel = { ...(store.mode || {}) }
    const body = h('div')
    const modeHost = h('div')
    const save = () => LN.store.set('rig.preset', { fmt: fmtId, mode: modeSel })

    // The separately built 3D phone (modules/rig-phone.js) shows the app
    // screens. Mount it here when it exists; the camera map keeps its own
    // CSS phone for the hardware hotspots.
    const phoneHost = h('div', { class: 'rig-phone-host' })
    let phoneApi = null
    if (LN.rigPhone && typeof LN.rigPhone.mount === 'function') {
      try {
        phoneApi = LN.rigPhone.mount(phoneHost, { screen: 'bmd' }) || null
      } catch (e) {
        console.error('[rig] LN.rigPhone failed to mount', e)
        phoneHost.hidden = true
      }
    } else phoneHost.hidden = true

    const show = (fmt, m) => {
      body.replaceChildren(presetBody(fmt, m))
      onMode(m)
      LN.bus.emit('rig:preset', {
        format: fmt.id,
        mode: m.id,
        fps: m.fps,
        hud: m.hud.slice(),
      })
      if (phoneApi && typeof phoneApi.setPreset === 'function') {
        try {
          phoneApi.setPreset({ format: fmt.id, mode: m.id, hud: m.hud })
        } catch (_e) {
          /* optional hook */
        }
      }
    }
    const render = () => {
      const fmt = FORMATS.find(f => f.id === fmtId)
      const mode = fmt.modes.find(m => m.id === modeSel[fmtId]) || fmt.modes[0]
      modeHost.replaceChildren()
      if (fmt.modes.length > 1) {
        const seg = ui.seg({
          label: 'Mode',
          options: fmt.modes.map(m => ({ value: m.id, label: m.label })),
          value: mode.id,
          onChange: v => {
            modeSel[fmtId] = v
            save()
            show(
              fmt,
              fmt.modes.find(m => m.id === v),
            )
          },
        })
        modeHost.append(seg.el)
      }
      show(fmt, mode)
    }
    const fmtSeg = ui.seg({
      label: 'Format',
      options: FORMATS.map(f => ({ value: f.id, label: f.label })),
      value: fmtId,
      onChange: v => {
        fmtId = v
        save()
        render()
      },
    })
    render()
    return ui.section(
      {
        eyebrow: '02 · Capture presets',
        title: 'Capture presets by format',
        lede: 'Pick tonight’s format. Each gives the 30-second version, then the full Blackmagic Camera and Pixel Camera sheets with a reason and a tap path for every setting. Never mix formats.',
        id: 'rig-presets',
      },
      h('div', { class: 'rig-segs' }, fmtSeg.el, modeHost),
      phoneHost,
      body,
    )
  }

  /* ================================================================ section 3: pre-flight */
  function sectionPreflight() {
    const stored = LN.store.get(PRE_KEY, { checked: {}, total: 0 }) || {}
    const checked = {}
    for (const id of PRE_IDS)
      if (stored.checked && stored.checked[id]) checked[id] = true
    const total = PRE_IDS.length
    const boxes = {}
    const count = h('b', { class: 'ln-num' })
    const meter = h('i')
    const status = h('span', { class: 'ln-small ln-muted' })
    const write = () => {
      LN.store.set(PRE_KEY, { checked: { ...checked }, total })
      LN.bus.emit('preflight')
    }
    const paint = () => {
      const n = PRE_IDS.filter(id => checked[id]).length
      count.textContent = `${n}/${total}`
      meter.style.width = `${(n / total) * 100}%`
      status.textContent =
        n === total
          ? 'All checks done. Ready to roll.'
          : `${total - n} to go before you roll.`
      for (const id of PRE_IDS) boxes[id].checked = !!checked[id]
    }
    const groups = PREFLIGHT.map(g =>
      h(
        'fieldset',
        { class: 'ln-card rig-pf-group' },
        h('legend', { class: 'ln-eyebrow' }, g.group),
        g.items.map(it => {
          const id = LN.uid('pf')
          const box = h('input', {
            type: 'checkbox',
            id,
            onChange: () => {
              if (box.checked) checked[it.id] = true
              else delete checked[it.id]
              write()
              paint()
            },
          })
          boxes[it.id] = box
          return h(
            'div',
            { class: 'rig-pf-item' },
            box,
            h('label', { for: id }, h('b', null, it.t), h('span', null, it.d)),
            it.path
              ? h('div', { class: 'rig-pf-path' }, ui.path(it.path))
              : null,
          )
        }),
      ),
    )
    paint()
    write()
    const reset = ui.btn(
      'Reset for the next shoot',
      () =>
        LN.sheet({
          title: 'Reset pre-flight?',
          body: 'Every box clears. Do it at the start of a shoot, not halfway through.',
          actions: [
            { label: 'Keep', kind: 'quiet' },
            {
              label: 'Reset',
              kind: 'danger',
              onClick: () => {
                for (const k of Object.keys(checked)) delete checked[k]
                write()
                paint()
                LN.toast('Pre-flight cleared')
              },
            },
          ],
        }),
      { kind: 'ghost', small: true },
    )
    return ui.section(
      {
        eyebrow: '03 · Pre-flight',
        title: 'Pre-flight checklist',
        lede: 'Run it before the first take. Your ticks stay on this phone and show on the home call sheet.',
        id: 'rig-preflight',
      },
      h(
        'div',
        { class: 'rig-pf-head' },
        h('div', { class: 'rig-pf-count' }, count, status),
        h('div', { class: 'rig-meter', 'aria-hidden': 'true' }, meter),
        reset,
      ),
      h('div', { class: 'ln-grid rig-pf-grid' }, groups),
      ui.callout('verify', [
        'The Do Not Disturb, Airplane mode and Adaptive brightness paths were not researched (labels vary by Android build; recent Pixels call the menu "Display & touch"). The storage numbers come from one 4K60 test. Check: open ',
        ui.path('Settings', 'Display'),
        ' and look for Adaptive brightness; record 1 minute of 4K60 and read the file size in Files.',
      ]),
    )
  }

  /* ================================================================ section 4: calculator */
  function sectionCalc() {
    const st =
      LN.store.get('rig.calc', { fps: 24, mains: 60, angle: 180 }) || {}
    const state = {
      fps: [24, 25, 30, 60, 120].includes(st.fps) ? st.fps : 24,
      mains: st.mains === 50 ? 50 : 60,
      angle: st.angle === 360 ? 360 : 180,
    }
    const out = h('div', { class: 'rig-calc-out', 'aria-live': 'polite' })
    const viz = h('div', { class: 'rig-calc-viz' })
    const paint = () => {
      LN.store.set('rig.calc', state)
      const r = flicker(state.fps, state.mains, state.angle)
      const frac = fraction(state.fps, state.angle)
      const big = h(
        'div',
        { class: 'rig-calc-big' },
        h('b', { class: 'ln-num' }, `${frac} s`),
        h(
          'span',
          null,
          `${state.angle}° at ${state.fps} fps · light pulses ${r.pulse}× a second`,
        ),
      )
      const verdict = r.safe
        ? ui.callout(
            'ok',
            `${frac} s spans exactly ${Math.round(r.cycles)} light pulse${Math.round(r.cycles) > 1 ? 's' : ''}. Every frame gets the same amount of light: no bands.`,
            'Flicker-safe',
          )
        : ui.callout(
            'warn',
            r.cycles < 1
              ? `${frac} s is shorter than one light pulse (1/${r.pulse} s). Each frame catches a different slice of the pulse, so LEDs and fluorescents roll dark bands through the frame.`
              : `${frac} s spans ${r.cycles.toFixed(2)} light pulses. The leftover part-pulse differs frame to frame, so LEDs and fluorescents can roll soft bands.`,
            'Banding risk',
          )
      const alts = r.alts.length
        ? h(
            'div',
            { class: 'ln-stack' },
            h(
              'p',
              { class: 'ln-small ln-muted' },
              `Flicker-safe shutters at ${state.fps} fps under ${state.mains} Hz light (multiples of 1/${r.pulse} s that fit inside one frame):`,
            ),
            h(
              'div',
              { class: 'rig-alts' },
              r.alts.map(a =>
                h(
                  'span',
                  {
                    class: `rig-alt ${a === r.best ? 'is-best' : ''}`.trim(),
                  },
                  h('b', { class: 'ln-num' }, `${a.label} s`),
                  h('span', null, `${a.angle}°`),
                  a === r.best ? h('em', null, 'closest') : null,
                ),
              ),
            ),
          )
        : ui.callout(
            'warn',
            `No flicker-safe shutter exists at ${state.fps} fps under ${state.mains} Hz light: one frame (1/${state.fps} s) is shorter than one pulse (1/${r.pulse} s). Shoot it in daylight or under a light that does not flicker, and check a test clip.`,
          )
      const notes = []
      if (state.fps === 25 || state.mains === 50)
        notes.push(
          'The stock Pixel Camera records 24, 30 and 60 fps only: no 25 or 50. Whether Blackmagic Camera offers 25 on this phone was not researched.',
        )
      if (state.fps === 120)
        notes.push(
          '120 fps on the Pixel is Slow Motion at 1080p; no manual shutter was found for it.',
        )
      if (state.angle === 360)
        notes.push(
          '360° is the night-reel shutter: the longest exposure a frame allows, so moving lights streak.',
        )
      out.replaceChildren(
        big,
        verdict,
        alts,
        notes.length
          ? h(
              'ul',
              { class: 'rig-notes ln-small ln-muted' },
              notes.map(n => h('li', null, n)),
            )
          : null,
        factLine('pixel_shutter_flicker', {
          yes: 'Pixel Camera lets you pick these in Video.',
          no: 'Pixel Camera will not hold these: use Blackmagic Camera under LEDs.',
          none: 'Whether Pixel Camera offers 1/60 and 1/120 in Video is unverified (section 7).',
        }),
      )
      viz.replaceChildren(flickerSvg(state, r))
    }
    const seg = (label, key, opts) =>
      ui.seg({
        label,
        options: opts,
        value: state[key],
        onChange: v => {
          state[key] = v
          paint()
        },
      }).el
    paint()
    return ui.section(
      {
        eyebrow: '04 · Shutter & flicker',
        title: 'Shutter and flicker calculator',
        lede: 'Mains light pulses twice per cycle: 120 times a second in the US. A shutter that holds a whole number of pulses never bands.',
        id: 'rig-calc',
      },
      h(
        'div',
        { class: 'ln-split' },
        h(
          'div',
          { class: 'ln-card ln-stack' },
          seg(
            'Frame rate',
            'fps',
            [24, 25, 30, 60, 120].map(v => ({ value: v, label: `${v}` })),
          ),
          seg('Mains', 'mains', [
            { value: 60, label: '60 Hz (US)' },
            { value: 50, label: '50 Hz' },
          ]),
          seg('Shutter angle', 'angle', [
            { value: 180, label: '180°' },
            { value: 360, label: '360° streaks' },
          ]),
          viz,
        ),
        out,
      ),
    )
  }

  function flickerSvg(state, r) {
    // One frame interval, light intensity |sin| at the pulse rate,
    // exposure window shaded from t=0.
    const W = 320
    const H = 96
    const top = 14
    const base = 70
    const frame = 1 / state.fps
    const pts = []
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * frame
      const v = Math.abs(Math.sin(Math.PI * r.pulse * t))
      pts.push(`${(i / 200) * W},${(base - v * (base - top)).toFixed(1)}`)
    }
    const ex = Math.min(1, r.exp / frame) * W
    const label = `One frame (1/${state.fps} s). The shaded part is the exposure; the curve is the light pulsing ${r.pulse} times a second.`
    return s(
      'svg',
      {
        viewBox: `0 0 ${W} ${H}`,
        class: 'rig-flicker-svg',
        role: 'img',
        'aria-label': label,
      },
      s('rect', {
        class: `rig-fx-win ${r.safe ? 'safe' : 'risk'}`,
        x: 0,
        y: top - 6,
        width: ex,
        height: base - top + 6,
      }),
      s('polyline', { class: 'rig-fx-wave', points: pts.join(' ') }),
      s('line', { class: 'rig-fx-axis', x1: 0, y1: base, x2: W, y2: base }),
      s(
        'text',
        { class: 'rig-fx-t', x: 2, y: H - 8 },
        `exposure ${fraction(state.fps, state.angle)} s`,
      ),
      s(
        'text',
        { class: 'rig-fx-t', x: W - 2, y: H - 8, 'text-anchor': 'end' },
        `frame 1/${state.fps} s`,
      ),
    )
  }

  /* ================================================================ section 5: white balance */
  function sectionWB() {
    const W = 360
    const x0 = 16
    const x1 = W - 16
    const xk = k => x0 + ((k - K_MIN) / (K_MAX - K_MIN)) * (x1 - x0)
    const gid = LN.uid('rigk')
    const stops = []
    for (let k = K_MIN; k <= K_MAX; k += 250)
      stops.push(
        s('stop', {
          offset: `${((k - K_MIN) / (K_MAX - K_MIN)) * 100}%`,
          'stop-color': kelvinRGB(k),
        }),
      )
    const laneY = i => 64 + i * 24
    const lanes = WB.map((p, i) => {
      const a = xk(p.k[0])
      const b = xk(p.k[1])
      const right = b > W * 0.62
      const kText = p.k[0] === p.k[1] ? `${p.k[0]}K` : `${p.k[0]}–${p.k[1]}K`
      return s(
        'g',
        { class: 'rig-wb-lane', dataset: { id: p.id } },
        s('line', {
          class: 'rig-wb-guide',
          x1: (a + b) / 2,
          y1: 40,
          x2: (a + b) / 2,
          y2: laneY(i),
        }),
        s('rect', {
          class: 'rig-wb-band',
          x: a - 5,
          y: laneY(i) - 5,
          width: b - a + 10,
          height: 10,
          rx: 5,
        }),
        s(
          'text',
          {
            class: 'rig-wb-label',
            x: right ? a - 10 : b + 10,
            y: laneY(i) + 4,
            'text-anchor': right ? 'end' : 'start',
          },
          `${p.label} ${kText}`,
        ),
      )
    })
    const skyY = laneY(WB.length) + 6
    const cursor = s('line', {
      class: 'rig-wb-cursor',
      x1: 0,
      y1: 6,
      x2: 0,
      y2: skyY + 18,
    })
    const svg = s(
      'svg',
      {
        viewBox: `0 0 ${W} ${skyY + 30}`,
        class: 'rig-wb-svg',
        role: 'img',
        'aria-label':
          'Kelvin scale from 2000K (orange light) to 7000K (blue-white light) with the shooting presets marked.',
      },
      s(
        'defs',
        null,
        s(
          'linearGradient',
          { id: gid, x1: '0', x2: '1', y1: '0', y2: '0' },
          stops,
        ),
      ),
      s('rect', {
        x: x0,
        y: 14,
        width: x1 - x0,
        height: 22,
        rx: 4,
        fill: `url(#${gid})`,
      }),
      [2000, 3000, 4000, 5000, 6000, 7000].map(k =>
        s(
          'text',
          {
            class: 'rig-wb-tick',
            x: xk(k),
            y: 50,
            'text-anchor':
              k === K_MIN ? 'start' : k === K_MAX ? 'end' : 'middle',
          },
          `${k / 1000}k`,
        ),
      ),
      lanes,
      // Sky check: from 3200K go colder to 2800K or warmer to 3600K.
      s(
        'g',
        { class: 'rig-wb-sky' },
        s('line', {
          x1: xk(3200),
          y1: skyY,
          x2: xk(2800) + 4,
          y2: skyY,
          class: 'cold',
        }),
        s('path', {
          d: `M${xk(2800)},${skyY} l6,-4 v8 z`,
          class: 'cold',
        }),
        s('line', {
          x1: xk(3200),
          y1: skyY,
          x2: xk(3600) - 4,
          y2: skyY,
          class: 'warm',
        }),
        s('path', {
          d: `M${xk(3600)},${skyY} l-6,-4 v8 z`,
          class: 'warm',
        }),
        s('circle', { cx: xk(3200), cy: skyY, r: 3 }),
        s(
          'text',
          { class: 'rig-wb-label', x: xk(3600) + 10, y: skyY + 4 },
          'sky check: grey → 2800K · cyan → 3600K',
        ),
      ),
      cursor,
    )
    const detail = h('div', {
      class: 'ln-card rig-wb-detail',
      'aria-live': 'polite',
    })
    const chips = h('div', {
      class: 'rig-parts',
      role: 'group',
      'aria-label': 'White balance presets',
    })
    let slider = null
    const moveCursor = k => {
      const x = xk(LN.math.clamp(k, K_MIN, K_MAX))
      cursor.setAttribute('x1', x)
      cursor.setAttribute('x2', x)
    }
    const readout = h('p', { class: 'ln-small ln-muted' })
    const inBand = k => WB.filter(p => k >= p.k[0] - 100 && k <= p.k[1] + 100)
    const setK = k => {
      moveCursor(k)
      const near = inBand(k)
      readout.textContent = near.length
        ? `${k}K sits in: ${near.map(p => p.label).join(', ')}.`
        : `${k}K sits between presets.`
    }
    const show = id => {
      const p = WB.find(x => x.id === id)
      for (const g of svg.querySelectorAll('.rig-wb-lane'))
        g.classList.toggle('is-on', g.dataset.id === id)
      for (const b of chips.children)
        b.setAttribute('aria-pressed', String(b.dataset.id === id))
      const mid = Math.round((p.k[0] + p.k[1]) / 2 / 50) * 50
      if (slider) slider.set(mid)
      setK(mid)
      detail.replaceChildren(
        h('div', { class: 'ln-eyebrow' }, 'Preset'),
        h(
          'h3',
          { class: 'ln-h2' },
          `${p.label} · ${p.k[0] === p.k[1] ? `${p.k[0]}K` : `${p.k[0]}–${p.k[1]}K`}`,
        ),
        h('p', { class: 'rig-why' }, p.use),
        h('p', { class: 'ln-small ln-muted' }, p.set),
      )
    }
    for (const p of WB)
      chips.append(
        h(
          'button',
          {
            type: 'button',
            dataset: { id: p.id },
            'aria-pressed': 'false',
            onClick: () => show(p.id),
          },
          p.label,
        ),
      )
    slider = ui.slider({
      label: 'Camera WB',
      min: 2500,
      max: 7000,
      step: 50,
      value: 3200,
      unit: 'K',
      onInput: setK,
    })
    show('violet')
    return ui.section(
      {
        eyebrow: '05 · White balance',
        title: 'White balance guide',
        lede: 'The bar shows the colour of light at each Kelvin. Set the camera lower than the light and the picture goes blue; higher and it goes orange. That is the whole night trick.',
        id: 'rig-wb',
      },
      h(
        'div',
        { class: 'ln-split' },
        h('div', { class: 'ln-card ln-stack' }, svg, chips, slider.el, readout),
        h(
          'div',
          { class: 'ln-stack' },
          detail,
          ui.callout(
            'rule',
            'Sky check (runbook step 4): at 3200K a grey sky means go colder, to 2800K. A cyan sky means go warmer, to 3600K.',
            'Sky check',
          ),
          ui.callout(
            'verify',
            'Blackmagic Camera’s manual WB runs 2500–10,000K (runbook source). Pixel Camera’s slider shows a Kelvin readout, but its range was not found. Check: drag the Pixel White balance slider to each end and note the numbers.',
          ),
        ),
      ),
    )
  }

  /* ================================================================ section 6: holding */
  function sectionHolding() {
    const kitchen = [
      [
        'Claw & Sternum Lock',
        'Both hands claw the phone’s edges, elbows tucked, wrists pressed to the sternum. Breathe out and hold. For static plating and slow push-ins.',
      ],
      [
        'Ninja Walk',
        'Knees soft, heel-to-toe rolling steps, phone low and level. Follow a plate down the line with no bob.',
      ],
      [
        'Towel Slider on steel',
        'Fold a side towel on the steel, lay the phone on it and slide. A dolly move across the pass, smooth because the steel is flat.',
      ],
      [
        'Apron-Loop Tension for 5x',
        'Hook a thumb through the apron loop and push the phone out against it. The tension steadies the 5x, which magnifies every tremor five times.',
      ],
      [
        'Counter Brace',
        'Rest the phone’s edge or your forearms on the counter and tilt from there. The closest thing to a tripod on a busy line.',
      ],
    ]
    const ois = ui.table(
      ['Mode', 'Use it for', 'Limits'],
      [
        [
          'Standard',
          'Handheld kitchen: Claw, Counter Brace, walk-and-talk.',
          'Light movement. The default.',
        ],
        [
          'Locked',
          'Braced shots, especially on 2x and 5x: tele across the pass, the monologue.',
          '4K and 1080p.',
        ],
        [
          'Active',
          'The Ninja Walk when you move fast.',
          '1080p only, likely 30 fps. Drops out at higher frame rates.',
        ],
        [
          'Cinematic Pan',
          'One slow, smooth pan along the pass. Its own Video sub-mode: swipe to Pan.',
          '4K and 1080p. Pan in one direction.',
        ],
      ],
      { label: 'Pixel stabilization modes' },
    )
    return ui.section(
      {
        eyebrow: '06 · Holding the phone',
        title: 'Holding the phone',
        lede: 'Night reels never move. Kitchen work moves on purpose. Pick the hold before you press record.',
        id: 'rig-hold',
      },
      ui.callout(
        'rule',
        'Night reels are braced dead-still: car roof, a post, a wall, or the Osmo locked as a stand. Press record, take your hand away, count 8 seconds. Any sway reads as amateur (runbook).',
        'Night: dead-still',
      ),
      h(
        'div',
        { class: 'ln-grid' },
        kitchen.map(([t, d], i) =>
          h(
            'div',
            { class: 'ln-card rig-hold' },
            h(
              'span',
              { class: 'rig-hold-n ln-num' },
              String(i + 1).padStart(2, '0'),
            ),
            h('h3', { class: 'ln-h3' }, t),
            h('p', null, d),
          ),
        ),
      ),
      mini(
        'Pixel stabilization modes',
        h(
          'p',
          { class: 'ln-small ln-muted' },
          ui.path('Video', 'Video settings', 'Stabilization'),
          ' · Standard / Locked / Active. Cinematic Pan is a separate Video sub-mode.',
        ),
        ois,
        h(
          'p',
          { class: 'ln-small ln-muted' },
          'Blackmagic Camera: Stabilization OFF when braced, ON handheld.',
        ),
      ),
      ui.callout(
        'verify',
        'Active being 1080p30-only comes from one test; Google’s spec lists Active at 1080p. In Video settings, pick Active and see whether 4K and 60 fps grey out.',
      ),
    )
  }

  /* ================================================================ section 7: device facts */
  function sectionFacts() {
    const summary = h('div', {
      class: 'ln-card rig-facts-sum',
      'aria-live': 'polite',
    })
    const answer = (key, v) => {
      const f = readFacts()
      f[key] = v
      LN.store.set(FACTS_KEY, f)
      LN.bus.emit('devicefacts', f)
    }
    const cards = FACTS.map(fact => {
      const btns = [
        [true, 'Yes'],
        [false, 'No'],
        [null, 'Not checked'],
      ].map(([v, label]) =>
        h(
          'button',
          {
            type: 'button',
            'aria-pressed': 'false',
            dataset: { v: String(v) },
            onClick: () => answer(fact.key, v),
          },
          label,
        ),
      )
      const result = h('p', { class: 'rig-fact-result ln-small' })
      const card = h(
        'article',
        { class: 'ln-card rig-fact' },
        h(
          'div',
          { class: 'ln-row rig-fact-tags' },
          ui.chip(fact.app, 'amber'),
          confChip(fact.status),
          h('code', { class: 'ln-faint ln-small' }, fact.key),
        ),
        h('h3', { class: 'ln-h3' }, fact.q),
        h(
          'ol',
          { class: 'rig-fact-check' },
          fact.check.map(c => h('li', null, Array.isArray(c) ? ui.path(c) : c)),
        ),
        h(
          'div',
          {
            class: 'ln-seg rig-fact-ans',
            role: 'group',
            'aria-label': `Answer: ${fact.q}`,
          },
          btns,
        ),
        result,
      )
      watchFacts(f => {
        const v =
          f[fact.key] === true ? true : f[fact.key] === false ? false : null
        for (const b of btns)
          b.setAttribute('aria-pressed', String(b.dataset.v === String(v)))
        card.dataset.state = v === true ? 'yes' : v === false ? 'no' : 'none'
        result.textContent =
          v === true ? `Yes: ${fact.yes}` : v === false ? `No: ${fact.no}` : ''
        result.hidden = v === null
      }, card)
      return { fact, card }
    })
    const summaryText = f => {
      const lines = FACTS.map(x => {
        const v = f[x.key]
        const a = v === true ? 'YES' : v === false ? 'NO' : 'not checked'
        return `${x.key}: ${a} · ${x.q}`
      })
      return `Kubrick device facts (Pixel 10 Pro XL)\n${lines.join('\n')}`
    }
    watchFacts(f => {
      const yes = FACTS.filter(x => f[x.key] === true)
      const no = FACTS.filter(x => f[x.key] === false)
      const done = yes.length + no.length
      summary.replaceChildren(
        h(
          'div',
          { class: 'rig-facts-stats' },
          ui.stat(`${done}/${FACTS.length}`, 'Settled'),
          ui.stat(String(yes.length), 'Yes'),
          ui.stat(String(no.length), 'No'),
        ),
        done
          ? h(
              'ul',
              { class: 'rig-facts-list' },
              [...yes, ...no].map(x =>
                h(
                  'li',
                  { dataset: { state: f[x.key] ? 'yes' : 'no' } },
                  h('b', null, f[x.key] ? 'Yes' : 'No'),
                  h('span', null, x.q),
                ),
              ),
            )
          : ui.empty(
              'Nothing settled yet. Start with the LUT check: it takes 60 seconds and decides your grade route.',
            ),
        h(
          'div',
          { class: 'ln-row' },
          ui.btn(
            'Copy results',
            () =>
              LN.copy(summaryText(readFacts()), {
                label: 'Device facts copied',
              }),
            {
              kind: 'ghost',
              small: true,
            },
          ),
        ),
      )
    }, summary)
    const byApp = ['CapCut', 'Pixel Camera', 'Blackmagic']
    return ui.section(
      {
        eyebrow: '07 · Settle it on your phone',
        title: 'Settle it on your phone',
        lede: `${FACTS.length} things the research could not confirm. Each takes under a minute on the Pixel. Your answers stay on this phone and every page of the OS reads them.`,
        id: 'rig-facts',
      },
      summary,
      byApp.map(app =>
        h(
          'div',
          { class: 'ln-stack' },
          h('h3', { class: 'ln-h3 rig-facts-app' }, app),
          h(
            'div',
            { class: 'ln-grid' },
            cards.filter(c => c.fact.app === app).map(c => c.card),
          ),
        ),
      ),
    )
  }

  /* ================================================================ section 8: audio */
  function sectionAudio() {
    const mics = ui.table(
      ['Mic', 'Where', 'On set'],
      [
        [
          'Top',
          'Top edge hole',
          'Camera video records from it. In vertical it faces up: fine for a room, weak for a pan below you.',
        ],
        [
          'Bottom',
          'Bottom edge, left of USB-C (Pro XL)',
          'Your palm covers it in a right-hand landscape grip. Turn the phone 180° so USB-C faces left.',
        ],
        [
          'Rear',
          'Back, beside the cameras',
          'Faces whatever the main camera sees: the pan, the plate. Keep fingers off the right end of the bar.',
        ],
      ],
      { label: 'Microphone positions' },
    )
    const speech = ui.table(
      ['Shot', 'Speech enhancement', 'Why'],
      [
        [
          'Documentary monologue',
          'ON',
          'Pulls your voice out of the hood fan and the room.',
        ],
        [
          'Raw sizzle, knife work, pours',
          'OFF',
          'It treats the sizzle as noise and thins it. The sound is the shot.',
        ],
        [
          'Night Reel',
          'OFF',
          'No voice in the reel; the night sound plays at 100 or not at all.',
        ],
        [
          'Marketplace Review',
          'ON when you talk, OFF for the bite',
          'Little talking on camera; the crunch matters more.',
        ],
      ],
      { label: 'Speech enhancement by shot' },
    )
    return ui.section(
      {
        eyebrow: '08 · Native audio',
        title: 'Native audio',
        lede: 'Three mics, two settings that matter, and one rule: know where your hands are.',
        id: 'rig-audio',
      },
      h(
        'div',
        { class: 'ln-grid wide' },
        mini('Where the mics are', mics),
        mini(
          'Speech enhancement: on or off',
          speech,
          h(
            'p',
            { class: 'ln-small ln-muted' },
            'Closest wording: ',
            ui.path('Video', 'Video settings', 'Speech enhancement'),
            '. On Pixel 11 it sits under Creator. It likely drops out at higher frame rates, so record monologues at 24 or 30.',
          ),
          factLine('pixel_speech_enh', {
            yes: 'Your build has the toggle in Video settings.',
            no: 'No toggle on your build: use your DJI mic for monologues.',
            none: 'Its place on the Pixel 10 Pro is unverified (section 7).',
          }),
        ),
      ),
      h(
        'div',
        { class: 'ln-grid' },
        mini(
          'If you use your DJI mic',
          h(
            'p',
            { class: 'ln-prose ln-small' },
            'Voice peaks at −6 to −3 dB; music sits at −18 to −12 dB under it, ducked when you speak. The DJI signal is already clean, so resist over-processing (playbook).',
          ),
          ui.callout(
            'verify',
            'Which input Pixel Camera or Blackmagic Camera records when the receiver is plugged in was not researched. Check: plug it in, record 5 s while you rub the transmitter, play it back. If you hear the rub, the app is using the DJI mic.',
          ),
        ),
        mini(
          'Audio zoom and clean-up',
          h(
            'p',
            { class: 'ln-prose ln-small' },
            'Audio zoom narrows the mics toward the zoomed subject. Try it on a 5x sizzle across the pass; leave it off for a room.',
          ),
          ui.path('Settings', 'More settings', 'Video', 'Audio zoom'),
          h(
            'p',
            { class: 'ln-prose ln-small' },
            'After the shoot, Google Photos can lower one sound, such as the hood fan:',
          ),
          ui.path('Google Photos', 'video', 'Edit', 'Audio', 'Audio Eraser'),
          ui.callout(
            'verify',
            'Wind noise reduction is listed but no switch was found; it may be automatic. Audio zoom’s place in More settings is from one outlet.',
          ),
        ),
      ),
    )
  }

  /* ================================================================ register */
  LN.register({
    id: 'rig',
    num: 1,
    title: 'Rig',
    short: 'Rig',
    kicker: 'PRE-FLIGHT',
    blurb:
      'Know the Pixel 10 Pro XL, dial the camera per format, and run pre-flight before the first take.',
    lede: 'Everything that happens before you press record: the camera map, the settings for each format in Blackmagic Camera and Pixel Camera, the pre-flight checklist, the flicker maths, white balance, how to hold the phone, and the facts you settle on your own phone.',
    outputs: [
      'Pixel 10 Pro XL camera map',
      'Capture presets by format',
      'Pre-flight checklist',
      'Shutter & flicker calculator',
    ],
    mount(el) {
      const jumps = [
        ['rig-map', 'Camera map'],
        ['rig-presets', 'Presets'],
        ['rig-preflight', 'Pre-flight'],
        ['rig-calc', 'Flicker'],
        ['rig-wb', 'White balance'],
        ['rig-hold', 'Holding'],
        ['rig-facts', 'Settle it'],
        ['rig-audio', 'Audio'],
      ]
      const nav = h(
        'nav',
        { class: 'rig-jump', 'aria-label': 'Rig sections' },
        jumps.map(([id, label], i) =>
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                const t = el.querySelector(`#${id}`)
                if (t) scrollToEl(t)
              },
            },
            h('span', { class: 'ln-num' }, String(i + 1).padStart(2, '0')),
            label,
          ),
        ),
      )
      const map = sectionMap()
      const presets = sectionPresets(mode => {
        map.hud.replaceChildren(
          h('span', { class: 'rig-hud-rec' }, 'REC'),
          h('b', null, mode.label),
          mode.hud.map(v => h('span', null, v)),
        )
      })
      el.append(
        nav,
        map.el,
        presets,
        sectionPreflight(),
        sectionCalc(),
        sectionWB(),
        sectionHolding(),
        sectionFacts(),
        sectionAudio(),
      )
      // Pause the light sweep when the Rig is off screen.
      const paused = id => el.classList.toggle('rig-paused', id !== 'rig')
      LN.bus.on('route', paused)
    },
  })
})()
