import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../../components/ui';
import { dishFallbackImage } from '../../theme/images';
import { COLORS, FONTS, SHADOWS, formatPrice } from '../../theme';
import useMenuDay, { getDishUnavailableLabel, isDishOrderableToday } from '../../hooks/useMenuDay';

export default function DishPreviewScreen({ route, navigation }) {
  const { item } = route.params;
  const restaurant = route.params.restaurant || item.restaurant || item._restaurant;
  const insets = useSafeAreaInsets();
  const today = useMenuDay();
  const available = isDishOrderableToday(item, today);
  const price = Number(item.discount_price) > 0 && Number(item.discount_price) < Number(item.price)
    ? item.discount_price : item.price;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!available) return undefined;
    const animation = Animated.loop(Animated.timing(glow, {
      toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [available, glow]);

  const shimmer = (values) => glow.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: values,
  });

  return (
    <View style={styles.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <SmartImage uri={item.image} fallbackSource={dishFallbackImage(item)} style={StyleSheet.absoluteFill} iconSize={72} />
      <LinearGradient colors={['rgba(0,0,0,0.34)', 'transparent']} style={styles.topShade} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(15,8,5,0.22)', 'rgba(15,8,5,0.94)']}
        locations={[0, 0.35, 1]} style={styles.bottomShade} pointerEvents="none" />

      <TouchableOpacity style={[styles.back, { top: insets.top + 12 }]} onPress={() => navigation.goBack()}
        accessibilityLabel="Revenir en arrière" activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={23} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.content, { bottom: insets.bottom + 24 }]}>
        <Text style={styles.restaurant} numberOfLines={1}>{restaurant?.name?.trim() || 'Estuaire Eat'}</Text>
        <Text style={styles.name} numberOfLines={2}>{item.name?.trim()}</Text>
        <View style={styles.bottomRow}>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>{formatPrice(price)}</Text>
            {!available && <Text style={styles.availability} numberOfLines={2}>{getDishUnavailableLabel(item, today)}</Text>}
          </View>
          <TouchableOpacity style={[styles.orderButton, !available && styles.orderDisabled]}
            onPress={() => navigation.replace('ItemDetail', { item, restaurant })}
            disabled={!available} activeOpacity={0.84}
            accessibilityLabel={available ? `Commander ${item.name}` : getDishUnavailableLabel(item, today)}>
            <LinearGradient colors={available ? ['#FF982D', '#FF5C1F'] : ['#8A8380', '#716B69']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.orderGradient}>
              {available && <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Animated.View style={[styles.sparkle, { left: 13, top: 10, opacity: shimmer([0.18, 0.9, 0.25, 0.5, 0.18]) }]} />
                <Animated.View style={[styles.sparkle, { right: 14, top: 7, width: 3, height: 3, opacity: shimmer([0.35, 0.2, 0.9, 0.2, 0.35]) }]} />
                <Animated.View style={[styles.sparkle, { right: 36, bottom: 8, width: 2, height: 2, opacity: shimmer([0.2, 0.5, 0.2, 0.95, 0.2]) }]} />
              </View>}
              <Text style={styles.orderText}>Commander</Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#130A06' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '52%' },
  back: { position: 'absolute', left: 18, width: 43, height: 43, borderRadius: 22,
    backgroundColor: 'rgba(18,13,10,0.54)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center' },
  content: { position: 'absolute', left: 22, right: 22 },
  restaurant: { color: '#FFE5D2', fontFamily: FONTS.semibold, fontSize: 13, marginBottom: 5 },
  name: { color: '#fff', fontFamily: FONTS.extrabold, fontSize: 27, lineHeight: 33, marginBottom: 16 },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  priceBlock: { flex: 1, minWidth: 0 },
  price: { color: '#FFBE6E', fontFamily: FONTS.bold, fontSize: 18 },
  availability: { color: '#fff', fontFamily: FONTS.medium, fontSize: 11, marginTop: 3 },
  orderButton: { width: 142, height: 46, borderRadius: 25, ...SHADOWS.primary },
  orderDisabled: { opacity: 0.65 },
  orderGradient: { flex: 1, borderRadius: 25, overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)' },
  orderText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 13 },
  sparkle: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },
});
