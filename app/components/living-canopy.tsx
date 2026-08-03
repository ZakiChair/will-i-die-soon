"use client";

import { useState, type CSSProperties } from "react";
import { useI18n } from "../i18n/context";
import { uiCopyKeys } from "../i18n/ui-copy";

export type LivingCanopyTone = "calm" | "watchful" | "urgent";

export type LivingCanopyProps = {
  progress: number;
  tone: LivingCanopyTone;
  reducedMotion: boolean;
};

const branches = ["sleep", "heart", "habits", "care"] as const;

export function LivingCanopy({
  progress,
  tone,
  reducedMotion,
}: LivingCanopyProps) {
  const { t } = useI18n();
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const boundedProgress = Math.max(0, Math.min(1, progress));

  return (
    <figure
      className={`canopy canopy--${tone}${reducedMotion ? " canopy--still" : ""}`}
      aria-labelledby="canopy-title"
    >
      <figcaption id="canopy-title" className="canopy__caption">
        {t("canopy.caption")}
      </figcaption>
      <div
        className="canopy__field"
        style={{ "--canopy-progress": `${boundedProgress * 27}%` } as CSSProperties}
      >
        <span className="canopy__trunk" aria-hidden="true" />
        {branches.map((branch) => (
          <span
            key={branch}
            className={`canopy__branch canopy__branch--${branch}`}
            aria-hidden="true"
          />
        ))}
        <ul className="canopy__leaves" aria-label={t("canopy.aria")}>
          {branches.map((branch) => (
            <li key={branch}>
              <button
                type="button"
                className={`canopy__leaf canopy__leaf--${branch}`}
                aria-pressed={activeBranch === branch}
                onFocus={() => setActiveBranch(branch)}
                onBlur={() => setActiveBranch(null)}
                onMouseEnter={() => setActiveBranch(branch)}
                onMouseLeave={() => setActiveBranch(null)}
                onClick={() => setActiveBranch(branch)}
              >
                {t(uiCopyKeys.canopyBranch[branch])}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
