// Inlogscherm. Een account bestaat alleen op uitnodiging; zelf registreren
// kan niet.

import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Field, Notice, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function Inloggen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Vul je e-mailadres en wachtwoord in.');
      return;
    }
    setBusy(true);
    setError(null);
    const problem = await signIn(email, password);
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image accessibilityLabel="Burnout Preventie & Begeleiding" contentFit="contain" source={require('@/assets/images/logo.png')} style={styles.logo} />
          <View style={styles.head}>
            <Title>Welkom terug</Title>
            <Body muted>Log in met het account uit je uitnodiging.</Body>
          </View>

          {isConfigured ? (
            <View style={styles.form}>
              <Field
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                inputMode="email"
                label="E-mailadres"
                onChangeText={setEmail}
                placeholder="naam@voorbeeld.nl"
                value={email}
              />
              <Field autoComplete="current-password" label="Wachtwoord" onChangeText={setPassword} onSubmitEditing={submit} secureTextEntry value={password} />
              {error ? <Notice tone="error">{error}</Notice> : null}
              <Button busy={busy} label="Inloggen" onPress={submit} />
            </View>
          ) : (
            <Notice tone="error">
              De app is nog niet aan Supabase gekoppeld. Zet het adres en de publieke sleutel van het project in het bestand .env.local en start de app opnieuw. De
              README in de hoofdmap legt uit hoe.
            </Notice>
          )}

          <View style={styles.foot}>
            <Notice>Nog geen account? Je krijgt een uitnodiging per e-mail van Burnout Preventie &amp; Begeleiding. Zelf registreren kan niet.</Notice>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  content: { flexGrow: 1, gap: 28, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 28, width: '100%', maxWidth: 480, alignSelf: 'center' },
  logo: { width: 86, height: 96 },
  head: { gap: 8 },
  form: { gap: 16 },
  foot: { flexGrow: 1, justifyContent: 'flex-end' },
});
