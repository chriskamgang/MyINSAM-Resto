// Barre d'onglets Estuaire Eat (maquette) : fond blanc arrondi qui flotte au-dessus
// du contenu, petit trait orange sous l'onglet actif, et un onglet central optionnel
// en gros bouton rond orange surélevé (le Panier).
//
// Chaque écran déclare son icône via options.tabBarIcon ({ focused, color })
// et un compteur éventuel via options.tabBarBadge.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createThemedStyles, COLORS, FONTS, SHADOWS } from '../theme';
import { TAB_BAR_CONTENT_HEIGHT } from '../hooks/useTabBarSpace';

const CENTER_SIZE = 58;

function Badge({ value, onCenter }) {
  if (!value) return null;
  return (
    <View style={[styles.badge, onCenter && styles.badgeCenter]}>
      <Text style={styles.badgeText}>{value > 99 ? '99+' : value}</Text>
    </View>
  );
}

export default function EstuaireTabBar({ state, descriptors, navigation, centerRoute }) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.bar, { height: TAB_BAR_CONTENT_HEIGHT + bottom, paddingBottom: bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isCenter = route.name === centerRoute;
        const color = focused ? COLORS.primary : COLORS.textMuted;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

        if (isCenter) {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || label}
              hitSlop={{ top: 24 }}
            >
              <View style={styles.centerBtn}>
                {options.tabBarIcon?.({ focused: true, color: COLORS.white, size: 26 })}
                <Badge value={options.tabBarBadge} onCenter />
              </View>
              <Text style={[styles.label, styles.centerLabel, { color: COLORS.primary }]} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || label}
          >
            <View>
              {options.tabBarIcon?.({ focused, color, size: 23 })}
              <Badge value={options.tabBarBadge} />
            </View>
            <Text style={[styles.label, { color }, focused && { fontFamily: FONTS.semibold }]} numberOfLines={1}>{label}</Text>
            <View style={[styles.indicator, focused && { backgroundColor: COLORS.primary }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = createThemedStyles({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 8, paddingHorizontal: 6,
    ...SHADOWS.lg,
  },
  // Zone de toucher : toute la hauteur de l'onglet (évite les clics ratés)
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', minHeight: 50, paddingTop: 2 },
  label: { fontFamily: FONTS.medium, fontSize: 11, marginTop: 3 },
  indicator: { width: 18, height: 3, borderRadius: 2, marginTop: 3, backgroundColor: 'transparent' },

  centerBtn: {
    width: CENTER_SIZE, height: CENTER_SIZE, borderRadius: CENTER_SIZE / 2,
    marginTop: -30, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: COLORS.surface,
    ...SHADOWS.primary,
  },
  centerLabel: { fontFamily: FONTS.semibold, marginTop: 2 },

  badge: {
    position: 'absolute', right: -10, top: -5,
    backgroundColor: COLORS.danger, borderRadius: 9, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: COLORS.surface,
  },
  badgeCenter: { right: -4, top: -4 },
  badgeText: { color: COLORS.white, fontSize: 9, fontFamily: FONTS.bold },
});
