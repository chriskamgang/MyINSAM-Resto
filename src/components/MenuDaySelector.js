import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MENU_DAYS } from '../hooks/useMenuDay';
import { useMenuDaySelection } from '../context/MenuDayContext';
import { createThemedStyles, COLORS, FONTS } from '../theme';

const SHORT = { mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam', sun: 'Dim' };

export default function MenuDaySelector({ style }) {
  const { today, selectedDay, isTodaySelected, selectDay, resetDay } = useMenuDaySelection();
  return (
    <View style={[styles.container, style]}>
      <View style={styles.heading}>
        <View style={styles.headingLeft}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={styles.title}>Menus du {selectedDay.label}</Text>
        </View>
        {!isTodaySelected && (
          <TouchableOpacity onPress={resetDay} accessibilityLabel="Revenir au menu d’aujourd’hui" hitSlop={6}>
            <Text style={styles.reset}>Aujourd’hui <Ionicons name="refresh" size={12} color={COLORS.primary} /></Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {MENU_DAYS.map((day) => {
          const active = day.key === selectedDay.key;
          return (
            <TouchableOpacity key={day.key} onPress={() => selectDay(day.key)} activeOpacity={0.82}
              accessibilityLabel={`Voir les menus du ${day.label}`} accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{SHORT[day.key]}</Text>
              {day.key === today.key && <View style={[styles.todayDot, active && styles.todayDotActive]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles({
  container: { paddingTop: 6, paddingBottom: 9, backgroundColor: '#FFF8F3' },
  heading: { paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  headingLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  reset: { fontFamily: FONTS.semibold, fontSize: 10, color: COLORS.primary },
  days: { paddingHorizontal: 14, gap: 7 },
  chip: { minWidth: 48, height: 31, borderRadius: 16, paddingHorizontal: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F2D9C8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontFamily: FONTS.semibold, fontSize: 11, color: COLORS.textMuted },
  chipTextActive: { color: '#fff' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
  todayDotActive: { backgroundColor: '#fff' },
});
