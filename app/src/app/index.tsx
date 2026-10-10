// Eerste scherm na het inloggen.
// In deze stap toont het wie er is ingelogd en leest het de gedeelde
// bibliotheek uit de database. Dat bewijst dat inloggen en de toegangsregels
// samen werken. De echte schermen (Bibliotheek, Voor mij, Berichten) volgen
// in de volgende stappen.

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Notice, Title } from '@/components/ui';
import { useAuth, type Role } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

type LibraryItem = { id: string; title: string; theme: string; kind: 'video' | 'document' };

const roleName: Record<Role, string> = { client: 'Cliënt', coach: 'Begeleider', admin: 'Beheerder' };
const kindName = { video: 'Filmpje', document: 'Document' } as const;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default function Start() {
  const { profile, signOut } = useAuth();
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const active = profile?.status === 'active';

  useEffect(() => {
    if (!supabase || !active) return;
    let current = true;
    supabase
      .from('library_items')
      .select('id, title, theme, kind')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!current) return;
        setFailed(!!error);
        setItems((data as LibraryItem[] | null) ?? []);
      });
    return () => {
      current = false;
    };
  }, [active]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Title>{profile?.full_name ? `Hallo ${profile.full_name.split(' ')[0]}` : 'Hallo'}</Title>
          {profile ? <Body muted>Ingelogd als {roleName[profile.role].toLowerCase()}</Body> : null}
        </View>

        {profile && !active ? (
          <Notice tone="error">
            {profile.status === 'invited'
              ? 'Je account is nog niet actief. Neem contact op met Burnout Preventie & Begeleiding.'
              : 'Je account is afgesloten. Neem contact op met Burnout Preventie & Begeleiding als dat niet klopt.'}
          </Notice>
        ) : null}

        {active ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Bibliotheek
            </Text>
            {failed ? <Notice tone="error">De bibliotheek kon niet worden opgehaald. Controleer je verbinding.</Notice> : null}
            {items === null && !failed ? <Body muted>Bezig met ophalen…</Body> : null}
            {items?.length === 0 && !failed ? <Body muted>De bibliotheek is nog leeg.</Body> : null}
            {items?.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>
                  {kindName[item.kind]} · {capitalize(item.theme)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.foot}>
          <Button label="Uitloggen" onPress={signOut} variant="ghost" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  content: { flexGrow: 1, gap: 20, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28, width: '100%', maxWidth: 480, alignSelf: 'center' },
  head: { gap: 6 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  row: { gap: 3, padding: 14, borderRadius: 18, backgroundColor: colors.surface },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.ink },
  rowMeta: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
  foot: { flexGrow: 1, justifyContent: 'flex-end' },
});
