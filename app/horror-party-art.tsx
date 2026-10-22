"use client";

import { useState, type CSSProperties } from "react";

const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 1000) / 1000;
};

const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  cx: Math.round(rand(i, 31) * 1600),
  cy: Math.round(rand(i, 32) * 500),
  r: Math.round((0.8 + rand(i, 33) * 1.6) * 10) / 10,
  delay: `${(rand(i, 34) * -6).toFixed(1)}s`,
}));

const FIREFLIES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  cx: Math.round(540 + rand(i, 35) * 520),
  cy: Math.round(470 + rand(i, 36) * 330),
  duration: `${(7 + rand(i, 37) * 7).toFixed(1)}s`,
  delay: `${(rand(i, 38) * -10).toFixed(1)}s`,
}));

const PETALS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: `${Math.round(rand(i, 39) * 100)}%`,
  size: `${Math.round(9 + rand(i, 40) * 9)}px`,
  duration: `${(9 + rand(i, 41) * 9).toFixed(1)}s`,
  delay: `${(rand(i, 42) * -16).toFixed(1)}s`,
  sway: `${Math.round((rand(i, 43) - 0.3) * 160)}px`,
}));

const BLOSSOMS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  cx: Math.round(290 + rand(i, 44) * 360),
  cy: Math.round(255 + rand(i, 45) * 210 - rand(i, 44) * 40),
  r: Math.round(11 + rand(i, 46) * 17),
  fill: ["#f4b6c8", "#e79ab5", "#fbd3df", "#d9839f"][i % 4],
}));

const LANTERNS = [240, 420, 600, 780, 1000, 1180, 1360].map((x, i) => {
  const u = (x - 800) / 800;
  return { x, y: Math.round(20 + 60 * (1 - u * u)), delay: `${(i * -0.7).toFixed(1)}s` };
});

const FAIRY = Array.from({ length: 16 }, (_, i) => {
  const t = (i + 0.5) / 16;
  return {
    id: i,
    cx: Math.round(500 + 600 * t),
    cy: Math.round(400 + 240 * t * (1 - t)) + 7,
    fill: ["#ffe2a3", "#ffc9a8", "#ffd6de"][i % 3],
  };
});

const LIFT_COLORS = ["#f2b5c4", "#f6e2b3", "#c9b6e8", "#f7c7a3", "#bfe0d6"];

export const LIFT = Array.from({ length: 11 }, (_, i) => ({
  id: i,
  left: `${Math.round(4 + rand(i, 51) * 88)}%`,
  size: Math.round(40 + rand(i, 52) * 26),
  color: LIFT_COLORS[i % LIFT_COLORS.length],
  duration: `${(8 + rand(i, 53) * 5).toFixed(1)}s`,
  delay: `${(rand(i, 54) * 4).toFixed(1)}s`,
  sway: `${Math.round((rand(i, 55) - 0.5) * 80)}px`,
}));

export const CONFETTI = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  left: `${Math.round(rand(i, 56) * 100)}%`,
  color: ["#f2b5c4", "#ffd98a", "#c9b6e8", "#fff3dc", "#f0a878", "#bfe0d6"][i % 6],
  duration: `${(4 + rand(i, 57) * 4).toFixed(1)}s`,
  delay: `${(rand(i, 58) * -8).toFixed(1)}s`,
  sway: `${Math.round((rand(i, 59) - 0.5) * 140)}px`,
  round: i % 4 === 0,
}));

/* --- The two characters. Hand-drawn cartoon versions of the two of them, based on
   the photos supplied for the project. Each takes a pose so the same drawing is
   used, unchanged, in every stage of the celebration and in the final scene. --- */

const HER_SKIN = "#eec2a2";
const HIS_SKIN = "#b98a66";
const HIS_SHIRT = "#30343f";

type HerPose = "idle" | "blow" | "cut" | "wow" | "clap";
type HisPose = "carry" | "rest" | "tease";

