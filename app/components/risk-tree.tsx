"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { questionBank } from "../data/questions";
import { useI18n } from "../i18n/context";
import { localizeQuestion } from "../i18n/questions-fr";
import { uiCopyKeys } from "../i18n/ui-copy";
import { HEALTH_PILLARS, indexRiskLeavesByPillar } from "../lib/health-pillars";
import type { RiskLeaf } from "../lib/types";
import { useEvidenceTransition } from "../hooks/use-evidence-transition";
import { useRiskTreeConstruction } from "../hooks/use-risk-tree-construction";

export type RiskTreeProps = {
  readonly leaves: ReadonlyArray<RiskLeaf>;
  readonly protectiveRoots: ReadonlyArray<string>;
};

type EvidenceAnnouncement = Readonly<{
  leafId: string;
  locale: string;
  message: string;
  title: string;
}>;

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

function LeafList({
  leaves,
  selectedId,
  onSelect,
}: {
  readonly leaves: ReadonlyArray<RiskLeaf>;
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  if (leaves.length === 0) {
    return (
      <ul className="risk-tree__leaves risk-tree__leaves--empty" data-risk-tree-item>
        <li>{t("riskTree.emptyBranch")}</li>
      </ul>
    );
  }

  return (
    <ul className="risk-tree__leaves" data-risk-tree-item>
      {leaves.map((leaf) => (
        <li key={leaf.id}>
          <button
            type="button"
            aria-controls="risk-evidence-panel"
            aria-pressed={selectedId === leaf.id}
            onClick={() => onSelect(leaf.id)}
          >
            <span className="risk-tree__leaf-title">{leaf.title}</span>
            <span className="risk-tree__leaf-meta">
              {t(uiCopyKeys.riskUrgency[leaf.urgency])} · {t(uiCopyKeys.evidenceTier[leaf.evidenceTier])}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function EvidencePanel({
  evidenceRef,
  leaf,
}: {
  readonly evidenceRef: RefObject<HTMLDivElement | null>;
  readonly leaf: RiskLeaf | undefined;
}) {
  const { locale, t } = useI18n();

  function missingInputLabel(questionId: string) {
    const question = questionsById.get(questionId);
    return question
      ? localizeQuestion(question, locale).prompt
      : t("riskTree.missingUnknown");
  }

  if (!leaf) {
    return (
      <aside
        className="risk-evidence risk-evidence--empty"
        aria-label={t("riskTree.evidence.aria")}
      >
        <div
          ref={evidenceRef}
          className="risk-evidence__content"
          data-evidence-transition
        >
          <p className="data-label">{t("riskTree.notebook")}</p>
          <p>{t("riskTree.select")}</p>
        </div>
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
      <div
        ref={evidenceRef}
        className="risk-evidence__content"
        data-evidence-transition
      >
        <p className="data-label">{t("riskTree.notebook")}</p>
        <h3 id={headingId}>{leaf.title}</h3>
        <p className="risk-evidence__copy">{leaf.copy}</p>
        <dl className="risk-evidence__ledger">
          <div>
            <dt>{t("riskTree.signal")}</dt>
            <dd>
              {t("riskTree.signal.qualifier", {
                signal: t(uiCopyKeys.riskSignal[leaf.signal]),
              })}
            </dd>
          </div>
          <div>
            <dt>{t("riskTree.urgency")}</dt>
            <dd>{t(uiCopyKeys.riskUrgency[leaf.urgency])}</dd>
          </div>
          <div>
            <dt>{t("riskTree.tier")}</dt>
            <dd>{t(uiCopyKeys.evidenceTier[leaf.evidenceTier])}</dd>
          </div>
          <div>
            <dt>{t("riskTree.ruleset")}</dt>
            <dd>{leaf.rulesetVersion}</dd>
          </div>
          <div>
            <dt>{t("riskTree.factors")}</dt>
            <dd>
              {leaf.factors.length > 0 ? (
                <ul>
                  {leaf.factors.map((factor) => (
                    <li key={factor}>{factor}</li>
                  ))}
                </ul>
              ) : (
                t("riskTree.noFactors")
              )}
            </dd>
          </div>
          <div>
            <dt>{t("riskTree.missing")}</dt>
            <dd>
              {leaf.missingInputs.length > 0 ? (
                <ul>
                  {leaf.missingInputs.map((questionId) => (
                    <li key={questionId}>{missingInputLabel(questionId)}</li>
                  ))}
                </ul>
              ) : (
                t("riskTree.noMissing")
              )}
            </dd>
          </div>
          <div>
            <dt>{t("riskTree.sources")}</dt>
            <dd>
              {leaf.sources.length > 0 ? (
                <ul>
                  {leaf.sources.map((source) => (
                    <li key={source.id}>
                      <span className="data-label">{t("riskTree.source.open")}</span>{" "}
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                      <span>{t("riskTree.source.publisher", { publisher: source.publisher })}</span>
                      <span>{t("riskTree.source.reviewed", { date: source.reviewedAt })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                t("riskTree.noSources")
              )}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

export function RiskTree({ leaves, protectiveRoots }: RiskTreeProps) {
  const { locale, t } = useI18n();
  const treeRef = useRef<HTMLElement>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);
  useRiskTreeConstruction(treeRef);
  const [requestedLeafId, setRequestedLeafId] = useState<string | undefined>(
    leaves[0]?.id,
  );
  const [announcement, setAnnouncement] = useState<EvidenceAnnouncement | null>(null);
  const selectedLeaf =
    leaves.find((leaf) => leaf.id === requestedLeafId) ?? leaves[0];
  useEvidenceTransition(evidenceRef, selectedLeaf?.id);
  const leavesByPillar = indexRiskLeavesByPillar(leaves);
  const announcementIsValid = Boolean(
    announcement
    && announcement.locale === locale
    && announcement.leafId === selectedLeaf?.id
    && announcement.title === selectedLeaf.title,
  );
  const renderedAnnouncement = announcementIsValid ? announcement?.message : "";

  useEffect(() => {
    if (!announcement || announcementIsValid) return;
    // A committed mismatch permanently consumes this one-shot live message.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnnouncement((current) => current === announcement ? null : current);
  }, [announcement, announcementIsValid]);

  const handleSelect = (id: string) => {
    const nextLeaf = leaves.find((leaf) => leaf.id === id);
    if (!nextLeaf) return;
    setRequestedLeafId(id);
    setAnnouncement({
      leafId: nextLeaf.id,
      locale,
      message: t("riskTree.evidence.selected", { title: nextLeaf.title }),
      title: nextLeaf.title,
    });
  };

  return (
    <div className="risk-canopy-layout">
      <nav
        ref={treeRef}
        className="risk-tree"
        aria-label={t("riskTree.aria")}
        data-risk-tree-trunk
      >
        <p className="risk-tree__root">{t("riskTree.root")}</p>
        <p className="data-label">{t("riskTree.signals")}</p>
        {leaves.length === 0 ? (
          <p className="risk-tree__empty" role="status">{t("riskTree.emptySignals")}</p>
        ) : null}
        <ul className="risk-tree__branches">
          {HEALTH_PILLARS.map((pillar) => (
            <li
              key={pillar}
              className={`risk-tree__branch risk-tree__branch--${pillar}`}
              aria-label={t("riskTree.pillar.aria", { pillar: t(uiCopyKeys.pillar[pillar]) })}
              data-risk-tree-branch
              data-risk-tree-item
            >
              <span className="risk-tree__branch-label">{t(uiCopyKeys.pillar[pillar])}</span>
              <LeafList
                leaves={leavesByPillar[pillar]}
                selectedId={selectedLeaf?.id}
                onSelect={handleSelect}
              />
            </li>
          ))}
        </ul>
        <section
          className="risk-tree__foundation"
          aria-label={t("riskTree.protective")}
          data-risk-tree-item
        >
          <span className="risk-tree__branch-label">{t("riskTree.protective")}</span>
          <ul className="risk-tree__roots">
            {protectiveRoots.length > 0 ? (
              protectiveRoots.map((root) => <li key={root}>{root}</li>)
            ) : (
              <li>{t("riskTree.emptyProtective")}</li>
            )}
          </ul>
        </section>
      </nav>
      <EvidencePanel evidenceRef={evidenceRef} leaf={selectedLeaf} />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {renderedAnnouncement}
      </p>
    </div>
  );
}
