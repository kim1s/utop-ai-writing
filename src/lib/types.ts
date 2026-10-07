export type SchoolLevel = '초' | '중' | '고'

export interface Student {
  id: string
  year: number
  grade: number
  cls: number
  num: number
  name: string
}

export interface Teacher {
  id: string
  name: string
  subjects: string[]
  email: string
}

export interface Notice {
  id: string
  title: string
  date: string
  isNew?: boolean
  body: string
}

export interface AchievementLevel {
  label: string
  text: string
}

export interface Achievement {
  /** 영역 (예: 이해, 표현) */
  area?: string
  code: string
  text: string
  levels: AchievementLevel[]
  custom?: boolean
}

export interface CriterionScore {
  score: number
  desc: string
}

export interface Criterion {
  element: string
  scores: CriterionScore[]
}

export interface GradeRow {
  label: string
  converted: number | null
  max: number | null
  min: number | null
}

export interface SheetBlock {
  id: string
  type: 'text' | 'image' | 'question'
  /** text/question: 본문, image: data URL */
  content: string
  caption?: string
}

export interface Problem {
  /** 학생에게 노출되는 과제명 */
  title: string
  /** 학생에게 과제를 설명하는 글 */
  description: string
  /** 분량 (예: 5~7문장) */
  length: string
  /** 필수 포함 문법 */
  grammar: string[]
  /** 시험지 구성 요소 (지문·이미지·문제) */
  sheet: SheetBlock[]
}

export interface Design {
  id: string
  /** 선생님이 평가를 구분하기 위한 이름 (학생에게는 보이지 않음) */
  name: string
  /** 문제 (선택): 학생에게 보여 주는 과제명·설명·시험지. 과제명은 문제의 title */
  problem?: Problem
  /** 학교급 */
  schoolLevel: SchoolLevel
  /** 학년 */
  grade: number
  /** 교과서 / 단원 (선택). 단원 하위 내용은 화면에 노출하지 않고 과제 생성 참고용으로만 보관 */
  textbookId?: string
  unitId?: string
  year: number
  semester: 1 | 2
  subject: string
  /** 평가 대상 학생 id */
  targetIds: string[]
  visibility: 'school' | 'private'
  achievements: Achievement[]
  criteria: Criterion[]
  scoreMode: 'raw' | 'grade'
  grades: GradeRow[]
  absentUnsubmitted: number
  absentNonresponse: number
  status: 'draft' | 'saved'
  ownerName: string
  updatedAt: string
  /** 평가 자료실에서 가져온 경우 원본 */
  fromLibrary?: boolean
}

export interface SubmissionFile {
  name: string
  /** 업로드 원본(Blob) 조회 키. 없으면 name */
  key?: string
  uploadedAt: string
  by: string
  pages?: string
}

export interface Submission {
  files: SubmissionFile[]
  /** 학생 답안 텍스트 (OCR 인식 결과 또는 선생님이 직접 입력한 내용) */
  text?: string
  textSource?: 'ocr' | 'typed'
}

export type TextColor = 'red' | 'blue' | 'black'

/** 색이 같은 글자 구간 (c가 없으면 검정) */
export interface Seg {
  t: string
  c?: TextColor
}

/** 첨삭 한 문장: 학생 원문, 수정문, 수정 이유(선생님이 수정 가능) */
export interface CorrectionSentence {
  id: string
  original: Seg[]
  revised: Seg[]
  note: string
}

export type AbsenceType = 'scoring' | 'nonresponse' | 'unsubmitted'

export interface StudentScore {
  absence: AbsenceType
  /** 채점기준별 선택된 점수 (null = 미선택) */
  picks: (number | null)[]
  /** AI 제안 점수 */
  aiPicks: (number | null)[]
  evidenceAnalysis: string
  evidenceRubric: string
  teacherFeedback: string
  /** AI 1차 첨삭 + 선생님 수정 */
  correction?: CorrectionSentence[]
  done: boolean
}

export interface GradingRun {
  state: 'idle' | 'running' | 'done'
  /** 처리된 학생 수 */
  progress: number
}

export interface LibraryItem {
  id: string
  title: string
  subject: string
  schoolLevel: SchoolLevel
  grade: number
  ownerName: string
  school: string
  updatedAt: string
  design: Pick<Design, 'achievements' | 'criteria' | 'scoreMode' | 'grades' | 'absentUnsubmitted' | 'absentNonresponse'>
}

export interface Faq {
  q: string
  a: string
}
