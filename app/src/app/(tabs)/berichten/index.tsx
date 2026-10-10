// Berichten: één gesprek per koppeling (één cliënt, één begeleider, één
// discipline). Het gesprek met het nieuwste bericht staat bovenaan.

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Dot, LockNote, partStyles } from '@/components/parts';
import { Screen, screenStyles } from '@/components/screen';
import { Body, Notice, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { sortConversations } from '@/lib/conversation';
import { dayLabel, initials } from '@/lib/format';
import { capitalize } from '@/lib/library';
import { useOverview } from '@/lib/overview';
import { colors, fonts } from '@/lib/theme';

export default function Berichten() {
  const router = useRouter();
  const { profile } = useAuth();
  const { assignments, loading, failed, refresh } = useOverview();
  const conversations = sortConversations(assignments);
  const coach = profile?.role === 'coach';

  return (
    <Screen onRefresh={refresh}>
      <View style={screenStyles.head}>
        <Title>Berichten</Title>
      </View>

      {failed ? <Notice tone="error">Je berichten konden niet worden opgehaald. Trek het scherm omlaag om het opnieuw te proberen.</Notice> : null}
      {loading ? <Body muted>Bezig met ophalen…</Body> : null}
      {!loading && !failed && conversations.length === 0 ? (
        <Notice>{coach ? 'Er zijn nog geen cliënten aan jou gekoppeld.' : 'Je bent nog niet aan een professional gekoppeld.'}</Notice>
      ) : null}

      {conversations.length > 0 ? (
        <View style={partStyles.list}>
          {conversations.map((conversation, index) => {
            const other = coach ? conversation.client_name : conversation.coach_name;
            const unread = conversation.unread_messages > 0;
            const preview = conversation.last_message_at
              ? `${conversation.last_message_mine ? 'Jij: ' : ''}${conversation.last_message_body || 'Bijlage'}`
              : 'Nog geen berichten';
            return (
              <Pressable
                accessibilityHint="Opent dit gesprek"
                accessibilityLabel={`${other}, ${conversation.discipline}${unread ? ', ongelezen' : ''}. ${preview}`}
                accessibilityRole="button"
                key={conversation.assignment_id}
                onPress={() => router.push({ pathname: '/berichten/[id]', params: { id: conversation.assignment_id } })}
                style={({ pressed }) => [partStyles.listRow, index > 0 && partStyles.listRowBorder, pressed && partStyles.pressed]}>
                <Avatar label={initials(other)} soft={coach} />
                <View style={partStyles.rowText}>
                  <View style={styles.top}>
                    <Text numberOfLines={1} style={[partStyles.rowTitle, styles.grow]}>
                      {other} <Text style={styles.discipline}>· {capitalize(conversation.discipline)}</Text>
                    </Text>
                    {conversation.last_message_at ? <Text style={partStyles.rowMeta}>{dayLabel(conversation.last_message_at)}</Text> : null}
                  </View>
                  <View style={styles.top}>
                    <Text numberOfLines={1} style={[unread ? partStyles.rowMetaStrong : partStyles.rowMeta, styles.grow]}>
                      {preview}
                    </Text>
                    {unread ? <Dot /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {conversations.length > 0 ? <LockNote>Een gesprek is alleen te lezen door jou en de ander in het gesprek.</LockNote> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  discipline: { fontFamily: fonts.regular, color: colors.ink2 },
});
