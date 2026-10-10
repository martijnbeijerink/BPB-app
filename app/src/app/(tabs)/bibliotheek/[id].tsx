// Eén item uit de bibliotheek.
// Afspelen en openen volgt zodra de videodienst en de bestandsopslag zijn
// gekoppeld; tot dan toont dit scherm de titel en de omschrijving.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen, screenStyles } from '@/components/screen';
import { Body, Notice, Title } from '@/components/ui';
import { capitalize, kindName, type LibraryItem } from '@/lib/library';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

export default function BibliotheekItem() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading');

  useEffect(() => {
    if (!supabase || !id) return;
    let current = true;
    supabase
      .from('library_items')
      .select('id, title, description, theme, kind')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!current) return;
        setItem((data as LibraryItem | null) ?? null);
        setState(error ? 'failed' : data ? 'ready' : 'missing');
      });
    return () => {
      current = false;
    };
  }, [id]);

  const video = item?.kind === 'video';

  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Icon name="left" size={22} strokeWidth={2} />
        <Text style={styles.backLabel}>Bibliotheek</Text>
      </Pressable>

      {state === 'loading' ? <Body muted>Bezig met ophalen…</Body> : null}
      {state === 'failed' ? <Notice tone="error">Dit item kon niet worden opgehaald. Controleer je verbinding.</Notice> : null}
      {state === 'missing' ? <Notice>Dit item bestaat niet meer.</Notice> : null}

      {item ? (
        <>
          <View style={[styles.media, video ? styles.mediaVideo : styles.mediaDocument]}>
            {video ? <Icon color={colors.accent} filled name="play" size={40} /> : <Icon name="file" size={40} />}
            <Text style={[styles.mediaText, video && styles.mediaTextVideo]}>
              {video ? 'Afspelen volgt zodra de videodienst is gekoppeld' : 'Openen volgt zodra de bestandsopslag is gekoppeld'}
            </Text>
          </View>
          <View style={screenStyles.head}>
            <Title>{item.title}</Title>
            <Body muted>
              {kindName[item.kind]} · {capitalize(item.theme)}
            </Body>
          </View>
          {item.description ? <Body>{item.description}</Body> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44, marginLeft: -6, paddingRight: 12 },
  backLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  media: { aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 18 },
  mediaVideo: { backgroundColor: colors.ink },
  mediaDocument: { backgroundColor: colors.calm },
  mediaText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', color: colors.ink },
  mediaTextVideo: { color: colors.onInk },
});
