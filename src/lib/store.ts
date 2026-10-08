import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { blankDesign } from './blank'
import { emptyScore, simulateAiScore, simulateOcrText } from './grading'
import { CURRENT_YEAR, ME, SAMPLE_CRITERIA, SAMPLE_LIBRARY, SEED_NOTICES, SEED_STUDENTS, SEED_TEACHERS } from './seed'
import { generateSeteuk } from './seteuk'
import { MIDDLE_ENGLISH } from '../data/middleEnglishAchievements'
import type { Design, GradingRun, LibraryItem, Notice, Student, StudentScore, Submission, SubmissionFile, Teacher } from './types'

export const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`
export const nowStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const today = () => new Date().toISOString().slice(0, 10)

interface Data {
  me: Teacher
  teachers: Teacher[]
  notices: Notice[]
  students: Student[]
  /** 평가 (수업/반 개념 없이 평가가 최상위 단위) */
  designs: Design[]
  /** key: `${designId}:${studentId}` */
  submissions: Record<string, Submission>
  /** key: `${designId}:${studentId}` */
  scores: Record<string, StudentScore>
  /** key: designId */
  runs: Record<string, GradingRun>
  library: LibraryItem[]
}

interface Actions {
  setMySubjects: (subjects: string[]) => void
  addStudents: (list: Omit<Student, 'id'>[]) => void
  updateStudent: (id: string, patch: Partial<Student>) => void
  deleteStudents: (ids: string[]) => void
  setTargets: (designId: string, ids: string[]) => void
  createDesign: () => string
  saveDesign: (d: Design) => void
  deleteDesign: (id: string) => void
  copyDesign: (id: string) => string
  importLibrary: (libId: string) => string
  setSubmission: (designId: string, studentId: string, sub: Submission | null) => void
  setSubmissionText: (designId: string, studentId: string, text: string) => void
  bulkSubmissions: (designId: string, items: { studentId: string; file: SubmissionFile | null }[]) => void
  startGrading: (designId: string) => void
  tickGrading: (designId: string) => void
  setScore: (designId: string, studentId: string, patch: Partial<StudentScore>) => void
  resetEmpty: () => void
  loadDemo: () => void
}

function baseData(): Data {
  return {
    me: ME,
    teachers: SEED_TEACHERS,
    notices: SEED_NOTICES,
    students: [],
    designs: [],
    submissions: {},
    scores: {},
    runs: {},
    library: SAMPLE_LIBRARY,
  }
}

/** AI 채점 결과에 AI 세특을 함께 붙인다 (이미 있으면 유지) */
const withSeteuk = (design: Design, sc: StudentScore, text: string): StudentScore => ({ ...sc, seteuk: sc.seteuk ?? generateSeteuk(design, sc, text) })

export const DEMO_DESIGN_ID = 'd-demo-1'

function demoData(): Data {
  const students = SEED_STUDENTS
  const targetIds = students.filter((s) => s.grade === 1 && s.cls === 1).slice(0, 15).map((s) => s.id)
  const design: Design = {
    id: DEMO_DESIGN_ID,
    name: '1학기 중간 서술형 1-1반',
    problem: {
      topic: '학교에서 쓰레기를 줄여야 하는지에 대한 자신의 의견 쓰기',
      format: '의견을 주장하는 글',
      contents: ['자신의 입장(찬성 또는 반대)', '이유 두 가지 이상', '마무리 문장'],
      grammar: ['조동사 should', '접속사 because'],
      length: '각 문장은 3단어 이상, 전체 글은 60단어 이상을 포함할 것',
      etc: ['한국어 사용 금지', '주어와 동사가 있는 문법에 맞는 문장을 작성할 것', '철자 및 어법 오류에 주의할 것'],
    },
    schoolLevel: '중',
    grade: 1,
    textbookId: 'eng1',
    unitId: 'u5',
    year: CURRENT_YEAR,
    semester: 1,
    subject: '영어',
    targetIds,
    visibility: 'school',
    achievements: [MIDDLE_ENGLISH.find((a) => a.code === '[9영02-06]')!],
    criteria: SAMPLE_CRITERIA,
    scoreMode: 'raw',
    grades: [],
    absentUnsubmitted: 0,
    absentNonresponse: 0,
    status: 'saved',
    ownerName: ME.name,
    updatedAt: '2026-02-09',
  }
  const lib = SAMPLE_LIBRARY[1]
  const second: Design = {
    ...structuredClone(lib.design),
    id: 'd-demo-2',
    name: '1학기 수행평가 요약하기',
    schoolLevel: lib.schoolLevel,
    grade: lib.grade,
    year: CURRENT_YEAR,
    semester: 1,
    subject: '영어',
    targetIds: [],
    visibility: 'school',
    status: 'saved',
    ownerName: ME.name,
    updatedAt: '2026-02-12',
  }
  const submissions: Record<string, Submission> = {}
  targetIds.forEach((sid, i) => {
    if (i === 1) return
    submissions[`${design.id}:${sid}`] = { files: [{ name: '1_260210업로드.pdf', uploadedAt: '02/10 10:04', by: '선생님', pages: '1~2' }], text: simulateOcrText(design, sid), textSource: 'ocr' }
  })
  // 데모: AI 채점이 끝난 상태. 앞쪽 8명은 선생님 채점까지 확정해 리포트를 바로 볼 수 있게 한다
  const scores: Record<string, StudentScore> = {}
  const submitted = targetIds.filter((sid) => submissions[`${design.id}:${sid}`])
  submitted.forEach((sid, i) => {
    const key = `${design.id}:${sid}`
    const ai = simulateAiScore(design, sid, submissions[key].text)
    const sc: StudentScore = i < 8 ? { ...ai, picks: [...ai.aiPicks], done: true } : ai
    scores[key] = withSeteuk(design, sc, submissions[key].text ?? '')
  })
  const runs = { [design.id]: { state: 'done' as const, progress: submitted.length } }
  return { ...baseData(), students, designs: [design, second], submissions, scores, runs }
}

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...demoData(),

      setMySubjects: (subjects) => set((s) => ({ me: { ...s.me, subjects }, teachers: s.teachers.map((t) => (t.id === s.me.id ? { ...t, subjects } : t)) })),

      addStudents: (list) =>
        set((s) => {
          const map = new Map(s.students.map((x) => [`${x.year}-${x.grade}-${x.cls}-${x.num}`, x]))
          list.forEach((n) => {
            const key = `${n.year}-${n.grade}-${n.cls}-${n.num}`
            const old = map.get(key)
            map.set(key, { ...n, id: old?.id ?? `s-${n.year}-${n.grade}${n.cls}${String(n.num).padStart(2, '0')}` })
          })
          return { students: [...map.values()] }
        }),

      updateStudent: (id, patch) => set((s) => ({ students: s.students.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

      deleteStudents: (ids) =>
        set((s) => ({
          students: s.students.filter((x) => !ids.includes(x.id)),
          designs: s.designs.map((d) => ({ ...d, targetIds: d.targetIds.filter((i) => !ids.includes(i)) })),
        })),

      setTargets: (designId, ids) =>
        set((s) => {
          const prev = s.designs.find((d) => d.id === designId)?.targetIds ?? []
          const removed = prev.filter((i) => !ids.includes(i))
          const submissions = { ...s.submissions }
          const scores = { ...s.scores }
          removed.forEach((sid) => {
            delete submissions[`${designId}:${sid}`]
            delete scores[`${designId}:${sid}`]
          })
          return { designs: s.designs.map((d) => (d.id === designId ? { ...d, targetIds: ids } : d)), submissions, scores }
        }),

      createDesign: () => {
        const id = uid('d')
        set((s) => ({ designs: [...s.designs, blankDesign(id, s.me.name, s.me.subjects)] }))
        return id
      },

      saveDesign: (d) =>
        set((s) => {
          const exists = s.designs.some((x) => x.id === d.id)
          const next = { ...d, updatedAt: today() }
          return { designs: exists ? s.designs.map((x) => (x.id === d.id ? next : x)) : [...s.designs, next] }
        }),

      deleteDesign: (id) =>
        set((s) => {
          const prefix = `${id}:`
          const submissions = Object.fromEntries(Object.entries(s.submissions).filter(([k]) => !k.startsWith(prefix)))
          const scores = Object.fromEntries(Object.entries(s.scores).filter(([k]) => !k.startsWith(prefix)))
          const runs = { ...s.runs }
          delete runs[id]
          return { designs: s.designs.filter((d) => d.id !== id), submissions, scores, runs }
        }),

      copyDesign: (id) => {
        const src = get().designs.find((d) => d.id === id)
        if (!src) return ''
        const nid = uid('d')
        set((s) => ({
          designs: [...s.designs, { ...structuredClone(src), id: nid, name: `${src.name} (복사)`, targetIds: [], ownerName: s.me.name, status: 'draft', updatedAt: today() }],
        }))
        return nid
      },

      importLibrary: (libId) => {
        const lib = get().library.find((l) => l.id === libId)
        if (!lib) return ''
        const nid = uid('d')
        set((s) => ({
          designs: [
            ...s.designs,
            {
              ...structuredClone(lib.design),
              id: nid,
              name: lib.title,
              schoolLevel: lib.schoolLevel,
              grade: lib.grade,
              year: CURRENT_YEAR,
              semester: 1,
              subject: lib.subject,
              targetIds: [],
              visibility: 'school',
              status: 'draft',
              ownerName: s.me.name,
              updatedAt: today(),
              fromLibrary: true,
            },
          ],
        }))
        return nid
      },

      setSubmission: (designId, studentId, sub) =>
        set((s) => {
          const submissions = { ...s.submissions }
          const key = `${designId}:${studentId}`
          if (!sub) delete submissions[key]
          else if (sub.files.length && !sub.text) {
            const design = s.designs.find((d) => d.id === designId)
            submissions[key] = { ...sub, text: design ? simulateOcrText(design, studentId) : '', textSource: 'ocr' }
          } else submissions[key] = sub
          return { submissions }
        }),

      setSubmissionText: (designId, studentId, text) =>
        set((s) => {
          const key = `${designId}:${studentId}`
          const old = s.submissions[key]
          if (!old) return {}
          return { submissions: { ...s.submissions, [key]: { ...old, text } } }
        }),

      bulkSubmissions: (designId, items) =>
        set((s) => {
          const submissions = { ...s.submissions }
          items.forEach(({ studentId, file }) => {
            const key = `${designId}:${studentId}`
            const design = s.designs.find((d) => d.id === designId)
            if (file) submissions[key] = { files: [file], text: design ? simulateOcrText(design, studentId) : '', textSource: 'ocr' }
            else delete submissions[key]
          })
          return { submissions }
        }),

      startGrading: (designId) => set((s) => ({ runs: { ...s.runs, [designId]: { state: 'running', progress: 0 } } })),

      tickGrading: (designId) => {
        const s = get()
        const design = s.designs.find((d) => d.id === designId)
        if (!design) return
        const submitted = design.targetIds.filter((sid) => s.submissions[`${designId}:${sid}`])
        const run = s.runs[designId]
        if (!run || run.state !== 'running') return
        const next = run.progress + 1
        const sid = submitted[run.progress]
        const scores = { ...s.scores }
        if (sid) {
          const key = `${designId}:${sid}`
          const old = scores[key]
          const text = s.submissions[key]?.text ?? ''
          const ai = withSeteuk(design, simulateAiScore(design, sid, text), text)
          // 교사가 이미 확정한 채점은 보존, AI 제안만 갱신
          scores[key] = old?.done ? { ...old, aiPicks: ai.aiPicks, evidence: ai.evidence, correction: old.correction ?? ai.correction, seteuk: old.seteuk ?? ai.seteuk } : ai
        }
        set({
          scores,
          runs: { ...s.runs, [designId]: { state: next >= submitted.length ? 'done' : 'running', progress: next } },
        })
      },

      setScore: (designId, studentId, patch) =>
        set((s) => {
          const design = s.designs.find((d) => d.id === designId)
          const key = `${designId}:${studentId}`
          const base = s.scores[key] ?? (design ? emptyScore(design) : undefined)
          if (!base) return {}
          return { scores: { ...s.scores, [key]: { ...base, ...patch } } }
        }),

      resetEmpty: () => set({ ...baseData() }),
      loadDemo: () => set({ ...demoData() }),
    }),
    { name: 'utop-ai-writing-v12', version: 12 },
  ),
)
