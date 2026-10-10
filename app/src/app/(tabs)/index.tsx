// Na het inloggen door naar het eerste scherm van de rol:
// de cliënt naar de bibliotheek, de begeleider naar de cliënten.

import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { startTab } from '@/lib/tabs';

const paths = {
  bibliotheek: '/bibliotheek',
  'voor-mij': '/voor-mij',
  clienten: '/clienten',
  afspraken: '/afspraken',
  berichten: '/berichten',
  profiel: '/profiel',
} as const;

export default function Start() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <Redirect href={paths[startTab(profile.role)]} />;
}
