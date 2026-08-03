export type QuestionTranslation = {
  prompt: string;
  why: string;
  options?: Readonly<Record<string, string>>;
};
