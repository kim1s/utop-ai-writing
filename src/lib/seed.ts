import { MIDDLE_ENGLISH } from '../data/middleEnglishAchievements'
import type { Achievement, Criterion, Faq, LibraryItem, Notice, Org, Student, Teacher } from './types'

export const SCHOOL_NAME = 'UTOP 중학교'
export const CURRENT_YEAR = 2026
export const SUBJECT_OPTIONS = ['국어', '수학', '영어', '통합과학', '통합사회', '과학', '사회', '도덕', '기술·가정', '정보', '음악', '미술', '체육']

const FAMILY = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권']
const GIVEN = ['하준', '서연', '민준', '지우', '도윤', '서윤', '예준', '하은', '시우', '지아', '주원', '수아', '지호', '다은', '준서', '채원', '건우', '소율', '현우', '유나', '우진', '예린', '선우', '가온', '지안', '이든', '나윤', '태윤', '시현', '하린', '재민', '아린']

/** 학생 계정 초기 비밀번호 */
export const INITIAL_PASSWORD = '1234'

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 학생 id: 학교는 s-, 학원은 a- 로 시작해 기관이 달라도 겹치지 않는다 */
export const studentIdOf = (org: Org, year: number, grade: number, cls: number, num: number) => `${org === 'academy' ? 'a' : 's'}-${year}-${grade}${cls}${pad2(num)}`

/** 학생 로그인 아이디: 학교 st260101 / 학원 ac260101 (학년도 두 자리 + 학년 + 반 + 번호 두 자리) */
export const studentLoginIdOf = (org: Org, year: number, grade: number, cls: number, num: number) => `${org === 'academy' ? 'ac' : 'st'}${String(year).slice(2)}${grade}${cls}${pad2(num)}`

export function makeStudents(org: Org, year: number, grade: number, cls: number, count: number): Student[] {
  return Array.from({ length: count }, (_, i) => {
    const num = i + 1
    const seed = grade * 100 + cls * 31 + i * 7 + (org === 'academy' ? 17 : 0)
    return {
      id: studentIdOf(org, year, grade, cls, num),
      org,
      year,
      grade,
      cls,
      num,
      name: FAMILY[seed % FAMILY.length] + GIVEN[(seed * 3 + i) % GIVEN.length],
      loginId: studentLoginIdOf(org, year, grade, cls, num),
      password: INITIAL_PASSWORD,
    }
  })
}

export const SEED_STUDENTS: Student[] = [...makeStudents('school', CURRENT_YEAR, 1, 1, 30), ...makeStudents('school', CURRENT_YEAR, 1, 2, 28)]
/** 학원 데모 학생: 중1 반 2개 */
export const SEED_ACADEMY_STUDENTS: Student[] = [...makeStudents('academy', CURRENT_YEAR, 1, 1, 12), ...makeStudents('academy', CURRENT_YEAR, 1, 2, 10)]

export const SEED_TEACHERS: Teacher[] = [
  { id: 't-me', name: '김유탑', subjects: ['영어'], email: 'utop.kim@example.com' },
  { id: 't-2', name: '이서진', subjects: ['영어'], email: 'seojin.lee@example.com' },
  { id: 't-3', name: '박지훈', subjects: ['영어'], email: 'jihun.park@example.com' },
  { id: 't-4', name: '최민아', subjects: ['영어'], email: 'mina.choi@example.com' },
  { id: 't-5', name: '정도현', subjects: ['영어'], email: 'dohyun.jung@example.com' },
]

export const ME = SEED_TEACHERS[0]

export const ACADEMY_NAME = 'UTOP 영어학원'
/** 학원은 선생님별 계정이 없고 학원당 계정 하나를 쓴다 */
export const ACADEMY: Teacher = { id: 'ac-me', name: ACADEMY_NAME, subjects: ['영어'], email: 'academy@example.com' }

/** 로그인 계정(프로토타입용 고정 계정). 학생 계정은 학생 등록 때 자동 생성되어 store에 있다 */
export interface Account {
  loginId: string
  password: string
  /** SEED_TEACHERS의 id 또는 ACADEMY.id */
  accountId: string
}
/** 프로토타입은 선생님 한 명(ME)의 데이터만 다루므로 선생님 로그인 계정도 하나다 */
export const TEACHER_ACCOUNTS: Account[] = [{ loginId: 'teacher1', password: INITIAL_PASSWORD, accountId: ME.id }]
export const ACADEMY_ACCOUNTS: Account[] = [{ loginId: 'academy1', password: INITIAL_PASSWORD, accountId: ACADEMY.id }]

