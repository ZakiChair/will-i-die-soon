"use client";

import type { HealthDomain } from "../lib/types";

export type IntermissionProps = {
  completedDomain: HealthDomain;
  completed: number;
  total: number;
  onContinue: () => void;
};

function domainLabel(domain: HealthDomain) {
  return domain.replaceAll("-", " ");
}

export function Intermission({
  completedDomain,
  completed,
  total,
  onContinue,
}: IntermissionProps) {
  return (
    <section className="intermission" aria-labelledby="intermission-title">
      <p className="data-label">Milestone · {completed} of {total}</p>
      <h1 id="intermission-title">A moment to let the map settle.</h1>
      <p>
        You have completed the {domainLabel(completedDomain)} section. Your answers
        are still here in this browser session.
      </p>
      <div className="intermission__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <button className="primary-action" type="button" onClick={onContinue} autoFocus>
        Continue assessment
      </button>
    </section>
  );
}
