import type { CorrectionSentence, Seg } from './types'

/**
 * 데모 평가("Should Our School Reduce Waste?")용 학생 답안 mock 데이터.
 * 문장 안의 [틀린 표현|바른 표현]은 AI 1차 첨삭 결과를 만들기 위한 표기이며,
 * 학생 원문에는 앞쪽(틀린 표현)이 쓰인다.
 */
interface Raw {
  m: string
  note?: string
}

const ESSAYS: Raw[][] = [
  [
    { m: 'I think our school [should to reduce|should reduce] waste.', note: '조동사 should 뒤에는 to 없이 동사원형이 와야 해.' },
    { m: 'First, we use too many paper cups in the cafeteria.' },
    { m: 'Students can bring their own bottles because it is easy and cheap.' },
    { m: 'Second, plastic [waste are|waste is] bad for the environment.', note: 'waste는 셀 수 없는 명사라서 단수 취급해 is를 써야 해.' },
    { m: 'If every class [recycle|recycles] paper, we can save many trees.', note: 'every class는 3인칭 단수이므로 동사에 -s를 붙여 recycles로 써야 해.' },
    { m: 'In conclusion, we should start small actions today.' },
  ],
  [
    { m: 'I agree that our school [should reduces|should reduce] waste.', note: 'should 뒤에는 주어와 상관없이 동사원형이 와야 해.' },
    { m: '[Because of|Because] students throw away a lot of food, the trash cans are always full.', note: 'because of 뒤에는 명사(구)가, because 뒤에는 「주어+동사」가 와. 뒤에 절이 이어지니 because를 써야 해.' },
    { m: 'We should [brings|bring] our own lunch boxes.', note: 'should 뒤에는 동사원형 bring이 와야 해.' },
    { m: 'This [make|makes] less plastic waste.', note: '주어 This가 3인칭 단수이므로 makes로 써야 해.' },
    { m: 'Also, teachers should teach us about recycling.' },
    { m: 'I believe small changes can make a big [different|difference].', note: '관사 a와 형용사 big 뒤에는 명사가 와야 하니까 형용사 different 대신 명사 difference를 써야 해.' },
    { m: 'That is why I think reducing waste is important.' },
  ],
  [
    { m: 'I think our school [should to reduce|should reduce] waste.', note: 'should 뒤에는 to 없이 동사원형을 써야 해.' },
    { m: 'There [is|are] many paper cups in the cafeteria.', note: '뒤에 나오는 명사가 복수(many paper cups)이므로 be동사도 are를 써야 해.' },
    { m: 'Students always [buys|buy] new bottles because they [is|are] lazy.', note: '주어 Students가 복수이므로 동사는 buy로 써야 해.\n주어 they에는 be동사 are를 써야 해.' },
    { m: '[If we reduces|If we reduce] waste, our school will be cleaner.', note: '주어 we에는 동사원형 reduce를 써야 해.' },
    { m: 'I want to [protecting|protect] the earth.', note: 'to부정사(to+동사원형)이므로 protect를 써야 해.' },
    { m: 'So we [must to|must] start now.', note: '조동사 must 뒤에는 to 없이 동사원형이 와야 해.' },
  ],
  [
    { m: 'Our school should reduce waste for three reasons.' },
    { m: 'First, many students throw away paper cups after using them only once.' },
    { m: 'Second, we can [saves|save] money if we use reusable bottles.', note: '조동사 can 뒤에는 동사원형 save가 와야 해.' },
    { m: 'Finally, reducing waste [make|makes] our school a better place.', note: '동명사(reducing waste)가 주어일 때는 단수로 취급하니까 makes로 써야 해.' },
    { m: 'Therefore, I think every student should join this campaign.' },
    { m: 'We should act now because the Earth cannot wait.' },
  ],
  [
    { m: 'In my opinion, our school [have to|has to] reduce waste.', note: '주어 our school은 3인칭 단수이므로 has to로 써야 해.' },
    { m: 'Many students [doesn\'t|don\'t] care about trash.', note: '주어 Many students가 복수이므로 don\'t를 써야 해.' },
    { m: 'They [leaves|leave] bottles on the desks.', note: '주어 They에는 동사원형 leave를 써야 해.' },
    { m: 'We should put the trash into the right bins.' },
    { m: 'If we do this, the school will be cleaner and healthier.' },
    { m: 'I hope everyone [join|joins] us.', note: 'everyone은 3인칭 단수이므로 joins로 써야 해.' },
    { m: 'Let\'s make a greener school together!' },
  ],
  [
    { m: 'I [am agree|agree] that we should reduce waste.', note: 'agree는 일반동사라서 be동사(am)와 함께 쓰지 않아.' },
    { m: 'Plastic [are|is] very bad for sea animals.', note: 'Plastic은 셀 수 없는 명사라서 단수 동사 is를 써야 해.' },
    { m: 'We should [uses|use] less [plastic bag|plastic bags].', note: '조동사 should 뒤에는 동사원형 use를 써야 해.\nless 뒤에서 여러 개를 가리킬 때는 복수형 plastic bags가 자연스러워.' },
    { m: 'Students can bring [theirs|their] own cups.', note: '뒤에 명사(own cups)가 있으므로 소유격 their를 써야 해.' },
    { m: 'It is easy and helpful for the Earth.' },
    { m: 'I think we [can doing|can do] it together.', note: '조동사 can 뒤에는 동사원형 do를 써야 해.' },
  ],
]

