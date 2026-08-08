import { render, screen, within } from "@testing-library/react";
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

function leaf(
  id: string,
  ruleId: string,
  title: string,
  missingInputs: ReadonlyArray<string>,
  urgency: RiskLeaf["urgency"] = "prompt-review",
): RiskLeaf {
  return {
    id,
    ruleId,
    rulesetVersion: "risk-rules-v1",
    group: "cardiovascular",
    title,
    copy: `${title} copy`,
    evidenceTier: "guideline-action",
    urgency,
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
          leaf("first", "urgent-chest", "First signal", [], "urgent"),
          leaf("second", "adult-short-sleep", "Second signal", ["sex_assigned_at_birth"], "long-term"),
        ]}
        protectiveRoots={["A protective root"]}
      />
    </I18nProvider>,
  );

  await user.click(screen.getByRole("button", { name: /Second signal/ }));
  expect(screen.getByRole("button", { name: /Second signal/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByRole("button", { name: /Second signal/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByText("Carnet de preuves")).toBeVisible();
  expect(screen.getByText("Version des règles")).toBeVisible();
  expect(screen.getByText("risk-rules-v1")).toBeVisible();
  expect(screen.getByText("Action fondée sur des recommandations")).toBeVisible();
  expect(screen.getByText("À plus long terme")).toBeVisible();
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
  const frenchNavigation = screen.getByRole("navigation", { name: /piliers de signaux de santé/i });
  expect(within(frenchNavigation).getAllByRole("listitem", { name: /pilier/i })).toHaveLength(4);
  expect(within(frenchNavigation).getByText("Sommeil et rythme circadien")).toBeVisible();
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

  expect(screen.getAllByText("Aucun signal correspondant dans cette branche.")).toHaveLength(4);
  expect(document.querySelectorAll("ul.risk-tree__leaves--empty[data-risk-tree-item]")).toHaveLength(4);
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
    ...leaf("sparse", "adult-short-sleep", "Sparse signal", []),
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

test("renders exactly four labelled pillars in product order and keeps roots outside them", () => {
  render(
    <I18nProvider>
      <RiskTree
        leaves={[
          leaf("chest", "urgent-chest", "Chest signal", [], "urgent"),
          leaf("sleep", "adult-short-sleep", "Sleep signal", []),
          leaf("mood", "low-mood-support", "Mood signal", [], "support"),
          leaf("food", "alcohol-control-support", "Food signal", []),
        ]}
        protectiveRoots={["Reliable social support"]}
      />
    </I18nProvider>,
  );

  const navigation = screen.getByRole("navigation", { name: /health signal pillars/i });
  const branches = within(navigation).getAllByRole("listitem", { name: /pillar/i });
  expect(branches).toHaveLength(4);
  expect(branches.map((branch) => branch.getAttribute("class"))).toEqual([
    expect.stringContaining("cardio-energy"),
    expect.stringContaining("strength-neural"),
    expect.stringContaining("sleep-circadian"),
    expect.stringContaining("nutrition-metabolic"),
  ]);
  expect(within(branches[0]).getByText("Chest signal")).toBeVisible();
  expect(within(branches[1]).getByText("Mood signal")).toBeVisible();
  expect(within(branches[2]).getByText("Sleep signal")).toBeVisible();
  expect(within(branches[3]).getByText("Food signal")).toBeVisible();
  expect(within(navigation).getByText("Protective roots").closest("section")).toHaveClass(
    "risk-tree__foundation",
  );
  expect(within(navigation).queryByText("Medical review")).not.toBeInTheDocument();
  expect(within(navigation).queryByText("Longer-term domains")).not.toBeInTheDocument();
});

test("marks the trunk, branches, leaf groups, and foundation without changing their semantics", () => {
  render(
    <I18nProvider>
      <RiskTree
        leaves={[leaf("chest", "urgent-chest", "Chest signal", [], "urgent")]}
        protectiveRoots={["Reliable social support"]}
      />
    </I18nProvider>,
  );

  const navigation = screen.getByRole("navigation", { name: /health signal pillars/i });
  expect(navigation).toHaveAttribute("data-risk-tree-trunk");
  const branches = within(navigation).getAllByRole("listitem", { name: /pillar/i });
  expect(branches).toHaveLength(4);
  for (const branch of branches) {
    expect(branch).toHaveAttribute("data-risk-tree-branch");
    expect(branch).toHaveAttribute("data-risk-tree-item");
    const leafGroup = branch.querySelector(":scope > ul");
    expect(leafGroup).toHaveAttribute("data-risk-tree-item");
    expect(leafGroup?.tagName).toBe("UL");
  }
  expect(within(navigation).getByText("Protective roots").closest("section"))
    .toHaveAttribute("data-risk-tree-item");
});

test("marks both animated ancestors of a focused leaf during construction", () => {
  render(
    <I18nProvider>
      <RiskTree
        leaves={[leaf("chest", "urgent-chest", "Chest signal", [], "urgent")]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );

  const button = screen.getByRole("button", { name: /Chest signal/ });
  const leafGroup = button.closest("ul");
  const branch = button.closest("[data-risk-tree-branch]");
  if (!(leafGroup instanceof HTMLElement) || !(branch instanceof HTMLElement)) {
    throw new Error("Missing risk-tree focus ancestors");
  }
  leafGroup.style.opacity = "0";
  leafGroup.style.transform = "translateY(10px)";
  branch.style.opacity = "0";
  branch.style.transform = "translateY(16px)";

  button.focus();

  expect(button).toHaveFocus();
  expect(leafGroup).toHaveAttribute("data-risk-tree-item");
  expect(branch).toHaveAttribute("data-risk-tree-item");
  expect(leafGroup).toContainElement(document.activeElement as HTMLElement);
  expect(branch).toContainElement(document.activeElement as HTMLElement);
});

test("keeps leaf order, accessible selection, urgency, and evidence metadata functional", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <RiskTree
        leaves={[
          leaf("first", "urgent-chest", "First cardio signal", [], "urgent"),
          leaf("second", "urgent-breathing", "Second cardio signal", []),
        ]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );

  const first = screen.getByRole("button", { name: /First cardio signal.*Urgent.*Guideline action/i });
  const second = screen.getByRole("button", { name: /Second cardio signal.*Prompt review.*Guideline action/i });
  expect(first).toHaveAttribute("aria-pressed", "true");
  expect(first).toHaveAttribute("aria-controls", "risk-evidence-panel");
  first.focus();
  expect(first).toHaveFocus();
  await user.tab();
  expect(second).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(second).toHaveAttribute("aria-pressed", "true");
  expect(first).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("region", { name: "Second cardio signal" })).toHaveTextContent(
    "Prompt review",
  );
  expect(screen.getByRole("region", { name: "Second cardio signal" })).toHaveTextContent(
    "Evidence tier",
  );
});

test("throws explicitly when a displayed leaf has no pillar mapping", () => {
  expect(() =>
    render(
      <I18nProvider>
        <RiskTree leaves={[leaf("unknown", "not-a-risk-rule", "Unknown signal", [])]} protectiveRoots={[]} />
      </I18nProvider>,
    ),
  ).toThrow("Missing health-pillar mapping for risk rule: not-a-risk-rule");
});
