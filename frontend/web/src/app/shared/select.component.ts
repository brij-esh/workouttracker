import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AppSelectOption } from './select.types';

export type { AppSelectOption };

@Component({
  selector: 'app-select',
  standalone: true,
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly options = input<AppSelectOption[]>([]);
  readonly placeholder = input('Select…');
  readonly ariaLabel = input<string | null>(null);
  readonly disabledInput = input(false, { alias: 'disabled' });

  readonly valueChange = output<string>();

  readonly open = signal(false);
  private readonly cvaDisabled = signal(false);
  readonly value = signal<string>('');

  readonly isDisabled = computed(() => this.disabledInput() || this.cvaDisabled());

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private menuEl: HTMLUListElement | null = null;
  private readonly onScrollCapture = (): void => {
    if (this.open()) {
      this.positionMenu();
    }
  };

  readonly selectedLabel = computed(() => {
    const current = this.value();
    const match = this.options().find((o) => o.value === current);
    if (match) {
      return match.label;
    }
    if (current === '' || current == null) {
      return this.placeholder();
    }
    return String(current);
  });

  readonly showingPlaceholder = computed(() => {
    const current = this.value();
    return !this.options().some((o) => o.value === current);
  });

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onScrollCapture, true);
    this.destroyMenu();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
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
    this.openMenu();
    this.onTouched();
  }

  pick(option: AppSelectOption, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.isDisabled()) {
      return;
    }
    this.value.set(option.value);
    this.onChange(option.value);
    this.valueChange.emit(option.value);
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
    const inMenu = !!(target && this.menuEl?.contains(target));
    if (!inTrigger && !inMenu) {
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
  @HostListener('window:scroll')
  onReposition(): void {
    if (this.open()) {
      this.positionMenu();
    }
  }

  private openMenu(): void {
    this.open.set(true);
    this.ensureMenu();
    this.renderOptions();
    document.addEventListener('scroll', this.onScrollCapture, true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.positionMenu());
    });
  }

  private close(): void {
    this.open.set(false);
    document.removeEventListener('scroll', this.onScrollCapture, true);
    this.destroyMenu();
  }

  private ensureMenu(): void {
    if (this.menuEl) {
      return;
    }
    const menu = document.createElement('ul');
    menu.className = 'app-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.appendChild(menu);
    this.menuEl = menu;
  }

  private destroyMenu(): void {
    this.menuEl?.remove();
    this.menuEl = null;
  }

  private renderOptions(): void {
    const menu = this.menuEl;
    if (!menu) {
      return;
    }
    menu.replaceChildren();
    const opts = this.options();
    if (!opts.length) {
      const empty = document.createElement('li');
      empty.className = 'app-select-empty';
      empty.textContent = 'No options';
      menu.appendChild(empty);
      return;
    }

    const current = this.value();
    for (const opt of opts) {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(opt.value === current));

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'app-select-option' + (opt.value === current ? ' active' : '');
      btn.textContent = opt.label;
      btn.addEventListener('click', (e) => this.pick(opt, e));

      li.appendChild(btn);
      menu.appendChild(li);
    }
  }

  private positionMenu(): void {
    const menu = this.menuEl;
    const trigger = this.host.nativeElement.querySelector('.trigger') as HTMLElement | null;
    if (!menu || !trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const pad = 8;
    const width = Math.max(120, Math.min(rect.width, window.innerWidth - pad * 2));
    const left = Math.min(
      Math.max(pad, rect.left),
      Math.max(pad, window.innerWidth - width - pad)
    );

    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const spaceAbove = rect.top - pad;
    const idealMax = Math.min(280, window.innerHeight * 0.5);
    const openUp = spaceBelow < 168 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(128, Math.min(idealMax, openUp ? spaceAbove - 6 : spaceBelow - 6));

    menu.style.cssText = [
      'position:fixed',
      'z-index:10000',
      'box-sizing:border-box',
      `width:${width}px`,
      `max-width:${width}px`,
      'min-width:0',
      `left:${left}px`,
      `max-height:${maxHeight}px`,
      'overflow-x:hidden',
      'overflow-y:auto',
      openUp
        ? `top:auto;bottom:${Math.max(pad, window.innerHeight - rect.top + 6)}px`
        : `bottom:auto;top:${rect.bottom + 6}px`
    ].join(';');
  }
}
