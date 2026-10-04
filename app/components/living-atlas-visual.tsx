"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";

import type { HumanAtlasSceneId } from "../data/human-atlas";
import type { DecorativeMotionStatus } from "../hooks/use-decorative-motion";
import type { LivingAtlasScene } from "../lib/living-atlas-scene";

type LivingAtlasVisualProps = Readonly<{
  variant?: "living" | "human";
  activeScene: HumanAtlasSceneId;
  motionStatus: DecorativeMotionStatus;
  progressRef: RefObject<number>;
  onFailure: () => void;
}>;

type DecorativeScene = Pick<LivingAtlasScene, "setRunning" | "dispose">;

function StaticHuman({ scene }: { scene: HumanAtlasSceneId }) {
  const gradientId = useId();
  const surface = `url(#${gradientId})`;
  return (
    <svg className="living-atlas__still human-signal-still" viewBox="0 0 600 480" fill="none" data-action={scene} data-appearance="translucent">
      <defs>
        <linearGradient id={gradientId} x1="185" y1="170" x2="350" y2="325" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EAF4EC" stopOpacity=".45" />
          <stop offset=".48" stopColor="#93C5B3" stopOpacity=".65" />
          <stop offset="1" stopColor="#4F9A86" stopOpacity=".82" />
        </linearGradient>
      </defs>
      <ellipse cx="300" cy="401" rx="190" ry="14" fill="#4D6159" opacity=".14" />
      <g strokeLinecap="round" strokeLinejoin="round">
        {scene === "sleep" ? <>
          <path d="M80 336v46m440-46v46" stroke="#756854" strokeWidth="12" />
          <rect x="65" y="303" width="470" height="38" rx="12" fill="#E2E5D8" />
          <ellipse cx="122" cy="293" rx="43" ry="12" fill="#F4F5EE" />
          <g>
            <path d="M277 284h75l104 9M275 294h66l115 7" stroke={surface} strokeWidth="20" />
            <path d="M263 286h49" stroke={surface} strokeWidth="31" />
            <path d="M450 292h19m-19 9h19" stroke={surface} strokeWidth="12" />
            <path d="M151 272l20 6" stroke={surface} strokeWidth="18" />
            <path d="M169 278l91 7" stroke={surface} strokeWidth="41" />
            <path d="M177 271l55 18 30-12" stroke={surface} strokeWidth="15" />
            <circle cx="129" cy="272" r="25" fill={surface} stroke="#4F9A86" strokeOpacity=".6" strokeWidth="1.2" />
            <g data-human-expression="resting" stroke="#0A6B5E" strokeWidth="2.2">
              <path d="M116 268q4 3 8 0m8 0q4 3 8 0" />
              <path d="M124 279q5 2 10 0" />
            </g>
          </g>
        </> : scene === "breath" ? <>
          <path d="M160 389h270M140 411h270" stroke="#9FB48F" strokeWidth="3" />
          <g>
            <path d="M292 274l-49 47-26 63M287 273l60 32 27-55" stroke={surface} strokeWidth="21" />
            <path d="M291 266l-24 30m21-30 35 24" stroke={surface} strokeWidth="30" />
            <path d="M329 177l-10 17" stroke={surface} strokeWidth="18" />
            <path d="M321 196l-45 15-24-36M319 198l48 29 24-31" stroke={surface} strokeWidth="16" />
            <path d="M316 195l-26 64" stroke={surface} strokeWidth="44" />
            <circle cx="333" cy="157" r="25" fill={surface} stroke="#4F9A86" strokeOpacity=".6" strokeWidth="1.2" />
            <g data-human-effect="sweat" fill="#7FB3C4" stroke="#286C82" strokeWidth="1.2" opacity=".85">
              <path d="M309 114c-1 5-6 8-6 12a5 5 0 0 0 10 0c0-4-3-8-4-12Z" />
              <path d="M369 142c-1 5-6 8-6 12a5 5 0 0 0 10 0c0-4-3-8-4-12Z" />
              <path d="M302 165c-1 4-5 7-5 10a4 4 0 0 0 8 0c0-3-2-7-3-10Z" />
            </g>
            <path d="M211 384h26m135-137 19 13" stroke={surface} strokeWidth="12" />
          </g>
        </> : scene === "strength" ? <>
          <g>
            <path d="M270 261l45 52-18 74M288 267l56 52-20 68" stroke={surface} strokeWidth="21" />
            <path d="M280 258l32 35" stroke={surface} strokeWidth="36" />
            <path d="M293 388h20m7 0h22" stroke={surface} strokeWidth="12" />
            <path d="M347 180l-17 19" stroke={surface} strokeWidth="18" />
            <path d="M279 249l51-51" stroke={surface} strokeWidth="44" />
            <circle cx="352" cy="159" r="25" fill={surface} stroke="#4F9A86" strokeOpacity=".6" strokeWidth="1.2" />
            <g data-human-expression="focused" stroke="#0A6B5E" strokeWidth="2.2">
              <path d="M339 153l8 3m12 0 8-3" />
              <path d="M348 171h10" />
            </g>
            <path d="M321 202l24 58 10 60M339 206l30 56 8 58" stroke={surface} strokeWidth="15" />
          </g>
          <path d="M125 326h410" stroke="#536C89" strokeWidth="7" />
          <path d="M131 326h107m185 0h107" stroke="#AABBD0" strokeWidth="12" />
          <path d="M131 322h107m185 0h107" stroke="#F2F7FD" strokeWidth="2" />
          {[{ x: 175, weight: 25 }, { x: 201, weight: 20 }, { x: 459, weight: 20 }, { x: 485, weight: 25 }].map(({ x, weight }) => (
            <g key={x}>
              <ellipse cx={x} cy="326" rx="14" ry={weight === 25 ? 44 : 40}
                fill={weight === 25 ? "#C6424C" : "#2864DC"}
                stroke={weight === 25 ? "#922A33" : "#1F4C9F"} strokeWidth="2" />
              <ellipse cx={x} cy="326" rx="4" ry="7" fill="#B8C8D9" stroke="#617B99" strokeWidth="1" />
              <text x={x} y="307" fill="#FFFFFF" fontSize="10" fontWeight="700" textAnchor="middle">{weight}</text>
            </g>
          ))}
          <path d="M223 315v22m214-22v22" stroke="#7089A8" strokeWidth="6" />
          <path d="M353 320v9m22-9v9" stroke={surface} strokeWidth="7" />
        </> : <>
          <path d="M219 298h79v96m-73-94v94M220 225v76" stroke="#756854" strokeWidth="10" />
          <g>
            <path d="M254 285l56 12-5 91M243 284l45 22-5 81" stroke={surface} strokeWidth="20" />
            <path d="M244 281l41 10" stroke={surface} strokeWidth="34" />
            <path d="M279 388h20m2 0h21" stroke={surface} strokeWidth="12" />
            <path d="M248 201l-3 20" stroke={surface} strokeWidth="18" />
            <path d="M245 221v51" stroke={surface} strokeWidth="44" />
            <circle cx="248" cy="180" r="25" fill={surface} stroke="#4F9A86" strokeOpacity=".6" strokeWidth="1.2" />
            <g data-human-expression="happy" stroke="#0A6B5E" strokeWidth="2.4">
              <path d="M236 176q4-5 8 0m8 0q4-5 8 0" />
              <path d="M238 185q10 13 20 0" />
            </g>
            <path d="M251 226l43 35-30-57M237 234l51 43h69" stroke={surface} strokeWidth="15" />
          </g>
          <path d="M342 302v96m133-96v96" stroke="#756854" strokeWidth="12" />
          <path d="M322 299h175" stroke="#B9AA8F" strokeWidth="12" />
          <ellipse cx="412" cy="285" rx="77" ry="17" fill="#CFDCEA" stroke="#8EA6C0" strokeWidth="1" />
          <ellipse cx="412" cy="281" rx="77" ry="15" fill="#FFFFFF" stroke="#B3C6DC" strokeWidth="1.5" />
          <ellipse cx="412" cy="281" rx="68" ry="11" fill="#F2F7FB" />
          <path d="M361 276v-18m0 13-9-11m9 9 10-11" stroke="#5C9C43" strokeWidth="5" />
          <path d="M345 256a7 7 0 0 1 8-8 8 8 0 0 1 15-1 7 7 0 0 1 10 8c-2 9-13 7-17 5-5 4-14 3-16-4Z" fill="#347D42" />
          <path d="M350 251q4-3 7 0m8-1q4-3 7 0" stroke="#79B65F" strokeWidth="2" />
          <ellipse cx="391" cy="270" rx="14" ry="9" fill="#FFFFFF" stroke="#D8D8C6" strokeWidth="1" />
          <ellipse cx="416" cy="267" rx="13" ry="9" fill="#FFFFFF" stroke="#D8D8C6" strokeWidth="1" />
          <ellipse cx="391" cy="270" rx="5" ry="4" fill="#F2BC2F" />
          <ellipse cx="416" cy="267" rx="5" ry="4" fill="#F2BC2F" />
          <circle cx="440" cy="266" r="11" fill="#EB8B2A" />
          <path d="M435 259q3-2 5-1" stroke="#F7C777" strokeWidth="2" />
          <path d="M441 255q4-7 10-4-4 5-10 4Z" fill="#4E8C48" />
          <path d="M453 270q5-4 9-1 5-3 8 2 4 8-5 14-4 2-9-2-8-5-3-13Z" fill="#BE414B" />
          <path d="M461 270l2-6" stroke="#6E643B" strokeWidth="2" />
          <path d="M382 278q12-5 25-1l13 4q9 6-1 10-14 4-32-2-11-4-5-11Z" fill="#A9614D" stroke="#7B473E" strokeWidth="1.5" />
          <path d="M388 280l8 7m2-8 9 9m1-8 8 6" stroke="#683F35" strokeWidth="2" />
          <path d="M263 203l7-10" stroke="#516E97" strokeWidth="4" />
          <ellipse cx="271" cy="191" rx="4" ry="6" transform="rotate(35 271 191)" fill="#BCCBDC" stroke="#617B99" strokeWidth="1" />
        </>}
      </g>
    </svg>
  );
}

