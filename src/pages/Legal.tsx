import { PageContainer, TitleBar } from '../components/Layout'
import { Card } from '../components/ui'

const CONTENT = {
  privacy: {
    title: '개인정보처리방침',
    sections: [
      ['1. 수집하는 개인정보', '서비스 이용을 위해 선생님의 이름, 소속 학교, 담당 교과와 평가 대상 학생의 학년·반·번호·이름을 처리합니다.'],
      ['2. 이용 목적', '평가 설계, 과제물 관리, AI 채점 보조 및 평가 리포트 제공을 위해서만 이용합니다.'],
      ['3. 보유 및 이용 기간', '수업 종료 후 학교가 정한 기간 동안 보관하며, 기간이 지나면 지체 없이 파기합니다.'],
      ['4. 안전성 확보 조치', '접근 권한 관리와 전송 구간 암호화 등 필요한 보호 조치를 시행합니다.'],
    ],
  },
  terms: {
    title: '이용약관',
    sections: [
      ['제1조 (목적)', '이 약관은 UTOP AI Writing 서비스의 이용과 관련하여 서비스와 이용자의 권리·의무를 정하는 것을 목적으로 합니다.'],
      ['제2조 (서비스 내용)', '평가 설계, 과제물 관리, AI 채점 보조, 평가 리포트 등 서·논술형 평가를 지원하는 기능을 제공합니다.'],
      ['제3조 (AI 채점의 한계)', 'AI 채점은 선생님을 보조하는 참고 자료이며, 채점의 최종 판단과 책임은 선생님에게 있습니다.'],
      ['제4조 (이용자의 의무)', '이용자는 평가 대상 학생의 개인정보를 관련 법령에 따라 안전하게 관리하여야 합니다.'],
    ],
  },
} as const

export default function Legal({ kind }: { kind: keyof typeof CONTENT }) {
  const c = CONTENT[kind]
  return (
    <>
      <TitleBar title={c.title} />
      <PageContainer>
        <Card className="!p-8">
          <p className="mb-6 text-xs text-gray-400">※ 예시 문구입니다. 실제 서비스 적용 시 교체해 주세요.</p>
          {c.sections.map(([h, t]) => (
            <section key={h} className="mb-6">
              <h3 className="mb-1.5 font-semibold">{h}</h3>
              <p className="text-sm leading-7 text-gray-700">{t}</p>
            </section>
          ))}
        </Card>
      </PageContainer>
    </>
  )
}
