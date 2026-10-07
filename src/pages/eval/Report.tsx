import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { EvalShell, useEvalParam } from '../../components/Layout'
import { Chevron } from '../../components/ui'
import { CorrectionView } from '../../components/CorrectionPanel'
import { ReportSheet } from '../../components/ReportSheet'
import { Button, Checkbox, EmptyState, Modal, Radio, SectionHeader, Select, Well, toast } from '../../components/ui'
import { criterionMax, designMax, resolvedScore, rowStatus } from '../../lib/grading'
import { taskTitle } from '../../lib/problemGen'
import { useStore } from '../../lib/store'
import type { Student } from '../../lib/types'
import { studentNo } from './Submissions'

function useReportData() {
  const design = useEvalParam()
  const { students, submissions, scores } = useStore()
  const targets = useMemo(() => (design ? students.filter((s) => design.targetIds.includes(s.id)).sort((a, b) => a.grade - b.grade || a.cls - b.cls || a.num - b.num) : []), [design, students])
  const scoreFor = (s: Student) => (design ? resolvedScore(design, scores[`${design.id}:${s.id}`], !!submissions[`${design.id}:${s.id}`]) : null)
  const statusFor = (s: Student) => (design ? rowStatus(scores[`${design.id}:${s.id}`], !!submissions[`${design.id}:${s.id}`]) : 'waiting')
  const scoreRec = (s: Student) => (design ? scores[`${design.id}:${s.id}`] : undefined)
  return { design, targets, scoreFor, statusFor, scoreRec }
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const fmt = (n: number | null) => (n == null ? '-' : String(Math.round(n * 10) / 10))

export default function Report() {
  const { design, targets, scoreFor, statusFor, scoreRec } = useReportData()
  const nav = useNavigate()
  const [clsFilter, setClsFilter] = useState('')
  const [sort, setSort] = useState('no')
  const [applied, setApplied] = useState({ clsFilter: '', sort: 'no' })
  const [exportOpen, setExportOpen] = useState(false)
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const [exportFmt, setExportFmt] = useState<'print' | 'excel'>('print')
  const [showCompare, setShowCompare] = useState(true)
  const [showCorrection, setShowCorrection] = useState(true)
  const [printing, setPrinting] = useState(false)
  useEffect(() => {
    if (!printing) return
    const t = setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 200)
    return () => clearTimeout(t)
  }, [printing])
  if (!design) return null

  const graded = targets.filter((s) => statusFor(s) === 'done')
  const values = graded.map((s) => scoreFor(s) as number)
  const absent = targets.filter((s) => ['unsubmitted', 'nonresponse'].includes(statusFor(s))).length
  const classOptions = [...new Set(targets.map((s) => `${s.grade}-${s.cls}`))]
  const rows = targets
    .filter((s) => !applied.clsFilter || `${s.grade}-${s.cls}` === applied.clsFilter)
    .sort((a, b) => (applied.sort === 'score' ? (scoreFor(b) ?? -1) - (scoreFor(a) ?? -1) : 0))

  const average = avg(values)
  const doExport = () => {
    if (!rows.length) return toast('내보낼 학생이 없습니다')
    if (exportFmt === 'print') {
      setExportOpen(false)
      setPrinting(true)
      return
    }
    const data = rows.map((s) => {
      const rec = scoreRec(s)
      const total = scoreFor(s)
      const row: Record<string, string | number> = { 반: `${s.grade}-${s.cls}`, 학번: studentNo(s), 이름: s.name, 상태: { done: '채점 완료', waiting: '채점 대기', unsubmitted: '미제출', nonresponse: '미응시' }[statusFor(s)], 총점: total ?? '' }
      if (showCompare) {
        row['평균'] = average == null ? '' : Math.round(average * 10) / 10
        row['평균 대비'] = total != null && average != null ? Math.round((total - average) * 10) / 10 : ''
      }
      design.criteria.forEach((c, i) => { row[c.element] = rec?.picks[i] ?? '' })
      row['선생님 피드백'] = rec?.teacherFeedback ?? ''
      if (showCorrection) {
        row['첨삭(수정문)'] = rec?.correction?.map((c) => c.revised.map((g) => g.t).join('')).join(' ') ?? ''
        row['첨삭 수정 이유'] = rec?.correction?.map((c, i) => (c.note ? `${i + 1}. ${c.note.replace(/\n/g, ' ')}` : '')).filter(Boolean).join('\n') ?? ''
      }
      return row
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), '평가리포트')
    XLSX.writeFile(wb, `${design.name}_평가리포트.xlsx`)
    setExportOpen(false)
    toast('엑셀 파일을 내보냈습니다')
  }

  return (
    <EvalShell tab="report">
      <SectionHeader title="평가 리포트" desc="실시된 평가 결과를 확인하고 엑셀로 다운받을 수 있습니다." right={<Button onClick={() => setExportOpen(true)}>⬇ 평가 리포트 내보내기</Button>} />
      {targets.length === 0 ? (
        <Well><EmptyState kind="doc" title="평가 대상이 없어요." desc="평가 대상을 추가하고 AI 채점을 완료하면 리포트를 볼 수 있어요." /></Well>
      ) : (
        <div className="space-y-5">
          <Well>
            <h3 className="mb-3 border-l-2 border-brand-900 pl-2.5 text-[15px] font-semibold text-brand-900">평가 요약</h3>
            <div className="rounded-2xl bg-white p-4">
              <table className="table-base">
                <thead><tr><th>평가</th><th>만점</th><th>평균</th><th>최고</th><th>최저</th><th>채점 인원</th><th>미응시/미제출</th></tr></thead>
                <tbody>
                  <tr>
                    <td className="max-w-48 truncate">{design.name}</td>
                    <td>{designMax(design)}</td>
                    <td>{fmt(avg(values))}</td>
                    <td>{values.length ? Math.max(...values) : '-'}</td>
                    <td>{values.length ? Math.min(...values) : '-'}</td>
                    <td>{graded.length}</td>
                    <td>{absent}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Well>

          <Well>
            <h3 className="mb-3 border-l-2 border-brand-900 pl-2.5 text-[15px] font-semibold text-brand-900">학생별 평가 리포트</h3>
            <div className="rounded-2xl bg-white p-4">
              <div className="mb-4 flex gap-3">
                <Select value={clsFilter} onChange={setClsFilter} className="flex-1" options={[{ value: '', label: '전체' }, ...classOptions.map((c) => ({ value: c, label: `${c.replace('-', '학년 ')}반` }))]} />
                <Select value={sort} onChange={setSort} className="flex-1" options={[{ value: 'no', label: '학번 순' }, { value: 'score', label: '총점 높은 순' }]} />
                <Button onClick={() => setApplied({ clsFilter, sort })}>조회</Button>
              </div>
              <div className="space-y-3">
                {[...rows.reduce((m, s) => m.set(`${s.grade}학년 ${s.cls}반`, [...(m.get(`${s.grade}학년 ${s.cls}반`) ?? []), s]), new Map<string, Student[]>())].map(([key, list]) => {
                  const open = !closed[key]
                  const done = list.filter((s) => statusFor(s) === 'done').length
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
                            <thead><tr><th>학번</th><th>이름</th><th>총점</th><th>상태</th><th>평가 리포트</th></tr></thead>
                            <tbody>
                              {list.map((s) => (
                                <tr key={s.id}>
                                  <td>{studentNo(s)}</td>
                                  <td>{s.name}</td>
                                  <td>{scoreFor(s) ?? '-'}</td>
                                  <td className="text-gray-600">{{ done: '채점 완료', waiting: '채점 대기', unsubmitted: '미제출', nonresponse: '미응시' }[statusFor(s)]}</td>
                                  <td><button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => nav(`/evals/${design.id}/report/student/${s.id}`)}>보기</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {rows.length === 0 && <div className="py-8 text-center text-sm text-gray-500">조회된 학생이 없습니다.</div>}
            </div>
          </Well>
        </div>
      )}
      <Modal
        open={exportOpen}
        title="평가 리포트 내보내기"
        onClose={() => setExportOpen(false)}
        width="max-w-md"
        footer={<><Button variant="gray" onClick={() => setExportOpen(false)}>취소</Button><Button onClick={doExport}>{exportFmt === 'print' ? '🖨 출력' : '▤ 엑셀로 내보내기'}</Button></>}
      >
        <p className="mb-4 text-sm text-gray-600">현재 조회된 학생 {rows.length}명의 리포트를 내보냅니다.</p>
        <div className="mb-1 text-[13px] font-medium">내보내기 방식</div>
        <div className="mb-5 flex gap-6">
          <Radio name="fmt" checked={exportFmt === 'print'} onChange={() => setExportFmt('print')} label="채점 결과 출력" />
          <Radio name="fmt" checked={exportFmt === 'excel'} onChange={() => setExportFmt('excel')} label="엑셀로 내보내기" />
        </div>
        <div className="mb-1 text-[13px] font-medium">포함할 내용</div>
        <div className="space-y-2.5">
          <Checkbox checked={showCompare} onChange={setShowCompare} label="평균 대비 비교 (평균 점수, 평균 대비 몇 점)" />
          <Checkbox checked={showCorrection} onChange={setShowCorrection} label="첨삭 내용" />
        </div>
        <p className="mt-4 text-xs text-gray-500">평균과 비교하는 내용을 빼고 내보내려면 &quot;평균 대비 비교&quot;를 해제해 주세요.</p>
      </Modal>
      {printing && (
        <div className="hidden print:block print-area">
          {rows.map((s) => (
            <ReportSheet key={s.id} design={design} student={s} score={scoreRec(s)} hasSub={statusFor(s) !== 'unsubmitted'} avg={average} showCompare={showCompare} showCorrection={showCorrection} />
          ))}
        </div>
      )}
    </EvalShell>
  )
}

/* ───────── 학생별 리포트 ───────── */
export function StudentReport() {
  const { studentId } = useParams()
  const nav = useNavigate()
  const { design, targets, scoreFor, statusFor, scoreRec } = useReportData()
  const [pick, setPick] = useState(studentId ?? '')
  if (!design) return null
  const back = `/evals/${design.id}/report`
  const student = targets.find((s) => s.id === studentId)
  if (!student) return <EvalShell tab="report" crumbs={[{ label: '평가 리포트', to: back }, { label: '학생을 찾을 수 없음' }]}><EmptyState title="학생을 찾을 수 없어요." /></EvalShell>
  const sc = scoreRec(student)
  const st = statusFor(student)
  const max = designMax(design)

  const pct = (v: number) => (max ? Math.round((v / max) * 1000) / 10 : 0)
  const doneStudents = targets.filter((s) => statusFor(s) === 'done')
  const classAvgTotal = avg(doneStudents.map((s) => pct(scoreFor(s) as number))) ?? 0
  // 채점요소별 비교 (만점 대비 %)
  const perCriterion = design.criteria.map((c, i) => {
    const m = criterionMax(c) || 1
    const mine = st === 'done' ? Math.round(((sc?.picks[i] ?? 0) / m) * 1000) / 10 : 0
    const others = doneStudents.map((s) => ((scoreRec(s)?.picks[i] ?? 0) / m) * 100)
    return { name: c.element, mine, avg: Math.round((avg(others) ?? 0) * 10) / 10 }
  })

  return (
    <EvalShell tab="report" crumbs={[{ label: '평가 리포트', to: back }, { label: `${studentNo(student)} ${student.name}` }]}>
      <h2 className="text-xl font-semibold">{studentNo(student)} {student.name} 평가 리포트</h2>
      <p className="mt-1 text-[13px] text-gray-600">학생별 평가 결과가 정리된 리포트를 조회할 수 있습니다.</p>

      <Well className="mt-5">
        <div className="flex items-center gap-3 text-sm">
          <h3 className="border-l-2 border-brand-900 pl-2.5 font-semibold text-brand-900">대상 검색</h3>
          <Select value={pick} onChange={setPick} className="flex-1" placeholder="학생 선택" options={targets.map((s) => ({ value: s.id, label: `${studentNo(s)} ${s.name}` }))} />
          <Button disabled={!pick} onClick={() => nav(`/evals/${design.id}/report/student/${pick}`)}>조회</Button>
        </div>
      </Well>

      <Well className="mt-5">
        <div className="grid grid-cols-[220px_1fr] gap-5 max-md:grid-cols-1">
          <div className="overflow-hidden rounded-xl bg-white text-center shadow-sm">
            <div className="py-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-3xl font-bold text-brand-600">{student.name.slice(0, 1)}</div>
              <div className="mt-3 text-lg font-semibold">{student.name}</div>
              <div className="text-xs text-gray-600">{student.grade}학년 {student.cls}반 {student.num}번</div>
            </div>
            <div className="space-y-2 bg-brand-50 px-5 py-4 text-sm">
              <div className="flex justify-between"><span className="text-brand-900">총점</span><b>{scoreFor(student) ?? '-'} / {max}점</b></div>
              <div className="flex justify-between"><span className="text-brand-900">반 평균 대비</span><b>{st === 'done' ? `${(pct(scoreFor(student) as number) - classAvgTotal).toFixed(1)}%p` : '-'}</b></div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-5">
            <h3 className="mb-2 border-l-2 border-brand-900 pl-2.5 text-[15px] font-semibold text-brand-900">채점 요소별 성취도 비교</h3>
            <div className="mb-1 flex justify-end gap-4 text-xs"><Legend c="bg-brand-600" t="학생" /><Legend c="bg-brand-200" t="평균" /></div>
            <div className="flex h-52 items-end justify-around gap-6 border-b px-4 pt-6">
              {perCriterion.map((p) => (
                <div key={p.name} className="flex h-full flex-1 items-end justify-center gap-1">
                  <Bar v={p.mine} cls="bg-brand-600" />
                  <Bar v={p.avg} cls="bg-brand-200" />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-around gap-6 px-4 text-center text-xs text-gray-700">{perCriterion.map((p) => <span key={p.name} className="flex-1 truncate" title={p.name}>{p.name}</span>)}</div>
          </div>
        </div>
      </Well>

      <Well className="mt-5">
        <h3 className="mb-3 border-l-2 border-brand-900 pl-2.5 text-[15px] font-semibold text-brand-900">평가 리포트</h3>
        <div className="rounded-xl bg-white p-4">
          <div className="mb-3 flex justify-between text-sm"><span>[{taskTitle(design)}]</span><b>{scoreFor(student) ?? '-'}점</b></div>
          {st === 'done' ? (
            <>
              <div className="rounded-lg bg-gray-50 p-3">
                {design.criteria.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 text-[13px]">
                    <span>{c.element}</span>
                    <span className="flex gap-1">
                      {[...c.scores].sort((a, b) => b.score - a.score).map((s) => (
                        <span key={s.score} className={`flex h-6 w-6 items-center justify-center rounded border text-xs ${sc?.picks[i] === s.score ? 'border-brand-400 bg-brand-400 text-white' : 'border-brand-200 text-brand-300'}`}>{s.score}</span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              {sc?.teacherFeedback && <div className="mt-3 whitespace-pre-line rounded-lg border p-4 text-[13px] leading-6 text-gray-800">{sc.teacherFeedback}</div>}
            </>
          ) : (
            <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">{st === 'waiting' ? '아직 채점이 완료되지 않았어요.' : st === 'unsubmitted' ? '미제출 처리된 과제입니다.' : '미응시 처리된 과제입니다.'}{st === 'waiting' && (<><br /><button type="button" className="mt-2 font-medium text-brand-600 hover:underline" onClick={() => nav(`/evals/${design.id}/grading/student/${student.id}`)}>이 학생 채점하러 가기 ›</button></>)}</p>
          )}
        </div>
      </Well>

      {sc?.correction && sc.correction.length > 0 && (
        <Well className="mt-5">
          <h3 className="mb-3 border-l-2 border-brand-900 pl-2.5 text-[15px] font-semibold text-brand-900">첨삭</h3>
          <div className="rounded-xl bg-white p-5">
            <CorrectionView value={sc.correction} />
          </div>
        </Well>
      )}
    </EvalShell>
  )
}

function Legend({ c, t }: { c: string; t: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{t}</span>
}
function Bar({ v, cls }: { v: number; cls: string }) {
  return (
    <div className="relative flex h-full w-1/2 max-w-16 items-end">
      <span className="absolute left-0 right-0 text-center text-xs text-gray-700" style={{ bottom: `calc(${v}% + 2px)` }}>{v}</span>
      <div className={`w-full rounded-t ${cls}`} style={{ height: `${v}%` }} />
    </div>
  )
}
