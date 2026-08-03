import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { I18nProvider } from "../i18n/context";
import type { RiskLeaf } from "../lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { RiskTree } from "./risk-tree";

const source = {
  id: "source-1",
  title: "Official evidence title",
  publisher: "Official publisher",
  url: "https://example.test/evidence",
  reviewedAt: "2026-08-01",
  jurisdictions: "all" as const,
  applicability: { countries: "all" as const },
};

function leaf(id: string, title: string, missingInputs: ReadonlyArray<string>): RiskLeaf {
  return {
    id,
    ruleId: id,
    rulesetVersion: "risk-rules-v1",
    group: "cardiovascular",
    title,
    copy: `${title} copy`,
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "worth-attention",
    factors: ["A self-reported factor"],
    missingInputs,
    sources: [source],
    applicability: { countries: "all" },
  };
}

test("keeps the selected evidence leaf while localizing ledger and missing-question copy", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <LanguageSwitcher />
      <RiskTree
        leaves={[
          leaf("first", "First signal", []),
          leaf("second", "Second signal", ["sex_assigned_at_birth"]),
        ]}
        protectiveRoots={["A protective root"]}
      />
    </I18nProvider>,
  );

  await user.click(screen.getByRole("button", { name: "Second signal" }));
  expect(screen.getByRole("button", { name: "Second signal" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByRole("button", { name: "Second signal" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByText("Carnet de preuves")).toBeVisible();
  expect(screen.getByText("Version des règles")).toBeVisible();
  expect(screen.getByText("risk-rules-v1")).toBeVisible();
  expect(screen.getByText("Action fondée sur des recommandations")).toBeVisible();
  expect(screen.getByText(/Mérite votre attention/)).toBeVisible();
  expect(
    screen.getByText(/Quel sexe vous a-t-on attribué à la naissance/),
  ).toBeVisible();
  expect(screen.queryByText(/sex assigned at birth/i)).not.toBeInTheDocument();
  const publisher = screen.getByText(/Official publisher/);
  expect(publisher).toBeVisible();
  expect(publisher.textContent).toBe("Éditeur\u00a0: Official publisher");
  expect(screen.getByText("Vérifié le 2026-08-01")).toBeVisible();
  expect(screen.getByText("Ouvrir la source")).toBeVisible();
  expect(screen.getByRole("link", { name: "Official evidence title" })).toHaveAttribute(
    "href",
    source.url,
  );
});

test("localizes empty branches and the protective fallback", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <LanguageSwitcher />
      <RiskTree leaves={[]} protectiveRoots={[]} />
    </I18nProvider>,
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getAllByText("Aucun signal correspondant dans cette branche.")).toHaveLength(3);
  expect(
    screen.getByText(
      "Aucun signal qualitatif n'a atteint le seuil d'affichage dans les réponses fournies.",
    ),
  ).toBeVisible();
  expect(
    screen.getByText("Aucun facteur protecteur n'a été confirmé dans les réponses affichées."),
  ).toBeVisible();
  expect(screen.getByText("Sélectionnez un signal affiché pour examiner ses facteurs et ses sources."))
    .toBeVisible();
});

test("renders explicit empty factor and source states without inventing evidence", async () => {
  const user = userEvent.setup();
  const sparseLeaf = {
    ...leaf("sparse", "Sparse signal", []),
    factors: [],
    sources: [],
  };
  render(
    <I18nProvider>
      <LanguageSwitcher />
      <RiskTree leaves={[sparseLeaf]} protectiveRoots={[]} />
    </I18nProvider>,
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByText("Aucun facteur contributif n'est indiqué.")).toBeVisible();
  expect(screen.getByText("Aucune source n'est associée à ce signal.")).toBeVisible();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
