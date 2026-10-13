import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { blankDesign } from './blank'
import { emptyScore, simulateAiScore, simulateOcrText } from './grading'
import { generateCriteria } from './problemGen'
import { ACADEMY, CURRENT_YEAR, INITIAL_PASSWORD, ME, SAMPLE_CRITERIA, SAMPLE_LIBRARY, SEED_ACADEMY_STUDENTS, SEED_NOTICES, SEED_STUDENTS, SEED_TEACHERS, studentIdOf, studentLoginIdOf } from './seed'
import { generateSeteuk } from './seteuk'
import { currentOrg, orgOfRole, useSession } from './session'
import { MIDDLE_ENGLISH } from '../data/middleEnglishAchievements'
import type { Design, GradingRun, LibraryItem, Notice, Org, Student, StudentScore, Submission, SubmissionFile, Teacher } from './types'

export const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`
export const nowStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const today = () => new Date().toISOString().slice(0, 10)

interface Data {
  /** 학교 선생님(로그인한 선생님) */
  me: Teacher
  /** 학원 계정 (선생님별 구분 없이 학원당 하나) */
  academyMe: Teacher
  teachers: Teacher[]
  notices: Notice[]
  /** 학교·학원 학생이 함께 들어 있고, 화면에서는 org로 걸러 쓴다 */
  students: Student[]
  /** 평가 (수업/반 개념 없이 평가가 최상위 단위). 학교·학원 평가가 함께 들어 있다 */
  designs: Design[]
  /** key: `${designId}:${studentId}` */
  submissions: Record<string, Submission>
  /** key: `${designId}:${studentId}` */
  scores: Record<string, StudentScore>
  /** key: designId */
  runs: Record<string, GradingRun>
  library: LibraryItem[]
  /** 학생 임시저장. key: `${designId}:${studentId}:answer|rewrite` */
  drafts: Record<string, { text: string; savedAt: string }>
}

type NewStudent = Omit<Student, 'id' | 'org' | 'loginId' | 'password'>

interface Actions {
  setMySubjects: (subjects: string[]) => void
  addStudents: (list: NewStudent[]) => void
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
  /** 학생이 본인에게 배정된 과제의 답안을 직접 타이핑해 제출 (채점 전에만 가능) */
  submitStudentAnswer: (designId: string, studentId: string, text: string) => boolean
  /** 학생이 작성 중인 글을 임시저장 (제출과 별개, 선생님에게는 보이지 않는다) */
  saveDraft: (designId: string, studentId: string, kind: 'answer' | 'rewrite', text: string) => void
  /** 선생님이 채점 완료된 학생들에게 평가 리포트를 보낸다 */
  sendReports: (designId: string, studentIds: string[]) => number
  /** 학생이 첨삭을 반영해 다시 쓴 글을 제출 (리포트를 받은 뒤 한 번) */
  submitRewrite: (designId: string, studentId: string, text: string) => boolean
  /** 현재 로그인한 기관(학교/학원)의 데이터만 비운다 */
  resetEmpty: () => void
  /** 현재 로그인한 기관(학교/학원)의 데모 데이터로 되돌린다 */
  loadDemo: () => void
}

const meOf = (s: Data, org: Org) => (org === 'academy' ? s.academyMe : s.me)

function baseData(): Data {
  return {
    me: ME,
    academyMe: ACADEMY,
    teachers: SEED_TEACHERS,
    notices: SEED_NOTICES,
    students: [],
    designs: [],
    submissions: {},
    scores: {},
    runs: {},
    library: SAMPLE_LIBRARY,
    drafts: {},
  }
}

/** AI 채점 결과에 AI 세특을 함께 붙인다 (이미 있으면 유지). 세특은 학교 생활기록부용이라 학원 평가에는 만들지 않는다 */
const withSeteuk = (design: Design, sc: StudentScore, text: string): StudentScore => (design.org === 'academy' ? sc : { ...sc, seteuk: sc.seteuk ?? generateSeteuk(design, sc, text) })

export const DEMO_DESIGN_ID = 'd-demo-1'
export const DEMO_ACADEMY_DESIGN_ID = 'd-academy-1'

type OrgPart = Pick<Data, 'students' | 'designs' | 'submissions' | 'scores' | 'runs'>

function schoolDemo(): OrgPart {
  const students = SEED_STUDENTS
  const targetIds = students.filter((s) => s.grade === 1 && s.cls === 1).slice(0, 15).map((s) => s.id)
  const design: Design = {
    id: DEMO_DESIGN_ID,
    org: 'school',
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
    org: 'school',
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
    submissions[`${design.id}:${sid}`] = { files: [{ name: '1_260210업로드.pdf', uploadedAt: '02/10 10:04', by: '선생님', pages: '1~2' }], text: simulateOcrText(design, sid), textSource: 'ocr', submittedBy: 'teacher' }
  })
  // 데모: AI 채점이 끝난 상태. 앞쪽 8명은 선생님 채점까지 확정해 리포트를 바로 볼 수 있게 한다
  const scores: Record<string, StudentScore> = {}
  const submitted = targetIds.filter((sid) => submissions[`${design.id}:${sid}`])
  submitted.forEach((sid, i) => {
    const key = `${design.id}:${sid}`
    const ai = simulateAiScore(design, sid, submissions[key].text)
    let sc: StudentScore = i < 8 ? { ...ai, picks: [...ai.aiPicks], done: true } : ai
    // 첫 번째 학생에게는 리포트를 이미 보낸 상태로 두어 학생 화면에서 rewriting 흐름을 바로 볼 수 있게 한다
    if (i === 0) sc = { ...sc, reportSentAt: '02/11 09:30' }
    scores[key] = withSeteuk(design, sc, submissions[key].text ?? '')
  })
  const runs = { [design.id]: { state: 'done' as const, progress: submitted.length } }
  return { students, designs: [design, second], submissions, scores, runs }
}

/** 학원 데모: 성취기준·교과서 단원 없이 과제 조건과 채점기준만으로 만든 평가 */
function academyDemo(): OrgPart {
  const students = SEED_ACADEMY_STUDENTS
  const targetIds = students.filter((s) => s.grade === 1 && s.cls === 1).map((s) => s.id)
  const base: Design = {
    id: DEMO_ACADEMY_DESIGN_ID,
    org: 'academy',
    name: '10월 영어 라이팅 - 중1 A반',
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
    year: CURRENT_YEAR,
    semester: 1,
    subject: '영어',
    targetIds,
    visibility: 'school',
    achievements: [],
    criteria: [],
    scoreMode: 'raw',
    grades: [],
    absentUnsubmitted: 0,
    absentNonresponse: 0,
    status: 'saved',
    ownerName: ACADEMY.name,
    updatedAt: '2026-10-05',
  }
  const design: Design = { ...base, criteria: generateCriteria(base) }
  const submissions: Record<string, Submission> = {}
  targetIds.forEach((sid, i) => {
    if (i === 1 || i === 11) return // 미제출 학생 (학생 로그인으로 직접 제출해 볼 수 있다)
    submissions[`${design.id}:${sid}`] = { files: [], text: simulateOcrText(design, sid), textSource: 'typed', submittedBy: 'student', submittedAt: '10/05 19:20' }
  })
  const scores: Record<string, StudentScore> = {}
  const submitted = targetIds.filter((sid) => submissions[`${design.id}:${sid}`])
  submitted.forEach((sid, i) => {
    const key = `${design.id}:${sid}`
    const ai = simulateAiScore(design, sid, submissions[key].text)
    let sc: StudentScore = i < 6 ? { ...ai, picks: [...ai.aiPicks], done: true } : ai
    if (i === 0) sc = { ...sc, reportSentAt: '10/07 10:00' } // 리포트를 받고 rewriting 해야 하는 학생
    if (i === 1) {
      // 리포트를 받고 rewriting까지 제출한 학생
      const revised = (sc.correction ?? []).map((c) => c.revised.map((g) => g.t).join('')).join(' ')
      sc = { ...sc, reportSentAt: '10/07 10:00', rewrite: { text: revised, submittedAt: '10/08 20:15' } }
    }
    scores[key] = sc
  })
  const runs = { [design.id]: { state: 'done' as const, progress: submitted.length } }
  return { students, designs: [design], submissions, scores, runs }
}

const demoPart = (org: Org): OrgPart => (org === 'academy' ? academyDemo() : schoolDemo())

/** 한 기관의 학생·평가·제출물·채점 데이터를 걷어낸다 (다른 기관 데이터는 그대로) */
function stripOrg(s: Data, org: Org): OrgPart {
  const dropIds = new Set(s.designs.filter((d) => d.org === org).map((d) => d.id))
  const keep = <T,>(rec: Record<string, T>, byPrefix: boolean) => Object.fromEntries(Object.entries(rec).filter(([k]) => !dropIds.has(byPrefix ? k.split(':')[0] : k)))
  return {
    students: s.students.filter((x) => x.org !== org),
    designs: s.designs.filter((d) => d.org !== org),
    submissions: keep(s.submissions, true),
    scores: keep(s.scores, true),
    runs: keep(s.runs, false),
  }
}

function demoData(): Data {
  const a = schoolDemo()
  const b = academyDemo()
  return {
    ...baseData(),
    students: [...a.students, ...b.students],
    designs: [...a.designs, ...b.designs],
    submissions: { ...a.submissions, ...b.submissions },
    scores: { ...a.scores, ...b.scores },
    runs: { ...a.runs, ...b.runs },
  }
}

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...demoData(),

      setMySubjects: (subjects) =>
        set((s) => {
          if (currentOrg() === 'academy') return { academyMe: { ...s.academyMe, subjects } }
          return { me: { ...s.me, subjects }, teachers: s.teachers.map((t) => (t.id === s.me.id ? { ...t, subjects } : t)) }
        }),

      addStudents: (list) =>
        set((s) => {
          const org = currentOrg()
          const keyOf = (x: { year: number; grade: number; cls: number; num: number }) => `${x.year}-${x.grade}-${x.cls}-${x.num}`
          const mine = s.students.filter((x) => x.org === org)
          const map = new Map(mine.map((x) => [keyOf(x), x]))
          list.forEach((n) => {
            const old = map.get(keyOf(n))
            // 이미 있는 학생이면 id와 로그인 정보는 그대로 두고 이름만 갱신한다
            map.set(keyOf(n), old ? { ...old, ...n } : { ...n, org, id: studentIdOf(org, n.year, n.grade, n.cls, n.num), loginId: studentLoginIdOf(org, n.year, n.grade, n.cls, n.num), password: INITIAL_PASSWORD })
          })
          return { students: [...s.students.filter((x) => x.org !== org), ...map.values()] }
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
        const org = currentOrg()
        set((s) => {
          const me = meOf(s, org)
          return { designs: [...s.designs, blankDesign(id, me.name, me.subjects, org)] }
        })
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
        const org = currentOrg()
        set((s) => ({
          designs: [...s.designs, { ...structuredClone(src), id: nid, org, name: `${src.name} (복사)`, targetIds: [], ownerName: meOf(s, org).name, status: 'draft', updatedAt: today() }],
        }))
        return nid
      },

      importLibrary: (libId) => {
        const lib = get().library.find((l) => l.id === libId)
        if (!lib) return ''
        const nid = uid('d')
        const org = currentOrg()
        set((s) => ({
          designs: [
            ...s.designs,
            {
              ...structuredClone(lib.design),
              id: nid,
              org,
              name: lib.title,
              schoolLevel: lib.schoolLevel,
              grade: lib.grade,
              year: CURRENT_YEAR,
              semester: 1,
              subject: lib.subject,
              targetIds: [],
              visibility: 'school',
              status: 'draft',
              ownerName: meOf(s, org).name,
              updatedAt: today(),
              fromLibrary: true,
              // 학원은 성취기준을 쓰지 않으므로 자료실 평가의 성취기준은 가져오지 않는다
              ...(org === 'academy' ? { achievements: [] } : {}),
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
            submissions[key] = { ...sub, text: design ? simulateOcrText(design, studentId) : '', textSource: 'ocr', submittedBy: 'teacher' }
          } else submissions[key] = { submittedBy: 'teacher', ...sub }
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
            if (file) submissions[key] = { files: [file], text: design ? simulateOcrText(design, studentId) : '', textSource: 'ocr', submittedBy: 'teacher' }
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

      submitStudentAnswer: (designId, studentId, text) => {
        const s = get()
        const design = s.designs.find((d) => d.id === designId)
        const key = `${designId}:${studentId}`
        const body = text.trim()
        // 본인이 평가 대상이고, 채점이 시작되기 전이며, 내용이 있을 때만 제출할 수 있다
        if (!design || design.status !== 'saved' || !design.targetIds.includes(studentId) || s.scores[key] || !body) return false
        const drafts = { ...(s.drafts ?? {}) }
        delete drafts[`${key}:answer`]
        set({ drafts, submissions: { ...s.submissions, [key]: { files: [], text: body, textSource: 'typed', submittedBy: 'student', submittedAt: nowStr() } } })
        return true
      },

      saveDraft: (designId, studentId, kind, text) =>
        set((s) => {
          const key = `${designId}:${studentId}:${kind}`
          const drafts = { ...(s.drafts ?? {}) }
          if (text.trim()) drafts[key] = { text, savedAt: nowStr() }
          else delete drafts[key]
          return { drafts }
        }),

      sendReports: (designId, studentIds) => {
        const s = get()
        const at = nowStr()
        const scores = { ...s.scores }
        let n = 0
        studentIds.forEach((sid) => {
          const key = `${designId}:${sid}`
          const sc = scores[key]
          // 채점이 확정된 학생에게만, 이미 보낸 경우는 건너뛴다
          if (!sc?.done || sc.reportSentAt) return
          scores[key] = { ...sc, reportSentAt: at }
          n++
        })
        if (n) set({ scores })
        return n
      },

      submitRewrite: (designId, studentId, text) => {
        const s = get()
        const key = `${designId}:${studentId}`
        const sc = s.scores[key]
        const body = text.trim()
        if (!sc?.reportSentAt || sc.rewrite || !body) return false
        const drafts = { ...(s.drafts ?? {}) }
        delete drafts[`${key}:rewrite`]
        set({ drafts, scores: { ...s.scores, [key]: { ...sc, rewrite: { text: body, submittedAt: nowStr() } } } })
        return true
      },

      resetEmpty: () => set((s) => ({ ...stripOrg(s, currentOrg()) })),
      loadDemo: () =>
        set((s) => {
          const org = currentOrg()
          const rest = stripOrg(s, org)
          const demo = demoPart(org)
          return {
            students: [...rest.students, ...demo.students],
            designs: [...rest.designs, ...demo.designs],
            submissions: { ...rest.submissions, ...demo.submissions },
            scores: { ...rest.scores, ...demo.scores },
            runs: { ...rest.runs, ...demo.runs },
          }
        }),
    }),
    { name: 'utop-ai-writing-v13', version: 13 },
  ),
)

/** 로그인한 선생님/학원 본인 정보 (학원이면 학원 계정) */
export function useMe(): Teacher {
  const role = useSession((x) => x.user?.role)
  return useStore((s) => meOf(s, orgOfRole(role)))
}

/** 로그인한 기관의 학생·평가만 걸러서 돌려준다 */
export function useOrgData() {
  const role = useSession((x) => x.user?.role)
  const org = orgOfRole(role)
  const students = useStore((s) => s.students)
  const designs = useStore((s) => s.designs)
  return {
    org,
    students: students.filter((x) => x.org === org),
    designs: designs.filter((d) => d.org === org),
  }
}
