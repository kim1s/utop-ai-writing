import { useRef, useState } from 'react'
import { MIDDLE_ENGLISH_TEXTBOOKS } from '../data/middleEnglishTextbooks'
import { LEVEL_LABEL, SCHOOL_NAME } from '../lib/seed'
import { emptyProblem, generateProblem, hasProblem } from '../lib/problemGen'
import { uid } from '../lib/store'
import type { Design, Problem, SheetBlock } from '../lib/types'
import { Button, Modal, Spinner, confirmAsync, inputCls, toast } from './ui'

/** 학생에게 바로 출력해 줄 수 있는 시험지 형태 */
export function ExamSheet({ design, problem }: { design: Design; problem: Problem }) {
  let qNo = 0
  return (
    <div className="mx-auto w-full max-w-[680px] bg-white px-12 py-10 text-[13px] leading-7 text-gray-900 shadow-md print:shadow-none" style={{ fontFamily: 'Batang, "Noto Serif KR", serif' }}>
      <div className="mb-4 flex items-end justify-between border-b-2 border-gray-900 pb-2">
        <div>
          <div className="text-xs text-gray-600">{SCHOOL_NAME} · {design.year}학년도 {design.semester}학기 {design.subject} 서·논술형 평가</div>
          <div className="text-xl font-bold">{problem.title || '(과제명)'}</div>
        </div>
        <div className="text-xs">{LEVEL_LABEL[design.schoolLevel]} {design.grade}학년 &nbsp; ____반 ____번 &nbsp; 이름: ________</div>
      </div>

      {problem.description && <p className="mb-3 whitespace-pre-line rounded border border-gray-400 bg-gray-50 p-3 font-medium">{problem.description}</p>}
      {(problem.length || problem.grammar.length > 0) && (
        <ul className="mb-4 list-disc pl-5 text-[12px]">
          {problem.length && <li>분량: {problem.length}</li>}
          {problem.grammar.length > 0 && <li>필수 포함 문법: {problem.grammar.join(', ')}</li>}
        </ul>
      )}

      {problem.sheet.map((b) => {
        if (b.type === 'image') return b.content ? <figure key={b.id} className="my-3 text-center"><img src={b.content} alt={b.caption ?? '시험지 이미지'} className="mx-auto max-h-64 max-w-full" />{b.caption && <figcaption className="text-xs text-gray-600">{b.caption}</figcaption>}</figure> : null
        if (b.type === 'question') {
          qNo += 1
          return (
            <div key={b.id} className="my-4">
              <p className="whitespace-pre-line font-bold">{qNo}. {b.content}</p>
              <div className="mt-2 space-y-4">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="border-b border-gray-400" style={{ height: 24 }} />)}</div>
            </div>
          )
        }
        return <div key={b.id} className="my-3 whitespace-pre-line rounded border border-gray-500 p-3">{b.content}</div>
      })}
    </div>
  )
}

