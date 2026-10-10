// Voor mij: dit scherm wordt in een volgende bouwstap gemaakt.

import { Redirect } from 'expo-router';

import { ComingSoon } from '@/components/screen';
import { useAuth } from '@/lib/auth';
import { tabsFor } from '@/lib/tabs';

export default function VoorMij() {
  const { profile } = useAuth();
  // Alleen voor de rollen die deze tab in hun menubalk hebben.
  if (profile && !tabsFor[profile.role].includes('voor-mij')) return <Redirect href="/" />;
  return <ComingSoon coming="Dit scherm volgt in de volgende bouwstap. Je ziet hier straks per discipline een pagina met filmpjes, documenten en notities van je begeleider." intro="Wat je begeleiders persoonlijk met je delen, per discipline." title="Voor mij" />;
}
