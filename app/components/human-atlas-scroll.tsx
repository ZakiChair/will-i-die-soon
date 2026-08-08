"use client";

import Image from "next/image";
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
import { HumanAtlasGlow } from "./human-atlas-glow";

type HumanAtlasScrollProps = Readonly<{
  activeScene?: HumanAtlasSceneId;
  motionDisabled?: boolean;
  onImageFailure?: () => void;
}>;

type HumanAtlasScrollViewProps = Readonly<{
  activeScene: HumanAtlasSceneId;
  motionDisabled: boolean;
  onImageFailure?: () => void;
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
  motionDisabled,
  onImageFailure,
  sceneMotion,
  sceneElements,
}: HumanAtlasScrollViewProps) {
  const { t } = useI18n();
  const motionStatus = useDecorativeMotionStatus();
  const motionAllowed = motionStatus === "running";
  const staticFallback = motionStatus === "reduced" || motionStatus === "unsupported";
  const [imageFailed, setImageFailed] = useState(false);
  const imageFailureReported = useRef(false);
  const atlasRef = useRef<HTMLElement>(null);
  const staticMotion = staticFallback || motionDisabled || imageFailed;
  const effectiveSceneMotion = staticMotion ? "static" : sceneMotion;
  useAtlasSceneTransition(
    atlasRef,
    activeScene,
    effectiveSceneMotion === "sequenced",
  );

  const handleImageFailure = () => {
    if (imageFailureReported.current) return;
    imageFailureReported.current = true;
    setImageFailed(true);
    onImageFailure?.();
  };

  return (
    <section
      ref={atlasRef}
      aria-label={t("landing.atlas.story.aria")}
      className={`human-atlas-scroll${imageFailed ? " human-atlas-scroll--failed" : ""}`}
      data-active-scene={activeScene}
      data-motion={staticMotion ? "paused" : "running"}
      data-scene-motion={effectiveSceneMotion}
    >
      <div className={`human-atlas-stage${imageFailed ? " human-atlas-stage--failed" : ""}`}>
        {!imageFailed ? (
          <div className="human-atlas-media">
            <Image
              aria-hidden="true"
              alt=""
              data-atlas-camera
              decoding="async"
              draggable={false}
              fetchPriority="high"
              height={941}
              loading="eager"
              onError={handleImageFailure}
              sizes="100vw"
              src="/media/human-atlas-hero.webp"
              unoptimized
              width={1672}
            />
            <div className="human-atlas-glow-set">
              <HumanAtlasGlow activeScene={activeScene} motionAllowed={motionAllowed} />
            </div>
          </div>
        ) : (
          <p className="human-atlas-stage__fallback">{t("landing.atlas.imageFailure")}</p>
        )}
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
  onImageFailure,
}: Pick<HumanAtlasScrollProps, "motionDisabled" | "onImageFailure">) {
  const sceneElements = useRef<HumanAtlasSceneElements>({});
  const activeScene = useActiveAtlasScene(sceneElements);

  return (
    <HumanAtlasScrollView
      activeScene={activeScene}
      motionDisabled={motionDisabled ?? false}
      onImageFailure={onImageFailure}
      sceneMotion="parent"
      sceneElements={sceneElements}
    />
  );
}

export function HumanAtlasScroll({
  activeScene,
  motionDisabled = false,
  onImageFailure,
}: HumanAtlasScrollProps) {
  if (activeScene !== undefined) {
    return (
      <HumanAtlasScrollView
        activeScene={activeScene}
        motionDisabled={motionDisabled}
        onImageFailure={onImageFailure}
        sceneMotion="sequenced"
      />
    );
  }

  return (
    <HumanAtlasScrollUncontrolled
      motionDisabled={motionDisabled}
      onImageFailure={onImageFailure}
    />
  );
}
