import { clinicalQuestions } from "./clinical";
import { coreQuestions } from "./core";
import { lifestyleQuestions } from "./lifestyle";
import { medicationQuestions } from "./medications";
import { performanceQuestions } from "./performance";
import { substanceQuestions } from "./substances";

export { clinicalQuestions } from "./clinical";
export { coreQuestions } from "./core";
export { lifestyleQuestions } from "./lifestyle";
export { medicationQuestions } from "./medications";
export { performanceQuestions } from "./performance";
export { substanceQuestions } from "./substances";

export const questionBank = [
  ...coreQuestions,
  ...performanceQuestions,
  ...lifestyleQuestions,
  ...clinicalQuestions,
  ...substanceQuestions,
  ...medicationQuestions,
];
