import { useGameStore } from "../store/gameStore";

export function LessonMenuScreen() {
  const setView = useGameStore((state) => state.setView);

  const lessons = [
    {
      title: "船只运行逻辑",
      blurb: "风角实验台：拖动舵杆，看极曲线上的光点实时移动，体验禁航角和水流",
      view: "lessonBoat" as const
    },
    {
      title: "风摆",
      blurb: "持续风摆 vs 钟摆式风摆：两条船分走两边，亲眼看到航线差距",
      view: "lessonWind" as const
    },
    {
      title: "比赛规则 · 你来当裁判",
      blurb: "两船相遇前自动暂停，你来判谁避让，再看自动裁判揭晓",
      view: "lessonRules" as const
    }
  ];

  return (
    <main className="demo-screen">
      <section className="demo-panel wide">
        <p className="eyebrow">讲解模式</p>
        <h1>讲清楚船为什么这样走，规则怎么判</h1>
        <div className="home-entries lesson-entries">
          {lessons.map((lesson) => (
            <button key={lesson.view} type="button" onClick={() => setView(lesson.view)}>
              <strong>{lesson.title}</strong>
              <span>{lesson.blurb}</span>
            </button>
          ))}
          <button type="button" onClick={() => setView("setup")}>
            <strong>去比赛</strong>
            <span>学完了？选人数、场地开一局</span>
          </button>
        </div>
        <div className="demo-actions">
          <button type="button" onClick={() => setView("home")}>
            返回首页
          </button>
        </div>
      </section>
    </main>
  );
}
