import { useRef, useState } from 'react'
import type { CorrectionSentence, Seg, TextColor } from '../lib/types'

const COLORS: Record<TextColor, string> = { red: '#dc3b2b', blue: '#2563eb', black: '#111827' }
type Kind = 'original' | 'revised'
type View = 'both' | 'original' | 'revised'

/** [start,end) 구간의 글자 색을 바꾸고 같은 색의 이웃 구간은 합친다 */
function recolor(segs: Seg[], start: number, end: number, color: TextColor): Seg[] {
  const out: Seg[] = []
  let pos = 0
  for (const s of segs) {
    const a = pos
    const b = pos + s.t.length
    pos = b
    const from = Math.max(start, a)
    const to = Math.min(end, b)
    if (from >= to) {
      out.push(s)
      continue
    }
    if (from > a) out.push({ t: s.t.slice(0, from - a), c: s.c })
    out.push({ t: s.t.slice(from - a, to - a), c: color })
    if (to < b) out.push({ t: s.t.slice(to - a), c: s.c })
  }
  return out.reduce<Seg[]>((acc, s) => {
    const prev = acc[acc.length - 1]
    if (prev && (prev.c ?? 'black') === (s.c ?? 'black')) prev.t += s.t
    else acc.push({ ...s })
    return acc
  }, [])
}

const plain = (segs: Seg[]) => segs.map((s) => s.t).join('')

