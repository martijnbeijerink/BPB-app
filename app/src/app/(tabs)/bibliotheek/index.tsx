// Gedeelde bibliotheek: alle filmpjes en documenten, te filteren op thema en
// te doorzoeken op titel. Iedereen met toegang ziet dezelfde lijst.

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { screenStyles } from '@/components/screen';
import { Body, Notice, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { capitalize, filterLibrary, kindName, themes, type LibraryItem } from '@/lib/library';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

export default function Bibliotheek() {
  const router = useRouter();
  const { profile } = useAuth();
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('library_items').select('id, title, description, theme, kind').order('created_at', { ascending: false });
    setFailed(error !== null);
    if (!error) setItems((data as LibraryItem[] | null) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const shown = filterLibrary(items ?? [], theme, query);
  const filtering = theme !== null || query.trim() !== '';

  const header = (
    <View style={styles.header}>
      <View style={screenStyles.head}>
        <Title>Bibliotheek</Title>
        {profile && profile.role !== 'client' ? <Body muted>Alle cliënten zien wat hier staat.</Body> : null}
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
      <View style={styles.chips}>
        <Chip label="Alles" onPress={() => setTheme(null)} selected={theme === null} />
        {themes.map((name) => (
          <Chip key={name} label={capitalize(name)} onPress={() => setTheme(name)} selected={theme === name} />
        ))}
      </View>
      {failed ? <Notice tone="error">De bibliotheek kon niet worden opgehaald. Trek het scherm omlaag om het opnieuw te proberen.</Notice> : null}
    </View>
  );

  const empty =
    items === null ? (
      failed ? null : (
        <Body muted>Bezig met ophalen…</Body>
      )
    ) : (
      <Body muted>{filtering ? 'Geen items gevonden.' : 'De bibliotheek is nog leeg.'}</Body>
    );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <FlatList
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={empty}
        ListHeaderComponent={header}
        contentContainerStyle={screenStyles.content}
        data={shown}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={colors.ink} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityHint="Opent dit item"
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/bibliotheek/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={[styles.thumb, item.kind === 'video' ? styles.thumbVideo : styles.thumbDocument]}>
              {item.kind === 'video' ? <Icon color={colors.accent} filled name="play" /> : <Icon name="file" />}
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowMeta}>
                {kindName[item.kind]} · {capitalize(item.theme)}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: 16, paddingBottom: 6 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 22, backgroundColor: colors.surface },
  chipSelected: { borderColor: colors.ink, backgroundColor: colors.ink },
  chipLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  chipLabelSelected: { fontFamily: fonts.semibold, color: colors.onInk },
  separator: { height: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: 18, backgroundColor: colors.surface },
  pressed: { opacity: 0.75 },
  thumb: { width: 76, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  thumbVideo: { backgroundColor: colors.ink },
  thumbDocument: { backgroundColor: colors.calm },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.ink },
  rowMeta: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
});
