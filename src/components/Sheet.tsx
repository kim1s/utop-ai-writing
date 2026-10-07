import { essayFor } from '../lib/essays'
import { blobFor, isImageName } from '../lib/files'
import { taskTitle } from '../lib/problemGen'
import type { Design } from '../lib/types'

/** 업로드 원본이 없을 때(샘플 데이터) 보여 주는 가상의 학생 답안지 */
export function MockAnswerSheet({ design, studentId, studentName }: { design: Design; studentId: string; studentName: string }) {
  const essay = essayFor(studentId)
  const p = design.problem
  return (
    <div className="mx-auto my-6 w-[92%] rounded bg-white p-8 text-[13px] leading-7 text-gray-900 shadow-lg" style={{ fontFamily: 'Batang, "Noto Serif KR", serif' }}>
      <div className="mb-1 text-xs text-gray-400">샘플 답안지 (프로토타입용 가상 문서) · {studentName}</div>
      <p className="mb-2 text-base font-bold">{taskTitle(design)}</p>
      {p?.description && <p className="mb-3 whitespace-pre-line rounded border border-gray-500 p-3 text-xs">{p.description}</p>}
      {p?.sheet
        .filter((b) => b.type !== 'image')
        .map((b) => (
          <p key={b.id} className={`mb-2 whitespace-pre-line text-xs ${b.type === 'question' ? 'font-bold' : 'text-gray-700'}`}>
            {b.content}
          </p>
        ))}
      <div className="mt-4 border-t border-gray-400 pt-3 text-[15px] leading-9" style={{ fontFamily: '"Nanum Pen Script","Segoe Print",cursive' }}>
        {essay}
      </div>
    </div>
  )
}

/** 업로드 원본(PDF/이미지) 뷰어. 원본이 없는 샘플 데이터는 가상의 답안지를 보여 줍니다. */
export function AnswerViewer({ design, studentId, studentName, fileKey, fileName, page }: { design: Design; studentId: string; studentName: string; fileKey?: string; fileName?: string; page: number }) {
  const url = fileKey ? blobFor(fileKey) : null
  if (url && fileName && isImageName(fileName)) {
    return (
      <div className="h-full overflow-auto bg-gray-500 p-4">
        <img src={url} alt={`${studentName} 제출 이미지`} className="mx-auto max-w-full rounded bg-white shadow-lg" />
      </div>
    )
  }
  if (url) return <iframe title="답안지" src={`${url}#page=${page}&toolbar=0&navpanes=0`} className="h-full w-full bg-white" />
  return (
    <div className="h-full overflow-y-auto bg-gray-500">
      <MockAnswerSheet design={design} studentId={studentId} studentName={studentName} />
    </div>
  )
}
