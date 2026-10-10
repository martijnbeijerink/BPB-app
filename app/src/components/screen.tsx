// Gedeelde opbouw van een scherm, en de tussenstand voor schermen die nog
// gebouwd moeten worden.

import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Notice, Title } from '@/components/ui';
import { colors } from '@/lib/theme';

export const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  content: { flexGrow: 1, gap: 16, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
  head: { gap: 8 },
});

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <ScrollView contentContainerStyle={screenStyles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

/** Een scherm dat nog niet gebouwd is: zegt eerlijk wat er komt. */
export function ComingSoon({ title, intro, coming }: { title: string; intro: string; coming: string }) {
  return (
    <Screen>
      <View style={screenStyles.head}>
        <Title>{title}</Title>
        <Body muted>{intro}</Body>
      </View>
      <Notice>{coming}</Notice>
    </Screen>
  );
}
