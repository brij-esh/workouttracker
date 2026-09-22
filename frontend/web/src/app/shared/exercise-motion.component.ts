import { Component, computed, input } from '@angular/core';

/** Public-domain real-person demos from free-exercise-db (Unlicense). */
const MEDIA_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises';

/** Our catalog name → free-exercise-db folder id */
const DEMO_IDS: Record<string, string> = {
  'Barbell Bench Press': 'Barbell_Bench_Press_-_Medium_Grip',
  'Incline Dumbbell Press': 'Incline_Dumbbell_Press',
  'Push-Up': 'Pushups',
  'Cable Fly': 'Cable_Crossover',
  'Conventional Deadlift': 'Barbell_Deadlift',
  'Barbell Row': 'Bent_Over_Barbell_Row',
  'Lat Pulldown': 'Wide-Grip_Lat_Pulldown',
  'Pull-Up': 'Pullups',
  'Seated Cable Row': 'Seated_Cable_Rows',
  'Overhead Press': 'Standing_Military_Press',
  'Dumbbell Shoulder Press': 'Dumbbell_Shoulder_Press',
  'Lateral Raise': 'Side_Lateral_Raise',
  'Face Pull': 'Face_Pull',
  'Barbell Curl': 'Barbell_Curl',
  'Dumbbell Curl': 'Dumbbell_Bicep_Curl',
  'Tricep Pushdown': 'Triceps_Pushdown',
  'Skull Crusher': 'Lying_Triceps_Press',
  'Back Squat': 'Barbell_Full_Squat',
  'Front Squat': 'Front_Barbell_Squat',
  'Romanian Deadlift': 'Romanian_Deadlift',
  'Leg Press': 'Leg_Press',
  'Walking Lunge': 'Barbell_Walking_Lunge',
  'Leg Curl': 'Lying_Leg_Curls',
  'Calf Raise': 'Standing_Calf_Raises',
  'Hip Thrust': 'Barbell_Hip_Thrust',
  'Plank': 'Plank',
  'Hanging Leg Raise': 'Hanging_Leg_Raise',
  'Cable Crunch': 'Cable_Crunch',
  'Kettlebell Swing': 'One-Arm_Kettlebell_Swings',
  'Band Pull-Apart': 'Band_Pull_Apart'
};

const PATTERN_FALLBACK: Record<string, string> = {
  squat: 'Barbell_Full_Squat',
  hinge: 'Barbell_Deadlift',
  press: 'Barbell_Bench_Press_-_Medium_Grip',
  pull: 'Pullups',
  raise: 'Side_Lateral_Raise',
  curl: 'Dumbbell_Bicep_Curl',
  core: 'Plank',
  calf: 'Standing_Calf_Raises',
  generic: 'Pushups'
};

export type MotionPattern =
  | 'press'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'raise'
  | 'curl'
  | 'core'
  | 'calf'
  | 'generic';

@Component({
  selector: 'app-exercise-motion',
  standalone: true,
  templateUrl: './exercise-motion.component.html',
  styleUrl: './exercise-motion.component.scss'
})
export class ExerciseMotionComponent {
  readonly exerciseName = input.required<string>();
  readonly patternOverride = input<MotionPattern | null>(null);

  readonly pattern = computed<MotionPattern>(() => {
    if (this.patternOverride()) {
      return this.patternOverride()!;
    }
    return detectPattern(this.exerciseName());
  });

  readonly demoId = computed(() => {
    const exact = DEMO_IDS[this.exerciseName()];
    if (exact) {
      return exact;
    }
    return PATTERN_FALLBACK[this.pattern()] ?? PATTERN_FALLBACK['generic'];
  });

  readonly startUrl = computed(() => `${MEDIA_BASE}/${this.demoId()}/0.jpg`);
  readonly endUrl = computed(() => `${MEDIA_BASE}/${this.demoId()}/1.jpg`);

  readonly title = computed(() => 'Form demo');

  readonly cue = computed(() => {
    switch (this.pattern()) {
      case 'press':
        return 'Drive weight away from the body — lock out with control, then lower slowly.';
      case 'pull':
        return 'Pull elbows back, squeeze the target muscles, then extend under control.';
      case 'squat':
        return 'Sit hips down and back, keep chest tall, then drive through mid-foot to stand.';
      case 'hinge':
        return 'Push hips back with a soft knee bend, keep a flat back, then snap hips forward.';
      case 'raise':
        return 'Lift with the target muscle — avoid swinging — pause briefly, then lower slowly.';
      case 'curl':
        return 'Keep elbows pinned, curl up without swinging, squeeze, then lower fully.';
      case 'core':
        return 'Brace like someone will poke your stomach — stay long, don’t sag or pike.';
      case 'calf':
        return 'Full stretch at the bottom, rise onto toes, pause, then lower slowly.';
      default:
        return 'Move with control through a full range — quality over speed.';
    }
  });
}

export function detectPattern(name: string): MotionPattern {
  const n = name.toLowerCase();
  if (/calf/.test(n)) {
    return 'calf';
  }
  if (/plank|crunch|leg raise|hollow/.test(n)) {
    return 'core';
  }
  if (/curl/.test(n)) {
    return 'curl';
  }
  if (/raise|fly|pull-apart|face pull/.test(n)) {
    return 'raise';
  }
  if (/deadlift|rdl|romanian|swing|hip thrust|hinge/.test(n)) {
    return 'hinge';
  }
  if (/squat|lunge|leg press|split squat/.test(n)) {
    return 'squat';
  }
  if (/row|pulldown|pull-up|pullup|chin/.test(n)) {
    return 'pull';
  }
  if (/press|push-up|pushup|dip|pushdown|skull|extension/.test(n)) {
    return 'press';
  }
  return 'generic';
}
