import type { StudentScore, Submission } from '../../lib/types'

export type TaskState = 'todo' | 'submitted' | 'rewrite' | 'done'

/** 학생 입장에서의 과제 진행 단계 */
export function taskState(sub: Submission | undefined, sc: StudentScore | undefined): TaskState {
  if (sc?.rewrite) return 'done'
  if (sc?.reportSentAt) return 'rewrite'
  return sub ? 'submitted' : 'todo'
}

export const STATE_LABEL: Record<TaskState, { text: string; tone: 'red' | 'blue' | 'orange' | 'green'; hint: string }> = {
  todo: { text: '답안 작성 전', tone: 'red', hint: '답안을 작성해서 제출해 주세요' },
  submitted: { text: '제출 완료', tone: 'blue', hint: '선생님이 채점 중이에요' },
  rewrite: { text: 'Rewriting 필요', tone: 'orange', hint: '리포트가 도착했어요. 첨삭을 보고 다시 써서 제출해 주세요' },
  done: { text: 'Rewriting 제출 완료', tone: 'green', hint: '모든 과정을 마쳤어요' },
}
