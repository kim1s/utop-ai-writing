import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer, TitleBar } from '../components/Layout'
import { Badge, Button, Card, EmptyState, Modal, Select, inputCls, toast } from '../components/ui'
import { criterionMax, designMax } from '../lib/grading'
import { useStore } from '../lib/store'
import type { LibraryItem } from '../lib/types'

export default function Library() {
  const nav = useNavigate()
  const { library, importLibrary } = useStore()
  const [subject, setSubject] = useState('')
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<LibraryItem | null>(null)

  const subjects = [...new Set(library.map((l) => l.subject))]
  const list = library.filter((l) => (!subject || l.subject === subject) && (l.title + l.ownerName + l.school).includes(q))

  return (
    <>
      <TitleBar title="평가 자료실" />
      <PageContainer>
        <Card>
          <p className="mb-5 text-sm text-gray-700">다른 선생님들이 공개한 평가 설계를 살펴보고 내 수업으로 가져와 사용할 수 있어요.</p>
          <div className="mb-5 flex gap-3">
            <Select value={subject} onChange={setSubject} options={[{ value: '', label: '전체 교과' }, ...subjects.map((s) => ({ value: s, label: s }))]} className="w-40" />
            <input className={`${inputCls} flex-1`} placeholder="평가명, 선생님 또는 학교 이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {list.length === 0 ? (
            <EmptyState kind="doc" title="검색된 평가 자료가 없어요." />
          ) : (
            <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
              {list.map((l) => (
                <div key={l.id} className="flex flex-col rounded-xl border border-gray-200 p-5">
                  <div className="mb-2 flex gap-1.5"><Badge tone="purple">{l.subject}</Badge><Badge tone="gray">{l.grade}학년</Badge></div>
                  <div className="font-medium leading-snug">{l.title}</div>
                  <div className="mt-2 text-xs text-gray-500">{l.ownerName} 선생님 · {l.school}</div>
                  <div className="text-xs text-gray-400">수정 {l.updatedAt}</div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setDetail(l)}>상세 보기</Button>
                    <Button size="sm" className="flex-1" onClick={() => { const id = importLibrary(l.id); toast('평가 자료를 가져왔습니다. 내용을 확인하고 저장해 주세요'); nav(`/evals/${id}/design`) }}>가져오기</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageContainer>

      <Modal open={!!detail} title={detail?.title ?? ''} onClose={() => setDetail(null)} width="max-w-3xl" footer={<Button variant="gray" onClick={() => setDetail(null)}>닫기</Button>}>
        {detail && (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto text-sm">
            <section>
              <h4 className="mb-2 font-semibold">성취기준</h4>
              {detail.design.achievements.map((a) => <p key={a.code} className="rounded bg-gray-50 p-3"><b className="text-brand-600">{a.code}</b> {a.text}</p>)}
            </section>
            <section>
              <h4 className="mb-2 font-semibold">채점기준 <span className="font-normal text-gray-500">(만점 {designMax(detail.design)}점)</span></h4>
              {detail.design.criteria.map((c, i) => (
                <div key={i} className="mb-2 rounded-lg border p-3 text-[13px]">
                  <b>{c.element}</b> <span className="text-gray-500">(최대 {criterionMax(c)}점)</span>
                  <ul className="mt-1 list-disc pl-5 text-gray-700">{c.scores.map((s) => <li key={s.score}>[{s.score}점] {s.desc}</li>)}</ul>
                </div>
              ))}
            </section>
          </div>
        )}
      </Modal>

    </>
  )
}
