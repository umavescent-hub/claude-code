/* modules/bake.js — Route B: bake a look into a real MP4 on the phone.
   Mounted inside Grade as LN.bake.mount(el). CapCut Mobile can't load .cube
   files, so this burns Lunar Night, Dreamcore, VHS or a v2 lattice into the
   pixels with WebGL2 (33³ RGBA16F 3D LUT) and re-encodes through Mediabunny's
   Conversion API with a per-frame `process` hook. Audio packets are copied,
   untouched. Frames leave the GPU as BT.709 limited-range I420, so CapCut
   reads the levels the way a camera clip is tagged. */
;(() => {
  const LN = window.LN
  const { h, ui } = LN
  const N = 33
  const LOOK_TAG = { lunar: 'LunarNight', dream: 'Dreamcore', vhs: 'VHS' }
  const QUALITY = [
    {
      value: 'very-high',
      label: 'Master',
      note: 'Very high bitrate. CapCut re-encodes on export, so start clean.',
    },
    {
      value: 'high',
      label: 'High',
      note: 'High bitrate. Smaller file, still clean for an edit.',
    },
    {
      value: 'medium',
      label: 'Lean',
      note: 'Medium bitrate. For quick tests and sharing drafts.',
    },
  ]
  const SIZES = [
    { value: 'orig', label: 'Original' },
    { value: '1080', label: '1080p' },
    { value: '720', label: '720p' },
  ]
  const BT709_LIMITED = {
    primaries: 'bt709',
    transfer: 'bt709',
    matrix: 'bt709',
    fullRange: false,
  }

  /* ------------------------------------------------------------ looks */
  function v2Data() {
    const d = LN.data && LN.data.lutsV2
    return d && d.looks && d.size ? d : null
  }
  function lookList() {
    const out = []
    const E = window.LN_LUT
    if (E && E.LOOKS)
      for (const id of Object.keys(E.LOOKS))
        out.push({
          id,
          kind: 'engine',
          name: E.LOOKS[id].name || id,
          note: E.LOOKS[id].tagline || '',
          tag: LOOK_TAG[id] || camel(E.LOOKS[id].name || id),
        })
    const v2 = v2Data()
    if (v2)
      for (const k of Object.keys(v2.looks))
        out.push({
          id: `v2-${k.toLowerCase()}`,
          key: k,
          kind: 'v2',
          name: `v2 · ${k}`,
          note: v2.looks[k].use || '',
          tag: `LunarNightV2${camel(k)}`,
        })
    return out
  }
  function camel(s) {
    return String(s)
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1))
      .join('')
  }
  /** Map whatever Grade stored ('lunar', 'v2:Violet', 'LunarNight_v2_Blue') to a look id. */
  function normLook(raw, list) {
    if (!list.length) return null
    const s = String(raw == null ? '' : raw).toLowerCase()
    if (s) {
      const exact = list.find(l => l.id === s)
      if (exact) return exact.id
      const v2 = list.filter(l => l.kind === 'v2')
      if (s.includes('v2') || v2.some(l => l.key.toLowerCase() === s)) {
        const m = v2.find(
          l =>
            s.endsWith(l.key.toLowerCase()) ||
            s.includes(`_${l.key.toLowerCase()}`),
        )
        if (m) return m.id
      }
      const pre = list.find(l => l.kind === 'engine' && s.startsWith(l.id))
      if (pre) return pre.id
    }
    const lunar = list.find(l => l.id === 'lunar')
    return (lunar || list[0]).id
  }
  /** Grade params may be stored flat or keyed by look id. */
  function paramsFor(lookId, stored) {
    if (!stored || typeof stored !== 'object') return null
    if (stored[lookId] && typeof stored[lookId] === 'object')
      return stored[lookId]
    if (
      stored.params &&
      typeof stored.params === 'object' &&
      (!stored.look || stored.look === lookId)
    )
      return stored.params
    const E = window.LN_LUT
    const defs = E && E.LOOKS && E.LOOKS[lookId] ? E.LOOKS[lookId].params : []
    const keys = defs.map(d => d.key)
    const hit = Object.keys(stored).filter(k => keys.includes(k))
    if (!hit.length) return null
    const out = {}
    for (const k of hit) out[k] = stored[k]
    return out
  }
  function normIntensity(v) {
    const n = Number(v)
    if (!Number.isFinite(n)) return 50
    const pct = n > 0 && n <= 1 ? n * 100 : n
    return Math.round(LN.math.clamp(pct, 0, 100))
  }
  function decodeV2(key) {
    const v2 = v2Data()
    const bin = atob(v2.looks[key].data)
    const n = v2.size
    const len = n * n * n * 3
    const out = new Float32Array(len)
    for (let i = 0; i < len; i++)
      out[i] =
        (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) / 65535
    return { table: out, size: n }
  }
  const v2Cache = {}
  /** Float32 RGB table in .cube order (red fastest) for a look. */
  function tableFor(look, params) {
    if (look.kind === 'v2') {
      if (!v2Cache[look.key]) v2Cache[look.key] = decodeV2(look.key)
      return v2Cache[look.key]
    }
    return { table: window.LN_LUT.build(look.id, params || {}, N), size: N }
  }

  /* ------------------------------------------------------------ WebGL2 LUT renderer */
  const VERT = `#version 300 es
in vec2 aP; out vec2 vUv;
void main(){ vUv = vec2(aP.x * 0.5 + 0.5, 0.5 - aP.y * 0.5); gl_Position = vec4(aP, 0.0, 1.0); }`
  const LUT_FN = `
uniform sampler2D uFrame; uniform highp sampler3D uLut; uniform float uN; uniform float uK;
vec3 grade(vec3 c){
  vec3 uvw = c * ((uN - 1.0) / uN) + 0.5 / uN;
  return mix(c, texture(uLut, uvw).rgb, uK);
}`
  const FRAG_RGB = `#version 300 es
precision highp float;
${LUT_FN}
in vec2 vUv; out vec4 o;
void main(){ o = vec4(grade(texture(uFrame, vUv).rgb), 1.0); }`
  // Packs graded pixels as I420, four bytes per RGBA texel: rows 0..H-1 hold Y,
  // rows H..H+H/2-1 hold the U row (texels 0..CW-1) then the V row (CW..2CW-1).
  const FRAG_YUV = `#version 300 es
precision highp float; precision highp int;
${LUT_FN}
uniform ivec2 uSize; uniform int uCw;
out vec4 o;
const vec3 KY = vec3(0.2126, 0.7152, 0.0722);
vec3 px(int x, int y){
  ivec2 p = ivec2(clamp(x, 0, uSize.x - 1), clamp(y, 0, uSize.y - 1));
  return grade(texelFetch(uFrame, p, 0).rgb);
}
float luma(vec3 c){ return (16.0 + 219.0 * dot(c, KY)) / 255.0; }
vec2 chroma(int cx, int cy){
  int x = cx * 2; int y = cy * 2;
  vec3 c = 0.25 * (px(x, y) + px(x + 1, y) + px(x, y + 1) + px(x + 1, y + 1));
  float yl = dot(c, KY);
  return vec2(128.0 + 224.0 * (c.b - yl) / 1.8556, 128.0 + 224.0 * (c.r - yl) / 1.5748) / 255.0;
}
void main(){
  ivec2 f = ivec2(gl_FragCoord.xy);
  if (f.y < uSize.y) {
    int x = f.x * 4;
    o = vec4(luma(px(x, f.y)), luma(px(x + 1, f.y)), luma(px(x + 2, f.y)), luma(px(x + 3, f.y)));
    return;
  }
  int cy = f.y - uSize.y;
  if (f.x >= 2 * uCw) { o = vec4(0.5); return; }
  bool isV = f.x >= uCw;
  int cx = (isV ? f.x - uCw : f.x) * 4;
  vec4 r;
  vec2 c0 = chroma(cx, cy); vec2 c1 = chroma(cx + 1, cy);
  vec2 c2 = chroma(cx + 2, cy); vec2 c3 = chroma(cx + 3, cy);
  o = isV ? vec4(c0.y, c1.y, c2.y, c3.y) : vec4(c0.x, c1.x, c2.x, c3.x);
}`

  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    })
    if (!gl) throw new Error('WebGL2 is not available in this browser.')
    const compile = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(`Shader: ${gl.getShaderInfoLog(s)}`)
      return s
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const program = src => {
      const p = gl.createProgram()
      gl.attachShader(p, vs)
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src))
      gl.bindAttribLocation(p, 0, 'aP')
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(`Program: ${gl.getProgramInfoLog(p)}`)
      const u = n => gl.getUniformLocation(p, n)
      return {
        p,
        frame: u('uFrame'),
        lut: u('uLut'),
        n: u('uN'),
        k: u('uK'),
        size: u('uSize'),
        cw: u('uCw'),
      }
    }
    const rgb = program(FRAG_RGB)
    let yuv = null
    const vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const lutTex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_3D, lutTex)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R])
      gl.texParameteri(gl.TEXTURE_3D, w, gl.CLAMP_TO_EDGE)
    const frameTex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, frameTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    let lutN = N
    let k = 0.5
    let fbo = null
    let fboTex = null
    let fboKey = ''
    let buf = null

    const upload = source => {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, frameTex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      )
    }
    const bindCommon = pr => {
      gl.useProgram(pr.p)
      gl.uniform1i(pr.frame, 0)
      gl.uniform1i(pr.lut, 1)
      gl.uniform1f(pr.n, lutN)
      gl.uniform1f(pr.k, k)
    }
    return {
      gl,
      canvas,
      setLut(table, size) {
        lutN = size
        const rgba = new Float32Array(size * size * size * 4)
        for (let i = 0, j = 0; i < table.length; i += 3, j += 4) {
          rgba[j] = table[i]
          rgba[j + 1] = table[i + 1]
          rgba[j + 2] = table[i + 2]
          rgba[j + 3] = 1
        }
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_3D, lutTex)
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
        gl.texImage3D(
          gl.TEXTURE_3D,
          0,
          gl.RGBA16F,
          size,
          size,
          size,
          0,
          gl.RGBA,
          gl.FLOAT,
          rgba,
        )
      },
      setIntensity(v) {
        k = LN.math.clamp(v, 0, 1)
      },
      /** Graded RGB into the canvas itself (preview). */
      drawRGB(source, w, h) {
        if (canvas.width !== w) canvas.width = w
        if (canvas.height !== h) canvas.height = h
        upload(source)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, w, h)
        bindCommon(rgb)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      },
      /** Graded frame as BT.709 limited I420 bytes + plane layout. */
      drawI420(source, w, h) {
        if (!yuv) yuv = program(FRAG_YUV)
        const cw = Math.ceil(w / 8)
        const tw = Math.max(Math.ceil(w / 4), 2 * cw)
        const th = h + h / 2
        const key = `${tw}x${th}`
        if (key !== fboKey) {
          if (fbo) gl.deleteFramebuffer(fbo)
          if (fboTex) gl.deleteTexture(fboTex)
          fboTex = gl.createTexture()
          gl.activeTexture(gl.TEXTURE2)
          gl.bindTexture(gl.TEXTURE_2D, fboTex)
          gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, tw, th)
          fbo = gl.createFramebuffer()
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            fboTex,
            0,
          )
          if (
            gl.checkFramebufferStatus(gl.FRAMEBUFFER) !==
            gl.FRAMEBUFFER_COMPLETE
          )
            throw new Error('The GPU could not prepare the frame buffer.')
          buf = new Uint8Array(tw * th * 4)
          fboKey = key
        }
        upload(source)
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.viewport(0, 0, tw, th)
        bindCommon(yuv)
        gl.uniform2i(yuv.size, w, h)
        gl.uniform1i(yuv.cw, cw)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.pixelStorei(gl.PACK_ALIGNMENT, 4)
        gl.readPixels(0, 0, tw, th, gl.RGBA, gl.UNSIGNED_BYTE, buf)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        const stride = tw * 4
        return {
          data: buf,
          layout: [
            { offset: 0, stride },
            { offset: h * stride, stride },
            { offset: h * stride + cw * 4, stride },
          ],
        }
      },
      destroy() {
        const ext = gl.getExtension('WEBGL_lose_context')
        if (ext) ext.loseContext()
      },
    }
  }

  /* ------------------------------------------------------------ helpers */
  const even = n => Math.max(2, 2 * Math.round(n / 2))
  function outSize(w, h, size) {
    const long = Math.max(w, h)
    const target = size === '1080' ? 1920 : size === '720' ? 1280 : long
    // "1080p" means a 1080-wide vertical (or 1080-tall landscape) frame: long edge 1920.
    const s = Math.min(1, target / long)
    return {
      w: even(w * s),
      h: even(h * s),
      scaled: s < 1 || w % 2 !== 0 || h % 2 !== 0,
    }
  }
  function mmss(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '–:––'
    const s = Math.round(sec)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
  function bitDepth(codecStr) {
    const s = String(codecStr || '')
    let m = s.match(/^(?:hvc1|hev1)\.(?:[A-C]?)(\d+)/i)
    if (m) return m[1] === '2' ? 10 : 8
    m = s.match(/^(?:avc1|avc3)\.([0-9a-f]{2})/i)
    if (m) return ['6e', '7a', 'f4'].includes(m[1].toLowerCase()) ? 10 : 8
    m = s.match(/^vp09\.\d+\.\d+\.(\d+)/i)
    if (m) return Number(m[1])
    m = s.match(/^av01\.\d+\.\d+[MH]\.(\d+)/i)
    if (m) return Number(m[1])
    return null
  }
  const CODEC_NAME = {
    avc: 'H.264 (AVC)',
    hevc: 'H.265 (HEVC)',
    vp9: 'VP9',
    vp8: 'VP8',
    av1: 'AV1',
    aac: 'AAC',
    opus: 'Opus',
    mp3: 'MP3',
    flac: 'FLAC',
    vorbis: 'Vorbis',
    ac3: 'AC-3',
    eac3: 'E-AC-3',
  }
  const codecName = c =>
    c ? CODEC_NAME[c] || String(c).toUpperCase() : 'unknown'
  const DISCARD = {
    undecodable_source_codec: 'this browser cannot decode it',
    no_encodable_target_codec: 'this browser has no encoder that fits an MP4',
    unknown_source_codec: 'its codec is unknown',
    max_track_count_reached: 'the MP4 had no room for it',
    max_track_count_of_type_reached: 'the MP4 had no room for it',
    cannot_copy: 'it could not be copied',
    discarded_by_user: 'it was switched off',
  }

  /** At-rest reference still: a plate, a step wedge and food swatches. */
  function drawChart(c) {
    const W = 640
    const H = 800
    c.width = W
    c.height = H
    const x = c.getContext('2d')
    const bg = x.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#1d2230')
    bg.addColorStop(0.55, '#0e1016')
    bg.addColorStop(1, '#050507')
    x.fillStyle = bg
    x.fillRect(0, 0, W, H)
    const lamp = x.createRadialGradient(470, 120, 4, 470, 120, 260)
    lamp.addColorStop(0, 'rgba(255,196,120,0.55)')
    lamp.addColorStop(1, 'rgba(255,196,120,0)')
    x.fillStyle = lamp
    x.fillRect(0, 0, W, H)
    // plate
    x.save()
    x.translate(320, 390)
    x.scale(1, 0.62)
    const rim = x.createRadialGradient(-60, -80, 20, 0, 0, 230)
    rim.addColorStop(0, '#f6f3ec')
    rim.addColorStop(0.7, '#d9d6cf')
    rim.addColorStop(1, '#8d8b86')
    x.fillStyle = rim
    x.beginPath()
    x.arc(0, 0, 230, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = '#ebe7df'
    x.beginPath()
    x.arc(0, 0, 160, 0, Math.PI * 2)
    x.fill()
    // sauce swoosh
    x.strokeStyle = '#8f1d1f'
    x.lineWidth = 34
    x.lineCap = 'round'
    x.beginPath()
    x.arc(-10, 20, 112, Math.PI * 0.85, Math.PI * 1.75)
    x.stroke()
    x.restore()
    // seared protein
    const sear = x.createLinearGradient(250, 340, 400, 430)
    sear.addColorStop(0, '#5a2d14')
    sear.addColorStop(0.5, '#b8661f')
    sear.addColorStop(1, '#e2a34a')
    x.fillStyle = sear
    x.beginPath()
    x.ellipse(335, 385, 78, 40, -0.25, 0, Math.PI * 2)
    x.fill()
    // herb, chile, yolk
    for (const [cx, cy, r, col] of [
      [276, 352, 9, '#3f7d32'],
      [298, 342, 6, '#5a9a3a'],
      [392, 414, 7, '#4b8a35'],
      [250, 410, 11, '#c22a1d'],
      [410, 360, 12, '#f2b51b'],
    ]) {
      x.fillStyle = col
      x.beginPath()
      x.arc(cx, cy, r, 0, Math.PI * 2)
      x.fill()
    }
    // swatches
    const sw = [
      '#c8a184',
      '#9e2a2b',
      '#e5a93c',
      '#3f7d32',
      '#2d5aa8',
      '#6b3fa0',
    ]
    sw.forEach((col, i) => {
      x.fillStyle = col
      x.fillRect(48 + i * 92, 600, 84, 56)
    })
    // step wedge, 0..255 in 11 steps
    for (let i = 0; i <= 10; i++) {
      const v = Math.round((i / 10) * 255)
      x.fillStyle = `rgb(${v},${v},${v})`
      x.fillRect(48 + i * 50, 680, 50, 60)
    }
    x.fillStyle = 'rgba(200,208,220,0.7)'
    x.font = '500 15px ui-monospace, Menlo, monospace'
    x.fillText('REFERENCE PLATE · STEP WEDGE 0–255', 48, 776)
  }

  /* ------------------------------------------------------------ mount */
  function mount(host) {
    const looks = lookList()
    const st = {
      look: normLook(LN.store.get('grade.look', 'lunar'), looks),
      intensity: normIntensity(LN.store.get('grade.intensity', 50)),
      gradeParams: LN.store.get('grade.params', null),
      size: LN.store.get('bake.size', '1080'),
      quality: LN.store.get('bake.quality', 'very-high'),
      codec: 'avc',
      hevcOk: false,
      file: null,
      probe: null,
      input: null,
      busy: false,
      conv: null,
      wipe: 50,
      result: null,
    }
    if (!SIZES.some(s => s.value === st.size)) st.size = '1080'
    if (!QUALITY.some(q => q.value === st.quality)) st.quality = 'very-high'
    const lookOf = id => looks.find(l => l.id === id)

    const root = h('div', { class: 'bake' })
    host.append(root)

    /* ---- head */
    const head = h(
      'header',
      { class: 'bake-head' },
      h('div', { class: 'ln-eyebrow' }, 'Route B · Bake on the phone'),
      h('h2', { class: 'ln-h2' }, 'Bake the look into an MP4'),
      h(
        'p',
        { class: 'bake-lede' },
        'CapCut on the phone can’t load a .cube file. So burn the grade into the pixels here: pick a clip, set the look and strength, and the Pixel renders a new MP4 frame by frame. The audio is copied across untouched.',
      ),
      routesStrip(),
    )

    /* ---- viewer */
    const before = h('canvas', { class: 'bake-before', 'aria-hidden': 'true' })
    const after = h('canvas', {
      class: 'bake-after',
      role: 'img',
      'aria-label': 'Graded preview',
    })
    const lblBefore = h('span', { class: 'bake-tag l' }, 'Before')
    const lblAfter = h('span', { class: 'bake-tag r' }, 'After')
    const slate = h('div', { class: 'bake-slate' })
    const stage = h(
      'div',
      { class: 'bake-stage', style: { '--wipe': '50%', '--ar': '0.8' } },
      after,
      before,
      h('span', { class: 'bake-split', 'aria-hidden': 'true' }),
      lblBefore,
      lblAfter,
      h('i', { class: 'bake-mark tl', 'aria-hidden': 'true' }),
      h('i', { class: 'bake-mark tr', 'aria-hidden': 'true' }),
      h('i', { class: 'bake-mark bl', 'aria-hidden': 'true' }),
      h('i', { class: 'bake-mark br', 'aria-hidden': 'true' }),
    )
    const wipe = ui.slider({
      id: 'bake-wipe',
      label: 'Wipe',
      min: 0,
      max: 100,
      value: 50,
      unit: '%',
      onInput: v => setWipe(v),
    })
    const setWipe = v => {
      st.wipe = v
      stage.style.setProperty('--wipe', `${v}%`)
      if (wipe.get() !== v) wipe.set(v)
    }
    let dragging = false
    const wipeAt = e => {
      const r = stage.getBoundingClientRect()
      setWipe(
        Math.round(
          LN.math.clamp(((e.clientX - r.left) / r.width) * 100, 0, 100),
        ),
      )
    }
    stage.addEventListener('pointerdown', e => {
      dragging = true
      stage.setPointerCapture(e.pointerId)
      wipeAt(e)
    })
    stage.addEventListener('pointermove', e => dragging && wipeAt(e))
    stage.addEventListener('pointerup', () => {
      dragging = false
    })
    stage.addEventListener('pointercancel', () => {
      dragging = false
    })
    const viewer = h(
      'div',
      { class: 'bake-viewer' },
      h('div', { class: 'bake-stagewrap' }, stage),
      slate,
      h('div', { class: 'bake-wipe' }, wipe.el),
    )

    /* ---- clip + spec sheet */
    const specs = h('dl', { class: 'bake-specs' })
    const warnBox = h('div', { class: 'bake-warn' })
    const pick = ui.filePick({
      id: 'bake-file',
      accept: 'video/*',
      label: 'Choose a clip',
      kind: 'ghost',
      onFile: f => loadClip(f),
    })
    const clipName = h(
      'span',
      { class: 'bake-clipname' },
      'Reference plate loaded. Choose a clip from the camera roll.',
    )
    const clipCard = h(
      'div',
      { class: 'ln-card bake-card' },
      h(
        'div',
        { class: 'bake-step' },
        h('b', null, '01'),
        h('span', null, 'Clip'),
      ),
      h('div', { class: 'ln-row bake-pickrow' }, pick, clipName),
      specs,
      warnBox,
    )

    /* ---- controls */
    const lookRow = h('div', {
      class: 'bake-looks',
      role: 'group',
      'aria-label': 'Look',
    })
    const lookNote = h('p', { class: 'bake-note' })
    const paramNote = h('p', { class: 'bake-fine' })
    const lookBtns = looks.map(l =>
      h(
        'button',
        {
          type: 'button',
          class: 'ln-chip',
          'aria-pressed': String(l.id === st.look),
          dataset: { look: l.id },
          onClick: () => setLook(l.id),
        },
        l.kind === 'v2' ? l.name : l.name,
      ),
    )
    lookRow.append(...lookBtns)
    const inten = ui.slider({
      id: 'bake-intensity',
      label: 'Intensity',
      min: 0,
      max: 100,
      value: st.intensity,
      unit: '%',
      onInput: v => {
        st.intensity = v
        intenHint()
        schedulePreview()
      },
    })
    const intenScale = h(
      'div',
      { class: 'bake-scale', 'aria-hidden': 'true' },
      h('span', { class: 'bake-sweet' }),
    )
    const intenText = h('p', { class: 'bake-fine' })
    const intenHint = () => {
      const v = st.intensity
      intenText.textContent =
        v < 38
          ? `${v}% — a whisper. The sweet spot is 38–62%.`
          : v <= 62
            ? `${v}% — in the sweet spot (38–62%). A LUT at 60% is a grade.`
            : `${v}% — past the sweet spot. At 100% a LUT is a filter.`
    }
    inten.el.append(intenScale)

    const sizeSeg = ui.seg({
      label: 'Output size (long edge)',
      options: SIZES,
      value: st.size,
      onChange: v => {
        st.size = v
        LN.store.set('bake.size', v)
        renderSpecsOut()
      },
    })
    const qNote = h('p', { class: 'bake-fine' })
    const qualSeg = ui.seg({
      label: 'Quality',
      options: QUALITY.map(q => ({ value: q.value, label: q.label })),
      value: st.quality,
      onChange: v => {
        st.quality = v
        LN.store.set('bake.quality', v)
        qNote.textContent = QUALITY.find(q => q.value === v).note
      },
    })
    qNote.textContent = QUALITY.find(q => q.value === st.quality).note
    const codecNote = h(
      'p',
      { class: 'bake-fine' },
      'H.264 is the safe pick for CapCut. HEVC appears once this browser confirms it can encode it.',
    )
    const codecSeg = ui.seg({
      label: 'Codec',
      options: [
        { value: 'avc', label: 'H.264' },
        { value: 'hevc', label: 'HEVC' },
      ],
      value: 'avc',
      onChange: v => {
        if (v === 'hevc' && !st.hevcOk) {
          codecSeg.set('avc')
          LN.toast(
            'HEVC encoding is not available in this browser. Using H.264.',
            { kind: 'warn' },
          )
          return
        }
        st.codec = v
      },
    })
    const hevcBtn = codecSeg.el.querySelector('[data-v="hevc"]')
    if (hevcBtn) hevcBtn.disabled = true

    const bakeBtn = ui.btn('Bake MP4', () => runBake(), {
      id: 'bake-run',
      block: true,
      disabled: true,
    })
    const cancelBtn = ui.btn('Cancel', () => cancelBake(), {
      kind: 'danger',
      small: true,
      id: 'bake-cancel',
    })
    const bar = h(
      'div',
      {
        class: 'bake-bar',
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': '0',
        'aria-label': 'Bake progress',
      },
      h('span'),
    )
    const progText = h('div', { class: 'bake-progtext', 'aria-live': 'polite' })
    const prog = h(
      'div',
      { class: 'bake-prog', hidden: true },
      h(
        'div',
        { class: 'bake-proghead' },
        h('span', { class: 'bake-rec' }, 'Baking'),
        cancelBtn,
      ),
      bar,
      progText,
      h(
        'p',
        { class: 'bake-fine' },
        'Keep this tab in front with the screen on. Android pauses background tabs.',
      ),
    )
    const readyNote = h(
      'p',
      { class: 'bake-fine bake-ready' },
      'Choose a clip to bake. The preview shows the reference plate until then.',
    )
    const ctrlCard = h(
      'div',
      { class: 'ln-card bake-card' },
      h(
        'div',
        { class: 'bake-step' },
        h('b', null, '02'),
        h('span', null, 'Look'),
      ),
      lookRow,
      lookNote,
      paramNote,
      inten.el,
      intenText,
      h('hr', { class: 'ln-rule' }),
      h(
        'div',
        { class: 'bake-step' },
        h('b', null, '03'),
        h('span', null, 'Output'),
      ),
      sizeSeg.el,
      qualSeg.el,
      qNote,
      codecSeg.el,
      codecNote,
      h('hr', { class: 'ln-rule' }),
      bakeBtn,
      readyNote,
      prog,
    )

    /* ---- result */
    const result = h('div', {
      class: 'bake-result',
      hidden: true,
      'aria-live': 'polite',
    })
    const errBox = h('div', { class: 'bake-err' })

    /* ---- fallback recipe */
    const recipe = recipeDetails()

    root.append(
      head,
      h(
        'div',
        { class: 'bake-grid' },
        viewer,
        h('div', { class: 'bake-side' }, clipCard, ctrlCard),
      ),
      errBox,
      result,
      recipe,
    )

    /* ---- preview renderer */
    let prev = null
    try {
      prev = createRenderer(after)
    } catch (e) {
      showError(
        'WebGL2 is off',
        `${e.message} The bake needs the GPU to grade each frame. Use the CapCut slider recipe below.`,
      )
    }
    let lutKey = ''
    let srcCanvas = before
    const syncLut = () => {
      if (!prev) return
      const look = lookOf(st.look)
      if (!look) return
      const params =
        look.kind === 'engine' ? paramsFor(look.id, st.gradeParams) : null
      const key = `${look.id}|${JSON.stringify(params)}`
      if (key !== lutKey) {
        const t = tableFor(look, params)
        prev.setLut(t.table, t.size)
        lutKey = key
      }
    }
    const renderPreview = () => {
      if (!prev || !srcCanvas.width) return
      try {
        syncLut()
        prev.setIntensity(st.intensity / 100)
        prev.drawRGB(srcCanvas, srcCanvas.width, srcCanvas.height)
      } catch (e) {
        console.warn('[bake] preview failed', e)
      }
      lblAfter.textContent = `After · ${lookOf(st.look) ? lookOf(st.look).name : ''} ${st.intensity}%`
    }
    let raf = 0
    const schedulePreview = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        renderPreview()
      })
    }
    const setStageAspect = (w, h2) => {
      stage.style.setProperty('--ar', String(w / h2))
      stage.classList.toggle('tall', h2 > w)
    }

    function setLook(id) {
      if (st.busy) return
      st.look = id
      for (const b of lookBtns)
        b.setAttribute('aria-pressed', String(b.dataset.look === id))
      updateLookNotes()
      schedulePreview()
    }
    function updateLookNotes() {
      const look = lookOf(st.look)
      lookNote.textContent = look ? look.note : ''
      if (!look) {
        paramNote.textContent = ''
        return
      }
      if (look.kind === 'v2') {
        paramNote.textContent =
          'Fixed 33-point v2 lattice from the runbook. Grade sliders don’t apply.'
        return
      }
      const p = paramsFor(look.id, st.gradeParams)
      const n = p ? Object.keys(p).length : 0
      paramNote.textContent = n
        ? `Using your ${n} Grade setting${n === 1 ? '' : 's'} for ${look.name}. Change them in the look lab above.`
        : `Using the ${look.name} defaults. Tune it in the look lab above and the bake follows.`
    }

    /* ---- grade sync */
    const offParams = LN.bus.on('grade:params', d => {
      if (
        d &&
        typeof d === 'object' &&
        (d.look || d.intensity != null) &&
        d.params
      ) {
        st.gradeParams = d.look
          ? { [normLook(d.look, looks)]: d.params }
          : d.params
        if (d.look && !st.busy) setLook(normLook(d.look, looks))
        if (d.intensity != null && !st.busy) {
          st.intensity = normIntensity(d.intensity)
          inten.set(st.intensity)
          intenHint()
        }
      } else {
        st.gradeParams = d || LN.store.get('grade.params', null)
      }
      updateLookNotes()
      schedulePreview()
    })
    const offLook = LN.bus.on('grade:look', d => {
      if (st.busy) return
      const id = normLook(
        d && typeof d === 'object' ? d.look || d.id : d,
        looks,
      )
      if (id) setLook(id)
    })
    const offInt = LN.bus.on('grade:intensity', d => {
      if (st.busy) return
      st.intensity = normIntensity(d && typeof d === 'object' ? d.intensity : d)
      inten.set(st.intensity)
      intenHint()
      schedulePreview()
    })
    void offParams
    void offLook
    void offInt

    /* ---- at rest: reference plate */
    drawChart(before)
    setStageAspect(before.width, before.height)
    slate.replaceChildren(
      h('span', null, 'REF'),
      h('span', null, `${before.width}×${before.height}`),
      h('span', null, 'sRGB'),
    )
    renderSpecsIdle()
    updateLookNotes()
    intenHint()
    renderPreview()
    checkSupport()

    /* ---------------------------------------------------- support */
    async function checkSupport() {
      if (!LN.media.hasWebCodecs()) {
        showError(
          'This browser can’t encode video',
          'There is no WebCodecs video encoder here, so the bake can’t run. Open Lunar Night OS in Chrome on the Pixel, or use the CapCut slider recipe below.',
        )
        return
      }
      if (!looks.length) {
        showError(
          'No looks loaded',
          'The colour engine did not load, so there is nothing to bake. Reload the page.',
        )
        return
      }
      try {
        const MB = await LN.lib.mediabunny()
        st.hevcOk = await MB.canEncodeVideo('hevc', {
          width: 1080,
          height: 1920,
        })
      } catch (_e) {
        st.hevcOk = false
      }
      if (hevcBtn) hevcBtn.disabled = !st.hevcOk
      codecNote.textContent = st.hevcOk
        ? 'H.264 is the safe pick for CapCut. HEVC makes a smaller file at the same quality.'
        : 'H.264 is the safe pick for CapCut. This browser can’t encode HEVC, so it stays off.'
    }

    /* ---------------------------------------------------- errors */
    function showError(title, msg) {
      errBox.replaceChildren(ui.callout('warn', msg, title))
      recipe.open = true
    }
    const clearError = () => errBox.replaceChildren()

    /* ---------------------------------------------------- spec sheet */
    function specRows(rows) {
      specs.replaceChildren(
        ...rows.flatMap(([k, v, cls]) => [
          h('dt', null, k),
          h('dd', { class: cls || null }, v),
        ]),
      )
    }
    function renderSpecsIdle() {
      specRows([
        ['Container', '—'],
        ['Video', '—'],
        ['Frame', '—'],
        ['Rate', '—'],
        ['Length', '—'],
        ['Rotation', '—'],
        ['Audio', '—'],
        ['Dynamic range', '—'],
      ])
    }
    function renderSpecsOut() {
      if (!st.probe) return
      const p = st.probe
      const o = outSize(p.w, p.h, st.size)
      const row = specs.querySelector('[data-out]')
      if (row) row.textContent = `${o.w}×${o.h}${o.scaled ? '' : ' (as shot)'}`
    }
    function renderSpecs() {
      const p = st.probe
      const o = outSize(p.w, p.h, st.size)
      const hdrText = p.hdr
        ? `HDR · ${p.transfer.toUpperCase()}${p.depth ? ` · ${p.depth}-bit` : ''}`
        : p.depth && p.depth > 8
          ? `SDR · ${p.depth}-bit`
          : `SDR${p.depth ? ` · ${p.depth}-bit` : ''}${p.transfer ? ` · ${p.transfer}` : ''}`
      specRows([
        ['Container', p.container],
        [
          'Video',
          `${codecName(p.vcodec)}${p.vstring ? ` · ${p.vstring}` : ''}`,
        ],
        ['Frame', `${p.w}×${p.h}${p.coded ? ` · coded ${p.coded}` : ''}`],
        [
          'Rate',
          p.fps ? `${LN.fmt.num(p.fps, p.fps % 1 ? 2 : 0)} fps` : 'variable',
        ],
        ['Length', `${LN.fmt.num(p.duration, 2)} s · ~${p.frames} frames`],
        ['Rotation', p.rotation ? `${p.rotation}° (baked upright)` : '0°'],
        [
          'Audio',
          p.acodec
            ? `${codecName(p.acodec)} · ${p.channels} ch · ${p.rate / 1000} kHz`
            : 'none',
        ],
        [
          'Dynamic range',
          hdrText,
          p.hdr || (p.depth && p.depth > 8) ? 'hot' : '',
        ],
      ])
      specs.append(
        h('dt', null, 'Bake to'),
        h(
          'dd',
          { dataset: { out: '1' } },
          `${o.w}×${o.h}${o.scaled ? '' : ' (as shot)'}`,
        ),
      )
    }

    /* ---------------------------------------------------- load a clip */
    async function loadClip(file) {
      if (st.busy) {
        LN.toast('A bake is running. Cancel it first.', { kind: 'warn' })
        return
      }
      clearError()
      warnBox.replaceChildren()
      result.hidden = true
      result.replaceChildren()
      bakeBtn.disabled = true
      st.file = file
      st.probe = null
      if (st.input) {
        try {
          st.input.dispose()
        } catch (_e) {
          /* already gone */
        }
        st.input = null
      }
      clipName.textContent = `${file.name} · ${LN.fmt.bytes(file.size)} · reading…`
      if (!LN.media.hasWebCodecs()) {
        checkSupport()
        clipName.textContent = file.name
        return
      }
      let MB
      try {
        MB = await LN.lib.mediabunny()
      } catch (_e) {
        clipName.textContent = file.name
        showError(
          'The bake engine didn’t load',
          'The video engine (Mediabunny) downloads the first time you bake, and this copy can’t reach it. Open Lunar Night OS from claude.ai with a connection, or use the CapCut slider recipe below.',
        )
        return
      }
      try {
        const input = new MB.Input({
          source: new MB.BlobSource(file),
          formats: MB.ALL_FORMATS,
        })
        st.input = input
        const fmt = await input.getFormat()
        const vt = await input.getPrimaryVideoTrack()
        if (!vt)
          throw Object.assign(new Error('That file has no video track.'), {
            user: true,
          })
        const at = await input.getPrimaryAudioTrack()
        const [vcodec, vstring, w, h2, cw, ch, rotation, cs, duration] =
          await Promise.all([
            vt.getCodec(),
            vt.getCodecParameterString().catch(() => null),
            vt.getDisplayWidth(),
            vt.getDisplayHeight(),
            vt.getCodedWidth(),
            vt.getCodedHeight(),
            vt.getRotation(),
            vt.getColorSpace().catch(() => ({})),
            input.computeDuration(),
          ])
        let fps = null
        try {
          const stats = await vt.computePacketStats(240)
          fps = stats.averagePacketRate || null
          if (fps) {
            const common = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120]
            const near = common.find(c => Math.abs(c - fps) < 0.15)
            if (near) fps = near
          }
        } catch (_e) {
          fps = null
        }
        let hdrFlag = false
        try {
          hdrFlag = await vt.hasHighDynamicRange()
        } catch (_e) {
          hdrFlag = false
        }
        const transfer = cs && cs.transfer ? cs.transfer : ''
        const depth = bitDepth(vstring)
        const p = {
          container: fmt ? fmt.name : 'unknown',
          vcodec,
          vstring,
          w,
          h: h2,
          coded:
            cw !== (rotation % 180 ? h2 : w) || ch !== (rotation % 180 ? w : h2)
              ? `${cw}×${ch}`
              : '',
          rotation,
          fps,
          duration,
          frames: Math.max(1, Math.round(duration * (fps || 30))),
          transfer,
          hdr: hdrFlag || transfer === 'hlg' || transfer === 'pq',
          depth,
          acodec: at ? await at.getCodec() : null,
          channels: at ? await at.getNumberOfChannels() : 0,
          rate: at ? await at.getSampleRate() : 0,
          track: vt,
        }
        st.probe = p
        renderSpecs()
        clipName.textContent = `${file.name} · ${LN.fmt.bytes(file.size)}`
        if (p.hdr || (p.depth && p.depth > 8))
          warnBox.replaceChildren(hdrCallout(p))
        if (!(await vt.canDecode())) {
          showError(
            `This browser can’t decode ${codecName(vcodec)}`,
            vcodec === 'hevc'
              ? 'The clip is HEVC (H.265). Chrome on most Pixels decodes it with the phone’s hardware, but this browser can’t. Record the clips you plan to bake in H.264, or use the CapCut slider recipe below.'
              : `The clip uses ${codecName(vcodec)}, which this browser can’t decode. Record in H.264 for the bake, or use the CapCut slider recipe below.`,
          )
          return
        }
        await firstFrame(MB, vt)
        bakeBtn.disabled = false
        readyNote.textContent = `Ready: ${LN.fmt.num(duration, 1)} s, about ${p.frames} frames.`
      } catch (e) {
        console.warn('[bake] probe failed', e)
        clipName.textContent = file.name
        showError(
          'That clip won’t open',
          e && e.user
            ? e.message
            : 'The file isn’t a video this browser can read (MP4, MOV and WebM work). Try a clip straight from the camera roll, or use the CapCut slider recipe below.',
        )
      }
    }

    /** Decode the first frame into the "before" canvas (rotation respected). */
    async function firstFrame(MB, vt) {
      const sink = new MB.VideoSampleSink(vt)
      const t0 = await vt.getFirstTimestamp()
      const sample = await sink.getSample(t0)
      if (!sample) return
      try {
        const long = Math.max(sample.displayWidth, sample.displayHeight)
        const s = Math.min(1, 960 / long)
        before.width = even(sample.displayWidth * s)
        before.height = even(sample.displayHeight * s)
        const ctx = before.getContext('2d')
        sample.drawWithFit(ctx, { fit: 'fill' })
      } finally {
        sample.close()
      }
      srcCanvas = before
      setStageAspect(before.width, before.height)
      slate.replaceChildren(
        h('span', null, 'FRAME 0001'),
        h('span', null, `${st.probe.w}×${st.probe.h}`),
        h(
          'span',
          null,
          st.probe.fps
            ? `${LN.fmt.num(st.probe.fps, st.probe.fps % 1 ? 2 : 0)} fps`
            : 'VFR',
        ),
      )
      renderPreview()
    }

    /* ---------------------------------------------------- bake */
    function lockUi(on) {
      st.busy = on
      bakeBtn.disabled = on || !st.probe
      for (const b of lookBtns) b.disabled = on
      inten.input.disabled = on
      for (const s of [sizeSeg, qualSeg, codecSeg])
        for (const b of s.el.querySelectorAll('button')) b.disabled = on
      if (!on && hevcBtn) hevcBtn.disabled = !st.hevcOk
      const pk = pick.querySelector('label')
      if (pk) pk.setAttribute('aria-disabled', String(on))
      prog.hidden = !on
      readyNote.hidden = on
    }
    function setProgress(frac, frames, total, t0) {
      const pct = Math.round(LN.math.clamp(frac, 0, 1) * 100)
      bar.firstChild.style.width = `${pct}%`
      bar.setAttribute('aria-valuenow', String(pct))
      const el = (performance.now() - t0) / 1000
      const eta = frac > 0.02 ? (el / frac) * (1 - frac) : Number.NaN
      progText.replaceChildren(
        h(
          'span',
          null,
          h('b', null, String(frames).padStart(4, '0')),
          ` / ${total} frames`,
        ),
        h('span', null, h('b', null, `${pct}%`)),
        h('span', null, 'ETA ', h('b', null, mmss(eta))),
      )
    }

    async function runBake() {
      if (st.busy || !st.probe || !st.file) return
      clearError()
      let MB
      try {
        MB = await LN.lib.mediabunny()
      } catch (_e) {
        showError(
          'The bake engine didn’t load',
          'The video engine (Mediabunny) can’t be reached from this copy. Open Lunar Night OS from claude.ai with a connection, or use the CapCut slider recipe below.',
        )
        return
      }
      const p = st.probe
      const look = lookOf(st.look)
      const params =
        look.kind === 'engine' ? paramsFor(look.id, st.gradeParams) : null
      const lut = tableFor(look, params)
      const k = st.intensity / 100
      const o = outSize(p.w, p.h, st.size)
      const codec = st.codec === 'hevc' && st.hevcOk ? 'hevc' : 'avc'
      result.hidden = true
      lockUi(true)
      const t0 = performance.now()
      let frames = 0
      let mode = 'i420'
      let renderer = null
      let stageCanvas = null
      setProgress(0, 0, p.frames, t0)
      // Fresh input per bake: Conversion consumes it.
      const input = new MB.Input({
        source: new MB.BlobSource(st.file),
        formats: MB.ALL_FORMATS,
      })
      const output = new MB.Output({
        format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }),
        target: new MB.BufferTarget(),
      })
      const getRenderer = () => {
        if (!renderer) {
          const c =
            typeof OffscreenCanvas === 'function'
              ? new OffscreenCanvas(2, 2)
              : document.createElement('canvas')
          renderer = createRenderer(c)
          renderer.setLut(lut.table, lut.size)
          renderer.setIntensity(k)
        }
        return renderer
      }
      const process = sample => {
        const r = getRenderer()
        const w = sample.displayWidth
        const hh = sample.displayHeight
        let src = null
        let frame = null
        if (sample.rotation || sample.flip) {
          // Mediabunny bakes rotation before process; this is a guard for odd files.
          if (!stageCanvas) stageCanvas = new OffscreenCanvas(w, hh)
          stageCanvas.width = w
          stageCanvas.height = hh
          sample.drawWithFit(stageCanvas.getContext('2d'), { fit: 'fill' })
          src = stageCanvas
        } else {
          frame = sample.toVideoFrame()
          src = frame
        }
        try {
          frames++
          if (mode === 'i420') {
            try {
              const out = r.drawI420(src, w, hh)
              return new VideoFrame(out.data, {
                format: 'I420',
                codedWidth: w,
                codedHeight: hh,
                timestamp: sample.microsecondTimestamp,
                duration: sample.microsecondDuration || undefined,
                layout: out.layout,
                colorSpace: BT709_LIMITED,
              })
            } catch (e) {
              console.warn('[bake] I420 path failed, using RGB frames', e)
              mode = 'rgb'
            }
          }
          r.drawRGB(src, w, hh)
          return r.canvas
        } finally {
          if (frame) frame.close()
        }
      }
      const videoOpts = {
        codec,
        quality: new MB.Quality(st.quality),
        keyFrameInterval: 1,
        forceTranscode: true,
        allowTransformationMetadata: false,
        process,
      }
      if (o.scaled) {
        videoOpts.width = o.w
        videoOpts.height = o.h
        videoOpts.fit = 'fill'
      }
      let conv = null
      try {
        conv = await MB.Conversion.init({
          input,
          output,
          tracks: 'primary',
          showWarnings: false,
          video: videoOpts,
          audio: {},
        })
        st.conv = conv
        const vDrop = conv.discardedTracks.find(d => d.track.isVideoTrack())
        if (!conv.isValid || vDrop) {
          const why = vDrop
            ? DISCARD[vDrop.reason] || vDrop.reason
            : 'the file can’t be converted'
          throw Object.assign(new Error(`The video can’t be baked: ${why}.`), {
            user: true,
          })
        }
        const aDrop = conv.discardedTracks.find(d => d.track.isAudioTrack())
        conv.onProgress = frac =>
          setProgress(frac, frames, Math.max(frames, p.frames), t0)
        await conv.execute()
        const buffer = output.target.buffer
        const ms = performance.now() - t0
        const blob = new Blob([buffer], { type: 'video/mp4' })
        const base =
          String(st.file.name)
            .replace(/\.[^.]+$/, '')
            .replace(/[^A-Za-z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'clip'
        const filename = `${base}_${look.tag}.mp4`
        const info = await inspectOutput(MB, buffer)
        st.result = {
          blob,
          filename,
          info,
          frames,
          ms,
          look,
          intensity: st.intensity,
          mode,
          aDrop,
          codec,
        }
        window.__lnBakeLast = {
          blob,
          filename,
          frames,
          ms: Math.round(ms),
          mode,
          codec: info.codecString || codec,
          width: info.w,
          height: info.h,
          look: look.id,
          intensity: st.intensity,
        }
        setProgress(1, frames, frames, t0)
        showResult()
      } catch (e) {
        const cancelled =
          e &&
          (e.name === 'ConversionCanceledError' ||
            (MB.ConversionCanceledError &&
              e instanceof MB.ConversionCanceledError))
        if (cancelled) LN.toast('Bake cancelled.', { kind: 'warn' })
        else {
          console.warn('[bake] failed', e)
          showError(
            'The bake stopped',
            e && e.user
              ? `${e.message} Use the CapCut slider recipe below for this clip.`
              : `Something in the encoder failed (${e && e.message ? e.message : 'unknown error'}). Try 720p or the Lean preset, or use the CapCut slider recipe below.`,
          )
        }
      } finally {
        st.conv = null
        if (renderer) renderer.destroy()
        try {
          input.dispose()
        } catch (_e) {
          /* already gone */
        }
        lockUi(false)
      }
    }
    function cancelBake() {
      if (st.conv) st.conv.cancel()
    }

    async function inspectOutput(MB, buffer) {
      const out = {
        w: 0,
        h: 0,
        codecString: '',
        audio: null,
        duration: 0,
        colorSpace: null,
      }
      const inp = new MB.Input({
        source: new MB.BufferSource(buffer),
        formats: MB.ALL_FORMATS,
      })
      try {
        const vt = await inp.getPrimaryVideoTrack()
        const at = await inp.getPrimaryAudioTrack()
        out.duration = await inp.computeDuration()
        if (vt) {
          out.w = await vt.getDisplayWidth()
          out.h = await vt.getDisplayHeight()
          out.codecString = (await vt.getCodecParameterString()) || ''
          out.colorSpace = await vt.getColorSpace().catch(() => null)
          const sink = new MB.VideoSampleSink(vt)
          const s = await sink.getSample(await vt.getFirstTimestamp())
          if (s) {
            try {
              const c = document.createElement('canvas')
              const long = Math.max(s.displayWidth, s.displayHeight)
              const sc = Math.min(1, 480 / long)
              c.width = even(s.displayWidth * sc)
              c.height = even(s.displayHeight * sc)
              s.drawWithFit(c.getContext('2d'), { fit: 'fill' })
              out.still = c
            } finally {
              s.close()
            }
          }
        }
        if (at)
          out.audio = `${codecName(await at.getCodec())} · ${await at.getNumberOfChannels()} ch`
      } finally {
        inp.dispose()
      }
      return out
    }

    function showResult() {
      const r = st.result
      const i = r.info
      const cs = i.colorSpace
      const csText =
        cs && cs.matrix
          ? `${String(cs.matrix).toUpperCase()} · ${cs.fullRange ? 'full' : 'limited'} range`
          : ''
      const thumbBefore = document.createElement('canvas')
      thumbBefore.width = before.width
      thumbBefore.height = before.height
      thumbBefore.getContext('2d').drawImage(before, 0, 0)
      const fig = (canvas, cap) =>
        h(
          'figure',
          { class: 'bake-fig' },
          canvas || h('div', { class: 'bake-nofig' }, 'No frame'),
          h('figcaption', null, cap),
        )
      const saveBtn = ui.btn(
        'Save MP4',
        async () => {
          saveBtn.disabled = true
          const res = await LN.save({
            filename: r.filename,
            data: r.blob,
            mime: 'video/mp4',
          })
          saveBtn.disabled = false
          if (res === 'saved') savedLine.hidden = false
        },
        { id: 'bake-save' },
      )
      const savedLine = h(
        'p',
        { class: 'bake-fine', hidden: true },
        'Saved. It lands in Downloads; CapCut finds it under Import › Videos.',
      )
      result.replaceChildren(
        h(
          'div',
          { class: 'bake-resulthead' },
          h('div', { class: 'ln-eyebrow' }, 'On the pass'),
          h('h3', { class: 'bake-filename' }, r.filename),
        ),
        h(
          'div',
          { class: 'bake-resultgrid' },
          h(
            'div',
            { class: 'bake-figs' },
            fig(thumbBefore, 'Frame 1 · as shot'),
            fig(i.still, `Frame 1 · baked ${r.look.name} ${r.intensity}%`),
          ),
          h(
            'div',
            { class: 'ln-stack' },
            ui.kv([
              ['File', `${LN.fmt.bytes(r.blob.size)} · MP4`],
              [
                'Video',
                `${codecName(r.codec)}${i.codecString ? ` · ${i.codecString}` : ''}`,
              ],
              ['Frame', `${i.w}×${i.h}${csText ? ` · ${csText}` : ''}`],
              ['Length', `${LN.fmt.num(i.duration, 2)} s · ${r.frames} frames`],
              [
                'Audio',
                i.audio
                  ? `${i.audio} · copied untouched`
                  : r.aDrop
                    ? `dropped: ${DISCARD[r.aDrop.reason] || r.aDrop.reason}`
                    : 'none in the source',
              ],
              [
                'Render',
                `${LN.fmt.num(r.ms / 1000, 1)} s · ${LN.fmt.num(r.frames / Math.max(0.001, r.ms / 1000), 1)} fps`,
              ],
            ]),
            h('div', { class: 'ln-row' }, saveBtn),
            savedLine,
            h(
              'div',
              { class: 'bake-next' },
              h('span', { class: 'bake-fine' }, 'In CapCut'),
              ui.path('New project', 'Videos', r.filename),
              h(
                'p',
                { class: 'bake-fine' },
                'Leave Filters off: the look is already in the pixels. Finish with Glow 20–30 and Grain 15–25 from Effects, as the runbook says.',
              ),
            ),
          ),
        ),
      )
      result.hidden = false
      LN.toast(`Baked ${r.filename}. Tap Save MP4.`)
    }

    LN.bus.on('route', id => {
      if (id !== 'grade' && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    })
  }

  /* ------------------------------------------------------------ static parts */
  function routesStrip() {
    const item = (letter, title, body) =>
      h(
        'li',
        null,
        h('b', null, letter),
        h('div', null, h('strong', null, title), h('span', null, body)),
      )
    return h(
      'div',
      { class: 'bake-routes' },
      h(
        'ol',
        null,
        item('A', 'LUT import', 'Only if your CapCut has it. Check first.'),
        item(
          'B',
          'Bake',
          'This tool, or Blackmagic Camera’s Record LUT to Clip.',
        ),
        item(
          'C',
          'Sliders',
          'The CapCut Adjust recipe, at the bottom of this panel.',
        ),
      ),
      ui.callout(
        'verify',
        h(
          'span',
          null,
          'Research says CapCut Mobile can’t import .cube files; the playbook says ',
          ui.path('Adjust', 'LUT', 'Import'),
          '. Sixty-second check: open a clip, tap ',
          ui.path('Edit', 'Adjust'),
          ' and look for a LUT tile. No tile means Route B or C.',
        ),
      ),
    )
  }

  function hdrCallout(p) {
    const what = p.hdr
      ? `${p.transfer ? p.transfer.toUpperCase() : 'HDR'} HDR${p.depth ? `, ${p.depth}-bit` : ''}`
      : `${p.depth}-bit`
    return ui.callout(
      'warn',
      h(
        'span',
        null,
        `This clip is ${what}. The looks are built for SDR Rec.709, so this bake may clip or shift the highlights. For LUT work, record with 10-bit HDR off: `,
        ui.path('Pixel Camera', 'Video', 'Settings', '10-bit HDR', 'Off'),
        '.',
      ),
      'HDR source',
    )
  }

  function recipeDetails() {
    const steps = [
      ['Exposure', '−15', 'or Brightness −15'],
      ['Contrast', '+25', ''],
      ['Shadows', '−40', 'unlit areas go black'],
      ['Highlights', '−10', ''],
      ['Saturation', '+15', 'coloured lights pop'],
      ['Temperature', '−30', 'toward blue'],
      ['Tint', '+15', '0 for the blue variant'],
      ['Fade', '0', 'never touch it'],
      ['Vignette', '+10', ''],
    ]
    return h(
      'details',
      { class: 'bake-recipe' },
      h(
        'summary',
        null,
        h('span', { class: 'ln-eyebrow' }, 'Route C · no bake'),
        h('span', { class: 'bake-sumtitle' }, 'The CapCut slider recipe'),
      ),
      h(
        'div',
        { class: 'bake-recipebody' },
        h(
          'p',
          { class: 'bake-note' },
          'Lunar Night v2, rebuilt with CapCut’s free Adjust sliders. For clips shot at 3200K and underexposed.',
        ),
        h('div', { class: 'ln-row' }, ui.path('Tap the clip', 'Adjust')),
        ui.table(
          ['Slider', 'Value', 'Note'],
          steps.map(([a, b, c]) => [a, h('span', { class: 'ln-num' }, b), c]),
          { label: 'CapCut Adjust values' },
        ),
        h(
          'p',
          { class: 'bake-note' },
          'HSL, if it isn’t a Pro badge: Blue hue +15 and sat +10; Green sat +10; Orange sat +10; Yellow sat −10. Then tap Apply to all.',
        ),
        h(
          'div',
          { class: 'ln-row' },
          ui.path('Effects', 'Video effects', 'Glow'),
          h('span', { class: 'bake-fine' }, '25, small size, whole video'),
        ),
        h(
          'div',
          { class: 'ln-row' },
          ui.path('Effects', 'Video effects', 'Grain'),
          h('span', { class: 'bake-fine' }, '20, whole video'),
        ),
        h(
          'p',
          { class: 'bake-note' },
          'Looks grey instead of black? Shadows −50 and Exposure −20.',
        ),
        h(
          'p',
          { class: 'bake-note' },
          'Dreamcore has no slider numbers in the playbook, only the moves: lift the black point in Curves, Red up in the highlights only, Shadows wheel toward lavender, Highlights wheel toward warm peach, and a warm halation overlay. VHS has no slider recipe; bake it here.',
        ),
      ),
    )
  }

  LN.bake = { mount }
})()
