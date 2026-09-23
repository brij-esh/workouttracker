import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.repwise.app',
  appName: 'Repwise',
  webDir: 'dist/web/browser',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0b100d'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b100d'
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_default',
      iconColor: '#b4ff39'
    },
    FirebaseAuthentication: {
      // Keep Firebase JS as source of truth; native layer only supplies Google tokens.
      skipNativeAuth: true,
      providers: ['google.com']
    }
  }
};

export default config;
