// Een item uit de gedeelde bibliotheek aanraden aan één cliënt. Het item
// komt dan ook op de persoonlijke pagina van de cliënt te staan.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { BackLink, partStyles } from '@/components/parts';
import { Screen, screenStyles } from '@/components/screen';
import { Body, Button, Notice, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { recommendLibraryItem } from '@/lib/data';
import { firstName } from '@/lib/format';
import { capitalize, filterLibrary, kindName, type LibraryItem } from '@/lib/library';
import { useAssignment, useOverview } from '@/lib/overview';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

export default function Aanraden() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { refresh } = useOverview();
  const assignment = useAssignment(id);
  const [library, setLibrary] = useState<LibraryItem[] | null>(null);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let current = true;
    supabase
      .from('library_items')
      .select('id, title, description, theme, kind')
      .order('title')
      .then(({ data, error }) => {
        if (!current) return;
        if (error) setProblem('De bibliotheek kon niet worden opgehaald. Controleer je verbinding.');
        else setLibrary((data as LibraryItem[] | null) ?? []);
      });
    return () => {
      current = false;
    };
  }, []);

  const name = assignment ? firstName(assignment.client_name) : 'de cliënt';
  const shown = filterLibrary(library ?? [], null, query);

  const recommend = async () => {
    if (!assignment || !profile) return;
    if (!chosen) {
      setProblem('Kies eerst een item uit de lijst.');
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      await recommendLibraryItem(assignment.assignment_id, profile.id, chosen);
      refresh();
      router.back();
    } catch {
      setProblem('Het aanraden is niet gelukt. Controleer je verbinding en probeer het opnieuw.');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackLink label={name} onPress={() => router.back()} />
      <View style={screenStyles.head}>
        <Title>Aanraden aan {name}</Title>
        <Body muted>Kies een item uit de bibliotheek. Het komt op de persoonlijke pagina van {name} te staan.</Body>
      </View>

      <View style={styles.search}>
        <Icon color={colors.ink2} name="search" size={20} />
        <TextInput
          accessibilityLabel="Zoek op titel"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Zoek op titel"
          placeholderTextColor={colors.ink2}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
      </View>

      {library === null && !problem ? <Body muted>Bezig met ophalen…</Body> : null}
      {library !== null && shown.length === 0 ? <Body muted>{query.trim() ? 'Geen items gevonden.' : 'De bibliotheek is nog leeg.'}</Body> : null}

      {shown.length > 0 ? (
        <View accessibilityRole="radiogroup" style={partStyles.list}>
          {shown.map((item, index) => {
            const selected = chosen === item.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={item.id}
                onPress={() => {
                  setChosen(item.id);
                  setProblem(null);
                }}
                style={({ pressed }) => [styles.row, index > 0 && partStyles.listRowBorder, pressed && partStyles.pressed]}>
                <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                <View style={partStyles.rowText}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={partStyles.rowMeta}>
                    {kindName[item.kind]} · {capitalize(item.theme)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {problem ? <Notice tone="error">{problem}</Notice> : null}
      <Button busy={busy} label={`Aanraden aan ${name}`} onPress={recommend} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 12, paddingHorizontal: 16 },
  radio: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.lineStrong },
  radioSelected: { borderColor: colors.ink },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.ink },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.ink },
});
