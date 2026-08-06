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
import { useDecorativeMotion } from "../hooks/use-decorative-motion";
import { useI18n } from "../i18n/context";
import { HumanAtlasGlow } from "./human-atlas-glow";

type HumanAtlasScrollProps = Readonly<{
  activeScene?: HumanAtlasSceneId;
}>;

type HumanAtlasScrollViewProps = Readonly<{
  activeScene: HumanAtlasSceneId;
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
  sceneElements,
}: HumanAtlasScrollViewProps) {
  const { t } = useI18n();
  const motionAllowed = useDecorativeMotion();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section
      aria-label={t("landing.atlas.story.aria")}
      className={`human-atlas-scroll${imageFailed ? " human-atlas-scroll--failed" : ""}`}
      data-active-scene={activeScene}
    >
      <div className={`human-atlas-stage${imageFailed ? " human-atlas-stage--failed" : ""}`}>
        {!imageFailed ? (
          <div className="human-atlas-media">
            <Image
              aria-hidden="true"
              alt=""
              decoding="async"
              draggable={false}
              fetchPriority="high"
              height={941}
              loading="eager"
              onError={() => setImageFailed(true)}
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
          {humanAtlasScenes.map((scene) => (
            <span data-active={activeScene === scene.id ? "true" : "false"} key={scene.id} />
          ))}
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
              <p className="data-label">{t(scene.eyebrowKey)}</p>
              <h3>{t(scene.titleKey)}</h3>
              <p>{t(scene.descriptionKey)}</p>
              <small>{t(scene.inputLabelKey)}</small>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function HumanAtlasScrollUncontrolled() {
  const sceneElements = useRef<HumanAtlasSceneElements>({});
  const activeScene = useActiveAtlasScene(sceneElements);

  return (
    <HumanAtlasScrollView
      activeScene={activeScene}
      sceneElements={sceneElements}
    />
  );
}

export function HumanAtlasScroll({ activeScene }: HumanAtlasScrollProps) {
  if (activeScene !== undefined) {
    return <HumanAtlasScrollView activeScene={activeScene} />;
  }

  return <HumanAtlasScrollUncontrolled />;
}
