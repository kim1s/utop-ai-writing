import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { create } from 'zustand'

/* ───────── Button ───────── */
type Variant = 'primary' | 'outline' | 'soft' | 'danger' | 'dangerOutline' | 'gray' | 'green' | 'greenOutline' | 'blue'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-200',
  outline: 'bg-white text-brand-600 border border-brand-400 hover:bg-brand-50 disabled:opacity-50',
  soft: 'bg-brand-50 text-brand-600 hover:bg-brand-100 disabled:opacity-50',
  danger: 'bg-rose-500 text-white hover:bg-rose-600 disabled:bg-rose-200',
  dangerOutline: 'bg-white text-rose-600 border border-rose-300 hover:bg-rose-50 disabled:opacity-50',
  gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50',
  green: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50',
  greenOutline: 'bg-white text-emerald-600 border border-emerald-500 hover:bg-emerald-50',
  blue: 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-200',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2 text-sm'
  return <button type="button" {...rest} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors ${sz} ${VARIANTS[variant]} ${className}`} />
}

/* ───────── Icons (inline, minimal) ───────── */
export const Icon = {
  plus: <span aria-hidden>＋</span>,
  check: <span aria-hidden>✓</span>,
}

/* ───────── Modal ───────── */
export function Modal({ open, title, onClose, children, footer, width = 'max-w-xl' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10 no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${width} rounded-2xl bg-white p-6 shadow-2xl`}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/* ───────── Toast / Confirm ───────── */
interface Feedback {
  toasts: { id: number; msg: string }[]
  confirm: { msg: string; resolve: (v: boolean) => void } | null
}
const useFeedback = create<Feedback>(() => ({ toasts: [], confirm: null }))
let tid = 0
export function toast(msg: string) {
  const id = ++tid
  useFeedback.setState((s) => ({ toasts: [...s.toasts, { id, msg }] }))
  setTimeout(() => useFeedback.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600)
}
export function confirmAsync(msg: string): Promise<boolean> {
  return new Promise((resolve) => useFeedback.setState({ confirm: { msg, resolve } }))
}
export function FeedbackHost() {
  const { toasts, confirm } = useFeedback()
  const close = (v: boolean) => {
    confirm?.resolve(v)
    useFeedback.setState({ confirm: null })
  }
  return (
    <>
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 flex-col gap-2 no-print">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-full bg-gray-900/90 px-5 py-2.5 text-sm text-white shadow-lg">
            {t.msg}
          </div>
        ))}
      </div>
      <Modal open={!!confirm} title="확인" onClose={() => close(false)} width="max-w-md" footer={<><Button variant="gray" onClick={() => close(false)}>취소</Button><Button onClick={() => close(true)}>확인</Button></>}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{confirm?.msg}</p>
      </Modal>
    </>
  )
}

/* ───────── Badge ───────── */
export function Badge({ tone = 'blue', children }: { tone?: 'blue' | 'red' | 'green' | 'gray' | 'purple' | 'orange'; children: ReactNode }) {
  const t = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-rose-50 text-rose-600',
    green: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-gray-100 text-gray-500',
    purple: 'bg-brand-50 text-brand-600',
    orange: 'bg-orange-50 text-orange-600',
  }[tone]
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${t}`}>{children}</span>
}

/* ───────── Panels ───────── */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(90,70,180,0.08)] ${className}`}>{children}</div>
}

/** 흰 패널 안의 회색 영역 + 흰 카드 (원본의 이중 박스 레이아웃) */
export function Well({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-gray-50 p-5 ${className}`}>{children}</div>
}
export function Inner({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-5 ${className}`}>{children}</div>
}

export function SectionHeader({ title, desc, right }: { title: string; desc?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {desc && <p className="mt-1 text-[13px] text-gray-600">{desc}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  )
}

/* ───────── Empty state (자체 제작 일러스트) ───────── */
export function EmptyState({ title, desc, action, kind = 'people' }: { title: string; desc?: ReactNode; action?: ReactNode; kind?: 'people' | 'doc' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg width="130" height="100" viewBox="0 0 130 100" aria-hidden>
        <ellipse cx="65" cy="52" rx="58" ry="40" fill="#ece6ff" />
        {kind === 'people' ? (
          <>
            <circle cx="65" cy="38" r="14" fill="#fff" stroke="#6d28d9" strokeWidth="2" />
            <path d="M38 80c2-16 13-24 27-24s25 8 27 24z" fill="#c4b0ff" stroke="#6d28d9" strokeWidth="2" />
          </>
        ) : (
          <>
            <rect x="42" y="18" width="46" height="60" rx="5" fill="#fff" stroke="#6d28d9" strokeWidth="2" />
            <path d="M52 34h26M52 46h26M52 58h16" stroke="#a07bff" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        <path d="M104 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#8b5cf6" />
      </svg>
      <p className="mt-3 text-[15px] font-medium text-gray-900">{title}</p>
      {desc && <p className="mt-1 whitespace-pre-line text-xs text-gray-600">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ───────── Form bits ───────── */
export const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400'

export function Select({ value, onChange, options, className = '', placeholder }: { value: string | number; onChange: (v: string) => void; options: { value: string | number; label: string }[]; className?: string; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ${className}`}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function NumberInput({ value, onChange, min = 0, max, className = '' }: { value: number | null; onChange: (v: number) => void; min?: number; max?: number; className?: string }) {
  return <input type="number" value={value ?? ''} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} className={`rounded-lg border border-gray-300 px-2 py-1.5 text-sm ${className}`} />
}

export function Radio({ checked, onChange, label, name }: { checked: boolean; onChange: () => void; label: ReactNode; name?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-brand-600" />
      {label}
    </label>
  )
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-brand-600" />
      {label}
    </label>
  )
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const pct = max ? (value / max) * 100 : 0
  return (
    <div className={`h-3 overflow-hidden rounded-sm bg-brand-100 ${className}`}>
      <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
}

/** 페이지 첫 진입 시 hash/state 없는 간단한 로컬 토글 */
export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [v, setV] = useState(initial)
  return [v, () => setV((x) => !x), setV]
}

/** 펼침/접힘 화살표 (글리프 대신 SVG라 세로 정렬이 어긋나지 않음) */
export function Chevron({ open = false, className = '' }: { open?: boolean; className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${className}`}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
