/** 중학교 영어 교과서 단원 데이터. 화면에는 단원명만 노출하고, 나머지는 과제 생성 시 참고 자료로 보관합니다. */
export interface TextbookTopic {
  title: string
  desc: string
}

export interface TextbookUnit {
  id: string
  /** 'Unit 1' / 'Special Reading 1' 등 */
  label: string
  title: string
  /** 의사소통 기능 */
  communicate: string[]
  /** 읽기 */
  read: TextbookTopic
  /** 언어 형식 */
  languageUse: string[]
  /** Think and Write */
  thinkAndWrite: TextbookTopic
  /** 프로젝트 */
  project: TextbookTopic
}

export interface TextbookSpecial {
  id: string
  label: string
  title: string
  desc: string
}

export interface Textbook {
  id: string
  name: string
  grade: number
  units: TextbookUnit[]
  specials: TextbookSpecial[]
}

const u = (
  n: number,
  title: string,
  communicate: string[],
  read: [string, string],
  languageUse: string[],
  think: [string, string],
  project: [string, string],
): TextbookUnit => ({
  id: `u${n}`,
  label: `Unit ${n}`,
  title,
  communicate,
  read: { title: read[0], desc: read[1] },
  languageUse,
  thinkAndWrite: { title: think[0], desc: think[1] },
  project: { title: project[0], desc: project[1] },
})

