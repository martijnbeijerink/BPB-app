// De pagina van één discipline: wie de begeleider is, en wat die persoonlijk
// met de cliënt heeft gedeeld. Nieuwste bovenaan.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, BackLink, LockNote, SectionTitle, partStyles } from '@/components/parts';
import { PersonalItems } from '@/components/personal-items';
import { Screen, screenStyles } from '@/components/screen';
import { Body, Notice, Title } from '@/components/ui';
import { firstName, initials } from '@/lib/format';
import { capitalize } from '@/lib/library';
import { useAssignment, useOverview } from '@/lib/overview';
import { colors, fonts } from '@/lib/theme';
import { usePersonalItems } from '@/lib/use-items';

export default function Discipline() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading } = useOverview();
  const assignment = useAssignment(id);
  const { items, failed, fresh, reload } = usePersonalItems(id, true);

  return (
    <Screen onRefresh={reload}>
      <BackLink label="Voor mij" onPress={() => router.back()} />

      {!assignment ? (
        loading ? (
          <Body muted>Bezig met ophalen…</Body>
        ) : (
          <Notice>Deze pagina bestaat niet (meer).</Notice>
        )
      ) : (
        <>
          <View style={screenStyles.head}>
            <Title>{capitalize(assignment.discipline)}</Title>
          </View>

          <View style={partStyles.card}>
            <Avatar label={initials(assignment.coach_name)} />
            <View style={partStyles.rowText}>
              <Text style={partStyles.rowTitle}>{assignment.coach_name}</Text>
              <Text style={partStyles.rowMeta}>Je professional voor {assignment.discipline}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Bericht aan ${firstName(assignment.coach_name)}`}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/berichten/[id]', params: { id: assignment.assignment_id } }, { withAnchor: true })}
              style={({ pressed }) => [styles.messageButton, pressed && partStyles.pressed]}>
              <Icon name="message" size={18} />
              <Text style={styles.messageLabel}>Bericht</Text>
            </Pressable>
          </View>

          {assignment.ended ? <Notice>Dit traject is afgerond. Je kunt alles nog teruglezen.</Notice> : null}

          <SectionTitle>Gedeeld met jou</SectionTitle>
          {failed ? <Notice tone="error">Dit kon niet worden opgehaald. Trek het scherm omlaag om het opnieuw te proberen.</Notice> : null}
          {items === null ? (
            failed ? null : (
              <Body muted>Bezig met ophalen…</Body>
            )
          ) : (
            <PersonalItems
              emptyText={`${firstName(assignment.coach_name)} heeft nog niets met je gedeeld.`}
              fresh={fresh}
              items={items}
              onOpenLibraryItem={(itemId) => router.push({ pathname: '/bibliotheek/[id]', params: { id: itemId } }, { withAnchor: true })}
            />
          )}

          <LockNote>Alleen jij en {firstName(assignment.coach_name)} zien wat hier staat.</LockNote>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  messageLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
});
