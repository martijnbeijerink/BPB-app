// De menubalk onderin, in de stijl van het schermontwerp: de actieve tab
// heeft een oranje streep en een vette naam.

import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth';
import { tabInfo, tabsFor, type TabName } from '@/lib/tabs';
import { colors, fonts } from '@/lib/theme';

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { profile } = useAuth();
  if (!profile) return null;

  const current = state.routes[state.index]?.name;
  const visible = tabsFor[profile.role];

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {visible.map((name: TabName) => {
        const route = state.routes.find((candidate) => candidate.name === name);
        if (!route) return null;
        const focused = current === name;
        const info = tabInfo[name];
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            accessibilityLabel={info.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            key={name}
            onPress={onPress}
            style={[styles.tab, focused && styles.tabFocused]}>
            <Icon color={focused ? colors.ink : colors.ink2} name={info.icon} />
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
});
