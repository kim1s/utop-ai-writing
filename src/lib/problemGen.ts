import { findUnit, type TextbookSpecial, type TextbookUnit } from '../data/middleEnglishTextbooks'
import type { Criterion, Design, Problem } from './types'

const isUnit = (x: TextbookUnit | TextbookSpecial): x is TextbookUnit => 'thinkAndWrite' in x

export const emptyProblem = (): Problem => ({ topic: '', format: '', contents: [], grammar: [], length: '', etc: [] })

export const hasProblem = (p?: Problem) => !!p && !!(p.topic.trim() || p.format.trim() || p.contents.length || p.grammar.length || p.length.trim() || p.etc.length)

/** 학생 결과물에 붙는 과제 이름. 과제 조건의 주제를 쓰고, 없으면 평가명을 쓴다 */
export const taskTitle = (d: Pick<Design, 'name' | 'problem'>) => d.problem?.topic.trim() || d.name

/** 학년 수준에 맞춘 기본 분량 조건 */
const lengthFor = (grade: number) => {
  const [w, total] = grade <= 1 ? [3, 50] : grade === 2 ? [4, 70] : [5, 90]
  return `각 문장은 ${w}단어 이상, 전체 글은 ${total}단어 이상을 포함할 것`
}

const DEFAULT_ETC = ['한국어 사용 금지', '주어와 동사가 있는 문법에 맞는 문장을 작성할 것', '철자 및 어법 오류에 주의할 것']

/** 활동 설명에서 글의 형식을 짐작한다 (예: "감사 카드 쓰기" → 카드/편지글) */
function guessFormat(desc: string): string {
  if (/카드|편지/.test(desc)) return '편지글(카드)'
  if (/일기|기행문/.test(desc)) return '일기·기행문'
  if (/후기|리뷰|독후감/.test(desc)) return '후기글'
  if (/주장|의견|입장/.test(desc)) return '의견을 주장하는 글'
  if (/소개|설명/.test(desc)) return '소개하는 글'
  if (/규칙|지원서|홍보/.test(desc)) return '실용문'
  return '자유 형식의 글'
}

/** 성취기준 문장에서 글의 형식을 짐작한다 (교과서 활동에서 짐작한 형식보다 우선) */
function formatFromAchievement(text: string): string | null {
  if (/주장|의견/.test(text)) return '의견을 주장하는 글'
  if (/요약/.test(text)) return '요약문'
  if (/일기|편지|이메일/.test(text)) return '편지·일기·이메일 등의 글'
  if (/경험|계획/.test(text)) return '경험이나 계획을 설명하는 글'
  if (/묘사/.test(text)) return '묘사하는 글'
  if (/설명/.test(text)) return '설명하는 글'
  return null
}

const short = (t: string, n = 40) => (t.length > n ? `${t.slice(0, n).trim()}…` : t)

/**
 * AI 과제 조건 생성 시뮬레이션: 교과서 단원 내용 + 선생님이 선택한 성취기준을 바탕으로 만든다.
 * - 교과서 단원: 주제(Think and Write 활동), 필수 문법(Language Use), 핵심 표현
 * - 성취기준: 글의 형식, 필수 포함 내용(성취기준이 요구하는 수행)
 * 실제 생성형 AI API를 붙일 때 이 함수를 교체하면 된다.
 */
export function generateProblem(d: Design): Problem {
  const unit = findUnit(d.textbookId, d.unitId)
  const achs = d.achievements.filter((a) => a.text.trim())
  const length = lengthFor(d.grade)
  const achContents = achs.map((a) => `성취기준 반영: ${short(a.text.replace(/[.。]$/, ''))}`)
  const achFormat = achs.map((a) => formatFromAchievement(a.text)).find(Boolean) ?? null

  if (unit && isUnit(unit)) {
    const t = unit.thinkAndWrite
    return {
      topic: t.desc,
      format: achFormat ?? guessFormat(t.desc),
      contents: [`"${unit.title}" 단원에서 배운 핵심 표현 활용하기`, ...achContents, '마무리 문장 쓰기'],
      grammar: [...unit.languageUse],
      length,
      etc: DEFAULT_ETC,
    }
  }
  if (unit) {
    return {
      topic: `${unit.desc}에 대한 나의 생각과 느낌 쓰기`,
      format: achFormat ?? '감상문',
      contents: ['읽은 내용 간단히 소개하기', ...achContents, '나의 생각과 그렇게 생각한 이유'],
      grammar: [],
      length,
      etc: DEFAULT_ETC,
    }
  }
  const text = achs[0] ? achs[0].text.replace(/[.。]$/, '') : '자신이 알고 있는 주제'
  return {
    topic: achs[0] ? `성취기준("${text}")을 달성하는 영어 글쓰기` : '주어진 상황에 대해 영어로 글쓰기',
    format: achFormat ?? '자유 형식의 글',
    contents: achContents.length ? [...achContents, '이유나 근거 두 가지 이상', '마무리 문장'] : ['자신의 생각이나 주장', '이유나 근거 두 가지 이상', '마무리 문장'],
    grammar: [],
    length,
    etc: DEFAULT_ETC,
  }
}

