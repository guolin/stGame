/**
 * 介绍轮播的两页简笔画漫画（教练故事）。
 * 分镜约定：
 *  - 第一页唯一的文字是教练的喊话气泡；学员的懵脸是视觉焦点。
 *  - 第二页无任何文字；教练是唯一的正面角色，团队只画背影。
 *  - 琥珀色只用于"教练的声音"（气泡/喇叭），其余全部浅青线稿。
 */

const INK = "#dff7ff";
const INK_SOFT = "#9fd2e8";
const ACCENT = "#ffe082";
const HULL_FILL = "rgba(6, 36, 58, 0.72)";
const SILHOUETTE = "rgba(159, 210, 232, 0.28)";

export function ComicShoutPanel() {
  return (
    <svg className="intro-comic" viewBox="0 0 920 480" role="img" aria-label="漫画：教练在远处的小艇上喊“风摆了，快转！”，帆船甲板上的学员一脸疑惑">
      {/* 海平线与浪花 */}
      <line x1="0" y1="225" x2="920" y2="225" stroke={INK_SOFT} strokeWidth="2" opacity="0.4" />
      <g stroke={INK_SOFT} strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round">
        <path d="M250 292 q18 -12 36 0" />
        <path d="M360 330 q18 -12 36 0" />
        <path d="M180 364 q18 -12 36 0" />
        <path d="M470 268 q18 -12 36 0" />
        <path d="M120 300 q18 -12 36 0" />
      </g>

      {/* 远处的教练艇（小） */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M95 212 L185 212 L173 232 L107 232 Z" fill={HULL_FILL} stroke={INK} strokeWidth="2.5" />
        <line x1="160" y1="212" x2="160" y2="198" stroke={INK} strokeWidth="2.5" />
        <line x1="152" y1="198" x2="168" y2="198" stroke={INK} strokeWidth="2.5" />
        {/* 教练：举着喇叭喊话 */}
        <circle cx="138" cy="183" r="8" fill="none" stroke={INK} strokeWidth="2.5" />
        <line x1="138" y1="191" x2="138" y2="212" stroke={INK} strokeWidth="2.5" />
        <line x1="138" y1="196" x2="158" y2="181" stroke={INK} strokeWidth="2.5" />
        <line x1="138" y1="199" x2="124" y2="207" stroke={INK} strokeWidth="2.5" />
        <polygon points="158,181 174,172 174,188" fill={ACCENT} />
        {/* 尾流 */}
        <line x1="66" y1="228" x2="90" y2="228" stroke={INK_SOFT} strokeWidth="2" opacity="0.5" />
        <line x1="56" y1="236" x2="84" y2="236" stroke={INK_SOFT} strokeWidth="2" opacity="0.5" />
      </g>

      {/* 喊话气泡：全页唯一的文字 */}
      <g>
        <rect x="180" y="80" width="256" height="60" rx="16" fill={ACCENT} />
        <polygon points="216,138 238,138 196,172" fill={ACCENT} />
        <text x="308" y="121" textAnchor="middle" fontSize="32" fontWeight="800" fill="#06243a">
          风摆了，快转！
        </text>
      </g>

      {/* 近景学员帆船（大） */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M520 400 L850 400 Q846 442 800 448 L570 448 Q528 436 520 400 Z" fill={HULL_FILL} stroke={INK} strokeWidth="3.5" />
        <line x1="660" y1="400" x2="660" y2="130" stroke={INK} strokeWidth="3.5" />
        <path d="M662 142 Q738 252 788 370 L662 382 Z" fill="rgba(223, 247, 255, 0.1)" stroke={INK} strokeWidth="3" />
        <line x1="660" y1="386" x2="790" y2="374" stroke={INK} strokeWidth="3" />
      </g>

      {/* 学员 A：歪头摊手 */}
      <g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="590" cy="318" r="15" />
        <circle cx="585" cy="315" r="1.6" fill={INK} />
        <circle cx="596" cy="315" r="1.6" fill={INK} />
        <path d="M583 326 q3.5 -3.5 7 0 q3.5 3.5 7 0" />
        <line x1="590" y1="333" x2="590" y2="372" />
        <polyline points="590,342 574,356 566,352" />
        <polyline points="590,342 606,354 614,350" />
        <line x1="590" y1="372" x2="580" y2="400" />
        <line x1="590" y1="372" x2="600" y2="400" />
      </g>

      {/* 学员 B：张嘴冒汗（站在帆右侧的船尾） */}
      <g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="815" cy="312" r="15" />
        <circle cx="810" cy="309" r="1.6" fill={INK} />
        <circle cx="821" cy="309" r="1.6" fill={INK} />
        <circle cx="815" cy="321" r="3.5" />
        <line x1="815" y1="327" x2="815" y2="370" />
        <polyline points="815,338 797,348 789,344" />
        <polyline points="815,338 833,348 841,344" />
        <line x1="815" y1="370" x2="805" y2="400" />
        <line x1="815" y1="370" x2="825" y2="400" />
      </g>
      <path d="M839 294 q7 9 0 14 q-7 -5 0 -14" fill={INK_SOFT} />

      {/* 头顶问号：懵 */}
      <text x="612" y="290" fontSize="46" fontWeight="800" fill={INK_SOFT} transform="rotate(-8 612 290)">?</text>
      <text x="848" y="280" fontSize="38" fontWeight="800" fill={INK_SOFT} transform="rotate(10 848 280)">?</text>
    </svg>
  );
}

export function ComicSeekPanel() {
  return (
    <svg className="intro-comic" viewBox="0 0 920 480" role="img" aria-label="漫画：苦恼的教练来找我们团队">
      {/* 地面 */}
      <line x1="0" y1="420" x2="920" y2="420" stroke={INK_SOFT} strokeWidth="2" opacity="0.35" />

      {/* 教练：正面、苦恼、朝团队走去 */}
      <g stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="280" cy="150" r="36" />
        {/* 愁眉（内端上挑） */}
        <line x1="262" y1="145" x2="274" y2="138" />
        <line x1="298" y1="145" x2="286" y2="138" />
        <circle cx="272" cy="153" r="2.2" fill={INK} />
        <circle cx="288" cy="153" r="2.2" fill={INK} />
        {/* 撇嘴 */}
        <path d="M268 170 q12 -9 24 0" />
        {/* 身体 */}
        <line x1="280" y1="186" x2="280" y2="300" />
        {/* 一手挠头，一手拎着帽子 */}
        <polyline points="280,212 246,190 252,158" />
        <polyline points="280,212 308,262" />
        <path d="M300 268 q12 -11 24 0" />
        {/* 迈步向右 */}
        <polyline points="280,300 304,360 300,394 316,394" />
        <polyline points="280,300 256,360 250,394 264,394" />
      </g>
      {/* 汗滴 + 身后的动势线 */}
      <path d="M330 122 q9 11 0 17 q-9 -6 0 -17" fill={INK_SOFT} />
      <g stroke={INK_SOFT} strokeWidth="2.5" opacity="0.4" strokeLinecap="round">
        <line x1="196" y1="240" x2="224" y2="240" />
        <line x1="186" y1="282" x2="210" y2="282" />
      </g>

      {/* 团队：只画背影，围着一台笔记本 */}
      <rect x="690" y="268" width="72" height="50" rx="6" fill={SILHOUETTE} />
      <rect x="580" y="330" width="280" height="12" fill="rgba(159, 210, 232, 0.35)" />
      <line x1="600" y1="342" x2="600" y2="420" stroke={INK_SOFT} strokeWidth="2.5" opacity="0.5" />
      <line x1="840" y1="342" x2="840" y2="420" stroke={INK_SOFT} strokeWidth="2.5" opacity="0.5" />
      <g fill={SILHOUETTE}>
        <circle cx="640" cy="310" r="18" />
        <path d="M614 400 Q614 332 640 328 Q666 332 666 400 Z" />
        <circle cx="720" cy="300" r="19" />
        <path d="M692 400 Q692 324 720 320 Q748 324 748 400 Z" />
        <circle cx="800" cy="312" r="17" />
        <path d="M776 400 Q776 336 800 332 Q824 336 824 400 Z" />
      </g>
    </svg>
  );
}
