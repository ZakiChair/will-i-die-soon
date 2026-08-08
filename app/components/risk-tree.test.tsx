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

test("wraps each evidence-panel branch exactly once without changing content order", () => {
  const populated = render(
    <I18nProvider>
      <RiskTree
        leaves={[leaf("first", "urgent-chest", "First signal", [], "urgent")]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );
  const region = screen.getByRole("region", { name: "First signal" });
  const populatedWrappers = region.querySelectorAll("[data-evidence-transition]");
  expect(populatedWrappers).toHaveLength(1);
  expect(populatedWrappers[0]).toHaveClass("risk-evidence__content");
  expect(Array.from(populatedWrappers[0].children, (child) => child.tagName)).toEqual([
    "P",
    "H3",
    "P",
    "DL",
  ]);
  expect(region).toHaveAttribute("id", "risk-evidence-panel");
  expect(region).toHaveAttribute("aria-labelledby", "risk-evidence-first");
  populated.unmount();

  render(
    <I18nProvider>
      <RiskTree leaves={[]} protectiveRoots={[]} />
    </I18nProvider>,
  );
  const emptyPanel = screen.getByLabelText("Evidence details");
  const emptyWrappers = emptyPanel.querySelectorAll("[data-evidence-transition]");
  expect(emptyWrappers).toHaveLength(1);
  expect(emptyWrappers[0]).toHaveClass("risk-evidence__content");
  expect(Array.from(emptyWrappers[0].children, (child) => child.tagName)).toEqual(["P", "P"]);
});

test("announces only the selected English title while retaining leaf focus and semantics", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <RiskTree
        leaves={[
          leaf("first", "urgent-chest", "First signal", [], "urgent"),
          leaf("second", "adult-short-sleep", "Second signal", []),
        ]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );
  const status = screen.getByRole("status");
  const second = screen.getByRole("button", { name: /Second signal/ });
  expect(status).toBeEmptyDOMElement();
  expect(status).toHaveAttribute("aria-live", "polite");
  expect(status).toHaveAttribute("aria-atomic", "true");

  await user.click(second);

  expect(second).toHaveFocus();
  expect(second).toHaveAttribute("aria-pressed", "true");
  expect(second).toHaveAttribute("aria-controls", "risk-evidence-panel");
  expect(screen.getByRole("region", { name: "Second signal" })).toHaveTextContent(
    "Second signal copy",
  );
  expect(status).toHaveTextContent("Evidence selected: Second signal");
  expect(status).not.toHaveTextContent("Second signal copy");
});

test("announces a user selection in the active French locale", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <LanguageSwitcher />
      <RiskTree
        leaves={[
          leaf("first", "urgent-chest", "First signal", [], "urgent"),
          leaf("second", "adult-short-sleep", "Second signal", []),
        ]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );

  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  await user.click(screen.getByRole("button", { name: /Second signal/ }));

  expect(screen.getByRole("status").textContent).toBe(
    "Preuve sélectionnée\u00a0: Second signal",
  );
});

test("clears a prior announcement when locale and localized evidence change", async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <I18nProvider>
      <LanguageSwitcher />
      <RiskTree
        leaves={[
          leaf("first", "urgent-chest", "First signal", [], "urgent"),
          leaf("second", "adult-short-sleep", "Second signal", []),
        ]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );
  await user.click(screen.getByRole("button", { name: /Second signal/ }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Evidence selected: Second signal",
  );

  await user.click(screen.getByRole("button", { name: "Français" }));
  rerender(
    <I18nProvider>
      <LanguageSwitcher />
      <RiskTree
        leaves={[
          leaf("first", "urgent-chest", "Premier signal", [], "urgent"),
          leaf("second", "adult-short-sleep", "Deuxième signal", []),
        ]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("region", { name: "Deuxième signal" })).toHaveTextContent(
    "Carnet de preuves",
  );
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

test("clears an announcement when its selected leaf is removed", async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <I18nProvider>
      <RiskTree
        leaves={[
          leaf("first", "urgent-chest", "First signal", [], "urgent"),
          leaf("second", "adult-short-sleep", "Second signal", []),
        ]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );
  await user.click(screen.getByRole("button", { name: /Second signal/ }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Evidence selected: Second signal",
  );

  rerender(
    <I18nProvider>
      <RiskTree
        leaves={[leaf("first", "urgent-chest", "First signal", [], "urgent")]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("region", { name: "First signal" })).toBeVisible();
  expect(screen.getByRole("button", { name: /First signal/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

test("keeps only the final title after rapid evidence selections", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider>
      <RiskTree
        leaves={[
          leaf("first", "urgent-chest", "First signal", [], "urgent"),
          leaf("second", "urgent-breathing", "Second signal", []),
          leaf("third", "adult-short-sleep", "Third signal", []),
        ]}
        protectiveRoots={[]}
      />
    </I18nProvider>,
  );

  await user.click(screen.getByRole("button", { name: /Second signal/ }));
  await user.click(screen.getByRole("button", { name: /Third signal/ }));

  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("Evidence selected: Third signal");
  expect(status).not.toHaveTextContent("Second signal");
  expect(status).not.toHaveTextContent("Third signal copy");
  expect(status).toHaveAttribute("aria-live", "polite");
  expect(status).toHaveAttribute("aria-atomic", "true");
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
