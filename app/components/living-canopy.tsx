"use client";

import { useState, type CSSProperties } from "react";

export type LivingCanopyTone = "calm" | "watchful" | "urgent";

export type LivingCanopyProps = {
  progress: number;
  tone: LivingCanopyTone;
  reducedMotion: boolean;
};

const branches = [
  { id: "sleep", label: "Sleep" },
  { id: "heart", label: "Heart" },
  { id: "habits", label: "Habits" },
  { id: "care", label: "Care" },
] as const;

export function LivingCanopy({
  progress,
  tone,
  reducedMotion,
}: LivingCanopyProps) {
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const boundedProgress = Math.max(0, Math.min(1, progress));

  return (
    <figure
      className={`canopy canopy--${tone}${reducedMotion ? " canopy--still" : ""}`}
      aria-labelledby="canopy-title"
    >
      <figcaption id="canopy-title" className="canopy__caption">
        A living map of connected health signals
      </figcaption>
      <div
        className="canopy__field"
        style={{ "--canopy-progress": `${boundedProgress * 27}%` } as CSSProperties}
      >
        <span className="canopy__trunk" aria-hidden="true" />
        {branches.map((branch) => (
          <span
            key={branch.id}
            className={`canopy__branch canopy__branch--${branch.id}`}
            aria-hidden="true"
          />
        ))}
        <ul className="canopy__leaves" aria-label="Canopy domains">
          {branches.map((branch) => (
            <li key={branch.id}>
              <button
                type="button"
                className={`canopy__leaf canopy__leaf--${branch.id}`}
                aria-pressed={activeBranch === branch.id}
                onFocus={() => setActiveBranch(branch.id)}
                onBlur={() => setActiveBranch(null)}
                onMouseEnter={() => setActiveBranch(branch.id)}
                onMouseLeave={() => setActiveBranch(null)}
                onClick={() => setActiveBranch(branch.id)}
              >
                {branch.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
