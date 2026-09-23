import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  NutritionProgressAnalytics,
  NutritionProgressAnalyticsService
} from '../../core/nutrition-progress-analytics.service';

@Component({
  selector: 'app-nutrition-insights-panel',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <article class="insights-panel" [class.collapsed]="!open()">
      <button
        type="button"
        class="insights-head panel-toggle"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
      >
        <div class="head-copy">
          <p class="eyebrow">Nutrition × body × training × steps</p>
          <h2>
            <span class="chevron" aria-hidden="true">{{ open() ? '▾' : '▸' }}</span>
            Last {{ analytics()?.windowWeeks ?? weeks }} weeks
          </h2>
        </div>
        @if (loading() && open()) {
          <span class="muted">Loading…</span>
        }
      </button>

      @if (open()) {
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        @if (analytics(); as a) {
          <div class="stat-grid">
            <div class="stat">
              <span class="label">Average calories</span>
              <span class="value">
                @if (a.avgDailyCalories != null) {
                  {{ a.avgDailyCalories | number: '1.0-0' }}
                } @else {
                  —
                }
              </span>
              <span class="unit">kcal / logged day</span>
            </div>
            <div class="stat">
              <span class="label">Average protein</span>
              <span class="value">
                @if (a.avgDailyProteinG != null) {
                  {{ a.avgDailyProteinG | number: '1.0-0' }}g
                } @else {
                  —
                }
              </span>
              <span class="unit">per logged day</span>
            </div>
            <div class="stat">
              <span class="label">Weight change</span>
              <span
                class="value"
                [class.down]="(a.weightChangeKg ?? 0) < 0"
                [class.up]="(a.weightChangeKg ?? 0) > 0"
              >
                @if (a.weightChangeKg != null) {
                  {{ a.weightChangeKg > 0 ? '+' : '' }}{{ a.weightChangeKg | number: '1.1-1' }}kg
                } @else {
                  —
                }
              </span>
              <span class="unit">{{ a.weighIns }} weigh-in{{ a.weighIns === 1 ? '' : 's' }}</span>
            </div>
            <div class="stat">
              <span class="label">Workouts</span>
              <span class="value">{{ a.workouts }}</span>
              <span class="unit">{{ a.workoutCaloriesBurned | number: '1.0-0' }} kcal burned</span>
            </div>
            <div class="stat">
              <span class="label">Avg steps</span>
              <span class="value">
                @if (a.avgDailySteps != null) {
                  {{ a.avgDailySteps | number: '1.0-0' }}
                } @else {
                  —
                }
              </span>
              <span class="unit">
                @if (a.daysWithSteps > 0) {
                  {{ a.stepCaloriesBurned | number: '1.0-0' }} kcal from steps
                } @else {
                  no step logs
                }
              </span>
            </div>
            <div class="stat">
              <span class="label">Total burned</span>
              <span class="value">{{ a.totalCaloriesBurned | number: '1.0-0' }}</span>
              <span class="unit">workouts + steps</span>
            </div>
            <div class="stat">
              <span class="label">Strength trend</span>
              <span class="value trend">{{ strengthLabel(a.strengthTrend) }}</span>
              <span class="unit"
                >{{ a.strengthExercisesWithProgression }} lift{{
                  a.strengthExercisesWithProgression === 1 ? '' : 's'
                }}
                progressing</span
              >
            </div>
          </div>

          @if (a.insights.length) {
            <ul class="insight-list">
              @for (insight of a.insights; track insight.code) {
                <li>{{ insight.message }}</li>
              }
            </ul>
          }

          <p class="disclaimer">{{ a.disclaimer }}</p>
        }
      }
    </article>
  `,
  styles: `
    .insights-panel {
      display: grid;
      gap: 1rem;
      padding: 1.1rem 1.2rem;
      border: 1px solid var(--line);
      border-radius: 1.15rem;
      background:
        linear-gradient(150deg, color-mix(in srgb, var(--accent) 8%, transparent), transparent 50%),
        var(--panel);
    }
    .insights-panel.collapsed {
      gap: 0;
    }
    .insights-head.panel-toggle {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: flex-start;
      width: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      text-align: left;
      cursor: pointer;
      color: inherit;
    }
    .head-copy {
      min-width: 0;
    }
    .chevron {
      display: inline-block;
      width: 1rem;
      margin-right: 0.25rem;
      color: var(--muted);
    }
    .eyebrow {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
    }
    h2 {
      margin: 0.25rem 0 0;
      font-family: var(--font-display);
      font-size: clamp(1.35rem, 3.5vw, 1.85rem);
    }
    .muted { color: var(--muted); font-size: 0.85rem; }
    .error { margin: 0; color: var(--danger, #c44); }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
      gap: 0.65rem;
    }
    .stat {
      display: grid;
      gap: 0.25rem;
      padding: 0.75rem 0.8rem;
      border-radius: 0.85rem;
      border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
      background: color-mix(in srgb, var(--bg) 55%, transparent);
      min-width: 0;
    }
    .label { color: var(--muted); font-size: 0.75rem; }
    .value {
      font-family: var(--font-display);
      font-size: clamp(1.15rem, 2.6vw, 1.45rem);
      font-weight: 700;
      line-height: 1.1;
    }
    .value.down { color: var(--accent); }
    .value.up { color: var(--text); }
    .value.trend { letter-spacing: 0.02em; }
    .unit { color: var(--muted); font-size: 0.72rem; }
    .insight-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.55rem;
    }
    .insight-list li {
      padding: 0.7rem 0.85rem;
      border-radius: 0.75rem;
      border: 1px solid var(--line);
      background: color-mix(in srgb, var(--bg) 50%, transparent);
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .disclaimer {
      margin: 0;
      font-size: 0.8rem;
      color: var(--muted);
      line-height: 1.4;
    }
    @media (max-width: 900px) {
      .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `
})
export class NutritionInsightsPanelComponent implements OnInit {
  private readonly analyticsApi = inject(NutritionProgressAnalyticsService);

  @Input() weeks = 8;

  readonly open = signal(true);
  readonly analytics = signal<NutritionProgressAnalytics | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.analyticsApi.load(this.weeks).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load nutrition progress analytics');
      }
    });
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  strengthLabel(trend: NutritionProgressAnalytics['strengthTrend']): string {
    switch (trend) {
      case 'up':
        return 'Up';
      case 'down':
        return 'Down';
      case 'flat':
        return 'Steady';
      default:
        return '—';
    }
  }
}
