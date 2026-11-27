import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createThemedStyles, COLORS, FONTS, TYPE, RADIUS, SHADOWS, SCREEN_PADDING, formatPrice } from '../../theme';
import { Screen, Button, Card, Divider } from '../../components/ui';

const PAYMENT_LABELS = {
  cash: 'Espèces à la livraison',
  mtn_momo: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  gfs: 'Compte GFS',
};

export default function OrderConfirmationScreen({ route, navigation }) {
  const { order, deliveryMinutes } = route.params || {};
  const insets = useSafeAreaInsets();

  // Animations
  const haloScale  = useRef(new Animated.Value(0.6)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const fadeIn     = useRef(new Animated.Value(0)).current;
  const slideUp    = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(haloScale, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeIn,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const goHome = () => navigation.navigate('Main', { screen: 'Accueil' });

  // Retour matériel Android : revenir à l'accueil plutôt qu'au paiement
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { goHome(); return true; });
    return () => sub.remove();
  }, []);

  // Temps
  const deliveryLabel = deliveryMinutes != null ? `${deliveryMinutes} min` : '20 min';
  const totalMinutes  = 15 + (deliveryMinutes ?? 20);
  const arrivalDate   = new Date(Date.now() + totalMinutes * 60 * 1000);
  const arrivalTime   = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const estimatedTime = order?.estimated_delivery_time
    ? new Date(order.estimated_delivery_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : arrivalTime;

  const total = order?.total || order?.total_amount;
  const paymentLabel = PAYMENT_LABELS[order?.payment_method];

  const steps = [
    { icon: 'restaurant-outline', label: 'Préparation', time: '~15 min', active: true },
    { icon: 'bicycle', label: 'Livraison', time: `~${deliveryLabel}` },
    { icon: 'home-outline', label: 'Arrivée', time: estimatedTime, highlight: true },
  ];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Check animé ── */}
        <View style={styles.hero}>
          <Animated.View style={[styles.haloOuter, { transform: [{ scale: haloScale }] }]}>
            <View style={styles.haloInner}>
              <Animated.View style={[styles.check, { transform: [{ scale: checkScale }] }]}>
                <Ionicons name="checkmark" size={54} color={COLORS.white} />
              </Animated.View>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
            <Text style={[TYPE.h1, styles.center]}>Commande confirmée !</Text>
            <Text style={[TYPE.bodyMuted, styles.center, { marginTop: 6 }]}>
              Votre commande a été reçue.{'\n'}Nous préparons tout pour vous.
            </Text>
            {order?.order_number ? (
              <View style={styles.orderPill}>
                <Text style={styles.orderPillLabel}>Commande</Text>
                <Text style={styles.orderPillNumber}>#{order.order_number}</Text>
              </View>
            ) : null}
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          {/* ── Heure d'arrivée + étapes ── */}
          <Card style={styles.card}>
            <View style={styles.etaRow}>
              <View style={styles.etaIcon}>
                <Ionicons name="time-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={TYPE.caption}>Arrivée estimée</Text>
                <Text style={styles.etaTime}>{estimatedTime}</Text>
              </View>
              <Text style={styles.etaMinutes}>~{totalMinutes} min</Text>
            </View>

            <Divider style={{ marginVertical: 16 }} />

            <View style={styles.timeline}>
              {steps.map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 ? <View style={[styles.connector, i === 1 && { backgroundColor: COLORS.primaryLight }]} /> : null}
                  <View style={styles.step}>
                    <View style={[
                      styles.stepDot,
                      s.active && { backgroundColor: COLORS.primary },
                      s.highlight && { backgroundColor: COLORS.successSoft },
                    ]}>
                      <Ionicons
                        name={s.icon}
                        size={20}
                        color={s.active ? COLORS.white : s.highlight ? COLORS.success : COLORS.primary}
                      />
                    </View>
                    <Text style={styles.stepLabel}>{s.label}</Text>
                    <Text style={[styles.stepTime, s.highlight && { color: COLORS.primary }]}>{s.time}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </Card>

          {/* ── Montant ── */}
          {total ? (
            <Card style={[styles.card, styles.amountCard]}>
              <View style={{ flex: 1 }}>
                <Text style={TYPE.caption}>Total de la commande</Text>
                <Text style={styles.amountSub}>{paymentLabel || 'Paiement à la livraison / mobile'}</Text>
              </View>
              <Text style={styles.amountValue}>{formatPrice(total)}</Text>
            </Card>
          ) : null}

          <Button
            title="Suivre ma commande"
            icon="navigate-outline"
            onPress={() => navigation.navigate('OrderTracking', { orderId: order?.id })}
            style={{ marginTop: 8 }}
          />
          <Button
            title="Retour à l'accueil"
            variant="outline"
            icon="home-outline"
            onPress={goHome}
            style={{ marginTop: 12 }}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = createThemedStyles({
  scroll: { flexGrow: 1, paddingHorizontal: SCREEN_PADDING },
  center: { textAlign: 'center' },

  hero: { alignItems: 'center', paddingTop: 40, paddingBottom: 28 },
  haloOuter: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: COLORS.successSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  haloInner: {
    width: 124, height: 124, borderRadius: 62, backgroundColor: '#D3F0DE',
    alignItems: 'center', justifyContent: 'center',
  },
  check: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.md, shadowColor: COLORS.success,
  },
  orderPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.pill,
    paddingHorizontal: 16, paddingVertical: 8, marginTop: 16,
  },
  orderPillLabel: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  orderPillNumber: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },

  card: { marginBottom: 16 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  etaIcon: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  etaTime: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text, lineHeight: 30 },
  etaMinutes: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.primary },

  timeline: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { alignItems: 'center', flex: 1 },
  connector: { flex: 0.5, height: 2, borderRadius: 1, backgroundColor: COLORS.border, marginTop: 21 },
  stepDot: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  stepLabel: { ...TYPE.caption, textAlign: 'center' },
  stepTime: { fontFamily: FONTS.semibold, fontSize: 13, color: COLORS.text, textAlign: 'center', marginTop: 1 },

  amountCard: { flexDirection: 'row', alignItems: 'center' },
  amountSub: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text, marginTop: 2 },
  amountValue: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
});
