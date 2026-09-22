import { Component, computed, effect, input, signal } from '@angular/core';
import { getBodyDiagram } from '@musclemap/assets';
import { MuscleGroup } from '../core/models';

export type MuscleRegion =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'abs'
  | 'obliques'
  | 'quads'
  | 'calves'
  | 'upperBack'
  | 'lats'
  | 'glutes'
  | 'hamstrings';

type BodyView = 'front' | 'back';

/** Our UI regions → MuscleMap semantic groups */
const REGION_GROUPS: Record<MuscleRegion, string[]> = {
  chest: ['CHEST'],
  shoulders: ['SHOULDERS_FRONT', 'SHOULDERS_REAR', 'SHOULDERS_SIDE'],
  biceps: ['BICEPS'],
  triceps: ['TRICEPS'],
  abs: ['CORE'],
  obliques: ['OBLIQUES'],
  quads: ['QUADS'],
  calves: ['CALVES'],
  upperBack: ['TRAPEZIUS', 'RHOMBOIDS'],
  lats: ['LATS'],
  glutes: ['GLUTES'],
  hamstrings: ['HAMSTRINGS']
};

const PRIMARY: Record<MuscleGroup, MuscleRegion[]> = {
  CHEST: ['chest'],
  BACK: ['upperBack', 'lats'],
  SHOULDERS: ['shoulders'],
  BICEPS: ['biceps'],
  TRICEPS: ['triceps'],
  LEGS: ['quads', 'hamstrings', 'calves'],
  GLUTES: ['glutes'],
  CORE: ['abs', 'obliques'],
  FULL_BODY: ['chest', 'upperBack', 'shoulders', 'quads', 'glutes', 'abs'],
  CARDIO: ['quads', 'calves', 'glutes']
};

const SECONDARY: Partial<Record<MuscleGroup, MuscleRegion[]>> = {
  CHEST: ['shoulders', 'triceps'],
  BACK: ['biceps', 'shoulders'],
  SHOULDERS: ['triceps'],
  BICEPS: ['shoulders'],
  TRICEPS: ['shoulders', 'chest'],
  LEGS: ['glutes', 'calves'],
  GLUTES: ['hamstrings', 'quads'],
  CORE: ['obliques'],
  FULL_BODY: ['biceps', 'triceps', 'hamstrings', 'calves'],
  CARDIO: ['abs']
};

const FRONT_REGIONS: MuscleRegion[] = ['chest', 'shoulders', 'biceps', 'abs', 'obliques', 'quads', 'calves'];
const BACK_REGIONS: MuscleRegion[] = ['shoulders', 'triceps', 'upperBack', 'lats', 'glutes', 'hamstrings', 'calves'];

const FRONT_DIAGRAM = getBodyDiagram('MALE', 'FRONT');
const BACK_DIAGRAM = getBodyDiagram('MALE', 'BACK');

@Component({
  selector: 'app-muscle-map',
  standalone: true,
  templateUrl: './muscle-map.component.html',
  styleUrl: './muscle-map.component.scss'
})
export class MuscleMapComponent {
  readonly muscleGroup = input.required<MuscleGroup>();
  readonly label = input<string>('');

  private readonly viewOverride = signal<BodyView | null>(null);

  readonly primary = computed(() => PRIMARY[this.muscleGroup()] ?? []);
  readonly secondary = computed(() => SECONDARY[this.muscleGroup()] ?? []);

  readonly preferredView = computed<BodyView>(() => {
    const primary = this.primary();
    const frontHits = primary.filter((r) => FRONT_REGIONS.includes(r)).length;
    const backHits = primary.filter((r) => BACK_REGIONS.includes(r)).length;
    return backHits > frontHits ? 'back' : 'front';
  });

  readonly activeView = computed(() => this.viewOverride() ?? this.preferredView());

  readonly bodySrc = computed(() =>
    this.activeView() === 'front' ? 'muscles/male-front.webp?v=2' : 'muscles/male-back.webp?v=2'
  );

  readonly diagram = computed(() => (this.activeView() === 'front' ? FRONT_DIAGRAM : BACK_DIAGRAM));

  readonly viewBox = computed(() => this.diagram().viewBox);

  readonly muscles = computed(() => this.diagram().muscles);

  readonly outlinePath = computed(() => this.diagram().outline[0]?.d ?? '');

  readonly primaryGroups = computed(() => expandGroups(this.primary()));
  readonly secondaryGroups = computed(() => expandGroups(this.secondary()));

  readonly legendPrimary = computed(() => this.primary().map((r) => this.regionLabel(r)));
  readonly legendSecondary = computed(() => this.secondary().map((r) => this.regionLabel(r)));

  constructor() {
    effect(() => {
      this.muscleGroup();
      this.viewOverride.set(null);
    });
  }

  setView(view: BodyView): void {
    this.viewOverride.set(view);
  }

  highlightClass(group: string): 'primary' | 'secondary' | '' {
    if (this.primaryGroups().includes(group)) {
      return 'primary';
    }
    if (this.secondaryGroups().includes(group)) {
      return 'secondary';
    }
    return '';
  }

  regionLabel(region: MuscleRegion): string {
    switch (region) {
      case 'chest':
        return 'Chest';
      case 'shoulders':
        return 'Shoulders';
      case 'biceps':
        return 'Biceps';
      case 'triceps':
        return 'Triceps';
      case 'abs':
        return 'Abs';
      case 'obliques':
        return 'Obliques';
      case 'quads':
        return 'Quads';
      case 'calves':
        return 'Calves';
      case 'upperBack':
        return 'Upper back';
      case 'lats':
        return 'Lats';
      case 'glutes':
        return 'Glutes';
      case 'hamstrings':
        return 'Hamstrings';
    }
  }
}

function expandGroups(regions: MuscleRegion[]): string[] {
  return [...new Set(regions.flatMap((r) => REGION_GROUPS[r] ?? []))];
}
