import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { taskTitle } from '../lib/problemGen'
import { useOrgData, useStore } from '../lib/store'
import { Button, Modal, inputCls, toast } from './ui'

/** 기존 평가 복사 생성 */
export function CopyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const copyDesign = useStore((s) => s.copyDesign)
  const { designs, org } = useOrgData()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState('')
  const list = designs.filter((d) => d.status === 'saved' && (d.name + taskTitle(d) + d.ownerName).includes(q))
  return (
    <Modal
      open={open}
      title="복사해서 만들기"
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <Button variant="gray" onClick={onClose}>취소</Button>
          <Button
            disabled={!sel}
            onClick={() => {
              const id = copyDesign(sel)
              toast('평가를 복사했습니다. 내용을 확인하고 저장해 주세요')
              onClose()
              nav(`/evals/${id}/design`)
            }}
          >
            복사 생성
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-gray-700">기존 평가의 {org === 'academy' ? '과제 조건·' : '성취기준·'}채점기준·점수 계산 방식을 복사하여 새 평가를 만듭니다. 평가 대상과 채점 결과는 복사되지 않습니다.</p>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span>총 {list.length}개</span>
        <input className={`${inputCls} !w-64`} placeholder="평가명 또는 과제명 입력" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <table className="table-base">
        <thead><tr><th className="w-14">선택</th><th>평가명</th><th>과제명</th><th>최근 수정일</th></tr></thead>
        <tbody>
          {list.map((d) => (
            <tr key={d.id} className={sel === d.id ? 'bg-brand-50' : ''} onClick={() => setSel(d.id)} style={{ cursor: 'pointer' }}>
              <td><input type="radio" checked={sel === d.id} onChange={() => setSel(d.id)} className="accent-brand-600" /></td>
              <td>{d.name}</td>
              <td>{taskTitle(d)}</td>
              <td>{d.updatedAt.slice(2).replaceAll('-', '.')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <div className="py-10 text-center text-sm text-gray-500">복사할 수 있는 평가가 없습니다.</div>}
    </Modal>
  )
}

/** 평가 자료실에서 가져오기 */
export function LibraryPickModal({ open, onClose, subject }: { open: boolean; onClose: () => void; subject?: string }) {
  const nav = useNavigate()
  const { library, importLibrary } = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState('')
  const list = library.filter((l) => (!subject || l.subject === subject) && (l.title + l.ownerName).includes(q))
  return (
    <Modal
      open={open}
      title="평가 자료실에서 가져오기"
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <Button variant="gray" onClick={onClose}>취소</Button>
          <Button
            disabled={!sel}
            onClick={() => {
              const id = importLibrary(sel)
              toast('평가 자료를 가져왔습니다. 내용을 확인하고 저장해 주세요')
              onClose()
              nav(`/evals/${id}/design`)
            }}
          >
            가져오기
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-gray-700">다른 선생님이 공개한 평가를 가져와 새 평가로 만들 수 있습니다.</p>
      <input className={`${inputCls} mb-3`} placeholder="평가명 또는 선생님 이름 입력" value={q} onChange={(e) => setQ(e.target.value)} />
      <table className="table-base">
        <thead><tr><th className="w-14">선택</th><th>평가명</th><th>선생님</th><th>학교</th><th>수정일</th></tr></thead>
        <tbody>
          {list.map((l) => (
            <tr key={l.id} className={sel === l.id ? 'bg-brand-50' : ''} onClick={() => setSel(l.id)} style={{ cursor: 'pointer' }}>
              <td><input type="radio" checked={sel === l.id} onChange={() => setSel(l.id)} className="accent-brand-600" /></td>
              <td>{l.title}</td>
              <td>{l.ownerName}</td>
              <td>{l.school}</td>
              <td>{l.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <div className="py-10 text-center text-sm text-gray-500">가져올 수 있는 평가 자료가 없습니다.</div>}
    </Modal>
  )
}
