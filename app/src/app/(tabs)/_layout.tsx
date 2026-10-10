// De app na het inloggen: vijf tabs met de menubalk onderin.
// Welke tabs iemand ziet, hangt af van de rol (zie src/lib/tabs.ts).
// Zolang het profiel er nog niet is, of het account niet actief is, toont dit
// bestand een melding in plaats van de tabs.

import { Tabs } from 'expo-router/js-tabs';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabBar } from '@/components/tab-bar';
import { Body, Button, Notice, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const { profile, profileLoading, reloadProfile, signOut } = useAuth();

  if (!profile) {
    return (
      <SafeAreaView style={styles.center}>
        {profileLoading ? (
          <ActivityIndicator accessibilityLabel="Bezig met laden" color={colors.ink} size="large" />
        ) : (
          <View style={styles.box}>
            <Title>Geen verbinding</Title>
            <Body muted>Je gegevens konden niet worden opgehaald. Controleer je internet en probeer het opnieuw.</Body>
            <Button label="Opnieuw proberen" onPress={reloadProfile} />
            <Button label="Uitloggen" onPress={signOut} variant="ghost" />
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (profile.status !== 'active') {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.box}>
          <Title>{profile.status === 'invited' ? 'Nog niet actief' : 'Account afgesloten'}</Title>
          <Notice tone="error">
            {profile.status === 'invited'
              ? 'Je account is nog niet actief. Neem contact op met Burnout Preventie & Begeleiding.'
              : 'Je account is afgesloten. Neem contact op met Burnout Preventie & Begeleiding als dat niet klopt.'}
          </Notice>
          <Button label="Uitloggen" onPress={signOut} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.ground } }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="bibliotheek" options={{ title: 'Bibliotheek' }} />
      <Tabs.Screen name="voor-mij" options={{ title: 'Voor mij' }} />
      <Tabs.Screen name="clienten" options={{ title: 'Cliënten' }} />
      <Tabs.Screen name="afspraken" options={{ title: 'Afspraken' }} />
      <Tabs.Screen name="berichten" options={{ title: 'Berichten' }} />
      <Tabs.Screen name="profiel" options={{ title: 'Profiel' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, backgroundColor: colors.ground },
  box: { gap: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
