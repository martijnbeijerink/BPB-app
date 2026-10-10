// Welke tabs iemand ziet, en in welke volgorde.
// De cliënt heeft "Voor mij", de begeleider "Cliënten". De beheerder werkt in
// de webomgeving en ziet in de app alleen de bibliotheek en het profiel.

import type { IconName } from '@/components/icon';

import type { Role } from './auth';

export type TabName = 'bibliotheek' | 'voor-mij' | 'clienten' | 'afspraken' | 'berichten' | 'profiel';

export const tabInfo: Record<TabName, { label: string; icon: IconName }> = {
  bibliotheek: { label: 'Bibliotheek', icon: 'book' },
  'voor-mij': { label: 'Voor mij', icon: 'mark' },
  clienten: { label: 'Cliënten', icon: 'people' },
  afspraken: { label: 'Afspraken', icon: 'calendar' },
  berichten: { label: 'Berichten', icon: 'message' },
  profiel: { label: 'Profiel', icon: 'person' },
};

export const tabsFor: Record<Role, TabName[]> = {
  client: ['bibliotheek', 'voor-mij', 'afspraken', 'berichten', 'profiel'],
  coach: ['clienten', 'bibliotheek', 'afspraken', 'berichten', 'profiel'],
  admin: ['bibliotheek', 'profiel'],
};

/** Het scherm waar iemand na het inloggen op uitkomt. */
export const startTab = (role: Role): TabName => tabsFor[role][0];
