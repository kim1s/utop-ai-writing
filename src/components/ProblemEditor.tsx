import { useState } from 'react'
import { MIDDLE_ENGLISH_TEXTBOOKS } from '../data/middleEnglishTextbooks'
import { ACADEMY_PROMPT_EXAMPLES, emptyProblem, generateAcademyProblem, generateProblem, hasProblem } from '../lib/problemGen'
import { LEVEL_LABEL } from '../lib/seed'
import type { Design, Problem } from '../lib/types'
import { Button, Modal, Spinner, confirmAsync, inputCls, toast } from './ui'

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

/** 항목을 추가·삭제하는 목록 입력 (필수 포함 내용, 기타) */
function ListInput({ items, onChange, placeholder, numbered }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; numbered?: boolean }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-sm text-gray-500">{numbered ? `${i + 1}.` : '•'}</span>
          <input className={inputCls} value={it} placeholder={placeholder} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
          <button type="button" aria-label="항목 삭제" className="shrink-0 rounded px-2 py-1 text-gray-400 hover:bg-rose-50 hover:text-rose-500" onClick={() => onChange(items.filter((_, k) => k !== i))}>✕</button>
        </div>
      ))}
      <Button size="sm" variant="soft" onClick={() => onChange([...items, ''])}>＋ 항목 추가</Button>
    </div>
  )
}

/** 문서(워드·한글 등)에 붙여넣기 좋은 일반 텍스트 */
function toPlainText(p: Problem): string {
  const lines = ['[과제 조건]']
  if (p.topic.trim()) lines.push(`주제: ${p.topic.trim()}`)
  if (p.format.trim()) lines.push(`형식: ${p.format.trim()}`)
  const contents = p.contents.map((c) => c.trim()).filter(Boolean)
  if (contents.length) lines.push('필수 포함 내용:', ...contents.map((c, i) => `  ${i + 1}. ${c}`))
  if (p.grammar.length) lines.push(`필수 포함 문법: ${p.grammar.join(', ')}`)
  if (p.length.trim()) lines.push(`분량: ${p.length.trim()}`)
  const etc = p.etc.map((e) => e.trim()).filter(Boolean)
  if (etc.length) lines.push('기타:', ...etc.map((e) => `  - ${e}`))
  return lines.join('\n')
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 클립보드 API를 쓸 수 없는 환경(권한/비보안 컨텍스트) 대비
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}

const L = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <label className="mb-1.5 block text-[13px] font-medium">
    {children} {hint && <span className="font-normal text-gray-500">{hint}</span>}
  </label>
)

