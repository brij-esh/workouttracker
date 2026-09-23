import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AndroidBackButtonService } from './android-back-button.service';

/**
 * Thin native bridge helpers. Expand as we adopt Capacitor plugins
 * (local notifications, haptics, health, etc.).
 */
@Injectable({ providedIn: 'root' })
export class NativePlatformService {
  readonly platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  readonly isNative = Capacitor.isNativePlatform();
  private readonly androidBack = inject(AndroidBackButtonService);

  async init(): Promise<void> {
    if (!this.isNative) {
      return;
    }
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark });
      if (this.platform === 'android') {
        await StatusBar.setBackgroundColor({ color: '#0b100d' });
      }
    } catch {
      /* plugin optional in web preview */
    }
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide();
    } catch {
      /* ignore */
    }
    try {
      const { Keyboard } = await import('@capacitor/keyboard');
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
    } catch {
      /* ignore — iOS only / unsupported */
    }
    await this.androidBack.init();
  }
}
