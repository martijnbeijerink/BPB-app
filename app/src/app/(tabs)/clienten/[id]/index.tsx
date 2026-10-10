// De pagina van één cliënt, voor de begeleider: iets delen, en teruglezen
// wat er al gedeeld is.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Avatar, BackLink, LockNote, SectionTitle, partStyles } from '@/components/parts';
import { PersonalItems } from '@/components/personal-items';
import { Screen } from '@/components/screen';
import { Body, Notice } from '@/components/ui';
import { firstName, initials } from '@/lib/format';
import { capitalize } from '@/lib/library';
import { useAssignment, useOverview } from '@/lib/overview';
import { colors, fonts } from '@/lib/theme';
import { usePersonalItems } from '@/lib/use-items';

export default function Client() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading } = useOverview();
  const assignment = useAssignment(id);
  const { items, failed, reload } = usePersonalItems(id, false);

  if (!assignment) {
    return (
      <Screen>
        <BackLink label="Cliënten" onPress={() => router.back()} />
        {loading ? <Body muted>Bezig met ophalen…</Body> : <Notice>Deze cliënt is niet (meer) aan jou gekoppeld.</Notice>}
      </Screen>
    );
  }

  const name = firstName(assignment.client_name);
  const params = { id: assignment.assignment_id };

  return (
    <Screen onRefresh={reload}>
      <BackLink label="Cliënten" onPress={() => router.back()} />

      <View style={styles.who}>
        <Avatar label={initials(assignment.client_name)} soft />
        <View style={partStyles.rowText}>
          <Text accessibilityRole="header" style={styles.name}>
            {assignment.client_name}
          </Text>
          <Text style={partStyles.rowMeta}>{capitalize(assignment.discipline)}</Text>
        </View>
      </View>

      {assignment.ended ? (
        <Notice>Dit traject is afgerond. Je kunt niets nieuws meer delen, maar alles nog wel teruglezen.</Notice>
      ) : (
        <>
          <SectionTitle>Delen met {name}</SectionTitle>
          <View style={styles.actions}>
            <Action icon="note" label="Notitie" onPress={() => router.push({ pathname: '/clienten/[id]/notitie', params })} />
            <Action icon="book" label="Uit de bibliotheek" onPress={() => router.push({ pathname: '/clienten/[id]/aanraden', params })} />
            <Action icon="message" label="Bericht" onPress={() => router.push({ pathname: '/berichten/[id]', params }, { withAnchor: true })} />
          </View>
          <Body muted>Een eigen filmpje of document delen volgt zodra de bestandsopslag is gekoppeld.</Body>
        </>
      )}

      <SectionTitle>Gedeeld met {name}</SectionTitle>
      {failed ? <Notice tone="error">Dit kon niet worden opgehaald. Trek het scherm omlaag om het opnieuw te proberen.</Notice> : null}
      {items === null ? (
        failed ? null : (
          <Body muted>Bezig met ophalen…</Body>
        )
      ) : (
        <PersonalItems
          emptyText={`Je hebt nog niets met ${name} gedeeld.`}
          items={items}
          onOpenLibraryItem={(itemId) => router.push({ pathname: '/bibliotheek/[id]', params: { id: itemId } }, { withAnchor: true })}
        />
      )}

      <LockNote>Alleen jij en {name} zien wat hier staat.</LockNote>
    </Screen>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress(): void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && partStyles.pressed]}>
      <Icon name={icon} size={22} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 29, color: colors.ink },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  actionLabel: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, textAlign: 'center', color: colors.ink },
});
