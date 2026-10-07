import { studentNo } from '../pages/eval/Submissions'
import { criterionMax, designMax, resolvedScore, rowStatus } from '../lib/grading'
import { taskTitle } from '../lib/problemGen'
import { SCHOOL_NAME } from '../lib/seed'
import type { Design, Student, StudentScore } from '../lib/types'
import { CorrectionView } from './CorrectionPanel'

const LABEL = { done: '완료', waiting: '대기', unsubmitted: '미제출', nonresponse: '미응시' } as const

/** 학생별 평가 리포트 출력물. 평균 대비 비교·첨삭은 내보내기 옵션으로 넣고 뺀다. */
export function ReportSheet({
  design,
  student,
  score,
  hasSub,
  avg,
  showCompare,
  showCorrection,
}: {
  design: Design
  student: Student
  score: StudentScore | undefined
  hasSub: boolean
  /** 채점 완료 학생들의 평균 점수 */
  avg: number | null
  showCompare: boolean
  showCorrection: boolean
}) {
  const st = rowStatus(score, hasSub)
  const final = resolvedScore(design, score, hasSub)
  const diff = final != null && avg != null ? final - avg : null
  return (
    <div className="mx-auto w-full max-w-[680px] break-after-page bg-white px-12 py-10 text-[13px] text-gray-900 shadow-md print:shadow-none">
      <div className="mb-2 flex justify-end gap-3 text-[11px] text-gray-500">{SCHOOL_NAME}<span>|</span>{studentNo(student)} {student.name}</div>
      <div className="border-t-4 border-brand-500 bg-brand-50/60 px-6 py-6">
        <div className="text-[13px]">{design.year}학년도 {design.semester}학기 {design.subject}</div>
        <div className="mt-2 text-[22px] font-bold">{taskTitle(design)} <span className="text-brand-600">채점 결과</span></div>
      </div>

      <h4 className="mb-2 mt-7 text-xs text-gray-600">성취기준</h4>
      {design.achievements.map((a, i) => (
        <div key={i} className="mb-1.5 flex gap-4 rounded bg-gray-50 px-3 py-2"><b className="text-brand-600">{i + 1}</b><span>{a.text || a.code}</span></div>
      ))}

      <h4 className="mb-2 mt-7 text-xs text-gray-600">채점 결과</h4>
      {st === 'unsubmitted' || st === 'nonresponse' ? (
        <p className="rounded bg-gray-50 p-4">{LABEL[st]} 처리되어 {final}점이 부여되었습니다.</p>
      ) : (
        <table className="w-full border-collapse text-[12px]">
          <thead><tr className="bg-gray-100"><th className="border p-2 text-left">채점 요소</th><th className="border p-2">점수</th><th className="border p-2 text-left">평가 내용</th></tr></thead>
          <tbody>
            {design.criteria.map((c, i) => {
              const v = score?.picks[i] ?? null
              return (
                <tr key={i}>
                  <td className="border p-2">{c.element}</td>
                  <td className="border p-2 text-center">{v ?? '-'} / {criterionMax(c)}</td>
                  <td className="border p-2 text-gray-700">{c.scores.find((s) => s.score === v)?.desc ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <div className="mt-3 text-right text-base font-bold">총점 <span className="text-brand-600">{final ?? '-'}</span> / {designMax(design)}점{design.scoreMode === 'grade' && score?.done ? ' (환산 점수)' : ''}</div>
      {showCompare && avg != null && (
        <div className="mt-1 text-right text-xs text-gray-600">
          평균 {Math.round(avg * 10) / 10}점{diff != null ? ` · 평균 대비 ${diff >= 0 ? '+' : ''}${Math.round(diff * 10) / 10}점` : ''}
        </div>
      )}

      {score?.teacherFeedback && (
        <>
          <h4 className="mb-2 mt-7 text-xs text-gray-600">선생님 피드백</h4>
          <div className="whitespace-pre-line rounded border p-4 leading-7">{score.teacherFeedback}</div>
        </>
      )}

      {showCorrection && score?.correction && score.correction.length > 0 && (
        <>
          <h4 className="mb-2 mt-7 text-xs text-gray-600">첨삭</h4>
          <CorrectionView value={score.correction} compact />
        </>
      )}
    </div>
  )
}
