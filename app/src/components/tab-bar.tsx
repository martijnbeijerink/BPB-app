// De menubalk onderin, in de stijl van het schermontwerp: de actieve tab
// heeft een oranje streep en een vette naam. Bij Voor mij en Berichten staat
// een teller als er iets nieuws is. In een gesprek is de balk verborgen,
// zodat er ruimte is voor het toetsenbord.

import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth';
import { useOverview } from '@/lib/overview';
import { tabInfo, tabsFor, type TabName } from '@/lib/tabs';
import { colors, fonts } from '@/lib/theme';

type Route = BottomTabBarProps['state']['routes'][number];

/** Staat er binnen de tab Berichten een gesprek open? */
function chatOpen(route: Route | undefined): boolean {
  if (route?.name !== 'berichten') return false;
  const nested = route.state;
  if (nested) return nested.routes[nested.index ?? nested.routes.length - 1]?.name === '[id]';
  return (route.params as { screen?: string } | undefined)?.screen === '[id]';
}

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { profile } = useAuth();
  const { assignments } = useOverview();
  if (!profile) return null;

  const currentRoute = state.routes[state.index];
  if (chatOpen(currentRoute)) return null;

  const current = currentRoute?.name;
  const visible = tabsFor[profile.role];
  const counts: Partial<Record<TabName, number>> = {
    'voor-mij': assignments.reduce((sum, assignment) => sum + assignment.new_items, 0),
    berichten: assignments.filter((assignment) => assignment.unread_messages > 0).length,
  };

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {visible.map((name: TabName) => {
        const route = state.routes.find((candidate) => candidate.name === name);
        if (!route) return null;
        const focused = current === name;
        const info = tabInfo[name];
        const count = counts[name] ?? 0;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            accessibilityLabel={count > 0 ? `${info.label}, ${count} nieuw` : info.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            key={name}
            onPress={onPress}
            style={[styles.tab, focused && styles.tabFocused]}>
            <View>
              <Icon color={focused ? colors.ink : colors.ink2} name={info.icon} />
              {count > 0 ? (
                <View style={styles.count}>
                  <Text style={styles.countText}>{count > 9 ? '9+' : count}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={[styles.label, focused && styles.labelFocused]}>
              {info.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  tab: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4, borderTopWidth: 3, borderTopColor: 'transparent' },
  tabFocused: { borderTopColor: colors.accent },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink2 },
  labelFocused: { fontFamily: fonts.bold, color: colors.ink },
  count: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.accent,
  },
  countText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.ink },
});
