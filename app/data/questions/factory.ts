import type { AnalysisDepth, Question } from "../../lib/types";

export type QuestionSeed = Omit<Question, "tiers" | "consumers"> & {
  tiers?: ReadonlyArray<AnalysisDepth>;
  consumers?: ReadonlyArray<string>;
};

export function defineQuestions(seeds: ReadonlyArray<QuestionSeed>): Question[] {
  return seeds.map((seed) => ({
    ...seed,
    tiers: seed.tiers ?? ["detailed", "deep"],
    consumers: seed.consumers ?? [`${seed.domain}.signals`],
  }));
}

export const allDepths = ["quick", "detailed", "deep"] as const;

export const yesNoOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
] as const;

export function whenTrue(questionId: string) {
  return { questionId, operator: "equals" as const, value: true };
}
