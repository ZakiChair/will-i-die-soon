import { defineQuestions } from "./factory";

export const performanceQuestions = defineQuestions([
  {
    id: "reported_vo2_max_ml_kg_min",
    domain: "measurements",
    prompt: "What is your most recent measured or device-estimated VO₂ max?",
    why: "A reported VO₂ max gives cardiorespiratory-fitness context, but values can differ by test protocol or device.",
    answerType: "number",
    minAge: 18,
    priority: 1,
    tiers: ["express"],
    consumers: ["express-profile"],
  },
  {
    id: "squat_one_rep_max_kg",
    domain: "measurements",
    prompt: "What is the heaviest squat you have already completed for one repetition?",
    why: "Use an existing result only. Do not attempt a new maximal lift for this questionnaire.",
    answerType: "number",
    minAge: 18,
    priority: 2,
    tiers: ["express"],
    consumers: ["express-profile"],
  },
  {
    id: "deadlift_one_rep_max_kg",
    domain: "measurements",
    prompt: "What is the heaviest deadlift you have already completed for one repetition?",
    why: "Use an existing result only. Do not attempt a new maximal lift for this questionnaire.",
    answerType: "number",
    minAge: 18,
    priority: 3,
    tiers: ["express"],
    consumers: ["express-profile"],
  },
]);