/** "A [wrong|right] B" 표기를 원문/수정문 구간으로 분해 */
function parse(m: string): { original: Seg[]; revised: Seg[]; plain: string } {
  const original: Seg[] = []
  const revised: Seg[] = []
  let plain = ''
  const re = /\[([^|\]]+)\|([^\]]+)\]/g
  let last = 0
  let x: RegExpExecArray | null
  while ((x = re.exec(m))) {
    const pre = m.slice(last, x.index)
    if (pre) {
      original.push({ t: pre })
      revised.push({ t: pre })
    }
    original.push({ t: x[1], c: 'red' })
    revised.push({ t: x[2], c: 'blue' })
    plain += pre + x[1]
    last = x.index + x[0].length
  }
  const rest = m.slice(last)
  if (rest) {
    original.push({ t: rest })
    revised.push({ t: rest })
  }
  plain += rest
  return { original, revised, plain }
}

const DICT = new Map<string, { original: Seg[]; revised: Seg[]; note: string }>()
const PLAIN_ESSAYS: string[] = ESSAYS.map((essay) =>
  essay
    .map((s) => {
      const p = parse(s.m)
      DICT.set(p.plain, { original: p.original, revised: p.revised, note: s.note ?? '' })
      return p.plain
    })
    .join(' '),
)

/** 학생에게 배정되는 mock 영어 에세이 (학생 id로 결정) */
export function essayFor(studentId: string): string {
  let h = 0
  for (const ch of studentId) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PLAIN_ESSAYS[h % PLAIN_ESSAYS.length]
}

const sid = (() => {
  let n = 0
  return () => `c${Date.now().toString(36)}${n++}`
})()

/** AI 1차 첨삭: 문장 단위로 나누고, 틀린 부분을 빨강(원문)/파랑(수정문)으로 표시하고 이유를 붙인다. (실제 AI 연동 시 교체) */
export function buildCorrection(text: string): CorrectionSentence[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? (text.trim() ? [text.trim()] : [])
  return sentences.map((s) => {
    const hit = DICT.get(s)
    return hit
      ? { id: sid(), original: hit.original.map((x) => ({ ...x })), revised: hit.revised.map((x) => ({ ...x })), note: hit.note }
      : { id: sid(), original: [{ t: s }], revised: [{ t: s }], note: '' }
  })
}
