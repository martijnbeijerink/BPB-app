// Het geraamte van de app: lettertypes laden, kijken wie er is ingelogd en
// daarna het juiste scherm tonen. Wie niet is ingelogd, komt alleen bij het
// inlogscherm.

import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, useFonts } from '@expo-google-fonts/figtree';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function Screens() {
  const { ready, session } = useAuth();
  const [fontsLoaded, fontError] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold });
  const done = ready && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (done) SplashScreen.hideAsync();
  }, [done]);

  if (!done) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="inloggen" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Screens />
    </AuthProvider>
  );
}
