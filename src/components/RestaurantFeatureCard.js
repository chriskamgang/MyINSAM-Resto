import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createThemedStyles, COLORS, FONTS, RADIUS, SHADOWS } from '../theme';
import { SmartImage } from './ui';

const FALLBACK_COVER = require('../../assets/images/home-grill-hero.png');
const cardWidth = Dimensions.get('window').width - 28;

export default function RestaurantFeatureCard({ restaurant, onPress, liked, onLike, style }) {
  const rating = Number(restaurant.rating) || 0;
  const time = restaurant.delivery_time_min && restaurant.delivery_time_max
    ? `${restaurant.delivery_time_min}–${restaurant.delivery_time_max} min`
    : restaurant.delivery_time_min ? `${restaurant.delivery_time_min} min` : 'Délai à confirmer';
  const city = restaurant.city || restaurant.address;
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.9} accessibilityLabel={`Voir ${restaurant.name}`}>
      <SmartImage uri={restaurant.cover_image} fallbackSource={FALLBACK_COVER} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(0,0,0,0.87)', 'rgba(0,0,0,0.52)', 'rgba(0,0,0,0.08)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <SmartImage uri={restaurant.logo} style={styles.logo} fallbackIcon="restaurant" iconSize={28} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
          <Text style={styles.category} numberOfLines={1}>{restaurant.category?.name || 'Restaurant'}</Text>
          <View style={styles.meta}>
            {rating > 0 ? <Text style={styles.rating}>★ {rating.toFixed(1).replace('.', ',')}</Text> : <Text style={styles.metaText}>Nouveau</Text>}
            <Text style={styles.metaText}>◷ {time}</Text>
          </View>
          {city ? <Text style={styles.city} numberOfLines={1}><Ionicons name="location" size={11} color="#FFB338" /> {city}</Text> : null}
        </View>
      </View>
      <TouchableOpacity style={styles.heart} onPress={onLike} hitSlop={8} accessibilityLabel="Ajouter aux favoris">
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={21} color={liked ? COLORS.primary : COLORS.text} />
      </TouchableOpacity>
      <View style={styles.arrow}><Ionicons name="arrow-forward" size={19} color={COLORS.white} /></View>
    </TouchableOpacity>
  );
}

const styles = createThemedStyles({
  card: { width: cardWidth, height: 154, borderRadius: 20, overflow: 'hidden', backgroundColor: '#17120F', ...SHADOWS.md },
  content: { position: 'absolute', left: 13, right: 42, bottom: 13, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  logoWrap: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#FFB338', overflow: 'hidden', backgroundColor: '#111' },
  logo: { width: '100%', height: '100%' },
  info: { flex: 1, paddingBottom: 1 },
  name: { fontFamily: FONTS.bold, fontSize: 18, lineHeight: 22, color: COLORS.white },
  category: { fontFamily: FONTS.regular, fontSize: 10, color: '#F3E9DF', marginTop: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 6 },
  rating: { fontFamily: FONTS.bold, fontSize: 10, color: '#FFB338' },
  metaText: { fontFamily: FONTS.medium, fontSize: 9, color: COLORS.white },
  city: { fontFamily: FONTS.medium, fontSize: 9, color: COLORS.white, marginTop: 3 },
  heart: { position: 'absolute', right: 10, top: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  arrow: { position: 'absolute', right: 10, bottom: 11, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});
