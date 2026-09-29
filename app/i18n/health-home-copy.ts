import type { HumanAtlasSceneId } from "../data/human-atlas";
import type { Locale } from "./types";

export type HealthHomeAxisCopy = Readonly<{
  title: string;
  metric: string;
  body: string;
}>;

export type HealthHomeOutputCopy = Readonly<{
  title: string;
  body: string;
}>;

export type HealthHomeCopy = Readonly<{
  heroTitle: string;
  heroBody: string;
  heroEyebrow: string;
  questionCount: string;
  ageLabel: string;
  cta: string;
  secondary: string;
  scrollHint: string;
  figureTitle: string;
  figureCaption: string;
  axes: Readonly<Record<HumanAtlasSceneId, HealthHomeAxisCopy>>;
  resultTitle: string;
  resultBody: string;
  outputs: readonly [HealthHomeOutputCopy, HealthHomeOutputCopy, HealthHomeOutputCopy];
  conversionTitle: string;
  conversionBody: string;
  measurementNote: string;
  indexNote: string;
  privacyNote: string;
}>;

export const healthHomeCopy: Readonly<Record<Locale, HealthHomeCopy>> = {
  en: {
    heroTitle: "How are you, really?",
    heroBody: "A questionnaire to put your fitness, sleep and food habits in perspective, then identify your points of support and priorities.",
    heroEyebrow: "A moment to check in",
    questionCount: "9 questions",
    ageLabel: "Ages 18+",
    cta: "Start Express",
    secondary: "Choose my exploration",
    scrollHint: "Discover what goes into your profile",
    figureTitle: "The 4 axes of your profile",
    figureCaption: "Select an axis to explore the questions behind it.",
    axes: {
      breath: {
        title: "Cardio",
        metric: "A VO₂ max you already know",
        body: "Use an existing measured or device-estimated value, if you know it.",
      },
      strength: {
        title: "Strength",
        metric: "Lifting loads / body weight",
        body: "Your known squat and deadlift results, considered relative to your body weight.",
      },
      sleep: {
        title: "Sleep",
        metric: "Sleep hours and rested feeling",
        body: "Your usual sleep duration and how recovered you feel on waking.",
      },
      energy: {
        title: "Nutrition",
        metric: "Fruit, vegetables and meals",
        body: "Your daily portions and how often ultra-processed meals feature in your routine.",
      },
    },
    resultTitle: "A profile to help you choose where to start.",
    resultBody: "A view of your four axes, showing the information available and where more context is needed.",
    outputs: [
      {
        title: "Your points of support",
        body: "The habits and measurements that stand out as points of support within your answers.",
      },
      {
        title: "Your priorities",
        body: "Up to three practical next steps, selected from your answers to help you decide what to focus on.",
      },
      {
        title: "Your index",
        body: "An explained fitness-and-habits index, calculated when enough answers are available. Missing information stays visible.",
      },
    ],
    conversionTitle: "Check in, at your own pace.",
    conversionBody: "Start with nine questions. Even when some measurements are missing, your answers can offer a first perspective.",
    measurementNote: "Use only measurements you already know. You can skip any question, without performing a new test or maximal lift.",
    indexNote: "The index uses your answers and explicit reading references. It is not a diagnosis.",
    privacyNote: "Your answers stay in this browser session.",
  },
  fr: {
    heroTitle: "Comment allez‑vous, vraiment ?",
    heroBody: "Un questionnaire pour faire le point sur votre forme, votre sommeil et votre alimentation, puis repérer vos points d’appui et vos priorités.",
    heroEyebrow: "Un moment pour faire le point",
    questionCount: "9 questions",
    ageLabel: "Dès 18 ans",
    cta: "Commencer Express",
    secondary: "Choisir mon parcours",
    scrollHint: "Découvrez ce qui compose votre bilan",
    figureTitle: "Les 4 axes du bilan",
    figureCaption: "Choisissez un axe pour comprendre les questions associées.",
    axes: {
      breath: {
        title: "Cardio",
        metric: "VO₂ max déjà connue",
        body: "Reprenez une valeur mesurée ou estimée par votre appareil, si vous la connaissez.",
      },
      strength: {
        title: "Force",
        metric: "Charges / poids corporel",
        body: "Vos résultats connus au squat et au soulevé de terre, rapportés à votre poids.",
      },
      sleep: {
        title: "Sommeil",
        metric: "Heures de sommeil et ressenti",
        body: "La durée habituelle de vos nuits et votre sensation de récupération au réveil.",
      },
      energy: {
        title: "Alimentation",
        metric: "Fruits, légumes et repas",
        body: "Vos portions quotidiennes et la place des repas ultra-transformés dans votre routine.",
      },
    },
    resultTitle: "Un bilan pour savoir où commencer.",
    resultBody: "Un portrait de vos quatre axes, avec les informations disponibles et les éléments qui demandent encore du contexte.",
    outputs: [
      {
        title: "Vos points d’appui",
        body: "Les habitudes et mesures qui ressortent comme points d’appui dans vos réponses.",
      },
      {
        title: "Vos priorités",
        body: "Jusqu’à trois pistes concrètes, choisies à partir de vos réponses pour vous aider à décider où porter votre attention.",
      },
      {
        title: "Votre indice",
        body: "Un indice de forme et d’habitudes expliqué, calculé si les réponses suffisent. Les informations manquantes restent visibles.",
      },
    ],
    conversionTitle: "Faites le point, à votre rythme.",
    conversionBody: "Commencez par neuf questions. Même si certaines mesures manquent, vos réponses peuvent déjà apporter un premier éclairage.",
    measurementNote: "Utilisez uniquement des mesures déjà connues. Vous pouvez passer chaque question, sans effectuer de nouveau test ni d’effort maximal.",
    indexNote: "L’indice utilise vos réponses et des repères de lecture explicites. Il ne constitue pas un diagnostic.",
    privacyNote: "Vos réponses restent dans cette session du navigateur.",
  },
};
