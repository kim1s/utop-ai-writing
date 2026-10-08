import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CopyModal, LibraryPickModal } from '../components/PickModals'
import { PageContainer } from '../components/Layout'
import { Badge, Button, Card, EmptyState, Select, confirmAsync, toast } from '../components/ui'
import { CURRENT_YEAR } from '../lib/seed'
import { useStore } from '../lib/store'

const SEM_OPTIONS = [
  { value: '', label: '전체 학기' },
  { value: `${CURRENT_YEAR}-1`, label: `${CURRENT_YEAR}학년도 1학기` },
  { value: `${CURRENT_YEAR}-2`, label: `${CURRENT_YEAR}학년도 2학기` },
  { value: `${CURRENT_YEAR - 1}-2`, label: `${CURRENT_YEAR - 1}학년도 2학기` },
  { value: `${CURRENT_YEAR - 1}-1`, label: `${CURRENT_YEAR - 1}학년도 1학기` },
]


export default function Home() {
  const nav = useNavigate()
  const { designs, scores, submissions, runs, deleteDesign, createDesign, me } = useStore()
  const [sem, setSem] = useState(`${CURRENT_YEAR}-1`)
  const [subject, setSubject] = useState('')
  const [addMenu, setAddMenu] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [libOpen, setLibOpen] = useState(false)

  const list = useMemo(
    () => designs.filter((d) => (!sem || `${d.year}-${d.semester}` === sem) && (!subject || d.subject === subject)),
    [designs, sem, subject],
  )

  const open = (id: string) => {
    const d = designs.find((x) => x.id === id)!
    nav(`/evals/${id}/${d.status === 'draft' ? 'design' : d.targetIds.length === 0 ? 'targets' : 'grading'}`)
  }

  return (
    <>
      <PageContainer>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">📘 나의 평가 목록</h2>
          <div className="relative flex gap-2">
            <Link to="/school" className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-[13px] font-medium text-brand-600 hover:bg-brand-50">
              학생 관리
            </Link>
            <Button onClick={() => setAddMenu(!addMenu)}>＋ 평가 만들기</Button>
            {addMenu && (
              <div className="absolute right-0 top-11 z-10 w-52 rounded-lg border bg-white py-2 text-center text-[13px] shadow-lg">
                <button type="button" className="block w-full py-2 hover:bg-brand-50" onClick={() => nav(`/evals/${createDesign()}/targets`)}>
                  새로 만들기
                </button>
                <button type="button" className="block w-full py-2 text-gray-600 hover:bg-brand-50" onClick={() => { setAddMenu(false); setCopyOpen(true) }}>
                  기존 평가 복사 생성
                </button>
                <button type="button" className="block w-full py-2 text-gray-600 hover:bg-brand-50" onClick={() => { setAddMenu(false); setLibOpen(true) }}>
                  평가 자료실에서 가져오기
                </button>
              </div>
            )}
          </div>
        </div>
        <Card>
          <div className="mb-5 flex gap-3">
            <Select value={sem} onChange={setSem} options={SEM_OPTIONS} className="w-52" />
            <Select value={subject} onChange={setSubject} options={[{ value: '', label: '전체 교과' }, ...me.subjects.map((x) => ({ value: x, label: x }))]} className="w-36" />
          </div>
          {list.length === 0 ? (
            <EmptyState kind="doc" title="등록된 평가가 없어요." desc={'"평가 만들기"로 서·논술형 평가를 만들어 보세요.'} action={<Button onClick={() => nav(`/evals/${createDesign()}/targets`)}>＋ 평가 만들기</Button>} />
          ) : (
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              {list.map((d) => {
                const submitted = d.targetIds.filter((id) => submissions[`${d.id}:${id}`])
                const confirmed = submitted.filter((id) => scores[`${d.id}:${id}`]?.done).length
                const run = runs[d.id]
                return (
                  <div key={d.id} className="relative flex overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md">
                    <button type="button" className="min-w-0 flex-1 p-4 text-left" onClick={() => open(d.id)}>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        <Badge tone="orange">{d.subject}</Badge>
                        <Badge tone="purple">{d.year} · {d.semester}학기</Badge>
                        <Badge tone="gray">{d.schoolLevel} {d.grade}학년</Badge>
                        {d.status === 'draft' ? <Badge tone="orange">임시저장</Badge> : run?.state === 'done' ? <Badge tone="green">AI 채점 완료</Badge> : run?.state === 'running' ? <Badge tone="purple">채점 중</Badge> : <Badge tone="gray">채점 전</Badge>}
                      </div>
                      <div className="truncate text-[17px] font-semibold">{d.name || '(이름 없음)'}</div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">{d.problem?.topic ? `주제: ${d.problem.topic}` : '과제 조건 미등록'}</div>
                      <div className="mt-3 text-xs text-gray-500">평가 대상 {d.targetIds.length}명 · 채점 완료 {confirmed}/{submitted.length}명</div>
                    </button>
                    <button type="button" aria-label="메뉴" className="absolute right-2 top-2 rounded p-1 text-gray-500 hover:bg-gray-100" onClick={() => setMenuId(menuId === d.id ? null : d.id)}>
                      ⋮
                    </button>
                    {menuId === d.id && (
                      <div className="absolute right-2 top-9 z-10 w-28 rounded-lg border bg-white py-1 text-center text-[13px] shadow-lg">
                        <button type="button" className="block w-full py-2 hover:bg-brand-50" onClick={() => nav(`/evals/${d.id}/design`)}>
                          평가 설계
                        </button>
                        <button
                          type="button"
                          className="block w-full py-2 text-rose-600 hover:bg-rose-50"
                          onClick={async () => {
                            setMenuId(null)
                            if (await confirmAsync(`'${d.name}' 평가를 삭제할까요?\n제출된 과제물과 채점 결과도 함께 삭제됩니다.`)) {
                              deleteDesign(d.id)
                              toast('평가를 삭제했습니다')
                            }
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </PageContainer>
      <CopyModal open={copyOpen} onClose={() => setCopyOpen(false)} />
      <LibraryPickModal open={libOpen} onClose={() => setLibOpen(false)} />
    </>
  )
}
