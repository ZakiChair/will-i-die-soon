"use client";

import { useRef, useState, type RefObject } from "react";

import {
  humanAtlasScenes,
  type HumanAtlasSceneId,
} from "../data/human-atlas";
import {
  useActiveAtlasScene,
  type HumanAtlasSceneElements,
} from "../hooks/use-active-atlas-scene";
import { useAtlasSceneTransition } from "../hooks/use-atlas-scene-transition";
import { useDecorativeMotionStatus } from "../hooks/use-decorative-motion";
import { useI18n } from "../i18n/context";
import { HealthAxisMap } from "./health-axis-map";
import { LivingAtlasVisual } from "./living-atlas-visual";

type HumanAtlasScrollProps = Readonly<{
  activeScene?: HumanAtlasSceneId;
  progressRef?: RefObject<number>;
  motionDisabled?: boolean;
  onVisualFailure?: () => void;
}>;

type HumanAtlasScrollViewProps = Readonly<{
  activeScene: HumanAtlasSceneId;
  progressRef?: RefObject<number>;
  motionDisabled: boolean;
  onVisualFailure?: () => void;
  sceneMotion: "parent" | "sequenced";
  sceneElements?: RefObject<HumanAtlasSceneElements>;
}>;

export function HumanAtlasStaticStory() {
  const { t } = useI18n();

  return (
    <section className="human-atlas-static" aria-label={t("landing.atlas.story.aria")}>
      {humanAtlasScenes.map((scene) => (
        <article key={scene.id}>
          <p className="data-label">{t(scene.eyebrowKey)}</p>
          <h3>{t(scene.titleKey)}</h3>
          <p>{t(scene.descriptionKey)}</p>
          <small>{t(scene.inputLabelKey)}</small>
        </article>
      ))}
    </section>
  );
}

function HumanAtlasScrollView({
  activeScene,
  progressRef,
  motionDisabled,
  onVisualFailure,
  sceneMotion,
  sceneElements,
}: HumanAtlasScrollViewProps) {
  const { t } = useI18n();
  const motionStatus = useDecorativeMotionStatus();
  const defaultProgress = useRef(0);
  const staticFallback = motionStatus === "reduced" || motionStatus === "unsupported";
  const [visualFailed, setVisualFailed] = useState(false);
  const visualFailureReported = useRef(false);
  const atlasRef = useRef<HTMLElement>(null);
  const activeChapter = humanAtlasScenes.find((scene) => scene.id === activeScene) ?? humanAtlasScenes[0];
  const staticMotion = staticFallback || motionDisabled || visualFailed;
  const effectiveSceneMotion = staticMotion ? "static" : sceneMotion;
  useAtlasSceneTransition(
    atlasRef,
    activeScene,
    effectiveSceneMotion === "sequenced",
  );

  const handleVisualFailure = () => {
    if (visualFailureReported.current) return;
    visualFailureReported.current = true;
    setVisualFailed(true);
    onVisualFailure?.();
  };

  return (
    <section
      ref={atlasRef}
      aria-label={t("landing.atlas.story.aria")}
      className={`human-atlas-scroll${visualFailed ? " human-atlas-scroll--failed" : ""}`}
      data-active-scene={activeScene}
      data-motion={staticMotion ? "paused" : "running"}
      data-motion-ready={motionStatus === "running" || motionStatus === "hidden" ? "true" : "false"}
      data-scene-motion={effectiveSceneMotion}
    >
      <div className={`human-atlas-stage${visualFailed ? " human-atlas-stage--failed" : ""}`}>
        {!visualFailed ? (
          <LivingAtlasVisual
            variant="human"
            activeScene={activeScene}
            progressRef={progressRef ?? defaultProgress}
            motionStatus={motionDisabled ? "reduced" : motionStatus}
            onFailure={handleVisualFailure}
          />
        ) : (
          <p className="human-atlas-stage__fallback">{t("landing.atlas.imageFailure")}</p>
        )}
        {!visualFailed ? <HealthAxisMap activeScene={staticMotion || motionStatus === "pending" ? undefined : activeScene} /> : null}
        {!visualFailed ? (
          <div key={activeScene} className="human-atlas-stage__mobile-story" aria-hidden="true" data-mobile-story-scene={activeScene}>
            <p className="data-label">{t(activeChapter.eyebrowKey)}</p>
            <h3>{t(activeChapter.titleKey)}</h3>
            <p>{t(activeChapter.descriptionKey)}</p>
            <small>{t(activeChapter.inputLabelKey)}</small>
          </div>
        ) : null}
        <div className="human-atlas-progress" aria-hidden="true">
          <span className="human-atlas-progress__rail">
            <span className="human-atlas-progress__fill" data-atlas-progress-fill />
          </span>
          <span className="human-atlas-progress__markers">
            {humanAtlasScenes.map((scene) => (
              <span
                data-active={activeScene === scene.id ? "true" : "false"}
                key={scene.id}
              />
            ))}
          </span>
        </div>
      </div>

      <div className="human-atlas-scenes">
        {humanAtlasScenes.map((scene) => (
          <section
            className="human-atlas-scene"
            id={`health-axis-${scene.id}`}
            tabIndex={-1}
            data-active={activeScene === scene.id ? "true" : "false"}
            data-atlas-scene={scene.id}
            key={scene.id}
            ref={(node) => {
              if (sceneElements) sceneElements.current[scene.id] = node;
            }}
          >
            <div className="human-atlas-scene__card">
              <p className="data-label" data-atlas-scene-item>{t(scene.eyebrowKey)}</p>
              <h3 data-atlas-scene-item>{t(scene.titleKey)}</h3>
              <p data-atlas-scene-item>{t(scene.descriptionKey)}</p>
              <small data-atlas-scene-item>{t(scene.inputLabelKey)}</small>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function HumanAtlasScrollUncontrolled({
  motionDisabled,
  onVisualFailure,
}: Pick<HumanAtlasScrollProps, "motionDisabled" | "onVisualFailure">) {
  const sceneElements = useRef<HumanAtlasSceneElements>({});
  const activeScene = useActiveAtlasScene(sceneElements);

  return (
    <HumanAtlasScrollView
      activeScene={activeScene}
      motionDisabled={motionDisabled ?? false}
      onVisualFailure={onVisualFailure}
      sceneMotion="parent"
      sceneElements={sceneElements}
    />
  );
}

export function HumanAtlasScroll({
  activeScene,
  progressRef,
  motionDisabled = false,
  onVisualFailure,
}: HumanAtlasScrollProps) {
  if (activeScene !== undefined) {
    return (
      <HumanAtlasScrollView
        activeScene={activeScene}
        progressRef={progressRef}
        motionDisabled={motionDisabled}
        onVisualFailure={onVisualFailure}
        sceneMotion="sequenced"
      />
    );
  }

  return (
    <HumanAtlasScrollUncontrolled
      motionDisabled={motionDisabled}
      onVisualFailure={onVisualFailure}
    />
  );
}
