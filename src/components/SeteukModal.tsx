import { useState } from 'react'
import { generateSeteuk } from '../lib/seteuk'
import { useStore } from '../lib/store'
import type { Design, Student } from '../lib/types'
import { Button, Modal, Spinner, inputCls, toast } from './ui'

/** AI 세특: 세특 키워드 + 세특 초안(수정 가능, 확정 가능) */
export function SeteukModal({ open, onClose, design, student }: { open: boolean; onClose: () => void; design: Design; student: Student | null }) {
  const score = useStore((s) => (student ? s.scores[`${design.id}:${student.id}`] : undefined))
  const text = useStore((s) => (student ? s.submissions[`${design.id}:${student.id}`]?.text ?? '' : ''))
  const setScore = useStore((s) => s.setScore)
  const [draft, setDraft] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadedFor, setLoadedFor] = useState('')

  const save = (patch: { keywords: string[]; draft: string; confirmed: boolean }) => student && setScore(design.id, student.id, { seteuk: patch })

  const generate = () => {
    if (!student || !score) return
    setBusy(true)
    setTimeout(() => {
      const next = generateSeteuk(design, score, text)
      setKeywords(next.keywords)
      setDraft(next.draft)
      setConfirmed(false)
      save(next)
      setBusy(false)
    }, 900)
  }

  // 학생이 바뀔 때: 저장된 세특이 있으면 불러오고, 없으면 새로 만든다
  if (open && student && score && loadedFor !== student.id) {
    setLoadedFor(student.id)
    if (score.seteuk) {
      setKeywords(score.seteuk.keywords)
      setDraft(score.seteuk.draft)
      setConfirmed(score.seteuk.confirmed)
    } else {
      setKeywords([])
      setDraft('')
      setConfirmed(false)
      setBusy(true)
      setTimeout(() => {
        const next = generateSeteuk(design, score, text)
        setKeywords(next.keywords)
        setDraft(next.draft)
        save(next)
        setBusy(false)
      }, 900)
    }
  }
  if (!open && loadedFor) setLoadedFor('')

  const close = () => {
    // 수정만 하고 확정하지 않고 닫아도 내용은 보관
    if (student && score?.seteuk && (score.seteuk.draft !== draft || score.seteuk.confirmed !== confirmed)) save({ keywords, draft, confirmed })
    onClose()
  }

  return (
    <Modal
      open={open && !!student}
      title={`${student?.name ?? ''} · AI 세특`}
      onClose={close}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={generate}>↻ 다시 생성</Button>
          <Button variant="gray" onClick={close}>닫기</Button>
        </>
      }
    >
      {busy ? (
        <div className="flex flex-col items-center gap-3 py-16 text-sm text-gray-600">
          <Spinner />
          학생 제출 내용과 AI 평가를 바탕으로 세특을 만들고 있어요…
        </div>
      ) : (
        <>
          <h4 className="mb-3 text-[15px] font-bold text-gray-800">세특 키워드</h4>
          <div className="mb-6 flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span key={k} className="rounded-full bg-indigo-50 px-4 py-2 text-[14px] font-bold text-indigo-800">{k}</span>
            ))}
            {keywords.length === 0 && <span className="text-sm text-gray-500">키워드가 없어요.</span>}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[15px] font-bold text-gray-800">세특 초안</h4>
            <button
              type="button"
              className={`text-sm font-bold ${confirmed ? 'text-emerald-600' : 'text-sky-800 hover:underline'}`}
              onClick={() => {
                if (!draft.trim()) return toast('세특 초안을 입력해 주세요')
                if (confirmed) {
                  setConfirmed(false)
                  save({ keywords, draft, confirmed: false })
                  toast('확정을 해제했어요. 수정 후 다시 확정해 주세요')
                } else {
                  setConfirmed(true)
                  save({ keywords, draft, confirmed: true })
                  toast('세특을 확정했어요')
                }
              }}
            >
              {confirmed ? '✓ 확정됨 (눌러서 해제)' : '세특 확정'}
            </button>
          </div>
          <textarea
            className={`${inputCls} h-60 resize-none text-[15px] leading-8`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (confirmed) setConfirmed(false)
            }}
          />
          <div className="mt-1 text-xs text-gray-500">{draft.length}자 · AI가 만든 초안이에요. 학생 생활기록부에 입력하기 전에 내용을 확인하고 수정해 주세요.</div>
        </>
      )}
    </Modal>
  )
}
