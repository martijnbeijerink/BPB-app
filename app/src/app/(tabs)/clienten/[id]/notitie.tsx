// Een notitie schrijven voor één cliënt. De notitie komt op de persoonlijke
// pagina van de cliënt te staan.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { BackLink } from '@/components/parts';
import { Screen, screenStyles } from '@/components/screen';
import { Body, Button, Notice, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { shareNote } from '@/lib/data';
import { firstName } from '@/lib/format';
import { useAssignment, useOverview } from '@/lib/overview';
import { colors, fonts } from '@/lib/theme';

export default function Notitie() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { refresh } = useOverview();
  const assignment = useAssignment(id);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const name = assignment ? firstName(assignment.client_name) : 'de cliënt';

  const share = async () => {
    if (!assignment || !profile) return;
    if (text.trim() === '') {
      setProblem('Schrijf eerst een notitie.');
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      await shareNote(assignment.assignment_id, profile.id, text.trim());
      refresh();
      router.back();
    } catch {
      setProblem('De notitie is niet gedeeld. Controleer je verbinding en probeer het opnieuw.');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackLink label={name} onPress={() => router.back()} />
      <View style={screenStyles.head}>
        <Title>Notitie voor {name}</Title>
        <Body muted>Alleen jij en {name} zien deze notitie.</Body>
      </View>
      <TextInput
        accessibilityLabel="Notitie"
        maxLength={4000}
        multiline
        onChangeText={(value) => {
          setText(value);
          setProblem(null);
        }}
        placeholder="Schrijf hier je notitie"
        placeholderTextColor={colors.ink2}
        style={styles.input}
        textAlignVertical="top"
        value={text}
      />
      {problem ? <Notice tone="error">{problem}</Notice> : null}
      <Button busy={busy} label={`Delen met ${name}`} onPress={share} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 180,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
});