/** 교과서 Language Use 문법을 단원별로 보고 고르는 창 (현재 단원이 아니어도 선택 가능) */
function GrammarPicker({ open, onClose, design, selected, onToggle }: { open: boolean; onClose: () => void; design: Design; selected: string[]; onToggle: (g: string) => void }) {
  const [tbId, setTbId] = useState(design.textbookId ?? MIDDLE_ENGLISH_TEXTBOOKS.find((t) => t.grade === design.grade)?.id ?? 'eng1')
  const tb = MIDDLE_ENGLISH_TEXTBOOKS.find((t) => t.id === tbId) ?? MIDDLE_ENGLISH_TEXTBOOKS[0]
  return (
    <Modal open={open} title="교과서 문법에서 선택" onClose={onClose} width="max-w-2xl" footer={<Button onClick={onClose}>완료 ({selected.length}개 선택)</Button>}>
      <p className="mb-3 text-sm text-gray-600">교과서 단원의 Language Use에 나온 문법이에요. 지금 평가의 단원이 아니어도 고를 수 있어요.</p>
      <div className="mb-3 flex gap-2">
        {MIDDLE_ENGLISH_TEXTBOOKS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTbId(t.id)} className={`rounded-full border px-4 py-1.5 text-sm ${t.id === tbId ? 'border-brand-500 bg-brand-50 font-medium text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.name}
          </button>
        ))}
      </div>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
        {tb.units.map((u) => {
          const current = design.textbookId === tb.id && design.unitId === u.id
          return (
            <div key={u.id} className={`rounded-xl border p-3 ${current ? 'border-brand-300 bg-brand-50/40' : ''}`}>
              <div className="mb-2 flex items-center gap-2 text-sm">
                <b>{u.label}</b>
                <span className="text-gray-700">{u.title}</span>
                {current && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] text-white">이 평가의 단원</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {u.languageUse.map((g) => {
                  const on = selected.includes(g)
                  return (
                    <button key={g} type="button" aria-pressed={on} onClick={() => onToggle(g)} className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-brand-400'}`}>
                      {on ? '✓ ' : ''}{g}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

const BLOCK_LABEL = { text: '지문·텍스트', image: '이미지', question: '문제' } as const

/** 문제 만들기 (선택): AI 생성 + 모든 항목을 선생님이 수정 */
export function ProblemEditor({ design, onChange }: { design: Design; onChange: (p: Problem) => void }) {
  const p = design.problem ?? emptyProblem()
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [gram, setGram] = useState('')
  const [gramPicker, setGramPicker] = useState(false)
  const toggleGrammar = (g: string) => set({ grammar: p.grammar.includes(g) ? p.grammar.filter((x) => x !== g) : [...p.grammar, g] })
  const imgInput = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<Problem>) => onChange({ ...p, ...patch })
  const setBlock = (id: string, patch: Partial<SheetBlock>) => set({ sheet: p.sheet.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
  const move = (i: number, dir: -1 | 1) => {
    const arr = [...p.sheet]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    set({ sheet: arr })
  }

  const generate = async () => {
    if (!design.achievements.some((a) => a.text.trim())) return toast('먼저 성취기준을 선택해 주세요')
    if (hasProblem(design.problem) && !(await confirmAsync('이미 입력한 문제 내용이 AI가 만든 내용으로 바뀝니다. 계속할까요?'))) return
    setBusy(true)
    setTimeout(() => {
      onChange(generateProblem(design))
      setBusy(false)
      toast('AI가 문제를 만들었어요. 내용을 검토하고 자유롭게 수정해 주세요')
    }, 1800)
  }

  const addImage = (f: File) => {
    if (!/^image\//.test(f.type)) return toast('이미지 파일만 추가할 수 있습니다')
    if (f.size > 600 * 1024) return toast('이미지는 600KB 이하만 추가할 수 있어요 (프로토타입 저장 용량 제한)')
    const r = new FileReader()
    r.onload = () => set({ sheet: [...p.sheet, { id: uid('b'), type: 'image', content: String(r.result), caption: '' }] })
    r.readAsDataURL(f)
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm">
        <p className="mb-3 text-gray-700">성취기준{design.unitId ? '과 교과서 단원' : ''}을 바탕으로 영어 라이팅 과제를 AI가 만들어 드려요. 직접 입력해도 되고, 이 단계는 건너뛸 수 있어요.</p>
        <Button onClick={generate} disabled={busy}>{busy ? <><Spinner /> 생성 중…</> : '✨ AI로 문제 만들기'}</Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">과제명 <span className="font-normal text-gray-500">(학생에게 보여요)</span></label>
          <input className={inputCls} value={p.title} onChange={(e) => set({ title: e.target.value })} placeholder="예) 이메일에 답하기" maxLength={60} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">설명 <span className="font-normal text-gray-500">(학생에게 과제를 설명하는 글)</span></label>
          <textarea className={`${inputCls} h-24 resize-none leading-6`} value={p.description} onChange={(e) => set({ description: e.target.value })} placeholder="예) 당신은 축제 운영 담당자입니다. 문의 이메일을 읽고 축제 자료를 참고하여 답장을 작성해 보세요." />
        </div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium">분량</label>
            <input className={inputCls} value={p.length} onChange={(e) => set({ length: e.target.value })} placeholder="예) 5~7문장 (약 50~70 단어)" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between"><label className="text-[13px] font-medium">필수 포함 문법</label><button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={() => setGramPicker(true)}>📚 교과서 문법에서 선택</button></div>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={gram}
                onChange={(e) => setGram(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    if (gram.trim()) { set({ grammar: [...new Set([...p.grammar, gram.trim()])] }); setGram('') }
                  }
                }}
                placeholder="입력 후 Enter (예: 조동사 should)"
              />
              <Button variant="soft" className="shrink-0 whitespace-nowrap" onClick={() => { if (gram.trim()) { set({ grammar: [...new Set([...p.grammar, gram.trim()])] }); setGram('') } }}>추가</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.grammar.map((g) => (
                <span key={g} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700">
                  {g}
                  <button type="button" aria-label={`${g} 삭제`} className="text-brand-400 hover:text-rose-500" onClick={() => set({ grammar: p.grammar.filter((x) => x !== g) })}>✕</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13px] font-medium">시험지 <span className="font-normal text-gray-500">(지문 · 이미지 · 문제를 자유롭게 구성)</span></label>
            <Button size="sm" variant="outline" disabled={!p.title && !p.sheet.length} onClick={() => setPreview(true)}>🖨 시험지 미리보기·출력</Button>
          </div>
          <div className="space-y-3">
            {p.sheet.map((b, i) => (
              <div key={b.id} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-700">{BLOCK_LABEL[b.type]}</span>
                  <span className="ml-auto flex gap-1 text-gray-500">
                    <button type="button" aria-label="위로" className="rounded px-1.5 hover:bg-gray-100 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
                    <button type="button" aria-label="아래로" className="rounded px-1.5 hover:bg-gray-100 disabled:opacity-30" disabled={i === p.sheet.length - 1} onClick={() => move(i, 1)}>▼</button>
                    <button type="button" aria-label="삭제" className="rounded px-1.5 hover:bg-rose-50 hover:text-rose-500" onClick={() => set({ sheet: p.sheet.filter((x) => x.id !== b.id) })}>🗑</button>
                  </span>
                </div>
                {b.type === 'image' ? (
                  <div className="flex items-start gap-3">
                    <img src={b.content} alt="시험지 이미지" className="h-24 rounded border object-contain" />
                    <input className={inputCls} placeholder="이미지 설명(캡션, 선택)" value={b.caption ?? ''} onChange={(e) => setBlock(b.id, { caption: e.target.value })} />
                  </div>
                ) : (
                  <textarea className={`${inputCls} min-h-20 resize-y leading-6`} value={b.content} onChange={(e) => setBlock(b.id, { content: e.target.value })} placeholder={b.type === 'question' ? '문제를 입력해 주세요.' : '지문이나 안내 텍스트를 입력해 주세요.'} />
                )}
              </div>
            ))}
            {p.sheet.length === 0 && <p className="rounded-xl border border-dashed p-5 text-center text-xs text-gray-500">시험지에 들어갈 내용을 추가해 주세요.</p>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="soft" onClick={() => set({ sheet: [...p.sheet, { id: uid('b'), type: 'text', content: '' }] })}>＋ 지문·텍스트</Button>
            <Button size="sm" variant="soft" onClick={() => imgInput.current?.click()}>＋ 이미지</Button>
            <Button size="sm" variant="soft" onClick={() => set({ sheet: [...p.sheet, { id: uid('b'), type: 'question', content: '' }] })}>＋ 문제</Button>
            <input ref={imgInput} type="file" accept="image/*" hidden onChange={(e) => { if (e.target.files?.[0]) addImage(e.target.files[0]); e.target.value = '' }} />
          </div>
        </div>
      </div>

      <GrammarPicker open={gramPicker} onClose={() => setGramPicker(false)} design={design} selected={p.grammar} onToggle={toggleGrammar} />
      <Modal open={preview} title="시험지 미리보기" onClose={() => setPreview(false)} width="max-w-3xl" footer={<><Button variant="gray" onClick={() => setPreview(false)}>닫기</Button><Button onClick={() => window.print()}>🖨 출력</Button></>}>
        <div className="max-h-[70vh] overflow-y-auto bg-gray-100 p-4"><ExamSheet design={design} problem={p} /></div>
      </Modal>
      {/* 인쇄 전용 (모달은 인쇄에서 제외되므로 별도 출력 영역을 둔다) */}
      {preview && <div className="hidden print:block print-area"><ExamSheet design={design} problem={p} /></div>}
    </div>
  )
}
