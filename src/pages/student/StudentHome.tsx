import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/Layout'
import { Badge, Card, EmptyState } from '../../components/ui'
import { taskTitle } from '../../lib/problemGen'
import { useSession } from '../../lib/session'
import { useStore } from '../../lib/store'
import type { Design } from '../../lib/types'
import { STATE_LABEL, taskState } from './taskState'

export default function StudentHome() {
  const me = useSession((s) => s.user)
  const designs = useStore((s) => s.designs)
  const submissions = useStore((s) => s.submissions)
  const scores = useStore((s) => s.scores)
  const drafts = useStore((s) => s.drafts)
  const mine: Design[] = designs.filter((d) => d.status === 'saved' && !!me && d.targetIds.includes(me.accountId))

  return (
    <PageContainer>
      <h2 className="mb-4 text-xl font-semibold">📝 나의 과제</h2>
      <Card>
        {mine.length === 0 ? (
          <EmptyState kind="doc" title="배정된 과제가 없어요." desc="선생님이 과제를 배정하면 여기에 나타나요." />
        ) : (
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            {mine.map((d) => {
              const key = `${d.id}:${me!.accountId}`
              const st = taskState(submissions[key], scores[key])
              const l = STATE_LABEL[st]
              return (
                <Link key={d.id} to={`/student/tasks/${d.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <Badge tone="orange">{d.subject}</Badge>
                    <Badge tone={l.tone}>{l.text}</Badge>
                    {(drafts?.[`${key}:answer`] || drafts?.[`${key}:rewrite`]) && <Badge tone="gray">임시저장 있음</Badge>}
                  </div>
                  <div className="text-[17px] font-semibold">{taskTitle(d)}</div>
                  <div className="mt-1 text-xs text-gray-500">{d.problem?.format}</div>
                  <div className="mt-3 text-[13px] text-gray-600">{l.hint}</div>
                </Link>
              )
            })}
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
