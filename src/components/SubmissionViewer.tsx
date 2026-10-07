import { useState } from 'react'
import type { Design, Student, Submission } from '../lib/types'
import { AnswerViewer } from './Sheet'
import { Button, Modal } from './ui'

/** 학생 제출물 팝업: 업로드 원본(PDF/이미지)과 OCR(또는 직접 입력) 텍스트를 확인한다 */
export function SubmissionViewerModal({ open, onClose, design, student, submission }: { open: boolean; onClose: () => void; design: Design; student: Student; submission?: Submission }) {
  const [tab, setTab] = useState<'original' | 'text'>('original')
  const [idx, setIdx] = useState(0)
  const files = submission?.files ?? []
  const file = files[Math.min(idx, files.length - 1)]
  const showText = !file || tab === 'text'

  return (
    <Modal open={open} title={`${student.name} 학생 제출물`} onClose={onClose} width="max-w-4xl" footer={<Button variant="gray" onClick={onClose}>닫기</Button>}>
      {!submission ? (
        <p className="py-16 text-center text-sm text-gray-500">제출된 과제물이 없습니다.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            {file && (
              <div className="flex overflow-hidden rounded-lg border">
                <button type="button" onClick={() => setTab('original')} className={`px-4 py-1.5 ${tab === 'original' ? 'bg-brand-50 font-medium text-brand-700' : ''}`}>원본</button>
                <button type="button" onClick={() => setTab('text')} className={`border-l px-4 py-1.5 ${tab === 'text' ? 'bg-brand-50 font-medium text-brand-700' : ''}`}>OCR 텍스트</button>
              </div>
            )}
            {files.length > 1 && (
              <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="rounded-lg border px-2 py-1.5 text-sm">
                {files.map((_, i) => <option key={i} value={i}>파일 {i + 1}</option>)}
              </select>
            )}
            <span className="truncate text-xs text-gray-500">
              {file ? `${file.name}${file.pages ? ` · ${file.pages}쪽` : ''} · ${file.uploadedAt} 업로드` : submission.textSource === 'typed' ? '선생님이 직접 입력한 답안' : ''}
            </span>
          </div>
          <div className="h-[62vh] overflow-hidden rounded-lg border bg-gray-100">
            {showText ? (
              <div className="h-full overflow-y-auto bg-white p-6 text-[15px] leading-8">
                <p className="mb-3 text-xs text-gray-500">{submission.textSource === 'typed' ? '선생님이 직접 입력한 답안입니다.' : 'OCR로 인식한 텍스트입니다. (수정은 과제물 관리 > 제출 내용에서 할 수 있어요)'}</p>
                <p className="whitespace-pre-line">{submission.text || '인식된 텍스트가 없습니다.'}</p>
              </div>
            ) : (
              <AnswerViewer design={design} studentId={student.id} studentName={student.name} fileKey={file.key ?? file.name} fileName={file.name} page={Number(file.pages?.split('~')[0] ?? 1)} />
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
