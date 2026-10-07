import { buildCorrection, essayFor } from './essays'
import type { Criterion, Design, StudentScore } from './types'

export const criterionMax = (c: Criterion) => (c.scores.length ? Math.max(...c.scores.map((s) => s.score)) : 0)
export const designMax = (d: Pick<Design, 'criteria'>) => d.criteria.reduce((a, c) => a + criterionMax(c), 0)

export function rawTotal(picks: (number | null)[]): number {
  return picks.reduce<number>((a, p) => a + (p ?? 0), 0)
}

/** 환산 방식을 반영한 최종 점수 */
export function finalScore(design: Design, score: StudentScore | undefined): number | null {
  if (!score) return null
  if (score.absence === 'unsubmitted') return design.absentUnsubmitted
  if (score.absence === 'nonresponse') return design.absentNonresponse
  if (!score.done) return null
  const raw = rawTotal(score.picks)
  if (design.scoreMode === 'grade') {
    const g = design.grades.find((g) => (g.min ?? -Infinity) <= raw && raw <= (g.max ?? Infinity) && g.converted != null)
    return g?.converted ?? raw
  }
  return raw
}

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let s = seed || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 10000) / 10000
  }
}

/** 점수 후보에서 높은 점수에 가중치를 두고 선택 (AI 채점 시뮬레이션) */
function pickScore(c: Criterion, r: number): number {
  const sorted = [...c.scores].map((s) => s.score).sort((a, b) => b - a)
  if (!sorted.length) return 0
  const weights = sorted.map((_, i) => Math.pow(0.42, i))
  const total = weights.reduce((a, b) => a + b, 0)
  let acc = 0
  for (let i = 0; i < sorted.length; i++) {
    acc += weights[i] / total
    if (r <= acc) return sorted[i]
  }
  return sorted[sorted.length - 1]
}

export function simulateAiScore(design: Design, studentId: string, answerText?: string): StudentScore {
  const rand = rng(hash(design.id + studentId))
  const picks = design.criteria.map((c) => pickScore(c, rand()))
  const descOf = (c: Criterion, v: number) => c.scores.find((s) => s.score === v)?.desc ?? ''

  const evidenceAnalysis = design.criteria
    .map((c, i) => `• [${c.element}] 학생 답안을 분석한 결과, ${descOf(c, picks[i])}`.replace(/\.$/, '') + ' 점이 확인됨.')
    .join('\n')

  const evidenceRubric = design.criteria
    .map((c, i) => {
      const max = criterionMax(c)
      return `• ${c.element} (${picks[i]}/${max}점): 채점기준 "${descOf(c, picks[i])}"에 해당하는 것으로 판단함.`
    })
    .join('\n')

  const strong: string[] = []
  const weak: string[] = []
  design.criteria.forEach((c, i) => {
    if (picks[i] >= criterionMax(c)) strong.push(`- ${c.element}: 요구 수준을 충족함`)
    else weak.push(`- ${c.element}: ${picks[i] === 0 ? '서술이 필요함' : '근거와 설명을 보완하면 좋겠음'}`)
  })
  const total = rawTotal(picks)
  const max = designMax(design)
  const lead =
    total >= max * 0.85
      ? '핵심 개념을 정확히 이해하고 논리적으로 서술한 점이 매우 우수합니다.'
      : total >= max * 0.6
        ? '핵심 개념을 대체로 이해하고 있으나 일부 근거 제시가 아쉽습니다.'
        : '기본 개념 이해가 필요하며 답안의 근거를 구체적으로 서술하는 연습이 필요합니다.'
  const teacherFeedback = `${lead}\n\n〔잘한 점〕\n${strong.join('\n') || '- 문항의 요구를 파악하려는 시도가 돋보임'}\n\n〔보완할 점〕\n${weak.join('\n') || '- 구체적인 예시를 추가하면 더욱 좋겠음'}`

  return {
    absence: 'scoring',
    picks: picks.map(() => null),
    aiPicks: picks,
    evidenceAnalysis,
    evidenceRubric,
    teacherFeedback,
    correction: buildCorrection(answerText ?? essayFor(studentId)),
    done: false,
  }
}

export function emptyScore(design: Design): StudentScore {
  const n = design.criteria.length
  return {
    absence: 'scoring',
    picks: Array(n).fill(null),
    aiPicks: Array(n).fill(null),
    evidenceAnalysis: '',
    evidenceRubric: '',
    teacherFeedback: '',
    done: false,
  }
}

export function gradeLabel(design: Design, raw: number): string | null {
  if (design.scoreMode !== 'grade') return null
  return design.grades.find((g) => (g.min ?? -Infinity) <= raw && raw <= (g.max ?? Infinity))?.label ?? null
}

export type RowStatus = 'unsubmitted' | 'waiting' | 'done' | 'nonresponse'

/** 학생 한 명의 채점 상태 (제출 여부 + 교사 확정 여부) */
export function rowStatus(score: StudentScore | undefined, hasSubmission: boolean): RowStatus {
  if (score?.absence === 'nonresponse') return 'nonresponse'
  if (score?.absence === 'unsubmitted' || (!hasSubmission && !score?.done)) return 'unsubmitted'
  return score?.done ? 'done' : 'waiting'
}

/** 리포트/표에 쓰는 최종 점수. 아직 채점되지 않았으면 null */
export function resolvedScore(design: Design, score: StudentScore | undefined, hasSubmission: boolean): number | null {
  const st = rowStatus(score, hasSubmission)
  if (st === 'unsubmitted') return design.absentUnsubmitted
  if (st === 'nonresponse') return design.absentNonresponse
  if (st === 'done') return finalScore(design, score)
  return null
}

/** OCR 결과 시뮬레이션: 학생 답안(영어 에세이)을 텍스트로 변환 (실제 OCR 연동 시 이 함수를 교체) */
export function simulateOcrText(_design: Design, studentId: string): string {
  return essayFor(studentId)
}