/* ───────── 학원: 선생님 프롬프트 기반 과제 조건 생성 ───────── */

/** 입력란에 보여주는 프롬프트 예시 */
export const ACADEMY_PROMPT_EXAMPLES = [
  '현재완료를 사용해서 지난 주말에 한 일을 쓰는 문제 만들어줘',
  '친구에게 생일 파티 초대 이메일 쓰기, 60단어 이상',
  '환경 보호에 대한 내 의견 쓰기, because와 조동사 should 포함',
  '내가 가고 싶은 여행지를 소개하는 글 (미래 시제 will 사용)',
]

interface TopicSeed {
  topic: string
  format: string
  contents: string[]
  grammar: string[]
}

/** 학년별 기본 주제 은행: 프롬프트가 없으면 여기서 무작위로 고른다 */
const TOPIC_BANK: Record<'elem' | 'm1' | 'm2' | 'm3' | 'high', TopicSeed[]> = {
  elem: [
    { topic: '내가 좋아하는 동물을 소개하는 글 쓰기', format: '소개하는 글', contents: ['동물의 이름', '그 동물이 할 수 있는 것', '좋아하는 이유'], grammar: ['can'] },
    { topic: '나의 하루 일과 쓰기', format: '일기', contents: ['아침에 하는 일', '학교에서 하는 일', '저녁에 하는 일'], grammar: ['현재 시제'] },
    { topic: '우리 가족을 소개하는 글 쓰기', format: '소개하는 글', contents: ['가족 구성원', '각 가족이 좋아하는 것', '마무리 문장'], grammar: ['be동사'] },
    { topic: '내가 좋아하는 음식 소개하기', format: '소개하는 글', contents: ['음식 이름', '맛과 모양', '좋아하는 이유'], grammar: ['like'] },
  ],
  m1: [
    { topic: '친구에게 줄 선물을 소개하는 편지 쓰기', format: '편지글', contents: ['선물의 내용', '그 선물을 고른 이유', '마무리 인사'], grammar: ['to부정사', '접속사 because'] },
    { topic: '나의 주말 계획을 소개하는 글 쓰기', format: '계획을 설명하는 글', contents: ['주말에 할 일 두 가지', '함께할 사람', '기대되는 점'], grammar: ['미래 시제 will'] },
    { topic: '우리 학교의 좋은 점을 소개하는 글 쓰기', format: '소개하는 글', contents: ['좋은 점 두 가지', '그렇게 생각하는 이유', '마무리 문장'], grammar: ['접속사 because'] },
    { topic: '내가 좋아하는 계절과 그 이유 쓰기', format: '의견을 쓰는 글', contents: ['좋아하는 계절', '그 계절에 하는 활동', '좋아하는 이유'], grammar: ['현재 시제'] },
    { topic: '지난 방학에 있었던 일 일기로 쓰기', format: '일기', contents: ['간 곳이나 한 일', '함께한 사람', '느낀 점'], grammar: ['과거 시제'] },
  ],
  m2: [
    { topic: '내가 가장 기억에 남는 경험 쓰기', format: '경험을 설명하는 글', contents: ['언제, 어디서 있었던 일인지', '일어난 일의 순서', '그때의 느낌과 배운 점'], grammar: ['과거 시제', '현재완료'] },
    { topic: '학교에서 휴대전화를 사용해도 되는지에 대한 의견 쓰기', format: '의견을 주장하는 글', contents: ['자신의 입장', '이유 두 가지', '마무리 문장'], grammar: ['조동사 should', '접속사 because'] },
    { topic: '나의 롤모델을 소개하는 글 쓰기', format: '소개하는 글', contents: ['롤모델이 누구인지', '존경하는 이유', '내가 배우고 싶은 점'], grammar: ['관계대명사 who'] },
    { topic: '건강한 생활 습관에 대한 조언 쓰기', format: '조언하는 글', contents: ['조언 세 가지', '각 조언의 이유', '마무리 문장'], grammar: ['조동사 should', '명령문'] },
  ],
  m3: [
    { topic: '청소년에게 SNS가 미치는 영향에 대한 자신의 생각 쓰기', format: '의견을 주장하는 글', contents: ['자신의 입장', '근거와 예시 두 가지', '반대 의견에 대한 짧은 반박', '마무리 문장'], grammar: ['접속사 although', '관계대명사'] },
    { topic: '10년 후의 내 모습을 상상하며 쓰기', format: '계획을 설명하는 글', contents: ['미래의 직업과 생활', '그렇게 되기 위한 노력', '다짐 한 문장'], grammar: ['미래 시제 will', 'if 조건절'] },
    { topic: '우리 지역을 외국인 친구에게 소개하는 이메일 쓰기', format: '이메일', contents: ['지역 소개', '꼭 가봐야 할 곳 두 곳', '방문을 권하는 마무리'], grammar: ['수동태', 'to부정사'] },
    { topic: '환경 보호를 위해 내가 실천할 수 있는 일 쓰기', format: '의견을 주장하는 글', contents: ['환경 문제 한 가지', '실천 방법 두 가지', '기대 효과'], grammar: ['조동사 should', '접속사 because'] },
  ],
  high: [
    { topic: '인공지능이 학습에 미치는 영향에 대한 자신의 견해 논술하기', format: '논설문', contents: ['명확한 주장', '근거 두 가지와 구체적인 예', '반론과 재반박', '결론'], grammar: ['분사구문', '관계대명사'] },
    { topic: '지속 가능한 소비를 위한 실천 방안 제안하기', format: '제안하는 글', contents: ['문제 상황', '구체적인 제안 두 가지', '기대되는 변화'], grammar: ['가정법', '수동태'] },
    { topic: '내 인생에 가장 큰 영향을 준 사람이나 사건 서술하기', format: '경험을 설명하는 글', contents: ['사람이나 사건 소개', '그로 인한 변화', '현재의 나에게 주는 의미'], grammar: ['과거완료', '관계대명사'] },
  ],
}

