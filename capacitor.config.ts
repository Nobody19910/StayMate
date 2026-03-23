import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.staymate.app',
  appName: 'StayMate',
  webDir: 'out',
  server: {
    url: 'https://staymate-eight.vercel.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidSplashResourceName: 'splash',
      showSpinner: false,
      backgroundColor: '#000000',
    },
  },
  ios: {
    scheme: 'StayMate',
    preferredContentMode: 'mobile',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    // Enable 120Hz high refresh rate rendering
    webContentsDebuggingEnabled: false,
  },
};

export default config;