// Muskan: long dark hair over one shoulder, round glasses, plaid shirt, dark jeans.
function Her({ pose }: { pose: HerPose }) {
  return (
    <g className={`her her-${pose}`}>
      <rect x="687" y="730" width="25" height="104" rx="11" fill="#2f3540" />
      <rect x="714" y="730" width="25" height="104" rx="11" fill="#353c48" />
      <ellipse cx="699" cy="838" rx="17" ry="9" fill="#f3f1ec" />
      <ellipse cx="727" cy="838" rx="17" ry="9" fill="#f3f1ec" />
      <g className="her-top">
        <path d="M674 600C664 640 664 700 676 744H752C760 700 760 640 750 600Z" fill="#1e1518" />
        <rect x="704" y="630" width="17" height="26" fill={HER_SKIN} />
        <path d="M670 744C668 690 680 656 712 652 744 656 756 690 754 744Z" fill="url(#plaid)" />
        <path d="M696 654l16 16 16-16-6-6h-20Z" fill="#cdb48c" />
        <path d="M712 670v72" stroke="#9a7650" strokeWidth="1.500" opacity="0.7" />
        <path d="M679 668C672 680 672 694 676 706" fill="none" stroke="#d3bb95" strokeWidth="19" strokeLinecap="round" />
        <path d="M745 668C752 680 752 694 748 706" fill="none" stroke="#d3bb95" strokeWidth="19" strokeLinecap="round" />
        {pose === "clap" ? (
          <>
            {/* both hands up in front of her, clapping */}
            <g className="clap-l">
              <path d="M676 706C684 700 694 692 702 686" fill="none" stroke={HER_SKIN} strokeWidth="11" strokeLinecap="round" />
              <circle cx="705" cy="683" r="9" fill={HER_SKIN} />
            </g>
            <g className="clap-r">
              <path d="M748 706C740 700 730 692 722 686" fill="none" stroke={HER_SKIN} strokeWidth="11" strokeLinecap="round" />
              <circle cx="719" cy="683" r="9" fill={HER_SKIN} />
            </g>
          </>
        ) : (
          <>
            <path d="M677 708C682 722 694 730 708 732" fill="none" stroke={HER_SKIN} strokeWidth="11" strokeLinecap="round" />
            {pose !== "cut" && (
              <path d="M747 708C742 722 730 730 716 732" fill="none" stroke={HER_SKIN} strokeWidth="11" strokeLinecap="round" />
            )}
            <circle cx={pose === "cut" ? 708 : 712} cy="733" r="9" fill={HER_SKIN} />
          </>
        )}
        <circle cx="712" cy="600" r="40" fill={HER_SKIN} />
        <path d="M669 608C658 534 766 534 755 608 750 590 734 580 716 579 706 586 688 592 669 608Z" fill="#1e1518" />
        <path d="M671 600C659 640 659 700 667 742 675 746 687 746 695 742 689 700 687 656 685 628 680 616 675 608 671 600Z" fill="#1e1518" />
        <path d="M672 630c-4 38-2 74 4 106M681 640c-1 34 0 66 4 96" fill="none" stroke="#4b3340" strokeWidth="2" strokeLinecap="round" />
        <circle cx="752" cy="612" r="2.600" fill="#e6c36a" />
        <ellipse cx="690" cy="620" rx="8" ry="5" fill="#f2a4a0" opacity="0.5" />
        <ellipse cx="736" cy="620" rx="8" ry="5" fill="#f2a4a0" opacity="0.5" />
        <ellipse cx="698" cy="606" rx="3.400" ry="4.200" fill="#241a1c" />
        <ellipse cx="728" cy="606" rx="3.400" ry="4.200" fill="#241a1c" />
        <path
          d="M690 591q8-4 15 0M721 591q8-4 15 0"
          fill="none"
          stroke="#241a1c"
          strokeWidth="2"
          strokeLinecap="round"
          transform={pose === "wow" || pose === "clap" ? "translate(0 -4)" : undefined}
        />
        {pose === "clap" && (
          <g className="eye-spark" fill="#fff">
            <path d="M703 599l1.200 3 3 1.200-3 1.200-1.200 3-1.200-3-3-1.200 3-1.200Z" />
            <path d="M733 599l1.200 3 3 1.200-3 1.200-1.200 3-1.200-3-3-1.200 3-1.200Z" />
          </g>
        )}
        <circle cx="698" cy="606" r="13.500" fill="#fff" fillOpacity="0.14" stroke="#5a463e" strokeWidth="2.400" />
        <circle cx="728" cy="606" r="13.500" fill="#fff" fillOpacity="0.14" stroke="#5a463e" strokeWidth="2.400" />
        <path d="M711.500 604q1.500-2 3 0M684.500 604l-9-3M741.500 604l9-3" fill="none" stroke="#5a463e" strokeWidth="2.200" strokeLinecap="round" />
        {pose === "blow" ? (
          <ellipse cx="716" cy="627" rx="3.600" ry="4.600" fill="#8c3b3b" />
        ) : pose === "wow" || pose === "clap" ? (
          <path d="M701 622q12 15 24 0Z" fill="#8c3b3b" />
        ) : (
          <path d="M702 625q11 8 22 0" fill="none" stroke="#b0564e" strokeWidth="2.600" strokeLinecap="round" />
        )}
      </g>
    </g>
  );
}

