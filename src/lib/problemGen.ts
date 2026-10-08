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
