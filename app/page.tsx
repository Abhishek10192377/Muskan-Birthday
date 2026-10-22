"use client";

import Image from "next/image";
import localFont from "next/font/local";
import "./horror.css";
import { CONFETTI, LIFT, Night, heart, spark } from "./horror-party-art";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

// Drop a finished illustration of the two of you into /public (for example
// "/img/muskan-and-me.jpg") and put its path here. It replaces the generic
// drawn characters in the final scene; nothing else needs to change.
const ILLUSTRATION_SRC = "" as string;

const TOTAL_SCENES = 7;

// Fonts are stored in app/fonts so the page never needs to reach Google Fonts.
const titleFont = localFont({ src: "./fonts/cinzel-normal.woff2", weight: "400 900", variable: "--font-title" });
const proseFont = localFont({
  src: [
    { path: "./fonts/cormorant-normal.woff2", weight: "300 700", style: "normal" },
    { path: "./fonts/cormorant-italic.woff2", weight: "300 700", style: "italic" },
  ],
  variable: "--font-prose",
});
const handFont = localFont({ src: "./fonts/caveat-normal.woff2", weight: "400 700", variable: "--font-hand" });

const FINAL_MESSAGE = [
  "We fight over everything, but life would be way too boring without you.",
  "Stay crazy, stay dramatic, and keep smiling! 🎂😂",
];

/* ------------------------------------------------------------------ */
/* Small hooks                                                         */
/* ------------------------------------------------------------------ */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

// setTimeout that is cancelled automatically when the owning scene unmounts.
function useLater() {
  const timers = useRef(new Set<number>());
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
}

// Counts 0 → total on a timer; drives every "lines appear one by one" moment.
// `finish` lets an impatient reader reveal the rest of the text at once.
function useSteps(total: number, gap: number, reduced: boolean, active = true) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active || step >= total) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 900 : gap);
    return () => window.clearTimeout(id);
  }, [active, step, total, gap]);
  const finish = useCallback(() => setStep(total), [total]);
  return [reduced && active ? total : step, finish] as const;
}

// Deterministic pseudo-random so server and client render identical decorations.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 1000) / 1000;
};

/* ------------------------------------------------------------------ */
/* Ambient tracks and sound effects start only after the sound button is */
/* activated, so the page never surprises visitors with autoplay.       */
/* ------------------------------------------------------------------ */

type Mood = "horror" | "finale";
type Cue =
  | "whoosh" | "sting" | "tick" | "step" | "creak" | "thud" | "paper"
  | "clue" | "blow" | "cut" | "chime" | "click" | "clockTick" | "clockDing" | "clockDong" | "party";

const SCENE_MOOD: Record<number, Mood> = {
  1: "horror", 2: "horror", 3: "horror", 4: "horror", 5: "finale", 6: "finale", 7: "finale",
};

function createSound() {
  if (typeof window.AudioContext === "undefined") return null;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  // A gentle limiter keeps the loud midnight bells from clipping.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;

  // Synthesised hall reverb: a long, decaying stereo noise impulse gives the bells
  // the echo of a huge empty room.
  const hall = ctx.createConvolver();
  const impulse = ctx.createBuffer(2, ctx.sampleRate * 4.5, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3.2);
  }
  hall.buffer = impulse;
  const hallReturn = ctx.createGain();
  hallReturn.gain.value = 0.7;
  hall.connect(hallReturn);
  hallReturn.connect(master);

  const noise = () => {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    return source;
  };
  const osc = (type: OscillatorType, freq: number) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  };
  const gain = (value: number) => {
    const g = ctx.createGain();
    g.gain.value = value;
    return g;
  };
  const filter = (type: BiquadFilterType, freq: number, q = 1) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  };

  let mood: Mood | null = null;
  let ambient: { out: GainNode; sources: AudioScheduledSourceNode[] } | null = null;

  const setMood = (next: Mood) => {
    if (next === mood) return;
    mood = next;
    const now = ctx.currentTime;
    if (ambient) {
      ambient.out.gain.setTargetAtTime(0, now, 0.6);
      ambient.sources.forEach((s) => s.stop(now + 4));
    }
    const out = gain(0);
    out.connect(master);
    const sources: AudioScheduledSourceNode[] = [];
    const add = (source: AudioScheduledSourceNode, ...chain: AudioNode[]) => {
      let node: AudioNode = source;
      for (const link of chain) {
        node.connect(link);
        node = link;
      }
      node.connect(out);
      source.start();
      sources.push(source);
    };

    if (next === "finale") {
      // Keep a quiet breeze under the birthday song. The haunted MP3 is the
      // sole ambient bed in scenes 1–5; one-shot cues still use Web Audio.
      add(noise(), filter("lowpass", 500), gain(0.025));
      add(osc("triangle", 130.81), filter("lowpass", 700), gain(0.02));
    }
    out.gain.setTargetAtTime(1, now, 0.9);
    ambient = { out, sources };
  };

  const tone = (type: OscillatorType, from: number, to: number, dur: number, peak: number, delay = 0) => {
    const t = ctx.currentTime + delay;
    const o = osc(type, from);
    const g = gain(0);
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.03, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  const hiss = (
    type: BiquadFilterType, from: number, to: number, dur: number, peak: number,
    q = 1, delay = 0, attack = 0.02,
  ) => {
    const t = ctx.currentTime + delay;
    const source = noise();
    const f = filter(type, from, q);
    const g = gain(0);
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    source.connect(f);
    f.connect(g);
    g.connect(master);
    source.start(t);
    source.stop(t + dur + 0.05);
  };

  const bell = (fundamental: number) => {
    const partials = [
      [0.5, 0.2, 5.5], [1, 0.34, 4.6], [2.01, 0.15, 3.6], [3.04, 0.11, 2.8],
      [4.2, 0.06, 2], [5.43, 0.035, 1.4],
    ];
    const echoes = [1, 0.32, 0.16, 0.08];
    partials.forEach(([ratio, peak, decay]) => {
      echoes.forEach((level, echo) => {
        const t = ctx.currentTime + echo * 0.46;
        const duration = decay * (1 - echo * 0.12);
        const source = osc("sine", fundamental * ratio);
        const envelope = gain(0);
        envelope.gain.setValueAtTime(0.0001, t);
        envelope.gain.exponentialRampToValueAtTime(peak * level, t + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        source.connect(envelope);
        envelope.connect(master);
        envelope.connect(hall);
        source.start(t);
        source.stop(t + duration + 0.04);
      });
    });
    // The hammer hitting the bell, and the thump through the wall it hangs on.
    hiss("lowpass", fundamental * 3.2, 110, 0.22, 0.12, 0.8, 0, 0.004);
    tone("sine", 70, 38, 0.9, 0.35);
  };

  const cues: Record<Cue, () => void> = {
    whoosh: () => { hiss("bandpass", 180, 2200, 1.3, 0.3, 0.8, 0, 0.6); tone("sine", 60, 38, 1.4, 0.3); },
    sting: () => {
      tone("sine", 82, 36, 1.6, 0.6);
      tone("sawtooth", 233, 220, 1.2, 0.07);
      tone("sawtooth", 247, 262, 1.2, 0.06);
      hiss("highpass", 3000, 6000, 0.25, 0.15);
    },
    tick: () => tone("square", 2100, 1900, 0.035, 0.03),
    step: () => { tone("sine", 95, 50, 0.16, 0.25); hiss("lowpass", 300, 150, 0.12, 0.12); },
    creak: () => {
      tone("sawtooth", 96, 150, 0.7, 0.07);
      tone("sawtooth", 150, 78, 0.9, 0.06, 0.7);
      hiss("bandpass", 900, 500, 1.5, 0.05, 6);
    },
    thud: () => { tone("sine", 110, 32, 0.7, 0.8); hiss("lowpass", 220, 80, 0.3, 0.3); },
    paper: () => hiss("highpass", 2600, 4200, 0.22, 0.07),
    clue: () => {
      tone("sine", 110, 104, 2.2, 0.22);
      tone("sine", 116.5, 110, 2.2, 0.16);
      tone("triangle", 880, 870, 1.5, 0.02);
    },
    blow: () => hiss("lowpass", 900, 220, 0.8, 0.4, 0.7, 0, 0.12),
    cut: () => { hiss("bandpass", 2400, 1200, 0.5, 0.1, 2); tone("sine", 170, 80, 0.14, 0.25, 0.5); },
    chime: () => [880, 1108.7, 1318.5, 1760].forEach((f, i) => tone("sine", f, f, 2.4, 0.07, i * 0.14)),
    click: () => tone("sine", 520, 400, 0.06, 0.05),
    clockTick: () => tone("sine", 1450, 1180, 0.055, 0.018),
    clockDing: () => bell(220),
    clockDong: () => bell(164.81),
    // Party poppers followed by a bright rising fanfare.
    party: () => {
      [0, 0.18, 0.32].forEach((d) => hiss("highpass", 1800, 5200, 0.35, 0.22, 0.7, d, 0.004));
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone("triangle", f, f, 0.9, 0.12, 0.35 + i * 0.12));
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f) => tone("sine", f, f, 2.6, 0.05, 0.9));
    },
  };

  return {
    setMood,
    cue: (name: Cue) => {
      if (ctx.state === "running") cues[name]();
    },
    setMuted: (muted: boolean) => {
      if (!muted) void ctx.resume();
      master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.15);
    },
    dispose: () => void ctx.close().catch(() => undefined),
  };
}

