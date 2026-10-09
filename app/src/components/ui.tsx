// Kleine bouwstenen die op elk scherm terugkomen.

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts } from '@/lib/theme';

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

type ButtonProps = { label: string; onPress(): void; busy?: boolean; variant?: 'primary' | 'ghost' };

export function Button({ label, onPress, busy, variant = 'primary' }: ButtonProps) {
  const ghost = variant === 'ghost';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.button, ghost && styles.buttonGhost, (pressed || busy) && styles.pressed]}>
      {busy ? (
        <ActivityIndicator color={ghost ? colors.ink : colors.onInk} />
      ) : (
        <Text style={[styles.buttonLabel, ghost && styles.buttonLabelGhost]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.ink2} style={styles.input} {...input} />
    </View>
  );
}

export function Notice({ children, tone = 'calm' }: { children: ReactNode; tone?: 'calm' | 'error' }) {
  return (
    <View accessibilityRole={tone === 'error' ? 'alert' : undefined} style={[styles.notice, tone === 'error' && styles.noticeError]}>
      <Text style={[styles.noticeText, tone === 'error' && styles.noticeTextError]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 35, letterSpacing: -0.3, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.ink },
  muted: { color: colors.ink2 },
  button: { minHeight: 52, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  buttonGhost: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.ink },
  pressed: { opacity: 0.75 },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.onInk },
  buttonLabelGhost: { color: colors.ink },
  field: { gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  notice: { padding: 16, borderRadius: 16, backgroundColor: colors.calm },
  noticeError: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.danger },
  noticeText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  noticeTextError: { fontFamily: fonts.semibold, color: colors.danger },
});