const bandOf = (d: Pick<Design, 'schoolLevel' | 'grade'>) => (d.schoolLevel === '초' ? 'elem' : d.schoolLevel === '고' ? 'high' : d.grade <= 1 ? 'm1' : d.grade === 2 ? 'm2' : 'm3')

/** 프롬프트에서 문법 이름을 찾는다 */
const GRAMMAR_KEYWORDS: [RegExp, string][] = [
  [/현재\s*완료/, '현재완료'],
  [/과거\s*완료/, '과거완료'],
  [/과거\s*(시제|형)/, '과거 시제'],
  [/현재\s*진행/, '현재진행형'],
  [/미래|will|be going to/i, '미래 시제 will'],
  [/조동사|should/i, '조동사 should'],
  [/수동태/, '수동태'],
  [/비교급|최상급/, '비교급·최상급'],
  [/관계\s*대명사/, '관계대명사'],
  [/to\s*부정사|부정사/i, 'to부정사'],
  [/동명사/, '동명사'],
  [/because|접속사/i, '접속사 because'],
  [/if\s*조건|조건절/i, 'if 조건절'],
  [/가정법/, '가정법'],
  [/명령문/, '명령문'],
]

const pickRandom = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]

/**
 * 학원용 AI 과제 조건 생성 시뮬레이션.
 * - 선생님이 프롬프트를 입력하면: 프롬프트에서 주제·형식·문법·분량을 읽어 과제 조건을 만든다.
 * - 입력하지 않으면: 학년에 맞는 주제를 무작위로 만든다 (직전 주제는 피한다).
 * 성취기준·교과서 단원은 쓰지 않는다. 실제 생성형 AI API를 붙일 때 이 함수를 교체하면 된다.
 */
