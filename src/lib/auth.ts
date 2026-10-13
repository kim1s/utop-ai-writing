import { ACADEMY, ACADEMY_ACCOUNTS, SEED_TEACHERS, TEACHER_ACCOUNTS } from './seed'
import type { SessionUser } from './session'
import { useStore } from './store'

export type LoginResult = { ok: true; user: SessionUser } | { ok: false; message: string }

const WRONG = '아이디 또는 비밀번호가 올바르지 않아요.'

/**
 * 로그인 확인 (프로토타입: 서버 없이 이 브라우저에 저장된 계정으로 확인).
 * 로그인 구분을 따로 고르지 않고, 아이디가 어느 계정(학원 / 선생님 / 학생)에 해당하는지로 구분한다.
 * 실제 서비스에서는 서버 인증으로 바꿔야 한다.
 */
export function authenticate(rawId: string, password: string): LoginResult {
  const loginId = rawId.trim().toLowerCase()
  if (!loginId || !password) return { ok: false, message: '아이디와 비밀번호를 입력해 주세요.' }

  const academy = ACADEMY_ACCOUNTS.find((a) => a.loginId === loginId)
  if (academy) return academy.password === password ? { ok: true, user: { role: 'academy', accountId: academy.accountId, name: ACADEMY.name } } : { ok: false, message: WRONG }

  const teacher = TEACHER_ACCOUNTS.find((a) => a.loginId === loginId)
  if (teacher) {
    const name = SEED_TEACHERS.find((t) => t.id === teacher.accountId)?.name ?? '선생님'
    return teacher.password === password ? { ok: true, user: { role: 'teacher', accountId: teacher.accountId, name } } : { ok: false, message: WRONG }
  }

  const st = useStore.getState().students.find((s) => s.loginId.toLowerCase() === loginId)
  if (st && st.password === password) return { ok: true, user: { role: 'student', accountId: st.id, name: st.name } }
  return { ok: false, message: WRONG }
}