// Her arm with the cake knife. Drawn after the cake so the blade passes in front of it.
const KNIFE_ARM = (
  <g className="knife-arm">
    <path d="M748 706C762 702 782 690 802 680" fill="none" stroke={HER_SKIN} strokeWidth="11" strokeLinecap="round" />
    <circle cx="806" cy="678" r="9" fill={HER_SKIN} />
    <g transform="rotate(5 816 680)">
      <rect x="812" y="664" width="8" height="22" rx="3" fill="#3a2a22" />
      <rect x="811" y="684" width="10" height="4" fill="#c9a45c" />
      <path d="M813 688h6l1 32-4 9-4-9Z" fill="#e3e8ee" />
    </g>
  </g>
);

// Him: neat side-swept hair with faded sides, light stubble with a pointed goatee and
// thin moustache, dark grey checked shirt with a chest pocket, black trousers, black
// bracelet and red kalawa.
function Him({ pose }: { pose: HisPose }) {
  return (
    <g className="him">
      <rect className="leg-a" x="861" y="730" width="26" height="106" rx="11" fill="#1c1c20" />
      <rect className="leg-b" x="889" y="730" width="26" height="106" rx="11" fill="#232328" />
      <ellipse className="leg-a" cx="873" cy="840" rx="18" ry="9" fill="#0f0f11" />
      <ellipse className="leg-b" cx="903" cy="840" rx="18" ry="9" fill="#0f0f11" />
      <rect x="879" y="622" width="18" height="28" fill={HIS_SKIN} />
      <path d="M842 744C840 686 854 650 888 646 922 650 936 686 934 744Z" fill="url(#darkplaid)" />
      <path d="M870 648l18 18 18-18-7-6h-22Z" fill="#262a33" />
      <path d="M888 666v76" stroke="#1b1e25" strokeWidth="2" />
      <circle cx="888" cy="684" r="1.600" fill="#9aa0ac" />
      <circle cx="888" cy="706" r="1.600" fill="#9aa0ac" />
      {pose === "carry" ? (
        <>
          <path d="M852 674C846 686 846 696 850 704" fill="none" stroke={HIS_SHIRT} strokeWidth="19" strokeLinecap="round" />
          <path d="M924 674C930 686 930 696 926 704" fill="none" stroke={HIS_SHIRT} strokeWidth="19" strokeLinecap="round" />
          <path d="M850 706C852 716 858 722 868 724M926 706C924 716 918 722 908 724" fill="none" stroke={HIS_SKIN} strokeWidth="12" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* in the tease pose his other arm is up behind her, drawn separately */}
          {pose !== "tease" && (
            <>
              <path d="M851 672C844 684 844 698 848 708" fill="none" stroke={HIS_SHIRT} strokeWidth="19" strokeLinecap="round" />
              <path d="M849 710C852 722 858 730 868 734" fill="none" stroke={HIS_SKIN} strokeWidth="12" strokeLinecap="round" />
              <path d="M851 718l10-5" stroke="#111" strokeWidth="5" strokeLinecap="round" />
              <circle cx="870" cy="735" r="9" fill={HIS_SKIN} />
            </>
          )}
          <path d="M925 670C932 684 932 698 928 708" fill="none" stroke={HIS_SHIRT} strokeWidth="19" strokeLinecap="round" />
          <path d="M927 710C924 722 918 730 908 734" fill="none" stroke={HIS_SKIN} strokeWidth="12" strokeLinecap="round" />
          <path d="M915 713l10 5" stroke="#c22a3c" strokeWidth="3" strokeLinecap="round" />
          <circle cx="906" cy="735" r="9" fill={HIS_SKIN} />
        </>
      )}
      {/* shirt pocket with the little logo */}
      <rect x="896" y="676" width="20" height="18" rx="2" fill="none" stroke="#1b1e25" strokeWidth="1.600" />
      <rect x="903" y="679" width="6" height="3" fill="#f2f2f2" />
      <rect x="905" y="679" width="2" height="3" fill="#c22a3c" />
      <circle cx="848" cy="596" r="6.500" fill={HIS_SKIN} />
      <circle cx="928" cy="596" r="6.500" fill={HIS_SKIN} />
      <circle cx="888" cy="592" r="40" fill={HIS_SKIN} />
      {/* a slightly longer jaw and chin, so the goatee sits on the face */}
      <path d="M849 596C850 624 866 643 888 645 910 643 926 624 927 596Z" fill={HIS_SKIN} />
      {/* faded sides */}
      <path d="M848 594C846 580 848 570 855 561L860 566C856 575 854 584 854 596Z" fill="url(#his-fade)" />
      <path d="M928 594C930 580 928 570 921 561L916 566C920 575 922 584 922 596Z" fill="url(#his-fade)" />
      {/* short stubble along the jaw, pointed goatee and a thin moustache */}
      <path d="M849 596C850 624 866 643 888 645 910 643 926 624 927 596L922 598C920 613 911 624 898 628L888 629 878 628C865 624 856 613 854 598Z" fill="#2b1c14" opacity="0.6" />
      <path d="M881 627C882 634 885 641 888 645 891 641 894 634 895 627 891 630 885 630 881 627Z" fill="#17120f" />
      <path d="M873 615q15-7 30 0-7 3-15 1.500-8 1.500-15-1.500Z" fill="#17120f" />
      <path d="M877 619q11 7 22 0" fill="none" stroke="#6e3f2c" strokeWidth="2.200" strokeLinecap="round" />
      <path d="M887 597q5 7-1 10" fill="none" stroke="#8a5d3f" strokeWidth="2" strokeLinecap="round" />
      {/* neat side-swept hair with a little volume in front */}
      <path d="M852 584C847 562 855 543 871 535 887 527 909 528 920 537 930 545 932 564 924 584 921 570 914 562 904 559 892 556 876 556 866 560 859 564 855 572 852 584Z" fill="#17120f" />
      <path d="M856 552C862 534 884 524 906 528 896 530 884 536 876 546Z" fill="#17120f" />
      <path d="M866 548q16-14 42-12M874 542q12-8 30-7" fill="none" stroke="#3b3036" strokeWidth="1.500" strokeLinecap="round" />
      <ellipse cx="874" cy="592" rx="3.600" ry="4" fill="#17120f" />
      <ellipse cx="902" cy="592" rx="3.600" ry="4" fill="#17120f" />
      <path d="M864 581Q873 576 882 580M894 580Q903 576 912 581" fill="none" stroke="#17120f" strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

// The final-scene tease: his arm behind her, two fingers up above her head.
const TEASE_ARM = (
  <g>
    <path d="M852 676C836 628 800 580 748 556" fill="none" stroke={HIS_SHIRT} strokeWidth="19" strokeLinecap="round" />
    <path d="M790 590C776 574 762 562 746 554" fill="none" stroke={HIS_SKIN} strokeWidth="13" strokeLinecap="round" />
    <path d="M768 564l8 12" stroke="#111" strokeWidth="5" strokeLinecap="round" />
    <circle cx="742" cy="550" r="9.500" fill={HIS_SKIN} />
    <path d="M738 546l-6-25M746 545l5-26" stroke={HIS_SKIN} strokeWidth="6.500" strokeLinecap="round" />
  </g>
);

const PARTY_CAKE_BODY = (
  <>
    <rect x="760" y="700" width="80" height="42" rx="6" fill="#f6e7d3" />
    <rect x="760" y="722" width="80" height="6" fill="#e9c9a8" opacity="0.8" />
    <path d="M760 708c5 11 9 11 13 0 4 13 9 13 13 0 4 11 9 11 14 0 4 13 9 13 13 0 4 11 9 11 14 0 4 13 9 11 13 0v-2a6 6 0 0 0-6-6h-68a6 6 0 0 0-6 6Z" fill="#e79ab5" />
    {[766, 776, 786, 796, 806, 816, 826, 835].map((x) => (
      <circle key={x} cx={x} cy="738" r="2.600" fill="#fff8ee" />
    ))}
    {[771, 791, 809, 829].map((x) => (
      <circle key={x} cx={x} cy="700" r="3.600" fill="#b3263a" />
    ))}
  </>
);

export const heart = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy + r * 0.9}C${cx - r * 1.4} ${cy} ${cx - r * 0.7} ${cy - r * 0.9} ${cx} ${cy - r * 0.25}C${cx + r * 0.7} ${cy - r * 0.9} ${cx + r * 1.4} ${cy} ${cx} ${cy + r * 0.9}Z`;

export const spark = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3}-${r * 0.7} ${r * 0.3}-${r * 0.3} ${r * 0.7}-${r * 0.3}-${r * 0.7}-${r * 0.7}-${r * 0.3} ${r * 0.7}-${r * 0.3}Z`;