export const SEED_NOTICES: Notice[] = [
  { id: 'n1', title: '신학기 서비스 점검 일정 및 이용 안내', date: '2026.02.02', isNew: true, body: '신학기를 맞아 서비스 점검이 진행됩니다. 점검 시간 동안에는 서비스 이용이 제한될 수 있으니 양해 부탁드립니다.\n\n- 점검 일정: 2026.02.07(토) 23:00 ~ 02.08(일) 03:00\n- 점검 내용: 서버 안정화 및 AI 채점 엔진 업데이트' },
  { id: 'n2', title: '고객센터 운영 안내', date: '2025.12.29', body: '고객센터 운영 시간은 평일 09:00 ~ 18:00 입니다. 점심시간(12:00 ~ 13:00)에는 응대가 어려울 수 있습니다.' },
  { id: 'n3', title: '서비스 점검 안내 12/09(화) 23:00~ 12/10(수) 03:00', date: '2025.12.04', body: '시스템 안정화를 위한 정기 점검이 진행됩니다.' },
  { id: 'n4', title: '내부 일정으로 인한 고객센터 운영 안내', date: '2025.11.10', body: '내부 일정으로 11월 14일(금) 고객센터 운영이 오후 2시까지 단축됩니다.' },
]

export const FAQS: Faq[] = [
  { q: '학생 계정은 어떻게 만드나요?', a: '나의 평가 > 학교 정보 > 학생 관리에서 "학생 등록" 버튼을 눌러 개별 등록하거나 엑셀 양식으로 일괄 등록할 수 있습니다.' },
  { q: '스캔한 답안지는 어떤 형식으로 올려야 하나요?', a: '학급 단위로 스캔한 하나의 PDF 파일을 업로드하면 학생별로 분할해 드립니다. 학생별 개별 업로드는 PDF, PNG, JPG 형식을 지원합니다.' },
  { q: 'AI 채점 결과를 수정할 수 있나요?', a: '네. AI는 선생님을 보조하는 역할이며 채점의 최종 권한은 선생님에게 있습니다. 학생 채점 상세 화면에서 점수와 피드백을 자유롭게 수정할 수 있습니다.' },
  { q: '다른 선생님의 평가 설계를 사용할 수 있나요?', a: '평가 설계 > 설계 추가에서 "기존 평가 설계 복사 생성" 또는 "평가 자료실에서 가져오기"를 선택하면 공개된 평가 설계를 복사해 사용할 수 있습니다.' },
  { q: '평가 점수를 엑셀로 내려받을 수 있나요?', a: '평가 리포트 탭의 "평가 점수 다운로드" 버튼으로 엑셀 파일을 내려받을 수 있습니다.' },
]

export const SCHOOL_LEVELS = ['초', '중', '고'] as const
export const LEVEL_LABEL: Record<string, string> = { 초: '초등학교', 중: '중학교', 고: '고등학교' }

/** 학교급·교과에 해당하는 성취기준 목록. 현재는 중학교 영어만 데이터가 있고, 나머지는 직접 입력을 사용합니다. */
export function achievementsFor(subject: string, level: string): Achievement[] {
  if (level === '중' && subject === '영어') return MIDDLE_ENGLISH
  return []
}

const ach = (code: string) => MIDDLE_ENGLISH.find((a) => a.code === `[${code}]`) as Achievement

