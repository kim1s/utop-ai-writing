import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CorrectionView } from '../../components/CorrectionPanel'
import { PageContainer, TitleBar } from '../../components/Layout'
import { Badge, Button, Card, confirmAsync, inputCls, toast } from '../../components/ui'
import { criterionMax, designMax, finalScore } from '../../lib/grading'
import { taskTitle } from '../../lib/problemGen'
import { useSession } from '../../lib/session'
import { useStore } from '../../lib/store'
import type { Problem } from '../../lib/types'
import { STATE_LABEL, taskState } from './taskState'

/** rewriting 칸은 직접 타이핑만 허용: 붙여넣기·끌어다 놓기 차단 */
const blockPaste = (e: React.ClipboardEvent | React.DragEvent) => {
  e.preventDefault()
  toast('붙여넣기는 할 수 없어요. 직접 타이핑해 주세요')
}

const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length

function ProblemCard({ p }: { p: Problem }) {
  const row = (label: string, body: React.ReactNode) => (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-2 text-sm">
      <b className="text-gray-700">{label}</b>
      <div className="text-gray-800">{body}</div>
    </div>
  )
  const contents = p.contents.filter((c) => c.trim())
  const etc = p.etc.filter((c) => c.trim())
  return (
    <div className="divide-y rounded-xl bg-gray-50 px-5 py-2">
      {row('주제', p.topic)}
      {p.format.trim() && row('형식', p.format)}
      {contents.length > 0 && row('필수 포함 내용', <ol className="list-decimal pl-5">{contents.map((c, i) => <li key={i}>{c}</li>)}</ol>)}
      {p.grammar.length > 0 && row('필수 포함 문법', p.grammar.join(', '))}
      {p.length.trim() && row('분량', p.length)}
      {etc.length > 0 && row('기타', <ul className="list-disc pl-5">{etc.map((c, i) => <li key={i}>{c}</li>)}</ul>)}
    </div>
  )
}

