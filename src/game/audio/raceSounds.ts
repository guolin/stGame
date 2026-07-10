let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const AudioCtor =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return undefined;
  audioContext ??= new AudioCtor();
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

export function unlockRaceAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const oscillator = ctx.createOscillator();
  oscillator.connect(gain);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.01);
}

const C4_HZ = 261.63;
const C5_HZ = 523.25;

export function playCountdownBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const duration = 0.34;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.38, now + 0.02);
  gain.gain.setValueAtTime(0.38, now + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain.connect(ctx.destination);

  const oscillator = ctx.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(C4_HZ, now);
  oscillator.connect(gain);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

export function playStartHorn() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const duration = 0.7;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.56, now + 0.03);
  gain.gain.setValueAtTime(0.56, now + 0.42);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain.connect(ctx.destination);

  const oscillator = ctx.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(C5_HZ, now);
  oscillator.connect(gain);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

export function playFinishHorn() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const duration = 0.55;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.03);
  gain.gain.setValueAtTime(0.2, now + 0.36);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain.connect(ctx.destination);

  [260, 390].forEach((frequency) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + duration);
  });
}
