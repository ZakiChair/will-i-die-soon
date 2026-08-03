"use client";

import { useEffect, useState } from "react";
import { Assessment } from "./components/assessment";
import { ConsentScreen } from "./components/consent-screen";
import { Landing } from "./components/landing";
import type { AnalysisDepth, AnswerMap, ProfileContext } from "./lib/types";

type AppScreen =
  | { kind: "landing" }
  | { kind: "consent"; depth: AnalysisDepth }
  | { kind: "assessment"; depth: AnalysisDepth; profile: ProfileContext }
  | { kind: "results"; answers: AnswerMap; profile: ProfileContext };

export default function Home() {
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
          onComplete={(answers) =>
            setScreen({ kind: "results", answers, profile: screen.profile })
          }
        />
      </main>
    );
  }

  return (
    <main className="journey completion-handoff">
      <p className="data-label">Assessment complete</p>
      <h1>Your answers are ready for the next step.</h1>
      <p>
        This temporary handoff keeps the completed answers in memory. Results and scoring
        are intentionally handled by the next stage of the prototype.
      </p>
    </main>
  );
}
