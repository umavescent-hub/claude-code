/* Kubrick: data/appmaps.js. Interface maps of the four apps the chef uses:
   CapCut Mobile, CapCut Desktop, Blackmagic Camera and Pixel Camera.
   Sets LN.data.appMaps = { apps: [...] }.
   Shape: app { id, name, device:'phone'|'desktop', version, root, screens[] }
          screen { id, name, kind?, over?, slot?, entry?, regions[] }
          region { id, kind, area?, items[] }
          item { id, label, altLabels, icon, opens, does, pro, confidence, house }
   `house` = the chef's own values from the runbook and the playbook, plus `go`,
   the Kubrick module that does the job. Confidence comes from the research
   maps: confirmed | likely | unverified (shown as "check on your phone"). */
;(() => {
  const LN = window.LN
  LN.data = LN.data || {}

  /* it(id, label, does, opts) → item */
  const it = (id, label, does, o = {}) => ({
    id,
    label,
    does,
    altLabels: o.alt || [],
    icon: o.icon || 'dot',
    opens: o.opens || null,
    pro: o.pro || 'free',
    confidence: o.conf || 'unverified',
    house: o.house || null,
  })
  const region = (id, kind, items, extra = {}) => ({
    id,
    kind,
    items,
    ...extra,
  })

  /* ---------------------------------------------------- house values (canon) */
  const ADJUST = {
    value:
      'Lunar Night v2 recipe: Exposure −15, Contrast +25, Shadows −40, Highlights −10, Saturation +15, Temp −30, Tint +15 (0 for Blue), Fade 0, Vignette +10. Then Apply to all.',
    why: 'About 70% of the look is made in camera; these sliders finish the crush and the violet shadows. If it looks grey: Shadows −50 and Exposure −20.',
    go: '#grade',
  }
  const HSL = {
    value:
      'Night: Blue hue +15 sat +10; Green sat +10; Orange sat +10; Yellow sat −10. Food: Orange and Red sat +8 to +15, lum +5; Green sat −5 to −15; Blue toward teal, sat +10. Never touch the Orange hue.',
    go: '#grade',
  }
  const CURVES = {
    value:
      'Gentle S as the base. Dark look: drop the black point and pull the shadows. Dreamcore: lift the black point. Blue up in shadows and down in highlights gives teal/orange.',
    go: '#grade',
  }
  const SPEED_CURVE = {
    value:
      'Impact Drop (fast › hold › fast) and Whip-Pulse nodes from The Cut. Never below 0.5x without a 60 fps source. R&D Lab uses the ramps; reels never do.',
    go: '#edit',
  }
  const SAFE =
    'Safe zone on 1080×1920: keep the top 130 px, right 140 px and bottom 484 px clear.'
  const CAPTIONS = {
    value:
      'Auto captions › English › Generate, then fix every line. Marketplace Review: Inter Bold, white with black outline, no box, 3–4 words per line, middle third, always on. Reels: no captions, lime lowercase title instead.',
    why: SAFE,
    go: '#type',
  }
  const EXPORT = {
    value:
      'Resolution 1080p · Frame rate 30 fps for Marketplace Review (60 if shot at 60), 24 fps for Lunar Night reels · Code rate High · Smart HDR off.',
    why: 'Match the capture frame rate; never re-record the screen.',
    go: '#edit',
  }
  const BLEND = {
    value:
      'Plates: Screen or Lighten for halation (duplicate the clip, Blur 20–40, warm Temp, Opacity 25–45). Overlay or Soft light for texture plates at 20–35. Multiply for vignettes and dirt at 40–60.',
    go: '#forge',
  }
  const TEXT = {
    value:
      'Hook card: white box, black Inter Bold, lowercase, ≤8 words, below the top 130 px, about 2 s, no animation. Reel title: lime #D6DB05 condensed (Oswald), lowercase, two short lines, upper third, small black shadow, first 3 s.',
    why: SAFE,
    go: '#type',
  }
  const FONT = {
    value:
      'Fonts › Import (.ttf/.otf). One pairing per series: Estrella Early + Inter for the main series. Two fonts max.',
    go: '#type',
  }
  const AUDIO_LEVELS = {
    value:
      'Voice 100, music 10–20, one SFX per big moment at 30–60. Reels: ambient at 20–30 or the night sound at 100; no voice, no SFX.',
    go: '#edit',
  }
  const RATIO = { value: '9:16 for every format.', go: '#edit' }
  const FILTER = {
    value:
      'Marketplace Review: a subtle filter at 20–40 strength, then Apply to all. A LUT at 100% is a filter; keep looks at 50–70%.',
    go: '#grade',
  }
  const LUT_MOBILE = {
    value:
      'Mobile cannot import .cube LUTs (desktop only). Route A: check your phone for Adjust › LUT › Import. Route B: bake it (Blackmagic Record LUT to Clip, or the Kubrick Bake). Route C: the slider recipe.',
    why: 'The playbook claims Adjust › LUT › Import on mobile; treat it as unverified until you see it.',
    go: '#grade',
  }
  const LUT_DESKTOP = {
    value:
      'Adjustment › LUT › Import › LunarNight_v2_Violet.cube (or Blue, Soft). Hover the tile, click +, stretch the segment over the clips, Intensity 50–70.',
    go: '#grade',
  }
  const GLOW = {
    value: 'Glow 25 at a small size over the whole video; Grain 20.',
    go: '#grade',
  }
  const KEYFRAME = {
    value:
      'One move per shot: 100% › 108% over 3 s. Zooms of 8–15% on the bite, the money shot and the verdict.',
    go: '#edit',
  }
  const CUTS = {
    value:
      'Marketplace Review: a cut every 1–3 s, every pause cut, hard cuts, ≤2 transitions. Reels: 3–5 s static holds. Cut on motion or sound, never on nothing.',
    go: '#edit',
  }
  const ENDING = {
    value: 'Gear › Add default ending › Off. End on the verdict, no goodbye.',
    go: '#edit',
  }
  const VOLUME = {
    value:
      'Clip voice at 100. Music clips 10–20. Peaks: voice −6 to −3 dB, music −18 to −12 dB, ducked under speech.',
    go: '#edit',
  }
  const NOISE = {
    value:
      'Reduce noise is Pro on mobile; skip it. Record the voice close instead.',
    go: '#edit',
  }
  const BEATS = {
    value:
      'Beats auto-detect for the rough cut; reviews 1.5–3 s per shot. Reels cut to the music.',
    go: '#edit',
  }
  const COVER = {
    value: 'The most colourful frame, Estrella Early, 4 words max.',
    why: SAFE,
    go: '#type',
  }

  /* ========================================================= CapCut Mobile */
  const capcutMobile = {
    id: 'capcut-mobile',
    name: 'CapCut Mobile',
    short: 'CapCut Mobile',
    device: 'phone',
    version: 'Android 19.x (2026)',
    root: 'editor',
    screens: [
      {
        id: 'editor',
        name: 'Editor',
        regions: [
          region('topbar', 'topbar', [
            it('close', 'X', 'Closes the project; the draft saves itself.', {
              alt: ['Close', 'back arrow'],
              icon: 'x',
              opens: 'home',
              conf: 'unverified',
            }),
            it(
              'res',
              '1080P',
              'Current export resolution; tap to open the export settings.',
              {
                alt: ['1080p', '4K', '720P'],
                icon: 'badge',
                opens: 'export-sheet',
                conf: 'confirmed',
                house: EXPORT,
              },
            ),
            it(
              'export',
              'Export',
              'Renders the video and saves it to the phone.',
              {
                icon: 'upload',
                opens: 'export-progress',
                conf: 'confirmed',
                house: EXPORT,
              },
            ),
          ]),
          region('preview', 'preview', [
            it(
              'preview',
              'Preview',
              'The frame under the playhead. Pinch to scale, drag to move, two fingers to rotate.',
              { icon: 'frame', conf: 'unverified', house: KEYFRAME },
            ),
          ]),
          region('transport', 'hud', [
            it('tc', '00:00 / 00:00', 'Playhead time / total length.', {
              icon: 'clock',
              conf: 'unverified',
            }),
            it('play', 'Play', 'Plays or pauses.', {
              alt: ['Pause'],
              icon: 'play',
              conf: 'unverified',
            }),
            it(
              'keyframe',
              'Keyframe',
              'Adds a keyframe at the playhead (diamond with a plus; only while something is selected).',
              {
                alt: ['diamond icon'],
                icon: 'diamond',
                conf: 'unverified',
                house: KEYFRAME,
              },
            ),
            it('undo', 'Undo', 'Undoes the last edit.', {
              icon: 'undo',
              conf: 'unverified',
            }),
            it('redo', 'Redo', 'Redoes.', { icon: 'redo', conf: 'unverified' }),
            it('full', 'Fullscreen', 'Plays the preview full screen.', {
              icon: 'expand',
              conf: 'unverified',
            }),
          ]),
          region('timeline', 'timeline', [
            it(
              'mute',
              'Mute clip audio',
              "Mutes every main-track clip's own sound.",
              {
                alt: ['Unmute clip audio', 'Mute clip'],
                icon: 'mute',
                conf: 'unverified',
              },
            ),
            it('cover', 'Cover', 'Opens the cover editor.', {
              icon: 'image',
              conf: 'likely',
              house: COVER,
            }),
            it(
              'transition',
              'Transition',
              'The small white square between two clips opens the Transitions panel for that cut.',
              { icon: 'transition', conf: 'unverified', house: CUTS },
            ),
            it('add', '+', 'Adds more clips to the main track.', {
              icon: 'plus',
              conf: 'unverified',
            }),
            it('addaudio', '+ Add audio', 'Shortcut into the Audio menu.', {
              alt: ['Add audio'],
              icon: 'music',
              opens: 'audio-menu',
              conf: 'unverified',
              house: AUDIO_LEVELS,
            }),
          ]),
          region('main-toolbar', 'toolbar', [
            it(
              'edit',
              'Edit',
              'Selects the clip under the playhead and switches to the clip toolbar.',
              { icon: 'scissors', opens: 'clip-toolbar', conf: 'likely' },
            ),
            it('audio', 'Audio', 'Opens the Audio menu.', {
              icon: 'music',
              opens: 'audio-menu',
              conf: 'confirmed',
              house: AUDIO_LEVELS,
            }),
            it('text', 'Text', 'Opens the Text menu.', {
              icon: 'text',
              opens: 'text-menu',
              conf: 'confirmed',
              house: TEXT,
            }),
            it(
              'effects',
              'Effects',
              'Video effects and Body effects; each lands on its own track.',
              {
                alt: ['Effect'],
                icon: 'sparkle',
                pro: 'unknown',
                conf: 'likely',
                house: GLOW,
              },
            ),
            it('overlay', 'Overlay', 'Picture-in-picture layers.', {
              icon: 'layers',
              opens: 'overlay-toolbar',
              conf: 'confirmed',
              house: BLEND,
            }),
            it('captions', 'Captions', 'Opens the Captions menu.', {
              icon: 'captions',
              opens: 'captions-menu',
              pro: 'unknown',
              conf: 'likely',
              house: CAPTIONS,
            }),
            it('ratio', 'Aspect ratio', 'Sets the canvas ratio.', {
              alt: ['Ratio', 'Format'],
              icon: 'ratio',
              opens: 'aspect-ratio-panel',
              conf: 'likely',
              house: RATIO,
            }),
            it(
              'filters',
              'Filters',
              'Adds a filter segment on its own track; strength 0 to 100.',
              { icon: 'filter', pro: 'unknown', conf: 'likely', house: FILTER },
            ),
            it(
              'adjust',
              'Adjust',
              'Adds an adjustment segment on its own track with the colour sliders.',
              {
                icon: 'sliders',
                opens: 'adjust-panel',
                conf: 'likely',
                house: ADJUST,
              },
            ),
            it('stickers', 'Stickers', 'Sticker and emoji library.', {
              icon: 'sticker',
              pro: 'unknown',
              conf: 'likely',
            }),
            it(
              'background',
              'Background',
              'Fills the area behind the clip when it does not fill the canvas.',
              {
                alt: ['Canvas'],
                icon: 'canvas',
                opens: 'background-panel',
                conf: 'likely',
              },
            ),
          ]),
        ],
      },
      {
        id: 'home',
        name: 'Home',
        entry: ['Home'],
        regions: [
          region('top', 'topbar', [
            it(
              'settings',
              'Settings',
              'App settings. Add default ending lives here.',
              {
                alt: ['gear icon'],
                icon: 'gear',
                conf: 'unverified',
                house: ENDING,
              },
            ),
          ]),
          region('create', 'panel', [
            it('new', 'New project', 'Media picker, then the editor.', {
              icon: 'plus',
              opens: 'editor',
              conf: 'likely',
            }),
          ]),
          region('tools', 'toolbar', [
            it('autocut', 'AutoCut', 'Automatic edit from picked clips.', {
              icon: 'scissors',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('photo', 'Photo editor', 'Still-photo editor.', {
              icon: 'image',
              pro: 'unknown',
            }),
            it(
              'camera',
              'Camera',
              'In-app camera. Shoot in Blackmagic instead.',
              {
                icon: 'camera',
              },
            ),
            it(
              'teleprompter',
              'Teleprompter',
              'Script overlay while recording.',
              {
                icon: 'text',
                pro: 'unknown',
                conf: 'likely',
              },
            ),
            it('retouch', 'Retouch', 'Face and body retouch.', {
              icon: 'sparkle',
              pro: 'unknown',
            }),
            it('ai', 'AI tools', 'Entry to the AI generators.', {
              alt: ['AI lab', 'AI video maker'],
              icon: 'sparkle',
              pro: 'unknown',
            }),
            it('expand', 'Expand', 'Unfolds the tool row into the full grid.', {
              alt: ['All tools'],
              icon: 'grid',
            }),
          ]),
          region('projects', 'list', [
            it(
              'projects',
              'Projects',
              'Drafts, newest first: thumbnail, name, date, size, duration, three-dot menu.',
              { alt: ['Drafts'], icon: 'list', opens: 'editor' },
            ),
          ]),
          region('nav', 'tabs', [
            it('tab-edit', 'Edit', 'This home screen.', {
              alt: ['Home'],
              icon: 'scissors',
            }),
            it('tab-templates', 'Templates', 'Template feed.', {
              icon: 'grid',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('tab-inbox', 'Inbox', 'Notifications.', { icon: 'bell' }),
            it('tab-me', 'Me', 'Profile, cloud space and subscription.', {
              icon: 'user',
            }),
          ]),
        ],
      },
      {
        id: 'clip-toolbar',
        name: 'Clip toolbar',
        over: 'editor',
        regions: [
          region('tools', 'toolbar', [
            it('back', '<', 'Back to the main toolbar; deselects.', {
              alt: ['Back'],
              icon: 'back',
              opens: 'editor',
            }),
            it('split', 'Split', 'Cuts the clip at the playhead.', {
              icon: 'scissors',
              conf: 'confirmed',
              house: CUTS,
            }),
            it('speed', 'Speed', 'Opens Normal / Curve.', {
              icon: 'speed',
              opens: 'speed-panel',
              conf: 'confirmed',
              house: SPEED_CURVE,
            }),
            it('volume', 'Volume', 'Slider; 100 is the original level.', {
              icon: 'volume',
              conf: 'confirmed',
              house: VOLUME,
            }),
            it(
              'anim',
              'Animations',
              'In / Out / Combo with a duration slider.',
              {
                alt: ['Animation'],
                icon: 'motion',
                pro: 'unknown',
                conf: 'likely',
              },
            ),
            it('delete', 'Delete', 'Removes the clip.', {
              icon: 'trash',
              conf: 'confirmed',
            }),
            it(
              'removebg',
              'Remove BG',
              'Auto removal / Custom removal / Chroma key.',
              {
                alt: ['Cutout', 'Remove background'],
                icon: 'cutout',
                opens: 'remove-bg-panel',
                pro: 'unknown',
                conf: 'confirmed',
              },
            ),
            it('style', 'Style', 'One-tap AI style looks.', {
              alt: ['AI style'],
              icon: 'sparkle',
              pro: 'unknown',
            }),
            it(
              'extract',
              'Extract audio',
              "Moves the clip's sound to its own track.",
              {
                icon: 'music',
                conf: 'likely',
              },
            ),
            it('transform', 'Edit', 'Mirror, Rotate, Crop.', {
              alt: ['Transform'],
              icon: 'crop',
              opens: 'transform-panel',
              conf: 'likely',
            }),
            it(
              'filters',
              'Filters',
              'Filter on this clip only; Apply to all.',
              {
                icon: 'filter',
                pro: 'unknown',
                conf: 'likely',
                house: FILTER,
              },
            ),
            it(
              'adjust',
              'Adjust',
              'Colour sliders for this clip only; Apply to all.',
              {
                icon: 'sliders',
                opens: 'adjust-panel',
                conf: 'likely',
                house: ADJUST,
              },
            ),
            it('overlay', 'Overlay', 'Moves this clip to an overlay track.', {
              icon: 'layers',
              opens: 'overlay-toolbar',
            }),
            it(
              'mask',
              'Mask',
              'None, Split, Filmstrip, Circle, Rectangle, Heart, Star; Invert; feather.',
              { icon: 'mask', conf: 'likely' },
            ),
            it('opacity', 'Opacity', 'Slider 0 to 100.', {
              icon: 'opacity',
              conf: 'likely',
            }),
            it('blend', 'Blend', 'Blend modes.', {
              alt: ['Splice'],
              icon: 'blend',
              conf: 'likely',
              house: BLEND,
            }),
            it('replace', 'Replace', 'Swaps the media and keeps the edits.', {
              icon: 'swap',
            }),
            it('voicefx', 'Voice effects', 'Voice filters and characters.', {
              alt: ['Voice changer'],
              icon: 'mic',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('dup', 'Duplicate', 'Copies the clip next to itself.', {
              alt: ['Copy'],
              icon: 'copy',
            }),
            it('reverse', 'Reverse', 'Plays the clip backwards.', {
              icon: 'reverse',
              conf: 'confirmed',
            }),
            it(
              'freeze',
              'Freeze',
              'Inserts a 3-second still at the playhead.',
              {
                icon: 'freeze',
                conf: 'likely',
              },
            ),
            it('mblur', 'Motion blur', 'Blur, Blend, Direction, Times.', {
              icon: 'blur',
              pro: 'unknown',
            }),
            it(
              'stabilize',
              'Stabilize',
              'Recommended / Minimum cut / Most stable. Shoot braced instead.',
              { icon: 'stabilize', pro: 'unknown', conf: 'likely' },
            ),
            it('denoise', 'Reduce noise', 'Audio denoise switch.', {
              alt: ['Noise reduction'],
              icon: 'wave',
              pro: 'pro',
              conf: 'likely',
              house: NOISE,
            }),
            it('enhance', 'Enhance voice', 'AI voice clean-up.', {
              icon: 'mic',
              pro: 'pro',
            }),
            it(
              'tracking',
              'Camera tracking',
              'Keeps a chosen subject centred.',
              {
                icon: 'target',
                pro: 'pro',
              },
            ),
            it('retouch', 'Retouch', 'Face and body beautify.', {
              alt: ['Beauty'],
              icon: 'sparkle',
              pro: 'unknown',
            }),
          ]),
        ],
      },
      {
        id: 'transform-panel',
        name: 'Edit (clip)',
        over: 'editor',
        regions: [
          region('tools', 'toolbar', [
            it('back', '<', 'Back.', { icon: 'back', opens: 'clip-toolbar' }),
            it('mirror', 'Mirror', 'Flips left-to-right.', {
              icon: 'mirror',
              conf: 'likely',
            }),
            it('rotate', 'Rotate', '90 degrees per tap.', {
              icon: 'rotate',
              conf: 'likely',
            }),
            it(
              'crop',
              'Crop',
              'Crop frame with ratio presets and a rotation dial.',
              {
                icon: 'crop',
                conf: 'likely',
              },
            ),
          ]),
        ],
      },
      {
        id: 'speed-panel',
        name: 'Speed',
        over: 'editor',
        regions: [
          region('choice', 'tabs', [
            it(
              'normal',
              'Normal',
              'Constant speed, 0.1x to 100x, with a Pitch checkbox.',
              {
                icon: 'speed',
                conf: 'confirmed',
              },
            ),
            it(
              'curve',
              'Curve',
              'Speed ramps: preset tiles, Custom opens the graph.',
              {
                icon: 'curve',
                conf: 'confirmed',
                house: SPEED_CURVE,
              },
            ),
          ]),
          region('sheet', 'sheet', [
            it(
              'slider',
              '0.1x … 100x',
              'Constant speed; the value shows above the thumb.',
              {
                icon: 'speed',
                conf: 'likely',
                house: {
                  value:
                    'Never below 0.5x without a 60 fps source. Slow-mo pull shot at 60 fps › 0.5x.',
                  go: '#edit',
                },
              },
            ),
            it('pitch', 'Pitch', 'Whether the voice pitch follows the speed.', {
              alt: ['Change pitch'],
              icon: 'check',
            }),
            it(
              'smooth',
              'Smooth slow-mo',
              'Builds in-between frames for slowed clips.',
              {
                icon: 'sparkle',
                pro: 'unknown',
                conf: 'likely',
              },
            ),
          ]),
          region('presets', 'toolbar', [
            it('none', 'None', 'Removes the curve.', {
              icon: 'x',
              conf: 'likely',
            }),
            it(
              'custom',
              'Custom',
              'Flat line at 1x with five points; graph 0.1x to 10x; Add beat / Delete beat; Reset.',
              { icon: 'curve', conf: 'confirmed', house: SPEED_CURVE },
            ),
            it('montage', 'Montage', 'Preset ramp.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('hero', 'Hero', 'Fast, slow, fast.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('bullet', 'Bullet', 'Fast, very slow, fast.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('jump', 'Jump cut', 'Preset ramp.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('flashin', 'Flash in', 'Fast start, slows.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('flashout', 'Flash out', 'Slow start, speeds up.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
          ]),
        ],
      },
      {
        id: 'adjust-panel',
        name: 'Adjust',
        over: 'editor',
        regions: [
          region('tiles', 'toolbar', [
            it(
              'auto',
              'Auto adjust',
              'One-tap correction. Skip it; the recipe is exact.',
              {
                alt: ['Color correction'],
                icon: 'sparkle',
                pro: 'unknown',
                conf: 'likely',
              },
            ),
            it('match', 'Color match', 'Copies the look of another clip.', {
              icon: 'swap',
              pro: 'unknown',
              conf: 'likely',
              house: {
                value:
                  'Step 2 of the grade: Match every clip to the hero clip.',
                go: '#grade',
              },
            }),
            it('brightness', 'Brightness', '−50 to +50.', {
              icon: 'sun',
              conf: 'confirmed',
              house: {
                value: '−15 if there is no Exposure tile.',
                go: '#grade',
              },
            }),
            it('contrast', 'Contrast', '−50 to +50.', {
              icon: 'contrast',
              conf: 'confirmed',
              house: { value: '+25', go: '#grade' },
            }),
            it('saturation', 'Saturation', '−50 to +50.', {
              icon: 'drop',
              conf: 'confirmed',
              house: { value: '+15', go: '#grade' },
            }),
            it(
              'brilliance',
              'Brilliance',
              'Lifts darks, tames brights. Leave at 0.',
              {
                icon: 'sun',
                conf: 'likely',
              },
            ),
            it('exposure', 'Exposure', '−50 to +50.', {
              icon: 'sun',
              conf: 'likely',
              house: { value: '−15 (−20 if it looks grey)', go: '#grade' },
            }),
            it('sharpen', 'Sharpen', '0 to 100.', {
              icon: 'sharp',
              conf: 'likely',
            }),
            it(
              'clarity',
              'Clarity',
              'Midtone contrast; may be absent on mobile.',
              {
                icon: 'contrast',
                pro: 'unknown',
              },
            ),
            it(
              'hsl',
              'HSL',
              'Eight colour dots, each with Hue, Saturation, Lightness.',
              {
                icon: 'hsl',
                opens: 'hsl-panel',
                pro: 'unknown',
                conf: 'likely',
                house: HSL,
              },
            ),
            it('curves', 'Curves', 'Tone curve: white, red, green, blue.', {
              alt: ['Graphs'],
              icon: 'curve',
              opens: 'curves-panel',
              pro: 'unknown',
              conf: 'likely',
              house: CURVES,
            }),
            it('highlights', 'Highlights', '−50 to +50.', {
              alt: ['Highlight'],
              icon: 'sun',
              conf: 'likely',
              house: { value: '−10', go: '#grade' },
            }),
            it('shadows', 'Shadows', '−50 to +50.', {
              alt: ['Shadow'],
              icon: 'moon',
              conf: 'likely',
              house: { value: '−40 (−50 if it looks grey)', go: '#grade' },
            }),
            it('whites', 'Whites', 'May be absent on mobile.', { icon: 'sun' }),
            it('blacks', 'Blacks', 'May be absent on mobile.', {
              icon: 'moon',
            }),
            it('temp', 'Temp', 'Blue to orange, −50 to +50.', {
              alt: ['Temperature'],
              icon: 'temp',
              conf: 'likely',
              house: { value: '−30', go: '#grade' },
            }),
            it('hue', 'Hue', 'Tint; green to magenta.', {
              alt: ['Tint'],
              icon: 'hsl',
              conf: 'likely',
              house: {
                value: 'Tint +15 (0 for the Blue variant)',
                go: '#grade',
              },
            }),
            it('fade', 'Fade', 'Lifts the blacks, 0 to 100.', {
              icon: 'fade',
              conf: 'likely',
              house: { value: '0. Never lift the blacks.', go: '#grade' },
            }),
            it('vignette', 'Vignette', 'Darkens the corners.', {
              icon: 'vignette',
              conf: 'likely',
              house: { value: '+10', go: '#grade' },
            }),
            it('grain', 'Grain', 'Film grain, 0 to 100.', {
              alt: ['Particles'],
              icon: 'grain',
              conf: 'likely',
              house: { value: '20, as the last step.', go: '#grade' },
            }),
          ]),
          region('actions', 'sheet', [
            it('reset', 'Reset', 'Every slider back to 0.', { icon: 'undo' }),
            it(
              'applyall',
              'Apply to all',
              'Copies these values to every main-track clip.',
              {
                icon: 'copy',
                conf: 'likely',
                house: { value: 'Always, after the recipe.', go: '#grade' },
              },
            ),
          ]),
        ],
      },
      {
        id: 'hsl-panel',
        name: 'HSL',
        over: 'editor',
        regions: [
          region('dots', 'tabs', [
            it('red', 'Red', 'Red band.', {
              icon: 'dot',
              house: { value: 'Food: sat +8 to +15, lum +5.', go: '#grade' },
            }),
            it('orange', 'Orange', 'Orange band.', {
              icon: 'dot',
              house: {
                value:
                  'Night: sat +10. Food: sat +8 to +15, lum +5. Never touch the hue.',
                go: '#grade',
              },
            }),
            it('yellow', 'Yellow', 'Yellow band.', {
              icon: 'dot',
              house: { value: 'Night: sat −10.', go: '#grade' },
            }),
            it('green', 'Green', 'Green band.', {
              icon: 'dot',
              house: {
                value: 'Night: sat +10. Food: sat −5 to −15.',
                go: '#grade',
              },
            }),
            it('cyan', 'Cyan', 'Cyan band.', { icon: 'dot' }),
            it('blue', 'Blue', 'Blue band.', {
              icon: 'dot',
              house: {
                value:
                  'Night: hue +15, sat +10. Food: hue toward teal, sat +10.',
                go: '#grade',
              },
            }),
            it('purple', 'Purple', 'Purple band.', { icon: 'dot' }),
            it('magenta', 'Magenta', 'Magenta band.', { icon: 'dot' }),
          ]),
          region('sliders', 'sheet', [
            it('hue', 'Hue', 'Shifts the chosen colour, −100 to +100.', {
              icon: 'hsl',
              pro: 'unknown',
            }),
            it('sat', 'Saturation', 'Strength of the chosen colour.', {
              icon: 'drop',
              pro: 'unknown',
            }),
            it('light', 'Lightness', 'Brightness of the chosen colour.', {
              alt: ['Luminance'],
              icon: 'sun',
              pro: 'unknown',
            }),
            it('reset', 'Reset', "Clears the chosen colour's values.", {
              icon: 'undo',
            }),
          ]),
        ],
      },
      {
        id: 'curves-panel',
        name: 'Curves',
        over: 'editor',
        regions: [
          region('channels', 'tabs', [
            it('white', 'White', 'Overall brightness.', {
              icon: 'dot',
              house: CURVES,
            }),
            it('red', 'Red', 'Red channel.', { icon: 'dot' }),
            it('green', 'Green', 'Green channel.', { icon: 'dot' }),
            it('blue', 'Blue', 'Blue channel.', {
              icon: 'dot',
              house: {
                value:
                  'Blue up in the shadows, down in the highlights: teal/orange.',
                go: '#grade',
              },
            }),
          ]),
          region('graph', 'sheet', [
            it(
              'graph',
              'Curve graph',
              'Tap the line to add a point and drag it.',
              {
                icon: 'curve',
                pro: 'unknown',
                house: CURVES,
              },
            ),
            it('reset', 'Reset', 'Straight diagonal again.', { icon: 'undo' }),
          ]),
        ],
      },
      {
        id: 'text-menu',
        name: 'Text',
        over: 'editor',
        regions: [
          region('tools', 'toolbar', [
            it('back', '<', 'Back.', { icon: 'back', opens: 'editor' }),
            it(
              'addtext',
              'Add text',
              'Places a text box and opens the text editor.',
              {
                icon: 'text',
                opens: 'text-editor',
                conf: 'confirmed',
                house: TEXT,
              },
            ),
            it(
              'autocaptions',
              'Auto captions',
              'Pick the language, then Generate.',
              {
                icon: 'captions',
                opens: 'captions-menu',
                pro: 'unknown',
                conf: 'confirmed',
                house: CAPTIONS,
              },
            ),
            it('stickers', 'Stickers', 'Sticker library.', {
              icon: 'sticker',
              pro: 'unknown',
              conf: 'confirmed',
            }),
            it(
              'templates',
              'Text templates',
              'Ready-made animated titles. Not for the house style.',
              {
                icon: 'grid',
                pro: 'unknown',
                conf: 'confirmed',
              },
            ),
            it('tts', 'Text to speech', 'Reads the text in an AI voice.', {
              icon: 'mic',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('lyrics', 'Auto lyrics', 'Captions from a song.', {
              icon: 'music',
              pro: 'unknown',
            }),
            it('draw', 'Draw', 'Freehand pen on the frame.', {
              icon: 'pen',
              conf: 'likely',
            }),
          ]),
        ],
      },
      {
        id: 'text-editor',
        name: 'Text editor',
        over: 'editor',
        regions: [
          region('tabs', 'tabs', [
            it('keyboard', 'Keyboard', 'Type the words.', {
              icon: 'keyboard',
              conf: 'likely',
              house: TEXT,
            }),
            it(
              'templates',
              'Templates',
              'Text templates inside the editor; may be absent.',
              {
                icon: 'grid',
                pro: 'unknown',
              },
            ),
            it(
              'fonts',
              'Fonts',
              'Font list with language groups; Import (.ttf / .otf) lives here.',
              {
                alt: ['Font'],
                icon: 'font',
                pro: 'unknown',
                conf: 'likely',
                house: FONT,
              },
            ),
            it(
              'styles',
              'Styles',
              'Preset looks plus Text, Stroke, Background, Shadow, Glow, Spacing, Bold/Italic/Underline.',
              {
                alt: ['Style'],
                icon: 'style',
                conf: 'likely',
                house: {
                  value:
                    'Hook card: Background white box, text black. Captions: white, Stroke black, no box. Reel title: lime, Shadow small black, no stroke.',
                  go: '#type',
                },
              },
            ),
            it(
              'effects',
              'Effects',
              'Coloured and 3D text effects. None in the house style.',
              {
                icon: 'sparkle',
                pro: 'unknown',
                conf: 'likely',
              },
            ),
            it(
              'anim',
              'Animations',
              'In, Out, Loop with a duration slider. House style: none.',
              {
                alt: ['Animation'],
                icon: 'motion',
                pro: 'unknown',
                conf: 'likely',
              },
            ),
            it('bubbles', 'Bubbles', 'Speech-bubble backplates.', {
              alt: ['Bubble'],
              icon: 'bubble',
              pro: 'unknown',
              conf: 'likely',
            }),
          ]),
        ],
      },
      {
        id: 'captions-menu',
        name: 'Captions',
        over: 'editor',
        regions: [
          region('tools', 'toolbar', [
            it('back', '<', 'Back.', { icon: 'back', opens: 'editor' }),
            it(
              'auto',
              'Auto captions',
              'Pick the spoken language, then Generate.',
              {
                icon: 'captions',
                pro: 'unknown',
                conf: 'confirmed',
                house: CAPTIONS,
              },
            ),
            it(
              'templates',
              'Caption templates',
              'Animated caption styles. Not the house style.',
              {
                icon: 'grid',
                pro: 'unknown',
              },
            ),
            it('lyrics', 'Auto lyrics', 'Captions from a song.', {
              icon: 'music',
              pro: 'unknown',
            }),
            it('manual', 'Add captions', 'Type or paste captions by hand.', {
              alt: ['Enter captions', 'Manual captions'],
              icon: 'text',
            }),
          ]),
          region('sheet', 'sheet', [
            it(
              'language',
              'Spoken language',
              'The language picker in the Auto captions sheet; the exact row label is from memory. English.',
              {
                alt: ['Language'],
                icon: 'list',
                house: CAPTIONS,
              },
            ),
            it(
              'bilingual',
              'Bilingual captions',
              'Adds a translated second line.',
              {
                icon: 'captions',
                pro: 'pro',
                conf: 'likely',
              },
            ),
            it(
              'generate',
              'Generate',
              'Starts recognition and lays the captions on a text track.',
              {
                icon: 'play',
                pro: 'unknown',
                conf: 'likely',
                house: {
                  value:
                    'Then fix every line: 3–4 words per line, no bouncing.',
                  go: '#type',
                },
              },
            ),
          ]),
        ],
      },
      {
        id: 'audio-menu',
        name: 'Audio',
        over: 'editor',
        regions: [
          region('tools', 'toolbar', [
            it('back', '<', 'Back.', { icon: 'back', opens: 'editor' }),
            it(
              'sounds',
              'Sounds',
              'Music library with search; device files import from here.',
              {
                icon: 'music',
                pro: 'unknown',
                conf: 'confirmed',
                house: AUDIO_LEVELS,
              },
            ),
            it('sfx', 'Sound FX', 'Short sound effects by category.', {
              alt: ['Sound effects', 'Effects'],
              icon: 'bell',
              pro: 'unknown',
              conf: 'likely',
              house: {
                value: 'One SFX per big moment at 30–60. None on reels.',
                go: '#edit',
              },
            }),
            it(
              'extracted',
              'Extracted',
              'Import only the sound of a gallery video.',
              {
                alt: ['Extract'],
                icon: 'wave',
                conf: 'likely',
              },
            ),
            it('record', 'Record', 'Voiceover at the playhead.', {
              alt: ['Voiceover'],
              icon: 'mic',
              conf: 'likely',
            }),
            it('tts', 'Text to speech', 'May sit under Text instead.', {
              icon: 'mic',
              pro: 'unknown',
            }),
          ]),
        ],
      },
      {
        id: 'audio-clip-toolbar',
        name: 'Audio clip toolbar',
        over: 'editor',
        entry: ['tap an audio clip'],
        regions: [
          region('tools', 'toolbar', [
            it('split', 'Split', 'Cuts at the playhead.', {
              icon: 'scissors',
              conf: 'likely',
            }),
            it('volume', 'Volume', '100 is the original level.', {
              icon: 'volume',
              conf: 'likely',
              house: VOLUME,
            }),
            it('fade', 'Fade', 'Fade in and Fade out sliders.', {
              icon: 'fade',
              conf: 'confirmed',
            }),
            it('speed', 'Speed', 'Slider with a Pitch checkbox.', {
              icon: 'speed',
            }),
            it(
              'beats',
              'Beats',
              'Auto generate, or Add beat / Delete beat; yellow dots.',
              {
                alt: ['Match cut', 'Beat'],
                icon: 'beat',
                pro: 'unknown',
                house: BEATS,
              },
            ),
            it('voicefx', 'Voice effects', 'Voice filters and characters.', {
              alt: ['Voice changer'],
              icon: 'mic',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('denoise', 'Reduce noise', 'Denoise switch.', {
              icon: 'wave',
              pro: 'pro',
              conf: 'likely',
              house: NOISE,
            }),
            it('enhance', 'Enhance voice', 'AI voice clean-up.', {
              icon: 'mic',
              pro: 'pro',
            }),
            it('dup', 'Duplicate', 'Copies the clip.', { icon: 'copy' }),
            it('delete', 'Delete', 'Removes the clip.', {
              icon: 'trash',
              conf: 'likely',
            }),
          ]),
        ],
      },
      {
        id: 'overlay-toolbar',
        name: 'Overlay',
        over: 'editor',
        regions: [
          region('tools', 'toolbar', [
            it('back', '<', 'Back.', { icon: 'back', opens: 'editor' }),
            it(
              'addoverlay',
              'Add overlay',
              'Media picker; the pick lands on a new overlay track.',
              {
                alt: ['+ Add overlay'],
                icon: 'plus',
                conf: 'confirmed',
                house: {
                  value:
                    'Halation: Add overlay › the same clip › Blend Screen › Blur 20–40 › Opacity 25–45.',
                  go: '#forge',
                },
              },
            ),
            it('split', 'Split', 'Cuts the overlay.', {
              icon: 'scissors',
              conf: 'likely',
            }),
            it('speed', 'Speed', 'Normal / Curve.', {
              icon: 'speed',
              opens: 'speed-panel',
              conf: 'likely',
            }),
            it('volume', 'Volume', 'Overlay sound level.', {
              icon: 'volume',
              conf: 'likely',
            }),
            it('anim', 'Animations', 'In / Out / Combo.', {
              icon: 'motion',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('delete', 'Delete', 'Removes the overlay.', {
              icon: 'trash',
              conf: 'likely',
            }),
            it(
              'blend',
              'Blend',
              'Normal, Darken, Multiply, Color burn, Linear burn, Lighten, Screen, Color dodge, Overlay, Soft light, Hard light; with Opacity.',
              { alt: ['Splice'], icon: 'blend', conf: 'likely', house: BLEND },
            ),
            it('opacity', 'Opacity', '0 to 100.', {
              icon: 'opacity',
              conf: 'likely',
              house: {
                value: 'Halation plate 25–45. Texture plates 20–35.',
                go: '#forge',
              },
            }),
            it('mask', 'Mask', 'Shape masks with Invert and feather.', {
              icon: 'mask',
              conf: 'confirmed',
            }),
            it(
              'removebg',
              'Remove BG',
              'Auto removal / Custom removal / Chroma key.',
              {
                alt: ['Cutout'],
                icon: 'cutout',
                opens: 'remove-bg-panel',
                pro: 'unknown',
                conf: 'confirmed',
              },
            ),
            it('filters', 'Filters', 'Filter on the overlay only.', {
              icon: 'filter',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('adjust', 'Adjust', 'Colour sliders on the overlay only.', {
              icon: 'sliders',
              opens: 'adjust-panel',
              conf: 'likely',
            }),
            it(
              'maintrack',
              'Main track',
              'Moves the overlay down to the main track.',
              {
                alt: ['Switch to main track'],
                icon: 'layers',
              },
            ),
            it('replace', 'Replace', 'Swaps the media.', { icon: 'swap' }),
          ]),
        ],
      },
      {
        id: 'remove-bg-panel',
        name: 'Remove BG',
        over: 'editor',
        regions: [
          region('tools', 'toolbar', [
            it('back', '<', 'Back.', { icon: 'back', opens: 'clip-toolbar' }),
            it(
              'auto',
              'Auto removal',
              'One-tap subject cut-out, tuned for people.',
              {
                icon: 'cutout',
                pro: 'unknown',
                conf: 'confirmed',
              },
            ),
            it(
              'custom',
              'Custom removal',
              'Brush and eraser to paint what stays.',
              {
                icon: 'pen',
                pro: 'unknown',
                conf: 'confirmed',
              },
            ),
            it(
              'chroma',
              'Chroma key',
              'Drag the picker onto the green, then Intensity and Shadow.',
              {
                icon: 'drop',
                conf: 'confirmed',
              },
            ),
          ]),
        ],
      },
      {
        id: 'aspect-ratio-panel',
        name: 'Aspect ratio',
        over: 'editor',
        regions: [
          region('chips', 'toolbar', [
            it('original', 'Original', "The first clip's ratio.", {
              icon: 'ratio',
            }),
            it('9-16', '9:16', 'Vertical: TikTok, Reels, Shorts.', {
              icon: 'ratio',
              conf: 'likely',
              house: RATIO,
            }),
            it('16-9', '16:9', 'Landscape: YouTube.', {
              icon: 'ratio',
              conf: 'likely',
            }),
            it('1-1', '1:1', 'Square.', { icon: 'ratio', conf: 'likely' }),
            it(
              '4-3',
              '4:3',
              'Classic landscape. VHS confessions in the documentary.',
              { icon: 'ratio' },
            ),
            it('3-4', '3:4', 'Classic portrait.', { icon: 'ratio' }),
            it('2-1', '2:1', 'Wide.', { icon: 'ratio' }),
            it('235', '2.35:1', 'Cinema widescreen.', { icon: 'ratio' }),
            it('185', '1.85:1', 'Cinema flat.', { icon: 'ratio' }),
          ]),
        ],
      },
      {
        id: 'background-panel',
        name: 'Background',
        over: 'editor',
        regions: [
          region('tools', 'toolbar', [
            it('back', '<', 'Back.', { icon: 'back', opens: 'editor' }),
            it('color', 'Color', 'Solid fill; swatches plus a picker.', {
              icon: 'drop',
              conf: 'likely',
            }),
            it('image', 'Image', 'Pattern or gallery image fill.', {
              alt: ['Style'],
              icon: 'image',
              conf: 'likely',
            }),
            it('blur', 'Blur', 'Blurred copy of the clip as fill.', {
              icon: 'blur',
              conf: 'likely',
            }),
          ]),
        ],
      },
      {
        id: 'export-sheet',
        name: 'Export settings',
        over: 'editor',
        regions: [
          region('rows', 'sheet', [
            it(
              'resolution',
              'Resolution',
              '720P, 1080P, 2K, 4K (2K/4K only when phone and clips allow).',
              {
                alt: ['Video resolution'],
                icon: 'badge',
                pro: 'unknown',
                conf: 'confirmed',
                house: { value: '1080p', go: '#edit' },
              },
            ),
            it('fps', 'Frame rate', '24, 30, 60 (25 and 50 recalled).', {
              icon: 'clock',
              conf: 'likely',
              house: {
                value:
                  '30 for Marketplace Review (60 if shot at 60); 24 for reels.',
                go: '#edit',
              },
            }),
            it('bitrate', 'Code rate', 'Low, Recommended, High.', {
              alt: ['Bitrate', 'Bit rate'],
              icon: 'wave',
              conf: 'likely',
              house: { value: 'High. Slide all the way right.', go: '#edit' },
            }),
            it(
              'hdr',
              'Smart HDR',
              'HDR-style look for SDR clips; off by default.',
              {
                alt: ['Smart HDR Tone', 'HDR'],
                icon: 'sun',
                pro: 'unknown',
                conf: 'likely',
                house: { value: 'Off. The grade is done.', go: '#grade' },
              },
            ),
            it('size', 'Estimated file size', 'Updates as the sliders move.', {
              icon: 'list',
            }),
            it('export', 'Export', 'Starts the render.', {
              icon: 'upload',
              opens: 'export-progress',
              conf: 'confirmed',
              house: EXPORT,
            }),
          ]),
        ],
      },
      {
        id: 'export-progress',
        name: 'Exporting',
        regions: [
          region('centre', 'panel', [
            it(
              'progress',
              'Exporting…',
              'Percentage counter; leaving the app can stop the render.',
              {
                icon: 'clock',
              },
            ),
            it('tiktok', 'Share to TikTok', 'Hands the file to TikTok.', {
              alt: ['TikTok'],
              icon: 'upload',
            }),
            it('done', 'Done', 'Back to the editor or home.', {
              icon: 'check',
              opens: 'home',
            }),
          ]),
        ],
      },
    ],
  }

  /* ======================================================== CapCut Desktop */
  const capcutDesktop = {
    id: 'capcut-desktop',
    name: 'CapCut Desktop',
    short: 'Desktop',
    device: 'desktop',
    version: 'Windows / Mac (2026)',
    root: 'editor',
    screens: [
      {
        id: 'editor',
        name: 'Editor',
        regions: [
          region(
            'titlebar',
            'topbar',
            [
              it(
                'menu',
                'Menu',
                'File, edit, settings and help. Back to home page returns to the launcher.',
                {
                  alt: ['File'],
                  icon: 'list',
                  opens: 'home',
                  conf: 'likely',
                },
              ),
              it('name', 'Project name', 'Click to rename.', { icon: 'text' }),
              it(
                'shortcuts',
                'Shortcuts',
                'The shortcut list; keys can be rebound.',
                {
                  icon: 'keyboard',
                  conf: 'likely',
                },
              ),
              it('export', 'Export', 'Opens the Export dialog.', {
                icon: 'upload',
                opens: 'export',
                conf: 'confirmed',
                house: EXPORT,
              }),
            ],
            { slot: 'title' },
          ),
          region(
            'assets',
            'tabs',
            [
              it('media', 'Media', 'Imported files, cloud, AI media, stock.', {
                alt: ['Import'],
                icon: 'image',
                opens: 'asset-media',
                conf: 'confirmed',
              }),
              it('audio', 'Audio', 'Music, sound effects, extracted audio.', {
                icon: 'music',
                opens: 'asset-audio',
                conf: 'confirmed',
                house: AUDIO_LEVELS,
              }),
              it('text', 'Text', 'Plain text, text effects, text templates.', {
                icon: 'text',
                opens: 'asset-text',
                conf: 'likely',
                house: TEXT,
              }),
              it('stickers', 'Stickers', 'Sticker library; many Pro tiles.', {
                icon: 'sticker',
                pro: 'unknown',
                conf: 'likely',
              }),
              it('effects', 'Effects', 'Video effects and body effects.', {
                icon: 'sparkle',
                pro: 'unknown',
                conf: 'likely',
                house: GLOW,
              }),
              it('transitions', 'Transitions', 'Drag one between two clips.', {
                icon: 'transition',
                pro: 'unknown',
                conf: 'likely',
                house: CUTS,
              }),
              it(
                'captions',
                'Captions',
                'Auto captions, manual, file import.',
                {
                  icon: 'captions',
                  opens: 'asset-captions',
                  pro: 'unknown',
                  conf: 'likely',
                  house: CAPTIONS,
                },
              ),
              it('filters', 'Filters', 'Built-in colour filters.', {
                icon: 'filter',
                pro: 'unknown',
                conf: 'likely',
                house: FILTER,
              }),
              it(
                'adjustment',
                'Adjustment',
                'Adjustment layers, presets and LUTs.',
                {
                  alt: ['Adjustments', 'Adjust'],
                  icon: 'sliders',
                  opens: 'asset-adjustment',
                  conf: 'likely',
                  house: LUT_DESKTOP,
                },
              ),
              it('templates', 'Templates', 'Built-in project templates.', {
                icon: 'grid',
                pro: 'unknown',
                conf: 'likely',
              }),
              it(
                'avatars',
                'AI avatars',
                'AI presenter characters. No source found.',
                {
                  icon: 'user',
                  pro: 'unknown',
                },
              ),
            ],
            { slot: 'assets' },
          ),
          region(
            'player',
            'preview',
            [
              it(
                'canvas',
                'Player',
                'The frame under the playhead; drag to move, corners to scale.',
                {
                  icon: 'frame',
                  conf: 'confirmed',
                },
              ),
              it(
                'tc',
                '00:00:00:00 / 00:00:00:00',
                'Playhead time, then project length.',
                {
                  icon: 'clock',
                  conf: 'likely',
                },
              ),
              it('play', 'Play', 'Space.', { icon: 'play', conf: 'likely' }),
              it('scopes', 'Scopes', 'Colour scopes beside the preview.', {
                icon: 'wave',
                pro: 'unknown',
                house: {
                  value:
                    'Read three numbers: black floor, paper white, shadow tone.',
                  go: '#grade',
                },
              }),
              it('ratio', 'Ratio', 'The canvas aspect-ratio list.', {
                alt: ['Aspect ratio'],
                icon: 'ratio',
                opens: 'ratio-menu',
                conf: 'confirmed',
                house: RATIO,
              }),
              it('full', 'Full screen', 'Plays the preview full screen.', {
                icon: 'expand',
              }),
            ],
            { slot: 'player' },
          ),
          region(
            'inspector',
            'tabs',
            [
              it(
                'video',
                'Video',
                'Picture settings: Basic, Remove BG, Mask, Retouch.',
                {
                  icon: 'frame',
                  opens: 'insp-video',
                  conf: 'confirmed',
                },
              ),
              it('audio', 'Audio', 'Sound of the clip.', {
                icon: 'volume',
                opens: 'insp-audio',
                conf: 'confirmed',
                house: VOLUME,
              }),
              it('speed', 'Speed', 'Standard or Curve.', {
                icon: 'speed',
                opens: 'insp-speed',
                conf: 'confirmed',
                house: SPEED_CURVE,
              }),
              it('animation', 'Animation', 'In, Out and Combo.', {
                icon: 'motion',
                conf: 'confirmed',
              }),
              it('tracking', 'Tracking', 'Motion tracking of an object.', {
                alt: ['Motion tracking'],
                icon: 'target',
                pro: 'pro',
              }),
              it(
                'adjustment',
                'Adjustment',
                'Basic, HSL, Curves, Color wheel.',
                {
                  alt: ['Adjust'],
                  icon: 'sliders',
                  opens: 'insp-adjust-basic',
                  conf: 'confirmed',
                  house: ADJUST,
                },
              ),
              it('stylize', 'AI stylize', 'AI style transfer.', {
                icon: 'sparkle',
                pro: 'unknown',
              }),
            ],
            { slot: 'inspector' },
          ),
          region(
            'timeline-toolbar',
            'toolbar',
            [
              it('select', 'Select', 'Pointer mode: Select (A) or Split (B).', {
                alt: ['Split', 'Mode'],
                icon: 'cursor',
                conf: 'likely',
              }),
              it('undo', 'Undo', 'Ctrl+Z.', { icon: 'undo', conf: 'likely' }),
              it('redo', 'Redo', 'Ctrl+Shift+Z.', {
                icon: 'redo',
                conf: 'likely',
              }),
              it(
                'split',
                'Split',
                'Cuts the selected clip at the playhead. Ctrl+B.',
                {
                  icon: 'scissors',
                  conf: 'confirmed',
                  house: CUTS,
                },
              ),
              it(
                'delleft',
                'Delete left',
                'Cuts and removes the part before the playhead. Q.',
                {
                  icon: 'back',
                  conf: 'confirmed',
                },
              ),
              it(
                'delright',
                'Delete right',
                'Cuts and removes the part after the playhead. W.',
                {
                  icon: 'forward',
                  conf: 'confirmed',
                },
              ),
              it('delete', 'Delete', 'Removes the selected clip.', {
                icon: 'trash',
                conf: 'confirmed',
              }),
              it('marker', 'Add marker', 'Drops a marker at the playhead. M.', {
                alt: ['Marker'],
                icon: 'flag',
                conf: 'likely',
                house: BEATS,
              }),
              it('freeze', 'Freeze', 'Still frame at the playhead as a clip.', {
                icon: 'freeze',
                conf: 'confirmed',
              }),
              it('reverse', 'Reverse', 'Plays the clip backwards.', {
                icon: 'reverse',
                conf: 'confirmed',
              }),
              it('mirror', 'Mirror', 'Flips left to right.', {
                icon: 'mirror',
                conf: 'confirmed',
              }),
              it('rotate', 'Rotate', '90 degrees per click.', {
                icon: 'rotate',
                conf: 'confirmed',
              }),
              it('crop', 'Crop', 'Crop window with ratio presets.', {
                alt: ['Crop ratio'],
                icon: 'crop',
                conf: 'confirmed',
              }),
              it('record', 'Record', 'Voice-over onto a new audio track.', {
                alt: ['Voiceover'],
                icon: 'mic',
                conf: 'likely',
              }),
              it(
                'magnet',
                'Main track magnet',
                'Main-track clips stay butted together.',
                {
                  icon: 'magnet',
                  conf: 'confirmed',
                },
              ),
              it(
                'snap',
                'Auto snapping',
                'Edges snap to each other and the playhead. N.',
                {
                  alt: ['Auto snap'],
                  icon: 'snap',
                  conf: 'confirmed',
                },
              ),
              it(
                'linkage',
                'Linkage',
                'Overlays, text and audio move with their main clip.',
                {
                  icon: 'link',
                  conf: 'confirmed',
                },
              ),
              it('axis', 'Preview axis', 'A second line follows the mouse.', {
                icon: 'cursor',
                conf: 'confirmed',
              }),
              it('zoom', 'Zoom', 'Ctrl plus / minus, or the slider.', {
                icon: 'expand',
                conf: 'likely',
              }),
            ],
            { slot: 'timeline' },
          ),
          region(
            'tracks',
            'timeline',
            [
              it(
                'ruler',
                'Time ruler',
                'Click or drag to move the playhead; markers show here.',
                {
                  icon: 'clock',
                  conf: 'confirmed',
                },
              ),
              it(
                'adjtrack',
                'Adjustment track',
                'A LUT or adjustment segment grades every row beneath it.',
                {
                  icon: 'sliders',
                  conf: 'confirmed',
                  house: LUT_DESKTOP,
                },
              ),
              it('main', 'Main track', 'The base video row.', {
                icon: 'frame',
                conf: 'confirmed',
              }),
              it(
                'audiotracks',
                'Audio tracks',
                'Music, SFX, voice-over as waveforms, under the main track.',
                {
                  icon: 'wave',
                  conf: 'likely',
                  house: AUDIO_LEVELS,
                },
              ),
            ],
            { slot: 'tracks' },
          ),
        ],
      },
      {
        id: 'home',
        name: 'Home',
        slot: 'dialog',
        entry: ['Home'],
        regions: [
          region('side', 'tabs', [
            it('signin', 'Sign in', 'CapCut account.', {
              icon: 'user',
              conf: 'likely',
            }),
            it('home', 'Home', 'This launcher.', { icon: 'grid' }),
            it('templates', 'Templates', 'Template browser.', {
              icon: 'grid',
              pro: 'unknown',
            }),
            it('spaces', 'Spaces', 'Cloud spaces.', {
              alt: ['Cloud'],
              icon: 'layers',
              pro: 'unknown',
            }),
          ]),
          region('create', 'panel', [
            it('new', 'New project', 'Empty project; opens the editor.', {
              alt: ['Create project'],
              icon: 'plus',
              opens: 'editor',
              conf: 'likely',
            }),
            it(
              'projects',
              'Projects',
              'Local drafts with search, grid/list and Trash.',
              {
                alt: ['Drafts'],
                icon: 'list',
                opens: 'editor',
              },
            ),
            it(
              'settings',
              'Settings',
              'Draft location, cache, language, default frame rate.',
              {
                icon: 'gear',
              },
            ),
          ]),
        ],
      },
      {
        id: 'asset-media',
        name: 'Media',
        slot: 'assets',
        regions: [
          region('sources', 'list', [
            it('import', 'Import', 'Files from this computer.', {
              alt: ['Local'],
              icon: 'upload',
              conf: 'confirmed',
            }),
            it('spaces', 'Spaces', 'Cloud files.', {
              icon: 'layers',
              pro: 'unknown',
            }),
            it('ai', 'AI media', 'AI image and video (credits).', {
              icon: 'sparkle',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('library', 'Library', 'Stock clips.', {
              alt: ['Stock'],
              icon: 'grid',
              pro: 'unknown',
            }),
          ]),
          region('grid', 'panel', [
            it(
              'importbtn',
              'Import',
              'Opens the file picker; drag-in works too.',
              {
                icon: 'plus',
                conf: 'confirmed',
              },
            ),
            it(
              'addtrack',
              '+ on a thumbnail',
              'Adds the clip at the playhead.',
              {
                alt: ['Add to track'],
                icon: 'plus',
                conf: 'likely',
              },
            ),
          ]),
        ],
      },
      {
        id: 'asset-audio',
        name: 'Audio',
        slot: 'assets',
        regions: [
          region('sources', 'list', [
            it('music', 'Music', 'Library by genre.', {
              icon: 'music',
              pro: 'unknown',
              house: AUDIO_LEVELS,
            }),
            it('sfx', 'Sound effects', 'Library with search.', {
              icon: 'bell',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('copyright', 'Copyright', 'Checks the project audio.', {
              icon: 'check',
              pro: 'unknown',
            }),
            it(
              'extract',
              'Extract audio',
              'Pulls the audio out of a video file.',
              { icon: 'wave', pro: 'unknown' },
            ),
            it('brand', 'Brand music', 'Music saved to a brand kit.', {
              icon: 'music',
              pro: 'unknown',
            }),
          ]),
        ],
      },
      {
        id: 'asset-text',
        name: 'Text',
        slot: 'assets',
        regions: [
          region('sources', 'list', [
            it('addtext', 'Add text', 'Shows the plain text tile.', {
              alt: ['Text'],
              icon: 'text',
              house: TEXT,
            }),
            it('effects', 'Effects', 'Styled text presets.', {
              alt: ['Text effects'],
              icon: 'sparkle',
              pro: 'unknown',
            }),
            it('templates', 'Text template', 'Animated text templates.', {
              alt: ['Text templates'],
              icon: 'grid',
              pro: 'unknown',
              conf: 'likely',
            }),
          ]),
          region('grid', 'panel', [
            it(
              'default',
              'Default text',
              'Adds a plain text segment at the playhead. Font, size, colour, stroke and shadow then live in the inspector Text tab; a local .ttf/.otf font is picked from the font list there.',
              {
                alt: ['Default'],
                icon: 'plus',
                house: FONT,
              },
            ),
          ]),
        ],
      },
      {
        id: 'asset-captions',
        name: 'Captions',
        slot: 'assets',
        regions: [
          region('sources', 'list', [
            it('auto', 'Auto captions', 'Speech-to-text captions.', {
              icon: 'captions',
              pro: 'unknown',
              conf: 'likely',
              house: CAPTIONS,
            }),
            it('manual', 'Add captions', 'Type or paste captions.', {
              icon: 'text',
            }),
            it('templates', 'Caption templates', 'Styled presets.', {
              icon: 'grid',
              pro: 'unknown',
            }),
            it('lyrics', 'Auto lyrics', 'Lyric recognition.', {
              icon: 'music',
              pro: 'unknown',
            }),
            it('local', 'Local captions', 'Imports an SRT.', {
              alt: ['Import captions'],
              icon: 'upload',
              pro: 'unknown',
            }),
          ]),
          region('form', 'sheet', [
            it('language', 'Spoken language', 'English.', {
              alt: ['Language'],
              icon: 'list',
              pro: 'unknown',
            }),
            it('bilingual', 'Bilingual captions', 'Translated second line.', {
              icon: 'captions',
              pro: 'pro',
            }),
            it('generate', 'Generate', 'Runs recognition onto a track.', {
              alt: ['Create'],
              icon: 'play',
              pro: 'unknown',
            }),
          ]),
        ],
      },
      {
        id: 'asset-adjustment',
        name: 'Adjustment',
        slot: 'assets',
        regions: [
          region('sources', 'list', [
            it('adjustment', 'Adjustment', 'The adjustment-layer tile.', {
              alt: ['Custom'],
              icon: 'sliders',
              conf: 'likely',
              house: {
                value: 'Grade on one adjustment layer: Curves, HSL, Wheels.',
                go: '#grade',
              },
            }),
            it(
              'presets',
              'My presets',
              'Adjustments saved with Save as preset.',
              { icon: 'list' },
            ),
            it('lut', 'LUT', 'Imported LUT files.', {
              icon: 'lut',
              pro: 'unknown',
              conf: 'confirmed',
              house: LUT_DESKTOP,
            }),
          ]),
          region('grid', 'panel', [
            it(
              'custom',
              'Custom adjustment',
              'Empty adjustment layer; + or drag it above the clips.',
              {
                alt: ['Adjustment layer'],
                icon: 'sliders',
                conf: 'likely',
              },
            ),
            it(
              'import',
              'Import',
              'File picker for .cube or .3dl; several at once.',
              {
                icon: 'upload',
                pro: 'unknown',
                conf: 'confirmed',
                house: {
                  value:
                    'LunarNight_v2_Violet.cube (default), _Blue.cube, _Soft.cube. Keep the extension.',
                  go: '#grade',
                },
              },
            ),
            it(
              'luttile',
              '+ on a LUT tile',
              'Adds the LUT as an adjustment segment above the clips.',
              {
                icon: 'plus',
                pro: 'unknown',
                conf: 'confirmed',
                house: {
                  value:
                    'Stretch the segment over every clip; Intensity 50–70.',
                  go: '#grade',
                },
              },
            ),
          ]),
        ],
      },
      {
        id: 'ratio-menu',
        name: 'Ratio',
        slot: 'player',
        regions: [
          region('list', 'list', [
            it('original', 'Original', "The first clip's ratio.", {
              icon: 'ratio',
            }),
            it('custom', 'Customized', 'Custom width and height.', {
              icon: 'ratio',
              conf: 'confirmed',
            }),
            it('16-9', '16:9', 'Landscape.', {
              icon: 'ratio',
              conf: 'confirmed',
            }),
            it('9-16', '9:16', 'Vertical.', {
              icon: 'ratio',
              conf: 'confirmed',
              house: RATIO,
            }),
            it('1-1', '1:1', 'Square.', { icon: 'ratio', conf: 'confirmed' }),
            it('4-3', '4:3', 'Classic landscape.', { icon: 'ratio' }),
            it('235', '2.35:1', 'Widescreen cinema.', { icon: 'ratio' }),
          ]),
        ],
      },
      {
        id: 'insp-video',
        name: 'Video',
        slot: 'inspector',
        regions: [
          region('subtabs', 'tabs', [
            it(
              'basic',
              'Basic',
              'Transform, Blend, Stabilize, Enhance, Reduce noise, Remove flickers, Canvas.',
              {
                icon: 'sliders',
                conf: 'confirmed',
              },
            ),
            it(
              'removebg',
              'Remove BG',
              'Auto removal, Custom removal, Chroma key.',
              {
                alt: ['Cutout'],
                icon: 'cutout',
                pro: 'unknown',
                conf: 'confirmed',
              },
            ),
            it(
              'mask',
              'Mask',
              'None, Split, Filmstrip, Circle, Rectangle, Heart, Star; Feather; Invert.',
              {
                icon: 'mask',
                conf: 'confirmed',
              },
            ),
            it('retouch', 'Retouch', 'Face, Body, Makeup.', {
              alt: ['Enhance'],
              icon: 'sparkle',
              pro: 'unknown',
            }),
          ]),
          region('basic', 'sheet', [
            it('scale', 'Scale', 'Slider and percent box.', {
              icon: 'expand',
              conf: 'likely',
              house: KEYFRAME,
            }),
            it('position', 'Position', 'X and Y.', { icon: 'target' }),
            it('rotate', 'Rotate', 'Angle box with a dial.', {
              icon: 'rotate',
            }),
            it('blendmode', 'Blend › Mode', 'Blend-mode dropdown.', {
              alt: ['Blend mode'],
              icon: 'blend',
              conf: 'likely',
              house: BLEND,
            }),
            it('opacity', 'Opacity', '0 to 100%.', {
              icon: 'opacity',
              conf: 'likely',
            }),
            it(
              'stabilize',
              'Stabilize',
              'Recommended, Minimum cut, Most stable.',
              {
                icon: 'stabilize',
                pro: 'unknown',
                conf: 'confirmed',
              },
            ),
            it(
              'enhance',
              'Enhance quality',
              'Upscale and sharpen, HD or UHD.',
              { icon: 'sharp', pro: 'pro', conf: 'confirmed' },
            ),
            it('noise', 'Reduce image noise', 'Removes grain with a level.', {
              icon: 'grain',
              pro: 'unknown',
              conf: 'confirmed',
            }),
            it('flicker', 'Remove flickers', 'Reduces light flicker.', {
              icon: 'sun',
              pro: 'unknown',
              conf: 'confirmed',
            }),
            it('canvas', 'Canvas', 'Background fill: blur, colour, pattern.', {
              alt: ['Background'],
              icon: 'canvas',
            }),
            it(
              'keyframe',
              'Keyframe',
              'The diamond at the right edge of each section or row: adds a keyframe for that property at the playhead.',
              {
                alt: ['diamond icon'],
                icon: 'diamond',
                conf: 'confirmed',
                house: KEYFRAME,
              },
            ),
          ]),
        ],
      },
      {
        id: 'insp-audio',
        name: 'Audio',
        slot: 'inspector',
        regions: [
          region('subtabs', 'tabs', [
            it('basic', 'Basic', 'Volume, fades and clean-up.', {
              icon: 'volume',
              conf: 'likely',
            }),
            it('voice', 'Voice changer', 'Voice filters and characters.', {
              icon: 'mic',
              pro: 'unknown',
              conf: 'likely',
            }),
          ]),
          region('basic', 'sheet', [
            it('volume', 'Volume', 'Slider in dB.', {
              icon: 'volume',
              conf: 'confirmed',
              house: VOLUME,
            }),
            it('fadein', 'Fade in', 'Seconds.', {
              icon: 'fade',
              conf: 'confirmed',
            }),
            it('fadeout', 'Fade out', 'Seconds.', {
              icon: 'fade',
              conf: 'confirmed',
            }),
            it('normalize', 'Normalize loudness', 'Evens the level.', {
              icon: 'wave',
              pro: 'unknown',
              conf: 'confirmed',
            }),
            it('enhance', 'Enhance voice', 'Speech clean-up, 0 to 100.', {
              icon: 'mic',
              pro: 'unknown',
              conf: 'confirmed',
            }),
            it('denoise', 'Reduce noise', 'Removes background noise.', {
              icon: 'wave',
              pro: 'unknown',
              conf: 'confirmed',
            }),
            it('isolate', 'Vocal isolation', 'Keeps or removes the voice.', {
              icon: 'mic',
              pro: 'unknown',
              conf: 'likely',
            }),
          ]),
        ],
      },
      {
        id: 'insp-speed',
        name: 'Speed',
        slot: 'inspector',
        regions: [
          region('subtabs', 'tabs', [
            it(
              'standard',
              'Standard',
              'Constant speed: Speed, Duration, Pitch, Smooth slow-mo.',
              {
                alt: ['Normal'],
                icon: 'speed',
                conf: 'likely',
              },
            ),
            it('curve', 'Curve', 'Speed ramps.', {
              icon: 'curve',
              conf: 'confirmed',
              house: SPEED_CURVE,
            }),
          ]),
          region('tiles', 'toolbar', [
            it('none', 'None', 'Removes the curve.', { icon: 'x' }),
            it('custom', 'Custom', 'Editable curve with draggable points.', {
              alt: ['Customized'],
              icon: 'curve',
              conf: 'confirmed',
              house: SPEED_CURVE,
            }),
            it('montage', 'Montage', 'Preset ramp.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('hero', 'Hero', 'Preset ramp.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('bullet', 'Bullet', 'Preset ramp.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('jump', 'Jump Cut', 'Preset ramp.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('flashin', 'Flash In', 'Preset ramp.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
            it('flashout', 'Flash Out', 'Preset ramp.', {
              icon: 'curve',
              conf: 'confirmed',
            }),
          ]),
        ],
      },
      {
        id: 'insp-adjust-basic',
        name: 'Adjustment › Basic',
        slot: 'inspector',
        regions: [
          region('subtabs', 'tabs', [
            it('basic', 'Basic', 'Sliders and LUT.', {
              icon: 'sliders',
              conf: 'confirmed',
              house: ADJUST,
            }),
            it('hsl', 'HSL', 'Per-colour hue, saturation, lightness.', {
              icon: 'hsl',
              opens: 'insp-adjust-hsl',
              pro: 'unknown',
              conf: 'confirmed',
              house: HSL,
            }),
            it('curves', 'Curves', 'Tone curves.', {
              icon: 'curve',
              pro: 'unknown',
              conf: 'confirmed',
              house: CURVES,
            }),
            it(
              'wheel',
              'Color wheel',
              'Shadow, Midtone, Highlight, Offset wheels.',
              {
                alt: ['Color wheels'],
                icon: 'wheel',
                pro: 'unknown',
                conf: 'confirmed',
                house: {
                  value:
                    'Shadows toward violet (hue ~275°) or deep blue (~224°). Highlights warm for food.',
                  go: '#grade',
                },
              },
            ),
          ]),
          region('body', 'sheet', [
            it('auto', 'Auto adjust', 'One-click correction. Skip it.', {
              icon: 'sparkle',
              pro: 'pro',
            }),
            it('match', 'Color match', 'Matches to a reference frame.', {
              icon: 'swap',
              pro: 'unknown',
              conf: 'likely',
              house: { value: 'Step 2 of the grade: Match.', go: '#grade' },
            }),
            it(
              'lut',
              'LUT',
              'Applies a LUT to this clip or adjustment layer.',
              {
                icon: 'lut',
                pro: 'unknown',
                conf: 'confirmed',
                house: LUT_DESKTOP,
              },
            ),
            it('lutname', 'Name', 'None and every imported LUT.', {
              alt: ['Select LUT'],
              icon: 'list',
              pro: 'unknown',
            }),
            it('intensity', 'Intensity', 'LUT strength, 0 to 100.', {
              alt: ['Strength'],
              icon: 'opacity',
              pro: 'unknown',
              conf: 'confirmed',
              house: { value: '50–70. At 100 it is a filter.', go: '#grade' },
            }),
            it('temp', 'Temp', 'Cool to warm.', {
              alt: ['Temperature'],
              icon: 'temp',
              conf: 'confirmed',
              house: { value: '−30', go: '#grade' },
            }),
            it('tint', 'Tint', 'Green to magenta.', {
              icon: 'hsl',
              conf: 'confirmed',
              house: { value: '+15 (0 for Blue)', go: '#grade' },
            }),
            it('saturation', 'Saturation', 'Colour strength.', {
              icon: 'drop',
              conf: 'confirmed',
              house: { value: '+15', go: '#grade' },
            }),
            it('exposure', 'Exposure', 'Overall brightness.', {
              icon: 'sun',
              conf: 'confirmed',
              house: { value: '−15', go: '#grade' },
            }),
            it('contrast', 'Contrast', 'Light vs dark.', {
              icon: 'contrast',
              conf: 'confirmed',
              house: { value: '+25', go: '#grade' },
            }),
            it('highlight', 'Highlight', 'Bright areas.', {
              alt: ['Highlights'],
              icon: 'sun',
              conf: 'confirmed',
              house: { value: '−10', go: '#grade' },
            }),
            it('shadow', 'Shadow', 'Dark areas.', {
              alt: ['Shadows'],
              icon: 'moon',
              conf: 'confirmed',
              house: { value: '−40', go: '#grade' },
            }),
            it('whites', 'Whites', 'White point.', { icon: 'sun' }),
            it('blacks', 'Blacks', 'Black point.', {
              icon: 'moon',
              house: { value: 'Down. The floor is 0.', go: '#grade' },
            }),
            it('sharpen', 'Sharpen', 'Edge sharpening.', {
              icon: 'sharp',
              conf: 'likely',
            }),
            it('particles', 'Particles', 'Film grain.', {
              alt: ['Grain'],
              icon: 'grain',
              house: { value: '20, last.', go: '#grade' },
            }),
            it('fade', 'Fade', 'Lifts blacks.', {
              icon: 'fade',
              conf: 'likely',
              house: { value: '0. Never.', go: '#grade' },
            }),
            it('vignette', 'Vignette', 'Corners.', {
              icon: 'vignette',
              house: { value: '+10', go: '#grade' },
            }),
            it(
              'savepreset',
              'Save as preset',
              'Stores the values under My presets.',
              { icon: 'copy', conf: 'likely' },
            ),
            it(
              'applyall',
              'Apply to all',
              'Copies the values to every clip on the track.',
              { icon: 'copy' },
            ),
          ]),
        ],
      },
      {
        id: 'insp-adjust-hsl',
        name: 'Adjustment › HSL',
        slot: 'inspector',
        regions: [
          region('dots', 'tabs', [
            it('red', 'Red', 'Red band.', { icon: 'dot', house: HSL }),
            it('orange', 'Orange', 'Orange band. Never touch the hue.', {
              icon: 'dot',
              house: HSL,
            }),
            it('yellow', 'Yellow', 'Yellow band.', { icon: 'dot' }),
            it('green', 'Green', 'Green band.', { icon: 'dot', house: HSL }),
            it('cyan', 'Cyan', 'Cyan band.', { icon: 'dot' }),
            it('blue', 'Blue', 'Blue band.', { icon: 'dot', house: HSL }),
            it('purple', 'Purple', 'Purple band.', { icon: 'dot' }),
            it('magenta', 'Magenta', 'Magenta band.', { icon: 'dot' }),
          ]),
          region('sliders', 'sheet', [
            it('hue', 'Hue', 'Shifts the chosen colour.', {
              icon: 'hsl',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('sat', 'Saturation', 'Strength.', {
              icon: 'drop',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('light', 'Lightness', 'Brightness.', {
              alt: ['Luminance'],
              icon: 'sun',
              pro: 'unknown',
              conf: 'likely',
            }),
          ]),
        ],
      },
      {
        id: 'export',
        name: 'Export',
        slot: 'dialog',
        regions: [
          region('video', 'sheet', [
            it('name', 'Name', 'File name.', { icon: 'text' }),
            it('exportto', 'Export to', 'Save folder; plain ASCII path.', {
              icon: 'list',
              conf: 'likely',
            }),
            it(
              'resolution',
              'Resolution',
              '480P, 720P, 1080P, 2K, 4K; 4K listed as Pro.',
              {
                icon: 'badge',
                pro: 'unknown',
                conf: 'confirmed',
                house: { value: '1080P', go: '#edit' },
              },
            ),
            it(
              'bitrate',
              'Bit rate',
              'Lower, Recommended, Higher, Customized.',
              {
                alt: ['Bitrate'],
                icon: 'wave',
                conf: 'confirmed',
                house: { value: 'Higher', go: '#edit' },
              },
            ),
            it('codec', 'Codec', 'H.264, HEVC.', {
              icon: 'badge',
              pro: 'unknown',
              conf: 'likely',
              house: { value: 'H.264', go: '#edit' },
            }),
            it('format', 'Format', 'mp4, mov.', {
              icon: 'badge',
              conf: 'likely',
              house: { value: 'mp4', go: '#edit' },
            }),
            it('fps', 'Frame rate', '24, 25, 30, 50, 60.', {
              icon: 'clock',
              conf: 'confirmed',
              house: {
                value: 'Match the capture: 30 for reviews, 24 for reels.',
                go: '#edit',
              },
            }),
            it('audio', 'Audio', 'Also exports a separate audio file.', {
              icon: 'music',
              pro: 'unknown',
              conf: 'likely',
            }),
            it('captions', 'Captions', 'SRT or TXT.', {
              icon: 'captions',
              pro: 'unknown',
              conf: 'confirmed',
            }),
            it(
              'export',
              'Export',
              'Starts rendering; then TikTok and YouTube shortcuts.',
              {
                icon: 'upload',
                conf: 'confirmed',
                house: EXPORT,
              },
            ),
          ]),
        ],
      },
    ],
  }

  /* ===================================================== Blackmagic Camera */
  const bmWB = {
    value:
      '3200K, tint 0 (Violet look). 2800K for the Blue variant. Grey sky: go colder (2800K); cyan: warmer (3600K).',
    why: 'About 70% of the look is made in camera. Lock White Balance on Record.',
    go: '#rig',
  }
  const bmShutter = {
    value:
      '360° (1/24 s at 24 fps) for night exteriors: lights streak. 180° (1/48, 1/60 at 30) for the kitchen and reviews.',
    why: 'On the Pixel, turning AUTO off puts shutter and ISO both into manual.',
    go: '#rig',
  }
  const bmISO = {
    value:
      'ISO 400 at night, expose for the lights with ISO only, stay under 1600. Reviews: the lowest ISO that still looks bright.',
    go: '#rig',
  }
  const bmLUT = {
    value:
      'Import LunarNight_v2_Violet (default), _Blue and _Soft. Display LUT on. Record LUT to Clip on when the edit is CapCut Mobile (it cannot load .cube).',
    why: 'Bake Violet for the finished look; bake Soft (60% Violet) if you still want to grade in CapCut, since its blacks stop at 1.6%.',
    go: '#grade',
  }
  const bmFPS = {
    value:
      '24 fps for Lunar Night reels; 30 fps for Marketplace Review; 60 fps only for the slow-mo pull.',
    go: '#rig',
  }
  const blackmagic = {
    id: 'blackmagic',
    name: 'Blackmagic Camera',
    short: 'Blackmagic',
    device: 'phone',
    landscape: true,
    version: 'Android 3.5.x (2026)',
    root: 'hud',
    screens: [
      {
        id: 'hud',
        name: 'Camera HUD',
        regions: [
          region(
            'top',
            'hud',
            [
              it(
                'lens',
                '1x',
                'Lens and zoom in one control: 0.5x, 1x, 5x and the front camera.',
                {
                  alt: ['Lens selector'],
                  icon: 'lens',
                  conf: 'likely',
                  house: {
                    value:
                      '1x or 2x at night; never the ultrawide. 0.5x only for the macro texture shot.',
                    go: '#shots',
                  },
                },
              ),
              it(
                'lutbadge',
                'LUT',
                'Switches the display LUT and whether it records.',
                {
                  icon: 'lut',
                  opens: 'settings-luts',
                  conf: 'likely',
                  house: bmLUT,
                },
              ),
              it('tc', '00:00:00:00', 'Timecode; red while recording.', {
                icon: 'clock',
                conf: 'confirmed',
              }),
              it('fps', 'FPS', '24 / 25 / 30 / 50 / 60.', {
                icon: 'clock',
                conf: 'confirmed',
                house: bmFPS,
              }),
              it(
                'shutter',
                'SHUTTER',
                'Angle 1.1°–360° or speed; AUTO button in the panel.',
                {
                  icon: 'shutter',
                  conf: 'confirmed',
                  house: bmShutter,
                },
              ),
              it('iris', 'IRIS', 'Greyed out on the Pixel: fixed aperture.', {
                icon: 'iris',
                conf: 'confirmed',
              }),
              it('iso', 'ISO', 'ISO 25–10666 depending on lens.', {
                icon: 'iso',
                conf: 'confirmed',
                house: bmISO,
              }),
              it(
                'wb',
                'WB',
                'Kelvin; presets Cloud, Shade, Fluorescent, Incandescent, Daylight; 2500K–10000K; auto.',
                {
                  alt: ['White balance'],
                  icon: 'temp',
                  conf: 'confirmed',
                  house: bmWB,
                },
              ),
              it('tint', 'TINT', '−50 to +50.', {
                icon: 'hsl',
                conf: 'confirmed',
                house: { value: '0', go: '#rig' },
              }),
            ],
            { area: 'top' },
          ),
          region(
            'picture',
            'preview',
            [
              it(
                'picture',
                'Picture',
                'Tap to focus; hold to lock focus and exposure; swipe up/down hides the HUD.',
                {
                  icon: 'frame',
                  conf: 'confirmed',
                  house: {
                    value: 'Focus, then lock. Hands off, roll 8 s.',
                    go: '#shots',
                  },
                },
              ),
            ],
            { area: 'center' },
          ),
          region(
            'right',
            'toolbar',
            [
              it(
                'overlays',
                'Overlays',
                'Zebra, focus assist, frame guide, grid, false colour, LUT quick toggles.',
                {
                  icon: 'grid',
                  opens: 'settings-monitor',
                  conf: 'likely',
                },
              ),
              it(
                'exposure',
                'Exposure ±',
                'The ± dial; AUTO inside restores auto shutter/ISO; ±4 stops.',
                {
                  icon: 'sun',
                  conf: 'confirmed',
                  house: {
                    value:
                      '−1.5 to −2 stops at night. Zebras inside the brightest bulb.',
                    go: '#rig',
                  },
                },
              ),
              it('record', 'Record', 'Big red circle.', {
                icon: 'record',
                conf: 'confirmed',
              }),
              it(
                'fbuttons',
                'F1 / F2 / F3',
                'Behind the three-dot icon, once Function Buttons is on.',
                {
                  icon: 'list',
                  conf: 'confirmed',
                  house: {
                    value:
                      'Suggestion, not canon: F1 zebra toggle, F2 focus assist, F3 the Lunar Night preset.',
                    go: '#rig',
                  },
                },
              ),
              it(
                'focus',
                'Focus',
                'AF on/off, tap-to-focus, manual slider; camera light underneath.',
                {
                  icon: 'target',
                  conf: 'likely',
                  house: {
                    value: 'Manual focus, locked, for every night shot.',
                    go: '#rig',
                  },
                },
              ),
              it('stab', 'Stabilization', 'Off / Standard / Optical.', {
                icon: 'stabilize',
                conf: 'likely',
                house: {
                  value:
                    'Off at night (braced frame). Standard handheld in the kitchen.',
                  go: '#rig',
                },
              }),
              it('media', 'Media', 'Last clip; opens the Media tab.', {
                icon: 'image',
                conf: 'likely',
              }),
              it('settings', 'Settings', 'Opens the Settings tab.', {
                icon: 'gear',
                opens: 'settings',
                conf: 'confirmed',
              }),
            ],
            { area: 'right' },
          ),
          region(
            'left',
            'toolbar',
            [
              it('presets', 'Presets', 'Left quick panel: saved presets.', {
                icon: 'list',
                opens: 'settings-presets',
                conf: 'confirmed',
                house: {
                  value:
                    'Save two presets: Lunar Night (24/360°/ISO 400/3200K) and Review (30/180°/auto-ish).',
                  go: '#rig',
                },
              }),
              it(
                'slate',
                'Slate',
                'Scene, Take, Reel, Day/Night, Interior/Exterior.',
                { icon: 'text', conf: 'confirmed' },
              ),
            ],
            { area: 'left' },
          ),
          region(
            'bottom',
            'hud',
            [
              it('histogram', 'Histogram', 'Bottom-left; tap to expand.', {
                icon: 'wave',
                conf: 'confirmed',
                house: {
                  value:
                    '30–80% of the frame under 3%: a pile on the left is right.',
                  go: '#grade',
                },
              }),
              it('storage', 'Storage', 'Space and remaining record time.', {
                icon: 'list',
                conf: 'likely',
              }),
              it('meters', 'Audio meters', 'VU or PPM; tap to set gain.', {
                icon: 'volume',
                conf: 'confirmed',
              }),
            ],
            { area: 'bottom' },
          ),
        ],
      },
      {
        id: 'settings',
        name: 'Settings',
        regions: [
          region('sections', 'list', [
            it('search', 'Search', 'Search field at the top (3.5).', {
              icon: 'search',
              conf: 'likely',
            }),
            it(
              'record',
              'Record',
              'Codec, bitrate, resolution, frame rate, colour space.',
              {
                icon: 'record',
                opens: 'settings-record',
                conf: 'confirmed',
              },
            ),
            it(
              'monitor',
              'Monitor',
              'Zebra, focus assist, guides, grids, false colour, Display LUT.',
              {
                icon: 'grid',
                opens: 'settings-monitor',
                conf: 'confirmed',
              },
            ),
            it('audio', 'Audio', 'Source, format, mono/stereo, metering.', {
              icon: 'volume',
              conf: 'confirmed',
            }),
            it(
              'setup',
              'Setup',
              'Camera: vertical video, WB lock, shutter units, noise, sharpening, stabilization.',
              {
                alt: ['Camera'],
                icon: 'gear',
                opens: 'settings-setup',
                conf: 'likely',
              },
            ),
            it('presets', 'Presets', 'Save, import, export presets.', {
              icon: 'list',
              opens: 'settings-presets',
              conf: 'confirmed',
            }),
            it(
              'luts',
              'LUTs',
              'Display LUT, Record LUT to Clip, LUT manager.',
              {
                icon: 'lut',
                opens: 'settings-luts',
                conf: 'confirmed',
                house: bmLUT,
              },
            ),
            it('media', 'Media', 'Save clips to Gallery or Files; proxies.', {
              icon: 'image',
              conf: 'confirmed',
            }),
            it(
              'accessories',
              'Accessories',
              'Bluetooth timecode, lens control, Wear OS.',
              { icon: 'link', conf: 'confirmed' },
            ),
            it('cloud', 'Blackmagic Cloud', 'Sign in, projects, uploads.', {
              icon: 'upload',
              conf: 'confirmed',
            }),
            it(
              'fbuttons',
              'Function Buttons',
              'F1 / F2 / F3: None, Preset, Toggle.',
              { icon: 'list', conf: 'confirmed' },
            ),
            it('remote', 'Remote', 'Remote control over Wi-Fi.', {
              icon: 'link',
              conf: 'likely',
            }),
            it('stream', 'Live Stream', 'YouTube, Twitch, RTMP, SRT.', {
              icon: 'upload',
              conf: 'confirmed',
            }),
          ]),
        ],
      },
      {
        id: 'settings-record',
        name: 'Record',
        regions: [
          region('rows', 'sheet', [
            it('codec', 'Codec', 'HEVC (H.265), H.264; APV on some phones.', {
              icon: 'badge',
              conf: 'confirmed',
              house: { value: 'HEVC', go: '#rig' },
            }),
            it('bitrate', 'Bitrate', 'Low, Medium, High, Max.', {
              alt: ['Quality'],
              icon: 'wave',
              conf: 'confirmed',
              house: { value: 'Max', go: '#rig' },
            }),
            it(
              'resolution',
              'Resolution',
              '4K, 1080p, 720p; open gate on some phones.',
              {
                icon: 'badge',
                conf: 'confirmed',
                house: { value: '4K', go: '#rig' },
              },
            ),
            it('fps', 'Frame Rate', '24, 25, 30, 50, 60 on the Pixel.', {
              icon: 'clock',
              conf: 'confirmed',
              house: bmFPS,
            }),
            it(
              'offspeed',
              'Off Speed Recording',
              '4–60 fps, plays back at the project rate.',
              { icon: 'speed', conf: 'confirmed' },
            ),
            it(
              'colorspace',
              'Color Space',
              'Rec. 709 or BT2020 HLG on the Pixel.',
              {
                icon: 'hsl',
                conf: 'confirmed',
                house: {
                  value: 'Rec.709, HDR off. The LUTs are Rec.709 in and out.',
                  go: '#grade',
                },
              },
            ),
            it('timecode', 'Timecode', 'Record Run or Time of Day.', {
              icon: 'clock',
              conf: 'confirmed',
            }),
            it('proxy', 'Record Proxy', '1080p HEVC proxy per clip.', {
              icon: 'copy',
              conf: 'confirmed',
            }),
            it('volbtn', 'Use Volume Button to Trigger Record', 'On/off.', {
              icon: 'record',
              conf: 'confirmed',
              house: { value: 'On: no screen tap, no shake.', go: '#rig' },
            }),
          ]),
        ],
      },
      {
        id: 'settings-monitor',
        name: 'Monitor',
        regions: [
          region('rows', 'sheet', [
            it('zebra', 'Zebra', 'On/off, 75%–100%.', {
              icon: 'zebra',
              conf: 'confirmed',
              house: {
                value: 'On at 95%. Zebras inside the brightest bulb only.',
                go: '#rig',
              },
            }),
            it(
              'focusassist',
              'Focus Assist',
              'Peaking or Colored Lines, 1%–100%.',
              {
                alt: ['Focus peaking'],
                icon: 'target',
                conf: 'confirmed',
                house: { value: 'On, Peaking.', go: '#rig' },
              },
            ),
            it(
              'guides',
              'Frame Guides',
              '9:16, 4:5, 1:1, 4:3, 2:1, 2.35:1 and more.',
              {
                icon: 'ratio',
                conf: 'confirmed',
                house: {
                  value: '9:16 when Vertical Video is off.',
                  go: '#rig',
                },
              },
            ),
            it('grids', 'Grids', 'Thirds, Centre Crosshair, Centre Dot.', {
              alt: ['Screen Guides'],
              icon: 'grid',
              conf: 'confirmed',
              house: {
                value: 'Thirds: subject middle third, horizon lower third.',
                go: '#shots',
              },
            }),
            it('safe', 'Safe Area Guides', '5%–100%.', {
              icon: 'frame',
              conf: 'confirmed',
            }),
            it('falsecolor', 'False Color', 'On/off.', {
              icon: 'hsl',
              conf: 'confirmed',
            }),
            it('displaylut', 'Display LUT', 'On/off (also under LUTs).', {
              icon: 'lut',
              conf: 'confirmed',
              house: bmLUT,
            }),
            it('histogram', 'Histogram', 'Display toggle.', {
              icon: 'wave',
              conf: 'confirmed',
            }),
          ]),
        ],
      },
      {
        id: 'settings-setup',
        name: 'Setup',
        regions: [
          region('rows', 'sheet', [
            it(
              'vertical',
              'Enable Vertical Video',
              'Off by default: records 16:9 even upright.',
              {
                icon: 'ratio',
                conf: 'confirmed',
                house: {
                  value: 'On for reels and reviews (9:16).',
                  go: '#rig',
                },
              },
            ),
            it('wblock', 'Lock White Balance on Record', 'On/off.', {
              icon: 'temp',
              conf: 'confirmed',
              house: { value: 'On.', go: '#rig' },
            }),
            it(
              'shutterunit',
              'Shutter Measurement',
              'Shutter Speed or Shutter Angle.',
              {
                icon: 'shutter',
                conf: 'confirmed',
                house: { value: 'Shutter Angle.', go: '#rig' },
              },
            ),
            it(
              'flicker',
              'Flicker Free Shutter Based On',
              '50 Hz, 60 Hz, Auto.',
              {
                icon: 'sun',
                conf: 'confirmed',
                house: { value: '60 Hz (US).', go: '#rig' },
              },
            ),
            it('noise', 'Reduce Noise', 'On/off.', {
              icon: 'grain',
              conf: 'confirmed',
              house: { value: 'Off. Grain is added in the grade.', go: '#rig' },
            }),
            it('sharpen', 'Increase Sharpening', 'On/off (Android only).', {
              icon: 'sharp',
              conf: 'confirmed',
              house: { value: 'Off.', go: '#rig' },
            }),
            it('stab', 'Stabilization', 'Off, Standard, Optical.', {
              icon: 'stabilize',
              conf: 'confirmed',
              house: {
                value: 'Off at night. Standard for handheld kitchen work.',
                go: '#rig',
              },
            }),
            it(
              'lockorient',
              'Lock Current Orientation',
              'Freezes the layout.',
              { icon: 'rotate', conf: 'confirmed' },
            ),
            it('mirror', 'Mirror Front Facing Camera', 'On/off.', {
              icon: 'mirror',
              conf: 'confirmed',
            }),
          ]),
        ],
      },
      {
        id: 'settings-presets',
        name: 'Presets',
        regions: [
          region('rows', 'sheet', [
            it('select', 'Preset Selection', 'The saved presets.', {
              icon: 'list',
              conf: 'confirmed',
            }),
            it('save', 'Save New Preset', 'Saves the current settings.', {
              icon: 'plus',
              conf: 'confirmed',
              house: {
                value:
                  'Lunar Night: 4K, 24 fps, 360°, ISO 400, 3200K, Rec.709, stab off. Review: 4K, 30 fps, 180°.',
                go: '#rig',
              },
            }),
            it('import', 'Import Preset', 'From a file.', {
              icon: 'upload',
              conf: 'confirmed',
            }),
            it('export', 'Export Preset', 'To a file.', {
              icon: 'copy',
              conf: 'confirmed',
            }),
          ]),
        ],
      },
      {
        id: 'settings-luts',
        name: 'LUTs',
        regions: [
          region('rows', 'sheet', [
            it('displaylut', 'Display LUT', 'On/off.', {
              icon: 'lut',
              conf: 'confirmed',
              house: { value: 'On.', go: '#grade' },
            }),
            it(
              'recordlut',
              'Record LUT to Clip',
              'Bakes the LUT into the file.',
              {
                icon: 'record',
                conf: 'confirmed',
                house: {
                  value:
                    'On when the edit is CapCut Mobile (Violet, or Soft to keep grading room). Off when grading on desktop with the .cube.',
                  go: '#grade',
                },
              },
            ),
            it(
              'selection',
              'LUT Selection',
              'Loaded LUTs; Import LUT, Export LUT, Remove.',
              {
                icon: 'list',
                conf: 'confirmed',
                house: {
                  value:
                    'Import LunarNight_v2_Violet, _Blue and _Soft (.cube, 33-point).',
                  go: '#grade',
                },
              },
            ),
          ]),
        ],
      },
    ],
  }

  /* ========================================================== Pixel Camera */
  const pxHDR = {
    value:
      'Off for LUT work: the LUTs are Rec.709 in and out, and HDR tops out at 4K30 anyway.',
    go: '#rig',
  }
  const pxStab = {
    value:
      'Standard (default) for handheld kitchen shots. Locked for the 2x and 5x squeeze from a brace. Active only for walking shots (1080p). Off at night when braced.',
    go: '#rig',
  }
  const pixelCamera = {
    id: 'pixel-camera',
    name: 'Pixel Camera',
    short: 'Pixel Cam',
    device: 'phone',
    version: '10.x (2026)',
    root: 'viewfinder',
    screens: [
      {
        id: 'viewfinder',
        name: 'Video viewfinder',
        regions: [
          region('top', 'topbar', [
            it('boost', 'Video Boost', 'Indicator when Video Boost is on.', {
              icon: 'sparkle',
              pro: 'pro',
              conf: 'confirmed',
              house: {
                value: 'Off. It re-renders the clip in the cloud.',
                go: '#rig',
              },
            }),
            it(
              'macro',
              'Macro Focus',
              'On / Auto / Off; gold flower = macro active.',
              {
                alt: ['Macro'],
                icon: 'flower',
                conf: 'likely',
                house: {
                  value: 'Auto for the macro texture shot (3 inches, 0.5x).',
                  go: '#shots',
                },
              },
            ),
            it(
              'lock',
              'Lock',
              'After tapping a subject: locks focus and exposure.',
              {
                icon: 'lock',
                conf: 'confirmed',
                house: {
                  value: 'Tap and hold to lock on every night shot.',
                  go: '#rig',
                },
              },
            ),
          ]),
          region('preview', 'preview', [
            it(
              'preview',
              'Viewfinder',
              'Tap to focus; with Quick access controls on, WB, Brightness and Shadows sliders appear.',
              {
                icon: 'frame',
                conf: 'confirmed',
              },
            ),
          ]),
          region('zoom', 'tabs', [
            it('z05', '.5x', 'Ultrawide.', {
              icon: 'lens',
              conf: 'confirmed',
              house: { value: 'Macro texture shot only.', go: '#shots' },
            }),
            it('z1', '1x', 'Main.', {
              icon: 'lens',
              conf: 'confirmed',
              house: { value: 'The default lens.', go: '#shots' },
            }),
            it('z2', '2x', '2x crop of main.', {
              icon: 'lens',
              conf: 'confirmed',
            }),
            it('z5', '5x', 'Telephoto.', {
              icon: 'lens',
              conf: 'confirmed',
              house: {
                value: 'The 5x squeeze: step back 6 feet.',
                go: '#shots',
              },
            }),
            it('z10', '10x', 'Tele crop.', {
              icon: 'lens',
              pro: 'pro',
              conf: 'likely',
            }),
          ]),
          region('modes', 'tabs', [
            it('pan', 'Pan', 'Cinematic Pan.', {
              icon: 'motion',
              conf: 'confirmed',
            }),
            it('blur', 'Blur', 'Cinematic Blur, 24 fps.', {
              icon: 'blur',
              conf: 'confirmed',
            }),
            it('video', 'Video', 'Standard video.', {
              icon: 'record',
              conf: 'confirmed',
            }),
            it(
              'night',
              'Night Sight',
              'Night Sight Video through Video Boost.',
              {
                icon: 'moon',
                pro: 'pro',
                conf: 'likely',
                house: {
                  value:
                    'Off. Night exteriors are shot manual, 3200K, under-exposed.',
                  go: '#rig',
                },
              },
            ),
            it(
              'slowmo',
              'Slow Motion',
              '1/4x (120 fps) or 1/8x (240 fps), 1080p.',
              {
                icon: 'speed',
                conf: 'confirmed',
                house: {
                  value:
                    'Not for the slow-mo pull: shoot that at 60 fps in Video and slow it in CapCut.',
                  go: '#shots',
                },
              },
            ),
            it('timelapse', 'Time Lapse', 'Auto, 5x, 10x, 30x, 120x.', {
              icon: 'clock',
              conf: 'confirmed',
            }),
          ]),
          region('shutter', 'toolbar', [
            it('gallery', 'Gallery', 'Last capture in Google Photos.', {
              icon: 'image',
              conf: 'confirmed',
            }),
            it(
              'record',
              'Record',
              'Starts recording. Pause and Shutter appear while rolling.',
              { icon: 'record', conf: 'confirmed' },
            ),
            it('flip', 'Switch camera', 'Front / rear.', {
              icon: 'swap',
              conf: 'confirmed',
              house: {
                value: 'Front camera for the bite and verdict.',
                go: '#shots',
              },
            }),
          ]),
          region('bar', 'toolbar', [
            it(
              'settings',
              'Video settings',
              'The settings sheet (General / Pro). Swipe up does the same.',
              {
                icon: 'gear',
                opens: 'settings-general',
                conf: 'confirmed',
              },
            ),
            it('photo', 'Photo', 'Photo mode set.', {
              icon: 'camera',
              conf: 'confirmed',
            }),
            it('videotab', 'Video', 'Video mode set (selected).', {
              icon: 'record',
              conf: 'confirmed',
            }),
            it('controls', 'Pro controls', 'Manual sliders panel.', {
              alt: ['controls', 'adjustments'],
              icon: 'sliders',
              opens: 'pro-controls',
              pro: 'pro',
              conf: 'likely',
            }),
          ]),
        ],
      },
      {
        id: 'settings-general',
        name: 'Video settings › General',
        over: 'viewfinder',
        regions: [
          region('tabs', 'tabs', [
            it(
              'general',
              'General',
              'Flash, Video Boost, Resolution, FPS, 10-bit HDR, Stabilization, Speech enhancement.',
              {
                icon: 'list',
                conf: 'confirmed',
              },
            ),
            it('pro', 'Pro', 'Lens selection.', {
              icon: 'sliders',
              opens: 'settings-pro',
              conf: 'confirmed',
            }),
            it('more', 'More settings', 'Three-dot button, top-right.', {
              icon: 'list',
              opens: 'more-settings',
              conf: 'confirmed',
            }),
          ]),
          region('rows', 'sheet', [
            it('flash', 'Flash', 'Off / On (torch).', {
              icon: 'sun',
              conf: 'likely',
              house: { value: 'Off.', go: '#rig' },
            }),
            it(
              'boost',
              'Video Boost',
              'Cloud processing; needs Photos backup.',
              {
                icon: 'sparkle',
                pro: 'pro',
                conf: 'confirmed',
                house: { value: 'Off.', go: '#rig' },
              },
            ),
            it('resolution', 'Resolution', '1080p / 4K / 8K (8K with Boost).', {
              icon: 'badge',
              conf: 'confirmed',
              house: { value: '4K', go: '#rig' },
            }),
            it(
              'fps',
              'FPS',
              '24 / 30 / 60; auto is now Optimize FPS in More settings.',
              {
                alt: ['Frames/sec'],
                icon: 'clock',
                conf: 'confirmed',
                house: {
                  value: '24 for reels, 30 for reviews, 60 for the pull shot.',
                  go: '#rig',
                },
              },
            ),
            it('hdr', '10-bit HDR', 'HDR capture; tops out at 4K30.', {
              icon: 'sun',
              conf: 'confirmed',
              house: pxHDR,
            }),
            it('stab', 'Stabilization', 'Standard / Locked / Active.', {
              icon: 'stabilize',
              conf: 'confirmed',
              house: pxStab,
            }),
            it(
              'speech',
              'Speech enhancement',
              'Cuts background noise around speech.',
              { icon: 'mic', conf: 'likely' },
            ),
            it('macro', 'Macro Focus', 'On / Auto / Off.', { icon: 'flower' }),
          ]),
        ],
      },
      {
        id: 'settings-pro',
        name: 'Video settings › Pro',
        over: 'viewfinder',
        regions: [
          region('rows', 'sheet', [
            it(
              'lens',
              'Lens selection',
              'Auto / Manual: UW, W, T buttons replace the zoom chips. Confirmed for photos; whether it applies in Video is not established.',
              {
                icon: 'lens',
                pro: 'pro',
                house: {
                  value:
                    'Manual: W for everything, T for the 5x squeeze. The app resets to Wide when reopened.',
                  go: '#rig',
                },
              },
            ),
          ]),
        ],
      },
      {
        id: 'pro-controls',
        name: 'Pro controls',
        over: 'viewfinder',
        regions: [
          region('chips', 'toolbar', [
            it('brightness', 'Brightness', 'Exposure slider.', {
              alt: ['Exposure'],
              icon: 'sun',
              conf: 'likely',
              house: { value: '−1.5 to −2 stops at night.', go: '#rig' },
            }),
            it('shadows', 'Shadows', 'Shadows slider.', {
              icon: 'moon',
              conf: 'likely',
              house: { value: 'All the way down.', go: '#rig' },
            }),
            it('wb', 'White balance', 'Kelvin slider, left cooler.', {
              alt: ['WB'],
              icon: 'temp',
              conf: 'likely',
              house: {
                value: '3200K (2800K for the Blue variant).',
                go: '#rig',
              },
            }),
            it(
              'focus',
              'Focus',
              'Manual focus with peaking and a magnified window.',
              {
                icon: 'target',
                house: {
                  value: 'Manual, then tap and hold to lock.',
                  go: '#rig',
                },
              },
            ),
            it('shutter', 'Shutter speed', 'Contradicted in video mode.', {
              icon: 'shutter',
              house: {
                value:
                  'The slowest shutter on offer, if the slider exists in video.',
                go: '#rig',
              },
            }),
            it('iso', 'ISO', 'Contradicted in video mode.', {
              icon: 'iso',
              house: { value: 'ISO 400.', go: '#rig' },
            }),
            it('reset', 'Reset', 'Back to auto.', {
              icon: 'undo',
              conf: 'likely',
            }),
          ]),
        ],
      },
      {
        id: 'more-settings',
        name: 'More settings',
        over: 'viewfinder',
        regions: [
          region('rows', 'list', [
            it('framing', 'Framing hints', 'Level line and tilt number.', {
              icon: 'grid',
              conf: 'confirmed',
              house: {
                value: 'On: a dead-level frame is the look.',
                go: '#shots',
              },
            }),
            it('grid', 'Grid type', 'None / 3 x 3 / 4 x 4 / Golden ratio.', {
              icon: 'grid',
              conf: 'likely',
              house: { value: '3 x 3.', go: '#shots' },
            }),
            it(
              'quick',
              'Quick access controls',
              'On-viewfinder WB / Brightness / Shadows sliders.',
              {
                icon: 'sliders',
                conf: 'confirmed',
                house: { value: 'On.', go: '#rig' },
              },
            ),
            it('volume', 'Volume key action', 'Shutter / Zoom.', {
              icon: 'record',
              conf: 'confirmed',
              house: {
                value: 'Shutter: start without touching the screen.',
                go: '#rig',
              },
            }),
            it('vstab', 'Video stabilization', 'Master EIS switch.', {
              icon: 'stabilize',
              conf: 'confirmed',
              house: pxStab,
            }),
            it('audiozoom', 'Audio zoom', 'Mics narrow toward the subject.', {
              icon: 'mic',
              conf: 'likely',
            }),
            it('format', 'Video format', 'H.264 (AVC) / H.265 (HEVC) / AV1.', {
              icon: 'badge',
              conf: 'confirmed',
              house: { value: 'H.265 (HEVC). CapCut reads it.', go: '#rig' },
            }),
            it('optfps', 'Optimize FPS', 'Auto 30/60 by light and motion.', {
              icon: 'clock',
              conf: 'confirmed',
              house: {
                value: 'Off. Pick the frame rate yourself.',
                go: '#rig',
              },
            }),
            it('dirty', 'Show dirty lens warning', 'On/off.', {
              icon: 'lens',
              conf: 'confirmed',
              house: {
                value: 'On. Wipe the lens before every shoot.',
                go: '#rig',
              },
            }),
          ]),
        ],
      },
    ],
  }

  LN.data.appMaps = {
    apps: [capcutMobile, capcutDesktop, blackmagic, pixelCamera],
  }
})()
