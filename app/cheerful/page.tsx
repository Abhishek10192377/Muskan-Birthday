"use client";

import Image from "next/image";
import localFont from "next/font/local";
import "../cheerful.css";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

/* ------------------------------------------------------------------ */
/* Fonts                                                               */
/* ------------------------------------------------------------------ */

// Fonts are stored in app/fonts so the page never needs to reach Google Fonts.
const displayFont = localFont({ src: "../fonts/baloo2-normal.woff2", weight: "400 800", variable: "--font-display" });
const bodyFont = localFont({ src: "../fonts/nunito-normal.woff2", weight: "200 1000", variable: "--font-body" });
const comicFont = localFont({ src: "../fonts/bangers-normal.woff2", weight: "400", variable: "--font-comic" });

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const LETTER_PARAGRAPHS = [
  "Happy Birthday, Muskan! 🎂💗",
  "You are honestly one of those people who can annoy me in two seconds and make me laugh the next moment. 😂",
  "We may keep fighting like Tom and Jerry, pulling each other's legs, and arguing over the silliest things, but that's what makes our bond special.",
  "You are like a sister to me, and I hope your life is always filled with happiness, success, laughter, and lots of KitKat chocolates! 🍫",
  "Never stop smiling, never stop being your crazy Shinchan-loving self, and never stop being the amazing person you are.",
  "Stay happy, keep shining, and have the most beautiful birthday ever! 🎉❤️",
];

const NAV_LINKS = [
  { id: "tom-and-jerry", label: "🐱🐭 Our Fights" },
  { id: "shinchan", label: "🤪 Shinchan Mode" },
  { id: "kitkat", label: "🍫 Chocolate" },
  { id: "message", label: "💌 My Message" },
  { id: "finale", label: "🎉 Last Surprise" },
];

// Palette carried over from birthday-bloom's confetti.
const PARTY_COLORS = ["#e84393", "#a855f7", "#f59e0b", "#38bdf8", "#f97316", "#34d399", "#ffffff"];
const STAR_COLORS = ["#f59e0b", "#fbbf24", "#fcd34d", "#ffffff"];
const CHOCO_COLORS = ["#7b3f00", "#a0522d", "#d2691e", "#ffd166", "#e63946", "#fff1d6"];

const BALLOON_COLORS = ["#ff5c9d", "#a855f7", "#38bdf8", "#ffc93c", "#ff7a59", "#34d399"];
const FLOAT_EMOJI = ["💗", "⭐", "✨", "💜", "🎉", "🌟", "💖", "🍫"];
const RAIN_EMOJI = ["🎂", "💗", "🎉", "✨", "🍫", "🎈", "⭐", "😂"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Deterministic pseudo-random so the server and client render identical decorations.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 1000) / 1000;
};

const BALLOONS = Array.from({ length: 8 }, (_, i) => {
  const duration = 16 + rand(i, 1) * 10;
  return {
    id: i,
    x: Math.round(4 + i * 12.5 + rand(i, 2) * 5),
    color: BALLOON_COLORS[i % BALLOON_COLORS.length],
    size: Math.round(38 + rand(i, 3) * 28),
    duration: `${duration.toFixed(1)}s`,
    delay: `${(-rand(i, 4) * duration).toFixed(1)}s`,
  };
});

const FLOATERS = Array.from({ length: 16 }, (_, i) => {
  const duration = 9 + rand(i, 5) * 9;
  return {
    id: i,
    emoji: FLOAT_EMOJI[i % FLOAT_EMOJI.length],
    left: `${Math.round(rand(i, 6) * 94)}%`,
    top: `${Math.round(rand(i, 7) * 92)}%`,
    size: `${(1 + rand(i, 8) * 1.3).toFixed(2)}rem`,
    duration: `${duration.toFixed(1)}s`,
    delay: `${(-rand(i, 9) * duration).toFixed(1)}s`,
  };
});

const RAIN = Array.from({ length: 18 }, (_, i) => {
  const duration = 3.5 + rand(i, 10) * 3.5;
  return {
    id: i,
    emoji: RAIN_EMOJI[i % RAIN_EMOJI.length],
    left: `${Math.round(2 + rand(i, 11) * 94)}%`,
    size: `${(1.3 + rand(i, 12) * 1.4).toFixed(2)}rem`,
    duration: `${duration.toFixed(1)}s`,
    delay: `${(-rand(i, 13) * duration).toFixed(1)}s`,
  };
});