export const SAMPLE_CRITERIA: Criterion[] = [
  {
    element: '주장 제시하기 (Claim)',
    scores: [
      { score: 3, desc: '주제에 대한 자신의 입장을 첫 문단에서 명확하고 구체적인 문장(thesis statement)으로 제시함.' },
      { score: 2, desc: '입장을 제시하였으나 다소 모호하거나 주제와의 연결이 약함.' },
      { score: 1, desc: '입장이 암시적으로만 드러남.' },
      { score: 0, desc: '주장을 제시하지 않음.' },
    ],
  },
  {
    element: '근거와 예시 제시하기 (Support)',
    scores: [
      { score: 3, desc: '주장을 뒷받침하는 타당한 이유 두 가지 이상을 구체적인 예시와 함께 제시함.' },
      { score: 2, desc: '이유를 제시하였으나 예시가 부족하거나 한 가지에 그침.' },
      { score: 1, desc: '이유가 주장과 직접 연결되지 않거나 나열에 그침.' },
      { score: 0, desc: '근거를 제시하지 않음.' },
    ],
  },
  {
    element: '글의 구성과 연결어 사용 (Organization)',
    scores: [
      { score: 2, desc: 'however, for example, therefore 등 연결어를 적절히 사용하여 서론-본론-결론이 자연스럽게 연결됨.' },
      { score: 1, desc: '글의 구성은 갖추었으나 연결어 사용이 부족하여 흐름이 다소 끊김.' },
      { score: 0, desc: '글의 구성이 드러나지 않음.' },
    ],
  },
  {
    element: '어휘와 문법의 정확성 (Language)',
    scores: [
      { score: 2, desc: '주제에 적합한 어휘를 사용하고 문법 오류가 의미 전달에 거의 영향을 주지 않음.' },
      { score: 1, desc: '문법·어휘 오류가 일부 있으나 전체 의미는 이해 가능함.' },
      { score: 0, desc: '오류가 많아 의미 파악이 어려움.' },
    ],
  },
]

export const SAMPLE_LIBRARY: LibraryItem[] = [
  {
    id: 'lib-1',
    title: 'Argumentative Paragraph Writing',
    subject: '영어',
    schoolLevel: '중',
    grade: 1,
    ownerName: '박지훈',
    school: 'UTOP중앙중학교',
    updatedAt: '2026-02-05',
    design: {
      achievements: [ach('9영02-06')],
      criteria: SAMPLE_CRITERIA,
      scoreMode: 'raw',
      grades: [],
      absentUnsubmitted: 0,
      absentNonresponse: 0,
    },
  },
  {
    id: 'lib-2',
    title: 'Summarizing a Reading Passage',
    subject: '영어',
    schoolLevel: '중',
    grade: 1,
    ownerName: '정하윤',
    school: 'UTOP한빛중학교',
    updatedAt: '2026-01-28',
    design: {
      achievements: [ach('9영02-07')],
      criteria: [
        {
          element: '핵심 내용 파악하기 (Main idea)',
          scores: [
            { score: 3, desc: '글의 중심 내용을 정확히 파악하여 한두 문장으로 제시함.' },
            { score: 2, desc: '중심 내용을 파악하였으나 세부 내용과 구분이 불명확함.' },
            { score: 1, desc: '세부 내용만 나열함.' },
            { score: 0, desc: '요약하지 않음.' },
          ],
        },
        {
          element: '자신의 말로 간결하게 쓰기 (Paraphrase)',
          scores: [
            { score: 2, desc: '원문 표현을 그대로 옮기지 않고 자신의 말로 간결하게 바꾸어 씀.' },
            { score: 1, desc: '원문 표현을 상당 부분 그대로 사용함.' },
            { score: 0, desc: '원문을 그대로 옮겨 씀.' },
          ],
        },
      ],
      scoreMode: 'raw',
      grades: [],
      absentUnsubmitted: 0,
      absentNonresponse: 0,
    },
  },
  {
    id: 'lib-3',
    title: 'Describing a Personal Experience',
    subject: '영어',
    schoolLevel: '중',
    grade: 1,
    ownerName: '이서진',
    school: 'UTOP고등학교',
    updatedAt: '2026-02-01',
    design: {
      achievements: [ach('9영02-04')],
      criteria: [
        {
          element: '경험의 구체적 서술 (Details)',
          scores: [
            { score: 3, desc: '시간·장소·감정 등 구체적 세부 사항을 포함하여 경험을 생생하게 서술함.' },
            { score: 2, desc: '경험을 서술하였으나 세부 사항이 부족함.' },
            { score: 1, desc: '경험을 한두 문장으로 간단히 언급함.' },
            { score: 0, desc: '서술하지 않음.' },
          ],
        },
        {
          element: '시제와 표현의 적절성 (Tense)',
          scores: [
            { score: 2, desc: '과거 시제를 일관되게 사용하고 다양한 표현을 활용함.' },
            { score: 1, desc: '시제 오류가 일부 있음.' },
            { score: 0, desc: '시제를 거의 구분하지 못함.' },
          ],
        },
      ],
      scoreMode: 'raw',
      grades: [],
      absentUnsubmitted: 0,
      absentNonresponse: 0,
    },
  },
]
