import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authenticate } from '../lib/auth'
import { ACADEMY_ACCOUNTS, ACADEMY_NAME, SCHOOL_NAME, TEACHER_ACCOUNTS } from '../lib/seed'
import { homeOf, useSession } from '../lib/session'
import { useStore } from '../lib/store'
import { STATE_LABEL, taskState } from './student/taskState'
import type { Role } from '../lib/types'
import { Button, inputCls } from '../components/ui'

export default function Login() {
  const nav = useNavigate()
  const user = useSession((s) => s.user)
  const login = useSession((s) => s.login)
  const students = useStore((s) => s.students)
  const designs = useStore((s) => s.designs)
  const submissions = useStore((s) => s.submissions)
  const scores = useStore((s) => s.scores)
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to={homeOf(user.role)} replace />

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const res = authenticate(id, pw)
    if (!res.ok) return setError(res.message)
    login(res.user)
    nav(homeOf(res.user.role), { replace: true })
  }

  // 데모 계정: 눌러서 입력칸을 채운다
  const studentOf = (loginId: string) => students.find((s) => s.loginId === loginId)
  const demos: { role: Role; label: string; id: string; pw: string; note: string }[] = [
    { role: 'teacher', label: '학교', id: TEACHER_ACCOUNTS[0].loginId, pw: TEACHER_ACCOUNTS[0].password, note: SCHOOL_NAME },
    { role: 'academy', label: '학원', id: ACADEMY_ACCOUNTS[0].loginId, pw: ACADEMY_ACCOUNTS[0].password, note: ACADEMY_NAME },
    // 학생 상태는 현재 저장된 데이터에서 읽어 와서, 제출·Rewriting을 마치면 문구도 바뀐다
    ...['st261101', 'st261102', 'ac261101'].flatMap((loginId) => {
      const st = studentOf(loginId)
      if (!st) return []
      const d = designs.find((x) => x.status === 'saved' && x.targetIds.includes(st.id))
      const key = d ? `${d.id}:${st.id}` : ''
      const note = d ? STATE_LABEL[taskState(submissions[key], scores[key])].text : '배정된 과제 없음'
      return [{ role: 'student' as const, label: `학생 ${st.name}`, id: st.loginId, pw: st.password, note: `${st.org === 'academy' ? '학원' : '학교'} · ${note}` }]
    }),
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#6a5af9] via-[#8466f5] to-[#9b63f2] px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center text-white">
          <h1 className="text-3xl font-extrabold tracking-tight">UTOP AI Writing</h1>
          <p className="mt-1 text-sm text-white/80">서·논술형 평가 서비스</p>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-[0_20px_60px_rgba(42,26,99,0.35)]">
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <label htmlFor="login-id" className="mb-1.5 block text-[13px] font-medium">아이디</label>
              <input id="login-id" className={inputCls} value={id} onChange={(e) => { setId(e.target.value); setError('') }} autoComplete="username" autoCapitalize="none" placeholder="아이디" autoFocus />
            </div>
            <div>
              <label htmlFor="login-pw" className="mb-1.5 block text-[13px] font-medium">비밀번호</label>
              <input id="login-pw" type="password" className={inputCls} value={pw} onChange={(e) => { setPw(e.target.value); setError('') }} autoComplete="current-password" placeholder="비밀번호" />
            </div>
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-600">{error}</p>}
            <Button type="submit" className="w-full !py-3 !text-[15px]">로그인</Button>
          </form>
        </div>

        <details className="mt-4 rounded-2xl bg-white/15 p-4 text-sm text-white backdrop-blur" open>
          <summary className="cursor-pointer font-medium">체험용 계정 (눌러서 채우기)</summary>
          <ul className="mt-3 space-y-1.5">
            {demos.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => { setId(d.id); setPw(d.pw); setError('') }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2 text-left hover:bg-white/25"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d.label}</span>
                    <span className="block truncate text-xs text-white/75">{d.note}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums text-white/90">{d.id}<br />{d.pw}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/70">체험용 화면이라 이 브라우저에 저장된 데이터로만 동작해요.</p>
        </details>
      </div>
    </div>
  )
}