const CHOCO_PIECES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: `${Math.round(8 + rand(i, 14) * 84)}%`,
  dx: `${Math.round((rand(i, 15) - 0.5) * 120)}px`,
  spin: `${Math.round((rand(i, 16) - 0.5) * 540)}deg`,
  duration: `${(2.4 + rand(i, 17) * 1.8).toFixed(1)}s`,
  delay: `${(rand(i, 18) * 2).toFixed(1)}s`,
  emoji: i % 3 === 0,
}));

// Grapheme-aware splitting (from birthday-bloom's TypeWriter) so emoji never type out half-formed.
const splitGraphemes = (text: string): string[] => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
};

const LETTER = LETTER_PARAGRAPHS.reduce<{ graphemes: string[]; start: number }[]>((acc, text) => {
  const prev = acc[acc.length - 1];
  const start = prev ? prev.start + prev.graphemes.length : 0;
  acc.push({ graphemes: splitGraphemes(text), start });
  return acc;
}, []);
const LETTER_TOTAL = LETTER.reduce((sum, p) => sum + p.graphemes.length, 0);
const LETTER_PAUSES = new Set(LETTER.map((p) => p.start).filter((s) => s > 0));

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

/* ------------------------------------------------------------------ */
/* Confetti (tiny canvas engine, no dependency)                        */
/* ------------------------------------------------------------------ */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  shape: "rect" | "circle" | "star";
  life: number;
  ttl: number;
  gravity: number;
}

interface BurstOptions {
  x?: number;
  y?: number;
  count?: number;
  angle?: number;
  spread?: number;
  power?: number;
  gravity?: number;
  colors?: string[];
  stars?: boolean;
}

const MAX_PARTICLES = 700;

function useConfetti(reduced: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frame = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      particles.current = [];
    };
  }, []);

  const start = useCallback(() => {
    if (frame.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const tick = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scale = canvas.width / width;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const alive: Particle[] = [];
      for (const p of particles.current) {
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life += 1;
        if (p.life >= p.ttl || p.y > height + 40) continue;
        alive.push(p);

        ctx.save();
        ctx.globalAlpha = Math.min(1, (p.ttl - p.life) / (p.ttl * 0.25));
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "star") {
          const r = p.size * 0.8;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const radius = i % 2 === 0 ? r : r * 0.35;
            const a = (i * Math.PI) / 4;
            ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Squash on one axis so the paper appears to tumble.
          ctx.scale(1, Math.cos(p.life * 0.2 + p.rot));
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      particles.current = alive;
      frame.current = alive.length ? requestAnimationFrame(tick) : 0;
    };

    frame.current = requestAnimationFrame(tick);
  }, []);

  const burst = useCallback(
    (options: BurstOptions = {}) => {
      const {
        x = 0.5,
        y = 0.6,
        count = 90,
        angle = -Math.PI / 2,
        spread = Math.PI * 0.8,
        power = 14,
        gravity = 0.3,
        colors = PARTY_COLORS,
        stars = false,
      } = options;
      const mobile = window.innerWidth < 640;
      const total = Math.round(count * (reduced ? 0.2 : mobile ? 0.6 : 1));
      const list = particles.current;

      for (let i = 0; i < total && list.length < MAX_PARTICLES; i++) {
        const a = angle + (Math.random() - 0.5) * spread;
        const speed = power * (0.45 + Math.random() * 0.75);
        list.push({
          x: x * window.innerWidth,
          y: y * window.innerHeight,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          size: (stars ? 7 : 8) + Math.random() * 7,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.35,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: stars ? "star" : Math.random() < 0.25 ? "circle" : "rect",
          life: 0,
          ttl: 110 + Math.random() * 70,
          gravity,
        });
      }
      start();
    },
    [reduced, start],
  );

  return { canvasRef, burst };
}

/* ------------------------------------------------------------------ */
/* Static illustrations (original CSS/SVG characters)                  */
/* ------------------------------------------------------------------ */

const INK = "#2b2145";