const GIFT_RISE = [
  { x: 786, dx: -46, d: 0, heart: true },
  { x: 802, dx: 8, d: 0.4, heart: false },
  { x: 812, dx: 40, d: 0.8, heart: true },
  { x: 794, dx: -18, d: 1.2, heart: false },
  { x: 806, dx: 26, d: 1.6, heart: true },
  { x: 790, dx: -34, d: 2, heart: false },
  { x: 800, dx: 2, d: 2.3, heart: true },
];

// The present: carried in, set on the table, ribbon loosened, lid lifted.
const GIFT_BOX = (
  <g className="gift">
    <ellipse className="gglow" cx="800" cy="694" rx="96" ry="78" fill="url(#warm-glow)" />
    <g className="grise">
      {GIFT_RISE.map((p) => (
        <path
          key={p.d}
          d={p.heart ? heart(p.x, 696, 7) : spark(p.x, 696, 7)}
          fill={p.heart ? "#f29ab3" : "#ffe2a3"}
          style={{ "--dx": `${p.dx}px`, animationDelay: `${p.d}s` } as CSSProperties}
        />
      ))}
    </g>
    <rect x="766" y="702" width="68" height="40" rx="3" fill="#f3d9cf" />
    <rect x="766" y="702" width="68" height="40" rx="3" fill="url(#balloon-shine)" opacity="0.45" />
    <rect className="gribbon" x="794" y="702" width="12" height="40" fill="#d9b25f" />
    <g className="glid">
      <rect x="761" y="690" width="78" height="14" rx="3" fill="#ecc3bd" />
      <rect className="gribbon" x="794" y="690" width="12" height="14" fill="#d9b25f" />
      <g className="gbow">
        <path d="M800 690c-14-17-31-12-27 0 3 9 17 6 27 0Z" fill="#e6c477" />
        <path d="M800 690c14-17 31-12 27 0-3 9-17 6-27 0Z" fill="#d9b25f" />
        <path d="M798 691l-9 13M802 691l9 13" stroke="#d9b25f" strokeWidth="3.500" strokeLinecap="round" />
        <circle cx="800" cy="689" r="4.500" fill="#c79a45" />
      </g>
    </g>
  </g>
);