export const MIDDLE_ENGLISH_TEXTBOOKS: Textbook[] = [
  {
    id: 'eng1',
    name: '영어 1',
    grade: 1,
    units: [
      u(1, 'Are You Ready?', ['자기소개하기', '좋아하는 것 묻고 답하기'], ["What's in Your School Survival Kit?", '새 학기의 긴장감을 덜어 주는 꾸러미 소개'], ['be동사', '일반동사'], ['My School Life', '학교생활에 대한 글 쓰기'], ['Our Dream School', "'꿈의 학교' 소책자 만들기"]),
      u(2, 'My Happy Life', ['날씨 묻고 답하기', '행동 묘사하기'], ['Then and Now', '90년대 중학생과 현재 중학생의 일상생활 비교'], ['현재 진행형', 'There is/are 구문'], ['Find the Differences', '가족사진을 묘사하는 글 쓰기'], ['Make Your Own Emoji', '일과를 나타내는 이모지 만들기']),
      u(3, 'Be Open to Differences', ['도움 요청하기', '감정이나 상태 묻고 답하기'], ['We Have a Cat on Our Team!', '새 팀원을 받아들이는 태도에 관한 우화'], ['과거 시제', '조동사 can'], ['A Thank You Card', '고마운 사람에게 감사 카드 쓰기'], ['Rap About School', '학교에 관한 랩 음악 만들기']),
      u(4, "Let's Travel Together!", ['길 묻고 답하기', '희망·기대 표현하기'], ['Plan B Was Great, Too!', '생신을 맞은 할머니를 위한 가족 여행기'], ['명사 역할을 하는 동명사', '조동사 will'], ['My Trip Style', '여행 스타일을 소개하는 글 쓰기'], ['Show Your Town', '우리 동네 여행 지도 만들기']),
      u(5, 'Think Green, Live Green', ['계획 묻고 답하기', '제안하고 답하기'], ['Small Actions, Big Change', 'Zero-waste 운동에 도전한 경험을 쓴 일기'], ['목적어가 두 개인 동사', '조동사 should'], ['Class Rules', '학급 쓰레기를 줄이기 위한 규칙 쓰기'], ['Market Day at School', '학급 바자회를 위한 광고 포스터 만들기']),
      u(6, 'Dear Future Me', ['바람·소원 묻고 답하기', '관심사 묻고 답하기'], ['Who Do I Want to Be?', '장래 희망을 고민하는 중학생 이야기'], ['동사의 목적어로 쓰이는 to부정사', '때를 나타내는 접속사 when'], ['My Future Self', '미래의 자신을 소개하는 글 쓰기'], ['Message About Life', '좌우명 책갈피 만들기']),
      u(7, 'You Know What?', ['알고 있는지 묻기', '궁금증 표현하기'], ['Amazing Facts About the World', '학교 퀴즈 쇼 결승전'], ['비교급', '최상급'], ["World's Top Roller Coasters", '그래프를 설명하는 글 쓰기'], ['Group Records', '최고 기록을 세운 모둠원 선발하기']),
    ],
    specials: [
      { id: 'sr1', label: 'Special Reading 1', title: 'The World of Picasso', desc: '피카소의 삶과 그림 스타일을 소개하는 설명문' },
      { id: 'sr2', label: 'Special Reading 2', title: 'The King with Donkey Ears', desc: '당나귀 귀를 가진 왕이 자신의 콤플렉스를 극복하는 과정을 담은 연극 대본' },
    ],
  },
  {
    id: 'eng2',
    name: '영어 2',
    grade: 2,
    units: [
      u(1, 'Your Answers Here', ['조언 구하고 답하기', '기원하기'], ['Looking for Advice', '동아리, 반려동물과 관련된 고민과 답글 읽기'], ['주격 관계대명사', 'something+형용사'], ['My Goals', '올해 목표를 설명하는 글 쓰기'], ['Fortune Cookie', '쪽지를 넣어 종이 포춘쿠키 만들기']),
      u(2, "Let's Taste the World", ['사실 확인하기', '정보 수정하기'], ['Food Brings the World Together', '여러 나라 학생들이 소개하는 축제와 축제 음식에 대한 글 읽기'], ['목적격 관계대명사', '목적을 나타내는 to부정사'], ['Create Your Own Festival', '축제 홍보문 쓰기'], ['Enjoy the Yogurt Party!', '요구르트 디저트 레시피 노트 만들기']),
      u(3, 'An Eye for Art', ['선호 묻고 답하기', '이유 묻고 답하기'], ['Manet and Monet', '이름이 비슷한 두 화가 마네와 모네의 그림 스타일에 대한 글 읽기'], ['수동태', '접속사 if'], ['Interesting Artwork', '예술 작품 소개하는 글 쓰기'], ['Class T-shirt Design', '학급 티셔츠 디자인하기']),
      u(4, 'Healthy, Smart Life', ['허락 구하기', '당부하기'], ['Do You Have Popcorn Brain?', '여러 가지 일을 동시에 해서 생기는 팝콘 브레인 증상에 관한 글 읽기'], ['ask/want/tell+목적어+to부정사', 'It ~ to부정사'], ['My App Review', '앱 사용 후기 쓰기'], ['Song About Healthy Habits', '건강한 생활 습관에 대한 노래 만들기']),
      u(5, 'Discover Korea', ['경험 묻고 답하기', '소감 묻고 답하기'], ['My Hometown, Chuncheon', '춘천의 에티오피아 한국전 참전 기념관에 관한 글 읽기'], ['형용사 역할을 하는 to부정사', '현재완료'], ['My Trip Story', '기행문 쓰기'], ['Our Local Character', '우리 동네 캐릭터 만들기']),
      u(6, 'Ready, Set, Go!', ['능력 여부 묻기', '절차 말하기'], ['My First Skateboarding Lesson', '일일 스케이트보드 수업을 들은 학생의 경험담 읽기'], ['see/hear+목적어+-ing형/동사원형', 'make/have/let+목적어+동사원형'], ['Fun Class Review', '재미있었던 수업 후기 쓰기'], ['Design Your Skateboard', '스케이트보드 템플릿 만들기']),
      u(7, 'Amazing Animals', ['외모 묘사하기', '정보 요청하기'], ['Animals in Cold Places', '추위를 견디며 살아가는 동물들에 관한 글 읽기'], ['so ~ that ...', '명사를 꾸미는 분사'], ['My Favorite Movie', '좋아하는 영화 소개하는 글 쓰기'], ['Save the Animals', '멸종 위기 동물을 보호하기 위한 포스터 만들기']),
      u(8, 'Clever Spending', ['불만 표현하기', '요청하기'], ['Comparing Prices', '서로 다른 세 가지 여행 상품의 가격을 비교하는 글 읽기'], ['간접의문문', '의문사+to부정사'], ['Interview with a Friend', '친구를 인터뷰한 글 쓰기'], ['Smart Spending Tips', '합리적 소비 방법에 대한 발표 자료 만들기']),
    ],
    specials: [{ id: 'sr1', label: 'Special Reading', title: 'Where Is My Home?', desc: '살고 있던 나무가 크리스마스트리용으로 베어지면서 뉴욕으로 따라오게 된 올빼미 이야기 읽기' }],
  },
  {
    id: 'eng3',
    name: '영어 3',
    grade: 3,
    units: [
      u(1, 'A Better World for All', ['도움 제안하기', '감사 표현하기'], ['Our Volunteer Adventures', '두 학생의 봉사 활동 경험을 담은 글 읽기'], ['강조의 do/does/did', 'It is/was ~ that ...'], ['Volunteer Application', '봉사 활동 지원서 쓰기'], ['Kindness Creators', '봉사 활동 참여를 권하는 배지 디자인하기']),
      u(2, 'Outside the Box', ['의견 표현하기', '동의하기'], ['Zaha Hadid, the Queen of the Curve', '창의적인 건축가 자하 하디드에 관한 글 읽기'], ['명사를 뒤에서 꾸미는 분사구', '과거완료'], ['My Creative Hero', '창의적인 인물을 소개하는 글 쓰기'], ['Our Dream House', '짓고 싶은 집 디자인하기']),
      u(3, 'How Our Bodies Work', ['보고·진술하기', '놀람 표현하기'], ['Flavor and the Senses', '음식을 먹을 때 우리의 감각이 관여하는 방식을 설명한 글 읽기'], ['접속사 even though', '관계부사'], ['Behind the Words', '신체 관련 관용어를 설명하는 글 쓰기'], ['Believe It or Not!', '신체를 이용한 착시 사진 작품 만들기']),
      u(4, 'Mountains to Oceans', ['권유하기', '기대 표현하기'], ['My Hawaiian Diary', '하와이 여행 경험을 담은 일기 읽기'], ['접속사 since', '관계대명사 what'], ['My Own Tour', '여행 상품을 홍보하는 글 쓰기'], ['Raise Your Flag', '세우고 싶은 나라의 국기 디자인하기']),
      u(5, 'More Than Just a Story', ['추천 요청하기', '생각할 시간 요청하기'], ['Fish in a Tree', '난독증을 가진 소녀의 이야기를 다룬 문학 작품 읽기'], ['to부정사구의 의미상 주어', '현재완료 진행형'], ['My Book Review', '독후감 쓰기'], ['Design a Book Cover', '책 표지 새로 만들기']),
      u(6, 'Technology in Our Lives', ['주제 소개하기', '궁금증 표현하기'], ['Living with AI', 'AI가 긍정적으로 사용되는 사례를 다룬 학생 발표문 읽기'], ['분사구문', 'the + 비교급 ~, the + 비교급 ...'], ['My Opinion Essay', '자신의 입장을 주장하는 글 쓰기'], ['My AI Promises', 'AI 사용 서약서 작성하기']),
      u(7, 'One World, Many Cultures', ['의도 표현하기', '강조하기'], ['What We Find in Names', '여러 나라의 이름 짓는 방식에 관한 글 읽기'], ['명사, who/which ~', 'if/whether + 주어 + 동사'], ['Talchum', '탈춤을 소개하는 글 쓰기'], ['A Journey in Traditional Clothes', '전통 의상을 소개하는 카드 만들기']),
      u(8, 'A Greener Tomorrow', ['금지하기', '후회 표현하기'], ['Nature Needs a Helping Hand', '생물 다양성을 위한 여러 가지 노력을 소개하는 글 읽기'], ['접속사 so that', '가정법 과거'], ['What Would Happen?', '자신에게 없어서는 안 될 물건에 관한 글 쓰기'], ['Short Videos for Our Earth', '환경 오염 문제에 관한 영상 만들기']),
    ],
    specials: [
      { id: 'sp1', label: 'Special Project 1', title: 'Our Classroom Memories', desc: '한 해 동안의 여러 가지 이야기 쓰고 발표하기' },
      { id: 'sp2', label: 'Special Project 2', title: 'In 20 Years', desc: '20년 후 자신의 모습을 상상한 만화 그리기' },
    ],
  },
]

/** 학교급·교과에 해당하는 교과서 목록 (현재는 중학교 영어만 제공) */
export function textbooksFor(subject: string, level: string): Textbook[] {
  return level === '중' && subject === '영어' ? MIDDLE_ENGLISH_TEXTBOOKS : []
}

export interface UnitOption {
  id: string
  label: string
}

export function unitOptions(tb: Textbook): UnitOption[] {
  return [
    ...tb.units.map((x) => ({ id: x.id, label: `${x.label}. ${x.title}` })),
    ...tb.specials.map((x) => ({ id: x.id, label: `${x.label}. ${x.title}` })),
  ]
}

/** 선택한 단원의 참고 데이터 (과제 생성 시 활용) */
export function findUnit(textbookId?: string, unitId?: string): TextbookUnit | TextbookSpecial | undefined {
  const tb = MIDDLE_ENGLISH_TEXTBOOKS.find((t) => t.id === textbookId)
  return tb?.units.find((x) => x.id === unitId) ?? tb?.specials.find((x) => x.id === unitId)
}
