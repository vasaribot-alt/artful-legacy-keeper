import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.globalartistregistry.artfullegacykeeper',
  appName: 'Artful Legacy Keeper',
  webDir: 'dist',
  server: {
    url: 'https://8585a995-9d51-467b-a3cf-2d93bcfb0473.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
