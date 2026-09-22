import { Injectable } from '@angular/core';
import { PersonalRecord, StrengthExerciseSummary, Workout } from './models';

export type AchievementId =
  | 'first_workout'
  | 'streak_7'
  | 'workouts_100'
  | 'volume_100k'
  | 'first_pr'
  | 'prs_10'
  | 'streak_30';

export type HabitTier = 'BEGINNER' | 'CONSISTENT' | 'DEDICATED' | 'ADVANCED' | 'ELITE';

export interface AchievementDef {
  id: AchievementId;
  title: string;
  mark: string;
  description: string;
  target: number;
}

export interface AchievementStatus extends AchievementDef {
  current: number;
  unlocked: boolean;
  progressPct: number;
}

export interface HabitTierStatus {
  tier: HabitTier;
  label: string;
  blurb: string;
  unlockedCount: number;
  totalAchievements: number;
  nextTier: HabitTier | null;
  nextLabel: string | null;
  progressToNextPct: number;
}

export interface AchievementsSnapshot {
  workoutCount: number;
  streakDays: number;
  totalVolumeKg: number;
  prCount: number;
  achievements: AchievementStatus[];
  tier: HabitTierStatus;
}

const DEFS: AchievementDef[] = [
  {
    id: 'first_workout',
    title: 'First Workout',
    mark: '1',
    description: 'Log your first training session.',
    target: 1
  },
  {
    id: 'streak_7',
    title: '7 Day Streak',
    mark: '7',
    description: 'Train on 7 days in a row.',
    target: 7
  },
  {
    id: 'workouts_100',
    title: '100 Workouts',
    mark: '100',
    description: 'Complete 100 sessions.',
    target: 100
  },
  {
    id: 'volume_100k',
    title: '100,000 kg Volume',
    mark: 'Vol',
    description: 'Lift a cumulative 100,000 kg.',
    target: 100_000
  },
  {
    id: 'first_pr',
    title: 'First PR',
    mark: 'PR',
    description: 'Record your first personal best.',
    target: 1
  },
  {
    id: 'prs_10',
    title: '10 PRs',
    mark: '10',
    description: 'Bank 10 personal records.',
    target: 10
  },
  {
    id: 'streak_30',
    title: '30 Day Streak',
    mark: '30',
    description: 'Train on 30 days in a row.',
    target: 30
  }
];

const TIER_ORDER: HabitTier[] = [
  'BEGINNER',
  'CONSISTENT',
  'DEDICATED',
  'ADVANCED',
  'ELITE'
];

const TIER_META: Record<HabitTier, { label: string; blurb: string; minUnlocked: number }> = {
  BEGINNER: {
    label: 'Beginner',
    blurb: 'Just getting started. Show up and log your first sessions.',
    minUnlocked: 0
  },
  CONSISTENT: {
    label: 'Consistent',
    blurb: 'You are building a habit. Keep the streak alive.',
    minUnlocked: 1
  },
  DEDICATED: {
    label: 'Dedicated',
    blurb: 'Training is part of your week. Momentum is compounding.',
    minUnlocked: 3
  },
  ADVANCED: {
    label: 'Advanced',
    blurb: 'Strong tracking habits. Most milestones are within reach.',
    minUnlocked: 5
  },
  ELITE: {
    label: 'Elite',
    blurb: 'Habit mastery. You have unlocked the full board.',
    minUnlocked: 7
  }
};

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  build(input: {
    workouts: Workout[];
    records: PersonalRecord[];
    strength: StrengthExerciseSummary[];
    today?: Date;
  }): AchievementsSnapshot {
    const today = input.today ?? new Date();
    const workoutCount = input.workouts.filter((w) => !w.archived).length;
    const streakDays = this.computeStreak(input.workouts, today);
    const totalVolumeKg = input.strength.reduce(
      (sum, row) => sum + (row.totalVolumeKg ?? 0),
      0
    );
    const prCount = input.records.length;

    const currentById: Record<AchievementId, number> = {
      first_workout: workoutCount,
      streak_7: streakDays,
      workouts_100: workoutCount,
      volume_100k: Math.floor(totalVolumeKg),
      first_pr: prCount,
      prs_10: prCount,
      streak_30: streakDays
    };

    const achievements = DEFS.map((def) => {
      const current = currentById[def.id];
      const unlocked = current >= def.target;
      const progressPct = Math.min(100, Math.round((current / def.target) * 100));
      return { ...def, current, unlocked, progressPct };
    });

    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    const tier = this.resolveTier(unlockedCount);

    return {
      workoutCount,
      streakDays,
      totalVolumeKg,
      prCount,
      achievements,
      tier
    };
  }

  private resolveTier(unlockedCount: number): HabitTierStatus {
    let tier: HabitTier = 'BEGINNER';
    for (const candidate of TIER_ORDER) {
      if (unlockedCount >= TIER_META[candidate].minUnlocked) {
        tier = candidate;
      }
    }

    const idx = TIER_ORDER.indexOf(tier);
    const nextTier = idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
    const currentMin = TIER_META[tier].minUnlocked;
    const nextMin = nextTier ? TIER_META[nextTier].minUnlocked : currentMin;
    const span = Math.max(1, nextMin - currentMin);
    const progressToNextPct = nextTier
      ? Math.min(100, Math.round(((unlockedCount - currentMin) / span) * 100))
      : 100;

    return {
      tier,
      label: TIER_META[tier].label,
      blurb: TIER_META[tier].blurb,
      unlockedCount,
      totalAchievements: DEFS.length,
      nextTier,
      nextLabel: nextTier ? TIER_META[nextTier].label : null,
      progressToNextPct
    };
  }

  private computeStreak(workouts: Workout[], today: Date): number {
    if (!workouts.length) {
      return 0;
    }
    const days = new Set(
      workouts
        .filter((w) => !w.archived)
        .map((w) => w.workoutDate?.slice(0, 10))
        .filter((v): v is string => !!v)
    );

    const cursor = new Date(today);
    cursor.setHours(0, 0, 0, 0);
    const key = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (!days.has(key(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(key(cursor))) {
        return 0;
      }
    }

    let streak = 0;
    while (days.has(key(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
}
