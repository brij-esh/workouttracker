import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular';
import { APP_BRAND } from './core/app-brand';
import { ThemeService } from './core/theme.service';
import { NativePlatformService } from './core/native-platform.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, RouterOutlet],
  template: `
    <ion-app>
      <router-outlet />
    </ion-app>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 100%;
      }
    `
  ]
})
export class AppComponent implements OnInit {
  /** Eagerly apply saved theme on boot. */
  private readonly theme = inject(ThemeService);
  private readonly native = inject(NativePlatformService);

  constructor() {
    document.title = APP_BRAND.name;
  }

  ngOnInit(): void {
    void this.native.init();
  }
}
