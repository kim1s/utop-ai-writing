import { CURRENT_YEAR, SUBJECT_OPTIONS } from './seed'
import type { Achievement, Criterion, Design, GradeRow } from './types'

export const emptyCriterion = (): Criterion => ({ element: '', scores: [{ score: 2, desc: '' }, { score: 1, desc: '' }, { score: 0, desc: '' }] })
export const emptyAchievement = (): Achievement => ({ code: '', text: '', levels: [{ label: '상', text: '' }, { label: '중', text: '' }, { label: '하', text: '' }] })
export const defaultGrades = (): GradeRow[] => [
  { label: 'A', converted: null, max: null, min: null },
  { label: 'B', converted: null, max: null, min: 0 },
]

/** "평가 만들기"를 누르면 곧바로 만들어지는 빈 평가(임시저장 상태) */
export function blankDesign(id: string, ownerName: string, subjects: string[]): Design {
  return {
    id,
    name: '새 평가',
    schoolLevel: '중',
    grade: 1,
    year: CURRENT_YEAR,
    semester: 1,
    subject: subjects[0] ?? SUBJECT_OPTIONS[0],
    targetIds: [],
    visibility: 'school',
    achievements: [emptyAchievement()],
    criteria: [emptyCriterion()],
    scoreMode: 'raw',
    grades: defaultGrades(),
    absentUnsubmitted: 0,
    absentNonresponse: 0,
    status: 'draft',
    ownerName,
    updatedAt: new Date().toISOString().slice(0, 10),
  }
}
