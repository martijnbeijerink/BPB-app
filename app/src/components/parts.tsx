// Onderdelen die op meerdere schermen terugkomen: het rondje met initialen,
// het label "nieuw", de terugknop en de privacy-notitie.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fonts } from '@/lib/theme';

export function Avatar({ label, soft, light }: { label: string; soft?: boolean; light?: boolean }) {
  return (
    <View style={[styles.avatar, soft && styles.avatarSoft, light && styles.avatarLight]}>
      <Text style={[styles.avatarText, (soft || light) && styles.avatarTextDark]}>{label}</Text>
    </View>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

export function Dot() {
  return <View accessibilityLabel="Ongelezen" style={styles.dot} />;
}

export function BackLink({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable accessibilityLabel={`Terug naar ${label}`} accessibilityRole="button" onPress={onPress} style={styles.back}>
      <Icon name="left" size={22} strokeWidth={2} />
      <Text style={styles.backLabel}>{label}</Text>
    </Pressable>
  );
}

export function LockNote({ children }: { children: ReactNode }) {
  return (
    <View style={styles.lock}>
      <Icon name="lock" size={22} />
      <Text style={styles.lockText}>{children}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.section}>
      {children}
    </Text>
  );
}

export const partStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: colors.surface },
  list: { borderRadius: 20, backgroundColor: colors.surface, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 76, paddingVertical: 12, paddingHorizontal: 16 },
  listRowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.ink },
  rowTitleBig: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 24, color: colors.ink },
  rowMeta: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.ink2 },
  rowMetaStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.ink },
  pressed: { opacity: 0.75 },
});

const styles = StyleSheet.create({
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  avatarSoft: { backgroundColor: colors.calm },
  avatarLight: { backgroundColor: colors.onInk },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onInk },
  avatarTextDark: { color: colors.ink },
  badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 11, backgroundColor: colors.accent },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44, marginLeft: -6, paddingRight: 12 },
  backLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  lock: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.calm },
  lockText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  section: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
});
