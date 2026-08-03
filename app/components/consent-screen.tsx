"use client";

import { useState } from "react";
import { questionBank } from "../data/questions";
import { getAvailableDepths } from "../lib/questionnaire";
import type { AnalysisDepth, ProfileContext } from "../lib/types";

export type ConsentScreenProps = {
  depth: AnalysisDepth;
  onAccept: (profile: ProfileContext, depth: AnalysisDepth) => void;
};

type MinorMode = "assisted" | "private";

const depthLabels: Readonly<Record<AnalysisDepth, string>> = {
  quick: "Quick",
  detailed: "Detailed",
  deep: "Deep",
};

export function ConsentScreen({ depth, onAccept }: ConsentScreenProps) {
  const [ageInput, setAgeInput] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [minorMode, setMinorMode] = useState<MinorMode | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [selectedDepth, setSelectedDepth] = useState(depth);
  const parsedAge = ageInput === "" ? null : Number(ageInput);
  const validAge =
    parsedAge !== null && Number.isInteger(parsedAge) && parsedAge >= 0 && parsedAge <= 120;
  const profile = validAge
    ? {
        age: parsedAge,
        countryCode,
        ...(parsedAge < 18 ? { assistedMinor: minorMode === "assisted" } : {}),
      }
    : null;
  const availableDepths = profile ? getAvailableDepths(questionBank, profile, {}) : [];
  const selectedDepthAvailable = availableDepths.includes(selectedDepth);
  const requiresMinorMode = validAge && parsedAge < 18;
  const validMinorMode =
    !requiresMinorMode ||
    (parsedAge < 13 ? minorMode === "assisted" : minorMode !== null);
  const canSubmit =
    profile !== null &&
    countryCode !== "" &&
    accepted &&
    validMinorMode &&
    selectedDepthAvailable;

  function submitConsent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit && profile) {
      onAccept(profile, selectedDepth);
    }
  }

  return (
    <section className="journey consent" aria-labelledby="consent-title">
      <header className="journey__header">
        <div className="wordmark">
          Will I Die <strong>Soon?</strong>
        </div>
        <p className="prototype-label data-label">Private research prototype / local-only</p>
      </header>
      <div className="consent__body">
        <p className="data-label">Consent &amp; profile</p>
        <h1 id="consent-title">Before we begin</h1>
        <p className="consent__intro">
          This is a private research prototype, not medical care. It does not diagnose,
          predict death, or replace a health professional.
        </p>
        <aside className="consent__privacy" aria-label="Privacy boundary">
          <strong>Your answers stay in this browser session.</strong> You can skip any
          question. This prototype cannot stop someone near you from seeing your screen.
        </aside>

        <form className="consent__form" onSubmit={submitConsent}>
          <div className="form-field">
            <label htmlFor="profile-age">How old are you?</label>
            <div className="input-with-unit">
              <input
                id="profile-age"
                name="age"
                type="number"
                min="0"
                max="120"
                required
                aria-describedby="profile-age-unit"
                value={ageInput}
                onChange={(event) => setAgeInput(event.target.value)}
              />
              <span id="profile-age-unit">years</span>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="profile-country">Country or region</label>
            <select
              id="profile-country"
              name="country"
              required
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
            >
              <option value="">Choose one</option>
              <option value="CH">Switzerland</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
              <option value="OTHER">Another country or region</option>
            </select>
          </div>

          {validAge && parsedAge < 13 ? (
            <fieldset className="minor-route">
              <legend>Guardian-assisted mode is required</legend>
              <p>A parent, guardian, or other trusted adult must help with this route.</p>
              <label>
                <input
                  type="radio"
                  name="minor-mode"
                  checked={minorMode === "assisted"}
                  onChange={() => setMinorMode("assisted")}
                />
                A parent, guardian, or trusted adult is helping
              </label>
            </fieldset>
          ) : null}

          {validAge && parsedAge >= 13 && parsedAge < 18 ? (
            <fieldset className="minor-route">
              <legend>How would you like to answer?</legend>
              <p>
                Local-only is not medical confidentiality. People nearby may still see
                this screen.
              </p>
              <label>
                <input
                  type="radio"
                  name="minor-mode"
                  checked={minorMode === "assisted"}
                  onChange={() => setMinorMode("assisted")}
                />
                A parent, guardian, or trusted adult is helping
              </label>
              <label>
                <input
                  type="radio"
                  name="minor-mode"
                  checked={minorMode === "private"}
                  onChange={() => setMinorMode("private")}
                />
                Answer privately on my own
              </label>
            </fieldset>
          ) : null}

          {profile && selectedDepth === "deep" && !selectedDepthAvailable ? (
            <div className="depth-unavailable" role="status">
              <p>
                Deep needs at least 150 eligible questions for this profile, so it is not
                available. Choose Detailed to continue with 50 eligible questions.
              </p>
              <button type="button" onClick={() => setSelectedDepth("detailed")}>
                Use Detailed instead
              </button>
            </div>
          ) : null}

          <label className="consent-check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            I understand and want to continue
          </label>

          {selectedDepthAvailable ? (
            <button className="primary-action" type="submit" disabled={!canSubmit}>
              Start {depthLabels[selectedDepth]} assessment
            </button>
          ) : null}
        </form>
      </div>
    </section>
  );
}
