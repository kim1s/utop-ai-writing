import { criterionMax, designMax, rawTotal } from './grading'
import { findUnit } from '../data/middleEnglishTextbooks'
import { taskTitle } from './problemGen'
import type { Design, Seteuk, StudentScore } from './types'

const shorten = (t: string, n: number) => (t.length > n ? `${t.slice(0, n).trim()}…` : t)

/**
 * AI 세특 생성 시뮬레이션: 학생 제출 내용(영어 에세이)과 AI 평가(채점 결과·첨삭)를 바탕으로
 * 생활기록부 세부능력 및 특기사항에 넣을 키워드와 초안을 만든다. (실제 생성형 AI 연동 시 이 함수를 교체)
 */
export function generateSeteuk(design: Design, score: StudentScore, answerText: string): Seteuk {
  const title = taskTitle(design)
  const p = design.problem
  const unit = findUnit(design.textbookId, design.unitId)
  // 선생님이 확정한 점수가 있으면 그 점수를, 아직이면 AI 제안 점수를 기준으로 한다
  const picks = score.done ? score.picks : score.aiPicks
  const total = rawTotal(picks)
  const ratio = designMax(design) ? total / designMax(design) : 0

  // 만점을 받은 채점요소는 강점, 그 외는 보완점
  const strong = design.criteria.filter((c, i) => (picks[i] ?? 0) >= criterionMax(c))
  const corrections = (score.correction ?? []).filter((c) => c.note.trim())
  // 세특에는 학생 문장을 그대로 옮기기보다 오류가 고쳐진 첫 문장을 인용한다
  const firstSentence = score.correction?.[0]?.revised.map((g) => g.t).join('').trim() ?? answerText.match(/[^.!?]+[.!?]/)?.[0]?.trim()

  const keywords = [
    shorten(title, 22),
    p?.format ? shorten(p.format, 14) : '',
    ...(p?.grammar ?? []).slice(0, 2),
    ...strong.slice(0, 2).map((c) => shorten(c.element.replace(/\s*\(.*\)$/, ''), 14)),
    unit ? `${unit.label}` : '',
    corrections.length ? '스스로 고쳐 쓰기' : '',
  ].filter(Boolean)

  const sentences: string[] = []
  sentences.push(
    `${shorten(title, 40)} 과제에서${p?.format ? ` ${p.format} 형식으로` : ''}${firstSentence ? ` "${shorten(firstSentence, 60)}"라고 자신의 생각을 밝히며` : ' 자신의 생각을'} 영어로 글을 작성함.`,
  )
  if (strong.length) {
    sentences.push(`${strong.slice(0, 2).map((c) => `${c.element.replace(/\s*\(.*\)$/, '')} 면에서 ${(c.scores.find((x) => x.score === criterionMax(c))?.desc ?? '요구 수준을 충족함').replace(/[.。]$/, '')}`).join(', ')}.`)
  }
  if (p?.grammar.length) sentences.push(`${p.grammar.slice(0, 2).join(', ')} 등 학습한 문법을 글 속에서 활용하려고 노력함.`)
  if (corrections.length) sentences.push(`교사의 첨삭 과정에서 문법 오류의 이유를 이해하고 바르게 고쳐 쓰는 방법을 익힘.`)
  sentences.push(
    ratio >= 0.85
      ? '전반적으로 주제에 맞는 내용을 논리적으로 구성하는 능력이 우수하며 영어 쓰기에 대한 자신감이 돋보임.'
      : ratio >= 0.6
        ? '주제에 맞는 내용을 대체로 잘 구성하였으며 근거를 구체화하는 연습을 통해 더욱 성장할 것으로 기대됨.'
        : '기본 문장을 구성하는 힘을 기르고 있으며 꾸준한 쓰기 연습을 통해 발전이 기대됨.',
  )

  return { keywords, draft: sentences.join(' '), confirmed: false }
}
