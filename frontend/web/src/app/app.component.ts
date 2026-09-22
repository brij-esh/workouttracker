import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { APP_BRAND } from './core/app-brand';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: [':host { display: block; height: 100%; min-height: 100%; }']
})
export class AppComponent {
  /** Eagerly apply saved theme on boot. */
  private readonly theme = inject(ThemeService);

  constructor() {
    document.title = APP_BRAND.name;
  }
}
