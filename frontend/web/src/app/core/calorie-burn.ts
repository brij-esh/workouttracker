/**
 * ACSM / Adult Compendium of Physical Activities calorie estimates.
 *
 * kcal ≈ MET × 3.5 × bodyWeightKg × minutes / 200
 * (equivalent to 0.0175 × MET × kg × minutes)
 *
 * MET sources (Compendium):
 * - Walking, moderate pace ~2.8–3.4 mph: 3.5
 * - Resistance training, multiple exercises / light–moderate: 3.5
 * - Resistance training, vigorous: 6.0
 * - Calisthenics, moderate effort: 3.8
 */

export const DEFAULT_BODY_WEIGHT_KG = 70;

/** Walking, moderate pace (Compendium ~17190). */
export const MET_WALKING_MODERATE = 3.5;

/** Resistance training, general / multiple exercises (~02054). */
export const MET_RESISTANCE_LIGHT = 3.5;

/** Resistance training, vigorous effort (~02050). */
export const MET_RESISTANCE_VIGOROUS = 6.0;

/** Calisthenics / bodyweight, moderate (~02022). */
export const MET_CALISTHENICS_MODERATE = 3.8;

/** Seconds of work assumed per rep when estimating lift time. */
const SEC_PER_REP = 3;

export interface CalorieSetInput {
  reps: number | null;
  weightKg: number | null;
  completed: boolean;
  restSeconds: number | null;
}

export interface CalorieBurnInput {
  /** Session elapsed minutes with pauses already excluded. */
  sessionMinutes: number;
  bodyWeightKg: number | null;
  sets: CalorieSetInput[];
}

export interface CalorieBurnResult {
  calories: number;
  activeMinutes: number;
  restMinutes: number;
  met: number;
  bodyWeightKg: number;
  mode: 'walking' | 'resistance' | 'bodyweight';
}

export function estimateCaloriesBurned(input: CalorieBurnInput): CalorieBurnResult {
  const bodyKg = resolveBodyWeightKg(input.bodyWeightKg);
  const sessionMinutes = Math.max(0, Number(input.sessionMinutes) || 0);
  const sets = input.sets ?? [];

  const completed = sets.filter((s) => s.completed);
  const scored = completed.length ? completed : sets;

  const restSeconds = sumRestSeconds(scored);
  const restMinutes = restSeconds / 60;
  const workFromRepsMinutes = estimateWorkMinutesFromReps(scored);

  // Active time = clock time (pauses already out) minus rest between sets.
  let activeMinutes = sessionMinutes - restMinutes;
  if (sessionMinutes > 0) {
    // Keep a floor from estimated lift work, but never above the live clock.
    if (workFromRepsMinutes > 0) {
      activeMinutes = Math.max(activeMinutes, Math.min(workFromRepsMinutes, sessionMinutes));
    }
    if (activeMinutes <= 0) {
      activeMinutes = Math.max(1, sessionMinutes * 0.3);
    }
    activeMinutes = clamp(activeMinutes, 1, sessionMinutes);
  } else if (workFromRepsMinutes > 0) {
    activeMinutes = workFromRepsMinutes;
  } else {
    activeMinutes = 1;
  }

  const { met, mode } = resolveMet(scored, bodyKg);
  const calories = Math.round(met * 3.5 * bodyKg * activeMinutes / 200);

  return {
    calories: Math.max(1, calories),
    activeMinutes: round1(activeMinutes),
    restMinutes: round1(Math.max(0, restMinutes)),
    met,
    bodyWeightKg: bodyKg,
    mode
  };
}

export function resolveBodyWeightKg(weightKg: number | null | undefined): number {
  const n = Number(weightKg);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return DEFAULT_BODY_WEIGHT_KG;
}

function sumRestSeconds(sets: CalorieSetInput[]): number {
  if (sets.length <= 1) {
    return 0;
  }
  // Rest is between sets — omit the last set's rest.
  return sets.slice(0, -1).reduce((sum, s) => sum + Math.max(0, s.restSeconds ?? 0), 0);
}

function estimateWorkMinutesFromReps(sets: CalorieSetInput[]): number {
  const secs = sets.reduce((sum, s) => {
    const reps = Math.max(0, s.reps ?? 0);
    return sum + reps * SEC_PER_REP;
  }, 0);
  return secs / 60;
}

function resolveMet(
  sets: CalorieSetInput[],
  bodyKg: number
): { met: number; mode: CalorieBurnResult['mode'] } {
  const loaded = sets.filter((s) => (s.weightKg ?? 0) > 0 && (s.reps ?? 0) > 0);
  const withReps = sets.filter((s) => (s.reps ?? 0) > 0);

  if (loaded.length === 0 && withReps.length === 0) {
    return { met: MET_WALKING_MODERATE, mode: 'walking' };
  }

  if (loaded.length === 0) {
    return { met: MET_CALISTHENICS_MODERATE, mode: 'bodyweight' };
  }

  const avgRelativeLoad =
    loaded.reduce((sum, s) => sum + (s.weightKg as number) / bodyKg, 0) / loaded.length;

  // Scale Compendium resistance METs by load relative to body weight.
  let met: number;
  if (avgRelativeLoad < 0.25) {
    met = MET_RESISTANCE_LIGHT;
  } else if (avgRelativeLoad < 0.55) {
    met = (MET_RESISTANCE_LIGHT + MET_RESISTANCE_VIGOROUS) / 2; // ~4.75
  } else {
    met = MET_RESISTANCE_VIGOROUS;
  }

  return { met: round1(met), mode: 'resistance' };
}

function clamp(n: number, min: number, max: number): number {
  if (max < min) {
    return Math.max(min, n);
  }
  return Math.min(max, Math.max(min, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
