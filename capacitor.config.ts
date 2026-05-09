import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.globalartistregistry.artfullegacykeeper',
  appName: 'Artful Legacy Keeper',
  webDir: 'dist',
  server: {
    url: 'https://globalartistregistry.org',
    cleartext: true,
  },
};

export default config;
