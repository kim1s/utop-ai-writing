import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PDFDocument } from 'pdf-lib'
import { EvalShell, PageContainer, TitleBar, useEvalParam } from '../../components/Layout'
import { AnswerViewer } from '../../components/Sheet'
import { Badge, Button, Checkbox, Chevron, EmptyState, Modal, NumberInput, Radio, SectionHeader, Spinner, Well, inputCls, toast } from '../../components/ui'
import { taskTitle } from '../../lib/problemGen'
import { putBlob, setPendingPdf, takePendingPdf } from '../../lib/files'
import { nowStr, useStore } from '../../lib/store'
import { simulateOcrText } from '../../lib/grading'
import type { Design, Student, SubmissionFile } from '../../lib/types'

function useTargetStudents() {
  const ev = useEvalParam()
  const students = useStore((s) => s.students)
  return useMemo(() => (ev ? students.filter((s) => ev.targetIds.includes(s.id)).sort((a, b) => a.grade - b.grade || a.cls - b.cls || a.num - b.num) : []), [ev, students])
}

export const studentNo = (s: Student) => `${s.grade}${String(s.cls).padStart(2, '0')}${String(s.num).padStart(2, '0')}`

/* ───────── 과제물 관리 ───────── */
export default function Submissions() {
  const design = useEvalParam()
  const nav = useNavigate()
  const { submissions } = useStore()
  const targets = useTargetStudents()
  const [editFor, setEditFor] = useState<Student | null>(null)
  const [viewFor, setViewFor] = useState<Student | null>(null)
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const pdfInput = useRef<HTMLInputElement>(null)
  if (!design) return null
  const key = (s: Student) => `${design.id}:${s.id}`
  const missing = targets.filter((s) => !submissions[key(s)])

  return (
    <EvalShell tab="submissions">
      <SectionHeader
        title="과제물 관리"
        desc="과제 제출 현황을 확인하고 학생 답안지를 업로드하거나 직접 입력할 수 있습니다. 업로드한 사진·PDF는 OCR로 텍스트로 변환되며, 학생별로 확인하고 수정할 수 있어요."
        right={
          <>
            <Button onClick={() => (targets.length ? pdfInput.current?.click() : toast('평가 대상 학생이 없습니다. 평가 대상 탭에서 학생을 추가해 주세요'))}>⬆ 학급 PDF 업로드</Button>
            <input
              ref={pdfInput}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                if (!/\.pdf$/i.test(f.name)) return toast('PDF 파일만 업로드할 수 있습니다')
                setPendingPdf(f)
                nav(`/evals/${design.id}/submissions/pdf`)
              }}
            />
          </>
        }
      />
      {targets.length === 0 ? (
        <Well><EmptyState title="평가 대상이 없어요." desc="평가 대상 탭에서 학생을 추가해 주세요." /></Well>
      ) : (
        <>
          {missing.length > 0 && (
            <div className="mb-4 rounded-xl bg-rose-50 px-5 py-4 text-sm">
              <span className="mr-4 text-rose-600">미제출 학생</span>
              {missing.map((s) => `${s.name}(${studentNo(s)})`).join(', ')}
            </div>
          )}
          <Well>
            <div className="rounded-2xl bg-white p-5">
              <h3 className="mb-4 text-[17px] font-medium">{taskTitle(design)}</h3>
              <div className="space-y-3">
                {[...targets.reduce((m, st) => m.set(`${st.grade}학년 ${st.cls}반`, [...(m.get(`${st.grade}학년 ${st.cls}반`) ?? []), st]), new Map<string, Student[]>())].map(([groupKey, list]) => {
                  const open = !closed[groupKey]
                  const done = list.filter((st) => submissions[key(st)]).length
                  return (
                    <div key={groupKey} className="rounded-xl border border-gray-200">
                      <button type="button" aria-expanded={open} onClick={() => setClosed({ ...closed, [groupKey]: open })} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                        <span className="flex h-6 w-6 items-center justify-center rounded text-brand-500"><Chevron open={open} /></span>
                        <span className="font-medium">{groupKey}</span>
                        <span className="ml-auto text-sm text-gray-600">{list.length}명 · 제출 {done}/{list.length}</span>
                      </button>
                      {open && (
                        <div className="overflow-x-auto border-t px-4 pb-3 pt-1">
                          <table className="table-base">
                            <thead>
                              <tr><th>상태</th><th>학번</th><th>이름</th><th>제출 방식</th><th>최근 제출 일시</th><th>파일 수</th><th>제출 내용</th><th>과제 제출 관리</th></tr>
                            </thead>
                            <tbody>
                              {list.map((st) => {
                                const sub = submissions[key(st)]
                                const last = sub?.files[sub.files.length - 1]
                                return (
                                  <tr key={st.id}>
                                    <td>{sub ? <Badge tone="blue">제출</Badge> : <Badge tone="red">미제출</Badge>}</td>
                                    <td>{studentNo(st)}</td>
                                    <td>{st.name}</td>
                                    <td>{!sub ? '-' : sub.textSource === 'typed' ? <Badge tone="orange">직접 입력</Badge> : <Badge tone="purple">파일 · OCR</Badge>}</td>
                                    <td className="text-gray-700">{last ? `${last.uploadedAt} ${last.by} 업로드` : '-'}</td>
                                    <td>{sub?.files.length ?? 0}</td>
                                    <td>{sub ? <button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => setViewFor(st)}>내용 확인</button> : '-'}</td>
                                    <td><button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => setEditFor(st)}>제출 관리</button></td>
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
          </Well>
        </>
      )}
      <SubmitModal student={editFor} design={design} onClose={() => setEditFor(null)} />
      <ContentModal student={viewFor} design={design} onClose={() => setViewFor(null)} />
    </EvalShell>
  )
}

/** 학생 개별 제출 관리: 파일 업로드 또는 직접 입력 */
function SubmitModal({ student, design, onClose }: { student: Student | null; design: Design; onClose: () => void }) {
  const sub = useStore((s) => (student ? s.submissions[`${design.id}:${student.id}`] : undefined))
  const setSubmission = useStore((s) => s.setSubmission)
  const [mode, setMode] = useState<'file' | 'typed'>('file')
  const [files, setFiles] = useState<SubmissionFile[]>([])
  const [text, setText] = useState('')
  const [loadedFor, setLoadedFor] = useState('')
  const input = useRef<HTMLInputElement>(null)
  if (student && loadedFor !== student.id) {
    setLoadedFor(student.id)
    const typed = sub?.textSource === 'typed'
    setMode(typed ? 'typed' : 'file')
    setFiles(typed ? [] : (sub?.files ?? []))
    setText(typed ? (sub?.text ?? '') : '')
  }
  if (!student && loadedFor) setLoadedFor('')
  const MAX = 3

  const add = (f: File) => {
    if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) return toast('PDF, PNG, JPG 파일만 업로드할 수 있습니다')
    if (files.length >= MAX) return toast(`제출 가능한 최대 파일 수는 ${MAX}개입니다. 기존 파일을 먼저 제거해 주세요`)
    const key = `${design.id}-${student!.id}-${Date.now()}-${f.name}`
    putBlob(key, f)
    setFiles([...files, { name: f.name, key, uploadedAt: nowStr(), by: '선생님' }])
  }

  const save = () => {
    if (!student) return
    if (mode === 'typed') {
      if (!text.trim()) return toast('제출 내용을 입력해 주세요. 비워 두려면 취소를 눌러 주세요')
      setSubmission(design.id, student.id, { files: [], text: text.trim(), textSource: 'typed' })
      toast('직접 입력한 내용을 저장했습니다')
    } else {
      const same = sub?.textSource === 'ocr' && sub.files.length === files.length && sub.files.every((f, i) => (f.key ?? f.name) === (files[i].key ?? files[i].name))
      // 파일이 바뀌지 않았다면 기존 OCR(수정본 포함)을 유지하고, 바뀌었다면 새로 OCR을 수행
      setSubmission(design.id, student.id, files.length ? (same ? sub! : { files }) : null)
      toast(files.length ? '과제 파일을 저장했습니다 (OCR 변환 완료)' : '제출을 취소(미제출)했습니다')
    }
    onClose()
  }

  return (
    <Modal open={!!student} title={`${student?.name} 학생 제출 관리`} onClose={onClose} width="max-w-xl" footer={<><Button variant="gray" onClick={onClose}>취소</Button><Button onClick={save}>저장</Button></>}>
      <p className="mb-3 text-[13px] text-gray-700">제출 방식을 선택해 주세요. 저장한 내용을 기준으로 채점이 진행됩니다.</p>
      <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border text-center text-sm">
        <button type="button" onClick={() => setMode('file')} className={`py-2.5 ${mode === 'file' ? 'bg-brand-50 font-medium text-brand-700' : ''}`}>📄 사진·PDF 업로드</button>
        <button type="button" onClick={() => setMode('typed')} className={`border-l py-2.5 ${mode === 'typed' ? 'bg-brand-50 font-medium text-brand-700' : ''}`}>⌨ 직접 입력</button>
      </div>
      {mode === 'file' ? (
        <>
          <div className="mb-4 rounded-lg bg-brand-50 p-3 text-xs leading-6 text-gray-700">
            제출 가능한 최대 파일 수 : {MAX}
            <br />
            제출 가능한 파일 형식 : PDF, PNG, JPG · 업로드하면 OCR로 텍스트가 만들어져요.
          </div>
          <Button variant="soft" onClick={() => input.current?.click()}>⬆ 파일 업로드</Button>
          <input ref={input} type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { if (e.target.files?.[0]) add(e.target.files[0]); e.target.value = '' }} />
          <ul className="mt-3 space-y-2 text-sm">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="truncate">{/\.pdf$/i.test(f.name) ? '📄' : '🖼'} {f.name}</span>
                <button type="button" className="text-rose-500" onClick={() => setFiles(files.filter((_, k) => k !== i))}>제거</button>
              </li>
            ))}
            {files.length === 0 && <li className="text-xs text-gray-500">업로드된 파일이 없습니다. (저장하면 &quot;미제출&quot; 상태가 됩니다)</li>}
          </ul>
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-600">학생이 작성한 답안을 그대로 옮겨 적어 주세요. 직접 입력한 내용은 OCR 없이 바로 채점에 사용됩니다.</p>
          <textarea className={`${inputCls} h-64 resize-none leading-7`} value={text} onChange={(e) => setText(e.target.value)} placeholder="학생의 답안을 입력해 주세요." />
          <div className="mt-1 text-xs text-gray-500">{text.length}자</div>
        </>
      )}
    </Modal>
  )
}

/** 제출 내용 확인: 원본(PDF/이미지) 뷰어 + OCR 텍스트 */
function ContentModal({ student, design, onClose }: { student: Student | null; design: Design; onClose: () => void }) {
  const sub = useStore((s) => (student ? s.submissions[`${design.id}:${student.id}`] : undefined))
  const setSubmissionText = useStore((s) => s.setSubmissionText)
  const [text, setText] = useState('')
  const [loadedFor, setLoadedFor] = useState('')
  const [busy, setBusy] = useState(false)
  const [fileIdx, setFileIdx] = useState(0)
  if (student && sub && loadedFor !== student.id) {
    setLoadedFor(student.id)
    setFileIdx(0)
    setText(sub.text ?? '')
  }
  if (!student && loadedFor) setLoadedFor('')
  const file = sub?.files[Math.min(fileIdx, (sub?.files.length ?? 1) - 1)]
  const typed = sub?.textSource === 'typed'
  const dirty = (sub?.text ?? '') !== text

  const rerun = () => {
    if (!student) return
    setBusy(true)
    setTimeout(() => {
      setText(simulateOcrText(design, student.id))
      setBusy(false)
      toast('OCR을 다시 실행했어요. 저장을 눌러 반영해 주세요')
    }, 900)
  }

  return (
    <Modal
      open={!!student && !!sub}
      title={`${student?.name} 학생 제출 내용`}
      onClose={onClose}
      width="max-w-6xl"
      footer={
        <>
          <Button variant="gray" onClick={onClose}>닫기</Button>
          <Button disabled={!dirty} onClick={() => { setSubmissionText(design.id, student!.id, text); toast('텍스트를 저장했습니다') }}>저장</Button>
        </>
      }
    >
      <div className={`grid gap-4 ${file ? 'grid-cols-2 max-lg:grid-cols-1' : 'grid-cols-1'}`}>
        {file && (
          <div>
            {sub && sub.files.length > 1 && (
              <div className="mb-2 flex gap-1.5">
                {sub.files.map((_, i) => (
                  <button key={i} type="button" onClick={() => setFileIdx(i)} className={`rounded-full border px-3 py-1 text-xs ${i === fileIdx ? 'border-brand-500 bg-brand-50 text-brand-700' : 'text-gray-600'}`}>파일 {i + 1}</button>
                ))}
              </div>
            )}
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">원본 파일</span>
              <span className="truncate text-xs text-gray-500">{file.name}{file.pages ? ` · ${file.pages}쪽` : ''}</span>
            </div>
            <div className="h-[60vh] overflow-hidden rounded-lg border bg-gray-100">
              {student && <AnswerViewer design={design} studentId={student.id} studentName={student.name} fileKey={file.key ?? file.name} fileName={file.name} page={Number(file.pages?.split('~')[0] ?? 1)} />}
            </div>
          </div>
        )}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{typed ? '직접 입력한 내용' : 'OCR 인식 결과'}</span>
            {!typed && (
              <Button size="sm" variant="outline" disabled={busy} onClick={rerun}>{busy ? <><Spinner /> 인식 중…</> : '↻ OCR 다시 실행'}</Button>
            )}
          </div>
          {!typed && <p className="mb-2 text-xs text-gray-500">AI가 원본에서 읽어 낸 텍스트입니다. 잘못 인식된 부분은 직접 수정할 수 있어요. 수정한 내용이 채점에 사용됩니다.</p>}
          <textarea className={`${inputCls} min-h-[56vh] flex-1 resize-none leading-7`} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-1 text-xs text-gray-500">{text.length}자{dirty ? ' · 저장되지 않은 변경 사항이 있어요' : ''}</div>
        </div>
      </div>
    </Modal>
  )
}

/* ───────── 학급 PDF 업로드 + 분할 ───────── */
interface Row { studentId: string; pages: number; start: number; end: number; absent: boolean }

export function ClassPdfUpload() {
  const design = useEvalParam()
  const nav = useNavigate()
  const { bulkSubmissions } = useStore()
  const targets = useTargetStudents()
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [pageCount, setPageCount] = useState(0)
  const [per, setPer] = useState(1)
  const [startPage, setStartPage] = useState(1)
  const [mode, setMode] = useState<'count' | 'range'>('count')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [pageNo, setPageNo] = useState(1)
  const input = useRef<HTMLInputElement>(null)

  const pick = async (f: File) => {
    if (!/\.pdf$/i.test(f.name)) return toast('PDF 파일만 업로드할 수 있습니다')
    try {
      const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
      setPageCount(doc.getPageCount())
    } catch {
      return toast('PDF 파일을 읽을 수 없습니다')
    }
    setFile(f)
    setUrl(URL.createObjectURL(f))
    setRows(null)
    setPageNo(1)
  }

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  useEffect(() => {
    const f = takePendingPdf()
    if (f) void pick(f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!design) return null
  const back = `/evals/${design.id}/submissions`

  const compute = (): Row[] => {
    let cursor = startPage
    return targets.map((s) => {
      const start = cursor
      const end = Math.min(cursor + per - 1, pageCount)
      cursor += per
      return { studentId: s.id, pages: per, start, end, absent: start > pageCount }
    })
  }

  const recalc = (list: Row[]): Row[] => {
    let cursor = startPage
    return list.map((r) => {
      if (r.absent) return { ...r, start: 0, end: 0, pages: 0 }
      const start = cursor
      const end = Math.min(cursor + r.pages - 1, pageCount)
      cursor += r.pages
      return { ...r, start, end }
    })
  }

  const finish = () => {
    if (!rows || !file) return
    const when = nowStr()
    putBlob(file.name, file)
    bulkSubmissions(
      design.id,
      rows.map((r) => ({
        studentId: r.studentId,
        file: r.absent || r.start < 1 || r.start > pageCount ? null : { name: file.name, uploadedAt: when, by: '선생님', pages: `${r.start}~${r.end}` },
      })),
    )
    toast('학급 PDF를 분할해 업로드했습니다')
    nav(back)
  }

  return (
    <>
      <TitleBar title={design.name} sub="학급 PDF 업로드" />
      <div className="border-b bg-white">
        <div className="mx-auto max-w-[1100px] px-6 py-2 text-sm">
          <Link to={back} className="font-medium text-brand-600 hover:underline">‹ 과제물 관리로</Link>
        </div>
      </div>
      {!file ? (
        <PageContainer className="!pt-6">
          <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(90,70,180,0.1)]">
            <h2 className="text-xl font-semibold">학급 PDF 업로드</h2>
            <p className="mt-1 text-[13px] text-gray-600">학생의 과제를 스캔해서 한 번에 업로드할 수 있습니다.</p>
            <div className="py-20 text-center text-sm leading-7 text-gray-700">
              학급 단위로 스캔한 하나의 PDF 파일을 선택해 주세요.
              <br />
              PDF 파일을 대상별로 분할하여 업로드해 드립니다.
              <br />
              이미 업로드된 파일이 있는 경우 새로 업로드 하시는 파일로 교체됩니다.
              <div className="mt-6">
                <Button onClick={() => input.current?.click()}>📁 파일 선택</Button>
                <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
              </div>
              {targets.length === 0 && <p className="mt-4 text-rose-500">평가 대상 학생이 없습니다. 먼저 평가 대상을 추가해 주세요.</p>}
            </div>
          </div>
        </PageContainer>
      ) : (
        <div className="grid h-[calc(100vh-196px)] min-h-[560px] grid-cols-[1fr_380px] max-lg:grid-cols-1">
          <div className="flex min-h-0 flex-col bg-gray-700">
            <div className="flex items-center gap-4 bg-gray-800 px-4 py-2 text-sm text-white">
              <span className="truncate">{file.name}</span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => setPageNo(Math.max(1, pageNo - 1))} className="px-1">‹</button>
                <NumberInput value={pageNo} min={1} max={pageCount} onChange={(v) => setPageNo(Math.min(Math.max(1, v), pageCount))} className="w-14 !bg-gray-900 text-center !text-white" />
                <span>/ {pageCount}</span>
                <button type="button" onClick={() => setPageNo(Math.min(pageCount, pageNo + 1))} className="px-1">›</button>
              </div>
            </div>
            <iframe title="PDF 미리보기" src={`${url}#page=${pageNo}&toolbar=0&navpanes=0`} className="min-h-0 flex-1 bg-white" />
          </div>
          <div className="overflow-y-auto bg-white p-5 text-sm">
            {!rows ? (
              <>
                <h3 className="mb-4 font-medium">분할 설정</h3>
                <div className="mb-1 text-[13px] text-gray-600">PDF 파일 정보</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">학생당 기본 <NumberInput value={per} min={1} onChange={setPer} className="w-20" /> 장 분량으로 작성</div>
                  <div className="flex items-center gap-2">스캔된 파일 <NumberInput value={startPage} min={1} max={pageCount} onChange={setStartPage} className="w-20" /> 페이지부터 과제물 시작</div>
                </div>
                <div className="mb-2 mt-5 text-[13px] text-gray-600">PDF 분할 결과 수정 방식</div>
                <div className="flex gap-5">
                  <Radio name="pm" checked={mode === 'count'} onChange={() => setMode('count')} label="페이지 장수 입력" />
                  <Radio name="pm" checked={mode === 'range'} onChange={() => setMode('range')} label="페이지 번호 입력" />
                </div>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" onClick={() => { setFile(null); setRows(null) }}>⬆ 파일 다시 업로드</Button>
                  <Button onClick={() => { if (!targets.length) return toast('평가 대상 학생이 없습니다'); setRows(compute()) }}>✓ 파일 분할 시작</Button>
                </div>
                <p className="mt-4 text-xs text-gray-500">총 {pageCount}쪽 / 평가 대상 {targets.length}명 (필요 {per * targets.length}쪽)</p>
              </>
            ) : (
              <>
                <h3 className="mb-1 font-medium">PDF 분할 결과</h3>
                <p className="mb-3 text-xs text-gray-600">{mode === 'count' ? '페이지 장수를 조정하여' : '페이지 번호를 입력하여'} 학생별 과제물을 구분해 주세요.</p>
                <table className="table-base text-[13px]">
                  <thead><tr><th>학번</th><th>이름</th>{mode === 'count' ? <th>페이지 수</th> : null}<th>페이지 번호</th><th>미제출</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const s = targets.find((t) => t.id === r.studentId)!
                      return (
                        <tr key={r.studentId} className="cursor-pointer" onClick={() => !r.absent && r.start && setPageNo(r.start)}>
                          <td>{studentNo(s)}</td>
                          <td>{s.name}</td>
                          {mode === 'count' && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <NumberInput value={r.pages} min={0} className="w-14" onChange={(v) => setRows(recalc(rows.map((x, k) => (k === i ? { ...x, pages: Math.max(0, v) } : x))))} />
                            </td>
                          )}
                          <td onClick={(e) => e.stopPropagation()}>
                            {r.absent ? '미제출' : mode === 'count' ? `${r.start} ~ ${r.end}` : (
                              <span className="inline-flex items-center gap-1">
                                <NumberInput value={r.start} min={1} max={pageCount} className="w-14" onChange={(v) => setRows(rows.map((x, k) => (k === i ? { ...x, start: v, pages: Math.max(0, x.end - v + 1) } : x)))} />~
                                <NumberInput value={r.end} min={1} max={pageCount} className="w-14" onChange={(v) => setRows(rows.map((x, k) => (k === i ? { ...x, end: v, pages: Math.max(0, v - x.start + 1) } : x)))} />
                              </span>
                            )}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={r.absent} onChange={(v) => setRows(recalc(rows.map((x, k) => (k === i ? { ...x, absent: v, pages: v ? 0 : per } : x))))} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-white py-3">
                  <Button variant="outline" onClick={() => setRows(null)}>‹ 설정으로</Button>
                  <Button onClick={finish}>✓ 업로드 완료</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