type SoundEngine = NonNullable<ReturnType<typeof createSound>>;
type CueFn = (name: Cue) => void;

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

// A line of narration that fades in when `on` flips. It always occupies its
// space, so text arriving never shifts the layout.
function Ln({ on, className = "", children }: { on: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`ln ${className}${on ? " on" : ""}`} aria-hidden={!on}>
      {children}
    </div>
  );
}

function NarrationSkip({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  if (!visible) return null;
  return (
    <button type="button" className="narration-skip" onClick={onClick}>
      Show all text
    </button>
  );
}

function Fog() {
  return (
    <div className="fog" aria-hidden="true">
      <span />
      <span />
    </div>
  );
}

interface SceneProps {
  cue: CueFn;
  reduced: boolean;
  onNext: () => void;
}

/* ------------------------------------------------------------------ */
/* SCENE 01 — The Mysterious Invitation                                */
/* ------------------------------------------------------------------ */

function Invitation({
  cue, reduced, onNext, started, onStart,
}: SceneProps & { started: boolean; onStart: (withSound: boolean) => void }) {
  const [step, finish] = useSteps(2, 750, reduced, started);

  if (!started) {
    return (
      <div className="scene scene-1">
        <div className="preload" aria-hidden="true" />
        <p className="eyebrow opening-kicker">A birthday story after dark</p>
        <h1 className="opening-title">The last knock</h1>
        <p className="say small opening-hint">A little mystery is waiting for you, Muskan.</p>
        <div className="row">
          <button type="button" className="cta" onClick={() => onStart(true)}>Begin with sound</button>
          <button type="button" className="cta cta-quiet" onClick={() => onStart(false)}>Begin in silence</button>
        </div>
      </div>
    );
  }

  return (
    <div className="scene scene-1">
      <div className="preload" aria-hidden="true" />
      <NarrationSkip visible={!reduced && step < 2} onClick={finish} />
      <div className="lines">
        <Ln on={step >= 1} className="say">At midnight, someone knocked from outside your window.</Ln>
        <Ln on={step >= 2} className="say say-strong">The strange part? You live on the second floor.</Ln>
      </div>
      <Ln on={step >= 2} className="row">
        <button
          type="button"
          className="cta cta-blood"
          disabled={step < 2}
          onClick={() => { cue("click"); onNext(); }}
        >
          Enter if you dare
        </button>
      </Ln>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SCENE 02 — The Haunted Corridor                                     */
/* ------------------------------------------------------------------ */

function Corridor({ cue, reduced, onNext }: SceneProps) {
  const later = useLater();
  const [power, setPower] = useState(reduced ? "final" : "normal");

  useEffect(() => {
    if (reduced) {
      later(onNext, 900);
      return;
    }

    // Uneven, short voltage failures lead into one final sustained blackout.
    const sequence: Array<{ after: number; state: string; sound?: "cut" | "click" }> = [
      { after: 900, state: "off", sound: "cut" },
      { after: 430, state: "dim" },
      { after: 260, state: "normal", sound: "click" },
      { after: 150, state: "off", sound: "cut" },
      { after: 110, state: "normal", sound: "click" },
      { after: 520, state: "dim" },
      { after: 230, state: "normal", sound: "click" },
      { after: 170, state: "off", sound: "cut" },
      { after: 100, state: "dim" },
      { after: 380, state: "normal", sound: "click" },
      { after: 190, state: "off", sound: "cut" },
      { after: 120, state: "normal", sound: "click" },
      { after: 640, state: "final", sound: "cut" },
    ];
    let elapsed = 0;
    sequence.forEach(({ after, state, sound }) => {
      elapsed += after;
      later(() => {
        setPower(state);
        if (sound) cue(sound);
      }, elapsed);
    });
    later(onNext, elapsed + 1250);
  }, [cue, later, onNext, reduced]);

  return (
    <div className={`scene scene-2 power-${power}`}>
      <div className="cor" aria-hidden="true">
        <div className="cor-cam">
          <div className="cor-photo" />
          <div className="cor-tint" />
          <div className="cor-door" />
          <div className="cor-shade" />
        </div>
        <div className="cor-light" />
        <div className="cor-vig" />
      </div>
      <Fog />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SCENE 03 — Midnight, twelve o'clock                                 */
/* ------------------------------------------------------------------ */

const ROMAN_MARKS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

function MidnightClock({ cue, reduced, onNext }: SceneProps) {
  const later = useLater();
  const onNextRef = useRef(onNext);
  const [progress, setProgress] = useState(0);
  const [strikes, setStrikes] = useState(0);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    const duration = reduced ? 1800 : 5200;
    const strikeGap = reduced ? 820 : 1580;
    let frame = 0;
    let lastTick = 0;

    const approachMidnight = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration);
      setProgress(elapsed);

      if (elapsed < 1) {
        if (now - lastTick >= 600) {
          cue("clockTick");
          lastTick = now;
        }
        frame = window.requestAnimationFrame(approachMidnight);
        return;
      }

      // Let the final hand position render before the first bell begins.
      later(() => {
        for (let index = 0; index < 4; index += 1) {
          later(() => {
            setStrikes(index + 1);
            cue(index % 2 === 0 ? "clockDing" : "clockDong");
          }, index * strikeGap);
        }
        later(() => onNextRef.current(), 3 * strikeGap + 3800);
      }, 120);
    };

    const start = performance.now();
    frame = window.requestAnimationFrame(approachMidnight);
    return () => window.cancelAnimationFrame(frame);
  }, [cue, later, reduced]);

  const minuteAngle = -6 + progress * 6;
  const hourAngle = -0.5 + progress * 0.5;

  return (
    <div className="scene scene-3 clock-scene">
      <div className="room-bg clock-bg" aria-hidden="true" />
      <div className="clock-backlight" aria-hidden="true" />
      <Fog />
      {strikes > 0 && <div className={`clock-light-pulse ring-${strikes % 2 ? "a" : "b"}`} aria-hidden="true" />}

      <div className="clock-particles" aria-hidden="true">
        {Array.from({ length: 22 }, (_, index) => (
          <i
            key={index}
            style={{
              left: `${Math.round(5 + rand(index, 73) * 90)}%`,
              top: `${Math.round(10 + rand(index, 74) * 80)}%`,
              animationDelay: `${(-rand(index, 75) * 8).toFixed(2)}s`,
              animationDuration: `${(5 + rand(index, 76) * 7).toFixed(2)}s`,
            }}
          />
        ))}
      </div>

      <svg
        className={`midnight-clock${strikes > 0 ? ` ring-${strikes % 2 ? "a" : "b"}` : ""}`}
        style={{ transform: `translate(-50%, -50%) scale(${0.62 + progress * 0.38})` }}
        viewBox="0 60 600 575"
        role="img"
        aria-label={`Antique clock at midnight. ${strikes} of 4 chimes.`}
      >
        <defs>
          <radialGradient id="clock-face" cx="48%" cy="35%" r="75%">
            <stop offset="0" stopColor="#4e483e" />
            <stop offset="0.58" stopColor="#211f1d" />
            <stop offset="1" stopColor="#090a0d" />
          </radialGradient>
          <linearGradient id="clock-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2d99b" />
            <stop offset="0.2" stopColor="#684f2a" />
            <stop offset="0.42" stopColor="#c5a66a" />
            <stop offset="0.72" stopColor="#554126" />
            <stop offset="1" stopColor="#e5ce91" />
          </linearGradient>
          <linearGradient id="clock-case" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#170f0b" />
            <stop offset="0.2" stopColor="#5b3822" />
            <stop offset="0.5" stopColor="#21150f" />
            <stop offset="0.82" stopColor="#69452b" />
            <stop offset="1" stopColor="#160f0c" />
          </linearGradient>
          <radialGradient id="clock-glass" cx="32%" cy="18%" r="76%">
            <stop offset="0" stopColor="#fff8dc" stopOpacity="0.18" />
            <stop offset="0.6" stopColor="#cbd8f7" stopOpacity="0.025" />
            <stop offset="1" stopColor="#080a10" stopOpacity="0.28" />
          </radialGradient>
        </defs>

        <path d="M174 292V146q0-55 55-72h142q55 17 55 72v146Z" fill="url(#clock-case)" stroke="url(#clock-brass)" strokeWidth="7" />
        <path d="M191 292V148q0-39 43-55h132q43 16 43 55v144Z" fill="#100e0d" stroke="#8c7041" strokeWidth="3" />
        <circle cx="300" cy="350" r="268" fill="#030405" opacity="0.8" />
        <circle cx="300" cy="350" r="258" fill="url(#clock-brass)" stroke="#2b2016" strokeWidth="9" />
        <circle cx="300" cy="350" r="238" fill="url(#clock-face)" stroke="#d1b574" strokeWidth="3" />
        <circle cx="300" cy="350" r="224" fill="none" stroke="#9d8050" strokeWidth="1.5" opacity="0.75" />

        {Array.from({ length: 60 }, (_, index) => (
          <path
            key={index}
            d={index % 5 === 0 ? "M300 132v19" : "M300 137v9"}
            transform={`rotate(${index * 6} 300 350)`}
            stroke={index % 5 === 0 ? "#e1cb94" : "#a38c61"}
            strokeWidth={index % 5 === 0 ? 3 : 1.4}
            opacity={index % 5 === 0 ? 0.94 : 0.58}
          />
        ))}
        {ROMAN_MARKS.map((mark, index) => {
          const angle = (index * Math.PI) / 6;
          return (
            <text
              key={mark}
              x={300 + Math.sin(angle) * 184}
              y={357 - Math.cos(angle) * 184}
              fill="#e4d2a9"
              fontFamily="Georgia, serif"
              fontSize="24"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="middle"
              letterSpacing="1"
            >
              {mark}
            </text>
          );
        })}

        <path d="M300 180c-94 0-170 76-170 170s76 170 170 170" fill="none" stroke="#fff" strokeWidth="22" opacity="0.025" />
        <circle cx="300" cy="350" r="216" fill="url(#clock-glass)" />

        <g transform={`rotate(${hourAngle} 300 350)`}>
          <path d="M300 356 286 365 291 278 300 239 309 278 314 365Z" fill="#d4bb83" stroke="#f0dda8" strokeWidth="2" />
          <path d="M300 264v88" stroke="#fff0c8" strokeWidth="2" opacity="0.58" />
        </g>
        <g transform={`rotate(${minuteAngle} 300 350)`}>
          <path d="M300 354 294 361 296 194 300 169 304 194 306 361Z" fill="#e7d7af" stroke="#fff1c7" strokeWidth="1.5" />
          <path d="M300 190v158" stroke="#fff" strokeWidth="1.5" opacity="0.52" />
        </g>
        <circle cx="300" cy="350" r="16" fill="url(#clock-brass)" stroke="#f0dda8" strokeWidth="3" />
        <circle cx="300" cy="350" r="5" fill="#fff0c8" />
        <path d="M192 126q42-27 81-22" fill="none" stroke="#fff" strokeWidth="10" opacity="0.08" strokeLinecap="round" />
        <path d="M426 380q-12 100-71 148" fill="none" stroke="#000" strokeWidth="14" opacity="0.2" strokeLinecap="round" />
      </svg>

      <p className="clock-a11y" aria-live="polite" aria-atomic="true">{strikes > 0 ? `Midnight chime ${strikes} of 4.` : "The clock is approaching midnight."}</p>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* SCENE 05 — The Shadow Behind You                                    */
/* ------------------------------------------------------------------ */

type DoorStage = "closed" | "open" | "video" | "paused" | "failed" | "dark";

function ShadowDoor({ cue, reduced, onNext, soundOn }: SceneProps & { soundOn: boolean }) {
  const later = useLater();
  const [step, finish] = useSteps(4, 850, reduced);
  const [stage, setStage] = useState<DoorStage>("closed");
  const video = useRef<HTMLVideoElement>(null);
  const left = useRef(false);
  const playing = useRef(false);

  // Runs once: fade the clip to black, hold the darkness a moment, then hand over
  // to the party popup. Only the clip's real `ended` event (or the visitor choosing
  // to continue after a failure) gets here.
  const leave = () => {
    if (left.current) return;
    left.current = true;
    setStage("dark");
    later(onNext, reduced ? 200 : 1100);
  };

  const playClip = () => {
    const clip = video.current;
    if (!clip || clip.error) return setStage("failed");
    playing.current = true;
    setStage("video");
    clip.play().catch(() => {
      // Autoplay with sound refused: try again muted before giving up.
      clip.muted = true;
      clip.play().catch(() => setStage("failed"));
    });
  };

  const openDoor = () => {
    cue("creak");
    setStage("open");
    const clip = video.current;
    if (clip) {
      // Start and immediately pause inside the click, so browsers that only allow
      // playback from a gesture will let the clip start once the door has swung open.
      clip.volume = 0.8;
      clip.play()
        .then(() => {
          if (playing.current) return;
          clip.pause();
          clip.currentTime = 0;
        })
        .catch(() => undefined);
    }
    later(playClip, reduced ? 200 : 1000);
  };

  const showing = stage === "video" || stage === "paused" || stage === "dark";

  return (
    <div className={`scene scene-5${stage !== "closed" ? " is-open" : ""}${step >= 2 ? " is-watched" : ""}`}>
      <Fog />
      <NarrationSkip visible={!reduced && step < 4} onClick={finish} />
      <div className="lines">
        <Ln on={step >= 1} className="say">Muskan, whatever you do...</Ln>
        <Ln on={step >= 2} className="say say-strong">Don&apos;t open the next door.</Ln>
      </div>

      <div className="doorway" aria-hidden="true">
        <div className="beyond" />
        <div className="door">
          <div className="door-glass"><span className="door-figure" /></div>
          <div className="door-panel" />
          <div className="door-knob" />
        </div>
        <div className="door-gap" />
      </div>

      <Ln on={step >= 3} className="say small">Actually, you have to. It&apos;s your birthday.</Ln>
      <Ln on={step >= 4} className="row">
        <button type="button" className="cta cta-blood" disabled={step < 4 || stage !== "closed"} onClick={openDoor}>
          Open the door
        </button>
      </Ln>

      <video
        ref={video}
        className={`door-video${showing ? " on" : ""}${stage === "dark" ? " is-dark" : ""}`}
        src="/video/door-reveal.mp4"
        preload="auto"
        playsInline
        muted={!soundOn}
        aria-label="What was waiting behind the door"
        onEnded={leave}
        onPause={(e) => {
          // A pause is not the end: the popup stays closed until the clip finishes.
          if (!e.currentTarget.ended) setStage((s) => (s === "video" ? "paused" : s));
        }}
        onPlay={() => setStage((s) => (s === "paused" ? "video" : s))}
        onError={() => setStage((s) => (s === "video" || s === "paused" || s === "open" ? "failed" : s))}
      />

      {stage === "paused" && (
        <div className="door-video-ui fade">
          <button type="button" className="cta cta-blood" onClick={playClip}>Keep watching</button>
        </div>
      )}
      {stage === "failed" && (
        <div className="door-video-ui is-failed fade" role="alert">
          <p className="say small">Something behind the door refuses to be seen.</p>
          <div className="row">
            <button type="button" className="cta cta-blood" onClick={playClip}>Try again</button>
            <button type="button" className="cta cta-quiet" onClick={leave}>Continue anyway</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The surprise — party popup that opens when the door clip ends       */
/* ------------------------------------------------------------------ */

const BULB_COLORS = ["#ff5f7e", "#ffd25a", "#6be0ff", "#b38cff", "#7dffb0"];

const BULBS = Array.from({ length: 21 }, (_, i) => {
  const t = i / 20;
  return {
    id: i,
    x: Math.round(t * 1000),
    y: Math.round(18 + 70 * 4 * t * (1 - t)),
    color: BULB_COLORS[i % BULB_COLORS.length],
    delay: `${(-rand(i, 81) * 2).toFixed(2)}s`,
  };
});

const FLAGS = Array.from({ length: 13 }, (_, i) => ({
  id: i,
  color: ["#ff5f7e", "#ffd25a", "#6be0ff", "#b38cff", "#ff9f5a", "#7dffb0"][i % 6],
  // the string of flags sags in the middle
  y: `${Math.round(4 * (i / 12) * (1 - i / 12) * 26)}px`,
}));

const SPARKLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${Math.round(rand(i, 82) * 100)}%`,
  top: `${Math.round(rand(i, 83) * 100)}%`,
  size: `${Math.round(8 + rand(i, 84) * 16)}px`,
  delay: `${(-rand(i, 85) * 3).toFixed(2)}s`,
  duration: `${(1.6 + rand(i, 86) * 2).toFixed(2)}s`,
}));

const CAKE_CANDLES = [196, 228, 260, 292, 324];

function PartyCake() {
  return (
    <svg className="party-cake" viewBox="120 40 280 250" role="img" aria-label="A three-tier birthday cake with five glowing candles">
      <defs>
        <radialGradient id="pc-glow">
          <stop offset="0" stopColor="#fff2b0" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#ffb347" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pc-tier" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd6e3" />
          <stop offset="1" stopColor="#f39bb8" />
        </linearGradient>
        <linearGradient id="pc-tier2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4dc" />
          <stop offset="1" stopColor="#f2d29c" />
        </linearGradient>
      </defs>
      <ellipse cx="260" cy="276" rx="132" ry="12" fill="#000" opacity="0.28" />
      <ellipse cx="260" cy="268" rx="124" ry="14" fill="#e8e3f4" />
      {/* bottom tier */}
      <rect x="150" y="196" width="220" height="70" rx="12" fill="url(#pc-tier)" />
      <path d="M150 210q0-14 14-14h192q14 0 14 14v6q-10 12-20 0t-20 0-20 0-20 0-20 0-20 0-20 0-20 0-20 0-20 0-20 0Z" fill="#fff" opacity="0.92" />
      {/* middle tier */}
      <rect x="176" y="146" width="168" height="54" rx="10" fill="url(#pc-tier2)" />
      <path d="M176 158q0-12 12-12h144q12 0 12 12v5q-9 11-18 0t-18 0-18 0-18 0-18 0-18 0-18 0-18 0-18 0Z" fill="#ff7fa6" />
      {/* top tier */}
      <rect x="200" y="104" width="120" height="46" rx="9" fill="url(#pc-tier)" />
      <path d="M200 114q0-10 10-10h100q10 0 10 10v4q-8 10-16 0t-16 0-16 0-16 0-16 0-16 0-16 0Z" fill="#fff" opacity="0.92" />
      {/* sprinkles */}
      {Array.from({ length: 26 }, (_, i) => (
        <rect
          key={i}
          x={160 + Math.round(rand(i, 87) * 196)}
          y={i < 14 ? 228 + Math.round(rand(i, 88) * 30) : 172 + Math.round(rand(i, 88) * 22)}
          width="7"
          height="2.6"
          rx="1.3"
          fill={BULB_COLORS[i % BULB_COLORS.length]}
          transform={`rotate(${Math.round(rand(i, 89) * 180)} ${160 + Math.round(rand(i, 87) * 196)} ${200})`}
        />
      ))}
      {[214, 260, 306].map((x) => <path key={x} d={heart(x, 132, 6)} fill="#ff5f7e" />)}
      {/* candles */}
      {CAKE_CANDLES.map((x, i) => (
        <g key={x} className="party-candle" style={{ "--i": i } as CSSProperties}>
          <circle className="party-candle-glow" cx={x} cy="68" r="22" fill="url(#pc-glow)" />
          <rect x={x - 4} y="76" width="8" height="30" rx="2" fill={BULB_COLORS[i % BULB_COLORS.length]} />
          <path d={`M${x - 4} 84l8-5M${x - 4} 94l8-5M${x - 4} 104l8-5`} stroke="#fff" strokeWidth="2" opacity="0.7" />
          <path d={`M${x} 76v-4`} stroke="#3a2a22" strokeWidth="1.5" />
          <path className="party-flame" d={`M${x} 56c6 8 7 13 0 17-7-4-6-9 0-17Z`} fill="#ffd25a" />
          <path className="party-flame" d={`M${x} 63c3 4 3 7 0 9-3-2-3-5 0-9Z`} fill="#fff6d6" />
        </g>
      ))}
    </svg>
  );
}

function PartyPopup({ cue, reduced, leaving, onContinue }: {
  cue: CueFn; reduced: boolean; leaving: boolean; onContinue: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);

  // The popper sound and the focus move land with the card's entrance. The timer
  // is cleared if the popup closes first, so nothing plays after it is gone.
  useEffect(() => {
    const id = window.setTimeout(() => {
      cue("party");
      primary.current?.focus({ preventScroll: true });
    }, reduced ? 80 : 900);
    return () => window.clearTimeout(id);
  }, [cue, reduced]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onContinue();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep keyboard focus inside the dialog while it is open.
    const focusable = dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={dialog}
      className={`party-pop${leaving ? " is-leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="party-title"
      aria-describedby="party-msg"
      onKeyDown={onKeyDown}
    >
      <div className="party-bg" aria-hidden="true">
        <div className="party-beams"><span /><span /><span /></div>
        <svg className="party-lights" viewBox="0 0 1000 110" preserveAspectRatio="none">
          <path d="M0 18Q500 158 1000 18" fill="none" stroke="#1b1033" strokeWidth="3" />
        </svg>
        <div className="party-bulbs">
          {BULBS.map((b) => (
            <i
              key={b.id}
              style={{ left: `${b.x / 10}%`, top: `${b.y / 110 * 100}%`, "--c": b.color, animationDelay: b.delay } as CSSProperties}
            />
          ))}
        </div>
        <div className="party-bunting">
          {FLAGS.map((f) => <i key={f.id} style={{ "--c": f.color, "--i": f.id, "--y": f.y } as CSSProperties} />)}
        </div>
        <div className="party-sparkles">
          {SPARKLES.map((s) => (
            <i
              key={s.id}
              style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration }}
            />
          ))}
        </div>
        <div className="lift">
          {LIFT.map((b) => (
            <span
              key={b.id}
              style={{ left: b.left, animationDuration: b.duration, animationDelay: `-${b.delay}`, "--sway": b.sway } as CSSProperties}
            >
              <svg width={b.size} height={b.size * 1.9} viewBox="0 0 50 95">
                <ellipse cx="25" cy="29" rx="23" ry="28" fill={BULB_COLORS[b.id % BULB_COLORS.length]} />
                <ellipse cx="17" cy="19" rx="6" ry="9" fill="#fff" opacity="0.45" />
                <path d="M22 56l3 5 3-5Z" fill={BULB_COLORS[b.id % BULB_COLORS.length]} />
                <path d="M25 61q-5 16 0 34" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.200" />
              </svg>
            </span>
          ))}
        </div>
        <div className="confetti">
          {CONFETTI.map((c) => (
            <span
              key={c.id}
              className={c.round ? "is-round" : undefined}
              style={{ left: c.left, background: BULB_COLORS[c.id % BULB_COLORS.length], animationDuration: c.duration, animationDelay: c.delay, "--sway": c.sway } as CSSProperties}
            />
          ))}
        </div>
      </div>

      <div className="party-card">
        <button type="button" className="party-close" onClick={onContinue} aria-label="Close the surprise and continue">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <p className="party-kicker">Surprise!</p>
        <h2 id="party-title" className="party-title">Happy Birthday, Muskan!</h2>
        <PartyCake />
        <p id="party-msg" className="party-msg">
          You survived midnight. Now the night is all yours. May this year bring you endless
          laughter, happiness, and every reason to smile. 💖
        </p>
        <button ref={primary} type="button" className="cta cta-warm party-go" onClick={onContinue}>
          Let&apos;s Celebrate! 🎉
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SCENES 06 & 07 — the painted night                                  */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* SCENE 06 — The Celebration                                          */
/* ------------------------------------------------------------------ */

type PartyStage = "decor" | "enter" | "present" | "wish" | "blowing" | "blown" | "cutting" | "party";

const PARTY_ORDER: PartyStage[] = ["decor", "enter", "present", "wish", "blowing", "blown", "cutting", "party"];

function CelebrationTake({ cue, reduced, onNext, onReplay }: SceneProps & { onReplay: () => void }) {
  const later = useLater();
  const [stage, setStage] = useState<PartyStage>("decor");
  const at = PARTY_ORDER.indexOf(stage);

  // The opening plays by itself: decorations, then he walks in and sets the cake down.
  useEffect(() => {
    const start = reduced ? 150 : 900;
    const walk = reduced ? 200 : 2000;
    later(() => setStage("enter"), start);
    later(() => setStage("present"), start + walk);
    later(() => setStage("wish"), start + walk + (reduced ? 150 : 700));
  }, [later, reduced]);

  const blow = () => {
    cue("blow");
    setStage("blowing");
    later(() => {
      cue("chime");
      setStage("blown");
    }, reduced ? 200 : 1200);
  };

  const cut = () => {
    setStage("cutting");
    later(() => cue("cut"), 500);
    later(() => {
      cue("chime");
      setStage("party");
    }, reduced ? 200 : 1200);
  };

  return (
    <div className={`scene scene-6${stage === "party" ? " is-party" : ""}`}>
      <Night
        illustrationSrc={ILLUSTRATION_SRC}
        art={{
          intro: true,
          away: stage === "decor",
          walking: stage === "enter",
          held: at <= PARTY_ORDER.indexOf("enter"),
          lit: at <= PARTY_ORDER.indexOf("wish"),
          blowing: stage === "blowing",
          cutting: stage === "cutting",
          cut: stage === "party",
        }}
      />

      {stage === "party" && (
        <>
          <div className="lift" aria-hidden="true">
            {LIFT.map((b) => (
              <span
                key={b.id}
                style={{ left: b.left, animationDuration: b.duration, animationDelay: b.delay, "--sway": b.sway } as CSSProperties}
              >
                <svg width={b.size} height={b.size * 1.9} viewBox="0 0 50 95">
                  <ellipse cx="25" cy="29" rx="23" ry="28" fill={b.color} />
                  <ellipse cx="17" cy="19" rx="6" ry="9" fill="#fff" opacity="0.4" />
                  <path d="M22 56l3 5 3-5Z" fill={b.color} />
                  <path d="M25 61q-5 16 0 34" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.200" />
                </svg>
              </span>
            ))}
          </div>
          <div className="confetti" aria-hidden="true">
            {CONFETTI.map((c) => (
              <span
                key={c.id}
                className={c.round ? "is-round" : undefined}
                style={{ left: c.left, background: c.color, animationDuration: c.duration, animationDelay: c.delay, "--sway": c.sway } as CSSProperties}
              />
            ))}
          </div>
        </>
      )}

      <div className="cel-text" aria-live="polite">
        {stage === "decor" && <p className="say warm fade">The horror was only the wrapping paper.</p>}
        {stage === "enter" && <p className="say warm small fade">Someone is bringing you something.</p>}
        {stage === "present" && <p className="say warm fade">For you, Muskan.</p>}
        {(stage === "wish" || stage === "blowing") && <p className="say warm say-strong fade">Make a wish, Muskan! ✨</p>}
        {(stage === "blown" || stage === "cutting") && <p className="say warm fade">Wish made. Now the best part.</p>}
        {stage === "party" && <h2 className="cel-title fade">Happy Birthday, Muskan! 💖</h2>}
      </div>

      {/* the one real photograph in the story, with the party hat placed on her head */}
      {stage === "party" && (
        <figure className="polaroid">
          <div className="polaroid-photo">
            <Image src="/img/muskan.jpg" alt="Muskan beside her desk, decorated with birthday balloons" width={520} height={760} />
            <Image className="polaroid-hat" src="/img/hat.svg" alt="" width={582} height={930} />
          </div>
          <figcaption>The birthday girl</figcaption>
        </figure>
      )}

      <div className="cel-controls">
        {stage === "wish" && (
          <button type="button" className="cta cta-warm fade" onClick={blow}>Blow the Candles</button>
        )}
        {stage === "blown" && (
          <button type="button" className="cta cta-warm fade" onClick={cut}>Let&apos;s Cut the Cake 🎂</button>
        )}
        {stage === "party" && (
          <div className="stack fade">
            <p className="say warm small">May this year be as sweet as the cake, and far less scary than the way here.</p>
            <div className="row">
              <button type="button" className="cta cta-warm" onClick={onNext}>Read what was waiting for you</button>
              <button type="button" className="cta cta-quiet cta-small" onClick={onReplay}>Replay the celebration</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Remounting the take is what makes "Replay the celebration" start from the top.
function Celebration(props: SceneProps) {
  const [take, setTake] = useState(0);
  return <CelebrationTake key={take} {...props} onReplay={() => setTake((n) => n + 1)} />;
}

/* ------------------------------------------------------------------ */
/* SCENE 07 — The Gift                                                 */
/* ------------------------------------------------------------------ */

// Small hand-drawn illustrations, in the same style as the rest of the set.
const GIFT_GROUPS: { title: string; items: { label: string; art: ReactNode }[] }[] = [
  {
    title: "Something that shines",
    items: [
      {
        label: "A necklace",
        art: (
          <>
            <path d="M12 12Q32 54 52 12" fill="none" stroke="#e6c477" strokeWidth="2" />
            <path d={heart(32, 40, 7)} fill="#f29ab3" stroke="#e6c477" strokeWidth="1.500" />
            <circle cx="29.500" cy="37" r="1.500" fill="#fff" opacity="0.8" />
          </>
        ),
      },
      {
        label: "Earrings",
        art: (
          <>
            <path d="M20 14c-5 2-5 9 0 11M44 14c-5 2-5 9 0 11" fill="none" stroke="#e6c477" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 26c-7 10-6 20 0 22 6-2 7-12 0-22ZM44 26c-7 10-6 20 0 22 6-2 7-12 0-22Z" fill="#e6c477" />
            <circle cx="20" cy="42" r="3.200" fill="#fff6e6" />
            <circle cx="44" cy="42" r="3.200" fill="#fff6e6" />
          </>
        ),
      },
      {
        label: "A bracelet",
        art: (
          <>
            <ellipse cx="32" cy="32" rx="21" ry="14" fill="none" stroke="#e6c477" strokeWidth="3.500" />
            {[[13, 38], [22, 44], [42, 44], [51, 38]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="2.800" fill="#fff6e6" />
            ))}
            <path d={heart(32, 49, 5)} fill="#f29ab3" />
          </>
        ),
      },
    ],
  },
  {
    title: "Something sweet",
    items: [
      {
        label: "Chocolate bars",
        art: (
          <>
            <rect x="12" y="12" width="40" height="40" rx="5" fill="#6b3a1e" transform="rotate(-8 32 32)" />
            <path d="M12 25h40M12 38h40M25 12v40M38 12v40" stroke="#4d2812" strokeWidth="2" transform="rotate(-8 32 32)" />
            <path d="M10 40l44-6 2 16-44 6Z" fill="#e6c477" />
            <path d="M14 46l38-5" stroke="#fff6e6" strokeWidth="1.500" opacity="0.7" />
          </>
        ),
      },
      {
        label: "Heart chocolates",
        art: (
          <>
            <path d={heart(22, 24, 11)} fill="#7a4526" />
            <path d={heart(43, 28, 9)} fill="#5a2f18" />
            <path d={heart(30, 46, 9)} fill="#8f5733" />
            <path d="M16 20q3-4 7-2M38 25q3-3 6-2M25 42q3-3 6-2" fill="none" stroke="#fff" strokeWidth="1.600" strokeLinecap="round" opacity="0.5" />
          </>
        ),
      },
      {
        label: "A gift pack",
        art: (
          <>
            <rect x="9" y="20" width="46" height="32" rx="4" fill="#7d1f3a" />
            <rect x="13" y="24" width="38" height="24" rx="2" fill="#f7efe4" />
            {[[21, 31], [32, 31], [43, 31], [21, 41], [32, 41], [43, 41]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="4.200" fill={(x + y) % 2 ? "#6b3a1e" : "#8f5733"} />
            ))}
            <path d="M9 20l8-8h30l8 8Z" fill="#9c2a4a" />
            <path d="M28 12h8v8h-8Z" fill="#e6c477" />
          </>
        ),
      },
    ],
  },
  {
    title: "Something to hug",
    items: [
      {
        label: "A teddy bear",
        art: (
          <>
            <circle cx="20" cy="15" r="6.500" fill="#b9804e" />
            <circle cx="44" cy="15" r="6.500" fill="#b9804e" />
            <ellipse cx="32" cy="46" rx="15" ry="13" fill="#b9804e" />
            <circle cx="32" cy="25" r="14" fill="#c98f5b" />
            <ellipse cx="32" cy="30" rx="6.500" ry="5" fill="#f1d9bd" />
            <circle cx="26.500" cy="22" r="1.800" fill="#2b1d14" />
            <circle cx="37.500" cy="22" r="1.800" fill="#2b1d14" />
            <circle cx="32" cy="28" r="1.800" fill="#2b1d14" />
            <ellipse cx="32" cy="48" rx="8" ry="7" fill="#f1d9bd" />
            <path d={heart(32, 47, 3.500)} fill="#f29ab3" />
          </>
        ),
      },
      {
        label: "A little plush",
        art: (
          <>
            <ellipse cx="24" cy="15" rx="5" ry="13" fill="#f7efe4" />
            <ellipse cx="40" cy="15" rx="5" ry="13" fill="#f7efe4" />
            <ellipse cx="24" cy="16" rx="2.200" ry="9" fill="#f2b5c4" />
            <ellipse cx="40" cy="16" rx="2.200" ry="9" fill="#f2b5c4" />
            <ellipse cx="32" cy="50" rx="12" ry="9" fill="#efe3d4" />
            <circle cx="32" cy="35" r="13" fill="#f7efe4" />
            <circle cx="27" cy="33" r="1.700" fill="#2b1d14" />
            <circle cx="37" cy="33" r="1.700" fill="#2b1d14" />
            <path d="M30 38q2 2 4 0" fill="none" stroke="#2b1d14" strokeWidth="1.400" strokeLinecap="round" />
            <circle cx="24" cy="38" r="2.600" fill="#f2b5c4" opacity="0.7" />
            <circle cx="40" cy="38" r="2.600" fill="#f2b5c4" opacity="0.7" />
          </>
        ),
      },
      {
        label: "A bouquet",
        art: (
          <>
            <path d="M32 58L18 30h28Z" fill="#f7efe4" />
            <path d="M32 58l-7-28h14Z" fill="#ead9c6" />
            <path d="M24 30q-6-8-2-16M40 30q6-8 2-16M32 30V12" fill="none" stroke="#5f8a6a" strokeWidth="2" />
            <circle cx="21" cy="16" r="7" fill="#f2b5c4" />
            <circle cx="43" cy="16" r="7" fill="#c9b6e8" />
            <circle cx="32" cy="11" r="8" fill="#f29ab3" />
            <circle cx="26" cy="25" r="5.500" fill="#fff3dc" />
            <circle cx="38" cy="25" r="5.500" fill="#f7c7a3" />
            <path d="M26 44q6 4 12 0" fill="none" stroke="#f29ab3" strokeWidth="2.500" strokeLinecap="round" />
          </>
        ),
      },
      {
        label: "A keepsake",
        art: (
          <>
            <circle cx="32" cy="26" r="19" fill="#9fc4e8" opacity="0.45" />
            <circle cx="32" cy="26" r="19" fill="none" stroke="#fff" strokeWidth="1.500" opacity="0.8" />
            <path d={spark(32, 26, 8)} fill="#ffe2a3" />
            {[[21, 20], [43, 22], [25, 34], [41, 33], [33, 13]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="1.300" fill="#fff" />
            ))}
            <path d="M24 16q4-5 10-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M14 44h36l4 12H10Z" fill="#7d1f3a" />
            <rect x="12" y="43" width="40" height="4" rx="2" fill="#e6c477" />
          </>
        ),
      },
    ],
  },
  {
    title: "And a little extra",
    items: [
      {
        label: "More presents",
        art: (
          <>
            <rect x="8" y="30" width="26" height="24" rx="2" fill="#c9b6e8" />
            <rect x="19" y="30" width="5" height="24" fill="#fff6e6" />
            <rect x="6" y="25" width="30" height="7" rx="2" fill="#b29bdc" />
            <rect x="32" y="20" width="24" height="34" rx="2" fill="#f2b5c4" />
            <rect x="42" y="20" width="5" height="34" fill="#e6c477" />
            <rect x="30" y="15" width="28" height="7" rx="2" fill="#e79ab5" />
            <path d="M44.500 15c-6-8-12-4-9 0M44.500 15c6-8 12-4 9 0" fill="none" stroke="#e6c477" strokeWidth="2.500" strokeLinecap="round" />
          </>
        ),
      },
      {
        label: "Ribbons",
        art: (
          <>
            <path d="M32 28C18 10 4 16 8 28c3 9 16 6 24 0Z" fill="#f29ab3" />
            <path d="M32 28c14-18 28-12 24 0-3 9-16 6-24 0Z" fill="#e79ab5" />
            <path d="M30 30L18 56l9-5 4 7 4-26ZM34 30l12 26-9-5-4 7-3-26Z" fill="#f2b5c4" />
            <circle cx="32" cy="28" r="5.500" fill="#d9839f" />
          </>
        ),
      },
      {
        label: "Stars and hearts",
        art: (
          <>
            <path d={spark(18, 18, 10)} fill="#ffe2a3" />
            <path d={spark(46, 40, 8)} fill="#fff3dc" />
            <path d={spark(40, 14, 5)} fill="#ffe2a3" />
            <path d={heart(22, 44, 7)} fill="#f29ab3" />
            <path d={heart(48, 22, 4.500)} fill="#f2b5c4" />
            <path d={heart(34, 30, 3.500)} fill="#e79ab5" />
          </>
        ),
      },
    ],
  },
];

const HEARTS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${Math.round(6 + rand(i, 61) * 88)}%`,
  size: `${(0.9 + rand(i, 62) * 1.1).toFixed(2)}rem`,
  duration: `${(6 + rand(i, 63) * 5).toFixed(1)}s`,
  delay: `${(rand(i, 64) * -9).toFixed(1)}s`,
  sway: `${Math.round((rand(i, 65) - 0.5) * 90)}px`,
  gold: i % 3 === 0,
}));

type GiftStage = "arrive" | "give" | "ready" | "untie" | "open" | "reveal" | "joy";

const GIFT_ORDER: GiftStage[] = ["arrive", "give", "ready", "untie", "open", "reveal", "joy"];

function GiftScene({ cue, reduced, onNext }: SceneProps) {
  const later = useLater();
  const [stage, setStage] = useState<GiftStage>("arrive");
  const [walking, setWalking] = useState(false);
  const [shown, setShown] = useState(0);
  const giftSkipped = useRef(false);
  const at = GIFT_ORDER.indexOf(stage);

  // He walks back in with the present and sets it down in front of her.
  useEffect(() => {
    const pause = reduced ? 150 : 650;
    const walk = reduced ? 200 : 1800;
    later(() => { if (!giftSkipped.current) setWalking(true); }, pause);
    later(() => { if (!giftSkipped.current) { setWalking(false); setStage("give"); } }, pause + walk);
    later(() => { if (!giftSkipped.current) setStage("ready"); }, pause + walk + (reduced ? 150 : 650));
  }, [later, reduced]);

  const openGift = () => {
    cue("paper");
    setStage("untie");
    later(() => { cue("chime"); setStage("open"); }, reduced ? 150 : 500);
    later(() => setStage("reveal"), reduced ? 300 : 1300);
  };

  const revealAll = () => {
    cue("click");
    setShown(GIFT_GROUPS.length);
    later(() => { cue("chime"); setStage("joy"); }, reduced ? 200 : 900);
  };

  const celebrating = stage === "joy";
  const tray = stage === "reveal" || stage === "joy";

  return (
    <div className={`scene scene-6 scene-gift${celebrating ? " is-joy" : ""}`}>
      <Night
        illustrationSrc={ILLUSTRATION_SRC}
        art={{
          cut: true,
          gift: true,
          away: stage === "arrive" && !walking,
          walking,
          held: stage === "arrive",
          untied: at >= GIFT_ORDER.indexOf("untie"),
          open: at >= GIFT_ORDER.indexOf("open"),
          mood: celebrating ? "clap" : at >= GIFT_ORDER.indexOf("give") ? "wow" : undefined,
        }}
      />

      {celebrating && (
        <>
          <div className="lift" aria-hidden="true">
            {LIFT.slice(0, 7).map((b) => (
              <span
                key={b.id}
                style={{ left: b.left, animationDuration: b.duration, animationDelay: b.delay, "--sway": b.sway } as CSSProperties}
              >
                <svg width={b.size} height={b.size * 1.9} viewBox="0 0 50 95">
                  <ellipse cx="25" cy="29" rx="23" ry="28" fill={b.color} />
                  <ellipse cx="17" cy="19" rx="6" ry="9" fill="#fff" opacity="0.4" />
                  <path d="M22 56l3 5 3-5Z" fill={b.color} />
                  <path d="M25 61q-5 16 0 34" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.200" />
                </svg>
              </span>
            ))}
          </div>
          <div className="hearts" aria-hidden="true">
            {HEARTS.map((h) => (
              <span
                key={h.id}
                className={h.gold ? "is-gold" : undefined}
                style={{ left: h.left, fontSize: h.size, animationDuration: h.duration, animationDelay: h.delay, "--sway": h.sway } as CSSProperties}
              />
            ))}
          </div>
        </>
      )}

      <div className="cel-text" aria-live="polite">
        {stage === "arrive" && <p className="say warm fade">Wait. There is one more thing.</p>}
        {stage === "give" && <p className="say warm fade">This one is for you.</p>}
        {(stage === "ready" || stage === "untie" || stage === "open") && (
          <p className="say warm say-strong fade">Go on, Muskan. Open it.</p>
        )}
        {stage === "reveal" && <p className="say warm small fade">A little of everything you love.</p>}
        {stage === "joy" && <p className="say warm fade">That smile. That was the plan all along.</p>}
      </div>

      {tray && (
        <div className="gifts">
          {GIFT_GROUPS.map((group, g) => (
            <section key={group.title} className={`gift-card${g < shown ? " on" : ""}`} aria-hidden={g >= shown}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item, i) => (
                  <li key={item.label} style={{ "--i": i } as CSSProperties}>
                    <svg viewBox="0 0 64 64" role="img" aria-label={item.label}>{item.art}</svg>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="cel-controls">
        {(stage === "arrive" || stage === "give") && (
          <button type="button" className="cta cta-quiet cta-small fade" onClick={() => { giftSkipped.current = true; setWalking(false); setStage("ready"); }}>
            Skip ahead
          </button>
        )}
        {stage === "ready" && (
          <button type="button" className="cta cta-warm fade" onClick={openGift}>Open the Gift</button>
        )}
        {stage === "reveal" && shown < GIFT_GROUPS.length && (
          <button type="button" className="cta cta-warm fade" onClick={revealAll}>
            Reveal the surprises
          </button>
        )}
        {stage === "joy" && (
          <button type="button" className="cta cta-warm fade" onClick={onNext}>One last thing</button>
        )}
      </div>
    </div>
  );
}

function FinalMessage({ reduced, onNext }: SceneProps) {
  const total = FINAL_MESSAGE.length + 4;
  const [step, finish] = useSteps(total, 900, reduced);
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the newest line in view as the message writes itself.
  useEffect(() => {
    if (reduced || step < 3) return;
    const box = scroller.current;
    const lines = box?.querySelectorAll(".final > .ln.on, .final-body > .ln.on");
    const newest = lines?.[lines.length - 1];
    if (!box || !newest) return;
    // Only scroll once the newest line would sit low on the screen, so the title is not rushed away.
    if (newest.getBoundingClientRect().bottom > box.clientHeight * 0.78) {
      newest.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [step, reduced]);

  return (
    <div className="scene scene-7" ref={scroller}>
      <Night dim illustrationSrc={ILLUSTRATION_SRC} art={{ cut: true, tease: true }} />
      <NarrationSkip visible={!reduced && step < total} onClick={finish} />
      <div className="final">
        <Ln on={step >= 1}>
          <h1 className="final-title">Happy Birthday, Muskan</h1>
        </Ln>
        <Ln on={step >= 2} className="say warm final-sub">
          To my favourite headache and forever fighting partner.
        </Ln>
        <div className="final-body">
          {FINAL_MESSAGE.map((line, i) => (
            <Ln key={line} on={step >= i + 3} className={i === 0 || i === FINAL_MESSAGE.length - 1 ? "final-line final-em" : "final-line"}>
              {line}
            </Ln>
          ))}
        </div>
        <Ln on={step >= total - 1} className="final-quote">
          <p>Not family by blood,</p>
          <p>just family by annoying each other every day.</p>
        </Ln>
        <Ln on={step >= total} className="row">
          <button type="button" className="cta cta-warm" disabled={step < total} onClick={onNext}>
            Replay our story
          </button>
        </Ln>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const reduced = useReducedMotion();
  const later = useLater();

  const [run, setRun] = useState(0);
  const [scene, setScene] = useState(1);
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [curtain, setCurtain] = useState<"dark" | "warm" | null>(null);
  const [party, setParty] = useState<"closed" | "open" | "leaving">("closed");

  const engine = useRef<SoundEngine | null>(null);
  const sceneRef = useRef(1);
  const busy = useRef(false);
  const partyShown = useRef(false);
  const song = useRef<HTMLAudioElement>(null);
  const hauntedBgm = useRef<HTMLAudioElement>(null);
  const clockHorror = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const ref = engine;
    return () => ref.current?.dispose();
  }, []);

  const cue = useCallback<CueFn>((name) => engine.current?.cue(name), []);

  // Must be called from a click: browsers only allow audio to start from a gesture.
  const enableSound = useCallback(() => {
    if (!engine.current) engine.current = createSound();
    const sound = engine.current;
    sound?.setMuted(false);
    sound?.setMood(SCENE_MOOD[sceneRef.current]);
    if (sceneRef.current === 3) {
      const clockTrack = clockHorror.current;
      if (clockTrack) {
        clockTrack.volume = 0.17;
        void clockTrack.play().catch(() => undefined);
      }
    } else if (sceneRef.current < 5) {
      const track = hauntedBgm.current;
      if (track) {
        track.volume = 0.34;
        void track.play().catch(() => undefined);
      }
    }
    // The MP3 track can still play in browsers without Web Audio; only the
    // synthesized one-shot effects depend on AudioContext.
    return true;
  }, []);

  const toggleSound = () => {
    if (soundOn) {
      engine.current?.setMuted(true);
      hauntedBgm.current?.pause();
      clockHorror.current?.pause();
      setSoundOn(false);
    } else {
      setSoundOn(enableSound());
    }
  };

  const start = (withSound: boolean) => {
    if (withSound) setSoundOn(enableSound());
    setStarted(true);
  };

  // The birthday song (reused from the original Vue project) starts the moment the
  // door clip is over and plays through the celebration and the final message.
  useEffect(() => {
    const audio = song.current;
    if (!audio) return;
    if ((scene >= 5 || party !== "closed") && soundOn) {
      audio.volume = 0.4;
      audio.play().catch(() => undefined);
    } else {
      audio.pause();
      if (scene < 5) audio.currentTime = 0;
    }
  }, [scene, soundOn, party]);

  useEffect(() => {
    const audio = hauntedBgm.current;
    if (!audio) return;
    if (scene < 5 && scene !== 3 && soundOn) {
      audio.volume = 0.34;
      audio.play().catch(() => undefined);
    } else {
      audio.pause();
      if (scene >= 5 || scene === 3) audio.currentTime = 0;
    }
  }, [scene, soundOn]);

  useEffect(() => {
    const audio = clockHorror.current;
    if (!audio) return;
    if (scene === 3 && soundOn) {
      audio.volume = 0.17;
      audio.play().catch(() => undefined);
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [scene, soundOn]);

  // Every scene change goes through a curtain: fade out, swap, fade in.
  const goTo = useCallback(
    (next: number, tone: "dark" | "warm" = "dark") => {
      if (busy.current) return;
      busy.current = true;
      setCurtain(tone);
      cue(next === 5 ? "thud" : "whoosh");
      later(() => {
        sceneRef.current = next;
        setScene(next);
        if (next === 1) {
          setRun((n) => n + 1);
          partyShown.current = false;
        }
        engine.current?.setMood(SCENE_MOOD[next]);
      }, reduced ? 150 : 600);
      later(() => {
        setCurtain(null);
        busy.current = false;
      }, reduced ? 250 : 950);
    },
    [cue, later, reduced],
  );

  // The door clip's `ended` event lands here. The ref guard makes sure the popup can
  // only open once per run, however many times the clip reports it finished.
  const openParty = useCallback(() => {
    if (partyShown.current) return;
    partyShown.current = true;
    setParty("open");
  }, []);

  const continueParty = () => {
    if (party !== "open") return;
    setParty("leaving");
    goTo(5, "warm");
    later(() => setParty("closed"), reduced ? 300 : 700);
  };

  const props = { cue, reduced };
  const warm = scene >= 5;

  return (
    <div
      className={`film ${titleFont.variable} ${proseFont.variable} ${handFont.variable}${warm ? " is-warm" : ""}`}
      data-scene={scene}
      data-party={party !== "closed" || undefined}
    >
      <audio ref={song} src="/audio/happy-birthday.mp3" loop preload="none" />
      <audio ref={hauntedBgm} src="/audio/haunted-bgm.mp3" loop preload="none" />
      <audio ref={clockHorror} src="/audio/clock-horror.wav" preload="none" />

      <main key={`${run}-${scene}`} className="stage" inert={party !== "closed"}>
        {scene === 1 && <Invitation {...props} started={started} onStart={start} onNext={() => goTo(2)} />}
        {scene === 2 && <Corridor {...props} onNext={() => goTo(3)} />}
        {scene === 3 && <MidnightClock {...props} onNext={() => goTo(4)} />}
        {scene === 4 && <ShadowDoor {...props} soundOn={soundOn} onNext={openParty} />}
        {scene === 5 && <Celebration {...props} onNext={() => goTo(6, "warm")} />}
        {scene === 6 && <GiftScene {...props} onNext={() => goTo(7, "warm")} />}
        {scene === 7 && <FinalMessage {...props} onNext={() => goTo(1)} />}
      </main>

      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <div className={`curtain${curtain ? ` on ${curtain}` : ""}`} aria-hidden="true" />

      {party !== "closed" && (
        <PartyPopup cue={cue} reduced={reduced} leaving={party === "leaving"} onContinue={continueParty} />
      )}

      {started && (
        <p className="hud hud-scene" aria-live="polite">
          Scene {String(scene).padStart(2, "0")} <span>/ {String(TOTAL_SCENES).padStart(2, "0")}</span>
        </p>
      )}
      <button
        type="button"
        className="hud hud-sound"
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? "Mute sound" : "Turn sound on"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4Z" fill="currentColor" />
          {soundOn ? (
            <path d="M16 8.500a5 5 0 0 1 0 7M18.500 6a8.500 8.500 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.600" strokeLinecap="round" />
          ) : (
            <path d="M16 9.500l5 5M21 9.500l-5 5" fill="none" stroke="currentColor" strokeWidth="1.600" strokeLinecap="round" />
          )}
        </svg>
        <span>{soundOn ? "Sound on" : "Sound off"}</span>
      </button>
    </div>
  );
}


