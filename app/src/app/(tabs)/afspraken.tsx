// Afspraken: dit scherm wordt in een volgende bouwstap gemaakt.

import { Redirect } from 'expo-router';

import { ComingSoon } from '@/components/screen';
import { useAuth } from '@/lib/auth';
import { tabsFor } from '@/lib/tabs';

export default function Afspraken() {
  const { profile } = useAuth();
  // Alleen voor de rollen die deze tab in hun menubalk hebben.
  if (profile && !tabsFor[profile.role].includes('afspraken')) return <Redirect href="/" />;
  return <ComingSoon coming="Dit scherm volgt in een volgende bouwstap." intro="Je afspraken, geweest en komend." title="Afspraken" />;
}
