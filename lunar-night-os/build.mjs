#!/usr/bin/env node
/* Lunar Night OS build: assembles src/ + manual/ into
     dist/lunar-night-os.html  full standalone document (offline copy, local tests)
     dist/artifact.html        page fragment for publishing as a claude.ai Artifact
   Usage: node lunar-night-os/build.mjs [--out dir] [--release]   (--release also copies the
   standalone file to lunar-night-os/lunar-night-os.html for the repo) */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(ROOT, 'src')
const outIdx = process.argv.indexOf('--out')
const DIST =
  outIdx > 0 && process.argv[outIdx + 1]
    ? path.resolve(process.argv[outIdx + 1])
    : path.join(ROOT, 'dist')
const release = process.argv.includes('--release')

function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, data)
  fs.renameSync(tmp, file)
}

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=TikTok+Sans:opsz,wght@12..36,300..900&family=Google+Sans+Code:wght@400..700&family=Instrument+Serif:ital@0;1&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=JetBrains+Mono:wght@400;500;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Playfair+Display:ital,wght@0,600;1,600&family=Space+Mono:wght@400;700&family=Courier+Prime:wght@400;700&family=Oswald:wght@400;500;600&family=Antonio:wght@400;600&family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&family=Source+Sans+3:wght@500;600&family=Bebas+Neue&family=Lora:wght@500&family=Montserrat:wght@500;600&family=Anton&family=Work+Sans:wght@500&family=DM+Serif+Display&family=DM+Sans:wght@500&family=Fraunces:wght@600&family=Inter+Tight:wght@500&family=Space+Grotesk:wght@600&family=IBM+Plex+Mono:wght@500&family=Cinzel:wght@600&family=Raleway:wght@500&family=Merriweather:wght@400&family=Unbounded:wght@600&display=swap'

const DESCRIPTION =
  'Phone-only production OS for a culinary documentary: Pixel 10 Pro XL rig, shot bible, CapCut Mobile edit, real .cube LUTs, titles, Fable 5.1 assets and hook psychology.'

/* ------------------------------------------------------------ markdown → html */
const esc = s =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function inline(src) {
  // Protect code spans first.
  const codes = []
  let s = src.replace(/`([^`]+)`/g, (_m, c) => {
    codes.push(c)
    return `\uE000${codes.length - 1}\uE000`
  })
  s = esc(s)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>')
  s = s.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>')
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  )
  s = s.replace(/\uE000(\d+)\uE000/g, (_m, i) => {
    const c = codes[Number(i)]
    if (c.includes('›')) {
      const parts = c
        .split('›')
        .map(p => p.trim())
        .filter(Boolean)
      return `<span class="ln-path" aria-label="${esc(parts.join(', then '))}">${parts
        .map(
          (p, k) =>
            `${k ? '<i aria-hidden="true">›</i>' : ''}<span>${esc(p)}</span>`,
        )
        .join('')}</span>`
    }
    return `<code>${esc(c)}</code>`
  })
  return s
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

const CALLOUT = {
  TIP: 'tip',
  WARN: 'warn',
  WARNING: 'warn',
  VERIFY: 'verify',
  RULE: 'rule',
  OK: 'ok',
  NOTE: 'verify',
}
const CALLOUT_TITLE = {
  tip: 'Tip',
  warn: 'Watch out',
  verify: 'Verify on your device',
  rule: 'Rule',
  ok: 'Good to go',
}

export function mdToHtml(md, idPrefix = 'm') {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out = []
  const headings = []
  let i = 0
  const isBlank = l => /^\s*$/.test(l)
  const listRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
  while (i < lines.length) {
    const line = lines[i]
    if (isBlank(line)) {
      i++
      continue
    }
    // fenced code
    const fence = line.match(/^```\s*([\w-]*)\s*$/)
    if (fence) {
      const buf = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i]))
        buf.push(lines[i++])
      i++
      out.push(
        `<div class="ln-copyblock"><header><span>${esc(fence[1] || 'text')}</span></header><pre>${esc(buf.join('\n'))}</pre></div>`,
      )
      continue
    }
    // heading
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const text = h[2].trim()
      const id = `${idPrefix}-${slugify(text)}`
      headings.push({ level, text: text.replace(/[`*_]/g, ''), id })
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`)
      i++
      continue
    }
    // hr
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push('<hr class="ln-rule">')
      i++
      continue
    }
    // blockquote / callout
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i]))
        buf.push(lines[i++].replace(/^>\s?/, ''))
      const m = buf[0] && buf[0].match(/^\[!(\w+)\]\s*(.*)$/)
      if (m && CALLOUT[m[1].toUpperCase()]) {
        const kind = CALLOUT[m[1].toUpperCase()]
        const title = m[2] || CALLOUT_TITLE[kind]
        const body = mdToHtml(buf.slice(1).join('\n'), idPrefix).html
        out.push(
          `<div class="ln-callout ${kind}"><b>${inline(title)}</b><div>${body}</div></div>`,
        )
      } else {
        out.push(
          `<blockquote>${mdToHtml(buf.join('\n'), idPrefix).html}</blockquote>`,
        )
      }
      continue
    }
    // table
    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])
    ) {
      const row = l =>
        l
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map(c => c.trim())
      const head = row(line)
      i += 2
      const body = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]))
        body.push(row(lines[i++]))
      out.push(
        `<div class="ln-scroll" tabindex="0"><table class="ln-table"><thead><tr>${head
          .map(c => `<th scope="col">${inline(c)}</th>`)
          .join('')}</tr></thead><tbody>${body
          .map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      )
      continue
    }
    // list (supports nesting by indentation)
    if (listRe.test(line)) {
      const items = []
      while (
        i < lines.length &&
        (listRe.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))
      ) {
        const m = lines[i].match(listRe)
        if (m)
          items.push({
            indent: m[1].length,
            ordered: /\d/.test(m[2]),
            text: m[3],
          })
        else items[items.length - 1].text += ` ${lines[i].trim()}`
        i++
      }
      const render = (arr, start) => {
        const base = arr[start].indent
        const ordered = arr[start].ordered
        let html = ordered ? '<ol>' : '<ul>'
        let k = start
        while (k < arr.length && arr[k].indent >= base) {
          if (arr[k].indent > base) {
            const [sub, next] = render(arr, k)
            html = html.replace(/<\/li>$/, `${sub}</li>`)
            k = next
            continue
          }
          html += `<li>${inline(arr[k].text)}</li>`
          k++
        }
        html += ordered ? '</ol>' : '</ul>'
        return [html, k]
      }
      out.push(render(items, 0)[0])
      continue
    }
    // paragraph
    const buf = [line]
    i++
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !/^(#{1,4}\s|```|>|\s*\||(-{3,}|\*{3,})\s*$)/.test(lines[i]) &&
      !listRe.test(lines[i])
    )
      buf.push(lines[i++])
    out.push(`<p>${inline(buf.join(' '))}</p>`)
  }
  return { html: out.join('\n'), headings }
}

