export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  displayName: string;
  heightCm: number | null;
  weightKg: number | null;
  dateOfBirth: string | null;
  gender: string | null;
  fitnessGoal: string | null;
  activityLevel: string | null;
  preferredUnits: string | null;
  timezone: string | null;
  region: string | null;
  onboardingCompleted: boolean;
}

export interface CreateUserProfileRequest {
  displayName: string;
  heightCm?: number | null;
  weightKg?: number | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  fitnessGoal?: string | null;
  activityLevel?: string | null;
  preferredUnits?: string | null;
  timezone?: string | null;
  region?: string | null;
  onboardingCompleted?: boolean;
}

export type WorkoutStatus = 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';

export interface Workout {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  workoutDate: string;
  durationMinutes: number | null;
  caloriesBurned: number | null;
  status?: WorkoutStatus;
  sessionStartedAt?: string | null;
  pausedAt?: string | null;
  completedAt?: string | null;
  elapsedMs?: number | null;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutRequest {
  name: string;
  description?: string | null;
  workoutDate: string;
  durationMinutes?: number | null;
  caloriesBurned?: number | null;
  liveSession?: boolean | null;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  userId: string;
  name: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  oneRmKg: number | null;
  maxWeightKg: number | null;
  maxReps: number | null;
  notes: string | null;
  sortOrder: number;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutExerciseRequest {
  name: string;
  sets?: number | null;
  reps?: number | null;
  weightKg?: number | null;
  oneRmKg?: number | null;
  maxWeightKg?: number | null;
  maxReps?: number | null;
  notes?: string | null;
  sortOrder?: number | null;
}

export interface WeightLog {
  id: string;
  userId: string;
  recordedOn: string;
  weightKg: number;
  notes: string | null;
  archived?: boolean;
}

export interface WeightLogRequest {
  recordedOn: string;
  weightKg: number;
  notes?: string | null;
}

export interface BodyWeightProgress {
  dailyWeightKg: number | null;
  dailyWeightOn: string | null;
  weeklyAverageKg: number | null;
  monthlyAverageKg: number | null;
  startingWeightKg: number | null;
  startingWeightOn: string | null;
  currentWeightKg: number | null;
  weightChangeKg: number | null;
  rateOfChangeKgPerWeek: number | null;
  goalWeightKg: number | null;
  progressPct: number | null;
  note: string | null;
}

export interface WeightGoalRequest {
  goalWeightKg: number;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseName: string;
  recordType: string;
  value: number;
  recordedOn: string;
  notes: string | null;
  archived?: boolean;
}

export interface PersonalRecordRequest {
  exerciseName: string;
  recordType: string;
  value: number;
  recordedOn: string;
  notes?: string | null;
}

export type MealType =
  | 'BREAKFAST'
  | 'LUNCH'
  | 'DINNER'
  | 'SNACK'
  | 'PRE_WORKOUT'
  | 'POST_WORKOUT';

export type FoodQuantityUnit = 'GRAMS' | 'ML' | 'PIECES' | 'SERVINGS' | 'CUPS';

export type FoodCategory = 'STAPLE' | 'MEAL' | 'CUSTOM';

export type FoodRegion =
  | 'PAN_INDIA'
  | 'NORTH'
  | 'SOUTH'
  | 'WEST'
  | 'EAST'
  | 'CENTRAL'
  | 'OTHER';

export interface FoodItem {
  id: string;
  userId: string | null;
  name: string;
  category: FoodCategory | string;
  region: FoodRegion | string;
  servingQty: number;
  servingUnit: FoodQuantityUnit | string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  systemFood: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodItemRequest {
  name: string;
  category?: FoodCategory | string | null;
  region?: FoodRegion | string | null;
  servingQty: number;
  servingUnit: FoodQuantityUnit | string;
  calories: number;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
}

export interface FoodLibraryMeta {
  categories: string[];
  regions: string[];
  units: string[];
}

export interface Meal {
  id: string;
  userId: string;
  mealDate: string;
  mealType: MealType | string;
  name: string;
  quantity: number;
  quantityUnit: FoodQuantityUnit | string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  notes: string | null;
}

export interface MealRequest {
  mealDate: string;
  mealType: string;
  name: string;
  quantity: number;
  quantityUnit: FoodQuantityUnit | string;
  calories: number;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  notes?: string | null;
}

export interface WaterLog {
  id: string;
  userId: string;
  loggedOn: string;
  amountMl: number;
  notes: string | null;
}

export interface WaterLogRequest {
  loggedOn: string;
  amountMl: number;
  notes?: string | null;
}

export type StepSource = 'MANUAL' | 'DEVICE' | 'WEARABLE';

export interface StepLog {
  id: string;
  userId: string;
  recordedOn: string;
  steps: number;
  caloriesBurned: number;
  source: StepSource;
  sourceLabel: string | null;
  weightKg: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StepLogRequest {
  recordedOn: string;
  steps: number;
  source?: StepSource;
  sourceLabel?: string | null;
  weightKg?: number | null;
}

export type NutritionGoal = 'CUTTING' | 'BULKING' | 'MAINTENANCE' | 'RECOMPOSITION';

export interface NutritionTarget {
  id: string;
  userId: string;
  calorieTarget: number;
  proteinGTarget: number;
  carbsGTarget: number;
  fatGTarget: number;
  fiberGTarget: number;
  waterMlTarget: number;
  nutritionGoal: NutritionGoal;
  manualOverride: boolean;
  waterRemindersEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NutritionTargetRequest {
  calorieTarget: number;
  proteinGTarget: number;
  carbsGTarget: number;
  fatGTarget: number;
  fiberGTarget: number;
  waterMlTarget: number;
  nutritionGoal: NutritionGoal;
  manualOverride: boolean;
  waterRemindersEnabled?: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceId: string | null;
  read: boolean;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type MuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'LEGS'
  | 'GLUTES'
  | 'CORE'
  | 'FULL_BODY'
  | 'CARDIO';

export type EquipmentType =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'CABLE'
  | 'MACHINE'
  | 'BODYWEIGHT'
  | 'KETTLEBELL'
  | 'BAND'
  | 'OTHER';

export type ExerciseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface LibraryExercise {
  id: string;
  userId: string | null;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentType | null;
  instructions: string | null;
  difficulty: ExerciseDifficulty | null;
  custom: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LibraryExerciseRequest {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: EquipmentType | null;
  instructions?: string | null;
  difficulty?: ExerciseDifficulty | null;
}

export interface ExerciseLibraryMeta {
  muscleGroups: string[];
  equipment: string[];
}

export interface ExerciseSet {
  id: string;
  exerciseId: string;
  workoutId: string;
  userId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  completed: boolean;
  restSeconds: number | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExercisePreviousSet {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  completed: boolean;
}

export interface ExercisePreviousTarget {
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
  label: string;
}

export interface ExercisePreviousPerformance {
  found: boolean;
  previousExerciseId: string | null;
  previousWorkoutId: string | null;
  previousWorkoutName: string | null;
  workoutDate: string | null;
  sets: ExercisePreviousSet[];
  target: ExercisePreviousTarget | null;
}

export interface ExerciseSetRequest {
  setNumber?: number | null;
  reps?: number | null;
  weightKg?: number | null;
  completed?: boolean | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export type PlanTemplateType =
  | 'PPL'
  | 'UPPER_LOWER'
  | 'FULL_BODY'
  | 'BRO_SPLIT'
  | 'ARNOLD'
  | 'STRENGTH'
  | 'CUSTOM';


export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface WorkoutPlanExercise {
  id: string;
  name: string;
  targetSets: number | null;
  targetReps: number | null;
  sortOrder: number;
  notes: string | null;
}

export interface WorkoutPlanDay {
  id: string;
  dayLabel: string;
  sortOrder: number;
  exercises: WorkoutPlanExercise[];
}

export interface PlanScheduleSlot {
  weekday: Weekday;
  planDayId: string | null;
  dayLabel: string;
  restDay: boolean;
}

export interface WorkoutPlan {
  id: string;
  userId: string;
  name: string;
  templateType: PlanTemplateType;
  description: string | null;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
  days: WorkoutPlanDay[];
  schedule: PlanScheduleSlot[];
}

export interface CreateWorkoutPlanRequest {
  name: string;
  templateType: PlanTemplateType;
  description?: string | null;
  days?: Array<{
    dayLabel: string;
    sortOrder?: number | null;
    exercises?: Array<{
      name: string;
      targetSets?: number | null;
      targetReps?: number | null;
      sortOrder?: number | null;
      notes?: string | null;
    }>;
  }> | null;
  schedule?: Array<{
    weekday: Weekday;
    dayLabel?: string | null;
  }> | null;
}

export interface UpdatePlanScheduleRequest {
  schedule: Array<{
    weekday: Weekday;
    planDayId: string | null;
  }>;
}

export interface UpdateWorkoutPlanRequest {
  name: string;
  description?: string | null;
}

export interface CalendarWorkout {
  id: string;
  name: string;
  durationMinutes: number | null;
  caloriesBurned: number | null;
}

export interface CalendarDay {
  date: string;
  workoutCount: number;
  workouts: CalendarWorkout[];
}

export interface CalendarResponse {
  from: string;
  to: string;
  workoutCount: number;
  currentStreak: number;
  days: CalendarDay[];
}

export interface ConsistencyHeatmapCell {
  date: string;
  level: number;
  workoutCount: number;
  planned: boolean;
  missed: boolean;
}

export interface ConsistencyHeatmapRow {
  weekday: string;
  cells: ConsistencyHeatmapCell[];
}

export interface WorkoutConsistency {
  month: string;
  monthLabel: string;
  planName: string | null;
  restWeekdays?: string[];
  plannedWeekdays?: string[];
  completed: number;
  planned: number;
  missed: number;
  consistencyPercent: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  currentStreak: number;
  averageWorkoutsPerWeek: number;
  trainingFrequency: number;
  heatmap: ConsistencyHeatmapRow[];
}

export interface StrengthBestSet {
  weightKg: number;
  reps: number;
  estimatedOneRmKg: number;
}

export interface StrengthExerciseSummary {
  exerciseKey: string;
  exerciseName: string;
  currentOneRmKg: number | null;
  previousOneRmKg: number | null;
  oneRmProgressPct: number | null;
  bestSet: StrengthBestSet | null;
  volumeThisMonthKg: number | null;
  totalVolumeKg: number | null;
  maxWeightKg: number | null;
  averageWorkingWeightKg: number | null;
  bestRepsAtMaxWeight: number | null;
  weightPrCount: number;
  repsPrCount: number;
  volumePrCount: number;
  sessions: number;
  lastPerformed: string | null;
  progressionInsight: StrengthProgressionInsight | null;
}

export interface StrengthSessionPoint {
  date: string;
  workoutId: string;
  estimatedOneRmKg: number | null;
  maxWeightKg: number | null;
  volumeKg: number | null;
  bestReps: number | null;
}

export interface StrengthProgressionInsight {
  detected: boolean;
  metric: string | null;
  changePct: number | null;
  windowWeeks: number | null;
  message: string | null;
}

export interface StrengthProgression {
  weightKg: number[];
  reps: number[];
  volumeKg: number[];
  insight: StrengthProgressionInsight | null;
}

export interface StrengthExerciseDetail {
  summary: StrengthExerciseSummary;
  oneRmHistory: StrengthSessionPoint[];
  progression: StrengthProgression;
}

