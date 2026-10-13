import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { EvalShell } from '../../components/Layout'
import { Button, Checkbox, Chevron, Modal, NumberInput, Radio, Select, Spinner, inputCls, toast } from '../../components/ui'
import { criterionMax, designMax } from '../../lib/grading'
import { CURRENT_YEAR, LEVEL_LABEL, SAMPLE_CRITERIA, SCHOOL_LEVELS, SUBJECT_OPTIONS, achievementsFor } from '../../lib/seed'
import { useMe, useOrgData, useStore } from '../../lib/store'
import { emptyAchievement, emptyCriterion } from '../../lib/blank'
import { ProblemEditor } from '../../components/ProblemEditor'
import { generateCriteria, hasProblem } from '../../lib/problemGen'
import { textbooksFor, unitOptions } from '../../data/middleEnglishTextbooks'
import type { Achievement, Criterion, Design, SchoolLevel } from '../../lib/types'


export default function DesignForm() {
  const { evalId } = useParams()
  const saveDesign = useStore((s) => s.saveDesign)
  const me = useMe()
  const { designs } = useOrgData()
  const existing = designs.find((d) => d.id === evalId)

  const [d, setD] = useState<Design>(() => structuredClone(existing as Design))
  const [criteriaMode, setCriteriaMode] = useState<'manual' | 'ai'>('manual')
  const [aiBusy, setAiBusy] = useState(false)
  const [exampleOpen, setExampleOpen] = useState(false)
  // 학원: 성취기준·교과서·단원을 쓰지 않고, 과제 조건(선생님 프롬프트 기반)으로 평가를 설계한다
  const academy = d?.org === 'academy'
  const catalog = useMemo(() => achievementsFor(d?.subject ?? '', d?.schoolLevel ?? ''), [d?.subject, d?.schoolLevel])

  if (evalId && !existing) return <Navigate to="/" replace />
  const total = designMax(d)
  const patch = (p: Partial<Design>) =>
    setD((x) => {
      const next = { ...x, ...p }
      const tb = textbooksFor(next.subject, next.schoolLevel).find((t) => t.id === next.textbookId)
      // 교과서는 학교급·교과·학년과 맞을 때만 유지
      if (next.textbookId && (!tb || tb.grade !== next.grade)) return { ...next, textbookId: undefined, unitId: undefined }
      return next
    })
  const textbooks = textbooksFor(d.subject, d.schoolLevel)
  const textbook = textbooks.find((t) => t.id === d.textbookId)

  const setAch = (i: number, a: Achievement) => patch({ achievements: d.achievements.map((x, k) => (k === i ? a : x)) })
  const setCrit = (i: number, c: Criterion) => patch({ criteria: d.criteria.map((x, k) => (k === i ? c : x)) })

  const generateAi = () => {
    if (academy) {
      if (!hasProblem(d.problem)) return toast('먼저 과제 조건을 만들어 주세요')
    } else if (!d.achievements.some((a) => a.text.trim() || a.levels.some((l) => l.text.trim()))) return toast('먼저 성취기준을 입력해 주세요')
    setAiBusy(true)
    setTimeout(() => {
      patch({ criteria: generateCriteria(d) })
      setCriteriaMode('manual')
      setAiBusy(false)
      toast(academy ? '과제 조건을 반영해 채점기준 초안을 만들었어요. 검토 후 수정해 주세요' : hasProblem(d.problem) ? '교과서 단원·성취기준·과제 조건을 반영해 채점기준 초안을 만들었어요. 검토 후 수정해 주세요' : '교과서 단원과 성취기준을 반영해 채점기준 초안을 만들었어요. 검토 후 수정해 주세요')
    }, 1800)
  }

  const validate = (): string | null => {
    if (!d.name.trim()) return '평가명을 입력해 주세요'
    if (!d.problem?.topic.trim()) return '과제 조건의 주제를 입력해 주세요'
    if (!academy && !d.achievements.some((a) => a.text.trim() || a.code)) return '성취기준을 한 개 이상 입력해 주세요'
    if (!d.criteria.length) return '채점기준을 한 개 이상 입력해 주세요'
    for (const [i, c] of d.criteria.entries()) {
      if (!c.element.trim()) return `채점기준 ${i + 1}의 채점요소를 입력해 주세요`
      if (c.scores.length < 2) return `채점기준 ${i + 1}에는 배점이 두 개 이상 필요합니다`
      if (c.scores.some((s) => !s.desc.trim())) return `채점기준 ${i + 1}의 세부 기준을 모두 입력해 주세요`
      if (new Set(c.scores.map((s) => s.score)).size !== c.scores.length) return `채점기준 ${i + 1}에 같은 점수가 중복되어 있습니다`
    }
    if (d.scoreMode === 'grade') {
      if (d.grades.length < 2) return '등급은 두 개 이상 필요합니다'
      if (d.grades.some((g) => g.converted == null || g.max == null || g.min == null)) return '등급별 환산 점수와 배점 구간을 모두 입력해 주세요'
    }
    return null
  }

  const save = (draft: boolean) => {
    if (!draft) {
      const err = validate()
      if (err) return toast(err)
    } else if (!d.name.trim()) return toast('임시저장하려면 평가명을 입력해 주세요')
    saveDesign({ ...d, status: draft ? 'draft' : 'saved' })
    toast(draft ? '임시저장했습니다' : '설계를 저장했습니다')
  }

  // 등급 환산 표: 첫 등급 최대=만점, 마지막 등급 최소=0 고정
  const grades = d.grades.map((g, i, arr) => ({ ...g, max: i === 0 ? total : g.max, min: i === arr.length - 1 ? 0 : g.min }))

  return (
    <EvalShell tab="design">
      <h2 className="text-xl font-semibold">평가 설계</h2>
      <p className="mt-1 text-[13px] text-gray-600">{academy ? '과제 조건과 채점기준, 점수 계산 방식을 입력해 주세요.' : '성취기준과 채점기준, 점수 계산 방식을 입력해 주세요.'}</p>

      <div className="mt-6 rounded-2xl bg-gray-50 p-5">
        <div className="space-y-8 rounded-2xl bg-white p-6">
          {/* 1 */}
          <Step n={1} title="기본 정보">
            <label className="mb-1.5 block text-[13px] font-medium">평가명 <span className="font-normal text-gray-500">(선생님이 평가를 구분하기 위한 이름이에요)</span></label>
            <input className={inputCls} value={d.name} onChange={(e) => patch({ name: e.target.value })} placeholder="예) 1학기 중간 서술형 1-1반" maxLength={60} />
            <div className="mt-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <div>
                <div className="mb-1.5 text-[13px] font-medium">학교급</div>
                <Select value={d.schoolLevel} onChange={(v) => patch({ schoolLevel: v as SchoolLevel })} className="w-full" options={SCHOOL_LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} />
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-medium">학년</div>
                <Select value={d.grade} onChange={(v) => patch({ grade: Number(v) })} className="w-full" options={(d.schoolLevel === '초' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3]).map((g) => ({ value: g, label: `${g}학년` }))} />
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-medium">학년도 / 학기</div>
                <Select
                  value={`${d.year}-${d.semester}`}
                  onChange={(v) => { const [y, s] = v.split('-').map(Number); patch({ year: y, semester: s as 1 | 2 }) }}
                  className="w-full"
                  options={[CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1].flatMap((y) => [1, 2].map((s) => ({ value: `${y}-${s}`, label: `${y}학년도 ${s}학기` })))}
                />
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-medium">교과</div>
                <Select value={d.subject} onChange={(v) => patch({ subject: v })} className="w-full" options={(me.subjects.length ? me.subjects : SUBJECT_OPTIONS).map((x) => ({ value: x, label: x }))} />
              </div>
            </div>
            {!academy && textbooks.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <div>
                  <div className="mb-1.5 text-[13px] font-medium">교과서 <span className="font-normal text-gray-500">(선택)</span></div>
                  <Select
                    value={d.textbookId ?? ''}
                    onChange={(v) => {
                      const tb = textbooks.find((t) => t.id === v)
                      patch(tb ? { textbookId: tb.id, grade: tb.grade, unitId: undefined } : { textbookId: undefined, unitId: undefined })
                    }}
                    className="w-full"
                    placeholder="교과서 선택 안 함"
                    options={textbooks.map((t) => ({ value: t.id, label: `${t.name} (${t.grade}학년)` }))}
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[13px] font-medium">단원 <span className="font-normal text-gray-500">(선택)</span></div>
                  <Select
                    value={d.unitId ?? ''}
                    onChange={(v) => patch({ unitId: v || undefined })}
                    className="w-full"
                    placeholder={textbook ? '단원 선택 안 함' : '교과서를 먼저 선택해 주세요'}
                    options={textbook ? unitOptions(textbook).map((o) => ({ value: o.id, label: o.label })) : []}
                  />
                </div>
              </div>
            )}
            <div className="mb-1.5 mt-5 text-[13px] font-medium">공개 여부</div>
            <div className="flex gap-6">
              <Radio name="vis" checked={d.visibility === 'school'} onChange={() => patch({ visibility: 'school' })} label={academy ? '학원 내 공개' : '교내 공개'} />
              <Radio name="vis" checked={d.visibility === 'private'} onChange={() => patch({ visibility: 'private' })} label="비공개" />
            </div>
          </Step>

          {/* 2 (학원은 성취기준 없음) */}
          {!academy && <Step n={2} title="성취기준 입력" help="교육과정 성취기준을 검색해 선택하거나 직접 입력할 수 있어요. 성취수준(상/중/하)은 채점기준을 만드는 근거가 됩니다.">
            <div className="space-y-4">
              {d.achievements.map((a, i) => {
                const custom = a.custom ?? false
                return (
                  <div key={i} className="rounded-xl border p-4">
                    <div className="mb-3 flex items-center gap-4 text-[13px]">
                      <b>성취기준 {i + 1}</b>
                      <Checkbox
                        label="직접 입력"
                        checked={custom}
                        onChange={(v) => {
                          setAch(i, { ...emptyAchievement(), custom: v })
                        }}
                      />
                      <button type="button" className="ml-auto text-gray-500 hover:text-rose-500" onClick={() => patch({ achievements: d.achievements.filter((_, k) => k !== i) })}>🗑 삭제</button>
                    </div>
                    {custom ? (
                      <div className="space-y-2">
                        <input className={inputCls} placeholder="성취기준 코드 (예: [10통과01-01])" value={a.code} onChange={(e) => setAch(i, { ...a, code: e.target.value })} />
                        <textarea className={`${inputCls} h-16 resize-none`} placeholder="성취기준 내용을 입력해 주세요." value={a.text} onChange={(e) => setAch(i, { ...a, text: e.target.value })} />
                      </div>
                    ) : (
                      <AchievementPicker value={a} options={catalog} onPick={(p) => setAch(i, structuredClone(p))} />
                    )}
                    {(a.text || custom) && (
                      <div className="mt-3">
                        <table className="w-full border text-[13px]">
                          <tbody>
                            {a.levels.map((l, k) => (
                              <tr key={k} className="border-b last:border-0">
                                <td className="w-12 border-r bg-gray-50 p-0 text-center">
                                  {custom ? <input className="w-full bg-transparent py-2 text-center" value={l.label} onChange={(e) => setAch(i, { ...a, levels: a.levels.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })} /> : l.label}
                                </td>
                                <td className="p-0">
                                  <textarea
                                    className="block h-auto min-h-10 w-full resize-none bg-transparent px-3 py-2"
                                    rows={2}
                                    value={l.text}
                                    onChange={(e) => setAch(i, { ...a, levels: a.levels.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)) })}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-2 flex gap-4 text-[13px] text-brand-600">
                          <button type="button" onClick={() => setAch(i, { ...a, levels: [...a.levels, { label: `수준${a.levels.length + 1}`, text: '' }] })}>⊕ 성취수준 추가</button>
                          <button type="button" disabled={a.levels.length <= 1} className="disabled:opacity-40" onClick={() => setAch(i, { ...a, levels: a.levels.slice(0, -1) })}>⊖ 성취수준 제거</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <Button variant="soft" className="mt-3 !rounded-full" onClick={() => patch({ achievements: [...d.achievements, emptyAchievement()] })}>＋ 성취기준 추가</Button>
          </Step>}

          <Step n={academy ? 2 : 3} title="과제 조건" help={academy ? '학생이 써야 할 글의 조건이에요. 원하는 과제를 프롬프트로 입력하면 AI가 만들어 주고, 입력하지 않으면 학년에 맞는 주제가 무작위로 만들어져요. 모든 항목을 수정할 수 있어요.' : '학생이 써야 할 글의 조건이에요. 성취기준과 교과서 단원을 바탕으로 AI가 만들어 주고, 모든 항목을 수정할 수 있어요.'}>
            <ProblemEditor design={d} onChange={(problem) => patch({ problem })} />
          </Step>

          {/* 3 */}
          <Step n={academy ? 3 : 4} title="채점기준 입력" help="채점요소별로 점수와 그 점수에 해당하는 세부 기준을 입력해요. AI 채점은 이 채점기준을 근거로 진행됩니다.">
            <div className="mb-4 flex gap-6">
              <Radio name="cm" checked={criteriaMode === 'manual'} onChange={() => setCriteriaMode('manual')} label="직접 입력하기" />
              <Radio name="cm" checked={criteriaMode === 'ai'} onChange={() => setCriteriaMode('ai')} label="AI로 만들기" />
            </div>
            {criteriaMode === 'ai' && (
              <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/60 p-5 text-sm">
                <p className="mb-3 text-gray-700">{academy ? '위에서 입력한 과제 조건(주제·형식·필수 포함 내용·문법·분량)을 반영해 AI가 채점기준 초안을 만들어 드려요.' : hasProblem(d.problem) ? '교과서 단원 내용, 선택한 성취기준, 위에서 입력한 과제 조건을 모두 반영해 AI가 채점기준 초안을 만들어 드려요.' : '과제 조건이 비어 있으면 교과서 단원 내용과 성취기준만 반영해 AI가 채점기준 초안을 만들어 드려요.'} 만들어진 뒤에는 직접 수정할 수 있어요.</p>
                <Button onClick={generateAi} disabled={aiBusy}>{aiBusy ? <><Spinner /> 생성 중…</> : '✨ AI로 채점기준 생성'}</Button>
              </div>
            )}
            {criteriaMode === 'manual' && (
              <>
                <div className="space-y-4">
                  {d.criteria.map((c, i) => (
                    <div key={i} className="rounded-xl border p-4">
                      <div className="mb-3 flex items-center justify-between text-[13px]">
                        <b>채점기준 {i + 1}</b>
                        <button type="button" className="text-gray-500 hover:text-rose-500" onClick={() => patch({ criteria: d.criteria.filter((_, k) => k !== i) })}>🗑 삭제</button>
                      </div>
                      <div className="grid grid-cols-[180px_1fr] gap-2 max-md:grid-cols-1">
                        <textarea className={`${inputCls} min-h-24 resize-none`} placeholder="채점요소를 입력해 주세요." value={c.element} onChange={(e) => setCrit(i, { ...c, element: e.target.value })} />
                        <div className="rounded-lg border">
                          {c.scores.map((s, k) => (
                            <div key={k} className="flex border-b last:border-0">
                              <div className="flex w-16 items-center border-r px-1">
                                <NumberInput value={s.score} min={0} className="w-full border-0 text-center" onChange={(v) => setCrit(i, { ...c, scores: c.scores.map((x, j) => (j === k ? { ...x, score: v } : x)) })} />
                              </div>
                              <textarea rows={2} className="flex-1 resize-none px-3 py-2 text-sm" placeholder="해당 점수에 해당하는 세부 기준을 입력해 주세요." value={s.desc} onChange={(e) => setCrit(i, { ...c, scores: c.scores.map((x, j) => (j === k ? { ...x, desc: e.target.value } : x)) })} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-center gap-4 text-[13px] text-brand-600">
                        <button
                          type="button"
                          onClick={() => {
                            const min = Math.min(...c.scores.map((s) => s.score), 1)
                            setCrit(i, { ...c, scores: [...c.scores, { score: Math.max(min - 1, 0), desc: '' }] })
                          }}
                        >
                          ⊕ 배점 추가
                        </button>
                        <button type="button" disabled={c.scores.length <= 2} className="disabled:opacity-40" onClick={() => setCrit(i, { ...c, scores: c.scores.slice(0, -1) })}>⊖ 배점 제거</button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="soft" className="mt-3 !rounded-full" onClick={() => patch({ criteria: [...d.criteria, emptyCriterion()] })}>＋ 채점기준 추가</Button>
                <p className="mt-2 text-[13px] text-gray-700">
                  어떻게 입력해야 하나요? <button type="button" className="text-brand-600 underline-offset-2 hover:underline" onClick={() => setExampleOpen(true)}>채점기준 입력 예시</button>
                </p>
              </>
            )}
          </Step>

          {/* 4 */}
          <Step n={academy ? 4 : 5} title="점수 계산 방식" help="채점기준 배점을 그대로 쓰거나, 원점수 구간별로 등급 환산 점수를 줄 수 있어요.">
            <div className="mb-4 flex gap-6">
              <Radio name="sm" checked={d.scoreMode === 'raw'} onChange={() => patch({ scoreMode: 'raw' })} label="채점기준 배점 그대로 사용" />
              <Radio name="sm" checked={d.scoreMode === 'grade'} onChange={() => patch({ scoreMode: 'grade' })} label="점수 구간별 등급으로 환산" />
            </div>
            {d.scoreMode === 'raw' ? (
              <table className="table-base !w-[480px] border">
                <thead><tr><th>영역 만점</th><th>최소 점수</th></tr></thead>
                <tbody><tr><td>{total}</td><td>0</td></tr></tbody>
              </table>
            ) : (
              <>
                <table className="table-base !w-[640px] border">
                  <thead><tr><th>등급</th><th>환산 점수</th><th>최대 배점</th><th>최소 배점</th></tr></thead>
                  <tbody>
                    {grades.map((g, i) => (
                      <tr key={i}>
                        <td><input className="w-16 text-center" value={g.label} onChange={(e) => patch({ grades: d.grades.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} /></td>
                        <td><NumberInput value={g.converted} className="w-24 text-center" onChange={(v) => patch({ grades: d.grades.map((x, k) => (k === i ? { ...x, converted: v } : x)) })} /></td>
                        <td>{i === 0 ? <span className="text-gray-500">{total}</span> : <NumberInput value={g.max} className="w-24 text-center" onChange={(v) => patch({ grades: d.grades.map((x, k) => (k === i ? { ...x, max: v } : x)) })} />}</td>
                        <td>{i === grades.length - 1 ? <span className="text-gray-500">0</span> : <NumberInput value={g.min} className="w-24 text-center" onChange={(v) => patch({ grades: d.grades.map((x, k) => (k === i ? { ...x, min: v } : x)) })} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex gap-4 text-[13px]">
                  <button type="button" className="text-brand-600" onClick={() => patch({ grades: [...d.grades.slice(0, -1), { label: String.fromCharCode(65 + d.grades.length - 1), converted: null, max: null, min: null }, { ...d.grades[d.grades.length - 1], label: String.fromCharCode(65 + d.grades.length) }] })}>⊕ 등급 추가</button>
                  <button type="button" disabled={d.grades.length <= 2} className="text-brand-600 disabled:opacity-40" onClick={() => patch({ grades: [...d.grades.slice(0, -2), d.grades[d.grades.length - 1]].map((g, i, a) => ({ ...g, label: String.fromCharCode(65 + i), min: i === a.length - 1 ? 0 : g.min })) })}>⊖ 등급 제거</button>
                </div>
              </>
            )}
          </Step>

          {/* 5 */}
          <Step n={academy ? 5 : 6} title="결시자 처리" help="과제를 제출하지 않았거나(미제출) 응시하지 않은(미응시) 학생에게 부여할 점수예요.">
            <div className="flex items-center gap-4 text-sm">
              미제출 <NumberInput value={d.absentUnsubmitted} onChange={(v) => patch({ absentUnsubmitted: v })} className="w-20" /> 점
              <span className="ml-4">미응시</span> <NumberInput value={d.absentNonresponse} onChange={(v) => patch({ absentNonresponse: v })} className="w-20" /> 점
            </div>
          </Step>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => save(true)}>임시저장</Button>
            <Button onClick={() => save(false)}>✓ 설계 저장</Button>
          </div>
        </div>
      </div>

      <Modal open={exampleOpen} title="채점기준 입력 예시" onClose={() => setExampleOpen(false)} width="max-w-3xl" footer={<><Button variant="gray" onClick={() => setExampleOpen(false)}>닫기</Button><Button onClick={() => { patch({ criteria: structuredClone(SAMPLE_CRITERIA) }); setExampleOpen(false); toast('예시를 채워 넣었어요') }}>이 예시로 채우기</Button></>}>
        <p className="mb-3 text-sm text-gray-700">채점요소는 &quot;무엇을 할 수 있는가&quot;를 짧게 쓰고, 점수마다 구분되는 세부 기준을 구체적으로 적어 주세요.</p>
        <div className="max-h-96 space-y-3 overflow-y-auto">
          {SAMPLE_CRITERIA.map((c, i) => (
            <div key={i} className="rounded-lg border p-3 text-[13px]">
              <b>{c.element}</b> <span className="text-gray-500">(최대 {criterionMax(c)}점)</span>
              <ul className="mt-1 list-disc pl-5 text-gray-700">
                {c.scores.map((s) => (
                  <li key={s.score}>[{s.score}점] {s.desc}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>
    </EvalShell>
  )
}

function Step({ n, title, help, children }: { n: number; title: React.ReactNode; help?: string; children: React.ReactNode }) {
  return (
    <section className="relative pl-12">
      <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-[13px] text-brand-700">{n}</span>
      <span className="absolute bottom-[-24px] left-[14px] top-9 w-px bg-gray-200" />
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-brand-900">
        {title}
        {help && (
          <span title={help} className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-400 text-[10px] font-normal text-gray-500">?</span>
        )}
      </h3>
      {children}
    </section>
  )
}

function AchievementPicker({ value, options, onPick }: { value: Achievement; options: Achievement[]; onPick: (a: Achievement) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const list = options.filter((o) => (o.code + o.text).includes(q))
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`${inputCls} flex items-center justify-between text-left ${value.code ? '' : 'text-gray-400'}`}>
        <span className="truncate">{value.code ? `${value.code} ${value.text}` : '성취기준 검색 후 선택해 주세요.'}</span>
        <Chevron open={open} className="ml-2 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white p-2 shadow-xl">
          <input autoFocus className={`${inputCls} mb-2`} placeholder="코드 또는 키워드로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="max-h-60 overflow-y-auto text-[13px]">
            {list.map((o) => (
              <li key={o.code}>
                <button type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-brand-50" onClick={() => { onPick(o); setOpen(false); setQ('') }}>
                  <b className="text-brand-700">{o.code}</b>{o.area && <span className="mx-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">{o.area}</span>}{o.text}
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="py-4 text-center text-gray-500">{options.length === 0 ? '이 학교급·교과는 아직 성취기준 데이터가 없어요. "직접 입력"을 이용해 주세요.' : '검색 결과가 없어요. "직접 입력"을 이용해 주세요.'}</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
