"use client";

import { useEffect, useState } from "react";
import { Assessment } from "./components/assessment";
import { ConsentScreen } from "./components/consent-screen";
import { Landing } from "./components/landing";
import { LanguageSwitcher } from "./components/language-switcher";
import { Results } from "./components/results";
import { I18nProvider } from "./i18n/context";
import type { ConfirmedLabValue } from "./lib/labs";
import type { AnalysisDepth, AnswerMap, ProfileContext } from "./lib/types";

type AppScreen =
  | { kind: "landing" }
  | { kind: "consent"; depth: AnalysisDepth }
  | { kind: "assessment"; depth: AnalysisDepth; profile: ProfileContext }
  | {
      kind: "results";
      depth: AnalysisDepth;
      answers: AnswerMap;
      confirmedLabs: ConfirmedLabValue[];
      profile: ProfileContext;
    };

function HomeExperience() {
  const [screen, setScreen] = useState<AppScreen>({ kind: "landing" });

  useEffect(() => {
    if (screen.kind !== "assessment") return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [screen.kind]);

  if (screen.kind === "landing") {
    return (
      <main>
        <Landing onStart={(depth) => setScreen({ kind: "consent", depth })} />
      </main>
    );
  }

  if (screen.kind === "consent") {
    return (
      <main>
        <ConsentScreen
          depth={screen.depth}
          onAccept={(profile, depth) =>
            setScreen({ kind: "assessment", depth, profile })
          }
        />
      </main>
    );
  }

  if (screen.kind === "assessment") {
    return (
      <main>
        <Assessment
          depth={screen.depth}
          profile={screen.profile}
          onComplete={(answers, confirmedLabs) =>
            setScreen({
              kind: "results",
              depth: screen.depth,
              answers,
              confirmedLabs,
              profile: screen.profile,
            })
          }
        />
      </main>
    );
  }

  return (
    <main>
      <Results
        answers={screen.answers}
        assessmentDepth={screen.depth}
        confirmedLabs={screen.confirmedLabs}
        profile={screen.profile}
        onRestart={() => setScreen({ kind: "landing" })}
      />
    </main>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <LanguageSwitcher />
      <HomeExperience />
    </I18nProvider>
  );
}
