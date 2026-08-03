import { clinicalQuestions } from "./clinical";
import { coreQuestions } from "./core";
import { labQuestions } from "./labs";
import { lifestyleQuestions } from "./lifestyle";
import { medicationQuestions } from "./medications";
import { substanceQuestions } from "./substances";

export { clinicalQuestions } from "./clinical";
export { coreQuestions } from "./core";
export { labQuestions } from "./labs";
export { lifestyleQuestions } from "./lifestyle";
export { medicationQuestions } from "./medications";
export { substanceQuestions } from "./substances";

export const questionBank = [
  ...coreQuestions,
  ...lifestyleQuestions,
  ...clinicalQuestions,
  ...substanceQuestions,
  ...medicationQuestions,
  ...labQuestions,
];
