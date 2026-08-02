"use client";

import { useState } from "react";
import { Landing, type AnalysisDepth } from "./components/landing";

export default function Home() {
  const [selectedDepth, setSelectedDepth] = useState<AnalysisDepth | null>(null);

  return (
    <main>
      <Landing onStart={setSelectedDepth} />
      <p className="sr-only" aria-live="polite">
        {selectedDepth ? `${selectedDepth} exploration selected.` : ""}
      </p>
    </main>
  );
}
