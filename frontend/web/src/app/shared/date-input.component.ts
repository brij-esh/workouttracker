import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  forwardRef,
  inject,
  input,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type PanelMode = 'days' | 'months' | 'years';

@Component({
  selector: 'app-date-input',
  standalone: true,
  templateUrl: './date-input.component.html',
  styleUrl: './date-input.component.scss',
  host: {
    '[class.compact]': 'compact()'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInputComponent),
      multi: true
    }
  ]
})
export class DateInputComponent implements ControlValueAccessor, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly disabledInput = input(false, { alias: 'disabled' });
  /** Smaller pill control for toolbars (e.g. Nutrition day nav). */
  readonly compact = input(false);

  readonly open = signal(false);
  readonly value = signal<string>('');
  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth()); // 0-11
  readonly panelMode = signal<PanelMode>('days');
  private readonly cvaDisabled = signal(false);

  readonly isDisabled = computed(() => this.disabledInput() || this.cvaDisabled());

  readonly displayLabel = computed(() => {
    const v = this.value();
    if (!v) {
      return 'Select date';
    }
    const d = parseIsoDate(v);
    if (!d) {
      return v;
    }
    if (this.compact()) {
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  });

  readonly monthTitle = computed(() => {
    const d = new Date(this.viewYear(), this.viewMonth(), 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  });

  readonly weeks = computed(() => buildCalendarWeeks(this.viewYear(), this.viewMonth()));

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private panelEl: HTMLDivElement | null = null;
  private readonly onScrollCapture = (event: Event): void => {
    if (!this.open()) {
      return;
    }
    // Ignore scrolls inside the panel (year list) so picking stays usable.
    const target = event.target as Node | null;
    if (target && this.panelEl?.contains(target)) {
      return;
    }
    this.positionPanel();
  };

  readonly weekdayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  readonly monthLabels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onScrollCapture, true);
    this.destroyPanel();
  }

  writeValue(value: string | null): void {
    const next = value ?? '';
    this.value.set(next);
    const d = parseIsoDate(next);
    if (d) {
      this.viewYear.set(d.getFullYear());
      this.viewMonth.set(d.getMonth());
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  toggle(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.isDisabled()) {
      return;
    }
    if (this.open()) {
      this.close();
      return;
    }
    const d = parseIsoDate(this.value()) ?? new Date();
    this.viewYear.set(d.getFullYear());
    this.viewMonth.set(d.getMonth());
    this.panelMode.set('days');
    this.openPanel();
    this.onTouched();
  }

  prevMonth(event?: Event): void {
    event?.stopPropagation();
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update((y) => y - 1);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
    this.renderPanel();
  }

  nextMonth(event?: Event): void {
    event?.stopPropagation();
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update((y) => y + 1);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
    this.renderPanel();
  }

  pickDay(iso: string, disabled: boolean, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (disabled || this.isDisabled()) {
      return;
    }
    this.value.set(iso);
    this.onChange(iso);
    this.close();
    this.onTouched();
  }

  clear(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.isDisabled()) {
      return;
    }
    this.value.set('');
    this.onChange('');
    this.close();
    this.onTouched();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: Event): void {
    if (!this.open()) {
      return;
    }
    const target = event.target as Node | null;
    const inTrigger = !!(target && this.host.nativeElement.contains(target));
    const inPanel = !!(target && this.panelEl?.contains(target));
    if (!inTrigger && !inPanel) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.close();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.open()) {
      this.positionPanel();
    }
  }

  private openPanel(): void {
    this.open.set(true);
    this.ensurePanel();
    this.renderPanel();
    document.addEventListener('scroll', this.onScrollCapture, true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.positionPanel());
    });
  }

  private close(): void {
    this.open.set(false);
    this.panelMode.set('days');
    document.removeEventListener('scroll', this.onScrollCapture, true);
    this.destroyPanel();
  }

  private ensurePanel(): void {
    if (this.panelEl) {
      return;
    }
    const panel = document.createElement('div');
    panel.className = 'app-date-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Choose date');
    panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.appendChild(panel);
    this.panelEl = panel;
  }

  private destroyPanel(): void {
    this.panelEl?.remove();
    this.panelEl = null;
  }

  private renderPanel(): void {
    const panel = this.panelEl;
    if (!panel) {
      return;
    }
    panel.replaceChildren();
    const mode = this.panelMode();
    if (mode === 'years') {
      this.renderYears(panel);
      return;
    }
    if (mode === 'months') {
      this.renderMonths(panel);
      return;
    }
    this.renderDays(panel);
  }

  private renderDays(panel: HTMLDivElement): void {
    panel.appendChild(this.buildDayHead());
    const dow = document.createElement('div');
    dow.className = 'app-date-dow';
    for (const label of this.weekdayLabels) {
      const span = document.createElement('span');
      span.textContent = label;
      dow.appendChild(span);
    }
    panel.appendChild(dow);

    const grid = document.createElement('div');
    grid.className = 'app-date-grid';
    const selected = this.value();
    const todayIso = toIsoDate(new Date());

    for (const cell of this.weeks().flat()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'app-date-day';
      if (!cell.inMonth) {
        btn.classList.add('muted');
      }
      if (cell.iso === selected) {
        btn.classList.add('selected');
      }
      if (cell.iso === todayIso) {
        btn.classList.add('today');
      }
      const disabled = this.isOutOfRange(cell.iso);
      if (disabled) {
        btn.classList.add('disabled');
        btn.disabled = true;
      }
      btn.textContent = String(cell.day);
      btn.addEventListener('click', (e) => this.pickDay(cell.iso, disabled, e));
      grid.appendChild(btn);
    }
    panel.appendChild(grid);

    const foot = document.createElement('div');
    foot.className = 'app-date-foot';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'app-date-clear';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', (e) => this.clear(e));
    const todayBtn = document.createElement('button');
    todayBtn.type = 'button';
    todayBtn.className = 'app-date-today';
    todayBtn.textContent = 'Today';
    todayBtn.addEventListener('click', (e) => this.pickDay(todayIso, this.isOutOfRange(todayIso), e));
    foot.append(clearBtn, todayBtn);
    panel.appendChild(foot);
  }

  /** Prev / Month / Year / Next — month & year open their own pickers. */
  private buildDayHead(): HTMLDivElement {
    const head = document.createElement('div');
    head.className = 'app-date-head app-date-head-split';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'app-date-nav';
    prev.setAttribute('aria-label', 'Previous month');
    prev.textContent = '‹';
    prev.addEventListener('click', (e) => this.prevMonth(e));

    const monthBtn = document.createElement('button');
    monthBtn.type = 'button';
    monthBtn.className = 'app-date-pick-btn';
    monthBtn.setAttribute('aria-label', 'Choose month');
    const monthName = new Date(this.viewYear(), this.viewMonth(), 1).toLocaleDateString(undefined, {
      month: 'short'
    });
    monthBtn.innerHTML = `<span>${monthName}</span><span class="app-date-caret" aria-hidden="true">▾</span>`;
    monthBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.panelMode.set('months');
      this.renderPanel();
    });

    const yearBtn = document.createElement('button');
    yearBtn.type = 'button';
    yearBtn.className = 'app-date-pick-btn';
    yearBtn.setAttribute('aria-label', 'Choose year');
    yearBtn.innerHTML = `<span>${this.viewYear()}</span><span class="app-date-caret" aria-hidden="true">▾</span>`;
    yearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.panelMode.set('years');
      this.renderPanel();
    });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'app-date-nav';
    next.setAttribute('aria-label', 'Next month');
    next.textContent = '›';
    next.addEventListener('click', (e) => this.nextMonth(e));

    const picks = document.createElement('div');
    picks.className = 'app-date-picks';
    picks.append(monthBtn, yearBtn);

    head.append(prev, picks, next);
    return head;
  }

  private renderMonths(panel: HTMLDivElement): void {
    const head = document.createElement('div');
    head.className = 'app-date-head';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'app-date-nav';
    back.setAttribute('aria-label', 'Back to calendar');
    back.textContent = '‹';
    back.addEventListener('click', (e) => {
      e.stopPropagation();
      this.panelMode.set('days');
      this.renderPanel();
    });

    const title = document.createElement('strong');
    title.className = 'app-date-title static';
    title.textContent = 'Month';

    const spacer = document.createElement('span');
    spacer.className = 'app-date-nav-spacer';

    head.append(back, title, spacer);
    panel.appendChild(head);

    const hint = document.createElement('p');
    hint.className = 'app-date-hint';
    hint.textContent = 'All 12 months';
    panel.appendChild(hint);

    const grid = document.createElement('div');
    grid.className = 'app-date-grid app-date-grid-months';
    const selectedMonth = this.viewMonth();
    for (let m = 0; m < 12; m++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'app-date-chip';
      if (m === selectedMonth) {
        btn.classList.add('selected');
      }
      btn.textContent = this.monthLabels[m];
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.viewMonth.set(m);
        this.panelMode.set('days');
        this.renderPanel();
      });
      grid.appendChild(btn);
    }
    panel.appendChild(grid);
  }

  private renderYears(panel: HTMLDivElement): void {
    const head = document.createElement('div');
    head.className = 'app-date-head';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'app-date-nav';
    back.setAttribute('aria-label', 'Back to calendar');
    back.textContent = '‹';
    back.addEventListener('click', (e) => {
      e.stopPropagation();
      this.panelMode.set('days');
      this.renderPanel();
    });

    const title = document.createElement('strong');
    title.className = 'app-date-title static';
    title.textContent = 'Year';

    const spacer = document.createElement('span');
    spacer.className = 'app-date-nav-spacer';

    head.append(back, title, spacer);
    panel.appendChild(head);

    const hint = document.createElement('p');
    hint.className = 'app-date-hint';
    hint.textContent = 'Scroll to find your year';
    panel.appendChild(hint);

    const thisYear = new Date().getFullYear();
    const minY = this.boundYear('min') ?? thisYear - 100;
    const maxY = this.boundYear('max') ?? thisYear;
    const selectedYear = Math.min(maxY, Math.max(minY, this.viewYear()));

    const scroll = document.createElement('div');
    scroll.className = 'app-date-year-scroll';
    scroll.setAttribute('role', 'listbox');
    scroll.setAttribute('aria-label', 'Years');

    let selectedBtn: HTMLButtonElement | null = null;
    for (let y = maxY; y >= minY; y--) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'app-date-year-row';
      btn.setAttribute('role', 'option');
      if (y === selectedYear) {
        btn.classList.add('selected');
        btn.setAttribute('aria-selected', 'true');
        selectedBtn = btn;
      }
      if (y === thisYear) {
        btn.classList.add('today');
      }
      btn.textContent = String(y);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.viewYear.set(y);
        this.panelMode.set('days');
        this.renderPanel();
      });
      scroll.appendChild(btn);
    }
    panel.appendChild(scroll);

    requestAnimationFrame(() => {
      selectedBtn?.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
  }

  private boundYear(kind: 'min' | 'max'): number | null {
    const raw = kind === 'min' ? this.min() : this.max();
    if (!raw) {
      return null;
    }
    const d = parseIsoDate(raw);
    return d ? d.getFullYear() : null;
  }

  private isOutOfRange(iso: string): boolean {
    const min = this.min();
    const max = this.max();
    if (min && iso < min) {
      return true;
    }
    if (max && iso > max) {
      return true;
    }
    return false;
  }

  private positionPanel(): void {
    const panel = this.panelEl;
    const trigger = this.host.nativeElement.querySelector('.trigger') as HTMLElement | null;
    if (!panel || !trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const pad = 8;
    const width = Math.min(320, Math.max(280, rect.width), window.innerWidth - pad * 2);
    const left = Math.min(
      Math.max(pad, rect.left),
      Math.max(pad, window.innerWidth - width - pad)
    );
    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const spaceAbove = rect.top - pad;
    const openUp = spaceBelow < 320 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(480, openUp ? spaceAbove - 6 : spaceBelow - 6);

    panel.style.cssText = [
      'position:fixed',
      'z-index:10000',
      'box-sizing:border-box',
      `width:${width}px`,
      `max-width:${width}px`,
      'min-width:0',
      `left:${left}px`,
      `max-height:${Math.max(300, maxHeight)}px`,
      'overflow:auto',
      openUp
        ? `top:auto;bottom:${Math.max(pad, window.innerHeight - rect.top + 6)}px`
        : `bottom:auto;top:${rect.bottom + 6}px`
    ].join(';');
  }
}

interface CalCell {
  day: number;
  iso: string;
  inMonth: boolean;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildCalendarWeeks(year: number, month: number): CalCell[][] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  const weeks: CalCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: CalCell[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + i);
      row.push({
        day: cur.getDate(),
        iso: toIsoDate(cur),
        inMonth: cur.getMonth() === month
      });
    }
    weeks.push(row);
  }
  return weeks;
}
