// Gedeelde opbouw van een scherm, en de tussenstand voor schermen die nog
// gebouwd moeten worden.

import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Notice, Title } from '@/components/ui';
import { colors } from '@/lib/theme';

export const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  content: { flexGrow: 1, gap: 16, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
  head: { gap: 8 },
});

/** Een scherm dat kan scrollen. Met onRefresh kan de gebruiker het scherm omlaag trekken om te verversen. */
export function Screen({ children, onRefresh }: { children: ReactNode; onRefresh?(): Promise<unknown> }) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <ScrollView
        contentContainerStyle={screenStyles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={colors.ink} /> : undefined}>
        {children}
      </ScrollView>
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