/** 수정문을 직접 고쳤을 때: 원문에 없던 단어는 파란색으로 자동 표시 */
function autoRevised(original: Seg[], revised: string): Seg[] {
  const known = new Set(plain(original).toLowerCase().split(/\s+/).map((w) => w.replace(/[^\w']/g, '')))
  const parts = revised.split(/(\s+)/)
  const out: Seg[] = parts.map((t) => ({ t, c: /\S/.test(t) && !known.has(t.toLowerCase().replace(/[^\w']/g, '')) ? 'blue' : undefined }))
  return out.reduce<Seg[]>((acc, s) => {
    const prev = acc[acc.length - 1]
    if (prev && (prev.c ?? 'black') === (s.c ?? 'black')) prev.t += s.t
    else acc.push({ ...s })
    return acc
  }, [])
}

function Line({ segs, id, kind, bold }: { segs: Seg[]; id: string; kind: Kind; bold?: boolean }) {
  // 선택 위치 계산을 위해 라인 안에는 구간 텍스트 외의 노드를 두지 않는다
  return (
    <span data-line={kind} data-id={id} className={bold ? 'font-bold' : ''}>
      {segs.map((s, i) => (
        <span key={i} style={{ color: COLORS[s.c ?? 'black'] }}>{s.t}</span>
      ))}
    </span>
  )
}

/** 첨삭: AI가 1차로 만든 뒤 선생님이 수정 이유(회색 영역)를 고치고 글자 색을 바꾼다. 학생 원문 텍스트는 바꿀 수 없다. */
export function CorrectionPanel({ value, onChange }: { value: CorrectionSentence[]; onChange: (v: CorrectionSentence[]) => void }) {
  const [view, setView] = useState<View>('both')
  const [palette, setPalette] = useState<{ x: number; y: number; id: string; kind: Kind; start: number; end: number } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const root = useRef<HTMLDivElement>(null)

  const patch = (id: string, p: Partial<CorrectionSentence>) => onChange(value.map((s) => (s.id === id ? { ...s, ...p } : s)))

  const onMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return setPalette(null)
    const range = sel.getRangeAt(0)
    const find = (n: Node) => (n instanceof Element ? n : n.parentElement)?.closest('[data-line]') as HTMLElement | null
    const a = find(range.startContainer)
    const b = find(range.endContainer)
    if (!a || a !== b || !root.current?.contains(a)) return setPalette(null)
    const pre = document.createRange()
    pre.selectNodeContents(a)
    pre.setEnd(range.startContainer, range.startOffset)
    const start = pre.toString().length
    const end = start + range.toString().length
    if (end <= start) return setPalette(null)
    const rect = range.getBoundingClientRect()
    setPalette({ x: rect.left + rect.width / 2, y: rect.top, id: a.dataset.id!, kind: a.dataset.line as Kind, start, end })
  }

  const apply = (color: TextColor) => {
    if (!palette) return
    const s = value.find((x) => x.id === palette.id)
    if (!s) return
    patch(s.id, { [palette.kind]: recolor(s[palette.kind], palette.start, palette.end, color) })
    window.getSelection()?.removeAllRanges()
    setPalette(null)
  }

  const saveRevised = (s: CorrectionSentence) => {
    const text = draft.trim()
    if (text) patch(s.id, { revised: autoRevised(s.original, text) })
    setEditing(null)
  }

  return (
    <div ref={root} onMouseUp={onMouseUp} className="relative">
      <div className="mb-1 flex items-end justify-between border-b">
        <h3 className="pb-2 text-xl font-bold">첨삭</h3>
        <div className="flex text-sm">
          {([['both', '원문+수정 보기'], ['original', '원문 보기'], ['revised', '수정문 보기']] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setView(k)} className={`px-3 pb-2 ${view === k ? 'border-b-2 border-gray-900 font-semibold' : 'text-gray-500'}`}>{l}</button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-xs text-gray-500">글자를 드래그하면 색을 바꿀 수 있어요. 학생 원문은 바꿀 수 없고 색만 바꿀 수 있어요. 회색 영역은 직접 수정할 수 있어요.</p>

      {value.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">첨삭할 내용이 없어요.</p>}

      {view === 'both' ? (
        <ol className="space-y-5">
          {value.map((s, i) => (
            <li key={s.id} className="flex gap-3">
              <span className="w-4 pt-0.5 text-right text-xs text-gray-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-7"><Line segs={s.original} id={s.id} kind="original" /></p>
                <div className="mt-2 rounded-xl bg-gray-100 p-4">
                  {editing === s.id ? (
                    <div className="flex gap-2">
                      <input autoFocus className="w-full rounded-lg border px-3 py-1.5 text-[15px]" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveRevised(s); if (e.key === 'Escape') setEditing(null) }} />
                      <button type="button" className="shrink-0 rounded-lg bg-brand-600 px-3 text-sm text-white" onClick={() => saveRevised(s)}>적용</button>
                    </div>
                  ) : (
                    <p className="group flex items-start justify-between gap-2 text-[15px] leading-7">
                      <span><Line segs={s.revised} id={s.id} kind="revised" bold /></span>
                      <button type="button" title="수정문 편집" aria-label="수정문 편집" className="shrink-0 text-xs text-gray-400 hover:text-brand-600" onClick={() => { setDraft(plain(s.revised)); setEditing(s.id) }}>✎</button>
                    </p>
                  )}
                  <textarea
                    className="mt-2 w-full resize-none bg-transparent text-[13px] leading-6 text-gray-600 placeholder:text-gray-400 focus:bg-white/60"
                    rows={Math.max(2, s.note.split('\n').length)}
                    placeholder="수정 이유를 입력해 주세요."
                    value={s.note}
                    onChange={(e) => patch(s.id, { note: e.target.value })}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl bg-gray-50 p-5 text-[15px] leading-8">
          {value.map((s) => (
            <span key={s.id}>
              <Line segs={view === 'original' ? s.original : s.revised} id={s.id} kind={view} />{' '}
            </span>
          ))}
        </p>
      )}

      {palette && (
        <div className="fixed z-[60] flex gap-2 rounded-full bg-white px-3 py-2 shadow-xl ring-1 ring-black/10" style={{ left: palette.x, top: palette.y - 52, transform: 'translateX(-50%)' }} onMouseDown={(e) => e.preventDefault()}>
          {(['red', 'blue', 'black'] as const).map((c) => (
            <button key={c} type="button" aria-label={`${c} 색으로 변경`} onClick={() => apply(c)} className="h-6 w-6 rounded-full ring-2 ring-white hover:scale-110" style={{ background: COLORS[c] }} />
          ))}
        </div>
      )}
    </div>
  )
}

/** 읽기 전용 첨삭 (리포트·출력용). 선생님이 수정한 색·수정 이유가 그대로 보인다. */
export function CorrectionView({ value, compact = false }: { value: CorrectionSentence[]; compact?: boolean }) {
  return (
    <ol className={compact ? 'space-y-3' : 'space-y-5'}>
      {value.map((s, i) => (
        <li key={s.id} className="flex gap-3 break-inside-avoid">
          <span className="w-4 pt-0.5 text-right text-xs text-gray-400">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className={compact ? 'text-[13px] leading-6' : 'text-[15px] leading-7'}>
              {s.original.map((g, k) => <span key={k} style={{ color: COLORS[g.c ?? 'black'] }}>{g.t}</span>)}
            </p>
            <div className="mt-1.5 rounded-xl bg-gray-100 p-3">
              <p className={`font-bold ${compact ? 'text-[13px] leading-6' : 'text-[15px] leading-7'}`}>
                {s.revised.map((g, k) => <span key={k} style={{ color: COLORS[g.c ?? 'black'] }}>{g.t}</span>)}
              </p>
              {s.note && <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-gray-600">{s.note}</p>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
