import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Animated, ScrollView, Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
const COLORS = {
  primary:  '#FF6B35',
  bg:       '#fff',
  text:     '#1a1a1a',
  gray:     '#888',
  lightBg:  '#FFF8F5',
  green:    '#22c55e',
  greenBg:  '#f0fdf4',
};

export default function OrderConfirmationScreen({ route, navigation }) {
  const { order, deliveryMinutes } = route.params || {};

  // Animations
  const circleSpin = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const fadeIn     = useRef(new Animated.Value(0)).current;
  const slideUp    = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. cercle tourne rapidement
      Animated.timing(circleSpin, { toValue: 1, duration: 600, useNativeDriver: true }),
      // 2. check apparaît en spring
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      // 3. contenu glisse
      Animated.parallel([
        Animated.timing(fadeIn,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const rotate = circleSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Temps
  const deliveryLabel = deliveryMinutes != null ? `${deliveryMinutes} min` : '20 min';
  const totalMinutes  = 15 + (deliveryMinutes ?? 20);
  const arrivalDate   = new Date(Date.now() + totalMinutes * 60 * 1000);
  const arrivalTime   = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const estimatedTime = order?.estimated_delivery_time
    ? new Date(order.estimated_delivery_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : arrivalTime;

  const total = order?.total || order?.total_amount;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Cercle animé + checkmark ── */}
        <View style={styles.heroSection}>
          <View style={styles.circleOuter}>
            <Animated.View style={[styles.circleRing, { transform: [{ rotate }] }]} />
            <Animated.View style={[styles.circleInner, { transform: [{ scale: checkScale }] }]}>
              <Text style={styles.checkIcon}>✓</Text>
            </Animated.View>
          </View>

          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
            <Text style={styles.heroTitle}>Commande confirmée !</Text>
            <Text style={styles.heroSubtitle}>
              Votre commande a été reçue.{'\n'}Nous préparons tout pour vous 🍽️
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.body, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

          {/* ── Numéro de commande ── */}
          {order?.order_number && (
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeSmall}>COMMANDE</Text>
              <Text style={styles.orderBadgeNumber}>#{order.order_number}</Text>
            </View>
          )}

          {/* ── Timeline de livraison ── */}
          <View style={styles.timelineCard}>
            <Text style={styles.cardTitle}>Suivi en temps réel</Text>

            <View style={styles.timelineRow}>
              {/* Préparation */}
              <View style={styles.timelineStep}>
                <View style={[styles.stepDot, styles.stepDotActive]}>
                  <Text style={styles.stepDotText}>🍳</Text>
                </View>
                <Text style={styles.stepLabel}>Préparation</Text>
                <Text style={styles.stepTime}>~15 min</Text>
              </View>

              <View style={styles.timelineConnector} />

              {/* Livraison */}
              <View style={styles.timelineStep}>
                <View style={[styles.stepDot, styles.stepDotOrange]}>
                  <Text style={styles.stepDotText}>🛵</Text>
                </View>
                <Text style={styles.stepLabel}>Livraison</Text>
                <Text style={styles.stepTime}>~{deliveryLabel}</Text>
              </View>

              <View style={styles.timelineConnector} />

              {/* Arrivée */}
              <View style={styles.timelineStep}>
                <View style={[styles.stepDot, styles.stepDotGreen]}>
                  <Text style={styles.stepDotText}>🏠</Text>
                </View>
                <Text style={styles.stepLabel}>Arrivée</Text>
                <Text style={[styles.stepTime, { color: COLORS.primary, fontWeight: '800' }]}>{estimatedTime}</Text>
              </View>
            </View>
          </View>

          {/* ── Montant ── */}
          {total && (
            <View style={styles.amountCard}>
              <View>
                <Text style={styles.amountLabel}>Total de la commande</Text>
                <Text style={styles.amountSub}>Paiement à la livraison / mobile</Text>
              </View>
              <Text style={styles.amountValue}>
                {Number(total).toLocaleString('fr-FR')} XAF
              </Text>
            </View>
          )}

          {/* ── Bouton Suivre ── */}
          <TouchableOpacity
            style={styles.trackBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OrderTracking', { orderId: order?.id })}
          >
            <Text style={styles.trackBtnIcon}>📍</Text>
            <Text style={styles.trackBtnText}>Suivre ma commande</Text>
          </TouchableOpacity>

          {/* ── Bouton Retour ── */}
          <TouchableOpacity
            style={styles.homeBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Main', { screen: 'Menu' })}
          >
            <Text style={styles.homeBtnText}>Retour au menu</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1 },

  // ── Hero ──
  heroSection: {
    backgroundColor: COLORS.lightBg,
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  circleOuter: {
    width: 110, height: 110,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  circleRing: {
    position: 'absolute',
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderTopColor: 'transparent',
  },
  circleInner: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  checkIcon:    { fontSize: 42, color: '#fff', fontWeight: 'bold' },
  heroTitle:    { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 10 },
  heroSubtitle: { fontSize: 15, color: COLORS.gray, textAlign: 'center', lineHeight: 22 },

  // ── Body ──
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  // Badge numéro
  orderBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5, borderColor: '#FFD7B8',
  },
  orderBadgeSmall:  { fontSize: 11, color: COLORS.gray, letterSpacing: 1.5, fontWeight: '600', marginBottom: 4 },
  orderBadgeNumber: { fontSize: 28, fontWeight: '900', color: COLORS.primary },

  // Timeline card
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gray, marginBottom: 20, letterSpacing: 0.5 },

  timelineRow:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  timelineStep:     { alignItems: 'center', flex: 1 },
  timelineConnector:{ flex: 0.6, height: 2, backgroundColor: '#e5e7eb', marginTop: 20 },

  stepDot: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  stepDotActive: { backgroundColor: '#FFF3E0', borderWidth: 2, borderColor: '#FFD7B8' },
  stepDotOrange: { backgroundColor: COLORS.primary },
  stepDotGreen:  { backgroundColor: COLORS.greenBg, borderWidth: 2, borderColor: '#86efac' },
  stepDotText:   { fontSize: 20 },

  stepLabel: { fontSize: 12, color: COLORS.gray, fontWeight: '600', textAlign: 'center' },
  stepTime:  { fontSize: 13, color: COLORS.text, fontWeight: '700', marginTop: 2, textAlign: 'center' },

  // Montant
  amountCard: {
    backgroundColor: COLORS.greenBg,
    borderRadius: 18, padding: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  amountLabel: { fontSize: 14, color: '#16a34a', fontWeight: '700' },
  amountSub:   { fontSize: 11, color: '#86efac', marginTop: 2 },
  amountValue: { fontSize: 20, fontWeight: '900', color: '#16a34a' },

  // Bouton suivre
  trackBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 18, paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  trackBtnIcon: { fontSize: 18 },
  trackBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Bouton retour
  homeBtn: {
    borderRadius: 18, paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  homeBtnText: { color: COLORS.gray, fontSize: 15, fontWeight: '600' },
});
