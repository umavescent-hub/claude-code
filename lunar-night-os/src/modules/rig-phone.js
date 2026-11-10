/* modules/rig-phone.js — LN.rigPhone
   A to-scale 3D Obsidian Pixel 10 Pro XL (three.js r128 from cdnjs, with a
   CSS-3D fallback when the script cannot load) whose display runs simulated
   Blackmagic Camera and Pixel Camera layouts drawn on a canvas.
   Facts: research/pixel-hw.md, research/pixel-app.md and the LunarNight v2
   runbook. Every estimate carries a confidence label; nothing here is a
   published spec unless it is marked confirmed.
   API: LN.rigPhone = { mount(el, opts), setApp(id), setPreset(id), SPECS } */
;(() => {
  const LN = window.LN
  const { h, ui } = LN
  const { clamp, lerp } = LN.math
  const PI = Math.PI
  const THREE_URL =
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'

  /* ================================================================ hardware
     Millimetres. Body size and display size are published; the camera bar,
     corner radius and every position inside the bar are estimates. */
  const MM = {
    w: 76.6,
    h: 162.8,
    d: 8.5,
    r: 11.5,
    bevel: 0.9,
    // 6.8 in diagonal at 1344 x 2992 works out to 70.76 x 157.53 mm.
    screen: { w: 70.76, h: 157.53, r: 9 },
    hole: { fromTop: 5.4, r: 1.9 },
    bar: { w: 61, h: 23.5, lift: 3.3, fromTop: 14.5, bevel: 0.7 },
    glass: { w: 44, h: 17.5, cx: -8 },
    lensR: 6.2,
  }
  const BAR_Y = MM.h / 2 - MM.bar.fromTop - MM.bar.h / 2
  const BAR_Z = MM.d / 2 + MM.bar.lift

  const CONF = {
    confirmed: 'confirmed',
    likely: 'likely',
    unverified: 'unverified',
    contradicted: 'sources disagree',
    estimate: 'estimate',
  }
  const needsVerify = c => c !== 'confirmed'

  /* Parts with a hotspot. `face` + `at` place the marker:
     back   = [x, y] as seen from the back (x runs left to right), mm from centre
     front  = [x, y] as seen from the front
     top / bottom = [x] along the edge as seen from the front. */
  const PARTS = {
    wide: {
      name: 'Wide camera · 1x',
      kind: 'Rear lens',
      face: 'back',
      at: [-21.5, BAR_Y],
      zoom: 0,
      rows: [
        ['Resolution', '50 MP, Octa PD', 'confirmed'],
        ['Aperture', 'ƒ/1.68', 'confirmed'],
        ['Sensor size', '1/1.3 in', 'confirmed'],
        ['Equivalent focal length', 'about 24–25 mm', 'confirmed'],
        ['Field of view', '82° diagonal', 'confirmed'],
        ['Stabilisation', 'Optical + electronic', 'confirmed'],
        ['Sensor', 'Samsung ISOCELL GNV, 1.2 µm', 'likely'],
        ['Closest focus', 'No published figure', 'unverified'],
      ],
      use: 'Your night lens. It has the biggest sensor and the fastest glass, and Google’s own advice is that 1x does best in low light. The 2x chip is a centre crop of this sensor, so 2x keeps the same ƒ/1.68.',
      place: [
        'Drawn leftmost in the bar. Sources disagree on whether the wide or the ultrawide sits on the left.',
        'contradicted',
      ],
    },
    ultrawide: {
      name: 'Ultrawide camera · 0.5x',
      kind: 'Rear lens',
      face: 'back',
      at: [-8, BAR_Y],
      zoom: 0,
      rows: [
        ['Resolution', '48 MP, Quad PD, autofocus', 'confirmed'],
        ['Aperture', 'ƒ/1.7', 'confirmed'],
        [
          'Sensor size',
          '1/2.51 in (Google Store) or 1/2.55 in',
          'contradicted',
        ],
        ['Equivalent focal length', '12 mm or 13 mm', 'contradicted'],
        ['Field of view', '123° diagonal', 'confirmed'],
        ['Stabilisation', 'No optical stabiliser listed', 'likely'],
        ['Closest focus', 'about 2 cm with Macro Focus', 'likely'],
      ],
      use: 'The macro texture shot: get about 3 inches from the plate and the Pixel flips this lens to Macro Focus. Keep it off the night exteriors. The runbook says 1x or 2x, never the ultrawide.',
      place: [
        'Drawn in the middle. Sources disagree on wide versus ultrawide on the left.',
        'contradicted',
      ],
    },
    tele: {
      name: 'Telephoto camera · 5x',
      kind: 'Rear lens',
      face: 'back',
      at: [5.5, BAR_Y],
      zoom: 0,
      rows: [
        ['Resolution', '48 MP, Quad PD', 'confirmed'],
        ['Aperture', 'ƒ/2.8', 'confirmed'],
        [
          'Sensor size',
          '1/2.51 in (Google Store) or 1/2.55 in',
          'contradicted',
        ],
        [
          'Equivalent focal length',
          '110–113 mm (one lab says 128)',
          'contradicted',
        ],
        ['Field of view', '22° diagonal', 'confirmed'],
        ['Stabilisation', 'Optical', 'confirmed'],
        ['Design', 'Folded periscope', 'confirmed'],
        ['Closest focus', 'about 30 cm, manual focus only', 'likely'],
      ],
      use: 'The 5x squeeze: step back 6 feet and let it flatten the plate against the background. ƒ/2.8 passes roughly a stop and a half less light than the 1x, so after dark stay on 1x or 2x.',
      place: ['Rightmost lens, next to the flash.', 'likely'],
    },
    ldaf: {
      name: 'Laser autofocus (LDAF)',
      kind: 'Sensor',
      face: 'back',
      at: [14.2, BAR_Y + 1.7],
      zoom: 1,
      rows: [
        ['Type', 'Multi-zone laser detect autofocus', 'confirmed'],
        ['Laser class', 'Class 1', 'confirmed'],
      ],
      use: 'Measures distance so autofocus can land in the dark. For a locked night frame you still tap the lit wall, focus by hand and lock it.',
      place: ['Near the flash, right of the lenses.', 'likely'],
    },
    flicker: {
      name: 'Spectral and flicker sensor',
      kind: 'Sensor',
      face: 'back',
      at: [14.2, BAR_Y - 3.3],
      zoom: 1,
      rows: [
        [
          'Listed by Google',
          'Yes, among the rear camera features',
          'confirmed',
        ],
        ['What it does', 'Not documented by Google', 'unverified'],
      ],
      use: 'Sensors of this class read mains and LED flicker and the colour of the light. Pixel Camera has no anti-flicker switch, so under kitchen LEDs you pick the safe shutter yourself: 1/60 s.',
      place: ['Exact window position was not found.', 'unverified'],
    },
    flash: {
      name: 'LED flash',
      kind: 'Light',
      face: 'back',
      at: [22.4, BAR_Y + 3.7],
      zoom: 0,
      rows: [
        ['Type', 'LED flash', 'confirmed'],
        ['One LED or two', 'Not settled', 'unverified'],
      ],
      use: 'Leave it off. On-axis flash flattens a plate, and at night it wipes out the dark frame the look depends on.',
      place: ['On the bar, right of the camera glass.', 'likely'],
    },
    temp: {
      name: 'Temperature sensor',
      kind: 'Sensor',
      face: 'back',
      at: [22.4, BAR_Y - 4.1],
      zoom: 1,
      rows: [['Fitted to', 'Pro and Pro XL only', 'confirmed']],
      use: 'Not part of the camera. It sits beside the flash; keep a thumb off it and the lenses stay clean too.',
      place: ['Beside the flash.', 'confirmed'],
    },
    micRear: {
      name: 'Rear microphone',
      kind: 'Microphone',
      face: 'back',
      at: [27.4, BAR_Y],
      zoom: 1,
      rows: [
        ['Count', 'One of three microphones', 'confirmed'],
        ['Labelled by Google', 'Rear-facing microphone', 'confirmed'],
      ],
      use: 'Faces what you are filming. Keep fingers off the right end of the bar when you hold the phone.',
      place: ['Right of the cameras, near the flash.', 'likely'],
    },
    micTop: {
      name: 'Top microphone',
      kind: 'Microphone',
      face: 'top',
      at: [15],
      zoom: 0,
      rows: [
        ['Where', 'A hole on the top edge', 'confirmed'],
        ['Used for', 'Video recording, per Google’s mic test', 'confirmed'],
      ],
      use: 'This one hears your verdict. Do not cover the top edge with a finger or a clamp.',
      place: ['Position along the edge is an estimate.', 'estimate'],
    },
    micBottom: {
      name: 'Bottom microphone',
      kind: 'Microphone',
      face: 'bottom',
      at: [-12.5],
      zoom: 0,
      rows: [
        ['Where', 'Left of the USB-C port on the Pro XL', 'confirmed'],
        ['Speaker', 'Right of the port', 'confirmed'],
      ],
      use: 'A right-handed landscape grip covers it and the sound goes muffled. Turn the phone so the USB-C port faces left.',
      place: ['Distance from the port is an estimate.', 'estimate'],
    },
    front: {
      name: 'Front camera',
      kind: 'Front lens',
      face: 'front',
      at: [0, MM.screen.h / 2 - MM.hole.fromTop],
      zoom: 0,
      rows: [
        ['Resolution', '42 MP, Dual PD, autofocus', 'confirmed'],
        ['Aperture', 'ƒ/2.2', 'confirmed'],
        ['Field of view', '103°', 'confirmed'],
        [
          'Equivalent focal length',
          'about 17 mm, worked out from 103°',
          'unverified',
        ],
        ['Sensor size', 'Not published', 'unverified'],
        ['Video', '4K at 30 or 60 fps', 'confirmed'],
      ],
      use: 'Bite + verdict: arm out, take the bite, say it once. It is wide, so keep your face in the middle third.',
      place: ['Centred punch-hole; its height is an estimate.', 'estimate'],
    },
  }
  const PART_IDS = Object.keys(PARTS)

  const SPECS = {
    model: 'Google Pixel 10 Pro XL, Obsidian',
    body: [
      ['Size', '162.8 × 76.6 × 8.5 mm', 'confirmed'],
      ['Weight', '232 g', 'confirmed'],
      ['Frame', 'Polished aluminium', 'confirmed'],
      ['Glass', 'Gorilla Glass Victus 2, matte back', 'confirmed'],
      ['Display', '6.8 in LTPO OLED, 1344 × 2992, 1–120 Hz', 'confirmed'],
      ['Brightness', 'up to 2,200 nits HDR, 3,300 peak', 'confirmed'],
      ['Ingress', 'IP68', 'confirmed'],
      ['Microphones', 'Three', 'confirmed'],
    ],
    parts: PARTS,
    mm: MM,
    approximate: [
      'Corner radius (11.5 mm) and the edge chamfer. Google does not publish them.',
      'Camera bar size, height above the back and distance from the top edge. The research gives its shape, not its measurements.',
      'Lens order. The telephoto on the right is likely; wide versus ultrawide on the left is disputed. Drawn as wide, ultrawide, telephoto.',
      'Lens ring diameters and spacing inside the camera glass.',
      'The laser autofocus and flicker sensor windows. Google places them near the flash; the exact spot was not found.',
      'Flash drawn as one LED. One source says two.',
      'Rear microphone hole, top microphone hole and bottom microphone distance from the port.',
      'Power and volume keys: drawn on the right edge with power above volume, the usual Pixel layout. The research file does not cover them.',
      'Punch-hole size and height, USB-C opening and speaker slot sizes.',
      'No logo is drawn on the back.',
    ],
  }

  /* ================================================================ camera settings */
  const LENSES = [
    {
      id: '0.5x',
      chip: '.5',
      part: 'ultrawide',
      f: 'ƒ/1.7',
      stop: 1.7,
      zoom: 0.5,
    },
    { id: '1x', chip: '1', part: 'wide', f: 'ƒ/1.68', stop: 1.68, zoom: 1 },
    { id: '2x', chip: '2', part: 'wide', f: 'ƒ/1.68', stop: 1.68, zoom: 2 },
    { id: '5x', chip: '5', part: 'tele', f: 'ƒ/2.8', stop: 2.8, zoom: 5 },
  ]
  const FPS = [24, 25, 30, 60]
  const PX_FPS = [24, 30, 60]
  const ANGLES = [
    45, 60, 72, 90, 108, 120, 144, 150, 172.8, 180, 216, 270, 324, 360,
  ]
  const ISOS = [
    100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000,
    2500, 3200,
  ]
  const SPEEDS = [24, 30, 48, 50, 60, 96, 100, 120, 240, 480, 1000]
  const WB_MIN = 2500
  const WB_MAX = 10000
  const WB_QUICK = [2800, 3200, 4000, 5600, 6500]
  const STABS = ['Standard', 'Locked', 'Active', 'Cinematic Pan']
  const LUTS = ['Violet', 'Blue', 'Soft']
  const lensOf = id => LENSES.find(l => l.id === id) || LENSES[1]
  const expTime = s => s.angle / (360 * s.fps)
  const fmtAngle = a => `${Number.isInteger(a) ? a : a.toFixed(1)}°`
  const fmtSpeed = s => {
    const d = 1 / expTime(s)
    return `1/${d >= 100 ? Math.round(d) : Math.round(d * 10) / 10}`
  }
  const fmtEv = v => (Math.abs(v) < 0.05 ? '0.0' : LN.fmt.signed(v, 1))
  const shadowWord = v =>
    v <= -0.95
      ? 'All the way down'
      : v < -0.15
        ? 'Lowered'
        : v <= 0.15
          ? 'Neutral'
          : 'Raised'

  const BASE = {
    vertical: true,
    lens: '1x',
    res: '4K',
    fps: 24,
    angle: 180,
    iso: 400,
    wb: 4000,
    tint: 0,
    lut: 'Violet',
    lutOn: false,
    lutRec: false,
    zebra: true,
    peak: true,
    bmStab: false,
    bmNR: false,
    bmSharp: false,
    wbLock: true,
    bmHdr: false,
    stab: 'Standard',
    hdr10: false,
    boost: false,
    night: false,
    ev: 0,
    shadows: 0,
    focus: 0.5,
  }

  const WHY_NIGHT = {
    lens: 'Main lens. The runbook: 1x or 2x, never the ultrawide.',
    res: '4K, HEVC, Rec.709, HDR off. The reel still exports at 1080p.',
    fps: '24 fps in, 24 fps out.',
    shutter: '360° is 1/24 s. That is what smears tail lights into streaks.',
    iso: 'Start at 400. Expose with ISO only and stay under 1600.',
    wb: '3200K turns the dusk sky violet-blue. About 70% of the look is made here.',
    tint: 'Leave it at 0.',
    lut: 'Display LUT on, so the viewfinder is your review. Record LUT to Clip on when you edit in CapCut, which cannot load .cube files.',
    zebra: 'At 95%. Stripes belong only inside the brightest bulb.',
    peak: 'Check the building edges light up, then lock focus.',
    stab: 'You are braced dead-still, so Blackmagic stabilization stays off. On Pixel Camera use Standard or Locked.',
    ev: '0 with manual shutter and ISO. Use −1.5 to −2 only if your version has no shutter or ISO.',
    shadows: 'All the way down.',
    hdr10: 'Off. The LUTs expect Rec.709.',
    boost: 'Off. It brightens the night and turns your blacks grey.',
    night: 'Off, for the same reason.',
  }
  const WHY_FOOD = {
    lens: '1x for most of the shot list. 0.5x is the macro texture shot and 5x is the squeeze.',
    res: '4K capture, 1080p export.',
    fps: '30 fps. The review exports at 30.',
    shutter: '180° is 1/60 s at 30 fps: motion looks natural.',
    iso: 'The lowest ISO that still looks bright. 100 here; use the lowest your app offers.',
    wb: 'Locked, so the plate cannot shift colour mid-shot. 4000K is a placeholder: lock it on your own light until a white napkin reads white.',
    tint: 'Leave it at 0 unless the napkin goes green or pink.',
    lut: 'Off. Colour happens in CapCut: Filters at 20–40, then Apply to all.',
    zebra: 'Keep stripes off the plate. Sauce highlights may clip a little.',
    peak: 'Focus peaking on.',
    stab: 'Standard for handheld. Locked when the phone sits on the table.',
    ev: 'Leave at 0.',
    shadows: 'Leave neutral.',
    hdr10: 'Off, so CapCut gets plain Rec.709.',
    boost: 'Off. The file would need a cloud pass before you can cut.',
    night: 'Off.',
  }

  const PRESETS = [
    {
      id: 'night-violet',
      name: 'Night Reel · Violet',
      short: 'Night · Violet',
      scene: 'night',
      note: 'The green-house reel. Plant the phone, expose for the lights, roll 8 seconds.',
      set: {
        fps: 24,
        angle: 360,
        iso: 400,
        wb: 3200,
        lut: 'Violet',
        lutOn: true,
        lutRec: true,
        shadows: -1,
        focus: 0.8,
      },
      why: WHY_NIGHT,
    },
    {
      id: 'night-blue',
      name: 'Night Reel · Blue',
      short: 'Night · Blue',
      scene: 'night',
      note: 'The small-town reel. Colder white balance and the Blue LUT.',
      set: {
        fps: 24,
        angle: 360,
        iso: 400,
        wb: 2800,
        lut: 'Blue',
        lutOn: true,
        lutRec: true,
        shadows: -1,
        focus: 0.8,
      },
      why: {
        ...WHY_NIGHT,
        wb: '2800K pushes the sky deep blue instead of violet.',
      },
    },
    {
      id: 'market',
      name: 'Marketplace Review',
      short: 'Marketplace',
      scene: 'dish',
      note: 'Step 2 of your God Mode loop. Wipe the lens, then hold every shot 3 seconds.',
      set: { fps: 30, angle: 180, iso: 100, wb: 4000, focus: 0.45 },
      why: WHY_FOOD,
    },
    {
      id: 'kitchen',
      name: 'Kitchen & R&D',
      short: 'Kitchen',
      scene: 'dish',
      note: 'On the pass and in the lab. Under LED work lights use 1/60 s.',
      set: { fps: 24, angle: 180, iso: 200, wb: 4000, ev: -0.5, focus: 0.45 },
      why: {
        ...WHY_FOOD,
        fps: '24 fps for the documentary and the lab.',
        shutter:
          '180° is 1/48 s. Under LED work lights switch to 1/60 s (144° at 24 fps) to dodge banding.',
        iso: 'Set by eye. 200 is a placeholder; keep zebras off the plate.',
        wb: '3800–4200K for kitchen light. Start at 4000K and lock it.',
        ev: '−0.3 to −0.7 on Pixel Camera holds the highlights on the plate.',
        lut: 'Off while you shoot. Grade the kitchen look in the edit.',
      },
    },
    {
      id: 'slowmo',
      name: 'Slow-mo pour',
      short: 'Slow-mo pour',
      scene: 'pour',
      note: 'The cheese pull, pour or crack. Shoot it at 60 so CapCut can play it at half speed.',
      set: { fps: 60, angle: 180, iso: 200, wb: 4000, focus: 0.45 },
      why: {
        ...WHY_FOOD,
        fps: '60 fps. Never slow a clip below 0.5x without a 60 fps source.',
        shutter: '180° at 60 fps is 1/120 s. Each drop stays crisp.',
        iso: 'A faster shutter needs more light: raise ISO or add a lamp. 200 is a placeholder.',
        hdr10: 'Off. On-device 10-bit HDR stops at 4K30 anyway.',
        stab: 'Standard. Active drops to 1080p and is not offered at high frame rates.',
      },
    },
  ]
  const presetOf = id => PRESETS.find(p => p.id === id) || PRESETS[0]
  const presetState = p => ({ ...BASE, ...p.set })
  // Exposure that the preset is built around (ISO x seconds / stop squared).
  const presetExposure = p => {
    const s = presetState(p)
    const L = lensOf(s.lens)
    return (s.iso * expTime(s)) / (L.stop * L.stop)
  }

  /* What pixel-app.md could not confirm about the stock app. Shown in the
     readout, never on the simulated screen. */
  const PX_VERIFY = {
    sheet:
      'Google’s help puts Video settings at the bottom left and the Pro controls at the bottom right. Your runbook opens both from the bottom-right sliders icon.',
    wb: 'White balance works in video on Pro phones (likely). The Kelvin range is not published.',
    shutter:
      'Sources disagree on whether shutter speed can be set in video. Which speeds are offered is not published.',
    iso: 'Sources disagree on whether ISO can be set in video. The range is not published.',
    focus:
      'Manual focus in video is disputed, and focus peaking is confirmed for photos only.',
    shadows: 'The Shadows slider in video is unverified.',
    stab: 'Standard, Locked and Active are confirmed. Cinematic Pan is a separate “Pan” mode in Google’s help, not a Stabilization option.',
    night:
      'Night Sight video runs through Video Boost. A separate switch is unverified.',
    lens: 'The 2x chip is inferred and a 10x chip is likely. Whether manual lens selection applies in video is unverified.',
    lock: 'Google documents a “Lock” button after you tap the subject. Tap-and-hold to lock is disputed.',
  }

  /* ================================================================ LUT glue */
  const lutApi = () => globalThis.LN_LUT || LN.lut || null
  const lutCache = {}
  function lutTable(key) {
    if (lutCache[key] !== undefined) return lutCache[key]
    const d = LN.data && LN.data.lutsV2
    const look = d && d.looks && d.looks[key]
    if (!look || !lutApi()) {
      lutCache[key] = null
      return null
    }
    try {
      const bin = atob(look.data)
      const n = bin.length >> 1
      const t = new Float32Array(n)
      for (let i = 0; i < n; i++)
        t[i] =
          (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) / 65535
      lutCache[key] = { table: t, size: d.size || 33 }
    } catch (_e) {
      lutCache[key] = null
    }
    return lutCache[key]
  }
  /* Fallback when the v2 tables are not on the page: crush under 2.5%, push
     darks violet or blue, a little saturation. */
  function approxLook(d, key) {
    const violet = key !== 'Blue'
    const soft = key === 'Soft'
    for (let p = 0; p < d.length; p += 4) {
      let r = d[p] / 255
      let g = d[p + 1] / 255
      let b = d[p + 2] / 255
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const crush = soft ? 0.016 : 0.025
      const k = clamp((l - crush) / 0.22, 0, 1)
      const dark = 1 - clamp(l / 0.3, 0, 1)
      // split-tone the darks
      const tr = violet ? 0.16 : 0.05
      const tb = violet ? 0.26 : 0.3
      r = r * k + dark * tr * l * 2
      g = g * k
      b = b * k + dark * tb * l * 2
      const m = (r + g + b) / 3
      const sat = 1.1
      r = m + (r - m) * sat
      g = m + (g - m) * sat
      b = m + (b - m) * sat
      d[p] = clamp(r, 0, 1) * 255
      d[p + 1] = clamp(g, 0, 1) * 255
      d[p + 2] = clamp(b, 0, 1) * 255
    }
  }

  /* ================================================================ colour maths */
  // Kelvin → linear-ish RGB gains (Tanner Helland fit), green-normalised.
  function kelvinRGB(k) {
    const t = clamp(k, 1000, 40000) / 100
    let r
    let g
    let b
    if (t <= 66) {
      r = 255
      g = 99.4708 * Math.log(t) - 161.1196
      b = t <= 19 ? 0 : 138.5177 * Math.log(t - 10) - 305.0448
    } else {
      r = 329.6987 * (t - 60) ** -0.1332
      g = 288.1222 * (t - 60) ** -0.0755
      b = 255
    }
    r = clamp(r, 0, 255) / 255
    g = clamp(g, 1, 255) / 255
    b = clamp(b, 0, 255) / 255
    return [r / g, 1, b / g]
  }
  /* Camera gains that neutralise light of `wb` K, applied to a scene lit at
     `sceneK`. Lower WB than the light → bluer picture. */
  function wbGains(wb, sceneK, tint) {
    const s = kelvinRGB(sceneK)
    const w = kelvinRGB(wb)
    const t = 1 - clamp(tint, -50, 50) / 160
    return [s[0] / w[0], t, s[2] / w[2]]
  }

  /* ================================================================ scenes */
  const SCENE_K = { night: 4300, dish: 4000, pour: 4000 }
  function drawNight(c, w, h, t, st) {
    const sky = c.createLinearGradient(0, 0, 0, h * 0.66)
    sky.addColorStop(0, '#120c2a')
    sky.addColorStop(0.55, '#2a1b55')
    sky.addColorStop(1, '#4a2f6e')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    // light pollution at the horizon
    const hz = c.createLinearGradient(0, h * 0.5, 0, h * 0.66)
    hz.addColorStop(0, 'rgba(120,80,140,0)')
    hz.addColorStop(1, 'rgba(140,90,150,0.35)')
    c.fillStyle = hz
    c.fillRect(0, h * 0.5, w, h * 0.16)
    // moon
    const mx = w * 0.8
    const my = h * 0.13
    const mg = c.createRadialGradient(mx, my, 2, mx, my, w * 0.1)
    mg.addColorStop(0, 'rgba(255,250,235,0.75)')
    mg.addColorStop(0.35, 'rgba(230,220,255,0.18)')
    mg.addColorStop(1, 'rgba(200,190,255,0)')
    c.fillStyle = mg
    c.fillRect(mx - w * 0.1, my - w * 0.1, w * 0.2, w * 0.2)
    c.fillStyle = '#fff7e8'
    c.beginPath()
    c.arc(mx, my, w * 0.028, 0, PI * 2)
    c.fill()
    // ground
    c.fillStyle = '#07060a'
    c.fillRect(0, h * 0.66, w, h * 0.34)
    // house
    const hx = w * 0.16
    const hy = h * 0.44
    const hw = w * 0.68
    const hh = h * 0.23
    c.fillStyle = '#0d0b12'
    c.fillRect(hx, hy, hw, hh)
    c.beginPath()
    c.moveTo(hx - w * 0.04, hy)
    c.lineTo(hx + hw / 2, hy - h * 0.1)
    c.lineTo(hx + hw + w * 0.04, hy)
    c.closePath()
    c.fillStyle = '#0a0810'
    c.fill()
    // green porch light
    const px = hx + hw * 0.3
    const py = hy + hh * 0.3
    const pg = c.createRadialGradient(px, py, 1, px, py, w * 0.22)
    pg.addColorStop(0, 'rgba(60,255,110,0.95)')
    pg.addColorStop(0.12, 'rgba(40,200,90,0.55)')
    pg.addColorStop(0.5, 'rgba(20,110,50,0.18)')
    pg.addColorStop(1, 'rgba(0,60,20,0)')
    c.fillStyle = pg
    c.fillRect(px - w * 0.22, py - w * 0.22, w * 0.44, w * 0.44)
    c.fillStyle = '#d8ffe0'
    c.beginPath()
    c.arc(px, py, w * 0.012, 0, PI * 2)
    c.fill()
    // door under the porch light
    c.fillStyle = '#0f2a16'
    c.fillRect(px - w * 0.05, py + h * 0.03, w * 0.1, hh * 0.68)
    // warm window
    const wx = hx + hw * 0.7
    const wy = hy + hh * 0.42
    const wg = c.createRadialGradient(wx, wy, 1, wx, wy, w * 0.16)
    wg.addColorStop(0, 'rgba(255,170,70,0.5)')
    wg.addColorStop(1, 'rgba(255,140,40,0)')
    c.fillStyle = wg
    c.fillRect(wx - w * 0.16, wy - w * 0.16, w * 0.32, w * 0.32)
    c.fillStyle = '#ffb347'
    c.fillRect(wx - w * 0.06, wy - h * 0.035, w * 0.12, h * 0.07)
    c.fillStyle = '#3a1e08'
    c.fillRect(wx - w * 0.004, wy - h * 0.035, w * 0.008, h * 0.07)
    c.fillRect(wx - w * 0.06, wy - h * 0.002, w * 0.12, h * 0.004)
    // street and a passing car (tail lights streak with a slow shutter)
    const streak = clamp((st.angle - 150) / 210, 0, 1)
    const carX = w * (-0.2 + LN.math.fract(t * 0.11) * 1.4)
    const cy = h * 0.8
    c.fillStyle = '#060509'
    c.fillRect(carX - w * 0.1, cy - h * 0.03, w * 0.2, h * 0.05)
    const lamp = (x, y, col, len) => {
      if (len > 0) {
        const lg = c.createLinearGradient(x - len, y, x, y)
        lg.addColorStop(0, `rgba(${col},0)`)
        lg.addColorStop(1, `rgba(${col},0.9)`)
        c.strokeStyle = lg
        c.lineWidth = h * 0.012
        c.lineCap = 'round'
        c.beginPath()
        c.moveTo(x - len, y)
        c.lineTo(x, y)
        c.stroke()
      }
      c.fillStyle = `rgba(${col},1)`
      c.beginPath()
      c.arc(x, y, h * 0.007, 0, PI * 2)
      c.fill()
    }
    lamp(carX - w * 0.08, cy - h * 0.012, '255,40,40', streak * w * 0.32)
    lamp(carX - w * 0.08, cy + h * 0.004, '255,40,40', streak * w * 0.32)
    lamp(carX + w * 0.1, cy - h * 0.004, '255,230,200', streak * w * 0.14)
  }

  function drawDish(c, w, h, t, st, pour) {
    const bg = c.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#14110f')
    bg.addColorStop(0.42, '#0d0b0a')
    bg.addColorStop(1, '#1a1512')
    c.fillStyle = bg
    c.fillRect(0, 0, w, h)
    // kitchen lights out of focus at the top
    for (let i = 0; i < 4; i++) {
      const bx = w * (0.15 + i * 0.24)
      const by = h * (0.1 + (i % 2) * 0.05)
      const g = c.createRadialGradient(bx, by, 1, bx, by, w * 0.09)
      g.addColorStop(0, 'rgba(255,235,200,0.95)')
      g.addColorStop(0.5, 'rgba(255,210,150,0.35)')
      g.addColorStop(1, 'rgba(255,200,140,0)')
      c.fillStyle = g
      c.fillRect(bx - w * 0.09, by - w * 0.09, w * 0.18, w * 0.18)
    }
    // counter edge
    c.fillStyle = '#231b16'
    c.fillRect(0, h * 0.38, w, h * 0.62)
    const cg = c.createLinearGradient(0, h * 0.38, 0, h)
    cg.addColorStop(0, 'rgba(255,220,180,0.08)')
    cg.addColorStop(1, 'rgba(0,0,0,0.5)')
    c.fillStyle = cg
    c.fillRect(0, h * 0.38, w, h * 0.62)
    // plate
    const cx = w * 0.5
    const cy = h * 0.6
    const rx = w * 0.4
    const ry = h * 0.17
    c.fillStyle = 'rgba(0,0,0,0.45)'
    c.beginPath()
    c.ellipse(cx, cy + h * 0.03, rx * 1.03, ry * 1.08, 0, 0, PI * 2)
    c.fill()
    const pg = c.createRadialGradient(
      cx - rx * 0.3,
      cy - ry * 0.4,
      2,
      cx,
      cy,
      rx,
    )
    pg.addColorStop(0, '#f4efe6')
    pg.addColorStop(0.8, '#d9d2c6')
    pg.addColorStop(1, '#9d968b')
    c.fillStyle = pg
    c.beginPath()
    c.ellipse(cx, cy, rx, ry, 0, 0, PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,0.35)'
    c.lineWidth = 1
    c.beginPath()
    c.ellipse(cx, cy, rx * 0.82, ry * 0.82, 0, 0, PI * 2)
    c.stroke()
    // sauce swoosh
    c.strokeStyle = '#7a2314'
    c.lineWidth = h * 0.03
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(cx - rx * 0.5, cy + ry * 0.2)
    c.quadraticCurveTo(cx, cy + ry * 0.7, cx + rx * 0.45, cy + ry * 0.1)
    c.stroke()
    // seared protein
    const fg = c.createRadialGradient(
      cx - rx * 0.1,
      cy - ry * 0.35,
      2,
      cx,
      cy - ry * 0.1,
      rx * 0.42,
    )
    fg.addColorStop(0, '#f0a24a')
    fg.addColorStop(0.5, '#c0642a')
    fg.addColorStop(1, '#5a2410')
    c.fillStyle = fg
    c.beginPath()
    c.ellipse(cx, cy - ry * 0.1, rx * 0.42, ry * 0.5, -0.3, 0, PI * 2)
    c.fill()
    // crust texture
    c.fillStyle = 'rgba(40,12,4,0.55)'
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4
      const rr = rx * 0.36 * ((i % 5) / 5)
      c.beginPath()
      c.arc(
        cx + Math.cos(a) * rr,
        cy - ry * 0.1 + Math.sin(a) * rr * 0.9,
        w * 0.012,
        0,
        PI * 2,
      )
      c.fill()
    }
    // glossy highlight (clips for zebras)
    c.fillStyle = 'rgba(255,245,225,0.95)'
    c.beginPath()
    c.ellipse(
      cx - rx * 0.14,
      cy - ry * 0.4,
      rx * 0.1,
      ry * 0.08,
      -0.5,
      0,
      PI * 2,
    )
    c.fill()
    // herbs and a lemon wedge
    c.fillStyle = '#3f9b3a'
    for (let i = 0; i < 9; i++) {
      c.beginPath()
      c.arc(
        cx + rx * (0.18 + (i % 3) * 0.1),
        cy - ry * (0.5 - Math.floor(i / 3) * 0.18),
        w * 0.011,
        0,
        PI * 2,
      )
      c.fill()
    }
    c.fillStyle = '#f2d14a'
    c.beginPath()
    c.moveTo(cx - rx * 0.62, cy + ry * 0.35)
    c.lineTo(cx - rx * 0.42, cy + ry * 0.15)
    c.lineTo(cx - rx * 0.4, cy + ry * 0.5)
    c.closePath()
    c.fill()
    // steel knife
    const kg = c.createLinearGradient(0, cy + ry * 1.3, 0, cy + ry * 1.5)
    kg.addColorStop(0, '#dde3ea')
    kg.addColorStop(0.5, '#8a929c')
    kg.addColorStop(1, '#3b4047')
    c.fillStyle = kg
    c.fillRect(w * 0.08, cy + ry * 1.3, w * 0.5, h * 0.02)
    c.fillStyle = '#1a1512'
    c.fillRect(w * 0.58, cy + ry * 1.28, w * 0.26, h * 0.026)
    if (pour) {
      // jug and a stream; the stream blurs with a slow shutter
      const jx = w * 0.72
      const jy = h * 0.24
      c.fillStyle = '#2b2622'
      c.beginPath()
      c.moveTo(jx - w * 0.12, jy - h * 0.06)
      c.lineTo(jx + w * 0.1, jy - h * 0.09)
      c.lineTo(jx + w * 0.08, jy + h * 0.05)
      c.lineTo(jx - w * 0.1, jy + h * 0.06)
      c.closePath()
      c.fill()
      const blur = clamp((expTime(st) - 1 / 120) * 60, 0, 1)
      const sx = jx - w * 0.1
      c.strokeStyle = `rgba(230,170,90,${0.9 - blur * 0.45})`
      c.lineWidth = w * (0.016 + blur * 0.03)
      c.beginPath()
      c.moveTo(sx, jy + h * 0.02)
      c.bezierCurveTo(
        sx - w * 0.05,
        jy + h * 0.14,
        cx + rx * 0.05,
        cy - ry * 0.6,
        cx + rx * 0.02,
        cy - ry * 0.2,
      )
      c.stroke()
      // droplets, crisp at 1/120
      const ph = LN.math.fract(t * 0.9)
      for (let i = 0; i < 5; i++) {
        const f = LN.math.fract(ph + i * 0.2)
        const dx = sx - w * 0.04 + Math.sin(i * 2.1) * w * 0.05
        const dy = jy + h * 0.02 + f * (cy - ry * 0.2 - jy)
        c.fillStyle = `rgba(240,190,110,${0.9 - blur * 0.5})`
        c.beginPath()
        c.ellipse(dx, dy, w * 0.009, w * (0.009 + blur * 0.03), 0, 0, PI * 2)
        c.fill()
      }
    }
  }

  /* ================================================================ viewfinder
     Draw the scene, then run the camera on it: white balance, exposure, the
     shadows slider, the LUT, zebras and peaking. */
  const VF_W = 216
  const VF_H = 384
  const sceneCv = document.createElement('canvas')
  sceneCv.width = VF_W
  sceneCv.height = VF_H
  const sceneCtx = sceneCv.getContext('2d', { willReadFrequently: true })
  const lumaBuf = new Float32Array(VF_W * VF_H)

  function renderViewfinder(out, st, scene, t, app, exposureRef) {
    const w = VF_W
    const h = VF_H
    const c = sceneCtx
    c.setTransform(1, 0, 0, 1, 0, 0)
    if (scene === 'night') drawNight(c, w, h, t, st)
    else drawDish(c, w, h, t, st, scene === 'pour')
    const img = c.getImageData(0, 0, w, h)
    const d = img.data
    const L = lensOf(st.lens)
    const exp = (st.iso * expTime(st)) / (L.stop * L.stop)
    const evDelta = Math.log2(exp / exposureRef) + (app === 'pixel' ? st.ev : 0)
    const gain = 2 ** evDelta
    const g = wbGains(st.wb, SCENE_K[scene] || 4000, st.tint)
    const shadow = app === 'pixel' ? st.shadows : 0
    for (let p = 0, i = 0; p < d.length; p += 4, i++) {
      let r = (d[p] / 255) * gain * g[0]
      let gg = (d[p + 1] / 255) * gain * g[1]
      let b = (d[p + 2] / 255) * gain * g[2]
      if (shadow) {
        const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b
        const k = 1 + shadow * 0.75 * (1 - clamp(l / 0.35, 0, 1))
        r *= k
        gg *= k
        b *= k
      }
      // soft highlight roll-off, like a sensor
      r = r > 1 ? 1 : r
      gg = gg > 1 ? 1 : gg
      b = b > 1 ? 1 : b
      d[p] = r * 255
      d[p + 1] = gg * 255
      d[p + 2] = b * 255
    }
    if (st.lutOn && app === 'bmd') {
      const lt = lutTable(st.lut)
      if (lt) lutApi().applyToImageData(img, lt.table, lt.size, 1)
      else approxLook(d, st.lut)
    }
    for (let p = 0, i = 0; p < d.length; p += 4, i++)
      lumaBuf[i] = (0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]) / 255
    if (st.zebra && app === 'bmd') {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x
          if (lumaBuf[i] >= 0.95 && (x + y) % 6 < 3) {
            const p = i * 4
            d[p] = d[p + 1] = d[p + 2] = (x + y) % 12 < 6 ? 20 : 235
          }
        }
    }
    if (st.peak && app === 'bmd') {
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x
          const gx = lumaBuf[i + 1] - lumaBuf[i - 1]
          const gy = lumaBuf[i + w] - lumaBuf[i - w]
          if (gx * gx + gy * gy > 0.045) {
            const p = i * 4
            d[p] = 255
            d[p + 1] = 60
            d[p + 2] = 40
          }
        }
    }
    c.putImageData(img, 0, 0)
    out.imageSmoothingEnabled = true
    return sceneCv
  }

  /* ================================================================ screen drawing
     One portrait canvas (640 × 1424, the 6.8 in panel's shape) carries both
     apps. The Blackmagic landscape layout is drawn rotated onto it. Every
     tappable region is pushed to `hits` in logical coordinates. */
  const SW = 640
  const SH = 1424
  const F_UI = '"TikTok Sans", system-ui, -apple-system, "Segoe UI", sans-serif'
  const F_DATA = '"Google Sans Code", ui-monospace, Menlo, Consolas, monospace'
  const ACC = LN.palette.accent
  const REC_RED = '#ff2d55'

  function rrect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2)
    c.beginPath()
    c.moveTo(x + rr, y)
    c.arcTo(x + w, y, x + w, y + h, rr)
    c.arcTo(x + w, y + h, x, y + h, rr)
    c.arcTo(x, y + h, x, y, rr)
    c.arcTo(x, y, x + w, y, rr)
    c.closePath()
  }
  function text(c, s, x, y, o = {}) {
    c.font = `${o.weight || 500} ${o.size || 22}px ${o.data ? F_DATA : F_UI}`
    c.fillStyle = o.color || '#fff'
    c.textAlign = o.align || 'left'
    c.textBaseline = o.base || 'alphabetic'
    c.fillText(s, x, y)
  }
  const tcString = (sec, fps) => LN.fmt.tc(sec, fps)
  const clockString = sec => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  /* Histogram of the viewfinder luma, 32 bins. */
  function histogram(bins) {
    bins.fill(0)
    for (let i = 0; i < lumaBuf.length; i += 3)
      bins[Math.min(31, (lumaBuf[i] * 32) | 0)]++
    let mx = 1
    for (const v of bins) if (v > mx) mx = v
    return mx
  }
  const histBins = new Float32Array(32)

  function drawHistogram(c, x, y, w, h) {
    rrect(c, x, y, w, h, 6)
    c.fillStyle = 'rgba(255,255,255,0.08)'
    c.fill()
    const mx = histogram(histBins)
    const bw = w / 32
    c.fillStyle = 'rgba(255,255,255,0.75)'
    for (let i = 0; i < 32; i++) {
      const v = Math.sqrt(histBins[i] / mx) * (h - 6)
      c.fillRect(x + i * bw + 0.5, y + h - 3 - v, bw - 1, v)
    }
  }
  function drawMeters(c, x, y, w, h, t, rec) {
    const lvl = rec
      ? 0.55 + 0.25 * Math.sin(t * 7)
      : 0.3 + 0.1 * Math.sin(t * 3)
    for (let ch = 0; ch < 2; ch++) {
      const yy = y + ch * (h / 2 + 2)
      rrect(c, x, yy, w, h / 2 - 2, 3)
      c.fillStyle = 'rgba(255,255,255,0.1)'
      c.fill()
      const v = clamp(lvl - ch * 0.06, 0, 1)
      const gr = c.createLinearGradient(x, 0, x + w, 0)
      gr.addColorStop(0, '#3fd894')
      gr.addColorStop(0.7, '#f5a742')
      gr.addColorStop(1, '#ff2d55')
      c.fillStyle = gr
      rrect(c, x, yy, w * v, h / 2 - 2, 3)
      c.fill()
    }
  }
  function drawBattery(c, x, y, pct) {
    rrect(c, x, y, 34, 16, 4)
    c.strokeStyle = 'rgba(255,255,255,0.7)'
    c.lineWidth = 2
    c.stroke()
    c.fillStyle = 'rgba(255,255,255,0.7)'
    c.fillRect(x + 35, y + 5, 3, 6)
    c.fillStyle = pct < 0.2 ? REC_RED : '#fff'
    c.fillRect(x + 3, y + 3, 28 * pct, 10)
  }

  /* ---------- Blackmagic Camera (simulated layout) */
  const HUD_ITEMS = [
    ['LENS', s => s.lens, 'lens'],
    ['FPS', s => String(s.fps), 'fps'],
    ['SHUTTER', s => fmtAngle(s.angle), 'shutter'],
    ['IRIS', s => lensOf(s.lens).f, 'iris'],
    ['ISO', s => String(s.iso), 'iso'],
    ['WB', s => `${s.wb}K`, 'wb'],
    ['TINT', s => String(s.tint), 'tint'],
  ]
  function drawBmdChrome(c, W, H, st, inst, hits, vf) {
    const land = W > H
    const top = land ? 92 : 170
    const bottom = land ? 100 : 150
    c.fillStyle = '#000'
    c.fillRect(0, 0, W, H)
    // status strip
    const tcY = land ? 42 : 36
    text(c, tcString(inst.recSec, st.fps), 16, tcY, {
      size: land ? 26 : 27,
      data: true,
      weight: 600,
      color: inst.rec ? REC_RED : '#fff',
    })
    if (inst.rec) {
      c.fillStyle = REC_RED
      c.beginPath()
      c.arc(land ? 232 : 232, tcY - 9, 8, 0, PI * 2)
      c.fill()
      text(c, 'REC', 248, tcY, { size: 20, weight: 700, color: REC_RED })
    }
    const fmt = `${st.res} ${st.fps}p · HEVC · ${st.bmHdr ? 'HLG' : 'Rec.709'}`
    if (land)
      text(c, fmt, W / 2 + 60, 36, {
        size: 18,
        align: 'center',
        color: 'rgba(255,255,255,0.75)',
      })
    else text(c, fmt, 16, 62, { size: 14, color: 'rgba(255,255,255,0.6)' })
    text(c, '1h 42m', W - 62, land ? 42 : tcY, {
      size: 18,
      align: 'right',
      data: true,
      color: 'rgba(255,255,255,0.75)',
    })
    drawBattery(c, W - 54, land ? 26 : tcY - 16, 0.72)
    // HUD row
    const hy = land ? 50 : 72
    const hh = land ? 42 : 90
    const n = HUD_ITEMS.length
    const cw = W / n
    HUD_ITEMS.forEach(([lab, val, id], i) => {
      const x = i * cw
      c.fillStyle = 'rgba(255,255,255,0.06)'
      rrect(c, x + 3, hy, cw - 6, hh, 8)
      c.fill()
      if (land) {
        text(c, lab, x + 10, hy + 27, {
          size: 13,
          color: 'rgba(255,255,255,0.55)',
          weight: 600,
        })
        text(c, val(st), x + cw - 8, hy + 29, {
          size: 20,
          align: 'right',
          weight: 700,
          data: true,
          color: id === 'wb' && !st.wbLock ? ACC : '#fff',
        })
      } else {
        text(c, lab, x + cw / 2, hy + 24, {
          size: 14,
          align: 'center',
          color: 'rgba(255,255,255,0.55)',
          weight: 600,
        })
        text(c, val(st), x + cw / 2, hy + 66, {
          size: id === 'shutter' || id === 'wb' ? 22 : 24,
          align: 'center',
          weight: 700,
          data: true,
        })
      }
      hits.push({ x, y: hy, w: cw, h: hh, act: 'hud', arg: id })
    })
    // viewfinder box
    const vfH = H - top - bottom
    const vfW = land ? Math.round((vfH * 16) / 9) : Math.round((vfH * 9) / 16)
    const vx = Math.round((W - vfW) / 2)
    const vy = top
    c.save()
    rrect(c, vx, vy, vfW, vfH, 10)
    c.clip()
    if (land) {
      // 16:9 crop of the tall frame
      const sx = 0
      const sy = (VF_H - (VF_W * 9) / 16) / 2
      c.drawImage(vf, sx, sy, VF_W, (VF_W * 9) / 16, vx, vy, vfW, vfH)
    } else c.drawImage(vf, vx, vy, vfW, vfH)
    // focus box + LUT badge + simulated label
    c.strokeStyle = 'rgba(255,255,255,0.8)'
    c.lineWidth = 2
    const fb = Math.min(vfW, vfH) * 0.16
    c.strokeRect(vx + vfW / 2 - fb / 2, vy + vfH * 0.46 - fb / 2, fb, fb)
    if (st.lutOn) {
      rrect(c, vx + 10, vy + 10, 190, 30, 15)
      c.fillStyle = 'rgba(0,0,0,0.55)'
      c.fill()
      text(c, `LUT · Lunar Night ${st.lut}`, vx + 22, vy + 31, {
        size: 16,
        weight: 600,
      })
    }
    text(c, 'simulated layout', vx + vfW - 10, vy + vfH - 10, {
      size: 13,
      align: 'right',
      color: 'rgba(255,255,255,0.5)',
    })
    c.restore()
    hits.push({ x: vx, y: vy, w: vfW, h: vfH, act: 'focus' })
    // bottom bar
    const by = H - bottom
    c.fillStyle = '#000'
    c.fillRect(0, by, W, bottom)
    const midY = by + bottom / 2
    if (land) {
      drawHistogram(c, 16, by + 14, 150, bottom - 28)
      drawMeters(c, 180, by + 22, 150, bottom - 44, inst.t, inst.rec)
    } else {
      drawHistogram(c, 16, by + 20, 120, 62)
      drawMeters(c, 148, by + 28, 110, 46, inst.t, inst.rec)
      hits.push({ x: 16, y: by + 20, w: 120, h: 62, act: 'scopes' })
    }
    // record button
    const rx = land ? W - 70 : W / 2
    const rr = land ? 32 : 42
    c.strokeStyle = 'rgba(255,255,255,0.85)'
    c.lineWidth = 4
    c.beginPath()
    c.arc(rx, midY, rr, 0, PI * 2)
    c.stroke()
    c.fillStyle = REC_RED
    if (inst.rec) {
      rrect(c, rx - rr * 0.5, midY - rr * 0.5, rr, rr, 6)
      c.fill()
    } else {
      c.beginPath()
      c.arc(rx, midY, rr - 8, 0, PI * 2)
      c.fill()
    }
    hits.push({
      x: rx - rr - 10,
      y: midY - rr - 10,
      w: rr * 2 + 20,
      h: rr * 2 + 20,
      act: 'rec',
    })
    // toggles: LUT / ZEBRA / PEAK / gear
    const toggles = [
      ['LUT', st.lutOn, 'lut'],
      ['ZEB', st.zebra, 'zebra'],
      ['PEAK', st.peak, 'peak'],
    ]
    const tw = land ? 62 : 60
    const tx0 = land ? W - 70 - 32 - 24 - toggles.length * (tw + 8) : W - 16
    toggles.forEach(([lab, on, id], i) => {
      const x = land
        ? tx0 + i * (tw + 8)
        : tx0 - (toggles.length - i) * (tw + 6)
      const y = midY - 22
      rrect(c, x, y, tw, 44, 10)
      c.fillStyle = on ? ACC : 'rgba(255,255,255,0.1)'
      c.fill()
      text(c, lab, x + tw / 2, y + 29, {
        size: 16,
        weight: 700,
        align: 'center',
        color: on ? '#00191c' : 'rgba(255,255,255,0.8)',
      })
      hits.push({ x, y: y - 8, w: tw, h: 60, act: 'toggle', arg: id })
    })
    // gear
    const gx = land ? 360 : 394
    const gy = midY
    c.strokeStyle = 'rgba(255,255,255,0.85)'
    c.lineWidth = 3
    c.beginPath()
    c.arc(gx, gy, 12, 0, PI * 2)
    c.stroke()
    for (let i = 0; i < 8; i++) {
      const a = (i * PI) / 4
      c.beginPath()
      c.moveTo(gx + Math.cos(a) * 16, gy + Math.sin(a) * 16)
      c.lineTo(gx + Math.cos(a) * 22, gy + Math.sin(a) * 22)
      c.stroke()
    }
    hits.push({ x: gx - 28, y: gy - 28, w: 56, h: 56, act: 'gear' })
    if (inst.sheet === 'bmd') drawBmdSettings(c, W, H, st, inst, hits)
  }

  const BMD_PAGES = [
    {
      id: 'camera',
      label: 'Camera',
      rows: s => [
        ['Enable Vertical Video', s.vertical, 'vertical'],
        ['Stabilization', s.bmStab, 'bmStab'],
        ['Reduce Noise', s.bmNR, 'bmNR'],
        ['Increase Sharpening', s.bmSharp, 'bmSharp'],
        ['Lock White Balance on Record', s.wbLock, 'wbLock'],
      ],
    },
    {
      id: 'record',
      label: 'Record',
      rows: s => [
        ['Resolution', s.res, 'res'],
        ['Codec', 'HEVC', null],
        ['Quality', 'Max', null],
        ['Color space', s.bmHdr ? 'HLG' : 'Rec.709', null],
        ['HDR', s.bmHdr, 'bmHdr'],
      ],
    },
    {
      id: 'monitor',
      label: 'Monitor',
      rows: s => [
        ['Zebras', s.zebra, 'zebra'],
        ['Zebra level', '95%', null],
        ['Focus Assist', s.peak, 'peak'],
      ],
    },
    {
      id: 'luts',
      label: 'LUTs',
      rows: s => [
        ['LUT Selection', `LunarNight_v2_${s.lut}.cube`, 'lutPick'],
        ['Display LUT', s.lutOn, 'lutOn'],
        ['Record LUT to Clip', s.lutRec, 'lutRec'],
      ],
    },
  ]
  function drawBmdSettings(c, W, H, st, inst, hits) {
    const land = W > H
    const sh = land ? H - 60 : 760
    const y0 = H - sh
    rrect(c, 0, y0, W, sh, 18)
    c.fillStyle = '#141416'
    c.fill()
    text(c, 'Settings', 24, y0 + 44, { size: 26, weight: 700 })
    text(c, 'close', W - 24, y0 + 44, { size: 18, align: 'right', color: ACC })
    hits.push({ x: W - 110, y: y0, w: 110, h: 70, act: 'sheet', arg: null })
    const tabY = y0 + 66
    const tw = Math.min(140, (W - 48) / BMD_PAGES.length)
    BMD_PAGES.forEach((p, i) => {
      const x = 24 + i * tw
      const on = (inst.page || 'camera') === p.id
      rrect(c, x, tabY, tw - 8, 40, 7)
      c.fillStyle = on ? ACC : '#252529'
      c.fill()
      text(c, p.label, x + (tw - 8) / 2, tabY + 27, {
        size: 17,
        weight: 700,
        align: 'center',
        color: on ? '#00191c' : '#e8e8ea',
      })
      hits.push({ x, y: tabY, w: tw - 8, h: 40, act: 'page', arg: p.id })
    })
    const page =
      BMD_PAGES.find(p => p.id === (inst.page || 'camera')) || BMD_PAGES[0]
    const rows = page.rows(st)
    const rh = land ? 54 : 68
    rows.forEach(([lab, val, key], i) => {
      const y = tabY + 60 + i * rh
      c.fillStyle = 'rgba(255,255,255,0.06)'
      c.fillRect(24, y + rh - 1, W - 48, 1)
      text(c, lab, 28, y + rh / 2 + 7, { size: 19 })
      if (typeof val === 'boolean') {
        const x = W - 24 - 56
        rrect(c, x, y + rh / 2 - 14, 56, 28, 14)
        c.fillStyle = val ? ACC : '#3a3a40'
        c.fill()
        c.fillStyle = '#fff'
        c.beginPath()
        c.arc(x + (val ? 42 : 14), y + rh / 2, 10, 0, PI * 2)
        c.fill()
      } else
        text(c, val, W - 28, y + rh / 2 + 7, {
          size: 18,
          align: 'right',
          data: true,
          color: key ? ACC : 'rgba(255,255,255,0.7)',
        })
      if (key) hits.push({ x: 24, y, w: W - 48, h: rh, act: 'set', arg: key })
    })
  }

  /* ---------- Pixel Camera (simulated layout) */
  const PX_CHIPS = ['.5', '1', '2', '5', '10']
  const PX_MODES = ['Slow motion', 'Video', 'Photo', 'Portrait', 'Pan']
  function drawPixel(c, W, H, st, inst, hits, vf) {
    c.fillStyle = '#000'
    c.fillRect(0, 0, W, H)
    const vy = 110
    const vfH = Math.round((W * 16) / 9)
    c.save()
    rrect(c, 0, vy, W, vfH, 28)
    c.clip()
    c.drawImage(vf, 0, vy, W, vfH)
    text(c, 'simulated layout', W - 14, vy + vfH - 80, {
      size: 13,
      align: 'right',
      color: 'rgba(255,255,255,0.5)',
    })
    if (inst.locked) {
      rrect(c, W / 2 - 120, vy + 24, 240, 40, 20)
      c.fillStyle = 'rgba(0,0,0,0.6)'
      c.fill()
      text(c, 'Focus and exposure locked', W / 2, vy + 51, {
        size: 16,
        align: 'center',
        weight: 600,
      })
    } else {
      rrect(c, W - 100, vy + 24, 84, 40, 20)
      c.fillStyle = 'rgba(0,0,0,0.55)'
      c.fill()
      text(c, 'Lock', W - 58, vy + 51, {
        size: 17,
        align: 'center',
        weight: 600,
      })
    }
    hits.push({ x: W - 110, y: vy + 14, w: 100, h: 60, act: 'lock' })
    if (inst.rec) {
      rrect(c, W / 2 - 46, vy + 80, 92, 36, 18)
      c.fillStyle = REC_RED
      c.fill()
      text(c, clockString(inst.recSec), W / 2, vy + 105, {
        size: 18,
        align: 'center',
        weight: 700,
        data: true,
      })
    }
    // zoom chips
    const chipY = vy + vfH - 64
    const cw = 54
    const x0 = W / 2 - (PX_CHIPS.length * cw) / 2
    rrect(c, x0 - 6, chipY - 6, PX_CHIPS.length * cw + 12, 52, 26)
    c.fillStyle = 'rgba(0,0,0,0.45)'
    c.fill()
    PX_CHIPS.forEach((ch, i) => {
      const on = lensOf(st.lens).chip === ch
      const x = x0 + i * cw
      if (on) {
        c.fillStyle = 'rgba(255,255,255,0.22)'
        c.beginPath()
        c.arc(x + cw / 2, chipY + 20, 20, 0, PI * 2)
        c.fill()
      }
      text(c, on ? `${ch}×` : ch, x + cw / 2, chipY + 27, {
        size: on ? 18 : 16,
        align: 'center',
        weight: 700,
      })
      hits.push({ x, y: chipY - 10, w: cw, h: 60, act: 'chip', arg: ch })
    })
    c.restore()
    hits.push({ x: 0, y: vy, w: W, h: vfH - 80, act: 'focus' })
    // top strip: format chip, flash off, timer, macro flower
    rrect(c, 16, 36, 110, 40, 20)
    c.fillStyle = '#1b1b1e'
    c.fill()
    text(c, `${st.res} · ${st.fps}`, 71, 63, {
      size: 17,
      align: 'center',
      weight: 700,
      data: true,
    })
    hits.push({ x: 16, y: 30, w: 110, h: 52, act: 'pxsheet', arg: 'video' })
    const glyph = (x, y, draw) => {
      c.strokeStyle = 'rgba(255,255,255,0.85)'
      c.lineWidth = 2.5
      c.beginPath()
      draw(x, y)
      c.stroke()
    }
    glyph(W / 2 - 40, 56, (x, y) => {
      c.moveTo(x, y - 14)
      c.lineTo(x - 9, y + 2)
      c.lineTo(x + 2, y + 2)
      c.lineTo(x - 2, y + 14)
      c.lineTo(x + 9, y - 2)
      c.lineTo(x - 2, y - 2)
      c.closePath()
      c.moveTo(x - 16, y - 16)
      c.lineTo(x + 16, y + 16)
    })
    glyph(W / 2 + 40, 56, (x, y) => {
      c.arc(x, y, 14, 0, PI * 2)
      c.moveTo(x, y - 8)
      c.lineTo(x, y)
      c.lineTo(x + 6, y + 4)
    })
    // macro flower
    const fx = W - 48
    const fy = 56
    c.fillStyle = 'rgba(255,255,255,0.85)'
    for (let i = 0; i < 6; i++) {
      const a = (i * PI) / 3
      c.beginPath()
      c.ellipse(fx + Math.cos(a) * 9, fy + Math.sin(a) * 9, 6, 4, a, 0, PI * 2)
      c.fill()
    }
    // mode row
    const my = vy + vfH + 40
    const mw = 118
    const mx0 = W / 2 - mw / 2 - mw
    PX_MODES.forEach((m, i) => {
      const on = m === 'Video'
      text(c, m, mx0 + i * mw, my, {
        size: 18,
        align: 'center',
        weight: on ? 700 : 500,
        color: on ? '#fff' : 'rgba(255,255,255,0.5)',
      })
      hits.push({
        x: mx0 + i * mw - mw / 2,
        y: my - 28,
        w: mw,
        h: 44,
        act: 'mode',
        arg: m,
      })
    })
    // bottom bar: gallery, shutter, flip, settings (left), sliders (right)
    const by = H - 70
    rrect(c, 36, by - 34, 68, 68, 16)
    const gg = c.createLinearGradient(36, by - 34, 104, by + 34)
    gg.addColorStop(0, '#5a3a8a')
    gg.addColorStop(1, '#1b1030')
    c.fillStyle = gg
    c.fill()
    hits.push({ x: 30, y: by - 40, w: 80, h: 80, act: 'gallery' })
    c.strokeStyle = '#fff'
    c.lineWidth = 5
    c.beginPath()
    c.arc(W / 2, by, 46, 0, PI * 2)
    c.stroke()
    c.fillStyle = REC_RED
    if (inst.rec) {
      rrect(c, W / 2 - 18, by - 18, 36, 36, 6)
      c.fill()
    } else {
      c.beginPath()
      c.arc(W / 2, by, 36, 0, PI * 2)
      c.fill()
    }
    hits.push({ x: W / 2 - 56, y: by - 56, w: 112, h: 112, act: 'rec' })
    // flip
    const fx2 = W - 70
    c.fillStyle = 'rgba(255,255,255,0.12)'
    c.beginPath()
    c.arc(fx2, by, 32, 0, PI * 2)
    c.fill()
    c.strokeStyle = '#fff'
    c.lineWidth = 3
    c.beginPath()
    c.arc(fx2, by, 15, PI * 0.15, PI * 0.85)
    c.stroke()
    c.beginPath()
    c.arc(fx2, by, 15, PI * 1.15, PI * 1.85)
    c.stroke()
    hits.push({ x: fx2 - 36, y: by - 36, w: 72, h: 72, act: 'flip' })
    // sliders icon (bottom right, above flip) and settings chevron (bottom left)
    const sx = W - 48
    const sy = vy + vfH + 104
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = 'rgba(255,255,255,0.85)'
      c.lineWidth = 2.5
      c.beginPath()
      c.moveTo(sx - 14, sy - 10 + i * 10)
      c.lineTo(sx + 14, sy - 10 + i * 10)
      c.stroke()
      c.fillStyle = '#fff'
      c.beginPath()
      c.arc(sx - 8 + i * 8, sy - 10 + i * 10, 3.5, 0, PI * 2)
      c.fill()
    }
    hits.push({
      x: sx - 30,
      y: sy - 30,
      w: 60,
      h: 60,
      act: 'pxsheet',
      arg: 'pro',
    })
    glyph(48, sy, (x, y) => {
      c.moveTo(x - 12, y + 6)
      c.lineTo(x, y - 6)
      c.lineTo(x + 12, y + 6)
    })
    hits.push({ x: 18, y: sy - 30, w: 60, h: 60, act: 'pxsheet', arg: 'video' })
    if (inst.sheet === 'video' || inst.sheet === 'pro')
      drawPixelSheet(c, W, H, st, inst, hits)
  }

  const PX_VIDEO_ROWS = s => [
    ['Resolution', s.res, 'res'],
    ['Frame rate', `${s.fps} fps`, 'fps'],
    ['10-bit HDR', s.hdr10, 'hdr10'],
    ['Stabilization', s.stab, 'stab'],
    ['Video Boost', s.boost, 'boost'],
    ['Night Sight', s.night, 'night'],
  ]
  const PX_PRO_ROWS = s => [
    ['White balance', `${s.wb}K`, (s.wb - WB_MIN) / (WB_MAX - WB_MIN), 'wb'],
    ['Shutter speed', fmtSpeed(s), 1 - (s.angle - 45) / 315, 'pxshutter'],
    ['ISO', String(s.iso), ISOS.indexOf(s.iso) / (ISOS.length - 1), 'iso'],
    ['Focus', s.focus >= 0.95 ? '∞' : s.focus.toFixed(2), s.focus, 'focus'],
    ['Shadows', shadowWord(s.shadows), (s.shadows + 1) / 2, 'shadows'],
    ['Exposure', fmtEv(s.ev), (s.ev + 2) / 4, 'ev'],
  ]
  function drawPixelSheet(c, W, H, st, inst, hits) {
    const sh = 640
    const y0 = H - sh
    rrect(c, 0, y0, W, sh, 28)
    c.fillStyle = '#1b1b1e'
    c.fill()
    c.fillStyle = 'rgba(255,255,255,0.3)'
    rrect(c, W / 2 - 24, y0 + 10, 48, 5, 3)
    c.fill()
    hits.push({ x: 0, y: y0, w: W, h: 36, act: 'sheet', arg: null })
    const tabs = [
      ['Video settings', 'video'],
      ['Pro', 'pro'],
    ]
    tabs.forEach(([lab, id], i) => {
      const x = 24 + i * 190
      const on = inst.sheet === id
      rrect(c, x, y0 + 28, 180, 42, 21)
      c.fillStyle = on ? ACC : '#252529'
      c.fill()
      text(c, lab, x + 90, y0 + 56, {
        size: 17,
        weight: 700,
        align: 'center',
        color: on ? '#00191c' : '#e8e8ea',
      })
      hits.push({ x, y: y0 + 28, w: 180, h: 42, act: 'pxsheet', arg: id })
    })
    text(c, 'close', W - 24, y0 + 56, { size: 17, align: 'right', color: ACC })
    hits.push({
      x: W - 110,
      y: y0 + 24,
      w: 110,
      h: 50,
      act: 'sheet',
      arg: null,
    })
    if (inst.sheet === 'video') {
      PX_VIDEO_ROWS(st).forEach(([lab, val, key], i) => {
        const y = y0 + 90 + i * 84
        rrect(c, 24, y, W - 48, 72, 14)
        c.fillStyle = '#252529'
        c.fill()
        text(c, lab, 44, y + 44, { size: 20, weight: 600 })
        if (typeof val === 'boolean') {
          const x = W - 24 - 20 - 56
          rrect(c, x, y + 22, 56, 28, 14)
          c.fillStyle = val ? ACC : '#3a3a40'
          c.fill()
          c.fillStyle = '#fff'
          c.beginPath()
          c.arc(x + (val ? 42 : 14), y + 36, 10, 0, PI * 2)
          c.fill()
        } else
          text(c, val, W - 44, y + 44, {
            size: 19,
            align: 'right',
            data: true,
            color: ACC,
          })
        hits.push({ x: 24, y, w: W - 48, h: 72, act: 'set', arg: key })
      })
    } else {
      PX_PRO_ROWS(st).forEach(([lab, val, frac, key], i) => {
        const y = y0 + 92 + i * 88
        text(c, lab, 32, y + 24, { size: 18, weight: 600 })
        text(c, val, W - 32, y + 24, {
          size: 18,
          align: 'right',
          data: true,
          color: ACC,
        })
        const tx = 32
        const tw = W - 64
        const ty = y + 50
        rrect(c, tx, ty - 3, tw, 6, 3)
        c.fillStyle = '#3a3a40'
        c.fill()
        rrect(c, tx, ty - 3, tw * clamp(frac, 0, 1), 6, 3)
        c.fillStyle = ACC
        c.fill()
        c.fillStyle = '#fff'
        c.beginPath()
        c.arc(tx + tw * clamp(frac, 0, 1), ty, 13, 0, PI * 2)
        c.fill()
        hits.push({
          x: tx - 10,
          y: ty - 26,
          w: tw + 20,
          h: 52,
          act: 'slide',
          arg: key,
          x0: tx,
          x1: tx + tw,
        })
      })
    }
  }

  /* Full screen: viewfinder, then chrome. Returns the hit list. */
  function drawScreen(canvas, st, inst, vf) {
    const c = canvas.getContext('2d')
    const hits = []
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, SW, SH)
    if (inst.app === 'pixel') drawPixel(c, SW, SH, st, inst, hits, vf)
    else if (inst.land) {
      c.save()
      c.translate(0, SH)
      c.rotate(-PI / 2)
      drawBmdChrome(c, SH, SW, st, inst, hits, vf)
      c.restore()
    } else drawBmdChrome(c, SW, SH, st, inst, hits, vf)
    return hits
  }
  /* Canvas pixel → logical coordinates of the drawn layout. */
  function toLogical(inst, x, y) {
    if (inst.app === 'bmd' && inst.land) return [SH - y, x]
    return [x, y]
  }
  function hitAt(hits, inst, x, y) {
    const [lx, ly] = toLogical(inst, x, y)
    for (let i = hits.length - 1; i >= 0; i--) {
      const r = hits[i]
      if (lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h)
        return { hit: r, lx, ly }
    }
    return null
  }

  /* ================================================================ three.js loader */
  let threeP = null
  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE)
    if (!threeP)
      threeP = new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = THREE_URL
        s.async = true
        s.onload = () =>
          window.THREE
            ? res(window.THREE)
            : rej(new Error('three.js loaded without THREE'))
        s.onerror = () => rej(new Error('three.js could not be loaded'))
        document.head.append(s)
      }).catch(e => {
        threeP = null
        throw e
      })
    return threeP
  }

  /* Anchor of a hotspot in phone space, plus its outward normal. */
  function anchorOf(part) {
    const [a, b] = part.at
    if (part.face === 'back')
      return { p: [-a, b, -(BAR_Z + 1.2)], n: [0, 0, -1] }
    if (part.face === 'front')
      return { p: [a, b, MM.d / 2 + 0.6], n: [0, 0, 1] }
    if (part.face === 'top') return { p: [a, MM.h / 2, 0], n: [0, 1, 0] }
    return { p: [a, -MM.h / 2, 0], n: [0, -1, 0] }
  }

  /* ================================================================ 3D model */
  function buildModel(THREE, host, screenCanvas) {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.setClearColor(0x000000, 0)
    host.append(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(26, 1, 1, 3000)
    camera.position.set(0, 0, 460)

    // soft studio environment: a grey room with three bright panels
    const pmrem = new THREE.PMREMGenerator(renderer)
    const env = new THREE.Scene()
    env.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(100, 100, 100),
        new THREE.MeshBasicMaterial({ color: 0x4a4d55, side: THREE.BackSide }),
      ),
    )
    const panel = (w, hh, x, y, z, ry, col, i) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, hh),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(col).multiplyScalar(i),
          side: THREE.DoubleSide,
        }),
      )
      m.position.set(x, y, z)
      m.rotation.y = ry
      env.add(m)
    }
    panel(60, 14, 0, 40, -20, 0, 0xffffff, 3.2)
    panel(14, 60, -49, 0, 0, PI / 2, 0xeef5ff, 2)
    panel(14, 60, 49, 0, 0, -PI / 2, 0x9ff6ff, 1.8)
    panel(80, 10, 0, -35, 49, PI, 0xffffff, 1.4)
    scene.environment = pmrem.fromScene(env, 0.04).texture
    scene.add(new THREE.HemisphereLight(0xffffff, 0x15161a, 0.3))
    const key = new THREE.DirectionalLight(0xffffff, 0.8)
    key.position.set(120, 180, 260)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x2fe4f2, 1.1)
    rim.position.set(-220, 60, -200)
    scene.add(rim)
    const rim2 = new THREE.DirectionalLight(0xd9e6ff, 0.5)
    rim2.position.set(240, -60, -180)
    scene.add(rim2)

    const rr = (w, hh, r) => {
      const s = new THREE.Shape()
      const x = -w / 2
      const y = -hh / 2
      s.moveTo(x + r, y)
      s.lineTo(x + w - r, y)
      s.absarc(x + w - r, y + r, r, -PI / 2, 0, false)
      s.lineTo(x + w, y + hh - r)
      s.absarc(x + w - r, y + hh - r, r, 0, PI / 2, false)
      s.lineTo(x + r, y + hh)
      s.absarc(x + r, y + hh - r, r, PI / 2, PI, false)
      s.lineTo(x, y + r)
      s.absarc(x + r, y + r, r, PI, PI * 1.5, false)
      return s
    }
    const extrude = (shape, depth, bevel, seg) => {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: seg || 4,
        curveSegments: 26,
      })
      g.translate(0, 0, -depth / 2)
      return g
    }
    const planarUV = (geo, w, hh) => {
      const p = geo.attributes.position
      const uv = geo.attributes.uv
      for (let i = 0; i < p.count; i++)
        uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / hh + 0.5)
      uv.needsUpdate = true
    }

    const pivot = new THREE.Group()
    const phone = new THREE.Group()
    pivot.add(phone)
    scene.add(pivot)
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: 0x1c1e22,
      metalness: 1,
      roughness: 0.16,
      envMapIntensity: 0.9,
    })
    const backMat = new THREE.MeshPhysicalMaterial({
      color: 0x040405,
      metalness: 0,
      roughness: 0.62,
      clearcoat: 0.12,
      clearcoatRoughness: 0.6,
    })
    const glassBlack = new THREE.MeshPhysicalMaterial({
      color: 0x06080a,
      metalness: 0,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    })
    const barMat = new THREE.MeshPhysicalMaterial({
      color: 0x1c1e22,
      metalness: 1,
      roughness: 0.22,
      envMapIntensity: 1.0,
    })
    const hole = new THREE.MeshBasicMaterial({ color: 0x050506 })

    const bev = MM.bevel
    const body = new THREE.Mesh(
      extrude(
        rr(MM.w - 2 * bev, MM.h - 2 * bev, MM.r - bev),
        MM.d - 2 * bev,
        bev,
        7,
      ),
      frameMat,
    )
    phone.add(body)
    const back = new THREE.Mesh(
      extrude(rr(MM.w - 2.2, MM.h - 2.2, MM.r - 1.1), 0.5, 0.3, 4),
      backMat,
    )
    back.position.z = -MM.d / 2 + 0.1
    phone.add(back)
    const front = new THREE.Mesh(
      extrude(rr(MM.w - 1.6, MM.h - 1.6, MM.r - 0.8), 0.4, 0.25, 4),
      glassBlack,
    )
    front.position.z = MM.d / 2 - 0.1
    phone.add(front)
    // display
    const sw = MM.screen.w
    const sh = MM.screen.h
    const screenTex = new THREE.CanvasTexture(screenCanvas)
    screenTex.encoding = THREE.sRGBEncoding
    screenTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    screenTex.minFilter = THREE.LinearMipmapLinearFilter
    const sGeo = new THREE.ShapeGeometry(rr(sw, sh, MM.screen.r), 28)
    planarUV(sGeo, sw, sh)
    const screen = new THREE.Mesh(
      sGeo,
      new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
    )
    screen.position.z = MM.d / 2 + 0.42
    phone.add(screen)
    const punch = new THREE.Mesh(new THREE.CircleGeometry(MM.hole.r, 32), hole)
    punch.position.set(0, sh / 2 - MM.hole.fromTop, MM.d / 2 + 0.45)
    phone.add(punch)
    const sheen = new THREE.Mesh(
      sGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.05,
        roughness: 0.05,
        metalness: 0,
        clearcoat: 1,
      }),
    )
    sheen.position.z = MM.d / 2 + 0.5
    phone.add(sheen)

    // camera bar (back face is -z; model +x shows on the LEFT from the back)
    const bar = new THREE.Group()
    const barBody = new THREE.Mesh(
      extrude(
        rr(
          MM.bar.w - 2 * MM.bar.bevel,
          MM.bar.h - 2 * MM.bar.bevel,
          MM.bar.h / 2 - MM.bar.bevel,
        ),
        MM.bar.lift,
        MM.bar.bevel,
        6,
      ),
      barMat,
    )
    bar.add(barBody)
    const glass = new THREE.Mesh(
      extrude(rr(MM.glass.w, MM.glass.h, MM.glass.h / 2), 0.4, 0.2, 3),
      glassBlack,
    )
    glass.position.set(-MM.glass.cx, 0, -MM.bar.lift / 2 - 0.5)
    bar.add(glass)
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x070a12,
      metalness: 0.2,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
    })
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: 0x1b1e22,
      metalness: 1,
      roughness: 0.3,
    })
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x1c2638,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    })
    for (const id of ['wide', 'ultrawide', 'tele']) {
      const part = PARTS[id]
      const g = new THREE.Group()
      const R = id === 'wide' ? MM.lensR : MM.lensR - 0.6
      g.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.6, 14, 56), ringMat))
      const gl = new THREE.Mesh(new THREE.CircleGeometry(R - 0.4, 56), lensMat)
      gl.rotation.y = PI
      g.add(gl)
      for (let j = 1; j <= 3; j++) {
        const r0 = (R - 0.5) * 0.24 * j
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(r0, r0 + 0.2, 40),
          innerMat,
        )
        ring.rotation.y = PI
        ring.position.z = -0.03
        g.add(ring)
      }
      // a tiny element highlight
      const el = new THREE.Mesh(
        new THREE.CircleGeometry(R * 0.14, 20),
        new THREE.MeshBasicMaterial({ color: 0x5f6b8a }),
      )
      el.rotation.y = PI
      el.position.set(-R * 0.35, R * 0.35, -0.05)
      g.add(el)
      g.position.set(-part.at[0], 0, -MM.bar.lift / 2 - 1.1)
      bar.add(g)
    }
    const disc = (id, r, mat, dz) => {
      const part = PARTS[id]
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 36), mat)
      m.rotation.y = PI
      m.position.set(
        -part.at[0],
        part.at[1] - BAR_Y,
        -MM.bar.lift / 2 - (dz || 0.72),
      )
      bar.add(m)
      return m
    }
    disc(
      'flash',
      2.3,
      new THREE.MeshPhysicalMaterial({
        color: 0xf1ead8,
        roughness: 0.4,
        emissive: 0x221f16,
      }),
    )
    disc(
      'temp',
      1.3,
      new THREE.MeshPhysicalMaterial({
        color: 0x15181a,
        roughness: 0.25,
        metalness: 0.3,
      }),
    )
    disc(
      'ldaf',
      1.1,
      new THREE.MeshPhysicalMaterial({
        color: 0x0b0d14,
        roughness: 0.1,
        clearcoat: 1,
      }),
    )
    disc(
      'flicker',
      1.1,
      new THREE.MeshPhysicalMaterial({
        color: 0x0b0d14,
        roughness: 0.1,
        clearcoat: 1,
      }),
    )
    disc('micRear', 0.5, hole, 0.71)
    bar.position.set(0, BAR_Y, -MM.d / 2 - MM.bar.lift / 2 + 0.05)
    phone.add(bar)

    // keys on the right edge (seen from the front), power above volume
    const keyMesh = (len, y) => {
      const m = new THREE.Mesh(
        extrude(rr(len, 2.6, 1.2), 0.9, 0.3, 3),
        frameMat,
      )
      m.rotation.set(0, PI / 2, PI / 2)
      m.position.set(MM.w / 2 + 0.25, y, 0)
      phone.add(m)
    }
    keyMesh(11, 38)
    keyMesh(24, 15)
    // USB-C, speaker holes (right of the port), bottom mic (left), top mic
    const port = new THREE.Mesh(extrude(rr(9, 3.2, 1.55), 1, 0.1, 2), hole)
    port.rotation.x = PI / 2
    port.position.set(0, -MM.h / 2 - 0.05, 0)
    phone.add(port)
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), hole)
      m.rotation.x = PI / 2
      m.position.set(11 + i * 2.1, -MM.h / 2 - 0.12, 0)
      phone.add(m)
    }
    const micB = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), hole)
    micB.rotation.x = PI / 2
    micB.position.set(PARTS.micBottom.at[0], -MM.h / 2 - 0.12, 0)
    phone.add(micB)
    const micT = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), hole)
    micT.rotation.x = -PI / 2
    micT.position.set(PARTS.micTop.at[0], MM.h / 2 + 0.12, 0)
    phone.add(micT)

    // cyan pool under the phone
    const shCv = document.createElement('canvas')
    shCv.width = shCv.height = 128
    const sx = shCv.getContext('2d')
    const rg = sx.createRadialGradient(64, 64, 4, 64, 64, 64)
    rg.addColorStop(0, 'rgba(0,200,215,0.4)')
    rg.addColorStop(0.5, 'rgba(0,200,215,0.12)')
    rg.addColorStop(1, 'rgba(0,200,215,0)')
    sx.fillStyle = rg
    sx.fillRect(0, 0, 128, 128)
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(130, 36),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shCv),
        transparent: true,
        depthWrite: false,
      }),
    )
    pool.rotation.x = -PI / 2
    pool.position.y = -MM.h / 2 - 16
    scene.add(pool)

    const raycaster = new THREE.Raycaster()
    const v3 = new THREE.Vector3()
    const n3 = new THREE.Vector3()
    const cam3 = new THREE.Vector3()
    return {
      renderer,
      scene,
      camera,
      pivot,
      phone,
      screen,
      screenTex,
      pool,
      /* Project a phone-space anchor to CSS px inside the host; null when it faces away. */
      project(anchor, w, hh) {
        v3.set(anchor.p[0], anchor.p[1], anchor.p[2])
        phone.localToWorld(v3)
        n3.set(anchor.n[0], anchor.n[1], anchor.n[2]).transformDirection(
          phone.matrixWorld,
        )
        cam3.copy(camera.position).sub(v3).normalize()
        const facing = n3.dot(cam3)
        v3.project(camera)
        return {
          x: (v3.x * 0.5 + 0.5) * w,
          y: (-v3.y * 0.5 + 0.5) * hh,
          on: facing > 0.18,
        }
      },
      /* Screen canvas pixel under a pointer, or null. */
      pick(nx, ny) {
        raycaster.setFromCamera({ x: nx, y: ny }, camera)
        const hit = raycaster.intersectObject(screen, false)[0]
        if (!hit || !hit.uv) return null
        return [hit.uv.x * SW, (1 - hit.uv.y) * SH]
      },
      dispose() {
        renderer.dispose()
        pmrem.dispose()
        renderer.domElement.remove()
      },
    }
  }

  /* ================================================================ CSS-3D fallback */
  function buildCssPhone(host, screenCopy) {
    const s = 2.1
    const px = v => `${(v * s).toFixed(1)}px`
    const face = (cls, w, hh, tf) =>
      h('div', {
        class: `rp-face ${cls}`,
        style: { width: px(w), height: px(hh), transform: tf },
      })
    const root = h('div', { class: 'rp-css' })
    const ph = h('div', {
      class: 'rp-css-phone',
      style: { width: px(MM.w), height: px(MM.h), '--r': px(MM.r) },
    })
    const frontF = face('front', MM.w, MM.h, `translateZ(${px(MM.d / 2)})`)
    screenCopy.className = 'rp-css-screen'
    screenCopy.style.width = px(MM.screen.w)
    screenCopy.style.height = px(MM.screen.h)
    screenCopy.style.borderRadius = px(MM.screen.r)
    frontF.append(
      screenCopy,
      h('i', {
        class: 'rp-css-punch',
        style: {
          width: px(MM.hole.r * 2),
          height: px(MM.hole.r * 2),
          top: px(MM.bezel + MM.hole.fromTop - MM.hole.r),
        },
      }),
    )
    const backF = face(
      'back',
      MM.w,
      MM.h,
      `rotateY(180deg) translateZ(${px(MM.d / 2)})`,
    )
    const bar = h('div', {
      class: 'rp-css-bar',
      style: {
        width: px(MM.bar.w),
        height: px(MM.bar.h),
        top: px(MM.bar.fromTop),
        left: px((MM.w - MM.bar.w) / 2),
      },
    })
    const glassL = (MM.bar.w - MM.glass.w) / 2 + MM.glass.cx
    bar.append(
      h('i', {
        class: 'rp-css-glass',
        style: {
          width: px(MM.glass.w),
          height: px(MM.glass.h),
          left: px(glassL),
          top: px((MM.bar.h - MM.glass.h) / 2),
        },
      }),
    )
    for (const id of PART_IDS) {
      const p = PARTS[id]
      if (p.face !== 'back') continue
      const r =
        id === 'wide'
          ? MM.lensR
          : /tele|ultrawide/.test(id)
            ? MM.lensR - 0.6
            : id === 'flash'
              ? 2.3
              : id === 'micRear'
                ? 0.6
                : 1.2
      bar.append(
        h('i', {
          class: `rp-css-dot ${/wide|tele/.test(id) ? 'lens' : id}`,
          style: {
            width: px(r * 2),
            height: px(r * 2),
            left: px(MM.bar.w / 2 + p.at[0] - r),
            top: px(MM.bar.h / 2 - (p.at[1] - BAR_Y) - r),
          },
        }),
      )
    }
    backF.append(bar)
    const edges = [
      face('edge', MM.w, MM.d, `rotateX(90deg) translateZ(${px(MM.h / 2)})`),
      face('edge', MM.w, MM.d, `rotateX(-90deg) translateZ(${px(MM.h / 2)})`),
      face('edge', MM.d, MM.h, `rotateY(90deg) translateZ(${px(MM.w / 2)})`),
      face('edge', MM.d, MM.h, `rotateY(-90deg) translateZ(${px(MM.w / 2)})`),
    ]
    ph.append(backF, ...edges, frontF)
    root.append(ph)
    host.append(root)
    const hotHosts = {
      front: frontF,
      back: backF,
      top: edges[0],
      bottom: edges[1],
    }
    return {
      el: root,
      phone: ph,
      place(id, btn) {
        const p = PARTS[id]
        const hostEl = hotHosts[p.face]
        if (!hostEl) return
        if (p.face === 'back') {
          btn.style.left = px(MM.w / 2 + p.at[0])
          btn.style.top = px(MM.h / 2 - p.at[1])
        } else if (p.face === 'front') {
          btn.style.left = px(MM.w / 2 + p.at[0])
          btn.style.top = px(MM.h / 2 - p.at[1])
        } else {
          btn.style.left = px(MM.w / 2 + p.at[0])
          btn.style.top = px(MM.d / 2)
        }
        hostEl.append(btn)
      },
      update(rx, ry, rz, dist) {
        const z = clamp(460 / dist, 0.5, 2.2)
        ph.style.transform = `scale(${z.toFixed(3)}) rotateX(${(-rx * 57.3).toFixed(1)}deg) rotateY(${(ry * 57.3).toFixed(1)}deg) rotateZ(${(rz * 57.3).toFixed(1)}deg)`
      },
    }
  }

  /* ================================================================ instance */
  const VIEWS = {
    back: { ry: PI, rx: 0.1, dist: 460, ty: 0 },
    front: { ry: 0, rx: 0.06, dist: 460, ty: 0 },
    bar: { ry: PI, rx: 0.22, dist: 205, ty: BAR_Y },
  }
  const ZOOM_MIN = 170
  const ZOOM_MAX = 760
  const instances = new Set()

  function presetIdFrom(x) {
    if (!x) return null
    if (typeof x === 'string') {
      if (PRESETS.some(p => p.id === x)) return x
      const m = {
        violet: 'night-violet',
        blue: 'night-blue',
        night: 'night-violet',
        market: 'market',
        review: 'market',
        kitchen: 'kitchen',
        doc: 'kitchen',
        slowmo: 'slowmo',
        pour: 'slowmo',
      }
      return m[x] || null
    }
    if (typeof x === 'object') {
      const f = x.format
      const m = x.mode || ''
      if (f === 'night') return m === 'blue' ? 'night-blue' : 'night-violet'
      if (f === 'market') return /60/.test(m) ? 'slowmo' : 'market'
      if (f === 'kitchen') return /60/.test(m) ? 'slowmo' : 'kitchen'
      if (f === 'doc') return 'kitchen'
      if (x.id) return presetIdFrom(x.id)
    }
    return null
  }

  function mount(host, opts = {}) {
    const inst = {
      app: opts.screen === 'pixel' ? 'pixel' : 'bmd',
      preset: presetOf(presetIdFrom(opts.preset) || 'night-violet'),
      land: false,
      rec: false,
      recStart: 0,
      recSec: 0,
      t: 0,
      sheet: null,
      page: 'camera',
      locked: false,
    }
    inst.st = presetState(inst.preset)
    let expRef = presetExposure(inst.preset)
    const saved = LN.store.get('rigPhone.v1', null)
    if (saved && typeof saved === 'object') {
      if (!opts.screen && (saved.app === 'bmd' || saved.app === 'pixel'))
        inst.app = saved.app
      if (!opts.preset && presetIdFrom(saved.preset)) {
        inst.preset = presetOf(presetIdFrom(saved.preset))
        inst.st = presetState(inst.preset)
        expRef = presetExposure(inst.preset)
      }
    }
    const remember = () =>
      LN.store.set('rigPhone.v1', { app: inst.app, preset: inst.preset.id })

    /* ---- DOM */
    const screenCanvas = h('canvas', {
      class: 'rp-flat-canvas',
      width: SW,
      height: SH,
      'aria-label': 'Simulated camera app screen',
      role: 'img',
    })
    const stage = h('div', {
      class: 'rp-stage',
      tabindex: '0',
      'aria-label':
        'Pixel 10 Pro XL model. Drag to turn, arrow keys to orbit, wheel or pinch to zoom.',
    })
    const hotLayer = h('div', { class: 'rp-hotspots' })
    const fbNote = h('p', {
      class: 'rp-fallback ln-small ln-faint',
      hidden: true,
    })
    const flatWrap = h('div', { class: 'rp-flat' }, screenCanvas)
    const readout = h('div', { class: 'rp-readout' })
    const appSeg = ui.seg({
      label: 'Camera app',
      options: [
        { value: 'bmd', label: 'Blackmagic Camera' },
        { value: 'pixel', label: 'Pixel Camera' },
      ],
      value: inst.app,
      onChange: v => setApp(v),
    })
    const presetSeg = ui.seg({
      label: 'Preset',
      options: PRESETS.map(p => ({ value: p.id, label: p.short })),
      value: inst.preset.id,
      onChange: v => setPreset(v),
    })
    const landBtn = ui.btn('Landscape', () => setLand(!inst.land), {
      kind: 'quiet',
      small: true,
    })
    const viewBar = h(
      'div',
      { class: 'rp-views ln-row' },
      ui.btn('Back', () => setView('back'), { kind: 'quiet', small: true }),
      ui.btn('Front', () => setView('front'), { kind: 'quiet', small: true }),
      ui.btn('Camera bar', () => setView('bar'), {
        kind: 'quiet',
        small: true,
      }),
      ui.btn('Flip', flip, { kind: 'ghost', small: true }),
      landBtn,
    )
    const approx = h(
      'details',
      { class: 'rp-approx' },
      h('summary', null, 'Approximate details in this model'),
      h(
        'ul',
        { class: 'ln-small' },
        SPECS.approximate.map(t => h('li', null, t)),
      ),
      h(
        'p',
        { class: 'ln-faint ln-small' },
        'Body size, display and sensor figures are published. Everything in the list above is drawn as the most likely layout from the research, not measured.',
      ),
    )
    const root = h(
      'div',
      { class: 'rp-root' },
      h('div', { class: 'rp-top' }, appSeg.el, presetSeg.el),
      h(
        'div',
        { class: 'rp-grid' },
        h(
          'div',
          { class: 'rp-model' },
          h('div', { class: 'rp-stage-wrap' }, stage, hotLayer),
          viewBar,
          fbNote,
          approx,
        ),
        h(
          'div',
          { class: 'rp-screen' },
          flatWrap,
          h(
            'p',
            { class: 'rp-caption ln-small ln-faint' },
            'Simulated layout, drawn from the research and the runbook. Tap the values on the screen to change them; the viewfinder answers.',
          ),
          readout,
        ),
      ),
    )
    host.append(root)

    /* ---- screen painting */
    let hits = []
    let vfDirty = true
    let vfCv = null
    let model = null
    let fallback = null
    let screenCopy = null
    const ctxFlat = screenCanvas.getContext('2d')
    function paint() {
      if (vfDirty) {
        vfCv = renderViewfinder(
          ctxFlat,
          inst.st,
          inst.preset.scene,
          inst.t,
          inst.app,
          expRef,
        )
        vfDirty = false
      }
      hits = drawScreen(screenCanvas, inst.st, inst, vfCv)
      if (model) model.screenTex.needsUpdate = true
      if (screenCopy) {
        const c2 = screenCopy.getContext('2d')
        c2.drawImage(screenCanvas, 0, 0)
      }
      flatWrap.classList.toggle('land', inst.app === 'bmd' && inst.land)
      wake()
    }
    const change = () => {
      vfDirty = true
      paint()
      renderReadout()
    }

    /* ---- setters */
    function setApp(id) {
      inst.app = id === 'pixel' ? 'pixel' : 'bmd'
      inst.sheet = null
      if (inst.app === 'pixel') {
        inst.land = false
        if (!PX_FPS.includes(inst.st.fps)) inst.st.fps = 30
      }
      appSeg.set(inst.app)
      landBtn.hidden = inst.app !== 'bmd'
      remember()
      setLand(inst.land && inst.app === 'bmd')
      change()
    }
    function setPreset(id) {
      const pid = presetIdFrom(id)
      if (!pid) return
      inst.preset = presetOf(pid)
      inst.st = presetState(inst.preset)
      expRef = presetExposure(inst.preset)
      if (inst.app === 'pixel' && !PX_FPS.includes(inst.st.fps))
        inst.st.fps = 30
      presetSeg.set(pid)
      remember()
      change()
    }
    function setLand(on) {
      inst.land = !!on && inst.app === 'bmd'
      landBtn.textContent = inst.land ? 'Vertical' : 'Landscape'
      landBtn.setAttribute('aria-pressed', String(inst.land))
      orbit.trz = inst.land ? -PI / 2 : 0
      paint()
    }
    function toggleRec() {
      inst.rec = !inst.rec
      inst.recStart = performance.now()
      if (!inst.rec) inst.recSec = 0
      paint()
    }
    function set(key, val) {
      const s = inst.st
      if (key === 'fps') {
        s.fps = val
        s.angle = clamp(s.angle, 45, 360)
      } else if (key === 'pxshutter') {
        // Pixel shows speeds: 1/val s → angle at the current fps
        s.angle = clamp((360 * s.fps) / val, 45, 360)
      } else s[key] = val
      change()
    }

    /* ---- pickers */
    const chipRow = (vals, cur, fmt, on) =>
      h(
        'div',
        { class: 'ln-row' },
        vals.map(v =>
          h(
            'button',
            {
              type: 'button',
              class: 'ln-chip',
              'aria-pressed': String(v === cur),
              onClick: () => on(v),
            },
            fmt ? fmt(v) : String(v),
          ),
        ),
      )
    function picker(key) {
      const s = inst.st
      const px = inst.app === 'pixel'
      let sheet = null
      const done = () => sheet && sheet.close()
      const pick = (k, v) => {
        set(k, v)
        done()
      }
      let title = ''
      let body = null
      if (key === 'lens') {
        title = 'Lens'
        body = h(
          'div',
          { class: 'ln-stack' },
          chipRow(
            LENSES.map(l => l.id),
            s.lens,
            v => `${v} · ${lensOf(v).f}`,
            v => pick('lens', v),
          ),
          h(
            'p',
            { class: 'ln-small ln-muted' },
            px
              ? PX_VERIFY.lens
              : '2x is a centre crop of the 1x sensor, so it keeps ƒ/1.68.',
          ),
        )
      } else if (key === 'fps') {
        title = 'Frame rate'
        body = chipRow(
          px ? PX_FPS : FPS,
          s.fps,
          v => `${v} fps`,
          v => pick('fps', v),
        )
      } else if (key === 'shutter' || key === 'pxshutter') {
        title = px ? 'Shutter speed' : 'Shutter angle'
        body = px
          ? h(
              'div',
              { class: 'ln-stack' },
              chipRow(
                SPEEDS.filter(v => v >= s.fps),
                Math.round(1 / expTime(s)),
                v => `1/${v}`,
                v => pick('pxshutter', v),
              ),
              h('p', { class: 'ln-small ln-muted' }, PX_VERIFY.shutter),
            )
          : h(
              'div',
              { class: 'ln-stack' },
              chipRow(
                ANGLES,
                s.angle,
                v => `${fmtAngle(v)} · ${fmtSpeed({ ...s, angle: v })}`,
                v => pick('angle', v),
              ),
              h(
                'p',
                { class: 'ln-small ln-muted' },
                `At ${s.fps} fps, 180° is ${fmtSpeed({ ...s, angle: 180 })} s and 360° is 1/${s.fps} s.`,
              ),
            )
      } else if (key === 'iso') {
        title = 'ISO'
        body = h(
          'div',
          { class: 'ln-stack' },
          chipRow(ISOS, s.iso, null, v => pick('iso', v)),
          px ? h('p', { class: 'ln-small ln-muted' }, PX_VERIFY.iso) : null,
        )
      } else if (key === 'iris') {
        LN.toast(
          `The ${s.lens} lens is fixed at ${lensOf(s.lens).f}. Phone lenses have no iris; exposure is ISO and shutter.`,
          { ms: 4200 },
        )
        return
      } else if (key === 'wb') {
        title = 'White balance'
        const sl = ui.slider({
          label: 'Kelvin',
          min: WB_MIN,
          max: WB_MAX,
          step: 100,
          value: s.wb,
          unit: 'K',
          onInput: v => set('wb', v),
        })
        body = h(
          'div',
          { class: 'ln-stack' },
          sl.el,
          chipRow(
            WB_QUICK,
            s.wb,
            v => `${v}K`,
            v => {
              sl.set(v)
              set('wb', v)
            },
          ),
          px ? h('p', { class: 'ln-small ln-muted' }, PX_VERIFY.wb) : null,
        )
      } else if (key === 'tint') {
        title = 'Tint'
        body = ui.slider({
          label: 'Green ↔ magenta',
          min: -50,
          max: 50,
          step: 1,
          value: s.tint,
          format: v => LN.fmt.signed(v),
          onInput: v => set('tint', v),
        }).el
      } else if (key === 'res') {
        title = 'Resolution'
        body = chipRow(['4K', '1080p'], s.res, null, v => pick('res', v))
      } else if (key === 'stab') {
        title = 'Stabilization'
        body = h(
          'div',
          { class: 'ln-stack' },
          chipRow(STABS, s.stab, null, v => pick('stab', v)),
          h('p', { class: 'ln-small ln-muted' }, PX_VERIFY.stab),
        )
      } else if (key === 'lutPick') {
        title = 'LUT selection'
        body = chipRow(
          LUTS,
          s.lut,
          v => `LunarNight_v2_${v}.cube`,
          v => pick('lut', v),
        )
      } else if (key === 'focus') {
        title = 'Focus'
        body = h(
          'div',
          { class: 'ln-stack' },
          ui.slider({
            label: 'Near ↔ far',
            min: 0,
            max: 1,
            step: 0.01,
            value: s.focus,
            format: v => (v >= 0.95 ? '∞' : v.toFixed(2)),
            onInput: v => set('focus', v),
          }).el,
          h('p', { class: 'ln-small ln-muted' }, PX_VERIFY.focus),
        )
      } else if (key === 'shadows') {
        title = 'Shadows'
        body = h(
          'div',
          { class: 'ln-stack' },
          ui.slider({
            label: 'Shadows',
            min: -1,
            max: 1,
            step: 0.05,
            value: s.shadows,
            format: v => shadowWord(v),
            onInput: v => set('shadows', v),
          }).el,
          h('p', { class: 'ln-small ln-muted' }, PX_VERIFY.shadows),
        )
      } else if (key === 'ev') {
        title = 'Exposure'
        body = ui.slider({
          label: 'EV',
          min: -2,
          max: 2,
          step: 0.1,
          value: s.ev,
          format: v => fmtEv(v),
          onInput: v => set('ev', v),
        }).el
      } else if (typeof s[key] === 'boolean') {
        set(key, !s[key])
        return
      } else return
      sheet = LN.sheet({ title, body })
    }

    /* ---- screen taps */
    function tapScreen(x, y) {
      const r = hitAt(hits, inst, x, y)
      if (!r) return
      const { hit, lx } = r
      const a = hit.act
      if (a === 'hud') picker(hit.arg)
      else if (a === 'rec') toggleRec()
      else if (a === 'toggle')
        set(
          hit.arg === 'lut' ? 'lutOn' : hit.arg,
          !inst.st[hit.arg === 'lut' ? 'lutOn' : hit.arg],
        )
      else if (a === 'gear') {
        inst.sheet = inst.sheet === 'bmd' ? null : 'bmd'
        paint()
      } else if (a === 'sheet') {
        inst.sheet = null
        paint()
      } else if (a === 'page') {
        inst.page = hit.arg
        paint()
      } else if (a === 'pxsheet') {
        inst.sheet = inst.sheet === hit.arg ? null : hit.arg
        paint()
      } else if (a === 'set') picker(hit.arg)
      else if (a === 'slide') {
        const f = clamp((lx - hit.x0) / (hit.x1 - hit.x0), 0, 1)
        const k = hit.arg
        if (k === 'wb')
          set('wb', Math.round((WB_MIN + f * (WB_MAX - WB_MIN)) / 100) * 100)
        else if (k === 'pxshutter') set('angle', 45 + (1 - f) * 315)
        else if (k === 'iso')
          set('iso', ISOS[Math.round(f * (ISOS.length - 1))])
        else if (k === 'focus') set('focus', f)
        else if (k === 'shadows') set('shadows', f * 2 - 1)
        else if (k === 'ev') set('ev', Math.round((f * 4 - 2) * 10) / 10)
      } else if (a === 'chip') {
        const l = LENSES.find(q => q.chip === hit.arg)
        if (l) set('lens', l.id)
        else
          LN.toast(
            '10x is a centre crop of the 5x telephoto (likely). Not in these presets.',
            { kind: 'warn' },
          )
      } else if (a === 'mode') {
        if (hit.arg !== 'Video')
          LN.toast(`${hit.arg} is not part of the shoot. Stay on Video.`, {
            kind: 'warn',
          })
      } else if (a === 'lock') {
        inst.locked = !inst.locked
        paint()
        LN.toast(
          inst.locked
            ? 'Locked. Google documents the Lock button; tap-and-hold is disputed.'
            : 'Unlocked',
        )
      } else if (a === 'focus') {
        if (inst.app === 'pixel')
          LN.toast(
            'Tap the subject, then Lock (top right) to hold focus and exposure.',
          )
        else LN.toast('Tap the lit wall, then lock focus in the Focus dial.')
      } else if (a === 'gallery')
        LN.toast(
          'Gallery: your last clip. Do not review on location; the LUT preview is the review.',
        )
      else if (a === 'flip')
        LN.toast('Front camera: 42 MP, ƒ/2.2, 103°. Bite + verdict only.')
      else if (a === 'scopes')
        LN.toast(
          'Histogram of the viewfinder. Expose for the lights, not the walls.',
        )
    }
    screenCanvas.addEventListener('click', e => {
      const r = screenCanvas.getBoundingClientRect()
      let x = e.clientX - r.left
      let y = e.clientY - r.top
      if (flatWrap.classList.contains('land')) {
        // the flat canvas is shown rotated 90° clockwise: unrotate
        const nx = y
        const ny = r.width - x
        x = nx
        y = ny
        tapScreen((x / r.height) * SW, (y / r.width) * SH)
        return
      }
      tapScreen((x / r.width) * SW, (y / r.height) * SH)
    })

    /* ---- readout */
    function renderReadout() {
      const s = inst.st
      const p = inst.preset
      const why = p.why
      const px = inst.app === 'pixel'
      const rows = []
      const add = (label, value, w, verify) =>
        rows.push([label, value, w, verify])
      add(
        'Lens',
        `${s.lens} · ${lensOf(s.lens).f}`,
        why.lens,
        px && PX_VERIFY.lens,
      )
      add('Resolution', px ? s.res : `${s.res} · HEVC Max · Rec.709`, why.res)
      add('Frame rate', `${s.fps} fps`, why.fps)
      add(
        'Shutter',
        px ? `${fmtSpeed(s)} s` : `${fmtAngle(s.angle)} · ${fmtSpeed(s)} s`,
        why.shutter,
        px && PX_VERIFY.shutter,
      )
      add('ISO', String(s.iso), why.iso, px && PX_VERIFY.iso)
      add(
        'White balance',
        `${s.wb}K${px ? '' : s.wbLock ? ' · locked on record' : ''}`,
        why.wb,
        px && PX_VERIFY.wb,
      )
      if (!px) add('Tint', LN.fmt.signed(s.tint), why.tint)
      if (px) {
        add(
          'Focus',
          s.focus >= 0.95 ? 'Manual · ∞' : `Manual · ${s.focus.toFixed(2)}`,
          'Tap the building or the plate, then lock.',
          PX_VERIFY.focus,
        )
        add('Shadows', shadowWord(s.shadows), why.shadows, PX_VERIFY.shadows)
        add('Exposure', `${fmtEv(s.ev)} EV`, why.ev)
        add('10-bit HDR', s.hdr10 ? 'On' : 'Off', why.hdr10)
        add('Stabilization', s.stab, why.stab, PX_VERIFY.stab)
        add('Video Boost', s.boost ? 'On' : 'Off', why.boost)
        add('Night Sight', s.night ? 'On' : 'Off', why.night, PX_VERIFY.night)
        add(
          'Lock',
          inst.locked ? 'Focus and exposure locked' : 'Tap subject, then Lock',
          'Hold the frame so auto modes stop fighting you.',
          PX_VERIFY.lock,
        )
      } else {
        add(
          'LUT',
          s.lutOn
            ? `Display: LunarNight_v2_${s.lut}${s.lutRec ? ' · recorded to clip' : ''}`
            : 'Off',
          why.lut,
        )
        add('Zebras', s.zebra ? 'On · 95%' : 'Off', why.zebra)
        add('Focus assist', s.peak ? 'On' : 'Off', why.peak)
        add('Stabilization', s.bmStab ? 'On' : 'Off', why.stab)
        add(
          'Noise reduction · sharpening',
          `${s.bmNR ? 'On' : 'Off'} · ${s.bmSharp ? 'On' : 'Off'}`,
          'Both smear the dark areas and sharpen grain. Off.',
        )
        add('HDR', s.bmHdr ? 'HLG' : 'Off · Rec.709', why.hdr10)
        add(
          'Vertical video',
          s.vertical ? 'On' : 'Off',
          '9:16 in camera, so the frame you see is the frame you post.',
        )
      }
      const list = h(
        'div',
        { class: 'rp-rows' },
        rows.map(([k, v, w, verify]) =>
          h(
            'div',
            { class: 'rp-row' },
            h('div', { class: 'rp-k' }, k),
            h(
              'div',
              { class: 'rp-v ln-num' },
              v,
              verify
                ? h(
                    'span',
                    { class: 'rp-verify', title: verify },
                    'verify on your phone',
                  )
                : null,
            ),
            h('div', { class: 'rp-why' }, w),
          ),
        ),
      )
      const copyText = () => {
        const lines = [
          `${p.name} · ${px ? 'Pixel Camera' : 'Blackmagic Camera'} · Pixel 10 Pro XL`,
          ...rows.map(([k, v, w]) => `${k}: ${v}  — ${w}`),
        ]
        if (px)
          lines.push(
            '',
            'Verify on your phone: ' +
              rows
                .filter(r => r[3])
                .map(r => r[0])
                .join(', '),
          )
        return lines.join('\n')
      }
      readout.replaceChildren(
        h(
          'div',
          { class: 'rp-readout-head' },
          h(
            'div',
            null,
            h('b', null, p.name),
            h('div', { class: 'ln-small ln-muted' }, p.note),
          ),
          ui.btn(
            'Copy settings',
            () => LN.copy(copyText(), { label: 'Settings copied' }),
            { small: true },
          ),
        ),
        list,
        px && rows.some(r => r[3])
          ? ui.callout(
              'verify',
              'Rows marked “verify on your phone” come from pixel-app.md findings that are unverified or disputed. The runbook says Pro controls work in video on the Pro phones; check which sliders your version shows in Video mode.',
            )
          : null,
      )
    }

    /* ---- orbit state (shared by three.js and the CSS fallback) */
    const orbit = {
      rx: 0.1,
      ry: PI + 0.8,
      rz: 0,
      dist: 640,
      ty: 0,
      trx: 0.1,
      try: PI,
      trz: 0,
      tdist: 460,
      tty: 0,
      vx: 0,
      vy: 0,
      spin: !LN.reducedMotion(),
      drag: null,
      pinch: null,
    }
    function setView(name) {
      const v = VIEWS[name]
      if (!v) return
      orbit.spin = false
      const k = Math.round((orbit.ry - v.ry) / (PI * 2))
      orbit.try = v.ry + k * PI * 2
      orbit.trx = v.rx
      orbit.tdist = v.dist
      orbit.tty = v.ty
      orbit.vx = orbit.vy = 0
      wake()
    }
    function flip() {
      orbit.spin = false
      orbit.try += PI
      orbit.vx = orbit.vy = 0
      wake()
    }

    /* ---- hotspots */
    const hotBtns = {}
    for (const id of PART_IDS) {
      const p = PARTS[id]
      hotBtns[id] = h(
        'button',
        {
          type: 'button',
          class: `rp-hot ${p.kind === 'Rear lens' || p.kind === 'Front lens' ? 'lens' : ''}`,
          'aria-label': p.name,
          title: p.name,
          onClick: e => {
            e.stopPropagation()
            specCard(id)
          },
        },
        h('i', null),
      )
    }
    function specCard(id) {
      const p = PARTS[id]
      const conf = c => h('span', { class: `rp-conf ${c}` }, CONF[c] || c)
      LN.sheet({
        title: p.name,
        body: h(
          'div',
          { class: 'ln-stack rp-card' },
          h(
            'div',
            { class: 'ln-row' },
            ui.chip(p.kind, 'amber'),
            ui.chip(SPECS.model),
          ),
          h(
            'dl',
            { class: 'ln-kv' },
            p.rows.flatMap(([k, v, c]) => [
              h('dt', null, k),
              h(
                'dd',
                null,
                v,
                ' ',
                conf(c),
                needsVerify(c)
                  ? h('span', { class: 'rp-verify' }, 'verify')
                  : null,
              ),
            ]),
            h('dt', null, 'Where it sits'),
            h(
              'dd',
              null,
              p.place[0],
              ' ',
              conf(p.place[1]),
              needsVerify(p.place[1])
                ? h('span', { class: 'rp-verify' }, 'verify')
                : null,
            ),
          ),
          h(
            'p',
            { class: 'ln-prose' },
            h('strong', null, 'For food and night: '),
            p.use,
          ),
        ),
      })
    }

    /* ---- pointer orbit */
    const onDown = e => {
      if (e.target.closest('.rp-hot')) return
      stage.focus({ preventScroll: true })
      orbit.spin = false
      if (orbit.drag && e.pointerId !== orbit.drag.id) {
        orbit.pinch = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          d0: 0,
          dist0: orbit.tdist,
        }
        return
      }
      orbit.drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        lx: e.clientX,
        ly: e.clientY,
        t: performance.now(),
        moved: false,
      }
      orbit.vx = orbit.vy = 0
      stage.setPointerCapture(e.pointerId)
      wake()
    }
    const onMove = e => {
      if (orbit.pinch && orbit.drag) {
        if (e.pointerId === orbit.pinch.id) {
          orbit.pinch.x = e.clientX
          orbit.pinch.y = e.clientY
        } else if (e.pointerId === orbit.drag.id) {
          orbit.drag.lx = e.clientX
          orbit.drag.ly = e.clientY
        }
        const d = Math.hypot(
          orbit.pinch.x - orbit.drag.lx,
          orbit.pinch.y - orbit.drag.ly,
        )
        if (!orbit.pinch.d0) orbit.pinch.d0 = d
        else
          orbit.tdist = clamp(
            (orbit.pinch.dist0 * orbit.pinch.d0) / Math.max(10, d),
            ZOOM_MIN,
            ZOOM_MAX,
          )
        wake()
        return
      }
      if (!orbit.drag || e.pointerId !== orbit.drag.id) return
      const dx = e.clientX - orbit.drag.lx
      const dy = e.clientY - orbit.drag.ly
      const now = performance.now()
      const dt = Math.max(1, now - orbit.drag.t)
      orbit.vx = (dx * 0.011) / dt
      orbit.vy = (dy * 0.007) / dt
      orbit.try += dx * 0.011
      orbit.trx = clamp(orbit.trx + dy * 0.007, -1.1, 1.1)
      orbit.drag.lx = e.clientX
      orbit.drag.ly = e.clientY
      orbit.drag.t = now
      if (
        Math.abs(e.clientX - orbit.drag.x) +
          Math.abs(e.clientY - orbit.drag.y) >
        6
      )
        orbit.drag.moved = true
      wake()
    }
    const onUp = e => {
      if (orbit.pinch && e.pointerId === orbit.pinch.id) {
        orbit.pinch = null
        return
      }
      if (!orbit.drag || e.pointerId !== orbit.drag.id) return
      const d = orbit.drag
      orbit.drag = null
      orbit.pinch = null
      if (performance.now() - d.t > 80) orbit.vx = orbit.vy = 0
      if (!d.moved && model) {
        const r = stage.getBoundingClientRect()
        const pt = model.pick(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1,
        )
        if (pt) tapScreen(pt[0], pt[1])
      }
      wake()
    }
    stage.addEventListener('pointerdown', onDown)
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerup', onUp)
    stage.addEventListener('pointercancel', onUp)
    stage.addEventListener(
      'wheel',
      e => {
        e.preventDefault()
        orbit.tdist = clamp(
          orbit.tdist * (1 + e.deltaY * 0.0012),
          ZOOM_MIN,
          ZOOM_MAX,
        )
        wake()
      },
      { passive: false },
    )
    stage.addEventListener('keydown', e => {
      const k = e.key
      if (k === 'ArrowLeft') orbit.try -= 0.25
      else if (k === 'ArrowRight') orbit.try += 0.25
      else if (k === 'ArrowUp') orbit.trx = clamp(orbit.trx - 0.15, -1.1, 1.1)
      else if (k === 'ArrowDown') orbit.trx = clamp(orbit.trx + 0.15, -1.1, 1.1)
      else if (k === '+' || k === '=')
        orbit.tdist = clamp(orbit.tdist * 0.85, ZOOM_MIN, ZOOM_MAX)
      else if (k === '-')
        orbit.tdist = clamp(orbit.tdist * 1.18, ZOOM_MIN, ZOOM_MAX)
      else return
      e.preventDefault()
      orbit.spin = false
      wake()
    })

    /* ---- render loop: runs only while visible and something moves */
    let running = false
    let visible = true
    let routeOn = true
    let last = 0
    let lastVf = 0
    let stageW = 1
    let stageH = 1
    const active = () =>
      visible && routeOn && !document.hidden && root.isConnected
    function wake() {
      if (running || !active()) return
      running = true
      last = performance.now()
      requestAnimationFrame(frame)
    }
    const animScene = () =>
      !LN.reducedMotion() &&
      (inst.preset.scene === 'night' || inst.preset.scene === 'pour')
    function frame(now) {
      if (!active()) {
        running = false
        return
      }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const o = orbit
      if (o.spin && !o.drag) o.try += dt * 0.25
      if (!o.drag && (o.vx || o.vy)) {
        o.try += o.vx * dt * 1000
        o.trx = clamp(o.trx + o.vy * dt * 1000, -1.1, 1.1)
        const damp = 0.92 ** (dt * 60)
        o.vx *= damp
        o.vy *= damp
        if (Math.abs(o.vx) < 0.00002 && Math.abs(o.vy) < 0.00002)
          o.vx = o.vy = 0
      }
      const k = 1 - 0.0025 ** dt
      o.ry += (o.try - o.ry) * k
      o.rx += (o.trx - o.rx) * k
      o.rz += (o.trz - o.rz) * k
      o.dist += (o.tdist - o.dist) * k
      o.ty += (o.tty - o.ty) * k
      let busy = o.spin || o.drag || o.pinch || o.vx || o.vy
      const settled =
        Math.abs(o.try - o.ry) +
          Math.abs(o.trx - o.rx) +
          Math.abs(o.trz - o.rz) +
          Math.abs(o.tty - o.ty) <
          0.0008 && Math.abs(o.tdist - o.dist) < 0.2
      if (!settled) busy = true
      // scene time, record clock
      if (inst.rec) {
        const sec = Math.floor((now - inst.recStart) / 1000)
        if (sec !== inst.recSec) {
          inst.recSec = sec
          paint()
        }
        busy = true
      }
      if (animScene() && now - lastVf > 110) {
        lastVf = now
        inst.t += 0.09
        vfDirty = true
        paint()
        busy = true
      }
      if (model) {
        model.pivot.rotation.set(o.rx, o.ry, 0)
        model.phone.rotation.z = o.rz
        model.phone.position.y = -o.ty
        model.pool.position.y = -MM.h / 2 - 16 - o.ty
        model.camera.position.set(0, 10, o.dist)
        model.camera.lookAt(0, 0, 0)
        model.renderer.render(model.scene, model.camera)
        placeHotspots()
      } else if (fallback) fallback.update(o.rx, o.ry, o.rz, o.dist)
      if (busy) requestAnimationFrame(frame)
      else running = false
    }
    function placeHotspots() {
      for (const id of PART_IDS) {
        const r = model.project(anchorOf(PARTS[id]), stageW, stageH)
        const b = hotBtns[id]
        b.hidden = !r.on
        if (r.on)
          b.style.transform = `translate(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px)`
      }
    }
    function resize() {
      const r = stage.getBoundingClientRect()
      stageW = Math.max(1, r.width)
      stageH = Math.max(1, r.height)
      if (model) {
        model.renderer.setSize(stageW, stageH, false)
        model.renderer.domElement.style.width = `${stageW}px`
        model.renderer.domElement.style.height = `${stageH}px`
        model.camera.aspect = stageW / stageH
        model.camera.updateProjectionMatrix()
      }
      wake()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(stage)
    const io = new IntersectionObserver(es => {
      visible = es.some(x => x.isIntersecting)
      if (visible) wake()
    })
    io.observe(root)
    const offRoute = LN.bus.on('route', () => {
      const view = root.closest('.ln-view')
      routeOn = !view || !view.hidden
      if (routeOn) wake()
    })
    const onVis = () => {
      if (!document.hidden) wake()
    }
    document.addEventListener('visibilitychange', onVis)

    /* ---- boot */
    paint()
    renderReadout()
    landBtn.hidden = inst.app !== 'bmd'
    function useFallback(why) {
      screenCopy = h('canvas', { width: SW, height: SH })
      fallback = buildCssPhone(stage, screenCopy)
      for (const id of PART_IDS) fallback.place(id, hotBtns[id])
      hotLayer.hidden = true
      fbNote.hidden = false
      fbNote.textContent = `${why} The phone is drawn with CSS at the same proportions; the live screen and hotspots still work.`
      paint()
      wake()
    }
    loadThree()
      .then(THREE => {
        if (!root.isConnected) return
        try {
          model = buildModel(THREE, stage, screenCanvas)
        } catch (e) {
          console.warn('[rigPhone] WebGL unavailable', e)
          useFallback('3D rendering is not available here.')
          return
        }
        for (const id of PART_IDS) hotLayer.append(hotBtns[id])
        resize()
        paint()
        wake()
      })
      .catch(() =>
        useFallback('The three.js library could not be loaded (offline copy).'),
      )

    const api = {
      el: root,
      setApp,
      setPreset,
      setView,
      flip,
      setLandscape: setLand,
      getState: () => ({ app: inst.app, preset: inst.preset.id, ...inst.st }),
      destroy() {
        instances.delete(api)
        ro.disconnect()
        io.disconnect()
        offRoute()
        document.removeEventListener('visibilitychange', onVis)
        if (model) model.dispose()
        root.remove()
      },
    }
    instances.add(api)
    return api
  }

  LN.rigPhone = {
    mount,
    setApp(id) {
      for (const i of instances) i.setApp(id)
    },
    setPreset(id) {
      for (const i of instances) i.setPreset(id)
    },
    SPECS,
    PRESETS,
    presetIdFrom,
  }
})()