export interface PartyState {
  gift?: boolean;
  untied?: boolean;
  open?: boolean;
  mood?: "wow" | "clap";
  intro?: boolean;
  away?: boolean;
  walking?: boolean;
  held?: boolean;
  lit?: boolean;
  blowing?: boolean;
  cutting?: boolean;
  cut?: boolean;
  tease?: boolean;
}

// The whole illustrated set. Scenes 06 and 07 drive it through the celebration and
// the gift; the final scene shows it at rest.
function PartyArt({ intro, away, walking, held, lit, blowing, cutting, cut, tease, gift, untied, open, mood }: PartyState) {
  const herPose: HerPose = blowing ? "blow" : cutting ? "cut" : mood ?? "idle";
  const travel = `${away ? " is-away" : ""}${walking ? " is-walking" : ""}`;
  return (
    <svg
      className={`night party${intro ? " intro" : ""}${lit ? "" : " is-out"}${blowing ? " is-blowing" : ""}${cut ? " is-cut" : ""}${untied ? " is-untied" : ""}${open ? " is-open" : ""}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b24" />
          <stop offset="0.3" stopColor="#121c4a" />
          <stop offset="0.52" stopColor="#2a3a7a" />
          <stop offset="0.64" stopColor="#5a5b9a" />
          <stop offset="0.72" stopColor="#b07a9c" />
          <stop offset="0.78" stopColor="#e9a88f" />
        </linearGradient>
        <radialGradient id="moon-glow">
          <stop offset="0" stopColor="#fff6d8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="warm-glow">
          <stop offset="0" stopColor="#ffc56e" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffc56e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="balloon-shine" cx="32%" cy="28%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </radialGradient>
        <linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#222c52" />
          <stop offset="1" stopColor="#0d1226" />
        </linearGradient>
        <pattern id="plaid" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#dcc7a4" />
          <path d="M0 4h16M0 11h16" stroke="#9a7650" strokeWidth="2.200" opacity="0.75" />
          <path d="M4 0v16M11 0v16" stroke="#9a7650" strokeWidth="2.200" opacity="0.55" />
          <path d="M0 7.500h16M7.500 0v16" stroke="#f6eedd" strokeWidth="1.200" opacity="0.9" />
        </pattern>
        <pattern id="darkplaid" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="#2f3542" />
          <path d="M0 5h18M0 13h18M5 0v18M13 0v18" stroke="#1c212b" strokeWidth="4" opacity="0.85" />
          <path d="M0 9h18M9 0v18" stroke="#c3c8d2" strokeWidth="1" opacity="0.6" />
          <path d="M0 2h18M2 0v18" stroke="#9aa0ac" strokeWidth="0.6" opacity="0.5" />
        </pattern>
        <linearGradient id="his-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#17120f" stopOpacity="0.95" />
          <stop offset="1" stopColor="#17120f" stopOpacity="0.2" />
        </linearGradient>
        <pattern id="tiles" width="46" height="26" patternUnits="userSpaceOnUse">
          <path d="M0 0q23 22 46 0M-23 13q23 22 46 0M23 13q23 22 46 0" fill="none" stroke="#fff" strokeOpacity="0.06" strokeWidth="2" />
        </pattern>
        <clipPath id="cake-main"><rect x="700" y="640" width="122" height="120" /></clipPath>
        <clipPath id="cake-slice"><rect x="822" y="640" width="40" height="120" /></clipPath>
      </defs>

      {/* ---- sky, hills, tree, lanterns, rooftop ---- */}
      <rect width="1600" height="900" fill="url(#sky)" />
      {STARS.map((star) => (
        <circle key={star.id} className={star.id % 4 ? undefined : "star"} cx={star.cx} cy={star.cy} r={star.r} fill="#fff" style={{ animationDelay: star.delay }} />
      ))}
      <g className="moon">
        <circle cx="1120" cy="250" r="210" fill="url(#moon-glow)" />
        <circle cx="1120" cy="250" r="56" fill="#fff4d4" />
        <circle cx="1103" cy="234" r="10" fill="#efe0b8" opacity="0.6" />
        <circle cx="1137" cy="268" r="14" fill="#efe0b8" opacity="0.5" />
        <circle cx="1145" cy="228" r="6" fill="#efe0b8" opacity="0.5" />
      </g>
      <g className="clouds" fill="#9aa0d8" opacity="0.22">
        <ellipse cx="300" cy="330" rx="210" ry="26" />
        <ellipse cx="420" cy="312" rx="130" ry="22" />
        <ellipse cx="1240" cy="380" rx="240" ry="24" />
        <ellipse cx="1120" cy="362" rx="120" ry="18" />
      </g>
      <path d="M0 610C200 550 400 590 600 570 800 550 1000 610 1200 570 1400 540 1500 570 1600 550V900H0Z" fill="#1c2a57" />
      {[[180, 596], [214, 590], [520, 580], [556, 586], [1090, 590], [1130, 584], [1420, 566], [1450, 572], [760, 574]].map(([x, y]) => (
        <rect key={x} x={x} y={y} width="5" height="6" fill="#ffd58a" opacity="0.85" />
      ))}
      <path d="M0 668C250 628 500 688 800 658 1100 628 1350 688 1600 648V900H0Z" fill="#141d3d" />
      <path d="M452 760C470 640 462 540 500 440 520 400 560 370 610 350M500 440C470 400 440 380 410 370M540 400C580 400 620 384 650 352" fill="none" stroke="#1a1626" strokeWidth="22" strokeLinecap="round" />
      {BLOSSOMS.map((b) => (
        <circle key={b.id} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} opacity="0.93" />
      ))}
      <path d="M0 20Q800 140 1600 20" fill="none" stroke="#0b0f24" strokeWidth="3" />
      {LANTERNS.map((lantern) => (
        <g key={lantern.x} className="lantern" style={{ transformOrigin: `${lantern.x}px ${lantern.y}px`, animationDelay: lantern.delay }}>
          <circle cx={lantern.x} cy={lantern.y + 36} r="58" fill="url(#warm-glow)" />
          <path d={`M${lantern.x} ${lantern.y}v14`} stroke="#0b0f24" strokeWidth="2" />
          <rect x={lantern.x - 14} y={lantern.y + 14} width="28" height="40" rx="12" fill="#ffb347" />
          <rect x={lantern.x - 8} y={lantern.y + 20} width="16" height="28" rx="8" fill="#ffe2a3" />
          <rect x={lantern.x - 10} y={lantern.y + 11} width="20" height="5" rx="2" fill="#5a2a1c" />
          <rect x={lantern.x - 10} y={lantern.y + 52} width="20" height="5" rx="2" fill="#5a2a1c" />
        </g>
      ))}

      {/* ---- birthday decorations: fairy lights and balloons ---- */}
      <path d="M1100 400V742" stroke="#141a33" strokeWidth="6" strokeLinecap="round" />
      <path d="M500 400Q800 520 1100 400" fill="none" stroke="#0b0f24" strokeWidth="2" />
      {FAIRY.map((bulb) => (
        <g key={bulb.id} className="fairy" style={{ "--i": bulb.id } as CSSProperties}>
          <circle cx={bulb.cx} cy={bulb.cy} r="15" fill="url(#warm-glow)" />
          <circle cx={bulb.cx} cy={bulb.cy} r="4.500" fill={bulb.fill} />
        </g>
      ))}

      <path d="M0 742H1600V900H0Z" fill="url(#roof)" />
      <path d="M0 742H1600V900H0Z" fill="url(#tiles)" />
      <ellipse cx="800" cy="748" rx="330" ry="90" fill="url(#warm-glow)" opacity="0.5" />
      <rect x="0" y="734" width="1600" height="12" rx="6" fill="#2f3b66" />

      <g className="pballoons">
        <path d="M640 742C636 690 618 640 606 590M640 742C640 680 642 620 642 560M640 742C646 696 660 650 668 606" fill="none" stroke="#cfd4e6" strokeWidth="1.200" opacity="0.7" />
        {[[604, 562, 27, "#f2b5c4"], [642, 530, 29, "#f6e2b3"], [670, 578, 25, "#c9b6e8"]].map(([cx, cy, r, fill]) => (
          <g key={cx}>
            <ellipse cx={cx} cy={cy} rx={r} ry={Number(r) * 1.18} fill={fill as string} />
            <ellipse cx={cx} cy={cy} rx={r} ry={Number(r) * 1.18} fill="url(#balloon-shine)" />
          </g>
        ))}
        <path d="M958 742C956 690 944 640 938 596M958 742C962 686 972 632 978 574" fill="none" stroke="#cfd4e6" strokeWidth="1.200" opacity="0.7" />
        {[[936, 568, 26, "#f7c7a3"], [980, 544, 28, "#f2b5c4"]].map(([cx, cy, r, fill]) => (
          <g key={cx}>
            <ellipse cx={cx} cy={cy} rx={r} ry={Number(r) * 1.18} fill={fill as string} />
            <ellipse cx={cx} cy={cy} rx={r} ry={Number(r) * 1.18} fill="url(#balloon-shine)" />
          </g>
        ))}
      </g>

      {/* a cat and a mouse, finally at peace */}
      <g fill="#1b2140">
        <path d="M586 736c-8-30 4-52 26-52s32 22 26 52Z" />
        <circle cx="612" cy="672" r="17" />
        <path d="M597 664l-2-20 14 10ZM627 664l2-20-14 10Z" />
        <path d="M586 734c-22 2-30-16-22-30" fill="none" stroke="#1b2140" strokeWidth="7" strokeLinecap="round" />
      </g>
      <path d="M603 656q9-6 18 0" fill="none" stroke="#ffd9a0" strokeWidth="1.500" opacity="0.7" />
      <g fill="#3a2f3c">
        <ellipse cx="1000" cy="724" rx="13" ry="11" />
        <circle cx="992" cy="708" r="9" />
        <circle cx="985" cy="699" r="6" />
        <circle cx="999" cy="698" r="6" />
      </g>
      <circle cx="985" cy="699" r="3" fill="#e8a7b4" />
      <circle cx="999" cy="698" r="3" fill="#e8a7b4" />
      <g transform="translate(-272 4) rotate(10 890 800)">
        <rect x="860" y="764" width="60" height="74" fill="#efe6d0" />
        <circle cx="890" cy="798" r="17" fill="none" stroke="#35271f" strokeWidth="2.500" />
        <path d="M874 790c2-14 30-14 32 0-8-5-24-5-32 0Z" fill="#35271f" />
        <path d="M879 796q5-5 9 0M892 796q5-5 9 0" fill="none" stroke="#35271f" strokeWidth="3" strokeLinecap="round" />
        <path d="M883 806q7 7 14 0z" fill="#b3263a" />
      </g>

      {/* ---- the two of them ---- */}
      {tease && TEASE_ARM}
      <Her pose={herPose} />
      <g className={`walker${travel}`}>
        <g className="walker-bob">
          <Him pose={held ? "carry" : tease ? "tease" : "rest"} />
        </g>
      </g>

      {/* ---- the birthday table ---- */}
      <g className="ptable">
        <rect x="700" y="792" width="9" height="50" fill="#141a33" />
        <rect x="891" y="792" width="9" height="50" fill="#141a33" />
        <path d="M686 746H914V792c-10 10-19 10-28 0-10 10-19 10-29 0-9 10-19 10-28 0-10 10-19 10-29 0-9 10-19 10-28 0-10 10-19 10-29 0-9 10-19 10-28 0-10 10-19 10-29 0Z" fill="#f7efe4" />
        <path d="M686 780H914" stroke="#e79ab5" strokeWidth="2.500" opacity="0.8" />
        <rect x="682" y="740" width="236" height="10" rx="5" fill="#fffaf2" />
        <path d="M706 740v-22M700 740c-2-10-4-18-8-24M712 740c2-10 6-16 10-22" fill="none" stroke="#5f8a6a" strokeWidth="2" strokeLinecap="round" />
        <circle cx="706" cy="714" r="6" fill="#f2b5c4" />
        <circle cx="692" cy="714" r="5" fill="#fff3dc" />
        <circle cx="723" cy="716" r="5" fill="#c9b6e8" />
        <path d="M699 728h14l-2 12h-10Z" fill="#9fb8d8" />
        {!gift && (
          <g transform="rotate(-6 884 734)">
            <rect x="862" y="727" width="46" height="14" rx="3" fill="#c8102e" />
            <rect x="862" y="727" width="6" height="14" fill="#cfd4dc" />
            <rect x="902" y="727" width="6" height="14" fill="#cfd4dc" />
            <ellipse cx="885" cy="734" rx="12" ry="4" fill="#fff" />
          </g>
        )}
      </g>

      {/* ---- the cake: carried in, set on the table, candles blown out, then cut ---- */}
      <g className={`cake-carrier${travel}`}>
        <g className="walker-bob">
          <g className={`cake-wrap${held ? " is-held" : ""}`}>
            {gift ? (
              GIFT_BOX
            ) : (
              <>
            <circle className="pglow" cx="800" cy="680" r="84" fill="url(#warm-glow)" />
            <ellipse cx="800" cy="742" rx="52" ry="7" fill="#e9e2d4" />
            <g className="pinside">
              <rect x="820" y="702" width="14" height="39" fill="#f0cf9c" />
              <rect x="820" y="712" width="14" height="4" fill="#fff8ee" />
              <rect x="820" y="724" width="14" height="4" fill="#b3263a" />
            </g>
            <g clipPath="url(#cake-main)">
              {PARTY_CAKE_BODY}
              {[782, 800, 816].map((x) => (
                <g key={x} className="pcandle">
                  <rect x={x - 2.5} y="680" width="5" height="21" rx="1.500" fill="#fffaf2" />
                  <path d={`M${x - 2.5} 686l5-3M${x - 2.5} 694l5-3`} stroke="#e79ab5" strokeWidth="1.500" />
                  <path className="smoke" d={`M${x} 678c-4-8 4-14-1-22-4-7 3-12 0-20`} fill="none" stroke="#d6d6e2" strokeWidth="1.600" strokeLinecap="round" />
                  <g className="pflame">
                    <path d={`M${x} 680c-6-6-5-13 0-21 5 8 6 15 0 21Z`} fill="#ffa63d" />
                    <path d={`M${x} 679c-3-4-2-8 0-13 2 5 3 9 0 13Z`} fill="#fff3c4" />
                  </g>
                </g>
              ))}
            </g>
            <g className="pslice" clipPath="url(#cake-slice)">{PARTY_CAKE_BODY}</g>
            <g className="psparks" fill="#fff3c4">
              {[[768, 676, 5], [846, 690, 4], [806, 660, 6], [834, 664, 3.5], [778, 652, 3.5]].map(([x, y, r]) => (
                <path key={x} d={`M${x} ${y - r}l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3}-${r * 0.7} ${r * 0.3}-${r * 0.3} ${r * 0.7}-${r * 0.3}-${r * 0.7}-${r * 0.7}-${r * 0.3} ${r * 0.7}-${r * 0.3}Z`} />
              ))}
            </g>
              </>
            )}
          </g>
        </g>
      </g>

      <g className="air" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M748 630C760 640 770 652 778 664" />
        <path d="M752 620C768 630 784 644 796 660" />
        <path d="M744 642C754 652 762 662 768 674" />
      </g>
      {cutting && KNIFE_ARM}

      {FIREFLIES.map((fly) => (
        <circle
          key={fly.id}
          className="firefly"
          cx={fly.cx}
          cy={fly.cy}
          r="3"
          fill="#f6ffb0"
          stroke="#f6ffb0"
          strokeOpacity="0.22"
          strokeWidth="7"
          style={{ animationDuration: fly.duration, animationDelay: fly.delay }}
        />
      ))}
    </svg>
  );
}

export function Night({ dim = false, art, illustrationSrc = "" }: { dim?: boolean; art: PartyState; illustrationSrc?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`night-wrap${dim ? " is-dim" : ""}`} aria-hidden="true">
      {dim && illustrationSrc && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- optional user-supplied artwork; falls back to the drawing if it fails to load
        <img className="night night-img" src={illustrationSrc} alt="" onError={() => setFailed(true)} />
      ) : (
        <PartyArt {...art} />
      )}
      <div className="petals">
        {PETALS.map((petal) => (
          <span
            key={petal.id}
            style={
              {
                left: petal.left,
                width: petal.size,
                animationDuration: petal.duration,
                animationDelay: petal.delay,
                "--sway": petal.sway,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

