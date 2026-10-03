"use client";

import { useEffect, useRef, useState } from "react";
import { OTHER_COUNTRY_CODE } from "../data/countries";
import { questionBank } from "../data/questions";
import { useI18n } from "../i18n/context";
import { countryOptions } from "../i18n/country-names";
import { uiCopyKeys } from "../i18n/ui-copy";
import { getAvailableDepths } from "../lib/questionnaire";
import type { AnalysisDepth, ProfileContext } from "../lib/types";

export type ConsentScreenProps = {
  depth: AnalysisDepth;
  onAccept: (profile: ProfileContext, depth: AnalysisDepth) => void;
};

type MinorMode = "assisted" | "private";

export function ConsentScreen({ depth, onAccept }: ConsentScreenProps) {
  const { locale, t } = useI18n();
  const titleRef = useRef<HTMLHeadingElement>(null);
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
  const selectedDepthLabel = t(uiCopyKeys.depth[selectedDepth]);
  const inlineDepth =
    locale === "fr"
      ? selectedDepthLabel.toLocaleLowerCase("fr")
      : selectedDepthLabel;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

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
        <p className="prototype-label data-label">{t("landing.prototype")}</p>
      </header>
      <div className="consent__body">
        <p className="data-label">{t("consent.eyebrow")}</p>
        <h1 id="consent-title" ref={titleRef} tabIndex={-1}>{t("consent.title")}</h1>
        <p className="consent__intro">{t("consent.intro")}</p>
        <aside className="consent__privacy" aria-label={t("consent.privacy.aria")}>
          <strong>{t("consent.privacy.strong")}</strong> {t("consent.privacy.body")}
        </aside>

        <form className="consent__form" onSubmit={submitConsent}>
          <div className="form-field">
            <label htmlFor="profile-age">{t("consent.age")}</label>
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
              <span id="profile-age-unit">{t("consent.age.unit")}</span>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="profile-country">{t("consent.country")}</label>
            <select
              id="profile-country"
              name="country"
              required
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
            >
              <option value="">{t("consent.country.choose")}</option>
              {countryOptions(locale).map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
              <option value={OTHER_COUNTRY_CODE}>{t(uiCopyKeys.country.OTHER)}</option>
            </select>
          </div>

          {validAge && parsedAge < 13 ? (
            <fieldset className="minor-route">
              <legend>{t("minor.child.title")}</legend>
              <p>{t("minor.child.body")}</p>
              <label>
                <input
                  type="radio"
                  name="minor-mode"
                  checked={minorMode === "assisted"}
                  onChange={() => setMinorMode("assisted")}
                />
                {t("minor.assisted")}
              </label>
            </fieldset>
          ) : null}

          {validAge && parsedAge >= 13 && parsedAge < 18 ? (
            <fieldset className="minor-route">
              <legend>{t("minor.adolescent.title")}</legend>
              <p>{t("minor.adolescent.body")}</p>
              <label>
                <input
                  type="radio"
                  name="minor-mode"
                  checked={minorMode === "assisted"}
                  onChange={() => setMinorMode("assisted")}
                />
                {t("minor.assisted")}
              </label>
              <label>
                <input
                  type="radio"
                  name="minor-mode"
                  checked={minorMode === "private"}
                  onChange={() => setMinorMode("private")}
                />
                {t("minor.private")}
              </label>
            </fieldset>
          ) : null}

          {profile && selectedDepth === "deep" && !selectedDepthAvailable ? (
            <div className="depth-unavailable" role="status">
              <p>{t("consent.deep.unavailable")}</p>
              <button type="button" onClick={() => setSelectedDepth("detailed")}>
                {t("consent.deep.useDetailed")}
              </button>
            </div>
          ) : null}

          {profile && selectedDepth === "express" && !selectedDepthAvailable ? (
            <div className="depth-unavailable" role="status">
              <p>{t("consent.express.unavailable")}</p>
              <button type="button" onClick={() => setSelectedDepth("quick")}>
                {t("consent.express.useQuick")}
              </button>
            </div>
          ) : null}

          <label className="consent-check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            {t("consent.accept")}
          </label>

          {selectedDepthAvailable ? (
            <button className="primary-action" type="submit" disabled={!canSubmit}>
              {t("consent.start", { depth: inlineDepth })}
            </button>
          ) : null}
        </form>
      </div>
    </section>
  );
}
