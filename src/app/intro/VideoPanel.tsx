import { useRef, useState } from "react";

/** 介绍轮播里的视频面板：不自动播放，点播放键或视频本身开始/暂停。 */
export function IntroVideoPanel({ src, label }: { src: string; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="intro-video-wrap">
      <video
        ref={videoRef}
        className="intro-comic"
        src={src}
        loop
        playsInline
        aria-label={label}
        onClick={toggle}
      />
      {!playing && (
        <button type="button" className="intro-video-play" onClick={toggle} aria-label="播放视频">
          ▶
        </button>
      )}
    </div>
  );
}
