import type { RefObject } from "react";
import type { QuestionPromptPresentation } from "../i18n/question-prompt-presentation";

export const QUESTION_PROMPT_TITLE_ID = "question-title";
export const QUESTION_PROMPT_DETAIL_ID = "question-detail";

export type QuestionPromptProps = Readonly<{
  presentation: QuestionPromptPresentation;
  headingRef: RefObject<HTMLHeadingElement | null>;
}>;

export function QuestionPrompt({
  presentation,
  headingRef,
}: QuestionPromptProps) {
  const detail = presentation.detail?.trim() ? presentation.detail : undefined;

  return (
    <>
      <h1
        id={QUESTION_PROMPT_TITLE_ID}
        ref={headingRef}
        tabIndex={-1}
        className={[
          "question-prompt__title",
          detail ? "question-prompt__title--split" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {presentation.title}
      </h1>
      {detail ? (
        <p id={QUESTION_PROMPT_DETAIL_ID} className="question-prompt__detail">
          {detail}
        </p>
      ) : null}
    </>
  );
}
