"use client";

import { humanAtlasStorySceneIds, type HumanAtlasSceneId } from "../data/human-atlas";
import { useI18n } from "../i18n/context";
import { healthHomeCopy } from "../i18n/health-home-copy";

export function HealthAxisIcon({ axis }: { axis: HumanAtlasSceneId }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {axis === "breath" ? <><path d="M16 27S4 20 4 11a6 6 0 0 1 12-1 6 6 0 0 1 12 1c0 9-12 16-12 16Z" /><path d="M6 16h6l2-5 4 10 2-5h6" /></> : null}
      {axis === "strength" ? <><path d="M10 11v10M22 11v10M10 16h12M6 9v14M26 9v14M3 13v6M29 13v6" /></> : null}
      {axis === "sleep" ? <><path d="M25 21A11 11 0 0 1 12 5a11 11 0 1 0 13 16Z" /><path d="M23 4v6M20 7h6" /></> : null}
      {axis === "energy" ? <><path d="M7 25C1 12 15 7 27 5c-1 13-5 25-17 21M7 28l14-16" /></> : null}
    </svg>
  );
}

export function HealthAxisMap({ activeScene }: { activeScene?: HumanAtlasSceneId }) {
  const { locale } = useI18n();
  const copy = healthHomeCopy[locale];
  return (
    <div className="health-axis-map">
      <p className="health-axis-map__title">{copy.figureTitle}</p>
      <nav aria-label={copy.figureTitle}>
        {humanAtlasStorySceneIds.map((axis) => (
          <a key={axis} href={`#health-axis-${axis}`} className="health-axis-map__label" data-axis={axis}
            aria-current={activeScene === axis ? "step" : undefined}>
            <span className="health-axis-map__icon"><HealthAxisIcon axis={axis} /></span>
            <strong>{copy.axes[axis].title}</strong>
            <span className="health-axis-map__metric">{copy.axes[axis].metric}</span>
          </a>
        ))}
      </nav>
      <p className="health-axis-map__caption">{copy.figureCaption}</p>
    </div>
  );
}
