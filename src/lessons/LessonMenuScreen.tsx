import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "../app/navigation/FocusableButton";

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
    },
    {
      title: "启航 / 绕标规则",
      blurb: "选择讲解启航或绕标，旁边直接写清楚比赛判定规则",
      view: "lessonRaceFlow" as const
    }
  ];

  return (
    <main className="demo-screen">
      <section className="demo-panel wide">
        <p className="eyebrow">讲解模式</p>
        <h1>讲清楚船为什么这样走，规则怎么判</h1>
        <div className="home-entries lesson-entries">
          {lessons.map((lesson, index) => (
            <FocusableButton key={lesson.view} type="button" onClick={() => setView(lesson.view)} autoFocus={index === 0}>
              <strong>{lesson.title}</strong>
              <span>{lesson.blurb}</span>
            </FocusableButton>
          ))}
        </div>
        <div className="demo-actions">
          <FocusableButton type="button" onClick={() => setView("home")}>
            返回首页
          </FocusableButton>
        </div>
      </section>
    </main>
  );
}
