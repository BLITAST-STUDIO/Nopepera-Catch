export type AudioBus = {
  unlock: () => void;
  toggleMute: () => boolean;
  getMuted: () => boolean;
  catch: (grade: "perfect" | "good" | "ok" | "weird" | "miss") => void;
  miss: () => void;
  whiff: () => void;
  round: () => void;
  complete: () => void;
  result: () => void;
  tick: () => void;
};

export function createAudio(): AudioBus {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let sfx: GainNode | null = null;
  let muted = false;
  let stored = false;

  try {
    stored = localStorage.getItem("noppera-muted") === "1";
    muted = stored;
  } catch {
    /* ignore */
  }

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.connect(master);
    master.connect(ctx.destination);
    master.gain.value = muted ? 0 : 1;
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  function env(duration: number, peak = 0.18) {
    if (!ctx || !sfx) return null;
    const g = ctx.createGain();
    g.connect(sfx);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    return { g, t };
  }

  function tone(freq: number, duration: number, type: OscillatorType, peak = 0.16, detune = 0) {
    if (!ctx || !sfx) return;
    const e = env(duration, peak);
    if (!e) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq * (0.97 + Math.random() * 0.06);
    o.detune.value = detune;
    o.connect(e.g);
    o.start(e.t);
    o.stop(e.t + duration);
    o.onended = () => {
      o.disconnect();
      e.g.disconnect();
    };
  }

  function noise(duration: number, peak = 0.08) {
    if (!ctx || !sfx) return;
    const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = n;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    const e = env(duration, peak);
    if (!e) return;
    src.connect(f);
    f.connect(e.g);
    src.start(e.t);
    src.stop(e.t + duration);
    src.onended = () => {
      src.disconnect();
      f.disconnect();
      e.g.disconnect();
    };
  }

  return {
    unlock() {
      resume();
    },
    toggleMute() {
      ensure();
      muted = !muted;
      if (master) {
        const t = ctx!.currentTime;
        master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.03);
      }
      try {
        localStorage.setItem("noppera-muted", muted ? "1" : "0");
      } catch {
        /* ignore */
      }
      return muted;
    },
    getMuted() {
      return muted;
    },
    catch(grade) {
      resume();
      if (grade === "perfect") {
        tone(660, 0.16, "triangle", 0.18);
        tone(990, 0.22, "sine", 0.1);
      } else if (grade === "good") {
        tone(520, 0.14, "triangle", 0.16);
        tone(780, 0.18, "sine", 0.08);
      } else if (grade === "ok") {
        tone(392, 0.14, "triangle", 0.14);
      } else if (grade === "weird") {
        tone(220, 0.18, "sine", 0.12);
        noise(0.12, 0.04);
      }
    },
    miss() {
      resume();
      tone(110, 0.22, "sawtooth", 0.07);
      noise(0.18, 0.06);
    },
    whiff() {
      resume();
      noise(0.06, 0.03);
      tone(180, 0.08, "square", 0.04);
    },
    round() {
      resume();
      tone(330, 0.12, "triangle", 0.12);
      tone(440, 0.16, "triangle", 0.1);
      tone(550, 0.22, "sine", 0.08);
    },
    complete() {
      resume();
      noise(0.05, 0.05);
      tone(523, 0.1, "triangle", 0.12);
      tone(784, 0.16, "sine", 0.1);
      tone(1046, 0.22, "sine", 0.07);
    },
    result() {
      resume();
      tone(262, 0.18, "sine", 0.1);
      tone(330, 0.26, "triangle", 0.1);
      tone(392, 0.4, "sine", 0.08);
    },
    tick() {
      resume();
      tone(880, 0.05, "square", 0.04);
    },
  };
}
