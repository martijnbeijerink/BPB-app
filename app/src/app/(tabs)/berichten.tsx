// Berichten: dit scherm wordt in een volgende bouwstap gemaakt.

import { Redirect } from 'expo-router';

import { ComingSoon } from '@/components/screen';
import { useAuth } from '@/lib/auth';
import { tabsFor } from '@/lib/tabs';

export default function Berichten() {
  const { profile } = useAuth();
  // Alleen voor de rollen die deze tab in hun menubalk hebben.
  if (profile && !tabsFor[profile.role].includes('berichten')) return <Redirect href="/" />;
  return <ComingSoon coming="Dit scherm volgt in de volgende bouwstap." intro="Eén gesprek per begeleider of cliënt." title="Berichten" />;
}
