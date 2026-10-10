// Een tab met meerdere schermen achter elkaar (lijst → pagina → …).
// Wie de tab niet in zijn menubalk heeft, wordt teruggestuurd.

import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { tabsFor, type TabName } from '@/lib/tabs';
import { colors } from '@/lib/theme';

export function TabStack({ tab }: { tab: TabName }) {
  const { profile } = useAuth();
  if (profile && !tabsFor[profile.role].includes(tab)) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }} />;
}
