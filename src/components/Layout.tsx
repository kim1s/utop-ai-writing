import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useStore } from '../lib/store'
import { Button, FeedbackHost, confirmAsync, toast } from './ui'

export function AppLayout() {
  useGradingTicker()
  useScrollMemory()
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FeedbackHost />
    </div>
  )
}

function Header() {
  const me = useStore((s) => s.me)
  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm no-print">
      <div className="mx-auto flex h-[82px] max-w-[1100px] items-center justify-between px-6">
        <Link to="/" aria-label="홈" className="flex flex-col leading-tight">
          <span className="whitespace-nowrap bg-gradient-to-r from-brand-600 to-blue-500 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">UTOP AI Writing</span>
          <span className="text-[11px] font-medium text-gray-500">서·논술형 평가 서비스</span>
        </Link>
        <Link to="/my-info" className="flex items-center gap-2 text-sm font-semibold text-brand-600">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm text-white">{me.name.slice(0, 1)}</span>
          {me.name} 님
        </Link>
      </div>
    </header>
  )
}

function Footer() {
  const loadDemo = useStore((s) => s.loadDemo)
  const resetEmpty = useStore((s) => s.resetEmpty)
  const nav = useNavigate()
  return (
    <footer className="mt-16 border-t border-brand-100 bg-white/50 py-10 text-[13px] text-gray-700 no-print">
      <div className="mx-auto max-w-[1100px] px-6">
        <div className="mb-5 flex flex-wrap gap-6 text-[13px]">
          <Link to="/library" className="hover:text-brand-600">평가 자료실</Link>
          <Link to="/support" className="hover:text-brand-600">고객센터</Link>
          <Link to="/privacy" className="hover:text-brand-600">개인정보처리방침</Link>
          <Link to="/terms" className="hover:text-brand-600">이용약관</Link>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-brand-300 p-3 text-xs">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (await confirmAsync('데모 데이터로 되돌립니다. 현재 입력한 내용은 사라집니다.')) {
                loadDemo()
                nav('/')
                toast('데모 데이터를 불러왔습니다')
              }
            }}
          >
            데모 데이터 불러오기
          </Button>
          <Button
            size="sm"
            variant="gray"
            onClick={async () => {
              if (await confirmAsync('모든 데이터를 지우고 빈 상태로 시작합니다. (처음 사용하는 흐름을 체험할 수 있어요)')) {
                resetEmpty()
                nav('/')
                toast('빈 상태로 초기화했습니다')
              }
            }}
          >
            데모 데이터 삭제
          </Button>
        </div>
      </div>
    </footer>
  )
}

export function TitleBar({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="bg-gradient-to-r from-[#6a5af9] to-[#9b63f2] text-white no-print">
      <div className="mx-auto flex h-[74px] max-w-[1100px] items-center px-6 text-[22px] font-medium">
        <span>{title}</span>
        {sub && (
          <>
            <span className="mx-4 h-6 w-px bg-white/50" />
            <span className="text-xl font-normal">{sub}</span>
          </>
        )}
      </div>
    </div>
  )
}

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1100px] px-6 py-8 ${className}`}>{children}</div>
}

const TABS = [
  { key: 'targets', label: '평가 대상', path: '/targets' },
  { key: 'design', label: '평가 설계', path: '/design' },
  { key: 'submissions', label: '과제물 관리', path: '/submissions' },
  { key: 'grading', label: 'AI 채점', path: '/grading' },
  { key: 'report', label: '평가 리포트', path: '/report' },
] as const
export type TabKey = (typeof TABS)[number]['key']

export function useEvalParam() {
  const { evalId } = useParams()
  return useStore((s) => s.designs.find((d) => d.id === evalId))
}

/** 평가 상세 공통 틀: 타이틀 바(선생님용 평가명) + 5개 탭 + 흰 패널 */
export interface Crumb {
  label: string
  to?: string
}

export function EvalShell({ tab, crumbs, children }: { tab: TabKey; crumbs?: Crumb[]; children: ReactNode }) {
  const ev = useEvalParam()
  if (!ev) return <Navigate to="/" replace />
  return (
    <>
      <TitleBar title={ev.name || '(이름 없음)'} />
      <PageContainer className="!pt-6">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              to={`/evals/${ev.id}${t.path}`}
              className={`flex-1 rounded-t-2xl py-3.5 text-center text-[15px] font-semibold transition-colors ${tab === t.key ? 'bg-white text-brand-900' : 'bg-tab text-gray-800 hover:bg-[#bfcaef]'}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="min-h-[300px] rounded-b-2xl bg-white p-6 shadow-[0_8px_30px_rgba(90,70,180,0.1)]">
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="경로" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-gray-300">›</span>}
                  {c.to ? <Link to={c.to} className="font-medium text-brand-600 hover:underline">{c.label}</Link> : <span className="font-semibold text-gray-900">{c.label}</span>}
                </span>
              ))}
            </nav>
          )}
          {children}
        </div>
      </PageContainer>
    </>
  )
}

/** AI 채점 진행 시뮬레이션: 실행 중인 평가를 일정 간격으로 한 명씩 처리 */
function useGradingTicker() {
  const running = useStore((s) => Object.values(s.runs).some((r) => r.state === 'running'))
  const tick = useStore((s) => s.tickGrading)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      const runs = useStore.getState().runs
      Object.entries(runs).forEach(([id, r]) => r.state === 'running' && tick(id))
    }, 450)
    return () => clearInterval(t)
  }, [running, tick])
}

/**
 * 화면 이동 시 스크롤 처리
 * - 기본: 새 화면은 맨 위에서 시작 (이전 화면의 스크롤 위치가 남아 화면이 튀는 것 방지)
 * - 하위 화면(학생 채점 상세 등)에서 목록으로 돌아오거나 브라우저 뒤로가기를 하면, 떠날 때의 스크롤 위치를 복원
 */
function useScrollMemory() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const memo = useRef(new Map<string, number>())
  const prevPath = useRef(pathname)
  const lastY = useRef(0)

  useEffect(() => {
    const on = () => { lastY.current = window.scrollY }
    // 화면이 바뀌기 직전(링크 클릭·뒤로가기)의 스크롤 위치를 정확히 기록 (스크롤 이벤트만으로는 놓칠 수 있음)
    window.addEventListener('scroll', on, { passive: true })
    document.addEventListener('click', on, true)
    window.addEventListener('popstate', on)
    return () => {
      window.removeEventListener('scroll', on)
      document.removeEventListener('click', on, true)
      window.removeEventListener('popstate', on)
    }
  }, [])

  useLayoutEffect(() => {
    const from = prevPath.current
    if (from === pathname) return
    memo.current.set(from, lastY.current)
    prevPath.current = pathname
    const returningFromChild = from.startsWith(`${pathname}/`)
    const y = (returningFromChild || navType === 'POP') ? (memo.current.get(pathname) ?? 0) : 0
    window.scrollTo(0, y)
    lastY.current = y
  }, [pathname, navType])
}