const CAKE = (
  <svg viewBox="0 0 240 230" role="img" aria-label="A smiling three-tier birthday cake with lit candles">
    <ellipse cx="120" cy="213" rx="108" ry="11" fill="#fff" opacity="0.9" />
    {/* candles */}
    {[100, 120, 140].map((cx, i) => (
      <g key={cx}>
        <rect x={cx - 3.5} y="24" width="7" height="24" rx="3" fill={["#38bdf8", "#ff5c9d", "#34d399"][i]} />
        <rect x={cx - 3.5} y="31" width="7" height="3" fill="#fff" opacity="0.75" />
        <rect x={cx - 3.5} y="39" width="7" height="3" fill="#fff" opacity="0.75" />
        <g className="flame" style={{ animationDelay: `${i * -0.23}s` }}>
          <ellipse cx={cx} cy="14" rx="5" ry="9" fill="#ff9f1c" />
          <ellipse cx={cx} cy="16.5" rx="2.6" ry="5" fill="#fff3b0" />
        </g>
      </g>
    ))}
    {/* top tier */}
    <rect x="82" y="46" width="76" height="48" rx="10" fill="#ffd166" />
    <path
      d="M82 58v-2a10 10 0 0 1 10-10h56a10 10 0 0 1 10 10v6q-9.500 12-19 0q-9.500-10-19 0q-9.500 14-19 0q-9.500-10-19 0z"
      fill="#fff"
    />
    {/* middle tier */}
    <rect x="55" y="88" width="130" height="58" rx="12" fill="#b388ff" />
    <path
      d="M55 102v-2a12 12 0 0 1 12-12h106a12 12 0 0 1 12 12v8q-6.500 12-13 0q-6.500-10-13 0q-6.500 14-13 0q-6.500-10-13 0q-6.500 12-13 0q-6.500-10-13 0q-6.500 14-13 0q-6.500-10-13 0q-6.500 12-13 0q-6.500-10-13 0z"
      fill="#fff"
    />
    {/* bottom tier */}
    <rect x="30" y="140" width="180" height="72" rx="14" fill="#ff8fb8" />
    <path
      d="M30 154v-2a14 14 0 0 1 14-14h152a14 14 0 0 1 14 14v10q-9 14-18 0q-9-12-18 0q-9 16-18 0q-9-12-18 0q-9 14-18 0q-9-12-18 0q-9 16-18 0q-9-12-18 0q-9 14-18 0q-9-10-18 0z"
      fill="#fff5fb"
    />
    {/* sprinkles */}
    {[
      [70, 128, "#ffd166"], [96, 134, "#ff8fb8"], [122, 126, "#7cf0c5"], [148, 134, "#ffd166"], [170, 127, "#ff8fb8"],
      [98, 80, "#ff5c9d"], [120, 84, "#a855f7"], [142, 79, "#38bdf8"],
      [48, 200, "#fff"], [192, 200, "#fff"], [60, 178, "#ffd166"], [180, 178, "#ffd166"],
    ].map(([cx, cy, fill]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill={fill as string} />
    ))}
    {/* face */}
    <circle cx="100" cy="182" r="4.5" fill="#5b2a4e" />
    <circle cx="140" cy="182" r="4.5" fill="#5b2a4e" />
    <circle cx="101.500" cy="180.500" r="1.400" fill="#fff" />
    <circle cx="141.500" cy="180.500" r="1.400" fill="#fff" />
    <path d="M108 191q12 11 24 0" fill="none" stroke="#5b2a4e" strokeWidth="3" strokeLinecap="round" />
    <circle cx="88" cy="192" r="6.5" fill="#ff5c8a" opacity="0.45" />
    <circle cx="152" cy="192" r="6.5" fill="#ff5c8a" opacity="0.45" />
  </svg>
);