/* ------------------------------------------------------------ build */
function read(p) {
  return fs.readFileSync(p, 'utf8')
}

function loadManual() {
  const dir = path.join(ROOT, 'manual')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(f => /^\d{2}-.*\.md$/.test(f))
    .sort()
    .map(f => {
      const md = read(path.join(dir, f))
      const num = Number(f.slice(0, 2))
      const id = `ch${String(num).padStart(2, '0')}`
      const titleMatch = md.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1].trim() : f
      const { html, headings } = mdToHtml(md, id)
      const words = md.split(/\s+/).filter(Boolean).length
      return {
        id,
        num,
        file: f,
        title,
        html,
        md,
        words,
        headings: headings.filter(x => x.level <= 3),
      }
    })
}

function safeJson(x) {
  const LS = String.fromCharCode(0x2028)
  const PS = String.fromCharCode(0x2029)
  return JSON.stringify(x)
    .replace(/</g, '\\u003c')
    .split(LS)
    .join('\\u2028')
    .split(PS)
    .join('\\u2029')
}

function wrapScript(name, src) {
  return `;(() => {\ntry {\n${src}\n} catch (e) {\n  console.error('[LN] failed to load ${name}', e)\n  ;(window.LN = window.LN || {}).failed = window.LN.failed || []\n  window.LN.failed.push('${name}')\n}\n})()\n`
}

export function build() {
  const manifest = JSON.parse(read(path.join(SRC, 'manifest.json')))
  const warnings = []
  const css = manifest.css
    .map(f => {
      const p = path.join(SRC, f)
      if (!fs.existsSync(p)) {
        warnings.push(`missing css ${f}`)
        return ''
      }
      return `/* ${f} */\n${read(p)}`
    })
    .join('\n')
  const scripts = []
  const errors = []
  for (const f of manifest.js) {
    const p = path.join(SRC, f)
    if (!fs.existsSync(p)) {
      warnings.push(`missing js ${f}`)
      continue
    }
    const src = read(p)
    try {
      new vm.Script(src, { filename: f })
    } catch (e) {
      errors.push(`${f}: ${e.message}`)
      continue
    }
    scripts.push({ name: f, src: f === 'boot.js' ? src : wrapScript(f, src) })
  }
  const manual = loadManual()
  // Data chunk goes right after core.js
  const dataChunk = `window.LN = window.LN || {}; LN.data = LN.data || {}; LN.data.manual = ${safeJson(manual)};`
  const coreIdx = scripts.findIndex(s => s.name === 'core.js')
  scripts.splice(coreIdx + 1, 0, { name: 'data/manual.json', src: dataChunk })

  const escScript = s =>
    s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')
  const scriptTags = scripts
    .map(
      s =>
        `<script class="ln-js" data-src="${s.name}">\n${escScript(s.src)}\n</script>`,
    )
    .join('\n')
  const head = `<title>Kubrick</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="${esc(DESCRIPTION)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link id="ln-fonts" rel="stylesheet" href="${FONTS_HREF}">
<style id="ln-style">
${css}
</style>`
  const body = `<div id="ln-app"></div>\n${scriptTags}`
  const fragment = `${head}\n${body}\n`
  const full = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${head}
</head>
<body>
${body}
</body>
</html>
`
  fs.mkdirSync(DIST, { recursive: true })
  writeAtomic(path.join(DIST, 'artifact.html'), fragment)
  writeAtomic(path.join(DIST, 'lunar-night-os.html'), full)
  if (release) writeAtomic(path.join(ROOT, 'lunar-night-os.html'), full)
  return {
    bytes: Buffer.byteLength(full),
    scripts: scripts.length,
    manualChapters: manual.length,
    manualWords: manual.reduce((s, c) => s + c.words, 0),
    warnings,
    errors,
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const r = build()
  for (const w of r.warnings) console.warn(`warn: ${w}`)
  for (const e of r.errors) console.error(`SYNTAX ERROR (file skipped): ${e}`)
  console.log(
    `built ${path.relative(process.cwd(), DIST) || '.'}/lunar-night-os.html  ${(r.bytes / 1024).toFixed(0)} KB · ${r.scripts} scripts · manual ${r.manualChapters} ch / ${r.manualWords} words`,
  )
  if (r.errors.length) process.exit(1)
}