// Present in the server HTML, including when WebGL or JavaScript is unavailable.
function StaticFilaments() {
  return (
    <svg className="living-atlas__still" viewBox="0 0 600 600" fill="none">
      <g transform="translate(300 300) rotate(-28)">
        {Array.from({ length: 36 }, (_, i) => (
          <ellipse key={i} rx={90 + i * 3.25} ry={205 - i * 2.4}
            transform={`rotate(${i * 5})`} stroke="currentColor" strokeWidth=".7"
            opacity={0.12 + (i % 6) * 0.045} />
        ))}
        <circle r="234" stroke="currentColor" strokeWidth=".6" opacity=".16" strokeDasharray="2 9" />
      </g>
    </svg>
  );
}

export function LivingAtlasVisual({ variant = "living", activeScene, motionStatus, progressRef, onFailure }: LivingAtlasVisualProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ scene: activeScene, motionStatus, onFailure });
  const inViewRef = useRef(false);
  const syncRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const enabled = motionStatus === "running" || motionStatus === "hidden";

  useEffect(() => {
    stateRef.current = { scene: activeScene, motionStatus, onFailure };
    syncRef.current?.();
  }, [activeScene, motionStatus, onFailure]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !enabled) return;
    let disposed = false;
    let loading = false;
    let failed = false;
    let instance: DecorativeScene | null = null;
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      instance?.dispose();
      setReady(false);
      stateRef.current.onFailure();
    };
    const sync = () => {
      if (disposed || failed) return;
      if (instance) {
        instance.setRunning(inViewRef.current && stateRef.current.motionStatus === "running");
        return;
      }
      if (loading || !inViewRef.current || stateRef.current.motionStatus !== "running") return;
      loading = true;
      const loadScene = variant === "human"
        ? import("../lib/human-signal-scene").then((module) => module.HumanSignalScene)
        : import("../lib/living-atlas-scene").then((module) => module.LivingAtlasScene);
      loadScene.then((Scene) => {
        loading = false;
        if (disposed || failed) return;
        if (!inViewRef.current || stateRef.current.motionStatus !== "running") return;
        instance = new Scene(host, () => ({
          progress: progressRef.current, scene: stateRef.current.scene,
        }), fail);
        if (failed) { instance.dispose(); return; }
        setReady(true);
        sync();
      }).catch(fail);
    };
    const bounds = host.getBoundingClientRect();
    syncRef.current = sync;
    inViewRef.current = bounds.bottom > 0 && bounds.top < window.innerHeight;
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "function") {
      try {
        observer = new IntersectionObserver(([entry]) => {
          if (disposed || !entry) return;
          inViewRef.current = entry.isIntersecting;
          sync();
        });
        observer.observe(host);
      } catch {
        fail();
      }
    }
    sync();
    return () => {
      disposed = true;
      syncRef.current = null;
      observer?.disconnect();
      instance?.dispose();
      setReady(false);
    };
  }, [enabled, progressRef, variant]);

  return (
    <div className={`living-atlas${variant === "human" ? " living-atlas--human" : ""}`} aria-hidden="true" data-scene={activeScene}
      data-ready={ready && enabled ? "true" : "false"}>
      {variant === "human" ? <StaticHuman scene={activeScene} /> : <StaticFilaments />}
      <div className="living-atlas__canvas" ref={hostRef} />
    </div>
  );
}
