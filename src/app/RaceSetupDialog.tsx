import { useMemo } from "react";
import { COURSE_IDS, getCourse } from "../sim/course/courses";
import type { CourseId } from "../sim/course/types";
import type { WindZoneCount } from "../sim/environment";
import { useGameStore } from "../store/gameStore";
import { FocusableButton } from "./navigation/FocusableButton";

type RaceSetupDialogProps = {
  onClose: () => void;
};

export function RaceSetupDialog({ onClose }: RaceSetupDialogProps) {
  const setBoatCount = useGameStore((state) => state.setBoatCount);
  const setCourse = useGameStore((state) => state.setCourse);
  const setWindZoneCount = useGameStore((state) => state.setWindZoneCount);
  const startRace = useGameStore((state) => state.startRace);
  const activeBoatIds = useGameStore((state) => state.activeBoatIds);
  const course = useGameStore((state) => state.course);
  const windZoneCount = useGameStore((state) => state.windZoneCount);

  const selectedCourseId = useMemo<CourseId>(() => (COURSE_IDS.includes(course.id) ? course.id : COURSE_IDS[0]), [course.id]);
  const beginRace = () => {
    setCourse(selectedCourseId);
    startRace();
    onClose();
  };

  return (
    <div className="modal-scrim" role="presentation">
      <section className="race-setup-modal" role="dialog" aria-modal="true" aria-labelledby="race-setup-title">
        <p className="eyebrow">比赛设置</p>
        <h2 id="race-setup-title">选择人数和航线</h2>
        <p className="modal-copy">风摆、风区、真风和自动裁判已固定开启；水流关闭。手柄会自动检测，键盘始终可兜底。</p>

        <div className="setup-block">
          <strong>船数</strong>
          <div className="segmented-options">
            {[1, 2, 4].map((count) => (
              <FocusableButton key={count} type="button" className={activeBoatIds.length === count ? "selected" : ""} onClick={() => setBoatCount(count)}>
                {count} 船
              </FocusableButton>
            ))}
          </div>
        </div>

        <div className="setup-block">
          <strong>航线</strong>
          <div className="course-options compact">
            {COURSE_IDS.map((id) => {
              const def = getCourse(id);
              return (
                <FocusableButton key={id} type="button" className={selectedCourseId === id ? "selected" : ""} onClick={() => setCourse(id)}>
                  <span>{def.name}</span>
                  <em>{def.description}</em>
                </FocusableButton>
              );
            })}
          </div>
        </div>

        <div className="setup-block">
          <strong>风区</strong>
          <div className="segmented-options">
            {([1, 3, 9] as WindZoneCount[]).map((count) => (
              <FocusableButton
                key={count}
                type="button"
                className={windZoneCount === count ? "selected" : ""}
                onClick={() => setWindZoneCount(count)}
              >
                {count} 区
              </FocusableButton>
            ))}
          </div>
        </div>

        <div className="control-cheatsheet">
          <strong>键盘兜底</strong>
          <span>红 A/D</span>
          <span>绿 ←/→</span>
          <span>黄 J/L</span>
          <span>蓝 小键盘 4/6</span>
          <span>Space 暂停</span>
          <span>右侧 ↻ 重开</span>
        </div>

        <div className="modal-actions">
          <FocusableButton type="button" className="accent" onClick={beginRace} autoFocus>
            开始倒计时
          </FocusableButton>
          <FocusableButton type="button" onClick={onClose}>
            取消
          </FocusableButton>
        </div>
      </section>
    </div>
  );
}
