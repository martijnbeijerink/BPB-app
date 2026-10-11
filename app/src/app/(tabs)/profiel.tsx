// Profiel: wie er is ingelogd, en uitloggen.

import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Screen, screenStyles } from '@/components/screen';
import { Body, Button, Title } from '@/components/ui';
import { useAuth, type Role } from '@/lib/auth';

const roleName: Record<Role, string> = { client: 'Cliënt', coach: 'Professional', admin: 'Casehouder' };

export default function Profiel() {
  const { profile, session, signOut } = useAuth();
  if (!profile) return null;

  return (
    <Screen>
      <View style={styles.who}>
        <Image accessibilityLabel="Burnout Preventie & Begeleiding" contentFit="contain" source={require('@/assets/images/logo.png')} style={styles.logo} />
        <View style={[screenStyles.head, styles.text]}>
          <Title>{profile.full_name || 'Profiel'}</Title>
          <Body muted>{roleName[profile.role]}</Body>
          {session?.user.email ? <Body muted>{session.user.email}</Body> : null}
        </View>
      </View>
      <View style={styles.foot}>
        <Button label="Uitloggen" onPress={signOut} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 50, height: 56 },
  text: { flex: 1 },
  foot: { flexGrow: 1, justifyContent: 'flex-end' },
});
