// Mijn cliënten: dit scherm wordt in een volgende bouwstap gemaakt.

import { Redirect } from 'expo-router';

import { ComingSoon } from '@/components/screen';
import { useAuth } from '@/lib/auth';
import { tabsFor } from '@/lib/tabs';

export default function Clienten() {
  const { profile } = useAuth();
  // Alleen voor de rollen die deze tab in hun menubalk hebben.
  if (profile && !tabsFor[profile.role].includes('clienten')) return <Redirect href="/" />;
  return <ComingSoon coming="Dit scherm volgt in de volgende bouwstap. Je ziet hier straks je cliënten en kunt per cliënt iets persoonlijk delen." intro="De cliënten die voor jouw discipline aan jou gekoppeld zijn." title="Mijn cliënten" />;
}
