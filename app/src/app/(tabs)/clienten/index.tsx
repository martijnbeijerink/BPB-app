// Cliënten: de cliënten van deze begeleider. Achter elke cliënt staat wat
// de begeleider persoonlijk met die cliënt heeft gedeeld.

import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, Dot, partStyles } from '@/components/parts';
import { Screen, screenStyles } from '@/components/screen';
import { Body, Notice, Title } from '@/components/ui';
import type { Assignment } from '@/lib/data';
import { dayLabel, initials } from '@/lib/format';
import { capitalize } from '@/lib/library';
import { useOverview } from '@/lib/overview';
import { colors } from '@/lib/theme';

/** De regel onder de naam: wat er het laatst is gebeurd. */
function statusLine(assignment: Assignment): { text: string; strong: boolean } {
  if (assignment.unread_messages > 0) return { text: 'Nieuw bericht', strong: true };
  if (assignment.ended) return { text: 'Traject afgerond', strong: false };
  if (!assignment.last_item_at) return { text: 'Nog niets gedeeld', strong: false };
  const day = dayLabel(assignment.last_item_at);
  const relative = day === 'Vandaag' || day === 'Gisteren';
  return { text: relative ? `Laatst gedeeld: ${day.toLowerCase()}` : `Laatst gedeeld op ${day}`, strong: false };
}

export default function Clienten() {
  const router = useRouter();
  const { assignments, loading, failed, refresh } = useOverview();

  return (
    <Screen onRefresh={refresh}>
      <View style={screenStyles.head}>
        <Title>Cliënten</Title>
        <Body muted>De cliënten die jij begeleidt.</Body>
      </View>

      {failed ? <Notice tone="error">Je cliënten konden niet worden opgehaald. Trek het scherm omlaag om het opnieuw te proberen.</Notice> : null}
      {loading ? <Body muted>Bezig met ophalen…</Body> : null}
      {!loading && !failed && assignments.length === 0 ? <Notice>Er zijn nog geen cliënten aan jou gekoppeld. De casehouder regelt dat.</Notice> : null}

      {assignments.length > 0 ? (
        <View style={partStyles.list}>
          {assignments.map((assignment, index) => {
            const status = statusLine(assignment);
            return (
              <Pressable
                accessibilityHint="Opent de pagina van deze cliënt"
                accessibilityRole="button"
                key={assignment.assignment_id}
                onPress={() => router.push({ pathname: '/clienten/[id]', params: { id: assignment.assignment_id } })}
                style={({ pressed }) => [partStyles.listRow, index > 0 && partStyles.listRowBorder, pressed && partStyles.pressed]}>
                <Avatar label={initials(assignment.client_name)} soft />
                <View style={partStyles.rowText}>
                  <Text style={partStyles.rowTitle}>{assignment.client_name}</Text>
                  <Text style={status.strong ? partStyles.rowMetaStrong : partStyles.rowMeta}>
                    {capitalize(assignment.discipline)} · {status.text}
                  </Text>
                </View>
                {assignment.unread_messages > 0 ? <Dot /> : null}
                <Icon color={colors.ink2} name="right" size={20} strokeWidth={2} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}
