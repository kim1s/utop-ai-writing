import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { PageContainer, TitleBar } from '../components/Layout'
import { Button, EmptyState, Modal, NumberInput, Select, confirmAsync, inputCls, toast } from '../components/ui'
import { CURRENT_YEAR, SCHOOL_NAME } from '../lib/seed'
import { useStore } from '../lib/store'
import type { Student } from '../lib/types'

export default function SchoolInfo() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'teachers' ? 'teachers' : 'students'
  const setTab = (t: string) => setParams(t === 'students' ? {} : { tab: t })

  return (
    <>
      <TitleBar title="학교 정보" sub={SCHOOL_NAME} />
      <PageContainer>
        <div className="flex gap-1.5">
          {[
            ['students', '학생 관리'],
            ['teachers', '선생님 목록'],
          ].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-t-2xl py-3.5 text-[15px] font-semibold ${tab === k ? 'bg-white text-brand-900' : 'bg-tab text-gray-800 hover:bg-[#bfcaef]'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="rounded-b-2xl bg-white p-6 shadow-[0_8px_30px_rgba(90,70,180,0.1)]">{tab === 'students' ? <Students /> : <Teachers />}</div>
      </PageContainer>
    </>
  )
}

function Teachers() {
  const { teachers, me } = useStore()
  return (
    <>
      <h2 className="text-xl font-semibold">선생님 목록</h2>
      <p className="mb-5 mt-1 text-[13px] text-gray-600">우리 학교에서 서비스를 이용하는 선생님입니다.</p>
      <div className="rounded-2xl bg-gray-50 p-5">
        <div className="rounded-2xl bg-white p-4">
          <table className="table-base">
            <thead>
              <tr>
                <th>이름</th>
                <th>담당 교과</th>
                <th>이메일</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.name} {t.id === me.id && <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">나</span>}
                  </td>
                  <td>{t.subjects.join(', ') || '-'}</td>
                  <td className="text-gray-600">{t.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function Students() {
  const { students, deleteStudents, designs, me } = useStore()
  const [year, setYear] = useState(CURRENT_YEAR)
  const [grade, setGrade] = useState(1)
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState<null | 'single' | 'bulk'>(null)
  const [editing, setEditing] = useState<Student | null>(null)
  const [checked, setChecked] = useState<string[]>([])

  const ofYear = students.filter((s) => s.year === year)
  const grades = [...new Set(ofYear.map((s) => s.grade))].sort()
  const curGrade = grades.includes(grade) ? grade : (grades[0] ?? 1)
  const rows = useMemo(() => ofYear.filter((s) => s.grade === curGrade).sort((a, b) => a.cls - b.cls || a.num - b.num), [ofYear, curGrade])
  const teacherOf = (s: Student) => (designs.some((d) => d.targetIds.includes(s.id)) ? me.name : '-')
  const allChecked = rows.length > 0 && rows.every((r) => checked.includes(r.id))

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">학생 관리</h2>
          <p className="mt-1 text-[13px] text-gray-600">평가를 실시할 학생 정보를 등록합니다. 등록된 학생 정보는 학교 전체 선생님에게 공유됩니다.</p>
        </div>
        <div className="relative">
          <Button onClick={() => setMenu(!menu)}>＋ 학생 등록</Button>
          {menu && (
            <div className="absolute right-0 top-11 z-10 w-36 overflow-hidden rounded-lg border bg-white text-center text-[13px] shadow-lg">
              <button type="button" className="block w-full border-b py-2.5 hover:bg-brand-50" onClick={() => { setMenu(false); setEditing(null); setModal('single') }}>학생 개별 등록</button>
              <button type="button" className="block w-full py-2.5 hover:bg-brand-50" onClick={() => { setMenu(false); setModal('bulk') }}>학생 일괄 등록</button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[200px_1fr] gap-4 rounded-2xl bg-gray-50 p-5 max-md:grid-cols-1">
        <div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-lg font-medium">{year}학년도</div>
            {grades.length === 0 ? (
              <div className="mt-3 text-gray-500">학생 정보 없음</div>
            ) : (
              <Select value={curGrade} onChange={(v) => setGrade(Number(v))} options={grades.map((g) => ({ value: g, label: `${g}학년` }))} className="mt-3 w-full" />
            )}
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <button type="button" className="text-gray-700 hover:text-brand-600" onClick={() => setYear(year - 1)}>‹ {year - 1} 조회</button>
            <button type="button" className="text-gray-700 hover:text-brand-600" onClick={() => setYear(year + 1)}>{year + 1} 조회 ›</button>
          </div>
        </div>

        <div className="min-h-[360px] rounded-2xl bg-white p-5">
          {rows.length === 0 ? (
            <EmptyState title="등록된 학생이 없어요." desc={'학생 계정을 생성해 주세요.\n개별 생성 또는 학급 일괄 생성으로 학생 계정을 만들 수 있어요.'} />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">총 {rows.length}명</span>
                <Button
                  variant="dangerOutline"
                  size="sm"
                  disabled={!checked.length}
                  onClick={async () => {
                    if (await confirmAsync(`선택한 학생 ${checked.length}명의 계정을 삭제할까요?\n평가 대상에서도 제외되며 해당 학생의 과제·채점 데이터는 보이지 않게 됩니다.`)) {
                      deleteStudents(checked)
                      setChecked([])
                      toast('학생 계정을 삭제했습니다')
                    }
                  }}
                >
                  🗑 학생 계정 삭제
                </Button>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                <table className="table-base">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="w-10"><input type="checkbox" className="accent-brand-600" checked={allChecked} onChange={(e) => setChecked(e.target.checked ? rows.map((r) => r.id) : [])} aria-label="전체 선택" /></th>
                      <th>학년</th>
                      <th>반</th>
                      <th>번호</th>
                      <th>이름</th>
                      <th>평가 중인 선생님</th>
                      <th>수정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.id}>
                        <td><input type="checkbox" className="accent-brand-600" checked={checked.includes(s.id)} onChange={(e) => setChecked(e.target.checked ? [...checked, s.id] : checked.filter((x) => x !== s.id))} aria-label={`${s.name} 선택`} /></td>
                        <td>{s.grade}</td>
                        <td>{s.cls}</td>
                        <td>{s.num}</td>
                        <td>{s.name}</td>
                        <td className="text-gray-600">{teacherOf(s)}</td>
                        <td>
                          <button type="button" aria-label="수정" className="text-brand-600" onClick={() => { setEditing(s); setModal('single') }}>✎</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <SingleModal open={modal === 'single'} onClose={() => setModal(null)} editing={editing} defaultYear={year} defaultGrade={curGrade} />
      <BulkModal open={modal === 'bulk'} onClose={() => setModal(null)} defaultYear={year} />
    </>
  )
}

function SingleModal({ open, onClose, editing, defaultYear, defaultGrade }: { open: boolean; onClose: () => void; editing: Student | null; defaultYear: number; defaultGrade: number }) {
  const { students, addStudents, updateStudent } = useStore()
  const base = editing ?? { year: defaultYear, grade: defaultGrade, cls: 1, num: 1, name: '' }
  const [f, setF] = useState(base)
  const [key, setKey] = useState('')
  const sig = `${open}-${editing?.id ?? 'new'}`
  if (open && key !== sig) {
    setKey(sig)
    const next = editing ?? { year: defaultYear, grade: defaultGrade, cls: 1, num: students.filter((s) => s.year === defaultYear && s.grade === defaultGrade && s.cls === 1).length + 1, name: '' }
    setF(next)
  }
  const submit = () => {
    if (!f.name.trim()) return toast('이름을 입력해 주세요')
    const dup = students.find((s) => s.year === f.year && s.grade === f.grade && s.cls === f.cls && s.num === f.num && s.id !== editing?.id)
    if (dup) return toast('같은 학년·반·번호의 학생이 이미 있습니다')
    if (editing) updateStudent(editing.id, { grade: f.grade, cls: f.cls, num: f.num, name: f.name.trim(), year: f.year })
    else addStudents([{ year: f.year, grade: f.grade, cls: f.cls, num: f.num, name: f.name.trim() }])
    toast(editing ? '학생 정보를 수정했습니다' : '학생을 등록했습니다')
    onClose()
  }
  const row = (label: string, el: React.ReactNode) => (
    <>
      <span className="text-sm">{label}</span>
      {el}
    </>
  )
  return (
    <Modal open={open} title={editing ? '학생 정보 수정' : '학생 개별 등록'} onClose={onClose} width="max-w-md" footer={<><Button variant="gray" onClick={onClose}>취소</Button><Button onClick={submit}>저장</Button></>}>
      <p className="mb-4 text-xs text-gray-600">학번과 이름으로 학생 계정을 생성할 수 있습니다.</p>
      <div className="grid grid-cols-[70px_1fr] items-center gap-x-3 gap-y-3">
        {row('학년도', <Select value={f.year} onChange={(v) => setF({ ...f, year: Number(v) })} options={[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => ({ value: y, label: `${y}학년도` }))} />)}
        {row('학년', <NumberInput value={f.grade} onChange={(v) => setF({ ...f, grade: v })} min={1} max={6} className="w-full" />)}
        {row('반', <NumberInput value={f.cls} onChange={(v) => setF({ ...f, cls: v })} min={1} className="w-full" />)}
        {row('번호', <NumberInput value={f.num} onChange={(v) => setF({ ...f, num: v })} min={1} className="w-full" />)}
        {row('이름', <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="이름" />)}
      </div>
    </Modal>
  )
}

interface ParsedRow { grade: number; cls: number; num: number; name: string }

function BulkModal({ open, onClose, defaultYear }: { open: boolean; onClose: () => void; defaultYear: number }) {
  const addStudents = useStore((s) => s.addStudents)
  const [year, setYear] = useState(defaultYear)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const input = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFileName('')
    setRows([])
  }
  const close = () => {
    reset()
    onClose()
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([['학년', '반', '번호', '이름'], [1, 1, 1, '홍길동'], [1, 1, 2, '김철수']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '학생등록')
    XLSX.writeFile(wb, '학생_등록_양식.xlsx')
  }

  const onFile = async (file: File) => {
    if (!/\.(xls|xlsx)$/i.test(file.name)) return toast('엑셀 파일(.xls, .xlsx)만 업로드할 수 있습니다')
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]])
      const parsed = data
        .map((r) => ({ grade: Number(r['학년']), cls: Number(r['반']), num: Number(r['번호']), name: String(r['이름'] ?? '').trim() }))
        .filter((r) => r.grade && r.cls && r.num && r.name)
      if (!parsed.length) return toast('읽을 수 있는 학생 정보가 없습니다. 양식을 확인해 주세요')
      setFileName(file.name)
      setRows(parsed)
    } catch {
      toast('파일을 읽는 중 오류가 발생했습니다')
    }
  }

  return (
    <Modal
      open={open}
      title="학생 일괄 등록"
      onClose={close}
      width="max-w-3xl"
      footer={
        <>
          <Button variant="gray" onClick={close}>취소</Button>
          <Button
            disabled={!rows.length}
            onClick={() => {
              addStudents(rows.map((r) => ({ ...r, year })))
              toast(`${rows.length}명을 등록했습니다`)
              close()
            }}
          >
            저장
          </Button>
        </>
      }
    >
      <p className="mb-5 text-sm text-gray-700">양식을 다운받아 학생 정보 엑셀파일을 업로드하면 학생 계정이 자동으로 생성됩니다.</p>
      <p className="mb-2 text-sm">1. 학생을 등록할 학년도를 선택해 주세요.</p>
      <Select value={year} onChange={(v) => setYear(Number(v))} options={[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => ({ value: y, label: `${y}학년도` }))} className="mb-5 w-full" />
      <p className="mb-2 text-sm">2. 양식을 다운로드하여 학생 정보를 입력해 주세요.</p>
      <Button variant="greenOutline" className="mb-5 !rounded-full" onClick={downloadTemplate}>▤ 양식 다운로드</Button>
      <p className="mb-2 text-sm">3. 학생 정보를 입력한 뒤 파일을 업로드해 주세요.</p>
      <div className="flex gap-3">
        <input readOnly value={fileName} placeholder="업로드된 파일명이 표시됩니다." className={`${inputCls} flex-1 bg-gray-50`} />
        <Button variant="green" className="!rounded-full" onClick={() => input.current?.click()}>▤ 엑셀 파일 업로드</Button>
        <input ref={input} type="file" accept=".xls,.xlsx" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
      <p className="mb-5 mt-1.5 text-xs text-gray-600">* 엑셀 파일(.xls, .xlsx)만 업로드 할 수 있습니다.</p>
      <p className="text-sm">4. 업로드된 학생 정보를 확인해 주세요.</p>
      <p className="mb-2 mt-1 text-xs text-gray-600">총 {rows.length}명</p>
      <div className="max-h-72 overflow-y-auto">
        <table className="table-base">
          <thead className="sticky top-0">
            <tr><th>학년</th><th>반</th><th>번호</th><th>이름</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}><td>{r.grade}</td><td>{r.cls}</td><td>{r.num}</td><td>{r.name}</td></tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="py-14 text-center text-gray-500">양식을 다운로드 받아 파일을 업로드해주세요.</div>}
      </div>
    </Modal>
  )
}
