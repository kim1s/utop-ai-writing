import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { EvalShell, useEvalParam } from '../../components/Layout'
import { CorrectionPanel } from '../../components/CorrectionPanel'
import { SubmissionViewerModal } from '../../components/SubmissionViewer'
import { buildCorrection } from '../../lib/essays'
import { Badge, Button, Chevron, EmptyState, Modal, ProgressBar, SectionHeader, Spinner, Well, confirmAsync, inputCls, toast } from '../../components/ui'
import { designMax, emptyScore, rawTotal, resolvedScore, rowStatus, simulateAiScore } from '../../lib/grading'
import { useStore } from '../../lib/store'
import type { AbsenceType, Design, Student, StudentScore } from '../../lib/types'
import { studentNo } from './Submissions'

function useGradingData() {
  const design = useEvalParam()
  const { students, submissions, scores, runs } = useStore()
  const targets = useMemo(() => (design ? students.filter((s) => design.targetIds.includes(s.id)).sort((a, b) => a.grade - b.grade || a.cls - b.cls || a.num - b.num) : []), [design, students])
  const hasSub = (sid: string) => !!design && !!submissions[`${design.id}:${sid}`]
  const scoreOf = (sid: string) => (design ? scores[`${design.id}:${sid}`] : undefined)
  return { design, targets, hasSub, scoreOf, run: design ? runs[design.id] : undefined, submissions }
}

