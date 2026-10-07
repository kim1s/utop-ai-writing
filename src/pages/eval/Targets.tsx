import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EvalShell, useEvalParam } from '../../components/Layout'
import { Button, Chevron, SectionHeader, Well, confirmAsync, toast } from '../../components/ui'
import { useStore } from '../../lib/store'
import type { Student } from '../../lib/types'

const groupKey = (s: Student) => `${s.grade}학년 ${s.cls}반`
function groupBy(list: Student[]): [string, Student[]][] {
  const m = new Map<string, Student[]>()
  ;[...list].sort((a, b) => a.grade - b.grade || a.cls - b.cls || a.num - b.num).forEach((s) => m.set(groupKey(s), [...(m.get(groupKey(s)) ?? []), s]))
  return [...m.entries()]
}

/** 평가 대상: 평가에 참여할 학생을 학급 단위/개별로 선택 */
export default function Targets() {
  const ev = useEvalParam()
  const { students, setTargets } = useStore()
  const [draft, setDraft] = useState<string[] | null>(null)
  const [left, setLeft] = useState<string[]>([])
  const [right, setRight] = useState<string[]>([])
  const [openL, setOpenL] = useState<Record<string, boolean>>({})
  const [openR, setOpenR] = useState<Record<string, boolean>>({})

  const pool = useMemo(() => students.filter((s) => s.year === (ev?.year ?? 0)), [students, ev?.year])
  if (!ev) return null
  const ids = draft ?? ev.targetIds
  const available = groupBy(pool.filter((s) => !ids.includes(s.id)))
  const totalOf = (key: string) => pool.filter((s) => groupKey(s) === key).length
  const chosen = groupBy(pool.filter((s) => ids.includes(s.id)))
  const removedIds = ev.targetIds.filter((i) => !ids.includes(i))
  const changed = draft !== null && (draft.length !== ev.targetIds.length || draft.some((i) => !ev.targetIds.includes(i)))

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  const toggleGroup = (arr: string[], set: (v: string[]) => void, list: Student[]) => {
    const all = list.every((s) => arr.includes(s.id))
    set(all ? arr.filter((x) => !list.some((s) => s.id === x)) : [...new Set([...arr, ...list.map((s) => s.id)])])
  }

  return (
    <EvalShell tab="targets">
      <SectionHeader title="평가 대상" desc="이 평가에 참여할 학생을 추가하거나 제외할 수 있습니다. 학생 제외 시, 해당 학생의 과제 및 평가 데이터가 삭제됩니다." />
      <Well>
        <div className="grid grid-cols-[1fr_110px_1fr] items-center gap-3 max-md:grid-cols-1">
          <Panel title="등록 가능한 학생" empty={available.length === 0 ? (pool.length === 0 ? '등록된 학생이 없어요.\n학생 관리에서 먼저 등록해 주세요.' : '추가할 수 있는 학생이 없어요.') : ''}>
            {available.map(([key, list]) => (
              <GroupRow key={key} label={key} count={`${list.filter((s) => left.includes(s.id)).length || list.length} / ${totalOf(key)}`} students={list} checked={left} open={!!openL[key]} onOpen={() => setOpenL({ ...openL, [key]: !openL[key] })} onToggleGroup={() => toggleGroup(left, setLeft, list)} onToggle={(id) => toggle(left, setLeft, id)} />
            ))}
          </Panel>

          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-blue-500">{left.length || right.length}명 선택</span>
            <Button variant="blue" size="sm" className="w-24" disabled={!left.length} onClick={() => { setDraft([...ids, ...left]); setLeft([]) }}>→ 추가</Button>
            <Button variant="danger" size="sm" className="w-24" disabled={!right.length} onClick={() => { setDraft(ids.filter((i) => !right.includes(i))); setRight([]) }}>제외 ←</Button>
          </div>

          <Panel title="평가 대상 학생" empty={chosen.length === 0 ? '평가 대상 학생을\n추가해 주세요.' : ''}>
            {chosen.map(([key, list]) => (
              <GroupRow key={key} label={key} count={`${list.length}명`} students={list} checked={right} open={!!openR[key]} onOpen={() => setOpenR({ ...openR, [key]: !openR[key] })} onToggleGroup={() => toggleGroup(right, setRight, list)} onToggle={(id) => toggle(right, setRight, id)} />
            ))}
          </Panel>
        </div>
      </Well>
      <div className="mt-4 flex items-center justify-between">
        <Link to="/school" className="text-sm text-brand-600">ⓘ 새로운 학생 등록이 필요한가요?</Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-700">전체 평가 대상 {ids.length}명</span>
          <Button
            disabled={!changed}
            onClick={async () => {
              if (removedIds.length && !(await confirmAsync(`${removedIds.length}명을 제외하면 해당 학생의 과제 및 평가 데이터가 삭제됩니다.\n계속할까요?`))) return
              setTargets(ev.id, ids)
              setDraft(null)
              toast('평가 대상을 저장했습니다')
            }}
          >
            ✓ 저장
          </Button>
        </div>
      </div>
    </EvalShell>
  )
}

function Panel({ title, children, empty }: { title: string; children: React.ReactNode; empty: string }) {
  return (
    <div className="h-[300px] overflow-y-auto rounded-xl border bg-white p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      {empty ? <div className="flex h-40 flex-col items-center justify-center whitespace-pre-line text-center text-xs text-gray-500">{empty}</div> : <div className="space-y-2">{children}</div>}
    </div>
  )
}

function GroupRow({ label, count, students, checked, open, onOpen, onToggleGroup, onToggle }: { label: string; count: string; students: Student[]; checked: string[]; open: boolean; onOpen: () => void; onToggleGroup: () => void; onToggle: (id: string) => void }) {
  const all = students.every((s) => checked.includes(s.id))
  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <input type="checkbox" className="accent-brand-600" checked={all} onChange={onToggleGroup} aria-label={`${label} 전체 선택`} />
        <span>{label}</span>
        <span className="ml-auto text-xs text-gray-500">{count}</span>
        <button type="button" onClick={onOpen} className="flex h-6 w-6 items-center justify-center rounded text-brand-500 hover:bg-brand-50" aria-label={open ? '접기' : '펼치기'} aria-expanded={open}><Chevron open={open} /></button>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-1 border-t bg-gray-50 px-3 py-2 text-[13px]">
          {students.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5">
              <input type="checkbox" className="accent-brand-600" checked={checked.includes(s.id)} onChange={() => onToggle(s.id)} />
              {s.num}번 {s.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