/** 과제 조건: 주제 - 형식 - 필수 포함 내용 - 필수 포함 문법 - 분량 - 기타 */
export function ProblemEditor({ design, onChange }: { design: Design; onChange: (p: Problem) => void }) {
  const p = design.problem ?? emptyProblem()
  const [busy, setBusy] = useState(false)
  const [gram, setGram] = useState('')
  const [gramPicker, setGramPicker] = useState(false)
  const [prompt, setPrompt] = useState('')
  const academy = design.org === 'academy'
  const set = (patch: Partial<Problem>) => onChange({ ...p, ...patch })
  const toggleGrammar = (g: string) => set({ grammar: p.grammar.includes(g) ? p.grammar.filter((x) => x !== g) : [...p.grammar, g] })
  const addGrammar = () => {
    if (!gram.trim()) return
    set({ grammar: [...new Set([...p.grammar, gram.trim()])] })
    setGram('')
  }

  const generate = async () => {
    // 학교: 성취기준(+교과서 단원)으로 만든다 / 학원: 선생님이 쓴 프롬프트로 만들고, 비워 두면 학년에 맞는 주제를 무작위로 만든다
    // 프롬프트를 쓰면 학교·학원 모두 프롬프트로 만든다. 비우면 학교는 성취기준(+단원) 기준, 학원은 학년에 맞는 랜덤 주제
    const byPrompt = academy || !!prompt.trim()
    if (!byPrompt && !design.achievements.some((a) => a.text.trim())) return toast('먼저 성취기준을 선택해 주세요')
    if (hasProblem(design.problem) && !(await confirmAsync('이미 입력한 과제 조건이 AI가 만든 내용으로 바뀝니다. 계속할까요?'))) return
    setBusy(true)
    setTimeout(() => {
      onChange(byPrompt ? generateAcademyProblem(design, prompt, p.topic.trim() || undefined) : generateProblem(design))
      setBusy(false)
      toast('AI가 과제 조건을 만들었어요. 내용을 검토하고 자유롭게 수정해 주세요')
    }, 1800)
  }

  const copy = async () => {
    if (!hasProblem(p)) return toast('복사할 과제 조건이 없어요')
    toast((await copyText(toPlainText(p))) ? '과제 조건을 복사했어요. 문서에 붙여넣기 해 보세요' : '복사하지 못했어요. 브라우저 권한을 확인해 주세요')
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm">
        <label htmlFor="problem-prompt" className="mb-1.5 block font-medium text-gray-800">어떤 과제를 내고 싶으신가요? {!academy && <span className="font-normal text-gray-500">(선택)</span>}</label>
        <textarea
          id="problem-prompt"
          className={`${inputCls} min-h-[88px] resize-none`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={300}
          placeholder={ACADEMY_PROMPT_EXAMPLES.slice(0, 3).map((x) => `예) ${x}`).join('\n')}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="py-1 text-xs text-gray-500">예시 프롬프트</span>
          {ACADEMY_PROMPT_EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setPrompt(ex)} className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs text-brand-700 hover:bg-brand-50">
              {ex}
            </button>
          ))}
        </div>
        <p className="mb-3 mt-3 text-gray-700">
          프롬프트를 입력하면 그에 맞는 과제를 만들어 드려요.{' '}
          {academy ? (
            <b className="font-medium">입력하지 않아도 {LEVEL_LABEL[design.schoolLevel]} {design.grade}학년에 맞는 주제가 무작위로 만들어져요.</b>
          ) : (
            <b className="font-medium">입력하지 않으면 {design.unitId ? '교과서 단원 내용과 선택한 성취기준' : '선택한 성취기준'}을 바탕으로 만들어요.</b>
          )}{' '}
          만들어진 내용은 모두 수정할 수 있어요.
        </p>
        <Button onClick={generate} disabled={busy}>{busy ? <><Spinner /> 생성 중…</> : prompt.trim() ? '✨ AI로 과제 조건 만들기' : academy ? '🎲 학년에 맞는 주제 랜덤 생성' : '✨ 성취기준·단원으로 과제 조건 만들기'}</Button>
      </div>

      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={copy}>📋 과제 조건 복사하기</Button>
      </div>

      <div className="space-y-5">
        <div>
          <L>주제</L>
          <input className={inputCls} value={p.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="예) 친구에게 줄 선물을 소개하는 편지 글쓰기" maxLength={100} />
        </div>
        <div>
          <L hint="(선택)">형식</L>
          <input className={inputCls} value={p.format} onChange={(e) => set({ format: e.target.value })} placeholder="예) 편지글" maxLength={50} />
        </div>
        <div>
          <L hint="(선택 · 번호 순서대로 글에 들어가야 하는 내용)">필수 포함 내용</L>
          <ListInput numbered items={p.contents} onChange={(contents) => set({ contents })} placeholder="예) 선물의 내용" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-medium">필수 포함 문법 <span className="font-normal text-gray-500">(선택)</span></label>
            {!academy && <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={() => setGramPicker(true)}>📚 교과서 문법에서 선택</button>}
          </div>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={gram}
              onChange={(e) => setGram(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  addGrammar()
                }
              }}
              placeholder="직접 입력 후 Enter (예: 조동사 should)"
            />
            <Button variant="soft" className="shrink-0 whitespace-nowrap" onClick={addGrammar}>추가</Button>
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
        <div>
          <L hint="(선택)">분량</L>
          <input className={inputCls} value={p.length} onChange={(e) => set({ length: e.target.value })} placeholder="예) 각 문장은 3단어 이상, 전체 글은 50단어 이상을 포함할 것" />
        </div>
        <div>
          <L hint="(선택)">기타</L>
          <ListInput items={p.etc} onChange={(etc) => set({ etc })} placeholder="예) 한국어 사용 금지" />
        </div>
      </div>

      <GrammarPicker open={gramPicker} onClose={() => setGramPicker(false)} design={design} selected={p.grammar} onToggle={toggleGrammar} />
    </div>
  )
}
