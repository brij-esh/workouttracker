/** Shared calendar-day helpers for the 5-day edit/delete window. */
export const EDIT_WINDOW_DAYS = 5;
/** Paused sessions can only be resumed within this window. */
export const RESUME_WINDOW_MS = 60 * 60 * 1000;

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) {
    return null;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Days since date (0 = today). Negative = future. */
export function ageInDays(isoDate: string, today = localDateKey()): number {
  const target = parseDateOnly(isoDate);
  const now = parseDateOnly(today);
  if (!target || !now) {
    return Number.NaN;
  }
  return Math.round((now.getTime() - target.getTime()) / 86_400_000);
}

export function isWithinEditWindow(isoDate: string): boolean {
  const age = ageInDays(isoDate);
  return !Number.isNaN(age) && age >= 0 && age <= EDIT_WINDOW_DAYS;
}

export function remainingEditDays(isoDate: string): number {
  const age = ageInDays(isoDate);
  if (Number.isNaN(age) || age < 0) {
    return -1;
  }
  return Math.max(0, EDIT_WINDOW_DAYS - age);
}

export function shiftDateKey(iso: string, days: number): string {
  const d = parseDateOnly(iso);
  if (!d) {
    return iso;
  }
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

export function workoutStartIso(workout: {
  sessionStartedAt?: string | null;
  createdAt?: string;
  workoutDate: string;
}): string {
  return workout.sessionStartedAt || workout.createdAt || workout.workoutDate;
}

/** Live / paused (still resumable) sessions are editable; completed only within 5 days of start. */
export function canEditWorkout(workout: {
  status?: string | null;
  sessionStartedAt?: string | null;
  createdAt?: string;
  workoutDate: string;
  pausedAt?: string | null;
}): boolean {
  const status = workout.status ?? 'COMPLETED';
  if (status === 'IN_PROGRESS') {
    return true;
  }
  if (status === 'PAUSED') {
    if (canResumePausedWorkout(workout)) {
      return true;
    }
    // Pause window expired → treat as completed for the 5-day edit rule
    return isWithinEditWindow(workoutStartIso(workout).slice(0, 10));
  }
  return isWithinEditWindow(workoutStartIso(workout).slice(0, 10));
}

export function canResumePausedWorkout(workout: {
  status?: string | null;
  pausedAt?: string | null;
}): boolean {
  if ((workout.status ?? '') !== 'PAUSED' || !workout.pausedAt) {
    return false;
  }
  const pausedAt = Date.parse(workout.pausedAt);
  if (Number.isNaN(pausedAt)) {
    return false;
  }
  return Date.now() - pausedAt <= RESUME_WINDOW_MS;
}
