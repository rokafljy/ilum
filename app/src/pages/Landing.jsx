import { Link } from "react-router-dom";
import { Button, Logo } from "../components/ui/index.jsx";

const FEATURES = [
  {
    icon: "✅",
    title: "승인 워크플로우",
    desc: "품의서·회의록·지출결과서를 제출부터 승인까지 한 흐름으로. 반려 사유와 이력이 모두 기록됩니다.",
  },
  {
    icon: "🧾",
    title: "정산 증빙 자동화",
    desc: "검수확인서·출장보고서·강의보고서까지 정식 양식 PDF로 자동 생성, 팀별 일괄 다운로드.",
  },
  {
    icon: "🏦",
    title: "통장내역 자동 대조",
    desc: "통장 엑셀을 올리면 지출 내역과 자동 매칭. 정산 검증 시간을 며칠에서 몇 분으로.",
  },
  {
    icon: "📊",
    title: "실시간 운영 현황",
    desc: "팀별 집행률, 멘토링 진도, 조치가 필요한 항목을 대시보드 한 화면에서 파악.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
        <Logo />
        <Link to="/login">
          <Button variant="secondary" size="sm">로그인</Button>
        </Link>
      </header>

      <main>
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <p className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[13px] font-semibold mb-6">
            청년일경험사업 통합운영 솔루션
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] text-ink-900">
            일경험 사업 운영,
            <br />
            <span className="text-brand-600">서류가 아니라 청년</span>에 집중하세요
          </h1>
          <p className="mt-6 text-lg text-ink-500 max-w-xl mx-auto">
            팀 관리부터 승인, 증빙, 정산 대조까지 —
            운영기관의 모든 행정 업무를 하나의 흐름으로 만듭니다.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg">시작하기</Button>
            </Link>
          </div>
        </section>

        <section className="bg-ink-50 py-20">
          <div className="max-w-5xl mx-auto px-6 grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-card shadow-card border border-ink-100 p-6">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 font-bold text-ink-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-10 text-sm text-ink-400 flex items-center justify-between">
        <Logo size="sm" className="opacity-60" />
        <span>© 2026 일움</span>
      </footer>
    </div>
  );
}