/* ───────── AI 채점: 진행 현황 + 학생 목록(반별 접기/펼치기) ───────── */
export default function Grading() {
  const { design, targets, hasSub, scoreOf, run } = useGradingData()
  const { startGrading, setScore } = useStore()
  const nav = useNavigate()
  const [chart, setChart] = useState(false)
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  if (!design) return null
  const d = design
  const base = `/evals/${d.id}/grading`
  const submitted = targets.filter((s) => hasSub(s.id))
  const confirmed = submitted.filter((s) => scoreOf(s.id)?.done)
  const avg = confirmed.length ? confirmed.reduce((acc, s) => acc + rawTotal(scoreOf(s.id)!.picks), 0) / confirmed.length : null
  const allDone = submitted.length > 0 && confirmed.length === submitted.length
  const running = run?.state === 'running'
  const value = running ? run.progress : confirmed.length

  const groups = new Map<string, Student[]>()
  targets.forEach((s) => groups.set(`${s.grade}학년 ${s.cls}반`, [...(groups.get(`${s.grade}학년 ${s.cls}반`) ?? []), s]))

  const applyAll = async () => {
    if (run?.state !== 'done') return toast('AI 채점이 완료된 뒤에 사용할 수 있어요')
    if (!(await confirmAsync('AI가 제안한 점수를 모든 학생에게 그대로 적용하고 채점을 확정할까요?\n이미 선생님이 확정한 학생은 제외됩니다.'))) return
    let n = 0
    submitted.forEach((s) => {
      const sc = scoreOf(s.id)
      if (sc && !sc.done && sc.aiPicks.every((p) => p != null)) {
        setScore(d.id, s.id, { picks: sc.aiPicks, done: true })
        n++
      }
    })
    toast(`${n}명에게 AI 점수를 적용했습니다`)
  }

  const start = async () => {
    if (!targets.length) return toast('평가 대상 학생이 없습니다. 평가 대상 탭에서 학생을 추가해 주세요')
    if (!submitted.length) return toast('제출된 과제물이 없습니다. 과제물 관리에서 답안지를 먼저 업로드해 주세요')
    if (run?.state === 'done' && !(await confirmAsync('AI 채점을 다시 실행할까요?\n선생님이 확정한 점수는 유지되고 AI 제안 점수만 갱신됩니다.'))) return
    startGrading(d.id)
    toast('AI 채점을 시작했어요')
  }

  return (
    <EvalShell tab="grading">
      <SectionHeader
        title="AI 채점"
        desc="AI Assistant와 함께 과제를 채점하고 피드백 기록을 생성할 수 있습니다. AI는 선생님을 보조하는 역할을 하며 채점의 최종 권한은 선생님에게만 있습니다."
      />
      <Well>
        {d.status === 'draft' ? (
          <div className="rounded-2xl bg-white"><EmptyState kind="doc" title="평가 설계가 완료되지 않았어요." desc="평가 설계를 저장하면 AI 채점을 진행할 수 있어요." action={<Button onClick={() => nav(`/evals/${d.id}/design`)}>평가 설계로 이동</Button>} /></div>
        ) : targets.length === 0 ? (
          <div className="rounded-2xl bg-white"><EmptyState title="평가 대상이 없어요." desc="평가 대상 탭에서 학생을 추가해 주세요." action={<Button onClick={() => nav(`/evals/${d.id}/targets`)}>평가 대상으로 이동</Button>} /></div>
        ) : (
          <div className="rounded-2xl bg-white p-5">
            {/* 진행 현황 */}
            <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-gray-50 px-5 py-4">
              {allDone ? <Badge tone="green">완료</Badge> : <Badge tone="blue">진행</Badge>}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">{running ? 'AI 분석' : '채점 현황'}</span>
                <ProgressBar value={value} max={submitted.length || 1} className="w-32" />
                <span className="text-xs text-gray-600">{value}/{submitted.length}</span>
              </div>
              <div className="text-sm"><span className="text-gray-600">원점수 평균</span> <b>{avg == null ? '-' : avg.toFixed(1)}</b></div>
              <div className="ml-auto flex items-center gap-2">
                {running ? (
                  <span className="inline-flex items-center gap-2 text-sm text-brand-600"><Spinner /> 자동 채점 진행 중</span>
                ) : (
                  <Button size="sm" onClick={start}>{run?.state === 'done' ? '↻ 재실행' : '✨ AI 채점 시작'}</Button>
                )}
                <button type="button" title="점수 분포 보기" aria-label="점수 분포" className="rounded-lg border border-brand-400 px-2.5 py-1 text-brand-600 hover:bg-brand-50" onClick={() => setChart(true)}>▥</button>
                <button type="button" title="AI 점수 전체 적용" aria-label="AI 점수 전체 적용" className="rounded-lg border border-brand-400 px-2.5 py-1 text-brand-600 hover:bg-brand-50" onClick={applyAll}>⚡</button>
              </div>
            </div>

            {/* 반별 학생 목록 */}
            <div className="space-y-3">
              {[...groups.entries()].map(([key, list]) => {
                const open = !closed[key]
                const done = list.filter((s) => rowStatus(scoreOf(s.id), hasSub(s.id)) === 'done').length
                return (
                  <div key={key} className="rounded-xl border border-gray-200">
                    <button type="button" aria-expanded={open} onClick={() => setClosed({ ...closed, [key]: open })} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <span className="flex h-6 w-6 items-center justify-center rounded text-brand-500"><Chevron open={open} /></span>
                      <span className="font-medium">{key}</span>
                      <span className="ml-auto text-sm text-gray-600">{list.length}명 · 채점 완료 {done}/{list.length}</span>
                    </button>
                    {open && (
                      <div className="border-t px-4 pb-3 pt-1">
                        <table className="table-base">
                          <thead><tr><th>상태</th><th>학번</th><th>이름</th><th>AI 채점 결과</th><th>점수</th><th>채점 실시 결과</th></tr></thead>
                          <tbody>
                            {list.map((s) => {
                              const sc = scoreOf(s.id)
                              const st = rowStatus(sc, hasSub(s.id))
                              const score = resolvedScore(d, sc, hasSub(s.id))
                              return (
                                <tr key={s.id}>
                                  <td>{st === 'done' ? <Badge tone="green">완료</Badge> : st === 'waiting' ? <Badge tone="blue">대기</Badge> : <Badge tone={st === 'unsubmitted' ? 'red' : 'gray'}>{label(st)}</Badge>}</td>
                                  <td>{studentNo(s)}</td>
                                  <td>{s.name}</td>
                                  <td>{!hasSub(s.id) ? '-' : sc && sc.aiPicks.some((p) => p != null) ? '성공' : <span className="text-gray-400">미실시</span>}</td>
                                  <td>{score ?? '-'}</td>
                                  <td><Link to={`${base}/student/${s.id}`} className="font-medium text-brand-600 hover:underline">학생 채점 상세 ›</Link></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Well>
      <Distribution open={chart} onClose={() => setChart(false)} design={d} values={targets.map((s) => resolvedScore(d, scoreOf(s.id), hasSub(s.id))).filter((v): v is number => v != null)} />
    </EvalShell>
  )
}

const label = (st: ReturnType<typeof rowStatus>) => ({ done: '완료', waiting: '대기', unsubmitted: '미제출', nonresponse: '미응시' })[st]

function Distribution({ open, onClose, design, values }: { open: boolean; onClose: () => void; design: Design; values: number[] }) {
  const max = designMax(design)
  const buckets = Array.from({ length: max + 1 }, (_, i) => ({ score: i, n: values.filter((v) => Math.round(v) === i).length }))
  const top = Math.max(1, ...buckets.map((b) => b.n))
  return (
    <Modal open={open} title="점수 분포" onClose={onClose} width="max-w-xl" footer={<Button variant="gray" onClick={onClose}>닫기</Button>}>
      {values.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">채점이 완료된 학생이 없습니다.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">평균 {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}점 · {values.length}명</p>
          <div className="flex h-44 items-end gap-1.5 border-b">
            {buckets.map((b) => (
              <div key={b.score} className="flex flex-1 flex-col items-center justify-end">
                <span className="text-[11px] text-gray-500">{b.n || ''}</span>
                <div className="w-full rounded-t bg-brand-400" style={{ height: `${(b.n / top) * 130}px` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 text-center text-[11px] text-gray-500">{buckets.map((b) => <span key={b.score} className="flex-1">{b.score}</span>)}</div>
        </>
      )}
    </Modal>
  )
}

/* ───────── 학생 채점 상세 ───────── */
export function StudentGrading() {
  const { studentId } = useParams()
  const { design, targets } = useGradingData()
  if (design && !targets.some((s) => s.id === studentId)) return <Navigate to={`/evals/${design.id}/grading`} replace />
  if (!design) return null
  // 학생이 바뀌면 key로 화면을 새로 만들어, 초기 상태를 동기적으로 채운다(빈 화면 깜빡임 방지)
  return <StudentGradingInner key={studentId} />
}

function StudentGradingInner() {
  const { studentId } = useParams()
  const nav = useNavigate()
  const { design, targets, hasSub, scoreOf, run, submissions } = useGradingData()
  const { setScore } = useStore()
  const student = targets.find((s) => s.id === studentId)
  const stored = design && student ? scoreOf(student.id) : undefined

  const [draft, setDraft] = useState<StudentScore>(() => {
    const init = stored ? structuredClone(stored) : emptyScore(design!)
    if (!stored && student && !hasSub(student.id)) init.absence = 'unsubmitted'
    return init
  })
  const [tab, setTab] = useState<'analysis' | 'rubric'>('analysis')
  const [viewer, setViewer] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (!design || !student) return null
  const base = `/evals/${design.id}/grading`
  const idx = targets.findIndex((s) => s.id === student.id)
  const doneCount = targets.filter((s) => rowStatus(scoreOf(s.id), hasSub(s.id)) === 'done').length
  const max = designMax(design)
  const sub = submissions[`${design.id}:${student.id}`]
  const hasAi = draft.aiPicks.some((p) => p != null)

  const update = (p: Partial<StudentScore>) => { setDraft({ ...draft, ...p }); setDirty(true) }
  const bytes = new Blob([draft.teacherFeedback]).size

  const go = async (sid: string) => {
    if (dirty && !(await confirmAsync('저장하지 않은 변경 사항이 있어요. 이동할까요?'))) return
    nav(`${base}/student/${sid}`)
  }

  const save = (next: boolean) => {
    if (draft.absence === 'scoring') {
      if (draft.picks.some((p) => p == null)) return toast('모든 채점요소의 점수를 선택해 주세요')
    }
    setScore(design.id, student.id, { ...draft, done: true })
    setDirty(false)
    toast('채점 결과를 저장했습니다')
    if (next && targets[idx + 1]) nav(`${base}/student/${targets[idx + 1].id}`)
  }

  const total = draft.absence === 'scoring' ? rawTotal(draft.picks) : draft.absence === 'unsubmitted' ? design.absentUnsubmitted : design.absentNonresponse
  const setAbsence = (a: AbsenceType) => update({ absence: a })

  return (
    <EvalShell tab="grading" crumbs={[{ label: 'AI 채점', to: base }, { label: `${studentNo(student)} ${student.name}` }]}>
      <div className="mb-5 rounded-xl bg-gray-50">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm">
          <select value={student.id} onChange={(e) => go(e.target.value)} className="min-w-52 rounded-lg border border-gray-300 px-3 py-2 text-[15px]">
            {targets.map((s) => (
              <option key={s.id} value={s.id}>{studentNo(s)} {s.name} ({label(rowStatus(scoreOf(s.id), hasSub(s.id)))})</option>
            ))}
          </select>
          <span className="text-gray-600">{targets.length}명 중 {doneCount}명 채점 완료</span>
          <div className="ml-auto flex items-center gap-4">
            <button type="button" disabled={idx <= 0} className="text-gray-500 disabled:opacity-40" onClick={() => go(targets[idx - 1].id)}>‹ 이전 학생</button>
            <span className="text-gray-300">|</span>
            <button type="button" disabled={idx >= targets.length - 1} className="font-medium disabled:opacity-40" onClick={() => go(targets[idx + 1].id)}>다음 학생 ›</button>
            <Button variant="outline" onClick={() => setViewer(true)}>📄 제출물 보기</Button>
            <Button onClick={() => save(false)}>✓ 저장</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(380px,440px)] items-start gap-6 max-lg:grid-cols-1">
        <div className="min-w-0">
          {!sub ? (
            <p className="rounded-xl border border-dashed p-10 text-center text-sm text-gray-500">제출된 과제물이 없어요.</p>
          ) : draft.correction ? (
            <CorrectionPanel value={draft.correction} onChange={(correction) => update({ correction })} />
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-gray-600">
              <p className="mb-4">아직 AI 첨삭이 없어요. AI 채점을 실행하면 자동으로 만들어지고, 지금 바로 만들 수도 있어요.</p>
              <Button onClick={() => update({ correction: buildCorrection(sub.text ?? '') })} disabled={!sub.text}>✨ AI 첨삭 만들기</Button>
              {!sub.text && <p className="mt-3 text-xs text-gray-500">인식된 텍스트가 없어 첨삭할 수 없어요. 과제물 관리에서 텍스트를 확인해 주세요.</p>}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 text-sm lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between border-b pb-4">
            <span className="font-medium">총점 {total} / {max} 점</span>
            <div className="flex gap-4">
              {(['scoring', 'nonresponse', 'unsubmitted'] as const).map((a) => (
                <label key={a} className="inline-flex cursor-pointer items-center gap-1.5">
                  <input type="radio" className="accent-brand-600" checked={draft.absence === a} onChange={() => setAbsence(a)} />
                  {{ scoring: '채점 진행', nonresponse: '미응시', unsubmitted: '미제출' }[a]}
                </label>
              ))}
            </div>
          </div>

          <h3 className="mb-1 font-medium text-brand-700">✓ 채점 결과</h3>
          <p className="mb-3 text-xs text-gray-500">AI는 선생님을 보조하는 역할이며 채점의 최종 권한은 선생님에게 있습니다.</p>
          <div className={draft.absence !== 'scoring' ? 'pointer-events-none opacity-40' : ''}>
            <div className="mb-1 flex justify-between text-xs text-gray-500"><span>채점 요소</span><span>점수</span></div>
            {design.criteria.map((c, i) => (
              <div key={i} className="flex items-center justify-between border-b py-3">
                <span className="pr-3">{c.element}</span>
                <div className="flex gap-1.5">
                  {[...c.scores].sort((a, b) => b.score - a.score).map((s) => {
                    const sel = draft.picks[i] === s.score
                    const ai = draft.aiPicks[i] === s.score
                    return (
                      <button
                        key={s.score}
                        type="button"
                        title={s.desc}
                        onClick={() => update({ picks: draft.picks.map((p, k) => (k === i ? s.score : p)) })}
                        className={`h-7 w-7 rounded border text-[13px] ${sel ? 'border-brand-500 bg-brand-500 text-white' : ai ? 'border-brand-400 bg-[repeating-linear-gradient(135deg,#ede9fe,#ede9fe_3px,#fff_3px,#fff_6px)] text-brand-600' : 'border-rose-300 text-rose-500 hover:bg-rose-50'}`}
                      >
                        {s.score}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => update({ picks: design.criteria.map(() => null) })}>점수 초기화</Button>
              <Button size="sm" variant="outline" disabled={!hasAi} onClick={() => update({ picks: [...draft.aiPicks] })}>✓ 점수 그대로 적용</Button>
            </div>
          </div>

          <h3 className="mb-3 mt-8 font-medium text-brand-700">🤖 AI 채점 근거 및 피드백</h3>
          <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border text-center">
            <button type="button" onClick={() => setTab('analysis')} className={`py-2.5 ${tab === 'analysis' ? 'bg-brand-50 font-medium text-brand-700' : ''}`}>과제물 분석 AI</button>
            <button type="button" onClick={() => setTab('rubric')} className={`border-l py-2.5 ${tab === 'rubric' ? 'bg-brand-50 font-medium text-brand-700' : ''}`}>루브릭 기반 AI</button>
          </div>
          <div className="mb-1 text-xs text-gray-500">AI 채점 근거</div>
          <div className="min-h-36 whitespace-pre-line rounded-lg border p-4 text-[13px] leading-7">
            {(tab === 'analysis' ? draft.evidenceAnalysis : draft.evidenceRubric) || <span className="text-gray-400">{hasSub(student.id) ? (run ? '이 학생의 AI 채점 결과가 아직 없습니다.' : 'AI 채점을 먼저 실행하면 채점 근거가 표시됩니다.') : '제출된 과제물이 없어 AI 채점을 하지 않았습니다.'}</span>}
          </div>

          <h3 className="mb-2 mt-8 font-medium text-brand-700">📝 선생님 직접 피드백</h3>
          <div className="mb-2 flex justify-end">
            <Button size="sm" variant="soft" disabled={!hasAi} onClick={() => { const ai = simulateAiScore(design, student.id); update({ teacherFeedback: ai.teacherFeedback }) }}>AI 피드백 초안 불러오기</Button>
          </div>
          <textarea className={`${inputCls} h-56 resize-none leading-7`} value={draft.teacherFeedback} onChange={(e) => update({ teacherFeedback: e.target.value })} placeholder="학생에게 전달할 피드백을 입력해 주세요." />
          <div className="mt-1 text-xs text-gray-500">{draft.teacherFeedback.length}자 / {bytes} byte</div>

          <div className="mt-5 flex justify-between pb-4">
            <Button variant="outline" disabled={idx <= 0} onClick={() => go(targets[idx - 1].id)}>‹ 이전 학생</Button>
            <Button onClick={() => save(true)}>✓ 저장 후 다음 학생</Button>
          </div>
        </div>
      </div>
      <SubmissionViewerModal open={viewer} onClose={() => setViewer(false)} design={design} student={student} submission={sub} />
    </EvalShell>
  )
}
