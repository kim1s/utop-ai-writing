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

/** 과제 조건: 주제 - 형식 - 필수 포함 내용 - 필수 포함 문법 - 분량 - 기타 */
export interface Problem {
  /** 주제 (예: 친구에게 줄 선물을 소개하는 편지 글쓰기) */
  topic: string
  /** 형식 (예: 편지글) */
  format: string
  /** 필수 포함 내용 (번호 순서대로) */
  contents: string[]
  /** 필수 포함 문법 */
  grammar: string[]
  /** 분량 (예: 각 문장은 3단어 이상, 전체 글은 50단어 이상) */
  length: string
  /** 기타 조건 */
  etc: string[]
}

export interface Design {
  id: string
  /** 선생님이 평가를 구분하기 위한 이름 (학생에게는 보이지 않음) */
  name: string
  /** 과제 조건 (필수). 주제는 학생 결과물에 과제 이름으로 쓰인다 */
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

/** AI 세특 (생활기록부 세부능력 및 특기사항) */
export interface Seteuk {
  keywords: string[]
  draft: string
  confirmed: boolean
}

export interface StudentScore {
  absence: AbsenceType
  /** 채점기준별 선택된 점수 (null = 미선택) */
  picks: (number | null)[]
  /** AI 제안 점수 */
  aiPicks: (number | null)[]
  /** AI 채점 근거 (채점요소별) */
  evidence: string
  teacherFeedback: string
  /** AI 1차 첨삭 + 선생님 수정 */
  correction?: CorrectionSentence[]
  seteuk?: Seteuk
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
