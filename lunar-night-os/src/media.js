/* Lunar Night OS — shared media helpers (owned by core).
   LN.media.renderCanvasVideo: frame-accurate canvas → MP4 with Mediabunny/WebCodecs,
   falling back to real-time MediaRecorder capture. LN.media.wav: PCM WAV encoder. */
;(() => {
  const LN = window.LN
  const media = {}
  LN.media = media

  const abortError = () => {
    const e = new Error('Render cancelled')
    e.name = 'AbortError'
    return e
  }

  media.hasWebCodecs = () =>
    typeof window.VideoEncoder === 'function' &&
    typeof window.VideoFrame === 'function'

  /** Best MediaRecorder mime type available, MP4 first. */
  media.recorderMime = () => {
    if (typeof window.MediaRecorder !== 'function') return null
    const list = [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    return list.find(m => MediaRecorder.isTypeSupported(m)) || null
  }

  async function viaMediabunny(o) {
    const MB = await LN.lib.mediabunny()
    const { width: W, height: H, fps } = o
    const canvas = o.canvas || document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = o.ctx || canvas.getContext('2d', { alpha: false })
    const prefer = o.preferWebm
      ? ['vp9', 'avc', 'vp8']
      : ['avc', 'hevc', 'vp9', 'vp8']
    const codec = await MB.getFirstEncodableVideoCodec(prefer, {
      width: W,
      height: H,
    })
    if (!codec)
      throw new Error('No video encoder is available in this browser.')
    const mp4 = codec === 'avc' || codec === 'hevc'
    const format = mp4
      ? new MB.Mp4OutputFormat({ fastStart: 'in-memory' })
      : new MB.WebMOutputFormat()
    const output = new MB.Output({ format, target: new MB.BufferTarget() })
    const quality =
      o.bitrate ||
      (typeof MB.Quality === 'function'
        ? new MB.Quality('high')
        : MB.QUALITY_HIGH)
    const source = new MB.CanvasSource(canvas, {
      codec,
      bitrate: quality,
      keyFrameInterval: 1,
    })
    output.addVideoTrack(source, { frameRate: fps })
    await output.start()
    const n = Math.max(1, Math.round(o.duration * fps))
    for (let i = 0; i < n; i++) {
      if (o.signal && o.signal.aborted) {
        try {
          await output.cancel()
        } catch (_e) {
          /* already closed */
        }
        throw abortError()
      }
      await o.draw(ctx, i / fps, i, n)
      await source.add(i / fps, 1 / fps)
      if (o.onProgress) o.onProgress(i + 1, n)
    }
    await output.finalize()
    const buffer = output.target.buffer
    const ext = mp4 ? 'mp4' : 'webm'
    return {
      blob: new Blob([buffer], { type: mp4 ? 'video/mp4' : 'video/webm' }),
      ext,
      codec,
      via: 'webcodecs',
      frames: n,
    }
  }

  async function viaRecorder(o) {
    const mime = media.recorderMime()
    if (!mime)
      throw new Error('This browser cannot record video from a canvas.')
    const { width: W, height: H, fps } = o
    const canvas = o.canvas || document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = o.ctx || canvas.getContext('2d', { alpha: false })
    await o.draw(ctx, 0, 0, 1)
    const stream = canvas.captureStream(fps)
    const rec = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: o.recorderBitrate || Math.round(W * H * fps * 0.2),
    })
    const chunks = []
    rec.ondataavailable = e => {
      if (e.data && e.data.size) chunks.push(e.data)
    }
    const done = new Promise((resolve, reject) => {
      rec.onstop = resolve
      rec.onerror = e => reject(e.error || new Error('Recording failed'))
    })
    const n = Math.max(1, Math.round(o.duration * fps))
    rec.start(250)
    const t0 = performance.now()
    let i = 0
    await new Promise((resolve, reject) => {
      const tick = async () => {
        if (o.signal && o.signal.aborted) {
          rec.stop()
          reject(abortError())
          return
        }
        const elapsed = (performance.now() - t0) / 1000
        const target = Math.min(n - 1, Math.floor(elapsed * fps))
        if (target >= i) {
          i = target + 1
          await o.draw(ctx, target / fps, target, n)
          if (o.onProgress) o.onProgress(i, n)
        }
        if (elapsed >= o.duration) resolve()
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    rec.stop()
    await done
    for (const t of stream.getTracks()) t.stop()
    const isMp4 = mime.startsWith('video/mp4')
    return {
      blob: new Blob(chunks, { type: isMp4 ? 'video/mp4' : 'video/webm' }),
      ext: isMp4 ? 'mp4' : 'webm',
      codec: mime,
      via: 'mediarecorder',
      frames: n,
    }
  }

  /**
   * Render a video from a draw callback.
   * opts: { width, height, fps, duration, draw(ctx, t, i, n), canvas?, bitrate?,
   *         preferWebm?, signal?, onProgress?(done, total), allowRealtime = true }
   * → Promise<{ blob, ext, codec, via: 'webcodecs' | 'mediarecorder', frames }>
   * Frame-accurate (WebCodecs) when possible; otherwise real-time capture, which can drop frames.
   */
  media.renderCanvasVideo = async opts => {
    const o = { fps: 30, duration: 5, allowRealtime: true, ...opts }
    if (media.hasWebCodecs()) {
      try {
        return await viaMediabunny(o)
      } catch (e) {
        if (e && e.name === 'AbortError') throw e
        console.warn(
          '[LN.media] WebCodecs path failed, trying real-time capture',
          e,
        )
        if (!o.allowRealtime) throw e
      }
    }
    return viaRecorder(o)
  }

  /** Encode Float32 channel arrays as a little-endian PCM WAV (16 or 24 bit). */
  media.wav = (channels, sampleRate, bitDepth = 24) => {
    const nCh = channels.length
    const len = channels[0].length
    const bps = bitDepth / 8
    const blockAlign = nCh * bps
    const dataSize = len * blockAlign
    const buf = new ArrayBuffer(44 + dataSize)
    const v = new DataView(buf)
    const str = (o, s) => {
      for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
    }
    str(0, 'RIFF')
    v.setUint32(4, 36 + dataSize, true)
    str(8, 'WAVE')
    str(12, 'fmt ')
    v.setUint32(16, 16, true)
    v.setUint16(20, 1, true)
    v.setUint16(22, nCh, true)
    v.setUint32(24, sampleRate, true)
    v.setUint32(28, sampleRate * blockAlign, true)
    v.setUint16(32, blockAlign, true)
    v.setUint16(34, bitDepth, true)
    str(36, 'data')
    v.setUint32(40, dataSize, true)
    let o = 44
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < nCh; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i] || 0))
        if (bitDepth === 16) {
          v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
          o += 2
        } else {
          const n = s < 0 ? Math.round(s * 0x800000) : Math.round(s * 0x7fffff)
          v.setUint8(o, n & 0xff)
          v.setUint8(o + 1, (n >> 8) & 0xff)
          v.setUint8(o + 2, (n >> 16) & 0xff)
          o += 3
        }
      }
    }
    return new Uint8Array(buf)
  }

  /** Decode the audio track of a video/audio File into an AudioBuffer (uses the browser's decoder). */
  media.decodeAudio = async (file, sampleRate = 48000) => {
    const buf = await file.arrayBuffer()
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext
    const ctx = new Ctx(1, 1, sampleRate)
    return ctx.decodeAudioData(buf)
  }
})()
