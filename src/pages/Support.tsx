import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageContainer, TitleBar } from '../components/Layout'
import { Badge, Button, Card, EmptyState, inputCls, toast } from '../components/ui'
import { FAQS } from '../lib/seed'
import { useStore } from '../lib/store'

const TABS = [
  ['notice', '공지사항'],
  ['faq', '자주 묻는 질문'],
  ['inquiry', '1:1 문의'],
] as const

export default function Support() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as 'notice' | 'faq' | 'inquiry') ?? 'notice'
  const notices = useStore((s) => s.notices)
  const [openNotice, setOpenNotice] = useState<string | null>(params.get('notice'))
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [inq, setInq] = useState<{ title: string; body: string; date: string }[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  return (
    <>
      <TitleBar title="고객센터" />
      <PageContainer>
        <div className="flex gap-1.5">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setParams(k === 'notice' ? {} : { tab: k })} className={`flex-1 rounded-t-2xl py-3.5 text-[15px] font-semibold ${tab === k ? 'bg-white text-brand-900' : 'bg-tab text-gray-800 hover:bg-[#bfcaef]'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="min-h-[360px] rounded-b-2xl bg-white p-6 shadow-[0_8px_30px_rgba(90,70,180,0.1)]">
          {tab === 'notice' && (
            <ul>
              {notices.map((n) => (
                <li key={n.id} className="border-b last:border-0">
                  <button type="button" className="flex w-full items-center justify-between py-4 text-left" onClick={() => setOpenNotice(openNotice === n.id ? null : n.id)}>
                    <span className="flex items-center gap-2">{n.isNew && <Badge tone="purple">신규</Badge>}{n.title}</span>
                    <span className="text-sm text-gray-500">{n.date}</span>
                  </button>
                  {openNotice === n.id && <div className="mb-4 whitespace-pre-line rounded-lg bg-gray-50 p-4 text-sm leading-7 text-gray-700">{n.body}</div>}
                </li>
              ))}
            </ul>
          )}
          {tab === 'faq' && (
            <ul>
              {FAQS.map((f, i) => (
                <li key={i} className="border-b last:border-0">
                  <button type="button" className="flex w-full items-center gap-3 py-4 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span className="font-bold text-brand-600">Q</span>{f.q}
                  </button>
                  {openFaq === i && <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm leading-7 text-gray-700"><b className="mr-2 text-emerald-600">A</b>{f.a}</div>}
                </li>
              ))}
            </ul>
          )}
          {tab === 'inquiry' && (
            <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1">
              <div>
                <h3 className="mb-3 font-semibold">문의하기</h3>
                <input className={`${inputCls} mb-2`} placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea className={`${inputCls} mb-3 h-40 resize-none`} placeholder="문의 내용을 입력해 주세요." value={body} onChange={(e) => setBody(e.target.value)} />
                <Button
                  onClick={() => {
                    if (!title.trim() || !body.trim()) return toast('제목과 내용을 입력해 주세요')
                    setInq([{ title, body, date: new Date().toLocaleDateString('ko-KR') }, ...inq])
                    setTitle('')
                    setBody('')
                    toast('문의가 접수되었습니다 (프로토타입: 실제로 전송되지 않아요)')
                  }}
                >
                  문의 등록
                </Button>
              </div>
              <div>
                <h3 className="mb-3 font-semibold">나의 문의 내역</h3>
                {inq.length === 0 ? <EmptyState kind="doc" title="문의 내역이 없어요." /> : (
                  <ul className="space-y-2">
                    {inq.map((q, i) => (
                      <li key={i} className="rounded-lg border p-3 text-sm"><div className="flex justify-between"><b>{q.title}</b><Badge tone="orange">답변 대기</Badge></div><p className="mt-1 text-gray-600">{q.body}</p><div className="mt-1 text-xs text-gray-400">{q.date}</div></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
        <Card className="mt-6 !p-4 text-center text-xs text-gray-500">운영시간 평일 09:00 ~ 18:00 (점심 12:00 ~ 13:00) · 이 화면은 프로토타입이며 실제 문의는 전송되지 않습니다.</Card>
      </PageContainer>
    </>
  )
}
