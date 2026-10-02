import type { RefObject } from "react";
import type { QuestionPromptPresentation } from "../i18n/question-prompt-presentation";

export const QUESTION_PROMPT_TITLE_ID = "question-title";
export const QUESTION_PROMPT_DETAIL_ID = "question-detail";

export type QuestionPromptProps = Readonly<{
  presentation: QuestionPromptPresentation;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** 1 on the assessment screen; deeper when the question is asked inside the results. */
  headingLevel?: 1 | 3;
}>;

export function QuestionPrompt({
  presentation,
  headingRef,
  headingLevel = 1,
}: QuestionPromptProps) {
  const detail = presentation.detail?.trim() ? presentation.detail : undefined;
  const Heading = headingLevel === 3 ? "h3" : "h1";

  return (
    <>
      <Heading
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
      </Heading>
      {detail ? (
        <p id={QUESTION_PROMPT_DETAIL_ID} className="question-prompt__detail">
          {detail}
        </p>
      ) : null}
    </>
  );
}
