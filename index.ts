// Polyfill for Supabase + Hermes compatibility
// PublicKeyCredential is a browser API not present in React Native
if (typeof (global as any).PublicKeyCredential === 'undefined') {
  (global as any).PublicKeyCredential = null;
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
