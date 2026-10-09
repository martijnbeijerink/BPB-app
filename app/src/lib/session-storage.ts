// Waar de inlogsessie op het toestel wordt bewaard.
// Op de telefoon: de beveiligde opslag van het toestel.
// In de webbrowser (alleen voor ontwikkelen): de opslag van de browser.

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { chunked, type KeyValueStore } from './chunked-storage';

const secureStore: KeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const browserStore: KeyValueStore = {
  async getItem(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // geen opslag beschikbaar: de sessie geldt dan alleen tot het herladen
    }
  },
  async removeItem(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // niets te verwijderen
    }
  },
};

export const sessionStorage: KeyValueStore = Platform.OS === 'web' ? browserStore : chunked(secureStore);
