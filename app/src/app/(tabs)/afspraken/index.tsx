// Afspraken: wat er komt en wat er is geweest. De cliënt ziet de afspraken
// met al haar professionals, de professional die met de eigen cliënten.
// Alleen de professional voegt een afspraak toe.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LockNote, SectionTitle, partStyles } from '@/components/parts';
import { Screen, screenStyles } from '@/components/screen';
import { Body, Button, Notice, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { splitAppointments } from '@/lib/calendar';
import { fetchAppointments, type Appointment, type Assignment } from '@/lib/data';
import { monthShort, timeLabel, weekdayName } from '@/lib/format';
import { capitalize } from '@/lib/library';
import { useOverview } from '@/lib/overview';
import { channelName, supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

export default function Afspraken() {
  const router = useRouter();
  const { profile } = useAuth();
  const { assignments, refresh } = useOverview();
  const [list, setList] = useState<Appointment[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Het moment van ophalen bepaalt wat komend is en wat geweest.
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      const rows = await fetchAppointments();
      setList(rows);
      setNow(new Date());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // Bij openen van het scherm, en bij terugkomen na het toevoegen.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Live: een nieuwe, gewijzigde of vervallen afspraak.
  useEffect(() => {
    const channel = supabase
      ?.channel(channelName('afspraken'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => load())
      .subscribe();
    return () => {
      if (channel) supabase?.removeChannel(channel);
    };
  }, [load]);

  const coach = profile?.role === 'coach';
  const byId = new Map(assignments.map((assignment) => [assignment.assignment_id, assignment]));
  // Een afspraak zonder bekende koppeling (het overzicht is nog niet binnen) wacht even.
  const known = (list ?? []).filter((item) => byId.has(item.assignment_id));
  const { coming, been } = splitAppointments(known, now);
  const canAdd = coach && assignments.some((assignment) => !assignment.ended);

  const row = (item: Appointment, next: boolean) => (
    <Row assignment={byId.get(item.assignment_id)!} coach={coach} item={item} key={item.id} next={next} past={new Date(item.starts_at) < now} />
  );

  return (
    <Screen onRefresh={() => Promise.all([load(), refresh()])}>
      <View style={screenStyles.head}>
        <Title>Afspraken</Title>
        <Body muted>{coach ? 'Je afspraken met je cliënten.' : 'Je afspraken met je professionals.'}</Body>
      </View>

      {canAdd ? <Button label="Afspraak toevoegen" onPress={() => router.push('/afspraken/nieuw')} /> : null}
      {failed ? <Notice tone="error">De afspraken konden niet worden opgehaald. Trek het scherm omlaag om het opnieuw te proberen.</Notice> : null}

      {list === null ? (
        failed ? null : (
          <Body muted>Bezig met ophalen…</Body>
        )
      ) : (
        <>
          <SectionTitle>Komend</SectionTitle>
          {coming.length > 0 ? <View style={styles.list}>{coming.map((item, index) => row(item, index === 0))}</View> : <Body muted>Er staan geen afspraken gepland.</Body>}

          <SectionTitle>Geweest</SectionTitle>
          {been.length > 0 ? <View style={styles.list}>{been.map((item) => row(item, false))}</View> : <Body muted>Er zijn nog geen afspraken geweest.</Body>}
        </>
      )}

      <LockNote>{coach ? 'Je ziet alleen de afspraken met je eigen cliënten.' : 'Alleen jij en de professional van die afspraak zien dit.'}</LockNote>
    </Screen>
  );
}

function Row({ item, assignment, coach, next, past }: { item: Appointment; assignment: Assignment; coach: boolean; next: boolean; past: boolean }) {
  const date = new Date(item.starts_at);
  const who = coach ? assignment.client_name : `${capitalize(assignment.discipline)} met ${assignment.coach_name}`;
  const when = `${weekdayName(date)} · ${timeLabel(item.starts_at)} uur · ${item.place}`;
  return (
    <View accessibilityLabel={`${next ? 'Eerstvolgende afspraak. ' : ''}${who}. ${date.getDate()} ${monthShort(date)}, ${when}`} accessible style={styles.row}>
      <View style={[styles.dateBox, next && styles.dateBoxNext, past && styles.dateBoxPast]}>
        <Text style={styles.day}>{date.getDate()}</Text>
        <Text style={styles.month}>{monthShort(date)}</Text>
      </View>
      <View style={partStyles.rowText}>
        <Text style={[styles.title, past && styles.titlePast]}>{who}</Text>
        <Text style={partStyles.rowMeta}>{when}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: 18, backgroundColor: colors.surface },
  dateBox: { width: 56, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.calm },
  dateBoxNext: { backgroundColor: colors.accent },
  dateBoxPast: { backgroundColor: colors.ground },
  day: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 25, color: colors.ink },
  month: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 15, color: colors.ink },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.ink },
  titlePast: { color: colors.ink2 },
});
