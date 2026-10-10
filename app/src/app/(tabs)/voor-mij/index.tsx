// Voor mij: per discipline één kaart. Achter elke kaart staat wat de
// begeleider van die discipline persoonlijk met de cliënt heeft gedeeld.

import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Badge, LockNote, partStyles } from '@/components/parts';
import { Screen, screenStyles } from '@/components/screen';
import { Body, Notice, Title } from '@/components/ui';
import { capitalize } from '@/lib/library';
import { useOverview } from '@/lib/overview';
import { colors } from '@/lib/theme';

export default function VoorMij() {
  const router = useRouter();
  const { assignments, loading, failed, refresh } = useOverview();

  return (
    <Screen onRefresh={refresh}>
      <View style={screenStyles.head}>
        <Title>Voor mij</Title>
        <Body muted>Wat je begeleiders persoonlijk met je delen, per discipline.</Body>
      </View>

      {failed ? <Notice tone="error">Je gegevens konden niet worden opgehaald. Trek het scherm omlaag om het opnieuw te proberen.</Notice> : null}
      {loading ? <Body muted>Bezig met ophalen…</Body> : null}
      {!loading && !failed && assignments.length === 0 ? (
        <Notice>Je bent nog niet aan een begeleider gekoppeld. Neem contact op met Burnout Preventie & Begeleiding.</Notice>
      ) : null}

      {assignments.map((assignment) => (
        <Pressable
          accessibilityHint="Opent de pagina van deze discipline"
          accessibilityRole="button"
          key={assignment.assignment_id}
          onPress={() => router.push({ pathname: '/voor-mij/[id]', params: { id: assignment.assignment_id } })}
          style={({ pressed }) => [partStyles.card, pressed && partStyles.pressed]}>
          <View style={partStyles.rowText}>
            <Text style={partStyles.rowTitleBig}>{capitalize(assignment.discipline)}</Text>
            <Text style={partStyles.rowMeta}>
              met {assignment.coach_name}
              {assignment.ended ? ' · afgerond' : ''}
            </Text>
          </View>
          {assignment.new_items > 0 ? <Badge>{assignment.new_items} nieuw</Badge> : null}
          <Icon color={colors.ink2} name="right" size={20} strokeWidth={2} />
        </Pressable>
      ))}

      {assignments.length > 0 ? <LockNote>Alleen jij en de begeleider van die discipline zien wat hier staat.</LockNote> : null}
    </Screen>
  );
}
