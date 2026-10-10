// De bibliotheek heeft twee schermen: de lijst en één item.

import { Stack } from 'expo-router';

import { colors } from '@/lib/theme';

export default function BibliotheekLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }} />;
}
