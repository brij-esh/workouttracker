import { NutritionGoal, NutritionTargetRequest, UserProfile } from '../../core/models';

export interface MacroSuggestion extends NutritionTargetRequest {
  bmr: number;
  tdee: number;
  ageYears: number | null;
  trainingDaysPerWeek: number;
  missingProfileFields: string[];
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9
};

const GOAL_FROM_FITNESS: Record<string, NutritionGoal> = {
  LOSE_WEIGHT: 'CUTTING',
  BUILD_MUSCLE: 'BULKING',
  STAY_FIT: 'MAINTENANCE',
  ENDURANCE: 'MAINTENANCE',
  GENERAL_HEALTH: 'MAINTENANCE'
};

/** Calorie target as a fraction of TDEE */
const GOAL_CALORIE_FACTOR: Record<NutritionGoal, number> = {
  CUTTING: 0.8,
  BULKING: 1.12,
  MAINTENANCE: 1,
  RECOMPOSITION: 0.95
};

/** Protein grams per kg body weight */
const PROTEIN_PER_KG: Record<NutritionGoal, number> = {
  CUTTING: 2.2,
  BULKING: 1.8,
  MAINTENANCE: 1.6,
  RECOMPOSITION: 2.2
};

/** Fat as a fraction of total calories */
const FAT_CALORIE_FRACTION: Record<NutritionGoal, number> = {
  CUTTING: 0.22,
  BULKING: 0.25,
  MAINTENANCE: 0.28,
  RECOMPOSITION: 0.25
};

/** Fiber grams per 1000 kcal */
const FIBER_PER_1000_KCAL: Record<NutritionGoal, number> = {
  CUTTING: 16,
  BULKING: 12,
  MAINTENANCE: 14,
  RECOMPOSITION: 15
};

export function mapFitnessGoalToNutrition(fitnessGoal: string | null | undefined): NutritionGoal {
  if (!fitnessGoal) {
    return 'MAINTENANCE';
  }
  return GOAL_FROM_FITNESS[fitnessGoal] ?? 'MAINTENANCE';
}

export function ageFromDob(dateOfBirth: string | null | undefined, today = new Date()): number | null {
  if (!dateOfBirth) {
    return null;
  }
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  if (!y || !m || !d) {
    return null;
  }
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) {
    age -= 1;
  }
  return age >= 13 && age <= 100 ? age : null;
}

export function suggestMacroTargets(
  profile: UserProfile | null,
  options?: {
    nutritionGoal?: NutritionGoal;
    trainingDaysPerWeek?: number;
  }
): MacroSuggestion {
  const missing: string[] = [];
  const weightKg = Number(profile?.weightKg);
  const heightCm = Number(profile?.heightCm);
  const age = ageFromDob(profile?.dateOfBirth ?? null);
  const gender = profile?.gender ?? null;
  const activity = profile?.activityLevel ?? 'MODERATE';
  const nutritionGoal = options?.nutritionGoal ?? mapFitnessGoalToNutrition(profile?.fitnessGoal);
  const trainingDays = Math.max(0, Math.min(7, Math.round(options?.trainingDaysPerWeek ?? 0)));

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    missing.push('weight');
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    missing.push('height');
  }
  if (age === null) {
    missing.push('age');
  }
  if (!gender || gender === 'PREFER_NOT_TO_SAY') {
    missing.push('sex');
  }

  const safeWeight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 70;
  const safeHeight = Number.isFinite(heightCm) && heightCm > 0 ? heightCm : 170;
  const safeAge = age ?? 30;

  const maleBmr = 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge + 5;
  const femaleBmr = 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge - 161;
  let bmr: number;
  if (gender === 'MALE') {
    bmr = maleBmr;
  } else if (gender === 'FEMALE') {
    bmr = femaleBmr;
  } else {
    bmr = (maleBmr + femaleBmr) / 2;
  }

  let activityMult = ACTIVITY_MULTIPLIER[activity] ?? 1.55;
  if (trainingDays >= 6) {
    activityMult += 0.1;
  } else if (trainingDays >= 4) {
    activityMult += 0.05;
  }
  activityMult = Math.min(activityMult, 2.0);

  const tdee = bmr * activityMult;
  const calories = Math.max(1200, Math.round((tdee * GOAL_CALORIE_FACTOR[nutritionGoal]) / 10) * 10);

  const proteinG = Math.round(safeWeight * PROTEIN_PER_KG[nutritionGoal]);
  const fatG = Math.max(40, Math.round((calories * FAT_CALORIE_FRACTION[nutritionGoal]) / 9));
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbsG = Math.round(carbKcal / 4);

  const fiberRaw = Math.round((calories / 1000) * FIBER_PER_1000_KCAL[nutritionGoal]);
  const fiberG = Math.max(25, Math.min(45, fiberRaw));
  const waterMlTarget = Math.max(1500, Math.round((safeWeight * 35) / 50) * 50);

  return {
    calorieTarget: calories,
    proteinGTarget: proteinG,
    carbsGTarget: carbsG,
    fatGTarget: fatG,
    fiberGTarget: fiberG,
    waterMlTarget,
    nutritionGoal,
    manualOverride: false,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    ageYears: age,
    trainingDaysPerWeek: trainingDays,
    missingProfileFields: missing
  };
}

export function nutritionGoalLabel(goal: NutritionGoal): string {
  switch (goal) {
    case 'CUTTING':
      return 'Cutting';
    case 'BULKING':
      return 'Bulking';
    case 'RECOMPOSITION':
      return 'Recomposition';
    default:
      return 'Maintenance';
  }
}

export function asMacroNumber(value: number | string | null | undefined, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
