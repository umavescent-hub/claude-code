/* Lunar Night OS: modules/aura.js (08 Aura): hook psychology and money.
   Every psychology claim carries its evidence-ledger id and grade exactly as
   the Marketing Psychology Kit ledger states it (rows checked 2026-10-03, via
   research/psychology.md). Anything outside the ledger is tagged "not in the
   evidence ledger, craft heuristic". Canon rules (playbook, runbook, house
   style) are tagged as the chef's own rules, not as psychology. Money figures
   are the playbook's creator-reported planning ranges, never a promise. */
;(() => {
  const LN = window.LN
  const { h, ui } = LN
  const svg = LN.s

  /* ================================================================ evidence */
  // Grades exactly as the ledger states them (psychology.md §1.2).
  const LEDGER = {
    L02: {
      name: 'Anchoring',
      grade: 'B for price displays in marketing',
      full: 'A for estimates and willingness-to-pay tasks; B for price displays in marketing',
      g: 'b',
    },
    L03: {
      name: 'Gain/loss framing',
      grade: 'B for marketing messages',
      full: 'A for risky-choice problems; B for marketing messages',
      g: 'b',
    },
    L04: { name: 'Loss aversion', grade: 'B', full: 'B', g: 'b' },
    L05: { name: 'Descriptive social norms', grade: 'B', full: 'B', g: 'b' },
    L07: { name: 'Zero price', grade: 'B', full: 'B', g: 'b' },
    L08: { name: 'Goal gradient', grade: 'B', full: 'B', g: 'b' },
    L16: { name: 'Scarcity', grade: 'C', full: 'C', g: 'c' },
    L17: {
      name: 'Mere exposure',
      grade: 'C for marketing outcomes',
      full: 'C for marketing outcomes',
      g: 'c',
    },
    L18: {
      name: 'Ad wear-out and recovery',
      grade: 'C (single paper)',
      full: 'C (single paper)',
      g: 'c',
    },
    L19: {
      name: 'Peak-end rule',
      grade: 'C for marketing outcomes',
      full: 'C for marketing outcomes',
      g: 'c',
    },
    L21: {
      name: 'Nudges at scale',
      grade: 'C as a general claim',
      full: 'C as a general claim',
      g: 'c',
    },
    L22: {
      name: 'Zeigarnik effect',
      grade: 'D',
      full: 'D: do not use',
      g: 'd',
    },
    L23: { name: 'Ovsiankina effect', grade: 'B', full: 'B', g: 'b' },
    L25: { name: 'Money priming', grade: 'D', full: 'D: do not use', g: 'd' },
    L26: {
      name: 'Replication context',
      grade: 'context',
      full: 'context',
      g: 'x',
    },
    L34: {
      name: 'Folklore',
      grade: 'D',
      full: 'D: never cite',
      g: 'd',
    },
  }
  const ev = id => {
    const r = LEDGER[id]
    return h(
      'span',
      {
        class: `au-ev g-${r.g}`,
        title: `${r.name}. Grade: ${r.full}`,
      },
      h('b', null, id),
      ` ${r.grade}`,
    )
  }
  const CRAFT_TXT = 'not in the evidence ledger, craft heuristic'
  const craft = () =>
    h(
      'span',
      {
        class: 'au-ev g-x',
        title:
          'No ledger row. Graded C at most: contested; test before relying on it.',
      },
      CRAFT_TXT,
    )
  const canon = label => h('span', { class: 'au-ev g-canon' }, label)
  const reg = label => h('span', { class: 'au-ev g-reg' }, label)
  const tags = (...kids) => h('span', { class: 'au-tags' }, ...kids)

  const REGISTER_LINE =
    'Not legal advice. Rules last read on 2026-10-03; re-check any rule read more than 6 months before today.'

  /* ================================================================ formats */
  const FORMATS = {
    review: {
      label: 'Marketplace Review',
      short: 'Review',
      hookStyle:
        'Hook card: white box, black Inter Bold, lowercase, 8 words max, below the top safe band, about 2 s, no animation.',
      hookShot:
        'The shot under it stops a stranger: the plate landing, the cut into the meat, the first bite reaction. It goes at 0:00.',
      cover: 'Estrella Early, 4 words max.',
      coverDefault: 'marketplace stew verdict',
    },
    lunar: {
      label: 'Lunar Night Reel',
      short: 'Lunar',
      hookStyle:
        'Lime #D6DB05 in a condensed sans, lowercase, two short lines, no punctuation, centred in the upper third, small black shadow, no box, on screen for the first 3 s.',
      hookShot:
        'No voice, no SFX. The image is the hook: one coloured light on one plain building, lots of dark sky, dead still.',
      cover:
        'The most colourful frame (the green wall, the neon sign). Title 4 words max, same lime text.',
      coverDefault: 'cerrillos after dark',
    },
    doc: {
      label: 'Road to Three Stars',
      short: 'Doc',
      hookStyle:
        'Hook inside 0–3 s. Editorial serif with tight tracking plus an all-caps mono data line. Voice-first.',
      hookShot:
        'Open on the real stake or the real failure, not a logo or an intro.',
      cover: 'Keep the cover title to 4 words, as the house covers do.',
      coverDefault: 'attempt [n] service',
    },
    rnd: {
      label: 'R&D Lab',
      short: 'R&D',
      hookStyle:
        'Mono data card over the result or the failure, e.g. TEST [n] · ONE VARIABLE.',
      hookShot:
        'Macro on the result. Speed ramps on pours and knife work (never below 0.5x without a 60 fps source).',
      cover: 'Keep the cover title to 4 words, as the house covers do.',
      coverDefault: 'nixtamal test [n]',
    },
  }
  const FMT_IDS = Object.keys(FORMATS)

  /* ================================================================ mechanisms */
  const MECH = {
    specificity: {
      label: 'Specificity',
      tag: () => craft(),
      why: 'A concrete, checkable detail (a price, an attempt number, a place) instead of a vague promise. The kit scores concreteness with its proof-scoring tool (result, time, who: 0–3); that is a tool, not a graded effect.',
    },
    curiosity: {
      label: 'Curiosity gap (a real question)',
      tag: () => tags(craft(), ev('L23')),
      why: 'State the real question the video answers. Related: people tend to resume interrupted tasks they chose themselves (L23, B). Never justify it with "people remember unfinished things" (L22, D).',
    },
    novelty: {
      label: 'Visual novelty',
      tag: () => craft(),
      why: 'Lead with the most novel real image (fire, the cut, the plate landing) instead of a logo or intro. Test it; do not assume it. Never cite an attention-span number (L34, D).',
    },
    contrast: {
      label: 'Contrast',
      tag: () => craft(),
      why: 'Two real states side by side: before and after, the price and the plate, what you expected and what you got. When one side is a price, it is an anchor (L02).',
    },
    anchor: {
      label: 'Price first (anchor)',
      tag: () => ev('L02'),
      why: 'The anchor must be seen before the judgement. Grade A holds for estimates and willingness-to-pay tasks; for price displays in marketing it is B.',
    },
    social: {
      label: 'A real viewer comment',
      tag: () => ev('L05'),
      why: 'Supported when the norm is true, relevant and about people like the viewer. Replications are mixed.',
    },
    effort: {
      label: 'Effort shown',
      tag: () => craft(),
      why: 'Show the work: the attempt count, the hours, the failed batch. Keep real durations.',
    },
  }

  /* Templates: {dish} {num} {place}. Lunar hooks are two lines (\n). Each one
     names its mechanism and the fact that must be true for it to be honest. */
  const ANGLES = {
    review: {
      price: {
        label: 'Price first',
        num: '[price]',
        money: true,
        list: [
          {
            t: '{num} {dish} off marketplace',
            m: 'anchor',
            f: 'The price is the real, dated price you paid, shown before the verdict.',
          },
          {
            t: 'is this {num} {dish} worth it',
            m: 'curiosity',
            f: 'The video answers it: the verdict says worth it or not.',
          },
          {
            t: '{num} for a home cooks {dish}',
            m: 'specificity',
            f: 'A home cook really made it, and that is what you paid.',
          },
        ],
      },
      question: {
        label: 'A real question',
        num: '[n]',
        list: [
          {
            t: 'can a home cook beat my {dish}',
            m: 'curiosity',
            f: 'You cook this dish yourself, and the verdict compares them honestly.',
          },
          {
            t: 'does this {dish} taste like home',
            m: 'curiosity',
            f: 'The verdict answers it in this video.',
          },
          {
            t: 'would i serve this {dish}',
            m: 'curiosity',
            f: 'The verdict says yes or no, plainly.',
          },
        ],
      },
      bite: {
        label: 'First bite',
        num: '[n]',
        list: [
          {
            t: 'first bite of a strangers {dish}',
            m: 'novelty',
            f: 'It really is your first bite, on camera, unstaged.',
          },
          {
            t: 'marketplace {dish} first bite',
            m: 'novelty',
            f: 'The reaction in the hook is the real one from this bite.',
          },
          {
            t: 'one bite then the verdict',
            m: 'contrast',
            f: 'The verdict comes from that bite, not a later retake.',
          },
        ],
      },
      place: {
        label: 'Where it came from',
        num: '[n]',
        list: [
          {
            t: '{dish} from a kitchen in {place}',
            m: 'specificity',
            f: 'The cook is in that town, and you have their OK to say so.',
          },
          {
            t: '{place} home cook {dish}',
            m: 'specificity',
            f: 'Place and cook are accurate; no name or face without permission.',
          },
          {
            t: 'marketplace {dish} {place} edition',
            m: 'specificity',
            f: 'It is a real listing from that place.',
          },
        ],
      },
    },
    lunar: {
      light: {
        label: 'The light',
        num: '[n]',
        list: [
          {
            t: 'one green light\n{place}',
            m: 'novelty',
            f: 'The light is real, in camera, at that place.',
          },
          {
            t: '{place}\nafter dark',
            m: 'specificity',
            f: 'Shot there, 30–75 min after sunset.',
          },
          {
            t: 'the sign stays on\nall night',
            m: 'contrast',
            f: 'You saw it on through the night; it is not a guess.',
          },
        ],
      },
      dish: {
        label: 'The plate',
        num: '[n]',
        list: [
          {
            t: '{dish}\nunder one light',
            m: 'novelty',
            f: 'The dish is lit by the practical in frame, not added later.',
          },
          {
            t: 'last plate\nlights still on',
            m: 'contrast',
            f: 'It was the last plate of a real service.',
          },
          {
            t: 'after close\n{dish}',
            m: 'specificity',
            f: 'Shot after a real close.',
          },
        ],
      },
      quiet: {
        label: 'The quiet',
        num: '[n]',
        list: [
          {
            t: 'nobody out here\nbut the light',
            m: 'contrast',
            f: 'No people in frame (runbook: no people).',
          },
          {
            t: 'the kitchen\nafter close',
            m: 'specificity',
            f: 'It is your kitchen, after a real close.',
          },
          {
            t: 'waiting on\none car',
            m: 'curiosity',
            f: 'The car pass comes in this reel (third or last shot).',
          },
        ],
      },
    },
    doc: {
      attempt: {
        label: 'Attempt count',
        num: '[n]',
        list: [
          {
            t: '{dish} attempt {num}',
            m: 'specificity',
            f: 'The count comes from your real R&D log.',
          },
          {
            t: 'attempt {num} at the tasting menu',
            m: 'effort',
            f: 'Every earlier attempt happened and is logged.',
          },
          {
            t: 'it failed again attempt {num}',
            m: 'contrast',
            f: 'It really failed, and the failure in frame is that attempt.',
          },
        ],
      },
      stake: {
        label: 'The stake',
        num: '[n]',
        list: [
          {
            t: 'will the {dish} hold at service',
            m: 'curiosity',
            f: 'The episode shows service and answers it.',
          },
          {
            t: 'can {dish} carry a tasting menu',
            m: 'curiosity',
            f: 'The answer is in this episode, not a part that does not exist.',
          },
          {
            t: '{num} days to the tasting menu',
            m: 'specificity',
            f: 'The date is real; correct it on screen if it moves.',
          },
        ],
      },
      roots: {
        label: 'Where it comes from',
        num: '[n]',
        list: [
          {
            t: '{dish} the way {place} taught me',
            m: 'specificity',
            f: 'True, the teachers are credited by name, and sharing it is permitted.',
          },
          {
            t: 'day {num} on the road to three stars',
            m: 'effort',
            f: 'The day count is continuous and real. The star is the goal, not a claim.',
          },
          {
            t: 'the {dish} i grew up on',
            m: 'specificity',
            f: 'It is the dish you grew up on, told in your own words.',
          },
        ],
      },
    },
    rnd: {
      test: {
        label: 'Test number',
        num: '[n]',
        list: [
          {
            t: '{dish} test {num}',
            m: 'specificity',
            f: 'The test number comes from your log.',
          },
          {
            t: 'test {num} changed one thing',
            m: 'contrast',
            f: 'Only one variable changed, and you say which.',
          },
          {
            t: 'same {dish} two temperatures',
            m: 'contrast',
            f: 'Both batches are real and shot the same way.',
          },
        ],
      },
      hours: {
        label: 'Hours of work',
        num: '[hours]',
        list: [
          {
            t: '{num} hours for one {dish}',
            m: 'effort',
            f: 'The hours are real; time-lapses keep real durations.',
          },
          {
            t: '{num} hours of prep in 30 seconds',
            m: 'effort',
            f: 'Both numbers are true for this footage.',
          },
          {
            t: 'what {num} hours does to {dish}',
            m: 'curiosity',
            f: 'The video shows the result after those hours.',
          },
        ],
      },
      why: {
        label: 'A real why',
        num: '[n]',
        list: [
          {
            t: 'why did the {dish} split',
            m: 'curiosity',
            f: 'The video answers it, or says plainly that you do not know yet.',
          },
          {
            t: 'what salt does to {dish}',
            m: 'curiosity',
            f: 'The test shows it.',
          },
          {
            t: 'the {dish} mistake i keep making',
            m: 'specificity',
            f: 'It is a real, repeated mistake from your log.',
          },
        ],
      },
    },
  }

  /* ================================================================ honesty check */
  const RULES = [
    {
      re: /\b(only \d+ left|last chance|limited|ends? (tonight|today|soon)|today only|before (it'?s|its) gone|sold out|selling out|hurry|running out|while (it|they) lasts?|almost gone|disappears?|deadline|countdown|act now)\b/i,
      level: 'fail',
      label: 'Fake scarcity or urgency',
      why: 'A limit must be real, live and its reason visible (L16, C). Invented ones are DP-01 and DP-02 (High).',
    },
    {
      re: /\b(michelin[- ]?(star(red)?|approved|recommended)|inspectors?|award[- ]winning|as seen (on|in)|certified|official|world[- ]famous)\b/i,
      level: 'fail',
      label: 'Invented authority',
      why: 'Claiming approval a body did not give is banned in all cases (EU-1 Annex I point 4); rule R7. Michelin only as an aspiration or a documented fact.',
    },
    {
      re: /\b(was \$?\d|regular(ly)? \$?\d|\d+ ?% off|half price|originally \$?\d)/i,
      level: 'fail',
      label: '"Was" price',
      why: 'Invented reference prices are DP-05 (High). Show the real, dated price only.',
    },
    {
      re: /(\d+ ?%|studies show|science says|research shows|scientists|\bproven\b)/i,
      level: 'fail',
      label: 'Statistic or study without a source',
      why: 'No invented studies or statistics (R3, R7). A real number with its source, or no number.',
    },
    {
      re: /\b(you won'?t believe|can'?t believe|shock(ed|ing)?|insane|speechless|gagged|threw up|cry(ing)?|cried|screamed|lost my mind|jaw|mind[- ]?blown|life[- ]changing|best\b.{0,24}\bever|worst\b.{0,24}\bever)/i,
      level: 'check',
      label: 'Reaction or superlative',
      why: 'Only if the footage shows that real, unstaged reaction or verdict. Staged reactions presented as genuine are DP-04 (High).',
    },
    {
      re: /\b(authentic|sacred|ceremon\w*|ancient|secret recipe|tribal secret|ancestral secret|real native|native[- ]made|spirit animal)\b/i,
      level: 'check',
      label: 'Heritage as a lever',
      why: 'Heritage gets specifics and permission, never decoration or a sales lever. Name the person, place and practice, as the community confirms.',
    },
    {
      re: /\b(real allies|if you (really )?support|you owe|don'?t scroll|stop scrolling|ignore this)\b/i,
      level: 'check',
      label: 'Guilt or pressure',
      why: 'Guilt messages are DP-13; confirmshaming is DP-08. Invite, never guilt.',
    },
    {
      re: /\bfree\b/i,
      level: 'check',
      label: '"Free"',
      why: 'Only if nothing must be paid to get it (L07, B; DP-10).',
    },
    {
      re: /(\$\$|\bcash\b|\bpaid me\b|\bi made \$|\bget paid\b|\bearn(ed|ing|ings)?\b)/i,
      level: 'check',
      label: 'Money talk',
      why: 'Never flash or promise earnings. Money priming did not replicate (L25, D).',
    },
  ]
  const LEVEL_ORDER = { clean: 0, style: 1, fill: 2, check: 3, fail: 4 }
  const LEVEL_TXT = {
    clean: 'Clean',
    style: 'Style',
    fill: 'Fill in',
    check: 'Check',
    fail: 'Fails',
  }
  const wordCount = t =>
    String(t)
      .replace(/\[[^\]]*\]/g, 'x')
      .split(/\s+/)
      .filter(Boolean).length
  const numsIn = t =>
    (
      String(t)
        .replace(/\[[^\]]*\]/g, ' ')
        .match(/\d[\d,.]*/g) || []
    ).map(n => n.replace(/[,.]+$/, '').replace(/,/g, ''))

  /** Check a hook or claim against the honesty rules and house style.
   *  o: {fmt, declared: 'real numbers text', maxWords} → {level, items[]} */
  function honesty(text, o = {}) {
    const t = String(text || '')
    const items = []
    for (const r of RULES) {
      if (r.re.test(t))
        items.push({ level: r.level, label: r.label, why: r.why })
    }
    const declared = new Set(numsIn(o.declared || ''))
    const loose = numsIn(t).filter(n => !declared.has(n))
    if (loose.length)
      items.push({
        level: 'check',
        label: `Number not from your log: ${Array.from(new Set(loose)).join(', ')}`,
        why: 'Every number must be true for this footage and match what you have already published (R3). Enter it as a real number, or cut it.',
      })
    if (/\[[^\]]+\]/.test(t))
      items.push({
        level: 'fill',
        label: 'Fill the brackets',
        why: 'Put the real figure from your log in place of the [bracket] before posting. Never guess it.',
      })
    const max = o.maxWords || 8
    const wc = wordCount(t)
    if (wc > max)
      items.push({
        level: 'style',
        label: `${wc} words: house style is ${max} max`,
        why: 'Cut to the one detail that must be true.',
      })
    if (/[A-Z]/.test(t.replace(/\[[^\]]*\]/g, '')))
      items.push({
        level: 'style',
        label: 'Capitals',
        why: 'House style is lowercase.',
      })
    if (o.fmt === 'lunar' && /[.,!?;:"“”]/.test(t))
      items.push({
        level: 'style',
        label: 'Punctuation',
        why: 'Lunar Night text has no punctuation.',
      })
    if (/\p{Extended_Pictographic}/u.test(t))
      items.push({
        level: 'style',
        label: 'Emoji',
        why: 'No emoji in hooks or captions.',
      })
    let level = 'clean'
    for (const it of items)
      if (LEVEL_ORDER[it.level] > LEVEL_ORDER[level]) level = it.level
    return { level, items }
  }

  function checkList(res) {
    if (!res.items.length)
      return h(
        'p',
        { class: 'au-ok' },
        'Clean against the honesty rules. Still true only if the fact under it is true.',
      )
    return h(
      'ul',
      { class: 'au-checks' },
      res.items.map(it =>
        h(
          'li',
          { class: `lv-${it.level}` },
          h('b', null, `${LEVEL_TXT[it.level]} · ${it.label}`),
          h('span', null, it.why),
        ),
      ),
    )
  }
  const levelChip = lv =>
    h('span', { class: `au-lv lv-${lv}` }, LEVEL_TXT[lv] || lv)

  /* ================================================================ helpers */
  const clean = s =>
    String(s || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s$\-[\]]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  const money = (n, d) =>
    `$${Number(n).toLocaleString('en-US', {
      minimumFractionDigits: d ?? (n < 10 ? 2 : 0),
      maximumFractionDigits: d ?? (n < 10 ? 2 : 0),
    })}`
  const int = n => Math.round(n).toLocaleString('en-US')
  const mmss = t => {
    const m = Math.floor(t / 60)
    const sec = t - m * 60
    const ss =
      Math.abs(sec - Math.round(sec)) < 0.01
        ? String(Math.round(sec)).padStart(2, '0')
        : sec.toFixed(1).padStart(4, '0')
    return `${m}:${ss}`
  }
  const block = (title, ...kids) =>
    h('div', { class: 'ln-card au-card' }, h('h3', null, title), ...kids)
  const note = (...kids) => h('p', { class: 'au-note' }, ...kids)
  const prose = (...kids) => h('p', { class: 'au-prose' }, ...kids)

  /* ================================================================ 1. Hook Lab */
  function hookLab(el) {
    const saved = LN.store.get('aura.hook', {}) || {}
    const st = {
      fmt: FMT_IDS.includes(saved.fmt) ? saved.fmt : 'review',
      dish: typeof saved.dish === 'string' ? saved.dish : 'green chile stew',
      place: typeof saved.place === 'string' ? saved.place : 'española',
      num: typeof saved.num === 'string' ? saved.num : '',
      angle: saved.angle,
    }
    if (!ANGLES[st.fmt][st.angle]) st.angle = Object.keys(ANGLES[st.fmt])[0]
    const persist = () => LN.store.set('aura.hook', st)

    const fillNum = angle => {
      const raw = st.num.trim()
      if (!raw) return angle.num
      if (angle.money && /^\d/.test(raw)) return `$${raw}`
      return raw
    }
    function generate() {
      const angle = ANGLES[st.fmt][st.angle]
      const dish = clean(st.dish) || 'the plate'
      const place = clean(st.place) || '[place]'
      return angle.list.map(tp => ({
        text: tp.t
          .replace(/\{dish\}/g, dish)
          .replace(/\{place\}/g, place)
          .replace(/\{num\}/g, fillNum(angle)),
        mech: tp.m,
        fact: tp.f,
        src: 'template',
      }))
    }

    /* ---- controls */
    const angleSel = ui.select({
      label: 'Angle',
      options: [],
      onChange: v => {
        st.angle = v
        update()
      },
    })
    const fillAngles = () => {
      angleSel.input.replaceChildren(
        ...Object.entries(ANGLES[st.fmt]).map(([id, a]) =>
          h('option', { value: id, selected: id === st.angle }, a.label),
        ),
      )
      angleSel.set(st.angle)
    }
    const fmtSeg = ui.seg({
      label: 'Format',
      value: st.fmt,
      options: FMT_IDS.map(id => ({ value: id, label: FORMATS[id].short })),
      onChange: v => {
        st.fmt = v
        if (!ANGLES[v][st.angle]) st.angle = Object.keys(ANGLES[v])[0]
        fillAngles()
        update()
      },
    })
    const dishF = ui.field({
      label: 'Dish',
      value: st.dish,
      placeholder: 'green chile stew',
      onInput: v => {
        st.dish = v
        update()
      },
    })
    const placeF = ui.field({
      label: 'Place',
      value: st.place,
      placeholder: 'española',
      onInput: v => {
        st.place = v
        update()
      },
    })
    const numF = ui.field({
      label: 'Real number from your log (optional)',
      value: st.num,
      placeholder: 'price, attempt or hours, e.g. 12',
      onInput: v => {
        st.num = v
        update()
      },
    })
    fillAngles()

    const styleNote = h('div', { class: 'au-style' })
    const outTpl = h('div', { class: 'au-hooks' })
    const aiOut = h('div', { class: 'au-hooks' })
    const aiStatus = h('p', { class: 'au-note', role: 'status' })
    const keptBox = h('div', { class: 'ln-stack' })
    const patternsBox = h('div', { class: 'ln-grid au-patterns' })
    const promptBlock = ui.copyBlock('', {
      title: 'Prompt for a Fable 5.1 chat',
      button: 'Copy prompt',
    })

    /* ---- kept hooks (persisted) */
    const getKept = () => {
      const k = LN.store.get('aura.kept', [])
      return Array.isArray(k) ? k : []
    }
    function keep(hk) {
      const k = getKept()
      if (k.some(x => x.text === hk.text)) {
        LN.toast('Already on the pass')
        return
      }
      k.unshift({
        text: hk.text,
        fmt: st.fmt,
        mech: hk.mech,
        fact: hk.fact,
        date: new Date().toISOString().slice(0, 10),
      })
      LN.store.set('aura.kept', k.slice(0, 40))
      renderKept()
      LN.toast('Hook kept')
    }
    const keptText = () =>
      getKept()
        .map(
          (k, i) =>
            `${i + 1}. ${k.text.replace(/\n/g, ' / ')}\n   format: ${(FORMATS[k.fmt] || {}).label || k.fmt} · mechanism: ${(MECH[k.mech] || {}).label || k.mech || 'n/a'}\n   must be true: ${k.fact || 'n/a'}`,
        )
        .join('\n\n')
    function renderKept() {
      const k = getKept()
      if (!k.length) {
        keptBox.replaceChildren(
          ui.empty(
            'Nothing kept yet. Tap Keep on a hook to put it on the pass for tonight’s edit.',
          ),
        )
        return
      }
      keptBox.replaceChildren(
        h(
          'ol',
          { class: 'au-kept' },
          k.map((x, i) =>
            h(
              'li',
              null,
              h(
                'div',
                { class: 'au-kept-t' },
                h('b', null, x.text.replace(/\n/g, ' / ')),
                h(
                  'span',
                  { class: 'au-note' },
                  `${(FORMATS[x.fmt] || {}).short || ''} · must be true: ${x.fact || 'n/a'}`,
                ),
              ),
              ui.btn(
                'Remove',
                () => {
                  const all = getKept()
                  all.splice(i, 1)
                  LN.store.set('aura.kept', all)
                  renderKept()
                },
                { kind: 'quiet', small: true, aria: `Remove ${x.text}` },
              ),
            ),
          ),
        ),
        h(
          'div',
          { class: 'ln-row' },
          ui.btn(
            'Copy all',
            () => LN.copy(keptText(), { label: 'Hooks copied' }),
            {
              kind: 'ghost',
              small: true,
            },
          ),
          ui.btn(
            'Save .txt',
            () =>
              LN.save({
                filename: 'aura-hooks.txt',
                data: `KEPT HOOKS · Lunar Night OS · Aura\n\n${keptText()}\n`,
                mime: 'text/plain',
              }),
            { kind: 'quiet', small: true },
          ),
        ),
      )
    }

    /* ---- hook card */
    function hookCard(hk, fmt) {
      const res = honesty(hk.text, { fmt, declared: st.num })
      const mech = MECH[hk.mech]
      const lines = hk.text.split('\n')
      return h(
        'article',
        { class: `au-hook lv-${res.level}` },
        h(
          'div',
          { class: `au-frame f-${fmt}`, 'aria-hidden': 'true' },
          h(
            'div',
            { class: 'au-frame-txt' },
            fmt === 'rnd'
              ? h('span', null, hk.text.toUpperCase())
              : lines.map(l => h('span', null, l)),
          ),
        ),
        h(
          'div',
          { class: 'au-hook-body' },
          h(
            'div',
            { class: 'au-hook-top' },
            h('b', { class: 'au-hook-text' }, hk.text.replace(/\n/g, ' / ')),
            levelChip(res.level),
          ),
          h(
            'div',
            { class: 'au-meta' },
            h('span', { class: 'au-wc' }, `${wordCount(hk.text)} words`),
            mech ? h('span', null, mech.label) : null,
            mech ? mech.tag() : craft(),
            hk.src === 'fable' && hk.fableMech && !mech
              ? h(
                  'span',
                  { class: 'au-note' },
                  `Fable’s label: ${hk.fableMech}`,
                )
              : null,
          ),
          h(
            'p',
            { class: 'au-fact' },
            h('span', null, 'Must be true · '),
            hk.fact || 'Name the fact in the footage that makes this true.',
          ),
          hk.shot
            ? h('p', { class: 'au-note' }, `Shot at 0:00 · ${hk.shot}`)
            : null,
          checkList(res),
          h(
            'div',
            { class: 'ln-row' },
            ui.btn(
              'Copy',
              () =>
                LN.copy(hk.text.replace(/\n/g, ' '), { label: 'Hook copied' }),
              { kind: 'ghost', small: true },
            ),
            ui.btn('Keep', () => keep(hk), { kind: 'quiet', small: true }),
          ),
        ),
      )
    }

    /* ---- Fable 5.1 */
    function prompt() {
      const f = FORMATS[st.fmt]
      const drafts = generate()
        .map(x => `- ${x.text.replace(/\n/g, ' / ')}`)
        .join('\n')
      const mechList = Object.entries(MECH)
        .map(([id, m]) => {
          const grade =
            id === 'anchor'
              ? 'L02, B for price displays in marketing'
              : id === 'social'
                ? 'L05, B'
                : `${CRAFT_TXT} (C at most)`
          return `- "${id}" (${m.label}): ${grade}`
        })
        .join('\n')
      return `TASK: write 5 more hooks for the first 1.5-3 s of a vertical video by Chef Rainbird (@Popé). A swipe happens in about 1.5 s.
FORMAT: ${f.label}. Hook house style: ${f.hookStyle} ${f.hookShot}
DISH: ${clean(st.dish) || '(none given)'}
PLACE: ${clean(st.place) || '(none given)'}
ANGLE: ${ANGLES[st.fmt][st.angle].label}
REAL NUMBERS THE CHEF CONFIRMED: ${st.num.trim() || 'none. Use a [bracketed placeholder] for any number.'}
DRAFTS FROM TEMPLATES (do not repeat them):
${drafts}

RULES (all must hold):
- 8 words max, all lowercase, no emoji, no hashtags.${st.fmt === 'lunar' ? ' Two short lines separated by \\n, no punctuation.' : ''}
- Never invent a number. Use only the real numbers above; otherwise write a [bracketed placeholder].
- No fake scarcity or urgency (limited, last chance, only n left, ends tonight).
- No fake reactions or superlatives the footage may not show (you won't believe, best ever, shocked).
- No invented authority (michelin-starred, inspector, award-winning, as seen on). Michelin only as an aspiration.
- No "was" prices, no "free" unless nothing must be paid, no money or earnings talk.
- Heritage only with specifics the chef gave, never as decoration or a sales lever.
- Each hook names the one fact that must be true in the footage for it to be honest.

MECHANISMS (use one of these ids exactly; the grade is from an evidence ledger, do not upgrade it):
${mechList}

Return JSON only, exactly this shape:
{"hooks":[{"text":"...","mechanism":"one id from the list","mustBeTrue":"the fact that must be true","shot":"the shot under the hook at 0:00"}]}`
    }
    function normalise(res) {
      const arr = Array.isArray(res)
        ? res
        : res && Array.isArray(res.hooks)
          ? res.hooks
          : []
      return arr
        .filter(x => x && typeof x.text === 'string' && x.text.trim())
        .slice(0, 8)
        .map(x => {
          const id = String(x.mechanism || '')
            .toLowerCase()
            .trim()
          const known = MECH[id] ? id : null
          return {
            text: String(x.text).toLowerCase().trim().slice(0, 140),
            mech: known,
            fableMech: known ? '' : String(x.mechanism || '').slice(0, 60),
            fact: String(x.mustBeTrue || '').slice(0, 240),
            shot: String(x.shot || '').slice(0, 200),
            src: 'fable',
          }
        })
    }
    const sharpenBtn = ui.btn('Sharpen with Fable 5.1', async () => {
      sharpenBtn.disabled = true
      aiStatus.textContent = 'Asking Fable 5.1 for 5 more…'
      const fmt = st.fmt
      try {
        const res = await LN.ai.ask(prompt(), { json: true })
        const list = normalise(res)
        if (!list.length) {
          const err = { code: 'invalid_json' }
          throw err
        }
        aiOut.replaceChildren(...list.map(hk => hookCard(hk, fmt)))
        aiStatus.textContent = `${list.length} hooks from Fable 5.1, each run through the same honesty check. The evidence tag comes from this page, not from Fable.`
      } catch (e) {
        aiStatus.textContent = LN.ai.explain(e)
      } finally {
        sharpenBtn.disabled = false
      }
    })
    const copyPromptBtn = ui.btn(
      'Copy prompt',
      () => LN.copy(LN.ai.compose(prompt()), { label: 'Prompt copied' }),
      { kind: 'ghost' },
    )
    LN.ai.available().then(ok => {
      if (!ok) {
        sharpenBtn.disabled = true
        aiStatus.textContent =
          'Fable 5.1 is reachable only when this page is open in claude.ai. Copy the prompt into a Fable 5.1 chat instead.'
      }
    })

    /* ---- patterns per format */
    const PATTERNS = [
      {
        m: 'specificity',
        fits: ['review', 'doc', 'rnd', 'lunar'],
        ex: '[real price] [dish] off marketplace · attempt [n] · [place] after dark',
        fact: 'The number or place is true for this footage and matches every number you have already published. Keep a log.',
      },
      {
        m: 'curiosity',
        fits: ['review', 'doc', 'rnd'],
        ex: 'is this [real price] [dish] worth it · will the [dish] hold at service',
        fact: 'The video answers the question, in this video, not in a part that does not exist.',
      },
      {
        m: 'novelty',
        fits: ['review', 'lunar', 'rnd', 'doc'],
        ex: 'No words needed: the plate landing, the knife going in, one green light',
        fact: 'The shot is from this episode. Not a composite, not an AI image of a dish you did not make.',
      },
      {
        m: 'contrast',
        fits: ['review', 'rnd', 'doc', 'lunar'],
        ex: 'test [n] changed one thing · one bite then the verdict',
        fact: 'Both sides are real and shot the same way.',
      },
      {
        m: 'anchor',
        fits: ['review'],
        ex: '[real price] on the hook card, before the first bite',
        fact: 'The price is real and dated, and shown the same way in every review, before the verdict.',
      },
      {
        m: 'social',
        fits: ['review', 'rnd'],
        ex: 'A real comment on screen (handle hidden) asking the question this video answers',
        fact: 'The comment is real; hide the handle or get permission.',
      },
    ]
    function renderPatterns() {
      patternsBox.replaceChildren(
        ...PATTERNS.filter(p => p.fits.includes(st.fmt)).map(p => {
          const m = MECH[p.m]
          return h(
            'div',
            { class: 'ln-card au-pattern' },
            h('h3', null, m.label),
            tags(m.tag()),
            prose(m.why),
            h('p', { class: 'au-ex' }, p.ex),
            h(
              'p',
              { class: 'au-fact' },
              h('span', null, 'Must be true · '),
              p.fact,
            ),
          )
        }),
      )
    }

    function update() {
      persist()
      const f = FORMATS[st.fmt]
      styleNote.replaceChildren(
        h('b', null, f.label),
        h('span', null, ` · ${f.hookStyle} `),
        h('span', { class: 'ln-faint' }, f.hookShot),
      )
      outTpl.replaceChildren(...generate().map(hk => hookCard(hk, st.fmt)))
      promptBlock.setText(LN.ai.compose(prompt()))
      renderPatterns()
    }

    /* ---- own hook checker */
    const ownRes = h('div')
    const ownF = ui.field({
      label: 'Check your own hook',
      placeholder: 'type a hook, a caption or a cover line',
      onInput: v => {
        ownRes.replaceChildren(
          v.trim()
            ? (() => {
                const r = honesty(v, { fmt: st.fmt, declared: st.num })
                return h(
                  'div',
                  { class: 'ln-stack' },
                  h(
                    'div',
                    { class: 'au-meta' },
                    levelChip(r.level),
                    h('span', { class: 'au-wc' }, `${wordCount(v)} words`),
                  ),
                  checkList(r),
                )
              })()
            : ui.empty('Type a line to check it.'),
        )
      },
    })
    ownRes.append(ui.empty('Type a line to check it.'))

    /* ---- hook window strip */
    const windowStrip = h(
      'div',
      { class: 'au-window', role: 'img', 'aria-label': 'The first 3 seconds' },
      h('div', { class: 'au-window-bar' }, [
        h('span', { class: 'w-swipe', style: { width: '50%' } }, 'swipe call'),
        h('span', { class: 'w-hold', style: { width: '50%' } }, 'hook holds'),
      ]),
      h(
        'div',
        { class: 'au-window-ticks' },
        h('span', { style: { left: '0%' } }, '0 s'),
        h('span', { style: { left: '50%' } }, '1.5 s'),
        h('span', { style: { left: '66.6%' } }, '2 s'),
        h('span', { style: { left: '100%' } }, '3 s'),
      ),
    )

    el.append(
      ui.section(
        {
          eyebrow: 'First 1.5–3 s',
          title: 'Hook Lab',
          lede: 'A swipe happens in about 1.5 s. The hook is the shot at 0:00 plus at most 8 words. Every hook here names its mechanism, the evidence grade of that mechanism, and the fact that must be true in your footage.',
        },
        tags(
          canon('Playbook · Edit order step 2'),
          canon('House style · hook card'),
        ),
        windowStrip,
        note(
          'Review hook card: about 2 s. Lunar Night text: the first 3 s. Doc and R&D: the hook lives inside 0–3 s.',
        ),
      ),
      ui.section(
        { eyebrow: 'Generator', title: 'Three hooks from templates' },
        h(
          'div',
          { class: 'ln-split' },
          h(
            'div',
            { class: 'ln-card ln-stack' },
            fmtSeg.el,
            styleNote,
            dishF.el,
            angleSel.el,
            placeF.el,
            numF.el,
            note(
              'No number goes on screen unless you typed it here from your log. Without one, the hook keeps a [bracket] for you to fill.',
            ),
          ),
          outTpl,
        ),
      ),
      ui.section(
        {
          eyebrow: 'Fable 5.1',
          title: 'Sharpen: five more',
          lede: 'Fable writes five more under the same rules, each with its mechanism and the fact that must be true. This page re-checks every one and attaches the evidence tag itself.',
        },
        h('div', { class: 'ln-row' }, sharpenBtn, copyPromptBtn),
        aiStatus,
        aiOut,
        h(
          'details',
          { class: 'au-details' },
          h('summary', null, 'See the full prompt'),
          promptBlock,
        ),
      ),
      ui.section(
        { eyebrow: 'Honesty check', title: 'Run any line through it' },
        h(
          'div',
          { class: 'ln-split' },
          h('div', { class: 'ln-stack' }, ownF.el, ownRes),
          h(
            'div',
            { class: 'ln-stack' },
            ui.callout(
              'rule',
              'No fake scarcity. No invented numbers. No fake reactions. No invented authority. A line that fails gets its fact fixed or gets cut; there is no softer version that keeps the deception.',
              'The three hard lines',
            ),
          ),
        ),
      ),
      ui.section(
        {
          eyebrow: 'On the pass',
          title: 'Kept hooks',
          lede: 'Saved on this phone. Copy them into the edit plan or save a .txt.',
        },
        keptBox,
      ),
      ui.section(
        {
          eyebrow: 'Patterns',
          title: 'Hook patterns for this format',
          lede: 'None of these was measured on video hooks. Whatever the grade, each one is a hypothesis for your channel, answered only by your own test.',
        },
        patternsBox,
      ),
    )
    renderKept()
    update()
  }

  /* ================================================================ 2. Title & cover */
  const lum = hex => {
    const [r, g, b] = LN.color.hex2rgb(hex).map(v => LN.color.srgb2lin(v / 255))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a, b) => {
    const la = lum(a)
    const lb = lum(b)
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  }

  /** Colourfulness: spread and mean of the opponent channels rg and yb. */
  function colourfulness(data) {
    let n = 0
    let sRg = 0
    let sYb = 0
    let qRg = 0
    let qYb = 0
    for (let i = 0; i < data.length; i += 4) {
      const rg = data[i] - data[i + 1]
      const yb = 0.5 * (data[i] + data[i + 1]) - data[i + 2]
      sRg += rg
      sYb += yb
      qRg += rg * rg
      qYb += yb * yb
      n++
    }
    const mRg = sRg / n
    const mYb = sYb / n
    const vRg = Math.max(0, qRg / n - mRg * mRg)
    const vYb = Math.max(0, qYb / n - mYb * mYb)
    return Math.sqrt(vRg + vYb) + 0.3 * Math.sqrt(mRg * mRg + mYb * mYb)
  }

  /** The darkest and brightest typical colours inside the cover-title band. */
  function bandColours(ctx, w, hgt) {
    const x0 = Math.round(w * (65 / 1080))
    const x1 = Math.round(w * (920 / 1080))
    const y0 = Math.round(hgt * (420 / 1920))
    const y1 = Math.round(hgt * (760 / 1920))
    const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data
    const px = []
    for (let i = 0; i < d.length; i += 16) {
      const hex = LN.color.rgb2hex(d[i], d[i + 1], d[i + 2])
      px.push([lum(hex), hex])
    }
    px.sort((a, b) => a[0] - b[0])
    const at = q => px[Math.min(px.length - 1, Math.floor(q * px.length))][1]
    return { dark: at(0.1), bright: at(0.9) }
  }

  function once(target, evt) {
    return new Promise((res, rej) => {
      const ok = () => {
        target.removeEventListener('error', bad)
        res()
      }
      const bad = () => {
        target.removeEventListener(evt, ok)
        rej(new Error('This video could not be read here.'))
      }
      target.addEventListener(evt, ok, { once: true })
      target.addEventListener('error', bad, { once: true })
    })
  }

  async function scanVideo(file, onProgress) {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.src = url
    try {
      await once(v, 'loadeddata')
      const dur = v.duration
      if (!Number.isFinite(dur) || dur <= 0 || !v.videoWidth)
        throw new Error('This video has no readable frames here.')
      const n = Math.min(48, Math.max(8, Math.round(dur * 2)))
      const sw = 64
      const sh = Math.max(16, Math.round((sw * v.videoHeight) / v.videoWidth))
      const c = document.createElement('canvas')
      c.width = sw
      c.height = sh
      const ctx = c.getContext('2d', { willReadFrequently: true })
      const scores = []
      for (let i = 0; i < n; i++) {
        const t = Math.min(dur - 0.05, ((i + 0.5) / n) * dur)
        v.currentTime = t
        await once(v, 'seeked')
        ctx.drawImage(v, 0, 0, sw, sh)
        scores.push({
          t,
          score: colourfulness(ctx.getImageData(0, 0, sw, sh).data),
        })
        if (onProgress) onProgress(i + 1, n)
      }
      scores.sort((a, b) => b.score - a.score)
      // Top 3, at least 1 s apart.
      const top = []
      for (const s of scores) {
        if (top.every(x => Math.abs(x.t - s.t) >= 1)) top.push(s)
        if (top.length === 3) break
      }
      const scale = Math.min(1, 1080 / v.videoWidth)
      const fw = Math.round(v.videoWidth * scale)
      const fh = Math.round(v.videoHeight * scale)
      const big = document.createElement('canvas')
      big.width = fw
      big.height = fh
      const bctx = big.getContext('2d', { willReadFrequently: true })
      for (const f of top) {
        v.currentTime = f.t
        await once(v, 'seeked')
        bctx.drawImage(v, 0, 0, fw, fh)
        f.band = bandColours(bctx, fw, fh)
        f.blob = await new Promise(r => big.toBlob(r, 'image/png'))
        f.url = f.blob ? URL.createObjectURL(f.blob) : null
        f.w = fw
        f.h = fh
      }
      return { dur, n, top, all: scores }
    } finally {
      URL.revokeObjectURL(url)
      v.removeAttribute('src')
      v.load()
    }
  }

  function coverTab(el) {
    const saved = LN.store.get('aura.cover', {}) || {}
    const st = {
      fmt: FMT_IDS.includes(saved.fmt) ? saved.fmt : 'lunar',
      title:
        typeof saved.title === 'string'
          ? saved.title
          : FORMATS[saved.fmt || 'lunar'].coverDefault,
      fg: /^#[0-9a-f]{6}$/i.test(saved.fg || '') ? saved.fg : '#d6db05',
      bg: /^#[0-9a-f]{6}$/i.test(saved.bg || '') ? saved.bg : '#0b0a12',
      zones: saved.zones !== false,
    }
    let frame = null
    let frames = []
    const persist = () =>
      LN.store.set('aura.cover', {
        fmt: st.fmt,
        title: st.title,
        fg: st.fg,
        bg: st.bg,
        zones: st.zones,
      })

    /* ---- preview svg (1080×1920 coordinates) */
    const bgRect = svg('rect', {
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      class: 'au-cv-bg',
    })
    const bgImg = svg('image', {
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      preserveAspectRatio: 'xMidYMid slice',
    })
    const plate = svg(
      'g',
      { class: 'au-cv-plate' },
      svg('circle', { cx: 540, cy: 1180, r: 300 }),
      svg('circle', { cx: 540, cy: 1180, r: 190 }),
    )
    const titleG = svg('g')
    const zonesG = svg(
      'g',
      { class: 'au-cv-zones' },
      svg('rect', { x: 0, y: 0, width: 1080, height: 130, class: 'z-block' }),
      svg('rect', {
        x: 940,
        y: 130,
        width: 140,
        height: 1306,
        class: 'z-block',
      }),
      svg('rect', {
        x: 0,
        y: 1436,
        width: 1080,
        height: 484,
        class: 'z-block',
      }),
      svg('rect', {
        x: 65,
        y: 420,
        width: 855,
        height: 1080,
        class: 'z-title',
      }),
      svg('line', { x1: 0, y1: 240, x2: 1080, y2: 240, class: 'z-crop' }),
      svg('line', { x1: 0, y1: 1680, x2: 1080, y2: 1680, class: 'z-crop' }),
      svg('text', { x: 24, y: 88, class: 'z-lbl' }, 'top 130 px'),
      svg('text', { x: 24, y: 1530, class: 'z-lbl' }, 'bottom 484 px'),
      svg('text', { x: 90, y: 470, class: 'z-lbl' }, 'cover title box'),
      svg(
        'text',
        { x: 24, y: 228, class: 'z-lbl z-crop-lbl' },
        'IG 3:4 grid crop',
      ),
    )
    const preview = svg(
      'svg',
      {
        viewBox: '0 0 1080 1920',
        class: 'au-cv',
        role: 'img',
        'aria-label': 'Cover preview with safe zones',
      },
      bgRect,
      plate,
      bgImg,
      titleG,
      zonesG,
    )

    const titleF = ui.field({
      label: 'Cover title',
      value: st.title,
      placeholder: '4 words max',
      onInput: v => {
        st.title = v
        update()
      },
    })
    const titleCheck = h('div')
    const fmtSeg = ui.seg({
      label: 'Format',
      value: st.fmt,
      options: FMT_IDS.map(id => ({ value: id, label: FORMATS[id].short })),
      onChange: v => {
        st.fmt = v
        if (v === 'lunar') st.fg = '#d6db05'
        else if (st.fg.toLowerCase() === '#d6db05') st.fg = '#f2ede4'
        fgIn.value = st.fg
        update()
      },
    })
    const zonesT = ui.toggle({
      label: 'Show safe zones',
      checked: st.zones,
      onChange: v => {
        st.zones = v
        update()
      },
    })
    const fmtNote = h('p', { class: 'au-note' })

    /* ---- contrast */
    const fgIn = h('input', {
      type: 'color',
      class: 'au-color',
      value: st.fg,
      'aria-label': 'Text colour',
      onInput: e => {
        st.fg = e.target.value
        update()
      },
    })
    const bgIn = h('input', {
      type: 'color',
      class: 'au-color',
      value: st.bg,
      'aria-label': 'Background colour behind the text',
      onInput: e => {
        st.bg = e.target.value
        update()
      },
    })
    const ratioOut = h('div', { class: 'au-ratio' })
    const swatch = h('div', { class: 'au-swatch' }, 'cover title')
    const presets = [
      ['Lime on night sky', '#d6db05', '#0b0a12'],
      ['Off-white on a bright plate', '#f2ede4', '#e8d8b0'],
      ['Black in the white hook box', '#000000', '#ffffff'],
      ['Off-white on sear crimson', '#f2ede4', '#9e2a2b'],
    ]
    const presetRow = h(
      'div',
      { class: 'ln-row' },
      presets.map(([label, fg, bg]) =>
        ui.btn(
          label,
          () => {
            st.fg = fg
            st.bg = bg
            fgIn.value = fg
            bgIn.value = bg
            update()
          },
          { kind: 'quiet', small: true },
        ),
      ),
    )

    /* ---- most colourful frame */
    const scanStatus = h('p', { class: 'au-note', role: 'status' })
    const framesBox = h('div', { class: 'au-frames' })
    const saveFrameBtn = ui.btn(
      'Save cover frame (.png)',
      () => {
        if (!frame || !frame.blob) return
        LN.save({
          filename: `cover-frame-${frame.t.toFixed(1)}s.png`,
          data: frame.blob,
          mime: 'image/png',
        })
      },
      { kind: 'ghost', disabled: true },
    )
    function pickFrame(f) {
      frame = f
      saveFrameBtn.disabled = !f
      if (f && f.url) bgImg.setAttribute('href', f.url)
      else bgImg.removeAttribute('href')
      if (f && f.band) {
        const a = ratio(st.fg, f.band.dark)
        const b = ratio(st.fg, f.band.bright)
        st.bg = a < b ? f.band.dark : f.band.bright
        bgIn.value = st.bg
      }
      for (const b of LN.$$('button', framesBox))
        b.setAttribute('aria-pressed', String(b.dataset.t === String(f && f.t)))
      update()
    }
    const pick = ui.filePick({
      accept: 'video/*',
      label: 'Pick a reel from the camera roll',
      kind: 'ghost',
      onFile: async file => {
        scanStatus.textContent = 'Reading frames…'
        framesBox.replaceChildren()
        for (const f of frames) if (f.url) URL.revokeObjectURL(f.url)
        frames = []
        pickFrame(null)
        try {
          const r = await scanVideo(file, (i, n) => {
            scanStatus.textContent = `Scoring frame ${i} of ${n}…`
          })
          frames = r.top
          scanStatus.textContent = `Scored ${r.n} frames across ${r.dur.toFixed(1)} s. The most colourful three are below; the first is selected. The title colour check now uses the worst case inside the title box.`
          framesBox.replaceChildren(
            ...frames.map((f, i) =>
              h(
                'button',
                {
                  type: 'button',
                  class: 'au-fr',
                  dataset: { t: String(f.t) },
                  'aria-pressed': 'false',
                  'aria-label': `Frame at ${mmss(f.t)}, colourfulness ${f.score.toFixed(0)}`,
                  onClick: () => pickFrame(f),
                },
                f.url ? h('img', { src: f.url, alt: '' }) : null,
                h(
                  'span',
                  null,
                  `${i + 1} · ${mmss(f.t)} · ${f.score.toFixed(0)}`,
                ),
              ),
            ),
          )
          if (frames.length) pickFrame(frames[0])
        } catch (e) {
          scanStatus.textContent = `${e.message || e} Pick another clip, or choose the frame by eye in CapCut.`
        }
      },
    })

    function drawTitle() {
      const words = st.title.trim()
      const lunar = st.fmt === 'lunar'
      const txt = lunar ? words.toLowerCase() : words
      // Two lines max, split near the middle word.
      const w = txt.split(/\s+/).filter(Boolean)
      const cut = Math.ceil(w.length / 2)
      const lines =
        w.length > 2
          ? [w.slice(0, cut).join(' '), w.slice(cut).join(' ')]
          : [w.join(' ')]
      const longest = Math.max(1, ...lines.map(l => l.length))
      const size = Math.min(150, Math.floor(1500 / longest))
      const cls = `au-cv-title f-${st.fmt}`
      titleG.replaceChildren(
        ...lines.map((l, i) =>
          svg(
            'text',
            {
              x: 492,
              y: 640 + i * size * 1.05,
              class: cls,
              'font-size': size,
              fill: st.fg,
              'text-anchor': 'middle',
            },
            l,
          ),
        ),
      )
    }

    function update() {
      persist()
      const f = FORMATS[st.fmt]
      fmtNote.replaceChildren(h('b', null, `${f.label} cover · `), f.cover)
      const wc = wordCount(st.title)
      const r = honesty(st.title, { fmt: st.fmt, maxWords: 4 })
      const lunarCaps =
        st.fmt !== 'lunar' && r.items.some(i => i.label === 'Capitals')
      const res = lunarCaps
        ? {
            items: r.items.filter(i => i.label !== 'Capitals'),
            level: r.items
              .filter(i => i.label !== 'Capitals')
              .reduce(
                (lv, i) =>
                  LEVEL_ORDER[i.level] > LEVEL_ORDER[lv] ? i.level : lv,
                'clean',
              ),
          }
        : r
      titleCheck.replaceChildren(
        h(
          'div',
          { class: 'au-meta' },
          levelChip(res.level),
          h('span', { class: 'au-wc' }, `${wc} of 4 words`),
        ),
        checkList(res),
      )
      drawTitle()
      zonesG.style.display = st.zones ? '' : 'none'
      const cr = ratio(st.fg, st.bg)
      const pass = cr >= 4.5
      ratioOut.replaceChildren(
        h('b', { class: pass ? 'ok' : 'bad' }, `${cr.toFixed(1)}:1`),
        h(
          'span',
          null,
          pass
            ? 'Passes the 4.5:1 floor.'
            : 'Fails the 4.5:1 floor. Fix: a dark gradient band, a drop shadow, or move the text over the darkest third of the frame.',
        ),
      )
      swatch.style.color = st.fg
      swatch.style.background = st.bg
      swatch.className = `au-swatch f-${st.fmt}`
    }

    el.append(
      ui.section(
        {
          eyebrow: 'Title & cover',
          title: 'Four words on the right frame',
          lede: 'The cover is the hook that sits still on your profile grid. Pick the most colourful real frame, keep the title to 4 words, and make sure it reads.',
        },
        tags(
          canon('House style · Estrella Early, 4 words max'),
          canon('Runbook · most colourful frame'),
          canon('Playbook Law 7 · 4.5:1'),
        ),
        h(
          'div',
          { class: 'ln-split au-cover' },
          h('div', { class: 'au-cv-wrap' }, preview),
          h(
            'div',
            { class: 'ln-stack' },
            fmtSeg.el,
            fmtNote,
            titleF.el,
            titleCheck,
            zonesT.el,
            note(
              'Safe zones on 1080×1920: keep the top 130 px, right 140 px and bottom 484 px clear. The dashed lines are the Instagram 3:4 grid crop (y 240–1680); the title box (x 65–920, y 420–1500) survives both crops. The grid-crop numbers are derived from memory, not a published spec.',
            ),
            note(
              'The preview uses a stand-in face. Estrella Early is licensed: import it in CapCut and check its commercial-use terms before monetizing.',
            ),
            h('div', null, ui.path('Text', 'Add text', 'Font', 'Import')),
          ),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Runbook',
          title: 'Find the most colourful frame',
          lede: 'Night reels: the cover is the frame with the most colour (the green wall, the neon sign). Pick the clip and this page scores up to 48 frames on a standard colourfulness measure (the spread of red–green and yellow–blue), then shows the top three. Nothing leaves the phone.',
        },
        h('div', { class: 'ln-row' }, pick, saveFrameBtn),
        scanStatus,
        framesBox,
        ui.callout(
          'verify',
          h(
            'span',
            null,
            'In CapCut the cover sits at the timeline start; TikTok also lets you choose a frame when posting. Labels vary by version. Check which one your app shows, then use the saved frame or the timecode above.',
          ),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Playbook Law 7',
          title: 'Text contrast, 4.5:1 or better',
          lede: 'White text on a bright plate fails. With a frame picked, the background below is the worst case inside the title box.',
        },
        h(
          'div',
          { class: 'ln-split' },
          h(
            'div',
            { class: 'ln-stack' },
            h(
              'div',
              { class: 'au-colors' },
              h('label', { class: 'ln-label' }, 'Text', fgIn),
              h('label', { class: 'ln-label' }, 'Behind it', bgIn),
            ),
            presetRow,
          ),
          h('div', { class: 'ln-stack' }, swatch, ratioOut),
        ),
        note(
          'Ratio is WCAG relative luminance. Captions: off-white #F2EDE4 with a 60% black shadow; never pure yellow on food.',
        ),
      ),
    )
    update()
  }

  /* ================================================================ 3. Retention map */
  const SEG_KIND = {
    hook: 'Hook',
    where: 'What & where',
    plate: 'Cook / plate',
    build: 'Build',
    verdict: 'Verdict',
    card: 'Rating card',
    montage: 'Montage',
    beat: 'Emotional beat',
    hold: 'Static hold',
    data: 'Data card',
    ramp: 'Process + ramps',
    result: 'Result',
  }

  function reviewPlan(L) {
    const card = 1.5
    if (L >= 61) {
      const vStart = Math.max(61, L - card - 9)
      const plateEnd = Math.min(vStart - 4, 45 + Math.max(0, L - 75))
      const segs = [
        {
          a: 0,
          b: 3,
          k: 'hook',
          d: 'Hook card on about 2 s; the plate lands at 0:00',
        },
        {
          a: 3,
          b: 10,
          k: 'where',
          d: 'What it is, where it came from, the real price',
        },
        {
          a: 10,
          b: plateEnd,
          k: 'plate',
          d: 'The plate, the cut, the first bite',
        },
        {
          a: plateEnd,
          b: vStart,
          k: 'build',
          d: 'Second bite, the side, the honest weak spot',
        },
        { a: vStart, b: L - card, k: 'verdict', d: 'The verdict, after 60 s' },
        {
          a: L - card,
          b: L,
          k: 'card',
          d: 'Rating card held 1.5 s. No goodbye.',
        },
      ]
      const bite = 10 + (plateEnd - 10) * 0.35
      return {
        name: 'Rewards cut',
        segs,
        marks: [
          {
            t: bite,
            k: 'zoom',
            d: 'Push-in 8–15% on the bite + one SFX (30–60)',
          },
          { t: plateEnd - 3, k: 'zoom', d: 'Push-in on the money shot' },
          { t: vStart, k: 'zoom', d: 'Push-in on the verdict' },
          { t: L - card, k: 'sfx', d: 'One SFX as the rating card lands' },
        ],
        vStart,
      }
    }
    const vStart = L - card - 5
    const segs = [
      {
        a: 0,
        b: 3,
        k: 'hook',
        d: 'Hook card on about 2 s; the plate lands at 0:00',
      },
      {
        a: 3,
        b: 7,
        k: 'where',
        d: 'What it is, where it came from, the real price',
      },
      { a: 7, b: vStart, k: 'plate', d: 'The plate, the cut, the first bite' },
      { a: vStart, b: L - card, k: 'verdict', d: 'The verdict' },
      {
        a: L - card,
        b: L,
        k: 'card',
        d: 'Rating card held 1.5 s. No goodbye.',
      },
    ]
    const bite = 7 + (vStart - 7) * 0.4
    return {
      name: L <= 40 ? 'Reach cut' : 'Between cuts',
      segs,
      marks: [
        {
          t: bite,
          k: 'zoom',
          d: 'Push-in 8–15% on the bite + one SFX (30–60)',
        },
        { t: vStart - 2.5, k: 'zoom', d: 'Push-in on the money shot' },
        { t: vStart, k: 'zoom', d: 'Push-in on the verdict' },
      ],
      vStart,
    }
  }
  function lunarPlan(o) {
    if (o.mode === 'single') {
      return {
        name: 'Single shot loop',
        segs: [
          {
            a: 0,
            b: o.single,
            k: 'hold',
            d: 'One dead-still shot; the car pass streaks through; it loops',
          },
        ],
        marks: [
          { t: 0, k: 'text', d: 'Lime text on for the first 3 s' },
          { t: o.single * 0.55, k: 'car', d: 'The car pass' },
        ],
      }
    }
    const segs = []
    let t = 0
    const carIdx = o.car === 'third' ? 2 : o.shots - 1
    for (let i = 0; i < o.shots; i++) {
      segs.push({
        a: t,
        b: t + o.hold,
        k: 'hold',
        d:
          i === carIdx
            ? `Shot ${i + 1}: the car pass`
            : `Shot ${i + 1}: static hold, hard cut`,
      })
      t += o.hold
    }
    return {
      name: 'Montage',
      segs,
      marks: [
        { t: 0, k: 'text', d: 'Lime text on for the first 3 s' },
        { t: carIdx * o.hold + o.hold * 0.5, k: 'car', d: 'The car pass' },
      ],
    }
  }
  function docPlan() {
    const segs = [
      { a: 0, b: 3, k: 'hook', d: 'The real stake or the real failure' },
      {
        a: 3,
        b: 21,
        k: 'montage',
        d: 'Montage, cuts about every 1.8 s on action apexes',
      },
      { a: 21, b: 30, k: 'beat', d: 'Two emotional beats, about 4.5 s each' },
      { a: 30, b: 48, k: 'montage', d: 'Montage back into the work' },
      { a: 48, b: 60, k: 'beat', d: 'The payoff, held' },
    ]
    return {
      name: 'Sample 60 s rhythm',
      segs,
      marks: [
        { t: 0, k: 'text', d: 'Serif title + mono data line' },
        { t: 21, k: 'sfx', d: 'Music ducks under the voice' },
      ],
    }
  }
  function rndPlan() {
    return {
      name: 'Sample 45 s layout',
      segs: [
        { a: 0, b: 3, k: 'hook', d: 'The result or the failure, macro' },
        { a: 3, b: 6, k: 'data', d: 'Mono data card: the one variable' },
        {
          a: 6,
          b: 30,
          k: 'ramp',
          d: 'The process; speed ramps on pours and knife work',
        },
        { a: 30, b: 40, k: 'result', d: 'Side by side: the two results' },
        { a: 40, b: 45, k: 'data', d: 'Mono data card: what changed, plainly' },
      ],
      marks: [
        { t: 8, k: 'ramp', d: 'Speed ramp (never below 0.5x without 60 fps)' },
      ],
    }
  }

  function timelineSvg(plan, L, o = {}) {
    const W = 400
    const x = t => 8 + (t / L) * (W - 16)
    const kids = []
    for (const sg of plan.segs)
      kids.push(
        svg('rect', {
          x: x(sg.a),
          y: 22,
          width: Math.max(0.5, x(sg.b) - x(sg.a) - 0.6),
          height: 22,
          class: `k-${sg.k}`,
        }),
      )
    for (let t = 0; t <= L + 0.001; t += 3)
      kids.push(
        svg('line', {
          x1: x(t),
          y1: 46,
          x2: x(t),
          y2: t % 15 === 0 ? 54 : 50,
          class: 'tick',
        }),
      )
    const step = L > 75 ? 15 : L > 30 ? 10 : 5
    for (let t = 0; t <= L + 0.001; t += step)
      kids.push(
        svg(
          'text',
          {
            x: x(t),
            y: 64,
            class: 'lbl',
            'text-anchor': t === 0 ? 'start' : 'middle',
          },
          `${t}s`,
        ),
      )
    if (o.line60 && L > 60) {
      kids.push(
        svg('line', { x1: x(60), y1: 12, x2: x(60), y2: 48, class: 'l60' }),
        svg('text', { x: x(60) + 3, y: 12, class: 'lbl l60t' }, '60 s line'),
      )
    }
    for (const m of plan.marks)
      kids.push(
        svg('path', {
          d: `M${x(m.t) - 4} 14 L${x(m.t) + 4} 14 L${x(m.t)} 20 Z`,
          class: `mk m-${m.k}`,
        }),
      )
    return svg(
      'svg',
      {
        viewBox: `0 0 ${W} 70`,
        class: 'au-tl',
        role: 'img',
        'aria-label': `${plan.name} timeline, ${L} seconds`,
      },
      ...kids,
    )
  }

  function beatSheet(fmt, plan, L) {
    const f = FORMATS[fmt]
    const out = [
      `${f.label.toUpperCase()} · ${plan.name.toUpperCase()} · ${L} s`,
      fmt === 'lunar'
        ? 'Lunar Night: 3-5 s static holds and hard cuts; each cut is the change. Rhythm comes from the music.'
        : 'Every 3 s something changes: shot, scale, text, sound or colour. Cut on motion or sound, never on nothing.',
      '',
      'SECTIONS',
      ...plan.segs.map(
        sg =>
          `${mmss(sg.a)}-${mmss(sg.b)}  ${SEG_KIND[sg.k].toUpperCase()}  ${sg.d}`,
      ),
      '',
      'MARKERS',
      ...plan.marks
        .slice()
        .sort((a, b) => a.t - b.t)
        .map(m => `${mmss(m.t)}  ${m.d}`),
    ]
    if (fmt !== 'lunar') {
      out.push('', '3-SECOND WINDOWS')
      for (let t = 0; t < L; t += 3) {
        const end = Math.min(L, t + 3)
        const sg = plan.segs.find(x => t >= x.a && t < x.b) || plan.segs[0]
        const ms = plan.marks.filter(m => m.t >= t && m.t < end)
        const change = ms.length
          ? ms.map(m => m.d).join('; ')
          : t === 0
            ? 'hook shot at 0:00'
            : plan.segs.some(x => x.a > t - 0.001 && x.a < end)
              ? `new section: ${SEG_KIND[(plan.segs.find(x => x.a > t - 0.001 && x.a < end) || sg).k].toLowerCase()}`
              : 'new shot (cut on motion or sound), or a caption change'
        out.push(
          `${mmss(t)}-${mmss(end)}  [${SEG_KIND[sg.k].toLowerCase()}]  ${change}`,
        )
      }
    }
    return out.join('\n')
  }

  function retentionTab(el) {
    const saved = LN.store.get('aura.ret', {}) || {}
    const st = {
      fmt: FMT_IDS.includes(saved.fmt) ? saved.fmt : 'review',
      len:
        Number(saved.len) >= 25 && Number(saved.len) <= 90
          ? Number(saved.len)
          : 72,
      mode: saved.mode === 'single' ? 'single' : 'montage',
      shots: [5, 6, 7].includes(saved.shots) ? saved.shots : 6,
      hold: [3, 4, 5].includes(saved.hold) ? saved.hold : 4,
      single: [5, 6, 7].includes(saved.single) ? saved.single : 6,
      car: saved.car === 'last' ? 'last' : 'third',
    }
    const persist = () => LN.store.set('aura.ret', st)

    const ctrl = h('div', { class: 'ln-stack' })
    const tlBox = h('div', { class: 'au-tl-wrap' })
    const legend = h('ol', { class: 'au-legend' })
    const checks = h('div', { class: 'au-meta' })
    const sheet = ui.copyBlock('', { title: 'Beat sheet', button: 'Copy' })
    let lastSheet = ''

    const fmtSeg = ui.seg({
      label: 'Format',
      value: st.fmt,
      options: FMT_IDS.map(id => ({ value: id, label: FORMATS[id].short })),
      onChange: v => {
        st.fmt = v
        controls()
        update()
      },
    })
    function controls() {
      const kids = [fmtSeg.el]
      if (st.fmt === 'review') {
        const sl = ui.slider({
          label: 'Length',
          min: 25,
          max: 90,
          value: st.len,
          unit: ' s',
          onInput: v => {
            st.len = v
            update()
          },
        })
        kids.push(
          sl.el,
          h(
            'div',
            { class: 'ln-row' },
            ui.btn(
              'Reach cut · 32 s',
              () => {
                st.len = 32
                sl.set(32)
                update()
              },
              { kind: 'quiet', small: true },
            ),
            ui.btn(
              'Rewards cut · 72 s',
              () => {
                st.len = 72
                sl.set(72)
                update()
              },
              { kind: 'quiet', small: true },
            ),
          ),
        )
      } else if (st.fmt === 'lunar') {
        kids.push(
          ui.seg({
            label: 'Shape',
            value: st.mode,
            options: [
              { value: 'montage', label: 'Montage' },
              { value: 'single', label: 'Single shot' },
            ],
            onChange: v => {
              st.mode = v
              controls()
              update()
            },
          }).el,
        )
        if (st.mode === 'single')
          kids.push(
            ui.seg({
              label: 'Loop length',
              value: st.single,
              options: [5, 6, 7].map(n => ({ value: n, label: `${n} s` })),
              onChange: v => {
                st.single = v
                update()
              },
            }).el,
          )
        else
          kids.push(
            ui.seg({
              label: 'Shots',
              value: st.shots,
              options: [5, 6, 7].map(n => ({ value: n, label: String(n) })),
              onChange: v => {
                st.shots = v
                update()
              },
            }).el,
            ui.seg({
              label: 'Hold per shot',
              value: st.hold,
              options: [3, 4, 5].map(n => ({ value: n, label: `${n} s` })),
              onChange: v => {
                st.hold = v
                update()
              },
            }).el,
            ui.seg({
              label: 'Car-pass shot',
              value: st.car,
              options: [
                { value: 'third', label: 'Third' },
                { value: 'last', label: 'Last' },
              ],
              onChange: v => {
                st.car = v
                update()
              },
            }).el,
          )
      } else {
        kids.push(
          note(
            st.fmt === 'doc'
              ? 'A sample rhythm from the doc canon: hook 0–3 s, montage cuts about 1.8 s, emotional beats about 4.5 s. The order of acts is yours.'
              : 'A sample layout. R&D has no canon timeline yet: hook, one variable, the process with speed ramps, the result side by side.',
          ),
        )
      }
      ctrl.replaceChildren(...kids)
    }

    function update() {
      persist()
      let plan
      let L
      if (st.fmt === 'review') {
        L = st.len
        plan = reviewPlan(L)
      } else if (st.fmt === 'lunar') {
        plan = lunarPlan(st)
        L = plan.segs[plan.segs.length - 1].b
      } else if (st.fmt === 'doc') {
        plan = docPlan()
        L = 60
      } else {
        plan = rndPlan()
        L = 45
      }
      tlBox.replaceChildren(
        h(
          'div',
          { class: 'au-tl-head' },
          h('b', null, plan.name),
          h('span', null, `${L} s · ticks every 3 s`),
        ),
        timelineSvg(plan, L, { line60: st.fmt === 'review' }),
      )
      legend.replaceChildren(
        ...plan.segs.map(sg =>
          h(
            'li',
            null,
            h('i', { class: `sw k-${sg.k}`, 'aria-hidden': 'true' }),
            h('span', { class: 'au-t' }, `${mmss(sg.a)}–${mmss(sg.b)}`),
            h('b', null, SEG_KIND[sg.k]),
            h('span', { class: 'au-d' }, sg.d),
          ),
        ),
        ...plan.marks
          .slice()
          .sort((a, b) => a.t - b.t)
          .map(m =>
            h(
              'li',
              { class: 'mkrow' },
              h('i', { class: `sw mk m-${m.k}`, 'aria-hidden': 'true' }),
              h('span', { class: 'au-t' }, mmss(m.t)),
              h('b', null, 'Marker'),
              h('span', { class: 'au-d' }, m.d),
            ),
          ),
      )
      const chips = []
      if (st.fmt === 'review') {
        const over = L > 60
        chips.push(
          ui.chip(
            over
              ? 'Over 1 min: Rewards-eligible length'
              : 'Under 1 min: no Rewards pay',
            over ? 'sage' : '',
          ),
          ui.chip(
            plan.vStart > 60
              ? `Verdict at ${mmss(plan.vStart)}: after 60 s`
              : `Verdict at ${mmss(plan.vStart)}`,
            plan.vStart > 60 ? 'sage' : '',
          ),
          ui.chip('Rating card 1.5 s', 'sage'),
          ui.chip('No goodbye', 'sage'),
        )
        if (L > 40 && L <= 60)
          chips.push(
            ui.chip(
              '41–60 s: past reach, short of the Rewards line',
              'crimson',
            ),
          )
      } else if (st.fmt === 'lunar') {
        chips.push(
          ui.chip(`${L} s`, 'sage'),
          ui.chip('Hard cuts, no transitions', 'sage'),
          ui.chip('No voice, no SFX', 'sage'),
        )
      } else {
        chips.push(ui.chip('Sample, not canon timing', ''))
      }
      checks.replaceChildren(...chips)
      lastSheet = beatSheet(st.fmt, plan, L)
      sheet.setText(lastSheet)
    }

    el.append(
      ui.section(
        {
          eyebrow: 'Retention map',
          title: 'Every 3 s something changes',
          lede: 'Shot, scale, text, sound or colour. Retention is measured per second, and the review pays on it. The ticks on each timeline are 3 s apart; the markers are the push-ins, SFX and text moments from your house style.',
        },
        tags(
          canon('Playbook · Edit law 3'),
          canon('Playbook · Edit order step 4'),
        ),
        h(
          'div',
          { class: 'ln-split' },
          ctrl,
          h('div', { class: 'ln-stack' }, tlBox, checks, legend),
        ),
        h(
          'div',
          { class: 'ln-row' },
          ui.btn(
            'Save beat sheet (.txt)',
            () =>
              LN.save({
                filename: `aura-beats-${st.fmt}.txt`,
                data: `${lastSheet}\n`,
                mime: 'text/plain',
              }),
            { kind: 'ghost' },
          ),
        ),
        sheet,
        st.fmt === 'lunar'
          ? null
          : note(
              'The Rewards cut runs 65–90 s with the verdict after 60 s; the reach cut runs 25–40 s. The section timings inside each cut are this page’s scaling of the playbook structure (hook 0–3, what/where 3–10, cook/plate 10–45, verdict, payoff), not a separate rule.',
            ),
      ),
      ui.section(
        {
          eyebrow: 'Endings',
          title: 'End on the payoff',
          lede: 'Verdict, then the rating card held 1.5 s, then nothing. No goodbye, no outro.',
        },
        h(
          'div',
          { class: 'ln-grid' },
          block(
            'Peak-end rule',
            tags(ev('L19')),
            prose(
              'Holds when people form remembered evaluations of short experiences: most participants chose to repeat a longer trial that had a milder end. It does not support retention or revenue gains from "a good ending". So the reason to end on the verdict is honesty and house style, not a promised lift.',
            ),
            h(
              'p',
              { class: 'au-fact' },
              h('span', null, 'Must be true · '),
              'The verdict is the real verdict, and every verdict you teased earlier is delivered.',
            ),
          ),
          block(
            'Series and "part n of N"',
            tags(ev('L23'), ev('L22')),
            prose(
              'People tend to resume interrupted tasks they chose themselves (L23, B). There is no memory advantage for unfinished tasks (L22, D): never write a cliffhanger "because the brain can’t forget it".',
            ),
            h(
              'p',
              { class: 'au-fact' },
              h('span', null, 'Must be true · '),
              'The next part exists, or its real date is stated. Each part delivers its own promise.',
            ),
          ),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Story devices',
          title: 'Set-up, turn, reveal',
          lede: 'Narrative misdirection and humour are craft, not science. Nothing here is graded above C, and nothing promises a number.',
        },
        tags(craft()),
        h(
          'ol',
          { class: 'au-arc' },
          h(
            'li',
            null,
            h('b', null, 'Set-up'),
            h(
              'span',
              null,
              'What you really expected: [the $[price] plate looks dry from the listing photo]',
            ),
          ),
          h(
            'li',
            null,
            h('b', null, 'Turn'),
            h(
              'span',
              null,
              'The moment it changes: [the first bite, the steam when the tortilla tears]',
            ),
          ),
          h(
            'li',
            null,
            h('b', null, 'Reveal'),
            h(
              'span',
              null,
              'The true result, in this video: [the verdict and the rating card]',
            ),
          ),
        ),
        h(
          'div',
          { class: 'ln-grid' },
          block(
            'Misdirection is honest only if',
            ui.steps([
              'It happens inside the story, not in the packaging. The title and cover promise is delivered as made.',
              'The set-up is what you really expected at the time, or plainly a guess.',
              'The reveal is true and comes in the same video, or in a part whose real date is stated.',
              'No false fact remains after the reveal; reenactments are labelled.',
              'It never hides a sponsor and never invents jeopardy.',
            ]),
          ),
          block(
            'Humour is honest only if',
            ui.steps([
              'Any literal claim inside the joke is true, or the exaggeration is unmistakable.',
              'It never punches down at the community or leans on stereotypes about Native people or anyone else.',
              'It makes no false factual claim about a home cook or a named business.',
              'A sponsor joke never blurs the disclosure.',
            ]),
            note(
              'Running gags: repeat them moderately and retire them before they grate (L17, C for marketing outcomes; L18, C, single paper).',
            ),
          ),
        ),
        ui.callout(
          'warn',
          'Bait-and-switch titles and covers, staged disasters presented as real, fake "inspector sightings", and a twist that turns out to be an undisclosed ad.',
          'Where it crosses the line',
        ),
      ),
    )
    controls()
    update()
  }

  /* ================================================================ 4. Money stack */
  const LANES = [
    {
      lane: 'Creator Rewards',
      gate: '18+, personal account in good standing, 10,000 followers, 100,000 views in 30 days, videos over 1 min',
      pay: '$0.40–$1.00 per 1,000 qualified views, creator-reported; some sources put the US band up to about $2.00',
      first:
        'Make every review episode 65–90 s, verdict after 60 s, starting now.',
      guard: 'Only videos posted after you are accepted count.',
    },
    {
      lane: 'CapCut templates',
      gate: 'US Template Creator Program acceptance',
      pay: 'Per use and export, plus referral and challenge rewards. Third-party blogs report about $150–250 a month for consistent beginners: unofficial.',
      first:
        'Save the Dreamcore review skeleton as a template; name it so chefs search it.',
      path: ['Me', 'Creator Center', 'Create & Earn'],
      guard:
        'Template Monetization (Jan 2026) lets you charge for access while your original media stays protected.',
    },
    {
      lane: 'TikTok Shop affiliate',
      gate: 'Shop access in-app',
      pay: 'Commission per sale',
      first: 'Link the knife, salt and tortilla press you already use.',
      guard:
        'Only gear you really use. Disclose the affiliate link on the post (DP-16).',
    },
    {
      lane: 'LIVE gifts',
      gate: '1,000 followers for LIVE',
      pay: 'Variable; the playbook notes top LIVE creators earn most here',
      first: 'A weekly plating LIVE from a clean station.',
      guard: 'No gift-for-shoutout pressure, nothing aimed at kids (DP-14).',
    },
    {
      lane: 'Brand deals',
      gate: 'An audience and a media kit',
      pay: '$100s to $1,000s per post locally (playbook estimate)',
      first: 'Santa Fe restaurants, Tewa artisans, NM Tourism.',
      guard:
        'Paid partnership label at the top, and say it in the video (DP-16, High). Pay artisans; their work is never a prop.',
    },
    {
      lane: 'Freelance edits',
      gate: 'A reel of 3 edits',
      pay: '$50–$300 per short locally (playbook estimate)',
      first:
        'Offer two free edits to Sean’s and Fernando’s accounts for the portfolio.',
      guard: 'Their footage, their credit.',
    },
  ]
  const ELIG = [
    ['age', 'You are 18 or older'],
    ['personal', 'Personal account (not business), in good standing'],
    ['followers', '10,000 followers'],
    ['views', '100,000 video views in the last 30 days'],
    ['long', 'Posting videos longer than 1 minute'],
  ]

  function moneyTab(el) {
    /* ---- calculator */
    const c0 = LN.store.get('aura.calc', {}) || {}
    const calc = {
      views: Number(c0.views) > 0 ? Number(c0.views) : 200000,
      share: [50, 55, 60, 65, 70].includes(c0.share) ? c0.share : 60,
      wide: !!c0.wide,
    }
    const calcOut = h('div', { class: 'au-calc-out', 'aria-live': 'polite' })
    const viewsIn = h('input', {
      class: 'ln-input au-num',
      type: 'number',
      inputmode: 'numeric',
      min: 0,
      step: 1000,
      id: LN.uid('views'),
      value: calc.views,
      onInput: e => {
        calc.views = Math.max(0, Number(e.target.value) || 0)
        runCalc()
      },
    })
    const viewsField = h(
      'div',
      { class: 'ln-field' },
      h(
        'label',
        { class: 'ln-label', for: viewsIn.id },
        'Views a month on eligible videos',
      ),
      viewsIn,
      h(
        'div',
        { class: 'ln-row' },
        [100000, 500000, 1000000, 5000000].map(v =>
          ui.btn(
            v >= 1e6 ? `${v / 1e6}M` : `${v / 1e3}k`,
            () => {
              calc.views = v
              viewsIn.value = v
              runCalc()
            },
            { kind: 'quiet', small: true },
          ),
        ),
      ),
    )
    const shareSl = ui.slider({
      label: 'Qualified share',
      min: 50,
      max: 70,
      step: 5,
      value: calc.share,
      unit: '%',
      onInput: v => {
        calc.share = v
        runCalc()
      },
    })
    const wideT = ui.toggle({
      label: 'Also show the up-to-$2.00 US band some sources report',
      checked: calc.wide,
      onChange: v => {
        calc.wide = v
        runCalc()
      },
    })
    function runCalc() {
      LN.store.set('aura.calc', calc)
      const q = calc.views * (calc.share / 100)
      const qLo = calc.views * 0.5
      const qHi = calc.views * 0.7
      const lo = (q / 1000) * 0.4
      const hi = (q / 1000) * 1.0
      const rows = [
        [
          'Qualified views',
          `${int(q)} (at ${calc.share}%; ${int(qLo)}–${int(qHi)} across 50–70%)`,
        ],
        ['At $0.40 RPM', money(lo)],
        ['At $1.00 RPM', money(hi)],
      ]
      if (calc.wide) rows.push(['At $2.00 RPM', money((q / 1000) * 2)])
      calcOut.replaceChildren(
        h(
          'div',
          { class: 'au-range' },
          h('b', null, `${money(lo)} – ${money(hi)}`),
          h('span', null, 'a month, planning range'),
        ),
        ui.kv(rows),
        h(
          'p',
          { class: 'au-warnline' },
          'Creator-reported planning range, not official. TikTok publishes no fixed rate, and this is not a promise of earnings. A qualified view comes from the For You feed and is watched 5+ s; only videos over 1 min, posted after you are accepted, count.',
        ),
      )
    }

    /* ---- eligibility */
    const e0 = LN.store.get('aura.elig', {}) || {}
    const elig = {
      checked: e0.checked || {},
      followers: e0.followers ?? '',
      views30: e0.views30 ?? '',
    }
    const eligStatus = h('div', {
      class: 'au-elig-status',
      'aria-live': 'polite',
    })
    const gapOut = h('div')
    const saveElig = () => LN.store.set('aura.elig', elig)
    function renderEligStatus() {
      const done = ELIG.filter(([id]) => elig.checked[id]).length
      eligStatus.replaceChildren(
        h('b', null, `${done} of ${ELIG.length}`),
        h(
          'span',
          null,
          done === ELIG.length
            ? 'All five ticked. Read the in-app checklist, then apply.'
            : 'ticked',
        ),
      )
      const f = Number(elig.followers)
      const v = Number(elig.views30)
      const lines = []
      if (elig.followers !== '' && Number.isFinite(f))
        lines.push(
          f >= 10000
            ? 'Followers: at or past 10,000.'
            : `Followers: ${int(10000 - f)} to go.`,
        )
      if (elig.views30 !== '' && Number.isFinite(v))
        lines.push(
          v >= 100000
            ? 'Views in 30 days: at or past 100,000.'
            : `Views in 30 days: ${int(100000 - v)} to go.`,
        )
      gapOut.replaceChildren(
        lines.length
          ? h(
              'ul',
              { class: 'au-gap' },
              lines.map(l => h('li', null, l)),
            )
          : ui.empty(
              'Type your two numbers from the in-app checklist to see the gap.',
            ),
      )
    }
    const eligList = h(
      'ul',
      { class: 'au-elig' },
      ELIG.map(([id, label]) => {
        const cid = LN.uid('el')
        const box = h('input', {
          type: 'checkbox',
          id: cid,
          checked: !!elig.checked[id],
          onChange: e => {
            elig.checked[id] = e.target.checked
            saveElig()
            renderEligStatus()
          },
        })
        return h(
          'li',
          null,
          h('label', { for: cid }, box, h('span', null, label)),
        )
      }),
    )
    const numIn = (label, key, ph) => {
      const id = LN.uid('gap')
      const input = h('input', {
        class: 'ln-input',
        id,
        type: 'number',
        inputmode: 'numeric',
        min: 0,
        placeholder: ph,
        value: elig[key],
        onInput: e => {
          elig[key] = e.target.value
          saveElig()
          renderEligStatus()
        },
      })
      return h(
        'div',
        { class: 'ln-field' },
        h('label', { class: 'ln-label', for: id }, label),
        input,
      )
    }

    el.append(
      ui.section(
        {
          eyebrow: 'Playbook Module 4',
          title: 'The money stack',
          lede: 'View pay is the smallest check: it is the entry ticket, not the business. Creator Rewards gets you in, templates and brand work pay the rent, and the chef authority is what nobody else on the app can copy.',
        },
        tags(canon('Playbook · Money Law 3, in its order')),
        h(
          'div',
          { class: 'ln-grid au-lanes' },
          LANES.map((ln, i) =>
            h(
              'article',
              { class: 'ln-card au-lane' },
              h('div', { class: 'au-lane-n' }, String(i + 1).padStart(2, '0')),
              h('h3', null, ln.lane),
              ui.kv([
                ['Gate', ln.gate],
                ['Pay', ln.pay],
                ['First move', ln.first],
              ]),
              ln.path ? h('div', null, ui.path(...ln.path)) : null,
              h('p', { class: 'au-note' }, ln.guard),
            ),
          ),
        ),
        ui.callout(
          'verify',
          'Every pay figure above is creator-reported, a playbook estimate, or a third-party blog number: unofficial and liable to change. The CapCut path Me › Creator Center › Create & Earn and the template terms come from the playbook; check the labels in your app.',
        ),
      ),
      ui.section(
        {
          eyebrow: 'Creator Rewards',
          title: 'Planning calculator',
          lede: 'Qualified views × RPM. A qualified view is For You and watched 5+ s; a video often shows only 50–70% of its views as qualified.',
        },
        h(
          'div',
          { class: 'ln-split' },
          h(
            'div',
            { class: 'ln-card ln-stack' },
            viewsField,
            shareSl.el,
            wideT.el,
          ),
          h('div', { class: 'ln-card ln-stack' }, calcOut),
        ),
        note(
          'Retention counts twice, says the playbook: it raises qualified views and the RPM itself. That is a creator-reported pattern, not an official formula.',
        ),
      ),
      ui.section(
        {
          eyebrow: 'Eligibility',
          title: 'Tick what is true today',
          lede: 'Saved on this phone. TikTok changes thresholds without notice, so the in-app checklist wins.',
        },
        h(
          'div',
          { class: 'ln-split' },
          h('div', { class: 'ln-card ln-stack' }, eligStatus, eligList),
          h(
            'div',
            { class: 'ln-card ln-stack' },
            h('h3', null, 'The two numbers you are missing'),
            numIn('Followers now', 'followers', 'from the in-app checklist'),
            numIn(
              'Views in the last 30 days',
              'views30',
              'from the in-app checklist',
            ),
            gapOut,
            h(
              'div',
              null,
              ui.path(
                'TikTok',
                'Profile',
                'Menu',
                'Creator tools',
                'Creator Rewards Program',
              ),
            ),
          ),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Playbook Money Law 5',
          title: 'Protect the account',
          lede: 'One strike on a monetized post costs more than any hook earns.',
        },
        h(
          'div',
          { class: 'ln-grid' },
          block(
            'Original footage only',
            prose(
              'Reposts and watermarked clips disqualify views. Shoot it yourself on the Pixel. Turn off CapCut’s default ending so no logo clip rides along.',
            ),
            h(
              'div',
              null,
              ui.path(
                'CapCut home',
                'Settings (gear)',
                'Add default ending: off',
              ),
            ),
          ),
          block(
            'No copyrighted music on monetized posts',
            prose(
              'Use the Commercial Sounds library on any post you want paid. The Lunar Night ambient track and the review music bed both follow this rule.',
            ),
          ),
          block(
            'Personal account, read the checklist',
            prose(
              'Rewards needs a personal account, not a business one. Read the current in-app checklist before applying, every time.',
            ),
          ),
          block(
            'Free assets, licensed fonts',
            prose(
              'Avoid Pro-badge assets in CapCut: they can block export. Check Estrella Early’s commercial-use terms before monetizing with it.',
            ),
          ),
        ),
        ui.callout(
          'rule',
          h(
            'span',
            null,
            'No earnings claims on screen, no cash in covers. Money priming did not replicate ',
            ev('L25'),
            '. Never promise anyone a number.',
          ),
          'Money on camera',
        ),
      ),
    )
    runCalc()
    renderEligStatus()
  }

  /* ================================================================ 5. Guardrails */
  const GUARDS = [
    {
      t: 'No fake reviews or reactions',
      d: 'No staged diner reactions or testimonials presented as genuine, no paid "diners". Review the plate you really ate.',
      r: 'DP-04 · High · US-2 §465.2 · US-3',
    },
    {
      t: 'No fake counters',
      d: 'Never buy views, followers, likes or comments. "[n] of you asked for this" only with a real, dated count.',
      r: 'US-2 §465.8 · DP-03',
    },
    {
      t: 'No fake deadlines or stock',
      d: 'No countdown that restarts, no "only 3 seats left" without a live count. A real limit gets its real reason.',
      r: 'DP-01 · DP-02 · High',
    },
    {
      t: 'No "was" prices',
      d: 'On merch, tickets or memberships, no invented reference price. Show the real, dated price.',
      r: 'DP-05 · High',
    },
    {
      t: 'Disclose every sponsor and affiliate link',
      d: 'Comped meals, invited tastings, sponsors and affiliate links: say it at the top and in the video.',
      r: 'DP-16 · High · US-3',
    },
    {
      t: 'Original footage only',
      d: 'No reposts, no watermarked clips, no composite or AI image of a dish you did not make on a cover.',
      r: 'Playbook Money Law 5',
    },
    {
      t: 'No invented authority',
      d: 'Never "Michelin-starred", "Michelin-approved" or "an inspector visited" unless true and documented. No implied endorsement by the Pueblo, the guide or another chef.',
      r: 'EU-1 Annex I point 4 · R7',
    },
  ]
  const MYTHS = [
    [
      '"The 8-second attention span"',
      'Folklore with no study in the ledger.',
      'L34',
    ],
    [
      '"Open loops work because people remember unfinished things"',
      'A 2025 meta-analysis found no memory advantage. The tendency to resume self-chosen tasks does hold (L23, B).',
      'L22',
    ],
    [
      '"Losses always hurt twice as much"',
      'The lab average is near 2 but falls to about 1 in symmetric designs; it depends on how the choice is built.',
      'L04',
    ],
    [
      '"Cash in the thumbnail primes viewers"',
      'Currency priming did not replicate.',
      'L25',
    ],
    [
      '"This one trick lifts views 30%"',
      'At scale, nudge-type changes averaged +1.4 percentage points (8.0% relative).',
      'L21',
    ],
    [
      '"That cover won once, so faces always win"',
      'One result on one video is not a rule; many published findings fail to replicate. Re-test.',
      'L26',
    ],
  ]

  function guardTab(el) {
    /* ---- ethics test */
    const answers = { disclosure: null, reversal: null, truth: null }
    const verdict = h('div', { class: 'au-verdict', 'aria-live': 'polite' })
    const lint = h('div')
    const elemF = ui.field({
      label: 'The element: a hook, a cover, a claim, a twist',
      multiline: true,
      rows: 3,
      value: 'is this $[price] green chile stew worth it',
      onInput: () => judge(),
    })
    const Q = [
      [
        'disclosure',
        'Disclosure',
        'Would it still work if the viewer knew how it was made, and would they be fine with it?',
      ],
      [
        'reversal',
        'Reversal',
        'Can the viewer undo it as easily as they did it? (For watching, yes; it matters for anything paid.)',
      ],
      ['truth', 'Truth', 'Is every fact it implies true today?'],
    ]
    const segs = Q.map(([id, label, q]) => {
      const sg = ui.seg({
        label,
        value: null,
        options: [
          { value: 'pass', label: 'Pass' },
          { value: 'fail', label: 'Fail' },
          { value: 'unsure', label: 'Can’t tell' },
        ],
        onChange: v => {
          answers[id] = v
          judge()
        },
      })
      return h('div', { class: 'au-q' }, sg.el, h('p', { class: 'au-note' }, q))
    })
    function judge() {
      const text = elemF.get()
      lint.replaceChildren(
        text.trim()
          ? checkList(honesty(text, { maxWords: 999 }))
          : ui.empty('Describe the element to lint it.'),
      )
      const vals = Object.values(answers)
      let kind = 'tip'
      let msg =
        'Answer all three. Report pass, fail or can’t tell, with one line of reasoning each.'
      if (vals.includes('fail')) {
        kind = 'warn'
        msg =
          'A failed test makes the honest version mandatory: fix the fact or cut the element.'
      } else if (vals.includes('unsure')) {
        kind = 'verify'
        msg =
          'Name the fact that would decide it, then check it before posting.'
      } else if (vals.every(v => v === 'pass')) {
        kind = 'ok'
        msg = 'Clean on all three. This is a craft check, not a legal finding.'
      }
      verdict.replaceChildren(
        ui.callout(kind, msg, kind === 'verify' ? 'Can’t tell yet' : undefined),
      )
    }

    el.append(
      ui.section(
        {
          eyebrow: 'Honesty guardrails',
          title: 'The lines that do not move',
          lede: 'From the dark-pattern rules. A stated purpose does not change them, and there is no softer version that keeps the deception.',
        },
        h(
          'div',
          { class: 'ln-grid' },
          GUARDS.map(g =>
            h(
              'article',
              { class: 'ln-card au-guard' },
              h('h3', null, g.t),
              prose(g.d),
              tags(reg(g.r)),
            ),
          ),
        ),
        ui.callout(
          'verify',
          'TikTok and Instagram have paid-partnership and branded-content labels, but their exact settings were not verified in this research. Find the toggle in the post screen of your app version before the first sponsored post.',
        ),
      ),
      ui.section(
        {
          eyebrow: 'Heritage',
          title: 'With care and specifics',
          lede: 'Your identity, in your own words. Never decoration, never a sales lever.',
        },
        h(
          'div',
          { class: 'ln-grid' },
          block(
            'Do',
            ui.steps([
              'Name the person, the place and the practice, as they and the community confirm. Spell Tewa words and place names the way the community does.',
              'Credit the knowledge holders, farmers and elders by name, with permission.',
              'Share traditional knowledge only with the permission of those who hold it. Record the consent.',
              'Invite: "cook it with us". Belonging built on shared practice.',
            ]),
          ),
          block(
            'Never',
            ui.steps([
              'Sacred or ceremonial imagery as clickbait, or pan-Indian stereotypes on a cover.',
              'Guilt calls to action tied to Native identity or allyship ("real allies subscribe"): DP-13, DP-08.',
              'Implied endorsement by Ohkay Owingeh or any tribal body that did not give it: EU-1 Annex I point 4.',
              '"Native-made" on merch that is not. That falls under the Indian Arts and Crafts Act, outside this register and unverified here.',
            ]),
          ),
        ),
        note(
          'The evidence kit has nothing on community protocols. Which ones govern filming places and events, and who grants permission, is a question for the community, not this page.',
        ),
      ),
      ui.section(
        {
          eyebrow: 'The short test',
          title: 'Would it still work if they knew how it was made?',
          lede: 'Run the three ethics tests on any hook, cover, claim or twist before it goes out.',
        },
        h(
          'div',
          { class: 'ln-split' },
          h('div', { class: 'ln-card ln-stack' }, elemF.el, ...segs),
          h('div', { class: 'ln-stack' }, verdict, lint),
        ),
      ),
      ui.section(
        {
          eyebrow: 'Never repeat',
          title: 'Creator myths and what the ledger says',
          lede: 'If a tip leans on one of these, the tip is folklore.',
        },
        h(
          'ul',
          { class: 'au-myths' },
          MYTHS.map(([claim, ans, id]) =>
            h(
              'li',
              null,
              h('b', null, claim),
              h('span', null, ans),
              tags(ev(id)),
            ),
          ),
        ),
        note(REGISTER_LINE),
      ),
    )
    judge()
  }

  /* ================================================================ 6. Unfair advantage */
  function advantageTab(el) {
    const node = (x, y, label, sub) =>
      svg(
        'g',
        { class: 'au-node' },
        svg('rect', { x: x - 70, y: y - 26, width: 140, height: 52, rx: 4 }),
        svg(
          'text',
          { x, y: y - 3, 'text-anchor': 'middle', class: 'n1' },
          label,
        ),
        svg(
          'text',
          { x, y: y + 15, 'text-anchor': 'middle', class: 'n2' },
          sub,
        ),
      )
    const arrow = (d, lx, ly, label, anchor = 'middle') =>
      svg(
        'g',
        { class: 'au-arrow' },
        svg('path', { d, 'marker-end': 'url(#au-ah)' }),
        svg(
          'text',
          { x: lx, y: ly, 'text-anchor': anchor, class: 'n3' },
          label,
        ),
      )
    const loop = svg(
      'svg',
      {
        viewBox: '0 0 360 300',
        class: 'au-loop',
        role: 'img',
        'aria-label':
          'The loop: the signature look becomes the template, the template funnels to the account, the account sells the authority, and the authority is what the look frames.',
      },
      svg(
        'defs',
        null,
        svg(
          'marker',
          {
            id: 'au-ah',
            viewBox: '0 0 10 10',
            refX: 9,
            refY: 5,
            markerWidth: 7,
            markerHeight: 7,
            orient: 'auto-start-reverse',
          },
          svg('path', { d: 'M0 0 L10 5 L0 10 Z', class: 'au-ah' }),
        ),
      ),
      arrow('M180 66 L180 64 Q300 70 286 118', 300, 74, 'becomes', 'start'),
      arrow('M286 182 Q300 236 182 236', 304, 228, 'funnels', 'start'),
      arrow('M110 236 Q60 236 74 182', 56, 228, 'sells', 'end'),
      arrow('M74 118 Q60 70 108 50', 56, 74, 'frames', 'end'),
      node(180, 40, 'Signature look', 'LunarNight · Dreamcore'),
      node(286, 150, 'Template', 'CapCut skeleton'),
      node(180, 260, 'Account', 'the series'),
      node(74, 150, 'Authority', 'the working chef'),
    )

    el.append(
      ui.section(
        {
          eyebrow: 'Playbook Money Law 4',
          title: 'Your unfair advantage is the frame around the food',
        },
        h(
          'blockquote',
          { class: 'au-quote' },
          'Thousands of accounts review food. Almost none are Michelin-trained, Pueblo, and shooting a signature look. The look becomes the template; the template funnels to the account; the account sells the authority. That loop is the whole business.',
          h('cite', null, 'Creator Playbook, Nov 4, 2026'),
        ),
        h(
          'div',
          { class: 'ln-split' },
          h('div', { class: 'au-loop-wrap' }, loop),
          h(
            'div',
            { class: 'ln-stack' },
            prose(
              'Plainly: you cook for a living, you shoot one look nobody else shoots, and that look can be packaged as a template other people use. Each part feeds the next. None of it is a growth promise.',
            ),
          ),
        ),
      ),
      ui.section(
        {
          eyebrow: 'What makes each part hold',
          title: 'Three parts, three facts',
        },
        h(
          'div',
          { class: 'ln-grid' },
          block(
            'Authority',
            tags(craft()),
            prose(
              'What you know from the pass: cook times, seasoning, what a plate costs to make, what holds at service. Say it only as far as it is true and checkable. Authority as a persuasion effect is not in the ledger; the honesty rules still bind.',
            ),
            h(
              'p',
              { class: 'au-fact' },
              h('span', null, 'Must be true · '),
              'Every credential, kitchen and award you name is real, current and checkable. Michelin stays an aspiration ("chasing", "aiming for") until the guide says otherwise.',
            ),
          ),
          block(
            'The signature look',
            tags(ev('L17'), ev('L18')),
            prose(
              'A consistent look, title format and cover template across the series. Liking rises, then falls, with more exposures (L17); heavy repetition irritates, though that may fade with time (L18). So keep it consistent and refresh it before it grates.',
            ),
            h(
              'p',
              { class: 'au-fact' },
              h('span', null, 'Must be true · '),
              'The look is made in camera and in your grade, on your footage. The runbook numbers are the spec.',
            ),
          ),
          block(
            'The template loop',
            tags(canon('Playbook · Edit law 4')),
            prose(
              'Once an episode structure works, duplicate the project, strip the media, keep the text, timing, effects and grade. That file is your speed-run for next week and a product in the CapCut template program.',
            ),
            h(
              'p',
              { class: 'au-fact' },
              h('span', null, 'Must be true · '),
              'The template really does what its name says, and your original media stays out of it.',
            ),
          ),
        ),
        ui.callout(
          'verify',
          'Michelin stars go to restaurants, not chefs, and only in places the guide covers. No New Mexico edition was known as of mid-2026. Check guide.michelin.com before any title mentions the guide.',
        ),
        ui.callout(
          'rule',
          'Heritage is part of who you are, not a lever in this loop. It is told with care and specifics, in your words, and never sold.',
          'Not part of the pitch',
        ),
      ),
    )
  }

  /* ================================================================ evidence key */
  function evidenceKey() {
    return h(
      'details',
      { class: 'au-key' },
      h(
        'summary',
        null,
        h('span', { class: 'ln-eyebrow' }, 'Evidence key'),
        h(
          'span',
          { class: 'au-key-chips' },
          ev('L05'),
          ev('L19'),
          ev('L22'),
          craft(),
        ),
      ),
      h(
        'div',
        { class: 'ln-stack au-key-body' },
        prose(
          'Psychology on this page comes only from the Marketing Psychology Kit evidence ledger (rows checked 2026-10-03). Each tag gives the ledger id and the grade exactly as the ledger states it. Anything else is tagged "not in the evidence ledger, craft heuristic", which means C at most: contested, test before relying on it.',
        ),
        ui.kv([
          ['A', 'Well supported: replicated and seen outside the lab'],
          ['B', 'Supported under the conditions stated'],
          ['C', 'Contested; test before relying on it'],
          ['D', 'Not supported. Never used as a reason here'],
          [
            'Canon',
            'Your own playbook, runbook or house style: a rule you set, not a study',
          ],
          [
            'Register',
            'A dark-pattern or legal register row: triage, not legal advice',
          ],
        ]),
        ui.callout(
          'tip',
          'No ledger row was measured on video hooks, titles, covers or retention. Whatever the grade, every application here is a hypothesis for your channel, answered only by your own test. Nothing here predicts a view, retention or earnings change.',
          'Transfer caveat',
        ),
      ),
    )
  }

  /* ================================================================ register */
  LN.register({
    id: 'aura',
    num: 8,
    title: 'Aura',
    short: 'Aura',
    kicker: 'HOOK PSYCHOLOGY & MONEY',
    blurb:
      'Hooks for the first 1.5–3 s, covers, a retention map per format and the honest money stack, with every psychology claim tagged to its evidence.',
    lede: 'The first 1.5 seconds decide the swipe, and the account decides the money. This page writes hooks you can defend, finds the cover frame, maps where something changes every 3 s, and lays out the money lanes with their real gates. Every psychology claim carries its evidence grade; every number is labelled for what it is.',
    outputs: ['Hook lab', 'Retention map', 'Money stack', 'Honesty guardrails'],
    mount(el) {
      el.append(
        evidenceKey(),
        ui.tabs(
          [
            { id: 'hooks', label: 'Hook Lab', render: hookLab },
            { id: 'cover', label: 'Title & cover', render: coverTab },
            { id: 'retention', label: 'Retention', render: retentionTab },
            { id: 'money', label: 'Money', render: moneyTab },
            { id: 'guard', label: 'Guardrails', render: guardTab },
            { id: 'edge', label: 'Advantage', render: advantageTab },
          ],
          { key: 'aura' },
        ).el,
      )
    },
  })
})()
