import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer, TitleBar } from '../components/Layout'
import { Button, Card, Checkbox, Modal, toast } from '../components/ui'
import { SCHOOL_NAME, SUBJECT_OPTIONS } from '../lib/seed'
import { useStore } from '../lib/store'

export default function MyInfo() {
  const me = useStore((s) => s.me)
  const setMySubjects = useStore((s) => s.setMySubjects)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>([])

  return (
    <>
      <TitleBar title="내 정보" />
      <PageContainer>
        <Card className="!p-8">
          <h2 className="text-xl font-semibold">내 정보</h2>
          <p className="mt-1 text-[13px] text-gray-600">내 정보를 확인하고 교과를 여러 개 지정할 수 있습니다.</p>
          <div className="mt-6 rounded-2xl bg-gray-50 p-5">
            <div className="grid grid-cols-[80px_1fr] gap-y-5 rounded-2xl bg-white p-7 text-sm">
              <b>이름</b>
              <span className="text-gray-700">{me.name}</span>
              <b>학교</b>
              <span className="flex items-center gap-3 text-gray-700">
                {SCHOOL_NAME}
                <Link to="/school?tab=teachers" className="rounded-lg border border-brand-300 px-3 py-1 text-[13px] font-medium text-brand-600 hover:bg-brand-50">선생님 목록 ›</Link>
              </span>
              <b>교과</b>
              <div>
                <div className="flex flex-wrap gap-2">
                  {me.subjects.length === 0 && <span className="text-gray-400">선택된 교과가 없습니다</span>}
                  {me.subjects.map((s) => (
                    <span key={s} className="rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-brand-600">
                      {s}
                    </span>
                  ))}
                </div>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setDraft(me.subjects)
                    setOpen(true)
                  }}
                >
                  ✎ 교과 선택
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </PageContainer>
      <Modal
        open={open}
        title="교과 선택"
        onClose={() => setOpen(false)}
        width="max-w-md"
        footer={
          <>
            <Button variant="gray" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                if (!draft.length) return toast('교과를 한 개 이상 선택해 주세요')
                setMySubjects(draft)
                setOpen(false)
                toast('교과를 저장했습니다')
              }}
            >
              저장
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-gray-600">담당하는 교과를 모두 선택해 주세요.</p>
        <div className="grid grid-cols-3 gap-3">
          {SUBJECT_OPTIONS.map((s) => (
            <Checkbox key={s} label={s} checked={draft.includes(s)} onChange={(v) => setDraft(v ? [...draft, s] : draft.filter((x) => x !== s))} />
          ))}
        </div>
      </Modal>
    </>
  )
}