export default function StudentTask() {
  const { evalId } = useParams()
  const me = useSession((s) => s.user)
  const design = useStore((s) => s.designs.find((d) => d.id === evalId))
  const key = `${evalId}:${me?.accountId}`
  const sub = useStore((s) => s.submissions[key])
  const sc = useStore((s) => s.scores[key])
  const submitAnswer = useStore((s) => s.submitStudentAnswer)
  const submitRewrite = useStore((s) => s.submitRewrite)
  const saveDraft = useStore((s) => s.saveDraft)
  const answerDraft = useStore((s) => s.drafts?.[`${key}:answer`])
  const rewriteDraft = useStore((s) => s.drafts?.[`${key}:rewrite`])
  const [answer, setAnswer] = useState<string | null>(null)
  const [rewrite, setRewrite] = useState<string | null>(null)

  // 본인에게 배정된 과제만 열린다
  if (!me || !design || design.status !== 'saved' || !design.targetIds.includes(me.accountId)) return <Navigate to="/student" replace />

  const st = taskState(sub, sc)
  const label = STATE_LABEL[st]
  // 채점이 시작되기 전(점수 기록이 없을 때)까지만 답안을 쓰고 고칠 수 있다
  const canEditAnswer = !sc
  const answerText = answer ?? answerDraft?.text ?? sub?.text ?? ''
  const rewriteText = rewrite ?? rewriteDraft?.text ?? ''
  const total = sc?.done ? finalScore(design, sc) : null

  const onSaveDraft = (kind: 'answer' | 'rewrite') => {
    const text = kind === 'answer' ? answerText : rewriteText
    if (!text.trim()) return toast('임시저장할 내용이 없어요')
    saveDraft(design.id, me.accountId, kind, text)
    toast('임시저장했어요. 나중에 이어서 쓸 수 있어요')
  }

  const onSubmitAnswer = async () => {
    if (!answerText.trim()) return toast('답안을 입력해 주세요')
    if (!(await confirmAsync(sub ? '답안을 수정해서 다시 제출할까요?' : '답안을 제출할까요?'))) return
    toast(submitAnswer(design.id, me.accountId, answerText) ? '답안을 제출했어요' : '지금은 제출할 수 없어요')
  }

  const onSubmitRewrite = async () => {
    const text = rewriteText.trim()
    if (!text) return toast('다시 쓴 글을 입력해 주세요')
    if (text === (sub?.text ?? '').trim()) return toast('첨삭 내용을 반영해서 고쳐 써 주세요')
    if (!(await confirmAsync('Rewriting을 제출하면 수정할 수 없어요. 제출할까요?'))) return
    if (submitRewrite(design.id, me.accountId, text)) toast('Rewriting을 제출했어요')
  }

  return (
    <>
      <TitleBar title={taskTitle(design)} />
      <PageContainer className="space-y-5">
        <Link to="/student" className="!mb-2 flex w-fit items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          나의 과제
        </Link>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-lg font-semibold">과제 조건</h3>
            <Badge tone={label.tone}>{label.text}</Badge>
          </div>
          {design.problem ? <ProblemCard p={design.problem} /> : <p className="text-sm text-gray-500">등록된 과제 조건이 없어요.</p>}
        </Card>

        <Card>
          <h3 className="mb-1 text-lg font-semibold">1. 나의 답안</h3>
          {canEditAnswer ? (
            <>
              <p className="mb-3 text-[13px] text-gray-600">영어로 직접 타이핑해 주세요. 복사·붙여넣기는 할 수 없어요. 선생님이 채점을 시작하기 전까지 고쳐서 다시 제출할 수 있어요.</p>
              <textarea className={`${inputCls} min-h-[240px] resize-y text-[15px] leading-7`} value={answerText} onChange={(e) => setAnswer(e.target.value)} onPaste={blockPaste} onDrop={blockPaste} placeholder="Write your answer here." lang="en" spellCheck={false} aria-label="나의 답안" />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">{wordCount(answerText)}단어{answerDraft ? ` · 임시저장 ${answerDraft.savedAt}` : ''}{sub?.submittedAt ? ` · 마지막 제출 ${sub.submittedAt}` : ''}</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onSaveDraft('answer')}>임시저장</Button>
                  <Button onClick={onSubmitAnswer}>{sub ? '수정해서 다시 제출' : '답안 제출'}</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-[13px] text-gray-600">{sub ? `제출 완료${sub.submittedAt ? ` · ${sub.submittedAt}` : ''}` : '제출된 답안이 없어요.'}</p>
              <p className="whitespace-pre-line rounded-xl bg-gray-50 p-4 text-[15px] leading-7">{sub?.text || '-'}</p>
            </>
          )}
        </Card>

        {sc?.reportSentAt && (
          <Card>
            <h3 className="mb-1 text-lg font-semibold">2. 평가 리포트</h3>
            <p className="mb-4 text-[13px] text-gray-600">선생님이 보낸 리포트예요 · {sc.reportSentAt}</p>
            <div className="mb-4 flex items-center justify-between rounded-xl bg-brand-50 px-5 py-3 text-sm">
              <span className="text-brand-900">총점</span>
              <b>{total ?? '-'} / {designMax(design)}점</b>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              {design.criteria.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                  <span>{c.element}</span>
                  <b className="shrink-0">{sc.picks[i] ?? '-'} / {criterionMax(c)}</b>
                </div>
              ))}
            </div>
            {sc.teacherFeedback && <div className="mt-3 whitespace-pre-line rounded-xl border p-4 text-[13px] leading-6 text-gray-800">{sc.teacherFeedback}</div>}
            {sc.correction && sc.correction.length > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 font-semibold">첨삭</h4>
                <p className="mb-3 text-xs text-gray-500">빨간색은 고쳐야 할 부분, 파란색은 바르게 고친 부분이에요.</p>
                <CorrectionView value={sc.correction} />
              </div>
            )}
          </Card>
        )}

        {sc?.reportSentAt && (
          <Card>
            <h3 className="mb-1 text-lg font-semibold">3. Rewriting</h3>
            {sc.rewrite ? (
              <>
                <p className="mb-3 text-[13px] text-emerald-600">제출 완료 · {sc.rewrite.submittedAt}</p>
                <p className="whitespace-pre-line rounded-xl bg-gray-50 p-4 text-[15px] leading-7">{sc.rewrite.text}</p>
              </>
            ) : (
              <>
                <p className="mb-3 text-[13px] text-gray-600">위의 첨삭을 보고 내 글을 처음부터 직접 타이핑해서 다시 써 주세요. 복사·붙여넣기는 할 수 없어요. 제출하면 수정할 수 없어요.</p>
                <textarea className={`${inputCls} min-h-[240px] resize-y text-[15px] leading-7`} value={rewriteText} onChange={(e) => setRewrite(e.target.value)} onPaste={blockPaste} onDrop={blockPaste} placeholder="첨삭을 참고해서 직접 타이핑해 주세요." lang="en" spellCheck={false} aria-label="Rewriting" />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{wordCount(rewriteText)}단어{rewriteDraft ? ` · 임시저장 ${rewriteDraft.savedAt}` : ''}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onSaveDraft('rewrite')}>임시저장</Button>
                    <Button onClick={onSubmitRewrite}>Rewriting 제출</Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}
      </PageContainer>
    </>
  )
}
