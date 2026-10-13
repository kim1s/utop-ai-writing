import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Org, Role } from './types'

/** 로그인한 사용자. 데이터(학생·평가)는 담지 않고 누구인지만 기억한다 */
export interface SessionUser {
  role: Role
  /** 선생님: 선생님 id / 학원: 학원 id / 학생: 학생 id */
  accountId: string
  name: string
}

interface Session {
  user: SessionUser | null
  login: (u: SessionUser) => void
  logout: () => void
}

export const useSession = create<Session>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'utop-ai-writing-session', version: 1 },
  ),
)

/** 현재 사용자가 속한 기관 (학원 로그인이면 학원, 그 외는 학교). 학생은 자기 기록의 org를 따로 쓴다 */
export const orgOfRole = (role: Role | undefined): Org => (role === 'academy' ? 'academy' : 'school')
export const currentOrg = (): Org => orgOfRole(useSession.getState().user?.role)

/** 로그인 직후 가는 첫 화면 */
export const homeOf = (role: Role) => (role === 'student' ? '/student' : '/')

export const ROLE_LABEL: Record<Role, string> = { teacher: '선생님', academy: '학원', student: '학생' }
