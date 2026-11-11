#!/usr/bin/env node
/* Playwright QA for the built page (dist/lunar-night-os.html).
   node lunar-night-os/tools/check.mjs [--views rig,shots] [--widths 412,1280]
     [--shots] [--full] [--claude] [--wait 900] [--script my-test.mjs] [--file path]
   --shots   save screenshots to $LN_SCRATCH/shots/<view>-<width>.png
   --full    full-page screenshots instead of the first screen
   --claude  stub window.claude (downloads + sample) so capability code paths run;
             saves are recorded in window.__lnSaves, Claude calls in window.__lnAsks,
             and sample.json() returns window.__lnJsonStub (set it from --script)
   --script  ESM module exporting default async (page, {view, width, log, shot}) run
             after each view loads, for module-specific interaction tests.
   Exit code 1 when any console error, page error, failed module or horizontal
   overflow is found. */
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
let pw
try {
  pw = require('playwright')
} catch (_e) {
  pw = require('/opt/node22/lib/node_modules/playwright')
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRATCH =
  process.env.LN_SCRATCH ||
  '/tmp/claude-0/-home-user-claude-code/0b1f30e1-effb-5e9c-80a8-0d4607fcb614/scratchpad'
const VENDOR_MB = path.join(
  SCRATCH,
  'vendor/package/dist/bundles/mediabunny.min.mjs',
)
const VENDOR_THREE = path.join(SCRATCH, 'vendor/three/three.min.js')

const args = process.argv.slice(2)
const flag = n => args.includes(`--${n}`)
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : d
}
const file = path.resolve(
  opt('file', path.join(ROOT, 'dist/lunar-night-os.html')),
)
const widths = opt('widths', '412,1280').split(',').map(Number)
const wait = Number(opt('wait', '900'))
const shotDir = path.join(SCRATCH, 'shots')
if (flag('shots')) fs.mkdirSync(shotDir, { recursive: true })
const custom = opt('script')
  ? (await import(pathToFileURL(path.resolve(opt('script'))).href)).default
  : null

const STUB = () => {
  window.__lnSaves = []
  window.__lnAsks = []
  const sample = async (input, o = {}) => {
    window.__lnAsks.push({
      input: String(
        typeof input === 'string' ? input : JSON.stringify(input),
      ).slice(0, 4000),
      model: o.model,
      modelTier: o.modelTier,
      images: o.images ? 1 : 0,
    })
    const text = window.__lnTextStub || 'Stub answer from the test harness.'
    if (o.onText) o.onText({ text, delta: text })
    return {
      text,
      truncated: false,
      modelTierApplied: 'complex',
      modelApplied: o.model,
    }
  }
  sample.json = async (input, o = {}) => {
    window.__lnAsks.push({
      input: String(
        typeof input === 'string' ? input : JSON.stringify(input),
      ).slice(0, 4000),
      json: true,
      model: o.model,
      images: o.images ? 1 : 0,
    })
    return window.__lnJsonStub ?? {}
  }
  sample.limits = async () => ({
    maxPromptBytes: 262144,
    images: {
      maxCount: 4,
      maxInputBytes: 20000000,
      mediaTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    tools: { maxCount: 8 },
  })
  const downloads = Object.freeze({
    save: async ({ filename, data }) => {
      const size =
        typeof data === 'string'
          ? data.length
          : data && (data.size ?? data.byteLength ?? 0)
      window.__lnSaves.push({
        filename,
        size,
        kind:
          typeof data === 'string'
            ? 'string'
            : data instanceof Blob
              ? 'blob'
              : 'buffer',
      })
      return { status: 'saved' }
    },
  })
  window.claude = {
    use: async name =>
      name === 'downloads' ? downloads : name === 'sample' ? sample : null,
  }
}

const browser = await pw.chromium.launch()
const report = { file, views: {}, failedModules: [], ok: true }
let viewList = opt('views', '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

for (const width of widths) {
  const mobile = width < 600
  const ctx = await browser.newContext({
    viewport: { width, height: mobile ? 915 : 900 },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
  })
  await ctx.route('**/*', route => {
    const url = route.request().url()
    if (url.startsWith('https://fonts.googleapis.com'))
      return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    if (
      url.includes('cdn.jsdelivr.net/npm/mediabunny@') &&
      fs.existsSync(VENDOR_MB)
    )
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: fs.readFileSync(VENDOR_MB),
      })
    if (url.includes('three.js/r128/three.min.js'))
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: fs.existsSync(VENDOR_THREE)
          ? fs.readFileSync(VENDOR_THREE)
          : '/* three.js unavailable offline; CSS fallback */',
      })
    if (false)
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: fs.readFileSync(VENDOR_THREE),
      })
    if (/^(file|data|blob):/.test(url)) return route.continue()
    return route.abort()
  })
  if (flag('claude')) await ctx.addInitScript(STUB)
  const page = await ctx.newPage()
  const errors = []
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  const url = pathToFileURL(file).href
  if (!viewList.length) {
    await page.goto(url)
    await page.waitForTimeout(300)
    viewList = [
      'home',
      ...(await page.evaluate(() => (window.LN?.modules || []).map(m => m.id))),
    ]
  }
  for (const view of viewList) {
    errors.length = 0
    await page.goto('about:blank')
    await page.goto(`${url}#${view}`)
    await page.waitForTimeout(wait)
    const log = []
    const shot = async name => {
      if (!flag('shots')) return null
      const p = path.join(shotDir, `${view}-${width}-${name}.png`)
      await page.screenshot({ path: p })
      return p
    }
    if (custom) {
      try {
        await custom(page, { view, width, log: s => log.push(String(s)), shot })
      } catch (e) {
        errors.push(`script: ${e.message}`)
      }
    }
    const info = await page.evaluate(() => {
      const W = window.innerWidth
      const offenders = []
      const visible =
        document.querySelector('.ln-view:not([hidden])') || document.body
      const clipped = el => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p)
          if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true
        }
        return false
      }
      for (const el of visible.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        if (r.width && r.right > W + 0.5 && !clipped(el)) {
          offenders.push(
            `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : ''} right=${Math.round(r.right)} "${(el.textContent || '').trim().slice(0, 40)}"`,
          )
          if (offenders.length >= 8) break
        }
      }
      return {
        overflow: document.documentElement.scrollWidth > W + 1,
        scrollWidth: document.documentElement.scrollWidth,
        width: W,
        offenders,
        failed: window.LN?.failed || [],
        title: document.title,
        textLen: (visible.innerText || '').length,
        saves: window.__lnSaves || null,
        asks: window.__lnAsks || null,
      }
    })
    let screenshot = null
    if (flag('shots')) {
      screenshot = path.join(shotDir, `${view}-${width}.png`)
      await page.screenshot({ path: screenshot, fullPage: flag('full') })
    }
    const key = `${view}@${width}`
    report.views[key] = {
      errors: errors.slice(),
      overflow: info.overflow
        ? `${info.scrollWidth}px > ${info.width}px`
        : false,
      offenders: info.offenders,
      textLen: info.textLen,
      saves: info.saves,
      asks: info.asks,
      log,
      screenshot,
    }
    for (const f of info.failed)
      if (!report.failedModules.includes(f)) report.failedModules.push(f)
    if (errors.length || info.overflow) report.ok = false
  }
  await ctx.close()
}
await browser.close()
if (report.failedModules.length) report.ok = false
if (flag('shots'))
  fs.writeFileSync(
    path.join(shotDir, 'report.json'),
    JSON.stringify(report, null, 2),
  )
console.log(JSON.stringify(report, null, 2))
process.exit(report.ok ? 0 : 1)