export function generateAcademyProblem(d: Pick<Design, 'schoolLevel' | 'grade'>, prompt: string, avoidTopic?: string): Problem {
  const text = prompt.replace(/\s+/g, ' ').trim()
  const bank = TOPIC_BANK[bandOf(d)]
  const randomSeed = () => pickRandom(bank.filter((b) => b.topic !== avoidTopic).length ? bank.filter((b) => b.topic !== avoidTopic) : bank)

  if (!text) {
    const s = randomSeed()
    return { topic: s.topic, format: s.format, contents: [...s.contents], grammar: [...s.grammar], length: lengthFor(d.grade), etc: [...DEFAULT_ETC] }
  }

  const grammar = GRAMMAR_KEYWORDS.filter(([re]) => re.test(text)).map(([, g]) => g)
  const words = text.match(/(\d+)\s*(?:단어|words?)/i)?.[1]
  const sentences = text.match(/(\d+)\s*문장/)?.[1]
  const length = words ? `각 문장은 ${d.grade <= 1 ? 3 : 4}단어 이상, 전체 글은 ${words}단어 이상을 포함할 것` : sentences ? `${sentences}문장 이상으로 쓸 것` : lengthFor(d.grade)

  // 주제: 요청 문구와 문법 지시 문구를 걷어내고 "~쓰기" 꼴로 다듬는다
  let topic = text
    .replace(/[,.!?]?\s*(?:과제|문제|주제)?\s*(?:를|을|로|으로)?\s*(?:좀\s*)?(?:만들어|내|생성해|출제해|짜)\s*(?:줘|주세요|줄래|달라)?[.!?]*$/, '')
    .replace(/\d+\s*(?:단어|words?|문장)\s*(?:이상|이내|정도)?/gi, '')
    .replace(/[(（][^)）]*[)）]/g, '')
    .replace(/,\s*[^,]*(?:포함|사용|활용)[^,]*$/, '')
    .replace(/(?:현재\s*완료|과거\s*완료|과거\s*(?:시제|형)|현재\s*진행|조동사|수동태|비교급|최상급|관계\s*대명사|부정사|동명사|가정법|명령문|if\s*조건절)[^\s,]*\s*(?:(?:should|will|can|must)\s*)?(?:(?:사용|활용|포함)\S*\s*)?/gi, '')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/쓰는(?:\s*(?:글|문제))?$/, '쓰기')
    .replace(/\s*[을를]\s*쓰기$/, ' 쓰기')
  if (topic.length < 4) {
    const s = randomSeed()
    return { topic: s.topic, format: s.format, contents: [...s.contents], grammar: grammar.length ? grammar : [...s.grammar], length, etc: [...DEFAULT_ETC] }
  }
  if (!/(쓰기|글|작성|소개|편지|이메일|일기)$/.test(topic)) topic = `${topic} 쓰기`

  return {
    topic,
    format: guessFormat(text),
    contents: ['주제를 소개하는 첫 문장', '구체적인 예시나 이유 두 가지 이상', '마무리 문장'],
    grammar,
    length,
    etc: [...DEFAULT_ETC],
  }
}

/**
 * AI 채점기준 생성 시뮬레이션: 교과서 단원 + 선생님이 선택한 성취기준 + 과제 조건을 바탕으로 만든다.
 * - 성취기준: 성취수준(상/중/하)별 채점요소
 * - 교과서 단원: 단원의 의사소통 기능·읽기 글을 활용했는지
 * - 과제 조건: 주제·형식·필수 포함 내용·필수 문법·분량·기타 조건 충족 여부
 * (과제 조건이 비어 있으면 교과서 단원과 성취기준만 반영한다)
 */