const CAT = (
  <svg viewBox="0 0 200 140" aria-hidden="true">
    <path className="tail" d="M40 80C12 72 8 42 26 30" fill="none" stroke="#6f84b0" strokeWidth="10" strokeLinecap="round" />
    <rect className="leg leg-b" x="54" y="94" width="13" height="38" rx="6.500" fill="#6f84b0" />
    <rect className="leg leg-a" x="124" y="94" width="13" height="38" rx="6.500" fill="#6f84b0" />
    <ellipse cx="94" cy="84" rx="50" ry="26" fill="#7f93bd" />
    <ellipse cx="98" cy="95" rx="34" ry="13" fill="#e6ecf9" />
    <rect className="leg leg-a" x="68" y="96" width="13" height="38" rx="6.500" fill="#7f93bd" />
    <rect className="leg leg-b" x="110" y="96" width="13" height="38" rx="6.500" fill="#7f93bd" />
    <path d="M128 40l3-32 20 21z" fill="#7f93bd" />
    <path d="M154 30l20-20 0 30z" fill="#7f93bd" />
    <path d="M133 34l1-17 11 12z" fill="#ffb3c7" />
    <path d="M160 30l10-10 0 15z" fill="#ffb3c7" />
    <circle cx="152" cy="58" r="30" fill="#7f93bd" />
    <ellipse cx="164" cy="70" rx="17" ry="12" fill="#e6ecf9" />
    <ellipse cx="152" cy="50" rx="7" ry="9" fill="#fff" />
    <ellipse cx="169" cy="48" rx="6" ry="8" fill="#fff" />
    <circle cx="155" cy="51" r="3.600" fill={INK} />
    <circle cx="171.500" cy="49" r="3.200" fill={INK} />
    <path d="M141 35l19 7M164 41l14-7" fill="none" stroke={INK} strokeWidth="3.500" strokeLinecap="round" />
    <ellipse cx="179" cy="63" rx="4.500" ry="3.200" fill="#ff6b8b" />
    <path d="M156 74q10 14 20 1z" fill="#7a1f3d" />
    <path d="M160 75l3 5 3-5zM167 75l3 4 2-4z" fill="#fff" />
    <path d="M172 68l22-6M172 71l23 1M171 74l21 8" fill="none" stroke={INK} strokeWidth="1.200" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const MOUSE = (
  <svg viewBox="0 0 120 90" aria-hidden="true">
    <path className="tail" d="M24 60C5 58 2 40 14 33" fill="none" stroke="#b9763d" strokeWidth="3.500" strokeLinecap="round" />
    <rect className="leg leg-b" x="38" y="64" width="7" height="18" rx="3.500" fill="#b9763d" />
    <rect className="leg leg-a" x="78" y="64" width="7" height="18" rx="3.500" fill="#b9763d" />
    <ellipse cx="58" cy="56" rx="30" ry="18" fill="#c98a4b" />
    <ellipse cx="62" cy="63" rx="20" ry="9" fill="#f6dcbd" />
    <rect className="leg leg-a" x="47" y="66" width="7" height="18" rx="3.500" fill="#c98a4b" />
    <rect className="leg leg-b" x="69" y="66" width="7" height="18" rx="3.500" fill="#c98a4b" />
    <circle cx="78" cy="24" r="13" fill="#c98a4b" />
    <circle cx="78" cy="24" r="8" fill="#ffb3c7" />
    <circle cx="99" cy="22" r="12" fill="#c98a4b" />
    <circle cx="99" cy="22" r="7" fill="#ffb3c7" />
    <circle cx="90" cy="44" r="19" fill="#c98a4b" />
    <ellipse cx="104" cy="50" rx="10" ry="7" fill="#f6dcbd" />
    <circle cx="113" cy="47" r="3" fill="#3b2b2b" />
    <ellipse cx="93" cy="40" rx="4" ry="5.500" fill="#fff" />
    <circle cx="94.500" cy="41" r="2.300" fill={INK} />
    <path d="M86 32q7-5 13 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    <path d="M96 54q6 5 12 0" fill="none" stroke={INK} strokeWidth="1.800" strokeLinecap="round" />
    <path d="M100 56q3 8 7 1z" fill="#ff6b8b" />
    <path d="M106 50l12-4M106 52l12 2" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const KID = (
  <svg viewBox="0 0 200 280" aria-hidden="true">
    <ellipse className="kid-shadow" cx="100" cy="270" rx="50" ry="7" fill="#000" opacity="0.16" />
    <g className="kid-body">
      <rect x="78" y="216" width="16" height="42" rx="8" fill="#ffd9b3" />
      <rect x="106" y="216" width="16" height="42" rx="8" fill="#ffd9b3" />
      <ellipse cx="82" cy="259" rx="15" ry="7.500" fill="#fff" stroke={INK} strokeWidth="2.500" />
      <ellipse cx="118" cy="259" rx="15" ry="7.500" fill="#fff" stroke={INK} strokeWidth="2.500" />
      <g className="kid-arm kid-arm-l">
        <path d="M68 154L34 122" fill="none" stroke="#ffd9b3" strokeWidth="14" strokeLinecap="round" />
        <circle cx="34" cy="122" r="9.500" fill="#ffd9b3" />
      </g>
      <g className="kid-arm kid-arm-r">
        <path d="M132 154L166 122" fill="none" stroke="#ffd9b3" strokeWidth="14" strokeLinecap="round" />
        <circle cx="166" cy="122" r="9.500" fill="#ffd9b3" />
      </g>
      <rect x="66" y="188" width="68" height="38" rx="12" fill="#ffd23f" />
      <rect x="62" y="138" width="76" height="62" rx="22" fill="#ff4d4d" />
      <g className="kid-head">
        <circle cx="45" cy="102" r="8.500" fill="#ffd9b3" />
        <circle cx="155" cy="102" r="8.500" fill="#ffd9b3" />
        <ellipse cx="100" cy="94" rx="56" ry="50" fill="#ffd9b3" />
        <ellipse cx="130" cy="114" rx="29" ry="22" fill="#ffd9b3" />
        <path d="M46 88C46 40 154 40 154 88C140 68 60 68 46 88Z" fill={INK} />
        <g className="kid-brows">
          <path d="M63 86q12-12 25 0M108 86q12-12 25 0" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        </g>
        <circle cx="77" cy="100" r="5.500" fill={INK} />
        <circle cx="121" cy="100" r="5.500" fill={INK} />
        <circle cx="79" cy="98" r="1.700" fill="#fff" />
        <circle cx="123" cy="98" r="1.700" fill="#fff" />
        <ellipse cx="64" cy="117" rx="9" ry="6" fill="#ff8fa3" opacity="0.6" />
        <ellipse cx="140" cy="119" rx="9" ry="6" fill="#ff8fa3" opacity="0.6" />
        <path d="M84 118q19 24 38 0z" fill="#8c1c3a" />
        <ellipse cx="103" cy="128" rx="8" ry="4" fill="#ff6b8b" />
        <path d="M80 52L100 8L120 52Z" fill="#7c4dff" />
        <path d="M88 36l22 6M93 24l12 4" fill="none" stroke="#ffd23f" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="8" r="7" fill="#ff5c9d" />
      </g>
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Typewriter letter (kept as its own component so each keystroke only  */
/* re-renders the letter, not the whole page)                          */
/* ------------------------------------------------------------------ */

function TypedLetter({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [typed, setTyped] = useState(0);

  const shown = reduced ? LETTER_TOTAL : typed;
  const done = shown >= LETTER_TOTAL;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setStarted(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || typed >= LETTER_TOTAL) return;
    const id = window.setTimeout(
      () => setTyped((count) => count + 1),
      LETTER_PAUSES.has(typed) ? 420 : 26,
    );
    return () => window.clearTimeout(id);
  }, [started, typed]);

  return (
    <div ref={ref} className="letter">
      <div className="sr-only">
        {LETTER_PARAGRAPHS.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
      <div aria-hidden="true">
        {LETTER.map(({ graphemes, start }, i) => {
          const count = Math.max(0, Math.min(graphemes.length, shown - start));
          const active = !done && shown >= start && shown < start + graphemes.length;
          return (
            <p key={start} className={i === 0 ? "letter-hello" : undefined}>
              {graphemes.slice(0, count).join("")}
              {active && <span className="caret" />}
              {/* The untyped remainder stays in the flow, invisible, so the card never changes size. */}
              <span className="ghost">{graphemes.slice(count).join("")}</span>
            </p>
          );
        })}
        <p className={`letter-sign${done ? " is-in" : ""}`}>— Your annoying partner, forever 😜</p>
      </div>
      {!reduced && (
        <div className="letter-actions">
          {done ? (
            <button type="button" className="btn btn-ghost" onClick={() => setTyped(0)}>
              Read It Again 🔁
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setTyped(LETTER_TOTAL)}>
              Skip the Typing ⏩
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CheerfulBirthday() {
  const reduced = useReducedMotion();
  const { canvasRef, burst } = useConfetti(reduced);

  const [opened, setOpened] = useState(false);
  const [flash, setFlash] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [unwrapped, setUnwrapped] = useState(false);
  const [finaleOpen, setFinaleOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const finaleOpenerRef = useRef<HTMLElement | null>(null);
  const timers = useRef(new Set<number>());

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const scrollToId = useCallback(
    (id: string) => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    },
    [reduced],
  );

  // Two side cannons plus a star burst, adapted from birthday-bloom's cinematic celebration.
  const celebrate = useCallback(() => {
    burst({ x: 0, y: 0.9, angle: -Math.PI / 3, spread: 0.9, power: 20, count: 80 });
    burst({ x: 1, y: 0.9, angle: (-2 * Math.PI) / 3, spread: 0.9, power: 20, count: 80 });
    later(() => {
      burst({ x: 0.5, y: 0.4, spread: Math.PI * 2, power: 11, count: 45, colors: STAR_COLORS, stars: true, gravity: 0.16 });
      burst({ x: 0.5, y: 0.4, spread: Math.PI * 2, power: 13, count: 70 });
    }, 250);
  }, [burst, later]);

  const grandFinale = useCallback(() => {
    celebrate();
    for (let i = 1; i <= 7; i++) {
      later(() => {
        burst({ x: 0.15 + Math.random() * 0.7, y: 0.2 + Math.random() * 0.3, spread: Math.PI * 2, power: 12, count: 60 });
        burst({ x: Math.random(), y: -0.02, angle: Math.PI / 2, spread: 1.2, power: 6, count: 24, colors: STAR_COLORS, stars: true, gravity: 0.12 });
      }, i * 650);
    }
  }, [burst, celebrate, later]);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => undefined);
    else audio.pause();
  };

  const openSurprise = () => {
    if (!opened) {
      setOpened(true);
      if (!reduced) setFlash(true);
      audioRef.current?.play().catch(() => undefined);
    }
    celebrate();
    later(() => scrollToId("surprise"), opened ? 0 : 750);
  };

  const toggleChocolate = () => {
    if (!unwrapped) {
      later(() => {
        burst({ x: 0.5, y: 0.65, power: 15, count: 110, colors: CHOCO_COLORS });
        burst({ x: 0.5, y: 0.6, spread: Math.PI * 2, power: 9, count: 30, colors: STAR_COLORS, stars: true, gravity: 0.15 });
      }, 350);
    }
    setUnwrapped((value) => !value);
  };

  const openFinale = () => {
    finaleOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFinaleOpen(true);
    grandFinale();
  };

  const closeFinale = useCallback(() => {
    clearTimers();
    setFinaleOpen(false);
    finaleOpenerRef.current?.focus();
  }, [clearTimers]);

  // Fade sections in as they scroll into view.
  useEffect(() => {
    const root = rootRef.current;
    if (!opened || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.in = "true";
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12 },
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [opened]);

  useEffect(() => {
    if (!finaleOpen) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFinale();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = finaleRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finaleOpen, closeFinale]);

  return (
    <div
      ref={rootRef}
      className={`bd ${displayFont.variable} ${bodyFont.variable} ${comicFont.variable}`}
    >
      {/* ---------- fixed decorations ---------- */}
      <div className="bg" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        {BALLOONS.map((b) => (
          <div
            key={b.id}
            className="rise"
            style={{ left: `${b.x}%`, animationDuration: b.duration, animationDelay: b.delay }}
          >
            <svg width={b.size} height={b.size * 1.6} viewBox="0 0 50 80">
              <defs>
                <radialGradient id={`balloon-${b.id}`} cx="30%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
                  <stop offset="100%" stopColor={b.color} />
                </radialGradient>
              </defs>
              <ellipse cx="25" cy="25" rx="22" ry="25" fill={`url(#balloon-${b.id})`} />
              <ellipse cx="18" cy="18" rx="5" ry="7" fill="#fff" opacity="0.35" />
              <polygon points="22,48 25,54 28,48" fill={b.color} />
              <path d="M25,54 Q20,65 25,80" stroke="rgba(255,255,255,0.7)" fill="none" strokeWidth="1.500" />
            </svg>
          </div>
        ))}
        {FLOATERS.map((f) => (
          <span
            key={f.id}
            className="floater"
            style={{
              left: f.left,
              top: f.top,
              fontSize: f.size,
              animationDuration: f.duration,
              animationDelay: f.delay,
            }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      <canvas ref={canvasRef} className="confetti" aria-hidden="true" />
      {flash && <div className="flash" aria-hidden="true" onAnimationEnd={() => setFlash(false)} />}

      <audio
        ref={audioRef}
        src="/audio/happy-birthday.mp3"
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        className={`music${playing ? " is-playing" : ""}`}
        onClick={toggleMusic}
        aria-pressed={playing}
        aria-label={playing ? "Pause the birthday song" : "Play the birthday song"}
        title={playing ? "Pause the birthday song" : "Play the birthday song"}
      >
        <span>{playing ? "🎵" : "🔇"}</span>
      </button>

      <main className="main">
        {/* ---------- hero ---------- */}
        <header id="top" className="hero">
          <div className="bunch bunch-l" aria-hidden="true">
            <Image src="/img/ballon1.svg" alt="" width={839} height={727} />
            <Image src="/img/ballon2.svg" alt="" width={839} height={727} />
            <Image src="/img/ballon3.svg" alt="" width={839} height={727} />
          </div>
          <div className="bunch bunch-r" aria-hidden="true">
            <Image src="/img/ballon1.svg" alt="" width={839} height={727} />
            <Image src="/img/ballon2.svg" alt="" width={839} height={727} />
            <Image src="/img/ballon3.svg" alt="" width={839} height={727} />
          </div>

          <div className="hero-inner">
            <p className="eyebrow">✨ A little something, made only for you ✨</p>
            <div className="cake">
              <span className="spark spark-1">✨</span>
              <span className="spark spark-2">⭐</span>
              <span className="spark spark-3">💖</span>
              <span className="spark spark-4">✨</span>
              {CAKE}
            </div>
            <h1 className="title">
              Happy Birthday, <span className="title-name">Muskan!</span> 🎂🎉
            </h1>
            <p className="lead">
              To my favourite partner in crime, my forever fighting buddy, and my sister by heart! 💗
            </p>
            <button type="button" className="btn btn-xl btn-pulse" onClick={openSurprise}>
              Open Your Birthday Surprise 🎁
            </button>
            <p className="hint">
              {opened ? "Opened! Scroll down, there's more 👇" : "Psst… tap the button. Sound on! 🔊"}
            </p>
          </div>
        </header>

        {opened && (
          <>
            {/* ---------- surprise reveal ---------- */}
            <section id="surprise" className="sec">
              <div className="card card-glass surprise" data-reveal>
                <Image className="hat" src="/img/hat.svg" alt="" width={582} height={930} aria-hidden="true" />
                <p className="kicker">Surprise! 🥳</p>
                <h2>It&apos;s Officially Muskan Day!</h2>
                <p>
                  No gift wrap, no ribbon — just a whole page built for the one person who can start a fight
                  over literally nothing. Scroll on for a cat-and-mouse chase, some Shinchan-style madness,
                  chocolate, and one message I&apos;d never say to your face. 😌
                </p>
                <nav className="chips" aria-label="Jump to a section">
                  {NAV_LINKS.map((link) => (
                    <button key={link.id} type="button" className="chip" onClick={() => scrollToId(link.id)}>
                      {link.label}
                    </button>
                  ))}
                </nav>
                <button type="button" className="btn btn-sun" onClick={celebrate}>
                  Throw More Confetti 🎊
                </button>
              </div>
            </section>

            {/* ---------- tom & jerry ---------- */}
            <section id="tom-and-jerry" className="sec">
              <div className="card card-tj" data-reveal>
                <p className="kicker">Episode 1 · Our Never-Ending Fights</p>
                <h2>Muskan &amp; Me: The Real Tom and Jerry! 🐱🐭</h2>

                <div className="tj-stage" role="img" aria-label="A cartoon cat chasing a cheeky mouse back and forth across a room">
                  <span className="tj-frame">🧀</span>
                  <span className="tj-sign">Home Sweet Fight</span>
                  <span className="tj-hole" />
                  <span className="tj-zoom">ZOOM!</span>
                  <div className="chase">
                    <div className="chase-flip">
                      <div className="caps">
                        <div className="cap cap-cat">
                          <span className="cap-a">Stop annoying me!</span>
                          <span className="cap-b">Come back here!!</span>
                        </div>
                        <div className="cap cap-mouse">
                          <span className="cap-a">Catch me if you can!</span>
                          <span className="cap-b">Too slow! 😜</span>
                        </div>
                      </div>
                      <div className="runners">
                        <div className="cat">{CAT}</div>
                        <div className="mouse">{MOUSE}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="duo">
                  <p className="note note-blue">
                    We fight over the smallest things, tease each other for no reason, and never miss a chance
                    to annoy each other. 😂
                  </p>
                  <p className="note note-pink">
                    But just like Tom and Jerry, no matter how much we fight, our bond is special. You are not
                    just my fighting partner; you are my sister by heart! ❤️
                  </p>
                </div>
              </div>
            </section>

            {/* ---------- shinchan ---------- */}
            <section id="shinchan" className="sec">
              <div className="card card-shin" data-reveal>
                <div className={`shin-stage${turbo ? " is-turbo" : ""}`}>
                  <span className="shin-rays" aria-hidden="true" />
                  <span className="shin-word shin-word-1" aria-hidden="true">HEHE!</span>
                  <span className="shin-word shin-word-2" aria-hidden="true">BOING!</span>
                  <span className="shin-star shin-star-1" aria-hidden="true">⭐</span>
                  <span className="shin-star shin-star-2" aria-hidden="true">🌟</span>
                  <span className="shin-star shin-star-3" aria-hidden="true">✨</span>
                  <svg className="shin-doodle shin-doodle-1" viewBox="0 0 80 24" aria-hidden="true">
                    <path d="M4 12l9-8 9 16 9-16 9 16 9-16 9 16 9-16 9 8" fill="none" stroke="#2b2145" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <svg className="shin-doodle shin-doodle-2" viewBox="0 0 50 50" aria-hidden="true">
                    <path d="M25 25c0-5 8-5 8 2s-12 9-15 0 6-19 17-14 12 22 0 28" fill="none" stroke="#2b2145" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  <p className="shin-bubble">Happy Birthday, Muskan! 😜</p>
                  <div className="kid" role="img" aria-label="A cheeky cartoon kid in a party hat doing a silly dance">
                    {KID}
                  </div>
                </div>

                <div className="shin-copy">
                  <p className="kicker">Episode 2 · Her Favourite Cartoon</p>
                  <h2>Shinchan Mode: ON! 🤪</h2>
                  <p>Because every birthday deserves a little Shinchan-style madness! 😂🎉</p>
                  <button
                    type="button"
                    className="btn btn-comic"
                    onClick={() => setTurbo((value) => !value)}
                    aria-pressed={turbo}
                  >
                    {turbo ? "Okay, Calm Down! 😵‍💫" : "Dance Faster! 💃"}
                  </button>
                </div>
              </div>
            </section>

            {/* ---------- kitkat ---------- */}
            <section id="kitkat" className="sec">
              <div className="card card-choc" data-reveal>
                <div className="choc-copy">
                  <p className="kicker">Episode 3 · Chocolate Break</p>
                  <h2>Have a Break, Have a KitKat! 🍫</h2>
                  <p>Fights can wait. Arguments can wait. Even annoying me can wait.</p>
                  <p>
                    Today, your only responsibility is to enjoy your birthday, eat your favourite chocolate,
                    and smile! 😎💗
                  </p>
                  <button type="button" className="btn btn-choc" onClick={toggleChocolate} aria-expanded={unwrapped}>
                    {unwrapped ? "Wrap It Back Up 🔁" : "Unwrap Your Chocolate 🎁"}
                  </button>
                </div>

                <div className={`choc-scene${unwrapped ? " is-open" : ""}`}>
                  <div className="choc-float">
                    <div className="choc-bar" aria-hidden="true">
                      <span className="finger" />
                      <span className="finger" />
                      <span className="finger" />
                      <span className="finger" />
                    </div>
                    <div className="choc-wrapper" aria-hidden="true">
                      <span className="choc-label">Birthday Break</span>
                      <span className="choc-sub">4 fingers of pure happiness</span>
                    </div>
                  </div>
                  {unwrapped &&
                    CHOCO_PIECES.map((piece) => (
                      <span
                        key={piece.id}
                        className={`piece${piece.emoji ? " piece-emoji" : ""}`}
                        aria-hidden="true"
                        style={
                          {
                            left: piece.left,
                            animationDuration: piece.duration,
                            animationDelay: piece.delay,
                            "--dx": piece.dx,
                            "--spin": piece.spin,
                          } as CSSProperties
                        }
                      >
                        {piece.emoji ? "🍫" : ""}
                      </span>
                    ))}
                  <p className="choc-msg" aria-live="polite">
                    {unwrapped && (
                      <span>
                        Officially 100% yours. Sharing with me is optional… but highly recommended! 😜🍫
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* ---------- message ---------- */}
            <section id="message" className="sec">
              <div className="card card-letter" data-reveal>
                <p className="kicker">Episode 4 · The Serious Bit (Don&apos;t Get Used to It)</p>
                <h2>One Little Message From Your Annoying Partner ❤️</h2>
                <TypedLetter reduced={reduced} />
              </div>
            </section>

            {/* ---------- finale ---------- */}
            <section id="finale" className="sec sec-last">
              <div className="card card-finale" data-reveal>
                <p className="kicker">Wait, don&apos;t go yet…</p>
                <h2>There&apos;s One More Thing 🎈</h2>
                <button type="button" className="btn btn-xl btn-pulse" onClick={openFinale}>
                  One Last Surprise! 🎉
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => scrollToId("top")}>
                  Back to the Top ⬆️
                </button>
              </div>
              <p className="foot">Made with 💗, plenty of teasing, and zero apologies — by your Tom-and-Jerry partner.</p>
            </section>
          </>
        )}
      </main>

      {/* ---------- full-screen finale ---------- */}
      {finaleOpen && (
        <div ref={finaleRef} className="finale" role="dialog" aria-modal="true" aria-labelledby="finale-title">
          <div className="rain" aria-hidden="true">
            {RAIN.map((drop) => (
              <span
                key={drop.id}
                style={{
                  left: drop.left,
                  fontSize: drop.size,
                  animationDuration: drop.duration,
                  animationDelay: drop.delay,
                }}
              >
                {drop.emoji}
              </span>
            ))}
          </div>
          <div className="finale-card">
            <p className="finale-emoji" aria-hidden="true">🎂</p>
            <h2 id="finale-title">Once Again, Happy Birthday, Muskan! 🎂💗</h2>
            <p>Keep smiling, keep annoying me, and stay my forever Tom-and-Jerry partner! 😂❤️</p>
            <div className="finale-actions">
              <button type="button" className="btn btn-sun" onClick={grandFinale}>
                Celebrate Again 🎊
              </button>
              <button ref={closeRef} type="button" className="btn btn-ghost btn-light" onClick={closeFinale}>
                Close ✖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


