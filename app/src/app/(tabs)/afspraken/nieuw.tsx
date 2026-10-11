// Een afspraak toevoegen, door de professional: met welke cliënt, op welke
// dag, hoe laat en waar. De cliënt ziet de afspraak daarna direct.

import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { BackLink, Chip, SectionTitle, partStyles } from '@/components/parts';
import { Screen, screenStyles } from '@/components/screen';
import { Body, Button, Notice, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { addMonths, isPastDay, localMoment, monthGrid } from '@/lib/calendar';
import { addAppointment } from '@/lib/data';
import { firstName, monthLong, weekdayName } from '@/lib/format';
import { capitalize } from '@/lib/library';
import { useOverview } from '@/lib/overview';
import { colors, fonts } from '@/lib/theme';

const weekdays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const minutes = [0, 15, 30, 45];
const places = ['Op locatie', 'Telefonisch'];
const two = (value: number) => String(value).padStart(2, '0');

export default function NieuweAfspraak() {
  const router = useRouter();
  const { profile } = useAuth();
  const { assignments, loading } = useOverview();
  const open = assignments.filter((assignment) => !assignment.ended);

  const [today] = useState(() => new Date());
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [shown, setShown] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [day, setDay] = useState<{ year: number; month: number; day: number } | null>(null);
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [place, setPlace] = useState(places[0]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Met één cliënt valt er niets te kiezen.
  const assignmentId = chosenId ?? (open.length === 1 ? open[0].assignment_id : null);
  const assignment = open.find((item) => item.assignment_id === assignmentId) ?? null;
  const moment = day ? localMoment(day.year, day.month, day.day, hour, minute) : null;
  const firstMonth = shown.year === today.getFullYear() && shown.month === today.getMonth();

  const change = (action: () => void) => {
    action();
    setProblem(null);
  };

  const save = async () => {
    if (!profile) return;
    if (!assignment) return setProblem('Kies een cliënt.');
    if (!moment) return setProblem('Kies een datum.');
    if (moment.getTime() <= Date.now()) return setProblem('Dit tijdstip is al voorbij. Kies een later tijdstip.');
    setBusy(true);
    setProblem(null);
    try {
      await addAppointment(assignment.assignment_id, profile.id, moment, place);
      router.back();
    } catch {
      setProblem('De afspraak is niet opgeslagen. Controleer je verbinding en probeer het opnieuw.');
      setBusy(false);
    }
  };

  // Alleen de professional voegt afspraken toe; de database weigert het voor ieder ander.
  if (profile && profile.role !== 'coach') return <Redirect href="/afspraken" />;

  return (
    <Screen>
      <BackLink label="Afspraken" onPress={() => router.back()} />
      <View style={screenStyles.head}>
        <Title>Afspraak toevoegen</Title>
        <Body muted>De cliënt ziet de afspraak direct onder Afspraken.</Body>
      </View>

      {open.length === 0 ? (
        <Notice>{loading ? 'Bezig met ophalen…' : 'Je hebt geen cliënten om een afspraak mee te maken.'}</Notice>
      ) : (
        <>
          <SectionTitle>Cliënt</SectionTitle>
          <View accessibilityRole="radiogroup" style={partStyles.list}>
            {open.map((item, index) => {
              const selected = item.assignment_id === assignmentId;
              return (
                <Pressable
                  accessibilityRole="radio"
                  aria-checked={selected}
                  key={item.assignment_id}
                  onPress={() => change(() => setChosenId(item.assignment_id))}
                  style={({ pressed }) => [styles.client, index > 0 && partStyles.listRowBorder, pressed && partStyles.pressed]}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  <View style={partStyles.rowText}>
                    <Text style={styles.clientName}>{item.client_name}</Text>
                    <Text style={partStyles.rowMeta}>{capitalize(item.discipline)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <SectionTitle>Datum</SectionTitle>
          <View style={styles.calendar}>
            <View style={styles.monthRow}>
              <Pressable
                accessibilityLabel="Vorige maand"
                accessibilityRole="button"
                accessibilityState={{ disabled: firstMonth }}
                disabled={firstMonth}
                onPress={() => setShown(addMonths(shown.year, shown.month, -1))}
                style={[styles.monthButton, firstMonth && styles.faded]}>
                <Icon name="left" size={22} strokeWidth={2} />
              </Pressable>
              <Text accessibilityRole="header" style={styles.monthTitle}>
                {capitalize(monthLong(shown.month))} {shown.year}
              </Text>
              <Pressable accessibilityLabel="Volgende maand" accessibilityRole="button" onPress={() => setShown(addMonths(shown.year, shown.month, 1))} style={styles.monthButton}>
                <Icon name="right" size={22} strokeWidth={2} />
              </Pressable>
            </View>
            <View style={styles.week}>
              {weekdays.map((name) => (
                <Text key={name} style={styles.weekday}>
                  {name}
                </Text>
              ))}
            </View>
            {monthGrid(shown.year, shown.month).map((week, weekIndex) => (
              <View key={weekIndex} style={styles.week}>
                {week.map((number, index) => {
                  if (number === null) return <View key={index} style={styles.cell} />;
                  const past = isPastDay(shown.year, shown.month, number, today);
                  const selected = day !== null && day.year === shown.year && day.month === shown.month && day.day === number;
                  const isToday = shown.year === today.getFullYear() && shown.month === today.getMonth() && number === today.getDate();
                  return (
                    <Pressable
                      accessibilityLabel={`${number} ${monthLong(shown.month)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: past }}
                      disabled={past}
                      key={index}
                      onPress={() => change(() => setDay({ year: shown.year, month: shown.month, day: number }))}
                      style={[styles.cell, styles.dayCell, isToday && styles.today, selected && styles.daySelected]}>
                      <Text style={[styles.dayText, past && styles.dayPast, selected && styles.dayTextSelected]}>{number}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <SectionTitle>Tijd</SectionTitle>
          <View style={styles.chips}>
            {hours.map((value) => (
              <Chip accessibilityLabel={`${value} uur`} key={value} label={two(value)} onPress={() => change(() => setHour(value))} selected={hour === value} />
            ))}
          </View>
          <View style={styles.chips}>
            {minutes.map((value) => (
              <Chip accessibilityLabel={`${value} minuten`} key={value} label={`:${two(value)}`} onPress={() => change(() => setMinute(value))} selected={minute === value} />
            ))}
          </View>

          <SectionTitle>Plaats</SectionTitle>
          <View style={styles.chips}>
            {places.map((value) => (
              <Chip key={value} label={value} onPress={() => change(() => setPlace(value))} selected={place === value} />
            ))}
          </View>

          {assignment && moment ? (
            <Notice>
              {weekdayName(moment)} {moment.getDate()} {monthLong(moment.getMonth())} om {two(hour)}:{two(minute)} uur, {place.toLowerCase()}, met {firstName(assignment.client_name)}.
            </Notice>
          ) : null}
          {problem ? <Notice tone="error">{problem}</Notice> : null}
          <Button busy={busy} label="Afspraak toevoegen" onPress={save} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  client: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 10, paddingHorizontal: 16 },
  clientName: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.ink },
  radio: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.lineStrong },
  radioSelected: { borderColor: colors.ink },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.ink },
  calendar: { gap: 4, padding: 12, borderRadius: 20, backgroundColor: colors.surface },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  monthButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.calm },
  faded: { opacity: 0.35 },
  monthTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, paddingVertical: 4, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2 },
  cell: { flex: 1, height: 44 },
  dayCell: { alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1.5, borderColor: 'transparent' },
  today: { borderColor: colors.lineStrong },
  daySelected: { borderColor: colors.ink, backgroundColor: colors.ink },
  dayText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  dayPast: { color: colors.lineStrong },
  dayTextSelected: { fontFamily: fonts.bold, color: colors.onInk },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
