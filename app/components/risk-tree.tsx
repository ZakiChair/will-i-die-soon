"use client";

import { useState } from "react";

import type { EvidenceTier, RiskLeaf } from "../lib/types";

export type RiskTreeProps = {
  readonly leaves: ReadonlyArray<RiskLeaf>;
  readonly protectiveRoots: ReadonlyArray<string>;
};

const EVIDENCE_TIER_LABELS: Readonly<Record<EvidenceTier, string>> = {
  "validated-estimate": "Validated estimate",
  "authoritative-safety": "Authoritative safety",
  "guideline-action": "Guideline action",
  "evidence-limited-association": "Evidence-limited association",
};

function humanizeQuestionId(questionId: string): string {
  return questionId.replaceAll("_", " ").replaceAll("-", " ");
}

function LeafList({
  leaves,
  selectedId,
  onSelect,
}: {
  readonly leaves: ReadonlyArray<RiskLeaf>;
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
}) {
  if (leaves.length === 0) {
    return (
      <ul className="risk-tree__leaves risk-tree__leaves--empty">
        <li>No matched signal in this branch.</li>
      </ul>
    );
  }

  return (
    <ul className="risk-tree__leaves">
      {leaves.map((leaf) => (
        <li key={leaf.id}>
          <button
            type="button"
            aria-controls="risk-evidence-panel"
            aria-pressed={selectedId === leaf.id}
            onClick={() => onSelect(leaf.id)}
          >
            {leaf.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

function EvidencePanel({ leaf }: { readonly leaf: RiskLeaf | undefined }) {
  if (!leaf) {
    return (
      <aside className="risk-evidence risk-evidence--empty" aria-label="Evidence details">
        <p className="data-label">Evidence notebook</p>
        <p>Select a reported signal to review its factors and sources.</p>
      </aside>
    );
  }

  const headingId = `risk-evidence-${leaf.id}`;
  return (
    <aside
      id="risk-evidence-panel"
      className="risk-evidence"
      role="region"
      aria-labelledby={headingId}
    >
      <p className="data-label">Evidence notebook</p>
      <h3 id={headingId}>{leaf.title}</h3>
      <p className="risk-evidence__copy">{leaf.copy}</p>
      <dl className="risk-evidence__ledger">
        <div>
          <dt>Careful signal wording</dt>
          <dd>{leaf.signal.replaceAll("-", " ")}; this is qualitative, not a probability.</dd>
        </div>
        <div>
          <dt>Evidence tier</dt>
          <dd>{EVIDENCE_TIER_LABELS[leaf.evidenceTier]}</dd>
        </div>
        <div>
          <dt>Self-reported factors</dt>
          <dd>
            <ul>
              {leaf.factors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt>Missing inputs</dt>
          <dd>
            {leaf.missingInputs.length > 0 ? (
              <ul>
                {leaf.missingInputs.map((questionId) => (
                  <li key={questionId}>{humanizeQuestionId(questionId)}</li>
                ))}
              </ul>
            ) : (
              "No additional inputs named by this rule."
            )}
          </dd>
        </div>
        <div>
          <dt>Applicable sources</dt>
          <dd>
            <ul>
              {leaf.sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>{" "}
                  <span>— {source.publisher}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </aside>
  );
}

export function RiskTree({ leaves, protectiveRoots }: RiskTreeProps) {
  const [requestedLeafId, setRequestedLeafId] = useState<string | undefined>(
    leaves[0]?.id,
  );
  const selectedLeaf =
    leaves.find((leaf) => leaf.id === requestedLeafId) ?? leaves[0];
  const urgent = leaves.filter((leaf) => leaf.urgency === "urgent");
  const medicalReview = leaves.filter(
    (leaf) => leaf.urgency === "prompt-review" || leaf.urgency === "support",
  );
  const longerTerm = leaves.filter((leaf) => leaf.urgency === "long-term");

  return (
    <div className="risk-canopy-layout">
      <nav className="risk-tree" aria-label="Living risk canopy">
        <p className="risk-tree__root">You today</p>
        <ul className="risk-tree__branches">
          <li className="risk-tree__branch risk-tree__branch--urgent">
            <span className="risk-tree__branch-label">Urgent signals</span>
            <LeafList
              leaves={urgent}
              selectedId={selectedLeaf?.id}
              onSelect={setRequestedLeafId}
            />
          </li>
          <li className="risk-tree__branch risk-tree__branch--review">
            <span className="risk-tree__branch-label">Medical review</span>
            <LeafList
              leaves={medicalReview}
              selectedId={selectedLeaf?.id}
              onSelect={setRequestedLeafId}
            />
          </li>
          <li className="risk-tree__branch risk-tree__branch--longer">
            <span className="risk-tree__branch-label">Longer-term domains</span>
            <LeafList
              leaves={longerTerm}
              selectedId={selectedLeaf?.id}
              onSelect={setRequestedLeafId}
            />
          </li>
          <li className="risk-tree__branch risk-tree__branch--protective">
            <span className="risk-tree__branch-label">Protective roots</span>
            <ul className="risk-tree__roots">
              {protectiveRoots.length > 0 ? (
                protectiveRoots.map((root) => <li key={root}>{root}</li>)
              ) : (
                <li>No protective root was confirmed in the answers shown.</li>
              )}
            </ul>
          </li>
        </ul>
      </nav>
      <EvidencePanel leaf={selectedLeaf} />
    </div>
  );
}
