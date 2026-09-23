import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import {
  FoodCategory,
  FoodItem,
  FoodItemRequest,
  FoodQuantityUnit,
  FoodRegion,
  Meal,
  MealRequest,
  NutritionGoal,
  NutritionTarget,
  NutritionTargetRequest,
  UserProfile,
  WaterLog
} from '../../core/models';
import { AppSelectOption, SelectComponent } from '../../shared/select.component';
import { DateInputComponent } from '../../shared/date-input.component';
import { NutritionInsightsPanelComponent } from './nutrition-insights-panel.component';
import {
  asMacroNumber,
  mapFitnessGoalToNutrition,
  nutritionGoalLabel,
  suggestMacroTargets
} from './macro-targets';

const WATER_GOAL_KEY = 'repwise.waterGoalMl';
const DEFAULT_WATER_GOAL_ML = 2500;

@Component({
  selector: 'app-nutrition',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DecimalPipe,
    SelectComponent,
    DateInputComponent,
    NutritionInsightsPanelComponent
  ],
  templateUrl: './nutrition.component.html',
  styleUrl: './nutrition.component.scss'
})
export class NutritionComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly foodSearch$ = new Subject<void>();
  private foodSearchSub: Subscription | null = null;

  readonly today = this.localDateKey();
  readonly listDate = signal(this.today);
  readonly meals = signal<Meal[]>([]);
  readonly water = signal<WaterLog[]>([]);
  readonly error = signal<string | null>(null);
  readonly savingMeal = signal(false);
  readonly savingWater = signal(false);
  readonly savingTargets = signal(false);
  readonly waterGoalMl = signal(this.readWaterGoal());
  readonly profile = signal<UserProfile | null>(null);
  readonly targets = signal<NutritionTarget | null>(null);
  readonly trainingDaysPerWeek = signal(0);
  readonly editingTargets = signal(false);
  readonly targetHint = signal<string | null>(null);
  readonly foodQuery = signal('');
  readonly foodCategory = signal('');
  readonly foodRegion = signal('');
  readonly foodResults = signal<FoodItem[]>([]);
  readonly searchingFoods = signal(false);
  readonly selectedFood = signal<FoodItem | null>(null);
  readonly showCustomFood = signal(false);
  readonly savingCustomFood = signal(false);
  /** Workspace log panels — true = expanded */
  readonly panelOpen = signal<Record<string, boolean>>({
    foodLog: true,
    logFood: true,
    waterLog: true,
    logWater: true
  });
  /** Meal-type groups collapsed by key */
  readonly collapsedMealGroups = signal<Record<string, boolean>>({});

  readonly dayTotals = computed(() => {
    const meals = this.meals();
    let calories = 0;
    let proteinG = 0;
    let carbsG = 0;
    let fatG = 0;
    for (const m of meals) {
      calories += Number(m.calories) || 0;
      proteinG += Number(m.proteinG) || 0;
      carbsG += Number(m.carbsG) || 0;
      fatG += Number(m.fatG) || 0;
    }
    const waterMl = this.water().reduce((sum, w) => sum + (Number(w.amountMl) || 0), 0);
    const goal = this.waterGoalMl();
    return {
      calories,
      proteinG,
      carbsG,
      fatG,
      waterMl,
      mealCount: meals.length,
      waterPct: goal > 0 ? Math.min(100, Math.round((waterMl / goal) * 100)) : 0
    };
  });

  readonly isToday = computed(() => this.listDate() === this.today);

  readonly mealsByType = computed(() => {
    const order = this.mealTypeOptions.map((o) => o.value);
    const groups = new Map<string, Meal[]>();
    for (const meal of this.meals()) {
      const key = meal.mealType || 'SNACK';
      const list = groups.get(key) ?? [];
      list.push(meal);
      groups.set(key, list);
    }
    return order
      .filter((type) => groups.has(type))
      .map((type) => ({
        type,
        label: this.mealTypeLabel(type),
        items: groups.get(type) ?? []
      }));
  });

  readonly targetProgress = computed(() => {
    const t = this.targets();
    const totals = this.dayTotals();
    if (!t) {
      return null;
    }
    const pct = (logged: number, target: number) =>
      target > 0 ? Math.min(150, Math.round((logged / target) * 100)) : 0;
    return {
      caloriesPct: pct(totals.calories, t.calorieTarget),
      proteinPct: pct(totals.proteinG, Number(t.proteinGTarget)),
      carbsPct: pct(totals.carbsG, Number(t.carbsGTarget)),
      fatPct: pct(totals.fatG, Number(t.fatGTarget)),
      remainingCalories: Math.max(0, t.calorieTarget - totals.calories),
      remainingProtein: Math.max(0, Number(t.proteinGTarget) - totals.proteinG),
      remainingCarbs: Math.max(0, Number(t.carbsGTarget) - totals.carbsG),
      remainingFat: Math.max(0, Number(t.fatGTarget) - totals.fatG)
    };
  });

  readonly mealForm = this.fb.nonNullable.group({
    mealDate: [this.today, Validators.required],
    mealType: ['LUNCH', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    quantity: [100 as number, [Validators.required, Validators.min(0.01)]],
    quantityUnit: ['GRAMS' as FoodQuantityUnit, Validators.required],
    calories: [500 as number, [Validators.required, Validators.min(0)]],
    proteinG: [30 as number | null],
    carbsG: [40 as number | null],
    fatG: [15 as number | null],
    notes: ['']
  });

  readonly waterForm = this.fb.nonNullable.group({
    loggedOn: [this.today, Validators.required],
    amountMl: [250 as number, [Validators.required, Validators.min(1)]],
    notes: ['']
  });

  readonly targetForm = this.fb.nonNullable.group({
    nutritionGoal: ['MAINTENANCE' as NutritionGoal, Validators.required],
    calorieTarget: [2000 as number, [Validators.required, Validators.min(800)]],
    proteinGTarget: [150 as number, [Validators.required, Validators.min(0)]],
    carbsGTarget: [200 as number, [Validators.required, Validators.min(0)]],
    fatGTarget: [60 as number, [Validators.required, Validators.min(0)]],
    fiberGTarget: [30 as number, [Validators.required, Validators.min(0)]],
    waterMlTarget: [2500 as number, [Validators.required, Validators.min(500)]]
  });

  readonly mealTypeOptions: AppSelectOption[] = [
    { value: 'BREAKFAST', label: 'Breakfast' },
    { value: 'LUNCH', label: 'Lunch' },
    { value: 'DINNER', label: 'Dinner' },
    { value: 'SNACK', label: 'Snacks' },
    { value: 'PRE_WORKOUT', label: 'Pre-workout' },
    { value: 'POST_WORKOUT', label: 'Post-workout' }
  ];

  readonly quantityUnitOptions: AppSelectOption[] = [
    { value: 'GRAMS', label: 'grams (g)' },
    { value: 'ML', label: 'ml' },
    { value: 'PIECES', label: 'pieces' },
    { value: 'SERVINGS', label: 'servings' },
    { value: 'CUPS', label: 'cups' }
  ];

  readonly nutritionGoalOptions: AppSelectOption[] = [
    { value: 'CUTTING', label: 'Cutting' },
    { value: 'BULKING', label: 'Bulking' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'RECOMPOSITION', label: 'Recomposition' }
  ];

  readonly foodCategoryOptions: AppSelectOption[] = [
    { value: '', label: 'All categories' },
    { value: 'STAPLE', label: 'Indian staples' },
    { value: 'MEAL', label: 'Indian meals' },
    { value: 'CUSTOM', label: 'My custom foods' }
  ];

  readonly foodRegionOptions: AppSelectOption[] = [
    { value: '', label: 'All regions' },
    { value: 'PAN_INDIA', label: 'Pan-India' },
    { value: 'NORTH', label: 'North' },
    { value: 'SOUTH', label: 'South' },
    { value: 'WEST', label: 'West' },
    { value: 'EAST', label: 'East' },
    { value: 'CENTRAL', label: 'Central' },
    { value: 'OTHER', label: 'Other / regional' }
  ];

  readonly customRegionOptions: AppSelectOption[] = [
    { value: 'PAN_INDIA', label: 'Pan-India' },
    { value: 'NORTH', label: 'North' },
    { value: 'SOUTH', label: 'South' },
    { value: 'WEST', label: 'West' },
    { value: 'EAST', label: 'East' },
    { value: 'CENTRAL', label: 'Central' },
    { value: 'OTHER', label: 'Other / regional' }
  ];

  readonly customFoodForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    category: ['CUSTOM' as FoodCategory, Validators.required],
    region: ['OTHER' as FoodRegion, Validators.required],
    servingQty: [100 as number, [Validators.required, Validators.min(0.01)]],
    servingUnit: ['GRAMS' as FoodQuantityUnit, Validators.required],
    calories: [100 as number, [Validators.required, Validators.min(0)]],
    proteinG: [0 as number],
    carbsG: [0 as number],
    fatG: [0 as number]
  });

  readonly customCategoryOptions: AppSelectOption[] = [
    { value: 'CUSTOM', label: 'Custom' },
    { value: 'STAPLE', label: 'Staple' },
    { value: 'MEAL', label: 'Meal' }
  ];

  readonly quickWaterAmounts = [250, 500, 750] as const;

  ngOnInit(): void {
    this.targetForm.controls.nutritionGoal.valueChanges.subscribe((goal) => {
      if (this.editingTargets()) {
        this.onGoalChange(goal);
      }
    });
    this.mealForm.controls.quantity.valueChanges.subscribe(() => this.scaleFromSelectedFood());
    this.mealForm.controls.quantityUnit.valueChanges.subscribe(() => this.scaleFromSelectedFood());
    this.foodSearchSub = this.foodSearch$
      .pipe(
        debounceTime(220),
        switchMap(() => {
          this.searchingFoods.set(true);
          return this.api
            .searchFoods({
              q: this.foodQuery() || undefined,
              category: this.foodCategory() || undefined,
              region: this.foodRegion() || undefined
            })
            .pipe(catchError(() => of([] as FoodItem[])));
        })
      )
      .subscribe((rows) => {
        this.searchingFoods.set(false);
        this.foodResults.set(rows);
      });
    this.loadTargetsAndProfile();
    this.reload();
    this.foodSearch$.next();
  }

  ngOnDestroy(): void {
    this.foodSearchSub?.unsubscribe();
  }

  barWidth(pct: number): number {
    return Math.max(0, Math.min(100, pct || 0));
  }

  asNum(value: number | string | null | undefined): number {
    return asMacroNumber(value, 0);
  }

  fiberGrams(t: NutritionTarget): number {
    return asMacroNumber(t.fiberGTarget, 30);
  }

  goalLabel(goal: NutritionGoal | string | null | undefined): string {
    if (!goal) {
      return 'Maintenance';
    }
    return nutritionGoalLabel(goal as NutritionGoal);
  }

  onGoalSelect(goal: string): void {
    const nutritionGoal = (goal || 'MAINTENANCE') as NutritionGoal;
    const current = this.targets();
    if (current?.nutritionGoal === nutritionGoal && !this.editingTargets()) {
      return;
    }
    if (this.editingTargets()) {
      this.targetForm.patchValue({ nutritionGoal }, { emitEvent: false });
      this.onGoalChange(nutritionGoal);
      return;
    }
    this.applyGoalAndSave(nutritionGoal, false);
  }

  reload(date = this.listDate()): void {
    this.listDate.set(date);
    this.syncFormDates(date);
    this.api.listMeals(date).subscribe({
      next: (rows) => this.meals.set(rows),
      error: () => this.error.set('Failed to load meals')
    });
    this.api.listWater(date).subscribe({
      next: (rows) => this.water.set(rows),
      error: () => this.error.set('Failed to load water logs')
    });
  }

  shiftDay(delta: number): void {
    this.reload(this.shiftDateKey(this.listDate(), delta));
  }

  goToday(): void {
    this.reload(this.today);
  }

  onListDateChange(date: string): void {
    if (!date) {
      return;
    }
    this.reload(date);
  }

  mealTypeLabel(type: string): string {
    return this.mealTypeOptions.find((o) => o.value === type)?.label ?? type;
  }

  quantityLabel(unit: string | null | undefined): string {
    switch (unit) {
      case 'GRAMS':
        return 'g';
      case 'ML':
        return 'ml';
      case 'PIECES':
        return 'pcs';
      case 'SERVINGS':
        return 'servings';
      case 'CUPS':
        return 'cups';
      default:
        return unit || '';
    }
  }

  formatQuantity(meal: Meal): string {
    const qty = Number(meal.quantity);
    const amount = Number.isFinite(qty) ? qty : 1;
    const unit = this.quantityLabel(meal.quantityUnit || 'GRAMS');
    const shown =
      Math.abs(amount - Math.round(amount)) < 0.001
        ? String(Math.round(amount))
        : amount.toFixed(1).replace(/\.0$/, '');
    return `${shown} ${unit}`;
  }

  onFoodQueryInput(value: string): void {
    this.foodQuery.set(value);
    this.foodSearch$.next();
  }

  onFoodCategoryChange(value: string): void {
    this.foodCategory.set(value || '');
    this.foodSearch$.next();
  }

  onFoodRegionChange(value: string): void {
    this.foodRegion.set(value || '');
    this.foodSearch$.next();
  }

  pickFood(food: FoodItem): void {
    this.selectedFood.set(food);
    this.mealForm.patchValue(
      {
        name: food.name,
        quantity: Number(food.servingQty),
        quantityUnit: food.servingUnit as FoodQuantityUnit,
        calories: Number(food.calories),
        proteinG: Number(food.proteinG),
        carbsG: Number(food.carbsG),
        fatG: Number(food.fatG)
      },
      { emitEvent: false }
    );
  }

  clearSelectedFood(): void {
    this.selectedFood.set(null);
  }

  toggleCustomFood(): void {
    this.showCustomFood.update((v) => !v);
  }

  saveCustomFood(): void {
    if (this.customFoodForm.invalid) {
      this.customFoodForm.markAllAsTouched();
      this.toast.error('Fill custom food name, serving, and calories');
      return;
    }
    const raw = this.customFoodForm.getRawValue();
    const body: FoodItemRequest = {
      name: raw.name.trim(),
      category: raw.category,
      region: raw.region,
      servingQty: Number(raw.servingQty),
      servingUnit: raw.servingUnit,
      calories: Math.round(Number(raw.calories)),
      proteinG: Number(raw.proteinG) || 0,
      carbsG: Number(raw.carbsG) || 0,
      fatG: Number(raw.fatG) || 0
    };
    this.savingCustomFood.set(true);
    this.api.createFood(body).subscribe({
      next: (food) => {
        this.savingCustomFood.set(false);
        this.showCustomFood.set(false);
        this.customFoodForm.reset({
          name: '',
          category: 'CUSTOM',
          region: 'OTHER',
          servingQty: 100,
          servingUnit: 'GRAMS',
          calories: 100,
          proteinG: 0,
          carbsG: 0,
          fatG: 0
        });
        this.toast.success('Custom food saved');
        this.pickFood(food);
        this.foodSearch$.next();
      },
      error: (err: HttpErrorResponse) => {
        this.savingCustomFood.set(false);
        this.toast.error(this.errorDetail(err) ?? 'Could not save custom food');
      }
    });
  }

  foodCategoryLabel(category: string): string {
    switch (category) {
      case 'STAPLE':
        return 'Staple';
      case 'MEAL':
        return 'Meal';
      case 'CUSTOM':
        return 'Custom';
      default:
        return category;
    }
  }

  foodRegionLabel(region: string): string {
    return this.foodRegionOptions.find((o) => o.value === region)?.label ?? region;
  }

  private scaleFromSelectedFood(): void {
    const food = this.selectedFood();
    if (!food) {
      return;
    }
    const qty = Number(this.mealForm.controls.quantity.value);
    const unit = this.mealForm.controls.quantityUnit.value;
    if (!Number.isFinite(qty) || qty <= 0 || unit !== food.servingUnit) {
      return;
    }
    const baseQty = Number(food.servingQty) || 1;
    const factor = qty / baseQty;
    this.mealForm.patchValue(
      {
        calories: Math.max(0, Math.round(Number(food.calories) * factor)),
        proteinG: this.roundMacro(Number(food.proteinG) * factor),
        carbsG: this.roundMacro(Number(food.carbsG) * factor),
        fatG: this.roundMacro(Number(food.fatG) * factor)
      },
      { emitEvent: false }
    );
  }

  private roundMacro(value: number): number {
    return Math.round(value * 10) / 10;
  }

  setWaterGoal(raw: string | number): void {
    const value = Math.max(500, Math.min(10000, Math.round(Number(raw)) || DEFAULT_WATER_GOAL_ML));
    this.waterGoalMl.set(value);
    try {
      localStorage.setItem(WATER_GOAL_KEY, String(value));
    } catch {
      /* ignore */
    }
  }

  quickWater(amountMl: number): void {
    this.waterForm.patchValue({
      loggedOn: this.listDate(),
      amountMl
    });
    this.saveWater();
  }

  toggleWaterReminders(enabled: boolean): void {
    const t = this.targets();
    if (!t) {
      this.toast.error('Set your nutrition targets first');
      return;
    }
    const body: NutritionTargetRequest = {
      calorieTarget: t.calorieTarget,
      proteinGTarget: Number(t.proteinGTarget),
      carbsGTarget: Number(t.carbsGTarget),
      fatGTarget: Number(t.fatGTarget),
      fiberGTarget: Number(t.fiberGTarget ?? 30),
      waterMlTarget: t.waterMlTarget,
      nutritionGoal: t.nutritionGoal,
      manualOverride: t.manualOverride,
      waterRemindersEnabled: enabled
    };
    this.persistTargets(body, enabled ? 'Water reminders enabled (10am, 2pm, 6pm)' : 'Water reminders off');
  }

  waterRemindersOn(): boolean {
    return !!this.targets()?.waterRemindersEnabled;
  }

  isPanelOpen(id: string): boolean {
    return this.panelOpen()[id] !== false;
  }

  togglePanel(id: string): void {
    this.panelOpen.update((state) => ({
      ...state,
      [id]: state[id] === false
    }));
  }

  isMealGroupOpen(type: string): boolean {
    return !this.collapsedMealGroups()[type];
  }

  toggleMealGroup(type: string): void {
    this.collapsedMealGroups.update((state) => ({
      ...state,
      [type]: !state[type]
    }));
  }

  openTargetEditor(): void {
    const t = this.targets();
    if (t) {
      this.patchTargetFormFromTargets(t);
    } else {
      this.applySuggestedToForm(false);
    }
    this.editingTargets.set(true);
  }

  cancelTargetEditor(): void {
    this.editingTargets.set(false);
  }

  onGoalChange(goal: string): void {
    const nutritionGoal = (goal || 'MAINTENANCE') as NutritionGoal;
    const suggestion = suggestMacroTargets(this.profile(), {
      nutritionGoal,
      trainingDaysPerWeek: this.trainingDaysPerWeek()
    });
    this.targetForm.patchValue(
      {
        calorieTarget: suggestion.calorieTarget,
        proteinGTarget: suggestion.proteinGTarget,
        carbsGTarget: suggestion.carbsGTarget,
        fatGTarget: suggestion.fatGTarget,
        fiberGTarget: suggestion.fiberGTarget,
        waterMlTarget: suggestion.waterMlTarget
      },
      { emitEvent: false }
    );
  }

  recalculateFromProfile(): void {
    const goal =
      this.targetForm.getRawValue().nutritionGoal ||
      this.targets()?.nutritionGoal ||
      mapFitnessGoalToNutrition(this.profile()?.fitnessGoal);
    this.applyGoalAndSave(goal, true);
  }

  saveTargets(manualOverride = true): void {
    if (this.targetForm.invalid) {
      this.targetForm.markAllAsTouched();
      this.toast.error('Check calorie and macro targets');
      return;
    }
    const raw = this.targetForm.getRawValue();
    const body: NutritionTargetRequest = {
      calorieTarget: Math.round(Number(raw.calorieTarget)),
      proteinGTarget: Number(raw.proteinGTarget),
      carbsGTarget: Number(raw.carbsGTarget),
      fatGTarget: Number(raw.fatGTarget),
      fiberGTarget: Math.max(0, Number(raw.fiberGTarget) || 30),
      waterMlTarget: Math.round(Number(raw.waterMlTarget)),
      nutritionGoal: raw.nutritionGoal,
      manualOverride,
      waterRemindersEnabled: this.targets()?.waterRemindersEnabled ?? false
    };
    this.persistTargets(body, manualOverride ? 'Macros saved' : 'Macros recalculated');
  }

  private applyGoalAndSave(nutritionGoal: NutritionGoal, fromRecalculate: boolean): void {
    const suggestion = suggestMacroTargets(this.profile(), {
      nutritionGoal,
      trainingDaysPerWeek: this.trainingDaysPerWeek()
    });
    this.targetForm.patchValue(
      {
        nutritionGoal: suggestion.nutritionGoal,
        calorieTarget: suggestion.calorieTarget,
        proteinGTarget: suggestion.proteinGTarget,
        carbsGTarget: suggestion.carbsGTarget,
        fatGTarget: suggestion.fatGTarget,
        fiberGTarget: suggestion.fiberGTarget,
        waterMlTarget: suggestion.waterMlTarget
      },
      { emitEvent: false }
    );
    if (suggestion.missingProfileFields.length) {
      this.targetHint.set(
        `Using defaults for: ${suggestion.missingProfileFields.join(', ')}. Update profile for better accuracy.`
      );
    } else if (fromRecalculate) {
      this.targetHint.set(null);
    }
    const label = nutritionGoalLabel(suggestion.nutritionGoal);
    this.persistTargets(
      {
        calorieTarget: suggestion.calorieTarget,
        proteinGTarget: suggestion.proteinGTarget,
        carbsGTarget: suggestion.carbsGTarget,
        fatGTarget: suggestion.fatGTarget,
        fiberGTarget: suggestion.fiberGTarget,
        waterMlTarget: suggestion.waterMlTarget,
        nutritionGoal: suggestion.nutritionGoal,
        manualOverride: false,
        waterRemindersEnabled: this.targets()?.waterRemindersEnabled ?? false
      },
      fromRecalculate ? `Macros recalculated for ${label}` : `Macros set for ${label}`
    );
  }

  saveMeal(): void {
    if (this.mealForm.invalid) {
      this.mealForm.markAllAsTouched();
      this.toast.error('Fill food name, date, meal, quantity, and calories');
      return;
    }

    const raw = this.mealForm.getRawValue();
    const body: MealRequest = {
      mealDate: raw.mealDate,
      mealType: raw.mealType,
      name: raw.name.trim(),
      quantity: Number(raw.quantity),
      quantityUnit: raw.quantityUnit,
      calories: Number(raw.calories),
      proteinG: this.toNumberOrNull(raw.proteinG),
      carbsG: this.toNumberOrNull(raw.carbsG),
      fatG: this.toNumberOrNull(raw.fatG),
      notes: raw.notes?.trim() ? raw.notes.trim() : null
    };

    if (!body.name) {
      this.mealForm.controls.name.setErrors({ required: true });
      this.toast.error('Meal name is required');
      return;
    }

    this.savingMeal.set(true);
    this.api.createMeal(body).subscribe({
      next: () => {
        this.savingMeal.set(false);
        this.mealForm.patchValue({ name: '', notes: '' });
        this.reload(body.mealDate);
        this.error.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.savingMeal.set(false);
        const detail = this.errorDetail(err) ?? 'Could not save food';
        this.error.set(detail);
        this.toast.error(detail);
      }
    });
  }

  saveWater(): void {
    if (this.waterForm.invalid) {
      this.waterForm.markAllAsTouched();
      this.toast.error('Fill water date and amount');
      return;
    }

    const raw = this.waterForm.getRawValue();
    const body = {
      loggedOn: raw.loggedOn,
      amountMl: Number(raw.amountMl),
      notes: raw.notes?.trim() ? raw.notes.trim() : null
    };

    this.savingWater.set(true);
    this.api.createWater(body).subscribe({
      next: () => {
        this.savingWater.set(false);
        this.waterForm.patchValue({ notes: '' });
        this.reload(body.loggedOn);
        this.error.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.savingWater.set(false);
        const detail = this.errorDetail(err) ?? 'Could not save water';
        this.error.set(detail);
        this.toast.error(detail);
      }
    });
  }

  removeMeal(id: string): void {
    this.api.deleteMeal(id).subscribe({
      next: () => {
        this.reload();
      },
      error: () => this.toast.error('Could not delete food')
    });
  }

  removeWater(id: string): void {
    this.api.deleteWater(id).subscribe({
      next: () => {
        this.reload();
      },
      error: () => this.toast.error('Could not delete water log')
    });
  }

  private loadTargetsAndProfile(): void {
    forkJoin({
      profile: this.api.getMyProfile().pipe(catchError(() => of(null))),
      targets: this.api.getNutritionTargets().pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            return of(null);
          }
          return of(null);
        })
      ),
      workouts: this.api.listWorkouts().pipe(catchError(() => of([])))
    }).subscribe(({ profile, targets, workouts }) => {
      this.profile.set(profile);
      const weekAgo = this.shiftDateKey(this.today, -6);
      const trainingDays = new Set(
        workouts
          .filter((w) => w.status === 'COMPLETED' && w.workoutDate >= weekAgo && w.workoutDate <= this.today)
          .map((w) => w.workoutDate)
      ).size;
      this.trainingDaysPerWeek.set(trainingDays);

      if (targets) {
        this.applyLoadedTargets(targets);
        return;
      }

      if (!profile) {
        this.targetHint.set('Add your profile (age, sex, height, weight) to generate targets.');
        return;
      }

      const suggestion = suggestMacroTargets(profile, {
        nutritionGoal: mapFitnessGoalToNutrition(profile.fitnessGoal),
        trainingDaysPerWeek: trainingDays
      });
      if (suggestion.missingProfileFields.length) {
        this.targetHint.set(
          `Missing profile fields: ${suggestion.missingProfileFields.join(', ')}. Targets use safe defaults until you complete profile.`
        );
      }
      this.persistTargets(
        {
          calorieTarget: suggestion.calorieTarget,
          proteinGTarget: suggestion.proteinGTarget,
          carbsGTarget: suggestion.carbsGTarget,
          fatGTarget: suggestion.fatGTarget,
          fiberGTarget: suggestion.fiberGTarget,
          waterMlTarget: suggestion.waterMlTarget,
          nutritionGoal: suggestion.nutritionGoal,
          manualOverride: false,
          waterRemindersEnabled: false
        },
        null
      );
    });
  }

  private persistTargets(body: NutritionTargetRequest, successMessage: string | null): void {
    this.savingTargets.set(true);
    this.api.upsertNutritionTargets(body).subscribe({
      next: (saved) => {
        this.savingTargets.set(false);
        this.applyLoadedTargets(saved);
        this.editingTargets.set(false);
        if (successMessage) {
          this.toast.success(successMessage);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.savingTargets.set(false);
        const detail = this.errorDetail(err) ?? 'Could not save nutrition targets';
        this.toast.error(detail);
      }
    });
  }

  private applyLoadedTargets(targets: NutritionTarget): void {
    const normalized: NutritionTarget = {
      ...targets,
      calorieTarget: asMacroNumber(targets.calorieTarget, 2000),
      proteinGTarget: asMacroNumber(targets.proteinGTarget, 150),
      carbsGTarget: asMacroNumber(targets.carbsGTarget, 200),
      fatGTarget: asMacroNumber(targets.fatGTarget, 60),
      fiberGTarget: asMacroNumber(targets.fiberGTarget, 30),
      waterMlTarget: asMacroNumber(targets.waterMlTarget, DEFAULT_WATER_GOAL_ML),
      nutritionGoal: targets.nutritionGoal || 'MAINTENANCE',
      waterRemindersEnabled: !!targets.waterRemindersEnabled
    };
    this.targets.set(normalized);
    this.patchTargetFormFromTargets(normalized);
    this.setWaterGoal(normalized.waterMlTarget);
    if (normalized.manualOverride) {
      this.targetHint.set('Custom macros active. Recalculate anytime to restore goal-based targets.');
    } else {
      this.targetHint.set(null);
    }
  }

  private patchTargetFormFromTargets(t: NutritionTarget): void {
    this.targetForm.patchValue(
      {
        nutritionGoal: t.nutritionGoal,
        calorieTarget: asMacroNumber(t.calorieTarget, 2000),
        proteinGTarget: asMacroNumber(t.proteinGTarget, 150),
        carbsGTarget: asMacroNumber(t.carbsGTarget, 200),
        fatGTarget: asMacroNumber(t.fatGTarget, 60),
        fiberGTarget: asMacroNumber(t.fiberGTarget, 30),
        waterMlTarget: asMacroNumber(t.waterMlTarget, DEFAULT_WATER_GOAL_ML)
      },
      { emitEvent: false }
    );
  }

  private applySuggestedToForm(_markManualFalseHint: boolean): void {
    const goal =
      this.targetForm.getRawValue().nutritionGoal ||
      mapFitnessGoalToNutrition(this.profile()?.fitnessGoal);
    this.applyGoalAndSave(goal, true);
  }

  private syncFormDates(date: string): void {
    this.mealForm.patchValue({ mealDate: date });
    this.waterForm.patchValue({ loggedOn: date });
  }

  private readWaterGoal(): number {
    try {
      const raw = localStorage.getItem(WATER_GOAL_KEY);
      const n = raw ? Number(raw) : DEFAULT_WATER_GOAL_ML;
      if (!Number.isFinite(n) || n < 500) {
        return DEFAULT_WATER_GOAL_ML;
      }
      return Math.round(n);
    } catch {
      return DEFAULT_WATER_GOAL_ML;
    }
  }

  private localDateKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private shiftDateKey(key: string, days: number): string {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return this.localDateKey(dt);
  }

  private toNumberOrNull(value: number | null | undefined): number | null {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return null;
    }
    return Number(value);
  }

  private errorDetail(err: HttpErrorResponse): string | null {
    const body = err.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body && typeof body === 'object') {
      if (typeof body.detail === 'string') {
        return body.detail;
      }
      if (typeof body.message === 'string') {
        return body.message;
      }
      if (typeof body.title === 'string') {
        return body.title;
      }
    }
    return null;
  }
}
