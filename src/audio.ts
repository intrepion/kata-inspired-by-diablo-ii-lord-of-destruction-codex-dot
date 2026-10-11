let context: AudioContext | null = null;
let enabled = true;
export function setSound(on: boolean) {
  enabled = on;
  if (!on) void context?.suspend();
  else void context?.resume();
}
export function sound(kind: "strike" | "nova" | "loot" | "hurt" | "click") {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const now = context.currentTime;
    const osc = context.createOscillator(),
      gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);
    const freq = { strike: 130, nova: 260, loot: 680, hurt: 75, click: 360 }[
      kind
    ];
    osc.type = kind === "loot" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(
      kind === "loot" ? freq * 1.7 : freq * 0.4,
      now + 0.2,
    );
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    /* Audio is optional on unsupported browsers. */
  }
}
