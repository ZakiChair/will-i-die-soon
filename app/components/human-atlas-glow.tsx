"use client";

import {
  humanAtlasSceneIds,
  type HumanAtlasSceneId,
} from "../data/human-atlas";
import type { ReactNode } from "react";

type HumanAtlasGlowProps = Readonly<{
  activeScene: HumanAtlasSceneId;
  motionAllowed: boolean;
}>;

const glowLayers: Record<HumanAtlasSceneId, ReactNode> = {
  breath: (
    <>
      <defs>
        <radialGradient id="breathBlue">
          <stop offset="0" stopColor="#d8fbff" stopOpacity="1" />
          <stop offset=".23" stopColor="#65d8ff" stopOpacity=".9" />
          <stop offset=".58" stopColor="#435cff" stopOpacity=".48" />
          <stop offset="1" stopColor="#435cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="breathHeartCoral">
          <stop offset="0" stopColor="#fff2d5" />
          <stop offset=".28" stopColor="#ff887a" stopOpacity=".92" />
          <stop offset="1" stopColor="#ff6f61" stopOpacity="0" />
        </radialGradient>
        <filter id="breathBlur">
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>
      <ellipse cx="672" cy="179" fill="url(#breathBlue)" filter="url(#breathBlur)" rx="44" ry="72" />
      <ellipse cx="719" cy="179" fill="url(#breathBlue)" filter="url(#breathBlur)" rx="44" ry="72" />
      <ellipse cx="672" cy="179" fill="url(#breathBlue)" opacity=".85" rx="29" ry="54" />
      <ellipse cx="719" cy="179" fill="url(#breathBlue)" opacity=".85" rx="29" ry="54" />
      <circle cx="697" cy="213" fill="url(#breathHeartCoral)" filter="url(#breathBlur)" r="35" />
      <circle cx="697" cy="213" fill="url(#breathHeartCoral)" r="18" />
    </>
  ),
  strength: (
    <>
      <defs>
        <filter id="strengthNerveBlur">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <linearGradient id="strengthNerveGold" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#fff4b8" />
          <stop offset=".4" stopColor="#f4c95d" />
          <stop offset="1" stopColor="#ff8e68" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        filter="url(#strengthNerveBlur)"
        opacity=".76"
        stroke="url(#strengthNerveGold)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M696 94 C695 132 696 174 696 220 C696 276 696 331 696 390" strokeWidth="19" />
        <path d="M696 144 C657 168 635 207 620 266 M696 144 C735 168 757 207 772 266 M696 284 C663 332 650 399 646 492 M696 284 C729 332 742 399 746 492" strokeWidth="13" />
      </g>
      <g
        fill="none"
        stroke="url(#strengthNerveGold)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M696 94 C695 132 696 174 696 220 C696 276 696 331 696 390" strokeWidth="3.4" />
        <path d="M696 144 C657 168 635 207 620 266 M696 144 C735 168 757 207 772 266 M696 284 C663 332 650 399 646 492 M696 284 C729 332 742 399 746 492" strokeWidth="2.4" />
        <path d="M682 172 L657 185 M710 172 L735 185 M681 224 L648 241 M711 224 L744 241 M683 332 L660 355 M709 332 L732 355 M666 408 L644 430 M726 408 L748 430" opacity=".8" strokeWidth="1.5" />
      </g>
      <circle cx="696" cy="87" fill="#f4c95d" filter="url(#strengthNerveBlur)" opacity=".18" r="34" />
    </>
  ),
  sleep: (
    <>
      <defs>
        <radialGradient id="sleepBrainBlue">
          <stop offset="0" stopColor="#f1efff" />
          <stop offset=".22" stopColor="#a8b6ff" stopOpacity=".96" />
          <stop offset=".58" stopColor="#6579e8" stopOpacity=".55" />
          <stop offset="1" stopColor="#435cff" stopOpacity="0" />
        </radialGradient>
        <filter id="sleepBrainBlur">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <ellipse cx="696" cy="67" fill="url(#sleepBrainBlue)" filter="url(#sleepBrainBlur)" rx="58" ry="52" />
      <ellipse cx="696" cy="67" fill="url(#sleepBrainBlue)" rx="34" ry="30" />
      <g fill="none" opacity=".85" stroke="#eef0ff" strokeWidth="1.2">
        <path d="M674 58 C686 47 707 47 718 58 M670 70 C683 62 708 62 722 71 M678 82 C689 75 704 76 714 83 M696 42 V91" />
      </g>
      <circle cx="696" cy="67" fill="none" opacity=".2" r="72" stroke="#7d8cf2" strokeWidth="2" />
    </>
  ),
  energy: (
    <>
      <defs>
        <radialGradient id="energyWarm">
          <stop offset="0" stopColor="#fff4b8" />
          <stop offset=".28" stopColor="#ffc96f" stopOpacity=".96" />
          <stop offset=".58" stopColor="#ff6f61" stopOpacity=".54" />
          <stop offset="1" stopColor="#ff6f61" stopOpacity="0" />
        </radialGradient>
        <filter id="energyBlur">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>
      <ellipse cx="696" cy="281" fill="url(#energyWarm)" filter="url(#energyBlur)" rx="66" ry="88" />
      <ellipse cx="696" cy="281" fill="url(#energyWarm)" opacity=".72" rx="41" ry="58" />
      <g fill="none" opacity=".86" stroke="#fff0b5" strokeLinecap="round" strokeWidth="2.1">
        <path d="M682 241 C710 231 729 249 721 267 C716 279 699 280 686 273 C675 265 673 250 682 241Z" />
        <path d="M669 289 C678 277 714 278 722 291 C729 303 711 311 683 305 C663 301 662 316 683 321 C710 327 728 318 724 336 C721 349 678 348 668 335 C660 325 676 317 700 321" />
      </g>
    </>
  ),
};

export function HumanAtlasGlow({
  activeScene,
  motionAllowed,
}: HumanAtlasGlowProps) {
  return (
    <div data-motion={motionAllowed ? "running" : "paused"}>
      {humanAtlasSceneIds.map((sceneId) => (
        <svg
          aria-hidden="true"
          className={`human-atlas-glow human-atlas-glow--${sceneId}`}
          data-active={activeScene === sceneId ? "true" : "false"}
          data-atlas-glow={sceneId}
          focusable="false"
          key={sceneId}
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1000 563"
        >
          {glowLayers[sceneId]}
        </svg>
      ))}
    </div>
  );
}
