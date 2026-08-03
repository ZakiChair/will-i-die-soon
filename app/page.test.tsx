import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import Home from "./page";

afterEach(() => {
  cleanup();
  document.documentElement.lang = "en";
});

test("localizes the active consent screen while preserving every entered profile field", async () => {
  const user = userEvent.setup();

  render(<Home />);

  await user.click(screen.getByRole("button", { name: "Choose Quick" }));
  const age = screen.getByRole("spinbutton", { name: "How old are you?" });
  await user.type(age, "42");
  await user.selectOptions(screen.getByRole("combobox", { name: "Country or region" }), "CH");
  await user.click(
    screen.getByRole("checkbox", { name: "I understand and want to continue" }),
  );

  expect(screen.getByRole("heading", { name: "Before we begin" })).toBeVisible();
  expect(age).toHaveValue(42);

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(document.documentElement).toHaveAttribute("lang", "fr");
  expect(screen.getByRole("heading", { name: "Avant de commencer" })).toBeVisible();
  expect(screen.getByRole("spinbutton", { name: "Quel âge avez-vous ?" })).toHaveValue(42);
  expect(screen.getByRole("combobox", { name: "Pays ou région" })).toHaveValue("CH");
  expect(
    screen.getByRole("checkbox", { name: "Je comprends et je souhaite continuer" }),
  ).toBeChecked();
});

test("keeps a Detailed question draft and canonical answer across an English-to-French switch", async () => {
  const user = userEvent.setup();

  render(<Home />);
  await user.click(screen.getByRole("button", { name: "Choose Detailed" }));
  await user.type(screen.getByRole("spinbutton", { name: "How old are you?" }), "42");
  await user.selectOptions(screen.getByRole("combobox", { name: "Country or region" }), "CH");
  await user.click(
    screen.getByRole("checkbox", { name: "I understand and want to continue" }),
  );
  await user.click(screen.getByRole("button", { name: "Start Detailed assessment" }));

  expect(screen.getByRole("heading", { name: "What sex were you assigned at birth?" }))
    .toBeVisible();
  await user.click(screen.getByRole("radio", { name: "Female" }));

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(
    screen.getByRole("heading", { name: "Quel sexe vous a-t-on attribué à la naissance ?" }),
  ).toBeVisible();
  expect(screen.getByRole("radio", { name: "Féminin" })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Continuer" }));
  await user.click(screen.getByRole("button", { name: "Retour" }));
  expect(screen.getByRole("radio", { name: "Féminin" })).toBeChecked();
});

test("localizes every consent country and the child Deep fallback without changing the selected route", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "Choose Deep" }));
  await user.click(screen.getByRole("button", { name: "Français" }));

  const country = screen.getByRole("combobox", { name: "Pays ou région" });
  expect(country).toContainHTML("Suisse");
  expect(country).toContainHTML("Royaume-Uni");
  expect(country).toContainHTML("États-Unis");
  expect(country).toContainHTML("Autre pays ou région");
  await user.type(screen.getByRole("spinbutton", { name: "Quel âge avez-vous ?" }), "12");
  await user.selectOptions(country, "CH");
  await user.click(
    screen.getByRole("checkbox", { name: "Je comprends et je souhaite continuer" }),
  );

  expect(screen.getByText("Le mode accompagné par un adulte est obligatoire")).toBeVisible();
  await user.click(
    screen.getByRole("radio", { name: "Un parent, un tuteur ou un adulte de confiance m'aide" }),
  );
  expect(screen.getByRole("status")).toHaveTextContent(/150 questions admissibles/i);
  expect(screen.getByRole("button", { name: "Utiliser l'analyse détaillée" })).toBeVisible();
});

test("keeps the adolescent private route selected when consent changes to French", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "Choose Quick" }));
  await user.type(screen.getByRole("spinbutton", { name: "How old are you?" }), "15");
  await user.selectOptions(screen.getByRole("combobox", { name: "Country or region" }), "GB");
  await user.click(screen.getByRole("radio", { name: "Answer privately on my own" }));
  await user.click(
    screen.getByRole("checkbox", { name: "I understand and want to continue" }),
  );

  await user.click(screen.getByRole("button", { name: "Français" }));

  expect(screen.getByRole("radio", { name: "Répondre seul, en privé" })).toBeChecked();
  expect(screen.getByRole("combobox", { name: "Pays ou région" })).toHaveValue("GB");
  expect(screen.getByRole("button", { name: "Commencer l'analyse Rapide" })).toBeEnabled();
});
