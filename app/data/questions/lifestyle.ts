import { allDepths, defineQuestions } from "./factory";

const frequencyOptions = [
  { value: "never", label: "Never" },
  { value: "rarely", label: "Rarely" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Often" },
  { value: "daily", label: "Daily or almost daily" },
] as const;

const moodFrequencyOptions = [
  { value: "not_at_all", label: "Not at all" },
  { value: "several_days", label: "Several days" },
  { value: "more_than_half", label: "More than half the days" },
  { value: "nearly_every_day", label: "Nearly every day" },
] as const;

const witnessedOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "No one has observed or I am unsure" },
] as const;

export const lifestyleQuestions = defineQuestions([
  { id: "diet_whole_grains", domain: "diet", prompt: "How often do you choose whole-grain bread, rice, pasta, or other grains?", why: "Whole-grain frequency helps describe fibre-rich carbohydrate choices.", answerType: "single", options: frequencyOptions, priority: 21.1, consumers: ["nutrition-pattern", "essential-eight"] },
  { id: "diet_legumes", domain: "diet", prompt: "How many times in a usual week do you eat beans, lentils, chickpeas, or peas?", why: "Legumes contribute fibre and plant protein to the overall dietary pattern.", answerType: "number", priority: 21.2, consumers: ["nutrition-pattern", "essential-eight"] },
  { id: "diet_processed_meat", domain: "diet", prompt: "How often do you eat processed meats such as sausages, bacon, salami, or deli meat?", why: "Regular processed-meat intake is associated with higher colorectal-cancer and cardiovascular mortality, making it one of the clearest food-level mortality signals.", answerType: "single", options: frequencyOptions, priority: 21.3, consumers: ["nutrition-pattern", "essential-eight"] },
  { id: "diet_sugary_drinks", domain: "diet", prompt: "How many sugar-sweetened drinks do you have in a usual week?", why: "Frequent sugar-sweetened drinks are associated with higher cardiometabolic mortality through weight gain, diabetes, and cardiovascular disease pathways.", answerType: "number", priority: 21.4, consumers: ["nutrition-pattern", "essential-eight"] },
  { id: "diet_ultra_processed", domain: "diet", prompt: "How often are packaged ready meals, sweets, crisps, or fast food your main meal?", why: "This estimates reliance on highly processed foods without judging individual foods.", answerType: "single", options: frequencyOptions, priority: 46, tiers: ["express", "detailed", "deep"], consumers: ["nutrition-pattern", "express-profile"] },
  { id: "diet_added_salt", domain: "diet", prompt: "How often do you add salt at the table before tasting your food?", why: "Added-salt habits can provide context for sodium exposure and blood pressure.", answerType: "single", options: frequencyOptions, priority: 47, consumers: ["nutrition-pattern", "blood-pressure-context"] },
  { id: "diet_restriction_concern", domain: "diet", prompt: "Do food rules, restriction, bingeing, or fear around eating cause you distress?", why: "Distress around eating deserves supportive context separate from nutrition scoring.", answerType: "boolean", sensitive: true, minAge: 13, priority: 49, consumers: ["mental-wellbeing", "clinical-follow-up"] },

  { id: "movement_strength_days", domain: "movement", prompt: "On how many days per week do you do muscle-strengthening activity?", why: "Resistance training one to three times weekly is associated with lower all-cause mortality, additive to aerobic activity, through strength, bone, and metabolic pathways.", answerType: "number", priority: 21.6, tiers: ["express", "detailed", "deep"], consumers: ["movement-pattern", "musculoskeletal-signals", "express-profile"] },
  { id: "movement_balance_training", domain: "movement", prompt: "Do you regularly practise balance, stability, or coordination exercises?", why: "Balance practice can support function and fall prevention, especially with age.", answerType: "boolean", priority: 56, consumers: ["movement-pattern", "protective-roots"] },

  { id: "sedentary_total_hours", domain: "sedentary-time", prompt: "About how many waking hours do you spend sitting or reclining on a typical day?", why: "Long daily sitting is associated with higher cardiovascular and all-cause mortality, only partly offset by planned exercise, and is directly modifiable.", answerType: "number", priority: 21.7, consumers: ["sedentary-pattern"] },

  { id: "sleep_snoring", domain: "sleep", prompt: "Do you snore loudly: louder than talking, or loud enough to be heard through a closed door?", why: "Loud snoring is the first item of the STOP-Bang sleep-apnoea screen; untreated sleep apnoea is associated with hypertension, arrhythmia, and higher cardiovascular mortality.", answerType: "single", options: witnessedOptions, priority: 17.3, tiers: allDepths, consumers: ["sleep-breathing-signals", "pathology-scores"] },
  { id: "sleep_daytime_sleepiness", domain: "sleep", prompt: "How often do you feel tired, fatigued, or sleepy during the daytime, for example struggling to stay awake during quiet activities?", why: "Persistent daytime tiredness or sleepiness is the tiredness item of the STOP-Bang sleep-apnoea screen; it can also signal insufficient or disrupted sleep and affect safety.", answerType: "single", options: frequencyOptions, priority: 17.35, consumers: ["sleep-pattern", "safety-context", "pathology-scores"] },
  { id: "sleep_witnessed_apnea", domain: "sleep", prompt: "Has anyone observed you stop breathing, choke, or gasp during your sleep?", why: "Witnessed pauses in breathing are an item of the STOP-Bang sleep-apnoea screen and carry more weight than snoring alone.", answerType: "single", options: witnessedOptions, minAge: 18, priority: 17.36, consumers: ["sleep-breathing-signals", "pathology-scores"] },
  { id: "sleep_refreshed", domain: "sleep", prompt: "How refreshed do you usually feel within an hour of waking?", why: "Restoration captures sleep quality that duration alone may miss.", answerType: "scale", priority: 21.8, tiers: ["express", "detailed", "deep"], consumers: ["sleep-pattern", "express-profile"] },

  { id: "circadian_morning_light", domain: "circadian-rhythm", prompt: "Do you usually get outdoor or bright light within two hours of waking?", why: "Morning light exposure helps anchor circadian timing for many people.", answerType: "boolean", priority: 75, consumers: ["circadian-pattern", "protective-roots"] },

  { id: "stress_recovery_practice", domain: "stress", prompt: "How often do you spend a few minutes practising a stress-management skill such as grounding or unhooking?", why: "Brief, repeatable stress-management skills can support coping without implying that structural pressure is a personal failure.", answerType: "single", options: frequencyOptions, priority: 20.3, consumers: ["stress-pattern", "protective-roots"] },

  { id: "mood_low_frequency", domain: "mood", prompt: "Over the past two weeks, how often have you felt down, depressed, or hopeless?", why: "Persistent low mood can guide supportive follow-up and immediate safety checks.", answerType: "single", options: moodFrequencyOptions, sensitive: true, minAge: 13, priority: 16.5, tiers: allDepths, consumers: ["mental-wellbeing", "pathology-scores"] },
  { id: "depression_history", domain: "mood", prompt: "Has a clinician ever diagnosed you with depression?", why: "Depression is one of the modifiable risk factors listed by the Lancet Commission on dementia; a past diagnosis adds context to the two-item mood screen.", answerType: "boolean", sensitive: true, minAge: 18, priority: 82.5, tiers: ["deep"], consumers: ["pathology-scores"] },
  { id: "mood_support_access", domain: "mood", prompt: "If your mood worsened, would you know where to seek timely support?", why: "Knowing an access route is a protective factor even when symptoms are mild.", answerType: "boolean", sensitive: true, minAge: 13, priority: 84, consumers: ["protective-roots", "mental-wellbeing"] },

  { id: "anxiety_worry_frequency", domain: "anxiety", prompt: "Over the past two weeks, how often have you felt nervous, anxious, or on edge?", why: "Frequent anxiety can affect sleep, concentration, coping, and daily function.", answerType: "single", options: moodFrequencyOptions, sensitive: true, minAge: 13, priority: 16.55, consumers: ["mental-wellbeing", "pathology-scores"] },
  { id: "anxiety_control_worry", domain: "anxiety", prompt: "Over the past two weeks, how often have you not been able to stop or control worrying?", why: "Difficulty controlling worry provides more context than worry alone.", answerType: "single", options: moodFrequencyOptions, sensitive: true, minAge: 13, priority: 16.56, consumers: ["mental-wellbeing", "pathology-scores"] },

  { id: "head_injury_history", domain: "cognition", prompt: "Have you ever had a head injury that knocked you out or led to a hospital visit?", why: "Traumatic brain injury is one of the modifiable risk factors for dementia listed by the Lancet Commission.", answerType: "boolean", sensitive: true, minAge: 18, priority: 88.5, tiers: ["deep"], consumers: ["pathology-scores"] },

  { id: "social_loneliness", domain: "social-connection", prompt: "How often have you felt lonely or disconnected during the past month?", why: "Loneliness is distinct from living alone and can affect mental and physical wellbeing.", answerType: "single", options: frequencyOptions, sensitive: true, priority: 90, consumers: ["social-context", "mental-wellbeing", "pathology-scores"] },
  { id: "social_contact_frequency", domain: "social-connection", prompt: "How often do you have meaningful contact with friends, family, or community?", why: "Meaningful contact can provide practical and emotional protection.", answerType: "single", options: frequencyOptions, priority: 91, consumers: ["social-context", "protective-roots", "pathology-scores"] },
  { id: "social_community_belonging", domain: "social-connection", prompt: "Do you feel that you belong to a group, community, or shared activity?", why: "Belonging can be a durable protective root for resilience and wellbeing.", answerType: "boolean", priority: 93, consumers: ["social-context", "protective-roots"] },
]);
