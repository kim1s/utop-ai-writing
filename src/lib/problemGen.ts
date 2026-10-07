import { findUnit, type TextbookSpecial, type TextbookUnit } from '../data/middleEnglishTextbooks'
import { uid } from './store'
import type { Criterion, Design, Problem } from './types'

const isUnit = (x: TextbookUnit | TextbookSpecial): x is TextbookUnit => 'thinkAndWrite' in x

export const hasProblem = (p?: Problem) => !!p && !!(p.title.trim() || p.description.trim() || p.sheet.length || p.grammar.length)

/** 학생에게 보여 주는 과제명. 문제가 없으면 평가명을 사용 */
export const taskTitle = (d: Pick<Design, 'name' | 'problem'>) => d.problem?.title.trim() || d.name

export const emptyProblem = (): Problem => ({ title: '', description: '', length: '', grammar: [], sheet: [] })

const lengthFor = (grade: number) => (grade <= 1 ? '5~7문장 (약 50~70 단어)' : grade === 2 ? '6~8문장 (약 70~90 단어)' : '8~10문장 (약 90~120 단어)')

/**
 * AI 문제 생성 시뮬레이션: 성취기준 + 교과서 단원 정보를 바탕으로 영어 라이팅 과제를 만든다.
 * 실제 생성형 AI API를 붙일 때 이 함수를 교체하면 된다.
 */
const lengthEn = (grade: number) => (grade <= 1 ? '5-7 sentences' : grade === 2 ? '6-8 sentences' : '8-10 sentences')

export function generateProblem(d: Design): Problem {
  const unit = findUnit(d.textbookId, d.unitId)
  const ach = d.achievements.find((a) => a.text.trim())
  const length = lengthFor(d.grade)
  const block = (type: 'text' | 'question', content: string) => ({ id: uid('b'), type, content })

  if (unit && isUnit(unit)) {
    const t = unit.thinkAndWrite
    return {
      title: t.title,
      description: `수업 시간에 배운 "${unit.label}. ${unit.title}" 단원의 내용을 바탕으로 다음 과제를 수행해 보세요.\n과제: ${t.desc}. 아래 자료를 참고하여 영어로 작성하세요.`,
      length,
      grammar: unit.languageUse,
      sheet: [
        block('text', `[Reading Material]\nLast week, our class read about "${unit.read.title}". It gave us many ideas and new expressions.\nRemember the key sentences and the story as you write.\n(참고: ${unit.read.desc})`),
        block('question', `Write about "${t.title}" in English. (${t.desc})\n- Use the key expressions you learned in this unit.\n- Write ${lengthEn(d.grade)}.`),
        block('question', `Underline the grammar you used: ${unit.languageUse.join(', ')}`),
      ],
    }
  }
  if (unit) {
    return {
      title: unit.title,
      description: `${unit.label}에서 읽은 내용을 떠올려 보세요. ${unit.desc}. 읽은 내용에 대한 나의 생각과 느낌을 영어로 작성하세요.`,
      length,
      grammar: [],
      sheet: [
        block('text', `[Reading Material]\nYou read "${unit.title}" in class. Think about the most interesting part.`),
        block('question', `Write about what you learned and how you felt. Write ${lengthEn(d.grade)}.`),
      ],
    }
  }
  const topic = ach ? ach.text.replace(/[.。]$/, '') : '자신이 알고 있는 주제'
  return {
    title: ach ? `Writing Task (${ach.code || 'Free Topic'})` : 'Writing Task',
    description: ach ? `성취기준 "${topic}"을(를) 달성했는지 확인하는 과제입니다. 주어진 상황을 읽고 영어로 글을 작성해 보세요.` : '주어진 상황을 읽고 영어로 글을 작성해 보세요.',
    length,
    grammar: [],
    sheet: [
      block('text', '[Situation]\nYour school is preparing a class event. Your teacher asks every student to share an idea.'),
      block('question', `Write your idea and give reasons. Write ${lengthEn(d.grade)}.`),
    ],
  }
}

/**
 * AI 채점기준 생성 시뮬레이션.
 * - 문제가 있으면: 분량·필수 문법·과제 수행 여부가 채점기준에 반영된다.
 * - 문제가 없으면: 기본 정보(학년·교과서 단원)와 성취기준만 반영한다.
 */
export function generateCriteria(d: Design): Criterion[] {
  const ach = d.achievements.filter((a) => a.text.trim() || a.levels.some((l) => l.text.trim()))
  const unit = findUnit(d.textbookId, d.unitId)
  const unitName = unit ? unit.title : ''
  const out: Criterion[] = []

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
    out.unshift({
      element: '과제 수행 및 내용',
      scores: [
        { score: 3, desc: `"${p.title || taskTitle(d)}" 과제의 요구를 모두 충족하여 주제에 맞는 내용을 구체적으로 작성함.` },
        { score: 2, desc: '과제의 요구를 대체로 충족하였으나 내용이 일부 부족하거나 구체성이 떨어짐.' },
        { score: 1, desc: '과제와 관련된 내용을 일부만 작성함.' },
        { score: 0, desc: '과제와 관련 없는 내용이거나 작성하지 않음.' },
      ],
    })
    if (p.length.trim()) {
      out.push({
        element: '분량 충족',
        scores: [
          { score: 2, desc: `요구 분량(${p.length})을 충족함.` },
          { score: 1, desc: `요구 분량(${p.length})에 다소 못 미치나 70% 이상 작성함.` },
          { score: 0, desc: '요구 분량의 70%에도 미치지 못함.' },
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
  } else {
    out.push({
      element: unitName ? `단원 내용 활용 (${unitName})` : '근거를 들어 설명하기',
      scores: [
        { score: 2, desc: unitName ? `"${unitName}" 단원에서 배운 표현과 내용을 활용하여 구체적으로 설명함.` : '자료와 연계된 구체적 근거를 제시하여 타당하게 설명함.' },
        { score: 1, desc: unitName ? '단원에서 배운 표현이나 내용을 일부만 활용함.' : '근거를 제시하였으나 자료와의 연계가 부족함.' },
        { score: 0, desc: unitName ? '단원 내용을 활용하지 않음.' : '근거를 제시하지 않음.' },
      ],
    })
  }

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
