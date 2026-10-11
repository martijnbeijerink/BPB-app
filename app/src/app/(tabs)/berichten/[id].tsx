// Eén gesprek tussen een cliënt en een begeleider. Nieuwe berichten komen
// live binnen. Bijlagen volgen zodra de bestandsopslag is gekoppeld.

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Avatar, LockNote, partStyles } from '@/components/parts';
import { Body, Notice } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { chatRows, mergeMessages, type ChatRow } from '@/lib/conversation';
import { fetchMessages, markRead, sendMessage, type Message } from '@/lib/data';
import { dayHeading, firstName, initials, timeLabel } from '@/lib/format';
import { capitalize } from '@/lib/library';
import { useAssignment, useOverview } from '@/lib/overview';
import { channelName, supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

export default function Gesprek() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { loading: overviewLoading, refresh } = useOverview();
  const assignment = useAssignment(id);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const me = profile?.id;

  /** Noteert het gesprek als gelezen en werkt de tellers in de menubalk bij. */
  const seen = useCallback(async () => {
    if (!id) return;
    await markRead(id, { messages: true });
    await refresh();
  }, [id, refresh]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const rows = await fetchMessages(id);
      setMessages((known) => mergeMessages(known ?? [], rows));
      setFailed(false);
      await seen();
    } catch {
      setFailed(true);
    }
  }, [id, seen]);

  // Bij openen van het gesprek, en als de app weer naar voren komt.
  useFocusEffect(
    useCallback(() => {
      load();
      const appState = AppState.addEventListener('change', (state) => {
        if (state === 'active') load();
      });
      return () => appState.remove();
    }, [load]),
  );

  // Live: een nieuw bericht in dit gesprek verschijnt direct.
  useEffect(() => {
    if (!supabase || !id) return;
    const channel = supabase
      .channel(channelName(`gesprek-${id}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `assignment_id=eq.${id}` }, (payload) => {
        const message = payload.new as Message;
        setMessages((known) => mergeMessages(known ?? [], [message]));
        if (message.sender_id !== me) seen();
      })
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [id, me, seen]);

  const send = async () => {
    const body = text.trim();
    if (!id || !me || body === '' || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const sent = await sendMessage(id, me, body);
      setMessages((known) => mergeMessages(known ?? [], [sent]));
      setText('');
      refresh();
    } catch {
      setProblem('Het bericht is niet verstuurd. Controleer je verbinding en probeer het opnieuw.');
    } finally {
      setBusy(false);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/berichten'));

  const coach = profile?.role === 'coach';
  const other = assignment ? (coach ? assignment.client_name : assignment.coach_name) : '';
  // De lijst staat op zijn kop (nieuwste onderaan in beeld), dus de rijen gaan er omgekeerd in.
  const rows = chatRows(messages ?? []).reverse();
  const canSend = text.trim() !== '' && !busy;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.column}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Terug naar Berichten" accessibilityRole="button" onPress={back} style={styles.back}>
            <Icon name="left" size={24} strokeWidth={2} />
          </Pressable>
          {assignment ? (
            <>
              <Avatar label={initials(other)} soft={coach} />
              <View style={partStyles.rowText}>
                <Text accessibilityRole="header" numberOfLines={1} style={partStyles.rowTitle}>
                  {other}
                </Text>
                <Text numberOfLines={1} style={partStyles.rowMeta}>
                  {coach ? capitalize(assignment.discipline) : `Je professional voor ${assignment.discipline}`}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.middle}>
          {!assignment && !overviewLoading ? (
            <View style={styles.message}>
              <Notice>Dit gesprek bestaat niet (meer).</Notice>
            </View>
          ) : null}

          {assignment && messages !== null && rows.length === 0 ? (
            <View style={styles.message}>
              <Body muted>{assignment.ended ? 'Er zijn geen berichten in dit gesprek.' : `Nog geen berichten. Stuur ${firstName(other)} het eerste bericht.`}</Body>
            </View>
          ) : null}
          {assignment && messages === null && !failed ? (
            <View style={styles.message}>
              <Body muted>Bezig met ophalen…</Body>
            </View>
          ) : null}

          <FlatList
            contentContainerStyle={styles.thread}
            data={assignment ? rows : []}
            inverted
            keyExtractor={(row) => row.key}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <Row me={me} row={item} />}
            style={styles.list}
          />

          {failed ? (
            <View style={styles.message}>
              <Notice tone="error">De berichten konden niet worden opgehaald. Controleer je verbinding.</Notice>
            </View>
          ) : null}
          {problem ? (
            <View style={styles.message}>
              <Notice tone="error">{problem}</Notice>
            </View>
          ) : null}
        </View>

        {assignment?.ended ? (
          <View style={styles.closed}>
            <LockNote>Dit traject is afgerond. Je kunt de berichten nog teruglezen, maar geen nieuwe meer sturen.</LockNote>
          </View>
        ) : assignment ? (
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Bericht"
              maxLength={4000}
              multiline
              onChangeText={setText}
              placeholder="Schrijf een bericht"
              placeholderTextColor={colors.ink2}
              style={styles.input}
              value={text}
            />
            <Pressable
              accessibilityLabel="Versturen"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={send}
              style={({ pressed }) => [styles.send, (!canSend || pressed) && styles.sendOff]}>
              <Icon name="send" size={22} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ row, me }: { row: ChatRow<Message>; me: string | undefined }) {
  if (row.type === 'day') return <Text style={styles.day}>{dayHeading(row.at)}</Text>;
  const mine = row.message.sender_id === me;
  return (
    <View style={[styles.bubbleWrap, mine ? styles.mine : styles.theirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{row.message.body}</Text>
      </View>
      <Text style={styles.time}>{timeLabel(row.message.created_at)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  column: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 68,
    paddingVertical: 10,
    paddingLeft: 6,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, backgroundColor: colors.ground },
  list: { flex: 1 },
  message: { paddingHorizontal: 16, paddingTop: 12 },
  closed: { padding: 12, borderTopWidth: 1, borderTopColor: colors.line },
  thread: { gap: 6, paddingHorizontal: 16, paddingVertical: 14 },
  day: { alignSelf: 'center', marginVertical: 8, fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2 },
  bubbleWrap: { maxWidth: '84%', gap: 3 },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleMine: { borderBottomRightRadius: 6, backgroundColor: colors.ink },
  bubbleTheirs: { borderBottomLeftRadius: 6, backgroundColor: colors.surface },
  bubbleText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.ink },
  bubbleTextMine: { color: colors.onInk },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 132,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.ground,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  sendOff: { opacity: 0.45 },
});