export function generateCriteria(d: Design): Criterion[] {
  const ach = d.achievements.filter((a) => a.text.trim() || a.levels.some((l) => l.text.trim()))
  const unit = findUnit(d.textbookId, d.unitId)
  const unitName = unit ? unit.title : ''
  const out: Criterion[] = []
  // 교과서 단원 활용 채점요소 (단원이 선택된 경우)
  const unitCriterion = (): Criterion | null => {
    if (!unit) return null
    const detail = isUnit(unit) ? `의사소통 기능(${unit.communicate.join(', ')})과 읽기 글 "${unit.read.title}"에서 배운 표현` : `"${unit.title}"에서 읽은 내용과 표현`
    return {
      element: `교과서 단원 내용 활용 (${unit.label}. ${unitName})`,
      scores: [
        { score: 2, desc: `${detail}을 활용하여 내용을 구체적으로 작성함.` },
        { score: 1, desc: '단원에서 배운 표현이나 내용을 일부만 활용함.' },
        { score: 0, desc: '단원에서 배운 표현이나 내용을 활용하지 않음.' },
      ],
    }
  }

  ach.forEach((a) => {
    const lv = a.levels.filter((l) => l.text.trim())
    const top = lv[0]?.text ?? a.text
    const short = (t: string) => t.replace(/[.,].*$/, '').slice(0, 26).trim() + (t.length > 26 ? ' …' : '')
    out.push({
      element: short(top) || '성취기준 달성',
      scores: [
        { score: 3, desc: lv[0]?.text ?? `${d.grade}학년 수준에서 핵심 내용을 정확하고 논리적으로 서술함.` },
        { score: 2, desc: lv[1]?.text ?? '핵심 내용을 대체로 정확하게 서술하였으나 일부 근거가 부족함.' },
        { score: 1, desc: lv[2]?.text ?? '핵심 내용을 일부만 서술함.' },
        { score: 0, desc: '핵심 내용에 대해 서술하지 않음.' },
      ],
    })
  })

  if (hasProblem(d.problem)) {
    const p = d.problem!
    const fmt = p.format.trim() ? `(${p.format})` : ''
    out.unshift({
      element: '주제에 맞는 글쓰기',
      scores: [
        { score: 3, desc: `주제 "${p.topic || taskTitle(d)}"에 맞게 ${fmt}형식을 갖추어 구체적으로 작성함.` },
        { score: 2, desc: '주제에 맞게 작성하였으나 형식이 부분적으로 맞지 않거나 내용이 구체적이지 않음.' },
        { score: 1, desc: '주제와 관련된 내용을 일부만 작성함.' },
        { score: 0, desc: '주제와 관련 없는 내용이거나 작성하지 않음.' },
      ],
    })
    const uc = unitCriterion()
    if (uc) out.push(uc)
    if (p.contents.length) {
      const list = p.contents.map((c, i) => `${i + 1}. ${c}`).join(' ')
      out.push({
        element: '필수 포함 내용 충족',
        scores: [
          { score: 3, desc: `필수 포함 내용(${list})을 모두 포함함.` },
          { score: 2, desc: '필수 포함 내용 중 한 가지가 빠지거나 불충분함.' },
          { score: 1, desc: '필수 포함 내용 중 일부만 포함함.' },
          { score: 0, desc: '필수 포함 내용을 포함하지 않음.' },
        ],
      })
    }
    if (p.grammar.length) {
      out.push({
        element: '필수 문법 사용',
        scores: [
          { score: 3, desc: `필수 문법(${p.grammar.join(', ')})을 모두 사용하고 형태와 쓰임이 정확함.` },
          { score: 2, desc: '필수 문법을 모두 사용하였으나 일부 형태·쓰임에 오류가 있음.' },
          { score: 1, desc: '필수 문법 중 일부만 사용함.' },
          { score: 0, desc: '필수 문법을 사용하지 않음.' },
        ],
      })
    }
    if (p.length.trim()) {
      out.push({
        element: '분량 충족',
        scores: [
          { score: 2, desc: `분량 조건(${p.length})을 충족함.` },
          { score: 1, desc: '분량 조건에 다소 못 미치나 70% 이상 작성함.' },
          { score: 0, desc: '분량 조건의 70%에도 미치지 못함.' },
        ],
      })
    }
    out.push({
      element: p.etc.length ? '기타 조건 및 정확성' : '어휘와 문장의 정확성',
      scores: [
        { score: 2, desc: p.etc.length ? `기타 조건(${p.etc.join(' / ')})을 지키고 오류가 의미 전달에 거의 영향을 주지 않음.` : '적절한 어휘를 사용하고 철자·문법 오류가 의미 전달에 거의 영향을 주지 않음.' },
        { score: 1, desc: p.etc.length ? '기타 조건을 대체로 지켰고 오류가 일부 있으나 전체 의미는 이해 가능함.' : '오류가 일부 있으나 전체 의미는 이해 가능함.' },
        { score: 0, desc: p.etc.length ? '기타 조건을 지키지 않았거나 오류가 많아 의미 파악이 어려움.' : '오류가 많아 의미 파악이 어려움.' },
      ],
    })
    return out
  }

  out.push({
    element: unitName ? `단원 내용 활용 (${unitName})` : '근거를 들어 설명하기',
    scores: [
      { score: 2, desc: unitName ? `"${unitName}" 단원에서 배운 표현과 내용을 활용하여 구체적으로 설명함.` : '자료와 연계된 구체적 근거를 제시하여 타당하게 설명함.' },
      { score: 1, desc: unitName ? '단원에서 배운 표현이나 내용을 일부만 활용함.' : '근거를 제시하였으나 자료와의 연계가 부족함.' },
      { score: 0, desc: unitName ? '단원 내용을 활용하지 않음.' : '근거를 제시하지 않음.' },
    ],
  })
  out.push({
    element: '어휘와 문장의 정확성',
    scores: [
      { score: 2, desc: '적절한 어휘를 사용하고 철자·문법 오류가 의미 전달에 거의 영향을 주지 않음.' },
      { score: 1, desc: '오류가 일부 있으나 전체 의미는 이해 가능함.' },
      { score: 0, desc: '오류가 많아 의미 파악이 어려움.' },
    ],
  })
  return out
}
